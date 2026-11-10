// src/lib/categories.js
export const CATEGORIES_OFFICIELLES = [
  'Restauration',
  'Espaces publicitaires',
  'Chambres',
  'Salles de rencontre'
];

// Fonction pour savoir si une catégorie correspond aux espaces (Chambres ou Salles)
export const estUneCategorieEspace = (categorie) => {
  return categorie === 'Chambres' || categorie === 'Salles de rencontre';
};