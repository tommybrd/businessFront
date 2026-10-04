import {createShelfFurniture} from './shelf-furniture.js';
import {createRobotFleet} from './robot-scene.js';
import {humanRestockers} from './restock-robots.js';
import {checkoutStatus} from './checkout-flow.js';
import {walkingPath} from './walking-route.js';
import {autoCheckoutCount,autoCheckoutLane,autoCheckoutIndex,isAutoCheckoutLane} from './store-layout.js';
import { reservePlacement, shelfPlacement, checkoutPlacement, checkoutPoint, cashierPoint, reserveBackExtension, RESERVE_BACK_EXTENSION, SHELF_MODULE_CAPACITY } from './store-layout.js';
import { customerPosition } from './customer-motion.js';
import { createOnlineScene } from './online-scene.js';
import { onlineWorkerPosition, onlinePicked } from './online-orders.js';
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { receiverHome,RESTOCK_EQUIPMENT, SHELF_UNITS_PER_LEVEL, SHELF_INITIAL_LEVELS, restockerPosition, checkoutCount, activeCheckoutLanes, reserveProductPosition, shelfPosition, shelfRotation, shelfFixtureId, productShelfAccess, storeFrontExtension } from './engine.js';
import { createCheckoutVisuals } from './checkout-visuals.js';
import { createKeyboardCameraControls } from './camera-controls.js';
import { createDeliveryYard } from './delivery-scene.js';
import { productUnit, shelfStock, stockCarton, staffOutfit, createSurroundings } from './scene-details.js';

const COLORS = { green: 0x285c46, floor: 0xeef2e9, wall: 0xc9d6c8, steel: 0x859287 };

export function createStoreScene(canvas, state, onSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x95a780);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-16, 16, 10.88, -10.88, 0.1, 100);
  camera.position.set(21, 27, 32); camera.lookAt(0, 0, 3);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 3); controls.enableDamping = true; controls.dampingFactor = 0.1;
  controls.minZoom = 0.6; controls.maxZoom = 3.5;
  controls.minPolarAngle = Math.PI / 5; controls.maxPolarAngle = Math.PI / 2.6;
  controls.enablePan = true; controls.screenSpacePanning = false;
  const keyboardCamera = createKeyboardCameraControls(camera, controls);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa3b59e, 2.4));
  const sun = new THREE.DirectionalLight(0xfff8e9, 3.2);
  sun.position.set(-12, 25, 14); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32; sun.shadow.normalBias = 0.04;
  scene.add(sun);
  const materials = new Map();
  const material = color => { if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.03 })); return materials.get(color); };
  function box(parent, w, h, d, x, y, z, color, shadow = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
    mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function textSprite(text, { color = '#294738', background = '#fffffff0', width = 512, height = 96, size = 34, worldWidth = 3.8 } = {}) {
    const surface = document.createElement('canvas'); surface.width = width; surface.height = height;
    const context = surface.getContext('2d');
    context.fillStyle = background; context.beginPath(); context.roundRect(0, 0, width, height, 14); context.fill();
    context.fillStyle = color; context.font = `600 ${size}px system-ui, sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, width / 2, height / 2, width - 20);
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(worldWidth, worldWidth * height / width, 1); return sprite;
  }
  function replaceText(group, key, text, x, y, z, options) {
    if (group.userData[key]?.userData.text === text) return;
    const previous = group.userData[key];
    if (previous) { group.remove(previous); previous.material.map.dispose(); previous.material.dispose(); }
    const sprite = textSprite(text, options); sprite.userData.text = text; sprite.position.set(x, y, z);
    group.add(sprite); group.userData[key] = sprite;
  }
  function plaque(text, worldWidth = 3) {
    const sprite = textSprite(text, { worldWidth, size: 34, background: '#203a32f2', color: '#eef2e3' });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldWidth, worldWidth * 96 / 512), new THREE.MeshBasicMaterial({ map: sprite.material.map, transparent: true, side: THREE.DoubleSide }));
    sprite.material.dispose(); return mesh;
  }
  const checkoutVisuals = createCheckoutVisuals(scene, state, { box, material, textSprite });
  const onlineScene = createOnlineScene(scene,state,{box,material,textSprite});
  const robotFleet = createRobotFleet(scene,{box,material});
  const surroundings = createSurroundings(scene, box, material, textSprite);
  const store = new THREE.Group(); scene.add(store);
  const foundation = box(store, 24, 0.45, 17, 0, -0.26, 0, 0xb2c1ac);
  const floor = box(store, 22.8, 0.08, 15.8, 0, 0, 0, COLORS.floor);
  const warehouseFloor = box(store, 22.8, 0.1, 11.6, 0, 0.07, -9.9, 0xc7d5c1);
  warehouseFloor.userData.selection = { view: 'reserve' };
  const backWall = box(store, 10.7, 1.75, 0.22, -6.05, 0.9, -7.9, COLORS.wall);
  const leftWall = box(store, 0.22, 1.75, 15.8, -11.4, 0.9, 0, COLORS.wall);
  // Cutaway walls preserve the director's view into the shop.
  const rightWall = box(store, 0.2, 0.28, 15.8, 11.4, 0.18, 0, 0xc7d4c3);
  box(store, 8.8, 0.8, 0.2, -6.5, 0.45, -4.1, 0xd2ddca);
  box(store, 8.8, 0.8, 0.2, 6.5, 0.45, -4.1, 0xd2ddca);
  const reserve = new THREE.Group(), dock = new THREE.Group(); store.add(reserve, dock);
  reserve.userData.selection = { view: 'reserve' }; dock.userData.selection = { view: 'fournisseurs' };
  const reserveZones = state.products.flatMap((product, i) => Array.from({ length: 3 }, (_, ordinal) => {
    const group = new THREE.Group(), [x, z] = reserveProductPosition(i, ordinal); group.name = `reserve-rack-${product.id}-${ordinal}`; group.position.set(x, 0, z);
    group.userData.selection = { view: 'reserve', productId: product.id, fixtureId:`reserve:${i}:${ordinal}` };
    box(group, 3.05, 0.025, 1.4, 0, 0.15, 0, product.color, false);
    const posts = [];
    for (const x of [-1.48, 1.48]) for (const z of [-.65, .65]) posts.push(box(group, .1, 2.65, .1, x, 1.46, z, 0x627d65));
    const boards = Array.from({ length: 5 }, (_, level) => {
      const y = .3 + level * .8;
      return [box(group, 2.95, .08, 1.4, 0, y, 0, 0x9ba98d), box(group, 2.95, .12, .06, 0, y, .72, 0xd3ad5e)];
    });
    const crates = [];
    for (let n = 0; n < 90; n++) {
      const slot = Math.floor(n / 5), level = n % 5;
      crates.push(stockCarton(group, box, -1.2 + (slot % 6) * .48, .56 + level * .8, .42 - Math.floor(slot / 6) * .42, product.color));
      crates.at(-1).userData.level = level;
    }
    const sign = plaque(product.short, 2.3); sign.position.set(0, .27, .75); group.add(sign);
    reserve.add(group); return { group, crates, boards, posts, index: i, ordinal };
  }));
  const deliveryYard = createDeliveryYard(scene, state, box, material, plaque);
  const fixtures = Array.from({ length: 66 }, (_, id) => {
    const group=new THREE.Group();group.name=`shelf-module-fixture-${id}`;
    group.userData.selection={view:'rayons'};group.userData.fixture=id>=6&&id<12?'double-sided':'standalone';
    store.add(group);return group;
  });
  function createShelf(product, index, slot) {
    const group = new THREE.Group(), [x, z] = shelfPosition(slot); group.name = `shelf-slot-${slot}`; group.position.set(x, 0, z); group.rotation.y = shelfRotation(slot); fixtures[shelfFixtureId(slot)].add(group);
    group.userData.selection = { view: 'rayons', productId: product.id, fixtureId:`shelf:${slot}` };
    const furniture=createShelfFurniture(group,product,{box,material});
    const units=shelfStock(product,SHELF_UNITS_PER_LEVEL*SHELF_INITIAL_LEVELS,furniture.unitsPerLevel,group,box,material,furniture.layout);
    const selection = box(group, 1.95, .015, 2.05, 0, .1, 0, 0xc6e49f, false); selection.visible = false;
    box(group, 1.65, .09, .04, 0, .31, .95, 0x4c6252);
    const stockBar = box(group, 1.65, .09, .05, 0, .31, .98, product.color, false);
    const sign = plaque(product.short, 1.5); sign.position.set(0,furniture.signY,furniture.signZ); group.add(sign);
    return {group,units,selection,stockBar,index,slot,furniture,productId:product.id};
  }
  const shelves = [];
  const emptyShelves = Array.from({ length: 72 }, (_, slot) => {
    const group = new THREE.Group(), [x, z] = shelfPosition(slot); group.position.set(x, 0, z); group.name = `shelf-empty-${slot}`;
    group.rotation.y = shelfRotation(slot); group.userData.selection = { view: 'rayons' }; store.add(group);
    box(group, 1.8, .015, 1.45, 0, .08, 0, 0xc3cfc2, false);
    return group;
  });
  const checkouts = [];
  const laneX = (i, lanes) => (i - (lanes - 1) / 2) * (lanes <= 4 ? 4 : 3);
  for (let i = 0; i < 8; i++) {
    const group = new THREE.Group(); group.position.set(-6.5 + i * 4, 0, 6); store.add(group);
    group.name = `checkout-${i}`; group.rotation.y = -Math.PI / 2;
    group.userData.selection = { view: 'caisses', fixtureId:`checkout:${i}` };
    box(group, 2.2, 0.9, 1, 0, 0.5, 0, 0x82a98c);
    box(group, 1.3, 0.1, 1.08, -0.4, 1, 0, 0x365647);
    box(group, 0.15, 0.38, 0.15, 0.77, 1.15, 0, COLORS.steel);
    box(group, 0.46, 0.32, 0.08, 0.77, 1.4, 0.02, 0x213e36);
    const light = box(group, 0.23, 0.23, 0.23, 0.83, 1.72, 0, 0xe56850, false);
    checkouts.push({ group, light, effects: checkoutVisuals.station(group) });
  }
  const automaticCheckouts=Array.from({length:8},(_,i)=>{
    const group=new THREE.Group();store.add(group);group.rotation.y=-Math.PI/2;
    group.name=`checkout-${autoCheckoutLane(i)}`;group.userData.selection={view:'caisses',fixtureId:autoCheckoutLane(i)};
    box(group,.95,.9,.75,0,.5,0,0x90b877);
    box(group,.68,.4,.1,0,1.14,0,0x244b3c);
    box(group,.06,.5,.06,.38,1.55,0,COLORS.steel);
    const light=box(group,.18,.18,.18,.38,1.85,0,0xe56850,false);
    return {group,light,effects:checkoutVisuals.station(group,true)};
  });
  const signalColor=lane=>({available:0xb8ee81,busy:0xf5c64f,unavailable:0xe56850}[checkoutStatus(state,lane)]);
  const gates=new THREE.Group();gates.name='entrance-exit-gates';store.add(gates);
  for(const x of [6.5,8.15,10.35]) {
    for(const z of [8.25,9.6])box(gates,.1,.95,.1,x,.5,z,COLORS.steel);
    box(gates,.06,.08,1.35,x,.95,8.925,COLORS.green);
  }
  for(const [x,color,direction] of [[9.5,0x719c67,-1],[7.3,0x87a9aa,1]]){
    box(gates,.15,1,.15,x-.65,.52,8.65,COLORS.steel);
    const gate=box(gates,1.15,.08,.08,x-.05,.8,8.65,color);gate.rotation.y=direction*.62;
  }
  const reserveAisles=new THREE.Group();reserveAisles.name='reserve-circulation';store.add(reserveAisles);
  for(const z of [-5.4,-9.5,-13.7])for(let x=-10.8;x<11.8;x+=.65)box(reserveAisles,.32,.014,.08,x,.14,z,0xe1c77a,false);
  function person(color, staff = false, carryMode='cart') {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 3, 8), material(color)); body.position.y = 0.72; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), material(0xe5b992)); head.position.y = 1.13; head.castShadow = true; group.add(head);
    const legs = [-0.09, 0.09].map(x => box(group, 0.13, 0.34, 0.14, x, 0.25, 0, 0x3b4841));
    const arms = [-0.23, 0.23].map(x => box(group, 0.1, 0.28, 0.1, x, 0.72, 0.03, color));
    let cap, cartContents;
    if (staff) { cap = box(group, 0.25, 0.06, 0.26, 0, 1.27, 0.02, COLORS.green); box(group, 0.06, 0.08, 0.02, -0.08, 0.85, 0.18, 0xd3f1ab); }
    else if(carryMode==='bag') {
      const bag=new THREE.Group();bag.name='customer-shopping-bag';bag.position.set(.35,0,.1);group.add(bag);
      box(bag,.36,.4,.26,0,.52,0,0xbea078);box(bag,.29,.03,.21,0,.73,0,0x74654e);
      for(const x of [-.12,.12]){const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.018,4,12),material(0xb49a72));handle.position.set(x,.79,0);handle.rotation.y=Math.PI/2;bag.add(handle);}
      cartContents=new THREE.Group();cartContents.name='customer-bag-contents';bag.add(cartContents);
    }
    else {
      const cart = new THREE.Group(); cart.position.set(0, 0, 0.56); group.add(cart);
      cart.name = carryMode==='mini'?'customer-mini-cart':'customer-cart';
      if(carryMode==='mini'){cart.scale.set(.75,.85,.8);cart.position.z=.45;}
      box(cart, .56, .04, .65, 0, .44, 0, 0x9ba99b);
      for (const x of [-.27, .27]) {
        box(cart, .025, .035, .65, x, .81, 0, COLORS.steel);
        for (let z = -.3; z <= .3; z += .15) box(cart, .018, .37, .018, x, .62, z, COLORS.steel);
      }
      for (const z of [-.31, .31]) {
        box(cart, .56, .035, .025, 0, .81, z, COLORS.steel);
        for (let x = -.27; x <= .28; x += .135) box(cart, .018, .37, .018, x, .62, z, COLORS.steel);
      }
      box(cart, .56, .035, .04, 0, .83, -.34, COLORS.green);
      for (const x of [-.23, .23]) for (const z of [-.27, .27]) {
        const wheel = new THREE.Mesh(new THREE.SphereGeometry(.065, 6, 4), material(0x465245)); wheel.position.set(x, .24, z); cart.add(wheel);
      }
      cartContents = new THREE.Group(); cartContents.name = 'customer-cart-contents'; cart.add(cartContents);

    }
    return { group, body, legs, arms, cap, cartContents, carryMode, basketKey: null, route: [], key: '', walk: 0 };
  }
  function updateCustomerCart(actor, customer) {
    if (!actor.cartContents) return;
    if (customer.stage !== 'checkout' || customer.paid) actor.cartContents.children.forEach(unit => { unit.visible = true; });
    const key = JSON.stringify(customer.basket);
    if (actor.basketKey === key) return;
    actor.basketKey = key;
    for (const unit of [...actor.cartContents.children]) {
      actor.cartContents.remove(unit); unit.traverse(object => object.geometry?.dispose());
    }
    let count = 0;
    for (const item of customer.basket) for (let n = 0; n < item.quantity; n++) {
      const unit = productUnit(state.products[item.index], count, box, material); unit.scale.setScalar(actor.carryMode==='bag'?.42:.65);
      unit.position.set((count % 3 - 1) * .17, .48 + Math.floor(count / 12) * .19, .225 - Math.floor((count % 12) / 3) * .15);
      if(actor.carryMode==='bag')unit.position.set((count%2-.5)*.13,.72+Math.floor(count/4)*.12,(Math.floor(count%4/2)-.5)*.12);
      unit.userData.productId = state.products[item.index].id; actor.cartContents.add(unit); count++;
    }
    actor.cartContents.userData.articleCount = count;
    actor.cartContents.userData.filled = count > 0;
  }
  function restockVehicle(mode) {
    const group = new THREE.Group(), pallet = mode === 'pallet';
    const w = mode === 'small' ? 0.58 : mode === 'medium' ? 0.82 : mode==='hyper'?1.2:1.05, d = mode === 'small' ? 0.62 : mode === 'medium' ? 0.9 : mode==='hyper'?1.4:1.1;
    let palletBase = null;
    group.position.z = mode === 'small' ? 0.67 : 1;
    if (pallet) {
      for (const x of [-0.3, 0.3]) box(group, 0.17, 0.1, 1.35, x, 0.2, 0.1, 0xd59b38);
      box(group, 0.6, 0.28, 0.3, 0, 0.34, -0.6, 0xd59b38);
      box(group, 0.07, 0.68, 0.07, 0, 0.78, -0.67, COLORS.steel);
      box(group, 0.5, 0.06, 0.06, 0, 1.1, -0.67, 0x365546);
      palletBase = box(group, w, 0.12, d, 0, 0.35, 0, 0xb29267);
    } else {
      box(group, w, 0.12, d, 0, 0.35, 0, 0x55796d);
      for (const x of [-w / 2, w / 2]) {
        box(group, 0.035, 0.48, d, x, 0.64, 0, COLORS.steel);
        box(group, 0.035, 0.17, 0.035, x, 0.9, -d / 2, COLORS.steel);
      }
      box(group, w, 0.07, 0.05, 0, 1, -d / 2, mode === 'small' ? 0x528875 : 0x547aaf);
      box(group, w, 0.32, 0.035, 0, 0.57, d / 2, COLORS.steel);
    }
    const wheels = [];
    for (const x of [-w / 2 + 0.08, w / 2 - 0.08]) for (const z of [-d / 2 + 0.08, d / 2 - 0.08]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 8), material(0x36483d));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x, 0.22, z); group.add(wheel); wheels.push(wheel);
    }
    const cargo = [];
    for (let i = 0; i < (pallet?20:mode==='hyper'?12:8); i++) cargo.push(pallet
      ? stockCarton(group, box, i % 2 ? .25 : -.25, .62 + Math.floor(i/4)*.43, i % 4 < 2 ? -.21 : .21, 0xc8ab77)
      : box(group, w * .38, .23, d * .36, (i % 2 ? 1 : -1) * w * .23, .54 + Math.floor(i / 4) * .24, (i % 4 < 2 ? -1 : 1) * d * .23, 0xc8ab77));
    return { group, cargo, wheels, mode, palletBase };
  }
  function displayRestocker(actor, worker, running, seconds, minuteFraction) {
    const mode = worker.phase === 'idle' ? state.restockMode : worker.mode;
    if (!actor.equipment || actor.equipment.mode !== mode) {
      if (actor.equipment) { actor.group.remove(actor.equipment.group); actor.equipment.group.traverse(object => { if (object.geometry) object.geometry.dispose(); }); }
      actor.equipment = restockVehicle(mode); actor.group.add(actor.equipment.group);
    }
    actor.equipment.group.visible = true;
    const position = restockerPosition(worker, minuteFraction), old = actor.group.position;
    const dx = position[0] - old.x, dz = position[1] - old.z;
    const moving = running > 0 && ['collecting','approaching', 'outbound', 'returning'].includes(worker.phase);
    if (moving && Math.hypot(dx, dz) > 0.001) actor.group.rotation.y = Math.atan2(dx, dz);
    else if (worker.phase === 'stocking') {
      const index = state.products.findIndex(product => product.id === worker.productId);
      const slots=state.shelfLayout.map((id,slot)=>id===worker.productId?slot:-1).filter(slot=>slot>=0);actor.group.rotation.y=shelfPlacement(state,slots[worker.completed%slots.length]).rotation+Math.PI;
    }
    else if (worker.phase === 'loading') actor.group.rotation.y = reservePlacement(state,state.products.findIndex(p=>p.id===worker.productId),worker.reserveRack||0).rotation+Math.PI;
    else if (worker.phase === 'idle') actor.group.rotation.y = Math.PI / 2;
    old.set(position[0], 0.09, position[1]);
    if (moving) actor.walk += seconds * running * 6;
    const stride = moving ? Math.sin(actor.walk) * 0.35 : 0;
    actor.legs[0].rotation.x = stride; actor.legs[1].rotation.x = -stride;
    actor.arms.forEach(arm => { arm.rotation.x = -0.65; });
    const product = state.products.find(p => p.id === worker.productId);
    const cargo=worker.cargo?.filter(l=>l.quantity>0)||[{productId:worker.productId,quantity:worker.load}];
    const cartons=cargo.flatMap(line=>Array.from({length:Math.ceil(line.quantity/12)},()=>line.productId));
    const filled=Math.ceil(worker.load/RESTOCK_EQUIPMENT[mode].capacity*actor.equipment.cargo.length);
    actor.equipment.group.userData.articleCount=worker.load;
    actor.equipment.cargo.forEach((crate,i)=>{crate.visible=i<filled;const id=cartons[Math.min(cartons.length-1,Math.floor(i/Math.max(1,filled)*cartons.length))];crate.material=material(state.products.find(p=>p.id===id)?.color||0xc8ab77);});
    if (moving) actor.equipment.wheels.forEach(wheel => { wheel.rotation.x += seconds * running * 8; });
  }
  function displayOnlineWorker(actor,worker,running,seconds,fraction) {
    if(!actor.equipment||actor.equipment.mode!=='small') {
      if(actor.equipment){actor.group.remove(actor.equipment.group);actor.equipment.group.traverse(o=>o.geometry?.dispose());}
      actor.equipment=restockVehicle('small');actor.group.add(actor.equipment.group);
    }
    if(!actor.onlineCargo || actor.onlineCargo.parent !== actor.equipment.group){actor.onlineCargo=new THREE.Group();actor.equipment.group.add(actor.onlineCargo);actor.onlineCargoKey='';}
    actor.onlineCargo.visible=true;
    actor.equipment.cargo.forEach(c=>{c.visible=false;});
    const order=state.online.orders.find(o=>o.id===worker.orderId);
    const contents=order&&worker.load?order.lines.map(l=>[l.productId,l.pickedreserve+l.pickedshelf]):[];
    const key=JSON.stringify(contents);
    if(actor.onlineCargoKey!==key){actor.onlineCargoKey=key;for(const unit of [...actor.onlineCargo.children]){actor.onlineCargo.remove(unit);unit.traverse(o=>o.geometry?.dispose());}let count=0;
      for(const[id,qty]of contents)for(let i=0;i<qty;i++){const unit=productUnit(state.products.find(p=>p.id===id),count,box,material);unit.scale.setScalar(.5);unit.position.set((count%3-1)*.16,.48+Math.floor(count/9)*.16,(Math.floor(count%9/3)-1)*.16);actor.onlineCargo.add(unit);count++;}
      actor.onlineCargo.userData.articleCount=count;
    }
    const position=onlineWorkerPosition(worker,fraction),old=actor.group.position,dx=position[0]-old.x,dz=position[1]-old.z;
    const moving=running>0&&['travelling','returning','toDrive','backFromDrive'].includes(worker.phase);
    if(moving&&Math.hypot(dx,dz)>.001)actor.group.rotation.y=Math.atan2(dx,dz);
    else if(worker.phase==='picking')actor.group.rotation.y=worker.source==='reserve'?-Math.PI/2:Math.PI;
    old.set(position[0],.09,position[1]);if(moving)actor.walk+=seconds*running*6;
    const stride=moving?Math.sin(actor.walk)*.35:0;actor.legs[0].rotation.x=stride;actor.legs[1].rotation.x=-stride;
    actor.arms.forEach((arm,i)=>{arm.rotation.x=worker.phase==='picking'||worker.phase==='packing'?-.8+(running?Math.sin(performance.now()/180+i)*.2:0):-.6;});
    actor.equipment.group.visible=worker.phase!=='idle';actor.group.userData.selection={view:'online',role:'online'};
  }
  function displayReceiver(actor, worker, running, seconds, minuteFraction) {
    if (!actor.equipment || actor.equipment.mode !== 'pallet') {
      if (actor.equipment) { actor.group.remove(actor.equipment.group); actor.equipment.group.traverse(o => o.geometry?.dispose()); }
      actor.equipment = restockVehicle('pallet'); actor.group.add(actor.equipment.group);
    }
    actor.equipment.group.visible = true;
    const position = worker.phase==='idle'?receiverHome(state,worker):restockerPosition(worker, minuteFraction), old = actor.group.position;
    const dx = position[0] - old.x, dz = position[1] - old.z, moving = running > 0 && ['collecting','approaching', 'outbound', 'returning'].includes(worker.phase);
    if (moving && Math.hypot(dx, dz) > 0.001) actor.group.rotation.y = Math.atan2(dx, dz);
    else if (worker.phase === 'storing') actor.group.rotation.y = worker.toOutside?Math.PI:reservePlacement(state,state.products.findIndex(p=>p.id===worker.productId),worker.reserveRack||0).rotation+Math.PI;
    else if (worker.phase === 'idle' || worker.phase === 'loading') actor.group.rotation.y = Math.PI;
    const ramp = position[0] < .8 ? 0 : Math.max(0, Math.min(1, (-position[1] - 7.25 - reserveBackExtension(state)) / .85));
    old.set(position[0], 0.09 + ramp * .12, position[1]);
    if (moving) actor.walk += seconds * running * 6;
    const stride = moving ? Math.sin(actor.walk) * 0.35 : 0;
    actor.legs[0].rotation.x = stride; actor.legs[1].rotation.x = -stride; actor.arms.forEach(a => { a.rotation.x = -0.65; });
    const product = state.products.find(p => p.id === worker.productId);
    actor.equipment.cargo.forEach((crate, i) => { crate.visible = i < Math.ceil(worker.load / 12); crate.material = material(product?.color || 0xc8ab77); });
    actor.equipment.palletBase.visible = worker.load > 0;
    if (moving) actor.equipment.wheels.forEach(wheel => { wheel.rotation.x += seconds * running * 8; });
  }
  const customers = new Map();
  const employees = [];
  function addEmployee() {
    const actor = person(0x397654, true); actor.group.position.set(0, 0.09, -4.7); scene.add(actor.group); actor.role = ''; employees.push(actor);
  }
  function setDestination(actor, x, z, key, direct = false) {
    if (actor.key === key) return;
    actor.key = key;
    const pos = actor.group.position;
    const route = direct || Math.abs(pos.z - z) < 0.2 ? [[x, z]] : [[9.5, pos.z], [9.5, z], [x, z]];
    actor.route = Object.keys(state.layout||{}).length?(walkingPath(state,[pos.x,pos.z],[x,z])?.slice(1)||[]):[...(actor.arrivalRoute || []), ...route]; actor.arrivalRoute = null;
  }
  function walk(actor, seconds, speed, now) {
    let amount = seconds * speed, moving = false;
    while (actor.route.length && amount > 0) {
      const waypoint = actor.route[0], pos = actor.group.position, dx = waypoint[0] - pos.x, dz = waypoint[1] - pos.z, distance = Math.hypot(dx, dz);
      if (distance > .001) { actor.group.rotation.y = Math.atan2(dx, dz); moving = true; }
      if (distance <= amount + .001) { pos.x = waypoint[0]; pos.z = waypoint[1]; amount -= distance; actor.route.shift(); }
      else { pos.x += dx / distance * amount; pos.z += dz / distance * amount; amount = 0; }
    }
    if (moving) actor.walk += seconds * speed * 2;
    const stride = moving ? Math.sin(actor.walk) * 0.4 : 0;
    actor.legs[0].rotation.x = stride; actor.legs[1].rotation.x = -stride;
    actor.arms[0].rotation.x = -stride * 0.7; actor.arms[1].rotation.x = stride * 0.7;
    actor.body.position.y = 0.72 + (moving ? Math.abs(Math.sin(actor.walk)) * 0.025 : 0);
  }
  function update(delta, now, selected, minuteFraction = 0) {
    keyboardCamera.update(delta / 1000);
    controls.update();
    const seconds = delta / 1000, running = ['preparation','open'].includes(state.phase) ? state.speed : 0;
    const front = storeFrontExtension(state.expansions,state.storeSize), back = reserveBackExtension(state), wide = Math.max(1.6, state.expansions.checkout * 2);
    foundation.scale.set((24 + wide) / 24, 1, (17 + front + back) / 17); foundation.position.z = (front - back) / 2;
    floor.scale.set((22.8 + wide) / 22.8, 1, (15.8 + front + back) / 15.8); floor.position.z = (front - back) / 2;
    warehouseFloor.scale.set((22.8 + wide) / 22.8, 1, (3.6 + back) / 11.6); warehouseFloor.position.z = -5.9 - back / 2;
    backWall.scale.x = (10.7 + wide / 2) / 10.7; backWall.position.x = -6.05 - wide / 4; backWall.position.z = -7.9 - back;
    leftWall.position.set(-11.4 - wide / 2, 0.9, (front - back) / 2); leftWall.scale.z = (15.8 + front + back) / 15.8;
    rightWall.position.set(11.4 + wide / 2, 0.18, (front - back) / 2); rightWall.scale.z = leftWall.scale.z;
    gates.position.z=front;
    surroundings.update(seconds, running, state.expansions,state.storeSize);
    reserveZones.forEach(zone => {
      const placement=reservePlacement(state,zone.index,zone.ordinal);zone.group.position.set(placement.x,0,placement.z);zone.group.rotation.y=placement.rotation;
      const product = state.products[zone.index], levels = 3 + state.expansions.reserve;
      zone.group.visible = zone.ordinal < product.reserveRacks;
      const perRack = product.reserveRacks ? product.reserveCapacity / product.reserveRacks : 0;
      const count = Math.ceil(Math.max(0, Math.min(perRack, product.reserve - zone.ordinal * perRack)) / 12);
      zone.boards.forEach((pair, level) => pair.forEach(board => { board.visible = level < levels; }));
      zone.posts.forEach(post => { post.scale.y = (2.65 + state.expansions.reserve * .8) / 2.65; post.position.y = 1.46 + state.expansions.reserve * .4; });
      zone.crates.forEach((crate, n) => {
        const slot = Math.floor(n / 5), level = n % 5;
        crate.visible = level < levels && slot * levels + level < count;
      });
    });
    deliveryYard.update(minuteFraction);
    onlineScene.update(minuteFraction,seconds);
    const installedFixtures = new Set(state.shelfLayout.flatMap((id, slot) => id ? [shelfFixtureId(slot)] : []));
    fixtures.forEach((group, id) => { group.visible = installedFixtures.has(id); });
    emptyShelves.forEach(group => { group.visible = false; });
    for (let slot = 0; slot < state.shelfLayout.length; slot++) {
      const id = state.shelfLayout[slot];
      if (shelves[slot]?.productId === id) continue;
      if (shelves[slot]) { shelves[slot].group.removeFromParent(); shelves[slot].group.traverse(o => { o.geometry?.dispose(); if (o.material?.map) { o.material.map.dispose(); o.material.dispose(); } }); shelves[slot] = null; }
      if (id) { const index = state.products.findIndex(p => p.id === id); shelves[slot] = createShelf(state.products[index], index, slot); }
    }
    shelves.forEach(shelf => {
      if (!shelf) return;
      const placement=shelfPlacement(state,shelf.slot);shelf.group.position.set(placement.x,0,placement.z);shelf.group.rotation.y=placement.rotation;
      const p = state.products[shelf.index], slots = state.shelfLayout.map((id, slot) => id === p.id ? slot : -1).filter(slot => slot >= 0), ordinal = slots.indexOf(shelf.slot);
      const count = Math.floor(p.shelf / slots.length) + (ordinal < p.shelf % slots.length ? 1 : 0);
      shelf.units.update(count,shelf.furniture.levels);
      if(shelf.furniture.doors.length){
        const picking=state.customers.some(c=>c.stage==='shopping'&&c.progress>0&&c.items[c.itemIndex]?.index===shelf.index&&c.id%slots.length===ordinal)||state.restockers.some(w=>w.phase==='stocking'&&w.productId===p.id&&w.completed%slots.length===ordinal);
        for(const door of shelf.furniture.doors)door.group.rotation.y=THREE.MathUtils.lerp(door.group.rotation.y,picking?door.side*.48:0,.18);
      }
      shelf.selection.visible = selected === p.id;
      const ratio = p.capacity ? p.shelf / p.capacity : 0; shelf.stockBar.scale.x = ratio; shelf.stockBar.position.x = -1.65 * (1 - ratio) / 2;
      shelf.stockBar.material = material(p.shelf < 12 ? 0xefaa73 : p.color);
    });
    const lanes = checkoutCount(state);
    checkouts.forEach((checkout, i) => {
      const placement=checkoutPlacement(state,i);checkout.group.visible = i < lanes; checkout.group.position.set(placement.x,0,placement.z);checkout.group.rotation.y=placement.rotation;
      checkout.light.material = material(signalColor(i));
    });
    automaticCheckouts.forEach((station,i)=>{
      const lane=autoCheckoutLane(i),p=checkoutPlacement(state,lane);station.group.visible=i<autoCheckoutCount(state);
      station.group.position.set(p.x,0,p.z);station.group.rotation.y=p.rotation;station.light.material=material(signalColor(lane));
    });
    const liveIds = new Set(state.customers.map(c => c.id));
    for (const [id, actor] of customers) if (!liveIds.has(id)) {
      if (!actor.exiting) {
        updateCustomerCart(actor, actor.customer); actor.exiting = true;
        if (actor.customer.paid) {
          const lane=actor.customer.checkoutLane,[x,z]=checkoutPoint(state,lane);
          checkoutVisuals.beginPayment(actor, isAutoCheckoutLane(lane) ? automaticCheckouts[autoCheckoutIndex(lane)]?.effects : checkouts[lane]?.effects);
          actor.key = 'paid-exit'; actor.arrivalRoute = null;
          actor.route = [...(Object.keys(state.layout||{}).length?walkingPath(state,[actor.group.position.x,actor.group.position.z],[7.3,7.7+front])?.slice(1)||[]:[[x,z],[x,7.7+front],[7.3,7.7+front]]),[7.3,10+front],[actor.home[0],actor.home[1]+front]];
        } else setDestination(actor, actor.home[0], actor.home[1] + front, 'exit');
      }
      const paying = checkoutVisuals.updatePayment(actor, seconds, running);
      if (!paying) walk(actor, seconds, 2.4 * running, now);
      if (!actor.route.length && !actor.payment) {
        scene.remove(actor.group);
        actor.group.traverse(object => { if (object.geometry) object.geometry.dispose(); });
        surroundings.release(id);
        customers.delete(id);
      }
    }
    const queue = state.customers.filter(c => c.stage === 'queue'), activeLanes = activeCheckoutLanes(state);
    for (const customer of state.customers) {
      let actor = customers.get(customer.id);
      if (!actor) {
        const planned=customer.items.reduce((n,l)=>n+l.quantity,0);actor = person(customer.color,false,customer.carryMode||(planned<=6?'bag':planned<=15?'mini':'cart')); const entry = surroundings.register(customer);
        actor.home = [entry[0], entry[1] - front]; const initial=customer.motion?.position||entry;actor.group.position.set(initial[0],.1,initial[1]);
        actor.arrivalRoute = [[9.5, 10 + front], [9.5, 7.3 + front]];
        scene.add(actor.group); customers.set(customer.id, actor);
      }
      actor.customer = customer; actor.group.name = `customer-${customer.id}`; updateCustomerCart(actor, customer);
      if(customer.motion){
        const [x,z]=customerPosition(customer,minuteFraction),pos=actor.group.position,dx=x-pos.x,dz=z-pos.z;
        if(Math.hypot(dx,dz)>.001){actor.group.rotation.y=Math.atan2(dx,dz);if(running)actor.walk+=seconds*running*4.8;}
        else actor.group.rotation.y=customer.motion.facing;
        pos.set(x,.1,z);const stride=running&&customer.motion.path.length?Math.sin(actor.walk)*.35:0;actor.legs[0].rotation.x=stride;actor.legs[1].rotation.x=-stride;actor.arms.forEach(arm=>{arm.rotation.x=-.65;});
        actor.route=[];actor.arrivalRoute=null;actor.flowStage=customer.stage;continue;
      }
      if (customer.stage === 'shopping') {
        const item = customer.items[Math.min(customer.itemIndex, customer.items.length - 1)], [x, z, side] = productShelfAccess(state, item.index, customer.id);
        actor.shelfFacing = side < 0 ? 0 : Math.PI;
        setDestination(actor, x - 1.2 + (customer.id % 4) * 0.7, z + side * 1.3, `shelf-${customer.itemIndex}`);
      } else {
        const unassigned = queue.filter(c => c.checkoutLane == null);
        const lane = customer.checkoutLane ?? (activeLanes.length ? activeLanes[0] : Math.max(0, unassigned.indexOf(customer)) % lanes);
        const point=checkoutPoint(state,lane),x=point[0];
        const index = customer.checkoutLane == null ? Math.floor(unassigned.indexOf(customer) / lanes) : queue.filter(c => c.checkoutLane === lane).indexOf(customer);
        const column = Math.floor(Math.max(0, index) / 3), row = Math.max(0, index) % 3;
        const qx = x - column * .7, qz = point[1]-1.1 - (column % 2 ? 2 - row : row) * .85;
        const z = customer.stage === 'checkout' ? point[1] : qz;
        const targetX = customer.stage === 'checkout' ? x : qx;
        const key = `${customer.stage}-${lane}-${index}-${lanes}-${front}`;
        if (actor.key !== key) {
          const alreadyWaiting = ['queue', 'checkout'].includes(actor.flowStage);
          actor.key = key; actor.arrivalRoute = null;
          actor.route = alreadyWaiting ? [[targetX, z]] : [[10.4, actor.group.position.z], [10.4, 2.7 + front], [targetX, 2.7 + front], [targetX, z]];
        }

      }
      actor.flowStage = customer.stage;
      walk(actor, seconds, 2.4 * running, now); actor.arms.forEach(arm => { arm.rotation.x = -.65; }); if (!actor.route.length) actor.group.rotation.y = customer.stage === 'shopping' ? actor.shelfFacing : 0;
    }
    checkouts.forEach((checkout, i) => {
      const customer = state.customers.find(c => c.stage === 'checkout' && c.checkoutLane === i);
      checkoutVisuals.updateStation(checkout.effects, customer, customers.get(customer?.id), minuteFraction, seconds, running);
    });
    automaticCheckouts.forEach((station,i)=>{
      const customer=state.customers.find(c=>c.stage==='checkout'&&c.checkoutLane===autoCheckoutLane(i));
      checkoutVisuals.updateStation(station.effects,customer,customers.get(customer?.id),minuteFraction,seconds,running);
    });
    const roles = [...Array(state.staff.checkout).fill('checkout'), ...Array(state.staff.shelves).fill('shelves'), ...Array(state.staff.receiving).fill('receiving'), ...Array(state.staff.online).fill('online')];
    const shelfWorkers=humanRestockers(state);
    while (employees.length < roles.length) addEmployee();
    let checkoutIndex = 0, shelfIndex = 0, receivingIndex = 0, onlineIndex = 0;
    employees.forEach((actor, i) => {
      const role = roles[i] || 'idle';
      actor.group.visible = role !== 'idle'; if (role === 'idle') return;
      if (actor.role !== role) {
        actor.role = role; actor.key = ''; actor.route = [];
        if(actor.onlineCargo) actor.onlineCargo.visible=false;
        if (actor.outfit) { actor.group.remove(actor.outfit); actor.outfit.traverse(o => o.geometry?.dispose()); }
        actor.outfit = staffOutfit(role, box, material); actor.group.add(actor.outfit);
        actor.cap.visible = role !== 'receiving'; actor.group.userData.selection = { view: 'equipes', role };
      }
      if (actor.equipment) actor.equipment.group.visible = ['shelves','receiving','online'].includes(role);
      if (role === 'checkout') {
        const lane=checkoutIndex++,point=cashierPoint(state,lane);setDestination(actor,point[0],point[1],`cashier-${lane}-${point.join()}`);
      } else if (role === 'shelves') {
        const worker = shelfWorkers[shelfIndex++];
        displayRestocker(actor, worker, running, seconds, minuteFraction);
        return;
      } else if (role === 'online') {
        displayOnlineWorker(actor,state.online.workers[onlineIndex++],running,seconds,minuteFraction); return;
      } else if (role === 'receiving') {
        const worker = state.receivers[receivingIndex++]; displayReceiver(actor, worker, running, seconds, minuteFraction); return;
      }
      walk(actor, seconds, running ? 6 * running : state.phase === 'preparation' ? 2 : 0, now);
      if (!actor.route.length && checkoutIndex - 1 < lanes) {
        actor.group.rotation.y = checkoutPlacement(state,checkoutIndex-1).rotation;
        const station = checkouts[checkoutIndex - 1].effects;
        actor.arms.forEach((arm, index) => { arm.rotation.x = station.key ? -.6 - (running ? Math.sin(now / 140 + index) * .22 : 0) : 0; });
      }
    });
    robotFleet.update(state,running,seconds,minuteFraction);
    renderer.render(scene, camera);
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart;
  function selectAt(event) {
    const bounds = canvas.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects([store, deliveryYard.group, onlineScene.group, ...employees.map(a => a.group),...robotFleet.groups()], true)) {
      let object = hit.object, selection = null, visible = true;
      while (object) { if (!object.visible) visible = false; if (!selection && object.userData.selection) selection = object.userData.selection; object = object.parent; }
      if (visible && selection) return selection;
    }
    return null;
  }
  canvas.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointerup', event => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
    const selection = selectAt(event); pointerStart = null;
    if (selection) onSelect(selection);
  });
  canvas.addEventListener('pointercancel', () => { pointerStart = null; });
  canvas.addEventListener('pointermove', event => { if (!event.buttons) canvas.style.cursor = selectAt(event) ? 'pointer' : 'grab'; });
  const resize = () => {
    const bounds = canvas.getBoundingClientRect(), aspect = bounds.width / Math.max(1, bounds.height), halfHeight = Math.max(17, 17 / aspect);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); renderer.setSize(bounds.width, bounds.height, false);
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize(); controls.saveState();
  window.addEventListener('pagehide', () => {
    checkoutVisuals.dispose(); controls.dispose(); renderer.dispose();
    keyboardCamera.dispose();
    observer.disconnect();
    scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material?.map) object.material.map.dispose(); });
    for (const m of materials.values()) m.dispose();
  }, { once: true });
  function resetSimulation() {
    for(const actor of customers.values()) {actor.group.removeFromParent();actor.group.traverse(o=>{o.geometry?.dispose();if(o.material?.map){o.material.map.dispose();o.material.dispose();}});}
    customers.clear();surroundings.reset();checkoutVisuals.reset();robotFleet.reset();
  }
  return { update, resetSimulation, setCheckoutSound: checkoutVisuals.setSound, focusDocks: () => { keyboardCamera.reset(); controls.target.set(5, 0, -10 - reserveBackExtension(state)); camera.position.set(23, 26, -33 - reserveBackExtension(state)); camera.zoom = 1.15; camera.updateProjectionMatrix(); controls.update(); }, resetCamera: () => { keyboardCamera.reset(); controls.reset(); } };
}
