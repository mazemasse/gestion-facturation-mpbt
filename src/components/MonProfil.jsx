import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MonProfil({ currentUser, onUpdatePhoto }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // --- ÉTATS POUR LA PHOTO ---
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photo_url || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // --- ÉTATS POUR LE MOT DE PASSE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

  // --- ÉTATS POUR LE CODE PIN ---
  const [currentPin, setCurrentPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [messagePin, setMessagePin] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);

  // Charger le PIN actuel
  useEffect(() => {
    const chargerPin = async () => {
      const { data } = await supabase.from('utilisateurs').select('code_pin, photo_url').eq('id', currentUser.id).single();
      if (data) {
        setCurrentPin(data.code_pin || '123456');
        if (data.photo_url) setPhotoUrl(data.photo_url);
      }
    };
    chargerPin();
  }, [currentUser.id]);

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setMessage(''); }
    else { setMessage(msg); setError(''); }
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  // --- 1. GESTION DE LA PHOTO (Base64) ---
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return flash("Veuillez choisir une image.", true);
    if (file.size > 2 * 1024 * 1024) return flash("L'image ne doit pas dépasser 2 Mo.", true);

    setUploadingPhoto(true);
    const reader = new FileReader();
    
    reader.onload = async () => {
      const base64Image = reader.result;
      
      const { error } = await supabase
        .from('utilisateurs')
        .update({ photo_url: base64Image })
        .eq('id', currentUser.id);

      if (error) {
        flash("Erreur lors de l'enregistrement de la photo.", true);
      } else {
        setPhotoUrl(base64Image);
        if (onUpdatePhoto) onUpdatePhoto(base64Image); // Rafraîchit la photo dans le header
        flash("Photo de profil mise à jour avec succès !");
      }
      setUploadingPhoto(false);
    };
    
    reader.readAsDataURL(file);
  };

  // --- 2. CHANGEMENT DU MOT DE PASSE (Direct) ---
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    
    if (newPassword !== confirmPassword) return flash("Les mots de passe ne correspondent pas.", true);
    if (newPassword.length < 6) return flash("Le mot de passe doit faire au moins 6 caractères.", true);

    setLoadingPwd(true);
    try {
      // On vérifie d'abord que l'ancien mot de passe est correct
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPassword,
      });

      if (signInError) throw new Error("Mot de passe actuel incorrect.");

      // On met à jour avec le nouveau
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      flash("Mot de passe modifié avec succès.");
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      flash(err.message, true);
    } finally {
      setLoadingPwd(false);
    }
  };

  // --- 3. CHANGEMENT CODE PIN ---
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
      
      {message && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-lg">{message}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-lg">{error}</div>}

      <h2 className="text-lg font-extrabold text-slate-800 mb-6 flex items-center gap-2">
        <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">👤</span>
        Mon Profil ({currentUser?.nom})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* COLONNE GAUCHE : PHOTO & MOT DE PASSE */}
        <div className="space-y-6">
          
          {/* Section Photo */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-4">Ma Photo de Profil</h3>
            <div className="flex items-center gap-5">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-slate-100 shadow-md">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Profil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-white font-bold text-2xl">
                      {currentUser?.nom.charAt(0)}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-full shadow-lg transition"
                  title="Changer la photo"
                >
                  {uploadingPhoto ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  )}
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Changer ma photo</p>
                <p className="text-xs text-slate-500 mt-1">Format JPG ou PNG (max 2 Mo).</p>
              </div>
            </div>
          </div>

          {/* Section Mot de Passe */}
          <form onSubmit={handleUpdatePassword} className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2 mb-4">Changer le mot de passe</h3>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Mot de passe actuel</label>
              <input 
                type="password" 
                required 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nouveau mot de passe (6 car. min)</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 pr-10" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? 'Masquer' : 'Voir'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Confirmer le mot de passe</label>
              <input 
                type="password" 
                required 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" 
              />
            </div>

            <button type="submit" disabled={loadingPwd} className="w-full px-6 py-2.5 mt-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition disabled:bg-slate-400">
              {loadingPwd ? 'Modification...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        </div>

        {/* COLONNE DROITE : CODE PIN */}
        <form onSubmit={handleUpdatePin} className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase border-b pb-2">Changer le code PIN (MFA)</h3>
          
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code PIN actuel</label>
            <div className="flex items-center gap-2">
              <div className="font-mono text-lg font-bold text-slate-800 tracking-widest flex-1">
                {showCurrentPin ? currentPin : '••••••'}
              </div>
              <button 
                type="button" 
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="text-slate-400 hover:text-emerald-600 transition"
              >
                {showCurrentPin ? 'Masquer' : 'Voir'}
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-16" 
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition text-sm font-bold"
              >
                {showNewPin ? 'Masquer' : 'Voir'}
              </button>
            </div>
          </div>

          {errorPin && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{errorPin}</p>}
          {messagePin && <p className="text-emerald-600 text-sm font-bold bg-emerald-50 p-2 rounded">{messagePin}</p>}
          
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