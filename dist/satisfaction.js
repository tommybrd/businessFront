export function newSatisfactionMetrics(score=100,minute=450) {
  return {opening:score,since:minute,requests:0,fulfilled:0,shortages:Array(6).fill(0),missing:Array(6).fill(0),waitingCustomers:0,waitMinutes:0,maxWait:0,waitDepartures:0,stockDepartures:0,closingDepartures:0,stockPenalty:0,waitPenalty:0,paymentRecovery:0};
}
export const satisfactionMetrics=s=>s.satisfactionDetails||=(newSatisfactionMetrics(s.satisfaction,s.minute));
export function adjustSatisfaction(s,reason,delta) {
  const m=satisfactionMetrics(s),before=s.satisfaction;s.satisfaction=Math.max(0,Math.min(100,before+delta));m[reason]+=Math.abs(s.satisfaction-before);
}
export function satisfactionReport(s) {
  const m=satisfactionMetrics(s),waiting=s.customers.filter(c=>c.stage==='queue');
  return {...m,score:s.satisfaction,availability:m.requests?Math.round(m.fulfilled/m.requests*100):null,averageWait:m.waitingCustomers?m.waitMinutes/m.waitingCustomers:0,currentQueue:waiting.length,currentMaxWait:waiting.reduce((n,c)=>Math.max(n,c.wait),0),unavailable:s.products.filter(p=>p.capacity>0&&p.shelf===0).map(p=>p.id)};
}
