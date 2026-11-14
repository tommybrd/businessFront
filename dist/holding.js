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
// Exchanges between the businesses, read from the other saves (never written): a well-rated camping sends holidaymakers to the burger
// restaurant, and the burger restaurant's name on the camping's menu lifts what a meal sells for. Both fade in with the other business's progress.
const peek=k=>{try{return JSON.parse(localStorage.getItem(k));}catch{return null;}};
export function groupReport(){const a=peek(SAVES[0]),c=peek(SAVES[1]);
 const burger=c&&c.stars>=3?1+.05*(c.stars-2):1,menu=a&&a.day>=3?1+Math.min(.25,.03*(a.day-2)):1;
 return {money:holdingMoney(),arcade:a&&{day:a.day,rep:a.rep},camping:c&&{day:c.day,stars:c.stars,rep:c.rep},syn:{burger:+burger.toFixed(2),menu:+menu.toFixed(2)}};}
let synAt=0,synVal={burger:1,menu:1};
const refreshSyn=()=>{const t=Date.now();if(t-synAt>4000){synAt=t;synVal=groupReport().syn;}return synVal;};
// Called a couple of times a second by the page that owns the game (never for a copy received from a host).
export function syncMoney(s){if(!s||s.replica||!Number.isFinite(s.money))return;
 s.syn=refreshSyn();
 let h=read();if(!h)h={money:Math.max(opening(),s.money)};
 if(!seen.has(s)){s.money=h.money;seen.set(s,h.money);h.at=Date.now();write(h);return;}
 h.money=Math.max(0,h.money+(s.money-seen.get(s)));s.money=h.money;seen.set(s,h.money);h.at=Date.now();write(h);}
