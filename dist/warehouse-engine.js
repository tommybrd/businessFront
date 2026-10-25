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
export const FULFILLMENT_PLANS={standard:{name:'Standard',rate:.105,express:.22,fee:5},express:{name:'Priorité express',rate:.12,express:.65,fee:7},volume:{name:'Volume',rate:.16,express:.12,fee:3.5}};
export const DELIVERY_AREAS=[{id:'north',name:'Nord',minutes:30},{id:'east',name:'Est',minutes:40},{id:'west',name:'Ouest',minutes:50}];
export const WH_ROBOT={cost:18000,maintenance:160,electricity:20,limit:8};
const money=n=>Math.round(n*100)/100,now=s=>(s.day-1)*1440+s.minute;
export {now as warehouseNow};
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function log(s,text,tone='info'){s.log.unshift({at:now(s),text,tone});s.log=s.log.slice(0,45);}
const freshDay=()=>({received:0,accepted:0,delivered:0,onTime:0,late:0,revenue:0,cogs:0,purchases:0,transport:0,packaging:0,bonus:0,charges:0,wagesAccrued:0});
function worker(s,role,robot=false){const i=s.workers.filter(w=>w.role===role&&w.robot===robot).length;const position=role==='receiving'?[-12+i*.7,9]:role==='packing'?warehouseAccess(s,'pack:'+Math.min(i,s.benches-1)):role==='drivers'?[11+i*.7,9]:[1+i*.6,8];return {id:s.nextId++,role,robot,retiring:false,phase:'idle',job:null,pos:position,path:[],target:null,remaining:0,cargo:0,shipment:null,line:0};}
export function createWarehouseGame(seed=7351){
 const s={kind:'fulfillment',version:1,seed:seed>>>0,day:1,minute:360,speed:0,nextId:1,money:25000,initialCash:25000,receivedUnits:0,soldUnits:0,startingUnits:576,reputation:96,plan:'standard',acceptOrders:true,priority:'deadline',dispatchEvery:60,lastDispatch:-1000,benches:1,layout:{},workers:[],staff:{receiving:1,picking:2,packing:1,drivers:1},robotTarget:0,products:CATALOG.map(p=>({...p,onHand:p.initial,reserved:0,capacity:240,ordered:0,sold:0})),orders:[],shipments:[],vans:[],contracts:[],history:[],log:[],daily:freshDay(),totals:{revenue:0,cogs:0,purchases:0,transport:0,packaging:0,bonus:0,charges:0,investments:0},arrivalCredit:0,dayStartCash:25000};
 for(const [role,count]of Object.entries(s.staff))for(let i=0;i<count;i++)s.workers.push(worker(s,role));s.vans.push({id:s.nextId++,capacity:12,phase:'idle',remaining:0,orders:[],driver:null,area:null,started:0,duration:0});
 createContracts(s);for(let i=0;i<4;i++)createWarehouseOrder(s,{channel:i===0?'express':'standard'});
 log(s,'Le centre est opérationnel. Première vague de commandes en préparation.','success');return s;
}
export function migrateWarehouseGame(record,legacyStockValue=null){
 if(record.schemaVersion===2&&record.state.kind==='fulfillment')return structuredClone(record.state);
 const old=record.state,s=createWarehouseGame(old.seed);let assets=0;
 for(const [i,p]of old.products.entries()){const cost=old.inventoryAccounting?.unitCosts?.[i]??p.cost/1.2;assets+=(p.shelf+p.reserve)*cost;}
 for(const w of old.restockers||[])assets+=(w.load||0)*(old.products.find(p=>p.id===w.productId)?.cost||2)/1.2;
 for(const o of old.orders||[])if(o.status!=='received')assets+=(o.pallets||[]).reduce((n,p)=>n+p.remaining,0)*(old.products.find(p=>p.id===o.productId)?.cost||2)/1.2;
 if(Number.isFinite(legacyStockValue)&&legacyStockValue>=0)assets=legacyStockValue;
 const debt=(old.supplierPayments?.invoices||[]).reduce((n,i)=>n+i.remaining,0),net=money(old.money+assets-debt),support=money(Math.max(0,25000-net));
 s.money=money(net+support);s.initialCash=s.money;s.dayStartCash=s.money;s.legacyArchive=structuredClone(record);s.transition={cash:old.money,assets:money(assets),debt:money(debt),support,day:old.day};
 log(s,`Reconversion du magasin : ancienne partie archivée, capital disponible ${s.money.toLocaleString('fr-FR')} €.`, 'success');return s;
}
export function warehouseCosts(s){const rate=s.workers.filter(w=>!w.robot).length*85+s.workers.filter(w=>w.role==='drivers'&&!w.robot).length*10,wages=money((s.daily.wagesAccrued||0)+rate*Math.max(0,1320-s.minute)/1020);const robots=s.workers.filter(w=>w.robot).length*180,racks=s.products.reduce((n,p)=>n+(p.capacity/240-1)*6,0),equipment=s.benches*12+s.vans.length*35;return {wages,robots,racks,equipment,rent:120,electricity:35,total:money(wages+robots+racks+equipment+155)};}
export function warehouseStats(s){const active=s.orders.filter(o=>!['delivered'].includes(o.stage));const delivered=s.daily.delivered;const goods=s.products.reduce((n,p)=>n+p.onHand*p.cost,0)+s.orders.filter(o=>o.stage!=='delivered').reduce((n,o)=>n+o.lines.reduce((v,l)=>v+l.picked*s.products.find(p=>p.id===l.productId).cost,0),0)+s.shipments.reduce((n,t)=>n+t.remaining*s.products.find(p=>p.id===t.productId).cost,0)+s.workers.filter(w=>w.role==='receiving').reduce((n,w)=>n+w.cargo*(s.products.find(p=>p.id===w.productId)?.cost||0),0);
 return {active:active.length,queued:active.filter(o=>o.stage==='queued').length,picking:active.filter(o=>o.stage==='picking').length,packing:active.filter(o=>['await_pack','packing'].includes(o.stage)).length,ready:active.filter(o=>o.stage==='ready').length,inTransit:active.filter(o=>o.stage==='in_transit').length,late:active.filter(o=>now(s)>o.deadline).length,blocked:active.filter(o=>o.stage==='queued'&&!canPick(s,o)).length,onTime:delivered?Math.round(s.daily.onTime/delivered*100):100,stockValue:money(goods),costs:warehouseCosts(s),profit:money(s.daily.revenue+s.daily.bonus-s.daily.cogs-s.daily.transport-s.daily.packaging-warehouseCosts(s).total),cash:s.money};}
export function createWarehouseOrder(s,options={}){
 const plan=FULFILLMENT_PLANS[s.plan],channel=options.channel||(random(s)<plan.express?'express':'standard'),area=options.area||DELIVERY_AREAS[Math.floor(random(s)*3)].id;
 const lines=options.lines?options.lines.map(l=>({...l,picked:0})):[];
 if(!lines.length){const count=1+(random(s)<.55?1:0)+(random(s)<.15?1:0),pool=[...s.products];for(let i=0;i<count;i++){const p=pool.splice(Math.floor(random(s)*pool.length),1)[0];lines.push({productId:p.id,quantity:1+(random(s)<.3?1:0),picked:0});}}
 if(!lines.length||lines.some(l=>!s.products.some(p=>p.id===l.productId)||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>12)||new Set(lines.map(l=>l.productId)).size!==lines.length)throw Error('Commande invalide.');
 const id=s.nextId++,deadline=options.deadline??now(s)+(channel==='express'?150:300),value=money(lines.reduce((n,l)=>n+l.quantity*s.products.find(p=>p.id===l.productId).price,0)+(channel==='express'?9:plan.fee));
 const o={id,ref:'FX'+String(id).padStart(5,'0'),created:now(s),deadline,channel,area,lines,value,stage:'queued',worker:null,bench:null,remaining:0,deliveredAt:null,late:false,contractId:options.contractId??null};s.orders.push(o);s.daily.accepted++;return o;
}
function sortedOrders(s,orders){return [...orders].sort((a,b)=>(s.priority==='express'?(a.channel==='express'?0:1)-(b.channel==='express'?0:1):0)||(s.priority==='fifo'?a.created-b.created:a.deadline-b.deadline)||a.id-b.id);}
function canPick(s,o){return o.lines.every(l=>{const p=s.products.find(p=>p.id===l.productId);return p.onHand-p.reserved>=l.quantity;});}
function go(s,w,target,phase){w.target=[...target];w.path=warehouseRoute(s,w.pos,target)||[];w.phase=phase;}
function walk(w){let distance=w.robot?5:3;while(w.path.length&&distance>0){const target=w.path[0],dx=target[0]-w.pos[0],dz=target[1]-w.pos[1],length=Math.hypot(dx,dz);if(length<=distance){w.pos=[...target];w.path.shift();distance-=length;}else{w.pos[0]+=dx/length*distance;w.pos[1]+=dz/length*distance;distance=0;}}return w.path.length===0;}
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
 if(w.phase==='to_pack'&&walk(w)){o.stage='await_pack';o.worker=null;returnHome(s,w);}
}
function receiveStep(s,w){
 if(w.phase==='idle'){
  const t=s.shipments.filter(t=>t.eta<=now(s)&&t.remaining>0).find(t=>{const p=s.products.find(p=>p.id===t.productId);const incoming=s.workers.filter(a=>a.role==='receiving'&&a.productId===p.id).reduce((n,a)=>n+a.cargo+(a.phase==='to_truck'||a.phase==='loading'?a.quantity:0),0);return t.remaining-t.reserved>0&&p.capacity-p.onHand-incoming>0;});if(!t)return;
  const p=s.products.find(p=>p.id===t.productId),incoming=s.workers.filter(a=>a.role==='receiving'&&a.productId===p.id).reduce((n,a)=>n+a.cargo+(['to_truck','loading'].includes(a.phase)?a.quantity:0),0),qty=Math.min(48,t.remaining-t.reserved,p.capacity-p.onHand-incoming);
  if(qty<=0)return;t.reserved+=qty;w.shipment=t.id;w.productId=t.productId;w.quantity=qty;go(s,w,[-12,10],'to_truck');return;
 }
 const t=s.shipments.find(t=>t.id===w.shipment);
 if(w.phase==='to_truck'&&walk(w)){w.phase='loading';w.remaining=3;return;}
 if(w.phase==='loading'&&--w.remaining<=0){t.remaining-=w.quantity;t.reserved-=w.quantity;w.cargo=w.quantity;go(s,w,warehouseAccess(s,'rack:'+w.productId),'to_stock');return;}
 if(w.phase==='to_stock'&&walk(w)){const p=s.products.find(p=>p.id===w.productId);p.onHand+=w.cargo;p.ordered-=w.cargo;s.receivedUnits+=w.cargo;s.daily.received+=w.cargo;returnHome(s,w);}
}
// Packers fetch the tote at the end of the conveyor, pack it at their bench, then carry the parcel to the shipping area.
export const PACK_PICKUP=[6,-.4],PACK_DROP=[5.9,6.6];
export const packingMinutes=o=>2+o.lines.reduce((n,l)=>n+l.quantity,0)*.4;
function packStep(s,w){
 if(w.phase==='idle'||w.phase==='to_home'){
  const bench=Array.from({length:s.benches},(_,i)=>i).find(i=>!s.workers.some(other=>other!==w&&other.role==='packing'&&!['idle','to_home'].includes(other.phase)&&other.bench===i));if(bench===undefined)return;
  const o=sortedOrders(s,s.orders.filter(o=>o.stage==='await_pack'&&o.worker===null))[0];if(!o)return;idle(w);w.job=o.id;w.bench=bench;o.worker=w.id;o.bench=bench;go(s,w,PACK_PICKUP,'to_pickup');return;
 }
 const o=s.orders.find(o=>o.id===w.job);
 if(w.phase==='to_pickup'&&walk(w)){o.stage='packing';w.cargo=o.lines.reduce((n,l)=>n+l.quantity,0);go(s,w,warehouseAccess(s,'pack:'+w.bench),'to_bench');return;}
 if(w.phase==='to_bench'&&walk(w)){w.phase='packing';w.remaining=packingMinutes(o);return;}
 if(w.phase==='packing'&&--w.remaining<=0){s.money=money(s.money-.6);s.daily.packaging=money(s.daily.packaging+.6);s.totals.packaging=money(s.totals.packaging+.6);go(s,w,PACK_DROP,'to_staging');return;}
 if(w.phase==='to_staging'&&walk(w)){o.stage='ready';o.worker=null;o.bench=null;returnHome(s,w);}
}
function deliver(s,o){o.stage='delivered';o.deliveredAt=now(s);o.late=now(s)>o.deadline;const cost=o.lines.reduce((n,l)=>n+l.quantity*s.products.find(p=>p.id===l.productId).cost,0),revenue=money(o.value*(o.late?.8:1));o.paid=revenue;s.money=money(s.money+revenue);s.daily.revenue=money(s.daily.revenue+revenue);s.totals.revenue=money(s.totals.revenue+revenue);s.daily.cogs=money(s.daily.cogs+cost);s.totals.cogs=money(s.totals.cogs+cost);s.daily.delivered++;s.daily[o.late?'late':'onTime']++;s.reputation=Math.max(0,Math.min(100,s.reputation+(o.late?-1.2:.12)));for(const l of o.lines){s.products.find(p=>p.id===l.productId).sold+=l.quantity;s.soldUnits+=l.quantity;}}
export function dispatchWarehouse(s,force=true){
 const v=s.vans.find(v=>v.phase==='idle'),driver=s.workers.find(w=>w.role==='drivers'&&w.phase==='idle'&&!w.retiring),ready=sortedOrders(s,s.orders.filter(o=>o.stage==='ready'));
 if(!v||!driver||!ready.length){if(force)throw Error(!ready.length?'Aucun colis prêt.':!v?'Toutes les camionnettes sont en tournée.':'Aucun chauffeur disponible.');return false;}
 const first=ready[0],same=ready.filter(o=>o.area===first.area),orders=(s.priority==='sector'?same:ready).slice(0,v.capacity),areas=new Set(orders.map(o=>o.area)),duration=Math.max(...orders.map(o=>DELIVERY_AREAS.find(a=>a.id===o.area).minutes))+(areas.size-1)*8;
 const cost=money(22+orders.length*.8);s.money=money(s.money-cost);s.daily.transport=money(s.daily.transport+cost);s.totals.transport=money(s.totals.transport+cost);
 Object.assign(v,{phase:'loading',remaining:3,orders:orders.map(o=>o.id),driver:driver.id,area:first.area,started:now(s),duration});driver.phase='driving';driver.job=v.id;for(const o of orders)o.stage='in_transit';s.lastDispatch=now(s);log(s,`${orders.length} colis embarqués · tournée ${DELIVERY_AREAS.find(a=>a.id===first.area).name}.`);return true;
}
function vansStep(s){for(const v of s.vans){if(v.phase==='idle')continue;if(--v.remaining>0)continue;if(v.phase==='loading'){v.phase='outbound';v.remaining=v.duration;v.started=now(s);}else if(v.phase==='outbound'){for(const id of v.orders)deliver(s,s.orders.find(o=>o.id===id));log(s,`${v.orders.length} colis livrés · ${s.orders.filter(o=>v.orders.includes(o.id)).reduce((n,o)=>n+o.paid,0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}.`,'success');v.phase='returning';v.remaining=20;checkContracts(s);}else{const driver=s.workers.find(w=>w.id===v.driver);if(driver)idle(driver);Object.assign(v,{phase:'idle',remaining:0,orders:[],driver:null});}}}
export function quoteWarehouseSupply(s,productId,quantity,express=false){const p=s.products.find(p=>p.id===productId);if(!p||!Number.isInteger(quantity)||quantity<24||quantity>960||quantity%24)throw Error('Commandez par cartons de 24, jusqu’à 960 articles.');const goods=money(p.cost*quantity),fee=money((express?95:30)+(express?goods*.16:0));return {goods,fee,total:money(goods+fee),eta:express?now(s)+45:((s.minute<390)?(s.day-1)*1440+390:s.day*1440+390)};}
export function buyWarehouseSupply(s,productId,quantity,express=false){const q=quoteWarehouseSupply(s,productId,quantity,express);if(s.money<q.total)throw Error('Trésorerie insuffisante.');s.money=money(s.money-q.total);s.daily.purchases=money(s.daily.purchases+q.goods);s.totals.purchases=money(s.totals.purchases+q.goods);s.daily.transport=money(s.daily.transport+q.fee);s.totals.transport=money(s.totals.transport+q.fee);s.products.find(p=>p.id===productId).ordered+=quantity;s.shipments.push({id:s.nextId++,productId,quantity,remaining:quantity,reserved:0,eta:q.eta,express,cost:q.goods});log(s,`${quantity} articles commandés · ${s.products.find(p=>p.id===productId).name}.`);return q;}
export function setWarehouseStaff(s,role,count){if(!WAREHOUSE_ROLES[role]||!Number.isInteger(count)||count<0||count>12)throw Error('Effectif invalide.');s.staff[role]=count;const people=s.workers.filter(w=>w.role===role&&!w.robot);people.forEach((w,i)=>w.retiring=i>=count);for(let i=people.length;i<count;i++)s.workers.push(worker(s,role));s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');}
export function setWarehouseRobots(s,count){if(!Number.isInteger(count)||count<0||count>8)throw Error('Flotte invalide.');const robots=s.workers.filter(w=>w.robot),extra=Math.max(0,count-robots.length),cost=extra*WH_ROBOT.cost;if(s.money<cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-cost);s.totals.investments=money(s.totals.investments+cost);s.robotTarget=count;robots.forEach((w,i)=>w.retiring=i>=count);for(let i=robots.length;i<count;i++)s.workers.push(worker(s,'picking',true));s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');}
export function upgradeWarehouse(s,kind,productId){let cost;
 if(kind==='rack'){const p=s.products.find(p=>p.id===productId);if(!p||p.capacity>=960)throw Error('Capacité maximale atteinte.');cost=650;}
 else if(kind==='bench'){if(s.benches>=3)throw Error('Trois postes maximum.');cost=1800;}
 else if(kind==='van'){if(s.vans.length>=4)throw Error('Quatre véhicules maximum.');cost=8000;}else throw Error('Équipement inconnu.');
 if(s.money<cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-cost);s.totals.investments=money(s.totals.investments+cost);
 if(kind==='rack')s.products.find(p=>p.id===productId).capacity+=240;if(kind==='bench')s.benches++;if(kind==='van')s.vans.push({id:s.nextId++,capacity:12,phase:'idle',remaining:0,orders:[],driver:null,area:null,started:0,duration:0});return cost;
}
export function setWarehousePolicy(s,key,value){if(key==='plan'&&FULFILLMENT_PLANS[value]||key==='priority'&&['deadline','express','fifo','sector'].includes(value)||key==='dispatchEvery'&&[30,60,120].includes(Number(value)))s[key]=key==='dispatchEvery'?Number(value):value;else if(key==='acceptOrders'&&typeof value==='boolean')s.acceptOrders=value;else throw Error('Réglage invalide.');}
function createContracts(s){s.contracts=[{id:s.nextId++,name:'La librairie du quartier',description:'8 commandes de 2 livres',productId:'books',quantity:2,count:8,opens:now(s),expires:(s.day-1)*1440+660,deadline:(s.day-1)*1440+900,bonus:160,status:'offered',orders:[]},{id:s.nextId++,name:'Cadeaux de dernière minute',description:'10 commandes de 2 jeux',productId:'toys',quantity:2,count:10,opens:(s.day-1)*1440+720,expires:(s.day-1)*1440+960,deadline:(s.day-1)*1440+1200,bonus:240,status:'offered',orders:[]}];}
export function acceptWarehouseContract(s,id){const c=s.contracts.find(c=>c.id===id);if(!c||c.status!=='offered'||now(s)<c.opens||now(s)>c.expires)throw Error('Cette commande client pro n’est plus disponible.');c.status='accepted';for(let i=0;i<c.count;i++)c.orders.push(createWarehouseOrder(s,{lines:[{productId:c.productId,quantity:c.quantity}],deadline:c.deadline,channel:'express',contractId:c.id}).id);log(s,`Commande client pro acceptée : ${c.name}.`);}
function checkContracts(s){for(const c of s.contracts.filter(c=>c.status==='accepted')){const orders=c.orders.map(id=>s.orders.find(o=>o.id===id));if(orders.every(o=>o.stage==='delivered')){c.status=orders.every(o=>!o.late)?'completed':'failed';if(c.status==='completed'){s.money=money(s.money+c.bonus);s.daily.bonus+=c.bonus;s.totals.bonus+=c.bonus;log(s,`Commande pro réussie : ${c.name} · prime ${c.bonus} €.`, 'success');}}}}
export function moveWarehouseFixture(s,key,x,z,rotation=0){if(!warehouseFixtures(s).includes(key)||![x,z,rotation].every(Number.isFinite)||!([0,Math.PI/2].some(r=>Math.abs(r-rotation)<.001)))throw Error('Position invalide.');const old=s.layout[key];s.layout[key]={x:Math.round(x*2)/2,z:Math.round(z*2)/2,rotation};const p=warehouseFootprint(s,key);const collision=warehouseFixtures(s).some(other=>{if(other===key)return false;const a=warehouseFootprint(s,other);return Math.abs(a.x-p.x)<(a.w+p.w)/2+.6&&Math.abs(a.z-p.z)<(a.d+p.d)/2+.6;});const inside=p.x-p.w/2>=-14.5&&p.x+p.w/2<=14.5&&p.z-p.d/2>=-8&&p.z+p.d/2<=7;
 if(collision||!inside||warehouseFixtures(s).some(k=>!warehouseRoute(s,[1,9],warehouseAccess(s,k)))){if(old)s.layout[key]=old;else delete s.layout[key];throw Error('Laissez une allée libre autour des équipements et des quais.');}
 for(const w of s.workers){if(w.phase==='to_home'&&w.target){go(s,w,w.target,'to_home');continue;}if(!warehouseWalkable(s,...w.pos)){const escape=warehouseRoute(s,w.pos,[1,9]);if(escape?.length)w.pos=[...escape[0]];}if(['to_rack','collecting'].includes(w.phase)&&key==='rack:'+s.orders.find(o=>o.id===w.job)?.lines[w.line]?.productId)go(s,w,warehouseAccess(s,key),'to_rack');else if(w.phase==='to_rack')go(s,w,warehouseAccess(s,'rack:'+s.orders.find(o=>o.id===w.job).lines[w.line].productId),w.phase);else if(w.phase==='to_stock')go(s,w,warehouseAccess(s,'rack:'+w.productId),w.phase);else if(['to_bench','packing'].includes(w.phase)&&key==='pack:'+w.bench)go(s,w,warehouseAccess(s,key),'to_bench');else if(w.phase==='to_bench')go(s,w,warehouseAccess(s,'pack:'+w.bench),w.phase);else if(['to_pickup','to_staging'].includes(w.phase))go(s,w,w.target,w.phase);}return s.layout[key];}
function closeWarehouseDay(s){const costs=warehouseCosts(s);s.money=money(s.money-costs.total);s.daily.charges=costs.total;s.totals.charges=money(s.totals.charges+costs.total);const stats=warehouseStats(s);s.history.unshift({day:s.day,...s.daily,profit:money(s.daily.revenue+s.daily.bonus-s.daily.cogs-s.daily.transport-s.daily.packaging-costs.total),cash:s.money,stockValue:stats.stockValue});s.history=s.history.slice(0,60);s.day++;s.minute=300;s.dayStartCash=s.money;s.daily=freshDay();s.arrivalCredit=0;
 // Keep accepted contracts and all active jobs across the night.
 s.contracts=s.contracts.filter(c=>c.status==='accepted');const outstanding=s.contracts;createContracts(s);s.contracts=[...outstanding,...s.contracts];s.orders=s.orders.filter(o=>o.stage!=='delivered'||outstanding.some(c=>c.orders.includes(o.id))||o.deliveredAt>=now(s)-2880);s.shipments=s.shipments.filter(t=>t.remaining>0||s.workers.some(w=>w.shipment===t.id));log(s,`Jour ${s.day} · charges réglées : ${costs.total} €.`, 'info');}
export function advanceWarehouse(s,minutes){if(!Number.isInteger(minutes)||minutes<0||minutes>2880)throw Error('Durée invalide.');for(let n=0;n<minutes;n++){
 s.minute++;const time=now(s);s.daily.wagesAccrued=(s.daily.wagesAccrued||0)+s.workers.filter(w=>!w.robot).reduce((n,w)=>n+WAREHOUSE_ROLES[w.role].wage,0)/1020;vansStep(s);
 for(const w of s.workers){if(w.retiring&&w.phase==='idle')continue;if(w.phase==='to_home'){if(walk(w))idle(w);if(w.role!=='packing')continue;}if(w.role==='receiving')receiveStep(s,w);else if(w.role==='picking')pickStep(s,w);else if(w.role==='packing')packStep(s,w);}
 s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');
 if(time-s.lastDispatch>=s.dispatchEvery)dispatchWarehouse(s,false);
 if(s.acceptOrders&&s.minute>=480&&s.minute<1080){const peak=s.minute>=540&&s.minute<660?1.75:s.minute>=960&&s.minute<1080?1.6:1;s.arrivalCredit+=FULFILLMENT_PLANS[s.plan].rate*peak*(.9+s.reputation/500)*(0.85+random(s)*.3);while(s.arrivalCredit>=1&&s.orders.filter(o=>o.stage!=='delivered').length<120){s.arrivalCredit--;createWarehouseOrder(s);}}
 for(const c of s.contracts)if(c.status==='offered'&&now(s)>c.expires)c.status='expired';if(s.minute===540)log(s,'Vague du matin : davantage de commandes jusqu’à 11 h.');if(s.minute===960)log(s,'Dernière vague : anticipez les départs express.');if(s.minute>=1320)closeWarehouseDay(s);
 }}
