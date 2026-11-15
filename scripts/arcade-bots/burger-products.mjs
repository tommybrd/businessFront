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
assert(t3.plots.filter(p => p.zone === 3).length === 4 && t3.shelves.nuggets === 0, 'une ancienne sauvegarde reçoit le potager et les nouvelles étagères');
console.log('burger-products : tout est bon');
