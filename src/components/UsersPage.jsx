import { useState } from 'react';

const USERS_INITIAL = [
  { id: 1, nom: 'MASSE NDOYE', role: 'Administrateur', email: 'masse@mpbt.sn', actif: true },
  { id: 2, nom: 'MOUHAMED WILANE', role: 'Directeur Commercial', email: 'wilane@mpbt.sn', actif: true },
  { id: 3, nom: 'BINETA', role: 'Agent commercial', email: 'bineta@mpbt.sn', actif: true },
  { id: 4, nom: 'AISSATOU', role: 'Agent commercial', email: 'aissatou@mpbt.sn', actif: true },
];

const ROLES_DISPONIBLES = ['Administrateur', 'Directeur Commercial', 'Agent commercial'];

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState(USERS_INITIAL);
  const [showForm, setShowForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);

  // État du formulaire
  const [nouvelUser, setNouvelUser] = useState({
    nom: '', role: 'Agent commercial', email: '', motDePasse: ''
  });

  const isAdmin = currentUser?.nom === 'MASSE NDOYE';
  const isDirecteur = currentUser?.role === 'Directeur Commercial';
  
  // Récupération de l'utilisateur ciblé (pour les vérifications de droits)
  const userCible = userEnEdition ? users.find(u => u.id === userEnEdition) : null;

  // --- LOGIQUE DE SÉCURITÉ POUR L'ÉDITION ---
  const peutEditer = (user) => {
    if (!user) return true; // Création
    if (user.nom === 'MASSE NDOYE') return isAdmin; // Seul Masse peut s'éditer
    if (isAdmin) return true; // Masse peut tout éditer
    if (isDirecteur) return user.role === 'Agent commercial' || user.nom === currentUser.nom; // Wilane gère les agents et son propre compte
    return false;
  };

  // --- LOGIQUE DE SÉCURITÉ POUR LA SUPPRESSION ---
  const peutSupprimer = (user) => {
    if (user.nom === 'MASSE NDOYE') return false; // Personne ne supprime Masse
    if (isAdmin) return true; // Masse peut tout supprimer
    if (isDirecteur) return user.role === 'Agent commercial'; // Wilane supprime uniquement les agents
    return false;
  };

  // --- ACTIONS ---
  const handleAjouter = (e) => {
    e.preventDefault();
    
    // Sécurité à la validation
    if (!peutEditer(userCible)) {
      alert("Action refusée : Vous n'avez pas les droits nécessaires.");
      return;
    }

    if (userEnEdition) {
      setUsers(users.map(u => u.id === userEnEdition ? { ...u, nom: nouvelUser.nom, role: nouvelUser.role, email: nouvelUser.email } : u));
      setUserEnEdition(null);
    } else {
      const nouvelId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
      setUsers([...users, { ...nouvelUser, id: nouvelId, actif: true }]);
    }
    setNouvelUser({ nom: '', role: 'Agent commercial', email: '', motDePasse: '' });
    setShowForm(false);
  };

  const modifierUser = (user) => {
    if (!peutEditer(user)) {
      alert("Action refusée : Vous n'avez pas les droits pour modifier cet utilisateur.");
      return;
    }
    setNouvelUser(user);
    setUserEnEdition(user.id);
    setShowForm(true);
  };

  const supprimerUser = (id, nom) => {
    const user = users.find(u => u.id === id);
    if (!peutSupprimer(user)) {
      alert("Action refusée : Vous ne pouvez pas supprimer cet utilisateur.");
      return;
    }

    if (window.confirm(`Voulez-vous vraiment supprimer l'utilisateur ${nom} ?`)) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  const toggleActif = (id) => {
    const user = users.find(u => u.id === id);
    if (!peutEditer(user)) return;
    setUsers(users.map(u => u.id === id ? { ...u, actif: !u.actif } : u));
  };

  const annulerEdition = () => {
    setUserEnEdition(null);
    setNouvelUser({ nom: '', role: 'Agent commercial', email: '', motDePasse: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Barre d'actions */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-extrabold text-slate-800">Gestion des accès</h2>
        <button 
          onClick={() => { if (showForm) annulerEdition(); else setShowForm(true); }}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-base font-bold rounded-lg transition shadow-md"
        >
          {showForm ? 'Fermer' : '+ Nouvel Utilisateur'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleAjouter} className="bg-slate-50 p-5 rounded-xl shadow-md border-2 border-slate-300">
          <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-700 mb-4">
            {userEnEdition ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nom complet *</label>
              <input 
                required 
                placeholder="Ex: BINETA" 
                value={nouvelUser.nom} 
                onChange={e => setNouvelUser({...nouvelUser, nom: e.target.value.toUpperCase()})} 
                disabled={userCible?.nom === 'MASSE NDOYE' && !isAdmin}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100 disabled:text-slate-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Rôle</label>
              <select 
                value={nouvelUser.role} 
                onChange={e => setNouvelUser({...nouvelUser, role: e.target.value})} 
                disabled={!isAdmin || (userCible?.nom === 'MASSE NDOYE' && !isAdmin)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {ROLES_DISPONIBLES.map(r => {
                  // Wilane ne peut pas attribuer le rôle Administrateur
                  if (!isAdmin && r === 'Administrateur') return null;
                  return <option key={r} value={r}>{r}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
              <input 
                type="email" 
                placeholder="email@mpbt.sn" 
                value={nouvelUser.email} 
                onChange={e => setNouvelUser({...nouvelUser, email: e.target.value})} 
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500" 
              />
            </div>

            {!userEnEdition && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Mot de passe temporaire *</label>
                <input 
                  required 
                  type="password" 
                  placeholder="••••••••" 
                  value={nouvelUser.motDePasse} 
                  onChange={e => setNouvelUser({...nouvelUser, motDePasse: e.target.value})} 
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500" 
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-3">
            {userEnEdition && (
              <button type="button" onClick={annulerEdition} className="px-5 py-2.5 text-base text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition">
                Annuler
              </button>
            )}
            <button type="submit" className="px-6 py-2.5 text-base bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition shadow-md">
              {userEnEdition ? 'Mettre à jour' : 'Créer l\'utilisateur'}
            </button>
          </div>
        </form>
      )}

      {/* Tableau */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 font-extrabold">Utilisateur</th>
              <th className="px-4 py-4 font-extrabold">Rôle</th>
              <th className="px-4 py-4 font-extrabold">Email</th>
              <th className="px-4 py-4 font-extrabold text-center">Statut</th>
              <th className="px-4 py-4 font-extrabold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map(u => {
              const peutEditerCetUser = peutEditer(u);
              const peutSupprimerCetUser = peutSupprimer(u);
              
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 font-bold text-slate-900 text-base">{u.nom}</td>
                  <td className="px-4 py-4">
                    <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${u.role === 'Administrateur' ? 'bg-red-100 text-red-800' : u.role === 'Directeur Commercial' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700 text-base">{u.email || '-'}</td>
                  <td className="px-4 py-4 text-center">
                    <button 
                      onClick={() => toggleActif(u.id)} 
                      disabled={!peutEditerCetUser}
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase transition ${u.actif ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {u.actif ? 'Actif' : 'Inactif'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {peutEditerCetUser && (
                        <button onClick={() => modifierUser(u)} className="text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition" title="Modifier">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      )}
                      
                      {peutSupprimerCetUser && (
                        <button onClick={() => supprimerUser(u.id, u.nom)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" title="Supprimer">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}