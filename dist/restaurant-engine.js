// Burger restaurant simulation: customers queue at registers or kiosks, the kitchen grills, fries and assembles,
// dine-in guests eat at tables that must be cleaned, takeaway guests leave with a bag.
const money=n=>Math.round(n*100)/100,now=s=>(s.day-1)*1440+s.minute;
export {now as restaurantNow};
function random(s){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
function log(s,text,tone='info'){s.log.unshift({at:now(s),text,tone});s.log=s.log.slice(0,45);}
const clockText=m=>`${String(Math.floor(m%1440/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

export const OPENING={prep:540,open:660,lastEntry:1350,close:1425};
export const INGREDIENTS=[
 {id:'buns',name:'Pains à burger',short:'Pains',cost:.35,shelf:4,lot:48,color:'#e3b26b',initial:384,trigger:320,lots:6},
 {id:'beef',name:'Steaks de bœuf',short:'Bœuf',cost:1.1,shelf:3,lot:40,color:'#9a4b38',initial:360,trigger:350,lots:8},
 {id:'chicken',name:'Filets de poulet',short:'Poulet',cost:.9,shelf:3,lot:40,color:'#e8c08a',initial:160,trigger:100,lots:3},
 {id:'cheese',name:'Cheddar en tranches',short:'Cheddar',cost:.18,shelf:10,lot:100,color:'#f2b938',initial:400,trigger:300,lots:3},
 {id:'veggies',name:'Salade & tomates',short:'Légumes',cost:.15,shelf:2,lot:80,color:'#6fbf5a',initial:240,trigger:220,lots:3},
 {id:'fries',name:'Pommes de terre',short:'Patates',cost:.2,shelf:14,lot:60,color:'#c9a46b',initial:360,trigger:250,lots:4},
 {id:'drinks',name:'Sirops pour la fontaine',short:'Sirops',cost:.25,shelf:60,lot:100,color:'#6aa5d8',initial:400,trigger:250,lots:3},
 {id:'cans',name:'Canettes',short:'Canettes',cost:.45,shelf:120,lot:24,color:'#d0603a',initial:144,trigger:96,lots:3},
 {id:'icecream',name:'Mix pour glace',short:'Glace',cost:.3,shelf:5,lot:40,color:'#e9dcc4',initial:120,trigger:80,lots:2},
];
// Menu items: recipe in ingredient units, base (market) price, the station work they need and the packaging they use.
export const MENU={
 classic:{name:'Classic Burger',short:'Classic',icon:'🍔',recipe:{buns:1,beef:1,cheese:1,veggies:1},patties:1,base:8.9,box:1},
 double:{name:'Double Cheese',short:'Double',icon:'🍔',recipe:{buns:1,beef:2,cheese:2},patties:2,base:11.5,box:1},
 chicken:{name:'Chicken Burger',short:'Chicken',icon:'🍗',recipe:{buns:1,chicken:1,veggies:1},patties:1,base:8.5,box:1},
 fries:{name:'Frites',short:'Frites',icon:'🍟',recipe:{fries:1},fries:1,base:3.2,carton:1},
 drink:{name:'Boisson fontaine',short:'Fontaine',icon:'🥤',recipe:{drinks:1},drink:1,base:2.6,cup:1},
 can:{name:'Canette',short:'Canette',icon:'🥫',recipe:{cans:1},can:1,base:2.4},
 sundae:{name:'Glace',short:'Glace',icon:'🍦',recipe:{icecream:1},ice:1,base:2.9,pot:1},
};
export const BURGERS=['classic','double','chicken'];
export const PACKAGING={boxes:{name:'Boîtes burger',short:'Boîtes',cost:.12,lot:200},cups:{name:'Gobelets',short:'Gobelets',cost:.06,lot:250},cartons:{name:'Cornets à frites',short:'Cornets',cost:.04,lot:250},bags:{name:'Sacs à emporter',short:'Sacs',cost:.08,lot:200},pots:{name:'Pots à glace',short:'Pots',cost:.05,lot:200}};
export const PACKAGING_START={boxes:300,cups:300,cartons:300,bags:200,pots:200},PACKAGING_REORDER={boxes:40,cups:40,cartons:40,bags:30,pots:30};
export const ROLES={cashier:{name:'Caisse',wage:95,icon:'🧾'},grill:{name:'Grill',wage:110,icon:'🔥'},fryer:{name:'Friteuse',wage:100,icon:'🍟'},assembly:{name:'Assemblage',wage:100,icon:'🍔'},server:{name:'Serveur',wage:95,icon:'🛎️'},drive:{name:'Drive',wage:95,icon:'🚗'},floor:{name:'Salle',wage:90,icon:'🧽'}};
export const EQUIPMENT={grills:{name:'Grill',price:4000,max:4,energy:14,min:1},fryers:{name:'Friteuse',price:2500,max:4,energy:10,min:1},assembly:{name:'Poste d’assemblage',price:1200,max:3,energy:2,min:1},registers:{name:'Caisse',price:1500,max:3,energy:1,min:1},kiosks:{name:'Borne de commande',price:6000,max:4,energy:6,min:0},tables:{name:'Table de 4',price:400,max:12,energy:0,min:2},drive:{name:'Drive',price:18000,max:1,energy:4,min:0}};
export const RES_LIMITS={staff:12,customers:90};
export const FORMATS={balanced:{name:'Équilibré',rate:1,takeaway:.45,patience:0},fast:{name:'Restauration rapide',rate:1.25,takeaway:.6,patience:-2},gourmet:{name:'Burger gourmet',rate:.75,takeaway:.3,patience:4}};
export const SERVICE_TARGET=8,GRILL_MINUTES=4,FRY_MINUTES=3,CLEAN_MINUTES=2;

// Fixed floor plan (1 unit ≈ 1 m): kitchen at the back, counter in the middle, dining room and door at the front.
export const LAYOUT={door:[-3,9.6],outside:[-3,13.5],street:[-20,13.5],pass:[0,-1.2],waitArea:[[4,4.2],[5.2,4.2],[6.4,4.2],[7.6,4.2],[4,5.4],[5.2,5.4],[6.4,5.4],[7.6,5.4]],backDoor:[13,-9.6],coldRoom:[10.5,-7.5],coldRoomDoor:[8.6,-5.6],rawBins:[-14.9,-7.6],freezer:[5.6,-7.6],cutter:[6.4,-4.6],fryHolding:[1.9,-5.2],holding:[-10.5,-5.2],drinkMachine:[1.1,-2.8],canFridge:[2.9,-2.8],iceMachine:[4.2,-2.8],
 grill:i=>[-12+i*2.4,-7.6],grillCook:i=>[-12+i*2.4,-6.2],fryer:i=>[-2+i*1.8,-7.6],fryCook:i=>[-2+i*1.8,-6.2],assembly:i=>[-1.2-i*3,-3],assembler:i=>[-1.2-i*3,-4.2],landing:i=>[-.3-i*3,-2],server:i=>[1.6+i*1.2,-1.95],
 register:i=>[-7+i*2.6,.6],cashier:i=>[-7+i*2.6,-.4],registerFront:i=>[-7+i*2.6,1.8],kiosk:i=>[1.6+i*1.9,2],kioskFront:i=>[1.6+i*1.9,2.9],
 queue:k=>[-5.5+(k>=8?2:0),3.4+(k%8)*.8],
 table:i=>i<6?[-14.2+(i%2)*3.6,4.4+Math.floor(i/2)*2.4]:[9.2+(i%2)*3.6,6.6+Math.floor((i-6)/2)*1.6],
 cleaner:[-12,-2],
 // Drive: cars come off the street, order at the menu board, collect at the window in the right wall, then loop back to the street.
 drivePath:[[26,14.6],[18.6,14.6],[18.6,-8.4],[23.2,-8.4],[23.2,13],[26,13]],driveBoard:[17.4,10.5],driveWindow:[16.5,-2.5],driveCrew:[15.7,-2.5],driveShelf:[5.6,-1.95]};
const routeLegs=LAYOUT.drivePath.slice(1).map((p,i)=>Math.hypot(p[0]-LAYOUT.drivePath[i][0],p[1]-LAYOUT.drivePath[i][1]));
export const DRIVE_LENGTH=routeLegs.reduce((a,b)=>a+b,0),DRIVE_SPEAKER=routeLegs[0]+14.6-10.5,DRIVE_PICKUP=routeLegs[0]+14.6+2.5,DRIVE_GAP=3.4,DRIVE_CARS=7,CAR_SPEED=40,DRIVE_SHARE=.45;
export function drivePoint(d){let left=Math.max(0,Math.min(DRIVE_LENGTH,d));for(let i=0;i<routeLegs.length;i++){const a=LAYOUT.drivePath[i],b=LAYOUT.drivePath[i+1];if(left<=routeLegs[i]||i===routeLegs.length-1){const t=routeLegs[i]?Math.min(1,left/routeLegs[i]):0;return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,heading:Math.atan2(b[0]-a[0],b[1]-a[1])};}left-=routeLegs[i];}}

export const SEASON_LENGTH=28,SEASON_EVENTS=[
 {id:'match',name:'Soirée de match',icon:'⚽',start:3,days:1,demand:1.8},
 {id:'festival',name:'Festival en ville',icon:'🎪',start:9,days:3,demand:1.6},
 {id:'payday',name:'Début de mois',icon:'💶',start:15,days:2,demand:1.3},
 {id:'holidays',name:'Vacances scolaires',icon:'🏖️',start:18,days:5,demand:.75},
 {id:'burgerday',name:'Journée du burger',icon:'🍔',start:26,days:1,demand:2.2}];
export const seasonDay=day=>(day-1)%SEASON_LENGTH+1;
export const seasonEvent=day=>SEASON_EVENTS.find(e=>seasonDay(day)>=e.start&&seasonDay(day)<e.start+e.days)??null;
export function upcomingEvents(s,count=4){const list=[];for(let d=s.day;d<s.day+SEASON_LENGTH*2&&list.length<count;d++){const e=seasonEvent(d);if(e&&(seasonDay(d)===e.start||d===s.day))list.push({...e,day:d,inDays:d-s.day,lastDay:d+e.start+e.days-1-seasonDay(d)});}return list.filter((e,i,a)=>a.findIndex(x=>x.id===e.id&&x.lastDay===e.lastDay)===i);}

export const PROMO_DISCOUNTS=[10,20,30],PROMO_DURATIONS=[180,1440,4320],PROMO_SETUP=60,PROMO_VISIBILITY=1.2;
export const LOAN_AMOUNTS=[5000,10000,25000,50000],LOAN_TERMS={10:.04,20:.07,30:.1},LOAN_LIMIT=100000;
const freshDay=()=>({upsell:0,customers:0,served:0,onTime:0,late:0,walkouts:0,stockouts:0,revenue:0,refunds:0,cogs:0,waste:0,purchases:0,delivery:0,packaging:0,marketing:0,bonus:0,charges:0,wagesAccrued:0,waitSum:0,discarded:0});

const itemCost=id=>Object.entries(MENU[id].recipe).reduce((n,[k,q])=>n+q*INGREDIENTS.find(i=>i.id===k).cost,0)+(MENU[id].box?PACKAGING.boxes.cost:0)+(MENU[id].carton?PACKAGING.cartons.cost:0)+(MENU[id].cup?PACKAGING.cups.cost:0)+(MENU[id].pot?PACKAGING.pots.cost:0);
// Market margin of a typical order at base prices; the margin slider scales every price by the same factor.
const TYPICAL={classic:.45,double:.25,chicken:.3,fries:.75,drink:.5,can:.25,sundae:.25};
export const MARKET_MARGIN=1-Object.entries(TYPICAL).reduce((n,[k,w])=>n+w*itemCost(k),0)/Object.entries(TYPICAL).reduce((n,[k,w])=>n+w*MENU[k].base,0);
// The slider's market point is the menu's real margin at base prices, so the default prices are the catalogue prices.
export const PRICING={minMargin:65,maxMargin:92,marketMargin:Math.round(MARKET_MARGIN*100),elasticity:1.5,maxAdBudget:600};
const promoActive=s=>Boolean(s.promo&&now(s)<s.promo.until);
export const priceFactor=s=>(1-PRICING.marketMargin/100)/(1-(s.margin??PRICING.marketMargin)/100);
export const itemPrice=(s,id)=>Math.round(MENU[id].base*priceFactor(s)*(1-(promoActive(s)?s.promo.discount/100:0))*10)/10;
export const itemMargin=(s,id)=>1-itemCost(id)/itemPrice(s,id);
export function restaurantDemand(s){const discount=promoActive(s)?s.promo.discount/100:0,price=Math.pow(priceFactor(s)*(1-discount),-PRICING.elasticity),promo=promoActive(s)?PROMO_VISIBILITY:1,ads=1+.6*(1-Math.exp(-(s.adBudget||0)/250)),reputation=.6+s.reputation*.006,event=seasonEvent(s.day),season=event?.demand??1,format=FORMATS[s.format].rate,factor=price*promo*ads*reputation*season*format;
 return {price,promo,ads,reputation,season,event,format,factor,perHour:60*.55*factor};}
// Customers per minute before demand factors: lunch and dinner rushes.
export const rushCurve=m=>m<OPENING.open||m>=OPENING.lastEntry?0:m<720?.25:m<840?1:m<1080?.2:m<1140?.45:m<1260?.9:.25;

export function createRestaurantGame(seed=4207){
 const s={kind:'restaurant',version:1,seed:seed>>>0,day:1,minute:OPENING.prep,speed:0,nextId:1,ticket:1,money:30000,initialCash:30000,dayStartCash:30000,reputation:80,format:'balanced',margin:PRICING.marketMargin,adBudget:0,promo:null,open:true,priority:'fifo',
  equipment:{grills:1,fryers:1,assembly:1,registers:1,kiosks:0,tables:6,drive:0},staff:{cashier:1,grill:1,fryer:1,assembly:1,server:1,drive:0,floor:1},driveOpen:false,cars:[],driveCredit:0,
  ingredients:INGREDIENTS.map(i=>({id:i.id,lots:[{qty:i.initial-(BINS[i.id]??0),expires:1+i.shelf}],ordered:0,used:0,wasted:0})),kitchen:{bins:{...BINS},batches:[],holding:[],cookAhead:'normal'},supplies:{...PACKAGING_START},autoSupplies:true,supplyRules:{},restock:{},
  workers:[],customers:[],queue:[],orders:[],tables:[],shipments:[],contracts:[],loans:[],history:[],log:[],metrics:[],daily:freshDay(),
  totals:{revenue:0,refunds:0,cogs:0,waste:0,purchases:0,delivery:0,packaging:0,marketing:0,bonus:0,charges:0,investments:0,borrowed:0,repaid:0},arrivalCredit:0};
 syncTables(s);for(const [role,count] of Object.entries(s.staff))for(let i=0;i<count;i++)s.workers.push(worker(s,role));
 createContracts(s);log(s,'Ouverture du restaurant : la cuisine se prépare, les portes ouvrent à 11 h.');return s;
}
function worker(s,role){const i=s.workers.filter(w=>w.role===role).length,home=homeOf(role,i);return {id:s.nextId++,role,retiring:false,phase:'idle',job:null,station:null,pos:[...home],path:[],target:null,remaining:0,speed:8};}
function homeOf(role,i){return role==='drive'?[LAYOUT.driveCrew[0],LAYOUT.driveCrew[1]+i*.9]:role==='cashier'?LAYOUT.cashier(i%3):role==='grill'?LAYOUT.grillCook(i%4):role==='fryer'?LAYOUT.fryCook(i%4):role==='assembly'?LAYOUT.assembler(i%3):role==='server'?LAYOUT.server(i%3):[LAYOUT.cleaner[0]+i*.8,LAYOUT.cleaner[1]];}
function syncTables(s){while(s.tables.length<s.equipment.tables)s.tables.push({state:'free',guest:null});while(s.tables.length>s.equipment.tables&&s.tables.at(-1).state==='free')s.tables.pop();}
function go(w,target,phase){w.target=[...target];w.path=[[...target]];if(phase)w.phase=phase;}
// Walk with a distance budget and return what is left, so a short errand and the next one can share the same minute.
function walkBudget(w,budget,trail){let distance=budget;while(w.path.length&&distance>0){const t=w.path[0],dx=t[0]-w.pos[0],dz=t[1]-w.pos[1],l=Math.hypot(dx,dz);const fries=w.carry?.items?.[0]?.kind==='fries',load=w.load?(w.load==='bag'?7:6):w.carry?(w.carry.potatoes?5:w.carry.raw?(fries?3:1):(fries?4:2)):0;if(l<=distance){w.pos=[...t];w.path.shift();distance-=l;trail?.push([...w.pos,load]);}else{w.pos[0]+=dx/l*distance;w.pos[1]+=dz/l*distance;distance=0;trail?.push([...w.pos,load]);}}return w.path.length?0:distance;}
function walk(w){let distance=w.speed??8;while(w.path.length&&distance>0){const t=w.path[0],dx=t[0]-w.pos[0],dz=t[1]-w.pos[1],l=Math.hypot(dx,dz);if(l<=distance){w.pos=[...t];w.path.shift();distance-=l;}else{w.pos[0]+=dx/l*distance;w.pos[1]+=dz/l*distance;distance=0;}}return w.path.length===0;}
export const ingredientStock=(s,id)=>s.ingredients.find(i=>i.id===id).lots.reduce((n,l)=>n+l.qty,0);
export const stockValue=s=>money(s.ingredients.reduce((n,i)=>n+i.lots.reduce((v,l)=>v+l.qty,0)*INGREDIENTS.find(x=>x.id===i.id).cost,0)+COOKED.reduce((n,k)=>n+pattiesInKitchen(s,k)*INGREDIENTS.find(x=>x.id===k).cost,0));
// Cooked items travel cold room → bin by the station → batch on the grill or in the fryer → holding (cabinet or fry dump) → order.
export const PATTIES=['beef','chicken'],COOKED=['beef','chicken','fries'],BIN_CAPACITY=24,HOLD_MINUTES=20,FRY_HOLD_MINUTES=7,BINS={beef:24,chicken:24,fries:60},HOLD={beef:20,chicken:20,fries:7};
export const COOK_AHEAD={order:{name:'À la commande',rush:[0,0,0],calm:[0,0,0]},normal:{name:'Réserve normale',rush:[5,2,6],calm:[1,0,3]},high:{name:'Grosse réserve',rush:[8,4,10],calm:[3,1,5]}};
const KIND_INDEX={beef:0,chicken:1,fries:2},lineOf=kind=>kind==='fries'?'fry':'grill';
const held=(s,k)=>s.kitchen.holding.filter(h=>h.kind===k).reduce((n,h)=>n+h.qty,0),grilling=(s,k)=>s.kitchen.batches.filter(b=>b.kind===k).reduce((n,b)=>n+b.qty,0),carried=(s,k)=>s.workers.reduce((n,w)=>n+(w.carry?.items??[]).filter(i=>i.kind===k).reduce((v,i)=>v+i.qty,0),0);
export const pattiesInKitchen=(s,k)=>s.kitchen?((s.kitchen.bins[k]??0)+held(s,k)+grilling(s,k)+carried(s,k)):0;
export const pattiesWaiting=(s,k)=>s.orders.reduce((n,o)=>n+(o.stage!=='kitchen'?0:k==='fries'?(o.fry.state==='todo'?o.fry.need:0):(o.grill.state==='todo'?o.patties?.[k]||0:0)),0);
export const kitchenStatus=s=>Object.fromEntries(COOKED.map(k=>[k,{bin:s.kitchen.bins[k]??0,grilling:grilling(s,k),carried:carried(s,k),held:held(s,k),waiting:pattiesWaiting(s,k)}]));
const pattyAvailable=(s,k)=>ingredientStock(s,k)+pattiesInKitchen(s,k)-pattiesWaiting(s,k);
// First-in first-out use of ingredient lots; returns the cost of what was taken.
function take(s,id,qty){const i=s.ingredients.find(i=>i.id===id);let left=qty;i.lots.sort((a,b)=>a.expires-b.expires);for(const l of i.lots){const n=Math.min(l.qty,left);l.qty-=n;left-=n;if(!left)break;}i.lots=i.lots.filter(l=>l.qty>0);i.used+=qty;return qty*INGREDIENTS.find(x=>x.id===id).cost;}
const orderNeeds=lines=>lines.reduce((n,l)=>{for(const [k,q] of Object.entries(MENU[l.item].recipe))n[k]=(n[k]||0)+q*l.qty;return n;},{});
const orderCount=(o,key)=>o.lines.reduce((n,l)=>n+(MENU[l.item][key]||0)*l.qty,0);
export const orderItems=o=>o.lines.reduce((n,l)=>n+l.qty,0);
function metric(s){const h=Math.floor(now(s)/60);let m=s.metrics[s.metrics.length-1];if(!m||m.h!==h){m={h,customers:0,served:0,late:0,walkouts:0,revenue:0,cogs:0,waitSum:0};s.metrics.push(m);if(s.metrics.length>240)s.metrics.shift();}return m;}

// A group chooses its order: one burger each, fries and a drink (fountain or can) for most, an ice cream for some; anything out of stock is dropped.
function chooseLines(s,size){const lines=[];const add=(item,q=1)=>{const l=lines.find(l=>l.item===item);if(l)l.qty+=q;else lines.push({item,qty:q});};
 for(let p=0;p<size;p++){const r=random(s);add(r<.45?'classic':r<.7?'double':'chicken');if(random(s)<.75)add('fries');if(random(s)<.75)add(random(s)<.7?'drink':'can');if(random(s)<.25)add('sundae');}return lines;}
function available(s,lines){const need=orderNeeds(lines);return Object.entries(need).every(([k,q])=>(COOKED.includes(k)?pattyAvailable(s,k):ingredientStock(s,k))>=q);}
function trimToStock(s,lines){const kept=[];for(const l of lines){for(let q=l.qty;q>0;q--){const trial=[...kept.filter(x=>x.item!==l.item),{item:l.item,qty:(kept.find(x=>x.item===l.item)?.qty||0)+1}];if(available(s,trial)){const k=kept.find(x=>x.item===l.item);if(k)k.qty++;else kept.push({item:l.item,qty:1});}}}return kept;}

export function createRestaurantOrder(s,lines,options={}){
 if(!lines.length||lines.some(l=>!MENU[l.item]||!Number.isInteger(l.qty)||l.qty<1||l.qty>40))throw Error('Commande invalide.');
 if(!available(s,lines))throw Error('Ingrédients insuffisants.');
 const needs=orderNeeds(lines),cost=Object.entries(needs).filter(([k])=>!COOKED.includes(k)).reduce((n,[k,q])=>n+take(s,k,q),0),value=money(lines.reduce((n,l)=>n+itemPrice(s,l.item)*l.qty,0)),id=s.nextId++,t=now(s);
 const o={id,ref:'#'+String(s.ticket++).padStart(3,'0'),customer:options.customer??null,created:t,deadline:options.deadline??t+SERVICE_TARGET,lines:lines.map(l=>({...l})),value,cost:money(cost),channel:options.channel??'takeaway',stage:'kitchen',
  patties:{beef:needs.beef||0,chicken:needs.chicken||0},grill:{need:orderCount({lines},'patties'),state:orderCount({lines},'patties')?'todo':'done',worker:null,station:null,remaining:0},fry:{need:orderCount({lines},'fries'),state:orderCount({lines},'fries')?'todo':'done',worker:null,station:null,remaining:0},assemble:{state:orderCount({lines},'box')?'todo':'done',worker:null,station:null,remaining:0},pack:{state:'todo',worker:null},
  rush:false,late:false,readyAt:null,servedAt:null,group:options.group??null,till:options.till?{kind:options.till.kind,index:options.till.index}:null};
 s.orders.push(o);s.money=money(s.money+value);s.daily.revenue=money(s.daily.revenue+value);s.totals.revenue=money(s.totals.revenue+value);s.daily.cogs=money(s.daily.cogs+cost);s.totals.cogs=money(s.totals.cogs+cost);const m=metric(s);m.revenue=money(m.revenue+value);m.cogs=money(m.cogs+cost);return o;}

function spawnGroup(s){if(s.customers.length>=RES_LIMITS.customers)return;const f=FORMATS[s.format],size=random(s)<.5?1:random(s)<.6?2:random(s)<.7?3:4,channel=random(s)<f.takeaway?'takeaway':'dine';
 const c={id:s.nextId++,size,channel,phase:'to_queue',pos:[...LAYOUT.street],path:[[...LAYOUT.outside],[...LAYOUT.door]],speed:8,patience:9+f.patience+Math.floor(random(s)*5),order:null,spot:null,table:null,remaining:0,arrived:now(s),look:Math.floor(random(s)*6)};
 s.customers.push(c);s.daily.customers++;metric(s).customers++;}
const sortedOrders=(s,list)=>[...list].sort((a,b)=>(b.rush?1:0)-(a.rush?1:0)||(s.priority==='deadline'?a.deadline-b.deadline:0)||a.created-b.created||a.id-b.id);

function stepQueue(s){
 // Keep the queue in arrival order and walk each guest to their slot.
 s.queue=s.queue.filter(id=>s.customers.some(c=>c.id===id&&c.phase==='queue'));
 s.queue.forEach((id,k)=>{const c=s.customers.find(c=>c.id===id),slot=LAYOUT.queue(k);if(Math.hypot(c.pos[0]-slot[0],c.pos[1]-slot[1])>.01&&!c.path.length)c.path=[slot];});
 const cashiers=s.workers.filter(w=>w.role==='cashier'&&!w.retiring).length,openRegisters=Math.min(s.equipment.registers,cashiers);
 const busy=new Set(s.customers.filter(c=>c.spot).map(c=>c.spot.kind+c.spot.index));
 const spots=[...Array.from({length:openRegisters},(_,i)=>({kind:'register',index:i})),...Array.from({length:s.equipment.kiosks},(_,i)=>({kind:'kiosk',index:i}))].filter(p=>!busy.has(p.kind+p.index));
 while(spots.length&&s.queue.length){const id=s.queue.shift(),c=s.customers.find(c=>c.id===id),spot=spots.shift();c.spot=spot;c.phase='to_order';c.path=[spot.kind==='register'?LAYOUT.registerFront(spot.index):LAYOUT.kioskFront(spot.index)];}
}

// The kiosk suggests a dessert or fries on every screen; part of the guests accept.
function upsell(s,lines,size){const extra=[];for(let p=0;p<size;p++){const r=random(s);if(r<.3)extra.push('sundae');else if(r<.42)extra.push('fries');else if(r<.5)extra.push('can');}
 const more=lines.map(l=>({...l}));for(const item of extra){const l=more.find(l=>l.item===item);if(l)l.qty++;else more.push({item,qty:1});}return available(s,more)?{lines:more,extra}:{lines,extra:[]};}
function placeOrder(s,c){let lines=chooseLines(s,c.size),extra=[];if(c.spot?.kind==='kiosk')({lines,extra}=upsell(s,lines,c.size));if(!available(s,lines)){lines=trimToStock(s,lines);extra=[];}
 if(!lines.some(l=>BURGERS.includes(l.item))){s.daily.stockouts++;s.reputation=Math.max(0,s.reputation-1);log(s,'Rupture : un client repart sans burger.','warning');leave(s,c);return;}
 const o=createRestaurantOrder(s,lines,{customer:c.id,channel:c.channel,till:c.spot});if(extra.length){o.upsell=money(extra.reduce((n,i)=>n+itemPrice(s,i),0));s.daily.upsell=money((s.daily.upsell||0)+o.upsell);}c.order=o.id;c.spot=null;c.phase='to_wait';const slot=LAYOUT.waitArea[s.customers.filter(x=>x.phase==='waiting'||x.phase==='to_wait').length%LAYOUT.waitArea.length];c.path=[slot];}
function leave(s,c){if(c.table!==null){const t=s.tables[c.table];if(t){t.state='dirty';t.guest=null;}c.table=null;}c.spot=null;c.phase='leaving';c.path=[[...LAYOUT.door],[...LAYOUT.outside],[...LAYOUT.street]];}

function stepCustomers(s){const t=now(s);
 for(const c of [...s.customers]){const arrived=walk(c);
  if(c.phase==='to_queue'&&arrived){c.phase='queue';s.queue.push(c.id);}
  else if(c.phase==='queue'){if(--c.patience<=0){s.daily.walkouts++;metric(s).walkouts++;s.reputation=Math.max(0,s.reputation-1.2);leave(s,c);}}
  else if(c.phase==='to_order'&&arrived){c.phase='ordering';c.remaining=c.spot.kind==='kiosk'?2:1+Math.floor(c.size/3);}
  else if(c.phase==='ordering'&&--c.remaining<=0)placeOrder(s,c);
  else if(c.phase==='to_wait'&&arrived)c.phase='waiting';
  else if((c.phase==='waiting'||c.phase==='to_wait')&&s.orders.find(o=>o.id===c.order)?.stage==='ready'){c.phase='to_pickup';c.path=[[LAYOUT.pass[0]+(c.id%5)*.5-1,LAYOUT.pass[1]+1.6]];}
  else if(c.phase==='to_pickup'&&arrived){const o=s.orders.find(o=>o.id===c.order);serve(s,o);if(c.channel==='dine'){c.phase='seating';c.remaining=6;}else leave(s,c);}
  else if(c.phase==='seating'){const free=s.tables.findIndex(tb=>tb.state==='free');if(free>=0){s.tables[free]={state:'occupied',guest:c.id};c.table=free;c.phase='to_table';c.path=[LAYOUT.table(free)];}else if(--c.remaining<=0)leave(s,c);}
  else if(c.phase==='to_table'&&arrived){c.phase='eating';c.remaining=12+c.size*2+Math.floor(random(s)*7);}
  else if(c.phase==='eating'&&--c.remaining<=0)leave(s,c);
  else if(c.phase==='leaving'&&arrived)s.customers=s.customers.filter(x=>x!==c);
  if(c.phase==='group'&&arrived){const o=s.orders.find(o=>o.id===c.order);if(o?.stage==='ready'){serve(s,o);leave(s,c);}}
 }
 for(const o of s.orders)if(o.stage!=='served'&&!o.late&&t>o.deadline)o.late=true;}
function serve(s,o){if(!o||o.stage==='served')return;o.stage='served';o.servedAt=now(s);const wait=o.servedAt-o.created,late=o.servedAt>o.deadline,m=metric(s);s.daily.served++;s.daily[late?'late':'onTime']++;s.daily.waitSum+=wait;m.served++;m.waitSum+=wait;if(late)m.late++;s.reputation=Math.max(0,Math.min(100,s.reputation+(late?-.8:.15)));
 if(o.group){const c=s.contracts.find(c=>c.id===o.group);if(c){c.status=late?'failed':'completed';if(!late){s.money=money(s.money+c.bonus);s.daily.bonus+=c.bonus;s.totals.bonus+=c.bonus;log(s,`Commande de groupe réussie : ${c.name} · prime ${c.bonus} €.`,'success');}else log(s,`Commande de groupe en retard : ${c.name}.`,'warning');}}}

const packagingFor=o=>({boxes:orderCount(o,'box'),cups:orderCount(o,'cup'),cartons:0,pots:orderCount(o,'pot'),bags:o.channel!=='dine'?Math.max(1,Math.ceil(orderItems(o)/6)):0});
export function missingPackaging(s){const need=new Set();if(!s.supplies.cartons&&s.kitchen?.holding.some(h=>h.kind==='fries'&&!h.portioned))need.add('cartons');for(const o of s.orders)if(o.stage==='kitchen'&&o.assemble.state==='todo'&&o.grill.state==='done')for(const [k,q] of Object.entries(packagingFor(o)))if(q>s.supplies[k])need.add(k);return [...need];}
// Grills and fryers cook several tickets at once up to their capacity; each needs its own cook. Assembly is one ticket per station.
export const STATION_CAPACITY={grill:8,fry:6};
const pattyCost=k=>INGREDIENTS.find(x=>x.id===k).cost;
const WASTE_NAMES={beef:'steak(s) de bœuf',chicken:'filet(s) de poulet',fries:'portion(s) de frites'};
function wastePatties(s,k,qty,reason){if(!qty)return;const cost=money(qty*pattyCost(k));s.daily.waste=money(s.daily.waste+cost);s.totals.waste=money(s.totals.waste+cost);s.daily.discarded=(s.daily.discarded||0)+qty;s.ingredients.find(i=>i.id===k).wasted+=qty;log(s,`${qty} ${WASTE_NAMES[k]} jeté(s) : ${reason} (${cost} €).`,'warning');}
// Grill cooks and fryer cooks walk: bin → station with raw food, then station → holding with the cooked batch, then back.
// Short kitchen errands can share one minute; the cook's exact trail for the minute is kept so the 3D view replays it.
export const COOK_SPEED=8;
export const LINES={grill:{role:'grill',kinds:['beef','chicken'],capacity:()=>STATION_CAPACITY.grill,minutes:()=>GRILL_MINUTES,stations:s=>s.equipment.grills,home:i=>LAYOUT.grillCook(i),bin:()=>[LAYOUT.rawBins[0]+.9,LAYOUT.rawBins[1]+1.1],hold:()=>[LAYOUT.holding[0],LAYOUT.holding[1]-.8]},
 fry:{role:'fryer',kinds:['fries'],capacity:()=>STATION_CAPACITY.fry,minutes:()=>FRY_MINUTES,stations:s=>s.equipment.fryers,home:i=>LAYOUT.fryCook(i),bin:()=>[LAYOUT.freezer[0],LAYOUT.freezer[1]+1.1],hold:()=>[LAYOUT.fryHolding[0],LAYOUT.fryHolding[1]-.8]}};
function dropCarry(s,w){const k=s.kitchen;for(const it of w.carry?.items??[]){if(w.carry.raw)k.bins[it.kind]=Math.min(BINS[it.kind],(k.bins[it.kind]??0)+it.qty);else k.holding.push({kind:it.kind,qty:it.qty,cookedAt:it.cookedAt});}w.carry=null;}
// One decision of a cook standing at the end of a walk; returns true when it starts a new walk.
// Cut fries in water wait in a big bin; the cutter turns a sack of potatoes into fries in a couple of minutes.
export const CUT_MINUTES=2,PORTIONS_PER_MINUTE=6,SACK=40;
const cutterFront=()=>[LAYOUT.cutter[0]-.2,LAYOUT.cutter[1]+1.1],loose=s=>s.kitchen.holding.filter(h=>h.kind==='fries'&&!h.portioned).reduce((n,h)=>n+h.qty,0);
export const friesReady=s=>s.kitchen?s.kitchen.holding.filter(h=>h.kind==='fries'&&h.portioned).reduce((n,h)=>n+h.qty,0):0,friesLoose=s=>s.kitchen?loose(s):0;
// Fried fries are shovelled into cartons, oldest first, as many as the cartons and a minute allow.
function portionFries(s){const k=s.kitchen;let left=Math.min(PORTIONS_PER_MINUTE,loose(s),s.supplies.cartons);if(!left)return false;s.supplies.cartons-=left;for(const h of k.holding.filter(h=>h.kind==='fries'&&!h.portioned).sort((a,b)=>a.cookedAt-b.cookedAt)){const n=Math.min(h.qty,left);if(!n)break;h.qty-=n;left-=n;k.holding.push({kind:'fries',qty:n,cookedAt:h.cookedAt,portioned:true});}k.holding=k.holding.filter(h=>h.qty>0);return true;}
function cookStep(s,line,cook,station,home,cooks,buffer){const k=s.kitchen,L=LINES[line],onStation=b=>b.station===station&&lineOf(b.kind)===line;
 if(cook.phase==='refill'){if(cook.remaining>0){cook.remaining--;return false;}
  // Back from the cold room: the bins of this station are topped up.
  for(const p of L.kinds){const qty=Math.min(BINS[p]-(k.bins[p]??0),ingredientStock(s,p));if(qty>0){take(s,p,qty);k.bins[p]=(k.bins[p]??0)+qty;}}cook.phase='idle';return false;}
 if(cook.phase==='to_bin'){const plan=cook.plan,qty=Math.min(plan.qty,k.bins[plan.kind]);cook.plan=null;if(qty>0){k.bins[plan.kind]-=qty;cook.carry={raw:true,items:[{kind:plan.kind,qty}]};}cook.phase='to_grill';go(cook,home);return true;}
 if(cook.phase==='to_grill'){for(const it of cook.carry?.items??[])k.batches.push({station,kind:it.kind,qty:it.qty,remaining:L.minutes()});cook.carry=null;cook.phase='working';return false;}
 // Fries: potatoes from the cold room go through the cutter into the cut-fries bin; fried fries are portioned into cartons.
 if(cook.phase==='to_potatoes'){const qty=Math.min(SACK,ingredientStock(s,'fries'),BINS.fries-(k.bins.fries??0));if(qty<=0){cook.phase='idle';go(cook,home);return true;}take(s,'fries',qty);cook.carry={raw:true,potatoes:true,items:[{kind:'fries',qty}]};cook.phase='to_cutter';go(cook,cutterFront());return true;}
 if(cook.phase==='to_cutter'){cook.phase='cutting';cook.remaining=CUT_MINUTES;return false;}
 if(cook.phase==='cutting'){if(--cook.remaining>0)return false;dropCarry(s,cook);cook.phase='idle';go(cook,home);return true;}
 if(cook.phase==='portioning'){cook.phase='idle';}
 // Filling a basket's worth of cartons takes half a minute, so the cook can head back to the fryer in the same minute.
 if(cook.phase==='to_holding'||cook.phase==='to_portion'){dropCarry(s,cook);if(line==='fry'&&portionFries(s)){cook.phase='portioning';cook.pause=.5;go(cook,home);return true;}}
 if(line==='fry'&&loose(s)&&s.supplies.cartons>0){cook.phase='to_portion';go(cook,L.hold());return true;}
 // A finished batch is carried to the holding place first.
 const done=k.batches.filter(b=>onStation(b)&&b.ready);
 if(done.length){cook.carry={raw:false,items:done.map(b=>({kind:b.kind,qty:b.qty,cookedAt:b.cookedAt}))};k.batches=k.batches.filter(b=>!done.includes(b));cook.phase='to_holding';go(cook,L.hold());return true;}
 // Otherwise fetch raw food for what tickets and the reserve need; it can join a batch that is already cooking.
 const load=k.batches.filter(onStation).reduce((n,b)=>n+b.qty,0),want=L.kinds.map(p=>[p,pattiesWaiting(s,p)+buffer[KIND_INDEX[p]]-held(s,p)-grilling(s,p)-carried(s,p)]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1])[0];
 if(want&&(k.bins[want[0]]??0)>0&&load<L.capacity()){cook.plan={kind:want[0],qty:Math.min(L.capacity()-load,want[1])};cook.phase='to_bin';go(cook,L.bin());return true;}
 // An empty (or low) bin sends the cook to the cold room, unless another cook of the line is already on the way.
 const low=L.kinds.some(p=>(k.bins[p]??0)<(want?.[0]===p?1:line==='fry'?20:6)&&ingredientStock(s,p)>0),fetching=cooks.some(c=>['refill','to_potatoes','to_cutter','cutting'].includes(c.phase));
 if(low&&!fetching&&line==='fry'){cook.phase='to_potatoes';go(cook,LAYOUT.coldRoomDoor);return true;}
 if(low&&!fetching){cook.phase='refill';cook.remaining=1;cook.path=[[...LAYOUT.coldRoomDoor],[...home]];return true;}
 cook.phase=load?'working':'idle';if(Math.hypot(cook.pos[0]-home[0],cook.pos[1]-home[1])>.01){go(cook,home);return true;}return false;}
function stepLine(s,line,tickets){const k=s.kitchen,t=now(s),L=LINES[line],mine=b=>lineOf(b.kind)===line;
 for(const b of k.batches)if(mine(b)&&!b.ready&&--b.remaining<=0){b.ready=true;b.cookedAt=t;}
 // Cooked food waits a limited time: 20 minutes for patties, 7 for fries.
 for(const h of k.holding)if(mine(h)&&t-h.cookedAt>HOLD[h.kind]){wastePatties(s,h.kind,h.qty,'temps de maintien dépassé');h.qty=0;}k.holding=k.holding.filter(h=>h.qty>0);
 // Tickets take their cooked food, oldest first.
 for(const o of tickets){const task=line==='grill'?o.grill:o.fry,needs=line==='grill'?o.patties??{}:{fries:o.fry.need};if(task.state!=='todo'||!L.kinds.every(p=>(p==='fries'?friesReady(s):held(s,p))>=(needs[p]||0)))continue;
  for(const p of L.kinds){let left=needs[p]||0;const cost=money(left*pattyCost(p));for(const h of k.holding.filter(h=>h.kind===p&&(p!=='fries'||h.portioned)).sort((a,b)=>a.cookedAt-b.cookedAt)){const n=Math.min(h.qty,left);h.qty-=n;left-=n;}k.holding=k.holding.filter(h=>h.qty>0);s.daily.cogs=money(s.daily.cogs+cost);s.totals.cogs=money(s.totals.cogs+cost);metric(s).cogs=money(metric(s).cogs+cost);o.cost=money(o.cost+cost);}task.state='done';}
 const cooks=s.workers.filter(w=>w.role===L.role&&!w.retiring),count=Math.min(cooks.length,L.stations(s)),rush=rushCurve(s.minute)>=.9||rushCurve(s.minute+10)>=.9,serving=s.open&&s.minute>=OPENING.open-15&&s.minute<OPENING.lastEntry,buffer=serving?COOK_AHEAD[k.cookAhead][rush?'rush':'calm']:[0,0,0];
 for(let station=0;station<count;station++){const cook=cooks[station],home=L.home(station);cook.station=station;cook.speed=COOK_SPEED;let budget=COOK_SPEED;const trail=[[...cook.pos]];
  for(let step=0;step<5;step++){budget=walkBudget(cook,budget,trail);if(cook.path.length)break;const moved=cookStep(s,line,cook,station,home,cooks,buffer);if(cook.pause){budget-=cook.pause*(cook.speed??COOK_SPEED);cook.pause=0;}if(!moved||budget<=0)break;}
  cook.trail=trail.length>1?trail:null;}
 // Cooks without a station (or leaving) put down what they carry.
 for(const w of s.workers.filter(w=>w.role===L.role&&(w.retiring||w.station===null||w.station>=count))){if(w.carry)dropCarry(s,w);if(w.plan)w.plan=null;if(['to_bin','to_grill','to_holding','to_potatoes','to_cutter','cutting','to_portion','portioning'].includes(w.phase))w.phase='idle';w.trail=null;walk(w);}}
// Assembly follows a building guide: buns go through the toaster, then each burger is dressed layer by layer, boxed, and the order is packed.
export const BUILD={classic:['heel','sauce','salad','tomato','cheese','patty','crown','box'],double:['heel','sauce','cheese','patty','cheese','patty','crown','box'],chicken:['heel','mayo','salad','patty','crown','box']};
export const STEP_SECONDS={toast:10,heel:2,sauce:3,mayo:3,salad:4,tomato:3,cheese:3,patty:3,crown:2,box:5};
// The server prepares the order: burgers from the assembly landing, fries cartons from the heat lamp, fountain drinks (cup, ice, pour, lid), cans from the fridge, ice creams from the machine, then the tray or the bag on the pass.
export const SERVE_SECONDS={burgers:2,fries:2,drink:7,can:2,sundae:8,tray:4,bag:5},SERVER_SPEED=12;
// Drinks, cans and ice creams come first, while the burgers are still being dressed; then fries, then the boxed burgers.
export function serviceStops(o){const front=(p,dz=.85)=>[p[0],p[1]+dz],stops=[];
 for(const [stop,key,place] of [['drink','drink','drinkMachine'],['can','can','canFridge'],['sundae','ice','iceMachine']])if(orderCount(o,key))stops.push({stop,at:front(LAYOUT[place]),count:orderCount(o,key)});
 if(orderCount(o,'fries'))stops.push({stop:'fries',at:[LAYOUT.fryHolding[0],LAYOUT.fryHolding[1]+.8],via:[[2.1,-2]],count:orderCount(o,'fries')});
 if(orderCount(o,'box'))stops.push({stop:'burgers',at:[...LAYOUT.landing(o.assemble.station??0)],count:orderCount(o,'box')});
 stops.push({stop:o.channel==='dine'?'tray':'bag',at:o.channel==='drive'?[...LAYOUT.driveShelf]:[...LAYOUT.server(o.pack.slot??0)],count:1});return stops;}
export function assemblySteps(o){const steps=[{step:'toast',burger:-1}];let b=0;for(const l of o.lines)if(BUILD[l.item])for(let q=0;q<l.qty;q++,b++)for(const step of BUILD[l.item])steps.push({step,burger:b,item:l.item});
 return b?steps:[];}
// Drive: cars move along the lane keeping their distance, order at the board while a drive crew member is on headset, pay, and collect at the window.
export const driveActive=s=>s.equipment.drive>0&&s.driveOpen&&s.workers.some(w=>w.role==='drive'&&!w.retiring);
function spawnCar(s){if(s.cars.length>=DRIVE_CARS||s.cars.some(c=>c.d<DRIVE_GAP)){s.daily.walkouts++;metric(s).walkouts++;return;}
 const size=random(s)<.55?1:random(s)<.6?2:random(s)<.6?3:4;s.cars.push({id:s.nextId++,size,phase:'to_speaker',d:0,prev:0,remaining:0,order:null,look:Math.floor(random(s)*6),arrived:now(s)});s.daily.customers++;metric(s).customers++;}
function stepCars(s){const crew=s.workers.some(w=>w.role==='drive'&&!w.retiring),cars=[...s.cars].sort((a,b)=>b.d-a.d);
 cars.forEach((c,i)=>{c.prev=c.d;const limit=i?cars[i-1].d-DRIVE_GAP:Infinity,move=stop=>{c.d=Math.max(c.d,Math.min(c.d+CAR_SPEED,stop,limit));return c.d>=stop-1e-6;};
  if(c.phase==='to_speaker'&&move(DRIVE_SPEAKER)){c.phase='ordering';c.remaining=1+Math.floor(c.size/3);}
  else if(c.phase==='ordering'&&crew&&--c.remaining<=0){let lines=chooseLines(s,c.size);if(!available(s,lines))lines=trimToStock(s,lines);
   if(!lines.some(l=>BURGERS.includes(l.item))){s.daily.stockouts++;s.reputation=Math.max(0,s.reputation-1);log(s,'Rupture : une voiture du drive repart sans commande.','warning');c.phase='leaving';}
   else{const o=createRestaurantOrder(s,lines,{channel:'drive',till:{kind:'drive',index:0}});c.order=o.id;c.phase='to_window';}}
  else if(c.phase==='to_window'&&move(DRIVE_PICKUP))c.phase='window';
  else if(c.phase==='window'&&s.orders.find(o=>o.id===c.order)?.stage==='served')c.phase='leaving';
  if(c.phase==='leaving'&&move(DRIVE_LENGTH+DRIVE_GAP))s.cars=s.cars.filter(x=>x!==c);});}
function stepDriveCrew(s){const crew=s.workers.filter(w=>w.role==='drive');
 for(const [n,w] of crew.entries()){w.speed=SERVER_SPEED;let budget=SERVER_SPEED;const trail=[[...w.pos]],home=[LAYOUT.driveCrew[0],LAYOUT.driveCrew[1]+n*.9];
  for(let guard=0;guard<6;guard++){budget=walkBudget(w,budget,trail);if(w.path.length||budget<=0)break;
   const o=w.job!==null?s.orders.find(o=>o.id===w.job&&o.stage!=='served'):null;if(!o){w.job=null;w.load=null;}
   if(o&&w.load){// Back at the window with the bag: hand it over once the car is there.
    const car=s.cars.find(c=>c.order===o.id);if(o.stage==='served'||!car){w.job=null;w.load=null;continue;}if(car.phase!=='window'){w.phase='waiting';break;}
    budget-=SERVE_SECONDS.bag*w.speed/60;trail.push([...w.pos,7,Math.round(SERVE_SECONDS.bag*w.speed/60*100)/100]);serve(s,o);w.job=null;w.load=null;w.phase='idle';continue;}
   if(o){w.load='bag';w.phase='serving';w.path=[[8,-1.95],[...home]];continue;}
   if(w.retiring)break;const taken=new Set(crew.map(x=>x.job)),next=[...s.cars].sort((a,b)=>b.d-a.d).map(c=>s.orders.find(o=>o.id===c.order&&o.stage!=='served')).filter(Boolean).filter(o=>!taken.has(o.id))[0];
   // Bags go out in the order of the lane, so the car at the window is never blocked by the one behind.
   if(next&&next.stage!=='ready'){w.phase=s.cars.some(c=>c.phase==='ordering')?'working':'idle';if(Math.hypot(w.pos[0]-home[0],w.pos[1]-home[1])>.01){go(w,home);continue;}break;}
   if(next){w.job=next.id;w.load=null;w.phase='serving';w.path=[[8,-1.95],[...LAYOUT.driveShelf]];continue;}
   w.phase=s.cars.some(c=>c.phase==='ordering')?'working':'idle';if(Math.hypot(w.pos[0]-home[0],w.pos[1]-home[1])>.01){go(w,home);continue;}break;}
  w.trail=trail.length>1?trail:null;}}
function stepServers(s,tickets){const servers=s.workers.filter(w=>w.role==='server');
 for(const w of servers){w.speed=SERVER_SPEED;let budget=SERVER_SPEED;const trail=[[...w.pos]];
  for(let guard=0;guard<8;guard++){budget=walkBudget(w,budget,trail);if(w.path.length||budget<=0)break;
   let o=w.job!==null?s.orders.find(o=>o.id===w.job&&o.pack.state==='active'):null;
   if(!o){w.job=null;w.load=null;if(!w.retiring)o=tickets.find(o=>o.pack.state==='todo'&&o.assemble.state!=='todo'&&o.fry.state==='done'&&o.stage==='kitchen');
    if(!o){w.phase='idle';const home=LAYOUT.server(Math.min(servers.indexOf(w),2));if(Math.hypot(w.pos[0]-home[0],w.pos[1]-home[1])>.01){go(w,home);continue;}break;}
    Object.assign(o.pack,{state:'active',worker:w.id,stop:0,slot:Math.min(servers.indexOf(w),2)});w.job=o.id;w.phase='serving';const first=serviceStops(o)[0];w.path=[...(first.via??[]).map(p=>[...p]),[...first.at]];continue;}
   // Arrived at the current stop: its work takes seconds, then the server heads to the next one.
   const stops=serviceStops(o),stop=stops[o.pack.stop];if(stop.stop==='burgers'&&o.assemble.state!=='done'){w.phase='waiting';break;}w.phase='serving';const dwell=SERVE_SECONDS[stop.stop]*stop.count*w.speed/60;budget-=dwell;w.load=o.channel==='dine'||stop.stop!=='bag'?'tray':'bag';
   // The stop is kept in the trail as a pause, so the 3D view shows the server pouring or serving there.
   trail.push([...w.pos,w.load==='bag'?7:6,Math.round(dwell*100)/100]);
   if(++o.pack.stop>=stops.length){o.pack.state='done';w.job=null;w.load=null;w.phase='idle';continue;}
   const next=stops[o.pack.stop];w.path=[...(next.via??[]).map(p=>[...p]),[...next.at]];if(stop.stop==='fries')w.path.unshift([2.1,-2]);}
  w.trail=trail.length>1?trail:null;}}
const stepsLeft=(steps,progress)=>{let i=Math.floor(progress),left=STEP_SECONDS[steps[i]?.step]*(1-(progress-i))||0;for(i++;i<steps.length;i++)left+=STEP_SECONDS[steps[i].step];return left;};
function pickAssembly(s,w,tickets){const busy=new Set(s.orders.filter(o=>o.stage==='kitchen'&&o.assemble.state==='active').map(o=>o.assemble.station)),station=Array.from({length:s.equipment.assembly},(_,i)=>i).find(i=>!busy.has(i));if(station===undefined)return null;
 const o=tickets.find(o=>o.assemble.state==='todo'&&o.grill.state==='done'&&Object.entries(packagingFor(o)).every(([k,q])=>s.supplies[k]>=q));if(!o)return null;
 for(const [k,q] of Object.entries(packagingFor(o)))s.supplies[k]-=q;Object.assign(o.assemble,{state:'active',worker:w.id,station,progress:0,prev:0,remaining:Math.ceil(stepsLeft(assemblySteps(o),0)/60)});w.phase='working';w.job=o.id;w.station=station;go(w,LAYOUT.assembler(station));return o;}
function stepKitchen(s){
 const tickets=sortedOrders(s,s.orders.filter(o=>o.stage==='kitchen'));stepLine(s,'grill',tickets);stepLine(s,'fry',tickets);
 const assemblers=s.workers.filter(w=>w.role==='assembly');for(const w of assemblers){walk(w);
  // Each minute gives the assembler sixty seconds of work; time left after an order goes to the next ticket.
  let seconds=60;for(let guard=0;guard<6&&seconds>0;guard++){let o=w.phase==='working'?s.orders.find(o=>o.id===w.job&&o.assemble.state==='active'):null;
   if(!o){if(w.phase==='working'){w.phase='idle';w.job=null;}if(w.retiring||!(o=pickAssembly(s,w,tickets)))break;}
   const steps=assemblySteps(o),a=o.assemble;a.progress??=0;if(guard===0||a.prev===undefined)a.prev=a.progress;
   while(seconds>0&&a.progress<steps.length){const i=Math.floor(a.progress),need=STEP_SECONDS[steps[i].step]*(1-(a.progress-i));if(seconds>=need-1e-9){seconds-=need;a.progress=i+1;}else{a.progress=i+(a.progress-i)+seconds/STEP_SECONDS[steps[i].step];seconds=0;}}
   a.remaining=Math.ceil(stepsLeft(steps,a.progress)/60);if(a.progress>=steps.length){a.state='done';a.remaining=0;w.phase='idle';w.job=null;}}
  if(w.phase!=='working'&&!w.path.length){const home=LAYOUT.assembler(Math.min(w.station??0,s.equipment.assembly-1));if(Math.hypot(w.pos[0]-home[0],w.pos[1]-home[1])>.01)go(w,home);}}
 stepServers(s,tickets);stepDriveCrew(s);
 for(const o of s.orders)if(o.stage==='kitchen'&&['grill','fry','assemble','pack'].every(k=>o[k].state==='done')){o.stage='ready';o.readyAt=now(s);}}

function stepStaff(s){
 // Cashiers take their register; floor staff clean dirty tables.
 const cashiers=s.workers.filter(w=>w.role==='cashier');cashiers.forEach((w,i)=>{walk(w);const home=LAYOUT.cashier(Math.min(i,s.equipment.registers-1));if(!w.path.length&&Math.hypot(w.pos[0]-home[0],w.pos[1]-home[1])>.01)go(w,home);w.phase=s.customers.some(c=>c.phase==='ordering'&&c.spot?.kind==='register'&&c.spot.index===i)?'working':'idle';});
 for(const w of s.workers.filter(w=>w.role==='floor')){const arrived=walk(w);
  if(w.phase==='to_table'&&arrived){w.phase='cleaning';w.remaining=CLEAN_MINUTES;}
  else if(w.phase==='cleaning'&&--w.remaining<=0){const t=s.tables[w.job];if(t){t.state='free';t.guest=null;}w.phase='idle';w.job=null;go(w,LAYOUT.cleaner);}
  else if(w.phase==='idle'&&!w.retiring){const taken=new Set(s.workers.filter(x=>x.role==='floor'&&x.job!==null).map(x=>x.job)),i=s.tables.findIndex((t,k)=>t.state==='dirty'&&!taken.has(k));if(i>=0){w.job=i;w.phase='to_table';const p=LAYOUT.table(i);go(w,[p[0]+.9,p[1]]);}}}
 s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');}

// Staff, equipment and policies.
export function setRestaurantStaff(s,role,count){if(!ROLES[role]||!Number.isInteger(count)||count<0||count>RES_LIMITS.staff)throw Error('Effectif invalide.');s.staff[role]=count;const people=s.workers.filter(w=>w.role===role);people.forEach((w,i)=>w.retiring=i>=count);for(let i=people.length;i<count;i++)s.workers.push(worker(s,role));s.workers=s.workers.filter(w=>!w.retiring||w.phase!=='idle');}
export function buyRestaurantEquipment(s,kind){const e=EQUIPMENT[kind];if(!e)throw Error('Équipement inconnu.');if(s.equipment[kind]>=e.max)throw Error(`${e.max} maximum.`);if(s.money<e.price)throw Error('Trésorerie insuffisante.');s.money=money(s.money-e.price);s.totals.investments=money(s.totals.investments+e.price);s.equipment[kind]++;if(kind==='tables')syncTables(s);log(s,`Nouvel équipement : ${e.name} · ${e.price} €.`);}
export function setRestaurantPolicy(s,key,value){
 if(key==='format'&&FORMATS[value]||key==='priority'&&['fifo','deadline'].includes(value))s[key]=value;
 else if(key==='cookAhead'&&COOK_AHEAD[value])s.kitchen.cookAhead=value;
 else if(key==='margin'&&Number.isInteger(Number(value))&&Number(value)>=PRICING.minMargin&&Number(value)<=PRICING.maxMargin)s.margin=Number(value);
 else if(key==='adBudget'&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<=PRICING.maxAdBudget&&Number(value)%50===0)s.adBudget=Number(value);
 else if(['open','autoSupplies'].includes(key)&&typeof value==='boolean')s[key]=value;
 else if(key==='driveOpen'&&typeof value==='boolean'){if(value&&!s.equipment.drive)throw Error('Installez d’abord le drive.');s.driveOpen=value;log(s,value?'Drive ouvert : les voitures peuvent commander au haut-parleur.':'Drive fermé.');}else throw Error('Réglage invalide.');}
export function toggleRestaurantRush(s,id){const o=s.orders.find(o=>o.id===id);if(!o||o.stage!=='kitchen')throw Error('Cette commande n’est plus en cuisine.');o.rush=!o.rush;}

// Ingredient purchases: delivered at 9 h (if ordered before 8 h 30, else the next morning) or within the hour in express.
export function quoteIngredient(s,id,lots,express=false){const i=INGREDIENTS.find(i=>i.id===id);if(!i||!Number.isInteger(lots)||lots<1||lots>20)throw Error('Commande invalide.');const goods=money(i.cost*i.lot*lots),fee=express?45:15,eta=express?now(s)+60:(s.minute<510?(s.day-1)*1440+540:s.day*1440+540);return {goods,fee,total:money(goods+fee),eta,units:i.lot*lots};}
export function buyIngredient(s,id,lots,express=false){const q=quoteIngredient(s,id,lots,express);if(s.money<q.total)throw Error('Trésorerie insuffisante.');s.money=money(s.money-q.total);s.daily.purchases=money(s.daily.purchases+q.goods);s.totals.purchases=money(s.totals.purchases+q.goods);s.daily.delivery=money(s.daily.delivery+q.fee);s.totals.delivery=money(s.totals.delivery+q.fee);s.ingredients.find(i=>i.id===id).ordered+=q.units;s.shipments.push({id:s.nextId++,ingredient:id,units:q.units,eta:q.eta,express,cost:q.goods,unloading:0});log(s,`${q.units} ${INGREDIENTS.find(i=>i.id===id).short} commandés · livraison ${express?'express':'du matin'}.`);return q;}
function stepDeliveries(s){for(const t of s.shipments){if(now(s)<t.eta)continue;if(!t.unloading){t.unloading=5;continue;}if(--t.unloading>0)continue;const i=s.ingredients.find(i=>i.id===t.ingredient),def=INGREDIENTS.find(x=>x.id===t.ingredient);i.lots.push({qty:t.units,expires:s.day+def.shelf});i.ordered-=t.units;t.done=true;}s.shipments=s.shipments.filter(t=>!t.done);}
// Ingredient restocking is on by default with sensible levels, so a new restaurant does not run dry on its first evening.
export const restockRule=(s,id)=>{const d=INGREDIENTS.find(i=>i.id===id);return {enabled:true,trigger:d?.trigger??60,lots:d?.lots??2,express:false,...s.restock?.[id]};};
export function setRestaurantRestock(s,id,rule){if(!INGREDIENTS.some(i=>i.id===id))throw Error('Ingrédient inconnu.');const r={...restockRule(s,id),...rule};if(typeof r.enabled!=='boolean'||typeof r.express!=='boolean'||!Number.isInteger(r.trigger)||r.trigger<0||r.trigger>1000||!Number.isInteger(r.lots)||r.lots<1||r.lots>20)throw Error('Réglage de réassort invalide.');s.restock[id]=r;}
// A rule orders once below its trigger; if stock is critical and the morning truck would only come tomorrow, it switches to express.
function restockIngredients(s){for(const def of INGREDIENTS){const r=restockRule(s,def.id),i=s.ingredients.find(i=>i.id===def.id),stock=ingredientStock(s,def.id);if(!r.enabled||stock+i.ordered>=r.trigger)continue;const rescue=!r.express&&stock<r.trigger/3&&quoteIngredient(s,def.id,r.lots,false).eta>now(s)+180&&s.minute<OPENING.lastEntry,express=r.express||rescue;if(s.money>=quoteIngredient(s,def.id,r.lots,express).total){buyIngredient(s,def.id,r.lots,express);log(s,`Réassort automatique${rescue?' en express (stock critique)':''} : ${def.short}.`,rescue?'warning':'info');}}}
export const supplyRule=(s,key)=>s.supplyRules?.[key]??{trigger:PACKAGING_REORDER[key],lots:1};
export function setRestaurantSupplyRule(s,key,rule){if(!PACKAGING[key])throw Error('Emballage inconnu.');const r={...supplyRule(s,key),...rule};if(!Number.isInteger(r.trigger)||r.trigger<0||r.trigger>2000||!Number.isInteger(r.lots)||r.lots<1||r.lots>10)throw Error('Réglage invalide.');s.supplyRules[key]=r;}
export const packagingQuote=key=>{const p=PACKAGING[key];if(!p)throw Error('Emballage inconnu.');return {cost:money(p.cost*p.lot),units:p.lot};};
export function buyRestaurantPackaging(s,key,auto=false){const q=packagingQuote(key);if(s.money<q.cost)throw Error('Trésorerie insuffisante.');s.money=money(s.money-q.cost);s.daily.packaging=money(s.daily.packaging+q.cost);s.totals.packaging=money(s.totals.packaging+q.cost);s.supplies[key]+=q.units;if(auto)log(s,`Réassort automatique : ${PACKAGING[key].short} · ${q.cost} €.`);}
function restockPackaging(s){if(!s.autoSupplies)return;for(const key of Object.keys(PACKAGING)){const r=supplyRule(s,key);if(s.supplies[key]>=r.trigger)continue;for(let i=0;i<r.lots&&s.money>=packagingQuote(key).cost;i++)buyRestaurantPackaging(s,key,true);}}

// Marketing, promotions and loans, as in the distribution centre.
export function launchRestaurantPromo(s,discount=20,minutes=180){if(!PROMO_DISCOUNTS.includes(discount)||!PROMO_DURATIONS.includes(minutes))throw Error('Promotion invalide.');if(promoActive(s))throw Error('Une promotion est déjà en cours.');if(s.money<PROMO_SETUP)throw Error('Trésorerie insuffisante.');s.money=money(s.money-PROMO_SETUP);s.daily.marketing=money(s.daily.marketing+PROMO_SETUP);s.totals.marketing=money(s.totals.marketing+PROMO_SETUP);s.promo={discount,until:now(s)+minutes};log(s,`Promotion −${discount} % lancée.`);}
export function stopRestaurantPromo(s){if(!promoActive(s))throw Error('Aucune promotion en cours.');s.promo=null;log(s,'Promotion arrêtée.');}
function spendAdvertising(s){if(!s.adBudget||s.minute%60||s.minute<OPENING.open||s.minute>=OPENING.lastEntry)return;const cost=money(s.adBudget/12);s.money=money(s.money-cost);s.daily.marketing=money(s.daily.marketing+cost);s.totals.marketing=money(s.totals.marketing+cost);}
export const loanQuote=(amount,days)=>{const interest=money(amount*LOAN_TERMS[days]);return {amount,days,interest,instalment:money((amount+interest)/days)};};
export const restaurantDebt=s=>money(s.loans.reduce((n,l)=>n+l.principalLeft,0));
const loanShare=l=>({principal:l.daysLeft<=1?l.principalLeft:Math.min(l.principalLeft,money(l.amount/l.days)),interest:l.daysLeft<=1?l.interestLeft:Math.min(l.interestLeft,money(l.interest/l.days))});
export function takeRestaurantLoan(s,amount,days){if(!LOAN_AMOUNTS.includes(amount)||!LOAN_TERMS[days])throw Error('Offre de prêt invalide.');if(restaurantDebt(s)+amount>LOAN_LIMIT)throw Error(`Encours maximal : ${LOAN_LIMIT.toLocaleString('fr-FR')} €.`);const q=loanQuote(amount,days);s.loans.push({id:s.nextId++,amount,days,interest:q.interest,daysLeft:days,principalLeft:amount,interestLeft:q.interest,taken:now(s)});s.money=money(s.money+amount);s.totals.borrowed=money(s.totals.borrowed+amount);log(s,`Emprunt de ${amount.toLocaleString('fr-FR')} € sur ${days} jours.`);}
export function repayRestaurantLoan(s,id){const l=s.loans.find(l=>l.id===id);if(!l)throw Error('Emprunt introuvable.');if(s.money<l.principalLeft)throw Error('Trésorerie insuffisante.');s.money=money(s.money-l.principalLeft);s.totals.repaid=money(s.totals.repaid+l.principalLeft);s.loans=s.loans.filter(x=>x!==l);log(s,'Emprunt remboursé par anticipation.');}

// Group orders: a club or a party orders menus for a pickup time; a bonus if ready on time.
function createContracts(s){const d=(s.day-1)*1440;s.contracts=[...s.contracts.filter(c=>c.status==='accepted'),
 {id:s.nextId++,name:'Anniversaire au parc',description:'10 menus Classic à emporter',menus:10,item:'classic',opens:d+600,expires:d+690,due:d+780,bonus:45,status:'offered',order:null},
 {id:s.nextId++,name:'Club de foot',description:'16 menus Double à emporter',menus:16,item:'double',opens:d+900,expires:d+1050,due:d+1170,bonus:80,status:'offered',order:null}];}
export function acceptRestaurantContract(s,id){const c=s.contracts.find(c=>c.id===id);if(!c||c.status!=='offered'||now(s)<c.opens||now(s)>c.expires)throw Error('Cette commande de groupe n’est plus disponible.');const lines=[{item:c.item,qty:c.menus},{item:'fries',qty:c.menus},{item:'drink',qty:c.menus}];if(!available(s,lines))throw Error('Ingrédients insuffisants pour cette commande.');
 const o=createRestaurantOrder(s,lines,{channel:'takeaway',deadline:c.due,group:c.id});c.status='accepted';c.order=o.id;log(s,`Commande de groupe acceptée : ${c.name}, retrait à ${clockText(c.due)}.`);}
function stepContracts(s){const t=now(s);for(const c of s.contracts){if(c.status==='offered'&&t>c.expires)c.status='expired';if(c.status==='accepted'&&!c.pickup&&t>=c.due-6){const o=s.orders.find(o=>o.id===c.order);if(!o)continue;c.pickup=true;s.customers.push({id:s.nextId++,size:2,channel:'takeaway',phase:'group',pos:[...LAYOUT.street],path:[[...LAYOUT.outside],[...LAYOUT.door],[LAYOUT.pass[0]+2,LAYOUT.pass[1]+1.6]],speed:8,patience:99,order:o.id,spot:null,table:null,remaining:0,arrived:t,look:5});}}}

export function restaurantCosts(s){const people=s.workers.length,wages=money((s.daily.wagesAccrued||0)+s.workers.reduce((n,w)=>n+ROLES[w.role].wage,0)*Math.max(0,OPENING.close-s.minute)/(OPENING.close-OPENING.prep)),energy=money(Object.entries(EQUIPMENT).reduce((n,[k,e])=>n+e.energy*s.equipment[k],0)+20),interest=money(s.loans.reduce((n,l)=>n+loanShare(l).interest,0));
 return {wages,energy,rent:180,insurance:25,interest,people,total:money(wages+energy+205+interest)};}
export function restaurantStats(s){const active=s.orders.filter(o=>o.stage!=='served'),t=now(s);
 return {queue:s.queue.length,ordering:s.customers.filter(c=>c.phase==='ordering').length,kitchen:active.filter(o=>o.stage==='kitchen').length,cooking:active.filter(o=>o.stage==='kitchen'&&(o.grill.state==='active'||o.fry.state==='active')).length,assembling:active.filter(o=>o.assemble.state==='active').length,ready:active.filter(o=>o.stage==='ready').length,dining:s.customers.filter(c=>c.phase==='eating').length,
  late:active.filter(o=>t>o.deadline).length,dirty:s.tables.filter(t=>t.state==='dirty').length,freeTables:s.tables.filter(t=>t.state==='free').length,stockValue:stockValue(s),costs:restaurantCosts(s),
  profit:money(s.daily.revenue-s.daily.refunds+s.daily.bonus-s.daily.cogs-s.daily.waste-s.daily.delivery-s.daily.packaging-s.daily.marketing-restaurantCosts(s).total),avgWait:s.daily.served?s.daily.waitSum/s.daily.served:null};}

function announceSeason(s){const today=seasonEvent(s.day),soon=seasonEvent(s.day+2);if(today)log(s,`Aujourd’hui : ${today.icon} ${today.name} · clients ×${String(today.demand).replace('.',',')}.`,'success');if(soon&&seasonDay(s.day+2)===soon.start)log(s,`Dans 2 jours : ${soon.icon} ${soon.name} · prévoyez stock et équipes.`,'success');}
function payLoans(s){for(const l of s.loans){const {principal,interest}=loanShare(l);s.money=money(s.money-principal);s.totals.repaid=money(s.totals.repaid+principal);l.principalLeft=money(l.principalLeft-principal);l.interestLeft=money(l.interestLeft-interest);l.daysLeft--;}s.loans=s.loans.filter(l=>l.principalLeft>.004||l.interestLeft>.004);}
function closeDay(s){
 // Guests still inside leave; unfinished orders are refunded.
 for(const o of s.orders)if(o.stage!=='served'){o.stage='served';o.refunded=true;o.servedAt=now(s);s.money=money(s.money-o.value);s.daily.refunds=money(s.daily.refunds+o.value);s.totals.refunds=money(s.totals.refunds+o.value);}
 s.customers=[];s.queue=[];s.cars=[];s.driveCredit=0;s.tables.forEach(t=>{t.state='free';t.guest=null;});for(const w of s.workers){w.phase='idle';w.job=null;w.path=[];w.pos=[...homeOf(w.role,s.workers.filter(x=>x.role===w.role).indexOf(w))];}
 // At closing, cooked patties are thrown away and the raw bins go back to the cold room for the night.
 for(const w of s.workers)if(w.carry?.raw)dropCarry(s,w);
 for(const p of COOKED){wastePatties(s,p,held(s,p)+grilling(s,p)+carried(s,p),'fermeture');if(s.kitchen.bins[p]){s.ingredients.find(i=>i.id===p).lots.push({qty:s.kitchen.bins[p],expires:s.day+1});s.kitchen.bins[p]=0;}}s.kitchen.holding=[];s.kitchen.batches=[];for(const w of s.workers){w.carry=null;w.plan=null;}
 // Expired lots are thrown away at closing.
 for(const i of s.ingredients){const def=INGREDIENTS.find(x=>x.id===i.id),gone=i.lots.filter(l=>l.expires<=s.day);if(gone.length){const qty=gone.reduce((n,l)=>n+l.qty,0),cost=money(qty*def.cost);i.lots=i.lots.filter(l=>l.expires>s.day);i.wasted+=qty;s.daily.waste=money(s.daily.waste+cost);s.totals.waste=money(s.totals.waste+cost);log(s,`Périmés jetés : ${qty} ${def.short} (${cost} €).`,'warning');}}
 const costs=restaurantCosts(s);s.money=money(s.money-costs.total);s.daily.charges=costs.total;s.totals.charges=money(s.totals.charges+costs.total);payLoans(s);
 s.history.unshift({day:s.day,...s.daily,profit:money(s.daily.revenue-s.daily.refunds+s.daily.bonus-s.daily.cogs-s.daily.waste-s.daily.delivery-s.daily.packaging-s.daily.marketing-costs.total),cash:s.money,stockValue:stockValue(s)});s.history=s.history.slice(0,60);
 s.day++;s.minute=OPENING.prep;s.dayStartCash=s.money;s.daily=freshDay();s.arrivalCredit=0;s.orders=s.orders.filter(o=>o.servedAt>=now(s)-1440);createContracts(s);log(s,`Jour ${s.day} · charges réglées : ${costs.total} €.`);announceSeason(s);}

export function advanceRestaurant(s,minutes){if(!Number.isInteger(minutes)||minutes<0||minutes>2880)throw Error('Durée invalide.');for(let n=0;n<minutes;n++){
 s.minute++;s.daily.wagesAccrued=(s.daily.wagesAccrued||0)+s.workers.reduce((t,w)=>t+ROLES[w.role].wage,0)/(OPENING.close-OPENING.prep);
 if(s.open){s.arrivalCredit+=rushCurve(s.minute)*.55*restaurantDemand(s).factor*(.85+random(s)*.3);while(s.arrivalCredit>=1){s.arrivalCredit--;spawnGroup(s);}}
 if(s.open&&driveActive(s)){s.driveCredit=(s.driveCredit||0)+rushCurve(s.minute)*.55*DRIVE_SHARE*restaurantDemand(s).factor*(.85+random(s)*.3);while(s.driveCredit>=1){s.driveCredit--;spawnCar(s);}}
 stepContracts(s);stepCars(s);stepCustomers(s);stepQueue(s);stepKitchen(s);stepStaff(s);stepDeliveries(s);restockIngredients(s);restockPackaging(s);spendAdvertising(s);
 if(s.promo&&!promoActive(s)){s.promo=null;log(s,'Fin de la promotion.');}
 if(s.minute===720)log(s,'Coup de feu du midi.');if(s.minute===1140)log(s,'Service du soir.');if(s.minute===OPENING.open)log(s,'Portes ouvertes.');
 if(s.minute>=OPENING.close)closeDay(s);}}

// Conversion of a distribution-centre game: its net worth becomes the restaurant's starting capital, the old save is archived.
export function migrateRestaurantGame(record,{warehouseState,stockValue:previousStock=0}={}){
 if(record.schemaVersion===3&&record.state.kind==='restaurant'){const s=structuredClone(record.state);if(!s.kitchen){s.kitchen={bins:{beef:0,chicken:0},batches:[],holding:[],cookAhead:'normal'};for(const o of s.orders){o.patties??={beef:0,chicken:0};if(o.stage==='kitchen'&&o.grill.state!=='done')o.grill.state='done';}}for(const h of s.kitchen.holding)if(h.kind==='fries'&&h.portioned===undefined)h.portioned=true;if(s.kitchen.bins.fries===undefined){s.kitchen.bins.fries=0;for(const o of s.orders)if(o.stage==='kitchen'&&o.fry.state!=='done')o.fry.state='done';}s.daily.discarded??=0;
  // Drinks, cans, ice creams and the server role arrived after the first restaurant saves.
  for(const def of INGREDIENTS)if(!s.ingredients.some(i=>i.id===def.id))s.ingredients.push({id:def.id,lots:[{qty:def.initial,expires:s.day+def.shelf}],ordered:0,used:0,wasted:0});s.supplies.pots??=PACKAGING_START.pots;
  if(s.staff.server===undefined){s.staff={cashier:s.staff.cashier,grill:s.staff.grill,fryer:s.staff.fryer,assembly:s.staff.assembly,server:1,floor:s.staff.floor};s.workers.push(worker(s,'server'));}
  for(const o of s.orders)o.pack??={state:o.stage==='kitchen'?'todo':'done',worker:null};
  s.equipment.drive??=0;if(s.staff.drive===undefined){const {floor,...rest}=s.staff;s.staff={...rest,drive:0,floor};}s.driveOpen??=false;s.cars??=[];s.driveCredit??=0;return s;}
 const old=warehouseState??record.state,s=createRestaurantGame(old.seed);const debt=(old.loans||[]).reduce((n,l)=>n+l.principalLeft,0),net=money(old.money+previousStock-debt),support=money(Math.max(0,30000-net));
 s.money=money(net+support);s.initialCash=s.money;s.dayStartCash=s.money;s.legacyArchive=record.schemaVersion===2?structuredClone(record):{schemaVersion:2,state:structuredClone(old),preferences:{checkoutSound:true}};s.transition={cash:old.money,assets:money(previousStock),debt:money(debt),support,day:old.day};
 log(s,`Reconversion en restaurant : ancien centre archivé, capital de départ ${s.money.toLocaleString('fr-FR')} €.`);return s;}
