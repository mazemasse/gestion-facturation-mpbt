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
          nom: paramData.nom, sigle: paramData.sigle, adresse: paramData.adresse, telephone: paramData.telephone,
          email: paramData.email, siteWeb: paramData.site_web, ninea: paramData.ninea, rc: paramData.rc,
          banque: paramData.banque, compteBancaire: paramData.compte_bancaire, logo: paramData.logo, slogan: paramData.slogan
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

  const formatMonnaie = (montant) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(montant) + ' F';

  // --- FONCTION NOMBRE EN LETTRES (Gère correctement 70 à 99) ---
  const nombreEnLettres = (n) => {
    n = Math.floor(n);
    if (n === 0) return 'zéro';
    const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const dizaines = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    const speciaux = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    
    const convertirCentaine = (num) => {
      let chaine = '';
      const cent = Math.floor(num / 100);
      const reste = num % 100;
      
      if (cent > 0) chaine += (cent === 1 ? 'cent' : unites[cent] + ' cent') + ' ';
      
      if (reste > 0) {
        if (reste < 10) {
          chaine += unites[reste];
        } else if (reste < 20) {
          chaine += speciaux[reste - 10];
        } else {
          // Gestion spécifique pour 70-79 et 90-99
          if (reste >= 70 && reste < 80) {
            if (reste === 71) chaine += 'soixante et onze';
            else {
              const u = reste - 70;
              if (u < 10) chaine += 'soixante-' + speciaux[u];
              else chaine += 'soixante-dix-' + unites[u];
            }
          } else if (reste >= 90 && reste < 100) {
            const u = reste - 90;
            if (u < 10) chaine += 'quatre-vingt-' + speciaux[u];
            else chaine += 'quatre-vingt-dix-' + unites[u];
          } else {
            const d = Math.floor(reste / 10);
            const u = reste % 10;
            chaine += dizaines[d];
            if (u > 0) chaine += '-' + unites[u];
          }
        }
      }
      return chaine.trim();
    };

    const convertir = (num) => {
      if (num === 0) return '';
      let chaine = '';
      const millions = Math.floor(num / 1000000);
      const milliers = Math.floor((num % 1000000) / 1000);
      const centaines = num % 1000;

      if (millions > 0) chaine += (millions === 1 ? 'un million' : convertirCentaine(millions) + ' millions') + ' ';
      if (milliers > 0) chaine += (milliers === 1 ? 'mille' : convertirCentaine(milliers) + ' mille') + ' ';
      if (centaines > 0) chaine += convertirCentaine(centaines) + ' ';
      
      return chaine.trim();
    };

    return convertir(n).toUpperCase() + ' FRANCS CFA';
  };

  return (
    // On fixe la hauteur à 297mm pour avoir une page A4 exacte
    <div ref={ref} className="bg-white text-black p-6 font-sans w-[210mm] h-[297mm] flex flex-col">
      
      {/* ================= EN-TÊTE ================= */}
      <div className="flex justify-between items-start border-b-4 border-blue-600 pb-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center bg-slate-50">
            <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain" 
                 onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="hidden w-full h-full bg-blue-600 text-white items-center justify-center font-black text-2xl">
              {companyInfo.sigle}
            </div>
          </div>
          
          <div>
            <h1 className="text-lg font-black uppercase text-gray-900 leading-tight">
              {companyInfo.nom}
            </h1>
            <p className="text-xs text-gray-700 mt-1">📍 {companyInfo.adresse}</p>
            <p className="text-xs text-gray-700">📞 {companyInfo.telephone}</p>
            <p className="text-xs text-gray-700">✉️ {companyInfo.email}</p>
            <p className="text-xs text-gray-700">🌐 {companyInfo.siteWeb}</p>
          </div>
        </div>

        <div className="text-right">
          <h2 className="text-3xl font-black text-emerald-600 uppercase tracking-wider">{typeDoc}</h2>
          <p className="text-base font-bold text-gray-800 mt-1">N° {numeroDoc}</p>
          <div className="mt-1 text-[10px] text-gray-600 border-t border-gray-200 pt-1 space-y-0.5">
            <p>NINEA : {companyInfo.ninea}</p>
            <p>RC : {companyInfo.rc}</p>
            <p>Banque : {companyInfo.banque}</p>
            <p>Compte : {companyInfo.compteBancaire}</p>
          </div>
        </div>
      </div>

      {/* ================= INFOS CLIENT & DATES ================= */}
      <div className="flex justify-between mb-3">
        <div className="w-1/2 bg-slate-50 p-2 rounded-lg border border-slate-200">
          <h3 className="text-[10px] font-black uppercase text-blue-700 mb-1 border-b border-blue-200 pb-1">Facturé à :</h3>
          <p className="text-sm font-bold text-gray-900">{client}</p>
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
                <tr><td className="pr-4 font-bold text-gray-700">Date :</td><td className="font-medium">{dateFormatee}</td></tr>
                {typeDoc === 'Devis' && <tr><td className="pr-4 font-bold text-gray-700">Validité :</td><td className="font-medium">30 jours</td></tr>}
                <tr><td className="pr-4 font-bold text-gray-700">Heure :</td><td className="font-medium">{heureFormatee}</td></tr>
                <tr><td className="pr-4 font-bold text-gray-700">Paiement :</td><td className="font-medium">{modePaiement || 'Virement'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Objet */}
      {objet && (
        <div className="mb-2 bg-blue-50 p-2 rounded border-l-4 border-blue-600">
          <p className="text-xs font-bold text-gray-800"><span className="text-blue-700 uppercase">Objet :</span> {objet}</p>
        </div>
      )}

      {/* ================= TABLEAU DES ARTICLES ================= */}
      <table className="w-full mb-3 text-xs border-collapse">
        <thead>
          <tr className="bg-blue-600 text-white text-left">
            <th className="border border-blue-700 p-1.5 font-bold uppercase text-[10px]">Désignation</th>
            <th className="border border-blue-700 p-1.5 text-center font-bold uppercase text-[10px]">Unité</th>
            <th className="border border-blue-700 p-1.5 text-center font-bold uppercase text-[10px]">Qté</th>
            <th className="border border-blue-700 p-1.5 text-right font-bold uppercase text-[10px]">Prix Unit.</th>
            <th className="border border-blue-700 p-1.5 text-right font-bold uppercase text-[10px]">Montant Total</th>
          </tr>
        </thead>
        <tbody>
          {panier.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
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
      <div className="flex justify-end mb-3">
        <div className="w-1/2">
          <div className="flex justify-between py-1 text-[11px] border-b border-gray-200"><span className="text-gray-700">Sous-total HT</span><span className="font-bold">{formatMonnaie(sousTotalHT)}</span></div>
          {appliqueTVA && (<div className="flex justify-between py-1 text-[11px] border-b border-gray-200"><span className="text-gray-700">TVA (18%)</span><span className="font-bold">{formatMonnaie(tva)}</span></div>)}
          <div className="flex justify-between py-1 text-[11px] border-b border-gray-200"><span className="text-gray-700">Total TTC Brut</span><span className="font-bold">{formatMonnaie(totalTTCBrut)}</span></div>
          {remiseTTC > 0 && (<div className="flex justify-between py-1 text-[11px] text-red-600 border-b border-gray-200"><span>Remise TTC</span><span className="font-bold">-{formatMonnaie(remiseTTC)}</span></div>)}
          
          <div className="mt-1">
            <div className="flex justify-between py-2 text-base font-black bg-blue-600 text-white px-3 rounded">
              <span className="uppercase">Net à Payer</span>
              <span>{formatMonnaie(netAPayer)}</span>
            </div>
            <p className="text-[10px] italic text-slate-600 mt-1 text-right px-2">Arrêté à la somme de : {nombreEnLettres(netAPayer)}</p>
          </div>
        </div>
      </div>

      {/* ================= CONDITIONS COMMERCIALES ================= */}
      <div className="mt-1 mb-3 p-2 bg-slate-50 border border-slate-200 rounded">
        <h4 className="text-[10px] font-black uppercase text-slate-800 mb-1">Conditions Commerciales :</h4>
        <ul className="text-[10px] text-slate-700 list-disc list-inside space-y-0.5">
          <li>50% à la réservation.</li>
          <li>50% comme reliquat à 72h au moins avant l'activité ou le service.</li>
        </ul>
      </div>

      {/* ================= SIGNATURE DIRECTION ================= */}
      <div className="flex justify-end mt-1 mb-4">
        <div className="w-64 flex flex-col items-end pr-4">
          <p className="text-[10px] font-bold text-slate-800 underline underline-offset-2 decoration-slate-400 decoration-1">
            LA DIRECTION COMMERCIALE
          </p>
          <div className="h-10 w-full"></div>
        </div>
      </div>

      {/* POUSSÉE POUR LE RESTE EN BAS */}
      <div className="flex-1"></div>

      {/* ================= SOUCHE DE RECOUVREMENT ================= */}
      {typeDoc === 'Facture' && (
        <div className="mb-2">
          <div className="border-2 border-dashed border-gray-400 p-2 bg-gray-50">
            
            <div className="flex justify-between items-center border-b border-gray-400 pb-1 mb-1">
              <h3 className="text-[10px] font-black uppercase text-gray-800 tracking-widest">Souche de Recouvrement</h3>
              <span className="font-mono font-bold text-[10px] bg-white px-1.5 py-0.5 border border-gray-300 rounded">{numeroDoc}</span>
            </div>

            <div className="flex justify-between items-baseline mb-1">
              <div>
                <p className="font-bold uppercase text-gray-600 text-[8px]">Client</p>
                <p className="font-bold text-xs text-gray-900">{client}</p>
              </div>
              <div className="text-right">
                <p className="font-bold uppercase text-gray-600 text-[8px]">Contact</p>
                <p className="text-xs">{clientInfo?.contact || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-x-4 gap-y-0.5 text-[9px] border-t border-b border-gray-300 py-1">
              <div className="flex justify-between">
                <span className="text-gray-700">Sous-total HT :</span>
                <span className="font-bold">{formatMonnaie(sousTotalHT)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">TVA (18%) :</span>
                <span className="font-bold">{appliqueTVA ? formatMonnaie(tva) : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Total TTC Brut :</span>
                <span className="font-bold">{formatMonnaie(totalTTCBrut)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-700">Remise :</span>
                <span className="font-bold text-red-600">{remiseTTC > 0 ? `-${formatMonnaie(remiseTTC)}` : '0 F'}</span>
              </div>
              
              {/* BLOC NET À PAYER AVEC MONTANT EN LETTRES */}
              <div className="col-span-2 flex flex-col bg-blue-50 px-2 rounded">
                <div className="flex justify-between">
                  <span className="font-black text-gray-900">Net à Payer :</span>
                  <span className="font-black text-blue-700">{formatMonnaie(netAPayer)}</span>
                </div>
                <p className="text-[7px] italic text-slate-600 text-right leading-tight pr-1">
                  Arrêté à : {nombreEnLettres(netAPayer)}
                </p>
              </div>
            </div>

            <div className="flex justify-between text-[8px] text-gray-500 mt-1">
              <p>Date : {dateFormatee}</p>
              <p>Généré par : {user.nom} à {heureFormatee}</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= PIED DE PAGE ================= */}
      <div className="mt-auto pt-2 border-t border-gray-300 text-center text-[8px] text-gray-500 space-y-0.5">
        <p className="font-bold text-gray-700 text-[10px]">{companyInfo.nom} ({companyInfo.sigle})</p>
        <p>{companyInfo.adresse} - NINEA : {companyInfo.ninea} - RC : {companyInfo.rc}</p>
        <p className="italic mt-0.5 text-blue-600 text-[10px]">{companyInfo.slogan}</p>
      </div>

    </div>
  );
});

export default FacturePDF;