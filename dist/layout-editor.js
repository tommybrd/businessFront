import { layoutObjects,shopBounds } from './store-layout.js';
export function createLayoutEditor(state,{move,error,changed,ready,notice}) {
  const $=id=>document.getElementById(id),dialog=$('layout-dialog'),map=$('layout-map'),select=$('layout-object');
  let chosen=null,drag=null,previousSpeed=0;
  const scale=24,padding=1.5;
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  function render() {
    const b=shopBounds(state),objects=layoutObjects(state);
    if(!objects.some(o=>o.id===chosen))chosen=objects[0]?.id;
    select.innerHTML=objects.map(o=>`<option value="${o.id}" ${o.id===chosen?'selected':''}>${escape(o.name)}</option>`).join('');
    const x=(b.left-padding)*scale,y=(b.back-padding)*scale,w=(b.right-b.left+padding*2)*scale,h=(b.front-b.back+padding*2)*scale;
    map.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);
    map.innerHTML=`<defs><pattern id="layout-grid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse"><path d="M ${scale} 0 L 0 0 0 ${scale}" fill="none" stroke="#b9c8b3" stroke-width=".7"/></pattern></defs><rect x="${b.left*scale}" y="${b.back*scale}" width="${(b.right-b.left)*scale}" height="${(b.front-b.back)*scale}" fill="#d8e1ce"/><rect x="${b.left*scale}" y="${-4.1*scale}" width="${(b.right-b.left)*scale}" height="${(b.front+4.1)*scale}" fill="#f1efdd"/><rect x="${b.left*scale}" y="${b.back*scale}" width="${(b.right-b.left)*scale}" height="${(b.front-b.back)*scale}" fill="url(#layout-grid)" stroke="#627960" stroke-width="3"/><path d="M ${b.left*scale} ${-4.1*scale} H ${-1.9*scale} M ${1.9*scale} ${-4.1*scale} H ${11.2*scale}" stroke="#627960" stroke-width="6"/>${objects.map(o=>`<g data-fixture="${o.id}" transform="translate(${o.x*scale} ${o.z*scale}) rotate(${-o.rotation*180/Math.PI})"><rect x="${-o.w/2*scale}" y="${-o.d/2*scale}" width="${o.w*scale}" height="${o.d*scale}" rx="3" fill="${o.color}" stroke="${o.id===chosen?'#183d2b':'#65765c'}" stroke-width="${o.id===chosen?4:1.5}"/><path d="M ${-o.w/3*scale} ${o.d/2*scale} H ${o.w/3*scale}" stroke="#faf9e7" stroke-width="4"/></g>`).join('')}`;
    const o=objects.find(o=>o.id===chosen);$('layout-position').textContent=o?`${o.name} · ${o.x.toFixed(1)} / ${o.z.toFixed(1)} m`:'';$('layout-rotate').disabled=!o;
  }
  function apply(...args){const result=move(...args);$('layout-message').textContent=result?'Agencement enregistré.':error();return result;}
  function point(e){const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(map.getScreenCTM().inverse());return [p.x/scale,p.y/scale];}
  function finish(){dialog.close();if(ready())state.speed=previousSpeed;changed();}
  $('layout-close').addEventListener('click',finish);$('layout-done').addEventListener('click',finish);
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
  select.addEventListener('change',()=>{chosen=select.value;render();});
  $('layout-rotate').addEventListener('click',()=>{const o=layoutObjects(state).find(o=>o.id===chosen);if(o)apply(o.id,o.x,o.z,(o.rotation+Math.PI/2+Math.PI*2)%(Math.PI*2));render();});
  map.addEventListener('pointerdown',e=>{
    const id=e.target.closest('[data-fixture]')?.dataset.fixture;
    if(id){chosen=id;const o=layoutObjects(state).find(o=>o.id===id),p=point(e);drag={id,start:p,offset:[o.x-p[0],o.z-p[1]],rotation:o.rotation,moved:false};render();map.setPointerCapture(e.pointerId);}
    else if(chosen){const p=point(e),o=layoutObjects(state).find(o=>o.id===chosen);apply(chosen,...p,o.rotation);render();}
    e.preventDefault();
  });
  map.addEventListener('pointermove',e=>{if(!drag)return;const p=point(e);if(Math.hypot(p[0]-drag.start[0],p[1]-drag.start[1])>.2)drag.moved=true;const group=map.querySelector(`[data-fixture="${drag.id}"]`);group?.setAttribute('transform',`translate(${(p[0]+drag.offset[0])*scale} ${(p[1]+drag.offset[1])*scale}) rotate(${-drag.rotation*180/Math.PI})`);});
  map.addEventListener('pointerup',e=>{if(!drag)return;if(drag.moved){const p=point(e);apply(drag.id,p[0]+drag.offset[0],p[1]+drag.offset[1],drag.rotation);}drag=null;render();});
  map.addEventListener('pointercancel',()=>{drag=null;render();});
  return {open(){if(!ready()){notice('Chargez la partie avant de l’aménager.',true);return;}previousSpeed=state.speed;state.speed=0;changed();$('layout-message').textContent='';render();dialog.showModal();}};
}
