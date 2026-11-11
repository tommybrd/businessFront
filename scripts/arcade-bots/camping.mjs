// Flux Camping — checks of the simulation (dist/camping-engine.js): the first days played by hand, a fully built campsite
// left to its staff, a save/load round trip, and the network guests. Usage: node scripts/arcade-bots/camping.mjs
let seed = 11; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const E = await import('../../dist/camping-engine.js');
const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } console.log('ok', m); };
const still = { x: 0, z: 0 };

// 1. The first days, played by hand: serve the reception, collect the cash, clear the rubbish bags, buy the cheapest tile when affordable.
{ const s = E.createCamping(), P = s.player;
  // Walks like a person: along the main alley (x = 0), then along the lane of the destination.
  const nav = ([tx, tz]) => Math.abs(P.z - tz) > .7 ? (Math.abs(P.x) > .3 ? [0, P.z] : [0, tz]) : [tx, tz];
  for (let t = 0; t < E.DAY * 3; t += .05) {
    const tile = E.visibleUnlocks(s).slice().sort((a, b) => a.price - b.price)[0], afford = tile && s.money >= tile.price - (s.paid[tile.key] ?? 0);
    const dirty = s.pitches.map((p, i) => p.trash > 0 ? i : -1).filter(i => i >= 0), queue = s.campers.some(c => c.phase === 'queue');
    let target = [...E.RECEPTION.serve];
    if (s.player.carry.length && !queue) target = [...E.DUMP.spot];
    else if (dirty.length && !queue) target = [...E.doorOf(dirty[0])];
    else if (s.piles[0] > 0 && Math.floor(t) % 6 < 2) target = [...E.RECEPTION.cash];
    if (afford && !queue) target = [...tile.pos];
    const wp = nav(target), dx = wp[0] - P.x, dz = wp[1] - P.z, d = Math.hypot(dx, dz);
    E.stepCamping(s, .05, d > .25 ? { x: dx / d, z: dz / d } : still);
  }
  assert(s.arrivals >= 5 && s.lost <= 3, `début de partie à la main : ${s.arrivals} arrivées, ${s.lost} partis, ${Math.round(s.money)} $, ${Object.keys(s.unlocked).length + Object.values(s.levels).reduce((a, b) => a + b, 0)} achats`);
}

// 2. A campsite with everything bought, the player idle: the staff keep it alive for ten days without an error.
{ const s = E.createCamping(); s.money = 1e5;
  for (let g = 0; g < 80; g++) { const u = E.visibleUnlocks(s).filter(u => !u.level)[0]; if (!u) break; s.player.x = u.pos[0]; s.player.z = u.pos[1]; for (let t = 0; t < 30 && !s.unlocked[u.id]; t += .05) E.stepCamping(s, .05, still); }
  assert(['receptionist', 'cleaner', 'shop', 'shopkeeper', 'caravan', 'pool', 'stage', 'animateur', 'mobil', 'lifeguard', 'handyman'].every(k => s.unlocked[k]), 'toutes les tuiles s’achètent en marchant dessus');
  for (const id of ['tents', 'caravans', 'mobils', 'sanit', 'equipe']) { const L = E.LEVELS.find(l => l.id === id); for (let i = 0; i < 3; i++) { const u = E.visibleUnlocks(s).find(u => u.id === id); if (!u) break; s.player.x = u.pos[0]; s.player.z = u.pos[1]; const before = E.lvl(s, id); for (let t = 0; t < 30 && E.lvl(s, id) === before; t += .05) E.stepCamping(s, .05, still); } }
  s.player.x = 1.6; s.player.z = 6.2; s.money = 2000;
  let events = new Set(), shows = 0, maxQueue = 0, pay = 0;
  for (let t = 0; t < E.DAY * 10; t += .05) {
    E.stepCamping(s, .05, still);
    if (s.event) events.add(s.event.kind); if (s.show.state === 'on') shows++;
    maxQueue = Math.max(maxQueue, s.campers.filter(c => c.phase === 'queue').length);
    // The manager pays the bills now and then, as a player would.
    if (s.bills.length && t % 20 < .05) { s.money += E.billsDue(s); s.bills.length = 0; pay++; }
    for (const c of s.campers) if (!(Number.isFinite(c.x) && Number.isFinite(c.z))) assert(false, 'position non numérique');
  }
  assert(s.arrivals >= 15, `10 jours : ${s.arrivals} arrivées, ${s.today.departures + s.reviews.length} avis, réputation ${s.rep.toFixed(2)}`);
  assert(s.reviews.length > 3 && s.reviews.every(r => r.stars >= 1 && r.stars <= 5 && r.text), 'les campeurs laissent des avis');
  assert(s.rep > 1.5, `la réputation reste correcte avec l’équipe (${s.rep.toFixed(2)})`);
  assert(events.size >= 2, `des imprévus arrivent : ${[...events].join(', ')}`);
  assert(shows > 0, 'la soirée spectacle a lieu');
  assert(s.campers.every(c => c.in || ['arrive', 'queue', 'toPitch', 'leave'].includes(c.phase)), 'chaque camper est dans un état connu');
  const used = new Set(s.campers.filter(c => c.phase !== 'leave').map(c => c.pitch)); assert(used.size === s.campers.filter(c => c.phase !== 'leave').length, 'un seul camper par emplacement');
  // 3. Save / load keeps the game going.
  const t = E.loadCamping(JSON.parse(JSON.stringify(s)));
  assert(t.day === s.day && t.campers.length === s.campers.length && Math.round(t.money) === Math.round(s.money), 'save/load ok');
  for (let i = 0; i < 2000; i++) E.stepCamping(t, .05, still);
  assert(t.day >= s.day, 'la partie rechargée continue');
}

// 4. A guest walks, picks up toilet paper at the supply and drops it at the toilets, like the manager.
{ const s = E.createCamping(), g = E.addGuest(s, 'p1', 'Léa');
  assert(g && s.guests.length === 1, 'un invité rejoint la partie');
  E.guestInput(s, 'p1', { ix: 0, iz: 0, x: E.SOURCES.paper.spot[0], z: E.SOURCES.paper.spot[1], h: 0 });
  for (let t = 0; t < 2; t += .05) E.stepCamping(s, .05, still);
  assert(g.carry.length > 0 && g.carry[0] === 'paper', `l’invité ramasse du papier (${g.carry.length})`);
  E.guestInput(s, 'p1', { ix: 0, iz: 0, x: E.SANIT.paper[0], z: E.SANIT.paper[1], h: 0 }); s.sanit.paper = 2;
  for (let t = 0; t < 3; t += .05) E.stepCamping(s, .05, still);
  assert(s.sanit.paper > 2 && g.carry.length < 6, 'l’invité réapprovisionne les toilettes');
  for (let i = 0; i < 3; i++) E.addGuest(s, 'q' + i, 'X'); assert(s.guests.length <= E.MAX_GUESTS, 'au plus 4 joueurs');
}
console.log('camping : tout est bon');
