import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// --- DONNÉES SIMULÉES ---
const EVOLUTION_MENSUELLE = [
  { mois: 'Mai', ca: 4500000 },
  { mois: 'Juin', ca: 6200000 },
  { mois: 'Juil', ca: 5100000 },
  { mois: 'Août', ca: 3800000 },
  { mois: 'Sept', ca: 7500000 },
  { mois: 'Oct', ca: 9735000 },
];

const REPARTITION_CATEGORIES = [
  { name: 'Espaces publicitaires', value: 4500000, color: '#8b5cf6' },
  { name: 'Restauration', value: 2800000, color: '#10b981' },
  { name: 'Salles de rencontre', value: 1500000, color: '#f59e0b' },
  { name: 'Chambres', value: 935000, color: '#3b82f6' },
];

const TOP_CLIENTS = [
  { id: 1, nom: 'MINISTÈRE DE LA COMMUNICATION', total: 9735000, nbFactures: 3 },
  { id: 2, nom: 'SENEGAL TELECOM', total: 6200000, nbFactures: 2 },
  { id: 3, nom: 'RTS (RADIO TELEVISION SENEGALAISE)', total: 3400000, nbFactures: 4 },
  { id: 4, nom: 'PRESSE NATIONALE', total: 1500000, nbFactures: 1 },
  { id: 5, nom: 'SONATEL', total: 900000, nbFactures: 1 },
];

export default function StatsPage() {
  const [periode, setPeriode] = useState('6mois'); // 'mois', '6mois', 'annee'

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant).replace('XOF', 'F');
  const formatMonnaieCourt = (montant) => {
    if (montant >= 1000000) return (montant / 1000000).toFixed(1) + 'M';
    if (montant >= 1000) return (montant / 1000).toFixed(0) + 'k';
    return montant;
  };

  // --- CALCUL DES KPIs ---
  const kpis = useMemo(() => {
    const totalCA = EVOLUTION_MENSUELLE.reduce((sum, m) => sum + m.ca, 0);
    const totalFactures = TOP_CLIENTS.reduce((sum, c) => sum + c.nbFactures, 0);
    const panierMoyen = totalCA / totalFactures;
    // Simulation d'un taux de recouvrement
    const tauxRecouvrement = 85; 

    return { totalCA, totalFactures, panierMoyen, tauxRecouvrement };
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Filtre de période */}
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
        {/* CA Total */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-rose-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Chiffre d'Affaires</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{formatMonnaie(kpis.totalCA)}</p>
          <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            +12% vs période préc.
          </p>
        </div>

        {/* Nombre de factures */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Factures émises</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{kpis.totalFactures}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Documents comptabilisés</p>
        </div>

        {/* Panier moyen */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 border-l-4 border-l-purple-500">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Panier moyen</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{formatMonnaie(kpis.panierMoyen)}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Par facture</p>
        </div>

        {/* Taux de recouvrement */}
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
              <BarChart data={EVOLUTION_MENSUELLE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="mois" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatMonnaieCourt} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value) => [formatMonnaie(value), 'CA']} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
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
                <Pie data={REPARTITION_CATEGORIES} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                  {REPARTITION_CATEGORIES.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatMonnaie(value)} contentStyle={{ borderRadius: '8px', border: 'none', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full mt-2 space-y-1">
              {REPARTITION_CATEGORIES.map(cat => (
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
            {TOP_CLIENTS.map((client, index) => (
              <tr key={client.id} className="hover:bg-rose-50 transition-colors">
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