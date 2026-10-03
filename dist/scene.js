import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RESTOCK_EQUIPMENT, RESTOCK_SHELVES, SHELF_UNITS_PER_LEVEL, SHELF_INITIAL_LEVELS, restockerPosition, checkoutCount, activeCheckoutLanes, reserveProductPosition } from './engine.js';
import { createKeyboardCameraControls } from './camera-controls.js';
import { createDeliveryYard } from './delivery-scene.js';
import { productUnit, shelfStock, stockCarton, staffOutfit, createSurroundings } from './scene-details.js';

const COLORS = { green: 0x285c46, floor: 0xeef2e9, wall: 0xc9d6c8, steel: 0x859287 };
const shelfPositions = RESTOCK_SHELVES;

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
  const surroundings = createSurroundings(scene, box, material, textSprite);
  const store = new THREE.Group(); scene.add(store);
  const foundation = box(store, 24, 0.45, 17, 0, -0.26, 0, 0xb2c1ac);
  const floor = box(store, 22.8, 0.08, 15.8, 0, 0, 0, COLORS.floor);
  const warehouseFloor = box(store, 22.8, 0.1, 3.6, 0, 0.07, -5.9, 0xc7d5c1);
  warehouseFloor.userData.selection = { view: 'reserve' };
  const backWall = box(store, 10.7, 1.75, 0.22, -6.05, 0.9, -7.9, COLORS.wall);
  const leftWall = box(store, 0.22, 1.75, 15.8, -11.4, 0.9, 0, COLORS.wall);
  // Cutaway walls preserve the director's view into the shop.
  const rightWall = box(store, 0.2, 0.28, 15.8, 11.4, 0.18, 0, 0xc7d4c3);
  box(store, 8.8, 0.8, 0.2, -6.5, 0.45, -4.1, 0xd2ddca);
  box(store, 8.8, 0.8, 0.2, 6.5, 0.45, -4.1, 0xd2ddca);
  box(store, 0.2, 0.9, 2.3, 0, 0.5, -6.35, 0xd2ddca);
  const reserve = new THREE.Group(), dock = new THREE.Group(); store.add(reserve, dock);
  reserve.userData.selection = { view: 'reserve' }; dock.userData.selection = { view: 'fournisseurs' };
  const reserveZones = state.products.map((product, i) => {
    const group = new THREE.Group(), [x, z] = reserveProductPosition(i); group.position.set(x, 0, z);
    group.userData.selection = { view: 'reserve', productId: product.id };
    box(group, 3.05, 0.025, 1.4, 0, 0.15, 0, product.color, false);
    for (const x of [-1.3, 1.3]) for (const z of [-.59, .59]) box(group, .1, 2.65, .1, x, 1.46, z, 0x627d65);
    for (const level of [.3, 1.1, 1.9]) {
      box(group, 2.6, .08, 1.25, 0, level, 0, 0x9ba98d);
      box(group, 2.6, .12, .06, 0, level, .64, 0xd3ad5e);
    }
    const crates = [];
    for (let n = 0; n < 18; n++) {
      const slot = Math.floor(n / 3);
      crates.push(stockCarton(group, box, slot % 2 ? .62 : -.62, .56 + (n % 3) * .8, .4 - Math.floor(slot / 2) * .4, product.color));
    }
    const sign = plaque(product.short, 2.3); sign.position.set(0, .27, .75); group.add(sign);
    reserve.add(group); return { group, crates };
  });
  const deliveryYard = createDeliveryYard(scene, state, box, material, plaque);
  const shelves = state.products.map((product, index) => {
    const group = new THREE.Group(), [x, z] = shelfPositions[index]; group.name = `shelf-${product.id}`; group.position.set(x, 0, z); store.add(group);
    group.userData.selection = { view: 'rayons', productId: product.id };
    box(group, 5.4, 0.25, 1.45, 0, 0.22, 0, 0xb9c8ae);
    const boards = Array.from({ length: SHELF_INITIAL_LEVELS + 2 }, (_, n) => .42 + n * .38).map(level => box(group, 5.4, 0.1, 1.45, 0, level, 0, 0xd1dbc5));
    const posts = [];
    for (const px of [-2.6, 2.6]) for (const pz of [-0.65, 0.65]) posts.push(box(group, 0.09, 2.05, 0.09, px, 1.2, pz, COLORS.steel));
    box(group, 5.4, 0.18, 0.14, 0, 1.45, 0.76, product.color);
    const units = shelfStock(product, SHELF_UNITS_PER_LEVEL * (SHELF_INITIAL_LEVELS + 2), SHELF_UNITS_PER_LEVEL, group, box, material);
    const selection = box(group, 5.7, 0.015, 2.05, 0, 0.1, 0, 0xc6e49f, false); selection.visible = false;
    box(group, 5.1, 0.09, 0.04, 0, 0.31, 0.75, 0x4c6252);
    const stockBar = box(group, 5.1, 0.09, 0.05, 0, 0.31, 0.78, product.color, false);
    const sign = plaque(product.short, 2.2); sign.position.set(0, 1.12, 0.77); group.add(sign);
    return { group, units, boards, posts, selection, stockBar };
  });
  const checkouts = [];
  const laneX = (i, lanes) => (i - (lanes - 1) / 2) * (lanes <= 4 ? 4 : 3);
  for (let i = 0; i < 8; i++) {
    const group = new THREE.Group(); group.position.set(-6.5 + i * 4, 0, 6); store.add(group);
    group.name = `checkout-${i}`; group.rotation.y = -Math.PI / 2;
    group.userData.selection = { view: 'caisses' };
    box(group, 2.2, 0.9, 1, 0, 0.5, 0, 0x82a98c);
    box(group, 1.3, 0.1, 1.08, -0.4, 1, 0, 0x365647);
    box(group, 0.15, 0.38, 0.15, 0.77, 1.15, 0, COLORS.steel);
    box(group, 0.46, 0.32, 0.08, 0.77, 1.4, 0.02, 0x213e36);
    const light = box(group, 0.23, 0.23, 0.23, 0.83, 1.72, 0, 0xe56850, false);
    const sign = textSprite(`CAISSE ${i + 1}`, { worldWidth: 1.8, size: 36 }); sign.position.set(0, 0.2, 1.15); group.add(sign);
    checkouts.push({ group, light });
  }
  const auto = new THREE.Group(); auto.position.set(9.2, 0, 6); store.add(auto);
  auto.userData.selection = { view: 'caisses' }; auto.name = 'checkout-auto'; auto.rotation.y = -Math.PI / 2;
  box(auto, 0.95, 0.9, 0.75, 0, 0.5, 0, 0x90b877);
  box(auto, 0.68, 0.4, 0.1, 0, 1.14, 0, 0x244b3c);
  const autoSign = textSprite('AUTO', { worldWidth: 1.2 }); autoSign.position.set(0, 1.8, 0); auto.add(autoSign);
  const entrance = textSprite('ENTRÉE', { worldWidth: 2.1, color: '#506649' }); entrance.position.set(9.5, 0.25, 7.5); store.add(entrance);
  const exitSign = textSprite('SORTIE', { worldWidth: 1.8, color: '#506649' }); exitSign.position.set(7.3, .25, 7.5); store.add(exitSign);
  function person(color, staff = false) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 3, 8), material(color)); body.position.y = 0.72; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), material(0xe5b992)); head.position.y = 1.13; head.castShadow = true; group.add(head);
    const legs = [-0.09, 0.09].map(x => box(group, 0.13, 0.34, 0.14, x, 0.25, 0, 0x3b4841));
    const arms = [-0.23, 0.23].map(x => box(group, 0.1, 0.28, 0.1, x, 0.72, 0.03, color));
    let cap, cartContents;
    if (staff) { cap = box(group, 0.25, 0.06, 0.26, 0, 1.27, 0.02, COLORS.green); box(group, 0.06, 0.08, 0.02, -0.08, 0.85, 0.18, 0xd3f1ab); }
    else {
      const cart = new THREE.Group(); cart.position.set(0, 0, 0.56); group.add(cart);
      cart.name = 'customer-cart';
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
    return { group, body, legs, arms, cap, cartContents, basketKey: null, route: [], key: '', walk: 0 };
  }
  function updateCustomerCart(actor, customer) {
    if (!actor.cartContents) return;
    const key = JSON.stringify(customer.basket);
    if (actor.basketKey === key) return;
    actor.basketKey = key;
    for (const unit of [...actor.cartContents.children]) {
      actor.cartContents.remove(unit); unit.traverse(object => object.geometry?.dispose());
    }
    let count = 0;
    for (const item of customer.basket) for (let n = 0; n < item.quantity; n++) {
      const unit = productUnit(state.products[item.index], count, box, material); unit.scale.setScalar(.85);
      unit.position.set(count % 2 ? .13 : -.13, .48 + Math.floor(count / 6) * .23, .21 - Math.floor((count % 6) / 2) * .21);
      unit.userData.productId = state.products[item.index].id; actor.cartContents.add(unit); count++;
    }
    actor.cartContents.userData.articleCount = count;
    actor.cartContents.userData.filled = count > 0;
  }
  function restockVehicle(mode) {
    const group = new THREE.Group(), pallet = mode === 'pallet';
    const w = mode === 'small' ? 0.58 : mode === 'medium' ? 0.82 : 1.05, d = mode === 'small' ? 0.62 : mode === 'medium' ? 0.9 : 1.1;
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
    for (let i = 0; i < (pallet ? 4 : 8); i++) cargo.push(pallet
      ? stockCarton(group, box, i % 2 ? .25 : -.25, .62, i < 2 ? -.21 : .21, 0xc8ab77)
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
    const moving = running > 0 && ['approaching', 'outbound', 'returning'].includes(worker.phase);
    if (moving && Math.hypot(dx, dz) > 0.001) actor.group.rotation.y = Math.atan2(dx, dz);
    else if (worker.phase === 'stocking') actor.group.rotation.y = Math.PI;
    else if (worker.phase === 'loading') actor.group.rotation.y = -Math.PI / 2;
    else if (worker.phase === 'idle') actor.group.rotation.y = Math.PI / 2;
    old.set(position[0], 0.09, position[1]);
    if (moving) actor.walk += seconds * running * 6;
    const stride = moving ? Math.sin(actor.walk) * 0.35 : 0;
    actor.legs[0].rotation.x = stride; actor.legs[1].rotation.x = -stride;
    actor.arms.forEach(arm => { arm.rotation.x = -0.65; });
    const product = state.products.find(p => p.id === worker.productId);
    actor.equipment.cargo.forEach((crate, i) => { crate.visible = i < Math.ceil(worker.load / RESTOCK_EQUIPMENT[mode].capacity * 8); crate.material = material(product?.color || 0xc8ab77); });
    if (moving) actor.equipment.wheels.forEach(wheel => { wheel.rotation.x += seconds * running * 8; });
  }
  function displayReceiver(actor, worker, running, seconds, minuteFraction) {
    if (!actor.equipment || actor.equipment.mode !== 'pallet') {
      if (actor.equipment) { actor.group.remove(actor.equipment.group); actor.equipment.group.traverse(o => o.geometry?.dispose()); }
      actor.equipment = restockVehicle('pallet'); actor.group.add(actor.equipment.group);
    }
    actor.equipment.group.visible = true;
    const position = restockerPosition(worker, minuteFraction), old = actor.group.position;
    const dx = position[0] - old.x, dz = position[1] - old.z, moving = running > 0 && ['approaching', 'outbound', 'returning'].includes(worker.phase);
    if (moving && Math.hypot(dx, dz) > 0.001) actor.group.rotation.y = Math.atan2(dx, dz);
    else if (worker.phase === 'storing') actor.group.rotation.y = -Math.PI / 2;
    else if (worker.phase === 'idle' || worker.phase === 'loading') actor.group.rotation.y = Math.PI;
    const ramp = position[0] < .8 ? 0 : Math.max(0, Math.min(1, (-position[1] - 7.25 - state.expansions.reserve * 3) / .85));
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
    actor.route = [...(actor.arrivalRoute || []), ...route]; actor.arrivalRoute = null;
  }
  function walk(actor, seconds, speed, now) {
    const waypoint = actor.route[0]; let moving = false;
    if (waypoint && speed > 0) {
      const pos = actor.group.position, dx = waypoint[0] - pos.x, dz = waypoint[1] - pos.z, distance = Math.hypot(dx, dz);
      const amount = seconds * speed;
      if (distance < amount + 0.03) { pos.x = waypoint[0]; pos.z = waypoint[1]; actor.route.shift(); }
      else { pos.x += dx / distance * amount; pos.z += dz / distance * amount; actor.group.rotation.y = Math.atan2(dx, dz); moving = true; }
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
    const seconds = delta / 1000, running = state.phase === 'open' ? state.speed : 0;
    const front = state.expansions.checkout * 3, back = state.expansions.reserve * 3, wide = Math.max(state.expansions.shelves * 4, state.expansions.checkout * 2);
    foundation.scale.set((24 + wide) / 24, 1, (17 + front + back) / 17); foundation.position.z = (front - back) / 2;
    floor.scale.set((22.8 + wide) / 22.8, 1, (15.8 + front + back) / 15.8); floor.position.z = (front - back) / 2;
    warehouseFloor.scale.set((22.8 + wide) / 22.8, 1, (3.6 + back) / 3.6); warehouseFloor.position.z = -5.9 - back / 2;
    backWall.scale.x = (10.7 + wide / 2) / 10.7; backWall.position.x = -6.05 - wide / 4; backWall.position.z = -7.9 - back;
    leftWall.position.set(-11.4 - wide / 2, 0.9, (front - back) / 2); leftWall.scale.z = (15.8 + front + back) / 15.8;
    rightWall.position.set(11.4 + wide / 2, 0.18, (front - back) / 2); rightWall.scale.z = leftWall.scale.z;
    entrance.position.z = 7.5 + front; exitSign.position.z = 7.5 + front;
    surroundings.update(seconds, running, state.expansions);
    reserveZones.forEach((zone, i) => {
      const product = state.products[i]; zone.crates.forEach((crate, n) => { crate.visible = n < Math.ceil(product.reserve / 12); });
    });
    deliveryYard.update(minuteFraction);
    shelves.forEach((shelf, i) => {
      const p = state.products[i]; shelf.units.update(p.shelf, SHELF_INITIAL_LEVELS + state.expansions.shelves);
      shelf.boards.forEach((board, n) => { board.visible = n < SHELF_INITIAL_LEVELS + state.expansions.shelves; });
      shelf.posts.forEach(post => { post.scale.y = (2.05 + state.expansions.shelves * .38) / 2.05; post.position.y = 1.2 + state.expansions.shelves * .19; });
      shelf.selection.visible = selected === p.id;
      const ratio = p.shelf / p.capacity; shelf.stockBar.scale.x = ratio; shelf.stockBar.position.x = -5.1 * (1 - ratio) / 2;
      shelf.stockBar.material = material(p.shelf < 12 ? 0xefaa73 : p.color);
    });
    const lanes = checkoutCount(state);
    checkouts.forEach((checkout, i) => {
      checkout.group.visible = i < lanes; checkout.group.position.set(laneX(i, lanes), 0, 6 + front);
      checkout.light.material = material(state.phase === 'open' && state.staff.checkout > i ? 0xb8ee81 : 0xe56850);
    });
    auto.position.set(10.2 + wide / 2, 0, 4.8 + front);
    auto.visible = state.autoCheckout;
    const liveIds = new Set(state.customers.map(c => c.id));
    for (const [id, actor] of customers) if (!liveIds.has(id)) {
      if (!actor.exiting) {
        updateCustomerCart(actor, actor.customer); actor.exiting = true;
        if (actor.customer.paid) {
          const lane = actor.customer.checkoutLane, x = lane === 'auto' ? auto.position.x - .85 : laneX(lane, lanes) - .85;
          actor.key = 'paid-exit'; actor.arrivalRoute = null;
          actor.route = [[x, 6 + front], [x, 7.7 + front], [7.3, 7.7 + front], [7.3, 10 + front], [actor.home[0], actor.home[1] + front]];
        } else setDestination(actor, actor.home[0], actor.home[1] + front, 'exit');
      }
      walk(actor, seconds, 15 * running, now);
      if (!actor.route.length) {
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
        actor = person(customer.color); const entry = surroundings.register(customer);
        actor.home = [entry[0], entry[1] - front]; actor.group.position.set(entry[0], 0.1, entry[1]);
        actor.arrivalRoute = [[9.5, 10 + front], [9.5, 7.3 + front]];
        scene.add(actor.group); customers.set(customer.id, actor);
      }
      actor.customer = customer; actor.group.name = `customer-${customer.id}`; updateCustomerCart(actor, customer);
      if (customer.stage === 'shopping') {
        const item = customer.items[Math.min(customer.itemIndex, customer.items.length - 1)], [x, z] = shelfPositions[item.index];
        setDestination(actor, x - 1.2 + (customer.id % 4) * 0.7, z + 1.3, `shelf-${customer.itemIndex}`);
      } else {
        const lane = customer.checkoutLane ?? activeLanes[0] ?? 0;
        const x = lane === 'auto' ? auto.position.x - .85 : laneX(lane, lanes) - .85;
        const index = queue.filter(c => c.checkoutLane === customer.checkoutLane).indexOf(customer);
        const z = customer.stage === 'checkout' ? 5.65 + front : 4.65 + front - Math.max(0, index) * .85;
        setDestination(actor, x, z, `${customer.stage}-${lane}-${index}-${lanes}-${front}`);
      }
      walk(actor, seconds, 14 * running, now); actor.arms.forEach(arm => { arm.rotation.x = -.65; }); if (!actor.route.length && customer.stage !== 'shopping') actor.group.rotation.y = 0;
    }
    const roles = [...Array(state.staff.checkout).fill('checkout'), ...Array(state.staff.shelves).fill('shelves'), ...Array(state.staff.receiving).fill('receiving')];
    while (employees.length < roles.length) addEmployee();
    let checkoutIndex = 0, shelfIndex = 0, receivingIndex = 0;
    employees.forEach((actor, i) => {
      const role = roles[i] || 'idle';
      actor.group.visible = role !== 'idle'; if (role === 'idle') return;
      if (actor.role !== role) {
        actor.role = role; actor.key = ''; actor.route = [];
        if (actor.outfit) { actor.group.remove(actor.outfit); actor.outfit.traverse(o => o.geometry?.dispose()); }
        actor.outfit = staffOutfit(role, box, material); actor.group.add(actor.outfit);
        actor.cap.visible = role !== 'receiving'; actor.group.userData.selection = { view: 'equipes', role };
      }
      if (actor.equipment) actor.equipment.group.visible = role === 'shelves' || role === 'receiving';
      if (role === 'checkout') {
        const lane = checkoutIndex++; setDestination(actor, lane < lanes ? laneX(lane, lanes) + .85 : -9 + ((lane - lanes) % 12) * 0.65, lane < lanes ? 6.75 + front : 7.3 + front + Math.floor((lane - lanes) / 12) * 0.6, `cashier-${lane}-${lanes}-${front}`);
      } else if (role === 'shelves') {
        const worker = state.restockers[shelfIndex++];
        displayRestocker(actor, worker, running, seconds, minuteFraction);
        return;
      } else if (role === 'receiving') {
        const worker = state.receivers[receivingIndex++]; displayReceiver(actor, worker, running, seconds, minuteFraction); return;
      }
      walk(actor, seconds, running ? 6 * running : state.phase === 'preparation' ? 2 : 0, now);
      if (!actor.route.length && checkoutIndex - 1 < lanes) actor.group.rotation.y = -Math.PI / 2;
    });
    renderer.render(scene, camera);
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart;
  function selectAt(event) {
    const bounds = canvas.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects([store, deliveryYard.group, ...employees.map(a => a.group)], true)) {
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
    controls.dispose(); renderer.dispose();
    keyboardCamera.dispose();
    observer.disconnect();
    scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material?.map) object.material.map.dispose(); });
    for (const m of materials.values()) m.dispose();
  }, { once: true });
  return { update, focusDocks: () => { keyboardCamera.reset(); controls.target.set(5, 0, -10 - state.expansions.reserve * 3); camera.position.set(23, 26, -33 - state.expansions.reserve * 3); camera.zoom = 1.15; camera.updateProjectionMatrix(); controls.update(); }, resetCamera: () => { keyboardCamera.reset(); controls.reset(); } };
}
