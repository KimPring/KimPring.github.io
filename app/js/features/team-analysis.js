/** team-analysis: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:11114
wbdContext._saveTeamAliases = function _saveTeamAliases(){
  window._teamAliasLC=null;  // V10.2: 대소문자 무시 매핑 캐시 무효화
  try{localStorage.setItem('wbd_team_aliases',JSON.stringify(window.teamAliases||{}));}
  catch(e){console.warn('팀 별명 저장 실패',e);}
};

// Original index.html:11121
wbdContext._isScrimTeam = function _isScrimTeam(name){
  if(!name)return true;
  return wbdContext.SCRIM_TEAM_NAMES.has(String(name).trim());
};

// Original index.html:11126
wbdContext._autoCanonTeamMap = function _autoCanonTeamMap(){
  if(window._autoCanonMap && window._autoCanonMap._key===wbdContext.GAMES.length) return window._autoCanonMap;
  const cnt={};
  wbdContext.GAMES.forEach(g=>{
    const info=wbdContext._parseGameName(g.name);
    [info.teamA, info.teamB].forEach(t=>{
      if(!t||wbdContext._isScrimTeam(t))return;
      const lc=String(t).trim().toLowerCase();
      if(!cnt[lc])cnt[lc]={};
      cnt[lc][t]=(cnt[lc][t]||0)+1;
    });
  });
  const map={_key:wbdContext.GAMES.length};
  for(const lc in cnt){
    map[lc]=Object.entries(cnt[lc]).sort((a,b)=>b[1]-a[1])[0][0];
  }
  // V10.3: 오타 병합 — 편집거리 1(한 글자 차이)인 희귀 표기를 자주 쓰는 표기로 흡수.
  //   예: "Purple Neosn Apex"(드묾) → "Purple Neon Apex"(자주). 길이 6자↑ + 빈도 3배↑일 때만(오병합 방지).
  const _ed1 = (a,b) => {  // 편집거리 1 이하인지 (삽입/삭제/치환 1회)
    if(Math.abs(a.length-b.length)>1) return false;
    if(a===b) return true;
    let i=0,j=0,diff=0;
    while(i<a.length && j<b.length){
      if(a[i]===b[j]){ i++; j++; }
      else { if(++diff>1) return false;
        if(a.length>b.length) i++; else if(a.length<b.length) j++; else { i++; j++; } }
    }
    return true;
  };
  const lcs = Object.keys(cnt);
  const freq = lc => Object.values(cnt[lc]).reduce((s,v)=>s+v,0);
  // 편집거리 1이고 길이 8자↑이면 더 많이 등장한 표기로 병합 (긴 이름의 오타는 우연일 확률 낮음).
  //   짧은 이름(<8)은 진짜 다른 팀일 수 있어 제외해 오병합 방지.
  lcs.forEach(rare => {
    if(rare.length < 8) return;
    const rf = freq(rare);
    lcs.forEach(common => {
      if(common===rare || common.length<8) return;
      const cf = freq(common);
      // 더 많은 쪽이 기준. 동률이면 사전순 먼저를 기준(결정적).
      if(_ed1(rare, common) && (cf > rf || (cf===rf && common < rare))){
        map[rare] = map[common];
      }
    });
  });
  window._autoCanonMap=map;
  return map;
};

// Original index.html:11174
wbdContext._normalizeTeam = function _normalizeTeam(name){
  if(!name)return name;
  // 스크림 팀명은 null 반환 → 팀 분류에서 제외됨
  if(wbdContext._isScrimTeam(name))return null;
  // V10.2: 파일명에서 섞여 들어온 경기 차수 접미사 제거 — "TWP Final #1" → "TWP", "GE Match2" → "GE"
  name = String(name).replace(/\s+(?:final|match|game|set)\s*#?\s*\d+\s*$/i, '').trim() || name;
  // V10.2: 별칭 매칭을 대소문자/공백 무시로 — "PNA" 별칭 하나로 "Pna"/"pna "까지 병합
  let resolved = window.teamAliases[name];
  if(!resolved){
    if(!window._teamAliasLC){
      const m={};
      for(const k in (window.teamAliases||{})) m[String(k).trim().toLowerCase()]=window.teamAliases[k];
      window._teamAliasLC=m;
    }
    resolved = window._teamAliasLC[String(name).trim().toLowerCase()];
  }
  let out = resolved || name;
  // 대소문자만 다른 변형은 최다 표기로 자동 통일 (별칭 결과에도 적용해 일관성 보장)
  try{
    const canon=wbdContext._autoCanonTeamMap()[String(out).trim().toLowerCase()];
    if(canon) out=canon;
  }catch(e){}
  return out;
};

// Original index.html:11198
wbdContext._getAllRawTeams = function _getAllRawTeams(){
  const teams=new Set();
  wbdContext.GAMES.forEach(g=>{
    const info=wbdContext._parseGameName(g.name);
    if(info.teamA&&!wbdContext._isScrimTeam(info.teamA))teams.add(info.teamA);
    if(info.teamB&&!wbdContext._isScrimTeam(info.teamB))teams.add(info.teamB);
  });
  return [...teams].sort();
};

// Original index.html:11207
wbdContext._getNormalizedTeams = function _getNormalizedTeams(){
  const teams=new Set();
  wbdContext._getAllRawTeams().forEach(t=>{
    const n=wbdContext._normalizeTeam(t);
    if(n)teams.add(n);
  });
  return [...teams].sort();
};

// Original index.html:11217
wbdContext._getActiveTeams = function _getActiveTeams(){
  const teams=new Set();
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA), tB=wbdContext._normalizeTeam(info.teamB);
    if(tA&&!wbdContext._isScrimTeam(tA))teams.add(tA);
    if(tB&&!wbdContext._isScrimTeam(tB))teams.add(tB);
  });
  Object.values(window.MANUAL_TEAMS||{}).forEach(t=>{ if(t&&String(t).trim())teams.add(String(t).trim()); });
  return [...teams].filter(t=>t&&t!=='—').sort();
};

// Original index.html:11231
wbdContext.openTeamAliasManager = function openTeamAliasManager(){
  const raw=wbdContext._getAllRawTeams();
  const normSet=wbdContext._getNormalizedTeams();
  let html=`<div style="margin-bottom:14px">
    <div style="font-size:18px;font-weight:700;margin-bottom:6px">🔗 팀명 병합 관리</div>
    <div style="font-size:12px;color:var(--muted)">오타가 난 팀명을 정식 팀명에 병합하세요. 각 팀명을 어느 팀으로 취급할지 선택합니다.</div>
  </div>`;
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>원본 팀명</th><th>병합 대상</th></tr></thead><tbody>';
  raw.forEach(t=>{
    const cur=window.teamAliases[t]||t;
    const options=raw.map(r=>`<option value="${r}" ${cur===r?'selected':''}>${r}</option>`).join('');
    html+=`<tr>
      <td style="font-family:var(--mono);font-size:12px">${t}</td>
      <td><select onchange="setTeamAlias('${t.replace(/'/g,"\\'")}', this.value)" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:3px;font-size:11px;width:100%">${options}</select></td>
    </tr>`;
  });
  html+='</tbody></table></div>';
  html+='<div style="margin-top:14px;display:flex;gap:8px"><button class="btn-secondary" onclick="resetTeamAliases()" style="font-size:11px;padding:6px 14px">초기화</button><button class="btn-secondary" onclick="closeModal()" style="font-size:11px;padding:6px 14px;background:var(--amber);color:#111;border-color:var(--amber)">✓ 완료</button></div>';
  wbdContext.openModal(html);
};

// Original index.html:11251
wbdContext.setTeamAlias = function setTeamAlias(from,to){
  if(from===to)delete window.teamAliases[from];
  else window.teamAliases[from]=to;
  wbdContext._saveTeamAliases();
  // 캐시 재빌드 (자동 팀 추정에 영향)
  if(typeof wbdContext._rebuildCaches==='function')wbdContext._rebuildCaches();
  // 즉시 팀 분석/리더보드 반영
  if(document.getElementById('page-team').classList.contains('active'))wbdContext.renderTeamPage();
  if(document.getElementById('page-leaderboard').classList.contains('active'))wbdContext.renderLeaderboard();
  // 모달도 새로고침
  wbdContext.openTeamAliasManager();
};

// Original index.html:11263
wbdContext.resetTeamAliases = function resetTeamAliases(){
  window.teamAliases={};
  wbdContext._saveTeamAliases();
  if(typeof wbdContext._rebuildCaches==='function')wbdContext._rebuildCaches();
  if(document.getElementById('page-team').classList.contains('active'))wbdContext.renderTeamPage();
  if(document.getElementById('page-leaderboard').classList.contains('active'))wbdContext.renderLeaderboard();
  wbdContext.openTeamAliasManager();
};

// Original index.html:11273
wbdContext._playerTeam = function _playerTeam(name,type){
  // 1순위: 수동 지정
  const manual=(window.MANUAL_TEAMS||{})[String(name)];
  if(manual && String(manual).trim()) return String(manual).trim();
  // 2순위: _rebuildCaches가 미리 계산한 자동 팀 캐시 (V10.2 perf: 호출마다 전체 풀스캔하던 것 제거)
  const c=window._cache;
  if(c && c.autoTeam){
    const t=c.autoTeam[String(name)+'|'+type];
    if(t) return t;
  }
  return '—';
};

// Original index.html:11287
wbdContext._lbMinThreshold = function _lbMinThreshold(mode,type){
  const map={
    pitcher:{low:10,med:25,high:50,strict:100,extreme:200},
    batter:{low:5,med:15,high:30,strict:60,extreme:120}
  };
  if(mode==='0')return 0;
  if(mode==='custom'){
    return type==='pitcher'?(window.lbCustomMinP||25):(window.lbCustomMinB||15);
  }
  return map[type][mode]||map[type].med;
};

// Original index.html:11300
wbdContext._renderWARLeaderboard = function _renderWARLeaderboard(cat){
  const el=document.getElementById('leaderboard-content');
  if(!el)return;
  const direction=document.getElementById('lb-direction')?.value||'best';
  const minMode=document.getElementById('lb-min-filter').value;
  
  const allPNames=(window._cache.pitcherNames||[]).slice();
  const allBNames=(window._cache.batterNames||[]).slice();
  const minP=wbdContext._lbMinThreshold(minMode,'pitcher');
  const minB=wbdContext._lbMinThreshold(minMode,'batter');
  
  let rows=[];
  let title='', icon='', subtitle='';
  
  if(cat==='war-pitcher'){
    icon='⚾'; title='투수 WAR'; subtitle='Pitcher WAR (sabermetrics-style)';
    allPNames.forEach(n=>{
      const pd=wbdContext.getPitcherDataByName(n);
      if(pd.length<minP)return;
      const war=wbdContext.calcPitcherWAR(n);
      const _ps=wbdContext._getPitcherSeason(n);
      rows.push({
        name:n, war, type:'pitcher',
        ip:_ps.ipDisp||'-', era:_ps.era?.toFixed(2)||'-',
        ks:pd.filter(d=>wbdContext._isK(d)).length,
        pitches:pd.length,
        team:wbdContext._playerTeam(n,'pitcher')
      });
    });
  } else if(cat==='war-batter'){
    icon='🏏'; title='타자 WAR'; subtitle='Batter WAR (wOBA-based)';
    allBNames.forEach(n=>{
      const allB=wbdContext.getBatterDataByName(n);
      const bd=allB.filter(wbdContext._isInPlay);
      if(bd.length<minB)return;
      const war=wbdContext.calcBatterWAR(n);
      const PA=wbdContext._countPaEnd(allB).length;
      const hits=bd.filter(d=>wbdContext._isHit(d)).length;
      const hrs=bd.filter(d=>d.result===4).length;
      const bb=allB.filter(d=>d.result===5).length;
      const hbp=allB.filter(d=>d.result===6).length;
      const AB=PA-bb-hbp;
      rows.push({
        name:n, war, type:'batter',
        pa:PA, ab:AB, hits, hrs,
        avg:AB>0?(hits/AB).toFixed(3).replace(/^0/,''):'---',
        abs:bd.length,
        team:wbdContext._playerTeam(n,'batter')
      });
    });
  } else { // war-total
    icon='🏆'; title='통합 WAR (투타 합산)'; subtitle='Overall WAR · 투타 겸업 선수는 P+B 합산';
    const allNames=new Set([...allPNames,...allBNames]);
    allNames.forEach(n=>{
      const pd=wbdContext.getPitcherDataByName(n);
      const bd=wbdContext.getBatterDataByName(n).filter(wbdContext._isInPlay);
      const isPit=pd.length>=minP;
      const isBat=bd.length>=minB;
      if(!isPit&&!isBat)return;
      const pWar=isPit?wbdContext.calcPitcherWAR(n):0;
      const bWar=isBat?wbdContext.calcBatterWAR(n):0;
      const totalWar=pWar+bWar;
      const isHybrid=isPit&&isBat&&pWar!==0&&bWar!==0;
      rows.push({
        name:n, war:totalWar, pWar, bWar, isHybrid,
        type:isHybrid?'hybrid':(isPit?'pitcher':'batter'),
        pitches:pd.length, abs:bd.length,
        team:wbdContext._playerTeam(n,isHybrid||isPit?'pitcher':'batter')
      });
    });
  }
  
  rows.sort((a,b)=>direction==='worst'?a.war-b.war:b.war-a.war);
  rows=rows.slice(0,30);
  
  let html=`<div class="card section" style="text-align:center;padding:20px;background:linear-gradient(135deg,#1a1230,#0a1828);border:1px solid var(--amber)">
    <div style="font-size:11px;color:var(--amber);letter-spacing:3px;margin-bottom:6px">LEADERBOARD</div>
    <div style="font-size:24px;font-weight:700">${icon} ${title}</div>
    <div style="font-size:11px;color:var(--muted);margin-top:6px">${subtitle}</div>
  </div>`;
  
  html+='<div class="card section"><div class="tbl-wrap"><table class="data-table"><thead><tr>';
  if(cat==='war-pitcher'){
    html+='<th>#</th><th>선수</th><th>팀</th><th>IP</th><th>ERA</th><th>K</th><th>WAR</th>';
  } else if(cat==='war-batter'){
    html+='<th>#</th><th>선수</th><th>팀</th><th>PA</th><th>AB</th><th>H</th><th>HR</th><th>BA</th><th>WAR</th>';
  } else {
    html+='<th>#</th><th>선수</th><th>구분</th><th>팀</th><th>P WAR</th><th>B WAR</th><th>총합 WAR</th>';
  }
  html+='</tr></thead><tbody>';
  
  rows.forEach((r,i)=>{
    const goto=r.type==='pitcher'?`goToPitcher('${String(r.name).replace(/'/g,"\\'")}')`:`goToBatter('${String(r.name).replace(/'/g,"\\'")}')`;
    const warColor=r.war>=3?'#ffd700':r.war>=1?'#39ff8a':r.war>=0?'#88ccff':'#ff6b8a';
    if(cat==='war-pitcher'){
      html+=`<tr onclick="${goto}" style="cursor:pointer">
        <td>${i+1}</td><td style="font-weight:600">${r.name}</td>
        <td style="color:var(--muted);font-size:10px">${r.team}</td>
        <td style="font-family:var(--mono);color:#39ff8a">${r.ip}</td>
        <td style="font-family:var(--mono);color:#ff4560">${r.era}</td>
        <td style="font-family:var(--mono);color:#ff8800">${r.ks}</td>
        <td style="font-family:var(--mono);color:${warColor};font-weight:800;font-size:14px">${r.war.toFixed(2)}</td>
      </tr>`;
    } else if(cat==='war-batter'){
      html+=`<tr onclick="${goto}" style="cursor:pointer">
        <td>${i+1}</td><td style="font-weight:600">${r.name}</td>
        <td style="color:var(--muted);font-size:10px">${r.team}</td>
        <td style="font-family:var(--mono)">${r.pa}</td>
        <td style="font-family:var(--mono)">${r.ab}</td>
        <td style="font-family:var(--mono);color:#39ff8a">${r.hits}</td>
        <td style="font-family:var(--mono);color:#ffd700">${r.hrs}</td>
        <td style="font-family:var(--mono);font-weight:600">${r.avg}</td>
        <td style="font-family:var(--mono);color:${warColor};font-weight:800;font-size:14px">${r.war.toFixed(2)}</td>
      </tr>`;
    } else { // total
      const tag=r.isHybrid?'<span style="background:linear-gradient(90deg,#ff8c44,#cc44ff);color:#fff;padding:2px 6px;border-radius:3px;font-size:9px">⚔️ 겸업</span>':r.type==='pitcher'?'<span style="color:#88ccff;font-size:10px">⚾ 투수</span>':'<span style="color:#ff6b8a;font-size:10px">🏏 타자</span>';
      html+=`<tr onclick="${goto}" style="cursor:pointer">
        <td>${i+1}</td><td style="font-weight:600">${r.name}</td>
        <td>${tag}</td>
        <td style="color:var(--muted);font-size:10px">${r.team}</td>
        <td style="font-family:var(--mono);color:${r.pWar?'#88ccff':'var(--muted)'}">${r.pWar?r.pWar.toFixed(2):'—'}</td>
        <td style="font-family:var(--mono);color:${r.bWar?'#ff6b8a':'var(--muted)'}">${r.bWar?r.bWar.toFixed(2):'—'}</td>
        <td style="font-family:var(--mono);color:${warColor};font-weight:800;font-size:15px">${r.war.toFixed(2)}</td>
      </tr>`;
    }
  });
  html+='</tbody></table></div></div>';
  
  if(rows.length===0){
    html+='<div class="card section" style="text-align:center;color:var(--muted);padding:40px">조건에 맞는 선수가 없어요</div>';
  }
  
  el.innerHTML=html;
};

// Original index.html:11435
wbdContext.renderLeaderboard = function renderLeaderboard(){
  const cat=document.getElementById('lb-category').value;
  // WAR 카테고리는 별도 처리
  if(cat.startsWith('war-')){
    return wbdContext._renderWARLeaderboard(cat);
  }
  const minMode=document.getElementById('lb-min-filter').value;
  const el=document.getElementById('leaderboard-content');
  if(!el)return;

  const isPitcher=cat.startsWith('p-');
  const type=isPitcher?'pitcher':'batter';
  const minN=wbdContext._lbMinThreshold(minMode,type);

  // 해당 타입 선수 목록 (캐시 사용)
  const names = isPitcher ? window._cache.pitcherNames : window._cache.batterNames;

  // 각 선수의 카테고리 값 계산
  const rows=[];
  names.forEach(name=>{
    if(isPitcher){
      const pd=wbdContext.getPitcherDataByName(name);
      if(pd.length<minN)return;
      const card=wbdContext.calcPitcherCard(name);
      const battedPd=wbdContext.getPitcherDataByName(name).filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
      const baHits=battedPd.filter(wbdContext._isHit).length;
      const baAgainst=battedPd.length?baHits/battedPd.length:0;
      const hrAgainst=battedPd.filter(d=>d.result===4).length;
      const hrRate=battedPd.length?hrAgainst/battedPd.length*100:0;
      const bb=pd.filter(d=>d.result===5||d.result===6).length;
      const bbPct=pd.length?bb/pd.length*100:0;
      const ks=pd.filter(d=>wbdContext._isK(d)).length;
      const kPct=pd.length?ks/pd.length*100:0;
      const kbb=bb>0?ks/bb:(ks>0?99:0);
      const fbSpds=pd.filter(d=>d.spdK>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
      const avgFbSpd=fbSpds.length?fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length:0;
      // 원본 구력 (pPow, 직구 기준)
      const fbPow=pd.filter(d=>+d.pPow>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.pPow);
      const avgFbPow=fbPow.length?fbPow.reduce((a,b)=>a+b,0)/fbPow.length:0;
      const maxFbPow=fbPow.length?fbPow.reduce((a,b)=>Math.max(a,b),0):0;
      const maxFbSpd=fbSpds.length?fbSpds.reduce((a,b)=>Math.max(a,b),0):0;
      // 헛스윙률 (전체)
      const pSw=pd.filter(d=>d.bSwing);
      const pWh=pSw.filter(d=>!d.ev||+d.ev===0);
      const whiffPct=pSw.length?pWh.length/pSw.length*100:0;
      // 평균 피EV · 피HH% · 피배럴%
      const avgEv=battedPd.length?battedPd.reduce((s,d)=>s+(+d.ev),0)/battedPd.length:0;
      const hhA=battedPd.filter(d=>wbdContext._isHardHit(d)).length;
      const hhPctA=battedPd.length?hhA/battedPd.length*100:0;
      const brlA=battedPd.filter(d=>wbdContext._isBarrel(d)).length;
      const brlPctA=battedPd.length?brlA/battedPd.length*100:0;
      // 존내 헛스윙률
      const zIn=pd.filter(d=>d.zoneX!=null&&Math.abs(+d.zoneX)<=1&&Math.abs(+d.zoneY||0)<=1);
      const zInSw=zIn.filter(d=>d.bSwing);
      const zInWh=zInSw.filter(d=>!d.ev||+d.ev===0);
      const zinWhiffPct=zInSw.length?zInWh.length/zInSw.length*100:0;
      // 존밖 헛스윙률
      const zOutP=pd.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
      const zOutSwP=zOutP.filter(d=>d.bSwing);
      const zOutWhP=zOutSwP.filter(d=>!d.ev||+d.ev===0);
      const ozWhiffPctP=zOutSwP.length?zOutWhP.length/zOutSwP.length*100:0;
      // 제구 5영역
      let midC=0,sltC=0,gdC=0,brdC=0;
      pd.filter(d=>d.zoneX!=null).forEach(d=>{
        const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
        const rmax=Math.max(zx,zy);
        if(rmax<=1&&rmax<=0.4)midC++;
        else if(rmax>=0.85&&rmax<=1.15)brdC++;
        else if(rmax<=1){if(rmax<=0.6)sltC++;else gdC++;}
      });
      const inZN=midC+sltC+gdC+brdC;
      const mistakePct=inZN?midC/inZN*100:0;
      const borderPct=inZN?brdC/inZN*100:0;
      const safePct=inZN?(gdC+brdC)/inZN*100:0;
      // 스트라이크%
      const strK=pd.filter(d=>d.call===0||d.call===2||d.call===4).length;
      const strikePct=pd.length?strK/pd.length*100:0;
      // 초구 스트라이크%
      const fp=pd.filter(d=>d.ball===0&&d.strk===0);
      const fpsCnt=fp.filter(d=>d.call===0||d.call===2||d.call===4).length;
      const fpsPct=fp.length?fpsCnt/fp.length*100:0;
      // ERA / WHIP / IP / 실점 (캐싱된 헬퍼)
      const _ps=wbdContext._getPitcherSeason(name);
      const totalIp=_ps.ip, totalRuns=_ps.runs, totalH=_ps.hits, totalBB=_ps.bbs, totalOuts=_ps.outs;
      const eraVal=totalIp>0?_ps.era:99;
      const whipVal=totalIp>0?_ps.whip:99;
      const ipDispLB=_ps.ipDisp;
      // 이닝당 투구수 (P/IP)
      const paE=wbdContext._countPaEnd(pd);
      const ppPA=totalIp>0?pd.length/totalIp:0;
      // 체이스 유도
      const ozP=pd.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
      const ozSwP=ozP.filter(d=>d.bSwing);
      const chasePct=ozP.length?ozSwP.length/ozP.length*100:0;
      // 구종 다양성
      const gCount={};
      pd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);gCount[g]=(gCount[g]||0)+1;});
      const varN=Object.values(gCount).filter(n=>n/pd.length>=0.05).length;
      let v,display;
      if(cat==='p-spd'){v=avgFbSpd;display=v.toFixed(1)+' km/h';}
      else if(cat==='p-pow'){v=avgFbPow;display=avgFbPow>0?avgFbPow.toFixed(1):'-';}
      else if(cat==='p-maxpow'){v=maxFbPow;display=maxFbPow>0?maxFbPow.toFixed(0):'-';}
      else if(cat==='p-uncapped'){
        // pPow → km/h 환산 (개별 변환 후 평균)
        const fbKmhsLb=fbPow.map(p=>wbdContext._ppowToKmh(p));
        const uncapped=fbKmhsLb.length?fbKmhsLb.reduce((a,b)=>a+b,0)/fbKmhsLb.length:0;
        v=uncapped;display=uncapped>0?uncapped.toFixed(1)+' km/h':'-';
      }
      else if(cat==='p-uncappedmax'){
        const uncappedMax=maxFbPow>0?wbdContext._ppowToKmh(maxFbPow):0;
        v=uncappedMax;display=uncappedMax>0?uncappedMax.toFixed(1)+' km/h':'-';
      }
      else if(cat==='p-k'){v=kPct;display=v.toFixed(1)+'%';}
      else if(cat==='p-kbb'){v=kbb;display=kbb>=99?'∞':kbb.toFixed(2);}
      else if(cat==='p-ba'){v=-baAgainst;display=baAgainst.toFixed(3).replace(/^0/,'');}
      else if(cat==='p-bb'){v=-bbPct;display=bbPct.toFixed(1)+'%';}
      else if(cat==='p-hr'){v=-hrAgainst;display=hrAgainst+'개';}
      else if(cat==='p-hrrate'){v=-hrRate;display=hrRate.toFixed(1)+'%';}
      else if(cat==='p-whiff'){v=whiffPct;display=whiffPct.toFixed(1)+'%';}
      else if(cat==='p-ev'){v=-avgEv;display=avgEv.toFixed(1)+' km/h';}
      else if(cat==='p-gidp'){const gd=pd.filter(d=>wbdContext._isGIDP(d)).length; v=gd; display=String(gd);}
      else if(cat==='p-hh'){v=-hhPctA;display=hhPctA.toFixed(1)+'%';}
      else if(cat==='p-hhp'){const hhpA=battedPd.filter(d=>wbdContext._isHHPlus(d)).length;const p=battedPd.length?hhpA/battedPd.length*100:0;v=-p;display=p.toFixed(1)+'%';}
      else if(cat==='p-barrel'){v=-brlPctA;display=brlPctA.toFixed(1)+'%';}
      else if(cat==='p-brlp'){const brlpA=battedPd.filter(d=>wbdContext._isBarrelPlus(d)).length;const p=battedPd.length?brlpA/battedPd.length*100:0;v=-p;display=p.toFixed(1)+'%';}
      else if(cat==='p-zwhiff'){v=zinWhiffPct;display=zinWhiffPct.toFixed(1)+'%';}
      else if(cat==='p-ozwhiff'){v=ozWhiffPctP;display=ozWhiffPctP.toFixed(1)+'%';}
      else if(cat==='p-mistake'){v=-mistakePct;display=mistakePct.toFixed(1)+'%';}
      else if(cat==='p-border'){v=borderPct;display=borderPct.toFixed(1)+'%';}
      else if(cat==='p-safe'){v=safePct;display=safePct.toFixed(1)+'%';}
      else if(cat==='p-strike'){v=strikePct;display=strikePct.toFixed(1)+'%';}
      else if(cat==='p-fps'){v=fpsPct;display=fpsPct.toFixed(1)+'%';}
      else if(cat==='p-ppa'){v=-ppPA;display=ppPA.toFixed(1);}
      else if(cat==='p-chase'){v=chasePct;display=chasePct.toFixed(1)+'%';}
      else if(cat==='p-var'){v=varN;display=varN+'종';}
      else if(cat==='p-ovr'){v=card.OVR;display=card.OVR;}
      else if(cat==='p-era'){v=totalIp>=3?-eraVal:-999;display=totalIp>=3?eraVal.toFixed(2):'-';}
      else if(cat==='p-whip'){v=totalIp>=3?-whipVal:-999;display=totalIp>=3?whipVal.toFixed(2):'-';}
      else if(cat==='p-ip'){v=totalIp;display=ipDispLB;}
      else if(cat==='p-runs'){v=-totalRuns;display=totalRuns+'점';}
      else if(cat==='p-ra9'){const _r9=totalIp>0?totalRuns/totalIp*9:null; v=(totalIp>=3&&_r9!=null)?-_r9:-999; display=(totalIp>=3&&_r9!=null)?_r9.toFixed(2):'-';}
      else if(cat==='p-eraplus'){
        let _lg=5.6; try{ const _L=(wbdContext._computeRecordsData()||{}).lg; if(_L&&_L.lgRA9>0)_lg=_L.lgRA9; }catch(_){}
        const _ep=(totalIp>=3&&eraVal>0&&eraVal<99)?_lg/eraVal*100:null;
        v=_ep!=null?_ep:-999; display=_ep!=null?_ep.toFixed(0):'-';
      }
      rows.push({name,type,v,display,card,n:pd.length,team:wbdContext._playerTeam(name,'pitcher')});
    } else {
      const bd=wbdContext.getBatterDataByName(name).filter(wbdContext._isInPlay);
      const bdQ=bd.filter(d=>!wbdContext._isBunt(d)); // 타구질 통계용 (번트 제외)
      const all=wbdContext.getBatterDataByName(name);
      // 번트 카테고리는 일반 타구 기준 무시 (번트 시도만 있으면 집계)
      const isBuntCat=cat==='b-bunt'||cat==='b-bunthit'||cat==='b-buntrate';
      if(!isBuntCat && bd.length<minN)return;
      const card=wbdContext.calcBatterCard(name);
      // 표준 BA (AB = 인플레이 + K)
      const hits = all.filter(wbdContext._isHit).length;
      const hrs = all.filter(d => +d.result===4).length;
      const singles = all.filter(d => +d['1BSafe']===1 && +d.result!==4).length;
      const ab = all.filter(d => {
        const r=+d.result;
        return wbdContext._isABPitch(d);
      }).length;
      const hrRate=bd.length?hrs/bd.length*100:0;
      const barrels=bdQ.filter(d=>wbdContext._isBarrel(d)).length;
      const avgEV=bdQ.length?bdQ.reduce((a,b)=>a+(+b.ev),0)/bdQ.length:0;
      const maxEV=bdQ.length?Math.max(...bdQ.map(d=>+d.ev)):0;
      const avg = ab > 0 ? hits/ab : 0;
      const slg = ab > 0 ? wbdContext._totalBases(all)/ab : 0;  // V10.1: 정확한 SLG
      const iso=slg-avg;
      const _paLB=wbdContext._countPaEnd(all);
      const _bbLB=_paLB.filter(d=>+d.result===5).length, _hbpLB=_paLB.filter(d=>+d.result===6).length;
      const obpLB=_paLB.length>0?(hits+_bbLB+_hbpLB)/_paLB.length:0;
      const opsLB=obpLB+slg;
      const brlPct=bdQ.length?barrels/bdQ.length*100:0;
      const hhB=bdQ.filter(d=>wbdContext._isHardHit(d)).length;
      const hhPctB=bdQ.length?hhB/bdQ.length*100:0;
      const ldHits=bdQ.filter(d=>+d.ldeg>=10&&+d.ldeg<=30).length;
      const ldPct=bdQ.length?ldHits/bdQ.length*100:0;
      const hposD=bdQ.filter(d=>d.hPos!=null);
      const sweet=hposD.filter(d=>+d.hPos>=0.35&&+d.hPos<=0.65).length;
      const sweetPct=hposD.length?sweet/hposD.length*100:0;
      // 타구 비거리 (lx, lz 실측) · 번트 제외
      const distBd=bdQ.filter(d=>+d.lx!==0||+d.lz!==0).map(d=>Math.sqrt((+d.lx||0)**2+(+d.lz||0)**2));
      const avgDist=distBd.length?distBd.reduce((a,b)=>a+b,0)/distBd.length:0;
      const maxDist=distBd.length?Math.max(...distBd):0;
      // 헛스윙·체이스·컨택·BB - 존별 세분화
      const swB=all.filter(d=>d.bSwing);
      const whB=swB.filter(d=>!d.ev||+d.ev===0);
      const whiffPctB=swB.length?whB.length/swB.length*100:0;
      const contactAllPctB=swB.length?(swB.length-whB.length)/swB.length*100:0;
      // 전체 스윙률
      const swingPctB=all.length?swB.length/all.length*100:0;
      // 존 밖 (체이스)
      const ozB=all.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
      const ozSwB=ozB.filter(d=>d.bSwing);
      const chasePctB=ozB.length?ozSwB.length/ozB.length*100:0;
      const ozWhB=ozSwB.filter(d=>!d.ev||+d.ev===0);
      const ozWhiffPctB=ozSwB.length?ozWhB.length/ozSwB.length*100:0;
      const ozContactPctB=ozSwB.length?(ozSwB.length-ozWhB.length)/ozSwB.length*100:0;
      // 존 안
      const izB=all.filter(d=>d.zoneX!=null&&Math.abs(+d.zoneX)<=1&&Math.abs(+d.zoneY||0)<=1);
      const izSwB=izB.filter(d=>d.bSwing);
      const izWhB=izSwB.filter(d=>!d.ev||+d.ev===0);
      const izWhiffPctB=izSwB.length?izWhB.length/izSwB.length*100:0;
      const izContactB=izSwB.filter(d=>+d.ev>0);
      const contactPctB=izSwB.length?izContactB.length/izSwB.length*100:0; // 존 안 컨택
      const izSwingPctB=izB.length?izSwB.length/izB.length*100:0;
      const bbB=all.filter(d=>d.result===5).length;
      const bbPctB=all.length?bbB/all.length*100:0;
      // 타석당 투구수
      const paEB=wbdContext._countPaEnd(all);
      const ppPAB=paEB.length?all.length/paEB.length:0;
      // 초구 스윙
      const fpB=all.filter(d=>d.ball===0&&d.strk===0);
      const fpSwB=fpB.filter(d=>d.bSwing);
      const fpSwPctB=fpB.length?fpSwB.length/fpB.length*100:0;
      // 번트 관련
      const buntB=all.filter(d=>wbdContext._isBunt(d));
      const buntHits=buntB.filter(d=>d['1BSafe']==1).length;
      const buntRate=buntB.length?buntHits/buntB.length*100:0;
      let v,display;
      if(cat==='b-avg'){v=avg;display=avg.toFixed(3).replace(/^0/,'');}
      else if(cat==='b-slg'){v=slg;display=slg.toFixed(3).replace(/^0/,'');}
      else if(cat==='b-ops'){v=opsLB;display=opsLB.toFixed(3).replace(/^0/,'');}
      else if(cat==='b-obp'){v=obpLB;display=obpLB.toFixed(3).replace(/^0/,'');}
      else if(cat==='b-iso'){v=iso;display=iso.toFixed(3).replace(/^0/,'');}
      else if(cat==='b-hr'){v=hrs;display=hrs+'개';}
      else if(cat==='b-hrrate'){v=hrRate;display=hrRate.toFixed(1)+'%';}
      else if(cat==='b-hits'){v=hits;display=hits+'개';}
      else if(cat==='b-ev'){v=avgEV;display=avgEV.toFixed(1)+' km/h';}
      else if(cat==='b-gidp'){const gd=bd.filter(d=>wbdContext._isGIDP(d)).length; v=-gd; display=String(gd);}
      else if(cat==='b-hh'){v=hhPctB;display=hhPctB.toFixed(1)+'%';}
      else if(cat==='b-hhp'){const hhpB=bdQ.filter(d=>wbdContext._isHHPlus(d)).length;const p=bdQ.length?hhpB/bdQ.length*100:0;v=p;display=p.toFixed(1)+'%';}
      else if(cat==='b-brl'){v=brlPct;display=brlPct.toFixed(1)+'%';}
      else if(cat==='b-brlp'){const brlpB=bdQ.filter(d=>wbdContext._isBarrelPlus(d)).length;const p=bdQ.length?brlpB/bdQ.length*100:0;v=p;display=p.toFixed(1)+'%';}
      else if(cat==='b-ld'){v=ldPct;display=ldPct.toFixed(1)+'%';}
      else if(cat==='b-sweet'){v=sweetPct;display=sweetPct.toFixed(1)+'%';}
      else if(cat==='b-dist'){v=avgDist;display=avgDist.toFixed(1);}
      else if(cat==='b-maxdist'){v=maxDist;display=maxDist.toFixed(1);}
      else if(cat==='b-whiff'){v=-whiffPctB;display=whiffPctB.toFixed(1)+'%';}
      else if(cat==='b-whiff-in'){v=-izWhiffPctB;display=izWhiffPctB.toFixed(1)+'%';}
      else if(cat==='b-whiff-out'){v=-ozWhiffPctB;display=ozWhiffPctB.toFixed(1)+'%';}
      else if(cat==='b-chase'){v=-chasePctB;display=chasePctB.toFixed(1)+'%';}
      else if(cat==='b-contact'){v=contactAllPctB;display=contactAllPctB.toFixed(1)+'%';}
      else if(cat==='b-contact-in'){v=contactPctB;display=contactPctB.toFixed(1)+'%';}
      else if(cat==='b-contact-out'){v=ozContactPctB;display=ozContactPctB.toFixed(1)+'%';}
      else if(cat==='b-swing'){v=swingPctB;display=swingPctB.toFixed(1)+'%';}
      else if(cat==='b-swing-in'){v=izSwingPctB;display=izSwingPctB.toFixed(1)+'%';}
      else if(cat==='b-bb'){v=bbPctB;display=bbPctB.toFixed(1)+'%';}
      else if(cat==='b-ppa'){v=ppPAB;display=ppPAB.toFixed(2);}
      else if(cat==='b-fpsw'){v=fpSwPctB;display=fpSwPctB.toFixed(1)+'%';}
      else if(cat==='b-bunt'){
        if(buntB.length===0)return; // 번트 안 한 타자는 제외
        v=buntB.length;display=buntB.length+'회';
      }
      else if(cat==='b-bunthit'){
        if(buntB.length===0)return;
        v=buntHits;display=buntHits+'개 / '+buntB.length+'회';
      }
      else if(cat==='b-buntrate'){
        if(buntB.length<3)return; // 번트 성공률은 3회 이상만
        v=buntRate;display=buntRate.toFixed(1)+'% ('+buntHits+'/'+buntB.length+')';
      }
      else if(cat==='b-ovr'){v=card.OVR;display=card.OVR;}
      rows.push({name,type,v,display,card,n:bd.length,team:wbdContext._playerTeam(name,'batter')});
    }
  });

  // 정렬 방향 (best=잘하는순 / worst=못하는순)
  const direction=document.getElementById('lb-direction')?.value||'best';
  if(direction==='worst')rows.sort((a,b)=>a.v-b.v);
  else rows.sort((a,b)=>b.v-a.v);
  const top=rows.slice(0,30);
  if(top.length===0){el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">조건을 만족하는 선수가 없어요</div>';return;}

  // 카테고리 라벨
  const catLabel={
    'p-spd':'평균 직구 구속','p-pow':'평균 원본 구력','p-maxpow':'최고 원본 구력',
    'p-uncapped':'무제한 직구 구속 (캡 풀렸을 때)','p-uncappedmax':'무제한 최고 구속',
    'p-k':'K%','p-kbb':'K/BB',
    'p-era':'ERA (방어율)','p-eraplus':'ERA+ (리그평균 대비)','p-whip':'WHIP','p-ip':'이닝 (IP)','p-runs':'실점','p-ra9':'RA9 (9이닝당 실점)',
    'p-ba':'피안타율','p-bb':'BB%','p-hr':'피홈런','p-hrrate':'피홈런%',
    'p-whiff':'헛스윙%','p-ev':'평균 피EV','p-hh':'피하드히트%','p-hhp':'피HH+%(≥125)','p-barrel':'피배럴%','p-brlp':'피배럴+%(≥125&LA20~40)',
    'p-zwhiff':'존내 헛스윙%','p-ozwhiff':'존밖 헛스윙%','p-mistake':'실투율','p-border':'보더라인%','p-safe':'안전존%',
    'p-strike':'스트라이크%','p-fps':'초구 스트라이크%','p-ppa':'이닝당 투구수',
    'p-chase':'체이스 유도%','p-var':'구종 다양성','p-ovr':'투수 OVR',
    'b-avg':'타율','b-slg':'장타율','b-ops':'OPS','b-obp':'출루율','b-iso':'ISO','b-hr':'홈런','b-hrrate':'홈런%','b-hits':'안타',
    'b-gidp':'병살타(적은순)','p-gidp':'병살 유도','b-ev':'평균 EV','b-hh':'하드히트%','b-hhp':'HH+%(≥125)','b-brl':'배럴%','b-brlp':'배럴+%(≥125&LA20~40)','b-ld':'라인드라이브%','b-sweet':'스윗스팟%','b-dist':'평균 비거리','b-maxdist':'최장 비거리',
    'b-whiff':'헛스윙% 전체','b-whiff-in':'헛스윙% 존 안','b-whiff-out':'헛스윙% 존 밖',
    'b-contact':'컨택률 전체','b-contact-in':'컨택률 존 안','b-contact-out':'컨택률 존 밖',
    'b-chase':'체이스%','b-swing':'스윙% 전체','b-swing-in':'스윙% 존 안','b-bb':'BB%',
    'b-ppa':'타석당 투구수','b-fpsw':'초구 스윙%','b-ovr':'타자 OVR',
    'b-bunt':'번트 시도','b-bunthit':'번트 안타','b-buntrate':'번트 성공률'
  }[cat];

  const dirIcon=direction==='worst'?'💩':'🏆';
  const dirLabel=direction==='worst'?'BOTTOM':'TOP';
  const dirColor=direction==='worst'?'#ff8844':'#ffd700';
  let html=`<div class="card section"><div class="card-title" style="color:${dirColor}">${dirIcon} ${catLabel} ${dirLabel} ${top.length}</div>`;
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>이름</th><th>타입</th><th>팀</th><th>'+catLabel+'</th><th>OVR</th><th>샘플</th></tr></thead><tbody>';
  top.forEach((r,i)=>{
    const rank=i+1;
    // 워스트 순위일 때는 메달 대신 숫자 (꼴찌가 1등이라 어색하므로)
    const medal=direction==='worst'?`<span style="color:#ff6644;font-weight:700">${rank}</span>`:(rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank);
    const ovrCol=wbdContext.cardOvrColor(r.card.OVR);
    const typeIcon=r.type==='pitcher'?'⚾':'🏏';
    const gotoFn=r.type==='pitcher'?'goToPitcher':'goToBatter';
    html+=`<tr onclick="${gotoFn}('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td style="font-size:14px;text-align:center">${medal}</td>
      <td style="font-weight:600">${r.name}</td>
      <td>${typeIcon}</td>
      <td style="color:var(--muted)">${r.team}</td>
      <td style="font-family:var(--mono);color:var(--amber);font-size:14px;font-weight:700">${r.display}</td>
      <td style="font-family:var(--mono);color:${ovrCol};font-weight:700">${r.card.OVR}</td>
      <td style="color:var(--muted)">${r.n}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // Top 3 강조 카드 (1위 - 2위 - 3위 순으로 표시)
  const top3=top.slice(0,3);
  if(top3.length>=3){
    let podium='<div class="grid3 section" style="margin-bottom:16px">';
    const medals=['🥇','🥈','🥉'];
    const colors=['#ffd700','#c0c0c0','#cd7f32'];
    top3.forEach((r,idx)=>{
      podium+=`<div class="card" style="text-align:center;border-top:3px solid ${colors[idx]}">
        <div style="font-size:28px;margin-bottom:6px">${medals[idx]}</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:2px">${r.name}</div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:10px">${r.team}</div>
        <div style="font-size:24px;font-family:var(--mono);color:var(--amber);font-weight:700">${r.display}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">OVR <span style="color:${wbdContext.cardOvrColor(r.card.OVR)};font-weight:700">${r.card.OVR}</span></div>
      </div>`;
    });
    podium+='</div>';
    html=podium+html;
  }

  el.innerHTML=html;
};

// Original index.html:11779
wbdContext._renderGroupAnalysisPage = function _renderGroupAnalysisPage(sel){
  const groups=window.PLAYER_GROUPS?.groups||[];
  const prev=sel.value;
  sel.innerHTML=groups.length
    ? groups.map(g=>`<option value="${g.id}">${g.icon||'👥'} ${g.name} (${(g.members||[]).length}명)</option>`).join('')
    : '<option value="">(그룹 없음)</option>';
  if(prev && groups.find(g=>g.id===prev)) sel.value=prev;
  const groupId=sel.value||(groups[0]?.id);
  
  const out=document.getElementById('team-content');
  if(!groupId || !groups.length){
    out.innerHTML=`<div style="padding:60px;text-align:center;color:var(--muted)">
      <div style="font-size:48px;margin-bottom:14px">👥</div>
      <div style="font-size:14px;margin-bottom:10px">아직 그룹이 없어요</div>
      <button onclick="openTeamGroupEditor()" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">+ 첫 그룹 만들기</button>
    </div>`;
    return;
  }
  
  const g=groups.find(x=>x.id===groupId);
  if(!g){out.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">그룹을 찾을 수 없어요</div>';return;}
  
  const members=(g.members||[]).filter(n=>n);
  const inDataNames=new Set([...wbdContext.G.map(d=>String(d.pName||'')),...wbdContext.G.map(d=>String(d.bName||''))].filter(n=>n));
  const validMembers=members.filter(n=>inDataNames.has(String(n)));
  const missingMembers=members.filter(n=>!inDataNames.has(String(n)));
  
  let html='';
  
  // 헤더
  html+=`<div class="card section" style="background:linear-gradient(135deg,${g.color||'#888'}22,#0a1828);border:1px solid ${g.color||'#888'};padding:18px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <div style="font-size:48px">${g.icon||'👥'}</div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:11px;color:${g.color||'#888'};letter-spacing:2px;text-transform:uppercase">PLAYER GROUP</div>
        <div style="font-size:24px;font-weight:900;color:var(--text);margin:4px 0">${g.name}</div>
        ${g.note?`<div style="font-size:12px;color:var(--muted);margin-top:4px">${g.note}</div>`:''}
        <div style="font-size:11px;color:var(--muted);margin-top:6px">${members.length}명 (데이터에 있는 ${validMembers.length}명${missingMembers.length?`, 데이터 없는 ${missingMembers.length}명`:''})</div>
      </div>
      <button onclick="openTeamGroupEditor()" style="background:${g.color||'#888'}33;border:1px solid ${g.color||'#888'};color:${g.color||'#888'};padding:8px 14px;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">✏️ 멤버 편집</button>
    </div>
  </div>`;
  
  if(!validMembers.length){
    html+=`<div style="padding:40px;text-align:center;color:var(--muted);background:var(--card);border-radius:8px">이 그룹에 데이터가 있는 선수가 없어요</div>`;
    out.innerHTML=html;
    return;
  }
  
  // 멤버 분류 (캐시된 이름 사용)
  const pNames=new Set(window._cache.pitcherNames);
  const bNames=new Set(window._cache.batterNames);
  const memSet=new Set(validMembers.map(String));
  const groupPitchers=[...pNames].filter(n=>memSet.has(n));
  const groupBatters=[...bNames].filter(n=>memSet.has(n));
  
  // ═══ 그룹 집계 통계 (캐시 인덱스 사용) ═══
  const batterDataAll = [];
  validMembers.forEach(n => {
    const d = wbdContext.getBatterDataByName(n);
    d.forEach(p => { if(p.spdK > 0) batterDataAll.push(p); });
  });
  const totalAB=batterDataAll.filter(wbdContext._isInPlay).length;
  const totalHits=batterDataAll.filter(wbdContext._isHit).length;
  const totalHRs=batterDataAll.filter(d=>d.result===4).length;
  const totalBBs=batterDataAll.filter(d=>d.result===5).length;
  const totalKsB=batterDataAll.filter(d=>wbdContext._isK(d)).length;
  const groupAvg=totalAB>0?(totalHits/totalAB):0;
  const pitcherDataAll = [];
  validMembers.forEach(n => {
    const d = wbdContext.getPitcherDataByName(n);
    d.forEach(p => { if(p.spdK > 0) pitcherDataAll.push(p); });
  });
  const pTotalKs=pitcherDataAll.filter(d=>wbdContext._isK(d)).length;
  const pTotalBBs=pitcherDataAll.filter(d=>d.result===5).length;
  const pTotalHits=pitcherDataAll.filter(wbdContext._isHit).length;
  const pTotalHRs=pitcherDataAll.filter(d=>d.result===4).length;
  const pTotalAB=pitcherDataAll.filter(wbdContext._isInPlay).length;
  const pBA=pTotalAB>0?(pTotalHits/pTotalAB):0;
  
  const pCards=groupPitchers.map(n=>wbdContext.calcPitcherCard(n)).filter(c=>c&&!c.lowData);
  const bCards=groupBatters.map(n=>wbdContext.calcBatterCard(n)).filter(c=>c&&!c.lowData);
  const avgPOvr=pCards.length?pCards.reduce((s,c)=>s+c.OVR,0)/pCards.length:0;
  const avgBOvr=bCards.length?bCards.reduce((s,c)=>s+c.OVR,0)/bCards.length:0;
  // WAR는 데이터 부족해도 합산 (낮은 WAR로 페널티 받음)
  const totalPWar=groupPitchers.reduce((s,n)=>s+(wbdContext.calcPitcherWAR(n)||0),0);
  const totalBWar=groupBatters.reduce((s,n)=>s+(wbdContext.calcBatterWAR(n)||0),0);
  // 데이터 부족 카운트
  const allPCards=groupPitchers.map(n=>wbdContext.calcPitcherCard(n)).filter(c=>c);
  const allBCards=groupBatters.map(n=>wbdContext.calcBatterCard(n)).filter(c=>c);
  const lowPCount=allPCards.filter(c=>c.lowData).length;
  const lowBCount=allBCards.filter(c=>c.lowData).length;
  
  // 통계 요약
  html+=`<div class="grid3" style="margin-bottom:14px">
    <div class="card stat" style="text-align:center">
      <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">그룹 멤버</div>
      <div style="font-size:36px;font-weight:900;color:${g.color||'var(--amber)'};font-family:var(--mono)">${validMembers.length}</div>
      <div style="font-size:11px;color:var(--muted)">투수 ${groupPitchers.length} · 타자 ${groupBatters.length}</div>
    </div>
    <div class="card stat" style="text-align:center">
      <div style="font-size:11px;color:#39ff8a;text-transform:uppercase;letter-spacing:1px">🏏 그룹 타격 평균</div>
      <div style="font-size:30px;font-weight:900;color:#39ff8a;font-family:var(--mono)">${groupAvg.toFixed(3).replace(/^0/,'')}</div>
      <div style="font-size:11px;color:var(--muted)">${totalHits}H/${totalAB}AB · HR ${totalHRs} · BB ${totalBBs} · K ${totalKsB}</div>
    </div>
    <div class="card stat" style="text-align:center">
      <div style="font-size:11px;color:#ff8c44;text-transform:uppercase;letter-spacing:1px">⚾ 그룹 피안타율</div>
      <div style="font-size:30px;font-weight:900;color:#ff8c44;font-family:var(--mono)">${pBA.toFixed(3).replace(/^0/,'')}</div>
      <div style="font-size:11px;color:var(--muted)">K ${pTotalKs} · BB ${pTotalBBs} · 피HR ${pTotalHRs}</div>
    </div>
  </div>`;
  
  html+=`<div class="grid2" style="margin-bottom:14px">
    <div class="card stat">
      <div style="font-size:12px;color:#88ccff;font-weight:600;margin-bottom:8px">⚾ 투수 종합${lowPCount>0?` <span style="font-size:9px;color:#4a7aaa;font-weight:400">(평균은 충분한 ${pCards.length}/${allPCards.length}명)</span>`:''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><div style="font-size:10px;color:var(--muted)">평균 OVR</div><div style="font-size:24px;font-weight:900;color:${wbdContext.cardOvrColor(avgPOvr)};font-family:var(--mono)">${pCards.length?avgPOvr.toFixed(0):'-'}</div></div>
        <div><div style="font-size:10px;color:var(--muted)">합산 WAR</div><div style="font-size:24px;font-weight:900;color:var(--amber);font-family:var(--mono)">${totalPWar.toFixed(2)}</div></div>
        <div><div style="font-size:10px;color:var(--muted)">투구</div><div style="font-size:24px;font-weight:900;font-family:var(--mono)">${pitcherDataAll.length}</div></div>
      </div>
    </div>
    <div class="card stat">
      <div style="font-size:12px;color:#ff6b8a;font-weight:600;margin-bottom:8px">🏏 타자 종합${lowBCount>0?` <span style="font-size:9px;color:#4a7aaa;font-weight:400">(평균은 충분한 ${bCards.length}/${allBCards.length}명)</span>`:''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div><div style="font-size:10px;color:var(--muted)">평균 OVR</div><div style="font-size:24px;font-weight:900;color:${wbdContext.cardOvrColor(avgBOvr)};font-family:var(--mono)">${bCards.length?avgBOvr.toFixed(0):'-'}</div></div>
        <div><div style="font-size:10px;color:var(--muted)">합산 WAR</div><div style="font-size:24px;font-weight:900;color:var(--amber);font-family:var(--mono)">${totalBWar.toFixed(2)}</div></div>
        <div><div style="font-size:10px;color:var(--muted)">타구</div><div style="font-size:24px;font-weight:900;font-family:var(--mono)">${batterDataAll.length}</div></div>
      </div>
    </div>
  </div>`;
  
  // 멤버 카드 그리드 (투수 / 타자 분리, 데이터 부족 분리)
  const renderMemCard=(name,type)=>{
    const c=type==='pitcher'?wbdContext.calcPitcherCard(name):wbdContext.calcBatterCard(name);
    if(!c)return '';
    const photoUrl=wbdContext.getPhotoUrl(name);
    const ovrCol=wbdContext.cardOvrColor(c.OVR);
    const typeCol=type==='pitcher'?'#ff8c44':'#39ff8a';
    const typeLabel=type==='pitcher'?'투수':'타자';
    const photoHTML=photoUrl
      ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;display:block">`
      : `<svg viewBox="0 0 100 100" style="width:100%;height:100%;display:block;background:linear-gradient(180deg,#1a2438,#0f1828)"><circle cx="50" cy="38" r="16" fill="#3a4560"/><path d="M 20,100 Q 20,65 50,62 Q 80,65 80,100 Z" fill="#3a4560"/></svg>`;
    const safeName=String(name).replace(/'/g,"\\'");
    const war=type==='pitcher'?wbdContext.calcPitcherWAR(name):wbdContext.calcBatterWAR(name);
    const lowBorder=c.lowData?'border:1px dashed #3a5a7a;opacity:0.7':`border:2px solid ${ovrCol};box-shadow:0 0 10px ${ovrCol}55`;
    const lowTag=c.lowData?'<span title="데이터 부족" style="background:#0a1828;border:1px solid #2a4060;color:#4a7aaa;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px">📊 부족</span>':'';
    return `<div style="background:var(--card);${lowBorder};border-radius:8px;padding:8px;position:relative;transition:transform .15s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
      ${window.cardEditMode?`<button onclick="event.stopPropagation();openQuickTeamGroupEdit('${safeName}','${type}')" title="팀/그룹 편집" style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);border:1px solid var(--amber);color:var(--amber);width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0;z-index:2">✏️</button>`:''}
      <div onclick="openCardDetail('${safeName}','${type}')" style="cursor:pointer">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px${window.cardEditMode?';padding-left:26px':''}">
          <span style="font-size:9px;font-weight:700;color:${typeCol};background:${typeCol}22;padding:1px 5px;border-radius:3px">${typeLabel}</span>
          ${lowTag}
          <span style="font-family:var(--mono);font-weight:900;color:${ovrCol};margin-left:auto">${c.OVR}</span>
        </div>
        <div style="position:relative;width:100%;aspect-ratio:1/1;border-radius:6px;overflow:hidden;${lowBorder};margin-bottom:6px;background:#0f1828">${photoHTML}</div>
        <div style="font-size:12px;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">${name}</div>
        <div style="font-size:10px;color:var(--muted);text-align:center;font-family:var(--mono)">WAR ${(war||0).toFixed(2)}</div>
      </div>
    </div>`;
  };
  
  // 정렬: 데이터 충분한 선수 OVR 순 → 데이터 부족 선수 OVR 순
  const sortMembers=(arr)=>arr.sort((a,b)=>{
    const la=a.c?.lowData?1:0, lb=b.c?.lowData?1:0;
    if(la!==lb)return la-lb;  // 데이터 부족은 뒤로
    return (b.c?.OVR||0)-(a.c?.OVR||0);
  });
  const sortedPitchers=sortMembers(groupPitchers.map(n=>({n,c:wbdContext.calcPitcherCard(n)})));
  const sortedBatters=sortMembers(groupBatters.map(n=>({n,c:wbdContext.calcBatterCard(n)})));
  
  // 데이터 부족 멤버 분리 카운트
  const lowPitchers=sortedPitchers.filter(m=>m.c?.lowData).length;
  const lowBatters=sortedBatters.filter(m=>m.c?.lowData).length;
  const totalLow=lowPitchers+lowBatters;
  
  html+=`<div class="card section">
    <div class="card-title">👥 그룹 멤버 (${validMembers.length}명) — 투수 ${sortedPitchers.length} · 타자 ${sortedBatters.length}${totalLow>0?` <span style="font-size:10px;color:#4a7aaa;font-weight:400;margin-left:6px">(📊 데이터 부족 ${totalLow}명 포함)</span>`:''}</div>
    <div class="grid2">
      <div>
        <div style="font-size:12px;color:#ff8c44;font-weight:700;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ff8c4444">⚾ 투수 ${sortedPitchers.length}명${lowPitchers>0?` <span style="font-size:10px;color:#4a7aaa;font-weight:400">(부족 ${lowPitchers})</span>`:''}</div>
        ${sortedPitchers.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
          ${sortedPitchers.map(m=>renderMemCard(m.n,'pitcher')).join('')}
        </div>`:'<div style="font-size:11px;color:var(--muted);text-align:center;padding:20px">투수 멤버 없음</div>'}
      </div>
      <div>
        <div style="font-size:12px;color:#39ff8a;font-weight:700;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #39ff8a44">🏏 타자 ${sortedBatters.length}명${lowBatters>0?` <span style="font-size:10px;color:#4a7aaa;font-weight:400">(부족 ${lowBatters})</span>`:''}</div>
        ${sortedBatters.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px">
          ${sortedBatters.map(m=>renderMemCard(m.n,'batter')).join('')}
        </div>`:'<div style="font-size:11px;color:var(--muted);text-align:center;padding:20px">타자 멤버 없음</div>'}
      </div>
    </div>
  </div>`;
  
  if(missingMembers.length){
    html+=`<div class="card section" style="opacity:0.7">
      <div class="card-title" style="color:var(--muted)">⚠ 데이터에 없는 멤버 (${missingMembers.length})</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">현재 활성 게임 데이터에 등장하지 않는 멤버들</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${missingMembers.map(n=>`<span style="font-size:11px;background:var(--card2);border:1px solid var(--border);padding:3px 8px;border-radius:4px;color:var(--muted)">${n}</span>`).join('')}</div>
    </div>`;
  }
  
  out.innerHTML=html;
};

// Original index.html:11983
wbdContext.switchTeamSubtab = function switchTeamSubtab(tab){
  const TABS={overview:'team-overview-content', report:'team-report-content', bat:'team-bat-content', pit:'team-pit-content',
              def:'team-def-content', trend:'team-trend-content', stats:'team-content', scout:'team-scout-content'};
  Object.entries(TABS).forEach(([k,id])=>{
    const el=document.getElementById(id);
    if(el) el.style.display = (k===tab)?'':'none';
    const btn=document.getElementById('team-subtab-'+k);
    if(btn){
      btn.style.borderBottomColor = (k===tab)?'var(--amber)':'transparent';
      btn.style.color = (k===tab)?'var(--amber)':'var(--muted)';
    }
  });
  window._teamSubtab=tab;
  if(tab==='overview') wbdContext.renderTeamOverview();
  else if(tab==='report') wbdContext.renderTeamReport();
  else if(tab==='bat') wbdContext.renderTeamBat();
  else if(tab==='pit') wbdContext.renderTeamPit();
  else if(tab==='def') wbdContext.renderTeamDef();
  else if(tab==='trend') wbdContext.renderTeamTrend();
  else if(tab==='scout') wbdContext.renderTeamScoutContent();
  else if(tab==='stats') wbdContext.renderTeamPage();
};

// Original index.html:12006
wbdContext._onTeamSelChange = function _onTeamSelChange(){
  const tab=window._teamSubtab||'overview';
  // 캐시된 내용 비우기 (팀이 바뀌었으므로)
  ['team-report-content','team-bat-content','team-pit-content','team-def-content','team-trend-content'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.innerHTML='';
  });
  wbdContext.renderTeamPage();
  wbdContext.switchTeamSubtab(tab);
};

// Original index.html:12016
wbdContext._curTeam = function _curTeam(){ const s=document.getElementById('team-sel'); return s?s.value:''; };

// Original index.html:12018
wbdContext._pctColor = function _pctColor(p){ return p>=0.85?'#ff4560':p>=0.70?'#ff8c44':p>=0.55?'#ffd700':p>=0.40?'#39ff8a':p>=0.25?'#88ccff':'#888'; };

// Original index.html:12019
wbdContext._pctTier = function _pctTier(p){ return p>=0.85?'S':p>=0.70?'A':p>=0.55?'B':p>=0.40?'C':p>=0.25?'D':'F'; };

// Original index.html:12020
wbdContext._pctLabel = function _pctLabel(p){ return `상위 ${Math.round((1-p)*100)}%`; };

// Original index.html:12023
wbdContext.renderTeamOverview = function renderTeamOverview(){
  const el=document.getElementById('team-overview-content');
  if(!el) return;
  const team=wbdContext._curTeam();
  if(!team){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>'; return; }
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ 분석 중...</div>';
  setTimeout(()=>{
    try{
      const prof=wbdContext._computeTeamProfiles();
      const t=prof.byName[team];
      if(!t){ el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">데이터 부족 (${team})</div>`; return; }
      const P=prof.pctOf;
      // V11.3: 상대 비교
      const cmpName=window._teamCompare;
      const ct=(cmpName&&prof.byName[cmpName])?prof.byName[cmpName]:null;
      const CA=ct?wbdContext._teamAreaScores(prof,ct):null;

      // ── 종합 등급 (개요·진단서 공통 기준: TEAM_W) ──
      const S=wbdContext._teamScores(prof,t);
      const A=S.A;
      const batScore=S.bat, pitScore=S.pit, defPct=S.def, teamScore=S.total;
      const defOAA=S.defInfo.oaa;
      const gradeOf=wbdContext._teamGrade, gradeCol=wbdContext._teamGradeColor;
      const gradeBox=(label,score,sub)=>{
        const g=gradeOf(score), c=gradeCol(g);
        return `<div style="flex:1;min-width:110px;background:linear-gradient(160deg,${c}22,var(--card2));border:1px solid ${c}66;border-radius:10px;padding:14px 10px;text-align:center">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${label}</div>
          <div style="font-family:var(--cond);font-size:38px;font-weight:900;line-height:1;color:${c};text-shadow:0 0 18px ${c}55">${g}</div>
          <div style="font-size:10px;color:${c};margin-top:5px">상위 ${Math.round((1-score)*100)}%</div>
          ${sub?`<div style="font-size:9px;color:var(--muted);margin-top:3px">${sub}</div>`:''}
        </div>`;
      };
      const gradeSection=`<div class="card section">
        <div class="card-title">종합 등급 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 백분위 기반)</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${gradeBox('🏏 타격 종합', batScore, '컨택35 · 파워40 · 선구25')}
          ${gradeBox('⚾ 투수 종합', pitScore, '구위35 · 제구25 · 결과40')}
          ${gradeBox('🛡️ 수비', defPct, defOAA!=null?`팀 OAA ${defOAA>0?'+':''}${defOAA.toFixed(1)}`:'데이터 부족')}
          ${gradeBox('🏆 팀 종합', teamScore, '타격45 · 투수45 · 수비10')}
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:8px">
          ※ 수비(OAA)는 신뢰도를 감안해 팀 종합에서 <b>10%만</b> 반영합니다.
        </div>
      </div>`;

      // ── 레이더 차트 (6영역) ──
      const areas=[
        {k:'contact', l:'컨택',   v:A.contact},
        {k:'power',   l:'파워',   v:A.power},
        {k:'eye',     l:'선구',   v:A.eye},
        {k:'pResult', l:'투수결과',v:A.pResult},
        {k:'pStuff',  l:'투수구위',v:A.pStuff},
        {k:'pCtrl',   l:'투수제구',v:A.pCtrl}
      ];
      const RW=300, RH=280, RCX=150, RCY=140, RR=95;
      let ritems='';
      // 격자
      [0.25,0.5,0.75,1].forEach(lv=>{
        const pts=areas.map((a,i)=>{
          const ang=(Math.PI*2/areas.length)*i - Math.PI/2;
          return `${(RCX+Math.cos(ang)*RR*lv).toFixed(1)},${(RCY+Math.sin(ang)*RR*lv).toFixed(1)}`;
        }).join(' ');
        ritems+=`<polygon points="${pts}" fill="none" stroke="#2a4060" stroke-width="${lv===1?1.2:0.6}" opacity="${lv===1?0.9:0.5}"/>`;
      });
      areas.forEach((a,i)=>{
        const ang=(Math.PI*2/areas.length)*i - Math.PI/2;
        const ex=RCX+Math.cos(ang)*RR, ey=RCY+Math.sin(ang)*RR;
        ritems+=`<line x1="${RCX}" y1="${RCY}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#2a4060" stroke-width="0.6"/>`;
        const lx=RCX+Math.cos(ang)*(RR+22), ly=RCY+Math.sin(ang)*(RR+22);
        ritems+=`<text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" fill="var(--muted)" font-size="11" text-anchor="middle">${a.l}</text>`;
        const vx=RCX+Math.cos(ang)*(RR+22), vy=RCY+Math.sin(ang)*(RR+22)+12;
        ritems+=`<text x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" fill="${wbdContext._pctColor(a.v)}" font-size="10" text-anchor="middle" font-weight="700">${wbdContext._pctTier(a.v)}</text>`;
      });
      const dataPts=areas.map((a,i)=>{
        const ang=(Math.PI*2/areas.length)*i - Math.PI/2;
        return `${(RCX+Math.cos(ang)*RR*a.v).toFixed(1)},${(RCY+Math.sin(ang)*RR*a.v).toFixed(1)}`;
      }).join(' ');
      if(CA){
        const cmpPts=areas.map((a,i)=>{
          const ang=(Math.PI*2/areas.length)*i - Math.PI/2;
          const cv=CA[a.k]!=null?CA[a.k]:0.5;
          return `${(RCX+Math.cos(ang)*RR*cv).toFixed(1)},${(RCY+Math.sin(ang)*RR*cv).toFixed(1)}`;
        }).join(' ');
        ritems+=`<polygon points="${cmpPts}" fill="rgba(136,204,255,0.14)" stroke="#88ccff" stroke-width="1.6" stroke-dasharray="4,3"/>`;
      }
      ritems+=`<polygon points="${dataPts}" fill="rgba(245,166,35,0.25)" stroke="#f5a623" stroke-width="2"/>`;
      areas.forEach((a,i)=>{
        const ang=(Math.PI*2/areas.length)*i - Math.PI/2;
        ritems+=`<circle cx="${(RCX+Math.cos(ang)*RR*a.v).toFixed(1)}" cy="${(RCY+Math.sin(ang)*RR*a.v).toFixed(1)}" r="3.5" fill="${wbdContext._pctColor(a.v)}" stroke="#000" stroke-width="0.5"/>`;
      });

      // ── 영역별 상세 (구성 지표 + 기여도) ──
      const BD=A.breakdown;
      const areaMeta=[
        {k:'contact', l:'컨택',      icon:'🎯', v:A.contact, side:'bat'},
        {k:'power',   l:'파워',      icon:'💥', v:A.power,   side:'bat'},
        {k:'eye',     l:'선구',      icon:'👁️', v:A.eye,     side:'bat'},
        {k:'pStuff',  l:'투수 구위', icon:'🔥', v:A.pStuff,  side:'pit'},
        {k:'pCtrl',   l:'투수 제구', icon:'🎯', v:A.pCtrl,   side:'pit'},
        {k:'pResult', l:'투수 결과', icon:'📋', v:A.pResult, side:'pit'}
      ];
      const areaBlock=(a)=>{
        const c=wbdContext._pctColor(a.v), tier=wbdContext._pctTier(a.v);
        const cmpList=(CA&&CA.breakdown)?CA.breakdown[a.k]:null;
        const rows=(BD[a.k]||[]).map((m,mi)=>{
          const mc=wbdContext._pctColor(m.pct);
          const om=cmpList?cmpList[mi]:null;
          const cmpHTML=om?(()=>{
            const better=m.pct>om.pct+0.02, worse=m.pct<om.pct-0.02;
            const cc=better?'#39ff8a':worse?'#ff4560':'var(--muted)';
            return `<span style="font-family:var(--mono);font-size:10px;color:${cc};width:60px;text-align:right;flex-shrink:0" title="${cmpName}">${better?'▲':worse?'▼':'='} ${om.disp}</span>`;
          })():'';
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
            <span style="font-size:11px;color:var(--muted);width:118px;flex-shrink:0">${m.label}</span>
            <span style="font-family:var(--mono);font-size:12px;font-weight:700;width:52px;text-align:right;flex-shrink:0">${m.disp}</span>
            ${cmpHTML}
            <div style="flex:1;height:8px;background:var(--card2);border-radius:4px;overflow:hidden;position:relative;min-width:36px">
              <div style="height:100%;width:${(m.pct*100).toFixed(0)}%;background:${mc};opacity:0.8"></div>
              ${om?`<div style="position:absolute;left:${(om.pct*100).toFixed(0)}%;top:0;width:2px;height:100%;background:#88ccff"></div>`:''}
              <div style="position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.3)"></div>
            </div>
            <span style="font-family:var(--mono);font-size:10px;color:${mc};width:52px;text-align:right;flex-shrink:0">${wbdContext._pctTier(m.pct)} ${wbdContext._pctLabel(m.pct)}</span>
            <span style="font-size:9px;color:var(--muted);width:26px;text-align:right;flex-shrink:0">×${m.w.toFixed(2)}</span>
          </div>`;
        }).join('');
        return `<div class="card" style="border-left:3px solid ${c}">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
            <span style="font-size:13px;font-weight:700">${a.icon} ${a.l}</span>
            <span><span style="font-family:var(--cond);font-size:22px;font-weight:900;color:${c}">${tier}</span>
              <span style="font-size:10px;color:${c};margin-left:4px">${wbdContext._pctLabel(a.v)}</span>
              ${CA?(()=>{const cv=CA[a.k]||0.5;const cc=wbdContext._pctColor(cv);
                return `<span style="font-size:10px;color:var(--muted);margin-left:6px">vs</span> <span style="font-size:13px;font-weight:700;color:${cc}" title="${cmpName}">${wbdContext._pctTier(cv)}</span>`;})():''}</span>
          </div>
          ${rows}
          <div style="margin-top:7px;padding-top:6px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;font-size:10px;color:var(--muted)">
            <span>가중 평균</span>
            <span style="font-family:var(--mono);color:${c};font-weight:700">${(a.v*100).toFixed(0)} / 100</span>
          </div>
        </div>`;
      };
      const batAreas=areaMeta.filter(a=>a.side==='bat').map(areaBlock).join('');
      const pitAreas=areaMeta.filter(a=>a.side==='pit').map(areaBlock).join('');
      // 참고용 요약 수치 (영역에 안 들어간 지표들)
      const f3=v=>v!=null?v.toFixed(3).replace(/^0/,''):'-';
      const extraBat=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px;margin-top:10px">
        ${[['OPS',f3(t.ops)],['출루',f3(t.obp)],['장타',f3(t.slg)],['wOBA',f3(t.woba)],['평균EV',t.avgEV.toFixed(1)],['평균LA',t.avgLA!=null?t.avgLA.toFixed(1)+'°':'-'],['HH%',t.hhPct.toFixed(1)+'%'],['배럴%',t.brlPct.toFixed(1)+'%']]
          .map(([l,v])=>`<div style="background:var(--card2);border-radius:4px;padding:5px 7px"><div style="font-size:9px;color:var(--muted)">${l}</div><div style="font-family:var(--mono);font-size:13px;font-weight:700">${v}</div></div>`).join('')}
      </div>`;
      const extraPit=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(88px,1fr));gap:6px;margin-top:10px">
        ${[['K/9',t.k9.toFixed(1)],['K%',t.pKPct.toFixed(1)+'%'],['K/BB',t.pKBB>=99?'∞':t.pKBB.toFixed(1)],['피EV',t.pAvgEV.toFixed(1)],['피LA',t.pAvgLA!=null?t.pAvgLA.toFixed(1)+'°':'-'],['피HH%',t.pHhPct.toFixed(1)+'%'],['피배럴%',t.pBrlPct.toFixed(1)+'%'],['병살유도',String(t.pGIDP||0)]]
          .map(([l,v])=>`<div style="background:var(--card2);border-radius:4px;padding:5px 7px"><div style="font-size:9px;color:var(--muted)">${l}</div><div style="font-family:var(--mono);font-size:13px;font-weight:700">${v}</div></div>`).join('')}
      </div>`;

      // ── 강점/약점 자동 추출 ──
      const areaList=[
        {l:'컨택',v:A.contact},{l:'파워',v:A.power},{l:'선구',v:A.eye},
        {l:'투수 구위',v:A.pStuff},{l:'투수 제구',v:A.pCtrl},{l:'투수 결과',v:A.pResult}
      ].sort((a,b)=>b.v-a.v);
      const strengths=areaList.filter(a=>a.v>=0.6).slice(0,3);
      const weaks=areaList.filter(a=>a.v<=0.4).slice(-3).reverse();

      el.innerHTML=wbdContext._teamCompareBar()+gradeSection+`
      <div class="grid2 section" style="gap:14px;grid-template-columns:340px 1fr">
        <div class="card">
          <div class="card-title">팀 프로파일 (리그 백분위)</div>
          ${wbdContext.makeSVG(RW,RH,ritems)}
          <div style="font-size:9px;color:var(--muted);text-align:center;margin-top:4px">
            바깥쪽일수록 리그 상위 · S~F 등급
            ${CA?`<br><span style="color:#f5a623">━ ${team}</span> &nbsp; <span style="color:#88ccff">┅ ${cmpName}</span>`:''}
          </div>
        </div>
        <div class="card">
          <div class="card-title">강점 · 약점</div>
          <div style="display:flex;gap:14px;flex-wrap:wrap">
            <div style="flex:1;min-width:150px">
              <div style="font-size:11px;color:#39ff8a;margin-bottom:6px">💪 강점</div>
              ${strengths.length?strengths.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 8px;background:rgba(57,255,138,0.08);border-radius:4px;margin-bottom:4px"><span style="font-size:12px">${s.l}</span><span style="font-family:var(--mono);color:${wbdContext._pctColor(s.v)};font-size:12px;font-weight:700">${wbdContext._pctTier(s.v)} · ${wbdContext._pctLabel(s.v)}</span></div>`).join(''):'<div style="font-size:11px;color:var(--muted)">뚜렷한 강점 없음 (모든 영역 평균권)</div>'}
            </div>
            <div style="flex:1;min-width:150px">
              <div style="font-size:11px;color:#ff4560;margin-bottom:6px">⚠️ 약점</div>
              ${weaks.length?weaks.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 8px;background:rgba(255,69,96,0.08);border-radius:4px;margin-bottom:4px"><span style="font-size:12px">${s.l}</span><span style="font-family:var(--mono);color:${wbdContext._pctColor(s.v)};font-size:12px;font-weight:700">${wbdContext._pctTier(s.v)} · ${wbdContext._pctLabel(s.v)}</span></div>`).join(''):'<div style="font-size:11px;color:var(--muted)">뚜렷한 약점 없음</div>'}
            </div>
          </div>
          <div style="margin-top:12px;padding:8px;background:var(--card2);border-radius:4px;font-size:11px;color:var(--muted);line-height:1.7">
            타자 ${t.batters.length}명 · 투수 ${t.pitchers.length}명 · ${t.PA}타석 / ${t.IP.toFixed(1)}이닝<br>
            총 WAR <b style="color:var(--amber)">${t.war.toFixed(2)}</b> (타자 ${t.owar.toFixed(2)} / 투수 ${t.pwar.toFixed(2)})
          </div>
        </div>
      </div>
      <div class="card section">
        <div class="card-title">🏏 타격 영역 상세 <span style="font-size:10px;color:var(--muted);font-weight:400">(각 지표의 리그 백분위와 가중치 → 영역 등급)</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px">${batAreas}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:10px">참고 지표</div>
        ${extraBat}
      </div>
      <div class="card section">
        <div class="card-title">⚾ 투수 영역 상세 <span style="font-size:10px;color:var(--muted);font-weight:400">(각 지표의 리그 백분위와 가중치 → 영역 등급)</span></div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px">${pitAreas}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:10px">참고 지표</div>
        ${extraPit}
      </div>
      <div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">
        ※ 모든 지표는 <b>활성 경기</b> 기준 · 백분위는 리그 내 팀 비교 (리그전 팀기록 탭과 범위가 다를 수 있음)
      </div>`;
    }catch(e){
      console.error('team overview error',e);
      el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">개요 생성 오류: ${e.message}</div>`;
    }
  },30);
};

// Original index.html:12236
wbdContext._setTeamCompare = function _setTeamCompare(v){
  window._teamCompare = (v && v!==wbdContext._curTeam()) ? v : null;
  const tab=window._teamSubtab||'overview';
  ['team-report-content','team-bat-content','team-pit-content','team-def-content','team-trend-content'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.innerHTML='';
  });
  wbdContext.switchTeamSubtab(tab);
};

// Original index.html:12245
wbdContext._teamCompareBar = function _teamCompareBar(){
  let teams=[];
  try{ teams=(wbdContext._computeTeamProfiles().teams||[]).map(t=>t.team).sort(); }catch(_){}
  const cur=wbdContext._curTeam(), cmp=window._teamCompare;
  const opts=['<option value="">— 비교 안 함 —</option>']
    .concat(teams.filter(t=>t!==cur).map(t=>`<option value="${t}" ${cmp===t?'selected':''}>${t}</option>`)).join('');
  return `<div class="card section" style="padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
    <span style="font-size:12px;color:var(--muted)">⚔️ 상대팀 비교</span>
    <select onchange="_setTeamCompare(this.value)" style="background:var(--card2);border:1px solid ${cmp?'var(--amber)':'var(--border)'};color:${cmp?'var(--amber)':'var(--text)'};padding:5px 10px;border-radius:4px;font-size:12px;min-width:150px">${opts}</select>
    ${cmp?`<span style="font-size:11px;color:var(--muted)">${cur} <b style="color:var(--amber)">vs</b> ${cmp}</span>
      <button onclick="_setTeamCompare('')" style="padding:3px 9px;font-size:10px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:4px;cursor:pointer">해제</button>`:''}
  </div>`;
};

// Original index.html:12259
wbdContext._teamCmpStatRow = function _teamCmpStatRow(team, side){
  const cmp=window._teamCompare;
  if(!cmp||cmp===team) return '';
  let prof;
  try{ prof=wbdContext._computeTeamProfiles(); }catch(_){ return ''; }
  const a=prof.byName[team], b=prof.byName[cmp];
  if(!a||!b) return '';
  const f3=v=>v!=null?v.toFixed(3).replace(/^0/,''):'-';
  const f1=v=>v!=null?v.toFixed(1):'-';
  const f2=v=>v!=null?v.toFixed(2):'-';
  const rows = side==='bat'
    ? [['타율',a.avg,b.avg,true,f3],['출루',a.obp,b.obp,true,f3],['장타',a.slg,b.slg,true,f3],
       ['OPS',a.ops,b.ops,true,f3],['HR%',a.hrPct,b.hrPct,true,v=>f1(v)+'%'],
       ['배럴+%',a.brlpPct,b.brlpPct,true,v=>f1(v)+'%'],['BB%',a.bbPct,b.bbPct,true,v=>f1(v)+'%'],
       ['K%',a.kPct,b.kPct,false,v=>f1(v)+'%'],['평균EV',a.avgEV,b.avgEV,true,f1]]
    : [['ERA',a.era,b.era,false,f2],['FIP',a.fip,b.fip,false,f2],['WHIP',a.whip,b.whip,false,f2],
       ['피안타율',a.oAvg,b.oAvg,false,f3],['헛스윙%',a.pWhiffPct,b.pWhiffPct,true,v=>f1(v)+'%'],
       ['피배럴+%',a.pBrlpPct,b.pBrlpPct,false,v=>f1(v)+'%'],['K/9',a.k9,b.k9,true,f1],
       ['BB%',a.pBBPct,b.pBBPct,false,v=>f1(v)+'%'],['피EV',a.pAvgEV,b.pAvgEV,false,f1]];
  let win=0,lose=0;
  const cells=rows.map(([l,mv,ov,hb,fmt])=>{
    const r=wbdContext._cmpCell(mv,ov,hb,fmt);
    if(r.win>0)win++; else if(r.win<0)lose++;
    return `<div style="background:var(--card2);border-radius:5px;padding:7px 9px;text-align:center">
      <div style="font-size:9px;color:var(--muted)">${l}</div>
      <div style="font-size:14px;margin-top:2px">${r.html}</div>
      <div style="font-size:9.5px;color:#88ccff;font-family:var(--mono);margin-top:1px">${fmt(ov)}</div>
    </div>`;
  }).join('');
  return `<div class="card section" style="border-left:4px solid #88ccff">
    <div class="card-title">⚔️ ${team} vs ${cmp} <span style="font-size:10px;color:var(--muted);font-weight:400">(위=${team}, 아래 파란색=${cmp})</span>
      <span style="float:right;font-size:11px;font-family:var(--mono)"><span style="color:#39ff8a">${win}승</span> <span style="color:#ff4560">${lose}패</span></span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:6px">${cells}</div>
  </div>`;
};

// Original index.html:12296
wbdContext._cmpCell = function _cmpCell(mine, theirs, higherBetter, fmt){
  const f=fmt||(v=>v!=null?String(v):'-');
  if(mine==null||theirs==null||isNaN(mine)||isNaN(theirs))
    return {win:0, html:`<span style="font-family:var(--mono)">${f(mine)}</span>`};
  const diff=mine-theirs;
  const eps=Math.abs(theirs)*0.005;
  let win=0;
  if(Math.abs(diff)>eps) win = ((diff>0)===higherBetter) ? 1 : -1;
  const col = win>0?'#39ff8a' : win<0?'#ff4560' : 'var(--muted)';
  const icon = win>0?'▲' : win<0?'▼' : '=';
  return {win, html:`<span style="font-family:var(--mono);color:${col};font-weight:${win?'700':'400'}">${f(mine)} <span style="font-size:9px">${icon}</span></span>`};
};
}

export function initialize(wbdContext) {
// Original index.html:11108
window.teamAliases=(()=>{
  try{
    const v=localStorage.getItem('wbd_team_aliases');
    return v?JSON.parse(v):{};
  }catch(e){return {};}
})();

// Original index.html:11120
wbdContext.SCRIM_TEAM_NAMES = new Set(['Team A','Team B','team a','team b','Team a','Team b']);

// Original index.html:12235
window._teamCompare = window._teamCompare || null;
}
