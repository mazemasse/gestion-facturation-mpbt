import { forwardRef, useState, useEffect } from 'react';
import { COMPANY_DATA } from '../data/companyData';
import { supabase } from '../lib/supabaseClient';

const FacturePDF = forwardRef(({ data, user }, ref) => {
  // État pour stocker les infos de l'entreprise (chargées depuis Supabase)
  const [companyInfo, setCompanyInfo] = useState(COMPANY_DATA);

  // Chargement des paramètres au montage du composant
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
    <div ref={ref} className="bg-white text-black p-6 font-sans w-[210mm] min-h-[297mm] mx-auto flex flex-col">
      
      {/* ================= EN-TÊTE ================= */}
      <div className="flex justify-between items-start border-b-4 border-emerald-600 pb-3 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
            {/* On utilise companyInfo.logo au lieu de COMPANY_DATA.logo */}
            <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain" 
                 onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="hidden w-full h-full bg-emerald-600 text-white items-center justify-center font-black text-2xl">
              {companyInfo.sigle}
            </div>
          </div>
          
          <div>
            <h1 className="text-lg font-black uppercase text-gray-900 leading-tight">
              {companyInfo.nom}
            </h1>
            <p className="text-[11px] text-gray-600 mt-1">📍 {companyInfo.adresse}</p>
            <p className="text-[11px] text-gray-600">📞 {companyInfo.telephone}</p>
            <p className="text-[11px] text-gray-600">✉️ {companyInfo.email} - 🌐 {companyInfo.siteWeb}</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-2xl font-black text-emerald-700 uppercase tracking-wider">{typeDoc}</h2>
          <p className="text-base font-bold text-gray-800 mt-1">N° {numeroDoc}</p>
          <div className="mt-1 text-[9px] text-gray-500 border-t border-gray-200 pt-1 space-y-0.5">
            <p>NINEA : {companyInfo.ninea}</p>
            <p>RC : {companyInfo.rc}</p>
            <p>Compte : {companyInfo.banque} {companyInfo.compteBancaire}</p>
          </div>
        </div>
      </div>

      {/* ================= INFOS CLIENT & DATES ================= */}
      <div className="flex justify-between mb-4">
        <div className="w-1/2 bg-gray-50 p-2 rounded-lg border border-gray-200">
          <h3 className="text-[10px] font-black uppercase text-emerald-700 mb-1 border-b border-emerald-200 pb-1">Facturé à :</h3>
          <p className="text-sm font-bold text-gray-900">{client || 'Client non renseigné'}</p>
          {clientInfo && (
            <div className="text-[11px] text-gray-700 mt-1 space-y-0.5">
              <p>{clientInfo.contact}</p>
              <p>{clientInfo.adresse}</p>
              <p>Tél : {clientInfo.tel}</p>
            </div>
          )}
        </div>
        <div className="w-1/2 flex justify-end">
          <div className="text-[11px]">
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
        <div className="mb-3 bg-emerald-50 p-2 rounded border-l-4 border-emerald-600">
          <p className="text-[11px] font-bold text-gray-800"><span className="text-emerald-700 uppercase">Objet :</span> {objet}</p>
        </div>
      )}

      {/* ================= TABLEAU DES ARTICLES ================= */}
      <table className="w-full mb-4 text-xs border-collapse">
        <thead>
          <tr className="bg-emerald-600 text-white text-left">
            <th className="border border-emerald-700 p-1.5 font-bold uppercase text-[10px]">Désignation</th>
            <th className="border border-emerald-700 p-1.5 text-center font-bold uppercase text-[10px]">Unité</th>
            <th className="border border-emerald-700 p-1.5 text-center font-bold uppercase text-[10px]">Qté</th>
            <th className="border border-emerald-700 p-1.5 text-right font-bold uppercase text-[10px]">Prix Unit.</th>
            <th className="border border-emerald-700 p-1.5 text-right font-bold uppercase text-[10px]">Montant Total</th>
          </tr>
        </thead>
        <tbody>
          {panier.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="border border-gray-300 p-1.5 text-[11px]">{item.designation}</td>
              <td className="border border-gray-300 p-1.5 text-center text-[11px]">{item.unite}</td>
              <td className="border border-gray-300 p-1.5 text-center font-bold text-[11px]">{item.quantite}</td>
              <td className="border border-gray-300 p-1.5 text-right text-[11px]">{formatMonnaie(item.prixUnitaire)}</td>
              <td className="border border-gray-300 p-1.5 text-right font-bold text-[11px]">{formatMonnaie(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= TOTAUX ================= */}
      <div className="flex justify-end mb-4">
        <div className="w-1/2">
          <div className="flex justify-between py-1 text-[11px] border-b border-gray-200"><span className="text-gray-600">Sous-total HT</span><span className="font-bold">{formatMonnaie(sousTotalHT)}</span></div>
          {appliqueTVA && (<div className="flex justify-between py-1 text-[11px] border-b border-gray-200"><span className="text-gray-600">TVA (18%)</span><span className="font-bold">{formatMonnaie(tva)}</span></div>)}
          <div className="flex justify-between py-1 text-[11px] border-b border-gray-200"><span className="text-gray-600">Total TTC Brut</span><span className="font-bold">{formatMonnaie(totalTTCBrut)}</span></div>
          {remiseTTC > 0 && (<div className="flex justify-between py-1 text-[11px] text-red-600 border-b border-gray-200"><span>Remise TTC</span><span className="font-bold">-{formatMonnaie(remiseTTC)}</span></div>)}
          <div className="flex justify-between py-1.5 text-base font-black bg-emerald-600 text-white px-3 mt-1 rounded"><span className="uppercase">Net à Payer</span><span>{formatMonnaie(netAPayer)}</span></div>
        </div>
      </div>

      {/* ================= CONDITIONS COMMERCIALES ================= */}
      <div className="mt-1 mb-4 p-2 bg-slate-50 border border-slate-200 rounded">
        <h4 className="text-[10px] font-black uppercase text-slate-700 mb-0.5">Conditions Commerciales :</h4>
        <ul className="text-[9px] text-slate-600 list-disc list-inside space-y-0.5">
          <li>50% à la réservation (ou commande).</li>
          <li>50% à la réception ou tenue de l'activité.</li>
        </ul>
      </div>

      {/* ================= SIGNATURE DIRECTION ================= */}
      <div className="flex justify-end mt-2 mb-4">
        <div className="w-72 flex flex-col items-end pr-4">
          <p className="text-[11px] font-bold text-slate-800 underline underline-offset-4 decoration-slate-400 decoration-1">
            LA DIRECTION COMMERCIALE
          </p>
          <div className="h-12 w-full"></div>
        </div>
      </div>

      {/* ================= SOUCHE DE RECOUVREMENT (Bas de page) ================= */}
      {typeDoc === 'Facture' && (
        <div className="mt-auto pt-2">
          <div className="border-2 border-dashed border-gray-400 p-3 bg-gray-50">
            
            {/* En-tête de la souche */}
            <div className="flex justify-between items-center border-b border-gray-400 pb-1.5 mb-2">
              <h3 className="text-xs font-black uppercase text-gray-700 tracking-widest">Souche de Recouvrement</h3>
              <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 border border-gray-300 rounded">{numeroDoc}</span>
            </div>

            {/* Nom du client */}
            <div className="mb-2">
              <p className="font-bold uppercase text-gray-500 text-[9px]">Client</p>
              <p className="font-bold text-xs text-gray-900">{client}</p>
            </div>

            {/* Récapitulatif des montants */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-[11px] mb-2 border-t border-b border-gray-300 py-1.5">
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

            {/* Contact, Date et Net à Payer */}
            <div className="grid grid-cols-3 gap-4 text-[11px]">
              <div>
                <p className="font-bold uppercase text-gray-500 text-[9px]">Contact</p>
                <p className="truncate">{clientInfo?.contact || '-'}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-500 text-[9px]">Date Facture</p>
                <p>{dateFormatee}</p>
              </div>
              <div>
                <p className="font-bold uppercase text-gray-500 text-[9px]">Net à Payer</p>
                <p className="font-black text-xs text-gray-900">{formatMonnaie(netAPayer)}</p>
              </div>
            </div>

            {/* Pied de la souche */}
            <div className="mt-2 pt-1.5 border-t border-gray-300 flex justify-between text-[9px] text-gray-500">
              <p>Généré par : {user.nom}</p>
              <p>Heure : {heureFormatee}</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= PIED DE PAGE ================= */}
      <div className="mt-3 pt-2 border-t border-gray-300 text-center text-[9px] text-gray-500 space-y-0.5">
        <p className="font-bold text-gray-700">{companyInfo.nom} ({companyInfo.sigle})</p>
        <p>{companyInfo.adresse} - NINEA : {companyInfo.ninea} - RC : {companyInfo.rc}</p>
        <p className="italic mt-0.5 text-emerald-600">{companyInfo.slogan}</p>
      </div>

    </div>
  );
});

export default FacturePDF;