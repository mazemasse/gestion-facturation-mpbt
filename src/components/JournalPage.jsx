import { useState, useMemo } from 'react';

const JOURNAL_INITIAL = [
  { id: 1, numero: 'F-2026-0001', type: 'Facture', date: '2026-10-15', client: 'MINISTÈRE DE LA COMMUNICATION', montant: 9735000, statut: 'Payée', valide: true },
  { id: 2, numero: 'D-2026-0001', type: 'Devis', date: '2026-10-16', client: 'SENEGAL TELECOM', montant: 2500000, statut: 'En attente', valide: true },
  { id: 3, numero: 'F-2026-0002', type: 'Facture', date: '2026-10-18', client: 'RTS (RADIO TELEVISION SENEGALAISE)', montant: 600000, statut: 'Payée', valide: true },
  { id: 4, numero: 'F-2026-0003', type: 'Facture', date: '2026-10-19', client: 'PRESSE NATIONALE', montant: 150000, statut: 'Impayée', valide: false },
  { id: 5, numero: 'D-2026-0002', type: 'Devis', date: '2026-10-20', client: 'MINISTÈRE DE LA COMMUNICATION', montant: 450000, statut: 'En attente', valide: false },
];

export default function JournalPage({ user, onOuvrirDocument }) {
  const [journal, setJournal] = useState(JOURNAL_INITIAL);
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState('Tous');

  const estAdmin = user?.nom === 'MASSE NDOYE';

  const supprimerDocument = (id, numero) => {
    if (!estAdmin) {
      alert("Action refusée : Seul l'administrateur (Masse Ndoye) peut supprimer une pièce comptable.");
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le document ${numero} ? Cette action est irréversible.`)) {
      setJournal(journal.filter(doc => doc.id !== id));
    }
  };

  const documentsFiltres = useMemo(() => {
    return journal.filter(doc => {
      const matchRecherche = doc.numero.toLowerCase().includes(recherche.toLowerCase()) || 
                             doc.client.toLowerCase().includes(recherche.toLowerCase());
      const matchType = filtreType === 'Tous' || doc.type === filtreType;
      return matchRecherche && matchType;
    });
  }, [journal, recherche, filtreType]);

  const stats = useMemo(() => {
    const totalFactures = documentsFiltres.filter(d => d.type === 'Facture').reduce((sum, d) => sum + d.montant, 0);
    const nbFactures = documentsFiltres.filter(d => d.type === 'Facture').length;
    const nbDevis = documentsFiltres.filter(d => d.type === 'Devis').length;
    const nbEnAttente = documentsFiltres.filter(d => d.valide === false).length;
    return { totalFactures, nbFactures, nbDevis, nbEnAttente };
  }, [documentsFiltres]);

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');
  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('fr-FR');

  const getStatutStyle = (statut) => {
    switch (statut) {
      case 'Payée': return 'bg-emerald-100 text-emerald-800';
      case 'Impayée': return 'bg-red-100 text-red-800';
      case 'En attente': return 'bg-amber-100 text-amber-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Barre d'outils */}
      <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 gap-4">
        <div className="flex gap-3 items-center">
          <div className="relative w-72">
            <input 
              type="text" 
              placeholder="Rechercher un numéro ou un client..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* CORRECTION DES LIBELLÉS ICI */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[
              { id: 'Tous', label: 'Tous' },
              { id: 'Facture', label: 'Factures' },
              { id: 'Devis', label: 'Devis' }
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setFiltreType(type.id)}
                className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${filtreType === type.id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-6 text-sm">
          <div className="text-right">
            <p className="text-slate-500 font-medium">Total Facturé</p>
            <p className="text-lg font-extrabold text-teal-700">{formatMonnaie(stats.totalFactures)}</p>
          </div>
          <div className="text-right border-l border-slate-200 pl-6">
            <p className="text-slate-500 font-medium">Documents</p>
            <p className="text-lg font-extrabold text-slate-800">{stats.nbFactures} Fac. / {stats.nbDevis} Dev.</p>
          </div>
          {estAdmin && stats.nbEnAttente > 0 && (
             <div className="text-right border-l border-slate-200 pl-6">
              <p className="text-amber-600 font-bold">À valider</p>
              <p className="text-lg font-extrabold text-amber-700">{stats.nbEnAttente}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tableau du journal avec défilement horizontal */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-sm uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 font-extrabold whitespace-nowrap">Numéro</th>
                <th className="px-4 py-4 font-extrabold whitespace-nowrap">Type</th>
                <th className="px-4 py-4 font-extrabold whitespace-nowrap">Date</th>
                <th className="px-4 py-4 font-extrabold">Client</th>
                <th className="px-4 py-4 font-extrabold text-right whitespace-nowrap">Montant TTC</th>
                <th className="px-4 py-4 font-extrabold text-center whitespace-nowrap">Statut</th>
                <th className="px-4 py-4 font-extrabold text-center whitespace-nowrap">Validation</th>
                <th className="px-4 py-4 font-extrabold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documentsFiltres.map(doc => (
                <tr key={doc.id} className="hover:bg-teal-50 transition-colors">
                  <td className="px-4 py-4 text-base text-slate-700 font-medium whitespace-nowrap">
                    <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold">{doc.numero}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${doc.type === 'Facture' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                      {doc.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700 text-base font-medium whitespace-nowrap">{formatDate(doc.date)}</td>
                  <td className="px-4 py-4 font-bold text-slate-900 text-base">{doc.client}</td>
                  <td className="px-4 py-4 text-right font-bold text-teal-700 text-base whitespace-nowrap">{formatMonnaie(doc.montant)}</td>
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${getStatutStyle(doc.statut)}`}>
                      {doc.statut}
                    </span>
                  </td>
                  
                  <td className="px-4 py-4 text-center whitespace-nowrap">
                    {doc.valide ? (
                      <span className="text-emerald-600 text-sm font-bold flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Validé
                      </span>
                    ) : (
                      <span className="text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                        En attente
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => onOuvrirDocument(doc)} 
                        className="text-teal-600 hover:text-teal-800 p-2 rounded-lg hover:bg-teal-100 transition" 
                        title="Voir / Imprimer"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>

                      {doc.type === 'Devis' && (
                        <button 
                          className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-100 transition" 
                          title="Transformer en Facture"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        </button>
                      )}

                      {estAdmin && (
                        <button 
                          onClick={() => supprimerDocument(doc.id, doc.numero)} 
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" 
                          title="Supprimer définitivement"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {documentsFiltres.length === 0 && (
          <p className="p-8 text-center text-slate-500 text-base">Aucun document trouvé.</p>
        )}
      </div>
    </div>
  );
}