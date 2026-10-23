import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import MonProfil from './MonProfil';

const ROLES_DISPONIBLES = ['Administrateur', 'Directeur Commercial', 'Agent commercial'];

export default function UsersPage({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);

  const [nouvelUser, setNouvelUser] = useState({
    nom: '', role: 'Agent commercial', email: ''
  });

  const isAdmin = currentUser?.nom === 'MASSE NDOYE';
  const userCible = userEnEdition ? users.find(u => u.id === userEnEdition) : null;

  // --- CHARGEMENT DES UTILISATEURS ---
  const chargerUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('utilisateurs').select('*').order('nom');
    if (error) console.error(error);
    else setUsers(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    chargerUsers();
  }, []);

  // --- LOGIQUE DE SÉCURITÉ ---
  const peutEditer = (user) => {
    if (!user) return true; 
    if (user.nom === 'MASSE NDOYE') return isAdmin;
    if (isAdmin) return true;
    return false;
  };

  const peutSupprimer = (user) => {
    if (user.nom === 'MASSE NDOYE') return false;
    if (isAdmin) return true;
    return false;
  };

  // --- ACTIONS ---
  const handleAjouter = async (e) => {
    e.preventDefault();
    
    if (userEnEdition) {
      const { error } = await supabase
        .from('utilisateurs')
        .update({ nom: nouvelUser.nom, role: nouvelUser.role, email: nouvelUser.email })
        .eq('id', userEnEdition);
      
      if (error) alert("Erreur : " + error.message);
      else {
        alert("Utilisateur modifié.");
        setShowForm(false);
        setUserEnEdition(null);
        chargerUsers();
      }
    } else {
      alert("Pour créer un compte, veuillez d'abord l'ajouter dans Supabase > Authentication > Users, puis copier son ID (UUID) ici.");
      const uuid = prompt("Entrez l'ID (UUID) du compte créé dans Supabase Auth :");
      if (!uuid) return;

      const { error } = await supabase.from('utilisateurs').insert([{
        id: uuid,
        email: nouvelUser.email,
        nom: nouvelUser.nom.toUpperCase(),
        role: nouvelUser.role
      }]);

      if (error) alert("Erreur : " + error.message);
      else {
        alert("Profil utilisateur ajouté.");
        setNouvelUser({ nom: '', role: 'Agent commercial', email: '' });
        setShowForm(false);
        chargerUsers();
      }
    }
  };

  const modifierUser = (user) => {
    setNouvelUser({ nom: user.nom, role: user.role, email: user.email });
    setUserEnEdition(user.id);
    setShowForm(true);
  };

  const supprimerUser = async (id, nom) => {
    if (window.confirm(`Supprimer ${nom} de la liste ?`)) {
      const { error } = await supabase.from('utilisateurs').delete().eq('id', id);
      if (error) alert("Erreur : " + error.message);
      else chargerUsers();
    }
  };

  const annulerEdition = () => {
    setUserEnEdition(null);
    setNouvelUser({ nom: '', role: 'Agent commercial', email: '' });
    setShowForm(false);
  };

  // Si les utilisateurs ne sont pas encore chargés, on affiche juste le profil
  // (Cela évite une erreur si users est vide au premier rendu)
  const usersAffiches = isAdmin ? users : users.filter(u => u.id === currentUser?.id);

  return (
    <div className="space-y-4">
      
      {/* 1. Section Mon Profil (Mot de passe) */}
      <MonProfil currentUser={currentUser} />

      {/* 2. Section Gestion (Visible seulement si Admin) */}
      {isAdmin && (
        <>
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-extrabold text-slate-800">Gestion des accès</h2>
            <button onClick={() => { if (showForm) annulerEdition(); else setShowForm(true); }} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-base font-bold rounded-lg transition shadow-md">
              {showForm ? 'Fermer' : '+ Nouvel Utilisateur'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAjouter} className="bg-slate-50 p-5 rounded-xl shadow-md border-2 border-slate-300">
              <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-700 mb-4">
                {userEnEdition ? 'Modifier l\'utilisateur' : 'Ajouter un profil'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nom complet *</label>
                  <input required placeholder="Ex: BINETA" value={nouvelUser.nom} onChange={e => setNouvelUser({...nouvelUser, nom: e.target.value.toUpperCase()})} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Rôle</label>
                  <select value={nouvelUser.role} onChange={e => setNouvelUser({...nouvelUser, role: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500">
                    {ROLES_DISPONIBLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
                  <input type="email" placeholder="email@mpbt.sn" value={nouvelUser.email} onChange={e => setNouvelUser({...nouvelUser, email: e.target.value})} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-slate-500" />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                {userEnEdition && (
                  <button type="button" onClick={annulerEdition} className="px-5 py-2.5 text-base text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition">Annuler</button>
                )}
                <button type="submit" className="px-6 py-2.5 text-base bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition shadow-md">
                  {userEnEdition ? 'Mettre à jour' : 'Ajouter le profil'}
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* 3. Tableau des utilisateurs */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 font-extrabold">Utilisateur</th>
              <th className="px-4 py-4 font-extrabold">Rôle</th>
              <th className="px-4 py-4 font-extrabold">Email</th>
              {isAdmin && <th className="px-4 py-4 font-extrabold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              <tr><td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-slate-500">Chargement...</td></tr>
            ) : usersAffiches.length === 0 ? (
              <tr><td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-slate-500">Aucun utilisateur trouvé.</td></tr>
            ) : usersAffiches.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 font-bold text-slate-900 text-base">{u.nom}</td>
                <td className="px-4 py-4">
                  <span className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase ${u.role === 'Administrateur' ? 'bg-red-100 text-red-800' : u.role === 'Directeur Commercial' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-4 text-slate-700 text-base">{u.email || '-'}</td>
                {isAdmin && (
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {peutEditer(u) && (
                        <button onClick={() => modifierUser(u)} className="text-slate-600 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition" title="Modifier"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      )}
                      {peutSupprimer(u) && (
                        <button onClick={() => supprimerUser(u.id, u.nom)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" title="Supprimer"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}