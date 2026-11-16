import { createRuntime } from './core/runtime.js';
import { routes, pageURL } from './core/routes.js';
import { openSessionStore } from './core/session-store.js';
import { captureState,restoreState,captureControls } from './core/view-state.js';
import { installPageController } from './core/page-controller.js';

const page=document.documentElement.dataset.page;
const status=document.getElementById('boot-status');
document.body.dataset.booting='';
function report(error) {
  console.error('[WBD pages]',error);
  status.hidden=false;status.dataset.error='';
  status.textContent=`${error.message || error}\n문제가 계속되면 원본 분석기를 이용해 주세요.`;
}
function message(text) {status.hidden=false;delete status.dataset.error;status.textContent=text;}
let context,store,controller,ready=false,restoring=true,timer,saveQueue=Promise.resolve();
const logs=new Map();
let views={},pendingSelection=null,navigating=false;

function save() {
  if(!ready || restoring)return saveQueue;
  views[page]=captureControls();
  const snapshot={gameIds:context.GAMES.map(g=>g.id),activeIds:[...context.activeGameIds],state:captureState(context),views,
    autoLoaded:context.SERVER_LIBRARY.autoLoaded,selection:pendingSelection};
  saveQueue=saveQueue.catch(()=>{}).then(()=>{
    if(!store)throw new Error('브라우저 저장소를 사용할 수 없어 페이지를 이동할 수 없습니다. 현재 경기 데이터를 내보낸 후 다시 시도해 주세요.');
    return store.save(snapshot,logs);
  });
  return saveQueue;
}
function scheduleSave() {
  if(!ready || restoring)return;
  clearTimeout(timer);timer=setTimeout(()=>save().catch(report),350);
}
async function navigate(target,selection=null,options={}) {
  if(!Object.hasOwn(routes,target))return;
  if(target===page && !options.newTab) {
    controller.render(undefined,selection);scheduleSave();return;
  }
  if(navigating)return;
  if(context._serverLoading){message('경기를 불러오는 중입니다. 완료 후 페이지를 이동해 주세요.');return;}
  navigating=true;document.body.dataset.navigating='';
  message('경기와 선택 상태를 저장하는 중…');
  pendingSelection=selection?{page:target,controls:selection}:null;
  try {
    clearTimeout(timer);
    await save();
    if(options.newTab) {
      const url=pageURL(target);url.searchParams.set('session',sessionStorage.getItem('wbd_pages_session_v1'));
      options.newTab.location.href=url.href;
      status.hidden=true;navigating=false;delete document.body.dataset.navigating;
    }else location.assign(pageURL(target).href);
  }catch(error){options.newTab?.close();navigating=false;delete document.body.dataset.navigating;report(error);}
}

async function start() {
  if(location.protocol==='file:')throw new Error('페이지 버전은 HTTP 서버에서 실행해 주세요: node app/scripts/serve.mjs');
  // Explicit session links support opening the current loaded dataset in another tab.
  const url=new URL(location.href),linkedSession=url.searchParams.get('session');
  if(linkedSession && /^[a-f0-9-]{36}$/i.test(linkedSession)) {
    sessionStorage.setItem('wbd_pages_session_v1',linkedSession);
    url.searchParams.delete('session');history.replaceState(null,'',url);
  }
  context=createRuntime();
  const addGame=context.addGame;
  context.addGame=(text,name,meta)=>{
    const game=addGame(text,name,meta);
    logs.set(game.id,{id:game.id,name,text,meta:meta||{}});
    return game;
  };
  controller=installPageController(context,{page,navigate,onChange:scheduleSave,onError:report});
  let snapshot;
  try{store=await openSessionStore();snapshot=await store.load();}catch(error){report(error);}
  if(snapshot) {
    message(`저장한 경기 ${snapshot.logs.length}개 복원 중…`);
    for(let i=0;i<snapshot.logs.length;i++) {
      const log=snapshot.logs[i];
      const game=addGame(log.text,log.name,log.meta);
      context.activeGameIds.delete(game.id);
      game.id=log.id;
      for(const pitch of game.pitches)pitch._gameId=log.id;
      logs.set(log.id,log);
      if(i%25===0)await new Promise(resolve=>setTimeout(resolve,0));
    }
    context.activeGameIds=new Set(snapshot.activeIds.filter(id=>logs.has(id)));
    context.rebuildG();
    restoreState(context,snapshot.state);
    views=snapshot.views||{};
    context.SERVER_LIBRARY.autoLoaded=Boolean(snapshot.autoLoaded);
    if(context.GAMES.length) {
      document.getElementById('upload-page').style.display='none';
      document.getElementById('app').style.display='block';
      context.populateSelects();context.updateNavInfo();context.renderGamesList();
      controller.render(views[page],snapshot.selection?.page===page?snapshot.selection.controls:null);
    }
  }
  restoring=false;ready=true;
  window.WBD=Object.freeze({navigate,save,ready:true,page});
  delete document.body.dataset.booting;
  if(!status.hasAttribute('data-error'))status.hidden=true;
  // Existing sessions are authoritative, including intentionally emptied game lists.
  context.SERVER_AUTO_LOAD_ALL=!snapshot;
  await context.initServerLibrary(false);
  if(!snapshot)await context.autoLoadAllServerFiles();
  if(location.hash.startsWith('#s='))context.applyShareURL();
  await save();
  if(!status.hasAttribute('data-error'))status.hidden=true;
}

document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[data-route]');
  if(!anchor)return;
  if(event.button!==0)return;
  event.preventDefault();
  const newTab=event.ctrlKey||event.metaKey||event.shiftKey||anchor.target==='_blank'?window.open('about:blank','_blank'):null;
  navigate(anchor.dataset.route,null,{newTab});
});
document.addEventListener('change',scheduleSave);
document.addEventListener('click',()=>{if(ready)setTimeout(scheduleSave,0);});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')save().catch(console.error);});
window.addEventListener('pagehide',()=>{save().catch(console.error);});
start().catch(error=>{delete document.body.dataset.booting;report(error);});
