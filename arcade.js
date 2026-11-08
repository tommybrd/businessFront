import {createArcade,stepArcade,loadArcade,visibleUnlocks,traffic,avgWait,PATIENCE,MISSIONS,missionsFor,assignMission} from './arcade-engine.js';
import {createArcadeScene} from './arcade-scene.js';

// Input (keyboard + touch joystick), HUD and local save of the arcade alpha.
const KEY='flux-arcade-v1',$=id=>document.getElementById(id);
let state;try{state=loadArcade(localStorage.getItem(KEY));}catch{state=createArcade();}
const scene=createArcadeScene($('arcade'),()=>state);
const keys=new Set(),stick={x:0,z:0,active:false,ox:0,oy:0,id:null};
const DIRS={z:[0,-1],w:[0,-1],arrowup:[0,-1],s:[0,1],arrowdown:[0,1],q:[-1,0],a:[-1,0],arrowleft:[-1,0],d:[1,0],arrowright:[1,0]};
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(DIRS[k]){keys.add(k);e.preventDefault();}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
const canvas=$('arcade'),base=$('stick'),knob=$('knob');
canvas.addEventListener('pointerdown',e=>{stick.active=true;stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.z=0;canvas.setPointerCapture(e.pointerId);base.style.left=e.clientX+'px';base.style.top=e.clientY+'px';base.hidden=false;knob.style.transform='translate(-50%,-50%)';});
canvas.addEventListener('pointermove',e=>{if(!stick.active||e.pointerId!==stick.id)return;const dx=e.clientX-stick.ox,dy=e.clientY-stick.oy,d=Math.hypot(dx,dy),m=Math.min(d,48),ux=d?dx/d:0,uy=d?dy/d:0;stick.x=ux*m/48;stick.z=uy*m/48;knob.style.transform=`translate(calc(-50% + ${ux*m}px),calc(-50% + ${uy*m}px))`;});
const end=e=>{if(e.pointerId!==stick.id)return;stick.active=false;stick.x=stick.z=0;base.hidden=true;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
// Screen directions turned into ground directions: the camera looks down from the front, turned by atan(6/15) to the right.
const YAW=Math.atan2(6,15),CY=Math.cos(YAW),SY=Math.sin(YAW);
function input(){let x=stick.x,z=stick.z;for(const k of keys){x+=DIRS[k][0];z+=DIRS[k][1];}return {x:x*CY+z*SY,z:-x*SY+z*CY};}
function hint(){const p=state.player,u=visibleUnlocks(state);if(state.served===0&&!p.carry.length)return 'Marchez sur le champ pour récolter les pommes de terre 🥔';if(p.carry.includes('potato'))return 'Déposez-les sur le tapis orange devant la friteuse';if(p.carry.includes('fries'))return 'Prenez les frites sur le tapis vert, puis posez-les sur le tapis orange derrière le comptoir';if(state.customers.length&&!state.cashiers[0]&&state.served<3)return 'Allez sur le carré bleu derrière la caisse pour servir, puis ramassez l’argent 💵';if(state.unlocked.megaphone&&state.rushCool<=0&&state.customers.length<4)return 'Montez sur le mégaphone 📣 près de l’entrée pour lancer un rush de clients';if(state.piles.some(x=>x>0))return 'Ramassez l’argent sur le carré vert 💵 à côté de la caisse';if(u.length&&state.money>=Math.min(...u.map(x=>x.price-(state.paid[x.key]??0))))return 'Marchez sur une zone en pointillé pour la débloquer';return '';}
// Team panel: one row per employee or robot with a mission picker; rebuilt only when the team or the choices change.
let teamKey='';function renderTeam(){const key=state.helpers.map(h=>h.id+h.loop+missionsFor(state,h).length).join();if(key===teamKey)return;teamKey=key;const list=$('teamlist');list.textContent='';
 for(const h of state.helpers){const row=document.createElement('div');row.className='worker';const ico=document.createElement('span');ico.className='ico';ico.textContent=h.robot?'🤖':'👷';const name=document.createElement('b');name.textContent=h.name;
  const sel=document.createElement('select');sel.id='mission-'+h.id;sel.setAttribute('aria-label','Mission de '+h.name);for(const m of missionsFor(state,h)){const o=document.createElement('option');o.value=m.id;o.textContent=m.icon+'  '+m.label;o.selected=m.id===h.loop;sel.append(o);}
  sel.onchange=()=>{assignMission(state,h.id,sel.value);teamKey='';renderTeam();};row.append(ico,name,sel);list.append(row);}}
$('team').addEventListener('click',()=>{$('teampanel').hidden=!$('teampanel').hidden;teamKey='';renderTeam();});$('teamclose').addEventListener('click',()=>$('teampanel').hidden=true);
let last=performance.now(),saveAt=0,hudAt=0;
function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;stepArcade(state,dt,input());scene.update(dt);
 if(now-hudAt>150){hudAt=now;$('money').textContent=Math.floor(state.money).toLocaleString('fr-FR')+' $';$('cashwait').textContent=Math.round(state.piles.reduce((a,b)=>a+b,0)).toLocaleString('fr-FR')+' $';$('served').textContent=state.served;$('traffic').textContent='×'+traffic(state).toFixed(1)+(state.rush>0?' 🔥':'');$('rep').textContent='★ '+state.rep.toFixed(1);const w=avgWait(state),f=Math.min(1,w/PATIENCE);$('wait').textContent=Math.round(w)+' s / '+PATIENCE+' s';$('gauge').style.width=(f*100)+'%';$('gauge').style.background=f<.4?'#4fbf5a':f<.7?'#f0a830':'#e8483a';$('lost').textContent=state.lost+(state.lost>1?' partis':' parti');$('hint').textContent=hint();$('hint').hidden=!$('hint').textContent;$('team').hidden=!state.helpers.length;if(!$('teampanel').hidden&&document.activeElement?.tagName!=='SELECT')renderTeam();}
 if(now-saveAt>3000){saveAt=now;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}}requestAnimationFrame(frame);}
// Two taps to restart (no browser dialog, which embedded pages cannot show).
let armed=0;$('reset').addEventListener('click',()=>{const b=$('reset');if(performance.now()-armed>3000){armed=performance.now();b.textContent='Touchez encore pour recommencer';setTimeout(()=>{if(performance.now()-armed>=2900)b.textContent='↺ Recommencer';},3000);return;}armed=0;b.textContent='↺ Recommencer';state=createArcade();scene.reset();try{localStorage.removeItem(KEY);}catch{}});
addEventListener('pagehide',()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}});
window.__arcade={get state(){return state},scene,step:(dt,i)=>stepArcade(state,dt,i)};
requestAnimationFrame(frame);
