import {warehouseFixture,warehouseFixtures,warehouseFootprint,warehouseAccess,warehouseWalkable,warehouseRoute} from './warehouse-routing.js';
export {warehouseFixture,warehouseFixtures,warehouseFootprint,warehouseAccess,warehouseRoute};
export const CATALOG=[
 {id:'tech',name:'Accessoires tech',short:'Tech',cost:18,price:32,color:'#9bb6dc',initial:72},
 {id:'books',name:'Livres',short:'Livres',cost:7,price:15,color:'#e9b875',initial:120},
 {id:'home',name:'Maison',short:'Maison',cost:12,price:25,color:'#a1c8b2',initial:96},
 {id:'toys',name:'Jeux & jouets',short:'Jouets',cost:14,price:29,color:'#d8a1ad',initial:72},
 {id:'beauty',name:'Hygiène & beauté',short:'Beauté',cost:6,price:14,color:'#b8a6d8',initial:120},
 {id:'fashion',name:'Vêtements',short:'Mode',cost:11,price:24,color:'#8dc5c9',initial:96},
];
export const WAREHOUSE_ROLES={receiving:{name:'Réception',wage:85},picking:{name:'Prélèvement',wage:85},packing:{name:'Emballage',wage:85},drivers:{name:'Chauffeurs',wage:95}};
export const FULFILLMENT_PLANS={standard:{name:'Standard',rate:.105,express:.15,next:.3,fee:5},express:{name:'Priorité express',rate:.12,express:.45,next:.3,fee:7},volume:{name:'Volume',rate:.16,express:.08,next:.2,fee:3.5}};
// Delivery promises sold to customers: 48 h by default, 24 h, or express within 6 h; faster promises add to the service fee.
export const DELIVERY_PROMISES={standard:{name:'48 h',minutes:2880,fee:0},next:{name:'24 h',minutes:1440,fee:2},express:{name:'Express 6 h',minutes:360,fee:4}};
// Commercial levers on demand: gross margin (selling price), daily advertising budget, timed promotions, plus the service reputation.
export const PRICING={minMargin:20,maxMargin:70,marketMargin:50,elasticity:1.5,maxAdBudget:1000};
export const PROMO_DISCOUNTS=[10,20,30],PROMO_DURATIONS=[180,1440,4320],PROMO_SETUP=80,PROMO_VISIBILITY=1.25;
const promoActive=s=>Boolean(s.promo&&now(s)<s.promo.until);
export const unitPrice=(s,p)=>money(p.cost/(1-(s.margin??PRICING.marketMargin)/100)*(1-(promoActive(s)?s.promo.discount/100:0)));
// Commercial calendar: a 28-day cycle of sales, Black Friday, Cyber Monday, Christmas rush and a summer lull.
export const SEASON_LENGTH=28,SEASON_EVENTS=[{id:'sales',name:'Soldes',icon:'🏷️',start:3,days:3,demand:1.6,express:0},{id:'blackfriday',name:'Black Friday',icon:'🛍️',start:11,days:1,demand:2.6,express:.05},{id:'cyber',name:'Cyber Monday',icon:'💻',start:12,days:2,demand:1.6,express:0},{id:'xmas',name:'Rush de Noël',icon:'🎄',start:18,days:5,demand:1.9,express:.15},{id:'lull',name:'Creux estival',icon:'☀️',start:24,days:4,demand:.7,express:0}];
export const seasonDay=day=>(day-1)%SEASON_LENGTH+1;
export const seasonEvent=day=>SEASON_EVENTS.find(e=>seasonDay(day)>=e.start&&seasonDay(day)<e.start+e.days)??null;
export function upcomingEvents(s,count=4){const list=[];for(let d=s.day;d<s.day+SEASON_LENGTH*2&&list.length<count;d++){const e=seasonEvent(d);if(e&&seasonDay(d)===e.start||e&&d===s.day)list.push({...e,day:d,inDays:d-s.day,lastDay:d+e.start+e.days-1-seasonDay(d)});}return list.filter((e,i,a)=>a.findIndex(x=>x.id===e.id&&x.lastDay===e.lastDay)===i);}
function announceSeason(s){const today=seasonEvent(s.day),soon=seasonEvent(s.day+2);if(today)log(s,`Aujourd’hui : ${today.icon} ${today.name} · commandes ×${String(today.demand).replace('.',',')}.`,'success');if(soon&&seasonDay(s.day+2)===soon.start)log(s,`Dans 2 jours : ${soon.icon} ${soon.name} · prévoyez stock et équipes.`,'success');}
export function warehouseDemand(s){const margin=s.margin??PRICING.marketMargin,discount=promoActive(s)?s.promo.discount/100:0,relative=(1-PRICING.marketMargin/100)/(1-margin/100)*(1-discount);
 const price=Math.pow(relative,-PRICING.elasticity),promo=promoActive(s)?PROMO_VISIBILITY:1,ads=1+.6*(1-Math.exp(-(s.adBudget||0)/400)),reputation=.7+s.reputation*.005,event=seasonEvent(s.day),season=event?.demand??1,factor=price*promo*ads*reputation*season;
 return {price,promo,ads,reputation,season,event,factor,perHour:FULFILLMENT_PLANS[s.plan].rate*60*factor,effectiveMargin:1-(1-margin/100)/(1-discount)};}
export function launchWarehousePromo(s,discount=20,minutes=180){if(!PROMO_DISCOUNTS.includes(discount)||!PROMO_DURATIONS.includes(minutes))throw Error('Promotion invalide.');if(promoActive(s))throw Error('Une promotion est déjà en cours.');if(s.money<PROMO_SETUP)throw Error('Trésorerie insuffisante.');s.money=money(s.money-PROMO_SETUP);s.daily.marketing=money((s.daily.marketing||0)+PROMO_SETUP);s.totals.marketing=money((s.totals.marketing||0)+PROMO_SETUP);s.promo={discount,until:now(s)+minutes};log(s,`Promotion −${discount} % lancée jusqu’au jour ${Math.floor(s.promo.until/1440)+1} à ${String(Math.floor(s.promo.until%1440/60)).padStart(2,'0')}:${String(s.promo.until%60).padStart(2,'0')}.`);}
export function stopWarehousePromo(s){if(!promoActive(s))throw Error('Aucune promotion en cours.');s.promo=null;log(s,'Promotion arrêtée.');}
// Advertising is paid hour by hour while orders can arrive: a tenth of the daily budget at 9 h, 10 h … 18 h.
function spendAdvertising(s){if(!s.adBudget||s.minute%60||s.minute<540||s.minute>1080)return;const cost=money(s.adBudget/10);s.money=money(s.money-cost);s.daily.marketing=money((s.daily.marketing||0)+cost);s.totals.marketing=money((s.totals.marketing||0)+cost);}
export const DELIVERY_AREAS=[{id:'north',name:'Nord',minutes:30},{id:'east',name:'Est',minutes:40},{id:'west',name:'Ouest',minutes:50}];
// Growth ceilings of one distribution centre: two columns of packing benches, a double parking row, a large robot fleet.
export const WH_LIMITS={benches:8,vans:8,robots:24,staff:40,rackCapacity:1920,activeOrders:400};
export const WH_ROBOT={cost:18000,maintenance:160,electricity:20,limit:WH_LIMITS.robots};
const money=n=>Math.round(n*100)/100,now=s=>(s.day-1)*1440+s.minute;
export {now as warehouseNow};
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function log(s,text,tone='info'){s.log.unshift({at:now(s),text,tone});s.log=s.log.slice(0,45);}
const freshDay=()=>({received:0,accepted:0,delivered:0,onTime:0,late:0,revenue:0,cogs:0,purchases:0,transport:0,packaging:0,marketing:0,bonus:0,charges:0,wagesAccrued:0,processSum:0,processed:0});
// Hourly statistics for the charts: orders received and delivered, lateness, sales, cost of goods and order processing time (creation → packed).
function metric(s){const h=Math.floor(now(s)/60);s.metrics??=[];let m=s.metrics[s.metrics.length-1];if(!m||m.h!==h){m={h,received:0,delivered:0,late:0,revenue:0,cogs:0,processSum:0,processed:0};s.metrics.push(m);if(s.metrics.length>240)s.metrics.shift();}return m;}
function worker(s,role,robot=false){const i=s.workers.filter(w=>w.role===role&&w.robot===robot).length;const position=role==='receiving'?[-12+i*.7,9]:role==='packing'?warehouseAccess(s,'pack:'+Math.min(i,s.benches-1)):role==='drivers'?[11+i*.7,9]:[1+i*.6,8];return {id:s.nextId++,role,robot,retiring:false,phase:'idle',job:null,pos:position,path:[],target:null,remaining:0,cargo:0,shipment:null,line:0,...(role==='receiving'?{speed:palletJack(s).speed}:{})};}
export function createWarehouseGame(seed=7351){
 const s={kind:'fulfillment',version:1,seed:seed>>>0,day:1,minute:360,speed:0,nextId:1,money:25000,initialCash:25000,receivedUnits:0,soldUnits:0,startingUnits:576,reputation:96,plan:'standard',acceptOrders:true,priority:'deadline',dispatchEvery:60,lastDispatch:-1000,benches:1,layout:{},workers:[],staff:{receiving:1,picking:2,packing:1,drivers:1},robotTarget:0,products:CATALOG.map(p=>({...p,onHand:p.initial,reserved:0,capacity:240,ordered:0,sold:0})),orders:[],shipments:[],vans:[],contracts:[],history:[],log:[],daily:freshDay(),totals:{revenue:0,cogs:0,purchases:0,transport:0,packaging:0,bonus:0,charges:0,investments:0,marketing:0},arrivalCredit:0,dayStartCash:25000,margin:PRICING.marketMargin,adBudget:0,promo:null,supplies:{...PACKAGING_START},autoSupplies:true,palletJack:'manual',ownedJacks:['manual']};
 for(const [role,count]of Object.entries(s.staff))for(let i=0;i<count;i++)s.workers.push(worker(s,role));s.vans.push({id:s.nextId++,capacity:12,phase:'idle',remaining:0,orders:[],driver:null,area:null,started:0,duration:0});
 createContracts(s);for(let i=0;i<4;i++)createWarehouseOrder(s,{channel:i===0?'express':'standard'});
 log(s,'Le centre est opérationnel. Première vague de commandes en préparation.','success');return s;
}
export function migrateWarehouseGame(record,legacyStockValue=null){
 if(record.schemaVersion===2&&record.state.kind==='fulfillment'){const s=structuredClone(record.state);s.margin??={low:45,high:55}[s.pricing]??PRICING.marketMargin;s.adBudget??=0;s.promo??=s.promoUntil>now(s)?{discount:0,until:s.promoUntil}:null;delete s.pricing;delete s.promoUntil;s.supplies??={...PACKAGING_START};s.palletJack=s.palletJack==='double'?'rider':s.palletJack??'manual';s.ownedJacks=(s.ownedJacks??['manual']).map(m=>m==='double'?'rider':m);s.autoSupplies??=true;s.totals.marketing??=0;s.daily.marketing??=0;return s;}
 const old=record.state,s=createWarehouseGame(old.seed);let assets=0;
 for(const [i,p]of old.products.entries()){const cost=old.inventoryAccounting?.unitCosts?.[i]??p.cost/1.2;assets+=(p.shelf+p.reserve)*cost;}
 for(const w of old.restockers||[])assets+=(w.load||0)*(old.products.find(p=>p.id===w.productId)?.cost||2)/1.2;
 for(const o of old.orders||[])if(o.status!=='received')assets+=(o.pallets||[]).reduce((n,p)=>n+p.remaining,0)*(old.products.find(p=>p.id===o.productId)?.cost||2)/1.2;
 if(Number.isFinite(legacyStockValue)&&legacyStockValue>=0)assets=legacyStockValue;
 const debt=(old.supplierPayments?.invoices||[]).reduce((n,i)=>n+i.remaining,0),net=money(old.money+assets-debt),support=money(Math.max(0,25000-net));
 s.money=money(net+support);s.initialCash=s.money;s.dayStartCash=s.money;s.legacyArchive=structuredClone(record);s.transition={cash:old.money,assets:money(assets),debt:money(debt),support,day:old.day};
 log(s,`Reconversion du magasin : ancienne partie archivée, capital disponible ${s.money.toLocaleString('fr-FR')} €.`, 'success');return s;
}
// Bank loans: cash now, then a daily instalment at the 22 h closing — the interest share is a charge, the capital share only reduces the debt.
export const LOAN_AMOUNTS=[5000,10000,25000,50000],LOAN_TERMS={10:.04,20:.07,30:.1},LOAN_LIMIT=100000;
export const loanQuote=(amount,days)=>{const interest=money(amount*LOAN_TERMS[days]);return {amount,days,interest,instalment:money((amount+interest)/days)};};
export const warehouseDebt=s=>money((s.loans||[]).reduce((n,l)=>n+l.principalLeft,0));
const loanShare=l=>({principal:l.daysLeft<=1?l.principalLeft:Math.min(l.principalLeft,money(l.amount/l.days)),interest:l.daysLeft<=1?l.interestLeft:Math.min(l.interestLeft,money(l.interest/l.days))});
export function takeWarehouseLoan(s,amount,days){if(!LOAN_AMOUNTS.includes(amount)||!LOAN_TERMS[days])throw Error('Offre de prêt invalide.');if(warehouseDebt(s)+amount>LOAN_LIMIT)throw Error(`Encours maximal : ${LOAN_LIMIT.toLocaleString('fr-FR')} €.`);const q=loanQuote(amount,days);s.loans??=[];s.loans.push({id:s.nextId++,amount,days,interest:q.interest,daysLeft:days,principalLeft:amount,interestLeft:q.interest,taken:now(s)});s.money=money(s.money+amount);s.totals.borrowed=money((s.totals.borrowed||0)+amount);log(s,`Emprunt de ${amount.toLocaleString('fr-FR')} € sur ${days} jours · ${q.instalment} € par jour.`);}
export function repayWarehouseLoan(s,id){const l=(s.loans||[]).find(l=>l.id===id);if(!l)throw Error('Emprunt introuvable.');if(s.money<l.principalLeft)throw Error('Trésorerie insuffisante.');s.money=money(s.money-l.principalLeft);s.totals.repaid=money((s.totals.repaid||0)+l.principalLeft);s.loans=s.loans.filter(x=>x!==l);log(s,`Emprunt remboursé par anticipation : ${l.principalLeft} € · intérêts restants annulés.`);}
function payLoans(s){for(const l of s.loans||[]){const {principal,interest}=loanShare(l);s.money=money(s.money-principal);s.totals.repaid=money((s.totals.repaid||0)+principal);l.principalLeft=money(l.principalLeft-principal);l.interestLeft=money(l.interestLeft-interest);l.daysLeft--;}s.loans=(s.loans||[]).filter(l=>l.principalLeft>0.004||l.interestLeft>0.004);}
export function warehouseCosts(s){const rate=s.workers.filter(w=>!w.robot).length*85+s.workers.filter(w=>w.role==='drivers'&&!w.robot).length*10,wages=money((s.daily.wagesAccrued||0)+rate*Math.max(0,1320-s.minute)/1020);const robots=s.workers.filter(w=>w.robot).length*180,racks=s.products.reduce((n,p)=>n+(p.capacity/240-1)*6,0),equipment=s.benches*12+s.vans.length*35+s.workers.filter(w=>w.role==='receiving').length*palletJack(s).daily;const interest=money((s.loans||[]).reduce((n,l)=>n+loanShare(l).interest,0));return {wages,robots,racks,equipment,rent:120,electricity:35,interest,total:money(wages+robots+racks+equipment+155+interest)};}
export function warehouseStats(s){const active=s.orders.filter(o=>!['delivered'].includes(o.stage));const delivered=s.daily.delivered;const goods=s.products.reduce((n,p)=>n+p.onHand*p.cost,0)+s.orders.filter(o=>o.stage!=='delivered').reduce((n,o)=>n+o.lines.reduce((v,l)=>v+l.picked*s.products.find(p=>p.id===l.productId).cost,0),0)+s.shipments.reduce((n,t)=>n+t.remaining*s.products.find(p=>p.id===t.productId).cost,0)+s.workers.filter(w=>w.role==='receiving').reduce((n,w)=>n+w.cargo*(s.products.find(p=>p.id===w.productId)?.cost||0),0);
 return {active:active.length,queued:active.filter(o=>o.stage==='queued').length,picking:active.filter(o=>o.stage==='picking').length,packing:active.filter(o=>['await_pack','packing'].includes(o.stage)).length,ready:active.filter(o=>o.stage==='ready').length,inTransit:active.filter(o=>o.stage==='in_transit').length,late:active.filter(o=>now(s)>o.deadline).length,blocked:active.filter(o=>o.stage==='queued'&&!canPick(s,o)).length,onTime:delivered?Math.round(s.daily.onTime/delivered*100):100,stockValue:money(goods),costs:warehouseCosts(s),profit:money(s.daily.revenue+s.daily.bonus-s.daily.cogs-s.daily.transport-s.daily.packaging-(s.daily.marketing||0)-warehouseCosts(s).total),cash:s.money};}
export function createWarehouseOrder(s,options={}){
 const plan=FULFILLMENT_PLANS[s.plan],boost=seasonEvent(s.day)?.express??0,channel=options.channel||(r=>r<plan.express+boost?'express':r<plan.express+boost+plan.next?'next':'standard')(random(s)),area=options.area||DELIVERY_AREAS[Math.floor(random(s)*3)].id;
 const lines=options.lines?options.lines.map(l=>({...l,picked:0})):[];
 if(!lines.length){const count=1+(random(s)<.55?1:0)+(random(s)<.15?1:0),pool=[...s.products];for(let i=0;i<count;i++){const p=pool.splice(Math.floor(random(s)*pool.length),1)[0];lines.push({productId:p.id,quantity:1+(random(s)<.3?1:0),picked:0});}}
 if(!lines.length||lines.some(l=>!s.products.some(p=>p.id===l.productId)||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>12)||new Set(lines.map(l=>l.productId)).size!==lines.length)throw Error('Commande invalide.');
 const id=s.nextId++,deadline=options.deadline??now(s)+DELIVERY_PROMISES[channel].minutes,value=money(lines.reduce((n,l)=>n+l.quantity*unitPrice(s,s.products.find(p=>p.id===l.productId)),0)+plan.fee+DELIVERY_PROMISES[channel].fee);
 const o={id,ref:'FX'+String(id).padStart(5,'0'),created:now(s),deadline,channel,area,lines,value,stage:'queued',worker:null,bench:null,remaining:0,deliveredAt:null,late:false,contractId:options.contractId??null};s.orders.push(o);s.daily.accepted++;metric(s).received++;return o;
}
const CHANNEL_RANK={express:0,next:1,standard:2};
function sortedOrders(s,orders){return [...orders].sort((a,b)=>(b.rush?1:0)-(a.rush?1:0)||(s.priority==='express'?CHANNEL_RANK[a.channel]-CHANNEL_RANK[b.channel]:0)||(s.priority==='fifo'?a.created-b.created:a.deadline-b.deadline)||a.id-b.id);}
function canPick(s,o){return o.lines.every(l=>{const p=s.products.find(p=>p.id===l.productId);return p.onHand-p.reserved>=l.quantity;});}
function go(s,w,target,phase){w.target=[...target];w.path=warehouseRoute(s,w.pos,target)||[];w.phase=phase;}
function walk(w){let distance=w.speed??(w.robot?5:3);while(w.path.length&&distance>0){const target=w.path[0],dx=target[0]-w.pos[0],dz=target[1]-w.pos[1],length=Math.hypot(dx,dz);if(length<=distance){w.pos=[...target];w.path.shift();distance-=length;}else{w.pos[0]+=dx/length*distance;w.pos[1]+=dz/length*distance;distance=0;}}return w.path.length===0;}
function idle(w){w.phase='idle';w.job=null;w.target=null;w.path=[];w.remaining=0;w.cargo=0;w.shipment=null;w.productId=null;}
function returnHome(s,w){idle(w);if(w.retiring)return;const peers=s.workers.filter(a=>a.role===w.role&&a.robot===w.robot),i=peers.indexOf(w),home=w.role==='packing'?warehouseAccess(s,'pack:'+Math.min(i,s.benches-1)):w.role==='receiving'?[-13+i*.7,9]:w.robot?[.5+i*1.1,9.5]:[.2+i*.7,8];go(s,w,home,'to_home');}
function pickStep(s,w){
 if(w.phase==='idle'){
  const o=sortedOrders(s,s.orders.filter(o=>o.stage==='queued')).find(o=>canPick(s,o));if(!o)return;
  for(const l of o.lines)s.products.find(p=>p.id===l.productId).reserved+=l.quantity;o.stage='picking';o.worker=w.id;w.job=o.id;w.line=0;go(s,w,warehouseAccess(s,'rack:'+o.lines[0].productId),'to_rack');return;
 }
 const o=s.orders.find(o=>o.id===w.job);if(!o)throw Error('Mission de préparation introuvable.');
 if(w.phase==='to_rack'){if(walk(w)){w.phase='collecting';w.remaining=Math.max(1,o.lines[w.line].quantity*(w.robot?.4:.8));}return;}
 if(w.phase==='collecting'){
  if(--w.remaining>0)return;const l=o.lines[w.line],p=s.products.find(p=>p.id===l.productId);p.onHand-=l.quantity;p.reserved-=l.quantity;l.picked=l.quantity;w.cargo+=l.quantity;w.line++;
  if(w.line<o.lines.length)go(s,w,warehouseAccess(s,'rack:'+o.lines[w.line].productId),'to_rack');else go(s,w,[4.5,6],'to_pack');return;
 }
 // A full conveyor holds the picker at the drop point until a packer frees a place.
 if(w.phase==='to_pack'&&walk(w)&&!conveyorFull(s)){o.stage='await_pack';o.worker=null;returnHome(s,w);}
}
// Receivers move supplier goods by pallet (up to 10 cartons of 24) with a pallet jack, then shelve them carton by carton.
export const PALLET_UNITS=240,CONVEYOR_CAPACITY=12;
// Pallet jack models: bought once for the centre, then any owned model can be put in service; running costs are per receiver and day.
export const PALLET_JACKS={manual:{name:'Transpalette manuel',icon:'🛒',pallets:1,speed:3,load:4,price:0,daily:0},electric:{name:'Transpalette électrique accompagnant',icon:'⚡',pallets:1,speed:4.5,load:3,price:3500,daily:6},rider:{name:'Transpalette à conducteur porté',icon:'🛞',pallets:2,speed:6,load:4,price:12000,daily:12}};
export const palletJack=s=>PALLET_JACKS[s.palletJack??'manual'];
export function setWarehousePalletJack(s,model){const m=PALLET_JACKS[model];if(!m)throw Error('Modèle inconnu.');s.ownedJacks??=['manual'];if(!s.ownedJacks.includes(model)){if(s.money<m.price)throw Error('Trésorerie insuffisante.');s.money=money(s.money-m.price);s.totals.investments=money(s.totals.investments+m.price);s.ownedJacks.push(model);log(s,`${m.name} acheté · ${m.price} €.`);}s.palletJack=model;for(const w of s.workers)if(w.role==='receiving')w.speed=m.speed;log(s,`${m.name} en service à la réception.`);}
export const conveyorFull=s=>s.orders.filter(o=>o.stage==='await_pack').length>=CONVEYOR_CAPACITY;
export const shelvingMinutes=units=>1+Math.ceil(units/24)*.5;
function receiveStep(s,w){
 if(w.phase==='idle'){
  const t=s.shipments.filter(t=>t.eta<=now(s)&&t.remaining>0).find(t=>{const p=s.products.find(p=>p.id===t.productId);const incoming=s.workers.filter(a=>a.role==='receiving'&&a.productId===p.id).reduce((n,a)=>n+a.cargo+(a.phase==='to_truck'||a.phase==='loading'?a.quantity:0),0);return t.remaining-t.reserved>0&&p.capacity-p.onHand-incoming>0;});if(!t)return;
  const p=s.products.find(p=>p.id===t.productId),incoming=s.workers.filter(a=>a.role==='receiving'&&a.productId===p.id).reduce((n,a)=>n+a.cargo+(['to_truck','loading'].includes(a.phase)?a.quantity:0),0),qty=Math.min(PALLET_UNITS*palletJack(s).pallets,t.remaining-t.reserved,p.capacity-p.onHand-incoming);
  if(qty<=0)return;t.reserved+=qty;w.shipment=t.id;w.productId=t.productId;w.quantity=qty;go(s,w,[-12,10],'to_truck');return;
 }
 const t=s.shipments.find(t=>t.id===w.shipment);
 if(w.phase==='to_truck'&&walk(w)){w.phase='loading';w.remaining=palletJack(s).load;return;}
 if(w.phase==='loading'&&--w.remaining<=0){t.remaining-=w.quantity;t.reserved-=w.quantity;w.cargo=w.quantity;go(s,w,warehouseAccess(s,'rack:'+w.productId),'to_stock');return;}
 if(w.phase==='to_stock'&&walk(w)){w.phase='storing';w.remaining=shelvingMinutes(w.cargo);return;}
 if(w.phase==='storing'&&--w.remaining<=0){const p=s.products.find(p=>p.id===w.productId);p.onHand+=w.cargo;p.ordered-=w.cargo;s.receivedUnits+=w.cargo;s.daily.received+=w.cargo;returnHome(s,w);}
}
// Packaging supplies: each parcel uses one carton sized to its content and one length of tape.
export const PACKAGING={S:{name:'Carton S',unit:'cartons',cost:.25,lot:50},M:{name:'Carton M',unit:'cartons',cost:.35,lot:50},L:{name:'Carton L',unit:'cartons',cost:.5,lot:50},tape:{name:'Scotch',unit:'colis',cost:3,lot:6,uses:20}};
export const PACKAGING_START={S:60,M:60,L:30,tape:100},PACKAGING_REORDER={S:12,M:12,L:8,tape:20};
const ITEM_VOLUME={books:.6,tech:.5,beauty:.4,fashion:.9,home:1.4,toys:1.3};
export function cartonType(o){const volume=o.lines.reduce((n,l)=>n+l.quantity*(ITEM_VOLUME[l.productId]??1),0);return volume<=1?'S':volume<=2.6?'M':'L';}
export function packagingQuote(key){const p=PACKAGING[key];if(!p)throw Error('Emballage inconnu.');return {cost:money(p.cost*p.lot),units:key==='tape'?p.lot*p.uses:p.lot};}
export function buyWarehousePackaging(s,key,auto=false){const q=packagingQuote(key);if(s.money<q.cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-q.cost);s.daily.packaging=money(s.daily.packaging+q.cost);s.totals.packaging=money(s.totals.packaging+q.cost);s.supplies[key]+=q.units;if(auto)log(s,`Réassort automatique : ${PACKAGING[key].name} · ${q.cost} €.`);}
export function missingPackaging(s){return [...new Set(s.orders.filter(o=>o.stage==='await_pack'&&o.worker===null&&(s.supplies[cartonType(o)]<=0||s.supplies.tape<=0)).map(o=>s.supplies.tape<=0?'tape':cartonType(o)))];}
// Automatic restocking rules set by the player: a trigger level and what to order when stock falls below it.
export const RESTOCK_DEFAULT={enabled:false,trigger:48,quantity:240,express:false};
export const supplyRule=(s,key)=>s.supplyRules?.[key]??{trigger:PACKAGING_REORDER[key],lots:1};
export const restockRule=(s,id)=>({...RESTOCK_DEFAULT,...s.restock?.[id]});
export function setWarehouseRestock(s,id,rule){const p=s.products.find(p=>p.id===id);if(!p)throw Error('Produit inconnu.');const r={...restockRule(s,id),...rule};
 if(typeof r.enabled!=='boolean'||typeof r.express!=='boolean'||!Number.isInteger(r.trigger)||r.trigger<0||r.trigger>960||!Number.isInteger(r.quantity)||r.quantity<24||r.quantity>960||r.quantity%24)throw Error('Réglage de réassort invalide : seuil de 0 à 960, commande par cartons de 24 jusqu’à 960.');
 s.restock??={};s.restock[id]=r;}
export function setWarehouseSupplyRule(s,key,rule){if(!PACKAGING[key])throw Error('Emballage inconnu.');const r={...supplyRule(s,key),...rule};if(!Number.isInteger(r.trigger)||r.trigger<0||r.trigger>2000||!Number.isInteger(r.lots)||r.lots<1||r.lots>10)throw Error('Réglage invalide : seuil de 0 à 2000, 1 à 10 lots.');s.supplyRules??={};s.supplyRules[key]=r;}
// Goods already on their way count, so a rule never orders twice for the same shortage; orders are trimmed to the free rack places.
function restockGoods(s){for(const p of s.products){const r=restockRule(s,p.id);if(!r.enabled||p.onHand-p.reserved+p.ordered>=r.trigger)continue;const qty=Math.min(r.quantity,Math.floor((p.capacity-p.onHand-p.ordered)/24)*24);if(qty<24||s.money<quoteWarehouseSupply(s,p.id,qty,r.express).total)continue;const q=buyWarehouseSupply(s,p.id,qty,r.express);log(s,`Réassort automatique : ${qty} ${p.short} · arrivée ${Math.floor(q.eta/1440)+1===s.day?'aujourd’hui':'demain'} à ${String(Math.floor(q.eta%1440/60)).padStart(2,'0')}:${String(q.eta%60).padStart(2,'0')}.`);}}
function restockPackaging(s){if(!s.autoSupplies)return;for(const key of Object.keys(PACKAGING)){const r=supplyRule(s,key);if(s.supplies[key]>=r.trigger)continue;for(let i=0;i<r.lots&&s.money>=packagingQuote(key).cost;i++)buyWarehousePackaging(s,key,true);}}
// Packers fetch the tote at the end of the conveyor, pack it at their bench, then carry the parcel to the shipping area.
export const PACK_PICKUP=[6,-.4],PACK_DROP=[5.9,6.6];
export const packingMinutes=o=>2+o.lines.reduce((n,l)=>n+l.quantity,0)*.4;
function packStep(s,w){
 if(w.phase==='idle'||w.phase==='to_home'){
  const bench=Array.from({length:s.benches},(_,i)=>i).find(i=>!s.workers.some(other=>other!==w&&other.role==='packing'&&!['idle','to_home'].includes(other.phase)&&other.bench===i));if(bench===undefined)return;
  const o=sortedOrders(s,s.orders.filter(o=>o.stage==='await_pack'&&o.worker===null&&s.supplies[cartonType(o)]>0&&s.supplies.tape>0))[0];if(!o)return;s.supplies[cartonType(o)]--;s.supplies.tape--;idle(w);w.job=o.id;w.bench=bench;o.worker=w.id;o.bench=bench;go(s,w,PACK_PICKUP,'to_pickup');return;
 }
 const o=s.orders.find(o=>o.id===w.job);
 if(w.phase==='to_pickup'&&walk(w)){o.stage='packing';w.cargo=o.lines.reduce((n,l)=>n+l.quantity,0);go(s,w,warehouseAccess(s,'pack:'+w.bench),'to_bench');return;}
 if(w.phase==='to_bench'&&walk(w)){w.phase='packing';w.remaining=packingMinutes(o);return;}
 if(w.phase==='packing'&&--w.remaining<=0){go(s,w,PACK_DROP,'to_staging');return;}
 if(w.phase==='to_staging'&&walk(w)){o.stage='ready';o.readyAt=now(s);const took=o.readyAt-o.created,m=metric(s);m.processSum+=took;m.processed++;s.daily.processSum=(s.daily.processSum||0)+took;s.daily.processed=(s.daily.processed||0)+1;o.worker=null;o.bench=null;returnHome(s,w);}
}
function deliver(s,o){o.stage='delivered';o.deliveredAt=now(s);o.late=now(s)>o.deadline;const cost=o.lines.reduce((n,l)=>n+l.quantity*s.products.find(p=>p.id===l.productId).cost,0),revenue=money(o.value*(o.late?.8:1));o.paid=revenue;s.money=money(s.money+revenue);s.daily.revenue=money(s.daily.revenue+revenue);s.totals.revenue=money(s.totals.revenue+revenue);s.daily.cogs=money(s.daily.cogs+cost);s.totals.cogs=money(s.totals.cogs+cost);s.daily.delivered++;s.daily[o.late?'late':'onTime']++;{const m=metric(s);m.delivered++;if(o.late)m.late++;m.revenue=money(m.revenue+revenue);m.cogs=money(m.cogs+cost);}s.reputation=Math.max(0,Math.min(100,s.reputation+(o.late?-1.2:.12)));for(const l of o.lines){s.products.find(p=>p.id===l.productId).sold+=l.quantity;s.soldUnits+=l.quantity;}}
export function dispatchWarehouse(s,force=true){
 const v=s.vans.find(v=>v.phase==='idle'),driver=s.workers.find(w=>w.role==='drivers'&&w.phase==='idle'&&!w.retiring),ready=sortedOrders(s,s.orders.filter(o=>o.stage==='ready'&&!o.courier));
 if(!v||!driver||!ready.length){if(force)throw Error(!ready.length?'Aucun colis prêt.':!v?'Toutes les camionnettes sont en tournée.':'Aucun chauffeur disponible.');return false;}
 const first=ready[0],same=ready.filter(o=>o.area===first.area),orders=(s.priority==='sector'?same:ready).slice(0,v.capacity),areas=new Set(orders.map(o=>o.area)),duration=Math.max(...orders.map(o=>DELIVERY_AREAS.find(a=>a.id===o.area).minutes))+(areas.size-1)*8;
 const cost=money(22+orders.length*.8);s.money=money(s.money-cost);s.daily.transport=money(s.daily.transport+cost);s.totals.transport=money(s.totals.transport+cost);
 Object.assign(v,{phase:'loading',remaining:3,orders:orders.map(o=>o.id),driver:driver.id,area:first.area,started:now(s),duration});driver.phase='driving';driver.job=v.id;for(const o of orders)o.stage='in_transit';s.lastDispatch=now(s);log(s,`${orders.length} colis embarqués · tournée ${DELIVERY_AREAS.find(a=>a.id===first.area).name}.`);return true;
}
// Player levers on one order: jump the queue at every stage, or book a courier who collects the parcel as soon as it is packed.
export const WH_COURIER={base:15,perItem:1,minutes:20};
export const courierCost=o=>money(WH_COURIER.base+o.lines.reduce((n,l)=>n+l.quantity,0)*WH_COURIER.perItem);
export function toggleWarehouseRush(s,id){const o=s.orders.find(o=>o.id===id);if(!o||['in_transit','delivered'].includes(o.stage))throw Error('Cette commande est déjà partie.');o.rush=!o.rush;log(s,o.rush?`${o.ref} passe en priorité.`:`${o.ref} n’est plus prioritaire.`);}
export function bookWarehouseCourier(s,id){const o=s.orders.find(o=>o.id===id);if(!o||['in_transit','delivered'].includes(o.stage))throw Error('Cette commande est déjà partie.');if(o.courier)throw Error('Un coursier est déjà réservé.');const cost=courierCost(o);if(s.money<cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-cost);s.daily.transport=money(s.daily.transport+cost);s.totals.transport=money(s.totals.transport+cost);o.courier=true;o.rush=true;log(s,`Coursier réservé pour ${o.ref} · ${cost} €.`);}
function couriersStep(s){for(const o of s.orders){if(!o.courier)continue;if(o.stage==='ready'){o.stage='in_transit';o.courierEta=now(s)+WH_COURIER.minutes;}else if(o.stage==='in_transit'&&o.courierEta!==undefined&&now(s)>=o.courierEta){deliver(s,o);log(s,`${o.ref} livré par coursier.`,'success');checkContracts(s);}}}
function vansStep(s){for(const v of s.vans){if(v.phase==='idle')continue;if(--v.remaining>0)continue;if(v.phase==='loading'){v.phase='outbound';v.remaining=v.duration;v.started=now(s);}else if(v.phase==='outbound'){for(const id of v.orders)deliver(s,s.orders.find(o=>o.id===id));log(s,`${v.orders.length} colis livrés · ${s.orders.filter(o=>v.orders.includes(o.id)).reduce((n,o)=>n+o.paid,0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}.`,'success');v.phase='returning';v.remaining=20;checkContracts(s);}else{const driver=s.workers.find(w=>w.id===v.driver);if(driver)idle(driver);Object.assign(v,{phase:'idle',remaining:0,orders:[],driver:null});}}}
export function quoteWarehouseSupply(s,productId,quantity,express=false){const p=s.products.find(p=>p.id===productId);if(!p||!Number.isInteger(quantity)||quantity<24||quantity>960||quantity%24)throw Error('Commandez par cartons de 24, jusqu’à 960 articles.');const goods=money(p.cost*quantity),fee=money((express?95:30)+(express?goods*.16:0));return {goods,fee,total:money(goods+fee),eta:express?now(s)+45:((s.minute<390)?(s.day-1)*1440+390:s.day*1440+390)};}
export function buyWarehouseSupply(s,productId,quantity,express=false){const q=quoteWarehouseSupply(s,productId,quantity,express);if(s.money<q.total)throw Error('Trésorerie insuffisante.');s.money=money(s.money-q.total);s.daily.purchases=money(s.daily.purchases+q.goods);s.totals.purchases=money(s.totals.purchases+q.goods);s.daily.transport=money(s.daily.transport+q.fee);s.totals.transport=money(s.totals.transport+q.fee);s.products.find(p=>p.id===productId).ordered+=quantity;s.shipments.push({id:s.nextId++,productId,quantity,remaining:quantity,reserved:0,eta:q.eta,express,cost:q.goods});log(s,`${quantity} articles commandés · ${s.products.find(p=>p.id===productId).name}.`);return q;}
export function setWarehouseStaff(s,role,count){if(!WAREHOUSE_ROLES[role]||!Number.isInteger(count)||count<0||count>WH_LIMITS.staff)throw Error('Effectif invalide.');s.staff[role]=count;const people=s.workers.filter(w=>w.role===role&&!w.robot);people.forEach((w,i)=>w.retiring=i>=count);for(let i=people.length;i<count;i++)s.workers.push(worker(s,role));s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');}
export function setWarehouseRobots(s,count){if(!Number.isInteger(count)||count<0||count>WH_LIMITS.robots)throw Error('Flotte invalide.');const robots=s.workers.filter(w=>w.robot),extra=Math.max(0,count-robots.length),cost=extra*WH_ROBOT.cost;if(s.money<cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-cost);s.totals.investments=money(s.totals.investments+cost);s.robotTarget=count;robots.forEach((w,i)=>w.retiring=i>=count);for(let i=robots.length;i<count;i++)s.workers.push(worker(s,'picking',true));s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');}
export function upgradeWarehouse(s,kind,productId){let cost;
 if(kind==='rack'){const p=s.products.find(p=>p.id===productId);if(!p||p.capacity>=WH_LIMITS.rackCapacity)throw Error('Capacité maximale atteinte.');cost=650;}
 else if(kind==='bench'){if(s.benches>=WH_LIMITS.benches)throw Error(`${WH_LIMITS.benches} postes maximum.`);cost=1800;}
 else if(kind==='van'){if(s.vans.length>=WH_LIMITS.vans)throw Error(`${WH_LIMITS.vans} véhicules maximum.`);cost=8000;}else throw Error('Équipement inconnu.');
 if(s.money<cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-cost);s.totals.investments=money(s.totals.investments+cost);
 if(kind==='rack')s.products.find(p=>p.id===productId).capacity+=240;if(kind==='bench')s.benches++;if(kind==='van')s.vans.push({id:s.nextId++,capacity:12,phase:'idle',remaining:0,orders:[],driver:null,area:null,started:0,duration:0});return cost;
}
export function setWarehousePolicy(s,key,value){if(key==='plan'&&FULFILLMENT_PLANS[value]||key==='priority'&&['deadline','express','fifo','sector'].includes(value)||key==='margin'&&Number.isInteger(Number(value))&&Number(value)>=PRICING.minMargin&&Number(value)<=PRICING.maxMargin||key==='adBudget'&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=PRICING.maxAdBudget&&Number(value)%50===0||key==='autoSupplies'&&typeof value==='boolean'||key==='dispatchEvery'&&[30,60,120].includes(Number(value)))s[key]=['dispatchEvery','margin','adBudget'].includes(key)?Number(value):value;else if(key==='acceptOrders'&&typeof value==='boolean')s.acceptOrders=value;else throw Error('Réglage invalide.');}
function createContracts(s){s.contracts=[{id:s.nextId++,name:'La librairie du quartier',description:'8 commandes de 2 livres',productId:'books',quantity:2,count:8,opens:now(s),expires:(s.day-1)*1440+660,deadline:(s.day-1)*1440+900,bonus:160,status:'offered',orders:[]},{id:s.nextId++,name:'Cadeaux de dernière minute',description:'10 commandes de 2 jeux',productId:'toys',quantity:2,count:10,opens:(s.day-1)*1440+720,expires:(s.day-1)*1440+960,deadline:(s.day-1)*1440+1200,bonus:240,status:'offered',orders:[]}];}
export function acceptWarehouseContract(s,id){const c=s.contracts.find(c=>c.id===id);if(!c||c.status!=='offered'||now(s)<c.opens||now(s)>c.expires)throw Error('Cette commande client pro n’est plus disponible.');c.status='accepted';for(let i=0;i<c.count;i++)c.orders.push(createWarehouseOrder(s,{lines:[{productId:c.productId,quantity:c.quantity}],deadline:c.deadline,channel:'express',contractId:c.id}).id);log(s,`Commande client pro acceptée : ${c.name}.`);}
function checkContracts(s){for(const c of s.contracts.filter(c=>c.status==='accepted')){const orders=c.orders.map(id=>s.orders.find(o=>o.id===id));if(orders.every(o=>o.stage==='delivered')){c.status=orders.every(o=>!o.late)?'completed':'failed';if(c.status==='completed'){s.money=money(s.money+c.bonus);s.daily.bonus+=c.bonus;s.totals.bonus+=c.bonus;log(s,`Commande pro réussie : ${c.name} · prime ${c.bonus} €.`, 'success');}}}}
export function moveWarehouseFixture(s,key,x,z,rotation=0){if(!warehouseFixtures(s).includes(key)||![x,z,rotation].every(Number.isFinite)||!([0,Math.PI/2].some(r=>Math.abs(r-rotation)<.001)))throw Error('Position invalide.');const old=s.layout[key];s.layout[key]={x:Math.round(x*2)/2,z:Math.round(z*2)/2,rotation};const p=warehouseFootprint(s,key);const collision=warehouseFixtures(s).some(other=>{if(other===key)return false;const a=warehouseFootprint(s,other);return Math.abs(a.x-p.x)<(a.w+p.w)/2+.6&&Math.abs(a.z-p.z)<(a.d+p.d)/2+.6;});const inside=p.x-p.w/2>=-14.5&&p.x+p.w/2<=14.5&&p.z-p.d/2>=-8&&p.z+p.d/2<=7;
 if(collision||!inside||warehouseFixtures(s).some(k=>!warehouseRoute(s,[1,9],warehouseAccess(s,k)))){if(old)s.layout[key]=old;else delete s.layout[key];throw Error('Laissez une allée libre autour des équipements et des quais.');}
 for(const w of s.workers){if(w.phase==='to_home'&&w.target){go(s,w,w.target,'to_home');continue;}if(!warehouseWalkable(s,...w.pos)){const escape=warehouseRoute(s,w.pos,[1,9]);if(escape?.length)w.pos=[...escape[0]];}if(['to_rack','collecting'].includes(w.phase)&&key==='rack:'+s.orders.find(o=>o.id===w.job)?.lines[w.line]?.productId)go(s,w,warehouseAccess(s,key),'to_rack');else if(w.phase==='to_rack')go(s,w,warehouseAccess(s,'rack:'+s.orders.find(o=>o.id===w.job).lines[w.line].productId),w.phase);else if(['to_stock','storing'].includes(w.phase))go(s,w,warehouseAccess(s,'rack:'+w.productId),'to_stock');else if(['to_bench','packing'].includes(w.phase)&&key==='pack:'+w.bench)go(s,w,warehouseAccess(s,key),'to_bench');else if(w.phase==='to_bench')go(s,w,warehouseAccess(s,'pack:'+w.bench),w.phase);else if(['to_pickup','to_staging'].includes(w.phase))go(s,w,w.target,w.phase);}return s.layout[key];}
function closeWarehouseDay(s){const costs=warehouseCosts(s);s.money=money(s.money-costs.total);payLoans(s);s.daily.charges=costs.total;s.totals.charges=money(s.totals.charges+costs.total);const stats=warehouseStats(s);s.history.unshift({day:s.day,...s.daily,profit:money(s.daily.revenue+s.daily.bonus-s.daily.cogs-s.daily.transport-s.daily.packaging-(s.daily.marketing||0)-costs.total),cash:s.money,stockValue:stats.stockValue});s.history=s.history.slice(0,60);s.day++;s.minute=300;s.dayStartCash=s.money;s.daily=freshDay();s.arrivalCredit=0;
 // Keep accepted contracts and all active jobs across the night.
 s.contracts=s.contracts.filter(c=>c.status==='accepted');const outstanding=s.contracts;createContracts(s);s.contracts=[...outstanding,...s.contracts];s.orders=s.orders.filter(o=>o.stage!=='delivered'||outstanding.some(c=>c.orders.includes(o.id))||o.deliveredAt>=now(s)-2880);s.shipments=s.shipments.filter(t=>t.remaining>0||s.workers.some(w=>w.shipment===t.id));log(s,`Jour ${s.day} · charges réglées : ${costs.total} €.`, 'info');announceSeason(s);}
export function advanceWarehouse(s,minutes){if(!Number.isInteger(minutes)||minutes<0||minutes>2880)throw Error('Durée invalide.');for(let n=0;n<minutes;n++){
 s.minute++;const time=now(s);s.daily.wagesAccrued=(s.daily.wagesAccrued||0)+s.workers.filter(w=>!w.robot).reduce((n,w)=>n+WAREHOUSE_ROLES[w.role].wage,0)/1020;vansStep(s);couriersStep(s);restockPackaging(s);restockGoods(s);spendAdvertising(s);if(s.promo&&!promoActive(s)){s.promo=null;log(s,'Fin de la promotion.');}
 for(const w of s.workers){if(w.retiring&&w.phase==='idle')continue;if(w.phase==='to_home'){if(walk(w))idle(w);if(w.role!=='packing')continue;}if(w.role==='receiving')receiveStep(s,w);else if(w.role==='picking')pickStep(s,w);else if(w.role==='packing')packStep(s,w);}
 s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');
 if(time-s.lastDispatch>=s.dispatchEvery)dispatchWarehouse(s,false);
 if(s.acceptOrders&&s.minute>=480&&s.minute<1080){const peak=s.minute>=540&&s.minute<660?1.75:s.minute>=960&&s.minute<1080?1.6:1;s.arrivalCredit+=FULFILLMENT_PLANS[s.plan].rate*peak*warehouseDemand(s).factor*(0.85+random(s)*.3);while(s.arrivalCredit>=1&&s.orders.filter(o=>o.stage!=='delivered').length<WH_LIMITS.activeOrders){s.arrivalCredit--;createWarehouseOrder(s);}}
 for(const c of s.contracts)if(c.status==='offered'&&now(s)>c.expires)c.status='expired';if(s.minute===540)log(s,'Vague du matin : davantage de commandes jusqu’à 11 h.');if(s.minute===960)log(s,'Dernière vague : anticipez les départs express.');if(s.minute>=1320)closeWarehouseDay(s);
 }}
