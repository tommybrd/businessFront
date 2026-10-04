import { layoutObjects,objectBox,shopBounds } from './store-layout.js';
// Half-metre walking grid: furniture and the reserve partition are real obstacles.
const cache=new WeakMap(),step=.5;
function grid(s,clearance=.22) {
  const objects=layoutObjects(s),b=shopBounds(s),key=JSON.stringify([b,clearance,objects.map(o=>[o.id,o.x,o.z,o.rotation])]);
  if(cache.get(s)?.key===key)return cache.get(s);
  const left=Math.floor(b.left/step)*step,right=Math.ceil(b.right/step)*step,back=Math.floor((b.back-12)/step)*step,front=Math.ceil((b.front+8)/step)*step;
  const width=Math.round((right-left)/step)+1,height=Math.round((front-back)/step)+1,boxes=objects.map(o=>objectBox(o,clearance));
  const blocked=new Uint8Array(width*height);
  for(let row=0;row<height;row++)for(let col=0;col<width;col++) {
    const x=left+col*step,z=back+row*step;
    const wall=(x<b.left+.2||x>b.right-.2)||(z>-4.45&&z<-3.75&&Math.abs(x)>1.9&&x<11.2);
    blocked[row*width+col]=Number(wall||boxes.some(o=>x>o.left&&x<o.right&&z>o.back&&z<o.front));
  }
  const result={key,left,back,width,height,blocked};cache.set(s,result);return result;
}
function node(g,p) {
  const col=Math.max(0,Math.min(g.width-1,Math.round((p[0]-g.left)/step))),row=Math.max(0,Math.min(g.height-1,Math.round((p[1]-g.back)/step)));
  const index=row*g.width+col;
  if(!g.blocked[index])return index;
  // People can occupy an old furniture position while a neighbouring piece moves.
  for(let radius=1;radius<=4;radius++)for(let r=-radius;r<=radius;r++)for(let c=-radius;c<=radius;c++) {
    const x=col+c,z=row+r;if(x<0||x>=g.width||z<0||z>=g.height)continue;
    const i=z*g.width+x;if(!g.blocked[i])return i;
  }
  return null;
}
export function walkingPath(s,start,end,clearance=.22) {
  const g=grid(s,clearance),from=node(g,start),to=node(g,end);if(from===null||to===null)return null;
  const parent=new Int32Array(g.blocked.length);parent.fill(-2);parent[from]=-1;
  const queue=new Int32Array(parent.length);queue[0]=from;let head=0,tail=1;
  while(head<tail&&parent[to]===-2) {
    const i=queue[head++],col=i%g.width;
    for(const n of [col>0?i-1:-1,col<g.width-1?i+1:-1,i-g.width,i+g.width])if(n>=0&&n<parent.length&&!g.blocked[n]&&parent[n]===-2){parent[n]=i;queue[tail++]=n;}
  }
  if(parent[to]===-2)return null;
  const ids=[];for(let i=to;i>=0;i=parent[i])ids.push(i);ids.reverse();
  const points=ids.map(i=>[g.left+(i%g.width)*step,g.back+Math.floor(i/g.width)*step]);
  // Only collapse collinear grid edges, keeping every bend around obstacles.
  const route=[[...start]];
  for(let i=0;i<points.length;i++){const a=points[i-1],p=points[i],b=points[i+1];if(!a||!b||a[0]!==b[0]&&a[1]!==b[1])route.push(p);}
  route.push([...end]);return route.filter((p,i)=>!i||Math.hypot(p[0]-route[i-1][0],p[1]-route[i-1][1])>.001);
}
export const reachable=(s,a,b,clearance=.22)=>Boolean(walkingPath(s,a,b,clearance));
export function routeWaypoints(s,path,clearance=.22) {
  if(!Object.keys(s.layout||{}).length)return path;
  const route=[path[0]];
  for(let i=1;i<path.length;i++) {
    const section=walkingPath(s,route.at(-1),path[i],clearance);
    if(!section)throw new Error('Aucun passage accessible dans cet agencement.');
    route.push(...section.slice(1));
  }
  return route;
}
