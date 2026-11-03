import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MonProfil({ currentUser }) {
  // --- ÉTATS POUR TOUS LES CHAMPS ---
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger le code PIN actuel au montage
  useEffect(() => {
    const chargerPin = async () => {
      const { data } = await supabase.from('utilisateurs').select('code_pin').eq('id', currentUser.id).single();
      if (data) setCurrentPin(data.code_pin || '123456');
    };
    chargerPin();
  }, [currentUser.id]);

  // --- FONCTION UNIQUE DE VALIDATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');

    let actionEffectuee = false;

    // 1. Vérification et modification du mot de passe (si un nouveau est saisi)
    if (newPassword || confirmPassword || oldPassword) {
      if (!oldPassword) return setError('Veuillez saisir votre ancien mot de passe pour le modifier.');
      if (newPassword !== confirmPassword) return setError('Les nouveaux mots de passe ne correspondent pas.');
      if (newPassword.length < 6) return setError('Le mot de passe doit faire au moins 6 caractères.');

      setLoading(true);
      
      // On tente de mettre à jour directement. 
      // Si la session est valide, cela fonctionne.
      // Si Supabase renvoie une erreur, on l'affiche.
      const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });

      if (pwdError) {
        // Si l'erreur est "Auth session missing", on invite à se reconnecter
        if (pwdError.message.includes('session')) {
          setError("Session expirée. Veuillez vous déconnecter et vous reconnecter, puis réessayer.");
        } else {
          setError("Erreur mot de passe : " + pwdError.message);
        }
        setLoading(false);
        return;
      }
      actionEffectuee = true;
      // On vide les champs mot de passe
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    }

    // 2. Vérification et modification du code PIN (si un nouveau est saisi)
    if (newPin) {
      if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
        setError('Le code PIN doit comporter exactement 6 chiffres.');
        setLoading(false);
        return;
      }

      setLoading(true);
      const { error: pinError } = await supabase.from('utilisateurs').update({ code_pin: newPin }).eq('id', currentUser.id);
      
      if (pinError) {
        setError("Erreur code PIN : " + pinError.message);
        setLoading(false);
        return;
      }
      actionEffectuee = true;
      setCurrentPin(newPin);
      setNewPin('');
    }

    setLoading(false);

    if (actionEffectuee) {
      setMessage("Modifications enregistrées avec succès.");
      // On efface le message après 3 secondes
      setTimeout(() => setMessage(''), 3000);
    } else {
      setError("Veuillez remplir au moins un champ pour modifier.");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h2 className="text-lg font-extrabold text-slate-800 mb-4">Mon Profil ({currentUser?.nom})</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION MOT DE PASSE */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-3">Changer le mot de passe</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Ancien mot de passe</label>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nouveau mot de passe</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Confirmer</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" placeholder="••••••••" />
            </div>
          </div>
        </div>

        {/* SECTION CODE PIN */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-3">Changer le code PIN (MFA)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Code PIN actuel</label>
              <input type="text" value={currentPin} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-mono text-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Nouveau code PIN (6 chiffres)</label>
              <input type="text" maxLength="6" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono" placeholder="Ex: 852456" />
            </div>
          </div>
        </div>

        {/* MESSAGES */}
        {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-2 rounded border border-red-200">{error}</p>}
        {message && <p className="text-emerald-600 text-sm font-medium bg-emerald-50 p-2 rounded border border-emerald-200">{message}</p>}

        {/* BOUTON UNIQUE */}
        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading} 
            className="px-8 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition disabled:bg-slate-400 shadow-md"
          >
            {loading ? 'Enregistrement...' : 'Valider les modifications'}
          </button>
        </div>

      </form>
    </div>
  );
}