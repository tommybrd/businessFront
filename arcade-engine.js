// Flux Arcade (alpha): the player walks around a burger farm-restaurant, carries stacks of goods by hand from the field,
// the farm and the deliveries to the machines and the shelves, serves customers, collects cash and spends it on unlock
// tiles. Helpers and robots take over the same loops. Every chain can be scaled up forever through levelled upgrades.
// The simulation runs in real seconds; the 3D view only draws this state.
export const SAVE_SCHEMA=2,RADIUS=1.05,PLAYER_R=.32;
export const ITEMS={potato:{name:'Pomme de terre'},fries:{name:'Frites',price:4},raw:{name:'Steak cru'},steak:{name:'Steak grillé'},burger:{name:'Burger',price:9},
 cup:{name:'Gobelet'},soda:{name:'Soda',price:3},beef:{name:'Bœuf'},milk:{name:'Lait'},icecream:{name:'Glace',price:6},tray:{name:'Plateau sale'}};
export const PRODUCTS=['fries','burger','soda','icecream'];
// Machines turn one input into output after `time` seconds (`yield` outputs per input). `needs`: unlock that opens it.
export const STATIONS={
 fryer:{name:'Friteuse',in:'potato',out:'fries',time:1.4,inCap:24,outCap:20,pos:[-2,-8.4],baskets:2},
 grill:{name:'Grill',in:'raw',out:'steak',time:1.6,inCap:24,outCap:20,pos:[2.2,-8.4],needs:'grill'},
 burger:{name:'Poste burger',in:'steak',out:'burger',time:1.8,inCap:24,outCap:16,pos:[6.2,-8.4],needs:'burger'},
 soda:{name:'Machine à soda',in:'cup',out:'soda',time:1,inCap:24,outCap:20,pos:[10.8,-9.2],needs:'soda'},
 butcher:{name:'Boucherie',in:'beef',out:'raw',time:2.4,inCap:12,outCap:30,yield:3,pos:[-3.6,5.2],needs:'farm'},
 icecream:{name:'Machine à glaces',in:'milk',out:'icecream',time:1.8,inCap:20,outCap:16,pos:[14.8,-8.4],needs:'dessert'}};
// Second and third machines, in the back rows of the kitchen: same recipe as their model (`base`), each opened by its own unlock.
export const BACK_ROW=-14.2,THIRD_ROW=-18.2;
for(const [n,z] of [[2,BACK_ROW],[3,THIRD_ROW]])for(const [base,x] of [['fryer',-2],['grill',2.2],['burger',6.2],['soda',10.8]])
 STATIONS[base+n]={...STATIONS[base],name:STATIONS[base].name+' '+n,base,pos:[x,z],needs:base+n};
export const baseOf=id=>STATIONS[id].base??id;
export const SHELVES={fries:{name:'Frites',pos:[1,-3.2],cap:24},burger:{name:'Burgers',pos:[3.4,-3.2],cap:20,needs:'burger'},soda:{name:'Sodas',pos:[-.4,-3.2],cap:20,needs:'soda'},icecream:{name:'Glaces',pos:[4.8,-3.2],cap:16,needs:'dessert'}};
// Deliveries that refill by themselves: meat crates and cup stacks.
export const SOURCES={meat:{name:'Viande livrée',item:'raw',pos:[-1.6,-11.2],cap:10,every:2.2,needs:'grill'},cups:{name:'Gobelets',item:'cup',pos:[13,-10.6],cap:20,every:.9,needs:'soda'},
 milk:{name:'Lait livré',item:'milk',pos:[15.6,-11.4],cap:12,every:1.6,needs:'dessert'}};
// Registers along the counter: each has its own queue, serving spot (kitchen side), cashier place and cash pile.
export const REGISTERS=[{pos:[6.4,-3.2],serve:[6.4,-4.5],cash:[8,-4.5],cashier:[7.05,-3.95]},{pos:[10.4,-3.2],serve:[10.4,-4.5],cash:[12,-4.5],cashier:[11.05,-3.95]}];
// Self-order kiosks (customer side) and the pickup line in front of the left part of the counter.
export const KIOSKS=[[-.2,1.6],[1.6,1.6],[3.4,1.6],[-2,1.6]],PICKUP=Array.from({length:7},(_,i)=>[-.6+i*.85,-1.95]);
// Pasture south of the field: one spot per cow.
export const COWS=[[-12.4,2.6],[-10.4,2.6],[-12.4,4.6],[-10.4,4.6],[-12.4,6.6],[-10.4,6.6],[-8.8,5.6],[-8.8,7.2]];
export const PASTURE={x0:-13.6,x1:-7.8,z0:1.3,z1:8.2,gate:[3,4.8]};
export const DOOR=[8.4,8],EXIT=[-2,9],MEGAPHONE=[13.6,1.2],MAX_QUEUE=9,KIOSK_QUEUE=4,WORLD={minX:-13.3,maxX:17.2,minZ:-19.9,maxZ:9};
// Terrace tables (eat-in customers leave a dirty tray), the dish sink, the office desk for bills, the robots' charging
// dock, and the drive: a pad by the side window where the orders are put, and the car stop on the road beyond it.
export const TABLES=[[-.4,7.2],[1.5,7.2],[3.4,7.2],[5.3,7.2]],SINK=[6.6,4.6],DESK=[15.8,.6],DOCK=[-4,-15.3];
export const DRIVE={pad:[15.8,-3.4],road:18.6,stop:-3.4,gap:2.6,cap:12,maxCars:4,patience:75};
export const MEAT=SOURCES.meat.pos,REGISTER=REGISTERS[0].pos,SERVE_SPOT=REGISTERS[0].serve,CASH_SPOT=REGISTERS[0].cash;
export const inZone=([x,z])=>[x-1.25,z+1.55],outZone=([x,z])=>[x+1.25,z+1.55],shelfZone=([x,z])=>[x,z-1.3];
export const CARD_FEE=.02,KIOSK_ORDER=3,PICKUP_STEP=.35;
const plot=(i,x,z,zone)=>({id:i,x,z,zone,grow:Math.random(),ripe:false});

// One-off unlocks: dashed tiles on the floor, each shown once the previous step (`after`) is bought.
export const UNLOCKS=[
 {id:'cashier',name:'Caissier',price:40,pos:[9.9,-6.5],after:null},
 {id:'field2',name:'Champ +6',price:30,pos:[-10.8,-2],after:null},
 {id:'bag',name:'Grand sac',price:45,pos:[-4.4,-1.6],after:'field2'},
 {id:'grill',name:'Grill + viande',price:90,pos:[2.2,-10.4],after:'cashier'},
 {id:'helper',name:'Aide frites',price:110,pos:[-5,-9.8],after:'field2'},
 {id:'burger',name:'Poste burger',price:140,pos:[6.2,-10.4],after:'grill'},
 {id:'shoes',name:'Baskets',price:70,pos:[-4.4,1.2],after:'bag'},
 {id:'terminal1',name:'Terminal CB',price:90,pos:[8.4,-1.2],after:'cashier'},
 {id:'helper2',name:'Aide burgers',price:220,pos:[8.2,-11.2],after:'burger'},
 {id:'megaphone',name:'Mégaphone',price:50,pos:MEGAPHONE,after:'cashier'},
 {id:'ads1',name:'Pub niveau 1',price:80,pos:[13.6,4.4],after:'megaphone'},
 {id:'ads2',name:'Pub niveau 2',price:200,pos:[13.6,4.4],after:'ads1'},
 {id:'ads3',name:'Pub niveau 3',price:450,pos:[13.6,4.4],after:'ads2'},
 {id:'water',name:'Arrosage',price:120,pos:[-10.8,-10.4],after:'helper'},
 {id:'fastFryer',name:'Friteuse turbo',price:180,pos:[-5,-9.8],after:'helper'},
 {id:'helper3',name:'Aide frites 2',price:260,pos:[-5,-9.8],after:'fastFryer'},
 {id:'meat2',name:'Livraison viande +',price:160,pos:[2.2,-10.4],after:'helper2'},
 {id:'fastKitchen',name:'Grill + burger turbo',price:320,pos:[8.2,-11.2],after:'helper2'},
 {id:'helper4',name:'Aide burgers 2',price:420,pos:[8.2,-11.2],after:'fastKitchen'},
 {id:'soda',name:'Machine à soda',price:250,pos:[10.8,-9.2],after:'burger'},
 {id:'sodaHelper',name:'Aide sodas',price:200,pos:[13.6,-8.3],after:'soda'},
 {id:'farm',name:'Ferme + boucherie',price:400,pos:[-6.2,1.6],after:'grill'},
 {id:'farmer',name:'Fermier',price:250,pos:[-6.2,3.6],after:'farm'},
 {id:'register2',name:'Caisse 2',price:260,pos:[10.4,-1.2],after:'cashier'},
 {id:'cashier2',name:'Caissier 2',price:160,pos:[13.6,-5.6],after:'register2'},
 {id:'terminal2',name:'Terminal CB 2',price:120,pos:[8.4,-1.2],after:'register2'},
 {id:'shelf2',name:'Grandes étagères',price:150,pos:[-3.6,3],after:'register2'},
 {id:'crewBags',name:'Sacs des aides',price:300,pos:[-5,-9.8],after:'helper3'},
 {id:'fryer2',name:'Friteuse 2',price:300,pos:[-2,BACK_ROW],after:'fastFryer'},
 {id:'grill2',name:'Grill 2',price:400,pos:[2.2,BACK_ROW],after:'fastKitchen'},
 {id:'burger2',name:'Poste burger 2',price:450,pos:[6.2,BACK_ROW],after:'grill2'},
 {id:'soda2',name:'Machine à soda 2',price:350,pos:[10.8,BACK_ROW],after:'sodaHelper'},
 {id:'fryer3',name:'Friteuse 3',price:900,pos:[-2,THIRD_ROW],after:'fryer2'},
 {id:'grill3',name:'Grill 3',price:1100,pos:[2.2,THIRD_ROW],after:'burger2'},
 {id:'burger3',name:'Poste burger 3',price:1200,pos:[6.2,THIRD_ROW],after:'grill3'},
 {id:'soda3',name:'Machine à soda 3',price:1000,pos:[10.8,THIRD_ROW],after:'soda2'},
 {id:'terrace',name:'Terrasse 4 tables',price:350,pos:[2.4,5.4],after:'register2'},
 {id:'busboy',name:'Aide plonge',price:250,pos:[6.6,6.4],after:'terrace'},
 {id:'dessert',name:'Glaces + lait',price:600,pos:[14.8,-8.4],after:'soda'},
 {id:'dessertHelper',name:'Aide glaces',price:300,pos:[15.8,-13.2],after:'dessert'},
 {id:'drive',name:'Drive',price:500,pos:DRIVE.pad,after:'register2'},
 {id:'driveHelper',name:'Aide drive',price:300,pos:[15.8,-5.6],after:'drive'},
 {id:'robotPotato',name:'Robot récolte',price:220,pos:[-6.6,-7.6],after:'helper'},
 {id:'robotFries',name:'Robot frites',price:200,pos:[-3,-3.4],after:'robotPotato'},
 {id:'robotMeat',name:'Robot viande',price:220,pos:[4.2,-11.4],after:'helper2'},
 {id:'robotSteak',name:'Robot steaks',price:240,pos:[4.2,-11.4],after:'robotMeat'},
 {id:'robotBurger',name:'Robot burgers',price:260,pos:[4.2,-11.4],after:'robotSteak'}];
// Levelled upgrades: bought again and again, each level dearer (price = base × growth^level). This is the endless scale.
export const LEVELS=[
 {id:'sac',name:'Sac',after:'bag',base:150,growth:1.6,pos:[-4.4,-1.6],tip:'+6 objets portés'},
 {id:'pub',name:'Pub',after:'ads3',base:700,growth:1.6,pos:[13.6,4.4],tip:'+20 % de clients'},
 {id:'prix',name:'Recettes premium',after:'burger',base:400,growth:1.8,pos:[13.6,-1],tip:'+10 % sur les prix'},
 {id:'stock',name:'Stockage',after:'shelf2',base:300,growth:1.7,pos:[-3.6,3],tip:'+50 % de stock partout'},
 {id:'cuisine',name:'Cuisine rapide',after:'fastKitchen',base:500,growth:1.7,pos:[.25,-10.8],tip:'Machines 15 % plus rapides'},
 {id:'equipe',name:'Employé',after:'helper4',base:500,growth:1.45,pos:[8.2,-11.2],tip:'Un employé de plus'},
 {id:'robotLvl',name:'Robots',after:'robotPotato',base:400,growth:1.7,pos:[4.2,-11.4],tip:'Robots plus rapides, plus chargés, batterie +'},
 {id:'cows',name:'Vache',after:'farm',base:250,growth:1.5,max:COWS.length-2,pos:[-6.2,1.6],tip:'Une vache de plus'},
 {id:'kiosk',name:'Borne',after:'register2',base:300,growth:2,max:KIOSKS.length,pos:s=>KIOSKS[lvl(s,'kiosk')],tip:'Commande et paiement CB en libre-service'}];
export const lvl=(s,id)=>s.levels[id]??0;
export const levelPrice=(s,L)=>Math.round(L.base*L.growth**lvl(s,L.id));

// Robots: each one shuttles back and forth on a single leg of a chain, forever.
export const ROBOTS={robotPotato:{loop:'potato',at:[-7,-6]},robotFries:{loop:'friesRun',at:[-.75,-5.2]},robotMeat:{loop:'meatRun',at:[-.4,-10.4]},robotSteak:{loop:'steakRun',at:[4.2,-6.4]},robotBurger:{loop:'burgerRun',at:[7.4,-5.2]}};
export const registerOpen=(s,r)=>r===0||!!s.unlocked.register2;
export const stockMul=s=>1+.5*lvl(s,'stock');
export const stationOpen=(s,id)=>!STATIONS[id].needs||!!s.unlocked[STATIONS[id].needs];
export const shelfOpen=(s,k)=>!SHELVES[k].needs||!!s.unlocked[SHELVES[k].needs];
export const sourceOpen=(s,k)=>!!s.unlocked[SOURCES[k].needs];
export const stationTime=(s,id)=>{const b=baseOf(id);return STATIONS[id].time*((b==='fryer'&&s.unlocked.fastFryer)||((b==='grill'||b==='burger')&&s.unlocked.fastKitchen)?.55:1)*.85**lvl(s,'cuisine');};
export const stationCaps=(s,id)=>({inCap:Math.round(STATIONS[id].inCap*stockMul(s)),outCap:Math.round(STATIONS[id].outCap*stockMul(s))});
export const shelfCap=(s,k)=>Math.round(SHELVES[k].cap*(s.unlocked.shelf2?1.6:1)*stockMul(s));
export const sourceCap=(s,k)=>Math.round((k==='meat'&&s.unlocked.meat2?16:SOURCES[k].cap)*stockMul(s));
const sourceEvery=(s,k)=>k==='meat'&&s.unlocked.meat2?1.1:SOURCES[k].every;
export const growTime=s=>s.unlocked.water?3.5:6;
export const COW_TIME=14;
export const cowCount=s=>s.unlocked.farm?2+lvl(s,'cows'):0;
export const kioskCount=s=>lvl(s,'kiosk');
export const price=(s,k)=>ITEMS[k].price*(1+.1*lvl(s,'prix'));
const helperCap=s=>s.unlocked.crewBags?10:6;
const playerCap=s=>(s.unlocked.bag?12:6)+6*lvl(s,'sac');
// Robots start a little weaker than a helper with a bag and run on a battery: they go back to the charging dock when it
// runs low. Each "Robots" level makes them faster, carry more and last longer.
const robotStats=s=>({cap:5+2*lvl(s,'robotLvl'),speed:3.6*(1+.12*lvl(s,'robotLvl')),battMax:45+15*lvl(s,'robotLvl')});
export const CHARGE_TIME=6;
// Patience: customers count their wait from the moment they arrive and leave angry past PATIENCE seconds.
export const PATIENCE=60;
const WAITING=['queue','kiosk','pickup'];
// Average wait: the last 20 customers who left (served or not) plus everyone still waiting, so a jam shows at once.
export const avgWait=s=>{const w=[...s.waits,...s.customers.filter(c=>WAITING.includes(c.phase)).map(c=>c.wait)];return w.length?w.reduce((a,b)=>a+b,0)/w.length:0;};
const leftAfter=(s,c)=>{s.waits.push(Math.round(c.wait*10)/10);if(s.waits.length>20)s.waits.shift();};
export const RUSH={length:25,cooldown:85,boost:2.2};
export const adsLevel=s=>['ads1','ads2','ads3'].filter(id=>s.unlocked[id]).length;
export const traffic=s=>(1+.35*adsLevel(s)+.2*lvl(s,'pub'))*(.6+.16*s.rep)*(s.rush>0?RUSH.boost:1)*dayMul(s);
// The day: the restaurant opens at 8:00 and closes at 23:00 (OPEN seconds), then the night lasts NIGHT seconds with no
// new customers. Footfall peaks at lunch and dinner. A report of the day is kept when it ends.
export const OPEN=280,NIGHT=20,DAY=OPEN+NIGHT;
export const hourOf=s=>s.clock<OPEN?8+15*s.clock/OPEN:23+9*(s.clock-OPEN)/NIGHT;
export const isOpen=s=>s.clock<OPEN;
export const dayMul=s=>{if(!isOpen(s))return 0;const h=hourOf(s);return 1.2*(.55+1.1*Math.exp(-(((h-12.8)/1.1)**2))+.95*Math.exp(-(((h-19.8)/1.1)**2)));};

export function createArcade(){const s={schema:SAVE_SCHEMA,t:0,money:10,piles:[0,0],fees:0,cardSales:0,cashSales:0,nextId:1,served:0,
 player:{id:0,role:'player',x:-6.4,z:-4.6,heading:0,carry:[],cap:6,speed:4.2,cool:0,moving:false},
 plots:[],cows:[],stations:{},shelves:{fries:0,burger:0,soda:0},sources:{},customers:[],helpers:[],cashiers:[null,null],unlocked:{},levels:{},paid:{},
 rep:2.5,waits:[],lost:0,rush:0,rushCool:0,spawnTimer:2,pickupTimer:0,popups:[]};
 for(let r=0;r<3;r++)for(let c=0;c<3;c++)s.plots.push(plot(s.plots.length,-12.4+c*1.6,-7.6+r*1.6,1));
 for(let r=0;r<2;r++)for(let c=0;c<3;c++)s.plots.push(plot(s.plots.length,-12.4+c*1.6,-2.8+r*1.6,2));
 COWS.forEach(([x,z],i)=>s.cows.push({id:i,x,z,grow:Math.random()*.5,ready:false}));
 return fill(s);}
const newDay=()=>({revenue:0,served:0,lost:0,bills:0});
// Fields added since the first saves get their defaults here, for new games and loaded ones alike.
function fill(s){for(const id of Object.keys(STATIONS))s.stations[id]??={in:0,out:0,timer:0,working:false};for(const k of Object.keys(SOURCES))s.sources[k]??={n:0,timer:0};
 for(const k of Object.keys(SHELVES))s.shelves[k]??=0;for(const c of s.customers)for(const k of PRODUCTS){c.wants[k]??=0;c.got[k]??=0;}
 s.clock??=OPEN*.15;s.day??=1;s.today??=newDay();s.lastDay??=null;s.report??=0;s.bills??=[];s.supply??=0;s.deskCool??=0;s.event??=null;s.eventTimer??=120;
 s.tables??=TABLES.map(()=>({by:null,dirty:false}));s.drive??={pad:[],cars:[],timer:8,pick:0};
 for(const h of s.helpers)if(h.robot){const r=robotStats(s);h.cap=r.cap;h.speed=r.speed;h.battMax=r.battMax;h.batt??=r.battMax;}
 return s;}

// Tiles to show now: one-off unlocks whose prerequisite is bought, plus the next level of each levelled upgrade.
export function visibleUnlocks(s){const out=UNLOCKS.filter(u=>!s.unlocked[u.id]&&(!u.after||s.unlocked[u.after])).map(u=>({...u,key:u.id}));
 for(const L of LEVELS){if(!s.unlocked[L.after])continue;const n=lvl(s,L.id);if(L.max!=null&&n>=L.max)continue;
  out.push({id:L.id,level:n+1,key:`${L.id}#${n+1}`,name:`${L.name} niv. ${n+1}`,price:levelPrice(s,L),pos:typeof L.pos==='function'?L.pos(s):L.pos,tip:L.tip});}
 return out;}
export const isUnlocked=(s,id)=>!!s.unlocked[id];
const near=(a,[x,z],r=RADIUS)=>Math.hypot(a.x-x,a.z-z)<r;
const count=(a,k)=>a.carry.filter(c=>c===k).length;
function drop(a,k){const i=a.carry.lastIndexOf(k);if(i<0)return false;a.carry.splice(i,1);return true;}
const popup=(s,text,x,z,kind='money')=>{s.popups.push({id:s.nextId++,text,x,z,t:0,kind});};
// The player picks up only the kinds left switched on in their pick filter (all by default); helpers take what their mission needs.
const takes=(a,item)=>a.role==='player'?a.pick?.[item]!==false:a.wants===item;
export const PICKABLE=['potato','fries','raw','steak','burger','cup','soda','beef','milk','icecream','tray'];
export function setPick(s,item,on){s.player.pick??={};if(item==='all'||item==='none'){for(const k of PICKABLE)s.player.pick[k]=item==='all';}else if(PICKABLE.includes(item))s.player.pick[item]=!!on;}
// Put back what someone carries: deliveries and machine outputs take their goods back while they have room; the rest is thrown away.
function putBack(s,list){let back=0;for(const k of list){const src=Object.entries(SOURCES).find(([,d])=>d.item===k);if(src&&sourceOpen(s,src[0])&&s.sources[src[0]].n<sourceCap(s,src[0])){s.sources[src[0]].n++;back++;continue;}
  const st=Object.entries(STATIONS).find(([sid,def])=>def.out===k&&stationOpen(s,sid)&&s.stations[sid].out<stationCaps(s,sid).outCap);if(st){s.stations[st[0]].out++;back++;}}
 return {back,thrown:list.length-back};}
export function emptyHands(s){const p=s.player;if(!p.carry.length)return null;const r=putBack(s,p.carry);p.carry=[];popup(s,r.thrown?`🗑️ ${r.back} rangés · ${r.thrown} jetés`:`🗑️ ${r.back} rangés`,p.x,p.z,'info');return r;}

// Furniture and fences the player cannot walk through (axis-aligned boxes [x0,z0,x1,z1]).
export function obstacles(s){const o=[[-5.2,-20.6,17.4,-20.2],[-5.15,-12.6,-4.85,-10.9],[-1.2,-3.65,13.2,-2.75],[DESK[0]-.7,DESK[1]-.4,DESK[0]+.7,DESK[1]+.4]];
 const boxAt=([x,z],w,d)=>o.push([x-w/2,z-d/2,x+w/2,z+d/2]);
 for(const [id,def] of Object.entries(STATIONS))if(stationOpen(s,id))boxAt(def.pos,1.8,1.2);
 for(const [k,def] of Object.entries(SOURCES))if(sourceOpen(s,k))boxAt(def.pos,1.6,1.2);
 for(let i=0;i<kioskCount(s);i++)boxAt(KIOSKS[i],.8,.6);
 if(s.unlocked.terrace){for(const t of TABLES)boxAt(t,.9,.9);boxAt(SINK,1.2,.8);}
 if(s.helpers.some(h=>h.robot))boxAt(DOCK,1.2,.6);
 if(s.unlocked.drive)o.push([16.75,-4.5,17.05,-2.3]);
 // Field fence: top, left, bottom (moves with "Champ +6"), and the right side except the gate.
 const zb=s.unlocked.field2?0:-3.15,fx0=-13.6,fx1=-8,t=.12;
 o.push([fx0-t,-8.9-t,fx1+t,-8.9+t],[fx0-t,-8.9,fx0+t,zb],[fx0-t,zb-t,fx1+t,zb+t],[fx1-t,-8.9,fx1+t,-7.2],[fx1-t,zb-1.5,fx1+t,zb]);
 if(s.unlocked.farm){const P=PASTURE;o.push([P.x0-t,P.z0-t,P.x1+t,P.z0+t],[P.x0-t,P.z1-t,P.x1+t,P.z1+t],[P.x0-t,P.z0,P.x0+t,P.z1],[P.x1-t,P.z0,P.x1+t,P.gate[0]],[P.x1-t,P.gate[1],P.x1+t,P.z1]);}
 return o;}
// Push a round body out of every box it overlaps (along the shallowest axis).
function collide(a,boxes,r=PLAYER_R){for(const [x0,z0,x1,z1] of boxes){const cx=Math.max(x0,Math.min(a.x,x1)),cz=Math.max(z0,Math.min(a.z,z1)),dx=a.x-cx,dz=a.z-cz,d=Math.hypot(dx,dz);
  if(d>=r)continue;if(d>1e-6){a.x=cx+dx/d*r;a.z=cz+dz/d*r;continue;}
  const pen=[[a.x-x0+r,-1,0],[x1-a.x+r,1,0],[a.z-z0+r,0,-1],[z1-a.z+r,0,1]].sort((p,q)=>p[0]-q[0])[0];a.x+=pen[1]*pen[0];a.z+=pen[2]*pen[0];}}

// One action per tick of cooldown: harvest, feed a machine, take its output, fill a shelf, pick from a delivery or a cow.
function interact(s,a,dt){a.cool-=dt;if(a.cool>0)return;let did=false;const room=a.carry.length<a.cap;
 if(room&&takes(a,'potato'))for(const p of s.plots)if(p.ripe&&(p.zone===1||s.unlocked.field2)&&near(a,[p.x,p.z],.85)){p.ripe=false;p.grow=0;a.carry.push('potato');did=true;break;}
 if(!did&&room&&takes(a,'beef'))for(let i=0;i<cowCount(s);i++){const c=s.cows[i];if(c.ready&&near(a,[c.x,c.z],.95)){c.ready=false;c.grow=0;a.carry.push('beef');did=true;break;}}
 if(!did)for(const [id,def] of Object.entries(STATIONS)){if(!stationOpen(s,id))continue;const st=s.stations[id],cap=stationCaps(s,id);
  if(near(a,inZone(def.pos))&&st.in<cap.inCap&&drop(a,def.in)){st.in++;did=true;break;}
  if(room&&near(a,outZone(def.pos))&&st.out>0&&takes(a,def.out)){st.out--;a.carry.push(def.out);did=true;break;}}
 if(!did&&room)for(const [k,def] of Object.entries(SOURCES)){const src=s.sources[k];if(sourceOpen(s,k)&&src.n>0&&near(a,def.pos,1.2)&&takes(a,def.item)){src.n--;a.carry.push(def.item);did=true;break;}}
 if(!did)for(const [k,def] of Object.entries(SHELVES)){if(!shelfOpen(s,k))continue;if(near(a,shelfZone(def.pos))&&s.shelves[k]<shelfCap(s,k)&&drop(a,k)){s.shelves[k]++;did=true;break;}}
 if(!did&&s.unlocked.terrace){if(room&&takes(a,'tray'))s.tables.forEach((t,i)=>{if(!did&&t.dirty&&near(a,TABLES[i],1.15)){t.dirty=false;a.carry.push('tray');did=true;}});
  if(!did&&near(a,SINK,1.2)&&drop(a,'tray'))did=true;}
 if(!did&&s.unlocked.drive&&near(a,DRIVE.pad,1.2)&&s.drive.pad.length<DRIVE.cap){const k=PRODUCTS.find(k=>a.carry.includes(k)&&driveNeed(s,k)>0);if(k){drop(a,k);s.drive.pad.push(k);did=true;}}
 if(did)a.cool=.11;}
// Drive: what the cars in line still want of a product, minus what already waits on the pad.
export const driveNeed=(s,k)=>s.drive.cars.filter(c=>c.phase==='queue').reduce((n,c)=>n+c.wants[k]-c.got[k],0)-s.drive.pad.filter(x=>x===k).length;

function playerExtras(s,a,dt){
 // Office desk: standing there pays the bills, oldest first, as long as the account covers them.
 s.deskCool-=dt;if(s.deskCool<=0&&near(a,DESK,1.7)){const b=s.bills[0];if(b&&s.money>=b.amount){s.money-=b.amount;s.today.bills+=b.amount;s.bills.shift();s.deskCool=.35;popup(s,`🧾 ${b.label} −${b.amount} $`,DESK[0],DESK[1],'info');}}
 // A broken machine is repaired by standing next to it for a moment.
 const ev=s.event;if(ev?.kind==='panne'){const st=s.stations[ev.id];if(st?.broken&&near(a,STATIONS[ev.id].pos,1.9)){st.broken.fix+=dt;if(st.broken.fix>=REPAIR){delete st.broken;s.event=null;popup(s,'🔧 Réparé !',a.x,a.z,'info');}}}if(s.unlocked.megaphone&&s.rushCool<=0&&near(a,MEGAPHONE,.9)){s.rush=RUSH.length;s.rushCool=RUSH.cooldown;popup(s,'📣 RUSH !',MEGAPHONE[0],MEGAPHONE[1],'info');}
 REGISTERS.forEach((r,i)=>{if(s.piles[i]>0&&near(a,r.cash,1.2)){const take=Math.round(s.piles[i]);s.money+=s.piles[i];s.piles[i]=0;popup(s,`💵 +${take} $`,r.cash[0],r.cash[1]);}});
 for(const u of visibleUnlocks(s)){if(!near(a,u.pos,.95)||s.money<1)continue;const left=u.price-(s.paid[u.key]??0),pay=Math.min(left,Math.floor(s.money),Math.max(1,Math.ceil(u.price*dt*1.4)));
  s.money-=pay;s.paid[u.key]=(s.paid[u.key]??0)+pay;if(s.paid[u.key]>=u.price){delete s.paid[u.key];u.level?levelUp(s,u):unlock(s,u);}}}
function unlock(s,u){s.unlocked[u.id]=true;popup(s,`${u.name} !`,u.pos[0],u.pos[1],'info');applyUnlock(s,u.id);}
function applyUnlock(s,id){s.player.cap=playerCap(s);if(id==='shoes')s.player.speed=5.6;
 if(id==='cashier')s.cashiers[0]=cashierAt(0);if(id==='cashier2')s.cashiers[1]=cashierAt(1);
 if(id==='helper'||id==='helper3')s.helpers.push(helper(s,'fries'));if(id==='helper2'||id==='helper4')s.helpers.push(helper(s,'burger'));
 if(id==='sodaHelper')s.helpers.push(helper(s,'soda'));if(id==='farmer')s.helpers.push(helper(s,'farm'));
 if(id==='busboy')s.helpers.push(helper(s,'trays'));if(id==='dessertHelper')s.helpers.push(helper(s,'dessert'));if(id==='driveHelper')s.helpers.push(helper(s,'drive'));
 if(ROBOTS[id])s.helpers.push(robot(s,id));
 if(id==='crewBags')for(const h of s.helpers)if(!h.robot)h.cap=helperCap(s);}
function levelUp(s,u){s.levels[u.id]=lvl(s,u.id)+1;popup(s,`${u.name} !`,u.pos[0],u.pos[1],'info');applyLevel(s,u.id);}
function applyLevel(s,id){s.player.cap=playerCap(s);
 if(id==='equipe'){const chains=['fries','burger',...(s.unlocked.soda?['soda']:[]),...(s.unlocked.farm?['farm']:[])];s.helpers.push(helper(s,chains[(lvl(s,'equipe')-1)%chains.length]));}
 if(id==='robotLvl'){const r=robotStats(s);for(const h of s.helpers)if(h.robot){Object.assign(h,r);h.batt=r.battMax;}}}
const cashierAt=i=>({x:REGISTERS[i].cashier[0],z:REGISTERS[i].cashier[1],heading:0});

// Helpers repeat a fixed loop of the same actions as the player.
const LOOPS={fries:[{go:'field',until:'full'},{go:'in:fryer'},{go:'out:fryer',take:'fries',until:'full'},{go:'shelf:fries'}],
 burger:[{go:'meat',take:'raw',until:'full'},{go:'in:grill'},{go:'out:grill',take:'steak',until:'full'},{go:'in:burger'},{go:'out:burger',take:'burger',until:'full'},{go:'shelf:burger'}],
 soda:[{go:'cups',take:'cup',until:'full'},{go:'in:soda'},{go:'out:soda',take:'soda',until:'full'},{go:'shelf:soda'}],
 farm:[{go:'cows',until:'full'},{go:'in:butcher'},{go:'out:butcher',take:'raw',until:'full'},{go:'in:grill'}],
 potato:[{go:'field',until:'full'},{go:'in:fryer'}],friesRun:[{go:'out:fryer',take:'fries',until:'full'},{go:'shelf:fries'}],
 meatRun:[{go:'meat',take:'raw',until:'full'},{go:'in:grill'}],steakRun:[{go:'out:grill',take:'steak',until:'full'},{go:'in:burger'}],burgerRun:[{go:'out:burger',take:'burger',until:'full'},{go:'shelf:burger'}],
 cupRun:[{go:'cups',take:'cup',until:'full'},{go:'in:soda'}],sodaRun:[{go:'out:soda',take:'soda',until:'full'},{go:'shelf:soda'}],
 beefRun:[{go:'cows',until:'full'},{go:'in:butcher'}],butcherRun:[{go:'out:butcher',take:'raw',until:'full'},{go:'in:grill'}],
 dessert:[{go:'milk',take:'milk',until:'full'},{go:'in:icecream'},{go:'out:icecream',take:'icecream',until:'full'},{go:'shelf:icecream'}],
 milkRun:[{go:'milk',take:'milk',until:'full'},{go:'in:icecream'}],iceRun:[{go:'out:icecream',take:'icecream',until:'full'},{go:'shelf:icecream'}],
 trays:[{go:'tables',until:'full'},{go:'sink'}],drive:[{go:'driveTake'},{go:'drive'}]};
function robot(s,id){const r=ROBOTS[id],st=robotStats(s);return {...helper(s,r.loop),robot:id,name:UNLOCKS.find(u=>u.id===id).name,x:r.at[0],z:r.at[1],...st,batt:st.battMax};}
// Missions the player can give: humans can run a whole chain or one leg, robots only one leg; anyone can be put on pause.
export const MISSIONS=[
 {id:'fries',label:'Chaîne frites complète',icon:'🥔→🍟→🛒',humans:true,needs:null},
 {id:'burger',label:'Chaîne burgers complète',icon:'🥩→🍖→🍔→🛒',humans:true,needs:'burger'},
 {id:'soda',label:'Chaîne sodas complète',icon:'🥤→🛒',humans:true,needs:'soda'},
 {id:'farm',label:'Ferme → boucherie → grill',icon:'🐄→🔪→🔥',humans:true,needs:'farm'},
 {id:'potato',label:'Champ → friteuse',icon:'🥔→🍟',needs:null},
 {id:'friesRun',label:'Friteuse → étagère frites',icon:'🍟→🛒',needs:null},
 {id:'meatRun',label:'Viande livrée → grill',icon:'🥩→🔥',needs:'grill'},
 {id:'steakRun',label:'Grill → poste burger',icon:'🍖→🍔',needs:'burger'},
 {id:'burgerRun',label:'Poste burger → étagère',icon:'🍔→🛒',needs:'burger'},
 {id:'cupRun',label:'Gobelets → machine à soda',icon:'🥛→🥤',needs:'soda'},
 {id:'sodaRun',label:'Machine à soda → étagère',icon:'🥤→🛒',needs:'soda'},
 {id:'beefRun',label:'Vaches → boucherie',icon:'🐄→🔪',needs:'farm'},
 {id:'butcherRun',label:'Boucherie → grill',icon:'🔪→🔥',needs:'farm'},
 {id:'dessert',label:'Chaîne glaces complète',icon:'🍼→🍦→🛒',humans:true,needs:'dessert'},
 {id:'milkRun',label:'Lait → machine à glaces',icon:'🍼→🍦',needs:'dessert'},
 {id:'iceRun',label:'Machine à glaces → étagère',icon:'🍦→🛒',needs:'dessert'},
 {id:'trays',label:'Débarrasser les tables → plonge',icon:'🍽️→🧽',needs:'terrace'},
 {id:'drive',label:'Étagères → drive',icon:'🛒→🚗',needs:'drive'},
 {id:'rest',label:'Pause',icon:'💤',needs:null}];
export const missionsFor=(s,h)=>MISSIONS.filter(m=>(!m.humans||!h.robot)&&(!m.needs||s.unlocked[m.needs]));
// Changing a mission restarts the loop; what the worker carries is put back where it was taken (field goods are dropped).
export function assignMission(s,id,loop){const h=s.helpers.find(x=>x.id===id);if(!h||!MISSIONS.some(m=>m.id===loop))return false;
putBack(s,h.carry);h.carry=[];h.loop=loop;h.step=0;h.idle=0;h.station=null;h.moving=false;return true;}
function helper(s,loop){const n=s.helpers.filter(h=>!h.robot).length+1;return {id:s.nextId++,role:'helper',name:'Employé '+n,loop,step:0,x:-5,z:-9.8,heading:0,carry:[],cap:helperCap(s),speed:3.2,cool:0,moving:false,idle:0,wants:null};}
function target(s,h){const st=LOOPS[h.loop][h.step],[kind,id]=st.go.split(':'),dist=p=>Math.hypot(p.x-h.x,p.z-h.z);
 if(kind==='field'){const ripe=s.plots.filter(p=>p.ripe&&(p.zone===1||s.unlocked.field2)).sort((a,b)=>dist(a)-dist(b))[0];return ripe?[ripe.x,ripe.z]:[-10.8,-5.2];}
 if(kind==='cows'){const c=s.cows.slice(0,cowCount(s)).filter(c=>c.ready).sort((a,b)=>dist(a)-dist(b))[0];return c?[c.x,c.z]:[-9.4,4.6];}
 if(kind==='tables'){const i=s.tables.map((t,i)=>i).filter(i=>s.tables[i].dirty).sort((a,b)=>Math.hypot(TABLES[a][0]-h.x,TABLES[a][1]-h.z)-Math.hypot(TABLES[b][0]-h.x,TABLES[b][1]-h.z))[0];return i==null?[2.4,5.9]:[TABLES[i][0],TABLES[i][1]-.75];}
 if(kind==='sink')return SINK;if(kind==='drive')return [DRIVE.pad[0]-.6,DRIVE.pad[1]];if(kind==='milk')return SOURCES.milk.pos;
 if(kind==='meat')return SOURCES.meat.pos;if(kind==='cups')return SOURCES.cups.pos;if(kind==='in'||kind==='out'){const sid=h.station??=pickStation(s,id,kind);return (kind==='in'?inZone:outZone)(STATIONS[sid].pos);}return shelfZone(SHELVES[id].pos);}
// Among the open machines of one kind, feed the emptiest and empty the fullest (chosen once per step).
function pickStation(s,base,kind){const ids=Object.keys(STATIONS).filter(id=>baseOf(id)===base&&stationOpen(s,id));
 const score=id=>kind==='in'?s.stations[id].in/stationCaps(s,id).inCap:-s.stations[id].out;return ids.sort((a,b)=>score(a)-score(b))[0]??base;}
function stepHelper(s,h,dt){if(h.loop==='rest'){h.moving=false;return;}
 // Robots: the battery drains while they move; when low (and their hands are empty, or it is flat) they go and charge.
 if(h.robot){if(h.charging){if(move(h,DOCK,dt,.35)){h.batt=Math.min(h.battMax,h.batt+dt*h.battMax/CHARGE_TIME);if(h.batt>=h.battMax)h.charging=false;}return;}
  if(h.moving)h.batt=Math.max(0,h.batt-dt);if((h.batt<=.15*h.battMax&&!h.carry.length)||h.batt<=0){h.charging=true;h.step=0;h.idle=0;h.station=null;return;}}
 const st=LOOPS[h.loop][h.step],[kind,id]=st.go.split(':');
 if(kind==='driveTake'){stepDriveTake(s,h,dt);return;}const t=target(s,h);
 h.wants=st.take??(kind==='field'?'potato':kind==='cows'?'beef':kind==='tables'?'tray':null);
 const roam=kind==='field'||kind==='cows',arrived=move(h,t,dt,roam?.2:.35);if(!arrived&&!roam)return;
 const before=h.carry.length;interact(s,h,dt);h.idle=h.carry.length===before?h.idle+dt:0;
 let done=false;if(st.until==='full')done=h.carry.length>=h.cap||(h.idle>2.5&&h.carry.length>0);
 else if(kind==='in')done=!h.carry.includes(STATIONS[id].in)||h.idle>2.5;else if(kind==='shelf')done=!h.carry.includes(id)||h.idle>2.5;
 else if(kind==='sink')done=!h.carry.includes('tray')||h.idle>2.5;
 else if(kind==='drive'){done=!h.carry.length||h.idle>2.5;if(done)for(const k of h.carry.splice(0))if(SHELVES[k]&&s.shelves[k]<shelfCap(s,k))s.shelves[k]++;}
 // Empty-handed and nothing coming (someone else took the goods): start the loop again instead of waiting forever.
 if(!done&&st.until==='full'&&!h.carry.length&&h.idle>4){h.step=0;h.idle=0;h.station=null;return;}
 // Waiting at an empty output while the other machine of the kind has goods: switch to it.
 if(!done&&kind==='out'&&h.idle>1.5){const alt=pickStation(s,id,'out');if(alt!==h.station&&s.stations[alt].out>0){h.station=alt;h.idle=0;}}
 if(done){h.step=(h.step+1)%LOOPS[h.loop].length;h.idle=0;h.station=null;}}
// Drive helper: fetch from the counter shelves what the cars in line are waiting for, then bring it to the drive pad.
function stepDriveTake(s,h,dt){h.wants=null;const k=PRODUCTS.find(k=>driveNeed(s,k)-count(h,k)>0&&s.shelves[k]>0);
 if(!k){h.moving=false;h.idle+=dt;if(h.carry.length&&h.idle>1){h.step=1;h.idle=0;}return;}
 if(!move(h,shelfZone(SHELVES[k].pos),dt,.35))return;h.cool-=dt;if(h.cool>0)return;
 if(h.carry.length<h.cap){s.shelves[k]--;h.carry.push(k);h.cool=.15;h.idle=0;}else{h.step=1;h.idle=0;}}
function move(a,[x,z],dt,stop=.1){const dx=x-a.x,dz=z-a.z,d=Math.hypot(dx,dz);if(d<=stop){a.moving=false;return true;}const step=Math.min(d,a.speed*dt);a.x+=dx/d*step;a.z+=dz/d*step;a.heading=Math.atan2(dx,dz);a.moving=true;return d-step<=stop;}

// Customers: some order at a self-service kiosk (card only) then wait at the pickup line; the others queue at the
// shortest open register and pay cash, or by card when that register has a payment terminal (2 % commission, but the
// money lands in the account at once instead of piling up by the till).
const queueSpot=(r,i)=>[REGISTERS[r].pos[0],REGISTERS[r].pos[1]+1.3+i*1.05];
const kioskSpot=(k,i)=>[KIOSKS[k][0],KIOSKS[k][1]+.95+i*.95];
const openRegisters=s=>REGISTERS.map((_,i)=>i).filter(i=>registerOpen(s,i));
const waiting=s=>s.customers.filter(c=>WAITING.includes(c.phase));
export const hasTerminal=(s,r)=>!!s.unlocked[r?'terminal2':'terminal1'];
const done=c=>PRODUCTS.every(k=>c.got[k]>=c.wants[k]);
const bill=(s,c)=>PRODUCTS.reduce((t,k)=>t+c.got[k]*price(s,k),0);
function spawnCustomer(s){const burger=s.unlocked.burger&&Math.random()<.55?1+Math.floor(Math.random()*2):0,fries=burger&&Math.random()<.4?0:1+Math.floor(Math.random()*(burger?2:3)),soda=s.unlocked.soda&&Math.random()<.5?1+(Math.random()<.3?1:0):0,icecream=s.unlocked.dessert&&Math.random()<.35?1:0;
 const c={id:s.nextId++,x:DOOR[0]-3+Math.random()*2,z:DOOR[1]+2,heading:Math.PI,wants:{fries,burger,soda,icecream},got:{fries:0,burger:0,soda:0,icecream:0},card:Math.random()<.55,wait:0,look:Math.floor(Math.random()*6),pick:0,moving:false,speed:2.6,order:0};
 const nk=kioskCount(s),kq=k=>s.customers.filter(x=>x.phase==='kiosk'&&x.kiosk===k).length;
 const k=nk?[...Array(nk).keys()].sort((a,b)=>kq(a)-kq(b))[0]:-1;
 if(k>=0&&kq(k)<KIOSK_QUEUE&&Math.random()<Math.min(.75,.3*nk)){c.phase='kiosk';c.kiosk=k;c.card=true;}
 else{const q=s.customers.filter(x=>x.phase==='queue');c.phase='queue';c.reg=openRegisters(s).sort((a,b)=>q.filter(x=>x.reg===a).length-q.filter(x=>x.reg===b).length)[0];}
 s.customers.push(c);}
function pay(s,c,where,[x,z]){const amount=bill(s,c);s.served++;s.today.served++;s.today.revenue+=amount;s.rep=Math.min(5,s.rep+.08);c.phase='leave';c.happy=true;leftAfter(s,c);
 // Some customers eat on the terrace when a clean table is free; they leave a dirty tray behind.
 if(s.unlocked.terrace&&Math.random()<.45){const i=s.tables.findIndex(t=>!t.by&&!t.dirty);if(i>=0){s.tables[i].by=c.id;c.phase='eat';c.table=i;c.eat=EAT_TIME;}}
 if(where==='card'){const fee=amount*CARD_FEE;s.money+=amount-fee;s.fees+=fee;s.cardSales+=amount;popup(s,`💳 +${Math.round(amount-fee)} $`,x,z,'card');}
 else{s.piles[where]+=amount;s.cashSales+=amount;popup(s,`💵 +${Math.round(amount)} $`,x,z);}}
function stepCustomers(s,dt){const pos=[0,0],kpos=KIOSKS.map(()=>0);let pi=0;const pickupHead=[];
 for(const c of s.customers){
  if(c.phase==='queue'){const r=c.reg,R=REGISTERS[r],i=pos[r]++;move(c,queueSpot(r,i),dt,.05);c.wait+=dt;if(i===0&&!c.moving){c.heading=Math.PI;
    const player=near(s.player,R.serve,1.1);if(player||s.cashiers[r]){c.pick-=dt;if(c.pick<=0){for(const k of PRODUCTS)if(c.got[k]<c.wants[k]&&s.shelves[k]>0){s.shelves[k]--;c.got[k]++;c.pick=player?.25:.45;break;}}}
    if(done(c))pay(s,c,c.card&&hasTerminal(s,r)?'card':r,R.pos);}}
  else if(c.phase==='kiosk'){const k=c.kiosk,i=kpos[k]++;move(c,kioskSpot(k,i),dt,.05);c.wait+=dt;
   if(i===0&&!c.moving){c.heading=Math.PI;if(s.customers.filter(x=>x.phase==='pickup').length<PICKUP.length){c.order+=dt;if(c.order>=KIOSK_ORDER){c.phase='pickup';c.ordered=s.t;}}}}
  else if(c.phase==='pickup'){const spot=PICKUP[Math.min(pi++,PICKUP.length-1)];move(c,spot,dt,.05);c.wait+=dt;if(!c.moving){c.heading=Math.PI;pickupHead.push(c);}}
  else if(c.phase==='eat'){const T=TABLES[c.table];if(move(c,[T[0],T[1]-.7],dt,.05)){c.heading=Math.PI;c.eat-=dt;if(c.eat<=0){s.tables[c.table].by=null;s.tables[c.table].dirty=true;s.rep=Math.min(5,s.rep+.03);c.phase='leave';}}}
  else move(c,EXIT,dt,.2);
  if(WAITING.includes(c.phase)&&c.wait>PATIENCE){c.phase='leave';c.happy=false;s.lost++;s.today.lost++;s.rep=Math.max(0,s.rep-.35);leftAfter(s,c);popup(s,'😠 −★',c.x,c.z,'bad');}}
 // Pickup counter: orders are handed over one item at a time, oldest order first, as soon as the shelves have the goods.
 s.pickupTimer-=dt;if(s.pickupTimer<=0&&pickupHead.length){for(const c of pickupHead.sort((a,b)=>a.ordered-b.ordered)){const k=PRODUCTS.find(k=>c.got[k]<c.wants[k]&&s.shelves[k]>0);if(!k)continue;s.shelves[k]--;c.got[k]++;s.pickupTimer=PICKUP_STEP;if(done(c))pay(s,c,'card',[c.x,c.z-1.2]);break;}}
 s.customers=s.customers.filter(c=>!(c.phase==='leave'&&Math.hypot(c.x-EXIT[0],c.z-EXIT[1])<.3));}

// Machines with several baskets (the fryer): each basket takes one input and cooks it on its own for `baskets` times
// the machine time, so all baskets together make as much as one fast batch line. A cooked basket waits for room.
export const basketsOf=(s,id)=>{const st=s.stations[id];return st.baskets??=Array.from({length:STATIONS[id].baskets},()=>({on:false,t:0}));};
function stepBaskets(s,id,st,dt){const def=STATIONS[id],T=stationTime(s,id)*def.baskets,y=def.yield??1,open=stationOpen(s,id),cap=stationCaps(s,id).outCap;st.working=false;
 for(const b of basketsOf(s,id)){if(!b.on&&open&&st.in>0){st.in--;b.on=true;b.t=0;}if(!b.on)continue;st.working=true;b.t=Math.min(T,b.t+dt);if(b.t>=T&&st.out+y<=cap){st.out+=y;b.on=false;b.t=0;}}
 st.timer=0;}
export const EAT_TIME=10,REPAIR=2.5,TECH_DELAY=90,TECH_FEE=60,BILL_DELAY=200,LATE_FEE=1.25;
// Supplier cost of each delivered item, billed the next morning.
const SUPPLY={meat:.5,cups:.15,milk:.4};
// Day clock: at closing time a popup; when the night ends the day report is kept and the morning bills arrive.
function stepDay(s,dt){const was=isOpen(s);s.clock+=dt;s.report=Math.max(0,s.report-dt);
 if(was&&!isOpen(s))popup(s,'🌙 Fermeture, plus de nouveaux clients',s.player.x,s.player.z,'info');
 if(s.clock>=DAY){s.clock-=DAY;s.lastDay={day:s.day,...s.today};s.report=10;s.day++;s.today=newDay();issueBills(s);popup(s,`☀️ Jour ${s.day}`,s.player.x,s.player.z,'info');}
 for(const b of s.bills)if(!b.late&&s.t>b.due){b.late=true;b.amount=Math.round(b.amount*LATE_FEE);s.rep=Math.max(0,s.rep-.3);popup(s,`🧾 Retard : ${b.label} +25 %`,DESK[0],DESK[1],'bad');}}
export const machinesCount=s=>Object.keys(STATIONS).filter(id=>stationOpen(s,id)).length+openRegisters(s).length+kioskCount(s);
function issueBills(s){const L=s.lastDay,list=[['Loyer',Math.round(15+.04*(L?.revenue??0))],['Électricité',4*machinesCount(s)],['Fournisseurs',Math.round(s.supply)]];s.supply=0;
 for(const [label,amount] of list)if(amount>0)s.bills.push({id:s.nextId++,label,amount,due:s.t+BILL_DELAY,late:false});}
export const billsDue=s=>s.bills.reduce((t,b)=>t+b.amount,0);
// Unforeseen events, once the restaurant runs: a machine breaks down, a delivery is late, or a hygiene inspection comes.
function stepEvents(s,dt){const ev=s.event;
 if(ev){if(ev.kind==='retard'){ev.t-=dt;if(ev.t<=0)s.event=null;}
  else if(ev.kind==='inspection'){ev.t-=dt;if(ev.t<=0){s.event=null;const ok=inspectionOk(s);s.rep=Math.max(0,Math.min(5,s.rep+(ok?.4:-.4)));if(ok)s.money+=80;popup(s,ok?'✅ Inspection réussie +80 $':'❌ Inspection ratée −★',s.player.x,s.player.z,ok?'info':'bad');}}
  else if(ev.kind==='panne'){const st=s.stations[ev.id];if(!st?.broken)s.event=null;
   // Nobody came: after TECH_DELAY seconds a technician repairs it and sends a bill.
   else if((st.broken.t=(st.broken.t??0)+dt)>=TECH_DELAY){delete st.broken;s.event=null;s.bills.push({id:s.nextId++,label:'Dépannage',amount:TECH_FEE,due:s.t+BILL_DELAY,late:false});popup(s,`🔧 Technicien : facture ${TECH_FEE} $`,STATIONS[ev.id].pos[0],STATIONS[ev.id].pos[1],'bad');}}
  return;}
 if(s.served<25||!isOpen(s))return;s.eventTimer-=dt;if(s.eventTimer>0)return;s.eventTimer=100+Math.random()*80;
 const kinds=['panne','retard','inspection'],kind=kinds[Math.floor(Math.random()*3)];
 if(kind==='panne'){const ids=Object.keys(STATIONS).filter(id=>stationOpen(s,id)&&id!=='butcher');const id=ids[Math.floor(Math.random()*ids.length)];s.stations[id].broken={fix:0};s.event={kind,id,label:`🔧 Panne : ${STATIONS[id].name} — allez la réparer`};}
 else if(kind==='retard'){const ks=Object.keys(SOURCES).filter(k=>sourceOpen(s,k));if(!ks.length){s.eventTimer=20;return;}const k=ks[Math.floor(Math.random()*ks.length)];s.sources[k].late=45;s.event={kind,k,t:45,label:`🚚 Livraison en retard : ${SOURCES[k].name}`};}
 else s.event={kind,t:40,label:'🧑‍⚕️ Inspection : machines, étagères, tables et factures'};
 popup(s,s.event.label.split(' —')[0].split(' :')[0],s.player.x,s.player.z,'bad');}
export const inspectionOk=s=>!Object.values(s.stations).some(st=>st.broken)&&!s.tables.some(t=>t.dirty)&&!s.bills.some(b=>b.late)&&Object.keys(SHELVES).every(k=>!shelfOpen(s,k)||s.shelves[k]>0);
// Drive: cars come up the road, queue, and the first one takes its order from the pad (card payment, +10 % tip).
function stepDrive(s,dt){const D=s.drive;if(!s.unlocked.drive)return;
 D.timer-=dt;if(isOpen(s)&&D.timer<=0&&D.cars.filter(c=>c.phase==='queue').length<DRIVE.maxCars){D.timer=(14+Math.random()*8)/Math.max(.2,traffic(s));
  const fries=1+Math.floor(Math.random()*2),burger=s.unlocked.burger&&Math.random()<.6?1+Math.floor(Math.random()*2):0,soda=s.unlocked.soda&&Math.random()<.6?1+Math.floor(Math.random()*2):0,icecream=s.unlocked.dessert&&Math.random()<.3?1:0;
  D.cars.push({id:s.nextId++,z:16,phase:'queue',wants:{fries,burger,soda,icecream},got:{fries:0,burger:0,soda:0,icecream:0},wait:0,look:Math.floor(Math.random()*5),moving:false});}
 let i=0;D.pick-=dt;
 for(const c of D.cars){if(c.phase==='queue'){const tz=DRIVE.stop+i*DRIVE.gap,head=i===0;i++;const d=tz-c.z;c.moving=Math.abs(d)>.05;c.z+=Math.sign(d)*Math.min(Math.abs(d),5*dt);c.wait+=dt;
   if(head&&!c.moving&&D.pick<=0){const k=PRODUCTS.find(k=>c.got[k]<c.wants[k]&&D.pad.includes(k));if(k){D.pad.splice(D.pad.indexOf(k),1);c.got[k]++;D.pick=.3;}}
   if(done(c)){const amount=bill(s,c)*1.1,fee=amount*CARD_FEE;s.money+=amount-fee;s.fees+=fee;s.cardSales+=amount;s.served++;s.today.served++;s.today.revenue+=amount;s.rep=Math.min(5,s.rep+.06);c.phase='leave';popup(s,`🚗 +${Math.round(amount-fee)} $`,DRIVE.road,c.z,'card');}
   else if(c.wait>DRIVE.patience){c.phase='leave';s.lost++;s.today.lost++;s.rep=Math.max(0,s.rep-.2);popup(s,'🚗 😠 −★',DRIVE.road,c.z,'bad');}}
  else{c.moving=true;c.z-=7*dt;}}
 D.cars=D.cars.filter(c=>c.z>-26);}
export function stepArcade(s,dt,input={x:0,z:0}){dt=Math.min(dt,.1);s.t+=dt;const p=s.player,len=Math.hypot(input.x,input.z);
 if(len>.05){const k=Math.min(1,len);p.x=Math.max(WORLD.minX,Math.min(WORLD.maxX,p.x+input.x/len*k*p.speed*dt));p.z=Math.max(WORLD.minZ,Math.min(WORLD.maxZ,p.z+input.z/len*k*p.speed*dt));p.heading=Math.atan2(input.x,input.z);p.moving=true;}else p.moving=false;
 collide(p,obstacles(s));
 interact(s,p,dt);playerExtras(s,p,dt);for(const h of s.helpers)stepHelper(s,h,dt);
 for(const pl of s.plots)if(!pl.ripe){pl.grow+=dt/growTime(s);if(pl.grow>=1){pl.grow=1;pl.ripe=true;}}
 for(let i=0;i<cowCount(s);i++){const c=s.cows[i];if(!c.ready){c.grow+=dt/COW_TIME;if(c.grow>=1){c.grow=1;c.ready=true;}}}
 for(const [id,def] of Object.entries(STATIONS)){const st=s.stations[id],y=def.yield??1;if(st.broken){st.working=false;continue;}if(def.baskets){stepBaskets(s,id,st,dt);continue;}st.working=stationOpen(s,id)&&st.in>0&&st.out+y<=stationCaps(s,id).outCap;if(st.working){st.timer+=dt;if(st.timer>=stationTime(s,id)){st.timer=0;st.in--;st.out+=y;}}else st.timer=0;}
 for(const k of Object.keys(SOURCES)){const src=s.sources[k];if(src.late>0){src.late-=dt;continue;}if(sourceOpen(s,k)&&src.n<sourceCap(s,k)){src.timer+=dt;if(src.timer>=sourceEvery(s,k)){src.timer=0;src.n++;s.supply+=SUPPLY[k];}}}
 stepDay(s,dt);stepEvents(s,dt);stepDrive(s,dt);
 s.rush=Math.max(0,s.rush-dt);s.rushCool=Math.max(0,s.rushCool-dt);
 const room=MAX_QUEUE*openRegisters(s).length+(KIOSK_QUEUE+2)*kioskCount(s)+(s.unlocked.terrace?TABLES.length:0);
 s.spawnTimer-=dt;if(isOpen(s)&&s.spawnTimer<=0&&waiting(s).length<room){spawnCustomer(s);s.spawnTimer=((s.unlocked.burger?3.2:4.5)+Math.random()*2)/Math.max(.05,traffic(s));}
 stepCustomers(s,dt);for(const pp of s.popups)pp.t+=dt;s.popups=s.popups.filter(pp=>pp.t<1.4);}

// Saves: schema 2 loads as is; a schema 1 save is rebuilt into a fresh schema 2 game with the same money, purchases,
// reputation and counters (helpers come back on their default missions).
export function loadArcade(json){const o=typeof json==='string'?JSON.parse(json):json;if(!o||!o.player||!Array.isArray(o.plots))throw Error('Sauvegarde illisible.');
 if(o.schema===SAVE_SCHEMA){o.popups=[];return fill(o);}
 if(o.schema!==1)throw Error('Sauvegarde illisible.');
 const s=createArcade();s.money=(o.money??0)+(Array.isArray(o.piles)?o.piles.reduce((a,b)=>a+b,0):o.pile??0);s.served=o.served??0;s.rep=o.rep??2.5;s.lost=o.lost??0;
 for(const u of UNLOCKS)if(o.unlocked?.[u.id]){s.unlocked[u.id]=true;applyUnlock(s,u.id);}
 s.shelves.fries=Math.min(o.shelves?.fries??0,shelfCap(s,'fries'));s.shelves.burger=Math.min(o.shelves?.burger??0,shelfCap(s,'burger'));
 s.player.x=-6.4;s.player.z=-4.6;return s;}
export const carried=count;
