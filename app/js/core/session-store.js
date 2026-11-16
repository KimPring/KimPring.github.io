const VERSION = 1;
const SESSION_KEY = 'wbd_pages_session_v1';

function requestResult(request) {
  return new Promise((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function completed(transaction) {
  return new Promise((resolve,reject)=>{
    transaction.oncomplete=resolve;
    transaction.onabort=()=>reject(transaction.error || new Error('저장이 취소되었습니다.'));
    transaction.onerror=()=>reject(transaction.error);
  });
}
/** Raw logs live in IndexedDB, never in the much smaller localStorage quota. */
export async function openSessionStore() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY,sessionId);
  }
  const request=indexedDB.open('wbd-analyzer-pages',VERSION);
  request.onupgradeneeded=()=>{
    request.result.createObjectStore('sessions');
    request.result.createObjectStore('logs');
  };
  const db=await requestResult(request);
  let savedIds = new Set();
  return {
    async load() {
      const tx=db.transaction(['sessions','logs'],'readonly');
      const snapshot=await requestResult(tx.objectStore('sessions').get(sessionId));
      if (!snapshot || snapshot.version !== VERSION) return null;
      // Open a new transaction after the metadata request to avoid auto-commit between awaits.
      const logTx=db.transaction('logs','readonly');
      const logs=await Promise.all(snapshot.gameIds.map(id=>requestResult(logTx.objectStore('logs').get(`${sessionId}/${id}`))));
      if (logs.some(log=>!log)) throw new Error('저장된 경기 일부를 읽지 못했습니다. 원본 로그를 다시 불러와 주세요.');
      savedIds=new Set(snapshot.gameIds);
      return {...snapshot,logs};
    },
    async save(snapshot,logs) {
      const tx=db.transaction(['sessions','logs'],'readwrite');
      const done=completed(tx);
      const store=tx.objectStore('logs');
      const current=new Set(snapshot.gameIds);
      for (const id of current) {
        if (savedIds.has(id)) continue;
        const log=logs.get(id);
        if (!log) { tx.abort(); await done; }
        store.put(log,`${sessionId}/${id}`);
      }
      for (const id of savedIds) if(!current.has(id))store.delete(`${sessionId}/${id}`);
      tx.objectStore('sessions').put({...snapshot,version:VERSION},sessionId);
      await done;
      savedIds=current;
    },
    close() { db.close(); }
  };
}
