import { useState } from 'react';
import FacturationForm from './FacturationForm';
import ClientsPage from './ClientsPage';
import ProduitsPage from './ProduitsPage';
import JournalPage from './JournalPage';
import StatsPage from './StatsPage';
import UsersPage from './UsersPage';
import ParametresPage from './ParametresPage';

const MODULES = [
  { id: 'facture', label: 'Facturation', icon: '📄', roles: ['Administrateur', 'Directeur Commercial', 'Agent commercial'], color: 'text-blue-600', bg: 'bg-blue-50', headerColor: 'bg-blue-600' },
  { id: 'clients', label: 'Clients', icon: '👥', roles: ['Administrateur', 'Directeur Commercial', 'Agent commercial'], color: 'text-indigo-600', bg: 'bg-indigo-50', headerColor: 'bg-indigo-600' },
  { id: 'produits', label: 'Produits', icon: '📦', roles: ['Administrateur', 'Directeur Commercial'], color: 'text-purple-600', bg: 'bg-purple-50', headerColor: 'bg-purple-600' },
  { id: 'journal', label: 'Journal', icon: '📊', roles: ['Administrateur', 'Directeur Commercial', 'Agent commercial'], color: 'text-teal-600', bg: 'bg-teal-50', headerColor: 'bg-teal-600' },
  { id: 'stats', label: 'Statistiques', icon: '📈', roles: ['Administrateur', 'Directeur Commercial'], color: 'text-rose-600', bg: 'bg-rose-50', headerColor: 'bg-rose-600' },
  { id: 'users', label: 'Utilisateurs', icon: '🔐', roles: ['Administrateur', 'Directeur Commercial'], color: 'text-slate-600', bg: 'bg-slate-100', headerColor: 'bg-slate-700' },
];

export default function Dashboard({ user, onLogout }) {
  const [activeModule, setActiveModule] = useState(null);

  const availableModules = MODULES.filter(mod => mod.roles.includes(user.role));
  const peutAccederParametres = user.role === 'Administrateur';

  // --- VUE D'UN MODULE OUVERT ---
  if (activeModule) {
    const currentMod = activeModule === 'parametres' 
      ? { label: 'Paramètres', icon: '⚙️', bg: 'bg-slate-100', headerColor: 'bg-slate-700' }
      : MODULES.find(m => m.id === activeModule);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className={`${currentMod.headerColor} px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-md transition-colors duration-300`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveModule(null)} className="p-2 hover:bg-white/20 rounded-lg transition text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              {/* Le sous-titre "Module en cours de développement" a été retiré */}
              <h1 className="text-xl font-bold text-white">{currentMod.label}</h1>
            </div>
          </div>
          <span className="text-sm font-medium text-white bg-white/20 px-3 py-1 rounded-full">
            {user.nom}
          </span>
        </header>

        <main className="flex-1 p-6">
          {activeModule === 'facture' && <FacturationForm user={user} typeParDefaut="Facture" />}
          {activeModule === 'clients' && <ClientsPage />}
          {activeModule === 'produits' && <ProduitsPage />}
          {activeModule === 'journal' && <JournalPage user={user} />}
          {activeModule === 'stats' && <StatsPage />}
          {activeModule === 'users' && <UsersPage currentUser={user} />}
          {activeModule === 'parametres' && <ParametresPage />}
        </main>
      </div>
    );
  }

  // --- ÉCRAN D'ACCUEIL PRINCIPAL ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-lg font-bold">MP</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Gestion Commerciale</h1>
            <p className="text-xs text-slate-500">Maison de la Presse Babacar Touré</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-800">{user.nom}</p>
            <p className="text-xs text-emerald-600 font-medium">{user.role}</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col">
        
        {/* Bannière de bienvenue */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-emerald-600/20">
          <h2 className="text-xl font-bold mb-1">Bonjour, {user.nom.split(' ')[0]} 👋</h2>
          <p className="text-emerald-50 text-sm">
            Bienvenue sur votre espace de travail. Que souhaitez-vous faire aujourd'hui ?
          </p>
        </div>

        {/* En-tête de section */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-800">Vos modules</h3>
        </div>

        {/* Grille des modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableModules.map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all text-left flex items-center gap-5"
            >
              <div className={`w-16 h-16 rounded-2xl ${mod.bg} flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>
                {mod.icon}
              </div>
              <div>
                {/* Le texte "Accéder au module" a été retiré */}
                <h4 className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{mod.label}</h4>
              </div>
            </button>
          ))}
        </div>

        {/* ESPACE POUR POUSSER LE FOOTER ET LE BOUTON PARAMÈTRE EN BAS */}
        <div className="flex-1"></div>

        {/* PIED DE PAGE AVEC BOUTON PARAMÈTRES */}
        <div className="mt-8 flex justify-between items-end border-t border-slate-200 pt-4">
          
          {/* Crédit à gauche */}
          <p className="text-xs font-medium text-slate-500">
            Solution développée par <span className="font-bold text-slate-700">@mazemasse</span> - 2026
          </p>

          {/* Bouton Paramètres à droite (Réservé Admin) */}
          {peutAccederParametres && (
            <button
              onClick={() => setActiveModule('parametres')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition shadow-md"
              title="Paramètres de l'application"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </button>
          )}
        </div>

      </main>
    </div>
  );
}