/** profile-manager: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:29905
wbdContext.renderPfpManagerPage = function renderPfpManagerPage(){
  const out = document.getElementById('pfpmanager-content');
  if(!out) return;
  
  const state = window._pfpState = window._pfpState || {
    search: '',
    filter: 'all',  // 'all', 'custom', 'default', 'missing'
    addName: '',
    addIdx: ''
  };
  
  const defaultMap = window.WBD_PFP_INDEX_DEFAULT || {};
  const customMap = window._loadCustomPfp();
  
  // 현재 게임에서 등장한 모든 선수
  const playersInGames = new Set();
  if(typeof wbdContext.G !== 'undefined' && wbdContext.G && wbdContext.G.length){
    wbdContext.G.forEach(d => {
      if(d.bName) playersInGames.add(d.bName);
      if(d.pName) playersInGames.add(d.pName);
    });
  }
  
  // 통합 — 기본/커스텀/게임에 등장한 선수 합집합
  const allNames = new Set([...Object.keys(defaultMap), ...Object.keys(customMap), ...playersInGames]);
  
  // 검색·필터 적용 — 정규화 매칭도 시도
  const sLower = state.search.toLowerCase();
  let entries = Array.from(allNames)
    .filter(n => !sLower || n.toLowerCase().includes(sLower))
    .map(name => {
      const exactDefault = defaultMap[name];
      const exactCustom = customMap[name];
      // 정규화 매칭 (정확 일치 없을 때만)
      let normMatchedIdx = null, normMatchedFrom = null;
      if(exactDefault === undefined && exactCustom === undefined){
        normMatchedIdx = window._getPfpIndex ? window._getPfpIndex(name) : null;
        if(normMatchedIdx){
          // 어느 키와 매칭됐는지 찾기
          const norm = window._normalizePfpName(name);
          for(const k in defaultMap){
            if(window._normalizePfpName(k) === norm){ normMatchedFrom = k; break; }
          }
        }
      }
      const effectiveIdx = exactCustom !== undefined ? exactCustom 
                         : (exactDefault !== undefined ? exactDefault : normMatchedIdx);
      return {
        name,
        defaultIdx: exactDefault,
        customIdx: exactCustom,
        effectiveIdx,
        normMatched: !!normMatchedFrom,
        normMatchedFrom,
        inGame: playersInGames.has(name),
        hasCustom: exactCustom !== undefined
      };
    });
  
  if(state.filter === 'custom') entries = entries.filter(e => e.hasCustom);
  else if(state.filter === 'default') entries = entries.filter(e => !e.hasCustom && e.defaultIdx);
  else if(state.filter === 'missing') entries = entries.filter(e => !e.effectiveIdx);
  else if(state.filter === 'ingame') entries = entries.filter(e => e.inGame);
  else if(state.filter === 'normmatch') entries = entries.filter(e => e.normMatched);
  
  // 정렬: 게임 등장 선수 우선 → 알파벳
  entries.sort((a,b) => {
    if(a.inGame !== b.inGame) return a.inGame ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  
  // 통계
  const stats = {
    total: allNames.size,
    withImage: entries.filter(e => e.effectiveIdx).length,
    custom: Object.keys(customMap).length,
    inGameWithImage: Array.from(playersInGames).filter(n => {
      const eff = customMap[n] !== undefined ? customMap[n] : defaultMap[n];
      return eff;
    }).length,
    inGameMissing: Array.from(playersInGames).filter(n => {
      const eff = customMap[n] !== undefined ? customMap[n] : defaultMap[n];
      return !eff;
    }).length
  };
  
  let html = `<div class="container">
    <h1 style="margin:0 0 6px">👤 프로필 & 선수 관리</h1>
    <div style="color:var(--muted);font-size:12px;margin-bottom:14px">프로필 사진 매핑과 동일 선수(닉네임/계정 변경) 병합을 관리합니다.</div>
    <!-- 관리 탭 -->
    <div style="display:flex;gap:6px;margin-bottom:18px;border-bottom:1px solid var(--border);flex-wrap:wrap">
      ${(function(){const t=window._pfpMgrTab||'pfp';const mk=(id,label)=>`<button onclick="window._pfpMgrTab='${id}';renderPfpManagerPage()" style="background:${t===id?'var(--amber)':'transparent'};color:${t===id?'#111':'var(--text)'};border:none;border-bottom:2px solid ${t===id?'var(--amber)':'transparent'};padding:8px 16px;font-size:13px;font-weight:${t===id?'700':'500'};cursor:pointer;border-radius:4px 4px 0 0">${label}</button>`;return mk('pfp','🖼️ 프로필 사진')+mk('merge','🔗 선수명 병합');})()}
    </div>
    <div id="pfp-tab-pfp" style="display:${(window._pfpMgrTab||'pfp')==='pfp'?'block':'none'}">
    <div style="color:var(--muted);font-size:12px;margin-bottom:18px">WBD 공식 프로필 사진(<code>https://images.vrcbaseball.com/pfp/{인덱스}.png</code>)을 선수별로 매핑합니다.</div>
    
    <!-- 통계 카드 -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:20px">
      <div class="card section" style="padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--muted)">전체 선수</div>
        <div style="font-size:22px;font-weight:900;color:var(--text);font-family:var(--mono)">${stats.total}</div>
      </div>
      <div class="card section" style="padding:14px;text-align:center;border-left:3px solid #39ff8a">
        <div style="font-size:11px;color:var(--muted)">사진 있음</div>
        <div style="font-size:22px;font-weight:900;color:#39ff8a;font-family:var(--mono)">${stats.withImage}</div>
      </div>
      <div class="card section" style="padding:14px;text-align:center;border-left:3px solid #ffd700">
        <div style="font-size:11px;color:var(--muted)">내가 추가</div>
        <div style="font-size:22px;font-weight:900;color:#ffd700;font-family:var(--mono)">${stats.custom}</div>
      </div>
      <div class="card section" style="padding:14px;text-align:center;border-left:3px solid #88ccff">
        <div style="font-size:11px;color:var(--muted)">게임 출전 + 사진</div>
        <div style="font-size:22px;font-weight:900;color:#88ccff;font-family:var(--mono)">${stats.inGameWithImage}</div>
      </div>
      <div class="card section" style="padding:14px;text-align:center;border-left:3px solid #ff4560">
        <div style="font-size:11px;color:var(--muted)">게임 출전 + 사진 없음</div>
        <div style="font-size:22px;font-weight:900;color:#ff4560;font-family:var(--mono)">${stats.inGameMissing}</div>
      </div>
    </div>
    
    <!-- 새 인덱스 추가 -->
    <div class="card section" style="padding:16px;margin-bottom:16px;border-left:3px solid #39ff8a">
      <div style="font-size:13px;font-weight:700;color:#39ff8a;margin-bottom:10px">➕ 새 매핑 추가/수정</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="text" id="pfp-add-name" placeholder="선수 이름" value="${state.addName.replace(/"/g,'&quot;')}" 
               style="flex:1;min-width:180px;padding:8px 10px;background:var(--card2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:13px"
               oninput="window._pfpState.addName=this.value">
        <input type="number" id="pfp-add-idx" placeholder="인덱스 번호" value="${state.addIdx}" min="1" max="9999"
               style="width:120px;padding:8px 10px;background:var(--card2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:13px"
               oninput="window._pfpState.addIdx=this.value">
        <button onclick="window._pfpAdd()" style="background:#39ff8a;color:#000;border:none;padding:8px 16px;font-size:12px;font-weight:700;border-radius:5px;cursor:pointer">저장</button>
        <button onclick="window._pfpPreview()" style="background:var(--card2);color:var(--text);border:1px solid var(--border);padding:8px 16px;font-size:12px;font-weight:700;border-radius:5px;cursor:pointer">🔍 미리보기</button>
      </div>
      <div id="pfp-preview-area" style="margin-top:10px;display:none"></div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:8px">💡 게임에서 사용 중인 선수 이름과 정확히 일치해야 표시됩니다. 인덱스는 1~9999 사이 숫자.</div>
    </div>
    
    <!-- 검색·필터 -->
    <div class="card section" style="padding:14px;margin-bottom:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <input type="text" placeholder="🔍 이름 검색..." value="${state.search.replace(/"/g,'&quot;')}"
               style="flex:1;min-width:200px;padding:8px 10px;background:var(--card2);border:1px solid var(--border);border-radius:5px;color:var(--text);font-size:13px"
               oninput="window._pfpState.search=this.value;renderPfpManagerPage()">
        ${['all','ingame','missing','normmatch','custom','default'].map(f => {
          const labels = {all:'전체', ingame:'게임 출전만', missing:'사진 없음', normmatch:'🔗 자동 매칭', custom:'내가 추가한 것', default:'기본 매핑'};
          const active = state.filter === f;
          return `<button onclick="window._pfpState.filter='${f}';renderPfpManagerPage()" style="background:${active?'#88ccff':'var(--card2)'};color:${active?'#000':'var(--text)'};border:1px solid var(--border);padding:6px 12px;font-size:11.5px;font-weight:700;border-radius:4px;cursor:pointer">${labels[f]}</button>`;
        }).join('')}
      </div>
    </div>
    
    <!-- 선수 목록 -->
    <div class="card section" style="padding:0;overflow:hidden">
      <div style="padding:10px 14px;background:var(--card2);border-bottom:1px solid var(--border);font-size:12px;color:var(--muted)">
        ${entries.length}명 표시 중 (최대 100명까지)
      </div>
      <div style="max-height:600px;overflow-y:auto">
        ${entries.slice(0, 100).map(e => wbdContext._pfpRowHtml(e)).join('')}
        ${entries.length > 100 ? `<div style="padding:14px;text-align:center;color:var(--muted);font-size:12px">${entries.length-100}명 더 있음 — 검색으로 좁혀주세요</div>` : ''}
        ${entries.length === 0 ? `<div style="padding:30px;text-align:center;color:var(--muted)">조건에 맞는 선수가 없습니다.</div>` : ''}
      </div>
    </div>
    
    <!-- 백업/복원 -->
    <div class="card section" style="padding:14px;margin-top:14px;background:var(--card2)">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px">💾 내 매핑 백업/복원</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="window._pfpExport()" style="background:var(--card);color:var(--text);border:1px solid var(--border);padding:7px 14px;font-size:11.5px;border-radius:4px;cursor:pointer">📤 JSON 내보내기</button>
        <button onclick="document.getElementById('pfp-import-file').click()" style="background:var(--card);color:var(--text);border:1px solid var(--border);padding:7px 14px;font-size:11.5px;border-radius:4px;cursor:pointer">📥 JSON 가져오기</button>
        <input type="file" id="pfp-import-file" accept=".json" style="display:none" onchange="window._pfpImport(this)">
        <button onclick="window._pfpClearAll()" style="background:rgba(255,69,96,0.1);color:#ff4560;border:1px solid #ff4560;padding:7px 14px;font-size:11.5px;border-radius:4px;cursor:pointer">🗑️ 내 매핑 전체 삭제</button>
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:8px">내가 추가/수정한 매핑(${stats.custom}개)만 백업됩니다. 기본 ${Object.keys(defaultMap).length}명 매핑은 코드에 내장.</div>
    </div>
    </div><!-- /pfp tab -->
    <div id="pfp-tab-merge" style="display:${(window._pfpMgrTab||'pfp')==='merge'?'block':'none'}">
      ${wbdContext._renderPlayerMergeSection()}
    </div>
  </div>`;
  
  out.innerHTML = html;
};

// Original index.html:30089
wbdContext._renderPlayerMergeSection = function _renderPlayerMergeSection(){
  const merges = wbdContext.playerMergeList();
  const active = merges.filter(m=>!m.disabled);
  const disabled = merges.filter(m=>m.disabled);
  // 현재 데이터에 등장한 모든 선수 이름 (병합 추가 드롭다운용)
  const names=new Set();
  if(typeof wbdContext.G!=='undefined'&&wbdContext.G&&wbdContext.G.length){ wbdContext.G.forEach(d=>{ if(d.bName)names.add(wbdContext._canonPlayer(d.bName)); if(d.pName)names.add(wbdContext._canonPlayer(d.pName)); }); }
  const nameOpts=Array.from(names).sort().map(n=>`<option value="${String(n).replace(/"/g,'&quot;')}">${n}</option>`).join('');
  const esc=s=>String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');

  let html=`<div style="max-width:820px">
    <div style="color:var(--muted);font-size:12px;margin-bottom:16px">닉네임이나 계정을 바꾼 <b>동일 인물</b>을 최신 닉네임으로 통합합니다. 옛 이름의 기록이 최신 이름으로 합산되어 기록실·리더보드·카드에 한 명으로 표시됩니다.</div>`;

  // 새 병합 추가
  html+=`<div class="card section" style="padding:16px;margin-bottom:18px;background:var(--card2)">
    <div style="font-size:13px;font-weight:700;margin-bottom:12px">➕ 새 병합 추가</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <input list="pmerge-names" id="pmerge-old" placeholder="옛 이름 (합쳐질 이름)" style="flex:1;min-width:180px;background:var(--card);border:1px solid var(--border);color:var(--text);padding:8px 10px;border-radius:4px;font-size:12px">
      <span style="color:var(--amber);font-size:16px">→</span>
      <input list="pmerge-names" id="pmerge-new" placeholder="최신 이름 (대표 이름)" style="flex:1;min-width:180px;background:var(--card);border:1px solid var(--border);color:var(--text);padding:8px 10px;border-radius:4px;font-size:12px">
      <datalist id="pmerge-names">${nameOpts}</datalist>
      <button onclick="_pmergeAddFromUI()" style="background:var(--amber);color:#111;border:none;padding:8px 16px;font-size:12px;font-weight:700;border-radius:4px;cursor:pointer">병합</button>
    </div>
    <div style="font-size:10.5px;color:var(--muted);margin-top:8px">예: <code>にゃんこ3K</code> → <code>にゃんこ65K</code> (왼쪽이 오른쪽으로 합쳐짐)</div>
  </div>`;

  // 활성 병합 목록
  html+=`<div style="font-size:13px;font-weight:700;margin-bottom:8px">🔗 적용 중인 병합 (${active.length})</div>`;
  if(active.length){
    html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>옛 이름</th><th></th><th>최신 이름 (표시)</th><th>구분</th><th>해제</th></tr></thead><tbody>';
    active.forEach(m=>{
      const badge=m.source==='user'?'<span style="font-size:10px;background:#39ff8a22;color:#39ff8a;padding:1px 6px;border-radius:3px">유저</span>':'<span style="font-size:10px;background:#88ccff22;color:#88ccff;padding:1px 6px;border-radius:3px">기본</span>';
      html+=`<tr>
        <td style="font-family:var(--mono);font-size:12px;color:var(--muted)">${m.old}</td>
        <td style="color:var(--amber)">→</td>
        <td style="font-family:var(--mono);font-size:12px;font-weight:600">${m.now}</td>
        <td>${badge}</td>
        <td><button onclick="_pmergeDisable('${esc(m.old)}')" title="병합 해제 (다시 따로)" style="background:rgba(255,69,96,0.1);color:#ff4560;border:1px solid #ff4560;padding:4px 10px;font-size:11px;border-radius:3px;cursor:pointer">해제</button></td>
      </tr>`;
    });
    html+='</tbody></table></div>';
  }else{
    html+='<div style="padding:16px;color:var(--muted);font-size:12px;background:var(--card2);border-radius:6px">적용 중인 병합이 없습니다.</div>';
  }

  // 해제된 병합 (다시 켜기)
  if(disabled.length){
    html+=`<div style="font-size:13px;font-weight:700;margin:18px 0 8px;color:var(--muted)">⏸️ 해제된 병합 (${disabled.length})</div>`;
    html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>옛 이름</th><th></th><th>최신 이름</th><th>다시 켜기</th></tr></thead><tbody>';
    disabled.forEach(m=>{
      html+=`<tr style="opacity:.6">
        <td style="font-family:var(--mono);font-size:12px">${m.old}</td>
        <td style="color:var(--muted)">→</td>
        <td style="font-family:var(--mono);font-size:12px">${m.now}</td>
        <td><button onclick="_pmergeEnable('${esc(m.old)}')" style="background:rgba(57,255,138,0.1);color:#39ff8a;border:1px solid #39ff8a;padding:4px 10px;font-size:11px;border-radius:3px;cursor:pointer">병합 켜기</button></td>
      </tr>`;
    });
    html+='</tbody></table></div>';
  }

  html+='</div>';
  return html;
};

// Original index.html:30154
wbdContext._pmergeAddFromUI = function _pmergeAddFromUI(){
  const oldN=(document.getElementById('pmerge-old')||{}).value||'';
  const newN=(document.getElementById('pmerge-new')||{}).value||'';
  if(!oldN.trim()||!newN.trim()){ alert('옛 이름과 최신 이름을 모두 입력하세요.'); return; }
  if(oldN.trim()===newN.trim()){ alert('같은 이름은 병합할 수 없습니다.'); return; }
  wbdContext.playerMergeAdd(oldN.trim(), newN.trim());
  wbdContext.rebuildG(); wbdContext.renderPfpManagerPage();
};

// Original index.html:30162
wbdContext._pmergeDisable = function _pmergeDisable(oldN){ wbdContext.playerMergeDisable(oldN); wbdContext.rebuildG(); wbdContext.renderPfpManagerPage(); };

// Original index.html:30163
wbdContext._pmergeEnable = function _pmergeEnable(oldN){ wbdContext.playerMergeEnable(oldN); wbdContext.rebuildG(); wbdContext.renderPfpManagerPage(); };

// Original index.html:30165
wbdContext._pfpRowHtml = function _pfpRowHtml(e){
  const eff = e.effectiveIdx;
  const url = eff ? `https://images.vrcbaseball.com/pfp/${eff}.png` : '';
  const badge = e.hasCustom ? '<span style="background:#ffd700;color:#000;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-left:6px">CUSTOM</span>' : '';
  const gameBadge = e.inGame ? '<span style="background:#88ccff;color:#000;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-left:6px">게임</span>' : '';
  const missingBadge = !eff ? '<span style="background:#ff4560;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-left:6px">사진없음</span>' : '';
  const normBadge = e.normMatched ? '<span style="background:#cc44ff;color:#fff;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;margin-left:6px" title="유사 문자 자동 매칭됨">🔗 자동</span>' : '';
  const nameEsc = String(e.name).replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const idxColor = e.hasCustom ? '#ffd700' : (e.normMatched ? '#cc44ff' : '#88ccff');
  
  return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--border)">
    <div style="width:44px;height:44px;border-radius:50%;overflow:hidden;background:#0f1828;border:2px solid var(--border);flex-shrink:0;display:flex;align-items:center;justify-content:center">
      ${eff ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${url}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=&quot;font-size:10px;color:#ff4560&quot;>❌</span>'">` : '<span style="font-size:18px;color:#666">👤</span>'}
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:13px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}${badge}${gameBadge}${normBadge}${missingBadge}</div>
      <div style="font-size:10.5px;color:var(--muted);margin-top:2px">
        ${e.effectiveIdx ? `인덱스: <b style="color:${idxColor}">${e.effectiveIdx}</b>` : '<i>매핑 없음</i>'}
        ${e.hasCustom && e.defaultIdx ? ` <span style="color:#666">(기본: ${e.defaultIdx})</span>` : ''}
        ${e.normMatched && e.normMatchedFrom ? ` <span style="color:#cc44ff">≈ &quot;${e.normMatchedFrom}&quot;</span>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:5px;flex-shrink:0">
      <button onclick="window._pfpEdit('${nameEsc}', ${eff||0})" style="background:var(--card2);color:var(--text);border:1px solid var(--border);padding:5px 10px;font-size:10.5px;border-radius:3px;cursor:pointer">수정</button>
      ${e.hasCustom ? `<button onclick="window._pfpRemove('${nameEsc}')" style="background:rgba(255,69,96,0.1);color:#ff4560;border:1px solid #ff4560;padding:5px 10px;font-size:10.5px;border-radius:3px;cursor:pointer">삭제</button>` : ''}
    </div>
  </div>`;
};
}

export function initialize(wbdContext) {
// Original index.html:30195
window._pfpAdd = function(){
  const name = (window._pfpState.addName || '').trim();
  const idx = parseInt(window._pfpState.addIdx);
  if(!name){ alert('선수 이름을 입력하세요.'); return; }
  if(!idx || idx < 1 || idx > 9999){ alert('인덱스는 1~9999 사이 숫자입니다.'); return; }
  const map = window._loadCustomPfp();
  map[name] = idx;
  if(window._saveCustomPfp(map)){
    window._pfpState.addName = '';
    window._pfpState.addIdx = '';
    wbdContext._toast('✅ 저장됨', `${name} → 인덱스 ${idx}`, '#39ff8a', 3000);
    wbdContext.renderPfpManagerPage();
  } else {
    alert('저장 실패 (브라우저 저장공간 확인).');
  }
};

// Original index.html:30212
window._pfpPreview = function(){
  const idx = parseInt(window._pfpState.addIdx);
  const area = document.getElementById('pfp-preview-area');
  if(!area) return;
  if(!idx || idx < 1){
    area.innerHTML = '<div style="color:#ff4560;font-size:11.5px">유효한 인덱스를 입력하세요.</div>';
    area.style.display = 'block';
    return;
  }
  const url = `https://images.vrcbaseball.com/pfp/${idx}.png`;
  area.innerHTML = `<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--card2);border-radius:5px">
    <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;background:#0f1828;border:2px solid var(--border);display:flex;align-items:center;justify-content:center">
      <img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${url}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentNode.innerHTML='<span style=&quot;color:#ff4560;font-size:11px&quot;>이미지 없음</span>'">
    </div>
    <div style="font-size:12px;color:var(--muted)">미리보기: 인덱스 <b style="color:#88ccff">${idx}</b><br><span style="font-size:10px;font-family:var(--mono)">${url}</span></div>
  </div>`;
  area.style.display = 'block';
};

// Original index.html:30231
window._pfpEdit = function(name, currentIdx){
  window._pfpState.addName = name;
  window._pfpState.addIdx = currentIdx || '';
  wbdContext.renderPfpManagerPage();
  setTimeout(() => {
    const inp = document.getElementById('pfp-add-idx');
    if(inp){ inp.focus(); inp.select(); }
  }, 50);
};

// Original index.html:30241
window._pfpRemove = function(name){
  if(!confirm(`"${name}"의 커스텀 매핑을 삭제할까요? (기본 매핑이 있으면 기본값으로 돌아갑니다)`)) return;
  const map = window._loadCustomPfp();
  delete map[name];
  window._saveCustomPfp(map);
  wbdContext._toast('🗑️ 삭제됨', name, '#ff4560', 2500);
  wbdContext.renderPfpManagerPage();
};

// Original index.html:30250
window._pfpExport = function(){
  const map = window._loadCustomPfp();
  const cnt = Object.keys(map).length;
  if(!cnt){ alert('내보낼 커스텀 매핑이 없습니다.'); return; }
  const blob = new Blob([JSON.stringify(map, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wbd_pfp_custom_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Original index.html:30263
window._pfpImport = function(input){
  if(!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if(typeof data !== 'object' || data === null) throw new Error('JSON 객체가 아님');
      const cur = window._loadCustomPfp();
      let added = 0, updated = 0;
      Object.entries(data).forEach(([name, idx]) => {
        const i = parseInt(idx);
        if(!name || !i || i < 1) return;
        if(cur[name] !== undefined) updated++;
        else added++;
        cur[name] = i;
      });
      window._saveCustomPfp(cur);
      wbdContext._toast('📥 가져오기 완료', `추가 ${added}건 · 업데이트 ${updated}건`, '#39ff8a', 4000);
      wbdContext.renderPfpManagerPage();
    } catch(err){
      alert('JSON 파일 읽기 실패: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
};

// Original index.html:30291
window._pfpClearAll = function(){
  const map = window._loadCustomPfp();
  const cnt = Object.keys(map).length;
  if(!cnt){ alert('삭제할 커스텀 매핑이 없습니다.'); return; }
  if(!confirm(`내가 추가한 매핑 ${cnt}개를 모두 삭제할까요? (기본 매핑은 유지됩니다)`)) return;
  window._saveCustomPfp({});
  wbdContext._toast('🗑️ 전체 삭제됨', `${cnt}개 매핑 제거`, '#ff4560', 3000);
  wbdContext.renderPfpManagerPage();
};
}
