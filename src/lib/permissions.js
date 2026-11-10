// src/lib/permissions.js

export const estAdmin = (user) => user?.nom === 'MASSE NDOYE';
export const estDirecteur = (user) => user?.role === 'Directeur Commercial';
export const estChefDeDivision = (user) => user?.role === 'Chef de Division Commerciale';
export const estAgent = (user) => user?.role === 'Agent Commercial';

// 1. Droits sur les Produits (Modification / Création)
export const peutModifierProduits = (user) => {
  return estAdmin(user) || estDirecteur(user);
};

// 2. Droits sur les Factures (Suppression)
export const peutSupprimerFacture = (user) => {
  return estAdmin(user); // Seul Masse Ndoye peut supprimer
};

// 3. Droits sur les Utilisateurs (Création / Modification)
export const peutCreerUtilisateur = (user) => {
  return estAdmin(user) || estDirecteur(user);
};

export const peutModifierCetUtilisateur = (currentUser, targetUser) => {
  if (estAdmin(currentUser)) return true; // Masse peut tout faire
  if (targetUser?.nom === 'MASSE NDOYE') return false; // Personne ne touche à Masse
  if (estDirecteur(currentUser)) return true; // Wilane peut modifier les autres (Malado, Maimouna)
  return false;
};

// 4. Droits sur les Paramètres (Accès au module)
export const peutAccederParametres = (user) => {
  return estAdmin(user);
};