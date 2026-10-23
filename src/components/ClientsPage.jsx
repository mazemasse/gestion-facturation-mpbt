import { useState, useMemo, useEffect } from 'react';
import { countries } from 'countries-list';
import { supabase } from '../lib/supabaseClient'; // <-- IMPORT SUPABASE

export default function ClientsPage() {
  // --- ÉTATS ---
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [clientEnEdition, setClientEnEdition] = useState(null);

  // --- CHARGEMENT DES DONNÉES DEPUIS SUPABASE ---
  const chargerClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });

    if (error) {
      console.error("Erreur de chargement:", error);
      alert("Impossible de charger les clients.");
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    chargerClients();
  }, []);

  // --- LISTE DES PAYS ---
  const listePays = useMemo(() => {
    const tousLesPays = Object.keys(countries).map(code => {
      const pays = countries[code];
      return { code, nom: pays.name, indicatif: `+${pays.phone}`, emoji: pays.emoji };
    });
    const senegal = tousLesPays.find(p => p.nom === 'Senegal' || p.nom === 'Sénégal');
    const autresPays = tousLesPays.filter(p => p.nom !== 'Senegal' && p.nom !== 'Sénégal').sort((a, b) => a.nom.localeCompare(b.nom));
    return senegal ? [senegal, ...autresPays] : autresPays;
  }, []);

  // --- ÉTAT DU FORMULAIRE ---
  const [nouveauClient, setNouveauClient] = useState({
    type: 'Etablissement', nom: '', contact: '', tel: '', email: '', adresse: '', ville: '', pays: 'Senegal',
  });

  const indicatifActuel = listePays.find(p => p.nom === nouveauClient.pays)?.indicatif || '+221';
  const isEtablissement = nouveauClient.type === 'Etablissement';
  
  const theme = {
    border: isEtablissement ? 'border-blue-300' : 'border-emerald-300',
    bg: isEtablissement ? 'bg-blue-50/50' : 'bg-emerald-50/50',
    accent: isEtablissement ? 'text-blue-800' : 'text-emerald-800',
    radio: isEtablissement ? 'text-blue-600 focus:ring-blue-500' : 'text-emerald-600 focus:ring-emerald-500',
    button: isEtablissement ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700',
  };

  const handlePaysChange = (paysSelectionne) => {
    const infoPays = listePays.find(p => p.nom === paysSelectionne);
    setNouveauClient({ ...nouveauClient, pays: paysSelectionne, tel: infoPays ? infoPays.indicatif + ' ' : '' });
  };

  const handleTelChange = (e) => {
    let valeur = e.target.value;
    if (!valeur.startsWith(indicatifActuel)) {
      valeur = `${indicatifActuel} ${valeur.replace(/\D/g, '')}`;
    }
    setNouveauClient({ ...nouveauClient, tel: valeur });
  };

  // --- ENREGISTREMENT (AJOUT OU MODIFICATION) ---
  const handleAjouter = async (e) => {
    e.preventDefault();
    
    const clientFinal = { ...nouveauClient };
    if (clientFinal.type === 'Individuel') clientFinal.contact = '';

    if (clientEnEdition) {
      // MODIFICATION
      const { error } = await supabase
        .from('clients')
        .update(clientFinal)
        .eq('id', clientEnEdition);

      if (error) {
        alert("Erreur lors de la mise à jour : " + error.message);
        return;
      }
    } else {
      // AJOUT
      // On génère un ID unique basé sur le timestamp pour éviter les conflits
      const nouvelId = `CL-${Date.now().toString().slice(-6)}-MPBT`;
      const { error } = await supabase
        .from('clients')
        .insert([{ ...clientFinal, id: nouvelId }]);

      if (error) {
        alert("Erreur lors de l'ajout : " + error.message);
        return;
      }
    }

    // Réinitialisation et rechargement
    setNouveauClient({ type: 'Etablissement', nom: '', contact: '', tel: '', email: '', adresse: '', ville: '', pays: 'Senegal' });
    setClientEnEdition(null);
    setShowForm(false);
    chargerClients();
  };

  // --- SUPPRESSION ---
  const supprimerClient = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce client ?")) {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) {
        alert("Erreur de suppression : " + error.message);
      } else {
        chargerClients();
      }
    }
  };

  // --- PASSAGE EN MODE MODIFICATION ---
  const modifierClient = (client) => {
    setNouveauClient(client);
    setClientEnEdition(client.id);
    setShowForm(true);
  };

  const annulerEdition = () => {
    setClientEnEdition(null);
    setNouveauClient({ type: 'Etablissement', nom: '', contact: '', tel: '', email: '', adresse: '', ville: '', pays: 'Senegal' });
    setShowForm(false);
  };

  const clientsFiltres = clients.filter(c => 
    c.nom.toLowerCase().includes(recherche.toLowerCase()) ||
    (c.contact && c.contact.toLowerCase().includes(recherche.toLowerCase()))
  );

  const afficherNomPays = (nomPays) => (nomPays === 'Senegal' || nomPays === 'Sénégal') ? 'Sénégal' : nomPays;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-80">
          <input type="text" placeholder="Rechercher un client..." value={recherche} onChange={(e) => setRecherche(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <button onClick={() => { if (showForm) annulerEdition(); else setShowForm(true); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-lg transition shadow-md">
          {showForm ? 'Fermer' : '+ Nouveau Client'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAjouter} className={`p-5 rounded-xl shadow-md border-2 transition-colors duration-300 ${theme.border} ${theme.bg}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-lg font-extrabold uppercase tracking-wide ${theme.accent}`}>{clientEnEdition ? 'Modifier le client' : 'Nouveau client'}</h3>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="typeClient" value="Etablissement" checked={nouveauClient.type === 'Etablissement'} onChange={(e) => setNouveauClient({...nouveauClient, type: e.target.value})} className={`w-5 h-5 ${theme.radio}`} />
                <span className="text-base font-bold text-slate-800">Etablissement</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="typeClient" value="Individuel" checked={nouveauClient.type === 'Individuel'} onChange={(e) => setNouveauClient({...nouveauClient, type: e.target.value})} className={`w-5 h-5 ${theme.radio}`} />
                <span className="text-base font-bold text-slate-800">Individuel</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">{isEtablissement ? 'Nom établissement *' : 'Nom & Prénom *'}</label>
              <input required placeholder={isEtablissement ? 'SENEGAL TELECOM' : 'Amadou Fall'} value={nouveauClient.nom} onChange={e => setNouveauClient({...nouveauClient, nom: e.target.value})} className={`w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 ${theme.radio}`} />
            </div>
            {isEtablissement && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Contact *</label>
                <input required placeholder="M. Diop" value={nouveauClient.contact} onChange={e => setNouveauClient({...nouveauClient, contact: e.target.value})} className={`w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 ${theme.radio}`} />
              </div>
            )}
            <div className={isEtablissement ? '' : 'md:col-span-2'}>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Téléphone *</label>
              <div className="flex gap-2">
                <select value={nouveauClient.pays} onChange={(e) => handlePaysChange(e.target.value)} className="w-2/5 px-2 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500">
                  {listePays.map(p => <option key={p.code} value={p.nom}>{p.emoji} {p.indicatif}</option>)}
                </select>
                <input required value={nouveauClient.tel} onChange={handleTelChange} placeholder={`${indicatifActuel} XX XXX XX XX`} className={`w-3/5 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 ${theme.radio}`} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email <span className="text-slate-500 font-normal">(facult.)</span></label>
              <input type="email" placeholder="client@exemple.com" value={nouveauClient.email} onChange={e => setNouveauClient({...nouveauClient, email: e.target.value})} className={`w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 ${theme.radio}`} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Adresse *</label>
              <input required placeholder="Sacré-Cœur 3" value={nouveauClient.adresse} onChange={e => setNouveauClient({...nouveauClient, adresse: e.target.value})} className={`w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 ${theme.radio}`} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Ville <span className="text-slate-500 font-normal">(facult.)</span></label>
              <input placeholder="Dakar" value={nouveauClient.ville} onChange={e => setNouveauClient({...nouveauClient, ville: e.target.value})} className={`w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 ${theme.radio}`} />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-3">
            {clientEnEdition && (
              <button type="button" onClick={annulerEdition} className="px-5 py-2.5 text-base text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition">Annuler</button>
            )}
            <button type="submit" className={`px-6 py-2.5 text-base text-white font-bold rounded-lg transition shadow-md ${theme.button}`}>
              {clientEnEdition ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 font-extrabold">ID</th>
              <th className="px-4 py-4 font-extrabold">Type</th>
              <th className="px-4 py-4 font-extrabold">Nom / Etablissement</th>
              <th className="px-4 py-4 font-extrabold">Contact</th>
              <th className="px-4 py-4 font-extrabold">Téléphone</th>
              <th className="px-4 py-4 font-extrabold">Ville / Pays</th>
              <th className="px-4 py-4 font-extrabold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500 text-base">Chargement des clients...</td></tr>
            ) : clientsFiltres.map(client => {
              const isIndividu = client.type === 'Individuel';
              return (
                <tr key={client.id} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-4 py-4 text-base text-slate-700 font-medium"><span className="bg-slate-100 px-2 py-1 rounded-md font-semibold">{client.id}</span></td>
                  <td className="px-4 py-4"><span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${isIndividu ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>{client.type || 'Etablissement'}</span></td>
                  <td className="px-4 py-4 font-bold text-slate-900 text-base">{client.nom}</td>
                  <td className="px-4 py-4 text-slate-700 text-base">{client.contact || '-'}</td>
                  <td className="px-4 py-4 text-slate-700 text-base font-medium">{client.tel}</td>
                  <td className="px-4 py-4 text-slate-700 text-base">{client.ville && `${client.ville}, `}{afficherNomPays(client.pays || 'Senegal')}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => modifierClient(client)} className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-100 transition" title="Modifier"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => supprimerClient(client.id)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" title="Supprimer"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && clientsFiltres.length === 0 && (<p className="p-8 text-center text-slate-500 text-base">Aucun client trouvé.</p>)}
      </div>
    </div>
  );
}