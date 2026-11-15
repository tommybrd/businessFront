// BurgerFront — the team: staff are hired and let go of in the team panel (never as floor tiles), humans, robots or cashiers, each given
// a mission there. Checks the prices, what blocks a hire, that robots work their leg and feed the shelves, firing (refund), the
// network entry point (`manage`), save/load of the team and the "Robots" level.
// Usage: node scripts/arcade-bots/robots.mjs   (ENGINE=<path> to check another copy of arcade-engine.js, e.g. the site's)
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const enginePath = process.env.ENGINE ? pathToFileURL(resolve(process.env.ENGINE)).href : new URL('../../dist/arcade-engine.js', import.meta.url).href;
let seed = 42; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const E = await import(enginePath);
const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } console.log('ok', m); };
const still = { x: 0, z: 0 };

// No staff tile is left on the floor.
const staffTiles = E.UNLOCKS.filter(u => E.STAFF_IDS.includes(u.id)).map(u => u.id);
assert(!staffTiles.length && !E.LEVELS.some(l => l.id === 'equipe'), 'plus aucune case de personnel sur le plateau');

// A new game: the team starts empty, a cashier can be hired at once, humans need the field, robots need a first human.
{ const s = E.createArcade(); s.eventTimer = 1e12;
  assert(s.helpers.length === 0 && !s.cashiers.some(Boolean), 'une nouvelle partie démarre sans personnel');
  assert(E.hireBlock(s, 'cashier') === '' && E.hireBlock(s, 'human') !== '' && E.hireBlock(s, 'robot') !== '', 'dès le début : caissier possible ; employé et robot demandent de la progression');
  s.money = 10; assert(!E.manage(s, 'hire', 'cashier') && !s.cashiers[0], 'sans argent, on n’embauche pas');
  s.money = 100; assert(E.manage(s, 'hire', 'cashier') && s.cashiers[0] && s.money === 60 && s.unlocked.cashier, 'caissier embauché pour 40 $ (la suite des cases se débloque)');
  assert(E.visibleUnlocks(s).some(u => u.id === 'grill'), 'le grill apparaît une fois le premier caissier en place');
  assert(!E.manage(s, 'hire', 'cashier'), 'une seule caisse : pas de second caissier');
  assert(E.manage(s, 'fire', 'cashier', 0) && !s.cashiers[0] && s.money === 60 + 16, 'caissier renvoyé : 40 % remboursés');
  assert(!E.manage(s, 'hire', 'dieu') && !E.manage(s, 'fire', 'helper', 999) && !E.manage(s, 'hire', 5), 'demandes invalides ignorées'); }

// Late game: everything bought, no staff yet.
const ids = [...E.UNLOCKS.map(u => u.id)];
const s = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries(ids.map(id => [id, true])) });
s.eventTimer = 1e12; s.money = 20000;
assert(s.helpers.length === 0, 'une grosse partie sans personnel');
// Humans: each costs more, they take the chain that needs hands (or the one asked for), and open the next steps.
const p1 = E.hirePrice(s, 'human');
assert(E.manage(s, 'hire', 'human') && s.helpers.length === 1 && !s.helpers[0].robot && s.unlocked.helper, 'un employé embauché');
assert(E.hirePrice(s, 'human') > p1, `l’employé suivant coûte plus cher (${p1} $ puis ${E.hirePrice(s, 'human')} $)`);
assert(E.manage(s, 'hire', 'human:soda') && s.helpers[1].loop === 'soda', 'embaucher sur une chaîne précise');
assert(E.manage(s, 'hire', 'human:friesRun') && s.helpers[2].loop !== 'friesRun', 'un employé ne prend pas un simple trajet de robot');
assert(s.unlocked.helper2 && s.unlocked.helper3, 'embaucher débloque la suite (sacs des aides…)');
// Robots: only single legs, one per leg first, start at the dock.
const before = s.money;
for (const leg of ['cupRun', 'sodaRun', 'milkRun', 'iceRun']) assert(E.manage(s, 'hire', 'robot:' + leg), `robot embauché sur ${leg}`);
const robots = () => s.helpers.filter(h => h.robot);
assert(robots().map(h => h.loop).join() === 'cupRun,sodaRun,milkRun,iceRun' && s.unlocked.robotPotato, 'un robot par trajet choisi');
assert(before - s.money === 200 + 244 + 298 + 363 || before - s.money > 1000, `prix croissant des robots (${before - s.money} $ pour quatre)`);
assert(E.manage(s, 'hire', 'robot') && robots()[4].loop && E.missionsFor(s, robots()[4]).some(m => m.id === robots()[4].loop), 'robot sans choix : un trajet disponible lui est confié');
// They work: over two minutes the soda and ice-cream shelves get fed.
s.player.x = -6.4; s.player.z = -4.6; s.shelves.soda = 0; s.shelves.icecream = 0;
const four = robots().slice(0, 4), last = four.map(h => [h.x, h.z]), path = last.map(() => 0), fed = { soda: 0, icecream: 0 }, prev = { ...s.shelves };
for (let t = 0; t < 120; t += .05) { E.stepArcade(s, .05, still);
  four.forEach((h, i) => { path[i] += Math.hypot(h.x - last[i][0], h.z - last[i][1]); last[i] = [h.x, h.z]; });
  for (const k of ['soda', 'icecream']) { if (s.shelves[k] > prev[k]) fed[k] += s.shelves[k] - prev[k]; prev[k] = s.shelves[k]; } }
assert(path.every(d => d > 20), 'les robots se déplacent : ' + path.map(d => Math.round(d) + ' m').join(', '));
assert(fed.soda > 0 && fed.icecream > 0, `étagères remplies en 2 min : sodas +${fed.soda}, glaces +${fed.icecream}`);
// Missions: robots only get single legs; the placement is changed in the team.
const m = E.missionsFor(s, robots()[0]).map(x => x.id);
assert(m.includes('sodaRun') && m.includes('iceRun') && !m.includes('soda') && !m.includes('dessert'), 'missions des robots : trajets seuls');
assert(E.assignMission(s, robots()[0].id, 'sodaRun') && robots()[0].loop === 'sodaRun', 'changement de mission');
// Letting go: the worker disappears, what they carried goes back, part of the price is refunded.
const victim = s.helpers.find(h => !h.robot), n0 = s.helpers.length, m0 = s.money;
victim.carry = ['potato']; assert(E.manage(s, 'fire', 'helper', victim.id) && s.helpers.length === n0 - 1 && !s.helpers.some(h => h.id === victim.id) && s.money > m0, 'employé renvoyé et remboursé en partie');
assert(!E.manage(s, 'fire', 'helper', victim.id), 'on ne renvoie pas deux fois la même personne');
for (let t = 0; t < 20; t += .05) E.stepArcade(s, .05, still);
assert(true, 'le jeu continue après un renvoi');
// Robot cap.
while (E.manage(s, 'hire', 'robot'));
assert(robots().length === E.HIRE.robot.max && E.hireBlock(s, 'robot') !== '', `limite de ${E.HIRE.robot.max} robots`);
// Cashiers: a second till needs a second cashier.
s.cashiers[0] = null; s.cashiers[1] = null; assert(E.manage(s, 'hire', 'cashier') && E.manage(s, 'hire', 'cashier') && s.cashiers[0] && s.cashiers[1] && !E.manage(s, 'hire', 'cashier'), 'deux caisses, deux caissiers');
// Save / load keeps the team, and the Robots level reaches them.
const t = E.loadArcade(JSON.parse(JSON.stringify(s)));
assert(t.helpers.length === s.helpers.length && t.helpers.filter(h => h.robot).length === HIRE_MAX(t) && t.cashiers.filter(Boolean).length === 2, 'save/load ok');
function HIRE_MAX(x) { return x.helpers.filter(h => h.robot).length; }
t.levels.robotLvl = 2; const u = E.loadArcade(JSON.parse(JSON.stringify(t)));
assert(u.helpers.filter(h => h.robot).every(h => h.cap === 9), 'niveau Robots appliqué (capacité 9)');
// An old save (staff bought as tiles) keeps its team untouched.
const old = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: { cashier: true, helper: true, robotPotato: true } });
assert(old.cashiers[0] && old.helpers.length === 2 && old.helpers.some(h => h.robot), 'une ancienne partie garde son personnel');
console.log('robots sodas et glaces : tout est bon');
