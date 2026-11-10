import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Fonction utilitaire pour récupérer la bonne image
const getPhotoProfil = (nom) => {
  const nomNettoye = nom ? nom.toUpperCase() : '';
  if (nomNettoye.includes('MASSE')) return 'masse.png';
  if (nomNettoye.includes('WILANE')) return 'wilane.png';
  if (nomNettoye.includes('MALADO')) return 'malado.png';
  if (nomNettoye.includes('MAIMOUNA')) return 'danfakha.png';
  return null;
};

export default function Login({ onLoginSuccess }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Logo par défaut local (sans slash pour Electron)
  const [logoUrl, setLogoUrl] = useState('logo.png');

  // États pour la modale Administrateur
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // --- CHARGEMENT DU LOGO ET DES PROFILS ---
  useEffect(() => {
    const initialiser = async () => {
      // 1. Charger le logo depuis Supabase
      const { data: paramData } = await supabase.from('parametres').select('logo').eq('id', 1).single();
      if (paramData && paramData.logo) {
        setLogoUrl(paramData.logo);
      }

      // 2. Charger uniquement les utilisateurs NON administrateurs
      const { data, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .neq('role', 'Administrateur')
        .order('nom');
        
      if (error) console.error("Erreur chargement profils:", error);
      else setUsers(data || []);
    };
    initialiser();
  }, []);

  // --- CONNEXION COMMERCIAL (STANDARD) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser || !password) {
      setError('Veuillez sélectionner un profil et saisir votre mot de passe.');
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: selectedUser.email,
        password: password,
      });

      if (authError) throw authError;

      onLoginSuccess({
        id: selectedUser.id,
        nom: selectedUser.nom,
        role: selectedUser.role,
        email: selectedUser.email
      });

    } catch (err) {
      console.error(err);
      setError('Identifiants incorrects. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // --- CONNEXION ADMINISTRATEUR (MODALE) ---
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setAdminError('');
    setAdminLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (authError) throw authError;

      const { data: userData, error: userError } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) throw new Error("Profil introuvable.");
      if (userData.role !== 'Administrateur') throw new Error("Accès refusé. Vous n'êtes pas administrateur.");

      onLoginSuccess({
        id: userData.id,
        nom: userData.nom,
        role: userData.role,
        email: userData.email
      });

    } catch (err) {
      console.error(err);
      setAdminError(err.message || 'Identifiants administrateur incorrects.');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4 py-8">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            {/* Le logo utilise une URL Supabase ou un chemin local avec un onError de secours */}
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-24 w-auto object-contain" 
              onError={(e) => { 
                if (e.target.src !== 'logo.png') {
                  e.target.src = 'logo.png'; 
                } else {
                  e.target.style.display = 'none';
                }
              }} 
            />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-wide">Gestion Commerciale</h1>
          <p className="text-emerald-600 text-sm font-medium mt-0.5">Maison de la Presse Babacar Touré</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/5 p-6 border border-emerald-100">
          <div className="mb-4 text-center">
            <h2 className="text-base font-semibold text-slate-800">Sélectionnez votre profil</h2>
            <p className="text-slate-500 text-xs mt-0.5">Équipe commerciale</p>
          </div>

          {/* LISTE DES COMMERCIAUX (SANS L'ADMIN) */}
          <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
            {users.length === 0 ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                <p className="text-sm text-slate-500">Chargement des profils...</p>
              </div>
            ) : users.map((user) => {
              const photo = getPhotoProfil(user.nom);
              
              return (
                <button
                  key={user.id}
                  onClick={() => { setSelectedUser(user); setError(''); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                    selectedUser?.id === user.id
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-slate-200">
                    {photo ? (
                      <img 
                        src={photo} 
                        alt={user.nom} 
                        className="w-full h-full object-cover" 
                        onError={(e) => { 
                          e.target.style.display = 'none'; 
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    <div 
                      className={`w-full h-full flex items-center justify-center text-white ${
                        user.role === 'Directeur Commercial' ? 'bg-indigo-500' : 'bg-emerald-500'
                      } ${photo ? 'hidden' : 'flex'}`}
                    >
                      <span className="font-bold text-lg">{user.nom.charAt(0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{user.nom}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.role}</p>
                  </div>

                  {selectedUser?.id === user.id && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Vérification...' : 'Accéder à l\'application'}
            </button>
          </form>

          {/* BOUTON DISCRET POUR L'ACCÈS ADMIN */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
            <button
              onClick={() => { setShowAdminModal(true); setAdminError(''); }}
              className="text-xs font-bold text-slate-400 hover:text-slate-800 transition flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Accès Administrateur
            </button>
          </div>
        </div>
      </div>

      {/* MODALE D'ACCÈS ADMINISTRATEUR */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Espace Administrateur
              </h3>
              <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-white transition">✕</button>
            </div>
            
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email administrateur</label>
                <input 
                  type="email" 
                  required 
                  value={adminEmail} 
                  onChange={(e) => setAdminEmail(e.target.value)} 
                  placeholder="admin@mpbt.sn" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe</label>
                <input 
                  type="password" 
                  required 
                  value={adminPassword} 
                  onChange={(e) => setAdminPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500" 
                />
              </div>

              {adminError && <p className="text-red-600 text-xs bg-red-50 p-2 rounded">{adminError}</p>}

              <button 
                type="submit" 
                disabled={adminLoading}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition disabled:bg-slate-400"
              >
                {adminLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}