// Flux Arcade — check of the soda and ice-cream robots: their tiles show up after the helpers, stay clear of machines,
// deliveries and other tiles, are bought by standing on them; the robots then work their leg, feed the shelves, take
// missions (single legs only), survive a save/load and get the "Robots" level.
// Usage: node scripts/arcade-bots/robots.mjs   (ENGINE=<path> to check another copy of arcade-engine.js, e.g. the site's)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const enginePath = process.env.ENGINE ? pathToFileURL(resolve(process.env.ENGINE)).href : new URL('../../dist/arcade-engine.js', import.meta.url).href;
let seed = 42; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const E = await import(enginePath);
const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } console.log('ok', m); };
const NEW = ['robotCups', 'robotSoda', 'robotMilk', 'robotIce'];
const ids = E.UNLOCKS.map(u => u.id).filter(id => !NEW.includes(id));
// A schema-1 save applies every unlock in order (helpers, robots, cashiers): a quick way to reach the late game.
const s = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries(ids.map(id => [id, true])) });
s.eventTimer = 1e12; s.money = 5000;
const vis = () => E.visibleUnlocks(s).map(u => u.id);
assert(vis().includes('robotCups') && vis().includes('robotMilk') && !vis().includes('robotSoda') && !vis().includes('robotIce'), 'tuiles gobelets et lait visibles, les suivantes cachées');
// Tiles must not overlap another tile, a machine, a delivery or a work spot.
const spots = [];
for (const [id, d] of Object.entries(E.STATIONS)) spots.push([id, d.pos], [id + ' entrée', E.inZone(d.pos)], [id + ' sortie', E.outZone(d.pos)]);
for (const [k, d] of Object.entries(E.SOURCES)) spots.push([k, d.pos]);
for (const [k, d] of Object.entries(E.SHELVES)) spots.push(['étagère ' + k, E.shelfZone(d.pos)]);
for (const u of E.visibleUnlocks(s)) if (!NEW.includes(u.id)) spots.push(['tuile ' + u.id, u.pos]);
for (const id of NEW) {
  const u = E.UNLOCKS.find(x => x.id === id), d = p => Math.hypot(p[0] - u.pos[0], p[1] - u.pos[1]);
  const close = spots.filter(([, p]) => d(p) < 1.3).map(([n, p]) => `${n} à ${d(p).toFixed(2)}`);
  assert(!close.length, `${id} : rien à moins de 1,3 m${close.length ? ' (' + close.join(', ') + ')' : ''}`);
}
// Buy the four robots by standing on their tiles.
const standOn = id => { const u = E.UNLOCKS.find(x => x.id === id); s.player.x = u.pos[0]; s.player.z = u.pos[1];
  for (let t = 0; t < 30 && !s.unlocked[id]; t += .05) E.stepArcade(s, .05, { x: 0, z: 0 }); return !!s.unlocked[id]; };
const before = s.money + s.safe;
for (const id of NEW) assert(standOn(id), `${id} acheté en restant sur la tuile`);
const spent = before - (s.money + s.safe), expected = NEW.reduce((a, id) => a + E.UNLOCKS.find(u => u.id === id).price, 0);
assert(Math.abs(spent - expected) < 60, `prix payé ${Math.round(spent)} $ ≈ ${expected} $ (aux recettes de l'achat près)`);
const robots = () => s.helpers.filter(h => NEW.includes(h.robot));
assert(robots().map(h => h.loop).join() === 'cupRun,sodaRun,milkRun,iceRun', 'un robot par trajet : ' + robots().map(h => h.name).join(', '));
// They work: over two minutes they travel and the soda and ice-cream shelves get fed.
s.player.x = -6.4; s.player.z = -4.6; s.shelves.soda = 0; s.shelves.icecream = 0;
const last = robots().map(h => [h.x, h.z]), path = last.map(() => 0), fed = { soda: 0, icecream: 0 }, prev = { ...s.shelves };
for (let t = 0; t < 120; t += .05) {
  E.stepArcade(s, .05, { x: 0, z: 0 });
  robots().forEach((h, i) => { path[i] += Math.hypot(h.x - last[i][0], h.z - last[i][1]); last[i] = [h.x, h.z]; });
  for (const k of ['soda', 'icecream']) { if (s.shelves[k] > prev[k]) fed[k] += s.shelves[k] - prev[k]; prev[k] = s.shelves[k]; }
}
assert(path.every(d => d > 20), 'les robots se déplacent : ' + path.map(d => Math.round(d) + ' m').join(', '));
assert(fed.soda > 0 && fed.icecream > 0, `étagères remplies en 2 min : sodas +${fed.soda}, glaces +${fed.icecream}`);
// Missions: robots only get single legs.
const m = E.missionsFor(s, robots()[0]).map(x => x.id);
assert(m.includes('sodaRun') && m.includes('iceRun') && !m.includes('soda') && !m.includes('dessert'), 'missions des robots : trajets seuls');
assert(E.assignMission(s, robots()[0].id, 'sodaRun') && robots()[0].loop === 'sodaRun', 'changement de mission');
// Save / load, and the Robots level reaches them.
const t = E.loadArcade(JSON.parse(JSON.stringify(s)));
assert(t.helpers.filter(h => NEW.includes(h.robot)).length === 4 && NEW.every(id => t.unlocked[id]), 'save/load ok');
t.levels.robotLvl = 2; const u = E.loadArcade(JSON.parse(JSON.stringify(t)));
assert(u.helpers.filter(h => NEW.includes(h.robot)).every(h => h.cap === 9), 'niveau Robots appliqué (capacité 9)');
console.log('robots sodas et glaces : tout est bon');
