import { forwardRef, useState, useEffect } from 'react';
import { COMPANY_DATA } from '../data/companyData';
import { supabase } from '../lib/supabaseClient';

const FacturePDF = forwardRef(({ data, user }, ref) => {
  const [companyInfo, setCompanyInfo] = useState(COMPANY_DATA);

  useEffect(() => {
    const chargerParametres = async () => {
      const { data: paramData } = await supabase.from('parametres').select('*').eq('id', 1).single();
      if (paramData) {
        setCompanyInfo({
          nom: paramData.nom,
          sigle: paramData.sigle,
          adresse: paramData.adresse,
          telephone: paramData.telephone,
          email: paramData.email,
          siteWeb: paramData.site_web,
          ninea: paramData.ninea,
          rc: paramData.rc,
          banque: paramData.banque,
          compteBancaire: paramData.compte_bancaire,
          logo: paramData.logo,
          slogan: paramData.slogan
        });
      }
    };
    chargerParametres();
  }, []);

  if (!data) return null;

  const { 
    numeroDoc, typeDoc, client, clientInfo, objet, 
    dateFormatee, heureFormatee, modePaiement,
    panier, sousTotalHT, tva, appliqueTVA, totalTTCBrut, remiseTTC, netAPayer 
  } = data;

  const formatMonnaie = (montant) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' F';
  };

  return (
    <div ref={ref} className="bg-white text-black p-8 font-sans w-[210mm] min-h-[297mm] mx-auto flex flex-col">
      
      {/* ================= EN-TÊTE ================= */}
      <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
            <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain" 
                 onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="hidden w-full h-full bg-emerald-600 text-white items-center justify-center font-black text-3xl">
              {companyInfo.sigle}
            </div>
          </div>
          
          <div>
            <h1 className="text-2xl font-black uppercase text-gray-900 leading-tight">
              {companyInfo.nom}
            </h1>
            <p className="text-sm text-gray-600 mt-1">📍 {companyInfo.adresse}</p>
            <p className="text-sm text-gray-600">📞 {companyInfo.telephone}</p>
            <p className="text-sm text-gray-600">✉️ {companyInfo.email} - 🌐 {companyInfo.siteWeb}</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-4xl font-black text-emerald-700 uppercase tracking-wider">{typeDoc}</h2>
          <p className="text-xl font-bold text-gray-800 mt-2">N° {numeroDoc}</p>
          <div className="mt-2 text-xs text-gray-500 border-t border-gray-200 pt-2 space-y-0.5">
            <p>NINEA : {companyInfo.ninea}</p>
            <p>RC : {companyInfo.rc}</p>
            <p>Compte : {companyInfo.banque} {companyInfo.compteBancaire}</p>
          </div>
        </div>
      </div>

      {/* ================= INFOS CLIENT & DATES ================= */}
      <div className="flex justify-between mb-6">
        <div className="w-1/2 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-xs font-black uppercase text-emerald-700 mb-2 border-b border-emerald-200 pb-1">Facturé à :</h3>
          <p className="text-lg font-bold text-gray-900">{client || 'Client non renseigné'}</p>
          {clientInfo && (
            <div className="text-sm text-gray-700 mt-1 space-y-0.5">
              <p>{clientInfo.contact}</p>
              <p>{clientInfo.adresse}</p>
              <p>Tél : {clientInfo.tel}</p>
            </div>
          )}
        </div>
        <div className="w-1/2 flex justify-end">
          <div className="text-sm">
            <table className="w-full text-right">
              <tbody>
                <tr><td className="pr-4 font-bold text-gray-600">Date :</td><td className="font-medium">{dateFormatee}</td></tr>
                <tr><td className="pr-4 font-bold text-gray-600">Échéance :</td><td className="font-medium">30 jours</td></tr>
                <tr><td className="pr-4 font-bold text-gray-600">Heure :</td><td className="font-medium">{heureFormatee}</td></tr>
                <tr><td className="pr-4 font-bold text-gray-600">Paiement :</td><td className="font-medium">{modePaiement || 'Virement'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Objet */}
      {objet && (
        <div className="mb-4 bg-emerald-50 p-3 rounded border-l-4 border-emerald-600">
          <p className="text-sm font-bold text-gray-800"><span className="text-emerald-700 uppercase">Objet :</span> {objet}</p>
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
              <td className="border border-gray-300 p-2 text-sm">{item.designation}</td>
              <td className="border border-gray-300 p-2 text-center text-sm">{item.unite}</td>
              <td className="border border-gray-300 p-2 text-center font-bold text-sm">{item.quantite}</td>
              <td className="border border-gray-300 p-2 text-right text-sm">{formatMonnaie(item.prixUnitaire)}</td>
              <td className="border border-gray-300 p-2 text-right font-bold text-sm">{formatMonnaie(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= TOTAUX ================= */}
      <div className="flex justify-end mb-6">
        <div className="w-1/2">
          <div className="flex justify-between py-1.5 text-sm border-b border-gray-200"><span className="text-gray-600">Sous-total HT</span><span className="font-bold">{formatMonnaie(sousTotalHT)}</span></div>
          {appliqueTVA && (<div className="flex justify-between py-1.5 text-sm border-b border-gray-200"><span className="text-gray-600">TVA (18%)</span><span className="font-bold">{formatMonnaie(tva)}</span></div>)}
          <div className="flex justify-between py-1.5 text-sm border-b border-gray-200"><span className="text-gray-600">Total TTC Brut</span><span className="font-bold">{formatMonnaie(totalTTCBrut)}</span></div>
          {remiseTTC > 0 && (<div className="flex justify-between py-1.5 text-sm text-red-600 border-b border-gray-200"><span>Remise TTC</span><span className="font-bold">-{formatMonnaie(remiseTTC)}</span></div>)}
          <div className="flex justify-between py-3 text-xl font-black bg-emerald-600 text-white px-4 mt-2 rounded"><span className="uppercase">Net à Payer</span><span>{formatMonnaie(netAPayer)}</span></div>
        </div>
      </div>

      {/* ================= CONDITIONS COMMERCIALES (MISE À JOUR) ================= */}
      <div className="mt-2 mb-6 p-4 bg-slate-50 border border-slate-200 rounded">
        <h4 className="text-xs font-black uppercase text-slate-700 mb-2">Conditions Commerciales :</h4>
        <ul className="text-xs text-slate-700 list-disc list-inside space-y-1">
          <li>50% à la réservation.</li>
          <li>50% comme reliquat à 72h au moins avant l'activité ou le service.</li>
        </ul>
      </div>

      {/* ================= SIGNATURE DIRECTION ================= */}
      <div className="flex justify-end mt-2 mb-6">
        <div className="w-72 flex flex-col items-end pr-4">
          <p className="text-sm font-bold text-slate-800 underline underline-offset-4 decoration-slate-400 decoration-1">
            LA DIRECTION COMMERCIALE
          </p>
          <div className="h-16 w-full"></div>
        </div>
      </div>

      {/* ================= SOUCHE DE RECOUVREMENT (Bas de page) ================= */}
      {typeDoc === 'Facture' && (
        <div className="mt-auto pt-2">
          <div className="border-2 border-dashed border-gray-400 p-4 bg-gray-50">
            
            <div className="flex justify-between items-center border-b border-gray-400 pb-2 mb-2">
              <h3 className="text-sm font-black uppercase text-gray-700 tracking-widest">Souche de Recouvrement</h3>
              <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 border border-gray-300 rounded">{numeroDoc}</span>
            </div>

            <div className="mb-2">
              <p className="font-bold uppercase text-gray-500 text-[10px]">Client</p>
              <p className="font-bold text-sm text-gray-900">{client}</p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-3 border-t border-b border-gray-300 py-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total HT :</span>
                <span className="font-bold">{formatMonnaie(sousTotalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA (18%) :</span>
                <span className="font-bold">{appliqueTVA ? formatMonnaie(tva) : 'Non applicable'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total TTC Brut :</span>
                <span className="font-bold">{formatMonnaie(totalTTCBrut)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Remise :</span>
                <span className="font-bold text-red-600">{remiseTTC > 0 ? `-${formatMonnaie(remiseTTC)}` : '0 F'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-bold uppercase text-gray-500 text-[10px]">Contact</p>
                <p className="truncate">{clientInfo?.contact || '-'}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-500 text-[10px]">Date Facture</p>
                <p>{dateFormatee}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-500 text-[10px]">Net à Payer</p>
                <p className="font-black text-sm text-gray-900">{formatMonnaie(netAPayer)}</p>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between text-[10px] text-gray-500">
              <p>Généré par : {user.nom}</p>
              <p>Heure : {heureFormatee}</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= PIED DE PAGE ================= */}
      <div className="mt-4 pt-3 border-t border-gray-300 text-center text-[10px] text-gray-500 space-y-0.5">
        <p className="font-bold text-gray-700 text-xs">{companyInfo.nom} ({companyInfo.sigle})</p>
        <p>{companyInfo.adresse} - NINEA : {companyInfo.ninea} - RC : {companyInfo.rc}</p>
        <p className="italic mt-1 text-emerald-600 text-xs">{companyInfo.slogan}</p>
      </div>

    </div>
  );
});

export default FacturePDF;