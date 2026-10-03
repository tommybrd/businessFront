import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RESTOCK_EQUIPMENT, RESTOCK_SHELVES, restockerPosition } from './engine.js';
import { createKeyboardCameraControls } from './camera-controls.js';

const COLORS = { green: 0x285c46, floor: 0xeef2e9, wall: 0xc9d6c8, steel: 0x859287 };
const shelfPositions = RESTOCK_SHELVES;

export function createStoreScene(canvas, state, onSelect) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xdde7dc);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-16, 16, 10.88, -10.88, 0.1, 100);
  camera.position.set(21, 24, 28); camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0); controls.enableDamping = true; controls.dampingFactor = 0.1;
  controls.minZoom = 0.7; controls.maxZoom = 1.8;
  controls.minPolarAngle = Math.PI / 5; controls.maxPolarAngle = Math.PI / 2.6;
  controls.enablePan = true; controls.screenSpacePanning = false;
  const keyboardCamera = createKeyboardCameraControls(camera, controls);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa3b59e, 2.4));
  const sun = new THREE.DirectionalLight(0xfff8e9, 3.2);
  sun.position.set(-12, 25, 14); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -18; sun.shadow.normalBias = 0.04;
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
  const store = new THREE.Group(); scene.add(store);
  box(store, 24, 0.45, 17, 0, -0.26, 0, 0xb2c1ac);
  box(store, 22.8, 0.08, 15.8, 0, 0, 0, COLORS.floor);
  box(store, 22.8, 0.1, 3.6, 0, 0.07, -5.9, 0xc7d5c1);
  box(store, 22.8, 1.75, 0.22, 0, 0.9, -7.9, COLORS.wall);
  box(store, 0.22, 1.75, 15.8, -11.4, 0.9, 0, COLORS.wall);
  // Cutaway walls preserve the director's view into the shop.
  box(store, 0.2, 0.28, 15.8, 11.4, 0.18, 0, 0xc7d4c3);
  box(store, 8.8, 0.8, 0.2, -6.5, 0.45, -4.1, 0xd2ddca);
  box(store, 8.8, 0.8, 0.2, 6.5, 0.45, -4.1, 0xd2ddca);
  box(store, 0.2, 0.9, 2.3, 0, 0.5, -6.35, 0xd2ddca);
  const reserve = new THREE.Group(), dock = new THREE.Group(); store.add(reserve, dock);
  const reserveZones = state.products.map((product, i) => {
    const group = new THREE.Group(); group.position.set(-9.2 + (i % 3) * 3.5, 0, -6.9 + Math.floor(i / 3) * 1.75);
    box(group, 3.05, 0.025, 1.4, 0, 0.15, 0, product.color, false);
    box(group, 2.45, 0.1, 1.05, 0, 0.24, 0, 0xac926f);
    const crates = [];
    for (let n = 0; n < 8; n++) crates.push(box(group, 0.75, 0.44, 0.45, n % 2 ? 0.6 : -0.6, 0.51 + Math.floor(n / 4) * 0.45, n % 4 < 2 ? -0.26 : 0.26, product.color));
    reserve.add(group); return { group, crates };
  });
  const deliveryBoxes = [];
  for (let i = 0; i < 6; i++) {
    const group = new THREE.Group(); group.position.set(1.5 + i * 1.4, 0, -6);
    box(group, 1.1, 0.14, 0.9, 0, 0.2, 0, 0xa78659);
    box(group, 1, 0.95, 0.8, 0, 0.75, 0, 0xc5ac7e); dock.add(group); deliveryBoxes.push(group);
  }
  const shelves = state.products.map((product, index) => {
    const group = new THREE.Group(), [x, z] = shelfPositions[index]; group.position.set(x, 0, z); store.add(group);
    group.userData.productId = product.id;
    box(group, 4.1, 0.25, 1.45, 0, 0.22, 0, 0xb9c8ae);
    for (const level of [0.42, 0.92, 1.42]) box(group, 4.1, 0.1, 1.45, 0, level, 0, 0xd1dbc5);
    for (const px of [-1.95, 1.95]) for (const pz of [-0.65, 0.65]) box(group, 0.09, 1.35, 0.09, px, 0.84, pz, COLORS.steel);
    box(group, 4.1, 0.18, 0.14, 0, 1.45, 0.76, product.color);
    const boxes = [];
    for (let i = 0; i < 16; i++) boxes.push(box(group, 0.73, 0.36, 0.45, -1.4 + (i % 4) * 0.94, 0.65 + Math.floor(i / 8) * 0.5, i % 8 < 4 ? 0.35 : -0.35, product.color));
    const selection = box(group, 4.7, 0.015, 2.05, 0, 0.1, 0, 0xc6e49f, false); selection.visible = false;
    const productLabel = textSprite(product.name, { worldWidth: 3.7, background: '#ffffffed', size: 34 }); productLabel.position.set(0, 2, 0); group.add(productLabel);
    return { group, boxes, selection };
  });
  const checkouts = [];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group(); group.position.set(-6.5 + i * 4, 0, 6); store.add(group);
    box(group, 2.2, 0.9, 1, 0, 0.5, 0, 0x82a98c);
    box(group, 1.3, 0.1, 1.08, -0.4, 1, 0, 0x365647);
    box(group, 0.15, 0.38, 0.15, 0.77, 1.15, 0, COLORS.steel);
    box(group, 0.46, 0.32, 0.08, 0.77, 1.4, 0.02, 0x213e36);
    const light = box(group, 0.18, 0.14, 0.18, 0.83, 1.68, 0, 0xa4d584, false);
    const sign = textSprite(`CAISSE ${i + 1}`, { worldWidth: 1.8, size: 36 }); sign.position.set(0, 0.2, 1.15); group.add(sign);
    checkouts.push({ group, light });
  }
  const auto = new THREE.Group(); auto.position.set(9.2, 0, 6); store.add(auto);
  box(auto, 0.95, 0.9, 0.75, 0, 0.5, 0, 0x90b877);
  box(auto, 0.68, 0.4, 0.1, 0, 1.14, 0, 0x244b3c);
  const autoSign = textSprite('AUTO', { worldWidth: 1.2 }); autoSign.position.set(0, 1.8, 0); auto.add(autoSign);
  const entrance = textSprite('ENTRÉE', { worldWidth: 2.1, color: '#506649' }); entrance.position.set(9.5, 0.25, 7.5); store.add(entrance);
  const truck = new THREE.Group(); truck.position.set(6, 0, -9.1); scene.add(truck);
  box(truck, 3.9, 1.6, 1.6, 0, 1.18, 0, 0xf4f2e8);
  box(truck, 1.1, 1.3, 1.5, -2.4, 1, 0, 0x456e5b);
  box(truck, 0.8, 0.45, 1.52, -2.4, 1.4, 0, 0x9dbdbc);
  for (const x of [-2.4, 1.1]) for (const z of [-0.84, 0.84]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.15, 12), material(0x354338)); wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 0.36, z); truck.add(wheel);
  }
  function person(color, staff = false) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 3, 8), material(color)); body.position.y = 0.72; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), material(0xe5b992)); head.position.y = 1.13; head.castShadow = true; group.add(head);
    const legs = [-0.09, 0.09].map(x => box(group, 0.13, 0.34, 0.14, x, 0.25, 0, 0x3b4841));
    const arms = [-0.23, 0.23].map(x => box(group, 0.1, 0.28, 0.1, x, 0.72, 0.03, color));
    if (staff) { box(group, 0.25, 0.06, 0.26, 0, 1.27, 0.02, COLORS.green); box(group, 0.06, 0.08, 0.02, -0.08, 0.85, 0.18, 0xd3f1ab); }
    else {
      const cart = new THREE.Group(); cart.position.set(0, 0, 0.56); group.add(cart);
      box(cart, 0.42, 0.2, 0.5, 0, 0.51, 0, 0xb4beb2);
      box(cart, 0.03, 0.36, 0.03, -0.2, 0.46, -0.25, COLORS.steel);
      box(cart, 0.03, 0.36, 0.03, 0.2, 0.46, -0.25, COLORS.steel);
      box(cart, 0.42, 0.035, 0.04, 0, 0.68, -0.25, COLORS.green);
      for (const x of [-0.16, 0.16]) for (const z of [-0.2, 0.2]) {
        const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 4), material(0x465245)); wheel.position.set(x, 0.24, z); cart.add(wheel);
      }
    }
    return { group, body, legs, arms, route: [], key: '', walk: 0 };
  }
  function restockVehicle(mode) {
    const group = new THREE.Group(), pallet = mode === 'pallet';
    const w = mode === 'small' ? 0.58 : 1.05, d = mode === 'small' ? 0.62 : 1.1;
    group.position.z = mode === 'small' ? 0.67 : 1;
    if (pallet) {
      for (const x of [-0.3, 0.3]) box(group, 0.17, 0.1, 1.35, x, 0.2, 0.1, 0xd59b38);
      box(group, 0.6, 0.28, 0.3, 0, 0.34, -0.6, 0xd59b38);
      box(group, 0.07, 0.68, 0.07, 0, 0.78, -0.67, COLORS.steel);
      box(group, 0.5, 0.06, 0.06, 0, 1.1, -0.67, 0x365546);
      box(group, w, 0.12, d, 0, 0.35, 0, 0xb29267);
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
    for (let i = 0; i < 8; i++) cargo.push(box(group, w * 0.38, 0.23, d * 0.36, (i % 2 ? 1 : -1) * w * 0.23, 0.54 + Math.floor(i / 4) * 0.24, (i % 4 < 2 ? -1 : 1) * d * 0.23, 0xc8ab77));
    return { group, cargo, wheels, mode };
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
    const moving = running > 0 && ['outbound', 'returning'].includes(worker.phase);
    if (moving && Math.hypot(dx, dz) > 0.001) actor.group.rotation.y = Math.atan2(dx, dz);
    else if (worker.phase === 'stocking') actor.group.rotation.y = Math.PI;
    else if (worker.phase === 'loading' || worker.phase === 'idle') actor.group.rotation.y = Math.PI / 2;
    old.set(position[0], 0.09, position[1]);
    if (moving) actor.walk += seconds * running * 6;
    const stride = moving ? Math.sin(actor.walk) * 0.35 : 0;
    actor.legs[0].rotation.x = stride; actor.legs[1].rotation.x = -stride;
    actor.arms.forEach(arm => { arm.rotation.x = -0.65; });
    const product = state.products.find(p => p.id === worker.productId);
    actor.equipment.cargo.forEach((crate, i) => { crate.visible = i < Math.ceil(worker.load / RESTOCK_EQUIPMENT[mode].capacity * 8); crate.material = material(product?.color || 0xc8ab77); });
    if (moving) actor.equipment.wheels.forEach(wheel => { wheel.rotation.x += seconds * running * 8; });
  }
  const customers = new Map();
  const employees = Array.from({ length: 8 }, (_, i) => {
    const actor = person(0x397654, true); actor.group.position.set(-8 + i * 0.65, 0.09, -4.7); scene.add(actor.group); actor.role = ''; return actor;
  });
  function setDestination(actor, x, z, key, direct = false) {
    if (actor.key === key) return;
    actor.key = key;
    const pos = actor.group.position;
    actor.route = direct || Math.abs(pos.z - z) < 0.2 ? [[x, z]] : [[9.5, pos.z], [9.5, z], [x, z]];
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
    const used = state.products.reduce((sum, p) => sum + p.reserve, 0);
    reserveZones.forEach((zone, i) => {
      const product = state.products[i]; zone.crates.forEach((crate, n) => { crate.visible = n < Math.ceil(product.reserve / 40); });
      replaceText(zone.group, 'stock', `${product.short} · ${product.reserve}`, 0, 1.6, 0, { worldWidth: 2.5, size: 33 });
    });
    replaceText(reserve, 'sign', `RÉSERVE · ${used} / 600`, -5.5, 2.75, -7.5, { worldWidth: 4.8 });
    const arrived = state.orders.filter(o => o.status === 'unloading');
    deliveryBoxes.forEach((p, i) => { p.visible = i < arrived.length; });
    replaceText(dock, 'sign', arrived.length ? `QUAI · ${arrived.length} livraison(s)` : 'QUAI DE LIVRAISON', 5.3, 2.45, -6.5, { worldWidth: 4.8 });
    const approaching = state.orders.find(o => o.status === 'transit' && o.eta - state.elapsed < 15);
    truck.visible = arrived.length > 0 || !!approaching;
    if (approaching) truck.position.x = 6 + Math.max(0, approaching.eta - state.elapsed) * 0.7;
    else truck.position.x = 6;
    shelves.forEach((shelf, i) => {
      const p = state.products[i]; shelf.boxes.forEach((box, n) => { box.visible = n < Math.ceil(p.shelf / 4); });
      shelf.selection.visible = selected === p.id;
      replaceText(shelf.group, 'count', `${p.shelf} en rayon · ${p.reserve} en réserve`, 0, 1.64, 0.05, { worldWidth: 3.8, size: 29, color: p.shelf < 12 ? '#a64d2f' : '#52714b', background: '#ffffffe8' });
    });
    checkouts.forEach((checkout, i) => { checkout.light.material = material(state.staff.checkout > i ? 0xb8ee81 : 0x979e8e); });
    auto.visible = state.autoCheckout;
    const liveIds = new Set(state.customers.map(c => c.id));
    for (const [id, actor] of customers) if (!liveIds.has(id)) {
      if (!actor.exiting) { actor.exiting = true; setDestination(actor, 11.7, 7.7, 'exit'); }
      walk(actor, seconds, 15 * Math.max(running, 1), now);
      if (!actor.route.length) {
        scene.remove(actor.group);
        actor.group.traverse(object => { if (object.geometry) object.geometry.dispose(); });
        customers.delete(id);
      }
    }
    const queue = state.customers.filter(c => c.stage === 'queue');
    for (const customer of state.customers) {
      let actor = customers.get(customer.id);
      if (!actor) { actor = person(customer.color); actor.group.position.set(10, 0.1, 7.3); scene.add(actor.group); customers.set(customer.id, actor); }
      if (customer.stage === 'shopping') {
        const item = customer.items[Math.min(customer.itemIndex, customer.items.length - 1)], [x, z] = shelfPositions[item.index];
        setDestination(actor, x - 1.2 + (customer.id % 4) * 0.7, z + 1.3, `shelf-${customer.itemIndex}`);
      } else {
        const index = queue.indexOf(customer), lanes = Math.max(1, Math.min(4, state.staff.checkout));
        setDestination(actor, -7 + (index % lanes) * 4, 4.85 - Math.floor(index / lanes) * 0.6, `queue-${index}-${lanes}`);
      }
      walk(actor, seconds, 14 * running, now);
    }
    const roles = [...Array(state.staff.checkout).fill('checkout'), ...Array(state.staff.shelves).fill('shelves'), ...Array(state.staff.reserve).fill('reserve'), ...Array(state.staff.receiving).fill('receiving')];
    let checkoutIndex = 0, shelfIndex = 0, reserveIndex = 0, receivingIndex = 0;
    employees.forEach((actor, i) => {
      const role = roles[i] || 'idle';
      if (actor.role !== role) { actor.role = role; actor.key = ''; actor.route = []; }
      if (actor.equipment) actor.equipment.group.visible = role === 'shelves';
      if (role === 'checkout') {
        const lane = checkoutIndex++; setDestination(actor, lane < 4 ? -5.4 + lane * 4 : 9.6, 6.75, `cashier-${lane}`);
      } else if (role === 'shelves') {
        const worker = state.restockers[shelfIndex++];
        displayRestocker(actor, worker, running, seconds, minuteFraction);
        return;
      } else if (role === 'reserve') {
        const index = reserveIndex++, loading = state.restockers.filter(w => w.phase === 'loading'), job = loading[index];
        if (job && running) {
          const productIndex = state.products.findIndex(p => p.id === job.productId), zone = reserveZones[productIndex].group.position;
          const preparing = job.remaining > job.total / 2;
          setDestination(actor, preparing ? zone.x + 1.25 : -2.7 + index * 0.6, preparing ? zone.z : -4.85, `prepare-${job.id}-${job.productId}-${preparing}`, true);
        } else setDestination(actor, -8 + index * 0.65, -4.65, `warehouse-idle-${index}`, true);
      } else if (role === 'receiving') {
        const index = receivingIndex++;
        if (!actor.route.length) {
          const unloading = running && arrived.length > 0, toReserve = actor.key.startsWith('dock');
          setDestination(actor, unloading && toReserve ? -1.2 : 2.2 + index * 0.7, -5.3, `${unloading && toReserve ? 'reserve' : 'dock'}-${unloading ? now : index}`, true);
        }
      } else setDestination(actor, -9.6 + i * 0.45, -4.65, 'idle', true);
      walk(actor, seconds, running ? 6 * running : state.phase === 'preparation' ? 2 : 0, now);
    });
    renderer.render(scene, camera);
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(); let pointerStart;
  canvas.addEventListener('pointerdown', event => { pointerStart = [event.clientX, event.clientY]; });
  canvas.addEventListener('pointerup', event => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 6) return;
    const bounds = canvas.getBoundingClientRect(); pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const intersection = raycaster.intersectObjects(shelves.map(s => s.group), true)[0];
    if (intersection) { let object = intersection.object; while (object && !object.userData.productId) object = object.parent; if (object) onSelect(object.userData.productId); }
  });
  const resize = () => { renderer.setSize(1000, 680, false); };
  resize();
  window.addEventListener('pagehide', () => {
    controls.dispose(); renderer.dispose();
    keyboardCamera.dispose();
    scene.traverse(object => { if (object.geometry) object.geometry.dispose(); if (object.material?.map) object.material.map.dispose(); });
    for (const m of materials.values()) m.dispose();
  }, { once: true });
  return { update, resetCamera: () => { keyboardCamera.reset(); controls.reset(); } };
}
