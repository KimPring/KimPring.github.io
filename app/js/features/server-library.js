/** server-library: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:3185
wbdContext._serverSetLoadUI = function _serverSetLoadUI(isLoading, mode){
  const sel=document.getElementById('server-selected-load-btn');
  const all=document.getElementById('server-all-load-btn');
  const refreshBtns=[...document.querySelectorAll('#server-library-box button')].filter(b=>b.textContent.includes('새로고침'));
  if(sel){
    sel.disabled=!!isLoading;
    sel.textContent=isLoading?'불러오는 중...':'선택 그룹 불러오기';
    sel.style.opacity=isLoading?'.65':'1';
    sel.style.cursor=isLoading?'wait':'pointer';
  }
  if(all){
    all.disabled=!!isLoading;
    all.textContent=isLoading?'잠시만요...':'전체 불러오기';
    all.style.opacity=isLoading?'.65':'1';
    all.style.cursor=isLoading?'wait':'pointer';
  }
  refreshBtns.forEach(b=>{
    b.disabled=!!isLoading;
    b.style.opacity=isLoading?'.65':'1';
    b.style.cursor=isLoading?'wait':'pointer';
  });
};

// Original index.html:3211
wbdContext._serverGroupCardHtml = function _serverGroupCardHtml(g){
  const on=window.SERVER_LIBRARY.selected.has(g.id);
  const desc=g.description?`<div style="font-size:10px;color:var(--muted);margin-top:3px">${g.description}</div>`:'';
  return `<div class="srv-card ${on?'on':'off'}" onclick="toggleServerGroup('${String(g.id).replace(/'/g,"\\'")}')">
    <div class="nm">${g.name}</div>
    <div class="ct">${g.files.length}경기</div>${desc}
  </div>`;
};

// Original index.html:3220
wbdContext.renderServerLibraryPanel = function renderServerLibraryPanel(){
  const box=document.getElementById('server-library-box');
  const groupsEl=document.getElementById('server-library-groups');
  if(box)box.style.display='block';
  if(!groupsEl)return;
  const groups=window.SERVER_LIBRARY.groups||[];
  if(!groups.length){
    groupsEl.innerHTML=`<div style="font-size:11px;color:var(--muted);line-height:1.8;border:1px dashed var(--border);border-radius:8px;padding:14px;margin-top:10px">
      아직 서버 경기 목록이 없습니다.<br>
      GitHub 저장소 <b style="color:var(--text)">data/league/시즌명/</b> 폴더에 CSV를 넣고 push하면 자동으로 나타납니다.
    </div>`;
    wbdContext._updateServerSummary();
    return;
  }
  // 카테고리별 묶기 (manifest categoryOrder 순서 존중)
  const manifest=window.SERVER_LIBRARY.manifest||{};
  const order=manifest.categoryOrder||[];
  const byCat={};
  groups.forEach(g=>{
    const k=g.category||'etc';
    (byCat[k]=byCat[k]||[]).push(g);
  });
  const cats=[...order.filter(c=>byCat[c]), ...Object.keys(byCat).filter(c=>!order.includes(c))];
  groupsEl.innerHTML=cats.map(cat=>{
    const list=byCat[cat];
    const catName=list[0].categoryName||cat;
    return `<div class="srv-cat-eyebrow">${catName}</div><div class="srv-grid">${list.map(wbdContext._serverGroupCardHtml).join('')}</div>`;
  }).join('');
  const total=groups.reduce((s,g)=>s+g.files.length,0);
  wbdContext._serverSetStatus(`${groups.length}개 그룹 · ${total}경기 준비됨`, false);
  wbdContext._updateServerSummary();
};

// Original index.html:3253
wbdContext._updateServerSummary = function _updateServerSummary(){
  const el=document.getElementById('server-selected-summary');
  if(!el)return;
  const groups=window.SERVER_LIBRARY.groups||[];
  const sel=groups.filter(g=>window.SERVER_LIBRARY.selected.has(g.id));
  const n=sel.reduce((s,g)=>s+g.files.length,0);
  el.innerHTML=groups.length?`선택 <b>${sel.length}</b>그룹 · <b>${n}</b>경기`:'';
};

// Original index.html:3262
wbdContext.toggleServerGroup = function toggleServerGroup(id){
  if(window.SERVER_LIBRARY.selected.has(id))window.SERVER_LIBRARY.selected.delete(id);
  else window.SERVER_LIBRARY.selected.add(id);
  // 랜딩 패널 갱신 (있을 때)
  if(document.getElementById('server-library-groups'))wbdContext.renderServerLibraryPanel();
  // 앱 내 모달 갱신 (열려 있을 때)
  const modalGrid=document.getElementById('server-library-groups-modal');
  if(modalGrid){
    const groups=window.SERVER_LIBRARY.groups||[];
    modalGrid.innerHTML=groups.map(wbdContext._serverGroupCardHtml).join('');
  }
};

// Original index.html:3275
wbdContext.refreshServerLibrary = async function refreshServerLibrary(){
  await wbdContext.initServerLibrary(true);
  if(window.SERVER_LIBRARY.groups.length) wbdContext._toast('☁ 서버 목록 갱신', `${window.SERVER_LIBRARY.groups.length}개 그룹을 불러왔습니다.`, '#88ccff', 2500);
};

// Original index.html:3280
wbdContext.initServerLibrary = async function initServerLibrary(force){
  if(window.SERVER_LIBRARY.loading)return;
  if(window.SERVER_LIBRARY.manifest && !force){wbdContext.renderServerLibraryPanel();return;}
  window.SERVER_LIBRARY.loading=true;
  wbdContext._serverSetStatus('data/manifest.json 확인 중...', false);
  const box=document.getElementById('server-library-box');
  if(box)box.style.display='block';
  try{
    const res=await fetch(wbdContext.SERVER_MANIFEST_URL+(force?('?t='+Date.now()):''),{cache:'no-store'});
    if(!res.ok)throw new Error('manifest 없음 또는 접근 불가');
    const raw=await res.json();
    const manifest=wbdContext._normalizeServerManifest(raw);
    window.SERVER_LIBRARY.manifest=manifest;
    window.SERVER_LIBRARY.groups=manifest.groups||[];
    window.SERVER_LIBRARY.selected=new Set(window.SERVER_LIBRARY.groups.filter(g=>g.default!==false).map(g=>g.id));
    window.SERVER_LIBRARY.lastError=null;
    wbdContext.renderServerLibraryPanel();
  }catch(e){
    window.SERVER_LIBRARY.manifest=null;
    window.SERVER_LIBRARY.groups=[];
    window.SERVER_LIBRARY.selected=new Set();
    window.SERVER_LIBRARY.lastError=e;
    wbdContext.renderServerLibraryPanel();
    wbdContext._serverSetStatus('서버 데이터 없음: 로컬 CSV 업로드만 사용 가능', true);
  }finally{
    window.SERVER_LIBRARY.loading=false;
  }
};

// Original index.html:3316
wbdContext.openServerLibraryModal = function openServerLibraryModal(){
  if(!window.SERVER_LIBRARY.groups.length)wbdContext.initServerLibrary(true).then(()=>wbdContext.openServerLibraryModal());
  const groups=window.SERVER_LIBRARY.groups||[];
  const total=groups.reduce((sum,g)=>sum+g.files.length,0);
  const body=groups.length?groups.map(wbdContext._serverGroupCardHtml).join(''):`<div style="font-size:12px;color:var(--muted);line-height:1.8;border:1px dashed var(--border);border-radius:6px;padding:12px">
    아직 서버 목록이 없습니다. <b>data/league/시즌명/</b> 등에 CSV를 넣고 manifest를 생성한 뒤 새로고침하세요.<br>
    기존 방식대로 <b>+ 경기</b> 또는 첫 화면 파일 선택으로 CSV를 직접 추가할 수 있습니다.
  </div>`;
  wbdContext.openModal(`<div class="card-title" style="font-size:14px;color:var(--amber);margin-bottom:12px">☁ 서버 CSV 관리</div>
    <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:12px">${groups.length?`${groups.length}개 그룹 / ${total}경기`:'서버 목록 없음'}</div>
    <div id="server-library-groups-modal" class="srv-grid" style="margin-bottom:14px">${body}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-primary" onclick="loadSelectedServerGroups(true)">선택 경기 다시 추가</button>
      <button class="btn-secondary" onclick="loadAllServerGroups(true)">전체 경기 다시 추가</button>
      <button class="btn-secondary" onclick="refreshServerLibrary().then(()=>{closeModal();openServerLibraryModal();})">목록 새로고침</button>
      <button class="btn-secondary" onclick="document.getElementById('add-file-input').click();closeModal()">내 CSV 추가</button>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:12px;line-height:1.6">※ 기본값은 서버 전체 자동 로드입니다. 이 창은 누락/갱신된 서버 경기만 다시 추가할 때 사용합니다. 중복 경기는 자동 스킵됩니다.</div>`);
};

// Original index.html:3347
wbdContext._serverProgress = function _serverProgress(show, pct, label, count){
  const wrap=document.getElementById('server-load-progress');
  const bar=document.getElementById('server-load-progress-bar');
  const lab=document.getElementById('server-load-progress-label');
  const cnt=document.getElementById('server-load-progress-count');
  if(wrap)wrap.style.display=show?'block':'none';
  if(bar)bar.style.width=Math.max(0,Math.min(100,pct||0))+'%';
  if(lab)lab.textContent=label||'';
  if(cnt)cnt.textContent=count||'';
};

// Original index.html:3358
wbdContext._serverSetStatus = function _serverSetStatus(msg, isError, busy){
  const el=document.getElementById('server-library-status');
  if(el){
    const dot = isError?'err':(busy||window._serverLoading?'busy':'');
    el.innerHTML='<span class="srv-live-dot '+dot+'"></span>'+String(msg).replace(/</g,'&lt;');
    el.style.color=isError?'var(--red)':'var(--muted)';
  }
};

// Original index.html:3367
wbdContext._normalizeServerManifest = function _normalizeServerManifest(raw){
  const result={groups:[]};
  if(!raw) return result;
  let groups=[];
  if(Array.isArray(raw.groups)) groups=raw.groups;
  else if(raw.categories && typeof raw.categories==='object' && !Array.isArray(raw.categories)){
    groups=Object.entries(raw.categories).map(([id,files])=>({id,name:id,files}));
  }else if(Array.isArray(raw.files)){
    groups=[{id:'all',name:'전체',default:true,files:raw.files}];
  }
  result.groups=groups.map((g,idx)=>{
    const id=String(g.id||g.key||('group_'+idx));
    let files=Array.isArray(g.files)?g.files:[];
    files=files.map((f,i)=>{
      if(typeof f==='string'){
        const short=f.split('/').pop()||f;
        return {name:short.replace(/\.(csv|txt)$/i,''), path:f};
      }
      const path=f.path||f.url||f.href||'';
      const short=(f.name||path.split('/').pop()||('game_'+(i+1))).replace(/\.(csv|txt)$/i,'');
      return {...f,name:f.name||short,path};
    }).filter(f=>f.path && /\.(csv|txt)(\?.*)?$/i.test(f.path));
    return {
      id,
      name:String(g.name||g.title||id),
      default:g.default!==false,
      files,
      bundle:g.bundle||null,
      description:g.description||'',
      category:g.category||'',
      categoryName:g.categoryName||''
    };
  }).filter(g=>g.files.length>0);
  return result;
};

// Original index.html:3403
wbdContext._selectedServerGroups = function _selectedServerGroups(all){
  const groups=window.SERVER_LIBRARY.groups||[];
  return all?groups:groups.filter(g=>window.SERVER_LIBRARY.selected.has(g.id));
};

// Original index.html:3408
wbdContext._fileMetaFromGroup = function _fileMetaFromGroup(g,f){
  return {
    ...f,
    _group:g.name,_groupId:g.id,
    category:g.category||'',
    categoryName:g.categoryName||'',
    groupName:g.name||'',
    groupId:g.id||'',
    source:'server'
  };
};

// Original index.html:3423
wbdContext._showLoadReport = function _showLoadReport(){
  const r=window._loadReport;
  if(!r) return;
  const rows=[];
  if(r.missing>0) rows.push(`<div style="padding:8px 10px;background:rgba(255,69,96,0.12);border-left:3px solid #ff4560;border-radius:4px;margin-bottom:6px">
    <b style="color:#ff4560">⚠️ 미확인 ${r.missing}개</b> — 다운로드는 됐지만 처리 결과가 확인되지 않았습니다. 재시도를 권장합니다.</div>`);
  if(r.failed.length) rows.push(`<div style="padding:8px 10px;background:rgba(255,140,68,0.12);border-left:3px solid #ff8c44;border-radius:4px;margin-bottom:6px">
    <b style="color:#ff8c44">실패 ${r.failed.length}개</b><div style="font-size:11px;color:var(--muted);margin-top:4px;max-height:120px;overflow:auto">${r.failed.map(f=>`<div>· ${f}</div>`).join('')}</div></div>`);
  if(r.skipped.length) rows.push(`<div style="padding:8px 10px;background:rgba(136,204,255,0.12);border-left:3px solid #88ccff;border-radius:4px;margin-bottom:6px">
    <b style="color:#88ccff">중복 스킵 ${r.skipped.length}개</b>
    <div style="font-size:11px;color:var(--muted);margin-top:4px">동일 내용으로 판정되어 건너뛴 파일입니다. <b>서로 다른 경기인데 스킵됐다면</b> 아래 목록을 확인하세요.</div>
    <div style="font-size:11px;margin-top:6px;max-height:160px;overflow:auto">${r.skipped.map(s=>`<div style="padding:3px 0;border-bottom:1px solid var(--border)">· ${s.label}</div>`).join('')}</div></div>`);
  const html=`<h3 style="color:var(--amber);font-family:var(--cond);margin-bottom:14px;font-size:16px">📋 로드 결과 리포트</h3>
  <div style="font-size:13px;margin-bottom:12px">
    요청 <b>${r.total}</b>개 → 로드 <b style="color:#39ff8a">${r.loaded}</b>개
    ${r.total!==r.loaded?`<span style="color:#ff8c44"> (차이 ${r.total-r.loaded}개)</span>`:''}
  </div>
  ${rows.join('')}
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
    <button onclick="closeModal();_diagnoseLoadedGames()" style="padding:7px 14px;background:var(--card2);border:1px solid var(--amber);color:var(--amber);border-radius:5px;font-size:12px;cursor:pointer">🔍 로드된 경기 목록 점검</button>
    <button onclick="closeModal()" style="padding:7px 14px;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:5px;font-size:12px;cursor:pointer">닫기</button>
  </div>`;
  wbdContext.openModal(html);
};

// Original index.html:3448
wbdContext._diagnoseLoadedGames = function _diagnoseLoadedGames(){
  const byDate={};
  wbdContext.GAMES.forEach(g=>{
    const i=wbdContext._parseGameName(g.name);
    const d=i.date||'(날짜없음)';
    (byDate[d]||(byDate[d]=[])).push({name:g.name, n:(g.pitches||[]).length, id:g.id, active:wbdContext.activeGameIds.has(g.id)});
  });
  const dates=Object.keys(byDate).sort();
  // 투구수가 같은 경기 = 중복 의심
  const byCount={};
  wbdContext.GAMES.forEach(g=>{ const n=(g.pitches||[]).length; (byCount[n]||(byCount[n]=[])).push(g.name); });
  const dupSuspect=Object.entries(byCount).filter(([n,arr])=>arr.length>1);
  const rows=dates.map(d=>{
    const list=byDate[d];
    return `<div style="margin-bottom:8px">
      <div style="font-size:12px;font-weight:700;color:var(--amber)">${d} <span style="color:var(--muted);font-weight:400">(${list.length}경기)</span></div>
      ${list.map(g=>`<div style="font-size:11px;padding:2px 0 2px 10px;color:${g.active?'var(--text)':'var(--muted)'}">
        ${g.active?'':'○ '}${g.name} <span style="color:var(--muted);font-family:var(--mono)">${g.n}구</span></div>`).join('')}
    </div>`;
  }).join('');
  const html=`<h3 style="color:var(--amber);font-family:var(--cond);margin-bottom:12px;font-size:16px">🔍 로드된 경기 점검</h3>
  <div style="font-size:13px;margin-bottom:12px">총 <b>${wbdContext.GAMES.length}</b>경기 · 활성 <b style="color:#39ff8a">${wbdContext.activeGameIds.size}</b>경기</div>
  ${dupSuspect.length?`<div style="padding:8px 10px;background:rgba(255,193,7,0.1);border-left:3px solid #ffc107;border-radius:4px;margin-bottom:10px;font-size:11px">
    <b style="color:#ffc107">투구수가 같은 경기 ${dupSuspect.length}쌍</b> — 정상일 수 있으나 중복 확인 권장<br>
    ${dupSuspect.slice(0,5).map(([n,arr])=>`<div style="color:var(--muted);margin-top:3px">${n}구: ${arr.join(' / ')}</div>`).join('')}
  </div>`:''}
  <div style="max-height:400px;overflow:auto;padding:8px;background:var(--card2);border-radius:5px">${rows}</div>
  <div style="font-size:10px;color:var(--muted);margin-top:8px">○ 표시 = 비활성 경기 (데이터 범위에서 제외됨)</div>
  <div style="margin-top:12px"><button onclick="closeModal()" style="padding:7px 14px;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:5px;font-size:12px;cursor:pointer">닫기</button></div>`;
  wbdContext.openModal(html);
};

// Original index.html:3479
wbdContext._fetchServerFilesIndividually = async function _fetchServerFilesIndividually(files, opts, progressBase, progressTotal){
  const concurrency=Math.max(2, Math.min(16, Number(window.SERVER_CSV_CONCURRENCY)||12));
  const results=new Array(files.length);
  let nextIdx=0, done=0, okCount=0;
  async function worker(){
    while(nextIdx<files.length){
      const i=nextIdx++;
      const f=files[i];
      const label=f.name || (String(f.path||'').split('/').pop()||`server_${i+1}.csv`);
      try{
        // V11.3: 실패 시 최대 2회 재시도 (네트워크 순간 오류로 인한 누락 방지)
        let text=null, lastErr=null;
        for(let attempt=0; attempt<3; attempt++){
          try{
            const res=await fetch(f.path,{cache:attempt?'reload':'default'});
            if(!res.ok)throw new Error(`HTTP ${res.status}`);
            text=await res.text();
            if(!text || text.length<10) throw new Error('빈 응답');
            lastErr=null; break;
          }catch(err){
            lastErr=err;
            if(attempt<2) await new Promise(r=>setTimeout(r, 250*(attempt+1)));
          }
        }
        if(lastErr) throw lastErr;
        results[i]={ok:true,text,label,path:f.path,meta:f};
        okCount++;
      }catch(e){
        console.error('[server csv load failed after retries]',f.path,e);
        results[i]={ok:false,label,path:f.path,error:e};
      }finally{
        done++;
        const current=(progressBase||0)+done;
        const total=progressTotal||files.length;
        const pct=total?current/total*45:10;
        wbdContext._serverSetStatus(`${opts.auto?'자동 전체 로드 중':'서버 CSV 다운로드 중'}... ${current} / ${total} (${okCount} 성공)`, false);
        wbdContext._serverProgress(true,pct,'다운로드 중',`${current} / ${total}`);
        await new Promise(r=>setTimeout(r,0));
      }
    }
  }
  const workers=Array.from({length:Math.min(concurrency,files.length)},()=>worker());
  await Promise.all(workers);
  return results;
};

// Original index.html:3525
wbdContext.loadServerGroups = async function loadServerGroups(groups, appendExisting, opts){
  opts=opts||{};
  groups=(groups||[]).filter(Boolean);
  const totalFiles=groups.reduce((s,g)=>s+(g.files||[]).length,0);
  if(!totalFiles){alert('불러올 서버 경기 그룹을 선택해줘.');return;}
  if(window._serverLoading){alert('이미 서버 경기 불러오는 중입니다.');return;}
  const totalBytes=groups.reduce((s,g)=>s+((g.files||[]).reduce((a,f)=>a+(Number(f.size)||0),0)),0);
  const mb=totalBytes/1024/1024;
  if(!opts.auto && (totalFiles>=60 || mb>=100)){
    const ok=confirm(`서버 경기 ${totalFiles}개${totalBytes?` / 약 ${mb.toFixed(1)}MB`:''}를 다시 불러옵니다. 계속할까요?`);
    if(!ok)return;
  }
  window._serverLoading=true;
  wbdContext._serverSetLoadUI(true,opts.auto?'auto':'manual');
  wbdContext._serverProgress(true,2,'서버 데이터 준비 중',`0 / ${totalFiles}`);
  const startedWithGames=wbdContext.GAMES.length>0;
  window._loadSkipped=[];
  window._loadExpected=totalFiles;
  const t0=performance.now();
  try{
    let allResults=[];
    let downloadedFiles=0;
    const withBundle=groups.filter(g=>g.bundle&&g.bundle.path);
    const withoutBundle=groups.filter(g=>!(g.bundle&&g.bundle.path));
    if(withBundle.length){
      let next=0, doneGroup=0;
      const concurrency=Math.max(1,Math.min(Number(window.SERVER_BUNDLE_CONCURRENCY)||4,withBundle.length));
      async function bundleWorker(){
        while(next<withBundle.length){
          const i=next++;
          const g=withBundle[i];
          try{
            wbdContext._serverSetStatus(`묶음 데이터 다운로드 중... ${doneGroup} / ${withBundle.length}그룹`, false);
            const arr=await wbdContext._fetchServerGroupBundle(g);
            allResults.push(...arr);
            downloadedFiles+=arr.length;
          }catch(e){
            console.warn('[server bundle fallback]',g.id,e);
            const files=(g.files||[]).map(f=>wbdContext._fileMetaFromGroup(g,f));
            const arr=await wbdContext._fetchServerFilesIndividually(files, opts, downloadedFiles, totalFiles);
            allResults.push(...arr);
            downloadedFiles+=arr.filter(x=>x&&x.ok).length;
          }finally{
            doneGroup++;
            const pct=10 + Math.min(35,(downloadedFiles/Math.max(1,totalFiles))*35);
            wbdContext._serverSetStatus(`서버 묶음 다운로드 중... ${downloadedFiles} / ${totalFiles}경기`, false);
            wbdContext._serverProgress(true,pct,'묶음 다운로드 중',`${downloadedFiles} / ${totalFiles}`);
            await new Promise(r=>setTimeout(r,0));
          }
        }
      }
      await Promise.all(Array.from({length:concurrency},()=>bundleWorker()));
    }
    if(withoutBundle.length){
      const files=withoutBundle.flatMap(g=>(g.files||[]).map(f=>wbdContext._fileMetaFromGroup(g,f)));
      const arr=await wbdContext._fetchServerFilesIndividually(files, opts, downloadedFiles, totalFiles);
      allResults.push(...arr);
    }

    // manifest 정렬 순서대로 분석되도록 정렬
    const order=new Map();
    groups.flatMap(g=>(g.files||[])).forEach((f,i)=>order.set(f.path,i));
    allResults.sort((a,b)=>(order.get(a.path)??999999)-(order.get(b.path)??999999));

    let loaded=0, parsed=0;
    const okCount=allResults.filter(r=>r&&r.ok).length;
    const failed=[];
    wbdContext._serverSetStatus(`${opts.auto?'자동 전체 로드 분석 중':'서버 CSV 분석 중'}... 0 / ${okCount}`, false);
    wbdContext._serverProgress(true,50,'분석 중',`0 / ${okCount}`);
    for(let i=0;i<allResults.length;i++){
      const r=allResults[i];
      if(!r || !r.ok){
        failed.push(`${r?.label||'unknown'}: ${r?.error?.message||'로드 실패'}`);
        continue;
      }
      try{
        const append=!!appendExisting || startedWithGames || loaded>0;
        wbdContext.loadData(r.text,r.label,append,true,{...r.meta,path:r.path,source:'server'});
        loaded++;
      }catch(e){
        if(e && e.code==='DUPLICATE'){
          // V11.3: 중복 스킵도 추적 — 오판정으로 조용히 누락되는 것 방지
          (window._loadSkipped||(window._loadSkipped=[])).push({label:r.label, path:r.path, reason:e.message||'중복'});
        }else{
          console.error('[server csv parse failed]',r.path,e);
          failed.push(`${r.label}: ${e.message}`);
        }
      }finally{
        parsed++;
        if(parsed%3===0 || parsed===okCount){
          const pct=50 + (parsed/Math.max(1,okCount))*45;
          wbdContext._serverSetStatus(`${opts.auto?'자동 전체 로드 분석 중':'서버 CSV 분석 중'}... ${parsed} / ${okCount}`, false);
          wbdContext._serverProgress(true,pct,'분석 중',`${parsed} / ${okCount}`);
          await new Promise(rr=>setTimeout(rr,0));
        }
      }
    }

    // V10.2: 자동 전체 로드는 최근 3개월만 초기 활성 (대용량에서 첫 화면 가볍게, 전체는 기간 프리셋으로)
    if(opts.auto && loaded>0 && !startedWithGames){
      if(wbdContext._setRecentDaysActive(90)) window._initialRecentApplied=true;
    }
    wbdContext._finishBulkLoad();
    const sec=((performance.now()-t0)/1000).toFixed(1);
    const skipped=(window._loadSkipped||[]).length;
    const accounted=loaded+failed.length+skipped;
    const missing=Math.max(0,totalFiles-accounted);
    const msg=`성공 ${loaded}개${failed.length?`, 실패 ${failed.length}개`:''}${skipped?`, 중복스킵 ${skipped}개`:''}${missing?`, ⚠️미확인 ${missing}개`:''} · ${sec}초`;
    // V11.3: 파일 수와 실제 로드 수가 안 맞으면 경고 배너 (조용한 누락 방지)
    if(skipped>0 || missing>0 || failed.length>0){
      window._loadReport={total:totalFiles, loaded, failed:failed.slice(), skipped:(window._loadSkipped||[]).slice(), missing};
      setTimeout(()=>{ if(typeof wbdContext._showLoadReport==='function') wbdContext._showLoadReport(); }, 800);
    }
    wbdContext._serverSetStatus(`${opts.auto?'전체 서버 경기 자동 로드 완료':'서버 경기 로드 완료'}: ${msg}`, failed.length>0);
    wbdContext._serverProgress(true,100,'완료',msg);
    setTimeout(()=>wbdContext._serverProgress(false,0,'',''),1400);
    wbdContext._toast('☁ 서버 경기 불러오기 완료', msg+(window._initialRecentApplied?'\n📅 최근 3개월 경기만 활성화됨 — 데이터 범위에서 기간 변경 가능':'')+(failed.length?'\n'+failed.slice(0,3).join('\n'):''), failed.length?'#ffb833':'#88ccff', 5500);
    window._initialRecentApplied=false;
    wbdContext.closeModal();
  }finally{
    window._serverLoading=false;
    wbdContext._serverSetLoadUI(false,opts.auto?'auto':'manual');
  }
};

// Original index.html:3650
wbdContext.loadAllServerGroups = async function loadAllServerGroups(append, opts){
  if(!window.SERVER_LIBRARY.groups.length)await wbdContext.initServerLibrary(true);
  await wbdContext.loadServerGroups(wbdContext._selectedServerGroups(true), !!append, opts||{});
};

// Original index.html:3654
wbdContext.loadSelectedServerGroups = async function loadSelectedServerGroups(append, opts){
  if(!window.SERVER_LIBRARY.groups.length)await wbdContext.initServerLibrary(true);
  await wbdContext.loadServerGroups(wbdContext._selectedServerGroups(false), !!append, opts||{});
};

// Original index.html:3659
wbdContext.autoLoadAllServerFiles = async function autoLoadAllServerFiles(){
  if(!window.SERVER_AUTO_LOAD_ALL)return;
  if(window.SERVER_LIBRARY.autoLoaded || window.SERVER_LIBRARY.autoLoading)return;
  const groups=window.SERVER_LIBRARY.groups||[];
  if(!groups.length)return;
  window.SERVER_LIBRARY.autoLoading=true;
  try{
    const total=groups.reduce((s,g)=>s+(g.files||[]).length,0);
    wbdContext._serverSetStatus(`전체 서버 경기 자동 로드 준비... ${total}경기`, false);
    await wbdContext.loadServerGroups(groups, wbdContext.GAMES.length>0, {auto:true});
    window.SERVER_LIBRARY.autoLoaded=true;
  }finally{
    window.SERVER_LIBRARY.autoLoading=false;
  }
};
}

export function initialize(wbdContext) {
// Original index.html:3178
wbdContext.SERVER_MANIFEST_URL = 'data/manifest.json';

// Original index.html:3179
window.SERVER_LIBRARY = { manifest:null, groups:[], selected:new Set(), loading:false, lastError:null, autoLoaded:false, autoLoading:false };

// Original index.html:3180
window.SERVER_AUTO_LOAD_ALL = true;

// Original index.html:3181
window.SERVER_CSV_CONCURRENCY = 8;

// Original index.html:3344
window.SERVER_CSV_CONCURRENCY = 16;

// Original index.html:3345
window.SERVER_BUNDLE_CONCURRENCY = 4;
}
