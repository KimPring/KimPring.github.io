/** home: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:3958
wbdContext.renderHome = function renderHome(){
  wbdContext.renderFavoritesSection();  // 즐겨찾기는 가벼움 + 별도 상태라 항상 갱신
  // V10.2 perf: 데이터 변경 없으면 홈 위젯 재렌더 스킵 — 페이지 전환은 DOM을 파괴하지 않으므로
  // 다른 페이지 갔다가 돌아올 때 기존 화면 그대로 사용 (홈 버튼 렉 제거)
  const _hk = wbdContext.GAMES.length + '_' + wbdContext.G.length;
  if(window._homeKey === _hk) return;
  window._homeKey = _hk;
  wbdContext.renderGamesOverview();
  wbdContext.renderScoreboard();
  wbdContext.renderStatCards();
  wbdContext.renderRosters();
  wbdContext.renderTimeline();
};

// Original index.html:3976
wbdContext._computeInningScores = function _computeInningScores(data){
  // V10.2 perf: 이닝×8회 재순회 → 단일 패스 (대시보드 카드/스코어보드/리그득점 전부 가속)
  const runsA={},runsB={};
  const innSet=new Set(), maxAByInn={}, maxBByInn={};
  let totalA=0,totalB=0,hA=0,hB=0;
  // V10.3: 결과 기반 득점 보정 — 끝내기 안타/홈런은 게임이 '득점 후 상태'를 기록 안 해서
  //   scoreA/scoreB가 0인 채 끝남. 타석 결과(홈런/안타로 홈인한 주자)로 득점을 직접 더해 보정.
  let rbiA=0, rbiB=0;
  // V11.6: 신규 포맷의 SIDE(공수교대)/END(경기종료) 마커 처리
  //   · 스코어는 반드시 포함해야 함 — 끝내기 득점이 마커 행에만 기록됨
  //     (실측 2R 16경기 중 4경기: 제외 시 3-4→3-3, 10-11→10-9 등으로 최종 스코어가 틀림)
  //   · 다만 이닝 목록(innSet)에는 넣지 않음 — END의 inn이 실제 진행 이닝보다 크면
  //     스코어보드에 빈 이닝이 생김(9회 경기가 10회로 표시)
  const _isMarker = d => { const t = d.type==null?'':String(d.type).toUpperCase();
                           return t==='SIDE'||t==='END'; };
  let _lastRealInn = null;
  for(let j=0;j<data.length;j++){
    const d=data[j];
    const _mk=_isMarker(d);
    // 마커 행의 이닝은 실제 진행 이닝보다 클 수 있음(END inn=10인 9회 경기 등).
    //   → 이닝 목록엔 넣지 않고, 스코어는 "마지막 실제 이닝"에 귀속시켜
    //     끝내기 득점이 스코어보드 이닝 합계에도 반영되게 함.
    const inn = _mk ? (_lastRealInn!=null ? _lastRealInn : d.inn) : d.inn;
    if(!_mk){ innSet.add(inn); _lastRealInn = inn; }
    const sA=+d.scoreA||0, sB=+d.scoreB||0;
    if(sA>totalA)totalA=sA;
    if(sB>totalB)totalB=sB;
    if(_mk){
      // 마커는 half가 실제 공격팀과 다를 수 있으므로 양쪽 모두 max 갱신(누락 보정용)
      if(sA>(maxAByInn[inn]||0))maxAByInn[inn]=sA;
      if(sB>(maxBByInn[inn]||0))maxBByInn[inn]=sB;
      continue;
    }
    const isHit=wbdContext._isHit(d);  // V11.3: 야수선택 제외 (통합 안타 정의)
    // 이 타석으로 들어온 득점(타점): 홈런=주자수+1, 일반 안타로 홈인=scoreNote 방식과 동일
    let rbi=0;
    if(d.result===4) rbi=(+d.b1||0)+(+d.b2||0)+(+d.b3||0)+1;  // 홈런: 주자 전원 + 본인
    if(d.half===1){
      if(sA>(maxAByInn[inn]||0))maxAByInn[inn]=sA;
      if(isHit)hA++;
      rbiA+=rbi;
    } else {
      if(sB>(maxBByInn[inn]||0))maxBByInn[inn]=sB;
      if(isHit)hB++;
      rbiB+=rbi;
    }
  }
  // 결과기반 득점이 기록된 score보다 크면 그걸 사용 (끝내기 등 미기록 득점 보정)
  if(rbiA>totalA) totalA=rbiA;
  if(rbiB>totalB) totalB=rbiB;
  const innings=[...innSet].sort((a,b)=>a-b);
  let prevA=0,prevB=0;
  innings.forEach(inn=>{
    const mA=Math.max(prevA, maxAByInn[inn]||0);
    runsA[inn]=mA-prevA; prevA=mA;
    const mB=Math.max(prevB, maxBByInn[inn]||0);
    runsB[inn]=mB-prevB; prevB=mB;
  });
  return {innings,runsA,runsB,totalA,totalB,hA,hB};
};

// Original index.html:4045
wbdContext.renderScoreboard = function renderScoreboard(){
  // 대시보드 렌더
  wbdContext.renderGameDashboard();
  // 스코어보드는 선택된 모달 모드로만 동작 (기본은 비움)
  const wrap=document.getElementById('scoreboard-wrap');
  if(wrap)wrap.innerHTML='';
};

// Original index.html:4058
wbdContext._populateDashMetaFilters = function _populateDashMetaFilters(){
  const catSel=document.getElementById('dash-category-filter');
  const groupSel=document.getElementById('dash-group-filter');
  if(!catSel&&!groupSel)return;
  const prevCat=catSel?catSel.value:'';
  const prevGroup=groupSel?groupSel.value:'';
  const cats=new Map();
  const groups=new Map();
  wbdContext.GAMES.forEach(g=>{
    const cat=g.category||'local';
    const catName=g.categoryName||'직접 추가';
    cats.set(cat,catName);
    if(!prevCat || cat===prevCat){
      const gid=g.groupId||'local';
      const gname=g.groupName||'직접 추가';
      groups.set(gid,gname);
    }
  });
  if(catSel){
    const entries=[...cats.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'ko'));
    catSel.innerHTML='<option value="">전체</option>'+entries.map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
    if(prevCat && cats.has(prevCat))catSel.value=prevCat;
  }
  if(groupSel){
    const entries=[...groups.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'ko'));
    groupSel.innerHTML='<option value="">전체</option>'+entries.map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
    if(prevGroup && groups.has(prevGroup))groupSel.value=prevGroup;
  }
};

// Original index.html:4087
wbdContext.onDashCategoryFilterChange = function onDashCategoryFilterChange(){
  const groupSel=document.getElementById('dash-group-filter');
  if(groupSel)groupSel.value='';
  wbdContext.renderGameDashboard();
};

// Original index.html:4100
wbdContext.clearAllGames = function clearAllGames(){
  try{
    if(wbdContext.GAMES.length===0){
      document.getElementById('app').style.display='none';
      document.getElementById('upload-page').style.display='flex';
      return;
    }
    if(!confirm('현재 로드된 '+wbdContext.GAMES.length+'개 경기를 모두 제거하고 처음 화면으로 돌아갈까요?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.\n파일 자체는 안전하니 다시 업로드 가능해요.'))return;
    wbdContext.GAMES.length=0;
    wbdContext.activeGameIds.clear();
    if(typeof wbdContext.rebuildG==='function')wbdContext.rebuildG();
    const fi=document.getElementById('file-input');if(fi)fi.value='';
    const addFi=document.getElementById('add-file-input');if(addFi)addFi.value='';
    document.getElementById('app').style.display='none';
    document.getElementById('upload-page').style.display='flex';
    const fileInfo=document.getElementById('file-info');if(fileInfo)fileInfo.innerHTML='';
    const uploadErr=document.getElementById('upload-error');if(uploadErr)uploadErr.innerHTML='';
  }catch(e){
    console.error('[clearAllGames] 오류:',e);
    alert('오류 발생: '+e.message);
  }
};

// Original index.html:4130
wbdContext._buildGameLog = function _buildGameLog(pitches, inningFilter){
  if(!pitches || !pitches.length) return '<div style="padding:20px;text-align:center;color:var(--muted)">투구 데이터 없음</div>';
  const info = wbdContext._parseGameName(pitches[0]?._gameName || '');
  const teamA = info.teamA, teamB = info.teamB;
  
  const ord = n => n===1 ? '초구' : (n+'구');
  const PITCH_BADGE = {0:'스트라이크',1:'볼',2:'타격',3:'사구',4:'헛스윙'};
  const CALL_COLOR = {0:'#88ccff',1:'#cccccc',2:'#39ff8a',3:'#ff8c44',4:'#ff4560'};
  
  // 주자 상황 다이아몬드 SVG — 12px 작은 아이콘
  // b1/b2/b3: 0 또는 1
  const baseDiamond = (b1, b2, b3, outs) => {
    const on = '#ffd700', off = '#444';
    return `<span style="display:inline-flex;align-items:center;gap:6px;margin-left:8px;vertical-align:middle">
      <svg width="22" height="22" viewBox="0 0 22 22" style="display:inline-block">
        <polygon points="11,3 19,11 11,19 3,11" fill="none" stroke="#666" stroke-width="0.8"/>
        <polygon points="11,3 14,6 11,9 8,6" fill="${b2?on:off}"/>
        <polygon points="14,6 17,9 14,12 11,9" fill="${b1?on:off}"/>
        <polygon points="8,6 11,9 8,12 5,9" fill="${b3?on:off}"/>
      </svg>
      <span style="font-size:9.5px;color:${outs>=2?'#ff8c44':'var(--muted)'};font-family:var(--mono);min-width:20px">${outs||0}out</span>
    </span>`;
  };
  
  const paOutcomeText = (paEndP) => {
    const r=+paEndP.result, c=+paEndP.call, safe=+paEndP['1BSafe'];
    if(r===4) return {emoji:'💣', text:'홈런!', color:'#ffd700', big:true};
    if(r===5) return {emoji:'🚶', text:'볼넷', color:'#88ccff'};
    if(r===6) return {emoji:'💢', text:'몸에 맞는 공', color:'#ff8c44'};
    if(safe===1) return {emoji:'⚾', text:'안타', color:'#39ff8a'};
    if(safe===2) return {emoji:'😵', text:'실책 출루', color:'#cc88ff'};
    if(+paEndP.strk===2 && (c===0||c===4)) return {emoji:'❌', text:'삼진', color:'#ff4560'};
    // 타구 아웃: 실제 발사각으로 땅볼/라인/뜬공 구분
    const bt=(typeof wbdContext._battedType==='function')?wbdContext._battedType(paEndP):null;
    if(bt==='땅볼') return {emoji:'⬇️', text:'땅볼아웃', color:'#999'};
    if(bt==='뜬공') return {emoji:'🪂', text:'플라이아웃', color:'#999'};
    if(bt==='라인') return {emoji:'➡️', text:'라인아웃', color:'#999'};
    if(r===1) return {emoji:'🪂', text:'플라이아웃', color:'#999'};
    if(r===2) return {emoji:'⬇️', text:'땅볼아웃', color:'#999'};
    return {emoji:'•', text:'아웃', color:'#999'};
  };
  
  // 1. inn/half/bName/bIdx 기준 타석 그룹화
  // 또한 같은 타석 내에서 투수가 바뀔 수도 있음 — 그 경우 별도 추적
  const PAs = [];
  let cur = null;
  pitches.forEach(d => {
    const key = `${d.inn}_${d.half}_${d.bName}_${d.bIdx}`;
    if(!cur || cur.key !== key){
      cur = {key, inn:+d.inn, half:+d.half, bName:d.bName, bIdx:+d.bIdx, pName:d.pName, pitches:[]};
      PAs.push(cur);
    }
    cur.pitches.push(d);
    cur.pName = d.pName;
  });
  
  // 1-2. 교체 감지 — 직전 같은 half(같은 팀 수비/공격)와 비교
  // 투수 교체: 같은 half 내에서 pName이 바뀌는 시점
  // 대타·라인업 교체: 같은 half + 같은 bIdx인데 bName이 바뀌는 시점
  // 수비 교체: 같은 half 내에서 같은 포지션(CName/1BName/...)에 다른 사람
  const POS_KEYS = ['CName','1BName','2BName','3BName','SSName','LFName','CFName','RFName'];
  const POS_LABEL = {CName:'포수', '1BName':'1루수', '2BName':'2루수', '3BName':'3루수', SSName:'유격수', LFName:'좌익수', CFName:'중견수', RFName:'우익수'};
  
  // half별 상태 추적 (마지막에 본 투수/타순별타자/수비위치별선수)
  const halfState = {0:{pName:null, lineup:{}, defense:{}}, 1:{pName:null, lineup:{}, defense:{}}};
  
  PAs.forEach(pa => {
    pa._subs = [];  // 이 타석 시작 시 발생한 교체들
    const st = halfState[pa.half];
    
    // 투수 교체
    if(st.pName && st.pName !== pa.pName){
      pa._subs.push({type:'pitcher', from:st.pName, to:pa.pName});
    }
    st.pName = pa.pName;
    
    // 대타·라인업 교체 (같은 bIdx에 다른 선수)
    if(st.lineup[pa.bIdx] && st.lineup[pa.bIdx] !== pa.bName){
      pa._subs.push({type:'batter', bIdx:pa.bIdx, from:st.lineup[pa.bIdx], to:pa.bName});
    }
    st.lineup[pa.bIdx] = pa.bName;
    
    // 수비 교체 (첫 투구의 포지션별 이름 변화)
    const firstP = pa.pitches[0];
    POS_KEYS.forEach(pk => {
      const nm = firstP[pk];
      if(!nm) return;
      const defState = halfState[1-pa.half].defense;  // 반대편(수비) 상태
      if(defState[pk] && defState[pk] !== nm){
        pa._subs.push({type:'defense', pos:POS_LABEL[pk], from:defState[pk], to:nm});
      }
      defState[pk] = nm;
    });
  });
  
  // 2. 이닝 목록 (셀렉터용)
  const allInnings = [...new Set(PAs.map(p => p.inn))].sort((a,b) => a-b);
  
  // 3. 필터 적용
  const filteredPAs = (inningFilter && inningFilter !== 'all') 
    ? PAs.filter(p => p.inn === +inningFilter) 
    : PAs;
  
  // 4. 점수 추적 (홈런만 즉시 가산) — half=1=초(A공격), half=0=말(B공격)
  let scoreA = 0, scoreB = 0;
  if(inningFilter && inningFilter !== 'all'){
    const before = PAs.filter(p => p.inn < +inningFilter);
    before.forEach(pa => {
      const last = pa.pitches[pa.pitches.length-1];
      if(+last.result === 4){
        const rbi = (+last.b1||0) + (+last.b2||0) + (+last.b3||0) + 1;
        if(pa.half === 1) scoreA += rbi; else scoreB += rbi;
      }
    });
  }
  
  // 5. 이닝 셀렉터 HTML
  let selectorHtml = `<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--border)">
    <button onclick="window._gameLogFilter('all')" style="background:${!inningFilter||inningFilter==='all'?'#88ccff':'var(--card2)'};color:${!inningFilter||inningFilter==='all'?'#000':'var(--text)'};border:none;padding:6px 12px;font-size:11.5px;font-weight:700;border-radius:4px;cursor:pointer">전체</button>`;
  allInnings.forEach(inn => {
    const active = +inningFilter === inn;
    selectorHtml += `<button onclick="window._gameLogFilter(${inn})" style="background:${active?'#88ccff':'var(--card2)'};color:${active?'#000':'var(--text)'};border:none;padding:6px 12px;font-size:11.5px;font-weight:700;border-radius:4px;cursor:pointer">${inn}회</button>`;
  });
  selectorHtml += `</div>`;
  
  // 6. 본문 HTML 생성
  let bodyHtml = '<div style="font-family:var(--mono);font-size:11.5px;line-height:1.7">';
  let lastInnHalf = '';
  let curOuts = 0;
  
  filteredPAs.forEach((pa) => {
    const innHalf = `${pa.inn}_${pa.half}`;
    
    // 이닝/하프 헤더
    // CSV 컨벤션: half=1 = 초(원정 공격), half=0 = 말(홈 공격)
    if(innHalf !== lastInnHalf){
      const attackTeam = pa.half===1 ? teamA : teamB;
      const attackColor = pa.half===1 ? '#ff4560' : '#2196f3';
      const halfLabel = pa.half===1 ? '초' : '말';
      bodyHtml += `<div style="margin:18px 0 8px;padding:8px 12px;background:linear-gradient(90deg,${attackColor}22,transparent);border-left:3px solid ${attackColor};font-weight:700;font-size:12.5px;color:${attackColor}">
        ━ ${pa.inn}회${halfLabel} · ${attackTeam} 공격 ━
      </div>`;
      lastInnHalf = innHalf;
      curOuts = 0;
    }
    
    // 타석 시작 시점의 주자/아웃 (첫 투구의 b1/b2/b3/out)
    const firstP = pa.pitches[0];
    const startB1 = +firstP.b1 || 0, startB2 = +firstP.b2 || 0, startB3 = +firstP.b3 || 0;
    const startOut = +firstP.out || curOuts;
    // bIdx 0은 9번 타자로 변환 (야구 관례: 1~9번 타순)
    const lineupNum = pa.bIdx === 0 ? 9 : pa.bIdx;
    const lineupNo = lineupNum >= 1 && lineupNum <= 9 ? `${lineupNum}번 ` : '';
    
    // V10.0: 교체 알림 (이 타석 시작 직전 발생한 교체들)
    if(pa._subs && pa._subs.length){
      pa._subs.forEach(sub => {
        let icon, label, color, bg;
        if(sub.type === 'pitcher'){
          icon = '🔄'; color = '#ff8c44'; bg = 'rgba(255,140,68,0.12)';
          label = `<b>투수 교체</b> — ${sub.from} ➜ <b style="color:#ffd700">${sub.to}</b>`;
        } else if(sub.type === 'batter'){
          icon = '🔁'; color = '#cc44ff'; bg = 'rgba(204,68,255,0.12)';
          const subLineupNum = sub.bIdx === 0 ? 9 : sub.bIdx;
          label = `<b>${subLineupNum}번 대타·교체</b> — ${sub.from} ➜ <b style="color:#ffd700">${sub.to}</b>`;
        } else {
          icon = '🧤'; color = '#88ccff'; bg = 'rgba(136,204,255,0.10)';
          label = `<b>${sub.pos} 교체</b> — ${sub.from} ➜ <b style="color:#ffd700">${sub.to}</b>`;
        }
        bodyHtml += `<div style="margin:6px 0;padding:6px 12px;background:${bg};border-left:3px solid ${color};border-radius:3px;font-size:11.5px;color:var(--text)">
          ${icon} ${label}
        </div>`;
      });
    }
    
    // 주자 상황 텍스트
    const runnerOn = startB1 + startB2 + startB3;
    let runnerText = '';
    if(runnerOn === 0) runnerText = '주자 없음';
    else {
      const labels = [];
      if(startB3) labels.push('3루');
      if(startB2) labels.push('2루');
      if(startB1) labels.push('1루');
      runnerText = labels.join('·') + ' 주자';
    }
    
    bodyHtml += `<div style="margin:10px 0 4px;padding:6px 10px;background:var(--card2);border-radius:4px;display:flex;align-items:center;flex-wrap:wrap;gap:6px">
      <span style="color:#ffd700;font-weight:700">${lineupNo}타자 ${pa.bName||'?'}</span>
      <span style="color:var(--muted);font-size:10.5px">vs 투수 ${pa.pName||'?'}</span>
      ${baseDiamond(startB1, startB2, startB3, startOut)}
      <span style="color:${runnerOn>0?'#ffd700':'var(--muted)'};font-size:10px;margin-left:4px">${runnerText}</span>
    </div>`;
    
    // 투구 시퀀스
    pa.pitches.forEach((d, pi) => {
      const callIdx = +d.call;
      const callName = PITCH_BADGE[callIdx] || '?';
      const callCol = CALL_COLOR[callIdx] || '#aaa';
      const ptName = (typeof wbdContext.PITCH_NAMES !== 'undefined' && wbdContext.PITCH_NAMES[d.pType]) || d.pType || '';
      const grpCol = (typeof wbdContext.GROUP_COLORS !== 'undefined') ? (wbdContext.GROUP_COLORS[wbdContext.pitchGroup(d.pType,d)]||'#aaa') : '#aaa';
      const spd = d.spdK ? `${d.spdK}km/h` : '';
      const cnt = `${+d.ball||0}-${+d.strk||0}`;
      const isLast = pi === pa.pitches.length - 1;
      const swung = (typeof wbdContext._isSwing === 'function') ? wbdContext._isSwing(d) : !!d.bSwing;
      const swMark = swung ? (+d.ev>0 ? ' · 컨택' : ' · 헛스윙') : '';
      
      bodyHtml += `<div style="padding:3px 14px 3px 26px;color:var(--text)">
        <span style="color:var(--muted)">${ord(pi+1)}</span>
        <span style="color:${grpCol};margin-left:8px">${ptName}</span>
        <span style="color:var(--muted);margin-left:6px">${spd}</span>
        <span style="margin-left:10px;color:${callCol}">→ ${callName}${swMark}</span>
        ${!isLast?`<span style="color:var(--muted);margin-left:8px;font-size:10px">(${cnt})</span>`:''}
        ${+d.ev>0?`<span style="color:#ff8c44;margin-left:8px;font-size:10px">EV ${(+d.ev).toFixed(0)}${d.ldeg!=null?` ${(+d.ldeg).toFixed(0)}°`:''}</span>`:''}
      </div>`;
    });
    
    // 타석 결과
    const lastP = pa.pitches[pa.pitches.length-1];
    const outcome = paOutcomeText(lastP);
    
    // 아웃 카운트 갱신 (아웃이면 +1)
    const isOut = outcome.text==='삼진' || outcome.text==='플라이아웃' || outcome.text==='땅볼아웃' || outcome.text==='아웃';
    if(isOut) curOuts++;
    
    // 홈런 점수 가산 — half=1(초)=A공격, half=0(말)=B공격
    let scoreNote = '';
    if(+lastP.result === 4){
      const rbi = (+lastP.b1||0) + (+lastP.b2||0) + (+lastP.b3||0) + 1;
      if(pa.half === 1) scoreA += rbi; else scoreB += rbi;
      scoreNote = ` (${rbi}타점, ${teamA} ${scoreA} : ${scoreB} ${teamB})`;
    }
    
    bodyHtml += `<div style="padding:4px 14px 8px 26px;color:${outcome.color};font-weight:${outcome.big?'900':'700'};font-size:${outcome.big?'13px':'12px'}">
      → ${outcome.emoji} ${outcome.text}${scoreNote}
    </div>`;
  });
  
  if(filteredPAs.length === 0){
    bodyHtml += `<div style="padding:30px;text-align:center;color:var(--muted)">선택한 이닝의 데이터가 없습니다.</div>`;
  }
  
  bodyHtml += '</div>';
  return selectorHtml + bodyHtml;
};

// Original index.html:4376
wbdContext.openGameScoreboard = function openGameScoreboard(gid){
  const g=wbdContext.GAMES.find(x=>x.id===gid);
  if(!g)return;
  const info=wbdContext._parseGameName(g.name);
  const {innings,runsA,runsB,totalA,totalB,hA,hB}=wbdContext._computeInningScores(g.pitches);
  const winA=totalA>totalB, winB=totalB>totalA;
  
  // 투수 박스스코어 (이 경기만)
  const pitcherStats=wbdContext._getCachedPitcherStats(gid)||{};
  const batterStats=wbdContext._getCachedBatterStats(gid)||{};
  
  // 팀별 분류 (한 팀 투수는 상대팀 공격 시 던짐)
  // 투수가 던진 첫 투구의 half로 그팀 판단:
  //   half=1 (A공격) → 그 투수는 B팀
  //   half=0 (B공격) → 그 투수는 A팀
  const teamA_pitchers=[], teamB_pitchers=[];
  Object.keys(pitcherStats).forEach(pn=>{
    const sample=g.pitches.find(d=>String(d.pName)===String(pn));
    if(!sample)return;
    if(+sample.half===1)teamB_pitchers.push(pn);
    else teamA_pitchers.push(pn);
  });
  const teamA_batters=[], teamB_batters=[];
  Object.keys(batterStats).forEach(bn=>{
    const sample=g.pitches.find(d=>String(d.bName)===String(bn));
    if(!sample)return;
    if(+sample.half===1)teamA_batters.push(bn);
    else teamB_batters.push(bn);
  });
  
  // 출장순 정렬 (첫 등장 순서)
  const orderInGame=(name,key)=>{
    const idx=g.pitches.findIndex(d=>String(d[key])===String(name));
    return idx>=0?idx:9999;
  };
  teamA_pitchers.sort((a,b)=>orderInGame(a,'pName')-orderInGame(b,'pName'));
  teamB_pitchers.sort((a,b)=>orderInGame(a,'pName')-orderInGame(b,'pName'));
  teamA_batters.sort((a,b)=>orderInGame(a,'bName')-orderInGame(b,'bName'));
  teamB_batters.sort((a,b)=>orderInGame(a,'bName')-orderInGame(b,'bName'));
  
  const safeName=n=>String(n).replace(/'/g,"\\'");
  const pitcherTable=(names,teamLabel,teamColor)=>{
    if(names.length===0)return '';
    let h=`<div style="margin-bottom:12px"><div style="font-size:11px;color:${teamColor};font-weight:700;margin-bottom:4px">${teamLabel} 투수진</div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr>
      <th>이름</th><th>IP</th><th>투구</th><th>피안타</th><th>피HR</th><th>실점</th><th>K</th><th>BB</th><th>ERA</th>
      </tr></thead><tbody>`;
    names.forEach(pn=>{
      const s=pitcherStats[pn];
      h+=`<tr onclick="closeModal();goToPitcher('${safeName(pn)}')" style="cursor:pointer">
        <td style="font-weight:600">${pn}</td>
        <td style="font-family:var(--mono);color:#39ff8a">${s.ipDisp}</td>
        <td style="font-family:var(--mono)">${s.pitches}</td>
        <td style="font-family:var(--mono)">${s.hits}</td>
        <td style="font-family:var(--mono);color:${s.hrs>0?'#ff4560':'var(--muted)'}">${s.hrs}</td>
        <td style="font-family:var(--mono);color:${s.runs>0?'#ff4560':'var(--text)'};font-weight:700">${s.runs}</td>
        <td style="font-family:var(--mono);color:#ff8800">${s.ks}</td>
        <td style="font-family:var(--mono);color:${s.bbs>0?'#ff8800':'var(--muted)'}">${s.bbs}</td>
        <td style="font-family:var(--mono);font-weight:700">${s.era.toFixed(2)}</td>
      </tr>`;
    });
    h+='</tbody></table></div></div>';
    return h;
  };
  const batterTable=(names,teamLabel,teamColor)=>{
    if(names.length===0)return '';
    let h=`<div style="margin-bottom:12px"><div style="font-size:11px;color:${teamColor};font-weight:700;margin-bottom:4px">${teamLabel} 타선</div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr>
      <th>이름</th><th>타수</th><th>안타</th><th>HR</th><th>BB</th><th>K</th><th>타율</th>
      </tr></thead><tbody>`;
    names.forEach(bn=>{
      const s=batterStats[bn];
      if(s.pitches<2)return;
      h+=`<tr onclick="closeModal();goToBatter('${safeName(bn)}')" style="cursor:pointer">
        <td style="font-weight:600">${bn}</td>
        <td style="font-family:var(--mono)">${s.ab}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-weight:${s.hits>0?'700':'400'}">${s.hits}</td>
        <td style="font-family:var(--mono);color:${s.hrs>0?'#ffd700':'var(--muted)'};font-weight:${s.hrs>0?'700':'400'}">${s.hrs}</td>
        <td style="font-family:var(--mono);color:${s.bbs>0?'#88cc44':'var(--muted)'}">${s.bbs}</td>
        <td style="font-family:var(--mono);color:${s.ks>0?'#ff8800':'var(--muted)'}">${s.ks}</td>
        <td style="font-family:var(--mono);font-weight:700">${s.baStr}</td>
      </tr>`;
    });
    h+='</tbody></table></div></div>';
    return h;
  };
  
  // 주요 이벤트 (홈런, 다득점)
  const hrs=g.pitches.filter(p=>+p.result===4);
  let highlights='';
  if(hrs.length>0){
    highlights=`<div style="margin-bottom:12px;padding:10px;background:#1a1410;border:1px solid #ffd70044;border-radius:4px">
      <div style="font-size:11px;color:#ffd700;font-weight:700;margin-bottom:4px">⚾ 홈런 ${hrs.length}개</div>
      <div style="font-size:11px;line-height:1.6">${hrs.map(h=>{
        const dist=Math.sqrt((+h.lx||0)**2+(+h.lz||0)**2);
        return `<div>${h.inn}회 · <b>${h.bName}</b> (vs ${h.pName}) ${dist?`· ${dist.toFixed(0)}`:''}</div>`;
      }).join('')}</div></div>`;
  }
  
  const html=`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:11px;color:var(--muted);font-family:var(--mono);margin-bottom:4px">${info.date||''}</div>
      <div style="font-size:20px;font-weight:700">📋 박스스코어</div>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button onclick="closeModal();window._gameReportState={gameId:'${gid}'};showPage('gamereport')" style="background:linear-gradient(90deg,#ff4560,#cc44ff);color:#fff;border:none;padding:8px 18px;font-size:12px;font-weight:700;border-radius:5px;cursor:pointer;box-shadow:0 2px 8px rgba(255,69,96,0.3)">📰 이 경기 리포트 생성</button>
        <button onclick="window._toggleGameLog('${gid}')" id="gamelog-toggle-btn" style="background:linear-gradient(90deg,#88ccff,#39ff8a);color:#000;border:none;padding:8px 18px;font-size:12px;font-weight:700;border-radius:5px;cursor:pointer;box-shadow:0 2px 8px rgba(136,204,255,0.3)">📋 경기 로그 보기</button>
      </div>
    </div>
    <div class="scoreboard" style="margin-bottom:12px"><table>
      <tr><th>팀</th>${innings.map(i=>`<th>${i}</th>`).join('')}<th>R</th><th>H</th></tr>
      <tr><td class="team-a" style="${winA?'font-weight:700':''}">${winA?'🏆 ':'🔴 '}${info.teamA}</td>${innings.map(i=>`<td>${runsA[i]||0}</td>`).join('')}<td class="score-hi">${totalA}</td><td>${hA}</td></tr>
      <tr><td class="team-b" style="${winB?'font-weight:700':''}">${winB?'🏆 ':'🔵 '}${info.teamB}</td>${innings.map(i=>`<td>${runsB[i]||0}</td>`).join('')}<td class="score-hi">${totalB}</td><td>${hB}</td></tr>
    </table></div>
    <div id="game-log-region" style="display:none;margin-bottom:14px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:14px;max-height:600px;overflow-y:auto"></div>
    ${highlights}
    ${pitcherTable(teamA_pitchers,info.teamA,'#ff4560')}
    ${pitcherTable(teamB_pitchers,info.teamB,'#2196f3')}
    ${batterTable(teamA_batters,info.teamA,'#ff4560')}
    ${batterTable(teamB_batters,info.teamB,'#2196f3')}
    <div style="text-align:center;font-size:11px;color:var(--muted)">총 ${g.pitches.length}투구</div>`;
  wbdContext.openModal(html);
};

// Original index.html:4532
wbdContext.renderStatCards = function renderStatCards(){
  // V10.2 perf: G 6회 재순회 + 게임별 스프레드 → 단일 패스
  let hr=0,hit=0,k=0,bb=0,hbp=0,balk=0;
  const innMax={};  // gameId → max inn
  for(let j=0;j<wbdContext.G.length;j++){
    const d=wbdContext.G[j], r=d.result;
    if(r===4)hr++;
    if(wbdContext._isHit(d))hit++;  // V11.3: 야수선택 제외 (통합 안타 정의)
    if(wbdContext._isK(d))k++;
    if(r===5)bb++; else if(r===6)hbp++;
    if(d.balk==1)balk++;
    const inn=d.inn||0;
    if(inn>(innMax[d._gameId]||0))innMax[d._gameId]=inn;
  }
  let innSum=0; for(const gid in innMax)innSum+=innMax[gid];
  const cards=[
    {label:'총 투구수',val:wbdContext.G.length},
    {label:'경기 이닝',val:innSum},
    {label:'홈런',val:hr},
    {label:'안타',val:hit},
    {label:'삼진(K)',val:k},
    {label:'볼넷',val:bb},
    {label:'사구',val:hbp},
    {label:'보크',val:balk}
  ];
  const el=document.getElementById('stat-cards-wrap');
  el.innerHTML=cards.map(c=>`<div class="stat-card"><div class="stat-label">${c.label}</div><div class="stat-val" data-target="${c.val}">0</div></div>`).join('');
  el.querySelectorAll('[data-target]').forEach(e=>wbdContext.countUp(e,+e.dataset.target));
};

// Original index.html:4562
wbdContext.renderRosters = function renderRosters(){
  const pitchers=[...new Set(wbdContext.G.map(d=>d.pName).filter(Boolean))];
  const batters=[...new Set(wbdContext.G.map(d=>d.bName).filter(Boolean))];

  // 팀별로 그룹화
  const pitcherByTeam={};
  pitchers.forEach(p=>{
    const team=wbdContext._playerTeam(p,'pitcher')||'—';
    if(!pitcherByTeam[team])pitcherByTeam[team]=[];
    pitcherByTeam[team].push(p);
  });
  const batterByTeam={};
  batters.forEach(b=>{
    const team=wbdContext._playerTeam(b,'batter')||'—';
    if(!batterByTeam[team])batterByTeam[team]=[];
    batterByTeam[team].push(b);
  });

  // 투수 카드 렌더
  const renderPitcherCard=p=>{
    const pd=wbdContext.getPitcherDataByName(p);  // V10.2 perf: G 풀스캔(선수당 7만건) → 인덱스 캐시
    const ks=pd.filter(d=>wbdContext._isK(d)).length;
    const fbGroups=['포심','투심','커터','패스트볼'];
    const fbSpds=pd.filter(d=>d.spdK>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    const brkSpds=pd.filter(d=>d.spdK>0&&!fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    const avgFb=fbSpds.length?(fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length).toFixed(1):'-';
    const avgBrk=brkSpds.length?(brkSpds.reduce((a,b)=>a+b,0)/brkSpds.length).toFixed(1):'-';
    return `<div class="player-card section" onclick="goToPitcher('${p.replace(/'/g,"\\'")}')">
      <div class="pc-name">${p}</div>
      <div class="pc-stats">
        <div class="pc-stat">투구수 <span>${pd.length}</span></div>
        <div class="pc-stat">직구 <span style="color:#ff8c44">${avgFb}</span></div>
        <div class="pc-stat">변화구 <span style="color:#88ccff">${avgBrk}</span></div>
        <div class="pc-stat">K% <span>${pd.length>0?(ks/pd.length*100).toFixed(0):0}%</span></div>
      </div>
    </div>`;
  };
  // 타자 카드 렌더
  const renderBatterCard=b=>{
    const allB=wbdContext.getBatterDataByName(b);  // V10.2 perf: G 풀스캔 → 인덱스 캐시
    let hits=0,hrs=0,ab=0;
    for(let j=0;j<allB.length;j++){
      const d=allB[j], r=+d.result;
      const isHit=wbdContext._isHit(d);  // V11.3: 야수선택 제외 (통합 안타 정의)
      if(isHit)hits++;
      if(r===4)hrs++;
      if(isHit||r===1||r===2||(wbdContext._isK(d)))ab++;
    }
    const avg = ab > 0 ? (hits/ab).toFixed(3) : '---';
    return `<div class="player-card section" onclick="goToBatter('${b.replace(/'/g,"\\'")}')">
      <div class="pc-name">${b}</div>
      <div class="pc-stats">
        <div class="pc-stat">타수 <span>${ab}</span></div>
        <div class="pc-stat">안타 <span>${hits}</span></div>
        <div class="pc-stat">홈런 <span style="color:#ff4560">${hrs}</span></div>
        <div class="pc-stat">타율 <span style="color:#39ff8a">${avg}</span></div>
      </div>
    </div>`;
  };

  // 팀별 섹션 빌더
  const buildByTeam=(map,renderFn)=>{
    const teams=Object.keys(map).sort();
    return teams.map(team=>{
      const players=map[team];
      return `<div style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--card2);border-left:3px solid var(--amber);border-radius:3px;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:var(--amber);letter-spacing:1px">${team}</span>
          <span style="font-size:10px;color:var(--muted)">· ${players.length}명</span>
        </div>
        <div>${players.map(renderFn).join('')}</div>
      </div>`;
    }).join('');
  };

  document.getElementById('pitcher-roster').innerHTML=buildByTeam(pitcherByTeam,renderPitcherCard);
  document.getElementById('batter-roster').innerHTML=buildByTeam(batterByTeam,renderBatterCard);
};

// Original index.html:4641
wbdContext.goToPitcher = function goToPitcher(name){wbdContext.currentPitcher=name;document.getElementById('pitcher-sel').value=name;wbdContext.showPage('pitcher')};

// Original index.html:4642
wbdContext.goToBatter = function goToBatter(name){wbdContext.currentBatter=name;document.getElementById('batter-sel').value=name;wbdContext.showPage('batter')};

// Original index.html:4643
wbdContext._jumpToCompare = function _jumpToCompare(name,type){
  wbdContext.showPage('compare');
  setTimeout(()=>{
    const typeSel=document.getElementById('cmp-type');
    if(typeSel) typeSel.value=type==='pitcher'?'pitcher':'batter';
    if(typeof wbdContext.renderComparePage==='function')wbdContext.renderComparePage();
    setTimeout(()=>{
      const p1=document.getElementById('cmp-p1');
      if(p1){
        // 옵션 중에 선수 있는지 확인 후 자동 선택
        const opt=Array.from(p1.options).find(o=>o.value===String(name));
        if(opt){
          p1.value=name;
          if(typeof wbdContext.renderComparePage==='function')wbdContext.renderComparePage();
        }
      }
    },80);
  },50);
};

// Original index.html:4662
wbdContext._jumpToMatchup = function _jumpToMatchup(name,type){
  wbdContext.showPage('matchup');
  setTimeout(()=>{
    if(typeof renderMatchup==='function')renderMatchup();
    setTimeout(()=>{
      const sel=document.getElementById(type==='pitcher'?'mu-pitcher':'mu-batter');
      if(sel){sel.value=name; if(typeof renderMatchup==='function')renderMatchup();}
    },50);
  },50);
};

// Original index.html:4673
wbdContext.renderTimeline = function renderTimeline(){
  const innings=[...new Set(wbdContext.G.map(d=>d.inn))].sort((a,b)=>a-b);
  const maxInn=Math.max(...innings,1);
  const W=640,H=100,padL=30,padR=20,padT=15;
  const innW=(W-padL-padR)/maxInn;
  let items='';
  innings.forEach((inn,ii)=>{
    const x=padL+ii*innW+innW/2;
    items+=wbdContext.sEl('text',{x:x.toFixed(1),y:H-5,fill:'#3a5a7a','font-size':'9','text-anchor':'middle'},inn+'이닝');
    items+=wbdContext.sEl('line',{x1:x.toFixed(1),y1:padT,x2:x.toFixed(1),y2:H-16,stroke:'#1a2f4a','stroke-width':'0.5'});
  });
  // V10.2 perf: 이벤트마다 findIndex 선형검색(O(n²), 37만건에서 수백ms) → 이닝별 카운터 단일 패스
  const innTotal={};wbdContext.G.forEach(d=>{innTotal[d.inn]=(innTotal[d.inn]||0)+1;});
  const innIdxMap={};innings.forEach((inn,ii)=>{innIdxMap[inn]=ii;});
  // V10.2 perf: 대용량 시 도트 샘플링 — 수만 개 SVG 노드는 렌더만 느리고 어차피 겹쳐서 안 보임
  let _evTotal=0;
  for(let j=0;j<wbdContext.G.length;j++){const d=wbdContext.G[j];if([4,5,6].includes(d.result)||d['1BSafe']||(d.bSwing&&d.call===4))_evTotal++;}
  const _evStep=Math.max(1, Math.ceil(_evTotal/2000));
  let _evSeen=0;
  const innCounter={};
  wbdContext.G.forEach((d,gi)=>{
    const pos=(innCounter[d.inn]=(innCounter[d.inn]||0)+1)-1;
    if(![4,5,6].includes(d.result)&&!(d['1BSafe'])&&!(d.bSwing&&d.call===4))return;
    if((_evSeen++%_evStep)!==0 && d.result!==4)return;  // 홈런은 항상 표시
    const innIdx=innIdxMap[d.inn];if(innIdx==null)return;
    const ix=padL+innIdx*innW+2+(pos/Math.max(innTotal[d.inn]-1,1))*(innW-4);
    const iy=d.half===0?28:62;
    let col='#607080',r=3;
    if(d.result===4){col='#ffd700';r=6;}
    else if(d['1BSafe']){col='#ffdd44';r=4;}
    else if(d.result===5){col='#44ddff';r=4;}
    else if(d.result===6){col='#cc44ff';r=4;}
    else if(d.bSwing&&d.call===4){col='#aaa';r=3;}
    items+=`<circle cx="${ix.toFixed(1)}" cy="${iy}" r="${r}" fill="${col}" opacity="0.85"/>`;
  });
  items+=wbdContext.sEl('text',{x:4,y:31,fill:'#ff6b6b','font-size':'8'},'RED');
  items+=wbdContext.sEl('text',{x:4,y:65,fill:'#6bb5ff','font-size':'8'},'BLU');
  const leg=`<div class="legend"><div class="legend-item"><div class="ldot" style="background:#ffd700"></div>홈런</div><div class="legend-item"><div class="ldot" style="background:#ffdd44"></div>안타</div><div class="legend-item"><div class="ldot" style="background:#44ddff"></div>볼넷</div><div class="legend-item"><div class="ldot" style="background:#cc44ff"></div>사구</div><div class="legend-item"><div class="ldot" style="background:#aaa"></div>삼진</div></div>`;
  document.getElementById('home-timeline').innerHTML=leg+`<div style="overflow-x:auto">${wbdContext.makeSVG(W,H,items)}</div>`;
};

// Original index.html:4717
wbdContext.onPitcherChange = function onPitcherChange(){
  const sel=document.getElementById('pitcher-sel');
  if(!sel)return;
  const v=sel.options[sel.selectedIndex]?.value;
  if(!v)return;
  wbdContext.currentPitcher=v;
  wbdContext.renderPitcherPage();
};
}

export function initialize(wbdContext) {
// Original index.html:3972
wbdContext.gamesOverviewOpen = false;

// Original index.html:4500
window._gameLogCurrentGid = null;

// Original index.html:4501
window._gameLogCurrentInning = 'all';

// Original index.html:4503
window._toggleGameLog = function(gid){
  const region = document.getElementById('game-log-region');
  const btn = document.getElementById('gamelog-toggle-btn');
  if(!region || !btn) return;
  const isHidden = region.style.display === 'none';
  if(isHidden){
    window._gameLogCurrentGid = gid;
    window._gameLogCurrentInning = 'all';
    const g = wbdContext.GAMES.find(x => x.id === gid);
    if(g) region.innerHTML = wbdContext._buildGameLog(g.pitches, 'all');
    region.style.display = 'block';
    btn.innerHTML = '📋 경기 로그 접기';
    setTimeout(() => region.scrollIntoView({behavior:'smooth', block:'start'}), 50);
  } else {
    region.style.display = 'none';
    btn.innerHTML = '📋 경기 로그 보기';
  }
};

// Original index.html:4522
window._gameLogFilter = function(inning){
  const gid = window._gameLogCurrentGid;
  if(!gid) return;
  window._gameLogCurrentInning = inning;
  const g = wbdContext.GAMES.find(x => x.id === gid);
  if(!g) return;
  const region = document.getElementById('game-log-region');
  if(region) region.innerHTML = wbdContext._buildGameLog(g.pitches, inning);
};
}
