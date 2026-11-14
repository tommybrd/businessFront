// The MarketFront holding: one account shared by every business of the group. A game keeps playing with its own `money`
// field; this module makes that field a window on the shared account. Each sync adds to the account what the game earned
// or spent since the previous sync, then hands the account back to the game, so two businesses (or two tabs) never overwrite
// each other. Cash lying in a till or a safe stays in its business until it is banked.
const KEY='marketfront-holding';
const SAVES=['flux-arcade-v1','flux-camping-v1'];
const read=()=>{try{const o=JSON.parse(localStorage.getItem(KEY));if(o&&Number.isFinite(o.money))return o;}catch{}return null;};
const write=o=>{try{localStorage.setItem(KEY,JSON.stringify(o));}catch{}};
// The first time, the account is what the player already owned in all the businesses together.
function opening(){let sum=0;for(const k of SAVES){try{const o=JSON.parse(localStorage.getItem(k));if(o&&Number.isFinite(o.money))sum+=o.money;}catch{}}return sum;}
const seen=new WeakMap();
export const holdingMoney=()=>read()?.money??null;
// Called a couple of times a second by the page that owns the game (never for a copy received from a host).
export function syncMoney(s){if(!s||s.replica||!Number.isFinite(s.money))return;
 let h=read();if(!h)h={money:Math.max(opening(),s.money)};
 if(!seen.has(s)){s.money=h.money;seen.set(s,h.money);h.at=Date.now();write(h);return;}
 h.money=Math.max(0,h.money+(s.money-seen.get(s)));s.money=h.money;seen.set(s,h.money);h.at=Date.now();write(h);}
