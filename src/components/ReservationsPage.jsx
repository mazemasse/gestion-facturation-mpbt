import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import ClientsPage from './ClientsPage';
import { COMPANY_DATA } from '../data/companyData';

export default function ReservationsPage({ user }) {
  const [reservations, setReservations] = useState([]);
  const [reservationDetails, setReservationDetails] = useState([]);
  const [clients, setClients] = useState([]);
  const [espaces, setEspaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState(COMPANY_DATA);
  
  const [showForm, setShowForm] = useState(false);
  const [showModalClient, setShowModalClient] = useState(false);
  const [reservationEnEdition, setReservationEnEdition] = useState(null);
  
  const [erreur, setErreur] = useState('');
  const [notification, setNotification] = useState(null);
  
  const pdfRef = useRef(null);
  const [reservationAImprimer, setReservationAImprimer] = useState(null);
  
  // NOUVEAU : État pour stocker le logo converti en Base64
  const [logoBase64, setLogoBase64] = useState('');

  const initialFormState = {
    client_nom: '',
    date_arrivee: '',
    date_depart: '',
  };
  const [formData, setFormData] = useState(initialFormState);
  const [panier, setPanier] = useState([]); 
  const [espaceEnCours, setEspaceEnCours] = useState({
    categorie: '',
    espace_id: '',
    quantite: 1,
    nombre_personnes: 1
  });

  const chargerDonnees = async () => {
    setIsLoading(true);
    
    const { data: paramData } = await supabase.from('parametres').select('*').eq('id', 1).single();
    if (paramData) {
      setCompanyInfo({
        nom: paramData.nom, sigle: paramData.sigle, adresse: paramData.adresse, telephone: paramData.telephone,
        email: paramData.email, siteWeb: paramData.site_web, ninea: paramData.ninea, rc: paramData.rc,
        banque: paramData.banque, compteBancaire: paramData.compte_bancaire, logo: paramData.logo, slogan: paramData.slogan
      });
      
      // Conversion du logo en Base64 pour le PDF
      if (paramData.logo) {
        try {
          const response = await fetch(paramData.logo);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => setLogoBase64(reader.result);
          reader.readAsDataURL(blob);
        } catch (error) {
          console.warn("Impossible de convertir le logo en Base64, il sera ignoré dans le PDF.");
        }
      }
    }

    const { data: resData } = await supabase.from('reservations').select('*').order('date_creation', { ascending: false });
    const { data: detData } = await supabase.from('reservation_details').select('*');
    const { data: cliData } = await supabase.from('clients').select('*').order('nom');
    const { data: espData } = await supabase.from('espaces').select('*').order('nom');
    const { data: catData } = await supabase.from('categories_espaces').select('*').order('nom');

    setReservations(resData || []);
    setReservationDetails(detData || []);
    setClients(cliData || []);
    setEspaces(espData || []);
    setCategories(catData || []);
    setIsLoading(false);
  };

  useEffect(() => { chargerDonnees(); }, []);

  // --- EFFET D'IMPRESSION SÉCURISÉ ---
  useEffect(() => {
    if (!reservationAImprimer) return;

    let isMounted = true;

    const declencherGeneration = async () => {
      try {
        let tentatives = 0;
        while (!pdfRef.current && tentatives < 60) {
          await new Promise(resolve => setTimeout(resolve, 50));
          tentatives++;
        }

        if (!pdfRef.current) throw new Error("Le composant PDF n'a pas pu être affiché à temps.");
        await new Promise(resolve => setTimeout(resolve, 200));
        if (!isMounted) return;

        const dataUrl = await toJpeg(pdfRef.current, { 
          quality: 0.95, 
          pixelRatio: 1.5, 
          backgroundColor: '#ffffff', 
          skipFonts: true
          // On retire le filtre pour que les images s'affichent
        });

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (pdfRef.current.offsetHeight * pdfWidth) / pdfRef.current.offsetWidth;
        
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);

        const nomFichier = `Reservation_${reservationAImprimer.numero_resa}.pdf`;
        pdf.save(nomFichier);

        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);

        setTimeout(() => {
          if (!isMounted) return;
          const lien = document.createElement('a');
          lien.href = url;
          lien.target = '_blank';
          lien.rel = 'noopener noreferrer';
          document.body.appendChild(lien);
          lien.click();
          document.body.removeChild(lien);

          setNotification({ 
            type: 'success', 
            message: `Réservation ${reservationAImprimer.numero_resa} confirmée !`,
            reservation: reservationAImprimer
          });
          setTimeout(() => setNotification(null), 8000);
          setTimeout(() => URL.revokeObjectURL(url), 20000);
        }, 1500);

      } catch (error) {
        console.error("Erreur détaillée:", error);
        alert("Erreur : " + error.message);
      } finally {
        if (isMounted) setReservationAImprimer(null);
      }
    };

    declencherGeneration();
    return () => { isMounted = false; };
  }, [reservationAImprimer]);

  const imprimerReservation = (resaData) => {
    let detailsToUse = resaData.details;
    if (!detailsToUse) {
      detailsToUse = reservationDetails
        .filter(d => d.reservation_id === resaData.id)
        .map(d => {
          const esp = espaces.find(e => e.id === d.espace_id);
          return { ...d, espaceInfo: esp };
        });
    }
    setReservationAImprimer({ ...resaData, details: detailsToUse });
  };

  const genererNumeroReservation = () => {
    const annee = new Date().getFullYear();
    const prefixe = `R-${annee}-`;
    const numerosExistants = reservations
      .filter(r => r.numero_resa?.startsWith(prefixe))
      .map(r => parseInt(r.numero_resa.replace(prefixe, ''), 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    if (numerosExistants.length === 0) return `${prefixe}001`;

    let prochainNumero = 1;
    for (let i = 0; i < numerosExistants.length; i++) {
      if (numerosExistants[i] !== prochainNumero) break;
      prochainNumero++;
    }
    return `${prefixe}${String(prochainNumero).padStart(3, '0')}`;
  };

  const calculerNombreJours = () => {
    if (formData.date_arrivee && formData.date_depart) {
      const debut = new Date(formData.date_arrivee);
      const fin = new Date(formData.date_depart);
      if (fin > debut) {
        const diffTime = Math.abs(fin - debut);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }
    return 0;
  };

  const estUneChambre = (categorieNom) => {
    if (!categorieNom) return false;
    const cat = categorieNom.toLowerCase();
    return cat.includes('chambre') || cat.includes('chambres');
  };

  const verifierConflit = (espaceId, quantiteDemandee, dateArrivee, dateDepart, idResaEnCours = null) => {
    const espaceInfo = espaces.find(e => e.id === espaceId);
    if (!espaceInfo) return true; 
    const capaciteMax = estUneChambre(espaceInfo.categorie) ? (espaceInfo.capacite || 1) : 1;
    let quantiteDejaReservee = 0;
    
    reservationDetails.forEach(detail => {
      const resaParente = reservations.find(r => r.id === detail.reservation_id);
      if (!resaParente) return;
      if (idResaEnCours && resaParente.id === idResaEnCours) return;

      if (detail.espace_id === espaceId && resaParente.statut !== 'Annulée') {
        const resaDebut = new Date(resaParente.date_arrivee);
        const resaFin = new Date(resaParente.date_depart);
        const nouvDebut = new Date(dateArrivee);
        const nouvFin = new Date(dateDepart);
        if (nouvDebut < resaFin && nouvFin > resaDebut) {
          quantiteDejaReservee += (detail.quantite || 1);
        }
      }
    });
    return (quantiteDejaReservee + quantiteDemandee) > capaciteMax;
  };

  const disponibiliteRestante = useMemo(() => {
    if (!espaceEnCours.espace_id || !formData.date_arrivee || !formData.date_depart) return null;
    const espaceInfo = espaces.find(e => e.id === espaceEnCours.espace_id);
    if (!espaceInfo) return null;
    const capaciteMax = estUneChambre(espaceInfo.categorie) ? (espaceInfo.capacite || 1) : 1;
    let dejaReservee = 0;
    
    reservationDetails.forEach(detail => {
      const resaParente = reservations.find(r => r.id === detail.reservation_id);
      if (!resaParente) return;
      if (reservationEnEdition && resaParente.id === reservationEnEdition) return;
      if (detail.espace_id === espaceEnCours.espace_id && resaParente.statut !== 'Annulée') {
        const resaDebut = new Date(resaParente.date_arrivee);
        const resaFin = new Date(resaParente.date_depart);
        const nouvDebut = new Date(formData.date_arrivee);
        const nouvFin = new Date(formData.date_depart);
        if (nouvDebut < resaFin && nouvFin > resaDebut) {
          dejaReservee += (detail.quantite || 1);
        }
      }
    });
    return { capacite: capaciteMax, dejaReservee, restante: capaciteMax - dejaReservee };
  }, [espaceEnCours.espace_id, formData.date_arrivee, formData.date_depart, reservationDetails, reservations, espaces, reservationEnEdition]);

  const ajouterEspaceAuPanier = () => {
    if (!espaceEnCours.espace_id || espaceEnCours.quantite < 1) return;
    if (verifierConflit(espaceEnCours.espace_id, espaceEnCours.quantite, formData.date_arrivee, formData.date_depart, reservationEnEdition)) {
      alert("❌ Indisponible : Pas assez de place pour cet espace sur cette période.");
      return;
    }
    const espaceInfo = espaces.find(e => e.id === espaceEnCours.espace_id);
    setPanier([...panier, {
      id: Date.now(), espace_id: espaceInfo.id, nom: espaceInfo.nom,
      categorie: espaceInfo.categorie, capacite: espaceInfo.capacite,
      quantite: parseInt(espaceEnCours.quantite), nombre_personnes: parseInt(espaceEnCours.nombre_personnes)
    }]);
    setEspaceEnCours({ categorie: '', espace_id: '', quantite: 1, nombre_personnes: 1 });
  };

  const supprimerEspaceDuPanier = (id) => setPanier(panier.filter(p => p.id !== id));

  const handleReserver = async (e) => {
    e.preventDefault();
    setErreur('');

    if (!formData.client_nom || !formData.date_arrivee || !formData.date_depart) {
      setErreur('Veuillez remplir les informations du client et les dates.');
      return;
    }
    if (new Date(formData.date_depart) <= new Date(formData.date_arrivee)) {
      setErreur('La date de départ doit être postérieure à la date d\'arrivée.');
      return;
    }
    if (panier.length === 0) {
      setErreur('Veuillez ajouter au moins un espace à la réservation.');
      return;
    }

    const nombreJours = calculerNombreJours();

    if (reservationEnEdition) {
      const { error: errResa } = await supabase.from('reservations').update({
        client_nom: formData.client_nom, date_arrivee: formData.date_arrivee,
        date_depart: formData.date_depart, nombre_jours: nombreJours
      }).eq('id', reservationEnEdition);

      if (errResa) { setErreur("Erreur : " + errResa.message); return; }

      await supabase.from('reservation_details').delete().eq('reservation_id', reservationEnEdition);
      await supabase.from('reservation_details').insert(panier.map(p => ({
        reservation_id: reservationEnEdition, espace_id: p.espace_id,
        quantite: p.quantite, nombre_personnes: p.nombre_personnes
      })));

      setNotification({ type: 'success', message: 'Réservation modifiée avec succès !' });
      setTimeout(() => setNotification(null), 5000);
      setShowForm(false);
      setReservationEnEdition(null);
      chargerDonnees();
    } else {
      const nouveauNumero = genererNumeroReservation();
      const { data: newResa, error: errResa } = await supabase.from('reservations').insert([{
        numero_resa: nouveauNumero, client_nom: formData.client_nom,
        date_arrivee: formData.date_arrivee, date_depart: formData.date_depart,
        nombre_jours: nombreJours, created_by: user.nom
      }]).select().single();

      if (errResa) { setErreur("Erreur : " + errResa.message); return; }

      const { error: errDetails } = await supabase.from('reservation_details').insert(panier.map(p => ({
        reservation_id: newResa.id, espace_id: p.espace_id,
        quantite: p.quantite, nombre_personnes: p.nombre_personnes
      })));
      
      if (errDetails) { setErreur("Erreur détails : " + errDetails.message); return; }

      chargerDonnees();
      setShowForm(false);

      const resaComplete = {
        ...newResa,
        details: panier.map(p => ({
          espace_id: p.espace_id, quantite: p.quantite,
          nombre_personnes: p.nombre_personnes,
          espaceInfo: espaces.find(e => e.id === p.espace_id)
        }))
      };

      imprimerReservation(resaComplete);
    }
  };

  const supprimerReservation = async (id) => {
    if (window.confirm("Voulez-vous vraiment annuler cette réservation ?")) {
      const { error } = await supabase.from('reservations').delete().eq('id', id);
      if (error) alert("Erreur : " + error.message);
      else chargerDonnees();
    }
  };

  const preparerEdition = (resa) => {
    const details = reservationDetails.filter(d => d.reservation_id === resa.id).map(d => {
      const esp = espaces.find(e => e.id === d.espace_id);
      return {
        id: Date.now() + Math.random(), espace_id: d.espace_id,
        nom: esp ? esp.nom : 'Inconnu', categorie: esp ? esp.categorie : '',
        capacite: esp ? esp.capacite : 1, quantite: d.quantite,
        nombre_personnes: d.nombre_personnes
      };
    });
    setFormData({ client_nom: resa.client_nom, date_arrivee: resa.date_arrivee, date_depart: resa.date_depart });
    setPanier(details);
    setReservationEnEdition(resa.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setPanier([]);
    setEspaceEnCours({ categorie: '', espace_id: '', quantite: 1, nombre_personnes: 1 });
    setReservationEnEdition(null);
    setErreur('');
  };

  const espacesFiltres = espaces.filter(e => {
    const motCatEspace = e.categorie?.toLowerCase().includes('chambre') ? 'chambre' : e.categorie?.toLowerCase();
    const motCatSelect = espaceEnCours.categorie?.toLowerCase().includes('chambre') ? 'chambre' : espaceEnCours.categorie?.toLowerCase();
    if (!motCatEspace || !motCatSelect || motCatEspace !== motCatSelect) return false;
    if (motCatSelect.includes('chambre')) return !/[0-9]+$/.test(e.nom);
    return true;
  });

  const categorieEstChambre = estUneChambre(espaceEnCours.categorie);
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('fr-FR');

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

  return (
    <div className="space-y-6 relative">
      
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-bold flex flex-col md:flex-row items-center gap-4 animate-slide-in bg-emerald-600 max-w-md">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <span>{notification.message}</span>
          </div>
          {notification.reservation && (
            <button 
              onClick={() => imprimerReservation(notification.reservation)}
              className="bg-white text-emerald-700 px-4 py-1.5 rounded-lg text-sm font-extrabold hover:bg-emerald-50 transition whitespace-nowrap"
            >
              Télécharger le PDF
            </button>
          )}
        </div>
      )}

      {showModalClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Gestion des Clients</h3>
              <button onClick={() => { setShowModalClient(false); chargerDonnees(); }} className="text-white hover:bg-white/20 p-2 rounded-lg">X</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ClientsPage onClientAdded={() => { setShowModalClient(false); chargerDonnees(); }} />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-extrabold text-slate-800">Gestion des Réservations</h2>
        <button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-lg transition shadow-md"
        >
          + Nouvelle Réservation
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white">{reservationEnEdition ? 'Modifier la Réservation' : 'Nouvelle Réservation Multi-Espaces'}</h3>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-white hover:bg-white/20 p-2 rounded-lg">X</button>
            </div>
            
            <form onSubmit={handleReserver} className="p-6 overflow-y-auto space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">1. Informations du Client et Dates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">Client *</label>
                    <div className="flex gap-2">
                      <select value={formData.client_nom} onChange={e => setFormData({...formData, client_nom: e.target.value})} className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg">
                        <option value="">-- Choisir --</option>
                        {clients.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                      </select>
                      <button type="button" onClick={() => setShowModalClient(true)} className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shrink-0">+ Client</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Date d'arrivée *</label>
                    <input type="date" value={formData.date_arrivee} onChange={e => setFormData({...formData, date_arrivee: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Date de départ *</label>
                    <input type="date" value={formData.date_depart} onChange={e => setFormData({...formData, date_depart: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg" />
                  </div>
                  <div className="md:col-span-2 flex justify-between items-center bg-emerald-50 p-2 rounded border border-emerald-100">
                    <span className="text-sm font-bold text-emerald-800">Nombre de nuits calculé :</span>
                    <span className="text-lg font-black text-emerald-600">{calculerNombreJours()} nuit(s)</span>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-300 p-4 rounded-xl">
                <h4 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wide">2. Ajouter des espaces à la réservation</h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Catégorie</label>
                    <select 
                      value={espaceEnCours.categorie} 
                      onChange={e => {
                        const cat = e.target.value;
                        const estCh = estUneChambre(cat);
                        setEspaceEnCours({...espaceEnCours, categorie: cat, espace_id: '', quantite: estCh ? 1 : 1});
                      }} 
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">-- Choisir --</option>
                      {categories.map(cat => <option key={cat.id} value={cat.nom}>{cat.nom}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Espace</label>
                    <select value={espaceEnCours.espace_id} onChange={e => setEspaceEnCours({...espaceEnCours, espace_id: e.target.value})} disabled={!espaceEnCours.categorie} className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm disabled:bg-slate-200">
                      <option value="">-- Choisir --</option>
                      {espacesFiltres.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                    </select>
                    {disponibiliteRestante && (
                      <p className={`text-[10px] mt-1 font-bold ${disponibiliteRestante.restante <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {disponibiliteRestante.restante <= 0 ? '❌ Complet' : `✅ ${disponibiliteRestante.restante} dispo`}
                      </p>
                    )}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Quantité</label>
                    <input 
                      type="number" min="1" value={espaceEnCours.quantite} 
                      onChange={e => setEspaceEnCours({...espaceEnCours, quantite: parseInt(e.target.value) || 1})} 
                      disabled={!categorieEstChambre || !espaceEnCours.categorie}
                      className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm disabled:bg-slate-200 disabled:text-slate-400" 
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">Personnes</label>
                    <input type="number" min="1" value={espaceEnCours.nombre_personnes} onChange={e => setEspaceEnCours({...espaceEnCours, nombre_personnes: parseInt(e.target.value) || 1})} className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div className="md:col-span-1">
                    <button type="button" onClick={ajouterEspaceAuPanier} disabled={!espaceEnCours.espace_id} className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white font-bold rounded-lg transition">+</button>
                  </div>
                </div>
              </div>

              {panier.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-200 text-slate-800 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-2">Espace</th>
                        <th className="px-4 py-2 text-center">Catégorie</th>
                        <th className="px-4 py-2 text-center">Qté</th>
                        <th className="px-4 py-2 text-center">Pers.</th>
                        <th className="px-4 py-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {panier.map(item => (
                        <tr key={item.id} className="bg-white">
                          <td className="px-4 py-3 font-bold text-slate-800">{item.nom}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.categorie}</td>
                          <td className="px-4 py-3 text-center font-bold">{item.quantite}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.nombre_personnes}</td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => supprimerEspaceDuPanier(item.id)} className="text-red-500 hover:text-red-700">Suppr.</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {erreur && <p className="text-red-600 text-sm font-bold bg-red-50 p-2 rounded">{erreur}</p>}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-sm text-slate-600 font-bold rounded-lg hover:bg-slate-100">Annuler</button>
                <button type="submit" disabled={panier.length === 0} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition disabled:bg-slate-300">Valider la réservation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-800 text-sm uppercase tracking-wider border-b-2 border-slate-300">
            <tr>
              <th className="px-4 py-4 font-extrabold">N° Résa</th>
              <th className="px-4 py-4 font-extrabold">Client</th>
              <th className="px-4 py-4 font-extrabold">Espaces réservés</th>
              <th className="px-4 py-4 font-extrabold text-center">Nuits</th>
              <th className="px-4 py-4 font-extrabold">Dates</th>
              <th className="px-4 py-4 font-extrabold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {reservations.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-500">Aucune réservation.</td></tr>
            ) : reservations.map(resa => {
              const details = reservationDetails.filter(d => d.reservation_id === resa.id);
              
              return (
                <tr key={resa.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4 text-sm text-slate-700 font-semibold">{resa.numero_resa}</td>
                  <td className="px-4 py-4 font-bold text-slate-900">{resa.client_nom}</td>
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      {details.map((d, i) => {
                        const esp = espaces.find(e => e.id === d.espace_id);
                        const affichageCapacite = esp && !estUneChambre(esp.categorie) ? ` (${esp.capacite} places)` : '';
                        return (
                          <div key={i} className="text-xs bg-slate-100 px-2 py-1 rounded inline-block mr-1">
                            {d.quantite}x {esp?.nom || 'Inconnu'}{affichageCapacite}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-bold">{resa.nombre_jours}</td>
                  <td className="px-4 py-4 text-sm text-slate-700">Du {formatDate(resa.date_arrivee)} au {formatDate(resa.date_depart)}</td>
                  
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => preparerEdition(resa)} className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50" title="Modifier">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => imprimerReservation(resa)} className="text-teal-600 hover:text-teal-800 p-1.5 rounded-lg hover:bg-teal-50" title="Télécharger le PDF">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                      </button>
                      <button onClick={() => supprimerReservation(resa.id)} className="text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50" title="Supprimer">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ZONE PDF CACHÉE */}
      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        {reservationAImprimer && (
          <div ref={pdfRef} className="bg-white text-black p-6 font-sans w-[210mm] h-[297mm] flex flex-col">
            
            <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
                  {/* LE LOGO EST MAINTENANT EN BASE64, DONC IL S'AFFICHERA TOUJOURS */}
                  {logoBase64 ? (
                    <img src={logoBase64} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-emerald-600 text-white items-center justify-center font-black text-2xl flex">
                      {companyInfo.sigle}
                    </div>
                  )}
                </div>
                
                <div>
                  <h1 className="text-lg font-black uppercase text-gray-900 leading-tight">{companyInfo.nom}</h1>
                  <p className="text-xs text-gray-700 mt-1">📍 {companyInfo.adresse}</p>
                  <p className="text-xs text-gray-700">📞 {companyInfo.telephone}</p>
                  <p className="text-xs text-gray-700">✉️ {companyInfo.email}</p>
                  <p className="text-xs text-gray-700">🌐 {companyInfo.siteWeb}</p>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-3xl font-black text-emerald-600 uppercase tracking-wider">RÉSERVATION</h2>
                <p className="text-base font-bold text-gray-800 mt-1">N° {reservationAImprimer.numero_resa}</p>
                <div className="mt-1 text-[10px] text-gray-600 border-t border-gray-200 pt-1 space-y-0.5">
                  <p>NINEA : {companyInfo.ninea}</p>
                  <p>RC : {companyInfo.rc}</p>
                  <p>Banque : {companyInfo.banque}</p>
                  <p>Compte : {companyInfo.compteBancaire}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between mb-3">
              <div className="w-1/2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <h3 className="text-[10px] font-black uppercase text-emerald-700 mb-1 border-b border-emerald-200 pb-1">Réservé par :</h3>
                <p className="text-sm font-bold text-gray-900">{reservationAImprimer.client_nom}</p>
                {(() => {
                  const cInfo = clients.find(c => c.nom === reservationAImprimer.client_nom);
                  if (cInfo) return (
                    <div className="text-xs text-gray-700 mt-1 space-y-0.5">
                      <p>{cInfo.contact}</p><p>{cInfo.adresse}</p><p>Tél : {cInfo.tel}</p>
                    </div>
                  );
                  return null;
                })()}
              </div>
              <div className="w-1/2 flex justify-end">
                <div className="text-xs">
                  <table className="w-full text-right">
                    <tbody>
                      <tr><td className="pr-4 font-bold text-gray-700">Date d'édition :</td><td className="font-medium">{new Date().toLocaleDateString('fr-FR')}</td></tr>
                      <tr><td className="pr-4 font-bold text-gray-700">Arrivée :</td><td className="font-medium">{formatDate(reservationAImprimer.date_arrivee)}</td></tr>
                      <tr><td className="pr-4 font-bold text-gray-700">Départ :</td><td className="font-medium">{formatDate(reservationAImprimer.date_depart)}</td></tr>
                      <tr><td className="pr-4 font-bold text-gray-700">Nuits :</td><td className="font-medium">{reservationAImprimer.nombre_jours}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <table className="w-full mb-3 text-xs border-collapse mt-2">
              <thead>
                <tr className="bg-emerald-600 text-white text-left">
                  <th className="border border-emerald-700 p-2 font-bold uppercase text-[10px]">Désignation de l'espace</th>
                  <th className="border border-emerald-700 p-2 text-center font-bold uppercase text-[10px]">Catégorie</th>
                  <th className="border border-emerald-700 p-2 text-center font-bold uppercase text-[10px]">Quantité</th>
                  <th className="border border-emerald-700 p-2 text-center font-bold uppercase text-[10px]">Personnes</th>
                </tr>
              </thead>
              <tbody>
                {reservationAImprimer.details && reservationAImprimer.details.map((d, index) => {
                  return (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="border border-gray-300 p-2 text-[11px] font-medium">{d.espaceInfo?.nom || 'Inconnu'}</td>
                      <td className="border border-gray-300 p-2 text-center text-[11px]">{d.espaceInfo?.categorie || '-'}</td>
                      <td className="border border-gray-300 p-2 text-center font-bold text-[11px]">{d.quantite}</td>
                      <td className="border border-gray-300 p-2 text-center text-[11px]">{d.nombre_personnes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="mt-4 mb-3 p-3 bg-slate-50 border border-slate-200 rounded">
              <h4 className="text-[11px] font-black uppercase text-slate-800 mb-2">Conditions de réservation :</h4>
              <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-1">
                <li>50% à la réservation.</li>
                <li>50% comme reliquat à 72h au moins avant l'activité ou le service.</li>
                <li>Toute annulation doit être notifiée au moins 72h à l'avance.</li>
              </ul>
            </div>

            <div className="flex justify-end mt-8 mb-4">
              <div className="w-64 flex flex-col items-end pr-4">
                <p className="text-[10px] font-bold text-slate-800 underline underline-offset-2 decoration-slate-400 decoration-1">
                  LA DIRECTION COMMERCIALE
                </p>
                <div className="h-12 w-full"></div>
              </div>
            </div>

            <div className="flex-1"></div>

            {/* SOUCHE STYLISÉE */}
            <div className="mb-2">
              <div className="border-[3px] border-dashed border-slate-400 rounded-lg p-3 bg-slate-50 relative overflow-hidden">
                
                <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                  <svg className="w-32 h-32 text-emerald-900" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                </div>

                <div className="flex justify-between items-center border-b-2 border-slate-300 pb-2 mb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-600 text-white p-1 rounded-md">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    <div>
                      <h3 className="text-xs font-black uppercase text-slate-800 tracking-widest">Souche de Réservation</h3>
                      <p className="text-[8px] font-bold text-emerald-600 uppercase">À l'attention de la Logistique & Exploitation</p>
                    </div>
                  </div>
                  <span className="font-mono font-black text-xs bg-white text-emerald-700 px-2 py-1 border border-slate-300 rounded shadow-sm">{reservationAImprimer.numero_resa}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3 relative z-10">
                  <div>
                    <p className="text-[9px] font-bold uppercase text-slate-500 mb-0.5">Client</p>
                    <p className="font-black text-sm text-slate-900 truncate">{reservationAImprimer.client_nom}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold uppercase text-slate-500 mb-0.5">Contact</p>
                    <p className="text-xs font-medium text-slate-800">{clients.find(c => c.nom === reservationAImprimer.client_nom)?.contact || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-white p-2 rounded border border-slate-200 shadow-sm mb-3 relative z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Arrivée</span>
                    <span className="font-bold text-xs text-slate-900">{formatDate(reservationAImprimer.date_arrivee)}</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-200 pl-2">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Départ</span>
                    <span className="font-bold text-xs text-slate-900">{formatDate(reservationAImprimer.date_depart)}</span>
                  </div>
                  <div className="flex flex-col border-l border-slate-200 pl-2">
                    <span className="text-[9px] uppercase font-bold text-slate-500">Nuits</span>
                    <span className="font-bold text-xs text-slate-900">{reservationAImprimer.nombre_jours}</span>
                  </div>
                </div>

                <div className="relative z-10 mb-2">
                  <p className="text-[9px] font-bold uppercase text-emerald-800 mb-1">Détail des espaces à préparer :</p>
                  <table className="w-full text-xs border-collapse bg-white rounded overflow-hidden shadow-sm border border-slate-200">
                    <thead>
                      <tr className="bg-emerald-100 text-emerald-900 border-b border-emerald-200">
                        <th className="p-1.5 text-left font-bold text-[10px]">Espace</th>
                        <th className="p-1.5 text-center font-bold text-[10px] w-16">Qté</th>
                        <th className="p-1.5 text-center font-bold text-[10px] w-20">Pers.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reservationAImprimer.details?.map((d, i) => (
                        <tr key={i}>
                          <td className="p-1.5 font-bold text-slate-800 text-[11px]">{d.espaceInfo?.nom || 'Inconnu'}</td>
                          <td className="p-1.5 text-center font-black text-emerald-700 text-[11px]">{d.quantite}</td>
                          <td className="p-1.5 text-center font-bold text-slate-700 text-[11px]">{d.nombre_personnes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between text-[8px] text-slate-400 font-medium mt-2 relative z-10">
                  <p>Généré le : {new Date().toLocaleDateString('fr-FR')}</p>
                  <p>Par : {user.nom}</p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-2 border-t border-gray-300 text-center text-[8px] text-gray-500 space-y-0.5">
              <p className="font-bold text-gray-700 text-[10px]">{companyInfo.nom} ({companyInfo.sigle})</p>
              <p>{companyInfo.adresse} - NINEA : {companyInfo.ninea} - RC : {companyInfo.rc}</p>
              <p className="italic mt-0.5 text-emerald-600 text-[10px]">{companyInfo.slogan}</p>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}