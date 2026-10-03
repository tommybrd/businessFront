import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKeyboardCameraControls } from '../dist/camera-controls.js';

function setup() {
  const doc = new EventTarget(), win = new EventTarget();
  doc.activeElement = { tagName: 'BODY' }; doc.querySelector = () => null;
  const camera = new THREE.OrthographicCamera(); camera.position.set(21, 24, 28);
  const controls = { target: new THREE.Vector3() };
  const keyboard = createKeyboardCameraControls(camera, controls, { doc, win });
  const key = (type, value) => { const event = new Event(type, { cancelable: true }); Object.assign(event, { key: value }); doc.dispatchEvent(event); };
  return { doc, win, camera, controls, keyboard, key };
}

test('ZQSD move the camera and target together, with opposite keys restoring position', () => {
  const { camera, controls, keyboard, key } = setup();
  const start = camera.position.clone(), offset = camera.position.clone().sub(controls.target);
  for (const [first, opposite] of [['z', 's'], ['q', 'd']]) {
    key('keydown', first); keyboard.update(0.2); key('keyup', first);
    assert.ok(camera.position.distanceTo(start) > 0.1);
    assert.ok(camera.position.clone().sub(controls.target).distanceTo(offset) < 1e-8);
    key('keydown', opposite); keyboard.update(0.2); key('keyup', opposite);
    assert.ok(camera.position.distanceTo(start) < 1e-8);
  }
  keyboard.dispose();
});

test('A and E rotate around the same target, and reset restores camera and zoom', () => {
  const { camera, controls, keyboard, key } = setup(); const start = camera.position.clone();
  const radius = camera.position.distanceTo(controls.target);
  key('keydown', 'a'); keyboard.update(0.25); key('keyup', 'a');
  assert.ok(camera.position.distanceTo(start) > 1); assert.ok(Math.abs(camera.position.distanceTo(controls.target) - radius) < 1e-8);
  key('keydown', 'e'); keyboard.update(0.25); key('keyup', 'e'); assert.ok(camera.position.distanceTo(start) < 1e-8);
  camera.zoom = 1.7; key('keydown', 'z'); keyboard.update(0.25); keyboard.reset(); keyboard.update(0.25);
  assert.equal(camera.zoom, 1); assert.ok(camera.position.distanceTo(start) < 1e-8); keyboard.dispose();
});

test('typing in inputs and viewing a dialog do not move the camera; blur clears held keys', () => {
  const { doc, win, camera, keyboard, key } = setup(); const start = camera.position.clone();
  doc.activeElement = { tagName: 'INPUT' }; key('keydown', 'z'); keyboard.update(0.25); assert.deepEqual(camera.position, start);
  doc.activeElement = { tagName: 'BODY' }; doc.querySelector = () => ({}); key('keydown', 'e'); keyboard.update(0.25); assert.deepEqual(camera.position, start);
  doc.querySelector = () => null; key('keydown', 'z'); win.dispatchEvent(new Event('blur')); keyboard.update(0.25); assert.deepEqual(camera.position, start);
  keyboard.dispose();
});
