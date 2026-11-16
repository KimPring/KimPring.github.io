/** settings-changelog: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:14979
wbdContext.applyTheme = function applyTheme(name){
  const t=wbdContext.THEMES[name]||wbdContext.THEMES.dark;
  const root=document.documentElement;
  // 모든 테마 변수 초기화
  ['--bg','--card','--card2','--border','--text','--muted','--amber','--green','--red','--blue','--purple'].forEach(v=>root.style.removeProperty(v));
  // 새 테마 적용
  Object.entries(t.vars||{}).forEach(([k,v])=>root.style.setProperty(k,v));
  wbdContext.LS.set('theme',name);
  // 버튼 active 상태 갱신
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===name));
};

// Original index.html:14990
wbdContext.openShortcutsModal = function openShortcutsModal(){
  const html=`<div style="max-width:480px;margin:0 auto">
    <h2 style="margin:0 0 14px;color:var(--amber)">⌨️ 키보드 단축키</h2>
    <div style="display:grid;gap:8px">
      <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--card2);border-radius:4px"><span>홈 / 투수 / 타자 / 카드 / 리더보드 / 팀 / 비교 / 어워드 / 인사이트</span><kbd style="font-family:var(--mono);background:var(--card);padding:2px 8px;border-radius:3px;border:1px solid var(--border)">1 ~ 9</kbd></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--card2);border-radius:4px"><span>글로벌 검색 열기</span><kbd style="font-family:var(--mono);background:var(--card);padding:2px 8px;border-radius:3px;border:1px solid var(--border)">/</kbd></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--card2);border-radius:4px"><span>모달 닫기</span><kbd style="font-family:var(--mono);background:var(--card);padding:2px 8px;border-radius:3px;border:1px solid var(--border)">ESC</kbd></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--card2);border-radius:4px"><span>이전 페이지</span><kbd style="font-family:var(--mono);background:var(--card);padding:2px 8px;border-radius:3px;border:1px solid var(--border)">Alt + ←</kbd></div>
      <div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--card2);border-radius:4px"><span>다음 페이지</span><kbd style="font-family:var(--mono);background:var(--card);padding:2px 8px;border-radius:3px;border:1px solid var(--border)">Alt + →</kbd></div>
    </div>
    <div style="margin-top:14px;padding:10px;background:var(--card2);border-radius:4px;font-size:12px;color:var(--muted)">
      💡 브라우저 뒤로가기 키 (마우스 4번 버튼, 모바일 뒤로가기 제스처)도 작동합니다. 페이지 이동이 자동으로 히스토리에 기록돼요.
    </div>
  </div>`;
  wbdContext.openModal(html);
};

// Original index.html:15007
wbdContext.openThemeModal = function openThemeModal(){
  const cur=wbdContext.LS.get('theme','dark');
  let html='<div style="margin-bottom:14px"><div style="font-size:18px;font-weight:700;margin-bottom:6px">🎨 테마 선택</div><div style="font-size:12px;color:var(--muted)">원하는 테마를 골라주세요. 설정은 브라우저에 저장돼요.</div></div>';
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">';
  Object.entries(wbdContext.THEMES).forEach(([k,t])=>{
    const bg=t.vars['--bg']||'#050c18';
    const card=t.vars['--card']||'#0d1825';
    const amber=t.vars['--amber']||'#f5a623';
    const text=t.vars['--text']||'#e8eff8';
    const active=cur===k?`border:2px solid ${amber};box-shadow:0 0 14px ${amber}66`:'border:1px solid var(--border)';
    html+=`<div class="theme-btn" data-theme="${k}" onclick="applyTheme('${k}')" style="${active};background:${card};padding:14px;border-radius:6px;cursor:pointer;text-align:center;transition:all .2s">
      <div style="background:${bg};padding:8px;border-radius:4px;margin-bottom:8px">
        <div style="height:6px;background:${amber};border-radius:2px;margin-bottom:4px;width:60%"></div>
        <div style="height:4px;background:${text}44;border-radius:2px;margin-bottom:3px"></div>
        <div style="height:4px;background:${text}44;border-radius:2px;width:80%"></div>
      </div>
      <div style="font-size:13px;font-weight:600;color:${text}">${t.name}</div>
    </div>`;
  });
  html+='</div>';
  wbdContext.openModal(html);
};

// Original index.html:15613
wbdContext._clCategory = function _clCategory(item){
  const ic=item.icon||'', tx=(item.text||'');
  const plain=tx.replace(/<[^>]+>/g,'');
  if(/🐛|버그|오류|픽스|수정됨|잘못/.test(ic+plain.slice(0,40))) return 'fix';
  if(/⚡|🩹|성능|최적화|속도|렉|프리즈|캐시|누락 방지|재시도/.test(ic+plain.slice(0,40))) return 'perf';
  if(/📦|내보내기|schema|스키마|codeMaps|glossary/.test(ic+plain.slice(0,40))) return 'data';
  if(/📐|📏|🧪|⚖️|🔬|지표|산정식|보정|백분위|가중치|계산식|OAA|WAR|세이버/.test(ic+plain.slice(0,50))) return 'metric';
  if(/🎨|✨|🗺️|📊|🔍|🎯|차트|히트맵|시각화|디자인|맵|그래프|레이더|카드|모달|탭 추가|화면/.test(ic+plain.slice(0,50))) return 'ui';
  return 'feat';
};

// Original index.html:15625
wbdContext._clSetFilter = function _clSetFilter(v){ window._clFilter=v; wbdContext.openChangelogModal(true); };

// Original index.html:15626
wbdContext._clToggle = function _clToggle(v){ window._clExpanded = (window._clExpanded===v)?null:v; wbdContext.openChangelogModal(true); };

// Original index.html:15627
wbdContext._clExpandAll = function _clExpandAll(){ window._clExpanded='__all__'; wbdContext.openChangelogModal(true); };

// Original index.html:15629
wbdContext.openChangelogModal = function openChangelogModal(keepScroll){
  if(!keepScroll){ window._clFilter='all'; window._clExpanded=null; }   // 새로 열면 초기화
  const F=window._clFilter||'all';
  // 카테고리별 전체 집계
  const counts={};
  wbdContext.CHANGELOG.forEach(r=>r.changes.forEach(ch=>{
    const k=wbdContext._clCategory(ch); counts[k]=(counts[k]||0)+1;
  }));
  const total=Object.values(counts).reduce((a,b)=>a+b,0);

  let html='<div style="margin-bottom:14px;text-align:center">';
  html+='<div style="font-size:22px;font-weight:700;margin-bottom:4px">📋 업데이트 내역</div>';
  html+=`<div style="font-size:11px;color:var(--muted)">${wbdContext.CHANGELOG.length}개 버전 · ${total}개 변경사항</div>`;
  html+='</div>';

  // 카테고리 필터
  const btn=(k,lbl,n,col)=>`<button onclick="_clSetFilter('${k}')" style="padding:5px 11px;font-size:11px;font-weight:600;border:1px solid ${F===k?(col||'var(--amber)'):'var(--border)'};background:${F===k?(col||'var(--amber)')+'22':'transparent'};color:${F===k?(col||'var(--amber)'):'var(--muted)'};border-radius:14px;cursor:pointer;white-space:nowrap">${lbl}${n!=null?` <span style="opacity:0.7">${n}</span>`:''}</button>`;
  html+='<div style="display:flex;gap:5px;flex-wrap:wrap;justify-content:center;margin-bottom:14px">';
  html+=btn('all','전체',total,'var(--amber)');
  Object.entries(wbdContext._CL_CATS).forEach(([k,m])=>{
    if(counts[k]) html+=btn(k, m.icon+' '+m.label, counts[k], m.color);
  });
  html+='</div>';

  // 펼치기 컨트롤
  html+=`<div style="display:flex;gap:6px;justify-content:center;margin-bottom:12px">
    <button onclick="_clExpandAll()" style="padding:4px 10px;font-size:10px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:4px;cursor:pointer">전체 펼치기</button>
    <button onclick="window._clExpanded=null;openChangelogModal(true)" style="padding:4px 10px;font-size:10px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:4px;cursor:pointer">모두 접기</button>
  </div>`;

  wbdContext.CHANGELOG.forEach((release,i)=>{
    const isLatest=i===0;
    const items=release.changes.filter(ch=>F==='all'||wbdContext._clCategory(ch)===F);
    if(!items.length) return;
    const expanded = isLatest || window._clExpanded==='__all__' || window._clExpanded===release.version;
    // 이 버전의 카테고리 분포
    const dist={};
    release.changes.forEach(ch=>{const k=wbdContext._clCategory(ch); dist[k]=(dist[k]||0)+1;});
    const chips=Object.entries(dist).sort((a,b)=>b[1]-a[1]).map(([k,n])=>{
      const m=wbdContext._CL_CATS[k];
      return `<span style="font-size:9px;color:${m.color};background:${m.color}18;padding:1px 6px;border-radius:8px">${m.icon}${n}</span>`;
    }).join(' ');

    html+=`<div style="margin-bottom:14px;padding:13px;background:${isLatest?'#1a1a30':'var(--card2)'};border:1px solid ${isLatest?release.badge:'var(--border)'};border-radius:8px${isLatest?';box-shadow:0 0 12px '+release.badge+'33':''}">
      <div onclick="_clToggle('${release.version}')" style="cursor:pointer;display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-bottom:${expanded?'9px':'0'}">
        <span style="font-size:19px;font-weight:900;color:${release.badge};letter-spacing:1px">${release.version}</span>
        ${isLatest?`<span style="background:${release.badge};color:#000;font-size:9px;padding:2px 6px;border-radius:3px;font-weight:700;letter-spacing:1px">LATEST</span>`:''}
        <span style="font-size:10.5px;color:var(--muted);font-family:var(--mono)">${release.date}</span>
        <span style="margin-left:auto;display:flex;gap:3px;align-items:center">${chips}
          <span style="font-size:11px;color:var(--muted);margin-left:4px">${expanded?'▲':'▼'}</span></span>
      </div>`;
    if(expanded){
      html+=`<div style="font-size:13.5px;font-weight:700;color:var(--text);margin-bottom:9px;line-height:1.5">${release.title}</div>`;
      // 카테고리별 그룹핑
      const grouped={};
      items.forEach(ch=>{const k=wbdContext._clCategory(ch); (grouped[k]||(grouped[k]=[])).push(ch);});
      const order=['feat','metric','ui','fix','perf','data'];
      order.filter(k=>grouped[k]).forEach(k=>{
        const m=wbdContext._CL_CATS[k];
        html+=`<div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:700;color:${m.color};letter-spacing:0.5px;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid ${m.color}33">${m.icon} ${m.label}</div>
          <div style="display:flex;flex-direction:column;gap:5px">`;
        grouped[k].forEach(ch=>{
          html+=`<div style="display:flex;align-items:flex-start;gap:7px;font-size:12px;padding:2px 0">
            <span style="font-size:13px;flex-shrink:0;width:18px">${ch.icon}</span>
            <span style="color:var(--text);line-height:1.55">${ch.text}</span>
          </div>`;
        });
        html+='</div></div>';
      });
    } else {
      html+=`<div style="font-size:12px;color:var(--muted);line-height:1.4;margin-top:6px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical">${release.title}</div>`;
    }
    html+='</div>';
  });

  html+='<div style="text-align:center;color:var(--muted);font-size:11px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">';
  html+='⚾ WBD Baseball Analyzer · 버전 제목을 클릭하면 상세가 열립니다';
  html+='</div>';
  wbdContext.openModal(html);
};

// Original index.html:15711
wbdContext.getFavorites = function getFavorites(){return wbdContext.LS.get('favorites',{pitcher:[],batter:[]});};

// Original index.html:15712
wbdContext.isFavorite = function isFavorite(name,type){return wbdContext.getFavorites()[type].includes(name);};

// Original index.html:15713
wbdContext.toggleFavorite = function toggleFavorite(name,type){
  const favs=wbdContext.getFavorites();
  const idx=favs[type].indexOf(name);
  if(idx>=0)favs[type].splice(idx,1);
  else favs[type].push(name);
  wbdContext.LS.set('favorites',favs);
  // UI 갱신
  const active=document.querySelector('.page.active');
  if(active){
    if(active.id==='page-cards')wbdContext.renderCards();
    else if(active.id==='page-home')wbdContext.renderHome();
    else if(active.id==='page-pitcher'&&String(wbdContext.currentPitcher)===String(name))wbdContext.renderPitcherHeader(name);
    else if(active.id==='page-batter'&&String(wbdContext.currentBatter)===String(name))wbdContext.renderBatterHeader(name, null);
  }
  // 별 버튼 자체 갱신
  document.querySelectorAll(`[data-fav-name="${CSS.escape(String(name))}"][data-fav-type="${type}"]`).forEach(btn=>{
    const fav=wbdContext.isFavorite(name,type);
    btn.textContent=fav?'⭐':'☆';
    btn.style.color=fav?'#ffd700':'var(--muted)';
  });
};

// Original index.html:15734
wbdContext.favoriteButton = function favoriteButton(name,type,size=16){
  const fav=wbdContext.isFavorite(name,type);
  return `<button onclick="event.stopPropagation();toggleFavorite('${String(name).replace(/'/g,"\\'")}','${type}')" data-fav-name="${String(name)}" data-fav-type="${type}" title="${fav?'즐겨찾기 해제':'즐겨찾기'}" style="background:transparent;border:none;color:${fav?'#ffd700':'var(--muted)'};font-size:${size}px;cursor:pointer;padding:2px 4px">${fav?'⭐':'☆'}</button>`;
};

// Original index.html:15740
wbdContext.getMemos = function getMemos(){return wbdContext.LS.get('memos',{});};

// Original index.html:15741
wbdContext.getMemo = function getMemo(key){return wbdContext.getMemos()[key]||'';};

// Original index.html:15742
wbdContext.saveMemo = function saveMemo(key,text){
  const m=wbdContext.getMemos();
  if(text&&text.trim())m[key]=text.trim();
  else delete m[key];
  wbdContext.LS.set('memos',m);
};

// Original index.html:15748
wbdContext.openMemoModal = function openMemoModal(key,title){
  const current=wbdContext.getMemo(key);
  const html=`<div style="margin-bottom:14px"><div style="font-size:18px;font-weight:700;margin-bottom:4px">📝 메모</div><div style="font-size:12px;color:var(--muted)">${title}</div></div>
    <textarea id="memo-input" placeholder="메모를 입력하세요... (예: 슬라이더 각도 요주의, 존 낮은 쪽 약함)" style="width:100%;min-height:120px;background:var(--card2);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:4px;font-size:13px;font-family:var(--cond);resize:vertical">${current.replace(/</g,'&lt;')}</textarea>
    <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
      <button class="btn-secondary" onclick="closeModal()">취소</button>
      <button class="btn-secondary" style="background:#ff4560;color:#fff;border-color:#ff4560" onclick="saveMemo('${key.replace(/'/g,"\\'")}','');closeModal()">삭제</button>
      <button class="btn-secondary" style="background:var(--amber);color:#111;border-color:var(--amber)" onclick="saveMemo('${key.replace(/'/g,"\\'")}',document.getElementById('memo-input').value);closeModal()">💾 저장</button>
    </div>`;
  wbdContext.openModal(html);
  setTimeout(()=>document.getElementById('memo-input').focus(),50);
};

// Original index.html:15762
wbdContext.getPresets = function getPresets(){return wbdContext.LS.get('presets',[]);};

// Original index.html:15763
wbdContext.savePreset = function savePreset(){
  const name=prompt('프리셋 이름을 입력하세요 (예: "2월 주전 선수"):');
  if(!name||!name.trim())return;
  const preset={
    name:name.trim(),
    activeGameIds:[...wbdContext.activeGameIds],
    teamAliases:{...(window.teamAliases||{})},
    theme:wbdContext.LS.get('theme','dark'),
    createdAt:new Date().toISOString()
  };
  const presets=wbdContext.getPresets();
  // 동명 프리셋 덮어쓰기
  const idx=presets.findIndex(p=>p.name===preset.name);
  if(idx>=0)presets[idx]=preset;
  else presets.push(preset);
  wbdContext.LS.set('presets',presets);
  alert('✅ 프리셋 "'+preset.name+'" 저장됨!');
  wbdContext.openPresetModal();
};

// Original index.html:15782
wbdContext.loadPreset = function loadPreset(name){
  const preset=wbdContext.getPresets().find(p=>p.name===name);
  if(!preset)return;
  wbdContext.activeGameIds=new Set(preset.activeGameIds.filter(id=>wbdContext.GAMES.some(g=>g.id===id)));
  window.teamAliases=preset.teamAliases||{};
  wbdContext._saveTeamAliases();
  if(preset.theme)wbdContext.applyTheme(preset.theme);
  wbdContext.rebuildG();
  wbdContext.updateNavInfo();
  wbdContext.renderGamesList();
  wbdContext.populateSelects();
  wbdContext.renderActiveContent();
  wbdContext.closeModal();
  alert('📂 프리셋 "'+preset.name+'" 불러옴');
};

// Original index.html:15797
wbdContext.deletePreset = function deletePreset(name){
  if(!confirm('프리셋 "'+name+'" 삭제?'))return;
  wbdContext.LS.set('presets',wbdContext.getPresets().filter(p=>p.name!==name));
  wbdContext.openPresetModal();
};

// Original index.html:15802
wbdContext.openPresetModal = function openPresetModal(){
  const presets=wbdContext.getPresets();
  let html='<div style="margin-bottom:14px"><div style="font-size:18px;font-weight:700;margin-bottom:4px">💾 프리셋 관리</div><div style="font-size:12px;color:var(--muted)">활성화된 경기, 팀 별명, 테마를 통째로 저장/불러올 수 있어요</div></div>';
  html+='<button class="btn-secondary" onclick="savePreset()" style="background:var(--amber);color:#111;border-color:var(--amber);margin-bottom:12px;font-size:12px;padding:8px 14px">➕ 현재 상태를 새 프리셋으로 저장</button>';
  if(presets.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;border:1px dashed var(--border);border-radius:6px">저장된 프리셋이 없어요</div>';
  } else {
    html+='<div style="display:grid;gap:8px">';
    presets.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).forEach(p=>{
      const dt=p.createdAt?new Date(p.createdAt).toLocaleString():'—';
      html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--card2);border:1px solid var(--border);border-radius:4px">
        <div>
          <div style="font-size:13px;font-weight:600">${p.name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${p.activeGameIds.length}경기 · ${Object.keys(p.teamAliases||{}).length}개 별명 · ${dt}</div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn-secondary" onclick="loadPreset('${p.name.replace(/'/g,"\\'")}')" style="font-size:11px;padding:5px 10px">📂 불러오기</button>
          <button class="btn-secondary" onclick="deletePreset('${p.name.replace(/'/g,"\\'")}')" style="font-size:11px;padding:5px 10px;color:#ff4560">✕</button>
        </div>
      </div>`;
    });
    html+='</div>';
  }
  wbdContext.openModal(html);
};

// Original index.html:15829
wbdContext.renderFavoritesSection = function renderFavoritesSection(){
  const el=document.getElementById('favorites-section');
  if(!el)return;
  const favs=wbdContext.getFavorites();
  const allFavs=[...favs.pitcher.map(n=>({name:n,type:'pitcher'})),...favs.batter.map(n=>({name:n,type:'batter'}))];
  if(allFavs.length===0){el.innerHTML='';return;}
  let html='<div class="card section" style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div class="card-title" style="margin:0">⭐ 즐겨찾기 선수</div><span style="font-size:11px;color:var(--muted)">${}</span></div>'.replace('${}',allFavs.length+'명');
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">';
  allFavs.forEach(f=>{
    const c=f.type==='pitcher'?wbdContext.calcPitcherCard(f.name):wbdContext.calcBatterCard(f.name);
    if(!c)return;
    const gotoFn=f.type==='pitcher'?'goToPitcher':'goToBatter';
    const typeIcon=f.type==='pitcher'?'⚾':'🏏';
    html+=`<div onclick="${gotoFn}('${String(f.name).replace(/'/g,"\\'")}')" style="background:var(--card2);border:1px solid var(--border);border-radius:4px;padding:8px 10px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:12px;font-weight:600">${typeIcon} ${f.name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${wbdContext._playerTeam(f.name,f.type)}</div>
        </div>
        <div style="font-family:var(--mono);font-size:18px;color:${wbdContext.cardOvrColor(c.OVR)};font-weight:700">${c.OVR}</div>
      </div>
    </div>`;
  });
  html+='</div></div>';
  el.innerHTML=html;
};

// Original index.html:15858
wbdContext.exportCardAsPNG = function exportCardAsPNG(name,type){
  const c=type==='pitcher'?wbdContext.calcPitcherCard(name):wbdContext.calcBatterCard(name);
  if(!c)return;
  const badges=wbdContext.computeBadges(c);
  const W=500,H=700;
  const ovrCol=wbdContext.cardOvrColor(c.OVR);
  const typeIcon=type==='pitcher'?'⚾':'🏏';
  const typeLabel=type==='pitcher'?'투수':'타자';
  const typeColor=type==='pitcher'?'#ff8c44':'#39ff8a';

  // 레이더 포인트
  const keys=Object.keys(c.stats);
  const N=keys.length, CX=W/2, CY=280, R=110;
  let radarPts=keys.map((k,i)=>{
    const v=c.stats[k];
    const norm=Math.min(1.18,(v-30)/(110-30));
    const a=i/N*Math.PI*2-Math.PI/2;
    return `${CX+Math.cos(a)*R*norm},${CY+Math.sin(a)*R*norm}`;
  }).join(' ');
  let gridPolys='';
  [0.33,0.66,1].forEach(t=>{
    const pts=keys.map((k,i)=>{
      const a=i/N*Math.PI*2-Math.PI/2;
      return `${CX+Math.cos(a)*R*t},${CY+Math.sin(a)*R*t}`;
    }).join(' ');
    gridPolys+=`<polygon points="${pts}" fill="none" stroke="#2a3a50" stroke-width="1"/>`;
  });
  let axisLabels=keys.map((k,i)=>{
    const a=i/N*Math.PI*2-Math.PI/2;
    const lx=CX+Math.cos(a)*(R+22), ly=CY+Math.sin(a)*(R+22);
    return `<text x="${lx}" y="${ly+4}" fill="#8896ad" font-size="11" text-anchor="middle" font-family="sans-serif">${k}</text>`;
  }).join('');
  let statBars='';
  keys.forEach((k,i)=>{
    const v=c.stats[k];
    const y=440+i*30;
    statBars+=`<text x="40" y="${y+14}" fill="#8896ad" font-size="11" font-family="sans-serif">${k}</text>`;
    statBars+=`<rect x="90" y="${y+4}" width="300" height="12" rx="6" fill="#1a2f4a"/>`;
    statBars+=`<rect x="90" y="${y+4}" width="${Math.min(100,v)/100*300}" height="12" rx="6" fill="${wbdContext.statColor(v)}"/>`;
    statBars+=`<text x="420" y="${y+14}" fill="${wbdContext.statColor(v)}" font-size="13" font-weight="700" text-anchor="end" font-family="monospace">${v}</text>`;
  });
  let badgeItems='';
  if(badges.length){
    const startX=W/2-Math.min(badges.length,5)*24/2;
    badges.slice(0,5).forEach((b,i)=>{
      const x=startX+i*50;
      badgeItems+=`<circle cx="${x+10}" cy="150" r="14" fill="${b.color}33" stroke="${b.color}" stroke-width="1.5"/>`;
      badgeItems+=`<text x="${x+10}" y="156" font-size="14" text-anchor="middle">${b.icon}</text>`;
    });
  }

  const svgContent=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#050c18"/>
    <rect x="10" y="10" width="${W-20}" height="${H-20}" rx="16" fill="#0d1825" stroke="${ovrCol}" stroke-width="2"/>
    <text x="${W/2}" y="50" fill="${typeColor}" font-size="12" font-weight="700" text-anchor="middle" font-family="sans-serif" letter-spacing="4">${typeIcon} ${typeLabel.toUpperCase()}</text>
    <text x="${W/2}" y="90" fill="#e8eff8" font-size="28" font-weight="900" text-anchor="middle" font-family="sans-serif">${String(name).replace(/&/g,'&amp;').replace(/</g,'&lt;').slice(0,24)}</text>
    <text x="${W/2}" y="128" fill="${ovrCol}" font-size="46" font-weight="900" text-anchor="middle" font-family="monospace">${c.OVR} OVR</text>
    ${badgeItems}
    ${gridPolys}
    ${axisLabels}
    <polygon points="${radarPts}" fill="${ovrCol}33" stroke="${ovrCol}" stroke-width="2"/>
    ${statBars}
    <text x="${W/2}" y="${H-30}" fill="#566480" font-size="10" text-anchor="middle" font-family="monospace">WBD Baseball Analyzer</text>
  </svg>`;

  // Canvas로 변환
  const svgBlob=new Blob([svgContent],{type:'image/svg+xml'});
  const url=URL.createObjectURL(svgBlob);
  const img=new Image();
  img.onload=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=W*2; canvas.height=H*2;
    const ctx=canvas.getContext('2d');
    ctx.scale(2,2);
    ctx.drawImage(img,0,0);
    URL.revokeObjectURL(url);
    canvas.toBlob(blob=>{
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=`${name}_${type}_card.png`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    },'image/png');
  };
  img.src=url;
};

// Original index.html:15960
wbdContext.classifyStyle = function classifyStyle(card){
  const s=card.stats;
  if(card.type==='pitcher'){
    // 투수 5가지 타입
    const types=[];
    const spd=s.구속, ctl=s.제구, brk=s.구변, k=s.탈삼진, vr=s.구종, stb=s.안정성;
    // 특이 조합 우선 탐지
    if(spd>=90 && k>=85){types.push({label:'🔥 파워 피처',desc:'강속구 + 높은 K율',color:'#ff4560'});}
    if(ctl>=90 && brk<80){types.push({label:'🎯 컨트롤 아티스트',desc:'정교한 제구 위주',color:'#39ff8a'});}
    if(brk>=90){types.push({label:'🌀 변화구 장인',desc:'변화구로 삼진',color:'#2196f3'});}
    if(vr>=90){types.push({label:'🎭 멀티피처',desc:'다양한 구종 구사',color:'#f5a623'});}
    if(stb>=90 && ctl>=80){types.push({label:'⚖️ 일관된 투수',desc:'안정감+제구 밸런스',color:'#cc44ff'});}
    if(types.length===0)types.push({label:'⚾ 올라운더',desc:'밸런스형 투수',color:'#8896ad'});
    return types;
  } else {
    const types=[];
    const pwr=s.파워, con=s.컨택, eye=s.선구, xbh=s.장타력, swt=s.스윗스팟;
    if(pwr>=90 && xbh>=90){types.push({label:'💪 슬러거',desc:'파워+장타력 최상',color:'#ff4560'});}
    if(con>=90 && pwr<80){types.push({label:'🎯 컨택 히터',desc:'정교한 타격',color:'#39ff8a'});}
    if(eye>=90){types.push({label:'👁️ 선구형 타자',desc:'존 구분 탁월',color:'#2196f3'});}
    if(swt>=90 && con>=80){types.push({label:'🎪 정타 머신',desc:'배트 중심 타격',color:'#cc44ff'});}
    if(pwr>=85 && con>=85 && xbh>=85){types.push({label:'⭐ 완성형 타자',desc:'파워+컨택+장타 조화',color:'#ffd700'});}
    if(types.length===0)types.push({label:'🏏 올라운더',desc:'밸런스형 타자',color:'#8896ad'});
    return types;
  }
};
}

export function initialize(wbdContext) {
// Original index.html:14965
wbdContext.LS = {
  get(key,def){try{const v=localStorage.getItem('wbd_'+key);return v?JSON.parse(v):def;}catch{return def;}},
  set(key,val){try{localStorage.setItem('wbd_'+key,JSON.stringify(val));}catch(e){console.warn('LS set failed',e);}}
};

// Original index.html:14971
wbdContext.THEMES = {
  dark:{name:'🌙 다크',vars:{}},  // 기본 (아무것도 설정 안함)
  light:{name:'☀️ 라이트',vars:{'--bg':'#f4f6fb','--card':'#ffffff','--card2':'#f0f3f8','--border':'#d4dae4','--text':'#1a2640','--muted':'#6b7d96','--amber':'#d97706','--green':'#16a34a','--red':'#dc2626','--blue':'#2563eb','--purple':'#9333ea'}},
  midnight:{name:'🌌 미드나잇',vars:{'--bg':'#030612','--card':'#0a1528','--card2':'#0f1e35','--border':'#1a2540','--text':'#e6ecf5','--muted':'#6b7a95','--amber':'#ffb84d'}},
  neon:{name:'💫 네온',vars:{'--bg':'#0d0220','--card':'#170836','--card2':'#221048','--border':'#3a1b6e','--text':'#f0e8ff','--muted':'#8777b5','--amber':'#ff44ff'}},
  sepia:{name:'📜 세피아',vars:{'--bg':'#1f1810','--card':'#2a2015','--card2':'#362a1c','--border':'#4a3826','--text':'#f0e0c8','--muted':'#9a8568','--amber':'#e0a050'}},
  forest:{name:'🌲 포레스트',vars:{'--bg':'#0a1410','--card':'#10201a','--card2':'#162d24','--border':'#264030','--text':'#e0f0e6','--muted':'#7a9080','--amber':'#88dd77'}}
};

// Original index.html:15036
wbdContext.CHANGELOG = [
  {
    version: 'V12.0',
    date: '2026-10',
    title: '📊 심화 분석 체계(Run Value·xOut) + 🗂️ 네비게이션 전면 재편',
    badge: '#39ff8a',
    changes: [
      {icon:'🩺', text:'⭐⭐⭐ <b>전체 코드 점검 — 버그 2건·정의 통일 119곳·죽은 코드 제거·메모이즈</b> — <b>버그①</b> 매치업 시뮬레이션 삼진율이 <b>헛스윙 삼진만</b> 세서 루킹 삼진(전체의 ~51%)을 누락 → K% 절반 과소평가. 공용 <code>_isK</code>로 교정(하이라이트 삼진 카테고리도 동일). <b>버그②</b> 타자 스프레이 차트에 <b>파울(result=3, ev>0)이 23% 섞여</b> 타구 방향 분포·점이 왜곡 → <code>_isInPlay</code>로 교정. <b>정의 통일</b>: 안타 인라인 변형(<code>1BSafe||HR</code>, 낫아웃·야수선택 포함) 25곳 추가 발견·교체 — <b>WAR용 리그 평균 타율 기준선</b>까지 부풀려져 있었음. 타수(<code>_isABPitch</code>) 32곳·삼진(<code>_isK</code>) 11곳·하드히트(<code>_isHardHit</code>) 30곳·배럴(<code>_isBarrel</code>) 21곳의 인라인 중복을 공용 함수로 — 이제 정의를 한 곳만 고치면 전 화면 반영. <b>죽은 함수 24개(~300줄) 제거</b>. <b>메모이즈</b>: 스카우팅 수집·리포트·공략 엔진·도시에를 활성 경기 키로 캐시 — 팀 공략 목록 재렌더 626ms→2ms, 선수 평가 세부지표 탭 1.8s→0.4s. 전 26페이지 런타임 순회 에러 0, NaN/undefined 누수 0 확인.'},
      {icon:'🃏', text:'⭐⭐⭐ <b>선수 카드 능력치 재보정 — 등급 체계 통일 + 산정식 3곳 교정</b> (사용자 승인) — 목표: 100+ 몬스터급 / 90+ S / 85~89 A / 80~84 B / 70대 C / 70 미만. 전 능력치 리그 중앙값 80으로 통일하고 상한만 성격별(핵심 결과형 파워·컨택·구위·탈삼진 p90≈95 최대~110, 일반 p90≈93, 보조 p90≈91). 이전엔 파워 중앙 96·100+ 35명인데 컨택은 최대 101(1명)처럼 능력치마다 스케일이 달랐음. <b>산정식 교정</b>: ① <b>선구</b> — BB%가 타석당이 아닌 투구당으로 들어가 체이스의 1/6 기여였던 걸 타석당(상한 12%)으로. ② <b>파워</b> — ISO 가중 30→120 (기여 편차 3.7 vs HR 18.6이라 2·3루타가 사실상 무시되던 것 교정, 장타율 연동 .86→.89). ③ <b>구위</b> — 피안타·피EV·배럴·배럴+·존내헛스윙·체이스 7항목 중복을 피안타율·피홈런·<b>K/타석</b>(결과) + <b>기대 헛스윙</b>(Stuff+ 방식)·피EV(과정)로 재설계: ERA 연동 −.65→<b>−.80</b>, 피OPS −.73→<b>−.92</b>, 바닥(30) 6명→0. ④ <b>탈삼진</b> — 투구당 K → K/타석 + 기대헛스윙 보너스: 반기 반복성 .15→.42, ERA 연동 −.44→−.57. 나머지(갭파워·컨택·구변·구속·제구·안정성·구종)는 구성 유지, 앵커만 재보정. <b>2·3차 조정(사용자 피드백)</b>: 최저치 보장 완화(p10 →55~60, 못하면 더 낮게), 상단 확장 후 전체 살짝 하향(최종 중앙 타자 76~77·투수 79, 핵심 p90 ~95, 최대 ~110). <b>OVR 산정 배율 변경</b> — 타자 파워 1.3·컨택 1.2·갭파워 .8·선구 .7·스윗스팟 .4, 투수 구위 1.4·탈삼진 1.0·제구 .9·구속 .8·구변 .8·안정성·구종 .4 (피크 보너스는 검토 후 제외). OVR↔OPS .90→.92, OVR↔ERA −.75→−.78. <b>결과 분포</b>(타자 83·투수 47): 타자 OVR p10 63·중앙 75·p90 88·최대 104 (ゆっち一 104, Slaris 99, 쟈가리코 98, Kr_Luna 95) / 투수 OVR p10 65·중앙 80·p90 89·최대 91 (Ainy4·Penguin 91, 인생최패망자 90). 검토했지만 유지한 것: 컨택(타율 60%+컨택 과정 — 타격왕이면 헛스윙 많아도 높게 나오는 밸런스 의도대로), 제구(크게 빠지는 공 감점은 유인구를 실수로 잡아 보류).'},
      {icon:'🧬', text:'⭐⭐⭐ <b>선수 유형 프로파일 엔진 — "장타 많으면 장타형" 수준에서 선수를 설명하는 서술로</b> — 기존 8종 고정 유형(파워/컨택/선구/적극 조합)을 폐기하고, <b>스윙 결정·컨택·타구·상황 축을 각각 리그 백분위로 재서 조합</b>. 타자 1차 유형: 🧘관망형(스윙 자체가 적음, 루킹 삼진 비중) / 🌀배드볼 히터(존 밖·먼 볼 체이스, 볼을 맞히는지 여부로 범타형·삼진형 구분) / 👁️선구·선택형(안타가 몇 칸에 몰리는지로 "치기 좋은 코스만" 판별) / 🔮직구 노림수형·변화구 선호형(존 안 직구 vs 변화구 스윙률 격차) / ⚡초구 공격형(초구 타율이 전체보다 좋은지로 초구 존 금물 여부) / 💥당겨치는·플라이볼 슬러거 / 🎯똑딱이 컨택형 / 🎲올오어낫싱 / ⚖️균형형. 2차 특성 태그 20여 종(타구 유형·방향·컨택·삼진·볼넷·카운트 의존·2S 체이스 급증·2S 커트형·직구/변화구 편차·빠른/느린 직구 약함·플래툰·기복·배트 스피드). 서술 4문단(어프로치 / 컨택·삼진·볼넷 / 타구·파워 / 상황·구종·코스) 전부 실측 수치+리그 순위 병기, 마지막에 <b>투수 입장 한줄 결론</b>. 투수도 동일 구조: 🔥파워 피처 / 🎣유인형(존 밖 승부, 크게 빠지는 공 비율로 의도성 판별) / 🎯존 공략형 / 🎲다구종 믹스형 / 🚀강속구형(빠르지만 밋밋) / ⚾직구 위주 / 🪄변화구 중심 / 🔁투피치형 / ⚖️밸런스형 + 레퍼토리·시퀀싱 / 제구·구위(기대 vs 실제 헛스윙) / 상황·스태미너 + 타자 입장 결론. 리그 전체 분포: 타자 9유형·투수 7유형으로 실제 분산됨. "볼넷의 3배 삼진=프리스윙어" 같은 이 리그에 안 맞는 판정(볼넷 자체가 희귀) 제거.'},
      {icon:'📐', text:'⭐⭐ <b>타자 타격·파워·삼진회피, 투수 제구 툴 재검증 교체</b> — 후보 산정식을 z-합성으로 홀/짝 경기 비교. <b>타격</b>=EV .3+하드히트 .25+존 컨택 .2+수축타율 .25: 반복성 .60→.66, 다음 반기 타율 예측 .43→<b>.54</b>(타율 단독은 .20). <b>파워</b>=EV .3+하드히트 .25+EV 상위10% .2+최고EV .15+배럴 .1: .68→.74, 다음 반기 OPS 예측 .54→.60(ISO는 반복성 .34라 제외). <b>삼진 회피</b>=K% .4+컨택 .3+존 컨택 .3: .49→.57, K% 예측 .49→.55. <b>제구</b>=존 투구율 .5+크게 빠진 공 적음 .3+스트라이크율 .2: .45→.52(초구 스트라이크 반복성 .14라 제외). 선구안(체이스+먼 볼 체이스 .72 vs .70)·컨택·커맨드는 후보가 더 낫지 않아 유지. 툴 등급 반복성: 타자 타격 .62 파워 .68 컨택 .50 선구 .60 삼진회피 .57 스윙 .78 OFP .69 / 투수 구속 .91 무브 .84 구위 .74 억제 .69 제구 .52 커맨드 .31 OFP .80.'},
      {icon:'🧪', text:'⭐⭐⭐ <b>투수 구위·피안타 억제 툴을 "예측 검증된" 정의로 교체</b> — 홀/짝 경기 분할로 재검증하니 투수 결과 지표는 거의 전부 반복성이 없었음(헛스윙률 .18, CSW .01, K% .15, 피안타율 .23, 피EV −.26). → <b>구위 = Stuff+ 방식</b>: 구종별로 [구속 3분위 × 무브 3분위] 칸의 리그 헛스윙률을 매겨 "그 공이면 평균적으로 얼마나 헛스윙이 나오나"(기대 헛스윙)를 계산. 반복성 <b>.75</b>, 다음 반기 실제 헛스윙 예측 r .43(실제 헛스윙으로 예측하면 .18), K% .41, 피OPS −.40. 실제 헛스윙을 섞으면 예측력이 떨어져(.34) 등급은 기대치만, 실제는 근거에 병기. <b>피안타 억제 = 기대 허용 경향</b>(z존투구율 − z기대헛스윙) 75% + 실제 피장타·피안타(수축) 25%: 다음 반기 피안타율 예측 r <b>.54</b>(실제 피안타율로 예측하면 .23). 이 리그는 "존에 많이 넣고 구위 약할수록 맞는" 구조가 수치로 확인됨. 툴 등급 반복성: 구위 .26→<b>.74</b>, 억제 .22→<b>.69</b>, OFP .60→<b>.78</b>. 목표지점(targetX/Y) 기반 커맨드는 의미 불명확한 필드라 사용자 요청으로 제외.'},
      {icon:'🎮', text:'⭐⭐ <b>매치업 시뮬 모델 교체 — 좌우 분할 + 카운트별 + 구종별 예상</b> — 기존엔 투수 K를 "투구당", 타자 K를 "헛스윙률"로 계산해 리그 K/PA(.22)와 섞던 척도 불일치와 근거 없는 선수카드 OVR 보정이 있었음. → 전부 타석 단위(타율=H/AB, K·BB=/PA, HR=/AB)로 통일, 리그 기준선은 하드코딩(.382) 대신 활성 경기에서 계산, 전체 성적을 리그로 수축한 뒤 <b>좌우 분할(타자 vs 투수 손, 투수 vs 타자 손)</b>을 표본만큼 가중, <b>Log5</b>(빌 제임스)로 결합. 새 카드: ↔️ 좌우 매치업(분할 성적·가중 근거), 🔢 카운트별 예상 타율(초구/유리/동일/불리/2S — 투수 유리·타자 유리 상황 표시), 🎿 구종별 예상(투수 레퍼토리 × 타자 구종 대응 → 투수 추천 구종 / 타자가 노릴 구종). 실전 맞대결 로그의 결과 표기도 None/GroundBall 대신 1B·2B·HR·Strike(K)로.'},
      {icon:'🔢', text:'⭐⭐ <b>상대 공략 카운트표 5상태로 확장</b> — 유리/동일/불리 3줄 → 초구·유리·동일·불리·2S + 투구수·타수·장타·스윙%·헛%·<b>체이스%</b>·표본 신뢰도 배지·본인 대비 메모("2S 체이스 +20p → 몰리면 유인구", "초구 적극 → 초구 볼로 유인"). 공략 엔진과 같은 집계 함수 사용.'},
      {icon:'🖼️', text:'⭐⭐ <b>공략·평가 리포트 이미지 내보내기</b> — 상대 공략·팀 공략·선수 평가 상단에 <b>🖼️ 이미지 / 📋 복사</b> 버튼. 리포트 영역을 PNG로 저장하거나 클립보드에 복사(디스코드 Ctrl+V). 버튼·선택박스는 캡처에서 제외, 긴 페이지는 자동 배율 조정, 하단에 생성일 스탬프. 라이브러리(html2canvas)는 버튼 누를 때만 로드.'},
      {icon:'🧭', text:'⭐ <b>타석 플랜·승부 시퀀스 문구 정밀화</b> — 투수·타자 10명씩 실제 수치와 대조해 수정: (타자 입장) 초구 구종이 45% 미만이면 "노려라"가 아니라 "구종 분산 — 존 안 공만"으로, 초구 스트라이크율 52% 미만이면 "지켜보고 카운트 선점", 볼 앞설 때 50~70%면 "우선 노림", 70%+면 "뻔함". (투수 입장) 공략법을 판정 근거에 맞춤 — 헛스윙이 근거면 "2S 결정구", 약한 타구가 근거면 "초반 카운트 잡기·범타 유도용, 결정구는 다른 공", 둘 다면 "전천후". 2S 결정구에 헛스윙% 근거 표기. 투수 분석 "주로 던지는 코스"도 우타 기준 절대 좌/우 → 타자 손잡이 기준.'},
      {icon:'🔗', text:'⭐ 리그 순위표 각 팀에 <b>🎯 공략</b> 버튼(팀 공략 리포트 바로가기). 기대성적·운 페이지에 검증 기반 해석 주의 문구(인플레이 타율·x타율 모두 반기→반기 상관 .1대라 "운"은 설명용이지 예측용이 아님). 내보내기 keyFields에 파생 필드(_paEnd·_hitBase·_isFC·_xOut) 설명 추가. 좌우(몸쪽/바깥) 판정 데이터 검증: 사구 위치 우타 105/105 zoneX>0, 좌타 78/78 zoneX<0 — 현 계산 정확.'},
      {icon:'🐛', text:'⭐⭐⭐ <b>카운트별·구종별·코스별 타율이 낮게 나오던 버그 — 타석 종료 판정 전면 교체</b> — 사용자 지적: "타율 .345인데 카운트별은 .15, 구종별도 .2 초반". 원인: 상황별 집계가 <b>걸러낸 부분집합</b>(유리 카운트 투구만, 포심만…)을 받아 "다음 투구가 다른 타자면 타석 종료"로 판정 → 한 타석 안의 마지막 유리 카운트 투구가 전부 타석 종료로 잡혀 <b>타수가 2~3배 부풀고</b>(ByeolBam 초구 181타수 vs 실제 54) 안타는 그대로라 타율이 바닥으로. <b>수정</b>: 경기 로드 시 경기 단위(시간순·모든 타자)에서 타석 종료를 1회 판정해 투구에 플래그(_paEnd)로 박고, 모든 집계(_isPaEnd·_isABPitch·_h2hSlash·_countPaEnd + 인라인 8곳)가 그 플래그를 쓰도록 통일. 검증: 카운트별 타수 합 = 구종별 타수 합 = 전체 타수(169=169=169), 각 칸 타율이 엔진 집계와 일치. <b>부수 효과</b>(전체 타율도 소폭 변동): ① 같은 타자가 한 이닝에 두 번 나온 타석(타순 일순)이 합쳐지던 문제 해결(리그 213타석) ② 땅볼/뜬공으로 기록됐지만 카운트가 이어진 <b>오기록 파울 152개</b>가 인플레이·타수에서 제외(평균 EV도 정확해짐) ③ 주자 아웃 등으로 끝난 미완 타석(~90)은 타수에서 제외. 안타 정의도 남아있던 _isHitPlay 직접 사용 17곳을 _isHit(낫아웃 출루 제외)로 통일.'},
      {icon:'🔬', text:'⭐⭐⭐ <b>툴 등급 검증 기반 재설계 + 몸쪽/바깥 손잡이 버그 수정 + 좌/우 분할 공략</b> — <b>검증</b>: 리그 전 선수의 경기를 홀/짝으로 갈라 각 지표의 반복성(split-half r)을 측정. 타율 .21·ISO .24·볼넷 .23·변화구대응 .14·<b>득점권 −.16</b>, 투수 볼넷 <b>.03</b>·피하드히트 −.14 → 단독 등급 부적합. 반면 배트스피드 .79·체이스 .70·EV .69·컨택률 .68·구속 .91·구종별 무브 .84는 안정. → <b>타격</b>=수축 타율+컨택+EV 블렌드(등급 반복성 .21→<b>.59</b>), <b>파워</b>=EV·배럴·하드히트·ISO(.24→<b>.65</b>), 선구안=체이스 85%, <b>삼진 회피</b> 신설, 득점권·변화구대응·2S대응 툴 제거(상황별 표에만). 투수: <b>제구</b>=존 투구율+초구 스트라이크(볼넷 제외 — 노이즈), <b>구위</b>=헛스윙+K%(피하드히트 제외), 커맨드=실투 60·구석 40, 득점권 제거. 비율지표에 <b>표본 수축</b> 적용. 각 툴에 <b>반복성 배지(안정/보통/변동 큼 + r값)</b> 표시해 어느 등급을 믿을지 보이게. 발견: 이 리그는 <b>존 투구율↑ = 피안타↑(r +.46)</b>, 헛스윙률이 피안타와 가장 강한 역상관(−.49). <br><b>버그</b>: 공략 엔진·코스표의 몸쪽/바깥이 zoneX 부호로만 판정돼 <b>우타자가 뒤집혀</b> 있었음(좌타는 우연히 일치). 투구별 타자 손잡이(bZone) 기준으로 교정 — 투수 분석은 타석마다 타자가 바뀌므로 투구 단위 판정. <br><b>좌/우 분할 공략</b> 신설: 타자는 vs 좌투/우투, 투수는 vs 좌타/우타별로 노림 구종·공략 포인트·구종 믹스가 따로(접근·구종이 달라지므로). 편차 크면 경고.'},
      {icon:'📏', text:'⭐⭐ <b>선수 평가 툴 산정 방식 재정의 (애매한 정의 정리)</b> — 도시에 툴을 늘리며 느슨해진 정의 교정. <b>무브먼트</b>: 총 무브(|sH|+|sV|) 평균은 구종 믹스에 따라 달라지는 값이라 질 평가가 아님 → 기존 리포트의 <b>구종별 리그 대비 백분위·구사량 가중</b> 등급을 재사용(구속·구위도 동일하게 기존 등급 사용, 중복 산정 제거). <b>커맨드 vs 제구</b>를 스카우팅 용어대로 분리: <b>커맨드</b>=원하는 코스에 넣는 정확도(존 안 <b>구석 비율</b> + <b>실투(가운데 몰림) 회피</b>) / <b>제구</b>=스트라이크 던지는 능력(<b>볼넷율 + 초구 스트라이크율</b>). 이전엔 커맨드=존 투구율이었는데 존에 많이 넣는 건 오히려 맞기 쉬운 것이라 부적절. <b>구종 다양성</b>은 툴이 아니라 성향이라 제외(시퀀싱의 예측도로 대체), 대신 <b>탈삼진(K%)</b> 추가. 피안타 억제=피안타율+피장타율 블렌드. 타자: "컨택(Hit)"→<b>타격(Hit)</b>(컨택률과 혼동 방지), 파워=ISO 단독→<b>ISO·EV·배럴 블렌드</b>(소표본 안정), 선구안=체이스+볼넷 블렌드, "클러치"→<b>득점권(RISP)</b>(과장 표현 제거).'},
      {icon:'🧽', text:'⭐ <b>상대 공략 페이지 중복 정리</b> — 구 생성기의 강점/약점/핵심전략·좌우카운트 split 카드가 새 공략 엔진 카드와 같은 주제를 다른 근거로 두 번 말하던 것 제거(개요·타격패턴은 유지). 선수 평가 "5툴 레이더" → 8툴이라 "툴 레이더"로.'},
      {icon:'🎯', text:'⭐⭐⭐ <b>「팀 공략 리포트」 신규 — 스카우팅 허브 정식 탭</b> — 상대 <b>팀을 통째로</b> 스카우팅. <b>투수용</b>(그 팀 타자들 어떻게 잡나)·<b>타자용</b>(그 팀 투수들 어떻게 치나)·<b>수비용</b>(타자별 외야 시프트 추천) 3모드. 상단 <b>선수별 한 줄 공략표</b>(특징·약점 핵심·공략법) → 이름 클릭 시 개별 고밀도 상세(아래 공략 엔진 + 종합지표·5×5존·코스·스프레이·시프트·카운트·상황별·상대전적·구종대응). 팀 배정은 「팀 구성 편집」 수동 지정과 연동 — 독립팀리그 등 로스터를 직접 묶어 대비 가능. 드롭다운은 <b>활성 경기 기준 팀만</b>(팀 분석·전역 검색도 동일 기준으로 통일). <code>#scoutlab</code> 딥링크.'},
      {icon:'⚔️', text:'⭐⭐⭐ <b>공략 엔진 v3 — "약점 띡" 수준에서 실전 브리핑으로</b> — 상대 공략·팀 공략·선수 평가 세 곳이 <b>같은 엔진</b> 사용. <b>세밀 격자</b>: 존 안 9칸(몸/중/바×상/중/하) + 존 밖 볼영역 + 구종×위치 교차 + 구종별 + 직구 구속대 — "같은 몸쪽이라도 높은 공엔 약하고 낮은 공엔 강함", "스트존 몸쪽은 치는데 빠지는 몸쪽 볼엔 약함"이 구분됨. <b>공략가능성 3단 검증</b>: 약함(본인 평균 대비) + 거기 <b>스윙함</b> + 헛스윙/범타 유도 → 셋 다 되면 ✅강력 공략, 약한데 손 안 대면 ⚪거르는 공(참고)으로 분리 — 안 휘두르는 곳은 공략 포인트가 아니므로. 각 항목에 <b>근거 수치 + 공략법 + 신뢰도</b>(표본 적으면 "낮음·표본N"으로 보여주되 순위만 뒤로). <b>상황 축</b>: 카운트별(2S 되면 체이스 급증·유리 카운트 타율), 초구 패턴(스윙률+초구 타율), 2S 접근(삼진율·결정구 구종/위치), 좌/우투, 득점권(거르기 판단), 당김/밀어(시프트), 선구안은 리그 백분위. <b>🧭 승부 시퀀스</b> 카드(초구→볼 앞설 때→2S 결정구→주자시). <b>투수 공략</b>(타자 입장): 카운트별 구종 선택 패턴·예측도("몰리면 포심 85%"), 2S 결정구 구종+위치, 초구 구종·스트라이크율, 구종×코스 피안타, 좌/우타, 주자 있을 때 흔들림, 직구 구속 → 타석 플랜. 판정 기준은 리그가 아닌 <b>본인 전체 대비</b>(공략은 그 선수의 상대적 빈틈이므로).'},
      {icon:'📝', text:'⭐⭐⭐ <b>선수 평가 — 실제 스카우팅 리포트 수준의 상세 도시에</b> — 타자 툴이 3개(컨택·파워·선구안)뿐이던 걸 <b>8개</b>(컨택·파워·컨택률·선구안·변화구 대응·2S 대응·클러치·스윙 스피드)로, 투수는 <b>8개</b>(구속·무브·구위·커맨드·제구·피안타 억제·주자 상황·구종 다양성)로 확장. 전부 <b>리그 백분위→20-80 + 근거 코멘트 + OFP(종합)</b>. 본문: 타자=<b>어프로치</b>(존 안/밖 스윙·초구·2S·카운트별·BB/K 성향 서사)·<b>타구 프로파일</b>(땅볼/라인/뜬공·당김/중앙/반대·EV/발사각/하드히트/배럴/HR-FB)·<b>상황별 표</b>·<b>리스크·기복</b>(경기별 타율 표준편차·xBA 운·플래툰 편차·표본). 투수=<b>레퍼토리 표</b>(구종별 비중·구속 평/최·무브·존%·헛%·피안타·피장타·초구/2S 사용률)·<b>커맨드&컨트롤</b>·<b>시퀀싱</b>(카운트별 구종 상위3 + 예측도)·<b>스태미너</b>(투구수 25구 단위·이닝 구간별 구속/피안타/헛/BB 변화)·상황별·리스크(주자 흔들림·패턴 예측·플래툰). 하단에 상대 입장 공략 요약(엔진)까지 — 평가와 공략이 한 장에.'},
      {icon:'🔧', text:'⭐⭐ <b>코스별 타율 버그 수정</b> — 코스별 표가 존 밖 볼까지 포함하고 가로(몸/중/바)·세로(상/중/하)를 중복 집계해, 전체 .345인 타자가 코스별론 전부 .2x로 보이던 오류. → <b>존 안 9칸만</b>, 겹침 없이, <b>본인 전체 대비 ±</b>로 표시. 존 밖은 "볼영역" 표로 분리(스윙률 낮으면 거르는 공). 내보내기도 동일 정의(schema 19).'},
      {icon:'🧹', text:'⭐⭐⭐ <b>안타 정의 전면 통일 (타율 ~3% 과대 버그 일괄 수정)</b> — 선수평가는 이미 <code>_isHit</code>(낫아웃·야수선택 제외)로 고쳤지만, <b>선수카드·팀통계·랭킹·매치업·WAR 입력 등 앱 전체 34곳</b>이 아직 인라인 <code>1BSafe===1||홈런</code>(낫아웃·야수선택 포함)을 써서 타율/피안타율이 <b>기록실보다 리그 기준 ~3%p 부풀려져</b> 있었음(안타 1,512개 중 45개가 낫아웃·야수선택, 투수 75명 중 17명 영향). → 전부 <code>_isHit</code>로 교체해 <b>앱 어디서나 타율이 기록실과 100% 일치</b>. <br><span style="color:var(--muted);font-size:11px">※ 정리: 선수평가 투수/타자 9존 집계가 거의 같은 코드로 중복돼 있던 걸 공용 <code>_scoutZoneStats</code>로 합치고(투수 존 피안타율도 같은 버그라 함께 교정).</span>'},
      {icon:'🗺️', text:'⭐⭐⭐ <b>선수평가 존 히트맵을 타자분석의 5×5 맵으로 교체</b> — 선수평가는 빈약한 <b>3×3</b> 히트맵(렌더러도 2개 제각각)을 쓰고 있었는데, 타자분석엔 훨씬 좋은 <b>5×5 핫/콜드 존 맵</b>(스트라이크존 바깥 1칸 포함, 지표 선택, 핫↔콜드 팔레트, 표본수 표시)이 이미 있었음. → <b>그 5×5를 그대로 가져옴</b>. 집계·렌더를 공용 함수(<code>_zone5x5Cells</code>/<code>_zone5x5SVG</code>)로 뽑아 <b>타자분석과 선수평가가 같은 코드를 공유</b>(중복 제거). 선수평가 「세부 지표」·「존·구종」 두 탭 모두 5×5로, <b>타율/장타율/OPS/헛스윙%/EV/하드히트%/배럴%/발사각</b> 지표 전환 가능. 화면에 꽉 차 안 보이던 문제도 반응형(컨테이너 맞춤)으로 해결. <b>투수 존 탭도 5×5 피안타율 히트맵</b>이 뜸(기존 공백).'},
      {icon:'📈', text:'⭐⭐ <b>라운드별 추이 — 세부지표 확대 + 투수 이닝 정식집계 사용</b> — 「비교·추이」 탭의 라운드 표가 <b>타율/피안타율만</b> 보여 빈약했음. 이제 <b>타자=타율·출루율·장타율·OPS·홈런·삼진%·평균EV</b>, <b>투수=이닝·ERA·WHIP·피안타율·K/9·피홈런·피평균EV</b>로 확장. 투수 이닝·ERA·WHIP는 <b>새 추정식을 만들지 않고</b> 앱의 정식 집계 함수(<code>_getCachedPitcherStats</code>, 아웃카운트 추적 = <code>_getPitcherSeason</code>과 동일 파이프라인)를 라운드별로 합산 → 기록실·시즌 성적과 <b>완전 일치</b>. 각 지표에 ▲/▼좋음 방향 표시.'},
      {icon:'🩹', text:'⭐⭐ <b>투수 「시즌 내 추이」 방향 반대 버그 수정</b> — 종합평가 서술에서 투수의 <b>피안타율이 올라갔는데 "후반 상승 — 성장형"</b>(초록)으로 좋게 표시되던 오류. 투수는 피안타율 상승=나쁨이므로 방향을 반대로(타자/투수 구분), 라벨도 "피안타율 1R→2R (후반 피안타 증가/감소)"로 명확히.'},
      {icon:'🔧', text:'⭐⭐⭐ <b>선수평가 타율 불일치 수정</b> — 선수평가의 <b>스플릿 표·존 히트맵 타율</b>이 안타를 <code>1BSafe</code> 원본으로 세서 <b>낫아웃 출루·야수선택까지 안타로 집계</b>, 타율이 부풀려졌음(예: 실제 .395인데 스플릿 합산 .455). → 기록실과 <b>동일한 정의(_isHit·_isABPitch)로 통일</b>, 이제 거의 일치(잔차는 좌우 스플릿이 투수 손잡이 결측 투구를 제외하는 데서 오는 미세차). <b>xOut "인플레이타율"</b>은 일반 타율과 다른 BABIP 지표임을 라벨로 명시. <b>라운드 추이</b> 각 지표에 ▲/▼좋음 방향 표시 추가.'},
      {icon:'🎯', text:'⭐⭐ <b>타구 유형을 실제 발사각으로 판정 (땅볼 오분류 수정)</b> — 게임의 result 코드는 <b>땅에 닿기만 하면 \"GroundBall\"</b>이라, 펜스 직격 라인드라이브 2루타도 땅볼로 잡혔음. 실측: result=땅볼 1,041개 중 <b>351개(34%)가 실제론 라인/뜬공</b>. → 발사각(ldeg) 기준 공용 판정 <code>_battedType</code>(땅볼&lt;10°·라인10~24°·뜬공25°+) 신규. 로그 결과 뱃지·경기 플래너 아웃 표기에 적용(예: \"2루타(라인)\"). 타구질 비율·히스토그램은 원래 발사각 기준이라 그대로.'},
      {icon:'✅', text:'⭐⭐ <b>로그 「결과」 컬럼 — 최종 결과 한눈에</b> — 기존엔 "땅볼/뜬공/파울"만 떠서 <b>그게 안타인지 아웃인지 모달을 열어야</b> 알 수 있었음. 이제 <b>안타(땅볼)·2루타(라인)·아웃(뜬공)·삼진(헛/루킹)·볼넷·사구·홈런</b>처럼 최종 결과 + 타구종류를 색으로 구분해 바로 표시(안타=초록). 타자·투수 로그 공통.'},
      {icon:'🔎', text:'⭐ <b>투구 상세 모달에 Run Value·리그 평균 비교 추가</b> — 현재 상황의 <b>득점 기대값(RE)</b>과, 같은 <b>카운트·구종의 리그 평균</b>(헛스윙률·피안타율·평균EV)을 함께 표시해 "이 상황이 어떤 상황인지" 맥락 제공.'},
      {icon:'🎯', text:'⭐⭐ <b>투구 상세 모달에 xOut(기대 아웃확률) 추가</b> — 타구 로그에서 투구를 클릭하면 뜨는 상세 창에, 그 타구의 <b>리그 기대 아웃확률 막대 + 판정</b>(🍀 행운의 안타 / 💀 불운한 아웃 / 타구질상 적정 / 홈런)을 표시. 배럴·하드히트 태그도 함께. 로그 컬럼뿐 아니라 상세 창에서도 "이 타구가 운이었나"를 바로 확인.'},
      {icon:'🧬', text:'⭐⭐⭐ <b>플레이 스타일 자동 분류 + 자연어 프로파일</b> — 선수평가 종합 탭 최상단에 신설. <b>실측 데이터 기반</b>(능력치가 아니라 체이스%·초구스윙·ISO·배럴·삼진율 / 투수는 실제 직구 구속·구종 믹스 엔트로피·변화구 헛스윙 유도·볼넷·초구스트라이크)으로 리그 백분위를 내어 유형 판정. 예: "💥 적극적 슬러거", "🎯 선구안 좋은 거포", "🔥 구속 앞세운 파워 피처(제구 불안)", "🎛️ 제구·변화구 기교파". 태그 + 실측 수치를 인용한 서술 문장 자동 생성. (타고 리그라 절대값은 변별 안 돼 전부 리그 상대 비교)'},
      {icon:'📋', text:'⭐⭐⭐ <b>선수 평가 리포트 2차 대폭 강화 — 내용·분석 밀도 확대</b> — 탭을 <b>5개(종합·세부 지표·🗺️존·구종·강약점·비교/추이)</b>로 확장. <b>종합</b>: 5툴 레이더 차트 + <b>서술형 심층 인사이트</b>(RV 득점기여·xOut 운·라운드별 성장/하락·좌우 편차를 문장으로 자동 생성). <b>세부 지표</b>: 백분위 바 + <b>상황별 스플릿 표</b>(vs좌/우·유리/불리 카운트별 타율·HR·헛%·EV). <b>존·구종(신규)</b>: <b>9존 타율 히트맵</b> + 구종그룹별 대응 표. <b>비교/추이</b>: 라운드 추이 + <b>상대전적 하이라이트</b>(강한/약한 상대 top5). 실제 스카우팅 리포트 수준의 정보량으로.'},
      {icon:'📋', text:'⭐⭐ <b>(1차) 선수 평가 탭 분할 + 백분위 바 도입</b> — 한 페이지에 다 쏟아내던 걸 <b>4개 탭(종합·세부 지표·강약점·비교/추이)</b>으로 재구성. <b>「세부 지표」 탭에 스탯티즈식 백분위 바</b> 신설 — 타율/OPS/wRC+/EV/배럴% 등 11개(타자)·ERA/FIP/WHIP/K9 등(투수)를 <b>리그 대비 상위 몇 %인지 색상 막대</b>로. 여기에 <b>xOut 운 분석</b>(실제 vs 기대)과 <b>Run Value</b>도 함께 표시. 종합 탭은 핵심(등급·요약·추천)만 남겨 간결하게.'},
      {icon:'🔄', text:'⭐⭐ <b>라운드 자동 판별 + 시즌별 라운드 필터</b> — 풀리그 구조(각 팀과 N번씩 맞붙음)를 <b>업로드 방식 변경 없이 자동 감지</b>. <b>리그전에만 부여</b>(스크림·이벤트 제외), <b>시즌별로 분리</b>해 "26 Summer 1R/2R", "FW Season 1R/2R/3R"처럼 시즌을 명시한 버튼 제공. 라운드 선택 시 그 시즌 해당 라운드만 활성화(다른 시즌·스크림은 안 켜짐). 파일명 포맷 2종(짧은 팀명 / 긴 팀명+해시) 모두 파싱. <b>선수평가 「비교·추이」 탭</b>에 라운드별 타율·홈런·삼진%·EV 변화 표. <br><span style="color:var(--muted);font-size:11px">※ 초기 버그 수정: 라운드 선택 시 스크림·이벤트가 같이 켜지던 문제, FW 시즌 파일명(league_ 접두사·긴 팀명) 미인식 문제 해결.</span>'},
      {icon:'📊', text:'⭐⭐ <b>백분위 바를 투수·타자 개인 분석에도</b> — 선수평가 전용이던 스탯티즈식 백분위 바를 <b>투수/타자 분석 C탭</b>에도 추가. 선수 보던 흐름에서 바로 "리그 대비 상위 몇 %"를 RV·xOut 카드와 함께 확인. 선수평가와 동일 계산(공용 함수).'},
      {icon:'📤', text:'⭐⭐ <b>분석 데이터 내보내기에 Run Value·xOut 추가</b> — export 번들에 <code>runValue</code>(RE24 매트릭스 + 선수별 RV)와 <code>xOut</code>(선수별 실제 vs 기대 성적·운) 섹션 신규. schemaVersion 18, appVersion 표기도 V12.0으로 정정.'},
      {icon:'🗂️', text:'⭐⭐⭐ <b>메뉴 구조 전면 재편</b> — 기능이 \"도구\" 한 통에 13개씩 쌓여 찾기 힘들던 걸 성격별로 정리. <b>허브 페이지</b> 3곳 신설(상단 탭으로 전환): <b>📊 심화 분석</b>(Run Value·기대성적/운·구종 분석), <b>🛡️ 수비</b>(팀 수비·수비수 단독·타구 분석), <b>📋 스카우팅</b>(상대 공략·선수 평가). 드롭다운도 <b>⚔️ 전략</b>(비교·매치업·상대전적·팀빌더)·<b>🏅 랭킹</b>·<b>📰 경기</b>로 재분류. 모바일 메뉴도 동일 구조로.'},
      {icon:'🎯', text:'⭐⭐⭐ <b>「기대 성적·운(xOut)」 페이지 신규 (심화 분석 허브)</b> — 모든 인플레이 타구에 <b>리그 아웃 확률(xOut)</b>을 매겨 \"타구질 대비 실제 성적이 운이 좋았나/나빴나\"를 분리. 가장 불운/행운한 타자·투수 랭킹(실타율 vs 기대타율). 기존 수비 분석의 정교한 xOut(방향·발사각·이동거리 반영) 모델을 재사용. 검증: Kenomo 실.263 vs 기대.408(불운), わかなで 실.510 vs 기대.308(행운) 등 설득력 있게 갈림.'},
      {icon:'📊', text:'⭐⭐⭐ <b>「Run Value」 페이지 신규 (심화 분석 허브)</b> — 분석기 전체가 비율스탯(타율·OPS·ERA)뿐이라 <b>"상황별 실제 득점 기여"</b>를 볼 수 없던 공백을 메움. 현대 야구 분석의 근본 틀인 <b>득점 기대값(Run Expectancy)</b>을 이 리그 데이터로 직접 학습해 모든 플레이를 점수화.'},
      {icon:'🔢', text:'⭐⭐⭐ <b>RE24 매트릭스</b> — 24개 루상·아웃 상황별 "이닝 끝까지 기대 득점"을 리그 전 타석으로 학습한 히트맵. 이 게임만의 득점 환경이 드러남(예: 무사 만루 ≈ 2.1점, 2사 주자없음 ≈ 0.08점). 아웃·주자 수에 따라 단조 증가하는 것으로 모델 타당성 확인.'},
      {icon:'🏏', text:'⭐⭐⭐ <b>타자/투수 Run Value 랭킹</b> — RV = RE(끝)−RE(시작)+득점. 타율이 못 보는 <b>진루타·상황 타격</b>까지 가치 반영. 검증: 상황 득점가치만으로 돌렸는데 <b>MVP·사이영 수상자가 저절로 상위</b>에 나옴(모델이 실제로 작동한다는 증거). 전 열 정렬·팀/최소표본 필터, RV/100·득점창출·손실 분해.'},
      {icon:'🎯', text:'⭐⭐ <b>종료 카운트별 Run Value</b> — 타석이 어떤 카운트에서 끝났을 때 평균 가치가 어떤지. 2스트라이크(투수 유리)는 음수, 3볼(타자 유리)은 양수로 — 카운트 전략의 정량 근거.'},
      {icon:'📋', text:'⭐⭐ <b>타자·투수 분석 C탭에 개인 RV 요약 카드</b> — 시즌 RV·RV/100·리그 순위 + <b>레버리지 가중 클러치 RV</b>(승부처 중요도를 가중한 WPA식 기여도). 그 선수 보던 흐름에서 바로 확인.'},
      {icon:'🔬', text:'정확도 — 타석 단위 집계, 이닝 종료 시 RE=0 처리, half 규칙(1=teamA 공격)과 경기별 득점 누적으로 "이닝 끝까지 추가 득점"을 정확히 계산. 닉변 선수 _canonPlayer 병합. 활성 경기 + 캐시 세대로 메모이즈.'},
    ]
  },
  {
    version: 'V11.6',
    date: '2026-09',
    title: '🆚 상대전적(Head-to-Head) 페이지 신규',
    badge: '#ffd700',
    changes: [
      {icon:'🆚', text:'⭐⭐⭐ <b>「상대전적」 페이지 신규 (도구 메뉴)</b> — 기존 매치업 페이지는 <b>승부 예측 시뮬</b>이 메인이라 실제 맞대결 기록은 안타 개수만 보조로 나왔고, <b>투수를 한 명씩 골라야</b>만 볼 수 있었음. → 제대로 된 상대전적 전용 뷰를 신규 추가. <b>기준 토글(🏏 타자 기준 / ⚾ 투수 기준)</b>로 양방향 모두 지원.'},
      {icon:'📋', text:'⭐⭐ <b>선수 하나 선택 → 상대별 세부 전적표</b> — 예: 타자를 고르면 <b>상대한 모든 투수별 성적</b>이 표로 (반대로 투수를 고르면 상대한 모든 타자별 피성적). 각 행에 <b>타석·타수·안타·2B·3B·HR·삼진·볼넷 + 타율/출루/장타/OPS + 헛스윙%·EV</b>. 상단엔 그 선수의 <b>통합 상대전적 요약 카드</b>. 전 열 클릭 정렬, <b>최소 타석·손잡이(우/좌)</b> 필터.'},
      {icon:'🖱️', text:'⭐⭐ <b>행 클릭 → 투구별 상세 모달</b> — 특정 매치업(타자 vs 투수) 행을 누르면 <b>슬래시라인 12지표 카드 + 구종별 대응 표 + 투구 기록(최근 40투구: 이닝·카운트·구종·구속·결과·EV)</b>이 팝업.'},
      {icon:'📊', text:'⭐ <b>선수 미선택 시 전체 요약표</b> — 아무도 안 고르면 전체 타자(또는 투수)를 <b>OPS 순 정렬표</b>로 쭉 표시. 행을 누르면 그 선수의 세부 전적으로 이동. "전체를 쭉 보다가 궁금한 선수만 파고들기" 흐름.'},
      {icon:'🎯', text:'정확도 — 안타 정의는 <b>기록실과 동일</b>(낫아웃 출루·야수선택 제외), 타석 종료 판정에 <b>경기 경계(_gameId)</b>까지 반영, SLG는 <b>_hitBase 추정 루타수</b> 기반(2·3루타 반영), 닉네임 변경 선수는 <b>_canonPlayer로 병합</b>해 한 행으로 집계.'},
      {icon:'🗂️', text:'⭐⭐ <b>투수·타자 분석 페이지에 「상대전적」 탭 추가</b> — 투수 분석 <b>H. 🆚 상대전적</b>, 타자 분석 <b>G. 🆚 상대전적</b>. 현재 선택한 선수 기준으로 상대별 전적표가 바로 뜨고, 탭 안에서 <b>최소 타석·손잡이 필터</b> 조절 가능. 페이지를 옮기지 않고 그 선수 보던 흐름에서 바로 확인.'},
      {icon:'🔍', text:'⭐⭐ <b>상대전적 페이지에 「1:1 상세」 모드 추가</b> — 타자 <b>+</b> 투수를 둘 다 직접 선택하면 그 매치업의 상세가 모달이 아니라 <b>페이지에 쫙 펼쳐짐</b>: 종합 성적 16지표 + <b>구종별·구속대별(5km)·카운트별 대응 표</b> + 전체 투구 기록(이닝·카운트·구종·구속·결과·EV·LA).'},
      {icon:'ℹ️', text:'참고 — 개별 매치업은 표본(타석)이 적을 때가 많아 <b>타율·출루·장타가 모두 같은 값(예: 1타수 대비 안타 1개 → .333)</b>으로 보일 수 있음. 계산 오류가 아니라 표본이 작아 그런 것이며, 옆의 <b>타수·안타 개수</b>를 함께 보면 됨(최소 타석 필터로 표본 늘리기 권장).'},
    ]
  },
  {
    version: 'V11.5',
    date: '2026-09',
    title: '🎯 타자 상황별 대응 분석 · 존분석 구속 필터',
    badge: '#39ff8a',
    changes: [
      {icon:'🎯', text:'⭐⭐⭐ <b>타자 「상황별 대응 분석」 다중 필터 추가 (스윙 지표 탭)</b> — 같은 구종·구속이라도 코스·카운트에 따라 대응이 크게 다른데, 기존엔 구종별 대응 성적만 볼 수 있어 <b>\"이 타자가 어떤 구속을 어느 상황에서 강한가\"</b>를 파악할 수 없었음. → <b>구속 범위(슬라이더) · 코스(몸쪽/바깥/상/하/존안/존밖) · 카운트(초구/유리/불리/2스트라이크)</b> 3종 필터를 자유롭게 조합해 데이터를 좁히고, <b>「묶어보기」</b>로 그 안을 구종별·구속 5/10km 단위·코스 9분할·카운트별로 쪼개서 표시. 각 행에 <b>안타율·헛스윙%·EV·LA·|hPos|(배트중심이탈)·반응시간·배럴+%</b>를 색상 히트맵(초록=좋음/빨강=나쁨)과 함께 한눈에 표시, 전 열 클릭 정렬. 손잡이(우투/좌투) 필터와도 조합됨.'},
      {icon:'🗺️', text:'⭐⭐ <b>존 분석(E탭)에 구속 범위 필터 추가</b> — 5×5 핫/콜드존·구종×존 상세·존 요약이 모두 <b>구속 범위(콤보박스 — 5km 눈금 선택 + 직접 입력 겸용)</b>로 필터링됨. 구종 필터와 함께 쓰면 <b>\"빠른 직구를 몸쪽/바깥/상/하 어디서 잘 치나\"</b>처럼 구종+구속+코스를 결합한 정밀 분석 가능. 같은 직구라도 구속대별로 존 대응이 다른 것을 확인할 수 있음.'},
      {icon:'🖱️', text:'⭐⭐⭐ <b>존 셀 클릭 → 상세 분석 모달</b> — 5×5 핫/콜드존에서 <b>아무 칸이나 클릭</b>하면 그 존(현재 구속·구종 필터 반영)의 상세 정보가 팝업으로 뜼. <b>요약 카드</b>(타율·장타율·헛스윙·평균EV·평균LA·|hPos|·배럴+%·홈런) + <b>구종별 대응 표</b> + <b>구속대별 대응 표</b>(5km 단위). 지도에서 색으로 대략 보고 → 궁금한 존을 클릭해 "이 코스에서 어떤 구종·구속에 강하고 약한지"를 한 번에 파고들 수 있음.'},
    ]
  },
  {
    version: 'V11.4',
    date: '2026-08',
    title: '🏆 팀 탭 전면 개편 · ⚔️ 상대 비교 · 📏 평가 지표 재설계 · ⚡ 성능 최적화',
    badge: '#ff8c44',
    changes: [
      {icon:'🔗', text:'⭐⭐⭐ <b>경기별 성적과 헤더 안타 수가 다르던 문제 수정</b> — 같은 선수인데 <b>경기별 성적 16안타 / 헤더 15안타</b>처럼 값이 갈리던 오류. 원인은 <b>안타 정의가 세 갈래로 나뉘어 있던 것</b>: 기록실·헤더는 <code>_isHitPlay</code>로 <b>낫아웃 출루(1BSafe=1이지만 ev=0)와 야수선택(선행주자 포스아웃)을 제외</b>하는데, 경기별 성적(<code>calcBatterGameStats</code>)과 공용 헬퍼 <code>_isHit()</code>은 <b>1BSafe=1이면 무조건 안타</b>로 셌음. → 두 곳 모두 기록실과 동일한 정의로 통일. <code>_isHit</code>은 21개 화면(선수 카드·존 히트맵·투수 피안타·클러치·팀 타격/투수·스카우팅 등)에서 공용으로 쓰여 <b>한 번의 수정으로 전 화면이 정렬</b>됨. <br>야수선택 제외는 MLB 규칙 10.05(b)(1)에 따른 것으로, 신규 CSV의 아웃코드(<code>out1~3Code</code>)가 있어야 판정 가능. 실측 2R 16경기 전수 검증: 수정 전 12명 중 6명이 불일치였으나 <b>수정 후 전원 일치(불일치 0명)</b>.'},
      {icon:'🏁', text:'⭐⭐⭐ <b>끝내기 득점이 스코어보드에 누락되던 문제 수정 (신규 포맷)</b> — 신규 포맷은 끝내기 상황의 최종 득점을 <b>마지막 투구가 아니라 SIDE/END 마커 행에 기록</b>함(마지막 투구 시점은 득점 <b>전</b> 상태). 실측 2R 16경기 중 <b>4경기</b>에서 마커를 빼면 최종 스코어가 틀어짐(3-4→3-3, 10-11→10-9, 2-9→2-7, 2-3→2-2). 반대로 마커를 그대로 두면 <b>END의 이닝 번호가 실제보다 커서</b>(9회 경기에 END inn=10) 스코어보드에 빈 이닝이 생김. → 마커의 <b>스코어는 반영하되 이닝 목록에는 넣지 않고, 마지막 실제 이닝에 귀속</b>시키도록 수정. 결과: 16경기 전부 <b>이닝별 합계 = 최종 스코어</b> 일치 확인.'},
      {icon:'🐛', text:'⭐⭐⭐ <b>투수 이닝이 실제보다 적게 집계되던 문제 수정 (신규 포맷)</b> — 5이닝 완투가 <b>3.2이닝</b>으로 표시되는 등 투수 이닝·ERA·WHIP·QS·pWAR이 전부 틀어지던 심각한 오류. 원인은 <b>신규 데이터 포맷(256컬럼)에 추가된 이닝교대 마커 행</b>(<code>type=SIDE</code>, 투수·타자명이 비어 있고 out/주자 상태만 담김). 이닝 계산은 "그 이닝의 마지막 투구"에 3아웃을 채우는 방식인데, <b>마커 행이 마지막이 되어 실제 투수의 마지막 투구가 3아웃 채우기 대상에서 제외</b>됐음 — 마커가 있는 이닝마다 아웃 1개씩 누락. 실측(2026-08-29 AT vs SS): 마커 있는 이닝은 2아웃, 없는 이닝만 3아웃으로 계산돼 5이닝이 11아웃(3.2이닝)으로 집계됨. → <code>_isDummyPitch</code>가 <b>SIDE·END 마커를 더미로 인식</b>하도록 하고, 이닝 계산 시 제거 후 처리. 수정 후 15아웃(5.0이닝)으로 정상화. <b>2R 16경기 전수 검증</b>: 수정 전 총아웃이 정상치의 60~70%(예: 9회 경기 54아웃 중 35아웃)였으나, 수정 후 전 경기가 정상 범위(51~60아웃)로 복구.'},
      {icon:'📏', text:'⭐⭐⭐ <b>내야 통과 타구 귀속 반경 — EV별 차등으로 재설계</b> — 기존 <b>12m 고정</b>은 강하게 빠져나간 타구까지 내야수 책임으로 잡아 과도했음. 경로거리를 고정하고 EV만 바꿔 비교한 결과 <b>같은 거리에서 EV만으로 처리율이 56%p 차이</b>(4~7m 구간: EV&lt;95 89.3% / 110~125 41.0% / 125+ 33.3%), 특히 <b>EV 125+는 9~12m에서 16건 중 0건(0%)</b>으로 물리적으로 닿을 수 없는 타구였음. 원인은 도달시간 — 같은 3m 거리에서 EV&lt;95는 2.41초, EV125+는 <b>1.62초</b>로 반응 여유가 33% 적음. → 각 구간 처리율이 40~50%가 되는 지점을 경계로 <b>EV 125+ 4m / 110~125 6m / 95~110 8m / 95 미만 11m</b> 적용. <br><b>검증</b>: 280개 파라미터 조합을 그리드 탐색하고 <b>두 시즌 교차 검증</b> — 채택안은 FW 78.4%·섬머 84.2%(평균 81.3%)로 최상위권이며 시즌 간 편차도 안정적. 기존 12m는 75.9%로 최하위. FW 단독 최적값(3/4/9/10)은 섬머에서 79.5%로 급락해 <b>과적합으로 확인·기각</b>. 물리 모델(감속계수 기반 도달시간)과 실측 체공시간 방식도 시험했으나 각각 77.3%·67.5%로 더 낮았음. <br><b>결과</b>: 귀속 건수 FW 412→241(−42%)·섬머 158→61(−61%), 내야 Brier FW −12.3%·섬머 −25.4% 개선. 팀 순위는 상위권이 소폭 내려가고 하위권이 올라가는 방향(기존 12m가 범위 넓은 팀에 과보상, 좁은 팀에 과페널티였음).'},
      {icon:'🔗', text:'⭐⭐⭐ <b>선수 병합(별칭)이 팀 판정에 적용되지 않던 문제 수정</b> — 병합된 선수(오띵__→낑깡__, にゃんこ3K→にゃんこ65K 등)의 <b>팀이 "—"로 잡히거나 기록이 갈리던 문제</b>. 원인은 별칭 정규화가 일부 경로에만 적용된 것: <code>_leaguePlayerTeams</code>(리그전 시즌 기준 팀 판정)와 <code>_computeTeamProfiles</code>(팀 프로파일 투구 집계)가 <b>원본 이름(bName/pName)을 그대로 키로 사용</b>해, 수비 쪽에서 정규화된 이름으로 조회하면 매칭이 실패했음. → 두 함수 모두 <code>_canonPlayer</code> 경유하도록 수정. 이제 <b>_rebuildCaches · 수비 · 리그전 팀판정 · 팀 프로파일 · 포지션 판정 전 경로</b>에서 병합이 일관되게 적용됨.'},
      {icon:'🔗', text:'⭐⭐ <b>선수 병합(별칭)이 수비 기록에 적용되지 않던 문제 수정</b> — 닉변·계정변경 병합(<code>_canonPlayer</code>)이 <b>투수명(pName)·타자명(bName)에만 적용</b>되고 <b>수비 집계에 쓰이는 포구자(cPlr)와 포지션별 선수명에는 적용되지 않았음</b>. 그 결과 같은 선수가 이름별로 갈려 수비 기록이 흩어지고, 팀 매칭이 안 되면 아예 어느 팀에도 집계되지 않았음(실제 사례: 2루 59기회가 팀 미상으로 누락되어 해당 팀 2루가 3기회로 표시). → <b>cPlr·9개 포지션명 전부 별칭 정규화</b> 적용. 원본 이름을 <code>_raw*</code>에 보관해 별칭을 바꿔도 항상 원본에서 다시 매핑하므로 중복 적용·오염 없음.'},
      {icon:'🐛', text:'⭐⭐ <b>리그전 수비 탭이 활성 경기만 집계하던 문제 수정</b> — 리그전의 다른 탭(기록실·팀기록)은 <code>_withSeasonGames()</code>로 <b>해당 시즌 경기를 임시 활성화한 뒤 계산</b>해 비활성 경기까지 포함하는데, <b>수비 탭만 현재 활성 경기에서 뽑아 시즌 표본이 통째로 누락</b>됐음(예: 63경기 시즌인데 36경기만 집계). → 수비도 동일하게 <code>_withSeasonGames</code>를 경유하도록 변경. 이 과정에서 수비 계열 캐시 5종(<code>_defenseDataCache</code>·<code>_lgDefStatsCacheMap</code>·<code>_ifPassCache</code> 등)도 임시 격리하도록 <code>_withSeasonGames</code>를 확장 — 시즌 기준 계산이 활성 경기 캐시를 오염시키지 않음.'},
      {icon:'🧮', text:'⭐⭐⭐ <b>OAA 기대 아웃률(xOut) 모델 재설계</b> — 분석기 로직을 정확히 재현해(실제 내보내기 대비 평균오차 0.15) 수십 가지 변수·조합을 실측 비교한 뒤 개편. <b>내야</b>: 포지션별 1D 이동거리 커브 → <b>2D 그리드(이동거리 × 발사각, 5×4 + 3×3 이웃 가중 스무딩)</b>. 그룹을 쪼개면 표본이 갈라져 불안정해지던 문제를 이웃 셀 참조로 해결 — 포지션 편차 <b>0.0057→0.0019(3배 개선)</b>하면서 변별력은 오히려 상승. <b>외야</b>: 요구속도(거리/체공시간) → <b>이동거리 기반</b>으로 교체(방향 분리는 유지). 요구속도는 체공시간 결측이 8~21%라 폴백이 잦고 난이도 추정도 부정확했음 — 편차 <b>0.0273→0.0132</b>, 외야 Brier <b>0.1592→0.1114(30% 개선)</b>. 전체 Brier 0.1645→0.1427. <br><b>검증 과정에서 걸러낸 것</b>: 포구 깊이·1루 송구거리는 예측력이 압도적으로 보였으나 <b>귀속 플레이(내야 통과)의 포구점이 외야라 "통과 여부"를 직접 알려주는 데이터 누수</b>였음(귀속 78.6m/아웃률 0% vs 일반 36.0m/90%). 주자 수(단독 설명력 21.8%p)·타자 발속도·EV 추가는 변별력만 떨어뜨려 미채택. <br>실제 영향: 우익수가 유독 과대평가(리그 합 +12.0)되던 것이 정상화, SS는 외야 타구 난이도가 제대로 반영되며 팀 OAA −3.2→+3.2(단 외야는 여전히 리그 최하위).'},
      {icon:'🗺️', text:'<b>수비 히트맵 구장 최신화</b> — 수비수 상세 페이지의 포구 위치 히트맵이 <b>구버전 근사 좌표</b>(폴 ±69m·중앙 -138m·베이스 27.4 근사)를 쓰고 있던 것을 공통 실측 <code>FIELD</code> 상수 기반 <code>_renderSprayField()</code>로 교체 — 타자 스프레이·타구 분석·팀 탭과 구장 모양이 완전히 통일됨(폴 ±74m·좌우중간 ±54.74/-117.5·중앙 135m·실측 베이스). 전수 점검 결과 구버전 좌표를 쓰던 곳은 이곳 하나였음.'},
      {icon:'🔗', text:'⭐⭐⭐ <b>OAA 값 불일치 수정 — 전 화면 통일</b> — 같은 선수의 OAA가 <b>화면마다 다르게 표시</b>되던 문제. 수비 분석·수비수 상세·팀 탭·내보내기는 <code>oaaWeighted</code>(난이도 가중 1.0~1.5배)를, 리그전 수비 탭은 순수 OAA를 써서 최대 50% 차이가 났음. → <b>가중치를 제거하고 순수 OAA로 통일</b>. 근거: ① 난이도는 <b>xOut에 이미 반영</b>되어 있어(어려운 타구는 xOut이 낮아 잡으면 큰 플러스) 가중치는 이중 계산 ② 무엇보다 <b>가중을 곱하면 zero-sum이 깨짐</b>(시뮬 2000플레이: 순수합 +0.5 vs 가중합 −51.0) — 구역별·포지션별 캘리브레이션으로 잡아둔 편향이 무의미해짐. 이제 어느 화면에서 봐도 동일한 값이며 리그 합계 0이 유지됨.'},
      {icon:'🐛', text:'⭐⭐ <b>리그전 수비 탭 — 리그전 외 팀이 섞이던 문제 수정</b> — 리그전 수비 순위에 <b>해당 시즌 리그전이 아닌 팀(TWP·Dt·GE 등)이 표시</b>되던 오류. 원인 두 가지: ① <b>선수 소속팀을 전체 활성 경기 기준으로 판정</b>해, 연습경기 출전이 더 많은 선수가 그 팀으로 분류됨(예: 리그전 SS 50타석 + 연습 TWP 80타석 → TWP로 집계) ② 캐시 키가 경기 수만 반영해 다른 화면의 전체 범위 결과를 재사용. → <b>리그전 팀기록과 동일한 로직 적용</b> — <code>_leaguePlayerTeams(games)</code>로 해당 리그전 경기 기준 소속팀을 재판정하고 리그전 출전팀 화이트리스트로 필터링, 캐시 키에도 경기 ID 내용 반영.'},
      {icon:'↕️', text:'⭐⭐ <b>표 정렬 기능 추가 (9개 표)</b> — 범용 정렬 헬퍼 <code>_sortTable()</code> 신규 — 헤더 클릭으로 오름/내림 전환, 재렌더 없이 즉시 정렬되고 순번(#)도 자동 재부여. <code>+16.4</code>·<code>81.0%</code>·<code>+3.3%p</code>·<code>.346</code> 같은 표기를 자동 파싱(15종 검증 완료). 적용: <b>리그전 수비</b>(팀 순위·포지션별 선수·개인 랭킹), <b>팀 수비</b>(포지션별·선수별), <b>팀 타격</b>(타자별 요약), <b>팀 투수</b>(투수별 요약·구종 운용), <b>팀 추이</b>(상대별 전적).'},
      {icon:'🔍', text:'⭐⭐⭐ <b>수비 분석 3화면 대폭 확장 — 리그 대비 상세 비교</b> — 기존엔 팀 OAA 합계나 개인 순위만 볼 수 있어 <b>"어느 팀 어느 포지션이 강한가"</b>를 판단할 수 없었음. 공통 엔진 <code>_leagueDefenseStats()</code> 신규(포지션별 리그 기준·선수×포지션·팀×포지션 일괄 산출) 후 3개 화면에 적용. <br><b>① 리그전 탭에 🛡️수비 서브탭 신설</b> — 팀 수비 순위(OAA·내야/외야 아웃률·리그대비·통과율), 팀×포지션 매트릭스, 포지션별 선수 리더보드(7개 포지션 각각), 개인 OAA 상하위 15명. <br><b>② 팀 탭 수비</b> — 팀×포지션 매트릭스(자기 팀 강조)와 소속 선수의 포지션별 상세(리그 평균 대비 %p·OAA/10기회·통과 수·등급) 추가. <br><b>③ 수비 분석 페이지</b> — 하단에 "리그 대비 상세" 토글 추가(팀×포지션 / 포지션별 선수). <br>모든 표에서 선수 이름 클릭 시 수비수 상세 페이지로 이동, 매트릭스 셀 호버 시 아웃률·기회·OAA 표시.'},
      {icon:'🧤', text:'⭐⭐⭐ <b>OAA에 수비 범위(range) 반영 — 내야 통과 타구 귀속</b> — 기존 OAA는 <code>cPlr</code>(실제 포구자) 기준이라 <b>내야를 뚫고 나간 땅볼이 외야수 플레이로만 잡히고 내야수 평가에서 빠졌음</b>. 즉 "닿은 공을 처리했나"만 보고 <b>"닿을 수 있느냐"(수비 범위)는 전혀 평가하지 못했음 — 따라가서 잡았다가 세이프면 감점되는데, 아예 손도 못 대고 빠뜨리면 기록조차 안 남는 역설</b>. 실측(36경기): 땅볼 994건 중 <b>166건(16.7%)이 내야 통과</b>, 이들 아웃률 5.9%. → 통과 타구를 <b>타구 방향각(sdeg) 직선 기준 최근접 내야수(12m 이내)</b>에게 귀속(158건, 95.2% 귀속 성공). 결과: 평균 xOut 0.898→0.776, 범위 0.82~0.98→<b>0.66~0.98</b>로 확대되어 "잘해도 +0.05, 놓치면 -0.95"인 비대칭이 완화되고 <b>선수 변별력 1.36→2.20(+62%)</b>. <br>귀속 기준은 실험으로 결정 — 외야 포구지점 직선보다 <b>방향각이 정확</b>(땅볼은 바운드하며 휘므로, 편차 0.019 vs 0.014), 반경은 12m가 최적(15m 이상은 결과 동일, 8m는 미귀속 과다).'},
      {icon:'📐', text:'⭐⭐ <b>팀 내야 통과율 지표 신규</b> — 땅볼 중 내야를 뚫고 나간 비율. <b>추정이 전혀 없는 직접 집계</b>라 OAA보다 신뢰도가 높음. 팀 수비 탭에 리그 평균 대비·순위와 함께 표시하고 내보내기(<code>teamDefense.infieldPass</code>, schema v17)에도 포함. 실측 리그 평균 16.7%.'},
      {icon:'🎯', text:'⭐⭐⭐ <b>OAA 내야 커브 포지션별 분리 — 구조적 편향 제거</b> — 기존엔 <b>1루수·2루수·3루수·유격수가 동일한 기대 아웃률 커브</b>를 공유했으나, 실측 결과 같은 이동거리에서 난이도가 크게 달랐음(12~16m 구간: <b>1B 87% vs 2B 48%</b>). 그 결과 1루수는 과대평가(+0.093/기회), 유격수는 과소평가(-0.043/기회)되는 구조적 편향 발생. → <b>1B/2B/3B/SS 각각 독립 커브</b>로 분리(표본 150건 미만이면 통합 커브 폴백 — P·C가 해당). <br><b>2개 시즌 교차 검증</b>: FW 리그전 63경기에서 포지션 편차 0.0590→0.0110(5.4배 개선), 섬머 1R 36경기에서 0.0303→0.0117(2.6배). <b>변별력 손실은 거의 없음</b>(FW 3.82→3.55, 섬머 1.89→1.89 동일). 1루수 편향은 +0.093→-0.004로 소멸. <br>※ 난이도 가중치(w=1-|xOut-0.5|×1.4)와 xOut≥0.85 제외도 함께 실험했으나, 전자는 변별력을 30% 깎고 후자는 오히려 편차를 키워(1B -0.043) 미채택.'},
      {icon:'🛡️', text:'⭐⭐⭐ <b>OAA 계산 편향 수정 — 구역별 zero-sum 보정</b> — OAA는 리그 전체 합이 0이어야 하는데 실측 결과 <b>-37.1</b>로 크게 벗어나 있었음. 원인은 <b>내야(아웃률 85~95%)와 외야(27~40%)의 스무딩 편향 방향이 반대</b>인데 전체를 한 번에 보정해 상쇄되지 않은 것 — 내야 총합 -66.3 / 외야 +29.2로, <b>9팀 전원 내야 OAA가 마이너스</b>인 비정상 상태였음(내야수는 잘해도 감점되는 구조). → 캘리브레이션을 <b>내야/외야 각각 독립 적용</b>하도록 변경. 결과: 리그 합계 0 복원, 내야가 5팀 플러스/4팀 마이너스로 정상 분포, 팀 순위 왜곡은 1쌍 교체에 그침. 보정 후 OAA가 <code>vsLeague</code>(리그 평균 아웃률 대비) 지표와 결론이 일치해 교차 검증됨.'},
      {icon:'📊', text:'⭐⭐ <b>RA9 · ERA+ 지표 신규 (전 화면 적용)</b> — <b>RA9</b>(9이닝당 실점)는 pWAR 산출의 기반 지표인데 정작 어디에도 표시되지 않던 것을 추가. <b>ERA+</b>(리그평균 RA9 / 본인 ERA × 100, 100=평균)를 신규 도입 — 기존 FIP-와 짝을 이루되 <b>높을수록 좋은</b> 방향이라 직관적. 적용 범위: <b>투수 분석 헤더</b>·<b>선수 카드 상세</b>(ERA 옆 ERA+, 실점 옆 RA9 — ERA+는 130↑ 초록, 70↓ 빨강으로 색상 구분), <b>일반 기록실·리그전 기록실</b>(고정 컬럼으로 승격해 그룹과 무관하게 항상 표시), <b>일반 리더보드</b>(RA9 낮은순·ERA+ 높은순), <b>리그전 리더보드</b>(ERA+ 카드), <b>리그전 팀기록 투수탭</b>(팀 단위 RA9·ERA+), <b>내보내기</b>(개별 투수 advanced + 팀 pitching, schema v16), glossary 정의 포함. 팀 ERA+는 리그 전체 RA9를 기준선으로 산출.'},
      {icon:'🐛', text:'⭐⭐ <b>기록실 투수 실점 컬럼 표시 안 되던 문제 수정</b> — 컬럼 정의(<code>{k:\'runs\', l:\'실점\'}</code>)는 있었으나 <b>컬럼 그룹(기본/피안타/피타구질/전체) 어디에도 <code>runs</code>가 포함되지 않아</b> 필터에서 걸러져 화면에 나오지 않던 상태. <b>일반 기록실·리그전 기록실 양쪽 모두</b> 실점을 고정 컬럼(피안타 뒤·ERA 앞)으로 승격 — ERA 산출 근거이자 기본 기록이므로 그룹과 무관하게 항상 표시. <br>또한 리그전 리더보드 "투수 누적" 섹션이 카드 5개로 4+1 줄바꿈되어 마지막 줄에 가로 스크롤이 생기던 것을 <b>3+2 배치</b>로 분리 — 둘째 줄(실점 적은순·RA9)은 flex가 자동으로 절반씩 나눠 쓰도록.'},
      {icon:'📋', text:'⭐⭐ <b>리그전 팀 기록 — 3탭 구조 개편</b> — 기존 타격/투수 2탭에 <b>📋 일반</b> 탭 신설. 일반 탭에는 <b>경기·승·패·승률·득점·실점·득실차·경기당 득실</b>과 핵심 지표(타율·OPS·홈런·ERA·WHIP·oWAR·pWAR·총WAR)를 모아 순위표 역할을 겸하도록 구성. <b>투수 탭</b>에는 팀 단위 <b>승·패·세이브·홀드·QS·QS+</b>를 추가(개별 투수 결과기록을 팀 합산). 탭 전환 시 현재 탭에 없는 정렬 키면 기본값(일반=승률·타격=OPS·투수=ERA)으로 자동 폴백. <br>※ 타자 개인 득점(R)·타점(RBI)은 원시 데이터로 정확한 산출이 어려워 보류.'},
      {icon:'🐛', text:'<b>리그전 리더보드 "타점권 득점(R)" 카드 삭제</b> — 이름은 득점인데 실제로는 <b>총루타(TB)를 표시</b>하고 있어 바로 위 "총루타(TB)" 카드와 완전히 중복되던 오류. 정확한 득점 집계가 불가능하므로 카드 자체를 제거.'},
      {icon:'🔥', text:'⭐⭐ <b>실점 기록 누락 보완 + 리그전 팀기록 순위 정보 추가</b> — 실점 관련 표시를 전수 점검해 빠진 곳을 보완. <b>리그전 리더보드</b>에 투수 지표가 ERA·FIP·WHIP·K/9·탈삼진·이닝·볼넷·다승·세이브·홀드·QS까지 있으면서 <b>실점만 빠져 있던 것</b>을 발견 → <b>실점 적은순</b>(규정이닝)과 <b>9이닝당 실점(RA9)</b> 카드 신규 추가. <b>리그전 팀기록 요약 테이블</b>에는 팀 성적의 기본인 <b>승·패·승률·득점·실점·득실차</b>가 통째로 없어 순위표 역할을 못 하던 것을 보완 — 경기 결과(이닝별 득점 집계, 끝내기 보정 포함)에서 산출해 6개 컬럼 추가, 정렬도 지원. 점검 결과 기록실 투수 개인·일반 리더보드·리그전 팀기록 투수 상세·팀 로스터·내보내기는 이미 정상.'},
      {icon:'📦', text:'⭐⭐ <b>내보내기 schema v15 — 순위표·수비 세부 추가</b> — 외부 분석 시 원시 로그를 재계산해야 했던 항목들을 내보내기에 포함. <b>standings</b>: 활성 경기 기준 승패·승률·득실차·경기당 득실·<b>피타고리안 기대승률</b>(실제 승률과 비교하면 운/클러치 영향 파악 가능)·경기별 로그. <b>teamDefense</b>: 팀 OAA 합계만으론 알 수 없던 <b>내야/외야 분리</b>(각각 리그 평균 대비 %p), 포지션별 OAA·아웃률, 선수별 처리수·아웃률·OAA/10기회·리그대비·동일포지션 백분위(약한 순 정렬). 리그 포지션별 기준 아웃률도 함께 제공해 비교 기준선 확보.'},
      {icon:'📦', text:'⭐⭐ <b>내보내기 schema v14 — 팀 분석 블록 신규</b> — 개편된 팀 탭 데이터가 내보내기에 <b>전혀 반영되지 않던 것</b>을 확인하고 <code>teams</code> 블록 추가. 팀 탭(개요·전력 진단서)과 <b>완전히 동일한 기준</b>으로 산출: <b>grade</b>(종합/타격/투수/수비 등급+점수, 가중치 명시) · <b>areas</b>(6영역 리그 백분위) · <b>batting</b>(전통 지표 + HH/HH+/배럴/배럴+ · 존내컨택 · 체이스 · BABIP · oWAR) · <b>pitching</b>(ERA/FIP/WHIP + 제구 세분화(실투율·보더라인%) + 피타구질 4종 + pWAR) · <b>defense</b>(팀 OAA·리그 순위) · <b>clutch</b>(득점권 OPS 타격/투수). glossary에도 존내컨택%·체이스%·실투율·보더라인%·팀 등급·클러치 정의 추가 — AI 분석 시 신규 지표를 정확히 해석 가능.'},
      {icon:'🐛', text:'⭐⭐ <b>스프레이 존 오버레이 버그픽스</b> — 팀 탭·스카우팅의 5등분 존 필터에서 ① <b>부채꼴이 SVG 밖으로 넘쳐 위쪽 카드를 덮고 버튼 클릭까지 막던 문제</b> → clipPath + overflow 제한으로 영역 고정(전역 <code>makeSVG</code>의 <code>overflow:visible</code>이 원인이었음) ② <b>내야/외야 필터가 부채꼴 집계에만 적용되고 점에는 적용 안 되던 문제</b> → 필터에 맞는 타구만 표시하도록 통일 ③ <b>내야 모드에서 라벨 5개가 홈플레이트에 뭉쳐 겹치던 문제</b> → 타자 스프레이 차트와 동일하게 <b>내야 영역으로 줌인</b>(±32m)하고 라벨 반지름 조정. 세 모드(전체/내야/외야) 모두 라벨 간격 50px 이상 확보 검증.'},
      {icon:'💥', text:'⭐⭐ <b>클러치 지표 신규 — 타격·투수 양쪽, OPS 기반</b> — 득점권(2·3루 주자) 상황 성적을 리그 평균과 비교해 등급화. <b>피안타율 대신 OPS 사용</b> — 안타와 홈런의 실점 영향이 다르고 볼넷도 득점권에선 위험하기 때문(실측 316경기: 득점권 피안타율은 리그 대비 +39인데 <b>피OPS는 +78</b>로 격차가 두 배). 장타율은 <code>_hitBase</code> 기반 정확한 총루타로 계산. <b>클러치 타격</b>(득점권 OPS↑ 좋음)과 <b>클러치 투수</b>(득점권 피OPS↓ 좋음) 두 지표를 <b>전력 진단서</b>에 표시(헤더 요약 + 영역별 상세). 개요는 종합·타격·투수·수비 4개 등급으로 간결하게 유지. <b>종합 등급에는 미반영</b>하고 점선 테두리 + "참고" 라벨로 구분(표본 변동이 크기 때문). 10타수 미만이면 자동 미표시.'},
      {icon:'🔗', text:'⭐⭐⭐ <b>개요·진단서 평가 기준 통일 (불일치 수정)</b> — 두 화면이 <b>서로 다른 가중치로 같은 팀을 다르게 평가</b>하던 문제를 발견해 수정. 개요는 "타격 45%(컨택35·파워40·선구25) + 투수 45%(구위35·제구25·결과40) + 수비 10%", 진단서는 "컨택15·파워20·선구10·구위20·제구10·결과15·수비5·클러치5"로 <b>내부 배분과 수비 비중(10% vs 5%)이 달랐음</b>. 공통 상수 <code>TEAM_W</code>와 <code>_teamScores()</code>·<code>_teamGrade()</code>로 일원화 — 이제 어느 화면에서 봐도 같은 등급. 표본이 적은 클러치(득점권) 항목은 제거. <b>진단서에 타격·투수·수비 종합 등급</b>을 별도 박스로 추가(각 영역 배분도 함께 표기)해 종합만 보이던 것을 세분화.'},
      {icon:'📋', text:'⭐⭐ <b>업데이트 내역 정리 — 카테고리 분류 + 필터</b> — 22개 버전 273개 항목이 한 줄로 나열돼 찾아보기 어렵던 것을 <b>6개 카테고리</b>로 자동 분류: <b>✨신규 기능(89) · 🎨UI·시각화(69) · 📐지표·분석(61) · 🐛버그 수정(29) · 📦데이터·내보내기(15) · ⚡성능·안정성(10)</b>. 상단 필터로 원하는 유형만 볼 수 있고, 각 버전 안에서도 카테고리별로 묶여 표시됨. <b>최신 버전만 펼쳐지고 나머지는 접힘</b>(제목 클릭으로 열기, 전체 펼치기/접기 버튼 제공)이라 스크롤이 대폭 짧아짐. 버전 헤더에 카테고리 분포 칩(예: ✨5 📐3 🐛2)을 표시해 어떤 성격의 업데이트였는지 한눈에 파악.'},
      {icon:'📐', text:'⭐⭐⭐ <b>평가 지표 재설계 — 316경기 실측 검증 기반</b> — 전체 데이터(중복 제거 후 <b>316경기 58,889투구</b>)로 지표별 편중·변별력을 전수 검증하고 6영역을 재구성. <b>파워</b>: EV125 기준(HH+·배럴+)이 체격에 크게 좌우됨을 확인(≤170cm 대비 ≥185cm 격차 — 배럴+ <b>6.4배</b>, HH+ 3.7배, 반면 HH/배럴은 1.6~1.7배로 완만. 160cm 배럴+는 0.1%로 사실상 0) → 홈런형(배럴+·HH+·HR%)과 장타형(ISO·배럴%·HH%·평균EV)을 균형 배치해 작은 선수 위주 팀의 구조적 불이익 해소. <b>컨택</b>: 팀타율·K%에 <b>존내 컨택%</b>(리그 73.0% — "칠 수 있는 공을 실제로 맞히는 능력") 추가. 스윗스팟(hPos)은 파워와 성격 중복, BABIP는 운·상대수비 영향이 커서 제외. <b>선구</b>: BB%·체이스% 중심에 존내 스윙%(적극성)를 보조(0.10)로 — 존밖 헛스윙은 "쫓아간 뒤 못 맞힌 것"이라 컨택 성격이므로 제외. <b>투수 결과</b>: K/9·피홈런% 추가하고 FIP를 ERA보다 높은 가중치로(수비·운 영향 배제). <b>투수 제구</b>: 존인%는 한복판 몰림도 "제구 좋음"으로 잡는 문제가 있어 <b>실투율(감점)·보더라인%(가점)</b> 중심으로 재편 — 제구는 결과가 아닌 <b>의도한 곳에 넣는 능력</b>으로 평가.'},
      {icon:'⚡', text:'⭐⭐ <b>성능 최적화 검증 (316경기 규모 실측)</b> — 선수 120명 조회 <b>162.1ms → 0.1ms</b>(인덱스 캐시), 2,000점 인덱스 역참조 <b>21.1ms → 0.8ms</b>(Map). 캐시 구축 비용(1회 24~34ms)은 전 화면이 공유. 리그 비교·팀 프로파일·수비·기록실·폼 등 <b>캐시 11종을 모두 <code>_rebuildCaches</code>에 연결</b>해 데이터 변경 시 정확히 무효화(투구 수가 같아도 경기가 교체되는 경우까지 대응).'},
      {icon:'🩹', text:'⭐⭐⭐ <b>경기 로드 누락 방지 (원인 규명 + 대응)</b> — "36경기인데 35개만 로드" 현상의 원인을 추적. ① <b>네트워크 실패가 조용히 넘어감</b> → 다운로드 실패 시 <b>최대 3회 자동 재시도</b>(지수 백오프, 재시도 시 캐시 무시) + 빈 응답도 실패로 처리. ② <b>중복 판정으로 스킵된 파일이 어디에도 집계되지 않던 문제</b> → 스킵 목록을 별도 추적하고 완료 메시지에 표시. ③ 요청 수와 실제 로드 수가 다르면 <b>📋 로드 결과 리포트</b> 모달을 자동 표시(실패·중복스킵·미확인 항목을 파일명까지 나열). ④ <b>🔍 로드된 경기 점검</b> 도구 신규 — 날짜별 경기 목록, 활성/비활성 표시, 투구수가 동일한 "중복 의심" 경기쌍 자동 탐지.'},
      {icon:'✨', text:'⭐ <b>선수 카드 폼 표현 리디자인</b> — 밋밋한 뱃지 방식을 걷어내고 3중 표현으로 교체: ① 컨디션 최상/상승 시 카드 외곽에 <b>은은한 컬러 글로우</b>(부진은 안쪽 그림자) ② 사진 좌상단 <b>그라디언트 코너 태그</b>(🔥최상·📈상승 등) ③ 능력치 바 아래 <b>FORM 게이지</b> — 부진↔최상 스펙트럼 위에 현재 위치를 점으로 표시(중앙선=시즌 평균). 카드 상세 모달도 게이지 + 글로우 아이콘으로 재구성.'},
      {icon:'📏', text:'⭐⭐ <b>팀 수비 — 리그 평균 대비 지표 추가</b> — OAA는 zero-sum이라 절대값만으론 "잘하는 건지" 알기 어려웠음. 이제 <b>같은 포지션 리그 평균 아웃률과의 차이(%p)</b>를 팀·포지션·선수 단위로 모두 표시. <b>내야/외야 카드</b>에 아웃률과 리그 평균 대비 병기, <b>포지션별 표</b>에 아웃률/리그·리그 대비·리그 순위(같은 포지션 내 백분위) 컬럼 신설, <b>선수별 수비 표</b> 신규(주 포지션 기준 OAA·OAA/10기회·아웃률·리그 대비·순위, 이름 클릭 시 수비수 상세로 이동). 기회 수가 다른 선수끼리 비교할 수 있도록 <b>OAA/10기회</b>를 함께 제공.'},
      {icon:'⚔️', text:'⭐⭐ <b>팀 탭 상대 비교 — 전 탭 확대</b> — 구 진단서에만 있던 상대팀 비교를 <b>신규 6개 탭 전체</b>에 구현. 상단 셀렉트로 상대를 고르면 모든 탭이 비교 모드로 전환(선택 상태는 탭을 옮겨도 유지). <b>개요</b>: 레이더에 상대 프로파일을 점선으로 겹쳐 표시 + 영역별 등급/지표를 나란히 비교(막대에 상대 위치 파란 선). <b>진단서</b>: 영역 승패 카운트와 매치업 총평(우위/박빙 판정). <b>타격·투수</b>: 핵심 지표 9종을 위아래로 비교하고 승패 집계(▲▼). <b>추이·전적</b>: 해당 상대와의 head-to-head 전적·득실을 상단에 강조. <b>수비</b>: 팀 OAA 옆에 상대 OAA 병기.'},
      {icon:'🔬', text:'⭐⭐ <b>팀 개요 — 영역별 근거 지표 공개</b> — 기존엔 레이더에 "컨택 A"처럼 <b>결과 등급만</b> 보이고 왜 그 등급인지 알 수 없었음. 이제 6영역(컨택·파워·선구·투수구위·투수제구·투수결과) 각각을 펼쳐서 <b>구성 지표 · 실제 수치 · 리그 백분위 막대 · 가중치</b>를 모두 표시하고, 그것들의 가중 평균이 영역 점수임을 명시. 예: 파워 = HH+%(×0.30) + 배럴+%(×0.30) + HR%(×0.20) + ISO(×0.20). 영역에 포함되지 않은 참고 지표(OPS·wOBA·평균EV·K/9·피EV 등)는 별도 블록으로 분리해 혼동 방지.'},
      {icon:'📜', text:'⭐⭐ <b>팀 전력 진단서 (신규) — 한 장 요약 탭</b> — 개편으로 분석이 여러 탭에 흩어진 만큼, <b>한 화면에 요약된 진단서</b>를 별도 탭으로 신설(기존 5지표 버전은 "전력 진단서(구)"로 계속 유지). <b>8영역 가중 평가</b>: 파워·투수구위 20%, 컨택·투수결과 15%, 선구·투수제구 10%, 수비·클러치 각 5% → 종합 등급 A+~D. 영역별 리그 백분위 막대(중앙선=리그 평균)와 근거 수치 병기. <b>자동 진단 코멘트</b>: 최강·최약 영역 지목, 공격형/수비형/밸런스형 판정, ERA-FIP 괴리 해석(수비·운의 영향). 핵심 타자·투수 WAR 상위 3인. <b>수비(OAA)는 비중 5%로만 반영</b>하고 화면에 명시 — 추정 지표가 등급을 좌우하지 않도록.'},
      {icon:'🧪', text:'⭐⭐ <b>6영역 지표 균형 보강 — 컨택·선구·투수결과 세분화</b> — 파워는 7개 지표인데 컨택·선구는 2개뿐이라 평가가 거칠었음. 실측으로 변별력을 확인한 지표만 선별해 추가: <b>컨택</b> ← 존내 컨택%(리그 81.2%, "삼진과 별개로 맞히는 힘")·스윗스팟%(hPos 배트중심)·BABIP 추가로 5개 지표. <b>선구</b> ← 존밖 헛스윙%("쫓아가서 헛쳤나" — 체이스의 "쫓아갔나"와 구분)·존내 스윙%(칠 공은 치는 적극성) 추가로 4개. <b>투수 결과</b> ← K/9·피홈런% 추가하고 <b>FIP를 ERA보다 높은 가중치</b>로(수비·운 영향을 덜 받음) 5개. 파울%는 타자별 편차가 20~257%로 표본 변동이 커서 제외.'},
      {icon:'🎯', text:'⭐⭐⭐ <b>투수 제구 평가 — 존인%에서 위치 세분화로</b> — 기존 제구 지표가 <b>존 안 투구 비율</b>이라, <b>한복판에 몰린 공도 "제구 좋음"으로 잡히는</b> 근본 문제가 있었음. 실제로 존인% 상위 팀이 투수 결과는 하위인 역전 현상 발생. → 기존 제구 정밀도 탭의 분류(<code>_precisionClass</code>)를 팀 평가에 도입해 <b>실투(한복판, 감점 0.32) · 보더라인(존 경계, 가점 0.30) · 볼넷(0.26) · 스트라이크 획득(0.12)</b>으로 재구성. "존에 넣었나"가 아니라 <b>"어디에 넣었나"</b>를 보게 되어 변별력 확보. 팀 투수 탭에는 <b>투구 위치 분포 막대</b>(실투/살짝몰림/굿존/보더라인)를 추가해 한눈에 확인 가능.'},
      {icon:'⚖️', text:'⭐⭐ <b>파워·투수구위 평가 — 체격 편중 완화</b> — EV 125 기준(HH+·배럴+)은 키 큰 타자가 아니면 물리적으로 도달이 어려워, 이것만으로 파워를 재면 <b>작은 선수 위주 팀이 구조적으로 불리</b>했음. 실측(키 5cm 구간): 175cm 배럴+ 1.8% vs 190cm 12.4%로 <b>7배 차이</b>, 반면 HH(110+)는 32%→60%로 격차가 완만. → <b>파워</b>를 홈런형(배럴+ 0.22·HH+ 0.16·HR% 0.18)과 장타형(ISO 0.20·배럴% 0.12·HH% 0.07·평균EV 0.05)으로 재구성해 <b>2루타 이상 장타력과 순수 타구속도</b>가 반영되도록 조정. <b>투수 구위</b>도 대칭적으로 피배럴+ 단일 기준에서 피배럴%·피HH%·평균 피EV를 더한 다층 구조로 변경(상대 타자 체격에 따른 편차 완화).'},
      {icon:'🧭', text:'⭐⭐⭐ <b>타구 방향 표기 — 좌측/중앙/우측으로 통일</b> — 기존엔 <code>sdeg</code> 부호만 보고 당김/밀어침을 판정해 <b>좌타자가 정반대로 표기</b>되는 버그가 있었음. 이를 고치면서 당김/밀어침 개념 자체가 좌우 타석에 따라 뒤집혀 <b>혼동을 유발</b>하므로, 전 화면에서 <b>실제 타구가 어느 쪽으로 갔는지</b>만 표기하도록 통일: <b>좌측(LF·3루) / 중앙(CF) / 우측(RF·1루)</b>. 공통 헬퍼 <code>_fieldSide()</code> 하나로 정리(팀 타격 탭, 타구 분석 탭 요약·팀 프로파일 테이블, 스카우팅 리포트, 투구 상세 모달, 스프레이 통계). 수비 배치·상대 분석에는 타석 기준보다 실제 낙구 방향이 직관적이고, 좌우 타자를 섞어 비교할 때도 일관됨. 내보내기 <code>keyFields</code>의 sdeg 설명도 정정.'},
      {icon:'🎯', text:'⭐⭐ <b>스프레이 5등분 존 필터 — 팀·스카우팅으로 확대</b> — 타자 분석에만 있던 <b>전체/내야/외야 + 5등분(우익·우중·중견·좌중·좌익) 비율 오버레이</b>를 공통 함수(<code>_renderSprayField</code>)에 흡수. 팀 타격·팀 투수·스카우팅 리포트 스프레이에서 동일하게 사용 가능 — 상대 타선의 타구 집중 구역을 구역별 %로 즉시 파악.'},
      {icon:'🛡️', text:'⭐⭐ <b>수비수 개인 분석 — 방향별·거리별 상세 신규</b> — <b>방향별 수비</b>: 전진/후퇴/측면 각각의 아웃률·OAA를 <b>리그 동일 포지션 평균과 비교</b>(후퇴 타구는 난이도가 높아 잘 잡으면 고평가). <b>이동거리별 처리</b>: 0~5m/5~10m/10~15m/15~20m/20m+ 구간별 아웃률·OAA 막대. 기존엔 종합 OAA만 보여 "어떤 유형에 강한 수비수인지" 알 수 없던 것을 해소.'},
      {icon:'🔥', text:'⭐⭐ <b>선수 카드 최근 폼(컨디션) 표시</b> — 최근 5경기 성적을 시즌 전체와 비교해 <b>5단계</b>(🔥최상·📈상승·➖보통·📉하락·🧊부진)로 카드에 뱃지 표시. 타자는 타율·장타율·배럴+%·평균EV, 투수는 피안타율·헛스윙%·피배럴+%를 가중 비교. 카드 상세에는 <b>최근 vs 시즌 수치를 나란히</b> 표시. <b>ON/OFF 토글</b>(카드 도구 메뉴 · localStorage 저장) — 캡처하거나 지난 시즌을 볼 때 끌 수 있음. 표본 부족(3경기 미만 등)이면 자동 미표시.'},
      {icon:'📋', text:'⭐⭐ <b>스카우팅 리포트 — 타구 성향 섹션 신규</b> — 기존 9분할 히트맵에 더해 <b>타석 기준 당김 성향 + 실제 좌우 분포 + 5×5 존별 타율 + 낙구 스프레이</b>를 추가. 모두 공통 함수(<code>_renderSprayField</code>/<code>_renderZoneHeat</code>/<code>_zoneCell</code>)를 사용해 <b>화면마다 다르던 히트맵 로직·모양을 통일</b>.'},
      {icon:'🐛', text:'<b>전력 진단서(구) 오류 수정</b> — <code>window._teamScoutCompare</code> 전역이 초기화되지 않은 채 <code>.opponent</code>를 참조해 진단서 진입 시 "Cannot read properties of undefined" 오류가 나던 것 수정. 전역 초기화 추가 + 모든 사용처에 방어 코드 적용. 동일 유형(초기화 없는 전역 프로퍼티 접근) 전수 점검 완료 — 다른 곳엔 없음.'},
      {icon:'⚡', text:'⭐⭐ <b>성능 최적화 — 선수별 풀스캔 제거 + 인덱스 역참조</b> — ① 선수 이름으로 전체 투구 DB를 훑던 <code>G.filter(d=>d.pName===name)</code> 패턴 <b>29곳</b>을 기존 인덱스 캐시(<code>getPitcherDataByName</code>/<code>getBatterDataByName</code>)로 교체 — 선수 100명 순회 기준 실측 <b>약 3배</b> 개선(100ms→34ms). ② 스프레이·타구질 차트가 점마다 호출하던 <code>G.indexOf(d)</code> 선형탐색 <b>6곳</b>을 Map 역참조로 교체 — 1,000개 점 기준 <b>11.8ms→0.15ms(78배)</b>, 점이 많은 화면의 렌더 지연 해소. ③ 팀 탭의 리그 비교 데이터(인플레이·타구품질·타구방향 분포)와 팀별 투구 인덱스, 팀 프로파일을 <b>캐시화</b>하여 탭 전환·팀 변경 시 재계산 제거. ④ 모든 신규 캐시를 <code>_rebuildCaches</code>에 연결해 데이터 변경 시 정확히 무효화(투구수가 같아도 내용이 바뀌는 경우 대응). <br>※ 문자열 누적(<code>+=</code>) → 배열 join 전환은 실측 결과 오히려 <b>8배 느려서</b> 적용하지 않음 — 감이 아닌 측정 기반으로 판단.'},
      {icon:'🏆', text:'⭐⭐⭐ <b>팀 탭 전면 개편 — 서브탭 7개로 확장</b> — 기존 2탭(팀 통계·전력 진단서)에서 <b>📊개요 / 🏏타격 / ⚾투수 / 🛡️수비 / 📈추이·전적 / 📋로스터 / 🏆전력 진단서(구)</b>로 전면 재구성. 기존 진단서는 "(구)"로 <b>그대로 보존</b>. <br><b>개요</b>: 6영역 레이더(컨택·파워·선구·투수결과·투수구위·투수제구)를 리그 백분위로 S~F 등급화, 강점·약점 자동 추출, 핵심 지표 12종 카드. <br><b>타격</b>: 타구 방향 분포(당김/중앙/밀어침, 리그 대비), 타구 품질 6분류 막대, 팀 스프레이 차트, 존별 타율 5×5 히트맵, 타자별 요약표. <br><b>투수</b>: 구종 운용표(구종별 헛스윙%·피EV·피배럴+%), 피타구 품질(투수 관점 색상 반전), 피타구 스프레이, 투구 분포 5×5, 투수별 요약표. <br><b>수비</b>: 팀 OAA 종합(내야/외야 분리), 리그 팀 순위 막대, 포지션별 OAA — <b>OAA는 참고 지표임을 상단에 명시</b>하여 과대 해석 방지. <br><b>추이·전적</b>: 승률 추이 그래프, 경기별 득실 막대(득점 위/실점 아래), 상대별 전적표, 최근 5경기 폼. <br>신규 <code>_computeTeamProfiles()</code> 엔진은 <b>활성 경기 기준</b>(리그전 팀기록 탭과 범위가 다름을 코드·화면에 명시). 모든 시각화는 공통 함수(<code>_renderSprayField</code>/<code>_renderZoneHeat</code>)를 써서 다른 화면과 모양·로직 통일.'},
      {icon:'🧩', text:'⭐ <b>공통 시각화 함수 도입 (내부 구조 개선)</b> — 화면마다 제각각이던 구장/존맵 그리기 로직을 공통화. <code>FIELD</code> 실측 좌표 상수 + <code>_renderSprayField()</code>(구장·낙구·히트맵) + <code>_zoneCell()</code>/<code>_renderZoneHeat()</code>(5×5 존) 신규. 타구 분석 탭과 투구 상세 모달을 이 함수로 교체 — 구장 좌표 중복 정의 3곳 → 1곳으로 축소. 앞으로 추가되는 화면(팀 타구 프로파일·스카우팅 핫콜드존 등)이 전부 같은 로직·같은 모양을 쓰게 되어 통일성 확보.'},
    ]
  },
  {
    version: 'V11.3',
    date: '2026-08',
    title: '⚾ 야수선택(FC) 판정 — 포스아웃 시 안타 제외 + CSV 공식 명세 반영',
    badge: '#39ff8a',
    changes: [
      {icon:'⚾', text:'⭐⭐⭐ <b>야수선택(FC) 판정 신규</b> — 선행주자가 <b>포스아웃</b>되면 타자는 안타가 아님(MLB 공식 기록규칙 10.05(b)(1) "주자가 타구에 의해 포스아웃되면 안타를 인정하지 않는다"). 기존에는 <code>1BSafe=1</code>이면 무조건 안타로 집계돼, <b>1루 주자를 2루에서 포스아웃시키고 타자만 1루에 산 전형적 야수선택이 안타로 잘못 기록</b>되고 있었음. 아웃코드(<code>outNCode</code>)의 방식 비트로 포스아웃을 식별해 제외. <b>타구질·수비 의도·시간과 무관하게 포스아웃이면 무조건 FC</b>(공식 규칙 확인 — 외야 라인드라이브라도, 선택의 여지가 없었어도 FC).'},
      {icon:'🔻', text:'⭐⭐ <b>병살(GIDP/DP) 기록 신규</b> — 한 인플레이 타구로 2아웃 발생 시 병살로 집계. <b>포스아웃이 1개 이상 포함된 경우만 인정</b>(태그만 2개인 경우는 런다운 꼬임으로 두 명이 따로 죽은 상황과 구별 불가하여 제외 — 보수적 설계). <b>삼중살(TP)은 별도 카운트</b>. GIDP=땅볼 병살(result=2), 뜬공+포스 병살(라인드라이브 병살)은 DP로만 집계하고 GIDP에서 제외. 적용: <b>타자 기록실·팀 로스터·리그전 팀기록·리더보드(병살타 적은순)</b>, <b>투수 기록실·팀기록·리더보드(병살 유도 많은순)</b>. 시나리오 시뮬레이션 + <b>논리 일관성 전수검사</b> 통과 — "안타이면서 병살", "아웃이면서 안타", "DP이면서 TP" 같은 모순 상태가 발생하지 않음을 검증(5-4 병살처럼 타자가 1루에 살고 주자 2명이 포스아웃된 경우는 <b>안타 아님 + 야수선택 + 병살</b>로 정확히 분류).'},
      {icon:'🔍', text:'<b>태그아웃은 건드리지 않음 (의도적 보수 설계)</b> — 태그아웃은 "야수선택"과 "안타+주루사"가 섞여 있고, 이를 자동 구별하려면 포구 위치·시각·송구 능력 등 다변수 임계값이 필요해 <b>표본 부족 상태에서 오판 위험</b>이 큼. 실측 검증 결과 현재 로직이 이미 98% 정확해, 확실한 포스아웃만 교정하고 애매한 판정은 유지. (타자가 1루 도달 후 오버런·2루 시도로 태그아웃된 경우는 <b>1루까지는 세이프이므로 안타 유지</b>가 규칙상 정확)'},
      {icon:'📋', text:'<b>구/신 데이터 호환</b> — 아웃코드는 신규 CSV(233컬럼)에만 존재. 구 데이터(118컬럼)는 포스/태그 구분 자체가 기록되지 않아 판별 불가하므로 <b>기존 로직 그대로 유지</b>. 신규 포맷 경기부터 타율·안타·총루타가 정확해짐.'},
      {icon:'📦', text:'<b>내보내기 schema v13</b> — <code>batters[].season.GIDP</code>(병살타), <code>pitchers[].season.GIDPinduced/DPinduced</code>(병살 유도) 추가. 안타 판정에 야수선택 반영이 H/BA/OBP/SLG/TB 등 전 타격 지표에 적용됨을 명시. codeMaps에 <b>outCode 비트필드 해석</b>(야수/베이스/방식)과 fieldersChoice 규칙 추가. glossary에 GIDP·야수선택 정의 추가. appVersion V11.3.'},
      {icon:'🎨', text:'⭐⭐ <b>존 히트맵 색상 가독성 대폭 개선</b> — 팔레트 중간값(0.5)이 <b>거의 흰색</b>이라 평균권 타율 셀이 배경과 구분되지 않던 문제 수정. 중앙을 유채색(회보라)으로 바꾸고 양끝 채도를 높여 <b>어떤 값이든 대비 확보</b>. 셀 텍스트에 어두운 외곽선(paint-order)을 넣어 밝은 배경에서도 읽히게 함. <b>표본 부족 셀(AB&lt;5)은 점선 테두리</b>로 구분. 팀 타격 존맵은 상대 정규화 → <b>절대 기준</b>(다른 존맵과 동일)으로 통일, 팀 투수 존맵은 "투구 밀도" → <b>피안타율</b> 기반으로 교체해 색이 실제 의미를 갖도록 변경(빨강=피안타 높음/위험, 파랑=억제).'},
      {icon:'🏆', text:'⭐⭐ <b>팀 개요 — 종합 등급 카드 신규</b> — 영역별 레이더만으로는 "이 팀이 전체적으로 어느 수준인지" 한눈에 안 들어오던 것 보완. <b>🏏타격 종합</b>(컨택35·파워40·선구25) / <b>⚾투수 종합</b>(구위35·제구25·결과40) / <b>🛡️수비</b>(팀 OAA 백분위) / <b>🏆팀 종합</b>(타격45·투수45·<b>수비10</b>)을 S+~F 등급으로 표시. 수비는 OAA 신뢰도를 감안해 팀 종합에서 <b>10%만</b> 반영하고 그 사실을 화면에 명시.'},
      {icon:'🔍', text:'⭐⭐ <b>투구 상세 모달 전면 재작성</b> — 기존 미니 존맵은 ±1 범위만 그려 <b>존 밖 투구가 잘려 안 보이고</b>, 낙구 미니맵은 호(arc) 2개짜리 약식이라 실제 구장과 달랐음. <b>존맵은 투수 존 차트와 동일 좌표계</b>(±2까지 표시, 3분할 보조선, 홈플레이트)로, <b>낙구맵은 타구 분석 탭과 동일한 실측 FIELD_CONFIG</b>(폴 ±74m·중앙 135m·실측 베이스)로 통일. 목표→실제 연결선으로 제구 편차 시각화, 홈→낙구 궤적선과 비거리 표시, 점 색상은 결과 기반(홈런/안타/아웃 등)으로 통일. <b>배트 접촉 위치(hPos) 바 신규</b> — 손잡이~중심~끝 중 어디에 맞았는지, 스윗스팟 구간(0.35~0.65) 대비 위치를 한눈에. 코스·배트속도·방향각(당김/중앙/밀어침)·타구질도 추가.'},
      {icon:'📋', text:'⭐⭐ <b>타격/투구 로그 대폭 보강</b> — <b>타격 로그</b>: 코스(존안/존밖)·<b>배트중심(hPos)</b>·배트속도·발사각·타구품질 컬럼 신규. hPos는 중심(0.5)에서 벗어난 정도에 따라 색상 구분(중심/약간빗나감/빗맞음) — <b>"중심을 잘 맞춰 좋은 타구였나, 빗맞았는데 파워로 커버했나"</b> 판별 가능. <b>투구 로그</b>: 코스·스윙(노스윙/헛스윙/컨택)·<b>피배트중심</b>·발사각·피타구질 추가(투수 관점이라 타자가 빗맞을수록 초록). 두 로그의 판정 필터도 <b>실제 결과 기준</b>(홈런/안타/아웃/헛스윙/루킹S/파울/볼/사구)으로 교체.'},
      {icon:'🎯', text:'⭐⭐⭐ <b>존 차트 판정코드 → 실제 결과 기반 재설계</b> — 기존엔 원시 판정코드(call)만 써서 <b>Hit에 안타·아웃·파울이 뒤섞이고</b>, Swing은 <b>볼에 헛스윙한 것만</b> 잡히고(존 안 헛스윙은 Strike로 분류됨), Strike는 스윙 여부를 알 수 없는 문제가 있었음. <code>_pitchOutcome()</code> 신규 — 홈런/안타/아웃/헛스윙(bSwing 기반·존 무관)/루킹S/파울/볼/사구로 <b>실제 결과 재분류</b>. 존 차트 모양·색상·범례 전면 교체(홈런=별, 안타=삼각, 아웃=원, 헛스윙=사각, 파울/볼=다이아, 사구=X). 필터도 결과 기준 — <b>"홈런 맞은 공은 어디에 던졌나", "헛스윙 유도한 코스", "아웃 잡은 공"</b> 조회 가능. 색상 모드(구종별/결과별) 전환 추가.'},
      {icon:'📊', text:'⭐⭐ <b>5×5 존 맵 지표 확장</b> — <b>투수 제구 정밀도</b>에 평균LA·HH%·HH+%·배럴%·배럴+% 추가. <b>타자 핫/콜드존</b>에 평균LA·HH%·HH+%·배럴%·배럴+%·OPS 추가. 코스별 타구질 직접 비교 — 어느 존에서 배럴이 나오고 어느 존에서 땅볼만 나오는지 확인 가능.'},
      {icon:'🐛', text:'⭐⭐ <b>batType 번트 오판정 버그픽스</b> — 공식 GameStatsRecorder 명세 확인 결과 <code>batType=1</code>은 번트가 아니라 <b>Forced(강력충돌)</b>였음. 타구질 차트·타구분석맵 등 5곳에서 batType=1을 번트로 오인해 <b>강타를 통계에서 제외</b>하고 있던 것을 정확한 번트 판정(<code>buntGrip>=0.7</code>)으로 통일.'},
      {icon:'📦', text:'<b>codeMaps 정정</b> — batType 정의를 공식 7종(Normal/Forced/Physics/PhysicsAdjust/ForcedAssist/Sweep/PC Batting)으로 수정하고, 번트는 buntGrip 기반임을 명시. OutCode 비트필드 해석(야수/베이스/방식) 추가.'}
    ]
  },
  {
    version: 'V11.2',
    date: '2026-07',
    title: '🎯 HH+/배럴+ 신규 지표 · 타구 품질 6분류 · 타구 분석 탭 · 능력치 개편',
    badge: '#ff2020',
    changes: [
      {icon:'📊', text:'⭐⭐ <b>구종 관련 화면에 발사각·HH+·배럴+ 확대</b> — (1) 투수 구종 그룹별 핵심지표에 <b>피LA·피HH+%·피배럴+%</b> 추가. (2) 구종 분석 투수별 랭킹에 <b>HH+%·배럴+%·피LA</b> 추가. (3) 타자 구종별 대응 성적에 <b>배럴%·HH+%·배럴+%</b> 추가 (기존 HH%만 있던 것 확대).'},
      {icon:'📦', text:'<b>내보내기 schema v11</b> — batters[].season.battedBall에 hhPlusPct/barrelPlusPct/quality(6분류) 추가. 구종 groups·playersByGroup에 avgLA/hhPlusPct/barrelPlusPct 추가. glossary에 HH+/배럴+/타구품질 정의 추가. appVersion V11.2.'},
      {icon:'📱', text:'<b>모바일 대응 최신화</b> — 타구 분석 탭 필터바(버튼·셀렉트 축소·줄바꿈)·요약바·품질 분포 막대 모바일 CSS 추가. 품질 반원 차트·구장 SVG는 width:100% viewBox라 자동 반응형.'},
      {icon:'🐛', text:'⭐⭐ <b>batType 번트 오판정 버그픽스 (공식 CSV 명세 기준)</b> — 공식 GameStatsRecorder 명세 확인 결과 <code>batType=1</code>은 번트가 아니라 <b>Forced(강력충돌)</b>였음. 타구질 차트·타구분석맵 등 5곳에서 batType=1을 번트로 오인해 <b>강타를 제외</b>하고 있던 것을 정확한 번트 판정(<code>buntGrip>=0.7</code>)으로 통일. codeMaps의 batType 정의도 공식 7종(Normal/Forced/Physics/PhysicsAdjust/ForcedAssist/Sweep/PC)으로 정정.'},
      {icon:'🐛', text:'⭐⭐ <b>존 분석 핫/콜드존 장타율 버그픽스</b> — 사용자 발견: 존별 히트맵의 SLG(장타율)가 2·3루타를 전부 1루타로 계산하는 옛날 방식이었음(안타=+1, 홈런만 +4). 카드·기록실은 이미 추정베이스(<code>_hitBase</code>) 기반이었으나 존맵만 누락. <code>_hitBase</code> 기반 정확한 총루타로 통일 — 갭히터의 존별 장타 능력이 이제 제대로 반영됨.'},
      {icon:'🔥', text:'⭐⭐⭐ <b>HH+/배럴+ 신규 타구질 지표</b> — 기존 HH(110+)/배럴(105+&LA8~32)이 인플레이 45%/22%가 해당돼 변별력이 무뎌진 문제 해결. <b>HH+</b>=EV 125+(WBD 실측: BA .485→.650 점프 지점, 홈런 최소 EV 123). <b>배럴+</b>=EV 125+ & LA 20~40°(실측 BA .918, 리그 홈런 96%가 이 존). 기존 HH/배럴은 유지하고 +로 병행 표기. 적용: 타자/투수 헤더, 일반·리그 기록실, 팀 로스터, 리그 팀기록, 리더보드 전부.'},
      {icon:'📊', text:'⭐⭐ <b>타구 품질 6분류 (Statcast 스타일 · WBD 실측 보정)</b> — 배럴+(BA.918/10.1%)·솔리드(.620)·플레어버너(.547)·톱드(.248/39.9%)·언더(.225)·위크(.298). 리그전 1,810 인플레이로 경계 검증, BA가 위→아래 깨끗이 계층화. 타자/투수 상세에 <b>반원 극좌표 차트</b>(각도=LA, 반지름=EV) + 리그 평균 대비 분포 막대. 투수는 색상 방향 반전(허용 낮을수록 초록).'},
      {icon:'🗺️', text:'⭐⭐ <b>타구 분석 탭 신규</b> — 도구 메뉴. 리그 전체 낙구(lx/lz) 히트맵으로 메타 확인. 필터: <b>팀(공격)·기간(전체/최근20/10/5)·궤적(땅볼/라인드/뜬공/팝업)·품질(HH/HH+/배럴+)·결과(안타/아웃/홈런)·표시(점/히트맵/점+히트맵)</b>. 팀별 타구 프로파일 비교 테이블(당김/중앙/밀어침%·배럴+%). 수비 배치·상대 분석 도구로 활용.'},
      {icon:'⚾', text:'<b>타자/투수 헤더에 HR% 추가</b> — 타구당 홈런 비율(타자)·타구당 홈런 허용(투수). 기록실 4위치(일반/리그 기록실·팀 로스터)에도 HR%·배럴%·HH+%·배럴+% 컬럼 전면 통일.'},
      {icon:'🏟️', text:'<b>구장 좌표 실측 반영</b> — 스프레이/타구 분석 구장을 실측 FIELD_CONFIG로 통일(폴 ±74m, 좌우중간 ±54.74/−117.5, 중앙 135m, 실측 베이스·마운드). 타구 분석은 홈플레이트를 하단에 배치(표준 방향)하고 크기 축소로 한 화면에 정리.'},
      {icon:'⚡', text:'⭐⭐ <b>투타 능력치 산정식 개편</b> — <b>PWR</b>: HR%×4.5 + 키보정배럴+%×1.5 + 배럴%×1.0 + <b>ISO×30</b>(추정 2·3루타 드디어 반영). <b>GAP</b>: 키보정EV×1.5 + 키보정HH+%×1.0 + HH%×0.8(상위 변별 강화). <b>투수 구위(DOM)</b>: 피배럴+% 억제 항 신규((9.6−피배럴+%)×1.0, 홈런 96% 치명존). 키 상대화 HH+/배럴+(EV≥키캡−5)로 작은 타자 시스템 차별 제거. 30G 96타자 실측으로 pw() 재보정 — 리그 평균 등급 보존(PWR p50 89·GAP p50 89 유지).'},
    ]
  },
  {
    version: 'V11.1',
    date: '2026-07',
    title: '🎯 파울 오염 대수술 — 타구질 지표 전면 교정 + 305경기 임계값 재보정',
    badge: '#ff4560',
    changes: [
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 파울이 타구질 지표에 섞이던 버그 전면 수정</b> — 사용자 발견: WBD에서 파울은 <code>result=3 + ev>0</code>으로 기록되는데, 코드 전반이 <code>ev>0</code>만으로 타구를 판정해 <b>전체 타구의 20.2%인 파울</b>이 EV·발사각·HH%·배럴·타구수 집계에 포함됨. <code>_isInPlay</code>(ev>0 && result≠3) 헬퍼 신설 후 100곳 교체 — 타자/투수 분석, 발사각·방향각 차트, 기록실 평균EV, 카드 계산, 구종분석, 스카우트 리포트, 존9·존 히트맵, <b>팀 전력 진단서</b>, 좌우/카운트 스플릿, 리더보드, 클러치, 내보내기 전부. 존 히트맵 하드힛·배럴은 ev만 보고 세서 파울 강타까지 포함되던 것도 함께 수정. <b>리그 평균 발사각 19.1° → 7.8°</b> (파울 팝업이 +11° 왜곡), 배럴% 13.7 → 15.4. 스윙/컨택 판정(파울=컨택 정상), 스프레이 파울 표시, 안타 판정은 의도대로 유지.'},
      {icon:'📐', text:'⭐⭐ <b>임계값 전면 재보정 — 305경기 인플레이 실측</b> — 파울 제외로 분포가 이동한 모든 기준을 WBD 전체 데이터로 재산출. 투수 카드 구위(피EV p50=100.5, 배럴 앵커 15.9%, 피안타 인플레이 .455 / AB기반 .382, 피홈런 4.3%), 타자 카드 GAP/PWR 점수창 평행이동(평균 등급 보존), 스카우트 리포트 기준(피HH% p10=32/p25=36/p50=39, 피홈런 p75=4.9/p90=6.4, 구종별 피안타 경고 .585, 2아웃 피안타 .430+0.08), 폼/슬럼프 백분위(투수 82명 기준) 전부 교체.'},
      {icon:'🌀', text:'<b>발전방향 자이로 문구 교정</b> — "자이로 낮을수록 무브 큼" → 변화구 15,559구 실측 결과 자이로↔무브 상관 +0.24(전 구종 양의 상관, 0~4° 417cm vs 18°+ 539cm)로 반대였음. 실측 방향으로 수정 (구변 카드의 자이로 양수 보너스 계산식은 원래 정합).'},
      {icon:'📊', text:'⭐ <b>기록실·팀기록·로스터에 타구질 컬럼 신규</b> — 타자: 평균EV·HH%·평균발사각(LA), 투수: 피EV·피HH%·피LA를 <b>투타 모두</b> 추가. 적용 위치: 독립 기록실, 리그허브 기록실, 팀 기록(타격/투수 탭 — 선수 가중 합산), 순위표·팀기록 로스터 펼침. 전부 인플레이 기준(파울 제외)이며 헤더 클릭 정렬 지원 (투수 지표는 낮을수록 상위).'},
      {icon:'🎲', text:'⭐ <b>매치업 시뮬 확률 스케일 통일</b> — 인플레이 비율과 타율(AB 스케일)이 혼용되던 확률 계산을 <code>_isABPitch</code>(안타+인플레이아웃+K) 기반 AB 스케일로 통일. 리그 회귀 앵커를 실측값(타율 .382, HR 3.37%)으로 교체.'},
      {icon:'⚾', text:'<b>승리투수 판정 재정밀화</b> — 결승점 시점까지 등판한(투구 인덱스 기준) 승팀 투수 중 마지막이 승리. 결승점 이후 등판 투수는 세이브/홀드 후보로만. 선발 5이닝(15아웃) 미만 시 차순위 투수에게 이양.'}
    ]
  },
  {
    version: 'V11.0',
    date: '2026-06',
    title: '🏆 리그전 전용 허브 신규 — 순위·리더보드·기록실·팀기록·로고',
    badge: '#ffd700',
    changes: [
      {icon:'⚾', text:'⭐⭐ <b>투수 결과기록 신규 — 승·패·세이브·홀드·QS·QS+</b> — 게임별 투수 등판·점수·이닝을 추적해 자동 판정(투구 순서 기반). 기록실·리더보드·투수분석·내보내기 전체 적용. QS=선발 6이닝+ 3실점↓, QS+=7이닝+ 3실점↓.'},
      {icon:'🏆', text:'⭐⭐ <b>리그전 전용 허브 신규</b> — 메인 메뉴 독립 버튼. 정규시즌 해당 시즌 데이터만 자동 수집. 4개 탭(순위·리더보드·기록실·팀기록). 운영자가 <code>WBD_CURRENT_SEASON</code> 한 줄로 기본 시즌 지정.'},
      {icon:'📋', text:'<b>팀 순위표</b> — 승·패·무·승률·게임차·득실차. 팀 클릭 시 로스터 펼침. 팀명 오타 자동 병합(편집거리 1).'},
      {icon:'🏅', text:'<b>리더보드 26종</b> — 투타 합산 WAR + 타격/투수 비율(규정충족자)·누적(전원) 분리. 타율·OPS·wOBA·wRC+·ISO·BABIP·ERA·FIP·WHIP·K/9·K%·K/BB 등.'},
      {icon:'📚', text:'<b>기록실</b> — 타자 20컬럼·투수 17컬럼. 헤더 클릭 정렬. 규정미달 표시(흐리게)+제외 토글. 규정타석/이닝은 팀 경기수 기반 동적(×2.8/×1.8).'},
      {icon:'👥', text:'<b>팀 기록실</b> — 15컬럼(타율·출루·장타·OPS·ERA·FIP·WHIP·WAR 등). 리그전 출전 팀만. 정렬 가능.'},
      {icon:'🎨', text:'<b>팀 로고 시스템</b> — GitHub <code>data/logos/팀명.png</code> 자동 로드 + 직접 업로드 + 첫글자 폴백. 순위표·기록실·리더보드에 표시.'},
      {icon:'🔧', text:'⭐ <b>끝내기 안타/홈런 버그 수정</b> — 경기 종료로 미기록된 득점을 결과 기반 보정. 경기결과·투수 실점 정상화.'},
      {icon:'⚾', text:'<b>야구식 이닝 표기</b> — 7.667 → 7.2 (7과 2/3). 선수→팀 매핑을 해당 시즌 출전 기준으로(전체 활성 데이터 아님). 포스트시즌 분리 뷰·시즌 비교.'},
      {icon:'🔧', text:'<b>끝내기 득점·승패 판정 수정</b> — 끝내기 안타/홈런으로 미기록된 득점 보정(경기결과·투수 실점). 승/세이브 판정을 투구 순서 기반으로 정확화.'},
      {icon:'⚾', text:'⭐ <b>투수 이닝 계산 버그 수정</b> — 2아웃 상황에서 안타 후 주루사·견제사로 끝난 이닝을 끝내기로 오인해 이닝이 초과되던 문제 해결(예: 완투 9.1→9.0). 끝내기 판정을 이닝 단위가 아닌 경기 마지막 투구 기준으로 정확화.'},
      {icon:'📊', text:'<b>기록실 정렬 개선</b> — 누적 스탯(승·세이브·홈런 등) 정렬 시 규정 구분 없이 순수 값순, 비율 스탯은 규정충족 우선. 규정미달 표시+제외 토글.'},
      {icon:'📦', text:'<b>내보내기 schema v10</b> — <code>pitchers[i].season.advanced</code>에 결과기록 <code>{W, L, SV, HLD, QS, QSplus}</code> 추가. appVersion V11.0.'},
      {icon:'🔗', text:'⭐ <b>선수 동일인 병합 신규</b> — 닉네임·계정 변경으로 이름이 다른 동일 인물을 최신 닉네임으로 통합(기록 합산). 프로필 관리 페이지의 <b>선수명 병합</b> 탭에서 추가·해제. 운영자 사전 설정(냥코·오띵/낑깡·아이쿤) + 유저 직접 등록 지원.'},
      {icon:'👤', text:'<b>선수 인덱스 27명 추가</b> + <b>프로필 관리 페이지 개편</b> — 프로필 사진 매핑과 선수명 병합을 한 페이지 탭으로 통합.'},
      {icon:'📊', text:'⭐ <b>WAR 통일</b> — 누적 스탯인 WAR에 걸려 있던 최소 타석/이닝 컷 제거(PA·투구 1 이상이면 실제 값 반환), 화면별 0.0 불일치 해결. 표시 소수점을 전 화면 둘째 자리(0.00)로 통일 (WAR144 제외).'},
      {icon:'🧢', text:'<b>기록실·리더보드·로스터 포지션 표시 + 포지션/팀 필터</b> — 주 포지션 산정에서 DH를 다른 포지션과 동등하게 최다 이닝 경쟁(MLB 관례). 타자 기록실에 포지션 버튼 필터·팀 select 필터 추가.'},
      {icon:'👥', text:'<b>팀 기록실 투/타 분리</b> — 타격(타율·출루·장타·OPS·ISO·BB%·K%·wOBA·wRC+·oWAR)/투수(ERA·FIP·WHIP·K/9·BB/9·K/BB·pWAR) 서브탭. wRC+·wOBA는 PA 가중 평균(합산 불가 지표).'},
      {icon:'🪪', text:'<b>리더보드·기록실 이름 클릭 → 선수 카드 모달</b> — 리그전 허브 어디서든 이름 클릭으로 카드 상세 열람.'},
      {icon:'🔧', text:'<b>팀 전력 진단서 정합성 수정</b> — AB/안타/HR 집계를 기록실과 동일 정의로 통일(타율 불일치 해결), 표본 컷 완화(1경기 팀도 순위·백분위 포함), 리그 순위 표시 +1 누락 버그 수정(2위가 1위로 뜨던 문제).'}
    ]
  },
  {
    version: 'V10.3',
    date: '2026-06',
    title: '🎯 평가 모델 고도화 — xPV 실측 재산출 · 수비 방향 · 무브먼트 재설계',
    badge: '#ffd700',
    changes: [
      {icon:'🐛', text:'⭐ <b>(FIX) 키별 타격 성적 타수 오집계</b> — 사용자 발견: 4타수 3안타인데 5타수로 표시. 원인: 타수를 "인플레이 타구(ev>0)면 무조건"으로 세서 파울(ev>0이지만 타석 진행중)까지 타수로 잡힘. 타석 종료 판정 + 볼넷·사구 제외로 수정. 안타도 낫아웃 출루 제외 통일 (검증: 한 타자 59→54타수, 파울 15개 정확히 제외)'},
      {icon:'🎯', text:'⭐⭐⭐ <b>xPV 전면 재산출 (WBD 266경기 실측)</b> — 기대 구종가치를 MLB 격자+임의보정에서 WBD 실데이터로 교체. 인플레이 격자(EV×발사각) 재산출 + 카운트/삼진/볼넷 가치(COUNT_RE) 실측 통일 + 임의값(1.7배·zero-center·MLB결합) 전부 제거. 이제 "WBD 환경 투구당 실제 득점가치"로 일관'},
      {icon:'🛡️', text:'⭐⭐ <b>수비 OAA v5 — 포구 방향(전진/후퇴/측면)</b> — 외야 플라이 난이도가 방향에 크게 좌우(전진 아웃률 59% vs 후퇴 23%). 시작점→포구점 벡터로 방향 판정 후 요구속도 커브를 방향별 분리 학습. 예측-실제 1%p 이내, zero-sum 유지'},
      {icon:'🎯', text:'⭐⭐ <b>무브먼트 평가 재설계</b> — 구종별 절대평가(같은 구종끼리 백분위) → 주력+위력 가중 합산 + 결정구 보너스 + 원툴 방지. 구종분석 랭킹과 모수 통일(투수 평균무브 기준). 음수좌표 백분위 버그 수정'},
      {icon:'📊', text:'⭐ <b>구종분석 기본정렬 = 구종의 질(xPV+/100)</b> — 투구수순 → 좋은 공 순으로'},
      {icon:'🧬', text:'⭐⭐ <b>분석 내보내기 강화 (schema v9)</b> — league(리그 기준선)·glossary(지표 사전)·players[].splits(상황 분할: 좌우/구종/카운트/존9) 추가. AI 분석 최적화'},
      {icon:'⚖️', text:'⭐⭐ <b>투수 pWAR FIP→실점(RA9) 기반 교체</b> — WBD는 BB 희귀해 FIP 변별력 낮음. 호투/망경기도 실점 기반으로'},
      {icon:'🔍', text:'⭐⭐ <b>데이터 일관성 전수 점검</b> — 기록실↔분석 불일치 0 (이닝 정밀화·낫아웃 안타 오집계·타석경계 수정). 내보내기 어워드 WAR 기반 교정, 팀명 자동병합 강화, 타자 카드 클릭 크래시 수정'},
    ]
  },
  {
    version: 'V10.2',
    date: '2026-06',
    title: '☁️ GitHub 서버 데이터 자동 로드 + 📂 카테고리/시즌 스코프 시스템',
    badge: '#88ccff',
    changes: [
      {icon:'🛡️', text:'⭐⭐ <b>수비 OAA v5 — 포구 방향(전진/후퇴/측면) 추가</b> — 외야 플라이 잡기 난이도가 요구속도뿐 아니라 "앞으로 오는 타구냐 뒤로 가는 타구냐"에 크게 좌우됨(실측: 전진 아웃률 59% vs 후퇴 23%, 36%p 차). 수비수 시작점→포구점 벡터의 전후 성분으로 방향 판정 후, 외야 플라이 요구속도 커브를 방향별로 분리 학습. 검증(266경기): 방향별 예측 아웃률이 실제와 1%p 이내 일치, zero-sum 유지. 같은 요구속도라도 "앞으로 오는 어려운 타구를 잡으면 +OAA"로 정확히 평가'},
      {icon:'🎯', text:'⭐⭐ <b>xPV 전면 재산출 — WBD 266경기 실측 기반</b> — 기대 구종가치(xPV) 계산을 MLB 격자 + 임의 보정에서 WBD 실데이터로 전면 교체. ① 인플레이 타구 격자(EV×발사각→득점가치)를 WBD 266경기(인플레이 2만개)로 재산출 — 타고 리그라 잘 맞은 타구(배럴)가 MLB 대비 2배 이상 위험하게 반영 ② 카운트·삼진·볼넷 가치(COUNT_RE)도 WBD 실측 run expectancy로 통일 ③ 기존 임의값(1.7배 강화·-0.0594 zero-center·"MLB 표준 결합") 전부 제거. 이제 xPV가 "WBD 환경에서 투구당 실제 득점가치"라는 일관된 의미. 효과: 삼진 과대평가 해소(아리알 등 인플레이 억제형 투수 재평가), 구종분석 기본정렬도 이 xPV 기반'},
      {icon:'📊', text:'⭐ <b>구종분석 기본 정렬 = 구종의 질(xPV+/100)</b> — 기존엔 투구수(usage)순이라 "많이 던진 구종"이 위로 왔는데, 이제 "좋은 구종"순으로. xPV+/100은 타구질 기반 기대 구종가치를 리그평균=100 대비로 본 값이라 운(BABIP)을 배제한 순수한 구종의 질을 반영. 헤더 클릭으로 다른 기준 정렬은 그대로'},
      {icon:'☁️', text:'⭐⭐⭐ <b>(NEW) GitHub 서버 CSV 자동 로드</b> — GitHub 저장소 <code>data/league/시즌명/</code> 등 폴더에 CSV를 넣으면 GitHub Actions가 manifest를 자동 생성하고, 사이트 접속 시 <b>전체 경기를 자동으로 불러옵니다</b>. 더 이상 매번 파일 업로드 불필요. 병렬 다운로드(동시 8) + 번들 묶음 파일로 로딩 속도 최적화'},
      {icon:'📂', text:'⭐⭐⭐ <b>(NEW) 카테고리/그룹 스코프 시스템</b> — 리그전/일반 스크림/독립팀/이벤트리그/기타 카테고리와 시즌 그룹별로 데이터를 관리. 대시보드에서 카테고리·그룹·기간(최근 N일) 필터로 원하는 범위만 활성화해서 분석 가능'},
      {icon:'📊', text:'⭐⭐ <b>경기 목록 메타 표시</b> — 각 경기에 출처(서버/로컬)·카테고리·그룹 배지 표시. 서버 경기와 직접 올린 경기를 한눈에 구분'},
      {icon:'🎚️', text:'⭐⭐ <b>무브먼트 grade 분포 재보정 — "전체적으로 낮은" 문제 해결</b> — 사용자 발견: 무브 점수가 전반적으로 짜게 나옴. 원인: grade를 "투구 단위 리그 분포" 백분위로 매기니 평균이 44%로 깔림(무브 큰 변화구는 소수 투수만 던져서). → grade를 "전체 투수 집단 내 상대 순위"로 재보정. 결과: 평균 46.8→49.3(정중앙), 범위 30~60→20~80(풀스케일 활용), 엘리트~하위 변별 정상화'},
      {icon:'🐛', text:'⭐⭐ <b>선수평가 무브먼트(Movement) 백분위 버그 수정</b> — 사용자 발견: "리그 백분위 평균 -130%" 같은 불가능한 값. 원인 2가지: ① 무브를 sH+sV로 계산해 방향에 따라 음수가 나오면 백분위가 음수로 깨짐 → 절대값(|sH|+|sV|, 방향 무관 이동량)으로 수정 ② P75 위쪽 구간에 잘못된 분모(P75−평균)를 써서 점수를 과하게 깎던 보간 버그 → 실제 리그 분포 대비 정직한 백분위로 교체. 결과: 28명 전원 0~100 범위 정상화, 평균 grade 46.8(정중앙)로 "짜게 주던" 문제도 해소'},
      {icon:'🧬', text:'⭐⭐⭐ <b>분석 데이터 내보내기 대폭 강화 (schema v9) — AI 분석 최적화</b> — 기존 구조 100% 유지하며 3종 추가: ① <b>league</b> 리그 기준선(lgRA9/RPW/wOBA + 타격·투수 부문 평균) — AI가 개별 선수를 리그 평균 대비로 해석 ② <b>glossary</b> 지표 사전 — 모든 커스텀/세이버 지표의 정의·방향·산식 ③ <b>players[].splits</b> 상황별 분할 — vs좌/우(상대 좌우 핸드), 구종그룹별(성적+구사율+평균구속), 카운트별(유리/불리), 존 3x3 격자. "2스트라이크 이후 헛스윙 급증" 같은 실전 공략을 AI가 직접 도출 가능. 원시 투구로그도 유지'},
      {icon:'🐛', text:'⭐⭐⭐ <b>타자 카드 클릭 크래시 수정</b> — 카드 뒷면 렌더(buildCardBack)가 _getBatterSeason에 없는 필드(ops, 1·2·3루타)를 참조해 toFixed undefined 에러로 카드가 안 열리던 문제 해결. 누락 필드(ops·h1B/h2B/h3B)를 보강하고, 1·2·3루타는 기록실 베이스 추적 정밀값과 연동'},
      {icon:'🔗', text:'⭐⭐ <b>팀명 자동 병합 강화 + wOBA왕 기준 통일</b> — ① 별칭 매칭이 대소문자/공백 무시로: "PNA → Purple Neon Apex" 한 번 등록이면 Pna/pna까지 전부 병합 ② 별칭 등록 없이도 대소문자만 다른 표기(Pna/PNA 공존)는 최다 등장 표기로 자동 통일 ③ 파일명에서 섞여 들어온 경기 차수 접미사 자동 제거 ("TWP Final #1"→"TWP", "GE Match2"→"GE") — 팀 기록·teamReports·팀 WAR 합산 갈라짐 방지 ④ 내보내기 wOBA왕을 기록실(advanced) wOBA 기준으로 통일'},
      {icon:'🏆', text:'⭐⭐ <b>내보내기 어워드 WAR 기반 교정 + 문구 갱신</b> — 내보내기(awards)의 MVP/사이영/종합MVP가 OVR 정렬 1위를 그대로 쓰고 자격 요건도 무시하던 문제 수정 (3이닝 투수가 사이영으로 잡히던 사례). 이제 앱 내 어워드 페이지와 동일: MVP=oWAR 1위(AB≥20), CyYoung=pWAR(실점 기반) 1위(투구≥50), 종합MVP=투타 합산 WAR 1위. OVR top10은 참고 필드로 유지. schemaChanges의 "pWAR(FIP 기반)" 잔존 문구도 RA9 기반으로 갱신'},
      {icon:'🎯', text:'⭐⭐ <b>호투/망경기 판정 교체: 피안타율 → 게임별 실점 효율(RA9)</b> — 기존 게임 BA 기준(.280/.420)은 안타를 산발로 막은 0실점 경기를 망경기로, 적게 맞고 몰아서 실점한 경기를 호투로 오판. 이제 게임별 정밀 실점/이닝으로 판정: 리그 RA9의 절반 이하=호투, 1.8배 이상=망경기 (최소 2이닝 등판만). pWAR 실점 기반 전환과 철학 일관. 기복(σ) 지표는 등판 간 일관성 측정용으로 유지'},
      {icon:'⚖️', text:'⭐⭐⭐ <b>투수 pWAR 산식 교체: FIP 기반 → 실점(RA9) 기반 (bWAR 방식)</b> — way 13경기 + 리그전 63경기 실데이터 검증 결과: WBD는 BB%≈1.5%(MLB의 1/6)로 FIP의 볼넷 항이 사실상 무력하고 K 분포도 좁아, FIP가 홈런 1~2개 노이즈로 결정되는 구조였음 (ERA 9점대 투수가 2점대 투수보다 fWAR이 높은 역전 발생, ERA↔WAR 상관 -0.63). 컨택 위주 리그 특성상 인플레이 억제가 핵심 스킬이므로 실점 기반 채택 (상관 -0.91로 개선). 리더보드·헤더·카드 WAR 자동 동기. FIP/FIP- 컬럼은 참고 지표로 유지'},
      {icon:'🔍', text:'⭐⭐⭐ <b>데이터 일관성 전수 점검 — 기록실 ↔ 투수/타자분석 완전 일치</b> — 타자 94명×5지표, 투수 57명×6지표 자동 대조로 3가지 불일치 원인을 찾아 수정: ① 기록실 이닝이 타석결과 추정(병살 등 누락, 16.0)이었던 것을 투수분석과 같은 정밀 아웃카운트 추적(20.1)으로 통일 — ERA·FIP·K/9·pWAR 분모도 함께 정확해짐 ② 낫아웃 출루(삼진+1루 세이프)를 안타로 잘못 카운트하던 5곳 수정 ③ 타석 종료 판정에 게임 경계와 확정 이벤트(HR/BB/HBP) 보강. 이제 어느 화면에서 봐도 같은 선수는 같은 기록'},
      {icon:'📅', text:'⭐⭐ <b>날짜 구간 필터</b> — 데이터 범위 바에서 원하는 기간을 직접 지정해 분석: 시작일~종료일 달력 입력 + 기간 프리셋(최근 1/2/3/6개월·전체). 서버 자동 전체 로드 시에는 최근 3개월 경기만 초기 활성화되어 대용량에서도 첫 화면이 가볍습니다 (전체 보기는 📅 기간 ▾ → 전체 기간)'},
      {icon:'⚡', text:'⭐⭐⭐ <b>성능 최적화 — 대용량(370경기+)에서도 쾌적하게</b> — 실측(372경기/71,322투구): 전체 로드 17.2초→7초, 기록실 첫 진입 2.3초→1.1초, 홈 화면 갱신(토글) 5초→1초. 핵심 수술: 선수 팀 판정 풀스캔→캐시(54곳 가속), OAA enriched의 Object.create 딕셔너리모드 제거, 기록실·이닝점수·통계카드 단일패스화, 홈 로스터 풀스캔→인덱스, 타임라인 O(n²) 제거+도트 샘플링, 프로필 사진 lazy. <b>화면 멈춤(프리즈) 원천 차단</b>: ① 앱 전역 63곳의 선수별 전체 DB 풀스캔(리더보드·어워드·카드·구종 등)을 인덱스 캐시로 일괄 교체 ② 구종 분석 1패스 분류+메모이즈 ③ 모든 페이지 전환에 비동기 게이트 — 클릭 반응은 즉시(10ms 미만), 무거운 렌더는 다음 프레임에 "불러오는 중" 배지와 함께 처리 ④ 로드 직후 유휴 시간에 기록실·수비·리더보드·구종 캐시 사전 워밍. 모든 수치 결과 변경 전과 동일 검증 완료'},
      {icon:'🧹', text:'⭐⭐ <b>코드 정리 + 홈 UI 컴팩트 재설계</b> — 중복 정의 함수 84개 제거(28,500→27,500줄). 데이터 컨트롤 센터를 ☁ 데이터 범위 슬림 바로 재설계: 거대 KPI 카드 5개 → 헤더 한 줄 요약, 그룹별 한 줄 행(체크+미니바+카운트) + 정규/포스트시즌 인라인 칩. 경기 카드의 중복 메타 표기 제거, 그룹 미니 배지로 통일'},
      {icon:'🔧', text:'⭐ <b>인프라</b> — GitHub Actions 워크플로(data 폴더 변경 시 manifest 자동 갱신), 번들 생성 스크립트, GitHub Pages 배포 구조'},
    ]
  },
  {
    version: 'V10.1',
    date: '2026-05',
    title: '👤 WBD 공식 프로필 사진 + 📋 경기 로그(문자중계) + 🔁 중복 게임 자동 정리 + ⚖️ 좌/우 스플릿 대폭 보강 + 🐛 다수 버그픽스',
    badge: '#88ccff',
    changes: [
      {icon:'🛡️', text:'⭐⭐⭐ <b>수비 OAA v4 — 요구속도 연속 커브 모델</b> — Statcast catch probability 방식으로 전면 재설계. 기존 v3의 수백 개 빈 + 4단계 폴백을 <b>그룹별 커브 3개</b>로 교체: 외야 플라이는 요구속도 v=이동거리/가용시간(hSec→cSec) 단일 변수 (리그전 63게임 실측: v 0→5에서 아웃률 83%→25% 단조 감소 검증), 외야 라이너(la&lt;10°)와 내야는 거리 커브. <b>zero-sum 캘리브레이션</b>으로 리그 전체 OAA 합=0 보장. 데이터 늘수록 커브가 자동 정교화 — 수동 재보정 불필요'},
      {icon:'📚', text:'⭐⭐⭐ <b>(NEW) 기록실 페이지</b> — 스탯티즈 스타일 풀 기록 테이블. 타자 28컬럼(1/2/3루타·루타·wOBA·wRC+·wRAA·oWAR·BABIP·K%·BB% 등) / 투수 23컬럼(FIP·FIP-·WHIP·K/BB·pWAR·피OPS 등). 모든 컬럼 헤더 클릭 정렬, 팀·최소표본·이름 필터, 선수명 클릭 시 카드 상세'},
      {icon:'⚾', text:'⭐⭐⭐ <b>(NEW) 안타 1/2/3루타 분류 — 베이스 추적 방식</b> — 안타 직후 다음 타석의 베이스 선수ID에서 "새로 등장한 ID = 방금 친 타자"로 도달 베이스 확정 (확정률 ~84%, 나머지는 타구거리 90m 임계 추정). <b>SLG가 진짜 장타율로 전면 교체</b> (기존 5곳의 1루타+HR 근사식 폐기). 타자 헤더에 1·2·3루타/OPS/ISO/BABIP 표시 추가'},
      {icon:'📐', text:'⭐⭐⭐ <b>(NEW) 세이버메트릭스 — wOBA / wRC+ / FIP / WAR</b> — 전부 <b>WBD 리그 자체 환경 보정</b> (MLB 상수 미사용): 리그 총 득점·타석·이닝을 실데이터에서 산출. wRC+/FIP- 리그평균=100. 전역 WAR 기준 = 타자 <b>oWAR</b> / 투수 <b>pWAR</b>. dWAR·종합WAR은 기록실에 [참고]로 병기 (OAA v4 검증 완료 시 메인 승격). <b>WAR144</b>(KBO 144경기 환산, 순위 불변·스케일만 KBO 감각) 추가. <b>기존 calcWAR 전면 교체</b>로 리더보드·헤더·카드 WAR 모두 새 식 통일. 투수 <b>ERA</b>(실점=자책)·야구식 이닝(38.2) 기록실 추가. wRAA·WHIP·K/BB도 추가. 내보내기 schema v8 (<code>season.advanced</code> 블록)'},
      {icon:'🎯', text:'⭐⭐ <b>투수 리포트 코스명 우타 기준 통일</b> — 코스 분포("높은 바깥쪽")와 약점 존 모두 우타 기준 + "(우타 기준)" 명시. 좌타+우타 합산 통계의 모호함 해소. 절대좌표(좌상/우하) 표기 전면 제거'},
      {icon:'👤', text:'⭐⭐⭐ <b>(NEW) WBD 공식 프로필 사진 자동 연동</b> — <code>https://images.vrcbaseball.com/pfp/{인덱스}.png</code> URL로 선수 프로필 자동 표시. <b>기본 매핑 370명 내장</b>(JP/KR/EN 리전 전체). 우선순위: 로컬 PROFILE_MAP &gt; 사용자 커스텀(localStorage) &gt; 기본 매핑 &gt; 실루엣. 이미지 로드 실패시 자동 폴백'},
      {icon:'👤', text:'⭐⭐⭐ <b>(NEW) 프로필 사진 관리 페이지</b> — 메뉴 추가. 5개 통계 카드(전체/사진있음/내가추가/게임출전+사진/게임출전+사진없음), 검색 + 5종 필터(전체/게임출전/사진없음/내가추가/기본), 인덱스 추가/수정/삭제 + 저장 전 미리보기. 커스텀 매핑 JSON 백업/복원 지원'},
      {icon:'📋', text:'⭐⭐⭐ <b>(NEW) 경기 로그(문자중계) — 박스스코어 토글</b> — 박스스코어 모달에 <b>"📋 경기 로그 보기"</b> 버튼 추가. 클릭 시 1회초부터 시간순으로 모든 타석 표시: 이닝 헤더(어느 팀 공격) → 타석 헤더(타자/투수/주자 다이아몬드/아웃수/주자상황) → 투구별(구종·구속·판정·스윙여부·EV·발사각·카운트) → 타석 결과(이모지 + 점수변동). <b>이닝 셀렉터</b>로 특정 회만 골라보기 가능'},
      {icon:'🔄', text:'⭐⭐⭐ <b>(NEW) 투수/타자/수비 교체 자동 감지</b> — 경기 로그에서 교체 발생 시 강조 알림. 🔄 투수 교체(주황) / 🔁 대타·라인업 교체(보라) / 🧤 수비 교체(파랑). 같은 타석에 여러 교체 동시 발생도 모두 표시 (예: 투수+1루수 동시 = 투수-야수 스위치, 큰 라인업 변동 4명 동시 교체)'},
      {icon:'🔁', text:'⭐⭐⭐ <b>(NEW) 중복 게임 자동 정리</b> — CSV 콘텐츠 지문(첫/중간/마지막 5구 + 총수)으로 같은 게임 자동 판별. <b>파일명 메타 풍부한 쪽을 자동 선택</b>(표준 형식 20점 &gt; 날짜만 10점 &gt; YYMMDD 5점). 같은 경기를 <code>2603111_xxx.txt</code>로 먼저 올린 뒤 <code>2026_03_11_TWP_vs_GE_xxx.txt</code>를 올리면 자동으로 풍부한 쪽으로 교체. 처리 결과는 토스트로 안내'},
      {icon:'⚖️', text:'⭐⭐⭐ <b>스카우트 좌/우 스플릿 대폭 보강</b> — 사용자 지적: 종합 요약 대비 좌/우 스플릿 탭이 너무 빈약. 6개 섹션으로 확장: 핵심 3줄 → 종합 성적 → 구종별 분포·대응 → <b>(NEW) 🗺️ 9구역 타격 분포</b>(스플릿 한정 3×3 히트맵, 타자 시점 코스명) → <b>(NEW) ⚖️ 카운트별 성적</b>(유리/평형/불리 카운트 좌투/우투 상대) → 운영 조언'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 타자 공략 좌/우 스플릿 작동 안 함</b> — 사용자 발견: 종합 요약은 잘 뜨는데 좌투/우투 상대 공략 탭은 텅 빔. 원인: 타자의 <code>groupDetails</code>에 <b>구종별 좌투/우투 분리 데이터(vsL/vsR)가 아예 없었음</b>. 투수 쪽은 있는데 타자 쪽만 누락. <code>_grpSplitStat</code> 헬퍼 추가로 각 구종을 좌투/우투로 쪼개 저장. 이제 우투 상대 구종별 분석, 공략 3줄(약점 구종/유인 구종/강점 경고) 정상 작동'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 홈런율 분모 버그</b> — 사용자 발견: 158타석에 9HR이면 약 5.7%여야 하는데 1%로 표시. 원인: <code>data.total</code>(전체 투구 수 약 600)을 타석 수로 잘못 알고 분모로 사용. <code>_scoutCollectBatter</code>에 <b>정확한 타수(AB)</b> 필드 추가, 홈런율 = <code>hrs/AB</code>로 정정 (타수당 기준 → 야구 표준). overview "○○타석" 표시도 투구 수가 아닌 실제 타석 수로 정정'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 1회초·1회말 라벨 반전 버그</b> — 사용자 발견: TWP vs GE 게임에서 "1회말 GE 공격"으로 떴는데 실제 타자는 TWP. 원인: WBD CSV의 <code>half</code> 값을 거꾸로 해석. 실제는 <b>half=1이 초(원정), half=0이 말(홈)</b>. 통계 계산(팀 분류·득점)은 처음부터 올바른 컨벤션이라 박스스코어·승패·득실점은 모두 정확했음. 한글 "초/말" 라벨만 거꾸로였던 문제 — 타격/투구 로그·모달·경기 로그 4곳 모두 정정'},
      {icon:'📊', text:'⭐⭐ <b>경기 로그 — 주자 상황 + 아웃 카운트 다이아몬드</b> — 각 타석마다 다이아몬드 SVG 아이콘으로 1·2·3루 주자 시각화(금색=주자있음/회색=없음) + 옆에 "주자없음/1루·2루주자" 텍스트 + 아웃 카운트(2아웃은 주황 강조). 이닝 시작 시 아웃 자동 리셋'},
      {icon:'📦', text:'⭐ <b>토스트 알림 시스템 추가</b> — <code>_toast(title, body, color, duration)</code> 함수. 우측 상단 슬라이드 인, 자동 닫힘. 중복 게임 처리·매핑 저장 등 비차단 안내에 활용'},
    ]
  },
  {
    version: 'V10.0',
    date: '2026-05',
    title: '🛡️ 수비 분석 OAA v3 + 🛡️ 수비수 단독 분석 페이지 + 🐛 스윙 판정 버그픽스 + 🎯 타자 시점 코스명 + 📅 파일명 날짜 인식 확장',
    badge: '#39ff8a',
    changes: [
      {icon:'🛡️', text:'⭐⭐⭐ <b>(NEW) 수비 분석 페이지 — OAA v3</b> — 포구 데이터 기반 수비 평가. <b>OAA</b>(Outs Above Average) = 같은 <b>포지션 × 이동거리 × 타구속도 × 발사각</b>의 평균 아웃 확률 대비 차이. <b>"못 잡을 걸 잡으면 +α, 쉬운 걸 놓치면 -α"</b> 난이도 가중. <b>포지션별 완전 분리</b> (외야수가 가끔 내야 처리해도 합산 안 됨). 포지션은 <code>&lt;Pos&gt;Name</code> 컬럼으로 정확 식별. 어려운 잡기율(외야 핵심) / 쉬운 놓치기(내야 핵심) 지표. 키 보정 없음. 홈런·이동거리 이상치 자동 제외'},
      {icon:'🛡️', text:'⭐⭐⭐ <b>(NEW) 수비수 단독 분석 페이지</b> — 투수/타자 분석처럼 선수 1명 정밀 분석. 선수 셀렉터 + 포지션 셀렉터. 6 KPI 카드(OAA/아웃%/어려운잡기/쉬운놓치기/이동거리/장거리잡기) + 백분위 + 자동 평가 + 포지션별 OAA 표 + 이동거리/EV 분포 + 수비 히트맵'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 스윙 판정 버그픽스</b> — 사용자 발견: 컨택률이 헛스윙률보다 낮게 나오는 모순. 원인: WBD CSV의 <code>bSwing</code> 컬럼이 새 시즌일수록 오류 폭증(리그전 3% → 최근 19%). 타격이 명백히 발생했는데(call=2 인플레이 / call=4 볼존헛스윙 / ev&gt;0) bSwing=0으로 기록된 경우를 <b>parseCSV 단계에서 한방향 보정</b>. 전체 스윙률 55%→61%, 체이스율 53%→59%로 정상화. 헛스윙률·컨택률·선구안 등 통계 자동 정정'},
      {icon:'📋', text:'⭐⭐ <b>타격 로그에 스윙 컬럼 추가</b> — call=0(Strike)이라 로그상 그냥 "Strike"로만 보이던 행도, 실제 스윙 여부(노스윙/컨택/헛스윙)를 별도 컬럼으로 표시. 투구 상세 모달에도 스윙 정보 추가'},
      {icon:'🎯', text:'⭐⭐ <b>타자 시점 코스명</b> — 선수 평가/공략 리포트의 9구역 코스명을 절대 좌표(좌상/우하)에서 <b>타자 시점</b>(몸쪽위/바깥아래/한가운데)으로 변경. 좌타/우타에 따라 몸쪽-바깥쪽 자동 반전'},
      {icon:'📅', text:'⭐⭐ <b>파일명 날짜 인식 확장</b> — 기존엔 <code>YYYY_MM_DD_팀A_vs_팀B</code> 형식만 인식. 이제 <code>YYMMDD+경기번호</code>(예: 2603111 → 2026-03-11) 등 일반 스크림 파일명도 날짜 추출. 최근 폼 분석에 일반 스크림도 자동 포함'},
      {icon:'🐛', text:'⭐⭐ <b>핫존 분모 버그픽스</b> — 사용자 발견: 공략 핵심 "코스 타율 .667 (4/13)" 분모 불일치. 타율 .667은 4안타/6타석이 맞는데 표시는 4/13(투구수)으로 잘못됨. 핫존/콜드존 코스 표시를 <code>hits/ab</code>로 정정'},
      {icon:'📊', text:'⭐ <b>구종 핵심지표 무브 컬럼 복구</b> — 투수별 구종 랭킹 테이블에 평균 무브먼트(횡변+종변)/2 컬럼 복구'},
    ]
  },
  {
    version: 'V9.8',
    date: '2026-05',
    title: '🔥 구종 메타 분석 + 🎨 구종 핵심지표 테이블 UX 개편 + 📊 발사각 분포 UX 개편 + 🐛 LD 분류 누락 버그픽스 + 🗺️ 스프레이 차트 확대 & 내야 줌인 + 📦 schema v7',
    badge: '#38bdf8',
    changes: [
      {icon:'🔥', text:'⭐⭐⭐ <b>(NEW) 구종 메타 분석</b> — 구종 분석 페이지 상단에 추가. 리그 전체 데이터 기준으로 <b>어떤 구종이 메타적으로 유리한지</b> 한눈에 확인. <b>xPV+/100</b> (운 제거된 리그 평균 대비 기대 가치) 정렬, 표본 ≥ 50투구 그룹만 분석. 컬럼: 순위(🥇🥈🥉) / 구종 / 투구 / 사용% / 평균구속 / 피BA / 헛스윙% / 배럴% / xPV/100 / xPV+/100 / 메타 등급 (S=엘리트, A=우수, B=평균, C=아쉬움, D=부진). 행 클릭 시 해당 구종 상세 분석으로 이동. 하단 메타 요약 (가장 효과적 vs 가장 피해 큰 구종)'},
      {icon:'🎨', text:'⭐⭐⭐ <b>구종 그룹별 핵심 지표 테이블 UX 전면 개편</b> — 사용자 통점: 21개 컬럼 가로 스크롤 너무 길고 스크롤 시 구종명 안 보임. <b>4개 그룹 탭으로 분리</b>: 📊 기본 (구속/제구) · 🎯 결과 (피BA/헛스윙/피EV) · 🌀 회전·세부 (원본구속/sH·sV·Gyro) · ⚖️ 구종가치 (PV/xPV/운 시리즈) · 📋 전체 (가로스크롤). 각 탭은 5~9컬럼만 표시 → 스크롤 거의 없음. 추가로 <b>구종 컬럼 sticky</b> — 가로 스크롤해도 좌측에 고정되어 항상 보임. 호버 시 그림자 효과로 구분'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 라인드라이브 누락 버그픽스 — 빈 폭 10° → 5°로 정밀화</b> — 사용자 발견: 분류 임계값은 LD가 10°~24°인데 차트에는 [10°,20°) 한 막대만 LD(초록)로 표시되고, 빈 [20°,30°) 안의 20~24° 데이터(원래 LD)가 빈 중심값 25° 기준으로 FB로 잘못 카운트됨. <b>빈 폭을 5°로 줄여 임계값(10°, 25°)이 빈 경계에 정확히 일치</b> → LD 영역이 [10,15)/[15,20)/[20,25) 3개 막대로 표시되고 카운트도 정확. X축은 5° 간격 tick + 10° 간격 라벨로 깔끔하게'},
      {icon:'📊', text:'⭐⭐ <b>발사각 분포 차트 — 타구유형 비율 통합 범례</b> — 차트 위 범례 영역에 색상·라벨·분류기준·비율·개수를 한 줄로 통합. <b>"땅 (&lt;10°) 29.8% (14)" / "직 (10°~24°) 4.3% (2)" / "뜬 (≥25°) 66.0% (31)"</b> 형식. 라벨은 짧게 <b>땅 / 직 / 뜬</b>으로 통일. 차트 막대 색상 분류와 100% 일치하는 <b>빈 단위 카운트</b>'},
      {icon:'📏', text:'⭐⭐ <b>발사각 X축 빈 가장자리 눈금 명확화</b> — 이전엔 -20°, 0°, 20°, 40°만 표시되어 "각 막대가 어디서부터 어디까지 집계인지" 헷갈림. 이제 모든 빈 경계에 tick + 10° 간격 라벨 + baseline + 축 제목 "발사각 (°) — 각 막대는 좌측 경계값부터 +5° 미만 구간"으로 빈 해석 방법 명시'},
      {icon:'🗺️', text:'⭐⭐ <b>스프레이 차트 크기 대폭 확대</b> — 340×360 → 500×540 (약 45% 확대). 전체/외야 모드에서 구장이 차트를 꽉 채우도록 뷰 패딩 최소화'},
      {icon:'🔍', text:'⭐⭐ <b>스프레이 차트 내야 모드 줌인</b> — 🟫 내야 버튼 클릭 시 내야 영역(30m 이내)만 자동 줌인. 겹쳐서 안 보이던 땅볼/내야뜬공 위치 정확히 구분 가능. 점 크기도 7px로 확대 (기존 4.5px)'},
      {icon:'🎨', text:'⭐ <b>내야 줌인 모드 전용 배경</b> — 외야 생략 + 파울라인 점선으로 방향 표시. 내야 다이아몬드·베이스 마커는 그대로 유지'},
      {icon:'📦', text:'⭐⭐ <b>내보내기 schema v7 — battedBall 타구 프로파일 추가</b> — <code>batters[i].season.battedBall</code> 신규 필드: <b>{n, avgLA, gbPct, ldPct, fbPct, gb, ld, fb, thresholds}</b>. 외부 분석 도구에서 타자의 타구 성향 (땅볼형/라인드라이브형/플라이볼형) 분석 가능. 임계값 명시: <code>&lt;10°=GB / 10°~24°=LD / &gt;=25°=FB</code>. 내보내기 코드는 개별 데이터 임계값 기반이라 차트 빈 단위 버그와 무관하게 처음부터 정확. appVersion도 V9.8로 갱신'},
      {icon:'🏷️', text:'⭐ <b>UI/내보내기 버전 표기 일괄 V9.8 갱신</b> — 업로드 페이지 표지(<code>BASEBALL ANALYZER · V9.8</code>), 데스크탑 nav 로고, 모바일 로고, 모바일 메뉴 헤더, 📋 업데이트 내역 버튼 라벨, <code>exportAnalyticsBundle</code> + <code>exportFullBackup</code> 두 내보내기 함수의 <code>appVersion</code> 필드까지 모두 V9.7 → V9.8로 동기화 (이전 누락 항목)'},
    ]
  },
  {
    version: 'V9.7',
    date: '2026-05',
    title: '⚖️ 구종 가치 (PV) 도입 + 📊 통계 통일 + 🏷️ 라벨 일관성 + WBD 환경 보정',
    badge: '#39ff8a',
    changes: [
      {icon:'📊', text:'⭐⭐ <b>스프레이 차트 방향별 비율 — 내야/외야 분리</b> — 타구 스프레이 차트 우상단에 4단계 토글 [끄기 / 📊 전체 / 🟫 내야 / 🟩 외야]. <b>내야</b>는 HP에서 30m 이내 (땅볼/내야뜬공 위치), <b>외야</b>는 30m 밖 (외야 안타/타구). 5등분 (우익/우중/중견/좌중/좌익, 각 18°) 부채꼴 + 비율% 표시. 외야 모드는 도넛 모양 sector로 표시 (안쪽 30m 비움). 수비 시프트 결정에 활용 가능 — "이 타자는 땅볼은 좌중에 25%, 외야는 우중에 23%" 식'},
      {icon:'🐛', text:'⭐⭐ <b>선수 평가 구종별 평가 — 피안타율/헛스윙 임계값 WBD 보정</b> — 사진 발견: 포심 피안타율 .331을 "피격 심각"이라고 -12점, 커브 피안타율 .241을 "평균"으로 0점. WBD 평균 .377 안 반영. 추가로 분기 순서 버그(<.240 먼저 → <.220 도달 불가능)도 발견. <br><b>피안타율 (이전→신규)</b>: < .240 매우우수(+12) → <b>< .220 압도적(+14) / < .280 매우우수(+10) / < .340 우수(+5) / < .400 평균(0) / < .450 다소높음(-6) / < .520 많음(-12) / 이상 심각(-18)</b><br><b>헛스윙</b> (평균 32%): ≥45 결정구급 → <b>≥55 결정구급 / ≥42 우수 / ≥30 평균 / <20 낮음</b>'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 핫존/콜드존 분모 버그픽스 — "4/15 = .800" 미스매치 해결</b> — 사용자 발견: 핫존 표시 "타율 .800 (4/15)" 분모/타율 불일치. 원인: 표시 형식이 <code>hits/n</code>(전체 투구수)인데 hitRate는 <code>hits/ab</code>(타석)로 계산. 4안타 / 5AB = .800이 맞고 n=15(투구수)는 잘못된 분모. <b>모든 핫존/콜드존/보완 코스/히트맵 SVG 표시를 <code>hits/ab</code>로 통일</b> (5곳).<br>+ 임계값도 WBD 보정: 타자 핫존 .350→.450, 투수 핫존 .350→.500, 타자 강타 .330→.420, 좋아하는 구종 .300→.400. 히트맵 색상 스케일 0~70 (이전 0~50)'},
      {icon:'🎯', text:'⭐⭐ <b>선수 평가 리포트 강점/약점 임계값 — WBD 환경 보정</b> — 사용자 피드백: "3할 초반 피안타율인데 약점이라고 잡힘". WBD 실측 분포 분석 후 임계값 전면 재조정:<br><b>투수 약점</b> (이전→신규): 피BA > .300 → <b>.450</b> (WBD 평균 .377), 헛스윙 < 22% → <b>< 24%</b>, 평균EV ≥ 95 → <b>≥ 106</b>, 하드힛 ≥ 30% → <b>≥ 50%</b>, vsL/R BA ≥ .280 → <b>≥ .420</b>, BB% ≥ 7 → <b>≥ 5</b>, 불리카운트 ≥ .300 → <b>≥ .450</b><br><b>투수 강점</b>: 피BA < .220 → <b>< .280</b>, 헛스윙 ≥ 35% → <b>≥ 40%</b>, 평균EV < 92 → <b>< 100</b>, 하드힛 < 25% → <b>< 38%</b>, vsL/R < .200 → <b>< .260</b>, 초구 ≥ 65% → <b>≥ 75%</b>, BB% < 4 → <b>< 1.5</b>, 실투 ≤ 8 → <b>≤ 5</b><br><b>타자</b>: BA 강점 ≥ .300 → <b>≥ .420</b>, BA 약점 ≤ .220 → <b>≤ .200</b>, vsL/R ≤ .220 → <b>≤ .200</b>, 불리 ≤ .240 → <b>≤ .220</b><br><b>perfTier</b>: 슈퍼스타 .320→.500, 올스타 .290→.420, 주전급 .260→.350, 평균 .230→.280'},
      {icon:'🎯', text:'⭐⭐ <b>선수 평가 제구 점수 — 데이터 기반 절대 기준 스코어링</b> — WBD 실측 분포 (n=14)로 백분위 기반 식 재설계. <b>합성: 50 + BB(±20) + badZone(±20) + 초구(±6) → 상한 80은 BB%와 badZone 둘 다 엘리트일 때만 가능</b>. 실측 결과 평균 53.9 (이전 71.6), 80점 3명/14명 (압도적 BB% 0% + badZone 5% 미만), 표준편차 20.5로 분포 다양.<br>• BB% 8단계: 0.3% 미만 +20(엘리트) ~ 7%+ -28<br>• badZone 7단계: 3% 미만 +20 ~ 22%+ -25 (실투 + 살짝*0.7 합산)<br>• 초구 보조 지표 (±6, firstPitchN≥5만 적용)<br>• 인위적 상한 줄이지 않고 데이터로 자연스럽게 분포'},
      {icon:'⏪', text:'⚠️ <b>(원복) 선수 카드 능력치 CTL 변경 원복</b> — 잘못 건드린 카드 능력치는 원래 식 그대로 복원 (4.0-bbPct/4.0 / 살짝*0.5 / 40-badMist / 가중치 0.25·0.4·0.35)'},
      {icon:'📊', text:'⭐⭐ <b>호투/망경기 + 봉쇄/약점 BA 기준 WBD 환경 보정</b> — 이전 MLB 기준이라 거의 모두 망경기로 잡힘. WBD 평균 BA .377 반영: <br>• 망경기: BA > .350 → <b>.420</b><br>• 호투: BA < .180 → <b>.280</b><br>• 봉쇄력 (BA < .180) → <b>.240</b> (피안타율 낮음 판정)<br>• 피격 (BA >= .350) → <b>.420</b><br>• 유리카운트 봉쇄 .180 → <b>.230</b><br>• 색상 임계값 .250/.350 → <b>.300/.420</b>'},
      {icon:'📊', text:'⭐ <b>구종 그룹별 핵심지표 + 구종 분석 랭킹에 xPV+/100 추가</b> — 이전엔 운/100만 있고 PV/100, xPV/100, xPV+/100 없었음. 8개 PV 컬럼 모두 표시 (PV/xPV/xPV+/운/PV100/xPV100/xPV+100/운100)'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 심판 판정 코드(call) 정의 명확화</b> — 사용자가 게임 공식 코드 확인 + 동작 명확화: <code>0=Strike(콜드 OR 스트존 헛스윙), 1=Ball, 2=Hit(인플레이 컨택), 3=DeadBall(사구), 4=Swing(볼존 헛스윙만), 5=None</code>. <b>주의</b>: 스트존에 헛스윙해도 call=4가 아니라 call=0(어차피 스트라이크). call=4는 볼에 헛스윙한 경우만. <br>• <b>K 판정</b>: <code>strk=2 + (call=0 OR call=4)</code>로 단순화 — bSwing 무시 (어차피 call이 진실, 노이즈 흡수). 41곳 통일<br>• <b>헛스윙 정의</b>: <code>bSwing=1 && call!==2</code> 유지 — 스트존 헛스윙(call=0+bSwing=1) + 볼존 헛스윙(call=4) 둘 다 포함해야 정확. 실측 1035구에서 헛스윙 170개 (스트존 64 + 볼존 106), 헛스윙률 31.7% (정상)'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 파울 CRV 처리 버그픽스</b> — WBD에서 파울은 <code>result=3 + call=2 + ev>0</code>로 찍히는데 이전 로직은 <code>call!==2 && ev=0</code>만 파울로 인식, 나머지를 볼로 잘못 카운트. 1만 구 기준 PV 총합이 수십 점 차이날 수 있는 큰 버그. <b>이제 result=3을 최우선으로 파울 처리</b>'},
      {icon:'🐛', text:'⭐⭐⭐ <b>(CRITICAL) 구종 BA가 1.000을 넘는 버그픽스</b> — _aggregatePitchTypeStats에서 <code>call===2</code> (인플레이 컨택)를 안타로 한 번, 실제 안타(1BSafe/HR)를 한 번 더 카운트해서 BA가 부풀려짐. call===2는 별도 battedBall 카운터로 분리'},
      {icon:'⚖️', text:'⭐⭐ <b>xPV+ (리그 평균 대비 기대 가치) 추가</b> — xPV는 그대로 절대 기대 가치로 유지하고, 별도 지표로 <code>xPV+ = xPV - 리그 평균 xPV/투구 × 투구수</code> 신설. 양수=리그 평균보다 좋음, 음수=평균 이하. 상대 비교에 유용. PV 캐시는 key 기반으로 게임 토글 시 자동 무효화'},
      {icon:'⚖️', text:'⭐ <b>운/100 컬럼 추가</b> — 100투구당 운(PV-xPV) 차이. 표본 크기 다른 투수도 공정 비교 가능'},
      {icon:'🧹', text:'⭐ <b>Forfeit 더미 투구 제외</b> — _isDummyPitch 헬퍼로 Forfeit (몰수패 더미)나 ball/strk/call이 모두 null인 행을 분석 집계에서 자동 제외. raw 데이터는 보존'},
      {icon:'⚖️', text:'⭐⭐ <b>PV 가중치 1.7배로 강화 (40이닝 기준)</b> — 이전 1.15배는 분포감이 작아 표에서 ±1~5 수준만 보임. 1.7배로 키워 40이닝(~600투구) 기준 좋은 투수 +22, 엘리트 +35 정도 분포 보이게. 종료 RE: K -0.56 / BB +0.44 / 1B +0.70 / HR +2.28 / OUT -0.53. 임계값도 조정: 엘리트 ±22, 플러스 ±7, 셀 색상 ±5'},
      {icon:'📦', text:'⭐⭐ <b>내보내기 데이터 대폭 확장 (schema v5)</b> — 누락 데이터 추가: <b>awards</b>(MVP/사이영/홈런왕/wOBA왕/PV왕 등 시즌 수상자) + <b>teamReports</b>(팀별 핵심 투수 로테이션 + 핵심 타자 + 강점/약점 + 라인업) + <b>scoutReports</b>(OVR 상위 30 투수/타자 강점/약점/FV/스카우트 노트). 한 번의 내보내기로 완전한 시즌 종합 분석 가능'},
      {icon:'📦', text:'⭐⭐ <b>xPV/100 + 운(PV-xPV) 컬럼 추가 + 내보내기 데이터에 PV/xPV/xPV100/운 포함</b> — 표에서 PV, xPV, 운, PV/100, xPV/100 모두 볼 수 있게. 운 컬럼: 양수=운 좋음(회귀 위험, 노란색), 음수=운 나쁨(향상 기대, 파란색), 0 근처=실력대로. 내보내기 schema v4: pitchTypes.groups/playersByGroup에 pv/xpv/pv100/xpv100/pvDiff 5개 필드 추가. 투수 season에 seasonPV/seasonXPV/wOBAagainst/BABIPagainst 추가. 타자 season에 wOBA/BABIP/kbb/ISO 추가. (수정) OPS 식 문자열 연결 버그 픽스'},
      {icon:'🎯', text:'⭐⭐⭐ <b>xPV (Expected Pitch Value) 도입</b> — 실제 결과 대신 EV/발사각 기반 "기대 RV"로 계산. 운 좋게 잡힌 한가운데 실투 vs 운 나쁘게 안타 맞은 코너 공 구별. WBD 408 인플레이 타구 + MLB prior 가우시안 커널 스무딩으로 격자 테이블 구축 (EV 5단위 × LA 10단위 = 234개 칸 + 이중보간). <b>PV(실제) vs xPV(기대) 비교로 운/실력 분리</b>: xPV 높은데 PV 낮음 → 운 나쁨, 향후 회복 기대 / PV 높은데 xPV 낮음 → 운 좋음, 회귀 위험. 선수 평가/공략 페이지에 자동 분석 추가'},
      {icon:'📊', text:'⭐⭐⭐ <b>COUNT_RE 베이지안 보정 + 단조성 점검</b> — 이전 표본 부족한 카운트 (3-0 n=4, 3-1 n=2) 노이즈 큼. MLB 표준 + WBD 데이터를 prior_strength=30으로 가중 결합. <b>n=2 → 6% WBD / n=309 → 91% WBD</b> 자동 조정. 카운트 단조성 점검 후 자연스러운 RE 테이블로 정정 (예: 3-0이 0.510 → 0.246로 보정, MLB 평균에 가까이 끌어옴)'},
      {icon:'⚙️', text:'⭐⭐ <b>가중치 1.15배 강화 + 2-스트라이크 파울 보너스</b> — 종료 가중치 1.15배 (K -0.38 / HR +1.54). 2스트 파울 시 +0.005 보너스 (타자 보호스윙 살리지만 K 확률 ↑)'},
      {icon:'🎯', text:'⭐⭐⭐ <b>CRV (Count-based Run Value) 정밀 계산 도입</b> — PV 계산 방식 자체를 Fangraphs/Statcast가 실제 쓰는 진짜 방식으로 재설계. 이전: 결과만 보고 단순 가중치. 이후: 각 투구를 <b>(이전 카운트 → 이후 카운트)</b> 전이로 보고 카운트별 평균 RE 차이로 RV 산출. <b>0-2에서 K 잡는 것 vs 3-2에서 K 잡는 것의 가치 차이 정확히 반영</b>. 0-0에서 BB vs 3-0에서 BB도 마찬가지. 모든 투구 (콜드 스트라이크/볼/파울)도 카운트 진행 가치 계산. WBD 실측 데이터(310 PA) 기반 + zero-centered 보정 (평균 PA의 PV = 0)'},
      {icon:'⚖️', text:'⭐⭐⭐ <b>PV 가중치 zero-centered 보정 (3차 개정)</b> — 이전 가중치 (HR -1.34 / K +0.42 등)는 절대값이 작아 PV 값이 전반적으로 0 근처로 깔려 있었음. 신규 가중치: <b>HR -1.89 / 안타 -0.54 / BB -0.64 / HBP -0.64 / K +0.56 / 인플레이아웃 +0.41</b>. <b>평균 PA의 PV가 정확히 0</b>이 되도록 zero-center 처리 → 평균 투수 ≈ 0, 좋은 투수 양수, 나쁜 투수 음수로 명확히 구분. (※ V9.7 후반에 CRV로 또 한 번 개선됨)'},
      {icon:'⚖️', text:'⭐⭐⭐ <b>구종 가치 (Pitch Value, PV)</b> 신규 도입 — Fangraphs 표준 방식. 시즌 누적 + PV/100 정규화 두 가지. 양수=좋음 (실점 절감), 음수=나쁨. 표시 위치 4곳: (1) 구종 분석 페이지 상단 카드 (엘리트/플러스/평균/마이너스/부진 등급), (2) 구종 분석 투수별 랭킹 (정렬 가능), (3) 투수 분석 → 구종 그룹별 핵심 지표 표, (4) 구종 클릭 모달 (리그 비교 + 순위)'},
      {icon:'⚖️', text:'⭐⭐⭐ <b>WBD 환경 보정 가중치</b> 적용 — MLB 표준이 아닌 WBD 게임 환경 실측 (1,035 투구) 분석으로 도출. 게임 특성 반영: 실책이 안타로 기록되어 안타 가치 약화, K는 귀한 사건이라 가치 강화, BB/HBP 적절히 페널티'},
      {icon:'⚖️', text:'⭐⭐⭐ <b>선수 평가/공략에 PV 강점·약점 자동 반영</b> — 선수의 어떤 구종이 PV +5 이상 (엘리트/플러스 등급)인지 강점 섹션에, PV -3 이하 부진 구종은 약점 섹션 + "집중 공략 포인트"로 자동 표시. 상대 공략 페이지에서도 동일 적용 (같은 알고리즘 공유)'},
      {icon:'🏷️', text:'⭐⭐ <b>역할 라벨 형식 통일</b> — 이전엔 선수 평가 큰 카드 ("#3 STARTER (3선발급)")와 작은 배지 ("3-4선발")가 다른 알고리즘이라 불일치. 이제 같은 FV 함수 (<code>_fvToRole</code>)에서 long/short 두 형식 동시 산출 → 두 곳이 같은 결과 표시 보장. 라벨도 통일: 1선발급 / 2-3선발급 / 4선발급 / 필승조급 / 롱릴리프급 / 중간계투급 / 5선발급'},
      {icon:'🏷️', text:'⭐ <b>팀 진단서 핵심 투수 라벨도 통일</b> — "에이스 (1선발)" / "주전 선발" / "1선발 (팀 내 최고)" 같은 다양한 라벨이 "주전 1선발 / 주전 2선발 / 주전 3선발 / 주전 4선발 / 백업 선발" 한 형식으로 통합. 그룹화도 "🌟 1선발 (에이스) / ⚾ 2선발 / 🛡️ 3선발 / 🛡️ 4선발 / 🔧 백업 선발"로 명확히'},
      {icon:'📊', text:'⭐⭐⭐ <b>통계 계산식 대대적 통일</b> — 같은 통계인데 페이지마다 다른 식 쓰던 문제 해결. 사용자가 본 "한가운데 타율 0.000" / "어디선 .500 어디선 .300" 차이 원인 모두 수정: <br>• AB 계산에 <b>K 포함</b>: 모든 BA 계산을 sabermetrics 표준식(AB = 인플레이 + K)으로 통일 (15곳)<br>• <b>BABIP 식 → 표준 BA 식</b> 변경: 홈/팀 분석/카운트별/주자별/카드/인사이트/어워드/리더보드/최근폼 (12+ 곳)<br>• <b>9구역 zone 타율</b>: hitRate = hits/n (전체 투구) → hits/ab (정확한 분모)<br>• 5x5 zone map BA도 표준식<br>• 배럴 정의 통일: ldeg>8 && ldeg<32 → ldeg>=8 && ldeg<=32 (경계 포함, 22곳)'},
      {icon:'📊', text:'⭐⭐ <b>신규 통계 추가</b> — _calcStandardStats가 wOBA / K-BB 비율 / BABIP 자동 계산. wOBA = 가중 출루율 (OPS보다 정확한 종합 타격 지표, PV와 같은 WBD 가중치 사용)'},
      {icon:'🏆', text:'⭐ <b>어워드 페이지 wOBA왕 추가</b> — 슬래시 라인 그룹에 "⭐ wOBA왕 (Weighted OBP)" 카테고리 신설'},
      {icon:'📰', text:'경기후 리포트 박스스코어 정확도 — 박스스코어 모달과 100% 동일한 outs/IP/실점 계산. `calcPitcherGameStats` / `calcBatterGameStats` 활용'},
      {icon:'🐛', text:'V9.7 버그픽스 — (1) `_isHit` 함수 비교 연산 정확화 (<code>+d[\'1BSafe\']===1</code>로 강제 number 변환), (2) 헛스윙 판정 정의 일관화, (3) 하드힛 임계값 통일 (110 mph), (4) zone 분류 임계값 통일 (0.33)'},
      {icon:'📝', text:'(앞으로 매 버전마다 changelog 빠짐없이 기록)'},
    ]
  },
  {
    version: 'V9.6',
    date: '2026-05',
    title: '🏆 팀 전력 진단서 + 📰 경기후 자동 리포트 + 📋 상대 공략 (좌/우 스플릿) + 매치업 비교',
    badge: '#cc44ff',
    changes: [
      {icon:'⚔️', text:'⭐⭐⭐ 팀 전력 진단서에 <b>상대팀 비교 모드</b> 추가 — 5대 지표 매치업 표 (BA·HH·체이스·BAA·K%) · 우위 자동 판정 (🟢/🔴/⚖️) · 종합 판단 (압도/우위/박빙) · <b>승리 플랜</b> + <b>피해야 할 운영</b> 자동 생성. 경기 전 작전 보고서 직접 활용'},
      {icon:'📰', text:'⭐⭐⭐ 경기후 자동 리포트 완전 강화 — (1) <b>이닝별 흐름 차트</b> (3점+ 빅이닝 강조). (2) <b>흐름 이벤트</b>: 선취·역전·동점·빅이닝·쐐기점 자동 감지. (3) <b>승리팀 승리 요인</b>: 빅이닝/호투/타선 응집력/장타 폭발/안정적 제구. (4) <b>패배팀 패배 원인</b>: 실점 빅이닝/무너진 투수/타선 침묵/<b>득점권 부진</b>/사사구 자멸/중심타선 침묵. (5) 박스스코어 = 박스스코어 모달과 100% 동일한 정확한 outs/IP/실점 계산'},
      {icon:'🏆', text:'⭐⭐ 팀 전력 진단서 신규 추가 — 팀 분석 페이지 [📊 팀 통계 / 🏆 팀 전력 진단서] 서브탭. 팀 스타일·등급(A+~D)·5대 지표(타율/HH%/체이스/BAA/K%)·강점·약점·운영 추천·핵심 타자/투수·추천 라인업·감독 총평. <b>공격/수비 종합 등급(S~D) 큰 시각화</b> 카드'},
      {icon:'⚾', text:'⭐⭐ 핵심 투수 분류 완전 재설계 (등판 패턴 기반) — 1회 등판 비율·평균 등판 이닝·마지막 이닝 비율·1이닝 비율·안정성으로 정확하게 분류. 🌟 선발 에이스 / ⚾ 2-3선발 / 🛡️ 4-5선발 / 🔧 백업 선발 / 🔒 마무리 / ⚡ 필승조 / 🔄 중간 계투 / ⏳ 롱릴리프. <b>팀 내 상대 평가</b>로 1선발~4선발 자동 매김. 3~4선발 로테이션 기본 가정'},
      {icon:'📋', text:'⭐⭐ 상대 공략 (구 전력분석실) 좌/우 스플릿 추가 — [전체] [vs 좌타] [vs 우타] 탭. 공략 핵심 3줄 TOP PRIORITY · 표본 신뢰도 배지(✓충분/△참고/⚠부족). 투수공략/타자공략 분리. 메뉴명도 "상대 공략"으로 변경하여 "선수 평가(스카우팅)"와 명확히 구분'},
      {icon:'🏏', text:'⭐ 추천 라인업 sabermetrics 기반 재설계 — OBP/SLG/OPS/ISO/클러치BA 활용. 1번(출루)→2번(OPS)→3번(종합best)→4번(파워)→5번(보호)→6-7번(보조)→8-9번. 단순 타율순 정렬 폐기'},
      {icon:'🎯', text:'⭐ 경기 변경 시 자동 갱신 확대 — 활성 경기 토글 후 팀 분석/상대 공략/선수 평가/경기 리포트/구종 분석/리더보드/카드 페이지 모두 자동 재렌더. 캐시 무효화 처리'},
      {icon:'🐛', text:'⭐ 대대적 버그 수정 — (1) `d.balls`/`d.strikes` → `d.ball`/`d.strk` 일괄 정정 (15곳, 풀카운트/카운트 분석 정상화). (2) 박스스코어 IP·실점 계산 박스스코어 모달과 100% 일치 (out 컬럼 변화 + 베이스 owner 추적). (3) 핵심 투수 그룹화 버그 (2선발/3선발/4선발 라벨이 "기타"로 빠지던 문제). (4) splitData 미정의 에러. (5) fmt3 스코프 에러. (6) 경기 리포트 첫 진입 시 자동 첫 게임 선택. (7) 팀 진단서 렉 문제 해결 (G 한 번 순회 + 캐싱으로 ~80배 빠르게)'},
      {icon:'🎯', text:'⭐⭐ 구종 분석 페이지 NEW — 도구 메뉴 [🎯 구종 분석]. 구종 선택 칩 (포심/슬라이더 등 사용량 순) → 각 구종의 13개 핵심 지표 (구속/횡변/종변/평균무브/자이로/존인%/헛스윙률/CSW%/피안타율/피홈런/평균EV/하드힛%/배럴%) + 투수별 랭킹 테이블 (모든 컬럼 정렬·최소 투구수 필터·행 클릭 카드 모달)'},
      {icon:'🔍', text:'⭐ 투수 분석 → 구종 프로파일 → 구종 클릭 → 리그 비교 분석 모달 NEW — 그 투수의 그 구종이 리그 평균 대비 얼마나 좋은지 시각화. 13개 지표 비교 + 8개 지표 순위 표시 + 자동 방향성 판정'},
      {icon:'📖', text:'⭐ 능력치 상세 가이드 NEW — 모든 능력치의 실제 계산식·의미·해석 팁. 카드 모달 [📖] 버튼 또는 도구 메뉴에서 접근'},
      {icon:'📦', text:'⭐⭐ 분석 데이터 풀 패키지 내보내기 — JSON/CSV 다양한 포맷'},
      {icon:'💾', text:'⭐ 풀 백업 / 복원 시스템 — 모든 LocalStorage 데이터 + raw 데이터 + 카드 결과를 한 JSON에 저장'},
      {icon:'🔗', text:'팀명 병합 LocalStorage 저장 — 새로고침해도 팀명 병합 유지'},
      {icon:'⚔️', text:'내 팀 빌더 대규모 개편 — 카드형 라인업 UI, 정사각 다이아몬드, 편집 ON/OFF, 드래그&드랍'},
      {icon:'🎨', text:'전체 UI 편의성 대규모 개편 — 상단 네비 그룹화, 모바일 하단 탭바, 카드 활성 필터 칩, 키보드 단축키'},
    ]
  },
  {
    version: 'V9.4',
    date: '2026-04',
    title: '⚔️ 내 팀 빌더 + UI 편의성 개편 + 캐시 최적화 (V9.6에 통합·확장됨)',
    badge: '#39ff8a',
    changes: [
      {icon:'📦', text:'V9.6에서 모든 변경사항이 통합되고 새로운 기능(구종 분석·풀 백업·능력치 가이드)이 추가되었습니다. V9.6 changelog를 참고하세요.'}
    ]
  },
  {
    version: 'V9.3',
    date: '2026-04',
    title: '🃏 프로필 사진 시스템 + 카드 디자인 개편 + 정렬 기능 + 베스트 라인업 버그 수정',
    badge: '#ff6b8a',
    changes: [
      {icon:'🎯', text:'⭐ 투수 제구 & 존 탭 - 구종 필터 추가 — 기존 구종그룹과 별개로 세부 구종 직접 선택 가능 (각 구종별 투구수 표시). 존 차트에 구종 그룹별 색상 + 판정별 모양 (Strike=원/Ball=다이아몬드/Hit=삼각형/HBP=X/Swing=사각) 한눈에 파악'},
      {icon:'🃏', text:'⭐ 프로필 사진 시스템 — 별도 등록기(profile_register.html)로 게임 로그에서 선수 추출 → 사진 매핑 → profile_map.js 생성. 분석기는 같은 폴더의 profile_map.js + profile/ 폴더에서 자동 로드. 사진 없으면 빈 선수 실루엣 SVG로 통일'},
      {icon:'🐛', text:'⭐ 구종 분류 대폭 정정 (PITCH_GROUPS) — (1) Fastball(0)이 포심에 잘못 들어감 → 패스트볼 별도 그룹 (2) 4-Seam FB-F(28)가 투심에 잘못 → 포심으로 (3) Drop FB(35-37)가 투심에 섞임 → 드롭 별도 (4) 슬라이더에 라이징 슬라이더 섞임 → 분리 (5) 싱커에 라이징 싱커 섞임 → 분리. 체인지업도 5종(체인지업/라이즈/써클/페이드/드롭)으로 세분화. 총 12개 → 19개 그룹. 직구계열: 패스트볼/포심/커터/투심/드롭'},
      {icon:'🎯', text:'⭐ 구종 필터 통일 (3곳) — 투수 제구&존 / 타자 타구 분석 / 투수 정밀 맵 모두 같은 패턴. 그룹 단위(포심/투심/슬라이더 등) 토글로 통일. 색상과 토글이 1:1 매칭'},
      {icon:'🃏', text:'⭐ 선수 카드 디자인 개편 — 앞면: 큰 프로필 사진(220px) + 이름 + OVR 배지(우하단) + 뱃지 + 능력치(육각형 + 바). 뒷면: 상세 통계. 카드 그리드도 정사각 사진 + OVR 컬러 테두리'},
      {icon:'📷', text:'팀 분석 - 팀 로스터 카드에 프로필 사진 추가 — 정사각 사진 + OVR 컬러 테두리. 클릭 시 선수 카드 모달'},
      {icon:'🏟️', text:'선수 카드 페이지 팀 필터 (select) 추가 — 모든 팀 자동 추출, 각 팀별 선수 수 표시. 카드에 팀 이름 작게 표기'},
      {icon:'🩺', text:'프로필 사진 진단 도구 — 카드 페이지 우측 [🩺 프로필 진단] 버튼. 매핑 상태/사진 로드 테스트/체크리스트 제공. localStorage 백업으로 모바일 file:// 환경에도 대응'},
      {icon:'🔀', text:'⭐ 분석 테이블 5곳 정렬 추가 — 카운트별 성적, 주자 상황별 성적, 구종별 대응 성적, 좌타 vs 우타, 경기별 요약(투수/타자). 모두 헤더 클릭으로 ▼내림 → ▲오름 → 원래대로 (3-state)'},
      {icon:'🔀', text:'⭐ 포지션별 TOP 3 테이블 정렬 추가 — 컬럼 헤더 클릭으로 정렬. 위치/이름/팀/OVR/WAR/이닝 모두 정렬 가능'},
      {icon:'🔀', text:'공용 정렬 헬퍼 함수 추가 (_tblSortToggle / _sortHeader / _applyTblSort) — 새 테이블에 정렬 추가가 매우 쉬워짐'},
      {icon:'⚔️', text:'⭐ 투수(P) 평가 기준 토글 추가 — 투수 WAR(기본) / 타자 WAR / 투타 합산 3가지. 투타 겸업 선수의 평가 기준을 사용자가 선택. 베스트 라인업 + 포지션 이닝 + 포지션 TOP 3 모두 적용'},
      {icon:'🐛', text:'⭐ 베스트 라인업 combo 점수 버그 수정 — 0.3 가중치 누락으로 WAR이 OVR 대비 너무 강하게 영향 (74 OVR/7.3 WAR 선수가 94 OVR/6.0 WAR 선수보다 위로). 정상: card.OVR*0.7 + war*15*0.3'},
      {icon:'🐛', text:'⭐ 포지션 TOP 3 / 포지션 이닝 버그 수정 — 타자가 P(0) 포지션에서 뛴 경우 투수 카테고리에 타자 row가 들어가는 문제 (눈꽃 같은 투타 겸업 케이스에서 잘못 표시). 이제 주 포지션 P 타자는 제외하고 투수 row로 통일'},
      {icon:'🏆', text:'⭐ 최소 기준 토글 5단계로 확장 — 어워드/베스트라인업/포지션이닝 모두 매우널널/널널/보통/엄격/매우엄격 + 🌐전체 + ⚙️직접 입력. 리더보드는 기존 5단계 + ⚙️직접 입력'},
      {icon:'🥎', text:'포지션별 상세 이닝에 투수 추가 — pos=0 투수 카테고리에 투수 WAR로 정렬, 자동 투수 페이지 이동'},
    ]
  },
  {
    version: 'V9.2',
    date: '2026-04',
    title: '📊 sabermetrics WAR + 어워드 대폭 확장 + 리더보드 WAR + 투타 겸업',
    badge: '#ffd700',
    changes: [
      {icon:'📊', text:'⭐ WAR 식 sabermetrics-style로 재구성 — 타자: wOBA 기반 (0.7×BB + 0.9×1B + 2.0×HR), 投수: ERA/K/BB/BA 환경 평균 대비'},
      {icon:'🔄', text:'⭐ 환경 평균 동적 계산 — _getLeagueAverages() 함수로 매 시즌 wOBA/ERA/K%/BB% 등 실시간 계산. 하드코드 X, 활성 게임 데이터 기반 자동 갱신'},
      {icon:'⚖️', text:'⭐ 투수 WAR 식 조정 — 등판 보너스 0.04→0.10 (2.5배), K/BB/HR 패널티 ↓, 음수 cap -3→-1.0. 짧은 시즌도 적절한 가치 평가'},
      {icon:'⚔️', text:'⭐ 투타 겸업 감지 + 총합 WAR — 헤더에 ⚔️ 투타 X.X WAR + ⚾ 투수 X.X WAR + 🏏 타자 X.X WAR 분리 표시 (그라디언트 통일)'},
      {icon:'🎯', text:'⭐ 헤더 WAR 배지 — 투수: ⚾ 투수 X.X WAR (파란 그라디언트), 타자: 🏏 타자 X.X WAR (분홍 그라디언트). 단독/겸업 모두 같은 시각 스타일'},
      {icon:'🏆', text:'⭐ 어워드 MVP 3개로 분리 — 🏏 타자 MVP / 👑 투수 MVP(사이영) / 🏆 통합 MVP. 투타 겸업 선수는 통합 MVP에서 P+B 총합 WAR로 비교'},
      {icon:'🏆', text:'⭐ 시즌 어워드 21개 확장 — 타자: 출루왕/장타왕/OPS왕/안타왕/강타자상/컨택왕/선구안왕, 투수: 잠재구속왕/K-BB왕/헛스윙왕/변화구왕'},
      {icon:'🌐', text:'어워드 "전체" 모드 — 규정 기준 무시하고 모든 선수 대상 (소수 등판/타석 선수도 포함)'},
      {icon:'📊', text:'어워드 카드에 WAR 부가 표시 — 모든 어워드 카드에 작게 WAR 표시 (메인 지표가 WAR인 카드는 제외)'},
      {icon:'🏅', text:'⭐ 리더보드 WAR 카테고리 신규 — ⚾ 투수 WAR / 🏏 타자 WAR / 🏆 통합 WAR(투타 합산). 통합엔 겸업 선수 ⚔️ 라벨'},
      {icon:'🐛', text:'⭐ K 계산 일관성 통일 — _isK 함수가 느슨해서 어워드(15K)와 분석탭(11K) 불일치 발생. 엄격한 식(strk2 + (bSwing&&call4 || !bSwing&&call0))으로 13곳 통일. 추가로 명예의 전당 "한경기 최다 K" 등 4곳 더 통일 (콜드 K 누락 버그 수정)'},
      {icon:'🎚️', text:'⭐ 투수 탈삼진(K) 능력치 재정규화 — K 식 엄격화로 K% 분포 -1.6%p 하락 (p50: 6.3→4.7%) 따라 정규화 범위 4~21 → 0~10 조정. 평균 K능력치 ~62점 유지'},
      {icon:'🐛', text:'⭐ 탈삼진 K 계산 버그 수정 — 모든 곳에서 strk===2 조건 추가 (이전엔 모든 헛스윙 스트라이크를 K로 카운트해서 4개를 18개로 표시하는 등 오류). 8군데 수정'},
      {icon:'📐', text:'⭐ 잠재구속 룩업 → PitchRemap 식 적용 (Normal P 컬럼). 게임이 Legacy → PitchRemap으로 변경 예정이라 미리 대비'},
      {icon:'📝', text:'헤더에 K/BB 절대 갯수 추가 (이전엔 % 만 표시) — 투수: K, BB / 타자: 당한 K'},
    ]
  },
  {
    version: 'V9.1',
    date: '2026-04',
    title: '🔧 헤더 통계 정확화 + 카드 통일 + UI 다듬기 + 갭파워 분리',
    badge: '#88cc44',
    changes: [
      {icon:'💪', text:'⭐ 능력치 신규: 갭파워 (GAP) — "얼마나 강한 타구를 날리는가" (각 타석의 키 기반 EV 캡 보정)'},
      {icon:'💥', text:'파워 (POW) 재정의 — "결과 중심" HR%/배럴%/HH% (키 보정 없음, 못 넘기면 못 넘기는 것)'},
      {icon:'📐', text:'키별 EV 캡 매핑: 160cm=120, 165=125, 170=128, 175+=130 (실측 데이터 기반)'},
      {icon:'🎯', text:'⭐ 투수 ERA 보너스 시스템 — ERA 3.0이하 +5, 4.0이하 +3, 5.0이하 +1 (가산점만, 마이너스 없음)'},
      {icon:'🎚️', text:'능력치 균형 조정: GAP/PWR/CON 정규화 + exp 0.7→0.55로 하위권 +5~6점 보정 (너무 낮게 나오던 PWR/GAP 개선)'},
      {icon:'🔓', text:'99 상한 풀림: 모든 능력치(타자/투수) 100+ 또는 110+ 도달 가능. 잘한만큼 그대로 표시 (예: PWR 111, EYE 110)'},
      {icon:'⚖️', text:'⭐ OVR 가중치 적용: 파워/컨택=1.0 (기본 골자), 선구/갭파워=0.9 (중간), 스윗스팟=0.7 (보조)'},
      {icon:'⬇️', text:'능력치 exp +0.1 일괄 상향: 하위권 ↓ + 편차 ↑ (가중치 적용으로 OVR 평균 올라간 것 보정, 상위는 그대로)'},
      {icon:'⚙️', text:'⭐ 투수 OVR 가중치: 구위/제구=1.0 (기본 골자), 탈삼진/구속/구변=0.9 (도구), 안정성/구종=0.7 (보조)'},
      {icon:'⬆️', text:'전체 능력치 평균 + 편차 ↑ (타고투저 환경 + 99 신경X): GAP 83, PWR 84, CON 86, EYE 84, SWT 86'},
      {icon:'👁️', text:'선구(EYE) 평균 ↑: 0~60 exp 0.4 → 0~55 exp 0.38 (평균 82→84)'},
      {icon:'🍬', text:'스윗스팟(SWT) 평균 ↑: 0~40 exp 0.65 → exp 0.55 (평균 84→86, 편차 ↑)'},
      {icon:'💥', text:'⭐ 파워(PWR) 잘한만큼 더 ↑: mx 115→100 (평균 81→84, 편차 ↑, 거포는 100+/110+ 도달 가능, 99 상한 없음)'},
      {icon:'🎯', text:'컨택(CON) 정규화: 25~62→63'},
      {icon:'⚖️', text:'능력치 조정 원칙: 평균은 유지(타고투저 환경 반영), 99도달이 너무 많을 때만 변별력 회복'},
      {icon:'🃏', text:'선수 카드 - 타율/장타율을 정통 야구식 (paEnd 기반 AB)으로 재계산'},
      {icon:'📊', text:'카드에 PA/AB/BB/HBP/OBP 데이터 노출 — 다른 화면과 100% 일치'},
      {icon:'✅', text:'헤더 ↔ 카드 ↔ 경기별 성적 모두 동일한 통계 사용'},
      {icon:'📊', text:'타자 헤더에 타석/BB/HBP/출루율 정식 표시 — 타수 계산 정확화'},
      {icon:'🎯', text:'타율/장타율을 paEnd 기반 AB로 재계산 (경기별 성적과 일치)'},
      {icon:'📏', text:'타자 키 필터 — 현재 타자가 사용한 키만 옵션으로 표시'},
      {icon:'💡', text:'헤더 키 배지 클릭 → 키 필터 즉시 초기화'},
      {icon:'📋', text:'모바일 메뉴에 업데이트 내역 강조 (금색 그라데이션 + V9 NEW!)'},
      {icon:'🆕', text:'햄버거 메뉴 V9 배지 클릭 시 업데이트 내역 모달 열림'}
    ]
  },
  {
    version: 'V9',
    date: '2026-04',
    title: '🌟 잠재 구속 + 정확도 대폭 개선',
    badge: '#ffd700',
    changes: [
      {icon:'🌟', text:'잠재 구속 시스템 (G 탭) — pPow → 캡 풀렸을 때 실제 km/h 추정'},
      {icon:'📐', text:'게임 룩업 테이블 직접 사용 (Legacy Norm 기준, 100% 정확)'},
      {icon:'🛡️', text:'ERA/WHIP/IP 계산 정확도 대폭 향상 — 승계주자 룰 적용'},
      {icon:'🔢', text:'타석/타수 계산 버그 수정 (`_countPaEnd` 헬퍼)'},
      {icon:'⏱️', text:'투수 P/PA → P/IP (이닝당 투구수)로 변경'},
      {icon:'🎯', text:'좌타/우타 스플릿 정확화 (bZone 사용)'},
      {icon:'🃏', text:'카드 뒷면 풍부화 — 시즌 누적 + 잠재구속/잠재최고 표시'},
      {icon:'🔄', text:'카드 ↔ 분석 페이지 양방향 이동 버튼'},
      {icon:'🏆', text:'어워드 신규: 방어율왕/WHIP왕/이닝이터 + 임계값 토글'},
      {icon:'🎖', text:'명예의 전당: 시즌 ERA Top 10 / 무실점 등판 / 이닝이터'},
      {icon:'🏅', text:'리더보드: ERA/WHIP/IP/실점 + 잠재구속 카테고리 추가'},
      {icon:'🔥', text:'최근 폼: ERA 향상 / 구속 변화 / 제구 변화 분석'},
      {icon:'📈', text:'시즌 트렌드: 경기별 평균 ERA/WHIP 차트'},
      {icon:'🚀', text:'성능 최적화: 캐싱 시스템으로 5~10배 빨라짐'},
      {icon:'⚡', text:'WAR 공식 개선: 투수 ERA+IP 핵심, 타자 HR 1.15배'},
      {icon:'📋', text:'팀 분석 → 박스스코어 클릭 연결 + 박스스코어 확장'},
      {icon:'📏', text:'타자 페이지 키 동적 필터 (실제 사용된 키만)'}
    ]
  },
  {
    version: 'V8',
    date: '2026-03',
    title: '⚖️ 능력치 캘리브레이션 + 인사이트',
    badge: '#88cc44',
    changes: [
      {icon:'💥', text:'PWR (파워): 거포 부각 — HR% 가중치 4.5배'},
      {icon:'🎯', text:'CON (컨택): 헛스윙 회피 + 존내/외 컨택 통합'},
      {icon:'👁️', text:'EYE (선구안): 존외 스윙% + BB% 가중'},
      {icon:'🎪', text:'SWT (스위트스팟): 새 능력치 추가'},
      {icon:'⚾', text:'번트 자동 감지 (buntGrip ≥ 0.7)'},
      {icon:'💪', text:'HardHit 기준 EV ≥ 110으로 조정'},
      {icon:'📊', text:'시즌 트렌드 차트 (경기별 BA/HR/구속/K)'},
      {icon:'🎖', text:'명예의 전당 (단일 경기 최다 HR/안타 등)'},
      {icon:'🏆', text:'시즌 어워드 (MVP/사이영/타격왕/홈런왕)'}
    ]
  },
  {
    version: 'V7',
    date: '2026-02',
    title: '🎨 UX 대개편 + 다양한 기능',
    badge: '#88ccff',
    changes: [
      {icon:'🔍', text:'전역 검색 (Ctrl+K)'},
      {icon:'⚖️', text:'선수 비교 페이지 (투수/타자 N명 동시 비교)'},
      {icon:'🎬', text:'하이라이트 (HR/배럴/탈삼진 등 분류 검색)'},
      {icon:'🃏', text:'선수 카드 시스템 (앞면/뒷면 플립)'},
      {icon:'🎮', text:'매치업 페이지 (투수 vs 타자 상성)'},
      {icon:'🏆', text:'팀 분석 + 라이벌리'},
      {icon:'💾', text:'프리셋 관리 (필터 저장/불러오기)'},
      {icon:'🎨', text:'테마 선택 (Dark/Light/Neon 등)'},
      {icon:'⭐', text:'즐겨찾기 + 메모 시스템'},
      {icon:'📤', text:'데이터 내보내기 (CSV/JSON)'}
    ]
  },
  {
    version: 'V6',
    date: '2026-01',
    title: '⚾ 능력치 시스템 도입',
    badge: '#cc88ff',
    changes: [
      {icon:'⚾', text:'투수 7대 능력치: SPD/DOM/BRK/CTL/K/STB/VAR'},
      {icon:'🏏', text:'타자 능력치 도입 (PWR/CON/EYE)'},
      {icon:'⭐', text:'OVR (종합 평가) 점수'},
      {icon:'📊', text:'능력치 레이더 차트'}
    ]
  },
  {
    version: 'V5',
    date: '2025-12',
    title: '📊 분석 깊이 강화',
    badge: '#ff8800',
    changes: [
      {icon:'🎯', text:'존 정밀도 분석 (보더라인/실투율)'},
      {icon:'📈', text:'카운트별 패턴 분석'},
      {icon:'🏟', text:'수비 위치별 OAA'},
      {icon:'⚡', text:'빠른 공/느린 공 분석'}
    ]
  },
  {
    version: 'V1~V4',
    date: '2025',
    title: '🌱 초기 버전들',
    badge: '#888',
    changes: [
      {icon:'⚾', text:'기본 투수/타자 분석'},
      {icon:'📊', text:'구종별 분석 + 존 차트'},
      {icon:'🏟', text:'팀 별 통계'},
      {icon:'📂', text:'CSV 파일 로드 + 다중 경기 처리'}
    ]
  }
];

// Original index.html:15604
wbdContext._CL_CATS = {
  feat:  {label:'신규 기능', icon:'✨', color:'#39ff8a'},
  metric:{label:'지표·분석', icon:'📐', color:'#88ccff'},
  ui:    {label:'UI·시각화', icon:'🎨', color:'#cc88ff'},
  fix:   {label:'버그 수정', icon:'🐛', color:'#ff4560'},
  perf:  {label:'성능·안정성', icon:'⚡', color:'#ffd700'},
  data:  {label:'데이터·내보내기', icon:'📦', color:'#ff8c44'}
};

// Original index.html:15623
window._clFilter='all';

// Original index.html:15624
window._clExpanded=null;

// Original index.html:15946
(function initSavedTheme(){
  const saved=wbdContext.LS.get('theme','dark');
  if(saved!=='dark')wbdContext.applyTheme(saved);
})();
}
