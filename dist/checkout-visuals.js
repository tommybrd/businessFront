import * as THREE from 'three';
import { checkoutProgress } from './checkout-flow.js';
import { productUnit } from './scene-details.js';

export function createCheckoutVisuals(scene, state, { box, material, textSprite }) {
  let soundEnabled = true, audio, lastBeep = -Infinity;
  const unlockAudio = () => {
    if (!soundEnabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try { audio ||= new Audio(); audio.resume().catch(() => {}); } catch {}
  };
  document.addEventListener('pointerdown', unlockAudio);
  document.addEventListener('keydown', unlockAudio);
  function beep() {
    if (!soundEnabled || !audio || audio.state !== 'running' || document.hidden || audio.currentTime - lastBeep < .08) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
    oscillator.frequency.value = 1050; gain.gain.setValueAtTime(.025, now); gain.gain.exponentialRampToValueAtTime(.001, now + .07);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + .08);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); }; lastBeep = now;
  }
  function station(group, automatic = false) {
    const scan = box(group, .22, .025, .42, automatic ? 0 : .32, 1.075, 0, 0x662f2f, false);
    const stripes = Array.from({ length: 6 }, (_, i) => box(group, .025, .012, .86, -.98 + i * .2, 1.061, 0, 0x63736a, false));
    if (automatic) stripes.forEach(stripe => { stripe.visible = false; });
    const bip = textSprite('BIP', { width: 192, height: 80, worldWidth: .9, color: '#e5ffd2', background: '#285c46e8', size: 40 });
    bip.position.set(automatic ? 0 : .32, 1.65, 0); bip.visible = false; group.add(bip);
    const cargo = new THREE.Group(); cargo.name = 'checkout-conveyor-articles'; scene.add(cargo);
    return { group, scan, stripes, bip, cargo, key: null, scanned: 0, pulse: 0, automatic };
  }
  function clearCargo(station) {
    for (const unit of [...station.cargo.children]) { station.cargo.remove(unit); unit.traverse(o => o.geometry?.dispose()); }
  }
  const position = new THREE.Vector3(), cartPosition = new THREE.Vector3(), beltPosition = new THREE.Vector3();
  function updateStation(station, customer, actor, fraction, seconds, running) {
    station.pulse = Math.max(0, station.pulse - (running ? seconds : 0));
    const key = customer ? `${customer.id}:${JSON.stringify(customer.basket)}` : null;
    if (key !== station.key) {
      clearCargo(station); station.key = key; station.scanned = 0; station.pulse = 0;
      if (customer) for (const item of customer.basket) for (let n = 0; n < item.quantity; n++) {
        const unit = productUnit(state.products[item.index], station.cargo.children.length, box, material);
        unit.scale.setScalar(.85); unit.userData.productId = state.products[item.index].id; station.cargo.add(unit);
      }
    }
    if (customer && actor) {
      const progress = checkoutProgress(customer, fraction);
      if (progress.scanned > station.scanned) { station.pulse = .28; if (running) beep(); }
      station.scanned = progress.scanned;
      station.group.userData.checkoutPhase = progress.phase; station.group.userData.scannedArticles = progress.scanned;
      station.group.updateWorldMatrix(true, false); actor.group.updateWorldMatrix(true, true);
      station.cargo.children.forEach((unit, index) => {
        const step = progress.articles[index], cartUnit = actor.cartContents.children[index];
        const inCart = step.loading === 0 || step.scanning === 1;
        if (cartUnit) cartUnit.visible = inCart;
        unit.visible = !inCart;
        if (!unit.visible || !cartUnit) return;
        cartUnit.getWorldPosition(cartPosition);
        const beltX = station.automatic ? 0 : -.92 + Math.min(.8, step.scanning) / .8 * 1.24;
        beltPosition.set(beltX, 1.12, (index % 3 - 1) * .26); station.group.localToWorld(beltPosition);
        if (step.loading < 1) {
          position.lerpVectors(cartPosition, beltPosition, step.loading); position.y += Math.sin(step.loading * Math.PI) * .4;
        } else if (step.scanning >= .8) {
          const packing = (step.scanning - .8) / .2;
          position.lerpVectors(beltPosition, cartPosition, packing); position.y += Math.sin(packing * Math.PI) * .25;
        } else position.copy(beltPosition);
        unit.position.copy(position);
      });
      if (!station.automatic) station.stripes.forEach((stripe, i) => { stripe.position.x = -.98 + ((i * .2 + progress.elapsed * .45) % 1.2); });
    } else { station.group.userData.checkoutPhase = 'idle'; station.group.userData.scannedArticles = 0; }
    station.bip.visible = station.pulse > 0; station.scan.material = material(station.pulse > 0 ? 0xc0ff83 : 0x662f2f);
  }
  function beginPayment(actor) {
    const amount = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(actor.customer.value);
    const sprite = textSprite(`✓ ${amount}`, { color: '#edffcf', background: '#245738ed', width: 384, height: 112, size: 46, worldWidth: 2.1 });
    sprite.name = 'customer-payment'; sprite.userData.amount = actor.customer.value;
    sprite.position.set(0, 1.65, .56); sprite.renderOrder = 20; actor.group.add(sprite);
    actor.payment = { sprite, elapsed: 0, width: sprite.scale.x, height: sprite.scale.y };
  }
  function updatePayment(actor, seconds, running) {
    if (!actor.payment) return false;
    const payment = actor.payment; if (running) payment.elapsed += seconds;
    const t = Math.min(1, payment.elapsed / 1.5), pulse = 1 + .12 * Math.sin(t * Math.PI);
    payment.sprite.position.y = 1.65 + t * .65; payment.sprite.scale.set(payment.width * pulse, payment.height * pulse, 1);
    payment.sprite.material.opacity = Math.min(1, (1 - t) * 4);
    actor.arms[0].rotation.x = -.9; actor.arms[1].rotation.x = -.65;
    if (t >= 1) {
      actor.group.remove(payment.sprite); payment.sprite.material.map.dispose(); payment.sprite.material.dispose(); actor.payment = null;
    }
    return payment.elapsed < .2;
  }
  function dispose() {
    document.removeEventListener('pointerdown', unlockAudio); document.removeEventListener('keydown', unlockAudio);
    audio?.close().catch(() => {});
  }
  return { station, updateStation, beginPayment, updatePayment, dispose, setSound: enabled => { soundEnabled = enabled; if (enabled) unlockAudio(); } };
}
