// BurgerFront — the three short chains added later: nuggets (chicken → nugget fryer), salad (garden → salad bar), coffee (beans → coffee
// machine). Buys everything by standing on the tiles, lets the staff work, and checks the shelves fill and the customers buy.
// Usage: node scripts/arcade-bots/burger-products.mjs
let seed = 7; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const E = await import('../../dist/arcade-engine.js');
const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } console.log('ok', m); };
const NEW = ['nuggets', 'salad', 'coffee'], still = { x: 0, z: 0 };
const base = [...E.STAFF_IDS, ...E.UNLOCKS.map(u => u.id)].filter(id => !NEW.includes(id));
const s = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries(base.map(id => [id, true])) }); s.eventTimer = 1e12; s.money = 4000;
assert(E.visibleUnlocks(s).some(u => u.id === 'nuggets') && E.visibleUnlocks(s).some(u => u.id === 'coffee') && E.visibleUnlocks(s).some(u => u.id === 'salad'), 'les trois cases nouvelles sont proposées');
for (const id of NEW) { const u = E.UNLOCKS.find(x => x.id === id); s.player.x = u.pos[0]; s.player.z = u.pos[1]; for (let t = 0; t < 30 && !s.unlocked[id]; t += .05) E.stepArcade(s, .05, still); assert(s.unlocked[id], `${u.name} acheté en restant sur la case`); }
assert(E.PRODUCTS.includes('nuggets') && E.PRODUCTS.includes('salad') && E.PRODUCTS.includes('coffee'), 'les nouveaux produits sont à la vente');
// Staff for each chain (an "Employé" can run a whole chain).
for (const m of ['nuggets', 'salad', 'coffee']) { const h = s.helpers.find(x => !x.robot && !['nuggets', 'salad', 'coffee'].includes(x.loop)); const n = s.nextId++; s.helpers.push({ ...structuredClone(h), id: n, name: 'Employé ' + m, loop: m, step: 0, carry: [], station: null }); }
s.player.x = -6.4; s.player.z = -4.6; s.money = 2000;
const seen = new Set(), morn = { n: 0, c: 0 }, aft = { n: 0, c: 0 }; let served = 0, boughtNew = { nuggets: 0, salad: 0, coffee: 0 }, morningCoffee = 0, afternoonCoffee = 0, lettuce = 0, chicken = 0, beans = 0; const shelfMax = { nuggets: 0, salad: 0, coffee: 0 };
for (let t = 0; t < E.DAY * 3; t += .05) { E.stepArcade(s, .05, still);
  for (const k of NEW) shelfMax[k] = Math.max(shelfMax[k], s.shelves[k]);
  for (const c of s.customers) for (const k of NEW) if (c.got[k] > (c._g?.[k] ?? 0)) { boughtNew[k] += c.got[k] - (c._g?.[k] ?? 0); c._g = { ...(c._g ?? {}), [k]: c.got[k] }; }
  for (const c of s.customers) if (!seen.has(c.id)) { seen.add(c.id); const am = E.hourOf(s) < 11; (am ? morn : aft).n++; if (c.wants.coffee) (am ? morn : aft).c++; }
  for (const h of s.helpers) { if (h.carry.includes('lettuce')) lettuce++; if (h.carry.includes('chicken')) chicken++; if (h.carry.includes('beans')) beans++; } }
assert(lettuce > 0 && chicken > 0 && beans > 0, 'les employés récoltent la salade et portent poulet et café aux machines');
assert(shelfMax.nuggets > 0 && shelfMax.salad > 0 && shelfMax.coffee > 0, `les étagères se garnissent : ${JSON.stringify(shelfMax)}`);
assert(boughtNew.nuggets > 0 && boughtNew.salad > 0 && boughtNew.coffee > 0, `les clients achètent les nouveaux produits : ${JSON.stringify(boughtNew)}`);
assert(morn.n > 5 && aft.n > 5 && morn.c / morn.n > 2 * (aft.c / aft.n), `le café se demande surtout le matin (${morn.c}/${morn.n} clients contre ${aft.c}/${aft.n} l’après-midi)`);
const t2 = E.loadArcade(JSON.parse(JSON.stringify(s))); for (let i = 0; i < 400; i++) E.stepArcade(t2, .05, still);
assert(t2.unlocked.coffee && t2.plots.some(p => p.zone === 3), 'sauvegarde et rechargement avec les nouveaux produits');
const old = E.createArcade(); delete old.shelves.nuggets; old.plots = old.plots.filter(p => p.zone !== 3); const t3 = E.loadArcade(JSON.parse(JSON.stringify(old)));
assert(t3.plots.filter(p => p.zone === 3 && !p.tier).length === 4 && t3.plots.filter(p => p.tier).length === 4 && t3.shelves.nuggets === 0, 'une ancienne sauvegarde reçoit le potager et les nouvelles étagères');

// Industrial levels: every new chain can be upgraded several times (chicken feed, salad fertiliser and greenhouse, coffee beans).
{ const base2 = [...E.STAFF_IDS, ...E.UNLOCKS.map(u => u.id)], g = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries(base2.map(id => [id, true])) }); g.eventTimer = 1e12; g.money = 1e6;
  const LV = ['chickenFeed', 'saladFert', 'serre', 'beanRoast'], tiles = () => E.visibleUnlocks(g).filter(u => LV.includes(u.id)).map(u => u.id);
  assert(LV.every(id => tiles().includes(id)), 'les quatre améliorations sont proposées une fois les chaînes ouvertes');
  const n0 = E.UNLOCKS.length, fresh = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: { cashier: true } });
  assert(!E.visibleUnlocks(fresh).some(u => LV.includes(u.id)), 'rien de tout ça avant d’avoir ouvert la chaîne');
  const t0 = { grow: E.growTime(g, g.plots.find(p => p.zone === 3)), cap: E.sourceCap(g, 'chicken'), beans: E.sourceCap(g, 'beans'), nugget: E.stationTime(g, 'nugget'), coffee: E.stationTime(g, 'coffee'), salad: E.stationTime(g, 'saladbar') };
  const open0 = g.plots.filter(p => p.zone === 3 && E.plotOpen(g, p)).length;
  const buy = id => { const u = E.visibleUnlocks(g).find(x => x.id === id); if (!u) return false; g.player.x = u.pos[0]; g.player.z = u.pos[1]; const b = E.lvl(g, id); for (let t = 0; t < 40 && E.lvl(g, id) === b; t += .05) E.stepArcade(g, .05, still); return E.lvl(g, id) === b + 1; };
  for (const id of ['chickenFeed', 'saladFert', 'serre', 'beanRoast']) assert(buy(id), `${id} niveau 1 acheté en restant sur la case`);
  const plot3 = g.plots.find(p => p.zone === 3);
  assert(E.growTime(g, plot3) < t0.grow && Math.abs(E.growTime(g, plot3) / t0.grow - .85) < 1e-9, 'engrais : les salades poussent 15 % plus vite');
  assert(E.growTime(g, g.plots[0]) === (g.unlocked.water ? 3.5 : 6), 'l’engrais ne touche pas les pommes de terre');
  assert(E.sourceCap(g, 'chicken') > t0.cap && E.sourceCap(g, 'beans') > t0.beans, 'poulet et café : plus de stock à la livraison');
  assert(E.stationTime(g, 'nugget') < t0.nugget && E.stationTime(g, 'coffee') < t0.coffee && E.stationTime(g, 'saladbar') < t0.salad, 'les machines de la chaîne vont plus vite');
  assert(g.plots.filter(p => p.zone === 3 && E.plotOpen(g, p)).length === open0 + 2, 'la serre ouvre deux carrés de salade en plus');
  assert(buy('serre') && g.plots.filter(p => p.zone === 3 && E.plotOpen(g, p)).length === open0 + 4 && !E.visibleUnlocks(g).some(u => u.id === 'serre'), 'deuxième niveau de serre : quatre carrés en plus, puis plus rien à acheter');
  for (let i = 0; i < 5; i++) buy('chickenFeed');
  assert(E.lvl(g, 'chickenFeed') === 6 && !E.visibleUnlocks(g).some(u => u.id === 'chickenFeed'), 'six niveaux d’alimentation du poulet, pas un de plus');
  // The delivery really arrives faster: the same two minutes bring more chicken at level 6 than at level 0.
  const run = lvl => { const h = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries(base2.map(id => [id, true])) }); h.eventTimer = 1e12; h.levels.chickenFeed = lvl; let got = 0, prev = 0; for (let t = 0; t < 60; t += .05) { E.stepArcade(h, .05, still); h.sources.chicken.n = Math.min(h.sources.chicken.n, 1e9); if (h.sources.chicken.n > prev) got += h.sources.chicken.n - prev; prev = h.sources.chicken.n; if (prev >= E.sourceCap(h, 'chicken')) { h.sources.chicken.n = 0; prev = 0; } } return got; };
  assert(run(6) > run(0) * 1.5, 'au niveau 6 le poulet arrive bien plus vite');
  // An old save that never had the greenhouse gets its beds (hidden until bought).
  const old = JSON.parse(JSON.stringify(g)); old.plots = old.plots.filter(p => !p.tier); old.levels.serre = 0; const o = E.loadArcade(old);
  assert(o.plots.filter(p => p.tier).length === 4 && o.plots.filter(p => p.zone === 3 && E.plotOpen(o, p)).length === open0, 'une ancienne sauvegarde reçoit les carrés de serre, fermés'); }

// One machine per kind: no more "Friteuse 2", "Grill 3"… ; each kind grows through eight levels, and old saves with extra machines are folded into levels.
{ assert(Object.keys(E.STATIONS).every(id => !/[23]$/.test(id)) && !E.UNLOCKS.some(u => /^(fryer|grill|burger|soda)[23]$/.test(u.id)), 'plus de machines numérotées ni de cases « Friteuse 2 », « Grill 3 »…');
  const g = E.loadArcade({ schema: 1, player: {}, plots: [], money: 0, unlocked: Object.fromEntries([...E.STAFF_IDS, ...E.UNLOCKS.map(u => u.id)].map(id => [id, true])) }); g.eventTimer = 1e12; g.money = 1e7;
  const LN = { fryer: 'lvFryer', grill: 'lvGrill', burger: 'lvBurger', soda: 'lvSoda' };
  assert(Object.values(LN).every(id => E.visibleUnlocks(g).some(u => u.id === id && u.level === 1)), 'une case de niveau par machine : friteuse, grill, poste burger, soda');
  const t1 = Object.fromEntries(Object.keys(LN).map(k => [k, [E.stationTime(g, k), E.stationCaps(g, k).outCap]]));
  const buy = id => { const u = E.visibleUnlocks(g).find(x => x.id === id); if (!u) return false; g.player.x = u.pos[0]; g.player.z = u.pos[1]; const b = E.lvl(g, id); for (let t = 0; t < 40 && E.lvl(g, id) === b; t += .05) E.stepArcade(g, .05, still); return E.lvl(g, id) === b + 1; };
  for (const [k, id] of Object.entries(LN)) { assert(buy(id), `${id} niveau 1 acheté`); assert(Math.abs(E.stationTime(g, k) / t1[k][0] - .8) < 1e-9 && E.stationCaps(g, k).outCap > t1[k][1], `${k} : cadence +25 %, capacité en hausse`); }
  for (const id of Object.values(LN)) for (let i = 0; i < 9; i++) buy(id);
  assert(Object.values(LN).every(id => E.lvl(g, id) === 8 && !E.visibleUnlocks(g).some(u => u.id === id)), 'huit niveaux par machine, pas un de plus');
  assert(Math.abs(E.stationTime(g, 'fryer') / t1.fryer[0] - 1 / 3) < 1e-9, 'niveau 8 = trois machines de débit');
  // An old save that owned the second and third fryer and the second grill.
  const old = E.createArcade(); old.unlocked.fryer2 = old.unlocked.fryer3 = old.unlocked.grill2 = true; old.stations.fryer2 = { in: 5, out: 7, timer: 0, working: false }; old.stations.grill2 = { in: 3, out: 0, timer: 0, working: false };
  old.helpers.push({ id: 50, role: 'helper', name: 'x', loop: 'fries', step: 1, x: 0, z: 0, heading: 0, carry: [], cap: 6, speed: 3, cool: 0, moving: false, idle: 0, wants: null, station: 'fryer2' });
  const o = E.loadArcade(JSON.parse(JSON.stringify(old)));
  assert(E.lvl(o, 'lvFryer') === 8 && E.lvl(o, 'lvGrill') === 4 && E.lvl(o, 'lvBurger') === 0, 'ancienne partie : deux friteuses en plus = niveau 8, un grill en plus = niveau 4');
  assert(!o.stations.fryer2 && !o.stations.grill2 && o.stations.fryer.in >= 5 && o.stations.fryer.out >= 7 && o.stations.grill.in >= 3, 'le contenu des machines supprimées passe dans la machine restante');
  assert(o.helpers[0].station === null, 'un employé qui visait la friteuse 2 est libéré');
  for (let i = 0; i < 400; i++) E.stepArcade(o, .05, still); assert(true, 'la partie convertie tourne'); }
console.log('burger-products : tout est bon');
