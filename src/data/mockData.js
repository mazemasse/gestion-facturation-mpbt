import { supabase } from '../lib/supabaseClient'; // Assurez-vous que le chemin vers supabaseClient est correct

export const CLIENTS = [
  { id: 'CL-0001-MPBT', nom: 'MINISTÈRE DE LA COMMUNICATION', contact: 'M. Diop', tel: '+221 77 123 45 67', adresse: 'Dakar Plateau' },
  { id: 'CL-0002-MPBT', nom: 'SENEGAL TELECOM', contact: 'Mme Fall', tel: '+221 33 800 00 00', adresse: 'Route du Service Géographique' },
  { id: 'CL-0003-MPBT', nom: 'RTS (RADIO TELEVISION SENEGALAISE)', contact: 'M. Ndiaye', tel: '+221 33 800 00 00', adresse: 'Avenue Bourguiba' },
  { id: 'CL-0004-MPBT', nom: 'PRESSE NATIONALE', contact: 'M. Sarr', tel: '+221 33 800 00 00', adresse: 'Dakar' },
];

export const PRODUITS = [
  { id: 'PR-0001-MPBT', designation: 'Pause-café', categorie: 'Restauration', prixUnitaire: 5000, unite: 'Pers.' },
  { id: 'PR-0002-MPBT', designation: 'Déjeuner VIP', categorie: 'Restauration', prixUnitaire: 25000, unite: 'Pers.' },
  { id: 'PR-0003-MPBT', designation: 'Panneau d\'affichage', categorie: 'Espaces publicitaires', prixUnitaire: 150000, unite: 'Forfait' },
  { id: 'PR-0004-MPBT', designation: 'Façade murale', categorie: 'Espaces publicitaires', prixUnitaire: 250000, unite: 'Forfait' },
  { id: 'PR-0005-MPBT', designation: 'Salle de conférence', categorie: 'Salles de rencontre', prixUnitaire: 100000, unite: 'Jour' },
  { id: 'PR-0006-MPBT', designation: 'Auditorium', categorie: 'Salles de rencontre', prixUnitaire: 300000, unite: 'Jour' },
  { id: 'PR-0007-MPBT', designation: 'Chambre VIP Double', categorie: 'Chambres', prixUnitaire: 45000, unite: 'Nuitée' },
];

// --- NOUVELLE FONCTION DE NUMÉROTATION BASÉE SUR SUPABASE ---
export const getNextNumero = async (type) => {
  const annee = new Date().getFullYear();
  const prefixe = type === 'Facture' ? 'F' : 'D';
  
  // On interroge Supabase pour trouver tous les numéros de l'année en cours
  const { data, error } = await supabase
    .from('factures')
    .select('numero')
    .like('numero', `${prefixe}-${annee}-%`);

  if (error) {
    console.error("Erreur lors de la récupération du numéro:", error);
    return `${prefixe}-${annee}-0001`; // En cas d'erreur, on repart à 1
  }

  let maxNum = 0;
  if (data && data.length > 0) {
    data.forEach(item => {
      // On extrait la partie numérique (ex: F-2026-0015 -> 15)
      const parts = item.numero.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
  }

  // On incrémente et on formate sur 4 chiffres
  const prochainNum = maxNum + 1;
  return `${prefixe}-${annee}-${String(prochainNum).padStart(4, '0')}`;
};