/** records: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:28462
wbdContext._computeRecordsData = function _computeRecordsData(){
  // 캐시: 게임수+투구수가 같으면 재계산 안 함
  const cacheKey = `${wbdContext.GAMES.length}_${wbdContext.G.length}`;
  if(window._recordsCache.key === cacheKey && window._recordsCache.batters) return window._recordsCache;
  
  window._recPerf = {t0: performance.now()};
  const batters = window._cache.batterNames.map(name => {
    const all = wbdContext.getBatterDataByName(name);  // 캐시가 이미 활성 게임만 포함
    if(!all.length) return null;
    // V10.2 perf: 12회 재순회 → 단일 패스 집계
    let PA=0,AB=0,hits=0,hrs=0,h2B=0,h3B=0,TB=0,BB=0,HBP=0,K=0,evSum=0,evN=0,hhN=0,laSum=0,laN=0,hhpN=0,brlN=0,brlpN=0,gidp=0,dp=0,tp=0;
    const gset=new Set();
    const L=all.length;
    for(let j=0;j<L;j++){
      const d=all[j];
      gset.add(d._gameId);
      const res=+d.result;
      // V10.2 fix: 낫아웃 출루(1BSafe=1이지만 타구 없음 ev=0)는 안타 아님 — 박스스코어/투수분석과 정의 통일
      const isHit=wbdContext._isHit(d);
      if(isHit)hits++;
      if(res===4)hrs++;
      if(wbdContext._isK(d))K++;
      if(wbdContext._isDP(d)){dp++; if(wbdContext._isGIDP(d))gidp++;} else if(wbdContext._isTP(d)){tp++;}   // V11.3: 병살/삼중살
      const ev=+d.ev; if(ev>0&&res!==3){evSum+=ev;evN++;if(ev>=110)hhN++;if(ev>=125)hhpN++;const _la2=+d.ldeg;if(d.ldeg!=null&&!isNaN(_la2)){laSum+=_la2;laN++;if(ev>=105&&_la2>=8&&_la2<=32)brlN++;if(ev>=125&&_la2>=20&&_la2<=40)brlpN++;}}
      if(wbdContext._isPaEnd(d)){  // V12.0: 경기 단위 플래그
        PA++;
        if(res!==5&&res!==6)AB++;
        if(res===5)BB++; else if(res===6)HBP++;
        const hb=+d._hitBase||0;
        if(hb===2)h2B++; else if(hb===3)h3B++;
        if(isHit)TB += hb || (res===4?4:1);
      }
    }
    const h1B = hits - hrs - h2B - h3B;
    const G_ = gset.size;
    const avgEV = evN ? evSum/evN : 0;
    const avg = AB>0 ? hits/AB : 0;
    const obp = PA>0 ? (hits+BB+HBP)/PA : 0;
    const slg = AB>0 ? TB/AB : 0;
    const babipDen = AB - K - hrs;
    return {
      name, team: wbdContext._playerTeam(name,'batter')||'—',
      G: G_, PA, AB, H: hits, h1B, h2B, h3B, HR: hrs, TB, BB, HBP, K, GIDP: gidp, DP: dp, TP: tp,
      avg, obp, slg, ops: obp+slg, iso: slg-avg,
      babip: babipDen>0 ? (hits-hrs)/babipDen : 0,
      kPct: PA>0 ? K/PA*100 : 0, bbPct: PA>0 ? BB/PA*100 : 0,
      hrPct: PA>0 ? hrs/PA*100 : 0, avgEV,
      hhPct: evN>0 ? hhN/evN*100 : 0, avgLA: laN>0 ? laSum/laN : null,
      hhpPct: evN>0 ? hhpN/evN*100 : 0, brlPct: evN>0 ? brlN/evN*100 : 0, brlpPct: evN>0 ? brlpN/evN*100 : 0,
      evSum, evN, hhN, hhpN, brlN, brlpN, laSum, laN
    };
  }).filter(Boolean);
  
  window._recPerf.batters = performance.now();
  const pitchers = window._cache.pitcherNames.map(name => {
    const all = wbdContext.getPitcherDataByName(name);  // 캐시가 이미 활성 게임만 포함
    if(!all.length) return null;
    // V10.2 perf: 단일 패스 집계
    let BF=0,AB=0,hits=0,hrs=0,TB=0,BB=0,HBP=0,K=0,outs=0,swings=0,whiffs=0,evSum=0,evN=0,hhN=0,laSum=0,laN=0,hhpN=0,brlN=0,brlpN=0,gidp=0,dp=0,tp=0;
    const gset=new Set();
    const L=all.length;
    for(let j=0;j<L;j++){
      const d=all[j];
      gset.add(d._gameId);
      const res=+d.result;
      const isHit=wbdContext._isHit(d);  // 통합 안타 정의
      const isK_=wbdContext._isK(d);
      if(isHit)hits++;
      if(res===4)hrs++;
      if(isK_)K++;
      if(wbdContext._isDP(d)){dp++; if(wbdContext._isGIDP(d))gidp++;} else if(wbdContext._isTP(d)){tp++;}   // V11.3: 병살 유도
      if(d.bSwing){swings++; if(+d.call!==2)whiffs++;}
      const ev=+d.ev; if(ev>0&&res!==3){evSum+=ev;evN++;if(ev>=110)hhN++;if(ev>=125)hhpN++;const _la2=+d.ldeg;if(d.ldeg!=null&&!isNaN(_la2)){laSum+=_la2;laN++;if(ev>=105&&_la2>=8&&_la2<=32)brlN++;if(ev>=125&&_la2>=20&&_la2<=40)brlpN++;}}
      if(wbdContext._isPaEnd(d)){  // V12.0: 경기 단위 플래그
        BF++;
        if(res!==5&&res!==6)AB++;
        if(res===5)BB++; else if(res===6)HBP++;
        if(isHit)TB += (+d._hitBase||0) || (res===4?4:1);
        if(isK_ || ((res===1||res===2) && +d['1BSafe']!==1 && +d['1BSafe']!==2))outs++;
      }
    }
    const G_ = gset.size;
    // V10.2 fix: 이닝을 투수분석과 동일한 정밀 소스(_getPitcherSeason: 아웃카운트 변화 추적,
    // 병살·주루아웃 포함)로 통일 — 기존 타석결과 추정(outs/3)은 병살 등을 누락해 과소 집계.
    // ERA가 이미 이 소스를 쓰므로 같은 행에서 분모가 달랐던 불일치도 해소.
    const _ss = wbdContext._getPitcherSeason(name);
    const IP = (_ss && _ss.outs>0) ? _ss.ip : outs/3;  // 폴백: 추정
    const oAvg = AB>0 ? hits/AB : 0;
    const oObp = BF>0 ? (hits+BB+HBP)/BF : 0;
    const oSlg = AB>0 ? TB/AB : 0;
    return {
      name, team: wbdContext._playerTeam(name,'pitcher')||'—',
      G: G_, n: all.length, BF, IP, H: hits, HR: hrs, BB, HBP, K,
      oAvg, oObp, oSlg, oOps: oObp+oSlg,
      kPct: BF>0 ? K/BF*100 : 0, bbPct: BF>0 ? BB/BF*100 : 0,
      hrPct: BF>0 ? hrs/BF*100 : 0,
      whiffPct: swings>0 ? whiffs/swings*100 : 0,
      avgEV: evN>0 ? evSum/evN : 0, hhPct: evN>0 ? hhN/evN*100 : 0, avgLA: laN>0 ? laSum/laN : null,
      hhpPct: evN>0 ? hhpN/evN*100 : 0, brlPct: evN>0 ? brlN/evN*100 : 0, brlpPct: evN>0 ? brlpN/evN*100 : 0,
      evSum, evN, hhN, hhpN, brlN, brlpN, laSum, laN,
      GIDP: gidp, DP: dp, TP: tp,
      k9: IP>0 ? K/IP*9 : 0
    };
  }).filter(Boolean);
  
  // ═══ V10.1: 리그 환경 상수 → wOBA / wRC+ / FIP (WBD 리그 자체 보정) ═══
  // 리그 총 득점 (scoreA/B 기반)
  let lgR = 0;
  wbdContext.GAMES.forEach(g => {
    if(!wbdContext.activeGameIds.has(g.id)) return;
    try { const s = wbdContext._computeInningScores(g.pitches); lgR += (s.totalA||0)+(s.totalB||0); } catch(e){}
  });
  // 리그 타격 totals
  const T = batters.reduce((a,b)=>({PA:a.PA+b.PA, BB:a.BB+b.BB, HBP:a.HBP+b.HBP,
    h1B:a.h1B+b.h1B, h2B:a.h2B+b.h2B, h3B:a.h3B+b.h3B, HR:a.HR+b.HR, H:a.H+b.H}),
    {PA:0,BB:0,HBP:0,h1B:0,h2B:0,h3B:0,HR:0,H:0});
  // 선형 가중치 (MLB 표준 형태) — WBD 리그 OBP 스케일로 정규화
  const W = {bb:0.69, hbp:0.72, b1:0.88, b2:1.25, b3:1.59, hr:2.05};
  const _rawW = (x) => x.PA>0 ? (W.bb*x.BB + W.hbp*x.HBP + W.b1*x.h1B + W.b2*x.h2B + W.b3*x.h3B + W.hr*x.HR)/x.PA : 0;
  const lgRawWoba = _rawW(T);
  const lgOBP = T.PA>0 ? (T.H+T.BB+T.HBP)/T.PA : 0;
  const wobaScale = lgRawWoba>0 ? lgOBP/lgRawWoba : 1;
  const lgWoba = lgOBP;  // 스케일 정의상 리그 wOBA = 리그 OBP
  const lgRPA = T.PA>0 ? lgR/T.PA : 0;
  batters.forEach(b => {
    b.woba = _rawW(b) * wobaScale;
    b.wrcPlus = (lgRPA>0 && b.PA>0) ? (((b.woba-lgWoba)/wobaScale)/lgRPA + 1)*100 : 0;
  });
  // 투수 FIP — ERA 부재 → 리그 RA9로 상수(cFIP) 보정. FIP- = 리그평균 100, 낮을수록 좋음
  const lgIP = pitchers.reduce((a,p)=>a+p.IP, 0);
  const lgRA9 = lgIP>0 ? lgR/lgIP*9 : 0;
  const lgRawFip = lgIP>0 ? pitchers.reduce((a,p)=>a+13*p.HR+3*(p.BB+p.HBP)-2*p.K, 0)/lgIP : 0;
  const cFIP = lgRA9 - lgRawFip;
  pitchers.forEach(p => {
    p.fip = p.IP>0 ? (13*p.HR+3*(p.BB+p.HBP)-2*p.K)/p.IP + cFIP : null;
    p.fipMinus = (p.fip!=null && lgRA9>0) ? p.fip/lgRA9*100 : null;
    // V11.5: 리그 평균 대비 지표 — 기준선 lgRA9 (WBD는 자책 구분이 없어 실점=자책)
    p._lgRA9 = lgRA9;
    // WHIP, K/BB
    p.whip = p.IP>0 ? (p.BB+p.H)/p.IP : null;
    p.kbb = p.BB>0 ? p.K/p.BB : (p.K>0 ? 99 : null);
  });
  
  // ═══ V10.1: 간이 WAR — 수비(OAA) 제외 버전 ═══
  // 수비 OAA는 표본 부족·재보정 대기로 신뢰도 미달 → 타격(oWAR) / 투구(pWAR)만
  // RPW(승당 득점): Tango 근사 = 1.5 × 팀당 경기당 득점 + 3 (타고 리그일수록 1승이 비쌈)
  const activeGames = wbdContext.GAMES.filter(g => wbdContext.activeGameIds.has(g.id)).length;
  const lgRPG = activeGames>0 ? lgR/(activeGames*2) : 0;  // 팀당 경기당 득점
  const RPW = 1.5*lgRPG + 3;
  // 타자 oWAR = (wRAA + 대체수준 보정 20런/600PA) / RPW
  // V10.1: dWAR — OAA v4(요구속도 모델 + zero-sum 보정) 신뢰도 확보로 WAR에 합류
  window._recPerf.league = performance.now();
  const defOaa = {};
  try {
    const dd = wbdContext._computeDefenseData();
    dd.enriched.forEach(p => {
      if(!p._cplr || !p._pos) return;
      defOaa[p._cplr] = (defOaa[p._cplr]||0) + ((p._isOut?1:0) - p._xOut);
    });
  } catch(e){}
  // OAA 1개의 런 가치: MLB ~0.8런을 WBD 득점환경으로 스케일 (타고 리그 = 아웃 가치 ↑)
  const runsPerOAA = 0.8 * (lgRPG>0 ? lgRPG/4.5 : 1);
  // 시즌 길이 (풀타임 선수 출장수 근사) — WAR144 환산용
  const seasonLen = Math.max(1, ...batters.map(b=>b.G), ...pitchers.map(p=>p.G));
  const _war144Scale = 144 / seasonLen;  // KBO 144경기 환산 계수 (전 선수 동일 → 순위 불변)
  batters.forEach(b => {
    b.wraa = (b.PA>0 && wobaScale>0) ? (b.woba-lgWoba)/wobaScale*b.PA : 0;
    b.owar = RPW>0 ? (b.wraa + 20*b.PA/600)/RPW : 0;  // ★ 전역 WAR 기준 (리더보드·헤더·카드)
    b.war144 = b.owar * _war144Scale;  // KBO 시즌 길이 환산 oWAR
    // 참고용: 수비 OAA → dWAR → 종합 WAR (OAA v4 검증 기간이라 메인 지표는 oWAR)
    b.dOaa = defOaa[b.name] != null ? defOaa[b.name] : null;
    b.dWar = (b.dOaa!=null && RPW>0) ? b.dOaa*runsPerOAA/RPW : null;
    b.war = b.owar + (b.dWar||0);
  });
  // 투수 pWAR = (대체수준 RA9 - FIP)/9 × IP / RPW. 대체수준 = 리그평균×1.15
  const replRA9 = lgRA9*1.15;
  window._recPerf.war = performance.now();
  pitchers.forEach(p => {
    // ERA (실점=자책 단순화) + 야구식 이닝 표기 — 기존 _getPitcherSeason 활용
    try {
      const _s = wbdContext._getPitcherSeason(p.name);
      p.era = _s && _s.ip>0 ? _s.era : null;
      p.ipDisp = _s ? _s.ipDisp : null;
      p.runs = _s ? _s.runs : null;
      // V11.5: RA9 (9이닝당 실점) — pWAR 산출 기반 지표
      p.ra9 = (_s && _s.ip>0 && _s.runs!=null) ? _s.runs/_s.ip*9 : null;
      // V11.5: ERA+ / RA9- — 리그 평균 대비 (100=평균)
      //   ERA+ = 리그평균 / 본인 ERA × 100 → 높을수록 좋음 (150 = 평균보다 50% 우수)
      //   RA9- = 본인 RA9 / 리그평균 × 100 → 낮을수록 좋음 (FIP-와 같은 방향)
      p.eraPlus = (p.era!=null && p.era>0 && lgRA9>0) ? lgRA9/p.era*100 : null;
      p.ra9Minus = (p.ra9!=null && lgRA9>0) ? p.ra9/lgRA9*100 : null;
    } catch(e){ p.era=null; p.ipDisp=null; p.runs=null; p.ra9=null; p.eraPlus=null; p.ra9Minus=null; }
    // V10.2: pWAR을 FIP 기반 → RA9(실점) 기반으로 교체 (bWAR 방식).
    // 근거: WBD 실데이터 검증 — BB%≈1.5%로 FIP의 BB항이 사실상 죽고 K 분포도 좁아
    // FIP가 HR 1~2개 노이즈로 결정됨 (ERA 9점대 투수가 2점대 투수보다 높게 평가되는 역전 발생).
    // 컨택 위주 리그라 인플레이 억제가 핵심 스킬 → 실점 기반이 환경에 적합. FIP/FIP-는 참고 컬럼으로 유지.
    p.pwar = (p.era!=null && RPW>0) ? ((replRA9-p.era)/9*p.IP)/RPW : null;
    p.war144 = p.pwar!=null ? p.pwar * _war144Scale : null;
  });
  
  // V11: 결과기록(승/패/세이브/홀드/QS/QS+)을 각 투수에 주입 — 활성 게임 전체 기준
  try {
    const decAcc={};
    const activeGames = wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id));  // G는 투구배열이라 GAMES 활성분 사용
    activeGames.forEach(g=>{
      const info=wbdContext._parseGameName(g.name);
      let d; try{ d=wbdContext.calcGameDecisions(g.pitches, info); }catch(e){ return; }
      if(!d||!d.decisions) return;
      const dc=d.decisions;
      const add=(n,k)=>{ if(!n)return; decAcc[n]=decAcc[n]||{W:0,L:0,S:0,H:0,QS:0,QSP:0}; decAcc[n][k]++; };
      add(dc.W,'W'); add(dc.L,'L'); add(dc.S,'S');
      (dc.H||[]).forEach(n=>add(n,'H')); (dc.QS||[]).forEach(n=>add(n,'QS')); (dc.QSP||[]).forEach(n=>add(n,'QSP'));
    });
    pitchers.forEach(p=>{ const d=decAcc[p.name]||{W:0,L:0,S:0,H:0,QS:0,QSP:0};
      p.W=d.W; p.L=d.L; p.SV=d.S; p.HLD=d.H; p.QS=d.QS; p.QSP=d.QSP; });
  } catch(e){ /* 판정 실패 시 결과기록 0 */ pitchers.forEach(p=>{ p.W=p.W||0;p.L=p.L||0;p.SV=p.SV||0;p.HLD=p.HLD||0;p.QS=p.QS||0;p.QSP=p.QSP||0; }); }

  window._recPerf.end = performance.now();
  window._recordsCache = {key: cacheKey, batters, pitchers, lg:{lgR, lgRPA, lgWoba, wobaScale, lgRA9, cFIP, RPW, lgRPG}};
  return window._recordsCache;
};

// Original index.html:28684
wbdContext._recSort = function _recSort(key){
  const st = window._recordsState;
  if(st.sortKey === key) st.sortDir = st.sortDir==='desc' ? 'asc' : 'desc';
  else { st.sortKey = key; st.sortDir = 'desc'; }
  wbdContext.renderRecordsPage();
};
}

export function initialize(wbdContext) {
// Original index.html:28457
window._recordsState = window._recordsState || {
  tab: 'batter', sortKey: 'ops', sortDir: 'desc', team: 'all', minSample: 20, search: ''
};

// Original index.html:28460
window._recordsCache = {key: null, batters: null, pitchers: null};
}
