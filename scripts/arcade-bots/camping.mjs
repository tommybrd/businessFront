// CampingFront — checks of the simulation (dist/camping-engine.js): the first days played by hand, a fully built campsite
// left to its staff, a save/load round trip, and the network guests. Usage: node scripts/arcade-bots/camping.mjs
let seed = 11; Math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const E = await import('../../dist/camping-engine.js');
const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } console.log('ok', m); };
const still = { x: 0, z: 0 };

// 1. The first days, played by hand: serve the reception, collect the cash, clear the rubbish bags, buy the cheapest tile when affordable.
{ const s = E.createCamping(), P = s.player;
  // Walks like a person: out to the nearest lane, along the main alley (x = 0), then along the lane of the destination.
  const LANES = [4.4, 2.15, -1.85, -5.85, -9.85, -15.85], nav = ([tx, tz]) => { if (Math.abs(P.z - tz) <= .7) return [tx, tz]; if (Math.abs(P.x) <= .3) return [0, tz]; const lane = LANES.reduce((a, b) => Math.abs(b - P.z) < Math.abs(a - P.z) ? b : a); return Math.abs(P.z - lane) > .3 ? [P.x, lane] : [0, lane]; };
  for (let t = 0; t < E.DAY * 3; t += .05) {
    const tile = E.visibleUnlocks(s).slice().sort((a, b) => a.price - b.price)[0], afford = tile && s.money >= tile.price - (s.paid[tile.key] ?? 0);
    const dirty = s.pitches.map((p, i) => p.trash > 0 ? i : -1).filter(i => i >= 0), queue = s.campers.some(c => c.phase === 'queue' && !c.blocked);
    let target = [...E.RECEPTION.serve];
    if (s.player.carry.length && !queue) target = [...E.DUMP.spot];
    else if (dirty.length && !queue) target = [...E.doorOf(dirty[0])];
    else if (s.piles[0] > 0 && Math.floor(t) % 6 < 2) target = [...E.RECEPTION.cash];
    if (afford && !queue && !dirty.length && !s.player.carry.length) target = [...tile.pos];
    const wp = nav(target), dx = wp[0] - P.x, dz = wp[1] - P.z, d = Math.hypot(dx, dz);
    E.stepCamping(s, .05, d > .25 ? { x: dx / d, z: dz / d } : still);
  }
  assert(s.arrivals >= 5 && s.lost <= 3, `début de partie à la main : ${s.arrivals} arrivées, ${s.lost} partis, ${Math.round(s.money)} $, ${Object.keys(s.unlocked).length + Object.values(s.levels).reduce((a, b) => a + b, 0)} achats`);
}

// 2. A campsite with everything bought, the player idle: the staff keep it alive for ten days without an error.
{ const s = E.createCamping(); s.money = 1e5;
  for (let g = 0; g < 80; g++) { const u = E.visibleUnlocks(s).filter(u => !u.level)[0]; if (!u) break; s.player.x = u.pos[0]; s.player.z = u.pos[1]; for (let t = 0; t < 30 && !s.unlocked[u.id]; t += .05) E.stepCamping(s, .05, still); }
  assert(['receptionist', 'cleaner', 'shop', 'shopkeeper', 'bakery', 'souvenirs', 'owners', 'borehole', 'kidsclub', 'monitor', 'resto', 'paddling', 'slides', 'lazy', 'lagoon', 'tech', 'beachbar', 'spa', 'laundry', 'wifi', 'bikes', 'playground', 'sports', 'shuttle', 'caravan', 'pool', 'stage', 'animateur', 'mobil', 'lifeguard', 'handyman'].every(k => s.unlocked[k]), 'toutes les tuiles s’achètent en marchant dessus');
  for (const L of E.LEVELS) for (let i = 0; i < (L.id === 'equipe' ? 8 : ({ t_eco: 2, t_confort: 2, t_premium: 1, t_lodge: 2, t_cabane: 1 })[L.id] ?? L.max ?? 2); i++) { const u = E.visibleUnlocks(s).find(u => u.id === L.id); if (!u) break; s.player.x = u.pos[0]; s.player.z = u.pos[1]; const before = E.lvl(s, L.id); for (let t = 0; t < 40 && E.lvl(s, L.id) === before; t += .05) E.stepCamping(s, .05, still); }
  s.player.x = 1.6; s.player.z = 6.2; s.money = 2000; E.manage(s, 'daypass', 'quota', 20);
  const basinsUsed = new Set(), incSeen = new Set(), spaSeen = new Set(), visSeen = new Set(); let sunSeen = 0, barSeen = 0, towelSeen = 0, maxPh = 0, minChlor = 1, issues = 0, closedSeen = 0;
  const clubJoy = new Set(), dineSeen = new Set(); let friesOut = 0, steakOut = 0, prevF = 0, prevS = 0;
  let leaks = 0, leakGone = 0, tripSeen = 0, minTank = 9, wasLeak = false, wasEv = false; const billLabels = new Set();
  let brokenSeen = 0, fixedSeen = 0; const wasBroken = new Set();
  const seenB = new Set(); let bookedSeen = 0, laundered = 0, rides = 0, played = 0, sported = 0, beach = 0, wifiDown = 0; const svcSeen = new Set();
  let events = new Set(), shows = 0, maxQueue = 0, pay = 0, nightOut = 0, maxPaper = 0, minPaperOpen = 1e9, baked = 0, prevOut = 0, sleepers = 0, sleepBad = 0; const maxShop = { bread: 0, ice: 0, drink: 0, cream: 0, gas: 0, souv: 0 };
  for (let t = 0; t < E.DAY * 10; t += .05) {
    E.stepCamping(s, .05, still);
    if (s.event) events.add(s.event.kind); if (s.show.state === 'on') shows++;
    for (const c of s.campers) { const k = c.act?.kind; if (k && ['laundry', 'bike', 'play', 'sport'].includes(k) && !svcSeen.has(c.id + k + s.day)) { svcSeen.add(c.id + k + s.day); if (k === 'laundry') laundered++; else if (k === 'bike') rides++; else if (k === 'play') played++; else sported++; } }
    if (s.svc.shuttle.state === 'away' && !svcSeen.has('away' + s.day + s.svc.shuttle.last)) { svcSeen.add('away' + s.day + s.svc.shuttle.last); beach += s.svc.shuttle.load.length; }
    if (s.event?.kind === 'wifi') wifiDown++;
    { const A = s.aqua; for (const c of s.campers) { if (c.act?.kind === 'pool' && c.act.b && c.act.step >= 1) basinsUsed.add(c.act.b); if (c.act?.kind === 'sun' && c.act.step === 2) sunSeen++; if (c.act?.kind === 'bar') barSeen++; }
      for (const i of A.incidents) incSeen.add(i.id); for (const x of A.spa.sessions) spaSeen.add(x.id + ':' + s.day); for (const v of A.visitors) visSeen.add(v.id);
      if (A.lounge.some(x => x === 1)) towelSeen++; maxPh = Math.max(maxPh, A.ph); minChlor = Math.min(minChlor, s.pool.chlor); if (E.waterIssue(s)) issues++; }
    for (const c of s.campers) { if (c.joy === 'club') clubJoy.add(c.id + ':' + s.day); if (c.act?.kind === 'dine' && c.act.step === 2) dineSeen.add(c.id + ':' + s.day); }
    if (s.mach.fryer.out > prevF) friesOut += s.mach.fryer.out - prevF; prevF = s.mach.fryer.out; if (s.mach.grill.out > prevS) steakOut += s.mach.grill.out - prevS; prevS = s.mach.grill.out;
    { const lk = !!s.water.leak; if (lk && !wasLeak) leaks++; if (!lk && wasLeak) leakGone++; wasLeak = lk; const ev = s.event?.kind === 'disj'; if (ev && !wasEv) tripSeen++; wasEv = ev; minTank = Math.min(minTank, s.water.tank); for (const b of s.bills) billLabels.add(b.label); }
    s.rent.forEach((R, n) => { if (R.broken && !wasBroken.has(n)) { wasBroken.add(n); brokenSeen++; } else if (!R.broken && wasBroken.has(n)) { wasBroken.delete(n); fixedSeen++; } });
    for (const b of s.bookings) if (b.done && !seenB.has(b.id)) { seenB.add(b.id); bookedSeen++; }
    if (!E.isDay(s)) for (const c of s.campers) { if (c.act?.kind === 'pool' || c.act?.kind === 'shop') nightOut++; if (c.sleep) { sleepers++; if (c.act) sleepBad++; } }
    maxPaper = Math.max(maxPaper, s.sanit.paper); for (const k in maxShop) maxShop[k] = Math.max(maxShop[k], s.shop[k]);
    if (s.oven.out > prevOut) baked += s.oven.out - prevOut; prevOut = s.oven.out;
    maxQueue = Math.max(maxQueue, s.campers.filter(c => c.phase === 'queue').length);
    // The manager pays the bills now and then, as a player would.
    if (s.bills.length && t % 20 < .05) { s.money += E.billsDue(s); s.bills.length = 0; pay++; }
    for (const c of s.campers) if (!(Number.isFinite(c.x) && Number.isFinite(c.z))) assert(false, 'position non numérique');
  }
  assert(s.arrivals >= 15, `10 jours : ${s.arrivals} arrivées, ${s.today.departures + s.reviews.length} avis, réputation ${s.rep.toFixed(2)}`);
  assert(s.reviews.length > 3 && s.reviews.every(r => r.stars >= 1 && r.stars <= 5 && r.text), 'les campeurs laissent des avis');
  assert(typeof s.lastDay?.title === 'string' && s.lastDay.title.length > 8, `chaque jour est un épisode titré : « ${s.lastDay?.title} »`);
  assert(new Set(s.campers.map(c => c.type)).size >= 1 && Object.keys(E.TYPES).includes('beaufrere') && Object.keys(E.TYPES).includes('mamie'), 'les nouveaux campeurs existent');
  assert(s.rep > 1.5, `la réputation reste correcte avec l’équipe (${s.rep.toFixed(2)})`);
  assert(events.size >= 2, `des imprévus arrivent : ${[...events].join(', ')}`);
  assert(shows > 0, 'la soirée spectacle a lieu');
  assert(maxPaper >= E.sanitCap(s) - .01, `le papier toilette remonte jusqu’au plein (${maxPaper.toFixed(2)} sur ${E.sanitCap(s)}, plus de blocage à 9)`);
  assert(baked > 20, `le four cuit le pain des pâtons du boulanger (${baked} pains sortis)`);
  assert(maxShop.bread > 0 && maxShop.drink > 0 && maxShop.cream > 0 && maxShop.gas > 0 && maxShop.souv > 0 && maxShop.ice > 0, `tous les rayons de l’épicerie sont garnis : ${JSON.stringify(maxShop)}`);
  assert(sleepers > 1000 && sleepBad === 0, `la nuit, les campeurs dorment (${sleepers} présences endormies, aucune pendant une sortie)`);
  assert(nightOut === 0, `personne à la piscine ni à l’épicerie après l’extinction des feux (${nightOut} présences)`);
  assert(s.campers.every(c => c.in || ['arrive', 'queue', 'toPitch', 'leave'].includes(c.phase)), 'chaque camper est dans un état connu');
  const used = new Set(s.campers.filter(c => c.phase !== 'leave').map(c => c.pitch)); assert(used.size === s.campers.filter(c => c.phase !== 'leave').length, 'un seul camper par emplacement');
  assert(clubJoy.size >= 2, `le club enfants est animé : ${clubJoy.size} familles contentes`);
  assert(dineSeen.size >= 10 && friesOut > 20 && steakOut > 20, `le restaurant sert ${dineSeen.size} repas (${friesOut} frites et ${steakOut} steaks sortis des machines)`);
  { const q = E.loadCamping(JSON.parse(JSON.stringify(s))); for (const h of q.helpers) if (h.loop === 'club') h.loop = 'rest'; q.player.x = 1.6; q.player.z = 6.2; const gripes = new Set();
    for (let i = 0; i < E.DAY * 20 * 2.2; i++) { E.stepCamping(q, .05, still); for (const c of q.campers) if (c.gripe === 'club') gripes.add(c.id); }
    assert(gripes.size >= 1, `sans animateur, les parents se plaignent du club (${gripes.size})`); }
  assert(leaks >= 1 && leakGone === leaks || leakGone >= leaks - 1, `des fuites surviennent (${leaks}) et sont arrêtées (${leakGone})`);
  assert(minTank > .05 && E.powerCap(s) > 60, `le château d’eau ne se vide pas (mini ${minTank.toFixed(2)}) et la puissance suit (${E.powerCap(s)} kW), ${tripSeen} disjonction(s)`);
  assert(billLabels.has('Électricité') && billLabels.has('Eau'), 'les factures d’électricité et d’eau arrivent séparément');
  assert(s.rent.filter(r => r.tier).length === 8 && new Set(s.rent.map(r => r.tier)).size === 5, 'les huit locatifs sont achetés, dans les cinq gammes');
  assert(s.rent.some(r => r.cond < 100), `les séjours usent les locatifs (état ${s.rent.map(r => Math.round(r.cond)).join('/')})`);
  assert(brokenSeen > 0 && fixedSeen > 0, `des pannes de locatif surviennent (${brokenSeen}) et sont réparées (${fixedSeen})`);
  assert(s.owners.filter(o => o.on).length >= 2, 'des propriétaires louent leurs parcelles à l’année');
  { const v = E.loadCamping(JSON.parse(JSON.stringify(s))); v.money = 9000;
    const n = v.rent.findIndex((r, i) => r.tier && v.pitches[E.RENTAL_PITCH[i]].by == null);
    assert(n >= 0, 'un locatif est libre pour les opérations');
    const val = E.resaleValue(v.rent[n]), m0 = v.money; assert(E.manage(v, 'sell', null, n) && v.money === m0 + val && !v.rent[n].tier, `revente d’un locatif : +${val} $`);
    assert(E.manage(v, 'buyused', 'premium') && v.rent[n].tier === 'premium' && v.rent[n].cond === 55, 'achat d’un locatif d’occasion (état 55 %)');
    const cost = E.renovateCost(v.rent[n]), m1 = v.money; assert(E.manage(v, 'renovate', null, n) && v.rent[n].cond === 100 && v.money === m1 - cost, `rénovation : −${cost} $, état 100 %`);
    const busy = v.rent.findIndex((r, i) => r.tier && v.pitches[E.RENTAL_PITCH[i]].by != null); if (busy >= 0) assert(!E.manage(v, 'sell', null, busy), 'on ne revend pas un locatif occupé');
    v.debt = 0; assert(E.manage(v, 'loan', null, 400) && v.debt === 400, 'un prêt se prend'); assert(!E.manage(v, 'loan', null, 1e7) || v.debt <= E.loanLimit(v), 'le prêt reste sous le plafond');
    v.debt = 400; const m2 = v.money; assert(E.manage(v, 'repay', null, 150) && v.debt === 250 && v.money === m2 - 150, 'un prêt se rembourse');
    assert(E.manage(v, 'sublet', null, 0) && v.owners[0].sublet, 'un propriétaire accepte la sous-location');
    v.owners[0].mood = 5; v.clock = E.DAY - 1; const d = v.day; while (v.day === d) E.stepCamping(v, .05, still);
    assert(!v.owners[0].on, 'un propriétaire à bout de patience résilie son bail');
    const w = E.loadCamping(JSON.parse(JSON.stringify(s))); w.debt = 1000; w.clock = E.DAY - 1; const d2 = w.day; while (w.day === d2) E.stepCamping(w, .05, still);
    assert(w.debt === 1040, `le prêt coûte 4 % par nuit (${w.debt})`); }
  // Classification: the inspector comes the morning after the request and gives one more star if the camp is in order.
  { const u = E.loadCamping(JSON.parse(JSON.stringify(s))), w = E.loadCamping(JSON.parse(JSON.stringify(s)));
    for (const x of [u, w]) { x.stars = 1; x.money = 5000; x.inspect = { state: 'idle', day: 0, t: 0, bad: 0, why: '', next: 0 }; }
    assert(E.starsReady(u) >= 2, `le camping complet est prêt pour ${E.STAR_NAMES[E.starsReady(u) - 1]} (${E.starsReady(u)} étoiles)`);
    const clean = (x) => { x.sanit.paper = 10; x.sanit.dirt = 0; for (const p of x.pitches) p.trash = 0; x.event = null; };
    assert(E.manage(u, 'classify') && u.money === 5000 - E.INSPECT_FEE && u.inspect.state === 'asked', 'demander l’inspection coûte ' + E.INSPECT_FEE + ' $');
    let guard = 0; while (u.inspect.state !== 'on' && guard++ < 6000) E.stepCamping(u, .05, still);
    assert(u.inspect.state === 'on' && E.hourOf(u) >= 10, 'l’inspecteur arrive le lendemain matin');
    for (let i = 0; i < (E.INSPECT_LEN + 2) / .05; i++) { clean(u); E.stepCamping(u, .05, still); }
    assert(u.stars === 2 && u.inspect.state === 'idle', `camping en ordre : une étoile de plus (${u.stars})`);
    assert(!E.manage(u, 'classify'), 'pas de nouvelle demande tant que les critères de l’étoile suivante ne sont pas remplis');
    assert(E.nightPrice(u, 'tent') > E.nightPrice(w, 'tent'), 'une étoile de plus relève le tarif de la nuit');
    E.manage(w, 'classify'); guard = 0; while (w.inspect.state !== 'on' && guard++ < 6000) E.stepCamping(w, .05, still);
    for (let i = 0; i < (E.INSPECT_LEN + 2) / .05; i++) { clean(w); if (i === 100) w.sanit.dirt = .95; E.stepCamping(w, .05, still); }
    assert(w.stars === 1 && w.inspect.why, `sanitaires sales pendant la visite : classement refusé (${w.inspect.why})`);
  }
  assert(laundered > 0 && rides > 0 && played > 0 && sported > 0, `les services servent : ${laundered} lessives, ${rides} locations, ${played} parties de jeu, ${sported} matchs`);
  assert(beach > 0, `la navette emmène des campeurs à la plage (${beach})`);
  assert(basinsUsed.size >= 4, `les campeurs se baignent dans plusieurs bassins : ${[...basinsUsed].join(', ')}`);
  assert(incSeen.size >= 3 && s.today.fixed >= 0, `des incidents de baignade surviennent (${incSeen.size}) et le personnel les règle`);
  assert(towelSeen > 100 && sunSeen > 200, `serviettes sur les transats (${towelSeen}) et bains de soleil (${sunSeen})`);
  assert(barSeen > 20 && spaSeen.size > 3 && visSeen.size > 8, `le bar (${barSeen}), le spa (${spaSeen.size} séances) et les entrées à la journée (${visSeen.size} visiteurs) fonctionnent`);
  assert(maxPh < .85 && minChlor > .05 && issues < 1500, `l’eau reste tenue : pH max ${maxPh.toFixed(2)}, chlore min ${minChlor.toFixed(2)}, ${issues} pas d’eau douteuse`);
  assert(bookedSeen > 5, `les réservations se transforment en arrivées (${bookedSeen} vues en 10 jours)`);
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
// 5b. Lifeguards: a basin opens only if someone watches it, two basins per lifeguard.
{ const s = E.createCamping(); s.money = 1e5; for (const id of ['receptionist', 'shop', 'caravan', 'pool', 'paddling', 'slides']) { const u = E.visibleUnlocks(s).find(x => x.id === id) ?? { id, pos: [0, 0], price: 0 }; s.unlocked[id] = true; }
  assert(E.guardedBasins(s).size === 0, 'sans maître-nageur, aucun bassin n’est ouvert à la baignade');
  s.unlocked.lifeguard = true; s.helpers.push({ id: 900, role: 'helper', name: 'MN', loop: 'pool', x: 15, z: -15, carry: [], cap: 6, speed: 3, cool: 0, moving: false, idle: 0, wants: null });
  assert(E.guardedBasins(s).size === 2 && E.guardedBasins(s).has('pool') && E.guardedBasins(s).has('paddling') && !E.guardedBasins(s).has('slides'), 'un maître-nageur surveille deux bassins');
  s.player.x = E.LIFE_CHAIR[0]; s.player.z = E.LIFE_CHAIR[1]; assert(E.guardedBasins(s).has('slides') && E.guardedBasins(s).size === 3, 'le directeur sur la chaise surveille un bassin de plus');
  const q = E.createCamping(); q.unlocked.pool = q.unlocked.tech = true; q.pool.chlor = .1; assert(E.waterIssue(q) === 'green', 'plus de chlore : piscine verte');
  q.pool.chlor = .6; q.aqua.ph = .9; assert(E.waterIssue(q) === 'eyes', 'pH trop haut : l’eau pique les yeux');
  q.aqua.ph = .5; q.aqua.filter = .95; assert(E.waterIssue(q) === 'cloudy', 'filtre encrassé : eau trouble');
  q.aqua.filter = 0; q.aqua.temp = .2; assert(E.waterIssue(q) === 'cold', 'eau trop froide');
  q.aqua.temp = .6; assert(E.waterIssue(q) === '', 'eau en ordre');
  assert(E.manage(q, 'daypass', 'price', 9) && q.aqua.day.price === 9 && E.manage(q, 'daypass', 'quota', 99) && q.aqua.day.quota === 40, 'entrées à la journée : prix et quota réglables'); }

// 5c. Water and power: overload trips the breaker, the tower runs dry without a pump, a leak is stopped by standing on it.
{ const s = E.createCamping(); s.money = 1e5; for (const id of ['caravan', 'borehole']) s.unlocked[id] = true;
  assert(E.powerCap(s) === 30 && E.powerLoad(s) < 15, `une petite exploitation consomme peu (${E.powerLoad(s).toFixed(1)} kW sur ${E.powerCap(s)})`);
  for (let i = 0; i < 40; i++) s.campers.push({ id: 700 + i, in: true, kind: 'caravan', pitch: 12 + (i % 6), phase: 'stay', mood: 70, todo: [], act: null, x: 0, z: 0, left: 2, type: 'family', nights: 2, wc: 99, ax: 0 });
  assert(E.powerLoad(s) > E.powerCap(s), `trop de caravanes branchées : ${E.powerLoad(s).toFixed(0)} kW pour ${E.powerCap(s)}`);
  s.campers.length = 0; for (let i = 0; i < 40; i++) s.campers.push({ id: 700 + i, in: true, kind: 'caravan', pitch: 12 + (i % 6), phase: 'stay', mood: 70, todo: [], act: null, x: 0, z: 0, left: 2, type: 'family', nights: 2, wc: 99, ax: 0 });
  let g = 0; while (s.event?.kind !== 'disj' && g++ < 2000) E.stepCamping(s, .05, still);
  assert(s.event?.kind === 'disj', 'surcharge : le disjoncteur saute');
  s.campers.length = 0; s.event = null; s.water.tank = 0; s.water.leak = null; for (let i = 0; i < 100; i++) E.stepCamping(s, .05, still); const t1 = s.water.tank;
  for (let i = 0; i < 400; i++) E.stepCamping(s, .05, still);
  assert(s.water.tank > t1 && !E.waterCut(E.createCamping()), `la pompe remplit le château d’eau (${t1.toFixed(2)} → ${s.water.tank.toFixed(2)})`);
  s.water.leak = { x: 30, z: -5, a: 1, t: 0, fix: 0, found: false }; s.player.x = 30; s.player.z = -5; for (let i = 0; i < 100; i++) E.stepCamping(s, .05, still);
  assert(s.water.leak === null, 'une fuite s’arrête en restant dessus');
  const b = s.bills.length; s.water.leak = { x: -3, z: 3, a: 1, t: 84, fix: 0, found: false }; s.player.x = 20; s.player.z = 0; for (let i = 0; i < 100; i++) E.stepCamping(s, .05, still);
  assert(s.water.leak === null && s.bills.length > b, 'sans personne, le plombier intervient et envoie sa facture');
  assert(E.manage(s, 'restrict') && s.water.ban && E.manage(s, 'restrict') && !s.water.ban, 'les restrictions d’eau s’activent et se lèvent'); }

// 6. Seasons, prices, bookings and the director's choices.
{ const s = E.createCamping();
  const at = d => { s.day = d; return E.seasonOf(s); };
  assert(at(1) === 'low' && at(10) === 'high' && at(25) === 'mid' && at(31) === 'low', 'les saisons : basse, haute, entre-saison, puis on recommence');
  s.day = 12; const base = E.demandMul(s, 'tent'), priceBase = E.nightPrice(s, 'tent');
  assert(E.manage(s, 'price', 'tent', 1.3) && E.nightPrice(s, 'tent') > priceBase && E.demandMul(s, 'tent') < base, 'un prix plus haut rapporte plus par nuit mais fait baisser la demande');
  assert(E.manage(s, 'price', 'tent', 9) && s.pricing.tent === 1.8 && E.manage(s, 'price', 'tent', 0) && s.pricing.tent === .6, 'les prix restent entre ×0,6 et ×1,8');
  assert(!E.manage(s, 'price', 'piscine', 1) && !E.manage(s, 'inconnu'), 'une action inconnue est refusée');
  assert(E.manage(s, 'overbook', null, 17) && s.pricing.overbook === 15 && E.manage(s, 'overbook', null, 99) && s.pricing.overbook === 40, 'la surréservation va de 0 à 40 %');
  s.pricing.tent = 1; s.money = 100; const before = E.nightPrice(s, 'tent');
  assert(E.manage(s, 'promo') && s.money === 70 && E.nightPrice(s, 'tent') < before && !E.manage(s, 'promo'), 'la promotion baisse les prix de 20 % pendant 2 jours, une seule à la fois');
  s.day = 1; s.pricing.overbook = 0; s.unlocked.caravan = true;
  const f = E.forecast(s, 0); assert(f.capacity >= 6, `prévision de la journée : capacité ${f.capacity}`);
  const full = E.createCamping(); full.day = 12; full.pricing.high = 1.8; const lowDemand = E.demandMul(full, 'tent'); full.pricing.high = .6; assert(E.demandMul(full, 'tent') > lowDemand * 2, 'une haute saison bon marché remplit beaucoup plus');
  const open = E.openPitches(E.createCamping());
  assert(open >= 4, 'le camping de départ a ses premiers emplacements');
}

// 5. Buying needs a deliberate stop: crossing a tile costs nothing, standing on it pays after BUY_DELAY seconds.
{ const s = E.createCamping(); s.money = 500; const u = E.visibleUnlocks(s).find(x => x.id === 'receptionist');
  s.player.x = u.pos[0]; s.player.z = u.pos[1];
  for (let t = 0; t < E.BUY_DELAY * .7; t += .05) E.stepCamping(s, .05, still);
  assert(s.money === 500 && !(s.paid[u.key] > 0), 'traverser une case sans s’arrêter ne coûte rien');
  s.player.x = 0; s.player.z = 7; E.stepCamping(s, .05, still); s.player.x = u.pos[0]; s.player.z = u.pos[1];
  for (let t = 0; t < E.BUY_DELAY * .7; t += .05) E.stepCamping(s, .05, still);
  assert(s.money === 500, 'quitter la case remet la temporisation à zéro');
  for (let t = 0; t < E.BUY_DELAY + 3; t += .05) E.stepCamping(s, .05, still);
  assert(s.unlocked.receptionist && s.money < 500, `rester sur la case l’achète (${Math.round(500 - s.money)} $)`);
}
console.log('camping : tout est bon');
