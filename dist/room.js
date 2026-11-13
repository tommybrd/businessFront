// Network play of the MarketFront games, shared by BurgerFront and CampingFront. One room is one game of the host's browser, with
// all of the host's businesses in it: every player (host included) is in one business at a time and may walk to the other one,
// and everybody has the same rights. A business is its own page, so changing business reloads the page; the room is remembered
// for the tab (sessionStorage) and each side comes back by itself: the host reopens the same code, the guests reconnect to it.
// While it hosts, the page also runs the other business (from its local save) whenever a guest is in it.
// The host's game is the only real one; guests hold a copy of it that runs between two snapshots and rolls no dice.
import {hostRoom,joinRoom,cleanCode,netError} from './arcade-net.js';
export const GAMES={
 arcade:{name:'BurgerFront',icon:'🍔',key:'flux-arcade-v1',load:()=>import('./arcade-engine.js'),create:'createArcade',read:'loadArcade',step:'stepArcade',valid:s=>Array.isArray(s.plots)},
 camping:{name:'CampingFront',icon:'🌴',key:'flux-camping-v1',load:()=>import('./camping-engine.js'),create:'createCamping',read:'loadCamping',step:'stepCamping',valid:s=>s.game==='camping'&&Array.isArray(s.pitches)&&Array.isArray(s.campers)}};
const SESSION='mf-room',STILL={x:0,z:0},sleep=ms=>new Promise(r=>setTimeout(r,ms));
const store={get(){try{return JSON.parse(sessionStorage.getItem(SESSION));}catch{return null;}},set(v){try{if(v)sessionStorage.setItem(SESSION,JSON.stringify({...v,at:Date.now()}));else sessionStorage.removeItem(SESSION);}catch{}}};
// cfg: game ('arcade'|'camping'), E (this game's engine module), get()/set(state), scene, input(), save(), phone (media query), refresh() (rebuild the panels).
export function createRoom(cfg){
 const {game,E,scene,phone}=cfg,$=id=>document.getElementById(id),G=GAMES[game],O=game==='arcade'?'camping':'arcade',GO=GAMES[O];
 let net=null,other=null,otherE=null,otherDirty=false,lastFrame=performance.now(),stepAt=performance.now(),otherAt=performance.now(),sentAt=0,saveAt=0,beatAt=0,multiKey='';
 const guest=()=>net?.role==='guest',me=()=>guest()?E.guestOf(cfg.get(),net.me)??{carry:[],x:0,z:0}:cfg.get().player;
 const status=t=>{$('mstatus').textContent=t??'';},busy=on=>{$('mhost').disabled=$('mjoin').disabled=on;};
 const myName=()=>($('mname').value.trim()||'Joueur').slice(0,12);
 const stateOf=g=>g===game?cfg.get():other,engineOf=g=>g===game?E:otherE;
 const session=()=>{if(net)store.set({role:net.role,code:net.code,name:myName()});};
 async function loadOther(){otherE=await GO.load();try{other=otherE[GO.read](localStorage.getItem(GO.key));}catch{other=otherE[GO.create]();}}
 const saveOther=()=>{if(!other||!otherDirty)return;otherDirty=false;try{localStorage.setItem(GO.key,JSON.stringify(other));}catch{}};
 // Who is where: the host in this page's business, each guest in the business it joined from.
 function roster(){if(guest())return net.roster??[];if(!net)return [];const out=[{n:cfg.get().player.name||'Hôte',g:game,h:1}];
  for(const [id,g] of net.where){const b=engineOf(g).guestOf(stateOf(g),id);if(b)out.push({n:b.name,g,id});}return out;}
 // ---- Host ----
 function resetGame(g){const st=stateOf(g),en=engineOf(g),n=en[GAMES[g].create]();n.guests=st.guests;n.player.name=st.player.name;for(const b of n.guests)b.carry=[];
  if(g===game){cfg.set(n);scene.reset();cfg.refresh?.();cfg.save();}else{other=n;otherDirty=true;}}
 // What a guest does with its hands, the team, the bank and the restart: same rights as the host.
 function fromGuest(g,id,m){const st=stateOf(g),en=engineOf(g),b=en.guestOf(st,id);if(!b)return;
  if(m.t==='in')en.guestInput(st,id,m);else if(m.t==='pick'&&typeof m.k==='string')en.setPick(st,m.k,!!m.on,b);else if(m.t==='empty')en.emptyHands(st,b);
  else if(m.t==='mission'&&typeof m.loop==='string')en.assignMission(st,m.id,m.loop);
  else if(m.t==='bank'&&en.bankAction&&typeof m.a==='string')en.bankAction(st,m.a,typeof m.k==='string'?m.k:null,m.n);
  else if(m.t==='reset')resetGame(g);}
 async function startHost(code,resume){busy(true);status(resume?'Retour dans la partie…':'Ouverture de la partie…');let err=null;
  try{await loadOther();const seen=new Map(),where=new Map();
   const room=await hostRoom({
    onJoin(id,meta){const g=meta?.game===O?O:game;if(!engineOf(g).addGuest(stateOf(g),id,meta?.name))return false;where.set(id,g);seen.set(id,performance.now());if(g===O)otherDirty=true;},
    onMessage(id,m){const g=where.get(id);if(!g)return;seen.set(id,performance.now());fromGuest(g,id,m);},
    onLeave(id){const g=where.get(id);seen.delete(id);where.delete(id);if(g)engineOf(g).removeGuest(stateOf(g),id);}},code);
   cfg.get().player.name=myName();net={role:'host',room,seen,where,code:room.code};session();status('');}
  catch(e){err=e;status(resume?'':netError(e));}
  busy(false);render();return err;}
 function stopHost(){if(net?.role!=='host')return;for(const [id,g] of [...net.where])engineOf(g).removeGuest(stateOf(g),id);net.room.close();saveOther();delete cfg.get().player.name;net=null;other=null;otherE=null;store.set(null);status('');render();}
 // Every tenth of a second, each guest gets the state of the business it is in (and the list of who is where).
 function share(now){if(now-sentAt<100)return;sentAt=now;let r=null;
  for(const g of [game,O]){const st=stateOf(g);if(!st?.guests.length)continue;const ids=[...net.where].filter(([,w])=>w===g).map(([id])=>id);if(!ids.length)continue;
   r??=JSON.stringify(roster());const text='{"t":"s","r":'+r+',"s":'+JSON.stringify(st)+'}';for(const id of ids)net.room.send(id,text);}}
 // ---- Guest ----
 const connect=(ses)=>joinRoom(ses.code,{name:ses.name,game},{onMessage:m=>fromHost(ses,m),onClose:()=>{if(net===ses)lost(ses);}}).then(r=>{ses.room=r;});
 // The link dropped (the host may just be changing business): keep playing the copy and try to get back for a while.
 function lost(ses){if(ses.retrying)return;ses.retrying=true;ses.me=null;status('Connexion perdue, reconnexion…');ses.heard=performance.now();
  (async()=>{for(let i=0;i<25&&net===ses;i++){await sleep(1000);if(net!==ses)return;try{ses.full=false;await connect(ses);ses.retrying=false;ses.heard=performance.now();status('');render();return;}catch{}}if(net===ses){ses.retrying=false;leave('Connexion perdue.');}})();}
 async function startJoin(raw,resume){const code=cleanCode(raw);if(code.length<5){status('Le code fait 5 lettres ou chiffres.');return {type:'bad-code'};}busy(true);status(resume?'Retour dans la partie…':'Connexion…');cfg.save();
  const ses={role:'guest',room:null,me:null,solo:cfg.get(),heard:performance.now(),full:false,code,name:myName(),roster:[],retrying:false};let err=null;
  try{await connect(ses);net=ses;status('');if(ses.full)leave('Cette partie est complète.');else session();}catch(e){err=e;status(resume?'':netError(e));}
  busy(false);render();return err;}
 function fromHost(ses,m){if(m.t==='hi'&&typeof m.id==='string'){ses.me=m.id;scene.setFocus(ses.me);return;}if(m.t==='no'){ses.full=true;if(net===ses)leave('Cette partie est complète.');return;}
  const ns=m.s;if(m.t!=='s'||net!==ses||!ses.me||!ns||typeof ns!=='object'||!ns.player||!Array.isArray(ns.guests)||!Array.isArray(ns.helpers)||!G.valid(ns))return;ses.heard=performance.now();ns.replica=true;
  if(Array.isArray(m.r))ses.roster=m.r.slice(0,8).filter(p=>p&&GAMES[p.g]).map(p=>({n:String(p.n??'').slice(0,12),g:p.g,h:p.h?1:0,id:p.id}));
  const cur=cfg.get(),now=ns.guests.find(g=>g.id===ses.me),was=cur.replica?E.guestOf(cur,ses.me):null;
  // This player's own character stays where this screen shows it (the host follows it), unless the two have drifted far apart.
  if(now&&was&&Math.hypot(now.x-was.x,now.z-was.z)<4){now.x=was.x;now.z=was.z;now.heading=was.heading;now.moving=was.moving;now.input=was.input;}
  const first=!cur.replica||ns.t<cur.t-2;if(first)scene.reset();cfg.set(ns);if(first)cfg.refresh?.();}
 function leave(msg){const ses=net;if(ses?.role!=='guest')return;net=null;try{ses.room?.close();}catch{}cfg.set(ses.solo);scene.setFocus(null);scene.reset();cfg.refresh?.();store.set(null);status(msg);render();if(msg)$('multipanel').hidden=false;}
 // ---- Panel ----
 function render(){const h=net?.role==='host',g=guest(),R=roster(),key=[net?.role,net?.me,phone.matches,JSON.stringify(R)].join('|');if(key===multiKey)return;multiKey=key;
  $('mp-idle').hidden=!!net;$('mp-host').hidden=!h;$('mp-guest').hidden=!g;$('multi').textContent='👥'+(net?' '+R.length:phone.matches?'':' Multi');$('multi').classList.toggle('on',!!net);
  if(!net)return;if(h)$('mshare').textContent=net.code;const list=$(h?'mplayers':'mplayers2');list.textContent='';
  for(const p of R){const li=document.createElement('li'),self=h?!!p.h:!!p.id&&p.id===net.me;li.textContent=`${GAMES[p.g].icon} ${p.n}${p.h?' · hôte':''}${self?' · vous':''}`;list.append(li);}}
 // ---- Called by the page ----
 function frame(dt,now){lastFrame=stepAt=now;const s=cfg.get();
  if(guest()){if(s.replica){const g=E.guestOf(s,net.me);if(g)g.input=cfg.input();try{E[G.step](s,dt);}catch{leave('La partie a été interrompue.');}}return;}
  E[G.step](s,dt,cfg.input());if(net)share(now);}
 // Several times a second, even when the page is in the background (where frames stop): a guest reports its stick and position; the
 // host keeps both businesses running for the others and lets go of guests it no longer hears.
 setInterval(()=>{if(!net)return;const now=performance.now();render();if(now-beatAt>5000){beatAt=now;session();}
  if(guest()){const g=E.guestOf(cfg.get(),net.me);if(g&&net.me){if(document.hidden)g.input=STILL;net.room.send({t:'in',ix:g.input.x,iz:g.input.z,x:g.x,z:g.z,h:g.heading});}if(!net.retrying&&now-net.heard>15000)lost(net);return;}
  for(const [id,t] of net.seen)if(now-t>15000){net.seen.delete(id);net.room.kick(id);}
  let moved=false;
  if((document.hidden||now-lastFrame>250)&&net.room.size){const inp=document.hidden?STILL:cfg.input();let el=Math.min(2,(now-stepAt)/1000);stepAt=now;while(el>1e-3){const d=Math.min(.1,el);E[G.step](cfg.get(),d,inp);el-=d;}moved=true;}
  if(other?.guests.length){let el=Math.min(2,(now-otherAt)/1000);otherAt=now;while(el>1e-3){const d=Math.min(.1,el);otherE[GO.step](other,d,STILL);el-=d;}otherDirty=true;moved=true;}else otherAt=now;
  if(moved)share(now);if(otherDirty&&now-saveAt>3000){saveAt=now;saveOther();}},80);
 // ---- Panel buttons ----
 try{$('mname').value=localStorage.getItem(G.key+'-name')??localStorage.getItem('flux-arcade-v1-name')??'';}catch{}$('mname').addEventListener('change',()=>{try{localStorage.setItem(G.key+'-name',myName());}catch{}});
 $('mhost').addEventListener('click',()=>startHost());$('mjoin').addEventListener('click',()=>startJoin($('mcode').value));$('mstop').addEventListener('click',stopHost);$('mleave').addEventListener('click',()=>leave(''));
 $('mcode').addEventListener('keydown',e=>{if(e.key==='Enter')startJoin($('mcode').value);});
 $('mcopy').addEventListener('click',()=>{const link=location.origin+location.pathname+'?join='+net.code;(navigator.clipboard?.writeText(link)??Promise.reject()).then(()=>status('Lien copié ✔'),()=>status(link));});
 phone.addEventListener?.('change',render);render();
 // A link ending in ?join=CODE opens the panel with the code filled in.
 {const code=cleanCode(new URLSearchParams(location.search).get('join'));if(code&&!store.get()){$('mcode').value=code;$('multipanel').hidden=false;status('Entrez votre prénom, puis touchez Rejoindre.');}}
 addEventListener('pagehide',()=>{if(!net)return;session();saveOther();try{net.room.close();}catch{}});
 // After a change of business (or a reload) the tab goes back into the room it was in: the host takes its code again, a guest rejoins it.
 async function resume(){const s=store.get();if(!s||Date.now()-s.at>40000||!/^[A-Z0-9]{5}$/.test(s.code??''))return;if(s.name)$('mname').value=s.name;
  for(let i=0;i<25&&!net;i++){const err=s.role==='host'?await startHost(s.code,true):await startJoin(s.code,true);if(!err)return;
   if(!['unavailable-id','peer-unavailable','network','server-error','socket-error','socket-closed'].includes(err.type)&&!['timeout','missing'].includes(err.message))break;await sleep(1000);}
  status('Impossible de reprendre la partie.');store.set(null);}
 return {get net(){return net;},get code(){return net?.code??null;},guest,me,send(m){if(net?.room)net.room.send(m);},frame,renderMulti:render,resume,
  // The restart button: alone it is the page's business; in a room it restarts this business for everyone (host or guest, same rights).
  reset(){if(guest())net.room.send({t:'reset'});else resetGame(game);}};}
