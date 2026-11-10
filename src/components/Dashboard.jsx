import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { estAdmin } from '../lib/permissions';
import FacturationForm from './FacturationForm';
import ClientsPage from './ClientsPage';
import ProduitsPage from './ProduitsPage';
import JournalPage from './JournalPage';
import StatsPage from './StatsPage';
import UsersPage from './UsersPage';
import ParametresPage from './ParametresPage';
import ReservationsPage from './ReservationsPage';

// Fonction utilitaire pour récupérer la bonne image (SANS SLASH POUR ELECTRON)
const getPhotoProfil = (nom) => {
  const nomNettoye = nom ? nom.toUpperCase() : '';
  if (nomNettoye.includes('MASSE')) return 'masse.png';
  if (nomNettoye.includes('WILANE')) return 'wilane.png';
  if (nomNettoye.includes('MALADO')) return 'malado.png';
  if (nomNettoye.includes('MAIMOUNA')) return 'danfakha.png';
  return null;
};

const MODULES = [
  { id: 'facture', label: 'Facturation', icon: '📄', roles: ['Administrateur', 'Directeur Commercial', 'Chef de service Commercial', 'Agent commercial'], color: 'text-blue-600', bg: 'bg-blue-50', headerColor: 'bg-blue-600' },
  { id: 'clients', label: 'Clients', icon: '👥', roles: ['Administrateur', 'Directeur Commercial', 'Chef de service Commercial', 'Agent commercial'], color: 'text-indigo-600', bg: 'bg-indigo-50', headerColor: 'bg-indigo-600' },
  { id: 'produits', label: 'Produits', icon: '📦', roles: ['Administrateur', 'Directeur Commercial', 'Chef de service Commercial', 'Agent commercial'], color: 'text-purple-600', bg: 'bg-purple-50', headerColor: 'bg-purple-600' },
  { id: 'journal', label: 'Journal', icon: '📊', roles: ['Administrateur', 'Directeur Commercial', 'Chef de service Commercial', 'Agent commercial'], color: 'text-teal-600', bg: 'bg-teal-50', headerColor: 'bg-teal-600' },
  { id: 'stats', label: 'Statistiques', icon: '📈', roles: ['Administrateur', 'Directeur Commercial', 'Chef de service Commercial', 'Agent commercial'], color: 'text-rose-600', bg: 'bg-rose-50', headerColor: 'bg-rose-600' },
  { id: 'users', label: 'Utilisateurs', icon: '🔐', roles: ['Administrateur', 'Directeur Commercial', 'Chef de service Commercial', 'Agent commercial'], color: 'text-slate-600', bg: 'bg-slate-100', headerColor: 'bg-slate-700' },
];

export default function Dashboard({ user, onLogout }) {
  const [activeModule, setActiveModule] = useState(null);
  const [donneesInitiales, setDonneesInitiales] = useState(null);
  
  const [kpis, setKpis] = useState({ caMois: 0, resasAVenir: 0, topClient: '-', totalFactures: 0 });
  const [isLoadingKpi, setIsLoadingKpi] = useState(true);

  useEffect(() => {
    const chargerKpis = async () => {
      try {
        const debutMois = new Date();
        debutMois.setDate(1);
        debutMois.setHours(0,0,0,0);
        
        const { data: factures } = await supabase
          .from('factures')
          .select('net_a_payer, client_nom')
          .eq('type_doc', 'Facture')
          .gte('date_creation', debutMois.toISOString());
        
        let caTotal = 0;
        let topClientMap = {};
        
        if (factures) {
          factures.forEach(f => {
            caTotal += (f.net_a_payer || 0);
            topClientMap[f.client_nom] = (topClientMap[f.client_nom] || 0) + (f.net_a_payer || 0);
          });
        }

        let topClientNom = '-';
        let maxCa = 0;
        Object.keys(topClientMap).forEach(client => {
          if (topClientMap[client] > maxCa) {
            maxCa = topClientMap[client];
            topClientNom = client;
          }
        });

        const aujourdhui = new Date().toISOString().split('T')[0];
        const { count: resasCount } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .gte('date_arrivee', aujourdhui)
          .neq('statut', 'Annulée');

        setKpis({
          caMois: caTotal,
          resasAVenir: resasCount || 0,
          topClient: topClientNom,
          totalFactures: factures ? factures.length : 0
        });
      } catch (error) {
        console.error("Erreur chargement KPIs:", error);
      } finally {
        setIsLoadingKpi(false);
      }
    };
    chargerKpis();
  }, []);

  // --- SÉCURITÉ GLOBALE ---
  // Tous les rôles ont accès à tous les modules (availableModules = MODULES)
  const availableModules = MODULES;
  
  // Seul Masse Ndoye voit les paramètres
  const peutAccederParametres = estAdmin(user); 
  
  // Tout le monde peut réserver
  const peutAccederReservations = true; 
  
  const photoProfil = getPhotoProfil(user.nom);

  const handlePreparerFacture = (data) => {
    setDonneesInitiales(data);
    setActiveModule('facture');
  };

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');

  if (activeModule) {
    const currentMod = activeModule === 'parametres' 
      ? { label: 'Paramètres', icon: '⚙️', bg: 'bg-slate-100', headerColor: 'bg-slate-700' }
      : activeModule === 'reservations'
      ? { label: 'Réservations', icon: '📅', bg: 'bg-purple-50', headerColor: 'bg-purple-600' }
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
            <div><h1 className="text-xl font-bold text-white">{currentMod.label}</h1></div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
               {photoProfil ? (
                  <img src={photoProfil} alt="Profil" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                    {user.nom.charAt(0)}
                  </div>
               )}
            </div>
            <span className="text-sm font-medium text-white bg-white/20 px-3 py-1 rounded-full">{user.nom}</span>
          </div>
        </header>

        <main className="flex-1 p-6">
          {activeModule === 'facture' && (
            <FacturationForm user={user} typeParDefaut="Facture" donneesInitiales={donneesInitiales} onResetInitiales={() => setDonneesInitiales(null)} />
          )}
          {activeModule === 'clients' && <ClientsPage user={user} />}
          {activeModule === 'produits' && <ProduitsPage user={user} />}
          {activeModule === 'journal' && <JournalPage user={user} onPreparerFacture={handlePreparerFacture} />}
          {activeModule === 'stats' && <StatsPage />}
          {activeModule === 'users' && <UsersPage currentUser={user} />}
          {activeModule === 'parametres' && <ParametresPage />}
          {activeModule === 'reservations' && <ReservationsPage user={user} />}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src="logo.png" alt="Logo MPBT" className="h-10 w-auto object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-tight">Gestion Commerciale</h1>
            <p className="text-xs text-slate-500">Maison de la Presse Babacar Touré</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shadow-sm">
               {photoProfil ? (
                  <img src={photoProfil} alt="Profil" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
               )}
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">{user.nom}</p>
              <p className="text-xs text-emerald-600 font-medium">{user.role}</p>
            </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col">
        
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-emerald-600/20 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold mb-1">Bonjour, {user.nom.split(' ')[0]} 👋</h2>
            <p className="text-emerald-50 text-sm">Voici un résumé de votre activité commerciale aujourd'hui.</p>
          </div>
          <div className="hidden md:flex gap-4">
            {peutAccederReservations && (
               <button onClick={() => setActiveModule('reservations')} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition shadow-md">
                 <span className="text-lg">📅</span> Nouvelle Réservation
               </button>
            )}
            <button onClick={() => setActiveModule('facture')} className="flex items-center gap-2 px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 text-sm font-bold rounded-lg transition shadow-md">
              <span className="text-lg">📄</span> Nouvelle Facture
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Chiffre d'Affaires (Mois)</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{isLoadingKpi ? '...' : formatMonnaie(kpis.caMois)}</p>
              <p className="text-xs text-slate-400">{kpis.totalFactures} facture(s) émise(s)</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Réservations à venir</p>
              <p className="text-2xl font-black text-slate-800 mt-1">{isLoadingKpi ? '...' : kpis.resasAVenir}</p>
              <p className="text-xs text-slate-400">Confirmées pour les jours à venir</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Top Client (Mois)</p>
              <p className="text-lg font-black text-slate-800 mt-1 truncate" title={kpis.topClient}>{isLoadingKpi ? '...' : kpis.topClient}</p>
              <p className="text-xs text-slate-400">Générateur de CA ce mois-ci</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">Vos modules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableModules.map((mod) => (
            <button key={mod.id} onClick={() => setActiveModule(mod.id)} className="group bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all text-left flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl ${mod.bg} flex items-center justify-center text-4xl flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm`}>{mod.icon}</div>
              <div><h4 className="text-xl font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{mod.label}</h4></div>
            </button>
          ))}
        </div>

        <div className="flex-1"></div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <img src="logo.png" alt="Logo MPBT" className="h-32 object-contain opacity-90 hover:opacity-100 transition-opacity" onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="w-full flex justify-between items-end border-t border-slate-200 pt-3">
            <p className="text-xs font-medium text-slate-500">Solution développée par <span className="font-bold text-slate-700">@mazemasse</span> - 2026</p>
            {peutAccederParametres && (
              <button onClick={() => setActiveModule('parametres')} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition shadow-md" title="Paramètres de l'application">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Paramètres
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}