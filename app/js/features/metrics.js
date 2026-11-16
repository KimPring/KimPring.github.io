/** metrics: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:9456
wbdContext._isInZone = function _isInZone(d){
  const zx=+d.zoneX, zy=+d.zoneY;
  return !isNaN(zx) && !isNaN(zy) && zx>=-1 && zx<=1 && zy>=-1 && zy<=1;
};

// Original index.html:9460
wbdContext._isOutZone = function _isOutZone(d){
  const zx=+d.zoneX, zy=+d.zoneY;
  return !isNaN(zx) && !isNaN(zy) && (zx<-1 || zx>1 || zy<-1 || zy>1);
};

// Original index.html:9466
wbdContext._isHardHit = function _isHardHit(d){ return +d.ev >= 110; };

// Original index.html:9470
wbdContext._isInPlay = function _isInPlay(d){ return +d.ev>0 && +d.result!==3 && d._paEnd!==false; };

// Original index.html:9473
wbdContext._isHHPlus = function _isHHPlus(d){ return +d.ev>=125; };

// Original index.html:9475
wbdContext._isBarrelPlus = function _isBarrelPlus(d){ const ev=+d.ev, la=+d.ldeg; return ev>=125 && la>=20 && la<=40; };

// Original index.html:9477
wbdContext._bbQuality = function _bbQuality(d){
  const ev=+d.ev, la=+d.ldeg;
  if(ev>=125 && la>=20 && la<=40) return 'barrelPlus';
  if((ev>=110 && ev<125 && la>=15 && la<=32) || (ev>=125 && la>=8 && la<20)) return 'solid';
  if((ev<110 && la>=15 && la<25) || (ev>=110 && la>=0 && la<8)) return 'flare';
  if(la<0) return 'topped';
  if((la>32 && ev<115) || la>40) return 'under';
  return 'weak';
};

// Original index.html:9488
wbdContext._evCapByHeight = function _evCapByHeight(h){
  if(h<=160)return 120;
  if(h<=165)return 120+(h-160);
  if(h<=170)return 125+(h-165)*0.6;
  if(h<=175)return 128+(h-170)*0.4;
  return 130;
};

// Original index.html:9497
wbdContext._isHHPlusAdj = function _isHHPlusAdj(d){ const h=+d.bHCm||175; return +d.ev >= wbdContext._evCapByHeight(h)-5; };

// Original index.html:9498
wbdContext._isBarrelPlusAdj = function _isBarrelPlusAdj(d){ const h=+d.bHCm||175; const la=+d.ldeg; return +d.ev >= wbdContext._evCapByHeight(h)-5 && la>=20 && la<=40; };

// Original index.html:9503
wbdContext._isPaEnd = function _isPaEnd(d){
  const r=+d.result;
  if(d._paEnd===undefined) return +d['1BSafe']===1||r===4||r===1||r===2||r===5||r===6||wbdContext._isK(d);  // 플래그 없는 구데이터 폴백
  return d._paEnd && (r===5||r===6||r===4||wbdContext._isK(d)||(+d.ev>0&&r!==3));
};

// Original index.html:9509
wbdContext._isABPitch = function _isABPitch(d){ const r=+d.result; return r!==5&&r!==6&&wbdContext._isPaEnd(d); };

// Original index.html:9512
wbdContext._isBarrel = function _isBarrel(d){ return +d.ev >= 105 && +d.ldeg >= 8 && +d.ldeg <= 32; };

// Original index.html:9516
wbdContext._calcStandardStats = function _calcStandardStats(pitches){
  if(!pitches || !pitches.length){
    return {n:0, ab:0, hits:0, hr:0, bb:0, hbp:0, ba:0, slg:0, obp:0, ops:0, iso:0,
            singles:0, hh:0, hhPct:0, brl:0, brlPct:0, avgEV:0, maxEV:0,
            sw:0, wh:0, whPct:0, contacts:0, ks:0, kPct:0,
            outZ:0, outZSw:0, chase:0, inZ:0, inZSw:0, zSwing:0, batted:0};
  }
  const n = pitches.length;
  
  let hits=0, hr=0, bb=0, hbp=0, singles=0;
  let evSum=0, evCnt=0, hh=0, brl=0, maxEV=0;
  let sw=0, wh=0, contacts=0, ks=0;
  let outZ=0, outZSw=0, inZ=0, inZSw=0;
  let ab=0, batted=0;
  
  for(let i=0;i<n;i++){
    const d=pitches[i];
    // 더미 투구 (Forfeit) 제외
    if(typeof wbdContext._isDummyPitch === 'function' && wbdContext._isDummyPitch(d)) continue;
    const r=+d.result;
    const ev=+d.ev;
    const isHit = wbdContext._isHit(d);  // 1BSafe=1 또는 HR
    
    if(isHit) hits++;
    if(r===4) hr++;
    else if(+d['1BSafe']===1) singles++;
    if(r===5) bb++;
    if(r===6) hbp++;
    
    // AB: 안타 + 인플레이아웃 + K
    if(isHit || r===1 || r===2) ab++;
    
    if(ev > 0 && r !== 3){  // V11.1: 파울 제외 (인플레이만)
      batted++;
      evSum += ev;
      evCnt++;
      if(ev > maxEV) maxEV = ev;
      if(ev >= 110) hh++;
      if(ev >= 105 && +d.ldeg >= 8 && +d.ldeg <= 32) brl++;
    }
    
    if(d.bSwing){
      sw++;
      if(+d.call !== 2) wh++;
      else contacts++;
    }
    
    if(wbdContext._isK(d)) ks++;
    
    if(wbdContext._isInZone(d)){
      inZ++;
      if(d.bSwing) inZSw++;
    } else if(wbdContext._isOutZone(d)){
      outZ++;
      if(d.bSwing) outZSw++;
    }
  }
  
  // K도 AB
  ab += ks;
  
  const ba = ab > 0 ? hits/ab : 0;
  // SLG: 단타*1 + HR*4 (2B/3B 데이터 없음)
  const slg = ab > 0 ? (singles + hr*4) / ab : 0;
  // OBP: (안타 + 볼넷 + 사구) / (AB + BB + HBP)
  const obpDenom = ab + bb + hbp;
  const obp = obpDenom > 0 ? (hits + bb + hbp) / obpDenom : 0;
  const ops = obp + slg;
  const iso = slg - ba;
  
  // wOBA (가중 출루율) — WBD 보정 가중치 적용
  //   Fangraphs 식: wOBA = (w_BB*BB + w_HBP*HBP + w_1B*1B + w_HR*HR) / PA
  //   WBD 가중치 (희소성 보정): BB=0.62, HBP=0.22, 1B=0.31, HR=1.66
  //   (PV 가중치와 동일한 절댓값 - 일관성)
  const woba = obpDenom > 0 
    ? (0.55*bb + 0.55*hbp + 0.45*singles + 1.80*hr) / obpDenom 
    : 0;
  
  // K/BB 비율 (BB가 0일 때는 K로 표시)
  const kbb = bb > 0 ? ks/bb : (ks > 0 ? Infinity : 0);
  
  // BABIP (Batting Average on Balls In Play) — 운+타구질
  // BABIP = (안타 - HR) / (AB - K - HR + SF)  ※ SF 없음
  const babipDenom = ab - ks - hr;
  const babip = babipDenom > 0 ? (hits - hr) / babipDenom : 0;
  
  return {
    n, ab, hits, hr, bb, hbp, singles,
    ba, slg, obp, ops, iso, woba, kbb, babip,
    batted, hh, hhPct: batted>0 ? hh/batted*100 : 0,
    brl, brlPct: batted>0 ? brl/batted*100 : 0,
    avgEV: evCnt>0 ? evSum/evCnt : 0, maxEV,
    sw, wh, whPct: sw>0 ? wh/sw*100 : 0,
    contacts, ks, kPct: n>0 ? ks/n*100 : 0,
    outZ, outZSw, chase: outZ>0 ? outZSw/outZ*100 : 0,
    inZ, inZSw, zSwing: inZ>0 ? inZSw/inZ*100 : 0,
    bbPct: n>0 ? bb/n*100 : 0
  };
};

// Original index.html:9658
wbdContext._nextCountState = function _nextCountState(d){
  const ball = +d.ball;
  const strk = +d.strk;
  const r = +d.result;
  const isK = wbdContext._isK(d);
  const call = +d.call;
  
  // 종료 결과 (먼저 체크) - result 우선
  if(r === 4) return 'HR';
  if(r === 5) return 'BB';
  if(r === 6) return 'HBP';
  
  // 파울 (result=3): WBD에선 call=2 + ev>0로 찍힘 → result로 우선 판정
  if(r === 3){
    if(strk >= 2) return `${ball}-${strk}`;  // 2스트 파울은 카운트 유지
    return `${ball}-${strk + 1}`;
  }
  
  if(isK) return 'K';
  if(+d['1BSafe'] === 1) return '1B';
  if(r === 1 || r === 2) return 'OUT';
  
  // DeadBall (call=3) → HBP (대부분 r=6으로 이미 처리되지만 안전망)
  if(call === 3) return 'HBP';
  
  // 진행 중 → 다음 카운트
  if(call === 0 || call === 4){  // Strike 또는 Swing(헛스윙)
    return `${ball}-${Math.min(strk+1, 2)}`;
  }
  // call === 1 (Ball) 또는 기타
  return `${Math.min(ball+1, 3)}-${strk}`;
};

// Original index.html:9692
wbdContext._crvOfPitch = function _crvOfPitch(d){
  const ball = +d.ball, strk = +d.strk;
  const curKey = `${ball}-${strk}`;
  const curRE = wbdContext.COUNT_RE[curKey] != null ? wbdContext.COUNT_RE[curKey] : 0;
  
  const nextKey = wbdContext._nextCountState(d);
  const nextRE = wbdContext.COUNT_RE[nextKey] != null ? wbdContext.COUNT_RE[nextKey] : 0;
  
  let rv = -(nextRE - curRE);  // 타자 RV의 반대 = 투수 PV
  
  // 2-스트라이크 파울 보너스 (D: 무난한 디테일)
  //   result=3 파울 + 2스트 → 카운트 유지지만 타자 살려둠
  //   투수에겐 살짝 가치 있음 (실제 데이터상 2스트 파울 후 K 확률 ↑)
  if(+d.result === 3 && strk >= 2){
    rv += 0.008;
  }
  
  return rv;
};

// Original index.html:9713
wbdContext._pvSum = function _pvSum(pitches){
  if(!pitches || !pitches.length) return 0;
  let sum = 0;
  for(let i = 0; i < pitches.length; i++){
    if(wbdContext._isDummyPitch(pitches[i])) continue;
    sum += wbdContext._crvOfPitch(pitches[i]);
  }
  return sum;
};

// Original index.html:9754
wbdContext._xrvOfBattedBall = function _xrvOfBattedBall(ev, la){
  // 클램프
  if(ev < 55) ev = 55;
  if(ev > 145) ev = 145;
  if(la < -50) la = -50;
  if(la > 70) la = 70;
  
  // EV 5단위 보간
  const evLo = Math.floor(ev/5)*5;
  const evHi = Math.min(145, evLo + 5);
  const evT = (ev - evLo) / 5;
  
  // LA 10단위 보간
  const laBins = [-50,-40,-30,-20,-10,0,10,20,30,40,50,60,70];
  let laIdx = Math.floor((la + 50) / 10);
  if(laIdx < 0) laIdx = 0;
  if(laIdx >= 12) laIdx = 11;
  const laT = (la - laBins[laIdx]) / 10;
  
  const rowLo = wbdContext.XBA_GRID[evLo];
  const rowHi = wbdContext.XBA_GRID[evHi];
  if(!rowLo || !rowHi) return 0;
  
  // bilinear 보간
  const v00 = rowLo[laIdx], v01 = rowLo[laIdx+1] || rowLo[laIdx];
  const v10 = rowHi[laIdx], v11 = rowHi[laIdx+1] || rowHi[laIdx];
  const v0 = v00 + (v01 - v00) * laT;
  const v1 = v10 + (v11 - v10) * laT;
  return v0 + (v1 - v0) * evT;
};

// Original index.html:9787
wbdContext._xCrvOfPitch = function _xCrvOfPitch(d){
  const ball = +d.ball, strk = +d.strk;
  const curRE = wbdContext.COUNT_RE[`${ball}-${strk}`] || 0;
  
  const r = +d.result;
  
  // 인플레이 타구: xRV 사용 (BABIP 운 제거)
  if((r === 4 || +d['1BSafe'] === 1 || r === 1 || r === 2) && +d.ev > 0){
    let xrv = wbdContext._xrvOfBattedBall(+d.ev, +d.ldeg || 0);
    // V10.2: WBD 실데이터 격자(266경기, 평균0 중심·실측 run value)로 교체.
    //   기존 MLB 격자 + 임의 zero-center(-0.0594) + 임의 1.7배율 모두 제거 — 데이터 자체가 WBD 환경.
    return -(xrv - curRE);
  }
  
  // BB/HBP/K/진행중 - 실제 RV 사용
  return wbdContext._crvOfPitch(d);
};

// Original index.html:9806
wbdContext._xPvSum = function _xPvSum(pitches){
  if(!pitches || !pitches.length) return 0;
  let sum = 0;
  for(let i = 0; i < pitches.length; i++){
    if(wbdContext._isDummyPitch(pitches[i])) continue;
    sum += wbdContext._xCrvOfPitch(pitches[i]);
  }
  return sum;
};

// Original index.html:9819
wbdContext._isDummyPitch = function _isDummyPitch(d){
  if(!d) return true;
  if(d.pName === 'Forfeit' || d.bName === 'Forfeit') return true;
  // V11.6: 신규 포맷(256컬럼)의 이닝교대(SIDE)·경기종료(END) 마커 행 — 실제 투구가 아님.
  //   투수·타자 이름이 비어 있고 out/주자 상태만 담긴 행으로, 투구로 세면
  //   이닝 계산에서 "그 이닝의 마지막 투구"로 잡혀 3아웃 채우기가 누락됨(5이닝→3.2이닝 오류).
  const _t = d.type == null ? '' : String(d.type).toUpperCase();
  if(_t === 'SIDE' || _t === 'END') return true;
  // ball/strk/call이 모두 null이면 더미
  if(d.ball == null && d.strk == null && d.call == null) return true;
  return false;
};

// Original index.html:9841
wbdContext._getLeagueXPVPerPitch = function _getLeagueXPVPerPitch(){
  // _gameStatsKey가 정의된 경우 key 기반 캐시 무효화 (정의 안 됐으면 단순 캐시)
  const key = (typeof wbdContext._gameStatsKey === 'function') ? wbdContext._gameStatsKey() : 'static';
  if(wbdContext._LEAGUE_XPV_PER_PITCH_CACHE !== null && wbdContext._LEAGUE_XPV_KEY === key) return wbdContext._LEAGUE_XPV_PER_PITCH_CACHE;
  if(!wbdContext.G || !wbdContext.G.length){wbdContext._LEAGUE_XPV_PER_PITCH_CACHE = 0; wbdContext._LEAGUE_XPV_KEY = key; return 0;}
  let total = 0, count = 0;
  for(let i = 0; i < wbdContext.G.length; i++){
    if(wbdContext._isDummyPitch(wbdContext.G[i])) continue;
    total += wbdContext._xCrvOfPitch(wbdContext.G[i]);
    count++;
  }
  wbdContext._LEAGUE_XPV_PER_PITCH_CACHE = count > 0 ? total / count : 0;
  wbdContext._LEAGUE_XPV_KEY = key;
  return wbdContext._LEAGUE_XPV_PER_PITCH_CACHE;
};

// Original index.html:9858
wbdContext._xPvPlusSum = function _xPvPlusSum(pitches){
  if(!pitches || !pitches.length) return 0;
  const validPitches = pitches.filter(d => !wbdContext._isDummyPitch(d));
  if(!validPitches.length) return 0;
  const rawXpv = wbdContext._xPvSum(validPitches);
  const leagueRate = wbdContext._getLeagueXPVPerPitch();
  return rawXpv - leagueRate * validPitches.length;
};

// Original index.html:9875
wbdContext._ppowToKmh = function _ppowToKmh(ppow){
  if(!ppow||ppow<=0)return 0;
  if(ppow>=wbdContext._PPOW_TO_KMH.length-1)return wbdContext._PPOW_TO_KMH[wbdContext._PPOW_TO_KMH.length-1];
  // 소수점 보간
  const lo=wbdContext._PPOW_TO_KMH[Math.floor(ppow)];
  const hi=wbdContext._PPOW_TO_KMH[Math.floor(ppow)+1];
  const frac=ppow-Math.floor(ppow);
  return lo+(hi-lo)*frac;
};

// Original index.html:9889
wbdContext._countPaEnd = function _countPaEnd(pitches){
  // V12.0: 경기 단위 플래그 기반(_isPaEnd). 부분집합에도 안전. 종결 이벤트 없는 미완 타석은 제외.
  if(!pitches || pitches.length===0)return [];
  return pitches.filter(wbdContext._isPaEnd);
};

// Original index.html:9898
wbdContext._gameStatsKey = function _gameStatsKey(){
  // V10.2 perf: 호출마다 정렬+조인하던 것을 generation 기반 메모이즈 (수만 회 호출 지점)
  const gen = window._cache ? window._cache.generation : -1;
  if(wbdContext._statsCache._keyMemoGen === gen && wbdContext._statsCache._keyMemo != null) return wbdContext._statsCache._keyMemo;
  wbdContext._statsCache._keyMemo = [...wbdContext.activeGameIds].sort().join(',');
  wbdContext._statsCache._keyMemoGen = gen;
  return wbdContext._statsCache._keyMemo;
};

// Original index.html:9906
wbdContext._getCachedPitcherStats = function _getCachedPitcherStats(gameId){
  const key=wbdContext._gameStatsKey();
  if(wbdContext._statsCache._gameKey!==key){
    wbdContext._statsCache.pitcher={};
    wbdContext._statsCache.batter={};
    wbdContext._statsCache._gameKey=key;
  }
  if(!wbdContext._statsCache.pitcher[gameId]){
    const g=wbdContext.GAMES.find(x=>x.id===gameId);
    if(!g)return null;
    wbdContext._statsCache.pitcher[gameId]=wbdContext.calcPitcherGameStats(g.pitches);
  }
  return wbdContext._statsCache.pitcher[gameId];
};

// Original index.html:9920
wbdContext._getCachedBatterStats = function _getCachedBatterStats(gameId){
  const key=wbdContext._gameStatsKey();
  if(wbdContext._statsCache._gameKey!==key){
    wbdContext._statsCache.pitcher={};
    wbdContext._statsCache.batter={};
    wbdContext._statsCache._gameKey=key;
  }
  if(!wbdContext._statsCache.batter[gameId]){
    const g=wbdContext.GAMES.find(x=>x.id===gameId);
    if(!g)return null;
    wbdContext._statsCache.batter[gameId]=wbdContext.calcBatterGameStats(g.pitches);
  }
  return wbdContext._statsCache.batter[gameId];
};

// Original index.html:9938
wbdContext._getLeagueAverages = function _getLeagueAverages(){
  const key=wbdContext._gameStatsKey();
  if(wbdContext._LG_AVG_CACHE && wbdContext._LG_AVG_KEY===key) return wbdContext._LG_AVG_CACHE;
  
  // 활성 게임의 모든 paEnd 수집
  const allPaEnds=[];
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id)) return;
    allPaEnds.push(...wbdContext._countPaEnd(g.pitches));
  });
  
  const PA=allPaEnds.length;
  if(PA<30){
    // 데이터 너무 적으면 합리적 fallback (이전 측정치)
    wbdContext._LG_AVG_CACHE={wOBA:0.371, ERA:4.3, KPct:17, BBPct:1.6, BAagainst:0.35, OPS:0.802};
    wbdContext._LG_AVG_KEY=key;
    return wbdContext._LG_AVG_CACHE;
  }
  
  const BB=allPaEnds.filter(d=>d.result===5).length;
  const HBP=allPaEnds.filter(d=>d.result===6).length;
  const HR=allPaEnds.filter(d=>d.result===4).length;
  const hits=allPaEnds.filter(wbdContext._isHit).length;
  const singles=hits-HR;
  const Ks=allPaEnds.filter(d=>wbdContext._isK(d)).length;
  const AB=PA-BB-HBP;
  
  const wOBA=PA?(0.7*BB + 0.7*HBP + 0.9*singles + 2.0*HR)/PA:0.371;
  const KPct=PA?Ks/PA*100:17;
  const BBPct=PA?BB/PA*100:1.6;
  const BAagainst=AB?hits/AB:0.35;
  
  // ERA: 활성 게임의 총 점수 / 총 IP
  let totalRuns=0;
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id)) return;
    if(g.pitches.length){
      const last=g.pitches[g.pitches.length-1];
      totalRuns+=(+last.scoreA||0)+(+last.scoreB||0);
    }
  });
  const allOuts=allPaEnds.filter(d=>(wbdContext._isK(d))||[1,2,3].includes(+d.result)).length;
  const totalIP=allOuts/3;
  const ERA=totalIP>0 ? totalRuns*9/totalIP : 4.3;
  
  const OBP=PA?(hits+BB+HBP)/PA:0;
  const SLG=AB?(singles+HR*4)/AB:0;
  const OPS=OBP+SLG;
  
  wbdContext._LG_AVG_CACHE={wOBA, ERA, KPct, BBPct, BAagainst, OPS, OBP, SLG, BA:hits/AB||0};
  wbdContext._LG_AVG_KEY=key;
  return wbdContext._LG_AVG_CACHE;
};

// Original index.html:9994
wbdContext._fmtIP = function _fmtIP(ip){
  if(ip==null||isNaN(ip)) return '-';
  const whole=Math.floor(ip+1e-9);
  const frac=ip-whole;
  const outs=Math.round(frac*3);  // 0,1,2 (3이면 반올림으로 다음 정수)
  if(outs>=3) return (whole+1)+'.0';
  return whole+'.'+outs;
};

// Original index.html:10003
wbdContext._getPitcherSeason = function _getPitcherSeason(name){
  // V10.2 perf: 이름별 시즌 메모이즈 (generation 변경 시 자동 무효화)
  const _gen = window._cache ? window._cache.generation : -1;
  if(!window._pSeasonMemo || window._pSeasonMemo._gen !== _gen) window._pSeasonMemo = {_gen: _gen};
  if(window._pSeasonMemo[name]) return window._pSeasonMemo[name];
  let outs=0,runs=0,hits=0,bbs=0,hrs=0,ks=0,pitches=0,games=0;
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const gs=wbdContext._getCachedPitcherStats(g.id);
    if(gs && gs[name]){
      const s=gs[name];
      outs+=s.outs;runs+=s.runs;hits+=s.hits;bbs+=s.bbs;
      hrs+=s.hrs;ks+=s.ks;pitches+=s.pitches;games++;
    }
  });
  const ip=outs/3;
  return window._pSeasonMemo[name] = {outs,ip,runs,hits,bbs,hrs,ks,pitches,games,
    era:ip>0?runs/ip*9:0,
    whip:ip>0?(hits+bbs)/ip:0,
    ipDisp:Math.floor(ip)+'.'+(outs%3)};
};

// Original index.html:10024
wbdContext._getBatterSeason = function _getBatterSeason(name){
  let ab=0,hits=0,hrs=0,bbs=0,ks=0,pitches=0,games=0;
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const bs=wbdContext._getCachedBatterStats(g.id);
    if(bs && bs[name] && bs[name].pitches>=3){
      const s=bs[name];
      ab+=s.ab;hits+=s.hits;hrs+=s.hrs;bbs+=s.bbs;ks+=s.ks;pitches+=s.pitches;games++;
    }
  });
  const _ba=ab>0?hits/ab:0;
  const _slg=ab>0?(hits+hrs*3)/ab:0;  // 주: 단타 가중(2/3루타 미분류) — 카드용 근사
  const _obp=(ab+bbs)>0?(hits+bbs)/(ab+bbs):0;
  return {ab,hits,hrs,bbs,ks,pitches,games,
    ba:_ba, slg:_slg, obp:_obp,
    ops:_obp+_slg,            // V10.2 fix: 카드 뒷면이 _bs.ops 참조 — 누락 시 toFixed 크래시
    h1B:Math.max(0,hits-hrs), h2B:0, h3B:0};  // 카드 표시용 폴백(베이스 분류는 기록실 advanced 참조)
};
}

export function initialize(wbdContext) {
// Original index.html:9445
wbdContext._OUTCOME_META = {
  hr:    {label:'홈런',   color:'#ffd700', shape:'star'},      // ★ 별
  hit:   {label:'안타',   color:'#39ff8a', shape:'triangle'},  // ▲ 위삼각형
  out:   {label:'아웃',   color:'#8090a0', shape:'dtriangle'}, // ▽ 역삼각형
  whiff: {label:'헛스윙', color:'#ff4560', shape:'square'},    // ■ 사각형
  called:{label:'루킹S',  color:'#4dd0e1', shape:'ring'},      // ○ 빈 원
  foul:  {label:'파울',   color:'#b39ddb', shape:'diamond'},   // ◆ 마름모
  ball:  {label:'볼',     color:'#546e7a', shape:'hbar'},      // ▬ 가로막대
  bb:    {label:'볼넷',   color:'#7986cb', shape:'circle'},    // ● 원
  hbp:   {label:'사구',   color:'#ff6b8a', shape:'plus'}       // + 십자
};

// Original index.html:9486
wbdContext._BBQ_ORDER = ['barrelPlus','solid','flare','topped','under','weak'];

// Original index.html:9499
wbdContext._BBQ_META = {barrelPlus:{label:'배럴+',color:'#ff2020'},solid:{label:'솔리드',color:'#ff9eb5'},flare:{label:'플레어/버너',color:'#ff9933'},topped:{label:'톱드',color:'#7fc46a'},under:{label:'언더',color:'#7fb8e6'},weak:{label:'위크',color:'#e6c84a'}};

// Original index.html:9633
wbdContext.COUNT_RE = {
  // V10.2: WBD 266경기 실측 run expectancy (0-0 기준 zero-center, 타자 관점).
  //   기존 "MLB 표준 + 1.7배 강화" 제거 — 인플레이 격자(WBD 실측)와 동일 스케일로 통일.
  '0-0': +0.000,    '0-1': -0.022,   '0-2': -0.270,
  '1-0': +0.004,   '1-1': +0.013,   '1-2': -0.263,
  '2-0': +0.013,   '2-1': -0.025,   '2-2': -0.245,
  '3-0': +0.091,   '3-1': +0.034,   '3-2': -0.181,
  // 종료 상태 (WBD 실측, 타자 관점 — 투수 PV는 _crvOfPitch에서 부호반전)
  'K':   -0.508,
  'BB':  +0.162,
  '1B':  +0.332,
  'HR':  +1.262,
  'HBP': +0.182,
  'OUT': -0.408
};

// Original index.html:9730
wbdContext.XBA_GRID = {
  55:  [-0.124,-0.050,-0.134,+0.028,-0.091,+0.029,+0.007,-0.122,-0.137,-0.092,-0.217,-0.270,-0.270],
  60:  [-0.073,-0.052,-0.081,-0.085,-0.006,-0.094,+0.004,-0.173,-0.200,-0.270,-0.210,-0.270,-0.270],
  65:  [-0.188,-0.224,-0.163,-0.113,-0.154,-0.068,-0.141,-0.134,-0.164,-0.270,-0.203,-0.262,-0.270],
  70:  [-0.217,-0.141,-0.108,-0.059,-0.164,-0.152,-0.203,-0.085,+0.004,-0.192,-0.217,-0.270,-0.270],
  75:  [-0.091,-0.068,-0.135,-0.075,-0.077,-0.066,-0.120,+0.147,-0.064,-0.122,-0.232,-0.229,-0.270],
  80:  [-0.142,-0.082,-0.118,-0.051,-0.092,-0.041,+0.037,+0.167,+0.040,-0.097,-0.204,-0.201,-0.270],
  85:  [-0.124,-0.131,-0.146,-0.049,-0.079,-0.051,+0.128,+0.044,+0.029,-0.034,-0.152,-0.270,-0.270],
  90:  [-0.138,-0.040,-0.059,-0.042,+0.007,+0.009,+0.194,+0.012,-0.017,-0.046,-0.182,-0.199,-0.270],
  95:  [-0.145,-0.023,-0.071,+0.030,+0.007,+0.094,+0.158,-0.066,-0.121,-0.141,-0.216,-0.270,-0.270],
  100:  [-0.134,-0.103,-0.067,-0.056,-0.003,+0.041,+0.164,-0.066,-0.148,-0.190,-0.218,-0.206,-0.270],
  105:  [-0.160,+0.035,-0.014,+0.012,+0.066,+0.038,+0.184,+0.028,-0.081,-0.164,-0.188,-0.262,-0.270],
  110:  [-0.082,-0.006,+0.005,+0.054,+0.034,+0.079,+0.248,+0.152,+0.006,-0.106,-0.270,-0.267,-0.270],
  115:  [+0.013,+0.031,+0.003,+0.094,+0.111,+0.123,+0.289,+0.342,+0.286,+0.203,-0.270,-0.269,-0.270],
  120:  [-0.178,+0.082,+0.092,+0.103,+0.154,+0.167,+0.521,+0.611,+0.510,+0.511,-0.208,-0.257,-0.270],
  125:  [+0.125,+0.118,+0.134,+0.113,+0.128,+0.199,+0.560,+0.889,+0.840,+0.672,+0.119,-0.252,-0.270],
  130:  [+0.125,+0.128,+0.120,+0.112,+0.152,+0.187,+0.682,+0.966,+0.966,+0.775,+0.113,-0.248,-0.270],
  135:  [+0.259,+0.121,+0.117,+0.124,+0.145,+0.353,+0.790,+0.799,+0.959,+0.849,+0.242,-0.251,-0.270],
  140:  [-0.270,-0.023,-0.011,+0.047,+0.075,+0.166,+0.439,+0.619,+0.602,+1.400,-0.270,-0.270,-0.270],
  145:  [-0.270,-0.085,-0.085,-0.052,-0.023,+0.091,+0.255,+0.313,+0.255,-0.270,-0.270,-0.270,-0.270]
};

// Original index.html:9840
wbdContext._LEAGUE_XPV_PER_PITCH_CACHE = null;
wbdContext._LEAGUE_XPV_KEY = '';

// Original index.html:9874
wbdContext._PPOW_TO_KMH = [0.0,49.4,56.0,60.2,63.4,66.0,68.2,70.1,71.8,73.4,74.8,76.1,77.3,78.4,79.4,80.4,81.4,82.3,83.1,83.9,84.7,85.5,86.2,86.9,87.5,88.2,88.8,89.4,90.0,90.8,91.5,92.3,93.1,93.8,94.6,95.4,96.2,96.9,97.7,98.5,99.2,100.0,100.8,101.5,102.3,103.1,103.8,104.6,105.4,106.2,106.9,107.7,108.5,109.2,110.0,110.8,111.5,112.3,113.1,113.8,114.6,115.4,116.2,116.9,117.7,118.5,119.2,120.0,120.8,121.5,122.3,123.1,123.8,124.6,125.4,126.2,126.9,127.7,128.5,129.2,130.0,131.5,133.0,134.5,136.0,137.5,139.0,140.5,142.0,143.5,145.0,146.5,148.0,149.5,151.0,152.5,154.0,155.5,157.0,158.5,160.0];

// Original index.html:9897
wbdContext._statsCache = {pitcher:{}, batter:{}, _gameKey:''};

// Original index.html:9937
wbdContext._LG_AVG_CACHE = null;
wbdContext._LG_AVG_KEY = '';
}
