import {isAutoCheckoutLane} from './store-layout.js';
export const SECURITY_LEVELS={basic:{name:'Surveillance simple',factor:1,daily:0,install:0},cameras:{name:'Caméras',factor:.5,daily:25,install:600},reinforced:{name:'Caméras et contrôle',factor:.2,daily:60,install:1400}};
export const newTheftState=seed=>({level:'basic',seed:(seed^82973)>>>0,daily:{checked:0,stolen:0,lostRevenue:0,lostCost:0,autoStolen:0,staffedStolen:0,products:Array(6).fill(0)}});
export const theftRates=s=>({staffed:.01*SECURITY_LEVELS[s.theft?.level||'basic'].factor,automatic:.04*SECURITY_LEVELS[s.theft?.level||'basic'].factor});
export const securityDailyCost=s=>SECURITY_LEVELS[s.theft?.level||'basic'].daily;
export function setSecurityLevel(s,level) {
 if(!Object.hasOwn(SECURITY_LEVELS,level)||!['open','preparation'].includes(s.phase))throw new Error('Surveillance indisponible.');
 const current=s.theft?.level||'basic',cost=Math.max(0,SECURITY_LEVELS[level].install-SECURITY_LEVELS[current].install);
 if(cost>s.money)throw new Error('Trésorerie insuffisante pour cette surveillance.');
 s.theft||=newTheftState(s.seed);s.theft.level=level;s.money=Math.round((s.money-cost)*100)/100;s.spending=Math.round((s.spending+cost)*100)/100;s.vatDeductible=Math.round((s.vatDeductible+cost/6)*100)/100;
 return {level,cost,rates:theftRates(s)};
}
export function settleTheft(s,customer) {
 if(!s.theft)return;
 const t=s.theft,automatic=isAutoCheckoutLane(customer.checkoutLane),rate=automatic?theftRates(s).automatic:theftRates(s).staffed;
 customer.stolen=[];
 for(const item of customer.basket) {
  let stolen=0;
  for(let n=0;n<item.quantity;n++){t.seed=(Math.imul(1664525,t.seed)+1013904223)>>>0;if(t.seed/4294967296<rate)stolen++;}
  item.stolen=stolen;const p=s.products[item.index];t.daily.checked+=item.quantity;
  if(!stolen)continue;
  customer.stolen.push({index:item.index,quantity:stolen});t.daily.products[item.index]+=stolen;t.daily.stolen+=stolen;t.daily[automatic?'autoStolen':'staffedStolen']+=stolen;
  t.daily.lostRevenue=Math.round((t.daily.lostRevenue+stolen*p.price)*100)/100;t.daily.lostCost=Math.round((t.daily.lostCost+stolen*p.cost)*100)/100;
  customer.value=Math.round(Math.max(0,customer.value-stolen*p.price)*100)/100;
 }
}
export const theftReport=s=>({rates:theftRates(s),level:s.theft?.level||'basic',daily:structuredClone(s.theft?.daily||newTheftState(s.seed).daily),securityCost:securityDailyCost(s)});
