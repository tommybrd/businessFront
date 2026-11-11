import * as THREE from 'three';
import {PITCHES,KINDS,doorOf,RECEPTION,SHOP,SHELVES,SOURCES,SANIT,DUMP,POOL,STAGE,ELEC,DESK,GATE,ROAD_Z,ROAD_END,visibleUnlocks,pitchOpen,sourceOpen,shelfOpen,shelfCap,sourceCap,sanitCap,cabins,dumpCap,hourOf,OPEN,PATIENCE,MISSIONS,billsDue,REPAIR,EVENTS,SHOWS,shelfZone,ITEMS} from './camping-engine.js';

// Low-poly view of the campsite: pitches with their tents and caravans, the toilet block, the shop, the pool and the stage show
// what the simulation holds. Nothing here decides anything.
export function createCampingScene(canvas,getState){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#9fd46a');
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,200),sun=new THREE.DirectionalLight('#fff4e0',2.6);const small=matchMedia('(max-width:700px),(pointer:coarse)').matches;sun.castShadow=true;sun.shadow.mapSize.set(small?1024:2048,small?1024:2048);Object.assign(sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:120});sun.shadow.normalBias=.03;const hemi=new THREE.HemisphereLight('#ffffff','#7a9a5a',2.1);scene.add(sun,sun.target,hemi);
 const mats=new Map(),mat=c=>{if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.85}));return mats.get(c);};
 const geo={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(1,1,1,16),sphere:new THREE.SphereGeometry(1,12,10),cap:new THREE.CapsuleGeometry(.28,.5,4,10),pyr:new THREE.ConeGeometry(1,1,4)};
 function box(p,w,h,d,x,y,z,c,shadow=true){const m=new THREE.Mesh(geo.box,mat(c));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;p.add(m);return m;}
 function cyl(p,r,h,x,y,z,c){const m=new THREE.Mesh(geo.cyl,mat(c));m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;}
 function ball(p,r,x,y,z,c,sy=1){const m=new THREE.Mesh(geo.sphere,mat(c));m.scale.set(r,r*sy,r);m.position.set(x,y,z);m.castShadow=true;p.add(m);return m;}
 function sprite(w,h,cw=256){const c=document.createElement('canvas');c.width=cw;c.height=Math.round(cw*h/w);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map,depthTest:false,transparent:true}));s.scale.set(w,h,1);s.renderOrder=20;let last='';s.userData.draw=(key,paint)=>{if(key===last)return;last=key;const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);paint(ctx,c.width,c.height);map.needsUpdate=true;};return s;}
 function pill(s,text,{bg='#ffffffee',fg='#2b3a44',size=.5}={}){s.userData.draw(text+bg+fg,(ctx,w,h)=>{ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(4,4,w-8,h-8,h/2-4);ctx.fill();ctx.fillStyle=fg;ctx.font=`800 ${Math.round(h*size)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,w/2,h/2+2,w-16);});}
 function textPlane(text,w,h,{bg='#26343f',fg='#fff',font='900 64px system-ui'}={}){const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.font=font;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2+4,c.width-30);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.6}));}
 function padIcon(p,emoji,x=0,z=0,y=.05,size=.75){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.globalAlpha=.85;ctx.font='92px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,64,70);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);p.add(m);return m;}
 const repeat=(k,n)=>Array.from({length:Math.max(0,n)},()=>k);
 const ICON={paper:'🧻',bread:'🥖',ice:'🍦',chlor:'🧪',trash:'🗑️'};

 // Carried goods and stacks: a few small meshes sharing geometries and materials, rebuilt only when the list changes.
 const H={paper:.17,bread:.17,ice:.34,chlor:.32,trash:.4,bundle:.07};
 function itemMesh(k){const g=new THREE.Group();
  if(k==='paper'){cyl(g,.14,.16,0,.08,0,'#f6f6f2');cyl(g,.145,.03,0,.08,0,'#d8b27a');}
  else if(k==='bread'){const b=new THREE.Mesh(geo.cap,mat('#d9a24f'));b.scale.setScalar(.5);b.rotation.z=Math.PI/2;b.rotation.y=.4;b.position.y=.085;b.castShadow=true;g.add(b);}
  else if(k==='ice'){const c=new THREE.Mesh(new THREE.CylinderGeometry(.085,.012,1,10),mat('#d9a35a'));c.scale.y=.22;c.position.y=.11;g.add(c);ball(g,.1,0,.25,0,'#f49ac1',.9);ball(g,.06,0,.32,0,'#fff5e6');}
  else if(k==='chlor'){cyl(g,.14,.28,0,.14,0,'#3a8ee0');cyl(g,.15,.04,0,.3,0,'#f4f2ea');}
  else if(k==='bundle'){box(g,.46,.06,.22,0,.035,0,'#79c47c',false);box(g,.07,.075,.225,0,.037,0,'#f2ead2',false);}
  else{ball(g,.2,0,.2,0,'#2f3a33',1.05);ball(g,.06,0,.42,0,'#2f3a33');}
  return g;}
 function stackOf(group,list,{cols=1,rows=1,step=.42,dstep=.42,max=40}={}){const key=list.length+':'+list.slice(-6).join(',')+cols+rows;if(group.userData.key===key)return;group.userData.key=key;
  for(const c of [...group.children])group.remove(c);const per=cols*rows,heights=new Map();
  list.slice(0,max).forEach((k,i)=>{const cell=i%per,col=cell%cols,row=Math.floor(cell/cols),y=heights.get(cell)??0,m=itemMesh(k);m.position.set((col-(cols-1)/2)*step,y,(row-(rows-1)/2)*dstep);m.rotation.y=((i*37)%7-3)*.1;group.add(m);heights.set(cell,y+(H[k]??.2));});}
 const carryLayout=n=>n<=10?{}:{cols:2,step:.36};
 function drop(g){scene.remove(g);g.traverse(o=>{if(o.isSprite||(o.isMesh&&o.material.isMeshBasicMaterial&&o.material.map)){o.material.map.dispose();o.material.dispose();if(o.isMesh)o.geometry.dispose();}});}

 // Characters.
 function person(color,{hat=null}={}){const g=new THREE.Group(),body=new THREE.Mesh(geo.cap,mat(color));body.position.y=.62;body.castShadow=true;g.add(body);ball(g,.24,0,1.25,0,'#f0c9a8');if(hat)box(g,.42,.12,.42,0,1.47,0,hat);
  const back=new THREE.Group();back.position.set(0,.85,-.38);g.add(back);g.userData.back=back;g.userData.body=body;scene.add(g);return g;}
 function animate(g,a,t){g.position.set(a.x,0,a.z);g.rotation.y=a.heading;g.userData.body.position.y=.62+(a.moving?Math.abs(Math.sin(t*12))*.07:0);}
 const JOB={clean:'#6ab04c',sanit:'#3a8ee0',shop:'#f0a830',pool:'#2fc7d8',fix:'#d8432f',rest:'#9aa4ab'};

 // Ground, alley, lanes, road and gate.
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({color:'#a9db6e',roughness:.85}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 box(scene,2,.05,30,0,.03,-5.8,'#eadcb8',false);
 for(const [x0,x1,z] of [[-14,0,2.15],[-14,0,-1.85],[-14,0,-5.85],[-14,0,-9.85],[-14,0,-15.85],[0,14,-5.85],[0,14,-9.85]])box(scene,x1-x0,.04,1.3,(x0+x1)/2,.03,z,'#eadcb8',false);
 box(scene,40,.05,2.6,0,.03,ROAD_Z,'#59646b',false);for(let x=-18;x<18;x+=2.4)box(scene,1.2,.01,.12,x,.06,ROAD_Z,'#f4f1ea',false);
 box(scene,12,.04,3.2,0,.02,7.2,'#d9c79a',false);
 {const g=new THREE.Group();g.position.set(GATE[0],0,GATE[1]);scene.add(g);for(const x of [-2.4,2.4])box(g,.3,3.4,.3,x,1.7,0,'#8a5a35');box(g,5.4,.9,.2,0,3.4,0,'#2f7d4f');
  const t=textPlane('CAMPING FLUX ★★★',4.8,.7,{bg:'#2f7d4f'});t.position.set(0,3.4,.11);g.add(t);box(g,.14,.14,2,-1.55,.9,0,'#f4f1ea');const arm=box(g,2.8,.12,.14,.1,1.2,0,'#e8483a');arm.rotation.z=.9;arm.position.x=-.9;arm.position.y=1.8;}
 // Lamp posts along the alley: they light up when the night comes.
 const lamps=[];for(const [x,z] of [[-1.5,6],[1.5,6],[-1.5,-4],[1.5,-4],[-1.5,-14],[1.5,-14],[7,-1],[7,-12]]){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);cyl(g,.05,2.3,0,1.15,0,'#3d454b');const l=new THREE.Mesh(geo.sphere,new THREE.MeshStandardMaterial({color:'#fff3c4',emissive:'#ffd36b',emissiveIntensity:0}));l.scale.setScalar(.2);l.position.y=2.35;g.add(l);lamps.push(l);}
 // Trees give the place its shade.
 for(const [x,z,r] of [[-15,-2,1.4],[-15,-10,1.6],[-15.2,-16,1.3],[16.4,-1,1.5],[16.6,-8,1.7],[16.2,-13,1.4],[-14.4,3.6,1.3],[0,-21,1.6],[-6,-21,1.5],[6,-21,1.6],[-12,-21,1.4],[12,-21.2,1.5],[16.4,7,1.3],[-16,8,1.5]]){const t=new THREE.Group();t.position.set(x,0,z);scene.add(t);cyl(t,.18,1.2,0,.6,0,'#7a4a2a');ball(t,r,0,1.7,0,'#3d8a36',.9);ball(t,r*.7,.5,2.3,.1,'#4b9a3e',.9);}

 // Reception: an open kiosk under a striped awning, a card terminal once bought, and the pad where the cash piles up.
 const recep=new THREE.Group();scene.add(recep);{const g=recep,[x,z]=RECEPTION.pos;box(g,2.6,1,.7,x,.5,z,'#c98a4a');box(g,2.7,.08,.8,x,1.04,z,'#eadcb8');
  for(const dx of [-1.2,1.2])box(g,.1,2.4,.1,x+dx,1.2,z-1.1,'#8a5a35');for(const dx of [-1.2,1.2])box(g,.1,2.4,.1,x+dx,1.2,z+.35,'#8a5a35');
  for(let i=0;i<8;i++)box(g,.34,.08,1.6,x-1.2+i*.34+.17,2.45,z-.38,i%2?'#ffffff':'#e8483a',false).rotation.x=-.12;
  const sign=textPlane('ACCUEIL · TARIFS : tente 24 $',2.5,.4,{bg:'#2f7d4f',font:'900 40px system-ui'});sign.position.set(x,1.9,z+.36);g.add(sign);
  box(g,1.2,.04,1.2,RECEPTION.serve[0],.06,RECEPTION.serve[1],'#7fb7d9',false);padIcon(g,'🛎️',RECEPTION.serve[0],RECEPTION.serve[1],.09);
  box(g,1.3,.04,1.3,RECEPTION.cash[0],.06,RECEPTION.cash[1],'#5cc46a',false);padIcon(g,'💵',RECEPTION.cash[0],RECEPTION.cash[1],.09,.8);}
 const recTerm=new THREE.Group();recTerm.position.set(RECEPTION.pos[0]+.8,1.08,RECEPTION.pos[1]);scene.add(recTerm);box(recTerm,.18,.06,.3,0,.03,0,'#20262a');box(recTerm,.16,.22,.05,0,.15,-.08,'#2b3a44').rotation.x=-.4;
 const recPile=new THREE.Group();recPile.position.set(RECEPTION.cash[0],.1,RECEPTION.cash[1]);scene.add(recPile);const recTag=sprite(2.2,.5);recTag.position.set(RECEPTION.pos[0],2.9,RECEPTION.pos[1]);scene.add(recTag);
 // Office: where the bills are paid (stand on the yellow pad); one sheet per bill, red when one is late.
 const office=new THREE.Group();scene.add(office);box(office,3.4,2,1.4,4.5,1,2.9,'#e9dcc0');box(office,3.7,.2,1.7,4.5,2.1,2.9,'#b8433a');const osign=textPlane('BUREAU',1.5,.38,{bg:'#8a5a35'});osign.position.set(4.5,1.5,3.62);office.add(osign);
 for(const x of [3.4,5.6])box(office,.5,.5,.04,x,1.3,3.61,'#7fb7d9',false);
 box(office,1.4,.04,1.2,DESK[0],.06,DESK[1],'#f6c945',false);padIcon(office,'🧾',DESK[0],DESK[1],.09,.8);const papers=new THREE.Group();papers.position.set(DESK[0],.1,DESK[1]);office.add(papers);const deskTag=sprite(2.2,.5);deskTag.position.set(DESK[0],1.7,DESK[1]);office.add(deskTag);

 // Shop: a wooden hut with a counter; bread and ice creams are displayed on it, and put there by whoever restocks the pads.
 const shop=new THREE.Group();scene.add(shop);{const g=shop;box(g,4.8,2,.95,-5.7,1,3.0,'#c98a4a');box(g,5.2,.2,1.4,-5.7,2.1,3.0,'#2f7d4f');const t=textPlane('ÉPICERIE · PAIN · GLACES',3.3,.4,{bg:'#f4f1ea',fg:'#8a3a2a',font:'900 40px system-ui'});t.position.set(-5.7,1.55,3.5);g.add(t);
  box(g,4.8,1,.7,-5.75,.5,5.6,'#d9a35a');box(g,4.9,.08,.8,-5.75,1.04,5.6,'#eadcb8');for(const dx of [-2.3,2.3])box(g,.1,2.4,.1,-5.75+dx,1.2,6.0,'#8a5a35');
  for(let i=0;i<10;i++)box(g,.5,.08,1.6,-8+i*.5+.25,2.45,5.3,i%2?'#ffffff':'#f0a830',false).rotation.x=-.12;
  box(g,.6,.4,.4,SHOP.till[0],1.28,SHOP.till[1],'#3d454b');
  box(g,1.2,.04,1.2,SHOP.serve[0],.06,SHOP.serve[1],'#7fb7d9',false);padIcon(g,'🛒',SHOP.serve[0],SHOP.serve[1],.09);
  box(g,1.3,.04,1.3,SHOP.cash[0],.06,SHOP.cash[1],'#5cc46a',false);padIcon(g,'💵',SHOP.cash[0],SHOP.cash[1],.09,.8);}
 const shopTerm=new THREE.Group();shopTerm.position.set(SHOP.till[0]+.7,1.08,SHOP.till[1]);scene.add(shopTerm);box(shopTerm,.18,.06,.3,0,.03,0,'#20262a');box(shopTerm,.16,.22,.05,0,.15,-.08,'#2b3a44').rotation.x=-.4;
 const shopPile=new THREE.Group();shopPile.position.set(SHOP.cash[0],.1,SHOP.cash[1]);scene.add(shopPile);
 const shelves=Object.fromEntries(Object.entries(SHELVES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],1.1,def.pos[1]);scene.add(g);const st=new THREE.Group();g.add(st);
  const z=shelfZone(def.pos),pad=box(scene,1.1,.04,1.1,z[0],.06,z[1],'#f08a3a',false),ic=padIcon(scene,ICON[k],z[0],z[1],.09);const tag=sprite(1.3,.4);tag.position.set(0,1.1,0);g.add(tag);return [k,{g,st,pad,ic,tag}];}));
 // Deliveries and supplies: a crate for each; the baker's basket is filled once a day, at dawn.
 const sources=Object.fromEntries(Object.entries(SOURCES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],0,def.pos[1]);scene.add(g);
  if(k==='ice'){box(g,1.6,.9,1.1,0,.45,0,'#f7f7f2');box(g,1.65,.08,1.15,0,.92,0,'#3a8ee0');const lg=textPlane('GLACES',1,.28,{bg:'#f7f7f2',fg:'#e0679b'});lg.position.set(0,.55,.56);g.add(lg);}
  else if(k==='bread'){box(g,1.5,.3,1,0,.15,0,'#b98a52');box(g,1.4,.04,.9,0,.31,0,'#e9d9b0',false);}
  else if(k==='chlor'){box(g,1.6,.5,1.1,0,.25,0,'#3a8ee0');box(g,1.5,.05,1,0,.52,0,'#dfe8ec',false);}
  else{box(g,1.6,.5,1.1,0,.25,0,'#c98a4a');box(g,1.5,.05,1,0,.52,0,'#dfe8ec',false);}
  const st=new THREE.Group();st.position.y=k==='ice'?.95:k==='bread'?.33:.55;g.add(st);const tag=sprite(1.6,.4);tag.position.set(0,k==='ice'?1.9:1.6,0);g.add(tag);return [k,{g,st,tag}];}));
 // Toilet and shower block: one door per cabin, a toilet-paper pad and a mop pad; the walls show how dirty it is.
 const sanit=new THREE.Group();sanit.position.set(SANIT.pos[0],0,SANIT.pos[1]);scene.add(sanit);box(sanit,4.5,2.2,2.6,0,1.1,0,'#dfe8ec');box(sanit,4.8,.2,2.9,0,2.3,0,'#5b8fb9');const ssign=textPlane('WC · DOUCHES',2.2,.38,{bg:'#2b6fd6'});ssign.position.set(0,1.95,1.31);sanit.add(ssign);
 const doors=Array.from({length:8},(_,i)=>{const d=box(sanit,.42,1.2,.04,(i-3.5)*.54,.62,1.31,'#5b8fb9',false);const lamp=box(sanit,.1,.07,.04,(i-3.5)*.54,1.32,1.33,'#4fbf5a',false);return {d,lamp};});
 const dirtPlane=box(sanit,4.5,.03,.9,0,.04,1.75,'#6b4a2a',false);dirtPlane.material=new THREE.MeshStandardMaterial({color:'#6b4a2a',transparent:true,opacity:0,depthWrite:false});
 box(sanit,1.1,.04,1.1,SANIT.paper[0]-SANIT.pos[0],.06,SANIT.paper[1]-SANIT.pos[1],'#f08a3a',false);padIcon(sanit,'🧻',SANIT.paper[0]-SANIT.pos[0],SANIT.paper[1]-SANIT.pos[1],.09);
 box(sanit,1.1,.04,1.1,SANIT.mop[0]-SANIT.pos[0],.06,SANIT.mop[1]-SANIT.pos[1],'#f6c945',false);padIcon(sanit,'🧽',SANIT.mop[0]-SANIT.pos[0],SANIT.mop[1]-SANIT.pos[1],.09);
 const paperTag=sprite(1.6,.42),mopTag=sprite(1.8,.42);paperTag.position.set(SANIT.paper[0]-SANIT.pos[0],1.2,SANIT.paper[1]-SANIT.pos[1]);mopTag.position.set(SANIT.mop[0]-SANIT.pos[0],1.2,SANIT.mop[1]-SANIT.pos[1]);sanit.add(paperTag,mopTag);
 // Skip for the rubbish bags.
 const dump=new THREE.Group();dump.position.set(DUMP.pos[0],0,DUMP.pos[1]);scene.add(dump);box(dump,2,1,1.2,0,.55,0,'#2f7d4f');box(dump,2.1,.12,1.3,0,1.12,0,'#256a3f');const dumpPile=new THREE.Group();dumpPile.position.set(0,1.18,0);dump.add(dumpPile);
 const dumpTag=sprite(1.8,.45);dumpTag.position.set(0,2.2,0);dump.add(dumpTag);box(scene,1.1,.04,1.1,DUMP.spot[0],.06,DUMP.spot[1],'#8a8f93',false);padIcon(scene,'🗑️',DUMP.spot[0],DUMP.spot[1],.09);
 // Power box of the caravan area.
 const elec=new THREE.Group();elec.position.set(ELEC[0],0,ELEC[1]);scene.add(elec);box(elec,.6,1,.4,0,.5,0,'#8a959b');box(elec,.5,.5,.05,0,.65,.22,'#f6c945',false);const elecTag=sprite(1.4,.4);elecTag.position.set(0,1.5,0);elec.add(elecTag);
 // Pool: tiled edge, water, a fence with a gate on the alley side, loungers, the chlorine pad and a lifeguard chair.
 const pool=new THREE.Group();scene.add(pool);{const W=POOL.x1-POOL.x0,D=POOL.z1-POOL.z0,cx=(POOL.x0+POOL.x1)/2,cz=(POOL.z0+POOL.z1)/2;box(pool,W+.7,.3,D+.7,cx,.15,cz,'#eef2f4');
  const water=box(pool,W,.04,D,cx,.32,cz,'#43b5e8',false);water.material=new THREE.MeshStandardMaterial({color:'#43b5e8',transparent:true,opacity:.82,roughness:.2});pool.userData.water=water;
  for(const [x,z] of [[10.4,-14.9],[12.2,-14.9]]){const l=box(pool,.7,.14,1.6,x,.24,z,'#f6c945');l.position.z=z;}
  box(pool,1.1,.04,1.1,POOL.pad[0],.06,POOL.pad[1],'#3a8ee0',false);padIcon(pool,'🧪',POOL.pad[0],POOL.pad[1],.09);
  box(pool,.5,1.5,.5,15.1,.75,-16.5,'#e8483a');box(pool,.8,.1,.8,15.1,1.55,-16.5,'#f4f1ea');}
 const poolTag=sprite(1.9,.45);poolTag.position.set(POOL.pad[0],1.3,POOL.pad[1]);pool.add(poolTag);
 const ducks=Array.from({length:4},(_,i)=>{const d=new THREE.Group();ball(d,.18,0,.2,0,'#f6d23a',.8);ball(d,.1,.16,.34,0,'#f6d23a');box(d,.1,.04,.08,.27,.32,0,'#f08a3a',false);d.userData.i=i;pool.add(d);return d;});
 // Stage for the evening show.
 const stage=new THREE.Group();stage.position.set(STAGE.pos[0],0,STAGE.pos[1]);scene.add(stage);box(stage,3.6,.4,1.8,0,.2,0,'#8a5a35');box(stage,3.6,2.4,.1,0,1.6,-.85,'#8a2b3a');box(stage,.8,1.1,.6,-1.9,.55,.2,'#20262a');box(stage,.8,1.1,.6,1.9,.55,.2,'#20262a');
 const sbanner=textPlane('SOIRÉE ANIMÉE',2.6,.4,{bg:'#f6c945',fg:'#8a2b3a'});sbanner.position.set(0,2.0,-.79);stage.add(sbanner);const spots=[0,1,2].map(i=>{const l=new THREE.Mesh(geo.sphere,new THREE.MeshStandardMaterial({color:['#ff4a6a','#4aa8ff','#ffe04a'][i],emissive:['#ff4a6a','#4aa8ff','#ffe04a'][i],emissiveIntensity:.1}));l.scale.setScalar(.14);l.position.set(-1.2+i*1.2,3.0,-.2);stage.add(l);return l;});
 box(scene,1.3,.04,1.3,STAGE.pad[0],.06,STAGE.pad[1],'#f6c945',false);padIcon(scene,'🎤',STAGE.pad[0],STAGE.pad[1],.09,.85);const stageTag=sprite(3.4,.5);stageTag.position.set(STAGE.pos[0],3.5,STAGE.pos[1]);scene.add(stageTag);
 // Pitches: a patch of ground and a number; tents and caravans come and go with the campers; mobile homes stay.
 const CAMP=['#e86a7a','#6a8ee8','#e8b86a','#8ad06a','#b06ae8','#6ad0c8'];
 function tentModel(c){const g=new THREE.Group(),body=new THREE.Mesh(geo.pyr,mat(c));body.scale.set(1.15,1.15,1.15);body.position.y=.58;body.rotation.y=Math.PI/4;body.castShadow=true;g.add(body);box(g,.5,.6,.02,0,.32,.62,'#2b3a44',false);return g;}
 function caravanModel(c){const g=new THREE.Group();box(g,2.5,1.1,1.25,0,.8,-.3,'#f4f1ea');box(g,2.52,.2,1.27,0,.62,-.3,c);box(g,2.6,.1,1.35,0,1.4,-.3,'#d8dfe3');box(g,.5,.45,.02,.5,1,.34,'#7fb7d9',false);box(g,.4,.7,.02,-.6,.85,.34,'#9a6a40',false);for(const x of [-.7,.7]){const w=cyl(g,.26,.12,x,.26,-.9,'#20262a');w.rotation.z=Math.PI/2;}box(g,.12,.12,.6,1.5,.4,-.3,'#8a959b');box(g,1.6,.06,.7,0,1.5,.3,c,false).rotation.x=.25;return g;}
 function mobilModel(){const g=new THREE.Group();box(g,3,1.5,1.8,0,.8,-.3,'#d9a35a');box(g,3.3,.2,2.1,0,1.65,-.3,'#8a4a2a');box(g,.7,1.1,.04,-.8,.65,.62,'#6b4428',false);for(const x of [.3,1.05])box(g,.5,.5,.04,x,1,.62,'#7fb7d9',false);box(g,3.1,.08,.8,0,.1,.9,'#eadcb8',false);box(g,.7,.45,.7,1.1,.3,1.1,'#e8483a');return g;}
 const pitches=PITCHES.map((P,i)=>{const g=new THREE.Group();g.position.set(P.x,0,P.z);scene.add(g);const patch=box(g,3.4,.04,3.2,0,.03,0,P.kind==='tent'?'#8fc75a':'#d9c79a',false);const num=textPlane(String(i+1),.5,.34,{bg:'#f4f1ea',fg:'#26343f',font:'900 56px system-ui'});num.position.set(-1.5,.9,.95);g.add(num);cyl(g,.04,.9,-1.5,.45,.9,'#8a5a35');
  let unit=null;if(P.kind==='mobil'){unit=mobilModel();g.add(unit);}else unit=new THREE.Group();g.add(unit);
  const trash=new THREE.Group();trash.position.set(.5,0,1.4);g.add(trash);const tag=sprite(1.5,.42);tag.position.set(0,2.4,.3);g.add(tag);
  const lamp=box(g,.12,.12,.12,1.2,.9,.85,'#f6c945',false);return {g,P,patch,unit,trash,tag,num,lamp,look:-1,made:null};});
 // Event markers: where somebody must stand for a moment to sort it out.
 const markers=[0,1,2].map(()=>{const g=new THREE.Group();scene.add(g);box(g,1.3,.04,1.3,0,.06,0,'#e8483a',false);const t=sprite(1.8,.5);t.position.y=1.5;g.add(t);g.visible=false;return {g,t};});

 // Unlock tiles: dashed square, name and price, filling as the player pays.
 const tiles=new Map();let shownTiles=null;function tile(u){const g=new THREE.Group();g.position.set(u.pos[0],.13,u.pos[1]);const c=document.createElement('canvas');c.width=c.height=256;const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map,transparent:true}));plane.rotation.x=-Math.PI/2;g.add(plane);scene.add(g);let last='';
  g.userData.draw=paid=>{if(paid===last)return;last=paid;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle=u.level?'#fff3c455':'#ffffff55';ctx.fillRect(14,14,228,228);ctx.fillStyle='#5fd06acc';const f=paid/u.price;ctx.fillRect(14,242-228*f,228,228*f);ctx.setLineDash([26,18]);ctx.lineWidth=10;ctx.strokeStyle=u.level?'#ffe08a':'#fff';ctx.strokeRect(14,14,228,228);
   ctx.fillStyle='#2b3a44';ctx.textAlign='center';ctx.font='800 30px system-ui';ctx.fillText(u.name,128,u.tip?72:92,220);ctx.font='900 54px system-ui';ctx.fillText(`${(u.price-paid).toLocaleString('fr-FR')} $`,128,u.tip?140:168,220);if(u.tip){ctx.font='700 22px system-ui';ctx.fillText(u.tip,128,196,220);}map.needsUpdate=true;};return g;}

 const campers=new Map(),helpers=new Map(),popups=new Map(),posts={};
 const POP={money:{bg:'#2f9e4fee',fg:'#fff'},card:{bg:'#2b6fd6ee',fg:'#fff'},info:{bg:'#26343fee',fg:'#fff'},bad:{bg:'#e8483aee',fg:'#fff'}};
 const player=person('#3aa0d8',{hat:'#1f6f9a'});let time=0,showMissions=false;
 const GUEST_LOOK=[['#f08a3c','#b85a14'],['#8e5fd0','#5d3aa0'],['#3cb878','#1f7a4a'],['#e2587a','#a8324e']],guests=new Map();let focus=null;
 const nameTag=g=>{const tag=sprite(1.9,.45);tag.position.set(0,2,0);g.add(tag);return tag;},hostTag=nameTag(player);hostTag.visible=false;
 const post=(key,color,hat,at,heading=0)=>{const g=person(color,{hat});g.position.set(at[0],0,at[1]);g.rotation.y=heading;g.visible=false;posts[key]=g;};
 post('reception','#e46ab0','#ffffff',[RECEPTION.serve[0],RECEPTION.serve[1]-.4],Math.PI);post('shop','#f0a830','#ffffff',[SHOP.serve[0],SHOP.serve[1]-.4],Math.PI);post('stage','#b06ae8','#f6c945',[STAGE.pos[0]+1.1,STAGE.pos[1]+.2],Math.PI);
 const DAYC={clear:new THREE.Color('#9fd46a'),ground:new THREE.Color('#a9db6e'),sun:new THREE.Color('#fff4e0')},NIGHTC={clear:new THREE.Color('#22324a'),ground:new THREE.Color('#3f5d55'),sun:new THREE.Color('#9fb4ff')},DUSK=new THREE.Color('#ffb070'),tmpC=new THREE.Color();
 let night=0;
 // Light of the day: bright from 8:00 to 19:00, warm at dusk, dark blue after lights out (the paths stay readable).
 function daylight(s){const h=hourOf(s),n=s.clock>=OPEN?1:h>=20.5?(h-20.5)/2.5*.8:h<8?(8-h)*.25:0,dusk=h>=18&&s.clock<OPEN?Math.min(1,(h-18)/2)*(1-n):0;night=n;
  sun.intensity=2.6*(1-.65*n);hemi.intensity=2.1*(1-.5*n);sun.color.copy(DAYC.sun).lerp(DUSK,dusk*.6).lerp(NIGHTC.sun,n);
  renderer.setClearColor(tmpC.copy(DAYC.clear).lerp(NIGHTC.clear,n));ground.material.color.copy(DAYC.ground).lerp(NIGHTC.ground,n);for(const l of lamps)l.material.emissiveIntensity=Math.min(1,n*1.6);}
 const MOODFACE=m=>m<30?'😡':m<50?'😕':m>=85?'😄':'';
 const cashList=v=>{const n=Math.min(18,Math.floor(v/20));return [...repeat('bundle',n),...(v-n*20>=1&&n<18?['bundle']:[])];};

 function sync(dt){const s=getState();time+=dt;daylight(s);
  animate(player,s.player,time);stackOf(player.userData.back,s.player.carry,carryLayout(s.player.carry.length));
  // Staff at their post.
  for(const k of ['reception','shop','stage']){const on=!!s.posts[k]&&(k!=='stage'||!!s.unlocked.stage);posts[k].visible=on;if(on&&k==='stage'){posts[k].position.y=.4;}}
  for(const h of s.helpers){let g=helpers.get(h.id);if(!g){g=person(JOB[h.loop]??JOB.fix,{hat:'#ffffff'});const tag=sprite(1.7,.45);tag.position.set(0,2,0);g.add(tag);g.userData.tag=tag;helpers.set(h.id,g);}
   animate(g,h,time);g.userData.body.material=mat(JOB[h.loop]??JOB.fix);g.userData.tag.visible=showMissions||h.loop==='rest';pill(g.userData.tag,MISSIONS.find(m=>m.id===h.loop)?.icon??'',h.loop==='rest'?{bg:'#c9d3d8ee'}:{});stackOf(g.userData.back,h.carry,carryLayout(h.carry.length));}
  for(const [id,g] of helpers)if(!s.helpers.some(h=>h.id===id)){drop(g);helpers.delete(id);}
  // Pitches.
  const byPitch=new Map();for(const c of s.campers)if(c.in)byPitch.set(c.pitch,c);
  pitches.forEach((v,i)=>{const open=pitchOpen(s,i),P=s.pitches[i];v.g.visible=open;if(!open)return;const c=byPitch.get(i),kind=v.P.kind;
   if(kind!=='mobil'){const want=c?kind+c.look:null;if(want!==v.made){v.g.remove(v.unit);v.unit=!c?new THREE.Group():kind==='tent'?tentModel(CAMP[c.look%CAMP.length]):caravanModel(CAMP[c.look%CAMP.length]);v.g.add(v.unit);v.made=want;}
    v.unit.scale.y=P.down?.28:1;v.unit.rotation.z=P.down?.5:0;}
   v.lamp.visible=!!c;v.lamp.material=mat(c&&night>.3?'#ffd36b':'#f6c945');
   stackOf(v.trash,repeat('trash',P.trash),{cols:3,step:.42});
   const text=P.noisy?'🎶 FIESTA':P.down?'🌬️ à replanter':c?`${TYPESICON(c)} ${Math.max(0,c.left)} nuit${c.left>1?'s':''}`:P.trash?'🗑️ à vider':'';v.tag.visible=!!text;if(text)pill(v.tag,text,P.noisy?{bg:'#b06ae8ee',fg:'#fff'}:P.down?{bg:'#e8483aee',fg:'#fff'}:{});});
  // Reception, office, shop.
  recTerm.visible=!!s.unlocked.terminal;shopTerm.visible=!!s.unlocked.terminal&&!!s.unlocked.shop;stackOf(recPile,cashList(s.piles[0]),{cols:2,rows:3,step:.5,dstep:.3});stackOf(shopPile,cashList(s.piles[1]),{cols:2,rows:3,step:.5,dstep:.3});shopPile.visible=!!s.unlocked.shop;
  const waiting=s.campers.filter(c=>c.phase==='queue').length;pill(recTag,s.posts.reception?'🛎️ Accueil':waiting?`🛎️ ${waiting} à l’accueil`:'🛎️ Accueil',waiting&&!s.posts.reception?{bg:'#f6b94aee'}:{});
  const nb=s.bills.length,late=s.bills.some(b=>b.late);while(papers.children.length>nb)papers.remove(papers.children[papers.children.length-1]);while(papers.children.length<Math.min(nb,12)){const m=box(papers,.42,.012,.3,0,papers.children.length*.014,0,'#ffffff',false);m.rotation.y=(papers.children.length%3-1)*.15;}
  papers.children.forEach(m=>m.material=mat(late?'#ffd6d1':'#ffffff'));pill(deskTag,nb?`🧾 ${nb} facture${nb>1?'s':''} · ${billsDue(s)} $`:'🧾 Bureau · à jour',late?{bg:'#e8483aee',fg:'#fff'}:nb?{bg:'#f6b94aee'}:{});
  shop.visible=!!s.unlocked.shop;
  for(const [k,v] of Object.entries(shelves)){const open=shelfOpen(s,k);v.g.visible=open;v.pad.visible=v.ic.visible=open;if(!open)continue;stackOf(v.st,repeat(k,s.shop[k]),{cols:4,rows:2,step:.3,dstep:.3,max:16});pill(v.tag,`${ICON[k]} ${s.shop[k]}/${shelfCap(s,k)}`);}
  for(const [k,v] of Object.entries(sources)){const open=sourceOpen(s,k);v.g.visible=open;if(!open)continue;const n=s.sources[k].n;stackOf(v.st,repeat(SOURCES[k].item,n),{cols:4,rows:3,step:.34,dstep:.3,max:24});
   pill(v.tag,k==='bread'?`🥖 ${n}`:`${ICON[SOURCES[k].item]} ${n}/${sourceCap(s,k)}`,n===0?{bg:'#f6b94aee'}:{});}
  // Toilet block.
  const nc=cabins(s),inside=s.campers.filter(c=>c.act?.kind==='wc'&&c.act.step===1).length;doors.forEach((d,i)=>{d.d.visible=d.lamp.visible=i<nc;d.d.position.x=d.lamp.position.x=(i-(nc-1)/2)*.54;d.lamp.material=mat(i<inside?'#e8483a':'#4fbf5a');});
  const cap=sanitCap(s),pp=s.sanit.paper;pill(paperTag,`🧻 ${Math.floor(pp)}/${cap}`,pp<2?{bg:'#e8483aee',fg:'#fff'}:pp<4?{bg:'#f6b94aee'}:{});
  dirtPlane.material.opacity=Math.min(.7,s.sanit.dirt*.8);pill(mopTag,s.sanit.dirt>.7?'🤢 sale !':s.sanit.dirt>.35?'🧽 à nettoyer':'✨ propre',s.sanit.dirt>.7?{bg:'#e8483aee',fg:'#fff'}:s.sanit.dirt>.35?{bg:'#f6b94aee'}:{});
  stackOf(dumpPile,repeat('trash',Math.min(s.dump,9)),{cols:3,rows:2,step:.5,dstep:.4});pill(dumpTag,`🗑️ ${s.dump}/${dumpCap(s)}`,s.dump>=dumpCap(s)?{bg:'#e8483aee',fg:'#fff'}:{});
  elec.visible=!!s.unlocked.caravan;pill(elecTag,s.event?.kind==='disj'?'⚡ SAUTÉ':'⚡',s.event?.kind==='disj'?{bg:'#e8483aee',fg:'#fff'}:{});
  // Pool and stage.
  pool.visible=!!s.unlocked.pool;if(pool.visible){const ch=s.pool.chlor,col=ch<.25?'#7fa84a':ch<.5?'#5fc0c0':'#43b5e8';pool.userData.water.material.color.set(col);pill(poolTag,`🧪 ${Math.round(ch*100)} %`,ch<.25?{bg:'#e8483aee',fg:'#fff'}:ch<.5?{bg:'#f6b94aee'}:{});
   const du=s.event?.kind==='ducks';ducks.forEach((d,i)=>{d.visible=du;if(du){d.position.set((POOL.x0+POOL.x1)/2+Math.sin(time*.7+i*1.7)*2.2,.3,(POOL.z0+POOL.z1)/2+Math.cos(time*.55+i*2.3)*1.2);d.rotation.y=time*.7+i;}});}
  stage.visible=!!s.unlocked.stage;stageTag.visible=stage.visible;if(stage.visible){const S=s.show,on=S.state==='on';spots.forEach((l,i)=>l.material.emissiveIntensity=on?.6+.5*Math.sin(time*6+i*2):.1);
   stageTag.visible=S.state!=='idle';if(S.state==='call')pill(stageTag,`🎤 ${SHOWS[S.kind]} : montez sur scène !`,{bg:'#f6c945ee'});else if(on)pill(stageTag,`🎉 ${SHOWS[S.kind]} · ${Math.ceil(S.t)} s`,{bg:'#b06ae8ee',fg:'#fff'});}
  // Event markers.
  const ev=s.event;markers.forEach((m,i)=>{const sp=ev?.spots[i];m.g.visible=!!sp&&sp.fix<REPAIR;if(!m.g.visible)return;m.g.position.set(sp.x,0,sp.z);pill(m.t,`${ev.label.split(' ')[0]} ${Math.round(sp.fix/REPAIR*100)} %`,{bg:'#e8483aee',fg:'#fff'});m.g.children[0].material=mat(Math.sin(time*8)>0?'#e8483a':'#f6c945');});
  // Tiles.
  const shown=visibleUnlocks(s);for(const u of shown){let g=tiles.get(u.key);if(!g){g=tile(u);tiles.set(u.key,g);}g.userData.draw(s.paid[u.key]??0);}if(shown!==shownTiles){shownTiles=shown;const keys=new Set(shown.map(u=>u.key));for(const [k,g] of tiles)if(!keys.has(k)){drop(g);tiles.delete(k);}}
  // Campers.
  const seen=new Set();for(const c of s.campers){seen.add(c.id);let g=campers.get(c.id);if(!g){g=person(CAMP[c.look%CAMP.length]);const b=sprite(1.9,.5);b.position.set(0,2.05,0);g.add(b);g.userData.bubble=b;campers.set(c.id,g);}
   animate(g,c,time);if(c.swim)g.position.y=-.5;const A=c.act,q=c.phase==='queue';let text='',style={};
   if(q){const f=c.wait/PATIENCE;text=c.blocked?'🗑️ emplacement sale…':`${c.card&&s.unlocked.terminal?'💳':'💵'} ${c.nights} nuit${c.nights>1?'s':''}`;style=f<.4?{}:f<.7?{bg:'#f6b94aee'}:{bg:'#e8483aee',fg:'#fff'};}
   else if(A?.kind==='wc')text=A.step===1?'🚿':'🚽';else if(A?.kind==='shop')text=`${A.k==='bread'?'🥖':'🍦'} ${Math.max(0,A.n-A.got)}`;else if(A?.kind==='pool')text='🏊';else if(A?.kind==='show')text='🎉';else if(c.in&&!A)text=MOODFACE(c.mood);
   g.userData.bubble.visible=!!text;if(text)pill(g.userData.bubble,text,style);g.visible=!(c.in&&!A&&!c.moving&&false);}
  for(const [id,g] of campers)if(!seen.has(id)){drop(g);campers.delete(id);}
  for(const p of s.popups){let g=popups.get(p.id);if(!g){g=sprite(1.8,.55);scene.add(g);pill(g,p.text,{...(POP[p.kind]??POP.money),size:.55});popups.set(p.id,g);}g.position.set(p.x,2+p.t*1.6,p.z);g.material.opacity=1-p.t/1.6;}
  for(const [id,g] of popups)if(!s.popups.some(p=>p.id===id)){drop(g);popups.delete(id);}
  let me=s.player;hostTag.visible=s.guests.length>0;if(hostTag.visible)pill(hostTag,focus==null?'Vous':s.player.name||'Hôte',focus==null?{bg:'#ffe08aee'}:{});
  for(const a of s.guests){let g=guests.get(a.id);if(!g){const [c,h]=GUEST_LOOK[a.look%GUEST_LOOK.length];g=person(c,{hat:h});g.userData.tag=nameTag(g);guests.set(a.id,g);}
   if(a.id===focus)me=a;animate(g,a,time);pill(g.userData.tag,a.id===focus?'Vous':a.name,a.id===focus?{bg:'#ffe08aee'}:{});stackOf(g.userData.back,a.carry,carryLayout(a.carry.length));}
  if(guests.size>s.guests.length)for(const [id,g] of guests)if(!s.guests.some(a=>a.id===id)){drop(g);guests.delete(id);}
  // Camera follows this screen's player from the front-top, like a tabletop diorama.
  const px=me.x,pz=me.z,cx=camera.userData.x??px,cz=camera.userData.z??pz,nx=cx+(px-cx)*Math.min(1,dt*4),nz=cz+(pz-cz)*Math.min(1,dt*4);camera.userData.x=nx;camera.userData.z=nz;camera.position.set(nx+6,20,nz+15);camera.lookAt(nx,0,nz-1);sun.position.set(nx-10,30,nz+12);sun.target.position.set(nx,0,nz);}
 const TYPESICON=c=>({hiker:'🎒',family:'👨‍👩‍👧',youth:'🎸',retired:'🧓',couple:'💑'})[c.type]??'⛺';
 function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),half=aspect<1?(r.width<500?8.6:10):(r.height<500?6.6:8.5);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 return {three:scene,camera,setShowMissions(v){showMissions=!!v;},setFocus(id){focus=id??null;},update(dt){sync(dt);renderer.render(scene,camera);},reset(){for(const m of [campers,helpers,popups,tiles,guests])for(const [id,g] of m){drop(g);m.delete(id);}shownTiles=null;for(const v of pitches){v.made=null;}}};}
