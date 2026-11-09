import { useState, useEffect, useMemo, useRef } from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';
import FacturePDF from './FacturePDF';

export default function JournalPage({ user, onPreparerFacture }) {
  const [journal, setJournal] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState('Tous');
  const [filtreDate, setFiltreDate] = useState('Tous');

  const [documentAImprimer, setDocumentAImprimer] = useState(null);
  const pdfRef = useRef(null);

  const estAdminSupreme = user?.nom === 'MASSE NDOYE';

  const chargerJournal = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('factures')
      .select('*')
      .order('date_creation', { ascending: false });

    if (error) console.error(error);
    else {
      const formattedData = data.map(d => ({
        id: d.id,
        numero: d.numero,
        type: d.type_doc,
        date: d.date_creation,
        client: d.client_nom,
        montant: d.net_a_payer,
        objet: d.objet,
        mode_paiement: d.mode_paiement,
        sous_total_ht: d.sous_total_ht,
        tva: d.tva,
        remise: d.remise,
        total_ttc: d.total_ttc,
        net_a_payer: d.net_a_payer,
        statut_paiement: d.statut_paiement || 'En attente'
      }));
      setJournal(formattedData);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    chargerJournal();
  }, []);

  const basculerStatutPaiement = async (doc) => {
    if (doc.type === 'Devis') return;
    if (doc.statut_paiement === 'Payée') return; 

    const { error } = await supabase
      .from('factures')
      .update({ statut_paiement: 'Payée' })
      .eq('id', doc.id);

    if (error) {
      alert("Erreur lors du changement de statut : " + error.message);
    } else {
      setJournal(journal.map(item => 
        item.id === doc.id ? { ...item, statut_paiement: 'Payée' } : item
      ));
    }
  };

  const ouvrirDocument = async (doc) => {
    if (!pdfRef.current) return;

    try {
      const { data: details } = await supabase
        .from('facture_details')
        .select('*')
        .eq('facture_numero', doc.numero);

      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('nom', doc.client)
        .single();

      const pdfData = {
        numeroDoc: doc.numero,
        typeDoc: doc.type,
        client: doc.client,
        clientInfo: clientData,
        objet: doc.objet,
        dateFormatee: new Date(doc.date).toLocaleDateString('fr-FR'),
        heureFormatee: new Date(doc.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        modePaiement: doc.mode_paiement,
        panier: details.map(d => ({
          designation: d.designation,
          unite: d.unite,
          quantite: d.quantite,
          jours: d.jours,
          prixUnitaire: d.prix_unitaire,
          total: d.total
        })),
        sousTotalHT: doc.sous_total_ht,
        tva: doc.tva,
        appliqueTVA: true,
        totalTTCBrut: doc.total_ttc,
        remiseTTC: doc.remise || 0,
        netAPayer: doc.net_a_payer
      };

      setDocumentAImprimer({ data: pdfData, user: user });
      
      setTimeout(async () => {
        try {
          if (!pdfRef.current) throw new Error("Composant PDF introuvable");

          const dataUrl = await toJpeg(pdfRef.current, { 
            quality: 0.95, 
            pixelRatio: 1.5, 
            backgroundColor: '#ffffff',
            skipFonts: true,
            filter: (node) => node.tagName !== 'IMG' // AJOUT SÉCURITÉ
          });

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (pdfRef.current.offsetHeight * pdfWidth) / pdfRef.current.offsetWidth;
          
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          
          const nomFichier = `${doc.numero}_${doc.client.replace(/\s+/g, '_')}.pdf`;
          pdf.save(nomFichier);

          const pdfBlob = pdf.output('blob');
          const url = URL.createObjectURL(pdfBlob);
          
          const lien = document.createElement('a');
          lien.href = url;
          lien.target = '_blank';
          lien.rel = 'noopener noreferrer';
          document.body.appendChild(lien);
          lien.click();
          document.body.removeChild(lien);
          
          setTimeout(() => URL.revokeObjectURL(url), 10000);
          setDocumentAImprimer(null);

        } catch (err) {
          console.error(err);
          alert("Erreur génération PDF : " + err.message);
          setDocumentAImprimer(null);
        }
      }, 500);

    } catch (err) {
      alert("Erreur chargement données : " + err.message);
      setDocumentAImprimer(null);
    }
  };

  const preparerTransformation = async (devis) => {
    if (window.confirm(`Transformer le Devis ${devis.numero} en Facture ?\n\nVous serez redirigé vers le formulaire de facturation pré-rempli.`)) {
      try {
        const { data: details, error } = await supabase
          .from('facture_details')
          .select('*')
          .eq('facture_numero', devis.numero);

        if (error) throw error;

        if (onPreparerFacture) {
          onPreparerFacture({
            client: devis.client,
            objet: "Transformation du devis " + devis.numero,
            numeroOrigine: devis.numero,
            panier: details.map(d => ({
              id: Date.now() + Math.random(),
              designation: d.designation,
              unite: d.unite,
              quantite: d.quantite,
              jours: d.jours,
              prixUnitaire: d.prix_unitaire,
              total: d.total
            }))
          });
        }
      } catch (err) {
        alert("Erreur : " + err.message);
      }
    }
  };

  const supprimerDocument = async (doc) => {
    if (doc.type === 'Facture' && !estAdminSupreme) {
      return alert("Action refusée : Seul l'Administrateur MASSE NDOYE peut supprimer une facture.");
    }

    if (window.confirm(`Supprimer définitivement le document ${doc.numero} ?`)) {
      await supabase.from('facture_details').delete().eq('facture_numero', doc.numero);
      const { error } = await supabase.from('factures').delete().eq('id', doc.id);
      if (error) alert("Erreur : " + error.message);
      else chargerJournal();
    }
  };

  const documentsFiltres = useMemo(() => {
    return journal.filter(doc => {
      const matchRecherche = doc.numero.toLowerCase().includes(recherche.toLowerCase()) || 
                             doc.client.toLowerCase().includes(recherche.toLowerCase());
      
      const matchType = filtreType === 'Tous' || doc.type === filtreType;

      let matchDate = true;
      if (filtreDate !== 'Tous') {
        const dateDoc = new Date(doc.date);
        const maintenant = new Date();
        if (filtreDate === 'mois') {
          matchDate = dateDoc.getMonth() === maintenant.getMonth() && dateDoc.getFullYear() === maintenant.getFullYear();
        } else if (filtreDate === 'annee') {
          matchDate = dateDoc.getFullYear() === maintenant.getFullYear();
        }
      }

      return matchRecherche && matchType && matchDate;
    });
  }, [journal, recherche, filtreType, filtreDate]);

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('fr-FR');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative w-64">
            <input type="text" placeholder="Rechercher..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[{ id: 'Tous', label: 'Tous' }, { id: 'Facture', label: 'Factures' }, { id: 'Devis', label: 'Devis' }].map((type) => (
              <button key={type.id} onClick={() => setFiltreType(type.id)} className={`px-3 py-1 text-sm font-bold rounded-md transition ${filtreType === type.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>{type.label}</button>
            ))}
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[{ id: 'Tous', label: 'Tous' }, { id: 'mois', label: 'Ce mois' }, { id: 'annee', label: 'Cette année' }].map((date) => (
              <button key={date.id} onClick={() => setFiltreDate(date.id)} className={`px-3 py-1 text-sm font-bold rounded-md transition ${filtreDate === date.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}>{date.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 font-extrabold">Numéro</th>
                <th className="px-4 py-4 font-extrabold">Type</th>
                <th className="px-4 py-4 font-extrabold">Date</th>
                <th className="px-4 py-4 font-extrabold">Client</th>
                <th className="px-4 py-4 font-extrabold text-right">Montant TTC</th>
                <th className="px-4 py-4 font-extrabold text-center">Statut</th>
                <th className="px-4 py-4 font-extrabold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-500 text-base">Chargement du journal...</td></tr>
              ) : documentsFiltres.map(doc => (
                <tr key={doc.id} className="hover:bg-teal-50 transition-colors">
                  <td className="px-4 py-4 text-base text-slate-700 font-medium whitespace-nowrap"><span className="bg-slate-100 px-2 py-1 rounded-md font-semibold">{doc.numero}</span></td>
                  <td className="px-4 py-4 whitespace-nowrap"><span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${doc.type === 'Facture' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{doc.type}</span></td>
                  <td className="px-4 py-4 text-slate-700 text-base font-medium whitespace-nowrap">{formatDate(doc.date)}</td>
                  <td className="px-4 py-4 font-bold text-slate-900 text-base">{doc.client}</td>
                  <td className="px-4 py-4 text-right font-bold text-teal-700 text-base whitespace-nowrap">{formatMonnaie(doc.montant)}</td>
                  
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    {doc.type === 'Devis' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-500">
                        À transformer
                      </span>
                    ) : doc.statut_paiement === 'Payée' ? (
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 flex items-center justify-center gap-1 mx-auto cursor-not-allowed opacity-80" 
                        title="Déjà payée. Le statut ne peut plus être modifié."
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        Payée
                      </span>
                    ) : (
                      <button 
                        onClick={() => basculerStatutPaiement(doc)}
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-100 text-orange-800 hover:bg-orange-200 transition flex items-center justify-center gap-1 mx-auto"
                        title="Marquer comme Payée"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        En attente
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => ouvrirDocument(doc)} className="text-teal-600 hover:text-teal-800 p-2 rounded-lg hover:bg-teal-100 transition" title="Voir / Télécharger le PDF">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      
                      {doc.type === 'Devis' && (
                        <button onClick={() => preparerTransformation(doc)} className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-100 transition" title="Préparer la transformation en Facture">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </button>
                      )}

                      {(() => {
                        if (doc.type === 'Devis') {
                          return (
                            <button onClick={() => supprimerDocument(doc)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" title="Supprimer le devis">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          );
                        }
                        if (doc.type === 'Facture' && estAdminSupreme) {
                          return (
                            <button onClick={() => supprimerDocument(doc)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" title="Supprimer la facture (Admin uniquement)">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && documentsFiltres.length === 0 && (<p className="p-8 text-center text-slate-500 text-base">Aucun document trouvé.</p>)}
      </div>

      {/* COMPOSANT CACHÉ POUR L'IMPRESSION */}
      {documentAImprimer && (
        <div style={{ position: 'fixed', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <FacturePDF ref={pdfRef} data={documentAImprimer.data} user={documentAImprimer.user} />
        </div>
      )}
    </div>
  );
}