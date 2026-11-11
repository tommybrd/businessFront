// BurgerFront — late-game diagnosis: everything bought (minus the unlocks given to leave out), the player idle, the
// helpers on their default missions plus a few "Employé" hires. Prints how often each shelf was empty, customers
// served and lost, and the takings per minute of opening time. Random events are off (a breakdown needs the player).
// Usage: node scripts/arcade-bots/diag.mjs [unlocks to leave out, comma-separated] [days=3] [seed=1]
//   EXTRA=<missions>   the extra hires, comma-separated (default soda,burger,fries,dessert,burger,soda)
//   ENGINE=<path>      another copy of arcade-engine.js (e.g. the one served by the site)
// Example (the soda bottleneck): EXTRA=burger,fries,burger,fries node scripts/arcade-bots/diag.mjs robotCups,robotSoda
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const [,, exclude = '', daysArg = '3', seedArg = '1'] = process.argv;
const enginePath = process.env.ENGINE ? pathToFileURL(resolve(process.env.ENGINE)).href : new URL('../../dist/arcade-engine.js', import.meta.url).href;
let seed = Number(seedArg) || 1; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const E = await import(enginePath);
const skip = new Set(exclude.split(',').filter(Boolean));
for (const id of skip) if (!E.UNLOCKS.some(u => u.id === id)) { console.error(`Achat inconnu : ${id}`); process.exit(1); }
// A schema-1 save applies every unlock in order (helpers, robots, cashiers).
let s = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries(E.UNLOCKS.map(u => u.id).filter(id => !skip.has(id)).map(id => [id, true])) });
s.levels = { equipe: 6, robotLvl: 3, pub: 4, prix: 3, stock: 2, cuisine: 3, cows: 4, kiosk: 4, sac: 3 };
// "Employé" levels: extra helpers, cloned from an existing one.
const proto = s.helpers.find(h => !h.robot);
(process.env.EXTRA ?? 'soda,burger,fries,dessert,burger,soda').split(',').filter(Boolean).forEach((loop, i) =>
  s.helpers.push({ ...structuredClone(proto), id: s.nextId++, name: 'Extra ' + (i + 1), loop, step: 0, carry: [] }));
s.schema = E.SAVE_SCHEMA; s = E.loadArcade(JSON.parse(JSON.stringify(s))); // a schema-2 reload refreshes the robots' stats
s.rep = 4.5; s.eventTimer = 1e12;
const days = Number(daysArg), dt = .05, empty = Object.fromEntries(E.PRODUCTS.map(k => [k, 0]));
const lost0 = s.lost, served0 = s.served;
let openT = 0, revenue = 0, n = 0;
const avg = { gobelets: 0, sodaEntrée: 0, sodaSortie: 0, lait: 0, glaceEntrée: 0, glaceSortie: 0 };
const sodas = Object.keys(E.STATIONS).filter(id => E.baseOf(id) === 'soda');
for (let t = 0; t < days * E.DAY; t += dt) {
  const before = s.today.revenue, day = s.day;
  E.stepArcade(s, dt, { x: 0, z: 0 });
  if (s.day === day) revenue += Math.max(0, s.today.revenue - before);
  if (!E.isOpen(s)) continue;
  openT += dt; n++;
  for (const k of E.PRODUCTS) if (s.shelves[k] === 0) empty[k] += dt;
  avg.gobelets += s.sources.cups.n; avg.lait += s.sources.milk.n;
  for (const id of sodas) { avg.sodaEntrée += s.stations[id].in; avg.sodaSortie += s.stations[id].out; }
  avg.glaceEntrée += s.stations.icecream.in; avg.glaceSortie += s.stations.icecream.out;
}
const pct = v => (100 * v / openT).toFixed(1) + ' %';
console.log(`sans : ${[...skip].join(', ') || '—'} · ${days} jours · graine ${seedArg}`);
console.log('étagère vide :', E.PRODUCTS.map(k => `${k} ${pct(empty[k])}`).join(' · '));
console.log(`servis ${s.served - served0} · perdus ${s.lost - lost0} · ${Math.round(revenue / (openT / 60))} $/min d'ouverture`);
console.log('stocks moyens :', Object.entries(avg).map(([k, v]) => `${k} ${(v / n).toFixed(1)}`).join(' · '));
console.log('robots :', s.helpers.filter(h => h.robot).map(h => h.name).join(', '));
