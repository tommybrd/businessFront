// Network transport of Flux Arcade: players' browsers talk to each other directly (WebRTC data channels, opened with PeerJS).
// The public PeerJS service only puts the browsers in touch; the game itself never goes through a server.
// A room is the host's browser, reached with a short code. Everything exchanged is JSON text; what it means is the game's business.
const PREFIXES={arcade:'flux-arcade-',camping:'flux-camping-'},ALPHABET='ABCDEFGHJKMNPQRSTUVWXYZ23456789',LEN=5;
let lib=null;
const load=()=>lib??=new Promise((ok,ko)=>{if(globalThis.Peer)return ok(globalThis.Peer);const el=document.createElement('script');el.src=new URL('./vendor/peerjs.min.js',import.meta.url).href;
 el.onload=()=>globalThis.Peer?ok(globalThis.Peer):ko(Error('missing'));el.onerror=()=>{lib=null;el.remove();ko(Error('missing'));};document.head.append(el);});
export const cleanCode=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,LEN);
const newCode=()=>[...crypto.getRandomValues(new Uint8Array(LEN))].map(v=>ALPHABET[v%ALPHABET.length]).join('');
const opened=(peer,ms=12000)=>new Promise((ok,ko)=>{const t=setTimeout(()=>ko(Object.assign(Error('timeout'),{type:'network'})),ms);peer.once('open',()=>{clearTimeout(t);ok();});peer.once('error',e=>{clearTimeout(t);ko(e);});});
// A message in French for what went wrong while connecting.
export function netError(e){const t=e?.type;if(t==='peer-unavailable')return 'Aucune partie ouverte avec ce code.';if(t==='browser-incompatible')return 'Ce navigateur ne permet pas le jeu en réseau.';
 if(e?.message==='missing'||t==='network'||t==='server-error'||t==='socket-error'||t==='socket-closed')return 'Service de mise en relation injoignable. Réessayez dans un instant.';return 'Connexion impossible.';}

// Opens a room. onJoin(id,meta) returns false to turn the newcomer away; onMessage(id,object); onLeave(id).
export async function hostRoom({onJoin,onMessage,onLeave},game='arcade'){const Peer=await load(),PREFIX=PREFIXES[game]??PREFIXES.arcade;let peer,code;
 for(let i=0;;i++){code=newCode();peer=new Peer(PREFIX+code);try{await opened(peer);break;}catch(e){peer.destroy();if(e?.type!=='unavailable-id'||i>=3)throw e;}}
 const conns=new Map();let n=0,closed=false;
 const out=id=>{const c=conns.get(id);if(!c)return;conns.delete(id);try{c.close();}catch{}onLeave(id);};
 peer.on('connection',c=>{const id='p'+(++n);
  c.on('open',()=>{if(closed)return;if(onJoin(id,c.metadata)===false){try{c.send('{"t":"no"}');}catch{}setTimeout(()=>{try{c.close();}catch{}},500);return;}conns.set(id,c);try{c.send(JSON.stringify({t:'hi',id}));}catch{}});
  c.on('data',d=>{if(!conns.has(id)||typeof d!=='string'||d.length>2000)return;let m;try{m=JSON.parse(d);}catch{return;}if(m&&typeof m==='object')onMessage(id,m);});
  c.on('close',()=>out(id));c.on('error',()=>out(id));});
 // Losing the meeting service does not cut the players already connected; reconnect to keep the code reachable.
 peer.on('disconnected',()=>{if(!closed&&!peer.destroyed)setTimeout(()=>{if(!closed&&!peer.destroyed)try{peer.reconnect();}catch{}},2000);});peer.on('error',()=>{});
 return {code,get size(){return conns.size;},kick:out,
  broadcast(text){for(const c of conns.values())if(c.open&&(c.dataChannel?.bufferedAmount??0)<1e6)try{c.send(text);}catch{}},
  close(){closed=true;conns.clear();peer.destroy();}};}

// Joins the room `code`. onMessage(object) for each message of the host; onClose() once, if the link is lost.
export async function joinRoom(code,meta,{onMessage,onClose},game='arcade'){const Peer=await load(),peer=new Peer(),PREFIX=PREFIXES[game]??PREFIXES.arcade;let closed=false;
 try{await opened(peer);const c=peer.connect(PREFIX+cleanCode(code),{reliable:true,serialization:'raw',metadata:meta});
  await new Promise((ok,ko)=>{const t=setTimeout(()=>ko(Object.assign(Error('timeout'),{type:'peer-unavailable'})),15000);c.once('open',()=>{clearTimeout(t);ok();});peer.once('error',e=>{clearTimeout(t);ko(e);});});
  const lost=()=>{if(closed)return;closed=true;peer.destroy();onClose();};
  c.on('data',d=>{if(closed||typeof d!=='string')return;let m;try{m=JSON.parse(d);}catch{return;}if(m&&typeof m==='object')onMessage(m);});c.on('close',lost);c.on('error',lost);peer.on('error',()=>{});
  return {send(m){if(!closed&&c.open)try{c.send(JSON.stringify(m));}catch{}},close(){closed=true;peer.destroy();}};
 }catch(e){peer.destroy();throw e;}}
