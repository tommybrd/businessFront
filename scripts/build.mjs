import { copyFile, mkdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const vendor = new URL('dist/vendor/', root);
await mkdir(vendor, { recursive: true });
for (const file of ['three.module.js', 'three.core.js']) await copyFile(new URL(`node_modules/three/build/${file}`, root), new URL(file, vendor));
await copyFile(new URL('node_modules/three/examples/jsm/controls/OrbitControls.js', root), new URL('OrbitControls.js', vendor));
await copyFile(new URL('node_modules/three/LICENSE', root), new URL('THREE-LICENSE.txt', vendor));
console.log('Modules 3D préparés dans dist/vendor.');

await import('./build-save-worker.mjs');

await import('./check-built-worker.mjs');
