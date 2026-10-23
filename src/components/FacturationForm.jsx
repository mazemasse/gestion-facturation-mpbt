import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { getNextNumero } from '../data/mockData'; // On garde ça pour l'instant
import { COMPANY_DATA } from '../data/companyData';
import { supabase } from '../lib/supabaseClient'; // <-- IMPORT SUPABASE
import FacturePDF from './FacturePDF';

export default function FacturationForm({ user, typeParDefaut = 'Facture' }) {
  // --- ÉTATS ---
  const [typeDoc, setTypeDoc] = useState(typeParDefaut);
  const [numeroDoc, setNumeroDoc] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState('');
  const [objet, setObjet] = useState('');
  const [modePaiement, setModePaiement] = useState('Virement');
  const [produitSelectionne, setProduitSelectionne] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [panier, setPanier] = useState([]);
  const [appliqueTVA, setAppliqueTVA] = useState(true);
  const [remiseTTC, setRemiseTTC] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // --- DONNÉES SUPABASE ---
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);

  const componentRef = useRef(null);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    const chargerDonnees = async () => {
      const { data: clientsData } = await supabase.from('clients').select('*').order('nom');
      const { data: produitsData } = await supabase.from('produits').select('*').order('designation');
      setClients(clientsData || []);
      setProduits(produitsData || []);
    };
    chargerDonnees();
  }, []);

  // --- NUMÉROTATION ---
  useEffect(() => {
    setNumeroDoc(getNextNumero(typeDoc));
  }, [typeDoc]);

  const dateCreation = new Date();
  const dateFormatee = dateCreation.toLocaleDateString('fr-FR');
  const heureFormatee = dateCreation.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // --- PANIER ---
  const ajouterAuPanier = () => {
    if (!produitSelectionne || quantite < 1) return;
    const produitInfo = produits.find(p => p.designation === produitSelectionne);
    setPanier([...panier, {
      id: Date.now(),
      designation: produitInfo.designation,
      unite: produitInfo.unite,
      quantite: parseInt(quantite),
      prixUnitaire: produitInfo.prix_unitaire,
      total: produitInfo.prix_unitaire * parseInt(quantite)
    }]);
    setProduitSelectionne('');
    setQuantite(1);
  };

  const supprimerArticle = (id) => setPanier(panier.filter(a => a.id !== id));

  // --- CALCULS ---
  const sousTotalHT = panier.reduce((sum, a) => sum + a.total, 0);
  const tva = appliqueTVA ? sousTotalHT * 0.18 : 0;
  const totalTTCBrut = sousTotalHT + tva;
  const netAPayer = Math.max(0, totalTTCBrut - remiseTTC);

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');
  
  const clientInfo = clients.find(c => c.nom === clientSelectionne);

  const pdfData = {
    numeroDoc, typeDoc, client: clientSelectionne, clientInfo, objet,
    dateFormatee, heureFormatee, modePaiement,
    panier, sousTotalHT, tva, appliqueTVA, totalTTCBrut, remiseTTC, netAPayer
  };

  // --- FONCTION D'EXPORT PDF + SAUVEGARDE SUPABASE ---
  const genererPDF = async () => {
    if (!componentRef.current) return;
    setIsGenerating(true);

    try {
      // 1. Sauvegarde dans Supabase (En-tête de la facture)
      const { error: errFacture } = await supabase
        .from('factures')
        .insert([{
          numero: numeroDoc,
          type_doc: typeDoc,
          client_nom: clientSelectionne,
          objet: objet,
          mode_paiement: modePaiement,
          sous_total_ht: sousTotalHT,
          tva: tva,
          remise: remiseTTC,
          total_ttc: totalTTCBrut,
          net_a_payer: netAPayer,
          created_by: user.nom
        }]);

      if (errFacture) throw new Error("Erreur sauvegarde facture : " + errFacture.message);

      // 2. Sauvegarde des détails (Lignes)
      const details = panier.map(item => ({
        facture_numero: numeroDoc,
        designation: item.designation,
        unite: item.unite,
        quantite: item.quantite,
        prix_unitaire: item.prixUnitaire,
        total: item.total
      }));

      const { error: errDetails } = await supabase.from('facture_details').insert(details);
      if (errDetails) throw new Error("Erreur sauvegarde détails : " + errDetails.message);

      // 3. Génération du PDF
      const dataUrl = await toPng(componentRef.current, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (componentRef.current.offsetHeight * pdfWidth) / componentRef.current.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${numeroDoc}_${clientSelectionne.replace(/\s+/g, '_')}.pdf`);

      alert(`Document ${numeroDoc} généré et enregistré avec succès !`);
      
      // Réinitialisation
      setPanier([]);
      setClientSelectionne('');
      setObjet('');
      setNumeroDoc(getNextNumero(typeDoc));

    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- PARTAGE WHATSAPP ---
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLONNE GAUCHE : SAISIE */}
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <div className="flex gap-2">
                <button onClick={() => setTypeDoc('Facture')} className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${typeDoc === 'Facture' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Facture</button>
                <button onClick={() => setTypeDoc('Devis')} className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${typeDoc === 'Devis' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Devis</button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
              <select value={clientSelectionne} onChange={(e) => setClientSelectionne(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Sélectionner --</option>
                {clients.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
              </select>
            </div>

            <div>
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

      {/* COLONNE DROITE : PANIER */}
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
                      <th className="pb-2 font-semibold text-right">Total</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {panier.map(item => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 font-medium text-slate-800 truncate max-w-[80px]" title={item.designation}>{item.designation}</td>
                        <td className="py-2 text-center text-slate-600">{item.quantite}</td>
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

      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
        <FacturePDF ref={componentRef} data={pdfData} user={user} />
      </div>
    </div>
  );
}