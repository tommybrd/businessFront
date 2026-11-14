// CampingFront (alpha): the player is the manager of a campsite. Campers arrive in the afternoon, are checked in at the
// reception, settle on their pitch for one to three nights, then live their day: showers, bread in the morning, pool and
// ice cream in the afternoon, the evening show. The manager walks around and keeps it all going by hand: toilet paper,
// bread, chlorine, rubbish bags, breakdowns, noisy neighbours at night. Staff take over the same jobs. Campers leave a
// review when they go; the average is the reputation of the campsite. The simulation runs in real seconds and only
// holds plain JSON; the 3D view only draws this state.
export const SAVE_SCHEMA=1,GAME='camping',RADIUS=1.05,PLAYER_R=.32;
export const WORLD={minX:-15.3,maxX:33.5,minZ:-34,maxZ:8.4};
export const ITEMS={paper:{name:'Papier toilette'},dough:{name:'Pâton'},bread:{name:'Baguette',price:2},ice:{name:'Glace',price:3},ph:{name:'pH moins'},towel:{name:'Serviette propre'},drink:{name:'Boisson fraîche',price:2},cream:{name:'Crème solaire',price:7},gas:{name:'Bouteille de gaz',price:16},souv:{name:'Souvenir',price:6},chlor:{name:'Chlore'},trash:{name:'Sac poubelle'}};
export const PICKABLE=Object.keys(ITEMS);
// The day: 7:00 to 23:00 lasts OPEN seconds, the night (23:00 to 7:00) NIGHT seconds. Night hours count on from 23 to 31.
export const OPEN=130,NIGHT=20,DAY=OPEN+NIGHT;
export const hourOf=s=>s.clock<OPEN?7+16*s.clock/OPEN:23+8*(s.clock-OPEN)/NIGHT;
export const isDay=s=>s.clock<OPEN;

// Pitches, in the order they open within each kind. Campers stand at the "door" of their pitch, on the lane south of it.
export const KINDS={tent:{name:'Tente',icon:'⛺',price:24,trash:1,start:4,level:'tents'},caravan:{name:'Caravane',icon:'🚐',price:40,trash:2,start:2,needs:'caravan',level:'caravans'},
 mobil:{name:'Locatif',icon:'🏠',price:85,trash:3,start:0,needs:'mobil',level:'mobils'}};
// The rental accommodations ("locatifs"): five models, bought new or second-hand, that wear out with every stay. Eight slots in the
// rental quarter; each slot holds one model, chosen when it is bought. Owners rent six more parcels by the year.
export const TIERS={eco:{name:'Mobil-home Éco',icon:'🏠',price:700,night:55,wear:9,types:['youth','hiker','couple']},
 confort:{name:'Mobil-home Confort',icon:'🏡',price:1100,night:85,wear:7,types:['family','couple','retired']},
 premium:{name:'Mobil-home Premium',icon:'🏘️',price:2000,night:140,wear:6,types:['family','couple','retired','mamie']},
 lodge:{name:'Tente lodge',icon:'🏕️',price:900,night:75,wear:8,types:['couple','family','hiker']},
 cabane:{name:'Cabane dans les arbres',icon:'🌳',price:2600,night:190,wear:5,types:['couple','family']}};
export const TIER_ORDER=['eco','confort','premium','lodge','cabane'],BREAKS=['chauffe-eau','climatisation','terrasse'];
const rows=(kind,list)=>list.map(([x,z],n)=>({x,z,kind,n}));
export const PITCHES=[...rows('tent',[[-4.5,.2],[-4.5,-3.8],[-8.5,.2],[-8.5,-3.8],[-4.5,-7.8],[-12.5,.2],[-8.5,-7.8],[-12.5,-3.8],[-4.5,-11.8],[-12.5,-7.8],[-8.5,-11.8],[-12.5,-11.8]]),
 ...rows('caravan',[[4.5,-7.8],[8.5,-7.8],[4.5,-11.8],[12.5,-7.8],[8.5,-11.8],[12.5,-11.8]]),...rows('mobil',[[-5.4,-17.8],[-9.2,-17.8],[-13,-17.8],[-1.6,-17.8],[-5.4,-23.8],[-9.2,-23.8],[-13,-23.8],[-1.6,-23.8]]),
 ...rows('owner',[[-13,-29.8],[-9.2,-29.8],[-5.4,-29.8],[-1.6,-29.8],[2.6,-29.8],[6.4,-29.8]])];
export const RENTAL_PITCH=PITCHES.map((p,i)=>p.kind==='mobil'?i:-1).filter(i=>i>=0);
export const doorOf=i=>[PITCHES[i].x,PITCHES[i].z+1.95];
// Places. Everything people walk to sits on an east-west lane that meets the main alley (x = 0), so walks stay tidy.
export const GATE=[0,8.6],ROAD_Z=10.4,ROAD_END=16.5;
export const RECEPTION={pos:[4.5,5.6],serve:[4.5,4.4],cash:[6.6,4.4],queue:i=>[4.5+i,6.75],max:6};
export const SHOP={pos:[-5.75,5.6],till:[-4.3,5.6],serve:[-4.3,4.4],cash:[-2.6,4.4],queue:i=>[-4.3-i,6.75],max:5};
// Shop shelves: the bakery stand, the ice-cream freezer and a general rack (drinks, sun cream, gas, souvenirs) that shares one pad.
const RACK=[-7.3,4.4];
export const SHELVES={bread:{name:'Pain',pos:[-11.2,5.6],cap:10,needs:'bakery'},ice:{name:'Glaces',pos:[-5.9,5.6],cap:8,needs:'freezer'},
 drink:{name:'Boissons',pos:[-7.5,5.6],zone:RACK,cap:10,needs:'shop'},cream:{name:'Crème solaire',pos:[-7.5,5.6],zone:RACK,cap:6,needs:'shop'},
 gas:{name:'Gaz',pos:[-7.5,5.6],zone:RACK,cap:4,needs:'caravan'},souv:{name:'Souvenirs',pos:[-7.5,5.6],zone:RACK,cap:6,needs:'souvenirs'}};
export const shelfZone=([x,z])=>[x,z-1.2];
export const zoneOf=def=>def.zone??shelfZone(def.pos);
export const RACK_KINDS=['drink','cream','gas','souv'];
// The bakery: the baker brings dough at dawn, it goes into the oven, bakes, and the bread is put on the stand.
export const OVEN={pos:[-13.3,3.4],inPad:[-13.9,4.6],outPad:[-12.6,4.6],cap:12,batch:6,time:4};
// Deliveries: `spot` is where staff stand to take from them. Bread only comes once a day, at dawn.
export const SOURCES={paper:{name:'Réserve de papier',item:'paper',pos:[8.6,3.4],spot:[8.6,4.45],cap:10,every:2.4},
 bread:{name:'Pâtons du boulanger',item:'dough',pos:[-10.8,7.8],spot:[-10.8,8.35],cap:0,needs:'bakery'},
 drink:{name:'Boissons',item:'drink',pos:[-8.2,7.8],spot:[-8.2,8.35],cap:12,every:2.2,needs:'shop'},
 cream:{name:'Crème solaire',item:'cream',pos:[-6.2,7.8],spot:[-6.2,8.35],cap:6,every:5,needs:'shop'},
 gas:{name:'Bouteilles de gaz',item:'gas',pos:[-4.2,7.8],spot:[-4.2,8.35],cap:4,every:9,needs:'caravan'},
 souv:{name:'Souvenirs',item:'souv',pos:[-2.2,7.8],spot:[-2.2,8.35],cap:6,every:6,needs:'souvenirs'},
 ice:{name:'Congélateur',item:'ice',pos:[-9.4,4.4],spot:[-8.3,4.4],cap:10,every:1.5,needs:'freezer'},
 chlor:{name:'Chlore',item:'chlor',pos:[14.8,-3.7],spot:[14.8,-4.8],cap:8,every:3,needs:'pool'},
 ph:{name:'pH moins',item:'ph',pos:[17.2,-3.7],spot:[17.2,-4.8],cap:6,every:4,needs:'tech'},
 towel:{name:'Serviettes propres',item:'towel',pos:[25.4,-4.1],spot:[25.4,-5],cap:12,every:4,needs:'spa'},
 pdrink:{name:'Boissons du bar',item:'drink',pos:[28.4,-7.8],spot:[28.4,-6.8],cap:10,every:3,needs:'beachbar'},
 pice:{name:'Glaces du bar',item:'ice',pos:[26.4,-7.8],spot:[26.4,-6.8],cap:8,every:3,needs:'beachbar'}};
// East quarter: the leisure services, along an avenue that continues the caravan lane. Each has its own tile.
export const LOISIRS={laundry:{pos:[20.5,-2.6],pad:[20.5,-.5]},wifi:{pos:[24.8,-2.2],pad:[24.8,-.4]},bikes:{pos:[28.8,-2.6],pad:[28.8,-.5]},
 playground:{pos:[21.8,4.2]},sports:{pos:[28.2,4.2]},shuttle:{stop:[31.4,7.6]}};
export const SHUTTLE_SLOTS=[10.2,14.6],SHUTTLE_WAIT=14,SHUTTLE_TRIP=36,MACHINES=3,BIKES=6,PADDLES=4;
// The aquatic centre. The old pool is the "grand bassin"; four more basins are bought one by one east of it. Each basin has its
// own entrance (gate), a capacity, and the kinds of campers who like it best. It opens only if a lifeguard can watch it (each
// lifeguard watches two basins, in the order of BASIN_ORDER). Water quality is kept in the technical room.
export const BOREHOLE={pos:[32.4,.5],spot:[32.4,2.1]};
export const BASIN_ORDER=['pool','paddling','slides','lazy','lagoon'];
export const BASINS={pool:{name:'Grand bassin',icon:'🏊',rect:[8,-19.6,14.4,-15.6],gate:[11.2,-14.7],cap:8,who:['retired','couple','hiker','beaufrere','youth','family','mamie']},
 paddling:{name:'Pataugeoire',icon:'🧒',rect:[16.8,-14,19.8,-11.2],gate:[18.3,-10.4],cap:6,who:['family','mamie']},
 slides:{name:'Toboggans',icon:'🎢',rect:[20.6,-14,24.2,-11.2],gate:[22.4,-10.4],cap:4,who:['youth','family','beaufrere']},
 lazy:{name:'Rivière lente',icon:'🛟',rect:[26,-14,33.2,-11.2],gate:[29.6,-10.4],cap:8,who:['retired','couple','hiker','mamie']},
 lagoon:{name:'Lagon et plage',icon:'🏝️',rect:[17.6,-22.4,28,-16.8],gate:[22.8,-15.2],cap:14,who:['family','youth','couple','beaufrere']}};
export const TECH={pos:[17,-7.8],chlor:[15.9,-5.9],ph:[17.2,-5.9],filter:[18.5,-5.9]};
export const SPA={pos:[22.2,-7.8],door:[22.2,-6.3],pad:[20.1,-5.9],cap:4,price:18,len:10};
export const BAR={pos:[31.4,-7.8],counter:[31.4,-6.5],pad:[31.4,-5.5]};
export const LIFE_CHAIR=[15.1,-15.4];
export const LOUNGERS=[[10.4,-14.9],[12.2,-14.9],[18.6,-16.4],[19.9,-16.4],[21.2,-16.4],[24.4,-16.4],[25.7,-16.4],[27,-16.4],[31,-15.6],[32.4,-15.6],[16.6,-16.4],[29.5,-16.4]];
export const DAYPASS={price:6,quota:0};
export const SANIT={pos:[8,-3],door:[8,-1.05],paper:[6.1,-.9],mop:[9.9,-.9],cap:10,cabins:3};
export const DUMP={pos:[-14,7.4],spot:[-12.6,7.4],cap:20};
export const POOL={x0:8,x1:14.4,z0:-19.6,z1:-15.6,pad:[9,-14.5],gate:[11.2,-14.7],cap:6};
export const STAGE={pos:[4.2,-17.7],pad:[4.2,-15.9],crowd:i=>[1.8+(i%7)*.8,-15.2+(Math.floor(i/7)%3)*.6]};
export const ELEC=[2,-10.8],DESK=[6.9,2.3];

// One-off unlocks: dashed tiles on the ground, each shown once the previous step (`after`) is bought.
export const UNLOCKS=[
 {id:'receptionist',name:'Réceptionniste',price:70,pos:[2.4,4.4],after:null},
 {id:'cleaner',name:'Agent d’entretien',price:110,pos:[-10.2,7.2],after:'receptionist'},
 {id:'terminal',name:'Terminal CB',price:90,pos:[2.6,6.7],after:'receptionist'},
 {id:'shop',name:'Épicerie',price:150,pos:[-5.75,4.9],after:'receptionist'},
 {id:'shopkeeper',name:'Épicier',price:160,pos:[-2,2.9],after:'shop'},
 {id:'bakery',name:'Boulangerie : four + stand',price:180,pos:[-11.6,6.5],after:'shop'},
 {id:'laundry',name:'Laverie à jetons',price:260,pos:[20.5,1.1],after:'shop'},
 {id:'wifi',name:'Wifi du camping',price:180,pos:[24.8,1.1],after:'shop'},
 {id:'bikes',name:'Vélos et paddles',price:300,pos:[28.8,1.1],after:'laundry'},
 {id:'playground',name:'Aire de jeux',price:350,pos:[21.8,7.4],after:'laundry'},
 {id:'sports',name:'Terrain multisports',price:420,pos:[28.2,7.4],after:'playground'},
 {id:'shuttle',name:'Navette plage',price:500,pos:[31.4,5.7],after:'bikes'},
 {id:'souvenirs',name:'Rayon souvenirs',price:220,pos:[-9.6,6.6],after:'shop'},
 {id:'freezer',name:'Glaces',price:200,pos:[-9.4,4.4],after:'shop'},
 {id:'cart',name:'Voiturette',price:180,pos:[-2.1,-11.8],after:'cleaner'},
 {id:'caravan',name:'Caravanes + bornes',price:280,pos:[4.5,-7.8],after:'shop'},
 {id:'handyman',name:'Homme à tout faire',price:300,pos:[3.2,.6],after:'caravan'},
 {id:'pool',name:'Piscine',price:650,pos:[11.2,-17.6],after:'caravan'},
 {id:'lifeguard',name:'Maître-nageur',price:320,pos:[15.4,-14.5],after:'pool'},
 {id:'paddling',name:'Pataugeoire',price:450,pos:[18.3,-12.6],after:'pool'},
 {id:'slides',name:'Toboggans',price:800,pos:[22.4,-12.6],after:'paddling'},
 {id:'lazy',name:'Rivière lente',price:950,pos:[29.6,-12.6],after:'slides'},
 {id:'lagoon',name:'Lagon et plage',price:1400,pos:[22.8,-19.6],after:'lazy'},
 {id:'tech',name:'Local technique',price:400,pos:[17,-7.8],after:'pool'},
 {id:'beachbar',name:'Bar de plage',price:300,pos:[31.4,-7.8],after:'pool'},
 {id:'spa',name:'Espace bien-être',price:1100,pos:[22.2,-7.8],after:'slides'},
 {id:'borehole',name:'Forage + château d’eau',price:500,pos:[32.4,2.3],after:'shop'},
 {id:'stage',name:'Scène + sono',price:480,pos:[4.2,-17.7],after:'pool'},
 {id:'animateur',name:'Animateur',price:350,pos:[1.4,-18.2],after:'stage'},
 {id:'mobil',name:'Quartier des locatifs',price:900,pos:[-5.4,-17.8],after:'pool'},
 {id:'owners',name:'Parcelles à l’année',price:600,pos:[-3.4,-26.6],after:'mobil'}];
// Levelled upgrades: bought again and again, each level dearer (price = base × growth^level).
const nextPitch=kind=>s=>{const p=PITCHES.find(p=>p.kind===kind&&p.n===pitchCount(s,kind));return p?[p.x,p.z]:[0,0];};
export const LEVELS=[
 {id:'tents',name:'Emplacement tente',after:null,base:35,growth:1.3,max:8,pos:nextPitch('tent'),tip:'Une tente de plus'},
 {id:'caravans',name:'Emplacement caravane',after:'caravan',base:120,growth:1.35,max:4,pos:nextPitch('caravan'),tip:'Une caravane de plus'},
 ...TIER_ORDER.map((id,i)=>({id:'t_'+id,name:TIERS[id].name,after:'mobil',base:TIERS[id].price,growth:1,max:8,show:s=>freeRental(s)>=0,pos:[-13.2+i*2.6,-14.4],tip:`${TIERS[id].night} $ la nuit`})),
 {id:'owners',name:'Parcelle à l’année',after:'owners',base:350,growth:1.4,max:4,pos:[-8.4,-26.6],tip:'Un propriétaire de plus'},
 {id:'sac',name:'Chariot',after:'cleaner',base:120,growth:1.6,pos:[12.8,3.4],tip:'+6 objets portés'},
 {id:'sanit',name:'Sanitaires',after:'cleaner',base:180,growth:1.6,max:5,pos:[12,-2.9],tip:'+1 cabine, se salissent moins'},
 {id:'pub',name:'Guide du campeur',after:'shop',base:200,growth:1.6,pos:[6.2,8],tip:'+20 % d’arrivées'},
 {id:'stock',name:'Réserve',after:'freezer',base:250,growth:1.7,pos:[14.8,4.5],tip:'+50 % de stock partout'},
 {id:'confort',name:'Étoile de plus',after:'caravan',base:350,growth:1.7,pos:[14.8,6.7],tip:'+10 % sur les tarifs'},
 {id:'transfo',name:'Transformateur',after:'caravan',base:250,growth:1.5,max:3,pos:[14.8,-1.4],tip:'+14 kW de puissance : moins de disjonctions'},
 {id:'solar',name:'Panneaux solaires',after:'transfo',base:400,growth:1.6,max:3,pos:[14.8,1.6],tip:'+7 kW de jour, facture d’électricité −15 %'},
 {id:'tank',name:'Réservoir du château d’eau',after:'borehole',base:300,growth:1.5,max:3,pos:[32.4,4.6],tip:'+50 % de réserve d’eau'},
 {id:'transats',name:'Transats',after:'pool',base:120,growth:1.4,max:3,pos:[15.2,-12.2],tip:'+2 transats au bord de l’eau'},
 {id:'heating',name:'Chauffage de l’eau',after:'tech',base:300,growth:1.6,max:2,pos:[32,-4.4],tip:'Eau plus chaude, facture plus lourde'},
 {id:'guards',name:'Maître-nageur',after:'lifeguard',base:300,growth:1.6,max:3,pos:[15.2,-9.9],tip:'Surveille 2 bassins de plus'},
 {id:'equipe',name:'Saisonnier',after:'handyman',base:400,growth:1.45,pos:[12.8,5.7],tip:'Un saisonnier là où ça manque'}];
export const lvl=(s,id)=>s.levels[id]??0;
export const levelPrice=(s,L)=>Math.round(L.base*L.growth**lvl(s,L.id));
export const ownerCount=s=>s.unlocked.owners?2+lvl(s,'owners'):0;
export const freeRental=s=>s.unlocked.mobil?s.rent.findIndex(r=>!r.tier):-1;
export const pitchCount=(s,k)=>k==='owner'?ownerCount(s):k==='mobil'?(s.unlocked.mobil?s.rent.filter(r=>r.tier).length:0):!KINDS[k].needs||s.unlocked[KINDS[k].needs]?KINDS[k].start+lvl(s,KINDS[k].level):0;
export const pitchOpen=(s,i)=>{const p=PITCHES[i];return p.kind==='mobil'?!!s.rent[p.n]?.tier:p.kind==='owner'?!!s.owners[p.n]?.on:p.n<pitchCount(s,p.kind);};
export const openPitches=s=>PITCHES.reduce((n,p,i)=>n+(p.kind!=='owner'&&pitchOpen(s,i)?1:0),0);
export const resaleValue=R=>Math.round(TIERS[R.tier].price*(.35+.4*R.cond/100)),renovateCost=R=>Math.round(TIERS[R.tier].price*.2*(100-R.cond)/100);
export const loanLimit=s=>Math.max(500,Math.round(2*(s.lastDay?.revenue??300))),LOAN_RATE=.04;
export const occupied=s=>s.pitches.reduce((n,p)=>n+(p.by!=null?1:0),0);
export const stockMul=s=>1+.5*lvl(s,'stock');
export const sourceOpen=(s,k)=>!SOURCES[k].needs||!!s.unlocked[SOURCES[k].needs];
export const sourceCap=(s,k)=>k==='bread'?Math.max(s.sources.bread.n,breadOrder(s)):Math.round(SOURCES[k].cap*stockMul(s));
export const shelfOpen=(s,k)=>!!s.unlocked[SHELVES[k].needs];
export const shelfCap=(s,k)=>Math.round(SHELVES[k].cap*stockMul(s));
export const barCap=s=>Math.round(8*stockMul(s));
export const loungeCount=s=>s.unlocked.pool?4+2*lvl(s,'transats'):0;
export const sanitCap=s=>Math.round(SANIT.cap*stockMul(s));
export const ovenCap=s=>Math.round(OVEN.cap*stockMul(s));
export const cabins=s=>SANIT.cabins+lvl(s,'sanit');
export const dumpCap=s=>Math.round(DUMP.cap*stockMul(s));
// Seasons repeat every SEASON_LEN days: a quiet start, a long high season, a shoulder season. The director sets the price
// of each kind of pitch and a multiplier for the low and the high season; the price changes how many people book.
export const SEASON_LEN=30,SEASONS={low:{name:'Basse saison',demand:.6},high:{name:'Haute saison',demand:1.5},mid:{name:'Entre-saison',demand:1}};
export const seasonOf=s=>{const d=(s.day-1)%SEASON_LEN;return d<9?'low':d<24?'high':'mid';};
export const STAR_PRICE=[1,1.08,1.2,1.38,1.6],STAR_DEMAND=[.8,.9,1,1.1,1.25];
export const priceMul=(s,kind)=>{const P=s.pricing,sea=seasonOf(s);return (P[kind]??1)*(sea==='high'?P.high:sea==='low'?P.low:1)*(s.promo>0?.8:1);};
export const nightPrice=(s,kind,i)=>{const R=kind==='mobil'&&i!=null?s.rent[PITCHES[i].n]:null,base=R?.tier?TIERS[R.tier].night:KINDS[kind].price;return Math.round(base*(1+.1*lvl(s,'confort'))*STAR_PRICE[s.stars-1]*priceMul(s,kind));};
export const demandMul=(s,kind)=>SEASONS[seasonOf(s)].demand*STAR_DEMAND[s.stars-1]*Math.pow(priceMul(s,kind),-1.1);
export const price=(s,k)=>ITEMS[k].price*(1+.1*lvl(s,'confort'));
// The baker is told how many campers are there: about two baguettes per pitch taken, and a few more.
export const breadOrder=s=>Math.round(4+2.2*occupied(s));
const playerCap=s=>6+6*lvl(s,'sac'),helperCap=s=>6+2*lvl(s,'sac');
// Arrivals: reputation and the camper's guide bring people in, between late morning and the evening.
export const PATIENCE=50,CHECKIN=1.5;
export const traffic=s=>(.5+.15*s.rep)*(1+.2*lvl(s,'pub'));
const arrivalHours=s=>{const h=hourOf(s);return h>=11.5&&h<20.5;};
export const avgMood=s=>{const l=s.campers.filter(c=>c.in);return l.length?l.reduce((t,c)=>t+c.mood,0)/l.length:null;};

const newDay=()=>({revenue:0,arrivals:0,departures:0,stars:0,lost:0,bills:0,fixed:0,show:null,overbooked:0});
export function createCamping(){const s={schema:SAVE_SCHEMA,game:GAME,t:0,money:40,piles:[0,0],nextId:1,
 player:{id:0,role:'player',x:1.6,z:6.2,heading:0,carry:[],cap:6,speed:4.2,cool:0,moving:false},
 guests:[],helpers:[],posts:{},pitches:[],campers:[],sanit:{paper:8,dirt:0},shop:{bread:0,ice:0,drink:0,cream:0,gas:0,souv:0},oven:{in:0,out:0,timer:0,working:false},sources:{},pool:{chlor:1},dump:0,
 unlocked:{},levels:{},paid:{},rep:2.5,reviews:[],lost:0,arrivals:0,clock:OPEN*.375,day:1,popups:[]};
 return fill(s);}
// Fields added since the first saves get their defaults here, for new games and loaded ones alike.
function fill(s){s.guests=[];delete s.replica;s.pitches??=[];PITCHES.forEach((p,i)=>s.pitches[i]??={by:null,trash:0,noisy:false,down:false});
 for(const k of Object.keys(SOURCES))s.sources[k]??={n:k==='paper'?6:0,timer:0};
 for(const k of Object.keys(SHELVES))s.shop[k]??=0;s.oven??={in:0,out:0,timer:0,working:false};
 s.today??=newDay();s.lastDay??=null;s.report??=0;s.bills??=[];s.supply??=0;s.deskCool??=0;s.event??=null;s.eventTimer??=70;s.show??={day:0,state:'idle',t:0,kind:0};s.spawnTimer??=3;
 s.posts??={};s.reviews??=[];s.popups??=[];
 s.stars??=1;s.pricing??={};for(const [k,v] of Object.entries({tent:1,caravan:1,mobil:1,low:1,high:1,overbook:0}))s.pricing[k]??=v;s.svc??={machines:[0,0,0],bikes:BIKES,paddles:PADDLES,shuttle:{state:'idle',t:0,last:'',load:[]}};s.aqua??={};{const A=s.aqua;for(const [k,v] of Object.entries({ph:.5,filter:0,temp:.5,incidents:[],lounge:[],bar:{drink:0,ice:0},spa:{towels:6,sessions:[]},day:{price:DAYPASS.price,quota:DAYPASS.quota,count:0,day:0},ctrl:{t:0,day:0,why:''},visitors:[],occ:{},incTimer:40,visT:0,towelDay:0}))A[k]??=v;LOUNGERS.forEach((l,i)=>A.lounge[i]??=0);}
 s.rent??=Array.from({length:8},()=>({tier:null,cond:100,broken:null,t:0,fixp:0}));s.owners??=Array.from({length:6},()=>({on:false,mood:70,sublet:false,complained:false}));s.debt??=0;s.work??=0;
 if(!s.rentFix){s.rentFix=true;if(s.unlocked.mobil)for(let n=0;n<2+lvl(s,'mobils')&&n<8;n++)s.rent[n]={tier:'confort',cond:100,broken:null,t:0,fixp:0};}
 s.water??={tank:1,leak:null,leakTimer:80,drought:0,ban:false,units:0};s.power??={kwh:0,load:0,cap:30,trip:0};
 s.promo??=0;s.bookings??=[];s.booked??={};s.inspect??={state:'idle',day:0,t:0,bad:0,why:'',next:0};for(let d=1;d<=3;d++)planBookings(s,s.day+d);return s;}

// Tiles to show now: one-off unlocks whose prerequisite is bought, plus the next level of each levelled upgrade. What is
// bought only ever grows, so the list is rebuilt when this signature changes. Callers must not modify the array.
const sig=s=>{let n=0,l=0;for(const k in s.unlocked)if(s.unlocked[k])n++;for(const k in s.levels)l+=s.levels[k];return n+':'+l+':'+(s.rent?s.rent.filter(r=>r.tier).length:0);};
const memo=build=>{const cache=new WeakMap();return s=>{const k=sig(s),c=cache.get(s);if(c&&c.k===k)return c.v;const v=build(s);cache.set(s,{k,v});return v;};};
export const visibleUnlocks=memo(s=>{const out=UNLOCKS.filter(u=>!s.unlocked[u.id]&&(!u.after||s.unlocked[u.after])).map(u=>({...u,key:u.id}));
 for(const L of LEVELS){if(L.after&&!s.unlocked[L.after])continue;if(L.show&&!L.show(s))continue;const n=lvl(s,L.id);if(L.max!=null&&n>=L.max)continue;
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
function putBack(s,list){let back=0;for(const k of list){if(k==='bread'&&s.unlocked.bakery&&s.oven.out<OVEN.cap){s.oven.out++;back++;continue;}const src=Object.entries(SOURCES).find(([,d])=>d.item===k);if(src&&sourceOpen(s,src[0])&&s.sources[src[0]].n<sourceCap(s,src[0])){s.sources[src[0]].n++;back++;}}
 return {back,thrown:list.length-back};}
export function emptyHands(s,p=s.player){if(!p.carry.length)return null;const r=putBack(s,p.carry);p.carry=[];popup(s,r.thrown?`🗑️ ${r.back} rangés · ${r.thrown} jetés`:`🗑️ ${r.back} rangés`,p.x,p.z,'info');return r;}

// What the player cannot walk through (axis-aligned boxes [x0,z0,x1,z1]): buildings and counters, then whatever stands
// on the pitches right now (tents and caravans come and go with the campers).
const boxAt=(o,[x,z],w,d)=>o.push([x-w/2,z-d/2,x+w/2,z+d/2]);
const fixedBoxes=memo(s=>{const o=[[3.2,5.25,5.8,5.95],[2.8,2.2,6.2,3.6],[SANIT.pos[0]-2.25,SANIT.pos[1]-1.3,SANIT.pos[0]+2.25,SANIT.pos[1]+1.3]];
 boxAt(o,DUMP.pos,2,1.2);for(const [k,def] of Object.entries(SOURCES))if(sourceOpen(s,k))boxAt(o,def.pos,1.6,1.2);
 if(s.unlocked.shop)o.push([-8.1,5.25,-3.4,5.95],[-8,2.55,-3.4,3.5]);if(s.unlocked.bakery)o.push([-13,5.25,-8.1,5.95],[OVEN.pos[0]-.9,OVEN.pos[1]-.6,OVEN.pos[0]+.9,OVEN.pos[1]+.6]);if(s.unlocked.pool)o.push([POOL.x0-.25,POOL.z0-.25,POOL.x1+.25,POOL.z1+.25]);
 if(s.unlocked.stage)boxAt(o,STAGE.pos,3.6,1.8);
 if(s.unlocked.laundry)boxAt(o,LOISIRS.laundry.pos,3.4,2);if(s.unlocked.wifi)boxAt(o,LOISIRS.wifi.pos,.6,.6);if(s.unlocked.bikes)boxAt(o,LOISIRS.bikes.pos,2.8,1.4);if(s.unlocked.caravan)boxAt(o,ELEC,.6,.5);
 PITCHES.forEach((p,i)=>{if((p.kind==='mobil'||p.kind==='owner')&&pitchOpen(s,i))o.push([p.x-1.5,p.z-1.2,p.x+1.5,p.z+.6]);});return o;});
export function obstacles(s){const o=[...fixedBoxes(s)];for(const c of s.campers){if(!c.in)continue;const p=PITCHES[c.pitch];if(p.kind==='tent')o.push([p.x-.9,p.z-1.15,p.x+.9,p.z+.45]);else if(p.kind==='caravan')o.push([p.x-1.35,p.z-1.05,p.x+1.35,p.z+.35]);}return o;}
// Push a round body out of every box it overlaps (along the shallowest axis).
function collide(a,boxes,r=PLAYER_R){for(const [x0,z0,x1,z1] of boxes){const cx=clamp(a.x,x0,x1),cz=clamp(a.z,z0,z1),dx=a.x-cx,dz=a.z-cz,d=Math.hypot(dx,dz);
  if(d>=r)continue;if(d>1e-6){a.x=cx+dx/d*r;a.z=cz+dz/d*r;continue;}
  const pen=[[a.x-x0+r,-1,0],[x1-a.x+r,1,0],[a.z-z0+r,0,-1],[z1-a.z+r,0,1]].sort((p,q)=>p[0]-q[0])[0];a.x+=pen[1]*pen[0];a.z+=pen[2]*pen[0];}}

// One action per tick of cooldown: take from a delivery, pick up a rubbish bag, restock the toilets, a shelf or the pool, fill the skip.
function interact(s,a,dt){a.cool-=dt;if(a.cool>0)return;let did=false;const room=a.carry.length<a.cap;
 if(room)for(const [k,def] of Object.entries(SOURCES)){const src=s.sources[k];if(sourceOpen(s,k)&&src.n>0&&near(a,def.pos,1.25)&&takes(a,def.item)){src.n--;a.carry.push(def.item);did=true;break;}}
 if(!did&&room&&s.unlocked.bakery&&s.oven.out>0&&near(a,OVEN.outPad)&&takes(a,'bread')){s.oven.out--;a.carry.push('bread');did=true;}
 if(!did&&s.unlocked.bakery&&near(a,OVEN.inPad)&&s.oven.in<ovenCap(s)&&drop(a,'dough')){s.oven.in++;did=true;}
 if(!did&&room&&takes(a,'trash'))for(let i=0;i<PITCHES.length;i++){const p=s.pitches[i];if(p.trash>0&&near(a,[PITCHES[i].x,PITCHES[i].z+1.4],1.3)){p.trash--;a.carry.push('trash');did=true;break;}}
 if(!did&&near(a,SANIT.paper)&&s.sanit.paper<sanitCap(s)-.01&&drop(a,'paper')){s.sanit.paper=Math.min(sanitCap(s),s.sanit.paper+1);did=true;}
 if(!did)for(const [k,def] of Object.entries(SHELVES))if(shelfOpen(s,k)&&near(a,zoneOf(def))&&s.shop[k]<shelfCap(s,k)&&drop(a,k)){s.shop[k]++;did=true;break;}
 if(!did&&near(a,DUMP.pos,1.7)&&s.dump<dumpCap(s)&&drop(a,'trash')){s.dump++;did=true;}
 if(!did&&s.unlocked.pool&&(near(a,POOL.pad)||(s.unlocked.tech&&near(a,TECH.chlor)))&&s.pool.chlor<=.62&&drop(a,'chlor')){s.pool.chlor=Math.min(1,s.pool.chlor+.35);did=true;}
 if(!did&&s.unlocked.tech&&near(a,TECH.ph)&&s.aqua.ph>.3&&drop(a,'ph')){s.aqua.ph=Math.max(0,s.aqua.ph-.3);did=true;}
 if(!did&&s.unlocked.spa&&near(a,SPA.pad)&&s.aqua.spa.towels<14&&drop(a,'towel')){s.aqua.spa.towels++;did=true;}
 if(!did&&s.unlocked.beachbar&&near(a,BAR.pad))for(const k of ['drink','ice'])if(s.aqua.bar[k]<barCap(s)&&drop(a,k)){s.aqua.bar[k]++;did=true;break;}
 if(did)a.cool=.11;}

// What only players do: pay the bills at the office, collect the cash of the reception and the shop, pay for unlock tiles.
const CASH=[RECEPTION.cash,SHOP.cash];
function playerExtras(s,a,dt){
 s.deskCool-=dt;if(s.deskCool<=0&&near(a,DESK,1.3)){const b=s.bills[0];if(b&&s.money>=b.amount){s.money-=b.amount;s.today.bills+=b.amount;s.bills.shift();s.deskCool=.35;popup(s,`🧾 ${b.label} −${b.amount} $`,DESK[0],DESK[1],'info');}}
 CASH.forEach((pos,i)=>{if(s.piles[i]>0&&near(a,pos,1.2)){const take=Math.round(s.piles[i]);s.money+=s.piles[i];s.piles[i]=0;popup(s,`💵 +${take} $`,pos[0],pos[1]);}});
 let on=null;for(const u of visibleUnlocks(s)){if(!near(a,u.pos,.95)||s.money<1)continue;on=u.key;if(a.buyKey!==u.key){a.buyKey=u.key;a.buyT=0;}a.buyT+=dt;if(!(s.paid[u.key]>0)&&a.buyT<BUY_DELAY)break;const left=u.price-(s.paid[u.key]??0),pay=Math.min(left,Math.floor(s.money),Math.max(1,Math.ceil(u.price*dt*1.4)));
  s.money-=pay;s.paid[u.key]=(s.paid[u.key]??0)+pay;if(s.paid[u.key]>=u.price){delete s.paid[u.key];s.work=45;if(u.level){s.levels[u.id]=lvl(s,u.id)+1;popup(s,`${u.name} !`,u.pos[0],u.pos[1],'info');applyLevel(s,u.id);}else{s.unlocked[u.id]=true;popup(s,`${u.name} !`,u.pos[0],u.pos[1],'info');applyUnlock(s,u.id);}}break;}
 if(!on){a.buyKey=null;a.buyT=0;}}
// Buying needs a deliberate stop: standing on a tile for BUY_DELAY seconds before the first coin goes in, so walking across one
// by accident costs nothing. Once something has been paid into a tile, paying carries on without the wait.
export const BUY_DELAY=1.2;
function applyUnlock(s,id){s.player.cap=playerCap(s);s.player.speed=s.unlocked.cart?5.8:4.2;
 if(id==='receptionist')s.posts.reception=true;if(id==='shopkeeper')s.posts.shop=true;if(id==='animateur')s.posts.stage=true;
 if(id==='cleaner')s.helpers.push(helper(s,'clean','Agent d’entretien'));if(id==='handyman')s.helpers.push(helper(s,'fix','Homme à tout faire'));if(id==='lifeguard')s.helpers.push(helper(s,'pool','Maître-nageur'));
 if(id==='pool')s.pool.chlor=1;
 if(id==='tech'){s.aqua.ph=.5;s.aqua.filter=0;}
 if(id==='owners')syncOwners(s);}
function applyLevel(s,id){s.player.cap=playerCap(s);if(id==='sac')for(const h of s.helpers)h.cap=helperCap(s);
 if(id.startsWith('t_')){const i=freeRental(s);if(i>=0)s.rent[i]={tier:id.slice(2),cond:100,broken:null,t:0,fixp:0};}
 if(id==='owners')syncOwners(s);
 if(id==='guards'){const h=helper(s,'pool','Maître-nageur '+(lvl(s,'guards')+1));s.helpers.push(h);popup(s,'🏊 Un maître-nageur de plus',h.x,h.z,'info');}
 if(id==='equipe'){const loop=mostNeeded(s),h=helper(s,loop,'Saisonnier '+lvl(s,'equipe'));s.helpers.push(h);popup(s,`👷 → ${MISSIONS.find(m=>m.id===loop).icon}`,h.x,h.z,'info');}}

// Staff. Three posts are held by someone who never leaves them (reception, shop till, stage); the others walk around on
// a mission that the player can change: the same jobs as the player's own.
export const MISSIONS=[
 {id:'clean',label:'Emplacements : sacs → benne',icon:'🗑️→🚛',needs:null},
 {id:'sanit',label:'Sanitaires : papier et ménage',icon:'🧻🧽',needs:null},
 {id:'shop',label:'Épicerie : four, pain, glaces et rayons',icon:'🥖🍦🥤→🛒',needs:'shop'},
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
 // In the east quarters people simply cross the open ground instead of going back to the main alley.
 if(a.x>11&&x>11)return move(a,[x,z],dt,stop);
 if(Math.abs(a.z-z)>.2){if(Math.abs(a.x-ax)>.12)move(a,[ax,a.z],dt,.05);else move(a,[ax,z],dt,.05);a.moving=true;return false;}
 return move(a,[x,z],dt,stop);}
const go=(h,pos,dt)=>{if(route(h,pos,dt,.3))return true;h.idle=0;return false;};
const act=(s,h,dt)=>{const b=h.carry.length;interact(s,h,dt);h.idle=h.carry.length===b?h.idle+dt:0;};
// Fetch `item` at a delivery until the hands hold what is needed, then carry it where it goes.
function carryJob(s,h,dt,item,from,to,need,avail){const n=count(h,item);
 if(n&&(h.phase==='deliver'||n>=Math.min(h.cap,Math.max(1,need))||!avail||h.idle>1.5)){h.phase='deliver';if(go(h,to,dt))act(s,h,dt);return true;}
 h.phase=null;if(need<1||!avail)return false;h.wants=item;h.max=Math.min(h.cap,need);if(go(h,from,dt))act(s,h,dt);return true;}
// What the shop staff does next: bring dough to the oven, baked bread to the stand, or goods to the shelves, whichever lacks most.
function shopJob(s,h){const open=k=>shelfOpen(s,k)&&(k!=='bread'||s.unlocked.bakery),best=[];
 if(s.unlocked.bakery){const room=shelfCap(s,'bread')-s.shop.bread;if(s.oven.out>0&&room>=1)best.push([1.5+room/shelfCap(s,'bread'),{item:'bread',from:OVEN.outPad,to:zoneOf(SHELVES.bread),need:Math.min(s.oven.out,room),avail:true}]);
  const r=ovenCap(s)-s.oven.in;if(s.sources.bread.n>0&&r>=1)best.push([1+(s.sources.bread.n>0?.2:0),{item:'dough',from:SOURCES.bread.spot,to:OVEN.inPad,need:Math.min(s.sources.bread.n,r),avail:true}]);}
 for(const k of ['ice',...RACK_KINDS]){if(!open(k)||!sourceOpen(s,k))continue;const room=shelfCap(s,k)-s.shop[k];if(room>=1&&s.sources[k].n>0)best.push([room/shelfCap(s,k),{item:k,from:SOURCES[k].spot,to:zoneOf(SHELVES[k]),need:room,avail:true}]);}
 // Hands not empty: carry on with that same job (fetch until there is enough, then deliver); if nothing needs it any more, just take it where it goes.
 const held=h.carry.find(k=>k==='dough'||SHELVES[k]);
 if(held){const mine=best.find(([,j])=>j.item===held);if(mine)return mine[1];return held==='dough'?{item:'dough',from:SOURCES.bread.spot,to:OVEN.inPad,need:1,avail:true}:{item:held,from:null,to:zoneOf(SHELVES[held]),need:1,avail:true};}
 best.sort((a,b)=>b[0]-a[0]);return best[0]?.[1]??null;}
const dirtyPitch=(s,h)=>{let best=-1,bd=Infinity;s.pitches.forEach((p,i)=>{if(p.trash>0){const d=Math.hypot(PITCHES[i].x-h.x,PITCHES[i].z-h.z);if(d<bd){bd=d;best=i;}}});return best;};
function stepHelper(s,h,dt){h.wants=null;h.max=h.cap;const L=h.loop;if(L==='rest'){h.moving=false;return;}
 if(L==='clean'){const n=count(h,'trash'),i=dirtyPitch(s,h);
  if(n&&(n>=h.cap||i<0)){if(go(h,DUMP.spot,dt))act(s,h,dt);return;}
  if(i>=0){h.wants='trash';if(go(h,doorOf(i),dt))act(s,h,dt);return;}
  if(s.sanit.dirt>.4&&!crewAt(s,['sanit'],SANIT.mop)){go(h,SANIT.mop,dt);return;}h.moving=false;return;}
 if(L==='sanit'){if(carryJob(s,h,dt,'paper',SOURCES.paper.spot,SANIT.paper,Math.ceil(sanitCap(s)-s.sanit.paper-.001),s.sources.paper.n>0))return;go(h,SANIT.mop,dt);return;}
 if(L==='shop'){if(h.carry.length&&h.idle>4){putBack(s,h.carry);h.carry=[];h.phase=null;h.idle=0;}const j=shopJob(s,h);if(j&&carryJob(s,h,dt,j.item,j.from,j.to,j.need,j.avail))return;h.moving=false;return;}
 if(L==='pool'){if(!s.unlocked.pool){h.moving=false;return;}if(h.carry.length&&h.idle>4){putBack(s,h.carry);h.carry=[];h.phase=null;h.idle=0;}
  const A=s.aqua,mine=h.carry.find(k=>['chlor','ph','towel','drink','ice'].includes(k));
  const inc=A.incidents.filter(i=>i.fix<REPAIR).sort((a,b)=>Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z))[0];
  if(inc&&!mine){go(h,[inc.x,inc.z],dt);return;}
  if(s.event?.kind==='ducks'){go(h,POOL.pad,dt);return;}
  const tw=!mine&&A.lounge.map((st,i)=>st===1&&i<loungeCount(s)?i:-1).filter(i=>i>=0).sort((a,b)=>Math.hypot(LOUNGERS[a][0]-h.x,LOUNGERS[a][1]-h.z)-Math.hypot(LOUNGERS[b][0]-h.x,LOUNGERS[b][1]-h.z))[0];
  if(tw!=null&&tw!==false){go(h,LOUNGERS[tw],dt);return;}
  const jobs=[];const src=k=>s.sources[k].n>0;
  if(s.unlocked.tech&&A.filter>.55&&!mine){go(h,TECH.filter,dt);return;}
  if(s.unlocked.tech&&A.ph>.6&&src('ph'))jobs.push(['ph',SOURCES.ph.spot,TECH.ph,A.ph]);
  if(s.pool.chlor<=.6&&src('chlor'))jobs.push(['chlor',SOURCES.chlor.spot,s.unlocked.tech?TECH.chlor:POOL.pad,1-s.pool.chlor]);
  if(s.unlocked.beachbar){if(A.bar.drink<barCap(s)-3&&src('pdrink'))jobs.push(['drink',SOURCES.pdrink.spot,BAR.pad,1-A.bar.drink/barCap(s)]);if(A.bar.ice<barCap(s)-3&&src('pice'))jobs.push(['ice',SOURCES.pice.spot,BAR.pad,1-A.bar.ice/barCap(s)]);}
  if(s.unlocked.spa&&A.spa.towels<8&&src('towel'))jobs.push(['towel',SOURCES.towel.spot,SPA.pad,1-A.spa.towels/14]);
  // Two lifeguards never fetch the same product; what is no longer needed goes back where it came from.
  const open=jobs.filter(j=>j[0]===mine||!s.helpers.some(o=>o!==h&&o.loop==='pool'&&(o.carry.includes(j[0])||o.job===j[0])));
  if(mine&&!open.some(j=>j[0]===mine)){putBack(s,h.carry);h.carry=[];h.phase=null;return;}
  open.sort((a,b)=>b[3]-a[3]);const J=mine?open.find(j=>j[0]===mine):open[0];h.job=J?J[0]:null;
  if(J&&J[2]&&carryJob(s,h,dt,J[0],J[1],J[2],mine?1:(J[0]==='drink'||J[0]==='ice'?barCap(s)-A[J[0]==='towel'?'spa':'bar'][J[0]]:J[0]==='towel'?14-A.spa.towels:1),true))return;
  const idx=Math.max(0,s.helpers.filter(o=>o.loop==='pool').indexOf(h));go(h,[LIFE_CHAIR[0]+(idx%3)*.9,LIFE_CHAIR[1]+Math.floor(idx/3)*.9],dt);return;}
 if(L==='fix'){const sp=s.event?.spots.find(p=>p.fix<REPAIR),rb=sp?-1:RENTAL_PITCH.find((pi,n)=>s.rent[n].tier&&s.rent[n].broken),i=sp||rb>=0?-1:s.pitches.findIndex(p=>p.noisy);if(rb>=0){go(h,doorOf(rb),dt);return;}if(sp)go(h,[sp.x,sp.z],dt);else if(i>=0)go(h,doorOf(i),dt);else h.moving=false;}}

// Work done by standing somewhere: mopping the toilets, repairing, telling noisy campers to be quiet.
// The beach shuttle: it waits at its stop twice a day; campers who planned the trip walk there, it leaves with those who made it
// and brings them back later, happy, three dollars poorer.
function stepShuttle(s,dt){const Z=s.svc.shuttle,h=hourOf(s);if(!s.unlocked.shuttle||s.replica)return;
 if(Z.state==='idle'){const i=SHUTTLE_SLOTS.findIndex((x,k)=>h>=x&&h<x+.4&&Z.last!==`${s.day}-${k}`);
  if(i>=0){Z.state='wait';Z.t=SHUTTLE_WAIT;Z.last=`${s.day}-${i}`;popup(s,'🚌 La navette pour la plage est arrivée',LOISIRS.shuttle.stop[0],LOISIRS.shuttle.stop[1],'info');
   for(const c of s.campers)if(c.in&&!c.act&&!c.sleep&&c.todo[0]?.act==='beach'){c.todo.shift();c.act={kind:'beach',step:0,t:0};}}}
 else if(Z.state==='wait'){Z.t-=dt;if(Z.t<=0){Z.load=[];for(const c of s.campers)if(c.act?.kind==='beach'){if(c.act.step===1){c.away=true;c.act=null;Z.load.push(c.id);}else{c.act={kind:'back'};sad(c,2,'late');}}
   Z.state=Z.load.length?'away':'idle';Z.t=SHUTTLE_TRIP;}}
 else if(Z.state==='away'){Z.t-=dt;if(Z.t<=0){for(const c of s.campers)if(Z.load.includes(c.id)){c.away=false;c.x=LOISIRS.shuttle.stop[0];c.z=LOISIRS.shuttle.stop[1]-.8;c.act={kind:'back'};glad(c,10,'beach');s.money+=3;s.today.revenue+=3;}
   popup(s,`🏖️ ${Z.load.length} campeur${Z.load.length>1?'s':''} de retour de la plage : +${3*Z.load.length} $`,LOISIRS.shuttle.stop[0],LOISIRS.shuttle.stop[1],'money');Z.load=[];Z.state='idle';}}}
export const REPAIR=2.5,TECH_DELAY=75,TECH_FEE=50,MOP=.2;
// The oven bakes OVEN.batch doughs together in OVEN.time seconds, as long as there is room for the loaves.
function stepOven(s,dt){const O=s.oven;if(!s.unlocked.bakery){return;}
 if(O.in>0&&O.out<ovenCap(s)){O.working=true;O.timer+=dt;if(O.timer>=OVEN.time){O.timer=0;const n=Math.min(O.in,OVEN.batch,ovenCap(s)-O.out);O.in-=n;O.out+=n;}}else{O.working=false;O.timer=0;}}
function stepWork(s,dt){
 if(s.unlocked.pool){const A=s.aqua,who=n=>(n.filter(b=>near(b,TECH.filter,1.2)).length)+.8*s.helpers.filter(h=>h.loop==='pool'&&!h.moving&&near(h,TECH.filter,1.3)).length;
  if(s.unlocked.tech){const w=who(bodies(s));if(w)A.filter=Math.max(0,A.filter-.2*w*dt);}
  A.lounge.forEach((st,i)=>{if(st===1&&(anyBody(s,LOUNGERS[i],1.3)||crewAt(s,['pool'],LOUNGERS[i],1.3))){A.lounge[i]=0;popup(s,'🧺 Serviette retirée',LOUNGERS[i][0],LOUNGERS[i][1],'info');}});
  for(const inc of A.incidents)if(inc.fix<REPAIR&&(anyBody(s,[inc.x,inc.z],1.6)||crewAt(s,['pool'],[inc.x,inc.z],1.6))){inc.fix+=dt;if(inc.fix>=REPAIR){s.rep=Math.min(5,s.rep+.03);s.today.fixed++;popup(s,'✅ Incident réglé',inc.x,inc.z,'info');}}}
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
 wifi:{label:'📶 Le wifi est tombé : redémarrez la box',needs:'wifi',done:'📶 Wifi rétabli',bill:'Informaticien',spots:()=>[{x:LOISIRS.wifi.pad[0],z:LOISIRS.wifi.pad[1]}]},
 wc:{label:'🚽 WC bouchés aux sanitaires',done:'🪠 Débouché !',bill:'Plombier',spots:()=>[{x:SANIT.door[0],z:SANIT.door[1]}]},
 wasps:{label:'🐝 Nid de guêpes sur un emplacement',done:'🐝 Nid enlevé',bill:'Désinsectiseur',spots:s=>{const l=stayers(s);if(!l.length)return null;const c=l[Math.floor(Math.random()*l.length)],d=doorOf(c.pitch);return [{x:d[0],z:d[1],pitch:c.pitch,who:c.id}];}},
 ducks:{label:'🦆 Des canards squattent la piscine',needs:'pool',done:'🦆 Envolés !',bill:'Garde-chasse',spots:()=>[{x:POOL.pad[0],z:POOL.pad[1]}]},
 storm:{label:'🌬️ Coup de vent : des tentes se sont envolées',done:'⛺ Tente replantée',bill:'Renfort de sardines',spots:s=>{const l=stayers(s).filter(c=>PITCHES[c.pitch].kind==='tent').sort(()=>Math.random()-.5).slice(0,3);if(!l.length)return null;
   return l.map(c=>{s.pitches[c.pitch].down=true;const d=doorOf(c.pitch);return {x:d[0],z:d[1],pitch:c.pitch,who:c.id};});}}};
const stayers=s=>s.campers.filter(c=>c.in);
function stepEvents(s,dt){if(s.event||s.replica||s.arrivals<5)return;s.eventTimer-=dt*(isDay(s)?1:.4);if(s.eventTimer>0)return;s.eventTimer=55+Math.random()*50;
 // At night a wild boar sometimes knocks the bins over: rubbish on a few pitches, nothing to repair.
 if(!isDay(s)){if(Math.random()<.5){const l=PITCHES.map((p,i)=>i).filter(i=>pitchOpen(s,i)).sort(()=>Math.random()-.5).slice(0,3);for(const i of l)s.pitches[i].trash++;popup(s,'🐗 Un sanglier a renversé les poubelles',s.player.x,s.player.z,'bad');}return;}
 const kinds=Object.keys(EVENTS).filter(k=>k!=='disj'&&(!EVENTS[k].needs||s.unlocked[EVENTS[k].needs])),kind=kinds[Math.floor(Math.random()*kinds.length)],spots=EVENTS[kind].spots(s);if(!spots)return;
 s.event={kind,label:EVENTS[kind].label,t:0,spots:spots.map(p=>({...p,fix:0}))};popup(s,EVENTS[kind].label.split(' : ')[0],s.player.x,s.player.z,'bad');
 popup(s,`« ${QUIPS[Math.floor(Math.random()*QUIPS.length)]} »`,s.player.x,s.player.z-.8,'info');}
const QUIPS=['Pas de panique, c’est un classique !','Tout est sous contrôle… ou presque.','C’est pas moi, c’est le camping.','Ça, c’est pour le directeur !','Un directeur, ça ne dort jamais.'];

// Day clock. Things happen at fixed hours: the dustcart and the baker at dawn, stale bread thrown at 22:00, lights out
// at 23:00. When the night ends the report of the day is kept, the bills arrive and the campers plan their day.
export const BILL_DELAY=160,LATE_FEE=1.25;
const SUPPLY={paper:.4,bread:.35,ice:1,chlor:3,drink:.6,cream:3,gas:8,souv:3.5,ph:2,towel:.5,pdrink:.6,pice:1};
function stepDay(s,dt){const h0=hourOf(s);s.clock+=dt;s.report=Math.max(0,s.report-dt);const h1=hourOf(s),at=h=>h0<h&&h1>=h;
 if(at(22)&&s.unlocked.bakery){const n=s.shop.bread+s.oven.out+s.oven.in+s.sources.bread.n;s.shop.bread=s.oven.out=s.oven.in=s.sources.bread.n=0;s.oven.working=false;if(n)popup(s,`🥖 ${n} pain${n>1?'s':''} rassis jeté${n>1?'s':''}`,SHELVES.bread.pos[0],SHELVES.bread.pos[1],'info');}
 // Lights out: what was not done today is dropped (nobody goes for bread or a swim in the middle of the night).
 if(at(23)){popup(s,'🌙 Extinction des feux',s.player.x,s.player.z,'info');for(const c of stayers(s))c.todo=[];if(!s.replica)for(const c of stayers(s))if(Math.random()<TYPES[c.type].party)c.party=23.3+Math.random()*4;}
 if(at(30)&&s.dump>0){s.supply+=3+.5*s.dump;s.dump=0;popup(s,'🚛 Les éboueurs sont passés',DUMP.pos[0],DUMP.pos[1],'info');}
 if(at(30.5)&&s.unlocked.bakery){const n=breadOrder(s);s.sources.bread.n=n;s.supply+=n*SUPPLY.bread;popup(s,`🥖 Le boulanger a livré ${n} pâtons : au four !`,SOURCES.bread.pos[0],SOURCES.bread.pos[1],'info');}
 if(s.clock>=DAY){s.clock-=DAY;const T=s.today;s.lastDay={day:s.day,...T,stars:T.departures?T.stars/T.departures:null};s.lastDay.title=episodeTitle(s.lastDay);s.report=10;s.day++;s.today=newDay();stepRentalsDay(s);if(s.water.drought>0)s.water.drought--;else if(seasonOf(s)==='high'&&Math.random()<.15){s.water.drought=3;popup(s,'☀️ Sécheresse : arrêté préfectoral, l’eau devient chère',BOREHOLE.pos[0],BOREHOLE.pos[1],'bad');}
 s.promo=Math.max(0,s.promo-1);s.bookings=s.bookings.filter(b=>b.day>=s.day-1);for(let d=0;d<=3;d++)planBookings(s,s.day+d);issueBills(s);
  for(const p of s.pitches)p.noisy=false;for(const c of s.campers)if(c.in){c.party=null;c.sleep=false;c.left--;planDay(s,c,7);}popup(s,`☀️ Jour ${s.day}`,s.player.x,s.player.z,'info');}
 for(const b of s.bills)if(!b.late&&s.t>b.due){b.late=true;b.amount=Math.round(b.amount*LATE_FEE);s.rep=Math.max(0,s.rep-.3);popup(s,`🧾 Retard : ${b.label} +25 %`,DESK[0],DESK[1],'bad');}
 for(const [k,def] of Object.entries(SOURCES)){if(!def.every||!sourceOpen(s,k))continue;const src=s.sources[k];if(src.n<sourceCap(s,k)){src.timer+=dt;if(src.timer>=def.every){src.timer=0;src.n++;s.supply+=SUPPLY[k];}}}
 if(s.unlocked.pool)s.pool.chlor=Math.max(0,s.pool.chlor-dt*(s.event?.kind==='ducks'?.012:.0008));}
function issueBills(s){const L=s.lastDay,P=s.power,W=s.water,
 power=Math.round(P.kwh*.01*(1-.15*lvl(s,'solar'))),water=Math.round(W.units*(s.unlocked.borehole?8:40)*(W.drought>0?2:1)),
 list=[['Électricité',power],['Eau',water],['Taxe de séjour',Math.round(.06*(L?.revenue??0))],['Fournisseurs et éboueurs',Math.round(s.supply)]];s.supply=0;P.kwh=0;W.units=0;
 for(const [label,amount] of list)if(amount>0)s.bills.push({id:s.nextId++,label,amount,due:s.t+BILL_DELAY,late:false});}
export const billsDue=s=>s.bills.reduce((t,b)=>t+b.amount,0);

// Every day is an "episode" of the holiday sitcom, titled after what happened in it.
const EPISODES=['Un été presque parfait','Les Vacances de M. le Directeur','Chaud devant !','Le Retour du beau-frère','Tout est sous contrôle (enfin presque)','Sable dans les sandales','Panique à la réception','Le Secret de la baguette'];
export function episodeTitle(L){const d=L.day??1;
 if(L.show)return `${L.show}, ou la soirée de tous les dangers`;
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
// A pitch of that kind (any kind when `kind` is left out) that is open and empty; clean ones first.
const typeFor=(s,i)=>{const p=PITCHES[i],R=p.kind==='mobil'?s.rent[p.n]:null;return pick(R?.tier?TIERS[R.tier].types:TYPE_OF[p.kind]);};
function freePitchOf(s,kind){const free=PITCHES.map((p,i)=>i).filter(i=>PITCHES[i].kind!=='owner'&&(!kind||PITCHES[i].kind===kind)&&pitchOpen(s,i)&&s.pitches[i].by==null&&!(PITCHES[i].kind==='mobil'&&s.rent[PITCHES[i].n].broken)),
 clean=free.filter(i=>!s.pitches[i].trash),pool=clean.length?clean:free;return pool.length?pool[Math.floor(Math.random()*pool.length)]:-1;}
function newCamper(s,i,type,nights){const kind=PITCHES[i].kind,[a,b]=TYPES[type].nights,side=Math.random()<.5?-1:1,
 c={id:s.nextId++,pitch:i,kind,type,look:Math.floor(Math.random()*6),nights:nights??a+Math.floor(Math.random()*(b-a+1)),x:side*ROAD_END,z:ROAD_Z,heading:0,speed:2.6,moving:false,ax:(Math.random()-.5)*1.3,
  phase:'arrive',wait:0,pick:0,mood:70,card:Math.random()<.55,in:false,todo:[],wc:15+Math.random()*25,act:null};
 c.left=c.nights;s.pitches[i].by=c.id;s.campers.push(c);return c;}
const pick=list=>list[Math.floor(Math.random()*list.length)];
function stepSpawn(s,dt){if(s.replica)return;const h=hourOf(s);
 // People who booked turn up around the time they said; with no pitch left (overbooking) they leave furious.
 if(isDay(s))for(const b of s.bookings)if(!b.done&&b.day===s.day&&h>=b.at){b.done=true;const i=freePitchOf(s,b.kind);
  if(i<0){s.lost++;s.today.lost++;s.today.overbooked++;s.rep=Math.max(0,s.rep-.15);popup(s,'😠 Surréservé : plus de place !',GATE[0],GATE[1]-.5,'bad');}else newCamper(s,i,b.kind==='mobil'?typeFor(s,i):b.type,b.nights);}
 s.spawnTimer-=dt;if(s.spawnTimer>0||!arrivalHours(s))return;
 const queued=s.campers.filter(c=>c.phase==='arrive'||c.phase==='queue').length;
 s.spawnTimer=(70+Math.random()*25)*(s.day>=2?1.8:1)/(traffic(s)*Math.max(1,openPitches(s)));const i=freePitchOf(s);if(i<0||queued>=RECEPTION.max)return;
 newCamper(s,i,typeFor(s,i));}
// Bookings for a day are drawn once, a few days ahead: about 30 % of the pitches, more in high season and with a good
// reputation, fewer when the price is high, never more than the pitches still free on that day plus the overbooking allowed.
export const occupancyOn=(s,day,kind)=>{let n=0;for(const c of s.campers)if(c.in&&(!kind||c.kind===kind)&&s.day+c.left-1>=day)n++;
 for(const b of s.bookings)if((!kind||b.kind===kind)&&b.day<=day&&day<=b.day+b.nights-1)n++;return n;};
function planBookings(s,day){if(s.booked[day]||s.replica)return;s.booked[day]=true;
 for(const kind of Object.keys(KINDS)){const n=pitchCount(s,kind);if(!n)continue;
  const want=Math.floor(n*.3*traffic(s)*demandMul(s,kind)+Math.random()),room=Math.max(0,Math.floor(.85*n*(1+s.pricing.overbook/100))-occupancyOn(s,day,kind));
  for(let k=0;k<Math.min(want,room);k++){const type=pick(TYPE_OF[kind]),[a,b]=TYPES[type].nights;s.bookings.push({id:s.nextId++,day,kind,type,nights:a+Math.floor(Math.random()*(b-a+1)),at:11.5+Math.random()*8.5,done:false});}}}
export function forecast(s,d){const day=s.day+d;return {day,arrivals:s.bookings.filter(b=>b.day===day).length,left:s.bookings.filter(b=>b.day===day&&!b.done).length,
 byKind:Object.fromEntries(Object.keys(KINDS).map(k=>[k,s.bookings.filter(b=>b.day===day&&b.kind===k).length])),
 occupied:occupancyOn(s,day),capacity:Object.keys(KINDS).reduce((t,k)=>t+pitchCount(s,k),0)};}
// What a camper means to do today, from `from` o'clock on: bread in the morning, the pool and an ice cream in the
// afternoon. On the morning of the last day they pack up and leave instead.
function planDay(s,c,from){const todo=[],add=(h,act)=>{if(h>=from)todo.push({h,act});};
 if(c.left<=0){c.todo=[{h:Math.max(from,8+Math.random()*3),act:'out'}];return;}
 if(s.unlocked.bakery&&Math.random()<.85)add(7.2+Math.random()*2.6,'bread');
 if(s.unlocked.shop&&Math.random()<.5)add(10+Math.random()*8,'drink');
 if(s.unlocked.shop&&Math.random()<.22)add(9+Math.random()*8,'cream');
 if(s.unlocked.caravan&&c.kind!=='tent'&&Math.random()<.35)add(8+Math.random()*9,'gas');
 if(s.unlocked.souvenirs&&Math.random()<.3)add(13+Math.random()*6,'souv');

 if(s.unlocked.spa&&['retired','couple','beaufrere','mamie'].includes(c.type)&&Math.random()<.4)add(15+Math.random()*4,'spa');
 if(s.unlocked.laundry&&c.nights>=2&&Math.random()<.35)add(9+Math.random()*7,'laundry');
 if(s.unlocked.bikes&&Math.random()<.3)add(10+Math.random()*6,'bike');
 if(s.unlocked.playground&&(c.type==='family'||c.type==='mamie')&&Math.random()<.6)add(9.5+Math.random()*8,'play');
 if(s.unlocked.sports&&(c.type==='youth'||c.type==='family'||c.type==='beaufrere')&&Math.random()<.5)add(14+Math.random()*5,'sport');
 if(s.unlocked.shuttle&&Math.random()<.35)add(SHUTTLE_SLOTS[Math.floor(Math.random()*2)]-.4,'beach');
 if(s.unlocked.pool&&Math.random()<.7)add(11+Math.random()*7,'pool');
 if(s.unlocked.freezer&&Math.random()<.6)add(13+Math.random()*5.5,'ice');
 c.todo=todo.sort((a,b)=>a.h-b.h);}
// Opening hours: the pool shuts at 20:00 and the shop at 21:00, well before lights out.
export const POOL_CLOSE=20,SHOP_CLOSE=21;
const SIMPLE_ACTS=['laundry','bike','play','sport','beach','spa'],home=c=>doorOf(c.pitch);
const OUT={bread:'🥖 Plus de pain !',ice:'🍦 Plus de glaces !',drink:'🥤 Plus de boissons !',cream:'🧴 Plus de crème solaire !',gas:'🔥 Plus de gaz !',souv:'🧲 Plus de souvenirs !'};
const begin=(c,act,extra)=>{c.act={kind:act,step:0,t:0,...extra};};
function stepCampers(s,dt){const h=hourOf(s),night=!isDay(s),rushH=(h>=7&&h<9.5)||(h>=18&&h<20),ev=s.event;let rq=0,sq=0,gone=false,inside=0,swimmers=0,crowd=0;
 for(const c of s.campers){if(c.act?.kind==='wc'&&c.act.step===1)inside++;if(c.act?.kind==='pool'&&c.act.step>=1)swimmers++;}
 const receptionOn=s.posts.reception||anyBody(s,RECEPTION.serve),shopOn=s.posts.shop||anyBody(s,SHOP.serve);
 for(const c of s.campers){
  if(c.phase==='arrive'||c.phase==='queue'){const i=rq++,spot=RECEPTION.queue(i);c.wait+=dt;const there=route(c,spot,dt,.05);c.phase='queue';
   if(i===0&&there){c.heading=Math.PI;const ready=s.pitches[c.pitch].trash===0;c.blocked=!ready;
    if(ready&&receptionOn){c.pick+=dt*(anyBody(s,RECEPTION.serve)?1.6:1);if(c.pick>=CHECKIN){const amount=c.nights*nightPrice(s,c.kind,c.pitch);c.paid=amount;s.today.revenue+=amount;s.today.arrivals++;s.arrivals++;
      if(c.card&&s.unlocked.terminal){s.money+=amount;popup(s,`💳 +${amount} $`,RECEPTION.pos[0],RECEPTION.pos[1],'card');}else{s.piles[0]+=amount;popup(s,`💵 +${amount} $`,RECEPTION.pos[0],RECEPTION.pos[1]);}
      glad(c,c.wait<12?6:0);c.phase='toPitch';rq--;}}}
   if(c.phase==='queue'&&c.wait>PATIENCE){s.pitches[c.pitch].by=null;c.phase='leave';c.angry=true;s.lost++;s.today.lost++;s.rep=Math.max(0,s.rep-.25);say(s,c,c.blocked?'😠 Emplacement pas prêt !':'😠 Personne à l’accueil !');}
   continue;}
  if(c.phase==='toPitch'){if(route(c,home(c),dt,.05)){c.phase='stay';c.in=true;c.heading=0;planDay(s,c,hourOf(s));}continue;}
  if(c.phase==='leave'){const end=[(c.ax<0?-1:1)*ROAD_END,ROAD_Z];if(route(c,end,dt,.3))gone=true;continue;}
  if(c.away)continue;
  // Staying: what weighs on the mood right now, then the current outing, or the next thing to do.
  const P=s.pitches[c.pitch];
  if(P.down)sad(c,dt*1.1,'storm');if(ev?.kind==='wasps'&&ev.spots[0].who===c.id)sad(c,dt*1,'wasps');if(ev?.kind==='disj'&&c.kind!=='tent')sad(c,dt*.5,'power');if(c.kind==='mobil'&&s.rent[PITCHES[c.pitch].n]?.broken)sad(c,dt*.9,'rental');if(ev?.kind==='wifi'&&(c.type==='youth'||c.type==='family'||c.type==='couple'))sad(c,dt*.7,'wifi');
  if(night&&!P.noisy)for(let i=0;i<PITCHES.length;i++)if(s.pitches[i].noisy&&Math.hypot(PITCHES[i].x-PITCHES[c.pitch].x,PITCHES[i].z-PITCHES[c.pitch].z)<6.5){sad(c,dt*.9,'noise');break;}
  if(c.mood<72)c.mood+=dt*.12;
  if(night&&c.party&&h>=c.party){c.party=null;P.noisy=true;say(s,c,'🎶 Fiesta !','info');}
  const A=c.act;
  if(!A){if(c.sleep){if(night){c.moving=false;continue;}c.sleep=false;}
   const next=c.todo[0];
   if(night&&c.party==null&&!P.noisy&&h>=23.2){c.sleep=true;c.moving=false;continue;}
   if(next&&h>=next.h&&!night){c.todo.shift();
    if(next.act==='out'){checkout(s,c);continue;}
    // Too late to set off: the outing is given up (the pool and the shop are about to close).
    if(SIMPLE_ACTS.includes(next.act)){if(h<20)begin(c,next.act);}
    else if(next.act==='pool'){if(h<POOL_CLOSE-1.5)begin(c,'pool');}else if(h<SHOP_CLOSE-1){c.pick=0;begin(c,'shop',{k:next.act,n:next.act==='bread'||next.act==='drink'?1+Math.floor(Math.random()*3):next.act==='ice'?1+Math.floor(Math.random()*2):1,got:0,pay:0});}}
   else if(s.show.state==='on'&&s.show.t>3&&c.show!==s.day){c.show=s.day;begin(c,'show');}
   else{c.wc-=dt*(night?.12:rushH?1.8:1);if(c.wc<=0){c.wc=28+Math.random()*30;begin(c,'wc');}else{c.moving=false;}}
   continue;}
  if(A.kind==='back'){if(route(c,home(c),dt,.05)){c.act=null;c.heading=0;}continue;}
  // Closing time: swimmers get out of the water, the shop serves what is in hand and sends its queue home.
  if(night&&['sun','bar','laundry','bike','play','sport','beach','spa'].includes(A.kind)){if(A.kind==='sun'&&A.l!=null)s.aqua.lounge[A.l]=0;if(A.kind==='bike'&&A.what&&A.step>=1){s.svc[A.what]++;c.speed=c.ride??2.6;c.ride=null;}if(A.kind==='laundry'&&A.m!=null)s.svc.machines[A.m]=0;c.lying=false;c.act={kind:'back'};continue;}
  if(A.kind==='pool'&&h>=POOL_CLOSE){if(A.step===0){c.act={kind:'back'};continue;}if(A.step===1){A.step=2;glad(c,8,'pool');}}
  if(A.kind==='shop'&&h>=SHOP_CLOSE){if(A.got>0){sale(s,c,A);glad(c,5,A.k);}c.act={kind:'back'};continue;}
  if(A.kind==='wc'){
   if(A.step===0){if(!route(c,[SANIT.door[0]+(c.ax??0),SANIT.door[1]],dt,.1))continue;
    if(ev?.kind==='wc'){sad(c,10,'clog');say(s,c,'🚽 Bouché !');c.act={kind:'back'};}
    else if(waterCut(s)){sad(c,8,'water');say(s,c,'🚿 Plus une goutte d’eau !');c.act={kind:'back'};}
    else if(inside<cabins(s)){inside++;useWater(s,.004);if(s.water.ban)sad(c,1,'ban');A.step=1;A.t=2.6;}
    else{A.t+=dt;if(A.t>12){sad(c,6,'queue');say(s,c,'🚿 Trop de queue');c.act={kind:'back'};}}}
   else{A.t-=dt;if(A.t<=0){const S=s.sanit;
     if(S.paper<.34){sad(c,12,'paper');say(s,c,'🧻 Plus de papier !');}else{S.paper=Math.max(0,S.paper-.34);if(S.dirt>.7){sad(c,7,'dirty');say(s,c,'🤢 C’est sale');}else glad(c,2,S.dirt<.25?'clean':null);}
     S.dirt=Math.min(1,S.dirt+.055/(1+.35*lvl(s,'sanit')));c.act={kind:'back'};}}
   continue;}
  if(A.kind==='shop'){const i=sq++;if(i>=SHOP.max){sq--;A.t+=dt;c.moving=false;if(A.t>20)c.act=null;continue;}
   const there=route(c,SHOP.queue(i),dt,.05);A.t+=dt;
   if(i===0&&there){c.heading=Math.PI;
    if(shopOn&&s.shop[A.k]>0){c.pick-=dt;if(c.pick<=0){s.shop[A.k]--;A.got++;A.pay+=price(s,A.k);c.pick=.3;}}
    if(A.got>=A.n||(A.got>0&&s.shop[A.k]<=0&&A.t>6)){sale(s,c,A);glad(c,5,A.k);c.act={kind:'back'};sq--;continue;}}
   if(A.t>26){if(A.got>0)sale(s,c,A);else{sad(c,8,A.k==='bread'?'bread':A.k==='ice'?'ice':'stock');say(s,c,shopOn?OUT[A.k]??'🛒 Rayon vide !':'🛒 Personne à la caisse !');}c.act={kind:'back'};sq--;}
   continue;}
  if(A.kind==='laundry'){const L=LOISIRS.laundry;
   if(A.step===0){if(!route(c,[L.pad[0]+(c.ax??0)*.6,L.pad[1]],dt,.1))continue;const m=s.svc.machines.findIndex(x=>!x);
    if(m>=0){useWater(s,.01);s.svc.machines[m]=1;A.m=m;A.step=1;A.t=8;s.money+=4;s.today.revenue+=4;popup(s,'🪙 +4 $',L.pos[0],L.pos[1]);}else{A.t+=dt;if(A.t>10){sad(c,3,'laundry');c.act={kind:'back'};}}}
   else{A.t-=dt;if(A.t<=0){s.svc.machines[A.m]=0;glad(c,5,'laundry');c.act={kind:'back'};}}continue;}
  if(A.kind==='bike'){const L=LOISIRS.bikes;
   if(A.step===0){if(!route(c,[L.pad[0]+(c.ax??0)*.6,L.pad[1]],dt,.1))continue;A.what=s.svc.bikes>0?'bikes':s.svc.paddles>0?'paddles':null;
    if(!A.what){sad(c,4,'bike');say(s,c,'🚲 Plus rien à louer !');c.act={kind:'back'};}else{s.svc[A.what]--;A.step=1;A.t=14;c.ride=c.speed;c.speed=4.4;}}
   else if(A.step===1){A.t-=dt;move(c,[31+Math.sin(A.t)*1.6,-5.85+Math.cos(A.t*.7)*1.6],dt,.2);if(A.t<=0)A.step=2;}
   else if(route(c,[L.pad[0]+(c.ax??0)*.6,L.pad[1]],dt,.1)){c.speed=c.ride??2.6;c.ride=null;s.svc[A.what]++;const fee=A.what==='bikes'?6:8;s.money+=fee;s.today.revenue+=fee;popup(s,`${A.what==='bikes'?'🚲':'🏄'} +${fee} $`,L.pos[0],L.pos[1]);glad(c,7,'bike');c.act={kind:'back'};}
   continue;}
  if(A.kind==='play'||A.kind==='sport'){const L=LOISIRS[A.kind==='play'?'playground':'sports'];
   if(A.step===0){if(route(c,[L.pos[0]+(c.ax??0)*1.4,L.pos[1]-.6],dt,.2)){A.step=1;A.t=9;}}
   else{A.t-=dt;c.moving=Math.sin(A.t*3)>0;if(A.t<=0){glad(c,A.kind==='play'?6:7,A.kind==='play'?'playground':'sports');c.act={kind:'back'};}}continue;}
  if(A.kind==='beach'){const S=LOISIRS.shuttle.stop;if(A.step===0&&route(c,[S[0]+(c.ax??0)*1.2,S[1]-.8],dt,.2))A.step=1;else if(A.step===1)c.moving=false;continue;}
  if(A.kind==='pool'){const AQ=s.aqua;
   if(A.step===0){if(!A.b){A.b=pickBasin(s,c.type);if(!A.b){if(openBasins(s).some(x=>(AQ.occ[x]??0)<BASINS[x].cap)){sad(c,4,'closed');say(s,c,'🚫 Baignade interdite : pas de maître-nageur');}else sad(c,3,'full');c.act={kind:'back'};continue;}}
    const B=BASINS[A.b];if(!route(c,[B.gate[0]+(c.ax??0),B.gate[1]],dt,.1))continue;const issue=waterIssue(s);
    if(ev?.kind==='ducks'&&A.b==='pool'){sad(c,4,'ducks');say(s,c,'🦆 Y a des canards…');c.act={kind:'back'};}
    else if(issue){sad(c,{green:9,eyes:6,cloudy:7,cold:5}[issue],issue);say(s,c,WATER_TEXT[issue]);c.act={kind:'back'};}
    else if(!guardedBasins(s).has(A.b)){sad(c,4,'closed');say(s,c,'🚫 Baignade interdite : pas de maître-nageur');c.act={kind:'back'};}
    else if((AQ.occ[A.b]??0)>=B.cap){sad(c,3,'full');c.act={kind:'back'};}
    else{A.step=1;A.t=7+Math.random()*3;[A.x,A.z]=randomIn(B.rect);AQ.occ[A.b]=(AQ.occ[A.b]??0)+1;useWater(s,.0008);s.pool.chlor=Math.max(0,s.pool.chlor-.01);if(s.unlocked.tech){AQ.ph=Math.min(1,AQ.ph+.006);AQ.filter=Math.min(1,AQ.filter+.02);}}}
   else if(A.step===1){const B=BASINS[A.b];c.swim=move(c,[A.x,A.z],dt,.1)||c.z<B.rect[3];A.t-=dt;if(A.t<=0||!guardedBasins(s).has(A.b)){A.step=2;glad(c,8,'pool');}}
   else{const B=BASINS[A.b];c.swim=c.z<B.rect[3];if(move(c,[B.gate[0]+(c.ax??0),B.gate[1]],dt,.1)){c.swim=false;const r=Math.random();
     if(s.unlocked.beachbar&&r<.3)c.act={kind:'bar',step:0,t:0};else if(loungeCount(s)>0&&r<.65)c.act={kind:'sun',step:0,t:0};else c.act={kind:'back'};}}
   continue;}
  if(A.kind==='sun'){const AQ=s.aqua,n=loungeCount(s);
   if(A.step===0){let best=-1,bd=1e9;for(let i=0;i<n;i++)if(AQ.lounge[i]===0){const d=Math.hypot(LOUNGERS[i][0]-c.x,LOUNGERS[i][1]-c.z);if(d<bd){bd=d;best=i;}}
    if(best<0){if(AQ.lounge.slice(0,n).some(x=>x===1)){sad(c,4,'transat');say(s,c,'🏖️ Serviettes sur tous les transats !');}c.act={kind:'back'};continue;}
    A.l=best;AQ.lounge[best]=2;A.step=1;}
   else if(A.step===1){if(route(c,[LOUNGERS[A.l][0],LOUNGERS[A.l][1]],dt,.1)){A.step=2;A.t=9;}}
   else{c.lying=true;c.moving=false;A.t-=dt;if(A.t<=0){c.lying=false;AQ.lounge[A.l]=0;glad(c,4,'transat');c.act=s.unlocked.beachbar&&Math.random()<.3?{kind:'bar',step:0,t:0}:{kind:'back'};}}
   continue;}
  if(A.kind==='bar'){const AQ=s.aqua;if(!route(c,[BAR.counter[0]+(c.ax??0)*.8,BAR.counter[1]],dt,.1))continue;
   const k=AQ.bar.drink>0&&(Math.random()<.6||AQ.bar.ice<=0)?'drink':AQ.bar.ice>0?'ice':null;
   if(!k){sad(c,4,'bar');say(s,c,'🍹 Le bar est vide !');}else{AQ.bar[k]--;const fee=k==='drink'?2:3;s.money+=fee;s.today.revenue+=fee;popup(s,`${k==='drink'?'🥤':'🍦'} +${fee} $`,BAR.pos[0],BAR.pos[1]);glad(c,5,'bar');}
   c.act={kind:'back'};continue;}
  if(A.kind==='spa'){const AQ=s.aqua;
   if(A.step===0){if(!route(c,[SPA.door[0]+(c.ax??0)*.5,SPA.door[1]],dt,.1))continue;A.t+=dt;
    if(AQ.spa.towels<1){sad(c,6,'towel');say(s,c,'🧖 Plus de serviettes propres !');c.act={kind:'back'};}
    else if(AQ.spa.sessions.length>=SPA.cap){if(A.t>8){sad(c,3,'spafull');c.act={kind:'back'};}}
    else{useWater(s,.006);AQ.spa.towels--;AQ.spa.sessions.push({id:c.id,t:SPA.len});c.away=true;c.act=null;const fee=Math.round(SPA.price*STAR_PRICE[s.stars-1]);s.money+=fee;s.today.revenue+=fee;popup(s,`🧖 +${fee} $`,SPA.pos[0],SPA.pos[1],'money');}}
   continue;}
  if(A.kind==='show'){const there=route(c,STAGE.crowd(crowd++),dt,.1);if(there)c.heading=Math.PI;if(s.show.state!=='on'){if(there||A.t>0){glad(c,10,'show');}c.act={kind:'back'};}else if(there&&!A.t){A.t=1;s.show.bar+=5*(1+.1*lvl(s,'confort'));}}}
 if(gone)s.campers=s.campers.filter(c=>!(c.phase==='leave'&&Math.abs(c.x)>=ROAD_END-.4));}
function sale(s,c,A){const amount=A.pay;if(!(amount>0))return;s.today.revenue+=amount;if(c.card&&s.unlocked.terminal){s.money+=amount;popup(s,`💳 +${Math.round(amount)} $`,SHOP.till[0],SHOP.till[1],'card');}else{s.piles[1]+=amount;popup(s,`💵 +${Math.round(amount)} $`,SHOP.till[0],SHOP.till[1]);}}
// Leaving: the pitch is left with rubbish to clear, and the camper writes a review that moves the reputation.
const WORDS={paper:['Plus de papier depuis mardi.','J’ai dû emprunter le rouleau du voisin.','Papier toilette : denrée rare, comme l’eau au Sahara.','On a fini par utiliser le dépliant du camping.'],
 dirty:['Sanitaires à visiter en apnée.','La douche se méritait.','J’ai croisé une araignée qui payait aussi son emplacement.','On y entre en tongs, on en ressort en prière.'],
 queue:['Vingt minutes de queue pour une douche froide.','On a rencontré tous nos voisins… dans la file des WC.'],clog:['Les WC bouchés, un grand classique.','Le plombier a désormais sa chaise à l’accueil.'],
 water:['Plus d’eau au robinet en pleine journée : on s’est lavés au pastis.','Le château d’eau était vide, pas nous.'],ban:['Douche de trente secondes chrono, vacances ou caserne ?'],
 rental:['Pas d’eau chaude dans le mobil-home : la douche était une épreuve.','La climatisation en panne par 35 degrés, on a dormi dehors.','La terrasse s’est effondrée sous l’apéritif.'],
 eyes:['L’eau piquait tellement qu’on a pleuré en sortant.','Les yeux rouges toute la semaine, merci la piscine.'],cloudy:['On voyait à peine ses pieds dans le bassin.'],cold:['L’eau de la piscine : parfaite pour un pingouin.'],closed:['Baignade interdite en pleine canicule, faute de maître-nageur.'],incident:['Un toboggan coincé et personne pour nous aider.'],transat:['Tous les transats réservés dès 7 h par des serviettes fantômes.'],bar:['Le bar de la piscine était vide, comme notre verre.'],towel:['Au spa, plus une serviette propre : on s’est essuyé avec nos espoirs.'],spafull:['Le spa était complet, on a attendu devant la porte.'],spa:['Le spa nous a remis les vertèbres en place.'],
 wifi:['Le wifi ? Une légende locale.','Impossible de regarder mon match : la box a rendu l’âme.'],laundry:['Trois machines pour tout le camping, on a fait la queue avec nos slips.'],bike:['On voulait louer des vélos, il n’y en avait plus.'],late:['La navette est partie sans nous. Magnifique.'],
 stock:['Un rayon vide, c’est un jour de moins de vacances.','Plus de crème solaire : coup de soleil offert par la maison.','L’épicerie ? Un joli décor.'],
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
 {const R=c.kind==='mobil'?s.rent[PITCHES[c.pitch].n]:null;if(R?.tier)R.cond=Math.max(0,R.cond-TIERS[R.tier].wear*(.7+Math.random()*.6));}
 P.by=null;P.trash+=KINDS[c.kind].trash;P.noisy=false;P.down=false;c.in=false;c.phase='leave';c.act=null;c.stars=stars;
 s.rep=clamp(s.rep+(stars-s.rep)*.12,0,5);s.today.departures++;s.today.stars+=stars;s.reviews.unshift({day:s.day,stars,text,who:TYPES[c.type].name,icon:TYPES[c.type].icon});if(s.reviews.length>12)s.reviews.length=12;
 if(stars===5){const tip=Math.round(.1*(c.paid??0));if(tip){s.money+=tip;s.today.revenue+=tip;}}popup(s,'★'.repeat(stars)+'☆'.repeat(5-stars),c.x,c.z,stars>=4?'money':stars===3?'info':'bad');}

// ---- Water and power. Water: the camp buys from the mains by the unit, or pumps its own from a borehole into a water tower of limited
// size (the pump needs power); a leak somewhere wastes water until someone follows the puddles and stops it; in a drought the pump is
// slow and the price high, and the director may ask everyone to save water. Power: every consumer adds to the load; above the
// transformer's capacity the breaker trips; solar panels add capacity by day and cut the bill.
export const tankCap=s=>1+.5*lvl(s,'tank');
export const sunny=s=>{const h=hourOf(s);return isDay(s)&&h>=8&&h<19;};
export const powerCap=s=>30+14*lvl(s,'transfo')+(sunny(s)?7*lvl(s,'solar'):0);
export function powerLoad(s){let n=3;for(const c of s.campers)if(c.in&&c.kind!=='tent')n+=c.kind==='mobil'?1.6:1.2;
 if(s.unlocked.shop)n+=3;if(s.unlocked.bakery&&s.oven.working)n+=5;if(s.unlocked.pool)n+=2+1.5*Math.max(0,basinCount(s)-1);if(s.unlocked.tech)n+=4*lvl(s,'heating');if(s.unlocked.spa)n+=4;
 if(s.unlocked.laundry)n+=2*s.svc.machines.filter(x=>x).length;if(s.unlocked.wifi)n+=1;if(s.unlocked.borehole&&s.water.tank<tankCap(s)-.02)n+=2;if(s.show.state==='on')n+=4;if(!isDay(s))n+=4;
 for(const o of s.owners)if(o.on)n+=.8;return n;}
const useWater=(s,u)=>{const W=s.water;u*=W.ban?.6:1;W.units+=u;if(s.unlocked.borehole)W.tank=Math.max(0,W.tank-u/tankCap(s));};
export const waterCut=s=>s.unlocked.borehole&&s.water.tank<.06;
export const LEAK_SPOTS=[[-3,3.2],[6.4,-.6],[-8,-5.8],[2.6,-14.2],[20.5,-4.4],[-9,-21.8],[13,-12.5],[26,-5]];
function stepResources(s,dt){if(s.replica)return;const W=s.water,P=s.power;P.cap=powerCap(s);P.load=powerLoad(s);P.kwh+=P.load*dt;
 if(P.load>P.cap){P.trip+=dt*(P.load/P.cap-1);if(!s.event&&P.trip>1.2&&s.unlocked.caravan){P.trip=0;s.event={kind:'disj',label:EVENTS.disj.label,t:0,spots:EVENTS.disj.spots(s).map(p=>({...p,fix:0}))};popup(s,'⚡ Surcharge : le disjoncteur a sauté !',ELEC[0],ELEC[1],'bad');}}else P.trip=Math.max(0,P.trip-dt*.5);
 // the pump fills the tower, slower in a drought and with no power it stops
 if(s.unlocked.borehole&&W.tank<tankCap(s))W.tank=Math.min(tankCap(s),W.tank+dt*.0045*(W.drought>0?.4:1)*(s.event?.kind==='disj'?0:1));
 if(W.leak){const L=W.leak;L.t+=dt;useWater(s,.0015*dt);if(anyBody(s,[L.x,L.z],3.5)||L.t>20)L.found=true;
  if(L.found&&(anyBody(s,[L.x,L.z],1.6)||crewAt(s,['fix'],[L.x,L.z],1.6)))L.fix+=dt;
  if(L.fix>=REPAIR+.5){W.leak=null;W.leakTimer=90+Math.random()*60;popup(s,'🔧 Fuite réparée',L.x,L.z,'info');}
  else if(L.t>=85){W.leak=null;W.leakTimer=90+Math.random()*60;s.bills.push({id:s.nextId++,label:'Plombier : fuite d’eau',amount:90,due:s.t+BILL_DELAY,late:false});popup(s,'🔧 Plombier : facture 90 $',L.x,L.z,'bad');}}
 else if(isDay(s)&&s.day>=3&&(s.unlocked.shop||s.unlocked.pool)){W.leakTimer-=dt;if(W.leakTimer<=0){const far=LEAK_SPOTS.filter(p=>Math.hypot(p[0]-s.player.x,p[1]-s.player.z)>9),p=pick(far.length?far:LEAK_SPOTS);
  W.leak={x:p[0],z:p[1],a:Math.random()*Math.PI*2,t:0,fix:0,found:false};popup(s,'💧 Une fuite d’eau ! Suivez les flaques…',p[0],p[1],'bad');}}}
// ---- Rentals and owners.
function syncOwners(s){s.owners.forEach((o,i)=>{if(i<ownerCount(s)&&!o.on&&!o.left){o.on=true;o.mood=70;}});}
// Every night: owners pay their lease (and the sublet share), a broken rental may appear, a loan costs interest, a tenant may leave.
function stepRentalsDay(s){s.debt=Math.round(s.debt*(1+LOAN_RATE));
 s.owners.forEach((o,i)=>{if(i>=ownerCount(s))return;if(!o.on){if(Math.random()<.5){o.on=true;o.left=false;o.mood=70;o.sublet=false;popup(s,'🏡 Un nouveau propriétaire s’installe',PITCHES[26+i].x,PITCHES[26+i].z,'info');}return;}
  const rent=Math.round(28*STAR_PRICE[s.stars-1]);s.money+=rent;s.today.revenue+=rent;
  if(o.sublet){const inc=Math.round(70*STAR_PRICE[s.stars-1]*.55*.4);s.money+=inc;s.today.revenue+=inc;o.mood=Math.max(0,o.mood-3);}
  if(o.mood<=10){o.on=false;o.left=true;s.rep=Math.max(0,s.rep-.1);popup(s,'🏡 Un propriétaire résilie son bail',PITCHES[26+i].x,PITCHES[26+i].z,'bad');}});
 for(const o of s.owners)if(o.left&&!o.on&&Math.random()<.3)o.left=false;
 for(const R of s.rent)if(R.tier&&!R.broken&&Math.random()<.01+(1-R.cond/100)*.5){R.broken=pick(BREAKS);R.t=0;R.fixp=0;}}
function stepRentals(s,dt){if(s.replica)return;s.work=Math.max(0,s.work-dt);
 s.owners.forEach((o,i)=>{if(!o.on)return;const P=PITCHES[26+i];let drain=s.work>0?.15:0;
  PITCHES.forEach((q,j)=>{if(s.pitches[j].noisy&&Math.hypot(q.x-P.x,q.z-P.z)<8)drain+=.8;});o.mood=clamp(o.mood+(drain?-drain*dt:dt*.03),0,100);
  if(o.mood<40&&!o.complained){o.complained=true;popup(s,'📣 Un propriétaire se plaint du bruit et des travaux',P.x,P.z,'bad');}if(o.mood>60)o.complained=false;});
 RENTAL_PITCH.forEach((pi,n)=>{const R=s.rent[n];if(!R.tier||!R.broken)return;R.t+=dt;
  if(anyBody(s,doorOf(pi),1.7)||crewAt(s,['fix'],doorOf(pi),1.7))R.fixp+=dt;
  if(R.fixp>=REPAIR+.5){R.broken=null;R.cond=Math.min(100,R.cond+12);popup(s,'🔧 Locatif réparé',PITCHES[pi].x,PITCHES[pi].z,'info');}
  else if(R.t>=70){R.broken=null;R.cond=Math.min(100,R.cond+8);s.bills.push({id:s.nextId++,label:'Réparation d’un locatif',amount:70,due:s.t+BILL_DELAY,late:false});popup(s,'🔧 Réparateur : facture 70 $',PITCHES[pi].x,PITCHES[pi].z,'bad');}});}
// ---- Aquatic centre: lifeguards, water quality, incidents, towels, the day pass and the spa.
export const guardCount=s=>s.helpers.filter(h=>h.loop==='pool').length+(bodies(s).some(b=>near(b,LIFE_CHAIR,1.3))?1:0);
export const openBasins=s=>BASIN_ORDER.filter(b=>!!s.unlocked[b]);
export const guardedBasins=s=>new Set(openBasins(s).slice(0,2*guardCount(s)));
// What is wrong with the water, if anything: green (no chlorine), eyes (pH or chlorine out of range), cloudy (dirty filter), cold.
export function waterIssue(s){const A=s.aqua;if(s.pool.chlor<.25)return 'green';if(!s.unlocked.tech)return '';
 if(s.pool.chlor>.97||A.ph>.72||A.ph<.25)return 'eyes';if(A.filter>.85)return 'cloudy';if(A.temp<.38)return 'cold';return '';}
export const WATER_TEXT={green:'🤢 Piscine verte !',eyes:'😖 L’eau pique les yeux',cloudy:'🌫️ Eau trouble',cold:'🥶 Eau glacée'};
export const INCIDENTS={run:'🏃 Un enfant court au bord du bassin',buoy:'🛟 Bouée coincée dans le toboggan',shorts:'🩳 Un baigneur en short de ville !'};
const randomIn=r=>[r[0]+.7+Math.random()*(r[2]-r[0]-1.4),r[1]+.7+Math.random()*(r[3]-r[1]-1.4)];
const swimmersTotal=A=>Object.values(A.occ).reduce((a,b)=>a+b,0);
// Which basin a swimmer heads for: the ones watched and not full, those the camper's kind likes best.
function pickBasin(s,type){const g=guardedBasins(s),A=s.aqua,list=openBasins(s).filter(b=>g.has(b)&&(A.occ[b]??0)<BASINS[b].cap);if(!list.length)return null;
 const w=list.map(b=>(BASINS[b].who.includes(type)?3:1)*(1-.6*(A.occ[b]??0)/BASINS[b].cap));let r=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<list.length;i++){r-=w[i];if(r<=0)return list[i];}return list[0];}
function stepAqua(s,dt){if(s.replica||!s.unlocked.pool)return;const A=s.aqua,h=hourOf(s),day=isDay(s);
 A.occ={};for(const c of s.campers)if(c.act?.kind==='pool'&&c.act.step>=1&&c.act.b)A.occ[c.act.b]=(A.occ[c.act.b]??0)+1;for(const v of A.visitors)if(v.phase==='swim')A.occ[v.b]=(A.occ[v.b]??0)+1;
 const sw=swimmersTotal(A);
 if(s.unlocked.tech){const sea=seasonOf(s),amb=sea==='high'?.66:sea==='mid'?.5:.36,target=Math.min(1,amb+.18*lvl(s,'heating'));A.temp+=(target-A.temp)*dt*.02;A.ph=Math.min(1,A.ph+dt*.0003*(1+sw*.15));A.filter=Math.min(1,A.filter+dt*.0005*(1+sw*.4));}
 // Towels thrown on the loungers at dawn; the owners "come" after 2 pm and the towels are gone.
 if(day&&h>=7&&A.towelDay!==s.day){A.towelDay=s.day;const n=loungeCount(s),k=Math.ceil(Math.random()*.5*n);for(let i=0;i<k;i++){const j=Math.floor(Math.random()*n);if(A.lounge[j]===0)A.lounge[j]=1;}if(A.lounge.some(x=>x===1))popup(s,'🧺 Des serviettes ont été posées sur les transats dès l’aube…',LOUNGERS[0][0],LOUNGERS[0][1],'info');}
 if(h>=14)for(let i=0;i<A.lounge.length;i++)if(A.lounge[i]===1)A.lounge[i]=0;
 if(!day)for(let i=0;i<A.lounge.length;i++)if(A.lounge[i]===2)A.lounge[i]=0;
 // Incidents at the water's edge: someone must come and sort them out, or the swimmers are scared off.
 A.incTimer-=dt*(1+sw*.12);if(A.incTimer<=0&&day){A.incTimer=45+Math.random()*35;
  const bs=Object.keys(A.occ).filter(b=>A.occ[b]>0&&!A.incidents.some(i=>i.b===b));
  if(bs.length&&A.incidents.length<2){const b=pick(bs),B=BASINS[b],kind=b==='slides'&&Math.random()<.6?'buoy':Math.random()<.35?'shorts':'run',
   spot=kind==='shorts'?[B.gate[0],B.gate[1]]:kind==='buoy'?[B.rect[2]+.9,B.rect[3]]:[B.gate[0]+(Math.random()-.5)*(B.rect[2]-B.rect[0])*.6,B.gate[1]+.2];
   A.incidents.push({id:s.nextId++,b,kind,x:spot[0],z:spot[1],t:0,fix:0});popup(s,INCIDENTS[kind],spot[0],spot[1],'bad');}}
 for(const i of A.incidents){i.t+=dt;if(i.t>35){for(const c of s.campers)if(c.act?.kind==='pool'&&c.act.b===i.b&&c.act.step>=1)sad(c,6,'incident');s.rep=Math.max(0,s.rep-.1);popup(s,`😱 ${BASINS[i.b].name} : personne n’est intervenu`,i.x,i.z,'bad');i.dead=true;}}
 A.incidents=A.incidents.filter(i=>!i.dead&&i.fix<REPAIR);
 // Sanitary control: now and then an inspector takes a sample of the water.
 const C=A.ctrl;if(C.t>0){C.t-=dt;if(!C.why)C.why=waterIssue(s);if(C.t<=0){if(C.why){s.rep=Math.max(0,s.rep-.35);s.bills.push({id:s.nextId++,label:'Amende : contrôle de l’eau',amount:150,due:s.t+BILL_DELAY,late:false});popup(s,`🧪 Contrôle sanitaire raté : ${WATER_TEXT[C.why]}`,TECH.pos[0],TECH.pos[1],'bad');}
   else{s.money+=80;s.rep=Math.min(5,s.rep+.15);popup(s,'🧪 Contrôle sanitaire réussi : +80 $',TECH.pos[0],TECH.pos[1],'money');}C.why='';}}
 else if(day&&h>=11&&h<18&&C.day!==s.day&&s.arrivals>=8&&Math.random()<dt/80){C.t=20;C.day=s.day;C.why='';popup(s,'🧪 Contrôle sanitaire de l’eau !',TECH.pos[0],TECH.pos[1],'bad');}
 // Day-pass visitors from outside: they pay at the gate and swim like the campers do.
 const D=A.day;if(D.day!==s.day){D.day=s.day;D.count=0;}
 A.visT-=dt;if(D.quota>0&&day&&h>=13&&h<18&&D.count<D.quota&&A.visT<=0){A.visT=(36/D.quota)*(.6+Math.random()*.8);const b=pickBasin(s,'family');
  if(b){D.count++;A.visitors.push({id:s.nextId++,x:36,z:ROAD_Z,phase:'in',wp:0,b,t:0,look:Math.floor(Math.random()*6),heading:0,moving:true,speed:3.2});}}
 for(const v of A.visitors){const B=BASINS[v.b];
  if(v.phase==='in'){const path=[[34.8,-9.85],[B.gate[0],-9.85],B.gate];if(v.wp<path.length){if(move(v,path[v.wp],dt,.15))v.wp++;}
   else if((A.occ[v.b]??0)<B.cap&&guardedBasins(s).has(v.b)){const fee=D.price;s.money+=fee;s.today.revenue+=fee;popup(s,`🎟️ +${fee} $`,B.gate[0],B.gate[1]);v.phase='swim';v.t=8+Math.random()*3;[v.tx,v.tz]=randomIn(B.rect);A.occ[v.b]=(A.occ[v.b]??0)+1;s.pool.chlor=Math.max(0,s.pool.chlor-.005);}
   else{v.phase='out';}}
  else if(v.phase==='swim'){v.swim=move(v,[v.tx,v.tz],dt,.1)||true;v.t-=dt;if(v.t<=0){v.swim=false;v.phase='out';}}
  else{v.swim=false;const path=[B.gate,[B.gate[0],-9.85],[34.8,-9.85],[36,ROAD_Z]];v.out=v.out??0;if(v.out<path.length){if(move(v,path[v.out],dt,.2))v.out++;}else v.gone=true;}}
 A.visitors=A.visitors.filter(v=>!v.gone);
 // Spa sessions: the camper is inside, hidden, and comes out relaxed.
 for(const ses of A.spa.sessions){ses.t-=dt;if(ses.t<=0){const c=s.campers.find(x=>x.id===ses.id);if(c){c.away=false;c.x=SPA.door[0];c.z=SPA.door[1]+.2;c.act={kind:'back'};glad(c,10,'spa');}ses.done=true;}}
 A.spa.sessions=A.spa.sessions.filter(x=>!x.done);}

// ---- Classification: one to five stars. Each star has a list of criteria; asking for an inspection costs INSPECT_FEE. The inspector comes
// the next morning, walks about for INSPECT_LEN seconds and checks the camp as it is (clean toilets, paper, no rubbish, healthy pool, nothing
// broken). If everything holds he gives the highest star whose criteria are all met, one star at a time.
export const INSPECT_FEE=120,INSPECT_LEN=30,STAR_NAMES=['★','★★','★★★','★★★★','★★★★★'];
export const SERVICE_IDS=['laundry','wifi','bikes','playground','sports','shuttle'],BASIN_IDS=['pool','paddling','slides','lazy','lagoon'];
export const servicesCount=s=>SERVICE_IDS.filter(k=>s.unlocked[k]).length,basinCount=s=>BASIN_IDS.filter(k=>s.unlocked[k]).length;
export const STAR_RULES=[
 {star:1,label:'8 emplacements ouverts',ok:s=>openPitches(s)>=8},
 {star:1,label:'3 cabines de sanitaires',ok:s=>cabins(s)>=3},
 {star:2,label:'Épicerie et boulangerie',ok:s=>!!(s.unlocked.shop&&s.unlocked.bakery)},
 {star:2,label:'Accueil tenu par un réceptionniste',ok:s=>!!s.posts.reception},
 {star:2,label:'12 emplacements ouverts',ok:s=>openPitches(s)>=12},
 {star:3,label:'Piscine avec maître-nageur',ok:s=>!!(s.unlocked.pool&&s.unlocked.lifeguard)},
 {star:3,label:'Un service (laverie, wifi, vélos, jeux, navette)',ok:s=>servicesCount(s)>=1},
 {star:3,label:'Réputation de 3 ★',ok:s=>s.rep>=3},
 {star:3,label:'16 emplacements ouverts',ok:s=>openPitches(s)>=16},
 {star:4,label:'Centre aquatique : 3 bassins',ok:s=>basinCount(s)>=3},
 {star:4,label:'Club enfants et restaurant',ok:s=>!!(s.unlocked.kidsclub&&s.unlocked.resto)},
 {star:4,label:'Wifi et 3 services',ok:s=>!!s.unlocked.wifi&&servicesCount(s)>=3},
 {star:4,label:'Réputation de 3,8 ★',ok:s=>s.rep>=3.8},
 {star:4,label:'6 cabines de sanitaires',ok:s=>cabins(s)>=6},
 {star:4,label:'3 locatifs',ok:s=>s.rent.filter(r=>r.tier).length>=3},
 {star:5,label:'Espace bien-être (spa)',ok:s=>!!s.unlocked.spa},
 {star:5,label:'Centre aquatique : 5 bassins',ok:s=>basinCount(s)>=5},
 {star:5,label:'Les 6 services',ok:s=>servicesCount(s)>=6},
 {star:5,label:'Réputation de 4,4 ★',ok:s=>s.rep>=4.4},
 {star:5,label:'8 cabines de sanitaires',ok:s=>cabins(s)>=8},
 {star:5,label:'Un locatif Premium ou une cabane',ok:s=>s.rent.some(r=>r.tier==='premium'||r.tier==='cabane')}];
// The highest star whose criteria, and those of every star below it, are all met.
export const starsReady=s=>{let n=0;for(let k=1;k<=5;k++){if(STAR_RULES.filter(r=>r.star===k).every(r=>r.ok(s)))n=k;else break;}return n;};
// What the inspector sees right now; returns what is wrong, or ''.
export function inspectProblem(s){if(s.sanit.paper<2)return 'plus de papier aux sanitaires';if(s.sanit.dirt>.55)return 'sanitaires sales';
 if(s.pitches.reduce((n,p)=>n+p.trash,0)>2)return 'sacs-poubelle qui traînent';if(s.unlocked.pool&&s.pool.chlor<.4)return 'eau de la piscine douteuse';if(s.event)return 'une panne non réparée';return '';}
function stepInspect(s,dt){const I=s.inspect;if(s.replica)return;
 if(I.state==='asked'&&s.day>I.day&&isDay(s)&&hourOf(s)>=10){I.state='on';I.t=INSPECT_LEN;I.why='';popup(s,'🧑‍⚕️ L’inspecteur est là !',DESK[0],DESK[1],'bad');}
 else if(I.state==='on'){I.t-=dt;if(!I.why)I.why=inspectProblem(s);
  if(I.t<=0){const ready=starsReady(s);I.state='idle';I.next=s.day+3;
   if(!I.why&&ready>s.stars){s.stars=Math.min(5,s.stars+1);s.rep=Math.min(5,s.rep+.3);popup(s,`🎉 Classement : ${STAR_NAMES[s.stars-1]} !`,DESK[0],DESK[1],'money');}
   else if(!I.why)popup(s,'📋 Inspection : rien de nouveau à classer',DESK[0],DESK[1],'info');
   else{s.rep=Math.max(0,s.rep-.2);popup(s,`📋 Inspection ratée : ${I.why}`,DESK[0],DESK[1],'bad');}}}}
// ---- The director's choices (price, overbooking, promotion, inspection). Every player has the same rights.
export function manage(s,a,k,n){const P=s.pricing;n=Number(n);
 if(a==='price'&&['tent','caravan','mobil','low','high'].includes(k)&&Number.isFinite(n)){P[k]=clamp(Math.round(n*20)/20,.6,1.8);return true;}
 if(a==='overbook'&&Number.isFinite(n)){P.overbook=clamp(Math.round(n/5)*5,0,40);return true;}
 if(a==='promo'){if(s.promo>0||s.money<30)return false;s.money-=30;s.promo=2;popup(s,'📣 Promotion de dernière minute : −20 % pendant 2 jours',s.player.x,s.player.z,'info');return true;}
 if(a==='restrict'){s.water.ban=!s.water.ban;popup(s,s.water.ban?'🚰 Restrictions d’eau : douches courtes':'🚰 Restrictions levées',s.player.x,s.player.z,'info');return true;}
 if(a==='sell'){const R=s.rent[n];if(!R?.tier||s.pitches[RENTAL_PITCH[n]].by!=null)return false;s.money+=resaleValue(R);popup(s,`💰 ${TIERS[R.tier].name} revendu`,s.player.x,s.player.z,'money');s.rent[n]={tier:null,cond:100,broken:null,t:0,fixp:0};return true;}
 if(a==='renovate'){const R=s.rent[n],c=R?.tier?renovateCost(R):0;if(!R?.tier||R.cond>=100||s.money<c)return false;s.money-=c;R.cond=100;R.broken=null;return true;}
 if(a==='buyused'){const i=freeRental(s),c=TIERS[k]?Math.round(TIERS[k].price*.6):0;if(i<0||!c||s.money<c)return false;s.money-=c;s.rent[i]={tier:k,cond:55,broken:null,t:0,fixp:0};return true;}
 if(a==='loan'){const v=Math.min(Math.floor(n),loanLimit(s)-s.debt);if(!(v>0))return false;s.debt+=v;s.money+=v;return true;}
 if(a==='repay'){const v=Math.min(Math.floor(n),Math.ceil(s.debt),Math.floor(s.money));if(!(v>0))return false;s.money-=v;s.debt=Math.max(0,s.debt-v);return true;}
 if(a==='sublet'){const o=s.owners[n];if(!o?.on)return false;o.sublet=!o.sublet;return true;}
 if(a==='daypass'){const D=s.aqua.day;if(k==='price'&&Number.isFinite(n)){D.price=clamp(Math.round(n),2,25);return true;}if(k==='quota'&&Number.isFinite(n)){D.quota=clamp(Math.round(n/5)*5,0,40);return true;}return false;}
 if(a==='classify'){const I=s.inspect;if(I.state!=='idle'||s.day<I.next||s.money<INSPECT_FEE||starsReady(s)<=s.stars)return false;s.money-=INSPECT_FEE;I.state='asked';I.day=s.day;popup(s,'📋 Inspection demandée pour demain matin',DESK[0],DESK[1],'info');return true;}
 return false;}

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
 stepDay(s,dt);stepOven(s,dt);stepShuttle(s,dt);stepAqua(s,dt);stepRentals(s,dt);stepResources(s,dt);stepInspect(s,dt);stepWork(s,dt);stepEvents(s,dt);stepShow(s,dt);stepSpawn(s,dt);stepCampers(s,dt);
 if(s.popups.length){let old=false;for(const pp of s.popups){pp.t+=dt;if(pp.t>=1.6)old=true;}if(old)s.popups=s.popups.filter(pp=>pp.t<1.6);}}

export function loadCamping(json){const o=typeof json==='string'?JSON.parse(json):json;if(!o||o.game!==GAME||o.schema!==SAVE_SCHEMA||!o.player||!Array.isArray(o.campers))throw Error('Sauvegarde illisible.');
 o.popups=[];return fill(o);}
