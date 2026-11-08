import * as THREE from 'three';
import {STATIONS,SHELVES,SOURCES,REGISTERS,KIOSKS,PICKUP,COWS,PASTURE,DOOR,PRODUCTS,registerOpen,stationTime,stationCaps,shelfCap,sourceCap,sourceOpen,shelfOpen,cowCount,kioskCount,hasTerminal,
 inZone,outZone,shelfZone,stationOpen,visibleUnlocks,MEGAPHONE,adsLevel,PATIENCE,MISSIONS,KIOSK_ORDER} from './arcade-engine.js';

// Low-poly view of the arcade game: stacks, trays, shelves, cash and unlock tiles show the simulated counts.
export function createArcadeScene(canvas,getState){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#9fd46a');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,200),sun=new THREE.DirectionalLight('#fff4e0',2.6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:120});sun.shadow.normalBias=.03;scene.add(sun,sun.target,new THREE.HemisphereLight('#ffffff','#7a9a5a',2.1));
 const mats=new Map(),mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.85}));return mats.get(c);};
 const geo={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,16),sphere:new THREE.SphereGeometry(1,12,10),cap:new THREE.CapsuleGeometry(.28,.5,4,10)};
 function box(p,w,h,d,x,y,z,c,shadow=true){const m=new THREE.Mesh(geo.box,mat(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m;}
 function cyl(p,r,h,x,y,z,c){const m=new THREE.Mesh(geo.cyl,mat(c));m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;}
 function ball(p,r,x,y,z,c,sy=1){const m=new THREE.Mesh(geo.sphere,mat(c));m.scale.set(r,r*sy,r);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;}
 function sprite(w,h,cw=256){const c=document.createElement('canvas');c.width=cw;c.height=Math.round(cw*h/w);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,transparent:true}));s.scale.set(w,h,1);s.renderOrder=20;let last='';s.userData.draw=(key,paint)=>{if(key===last)return;last=key;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);paint(ctx,c.width,c.height);map.needsUpdate=true;};return s;}
 function pill(s,text,{bg='#ffffffee',fg='#2b3a44',size=.5}={}){s.userData.draw(text+bg+fg,(ctx,w,h)=>{ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(4,4,w-8,h-8,h/2-4);ctx.fill();ctx.fillStyle=fg;ctx.font=`800 ${Math.round(h*size)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2+2,w-16);});}
 const repeat=(k,n)=>Array.from({length:Math.max(0,n)},()=>k);

 // Item models. Parts of one colour are merged into a single geometry, so a stack of 40 burgers stays cheap to draw.
 const T=new THREE.Object3D();
 function part(g,{x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0}={}){T.position.set(x,y,z);T.rotation.set(rx,ry,rz);T.scale.set(sx,sy,sz);T.updateMatrix();const c=(g.index?g.toNonIndexed():g.clone());c.applyMatrix4(T.matrix);return c;}
 function merge(list){const pos=[],nor=[];for(const g of list){pos.push(...g.attributes.position.array);nor.push(...g.attributes.normal.array);}const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));m.computeBoundingSphere();return m;}
 const B=()=>new THREE.BoxGeometry(1,1,1),C=(t=1,b=1,seg=14)=>new THREE.CylinderGeometry(t,b,1,seg),S=(ws=12,hs=8,phi=Math.PI)=>new THREE.SphereGeometry(1,ws,hs,0,Math.PI*2,0,phi);
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const potatoGeo=(()=>{const g=new THREE.IcosahedronGeometry(.15,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const k=.9+rnd()*.2;p.setXYZ(i,p.getX(i)*k*1.15,p.getY(i)*k*.78,p.getZ(i)*k*.9);}g.computeVertexNormals();return part(g,{y:.12});})();
 const MODELS={
  potato:[[potatoGeo,'#c4935a']],
  fries:[[part(C(.165,.12,4),{y:.12,sy:.24,ry:Math.PI/4}),'#d8342a'],[merge([part(B(),{y:.2,sx:.25,sy:.035,sz:.18}),...Array.from({length:10},(_,i)=>part(B(),{x:-.09+(i%5)*.045,z:i<5?-.035:.035,y:.27+((i*7)%5)*.012,sx:.032,sy:.17+((i*3)%4)*.02,sz:.032,rz:((i%3)-1)*.12,rx:((i*5)%3-1)*.08}))]),'#f4c542']],
  raw:[[part(C(.17,.17),{y:.035,sy:.06}),'#e8737c'],[merge([0,1,2].map(i=>part(B(),{x:-.07+i*.07,y:.067,sx:.025,sy:.004,sz:.22,ry:.5}))),'#f8dede']],
  steak:[[part(C(.17,.16),{y:.035,sy:.06}),'#6b3a24'],[merge([0,1,2].map(i=>part(B(),{x:-.07+i*.07,y:.067,sx:.03,sy:.004,sz:.26,ry:.7}))),'#2b160c']],
  burger:[[part(C(.19,.18),{y:.035,sy:.07}),'#d9953f'],[part(C(.2,.2),{y:.1,sy:.06}),'#5a2e1a'],[part(B(),{y:.135,sx:.34,sy:.02,sz:.34,ry:Math.PI/4}),'#f5c234'],[part(C(.215,.215),{y:.152,sy:.022}),'#6cbf3d'],
   [part(S(14,8,Math.PI/2),{y:.163,sx:.2,sy:.13,sz:.2}),'#e0a24a'],[merge(Array.from({length:8},(_,i)=>{const a=i*2.4,r=.06+(i%3)*.04;return part(S(5,4),{x:Math.cos(a)*r,z:Math.sin(a)*r,y:.163+Math.sqrt(Math.max(0,1-(r/.2)**2))*.13,sx:.018,sy:.01,sz:.01,ry:a});})),'#fbf0d0']],
  cup:[[part(new THREE.CylinderGeometry(.12,.09,1,14,1,true),{y:.13,sy:.26}),'#f4f2ea']],
  soda:[[part(C(.12,.09),{y:.13,sy:.26}),'#d8342a'],[merge([part(C(.125,.125),{y:.27,sy:.025}),part(C(.015,.015,6),{y:.36,x:.03,sy:.18,rz:.15}),part(B(),{y:.15,sx:.2,sy:.06,sz:.02,z:.11})]),'#fafafa']],
  beef:[[part(new THREE.CapsuleGeometry(.11,.16,4,8),{y:.12,rz:Math.PI/2,sz:1.1}),'#b8323a'],[merge([part(C(.035,.035,8),{y:.12,sy:.44,rz:Math.PI/2}),part(S(8,6),{x:.24,y:.12,sx:.05,sy:.05,sz:.05}),part(S(8,6),{x:-.24,y:.12,sx:.05,sy:.05,sz:.05})]),'#f4efe4']],
  bundle:[[merge([0,1,2,3].map(i=>part(B(),{y:.012+i*.022,sx:.46,sy:.02,sz:.22,ry:(i%2?.04:-.03)}))),'#79c47c'],[merge([part(B(),{y:.045,sx:.08,sy:.095,sz:.225}),part(B(),{y:.098,x:.14,sx:.08,sy:.002,sz:.12})]),'#f2ead2']]};
 const H={potato:.22,fries:.36,raw:.075,steak:.075,burger:.31,cup:.07,soda:.3,beef:.25,bundle:.1};
 function item(kind){const g=new THREE.Group();for(const [gm,c] of MODELS[kind]){const m=new THREE.Mesh(gm,mat(c));m.castShadow=true;g.add(m);}return g;}
 // A stack laid out as a grid of `cols`×`rows` cells, each cell piling up; at most `max` items drawn (the label gives the true count).
 function stackOf(group,list,{cols=1,rows=1,step=.42,dstep=.42,max=60}={}){const key=list.length+':'+list.slice(-8).join(',')+cols+rows;if(group.userData.key===key)return;group.userData.key=key;while(group.children.length)group.remove(group.children[0]);
  const heights=new Map(),per=cols*rows;list.slice(0,max).forEach((k,i)=>{const cell=i%per,col=cell%cols,row=Math.floor(cell/cols),y=heights.get(cell)??0;const m=item(k);m.position.set((col-(cols-1)/2)*step,y,(row-(rows-1)/2)*dstep);m.rotation.y=((i*37)%7-3)*.04;group.add(m);heights.set(cell,y+H[k]);});}
 const carryLayout=n=>n<=10?{}:n<=24?{cols:2,step:.36}:{cols:2,rows:2,step:.36,dstep:.34};
 // Flat icon painted on a pad: what goes there (input) or what comes out of it.
 const ICON={potato:'🥔',fries:'🍟',raw:'🥩',steak:'🍖',burger:'🍔',cup:'🥛',soda:'🥤',beef:'🐄'};
 function padIcon(p,emoji,x=0,z=0,y=.05,size=.75){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.globalAlpha=.85;ctx.font='92px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,64,70);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);p.add(m);return m;}
 function textPlane(text,w,h,{bg='#26343f',fg='#fff',font='900 64px system-ui'}={}){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2+4,c.width-30);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.6}));}

 // Characters.
 function person(color,{hat=null}={}){const g=new THREE.Group(),body=new THREE.Mesh(geo.cap,mat(color));body.position.y=.62;body.castShadow=true;g.add(body);ball(g,.24,0,1.25,0,'#f0c9a8');if(hat)box(g,.42,.12,.42,0,1.47,0,hat);
  const back=new THREE.Group();back.position.set(0,.85,-.38);g.add(back);g.userData.back=back;g.userData.body=body;scene.add(g);return g;}
 // Robot: wheeled box with a screen face and an antenna light, a tray on its back for the load; accent colour per chain.
 function robotModel(accent){const g=new THREE.Group(),body=new THREE.Group();body.position.y=.62;g.add(body);
  for(const x of [-.24,.24])for(const z of [-.18,.18]){const w=cyl(g,.11,.08,x,.11,z,'#3d454b');w.rotation.z=Math.PI/2;}
  box(body,.62,.5,.5,0,-.2,0,'#d5dde1');box(body,.64,.08,.52,0,-.42,0,accent);box(body,.46,.3,.4,0,.2,0,'#e9eef0');box(body,.36,.14,.02,0,.22,.21,'#2b3a44');
  for(const x of [-.08,.08])box(body,.06,.05,.01,x,.23,.222,'#5fe0ff',false);cyl(body,.02,.22,0,.46,0,'#8a959b');const lamp=ball(body,.05,0,.6,0,accent);
  const back=new THREE.Group();back.position.set(0,.27,-.32);g.add(back);g.userData={back,body,lamp,robot:true};scene.add(g);return g;}
 function animate(g,a,t){g.position.set(a.x,0,a.z);g.rotation.y=a.heading;g.userData.body.position.y=.62+(a.moving?Math.abs(Math.sin(t*12))*(g.userData.robot?.02:.07):0);if(g.userData.lamp)g.userData.lamp.visible=!a.moving||Math.sin(t*10)>0;}
 const chainColor=loop=>/fries|potato/i.test(loop)?'#f0a830':/soda|cup/i.test(loop)?'#3a8ee0':/farm|beef|butcher/i.test(loop)?'#7a5a3a':'#d8432f';

 // Ground, restaurant floor, counter, field, kitchen.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,120),mat('#a9db6e'));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 box(scene,19.5,.1,15,4.75,.05,-5,'#f7c97f',false);box(scene,19.5,2.4,.3,4.75,1.2,-12.4,'#e6eef0');box(scene,.3,2.4,1.6,-5,1.2,-11.7,'#e6eef0');box(scene,19.5,.25,.3,4.75,2.5,-12.4,'#5bbf4a',false);
 box(scene,14.4,1,.9,6,.5,-3.2,'#5fd6b4');box(scene,14.4,.08,.95,6,1.04,-3.2,'#eafaf4',false);
 box(scene,6.8,.06,8.2,DOOR[0],.08,2,'#e2b26a',false);box(scene,14,.04,2,2,.03,9.5,'#59646b',false);box(scene,7.6,.05,5.6,1,.075,1.4,'#efd9a6',false);
 // Pickup line: floor marks in front of the left part of the counter and a "Retrait" sign.
 const pickup=new THREE.Group();scene.add(pickup);for(const [x,z] of PICKUP)for(const [w,d,dx,dz] of [[.56,.04,0,-.28],[.56,.04,0,.28],[.04,.56,-.28,0],[.04,.56,.28,0]])box(pickup,w,.015,d,x+dx,.1,z+dz,'#ffffff',false);const sign=textPlane('RETRAIT · bornes',3.2,.5,{bg:'#e8483a'});sign.position.set(1.9,.55,-2.74);pickup.add(sign);
 // Potato field behind a wooden fence, open on the restaurant side; the lower part only exists once "Champ +6" is bought.
 const fence=(p,x1,z1,x2,z2)=>{const n=Math.max(1,Math.round(Math.hypot(x2-x1,z2-z1)/1.2));for(let i=0;i<=n;i++)box(p,.12,.7,.12,x1+(x2-x1)*i/n,.35,z1+(z2-z1)*i/n,'#c98a4a');for(const y of [.32,.58]){const r=box(p,Math.hypot(x2-x1,z2-z1),.07,.06,(x1+x2)/2,y,(z1+z2)/2,'#d89c5a');r.rotation.y=-Math.atan2(z2-z1,x2-x1);}};
 const FX0=-13.6,FX1=-8,fenceSmall=new THREE.Group(),fenceBig=new THREE.Group();scene.add(fenceSmall,fenceBig);
 fence(scene,FX0,-8.9,FX1,-8.9);fence(scene,FX1,-8.9,FX1,-7.2);
 for(const [g,zb] of [[fenceSmall,-3.15],[fenceBig,0]]){fence(g,FX0,-8.9,FX0,zb);fence(g,FX0,zb,FX1,zb);fence(g,FX1,zb,FX1,zb-1.5);}
 // Each plot: a soil bed with two ridges and four potato plants that grow back after harvest; ripe plants flower and show their potatoes.
 const plots=getState().plots.map(p=>{const g=new THREE.Group();g.position.set(p.x,0,p.z);scene.add(g);const soil=[box(g,1.42,.08,1.42,0,.04,0,'#7a4a2a',false),...[-.33,.33].map(dz=>box(g,1.3,.1,.44,0,.1,dz,'#9a6038',false))];
  const plant=new THREE.Group(),flowers=new THREE.Group(),spuds=new THREE.Group();g.add(plant,spuds);
  for(const dz of [-.33,.33])for(const dx of [-.32,.32]){const b=new THREE.Group();b.position.set(dx,.15,dz);plant.add(b);ball(b,.2,0,.1,0,'#3d8a36',.55);ball(b,.15,.09,.19,.05,'#55a744',.6);ball(b,.14,-.08,.2,-.05,'#4b9a3e',.6);
   const f=ball(flowers,.05,dx+.02,.48,dz,'#fbf6e8');f.castShadow=false;const sp=new THREE.Mesh(potatoGeo,mat('#c99a5e'));sp.position.set(dx+.17,.08,dz+.13);sp.scale.setScalar(.75);spuds.add(sp);}
  plant.add(flowers);flowers.position.y=-.15;return {g,plant,flowers,spuds,soil,p};});
 // Sprinklers between the plots once "Arrosage" is bought: rotating jets of droplets, and the soil turns darker (wet).
 const dropMat=new THREE.MeshBasicMaterial({color:'#3fa9f5',transparent:true,opacity:.9,depthWrite:false});
 const sprinklers=[[-11.6,-6.8,1],[-10,-5.2,1],[-11.6,-3.6,1],[-11.6,-2,2],[-10,-2,2]].map(([x,z,zone],k)=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cyl(g,.06,.45,0,.22,0,'#8a959b');cyl(g,.11,.1,0,.48,0,'#3d454b');
  const drops=Array.from({length:30},(_,i)=>{const d=new THREE.Mesh(geo.sphere,dropMat);d.scale.setScalar(.07);d.userData={phase:i/30,lane:i%2};g.add(d);return d;});return {g,drops,zone,spin:k*1.3};});

 // Pasture: darker grass, fence with a gate on the restaurant side, one cow per bought spot; a beef crate appears when ready.
 const farm=new THREE.Group();scene.add(farm);{const P=PASTURE,g=new THREE.Mesh(new THREE.PlaneGeometry(P.x1-P.x0,P.z1-P.z0),mat('#8fc75a'));g.rotation.x=-Math.PI/2;g.position.set((P.x0+P.x1)/2,.02,(P.z0+P.z1)/2);g.receiveShadow=true;farm.add(g);
  fence(farm,P.x0,P.z0,P.x1,P.z0);fence(farm,P.x0,P.z1,P.x1,P.z1);fence(farm,P.x0,P.z0,P.x0,P.z1);fence(farm,P.x1,P.z0,P.x1,P.gate[0]);fence(farm,P.x1,P.gate[1],P.x1,P.z1);
  box(farm,1.6,.35,.5,-11.4,.18,7.7,'#8a6a45');box(farm,1.5,.08,.4,-11.4,.36,7.7,'#5fa8e0',false);}
 function cowModel(){const g=new THREE.Group(),body=new THREE.Group();g.add(body);box(body,.95,.5,.5,0,.62,0,'#f6f3ee');for(const [x,z,w] of [[-.2,.26,.3],[.22,-.26,.26],[.05,.26,.18]])box(body,w,.3,.02,x,.66,z,'#2b2b2b',false);box(body,.22,.3,.6,-.2,.66,0,'#2b2b2b').scale.set(.25,.32,.51);
  const head=new THREE.Group();head.position.set(.55,.8,0);body.add(head);box(head,.32,.3,.3,0,0,0,'#f6f3ee');box(head,.12,.16,.26,.18,-.06,0,'#f2b3b6');for(const z of [-.13,.13])box(head,.05,.12,.05,-.06,.2,z,'#e9e2cf');for(const z of [-.18,.18])box(head,.04,.1,.14,-.02,.08,z,'#2b2b2b');
  for(const [x,z] of [[-.33,-.17],[-.33,.17],[.33,-.17],[.33,.17]])box(g,.12,.4,.12,x,.2,z,'#e8e2d6');box(body,.04,.32,.04,-.5,.55,0,'#2b2b2b');
  const crate=new THREE.Group();crate.position.set(0,0,.62);g.add(crate);box(crate,.5,.12,.4,0,.06,0,'#b98a52');const b=item('beef');b.position.y=.12;crate.add(b);return {g,head,crate};}
 const cows=COWS.map(([x,z],i)=>{const c=cowModel();c.g.position.set(x,0,z);c.g.rotation.y=(i%2?1:-1)*.6;farm.add(c.g);return c;});

 const stations=Object.fromEntries(Object.entries(STATIONS).map(([id,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],0,def.pos[1]);scene.add(g);let work;
  if(id==='fryer'){box(g,1.8,1,1.2,0,.5,0,'#b7c2c8');box(g,1.4,.1,.8,0,1.03,0,'#e0b13b',false);work=box(g,.5,.12,.5,0,1.12,0,'#f6c945',false);}
  else if(id==='grill'){box(g,1.8,1,1.2,0,.5,0,'#3d454b');box(g,1.5,.06,.9,0,1.03,0,'#20262a',false);work=box(g,.5,.12,.5,0,1.12,0,'#ff7a2a',false);}
  else if(id==='burger'){box(g,1.8,1,1.2,0,.5,0,'#c3cacd');box(g,1.4,.05,.8,0,1.03,0,'#d8c7a6',false);work=box(g,.5,.12,.5,0,1.12,0,'#f6c945',false);}
  else if(id==='soda'){box(g,1.6,1.9,1,0,.95,-.1,'#d8342a');box(g,1.3,.5,.05,0,1.5,.42,'#fbe9e7');for(const x of [-.4,0,.4])box(g,.12,.18,.12,x,1.05,.45,'#9aa4ab');box(g,1.5,.08,.5,0,.72,.45,'#59646b');const logo=textPlane('SODA',1.1,.36,{bg:'#fbe9e7',fg:'#d8342a'});logo.position.set(0,1.5,.45);g.add(logo);work=box(g,.12,.3,.08,0,.9,.45,'#3fa9f5',false);}
  else{box(g,1.8,1.6,1.2,0,.8,0,'#f4f1ea');box(g,2,.12,1.4,0,1.66,0,'#c0392b');for(let i=0;i<5;i++)box(g,.36,.1,.06,-.72+i*.36,1.5,.63,i%2?'#ffffff':'#c0392b',false);const logo=textPlane('BOUCHERIE',1.6,.32,{bg:'#f4f1ea',fg:'#c0392b'});logo.position.set(0,1.2,.61);g.add(logo);box(g,.7,.6,.5,0,.3,.9,'#8a5a35');work=box(g,.08,.36,.36,0,.8,.9,'#c9d3d8',false);}
  const tag=sprite(2,.42);tag.position.set(0,id==='soda'||id==='butcher'?2.5:1.9,0);g.add(tag);
  const zones=[inZone(def.pos),outZone(def.pos)].map(([x,z],k)=>{const pad=new THREE.Group();pad.position.set(x-def.pos[0],.1,z-def.pos[1]);g.add(pad);box(pad,1.1,.04,1.1,0,.02,0,k?'#5cc46a':'#f08a3a',false);padIcon(pad,ICON[k?def.out:def.in]);const st=new THREE.Group();st.position.y=.06;pad.add(st);return st;});
  return [id,{g,work,tag,inStack:zones[0],outStack:zones[1],def}];}));
 const shelves=Object.fromEntries(Object.entries(SHELVES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],1.08,def.pos[1]);scene.add(g);box(g,1.5,.05,.85,0,.025,0,'#c9d3d8',false);const st=new THREE.Group();st.position.y=.05;g.add(st);const pad=box(scene,1.1,.04,1.1,shelfZone(def.pos)[0],.12,shelfZone(def.pos)[1],'#f08a3a',false);pad.userData.icon=padIcon(scene,ICON[k],shelfZone(def.pos)[0],shelfZone(def.pos)[1],.15);const tag=sprite(1.3,.4);tag.position.set(0,1.75,-.2);g.add(tag);return [k,{g,st,pad,tag}];}));
 // Deliveries: meat crate and cup dispenser, refilling by themselves.
 const sources=Object.fromEntries(Object.entries(SOURCES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],0,def.pos[1]);scene.add(g);
  if(k==='meat'){box(g,1.6,.3,1.2,0,.15,0,'#c98a4a');box(g,1.5,.05,1.1,0,.31,0,'#dfe8ec',false);}else{box(g,1.6,.25,1.2,0,.125,0,'#9aa4ab');box(g,1.6,1.6,.2,0,.8,-.5,'#e8edf0');const logo=textPlane('GOBELETS',1.3,.3,{bg:'#e8edf0',fg:'#3a8ee0'});logo.position.set(0,1.3,-.39);g.add(logo);}
  const st=new THREE.Group();st.position.y=k==='meat'?.33:.26;g.add(st);const tag=sprite(1.4,.4);tag.position.set(0,1.9,0);g.add(tag);return [k,{g,st,tag}];}));
 // Registers: till on the counter, card terminal when bought, serving pad behind it, cash pile (bundles of notes) beside it.
 const registers=REGISTERS.map((R,i)=>{const g=new THREE.Group();scene.add(g);const till=new THREE.Group();till.position.set(R.pos[0],1.05,R.pos[1]);g.add(till);box(till,.6,.4,.4,0,.2,0,'#3d454b');box(till,.5,.32,.04,0,.55,-.1,'#7fb7d9');
  const term=new THREE.Group();term.position.set(R.pos[0]+.55,1.08,R.pos[1]+.15);g.add(term);box(term,.18,.06,.3,0,.03,0,'#20262a');const tb=box(term,.16,.22,.05,0,.15,-.08,'#2b3a44');tb.rotation.x=-.4;box(term,.12,.08,.01,0,.2,-.05,'#7fd6a0',false).rotation.x=-.4;
  const serve=box(g,1.2,.04,1.2,R.serve[0],.12,R.serve[1],'#7fb7d9',false);padIcon(g,'🛎️',R.serve[0],R.serve[1],.15);
  const cash=new THREE.Group();cash.position.set(R.cash[0],.1,R.cash[1]);g.add(cash);box(cash,1.3,.04,1.3,0,.02,0,'#5cc46a',false);padIcon(cash,'💵',0,.05,.8);const pile=new THREE.Group();pile.position.y=.04;cash.add(pile);return {g,serve,term,pile};});
 // Self-order kiosks: tall totems with a screen; the screen lights up while a customer orders.
 const kiosks=KIOSKS.map(([x,z])=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(g,.7,.12,.5,0,.06,0,'#3d454b');box(g,.55,1.7,.3,0,.9,0,'#f4f6f7');const scr=textPlane('Commandez ici',.46,.7,{bg:'#2b6fd6',font:'800 64px system-ui'});scr.position.set(0,1.25,.16);g.add(scr);box(g,.3,.05,.1,0,.6,.18,'#20262a');return {g,scr};});

 // Megaphone pad by the entrance (starts a rush when stepped on) and the roadside billboard, one panel per advertising level.
 const mega=new THREE.Group();mega.position.set(MEGAPHONE[0],.1,MEGAPHONE[1]);scene.add(mega);const megaPad=box(mega,1.2,.04,1.2,0,.02,0,'#f6c945',false);padIcon(mega,'📣',0,0,.05,.85);
 cyl(mega,.05,1.6,.75,.8,-.45,'#59646b');const horn=new THREE.Mesh(new THREE.ConeGeometry(.28,.6,14,1,true),mat('#e8483a'));horn.material.side=THREE.DoubleSide;horn.rotation.z=Math.PI/2;horn.position.set(.6,1.65,-.45);mega.add(horn);
 const megaTag=sprite(2.2,.55);megaTag.position.set(0,2.3,0);mega.add(megaTag);
 const board=new THREE.Group();board.position.set(16.4,0,2.4);board.rotation.y=.38;scene.add(board);for(const x of [-1.1,1.1])box(board,.14,2.6,.14,x,1.3,-.14,'#59646b');
 const panels=[0,1,2].map(i=>{const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=['#e8483a','#f6a23a','#3aa0d8'][i];ctx.fillRect(0,0,256,128);ctx.fillStyle='#fff';ctx.font='900 46px system-ui';ctx.textAlign='center';ctx.fillText(['FLUX BURGER','FRITES MAISON','-20% MIDI'][i],128,62,236);ctx.font='70px system-ui';ctx.fillText(['🍔','🍟','⭐'][i],128,120);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.3,.12),[mat('#ffffff'),mat('#ffffff'),mat('#ffffff'),mat('#ffffff'),new THREE.MeshStandardMaterial({map}),mat('#ffffff')]);m.position.set(0,1.9+i*1.4,0);m.castShadow=true;board.add(m);if(i){const pole=box(board,.14,1.4,.14,0,1.9+i*1.4-.7,-.14,'#59646b');m.userData.pole=pole;}return m;});

 // Unlock tiles: dashed square, name and price, filling as the player pays; levelled upgrades show what the level brings.
 const tiles=new Map();function tile(u){const g=new THREE.Group();g.position.set(u.pos[0],.13,u.pos[1]);const c=document.createElement('canvas');c.width=c.height=256;const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map,transparent:true}));plane.rotation.x=-Math.PI/2;g.add(plane);scene.add(g);let last='';
  g.userData.draw=(paid)=>{const key=paid;if(key===last)return;last=key;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle=u.level?'#fff3c455':'#ffffff55';ctx.fillRect(14,14,228,228);ctx.fillStyle='#5fd06acc';const f=paid/u.price;ctx.fillRect(14,242-228*f,228,228*f);ctx.setLineDash([26,18]);ctx.lineWidth=10;ctx.strokeStyle=u.level?'#ffe08a':'#fff';ctx.strokeRect(14,14,228,228);
   ctx.fillStyle='#2b3a44';ctx.textAlign='center';ctx.font='800 32px system-ui';ctx.fillText(u.name,128,u.tip?72:92,220);ctx.font='900 54px system-ui';ctx.fillText(`${(u.price-paid).toLocaleString('fr-FR')} $`,128,u.tip?140:168,220);if(u.tip){ctx.font='700 22px system-ui';ctx.fillText(u.tip,128,196,220);}map.needsUpdate=true;};return g;}

 const customers=new Map(),helpers=new Map(),popups=new Map(),COLORS=['#e86a7a','#6a8ee8','#e8b86a','#8ad06a','#b06ae8','#6ad0c8'];
 const POP={money:{bg:'#2f9e4fee',fg:'#fff'},card:{bg:'#2b6fd6ee',fg:'#fff'},info:{bg:'#26343fee',fg:'#fff'},bad:{bg:'#e8483aee',fg:'#fff'}};
 const player=person('#3aa0d8',{hat:'#1f6f9a'}),cashiers=REGISTERS.map(()=>{const c=person('#e46ab0');c.visible=false;return c;});let time=0,showMissions=false;
 function sync(dt){const s=getState();time+=dt;
  animate(player,s.player,time);stackOf(player.userData.back,s.player.carry,carryLayout(s.player.carry.length));
  s.cashiers.forEach((c,i)=>{cashiers[i].visible=!!c;if(c)animate(cashiers[i],{...c,moving:false,heading:0},time);});
  for(const h of s.helpers){let g=helpers.get(h.id);if(!g){g=h.robot?robotModel(chainColor(h.loop)):person(chainColor(h.loop),{hat:'#ffffff'});const tag=sprite(1.7,.45);tag.position.set(0,h.robot?1.7:2,0);g.add(tag);g.userData.tag=tag;helpers.set(h.id,g);}animate(g,h,time);g.userData.tag.visible=showMissions||h.loop==='rest';pill(g.userData.tag,MISSIONS.find(m=>m.id===h.loop)?.icon??'',h.loop==='rest'?{bg:'#c9d3d8ee'}:{});stackOf(g.userData.back,h.carry,carryLayout(h.carry.length));}
  fenceSmall.visible=!s.unlocked.field2;fenceBig.visible=!!s.unlocked.field2;
  const wet=!!s.unlocked.water;
  for(const sp of sprinklers){sp.g.visible=wet&&(sp.zone===1||!!s.unlocked.field2);if(!sp.g.visible)continue;
   for(const d of sp.drops){const t=(d.userData.phase+time*.9)%1,a=sp.spin+time*1.8+(d.userData.lane?Math.PI:0)+t*.5,r=.15+t*1.25;d.position.set(Math.cos(a)*r,.5+1.6*t-1.75*t*t,Math.sin(a)*r);d.scale.setScalar(.075*(1-t*.35));}}
  plots.forEach((v,i)=>{const p=s.plots[i],open=p.zone===1||!!s.unlocked.field2;v.g.visible=open;if(!open)return;v.soil[0].material=mat(wet?'#5a361f':'#7a4a2a');v.soil[1].material=v.soil[2].material=mat(wet?'#74462a':'#9a6038');v.plant.scale.setScalar(.25+.75*p.grow);v.flowers.visible=v.spuds.visible=p.ripe;v.plant.rotation.z=p.ripe?Math.sin(time*2.4+i)*.05:0;});
  farm.visible=!!s.unlocked.farm;const nc=cowCount(s);cows.forEach((c,i)=>{c.g.visible=i<nc;if(i>=nc)return;const st=s.cows[i];c.crate.visible=st.ready;c.head.rotation.z=-.25-Math.abs(Math.sin(time*.8+i))*.35;c.g.position.x=COWS[i][0]+Math.sin(time*.25+i*2)*.15;});
  for(const [id,v] of Object.entries(stations)){const st=s.stations[id],open=stationOpen(s,id),cap=stationCaps(s,id);v.g.visible=open;if(!open)continue;stackOf(v.inStack,repeat(v.def.in,st.in),{cols:3,rows:3,step:.32,dstep:.32});stackOf(v.outStack,repeat(v.def.out,st.out),{cols:3,rows:3,step:.34,dstep:.32});
   v.work.visible=st.working;if(id==='butcher')v.work.position.y=.8+(st.working?Math.abs(Math.sin(time*9))*.2:0);else if(id!=='soda')v.work.position.y=1.12+(st.working?Math.abs(Math.sin(time*10))*.08:0);pill(v.tag,`${v.def.name}${stationTime(s,id)<v.def.time-1e-9?' ⚡':''} ${st.out}/${cap.outCap}`);}
  for(const [k,v] of Object.entries(sources)){const open=sourceOpen(s,k);v.g.visible=open;if(!open)continue;const n=s.sources[k].n;stackOf(v.st,repeat(SOURCES[k].item,n),k==='cups'?{cols:4,rows:2,step:.3,dstep:.3}:{cols:4,rows:3,step:.36,dstep:.34});pill(v.tag,`${ICON[SOURCES[k].item]} ${n}/${sourceCap(s,k)}`);}
  for(const [k,v] of Object.entries(shelves)){const open=shelfOpen(s,k);v.g.visible=open;v.pad.visible=v.pad.userData.icon.visible=open;if(!open)continue;stackOf(v.st,repeat(k,s.shelves[k]),{cols:4,rows:2,step:.33,dstep:.36});pill(v.tag,`${ICON[k]} ${s.shelves[k]}/${shelfCap(s,k)}`);}
  mega.visible=!!s.unlocked.megaphone;if(mega.visible){const ready=s.rushCool<=0;megaPad.material=mat(s.rush>0?'#e8483a':ready?'#f6c945':'#c9b98a');pill(megaTag,s.rush>0?`RUSH ${Math.ceil(s.rush)} s`:ready?'📣 Rush prêt':`Recharge ${Math.ceil(s.rushCool)} s`,s.rush>0?{bg:'#e8483aee',fg:'#fff'}:{});horn.scale.setScalar(s.rush>0?1+Math.abs(Math.sin(time*8))*.15:1);}
  const ads=adsLevel(s);board.visible=ads>0;panels.forEach((m,i)=>{m.visible=i<ads;if(m.userData.pole)m.userData.pole.visible=i<ads;});
  registers.forEach((r,i)=>{r.g.visible=registerOpen(s,i);r.term.visible=hasTerminal(s,i);r.serve.material=mat(s.cashiers[i]?'#b6a4e0':'#4f9be0');stackOf(r.pile,repeat('bundle',Math.min(36,Math.ceil(s.piles[i]/10))),{cols:2,rows:3,step:.5,dstep:.36});});
  const nk=kioskCount(s);kiosks.forEach((k,i)=>{k.g.visible=i<nk;});pickup.visible=nk>0;
  const shown=visibleUnlocks(s),keys=new Set(shown.map(u=>u.key));for(const u of shown){let g=tiles.get(u.key);if(!g){g=tile(u);tiles.set(u.key,g);}g.userData.draw(s.paid[u.key]??0);}for(const [k,g] of tiles)if(!keys.has(k)){scene.remove(g);tiles.delete(k);}
  const seen=new Set();for(const c of s.customers){seen.add(c.id);let g=customers.get(c.id);if(!g){g=person(COLORS[c.look%COLORS.length]);const b=sprite(1.8,.5);b.position.set(0,2.05,0);g.add(b);g.userData.bubble=b;customers.set(c.id,g);}
   animate(g,c,time);stackOf(g.userData.back,c.phase==='leave'&&c.happy?PRODUCTS.flatMap(k=>repeat(k,c.got[k])):[],{cols:2,step:.34});
   const left=PRODUCTS.map(k=>c.wants[k]-c.got[k]?`${ICON[k]}${c.wants[k]-c.got[k]}`:'').filter(Boolean).join(' ');const waiting=c.phase==='queue'||c.phase==='kiosk'||c.phase==='pickup';g.userData.bubble.visible=waiting;
   if(waiting){const f=c.wait/PATIENCE,text=c.phase==='kiosk'&&c.order>0?`📝 ${Math.round(c.order/KIOSK_ORDER*100)} %`:`${c.card?'💳':'💵'} ${left||'✓'}`;pill(g.userData.bubble,text,f<.4?{}:f<.7?{bg:'#f6b94aee'}:{bg:'#e8483aee',fg:'#fff'});}}
  for(const [id,g] of customers)if(!seen.has(id)){scene.remove(g);customers.delete(id);}
  for(const p of s.popups){let g=popups.get(p.id);if(!g){g=sprite(1.8,.55);scene.add(g);pill(g,p.text,{...(POP[p.kind]??POP.money),size:.55});popups.set(p.id,g);}g.position.set(p.x,2+p.t*1.6,p.z);g.material.opacity=1-p.t/1.4;}
  for(const [id,g] of popups)if(!s.popups.some(p=>p.id===id)){scene.remove(g);popups.delete(id);}
  // Camera follows the player from the front-top, like a tabletop diorama.
  const px=s.player.x,pz=s.player.z,cx=camera.userData.x??px,cz=camera.userData.z??pz,nx=cx+(px-cx)*Math.min(1,dt*4),nz=cz+(pz-cz)*Math.min(1,dt*4);camera.userData.x=nx;camera.userData.z=nz;camera.position.set(nx+6,20,nz+15);camera.lookAt(nx,0,nz-1);sun.position.set(nx-10,30,nz+12);sun.target.position.set(nx,0,nz);}
 function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),half=aspect<1?11:8.5;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 return {three:scene,camera,setShowMissions(v){showMissions=!!v;},update(dt){sync(dt);renderer.render(scene,camera);},reset(){for(const m of [customers,helpers,popups])for(const [id,g] of m){scene.remove(g);m.delete(id);}for(const [id,g] of tiles){scene.remove(g);tiles.delete(id);}}};}
