import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MFA({ user, onVerify, onCancel }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validPin, setValidPin] = useState('123456'); 
  
  // NOUVEAU : État pour afficher ou masquer le code
  const [showCode, setShowCode] = useState(false);

  const inputsRef = useRef([]);

  // --- CHARGEMENT DU VRAI CODE PIN DEPUIS SUPABASE ---
  useEffect(() => {
    const chargerPin = async () => {
      const { data } = await supabase
        .from('utilisateurs')
        .select('code_pin')
        .eq('id', user.id)
        .single();
      
      if (data && data.code_pin) {
        setValidPin(data.code_pin);
      }
    };
    chargerPin();
  }, [user.id]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputsRef.current[5]?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const enteredCode = code.join('');

    if (enteredCode.length !== 6) {
      setError('Veuillez saisir les 6 chiffres du code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (enteredCode === validPin) {
        onVerify();
      } else {
        setError('Code PIN invalide. Veuillez réessayer.');
        setCode(['', '', '', '', '', '']);
        inputsRef.current[0]?.focus();
      }
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-emerald-900/5 p-8 border border-emerald-100">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Vérification en deux étapes</h2>
            <p className="text-slate-500 text-sm mt-2">
              Saisissez votre code PIN à 6 chiffres
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* LES 6 CASES DU CODE PIN */}
            <div className="relative">
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputsRef.current[index] = el)}
                    type={showCode ? 'text' : 'password'} // NOUVEAU : Masqué par défaut
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              
              {/* BOUTON POUR AFFICHER / MASQUER LE CODE */}
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute -right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition p-2 bg-white rounded-full shadow-sm border border-slate-200"
                title={showCode ? "Masquer le code" : "Afficher le code"}
              >
                {showCode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Vérification...' : 'Valider le code'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition"
              >
                ← Retour à la connexion
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-slate-400 text-[11px] text-center">
              Si vous avez oublié votre code PIN, contactez votre administrateur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}