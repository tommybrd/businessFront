import * as THREE from 'three';

export function createKeyboardCameraControls(camera, controls, { doc = globalThis.document, win = globalThis.window } = {}) {
  const keys = new Set(), supported = new Set(['z', 'q', 's', 'd', 'a', 'e']);
  const homePosition = camera.position.clone(), homeTarget = controls.target.clone();
  const homeZoom = camera.zoom;
  const up = new THREE.Vector3(0, 1, 0);
  const editing = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(doc.activeElement?.tagName) || doc.activeElement?.isContentEditable || !!doc.querySelector('dialog[open]');
  function keydown(event) {
    const key = event.key.toLowerCase();
    if (!supported.has(key) || editing() || event.ctrlKey || event.altKey || event.metaKey) return;
    event.preventDefault(); keys.add(key);
  }
  const keyup = event => keys.delete(event.key.toLowerCase());
  const clear = () => keys.clear();
  doc.addEventListener('keydown', keydown); doc.addEventListener('keyup', keyup);
  doc.addEventListener('focusin', clear); doc.addEventListener('visibilitychange', clear); win.addEventListener('blur', clear);
  function update(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0 || editing()) return;
    const delta = Math.min(seconds, 0.25);
    const forward = controls.target.clone().sub(camera.position); forward.y = 0; forward.normalize();
    const right = forward.clone().cross(up).normalize(), direction = new THREE.Vector3();
    if (keys.has('z')) direction.add(forward);
    if (keys.has('s')) direction.sub(forward);
    if (keys.has('d')) direction.add(right);
    if (keys.has('q')) direction.sub(right);
    if (direction.lengthSq()) {
      const target = controls.target.clone().add(direction.normalize().multiplyScalar(delta * 8));
      target.x = THREE.MathUtils.clamp(target.x, -17, 17); target.z = THREE.MathUtils.clamp(target.z, -14, 14);
      camera.position.add(target.clone().sub(controls.target)); controls.target.copy(target);
    }
    const turn = (keys.has('e') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    if (turn) camera.position.sub(controls.target).applyAxisAngle(up, turn * delta * 0.9).add(controls.target);
    camera.lookAt(controls.target);
  }
  return {
    update,
    reset() { clear(); camera.position.copy(homePosition); controls.target.copy(homeTarget); camera.zoom = homeZoom; camera.updateProjectionMatrix(); camera.lookAt(controls.target); },
    dispose() { doc.removeEventListener('keydown', keydown); doc.removeEventListener('keyup', keyup); doc.removeEventListener('focusin', clear); doc.removeEventListener('visibilitychange', clear); win.removeEventListener('blur', clear); },
  };
}
