/** scout-data: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:17451
wbdContext._scoutZoneStats = function _scoutZoneStats(all){
  const zoneStats = Array(9).fill(0).map(() => ({n:0, ab:0, hits:0, hard:0, whiff:0, swing:0, brl:0, hr:0, batted:0}));
  all.forEach(d => {
    const zx = +d.zoneX, zy = +d.zoneY;
    if(zx<-1||zx>1||zy<-1||zy>1) return;
    const ci = zx<-0.33?0:zx<0.33?1:2;
    const ri = zy>0.33?0:zy>-0.33?1:2;
    const i = ri*3 + ci, z = zoneStats[i];
    z.n++;
    if(wbdContext._isHit(d)) z.hits++;              // 기록실과 동일 (낫아웃·야수선택 제외)
    if(+d.result===4) z.hr++;
    if(wbdContext._isABPitch(d)) z.ab++;            // 표준 AB
    if(wbdContext._isInPlay(d)){
      z.batted++;
      if(wbdContext._isHardHit(d)) z.hard++;           // 하드힛 표준 110
      if(wbdContext._isBarrel(d)) z.brl++;
    }
    if(d.bSwing){ z.swing++; if(+d.call!==2) z.whiff++; }
  });
  return zoneStats;
};

// Original index.html:17472
wbdContext._scoutCollectPitcher = function _scoutCollectPitcher(name){ return wbdContext._memoByGame('_scoutCollectPitcher', name, ()=>wbdContext._scoutCollectPitcher__raw(name)); };

// Original index.html:17473
wbdContext._scoutCollectPitcher__raw = function _scoutCollectPitcher__raw(name){
  const all = wbdContext.getPitcherDataByName(name);  // V10.2 perf: 잔존 풀스캔 교체
  if(!all.length) return null;
  
  const card = wbdContext.calcPitcherCard(name);
  if(!card) return null;
  
  // ─── 좌우/카운트 분류 ───
  const vsL = all.filter(d => String(d.bZone).toUpperCase() === 'L');
  const vsR = all.filter(d => String(d.bZone).toUpperCase() === 'R');
  const adv = all.filter(d => +d.ball < +d.strk);
  const even = all.filter(d => +d.ball === +d.strk);
  const dis = all.filter(d => +d.ball > +d.strk);
  
  // ─── 구종별 풀 분석 ───
  const byGroup = {};
  all.forEach(d => {
    const g = wbdContext.pitchGroup(d.pType, d);
    if(!g || g === '기타') return;
    if(!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(d);
  });
  
  // ─── 카운트별 구종 ───
  const twoStrike = all.filter(d => +d.strk === 2 && +d.ball < 3);
  const twoStrikeByGroup = {};
  twoStrike.forEach(d => {
    const g = wbdContext.pitchGroup(d.pType, d);
    if(!g || g === '기타') return;
    twoStrikeByGroup[g] = (twoStrikeByGroup[g] || 0) + 1;
  });
  
  const firstPitch = all.filter(d => +d.ball === 0 && +d.strk === 0);
  const firstPitchByGroup = {};
  firstPitch.forEach(d => {
    const g = wbdContext.pitchGroup(d.pType, d);
    if(!g || g === '기타') return;
    firstPitchByGroup[g] = (firstPitchByGroup[g] || 0) + 1;
  });
  
  // ─── 9분할 존 (공용 집계 — 기록실과 동일 안타/AB 정의) ───
  const zoneStats = wbdContext._scoutZoneStats(all);

  // ─── 존 활용 ───
  const zoneUsage = {high:0, mid:0, low:0, in:0, out:0, center:0, inZone:0, outZone:0};
  all.forEach(d => {
    const zx = +d.zoneX, zy = +d.zoneY;
    if(isNaN(zx) || isNaN(zy)) return;
    if(zx>=-1 && zx<=1 && zy>=-1 && zy<=1) zoneUsage.inZone++;
    else zoneUsage.outZone++;
    if(zx>=-1 && zx<=1 && zy>=-1 && zy<=1){
      if(zy > 0.33) zoneUsage.high++;
      else if(zy < -0.33) zoneUsage.low++;
      else zoneUsage.mid++;
      if(Math.abs(zx) < 0.33 && Math.abs(zy) < 0.33) zoneUsage.center++;
    }
  });
  
  // 실투 (가운데 칸)
  const midPitches = all.filter(d => {
    const zx=+d.zoneX, zy=+d.zoneY;
    return zx>=-0.33 && zx<=0.33 && zy>=-0.33 && zy<=0.33;
  });
  const midHits = midPitches.filter(wbdContext._isHit).length;
  const midHardHit = midPitches.filter(d => +d.ev >= 105).length;
  
  // V9.7 추가: 살짝 몰림 (실투 바로 옆 영역 - 위험한 중앙 근처)
  //   가운데 ±0.33 ~ ±0.6 영역 (실투 다음으로 치기 좋음)
  const slightPitches = all.filter(d => {
    const zx = +d.zoneX, zy = +d.zoneY;
    if(zx == null || zy == null || isNaN(zx) || isNaN(zy)) return false;
    const ax = Math.abs(zx), ay = Math.abs(zy);
    const rmax = Math.max(ax, ay);
    // 실투(rmax<=0.33)는 제외, 살짝(0.33<rmax<=0.6)만
    return rmax > 0.33 && rmax <= 0.6;
  });
  
  // ─── 카운트 잡기 능력 ───
  const firstPitchStrike = firstPitch.filter(d => +d.call === 0 || +d.call === 2 || (d.bSwing && +d.call !== 2) || d.bSwing).length;
  
  // ─── 전체 결과 통계 ───
  const bb = all.filter(d => +d.result === 5).length;
  const hbp = all.filter(d => +d.result === 6).length;
  const k = all.filter(d => wbdContext._isK(d) && (+d.result === 0 || +d.result === 1)).length;
  
  // ─── 경기별 변동성 (실제 안정성) ───
  // 게임별 피OPS/BAA 표편으로 측정
  const gameMap = {};
  all.forEach(d => {
    if(!gameMap[d._gameId]) gameMap[d._gameId] = [];
    gameMap[d._gameId].push(d);
  });
  const gameStats = Object.entries(gameMap).map(([gid, arr]) => {
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {
      const r=+d.result; return wbdContext._isABPitch(d);
    }).length;
    const ba = ab>0 ? hits/ab : null;
    const bd = arr.filter(wbdContext._isInPlay);
    const avgEV = bd.length>0 ? bd.reduce((s,d)=>s+(+d.ev),0)/bd.length : null;
    return {gid, n:arr.length, ba, avgEV, hits, ab, hr:arr.filter(d=>+d.result===4).length};
  }).filter(g => g.ab >= 3);  // 최소 3 AB
  
  let gameVariability = null, badGames = 0, goodGames = 0;
  if(gameStats.length >= 3){
    const bas = gameStats.map(g => g.ba).filter(v => v!=null);
    const mean = bas.reduce((s,v)=>s+v,0)/bas.length;
    const variance = bas.reduce((s,v)=>s+Math.pow(v-mean,2),0)/bas.length;
    gameVariability = Math.sqrt(variance);  // 기복 지표는 BA σ 유지 (등판 간 일관성)
    // V10.2: 호투/망경기를 피안타율 → 게임별 실점 효율(RA9) 기반으로 교체.
    // 안타를 산발로 막으면 호투, 적게 맞아도 몰아서 실점하면 망경기 — pWAR(실점 기반)과 철학 일관.
    // 기준: 리그 RA9의 절반 이하 = 호투, 1.8배 이상 = 망경기. 최소 2이닝(6아웃) 등판만 판정.
    let lgRA9Ref = 5.6;
    try {
      const _lg = (window._recordsCache && window._recordsCache.lg) || wbdContext._computeRecordsData().lg;
      if(_lg && _lg.lgRA9 > 0) lgRA9Ref = _lg.lgRA9;
    } catch(e){}
    gameStats.forEach(g => {
      g.ra9 = null;
      try {
        const gs = wbdContext._getCachedPitcherStats(g.gid);
        const s = gs && gs[name];
        if(s && s.outs >= 6) g.ra9 = s.runs/(s.outs/3)*9;
      } catch(e){}
    });
    badGames = gameStats.filter(g => g.ra9!=null && g.ra9 >= lgRA9Ref*1.8).length;  // 망한 경기 (대량 실점)
    goodGames = gameStats.filter(g => g.ra9!=null && g.ra9 <= lgRA9Ref*0.5).length; // 호투 (실점 억제)
  }
  
  // ─── 헬퍼: subStat 계산 ───
  const calcSubStat = (arr) => {
    const bd = arr.filter(wbdContext._isInPlay);
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {
      const r = +d.result;
      const isHit = +d['1BSafe']===1 || r===4;
      const isK = (wbdContext._isK(d));
      return isHit || r===1 || r===2 || isK;
    }).length;
    const swings = arr.filter(d => d.bSwing).length;
    const whiffs = arr.filter(d => (d.bSwing && +d.call !== 2)).length;
    const hr = arr.filter(d => +d.result === 4).length;
    const hard = bd.filter(d => +d.ev >= 105).length;
    // PV/xPV/xPV+ (구종 가치) — CRV 정밀 계산
    const pv = wbdContext._pvSum(arr);
    const xpv = wbdContext._xPvSum(arr);
    const xpvPlus = wbdContext._xPvPlusSum(arr);
    const pv100 = arr.length > 0 ? pv / arr.length * 100 : 0;
    const xpv100 = arr.length > 0 ? xpv / arr.length * 100 : 0;
    const pvDiff = pv - xpv;
    const pvDiff100 = arr.length > 0 ? pvDiff / arr.length * 100 : 0;
    return {
      n: arr.length, ba: ab>0 ? hits/ab : 0, ab, hits,
      whiffPct: swings>0 ? whiffs/swings*100 : 0, swings, hr,
      avgEV: bd.length>0 ? bd.reduce((s,d)=>s+(+d.ev),0)/bd.length : 0,
      hardPct: bd.length>0 ? hard/bd.length*100 : 0,
      pv, xpv, xpvPlus, pv100, xpv100, pvDiff, pvDiff100
    };
  };
  
  // ─── 구종별 상세 분석 ───
  const groupDetails = {};
  Object.entries(byGroup).forEach(([g, arr]) => {
    if(arr.length < 5) return;
    const subStat = calcSubStat(arr);
    const spds = arr.filter(d => d.spdK>0).map(d => +d.spdK);
    const sH = arr.filter(d => d.sH!=null).map(d => Math.abs(+d.sH));
    const sV = arr.filter(d => d.sV!=null).map(d => Math.abs(+d.sV));
    const gy = arr.filter(d=>d.gyro!=null && +d.gyro!==0).map(d=>Math.abs(+d.gyro));
    // 구속 변동성 (구속 표편)
    const spdMean = spds.length>0 ? spds.reduce((s,v)=>s+v,0)/spds.length : 0;
    const spdStd = spds.length>1 ? Math.sqrt(spds.reduce((s,v)=>s+Math.pow(v-spdMean,2),0)/spds.length) : 0;
    // 존 활용
    const inZ = arr.filter(d => {
      const zx=+d.zoneX, zy=+d.zoneY;
      return zx>=-1 && zx<=1 && zy>=-1 && zy<=1;
    }).length;
    const outZ = arr.length - inZ;
    const outZSwing = arr.filter(d => {
      const zx=+d.zoneX, zy=+d.zoneY;
      return !(zx>=-1 && zx<=1 && zy>=-1 && zy<=1) && d.bSwing;
    }).length;
    const midCnt = arr.filter(d => {
      const zx=+d.zoneX, zy=+d.zoneY;
      return zx>=-0.33 && zx<=0.33 && zy>=-0.33 && zy<=0.33;
    }).length;
    // 좌우별 사용
    const vsLcnt = arr.filter(d => String(d.bZone).toUpperCase() === 'L').length;
    const vsRcnt = arr.filter(d => String(d.bZone).toUpperCase() === 'R').length;
    
    // 좌우별 결과 (vsL 결과, vsR 결과)
    const vsLArr = arr.filter(d => String(d.bZone).toUpperCase() === 'L');
    const vsRArr = arr.filter(d => String(d.bZone).toUpperCase() === 'R');
    const vsLStat = calcSubStat(vsLArr);
    const vsRStat = calcSubStat(vsRArr);
    
    // 코스 분석 (9분할별 위치 + 좌우별)
    // zoneX: 투수 시점(+ = 오른쪽 = 우타 몸쪽, 좌타 바깥). 투수 손잡이와 무관 — 타자 손잡이만으로 몸쪽/바깥 결정.
    // V12.0: coursePos도 투구별 타자 손잡이 기준(_atkLoc)으로 집계 (이전엔 우타 기준 절대 좌/우)
    
    // 9분할 위치 분포
    const coursePos = {
      highOut: 0, highMid: 0, highIn: 0,  // 위 좌/중/우
      midOut: 0, midMid: 0, midIn: 0,
      lowOut: 0, lowMid: 0, lowIn: 0,
      outZone: 0
    };
    // 좌타 상대 코스
    const vsLCourse = {high:0, mid:0, low:0, inn:0, out:0, midZone:0, outZone:0};
    const vsRCourse = {high:0, mid:0, low:0, inn:0, out:0, midZone:0, outZone:0};
    
    arr.forEach(d => {
      const zx = +d.zoneX, zy = +d.zoneY;
      if(isNaN(zx) || isNaN(zy)) return;
      // 인존인가?
      if(zx>=-1 && zx<=1 && zy>=-1 && zy<=1){
        // 9분할 위치 — 타자 손잡이 기준 몸쪽/바깥 (_atkLoc)
        const L9 = wbdContext._atkLoc(d);
        const ci = L9.col==='바깥'?0:L9.col==='가운데'?1:2;  // 0=바깥, 1=중, 2=몸쪽
        const ri = zy>0.33?0:zy>-0.33?1:2;  // 0=위, 1=중, 2=아래
        const labels = [['highOut','highMid','highIn'],['midOut','midMid','midIn'],['lowOut','lowMid','lowIn']];
        coursePos[labels[ri][ci]]++;
        
        // 좌우 타자별
        const bz = String(d.bZone).toUpperCase();
        const target = bz === 'L' ? vsLCourse : bz === 'R' ? vsRCourse : null;
        if(target){
          if(zy > 0.33) target.high++;
          else if(zy < -0.33) target.low++;
          else target.mid++;
          // 몸쪽/바깥쪽 (zoneX>0 = 우측, 우타 기준 몸쪽)
          if(bz === 'R'){
            if(zx > 0.33) target.inn++;
            else if(zx < -0.33) target.out++;
            else target.midZone++;
          } else {  // 좌타: zoneX<0 = 몸쪽
            if(zx < -0.33) target.inn++;
            else if(zx > 0.33) target.out++;
            else target.midZone++;
          }
        }
      } else {
        coursePos.outZone++;
        const bz = String(d.bZone).toUpperCase();
        if(bz === 'L') vsLCourse.outZone++;
        else if(bz === 'R') vsRCourse.outZone++;
      }
    });
    
    // 좌타 상대 헛스윙
    const vsLSwings = vsLArr.filter(d => d.bSwing).length;
    const vsLWhiffs = vsLArr.filter(d => (d.bSwing && +d.call !== 2)).length;
    const vsRSwings = vsRArr.filter(d => d.bSwing).length;
    const vsRWhiffs = vsRArr.filter(d => (d.bSwing && +d.call !== 2)).length;
    
    groupDetails[g] = {
      n: arr.length,
      usagePct: arr.length / all.length * 100,
      avgSpd: spdMean,
      spdStd: spdStd,  // 구속 일관성
      avgSH: sH.length ? sH.reduce((s,v)=>s+v,0)/sH.length : 0,
      avgSV: sV.length ? sV.reduce((s,v)=>s+v,0)/sV.length : 0,
      avgMov: sH.length && sV.length ? ((sH.reduce((s,v)=>s+v,0)/sH.length)+(sV.reduce((s,v)=>s+v,0)/sV.length))/2 : 0,
      avgGyro: gy.length ? gy.reduce((s,v)=>s+v,0)/gy.length : 0,
      inZonePct: arr.length>0 ? inZ/arr.length*100 : 0,
      chaseRate: outZ>0 ? outZSwing/outZ*100 : 0,
      midPct: arr.length>0 ? midCnt/arr.length*100 : 0,
      vsLPct: arr.length>0 ? vsLcnt/arr.length*100 : 0,
      vsRPct: arr.length>0 ? vsRcnt/arr.length*100 : 0,
      // 좌우별 디테일
      vsL: {...vsLStat, n: vsLArr.length, swings: vsLSwings, whiffs: vsLWhiffs, whiffPct: vsLSwings>0?vsLWhiffs/vsLSwings*100:0, course: vsLCourse},
      vsR: {...vsRStat, n: vsRArr.length, swings: vsRSwings, whiffs: vsRWhiffs, whiffPct: vsRSwings>0?vsRWhiffs/vsRSwings*100:0, course: vsRCourse},
      // 9분할 위치 분포
      coursePos,
      ...subStat
    };
  });
  
  // ─── 카운트 진행 패턴 ───
  // 0-0 → 1-0/0-1 비율
  const after00 = firstPitch;
  const after00Strike = firstPitchStrike;
  // 1-0 다음 ball or strike
  const oneZero = all.filter(d => +d.ball === 1 && +d.strk === 0);
  const oneZeroStrike = oneZero.filter(d => +d.call === 0 || +d.call === 2 || d.bSwing).length;
  
  return {
    name, card,
    pHand: all[0]?.pHand,
    total: all.length,
    games: new Set(all.map(d => d._gameId)).size,
    byGroup, twoStrikeByGroup, firstPitchByGroup, groupDetails,
    splits: {
      vsL: {...calcSubStat(vsL), n:vsL.length},
      vsR: {...calcSubStat(vsR), n:vsR.length},
      adv: calcSubStat(adv),
      even: calcSubStat(even),
      dis: calcSubStat(dis)
    },
    zoneStats, zoneUsage,
    firstPitchStrikePct: firstPitch.length>0 ? firstPitchStrike/firstPitch.length*100 : 0,
    firstPitchN: firstPitch.length,
    oneZeroStrikePct: oneZero.length>0 ? oneZeroStrike/oneZero.length*100 : 0,
    oneZeroN: oneZero.length,
    midPitchPct: all.length>0 ? midPitches.length/all.length*100 : 0,
    midHitRate: midPitches.length>0 ? midHits/midPitches.length*100 : 0,
    midHardHitRate: midPitches.length>0 ? midHardHit/midPitches.length*100 : 0,
    midN: midPitches.length,
    // V9.7 신규: 살짝 몰림 비율
    slightPct: all.length>0 ? slightPitches.length/all.length*100 : 0,
    slightN: slightPitches.length,
    bb, hbp, k,
    bbPct: all.length>0 ? bb/all.length*100 : 0,
    // 실제 안정성: 게임별 BAA 표편
    gameStats,
    gameVariability,
    badGames, goodGames,
    // 결과 통계
    overall: calcSubStat(all)
  };
};

// Original index.html:17797
wbdContext._grpSplitStat = function _grpSplitStat(arr, isLefty){
  const swings = arr.filter(d => d.bSwing).length;
  const whiffs = arr.filter(d => (d.bSwing && +d.call !== 2)).length;
  // V12: 기록실과 동일 정의 (_isHit / _isABPitch)
  const hits = arr.filter(wbdContext._isHit).length;
  const ab = arr.filter(wbdContext._isABPitch).length;
  const hr = arr.filter(d => +d.result===4).length;
  const cnt = (fn) => arr.filter(fn).length;
  const course = {
    inn: cnt(d => isLefty ? +d.zoneX < -0.33 : +d.zoneX > 0.33),
    out: cnt(d => isLefty ? +d.zoneX > 0.33 : +d.zoneX < -0.33),
    high: cnt(d => +d.zoneY > 0.33),
    low: cnt(d => +d.zoneY < -0.33),
    mid: cnt(d => +d.zoneY >= -0.33 && +d.zoneY <= 0.33),
    midZone: cnt(d => +d.zoneX >= -0.33 && +d.zoneX <= 0.33 && +d.zoneY >= -0.33 && +d.zoneY <= 0.33)
  };
  return {
    n: arr.length,
    ba: ab>0 ? hits/ab : null,
    ab, hits, hr,
    swings, whiffs,
    whiffPct: swings>0 ? whiffs/swings*100 : 0,
    course
  };
};

// Original index.html:17823
wbdContext._scoutCollectBatter = function _scoutCollectBatter(name){ return wbdContext._memoByGame('_scoutCollectBatter', name, ()=>wbdContext._scoutCollectBatter__raw(name)); };

// Original index.html:17824
wbdContext._scoutCollectBatter__raw = function _scoutCollectBatter__raw(name){
  const all = wbdContext.getBatterDataByName(name);
  if(!all.length) return null;
  
  const card = wbdContext.calcBatterCard(name);
  if(!card) return null;
  
  const vsL = all.filter(d => String(d.pHand).toUpperCase() === 'L');
  const vsR = all.filter(d => String(d.pHand).toUpperCase() === 'R');
  
  const adv = all.filter(d => +d.ball > +d.strk);
  const even = all.filter(d => +d.ball === +d.strk);
  const dis = all.filter(d => +d.ball < +d.strk);
  
  const byGroupVs = {};
  all.forEach(d => {
    const g = wbdContext.pitchGroup(d.pType, d);
    if(!g || g === '기타') return;
    if(!byGroupVs[g]) byGroupVs[g] = [];
    byGroupVs[g].push(d);
  });
  
  // 9-grid (공용 집계 — 기록실과 동일 안타/AB 정의)
  const zoneStats = wbdContext._scoutZoneStats(all);

  // 체이스 / 컨택
  const inZone = all.filter(d => {
    const zx=+d.zoneX, zy=+d.zoneY;
    return zx>=-1 && zx<=1 && zy>=-1 && zy<=1;
  });
  const outZone = all.filter(d => {
    const zx=+d.zoneX, zy=+d.zoneY;
    return !(zx>=-1 && zx<=1 && zy>=-1 && zy<=1);
  });
  const chase = outZone.filter(d => d.bSwing).length / Math.max(1,outZone.length) * 100;
  const inZoneSwingPct = inZone.length>0 ? inZone.filter(d=>d.bSwing).length/inZone.length*100 : 0;
  
  // 위치별 (높낮이 / 안팎)
  const highSwings = all.filter(d => +d.zoneY > 0.33 && d.bSwing);
  const lowSwings = all.filter(d => +d.zoneY < -0.33 && d.bSwing);
  const highHits = highSwings.filter(wbdContext._isHit).length;  // V12: 기록실과 동일 안타 정의
  const lowHits = lowSwings.filter(wbdContext._isHit).length;
  const highWhiffs = highSwings.filter(d => +d.call !== 2).length;
  const lowWhiffs = lowSwings.filter(d => +d.call !== 2).length;
  
  // 초구 적극성
  const firstPitch = all.filter(d => +d.ball === 0 && +d.strk === 0);
  const firstPitchSwing = firstPitch.filter(d => d.bSwing).length;
  
  // 2스트라이크에서
  const twoStrike = all.filter(d => +d.strk === 2);
  const twoStrikeWhiff = twoStrike.filter(d => (d.bSwing && +d.call !== 2)).length;
  const twoStrikeSwing = twoStrike.filter(d => d.bSwing).length;
  
  const calcSubStat = (arr) => {
    const bd = arr.filter(wbdContext._isInPlay);
    // V12: 기록실과 동일 정의로 통일 — 안타는 _isHit(낫아웃·야수선택 제외), AB는 _isABPitch
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(wbdContext._isABPitch).length;
    const swings = arr.filter(d => d.bSwing).length;
    const whiffs = arr.filter(d => (d.bSwing && +d.call !== 2)).length;
    const hr = arr.filter(d => +d.result === 4).length;
    const hardHit = bd.filter(d => wbdContext._isHardHit(d)).length;
    return {
      n: arr.length,
      ba: ab>0 ? hits/ab : 0,
      ab,
      hits,
      whiffPct: swings>0 ? whiffs/swings*100 : 0,
      swings,
      hr,
      avgEV: bd.length>0 ? bd.reduce((s,d)=>s+(+d.ev),0)/bd.length : 0,
      hhPct: bd.length>0 ? hardHit/bd.length*100 : 0
    };
  };
  
  // 구종별 상세 - 코스별 디테일 추가
  const groupDetails = {};
  Object.entries(byGroupVs).forEach(([g, arr]) => {
    if(arr.length < 5) return;
    const ss = calcSubStat(arr);
    
    // V10.0: 구종별 좌투/우투 분리 — 스플릿 리포트(좌투/우투 상대 공략)용
    const grpVsL = arr.filter(d => String(d.pHand).toUpperCase() === 'L');
    const grpVsR = arr.filter(d => String(d.pHand).toUpperCase() === 'R');
    
    // 코스별 분류 (몸쪽/바깥쪽 - 좌타는 반대로 처리)
    const isLefty = all[0]?.bZone === 'L';
    // 우타 기준: zoneX > 0.33 = 몸쪽, zoneX < -0.33 = 바깥쪽
    // 좌타 기준: 반대
    const innerPitches = arr.filter(d => {
      const zx = +d.zoneX;
      return isLefty ? zx < -0.33 : zx > 0.33;
    });
    const outerPitches = arr.filter(d => {
      const zx = +d.zoneX;
      return isLefty ? zx > 0.33 : zx < -0.33;
    });
    const middleH = arr.filter(d => {
      const zx = +d.zoneX;
      return zx >= -0.33 && zx <= 0.33;
    });
    
    // 높낮이
    const highPitches = arr.filter(d => +d.zoneY > 0.33);
    const lowPitches = arr.filter(d => +d.zoneY < -0.33);
    const middleV = arr.filter(d => +d.zoneY >= -0.33 && +d.zoneY <= 0.33);
    
    // 인존/아웃존
    const inZone = arr.filter(d => {
      const zx=+d.zoneX, zy=+d.zoneY;
      return zx>=-1 && zx<=1 && zy>=-1 && zy<=1;
    });
    const outZone = arr.filter(d => {
      const zx=+d.zoneX, zy=+d.zoneY;
      return !(zx>=-1 && zx<=1 && zy>=-1 && zy<=1);
    });
    
    // 코스별 스윙/컨택/안타
    const courseStat = (subArr) => {
      const sw = subArr.filter(d => d.bSwing).length;
      const wh = subArr.filter(d => (d.bSwing && +d.call !== 2)).length;
      const hits = subArr.filter(wbdContext._isHit).length;
      // AB = 안타 + 인플레이아웃(1,2) + K (sabermetrics 표준, K 자동 포함)
      const ab = subArr.filter(d => {
        const r=+d.result; return wbdContext._isABPitch(d);
      }).length;
      const bd = subArr.filter(wbdContext._isInPlay);
      const avgEV = bd.length>0 ? bd.reduce((s,d)=>s+(+d.ev),0)/bd.length : 0;
      return {
        n: subArr.length,
        swing: sw,
        swingPct: subArr.length>0 ? sw/subArr.length*100 : 0,
        whiff: wh,
        whiffPct: sw>0 ? wh/sw*100 : 0,
        hits, ab,
        ba: ab>0 ? hits/ab : null,
        avgEV
      };
    };
    
    groupDetails[g] = {
      n: arr.length,
      vsPct: arr.length / all.length * 100,
      ...ss,
      // 코스별 디테일
      inner: courseStat(innerPitches),
      outer: courseStat(outerPitches),
      middleH: courseStat(middleH),
      high: courseStat(highPitches),
      low: courseStat(lowPitches),
      middleV: courseStat(middleV),
      inZone: courseStat(inZone),
      outZone: courseStat(outZone),
      // V10.0: 좌투/우투별 서브 데이터 (스플릿 리포트용)
      vsL: wbdContext._grpSplitStat(grpVsL, isLefty),
      vsR: wbdContext._grpSplitStat(grpVsR, isLefty)
    };
  });
  
  // ─── 코스별 종합 (모든 구종) ───
  const isLefty = all[0]?.bZone === 'L';
  const courseStat = (subArr) => {
    const sw = subArr.filter(d => d.bSwing).length;
    const wh = subArr.filter(d => (d.bSwing && +d.call !== 2)).length;
    const hits = subArr.filter(wbdContext._isHit).length;
    // AB = 안타 + 인플레이아웃(1,2) + K (sabermetrics 표준, K 자동 포함)
    const ab = subArr.filter(d => {
      const r=+d.result; return wbdContext._isABPitch(d);
    }).length;
    const bd = subArr.filter(wbdContext._isInPlay);
    const hard = bd.filter(d => wbdContext._isHardHit(d)).length;
    return {
      n: subArr.length,
      swingPct: subArr.length>0 ? sw/subArr.length*100 : 0,
      whiff: wh,
      whiffPct: sw>0 ? wh/sw*100 : 0,
      hits, ab,
      ba: ab>0 ? hits/ab : null,
      avgEV: bd.length>0 ? bd.reduce((s,d)=>s+(+d.ev),0)/bd.length : 0,
      hardPct: bd.length>0 ? hard/bd.length*100 : 0,
      hr: subArr.filter(d => +d.result===4).length
    };
  };
  
  const inner = all.filter(d => {
    const zx = +d.zoneX;
    return isLefty ? zx < -0.33 : zx > 0.33;
  });
  const outer = all.filter(d => {
    const zx = +d.zoneX;
    return isLefty ? zx > 0.33 : zx < -0.33;
  });
  const courseAll = {
    inner: courseStat(inner),
    outer: courseStat(outer),
    high: courseStat(all.filter(d => +d.zoneY > 0.33)),
    low: courseStat(all.filter(d => +d.zoneY < -0.33)),
    middle: courseStat(all.filter(d => {
      const zx=+d.zoneX, zy=+d.zoneY;
      return zx>=-0.33 && zx<=0.33 && zy>=-0.33 && zy<=0.33;
    }))
  };
  
  return {
    name, card,
    bZone: all[0]?.bZone,
    isLefty,
    total: all.length,
    PA: wbdContext._countPaEnd(all).length,  // V10.0: 정확한 타석 수
    AB: wbdContext._countPaEnd(all).filter(d => +d.result!==5 && +d.result!==6).length,  // 타수 (BB/HBP 제외)
    games: new Set(all.map(d => d._gameId)).size,
    byGroupVs, groupDetails,
    splits: {
      vsL: {...calcSubStat(vsL), n:vsL.length},
      vsR: {...calcSubStat(vsR), n:vsR.length},
      adv: calcSubStat(adv),
      even: calcSubStat(even),
      dis: calcSubStat(dis)
    },
    zoneStats,
    chasePct: chase,
    chaseN: outZone.length,
    inZoneSwingPct,
    firstPitchSwingPct: firstPitch.length>0 ? firstPitchSwing/firstPitch.length*100 : 0,
    firstPitchN: firstPitch.length,
    twoStrikeWhiffPct: twoStrikeSwing>0 ? twoStrikeWhiff/twoStrikeSwing*100 : 0,
    twoStrikeN: twoStrike.length,
    high: {n:highSwings.length, hits:highHits, whiffs:highWhiffs, hitRate:highSwings.length?highHits/highSwings.length*100:0, whiffRate:highSwings.length?highWhiffs/highSwings.length*100:0},
    low: {n:lowSwings.length, hits:lowHits, whiffs:lowWhiffs, hitRate:lowSwings.length?lowHits/lowSwings.length*100:0, whiffRate:lowSwings.length?lowWhiffs/lowSwings.length*100:0},
    // 새로 추가: 코스별 종합
    courseAll
  };
};

// Original index.html:18063
wbdContext._scoutLeagueAvgs = function _scoutLeagueAvgs(){
  const cache = window._scoutLeagueCache;
  if(cache && cache._t === wbdContext.G.length) return cache;
  // 투수별
  const pitcherNames = window._cache.pitcherNames || [];
  const batterNames = window._cache.batterNames || [];
  const pBA=[], pWhiff=[], pERA=[], pHRpct=[];
  pitcherNames.forEach(n => {
    const c = wbdContext.calcPitcherCard(n);
    if(!c || c.lowData) return;
    const arr = wbdContext.getPitcherDataByName(n);
    if(arr.length<20) return;
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(wbdContext._isABPitch).length;   // V12.0: 표준 AB 정의로 통일
    if(ab>10) pBA.push(hits/ab);
    const sw = arr.filter(d=>d.bSwing).length;
    const wh = arr.filter(d=>(d.bSwing && +d.call!==2)).length;
    if(sw>10) pWhiff.push(wh/sw*100);
  });
  const bBA=[], bWhiff=[], bHH=[];
  batterNames.forEach(n => {
    const c = wbdContext.calcBatterCard(n);
    if(!c || c.lowData) return;
    const arr = wbdContext.getBatterDataByName(n);
    if(arr.length<20) return;
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(wbdContext._isABPitch).length;   // V12.0: 표준 AB 정의로 통일
    if(ab>10) bBA.push(hits/ab);
    const bd = arr.filter(wbdContext._isInPlay);
    if(bd.length>5){
      const hh=bd.filter(d=>wbdContext._isHardHit(d)).length;
      bHH.push(hh/bd.length*100);
    }
  });
  // 구종별 리그 평균 (구속, 무브먼트)
  const groupStats = {};
  // V10.2: 투수별 구종 평균무브 수집 (선수평가 백분위가 랭킹과 같은 모수를 쓰도록)
  const _movByPitcher = {};  // {group: {pName: {sum, n}}}
  wbdContext.G.forEach(d => {
    if(d.pName!=null && d.pType!=null && d.sH!=null && d.sV!=null){
      const _g=wbdContext.pitchGroup(d.pType,d);
      if(_g && _g!=='기타'){
        if(!_movByPitcher[_g]) _movByPitcher[_g]={};
        if(!_movByPitcher[_g][d.pName]) _movByPitcher[_g][d.pName]={sum:0,n:0};
        _movByPitcher[_g][d.pName].sum += Math.abs(+d.sH)+Math.abs(+d.sV);
        _movByPitcher[_g][d.pName].n++;
      }
    }
  });
  wbdContext.G.forEach(d => {
    const g = wbdContext.pitchGroup(d.pType, d);
    if(!g || g === '기타') return;
    if(!groupStats[g]) groupStats[g] = {spds:[], sHs:[], sVs:[], movs:[]};
    if(d.spdK > 0) groupStats[g].spds.push(+d.spdK);
    if(d.sH != null) groupStats[g].sHs.push(Math.abs(+d.sH));
    if(d.sV != null) groupStats[g].sVs.push(Math.abs(+d.sV));
    if(d.sH != null && d.sV != null) groupStats[g].movs.push(Math.abs(+d.sH) + Math.abs(+d.sV));
  });
  const groupAvg = {};
  Object.entries(groupStats).forEach(([g, s]) => {
    if(s.spds.length < 30) return;  // 적은 표본 제외
    const sortNum = (arr, p) => {
      const sorted = arr.slice().sort((a,b)=>a-b);
      return sorted[Math.floor(sorted.length * p)];
    };
    groupAvg[g] = {
      spdMean: avg(s.spds),
      spdP25: sortNum(s.spds, 0.25),
      spdP75: sortNum(s.spds, 0.75),
      sHMean: avg(s.sHs),
      sHP25: sortNum(s.sHs, 0.25),
      sHP75: sortNum(s.sHs, 0.75),
      sVMean: avg(s.sVs),
      sVP25: sortNum(s.sVs, 0.25),
      sVP75: sortNum(s.sVs, 0.75),
      movMean: avg(s.movs),
      movP25: sortNum(s.movs, 0.25),
      movP75: sortNum(s.movs, 0.75),
      movP50: sortNum(s.movs, 0.50),
      movSorted: s.movs.slice().sort((a,b)=>a-b),  // 투구단위 분포 (참고용)
      // V10.2: 투수별 평균무브 분포 — 선수평가 백분위가 랭킹("선수 평균끼리 순위")과 일치하도록.
      //   최소 5구 이상 던진 투수만 (랭킹 자격과 동일선상)
      movByPitcherSorted: Object.values(_movByPitcher[g]||{}).filter(o=>o.n>=5).map(o=>o.sum/o.n).sort((a,b)=>a-b)
    };
  });
  
  function avg(a){ return a.length?a.reduce((s,v)=>s+v,0)/a.length:0; }
  const result = {
    _t: wbdContext.G.length,
    pitcherBA: avg(pBA),
    pitcherWhiff: avg(pWhiff),
    batterBA: avg(bBA),
    batterHH: avg(bHH),
    groupAvg
  };
  window._scoutLeagueCache = result;
  return result;
};
}

export function initialize(wbdContext) {
// Original index.html:17422
window._scoutingState = {
  mode: 'pitcher',  // 'pitcher' (투수 공략) | 'batter' (타자 공략)
  target: null,     // 분석 대상 선수명
  split: 'all'      // 'all' | 'vsL' | 'vsR'  (투수 공략 → vsL=좌타상대, vsR=우타상대 / 타자 공략 → vsL=좌투상대, vsR=우투상대)
};

// Original index.html:17429
window._scoutSwitchMode = function(mode){
  window._scoutingState.mode = mode;
  window._scoutingState.target = null;  // 자동 선택 로직이 첫 선수 잡음
  window._scoutingState.split = 'all';
  wbdContext.renderScoutingPage();
};

// Original index.html:17437
window._scoutSwitchSplit = function(split){
  window._scoutingState.split = split;
  try {
    wbdContext.renderScoutingPage();
  } catch(e){
    console.error('Split render error:', e);
    const out = document.getElementById('scouting-content');
    if(out) out.innerHTML = `<div style="padding:20px;color:#ff4560">스플릿 분석 중 오류: ${e.message}</div>`;
  }
};
}
