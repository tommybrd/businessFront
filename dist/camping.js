import {createCamping,stepCamping,loadCamping,visibleUnlocks,avgMood,traffic,MISSIONS,missionsFor,assignMission,PICKABLE,setPick,emptyHands,guestOf,addGuest,removeGuest,guestInput,ITEMS,hourOf,isDay,billsDue,occupied,openPitches,starsOf,SHOWS,PATIENCE} from './camping-engine.js';
import {createCampingScene} from './camping-scene.js';
import {hostRoom,joinRoom,cleanCode,netError} from './arcade-net.js';
import {mountCompanies} from './companies.js';

// Input (keyboard + touch joystick), HUD and local save of the campsite.
const KEY='flux-camping-v1',$=id=>document.getElementById(id),phone=matchMedia('(max-width:600px)');
let state;try{state=loadCamping(localStorage.getItem(KEY));}catch{state=createCamping();}
const scene=createCampingScene($('arcade'),()=>state);
mountCompanies('camping',$('dock'));
// Network play: `net` is null alone, {role:'host',room,seen} when others play in this campsite, {role:'guest',room,me,solo} when
// this screen plays in someone else's (then `state` is a copy of the host's game, refreshed several times a second).
let net=null;const guest=()=>net?.role==='guest',me=()=>guest()?guestOf(state,net.me)??{carry:[],x:0,z:0}:state.player;
const doEmpty=()=>{if(guest())net.room.send({t:'empty'});emptyHands(state,me());},doPick=(k,on)=>{if(guest())net.room.send({t:'pick',k,on});setPick(state,k,on,me());};
const keys=new Set(),stick={x:0,z:0,active:false,ox:0,oy:0,id:null};
const DIRS={z:[0,-1],w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],q:[-1,0],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
addEventListener('keydown',e=>{const k=e.key.toLowerCase(),tag=document.activeElement?.tagName;if(/INPUT|TEXTAREA/.test(tag))return;if(k==='x'&&!e.repeat&&tag!=='SELECT'){doEmpty();return;}if(DIRS[k]){keys.add(k);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
const canvas=$('arcade'),base=$('stick'),knob=$('knob');
canvas.addEventListener('pointerdown',e=>{stick.active=true;stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.z=0;canvas.setPointerCapture(e.pointerId);base.style.left=e.clientX+'px';base.style.top=e.clientY+'px';base.hidden=false;knob.style.transform='translate(-50%,-50%)';});
canvas.addEventListener('pointermove',e=>{if(!stick.active||e.pointerId!==stick.id)return;const dx=e.clientX-stick.ox,dy=e.clientY-stick.oy,d=Math.hypot(dx,dy),m=Math.min(d,48),ux=d?dx/d:0,uy=d?dy/d:0;stick.x=ux*m/48;stick.z=uy*m/48;knob.style.transform=`translate(calc(-50% + ${ux*m}px),calc(-50% + ${uy*m}px))`;});
const end=e=>{if(e.pointerId!==stick.id)return;stick.active=false;stick.x=stick.z=0;base.hidden=true;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
// Screen directions turned into ground directions: the camera looks down from the front, turned by atan(6/15) to the right.
const YAW=Math.atan2(6,15),CY=Math.cos(YAW),SY=Math.sin(YAW);
function input(){let x=stick.x,z=stick.z;for(const k of keys){x+=DIRS[k][0];z+=DIRS[k][1];}return {x:x*CY+z*SY,z:-x*SY+z*CY};}
function hint(){const s=state,p=me(),u=visibleUnlocks(s),queue=s.campers.some(c=>c.phase==='queue');
 if(s.arrivals===0&&!queue&&!p.carry.length)return 'Les premiers campeurs arrivent vers midi : attendez-les sur le carré bleu 🛎️ derrière l’accueil';
 if(queue&&!s.posts.reception&&s.arrivals<4)return 'Restez sur le carré bleu 🛎️ derrière l’accueil pour enregistrer les campeurs';
 if(s.piles[0]>0&&s.arrivals<4)return 'Ramassez l’argent 💵 sur le carré vert, à côté de l’accueil';
 if(s.campers.some(c=>c.blocked&&c.phase==='queue'))return 'Un emplacement est sale : ramassez les sacs 🗑️ devant, puis jetez-les dans la benne verte';
 if(p.carry.includes('trash'))return 'Portez les sacs jusqu’à la benne 🚛 à l’entrée, côté épicerie';
 if(s.sanit.paper<2)return 'Plus de papier aux sanitaires : prenez des rouleaux 🧻 à la réserve, puis posez-les devant les WC';
 if(s.show.state==='call')return `Soirée « ${SHOWS[s.show.kind]} » : montez sur la scène 🎤`;
 if(s.event)return s.event.label+' — allez sur le carré rouge';
 if(s.bills.some(b=>b.late)||(s.bills.length&&s.money>=s.bills[0].amount&&s.bills[0].due-s.t<60))return 'Payez vos factures au bureau 🧾 près de l’accueil';
 if(s.pitches.some(q=>q.noisy))return 'Des campeurs font la fête : allez leur dire « chut ! » devant leur emplacement 🤫';
 if(u.length&&s.money>=Math.min(...u.map(x=>x.price-(s.paid[x.key]??0))))return 'Marchez sur une zone en pointillé pour la débloquer';return '';}
// Team panel: one row per staff member with a mission picker; rebuilt only when the team or the choices change.
let teamKey='';function renderTeam(){const key=state.helpers.map(h=>h.id+h.loop+missionsFor(state,h).length).join();if(key===teamKey)return;teamKey=key;const list=$('teamlist');list.textContent='';
 for(const h of state.helpers){const row=document.createElement('div');row.className='worker';const ico=document.createElement('span');ico.className='ico';ico.textContent='👷';const name=document.createElement('b');name.textContent=h.name;
  const sel=document.createElement('select');sel.id='mission-'+h.id;sel.setAttribute('aria-label','Mission de '+h.name);for(const m of missionsFor(state,h)){const o=document.createElement('option');o.value=m.id;o.textContent=m.icon+'  '+m.label;o.selected=m.id===h.loop;sel.append(o);}
  sel.onchange=()=>{if(guest())net.room.send({t:'mission',id:h.id,loop:sel.value});assignMission(state,h.id,sel.value);teamKey='';renderTeam();};row.append(ico,name,sel);list.append(row);}
 for(const [k,label] of [['reception','Réceptionniste'],['shop','Épicier'],['stage','Animateur']])if(state.posts[k]){const row=document.createElement('div');row.className='worker';const ico=document.createElement('span');ico.className='ico';ico.textContent='🧑‍💼';const name=document.createElement('b');name.textContent=label;const sm=document.createElement('small');sm.textContent='tient son poste toute la journée';row.append(ico,name,sm);list.append(row);}}
$('team').addEventListener('click',()=>{$('teampanel').hidden=!$('teampanel').hidden;$('handspanel').hidden=$('reviewspanel').hidden=true;scene.setShowMissions(!$('teampanel').hidden);teamKey='';renderTeam();});$('teamclose').addEventListener('click',()=>{$('teampanel').hidden=true;scene.setShowMissions(false);});
// Hands panel: empty the stack in one tap, and choose which kinds of goods the player picks up while walking.
const PICK_ICON={paper:'🧻',bread:'🥖',ice:'🍦',chlor:'🧪',trash:'🗑️'};
function renderPicks(){const box=$('picks');box.textContent='';const pick=me().pick??{};let off=0;
 for(const k of PICKABLE){const on=pick[k]!==false;if(!on)off++;const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',on);b.title=(on?'Ne plus ramasser : ':'Ramasser : ')+ITEMS[k].name;b.innerHTML=`${PICK_ICON[k]}<small></small>`;b.querySelector('small').textContent=ITEMS[k].name;b.onclick=()=>{doPick(k,!on);renderPicks();};box.append(b);}
 $('hands').classList.toggle('filtered',off>0);$('hands').textContent=off===PICKABLE.length?'✋ Rien':off?'✋ Filtre':phone.matches?'✋':'✋ Mains';}
const labels=()=>{$('reviews').textContent=phone.matches?'📖':'📖 Avis';$('team').textContent=phone.matches?'👷':'👷 Équipe';renderPicks();};
$('hands').addEventListener('click',()=>{$('handspanel').hidden=!$('handspanel').hidden;$('teampanel').hidden=$('reviewspanel').hidden=true;scene.setShowMissions(false);renderPicks();});$('handsclose').addEventListener('click',()=>$('handspanel').hidden=true);
$('empty').addEventListener('click',doEmpty);$('pickall').addEventListener('click',()=>{doPick('all');renderPicks();});$('picknone').addEventListener('click',()=>{doPick('none');renderPicks();});
labels();phone.addEventListener?.('change',labels);
// Guest book: the latest reviews left by campers when they leave.
let reviewKey='';function renderReviews(){const s=state,key=JSON.stringify(s.reviews.slice(0,3))+s.reviews.length;if(key===reviewKey)return;reviewKey=key;const list=$('reviewlist');list.textContent='';
 $('reviewsum').textContent=s.reviews.length?`Note moyenne du camping : ★ ${s.rep.toFixed(1)} sur 5 · ${s.reviews.length} dernier${s.reviews.length>1?'s':''} avis`:'Pas encore d’avis : ils arrivent quand les premiers campeurs repartent.';
 for(const r of s.reviews){const d=document.createElement('div');d.className='rev'+(r.stars<=2?' bad':'');const st=document.createElement('b');st.textContent='★'.repeat(r.stars)+'☆'.repeat(5-r.stars);const tx=document.createElement('span');tx.textContent='« '+r.text+' »';const w=document.createElement('small');w.textContent=` ${r.icon} ${r.who} · jour ${r.day}`;d.append(st,tx,document.createElement('br'),w);list.append(d);}}
$('reviews').addEventListener('click',()=>{$('reviewspanel').hidden=!$('reviewspanel').hidden;$('teampanel').hidden=$('handspanel').hidden=true;scene.setShowMissions(false);reviewKey='';renderReviews();});$('reviewsclose').addEventListener('click',()=>$('reviewspanel').hidden=true);
let last=performance.now(),saveAt=0,hudAt=0;
const save=()=>{if(guest())return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;
 // A guest moves its own character and lets the copy of the host's game run on between two refreshes.
 if(guest()){if(state.replica){const g=guestOf(state,net.me);if(g)g.input=input();try{stepCamping(state,dt);}catch{leave('La partie a été interrompue.');}}}else{stepCamping(state,dt,input());if(net)share(now);}
 scene.update(dt);
 if(now-hudAt>150){hudAt=now;const s=state;$('money').textContent=Math.floor(s.money).toLocaleString('fr-FR')+' $';$('cashwait').textContent=Math.round(s.piles[0]+s.piles[1]).toLocaleString('fr-FR')+' $';$('pitches').textContent=occupied(s)+'/'+openPitches(s);
  $('traffic').textContent='×'+traffic(s).toFixed(1);$('rep').textContent='★ '+s.rep.toFixed(1);const m=avgMood(s);$('mood').textContent=m==null?'—':Math.round(m)+' %';const f=m==null?0:m/100;$('gauge').style.width=(f*100)+'%';$('gauge').style.background=f>.6?'#4fbf5a':f>.35?'#f0a830':'#e8483a';
  $('lost').textContent=s.lost+(s.lost>1?' partis':' parti');$('hint').textContent=hint();$('hint').hidden=!$('hint').textContent;$('team').hidden=!s.helpers.length&&!Object.keys(s.posts).length;hud2();if(net)renderMulti();if(!$('teampanel').hidden&&document.activeElement?.tagName!=='SELECT')renderTeam();if(!$('reviewspanel').hidden)renderReviews();}
 if(now-saveAt>3000){saveAt=now;save();}requestAnimationFrame(frame);}
// Clock, bills, current event and the report of the day that just ended.
let reportKey='';function hud2(){const s=state,h=hourOf(s)%24,hh=Math.floor(h),mm=Math.floor((h-hh)*6)*10;$('clock').textContent=`${isDay(s)?(phone.matches?'':'🕐 '):'🌙 '}${hh}:${String(mm).padStart(2,'0')}`;$('day').textContent=`Jour ${s.day}${isDay(s)?'':' · nuit'}`;
 const nb=s.bills.length,late=s.bills.some(b=>b.late);$('billchip').hidden=!nb;$('billchip').classList.toggle('late',late);$('bills').textContent=`🧾 ${billsDue(s).toLocaleString('fr-FR')} $${late?' ⚠️':''}`;
 const ev=s.event;$('event').hidden=!ev;if(ev)$('event').textContent=ev.label;
 const r=$('report'),L=s.lastDay,show=s.report>0&&L;r.hidden=!show;if(show){const key=JSON.stringify(L);if(key!==reportKey){reportKey=key;r.textContent='';const h2=document.createElement('h2');h2.textContent=`Bilan du jour ${L.day}`;const dl=document.createElement('dl');
  for(const [k,v] of [['Recettes',`${Math.round(L.revenue).toLocaleString('fr-FR')} $`],['Arrivées',L.arrivals],['Départs',L.departures],['Note des départs',L.stars?`★ ${L.stars.toFixed(1)}`:'—'],['Problèmes réglés',L.fixed],['Campeurs repartis fâchés',L.lost],['Factures payées',`${Math.round(L.bills).toLocaleString('fr-FR')} $`]]){const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v;dl.append(dt,dd);}r.append(h2,dl);}}}
const fmt=v=>Math.round(v).toLocaleString('fr-FR')+' $';void fmt;void starsOf;void PATIENCE;
// Two taps to restart (no browser dialog, which embedded pages cannot show).
const resetLabel=()=>phone.matches?'↺':'↺ Recommencer';$('reset').textContent=resetLabel();phone.addEventListener?.('change',()=>{if(!armed)$('reset').textContent=resetLabel();});
let armed=0;$('reset').addEventListener('click',()=>{const b=$('reset');if(performance.now()-armed>3000){armed=performance.now();b.textContent=phone.matches?'Encore ?':'Touchez encore pour recommencer';setTimeout(()=>{if(performance.now()-armed>=2900){armed=0;b.textContent=resetLabel();}},3000);return;}armed=0;b.textContent=resetLabel();state=createCamping();scene.reset();try{localStorage.removeItem(KEY);}catch{}});
// ---- Network play -------------------------------------------------------------------------------------------------------------
// The host's game is the only real one: it sends its whole state to the guests ten times a second; guests send back their stick,
// where they stand, and what they do with their hands or the team. Guests do not save.
const STILL={x:0,z:0},status=t=>{$('mstatus').textContent=t??'';},busy=on=>{$('mhost').disabled=$('mjoin').disabled=on;};
const myName=()=>($('mname').value.trim()||'Joueur').slice(0,12);
let sentAt=0;function share(now){if(net.room.size&&now-sentAt>=100){sentAt=now;net.room.broadcast('{"t":"s","s":'+JSON.stringify(state)+'}');}}
let multiKey='';function renderMulti(){const h=net?.role==='host',g=guest(),n=net?1+state.guests.length:0,key=[net?.role,net?.me,phone.matches,state.player.name,...(net?state.guests.map(a=>a.id+a.name):[])].join('|');if(key===multiKey)return;multiKey=key;
 $('mp-idle').hidden=!!net;$('mp-host').hidden=!h;$('mp-guest').hidden=!g;$('reset').hidden=!!net;$('multi').textContent='👥'+(n?' '+n:phone.matches?'':' Multi');$('multi').classList.toggle('on',!!net);
 if(!net)return;if(h)$('mshare').textContent=net.room.code;const list=$(h?'mplayers':'mplayers2');list.textContent='';
 const add=t=>{const li=document.createElement('li');li.textContent=t;list.append(li);};add(h?'Vous · hôte':(state.player.name||'Hôte')+' · hôte');for(const a of state.guests)add(a.id===net.me?a.name+' · vous':a.name);}
async function startHost(){busy(true);status('Ouverture de la partie…');
 try{const seen=new Map(),room=await hostRoom({
   onJoin(id,meta){if(!addGuest(state,id,meta?.name))return false;seen.set(id,performance.now());},
   onMessage(id,m){const g=guestOf(state,id);if(!g)return;seen.set(id,performance.now());
    if(m.t==='in')guestInput(state,id,m);else if(m.t==='pick'&&typeof m.k==='string')setPick(state,m.k,!!m.on,g);else if(m.t==='empty')emptyHands(state,g);else if(m.t==='mission'&&typeof m.loop==='string')assignMission(state,m.id,m.loop);},
   onLeave(id){seen.delete(id);removeGuest(state,id);}},'camping');
  state.player.name=myName();net={role:'host',room,seen};status('');}catch(e){status(netError(e));}
 busy(false);renderMulti();}
function stopHost(){if(net?.role!=='host')return;for(const g of [...state.guests])removeGuest(state,g.id);net.room.close();delete state.player.name;net=null;status('');renderMulti();}
async function startJoin(){const code=cleanCode($('mcode').value);if(code.length<5){status('Le code fait 5 lettres ou chiffres.');return;}busy(true);status('Connexion…');save();
 const ses={role:'guest',room:null,me:null,solo:state,heard:performance.now(),full:false};
 try{ses.room=await joinRoom(code,{name:myName()},{onMessage:m=>fromHost(ses,m),onClose:()=>{if(net===ses)leave('Connexion perdue.');}},'camping');net=ses;status('');if(ses.full)leave('Cette partie est complète.');}catch(e){status(netError(e));}
 busy(false);renderMulti();}
function fromHost(ses,m){if(m.t==='hi'&&typeof m.id==='string'){ses.me=m.id;scene.setFocus(ses.me);return;}if(m.t==='no'){ses.full=true;if(net===ses)leave('Cette partie est complète.');return;}
 const ns=m.s;if(m.t!=='s'||net!==ses||!ses.me||!ns||typeof ns!=='object'||ns.game!=='camping'||!ns.player||!Array.isArray(ns.guests)||!Array.isArray(ns.pitches)||!Array.isArray(ns.campers)||!Array.isArray(ns.helpers))return;ses.heard=performance.now();ns.replica=true;
 // This player's own character stays where this screen shows it (the host follows it), unless the two have drifted far apart.
 const now=ns.guests.find(g=>g.id===ses.me),was=state.replica?guestOf(state,ses.me):null;if(now&&was&&Math.hypot(now.x-was.x,now.z-was.z)<4){now.x=was.x;now.z=was.z;now.heading=was.heading;now.moving=was.moving;now.input=was.input;}
 const first=!state.replica;if(first)scene.reset();state=ns;if(first){teamKey=reviewKey='';renderPicks();for(const id of ['reviewspanel','teampanel'])$(id).hidden=true;scene.setShowMissions(false);}}
function leave(msg){const ses=net;if(ses?.role!=='guest')return;net=null;ses.room.close();state=ses.solo;scene.setFocus(null);scene.reset();teamKey=reviewKey='';renderPicks();status(msg);renderMulti();if(msg)$('multipanel').hidden=false;}
// Several times a second, even when the page is in the background (where frames stop): a guest reports its stick and position;
// the host keeps the campsite running for the others and lets go of guests it no longer hears.
setInterval(()=>{if(!net)return;const now=performance.now();
 if(guest()){const g=guestOf(state,net.me);if(g){if(document.hidden)g.input=STILL;net.room.send({t:'in',ix:g.input.x,iz:g.input.z,x:g.x,z:g.z,h:g.heading});}if(now-net.heard>15000)leave('Connexion perdue.');return;}
 for(const [id,t] of net.seen)if(now-t>15000){net.seen.delete(id);net.room.kick(id);}
 if((document.hidden||now-last>250)&&net.room.size){const inp=document.hidden?STILL:input();let el=Math.min(2,(now-last)/1000);last=now;while(el>1e-3){const d=Math.min(.1,el);stepCamping(state,d,inp);el-=d;}share(now);}},80);
try{$('mname').value=localStorage.getItem(KEY+'-name')??localStorage.getItem('flux-arcade-v1-name')??'';}catch{}$('mname').addEventListener('change',()=>{try{localStorage.setItem(KEY+'-name',myName());}catch{}});
$('multi').addEventListener('click',()=>{$('multipanel').hidden=!$('multipanel').hidden;$('teampanel').hidden=$('handspanel').hidden=$('reviewspanel').hidden=true;scene.setShowMissions(false);});$('multiclose').addEventListener('click',()=>$('multipanel').hidden=true);
for(const id of ['reviews','hands','team'])$(id).addEventListener('click',()=>$('multipanel').hidden=true);
$('mhost').addEventListener('click',startHost);$('mjoin').addEventListener('click',startJoin);$('mstop').addEventListener('click',stopHost);$('mleave').addEventListener('click',()=>leave(''));
$('mcode').addEventListener('keydown',e=>{if(e.key==='Enter')startJoin();});
$('mcopy').addEventListener('click',()=>{const link=location.origin+location.pathname+'?join='+net.room.code;(navigator.clipboard?.writeText(link)??Promise.reject()).then(()=>status('Lien copié ✔'),()=>status(link));});
phone.addEventListener?.('change',renderMulti);renderMulti();
// A link ending in ?join=CODE opens the panel with the code filled in.
{const code=cleanCode(new URLSearchParams(location.search).get('join'));if(code){$('mcode').value=code;$('multipanel').hidden=false;status('Entrez votre prénom, puis touchez Rejoindre.');}}
addEventListener('pagehide',()=>{save();net?.room.close();});
window.__camping={get state(){return state},get net(){return net},scene,step:(dt,i)=>stepCamping(state,dt,i)};
requestAnimationFrame(frame);
