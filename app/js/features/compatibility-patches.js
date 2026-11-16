/** compatibility-patches: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {

}

export function initialize(wbdContext) {
// Original index.html:36000
(function(){
  function esc(s){
    if(typeof wbdContext._wbdEscHtml==='function') return wbdContext._wbdEscHtml(s);
    return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  }
  function js(s){ return String(s??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' '); }
  function safeId(s){ return String(s||'').replace(/[^a-zA-Z0-9가-힣_-]+/g,'_') || 'x'; }
  function phaseLabel(g){ return g.phaseName || g.phaseId || ''; }
  window._gamePhaseLabel = phaseLabel;
  window._gameGroupFullLabel = function(g){
    const group = wbdContext._gameGroupLabel(g);
    const phase = phaseLabel(g);
    return phase ? `${group} · ${phase}` : group;
  };

  const oldNormalize = window._normalizeServerManifest || wbdContext._normalizeServerManifest;
  wbdContext._normalizeServerManifest = function(raw){
    const result = oldNormalize(raw);
    result.groups = (result.groups||[]).map(g=>{
      const phases = Array.isArray(g.phases) ? g.phases : [];
      g.phases = phases;
      g.seasonId = g.seasonId || g.id;
      g.seasonName = g.seasonName || g.name;
      g.files = (g.files||[]).map(f=>({
        ...f,
        category: f.category || g.category || '',
        categoryName: f.categoryName || g.categoryName || '',
        groupId: f.groupId || g.id || '',
        groupName: f.groupName || g.name || '',
        seasonId: f.seasonId || g.seasonId || g.id || '',
        seasonName: f.seasonName || g.seasonName || g.name || '',
        phaseId: f.phaseId || '',
        phaseName: f.phaseName || '',
        phasePath: f.phasePath || '',
        phaseKey: f.phaseKey || '',
      }));
      return g;
    });
    return result;
  };

  wbdContext._fileMetaFromGroup = function(g,f){
    return {
      ...f,
      _group:g.name,_groupId:g.id,
      category:f.category||g.category||'',
      categoryName:f.categoryName||g.categoryName||'',
      groupName:f.groupName||g.name||'',
      groupId:f.groupId||g.id||'',
      seasonId:f.seasonId||g.seasonId||g.id||'',
      seasonName:f.seasonName||g.seasonName||g.name||'',
      phaseId:f.phaseId||'',
      phaseName:f.phaseName||'',
      phasePath:f.phasePath||'',
      phaseKey:f.phaseKey||'',
      source:'server'
    };
  };

  const oldAddGame = wbdContext.addGame;
  wbdContext.addGame = function(text, filename, meta){
    const game = oldAddGame(text, filename, meta);
    meta = meta || {};
    game.seasonId = meta.seasonId || game.seasonId || game.groupId || '';
    game.seasonName = meta.seasonName || game.seasonName || game.groupName || '';
    game.phaseId = meta.phaseId || game.phaseId || '';
    game.phaseName = meta.phaseName || game.phaseName || '';
    game.phasePath = meta.phasePath || game.phasePath || '';
    game.phaseKey = meta.phaseKey || game.phaseKey || '';
    (game.pitches||[]).forEach(p=>{
      p._seasonId = game.seasonId;
      p._seasonName = game.seasonName;
      p._phaseId = game.phaseId;
      p._phaseName = game.phaseName;
      p._phasePath = game.phasePath;
      p._phaseKey = game.phaseKey;
    });
    return game;
  };

  function ensurePhaseFilter(){
    const groupSel=document.getElementById('dash-group-filter');
    if(!groupSel || document.getElementById('dash-phase-filter')) return;
    const label=document.createElement('span');
    label.className='filter-label';
    label.textContent='세부';
    const sel=document.createElement('select');
    sel.id='dash-phase-filter';
    sel.onchange=wbdContext.renderGameDashboard;
    sel.innerHTML='<option value="">전체</option>';
    groupSel.insertAdjacentElement('afterend', sel);
    groupSel.insertAdjacentElement('afterend', label);
    groupSel.onchange = onDashGroupFilterChange;
  }

  wbdContext._populateDashMetaFilters = function(){
    ensurePhaseFilter();
    const catSel=document.getElementById('dash-category-filter');
    const groupSel=document.getElementById('dash-group-filter');
    const phaseSel=document.getElementById('dash-phase-filter');
    const prevCat=catSel?catSel.value:'';
    const prevGroup=groupSel?groupSel.value:'';
    const prevPhase=phaseSel?phaseSel.value:'';
    const cats=new Map(), groups=new Map(), phases=new Map();
    wbdContext.GAMES.forEach(g=>{
      const cat=g.category||'local';
      const catName=g.categoryName||(cat==='local'?'직접 추가':cat);
      cats.set(cat,catName);
      if(!prevCat || cat===prevCat){
        const gid=g.groupId||'local';
        const gname=g.groupName||'직접 추가';
        groups.set(gid,gname);
        if((!prevGroup || gid===prevGroup) && g.phaseId){
          phases.set(g.phaseId, g.phaseName || g.phaseId);
        }
      }
    });
    const catOrder=['league','scrim','independent','event','etc','local'];
    if(catSel){
      const entries=[...cats.entries()].sort((a,b)=>{
        const ai=catOrder.indexOf(a[0]), bi=catOrder.indexOf(b[0]);
        return (ai<0?99:ai)-(bi<0?99:bi)||String(a[1]).localeCompare(String(b[1]),'ko');
      });
      catSel.innerHTML='<option value="">전체</option>'+entries.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
      if(prevCat && cats.has(prevCat)) catSel.value=prevCat;
    }
    if(groupSel){
      const entries=[...groups.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'ko'));
      groupSel.innerHTML='<option value="">전체</option>'+entries.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
      if(prevGroup && groups.has(prevGroup)) groupSel.value=prevGroup;
    }
    if(phaseSel){
      const entries=[...phases.entries()].sort((a,b)=>{
        const ar=a[0].endsWith('/__regular__')?-1:0, br=b[0].endsWith('/__regular__')?-1:0;
        return ar-br||String(a[1]).localeCompare(String(b[1]),'ko');
      });
      phaseSel.innerHTML='<option value="">전체</option>'+entries.map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');
      if(prevPhase && phases.has(prevPhase)) phaseSel.value=prevPhase;
    }
  };
  wbdContext.onDashCategoryFilterChange = function(){
    const gs=document.getElementById('dash-group-filter');
    const ps=document.getElementById('dash-phase-filter');
    if(gs) gs.value='';
    if(ps) ps.value='';
    wbdContext.renderGameDashboard();
  };
  window.onDashGroupFilterChange = function(){
    const ps=document.getElementById('dash-phase-filter');
    if(ps) ps.value='';
    wbdContext.renderGameDashboard();
  };

  function runAfter(){
    wbdContext.rebuildG(); wbdContext.updateNavInfo(); wbdContext.renderGamesList(); wbdContext.populateSelects(); wbdContext.renderActiveContent();
  }
  wbdContext.activateMetaScope = function(category, groupId, phaseId, on){
    if(typeof phaseId === 'boolean'){ on=phaseId; phaseId=''; }
    wbdContext.GAMES.forEach(g=>{
      let match=true;
      if(category && (g.category||'local')!==category) match=false;
      if(groupId && (g.groupId||'local')!==groupId) match=false;
      if(phaseId && (g.phaseId||'')!==phaseId) match=false;
      if(match){ if(on) wbdContext.activeGameIds.add(g.id); else wbdContext.activeGameIds.delete(g.id); }
    });
    runAfter();
  };
  wbdContext.activateOnlyMetaScope = function(category, groupId, phaseId){
    wbdContext.activeGameIds.clear();
    wbdContext.GAMES.forEach(g=>{
      let match=true;
      if(category && (g.category||'local')!==category) match=false;
      if(groupId && (g.groupId||'local')!==groupId) match=false;
      if(phaseId && (g.phaseId||'')!==phaseId) match=false;
      if(match) wbdContext.activeGameIds.add(g.id);
    });
    runAfter();
  };
  wbdContext.setDashboardGroupFilter = function(gid){
    ensurePhaseFilter();
    const group=document.getElementById('dash-group-filter');
    const phase=document.getElementById('dash-phase-filter');
    if(group) group.value=gid||'';
    if(phase) phase.value='';
    wbdContext.renderGameDashboard();
  };
  window.setDashboardPhaseFilter = function(pid){
    ensurePhaseFilter();
    const phase=document.getElementById('dash-phase-filter');
    if(phase) phase.value=pid||'';
    wbdContext.renderGameDashboard();
  };

  wbdContext.renderGamesOverview = function(){
    const el=document.getElementById('games-overview');
    if(!el)return;
    if(!wbdContext.GAMES.length){el.style.display='none';return;}
    el.style.display='block';
    const total=wbdContext.GAMES.length;
    const active=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).length;
    const totalP=wbdContext.GAMES.reduce((s,g)=>s+(g.pitches?g.pitches.length:0),0);
    const activeP=wbdContext.G.length;
    const cats=new Map(), groups=new Map();
    wbdContext.GAMES.forEach(g=>{
      const cat=g.category||'local';
      const catName=g.categoryName||(cat==='local'?'직접 추가':cat);
      if(!cats.has(cat)) cats.set(cat,{id:cat,name:catName,total:0,active:0});
      const c=cats.get(cat); c.total++; if(wbdContext.activeGameIds.has(g.id))c.active++;
      const gid=g.groupId||'local';
      const gname=g.groupName||(gid==='local'?'직접 추가':gid);
      if(!groups.has(gid)) groups.set(gid,{id:gid,name:gname,category:cat,categoryName:catName,total:0,active:0,pitches:0,games:[],phases:new Map()});
      const gr=groups.get(gid); gr.total++; gr.pitches+=(g.pitches||[]).length; gr.games.push(g); if(wbdContext.activeGameIds.has(g.id))gr.active++;
      if(g.phaseId){
        if(!gr.phases.has(g.phaseId)) gr.phases.set(g.phaseId,{id:g.phaseId,name:g.phaseName||g.phaseId,total:0,active:0});
        const p=gr.phases.get(g.phaseId); p.total++; if(wbdContext.activeGameIds.has(g.id))p.active++;
      }
    });
    const order=['league','scrim','independent','event','etc','local'];
    const catEntries=[...cats.values()].sort((a,b)=>(order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id))||a.name.localeCompare(b.name,'ko'));
    const groupEntries=[...groups.values()].sort((a,b)=>String(a.categoryName).localeCompare(String(b.categoryName),'ko')||String(a.name).localeCompare(String(b.name),'ko'));
    const multiCat=catEntries.length>1;
    const viewGroup=(document.getElementById('dash-group-filter')||{}).value||'';
    
    const rowsHtml=catEntries.map(c=>{
      const list=groupEntries.filter(g=>g.category===c.id);
      const eyebrow=multiCat?`<div class="dc2-eyebrow"><span>${wbdContext._wbdEscHtml(c.name)}</span><span class="ct">${c.active}/${c.total}</span><button class="dc2-mini" onclick="activateOnlyMetaScope('${wbdContext._wbdEscJs(c.id)}','','')">이것만</button></div>`:'';
      const rows=list.map(g=>{
        const allOn=g.active===g.total, noneOn=g.active===0;
        const checked=allOn?'checked':'';
        const half=!allOn&&!noneOn;
        const pct=g.total?Math.round(g.active/g.total*100):0;
        // 페이즈 칩 (정규/포스트 등 2개 이상일 때만)
        let phaseHtml='';
        if(g.phases.size>1){
          const chips=[...g.phases.values()].sort((a,b)=>(a.id.endsWith('/__regular__')?-1:0)-(b.id.endsWith('/__regular__')?-1:0)||String(a.name).localeCompare(String(b.name),'ko'))
            .map(p=>{
              const on=p.active===p.total&&p.total>0;
              return `<span class="dc2-phase ${on?'on':(p.active>0?'half':'')}" onclick="activateMetaScope('','${wbdContext._wbdEscJs(g.id)}','${wbdContext._wbdEscJs(p.id)}',${on?'false':'true'})" title="클릭: 켜기/끄기 전환">${wbdContext._wbdEscHtml(p.name)} <b>${p.active}/${p.total}</b></span>
              <button class="dc2-mini" onclick="activateOnlyMetaScope('','${wbdContext._wbdEscJs(g.id)}','${wbdContext._wbdEscJs(p.id)}')">만</button>`;
            }).join('<span class="dc2-phase-sep">·</span>');
          phaseHtml=`<div class="dc2-phases">${chips}</div>`;
        }
        return `<div class="dc2-row ${viewGroup===g.id?'viewing':''}">
          <input type="checkbox" ${checked} ${half?'data-half="1"':''} onchange="activateMetaScope('','${wbdContext._wbdEscJs(g.id)}','',this.checked)" title="이 그룹 전체 켜기/끄기">
          <span class="nm" title="${wbdContext._wbdEscHtml(g.name)} · ${g.pitches.toLocaleString()}투구 — 클릭하면 아래 목록 필터" onclick="setDashboardGroupFilter('${wbdContext._wbdEscJs(g.id)}')">${wbdContext._wbdEscHtml(g.name)}</span>
          <span class="bar"><i style="width:${pct}%"></i></span>
          <span class="ct">${g.active}/${g.total}</span>
          <button class="dc2-mini" onclick="activateOnlyMetaScope('','${wbdContext._wbdEscJs(g.id)}','')">이것만</button>
        </div>${phaseHtml}`;
      }).join('');
      return eyebrow+rows;
    }).join('');
    
    el.innerHTML=`<div class="dc2">
      <div class="dc2-head">
        <span class="dc2-title">☁ 데이터 범위</span>
        <span class="dc2-sum">활성 <b>${active}</b>/${total}경기 · <b>${activeP.toLocaleString()}</b>/${totalP.toLocaleString()}투구</span>
        <span class="dc2-spacer"></span>
        <button class="dc2-mini" onclick="dashActivateAll(true)">현재 목록 켜기</button>
        <button class="dc2-mini" onclick="dashActivateAll(false)">끄기</button>
        <select id="dc2-preset" class="dc2-mini" onchange="onDc2Preset(this.value)" title="기간 프리셋">
          <option value="">📅 기간 ▾</option>
          <option value="30">최근 1개월</option>
          <option value="60">최근 2개월</option>
          <option value="90">최근 3개월</option>
          <option value="180">최근 6개월</option>
          <option value="all">전체 기간</option>
        </select>
        <span class="dc2-range"><input type="date" id="dc2-date-from" class="dc2-date" title="시작일"><span style="color:var(--muted)">~</span><input type="date" id="dc2-date-to" class="dc2-date" title="종료일"><button class="dc2-mini" onclick="activateDateRange()">적용</button></span>
        <button class="dc2-mini amber" onclick="openServerLibraryModal()">☁ 서버 관리</button>
      </div>
      <div class="dc2-body">${rowsHtml}</div>
    </div>`;
  };


  // V10.2: 카드 미니칩 — 로드된 그룹/페이즈가 다양할 때만 노출 (단일 그룹이면 숨김)
  window._dashChipText = function(g){
    // 그룹명 축약: "Season/시즌" 단어 제거 (FW Season → FW)
    let grp = String(g.groupName||g.categoryName||'').replace(/\s*(Season|시즌)\s*/gi,' ').replace(/\s+/g,' ').trim();
    let ph = g.phaseName||'';
    if(ph){
      ph = ph.replace(/정규\s*시즌/,'정규').replace(/포스트\s*시즌/,'포스트').replace(/Postseason/i,'포스트').replace(/Regular/i,'정규');
      return grp ? grp+' '+ph : ph;  // 예: "FW 정규"
    }
    return grp;
  };
  wbdContext.renderGameDashboard = function(){
    const _pset=new Set(wbdContext.GAMES.map(g=>g.phaseId||'').filter(Boolean));
    window._dashPhaseVariety=_pset.size;
    window._dashChip=true;  // V10.2: 시즌/그룹 칩 항상 표시 (어떤 경기인지 식별)
    wbdContext._populateDashMetaFilters();
    wbdContext._populateDashTeamFilter();
    const grid=document.getElementById('dashboard-grid'); if(!grid)return;
    const catFilter=(document.getElementById('dash-category-filter')||{}).value||'';
    const groupFilter=(document.getElementById('dash-group-filter')||{}).value||'';
    const phaseFilter=(document.getElementById('dash-phase-filter')||{}).value||'';
    const teamFilter=(document.getElementById('dash-team-filter')||{}).value||'';
    const sortMode=(document.getElementById('dash-sort')||{}).value||'date-desc';
    const search=((document.getElementById('dash-search')||{}).value||'').toLowerCase().trim();
    let list=wbdContext.GAMES.slice().map(g=>({g,info:wbdContext._gameDisplayInfo(g)}));
    if(catFilter) list=list.filter(x=>(x.g.category||'local')===catFilter);
    if(groupFilter) list=list.filter(x=>(x.g.groupId||'local')===groupFilter);
    if(phaseFilter) list=list.filter(x=>(x.g.phaseId||'')===phaseFilter);
    if(teamFilter) list=list.filter(x=>x.info.teamA===teamFilter||x.info.teamB===teamFilter);
    if(search) list=list.filter(x=>(x.info.teamA+' '+x.info.teamB+' '+x.info.title+' '+x.g.name+' '+wbdContext._gameCategoryLabel(x.g)+' '+wbdContext._gameGroupLabel(x.g)+' '+phaseLabel(x.g)).toLowerCase().includes(search));
    list.sort((a,b)=>{
      const da=a.info.date||'', db=b.info.date||'';
      return sortMode==='date-asc'?da.localeCompare(db):db.localeCompare(da);
    });
    grid.innerHTML=list.map(({g,info})=>{
      const isActive=wbdContext.activeGameIds.has(g.id);
      const {totalA,totalB,hA,hB}=wbdContext._computeInningScores(g.pitches);
      const winA=totalA>totalB, winB=totalB>totalA;
      const aColor=winA?'#ff6b6b':winB?'#7b8796':'#cbd5e1';
      const bColor=winB?'#6bb5ff':winA?'#7b8796':'#cbd5e1';
      const activeStyle=isActive?'border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.32),0 7px 18px rgba(0,0,0,.18);opacity:1':'border-color:var(--border);opacity:.50';
      const title=info.knownTeams?`${info.teamA} vs ${info.teamB}`:info.title;
      const label=[wbdContext._gameGroupLabel(g), phaseLabel(g)].filter(Boolean).join(' · ');
      return `<div title="${esc(wbdContext._gameCategoryLabel(g)+' / '+label+' · '+title)}" style="background:var(--card);${activeStyle};border-radius:6px;padding:10px 12px;transition:all .15s;position:relative">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:10px;color:${isActive?'var(--amber)':'var(--muted)'};font-family:var(--mono)"><input type="checkbox" ${isActive?'checked':''} onchange="toggleGame('${g.id}')" style="cursor:pointer;accent-color:var(--amber)"><span style="white-space:nowrap">${info.date||'—'}</span>${window._dashChip?`<span style="font-size:9px;color:var(--muted);border:1px solid var(--border);border-radius:3px;padding:0 5px;max-width:112px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(window._dashChipText(g))}</span>`:''}</label>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button onclick="openGameScoreboard('${g.id}')" title="스코어보드 보기" style="background:transparent;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:3px 8px;border-radius:3px;cursor:pointer;font-family:var(--cond);white-space:nowrap">📊 상세</button>
            <button onclick="removeGame('${g.id}')" title="목록에서 제거" style="background:transparent;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:3px 6px;border-radius:3px;cursor:pointer">✕</button>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span class="game-team-name" style="font-size:13px;color:${aColor};font-weight:${winA?800:600};max-width:210px">${winA?'🏆 ':''}${esc(info.teamA)}</span><span style="font-size:22px;font-family:var(--mono);color:${aColor};font-weight:${winA?800:600}">${totalA}</span></div><div style="display:flex;justify-content:space-between;align-items:center"><span class="game-team-name" style="font-size:13px;color:${bColor};font-weight:${winB?800:600};max-width:210px">${winB?'🏆 ':''}${esc(info.teamB)}</span><span style="font-size:22px;font-family:var(--mono);color:${bColor};font-weight:${winB?800:600}">${totalB}</span></div>
        <div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border);font-size:10px;color:var(--muted);font-family:var(--mono);display:flex;justify-content:space-between"><span>H ${hA}-${hB}</span><span>${g.pitches.length}투구</span></div>
      </div>`;
    }).join('');
    if(list.length===0) grid.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;grid-column:1/-1">조건에 맞는 경기가 없어요</div>';
    const activeCnt=list.filter(x=>wbdContext.activeGameIds.has(x.g.id)).length;
    const el=document.getElementById('dashboard-summary');
    if(el) el.textContent=`${activeCnt} / ${list.length} 경기 활성  ·  전체 ${wbdContext.GAMES.length}경기 · 활성 투구 ${wbdContext.G.length}개`;
  };

  wbdContext.dashActivateAll = function(on){
    const catFilter=(document.getElementById('dash-category-filter')||{}).value||'';
    const groupFilter=(document.getElementById('dash-group-filter')||{}).value||'';
    const phaseFilter=(document.getElementById('dash-phase-filter')||{}).value||'';
    const teamFilter=(document.getElementById('dash-team-filter')||{}).value||'';
    const search=((document.getElementById('dash-search')||{}).value||'').toLowerCase().trim();
    wbdContext.GAMES.forEach(g=>{
      const info=wbdContext._gameDisplayInfo(g);
      let match=true;
      if(catFilter&&(g.category||'local')!==catFilter)match=false;
      if(groupFilter&&(g.groupId||'local')!==groupFilter)match=false;
      if(phaseFilter&&(g.phaseId||'')!==phaseFilter)match=false;
      if(teamFilter&&info.teamA!==teamFilter&&info.teamB!==teamFilter)match=false;
      if(search&&!(info.teamA+' '+info.teamB+' '+info.title+' '+g.name+' '+wbdContext._gameCategoryLabel(g)+' '+wbdContext._gameGroupLabel(g)+' '+phaseLabel(g)).toLowerCase().includes(search))match=false;
      if(match){ if(on)wbdContext.activeGameIds.add(g.id); else wbdContext.activeGameIds.delete(g.id); }
    });
    runAfter();
  };

  // CSS는 맨 아래에서 강제로 추가해서 이전 스타일과 충돌하지 않게 함
  const css=document.createElement('style');
  css.textContent=`
    .dhf-hub{background:linear-gradient(135deg,rgba(9,23,42,.96),rgba(11,31,54,.88));border:1px solid var(--border);border-radius:12px;padding:18px;box-shadow:0 10px 30px rgba(0,0,0,.22)}
    .dhf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}.dhf-title{font-size:18px;font-weight:900;color:var(--amber);letter-spacing:.8px}.dhf-sub{font-size:12px;color:var(--muted);margin-top:4px}.dhf-actions{display:flex;gap:7px;flex-wrap:wrap}.dhf-btn{background:rgba(255,255,255,.035);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 11px;font-size:12px}.dhf-btn:hover{border-color:var(--amber);color:var(--amber)}.dhf-btn.primary{background:var(--amber);color:#111;border-color:var(--amber)}
    .dhf-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin:12px 0 16px}.dhf-kpis>div{background:rgba(3,12,24,.55);border:1px solid var(--border);border-radius:9px;padding:12px;text-align:center}.dhf-kpis span{display:block;font-size:10px;color:var(--muted);letter-spacing:.8px}.dhf-kpis b{display:block;font-family:var(--mono);font-size:25px;color:var(--amber);margin-top:4px}.dhf-kpis em{display:block;font-style:normal;font-size:10px;color:var(--muted);margin-top:2px}.dhf-label{font-size:11px;color:#88ccff;font-weight:800;letter-spacing:1px;margin:14px 0 8px;text-transform:uppercase}
    .dhf-cat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:10px}.dhf-cat,.dhf-group{background:rgba(5,13,25,.72);border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;transition:.15s}.dhf-cat:hover,.dhf-group:hover{border-color:rgba(245,166,35,.6)}.dhf-cat.active,.dhf-group.active{border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.25)}.dhf-cat-title,.dhf-group-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.dhf-cat-title b,.dhf-group-top b{color:var(--text);font-size:14px}.dhf-cat-title span,.dhf-group-top strong{font-family:var(--mono);color:var(--amber);font-size:13px}.dhf-cat-sub{font-size:11px;color:var(--muted);margin-top:5px}.dhf-progress{height:5px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden;margin-top:9px}.dhf-progress span{display:block;height:100%;background:linear-gradient(90deg,var(--amber),#39ff8a);border-radius:999px}.dhf-group-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:10px}.dhf-group-top span{display:block;color:var(--muted);font-size:10px;margin-top:2px}.dhf-phase-wrap{display:flex;flex-direction:column;gap:6px;margin-top:10px}.dhf-phase{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:7px;padding:7px 8px;cursor:pointer}.dhf-phase.active{border-color:#88ccff;background:rgba(136,204,255,.08)}.dhf-phase span{flex:1;font-size:12px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dhf-phase em{font-style:normal;font-family:var(--mono);font-size:11px;color:var(--amber)}.dhf-phase button{background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:5px;padding:3px 7px;font-size:10px}.dhf-badge{font-size:9px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:2px 7px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    @media(max-width:900px){.dhf-kpis{grid-template-columns:repeat(2,1fr)}.dhf-group-grid{grid-template-columns:1fr}.dhf-cat-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);
})();

// Original index.html:36374
(function(){
  function pad2(n){return String(n).padStart(2,'0');}
  function shortFile(v){return String(v||'').split(/[\\/]/).pop()||String(v||'');}
  function noExt(v){return String(v||'').replace(/\.(csv|txt)$/i,'');}
  function niceTeam(s){
    s=String(s||'')
      .replace(/^_+|_+$/g,'')
      .replace(/[_\-]+/g,' ')
      .replace(/\s+/g,' ')
      .trim();
    if(!s)return '';
    return s.replace(/\b[a-z]/g,c=>c.toUpperCase());
  }
  function looksLikeNoiseToken(token){
    const t=String(token||'').replace(/[^A-Za-z0-9]/g,'');
    if(!/^[A-Za-z0-9]{8,24}$/.test(t))return false;
    // WBD 파일 뒤에 붙는 랜덤 id는 보통 숫자가 섞이거나, 대소문자가 비정상적으로 섞임
    if(/\d/.test(t))return true;
    const upp=(t.match(/[A-Z]/g)||[]).length;
    const low=(t.match(/[a-z]/g)||[]).length;
    return upp>=2 && low>=2;
  }
  function cleanTail(raw){
    let s=String(raw||'').trim();
    // Windows/GitHub 중복 업로드 이름: " (1)", "_copy", "- copy 2" 같은 꼬리 제거
    s=s.replace(/(?:[_\s\-]*\(\d+\))+$/g,'');
    s=s.replace(/(?:[_\s\-]+copy(?:[_\s\-]*\d+)?)$/i,'');
    s=s.replace(/(?:[_\s\-]+복사본(?:[_\s\-]*\d+)?)$/i,'');
    // 마지막 단어/언더바 조각이 랜덤 토큰이면 제거. 팀명 단어는 최대한 보존.
    let parts=s.split(/[_\s]+/).filter(Boolean);
    while(parts.length>1 && looksLikeNoiseToken(parts[parts.length-1])) parts.pop();
    return parts.join('_');
  }

  window._wbdCleanTeamTail = cleanTail;

  window._parseGameName = function(filename){
    const file=shortFile(filename);
    const base=noExt(file).replace(/(?:[_\s\-]*\(\d+\))+$/g,'');

    // league_2026_02_27_team_a_vs_team_b_RANDOMID(1)
    let m=base.match(/^(?:league_)?(\d{4})[_\-](\d{1,2})[_\-](\d{1,2})[_\-]+(.+?)_vs_+(.+)$/i);
    if(m){
      const y=m[1], mo=pad2(+m[2]), d=pad2(+m[3]);
      return {date:`${y}-${mo}-${d}`,teamA:niceTeam(cleanTail(m[4])),teamB:niceTeam(cleanTail(m[5]))};
    }

    // team_a_vs_team_b_2026_02_27_RANDOMID
    m=base.match(/^(.+?)_vs_+(.+?)[_\-]+(\d{4})[_\-](\d{1,2})[_\-](\d{1,2})(.*)$/i);
    if(m){
      const y=m[3], mo=pad2(+m[4]), d=pad2(+m[5]);
      return {date:`${y}-${mo}-${d}`,teamA:niceTeam(cleanTail(m[1])),teamB:niceTeam(cleanTail(m[2]))};
    }

    // 날짜만 있는 파일
    m=base.match(/(?:league_)?(\d{4})[_\-]?(\d{2})[_\-]?(\d{2})/);
    if(m){
      const y=m[1], mo=m[2], d=m[3];
      if(+mo>=1&&+mo<=12&&+d>=1&&+d<=31&&+y>=2020&&+y<=2099){
        return {date:`${y}-${mo}-${d}`,teamA:'Team A',teamB:'Team B'};
      }
    }

    // YYMMDD 시작
    m=base.match(/^(\d{6,8})(?:[_\-]|$)/);
    if(m){
      const digits=m[1];
      const yy=+digits.slice(0,2), mm=+digits.slice(2,4), dd=+digits.slice(4,6);
      if(mm>=1&&mm<=12&&dd>=1&&dd<=31){
        return {date:`${2000+yy}-${pad2(mm)}-${pad2(dd)}`,teamA:'Team A',teamB:'Team B'};
      }
    }
    return {date:'',teamA:'Team A',teamB:'Team B'};
  };

  window._gameDisplayInfo = function(g){
    const sourceName=(g&&((g.path&&shortFile(g.path))||g.name))||'';
    const raw=window._parseGameName(sourceName);
    let a=wbdContext._normalizeTeam(raw.teamA), b=wbdContext._normalizeTeam(raw.teamB);
    const date=raw.date||'';
    const file=noExt(shortFile(sourceName || (g&&g.name)||''));
    const known=!!(a&&b&&raw.teamA!=='Team A'&&raw.teamB!=='Team B');
    if(!a)a='레드';
    if(!b)b='블루';
    return {date,teamA:a,teamB:b,knownTeams:known,title:known?`${a} vs ${b}`:file};
  };

  window._getGameDateValue = function(g){
    const sourceName=(g&&((g.path&&shortFile(g.path))||g.name))||'';
    const d=(window._parseGameName(sourceName)||{}).date||'';
    return /^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T00:00:00').getTime():0;
  };

  // 이미 로드된 화면에서 캐시된 표시를 즉시 갱신할 수 있게 한 번 더 렌더
  try{
    if(typeof wbdContext.renderGameDashboard==='function') setTimeout(()=>wbdContext.renderGameDashboard(),0);
    if(typeof renderDataHub==='function') setTimeout(()=>renderDataHub(),0);
  }catch(e){}
})();

// Original index.html:36480
(function(){
  let filterTimer=0;
  let slowHomeTimer=0;
  let refreshSeq=0;

  function idleRun(fn){
    if('requestIdleCallback' in window){
      requestIdleCallback(fn,{timeout:650});
    }else{
      requestAnimationFrame(()=>setTimeout(fn,0));
    }
  }
  function phaseLabelSafe(g){
    try{return (window._gamePhaseLabel?window._gamePhaseLabel(g):(g.phaseName||g.phaseId||''))||'';}catch(e){return g.phaseName||g.phaseId||'';}
  }
  function matchScope(g, category, groupId, phaseId){
    if(category && (g.category||'local')!==category) return false;
    if(groupId && (g.groupId||'local')!==groupId) return false;
    if(phaseId && (g.phaseId||'')!==phaseId) return false;
    return true;
  }
  function setPending(on){
    try{
      document.body.classList.toggle('wbd-filter-pending',!!on);
      const el=document.getElementById('dashboard-summary');
      if(el && on) el.textContent='선택 반영 준비 중...';
    }catch(e){}
  }
  function renderHomeFastThenSlow(){
    // 데이터 컨트롤/경기 대시보드는 먼저 갱신해서 사용자가 선택 상태를 바로 확인하게 함
    try{wbdContext.renderGamesOverview();}catch(e){console.warn(e);}
    try{wbdContext.renderGameDashboard();}catch(e){console.warn(e);}

    clearTimeout(slowHomeTimer);
    slowHomeTimer=setTimeout(()=>{
      try{wbdContext.renderFavoritesSection&&wbdContext.renderFavoritesSection();}catch(e){}
      try{wbdContext.renderScoreboard&&wbdContext.renderScoreboard();}catch(e){}
      try{wbdContext.renderStatCards&&wbdContext.renderStatCards();}catch(e){}
      try{wbdContext.renderRosters&&wbdContext.renderRosters();}catch(e){}
      try{wbdContext.renderTimeline&&wbdContext.renderTimeline();}catch(e){}
      window._homeKey = wbdContext.GAMES.length + '_' + wbdContext.G.length;  // 홈 재진입 스킵 키 동기화
    },180);
  }
  function applyActiveRefresh(){
    const mySeq=++refreshSeq;
    setPending(true);
    idleRun(()=>{
      // 더 최신 예약이 있으면 이번 작업은 버림
      if(mySeq!==refreshSeq) return;
      const active=document.querySelector('.page.active');
      const isHome=active && active.id==='page-home';
      try{
        if(window._teamScoutLeagueCache) window._teamScoutLeagueCache=null;
        wbdContext.rebuildG();
        wbdContext.updateNavInfo();
        wbdContext.renderGamesList();
        wbdContext.populateSelects();
        if(isHome) renderHomeFastThenSlow();
        else wbdContext.renderActiveContent();
      }catch(e){
        console.error('active refresh failed',e);
      }finally{
        setPending(false);
        // V10.2 perf: 활성 변경으로 무효화된 기록실/수비 캐시를 유휴 시간에 재워밍
        const _warm=()=>{ if(mySeq!==refreshSeq) return; try{ wbdContext._computeDefenseData(); wbdContext._computeRecordsData(); wbdContext._aggregatePitchTypeStats(); }catch(e){} };
        if(typeof requestIdleCallback==='function') requestIdleCallback(_warm,{timeout:5000});
        else setTimeout(_warm,1500);
      }
    });
  }
  window._wbdScheduleActiveRefresh=function(){
    clearTimeout(filterTimer);
    setPending(true);
    filterTimer=setTimeout(applyActiveRefresh,120);
  };

  window.activateMetaScope=function(category, groupId, phaseId, on){
    if(typeof phaseId==='boolean'){on=phaseId; phaseId='';}
    wbdContext.GAMES.forEach(g=>{
      if(matchScope(g,category,groupId,phaseId)){
        if(on) wbdContext.activeGameIds.add(g.id);
        else wbdContext.activeGameIds.delete(g.id);
      }
    });
    window._wbdScheduleActiveRefresh();
  };

  window.activateOnlyMetaScope=function(category, groupId, phaseId){
    wbdContext.activeGameIds.clear();
    wbdContext.GAMES.forEach(g=>{if(matchScope(g,category,groupId,phaseId)) wbdContext.activeGameIds.add(g.id);});
    window._wbdScheduleActiveRefresh();
  };

  window._toggleGroupActive=function(groupId, checked){window.activateMetaScope('',groupId,'',checked);};
  window._toggleCategoryActive=function(category, checked){window.activateMetaScope(category,'','',checked);};

  window.toggleGame=function(gid){
    if(wbdContext.activeGameIds.has(gid)) wbdContext.activeGameIds.delete(gid);
    else wbdContext.activeGameIds.add(gid);
    window._wbdScheduleActiveRefresh();
  };

  window.dashActivateAll=function(on){
    const catFilter=(document.getElementById('dash-category-filter')||{}).value||'';
    const groupFilter=(document.getElementById('dash-group-filter')||{}).value||'';
    const phaseFilter=(document.getElementById('dash-phase-filter')||{}).value||'';
    const teamFilter=(document.getElementById('dash-team-filter')||{}).value||'';
    const search=((document.getElementById('dash-search')||{}).value||'').toLowerCase().trim();
    wbdContext.GAMES.forEach(g=>{
      const info=wbdContext._gameDisplayInfo(g);
      let match=true;
      if(catFilter&&(g.category||'local')!==catFilter)match=false;
      if(groupFilter&&(g.groupId||'local')!==groupFilter)match=false;
      if(phaseFilter&&(g.phaseId||'')!==phaseFilter)match=false;
      if(teamFilter&&info.teamA!==teamFilter&&info.teamB!==teamFilter)match=false;
      if(search&&!(info.teamA+' '+info.teamB+' '+info.title+' '+g.name+' '+wbdContext._gameCategoryLabel(g)+' '+wbdContext._gameGroupLabel(g)+' '+phaseLabelSafe(g)).toLowerCase().includes(search))match=false;
      if(match){ if(on)wbdContext.activeGameIds.add(g.id); else wbdContext.activeGameIds.delete(g.id); }
    });
    window._wbdScheduleActiveRefresh();
  };

  window.activateRecentDays=function(days){
    const dates=wbdContext.GAMES.map(wbdContext._getGameDateValue).filter(Boolean);
    if(!dates.length){
      if(typeof wbdContext._toast==='function') wbdContext._toast('날짜 정보 없음','파일명에서 날짜를 찾지 못했어요.','#ffb833',3000);
      return;
    }
    const max=Math.max(...dates), cut=max-days*24*3600*1000;
    wbdContext.activeGameIds.clear();
    wbdContext.GAMES.forEach(g=>{const t=wbdContext._getGameDateValue(g); if(t&&t>=cut)wbdContext.activeGameIds.add(g.id);});
    window._wbdScheduleActiveRefresh();
  };

  const css=document.createElement('style');
  css.textContent=`
    body.wbd-filter-pending .dhf-hub{position:relative}
    body.wbd-filter-pending .dhf-hub:after{content:'선택 반영 중...';position:absolute;right:14px;top:12px;font-size:10px;font-family:var(--mono);color:var(--amber);background:rgba(0,0,0,.35);border:1px solid var(--border);border-radius:999px;padding:4px 9px;pointer-events:none}
    body.wbd-filter-pending .dhf-group, body.wbd-filter-pending .dhf-cat{transition:none}
  `;
  document.head.appendChild(css);
})();
}
