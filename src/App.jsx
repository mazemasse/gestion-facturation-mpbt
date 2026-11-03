import { useState, useEffect } from 'react';
import Login from './components/Login';
import MFA from './components/MFA';
import Dashboard from './components/Dashboard';
import UpdatePasswordPage from './components/UpdatePasswordPage'; // <-- IMPORT
import { supabase } from './lib/supabaseClient';

export default function App() {
  const [step, setStep] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);

  // Vérifier la session au chargement
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: userData } = await supabase.from('utilisateurs').select('*').eq('id', session.user.id).single();
        if (userData) {
          setCurrentUser({ id: userData.id, nom: userData.nom, role: userData.role });
          setStep('app');
        }
      }
    };
    checkSession();
  }, []);

  // --- NOUVELLE ROUTE POUR LA MISE À JOUR DU MOT DE PASSE ---
  if (window.location.pathname === '/update-password') {
    return <UpdatePasswordPage />;
  }

  const handleLoginSuccess = (user) => { setCurrentUser(user); setStep('mfa'); };
  const handleMFAVerify = () => setStep('app');
  const handleMFACancel = () => { setCurrentUser(null); setStep('login'); };
  const handleLogout = async () => { await supabase.auth.signOut(); setCurrentUser(null); setStep('login'); };

  if (step === 'login') return <Login onLoginSuccess={handleLoginSuccess} />;
  if (step === 'mfa') return <MFA user={currentUser} onVerify={handleMFAVerify} onCancel={handleMFACancel} />;
  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}