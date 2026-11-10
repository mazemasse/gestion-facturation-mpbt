import { useState, useEffect, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { COMPANY_DATA } from '../data/companyData';
import { supabase } from '../lib/supabaseClient';
import FacturePDF from './FacturePDF';
import ClientsPage from './ClientsPage';

const CATEGORIES_DISPONIBLES = ['Restauration', 'Espaces publicitaires', 'Chambres', 'Salles de rencontre'];

export default function FacturationForm({ user, typeParDefaut = 'Facture', donneesInitiales, onResetInitiales }) {
  const [typeDoc, setTypeDoc] = useState(typeParDefaut);
  const [numeroDoc, setNumeroDoc] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState('');
  const [objet, setObjet] = useState('');
  const [modePaiement, setModePaiement] = useState('Virement');
  
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [nombreJoursGlobal, setNombreJoursGlobal] = useState(1);

  const [categorieFiltre, setCategorieFiltre] = useState('');
  const [produitSelectionne, setProduitSelectionne] = useState('');
  const [quantiteAjout, setQuantiteAjout] = useState(1);
  
  const [panier, setPanier] = useState([]);
  const [appliqueTVA, setAppliqueTVA] = useState(true);
  const [remiseTTC, setRemiseTTC] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTransformation, setIsTransformation] = useState(false);
  const [numeroOrigine, setNumeroOrigine] = useState(null);
  
  const [notification, setNotification] = useState(null);
  const [showModalClient, setShowModalClient] = useState(false);

  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [toutesLesFactures, setToutesLesFactures] = useState([]);

  const componentRef = useRef(null);

  const chargerDonnees = async () => {
    const { data: clientsData } = await supabase.from('clients').select('*').order('nom');
    const { data: produitsData } = await supabase.from('produits').select('*').order('designation');
    const { data: facturesData } = await supabase.from('factures').select('numero');
    
    setClients(clientsData || []);
    setProduits(produitsData || []);
    setToutesLesFactures(facturesData || []);
  };

  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      if (fin >= debut) {
        const diffTime = Math.abs(fin - debut);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setNombreJoursGlobal(diffDays);
      } else {
        setNombreJoursGlobal(1);
      }
    }
  }, [dateDebut, dateFin]);

  useEffect(() => {
    if (donneesInitiales) {
      setClientSelectionne(donneesInitiales.client);
      setObjet(donneesInitiales.objet);
      setPanier(donneesInitiales.panier);
      setTypeDoc('Facture');
      setIsTransformation(true);
      setNumeroOrigine(donneesInitiales.numeroOrigine);
      if (onResetInitiales) onResetInitiales();
    }
  }, [donneesInitiales, onResetInitiales]);

  useEffect(() => {
    if (toutesLesFactures.length === 0 && !numeroDoc) {
      setNumeroDoc(typeDoc === 'Facture' ? 'F-2026-001' : 'D-2026-001');
      return;
    }

    const annee = new Date().getFullYear();
    const prefixe = typeDoc === 'Facture' ? `F-${annee}-` : `D-${annee}-`;
    
    const numerosExistants = toutesLesFactures
      .filter(f => f.numero?.startsWith(prefixe))
      .map(f => parseInt(f.numero.replace(prefixe, ''), 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    let prochainNumero = 1;
    if (numerosExistants.length > 0) {
      for (let i = 0; i < numerosExistants.length; i++) {
        if (numerosExistants[i] !== prochainNumero) break;
        prochainNumero++;
      }
    }
    
    setNumeroDoc(`${prefixe}${String(prochainNumero).padStart(3, '0')}`);
  }, [typeDoc, toutesLesFactures]);

  const dateCreation = new Date();
  const dateFormatee = dateCreation.toLocaleDateString('fr-FR');
  const heureFormatee = dateCreation.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const ajouterAuPanier = () => {
    if (!produitSelectionne || quantiteAjout < 1) return;
    
    const produitInfo = produits.find(p => p.designation === produitSelectionne);
    if (!produitInfo) return;

    const total = produitInfo.prix_unitaire * parseInt(quantiteAjout) * parseInt(nombreJoursGlobal);

    setPanier([...panier, {
      id: Date.now(),
      designation: produitInfo.designation,
      unite: produitInfo.unite,
      quantite: parseInt(quantiteAjout),
      jours: parseInt(nombreJoursGlobal),
      prixUnitaire: produitInfo.prix_unitaire,
      total: total
    }]);
    setProduitSelectionne('');
    setQuantiteAjout(1);
  };

  const modifierArticle = (id, champ, valeur) => {
    setPanier(panier.map(item => {
      if (item.id === id) {
        const nouvelleValeur = parseInt(valeur) || 1;
        const nouvelItem = { ...item, [champ]: nouvelleValeur };
        nouvelItem.total = nouvelItem.prixUnitaire * nouvelItem.quantite * nouvelItem.jours;
        return nouvelItem;
      }
      return item;
    }));
  };

  const supprimerArticle = (id) => setPanier(panier.filter(a => a.id !== id));

  const sousTotalHT = panier.reduce((sum, a) => sum + a.total, 0);
  const tva = appliqueTVA ? sousTotalHT * 0.18 : 0;
  const totalTTCBrut = sousTotalHT + tva;
  const netAPayer = Math.max(0, totalTTCBrut - remiseTTC);

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');
  
  const clientInfo = clients.find(c => c.nom === clientSelectionne);

  const pdfData = {
    numeroDoc, typeDoc, client: clientSelectionne, clientInfo, objet,
    dateFormatee, heureFormatee, modePaiement,
    dateDebut, dateFin, nombreJours: nombreJoursGlobal,
    panier, sousTotalHT, tva, appliqueTVA, totalTTCBrut, remiseTTC, netAPayer
  };

  const annulerTransformation = () => {
    if (window.confirm("Voulez-vous annuler la transformation du devis ? Les données seront perdues.")) {
      setPanier([]);
      setClientSelectionne('');
      setObjet('');
      setIsTransformation(false);
      setNumeroOrigine(null);
      setTypeDoc('Facture');
    }
  };

  const genererPDF = async () => {
    if (!componentRef.current) return;
    setIsGenerating(true);

    try {
      const { error: errFacture } = await supabase
        .from('factures')
        .insert([{
          numero: numeroDoc,
          type_doc: typeDoc,
          client_nom: clientSelectionne,
          objet: objet,
          mode_paiement: modePaiement,
          date_debut: dateDebut || null,
          date_fin: dateFin || null,
          sous_total_ht: sousTotalHT,
          tva: tva,
          remise: remiseTTC,
          total_ttc: totalTTCBrut,
          net_a_payer: netAPayer,
          statut_paiement: 'En attente',
          created_by: user.nom
        }]);

      if (errFacture) throw new Error("Erreur sauvegarde facture : " + errFacture.message);

      const details = panier.map(item => ({
        facture_numero: numeroDoc,
        designation: item.designation,
        unite: item.unite,
        quantite: item.quantite,
        jours: item.jours,
        prix_unitaire: item.prixUnitaire,
        total: item.total
      }));

      const { error: errDetails } = await supabase.from('facture_details').insert(details);
      if (errDetails) throw new Error("Erreur sauvegarde détails : " + errDetails.message);

      const dataUrl = await toJpeg(componentRef.current, { 
        quality: 0.95, pixelRatio: 1.5, backgroundColor: '#ffffff', skipFonts: true,
        filter: (node) => node.tagName !== 'IMG'
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (componentRef.current.offsetHeight * pdfWidth) / componentRef.current.offsetWidth;
      
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      
      const nomFichier = `${numeroDoc}_${clientSelectionne.replace(/\s+/g, '_')}.pdf`;
      pdf.save(nomFichier);

      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      setTimeout(() => {
        const lien = document.createElement('a');
        lien.href = url;
        lien.target = '_blank';
        lien.rel = 'noopener noreferrer';
        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);
        setTimeout(() => URL.revokeObjectURL(url), 20000);
      }, 1000);

      setNotification({ type: 'success', message: `${typeDoc} ${numeroDoc} généré(e) et enregistré(e).` });
      setTimeout(() => setNotification(null), 5000);

      if (isTransformation && numeroOrigine) {
        await supabase.from('facture_details').delete().eq('facture_numero', numeroOrigine);
        await supabase.from('factures').delete().eq('numero', numeroOrigine);
      }
      
      setPanier([]);
      setClientSelectionne('');
      setObjet('');
      setDateDebut('');
      setDateFin('');
      setNombreJoursGlobal(1);
      setIsTransformation(false);
      setNumeroOrigine(null);
      
      chargerDonnees();

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const produitsFiltres = produits.filter(p => {
    if (!categorieFiltre) return false;
    const cat = categorieFiltre.toLowerCase();
    const prodCat = (p.categorie || '').toLowerCase();

    if (cat === 'salles de rencontre') {
      return prodCat.includes('salle') || prodCat.includes('auditorium');
    }
    return prodCat === cat;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-8 py-5 rounded-2xl shadow-2xl text-white font-bold text-lg flex items-center gap-3 animate-slide-in ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {notification.message}
        </div>
      )}

      {showModalClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Gestion des Clients</h3>
              <button onClick={() => { setShowModalClient(false); chargerDonnees(); }} className="text-white hover:bg-white/20 p-2 rounded-lg transition text-lg">X</button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ClientsPage onClientAdded={() => { setShowModalClient(false); chargerDonnees(); }} />
            </div>
          </div>
        </div>
      )}

      {/* COLONNE GAUCHE : SAISIE */}
      <div className="lg:col-span-2 space-y-6">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <span className={`p-2 rounded-lg text-white ${typeDoc === 'Facture' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                {typeDoc === 'Facture' ? '📄' : '📝'}
              </span> 
              Informations du {typeDoc.toLowerCase()}
            </h3>
            <div className="text-right">
              <p className="text-base font-bold text-slate-800 font-mono bg-slate-100 px-4 py-1.5 rounded-lg">{numeroDoc}</p>
              <p className="text-sm text-slate-500 mt-1">Créé le {dateFormatee} à {heureFormatee}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-base font-medium text-slate-700 mb-2">Type</label>
              <div className="flex gap-2">
                <button onClick={() => setTypeDoc('Facture')} className={`flex-1 py-2.5 rounded-lg border font-medium text-base transition ${typeDoc === 'Facture' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Facture</button>
                <button onClick={() => setTypeDoc('Devis')} className={`flex-1 py-2.5 rounded-lg border font-medium text-base transition ${typeDoc === 'Devis' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Devis</button>
              </div>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-base font-medium text-slate-700 mb-2">Client</label>
              <div className="flex gap-1">
                <select value={clientSelectionne} onChange={(e) => setClientSelectionne(e.target.value)} className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- Sélectionner --</option>
                  {clients.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                </select>
                <button type="button" onClick={() => setShowModalClient(true)} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-base font-bold transition">+</button>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-base font-medium text-slate-700 mb-2">Mode de paiement</label>
              <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="Virement">Virement Bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
                <option value="Carte Bancaire">Carte Bancaire</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-base font-medium text-slate-700 mb-2">Objet de la prestation</label>
              <input type="text" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex: Soirée de gala..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5">Date de début</label>
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5">Date de fin</label>
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1.5">Nombre de jours (auto)</label>
                <input type="number" value={nombreJoursGlobal} onChange={(e) => setNombreJoursGlobal(parseInt(e.target.value) || 1)} className="w-full px-3 py-2.5 bg-slate-100 border border-slate-300 rounded-lg text-base font-bold text-center" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-3">
            <span className="bg-blue-100 text-blue-600 p-2 rounded-lg">🛒</span> Ajouter des articles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-base font-bold text-slate-600 mb-2">Catégorie</label>
              <select 
                value={categorieFiltre} 
                onChange={(e) => { 
                  setCategorieFiltre(e.target.value); 
                  setProduitSelectionne(''); 
                }} 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base"
              >
                <option value="">-- Choisir une catégorie --</option>
                {CATEGORIES_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-4">
              <label className="block text-base font-bold text-slate-600 mb-2">Produit / Service</label>
              <select 
                value={produitSelectionne} 
                onChange={(e) => setProduitSelectionne(e.target.value)} 
                disabled={!categorieFiltre} 
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base disabled:bg-slate-200"
              >
                <option value="">-- Choisir --</option>
                {produitsFiltres.map(p => (
                  <option key={p.id} value={p.designation}>
                    {p.designation} - {formatMonnaie(p.prix_unitaire)} / {p.unite}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-base font-bold text-slate-600 mb-2">Quantité</label>
              <input type="number" min="1" value={quantiteAjout} onChange={(e) => setQuantiteAjout(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-2">
              <button onClick={ajouterAuPanier} disabled={!produitSelectionne} className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-base font-medium rounded-lg transition">+ Ajouter</button>
            </div>
          </div>
        </div>
      </div>

      {/* COLONNE DROITE : PANIER */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
          <h3 className="text-xl font-bold text-slate-800 mb-5">Panier</h3>
          <div className="mb-6 overflow-x-auto">
            {panier.length === 0 ? (
              <p className="text-slate-400 text-base text-center py-6">Le panier est vide.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="pb-3 font-semibold">Désignation</th>
                    <th className="pb-3 font-semibold text-center w-16">Qté</th>
                    <th className="pb-3 font-semibold text-center w-16">Jours</th>
                    <th className="pb-3 font-semibold text-right">Total</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {panier.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 font-medium text-slate-800 text-sm" title={item.designation}>{item.designation}</td>
                      
                      <td className="py-3 text-center">
                        <input type="number" min="1" value={item.quantite} onChange={(e) => modifierArticle(item.id, 'quantite', e.target.value)} className="w-14 text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </td>
                      <td className="py-3 text-center">
                        <input type="number" min="1" value={item.jours} onChange={(e) => modifierArticle(item.id, 'jours', e.target.value)} className="w-14 text-center border border-slate-300 rounded py-1.5 text-sm" />
                      </td>

                      <td className="py-3 text-right font-bold text-slate-800 text-sm">{formatMonnaie(item.total)}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => supprimerArticle(item.id)} className="text-red-400 hover:text-red-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          
          <div className="space-y-4 border-t border-slate-200 pt-5 mb-5">
            <div className="flex items-center justify-between">
              <label className="text-base text-slate-600 font-medium">Appliquer la TVA (18%)</label>
              <input type="checkbox" checked={appliqueTVA} onChange={(e) => setAppliqueTVA(e.target.checked)} className="w-6 h-6 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-base text-slate-600">Remise (après TTC)</label>
              <input type="number" min="0" value={remiseTTC} onChange={(e) => setRemiseTTC(Number(e.target.value))} className="w-28 px-3 py-2 text-right bg-slate-50 border border-slate-200 rounded text-base focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-5">
            <div className="flex justify-between text-base text-slate-600"><span>Sous-total HT</span><span className="font-medium text-slate-800">{formatMonnaie(sousTotalHT)}</span></div>
            {appliqueTVA && (<div className="flex justify-between text-base text-slate-600"><span>TVA (18%)</span><span className="font-medium text-slate-800">{formatMonnaie(tva)}</span></div>)}
            <div className="flex justify-between text-base text-slate-600 border-b border-slate-100 pb-3"><span>Total TTC Brut</span><span className="font-medium text-slate-800">{formatMonnaie(totalTTCBrut)}</span></div>
            {remiseTTC > 0 && (<div className="flex justify-between text-base text-red-500"><span>Remise TTC</span><span className="font-medium">-{formatMonnaie(remiseTTC)}</span></div>)}
            <div className="flex justify-between text-xl font-bold text-emerald-600 pt-3 mt-3"><span>Net à Payer</span><span>{formatMonnaie(netAPayer)}</span></div>
          </div>

          <div className="mt-8 space-y-3">
            <button onClick={genererPDF} disabled={panier.length === 0 || !clientSelectionne || isGenerating} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-lg rounded-xl shadow-lg transition flex items-center justify-center gap-2">
              {isGenerating ? 'Génération...' : 'Générer et Enregistrer'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <FacturePDF ref={componentRef} data={pdfData} user={user} />
      </div>
    </div>
  );
}