/** data-dashboard: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:35681
wbdContext._wbdEscHtml = function _wbdEscHtml(v){return String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));};

// Original index.html:35682
wbdContext._wbdEscJs = function _wbdEscJs(v){return String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,' ');};

// Original index.html:35683
wbdContext._wbdShortFileName = function _wbdShortFileName(v){return String(v||'').split(/[\\/]/).pop()||String(v||'');};

// Original index.html:35684
wbdContext._wbdNoExt = function _wbdNoExt(v){return String(v||'').replace(/\.(csv|txt)$/i,'');};

// Original index.html:35685
wbdContext._wbdNicePart = function _wbdNicePart(s){
  s=String(s||'').replace(/^_+|_+$/g,'').replace(/[_\-]+/g,' ').trim();
  if(!s)return '';
  return s.replace(/\b[a-z]/g,c=>c.toUpperCase());
};

// Original index.html:35692
wbdContext._parseGameName = function _parseGameName(filename){
  const original=String(filename||'');
  const file=wbdContext._wbdShortFileName(original);
  const base=wbdContext._wbdNoExt(file);
  const pretty=wbdContext._wbdNicePart;
  const pad=n=>String(n).padStart(2,'0');

  // 표준: league_2025_11_14_team_a_vs_team_b_hash(.txt/.csv 생략 가능)
  let m=base.match(/^(?:league_)?(\d{4})[_\-](\d{1,2})[_\-](\d{1,2})[_\-]+(.+?)_vs_+(.+?)(?:_+[A-Za-z0-9]{6,})?$/i);
  if(m){
    const y=m[1], mo=pad(+m[2]), d=pad(+m[3]);
    return {date:`${y}-${mo}-${d}`,teamA:pretty(m[4]),teamB:pretty(m[5])};
  }
  // teamA_vs_teamB_2025_11_14 같은 변형도 보조 지원
  m=base.match(/^(.+?)_vs_+(.+?)[_\-]+(\d{4})[_\-](\d{1,2})[_\-](\d{1,2})(?:_+[A-Za-z0-9]{6,})?$/i);
  if(m){
    const y=m[3], mo=pad(+m[4]), d=pad(+m[5]);
    return {date:`${y}-${mo}-${d}`,teamA:pretty(m[1]),teamB:pretty(m[2])};
  }
  // 날짜만 있는 경우
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
      return {date:`${2000+yy}-${pad(mm)}-${pad(dd)}`,teamA:'Team A',teamB:'Team B'};
    }
  }
  return {date:'',teamA:'Team A',teamB:'Team B'};
};

// Original index.html:35731
wbdContext._gameDisplayInfo = function _gameDisplayInfo(g){
  const raw=wbdContext._parseGameName(g.name || g.path || '');
  const rawA=raw.teamA, rawB=raw.teamB;
  let a=wbdContext._normalizeTeam(rawA), b=wbdContext._normalizeTeam(rawB);
  const known=!!(a&&b);
  const date=raw.date||'';
  const file=wbdContext._wbdNoExt(wbdContext._wbdShortFileName(g.name||g.path||''));
  if(!a)a='레드';
  if(!b)b='블루';
  return {date,teamA:a,teamB:b,knownTeams:known,title:known?`${a} vs ${b}`:file};
};

// Original index.html:35742
wbdContext._getGameDateValue = function _getGameDateValue(g){
  const d=(wbdContext._parseGameName(g.name||g.path||'')||{}).date||'';
  return /^\d{4}-\d{2}-\d{2}$/.test(d)?new Date(d+'T00:00:00').getTime():0;
};

// Original index.html:35746
wbdContext._gameCategoryLabel = function _gameCategoryLabel(g){return g.categoryName||g.category||(g.source==='server'?'서버':'직접 추가');};

// Original index.html:35747
wbdContext._gameGroupLabel = function _gameGroupLabel(g){return g.groupName||g.groupId||(g.source==='server'?'서버':'직접 추가');};

// Original index.html:35750
wbdContext._fetchServerGroupBundle = async function _fetchServerGroupBundle(g){
  if(!g.bundle || !g.bundle.path) return null;
  const res=await fetch(g.bundle.path,{cache:'default'});
  if(!res.ok)throw new Error(`bundle HTTP ${res.status}`);
  const bundle=await res.json();
  const files=Array.isArray(bundle.files)?bundle.files:[];
  return files.map((f,i)=>{
    const path=f.path||'';
    const base=wbdContext._wbdShortFileName(path) || f.fileName || f.name || `server_${i+1}.csv`;
    return {ok:true,text:String(f.text||''),label:base,path,meta:wbdContext._fileMetaFromGroup(g,{...f,path})};
  }).filter(x=>x.text);
};

// Original index.html:35763
wbdContext._runAfterActiveChange = function _runAfterActiveChange(){
  wbdContext.rebuildG();
  wbdContext.updateNavInfo();
  wbdContext.renderGamesList();
  wbdContext.populateSelects();
  wbdContext.renderActiveContent();
};

// Original index.html:35770
wbdContext._setDashFilters = function _setDashFilters(cat, group){
  const cs=document.getElementById('dash-category-filter');
  const gs=document.getElementById('dash-group-filter');
  if(cs)cs.value=cat||'';
  if(gs)gs.value=group||'';
  wbdContext.renderGameDashboard();
  wbdContext.renderGamesOverview();
};

// Original index.html:35778
wbdContext.setDashboardGroupFilter = function setDashboardGroupFilter(gid){
  const g=wbdContext.GAMES.find(x=>(x.groupId||'local')===gid);
  wbdContext._setDashFilters(g?g.category||'local':'', gid||'');
};

// Original index.html:35782
wbdContext._applyActiveScope = function _applyActiveScope(predicate, mode){
  if(mode==='only')wbdContext.activeGameIds.clear();
  wbdContext.GAMES.forEach(g=>{
    if(predicate(g)){
      if(mode==='off')wbdContext.activeGameIds.delete(g.id);
      else wbdContext.activeGameIds.add(g.id);
    }
  });
  wbdContext._runAfterActiveChange();
};

// Original index.html:35792
wbdContext.activateMetaScope = function activateMetaScope(category, groupId, on){
  wbdContext._applyActiveScope(g=>(!category||(g.category||'local')===category)&&(!groupId||(g.groupId||'local')===groupId), on?'on':'off');
};

// Original index.html:35795
wbdContext.activateOnlyMetaScope = function activateOnlyMetaScope(category, groupId){
  wbdContext._applyActiveScope(g=>(!category||(g.category||'local')===category)&&(!groupId||(g.groupId||'local')===groupId), 'only');
};

// Original index.html:35799
wbdContext._setRecentDaysActive = function _setRecentDaysActive(days){
  const dates=wbdContext.GAMES.map(wbdContext._getGameDateValue).filter(Boolean);
  if(!dates.length) return false;
  const max=Math.max(...dates), cut=max-days*24*3600*1000;
  wbdContext.activeGameIds.clear();
  wbdContext.GAMES.forEach(g=>{const t=wbdContext._getGameDateValue(g); if(t&&t>=cut)wbdContext.activeGameIds.add(g.id);});
  return true;
};

// Original index.html:35807
wbdContext.activateRecentDays = function activateRecentDays(days){
  if(!wbdContext._setRecentDaysActive(days)){wbdContext._toast('날짜 정보 없음','파일명에서 날짜를 찾지 못했어요.','#ffb833',3000);return;}
  wbdContext._toast('📅 기간 적용', `최근 ${days>=30&&days%30===0?(days/30)+'개월':days+'일'} 경기만 활성화했어요.`, '#88ccff', 2600);
  wbdContext._runAfterActiveChange();
};

// Original index.html:35813
wbdContext.activateDateRange = function activateDateRange(fromStr, toStr){
  fromStr=fromStr||(document.getElementById('dc2-date-from')||{}).value;
  toStr=toStr||(document.getElementById('dc2-date-to')||{}).value;
  if(!fromStr && !toStr){wbdContext._toast('구간 미지정','시작일 또는 종료일을 입력해주세요.','#ffb833',2600);return;}
  const from=fromStr?new Date(fromStr+'T00:00:00').getTime():-Infinity;
  const to=toStr?new Date(toStr+'T23:59:59').getTime():Infinity;
  if(from>to){wbdContext._toast('구간 오류','시작일이 종료일보다 늦어요.','#ffb833',2600);return;}
  let n=0;
  wbdContext.activeGameIds.clear();
  wbdContext.GAMES.forEach(g=>{const t=wbdContext._getGameDateValue(g); if(t!=null&&t>=from&&t<=to){wbdContext.activeGameIds.add(g.id);n++;}});
  wbdContext._toast('📅 구간 적용', `${fromStr||'처음'} ~ ${toStr||'끝'} · ${n}경기 활성화`, n?'#88ccff':'#ffb833', 2800);
  wbdContext._runAfterActiveChange();
};

// Original index.html:35827
wbdContext.onDc2Preset = function onDc2Preset(v){
  if(!v) return;
  if(v==='all'){ wbdContext.GAMES.forEach(g=>wbdContext.activeGameIds.add(g.id)); wbdContext._toast('📅 전체 활성','모든 경기를 활성화했어요.','#88ccff',2400); wbdContext._runAfterActiveChange(); }
  else wbdContext.activateRecentDays(+v);
  const s=document.getElementById('dc2-preset'); if(s)s.value='';
};

// Original index.html:35833
wbdContext._groupActiveMode = function _groupActiveMode(games){
  const active=games.filter(g=>wbdContext.activeGameIds.has(g.id)).length;
  if(active===0)return 'none';
  if(active===games.length)return 'all';
  return 'partial';
};

// Original index.html:35839
wbdContext._toggleGroupActive = function _toggleGroupActive(groupId, checked){wbdContext.activateMetaScope('', groupId, checked);};

// Original index.html:35840
wbdContext._toggleCategoryActive = function _toggleCategoryActive(category, checked){wbdContext.activateMetaScope(category, '', checked);};

// Original index.html:35842
wbdContext.renderGamesOverview = function renderGamesOverview(){
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
    if(!cats.has(cat))cats.set(cat,{id:cat,name:catName,total:0,active:0});
    const c=cats.get(cat); c.total++; if(wbdContext.activeGameIds.has(g.id))c.active++;
    const gid=g.groupId||'local';
    const gname=g.groupName||(gid==='local'?'직접 추가':gid);
    if(!groups.has(gid))groups.set(gid,{id:gid,name:gname,category:cat,categoryName:catName,total:0,active:0,pitches:0,games:[]});
    const gr=groups.get(gid); gr.total++; gr.pitches+=g.pitches.length; gr.games.push(g); if(wbdContext.activeGameIds.has(g.id))gr.active++;
  });
  const order=['league','scrim','independent','event','etc','local'];
  const catEntries=[...cats.values()].sort((a,b)=>(order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id))||a.name.localeCompare(b.name,'ko'));
  const groupEntries=[...groups.values()].sort((a,b)=>String(a.categoryName).localeCompare(String(b.categoryName),'ko')||String(a.name).localeCompare(String(b.name),'ko'));
  const multiCat = catEntries.length>1;
  
  const rowsHtml = catEntries.map(c=>{
    const list = groupEntries.filter(g=>g.category===c.id);
    const eyebrow = multiCat ? `<div class="dc2-eyebrow"><span>${wbdContext._wbdEscHtml(c.name)}</span><span class="ct">${c.active}/${c.total}</span><button class="dc2-mini" onclick="activateOnlyMetaScope('${wbdContext._wbdEscJs(c.id)}','')">이것만</button></div>` : '';
    const rows = list.map(g=>{
      const mode=wbdContext._groupActiveMode(g.games);
      const checked=mode==='all'?'checked':'';
      const half=mode==='partial';
      const pct=g.total?Math.round(g.active/g.total*100):0;
      const viewing=((document.getElementById('dash-group-filter')||{}).value||'')===g.id;
      return `<div class="dc2-row ${viewing?'viewing':''}">
        <input type="checkbox" ${checked} ${half?'data-half="1"':''} onchange="_toggleGroupActive('${wbdContext._wbdEscJs(g.id)}',this.checked)" title="이 그룹 활성/비활성">
        <span class="nm" title="${wbdContext._wbdEscHtml(g.name)} · ${g.pitches.toLocaleString()}투구 — 클릭하면 아래 목록을 이 그룹으로 필터" onclick="setDashboardGroupFilter('${wbdContext._wbdEscJs(g.id)}')">${wbdContext._wbdEscHtml(g.name)}</span>
        <span class="bar"><i style="width:${pct}%"></i></span>
        <span class="ct">${g.active}/${g.total}</span>
        <button class="dc2-mini" onclick="activateOnlyMetaScope('','${wbdContext._wbdEscJs(g.id)}')">이것만</button>
      </div>`;
    }).join('');
    return eyebrow + rows;
  }).join('');
  
  el.innerHTML=`<div class="dc2">
    <div class="dc2-head">
      <span class="dc2-title">☁ 데이터 범위</span>
      <span class="dc2-sum">활성 <b>${active}</b>/${total}경기 · <b>${activeP.toLocaleString()}</b>/${totalP.toLocaleString()}투구</span>
      <span class="dc2-spacer"></span>
      <button class="dc2-mini" onclick="dashActivateAll(true)">현재 목록 켜기</button>
      <button class="dc2-mini" onclick="dashActivateAll(false)">끄기</button>
      <select id="dc2-preset-a" class="dc2-mini" onchange="onDc2Preset(this.value)" title="기간 프리셋">
        <option value="">📅 기간 ▾</option>
        <option value="30">최근 1개월</option>
        <option value="60">최근 2개월</option>
        <option value="90">최근 3개월</option>
        <option value="180">최근 6개월</option>
        <option value="all">전체 기간</option>
      </select>
      <span class="dc2-range"><input type="date" id="dc2-date-from-a" class="dc2-date" title="시작일"><span style="color:var(--muted)">~</span><input type="date" id="dc2-date-to-a" class="dc2-date" title="종료일"><button class="dc2-mini" onclick="activateDateRange((document.getElementById('dc2-date-from-a')||{}).value,(document.getElementById('dc2-date-to-a')||{}).value)">적용</button></span>
      <button class="dc2-mini amber" onclick="openServerLibraryModal()">☁ 서버 관리</button>
    </div>
    <div class="dc2-body">${rowsHtml}</div>
  </div>`;
};

// Original index.html:35909
wbdContext._populateDashTeamFilter = function _populateDashTeamFilter(){
  const sel=document.getElementById('dash-team-filter');
  if(!sel)return;
  const prev=sel.value;
  const teams=new Set();
  wbdContext.GAMES.forEach(g=>{
    const info=wbdContext._gameDisplayInfo(g);
    if(info.knownTeams){teams.add(info.teamA);teams.add(info.teamB);}
  });
  const sorted=[...teams].sort((a,b)=>String(a).localeCompare(String(b),'ko'));
  sel.innerHTML='<option value="">전체</option>'+sorted.map(t=>`<option value="${wbdContext._wbdEscHtml(t)}">${wbdContext._wbdEscHtml(t)}</option>`).join('');
  if(prev&&sorted.includes(prev))sel.value=prev;
};

// Original index.html:35923
wbdContext.renderGameDashboard = function renderGameDashboard(){
  wbdContext._populateDashMetaFilters();
  wbdContext._populateDashTeamFilter();
  if(typeof wbdContext._renderRoundFilterBar==='function') wbdContext._renderRoundFilterBar();
  const grid=document.getElementById('dashboard-grid');
  if(!grid)return;
  const catFilter=(document.getElementById('dash-category-filter')||{}).value||'';
  const groupFilter=(document.getElementById('dash-group-filter')||{}).value||'';
  const teamFilter=(document.getElementById('dash-team-filter')||{}).value||'';
  const sortMode=(document.getElementById('dash-sort')||{}).value||'date-desc';
  const search=((document.getElementById('dash-search')||{}).value||'').toLowerCase().trim();
  let list=wbdContext.GAMES.slice().map(g=>({g,info:wbdContext._gameDisplayInfo(g)}));
  if(catFilter)list=list.filter(x=>(x.g.category||'local')===catFilter);
  if(groupFilter)list=list.filter(x=>(x.g.groupId||'local')===groupFilter);
  if(teamFilter)list=list.filter(x=>x.info.teamA===teamFilter||x.info.teamB===teamFilter);
  if(search)list=list.filter(x=>(x.info.teamA+' '+x.info.teamB+' '+x.info.title+' '+x.g.name+' '+wbdContext._gameCategoryLabel(x.g)+' '+wbdContext._gameGroupLabel(x.g)).toLowerCase().includes(search));
  list.sort((a,b)=>{
    const da=a.info.date||'', db=b.info.date||'';
    if(da!==db)return sortMode==='date-asc'?da.localeCompare(db):db.localeCompare(da);
    return String(a.info.title).localeCompare(String(b.info.title),'ko');
  });
  grid.style.gridTemplateColumns='repeat(auto-fill,minmax(280px,1fr))';
  grid.style.maxHeight='520px';
  grid.innerHTML=list.map(({g,info})=>{
    const isActive=wbdContext.activeGameIds.has(g.id);
    const {totalA,totalB,hA,hB}=wbdContext._computeInningScores(g.pitches);
    const winA=totalA>totalB, winB=totalB>totalA;
    const aColor=winA?'#ff6b6b':winB?'#7b8796':'#cbd5e1';
    const bColor=winB?'#6bb5ff':winA?'#7b8796':'#cbd5e1';
    const activeStyle=isActive?'border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.32),0 7px 18px rgba(0,0,0,.18);opacity:1':'border-color:var(--border);opacity:.50';
    const title=info.knownTeams?`${info.teamA} vs ${info.teamB}`:info.title;
    return `<div style="background:var(--card);border:1px solid var(--border);${activeStyle};border-radius:10px;padding:11px 12px;transition:all .15s;position:relative;min-height:128px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:6px">
        <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:11px;color:${isActive?'var(--amber)':'var(--muted)'};font-family:var(--mono);min-width:92px">
          <input type="checkbox" ${isActive?'checked':''} onchange="toggleGame('${g.id}')" style="cursor:pointer;accent-color:var(--amber)">${info.date||'날짜 없음'}
        </label>
        <span title="${wbdContext._wbdEscHtml(wbdContext._gameCategoryLabel(g)+' / '+wbdContext._gameGroupLabel(g)+' · '+title)}" style="font-size:9.5px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px;border:1px solid var(--border);border-radius:3px;padding:1px 6px">${wbdContext._wbdEscHtml(wbdContext._gameGroupLabel(g))}</span>
        <button onclick="openGameScoreboard('${g.id}')" title="스코어보드 보기" class="dhf-btn" style="padding:3px 8px;font-size:10px">상세</button>
      </div>
      ${info.knownTeams?`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span class="game-team-name" style="font-size:13px;color:${aColor};font-weight:${winA?800:600};max-width:210px">${winA?'🏆 ':''}${wbdContext._wbdEscHtml(info.teamA)}</span><span style="font-size:22px;font-family:var(--mono);color:${aColor};font-weight:${winA?800:600}">${totalA}</span></div><div style="display:flex;justify-content:space-between;align-items:center"><span class="game-team-name" style="font-size:13px;color:${bColor};font-weight:${winB?800:600};max-width:210px">${winB?'🏆 ':''}${wbdContext._wbdEscHtml(info.teamB)}</span><span style="font-size:22px;font-family:var(--mono);color:${bColor};font-weight:${winB?800:600}">${totalB}</span></div>`:`<div style="font-size:13px;color:var(--text);font-weight:800;line-height:1.35;height:36px;overflow:hidden">${wbdContext._wbdEscHtml(info.title)}</div><div style="margin-top:4px;font-size:11px;color:var(--muted)">스코어 ${totalA} : ${totalB}</div>`}
      <div style="margin-top:8px;padding-top:7px;border-top:1px solid var(--border);font-size:10px;color:var(--muted);font-family:var(--mono);display:flex;justify-content:space-between"><span>H ${hA}-${hB}</span><span>${g.pitches.length}투구</span></div>
    </div>`;
  }).join('');
  if(list.length===0)grid.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px;grid-column:1/-1">조건에 맞는 경기가 없어요</div>';
  const activeCnt=list.filter(x=>wbdContext.activeGameIds.has(x.g.id)).length;
  const el=document.getElementById('dashboard-summary');
  if(el)el.textContent=`${activeCnt} / ${list.length} 경기 활성  ·  전체 ${wbdContext.GAMES.length}경기 · 활성 투구 ${wbdContext.G.length}개`;
};

// Original index.html:35972
wbdContext.dashActivateAll = function dashActivateAll(on){
  const catFilter=(document.getElementById('dash-category-filter')||{}).value||'';
  const groupFilter=(document.getElementById('dash-group-filter')||{}).value||'';
  const teamFilter=(document.getElementById('dash-team-filter')||{}).value||'';
  const search=((document.getElementById('dash-search')||{}).value||'').toLowerCase().trim();
  wbdContext.GAMES.forEach(g=>{
    const info=wbdContext._gameDisplayInfo(g);
    let match=true;
    if(catFilter&&(g.category||'local')!==catFilter)match=false;
    if(groupFilter&&(g.groupId||'local')!==groupFilter)match=false;
    if(teamFilter&&info.teamA!==teamFilter&&info.teamB!==teamFilter)match=false;
    if(search&&!(info.teamA+' '+info.teamB+' '+info.title+' '+g.name+' '+wbdContext._gameCategoryLabel(g)+' '+wbdContext._gameGroupLabel(g)).toLowerCase().includes(search))match=false;
    if(match){ if(on)wbdContext.activeGameIds.add(g.id); else wbdContext.activeGameIds.delete(g.id); }
  });
  wbdContext._runAfterActiveChange();
};

// Original index.html:35989
wbdContext.toggleGame = function toggleGame(gid){
  if(wbdContext.activeGameIds.has(gid))wbdContext.activeGameIds.delete(gid); else wbdContext.activeGameIds.add(gid);
  wbdContext._runAfterActiveChange();
};
}

export function initialize(wbdContext) {

}
