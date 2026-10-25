export const WAREHOUSE_BOUNDS={minX:-16,maxX:16,minZ:-9,maxZ:11};
export function warehouseFixture(s,key){
 const saved=s.layout[key];if(saved)return saved;
 if(key.startsWith('rack:')){const i=s.products.findIndex(p=>p.id===key.slice(5));return {x:i<3?-10:-3,z:-6+(i%3)*5,rotation:0};}
 // Packing benches fill two columns of four, nearest the conveyor first.
 const i=Number(key.split(':')[1]);return {x:i<4?8:12.6,z:[-6.5,-3,.5,4][i%4],rotation:0};
}
export function warehouseFixtures(s){return [...s.products.map(p=>'rack:'+p.id),...Array.from({length:s.benches},(_,i)=>'pack:'+i)];}
export function warehouseFootprint(s,key){const p=warehouseFixture(s,key),w=key.startsWith('rack:')?4.8:3.2,d=key.startsWith('rack:')?1.6:1.7;return {...p,w:p.rotation%Math.PI?d:w,d:p.rotation%Math.PI?w:d};}
export function warehouseAccess(s,key){const p=warehouseFixture(s,key),distance=(key.startsWith('rack:')?1.6:1.7)/2+0.8;return [p.x+Math.sin(p.rotation)*distance,p.z+Math.cos(p.rotation)*distance];}
export function warehouseWalkable(s,x,z){return x>=-16&&x<=16&&z>=-9&&z<=11&&!warehouseFixtures(s).some(key=>{const p=warehouseFootprint(s,key);return Math.abs(x-p.x)<p.w/2+.32&&Math.abs(z-p.z)<p.d/2+.32;});}
export function warehouseRoute(s,from,to){
 const cell=p=>[Math.round(p[0]*2),Math.round(p[1]*2)],key=p=>p[0]+','+p[1];let start=cell(from),end=cell(to);
 if(!warehouseWalkable(s,start[0]/2,start[1]/2)){
  let best=null;for(let r=1;r<12&&!best;r++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++)if((Math.abs(x)===r||Math.abs(z)===r)&&warehouseWalkable(s,(start[0]+x)/2,(start[1]+z)/2)){best=[start[0]+x,start[1]+z];break;}if(!best)return null;start=best;
 }
 if(!warehouseWalkable(s,end[0]/2,end[1]/2))return null;
 const queue=[start],parents=new Map([[key(start),null]]);let found=false;
 for(let i=0;i<queue.length;i++){const p=queue[i];if(key(p)===key(end)){found=true;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const next=[p[0]+dx,p[1]+dz],id=key(next);if(parents.has(id)||!warehouseWalkable(s,next[0]/2,next[1]/2))continue;parents.set(id,p);queue.push(next);}}
 if(!found)return null;const path=[];for(let p=end;p;p=parents.get(key(p)))path.push([p[0]/2,p[1]/2]);path.reverse();
 // Keep corners only, reducing saved paths and work per frame.
 const compact=[];for(let i=0;i<path.length;i++){if(i===0||i===path.length-1||((path[i][0]-path[i-1][0])!==(path[i+1][0]-path[i][0]))||((path[i][1]-path[i-1][1])!==(path[i+1][1]-path[i][1])))compact.push(path[i]);}compact.push([...to]);return compact;
}
