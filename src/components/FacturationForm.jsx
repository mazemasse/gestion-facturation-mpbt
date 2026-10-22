import { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CLIENTS, PRODUITS, getNextNumero } from '../data/mockData';
import FacturePDF from './FacturePDF';

export default function FacturationForm({ user }) {
  // --- ÉTATS ---
  const [typeDoc, setTypeDoc] = useState('Facture');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [clientSelectionne, setClientSelectionne] = useState('');
  const [objet, setObjet] = useState('');
  const [produitSelectionne, setProduitSelectionne] = useState('');
  const [quantite, setQuantite] = useState(1);
  const [panier, setPanier] = useState([]);
  const [appliqueTVA, setAppliqueTVA] = useState(true);
  const [remiseTTC, setRemiseTTC] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const componentRef = useRef(null);

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
    const produitInfo = PRODUITS.find(p => p.designation === produitSelectionne);
    setPanier([...panier, {
      id: Date.now(),
      designation: produitInfo.designation,
      unite: produitInfo.unite,
      quantite: parseInt(quantite),
      prixUnitaire: produitInfo.prixUnitaire,
      total: produitInfo.prixUnitaire * parseInt(quantite)
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
  
  const clientInfo = CLIENTS.find(c => c.nom === clientSelectionne);

  const pdfData = {
    numeroDoc, typeDoc, client: clientSelectionne, clientInfo, objet,
    dateFormatee, heureFormatee, panier,
    sousTotalHT, tva, appliqueTVA, totalTTCBrut, remiseTTC, netAPayer
  };

  // --- FONCTION D'EXPORT PDF ---
  const genererPDF = async () => {
    if (!componentRef.current) return;
    setIsGenerating(true);

    try {
      // 1. On capture le composant HTML en image PNG
      const dataUrl = await toPng(componentRef.current, { 
        quality: 1, 
        pixelRatio: 2, // Haute résolution
        backgroundColor: '#ffffff' 
      });

      // 2. On crée un PDF A4
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (componentRef.current.offsetHeight * pdfWidth) / componentRef.current.offsetWidth;

      // 3. On ajoute l'image au PDF
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // 4. On télécharge le fichier
      pdf.save(`${numeroDoc}_${clientSelectionne.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("Erreur de génération PDF:", error);
      alert("Une erreur est survenue lors de la génération du PDF.");
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
    // Nettoyage du numéro (on enlève les espaces, +, etc.)
    const telNettoye = clientInfo.tel.replace(/\D/g, '');
    const message = `Bonjour, voici votre ${typeDoc.toLowerCase()} N° ${numeroDoc} d'un montant de ${formatMonnaie(netAPayer)}. Cordialement, ${COMPANY_DATA.sigle}.`;
    window.open(`https://wa.me/${telNettoye}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLONNE GAUCHE : SAISIE */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Carte : Informations Document */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de document</label>
              <div className="flex gap-2">
                <button onClick={() => setTypeDoc('Facture')} className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${typeDoc === 'Facture' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Facture</button>
                <button onClick={() => setTypeDoc('Devis')} className={`flex-1 py-2 rounded-lg border font-medium text-sm transition ${typeDoc === 'Devis' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Devis</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Client</label>
              <select value={clientSelectionne} onChange={(e) => setClientSelectionne(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Sélectionner un client --</option>
                {CLIENTS.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Objet de la prestation</label>
              <input type="text" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex: Soirée de gala..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
        </div>

        {/* Carte : Ajout d'articles */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">🛒</span> Ajouter des articles
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-6">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Produit / Service</label>
              <select value={produitSelectionne} onChange={(e) => setProduitSelectionne(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">-- Choisir --</option>
                {PRODUITS.map(p => <option key={p.id} value={p.designation}>{p.designation} ({p.categorie})</option>)}
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

          {/* BOUTONS D'ACTION */}
          <div className="mt-6 space-y-2">
            <button 
              onClick={genererPDF}
              disabled={panier.length === 0 || !clientSelectionne || isGenerating}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Génération...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Télécharger le PDF
                </>
              )}
            </button>
            
            <button 
              onClick={partagerWhatsApp}
              disabled={panier.length === 0 || !clientSelectionne}
              className="w-full py-2.5 bg-[#25D366] hover:bg-[#128C7E] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Partager via WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* ZONE CACHÉE POUR LE PDF */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
        <FacturePDF ref={componentRef} data={pdfData} user={user} />
      </div>

    </div>
  );
}