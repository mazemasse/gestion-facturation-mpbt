// Données par défaut
const DEFAUT = {
  nom: "Maison de la Presse Babacar Touré",
  sigle: "MPBT",
  adresse: "Sacré-Cœur 3, Dakar, Sénégal",
  telephone: "+221 33 859 00 00 / +221 77 123 45 67",
  email: "contact@mpbt.sn",
  siteWeb: "www.mpbt.sn",
  ninea: "005 123 456 7",
  rc: "SN-DKR-2026-A-123",
  banque: "CBAO",
  compteBancaire: "001 234 56789 00",
  logo: "/logo.png",
  slogan: "L'information au cœur de vos ambitions"
};

// On vérifie s'il y a des données sauvegardées dans le navigateur
const saved = localStorage.getItem('mpbt_company_data');

// On exporte soit les données sauvegardées, soit les données par défaut
export const COMPANY_DATA = saved ? JSON.parse(saved) : DEFAUT;