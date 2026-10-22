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

// Compteurs simulés pour la numérotation
export const getNextNumero = (type) => {
  const annee = new Date().getFullYear();
  // Dans une vraie application, on lirait la dernière ligne de la base de données
  // Ici, on simule avec une variable locale ou localStorage
  let dernierNum = parseInt(localStorage.getItem(`dernierNum_${type}`) || '0');
  let nouveauNum = dernierNum + 1;
  localStorage.setItem(`dernierNum_${type}`, nouveauNum);
  
  const prefixe = type === 'Facture' ? 'F' : 'D';
  return `${prefixe}-${annee}-${String(nouveauNum).padStart(4, '0')}`;
};