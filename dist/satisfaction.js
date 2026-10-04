export const satisfactionGrade=score=>score>=95?'A':score>=85?'B':score>=70?'C':score>=50?'D':'E';
export function newSatisfactionMetrics(score=100,minute=450) {
  return {opening:score,since:minute,requests:0,fulfilled:0,shortages:Array(6).fill(0),missing:Array(6).fill(0),waitingCustomers:0,waitMinutes:0,maxWait:0,waitDepartures:0,stockDepartures:0,closingDepartures:0,stockPenalty:0,waitPenalty:0,paymentRecovery:0};
}
export const satisfactionMetrics=s=>s.satisfactionDetails||=(newSatisfactionMetrics(s.satisfaction,s.minute));
export function adjustSatisfaction(s,reason,delta) {
  const m=satisfactionMetrics(s),before=s.satisfaction;s.satisfaction=Math.max(0,Math.min(100,before+delta));m[reason]+=Math.abs(s.satisfaction-before);
}
export function satisfactionReport(s) {
  const m=satisfactionMetrics(s),waiting=s.customers.filter(c=>c.stage==='queue');
  const availability=m.requests?Math.round(m.fulfilled/m.requests*100):null,averageWait=m.waitingCustomers?m.waitMinutes/m.waitingCustomers:0,currentMaxWait=waiting.reduce((n,c)=>Math.max(n,c.wait),0),offered=s.products.filter(p=>p.capacity>0),unavailable=offered.filter(p=>p.shelf===0).map(p=>p.id);
  const completed=s.sold+s.lost+(s.online?.daily?.drive??0)+(s.online?.daily?.web??0);
  const indicators={availability:{score:availability??(offered.length?(offered.length-unavailable.length)/offered.length*100:0)},waiting:{score:Math.max(0,100-Math.max(averageWait,currentMaxWait)*7)},purchases:{score:completed?Math.max(0,100-s.lost/completed*100):100}};
  for(const indicator of Object.values(indicators))indicator.grade=satisfactionGrade(indicator.score);
  const globalScore=indicators.availability.score*.5+indicators.waiting.score*.3+indicators.purchases.score*.2;
  return {...m,score:s.satisfaction,globalScore,grade:satisfactionGrade(globalScore),indicators,availability,averageWait,currentQueue:waiting.length,currentMaxWait,unavailable};
}
