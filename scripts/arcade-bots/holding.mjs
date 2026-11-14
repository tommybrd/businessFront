// MarketFront — the shared holding account (dist/holding.js), played with a fake browser storage.
// Usage: node scripts/arcade-bots/holding.mjs
const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { syncMoney, holdingMoney } = await import('../../dist/holding.js');
const assert = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } console.log('ok', m); };

store.set('flux-arcade-v1', JSON.stringify({ money: 1500 })); store.set('flux-camping-v1', JSON.stringify({ money: 40 }));
const burger = { money: 1500 }, camping = { money: 40 };
syncMoney(camping);
assert(holdingMoney() === 1540 && camping.money === 1540, 'le premier compte du groupe reprend ce que le joueur avait dans chaque entreprise (1 540 $)');
syncMoney(burger);
assert(burger.money === 1540, 'le restaurant voit le même compte');
burger.money += 100; camping.money -= 50;
syncMoney(burger); syncMoney(camping);
assert(holdingMoney() === 1590, `les gains de l'un et les dépenses de l'autre s'additionnent (${holdingMoney()} $)`);
syncMoney(burger);
assert(burger.money === 1590 && camping.money === 1590, 'les deux entreprises affichent le même solde');
camping.money = -9999; syncMoney(camping);
assert(holdingMoney() === 0 && camping.money === 0, 'le compte ne passe jamais sous zéro');
camping.money += 25; syncMoney(camping); syncMoney(burger);
assert(burger.money === 25, 'ce que gagne une entreprise arrive chez l’autre');
const fresh = { money: 40 }; syncMoney(fresh);
assert(fresh.money === 25, 'une partie recommencée repart avec le compte du groupe, pas avec son argent de départ');
const copy = { money: 777, replica: true }; syncMoney(copy);
assert(copy.money === 777 && holdingMoney() === 25, 'la copie reçue d’un hôte ne touche pas au compte');
const bad = { money: NaN }; syncMoney(bad); assert(holdingMoney() === 25, 'un montant invalide est ignoré');
console.log('holding : tout est bon');
