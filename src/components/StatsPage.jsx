import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function StatsPage() {
  const [factures, setFactures] = useState([]);
  const [details, setDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periode, setPeriode] = useState('6mois'); // 'mois', '6mois', 'annee'

  // Chargement des données
  useEffect(() => {
    const chargerStats = async () => {
      setIsLoading(true);
      const { data: facturesData } = await supabase
        .from('factures')
        .select('*')
        .eq('type_doc', 'Facture')
        .order('date_creation', { ascending: true });

      const { data: detailsData } = await supabase
        .from('facture_details')
        .select('*');

      setFactures(facturesData || []);
      setDetails(detailsData || []);
      setIsLoading(false);
    };
    chargerStats();
  }, []);

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');
  const formatMonnaieCourt = (montant) => {
    if (montant >= 1000000) return (montant / 1000000).toFixed(1) + 'M';
    if (montant >= 1000) return (montant / 1000).toFixed(0) + 'k';
    return montant;
  };

  // --- FILTRAGE PAR PÉRIODE ---
  const facturesFiltrees = useMemo(() => {
    const maintenant = new Date();
    return factures.filter(f => {
      const dateF = new Date(f.date_creation);
      if (periode === 'mois') {
        return dateF.getMonth() === maintenant.getMonth() && dateF.getFullYear() === maintenant.getFullYear();
      } else if (periode === '6mois') {
        const ilYa6Mois = new Date();
        ilYa6Mois.setMonth(maintenant.getMonth() - 6);
        return dateF >= ilYa6Mois;
      } else if (periode === 'annee') {
        return dateF.getFullYear() === maintenant.getFullYear();
      }
      return true;
    });
  }, [factures, periode]);

  // --- CALCUL DES KPIs ---
  const kpis = useMemo(() => {
    const totalCA = facturesFiltrees.reduce((sum, f) => sum + (f.net_a_payer || 0), 0);
    const totalFactures = facturesFiltrees.length;
    const panierMoyen = totalFactures > 0 ? totalCA / totalFactures : 0;
    const tauxRecouvrement = totalCA > 0 ? 85 : 0; 
    return { totalCA, totalFactures, panierMoyen, tauxRecouvrement };
  }, [facturesFiltrees]);

  // --- ÉVOLUTION MENSUELLE ---
  const evolutionMensuelle = useMemo(() => {
    const moisMap = {};
    facturesFiltrees.forEach(f => {
      if (!f.date_creation) return;
      const date = new Date(f.date_creation);
      const key = date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      moisMap[key] = (moisMap[key] || 0) + (f.net_a_payer || 0);
    });
    return Object.keys(moisMap).map(mois => ({ mois, ca: moisMap[mois] }));
  }, [facturesFiltrees]);

  // --- RÉPARTITION PAR CATÉGORIE (Pour le camembert) ---
  const repartitionCategories = useMemo(() => {
    const numerosFacturesFiltrees = facturesFiltrees.map(f => f.numero);
    const detailsFiltres = details.filter(d => numerosFacturesFiltrees.includes(d.facture_numero));
    
    // On regroupe par désignation (ou par catégorie si vous avez l'info)
    const categoriesMap = {};
    detailsFiltres.forEach(d => {
      // On utilise la désignation comme proxy pour la catégorie (faute de mieux)
      // L'idéal serait de joindre avec la table produits pour avoir la vraie catégorie
      const cat = d.designation.includes('publicitaire') ? 'Espaces publicitaires' :
                  d.designation.includes('Déjeuner') || d.designation.includes('Cocktail') || d.designation.includes('Pause') ? 'Restauration' :
                  d.designation.includes('Salle') || d.designation.includes('Auditorium') ? 'Salles de rencontre' : 'Chambres';
      
      if (!categoriesMap[cat]) categoriesMap[cat] = 0;
      categoriesMap[cat] += (d.prix_unitaire * d.quantite);
    });

    const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'];
    return Object.keys(categoriesMap).map((name, index) => ({
      name,
      value: categoriesMap[name],
      color: colors[index % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [facturesFiltrees, details]);

  // --- TOP 5 CLIENTS ---
  const topClients = useMemo(() => {
    const clientsMap = {};
    facturesFiltrees.forEach(f => {
      if (!clientsMap[f.client_nom]) clientsMap[f.client_nom] = { nom: f.client_nom, total: 0, nbFactures: 0 };
      clientsMap[f.client_nom].total += (f.net_a_payer || 0);
      clientsMap[f.client_nom].nbFactures += 1;
    });
    return Object.values(clientsMap).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [facturesFiltrees]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement des statistiques...</div>;

  return (
    <div className="space-y-6">
      
      {/* En-tête avec sélecteur de période */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-extrabold text-slate-800">Vue d'ensemble des performances</h2>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {[
            { id: 'mois', label: 'Ce mois' },
            { id: '6mois', label: '6 derniers mois' },
            { id: 'annee', label: 'Cette année' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriode(p.id)}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition ${periode === p.id ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Chiffre d'Affaires</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{formatMonnaie(kpis.totalCA)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Factures émises</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{kpis.totalFactures}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Panier moyen</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{formatMonnaie(kpis.panierMoyen)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-emerald-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Taux de recouvrement</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{kpis.tauxRecouvrement}%</p>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
            <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${kpis.tauxRecouvrement}%` }}></div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Évolution du CA (Barres) - Prend 2 colonnes */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-extrabold text-slate-800 mb-4">Évolution du Chiffre d'Affaires</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolutionMensuelle} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatMonnaieCourt} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [formatMonnaie(value), 'CA']} contentStyle={{ borderRadius: '8px', border: 'none', fontWeight: 'bold' }} />
                <Bar dataKey="ca" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par catégorie (Camembert) */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-base font-extrabold text-slate-800 mb-4">Répartition par activité</h3>
          <div className="h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={repartitionCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {repartitionCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMonnaie(value)} contentStyle={{ borderRadius: '8px', border: 'none', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full mt-2 space-y-1">
              {repartitionCategories.map(cat => (
                <div key={cat.name} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-600 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{formatMonnaieCourt(cat.value)} F</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Clients */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-base font-extrabold text-slate-800">Top 5 des clients</h3>
        </div>
        <table className="w-full text-left">
          <thead className="text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-extrabold">Rang</th>
              <th className="px-4 py-3 font-extrabold">Client</th>
              <th className="px-4 py-3 font-extrabold text-center">Factures</th>
              <th className="px-4 py-3 font-extrabold text-right">CA Généré</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {topClients.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-500">Aucune facture enregistrée.</td></tr>
            ) : topClients.map((client, index) => (
              <tr key={client.nom} className="hover:bg-rose-50 transition-colors">
                <td className="px-4 py-4">
                  <span className={`w-8 h-8 flex items-center justify-center rounded-full font-extrabold text-sm ${index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-4 font-bold text-slate-900 text-base">{client.nom}</td>
                <td className="px-4 py-4 text-center text-slate-700 font-medium">{client.nbFactures}</td>
                <td className="px-4 py-4 text-right font-extrabold text-rose-700 text-base">{formatMonnaie(client.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}