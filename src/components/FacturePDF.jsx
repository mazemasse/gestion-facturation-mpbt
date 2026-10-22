import { forwardRef } from 'react';
import { COMPANY_DATA } from '../data/companyData';

const FacturePDF = forwardRef(({ data, user }, ref) => {
  if (!data) return null;

  const { 
    numeroDoc, typeDoc, client, clientInfo, objet, 
    dateFormatee, heureFormatee, panier, 
    sousTotalHT, tva, appliqueTVA, totalTTCBrut, remiseTTC, netAPayer 
  } = data;

  const formatMonnaie = (montant) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' F';
  };

  return (
    <div ref={ref} className="bg-white text-black p-8 font-sans w-[210mm] min-h-[297mm] mx-auto flex flex-col">
      
      {/* ================= EN-TÊTE ================= */}
      <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
            <img src={COMPANY_DATA.logo} alt="Logo" className="w-full h-full object-contain" 
                 onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="hidden w-full h-full bg-emerald-600 text-white items-center justify-center font-black text-2xl">
              {COMPANY_DATA.sigle}
            </div>
          </div>
          
          <div>
            <h1 className="text-xl font-black uppercase text-gray-900 leading-tight">
              {COMPANY_DATA.nom}
            </h1>
            <p className="text-xs text-gray-600 mt-1">📍 {COMPANY_DATA.adresse}</p>
            <p className="text-xs text-gray-600">📞 {COMPANY_DATA.telephone}</p>
            <p className="text-xs text-gray-600">✉️ {COMPANY_DATA.email} - 🌐 {COMPANY_DATA.siteWeb}</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-3xl font-black text-emerald-700 uppercase tracking-wider">{typeDoc}</h2>
          <p className="text-lg font-bold text-gray-800 mt-1">N° {numeroDoc}</p>
          <div className="mt-2 text-[10px] text-gray-500 border-t border-gray-200 pt-2 space-y-0.5">
            <p>NINEA : {COMPANY_DATA.ninea}</p>
            <p>RC : {COMPANY_DATA.rc}</p>
            <p>Compte : {COMPANY_DATA.banque} {COMPANY_DATA.compteBancaire}</p>
          </div>
        </div>
      </div>

      {/* ================= INFOS CLIENT & DATES ================= */}
      <div className="flex justify-between mb-6">
        <div className="w-1/2 bg-gray-50 p-3 rounded-lg border border-gray-200">
          <h3 className="text-xs font-black uppercase text-emerald-700 mb-1 border-b border-emerald-200 pb-1">Facturé à :</h3>
          <p className="text-base font-bold text-gray-900">{client || 'Client non renseigné'}</p>
          {clientInfo && (
            <div className="text-xs text-gray-700 mt-1 space-y-0.5">
              <p>{clientInfo.contact}</p>
              <p>{clientInfo.adresse}</p>
              <p>Tél : {clientInfo.tel}</p>
            </div>
          )}
        </div>
        <div className="w-1/2 flex justify-end">
          <div className="text-xs">
            <table className="w-full text-right">
              <tbody>
                <tr><td className="pr-4 font-bold text-gray-600">Date :</td><td className="font-medium">{dateFormatee}</td></tr>
                <tr><td className="pr-4 font-bold text-gray-600">Échéance :</td><td className="font-medium">30 jours</td></tr>
                <tr><td className="pr-4 font-bold text-gray-600">Heure :</td><td className="font-medium">{heureFormatee}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Objet */}
      {objet && (
        <div className="mb-4 bg-emerald-50 p-2 rounded border-l-4 border-emerald-600">
          <p className="text-xs font-bold text-gray-800"><span className="text-emerald-700 uppercase">Objet :</span> {objet}</p>
        </div>
      )}

      {/* ================= TABLEAU DES ARTICLES ================= */}
      <table className="w-full mb-6 text-sm border-collapse">
        <thead>
          <tr className="bg-emerald-600 text-white text-left">
            <th className="border border-emerald-700 p-2 font-bold uppercase text-xs">Désignation</th>
            <th className="border border-emerald-700 p-2 text-center font-bold uppercase text-xs">Unité</th>
            <th className="border border-emerald-700 p-2 text-center font-bold uppercase text-xs">Qté</th>
            <th className="border border-emerald-700 p-2 text-right font-bold uppercase text-xs">Prix Unit.</th>
            <th className="border border-emerald-700 p-2 text-right font-bold uppercase text-xs">Montant Total</th>
          </tr>
        </thead>
        <tbody>
          {panier.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 p-2 text-xs">{item.designation}</td>
              <td className="border border-gray-300 p-2 text-center text-xs">{item.unite}</td>
              <td className="border border-gray-300 p-2 text-center font-bold text-xs">{item.quantite}</td>
              <td className="border border-gray-300 p-2 text-right text-xs">{formatMonnaie(item.prixUnitaire)}</td>
              <td className="border border-gray-300 p-2 text-right font-bold text-xs">{formatMonnaie(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= TOTAUX ================= */}
      <div className="flex justify-end mb-6">
        <div className="w-1/2">
          <div className="flex justify-between py-1 text-xs border-b border-gray-200"><span className="text-gray-600">Sous-total HT</span><span className="font-bold">{formatMonnaie(sousTotalHT)}</span></div>
          {appliqueTVA && (<div className="flex justify-between py-1 text-xs border-b border-gray-200"><span className="text-gray-600">TVA (18%)</span><span className="font-bold">{formatMonnaie(tva)}</span></div>)}
          <div className="flex justify-between py-1 text-xs border-b border-gray-200"><span className="text-gray-600">Total TTC Brut</span><span className="font-bold">{formatMonnaie(totalTTCBrut)}</span></div>
          {remiseTTC > 0 && (<div className="flex justify-between py-1 text-xs text-red-600 border-b border-gray-200"><span>Remise TTC</span><span className="font-bold">-{formatMonnaie(remiseTTC)}</span></div>)}
          <div className="flex justify-between py-2 text-lg font-black bg-emerald-600 text-white px-3 mt-1 rounded"><span className="uppercase">Net à Payer</span><span>{formatMonnaie(netAPayer)}</span></div>
        </div>
      </div>

      {/* ================= SOUCHE DE RECOUVREMENT (Bas de page) ================= */}
      {typeDoc === 'Facture' && (
        <div className="mt-auto pt-8">
          <div className="border-2 border-dashed border-gray-400 p-4 bg-gray-50">
            <div className="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
              <h3 className="text-sm font-black uppercase text-gray-700 tracking-widest">Souche de Recouvrement</h3>
              <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 border border-gray-300 rounded">{numeroDoc}</span>
            </div>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div><p className="font-bold uppercase text-gray-500 text-[10px]">Client</p><p className="font-bold truncate">{client}</p></div>
              <div><p className="font-bold uppercase text-gray-500 text-[10px]">Contact</p><p className="truncate">{clientInfo?.contact || '-'}</p></div>
              <div><p className="font-bold uppercase text-gray-500 text-[10px]">Date Facture</p><p>{dateFormatee}</p></div>
              <div><p className="font-bold uppercase text-gray-500 text-[10px]">Net à Payer</p><p className="font-black text-sm text-gray-900">{formatMonnaie(netAPayer)}</p></div>
            </div>
            <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between text-[10px] text-gray-500">
              <p>Généré par : {user.nom}</p>
              <p>Heure : {heureFormatee}</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= PIED DE PAGE ================= */}
      <div className="mt-6 pt-4 border-t border-gray-300 text-center text-[10px] text-gray-500 space-y-1">
        <p className="font-bold text-gray-700">{COMPANY_DATA.nom} ({COMPANY_DATA.sigle})</p>
        <p>{COMPANY_DATA.adresse} - NINEA : {COMPANY_DATA.ninea} - RC : {COMPANY_DATA.rc}</p>
        <p className="italic mt-1 text-emerald-600">{COMPANY_DATA.slogan}</p>
      </div>

    </div>
  );
});

export default FacturePDF;