import { useState, useEffect, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { COMPANY_DATA } from '../data/companyData';
import { supabase } from '../lib/supabaseClient';
import FacturePDF from './FacturePDF';
import ClientsPage from './ClientsPage';

export default function FacturationForm({ user, typeParDefaut = 'Facture', donneesInitiales, onResetInitiales }) {
  const [typeDoc, setTypeDoc] = useState(typeParDefaut);
  const [numeroDoc, setNumeroDoc] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState('');
  const [objet, setObjet] = useState('');
  const [modePaiement, setModePaiement] = useState('Virement');
  
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [nombreJours, setNombreJours] = useState(1);

  const [produitSelectionne, setProduitSelectionne] = useState('');
  const [quantite, setQuantite] = useState(1);
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

  // --- CHARGEMENT INITIAL ---
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

  // --- CALCUL AUTOMATIQUE DU NOMBRE DE JOURS ---
  useEffect(() => {
    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut);
      const fin = new Date(dateFin);
      if (fin >= debut) {
        const diffTime = Math.abs(fin - debut);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setNombreJours(diffDays);
      } else {
        setNombreJours(1);
      }
    }
  }, [dateDebut, dateFin]);

  // --- GESTION DES DONNÉES INITIALES (Transformation Devis) ---
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

  // --- NUMÉROTATION SÉQUENTIELLE SÉCURISÉE ---
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
    if (!produitSelectionne || quantite < 1) return;
    const produitInfo = produits.find(p => p.designation === produitSelectionne);
    
    const total = produitInfo.prix_unitaire * parseInt(quantite) * parseInt(nombreJours);

    setPanier([...panier, {
      id: Date.now(),
      designation: produitInfo.designation,
      unite: produitInfo.unite,
      quantite: parseInt(quantite),
      jours: parseInt(nombreJours),
      prixUnitaire: produitInfo.prix_unitaire,
      total: total
    }]);
    setProduitSelectionne('');
    setQuantite(1);
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
    dateDebut, dateFin, nombreJours,
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
        quality: 0.95, 
        pixelRatio: 1.5, 
        backgroundColor: '#ffffff',
        skipFonts: true,
        filter: (node) => node.tagName !== 'IMG' // AJOUT SÉCURITÉ
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

      setNotification({
        type: 'success',
        message: `${typeDoc} ${numeroDoc} généré(e) et enregistré(e) avec succès.`
      });
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
      setNombreJours(1);
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

  const partagerWhatsApp = () => {
    if (!clientInfo?.tel) {
      alert("Le numéro de téléphone du client n'est pas renseigné.");
      return;
    }
    const telNettoye = clientInfo.tel.replace(/\D/g, '');
    const message = `Bonjour, voici votre ${typeDoc.toLowerCase()} N° ${numeroDoc} d'un montant de ${formatMonnaie(netAPayer)}. Cordialement, ${COMPANY_DATA.sigle}.`;
    window.open(`https://wa.me/${telNettoye}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-4 rounded-xl shadow-2xl text-white font-bold flex items-center gap-3 animate-slide-in ${notification.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {notification.type === 'success' ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {notification.message}
        </div>
      )}

      {showModalClient && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-50 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Gestion des Clients</h3>
              <button onClick={() => { setShowModalClient(false); chargerDonnees(); }} className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <ClientsPage onClientAdded={() => { setShowModalClient(false); chargerDonnees(); }} />
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 space-y-6">
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className={`p-1.5 rounded-lg text-white ${typeDoc === 'Facture' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                {typeDoc === 'Facture' ? '📄' : '📝'}
              </span> 
              Informations du {typeDoc.toLowerCase()}
            </h3>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800 font-mono bg-slate-100 px-3 py-1 rounded">{numeroDoc}</p>
              <p className="text-xs text-slate-500 mt-1">Créé le {dateFormatee} à {heureFormatee}</p>
            </div>
          </div>

          {isTransformation && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 p-3 rounded-lg flex justify-between items-center">
              <p className="text-sm text-indigo-800 font-medium">
                <span className="font-bold">Mode Transformation :</span> Ce document est issu du devis. Vérifiez les informations puis validez.
              </p>
              <button onClick={annulerTransformation} className="text-xs text-red-600 hover:text-red-800 font-bold bg-white px-3 py-1 rounded border border-red-200">Annuler</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <div className="flex gap-2">
                <button onClick={() => setTypeDoc('Facture')} className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${typeDoc === 'Facture' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Facture</button>
                <button onClick={() => setTypeDoc('Devis')} className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${typeDoc === 'Devis' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Devis</button>
              </div>
            </div>
            
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
              <div className="flex gap-1">
                <select value={clientSelectionne} onChange={(e) => setClientSelectionne(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">-- Sélectionner --</option>
                  {clients.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                </select>
                <button 
                  type="button"
                  onClick={() => setShowModalClient(true)}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition"
                  title="Nouveau client"
                >
                  +
                </button>
              </div>
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode de paiement</label>
              <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="Virement">Virement Bancaire</option>
                <option value="Chèque">Chèque</option>
                <option value="Espèces">Espèces</option>
                <option value="Carte Bancaire">Carte Bancaire</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Objet de la prestation</label>
              <input type="text" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex: Soirée de gala..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date de début</label>
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Date de fin</label>
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nombre de jours (auto)</label>
                <input type="number" value={nombreJours} onChange={(e) => setNombreJours(parseInt(e.target.value))} className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-center" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">🛒</span> Ajouter des articles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Produit / Service</label>
              <select value={produitSelectionne} onChange={(e) => setProduitSelectionne(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Choisir --</option>
                {produits.map(p => <option key={p.id} value={p.designation}>{p.designation} ({p.categorie})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Qté</label>
              <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="md:col-span-4">
              <button onClick={ajouterAuPanier} disabled={!produitSelectionne} className="w-full py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition">+ Ajouter au panier</button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Panier</h3>
          <div className="mb-6">
            {panier.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Le panier est vide.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="pb-2 font-semibold">Désignation</th>
                      <th className="pb-2 font-semibold text-center">Qté</th>
                      <th className="pb-2 font-semibold text-center">Jours</th>
                      <th className="pb-2 font-semibold text-right">Total</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {panier.map(item => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 font-medium text-slate-800 truncate max-w-[80px]" title={item.designation}>{item.designation}</td>
                        <td className="py-2 text-center text-slate-600">{item.quantite}</td>
                        <td className="py-2 text-center text-slate-600">{item.jours}</td>
                        <td className="py-2 text-right font-bold text-slate-800">{formatMonnaie(item.total)}</td>
                        <td className="py-2 text-right">
                          <button onClick={() => supprimerArticle(item.id)} className="text-red-400 hover:text-red-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="space-y-3 border-t border-slate-200 pt-4 mb-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 font-medium">Appliquer la TVA (18%)</label>
              <input type="checkbox" checked={appliqueTVA} onChange={(e) => setAppliqueTVA(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer" />
            </div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-slate-600">Remise (après TTC)</label>
              <input type="number" min="0" value={remiseTTC} onChange={(e) => setRemiseTTC(Number(e.target.value))} className="w-24 px-2 py-1 text-right bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm text-slate-600"><span>Sous-total HT</span><span className="font-medium text-slate-800">{formatMonnaie(sousTotalHT)}</span></div>
            {appliqueTVA && (<div className="flex justify-between text-sm text-slate-600"><span>TVA (18%)</span><span className="font-medium text-slate-800">{formatMonnaie(tva)}</span></div>)}
            <div className="flex justify-between text-sm text-slate-600 border-b border-slate-100 pb-2"><span>Total TTC Brut</span><span className="font-medium text-slate-800">{formatMonnaie(totalTTCBrut)}</span></div>
            {remiseTTC > 0 && (<div className="flex justify-between text-sm text-red-500"><span>Remise TTC</span><span className="font-medium">-{formatMonnaie(remiseTTC)}</span></div>)}
            <div className="flex justify-between text-lg font-bold text-emerald-600 pt-2 mt-2"><span>Net à Payer</span><span>{formatMonnaie(netAPayer)}</span></div>
          </div>

          <div className="mt-6 space-y-2">
            <button onClick={genererPDF} disabled={panier.length === 0 || !clientSelectionne || isGenerating} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2">
              {isGenerating ? 'Génération et sauvegarde...' : 'Générer et Enregistrer'}
            </button>
            <button onClick={partagerWhatsApp} disabled={panier.length === 0 || !clientSelectionne} className="w-full py-2.5 bg-[#25D366] hover:bg-[#128C7E] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
              Partager via WhatsApp
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