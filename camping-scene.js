import * as THREE from 'three';
import {bakeGroup} from './static-bake.js';
import {PITCHES,KINDS,doorOf,RECEPTION,SHOP,SHELVES,SOURCES,SANIT,DUMP,POOL,STAGE,ELEC,DESK,GATE,ROAD_Z,ROAD_END,visibleUnlocks,pitchOpen,sourceOpen,shelfOpen,shelfCap,sourceCap,sanitCap,cabins,dumpCap,hourOf,OPEN,PATIENCE,MISSIONS,billsDue,REPAIR,EVENTS,SHOWS,shelfZone,zoneOf,RACK_KINDS,OVEN,ovenCap,ITEMS,BUY_DELAY,INSPECT_LEN,LOISIRS,SHUTTLE_SLOTS,BIKES,PADDLES,BASINS,BASIN_ORDER,TECH,SPA,BAR,LIFE_CHAIR,LOUNGERS,loungeCount,guardedBasins,waterIssue,WATER_TEXT,INCIDENTS,barCap,TIERS,BOREHOLE,tankCap,powerLoad,powerCap,CLUB,RESTO,MACH} from './camping-engine.js';

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
 const ICON={potato:'🥔',raw:'🥩',fries:'🍟',steak:'🍖',ph:'⚗️',towel:'🧖',paper:'🧻',dough:'🍞',bread:'🥖',ice:'🍦',drink:'🥤',cream:'🧴',gas:'🔥',souv:'🧲',chlor:'🧪',trash:'🗑️'};

 // Carried goods and stacks: a few small meshes sharing geometries and materials, rebuilt only when the list changes.
 const H={potato:.22,raw:.1,fries:.3,steak:.1,ph:.3,towel:.14,paper:.17,dough:.16,bread:.17,ice:.34,drink:.3,cream:.26,gas:.4,souv:.14,chlor:.32,trash:.4,bundle:.07};
 function itemMesh(k){const g=new THREE.Group();
  if(k==='paper'){cyl(g,.14,.16,0,.08,0,'#f6f6f2');cyl(g,.145,.03,0,.08,0,'#d8b27a');}
  else if(k==='potato'){ball(g,.14,0,.12,0,'#c4935a',.8);}
  else if(k==='raw'){cyl(g,.16,.06,0,.04,0,'#e8737c');}
  else if(k==='fries'){box(g,.24,.14,.18,0,.08,0,'#d8342a');for(let i=0;i<5;i++)box(g,.03,.2,.03,-.08+i*.04,.2,0,'#f4c542',false);}
  else if(k==='steak'){cyl(g,.16,.06,0,.04,0,'#6b3a24');}
  else if(k==='ph'){cyl(g,.1,.28,0,.14,0,'#7fbf5a');cyl(g,.06,.08,0,.32,0,'#ffffff');}
  else if(k==='towel'){box(g,.3,.1,.2,0,.06,0,'#ffffff');box(g,.3,.03,.2,0,.12,0,'#7fb7d9');}
  else if(k==='dough'){ball(g,.15,0,.1,0,'#f1e2c4',.75);ball(g,.07,.1,.16,.05,'#f6ecd6');}
  else if(k==='drink'){cyl(g,.09,.26,0,.13,0,'#3a8ee0');cyl(g,.095,.04,0,.27,0,'#f4f2ea');}
  else if(k==='cream'){cyl(g,.09,.2,0,.1,0,'#ff9f43');cyl(g,.05,.07,0,.23,0,'#ffffff');}
  else if(k==='gas'){cyl(g,.12,.34,0,.17,0,'#d8432f');cyl(g,.05,.06,0,.37,0,'#8a959b');}
  else if(k==='souv'){box(g,.26,.12,.18,0,.07,0,'#b06ae8');box(g,.2,.02,.14,0,.14,0,'#ffe08a');}
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
 // Everything fixed (paths, road, gate, lamp posts, trees, palms, flamingos) goes in `decor`, merged into a few meshes once built.
 const decor=new THREE.Group();scene.add(decor);
 box(decor,2,.05,43,0,.03,-12.5,'#eadcb8',false);
 for(const [x0,x1,z] of [[-14,0,2.15],[-14,0,-1.85],[-14,0,-5.85],[-14,0,-9.85],[-14,0,-15.85],[0,33.5,-5.85],[0,33.5,-9.85],[14.4,33.5,-15],[-14,0,-21.85],[-14,8,-27.85]])box(decor,x1-x0,.04,1.3,(x0+x1)/2,.03,z,'#eadcb8',false);
 box(decor,72,.05,2.6,8,.03,ROAD_Z,'#59646b',false);for(let x=-18;x<36;x+=2.4)box(decor,1.2,.01,.12,x,.06,ROAD_Z,'#f4f1ea',false);
 box(decor,12,.04,3.2,0,.02,7.2,'#eadcb8',false);
 let gateSign=()=>{},gateStars=1;
 {const g=new THREE.Group();g.position.set(GATE[0],0,GATE[1]);decor.add(g);for(const x of [-2.1,2.1])box(g,.22,2.6,.22,x,1.3,0,'#8a5a35');box(g,4.5,.6,.16,0,2.7,0,'#1aa6a6');
  const gc=document.createElement('canvas');gc.width=512;gc.height=60;const gt=new THREE.CanvasTexture(gc);gt.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.3,.5),new THREE.MeshStandardMaterial({map:gt,roughness:.6}));sign.position.set(0,2.7,.09);g.add(sign);
  // The sign shows the stars the camp has been given.
  gateSign=n=>{const x=gc.getContext('2d');x.fillStyle='#1aa6a6';x.fillRect(0,0,512,60);x.fillStyle='#fff';x.font='900 40px system-ui';x.textAlign='center';x.textBaseline='middle';x.fillText('CAMPING DU PARADIS '+'★'.repeat(n),256,32,490);gt.needsUpdate=true;};gateSign(1);}
 // Lamp posts along the alley: they light up when the night comes.
 const lamps=[];for(const [x,z] of [[-1.5,6],[1.5,-4],[-1.5,-14],[7,-8]]){const g=new THREE.Group();g.position.set(x,0,z);decor.add(g);cyl(g,.05,2.3,0,1.15,0,'#3d454b');const l=new THREE.Mesh(geo.sphere,new THREE.MeshStandardMaterial({color:'#fff3c4',emissive:'#ffd36b',emissiveIntensity:0}));l.userData.keep=true;l.scale.setScalar(.2);l.position.y=2.35;g.add(l);lamps.push(l);}
 // Trees give the place its shade.
 // Palm trees, flamingos and hibiscus: it is paradise, after all.
 function palm(x,z,h=3.4,lean=.3,ry=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;decor.add(g);for(let i=0;i<4;i++)cyl(g,.17-.025*i,h/4+.05,lean*(i/3)**2*1.2,h/8+i*h/4,0,i%2?'#a97a46':'#9a6a3a');
  const top=new THREE.Group();top.position.set(lean*1.2,h,0);g.add(top);for(let k=0;k<7;k++){const l=new THREE.Group();l.rotation.y=k*Math.PI*2/7;top.add(l);const b=box(l,1.5,.05,.42,.75,-.1,0,k%2?'#2f9e4f':'#3dbb5f');b.rotation.z=-.45;}for(const [dx,dz] of [[.15,.1],[-.12,.15],[.05,-.17]])ball(top,.1,dx,-.18,dz,'#6b4428');}
 for(const [x,z,h,l,r] of [[11,8.2,3.6,-.3,1],[-15,-2,3.5,.3,0],[-15,-10,3.8,-.3,2],[-15.2,-16,3.2,-.3,0],[6.6,-20.8,3.6,.3,2],[-8.5,-20.8,3.4,-.25,1]])palm(x,z,h,l,r);
 function flamingo(x,z,ry){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;decor.add(g);for(const dx of [-.05,.05])cyl(g,.015,.7,dx,.35,0,'#f47aa8');ball(g,.2,0,.8,0,'#f58db3',.85);const neck=cyl(g,.035,.5,.12,1.1,0,'#f58db3');neck.rotation.z=-.5;ball(g,.07,.26,1.32,0,'#f58db3');box(g,.14,.03,.05,.36,1.3,0,'#2b2b2b',false);}
 for(const [x,z,r] of [[7.1,-17.3,1.2],[7.5,-16.2,2.2]])flamingo(x,z,r);

 for(const [x,z,r] of [[-15,-2,1.4],[-15,-10,1.6],[-15.2,-16,1.3],[16.4,-1,1.5],[16.6,-8,1.7],[16.2,-13,1.4],[-6,-21,1.5],[6,-21,1.6],[-12,-21,1.4]].filter(([x,z])=>![[-15,-2],[-15,-10],[-15.2,-16],[16.4,-1],[16.6,-8],[16.2,-13],[6,-21]].some(([a,b])=>a===x&&b===z))){const t=new THREE.Group();t.position.set(x,0,z);decor.add(t);cyl(t,.18,1.2,0,.6,0,'#7a4a2a');ball(t,r,0,1.7,0,'#3d8a36',.9);ball(t,r*.7,.5,2.3,.1,'#4b9a3e',.9);}
 bakeGroup(decor);

 // Reception: an open kiosk under a striped awning, a card terminal once bought, and the pad where the cash piles up.
 const recep=new THREE.Group();scene.add(recep);{const g=recep,[x,z]=RECEPTION.pos;box(g,2.6,1,.7,x,.5,z,'#c98a4a');box(g,2.7,.08,.8,x,1.04,z,'#eadcb8');
  for(const dx of [-1.2,1.2])box(g,.1,2.4,.1,x+dx,1.2,z-1.1,'#8a5a35');for(const dx of [-1.2,1.2])box(g,.1,2.4,.1,x+dx,1.2,z+.35,'#8a5a35');
  for(let i=0;i<8;i++)box(g,.34,.08,1.6,x-1.2+i*.34+.17,2.45,z-.38,i%2?'#ffffff':'#1ec8c8',false).rotation.x=-.12;
  const sign=textPlane('BIENVENUE AU PARADIS · tente 24 $',2.5,.4,{bg:'#1aa6a6',font:'900 38px system-ui'});sign.position.set(x,1.9,z+.36);g.add(sign);
  box(g,1.2,.04,1.2,RECEPTION.serve[0],.06,RECEPTION.serve[1],'#7fb7d9',false);padIcon(g,'🛎️',RECEPTION.serve[0],RECEPTION.serve[1],.09);
  box(g,1.3,.04,1.3,RECEPTION.cash[0],.06,RECEPTION.cash[1],'#5cc46a',false);padIcon(g,'💵',RECEPTION.cash[0],RECEPTION.cash[1],.09,.8);}
 const recTerm=new THREE.Group();recTerm.position.set(RECEPTION.pos[0]+.8,1.08,RECEPTION.pos[1]);scene.add(recTerm);box(recTerm,.18,.06,.3,0,.03,0,'#20262a');box(recTerm,.16,.22,.05,0,.15,-.08,'#2b3a44').rotation.x=-.4;
 const recPile=new THREE.Group();recPile.position.set(RECEPTION.cash[0],.1,RECEPTION.cash[1]);scene.add(recPile);const recTag=sprite(2.2,.5);recTag.position.set(RECEPTION.pos[0],2.9,RECEPTION.pos[1]);scene.add(recTag);
 // Office: where the bills are paid (stand on the yellow pad); one sheet per bill, red when one is late.
 const office=new THREE.Group();scene.add(office);box(office,3.4,2,1.4,4.5,1,2.9,'#e9dcc0');box(office,3.7,.2,1.7,4.5,2.1,2.9,'#b8433a');const osign=textPlane('BUREAU',1.5,.38,{bg:'#8a5a35'});osign.position.set(4.5,1.5,3.62);office.add(osign);
 for(const x of [3.4,5.6])box(office,.5,.5,.04,x,1.3,3.61,'#7fb7d9',false);
 box(office,1.4,.04,1.2,DESK[0],.06,DESK[1],'#f6c945',false);padIcon(office,'🧾',DESK[0],DESK[1],.09,.8);const papers=new THREE.Group();papers.position.set(DESK[0],.1,DESK[1]);office.add(papers);const deskTag=sprite(2.2,.5);deskTag.position.set(DESK[0],1.7,DESK[1]);office.add(deskTag);

 // Shop: a wooden hut with a counter; bread and ice creams are displayed on it, and put there by whoever restocks the pads.
 const shop=new THREE.Group();scene.add(shop);{const g=shop;box(g,4.8,2,.95,-5.7,1,3.0,'#c98a4a');box(g,5.2,.2,1.4,-5.7,2.1,3.0,'#2f7d4f');const t=textPlane('ÉPICERIE DU PARADIS',3.3,.4,{bg:'#f4f1ea',fg:'#8a3a2a',font:'900 40px system-ui'});t.position.set(-5.7,1.55,3.5);g.add(t);
  box(g,4.8,1,.7,-5.75,.5,5.6,'#d9a35a');box(g,4.9,.08,.8,-5.75,1.04,5.6,'#eadcb8');for(const dx of [-2.3,2.3])box(g,.1,2.4,.1,-5.75+dx,1.2,6.0,'#8a5a35');
  for(let i=0;i<10;i++)box(g,.5,.08,1.6,-8+i*.5+.25,2.45,5.3,i%2?'#ffffff':'#ff8fa3',false).rotation.x=-.12;
  box(g,.6,.4,.4,SHOP.till[0],1.28,SHOP.till[1],'#3d454b');
  box(g,1.2,.04,1.2,SHOP.serve[0],.06,SHOP.serve[1],'#7fb7d9',false);padIcon(g,'🛒',SHOP.serve[0],SHOP.serve[1],.09);
  box(g,1.3,.04,1.3,SHOP.cash[0],.06,SHOP.cash[1],'#5cc46a',false);padIcon(g,'💵',SHOP.cash[0],SHOP.cash[1],.09,.8);}
 // Bakery: a brick oven (dough goes in on the right pad, bread comes out on the left) and a stand with a striped awning for the bread.
 const bakery=new THREE.Group();scene.add(bakery);{const g=bakery,[ox,oz]=OVEN.pos;box(g,1.8,1.5,1.2,ox,.75,oz,'#b5523b');box(g,1.9,.12,1.3,ox,1.56,oz,'#8a3a2a');const arch=box(g,.9,.7,.04,ox,.5,oz+.61,'#1f1a18',false);cyl(g,.16,1,ox+.55,2.1,oz-.3,'#7a3a2a');
  const ol=new THREE.Mesh(geo.box,new THREE.MeshStandardMaterial({color:'#ff7a1a',emissive:'#ff5a00',emissiveIntensity:0}));ol.scale.set(.7,.3,.04);ol.position.set(ox,.45,oz+.63);g.add(ol);bakery.userData.glow=ol;
  const sg=textPlane('FOUR À PAIN',1.4,.3,{bg:'#f4f1ea',fg:'#8a3a2a'});sg.position.set(ox,1.2,oz+.62);g.add(sg);
  for(const [pad,ic,key] of [[OVEN.inPad,'🍞','in'],[OVEN.outPad,'🥖','out']]){box(g,1.1,.04,1.1,pad[0],.06,pad[1],key==='in'?'#f08a3a':'#5cc46a',false);padIcon(g,ic,pad[0],pad[1],.09);const st=new THREE.Group();st.position.set(pad[0],.1,pad[1]);g.add(st);bakery.userData[key]=st;}
  const tg=sprite(1.9,.42);tg.position.set(ox,2.9,oz);g.add(tg);bakery.userData.tag=tg;
  box(g,5,1,.7,-10.6,.5,5.6,'#d9a35a');box(g,5.1,.08,.8,-10.6,1.04,5.6,'#eadcb8');for(const dx of [-2.4,2.4])box(g,.1,2.4,.1,-10.6+dx,1.2,6.0,'#8a5a35');
  for(let i=0;i<10;i++)box(g,.5,.08,1.6,-13+i*.5+.25,2.45,5.3,i%2?'#ffffff':'#f0c040',false).rotation.x=-.12;
  const bs=textPlane('BOULANGERIE · PAIN CHAUD',3.4,.4,{bg:'#8a3a2a',fg:'#ffe9b8',font:'900 40px system-ui'});bs.position.set(-10.6,2.0,5.98);g.add(bs);
  for(const dx of [-1.3,0,1.3]){const c=box(g,.8,.22,.5,-11.2+dx*.4,1.2,5.6,'#b98a52');c.visible=dx===0;}}
 const shopTerm=new THREE.Group();shopTerm.position.set(SHOP.till[0]+.7,1.08,SHOP.till[1]);scene.add(shopTerm);box(shopTerm,.18,.06,.3,0,.03,0,'#20262a');box(shopTerm,.16,.22,.05,0,.15,-.08,'#2b3a44').rotation.x=-.4;
 const shopPile=new THREE.Group();shopPile.position.set(SHOP.cash[0],.1,SHOP.cash[1]);scene.add(shopPile);
 const shelves=Object.fromEntries(['bread','ice'].map(k=>{const def=SHELVES[k],g=new THREE.Group();g.position.set(def.pos[0],1.1,def.pos[1]);scene.add(g);const st=new THREE.Group();g.add(st);
  const z=shelfZone(def.pos),pad=box(scene,1.1,.04,1.1,z[0],.06,z[1],'#f08a3a',false),ic=padIcon(scene,ICON[k],z[0],z[1],.09);const tag=sprite(1.3,.4);tag.position.set(0,1.1,0);g.add(tag);return [k,{g,st,pad,ic,tag}];}));
 // The general rack: drinks, sun cream, gas bottles and souvenirs share one display on the counter and one restocking pad.
 const rack=new THREE.Group();rack.position.set(SHELVES.drink.pos[0],1.1,SHELVES.drink.pos[1]);scene.add(rack);const rackSt=new THREE.Group();rack.add(rackSt);box(rack,1.5,.05,.6,0,-.03,0,'#c9a46a',false);
 {const z=SHELVES.drink.zone;box(scene,1.1,.04,1.1,z[0],.06,z[1],'#f08a3a',false);padIcon(scene,'🧺',z[0],z[1],.09);}const rackTag=sprite(1.9,.4);rackTag.position.set(0,1.1,0);rack.add(rackTag);
 // Deliveries and supplies: a crate for each; the baker's basket is filled once a day, at dawn.
 const sources=Object.fromEntries(Object.entries(SOURCES).map(([k,def])=>{const g=new THREE.Group();g.position.set(def.pos[0],0,def.pos[1]);scene.add(g);
  if(k==='ice'){box(g,1.6,.9,1.1,0,.45,0,'#f7f7f2');box(g,1.65,.08,1.15,0,.92,0,'#3a8ee0');const lg=textPlane('GLACES',1,.28,{bg:'#f7f7f2',fg:'#e0679b'});lg.position.set(0,.55,.56);g.add(lg);}
  else if(k==='bread'){box(g,1.5,.3,1,0,.15,0,'#b98a52');box(g,1.4,.04,.9,0,.31,0,'#e9d9b0',false);}
  else if(k==='chlor'){box(g,1.6,.5,1.1,0,.25,0,'#3a8ee0');box(g,1.5,.05,1,0,.52,0,'#dfe8ec',false);}
  else if(['drink','cream','gas','souv','ph','towel','pdrink','pice','rpotato','rmeat'].includes(k)){box(g,1.6,.4,1.1,0,.2,0,{rpotato:'#c4935a',rmeat:'#e8737c',drink:'#3a8ee0',cream:'#ff9f43',gas:'#8a959b',souv:'#b06ae8',ph:'#7fbf5a',towel:'#7fb7d9',pdrink:'#3a8ee0',pice:'#f4a6c8'}[k]);box(g,1.5,.04,1,0,.42,0,'#dfe8ec',false);}
  else{box(g,1.6,.5,1.1,0,.25,0,'#c98a4a');box(g,1.5,.05,1,0,.52,0,'#dfe8ec',false);}
  const st=new THREE.Group();st.position.y=k==='ice'?.95:k==='bread'?.33:['drink','cream','gas','souv','ph','towel','pdrink','pice','rpotato','rmeat'].includes(k)?.45:.55;g.add(st);const tag=sprite(1.6,.4);tag.position.set(0,k==='ice'?1.9:1.6,0);g.add(tag);return [k,{g,st,tag}];}));
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
  for(const [x,c] of [[10.4,'#ff6f61'],[12.2,'#1ec8c8']]){cyl(pool,.04,1.9,x,1.0,-15.4,'#f4f1ea');const u=new THREE.Mesh(new THREE.ConeGeometry(1.05,.5,10),mat(c));u.position.set(x,2.05,-15.4);u.castShadow=true;pool.add(u);}
  box(pool,.5,1.5,.5,15.1,.75,-16.5,'#e8483a');box(pool,.8,.1,.8,15.1,1.55,-16.5,'#f4f1ea');}
 const poolTag=sprite(1.9,.45);poolTag.position.set(POOL.pad[0],1.3,POOL.pad[1]);pool.add(poolTag);
 const ducks=Array.from({length:4},(_,i)=>{const d=new THREE.Group();ball(d,.18,0,.2,0,'#f6d23a',.8);ball(d,.1,.16,.34,0,'#f6d23a');box(d,.1,.04,.08,.27,.32,0,'#f08a3a',false);d.userData.i=i;pool.add(d);return d;});
 // Stage for the evening show.
 const stage=new THREE.Group();stage.position.set(STAGE.pos[0],0,STAGE.pos[1]);scene.add(stage);box(stage,3.6,.4,1.8,0,.2,0,'#8a5a35');box(stage,3.6,2.4,.1,0,1.6,-.85,'#8a2b3a');box(stage,.8,1.1,.6,-1.9,.55,.2,'#20262a');box(stage,.8,1.1,.6,1.9,.55,.2,'#20262a');
 const sbanner=textPlane('SOIRÉES DU PARADIS',2.6,.4,{bg:'#f6c945',fg:'#8a2b3a'});sbanner.position.set(0,2.0,-.79);stage.add(sbanner);const spots=[0,1,2].map(i=>{const l=new THREE.Mesh(geo.sphere,new THREE.MeshStandardMaterial({color:['#ff4a6a','#4aa8ff','#ffe04a'][i],emissive:['#ff4a6a','#4aa8ff','#ffe04a'][i],emissiveIntensity:.1}));l.scale.setScalar(.14);l.position.set(-1.2+i*1.2,3.0,-.2);stage.add(l);return l;});
 box(scene,1.3,.04,1.3,STAGE.pad[0],.06,STAGE.pad[1],'#f6c945',false);padIcon(scene,'🎤',STAGE.pad[0],STAGE.pad[1],.09,.85);const stageTag=sprite(3.4,.5);stageTag.position.set(STAGE.pos[0],3.5,STAGE.pos[1]);scene.add(stageTag);
 // Pitches: a patch of ground and a number; tents and caravans come and go with the campers; mobile homes stay.
 const CAMP=['#e86a7a','#6a8ee8','#e8b86a','#8ad06a','#b06ae8','#6ad0c8'];
 function tentModel(c){const g=new THREE.Group(),body=new THREE.Mesh(geo.pyr,mat(c));body.scale.set(1.15,1.15,1.15);body.position.y=.58;body.rotation.y=Math.PI/4;body.castShadow=true;g.add(body);const door=box(g,.5,.6,.02,0,.32,.62,'#2b3a44',false);door.userData.base='#2b3a44';g.userData.glow=[door];return g;}
 function caravanModel(c){const g=new THREE.Group();box(g,2.5,1.1,1.25,0,.8,-.3,'#f4f1ea');box(g,2.52,.2,1.27,0,.62,-.3,c);box(g,2.6,.1,1.35,0,1.4,-.3,'#d8dfe3');const win=box(g,.5,.45,.02,.5,1,.34,'#7fb7d9',false);win.userData.base='#7fb7d9';g.userData.glow=[win];box(g,.4,.7,.02,-.6,.85,.34,'#9a6a40',false);for(const x of [-.7,.7]){const w=cyl(g,.26,.12,x,.26,-.9,'#20262a');w.rotation.z=Math.PI/2;}box(g,.12,.12,.6,1.5,.4,-.3,'#8a959b');box(g,1.6,.06,.7,0,1.5,.3,c,false).rotation.x=.25;return g;}
 // The five rental models and the owners' homes.
 function ecoModel(){const g=new THREE.Group();box(g,2.4,1.2,1.4,0,.7,-.3,'#e9eef0');box(g,2.6,.12,1.6,0,1.35,-.3,'#8a959b');box(g,.6,.9,.04,-.6,.55,.42,'#6b4428',false);const w=box(g,.5,.4,.04,.5,.85,.42,'#7fb7d9',false);w.userData.base='#7fb7d9';g.userData.glow=[w];return g;}
 function premiumModel(){const g=new THREE.Group();box(g,3.6,1.7,2.0,0,.9,-.3,'#f1e6cf');box(g,3.9,.2,2.3,0,1.85,-.3,'#2f7d4f');box(g,3.4,.1,.9,0,.1,1.1,'#c9a46a',false);box(g,.9,1.3,.04,-1,.7,.72,'#6b4428',false);g.userData.glow=[];for(const x of [.1,.9,1.5]){const w=box(g,.5,.7,.04,x,1.1,.72,'#7fb7d9',false);w.userData.base='#7fb7d9';g.userData.glow.push(w);}for(const dx of [-1.6,1.6])box(g,.08,1,.08,dx,.6,1.5,'#8a5a35');box(g,3.6,.08,.9,0,1.15,1.1,'#ffffff');return g;}
 function lodgeModel(){const g=new THREE.Group();box(g,3.4,.15,2.6,0,.1,.1,'#c9a46a',false);const b=new THREE.Mesh(geo.pyr,mat('#e8dcc0'));b.scale.set(1.9,1.5,1.9);b.position.set(0,.95,-.2);b.rotation.y=Math.PI/4;b.castShadow=true;g.add(b);const d=box(g,.7,.9,.03,0,.55,.78,'#6b4428',false);d.userData.base='#6b4428';g.userData.glow=[d];return g;}
 function cabaneModel(){const g=new THREE.Group();cyl(g,.35,3,-.6,1.5,-.4,'#7a4a2a');cyl(g,.3,3,.8,1.5,-.4,'#7a4a2a');ball(g,1.7,0,3.4,-.4,'#3d8a36',.55);box(g,2.6,.15,2,0,2.3,0,'#c9a46a');box(g,1.8,1.1,1.4,0,2.95,-.1,'#d9a35a');box(g,2.1,.18,1.7,0,3.6,-.1,'#8a4a2a');const w=box(g,.4,.4,.04,0,3,.62,'#7fb7d9',false);w.userData.base='#7fb7d9';g.userData.glow=[w];box(g,.2,2.2,.1,1.3,1.1,.9,'#8a5a35');return g;}
 function ownerModel(){const g=new THREE.Group();box(g,3,1.4,1.7,0,.75,-.3,'#d9e3d0');box(g,3.3,.18,2,0,1.6,-.3,'#8a4a2a');box(g,.7,1.1,.04,-.8,.6,.57,'#6b4428',false);const w=box(g,.6,.5,.04,.6,.95,.57,'#7fb7d9',false);w.userData.base='#7fb7d9';g.userData.glow=[w];box(g,3.2,.04,.04,0,.35,1.4,'#c98a4a');for(const x of [-1.5,-.5,.5,1.5])box(g,.06,.5,.06,x,.25,1.4,'#c98a4a');for(const [x,c] of [[-1,'#ff4d6d'],[.2,'#f6c945'],[1.1,'#ff8fa3']])ball(g,.14,x,.2,1.2,c);return g;}
 function mobilModel(){const g=new THREE.Group();box(g,3,1.5,1.8,0,.8,-.3,'#d9a35a');box(g,3.3,.2,2.1,0,1.65,-.3,'#8a4a2a');box(g,.7,1.1,.04,-.8,.65,.62,'#6b4428',false);g.userData.glow=[];for(const x of [.3,1.05]){const w=box(g,.5,.5,.04,x,1,.62,'#7fb7d9',false);w.userData.base='#7fb7d9';g.userData.glow.push(w);}box(g,3.1,.08,.8,0,.1,.9,'#eadcb8',false);box(g,.7,.45,.7,1.1,.3,1.1,'#e8483a');return g;}
 const pitches=PITCHES.map((P,i)=>{const g=new THREE.Group();g.position.set(P.x,0,P.z);scene.add(g);const patch=box(g,3,.03,2.5,0,.03,0,P.kind==='tent'?'#9ccf63':'#e2d3a8',false);  let unit=new THREE.Group();g.add(unit);
  const trash=new THREE.Group();trash.position.set(.5,0,1.4);g.add(trash);const tag=sprite(1.5,.42);tag.position.set(0,2.4,.3);g.add(tag);
  return {g,P,patch,unit,trash,tag,made:null};});
 // Event markers: where somebody must stand for a moment to sort it out.
 const markers=[0,1,2].map(()=>{const g=new THREE.Group();scene.add(g);box(g,1.3,.04,1.3,0,.06,0,'#e8483a',false);const t=sprite(1.8,.5);t.position.y=1.5;g.add(t);g.visible=false;return {g,t};});

 // Aquatic centre: four more basins east of the old pool, the technical room, the spa, the beach bar and the loungers.
 const tagAt=(g,x,y,z)=>{const tg=sprite(1.9,.42);tg.position.set(x,y,z);g.add(tg);return tg;};
 const aq=new THREE.Group();scene.add(aq);const basin={};
 const MAT_WATER=c=>new THREE.MeshStandardMaterial({color:c,transparent:true,opacity:.82,roughness:.2});
 for(const id of BASIN_ORDER.slice(1)){const B=BASINS[id],[x0,z0,x1,z1]=B.rect,cx=(x0+x1)/2,cz=(z0+z1)/2,W=x1-x0,D=z1-z0,g=new THREE.Group();aq.add(g);
  box(g,W+.7,.3,D+.7,cx,.15,cz,'#eef2f4');const water=box(g,W,.04,D,cx,.32,cz,'#43b5e8',false);water.material=MAT_WATER('#43b5e8');
  const extra={};
  if(id==='paddling'){for(const [dx,dz] of [[-.7,-.3],[.6,.4]]){cyl(g,.06,.6,cx+dx,.6,cz+dz,'#e8483a');const m=new THREE.Mesh(geo.sphere,mat('#ff6f61'));m.scale.set(.35,.2,.35);m.position.set(cx+dx,.95,cz+dz);g.add(m);}}
  if(id==='slides'){box(g,.9,3.2,.9,x1+.9,1.6,z0+.8,'#e8483a');for(const [c,dz] of [['#3ac0e0',-.5],['#f6c945',.5]]){const r=box(g,.8,.1,3.1,x1-.7,1.6,z0+1.3+dz*.6,c);r.rotation.x=-.45;r.rotation.z=dz*.15;}box(g,.12,1.3,.12,x1+.9,3.5,z0+.8,'#59646b');}
  if(id==='lazy'){box(g,W-1.9,.25,D-1.9,cx,.42,cz,'#8fc75a');ball(g,.5,cx-.8,.9,cz,'#3d8a36',.9);ball(g,.4,cx+.9,.8,cz,'#55a744',.9);extra.floats=Array.from({length:5},(_,i)=>{const m=new THREE.Mesh(new THREE.TorusGeometry(.22,.09,8,14),mat(['#ff6f61','#f6c945','#3ac0e0','#ffffff','#8ad06a'][i]));m.rotation.x=Math.PI/2;g.add(m);return m;});}
  if(id==='lagoon'){box(g,W+1.4,.08,1.6,cx,.06,z0-1.4,'#f0d9a0',false);for(const dx of [-3,0,3]){cyl(g,.04,1.9,cx+dx,1,z0-1.4,'#f4f1ea');const u=new THREE.Mesh(new THREE.ConeGeometry(1,.45,10),mat(['#ff6f61','#1ec8c8','#f6c945'][dx/3+1]));u.position.set(cx+dx,2,z0-1.4);g.add(u);}}
  const rope=box(g,W,.18,.08,cx,.5,B.gate[1]-.35,'#e8483a');rope.visible=false;const tag=sprite(2.2,.42);tag.position.set(cx,1.7,z1+.3);g.add(tag);
  basin[id]={g,water,rope,tag,extra,B,cx,cz,W,D};}
 const tech=new THREE.Group();scene.add(tech);{const g=tech,[x,z]=TECH.pos;box(g,3.4,2.2,2.2,x,1.1,z,'#dfe8ec');box(g,3.7,.2,2.5,x,2.3,z,'#5b8fb9');const sg=textPlane('LOCAL TECHNIQUE',2.4,.34,{bg:'#2b6fd6',font:'900 38px system-ui'});sg.position.set(x,1.8,z+1.11);g.add(sg);
  for(const [pad,ic,col] of [[TECH.chlor,'🧪','#3a8ee0'],[TECH.ph,'⚗️','#7fbf5a'],[TECH.filter,'🧹','#f6c945']]){box(g,1.1,.04,1.1,pad[0],.06,pad[1],col,false);padIcon(g,ic,pad[0],pad[1],.09);}
  cyl(g,.35,1.4,x-1.2,.9,z-.2,'#7fb7d9');cyl(g,.3,1.2,x+1.2,.8,z-.2,'#7fbf5a');tech.userData.tag=tagAt(g,x,3,z);}
 const spa=new THREE.Group();scene.add(spa);{const g=spa,[x,z]=SPA.pos;box(g,5.2,2.6,2.4,x,1.3,z,'#e9dcc0');box(g,5.5,.2,2.7,x,2.7,z,'#2f7d4f');const sg=textPlane('SPA · BIEN-ÊTRE',2.6,.36,{bg:'#8a5a35',font:'900 40px system-ui'});sg.position.set(x,2.0,z+1.21);g.add(sg);
  box(g,.9,1.5,.04,x,.75,z+1.21,'#6b4428',false);box(g,1.1,.04,1.1,SPA.pad[0],.06,SPA.pad[1],'#7fb7d9',false);padIcon(g,'🧖',SPA.pad[0],SPA.pad[1],.09);
  spa.userData.steam=Array.from({length:4},(_,i)=>{const m=new THREE.Mesh(geo.sphere,new THREE.MeshStandardMaterial({color:'#fff',transparent:true,opacity:.35,depthWrite:false}));m.userData.i=i;g.add(m);return m;});spa.userData.tag=tagAt(g,x,3.5,z);}
 const bar=new THREE.Group();scene.add(bar);{const g=bar,[x,z]=BAR.pos;box(g,2.4,1.1,1.3,x,.55,z,'#d9a35a');box(g,2.5,.08,1.4,x,1.14,z,'#eadcb8');for(const dx of [-1.1,1.1])box(g,.1,2.2,.1,x+dx,1.1,z+.6,'#8a5a35');const th=new THREE.Mesh(new THREE.ConeGeometry(1.8,.9,10),mat('#c9a050'));th.position.set(x,2.6,z+.3);g.add(th);
  const sg=textPlane('BAR DE PLAGE',1.7,.3,{bg:'#1ec8c8',font:'900 38px system-ui'});sg.position.set(x,1.9,z+.7);g.add(sg);box(g,1.1,.04,1.1,BAR.pad[0],.06,BAR.pad[1],'#f08a3a',false);padIcon(g,'🍹',BAR.pad[0],BAR.pad[1],.09);bar.userData.tag=tagAt(g,x,3.3,z);}
 const loungers=LOUNGERS.map(([x,z])=>{const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(g,.7,.12,1.5,0,.24,0,'#f6c945');const rest=box(g,.7,.1,.6,0,.5,-.55,'#f6c945');rest.rotation.x=.7;const tw=box(g,.55,.03,.9,0,.32,.1,'#ff6f61',false);tw.visible=false;return {g,tw};});
 const visitors=new Map(),incM=[0,1].map(()=>{const g=new THREE.Group();scene.add(g);box(g,1.3,.04,1.3,0,.06,0,'#e8483a',false);const tg=sprite(2.4,.5);tg.position.y=1.5;g.add(tg);g.visible=false;return {g,tg};});
 // Water tower with its gauge, the puddles that lead to a leak, the transformer and the solar panels.
 const tower=new THREE.Group();scene.add(tower);{const g=tower,[x,z]=BOREHOLE.pos;for(const dx of [-.7,.7])for(const dz of [-.7,.7])cyl(g,.07,2.2,x+dx,1.1,z+dz,'#59646b');const sh=cyl(g,1.15,1.7,x,3.05,z,'#dfe8ec');sh.material=new THREE.MeshStandardMaterial({color:'#dfe8ec',transparent:true,opacity:.55,roughness:.3});
  tower.userData.fill=cyl(g,1.1,1,x,2.5,z,'#43b5e8');const roof=new THREE.Mesh(new THREE.ConeGeometry(1.35,.7,12),mat('#2b6fd6'));roof.position.set(x,4.2,z);g.add(roof);cyl(g,.4,.5,x+1.6,.3,z+.6,'#8a959b');tower.userData.tag=tagAt(g,x,5.2,z);}
 const puddles=Array.from({length:5},(_,i)=>{const m=new THREE.Mesh(geo.cyl,new THREE.MeshStandardMaterial({color:'#4aa8e8',transparent:true,opacity:.7,roughness:.1}));m.scale.set(.5+i*.12,.02,.38+i*.1);m.position.y=.08;m.visible=false;scene.add(m);return m;});
 const leakM=new THREE.Group();scene.add(leakM);leakM.visible=false;{const f=cyl(leakM,.1,.5,0,.3,0,'#8a959b');for(let i=0;i<8;i++){const d=new THREE.Mesh(geo.sphere,mat('#4aa8e8'));d.scale.setScalar(.09);d.userData.i=i;leakM.add(d);}leakM.userData.tag=tagAt(leakM,0,1.8,0);}
 const transfo=new THREE.Group();scene.add(transfo);{const g=transfo;for(let i=0;i<3;i++){box(g,1,1.5,.9,16.4+i*1.1,.75,-1.0,'#8a959b');box(g,.9,.2,.85,16.4+i*1.1,1.6,-1.0,'#f6c945');}transfo.userData.n=3;}
 const panels=Array.from({length:6},(_,i)=>{const m=box(scene,1.2,.06,.8,SANIT.pos[0]-1.6+(i%3)*1.6,2.62+.0,SANIT.pos[1]-.6+Math.floor(i/3)*1.2,'#1f3a6b');m.rotation.x=-.25;m.visible=false;return m;});
 // Kids' club and the snack-restaurant.
 const club=new THREE.Group();scene.add(club);{const g=club,[x,z]=CLUB.pos;box(g,3.2,1.8,2,x,.9,z,'#ffe08a');box(g,3.5,.2,2.3,x,1.9,z,'#ff6f61');const sg=textPlane('CLUB ENFANTS',2.2,.34,{bg:'#3ac0e0',font:'900 38px system-ui'});sg.position.set(x,1.5,z+1.01);g.add(sg);
  for(const [dx,c] of [[-1.7,'#ff4d6d'],[-1.4,'#f6c945'],[1.5,'#3ac0e0'],[1.8,'#8ad06a']]){cyl(g,.02,1.8,x+dx,.9,z+1.2,'#8a959b');ball(g,.28,x+dx,2,z+1.2,c,1.2);}
  box(g,1.1,.04,1.1,CLUB.mascot[0],.06,CLUB.mascot[1],'#ff8fa3',false);padIcon(g,'🐻',CLUB.mascot[0],CLUB.mascot[1],.09);club.userData.tag=tagAt(g,x,2.9,z);}
 const resto=new THREE.Group();scene.add(resto);{const g=resto,cx=RESTO.counter[0];box(g,8.4,1,.9,cx,.5,-29.2,'#d9a35a');box(g,8.6,.08,1,cx,1.04,-29.2,'#eadcb8');for(const dx of [-4,4])box(g,.1,2.4,.1,cx+dx,1.2,-28.8,'#8a5a35');
  for(let i=0;i<14;i++)box(g,.62,.08,1.6,cx-4.1+i*.62+.31,2.45,-29.3,i%2?'#ffffff':'#e8483a',false).rotation.x=-.12;const sg=textPlane('SNACK-BAR DU PARADIS',3.6,.4,{bg:'#8a3a2a',fg:'#ffe9b8',font:'900 40px system-ui'});sg.position.set(cx,2.0,-28.7);g.add(sg);
  box(g,1.2,.04,1.2,RESTO.counter[0],.06,RESTO.counter[1],'#7fb7d9',false);padIcon(g,'🍽️',RESTO.counter[0],RESTO.counter[1],.09);box(g,1.2,.04,1.2,RESTO.pass[0],.06,RESTO.pass[1],'#f08a3a',false);padIcon(g,'🍟',RESTO.pass[0]-.3,RESTO.pass[1],.09,.5);padIcon(g,'🍖',RESTO.pass[0]+.3,RESTO.pass[1],.09,.5);
  resto.userData.pass=new THREE.Group();resto.userData.pass.position.set(cx,1.12,-29.2);g.add(resto.userData.pass);resto.userData.passTag=tagAt(g,cx,3.3,-29.2);
  resto.userData.mach={};for(const [id,M] of Object.entries(MACH)){const m=new THREE.Group();m.position.set(M.pos[0],0,M.pos[1]);g.add(m);box(m,1.8,.95,1.2,0,.48,0,id==='fryer'?'#c9d1d6':'#3d454b');box(m,1.82,.06,1.22,0,.97,0,'#e6ecef');const glow=new THREE.Mesh(geo.box,new THREE.MeshStandardMaterial({color:id==='fryer'?'#d99a2b':'#ff6a1a',emissive:id==='fryer'?'#d99a2b':'#ff4a00',emissiveIntensity:0}));glow.scale.set(1.3,.05,.8);glow.position.set(0,1.02,0);m.add(glow);
   const tg=sprite(1.9,.42);tg.position.set(0,2.1,0);m.add(tg);const inS=new THREE.Group(),outS=new THREE.Group();inS.position.set(M.inPad[0],.1,M.inPad[1]);outS.position.set(M.outPad[0],.1,M.outPad[1]);g.add(inS,outS);
   for(const [pad,ic,col] of [[M.inPad,ICON[M.in],'#f08a3a'],[M.outPad,ICON[M.out],'#5cc46a']]){box(g,1.1,.04,1.1,pad[0],.06,pad[1],col,false);padIcon(g,ic,pad[0],pad[1],.09);}
   resto.userData.mach[id]={glow,tg,inS,outS};}
  resto.userData.tables=RESTO.tables.map(([x,z])=>{const tb=new THREE.Group();tb.position.set(x,0,z);g.add(tb);cyl(tb,.06,.7,0,.35,0,'#59646b');cyl(tb,.5,.06,0,.72,0,'#f4f1ea');for(const dz of [-.8,.8])cyl(tb,.2,.45,0,.22,dz,'#e8483a');cyl(tb,.03,1.8,0,.9,-.1,'#f4f1ea');const u=new THREE.Mesh(new THREE.ConeGeometry(.9,.35,10),mat('#ff6f61'));u.position.set(0,1.9,-.1);tb.add(u);return tb;});}
 // East quarter, the leisure services: each building appears when it is bought.
 const svc={},LS=LOISIRS;
 svc.laundry=new THREE.Group();scene.add(svc.laundry);{const g=svc.laundry,[x,z]=LS.laundry.pos;box(g,3.4,2,2,x,1,z,'#e9f2f7');box(g,3.7,.2,2.3,x,2.1,z,'#2b6fd6');const sg=textPlane('LAVERIE · JETONS',2.2,.34,{bg:'#2b6fd6',font:'900 40px system-ui'});sg.position.set(x,1.75,z+1.01);g.add(sg);
  svc.laundry.userData.win=[0,1,2].map(i=>box(g,.55,.55,.04,x-1.1+i*1.1,.85,z+1.02,'#7fb7d9',false));box(g,1.2,.04,1.2,LS.laundry.pad[0],.06,LS.laundry.pad[1],'#7fb7d9',false);padIcon(g,'🧺',LS.laundry.pad[0],LS.laundry.pad[1],.09);}
 svc.wifi=new THREE.Group();scene.add(svc.wifi);{const g=svc.wifi,[x,z]=LS.wifi.pos;cyl(g,.07,2.4,x,1.2,z,'#3d454b');const rb=box(g,.5,.3,.3,x,2.5,z,'#20262a');svc.wifi.userData.led=box(g,.08,.08,.04,x,2.5,z+.17,'#4fbf5a',false);
  for(const a of [-.18,.18])cyl(g,.015,.5,x+a,2.85,z,'#20262a');box(g,1.1,.04,1.1,LS.wifi.pad[0],.06,LS.wifi.pad[1],'#f6c945',false);padIcon(g,'📶',LS.wifi.pad[0],LS.wifi.pad[1],.09);svc.wifi.userData.tag=tagAt(g,x,3.4,z);}
 svc.bikes=new THREE.Group();scene.add(svc.bikes);{const g=svc.bikes,[x,z]=LS.bikes.pos;box(g,2.8,1.4,1.4,x,.7,z,'#e8a23a');box(g,3.1,.15,1.7,x,1.48,z,'#c0392b');const sg=textPlane('VÉLOS · PADDLES',2.2,.3,{bg:'#f4f1ea',fg:'#8a3a2a',font:'900 38px system-ui'});sg.position.set(x,1.0,z+.71);g.add(sg);
  svc.bikes.userData.bikes=Array.from({length:BIKES},(_,i)=>{const b=new THREE.Group();b.position.set(x-1.3+i*.52,0,z+1.25);b.rotation.y=.3;g.add(b);for(const dx of [-.28,.28]){const w=cyl(b,.2,.06,dx,.2,0,'#20262a');w.rotation.z=Math.PI/2;w.rotation.x=0;w.rotation.y=0;w.rotation.set(0,0,Math.PI/2);}box(b,.62,.05,.04,0,.4,0,['#e8483a','#3a8ee0','#5fbf6a'][i%3],false);return b;});
  svc.bikes.userData.boards=Array.from({length:PADDLES},(_,i)=>{const b=box(g,.34,.06,1.1,x+1.7+(i%2)*.4,.5+Math.floor(i/2)*.14,z-.2,['#3ac0e0','#f6c945'][i%2]);b.rotation.z=.7;return b;});
  box(g,1.2,.04,1.2,LS.bikes.pad[0],.06,LS.bikes.pad[1],'#7fb7d9',false);padIcon(g,'🚲',LS.bikes.pad[0],LS.bikes.pad[1],.09);svc.bikes.userData.tag=tagAt(g,x,2.4,z);}
 svc.playground=new THREE.Group();scene.add(svc.playground);{const g=svc.playground,[x,z]=LS.playground.pos;box(g,4.4,.05,3.2,x,.04,z,'#f0d9a0',false);for(const dx of [-1.6,-.2]){box(g,.08,1.5,.08,x+dx,.75,z-.8,'#e8483a');box(g,.08,1.5,.08,x+dx,.75,z+.1,'#e8483a');}box(g,1.5,.08,.08,x-.9,1.5,z-.35,'#e8483a');
  box(g,.4,.05,.3,x-1.3,.55,z-.35,'#3a8ee0');box(g,.4,.05,.3,x-.5,.55,z-.35,'#f6c945');const sl=box(g,.7,.08,2,x+1.4,.8,z,'#3ac0e0');sl.rotation.x=.55;box(g,.7,1.3,.08,x+1.4,.65,z-.9,'#e8483a');}
 svc.sports=new THREE.Group();scene.add(svc.sports);{const g=svc.sports,[x,z]=LS.sports.pos;box(g,5.4,.05,3.6,x,.04,z,'#2f9e6a',false);box(g,5.2,.02,.05,x,.07,z-1.7,'#ffffff',false);box(g,5.2,.02,.05,x,.07,z+1.7,'#ffffff',false);box(g,.05,.02,3.4,x-2.6,.07,z,'#ffffff',false);box(g,.05,.02,3.4,x+2.6,.07,z,'#ffffff',false);box(g,.05,.02,3.4,x,.07,z,'#ffffff',false);
  for(const dx of [-2.6,2.6]){box(g,.06,1.3,.06,x+dx,.65,z-.7,'#ffffff');box(g,.06,1.3,.06,x+dx,.65,z+.7,'#ffffff');box(g,.06,.06,1.4,x+dx,1.3,z,'#ffffff');}}
 svc.shuttle=new THREE.Group();scene.add(svc.shuttle);{const g=svc.shuttle,[x,z]=LS.shuttle.stop;cyl(g,.05,2.2,x+.8,1.1,z,'#59646b');const ss=textPlane('NAVETTE PLAGE',.9,.5,{bg:'#2b6fd6',font:'900 60px system-ui'});ss.position.set(x+.8,2.1,z+.05);g.add(ss);box(g,1.6,.1,.5,x-.3,.45,z,'#8a5a35');box(g,1.2,.04,1.2,x,.06,z-.8,'#f6c945',false);padIcon(g,'🚌',x,z-.8,.09);
  const bus=new THREE.Group();bus.position.set(x,0,ROAD_Z);g.add(bus);box(bus,3.6,1.5,1.5,0,.95,0,'#f6c945');box(bus,3.4,.5,1.52,0,1.3,0,'#cfe6f2');for(const dx of [-1.1,1.1]){const w=cyl(bus,.3,.2,dx,.3,.8,'#20262a');w.rotation.x=Math.PI/2;}box(bus,.1,.1,.1,1.85,.8,0,'#ff4a4a');svc.shuttle.userData.bus=bus;svc.shuttle.userData.tag=tagAt(g,x,2.8,ROAD_Z);}
 // Unlock tiles: dashed square, name and price, filling as the player pays.
 const holdOf=(s,key)=>{let h=0;if(!(s.paid[key]>0))for(const b of [s.player,...s.guests])if(b.buyKey===key)h=Math.max(h,Math.min(1,(b.buyT??0)/BUY_DELAY));return h>=1?0:h;};
 const tiles=new Map();let shownTiles=null;function tile(u){const g=new THREE.Group();g.position.set(u.pos[0],.13,u.pos[1]);const c=document.createElement('canvas');c.width=c.height=256;const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const plane=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.8),new THREE.MeshBasicMaterial({map,transparent:true}));plane.rotation.x=-Math.PI/2;g.add(plane);scene.add(g);let last='';
  g.userData.draw=(paid,hold=0)=>{const key=paid+':'+Math.round(hold*16);if(key===last)return;last=key;const ctx=c.getContext('2d');ctx.clearRect(0,0,256,256);ctx.fillStyle=u.level?'#fff3c455':'#ffffff55';ctx.fillRect(14,14,228,228);ctx.fillStyle='#5fd06acc';const f=paid/u.price;ctx.fillRect(14,242-228*f,228,228*f);ctx.setLineDash([26,18]);ctx.lineWidth=10;ctx.strokeStyle=u.level?'#ffe08a':'#fff';ctx.strokeRect(14,14,228,228);
   ctx.fillStyle='#2b3a44';ctx.textAlign='center';ctx.font='800 30px system-ui';ctx.fillText(u.name,128,u.tip?72:92,220);ctx.font='900 54px system-ui';ctx.fillText(`${(u.price-paid).toLocaleString('fr-FR')} $`,128,u.tip?140:168,220);if(u.tip){ctx.font='700 22px system-ui';ctx.fillText(u.tip,128,196,220);}if(hold>0){ctx.setLineDash([]);ctx.fillStyle='#26343f';ctx.fillRect(30,204,196,34);ctx.fillStyle='#2b6fd6';ctx.fillRect(30,204,196*hold,34);ctx.fillStyle='#fff';ctx.font='800 21px system-ui';ctx.fillText('Restez pour acheter…',128,229,186);}map.needsUpdate=true;};return g;}

 // The inspector walks round the camp while an inspection is on.
 const inspector=person('#f4f1ea',{hat:'#2b3a44'});inspector.visible=false;const inspTag=sprite(2.2,.5);inspTag.position.set(0,2.1,0);inspector.add(inspTag);
 const INSPECT_PATH=[[3,4.6],[-6,4.6],[0,2],[8,-.4],[10,-14],[0,-8],[-6,-1.8],[3,4.6]];
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
 const lvlOf=(s,id)=>s.levels[id]??0;
 // The mascot costume: whoever stands on the pad at the kids' club wears a big yellow head.
 function mask(g,a){if(!g.userData.mask){const m=ball(g,.46,0,1.4,0,'#f6c945',.95);box(g,.18,.16,.1,0,1.35,.42,'#e8483a',false);m.visible=false;g.userData.mask=m;g.userData.nose=g.children[g.children.length-1];}g.userData.mask.visible=g.userData.nose.visible=!!a.costume;}
 const MOODFACE=m=>m<30?'😡':m<45?'😕':'';
 const cashList=v=>{const n=Math.min(18,Math.floor(v/20));return [...repeat('bundle',n),...(v-n*20>=1&&n<18?['bundle']:[])];};

 function sync(dt){const s=getState();time+=dt;daylight(s);
  animate(player,s.player,time);stackOf(player.userData.back,s.player.carry,carryLayout(s.player.carry.length));
  // Staff at their post.
  for(const k of ['reception','shop','stage']){const on=!!s.posts[k]&&(k!=='stage'||!!s.unlocked.stage);posts[k].visible=on;if(on&&k==='stage'){posts[k].position.y=.4;}}
  for(const h of s.helpers){let g=helpers.get(h.id);if(!g){g=person(JOB[h.loop]??JOB.fix,{hat:'#ffffff'});const tag=sprite(1.7,.45);tag.position.set(0,2,0);g.add(tag);g.userData.tag=tag;helpers.set(h.id,g);}
   animate(g,h,time);g.userData.body.material=mat(JOB[h.loop]??JOB.fix);g.userData.tag.visible=showMissions||h.loop==='rest';pill(g.userData.tag,MISSIONS.find(m=>m.id===h.loop)?.icon??'',h.loop==='rest'?{bg:'#c9d3d8ee'}:{});stackOf(g.userData.back,h.carry,carryLayout(h.carry.length));}
  for(const [id,g] of helpers)if(!s.helpers.some(h=>h.id===id)){drop(g);helpers.delete(id);}
  if(s.stars!==gateStars){gateStars=s.stars;gateSign(s.stars);}
  {const I=s.inspect,on=I.state==='on';inspector.visible=on;if(on){const f=Math.min(.999,1-I.t/INSPECT_LEN)*(INSPECT_PATH.length-1),i=Math.floor(f),a=INSPECT_PATH[i],b=INSPECT_PATH[i+1],u=f-i,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;
   animate(inspector,{x,z,heading:Math.atan2(b[0]-a[0],b[1]-a[1]),moving:true},time);pill(inspTag,I.why?`🧑‍⚕️ ${I.why}`:`🧑‍⚕️ ${Math.ceil(I.t)} s`,I.why?{bg:'#e8483aee',fg:'#fff'}:{bg:'#26343fee',fg:'#fff'});}}
  // Pitches.
  const byPitch=new Map();for(const c of s.campers)if(c.in)byPitch.set(c.pitch,c);
  pitches.forEach((v,i)=>{const open=pitchOpen(s,i),P=s.pitches[i];v.g.visible=open;if(!open)return;const c=byPitch.get(i),kind=v.P.kind;
   if(kind==='mobil'||kind==='owner'){const R=kind==='mobil'?s.rent[v.P.n]:null,want=kind==='mobil'?R.tier:'owner';if(want!==v.made){v.g.remove(v.unit);v.unit=kind==='owner'?ownerModel():({eco:ecoModel,confort:mobilModel,premium:premiumModel,lodge:lodgeModel,cabane:cabaneModel})[want]();v.g.add(v.unit);v.made=want;}}
   if(kind!=='mobil'&&kind!=='owner'){const want=c?kind+c.look:null;if(want!==v.made){v.g.remove(v.unit);v.unit=!c?new THREE.Group():kind==='tent'?tentModel(CAMP[c.look%CAMP.length]):caravanModel(CAMP[c.look%CAMP.length]);v.g.add(v.unit);v.made=want;}
    v.unit.scale.y=P.down?.28:1;v.unit.rotation.z=P.down?.5:0;}
   {const own=kind==='owner'&&s.owners[v.P.n].on,lit=(!!c&&(c.sleep||night>.3))||(own&&night>.3);for(const m of v.unit.userData.glow??[])m.material=mat(lit?'#ffcf5a':m.userData.base);}
   stackOf(v.trash,repeat('trash',P.trash),{cols:3,step:.42});
   const RR=kind==='mobil'?s.rent[v.P.n]:null,OO=kind==='owner'?s.owners[v.P.n]:null;const text=RR?.broken?`🔧 ${RR.broken}`:OO&&OO.mood<40?'📣 mécontent':RR&&RR.cond<40&&!c?'⚠️ à rénover':P.noisy?'🎶 FIESTA':P.down?'🌬️ à replanter':P.trash&&!c?'🗑️ à vider':c&&c.sleep?'💤':c&&c.left<=0?'🧳 départ':'';v.tag.visible=!!text;if(text)pill(v.tag,text,P.noisy?{bg:'#b06ae8ee',fg:'#fff'}:P.down?{bg:'#e8483aee',fg:'#fff'}:{});});
  // Aquatic centre.
  if(s.unlocked.pool){const A=s.aqua,guarded=guardedBasins(s),bad=waterIssue(s),waterCol=bad==='green'?'#7fa84a':bad==='cloudy'?'#9bbfc0':bad==='cold'?'#8fc6e8':bad==='eyes'?'#5fc0c0':'#43b5e8';
   for(const id of BASIN_ORDER.slice(1)){const b=basin[id],open=!!s.unlocked[id];b.g.visible=open;if(!open)continue;b.water.material.color.set(waterCol);const occ=A.occ[id]??0,closed=!guarded.has(id),full=occ>=BASINS[id].cap;
    b.rope.visible=closed;b.tag.visible=closed||full;if(closed)pill(b.tag,'🚫 fermé : pas de maître-nageur',{bg:'#e8483aee',fg:'#fff'});else if(full)pill(b.tag,`${BASINS[id].icon} complet ${occ}/${BASINS[id].cap}`,{bg:'#f6b94aee'});
    if(b.extra.floats){b.extra.floats.forEach((m,i)=>{const u=((time*.04+i/b.extra.floats.length)%1)*4,w=b.W-.9,d=b.D-.9,k=Math.floor(u),f=u-k,x0=b.cx-w/2,z0=b.cz-d/2;const pts=[[x0,z0],[x0+w,z0],[x0+w,z0+d],[x0,z0+d],[x0,z0]];m.position.set(pts[k][0]+(pts[k+1][0]-pts[k][0])*f,.38,pts[k][1]+(pts[k+1][1]-pts[k][1])*f);});}}
   tech.visible=!!s.unlocked.tech;if(tech.visible){tech.userData.tag.visible=true;const bad2=bad&&bad!=='cold';pill(tech.userData.tag,`🧪 ${Math.round(s.pool.chlor*100)} % · pH ${A.ph.toFixed(2)} · filtre ${Math.round(A.filter*100)} % · ${Math.round(14+A.temp*16)}°`,bad2?{bg:'#e8483aee',fg:'#fff'}:bad==='cold'?{bg:'#f6b94aee'}:{});}
   spa.visible=!!s.unlocked.spa;if(spa.visible){const n=A.spa.sessions.length;spa.userData.steam.forEach((m,i)=>{m.visible=n>0;const u=(time*.3+i/4)%1;m.position.set(SPA.pos[0]+1.5+Math.sin(u*6+i)*.15,2.9+u*1.2,SPA.pos[1]-.3);m.scale.setScalar(.12+u*.2);});spa.userData.tag.visible=n>0||A.spa.towels<2;pill(spa.userData.tag,`🧖 ${n}/${SPA.cap} · ${A.spa.towels} serviette${A.spa.towels>1?'s':''}`,A.spa.towels<2?{bg:'#f6b94aee'}:{});}
   bar.visible=!!s.unlocked.beachbar;if(bar.visible){bar.userData.tag.visible=A.bar.drink<2||A.bar.ice<2;pill(bar.userData.tag,`🍹 ${A.bar.drink<2?'🥤 vide ':''}${A.bar.ice<2?'🍦 vide':''}`,{bg:'#f6b94aee'});}
   const n=loungeCount(s);loungers.forEach((l,i)=>{l.g.visible=i<n;l.tw.visible=A.lounge[i]===1;});
   incM.forEach((m,i)=>{const inc=A.incidents[i];m.g.visible=!!inc;if(inc){m.g.position.set(inc.x,0,inc.z);pill(m.tg,`${INCIDENTS[inc.kind].split(' ')[0]} ${Math.round(inc.fix/REPAIR*100)} %`,{bg:'#e8483aee',fg:'#fff'});}});
   const seenV=new Set();for(const v of A.visitors){seenV.add(v.id);let g=visitors.get(v.id);if(!g){g=person(['#e0a050','#50a0e0','#a050e0','#e05080','#50e0a0','#e0e050'][v.look%6]);visitors.set(v.id,g);}animate(g,v,time);if(v.swim)g.position.y=-.5;}
   for(const [id,g] of visitors)if(!seenV.has(id)){drop(g);visitors.delete(id);}}
  // Kids' club and snack-restaurant.
  club.visible=!!s.unlocked.kidsclub;if(club.visible){const C=s.club,tg=club.userData.tag;tg.visible=C.state!=='idle';if(C.state==='wait')pill(tg,`🧒 ouverture dans ${Math.ceil(C.t)} s`,{bg:'#f6c945ee'});else if(C.state==='on'){const mon=C.ok>0&&C.ok>=CLUB.len-C.t-1;pill(tg,mon?`🧒 séance en cours · ${Math.ceil(C.t)} s`:`⚠️ pas d’animateur ! ${Math.ceil(C.t)} s`,mon?{}:{bg:'#e8483aee',fg:'#fff'});}}
  resto.visible=!!s.unlocked.resto;if(resto.visible){const R=s.resto,u=resto.userData;stackOf(u.pass,[...repeat('fries',R.fries),...repeat('steak',R.steak)],{cols:6,rows:2,step:.3,dstep:.3,max:20});u.passTag.visible=R.fries===0||R.steak===0;pill(u.passTag,`🍽️ rupture : ${R.fries===0?'🍟 ':''}${R.steak===0?'🍖':''}`,{bg:'#f6b94aee'});
   for(const [id,M] of Object.entries(MACH)){const m=s.mach[id],v=u.mach[id];stackOf(v.inS,repeat(M.in,m.in),{cols:3,rows:3,step:.32,dstep:.32,max:12});stackOf(v.outS,repeat(M.out,m.out),{cols:3,rows:3,step:.32,dstep:.32,max:12});v.glow.material.emissiveIntensity=m.working?.5+.5*Math.sin(time*9):0;v.tg.visible=m.in>0||m.out>0;pill(v.tg,m.working?`🔥 ${m.in} → ${m.out}`:`${ICON[M.in]} ${m.in} · ${ICON[M.out]} ${m.out}`,m.working?{bg:'#ffb070ee'}:{});}}
  mask(player,s.player);for(const a of s.guests){const g=guests.get(a.id);if(g)mask(g,a);}
  // Water, power.
  {const W=s.water,f=Math.max(.02,W.tank/tankCap(s));tower.visible=!!s.unlocked.borehole;if(tower.visible){const fl=tower.userData.fill;fl.scale.y=1.5*f;fl.position.y=2.25+.75*f;const tg=tower.userData.tag;tg.visible=f<.4||W.drought>0;pill(tg,`${W.drought>0?'☀️ ':''}💧 ${Math.round(f*100)} %`,f<.15?{bg:'#e8483aee',fg:'#fff'}:f<.4||W.drought>0?{bg:'#f6b94aee'}:{});}
   const L=W.leak;puddles.forEach((m,i)=>{m.visible=!!L;if(L){const d=[8,6.2,4.5,3,1.6][i];m.position.x=L.x+Math.cos(L.a)*d;m.position.z=L.z+Math.sin(L.a)*d;}});
   leakM.visible=!!L&&(L.found||Math.hypot(s.player.x-L.x,s.player.z-L.z)<3.5);if(leakM.visible){leakM.position.set(L.x,0,L.z);leakM.children.forEach(d=>{if(d.userData.i!=null){const u=(time*1.4+d.userData.i/8)%1;d.position.set(Math.sin(d.userData.i*2)*u*.5,.5+Math.sin(u*Math.PI)*1,Math.cos(d.userData.i*2)*u*.5);}});pill(leakM.userData.tag,`💧 fuite ${Math.round(L.fix/(REPAIR+.5)*100)} %`,{bg:'#e8483aee',fg:'#fff'});}
   transfo.children.forEach((m,i)=>m.visible=Math.floor(i/2)<=lvlOf(s,'transfo')-1&&lvlOf(s,'transfo')>0);panels.forEach((m,i)=>m.visible=i<2*lvlOf(s,'solar'));}
  // Leisure services.
  for(const k of Object.keys(svc))svc[k].visible=!!s.unlocked[k];
  if(s.unlocked.laundry)svc.laundry.userData.win.forEach((w,i)=>w.material=mat(s.svc.machines[i]?(Math.sin(time*10+i)>0?'#ffe08a':'#ffb347'):'#7fb7d9'));
  if(s.unlocked.wifi){const down=s.event?.kind==='wifi',u=svc.wifi.userData;u.led.material=mat(down?'#e8483a':'#4fbf5a');u.tag.visible=down;if(down)pill(u.tag,'📶 en panne',{bg:'#e8483aee',fg:'#fff'});}
  if(s.unlocked.bikes){const u=svc.bikes.userData;u.bikes.forEach((b,i)=>b.visible=i<s.svc.bikes);u.boards.forEach((b,i)=>b.visible=i<s.svc.paddles);u.tag.visible=s.svc.bikes+s.svc.paddles===0;pill(u.tag,'🚲 tout est loué',{bg:'#f6b94aee'});}
  if(s.unlocked.shuttle){const Z=s.svc.shuttle,u=svc.shuttle.userData;u.bus.visible=Z.state==='wait';u.tag.visible=Z.state!=='idle';if(Z.state==='wait')pill(u.tag,`🚌 départ dans ${Math.ceil(Z.t)} s`,{bg:'#f6c945ee'});else if(Z.state==='away')pill(u.tag,`🏖️ retour dans ${Math.ceil(Z.t)} s`,{});}
  // Reception, office, shop.
  recTerm.visible=!!s.unlocked.terminal;shopTerm.visible=!!s.unlocked.terminal&&!!s.unlocked.shop;stackOf(recPile,cashList(s.piles[0]),{cols:2,rows:3,step:.5,dstep:.3});stackOf(shopPile,cashList(s.piles[1]),{cols:2,rows:3,step:.5,dstep:.3});shopPile.visible=!!s.unlocked.shop;
  const waiting=s.campers.filter(c=>c.phase==='queue').length;recTag.visible=waiting>0;if(waiting)pill(recTag,`🛎️ ${waiting} à l’accueil`,s.posts.reception?{}:{bg:'#f6b94aee'});
  const nb=s.bills.length,late=s.bills.some(b=>b.late);while(papers.children.length>nb)papers.remove(papers.children[papers.children.length-1]);while(papers.children.length<Math.min(nb,12)){const m=box(papers,.42,.012,.3,0,papers.children.length*.014,0,'#ffffff',false);m.rotation.y=(papers.children.length%3-1)*.15;}
  papers.children.forEach(m=>m.material=mat(late?'#ffd6d1':'#ffffff'));deskTag.visible=nb>0;pill(deskTag,nb?`🧾 ${nb} facture${nb>1?'s':''} · ${billsDue(s)} $`:'🧾 Bureau · à jour',late?{bg:'#e8483aee',fg:'#fff'}:nb?{bg:'#f6b94aee'}:{});
  shop.visible=!!s.unlocked.shop;
  for(const [k,v] of Object.entries(shelves)){const open=shelfOpen(s,k);v.g.visible=open;v.pad.visible=v.ic.visible=open;if(!open)continue;stackOf(v.st,repeat(k,s.shop[k]),{cols:4,rows:2,step:.3,dstep:.3,max:16});v.tag.visible=s.shop[k]===0;if(!s.shop[k])pill(v.tag,`${ICON[k]} vide`,{bg:'#f6b94aee'});}
  {const kinds=RACK_KINDS.filter(k=>shelfOpen(s,k));rack.visible=!!s.unlocked.shop;if(rack.visible){stackOf(rackSt,kinds.flatMap(k=>repeat(k,s.shop[k])),{cols:6,rows:2,step:.26,dstep:.3,max:24});const gone=kinds.filter(k=>s.shop[k]===0);rackTag.visible=gone.length>0;if(gone.length)pill(rackTag,`${gone.map(k=>ICON[k]).join(' ')} vide`,{bg:'#f6b94aee'});}}
  bakery.visible=!!s.unlocked.bakery;if(bakery.visible){const O=s.oven;stackOf(bakery.userData.in,repeat('dough',O.in),{cols:3,rows:3,step:.32,dstep:.32,max:18});stackOf(bakery.userData.out,repeat('bread',O.out),{cols:3,rows:3,step:.32,dstep:.32,max:18});
   bakery.userData.glow.material.emissiveIntensity=O.working?.5+.5*Math.sin(time*9):.05;const tg=bakery.userData.tag;tg.visible=O.in>0||O.out>0;if(tg.visible)pill(tg,O.working?`🔥 cuit ${Math.round(O.timer/OVEN.time*100)} % · ${O.in} → ${O.out}`:`🍞 ${O.in} · 🥖 ${O.out}`,O.working?{bg:'#ffb070ee'}:{});}
  for(const [k,v] of Object.entries(sources)){const open=sourceOpen(s,k);v.g.visible=open;if(!open)continue;const n=s.sources[k].n;stackOf(v.st,repeat(SOURCES[k].item,n),{cols:4,rows:3,step:.34,dstep:.3,max:24});
   v.tag.visible=n===0;if(n===0)pill(v.tag,`${ICON[SOURCES[k].item]} épuisé`,{bg:'#f6b94aee'});}
  // Toilet block.
  const nc=cabins(s),inside=s.campers.filter(c=>c.act?.kind==='wc'&&c.act.step===1).length;doors.forEach((d,i)=>{d.d.visible=d.lamp.visible=i<nc;d.d.position.x=d.lamp.position.x=(i-(nc-1)/2)*.54;d.lamp.material=mat(i<inside?'#e8483a':'#4fbf5a');});
  const cap=sanitCap(s),pp=s.sanit.paper;pill(paperTag,`🧻 ${Math.round(pp)}/${cap}`,pp<2?{bg:'#e8483aee',fg:'#fff'}:pp<4?{bg:'#f6b94aee'}:{});
  dirtPlane.material.opacity=Math.min(.7,s.sanit.dirt*.8);mopTag.visible=s.sanit.dirt>.35;pill(mopTag,s.sanit.dirt>.7?'🤢 sale !':'🧽 à nettoyer',s.sanit.dirt>.7?{bg:'#e8483aee',fg:'#fff'}:s.sanit.dirt>.35?{bg:'#f6b94aee'}:{});
  stackOf(dumpPile,repeat('trash',Math.min(s.dump,9)),{cols:3,rows:2,step:.5,dstep:.4});dumpTag.visible=s.dump>0;pill(dumpTag,`🗑️ ${s.dump}/${dumpCap(s)}`,s.dump>=dumpCap(s)?{bg:'#e8483aee',fg:'#fff'}:{});
  elec.visible=!!s.unlocked.caravan;{const r=s.power.load/Math.max(1,s.power.cap),trip=s.event?.kind==='disj';elecTag.visible=trip||r>.85;pill(elecTag,trip?'⚡ SAUTÉ':`⚡ ${Math.round(r*100)} %`,trip?{bg:'#e8483aee',fg:'#fff'}:{bg:'#f6b94aee'});}
  // Pool and stage.
  pool.visible=!!s.unlocked.pool;if(pool.visible){const ch=s.pool.chlor,col=ch<.25?'#7fa84a':ch<.5?'#5fc0c0':'#43b5e8';pool.userData.water.material.color.set(col);poolTag.visible=ch<.7;pill(poolTag,`🧪 ${Math.round(ch*100)} %`,ch<.25?{bg:'#e8483aee',fg:'#fff'}:ch<.5?{bg:'#f6b94aee'}:{});
   const du=s.event?.kind==='ducks';ducks.forEach((d,i)=>{d.visible=du;if(du){d.position.set((POOL.x0+POOL.x1)/2+Math.sin(time*.7+i*1.7)*2.2,.3,(POOL.z0+POOL.z1)/2+Math.cos(time*.55+i*2.3)*1.2);d.rotation.y=time*.7+i;}});}
  stage.visible=!!s.unlocked.stage;stageTag.visible=stage.visible;if(stage.visible){const S=s.show,on=S.state==='on';spots.forEach((l,i)=>l.material.emissiveIntensity=on?.6+.5*Math.sin(time*6+i*2):.1);
   stageTag.visible=S.state!=='idle';if(S.state==='call')pill(stageTag,`🎤 ${SHOWS[S.kind]} : montez sur scène !`,{bg:'#f6c945ee'});else if(on)pill(stageTag,`🎉 ${SHOWS[S.kind]} · ${Math.ceil(S.t)} s`,{bg:'#b06ae8ee',fg:'#fff'});}
  // Event markers.
  const ev=s.event;markers.forEach((m,i)=>{const sp=ev?.spots[i];m.g.visible=!!sp&&sp.fix<REPAIR;if(!m.g.visible)return;m.g.position.set(sp.x,0,sp.z);pill(m.t,`${ev.label.split(' ')[0]} ${Math.round(sp.fix/REPAIR*100)} %`,{bg:'#e8483aee',fg:'#fff'});m.g.children[0].material=mat(Math.sin(time*8)>0?'#e8483a':'#f6c945');});
  // Tiles.
  const shown=visibleUnlocks(s);for(const u of shown){let g=tiles.get(u.key);if(!g){g=tile(u);tiles.set(u.key,g);}g.userData.draw(s.paid[u.key]??0,holdOf(s,u.key));}if(shown!==shownTiles){shownTiles=shown;const keys=new Set(shown.map(u=>u.key));for(const [k,g] of tiles)if(!keys.has(k)){drop(g);tiles.delete(k);}}
  // Campers.
  const seen=new Set();for(const c of s.campers){seen.add(c.id);let g=campers.get(c.id);if(!g){g=person(CAMP[c.look%CAMP.length]);const b=sprite(1.9,.5);b.position.set(0,2.05,0);g.add(b);g.userData.bubble=b;campers.set(c.id,g);}
   animate(g,c,time);if(c.swim)g.position.y=-.5;g.rotation.x=c.lying?-1.5:0;if(c.lying)g.position.y=.42;const A=c.act,q=c.phase==='queue';let text='',style={};
   if(q){const f=c.wait/PATIENCE;text=c.blocked?'🗑️ emplacement sale…':`${c.card&&s.unlocked.terminal?'💳':'💵'} ${c.nights} nuit${c.nights>1?'s':''}`;style=f<.4?{}:f<.7?{bg:'#f6b94aee'}:{bg:'#e8483aee',fg:'#fff'};}
   else if(A?.kind==='wc')text=A.step===1?'🚿':'🚽';else if(A?.kind==='shop')text=`${A.k==='bread'?'🥖':'🍦'} ${Math.max(0,A.n-A.got)}`;else if(A?.kind==='pool')text='🏊';else if(A?.kind==='show')text='🎉';else if(c.in&&!A)text=MOODFACE(c.mood);
   g.userData.bubble.visible=!!text;if(text)pill(g.userData.bubble,text,style);g.visible=!c.sleep&&!c.away;}
  for(const [id,g] of campers)if(!seen.has(id)){drop(g);campers.delete(id);}
  for(const p of s.popups){let g=popups.get(p.id);if(!g){g=sprite(1.8,.55);scene.add(g);pill(g,p.text,{...(POP[p.kind]??POP.money),size:.55});popups.set(p.id,g);}g.position.set(p.x,2+p.t*1.6,p.z);g.material.opacity=1-p.t/1.6;}
  for(const [id,g] of popups)if(!s.popups.some(p=>p.id===id)){drop(g);popups.delete(id);}
  let me=s.player;hostTag.visible=s.guests.length>0;if(hostTag.visible)pill(hostTag,focus==null?'Vous':s.player.name||'Hôte',focus==null?{bg:'#ffe08aee'}:{});
  for(const a of s.guests){let g=guests.get(a.id);if(!g){const [c,h]=GUEST_LOOK[a.look%GUEST_LOOK.length];g=person(c,{hat:h});g.userData.tag=nameTag(g);guests.set(a.id,g);}
   if(a.id===focus)me=a;animate(g,a,time);pill(g.userData.tag,a.id===focus?'Vous':a.name,a.id===focus?{bg:'#ffe08aee'}:{});stackOf(g.userData.back,a.carry,carryLayout(a.carry.length));}
  if(guests.size>s.guests.length)for(const [id,g] of guests)if(!s.guests.some(a=>a.id===id)){drop(g);guests.delete(id);}
  // Camera follows this screen's player from the front-top, like a tabletop diorama.
  const px=me.x,pz=me.z,cx=camera.userData.x??px,cz=camera.userData.z??pz,nx=cx+(px-cx)*Math.min(1,dt*4),nz=cz+(pz-cz)*Math.min(1,dt*4);camera.userData.x=nx;camera.userData.z=nz;camera.position.set(nx+6,20,nz+15);camera.lookAt(nx,0,nz-1);sun.position.set(nx-10,30,nz+12);sun.target.position.set(nx,0,nz);}
 const TYPESICON=c=>({hiker:'🎒',family:'👨‍👩‍👧',youth:'🎸',retired:'🧓',couple:'💑',beaufrere:'🧔',mamie:'👵'})[c.type]??'⛺';
 function resize(){const r=canvas.getBoundingClientRect(),aspect=r.width/Math.max(1,r.height),half=aspect<1?(r.width<500?8.6:10):(r.height<500?6.6:8.5);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();renderer.setSize(r.width,r.height,false);}
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 return {three:scene,camera,setShowMissions(v){showMissions=!!v;},setFocus(id){focus=id??null;},update(dt){sync(dt);renderer.render(scene,camera);},reset(){for(const m of [campers,helpers,popups,tiles,guests])for(const [id,g] of m){drop(g);m.delete(id);}shownTiles=null;for(const v of pitches){v.made=null;}}};}
