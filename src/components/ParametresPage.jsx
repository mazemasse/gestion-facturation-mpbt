import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { COMPANY_DATA } from '../data/companyData';

export default function ParametresPage() {
  const [data, setData] = useState(COMPANY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  // États pour l'upload du logo
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  // --- CHARGEMENT DES DONNÉES DEPUIS SUPABASE ---
  useEffect(() => {
    const chargerParametres = async () => {
      const { data: paramData, error } = await supabase
        .from('parametres')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        console.error("Erreur chargement paramètres:", error);
      } else if (paramData) {
        setData({
          nom: paramData.nom,
          sigle: paramData.sigle,
          adresse: paramData.adresse,
          telephone: paramData.telephone,
          email: paramData.email,
          siteWeb: paramData.site_web,
          ninea: paramData.ninea,
          rc: paramData.rc,
          banque: paramData.banque,
          compteBancaire: paramData.compte_bancaire,
          logo: paramData.logo,
          slogan: paramData.slogan
        });
      }
      setIsLoading(false);
    };
    chargerParametres();
  }, []);

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setSaved(false);
  };

  // --- UPLOAD DU LOGO VERS SUPABASE STORAGE ---
  const handleLogoUpload = async (event) => {
    try {
      setUploadingLogo(true);
      const file = event.target.files[0];
      if (!file) return;

      // Vérification du type de fichier
      if (!file.type.startsWith('image/')) {
        alert("Veuillez sélectionner une image (PNG, JPG, etc.).");
        return;
      }

      // 1. Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Uploader le fichier dans le bucket "logos"
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 3. Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      // 4. Mettre à jour l'état avec la nouvelle URL
      setData({ ...data, logo: urlData.publicUrl });
      
      // Notification visuelle
      setSaved(false);
      alert("Logo téléchargé avec succès ! N'oubliez pas d'enregistrer les modifications.");

    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'upload du logo : " + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    const { error } = await supabase
      .from('parametres')
      .update({
        nom: data.nom,
        sigle: data.sigle,
        adresse: data.adresse,
        telephone: data.telephone,
        email: data.email,
        site_web: data.siteWeb,
        ninea: data.ninea,
        rc: data.rc,
        banque: data.banque,
        compte_bancaire: data.compteBancaire,
        logo: data.logo,
        slogan: data.slogan
      })
      .eq('id', 1);

    if (error) {
      alert("Erreur de sauvegarde : " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Chargement des paramètres...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
        
        {/* SECTION LOGO (INTERACTIVE) */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-4">Logo de l'entreprise</h2>
          <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="w-24 h-24 bg-white rounded-lg border border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
              {data.logo ? (
                <img src={data.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-slate-400 text-xs font-bold">Aucun logo</span>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-2">Format conseillé : PNG ou JPG carré (ex: 500x500px).</p>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef}
                onChange={handleLogoUpload}
                className="hidden" 
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition disabled:bg-slate-400 flex items-center gap-2"
              >
                {uploadingLogo ? 'Téléchargement...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    Changer le logo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* INFORMATIONS GÉNÉRALES */}
        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-extrabold text-slate-800 mb-4">Informations de l'entreprise</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nom de l'entreprise</label>
              <input type="text" name="nom" value={data.nom} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Sigle (ex: MPBT)</label>
              <input type="text" name="sigle" value={data.sigle} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Adresse complète</label>
              <input type="text" name="adresse" value={data.adresse} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Téléphone(s)</label>
              <input type="text" name="telephone" value={data.telephone} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input type="email" name="email" value={data.email} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Site Web</label>
              <input type="text" name="siteWeb" value={data.siteWeb} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Slogan</label>
              <input type="text" name="slogan" value={data.slogan} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* INFORMATIONS LÉGALES */}
        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-extrabold text-slate-800 mb-4">Informations légales & Bancaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">NINEA</label>
              <input type="text" name="ninea" value={data.ninea} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Registre de Commerce (RC)</label>
              <input type="text" name="rc" value={data.rc} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Banque</label>
              <input type="text" name="banque" value={data.banque} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Numéro de compte</label>
              <input type="text" name="compteBancaire" value={data.compteBancaire} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        {/* BOUTON ENREGISTRER */}
        <div className="border-t border-slate-200 pt-6 flex items-center gap-4">
          <button 
            type="submit" 
            disabled={isSaving || uploadingLogo} 
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold rounded-lg transition shadow-md flex items-center gap-2"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
          
          {saved && (
            <span className="text-emerald-600 font-bold text-sm flex items-center gap-1 animate-slide-in">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Modifications enregistrées !
            </span>
          )}
        </div>
      </form>
    </div>
  );
}