import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MonProfil({ currentUser }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- ÉTATS POUR LE CODE PIN ---
  const [currentPin, setCurrentPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false); // Masqué par défaut
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false); // Pour le nouveau PIN
  
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

  // --- CHANGEMENT CODE PIN ---
  const handleUpdatePin = async (e) => {
    e.preventDefault();
    setErrorPin(''); setMessagePin('');
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) return setErrorPin('Le code PIN doit comporter exactement 6 chiffres.');

    setLoadingPin(true);
    const { error } = await supabase.from('utilisateurs').update({ code_pin: newPin }).eq('id', currentUser.id);
    if (error) setErrorPin("Erreur : " + error.message);
    else { 
      setMessagePin("Code PIN modifié avec succès."); 
      setCurrentPin(newPin); 
      setNewPin(''); 
    }
    setLoadingPin(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h2 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
        <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">👤</span>
        Mon Profil ({currentUser?.nom})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section Mot de Passe */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2">Changer le mot de passe</h3>
          <p className="text-sm text-slate-600">
            Pour des raisons de sécurité, un lien de réinitialisation sera envoyé à votre adresse email (<strong>{currentUser.email}</strong>).
          </p>
          <button 
            onClick={handleDemanderReset} 
            disabled={loading} 
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition disabled:bg-slate-400 flex items-center gap-2"
          >
            {loading ? 'Envoi en cours...' : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Recevoir le lien par email
              </>
            )}
          </button>
          {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-100">{error}</p>}
          {message && <p className="text-emerald-600 text-sm bg-emerald-50 p-2 rounded border border-emerald-100">{message}</p>}
        </div>

        {/* Formulaire Code PIN */}
        <form onSubmit={handleUpdatePin} className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2">Changer le code PIN (MFA)</h3>
          
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code PIN actuel</label>
            <div className="flex items-center gap-2">
              
              {/* Affichage de l'ancien code (Masqué par défaut) */}
              <div className="font-mono text-lg font-bold text-slate-800 tracking-widest flex-1">
                {showCurrentPin ? currentPin : '••••••'}
              </div>

              {/* Bouton Loupe pour révéler */}
              <button 
                type="button" 
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="text-slate-400 hover:text-emerald-600 transition"
                title={showCurrentPin ? "Masquer le code" : "Afficher le code"}
              >
                {showCurrentPin ? (
                  // Icône Masquer
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  // Icône Loupe / Œil pour Afficher
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nouveau code PIN (6 chiffres) *</label>
            <div className="relative">
              <input 
                type={showNewPin ? "text" : "password"} 
                maxLength="6" 
                value={newPin} 
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} 
                required 
                placeholder="Ex: 852456" 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10" 
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition"
              >
                {showNewPin ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          {errorPin && <p className="text-red-600 text-sm">{errorPin}</p>}
          {messagePin && <p className="text-emerald-600 text-sm font-bold">{messagePin}</p>}
          
          <button 
            type="submit" 
            disabled={loadingPin || newPin.length !== 6} 
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-lg transition w-full"
          >
            {loadingPin ? 'Modification...' : 'Mettre à jour le code PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}