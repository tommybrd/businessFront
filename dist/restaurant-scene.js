import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createKeyboardCameraControls} from './camera-controls.js';
import {LAYOUT,INGREDIENTS,EQUIPMENT,STATION_CAPACITY,restaurantNow,ingredientStock,restockRule} from './restaurant-engine.js';
import {createWorkerMotion,updateWorkerMotion,followVehicle} from './warehouse-motion.js';

// 3D view of the burger restaurant: every object mirrors the simulation (cooking loads, ready orders, tables, guests, stock).
const SHIRTS=['#4f7fb5','#d0603a','#6aa77e','#9a6fbf','#d8a63a','#e07b9a'],UNIFORM={cashier:'#c8462f',grill:'#f2f2ee',fryer:'#f2f2ee',assembly:'#f2f2ee',floor:'#3f6984'};
const SEATS=[[-.95,0],[.95,0],[0,-.95],[0,.95]],FOLLOW=[[0,0],[.55,-.45],[-.55,-.45],[0,-.9]];
export function createRestaurantScene(canvas,state,onSelect){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor('#b9c4cb');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-23,23,16,-16,.1,140);camera.position.set(26,34,38);camera.lookAt(0,0,1);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,1);controls.enableDamping=true;controls.minZoom=.65;controls.maxZoom=3.4;controls.minPolarAngle=.4;controls.maxPolarAngle=1.18;controls.screenSpacePanning=false;
 const keyboard=createKeyboardCameraControls(camera,controls),sun=new THREE.DirectionalLight('#fff1dc',3);sun.position.set(-14,30,18);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26});sun.shadow.normalBias=.035;scene.add(sun,new THREE.HemisphereLight('#fff6ec','#6c7880',2.6));
 const materials=new Map(),clickables=[],staff=new Map(),guests=new Map();let lastState=state,clock=0;
 const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.75,metalness:.08,...extra}));return materials.get(key);};
 function box(parent,w,h,d,x,y,z,color,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 function cyl(parent,r,h,x,y,z,color,segments=14){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat(color));m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
 function label(parent,text,x,y,z,width=3,color='#fff5e1',bg='#c8462f'){const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,100);ctx.font='800 50px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,52,480);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/5.12),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function tag(group,data){group.userData.selection=data;clickables.push(group);return group;}

 // Ground, street, building shell with a glass front and the service lane behind.
 const world=new THREE.Group();scene.add(world);box(world,52,.35,44,0,-.5,1,'#7a8d84');box(world,48,.08,5,0,-.27,14.5,'#58646d');for(let x=-22;x<22;x+=3.4)box(world,1.6,.012,.16,x,-.21,14.5,'#e6e3ca',false);box(world,48,.1,2,0,-.25,11.4,'#c9ced1');box(world,40,.08,4,0,-.27,-13,'#5f6b73');
 box(world,33,.25,20.4,0,-.12,0,'#d9c8ab');box(world,33,.02,8.6,0,.02,-5.9,'#dfe5e6',false);for(let x=-16;x<16.4;x+=1)for(let z=-10;z<-1.6;z+=1)if((Math.floor(x)+Math.floor(z))%2===0)box(world,1,.012,1,x+.5,.035,z+.5,'#c9d2d4',false);
 const shell=new THREE.Group();world.add(shell);// Cut-away diorama: back and left walls full height, right wall and glass front kept low so the counter and kitchen stay visible.
 box(shell,33,3.4,.3,0,1.6,-10.2,'#e7dccb');box(shell,.3,3.4,20.4,-16.5,1.6,0,'#e7dccb');box(shell,.3,1,20.4,16.5,.45,0,'#e7dccb');
 const glass=new THREE.MeshStandardMaterial({color:'#a9d3e6',transparent:true,opacity:.18,depthWrite:false,roughness:.1,metalness:.2});for(const [x,w] of [[-10.25,12.5],[7.25,18.5]]){box(shell,w,.6,.3,x,.3,10.2,'#c8462f');const pane=box(shell,w,.9,.06,x,1.05,10.2,'#a9d3e6',false);pane.material=glass;}
 // Sign on a pylon by the entrance instead of a full-width fascia.
 box(shell,.25,3,.25,-17.6,1.5,12.2,'#3d454b');box(shell,4.6,1.3,.3,-17.6,3.4,12.2,'#c8462f');label(shell,'BURGER FLUX',-17.6,3.4,12.37,4.2);
 box(shell,1.6,2.8,.12,13,1.4,-10.3,'#8a6a4a');
 // Kitchen: hoods, grills, fryers, assembly line, pass, drink machine, cold room.
 const kitchen=new THREE.Group();world.add(kitchen);box(kitchen,22,.5,1.8,-4,3.2,-8.6,'#b8c0c4');
 const grills=[],fryers=[],assemblies=[],registers=[],kiosks=[],tables=[];
 for(let i=0;i<EQUIPMENT.grills.max;i++){const [x,z]=LAYOUT.grill(i),g=tag(new THREE.Group(),{tab:'kitchen'});g.position.set(x,0,z);kitchen.add(g);box(g,2,1,1.3,0,.5,0,'#3d454b');box(g,1.9,.06,1.2,0,1.03,0,'#16191b');const patties=[];for(let k=0;k<8;k++){const p=cyl(g,.16,.08,-.66+(k%4)*.44,1.1,-.25+Math.floor(k/4)*.5,'#7b3f2c');patties.push(p);}
  const flame=new THREE.Mesh(new THREE.BoxGeometry(1.8,.04,1.1),new THREE.MeshBasicMaterial({color:'#ff8a2a',transparent:true,opacity:0}));flame.position.y=1.05;g.add(flame);Object.assign(g.userData,{patties,flame});grills.push(g);}
 for(let i=0;i<EQUIPMENT.fryers.max;i++){const [x,z]=LAYOUT.fryer(i),g=tag(new THREE.Group(),{tab:'kitchen'});g.position.set(x,0,z);kitchen.add(g);box(g,1.5,1,1.3,0,.5,0,'#aeb6bb');box(g,1.2,.04,.9,0,1.01,0,'#e2b13a');const basket=new THREE.Group();box(basket,.55,.3,.5,0,0,0,'#c9cfd3');box(basket,.08,.08,.5,0,.18,.4,'#2f3a42');const fries=box(basket,.45,.12,.42,0,.12,0,'#f5d36b');basket.position.set(0,1.35,0);g.add(basket);Object.assign(g.userData,{basket,fries});fryers.push(g);}
 for(let i=0;i<EQUIPMENT.assembly.max;i++){const [x,z]=LAYOUT.assembly(i),g=tag(new THREE.Group(),{tab:'kitchen'});g.position.set(x,0,z);kitchen.add(g);box(g,2.4,1,1,0,.5,0,'#c3cacd');box(g,2.4,.05,1,0,1.02,0,'#e6eaec');box(g,1.6,.06,.3,0,2.1,0,'#e2b13a',false);const burger=new THREE.Group();box(burger,.34,.08,.34,0,0,0,'#e3b26b');box(burger,.36,.07,.36,0,.07,0,'#7b3f2c');box(burger,.38,.03,.38,0,.12,0,'#f2b938');box(burger,.34,.1,.34,0,.18,0,'#e3b26b');burger.position.set(.2,1.12,0);g.add(burger);g.userData.burger=burger;assemblies.push(g);}
 const pass=tag(new THREE.Group(),{tab:'orders'});world.add(pass);box(pass,13,.08,.7,-3,1.4,LAYOUT.pass[1],'#b8c0c4');for(const x of [-9.3,3.3])box(pass,.08,1.4,.08,x,.7,LAYOUT.pass[1],'#8e979c');const ready=[];for(let i=0;i<10;i++){const g=new THREE.Group();const tray=box(g,.6,.04,.45,0,0,0,'#c8462f');const bag=box(g,.4,.5,.28,0,.25,0,'#b98a52');box(g,.22,.12,.18,-.1,.08,0,'#e3b26b');g.position.set(-8.5+i*1.25,1.46,LAYOUT.pass[1]);g.userData={tray,bag};pass.add(g);ready.push(g);}
 const drinks=tag(new THREE.Group(),{tab:'kitchen'});drinks.position.set(...[LAYOUT.drinkMachine[0],0,LAYOUT.drinkMachine[1]]);world.add(drinks);box(drinks,1.4,1.9,.8,0,.95,0,'#3f6984');for(let k=0;k<4;k++)box(drinks,.18,.3,.1,-.45+k*.3,1.3,.42,['#d0603a','#f2b938','#6aa5d8','#e8e4ef'][k]);
 const cold=tag(new THREE.Group(),{tab:'stock'});cold.position.set(LAYOUT.coldRoom[0],0,LAYOUT.coldRoom[1]);world.add(cold);box(cold,5.4,3,3.4,0,1.5,0,'#dfe7ea');box(cold,1,2.2,.1,-1.9,1.1,1.75,'#9fb4c0');label(cold,'CHAMBRE FROIDE',.6,2.75,1.72,3.2,'#26343f','#dfe7ea');const crates=[];INGREDIENTS.forEach((ing,k)=>{const fill=box(cold,.5,1,.5,-1.2+k*.55,0,1.72,ing.color);crates.push(fill);});
 // Front counter with registers, order kiosks, queue posts.
 const counter=tag(new THREE.Group(),{tab:'orders'});world.add(counter);box(counter,10,1.1,.9,-4.4,.55,.6,'#7a4d33');box(counter,10.2,.08,1,-4.4,1.12,.6,'#c8462f');
 for(let i=0;i<EQUIPMENT.registers.max;i++){const [x,z]=LAYOUT.register(i),g=new THREE.Group();g.position.set(x,1.16,z);counter.add(g);box(g,.5,.12,.4,0,.06,0,'#2f3a42');const screen=box(g,.45,.32,.05,0,.32,-.1,'#84d8d3');screen.rotation.x=-.3;registers.push(g);}
 for(let i=0;i<EQUIPMENT.kiosks.max;i++){const [x,z]=LAYOUT.kiosk(i),g=tag(new THREE.Group(),{tab:'room'});g.position.set(x,0,z);world.add(g);box(g,.7,.08,.5,0,.04,0,'#2f3a42');box(g,.18,1.2,.18,0,.6,0,'#2f3a42');const screen=box(g,.75,1.05,.12,0,1.6,.05,'#1f2a33');box(g,.62,.88,.02,0,1.6,.13,'#84d8d3',false);kiosks.push(g);}
 for(let k=0;k<6;k++)for(const x of [-6.3,-4.7]){cyl(world,.06,.95,x,.48,3.2+k*1.1,'#c9a24a',8);}
 // Dining room tables with four stools each, plus what sits on them.
 for(let i=0;i<EQUIPMENT.tables.max;i++){const [x,z]=LAYOUT.table(i),g=tag(new THREE.Group(),{tab:'room',table:i});g.position.set(x,0,z);world.add(g);box(g,1.25,.06,1.25,0,.78,0,'#b98a52');cyl(g,.08,.75,0,.38,0,'#2f3a42',8);for(const [sx,sz] of SEATS)cyl(g,.22,.45,sx,.23,sz,'#c8462f',10);
  const meal=new THREE.Group();box(meal,.5,.03,.38,0,0,0,'#c8462f');box(meal,.2,.12,.2,-.1,.08,0,'#e3b26b');box(meal,.1,.2,.1,.15,.12,.08,'#6aa5d8');meal.position.set(0,.83,0);g.add(meal);const mess=new THREE.Group();box(mess,.5,.03,.38,0,0,0,'#8e979c');box(mess,.16,.05,.12,.08,.05,.04,'#d8d0c0');mess.position.set(.15,.83,.2);g.add(mess);Object.assign(g.userData,{meal,mess});tables.push(g);}
 // Delivery van at the back door.
 const van=tag(new THREE.Group(),{tab:'inbound'});scene.add(van);box(van,2,1.7,3.2,0,1.25,-.6,'#e8ecef');box(van,1.98,1.4,1.5,0,1.05,1.55,'#c8462f');box(van,1.7,.6,.05,0,1.5,2.31,'#405a6d');for(const sx of [-1.05,1.05])for(const sz of [-1.5,1.6]){const t=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.2,14),mat('#2e3941'));t.rotation.z=Math.PI/2;t.position.set(sx,.38,sz);van.add(t);}label(van,'FRAIS',0,1.6,-2.22,1.4,'#fff5e1','#3f6984');van.visible=false;

 // People: a shared builder with articulated legs and arms; staff wear role colours, guests random shirts.
 function person(shirt,{cap=null,apron=null,skin='#d3a58b'}={}){const g=new THREE.Group(),body=new THREE.Group(),legs=[],arms=[];g.add(body);box(body,.38,.6,.25,0,1.05,0,'#34434e');box(body,.43,.42,.29,0,1.16,0,shirt);if(apron)box(body,.36,.5,.04,0,.95,.16,apron);box(body,.28,.29,.28,0,1.52,0,skin);if(cap)box(body,.34,.09,.34,0,1.71,0,cap);
  for(const x of [-.13,.13]){const leg=new THREE.Group();leg.position.set(x,.78,0);body.add(leg);box(leg,.13,.66,.15,0,-.33,0,'#2f3a42');box(leg,.15,.1,.27,0,-.72,.07,'#26333b');legs.push(leg);}
  for(const x of [-.28,.28]){const arm=new THREE.Group();arm.position.set(x,1.26,.03);body.add(arm);box(arm,.11,.45,.12,0,-.225,0,skin);arms.push(arm);}
  const carry=new THREE.Group();carry.position.set(0,.95,.38);body.add(carry);const tray=box(carry,.5,.04,.38,0,0,0,'#c8462f');box(carry,.18,.1,.16,-.08,.07,0,'#e3b26b');const bag=box(carry,.36,.42,.24,0,.1,0,'#b98a52');carry.visible=false;
  g.userData.gait={body,legs,arms,work:0};g.userData.carry={group:carry,tray,bag};return g;}
 function remove(map,id){const g=map.get(id);if(!g)return;g.traverse(o=>{if(o.geometry)o.geometry.dispose();});scene.remove(g);map.delete(id);const i=clickables.indexOf(g);if(i>=0)clickables.splice(i,1);}
 function animate(g,motion,{working=false,sitting=false,carrying=null}={},elapsed=0){const gait=g.userData.gait;gait.work+=elapsed*9;const swing=sitting?0:Math.sin(motion.stride)*motion.walk;
  gait.legs.forEach((leg,i)=>leg.rotation.x=sitting?-1.35:swing*(i?-.42:.42));gait.arms.forEach((arm,i)=>arm.rotation.x=carrying?-1.05:working?-.75+Math.sin(gait.work+i*1.7)*.3:swing*(i?.3:-.3));gait.body.position.y=sitting?-.42:(1-Math.cos(motion.stride*2))*.012*motion.walk;
  const c=g.userData.carry;c.group.visible=Boolean(carrying);c.tray.visible=carrying==='tray';c.bag.visible=carrying==='bag';}
 const faceTo=(motion,x,z,elapsed)=>{const turn=Math.atan2(x-motion.x,z-motion.z)-motion.heading;motion.heading+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-8*elapsed));};

 function sync(fraction=0,elapsedMinutes=0){const t=restaurantNow(state)+fraction;clock+=elapsedMinutes;
  const show=(list,count)=>list.forEach((g,i)=>g.visible=i<count);show(grills,state.equipment.grills);show(fryers,state.equipment.fryers);show(assemblies,state.equipment.assembly);show(registers,state.equipment.registers);show(kiosks,state.equipment.kiosks);show(tables,state.equipment.tables);
  const kitchenOrders=state.orders.filter(o=>o.stage==='kitchen');
  grills.forEach((g,i)=>{const load=kitchenOrders.reduce((n,o)=>n+(o.grill.state==='active'&&o.grill.station===i?o.grill.need:0),0);g.userData.patties.forEach((p,k)=>p.visible=k<Math.min(STATION_CAPACITY.grill,load));g.userData.flame.material.opacity=load?.25+.15*Math.sin(clock*40+i):0;});
  fryers.forEach((g,i)=>{const active=kitchenOrders.some(o=>o.fry.state==='active'&&o.fry.station===i);g.userData.basket.position.y=active?1.02:1.35;g.userData.fries.material=mat(active?'#e9c25a':'#f5d36b');});
  assemblies.forEach((g,i)=>{g.userData.burger.visible=kitchenOrders.some(o=>o.assemble.state==='active'&&o.assemble.station===i);});
  const readyOrders=state.orders.filter(o=>o.stage==='ready');ready.forEach((g,i)=>{const o=readyOrders[i];g.visible=Boolean(o);if(o){g.userData.tray.visible=o.channel==='dine';g.userData.bag.visible=o.channel!=='dine';}});
  INGREDIENTS.forEach((ing,k)=>{const ratio=Math.min(1,ingredientStock(state,ing.id)/Math.max(1,restockRule(state,ing.id).trigger*1.6)),c=crates[k];c.scale.y=Math.max(.02,ratio);c.position.y=.1+ratio/2;});
  tables.forEach((g,i)=>{const tb=state.tables[i],guest=tb&&state.customers.find(c=>c.id===tb.guest);g.userData.meal.visible=Boolean(guest&&guest.phase==='eating');g.userData.mess.visible=tb?.state==='dirty';});
  // Staff.
  for(const w of state.workers){if(!staff.has(w.id)){const g=tag(person(UNIFORM[w.role],{cap:w.role==='cashier'?'#f2b938':w.role==='floor'?'#26333b':'#f2f2ee',apron:['grill','fryer','assembly'].includes(w.role)?'#26333b':null}),{tab:w.role==='floor'?'room':w.role==='cashier'?'orders':'kitchen'});scene.add(g);staff.set(w.id,g);}
   const g=staff.get(w.id);g.userData.motion??=createWorkerMotion(w,fraction);const motion=updateWorkerMotion(g.userData.motion,w,fraction,elapsedMinutes);
   const target=w.role==='grill'?LAYOUT.grill(w.station??0):w.role==='fryer'?LAYOUT.fryer(w.station??0):w.role==='assembly'?LAYOUT.assembly(w.station??0):w.role==='cashier'?[motion.x,motion.z+2]:w.phase==='cleaning'?LAYOUT.table(w.job??0):null;
   if(target&&!w.path.length)faceTo(motion,target[0],target[1],elapsedMinutes);g.position.set(motion.x,0,motion.z);g.rotation.y=motion.heading;animate(g,motion,{working:w.phase==='working'||w.phase==='cleaning'},elapsedMinutes);}
  for(const id of [...staff.keys()])if(!state.workers.some(w=>w.id===id))remove(staff,id);
  // Guests: a group follows its leader; at the table everyone sits on a stool facing the meal.
  for(const c of state.customers){if(!guests.has(c.id)){const g=tag(new THREE.Group(),{tab:'room'});g.userData.members=Array.from({length:c.size},(_,k)=>{const p=person(SHIRTS[(c.look+k)%SHIRTS.length],{skin:['#d3a58b','#a87b5d','#7d5a44','#f0c9a8'][(c.look+k*3)%4]});g.add(p);return p;});scene.add(g);guests.set(c.id,g);}
   const g=guests.get(c.id);g.userData.motion??=createWorkerMotion(c,fraction);const motion=updateWorkerMotion(g.userData.motion,c,fraction,elapsedMinutes);
   const eating=c.phase==='eating'&&c.table!==null,carrying=['to_table','seating'].includes(c.phase)?'tray':c.phase==='leaving'&&c.order!==null?'bag':null;
   if(eating){const [tx,tz]=LAYOUT.table(c.table);g.position.set(tx,0,tz);g.rotation.y=0;g.userData.members.forEach((m,k)=>{m.position.set(SEATS[k][0]*.82,0,SEATS[k][1]*.82);m.rotation.y=Math.atan2(-SEATS[k][0],-SEATS[k][1]);animate(m,{stride:0,walk:0},{sitting:true},elapsedMinutes);});continue;}
   if(['ordering','queue','waiting'].includes(c.phase)&&!c.path.length){const p=c.phase==='ordering'?c.spot?.kind==='kiosk'?LAYOUT.kiosk(c.spot.index):LAYOUT.register(c.spot?.index??0):LAYOUT.pass;faceTo(motion,p[0],p[1],elapsedMinutes);}
   g.position.set(motion.x,0,motion.z);g.rotation.y=motion.heading;g.userData.members.forEach((m,k)=>{m.position.set(FOLLOW[k][0],0,FOLLOW[k][1]);m.rotation.y=0;animate(m,motion,{carrying:k===0?carrying:null},elapsedMinutes);});}
  for(const id of [...guests.keys()])if(!state.customers.some(c=>c.id===id))remove(guests,id);
  // The fresh-food van reverses to the back door for its delivery, then leaves.
  const delivery=state.shipments.filter(s=>t>=s.eta-2).sort((a,b)=>a.eta-b.eta)[0];let target={x:30,z:-13,heading:-Math.PI/2,visible:false};
  if(delivery){const since=t-delivery.eta;target=since<0?{x:13+(-since)*9,z:-13.6,heading:-Math.PI/2+(1+since/2)*(Math.PI/2),visible:true}:{x:13,z:-12.6,heading:Math.PI,visible:true};}
  const drive=van.userData.drive=followVehicle(van.userData.drive,target,elapsedMinutes,30);van.visible=target.visible;van.position.set(drive.x,0,drive.z);van.rotation.y=drive.heading;}

 let start=null;const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 canvas.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);ray.setFromCamera(pointer,camera);for(const hit of ray.intersectObjects(clickables,true)){let o=hit.object;while(o&&!o.userData.selection)o=o.parent;if(o&&o.visible!==false){onSelect(o.userData.selection);break;}}});
 function resize(){const rect=canvas.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);camera.left=-17*aspect;camera.right=17*aspect;camera.top=17;camera.bottom=-17;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false);}
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();sync();
 return {update(delta,{fraction=0,elapsedMinutes=0}={}){if(lastState!==state)lastState=state;sync(fraction,elapsedMinutes);keyboard.update(delta);controls.update();renderer.render(scene,camera);},reset(){for(const map of [staff,guests])for(const id of [...map.keys()])remove(map,id);van.userData.drive=null;sync();},resetCamera(){keyboard.reset();},dispose(){observer.disconnect();keyboard.dispose();controls.dispose();renderer.dispose();}};
}
