export function stockAlerts(s) {
 const alerts=[];
 for(const p of s.products.filter(p=>p.capacity>0)) {
  if(p.shelf===0)alerts.push({key:`shelf-empty:${p.id}`,productId:p.id,severity:'critical',view:'rayons',message:`${p.short} · rayon vide`,stock:p.shelf,capacity:p.capacity});
  else if(p.shelf<=Math.max(12,Math.ceil(p.capacity*.15)))alerts.push({key:`shelf-low:${p.id}`,productId:p.id,severity:'warning',view:'rayons',message:`${p.short} · rayon bientôt vide`,stock:p.shelf,capacity:p.capacity});
  if(p.reserve===0)alerts.push({key:`reserve-empty:${p.id}`,productId:p.id,severity:'critical',view:'reserve',message:`${p.short} · réserve épuisée`,stock:0,capacity:p.reserveCapacity});
  else if(p.reserve<=12)alerts.push({key:`reserve-low:${p.id}`,productId:p.id,severity:'warning',view:'reserve',message:`${p.short} · réserve basse`,stock:p.reserve,capacity:p.reserveCapacity});
 }
 return alerts.sort((a,b)=>(a.severity==='critical'?0:1)-(b.severity==='critical'?0:1));
}
