import { useState } from 'react';
import Login from './components/Login';
import MFA from './components/MFA';
import Dashboard from './components/Dashboard';

export default function App() {
  const [step, setStep] = useState('login'); // 'login' | 'mfa' | 'app'
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setStep('mfa');
  };

  const handleMFAVerify = () => {
    setStep('app');
  };

  const handleMFACancel = () => {
    setCurrentUser(null);
    setStep('login');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setStep('login');
  };

  // Écran de connexion
  if (step === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Écran MFA (Double authentification)
  if (step === 'mfa') {
    return <MFA user={currentUser} onVerify={handleMFAVerify} onCancel={handleMFACancel} />;
  }

  // Écran principal (Dashboard)
  return <Dashboard user={currentUser} onLogout={handleLogout} />;
}