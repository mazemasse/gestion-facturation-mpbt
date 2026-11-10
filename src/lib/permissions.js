// src/lib/permissions.js

export const estAdmin = (user) => user?.nom === 'MASSE NDOYE';
export const estDirecteur = (user) => user?.role === 'Directeur Commercial';
export const estChefDeService = (user) => user?.role === 'Chef de service Commercial';
export const estAgent = (user) => user?.role === 'Agent commercial';

// 1. Droits sur les Produits (Modification / Création)
// Seuls l'Admin et le Directeur peuvent modifier
export const peutModifierProduits = (user) => {
  return estAdmin(user) || estDirecteur(user);
};

// 2. Droits sur les Factures (Suppression)
// Seul Masse Ndoye peut supprimer
export const peutSupprimerFacture = (user) => {
  return estAdmin(user); 
};

// 3. Droits sur les Utilisateurs (Création / Modification)
// Admin et Directeur peuvent gérer les autres utilisateurs
export const peutGererUtilisateurs = (user) => {
  return estAdmin(user) || estDirecteur(user);
};

export const peutModifierCetUtilisateur = (currentUser, targetUser) => {
  if (estAdmin(currentUser)) return true; 
  if (targetUser?.nom === 'MASSE NDOYE') return false; // Personne ne touche à Masse
  if (estDirecteur(currentUser)) return true; 
  return false;
};

// 4. Droits sur les Paramètres (Accès au bouton)
export const peutAccederParametres = (user) => {
  return estAdmin(user);
};