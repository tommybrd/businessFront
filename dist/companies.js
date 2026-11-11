// "Entreprises" menu shared by the games: one card per business, with where the player stands in each one (read from its
// local save, read-only). Each business is its own page with its own save; this only links them. Adding a business is one line.
export const COMPANIES=[
 {id:'arcade',name:'Flux Burger',icon:'🍔',kind:'Restaurant-ferme',href:'./arcade.html',key:'flux-arcade-v1',intro:'Cultivez, grillez, servez : un restaurant de burgers sans fin.'},
 {id:'camping',name:'Camping du Paradis',icon:'🌴',kind:'Camping ★★★',href:'./camping.html',key:'flux-camping-v1',day:'Épisode',intro:'Soleil, ragots et karaoké : dirigez un camping de vacances, façon sitcom.'}];
const CSS=`#cobtn{border:0;border-radius:12px;background:#ffffffe8;padding:9px 13px;font:inherit;font-size:14px;font-weight:800;color:#26343f;cursor:pointer;box-shadow:0 3px 0 #0002}
#copanel{position:fixed;right:12px;bottom:max(64px,calc(env(safe-area-inset-bottom) + 64px));z-index:7;width:min(360px,calc(100vw - 24px));max-height:calc(100vh - 140px);overflow:auto;background:#fffffff5;color:#26343f;border-radius:16px;box-shadow:0 8px 30px #0003;padding:14px;box-sizing:border-box}
#copanel header{display:flex;justify-content:space-between;align-items:center;font-size:16px}#copanel header button{border:0;background:#eef2f4;border-radius:8px;width:30px;height:30px;font-size:14px;cursor:pointer}#copanel p{margin:8px 0;font-size:12.5px;color:#5b6a73}
.cocard{display:grid;grid-template-columns:44px 1fr;gap:2px 10px;align-items:center;margin-top:8px;padding:10px;border-radius:12px;border:2px solid #dde4e8;background:#fff;color:inherit;text-decoration:none}.cocard.here{border-color:#2f9e4f;background:#effaf1}
.cocard .ico{grid-row:span 3;font-size:34px;text-align:center}.cocard b{font-size:15px}.cocard small{color:#6b7a84;font-weight:700}.cocard .go{font-weight:800;font-size:13px;color:#2b6fd6}.cocard.here .go{color:#2f9e4f}
@media(max-width:600px){#cobtn{font-size:14px;padding:10px 10px;white-space:nowrap}#copanel{bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px)}}`;
// What the other save says, in a few words (a business never opened has no save).
function summary(c){try{const raw=localStorage.getItem(c.key);if(!raw)return 'Pas encore ouverte · gratuite';const o=JSON.parse(raw);if(typeof o?.money!=='number')return 'Partie en cours';return `${c.day??'Jour'} ${o.day??1} · ${Math.floor(o.money).toLocaleString('fr-FR')} $`;}catch{return 'Partie en cours';}}
export function mountCompanies(currentId,dock){
 const st=document.createElement('style');st.textContent=CSS;document.head.append(st);
 const btn=document.createElement('button');btn.id='cobtn';btn.type='button';btn.title='Changer d’entreprise';btn.setAttribute('aria-label','Mes entreprises');dock.prepend(btn);
 const phone=matchMedia('(max-width:600px)'),label=()=>btn.textContent=phone.matches?'🏢':'🏢 Entreprises';label();phone.addEventListener?.('change',label);
 const panel=document.createElement('section');panel.id='copanel';panel.hidden=true;panel.setAttribute('aria-label','Mes entreprises');document.body.append(panel);
 const render=()=>{panel.textContent='';const head=document.createElement('header'),b=document.createElement('b');b.textContent='🏢 Mes entreprises';const x=document.createElement('button');x.type='button';x.textContent='✕';x.setAttribute('aria-label','Fermer');x.onclick=()=>panel.hidden=true;head.append(b,x);
  const p=document.createElement('p');p.textContent='Chaque entreprise a sa propre partie, sauvegardée sur cet appareil : vous retrouvez l’autre exactement où vous l’avez laissée.';panel.append(head,p);
  for(const c of COMPANIES){const here=c.id===currentId,a=document.createElement(here?'div':'a');a.className='cocard'+(here?' here':'');if(!here)a.href=c.href;
   const ico=document.createElement('span');ico.className='ico';ico.textContent=c.icon;const n=document.createElement('b');n.textContent=c.name+' · '+c.kind;const s=document.createElement('small');s.textContent=c.intro;const go=document.createElement('span');go.className='go';go.textContent=here?'Vous êtes ici':summary(c)+' → Y aller';a.append(ico,n,s,go);panel.append(a);}};
 btn.addEventListener('click',()=>{panel.hidden=!panel.hidden;if(!panel.hidden){render();for(const id of ['handspanel','teampanel','bankpanel','multipanel','reviewspanel'])document.getElementById(id)&&(document.getElementById(id).hidden=true);}});
 for(const id of ['multi','bankbtn','hands','team','reviews'])document.getElementById(id)?.addEventListener('click',()=>panel.hidden=true);
 return {close:()=>panel.hidden=true};}
