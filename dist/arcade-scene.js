import * as THREE from 'three';
import {STATIONS,SHELVES,SOURCES,REGISTERS,KIOSKS,PICKUP,COWS,PASTURE,DOOR,PRODUCTS,registerOpen,stationTime,stationCaps,shelfCap,sourceCap,sourceOpen,shelfOpen,cowCount,kioskCount,hasTerminal,
 inZone,outZone,shelfZone,stationOpen,visibleUnlocks,MEGAPHONE,adsLevel,PATIENCE,MISSIONS,KIOSK_ORDER,TABLES,SINK,DESK,DOCK,DRIVE,hourOf,OPEN,billsDue,REPAIR,TECH_DELAY,SAFE,ATM} from './arcade-engine.js';

// Low-poly view of the arcade game: stacks, trays, shelves, cash and unlock tiles show the simulated counts.
export function createArcadeScene(canvas,getState){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#9fd46a');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,200),sun=new THREE.DirectionalLight('#fff4e0',2.6);const small=matchMedia('(max-width:700px),(pointer:coarse)').matches;sun.castShadow=true;sun.shadow.mapSize.set(small?1024:2048,small?1024:2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:120});sun.shadow.normalBias=.03;const hemi=new THREE.HemisphereLight('#ffffff','#7a9a5a',2.1);scene.add(sun,sun.target,hemi);
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
  milk:[[part(B(),{y:.13,sx:.17,sy:.26,sz:.17}),'#f7f7f2'],[merge([part(B(),{y:.29,x:-.045,sx:.1,sy:.06,sz:.17,rz:.5}),part(B(),{y:.29,x:.045,sx:.1,sy:.06,sz:.17,rz:-.5}),part(B(),{y:.12,z:.086,sx:.12,sy:.08,sz:.01})]),'#3a8ee0']],
  icecream:[[part(new THREE.CylinderGeometry(.085,.012,1,10),{y:.11,sy:.22}),'#d9a35a'],[part(S(10,8),{y:.25,sx:.1,sy:.09,sz:.1}),'#f49ac1'],[part(S(8,6),{y:.32,sx:.06,sy:.05,sz:.06}),'#fff5e6']],
  tray:[[part(B(),{y:.015,sx:.46,sy:.03,sz:.34}),'#8a5a35'],[merge([part(B(),{y:.06,x:-.1,sx:.14,sy:.06,sz:.1,ry:.4}),part(C(.05,.04,8),{y:.09,x:.12,sy:.14})]),'#f2ede4']],
  bundle:[[merge([0,1,2,3].map(i=>part(B(),{y:.012+i*.022,sx:.46,sy:.02,sz:.22,ry:(i%2?.04:-.03)}))),'#79c47c'],[merge([part(B(),{y:.045,sx:.08,sy:.095,sz:.225}),part(B(),{y:.098,x:.14,sx:.08,sy:.002,sz:.12})]),'#f2ead2']]};
 const H={coins:.09,potato:.22,fries:.36,raw:.075,steak:.075,burger:.31,cup:.07,soda:.3,beef:.25,bundle:.1,milk:.32,icecream:.34,tray:.08};
 // Banknotes: printed face (frame, value, portrait, serial) on bundles held by a paper band; coins: small gold stacks.
 const noteTex=(()=>{const c=document.createElement('canvas');c.width=256;c.height=128;const x=c.getContext('2d');const gr=x.createLinearGradient(0,0,256,128);gr.addColorStop(0,'#9fd3a8');gr.addColorStop(1,'#5aa874');x.fillStyle=gr;x.fillRect(0,0,256,128);
  x.strokeStyle='#2f6b45';x.lineWidth=6;x.strokeRect(6,6,244,116);x.lineWidth=1.5;for(let i=0;i<14;i++){x.beginPath();x.arc(128,64,10+i*4,0,Math.PI*2);x.stroke();}
  x.fillStyle='#e8f5e6';x.beginPath();x.ellipse(176,64,32,40,0,0,Math.PI*2);x.fill();x.fillStyle='#3c7a52';x.beginPath();x.arc(176,52,13,0,Math.PI*2);x.fill();x.fillRect(158,68,36,26);
  x.fillStyle='#1f4d33';x.font='900 40px system-ui';x.fillText('20',18,50);x.font='900 26px system-ui';x.fillText('20',214,116);x.font='800 15px system-ui';x.fillText('FLUX BANK',20,104);x.font='600 11px monospace';x.fillText('FB 0420 7731',20,82);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})();
 const noteMats=[mat('#cfe6cf'),mat('#cfe6cf'),new THREE.MeshStandardMaterial({map:noteTex,roughness:.8}),mat('#cfe6cf'),mat('#cfe6cf'),mat('#cfe6cf')];
 const coinGeo=merge([0,1,2,3,4].map(i=>part(C(.07,.07,14),{y:.008+i*.017,sy:.015,x:(i%2)*.006})));
 // One geometry per kind of item, its parts told apart by vertex colours: a kind is drawn in one call however many there are.
 function mergeColored(parts){const pos=[],nor=[],col=[],k=new THREE.Color();for(const [g,c] of parts){k.set(c);const a=g.attributes.position.array,n=g.attributes.normal.array;for(let i=0;i<a.length;i++){pos.push(a[i]);nor.push(n[i]);}for(let i=0;i<a.length;i+=3)col.push(k.r,k.g,k.b);}
  const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));m.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));m.setAttribute('color',new THREE.Float32BufferAttribute(col,3));m.computeBoundingSphere();return m;}
 const itemMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}),coinMat=new THREE.MeshStandardMaterial({color:'#e2b33c',metalness:.7,roughness:.35});
 const LAYERS={};for(const k in MODELS)LAYERS[k]=[[mergeColored(MODELS[k]),itemMat]];
 LAYERS.bundle=[[geo.box.clone().scale(.46,.08,.23).translate(0,.04,0),noteMats],[mergeColored([[part(B(),{y:.042,sx:.07,sy:.084,sz:.235}),'#f2ead2']]),itemMat]];
 LAYERS.coins=[[merge([part(coinGeo,{x:-.06}),part(coinGeo,{x:.08,z:.03,sy:.7})]),coinMat]];
 // A single item with its parts kept apart, for the few that belong to a model and are animated part by part (the cone of the ice-cream machine).
 function item(kind){const g=new THREE.Group();for(const [gm,c] of MODELS[kind]){const x=new THREE.Mesh(gm,mat(c));x.castShadow=true;g.add(x);}return g;}
 // A stack laid out as a grid of `cols`×`rows` cells, each cell piling up; at most `max` items drawn (the label gives the true count).
 // Each kind present in the stack is one instanced mesh, kept in a pool on the group and refilled only when the stack changes.
 function stackOf(group,list,{cols=1,rows=1,step=.42,dstep=.42,max=60}={}){const key=list.length+':'+list.slice(-8).join(',')+cols+rows;if(group.userData.key===key)return;group.userData.key=key;
  const pool=group.userData.pool??=new Map(),n=Math.min(list.length,max),per=cols*rows,heights=new Map();for(const e of pool.values())e.n=e.need=0;
  for(let i=0;i<n;i++){let e=pool.get(list[i]);if(!e){e={cap:0,n:0,need:0,meshes:[]};pool.set(list[i],e);}e.need++;}
  for(const [k,e] of pool)if(e.need>e.cap){for(const m of e.meshes){group.remove(m);m.dispose();}e.cap=Math.max(8,2**Math.ceil(Math.log2(e.need)));e.meshes=LAYERS[k].map(([g,m])=>{const im=new THREE.InstancedMesh(g,m,e.cap);im.castShadow=true;group.add(im);return im;});}
  for(let i=0;i<n;i++){const k=list[i],cell=i%per,col=cell%cols,row=Math.floor(cell/cols),y=heights.get(cell)??0,e=pool.get(k);T.position.set((col-(cols-1)/2)*step,y,(row-(rows-1)/2)*dstep);T.rotation.set(0,((i*37)%7-3)*.04,0);T.scale.set(1,1,1);T.updateMatrix();
   for(const m of e.meshes)m.setMatrixAt(e.n,T.matrix);e.n++;heights.set(cell,y+H[k]);}
  for(const e of pool.values())for(const m of e.meshes){m.count=e.n;m.visible=e.n>0;m.instanceMatrix.needsUpdate=true;if(e.n)m.computeBoundingSphere();}}
 // Takes a model out of the scene and frees what belonged to it alone (label textures, instanced stacks); shared geometries and materials stay.
 function drop(g){scene.remove(g);g.traverse(o=>{if(o.isInstancedMesh)o.dispose();else if(o.isSprite||(o.isMesh&&o.material.isMeshBasicMaterial&&o.material.map)){o.material.map.dispose();o.material.dispose();if(o.isMesh)o.geometry.dispose();}});}
 const carryLayout=n=>n<=10?{}:n<=24?{cols:2,step:.36}:{cols:2,rows:2,step:.36,dstep:.34};
 // Flat icon painted on a pad: what goes there (input) or what comes out of it.
 const ICON={potato:'🥔',fries:'🍟',raw:'🥩',steak:'🍖',burger:'🍔',cup:'🥛',soda:'🥤',beef:'🐄',milk:'🍼',icecream:'🍦',tray:'🍽️'};
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
 const chainColor=loop=>/cash/i.test(loop)?'#2f7d4f':/fries|potato/i.test(loop)?'#f0a830':/soda|cup/i.test(loop)?'#3a8ee0':/farm|beef|butcher/i.test(loop)?'#7a5a3a':'#d8432f';

 // Ground, restaurant floor, counter, field, kitchen.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#a9db6e',roughness:.85}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 box(scene,22.4,.1,23,6.2,.05,-9,'#f7c97f',false);box(scene,22.4,2.4,.3,6.2,1.2,-20.4,'#e6eef0');box(scene,.3,2.4,1.6,-5,1.2,-11.7,'#e6eef0');box(scene,22.4,.25,.3,6.2,2.5,-20.4,'#5bbf4a',false);
 box(scene,14.4,1,.9,6,.5,-3.2,'#5fd6b4');box(scene,14.4,.08,.95,6,1.04,-3.2,'#eafaf4',false);
 box(scene,6.8,.06,8.2,DOOR[0],.09,2,'#e2b26a',false);box(scene,14,.04,2,2,.03,9.5,'#59646b',false);box(scene,7.6,.05,5.6,1,.095,1.4,'#efd9a6',false);
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

 // Fryer: steel cabinet with two oil vats, one basket each. A basket goes down into the oil while the simulation cooks a
 // potato in it; its fries turn from pale to golden as that batch progresses, the oil bubbles and steams, and the basket
 // lifts out for a moment when its batch is done. An idle basket hangs above its vat.
 function fryerModel(g){box(g,1.8,.92,1.2,0,.46,0,'#c9d1d6');box(g,1.82,.06,1.22,0,.95,0,'#e6ecef');box(g,1.7,.5,.02,0,.38,.61,'#aeb8be',false);
  box(g,1.82,.08,1.22,0,.04,0,'#59646b',false);box(g,.08,.06,.9,0,.99,0,'#9aa4ab',false);box(g,1.76,.5,.12,0,1.22,-.56,'#b7c2c8');
  for(const x of [-.55,-.4,.4,.55])cyl(g,.04,.05,x,.72,.62,'#2b3a44').rotation.x=Math.PI/2;
  const oilMat=new THREE.MeshStandardMaterial({color:'#d99a2b',roughness:.25,metalness:.1,emissive:'#6b3d05',emissiveIntensity:.25});
  const steamMat=new THREE.MeshStandardMaterial({color:'#ffffff',transparent:true,opacity:.22,roughness:1,depthWrite:false});
  return [-.42,.42].map((x,v)=>{box(g,.74,.03,.86,x,.975,0,'#3d454b',false);const oil=new THREE.Mesh(geo.box,oilMat);oil.scale.set(.66,.02,.78);oil.position.set(x,.99,0);g.add(oil);
   const lamp=box(g,.1,.06,.02,x*.5,.72,.62,'#f08a3a',false);lamp.material=new THREE.MeshStandardMaterial({color:'#f08a3a',emissive:'#f08a3a',emissiveIntensity:.6});
   const k=new THREE.Group();k.position.set(x,1.36,0);g.add(k);
   const wire=merge([part(B(),{y:.01,sx:.56,sy:.02,sz:.62}),part(B(),{x:-.28,y:.14,sx:.02,sy:.26,sz:.62}),part(B(),{x:.28,y:.14,sx:.02,sy:.26,sz:.62}),part(B(),{z:-.31,y:.14,sx:.56,sy:.26,sz:.02}),part(B(),{z:.31,y:.14,sx:.56,sy:.26,sz:.02}),
    ...[-.14,0,.14].map(xx=>part(B(),{x:xx,y:.14,z:.315,sx:.012,sy:.26,sz:.012}))]);
   const w=new THREE.Mesh(wire,new THREE.MeshStandardMaterial({color:'#8a959b',metalness:.6,roughness:.35,transparent:true,opacity:.78}));w.castShadow=true;k.add(w);
   box(k,.04,.04,.42,0,.26,.5,'#2b2b2b');box(k,.03,.16,.03,0,.18,.31,'#8a959b',false);
   const friesMat=new THREE.MeshStandardMaterial({color:'#f3e2a8',roughness:.7});
   const fries=new THREE.Mesh(merge(Array.from({length:22},(_,i)=>part(B(),{x:-.2+(i%6)*.08,z:-.22+Math.floor(i/6)*.14,y:.08+(((i+v*3)*7)%4)*.025,sx:.04,sy:.04,sz:.26,ry:(((i+v)*5)%5-2)*.18,rx:((i*3)%3-1)*.25}))),friesMat);fries.castShadow=true;k.add(fries);
   const bubbles=Array.from({length:8},(_,i)=>{const m=ball(g,.035,x+((i*37+v*11)%7-3)*.08,1,((i*53)%7-3)*.1,'#f2c46a');m.castShadow=false;m.userData.phase=i/8;return m;});
   const steam=Array.from({length:4},(_,i)=>{const m=new THREE.Mesh(geo.sphere,steamMat);g.add(m);m.userData.phase=i/4+v*.13;return m;});
   return {x,k,fries,friesMat,lamp,bubbles,steam,last:0,lift:0};});}
 const PALE=new THREE.Color('#f3e2a8'),GOLD=new THREE.Color('#e3a032');
 function animateFryer(fx,baskets,dt){fx.forEach((f,i)=>{const b=baskets[i]??{on:false,t:0},progress=b.on?b.t/f.T:0;
  // A finished batch (progress fell back) lifts the basket out with golden fries for a moment.
  if(progress<f.last-.3)f.lift=.6;f.last=progress;f.lift=Math.max(0,f.lift-dt);
  const down=b.on&&f.lift<=0&&progress<1;f.k.position.y+=((down?.93:1.36)-f.k.position.y)*Math.min(1,dt*8);
  f.fries.visible=b.on||f.lift>0;f.friesMat.color.copy(PALE).lerp(GOLD,f.lift>0?1:Math.min(1,progress));
  const c=down?'#4fbf5a':'#f08a3a';f.lamp.material.color.set(c);f.lamp.material.emissive.set(c);
  for(const m of f.bubbles){m.visible=down;if(!down)continue;const t=(m.userData.phase+time*1.6)%1;m.position.y=.99+Math.sin(t*Math.PI)*.03;m.scale.setScalar(.02+.03*Math.sin(t*Math.PI));}
  for(const m of f.steam){m.visible=down;if(!down)continue;const t=(m.userData.phase+time*.45)%1;m.position.set(f.x+Math.sin(t*6+m.userData.phase*9)*.12,1.15+t*1.1,Math.cos(t*5+m.userData.phase*7)*.1);m.scale.setScalar(.05+t*.12);}});}
 // Grill: dark body, glowing coals under a grate; while a batch cooks, a patty turns from pink to brown, flips half-way and smokes.
 const smokeMat=new THREE.MeshStandardMaterial({color:'#9aa4ab',transparent:true,opacity:.3,roughness:1,depthWrite:false});
 const puffs=(g,n,x,y,z)=>Array.from({length:n},(_,i)=>{const m=new THREE.Mesh(geo.sphere,smokeMat);m.userData={phase:i/n,x,y,z};g.add(m);return m;});
 const animPuffs=(list,on,rise=1,spread=.12)=>{for(const m of list){m.visible=on;if(!on)continue;const u=m.userData,t=(u.phase+time*.5)%1;m.position.set(u.x+Math.sin(t*6+u.phase*9)*spread,u.y+t*rise,u.z+Math.cos(t*5+u.phase*7)*spread*.8);m.scale.setScalar(.05+t*.13);}};
 function grillModel(g){box(g,1.8,.92,1.2,0,.46,0,'#3d454b');box(g,1.82,.06,1.22,0,.95,0,'#59646b');box(g,1.7,.4,.02,0,.45,.61,'#2b3136',false);
  const coal=new THREE.Mesh(geo.box,new THREE.MeshStandardMaterial({color:'#ff6a1a',emissive:'#ff4a00',emissiveIntensity:.8}));coal.scale.set(1.4,.04,.8);coal.position.set(0,.97,0);g.add(coal);
  const grate=new THREE.Mesh(merge(Array.from({length:9},(_,i)=>part(B(),{x:-.64+i*.16,y:1.02,sx:.03,sy:.03,sz:.86}))),mat('#20262a'));g.add(grate);
  const pm=new THREE.MeshStandardMaterial({color:'#e8737c',roughness:.8}),patty=new THREE.Mesh(geo.cyl,pm);patty.scale.set(.22,.06,.22);patty.position.set(0,1.07,0);patty.castShadow=true;g.add(patty);
  return {coal,patty,pm,smoke:puffs(g,5,0,1.15,0)};}
 const RAW=new THREE.Color('#e8737c'),COOKED=new THREE.Color('#6b3a24');
 function animateGrill(fx,working,p){fx.patty.visible=working;fx.pm.color.copy(RAW).lerp(COOKED,Math.min(1,p*1.2));fx.patty.rotation.x=p>.5?Math.PI:0;fx.patty.position.y=1.07+(Math.abs(p-.5)<.06?.12:0);
  fx.coal.material.emissiveIntensity=working?.7+Math.sin(time*7)*.2:.25;animPuffs(fx.smoke,working);}
 // Burger station: on the board the burger is built layer by layer as the batch progresses (bun, patty, cheese, salad, bun).
 function burgerModel(g){box(g,1.8,.92,1.2,0,.46,0,'#c3cacd');box(g,1.82,.06,1.22,0,.95,0,'#e6ecef');box(g,1,.04,.7,0,1,0,'#d8b27a',false);
  for(const [x,c] of [[-.72,'#e0a24a'],[-.52,'#f5c234'],[.6,'#6cbf3d']])box(g,.16,.12,.5,x,1.04,0,c,false);
  const L=[[C(.17,.16),.02,.05,'#d9953f'],[C(.18,.18),.065,.05,'#5a2e1a'],[B(),.1,.02,'#f5c234'],[C(.19,.19),.12,.02,'#6cbf3d'],[S(12,8,Math.PI/2),.13,.12,'#e0a24a']];
  const layers=L.map(([gm,y,h,c],i)=>{const m=new THREE.Mesh(gm,mat(c));if(i===4)m.scale.set(.18,h,.18);else if(i===2){m.scale.set(.3,h,.3);m.rotation.y=Math.PI/4;}else m.scale.set(1,h,1);m.position.set(0,1.02+y,0);m.castShadow=true;g.add(m);return m;});
  return {layers};}
 function animateBurger(fx,working,p){fx.layers.forEach((m,i)=>{m.visible=working&&p>=i*.2;});}
 // Soda fountain: a cup stands under the nozzle while a batch runs; the drink rises in it and the stream flows.
 function sodaModel(g){box(g,1.6,1.9,1,0,.95,-.1,'#d8342a');box(g,1.3,.5,.05,0,1.5,.42,'#fbe9e7');for(const x of [-.4,0,.4])box(g,.12,.18,.12,x,1.05,.45,'#9aa4ab');box(g,1.5,.08,.5,0,.72,.45,'#59646b');const logo=textPlane('SODA',1.1,.36,{bg:'#fbe9e7',fg:'#d8342a'});logo.position.set(0,1.5,.45);g.add(logo);
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.12,.09,.3,14,1,true),new THREE.MeshStandardMaterial({color:'#f4f2ea',transparent:true,opacity:.75,side:THREE.DoubleSide}));cup.position.set(0,.91,.45);g.add(cup);
  const drink=new THREE.Mesh(geo.cyl,mat('#5a2414'));drink.position.set(0,.77,.45);g.add(drink);const stream=box(g,.025,.16,.025,0,1.0,.45,'#7a3a1e',false);return {cup,drink,stream};}
 function animateSoda(fx,working,p){fx.cup.visible=fx.drink.visible=working;fx.stream.visible=working&&p<.92;const h=.02+.26*Math.min(1,p);fx.drink.scale.set(.1,h,.1);fx.drink.position.y=.77+h/2;}
 // Ice-cream machine: a cone waits under the tap and the swirl grows with the batch.
 function iceModel(g){box(g,1.5,1.7,1,0,.85,-.1,'#f7f2f6');box(g,1.52,.3,1.02,0,1.62,-.1,'#f49ac1');const logo=textPlane('GLACES',1.1,.32,{bg:'#f7f2f6',fg:'#e0679b'});logo.position.set(0,1.25,.41);g.add(logo);
  box(g,1.3,.08,.5,0,.72,.45,'#59646b');cyl(g,.06,.18,0,1,.45,'#c9d1d6');const cone=item('icecream');cone.position.set(0,.76,.45);g.add(cone);return {cone};}
 function animateIce(fx,working,p){fx.cone.visible=working;fx.cone.children[1].scale.setScalar(.2+.8*Math.min(1,p));fx.cone.children[2].visible=p>.7;}
 const stations=Object.fromEntries(Object.entries(STATIONS).map(([id,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],0,def.pos[1]);scene.add(g);let work;const b=def.base??id;
  if(b==='fryer'){work=new THREE.Group();g.add(work);g.userData.fx=fryerModel(g);}
  else if(b==='grill'){work=new THREE.Group();g.add(work);g.userData.anim=[grillModel(g),animateGrill];}
  else if(b==='burger'){work=new THREE.Group();g.add(work);g.userData.anim=[burgerModel(g),animateBurger];}
  else if(b==='soda'){work=new THREE.Group();g.add(work);g.userData.anim=[sodaModel(g),animateSoda];}
  else if(b==='icecream'){work=new THREE.Group();g.add(work);g.userData.anim=[iceModel(g),animateIce];}
  else{box(g,1.8,1.6,1.2,0,.8,0,'#f4f1ea');box(g,2,.12,1.4,0,1.66,0,'#c0392b');for(let i=0;i<5;i++)box(g,.36,.1,.06,-.72+i*.36,1.5,.63,i%2?'#ffffff':'#c0392b',false);const logo=textPlane('BOUCHERIE',1.6,.32,{bg:'#f4f1ea',fg:'#c0392b'});logo.position.set(0,1.2,.61);g.add(logo);box(g,.7,.6,.5,0,.3,.9,'#8a5a35');work=box(g,.08,.36,.36,0,.8,.9,'#c9d3d8',false);}
  const tag=sprite(2,.42);tag.position.set(0,b==='soda'||b==='butcher'||b==='icecream'?2.5:1.9,0);g.add(tag);
  // Breakdown: black smoke above the machine while it is broken.
  g.userData.broken=puffs(g,6,0,1.3,0);for(const m of g.userData.broken)m.material=new THREE.MeshStandardMaterial({color:'#2b2b2b',transparent:true,opacity:.45,depthWrite:false});
  const zones=[inZone(def.pos),outZone(def.pos)].map(([x,z],k)=>{const pad=new THREE.Group();pad.position.set(x-def.pos[0],.1,z-def.pos[1]);g.add(pad);box(pad,1.1,.04,1.1,0,.02,0,k?'#5cc46a':'#f08a3a',false);padIcon(pad,ICON[k?def.out:def.in]);const st=new THREE.Group();st.position.y=.06;pad.add(st);return st;});
  return [id,{g,work,tag,inStack:zones[0],outStack:zones[1],def,b}];}));
 const shelves=Object.fromEntries(Object.entries(SHELVES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],1.08,def.pos[1]);scene.add(g);box(g,1.5,.05,.85,0,.025,0,'#c9d3d8',false);const st=new THREE.Group();st.position.y=.05;g.add(st);const pad=box(scene,1.1,.04,1.1,shelfZone(def.pos)[0],.12,shelfZone(def.pos)[1],'#f08a3a',false);pad.userData.icon=padIcon(scene,ICON[k],shelfZone(def.pos)[0],shelfZone(def.pos)[1],.15);const tag=sprite(1.3,.4);tag.position.set(0,1.75,-.2);g.add(tag);return [k,{g,st,pad,tag}];}));
 // Deliveries: meat crate and cup dispenser, refilling by themselves.
 const sources=Object.fromEntries(Object.entries(SOURCES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],0,def.pos[1]);scene.add(g);
  if(k==='meat'||k==='milk'){box(g,1.6,.3,1.2,0,.15,0,k==='milk'?'#3a8ee0':'#c98a4a');box(g,1.5,.05,1.1,0,.31,0,'#dfe8ec',false);}else{box(g,1.6,.25,1.2,0,.125,0,'#9aa4ab');box(g,1.6,1.6,.2,0,.8,-.5,'#e8edf0');const logo=textPlane('GOBELETS',1.3,.3,{bg:'#e8edf0',fg:'#3a8ee0'});logo.position.set(0,1.3,-.39);g.add(logo);}
  const st=new THREE.Group();st.position.y=k==='cups'?.26:.33;g.add(st);const tag=sprite(1.4,.4);tag.position.set(0,1.9,0);g.add(tag);return [k,{g,st,tag}];}));
 // Registers: till on the counter, card terminal when bought, serving pad behind it, cash pile (bundles of notes) beside it.
 const registers=REGISTERS.map((R,i)=>{const g=new THREE.Group();scene.add(g);const till=new THREE.Group();till.position.set(R.pos[0],1.05,R.pos[1]);g.add(till);box(till,.6,.4,.4,0,.2,0,'#3d454b');box(till,.5,.32,.04,0,.55,-.1,'#7fb7d9');
  const term=new THREE.Group();term.position.set(R.pos[0]+.55,1.08,R.pos[1]+.15);g.add(term);box(term,.18,.06,.3,0,.03,0,'#20262a');const tb=box(term,.16,.22,.05,0,.15,-.08,'#2b3a44');tb.rotation.x=-.4;box(term,.12,.08,.01,0,.2,-.05,'#7fd6a0',false).rotation.x=-.4;
  const serve=box(g,1.2,.04,1.2,R.serve[0],.12,R.serve[1],'#7fb7d9',false);padIcon(g,'🛎️',R.serve[0],R.serve[1],.15);
  const cash=new THREE.Group();cash.position.set(R.cash[0],.1,R.cash[1]);g.add(cash);box(cash,1.3,.04,1.3,0,.02,0,'#5cc46a',false);padIcon(cash,'💵',0,.05,.8);const pile=new THREE.Group();pile.position.y=.04;cash.add(pile);return {g,serve,term,pile};});
 // Self-order kiosks: tall totems with a screen; the screen lights up while a customer orders.
 const kiosks=KIOSKS.map(([x,z])=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(g,.7,.12,.5,0,.06,0,'#3d454b');box(g,.55,1.7,.3,0,.9,0,'#f4f6f7');const scr=textPlane('Commandez ici',.46,.7,{bg:'#2b6fd6',font:'800 64px system-ui'});scr.position.set(0,1.25,.16);g.add(scr);box(g,.3,.05,.1,0,.6,.18,'#20262a');return {g,scr};});

 // Terrace: tables with stools, a dirty tray on each table to clear, and the dish sink where trays go.
 const terrace=new THREE.Group();scene.add(terrace);
 const tables=TABLES.map(([x,z])=>{const g=new THREE.Group();g.position.set(x,0,z);terrace.add(g);cyl(g,.06,.7,0,.35,0,'#59646b');box(g,.9,.06,.9,0,.72,0,'#f4f1ea');for(const dz of [-.7,.7])cyl(g,.2,.45,0,.22,dz,'#e8483a');
  const tray=item('tray');tray.position.y=.75;g.add(tray);const food=new THREE.Group();food.position.y=.75;g.add(food);return {tray,food};});
 {const g=new THREE.Group();g.position.set(SINK[0],0,SINK[1]);terrace.add(g);box(g,1.2,.85,.8,0,.42,0,'#c9d1d6');box(g,.9,.06,.55,0,.86,0,'#7fb7d9',false);cyl(g,.03,.4,0,1.05,-.3,'#9aa4ab');box(g,.04,.04,.25,0,1.24,-.2,'#9aa4ab');
  const t=sprite(1.4,.4);t.position.set(0,1.8,0);g.add(t);pill(t,'🧽 Plonge');}
 const sinkPile=new THREE.Group();sinkPile.position.set(SINK[0],.9,SINK[1]);terrace.add(sinkPile);
 // Office desk for the bills: a pile of papers, one sheet per bill to pay, red when one is late.
 const desk=new THREE.Group();desk.position.set(DESK[0],0,DESK[1]);scene.add(desk);box(desk,1.4,.08,.8,0,.74,0,'#8a5a35');for(const [x,z] of [[-.62,-.32],[.62,-.32],[-.62,.32],[.62,.32]])box(desk,.07,.72,.07,x,.36,z,'#6b4428');
 box(desk,.5,.06,.5,0,.45,-.75,'#3d454b');box(desk,.5,.5,.06,0,.75,-.98,'#3d454b');const pad=box(desk,1.4,.04,1.2,0,.02,-1.2,'#f6c945',false);padIcon(desk,'🧾',0,-1.2,.05,.8);
 const papers=new THREE.Group();papers.position.set(.2,.79,0);desk.add(papers);const deskTag=sprite(2.2,.5);deskTag.position.set(0,1.7,0);desk.add(deskTag);
 // Charging dock for the robots.
 const dock=new THREE.Group();dock.position.set(DOCK[0],0,DOCK[1]);scene.add(dock);box(dock,1.2,.5,.6,0,.25,0,'#59646b');box(dock,.9,.3,.05,0,.6,.31,'#2b3a44');const dockLamp=box(dock,.3,.08,.02,0,.62,.34,'#4fbf5a',false);box(dock,1.3,.03,1.3,0,.02,.95,'#5fe0ff',false);padIcon(dock,'🔋',0,.95,.05,.8);
 // Drive: the road east of the restaurant, a booth with its window, the pad where orders are put, and the cars in line.
 const drive=new THREE.Group();scene.add(drive);box(drive,2.6,.04,44,DRIVE.road,.03,-6,'#59646b',false);for(let z=-26;z<16;z+=2.4)box(drive,.12,.01,1.2,DRIVE.road,.06,z,'#f4f1ea',false);
 box(drive,.3,2.2,2.2,16.9,1.1,DRIVE.pad[1],'#e8483a');box(drive,.32,.7,1,16.9,1.2,DRIVE.pad[1],'#7fb7d9');const dsign=textPlane('DRIVE',1.2,.36,{bg:'#e8483a'});dsign.position.set(17.06,1.95,DRIVE.pad[1]);dsign.rotation.y=Math.PI/2;drive.add(dsign);
 box(drive,1.1,.04,1.1,DRIVE.pad[0],.12,DRIVE.pad[1],'#7fb7d9',false);padIcon(drive,'🚗',DRIVE.pad[0],DRIVE.pad[1],.15,.8);const drivePile=new THREE.Group();drivePile.position.set(DRIVE.pad[0],.14,DRIVE.pad[1]);drive.add(drivePile);
 const cars=new Map(),CAR_COLORS=['#e8483a','#3a8ee0','#f6c945','#5fbf6a','#f4f1ea'];
 function carModel(color){const g=new THREE.Group(),b=new THREE.Group();g.add(b);box(b,1.3,.55,2.1,0,.45,0,color);box(b,1.1,.45,1.1,0,.92,.1,'#cfe6f2');box(b,1.14,.06,1.14,0,1.17,.1,color);for(const x of [-.62,.62])for(const z of [-.65,.7]){const w=cyl(g,.22,.16,x,.22,z,'#20262a');w.rotation.z=Math.PI/2;}
  const bubble=sprite(1.9,.5);bubble.position.set(0,2,0);g.add(bubble);scene.add(g);return {g,bubble};}
 // Inspector waiting by the counter while an inspection is on.
 const inspector=person('#f4f1ea',{hat:'#2b3a44'});inspector.position.set(4.2,0,-.6);inspector.rotation.y=Math.PI;inspector.visible=false;
 const inspTag=sprite(1.9,.5);inspTag.position.set(0,2.1,0);inspector.add(inspTag);
 const cashList=(v,max)=>{const n=Math.min(max,Math.floor(v/20));return [...repeat('bundle',n),...(v-n*20>=1?['coins']:[])];};
 // Back office: the safe with the cash it holds, the bank terminal, and the pneumatic tubes from the tills to the safe.
 const safe=new THREE.Group();safe.position.set(SAFE[0],0,SAFE[1]);scene.add(safe);box(safe,1.4,1.5,1,0,.75,0,'#4a535a');box(safe,1.1,1.2,.06,0,.78,.52,'#5d676f');
 const dial=cyl(safe,.17,.06,.2,.95,.56,'#c9d1d6');dial.rotation.x=Math.PI/2;for(let i=0;i<3;i++){const h=box(safe,.05,.3,.05,-.3,.75,.6,'#c9d1d6');h.rotation.z=i*Math.PI/3;}
 box(safe,1.2,.03,1,1.5,.02,0,'#5cc46a',false);const safePile=new THREE.Group();safePile.position.set(1.5,.04,0);safe.add(safePile);const safeTag=sprite(2.2,.5);safeTag.position.set(0,2.1,0);safe.add(safeTag);
 const atm=new THREE.Group();atm.position.set(ATM[0],0,ATM[1]);scene.add(atm);box(atm,.9,1.8,.7,0,.9,0,'#2b6fd6');const scr=textPlane('BANQUE',.6,.36,{bg:'#0f2a55',fg:'#9fe0ff'});scr.position.set(0,1.35,.36);atm.add(scr);box(atm,.5,.08,.25,0,.95,.42,'#20262a');box(atm,.4,.05,.02,0,.7,.36,'#9aa4ab',false);
 const atmTag=sprite(1.7,.45);atmTag.position.set(0,2.3,0);atm.add(atmTag);
 const tubeMat=new THREE.MeshStandardMaterial({color:'#bfe9ff',transparent:true,opacity:.45,roughness:.2,depthWrite:false}),tubes=new THREE.Group();scene.add(tubes);
 const tubePath=r=>{const c=REGISTERS[r].cash,top=3.2+r*.25;return [[c[0],.6,c[1]],[c[0],top,c[1]],[c[0],top,SAFE[1]+.2],[SAFE[0],top,SAFE[1]+.2],[SAFE[0],1.5,SAFE[1]+.2]].map(v=>new THREE.Vector3(...v));};
 const paths=REGISTERS.map((R,r)=>{const pts=tubePath(r);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],m=new THREE.Mesh(geo.cyl,tubeMat);m.scale.set(.09,a.distanceTo(b),.09);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());tubes.add(m);}
  const len=pts.slice(1).reduce((t,p,i)=>t+p.distanceTo(pts[i]),0);return {pts,len};});
 const at=(path,t)=>{let d=t*path.len;for(let i=1;i<path.pts.length;i++){const a=path.pts[i-1],b=path.pts[i],l=a.distanceTo(b);if(d<=l)return a.clone().lerp(b,d/l);d-=l;}return path.pts[path.pts.length-1].clone();};
 const capsules=new Map();
 // Megaphone pad by the entrance (starts a rush when stepped on) and the roadside billboard, one panel per advertising level.
 const mega=new THREE.Group();mega.position.set(MEGAPHONE[0],.1,MEGAPHONE[1]);scene.add(mega);const megaPad=box(mega,1.2,.04,1.2,0,.02,0,'#f6c945',false);padIcon(mega,'📣',0,0,.05,.85);
 cyl(mega,.05,1.6,.75,.8,-.45,'#59646b');const horn=new THREE.Mesh(new THREE.ConeGeometry(.28,.6,14,1,true),mat('#e8483a'));horn.material.side=THREE.DoubleSide;horn.rotation.z=Math.PI/2;horn.position.set(.6,1.65,-.45);mega.add(horn);
 const megaTag=sprite(2.2,.55);megaTag.position.set(0,2.3,0);mega.add(megaTag);
 const board=new THREE.Group();board.position.set(15.2,0,7.4);board.rotation.y=.38;scene.add(board);for(const x of [-1.1,1.1])box(board,.14,2.6,.14,x,1.3,-.14,'#59646b');
 const panels=[0,1,2].map(i=>{const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=['#e8483a','#f6a23a','#3aa0d8'][i];ctx.fillRect(0,0,256,128);ctx.fillStyle='#fff';ctx.font='900 46px system-ui';ctx.textAlign='center';ctx.fillText(['FLUX BURGER','FRITES MAISON','-20% MIDI'][i],128,62,236);ctx.font='70px system-ui';ctx.fillText(['🍔','🍟','⭐'][i],128,120);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
  const m=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.3,.12),[mat('#ffffff'),mat('#ffffff'),mat('#ffffff'),mat('#ffffff'),new THREE.MeshStandardMaterial({map}),mat('#ffffff')]);m.position.set(0,1.9+i*1.4,0);m.castShadow=true;board.add(m);if(i){const pole=box(board,.14,1.4,.14,0,1.9+i*1.4-.7,-.14,'#59646b');m.userData.pole=pole;}return m;});

 // Unlock tiles: dashed square, name and price, filling as the player pays; levelled upgrades show what the level brings.
 const tiles=new Map();let shownTiles=null;function tile(u){const g=new THREE.Group();g.position.set(u.pos[0],.13,u.pos[1]);const c=document.createElement('canvas');c.width=c.height=256;const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map,transparent:true}));plane.rotation.x=-Math.PI/2;g.add(plane);scene.add(g);let last='';
  g.userData.draw=(paid)=>{const key=paid;if(key===last)return;last=key;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle=u.level?'#fff3c455':'#ffffff55';ctx.fillRect(14,14,228,228);ctx.fillStyle='#5fd06acc';const f=paid/u.price;ctx.fillRect(14,242-228*f,228,228*f);ctx.setLineDash([26,18]);ctx.lineWidth=10;ctx.strokeStyle=u.level?'#ffe08a':'#fff';ctx.strokeRect(14,14,228,228);
   ctx.fillStyle='#2b3a44';ctx.textAlign='center';ctx.font='800 32px system-ui';ctx.fillText(u.name,128,u.tip?72:92,220);ctx.font='900 54px system-ui';ctx.fillText(`${(u.price-paid).toLocaleString('fr-FR')} $`,128,u.tip?140:168,220);if(u.tip){ctx.font='700 22px system-ui';ctx.fillText(u.tip,128,196,220);}map.needsUpdate=true;};return g;}

 const customers=new Map(),helpers=new Map(),popups=new Map(),COLORS=['#e86a7a','#6a8ee8','#e8b86a','#8ad06a','#b06ae8','#6ad0c8'];
 const POP={money:{bg:'#2f9e4fee',fg:'#fff'},card:{bg:'#2b6fd6ee',fg:'#fff'},info:{bg:'#26343fee',fg:'#fff'},bad:{bg:'#e8483aee',fg:'#fff'}};
 const player=person('#3aa0d8',{hat:'#1f6f9a'}),cashiers=REGISTERS.map(()=>{const c=person('#e46ab0');c.visible=false;return c;});let time=0,showMissions=false;
 const DAYC={clear:new THREE.Color('#9fd46a'),ground:new THREE.Color('#a9db6e'),sun:new THREE.Color('#fff4e0')},NIGHTC={clear:new THREE.Color('#22324a'),ground:new THREE.Color('#3f5d55'),sun:new THREE.Color('#9fb4ff')},DUSK=new THREE.Color('#ffb070'),tmpC=new THREE.Color();
 // Light of the day: bright from 9:00 to 19:00, warm at dusk, dark blue at night (the kitchen stays readable).
 function daylight(s){const h=hourOf(s),n=s.clock>=OPEN?1:h>=20?(h-20)/3*.8:h<9?(9-h)*.25:0,dusk=h>=18&&s.clock<OPEN?Math.min(1,(h-18)/2)*(1-n):0;
  sun.intensity=2.6*(1-.65*n);hemi.intensity=2.1*(1-.5*n);sun.color.copy(DAYC.sun).lerp(DUSK,dusk*.6).lerp(NIGHTC.sun,n);
  renderer.setClearColor(tmpC.copy(DAYC.clear).lerp(NIGHTC.clear,n));ground.material.color.copy(DAYC.ground).lerp(NIGHTC.ground,n);}
 function sync(dt){const s=getState();time+=dt;daylight(s);
  animate(player,s.player,time);stackOf(player.userData.back,s.player.carry,carryLayout(s.player.carry.length));
  s.cashiers.forEach((c,i)=>{cashiers[i].visible=!!c;if(c)animate(cashiers[i],{...c,moving:false,heading:0},time);});
  for(const h of s.helpers){let g=helpers.get(h.id);if(!g){g=h.robot?robotModel(chainColor(h.loop)):person(chainColor(h.loop),{hat:'#ffffff'});const tag=sprite(1.7,.45);tag.position.set(0,h.robot?1.7:2,0);g.add(tag);g.userData.tag=tag;helpers.set(h.id,g);}animate(g,h,time);if(h.robot){const f=(h.batt??1)/(h.battMax??1);g.userData.lamp.material=mat(h.charging?'#5fe0ff':f>.5?'#4fbf5a':f>.15?'#f0a830':'#e8483a');}
   g.userData.tag.visible=showMissions||h.loop==='rest'||!!h.charging;pill(g.userData.tag,h.charging?`🔋 ${Math.round(h.batt/h.battMax*100)} %`:MISSIONS.find(m=>m.id===h.loop)?.icon??'',h.loop==='rest'?{bg:'#c9d3d8ee'}:h.charging?{bg:'#5fe0ffee'}:{});stackOf(g.userData.back,h.carry,carryLayout(h.carry.length));}
  fenceSmall.visible=!s.unlocked.field2;fenceBig.visible=!!s.unlocked.field2;
  const wet=!!s.unlocked.water;
  for(const sp of sprinklers){sp.g.visible=wet&&(sp.zone===1||!!s.unlocked.field2);if(!sp.g.visible)continue;
   for(const d of sp.drops){const t=(d.userData.phase+time*.9)%1,a=sp.spin+time*1.8+(d.userData.lane?Math.PI:0)+t*.5,r=.15+t*1.25;d.position.set(Math.cos(a)*r,.5+1.6*t-1.75*t*t,Math.sin(a)*r);d.scale.setScalar(.075*(1-t*.35));}}
  plots.forEach((v,i)=>{const p=s.plots[i],open=p.zone===1||!!s.unlocked.field2;v.g.visible=open;if(!open)return;v.soil[0].material=mat(wet?'#5a361f':'#7a4a2a');v.soil[1].material=v.soil[2].material=mat(wet?'#74462a':'#9a6038');v.plant.scale.setScalar(.25+.75*p.grow);v.flowers.visible=v.spuds.visible=p.ripe;v.plant.rotation.z=p.ripe?Math.sin(time*2.4+i)*.05:0;});
  farm.visible=!!s.unlocked.farm;const nc=cowCount(s);cows.forEach((c,i)=>{c.g.visible=i<nc;if(i>=nc)return;const st=s.cows[i];c.crate.visible=st.ready;c.head.rotation.z=-.25-Math.abs(Math.sin(time*.8+i))*.35;c.g.position.x=COWS[i][0]+Math.sin(time*.25+i*2)*.15;});
  for(const [id,v] of Object.entries(stations)){const st=s.stations[id],open=stationOpen(s,id),cap=stationCaps(s,id);v.g.visible=open;if(!open)continue;stackOf(v.inStack,repeat(v.def.in,st.in),{cols:3,rows:3,step:.32,dstep:.32});stackOf(v.outStack,repeat(v.def.out,st.out),{cols:3,rows:3,step:.34,dstep:.32});
   v.work.visible=st.working;const p=st.timer/stationTime(s,id);if(v.g.userData.fx){const T=stationTime(s,id)*v.def.baskets;for(const f of v.g.userData.fx)f.T=T;animateFryer(v.g.userData.fx,st.baskets??[],dt);}else if(v.g.userData.anim){const [fx,fn]=v.g.userData.anim;fn(fx,st.working,p);}else if(v.b==='butcher')v.work.position.y=.8+(st.working?Math.abs(Math.sin(time*9))*.2:0);
   animPuffs(v.g.userData.broken,!!st.broken,1.6,.25);
   if(st.broken)pill(v.tag,`🔧 PANNE ${Math.round(Math.min(1,st.broken.fix/REPAIR)*100)} %`,{bg:'#e8483aee',fg:'#fff'});else pill(v.tag,`${v.def.name}${stationTime(s,id)<v.def.time-1e-9?' ⚡':''} ${st.out}/${cap.outCap}`);}
  for(const [k,v] of Object.entries(sources)){const open=sourceOpen(s,k);v.g.visible=open;if(!open)continue;const n=s.sources[k].n;stackOf(v.st,repeat(SOURCES[k].item,n),k==='cups'?{cols:4,rows:2,step:.3,dstep:.3}:{cols:4,rows:3,step:.36,dstep:.34});const late=s.sources[k].late>0;pill(v.tag,late?`🚚 retard ${Math.ceil(s.sources[k].late)} s`:`${ICON[SOURCES[k].item]} ${n}/${sourceCap(s,k)}`,late?{bg:'#f6b94aee'}:{});}
  for(const [k,v] of Object.entries(shelves)){const open=shelfOpen(s,k);v.g.visible=open;v.pad.visible=v.pad.userData.icon.visible=open;if(!open)continue;stackOf(v.st,repeat(k,s.shelves[k]),{cols:4,rows:2,step:.33,dstep:.36});pill(v.tag,`${ICON[k]} ${s.shelves[k]}/${shelfCap(s,k)}`);}
  mega.visible=!!s.unlocked.megaphone;if(mega.visible){const ready=s.rushCool<=0;megaPad.material=mat(s.rush>0?'#e8483a':ready?'#f6c945':'#c9b98a');pill(megaTag,s.rush>0?`RUSH ${Math.ceil(s.rush)} s`:ready?'📣 Rush prêt':`Recharge ${Math.ceil(s.rushCool)} s`,s.rush>0?{bg:'#e8483aee',fg:'#fff'}:{});horn.scale.setScalar(s.rush>0?1+Math.abs(Math.sin(time*8))*.15:1);}
  const ads=adsLevel(s);board.visible=ads>0;panels.forEach((m,i)=>{m.visible=i<ads;if(m.userData.pole)m.userData.pole.visible=i<ads;});
  registers.forEach((r,i)=>{r.g.visible=registerOpen(s,i);r.term.visible=hasTerminal(s,i);r.serve.material=mat(s.cashiers[i]?'#b6a4e0':'#4f9be0');stackOf(r.pile,cashList(s.piles[i],36),{cols:2,rows:3,step:.5,dstep:.3});});
  const nk=kioskCount(s);kiosks.forEach((k,i)=>{k.g.visible=i<nk;});pickup.visible=nk>0;
  terrace.visible=!!s.unlocked.terrace;if(terrace.visible){tables.forEach((t,i)=>{const T=s.tables[i];t.tray.visible=T.dirty;const c=T.by&&s.customers.find(c=>c.id===T.by);stackOf(t.food,c&&c.phase==='eat'?PRODUCTS.flatMap(k=>repeat(k,c.got[k])):[],{cols:2,rows:2,step:.3,dstep:.3,max:6});});}
  const nb=s.bills.length,late=s.bills.some(b=>b.late);while(papers.children.length>nb)papers.remove(papers.children[papers.children.length-1]);while(papers.children.length<Math.min(nb,12)){const m=box(papers,.42,.012,.3,0,papers.children.length*.014,0,'#ffffff',false);m.rotation.y=(papers.children.length%3-1)*.15;}
  papers.children.forEach(m=>m.material=mat(late?'#ffd6d1':'#ffffff'));pill(deskTag,nb?`🧾 ${nb} facture${nb>1?'s':''} · ${billsDue(s)} $`:'🧾 Bureau · à jour',late?{bg:'#e8483aee',fg:'#fff'}:nb?{bg:'#f6b94aee'}:{});
  dock.visible=s.helpers.some(h=>h.robot);dockLamp.material=mat(s.helpers.some(h=>h.charging)?'#5fe0ff':'#4fbf5a');
  drive.visible=!!s.unlocked.drive;stackOf(drivePile,s.drive.pad,{cols:3,rows:2,step:.32,dstep:.32});
  const seenCars=new Set();for(const c of s.drive.cars){seenCars.add(c.id);let v=cars.get(c.id);if(!v){v=carModel(CAR_COLORS[c.look%CAR_COLORS.length]);cars.set(c.id,v);}v.g.position.set(DRIVE.road,0,c.z);v.g.rotation.y=Math.PI;v.g.children[0].position.y=c.moving?Math.sin(time*20)*.015:0;
   const left=PRODUCTS.map(k=>c.wants[k]-c.got[k]?`${ICON[k]}${c.wants[k]-c.got[k]}`:'').filter(Boolean).join(' ');v.bubble.visible=c.phase==='queue';if(c.phase==='queue'){const f=c.wait/DRIVE.patience;pill(v.bubble,`🚗 ${left||'✓'}`,f<.4?{}:f<.7?{bg:'#f6b94aee'}:{bg:'#e8483aee',fg:'#fff'});}}
  for(const [id,v] of cars)if(!seenCars.has(id)){drop(v.g);cars.delete(id);}
  safe.visible=!!s.unlocked.safe;if(safe.visible){stackOf(safePile,cashList(s.safe,30),{cols:2,rows:3,step:.5,dstep:.3});pill(safeTag,`🔐 ${Math.round(s.safe).toLocaleString('fr-FR')} $`);}
  atm.visible=!!s.unlocked.bank;if(atm.visible)pill(atmTag,'🏦 Banque');
  tubes.visible=!!s.unlocked.tubes;const seenCap=new Set();for(const c of s.capsules){seenCap.add(c.id);let m=capsules.get(c.id);if(!m){m=new THREE.Group();const b=new THREE.Mesh(geo.cap,mat('#f6c945'));b.scale.setScalar(.45);b.rotation.z=Math.PI/2;m.add(b);scene.add(m);capsules.set(c.id,m);}m.position.copy(at(paths[c.r],Math.min(1,c.t)));}
  for(const [id,m] of capsules)if(!seenCap.has(id)){drop(m);capsules.delete(id);}
  const insp=s.event?.kind==='inspection';inspector.visible=insp;if(insp){animate(inspector,{x:4.2,z:-.6,heading:Math.PI,moving:false},time);pill(inspTag,`🧑‍⚕️ ${Math.ceil(s.event.t)} s`,{bg:'#26343fee',fg:'#fff'});}
  const shown=visibleUnlocks(s);for(const u of shown){let g=tiles.get(u.key);if(!g){g=tile(u);tiles.set(u.key,g);}g.userData.draw(s.paid[u.key]??0);}if(shown!==shownTiles){shownTiles=shown;const keys=new Set(shown.map(u=>u.key));for(const [k,g] of tiles)if(!keys.has(k)){drop(g);tiles.delete(k);}}
  const seen=new Set();for(const c of s.customers){seen.add(c.id);let g=customers.get(c.id);if(!g){g=person(COLORS[c.look%COLORS.length]);const b=sprite(1.8,.5);b.position.set(0,2.05,0);g.add(b);g.userData.bubble=b;customers.set(c.id,g);}
   animate(g,c,time);stackOf(g.userData.back,c.phase==='leave'&&c.happy?PRODUCTS.flatMap(k=>repeat(k,c.got[k])):[],{cols:2,step:.34});
   const left=PRODUCTS.map(k=>c.wants[k]-c.got[k]?`${ICON[k]}${c.wants[k]-c.got[k]}`:'').filter(Boolean).join(' ');const waiting=c.phase==='queue'||c.phase==='kiosk'||c.phase==='pickup';g.userData.bubble.visible=waiting;
   if(waiting){const f=c.wait/PATIENCE,text=c.phase==='kiosk'&&c.order>0?`📝 ${Math.round(c.order/KIOSK_ORDER*100)} %`:`${c.card?'💳':'💵'} ${left||'✓'}`;pill(g.userData.bubble,text,f<.4?{}:f<.7?{bg:'#f6b94aee'}:{bg:'#e8483aee',fg:'#fff'});}}
  for(const [id,g] of customers)if(!seen.has(id)){drop(g);customers.delete(id);}
  for(const p of s.popups){let g=popups.get(p.id);if(!g){g=sprite(1.8,.55);scene.add(g);pill(g,p.text,{...(POP[p.kind]??POP.money),size:.55});popups.set(p.id,g);}g.position.set(p.x,2+p.t*1.6,p.z);g.material.opacity=1-p.t/1.4;}
  for(const [id,g] of popups)if(!s.popups.some(p=>p.id===id)){drop(g);popups.delete(id);}
  // Camera follows the player from the front-top, like a tabletop diorama.
  const px=s.player.x,pz=s.player.z,cx=camera.userData.x??px,cz=camera.userData.z??pz,nx=cx+(px-cx)*Math.min(1,dt*4),nz=cz+(pz-cz)*Math.min(1,dt*4);camera.userData.x=nx;camera.userData.z=nz;camera.position.set(nx+6,20,nz+15);camera.lookAt(nx,0,nz-1);sun.position.set(nx-10,30,nz+12);sun.target.position.set(nx,0,nz);}
 function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),half=aspect<1?(r.width<500?8.6:10):(r.height<500?6.6:8.5);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 return {three:scene,camera,setShowMissions(v){showMissions=!!v;},update(dt){sync(dt);renderer.render(scene,camera);},reset(){for(const m of [customers,helpers,popups,tiles])for(const [id,g] of m){drop(g);m.delete(id);}shownTiles=null;}};}
