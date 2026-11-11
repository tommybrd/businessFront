import {createArcade,stepArcade,loadArcade,visibleUnlocks,traffic,avgWait,PATIENCE,MISSIONS,missionsFor,assignMission,PICKABLE,setPick,emptyHands,guestOf,addGuest,removeGuest,guestInput,ITEMS,hourOf,isOpen,billsDue,bankAction,loanLimit,STOCKS,portfolio,wallet,SAVINGS_RATE,LOAN_RATE} from './arcade-engine.js';
import {createArcadeScene} from './arcade-scene.js';
import {hostRoom,joinRoom,cleanCode,netError} from './arcade-net.js';
import {mountCompanies} from './companies.js';

// Input (keyboard + touch joystick), HUD and local save of the arcade alpha.
const KEY='flux-arcade-v1',$=id=>document.getElementById(id);
let state;try{state=loadArcade(localStorage.getItem(KEY));}catch{state=createArcade();}
const scene=createArcadeScene($('arcade'),()=>state);
mountCompanies('arcade',$('dock'));
// Network play: `net` is null alone, {role:'host',room,seen} when others play in this restaurant, {role:'guest',room,me,solo} when
// this screen plays in someone else's (then `state` is a copy of the host's game, refreshed several times a second).
let net=null;const guest=()=>net?.role==='guest',me=()=>guest()?guestOf(state,net.me)??{carry:[],x:0,z:0}:state.player;
// What this player does with their hands: done here at once, and sent to the host when the game is theirs.
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
function hint(){const p=me(),u=visibleUnlocks(state);if(state.served===0&&!p.carry.length)return 'Marchez sur le champ pour récolter les pommes de terre 🥔';if(p.carry.includes('potato'))return 'Déposez-les sur le tapis orange devant la friteuse';if(p.carry.includes('fries'))return 'Prenez les frites sur le tapis vert, puis posez-les sur le tapis orange derrière le comptoir';if(state.customers.length&&!state.cashiers[0]&&state.served<3)return 'Allez sur le carré bleu derrière la caisse pour servir, puis ramassez l’argent 💵';if(state.unlocked.megaphone&&state.rushCool<=0&&state.customers.length<4)return 'Montez sur le mégaphone 📣 près de l’entrée pour lancer un rush de clients';if(state.bills.some(b=>b.late)||(state.bills.length&&state.money>=state.bills[0].amount&&state.bills[0].due-state.t<60))return 'Payez vos factures au bureau 🧾 à droite du comptoir';if(state.event?.kind==='panne')return 'Une machine est en panne : restez à côté pour la réparer 🔧';if(u.length&&state.money>=Math.min(...u.map(x=>x.price-(state.paid[x.key]??0))))return 'Marchez sur une zone en pointillé pour la débloquer';return '';}
// Team panel: one row per employee or robot with a mission picker; rebuilt only when the team or the choices change.
let teamKey='';function renderTeam(){const key=state.helpers.map(h=>h.id+h.loop+missionsFor(state,h).length).join();if(key===teamKey)return;teamKey=key;const list=$('teamlist');list.textContent='';
 for(const h of state.helpers){const row=document.createElement('div');row.className='worker';const ico=document.createElement('span');ico.className='ico';ico.textContent=h.robot?'🤖':'👷';const name=document.createElement('b');name.textContent=h.name;
  const sel=document.createElement('select');sel.id='mission-'+h.id;sel.setAttribute('aria-label','Mission de '+h.name);for(const m of missionsFor(state,h)){const o=document.createElement('option');o.value=m.id;o.textContent=m.icon+'  '+m.label;o.selected=m.id===h.loop;sel.append(o);}
  sel.onchange=()=>{if(guest())net.room.send({t:'mission',id:h.id,loop:sel.value});assignMission(state,h.id,sel.value);teamKey='';renderTeam();};row.append(ico,name,sel);list.append(row);}}
$('team').addEventListener('click',()=>{$('teampanel').hidden=!$('teampanel').hidden;$('handspanel').hidden=$('bankpanel').hidden=true;scene.setShowMissions(!$('teampanel').hidden);teamKey='';renderTeam();});$('teamclose').addEventListener('click',()=>{$('teampanel').hidden=true;scene.setShowMissions(false);});
// Hands panel: empty the stack in one tap, and choose which kinds of goods the player picks up while walking.
const PICK_ICON={potato:'🥔',fries:'🍟',raw:'🥩',steak:'🍖',burger:'🍔',cup:'🥛',soda:'🥤',beef:'🐄',milk:'🍼',icecream:'🍦',tray:'🍽️'};
function renderPicks(){const box=$('picks');box.textContent='';const pick=me().pick??{};let off=0;
 for(const k of PICKABLE){const on=pick[k]!==false;if(!on)off++;const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',on);b.title=(on?'Ne plus ramasser : ':'Ramasser : ')+ITEMS[k].name;b.innerHTML=`${PICK_ICON[k]}<small></small>`;b.querySelector('small').textContent=ITEMS[k].name;b.onclick=()=>{doPick(k,!on);renderPicks();};box.append(b);}
 $('hands').classList.toggle('filtered',off>0);$('hands').textContent=off===PICKABLE.length?'✋ Rien':off?'✋ Filtre':'✋ Mains';}
$('hands').addEventListener('click',()=>{$('handspanel').hidden=!$('handspanel').hidden;$('teampanel').hidden=$('bankpanel').hidden=true;scene.setShowMissions(false);renderPicks();});$('handsclose').addEventListener('click',()=>$('handspanel').hidden=true);
$('empty').addEventListener('click',doEmpty);$('pickall').addEventListener('click',()=>{doPick('all');renderPicks();});$('picknone').addEventListener('click',()=>{doPick('none');renderPicks();});
renderPicks();
let last=performance.now(),saveAt=0,hudAt=0;
const save=()=>{if(guest())return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;
 // A guest moves its own character and lets the copy of the host's game run on between two refreshes.
 if(guest()){if(state.replica){const g=guestOf(state,net.me);if(g)g.input=input();try{stepArcade(state,dt);}catch{leave('La partie a été interrompue.');}}}else{stepArcade(state,dt,input());if(net)share(now);}
 scene.update(dt);
 if(now-hudAt>150){hudAt=now;$('money').textContent=Math.floor(state.money).toLocaleString('fr-FR')+' $';$('cashwait').textContent=Math.round(state.piles.reduce((a,b)=>a+b,0)).toLocaleString('fr-FR')+' $';$('served').textContent=state.served;$('traffic').textContent='×'+traffic(state).toFixed(1)+(state.rush>0?' 🔥':'');$('rep').textContent='★ '+state.rep.toFixed(1);const w=avgWait(state),f=Math.min(1,w/PATIENCE);$('wait').textContent=Math.round(w)+' s'+(phone.matches?'':' / '+PATIENCE+' s');$('gauge').style.width=(f*100)+'%';$('gauge').style.background=f<.4?'#4fbf5a':f<.7?'#f0a830':'#e8483a';$('lost').textContent=state.lost+(state.lost>1?' partis':' parti');$('hint').textContent=hint();$('hint').hidden=!$('hint').textContent;$('team').hidden=!state.helpers.length;hud2();$('safewait').textContent=state.unlocked.safe?` · 🔐 ${Math.round(state.safe).toLocaleString('fr-FR')} $`:'';$('bankbtn').hidden=!state.unlocked.bank||guest();if(net)renderMulti();if(!$('bankpanel').hidden)renderBank();if(!$('teampanel').hidden&&document.activeElement?.tagName!=='SELECT')renderTeam();}
 if(now-saveAt>3000){saveAt=now;save();}requestAnimationFrame(frame);}
// Clock, bills, current event and the report of the day that just ended.
let reportKey='';function hud2(){const s=state,h=hourOf(s)%24,hh=Math.floor(h),mm=Math.floor((h-hh)*6)*10;$('clock').textContent=`${isOpen(s)?(phone.matches?'':'🕐 '):'🌙 '}${hh}:${String(mm).padStart(2,'0')}`;$('day').textContent=`Jour ${s.day}${isOpen(s)?'':' · fermé'}`;
 const nb=s.bills.length,late=s.bills.some(b=>b.late);$('billchip').hidden=!nb;$('billchip').classList.toggle('late',late);$('bills').textContent=`🧾 ${billsDue(s).toLocaleString('fr-FR')} $${late?' ⚠️':''}`;
 const ev=s.event;$('event').hidden=!ev;if(ev)$('event').textContent=ev.kind==='panne'?ev.label:ev.label+(ev.t?` · ${Math.ceil(ev.t)} s`:'');
 const r=$('report'),L=s.lastDay,show=s.report>0&&L;r.hidden=!show;if(show){const key=JSON.stringify(L);if(key!==reportKey){reportKey=key;r.textContent='';const h2=document.createElement('h2');h2.textContent=`Bilan du jour ${L.day}`;const dl=document.createElement('dl');
  for(const [k,v] of [['Recettes',`${Math.round(L.revenue).toLocaleString('fr-FR')} $`],['Clients servis',L.served],['Servis vite ⚡ (+10 %)',L.tips??0],['Clients partis',L.lost],['Factures payées',`${Math.round(L.bills).toLocaleString('fr-FR')} $`]]){const dt=document.createElement('dt');dt.textContent=k;const dd=document.createElement('dd');dd.textContent=v;dl.append(dt,dd);}r.append(h2,dl);}}}
// Bank panel: savings, loan and shares; rebuilt when the figures change, buttons call the engine.
const fmt=v=>Math.round(v).toLocaleString('fr-FR')+' $';let bankKey='';
function btn(label,fn,ok=true){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!ok;b.onclick=()=>{fn();bankKey='';renderBank();};return b;}
function spark(hist){const w=84,h=34,mn=Math.min(...hist),mx=Math.max(...hist),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('width',w);svg.setAttribute('height',h);
 const pl=document.createElementNS(ns,'polyline');pl.setAttribute('points',hist.map((v,i)=>`${(i/(Math.max(1,hist.length-1))*w).toFixed(1)},${(h-2-(v-mn)/Math.max(.01,mx-mn)*(h-4)).toFixed(1)}`).join(' '));pl.setAttribute('fill','none');pl.setAttribute('stroke-width','2');pl.setAttribute('stroke',hist[hist.length-1]>=hist[0]?'#2f9e4f':'#e8483a');svg.append(pl);return svg;}
function renderBank(){const s=state,B=s.bank,key=JSON.stringify([Math.floor(wallet(s)),B.savings,B.debt,B.stocks]);if(key===bankKey)return;bankKey=key;const body=$('bankbody');body.textContent='';const w=wallet(s),lim=loanLimit(s);
 const sum=document.createElement('div');sum.className='sum';for(const [k,v] of [['Compte',fmt(s.money)],['Coffre-fort',fmt(s.safe)],['Épargne (+'+SAVINGS_RATE*100+' %/nuit)',fmt(B.savings)],['Actions',fmt(portfolio(s))],['Crédit (−'+LOAN_RATE*100+' %/nuit)',B.debt?'−'+fmt(B.debt):'0 $']]){const a=document.createElement('span');a.textContent=k;const b=document.createElement('b');b.textContent=v;sum.append(a,b);}body.append(sum);
 const sec=(title,note,buttons)=>{const h=document.createElement('h3');h.textContent=title;const sm=document.createElement('small');sm.textContent=note;h.append(sm);const r=document.createElement('div');r.className='btns';r.append(...buttons);body.append(h,r);};
 sec('Épargne','',[btn('+100',()=>bankAction(s,'deposit',null,100),w>=100),btn('+ tout',()=>bankAction(s,'deposit',null,w),w>=1),btn('−100',()=>bankAction(s,'withdraw',null,100),B.savings>=100),btn('− tout',()=>bankAction(s,'withdraw',null,B.savings),B.savings>=1)]);
 sec('Crédit',`plafond ${fmt(lim)}`,[btn('+100',()=>bankAction(s,'borrow',null,100),B.debt+100<=lim),btn('+ max',()=>bankAction(s,'borrow',null,lim),B.debt<lim),btn('Rembourser 100',()=>bankAction(s,'repay',null,100),B.debt>0&&w>=1),btn('Tout',()=>bankAction(s,'repay',null,B.debt),B.debt>0&&w>=1)]);
 const h=document.createElement('h3');h.textContent='Actions';const sm=document.createElement('small');sm.textContent='cours toutes les 5 s';h.append(sm);body.append(h);
 for(const k of STOCKS){const st=B.stocks[k.id],row=document.createElement('div');row.className='stock';const first=st.hist[0],ch=(st.price/first-1)*100;
  const t=document.createElement('div');const nb=document.createElement('b');nb.textContent=`${k.name} · ${st.price.toFixed(2)} $ `;const c=document.createElement('span');c.className=ch>=0?'up':'down';c.textContent=`${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(1)} %`;t.append(nb,c);
  const o=document.createElement('div');const gain=st.owned*st.price-st.paid;o.textContent=st.owned?`${st.owned} titres · ${fmt(st.owned*st.price)} (${gain>=0?'+':''}${Math.round(gain)} $)`:'Aucun titre';
  const r=document.createElement('div');r.className='btns';r.append(btn('Acheter 1',()=>bankAction(s,'buy',k.id,1),w>=st.price),btn('Acheter 10',()=>bankAction(s,'buy',k.id,10),w>=st.price*10),btn('Vendre 1',()=>bankAction(s,'sell',k.id,1),st.owned>0),btn('Tout vendre',()=>bankAction(s,'sell',k.id,st.owned),st.owned>0));
  row.append(t,spark(st.hist),o,r);body.append(row);}}
$('bankbtn').addEventListener('click',()=>{$('bankpanel').hidden=!$('bankpanel').hidden;$('teampanel').hidden=$('handspanel').hidden=true;bankKey='';renderBank();});$('bankclose').addEventListener('click',()=>$('bankpanel').hidden=true);
// Two taps to restart (no browser dialog, which embedded pages cannot show).
// On a phone the restart button is only an icon; the confirmation text stays explicit.
const phone=matchMedia('(max-width:600px)'),resetLabel=()=>phone.matches?'↺':'↺ Recommencer';$('reset').textContent=resetLabel();phone.addEventListener?.('change',()=>{if(!armed)$('reset').textContent=resetLabel();});
let armed=0;$('reset').addEventListener('click',()=>{const b=$('reset');if(performance.now()-armed>3000){armed=performance.now();b.textContent=phone.matches?'Encore ?':'Touchez encore pour recommencer';setTimeout(()=>{if(performance.now()-armed>=2900){armed=0;b.textContent=resetLabel();}},3000);return;}armed=0;b.textContent=resetLabel();state=createArcade();scene.reset();try{localStorage.removeItem(KEY);}catch{}});
// ---- Network play -------------------------------------------------------------------------------------------------------------
// The host's game is the only real one: it sends its whole state to the guests ten times a second; guests send back their stick,
// where they stand, and what they do with their hands or the team. Guests touch neither the bank nor the save.
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
   onLeave(id){seen.delete(id);removeGuest(state,id);}});
  state.player.name=myName();net={role:'host',room,seen};status('');}catch(e){status(netError(e));}
 busy(false);renderMulti();}
function stopHost(){if(net?.role!=='host')return;for(const g of [...state.guests])removeGuest(state,g.id);net.room.close();delete state.player.name;net=null;status('');renderMulti();}
async function startJoin(){const code=cleanCode($('mcode').value);if(code.length<5){status('Le code fait 5 lettres ou chiffres.');return;}busy(true);status('Connexion…');save();
 const ses={role:'guest',room:null,me:null,solo:state,heard:performance.now(),full:false};
 try{ses.room=await joinRoom(code,{name:myName()},{onMessage:m=>fromHost(ses,m),onClose:()=>{if(net===ses)leave('Connexion perdue.');}});net=ses;status('');if(ses.full)leave('Cette partie est complète.');}catch(e){status(netError(e));}
 busy(false);renderMulti();}
function fromHost(ses,m){if(m.t==='hi'&&typeof m.id==='string'){ses.me=m.id;scene.setFocus(ses.me);return;}if(m.t==='no'){ses.full=true;if(net===ses)leave('Cette partie est complète.');return;}
 const ns=m.s;if(m.t!=='s'||net!==ses||!ses.me||!ns||typeof ns!=='object'||!ns.player||!Array.isArray(ns.guests)||!Array.isArray(ns.plots)||!Array.isArray(ns.helpers))return;ses.heard=performance.now();ns.replica=true;
 // This player's own character stays where this screen shows it (the host follows it), unless the two have drifted far apart.
 const now=ns.guests.find(g=>g.id===ses.me),was=state.replica?guestOf(state,ses.me):null;if(now&&was&&Math.hypot(now.x-was.x,now.z-was.z)<4){now.x=was.x;now.z=was.z;now.heading=was.heading;now.moving=was.moving;now.input=was.input;}
 const first=!state.replica;if(first)scene.reset();state=ns;if(first){teamKey='';renderPicks();for(const id of ['bankpanel','teampanel'])$(id).hidden=true;scene.setShowMissions(false);}}
function leave(msg){const ses=net;if(ses?.role!=='guest')return;net=null;ses.room.close();state=ses.solo;scene.setFocus(null);scene.reset();teamKey=bankKey='';renderPicks();status(msg);renderMulti();if(msg)$('multipanel').hidden=false;}
// Several times a second, even when the page is in the background (where frames stop): a guest reports its stick and position;
// the host keeps the restaurant running for the others and lets go of guests it no longer hears.
setInterval(()=>{if(!net)return;const now=performance.now();
 if(guest()){const g=guestOf(state,net.me);if(g){if(document.hidden)g.input=STILL;net.room.send({t:'in',ix:g.input.x,iz:g.input.z,x:g.x,z:g.z,h:g.heading});}if(now-net.heard>15000)leave('Connexion perdue.');return;}
 for(const [id,t] of net.seen)if(now-t>15000){net.seen.delete(id);net.room.kick(id);}
 if((document.hidden||now-last>250)&&net.room.size){const inp=document.hidden?STILL:input();let el=Math.min(2,(now-last)/1000);last=now;while(el>1e-3){const d=Math.min(.1,el);stepArcade(state,d,inp);el-=d;}share(now);}},80);
try{$('mname').value=localStorage.getItem(KEY+'-name')??'';}catch{}$('mname').addEventListener('change',()=>{try{localStorage.setItem(KEY+'-name',myName());}catch{}});
$('multi').addEventListener('click',()=>{$('multipanel').hidden=!$('multipanel').hidden;$('teampanel').hidden=$('handspanel').hidden=$('bankpanel').hidden=true;scene.setShowMissions(false);});$('multiclose').addEventListener('click',()=>$('multipanel').hidden=true);
for(const id of ['bankbtn','hands','team'])$(id).addEventListener('click',()=>$('multipanel').hidden=true);
$('mhost').addEventListener('click',startHost);$('mjoin').addEventListener('click',startJoin);$('mstop').addEventListener('click',stopHost);$('mleave').addEventListener('click',()=>leave(''));
$('mcode').addEventListener('keydown',e=>{if(e.key==='Enter')startJoin();});
$('mcopy').addEventListener('click',()=>{const link=location.origin+location.pathname+'?join='+net.room.code;(navigator.clipboard?.writeText(link)??Promise.reject()).then(()=>status('Lien copié ✔'),()=>status(link));});
phone.addEventListener?.('change',renderMulti);renderMulti();
// A link ending in ?join=CODE opens the panel with the code filled in.
{const code=cleanCode(new URLSearchParams(location.search).get('join'));if(code){$('mcode').value=code;$('multipanel').hidden=false;status('Entrez votre prénom, puis touchez Rejoindre.');}}
addEventListener('pagehide',()=>{save();net?.room.close();});
window.__arcade={get state(){return state},get net(){return net},scene,step:(dt,i)=>stepArcade(state,dt,i)};
requestAnimationFrame(frame);
