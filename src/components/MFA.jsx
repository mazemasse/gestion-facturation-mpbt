import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function MFA({ user, onVerify, onCancel }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validPin, setValidPin] = useState('123456'); // Code par défaut en attendant le chargement

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
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
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
            <p className="text-slate-400 text-xs text-center">
              💡 Code PIN par défaut : <span className="font-mono font-bold text-emerald-600">123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}