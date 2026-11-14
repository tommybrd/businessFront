// CampingFront (alpha): the player is the manager of a campsite. Campers arrive in the afternoon, are checked in at the
// reception, settle on their pitch for one to three nights, then live their day: showers, bread in the morning, pool and
// ice cream in the afternoon, the evening show. The manager walks around and keeps it all going by hand: toilet paper,
// bread, chlorine, rubbish bags, breakdowns, noisy neighbours at night. Staff take over the same jobs. Campers leave a
// review when they go; the average is the reputation of the campsite. The simulation runs in real seconds and only
// holds plain JSON; the 3D view only draws this state.
export const SAVE_SCHEMA=1,GAME='camping',RADIUS=1.05,PLAYER_R=.32;
export const WORLD={minX:-15.3,maxX:17.3,minZ:-21,maxZ:8.4};
export const ITEMS={paper:{name:'Papier toilette'},bread:{name:'Baguette',price:2},ice:{name:'Glace',price:3},chlor:{name:'Chlore'},trash:{name:'Sac poubelle'}};
export const PICKABLE=Object.keys(ITEMS);
// The day: 7:00 to 23:00 lasts OPEN seconds, the night (23:00 to 7:00) NIGHT seconds. Night hours count on from 23 to 31.
export const OPEN=130,NIGHT=20,DAY=OPEN+NIGHT;
export const hourOf=s=>s.clock<OPEN?7+16*s.clock/OPEN:23+8*(s.clock-OPEN)/NIGHT;
export const isDay=s=>s.clock<OPEN;

// Pitches, in the order they open within each kind. Campers stand at the "door" of their pitch, on the lane south of it.
export const KINDS={tent:{name:'Tente',icon:'⛺',price:24,trash:1,start:4,level:'tents'},caravan:{name:'Caravane',icon:'🚐',price:40,trash:2,start:2,needs:'caravan',level:'caravans'},
 mobil:{name:'Mobil-home',icon:'🏠',price:80,trash:3,start:2,needs:'mobil',level:'mobils'}};
const rows=(kind,list)=>list.map(([x,z],n)=>({x,z,kind,n}));
export const PITCHES=[...rows('tent',[[-4.5,.2],[-4.5,-3.8],[-8.5,.2],[-8.5,-3.8],[-4.5,-7.8],[-12.5,.2],[-8.5,-7.8],[-12.5,-3.8],[-4.5,-11.8],[-12.5,-7.8],[-8.5,-11.8],[-12.5,-11.8]]),
 ...rows('caravan',[[4.5,-7.8],[8.5,-7.8],[4.5,-11.8],[12.5,-7.8],[8.5,-11.8],[12.5,-11.8]]),...rows('mobil',[[-5.4,-17.8],[-9.2,-17.8],[-13,-17.8],[-1.6,-17.8]])];
export const doorOf=i=>[PITCHES[i].x,PITCHES[i].z+1.95];
// Places. Everything people walk to sits on an east-west lane that meets the main alley (x = 0), so walks stay tidy.
export const GATE=[0,8.6],ROAD_Z=10.4,ROAD_END=16.5;
export const RECEPTION={pos:[4.5,5.6],serve:[4.5,4.4],cash:[6.6,4.4],queue:i=>[4.5+i,6.75],max:6};
export const SHOP={pos:[-5.75,5.6],till:[-4.3,5.6],serve:[-4.3,4.4],cash:[-2.6,4.4],queue:i=>[-4.3-i,6.75],max:5};
export const SHELVES={bread:{name:'Pain',pos:[-7.2,5.6],cap:10,needs:'shop'},ice:{name:'Glaces',pos:[-5.9,5.6],cap:8,needs:'freezer'}};
export const shelfZone=([x,z])=>[x,z-1.2];
// Deliveries: `spot` is where staff stand to take from them. Bread only comes once a day, at dawn.
export const SOURCES={paper:{name:'Réserve de papier',item:'paper',pos:[8.6,3.4],spot:[8.6,4.45],cap:10,every:2.4},
 bread:{name:'Pain du boulanger',item:'bread',pos:[-2.2,7.4],spot:[-1.25,7.4],cap:0,needs:'shop'},
 ice:{name:'Congélateur',item:'ice',pos:[-9.4,4.4],spot:[-8.3,4.4],cap:10,every:1.5,needs:'freezer'},
 chlor:{name:'Chlore',item:'chlor',pos:[10.8,3.4],spot:[10.8,4.45],cap:5,every:5,needs:'pool'}};
export const SANIT={pos:[8,-3],door:[8,-1.05],paper:[6.1,-.9],mop:[9.9,-.9],cap:10,cabins:3};
export const DUMP={pos:[-12.6,7.4],spot:[-11.2,7.4],cap:20};
export const POOL={x0:8,x1:14.4,z0:-19.6,z1:-15.6,pad:[9,-14.5],gate:[11.2,-14.7],cap:6};
export const STAGE={pos:[4.2,-17.7],pad:[4.2,-15.9],crowd:i=>[1.8+(i%7)*.8,-15.2+(Math.floor(i/7)%3)*.6]};
export const ELEC=[2,-10.8],DESK=[6.9,2.3];

// One-off unlocks: dashed tiles on the ground, each shown once the previous step (`after`) is bought.
export const UNLOCKS=[
 {id:'receptionist',name:'Réceptionniste',price:70,pos:[2.4,4.4],after:null},
 {id:'cleaner',name:'Agent d’entretien',price:110,pos:[-10.2,7.2],after:'receptionist'},
 {id:'terminal',name:'Terminal CB',price:90,pos:[2.6,6.7],after:'receptionist'},
 {id:'shop',name:'Épicerie + pain',price:150,pos:[-5.75,4.9],after:'receptionist'},
 {id:'shopkeeper',name:'Épicier',price:160,pos:[-2,2.9],after:'shop'},
 {id:'freezer',name:'Glaces',price:200,pos:[-9.4,4.4],after:'shop'},
 {id:'cart',name:'Voiturette',price:180,pos:[-2.1,-11.8],after:'cleaner'},
 {id:'caravan',name:'Caravanes + bornes',price:280,pos:[4.5,-7.8],after:'shop'},
 {id:'handyman',name:'Homme à tout faire',price:300,pos:[3.2,.6],after:'caravan'},
 {id:'pool',name:'Piscine',price:650,pos:[11.2,-17.6],after:'caravan'},
 {id:'lifeguard',name:'Maître-nageur',price:320,pos:[15.4,-14.5],after:'pool'},
 {id:'stage',name:'Scène + sono',price:480,pos:[4.2,-17.7],after:'pool'},
 {id:'animateur',name:'Animateur',price:350,pos:[1.4,-18.2],after:'stage'},
 {id:'mobil',name:'Mobil-homes',price:900,pos:[-5.4,-17.8],after:'pool'}];
// Levelled upgrades: bought again and again, each level dearer (price = base × growth^level).
const nextPitch=kind=>s=>{const p=PITCHES.find(p=>p.kind===kind&&p.n===pitchCount(s,kind));return p?[p.x,p.z]:[0,0];};
export const LEVELS=[
 {id:'tents',name:'Emplacement tente',after:null,base:35,growth:1.3,max:8,pos:nextPitch('tent'),tip:'Une tente de plus'},
 {id:'caravans',name:'Emplacement caravane',after:'caravan',base:120,growth:1.35,max:4,pos:nextPitch('caravan'),tip:'Une caravane de plus'},
 {id:'mobils',name:'Mobil-home',after:'mobil',base:400,growth:1.5,max:2,pos:nextPitch('mobil'),tip:'Un mobil-home de plus'},
 {id:'sac',name:'Chariot',after:'cleaner',base:120,growth:1.6,pos:[12.8,3.4],tip:'+6 objets portés'},
 {id:'sanit',name:'Sanitaires',after:'cleaner',base:180,growth:1.6,max:5,pos:[12,-2.9],tip:'+1 cabine, se salissent moins'},
 {id:'pub',name:'Guide du campeur',after:'shop',base:200,growth:1.6,pos:[6.2,8],tip:'+20 % d’arrivées'},
 {id:'stock',name:'Réserve',after:'freezer',base:250,growth:1.7,pos:[14.8,4.5],tip:'+50 % de stock partout'},
 {id:'confort',name:'Étoile de plus',after:'caravan',base:350,growth:1.7,pos:[14.8,6.7],tip:'+10 % sur les tarifs'},
 {id:'equipe',name:'Saisonnier',after:'handyman',base:400,growth:1.45,pos:[12.8,5.7],tip:'Un saisonnier là où ça manque'}];
export const lvl=(s,id)=>s.levels[id]??0;
export const levelPrice=(s,L)=>Math.round(L.base*L.growth**lvl(s,L.id));
export const pitchCount=(s,k)=>!KINDS[k].needs||s.unlocked[KINDS[k].needs]?KINDS[k].start+lvl(s,KINDS[k].level):0;
export const pitchOpen=(s,i)=>PITCHES[i].n<pitchCount(s,PITCHES[i].kind);
export const openPitches=s=>PITCHES.reduce((n,p,i)=>n+(pitchOpen(s,i)?1:0),0);
export const occupied=s=>s.pitches.reduce((n,p)=>n+(p.by!=null?1:0),0);
export const stockMul=s=>1+.5*lvl(s,'stock');
export const sourceOpen=(s,k)=>!SOURCES[k].needs||!!s.unlocked[SOURCES[k].needs];
export const sourceCap=(s,k)=>k==='bread'?Math.max(s.sources.bread.n,breadOrder(s)):Math.round(SOURCES[k].cap*stockMul(s));
export const shelfOpen=(s,k)=>!!s.unlocked[SHELVES[k].needs];
export const shelfCap=(s,k)=>Math.round(SHELVES[k].cap*stockMul(s));
export const sanitCap=s=>Math.round(SANIT.cap*stockMul(s));
export const cabins=s=>SANIT.cabins+lvl(s,'sanit');
export const dumpCap=s=>Math.round(DUMP.cap*stockMul(s));
export const nightPrice=(s,kind)=>Math.round(KINDS[kind].price*(1+.1*lvl(s,'confort')));
export const price=(s,k)=>ITEMS[k].price*(1+.1*lvl(s,'confort'));
// The baker is told how many campers are there: about two baguettes per pitch taken, and a few more.
export const breadOrder=s=>Math.round(4+2.2*occupied(s));
const playerCap=s=>6+6*lvl(s,'sac'),helperCap=s=>6+2*lvl(s,'sac');
// Arrivals: reputation and the camper's guide bring people in, between late morning and the evening.
export const PATIENCE=50,CHECKIN=1.5;
export const traffic=s=>(.5+.15*s.rep)*(1+.2*lvl(s,'pub'));
const arrivalHours=s=>{const h=hourOf(s);return h>=11.5&&h<20.5;};
export const avgMood=s=>{const l=s.campers.filter(c=>c.in);return l.length?l.reduce((t,c)=>t+c.mood,0)/l.length:null;};

const newDay=()=>({revenue:0,arrivals:0,departures:0,stars:0,lost:0,bills:0,fixed:0,show:null});
export function createCamping(){const s={schema:SAVE_SCHEMA,game:GAME,t:0,money:40,piles:[0,0],nextId:1,
 player:{id:0,role:'player',x:1.6,z:6.2,heading:0,carry:[],cap:6,speed:4.2,cool:0,moving:false},
 guests:[],helpers:[],posts:{},pitches:[],campers:[],sanit:{paper:8,dirt:0},shop:{bread:0,ice:0},sources:{},pool:{chlor:1},dump:0,
 unlocked:{},levels:{},paid:{},rep:2.5,reviews:[],lost:0,arrivals:0,clock:OPEN*.375,day:1,popups:[]};
 return fill(s);}
// Fields added since the first saves get their defaults here, for new games and loaded ones alike.
function fill(s){s.guests=[];delete s.replica;s.pitches??=[];PITCHES.forEach((p,i)=>s.pitches[i]??={by:null,trash:0,noisy:false,down:false});
 for(const k of Object.keys(SOURCES))s.sources[k]??={n:k==='paper'?6:0,timer:0};
 s.today??=newDay();s.lastDay??=null;s.report??=0;s.bills??=[];s.supply??=0;s.deskCool??=0;s.event??=null;s.eventTimer??=70;s.show??={day:0,state:'idle',t:0,kind:0};s.spawnTimer??=3;
 s.posts??={};s.reviews??=[];s.popups??=[];return s;}

// Tiles to show now: one-off unlocks whose prerequisite is bought, plus the next level of each levelled upgrade. What is
// bought only ever grows, so the list is rebuilt when this signature changes. Callers must not modify the array.
const sig=s=>{let n=0,l=0;for(const k in s.unlocked)if(s.unlocked[k])n++;for(const k in s.levels)l+=s.levels[k];return n+':'+l;};
const memo=build=>{const cache=new WeakMap();return s=>{const k=sig(s),c=cache.get(s);if(c&&c.k===k)return c.v;const v=build(s);cache.set(s,{k,v});return v;};};
export const visibleUnlocks=memo(s=>{const out=UNLOCKS.filter(u=>!s.unlocked[u.id]&&(!u.after||s.unlocked[u.after])).map(u=>({...u,key:u.id}));
 for(const L of LEVELS){if(L.after&&!s.unlocked[L.after])continue;const n=lvl(s,L.id);if(L.max!=null&&n>=L.max)continue;
  out.push({id:L.id,level:n+1,key:`${L.id}#${n+1}`,name:L.max===undefined?`${L.name} niv. ${n+1}`:L.name,price:levelPrice(s,L),pos:typeof L.pos==='function'?L.pos(s):L.pos,tip:L.tip});}
 return out;});
const near=(a,[x,z],r=RADIUS)=>Math.hypot(a.x-x,a.z-z)<r;
const count=(a,k)=>{let n=0;for(const c of a.carry)if(c===k)n++;return n;};
export const carried=count;
function drop(a,k){const i=a.carry.lastIndexOf(k);if(i<0)return false;a.carry.splice(i,1);return true;}
const popup=(s,text,x,z,kind='money')=>{s.popups.push({id:s.nextId++,text,x,z,t:0,kind});};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const bodies=s=>[s.player,...s.guests];
const anyBody=(s,pos,r=1.1)=>s.player&&(near(s.player,pos,r)||s.guests.some(g=>near(g,pos,r)));
const crewAt=(s,loops,pos,r=1.3)=>s.helpers.some(h=>loops.includes(h.loop)&&!h.moving&&near(h,pos,r));
// The player picks up only the kinds left switched on in their pick filter (all by default); staff take what their job needs.
const takes=(a,item)=>a.role==='player'?a.pick?.[item]!==false:a.wants===item&&count(a,item)<(a.max??a.cap);
export function setPick(s,item,on,a=s.player){a.pick??={};if(item==='all'||item==='none'){for(const k of PICKABLE)a.pick[k]=item==='all';}else if(PICKABLE.includes(item))a.pick[item]=!!on;}
// Put back what someone carries: deliveries take their goods back while they have room; the rest is thrown away.
function putBack(s,list){let back=0;for(const k of list){const src=Object.entries(SOURCES).find(([,d])=>d.item===k);if(src&&sourceOpen(s,src[0])&&s.sources[src[0]].n<sourceCap(s,src[0])){s.sources[src[0]].n++;back++;}}
 return {back,thrown:list.length-back};}
export function emptyHands(s,p=s.player){if(!p.carry.length)return null;const r=putBack(s,p.carry);p.carry=[];popup(s,r.thrown?`🗑️ ${r.back} rangés · ${r.thrown} jetés`:`🗑️ ${r.back} rangés`,p.x,p.z,'info');return r;}

// What the player cannot walk through (axis-aligned boxes [x0,z0,x1,z1]): buildings and counters, then whatever stands
// on the pitches right now (tents and caravans come and go with the campers).
const boxAt=(o,[x,z],w,d)=>o.push([x-w/2,z-d/2,x+w/2,z+d/2]);
const fixedBoxes=memo(s=>{const o=[[3.2,5.25,5.8,5.95],[2.8,2.2,6.2,3.6],[SANIT.pos[0]-2.25,SANIT.pos[1]-1.3,SANIT.pos[0]+2.25,SANIT.pos[1]+1.3]];
 boxAt(o,DUMP.pos,2,1.2);for(const [k,def] of Object.entries(SOURCES))if(sourceOpen(s,k))boxAt(o,def.pos,1.6,1.2);
 if(s.unlocked.shop)o.push([-8.1,5.25,-3.4,5.95],[-8,2.55,-3.4,3.5]);if(s.unlocked.pool)o.push([POOL.x0-.25,POOL.z0-.25,POOL.x1+.25,POOL.z1+.25]);
 if(s.unlocked.stage)boxAt(o,STAGE.pos,3.6,1.8);if(s.unlocked.caravan)boxAt(o,ELEC,.6,.5);
 PITCHES.forEach((p,i)=>{if(p.kind==='mobil'&&pitchOpen(s,i))o.push([p.x-1.5,p.z-1.2,p.x+1.5,p.z+.6]);});return o;});
export function obstacles(s){const o=[...fixedBoxes(s)];for(const c of s.campers){if(!c.in)continue;const p=PITCHES[c.pitch];if(p.kind==='tent')o.push([p.x-.9,p.z-1.15,p.x+.9,p.z+.45]);else if(p.kind==='caravan')o.push([p.x-1.35,p.z-1.05,p.x+1.35,p.z+.35]);}return o;}
// Push a round body out of every box it overlaps (along the shallowest axis).
function collide(a,boxes,r=PLAYER_R){for(const [x0,z0,x1,z1] of boxes){const cx=clamp(a.x,x0,x1),cz=clamp(a.z,z0,z1),dx=a.x-cx,dz=a.z-cz,d=Math.hypot(dx,dz);
  if(d>=r)continue;if(d>1e-6){a.x=cx+dx/d*r;a.z=cz+dz/d*r;continue;}
  const pen=[[a.x-x0+r,-1,0],[x1-a.x+r,1,0],[a.z-z0+r,0,-1],[z1-a.z+r,0,1]].sort((p,q)=>p[0]-q[0])[0];a.x+=pen[1]*pen[0];a.z+=pen[2]*pen[0];}}

// One action per tick of cooldown: take from a delivery, pick up a rubbish bag, restock the toilets, a shelf or the pool, fill the skip.
function interact(s,a,dt){a.cool-=dt;if(a.cool>0)return;let did=false;const room=a.carry.length<a.cap;
 if(room)for(const [k,def] of Object.entries(SOURCES)){const src=s.sources[k];if(sourceOpen(s,k)&&src.n>0&&near(a,def.pos,1.25)&&takes(a,def.item)){src.n--;a.carry.push(def.item);did=true;break;}}
 if(!did&&room&&takes(a,'trash'))for(let i=0;i<PITCHES.length;i++){const p=s.pitches[i];if(p.trash>0&&near(a,[PITCHES[i].x,PITCHES[i].z+1.4],1.3)){p.trash--;a.carry.push('trash');did=true;break;}}
 if(!did&&near(a,SANIT.paper)&&s.sanit.paper<=sanitCap(s)-1&&drop(a,'paper')){s.sanit.paper++;did=true;}
 if(!did)for(const [k,def] of Object.entries(SHELVES))if(shelfOpen(s,k)&&near(a,shelfZone(def.pos))&&s.shop[k]<shelfCap(s,k)&&drop(a,k)){s.shop[k]++;did=true;break;}
 if(!did&&near(a,DUMP.pos,1.7)&&s.dump<dumpCap(s)&&drop(a,'trash')){s.dump++;did=true;}
 if(!did&&s.unlocked.pool&&near(a,POOL.pad)&&s.pool.chlor<=.75&&drop(a,'chlor')){s.pool.chlor=Math.min(1,s.pool.chlor+.4);did=true;}
 if(did)a.cool=.11;}

// What only players do: pay the bills at the office, collect the cash of the reception and the shop, pay for unlock tiles.
const CASH=[RECEPTION.cash,SHOP.cash];
function playerExtras(s,a,dt){
 s.deskCool-=dt;if(s.deskCool<=0&&near(a,DESK,1.3)){const b=s.bills[0];if(b&&s.money>=b.amount){s.money-=b.amount;s.today.bills+=b.amount;s.bills.shift();s.deskCool=.35;popup(s,`🧾 ${b.label} −${b.amount} $`,DESK[0],DESK[1],'info');}}
 CASH.forEach((pos,i)=>{if(s.piles[i]>0&&near(a,pos,1.2)){const take=Math.round(s.piles[i]);s.money+=s.piles[i];s.piles[i]=0;popup(s,`💵 +${take} $`,pos[0],pos[1]);}});
 let on=null;for(const u of visibleUnlocks(s)){if(!near(a,u.pos,.95)||s.money<1)continue;on=u.key;if(a.buyKey!==u.key){a.buyKey=u.key;a.buyT=0;}a.buyT+=dt;if(!(s.paid[u.key]>0)&&a.buyT<BUY_DELAY)break;const left=u.price-(s.paid[u.key]??0),pay=Math.min(left,Math.floor(s.money),Math.max(1,Math.ceil(u.price*dt*1.4)));
  s.money-=pay;s.paid[u.key]=(s.paid[u.key]??0)+pay;if(s.paid[u.key]>=u.price){delete s.paid[u.key];if(u.level){s.levels[u.id]=lvl(s,u.id)+1;popup(s,`${u.name} !`,u.pos[0],u.pos[1],'info');applyLevel(s,u.id);}else{s.unlocked[u.id]=true;popup(s,`${u.name} !`,u.pos[0],u.pos[1],'info');applyUnlock(s,u.id);}}break;}
 if(!on){a.buyKey=null;a.buyT=0;}}
// Buying needs a deliberate stop: standing on a tile for BUY_DELAY seconds before the first coin goes in, so walking across one
// by accident costs nothing. Once something has been paid into a tile, paying carries on without the wait.
export const BUY_DELAY=1.2;
function applyUnlock(s,id){s.player.cap=playerCap(s);s.player.speed=s.unlocked.cart?5.8:4.2;
 if(id==='receptionist')s.posts.reception=true;if(id==='shopkeeper')s.posts.shop=true;if(id==='animateur')s.posts.stage=true;
 if(id==='cleaner')s.helpers.push(helper(s,'clean','Agent d’entretien'));if(id==='handyman')s.helpers.push(helper(s,'fix','Homme à tout faire'));if(id==='lifeguard')s.helpers.push(helper(s,'pool','Maître-nageur'));
 if(id==='pool')s.pool.chlor=1;}
function applyLevel(s,id){s.player.cap=playerCap(s);if(id==='sac')for(const h of s.helpers)h.cap=helperCap(s);
 if(id==='equipe'){const loop=mostNeeded(s),h=helper(s,loop,'Saisonnier '+lvl(s,'equipe'));s.helpers.push(h);popup(s,`👷 → ${MISSIONS.find(m=>m.id===loop).icon}`,h.x,h.z,'info');}}

// Staff. Three posts are held by someone who never leaves them (reception, shop till, stage); the others walk around on
// a mission that the player can change: the same jobs as the player's own.
export const MISSIONS=[
 {id:'clean',label:'Emplacements : sacs → benne',icon:'🗑️→🚛',needs:null},
 {id:'sanit',label:'Sanitaires : papier et ménage',icon:'🧻🧽',needs:null},
 {id:'shop',label:'Épicerie : pain et glaces en rayon',icon:'🥖🍦→🛒',needs:'shop'},
 {id:'pool',label:'Piscine : chlore et canards',icon:'🧪→🏊',needs:'pool'},
 {id:'fix',label:'Dépannages et tapage nocturne',icon:'🔧🤫',needs:null},
 {id:'rest',label:'Pause',icon:'💤',needs:null}];
export const missionsFor=(s,h)=>MISSIONS.filter(m=>!m.needs||s.unlocked[m.needs]);
export function assignMission(s,id,loop){const h=s.helpers.find(x=>x.id===id);if(!h||!MISSIONS.some(m=>m.id===loop))return false;putBack(s,h.carry);h.carry=[];h.loop=loop;h.phase=null;h.idle=0;h.moving=false;return true;}
function helper(s,loop,name){return {id:s.nextId++,role:'helper',name,loop,x:1.2,z:7.6,heading:0,carry:[],cap:helperCap(s),speed:3.2,cool:0,moving:false,idle:0,wants:null,phase:null,ax:(Math.random()-.5)*1.2};}
// A new seasonal worker takes the job with the fewest hands among those the campsite has, the busiest jobs first.
function mostNeeded(s){const jobs=['sanit','clean',...(s.unlocked.shop?['shop']:[]),'fix',...(s.unlocked.pool?['pool']:[])],n=j=>s.helpers.filter(h=>h.loop===j).length;return jobs.slice().sort((a,b)=>n(a)-n(b))[0];}
function move(a,[x,z],dt,stop=.1){const dx=x-a.x,dz=z-a.z,d=Math.hypot(dx,dz);if(d<=stop){a.moving=false;return true;}const step=Math.min(d,a.speed*dt);a.x+=dx/d*step;a.z+=dz/d*step;a.heading=Math.atan2(dx,dz);a.moving=true;return d-step<=stop;}
// Tidy walk: along the current lane to the main alley, up or down the alley, then along the lane of the destination.
function route(a,[x,z],dt,stop=.1){const ax=a.ax??0;
 if(Math.abs(a.z-z)>.2){if(Math.abs(a.x-ax)>.12)move(a,[ax,a.z],dt,.05);else move(a,[ax,z],dt,.05);a.moving=true;return false;}
 return move(a,[x,z],dt,stop);}
const go=(h,pos,dt)=>{if(route(h,pos,dt,.3))return true;h.idle=0;return false;};
const act=(s,h,dt)=>{const b=h.carry.length;interact(s,h,dt);h.idle=h.carry.length===b?h.idle+dt:0;};
// Fetch `item` at a delivery until the hands hold what is needed, then carry it where it goes.
function carryJob(s,h,dt,item,from,to,need,avail){const n=count(h,item);
 if(n&&(h.phase==='deliver'||n>=Math.min(h.cap,Math.max(1,need))||!avail||h.idle>1.5)){h.phase='deliver';if(go(h,to,dt))act(s,h,dt);return true;}
 h.phase=null;if(need<1||!avail)return false;h.wants=item;h.max=Math.min(h.cap,need);if(go(h,from,dt))act(s,h,dt);return true;}
const dirtyPitch=(s,h)=>{let best=-1,bd=Infinity;s.pitches.forEach((p,i)=>{if(p.trash>0){const d=Math.hypot(PITCHES[i].x-h.x,PITCHES[i].z-h.z);if(d<bd){bd=d;best=i;}}});return best;};
function stepHelper(s,h,dt){h.wants=null;h.max=h.cap;const L=h.loop;if(L==='rest'){h.moving=false;return;}
 if(L==='clean'){const n=count(h,'trash'),i=dirtyPitch(s,h);
  if(n&&(n>=h.cap||i<0)){if(go(h,DUMP.spot,dt))act(s,h,dt);return;}
  if(i>=0){h.wants='trash';if(go(h,doorOf(i),dt))act(s,h,dt);return;}
  if(s.sanit.dirt>.4&&!crewAt(s,['sanit'],SANIT.mop)){go(h,SANIT.mop,dt);return;}h.moving=false;return;}
 if(L==='sanit'){if(carryJob(s,h,dt,'paper',SOURCES.paper.spot,SANIT.paper,Math.floor(sanitCap(s)-s.sanit.paper),s.sources.paper.n>0))return;go(h,SANIT.mop,dt);return;}
 if(L==='shop'){const ks=Object.keys(SHELVES).filter(k=>shelfOpen(s,k)),k=ks.find(k=>count(h,k))??ks.find(k=>shelfCap(s,k)-s.shop[k]>=1&&s.sources[k].n>0);
  if(k&&carryJob(s,h,dt,k,SOURCES[k].spot,shelfZone(SHELVES[k].pos),shelfCap(s,k)-s.shop[k],s.sources[k].n>0))return;h.moving=false;return;}
 if(L==='pool'){if(!s.unlocked.pool){h.moving=false;return;}if(s.event?.kind==='ducks'){go(h,POOL.pad,dt);return;}
  if(carryJob(s,h,dt,'chlor',SOURCES.chlor.spot,POOL.pad,s.pool.chlor<=.6?1:0,s.sources.chlor.n>0))return;go(h,POOL.pad,dt);return;}
 if(L==='fix'){const sp=s.event?.spots.find(p=>p.fix<REPAIR),i=sp?-1:s.pitches.findIndex(p=>p.noisy);if(sp)go(h,[sp.x,sp.z],dt);else if(i>=0)go(h,doorOf(i),dt);else h.moving=false;}}

// Work done by standing somewhere: mopping the toilets, repairing, telling noisy campers to be quiet.
export const REPAIR=2.5,TECH_DELAY=75,TECH_FEE=50,MOP=.2;
function stepWork(s,dt){
 const mops=(anyBody(s,SANIT.mop)?1:0)+s.helpers.filter(h=>(h.loop==='sanit'||h.loop==='clean')&&!h.moving&&near(h,SANIT.mop,1.3)).length*.7;if(mops)s.sanit.dirt=Math.max(0,s.sanit.dirt-MOP*mops*dt);
 s.pitches.forEach((p,i)=>{if(p.noisy&&(anyBody(s,doorOf(i),1.7)||crewAt(s,['fix'],doorOf(i),1.7))){p.noisy=false;s.today.fixed++;popup(s,'🤫 Chut !',PITCHES[i].x,PITCHES[i].z,'info');}});
 const ev=s.event;if(!ev)return;ev.t+=dt;let left=0;
 for(const sp of ev.spots){if(sp.fix>=REPAIR)continue;if(anyBody(s,[sp.x,sp.z],1.4)||crewAt(s,ev.kind==='ducks'?['fix','pool']:['fix'],[sp.x,sp.z],1.4)){sp.fix+=dt;if(sp.fix>=REPAIR){if(sp.pitch!=null)s.pitches[sp.pitch].down=false;popup(s,EVENTS[ev.kind].done,sp.x,sp.z,'info');}}if(sp.fix<REPAIR)left++;}
 if(!left){s.event=null;s.today.fixed++;s.rep=Math.min(5,s.rep+.05);return;}
 // Nobody came: a tradesman ends up doing it, and sends his bill.
 if(ev.t>=TECH_DELAY){for(const sp of ev.spots)if(sp.pitch!=null)s.pitches[sp.pitch].down=false;s.event=null;s.bills.push({id:s.nextId++,label:EVENTS[ev.kind].bill,amount:TECH_FEE,due:s.t+BILL_DELAY,late:false});popup(s,`${EVENTS[ev.kind].bill} : facture ${TECH_FEE} $`,ev.spots[0].x,ev.spots[0].z,'bad');}}

// Unforeseen events, one at a time. Each has one or more spots where someone must stand for a moment.
export const EVENTS={
 disj:{label:'🔌 Le disjoncteur a sauté : une raclette de trop',needs:'caravan',done:'🔌 Courant rétabli',bill:'Électricien',spots:()=>[{x:ELEC[0],z:ELEC[1]}]},
 wc:{label:'🚽 WC bouchés aux sanitaires',done:'🪠 Débouché !',bill:'Plombier',spots:()=>[{x:SANIT.door[0],z:SANIT.door[1]}]},
 wasps:{label:'🐝 Nid de guêpes sur un emplacement',done:'🐝 Nid enlevé',bill:'Désinsectiseur',spots:s=>{const l=stayers(s);if(!l.length)return null;const c=l[Math.floor(Math.random()*l.length)],d=doorOf(c.pitch);return [{x:d[0],z:d[1],pitch:c.pitch,who:c.id}];}},
 ducks:{label:'🦆 Des canards squattent la piscine',needs:'pool',done:'🦆 Envolés !',bill:'Garde-chasse',spots:()=>[{x:POOL.pad[0],z:POOL.pad[1]}]},
 storm:{label:'🌬️ Coup de vent : des tentes se sont envolées',done:'⛺ Tente replantée',bill:'Renfort de sardines',spots:s=>{const l=stayers(s).filter(c=>PITCHES[c.pitch].kind==='tent').sort(()=>Math.random()-.5).slice(0,3);if(!l.length)return null;
   return l.map(c=>{s.pitches[c.pitch].down=true;const d=doorOf(c.pitch);return {x:d[0],z:d[1],pitch:c.pitch,who:c.id};});}}};
const stayers=s=>s.campers.filter(c=>c.in);
function stepEvents(s,dt){if(s.event||s.replica||s.arrivals<5)return;s.eventTimer-=dt*(isDay(s)?1:.4);if(s.eventTimer>0)return;s.eventTimer=55+Math.random()*50;
 // At night a wild boar sometimes knocks the bins over: rubbish on a few pitches, nothing to repair.
 if(!isDay(s)){if(Math.random()<.5){const l=PITCHES.map((p,i)=>i).filter(i=>pitchOpen(s,i)).sort(()=>Math.random()-.5).slice(0,3);for(const i of l)s.pitches[i].trash++;popup(s,'🐗 Un sanglier a renversé les poubelles',s.player.x,s.player.z,'bad');}return;}
 const kinds=Object.keys(EVENTS).filter(k=>!EVENTS[k].needs||s.unlocked[EVENTS[k].needs]),kind=kinds[Math.floor(Math.random()*kinds.length)],spots=EVENTS[kind].spots(s);if(!spots)return;
 s.event={kind,label:EVENTS[kind].label,t:0,spots:spots.map(p=>({...p,fix:0}))};popup(s,EVENTS[kind].label.split(' : ')[0],s.player.x,s.player.z,'bad');
 popup(s,`« ${QUIPS[Math.floor(Math.random()*QUIPS.length)]} »`,s.player.x,s.player.z-.8,'info');}
const QUIPS=['Pas de panique, c’est un classique !','Tout est sous contrôle… ou presque.','C’est pas moi, c’est le camping.','Ça, c’est pour le directeur !','Un directeur, ça ne dort jamais.'];

// Day clock. Things happen at fixed hours: the dustcart and the baker at dawn, stale bread thrown at 22:00, lights out
// at 23:00. When the night ends the report of the day is kept, the bills arrive and the campers plan their day.
export const BILL_DELAY=160,LATE_FEE=1.25;
const SUPPLY={paper:.4,bread:.7,ice:1,chlor:3};
function stepDay(s,dt){const h0=hourOf(s);s.clock+=dt;s.report=Math.max(0,s.report-dt);const h1=hourOf(s),at=h=>h0<h&&h1>=h;
 if(at(22)&&s.unlocked.shop){const n=s.shop.bread+s.sources.bread.n;s.shop.bread=s.sources.bread.n=0;if(n)popup(s,`🥖 ${n} baguette${n>1?'s':''} rassise${n>1?'s':''} jetée${n>1?'s':''}`,SHOP.pos[0],SHOP.pos[1],'info');}
 // Lights out: what was not done today is dropped (nobody goes for bread or a swim in the middle of the night).
 if(at(23)){popup(s,'🌙 Extinction des feux',s.player.x,s.player.z,'info');for(const c of stayers(s))c.todo=[];if(!s.replica)for(const c of stayers(s))if(Math.random()<TYPES[c.type].party)c.party=23.3+Math.random()*4;}
 if(at(30)&&s.dump>0){s.supply+=3+.5*s.dump;s.dump=0;popup(s,'🚛 Les éboueurs sont passés',DUMP.pos[0],DUMP.pos[1],'info');}
 if(at(30.5)&&s.unlocked.shop){const n=breadOrder(s);s.sources.bread.n=n;s.supply+=n*SUPPLY.bread;popup(s,`🥖 Le boulanger a livré ${n} baguettes`,SOURCES.bread.pos[0],SOURCES.bread.pos[1],'info');}
 if(s.clock>=DAY){s.clock-=DAY;const T=s.today;s.lastDay={day:s.day,...T,stars:T.departures?T.stars/T.departures:null};s.lastDay.title=episodeTitle(s.lastDay);s.report=10;s.day++;s.today=newDay();issueBills(s);
  for(const p of s.pitches)p.noisy=false;for(const c of s.campers)if(c.in){c.party=null;c.left--;planDay(s,c,7);}popup(s,`☀️ Jour ${s.day}`,s.player.x,s.player.z,'info');}
 for(const b of s.bills)if(!b.late&&s.t>b.due){b.late=true;b.amount=Math.round(b.amount*LATE_FEE);s.rep=Math.max(0,s.rep-.3);popup(s,`🧾 Retard : ${b.label} +25 %`,DESK[0],DESK[1],'bad');}
 for(const [k,def] of Object.entries(SOURCES)){if(!def.every||!sourceOpen(s,k))continue;const src=s.sources[k];if(src.n<sourceCap(s,k)){src.timer+=dt;if(src.timer>=def.every){src.timer=0;src.n++;s.supply+=SUPPLY[k];}}}
 if(s.unlocked.pool)s.pool.chlor=Math.max(0,s.pool.chlor-dt*(s.event?.kind==='ducks'?.012:.0012));}
function issueBills(s){const L=s.lastDay,list=[['Eau et électricité',Math.round(6+3*occupied(s)+(s.unlocked.pool?12:0))],['Taxe de séjour',Math.round(.06*(L?.revenue??0))],['Fournisseurs et éboueurs',Math.round(s.supply)]];s.supply=0;
 for(const [label,amount] of list)if(amount>0)s.bills.push({id:s.nextId++,label,amount,due:s.t+BILL_DELAY,late:false});}
export const billsDue=s=>s.bills.reduce((t,b)=>t+b.amount,0);

// Every day is an "episode" of the holiday sitcom, titled after what happened in it.
const EPISODES=['Un été presque parfait','Les Vacances de M. le Directeur','Chaud devant !','Le Retour du beau-frère','Tout est sous contrôle (enfin presque)','Sable dans les sandales','Panique à la réception','Le Secret de la baguette'];
export function episodeTitle(L){const d=L.day??1;
 if(L.show)return `La Soirée ${L.show} de la discorde`;
 if((L.fixed??0)>=3)return 'Le Jour où tout est tombé en panne';
 if((L.lost??0)>=2)return 'Le Grand Malentendu';
 if(L.stars&&L.stars>=4.5)return 'Tout le monde est content (ça ne durera pas)';
 if(L.revenue>=500)return 'Complet !';
 if(!L.departures&&L.arrivals)return 'Les Nouveaux Voisins';
 return EPISODES[(d*5)%EPISODES.length];}
// Evening show: called at 20:30, it starts when someone stands on the stage pad (or the entertainer is hired), lasts a
// while, and every camper who came spends at the bar. Not started by 22:30, it is cancelled and the campers sulk.
export const SHOWS=['Karaoké','Loto','Concours de pétanque','Soirée disco','Élection de Mister Camping','Quiz musical'],SHOW_LEN=14;
function stepShow(s,dt){const S=s.show,h=hourOf(s);if(!s.unlocked.stage)return;
 if(S.state==='idle'&&S.day!==s.day&&h>=20.5&&h<22.5&&!s.replica){s.show={day:s.day,state:'call',t:0,kind:Math.floor(Math.random()*SHOWS.length),bar:0};popup(s,`🎤 ${SHOWS[s.show.kind]} : montez sur scène !`,s.player.x,s.player.z,'info');return;}
 if(S.state==='call'){if(s.posts.stage||anyBody(s,STAGE.pad,1.2))S.t+=dt;if(S.t>=1.5){S.state='on';S.t=SHOW_LEN;s.today.show=SHOWS[S.kind];popup(s,`🎉 ${SHOWS[S.kind]} !`,STAGE.pos[0],STAGE.pos[1],'info');}
  else if(h>=22.5){S.state='idle';for(const c of stayers(s))sad(c,4,'noshow');popup(s,'😴 Pas de soirée ce soir…',STAGE.pos[0],STAGE.pos[1],'bad');}return;}
 if(S.state==='on'){S.t-=dt;if(S.t<=0){S.state='idle';if(S.bar>0){s.money+=S.bar;s.today.revenue+=S.bar;popup(s,`🍹 Buvette +${Math.round(S.bar)} $`,STAGE.pos[0],STAGE.pos[1]);}}}}

// Campers. Each group is one walking character with a mood from 0 to 100; what goes wrong is remembered for the review.
export const TYPES={hiker:{name:'Randonneur',icon:'🎒',nights:[1,1],party:.05},family:{name:'Famille',icon:'👨‍👩‍👧',nights:[1,3],party:.03},youth:{name:'Bande de copains',icon:'🎸',nights:[1,2],party:.7},
 retired:{name:'Retraités',icon:'🧓',nights:[2,3],party:0},couple:{name:'Couple',icon:'💑',nights:[1,2],party:.05},
 beaufrere:{name:'Beau-frère qui sait tout',icon:'🧔',nights:[1,2],party:.35},mamie:{name:'Mamie et les petits-enfants',icon:'👵',nights:[2,3],party:0}};
const TYPE_OF={tent:['hiker','family','youth','couple','hiker','beaufrere'],caravan:['retired','retired','family','mamie'],mobil:['family','couple','family','mamie','beaufrere']};
const sad=(c,v,why)=>{c.mood=clamp(c.mood-v,0,100);c.gripe=why;},glad=(c,v,why)=>{c.mood=clamp(c.mood+v,0,100);if(why)c.joy=why;};
const say=(s,c,text,kind='bad')=>popup(s,text,c.x,c.z,kind);
function stepSpawn(s,dt){s.spawnTimer-=dt;if(s.replica||s.spawnTimer>0||!arrivalHours(s))return;
 const queued=s.campers.filter(c=>c.phase==='arrive'||c.phase==='queue').length,free=PITCHES.map((p,i)=>i).filter(i=>pitchOpen(s,i)&&s.pitches[i].by==null);
 s.spawnTimer=(70+Math.random()*25)/(traffic(s)*Math.max(1,openPitches(s)));if(!free.length||queued>=RECEPTION.max)return;
 // Clean pitches go first; a dirty one is only promised when nothing else is left.
 const clean=free.filter(i=>!s.pitches[i].trash),pool=clean.length?clean:free,i=pool[Math.floor(Math.random()*pool.length)],kind=PITCHES[i].kind,types=TYPE_OF[kind],type=types[Math.floor(Math.random()*types.length)],[a,b]=TYPES[type].nights;
 const side=Math.random()<.5?-1:1,c={id:s.nextId++,pitch:i,kind,type,look:Math.floor(Math.random()*6),nights:a+Math.floor(Math.random()*(b-a+1)),x:side*ROAD_END,z:ROAD_Z,heading:0,speed:2.6,moving:false,ax:(Math.random()-.5)*1.3,
  phase:'arrive',wait:0,pick:0,mood:70,card:Math.random()<.55,in:false,todo:[],wc:15+Math.random()*25,act:null};
 c.left=c.nights;s.pitches[i].by=c.id;s.campers.push(c);}
// What a camper means to do today, from `from` o'clock on: bread in the morning, the pool and an ice cream in the
// afternoon. On the morning of the last day they pack up and leave instead.
function planDay(s,c,from){const todo=[],add=(h,act)=>{if(h>=from)todo.push({h,act});};
 if(c.left<=0){c.todo=[{h:Math.max(from,8+Math.random()*3),act:'out'}];return;}
 if(s.unlocked.shop&&Math.random()<.85)add(7.2+Math.random()*2.6,'bread');
 if(s.unlocked.pool&&Math.random()<.7)add(11+Math.random()*7,'pool');
 if(s.unlocked.freezer&&Math.random()<.6)add(13+Math.random()*5.5,'ice');
 c.todo=todo.sort((a,b)=>a.h-b.h);}
// Opening hours: the pool shuts at 20:00 and the shop at 21:00, well before lights out.
export const POOL_CLOSE=20,SHOP_CLOSE=21;
const home=c=>doorOf(c.pitch);
const begin=(c,act,extra)=>{c.act={kind:act,step:0,t:0,...extra};};
function stepCampers(s,dt){const h=hourOf(s),night=!isDay(s),rushH=(h>=7&&h<9.5)||(h>=18&&h<20),ev=s.event;let rq=0,sq=0,gone=false,inside=0,swimmers=0,crowd=0;
 for(const c of s.campers){if(c.act?.kind==='wc'&&c.act.step===1)inside++;if(c.act?.kind==='pool'&&c.act.step>=1)swimmers++;}
 const receptionOn=s.posts.reception||anyBody(s,RECEPTION.serve),shopOn=s.posts.shop||anyBody(s,SHOP.serve);
 for(const c of s.campers){
  if(c.phase==='arrive'||c.phase==='queue'){const i=rq++,spot=RECEPTION.queue(i);c.wait+=dt;const there=route(c,spot,dt,.05);c.phase='queue';
   if(i===0&&there){c.heading=Math.PI;const ready=s.pitches[c.pitch].trash===0;c.blocked=!ready;
    if(ready&&receptionOn){c.pick+=dt*(anyBody(s,RECEPTION.serve)?1.6:1);if(c.pick>=CHECKIN){const amount=c.nights*nightPrice(s,c.kind);c.paid=amount;s.today.revenue+=amount;s.today.arrivals++;s.arrivals++;
      if(c.card&&s.unlocked.terminal){s.money+=amount;popup(s,`💳 +${amount} $`,RECEPTION.pos[0],RECEPTION.pos[1],'card');}else{s.piles[0]+=amount;popup(s,`💵 +${amount} $`,RECEPTION.pos[0],RECEPTION.pos[1]);}
      glad(c,c.wait<12?6:0);c.phase='toPitch';rq--;}}}
   if(c.phase==='queue'&&c.wait>PATIENCE){s.pitches[c.pitch].by=null;c.phase='leave';c.angry=true;s.lost++;s.today.lost++;s.rep=Math.max(0,s.rep-.25);say(s,c,c.blocked?'😠 Emplacement pas prêt !':'😠 Personne à l’accueil !');}
   continue;}
  if(c.phase==='toPitch'){if(route(c,home(c),dt,.05)){c.phase='stay';c.in=true;c.heading=0;planDay(s,c,hourOf(s));}continue;}
  if(c.phase==='leave'){const end=[(c.ax<0?-1:1)*ROAD_END,ROAD_Z];if(route(c,end,dt,.3))gone=true;continue;}
  // Staying: what weighs on the mood right now, then the current outing, or the next thing to do.
  const P=s.pitches[c.pitch];
  if(P.down)sad(c,dt*1.1,'storm');if(ev?.kind==='wasps'&&ev.spots[0].who===c.id)sad(c,dt*1,'wasps');if(ev?.kind==='disj'&&c.kind!=='tent')sad(c,dt*.5,'power');
  if(night&&!P.noisy)for(let i=0;i<PITCHES.length;i++)if(s.pitches[i].noisy&&Math.hypot(PITCHES[i].x-PITCHES[c.pitch].x,PITCHES[i].z-PITCHES[c.pitch].z)<6.5){sad(c,dt*.9,'noise');break;}
  if(c.mood<72)c.mood+=dt*.12;
  if(night&&c.party&&h>=c.party){c.party=null;P.noisy=true;say(s,c,'🎶 Fiesta !','info');}
  const A=c.act;
  if(!A){const next=c.todo[0];
   if(next&&h>=next.h&&!night){c.todo.shift();
    if(next.act==='out'){checkout(s,c);continue;}
    // Too late to set off: the outing is given up (the pool and the shop are about to close).
    if(next.act==='pool'){if(h<POOL_CLOSE-1.5)begin(c,'pool');}else if(h<SHOP_CLOSE-1){c.pick=0;begin(c,'shop',{k:next.act,n:next.act==='bread'?1+Math.floor(Math.random()*3):1+Math.floor(Math.random()*2),got:0,pay:0});}}
   else if(s.show.state==='on'&&s.show.t>3&&c.show!==s.day){c.show=s.day;begin(c,'show');}
   else{c.wc-=dt*(night?.12:rushH?1.8:1);if(c.wc<=0){c.wc=28+Math.random()*30;begin(c,'wc');}else{c.moving=false;}}
   continue;}
  if(A.kind==='back'){if(route(c,home(c),dt,.05)){c.act=null;c.heading=0;}continue;}
  // Closing time: swimmers get out of the water, the shop serves what is in hand and sends its queue home.
  if(A.kind==='pool'&&h>=POOL_CLOSE){if(A.step===0){c.act={kind:'back'};continue;}if(A.step===1){A.step=2;glad(c,8,'pool');}}
  if(A.kind==='shop'&&h>=SHOP_CLOSE){if(A.got>0){sale(s,c,A);glad(c,5,A.k);}c.act={kind:'back'};continue;}
  if(A.kind==='wc'){
   if(A.step===0){if(!route(c,[SANIT.door[0]+(c.ax??0),SANIT.door[1]],dt,.1))continue;
    if(ev?.kind==='wc'){sad(c,10,'clog');say(s,c,'🚽 Bouché !');c.act={kind:'back'};}
    else if(inside<cabins(s)){inside++;A.step=1;A.t=2.6;}
    else{A.t+=dt;if(A.t>12){sad(c,6,'queue');say(s,c,'🚿 Trop de queue');c.act={kind:'back'};}}}
   else{A.t-=dt;if(A.t<=0){const S=s.sanit;
     if(S.paper<.34){sad(c,12,'paper');say(s,c,'🧻 Plus de papier !');}else{S.paper=Math.max(0,S.paper-.34);if(S.dirt>.7){sad(c,7,'dirty');say(s,c,'🤢 C’est sale');}else glad(c,2,S.dirt<.25?'clean':null);}
     S.dirt=Math.min(1,S.dirt+.055/(1+.35*lvl(s,'sanit')));c.act={kind:'back'};}}
   continue;}
  if(A.kind==='shop'){const i=sq++;if(i>=SHOP.max){sq--;A.t+=dt;c.moving=false;if(A.t>20)c.act=null;continue;}
   const there=route(c,SHOP.queue(i),dt,.05);A.t+=dt;
   if(i===0&&there){c.heading=Math.PI;
    if(shopOn&&s.shop[A.k]>0){c.pick-=dt;if(c.pick<=0){s.shop[A.k]--;A.got++;A.pay+=price(s,A.k);c.pick=.3;}}
    if(A.got>=A.n||(A.got>0&&s.shop[A.k]<=0&&A.t>6)){sale(s,c,A);glad(c,A.k==='bread'?5:6,A.k);c.act={kind:'back'};sq--;continue;}}
   if(A.t>26){if(A.got>0)sale(s,c,A);else{sad(c,8,A.k==='bread'?'bread':'ice');say(s,c,shopOn?(A.k==='bread'?'🥖 Plus de pain !':'🍦 Plus de glaces !'):'🛒 Personne à la caisse !');}c.act={kind:'back'};sq--;}
   continue;}
  if(A.kind==='pool'){
   if(A.step===0){if(!route(c,[POOL.gate[0]+(c.ax??0),POOL.gate[1]],dt,.1))continue;
    if(ev?.kind==='ducks'){sad(c,4,'ducks');say(s,c,'🦆 Y a des canards…');c.act={kind:'back'};}
    else if(s.pool.chlor<.25){sad(c,9,'green');say(s,c,'🤢 Piscine verte !');c.act={kind:'back'};}
    else if(swimmers>=POOL.cap){sad(c,3,'full');c.act={kind:'back'};}
    else{swimmers++;A.step=1;A.t=7+Math.random()*3;A.x=POOL.x0+.8+Math.random()*(POOL.x1-POOL.x0-1.6);A.z=POOL.z0+.8+Math.random()*(POOL.z1-POOL.z0-1.6);s.pool.chlor=Math.max(0,s.pool.chlor-.03);}}
   else if(A.step===1){c.swim=move(c,[A.x,A.z],dt,.1)||c.z<POOL.z1;A.t-=dt;if(A.t<=0){A.step=2;glad(c,8,'pool');}}
   else{c.swim=c.z<POOL.z1;if(move(c,[POOL.gate[0]+(c.ax??0),POOL.gate[1]],dt,.1)){c.swim=false;c.act={kind:'back'};}}
   continue;}
  if(A.kind==='show'){const there=route(c,STAGE.crowd(crowd++),dt,.1);if(there)c.heading=Math.PI;if(s.show.state!=='on'){if(there||A.t>0){glad(c,10,'show');}c.act={kind:'back'};}else if(there&&!A.t){A.t=1;s.show.bar+=5*(1+.1*lvl(s,'confort'));}}}
 if(gone)s.campers=s.campers.filter(c=>!(c.phase==='leave'&&Math.abs(c.x)>=ROAD_END-.4));}
function sale(s,c,A){const amount=A.pay;if(!(amount>0))return;s.today.revenue+=amount;if(c.card&&s.unlocked.terminal){s.money+=amount;popup(s,`💳 +${Math.round(amount)} $`,SHOP.till[0],SHOP.till[1],'card');}else{s.piles[1]+=amount;popup(s,`💵 +${Math.round(amount)} $`,SHOP.till[0],SHOP.till[1]);}}
// Leaving: the pitch is left with rubbish to clear, and the camper writes a review that moves the reputation.
const WORDS={paper:['Plus de papier depuis mardi.','J’ai dû emprunter le rouleau du voisin.','Papier toilette : denrée rare, comme l’eau au Sahara.','On a fini par utiliser le dépliant du camping.'],
 dirty:['Sanitaires à visiter en apnée.','La douche se méritait.','J’ai croisé une araignée qui payait aussi son emplacement.','On y entre en tongs, on en ressort en prière.'],
 queue:['Vingt minutes de queue pour une douche froide.','On a rencontré tous nos voisins… dans la file des WC.'],clog:['Les WC bouchés, un grand classique.','Le plombier a désormais sa chaise à l’accueil.'],
 bread:['La baguette ? Quelle baguette ?','Pas de pain au petit-déjeuner, vacances gâchées.','Les croissants, on nous en a parlé, on n’en a jamais vu.'],ice:['Plus de glaces en plein mois d’août !','Un camping sans glace, c’est un sapin sans guirlande.'],
 green:['Piscine verte, grenouilles en option.','L’eau avait la couleur d’une soupe de poireaux.'],ducks:['On a nagé avec les canards.','Les canards avaient réservé avant nous.'],full:['Piscine bondée, on a fait trempette debout.'],
 noise:['Les voisins ont fait la fête jusqu’à 3 h du matin.','Nuit blanche offerte par l’emplacement d’à côté.','Quelqu’un a joué de l’accordéon à 2 h du matin. Quelqu’un devrait être puni.'],
 storm:['Notre tente a fini chez les voisins.','Réveillés à l’aube… par notre toit qui s’envolait.'],wasps:['Un nid de guêpes en guise de voisin.','Les guêpes ont mangé notre goûter, puis nous.'],power:['Le disjoncteur saute dès qu’on branche la bouilloire.','Panne de courant : le frigo a fondu, les saucisses aussi.'],
 noshow:['On attendait le karaoké, on a eu le silence.','Pas de soirée animée : les moustiques se sont chargés du spectacle.']},
 PRAISE={clean:['Sanitaires plus propres que chez moi.','Une douche chaude ET propre : on se croirait à l’hôtel.'],bread:['Le pain était chaud tous les matins.','La baguette de 8 h pile, un bonheur.'],ice:['Les glaces valent le détour.','Le cornet à 16 h a sauvé notre après-midi.'],pool:['Piscine impeccable, on y a passé la journée.','Les enfants ne sont jamais sortis de l’eau.'],
 show:['Soirée karaoké inoubliable (hélas).','On a gagné au loto !','Le directeur chante faux, mais avec le cœur.','On a dansé jusqu’à 22 h 30, un record.'],
 any:['On revient l’an prochain, même emplacement !','Accueil au top, on recommande.','Le directeur court partout, mais ça marche.','Calme, propre, et de l’ombre : parfait.','Le coin le plus sympa de la région, ne le dites à personne.','Un camping où l’on se sent comme à la maison. En plus bruyant.','Le directeur est dépassé mais adorable : 5 étoiles pour l’effort.','Bronzés, repus, heureux. Que demander de plus ?','Mon beau-frère a tout critiqué, sauf le camping. C’est dire.','Vacances de rêve : on a même pas voulu rentrer.']};
const oneOf=l=>l[Math.floor(Math.random()*l.length)];
export const starsOf=mood=>mood>=86?5:mood>=72?4:mood>=55?3:mood>=35?2:1;
function checkout(s,c){const P=s.pitches[c.pitch],stars=starsOf(c.mood),bad=stars<=3&&c.gripe,text=bad?oneOf(WORDS[c.gripe]??['Bof.']):stars>=4?oneOf(PRAISE[c.joy]??PRAISE.any):'Correct, sans plus.';
 P.by=null;P.trash+=KINDS[c.kind].trash;P.noisy=false;P.down=false;c.in=false;c.phase='leave';c.act=null;c.stars=stars;
 s.rep=clamp(s.rep+(stars-s.rep)*.12,0,5);s.today.departures++;s.today.stars+=stars;s.reviews.unshift({day:s.day,stars,text,who:TYPES[c.type].name,icon:TYPES[c.type].icon});if(s.reviews.length>12)s.reviews.length=12;
 if(stars===5){const tip=Math.round(.1*(c.paid??0));if(tip){s.money+=tip;s.today.revenue+=tip;}}popup(s,'★'.repeat(stars)+'☆'.repeat(5-stars),c.x,c.z,stars>=4?'money':stars===3?'info':'bad');}

// Network play, as in the burger restaurant: the host's game holds the other players in `s.guests`; on a guest's machine
// the game is a replica that runs between two snapshots but rolls no dice.
export const MAX_GUESTS=3;
const cleanName=n=>String(n??'').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,12)||'Invité';
export const guestOf=(s,id)=>s.guests.find(g=>g.id===id);
export function addGuest(s,id,name){removeGuest(s,id);if(s.guests.length>=MAX_GUESTS)return null;const p=s.player,n=s.guests.length;
 const g={id:String(id),role:'player',guest:true,name:cleanName(name),look:n,x:p.x+(n+1)*.9,z:p.z,heading:0,carry:[],cap:p.cap,speed:p.speed,cool:0,moving:false,input:{x:0,z:0}};
 const used=new Set(s.guests.map(x=>x.look));for(let i=0;i<=MAX_GUESTS;i++)if(!used.has(i)){g.look=i;break;}
 s.guests.push(g);popup(s,`👋 ${g.name}`,g.x,g.z,'info');return g;}
export function removeGuest(s,id){const i=s.guests.findIndex(g=>g.id===id);if(i<0)return false;const g=s.guests[i];putBack(s,g.carry);s.guests.splice(i,1);popup(s,`👋 ${g.name} a quitté la partie`,g.x,g.z,'info');return true;}
const num=v=>typeof v==='number'&&Number.isFinite(v);
export function guestInput(s,id,m){const g=guestOf(s,id);if(!g||!m)return false;
 if(num(m.ix)&&num(m.iz)){g.input.x=clamp(m.ix,-1,1);g.input.z=clamp(m.iz,-1,1);}
 if(num(m.x)&&num(m.z)){g.x=clamp(m.x,WORLD.minX,WORLD.maxX);g.z=clamp(m.z,WORLD.minZ,WORLD.maxZ);}if(num(m.h))g.heading=m.h;return true;}
function walk(s,p,input,dt,boxes){const len=Math.hypot(input.x,input.z);
 if(len>.05){const k=Math.min(1,len);p.x=clamp(p.x+input.x/len*k*p.speed*dt,WORLD.minX,WORLD.maxX);p.z=clamp(p.z+input.z/len*k*p.speed*dt,WORLD.minZ,WORLD.maxZ);p.heading=Math.atan2(input.x,input.z);p.moving=true;}else p.moving=false;
 collide(p,boxes);}
const STILL={x:0,z:0};
// `input` moves the player; left out, the player keeps the last one given (a replica moves the host's character that way).
export function stepCamping(s,dt,input){dt=Math.min(dt,.1);s.t+=dt;const p=s.player;if(input)p.input={x:input.x,z:input.z};const boxes=obstacles(s);
 walk(s,p,p.input??STILL,dt,boxes);interact(s,p,dt);playerExtras(s,p,dt);
 for(const g of s.guests){g.cap=p.cap;g.speed=p.speed;walk(s,g,g.input,dt,boxes);interact(s,g,dt);playerExtras(s,g,dt);}
 for(const h of s.helpers)stepHelper(s,h,dt);
 stepDay(s,dt);stepWork(s,dt);stepEvents(s,dt);stepShow(s,dt);stepSpawn(s,dt);stepCampers(s,dt);
 if(s.popups.length){let old=false;for(const pp of s.popups){pp.t+=dt;if(pp.t>=1.6)old=true;}if(old)s.popups=s.popups.filter(pp=>pp.t<1.6);}}

export function loadCamping(json){const o=typeof json==='string'?JSON.parse(json):json;if(!o||o.game!==GAME||o.schema!==SAVE_SCHEMA||!o.player||!Array.isArray(o.campers))throw Error('Sauvegarde illisible.');
 o.popups=[];return fill(o);}
