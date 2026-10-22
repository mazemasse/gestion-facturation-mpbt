import { useState, useEffect } from 'react';
import { COMPANY_DATA } from '../data/companyData';

export default function ParametresPage() {
  // On charge les données depuis le localStorage si elles existent, sinon depuis le fichier par défaut
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('mpbt_company_data');
    return saved ? JSON.parse(saved) : COMPANY_DATA;
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // On sauvegarde dans le localStorage
    localStorage.setItem('mpbt_company_data', JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000); // Le message disparaît après 3s
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-800 mb-6">Informations de l'entreprise</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nom de l'entreprise</label>
              <input type="text" name="nom" value={data.nom} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Sigle (ex: MPBT)</label>
              <input type="text" name="sigle" value={data.sigle} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Adresse complète</label>
              <input type="text" name="adresse" value={data.adresse} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Téléphone(s)</label>
              <input type="text" name="telephone" value={data.telephone} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input type="email" name="email" value={data.email} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Site Web</label>
              <input type="text" name="siteWeb" value={data.siteWeb} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Slogan</label>
              <input type="text" name="slogan" value={data.slogan} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Informations légales & Bancaires</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">NINEA</label>
                <input type="text" name="ninea" value={data.ninea} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Registre de Commerce (RC)</label>
                <input type="text" name="rc" value={data.rc} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Banque</label>
                <input type="text" name="banque" value={data.banque} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Numéro de compte</label>
                <input type="text" name="compteBancaire" value={data.compteBancaire} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <label className="block text-sm font-bold text-slate-700 mb-1">Chemin du Logo</label>
            <p className="text-xs text-slate-500 mb-2">Placez votre fichier image (ex: logo.png) dans le dossier <code className="bg-slate-100 px-1 rounded">public/</code> de votre projet, puis indiquez son nom ici.</p>
            <input type="text" name="logo" value={data.logo} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-base" />
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition shadow-md">
              Enregistrer les modifications
            </button>
            {saved && (
              <span className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Modifications enregistrées !
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
