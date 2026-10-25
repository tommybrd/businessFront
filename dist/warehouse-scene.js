import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createKeyboardCameraControls} from './camera-controls.js';
import {warehouseFixture,warehouseAccess,warehouseNow,packingMinutes,shelvingMinutes,cartonType,WH_COURIER} from './warehouse-engine.js';
// Parcel size follows the carton the engine picks for the order's content.
const CARTONS={S:[.42,.3,.34],M:[.58,.42,.46],L:[.74,.52,.58]};
export const cartonSize=o=>CARTONS[cartonType(o)];
import {createWorkerMotion,updateWorkerMotion,followVehicle} from './warehouse-motion.js';
export function createWarehouseScene(canvas,state,onSelect,onPlace=()=>{}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor('#b3bec6');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-23,23,16,-16,.1,140);camera.position.set(29,35,39);camera.lookAt(0,0,3);
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,0,3);controls.enableDamping=true;controls.minZoom=.65;controls.maxZoom=3.2;controls.minPolarAngle=.4;controls.maxPolarAngle=1.18;controls.enablePan=true;controls.screenSpacePanning=false;
 const keyboard=createKeyboardCameraControls(camera,controls),sun=new THREE.DirectionalLight('#fff1dc',3.2);sun.position.set(-15,30,16);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28});sun.shadow.normalBias=.035;scene.add(sun,new THREE.HemisphereLight('#eff7ff','#6c7880',2.5));
 const materials=new Map(),actors=new Map(),racks=new Map(),benches=new Map(),vans=new Map(),inbounds=new Map(),couriers=new Map(),clickables=[];let arranged=false,selectedKey=null,lastState=state;
 const mat=color=>{if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.8,metalness:.08}));return materials.get(color);};
 function box(parent,w,h,d,x,y,z,color,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;}
 function label(parent,text,x,y,z,width=3,color='#e5eaf0',bg='#263645'){
  const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,100);ctx.font='700 47px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,51,480);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/5.12),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 function tag(group,data){group.userData.selection=data;clickables.push(group);return group;}
 const yard=new THREE.Group();scene.add(yard);box(yard,45,.35,39,0,-.5,4,'#71857e');box(yard,36,.26,25,0,-.15,0,'#d4dadc');box(yard,39,.08,9,0,-.25,17,'#58646d');
 for(let x=-18;x<18;x+=3.2)box(yard,1.55,.012,.16,x,-.19,17,'#e6e3ca',false);
 for(const x of [-17.8,17.8])box(yard,.3,3.2,24,x,1.45,0,'#a7b5bf');box(yard,36,3.2,.35,0,1.45,-12.3,'#b6c3cb');
 for(let x=-16;x<=16;x+=8){box(yard,.28,4.5,.28,x,2.15,-11.8,'#657580');box(yard,3.6,.08,.3,x,4.2,-10,'#f8f2da');}
 // Main traffic aisle is painted onto the floor, rather than floating labels.
 box(yard,31,.025,.1,0,.006,7.1,'#ddad45',false);box(yard,31,.025,.1,0,.006,10.6,'#ddad45',false);
 for(let x=-15;x<15;x+=1)box(yard,.6,.025,.08,x,.01,7.6,'#e8b34c',false);
 for(const [x,color]of [[-12,'#75acaa'],[11,'#dca651']]){box(yard,7,.04,3,x,.02,10,'#a8b2b6',false);for(let z=8.8;z<11.4;z+=.55)box(yard,6.4,.025,.14,x,.05,z,color,false);box(yard,7,.8,.28,x,.4,12,'#536572');box(yard,7.3,.2,3,x,3.5,12.5,'#435361');for(const side of [-1,1])box(yard,.2,3.7,.2,x+side*3.65,1.7,11.8,'#536572');}
 label(yard,'RÉCEPTION',-12,2.65,11.85,4.1,'#d5f0ef');label(yard,'EXPÉDITION',11,2.65,11.85,4.1,'#f5dfae');
 const conveyor=tag(new THREE.Group(),{tab:'production'});scene.add(conveyor);box(conveyor,2.6,.65,7.3,4.4,.4,2.8,'#415564');box(conveyor,2.25,.1,7.3,4.4,.78,2.8,'#344047');for(let z=-.5;z<=6.3;z+=.4)box(conveyor,2.2,.04,.12,4.4,.86,z,'#91a0a9');for(const x of [3.35,5.45])box(conveyor,.08,.45,7.5,x,.85,2.8,'#e8af3f');
 const staging=new THREE.Group();scene.add(staging);for(let x=6.5;x<=13;x+=3.2){box(staging,3,.04,2.3,x,.025,7.2,'#b7bdbe');for(let z=6.1;z<=8.3;z+=.5)box(staging,2.9,.02,.08,x,.05,z,'#ddad45',false);}
 const parcelGroup=new THREE.Group();scene.add(parcelGroup);const parcels=[];for(let i=0;i<36;i++){const g=tag(new THREE.Group(),{tab:'dispatch'});box(g,.58,.42,.46,0,.3,0,'#bd9060');box(g,.09,.012,.47,0,.515,0,'#edc589');box(g,.17,.12,.012,.12,.35,.24,'#efe9d9',false);parcelGroup.add(g);parcels.push(g);}
 const waitingBins=[];for(let i=0;i<12;i++){const g=tag(new THREE.Group(),{tab:'production'});box(g,.7,.16,.55,0,.9,0,'#79949e');for(const x of [-.33,.33])box(g,.05,.36,.55,x,1.1,0,'#79949e');for(const z of [-.25,.25])box(g,.7,.36,.05,0,1.1,z,'#79949e');const goods=box(g,.45,.34,.32,0,1.15,0,'#c49b6e');g.userData.goods=goods;scene.add(g);waitingBins.push(g);}
 const selectedRing=new THREE.Mesh(new THREE.RingGeometry(.8,.93,32),new THREE.MeshBasicMaterial({color:'#f2b644',side:THREE.DoubleSide,transparent:true,opacity:.9}));selectedRing.rotation.x=-Math.PI/2;selectedRing.position.y=.07;scene.add(selectedRing);selectedRing.visible=false;
 function makeRack(p){const g=tag(new THREE.Group(),{tab:'stock',productId:p.id,fixture:'rack:'+p.id});scene.add(g);for(const x of [-2.3,2.3])for(const z of [-.67,.67])box(g,.1,3.8,.1,x,1.9,z,'#4d667a');for(let y=.35;y<3.7;y+=.8){box(g,4.8,.1,1.6,0,y,0,'#7b91a2');box(g,4.8,.09,.08,0,y+.05,.84,'#d69f39');}
  const slots=[];for(let level=0;level<4;level++)for(let col=0;col<6;col++){const b=new THREE.Group();for(const z of [-.32,.32]){const row=new THREE.Group();row.position.z=z;productItems(row,p,level*6+col+(z>0?3:0));b.add(row);}b.scale.set(1.25,1.45,1.15);b.position.set(-1.9+col*.76,.4+level*.8,0);g.add(b);slots.push(b);}label(g,p.short,0,.15,.88,2.6);g.userData.slots=slots;return g;}
 // Loose products on the shelves, recognisable by family; cartons only appear at the packing benches.
 function productItems(b,p,i){const base=new THREE.Color(p.color),shade=n=>'#'+base.clone().offsetHSL(0,0,n).getHexString(),cyl=(r,h,x,y,z,color)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,12),mat(color));m.position.set(x,y,z);m.castShadow=true;b.add(m);return m;};
  if(p.id==='books')for(let k=0;k<6;k++)box(b,.09,.42+(k*7+i)%3*.06,.5,-.25+k*.1,.24+(k*7+i)%3*.03,0,k%2?p.color:shade(k%3?-.18:.12));
  else if(p.id==='tech')for(let k=0;k<3;k++){box(b,.18,.34,.07,-.22+k*.22,.17,-.12,'#2f3b46');box(b,.15,.27,.012,-.22+k*.22,.18,-.08,p.color);box(b,.2,.1,.32,-.22+k*.22,.05,.15,shade(-.15));}
  else if(p.id==='home'){for(const [x,z]of [[-.2,-.12],[.05,.1],[.22,-.1]]){cyl(.1,.32,x,.16,z,p.color);cyl(.06,.06,x,.35,z,shade(-.2));}}
  else if(p.id==='toys'){box(b,.4,.26,.3,-.08,.13,-.05,p.color);box(b,.24,.18,.24,.18,.35,.05,'#efc35a');const ball=new THREE.Mesh(new THREE.SphereGeometry(.11,12,10),mat('#6aa5d8'));ball.position.set(.2,.11,.15);ball.castShadow=true;b.add(ball);}
  else if(p.id==='beauty')for(let k=0;k<4;k++){const x=-.24+k*.16;cyl(.055,.26,x,.13,k%2?.1:-.08,k%2?p.color:shade(.15));cyl(.03,.07,x,.3,k%2?.1:-.08,'#e8e4ef');}
  else for(let k=0;k<4;k++)box(b,.5,.08,.42,(k%2)*.04-.02,.05+k*.09,0,k%2?p.color:shade(-.12));}
 function makeBench(index){const g=tag(new THREE.Group(),{tab:'production',fixture:'pack:'+index});scene.add(g);box(g,3.2,.16,1.7,0,1.1,0,'#c8ba9a');for(const x of [-1.3,1.3])for(const z of [-.6,.6])box(g,.1,1.1,.1,x,.5,z,'#556b7a');box(g,.55,.7,.1,-1.1,1.55,-.6,'#263946');box(g,.45,.5,.03,-1.1,1.57,-.53,'#88b4b8');box(g,.65,.12,.45,.9,1.25,-.1,'#d5b38c');const carton=box(g,.7,.55,.6,0,1.46,.1,'#bb8d5b'),flaps=new THREE.Group(),lid=box(g,.72,.04,.62,0,1.755,.1,'#c99a66'),tape=box(g,.12,.012,.64,0,1.78,.1,'#e9d9a6',false),tote=new THREE.Group();
  for(const side of [-1,1]){const flap=box(flaps,.02,.3,.6,side*.4,1.86,.1,'#c99a66');flap.rotation.z=side*-.55;}g.add(flaps);box(tote,.55,.3,.42,0,0,0,'#5f8197');const goods=box(tote,.42,.18,.3,0,.12,0,'#c49b6e');tote.position.set(.9,1.46,-.1);g.add(tote);
  Object.assign(g.userData,{carton,flaps,lid,tape,tote,goods});return g;}
 function makeActor(w){const g=tag(new THREE.Group(),{tab:w.robot?'robots':'team',workerId:w.id});scene.add(g);if(w.robot){box(g,1.05,.32,.9,0,.3,0,'#e6a239');box(g,1.12,.12,.96,0,.15,0,'#34434e');box(g,.95,.13,.8,0,.54,0,'#64747f');box(g,.15,.38,.15,0,.65,-.3,'#263c48');box(g,.11,.08,.11,0,.86,-.3,'#84d8d3');}else{
   const body=new THREE.Group(),legs=[],arms=[];g.add(body);g.userData.gait={body,legs,arms,pushing:['picking','receiving'].includes(w.role)};
   box(body,.38,.6,.25,0,1.05,0,'#426c89');box(body,.43,.4,.29,0,1.15,0,w.role==='picking'?'#dca745':w.role==='receiving'?'#6db6ae':'#97b2c5');box(body,.28,.29,.28,0,1.52,0,'#d3a58b');box(body,.35,.08,.32,0,1.71,0,'#d9b651');
   for(const x of [-.13,.13]){const leg=new THREE.Group();leg.position.set(x,.78,0);body.add(leg);box(leg,.13,.66,.15,0,-.33,0,'#30424d');box(leg,.15,.1,.27,0,-.72,.07,'#26333b');legs.push(leg);}
   for(const x of [-.28,.28]){const arm=new THREE.Group();arm.position.set(x,1.26,.03);body.add(arm);box(arm,.11,.45,.12,0,-.225,0,'#d3a58b');arms.push(arm);}
  }
  if(!w.robot&&w.role==='receiving'){
   // Pallet jack: forks under a wooden pallet, steering body and tow handle held by the receiver.
   for(const x of [-.26,.26])box(g,.16,.07,1.25,x,.06,1.05,'#c8462f');box(g,.7,.32,.26,0,.2,.38,'#c8462f');for(const x of [-.2,.2]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.08,10),mat('#2f3a42'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.08,.36);g.add(wheel);}
   const handle=box(g,.06,.8,.06,0,.65,.27,'#3d4a54');handle.rotation.x=-.45;box(g,.34,.06,.06,0,1.0,.1,'#3d4a54');
   for(const z of [.55,1.05,1.55])box(g,1.0,.06,.12,0,.13,z,'#a87b48');for(const x of [-.42,0,.42])box(g,.12,.08,1.1,x,.2,1.05,'#b98a52');box(g,1.0,.05,1.1,0,.265,1.05,'#c79a62');
  }
  if(!w.robot&&w.role==='picking'){box(g,.98,.13,1.18,0,.35,.65,'#d7a13e');for(const x of [-.42,.42]){box(g,.055,.72,.055,x,.75,.15,'#587184');box(g,.14,.16,.18,x,.2,.23,'#34434e');box(g,.14,.16,.18,x,.2,1.1,'#34434e');}box(g,.9,.07,.08,0,1.1,.15,'#587184');}g.position.set(w.pos[0],0,w.pos[1]);const load=new THREE.Group();g.add(load);
  // A full pallet holds 10 cartons of 24 (2 × 2 per layer); other roles carry up to four totes.
  if(!w.robot&&w.role==='receiving'){for(let i=0;i<10;i++){const c=box(load,.44,.34,.5,(i%2-.5)*.48,.46+Math.floor(i/4)*.35,.78+Math.floor(i%4/2)*.54,'#bc915f');box(c,.08,.012,.51,0,.175,0,'#e2c58f',false);}}
  else{for(let i=0;i<4;i++)box(load,.43,.35,.4,(i%2-.5)*.46,.9+Math.floor(i/2)*.38,.54,'#5f8197');load.position.y=w.robot?-.1:-.325;}g.userData.load=load;return g;}
 function vehicle(color,heavy=false,name=heavy?'INBOUND':'FLUX'){const g=new THREE.Group();box(g,heavy?2.5:2.05,heavy?2.4:1.8,heavy?5.4:3.4,0,heavy?1.65:1.4,-.7,color);box(g,heavy?2.4:2.03,1.5,1.7,0,1.15,heavy?2.85:1.7,'#e4e6df');box(g,1.8,.65,.05,0,1.6,heavy?3.71:2.56,'#405a6d');for(const x of [-1.12,1.12])for(const z of [heavy?-2.4:-1.6,heavy?2.65:1.75]){const tire=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.2,14),mat('#2e3941'));tire.rotation.z=Math.PI/2;tire.position.set(x,.43,z);g.add(tire);}box(g,.15,.15,.15,-.7,1,heavy?3.75:2.6,'#f0dba3');box(g,.15,.15,.15,.7,1,heavy?3.75:2.6,'#f0dba3');label(g,name,0,1.8,heavy?-3.43:-2.43,heavy?1.7:1.5,'#f9e9c9',color);return g;}
 function remove(map,id){const g=map.get(id);if(!g)return;g.traverse(o=>{o.geometry?.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});scene.remove(g);if(g.userData.parcel){scene.remove(g.userData.parcel);g.userData.parcel.geometry.dispose();}map.delete(id);const i=clickables.indexOf(g);if(i>=0)clickables.splice(i,1);}
 function sync(fraction=0,elapsedMinutes=0){
  for(const p of state.products){if(!racks.has(p.id))racks.set(p.id,makeRack(p));const g=racks.get(p.id),f=warehouseFixture(state,'rack:'+p.id);g.position.set(f.x,0,f.z);g.rotation.y=f.rotation;const visible=Math.ceil(p.onHand/p.capacity*24);g.userData.slots.forEach((slot,i)=>slot.visible=i<visible);}
  for(let i=0;i<state.benches;i++){if(!benches.has(i))benches.set(i,makeBench(i));const g=benches.get(i),p=warehouseFixture(state,'pack:'+i);g.position.set(p.x,0,p.z);g.rotation.y=p.rotation;
   // The bench shows the packing steps of its packer: form the carton, transfer the items, close the flaps, tape.
   const packer=state.workers.find(w=>w.role==='packing'&&w.phase==='packing'&&w.bench===i),o=packer&&state.orders.find(o=>o.id===packer.job),progress=o?Math.min(1,Math.max(0,1-(packer.remaining-fraction)/packingMinutes(o))):0,u=g.userData,height=.15+.85*Math.min(1,progress/.25);
   const [cx,cy,cz]=o?cartonSize(o):[.7,.55,.6];u.carton.visible=Boolean(o);u.carton.scale.set(cx/.7,height*cy/.55,cz/.6);u.carton.position.y=1.18+cy*height/2;u.flaps.scale.set(cx/.7,1,cz/.6);u.flaps.position.y=1.18+cy-1.735;u.lid.scale.set(cx/.7,1,cz/.6);u.lid.position.y=1.2+cy;u.tape.scale.z=cz/.6;u.tape.position.y=1.225+cy;u.flaps.visible=Boolean(o)&&progress>=.25&&progress<.6;u.lid.visible=Boolean(o)&&progress>=.6;u.tape.visible=Boolean(o)&&progress>=.82;
   u.tote.visible=Boolean(o)&&progress<.55;if(o){u.goods.material=mat(state.products.find(p=>p.id===o.lines[0].productId).color);u.goods.scale.y=Math.max(.05,1-Math.max(0,progress-.25)/.3);}
  }
  for(const id of [...benches.keys()])if(id>=state.benches)remove(benches,id);
  for(const w of state.workers){
   if(!actors.has(w.id))actors.set(w.id,makeActor(w));const g=actors.get(w.id);
   g.userData.motion??=createWorkerMotion(w,fraction);const motion=updateWorkerMotion(g.userData.motion,w,fraction,elapsedMinutes);
   g.position.set(motion.x,0,motion.z);g.rotation.y=motion.heading;g.visible=w.phase!=='driving';
   if(w.role==='packing'&&w.phase==='packing'){const bench=warehouseFixture(state,'pack:'+w.bench),turn=Math.atan2(bench.x-motion.x,bench.z-motion.z)-motion.heading;motion.heading+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-6*elapsedMinutes));g.rotation.y=motion.heading;}
   // While shelving, the receiver parks the pallet alongside the rack instead of pushing the forks into it.
   if(w.role==='receiving'&&w.phase==='storing'){const rack=warehouseFixture(state,'rack:'+w.productId),turn=rack.rotation+Math.PI/2-motion.heading;motion.heading+=Math.atan2(Math.sin(turn),Math.cos(turn))*(1-Math.exp(-6*elapsedMinutes));g.rotation.y=motion.heading;}
   const carrying=w.role==='packing'&&(w.phase==='to_staging'||w.phase==='to_bench'&&w.cargo>0),gait=g.userData.gait;
   if(gait){const swing=Math.sin(motion.stride)*motion.walk;gait.work=(gait.work??0)+elapsedMinutes*9;gait.legs.forEach((leg,i)=>leg.rotation.x=swing*(i?-.42:.42));gait.arms.forEach((arm,i)=>arm.rotation.x=gait.pushing?-.35:carrying?-1.05:w.phase==='packing'?-.75+Math.sin(gait.work+i*1.7)*.3:swing*(i?.3:-.3));gait.body.position.y=(1-Math.cos(motion.stride*2))*.012*motion.walk;}
   // Packers hold the tote on the way to their bench, then the closed parcel on the way to shipping.
   const load=g.userData.load;if(w.role==='packing'){load.visible=carrying;load.position.set(.23,.02,-.14);const job=state.orders.find(o=>o.id===w.job),size=w.phase==='to_staging'&&job?cartonSize(job):[.43,.35,.4];load.children.forEach((b,i)=>{b.visible=i===0;if(!i){b.material=mat(w.phase==='to_staging'?'#bc915f':'#5f8197');b.scale.set(size[0]/.43,size[1]/.35,size[2]/.4);}});}
   else if(w.role==='receiving'&&!w.robot){const cartons=w.phase==='loading'?Math.ceil(w.quantity/24*Math.min(1,1-(w.remaining-fraction)/4)):Math.ceil(w.cargo/24*(w.phase==='storing'?Math.max(0,w.remaining-fraction)/shelvingMinutes(w.cargo):1));load.visible=cartons>0;load.children.forEach((b,i)=>b.visible=i<cartons);}else{load.visible=w.cargo>0;load.children.forEach((b,i)=>b.visible=i<Math.ceil(Math.min(1,w.cargo/12)*4));}
  }
  for(const id of [...actors.keys()])if(!state.workers.some(w=>w.id===id))remove(actors,id);
  // Totes ride the conveyor from the pickers' drop point to the packers' end, at belt speed.
  const waiting=state.orders.filter(o=>o.stage==='await_pack').slice(0,waitingBins.length),ids=new Set(waiting.map(o=>o.id));
  for(const g of waitingBins)if(!ids.has(g.userData.orderId)){g.userData.orderId=null;g.visible=false;}
  waiting.forEach((o,i)=>{let g=waitingBins.find(g=>g.userData.orderId===o.id),x=4.4+(i<6?.53:-.53),z=-.3+(i%6)*1.05;
   if(!g){g=waitingBins.find(g=>g.userData.orderId===null);g.userData.orderId=o.id;g.userData.x=x;g.userData.z=elapsedMinutes?6.2:z;g.userData.goods.material=mat(state.products.find(p=>p.id===o.lines[0].productId).color);}
   const step=2.5*elapsedMinutes,u=g.userData;u.z+=Math.max(-step,Math.min(step,z-u.z));u.x+=Math.max(-step,Math.min(step,x-u.x));g.visible=true;g.position.set(u.x,0,u.z);});
  const ready=state.orders.filter(o=>o.stage==='ready');parcels.forEach((g,i)=>{g.visible=i<ready.length;if(!ready[i])return;const [x,y,z]=cartonSize(ready[i]);g.scale.set(x/.58,y/.42,z/.46);g.position.set(6.1+(i%6)*1.05,Math.floor(i/18)*.62-.09*y/.42,6.3+Math.floor(i%18/6)*.65);});
  for(const v of state.vans){if(!vans.has(v.id)){const g=tag(vehicle('#3f6984'),{tab:'dispatch',vanId:v.id});scene.add(g);vans.set(v.id,g);}const g=vans.get(v.id),index=state.vans.indexOf(v),remaining=Math.max(0,v.remaining-fraction);let x=10+index*3.3,z=14.5,heading=Math.PI,visible=true,speed=0;
   if(v.phase==='outbound'){const progress=1-remaining/v.duration;x=10+progress*35;z=17;heading=Math.PI/2;visible=progress<.36;speed=35/v.duration;}else if(v.phase==='returning'){const progress=1-remaining/20;x=-30+progress*40;z=17;heading=Math.PI/2;visible=progress>.5;speed=2;}
   const drive=g.userData.drive=followVehicle(g.userData.drive,{x,z,heading,visible},elapsedMinutes,speed);g.visible=visible;g.position.set(drive.x,0,drive.z);g.rotation.y=drive.heading;}
  for(const t of state.shipments){if(t.remaining<=0&&!state.workers.some(w=>w.shipment===t.id))continue;if(!inbounds.has(t.id)){const g=tag(vehicle(t.express?'#b2c9c7':'#668995',!t.express),{tab:'inbound'});scene.add(g);inbounds.set(t.id,g);}const g=inbounds.get(t.id),index=state.shipments.filter(a=>a.remaining>0).indexOf(t),eta=t.eta-warehouseNow(state)-fraction,visible=eta<20;const drive=g.userData.drive=followVehicle(g.userData.drive,{x:eta>0?-32+(1-eta/20)*20:-12-Math.max(0,index)*3.1,z:eta>0?17:15,heading:eta>0?Math.PI/2:Math.PI,visible},elapsedMinutes,1);g.visible=visible;g.position.set(drive.x,0,drive.z);g.rotation.y=drive.heading;}
  for(const id of [...inbounds.keys()])if(!state.shipments.some(t=>t.id===id&&(t.remaining>0||state.workers.some(w=>w.shipment===id))))remove(inbounds,id);
  // Courier: a small van comes from the road, parks at the shipping dock, loads the parcel and leaves.
  const clockNow=warehouseNow(state)+fraction,riding=state.orders.filter(o=>o.courier&&o.stage==='in_transit'&&Number.isFinite(o.courierEta));
  for(const o of riding){const t=clockNow-(o.courierEta-WH_COURIER.minutes);if(!couriers.has(o.id)){const g=tag(vehicle('#d0603a',false,'COURSIER'),{tab:'dispatch'});g.scale.setScalar(.72);const parcel=box(scene,.5,.38,.42,15.6,.2,12.9,'#bd9060');g.userData.parcel=parcel;scene.add(g);couriers.set(o.id,g);}
   const g=couriers.get(o.id),[cx,cy,cz]=cartonSize(o);let target;if(t<1.5)target={x:40-22.5*t/1.5,z:17,heading:-Math.PI/2,visible:true};else if(t<4)target={x:17.5,z:14.5,heading:Math.PI,visible:true};else target={x:17.5+(t-4)*7.5,z:17,heading:Math.PI/2,visible:t<8};
   const drive=g.userData.drive=followVehicle(g.userData.drive,target,elapsedMinutes,15);g.visible=target.visible;g.position.set(drive.x,0,drive.z);g.rotation.y=drive.heading;g.userData.parcel.visible=t<3;g.userData.parcel.scale.set(cx/.5,cy/.38,cz/.42);}
  for(const id of [...couriers.keys()])if(!riding.some(o=>o.id===id))remove(couriers,id);
  if(selectedKey){const f=warehouseFixture(state,selectedKey);selectedRing.position.set(f.x,.08,f.z);selectedRing.scale.setScalar(selectedKey.startsWith('rack:')?2.7:1.8);selectedRing.visible=arranged;}else selectedRing.visible=false;
 }
 let start=null;const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 canvas.addEventListener('pointerdown',e=>{start=[e.clientX,e.clientY];});canvas.addEventListener('pointerup',e=>{if(!start||Math.hypot(e.clientX-start[0],e.clientY-start[1])>7)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-((e.clientY-rect.top)/rect.height)*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(clickables,true);let data=null;for(const hit of hits){let object=hit.object;while(object&&!object.userData.selection)object=object.parent;if(object){data=object.userData.selection;break;}}
  if(arranged){if(data?.fixture){selectedKey=data.fixture;onSelect({...data,arranging:true});}else if(selectedKey){const p=ray.ray.intersectPlane(floor,new THREE.Vector3());if(p)onPlace(selectedKey,p.x,p.z);}return;}if(data)onSelect(data);
 });
 function resize(){const rect=canvas.getBoundingClientRect(),aspect=rect.width/Math.max(1,rect.height);camera.left=-19*aspect;camera.right=19*aspect;camera.top=19;camera.bottom=-19;camera.updateProjectionMatrix();renderer.setSize(rect.width,rect.height,false);}
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();sync();
 return {update(delta,{fraction=0,elapsedMinutes=0}={}){if(lastState!==state)lastState=state;sync(fraction,elapsedMinutes);keyboard.update(delta);controls.update();renderer.render(scene,camera);},reset(){for(const map of [actors,racks,benches,vans,inbounds,couriers])for(const id of [...map.keys()])remove(map,id);sync();},resetCamera(){keyboard.reset();},setArrange(value){arranged=value;if(!value)selectedKey=null;},get selectedFixture(){return selectedKey;},dispose(){observer.disconnect();keyboard.dispose();controls.dispose();renderer.dispose();}};
}
