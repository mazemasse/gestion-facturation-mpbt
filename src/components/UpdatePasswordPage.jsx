import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // On vérifie que l'utilisateur a bien une session active (via le lien email)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Lien invalide ou expiré. Veuillez demander un nouveau lien depuis votre profil.");
      }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');

    if (password !== confirmPassword) {
      return setError('Les mots de passe ne correspondent pas.');
    }
    if (password.length < 6) {
      return setError('Le mot de passe doit faire au moins 6 caractères.');
    }

    setLoading(true);

    // Ici, la session est valide car elle vient du lien email
    const { error: updateError } = await supabase.auth.updateUser({ password: password });

    if (updateError) {
      setError("Erreur : " + updateError.message);
    } else {
      setMessage("Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.");
      setPassword(''); setConfirmPassword('');
      // Optionnel : rediriger vers le login après 3 secondes
      setTimeout(() => { window.location.href = '/'; }, 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-emerald-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Nouveau mot de passe</h2>
        
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nouveau mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Confirmer le mot de passe</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg" />
          </div>
          
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-emerald-600 text-sm">{message}</p>}

          <button type="submit" disabled={loading} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition disabled:bg-slate-400">
            {loading ? 'Modification...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}