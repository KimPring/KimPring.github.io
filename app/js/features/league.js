/** league: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:28696
wbdContext._getTeamLogos = function _getTeamLogos(){  // 로컬 커스텀(보조)
  try { return JSON.parse(localStorage.getItem('wbd_team_logos')||'{}'); } catch(e){ return {}; }
};

// Original index.html:28699
wbdContext._setTeamLogo = function _setTeamLogo(team, dataUrl){
  const logos = wbdContext._getTeamLogos();
  if(dataUrl) logos[team] = dataUrl; else delete logos[team];
  try { localStorage.setItem('wbd_team_logos', JSON.stringify(logos)); } catch(e){ console.warn('로고 저장 실패', e); }
};

// Original index.html:28705
wbdContext._teamLogoUrl = function _teamLogoUrl(team){
  const safe = encodeURIComponent(String(team||'').trim());
  return wbdContext.TEAM_LOGO_BASE + safe + '.png';
};

// Original index.html:28711
wbdContext._teamLogoHTML = function _teamLogoHTML(team, size){
  size = size || 22;
  const ch = (team||'?').trim().charAt(0).toUpperCase();
  const hue = Math.abs([...(team||'')].reduce((a,c)=>a+c.charCodeAt(0),0)) % 360;
  const fallback = `<span style=\"display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:4px;background:hsl(${hue},45%,30%);color:#fff;font-size:${size*0.5}px;font-weight:700;vertical-align:middle;margin-right:6px\">${ch}</span>`;
  const local = wbdContext._getTeamLogos()[team];
  const url = local || wbdContext._teamLogoUrl(team);
  // onerror: 이미지 없으면 폴백 뱃지로 교체
  return `<img src="${url}" alt="${team}" loading="lazy" onerror="this.outerHTML=this.getAttribute('data-fb')" data-fb="${fallback.replace(/"/g,'&quot;')}" style="width:${size}px;height:${size}px;border-radius:4px;object-fit:cover;vertical-align:middle;margin-right:6px">`;
};

// Original index.html:28723
wbdContext.openLeagueLogoManager = function openLeagueLogoManager(){
  const teams=new Set();
  wbdContext.GAMES.filter(g=>(g.category||'')==='league').forEach(g=>{
    const i=wbdContext._parseGameName(g.name); [i.teamA,i.teamB].forEach(t=>{const n=wbdContext._normalizeTeam(t);if(n)teams.add(n);});
  });
  const teamList=[...teams].sort();
  let modal=document.getElementById('_logo_modal'); if(modal) modal.remove();
  modal=document.createElement('div'); modal.id='_logo_modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick=e=>{ if(e.target===modal) modal.remove(); };
  modal.innerHTML=`<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;max-width:520px;width:100%;max-height:85vh;overflow:auto;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <div style="font-size:16px;font-weight:700">🎨 팀 로고 관리</div>
      <button onclick="document.getElementById('_logo_modal').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>
    </div>
    <div style="font-size:10.5px;color:var(--muted);margin-bottom:14px">GitHub <code>${wbdContext.TEAM_LOGO_BASE}팀명.png</code>에 올리면 자동 로드됩니다. 또는 아래에서 직접 업로드(이 브라우저에만 저장).</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${teamList.map(t=>`<div style="display:flex;align-items:center;gap:10px;padding:6px;background:var(--bg2);border-radius:6px">
        <span>${wbdContext._teamLogoHTML(t,32)}</span>
        <span style="flex:1;font-size:12px;font-weight:600">${t}</span>
        <label style="font-size:10.5px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;cursor:pointer">업로드
          <input type="file" accept="image/*" style="display:none" onchange="_handleLogoUpload('${t.replace(/'/g,"\\'")}',this)">
        </label>
        <button onclick="_setTeamLogo('${t.replace(/'/g,"\\'")}',null);document.getElementById('_logo_modal').remove();openLeagueLogoManager();renderLeaguePage()" style="font-size:10.5px;padding:4px 8px;background:none;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer" title="직접 업로드한 로고 삭제">🗑</button>
      </div>`).join('')}
    </div>
  </div>`;
  document.body.appendChild(modal);
};

// Original index.html:28752
wbdContext._handleLogoUpload = function _handleLogoUpload(team, input){
  const file=input.files&&input.files[0]; if(!file) return;
  if(file.size>500000) wbdContext._toast('파일이 큼','500KB 이하 권장 (브라우저 저장 용량 제한)','#f87171');
  const reader=new FileReader();
  reader.onload=e=>{ wbdContext._setTeamLogo(team,e.target.result); wbdContext.renderLeaguePage();
    document.getElementById('_logo_modal').remove(); wbdContext.openLeagueLogoManager(); wbdContext._toast('로고 저장',team); };
  reader.readAsDataURL(file);
};

// Original index.html:28762
wbdContext._leagueSeasons = function _leagueSeasons(){
  // category='league' 게임들을 시즌(seasonName)별로 묶고, 각 시즌의 페이즈 목록도
  const seasons = {};
  wbdContext.GAMES.forEach(g => {
    if((g.category||'') !== 'league') return;
    const sn = g.seasonName || g.groupName || g.name || '?';
    if(!seasons[sn]) seasons[sn] = { name: sn, phases: {}, count: 0 };
    seasons[sn].count++;
    const ph = g.phaseName || '정규시즌';
    seasons[sn].phases[ph] = (seasons[sn].phases[ph]||0) + 1;
  });
  return seasons;
};

// Original index.html:28780
wbdContext._seasonDisplay = function _seasonDisplay(s){ return String(s||'').replace(/_/g,' '); };

// Original index.html:28781
wbdContext._leagueDefaultSeason = function _leagueDefaultSeason(seasons){
  if(seasons[wbdContext.WBD_CURRENT_SEASON]) return wbdContext.WBD_CURRENT_SEASON;
  const names = Object.keys(seasons);
  if(!names.length) return null;
  return names.sort((a,b)=>seasons[b].count-seasons[a].count)[0];  // 폴백: 최다 경기 시즌
};

// Original index.html:28788
wbdContext._renderLeaguePostseason = function _renderLeaguePostseason(season, phase, games){
  if(!games.length) return `<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">${season} ${phase} 경기 데이터가 없습니다.</div>`;
  // 경기별 결과 (날짜순)
  const results = games.map(g=>{
    const info=wbdContext._parseGameName(g.name);
    const {totalA,totalB}=wbdContext._computeInningScores(g.pitches);
    return {date:info.date||'', tA:wbdContext._normalizeTeam(info.teamA), tB:wbdContext._normalizeTeam(info.teamB), sA:totalA, sB:totalB};
  }).filter(r=>r.tA&&r.tB).sort((a,b)=>(a.date||'').localeCompare(b.date||''));

  // 팀별 시리즈 전적 (맞대결 승수 집계 → 시리즈 형태 파악)
  const matchups={};
  results.forEach(r=>{
    const key=[r.tA,r.tB].sort().join(' vs ');
    if(!matchups[key]) matchups[key]={teams:[r.tA,r.tB].sort(), w:{}};
    const winner = r.sA>r.sB ? r.tA : (r.sB>r.sA ? r.tB : null);
    if(winner) matchups[key].w[winner]=(matchups[key].w[winner]||0)+1;
  });

  let html = `<div class="card section" style="margin-bottom:16px">
    <div class="card-title">🏆 ${season} ${phase}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${games.length}경기 · 정규시즌과 분리된 포스트시즌 기록</div>`;

  // 시리즈별 카드
  const series=Object.values(matchups);
  if(series.length){
    html += `<div style="display:flex;flex-direction:column;gap:10px">`;
    series.forEach(m=>{
      const [t1,t2]=m.teams; const w1=m.w[t1]||0, w2=m.w[t2]||0;
      const lead1=w1>w2, lead2=w2>w1;
      html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border-radius:8px">
        <span style="flex:1;text-align:right;font-weight:${lead1?'700':'500'};color:${lead1?'var(--amber)':'var(--text)'}">${t1} ${wbdContext._teamLogoHTML(t1,22)}</span>
        <span style="font-family:var(--mono);font-weight:700;font-size:16px;min-width:60px;text-align:center">${w1} - ${w2}</span>
        <span style="flex:1;text-align:left;font-weight:${lead2?'700':'500'};color:${lead2?'var(--amber)':'var(--text)'}">${wbdContext._teamLogoHTML(t2,22)} ${t2}</span>
      </div>`;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // 경기별 상세 결과
  html += `<div class="card section"><div class="card-title">📅 경기 결과</div><div style="display:flex;flex-direction:column;gap:6px">`;
  results.forEach((r,i)=>{
    const aWin=r.sA>r.sB, bWin=r.sB>r.sA;
    html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg2);border-radius:7px;font-size:12px">
      <span style="color:var(--muted);font-size:10px;min-width:20px">${i+1}</span>
      <span style="color:var(--muted);font-size:10.5px;min-width:72px">${r.date||'-'}</span>
      <span style="flex:1;text-align:right;font-weight:${aWin?'700':'400'};color:${aWin?'var(--text)':'var(--muted)'}">${r.tA} ${wbdContext._teamLogoHTML(r.tA,18)}</span>
      <span style="font-family:var(--mono);font-weight:700;min-width:54px;text-align:center">${r.sA} : ${r.sB}</span>
      <span style="flex:1;text-align:left;font-weight:${bWin?'700':'400'};color:${bWin?'var(--text)':'var(--muted)'}">${wbdContext._teamLogoHTML(r.tB,18)} ${r.tB}</span>
    </div>`;
  });
  html += `</div></div>`;
  return html;
};

// Original index.html:28843
wbdContext._leagueSeasonStats = function _leagueSeasonStats(seasonName){
  const games = wbdContext.GAMES.filter(g=>(g.category||'')==='league'&&(g.seasonName||g.groupName||g.name)===seasonName&&(g.phaseName||'정규시즌')==='정규시즌');
  const gameIds=new Set(games.map(g=>g.id));
  const saved=new Set(wbdContext.activeGameIds);
  wbdContext.activeGameIds.clear(); gameIds.forEach(id=>wbdContext.activeGameIds.add(id)); wbdContext.rebuildG();
  const savedC=window._recordsCache; window._recordsCache={key:null,batters:null,pitchers:null};
  let rec; try{ rec=wbdContext._computeRecordsData(); }catch(e){ rec={batters:[],pitchers:[]}; }
  wbdContext.activeGameIds.clear(); saved.forEach(id=>wbdContext.activeGameIds.add(id)); wbdContext.rebuildG();
  window._recordsCache=savedC;
  // 동적 규정 기준 (팀당 경기수 기반) — 표본 작은 시즌도 최고선수가 뜨게
  const Q=wbdContext._leagueQualThresholds(games);
  const bQ=rec.batters.filter(b=>(b.PA||0)>=Q.qPA), pQ=rec.pitchers.filter(p=>(p.IP||0)>=Q.qIP);
  // 최고 선수: 규정충족자 우선, 없으면 전체에서 (표본 적어도 뭔가 표시)
  const bPool=bQ.length?bQ:rec.batters, pPool=pQ.length?pQ:rec.pitchers;
  const bestBat=bPool.slice().sort((a,b)=>(b.owar||0)-(a.owar||0))[0];
  const bestPit=pPool.slice().sort((a,b)=>(b.pwar||0)-(a.pwar||0))[0];
  // 리그 타율: 전체 안타/타수 (규정 무관, 리그 전체 환경)
  const lgAvg=rec.batters.length?(rec.batters.reduce((s,b)=>s+(b.H||0),0)/Math.max(1,rec.batters.reduce((s,b)=>s+(b.AB||0),0))):0;
  return {games:games.length, batters:rec.batters.length, pitchers:rec.pitchers.length,
    lgAvg, bestBat:bestBat?{n:bestBat.name,v:bestBat.owar}:null, bestPit:bestPit?{n:bestPit.name,v:bestPit.pwar}:null,
    topHR:rec.batters.slice().sort((a,b)=>(b.HR||0)-(a.HR||0))[0]};
};

// Original index.html:28865
wbdContext.openSeasonCompare = function openSeasonCompare(){
  const seasonsObj=wbdContext._leagueSeasons();
  const names=Object.keys(seasonsObj).sort();
  if(names.length<2){ wbdContext._toast('시즌 비교 불가','비교하려면 시즌이 2개 이상 필요합니다'); return; }
  const s1=names[names.length-1], s2=names[names.length-2];
  let modal=document.getElementById('_cmp_modal'); if(modal) modal.remove();
  modal=document.createElement('div'); modal.id='_cmp_modal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.onclick=e=>{ if(e.target===modal) modal.remove(); };
  const opts=names.map(n=>`<option value="${n}">${n}</option>`).join('');
  modal.innerHTML=`<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;max-width:600px;width:100%;max-height:85vh;overflow:auto;padding:20px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div style="font-size:16px;font-weight:700">📊 시즌 비교</div>
      <button onclick="document.getElementById('_cmp_modal').remove()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center">
      <select id="_cmp_s1" onchange="_renderSeasonCompare()" style="flex:1;font-size:12px;padding:6px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:6px">${opts}</select>
      <span style="color:var(--muted)">vs</span>
      <select id="_cmp_s2" onchange="_renderSeasonCompare()" style="flex:1;font-size:12px;padding:6px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:6px">${opts}</select>
    </div>
    <div id="_cmp_body"></div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('_cmp_s1').value=s1;
  document.getElementById('_cmp_s2').value=s2;
  wbdContext._renderSeasonCompare();
};

// Original index.html:28892
wbdContext._renderSeasonCompare = function _renderSeasonCompare(){
  const s1=document.getElementById('_cmp_s1').value, s2=document.getElementById('_cmp_s2').value;
  const a=wbdContext._leagueSeasonStats(s1), b=wbdContext._leagueSeasonStats(s2);
  const row=(label,va,vb,fmt)=>{ fmt=fmt||(x=>x);
    return `<tr><td style="color:var(--muted);font-size:11px">${label}</td><td style="font-family:var(--mono);text-align:center;font-weight:600">${fmt(va)}</td><td style="font-family:var(--mono);text-align:center;font-weight:600">${fmt(vb)}</td></tr>`; };
  let h2=`<table class="data-table" style="width:100%"><thead><tr><th></th><th style="text-align:center">${s1}</th><th style="text-align:center">${s2}</th></tr></thead><tbody>`;
  h2+=row('경기 수',a.games,b.games);
  h2+=row('타자 수',a.batters,b.batters);
  h2+=row('투수 수',a.pitchers,b.pitchers);
  h2+=row('리그 타율',a.lgAvg,b.lgAvg,x=>x.toFixed(3).replace(/^0/,''));
  h2+=row('최고 타자(oWAR)',a.bestBat,b.bestBat,x=>x?`${x.n} (${(x.v||0).toFixed(2)})`:'-');
  h2+=row('최고 투수(pWAR)',a.bestPit,b.bestPit,x=>x?`${x.n} (${(x.v||0).toFixed(2)})`:'-');
  h2+=row('최다 홈런',a.topHR,b.topHR,x=>x?`${x.name} (${x.HR})`:'-');
  h2+='</tbody></table>';
  document.getElementById('_cmp_body').innerHTML=h2;
};

// Original index.html:28911
wbdContext._withSeasonGames = function _withSeasonGames(games, fn){
  const ids=new Set(games.map(g=>g.id)); const saved=new Set(wbdContext.activeGameIds);
  wbdContext.activeGameIds.clear(); ids.forEach(id=>wbdContext.activeGameIds.add(id)); wbdContext.rebuildG();
  const sc=window._recordsCache; window._recordsCache={key:null,batters:null,pitchers:null};
  // V11.6: 수비 계열 캐시도 임시 격리 — 이 블록 안의 계산이 활성 경기 캐시를 오염시키지 않도록.
  //   (수비 지표를 시즌 전체 기준으로 뽑으려면 _computeDefenseData를 이 안에서 호출해야 함)
  const _sd=window._defenseDataCache, _sl=window._lgDefCache, _sm=window._lgDefStatsCacheMap,
        _sp=window._ifPassCache, _sc2=window._lgClutchCache;
  window._defenseDataCache=null; window._lgDefCache=null; window._lgDefStatsCacheMap=null;
  window._ifPassCache=null; window._lgClutchCache=null;
  let out; try{ out=fn(); }catch(e){ out=null; }
  wbdContext.activeGameIds.clear(); saved.forEach(id=>wbdContext.activeGameIds.add(id)); wbdContext.rebuildG();
  window._recordsCache=sc;
  window._defenseDataCache=_sd; window._lgDefCache=_sl; window._lgDefStatsCacheMap=_sm;
  window._ifPassCache=_sp; window._lgClutchCache=_sc2;
  return out;
};

// Original index.html:28929
wbdContext._leaguePitcherDecisions = function _leaguePitcherDecisions(games){
  const acc={};  // name → {W,L,S,H,QS,QSP}
  const ensure=n=>{ if(!acc[n])acc[n]={W:0,L:0,S:0,H:0,QS:0,QSP:0}; return acc[n]; };
  games.forEach(g=>{
    const info=wbdContext._parseGameName(g.name);
    let d; try{ d=wbdContext.calcGameDecisions(g.pitches, info); }catch(e){ return; }
    if(!d||!d.decisions) return;
    const dec=d.decisions;
    if(dec.W) ensure(dec.W).W++;
    if(dec.L) ensure(dec.L).L++;
    if(dec.S) ensure(dec.S).S++;
    (dec.H||[]).forEach(n=>ensure(n).H++);
    (dec.QS||[]).forEach(n=>ensure(n).QS++);
    (dec.QSP||[]).forEach(n=>ensure(n).QSP++);
  });
  return acc;
};

// Original index.html:28952
wbdContext._leaguePlayerPositions = function _leaguePlayerPositions(games){
  return wbdContext._withSeasonGames(games, ()=>{
    const map={};
    try{
      // 타자·투수 모든 선수에 대해 주 포지션 계산 (getPrimaryPosition은 DH·투수까지 처리)
      const names=new Set([...(window._cache.batterNames||[]),...(window._cache.pitcherNames||[])]);
      names.forEach(n=>{
        try{
          const pp=wbdContext.getPrimaryPosition(n);
          if(pp && pp.name) map[wbdContext._canonPlayer(n)]=pp.name;  // 'SS','DH','P' 등 약어
        }catch(e){}
      });
    }catch(e){}
    return map;
  });
};

// Original index.html:28969
wbdContext._posKor = function _posKor(p){ return wbdContext._POS_KOR[p]||p||'-'; };

// Original index.html:28971
wbdContext._leaguePlayerTeams = function _leaguePlayerTeams(games){
  const bat={}, pit={};  // name → {team: count}
  games.forEach(g=>{
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA), tB=wbdContext._normalizeTeam(info.teamB);
    if(!tA||!tB) return;
    (g.pitches||[]).forEach(d=>{
      const half=+d.half;
      const batTeam = half===1 ? tA : tB;   // 공격팀
      const pitTeam = half===1 ? tB : tA;   // 수비팀
      // V11.6: 별칭 정규화 — 닉변/계정변경 선수가 이름별로 갈려 팀 매칭이 실패하던 문제
      const bn=d.bName?wbdContext._canonPlayer(d.bName):null, pn=d.pName?wbdContext._canonPlayer(d.pName):null;
      if(bn){ bat[bn]=bat[bn]||{}; bat[bn][batTeam]=(bat[bn][batTeam]||0)+1; }
      if(pn){ pit[pn]=pit[pn]||{}; pit[pn][pitTeam]=(pit[pn][pitTeam]||0)+1; }
    });
  });
  // 최다 출전 팀으로 확정
  const pick=m=>{ let best=null,bc=-1; for(const t in m){ if(m[t]>bc){bc=m[t];best=t;} } return best; };
  const bMap={}, pMap={};
  for(const n in bat) bMap[n]=pick(bat[n]);
  for(const n in pit) pMap[n]=pick(pit[n]);
  return {batter:bMap, pitcher:pMap};
};

// Original index.html:28996
wbdContext._leagueQualThresholds = function _leagueQualThresholds(games){
  // 팀별 경기 수 집계 → 최다 경기 팀 기준 (규정은 보통 팀 경기수 기준)
  const teamG={};
  games.forEach(g=>{ const i=wbdContext._parseGameName(g.name);
    [i.teamA,i.teamB].forEach(t=>{const n=wbdContext._normalizeTeam(t); if(n) teamG[n]=(teamG[n]||0)+1;}); });
  const maxG = Math.max(1, ...Object.values(teamG));
  // 규정타석 = 경기수 × 2.8, 규정이닝 = 경기수 × 1.8 (사용자 지정). 표본 너무 적으면 최소 보장.
  return { games:maxG, qPA: Math.max(3, maxG*2.8), qIP: Math.max(1, maxG*1.8) };
};

// Original index.html:29006
wbdContext._renderLeagueLeaders = function _renderLeagueLeaders(season, games){
  const rec = wbdContext._withSeasonGames(games, ()=>wbdContext._computeRecordsData());
  if(!rec) return '<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">집계 실패</div>';
  const PT = wbdContext._leaguePlayerTeams(games);
  const POS = wbdContext._leaguePlayerPositions(games);
  const DEC = wbdContext._leaguePitcherDecisions(games);
  const Q = wbdContext._leagueQualThresholds(games);
  const bAll = rec.batters, pAll = rec.pitchers;
  // 결과기록 배열 (다승·세이브 등 리더용)
  const decArr = Object.entries(DEC).map(([n,d])=>({name:n,...d}));
  const bQ = bAll.filter(b=>(b.PA||0)>=Q.qPA);
  const pQ = pAll.filter(p=>(p.IP||0)>=Q.qIP);
  const N = 5;
  const top = (arr,key,n=N,desc=true) => arr.slice().filter(x=>x[key]!=null&&!isNaN(x[key])).sort((a,b)=>desc?(b[key]||0)-(a[key]||0):(a[key]||0)-(b[key]||0)).slice(0,n);

  // 투타 합산 WAR
  const warMap={};
  bAll.forEach(b=>{ warMap[b.name]=warMap[b.name]||{name:b.name,owar:0,pwar:0}; warMap[b.name].owar=b.owar||0; });
  pAll.forEach(p=>{ warMap[p.name]=warMap[p.name]||{name:p.name,owar:0,pwar:0}; warMap[p.name].pwar=p.pwar||0; });
  const warAll=Object.values(warMap).map(w=>({...w,total:(w.owar||0)+(w.pwar||0)}));

  const card=(title,badge,rows,cols)=>{
    let h2=`<div class="card section" style="flex:1;min-width:260px"><div class="card-title" style="font-size:13px;display:flex;align-items:center;gap:6px">${title} ${badge?`<span style="font-size:8.5px;padding:1px 5px;border-radius:4px;background:var(--bg2);color:var(--muted);font-weight:400">${badge}</span>`:''}</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>선수</th>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>`;
    if(!rows.length) h2+=`<tr><td colspan="${cols.length+2}" style="text-align:center;color:var(--muted);padding:12px">해당 없음</td></tr>`;
    rows.forEach((r,i)=>{ h2+=`<tr><td style="font-family:var(--mono);color:${i===0?'var(--amber)':'var(--muted)'}">${i+1}</td><td style="font-weight:600"><span style="display:inline-flex;align-items:center;gap:5px">${(()=>{const t=PT.batter[r.name]||PT.pitcher[r.name];return t?wbdContext._teamLogoHTML(t,16):'';})()}${(()=>{const _sn=String(r.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");const _ty=PT.batter[r.name]?'batter':(PT.pitcher[r.name]?'pitcher':'batter');return `<span style="cursor:pointer;color:var(--amber)" onclick="openCardDetail('${_sn}','${_ty}')" title="선수 카드 보기">${r.name}</span>`;})()}${(()=>{const pos=POS[r.name];return pos?`<span style="font-size:9px;color:var(--muted);margin-left:4px;padding:1px 4px;background:var(--card2);border-radius:3px">${wbdContext._posKor(pos)}</span>`:'';})()}</span></td>${cols.map(c=>`<td style="font-family:var(--mono)${c.hl?';color:var(--amber);font-weight:600':''}">${c.fmt(r)}</td>`).join('')}</tr>`; });
    return h2+'</tbody></table></div></div>';
  };
  const f3=v=>(v||0).toFixed(3).replace(/^0/,'');
  const sec=t=>`<div style="font-size:13px;font-weight:700;margin:8px 0 10px;color:var(--amber)">${t}</div>`;
  const grid=s=>`<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px">${s}</div>`;

  let html='';
  // 대표: 투타 합산 WAR
  html += grid(card('👑 WAR (투타 합산)','전체',top(warAll,'total'),[{label:'총WAR',fmt:r=>r.total.toFixed(2),hl:1},{label:'oWAR',fmt:r=>r.owar.toFixed(2)},{label:'pWAR',fmt:r=>r.pwar.toFixed(2)}]));

  // 타격 — 비율 (규정타석)
  html += sec(`🏏 타격 비율 (규정타석 ${Q.qPA.toFixed(0)}↑)`);
  html += grid(
    card('타율','규정',top(bQ,'avg'),[{label:'타율',fmt:r=>f3(r.avg),hl:1},{label:'안타',fmt:r=>r.H},{label:'타석',fmt:r=>r.PA}])+
    card('출루율','규정',top(bQ,'obp'),[{label:'출루',fmt:r=>f3(r.obp),hl:1},{label:'볼넷',fmt:r=>r.BB},{label:'타율',fmt:r=>f3(r.avg)}])+
    card('장타율','규정',top(bQ,'slg'),[{label:'장타',fmt:r=>f3(r.slg),hl:1},{label:'홈런',fmt:r=>r.HR},{label:'ISO',fmt:r=>f3(r.iso)}])
  );
  html += grid(
    card('OPS','규정',top(bQ,'ops'),[{label:'OPS',fmt:r=>f3(r.ops),hl:1},{label:'출루',fmt:r=>f3(r.obp)},{label:'장타',fmt:r=>f3(r.slg)}])+
    card('wOBA','규정',top(bQ,'woba'),[{label:'wOBA',fmt:r=>f3(r.woba),hl:1},{label:'OPS',fmt:r=>f3(r.ops)},{label:'wRC+',fmt:r=>(r.wrcPlus||0).toFixed(0)}])+
    card('wRC+','규정',top(bQ,'wrcPlus'),[{label:'wRC+',fmt:r=>(r.wrcPlus||0).toFixed(0),hl:1},{label:'wOBA',fmt:r=>f3(r.woba)},{label:'타석',fmt:r=>r.PA}])
  );
  html += grid(
    card('ISO (순장타)','규정',top(bQ,'iso'),[{label:'ISO',fmt:r=>f3(r.iso),hl:1},{label:'장타',fmt:r=>f3(r.slg)},{label:'홈런',fmt:r=>r.HR}])+
    card('BABIP','규정',top(bQ,'babip'),[{label:'BABIP',fmt:r=>f3(r.babip),hl:1},{label:'타율',fmt:r=>f3(r.avg)},{label:'안타',fmt:r=>r.H}])+
    card('oWAR','누적',top(bAll,'owar'),[{label:'oWAR',fmt:r=>(r.owar||0).toFixed(2),hl:1},{label:'wRC+',fmt:r=>(r.wrcPlus||0).toFixed(0)},{label:'타석',fmt:r=>r.PA}])
  );

  // 타격 — 누적 (전체)
  html += sec('🏏 타격 누적 (전체)');
  html += grid(
    card('홈런','전체',top(bAll,'HR'),[{label:'홈런',fmt:r=>r.HR,hl:1},{label:'타율',fmt:r=>f3(r.avg)},{label:'타석',fmt:r=>r.PA}])+
    card('안타','전체',top(bAll,'H'),[{label:'안타',fmt:r=>r.H,hl:1},{label:'2루타',fmt:r=>r.h2B||0},{label:'타율',fmt:r=>f3(r.avg)}])+
    card('총루타(TB)','전체',top(bAll,'TB'),[{label:'TB',fmt:r=>r.TB||0,hl:1},{label:'홈런',fmt:r=>r.HR},{label:'장타',fmt:r=>f3(r.slg)}])
  );
  html += grid(
    card('2루타','전체',top(bAll,'h2B'),[{label:'2루타',fmt:r=>r.h2B||0,hl:1},{label:'안타',fmt:r=>r.H},{label:'장타',fmt:r=>f3(r.slg)}])+
    card('볼넷','전체',top(bAll,'BB'),[{label:'볼넷',fmt:r=>r.BB,hl:1},{label:'출루',fmt:r=>f3(r.obp)},{label:'타석',fmt:r=>r.PA}])
  );

  // 투수 — 비율 (규정이닝)
  html += sec(`⚾ 투수 비율 (규정이닝 ${wbdContext._fmtIP(Q.qIP)}↑)`);
  html += grid(
    card('ERA+','규정',top(pQ.filter(p=>p.eraPlus!=null),'eraPlus'),[{label:'ERA+',fmt:r=>r.eraPlus!=null?r.eraPlus.toFixed(0):'-',hl:1},{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-'},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)}])+
    card('ERA','규정',top(pQ,'era',N,false),[{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-',hl:1},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)},{label:'WHIP',fmt:r=>(r.whip!=null?r.whip.toFixed(2):'-')}])+
    card('FIP','규정',top(pQ,'fip',N,false),[{label:'FIP',fmt:r=>r.fip!=null?r.fip.toFixed(2):'-',hl:1},{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-'},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)}])
  );
  html += grid(
    card('K/9','규정',top(pQ,'k9'),[{label:'K/9',fmt:r=>(r.k9||0).toFixed(1),hl:1},{label:'탈삼진',fmt:r=>r.K},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)}])+
    card('K%','규정',top(pQ,'kPct'),[{label:'K%',fmt:r=>(r.kPct||0).toFixed(1),hl:1},{label:'탈삼진',fmt:r=>r.K},{label:'BF',fmt:r=>r.BF||0}])+
    card('K/BB','규정',top(pQ,'kbb'),[{label:'K/BB',fmt:r=>(r.kbb||0).toFixed(2),hl:1},{label:'탈삼진',fmt:r=>r.K},{label:'볼넷',fmt:r=>r.BB}])
  );
  html += grid(
    card('WHIP','규정',top(pQ,'whip',N,false),[{label:'WHIP',fmt:r=>r.whip!=null?r.whip.toFixed(2):'-',hl:1},{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-'},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)}])+
    card('pWAR','누적',top(pAll,'pwar'),[{label:'pWAR',fmt:r=>r.pwar!=null?r.pwar.toFixed(2):'-',hl:1},{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-'},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)}])
  );

  // 투수 — 누적 (전체)
  html += sec('⚾ 투수 누적 (전체)');
  html += grid(
    card('탈삼진','전체',top(pAll,'K'),[{label:'탈삼진',fmt:r=>r.K,hl:1},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)},{label:'K/9',fmt:r=>(r.k9||0).toFixed(1)}])+
    card('이닝','전체',top(pAll,'IP'),[{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP),hl:1},{label:'탈삼진',fmt:r=>r.K},{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-'}])+
    card('볼넷 적은순','전체',top(pAll.filter(p=>p.IP>=Q.qIP*0.5),'BB',N,false),[{label:'볼넷',fmt:r=>r.BB,hl:1},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)},{label:'K/BB',fmt:r=>(r.kbb||0).toFixed(2)}])
  );
  html += grid(
    card('실점 적은순','규정이닝',top(pQ.filter(p=>p.runs!=null),'runs',N,false),[{label:'실점',fmt:r=>r.runs!=null?r.runs:'-',hl:1},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)},{label:'ERA',fmt:r=>r.era!=null?r.era.toFixed(2):'-'}])+
    card('9이닝당 실점 (RA9)','규정이닝',top(pQ.filter(p=>p.runs!=null&&p.IP>0).map(p=>({...p,ra9:p.runs/p.IP*9})),'ra9',N,false),[{label:'RA9',fmt:r=>r.ra9!=null?r.ra9.toFixed(2):'-',hl:1},{label:'실점',fmt:r=>r.runs},{label:'이닝',fmt:r=>wbdContext._fmtIP(r.IP)}])
  );

  // ── 투수 결과기록 (승/세이브/홀드/QS) ──
  html += sec('⚾ 투수 결과기록 (전체)');
  html += grid(
    card('🏆 다승','전체',top(decArr,'W'),[{label:'승',fmt:r=>r.W,hl:1},{label:'패',fmt:r=>r.L},{label:'QS',fmt:r=>r.QS}])+
    card('🔒 세이브','전체',top(decArr,'S'),[{label:'세이브',fmt:r=>r.S,hl:1},{label:'홀드',fmt:r=>r.H},{label:'승',fmt:r=>r.W}])+
    card('🤝 홀드','전체',top(decArr,'H'),[{label:'홀드',fmt:r=>r.H,hl:1},{label:'세이브',fmt:r=>r.S},{label:'승',fmt:r=>r.W}])
  );
  html += grid(
    card('💎 QS','전체',top(decArr,'QS'),[{label:'QS',fmt:r=>r.QS,hl:1},{label:'QS+',fmt:r=>r.QSP},{label:'승',fmt:r=>r.W}])+
    card('💠 QS+','전체',top(decArr,'QSP'),[{label:'QS+',fmt:r=>r.QSP,hl:1},{label:'QS',fmt:r=>r.QS},{label:'승',fmt:r=>r.W}])
  );
  return html;
};

// Original index.html:29115
wbdContext._renderLeagueRecords = function _renderLeagueRecords(season, games){
  const rec = wbdContext._withSeasonGames(games, ()=>wbdContext._computeRecordsData());
  if(!rec) return '<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">기록 집계 실패</div>';
  const PT = wbdContext._leaguePlayerTeams(games);  // 시즌 기준 선수→팀
  const POS = wbdContext._leaguePlayerPositions(games);  // 시즌 기준 주 포지션
  const DEC = wbdContext._leaguePitcherDecisions(games);  // 승/패/세이브/홀드/QS
  const _d = (n,k)=>(DEC[n]&&DEC[n][k])||0;
  const isB = window._leagueRecTab==='batter';
  const Q = wbdContext._leagueQualThresholds(games);
  if(window._leagueHideUnqual===undefined) window._leagueHideUnqual=false;
  const hideUnq = window._leagueHideUnqual;
  if(window._leagueRecPosFilter===undefined) window._leagueRecPosFilter='all';
  if(window._leagueRecTeamFilter===undefined) window._leagueRecTeamFilter='all';
  const posFilter = window._leagueRecPosFilter, teamFilter = window._leagueRecTeamFilter;
  // 필터 옵션 만들기
  const _posOrder=['P','C','1B','2B','3B','SS','LF','CF','RF','DH'];
  const _leagueTeamsList=(()=>{const s=new Set();games.forEach(g=>{const i=wbdContext._parseGameName(g.name);[i.teamA,i.teamB].forEach(t=>{const n=wbdContext._normalizeTeam(t);if(n)s.add(n);});});return[...s].sort();})();
  const posBtn=(val,label)=>`<button onclick="window._leagueRecPosFilter='${val}';renderLeaguePage()" style="font-size:10.5px;padding:4px 9px;border-radius:5px;border:1px solid var(--border);background:${posFilter===val?'#39ff8a':'var(--bg2)'};color:${posFilter===val?'#000':'var(--muted)'};cursor:pointer;font-weight:${posFilter===val?'700':'500'}">${label}</button>`;
  const teamOpts=`<option value="all">전체 팀</option>`+_leagueTeamsList.map(t=>`<option value="${t.replace(/"/g,'&quot;')}" ${teamFilter===t?'selected':''}>${t}</option>`).join('');
  let html = `<div class="card section">
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
      <button onclick="window._leagueRecTab='batter';renderLeaguePage()" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:${isB?'var(--amber)':'var(--bg2)'};color:${isB?'#000':'var(--muted)'};font-weight:600;cursor:pointer">🏏 타자</button>
      <button onclick="window._leagueRecTab='pitcher';renderLeaguePage()" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:${!isB?'var(--amber)':'var(--bg2)'};color:${!isB?'#000':'var(--muted)'};font-weight:600;cursor:pointer">⚾ 투수</button>
      <button onclick="window._leagueHideUnqual=!window._leagueHideUnqual;renderLeaguePage()" style="font-size:11px;padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:${hideUnq?'var(--amber)':'var(--bg2)'};color:${hideUnq?'#000':'var(--muted)'};cursor:pointer" title="규정 미달 선수 숨기기">${hideUnq?'☑':'☐'} 규정미달 제외</button>
      <select onchange="window._leagueRecTeamFilter=this.value;renderLeaguePage()" style="font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--text);cursor:pointer">${teamOpts}</select>
      <span style="margin-left:auto;font-size:10.5px;color:var(--muted);align-self:center">${season} 정규시즌 · ${isB?`규정타석 ${Q.qPA.toFixed(0)}`:`규정이닝 ${wbdContext._fmtIP(Q.qIP)}`} (${Q.games}경기 기준) · <span style="color:var(--muted);opacity:.6">흐린 행=규정미달</span></span>
    </div>
    ${isB?`<div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap;align-items:center"><span style="font-size:10.5px;color:var(--muted);margin-right:3px">포지션:</span>${posBtn('all','전체')}${_posOrder.map(pk=>posBtn(pk,wbdContext._posKor(pk))).join('')}</div>`:''}
    <!--COLGROUP_BTNS-->`;
  // 컬럼 정의 (key=정렬키, f=포맷, num=숫자여부)
  const f3 = v=>(v||0).toFixed(3).replace(/^0/,'');
  const batCols = [
    {k:'name',l:'선수',f:b=>{const _sn=String(b.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");return `<span style="cursor:pointer;color:var(--amber);font-weight:600" onclick="openCardDetail('${_sn}','batter')" title="선수 카드 보기">${b.name}</span>`;},txt:1},{k:'team',l:'팀',f:b=>{const t=PT.batter[b.name];return t?`<span style="display:inline-flex;align-items:center;gap:5px">${wbdContext._teamLogoHTML(t,18)}${t}</span>`:'-';},txt:1},
    {k:'pos',l:'POS',f:b=>wbdContext._posKor(POS[b.name]),txt:1},
    {k:'PA',l:'타석',f:b=>b.PA||0,cum:1},{k:'AB',l:'타수',f:b=>b.AB||0,cum:1},{k:'H',l:'안타',f:b=>b.H||0,cum:1},
    {k:'h2B',l:'2B',f:b=>b.h2B||0,cum:1},{k:'h3B',l:'3B',f:b=>b.h3B||0,cum:1},{k:'HR',l:'홈런',f:b=>b.HR||0,cum:1},{k:'hrPct',l:'HR%',f:b=>(b.hrPct||0).toFixed(1),hl:1},
    {k:'TB',l:'총루타',f:b=>b.TB||0,cum:1},{k:'BB',l:'볼넷',f:b=>b.BB||0,cum:1},{k:'K',l:'삼진',f:b=>b.K||0,cum:1},{k:'GIDP',l:'병살타',f:b=>b.GIDP||0,cum:1,asc:1,t:'땅볼 병살타 (포스아웃 포함 병살만 집계 · 신규 데이터 한정)'},
    {k:'avg',l:'타율',f:b=>f3(b.avg),hl:1},{k:'obp',l:'출루',f:b=>f3(b.obp)},{k:'slg',l:'장타',f:b=>f3(b.slg)},
    {k:'ops',l:'OPS',f:b=>f3(b.ops),hl:1},{k:'iso',l:'ISO',f:b=>f3(b.iso)},{k:'babip',l:'BABIP',f:b=>f3(b.babip)},
    {k:'avgEV',l:'평균EV',f:b=>b.avgEV>0?b.avgEV.toFixed(1):'-'},{k:'hhPct',l:'HH%',f:b=>b.evN>0?(b.hhPct||0).toFixed(1):'-'},{k:'brlPct',l:'배럴%',f:b=>b.evN>0?(b.brlPct||0).toFixed(1):'-'},{k:'hhpPct',l:'HH+%',f:b=>b.evN>0?(b.hhpPct||0).toFixed(1):'-'},{k:'brlpPct',l:'배럴+%',f:b=>b.evN>0?(b.brlpPct||0).toFixed(1):'-'},{k:'avgLA',l:'평균LA',f:b=>b.avgLA!=null?b.avgLA.toFixed(1)+'°':'-'},
    {k:'woba',l:'wOBA',f:b=>f3(b.woba)},{k:'wrcPlus',l:'wRC+',f:b=>(b.wrcPlus||0).toFixed(0)},{k:'owar',l:'oWAR',f:b=>(b.owar||0).toFixed(2),amber:1,cum:1}
  ];
  // ─────────────────────────────────────────────────────────
  // V11.4: 컬럼 그룹 탭 — 고정 컬럼 + 그룹별 컬럼으로 가로 스크롤 완화
  //   고정: 선수·팀·POS·타석·타율·OPS (누군지 + 표본 + 대표지표)
  //   기본: 카운팅 스탯 / 세부: 비율·세이버 / 타구질: EV·LA 계열
  const BAT_FIXED = ['name','team','pos','PA','AB','H','HR','K','avg','obp','slg','ops','wrcPlus','owar'];
  const BAT_GROUPS = {
    basic:  {label:'📋 기본',   cols:['h2B','h3B','TB','BB','GIDP','iso','babip','hrPct','woba']},
    batted: {label:'💥 타구질', cols:['BB','GIDP','hrPct','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct']},
    all:    {label:'📚 전체',   cols:['h2B','h3B','TB','BB','GIDP','iso','babip','hrPct','woba','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct']}
  };
  if(!window._leagueBatColGroup) window._leagueBatColGroup='basic';
  // V11.4 fix: 그룹 선택은 사용자 의도가 최우선 — 자동 전환하지 않음.
  //   (이전엔 정렬 컬럼이 있는 그룹으로 되돌려서 탭이 안 바뀌는 문제가 있었음)
  //   정렬 컬럼이 현재 그룹에 없으면 아래에서 정렬만 기본값으로 안전 복귀.
  const _bcg = window._leagueBatColGroup;
  function _filterCols(all, fixed, groupCols){
    const want = new Set([...fixed, ...groupCols]);
    const picked = all.filter(c=>want.has(c.k));
    // 고정 컬럼이 앞, 그룹 컬럼이 뒤로 오도록 정렬
    const order = [...fixed, ...groupCols];
    picked.sort((a,b)=>order.indexOf(a.k)-order.indexOf(b.k));
    return picked;
  }
  const batColsAll = batCols;
  const batColsView = _filterCols(batColsAll, BAT_FIXED, (BAT_GROUPS[_bcg]||BAT_GROUPS.basic).cols);
  const batGroupBtns = Object.entries(BAT_GROUPS).map(([k,v])=>
    `<button onclick="window._leagueBatColGroup='${k}';renderLeaguePage()" style="font-size:11px;padding:5px 12px;border-radius:5px;border:1px solid var(--border);background:${_bcg===k?'#39ff8a':'var(--bg2)'};color:${_bcg===k?'#000':'var(--muted)'};cursor:pointer;font-weight:${_bcg===k?'700':'500'}">${v.label}</button>`
  ).join('');
  const pitCols = [
    {k:'name',l:'선수',f:p=>{const _sn=String(p.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");return `<span style="cursor:pointer;color:var(--amber);font-weight:600" onclick="openCardDetail('${_sn}','pitcher')" title="선수 카드 보기">${p.name}</span>`;},txt:1},{k:'team',l:'팀',f:p=>{const t=PT.pitcher[p.name];return t?`<span style="display:inline-flex;align-items:center;gap:5px">${wbdContext._teamLogoHTML(t,18)}${t}</span>`:'-';},txt:1},
    {k:'G',l:'경기',f:p=>p.G||0,cum:1},
    {k:'_W',l:'승',f:p=>_d(p.name,'W'),get:p=>_d(p.name,'W'),cum:1},{k:'_L',l:'패',f:p=>_d(p.name,'L'),get:p=>_d(p.name,'L'),cum:1},
    {k:'_S',l:'세이브',f:p=>_d(p.name,'S'),get:p=>_d(p.name,'S'),cum:1},{k:'_H',l:'홀드',f:p=>_d(p.name,'H'),get:p=>_d(p.name,'H'),cum:1},
    {k:'_QS',l:'QS',f:p=>_d(p.name,'QS'),get:p=>_d(p.name,'QS'),cum:1},{k:'_QSP',l:'QS+',f:p=>_d(p.name,'QSP'),get:p=>_d(p.name,'QSP'),cum:1},
    {k:'IP',l:'이닝',f:p=>wbdContext._fmtIP(p.IP),cum:1},{k:'n',l:'투구',f:p=>p.n||0,cum:1},
    {k:'K',l:'탈삼진',f:p=>p.K||0,cum:1},{k:'BB',l:'볼넷',f:p=>p.BB||0,cum:1},{k:'H',l:'피안타',f:p=>p.H||0,cum:1},{k:'HR',l:'피홈런',f:p=>p.HR||0,cum:1},{k:'runs',l:'실점',f:p=>p.runs!=null?p.runs:'-',cum:1,asc:1,t:'총 실점 (ERA 산출 기준)'},
    {k:'ra9',l:'RA9',f:p=>p.ra9!=null?p.ra9.toFixed(2):'-',asc:1,t:'9이닝당 실점 — pWAR 산출 기반. 낮을수록 좋음'},
    {k:'era',l:'ERA',f:p=>p.era!=null?p.era.toFixed(2):'-',hl:1,asc:1},
    {k:'eraPlus',l:'ERA+',f:p=>p.eraPlus!=null?p.eraPlus.toFixed(0):'-',t:'리그 평균 대비 ERA — 100=평균, 높을수록 좋음'},{k:'fip',l:'FIP',f:p=>p.fip!=null?p.fip.toFixed(2):'-',asc:1},
    {k:'whip',l:'WHIP',f:p=>p.IP>0?((p.H+p.BB)/p.IP).toFixed(2):'-',asc:1},
    {k:'oAvg',l:'피안타율',f:p=>p.oAvg!=null?(p.oAvg).toFixed(3).replace(/^0/,''):'-',asc:1},{k:'oObp',l:'피출루',f:p=>p.oObp!=null?(p.oObp).toFixed(3).replace(/^0/,''):'-',asc:1},{k:'oSlg',l:'피장타',f:p=>p.oSlg!=null?(p.oSlg).toFixed(3).replace(/^0/,''):'-',asc:1},{k:'oOps',l:'피OPS',f:p=>p.oOps!=null?(p.oOps).toFixed(3).replace(/^0/,''):'-',asc:1,hl:1},
    {k:'hrPct',l:'피HR%',f:p=>(p.hrPct||0).toFixed(1),asc:1,t:'피홈런/상대타자'},{k:'GIDP',l:'병살',f:p=>p.GIDP||0,cum:1,t:'유도한 땅볼 병살 수'},
    {k:'k9',l:'K/9',f:p=>(p.k9||0).toFixed(1)},{k:'kPct',l:'K%',f:p=>(p.kPct||0).toFixed(1)},{k:'bbPct',l:'BB%',f:p=>(p.bbPct||0).toFixed(1),asc:1},
    {k:'kbb',l:'K/BB',f:p=>(p.kbb||0).toFixed(2)},
    {k:'avgEV',l:'피EV',f:p=>p.avgEV>0?p.avgEV.toFixed(1):'-',asc:1},{k:'hhPct',l:'피HH%',f:p=>p.evN>0?(p.hhPct||0).toFixed(1):'-',asc:1},{k:'brlPct',l:'피배럴%',f:p=>p.evN>0?(p.brlPct||0).toFixed(1):'-',asc:1},{k:'hhpPct',l:'피HH+%',f:p=>p.evN>0?(p.hhpPct||0).toFixed(1):'-',asc:1},{k:'brlpPct',l:'피배럴+%',f:p=>p.evN>0?(p.brlpPct||0).toFixed(1):'-',asc:1},{k:'avgLA',l:'피LA',f:p=>p.avgLA!=null?p.avgLA.toFixed(1)+'°':'-',asc:1},{k:'pwar',l:'pWAR',f:p=>p.pwar!=null?p.pwar.toFixed(2):'-',amber:1,cum:1}
  ];
  // V11.4: 투수 컬럼 그룹 (타자와 동일 구조)
  const PIT_FIXED = ['name','team','G','IP','_W','_L','K','BB','H','runs','ra9','era','eraPlus','fip','whip','k9','pwar'];
  const PIT_GROUPS = {
    basic:  {label:'📋 기본',     cols:['_S','_H','_QS','_QSP','n','HR','kPct','bbPct','kbb','GIDP']},
    against:{label:'🎯 피안타',   cols:['HR','hrPct','oAvg','oObp','oSlg','oOps','GIDP']},
    batted: {label:'💥 피타구질', cols:['HR','GIDP','hrPct','oOps','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct']},
    all:    {label:'📚 전체',     cols:['_S','_H','_QS','_QSP','n','HR','kPct','bbPct','kbb','hrPct','GIDP','oAvg','oObp','oSlg','oOps','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct']}
  };
  if(!window._leaguePitColGroup) window._leaguePitColGroup='basic';

  const _pcg = window._leaguePitColGroup;
  const pitColsView = _filterCols(pitCols, PIT_FIXED, (PIT_GROUPS[_pcg]||PIT_GROUPS.basic).cols);
  const pitGroupBtns = Object.entries(PIT_GROUPS).map(([k,v])=>
    `<button onclick="window._leaguePitColGroup='${k}';renderLeaguePage()" style="font-size:11px;padding:5px 12px;border-radius:5px;border:1px solid var(--border);background:${_pcg===k?'#39ff8a':'var(--bg2)'};color:${_pcg===k?'#000':'var(--muted)'};cursor:pointer;font-weight:${_pcg===k?'700':'500'}">${v.label}</button>`
  ).join('');
  const cols = isB ? batColsView : pitColsView;   // V11.4: 컬럼 그룹 적용
  // V11.4: 그룹 버튼은 변수 정의 이후에 삽입 (템플릿 실행 시점 TDZ 회피)
  html = html.replace('<!--COLGROUP_BTNS-->',
    `<div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;align-items:center">`+
    `<span style="font-size:10.5px;color:var(--muted);margin-right:3px">지표:</span>`+
    (isB?batGroupBtns:pitGroupBtns)+
    `<span style="font-size:10px;color:var(--muted);opacity:.7;margin-left:4px">`+
    (isB?'선수·팀·POS·타석·타수·안타·홈런·삼진·슬래시라인·wRC+·oWAR 고정':'선수·팀·경기·이닝·승패·탈삼진·볼넷·피안타·ERA·FIP·WHIP·K/9·pWAR 고정')+
    `</span><!--SORTHINT--></div>`);
  const sampleKey = isB?'PA':'IP', qVal = isB?Q.qPA:Q.qIP;
  // 정렬 상태
  if(!window._leagueRecSort) window._leagueRecSort={};
  const sortState = window._leagueRecSort[isB?'b':'p'] || {key:(isB?'ops':'pwar'), dir:'desc'};
  window._leagueRecSort[isB?'b':'p'] = sortState;

  let rows = (isB?rec.batters:rec.pitchers).slice();
  if(hideUnq) rows = rows.filter(r=>(r[sampleKey]||0)>=qVal);
  // V11.3: 포지션 필터 (타자만) + 팀 필터
  if(isB && posFilter!=='all') rows = rows.filter(r=>POS[r.name]===posFilter);
  if(teamFilter!=='all'){ const tmap=isB?PT.batter:PT.pitcher; rows = rows.filter(r=>tmap[r.name]===teamFilter); }
  // 정렬: 규정충족 우선 후 선택 정렬키
  // V11.4: 숨은 컬럼으로 정렬 중이면 안내 (sortState 확정 후 삽입 — TDZ 회피)
  html = html.replace('<!--SORTHINT-->', (()=>{
    const sk = sortState.key;
    if(!sk || cols.some(c=>c.k===sk)) return '';
    const all = isB?batColsAll:pitCols;
    const sn = (all.find(c=>c.k===sk)||{}).l || sk;
    return `<span style="font-size:10px;color:var(--amber);opacity:.85;margin-left:6px">↕ ${sn} 기준 정렬 중 (현재 그룹에 없는 컬럼)</span>`;
  })());
  const sc = cols.find(c=>c.k===sortState.key) || cols[0];
  const getVal = (r,c)=> c.get ? c.get(r) : r[c.k];  // 계산 컬럼(_W 등)은 get 사용
  // V11.1: 누적 스탯(cum)으로 정렬 시 규정 구분 없이 순수 값순. 비율 스탯은 규정충족 우선.
  const cumSort = !!sc.cum;
  rows.sort((a,b)=>{
    if(!cumSort){ // 비율 정렬: 규정충족 우선
      const qa=(a[sampleKey]||0)>=qVal, qb=(b[sampleKey]||0)>=qVal;
      if(qa!==qb) return qa?-1:1;
    }
    let av=getVal(a,sc), bv=getVal(b,sc);
    if(sc.txt){ av=String(av||''); bv=String(bv||''); return sortState.dir==='desc'?bv.localeCompare(av):av.localeCompare(bv); }
    av=+av||0; bv=+bv||0; return sortState.dir==='desc'?bv-av:av-bv;
  });

  html += `<div class="tbl-wrap"><table class="data-table${cols.length>18?' dense':''}"><thead><tr>`;
  cols.forEach(c=>{
    const active=sortState.key===c.k;
    const arrow=active?(sortState.dir==='desc'?' ▼':' ▲'):'';
    html += `<th onclick="_leagueSortRecords('${isB?'b':'p'}','${c.k}',${c.asc?1:0})" style="cursor:pointer;${active?'color:var(--amber)':''}" title="클릭하여 정렬">${c.l}${arrow}</th>`;
  });
  html += `</tr></thead><tbody>`;
  rows.forEach(r=>{
    const unq=(r[sampleKey]||0)<qVal;
    const dim = unq && !cumSort;  // 누적 정렬 땐 흐리게 안 함 (값은 정당하므로)
    html += `<tr style="${dim?'opacity:.45':''}" title="${unq?(isB?'규정타석':'규정이닝')+' 미달':''}">`;
    cols.forEach((c,ci)=>{
      const style = ci===0?'font-weight:600':(c.txt?'color:var(--muted);font-size:11px':`font-family:var(--mono)${c.hl?';font-weight:600':''}${c.amber?';color:var(--amber)':''}`);
      const mark = (ci===0&&unq)?' <span style="font-size:9px;color:var(--muted)">°</span>':'';
      html += `<td style="${style}">${c.f(r)}${mark}</td>`;
    });
    html += `</tr>`;
  });
  return html + '</tbody></table></div></div>';
};

// Original index.html:29282
wbdContext._leagueSortTeams = function _leagueSortTeams(key, asc){
  if(!window._leagueTeamSort) window._leagueTeamSort={key:'winPct',dir:'desc'};
  const c=window._leagueTeamSort;
  if(c.key===key){ c.dir=c.dir==='desc'?'asc':'desc'; } else { c.key=key; c.dir=asc?'asc':'desc'; }
  wbdContext.renderLeaguePage();
};

// Original index.html:29289
wbdContext._leagueSortRecords = function _leagueSortRecords(tab, key, asc){
  if(!window._leagueRecSort) window._leagueRecSort={};
  const cur = window._leagueRecSort[tab]||{};
  if(cur.key===key){ cur.dir = cur.dir==='desc'?'asc':'desc'; }
  else { cur.key=key; cur.dir = asc?'asc':'desc'; }  // 낮을수록 좋은 지표(ERA등)는 기본 오름차순
  window._leagueRecSort[tab]=cur;
  wbdContext.renderLeaguePage();
};

// Original index.html:29298
wbdContext._renderLeagueTeamRecords = function _renderLeagueTeamRecords(season, games){
  const rec = wbdContext._withSeasonGames(games, ()=>wbdContext._computeRecordsData());
  if(!rec) return '<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">집계 실패</div>';
  const PT = wbdContext._leaguePlayerTeams(games);
  // V10.3: 이 시즌 리그전 게임에 실제 출전한 팀만 (전체 소속팀이 아니라)
  const leagueTeams=new Set();
  games.forEach(g=>{ const i=wbdContext._parseGameName(g.name);
    [i.teamA,i.teamB].forEach(t=>{const n=wbdContext._normalizeTeam(t); if(n) leagueTeams.add(n);}); });
  // 팀별 타격/투수 합산 (리그전 출전팀만)
  const teams={};
  const ini=t=>({team:t,PA:0,AB:0,H:0,h2B:0,h3B:0,HR:0,TB:0,BB:0,K:0,GIDP:0,pGIDP:0,owar:0,woba_w:0,wrc_w:0,wraa:0,evSum:0,evN:0,hhN:0,hhpN:0,brlN:0,brlpN:0,laSum:0,laN:0, IP:0,pK:0,pBB:0,pH:0,pHR:0,pRuns:0,era_w:0,fip_w:0,pwar:0,pEvSum:0,pEvN:0,pHhN:0,pHhpN:0,pBrlN:0,pBrlpN:0,pLaSum:0,pLaN:0});
  rec.batters.forEach(b=>{ const t=PT.batter[b.name]; if(!t||!leagueTeams.has(t))return;
    if(!teams[t])teams[t]=ini(t); const T=teams[t];
    T.PA+=b.PA||0; T.AB+=b.AB||0; T.H+=b.H||0; T.h2B+=b.h2B||0; T.h3B+=b.h3B||0; T.HR+=b.HR||0; T.TB+=b.TB||0; T.BB+=b.BB||0; T.K+=b.K||0; T.owar+=b.owar||0;
    T.GIDP+=b.GIDP||0;
    T.evSum+=b.evSum||0; T.evN+=b.evN||0; T.hhN+=b.hhN||0; T.hhpN+=b.hhpN||0; T.brlN+=b.brlN||0; T.brlpN+=b.brlpN||0; T.laSum+=b.laSum||0; T.laN+=b.laN||0;
    // wOBA·wRC+는 PA 가중 평균 (팀 단위). wRAA는 누적 합산 가능
    if(b.woba!=null) T.woba_w+=(b.woba)*(b.PA||0);
    if(b.wrcPlus!=null) T.wrc_w+=(b.wrcPlus)*(b.PA||0);
    if(b.wraa!=null) T.wraa+=b.wraa; });
  rec.pitchers.forEach(p=>{ const t=PT.pitcher[p.name]; if(!t||!leagueTeams.has(t))return;
    if(!teams[t])teams[t]=ini(t); const T=teams[t];
    T.IP+=p.IP||0; T.pK+=p.K||0; T.pBB+=p.BB||0; T.pH+=p.H||0; T.pHR+=p.HR||0; T.pwar+=p.pwar||0; T.pRuns+=(p.runs||0);
    T.pGIDP+=p.GIDP||0;
    T.pEvSum+=p.evSum||0; T.pEvN+=p.evN||0; T.pHhN+=p.hhN||0; T.pHhpN+=p.hhpN||0; T.pBrlN+=p.brlN||0; T.pBrlpN+=p.brlpN||0; T.pLaSum+=p.laSum||0; T.pLaN+=p.laN||0;
    if(p.era!=null&&p.IP>0) T.era_w+=p.era*p.IP; if(p.fip!=null&&p.IP>0) T.fip_w+=p.fip*p.IP; });
  const arr=Object.values(teams).map(t=>({...t,
    avg:t.AB>0?t.H/t.AB:0, obp:t.PA>0?(t.H+t.BB)/t.PA:0, slg:t.AB>0?t.TB/t.AB:0,
    ops:(t.AB>0?t.TB/t.AB:0)+(t.PA>0?(t.H+t.BB)/t.PA:0),
    iso:t.AB>0?(t.TB-t.H)/t.AB:0,  // 순장타율 = 장타 - 타율
    bbPct:t.PA>0?t.BB/t.PA*100:0, kPct:t.PA>0?t.K/t.PA*100:0,
    woba:t.PA>0?t.woba_w/t.PA:0, wrcPlus:t.PA>0?t.wrc_w/t.PA:0,
    era:t.IP>0?t.era_w/t.IP:null, fip:t.IP>0?t.fip_w/t.IP:null, whip:t.IP>0?(t.pH+t.pBB)/t.IP:null,
    ra9:(t.IP>0&&t.pRuns!=null)?t.pRuns/t.IP*9:null,
    eraPlus:null,   // 아래에서 리그 평균 확정 후 계산
    k9:t.IP>0?t.pK/t.IP*9:0, bb9:t.IP>0?t.pBB/t.IP*9:0, kbb:t.pBB>0?t.pK/t.pBB:(t.pK>0?99:0),
    avgEV:t.evN>0?t.evSum/t.evN:0, hhPct:t.evN>0?t.hhN/t.evN*100:0, hhpPct:t.evN>0?t.hhpN/t.evN*100:0, brlPct:t.evN>0?t.brlN/t.evN*100:0, brlpPct:t.evN>0?t.brlpN/t.evN*100:0, avgLA:t.laN>0?t.laSum/t.laN:null,
    pAvgEV:t.pEvN>0?t.pEvSum/t.pEvN:0, pHhPct:t.pEvN>0?t.pHhN/t.pEvN*100:0, pHhpPct:t.pEvN>0?t.pHhpN/t.pEvN*100:0, pBrlPct:t.pEvN>0?t.pBrlN/t.pEvN*100:0, pBrlpPct:t.pEvN>0?t.pBrlpN/t.pEvN*100:0, pAvgLA:t.pLaN>0?t.pLaSum/t.pLaN:null,
    war:(t.owar||0)+(t.pwar||0)
  }));
  // V11.5: 승패·득점·실점 (요약 테이블용) — 경기 결과에서 집계
  const _recMap={};
  games.forEach(g=>{
    const i=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(i.teamA), tB=wbdContext._normalizeTeam(i.teamB);
    if(!tA||!tB) return;
    const sc=wbdContext._computeInningScores(g.pitches||[]);
    [[tA,sc.totalA,sc.totalB],[tB,sc.totalB,sc.totalA]].forEach(([t,rf,ra])=>{
      if(!_recMap[t])_recMap[t]={W:0,L:0,T:0,RF:0,RA:0,G:0};
      const R=_recMap[t]; R.G++; R.RF+=rf; R.RA+=ra;
      if(rf>ra)R.W++; else if(rf<ra)R.L++; else R.T++;
    });
  });
  // 투수 결과기록(승/패/세이브/홀드/QS)을 팀 단위로 합산
  const _decTeam={};
  try{
    const _DEC=wbdContext._leaguePitcherDecisions(games);
    Object.entries(_DEC).forEach(([pn,dv])=>{
      const tm=PT.pitcher[pn];
      if(!tm||!leagueTeams.has(tm))return;
      if(!_decTeam[tm])_decTeam[tm]={SV:0,HLD:0,QS:0,QSP:0};
      _decTeam[tm].SV+=dv.S||0; _decTeam[tm].HLD+=dv.H||0;
      _decTeam[tm].QS+=dv.QS||0; _decTeam[tm].QSP+=dv.QSP||0;
    });
  }catch(e){}
  // 리그 평균 RA9 (팀 ERA+ 기준선)
  const _lgIP=arr.reduce((s,t)=>s+(t.IP||0),0);
  const _lgRuns=arr.reduce((s,t)=>s+(t.pRuns||0),0);
  const _lgRA9=_lgIP>0?_lgRuns/_lgIP*9:0;
  arr.forEach(t=>{
    t.eraPlus=(t.era!=null&&t.era>0&&_lgRA9>0)?_lgRA9/t.era*100:null;
    const r=_recMap[t.team]||{W:0,L:0,T:0,RF:0,RA:0,G:0};
    t.W=r.W; t.L=r.L; t.Tie=r.T; t.RF=r.RF; t.RA=r.RA; t.G=r.G;
    t.rdiff=r.RF-r.RA;
    t.winPct=(r.W+r.L)>0?r.W/(r.W+r.L):0;
    t.rpg=r.G>0?r.RF/r.G:0; t.rapg=r.G>0?r.RA/r.G:0;
    const dv=_decTeam[t.team]||{SV:0,HLD:0,QS:0,QSP:0};
    t.SV=dv.SV; t.HLD=dv.HLD; t.QS=dv.QS; t.QSP=dv.QSP;
  });
  // 정렬 상태
  if(!window._leagueTeamSort) window._leagueTeamSort={key:'winPct',dir:'desc'};
  const ts=window._leagueTeamSort;
  const _f3=v=>(v||0).toFixed(3).replace(/^0/,'');
  const teamCols=[
    {k:'team',l:'팀',f:t=>`${wbdContext._teamLogoHTML(t.team,24)}${t.team}`,txt:1},
    {k:'G',l:'경기',f:t=>t.G||0},
    {k:'W',l:'승',f:t=>t.W},{k:'L',l:'패',f:t=>t.L},
    {k:'winPct',l:'승률',f:t=>_f3(t.winPct),hl:1},
    {k:'RF',l:'득점',f:t=>t.RF},{k:'RA',l:'실점',f:t=>t.RA,asc:1},
    {k:'rdiff',l:'득실',f:t=>(t.rdiff>0?'+':'')+t.rdiff,amber:1},
    {k:'rpg',l:'경기당 득점',f:t=>t.rpg.toFixed(2)},{k:'rapg',l:'경기당 실점',f:t=>t.rapg.toFixed(2),asc:1},
    {k:'avg',l:'타율',f:t=>_f3(t.avg)},{k:'ops',l:'OPS',f:t=>_f3(t.ops)},{k:'HR',l:'홈런',f:t=>t.HR},
    {k:'era',l:'ERA',f:t=>t.era!=null?t.era.toFixed(2):'-',asc:1},
    {k:'whip',l:'WHIP',f:t=>t.whip!=null?t.whip.toFixed(2):'-',asc:1},
    {k:'owar',l:'oWAR',f:t=>t.owar.toFixed(2)},{k:'pwar',l:'pWAR',f:t=>t.pwar.toFixed(2)},
    {k:'war',l:'총WAR',f:t=>t.war.toFixed(2),amber:1}
  ];
  // 타격/투수 컬럼 분리
  const teamBatCols=[
    {k:'team',l:'팀',f:t=>`${wbdContext._teamLogoHTML(t.team,24)}${t.team}`,txt:1},
    {k:'PA',l:'타석',f:t=>t.PA},{k:'H',l:'안타',f:t=>t.H},{k:'h2B',l:'2B',f:t=>t.h2B},{k:'h3B',l:'3B',f:t=>t.h3B},{k:'HR',l:'홈런',f:t=>t.HR},
    {k:'BB',l:'볼넷',f:t=>t.BB},{k:'K',l:'삼진',f:t=>t.K},{k:'GIDP',l:'병살타',f:t=>t.GIDP||0,asc:1},
    {k:'avg',l:'타율',f:t=>_f3(t.avg)},{k:'obp',l:'출루',f:t=>_f3(t.obp)},
    {k:'slg',l:'장타',f:t=>_f3(t.slg)},{k:'ops',l:'OPS',f:t=>_f3(t.ops),hl:1},
    {k:'iso',l:'ISO',f:t=>_f3(t.iso)},{k:'bbPct',l:'BB%',f:t=>t.bbPct.toFixed(1)},{k:'kPct',l:'K%',f:t=>t.kPct.toFixed(1)},
    {k:'woba',l:'wOBA',f:t=>_f3(t.woba)},{k:'wrcPlus',l:'wRC+',f:t=>t.wrcPlus.toFixed(0),hl:1},
    {k:'avgEV',l:'평균EV',f:t=>t.avgEV>0?t.avgEV.toFixed(1):'-'},{k:'hhPct',l:'HH%',f:t=>t.evN>0?t.hhPct.toFixed(1):'-'},{k:'brlPct',l:'배럴%',f:t=>t.evN>0?t.brlPct.toFixed(1):'-'},{k:'hhpPct',l:'HH+%',f:t=>t.evN>0?t.hhpPct.toFixed(1):'-'},{k:'brlpPct',l:'배럴+%',f:t=>t.evN>0?t.brlpPct.toFixed(1):'-'},{k:'avgLA',l:'평균LA',f:t=>t.avgLA!=null?t.avgLA.toFixed(1)+'°':'-'},
    {k:'owar',l:'oWAR',f:t=>t.owar.toFixed(2),amber:1}
  ];
  const teamPitCols=[
    {k:'team',l:'팀',f:t=>`${wbdContext._teamLogoHTML(t.team,24)}${t.team}`,txt:1},
    {k:'W',l:'승',f:t=>t.W},{k:'L',l:'패',f:t=>t.L},
    {k:'SV',l:'세이브',f:t=>t.SV||0},{k:'HLD',l:'홀드',f:t=>t.HLD||0},
    {k:'QS',l:'QS',f:t=>t.QS||0},{k:'QSP',l:'QS+',f:t=>t.QSP||0},
    {k:'IP',l:'이닝',f:t=>wbdContext._fmtIP(t.IP)},{k:'pK',l:'탈삼진',f:t=>t.pK},{k:'pBB',l:'볼넷',f:t=>t.pBB},
    {k:'pH',l:'피안타',f:t=>t.pH},{k:'pHR',l:'피홈런',f:t=>t.pHR},{k:'pRuns',l:'실점',f:t=>t.pRuns!=null?t.pRuns:'-',asc:1},
    {k:'ra9',l:'RA9',f:t=>t.ra9!=null?t.ra9.toFixed(2):'-',asc:1},
    {k:'era',l:'ERA',f:t=>t.era!=null?t.era.toFixed(2):'-',asc:1,hl:1},
    {k:'eraPlus',l:'ERA+',f:t=>t.eraPlus!=null?t.eraPlus.toFixed(0):'-'},{k:'fip',l:'FIP',f:t=>t.fip!=null?t.fip.toFixed(2):'-',asc:1},
    {k:'whip',l:'WHIP',f:t=>t.whip!=null?t.whip.toFixed(2):'-',asc:1},
    {k:'k9',l:'K/9',f:t=>t.k9.toFixed(2)},{k:'bb9',l:'BB/9',f:t=>t.bb9.toFixed(2),asc:1},{k:'kbb',l:'K/BB',f:t=>t.kbb>=99?'∞':t.kbb.toFixed(2)},
    {k:'avgEV',l:'피EV',f:t=>t.pAvgEV>0?t.pAvgEV.toFixed(1):'-',asc:1},{k:'pHhPct',l:'피HH%',f:t=>t.pEvN>0?t.pHhPct.toFixed(1):'-',asc:1},{k:'pGIDP',l:'병살',f:t=>t.pGIDP||0},{k:'pBrlPct',l:'피배럴%',f:t=>t.pEvN>0?t.pBrlPct.toFixed(1):'-',asc:1},{k:'pHhpPct',l:'피HH+%',f:t=>t.pEvN>0?t.pHhpPct.toFixed(1):'-',asc:1},{k:'pBrlpPct',l:'피배럴+%',f:t=>t.pEvN>0?t.pBrlpPct.toFixed(1):'-',asc:1},{k:'pAvgLA',l:'피LA',f:t=>t.pAvgLA!=null?t.pAvgLA.toFixed(1)+'°':'-',asc:1},
    {k:'pwar',l:'pWAR',f:t=>t.pwar.toFixed(2),amber:1}
  ];
  // 서브탭 (타격/투수)
  if(!window._leagueTeamRecTab) window._leagueTeamRecTab='general';
  const trTab=window._leagueTeamRecTab;
  const cols = trTab==='general'?teamCols:(trTab==='batting'?teamBatCols:teamPitCols);
  // V11.5: 탭 전환 시 현재 탭에 없는 정렬 키면 기본값으로 폴백
  let sc=cols.find(c=>c.k===ts.key);
  if(!sc){
    const def = trTab==='general'?'winPct':(trTab==='batting'?'ops':'era');
    ts.key=def; ts.dir = (def==='era')?'asc':'desc';
    sc=cols.find(c=>c.k===def)||cols[0];
  }
  arr.sort((a,b)=>{ if(sc.txt) return ts.dir==='desc'?String(b[ts.key]).localeCompare(String(a[ts.key])):String(a[ts.key]).localeCompare(String(b[ts.key]));
    const av=+a[ts.key]||0, bv=+b[ts.key]||0; return ts.dir==='desc'?bv-av:av-bv; });

  // 정렬 적용
  const sc2=cols.find(c=>c.k===ts.key)||cols[0];
  arr.sort((a,b)=>{ if(sc2.txt) return ts.dir==='desc'?String(b[ts.key]||'').localeCompare(String(a[ts.key]||'')):String(a[ts.key]||'').localeCompare(String(b[ts.key]||''));
    const av=+a[ts.key]||0, bv=+b[ts.key]||0; return ts.dir==='desc'?bv-av:av-bv; });

  const openTeam=window._leagueOpenTeam;
  let html = `<div class="card section"><div class="card-title">👥 ${season} 팀 기록</div>
    <div style="display:flex;gap:6px;margin-bottom:12px">
      ${[['general','📋 일반'],['batting','🏏 팀 타격'],['pitching','⚾ 팀 투수']].map(([k,lbl])=>
        `<button onclick="window._leagueTeamRecTab='${k}';renderLeaguePage()" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:${trTab===k?'var(--amber)':'var(--bg2)'};color:${trTab===k?'#000':'var(--muted)'};font-weight:600;cursor:pointer">${lbl}</button>`
      ).join('')}
      <span style="margin-left:auto;font-size:10.5px;color:var(--muted);align-self:center">팀 이름 클릭 → 로스터 펼치기</span>
    </div>
    <div class="tbl-wrap"><table class="data-table"><thead><tr>`;
  cols.forEach(c=>{ const active=ts.key===c.k; const arrow=active?(ts.dir==='desc'?' ▼':' ▲'):'';
    html += `<th onclick="_leagueSortTeams('${c.k}',${c.asc?1:0})" style="cursor:pointer;${active?'color:var(--amber)':''}">${c.l}${arrow}</th>`; });
  html += `</tr></thead><tbody>`;
  arr.forEach(t=>{
    const isOpen=openTeam===t.team;
    html += `<tr${isOpen?' style="background:var(--bg2)"':''}>`;
    cols.forEach((c,ci)=>{
      if(ci===0){
        const _tn=String(t.team).replace(/'/g,"\\'");
        html += `<td style="font-weight:600;cursor:pointer" onclick="toggleLeagueTeam('${_tn}')" title="로스터 보기"><span style="display:inline-flex;align-items:center;gap:6px">${c.f(t)}</span> <span style="font-size:10px;color:var(--muted)">${isOpen?'▴':'▾'}</span></td>`;
      }else{
        const style=`font-family:var(--mono)${c.hl?';font-weight:600':''}${c.amber?';font-weight:700;color:var(--amber)':''}`;
        html += `<td style="${style}">${c.f(t)}</td>`;
      }
    });
    html += `</tr>`;
    // 펼친 팀이면 로스터 행 삽입
    if(isOpen){
      const rosterHtml=wbdContext._withSeasonGames(games, ()=>wbdContext._renderLeagueTeamRoster(t.team, games));
      html += `<tr><td colspan="${cols.length}" style="padding:0;background:var(--bg)">${rosterHtml}</td></tr>`;
    }
  });
  return html + '</tbody></table></div></div>';
};

// Original index.html:29475
wbdContext.renderLeaguePage = function renderLeaguePage(){
  const el = document.getElementById('league-content');
  if(!el) return;
  const seasons = wbdContext._leagueSeasons();
  const seasonNames = Object.keys(seasons);
  if(!seasonNames.length){
    el.innerHTML = '<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">리그전(league) 카테고리 데이터가 없습니다. 카테고리가 \'리그전\'인 경기를 불러오면 여기에 정규시즌 순위·기록이 표시됩니다.</div>';
    return;
  }
  // 시즌 셀렉트 채우기
  const ssel = document.getElementById('league-season-sel');
  const defSeason = wbdContext._leagueDefaultSeason(seasons);
  const curSeason = (ssel.value && seasons[ssel.value]) ? ssel.value : defSeason;
  ssel.innerHTML = seasonNames.sort().map(s=>`<option value="${s}"${s===curSeason?' selected':''}>${s} 시즌 (${seasons[s].count}경기)</option>`).join('');
  // 페이즈 셀렉트 (정규시즌 기본)
  const psel = document.getElementById('league-phase-sel');
  const phases = Object.keys(seasons[curSeason].phases);
  const hasReg = phases.includes('정규시즌');
  const curPhase = (psel.value && seasons[curSeason].phases[psel.value]) ? psel.value : (hasReg ? '정규시즌' : phases[0]);
  psel.innerHTML = phases.map(p=>`<option value="${p}"${p===curPhase?' selected':''}>${p} (${seasons[curSeason].phases[p]})</option>`).join('');

  // 해당 시즌·페이즈 게임만
  const games = wbdContext.GAMES.filter(g => (g.category||'')==='league' && (g.seasonName||g.groupName||g.name)===curSeason && (g.phaseName||'정규시즌')===curPhase);

  // V10.3: 포스트시즌은 순위표 대신 대진 결과 중심으로 분리 렌더
  const isPost = curPhase !== '정규시즌';
  if(isPost){
    el.innerHTML = wbdContext._renderLeaguePostseason(curSeason, curPhase, games);
    return;
  }

  // ── 허브 탭 (순위/리더보드 · 기록실 · 팀기록) ──
  if(!window._leagueTab) window._leagueTab = 'home';
  const tab = window._leagueTab;
  const tabBar = `<div style="display:flex;gap:6px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:0">
    ${[['home','🏆 순위'],['leaders','🏅 리더보드'],['records','📚 기록실'],['teams','👥 팀 기록'],['defense','🛡️ 수비']].map(([k,lbl])=>
      `<button onclick="window._leagueTab='${k}';renderLeaguePage()" style="font-size:12px;padding:8px 14px;background:none;border:none;border-bottom:2px solid ${tab===k?'var(--amber)':'transparent'};color:${tab===k?'var(--amber)':'var(--muted)'};font-weight:${tab===k?'700':'400'};cursor:pointer">${lbl}</button>`
    ).join('')}
  </div>`;

  // 기록실 탭 / 팀기록 탭이면 별도 렌더 후 종료
  if(tab === 'records'){ el.innerHTML = tabBar + wbdContext._renderLeagueRecords(curSeason, games); return; }
  if(tab === 'teams'){ el.innerHTML = tabBar + wbdContext._renderLeagueTeamRecords(curSeason, games); return; }
  if(tab === 'leaders'){ el.innerHTML = tabBar + wbdContext._renderLeagueLeaders(curSeason, games); return; }
  if(tab === 'defense'){ el.innerHTML = tabBar + wbdContext._renderLeagueDefense(curSeason, games); return; }
  // 이하 home 탭 (순위표+리더보드+최근경기) — 맨 앞에 탭바 삽입용 마커
  window._leagueTabBar = tabBar;

  // ── 팀 순위표 ──
  const teams = {};
  games.forEach(g => {
    const info = wbdContext._parseGameName(g.name);
    const {totalA, totalB} = wbdContext._computeInningScores(g.pitches);
    const tA = wbdContext._normalizeTeam(info.teamA), tB = wbdContext._normalizeTeam(info.teamB);
    if(!tA || !tB) return;
    [[tA,totalA,totalB],[tB,totalB,totalA]].forEach(([t,rf,ra])=>{
      if(!teams[t]) teams[t] = {team:t, w:0,l:0,t:0, rf:0,ra:0, g:0};
      teams[t].g++; teams[t].rf+=rf; teams[t].ra+=ra;
      if(rf>ra) teams[t].w++; else if(rf<ra) teams[t].l++; else teams[t].t++;
    });
  });
  const standings = Object.values(teams).map(t=>({
    ...t, pct: (t.w+t.l)>0 ? t.w/(t.w+t.l) : 0, diff: t.rf-t.ra
  })).sort((a,b)=> b.pct-a.pct || b.diff-a.diff);
  // 게임차(GB) 계산
  const leader = standings[0];
  standings.forEach(s=>{ s.gb = leader ? ((leader.w - s.w) + (s.l - leader.l))/2 : 0; });

  let html = (window._leagueTabBar||'') + `<div class="card section" style="margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="card-title" style="margin:0">📋 ${curSeason} ${curPhase} 순위표</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;color:var(--muted)">기본 시즌: <b style="color:var(--amber)">${wbdContext._seasonDisplay(wbdContext.WBD_CURRENT_SEASON)}</b></span>
        ${seasonNames.length>=2?`<button onclick="openSeasonCompare()" style="font-size:11px;padding:4px 10px;background:var(--bg2);color:var(--muted);border:1px solid var(--border);border-radius:6px;cursor:pointer" title="시즌 비교">📊 시즌 비교</button>`:''}
        <button onclick="openLeagueLogoManager()" style="font-size:11px;padding:4px 10px;background:var(--bg2);color:var(--muted);border:1px solid var(--border);border-radius:6px;cursor:pointer" title="팀 로고 관리">🎨 로고</button>
      </div>
    </div>
    <div class="tbl-wrap"><table class="data-table">
    <thead><tr><th>순위</th><th>팀</th><th>경기</th><th>승</th><th>패</th><th>무</th><th>승률</th><th>게임차</th><th>득점</th><th>실점</th><th>득실차</th><th>공략</th></tr></thead><tbody>`;
  standings.forEach((s,i)=>{
    const dc = s.diff>0?'#4ade80':s.diff<0?'#f87171':'var(--muted)';
    html += `<tr>
      <td style="font-family:var(--mono);font-weight:700;color:${i===0?'var(--amber)':'var(--text)'}">${i+1}</td>
      <td style="font-weight:600;cursor:pointer" onclick="toggleLeagueTeam('${s.team.replace(/'/g,"\\'")}')"  title="로스터 보기"><span style="display:inline-flex;align-items:center;gap:8px;font-size:14px">${wbdContext._teamLogoHTML(s.team,30)}${s.team}</span> <span style="font-size:10px;color:var(--muted)">▾</span></td>
      <td style="font-family:var(--mono)">${s.g}</td>
      <td style="font-family:var(--mono)">${s.w}</td>
      <td style="font-family:var(--mono)">${s.l}</td>
      <td style="font-family:var(--mono);color:var(--muted)">${s.t||0}</td>
      <td style="font-family:var(--mono);font-weight:600">${s.pct.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono);color:var(--muted)">${s.gb===0?'-':s.gb.toFixed(1)}</td>
      <td style="font-family:var(--mono)">${s.rf}</td>
      <td style="font-family:var(--mono)">${s.ra}</td>
      <td style="font-family:var(--mono);color:${dc}">${s.diff>0?'+':''}${s.diff}</td>
      <td><button onclick="event.stopPropagation();_slJumpTeam('${s.team.replace(/'/g,"\\'")}')" title="이 팀 공략 리포트로" style="background:transparent;border:1px solid var(--border);color:#f5a623;padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">🎯 공략</button></td>
    </tr>`;
    // 펼친 팀이면 로스터 행 삽입 (해당 시즌 게임 활성화는 아래 리더보드 블록에서 처리되므로 여기선 표시만 마킹)
  });
  // 로스터는 리더보드용으로 게임 활성화된 뒤 렌더 (아래에서 처리)
  html += `</tbody></table></div>
    <div style="font-size:10.5px;color:var(--muted);margin-top:6px">${games.length}경기 집계 · 승률 동률 시 득실차순 · 게임차(GB)는 1위 기준</div>
  </div>`;

  // ── 리더보드 TOP5 (해당 시즌 게임만 임시 활성화 후 기록실 집계) ──
  const gameIds = new Set(games.map(g=>g.id));
  const savedActive = new Set(wbdContext.activeGameIds);
  wbdContext.activeGameIds.clear(); gameIds.forEach(id=>wbdContext.activeGameIds.add(id));
  wbdContext.rebuildG();
  const savedCache = window._recordsCache;
  window._recordsCache = {key:null, batters:null, pitchers:null};
  let rec;
  try { rec = wbdContext._computeRecordsData(); } catch(e){ rec = {batters:[], pitchers:[]}; }
  // 펼친 팀 로스터 HTML (게임 활성화된 지금 시점에 생성)
  let rosterHTML = '';
  if(window._leagueOpenTeam){
    rosterHTML = wbdContext._renderLeagueTeamRoster(window._leagueOpenTeam, games);
  }
  // 복원
  wbdContext.activeGameIds.clear(); savedActive.forEach(id=>wbdContext.activeGameIds.add(id));
  wbdContext.rebuildG();
  window._recordsCache = savedCache;

  const _lbCard = (title, rows, cols) => {
    let h2 = `<div class="card section" style="flex:1;min-width:280px"><div class="card-title">${title}</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>선수</th>${cols.map(c=>`<th>${c.label}</th>`).join('')}</tr></thead><tbody>`;
    rows.forEach((r,i)=>{
      h2 += `<tr><td style="font-family:var(--mono);color:${i===0?'var(--amber)':'var(--muted)'}">${i+1}</td>
        <td style="font-weight:600">${r.name}</td>${cols.map(c=>`<td style="font-family:var(--mono)${c.hl?';color:var(--amber);font-weight:600':''}">${c.fmt(r)}</td>`).join('')}</tr>`;
    });
    return h2 + '</tbody></table></div></div>';
  };

  const _Q = wbdContext._leagueQualThresholds(games);
  const bQ = rec.batters.filter(b=>(b.PA||0)>=_Q.qPA);
  const pQ = rec.pitchers.filter(p=>(p.IP||0)>=_Q.qIP);
  const top = (arr,key,n=5,desc=true) => arr.slice().sort((a,b)=>desc?(b[key]||0)-(a[key]||0):(a[key]||0)-(b[key]||0)).slice(0,n);

  // 펼친 팀 로스터 (순위표 바로 아래)
  if(rosterHTML) html += `<div class="card section" style="margin-bottom:16px">${rosterHTML}</div>`;

  // 리더보드는 별도 탭(_renderLeagueLeaders)으로 분리됨. 홈 탭은 순위표+최근경기.

  // ── 최근 경기 결과 (스코어보드, 최신순) ──
  const results = games.map(g=>{
    const info=wbdContext._parseGameName(g.name);
    const {totalA, totalB}=wbdContext._computeInningScores(g.pitches);
    return {date:info.date||'', tA:wbdContext._normalizeTeam(info.teamA), tB:wbdContext._normalizeTeam(info.teamB), sA:totalA, sB:totalB};
  }).filter(r=>r.tA&&r.tB).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(results.length){
    html += `<div class="card section" style="margin-bottom:16px"><div class="card-title">📅 최근 경기 결과</div><div style="display:flex;flex-direction:column;gap:6px">`;
    results.slice(0,15).forEach(r=>{
      const aWin=r.sA>r.sB, bWin=r.sB>r.sA;
      html += `<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg2);border-radius:7px;font-size:12px">
        <span style="color:var(--muted);font-size:10.5px;min-width:72px">${r.date||'-'}</span>
        <span style="flex:1;text-align:right;font-weight:${aWin?'700':'400'};color:${aWin?'var(--text)':'var(--muted)'}">${r.tA} ${wbdContext._teamLogoHTML(r.tA,18)}</span>
        <span style="font-family:var(--mono);font-weight:700;min-width:54px;text-align:center">${r.sA} : ${r.sB}</span>
        <span style="flex:1;text-align:left;font-weight:${bWin?'700':'400'};color:${bWin?'var(--text)':'var(--muted)'}">${wbdContext._teamLogoHTML(r.tB,18)} ${r.tB}</span>
      </div>`;
    });
    if(results.length>15) html += `<div style="font-size:10.5px;color:var(--muted);text-align:center;margin-top:4px">최근 15경기 표시 · 전체 ${results.length}경기</div>`;
    html += `</div></div>`;
  }

  el.innerHTML = html;
};

// Original index.html:29642
wbdContext.toggleLeagueTeam = function toggleLeagueTeam(team){
  window._leagueOpenTeam = (window._leagueOpenTeam===team) ? null : team;
  wbdContext.renderLeaguePage();
};

// Original index.html:29646
wbdContext._renderLeagueTeamRoster = function _renderLeagueTeamRoster(team, games){
  // 해당 팀 소속 선수들의 정규시즌 기록 (해당 시즌 게임만 활성화된 상태에서 호출됨)
  let rec;
  try { rec = wbdContext._computeRecordsData(); } catch(e){ return ''; }
  const PT = wbdContext._leaguePlayerTeams(games);
  const POS = wbdContext._leaguePlayerPositions(games);
  const bat = rec.batters.filter(b=>PT.batter[b.name]===team);
  const pit = rec.pitchers.filter(p=>PT.pitcher[p.name]===team);
  if(!bat.length && !pit.length) return `<div style="padding:14px;color:var(--muted);font-size:12px">${team} 소속 선수 기록을 찾을 수 없습니다.</div>`;
  bat.sort((a,b)=>(b.PA||0)-(a.PA||0));
  pit.sort((a,b)=>(b.IP||0)-(a.IP||0));
  let h2 = `<div style="padding:12px 14px;background:var(--bg2);border-radius:8px;margin:4px 0 12px">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px">${wbdContext._teamLogoHTML(team,28)} ${team} 로스터</div>`;
  if(bat.length){
    const _f3=v=>(v||0).toFixed(3).replace(/^0/,'');
    h2 += `<div style="font-size:11px;color:var(--muted);margin:6px 0 3px">타자 (${bat.length})</div><div class="tbl-wrap"><table class="data-table"><thead><tr><th>선수</th><th>POS</th><th>타석</th><th>타수</th><th>안타</th><th>2B</th><th>홈런</th><th>HR%</th><th>볼넷</th><th>삼진</th><th>병살</th><th>타율</th><th>출루</th><th>장타</th><th>OPS</th><th>wOBA</th><th>wRC+</th><th>oWAR</th><th>평균EV</th><th>HH%</th><th>배럴%</th><th>HH+%</th><th>배럴+%</th><th>평균LA</th></tr></thead><tbody>`;
    bat.forEach(b=>{ const _sn=String(b.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); h2 += `<tr><td style="font-weight:600;cursor:pointer;color:var(--amber)" onclick="openCardDetail('${_sn}','batter')" title="선수 카드 보기">${b.name}</td><td style="font-size:11px;color:var(--muted)">${wbdContext._posKor(POS[b.name])}</td><td style="font-family:var(--mono)">${b.PA||0}</td><td style="font-family:var(--mono)">${b.AB||0}</td><td style="font-family:var(--mono)">${b.H||0}</td><td style="font-family:var(--mono)">${b.h2B||0}</td><td style="font-family:var(--mono)">${b.HR||0}</td><td style="font-family:var(--mono);color:#ff6b8a">${b.PA>0?(b.hrPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono)">${b.BB||0}</td><td style="font-family:var(--mono)">${b.K||0}</td><td style="font-family:var(--mono)">${b.GIDP||0}</td><td style="font-family:var(--mono);font-weight:600">${_f3(b.avg)}</td><td style="font-family:var(--mono)">${_f3(b.obp)}</td><td style="font-family:var(--mono)">${_f3(b.slg)}</td><td style="font-family:var(--mono);font-weight:600">${_f3(b.ops)}</td><td style="font-family:var(--mono)">${_f3(b.woba)}</td><td style="font-family:var(--mono)">${(b.wrcPlus||0).toFixed(0)}</td><td style="font-family:var(--mono);color:var(--amber)">${(b.owar||0).toFixed(2)}</td><td style="font-family:var(--mono)">${b.avgEV>0?b.avgEV.toFixed(1):'-'}</td><td style="font-family:var(--mono)">${b.evN>0?(b.hhPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono)">${b.evN>0?(b.brlPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono);color:#ff5533">${b.evN>0?(b.hhpPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono);color:#ff2020">${b.evN>0?(b.brlpPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono)">${b.avgLA!=null?b.avgLA.toFixed(1)+'°':'-'}</td></tr>`; });
    h2 += '</tbody></table></div>';
  }
  if(pit.length){
    h2 += `<div style="font-size:11px;color:var(--muted);margin:10px 0 3px">투수 (${pit.length})</div><div class="tbl-wrap"><table class="data-table"><thead><tr><th>선수</th><th>경기</th><th>승</th><th>패</th><th>세이브</th><th>홀드</th><th>QS</th><th>이닝</th><th>탈삼진</th><th>볼넷</th><th>실점</th><th>병살</th><th>ERA</th><th>FIP</th><th>WHIP</th><th>피HR%</th><th>pWAR</th><th>피EV</th><th>피HH%</th><th>피배럴%</th><th>피HH+%</th><th>피배럴+%</th><th>피LA</th></tr></thead><tbody>`;
    pit.forEach(p=>{ const whip=p.IP>0?((p.H+p.BB)/p.IP).toFixed(2):'-'; const _sn=String(p.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); h2 += `<tr><td style="font-weight:600;cursor:pointer;color:var(--amber)" onclick="openCardDetail('${_sn}','pitcher')" title="선수 카드 보기">${p.name}</td><td style="font-family:var(--mono)">${p.G||0}</td><td style="font-family:var(--mono)">${p.W||0}</td><td style="font-family:var(--mono)">${p.L||0}</td><td style="font-family:var(--mono)">${p.SV||0}</td><td style="font-family:var(--mono)">${p.HLD||0}</td><td style="font-family:var(--mono)">${p.QS||0}</td><td style="font-family:var(--mono)">${wbdContext._fmtIP(p.IP)}</td><td style="font-family:var(--mono)">${p.K||0}</td><td style="font-family:var(--mono)">${p.BB||0}</td><td style="font-family:var(--mono);color:${(p.runs||0)>0?'#ff8c66':'var(--text)'}">${p.runs!=null?p.runs:'-'}</td><td style="font-family:var(--mono)">${p.GIDP||0}</td><td style="font-family:var(--mono);font-weight:600">${p.era!=null?p.era.toFixed(2):'-'}</td><td style="font-family:var(--mono)">${p.fip!=null?p.fip.toFixed(2):'-'}</td><td style="font-family:var(--mono)">${whip}</td><td style="font-family:var(--mono);color:#ff6b8a">${p.BF>0||p.hrPct!=null?(p.hrPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono);color:var(--amber)">${p.pwar!=null?p.pwar.toFixed(2):'-'}</td><td style="font-family:var(--mono)">${p.avgEV>0?p.avgEV.toFixed(1):'-'}</td><td style="font-family:var(--mono)">${p.evN>0?(p.hhPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono)">${p.evN>0?(p.brlPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono);color:#ff5533">${p.evN>0?(p.hhpPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono);color:#ff2020">${p.evN>0?(p.brlpPct||0).toFixed(1):'-'}</td><td style="font-family:var(--mono)">${p.avgLA!=null?p.avgLA.toFixed(1)+'°':'-'}</td></tr>`; });
    h2 += '</tbody></table></div>';
  }
  return h2 + '</div>';
};

// Original index.html:29673
wbdContext.renderRecordsPage = function renderRecordsPage(){
  const out = document.getElementById('records-content');
  if(!out) return;
  if(typeof wbdContext.G === 'undefined' || !wbdContext.G.length){
    out.innerHTML = '<div class="container" style="padding:40px;text-align:center;color:var(--muted)">데이터를 먼저 업로드해주세요.</div>';
    return;
  }
  // V10.2 perf: 캐시 미스(첫 진입)면 화면 전환만 즉시 하고 무거운 계산은 다음 틱으로 —
  // 진입 순간 마우스/화면이 멈추는 메인 스레드 블로킹 제거
  const _ck = `${wbdContext.GAMES.length}_${wbdContext.G.length}`;
  if(!(window._recordsCache && window._recordsCache.key === _ck && window._recordsCache.batters)){
    out.innerHTML = '<div class="container" style="padding:60px;text-align:center;color:var(--muted)"><div style="font-size:28px;margin-bottom:12px">📚</div>기록 집계 중...<div style="font-size:11px;margin-top:8px;font-family:var(--mono)">선수별 시즌 스탯 · 세이버메트릭스 · 수비 OAA</div></div>';
    setTimeout(() => {
      wbdContext._computeDefenseData();       // 1단계: 수비 (가장 무거움)
      setTimeout(() => {
        wbdContext._computeRecordsData();      // 2단계: 기록 집계
        wbdContext.renderRecordsPage();        // 3단계: 캐시 히트 상태로 재진입 → 즉시 렌더
      }, 16);
    }, 16);
    return;
  }
  const st = window._recordsState;
  const data = wbdContext._computeRecordsData();
  const isB = st.tab === 'batter';
  let rows = isB ? data.batters : data.pitchers;
  
  // 팀 목록
  const teams = [...new Set(rows.map(r => r.team).filter(t => t && t!=='—'))].sort();
  
  // 필터
  const sampleKey = isB ? 'PA' : 'n';
  rows = rows.filter(r => r[sampleKey] >= st.minSample);
  if(st.team !== 'all') rows = rows.filter(r => r.team === st.team);
  if(st.search) rows = rows.filter(r => r.name.toLowerCase().includes(st.search.toLowerCase()));
  
  // 정렬
  const sk = st.sortKey;
  rows.sort((a,b) => {
    const av = a[sk]??-Infinity, bv = b[sk]??-Infinity;
    if(typeof av === 'string') return st.sortDir==='desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    return st.sortDir==='desc' ? bv-av : av-bv;
  });
  
  // 컬럼 정의 — {key, label, fmt, title}
  const f3 = v => v.toFixed(3).replace(/^0/,'');
  const f1 = v => v.toFixed(1);
  const batCols = [
    {k:'name', l:'선수', fmt:v=>v, w:'120px'},
    {k:'team', l:'팀', fmt:v=>v, w:'90px'},
    {k:'G', l:'G', fmt:v=>v},
    {k:'PA', l:'타석', fmt:v=>v},
    {k:'AB', l:'타수', fmt:v=>v},
    {k:'H', l:'안타', fmt:v=>v},
    {k:'h1B', l:'1루타', fmt:v=>v},
    {k:'h2B', l:'2루타', fmt:v=>v},
    {k:'h3B', l:'3루타', fmt:v=>v},
    {k:'HR', l:'홈런', fmt:v=>v},
    {k:'TB', l:'루타', fmt:v=>v, t:'Total Bases'},
    {k:'BB', l:'볼넷', fmt:v=>v},
    {k:'HBP', l:'사구', fmt:v=>v},
    {k:'K', l:'삼진', fmt:v=>v},
    {k:'avg', l:'타율', fmt:f3, hl:'#39ff8a'},
    {k:'obp', l:'출루율', fmt:f3, hl:'#88cc44'},
    {k:'slg', l:'장타율', fmt:f3, hl:'#ff8800'},
    {k:'ops', l:'OPS', fmt:f3, hl:'#cc66ff'},
    {k:'woba', l:'wOBA', fmt:f3, hl:'#ffd700', t:'가중 출루율 — 안타 종류별 득점 기여 가중 (1B 0.88 / 2B 1.25 / 3B 1.59 / HR 2.05), WBD 리그 OBP 스케일'},
    {k:'wrcPlus', l:'wRC+', fmt:v=>v.toFixed(0), hl:'#ffc844', t:'조정 득점 창출력 — 리그 평균 100. 130 = 평균보다 30% 많은 득점 생산'},
    {k:'wraa', l:'wRAA', fmt:v=>(v>=0?'+':'')+v.toFixed(1), hl:'#88ddaa', t:'평균 대비 득점 기여 (런 단위). +10 = 평균 타자보다 10점 더 생산'},
    {k:'owar', l:'oWAR', fmt:v=>(v>=0?'+':'')+v.toFixed(2), hl:'#ff6688', t:'공격 WAR — 타격만. 수비는 OAA 신뢰도 검증 후 합류 예정 (수비 페이지 참고)'},
    {k:'war144', l:'WAR144', fmt:v=>(v>=0?'+':'')+v.toFixed(1), hl:'#ff4488', t:'KBO 시즌(144경기) 길이 환산 oWAR — 전 선수 동일 계수라 순위 불변, 스케일만 KBO 감각 (8+ = MVP급)'},
    {k:'dOaa', l:'OAA', fmt:v=>v==null?'-':(v>=0?'+':'')+v.toFixed(1), hl:'#557788', t:'[참고] 수비 OAA v4 전 포지션 합산 — 검증 기간 지표'},
    {k:'dWar', l:'dWAR', fmt:v=>v==null?'-':(v>=0?'+':'')+v.toFixed(2), hl:'#557788', t:'[참고] 수비 WAR (OAA 런환산) — 검증 기간 지표'},
    {k:'war', l:'WAR(참고)', fmt:v=>(v>=0?'+':'')+v.toFixed(2), hl:'#778899', t:'[참고] oWAR + dWAR 종합 — 수비 검증 완료 시 메인 승격 예정'},
    {k:'iso', l:'ISO', fmt:f3, hl:'#ffaa66'},
    {k:'babip', l:'BABIP', fmt:f3, hl:'#66ccdd'},
    {k:'kPct', l:'K%', fmt:f1},
    {k:'bbPct', l:'BB%', fmt:f1},
    {k:'hrPct', l:'HR%', fmt:f1, hl:'#ffd700', t:'홈런/타석 — 타석당 홈런 비율'},
    {k:'avgEV', l:'평균EV', fmt:f1, t:'평균 타구속도 — 인플레이만 (파울 제외)'},
    {k:'hhPct', l:'HH%', fmt:f1, hl:'#ff6b6b', t:'하드힛 비율 — EV 110mph 이상 / 인플레이 타구 (파울 제외)'},
    {k:'GIDP', l:'병살타', fmt:v=>String(v||0), t:'땅볼 병살타 — 포스아웃이 포함된 병살만 집계 (신규 CSV 한정)'},
    {k:'brlPct', l:'배럴%', fmt:f1, hl:'#ffd700', t:'배럴 비율 — EV 105+ & 발사각 8~32° / 인플레이 타구'},
    {k:'hhpPct', l:'HH+%', fmt:f1, hl:'#ff5533', t:'HH+ 비율 — EV 125+ / 인플레이 타구 (WBD 실측 BA .485→.650 점프 지점)'},
    {k:'brlpPct', l:'배럴+%', fmt:f1, hl:'#ff2020', t:'배럴+ 비율 — EV 125+ & LA 20~40° / 인플레이 타구 (실측 BA .918, 홈런 96% 발생)'},
    {k:'avgLA', l:'평균LA', fmt:v=>(v==null||isNaN(v))?'-':(+v).toFixed(1)+'°', t:'평균 발사각 — 인플레이만 (파울 제외)'}
  ];
  const pitCols = [
    {k:'name', l:'선수', fmt:v=>v, w:'120px'},
    {k:'team', l:'팀', fmt:v=>v, w:'90px'},
    {k:'G', l:'G', fmt:v=>v},
    {k:'n', l:'투구수', fmt:v=>v},
    {k:'IP', l:'이닝', fmt:function(v){ const o=Math.round(v*3); return Math.floor(o/3)+'.'+(o%3); }, t:'야구식 표기 (38.2 = 38과 2/3이닝)'},
    {k:'W', l:'승', fmt:v=>v||0, hl:'#4ade80', t:'승리투수'},
    {k:'L', l:'패', fmt:v=>v||0, hl:'#f87171', t:'패전투수'},
    {k:'SV', l:'세이브', fmt:v=>v||0, hl:'#60a5fa', t:'세이브'},
    {k:'HLD', l:'홀드', fmt:v=>v||0, hl:'#a78bfa', t:'홀드'},
    {k:'QS', l:'QS', fmt:v=>v||0, hl:'#fbbf24', t:'퀄리티스타트 (선발 6이닝+ 3실점 이하)'},
    {k:'QSP', l:'QS+', fmt:v=>v||0, hl:'#fcd34d', t:'QS+ (선발 7이닝+ 3실점 이하)'},
    {k:'era', l:'ERA', fmt:v=>v==null?'-':v.toFixed(2), hl:'#ff8866', t:'평균자책점 (실점=자책 단순화 — WBD엔 자책 구분 데이터 없음)'},
    {k:'eraPlus', l:'ERA+', fmt:v=>v==null?'-':v.toFixed(0), hl:'#ffaa66', t:'리그 평균 대비 ERA — 100=평균, 높을수록 좋음. 150 = 평균보다 50% 우수'},
    {k:'BF', l:'타자', fmt:v=>v, t:'상대 타자 수'},
    {k:'H', l:'피안타', fmt:v=>v},
    {k:'HR', l:'피홈런', fmt:v=>v},
    {k:'runs', l:'실점', fmt:v=>v!=null?v:'-', t:'총 실점 (ERA 산출 기준)'},
    {k:'ra9', l:'RA9', fmt:v=>v==null?'-':v.toFixed(2), hl:'#ff9966', t:'9이닝당 실점 — pWAR 산출 기반. ERA와 동일 개념이나 이닝이 다른 투수 비교용. 낮을수록 좋음'},
    {k:'BB', l:'볼넷', fmt:v=>v},
    {k:'HBP', l:'사구', fmt:v=>v},
    {k:'K', l:'탈삼진', fmt:v=>v},
    {k:'oAvg', l:'피안타율', fmt:f3, hl:'#39ff8a'},
    {k:'oObp', l:'피출루율', fmt:f3, hl:'#88cc44'},
    {k:'oSlg', l:'피장타율', fmt:f3, hl:'#ff8800'},
    {k:'oOps', l:'피OPS', fmt:f3, hl:'#cc66ff'},
    {k:'fip', l:'FIP', fmt:v=>v==null?'-':v.toFixed(2), hl:'#ffd700', t:'수비 무관 투구력 (HR/BB/K만 반영) — 리그 RA9 스케일. 낮을수록 좋음'},
    {k:'fipMinus', l:'FIP-', fmt:v=>v==null?'-':v.toFixed(0), hl:'#ffc844', t:'리그 평균 100, 낮을수록 좋음. 80 = 평균보다 20% 우수'},
    {k:'whip', l:'WHIP', fmt:v=>v==null?'-':v.toFixed(2), hl:'#88ddaa', t:'이닝당 출루 허용 (볼넷+피안타)/이닝. 낮을수록 좋음'},
    {k:'kbb', l:'K/BB', fmt:v=>v==null?'-':(v>=99?'∞':v.toFixed(1)), hl:'#66ccdd', t:'삼진/볼넷 비율. 높을수록 좋음'},
    {k:'pwar', l:'pWAR', fmt:v=>v==null?'-':(v>=0?'+':'')+v.toFixed(2), hl:'#ff6688', t:'투구 WAR (RA9 실점 기반, bWAR 방식) — 대체 선수 대비 승수 기여. WBD는 BB가 희귀해 FIP 변별력이 낮아 실점 기반 채택'},
    {k:'war144', l:'WAR144', fmt:v=>v==null?'-':(v>=0?'+':'')+v.toFixed(1), hl:'#ff4488', t:'KBO 시즌(144경기) 길이 환산 pWAR — 순위 불변, 스케일만 KBO 감각'},
    {k:'kPct', l:'K%', fmt:f1},
    {k:'bbPct', l:'BB%', fmt:f1},
    {k:'hrPct', l:'HR%', fmt:f1, hl:'#ffd700', t:'피홈런/상대타자 — 타자당 피홈런 비율'},
    {k:'whiffPct', l:'헛스윙%', fmt:f1, hl:'#ff4560'},
    {k:'avgEV', l:'피EV', fmt:f1, t:'피 평균 타구속도 — 인플레이만 (파울 제외). 낮을수록 좋음'},
    {k:'hhPct', l:'피HH%', fmt:f1, t:'피 하드힛 비율 — EV 110mph 이상. 낮을수록 좋음'},
    {k:'GIDP', l:'병살', fmt:v=>String(v||0), t:'유도한 땅볼 병살 수 (신규 CSV 한정)'},
    {k:'brlPct', l:'피배럴%', fmt:f1, t:'피 배럴 비율 — EV 105+ & LA 8~32°. 낮을수록 좋음'},
    {k:'hhpPct', l:'피HH+%', fmt:f1, t:'피 HH+ 비율 — EV 125+. 낮을수록 좋음'},
    {k:'brlpPct', l:'피배럴+%', fmt:f1, t:'피 배럴+ 비율 — EV 125+ & LA 20~40° (홈런 96% 발생 존). 낮을수록 좋음'},
    {k:'avgLA', l:'피LA', fmt:v=>(v==null||isNaN(v))?'-':(+v).toFixed(1)+'°', t:'피 평균 발사각 — 낮을수록 땅볼 유도형'},
    {k:'k9', l:'K/9', fmt:f1, t:'9이닝당 탈삼진 (추정)'}
  ];
  // ── V11.4: 컬럼 그룹 (고정 + 3탭) ──
  const R_BAT_FIXED = ['name','team','G','PA','AB','H','HR','K','avg','obp','slg','ops','wrcPlus','owar'];
  const R_BAT_GROUPS = {
    basic:  {label:'📋 기본',   cols:['h1B','h2B','h3B','TB','BB','HBP','GIDP','iso','babip','kPct','bbPct','hrPct','woba','wraa']},
    batted: {label:'💥 타구질', cols:['BB','GIDP','hrPct','iso','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct','dOaa','dWar','war144','war']},
    all:    {label:'📚 전체',   cols:['h1B','h2B','h3B','TB','BB','HBP','GIDP','iso','babip','kPct','bbPct','hrPct','woba','wraa','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct','war144','dOaa','dWar','war']}
  };
  const R_PIT_FIXED = ['name','team','G','IP','W','L','K','BB','H','runs','ra9','era','eraPlus','fip','whip','k9','pwar'];
  const R_PIT_GROUPS = {
    basic:  {label:'📋 기본',     cols:['n','SV','HLD','QS','QSP','BF','HR','HBP','fipMinus','kPct','bbPct','kbb','hrPct','whiffPct','GIDP','war144']},
    against:{label:'🎯 피안타',   cols:['BF','HR','HBP','oAvg','oObp','oSlg','oOps','whiffPct','GIDP']},
    batted: {label:'💥 피타구질', cols:['BF','HR','GIDP','whiffPct','oAvg','oOps','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct']},
    all:    {label:'📚 전체',     cols:['n','SV','HLD','QS','QSP','BF','HR','HBP','fipMinus','kPct','bbPct','kbb','hrPct','whiffPct','GIDP','war144','oAvg','oObp','oSlg','oOps','avgEV','avgLA','hhPct','brlPct','hhpPct','brlpPct']}
  };
  const _rFixed = isB ? R_BAT_FIXED : R_PIT_FIXED;
  const _rGroups = isB ? R_BAT_GROUPS : R_PIT_GROUPS;
  const _rgKey = isB ? '_recBatColGroup' : '_recPitColGroup';
  if(!window[_rgKey]) window[_rgKey]='basic';
  // V11.4 fix: 사용자가 고른 그룹을 그대로 존중 (자동 전환 없음)
  const _rcg = window[_rgKey];
  const _rWant = new Set([..._rFixed, ...((_rGroups[_rcg]||_rGroups.basic).cols)]);
  const _rOrder = [..._rFixed, ...((_rGroups[_rcg]||_rGroups.basic).cols)];
  const _allCols = isB ? batCols : pitCols;
  const cols = _allCols.filter(c=>_rWant.has(c.k)).sort((a,b)=>_rOrder.indexOf(a.k)-_rOrder.indexOf(b.k));
  const recGroupBtns = Object.entries(_rGroups).map(([k,v])=>
    `<button onclick="window.${_rgKey}='${k}';renderRecordsPage()" style="font-size:11px;padding:5px 12px;border-radius:5px;border:1px solid var(--border);background:${_rcg===k?'#ffc844':'var(--bg2)'};color:${_rcg===k?'#000':'var(--muted)'};cursor:pointer;font-weight:${_rcg===k?'700':'500'}">${v.label}</button>`
  ).join('');
  
  // 헤더 셀
  // V10.1: 좌측 고정(#/선수/팀) — 가로 스크롤 시에도 누가 누군지 항상 보임
  const STICKY = { rank:{left:0,w:30}, name:{left:30,w:118}, team:{left:148,w:86} };
  const thHtml = cols.map(c => {
    const active = st.sortKey === c.k;
    const arrow = active ? (st.sortDir==='desc' ? ' \u25bc' : ' \u25b2') : '';
    let stickyCss = 'z-index:3;';
    if(c.k==='name') stickyCss = `left:${STICKY.name.left}px;z-index:6;min-width:${STICKY.name.w}px;max-width:${STICKY.name.w}px;`;
    else if(c.k==='team') stickyCss = `left:${STICKY.team.left}px;z-index:6;min-width:${STICKY.team.w}px;max-width:${STICKY.team.w}px;box-shadow:2px 0 4px rgba(0,0,0,0.35);`;
    return `<th onclick="_recSort('${c.k}')" ${c.t?`title="${c.t}"`:''} style="cursor:pointer;white-space:nowrap;padding:6px 6px;background:${active?'#2a3550':'var(--card2)'};color:${active?'#ffc844':(c.hl||'var(--muted)')};font-size:10.5px;position:sticky;top:0;${stickyCss}border-bottom:2px solid ${active?'#ffc844':'var(--border)'};user-select:none">${c.l}${arrow}</th>`;
  }).join('');
  
  // 데이터 행 — sticky 셀은 불투명 배경 필수 (투명이면 스크롤 시 글자 겹침)
  const trHtml = rows.map((r, i) => {
    const rowBg = i%2 ? '#181d2c' : '#141828';
    const cells = cols.map(c => {
      const v = r[c.k];
      let txt; try{ txt = (v==null) ? '-' : c.fmt(v); }catch(_){ txt='-'; }
      if(c.k === 'name'){
        return `<td onclick="openCardDetail('${String(r.name).replace(/'/g,"\\'")}','${isB?'batter':'pitcher'}')" title="${String(r.name).replace(/"/g,'&quot;')}" style="cursor:pointer;color:var(--text);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 6px;position:sticky;left:${STICKY.name.left}px;z-index:2;background:${rowBg};min-width:${STICKY.name.w}px;max-width:${STICKY.name.w}px">${txt}</td>`;
      }
      if(c.k === 'team'){
        return `<td title="${String(txt).replace(/"/g,'&quot;')}" style="color:var(--muted);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:4px 6px;position:sticky;left:${STICKY.team.left}px;z-index:2;background:${rowBg};min-width:${STICKY.team.w}px;max-width:${STICKY.team.w}px;box-shadow:2px 0 4px rgba(0,0,0,0.35)">${txt}</td>`;
      }
      return `<td style="font-family:var(--mono);color:${c.hl||'var(--text)'};text-align:right;padding:4px 6px;white-space:nowrap">${txt}</td>`;
    }).join('');
    return `<tr style="border-bottom:1px solid var(--border);background:${rowBg}">
      <td style="color:var(--muted);font-family:var(--mono);font-size:10px;padding:4px 4px;text-align:center;position:sticky;left:0;z-index:2;background:${rowBg};min-width:${STICKY.rank.w}px">${i+1}</td>${cells}</tr>`;
  }).join('');
  
  out.innerHTML = `<div class="container">
    <h1 style="margin:0 0 6px">📚 기록실</h1>
    <div style="color:var(--muted);font-size:12px;margin-bottom:16px">지표 그룹을 선택해 보세요 — 컬럼 헤더 클릭으로 정렬 <span style="opacity:.5;font-size:10px">[B0806-1010]</span></div>
    
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
      <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden">
        <button onclick="window._recordsState.tab='batter';window._recordsState.sortKey='ops';renderRecordsPage()" style="background:${isB?'#ffc844':'var(--card2)'};color:${isB?'#000':'var(--text)'};border:none;padding:8px 18px;font-size:12.5px;font-weight:700;cursor:pointer">🏏 타자</button>
        <button onclick="window._recordsState.tab='pitcher';window._recordsState.sortKey='oOps';window._recordsState.sortDir='asc';renderRecordsPage()" style="background:${!isB?'#ffc844':'var(--card2)'};color:${!isB?'#000':'var(--text)'};border:none;padding:8px 18px;font-size:12.5px;font-weight:700;cursor:pointer">⚾ 투수</button>
      </div>
      <select onchange="window._recordsState.team=this.value;renderRecordsPage()" style="background:var(--card2);color:var(--text);border:1px solid var(--border);padding:8px 10px;border-radius:5px;font-size:12px">
        <option value="all">전체 팀</option>
        ${teams.map(t => `<option value="${t}" ${st.team===t?'selected':''}>${t}</option>`).join('')}
      </select>
      <span style="width:100%;height:0"></span>
      <span style="font-size:10.5px;color:var(--muted)">지표:</span>${recGroupBtns}
      <span style="font-size:10px;color:var(--muted);opacity:.7">${isB?'선수·팀·G·타석·타수·안타·홈런·삼진·슬래시·wRC+·oWAR':'선수·팀·G·이닝·승패·K·BB·피안타·ERA·FIP·WHIP·K/9·pWAR'} 고정</span>
      ${(()=>{const sk=st.sortKey; if(!sk||cols.some(c=>c.k===sk))return ''; const sn=(_allCols.find(c=>c.k===sk)||{}).l||sk; return `<span style="font-size:10px;color:#ffc844;opacity:.85">↕ ${sn} 기준 정렬 중 (현재 그룹에 없는 컬럼)</span>`;})()}
      <span style="width:100%;height:0"></span>
      <label style="display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--muted)">
        최소 ${isB?'타석':'투구'}:
        <input type="number" value="${st.minSample}" min="0" step="5" 
          onchange="window._recordsState.minSample=+this.value||0;renderRecordsPage()"
          style="width:65px;background:var(--card2);color:var(--text);border:1px solid var(--border);padding:6px 8px;border-radius:4px;font-size:12px">
      </label>
      <input type="text" placeholder="🔍 선수 검색" value="${st.search.replace(/"/g,'&quot;')}"
        oninput="window._recordsState.search=this.value;clearTimeout(window._recSearchT);window._recSearchT=setTimeout(renderRecordsPage,300)"
        style="flex:1;min-width:140px;background:var(--card2);color:var(--text);border:1px solid var(--border);padding:8px 10px;border-radius:5px;font-size:12px">
      <span style="font-size:11px;color:var(--muted)">${rows.length}명</span>
    </div>
    
    <div class="card section" style="padding:0;overflow:auto;max-height:75vh">
      <table style="border-collapse:collapse;width:100%;font-size:11.5px">
        <thead><tr>
          <th style="padding:6px 4px;background:var(--card2);color:var(--muted);font-size:10px;position:sticky;top:0;left:0;z-index:7;border-bottom:2px solid var(--border);min-width:30px">#</th>
          ${thHtml}
        </tr></thead>
        <tbody>${trHtml || '<tr><td colspan="25" style="padding:30px;text-align:center;color:var(--muted)">조건에 맞는 선수가 없습니다</td></tr>'}</tbody>
      </table>
    </div>
    <div style="font-size:10px;color:var(--muted);margin-top:8px">💡 1/2/3루타는 베이스 추적 분류(확정률 ~84%, 나머지 타구거리 추정) · 투수 이닝은 아웃수 기반 추정 · 선수 이름 클릭 시 카드 상세</div>
  </div>`;
};
}

export function initialize(wbdContext) {
// Original index.html:28695
wbdContext.TEAM_LOGO_BASE = 'data/logos/';

// Original index.html:28778
wbdContext.WBD_CURRENT_SEASON = '26 Summer';

// Original index.html:28910
if(!window._leagueRecTab) window._leagueRecTab = 'batter';

// Original index.html:28968
wbdContext._POS_KOR = {P:'투수',C:'포수','1B':'1루','2B':'2루','3B':'3루',SS:'유격',LF:'좌익',CF:'중견',RF:'우익',DH:'지명'};

// Original index.html:29641
window._leagueOpenTeam = null;
}
