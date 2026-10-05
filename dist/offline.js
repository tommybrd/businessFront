export function startOfflineSupport({notify=()=>{},onAuthRequired=()=>{}}={}){
  const sw=globalThis.navigator?.serviceWorker;
  if(!sw){notify('Mode hors ligne indisponible dans ce navigateur.');return;}
  notify('Préparation du jeu hors ligne…');
  sw.addEventListener('message',event=>{if(event.data?.type==='AUTH_REQUIRED')onAuthRequired();});
  function inspect(worker){
    if(!worker)return;
    const channel=new MessageChannel();channel.port1.onmessage=event=>{if(event.data?.ready){notify('Jeu disponible hors ligne');}else{notify('Téléchargement incomplet · reconnectez-vous.');}channel.port1.close();};
    worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
  }
  const register=()=>sw.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(registration=>{
    inspect(registration.active);
    const watch=worker=>worker?.addEventListener('statechange',()=>{
      if(worker.state==='activated')inspect(worker);
      if(worker.state==='installed'&&registration.waiting)notify('Mise à jour prête · fermez les fenêtres du jeu pour l’appliquer.');
      if(worker.state==='redundant'&&!registration.active)notify('Téléchargement incomplet · réessayez avec Internet.');
    });
    watch(registration.installing);registration.addEventListener('updatefound',()=>watch(registration.installing));
    // Safari decides whether persistent storage can be granted to this device.
    globalThis.navigator.storage?.persist?.().catch(()=>{});
  }).catch(()=>notify('Préparation hors ligne indisponible · reconnectez-vous pour réessayer.'));
  register();globalThis.addEventListener?.('online',register);
}
