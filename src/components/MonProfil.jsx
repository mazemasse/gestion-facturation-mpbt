import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MonProfil({ currentUser }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ÉTATS POUR LE CODE PIN ---
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [messagePin, setMessagePin] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);

  useEffect(() => {
    const chargerPin = async () => {
      const { data } = await supabase.from('utilisateurs').select('code_pin').eq('id', currentUser.id).single();
      if (data) setCurrentPin(data.code_pin || '123456');
    };
    chargerPin();
  }, [currentUser.id]);

  // --- DEMANDER LA RÉINITIALISATION DU MOT DE PASSE ---
  const handleDemanderReset = async () => {
    setError(''); setMessage('');
    setLoading(true);

    // On redirige vers la page /update-password de l'application
    const { error } = await supabase.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError("Erreur : " + error.message);
    } else {
      setMessage("Un email de réinitialisation a été envoyé à " + currentUser.email + ". Vérifiez votre boîte de réception (et vos spams).");
    }
    setLoading(false);
  };

  // --- CHANGEMENT CODE PIN (Inchangé) ---
  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setErrorPin(''); setMessagePin('');
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) return setErrorPin('Le code PIN doit comporter exactement 6 chiffres.');

    setLoadingPin(true);
    const { error } = await supabase.from('utilisateurs').update({ code_pin: newPin }).eq('id', currentUser.id);
    if (error) setErrorPin("Erreur : " + error.message);
    else { setMessagePin("Code PIN modifié avec succès."); setCurrentPin(newPin); setNewPin(''); }
    setLoadingPin(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h2 className="text-lg font-extrabold text-slate-800 mb-4">Mon Profil ({currentUser?.nom})</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section Mot de Passe (Envoi d'email) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2">Changer le mot de passe</h3>
          <p className="text-sm text-slate-600">
            Pour des raisons de sécurité, un lien de réinitialisation sera envoyé à votre adresse email.
          </p>
          <button 
            onClick={handleDemanderReset} 
            disabled={loading} 
            className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition disabled:bg-slate-400"
          >
            {loading ? 'Envoi en cours...' : 'Recevoir le lien par email'}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-600 text-sm">{message}</p>}
        </div>

        {/* Formulaire Code PIN */}
        <form onSubmit={handleUpdatePin} className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2">Changer le code PIN (MFA)</h3>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Code PIN actuel</label>
            <input type="text" value={currentPin} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nouveau code PIN (6 chiffres) *</label>
            <input type="text" maxLength="6" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} required placeholder="Ex: 852456" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono" />
          </div>
          {errorPin && <p className="text-red-600 text-sm">{errorPin}</p>}
          {messagePin && <p className="text-emerald-600 text-sm">{messagePin}</p>}
          <button type="submit" disabled={loadingPin} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:bg-slate-400">
            {loadingPin ? 'Modification...' : 'Changer le code PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}