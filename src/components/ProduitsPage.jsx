import { useState } from 'react';
import { PRODUITS } from '../data/mockData';

const CATEGORIES_DEFAUT = ['Restauration', 'Espaces publicitaires', 'Salles de rencontre', 'Chambres'];
const UNITES_DEFAUT = ['Unité', 'Forfait', 'Jour', 'Nuitée', 'Pers.'];

export default function ProduitsPage() {
  const [produits, setProduits] = useState(PRODUITS);
  const [showForm, setShowForm] = useState(false);
  const [recherche, setRecherche] = useState('');

  const [categories, setCategories] = useState(CATEGORIES_DEFAUT);
  const [unites, setUnites] = useState(UNITES_DEFAUT);
  
  const [nouvelleCategorie, setNouvelleCategorie] = useState('');
  const [nouvelleUnite, setNouvelleUnite] = useState('');
  const [showInputCategorie, setShowInputCategorie] = useState(false);
  const [showInputUnite, setShowInputUnite] = useState(false);

  const [nouveauProduit, setNouveauProduit] = useState({
    designation: '', categorie: CATEGORIES_DEFAUT[0], prixUnitaire: '', unite: UNITES_DEFAUT[0]
  });

  const ajouterCategorie = () => {
    if (nouvelleCategorie.trim() && !categories.includes(nouvelleCategorie.trim())) {
      setCategories([...categories, nouvelleCategorie.trim()]);
      setNouveauProduit({ ...nouveauProduit, categorie: nouvelleCategorie.trim() });
      setNouvelleCategorie('');
      setShowInputCategorie(false);
    }
  };

  const supprimerCategorie = (cat) => {
    if (window.confirm(`Supprimer la catégorie "${cat}" ?`)) {
      setCategories(categories.filter(c => c !== cat));
      if (nouveauProduit.categorie === cat) setNouveauProduit({ ...nouveauProduit, categorie: categories[0] });
    }
  };

  const ajouterUnite = () => {
    if (nouvelleUnite.trim() && !unites.includes(nouvelleUnite.trim())) {
      setUnites([...unites, nouvelleUnite.trim()]);
      setNouveauProduit({ ...nouveauProduit, unite: nouvelleUnite.trim() });
      setNouvelleUnite('');
      setShowInputUnite(false);
    }
  };

  const supprimerUnite = (uni) => {
    if (window.confirm(`Supprimer l'unité "${uni}" ?`)) {
      setUnites(unites.filter(u => u !== uni));
      if (nouveauProduit.unite === uni) setNouveauProduit({ ...nouveauProduit, unite: unites[0] });
    }
  };

  const handleAjouter = (e) => {
    e.preventDefault();
    const nouvelId = `PR-${String(produits.length + 1).padStart(4, '0')}-MPBT`;
    setProduits([...produits, { ...nouveauProduit, id: nouvelId, prixUnitaire: Number(nouveauProduit.prixUnitaire) }]);
    setNouveauProduit({ designation: '', categorie: categories[0], prixUnitaire: '', unite: unites[0] });
    setShowForm(false);
  };

  const supprimerProduit = (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce produit ?")) setProduits(produits.filter(p => p.id !== id));
  };

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');

  const produitsFiltres = produits.filter(p => 
    p.designation.toLowerCase().includes(recherche.toLowerCase()) ||
    p.categorie.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative w-80">
          <input 
            type="text" 
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <svg className="w-5 h-5 text-slate-500 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-base font-bold rounded-lg transition shadow-md"
        >
          {showForm ? 'Fermer' : '+ Nouveau Produit'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAjouter} className="bg-white p-5 rounded-xl shadow-md border-2 border-purple-200">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Désignation *</label>
              <input required placeholder="Ex: Panneau d'affichage" value={nouveauProduit.designation} onChange={e => setNouveauProduit({...nouveauProduit, designation: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="md:col-span-3">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-bold text-slate-700">Catégorie</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowInputCategorie(!showInputCategorie)} className="text-sm text-purple-600 hover:text-purple-800 font-extrabold" title="Nouvelle catégorie">+</button>
                  <button type="button" onClick={() => supprimerCategorie(nouveauProduit.categorie)} className="text-sm text-red-500 hover:text-red-700 font-extrabold" title="Supprimer cette catégorie">-</button>
                </div>
              </div>
              {showInputCategorie ? (
                <div className="flex gap-2">
                  <input value={nouvelleCategorie} onChange={e => setNouvelleCategorie(e.target.value)} placeholder="Nouvelle..." className="w-full px-2 py-2 bg-slate-50 border border-purple-300 rounded-lg text-base" autoFocus />
                  <button type="button" onClick={ajouterCategorie} className="px-3 bg-purple-600 text-white rounded-lg text-sm font-bold">OK</button>
                </div>
              ) : (
                <select value={nouveauProduit.categorie} onChange={e => setNouveauProduit({...nouveauProduit, categorie: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-purple-500">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-bold text-slate-700">Unité</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowInputUnite(!showInputUnite)} className="text-sm text-purple-600 hover:text-purple-800 font-extrabold" title="Nouvelle unité">+</button>
                  <button type="button" onClick={() => supprimerUnite(nouveauProduit.unite)} className="text-sm text-red-500 hover:text-red-700 font-extrabold" title="Supprimer cette unité">-</button>
                </div>
              </div>
              {showInputUnite ? (
                <div className="flex gap-2">
                  <input value={nouvelleUnite} onChange={e => setNouvelleUnite(e.target.value)} placeholder="Nouvelle..." className="w-full px-2 py-2 bg-slate-50 border border-purple-300 rounded-lg text-base" autoFocus />
                  <button type="button" onClick={ajouterUnite} className="px-3 bg-purple-600 text-white rounded-lg text-sm font-bold">OK</button>
                </div>
              ) : (
                <select value={nouveauProduit.unite} onChange={e => setNouveauProduit({...nouveauProduit, unite: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-purple-500">
                  {unites.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Prix (FCFA) *</label>
              <input required type="number" min="0" placeholder="150000" value={nouveauProduit.prixUnitaire} onChange={e => setNouveauProduit({...nouveauProduit, prixUnitaire: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-base text-slate-800 focus:ring-2 focus:ring-purple-500" />
            </div>

            <div className="md:col-span-1">
              <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-base rounded-lg transition shadow-md" title="Enregistrer">✓</button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-100 text-slate-800 border-b-2 border-slate-300 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-4 py-4 font-extrabold">Code</th>
              <th className="px-4 py-4 font-extrabold">Désignation</th>
              <th className="px-4 py-4 font-extrabold">Catégorie</th>
              <th className="px-4 py-4 font-extrabold text-center">Unité</th>
              <th className="px-4 py-4 font-extrabold text-right">Prix Unitaire</th>
              <th className="px-4 py-4 font-extrabold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {produitsFiltres.map(produit => (
              <tr key={produit.id} className="hover:bg-purple-50 transition-colors">
                {/* CODE CORRIGÉ POUR LA LISIBILITÉ */}
                <td className="px-4 py-4 text-base text-slate-700 font-medium">
                  <span className="bg-slate-100 px-2 py-1 rounded-md font-semibold">{produit.id}</span>
                </td>
                <td className="px-4 py-4 font-bold text-slate-900 text-base">{produit.designation}</td>
                <td className="px-4 py-4 text-slate-700 text-base">
                  <span className="bg-slate-100 px-2 py-1 rounded-md text-sm font-semibold">{produit.categorie}</span>
                </td>
                <td className="px-4 py-4 text-center text-slate-700 text-base font-medium">{produit.unite}</td>
                <td className="px-4 py-4 text-right font-bold text-purple-700 text-base">{formatMonnaie(produit.prixUnitaire)}</td>
                <td className="px-4 py-4 text-right">
                  <button onClick={() => supprimerProduit(produit.id)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition" title="Supprimer">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {produitsFiltres.length === 0 && (
          <p className="p-8 text-center text-slate-500 text-base">Aucun produit trouvé.</p>
        )}
      </div>
    </div>
  );
}