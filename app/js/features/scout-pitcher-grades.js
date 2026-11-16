/** scout-pitcher-grades: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:22831
wbdContext._generateScoutReportPitcher = function _generateScoutReportPitcher(data){ return wbdContext._memoByGame('_generateScoutReportPitcher', data&&data.name, ()=>wbdContext._generateScoutReportPitcher__raw(data)); };

// Original index.html:22832
wbdContext._generateScoutReportPitcher__raw = function _generateScoutReportPitcher__raw(data){
  const c = data.card;
  const lg = wbdContext._scoutLeagueAvgs();
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  
  // ─ 20-80 스케일 변환 헬퍼 (z-score 기반) ─
  // 백분위 기반: 평균 50, 표편 약 10
  const pctileTo80 = (myValue, lgValues, higherBetter=true) => {
    if(!lgValues || lgValues.length < 5) return 50;
    const sorted = lgValues.slice().sort((a,b)=>a-b);
    let pct = 0;
    if(higherBetter){
      pct = sorted.filter(v => v <= myValue).length / sorted.length;
    } else {
      pct = sorted.filter(v => v >= myValue).length / sorted.length;
    }
    // 0~1 → 20~80
    const grade = 20 + pct * 60;
    return Math.round(grade / 5) * 5;  // 5단위 반올림
  };
  
  // 리그 통계 수집
  const pitcherNames = window._cache.pitcherNames || [];
  const lgAvgSpd = [], lgWhiff = [], lgBA = [], lgBB = [], lgHard = [];
  pitcherNames.forEach(n => {
    const arr = wbdContext.getPitcherDataByName(n);
    if(arr.length < 30) return;
    const fbs = arr.filter(d => {
      const g = wbdContext.pitchGroup(d.pType, d);
      return ['포심','투심','커터','패스트볼'].includes(g);
    });
    if(fbs.length >= 10){
      const spds = fbs.map(d=>+d.spdK).filter(v=>v>0);
      if(spds.length) lgAvgSpd.push(spds.reduce((s,v)=>s+v,0)/spds.length);
    }
    const sw = arr.filter(d=>d.bSwing).length;
    const wh = arr.filter(d=>(d.bSwing && +d.call!==2)).length;
    if(sw > 10) lgWhiff.push(wh/sw*100);
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d=>{const r=+d.result; return wbdContext._isABPitch(d);}).length;
    if(ab > 10) lgBA.push(hits/ab);
    const bbs = arr.filter(d=>+d.result===5).length;
    lgBB.push(bbs/arr.length*100);
    const bd = arr.filter(wbdContext._isInPlay);
    if(bd.length > 5) lgHard.push(bd.filter(d=>+d.ev>=105).length/bd.length*100);
  });
  
  // 내 평균 직구 구속
  const myFBs = wbdContext.getPitcherDataByName(data.name).filter(d => ['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType, d)));
  const myFBspds = myFBs.map(d=>+d.spdK).filter(v=>v>0);
  const myAvgFBSpd = myFBspds.length ? myFBspds.reduce((s,v)=>s+v,0)/myFBspds.length : 0;
  
  // ─ 5피치 평가 (20-80) ─
  // 1. Velocity (구속): 직구 평균 구속
  const velocityGrade = myAvgFBSpd > 0 ? pctileTo80(myAvgFBSpd, lgAvgSpd) : 40;
  const velocityNote = `직구 평균 ${myAvgFBSpd.toFixed(1)}km/h (리그 평균 ${lgAvgSpd.length?(lgAvgSpd.reduce((s,v)=>s+v,0)/lgAvgSpd.length).toFixed(1):'-'})`;
  
  // 2. Movement (무브먼트): 모든 구종의 리그 평균 대비 (백분위 기반)
  const offspeedGroups = Object.entries(data.groupDetails).filter(([g]) => !['포심','투심','커터','패스트볼'].includes(g));
  let movementGrade = 50, movementNote = '데이터 부족';
  const movPctiles = [];  // 각 구종의 백분위 (0~1)
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.n < 10) return;
    const lgG = lg.groupAvg && lg.groupAvg[g];
    if(!lgG || !lgG.movMean) return;
    const myMov = Math.abs(d.avgSH) + Math.abs(d.avgSV);  // V10.2: 무브는 방향 무관 절대 이동량 — 음수 좌표로 백분위가 깨지던 버그 수정
    // V10.2: 보간 추정 → 실제 리그 분포 대비 정직한 백분위 (0~1, 절대 음수 안 나옴)
    let pctile;
    // V10.2: 랭킹과 같은 모수 — '투수별 평균무브' 분포 대비 내 순위 (투구단위 분포는 폴백)
    const distArr = (lgG.movByPitcherSorted && lgG.movByPitcherSorted.length >= 4) ? lgG.movByPitcherSorted : lgG.movSorted;
    if(distArr && distArr.length >= 4){
      const arr = distArr;
      let cnt = 0;
      for(let k=0;k<arr.length;k++){ if(arr[k] <= myMov){ cnt++; } }
      pctile = arr.length>1 ? (cnt-0.5)/arr.length : 0.5;  // 순위 백분위(중앙보정), 0~1
      pctile = Math.max(0, Math.min(1, pctile));
      // V10.2: 포화 구종 보정 — 커브/스크류처럼 리그 분포가 한 값(상한)에 몰린 구종은
      //   1~2cm 차이로 백분위가 출렁여 부당. 분포 폭(IQR)이 평균 대비 좁으면(포화) 백분위
      //   신뢰도가 낮으므로, '내가 그 구종 상한에 얼마나 근접했나(절대 수준)'를 섞어 보정.
      const mean = arr.reduce((s,v)=>s+v,0)/arr.length;
      const p25 = arr[Math.floor(arr.length*0.25)], p75 = arr[Math.floor(arr.length*0.75)];
      const iqrRatio = mean>0 ? (p75-p25)/mean : 1;   // 작을수록 포화
      if(false && iqrRatio < 0.12){  // V10.2: 투수평균 모수로 바꾼 뒤 불필요 — 비활성화
        // 절대 근접도: 내 무브 / 그 구종 최대치 (상한 근처면 1)
        const maxV = arr[arr.length-1] || 1;
        const absLevel = Math.max(0, Math.min(1, myMov / maxV));
        // 포화일수록 절대근접도 비중↑ (백분위는 못 믿으니)
        const blend = Math.min(0.7, (0.12 - iqrRatio) / 0.12 * 0.7);
        pctile = pctile*(1-blend) + absLevel*blend;
      }
    } else {
      // 폴백: P25/P50/P75 구간 선형보간 (모두 양수 분모, clamp)
      const p25=lgG.movP25, p50=lgG.movP50||lgG.movMean, p75=lgG.movP75;
      if(myMov <= p25) pctile = Math.max(0, 0.25 * (myMov / Math.max(0.01, p25)));
      else if(myMov <= p50) pctile = 0.25 + 0.25 * (myMov - p25) / Math.max(0.01, p50 - p25);
      else if(myMov <= p75) pctile = 0.50 + 0.25 * (myMov - p50) / Math.max(0.01, p75 - p50);
      else pctile = Math.min(1, 0.75 + 0.25 * (myMov - p75) / Math.max(0.01, p75 - p50));
    }
    pctile = Math.max(0, Math.min(1, pctile));  // 안전 clamp
    movPctiles.push({g, pctile, ratio: lgG.movMean>0 ? myMov / lgG.movMean : 1, n: d.n});
  });
  if(movPctiles.length){
    // V10.2: 각 구종을 '그 구종 분포 안에서' 20~80 grade로 변환 후 구사량 가중 합산.
    //   포심은 포심끼리, 커브는 커브끼리 — 구종마다 무브 상한이 다르므로 별개 평가가 공정.
    //   각 구종 grade = 20 + (그 구종 내 백분위)*60.  예: 포심 상위10%→74, 슬라 상위40%→56, 커브 상위5%→77
    //   → 이걸 구사량 가중평균하면 "주력 구종의 무브 우열"이 점수에 제대로 반영됨.
    // V10.2: 백분위→grade를 비선형(S곡선)으로 — 선형(20+p*60)은 스케일을 압축해 특급도 60대에 갇힘.
    //   pow 곡선으로 양끝을 펴서: 상위10%≈76, 상위25%≈66, 평균(50%)=50, 하위25%≈34, 하위10%≈24.
    //   각 구종은 여전히 '그 구종 분포 안에서' 별개 평가 — 절대 기준 유지하면서 변별만 확대.
    const _pctToGrade = pct => {
      // 50% 기준 대칭 S곡선 (지수 0.7로 양끝 확장)
      if(pct >= 0.5){ return 50 + Math.pow((pct-0.5)/0.5, 0.7) * 30; }
      else { return 50 - Math.pow((0.5-pct)/0.5, 0.7) * 30; }
    };
    movPctiles.forEach(p => { p.grade = _pctToGrade(p.pctile); });
    // V10.2: 주력+위력 구종 위주 평가. 가중 = 구사량 × 무브위력(완만).
    //   "5구종 다 평범"보다 "주력 결정구가 위력적"인 투수를 높게 — 단, 주력 구종이 나쁘면
    //   가끔 던지는 결정구 하나로 과대평가되지 않도록 균형(위력 가중 지수를 1.3으로 완화).
    const totalN = movPctiles.reduce((s,p)=>s+p.n, 0);
    movPctiles.forEach(p => {
      const usageW = p.n / totalN;
      const powerW = Math.pow(Math.max(0.3, p.pctile), 1.3);  // 위력 가중 완화 (^2 → ^1.3)
      p.w = usageW * powerW;
      p.usage = usageW;
    });
    const wSum = movPctiles.reduce((s,p)=>s+p.w, 0) || 1;
    let weightedGrade = movPctiles.reduce((s,p)=>s+p.grade*p.w, 0) / wSum;
    const bestPct = Math.max(...movPctiles.map(p=>p.pctile));
    // V10.2: 주력(최다 구사) 구종 자체의 우열을 직접 반영 — 결정구 원툴 과대평가 방지.
    //   가장 많이 던지는 구종이 나쁘면(하위) 끌어내리고, 좋으면 끌어올림.
    const mainPitch = movPctiles.slice().sort((a,b)=>b.usage-a.usage)[0];
    if(mainPitch){
      const mainGrade = mainPitch.grade;  // 주력 구종 자체 grade
      // 최종 = 위력가중평균 70% + 주력구종 grade 30% (주력이 받쳐줘야 높은 점수)
      weightedGrade = weightedGrade*0.7 + mainGrade*0.3;
      // 주력이 확실히 나쁘면(하위 30%) 추가 감점 — 노릴 구종이 뻔한 투수
      if(mainPitch.pctile <= 0.30 && mainPitch.usage >= 0.35) weightedGrade -= 5;
      // V10.2: 주력이 나빠도 위력적인 결정구(상위 15% 이상)가 하나라도 있으면 소폭 보너스 —
      //   "노릴 구종은 뻔하지만 그래도 결정구는 위협적" → 과대평가는 막되 바닥은 살짝 올림 (+2~3)
      if(mainPitch.pctile <= 0.40){
        const hasPutaway = movPctiles.some(p=>p.pctile>=0.85);
        if(hasPutaway) weightedGrade += (movPctiles.some(p=>p.pctile>=0.92) ? 3 : 2);
      }
    }
    // 강점 보너스: 위력적인 구종에 보너스 — 주력급이면 크게, 서브여도 어느정도 반영 (당신 의도: "평범하나 몇몇 구종 우수 → 60대")
    //   원툴 방지는 위의 주력 grade 30% 혼합 + 주력부진 감점이 담당하므로, 여기선 좋은 구종을 정당하게 보상.
    movPctiles.forEach(p => {
      if(p.pctile >= 0.80){
        const mag = (p.pctile - 0.80) / 0.20;        // 상위20%~최상 → 0~1
        const usageScale = p.usage >= 0.20 ? 1.0 : 0.5;  // 주력급=풀반영, 서브=절반 반영
        weightedGrade += (3 + mag*4) * usageScale;   // 상위20%서브 +1.5 ~ 최상위주력 +7
      }
    });
    movementGrade = Math.max(20, Math.min(80, weightedGrade));
    movementGrade = Math.round(movementGrade / 5) * 5;
    // 노트: 구종별 백분위를 모두 보여줘서 "어느 구종이 좋고 나쁜지" 명시
    // 노트: 위력 가중 비중 큰 구종(=주력 결정구)부터 표시
    movPctiles.sort((a,b)=>b.w-a.w);
    const parts = movPctiles.map(p => `${p.g}(${Math.round(p.n/totalN*100)}%) 상위${Math.max(1,Math.round((1-p.pctile)*100))}%`);
    const keyP = movPctiles[0];
    movementNote = `주력 ${keyP.g} 무브 상위${Math.max(1,Math.round((1-keyP.pctile)*100))}% — ` + parts.join(' · ');
  }
  
  // 3. Command (제구) - V9.7 데이터 기반 절대 기준 스코어링
  //   WBD 분포 실측 (n=14, 백분위):
  //     BB%:     p10=0, p25=0, p50=1.5, p75=3.7, p90=4.8
  //     badZone%: p10=4.6, p25=6.3, p50=9.7, p75=13.1, p90=15.0
  //     초구%:    p10=40, p50=78, p90=84
  //   scoutscale 의미: 80=엘리트(최상), 70=매우우수, 60=우수, 50=평균, 40=평균이하, 30=나쁨, 20=매우나쁨
  //   합성: 50(평균) + BB(±20) + badZone(±20) + 초구(±6)
  //     → 80점은 BB와 badZone 둘 다 엘리트 수준이어야 가능
  const factors = [];
  
  // BB%에 따른 점수 (WBD 분포 기반 7단계)
  let bbAdj = 0;
  if(data.bbPct < 0.3) { bbAdj = 20; factors.push('BB% 거의 없음 (엘리트)'); }
  else if(data.bbPct < 1.0) { bbAdj = 14; factors.push('BB% 매우 낮음'); }
  else if(data.bbPct < 1.7) { bbAdj = 8; factors.push('BB% 우수'); }
  else if(data.bbPct < 2.5) { bbAdj = 0; factors.push('BB% 평균'); }
  else if(data.bbPct < 3.5) { bbAdj = -8; factors.push('BB% 다소 높음'); }
  else if(data.bbPct < 5) { bbAdj = -16; factors.push('BB% 높음'); }
  else if(data.bbPct < 7) { bbAdj = -23; factors.push('BB% 매우 높음'); }
  else { bbAdj = -28; factors.push('BB% 심각'); }
  
  // 실투+살짝(0.7 가중치) 통합 점수 (WBD 분포 기반 7단계)
  const slightPct = data.slightPct != null ? data.slightPct : 0;
  const badZonePct = data.midPitchPct + slightPct * 0.7;
  let badAdj = 0;
  if(badZonePct < 3) { badAdj = 20; factors.push('실투/몰림 극소수 (정밀)'); }
  else if(badZonePct < 6) { badAdj = 12; factors.push('실투/몰림 매우 적음'); }
  else if(badZonePct < 9) { badAdj = 4; factors.push('실투/몰림 적음'); }
  else if(badZonePct < 12) { badAdj = -3; factors.push('실투/몰림 평균'); }
  else if(badZonePct < 16) { badAdj = -10; factors.push('실투/몰림 다소 많음'); }
  else if(badZonePct < 22) { badAdj = -18; factors.push('실투/몰림 많음'); }
  else { badAdj = -25; factors.push('실투/몰림 매우 많음'); }
  
  // 초구 스트라이크 (보조 지표)
  let fpAdj = 0;
  if(data.firstPitchN >= 5){
    if(data.firstPitchStrikePct >= 85) { fpAdj = 4; factors.push('초구 잘 잡음'); }
    else if(data.firstPitchStrikePct >= 75) { fpAdj = 2; }
    else if(data.firstPitchStrikePct < 50) { fpAdj = -2; factors.push('초구 못 잡음'); }
    else if(data.firstPitchStrikePct < 40) { fpAdj = -4; factors.push('초구 못 잡음'); }
  }
  
  // 합산 → 80점은 BB와 badZone 둘 다 엘리트여야 가능
  let commandScore = 50 + bbAdj + badAdj + fpAdj;
  commandScore = Math.max(20, Math.min(80, commandScore));
  commandScore = Math.round(commandScore / 5) * 5;
  const commandNote = `BB% ${data.bbPct.toFixed(1)} · 실투 ${data.midPitchPct.toFixed(1)}%${slightPct?` + 살짝 ${slightPct.toFixed(1)}%`:''} · 초구 스트라이크 ${data.firstPitchStrikePct.toFixed(0)}%`;
  
  // 4. Stuff (구위): 헛스윙률, 피EV, 하드힛%
  const whiffGrade = data.overall.swings >= 30 ? pctileTo80(data.overall.whiffPct, lgWhiff) : 50;
  const hardGrade = data.overall.hardPct ? pctileTo80(data.overall.hardPct, lgHard, false) : 50;
  const stuffGrade = Math.round((whiffGrade + hardGrade) / 2 / 5) * 5;
  const stuffNote = `헛스윙 ${data.overall.whiffPct.toFixed(1)}% · 하드힛 허용 ${data.overall.hardPct.toFixed(1)}%`;
  
  // 5. Mix (구종 다양성): 사용 구종 수 + 균형도
  const validGroups = Object.values(data.groupDetails).filter(d => d.usagePct >= 5);
  let mixScore = 40;
  if(validGroups.length >= 5) mixScore = 70;
  else if(validGroups.length >= 4) mixScore = 60;
  else if(validGroups.length >= 3) mixScore = 50;
  else if(validGroups.length >= 2) mixScore = 40;
  else mixScore = 30;
  // 주력구종이 너무 편중이면 감점
  if(validGroups.length){
    const maxUsage = Math.max(...validGroups.map(d => d.usagePct));
    if(maxUsage >= 70) mixScore -= 5;
  }
  mixScore = Math.max(20, Math.min(80, mixScore));
  mixScore = Math.round(mixScore / 5) * 5;
  const mixNote = `사용 구종 ${validGroups.length}종 (5%+ 비율) · 주력 ${validGroups.length?Math.max(...validGroups.map(d => d.usagePct)).toFixed(0):0}%`;
  
  const grades = [
    {key:'velocity', label:'구속 (Velocity)', value:velocityGrade, note:velocityNote},
    {key:'movement', label:'무브 (Movement)', value:movementGrade, note:movementNote},
    {key:'command', label:'제구 (Command)', value:commandScore, note:commandNote},
    {key:'stuff', label:'구위 (Stuff)', value:stuffGrade, note:stuffNote},
    {key:'mix', label:'레퍼토리 (Mix)', value:mixScore, note:mixNote}
  ];
  
  // ─ 구종별 평가 (각 구종에 20-80 등급 + 평가 이유) ─
  const pitchGrades = [];
  Object.entries(data.groupDetails).filter(([g, d]) => d.usagePct >= 5).forEach(([g, d]) => {
    // 종합 점수 계산: 무브 + 구속 + 결과(피안타) + 헛스윙
    const factors = [];
    let totalScore = 50;
    
    const lgG = lg.groupAvg && lg.groupAvg[g];
    
    // 1. 무브 (구종별 리그 평균 대비)
    if(lgG && lgG.movMean > 0 && d.avgSH + d.avgSV > 0){
      const myMov = d.avgSH + d.avgSV;
      if(myMov >= lgG.movP75) { totalScore += 10; factors.push(`무브 리그 상위 (${myMov.toFixed(0)}cm)`); }
      else if(myMov >= lgG.movMean) { totalScore += 3; factors.push(`무브 평균 이상 (${myMov.toFixed(0)}cm)`); }
      else if(myMov >= lgG.movP25) { totalScore -= 3; factors.push(`무브 평균 미만 (${myMov.toFixed(0)}cm vs 리그 ${lgG.movMean.toFixed(0)}cm)`); }
      else { totalScore -= 10; factors.push(`무브 리그 하위 (${myMov.toFixed(0)}cm)`); }
    }
    
    // 2. 구속 (직구 계열만)
    if(['포심','투심','커터','패스트볼'].includes(g) && lgG && lgG.spdMean > 0){
      if(d.avgSpd >= lgG.spdP75) { totalScore += 8; factors.push(`구속 리그 상위 (${d.avgSpd.toFixed(1)}km/h)`); }
      else if(d.avgSpd >= lgG.spdMean) { totalScore += 2; factors.push(`구속 평균 이상 (${d.avgSpd.toFixed(1)}km/h)`); }
      else if(d.avgSpd >= lgG.spdP25) { totalScore -= 2; factors.push(`구속 평균 미만 (${d.avgSpd.toFixed(1)}km/h)`); }
      else { totalScore -= 8; factors.push(`구속 리그 하위 (${d.avgSpd.toFixed(1)}km/h)`); }
    }
    
    // 3. 결과 (피안타율) - V9.7 WBD 환경 보정 (평균 .377)
    //   피안타율 좋음(낮음) ← .220, .280, .340, .400, .450 → 나쁨(높음)
    if(d.ab >= 8){
      if(d.ba < 0.220) { totalScore += 14; factors.push(`피안타율 ${fmt3(d.ba)} 압도적`); }
      else if(d.ba < 0.280) { totalScore += 10; factors.push(`피안타율 ${fmt3(d.ba)} 매우 우수`); }
      else if(d.ba < 0.340) { totalScore += 5; factors.push(`피안타율 ${fmt3(d.ba)} 우수`); }
      else if(d.ba < 0.400) { totalScore += 0; factors.push(`피안타율 ${fmt3(d.ba)} 평균`); }
      else if(d.ba < 0.450) { totalScore -= 6; factors.push(`피안타율 ${fmt3(d.ba)} 다소 높음`); }
      else if(d.ba < 0.520) { totalScore -= 12; factors.push(`피안타율 ${fmt3(d.ba)} 피격 많음`); }
      else { totalScore -= 18; factors.push(`피안타율 ${fmt3(d.ba)} 피격 심각`); }
    }
    
    // 4. 헛스윙률 - V9.7 WBD 보정 (평균 32%)
    if(d.swings >= 10){
      if(d.whiffPct >= 55) { totalScore += 10; factors.push(`헛스윙 ${d.whiffPct.toFixed(0)}% (결정구급)`); }
      else if(d.whiffPct >= 42) { totalScore += 5; factors.push(`헛스윙 ${d.whiffPct.toFixed(0)}% 우수`); }
      else if(d.whiffPct >= 30) { totalScore += 0; }
      else if(d.whiffPct >= 20) { totalScore -= 3; }
      else { totalScore -= 8; factors.push(`헛스윙 ${d.whiffPct.toFixed(0)}% 낮음`); }
    }
    
    // 5. 제구 (실투 비율)
    if(d.n >= 15){
      if(d.midPct >= 25) { totalScore -= 6; factors.push(`실투 ${d.midPct.toFixed(0)}% (한가운데 많음)`); }
      else if(d.midPct <= 8) { totalScore += 4; factors.push(`실투 ${d.midPct.toFixed(0)}% (제구 정밀)`); }
    }
    
    // 6. 피홈런
    if(d.hr >= 3){
      totalScore -= 5;
      factors.push(`피HR ${d.hr}개`);
    }
    
    totalScore = Math.max(20, Math.min(80, totalScore));
    totalScore = Math.round(totalScore / 5) * 5;
    
    // 등급 라벨
    let gradeLabel;
    if(totalScore >= 70) gradeLabel = '결정구급';
    else if(totalScore >= 60) gradeLabel = '플러스 (Plus)';
    else if(totalScore >= 55) gradeLabel = '평균 이상';
    else if(totalScore >= 45) gradeLabel = '평균';
    else if(totalScore >= 35) gradeLabel = '평균 이하';
    else gradeLabel = '약점';
    
    pitchGrades.push({
      pitch: g,
      grade: totalScore,
      label: gradeLabel,
      usagePct: d.usagePct,
      factors,
      detail: `${d.avgSpd > 0 ? d.avgSpd.toFixed(1)+'km/h · ' : ''}무브 ${(d.avgSH+d.avgSV).toFixed(0)}cm · 피안타 ${d.ab>=4?fmt3(d.ba):'-'} · 헛스윙 ${d.swings>=5?d.whiffPct.toFixed(0)+'%':'-'}`
    });
  });
  pitchGrades.sort((a,b) => b.usagePct - a.usagePct);
  
  // ─ FV (Future Value) 계산 ─
  // 가중 평균 - command, stuff 더 중요
  const fv = Math.round((velocityGrade*0.20 + movementGrade*0.15 + commandScore*0.30 + stuffGrade*0.25 + mixScore*0.10) / 5) * 5;
  
  // ─ 통합 역할 라벨 함수 (절대 평가 기준, FV 기반) ─
  // 큰 카드 (오른쪽)와 작은 배지 (왼쪽) 모두 이 결과 사용 → 일관성 보장
  function _fvToRole(fv, data){
    if(fv >= 70) return {long: 'TOP OF ROTATION (1선발급)', short: '1선발급 (에이스)', color: '#ff4560'};
    if(fv >= 60) return {long: '#2-3 STARTER (2-3선발급)', short: '2-3선발급', color: '#ff8c44'};
    if(fv >= 55){
      if(data.overall.whiffPct >= 30){
        return {long: 'HIGH-LEVERAGE RELIEVER (필승조급)', short: '필승조급 (셋업/마무리)', color: '#ffd700'};
      }
      return {long: '#4 STARTER (4선발급)', short: '4선발급', color: '#ffd700'};
    }
    if(fv >= 50){
      if(data.gameVariability != null && data.gameVariability < 0.12 && data.bbPct < 7){
        return {long: 'BACK-END / LONG RELIEF (롱릴리프급)', short: '롱릴리프급', color: '#39ff8a'};
      }
      if(data.overall.whiffPct >= 28){
        return {long: 'MIDDLE RELIEVER (중간계투급)', short: '중간계투급', color: '#88ccff'};
      }
      return {long: '#5 STARTER / LONG RELIEF (5선발/롱릴리프급)', short: '5선발/롱릴리프급', color: '#88ccff'};
    }
    if(fv >= 45) return {long: 'MIDDLE RELIEF / SPOT START (중간계투/추격조)', short: '중간계투/추격조', color: '#888'};
    return {long: 'ORG DEPTH / AAAA (육성)', short: '육성/트라이아웃', color: '#666'};
  }
  
  const roleInfo = _fvToRole(fv, data);
  const fvLabel = roleInfo.long;
  const fvColor = roleInfo.color;
  
  // ─ 현재 등급 / 잠재력 등급 ─
  // 현재 = OVR + 실전 성적
  const currentTier = c.OVR >= 100 ? {grade:'AA', label:'슈퍼스타급', color:'#ff4560'}
                    : c.OVR >= 90 ? {grade:'A+', label:'올스타급', color:'#ff8c44'}
                    : c.OVR >= 80 ? {grade:'A', label:'주전급', color:'#ffd700'}
                    : c.OVR >= 70 ? {grade:'B+', label:'백업/롱릴리프급', color:'#39ff8a'}
                    : c.OVR >= 60 ? {grade:'B', label:'유망주급', color:'#88ccff'}
                    : {grade:'C', label:'육성 단계', color:'#888'};
  
  // 잠재력 = 표본 작거나 약점이 개선 가능하면 +1 등급
  // 단순화: 망경기 적고 안정적이면 그대로, 들쭉날쭉이면 +1, 표본 적으면 +1
  let potentialBoost = 0;
  if(data.total < 100) potentialBoost = 1;  // 표본 적음 -> 가능성 있음
  if(data.gameVariability != null && data.gameVariability > 0.15) potentialBoost += 0.5;  // 들쭉날쭉
  if(velocityGrade >= 60 || stuffGrade >= 60) potentialBoost += 0.5;  // 잠재력 있는 무기
  
  const potentialTiers = [
    {grade:'C', label:'육성 단계', color:'#888'},
    {grade:'B', label:'유망주급', color:'#88ccff'},
    {grade:'B+', label:'백업급', color:'#39ff8a'},
    {grade:'A', label:'주전급', color:'#ffd700'},
    {grade:'A+', label:'올스타급', color:'#ff8c44'},
    {grade:'AA', label:'슈퍼스타급', color:'#ff4560'}
  ];
  const currentIdx = potentialTiers.findIndex(t => t.grade === currentTier.grade);
  const potentialIdx = Math.min(potentialTiers.length-1, currentIdx + Math.round(potentialBoost));
  const potentialTier = potentialTiers[potentialIdx];
  
  // ─ 종합 평가 (summary) ─
  const summary = [];
  
  // 핵심 1줄
  let headlineParts = [];
  if(velocityGrade >= 60) headlineParts.push('빠른 구속');
  if(movementGrade >= 60) headlineParts.push('큰 무브');
  if(commandScore >= 60) headlineParts.push('정밀한 제구');
  if(stuffGrade >= 60) headlineParts.push('우수한 구위');
  if(mixScore >= 60) headlineParts.push('풍부한 레퍼토리');
  if(!headlineParts.length){
    if(velocityGrade <= 40) headlineParts.push('느린 구속');
    if(commandScore <= 40) headlineParts.push('제구 불안');
    if(stuffGrade <= 40) headlineParts.push('약한 구위');
  }
  const headline = headlineParts.length ? `<b>${headlineParts.join(' · ')}</b> 을 갖춘` : '<b>평균적</b> 수준의';
  summary.push(`${data.pHand==='L'?'좌투':'우투'}, ${headline} 투수. 실전 피안타율 ${fmt3(data.overall.ba)} (${data.overall.hits}/${data.overall.ab}).`);
  
  // 주력 구종 종합
  const topPitches = Object.entries(data.groupDetails).sort((a,b)=>b[1].usagePct-a[1].usagePct).slice(0, 3);
  if(topPitches.length){
    let pitchSummary = '주력 구종: ';
    pitchSummary += topPitches.map(([g, d]) => {
      const tag = d.whiffPct >= 40 ? ` <span style="color:#ff4560">[K구]</span>` 
                : d.ba >= 0.330 ? ` <span style="color:#ff8c44">[피격]</span>` 
                : d.ba < 0.200 ? ` <span style="color:#39ff8a">[효과적]</span>` : '';
      return `<b>${g}</b> ${d.usagePct.toFixed(0)}%${tag}`;
    }).join(' · ');
    summary.push(pitchSummary);
  }
  
  // 운영 스타일
  let style = '';
  if(data.bbPct < 5 && data.firstPitchStrikePct >= 60) style = '<b>제구형 컨트롤러</b> — 정확한 코스로 카운트 잡는 타입';
  else if(data.overall.whiffPct >= 30) style = '<b>탈삼진형</b> — 헛스윙 유도로 잡는 타입';
  else if(stuffGrade >= 55 && data.overall.hardPct < 25) style = '<b>약한 타구 유도형</b> — 컨택 시키되 강한 타구 안 줌';
  else if(data.bbPct >= 8) style = '<b>볼넷 위험형</b> — 카운트 빼앗기는 경향';
  else style = '<b>균형형</b> — 특정 스타일 분류 어려움';
  summary.push(`운영 스타일: ${style}`);
  
  // 안정성
  if(data.gameVariability != null){
    let stab;
    if(data.gameVariability < 0.08) stab = `<b style="color:#39ff8a">매우 안정</b> (편차 σ${data.gameVariability.toFixed(3)})`;
    else if(data.gameVariability < 0.12) stab = `<b style="color:#88ccff">안정적</b> (σ${data.gameVariability.toFixed(3)})`;
    else if(data.gameVariability < 0.18) stab = `<b style="color:#ffd700">기복 있음</b> (σ${data.gameVariability.toFixed(3)})`;
    else stab = `<b style="color:#ff4560">기복 심함</b> (σ${data.gameVariability.toFixed(3)})`;
    summary.push(`경기 일관성: ${stab} · 망경기 ${data.badGames}회 / 호투 ${data.goodGames}회`);
  }
  
  // ─ 강점 ─
  const strengths = [];
  if(velocityGrade >= 60) strengths.push(`<b>구속 ${velocityGrade}</b> — 직구로 압도 가능. 빠른 공으로 카운트 잡기 유리.`);
  if(movementGrade >= 60) strengths.push(`<b>무브 ${movementGrade}</b> — 변화구 변화량 큼. 타자가 컨택하기 어려움.`);
  if(commandScore >= 60) strengths.push(`<b>제구 ${commandScore}</b> — BB% ${data.bbPct.toFixed(1)}, 실투 ${data.midPitchPct.toFixed(1)}%. 위험한 공 적음.`);
  if(stuffGrade >= 60) strengths.push(`<b>구위 ${stuffGrade}</b> — 헛스윙 ${data.overall.whiffPct.toFixed(0)}%, 하드힛 ${data.overall.hardPct.toFixed(0)}%. 단순 컨택 안 됨.`);
  if(mixScore >= 60) strengths.push(`<b>레퍼토리 ${mixScore}</b> — ${validGroups.length}종 구종. 타자가 예측 어려움.`);
  
  // 결정구 (V9.7 WBD 환경 보정)
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.swings >= 15 && d.whiffPct >= 45){
      strengths.push(`<b>${g} 결정구급</b> — 헛스윙 ${d.whiffPct.toFixed(0)}% (${d.swings}스윙 중). 진짜 효과적 무기.`);
    }
    if(d.ab >= 10 && d.ba < 0.280){
      strengths.push(`<b>${g} 봉쇄력</b> — 피안타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 거의 안 맞음.`);
    }
  });
  
  // 좌우 양손 봉쇄 (V9.7 WBD 환경 보정)
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    if(data.splits.vsL.ba < 0.280 && data.splits.vsR.ba < 0.280){
      strengths.push(`<b>좌우 양손 봉쇄</b> — 좌타 ${fmt3(data.splits.vsL.ba)} / 우타 ${fmt3(data.splits.vsR.ba)}. 매치업 가리지 않음.`);
    }
  }
  
  if(data.gameVariability != null && data.gameVariability < 0.08){
    strengths.push(`<b>매우 안정적 운영</b> — 경기별 편차 σ${data.gameVariability.toFixed(3)}. 어떤 상황에서도 일정.`);
  }
  
  if(!strengths.length) strengths.push('데이터상 두드러진 강점 없음.');
  
  // ─ 약점 ─
  const weaknesses = [];
  if(velocityGrade <= 40) weaknesses.push(`<b>구속 ${velocityGrade}</b> — ${myAvgFBSpd.toFixed(1)}km/h. 강타자에게 EV로 밀릴 위험.`);
  if(movementGrade <= 40) weaknesses.push(`<b>무브 ${movementGrade}</b> — 변화구 무브 작음. 컨택하기 쉬움.`);
  if(commandScore <= 40) weaknesses.push(`<b>제구 ${commandScore}</b> — BB% ${data.bbPct.toFixed(1)}, 실투 ${data.midPitchPct.toFixed(1)}%. 자주 흔들림.`);
  if(stuffGrade <= 40) weaknesses.push(`<b>구위 ${stuffGrade}</b> — 헛스윙 ${data.overall.whiffPct.toFixed(0)}%. 결정구 부족.`);
  if(mixScore <= 40) weaknesses.push(`<b>레퍼토리 ${mixScore}</b> — ${validGroups.length}종에 의존. 예측 가능.`);
  
  // 좌우 약점 (V9.7 WBD 환경 보정: 평균 .377 → 약점 .420)
  if(data.splits.vsL.n >= 30 && data.splits.vsL.ba >= 0.420){
    weaknesses.push(`<b>좌타 약점</b> — vs좌타 ${fmt3(data.splits.vsL.ba)} (HR ${data.splits.vsL.hr}). 좌타 라인업에 위험.`);
  }
  if(data.splits.vsR.n >= 30 && data.splits.vsR.ba >= 0.420){
    weaknesses.push(`<b>우타 약점</b> — vs우타 ${fmt3(data.splits.vsR.ba)} (HR ${data.splits.vsR.hr}). 우타 라인업에 위험.`);
  }
  
  // 피격 구종 (V9.7 WBD 환경 보정: 평균 .377 → 피격 .450)
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.ab >= 8 && d.ba >= 0.450){
      weaknesses.push(`<b>${g} 피격</b> — 피안타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}, HR ${d.hr}). 사용 줄이거나 코스 개선 필요.`);
    }
  });
  
  // 기복
  if(data.gameVariability != null && data.gameVariability >= 0.15){
    weaknesses.push(`<b>기복</b> — 편차 σ${data.gameVariability.toFixed(3)}. 망경기 ${data.badGames}회. 안정성 떨어짐.`);
  }
  
  if(!weaknesses.length) weaknesses.push('데이터상 두드러진 약점 없음.');
  
  // ─ 발전 방향 (자세하게 이유 + 구체 방법) ─
  const development = [];
  
  // 1. 제구 개선
  if(commandScore <= 50 && data.bbPct >= 6){
    let line = `<b>🎯 제구 개선 우선</b> — BB% ${data.bbPct.toFixed(1)}% (5% 이하 목표).`;
    line += `<br>• 원인: `;
    const causes = [];
    if(data.midPitchPct >= 12) causes.push(`실투 ${data.midPitchPct.toFixed(0)}% 높음`);
    if(data.firstPitchStrikePct < 55) causes.push(`초구 스트라이크 ${data.firstPitchStrikePct.toFixed(0)}%로 낮음`);
    line += causes.length ? causes.join(', ') : '제구 안정성 부족';
    line += `<br>• 방법: 1차로 코너 정확도 훈련, 카운트 잡기용 안전 코스 (좌하·우하 - 낮은 코너) 적극 활용`;
    development.push(line);
  }
  
  // 2. 실투
  if(data.midPitchPct >= 12){
    let line = `<b>💢 실투 줄이기</b> — 한가운데 칸 ${data.midPitchPct.toFixed(0)}% (10% 이하 목표).`;
    // 어느 구종이 실투 많은지
    const midProneGroups = Object.entries(data.groupDetails)
      .filter(([g,d]) => d.n >= 15 && d.midPct >= 18)
      .sort((a,b) => b[1].midPct - a[1].midPct);
    if(midProneGroups.length){
      line += `<br>• 주범: ${midProneGroups.slice(0,2).map(([g,d]) => `<b>${g} 실투 ${d.midPct.toFixed(0)}%</b> (피안타 ${fmt3(d.ba)})`).join(', ')}`;
    }
    if(data.midHardHitRate >= 25){
      line += `<br>• 실투 시 하드힛 ${data.midHardHitRate.toFixed(0)}% — 한방 위험. 가운데 절대 금지`;
    }
    line += `<br>• 방법: 직구는 높은 코너로 (하이패스트볼), 변화구는 낮은 외각으로 빼는 연습`;
    development.push(line);
  }
  
  // 3. 가장 피격 구종 - 구체적으로 왜 맞는지 분석
  const worstPitch = Object.entries(data.groupDetails).filter(([g,d])=>d.ab>=8).sort((a,b)=>b[1].ba-a[1].ba)[0];
  if(worstPitch && worstPitch[1].ba >= 0.310){
    const [g, d] = worstPitch;
    let line = `<b>⚾ ${g} 개선 필수</b> — 피안타율 ${fmt3(d.ba)} (${d.hits}/${d.ab})${d.hr>0?', HR '+d.hr:''}.`;
    
    // 왜 맞는지 진단
    const reasons = [];
    const lgG = lg.groupAvg && lg.groupAvg[g];
    if(lgG){
      // 무브 비교
      const myMov = d.avgSH + d.avgSV;
      if(myMov < lgG.movP25){
        reasons.push(`무브가 리그 하위 (${myMov.toFixed(0)}cm vs 리그 평균 ${lgG.movMean.toFixed(0)}cm) — <b>무브먼트 강화 필요</b>`);
      } else if(myMov < lgG.movMean){
        reasons.push(`무브가 리그 평균 미만 (${myMov.toFixed(0)}cm)`);
      }
      // 구속 비교 (직구 계열만)
      if(['포심','투심','커터','패스트볼'].includes(g) && d.avgSpd < lgG.spdP25){
        reasons.push(`구속이 리그 하위 (${d.avgSpd.toFixed(1)}km/h vs 평균 ${lgG.spdMean.toFixed(1)}) — 코스 정밀도로 보완 또는 구속 향상`);
      }
    }
    
    // 코스 문제
    if(d.midPct >= 18){
      reasons.push(`한가운데 ${d.midPct.toFixed(0)}% (실투 많음)`);
    }
    if(d.inZonePct >= 70){
      reasons.push(`인존 비율 ${d.inZonePct.toFixed(0)}% — 너무 존 위주, 빼는 패턴 필요`);
    }
    
    // 좌타/우타 어느 쪽에 더 맞는지
    if(d.vsL.ab >= 4 && d.vsR.ab >= 4){
      if(d.vsL.ba >= 0.330 && d.vsL.ba > d.vsR.ba + 0.080){
        // 좌타 상대 코스 문제
        const lc = d.vsL.course;
        const lcTot = lc.inn + lc.out + lc.midZone + lc.outZone;
        let courseIssue = '';
        if(lcTot >= 8){
          if(lc.inn / lcTot >= 0.40) courseIssue = `, 좌타 몸쪽 ${(lc.inn/lcTot*100).toFixed(0)}% 위주로 던지는데 결과 안 좋음`;
          else if(lc.midZone / lcTot >= 0.40) courseIssue = `, 좌타에 가운데로 자주 들어감 (${(lc.midZone/lcTot*100).toFixed(0)}%)`;
        }
        reasons.push(`좌타에 특히 약함 (vs좌 ${fmt3(d.vsL.ba)})${courseIssue} — <b>좌타용 코스 변경</b> 필요`);
      } else if(d.vsR.ba >= 0.330 && d.vsR.ba > d.vsL.ba + 0.080){
        const rc = d.vsR.course;
        const rcTot = rc.inn + rc.out + rc.midZone + rc.outZone;
        let courseIssue = '';
        if(rcTot >= 8){
          if(rc.inn / rcTot >= 0.40) courseIssue = `, 우타 몸쪽 ${(rc.inn/rcTot*100).toFixed(0)}% 위주인데 결과 안 좋음`;
          else if(rc.midZone / rcTot >= 0.40) courseIssue = `, 우타에 가운데로 자주 들어감 (${(rc.midZone/rcTot*100).toFixed(0)}%)`;
        }
        reasons.push(`우타에 특히 약함 (vs우 ${fmt3(d.vsR.ba)})${courseIssue} — <b>우타용 코스 변경</b> 필요`);
      }
    }
    
    if(reasons.length){
      line += `<br>• 원인: ${reasons.join('<br>• ')}`;
    }
    
    // 구체 개선 방안
    const advice = [];
    if(lgG && (d.avgSH + d.avgSV) < lgG.movMean){
      advice.push('무브먼트 강화 (자이로 효율 개선, 회전수 증가)');
    }
    if(d.midPct >= 18){
      advice.push('한가운데 칸 빼고 코너/외각 위주로 던지기');
    }
    if(d.inZonePct >= 70){
      advice.push('유인구 비율 늘려서 헛스윙 유도');
    }
    if(d.vsL.ab >= 4 && d.vsL.ba >= 0.330){
      // 좌타에 어느 코스가 그나마 좋은지
      const courses = [
        {name:'몸쪽', d:d.vsL.course.inn},
        {name:'바깥쪽', d:d.vsL.course.out},
        {name:'높은', d:d.vsL.course.high},
        {name:'낮은', d:d.vsL.course.low}
      ];
      // 평균 코스 비중 보고 적게 쓰는 곳이 시도해볼 만한 곳
      const total = courses.reduce((s,c)=>s+c.d, 0);
      if(total > 0){
        const least = courses.filter(c => c.d/total < 0.20).map(c => c.name);
        if(least.length){
          advice.push(`좌타엔 적게 쓰는 코스 (${least.join(', ')}) 비중 늘려 시험`);
        }
      }
    }
    if(advice.length){
      line += `<br>• 방법: ${advice.join(' / ')}`;
    } else {
      line += `<br>• 방법: 코스·무브·비중 종합 점검`;
    }
    development.push(line);
  }
  
  // 4. 무브 작음
  if(movementGrade <= 45 && offspeedGroups.length){
    let line = `<b>🌀 변화구 무브 강화</b> — 변화구들이 리그 평균 이하 무브.`;
    // 어느 구종이 가장 부족한지
    const movDeficit = [];
    offspeedGroups.forEach(([g, d]) => {
      const lgG = lg.groupAvg && lg.groupAvg[g];
      if(!lgG || d.n < 10) return;
      const myMov = d.avgSH + d.avgSV;
      if(myMov < lgG.movP25){
        movDeficit.push(`<b>${g}</b> (${myMov.toFixed(0)}cm vs 리그 평균 ${lgG.movMean.toFixed(0)}cm)`);
      }
    });
    if(movDeficit.length){
      line += `<br>• 가장 부족한 구종: ${movDeficit.slice(0,2).join(', ')}`;
    }
    line += `<br>• 방법: 자이로 각도 확보 (실측: 자이로 높을수록 무브 증가, 단 변화 시점이 늦어지는 트레이드오프 존재) / 회전축 개선 / 그립 변경 시도`;
    development.push(line);
  }
  
  // 5. 구속 부족
  if(velocityGrade <= 45){
    let line = `<b>⚡ 구속 향상</b> — 직구 ${myAvgFBSpd.toFixed(1)}km/h (리그 평균 ${lgAvgSpd.length?(lgAvgSpd.reduce((s,v)=>s+v,0)/lgAvgSpd.length).toFixed(1):'-'}).`;
    line += `<br>• 영향: 빠른 공으로 카운트 잡기 어려움, 강타자에 EV로 밀림`;
    line += `<br>• 방법: 145+ km/h 목표로 어깨 강화 / 또는 정밀 제구·변화구 무브로 보완 (제구형 투수로 전환)`;
    development.push(line);
  }
  
  // 6. 레퍼토리 부족
  if(mixScore <= 45){
    let line = `<b>🎭 레퍼토리 확장</b> — 사용 구종 ${validGroups.length}종 (5%+).`;
    // 가장 비중 큰 구종
    if(validGroups.length){
      const maxUsage = Math.max(...validGroups.map(d => d.usagePct));
      line += `<br>• 의존도: 주력 구종 ${maxUsage.toFixed(0)}% — 타자가 예측하기 쉬움`;
    }
    line += `<br>• 방법: 보조 구종 1~2종 추가 개발 (특히 좌우 차별화 가능한 변화구)`;
    development.push(line);
  }
  
  // 7. 결정구 부족
  if(stuffGrade <= 45 && data.overall.whiffPct < 22){
    let line = `<b>❌ 결정구 개발</b> — 헛스윙 ${data.overall.whiffPct.toFixed(0)}% (리그 평균 ${lg.pitcherWhiff.toFixed(1)}% 대비 낮음).`;
    // 그나마 헛스윙 잘 나오는 구종이 뭔지
    const bestK = Object.entries(data.groupDetails)
      .filter(([g,d]) => d.swings >= 10)
      .sort((a,b) => b[1].whiffPct - a[1].whiffPct)[0];
    if(bestK && bestK[1].whiffPct >= 25){
      line += `<br>• 발전 가능: <b>${bestK[0]}</b> 헛스윙 ${bestK[1].whiffPct.toFixed(0)}% — 이 구종을 결정구로 키울 잠재력`;
    }
    line += `<br>• 방법: 2스트라이크 전용 구종 개발 / 존 밖 빼는 유인구 능력 강화 (체이스율 향상)`;
    development.push(line);
  }
  
  // 8. 좌/우 편차
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    if(Math.abs(data.splits.vsL.ba - data.splits.vsR.ba) >= 0.080){
      const weakSide = data.splits.vsL.ba > data.splits.vsR.ba ? '좌타' : '우타';
      const weakBA = data.splits.vsL.ba > data.splits.vsR.ba ? data.splits.vsL.ba : data.splits.vsR.ba;
      const weakStat = data.splits.vsL.ba > data.splits.vsR.ba ? data.splits.vsL : data.splits.vsR;
      let line = `<b>🆚 ${weakSide} 대응 보완</b> — vs${weakSide} ${fmt3(weakBA)} (${weakStat.hits}/${weakStat.ab}).`;
      // 어떤 구종으로 잡으면 좋은지
      const goodVsWeak = Object.entries(data.groupDetails).filter(([g,d]) => {
        const side = weakSide === '좌타' ? d.vsL : d.vsR;
        return side.ab >= 4 && side.ba < 0.220;
      }).sort((a,b) => {
        const sa = weakSide === '좌타' ? a[1].vsL : a[1].vsR;
        const sb = weakSide === '좌타' ? b[1].vsL : b[1].vsR;
        return sa.ba - sb.ba;
      });
      if(goodVsWeak.length){
        const [g, d] = goodVsWeak[0];
        const side = weakSide === '좌타' ? d.vsL : d.vsR;
        line += `<br>• 효과적: <b>${g}</b> 가 ${weakSide}에 ${fmt3(side.ba)} — 비중 늘릴 만함`;
      }
      line += `<br>• 방법: ${weakSide} 전용 구종/코스 패턴 다양화. 같은 패턴 반복 금지`;
      development.push(line);
    }
  }
  
  // 9. 기복
  if(data.gameVariability != null && data.gameVariability >= 0.15){
    let line = `<b>📊 안정성 개선</b> — 경기별 편차 σ${data.gameVariability.toFixed(3)} · 망경기 ${data.badGames}회.`;
    line += `<br>• 영향: 어떤 날엔 호투, 어떤 날엔 폭발. 예측 불가능`;
    line += `<br>• 방법: 워밍업 루틴 일관성 / 컨디션 관리 / 멘탈 안정화`;
    development.push(line);
  }
  
  if(!development.length) development.push('현재 폼 유지. 큰 개선 포인트 없음.');
  
  // ─ 유사 선수 (Similar) ─
  const similar = [];
  pitcherNames.forEach(n => {
    if(n === data.name) return;
    const otherCard = wbdContext.calcPitcherCard(n);
    if(!otherCard || otherCard.lowData) return;
    const otherArr = wbdContext.getPitcherDataByName(n);
    if(otherArr.length < 50) return;
    // 유사도 계산: OVR 차이 + 좌우 + 직구비율 + BAA
    const otherFBs = otherArr.filter(d => ['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType, d)));
    const otherFBpct = otherArr.length>0 ? otherFBs.length/otherArr.length : 0;
    const myFBpct = data.total>0 ? myFBs.length/data.total : 0;
    
    const otherHits = otherArr.filter(wbdContext._isHit).length;
    const otherAB = otherArr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    const otherBA = otherAB > 0 ? otherHits/otherAB : 0.250;
    
    // 비교 차이
    const ovrDiff = Math.abs(otherCard.OVR - c.OVR);
    const handMatch = otherArr[0]?.pHand === data.pHand ? 0 : 0.3;
    const fbDiff = Math.abs(otherFBpct - myFBpct);
    const baDiff = Math.abs(otherBA - data.overall.ba);
    
    const distance = (ovrDiff/30)*0.4 + handMatch + fbDiff*1.5 + baDiff*4;
    const similarity = Math.max(0, 1 - distance);
    if(similarity >= 0.65){
      const detail = `OVR ${otherCard.OVR} · ${otherArr[0]?.pHand==='L'?'좌':'우'}투 · 피안타 ${fmt3(otherBA)}`;
      similar.push({name:n, detail, similarity});
    }
  });
  similar.sort((a,b)=>b.similarity-a.similarity);
  const similarTop = similar.slice(0, 4);
  
  // ─ 추천 ─
  const recommendation = [];
  
  // FV 기반 추천
  if(fv >= 60){
    recommendation.push(`<b>🌟 핵심 자원</b> — 선발 로테이션 / 클로저급 활용 가능. 트레이드 시 최고 평가 받을 수 있음. <b>키핑 추천.</b>`);
  } else if(fv >= 55){
    recommendation.push(`<b>🌟 주전급</b> — 안정적 등판 가능. 4-5선발 / 셋업맨으로 활용. 트레이드 시 적정 평가.`);
  } else if(fv >= 50){
    recommendation.push(`<b>📊 백업/롱릴리프</b> — 특정 상황에 활용. 트레이드 시 보조 카드.`);
  } else if(fv >= 45){
    recommendation.push(`<b>📊 백업/중간계투</b> — 제한적 활용. 트레이드 시 마이너 자원.`);
  } else {
    recommendation.push(`<b>🔄 육성 또는 트레이드</b> — 현재 수준으로는 사용 어려움. 발전 필요 또는 정리.`);
  }
  
  // 라인업/매치업 시 추천 (V9.7 WBD 환경 보정: 평균 .377 → 약점 .420, 봉쇄 .280)
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    if(data.splits.vsL.ba >= 0.420 && data.splits.vsR.ba < 0.280){
      recommendation.push(`<b>🎯 우타 위주 상황에 등판</b> — 좌타 라인업 만나면 위험. 매치업 신중.`);
    } else if(data.splits.vsR.ba >= 0.420 && data.splits.vsL.ba < 0.280){
      recommendation.push(`<b>🎯 좌타 위주 상황에 등판</b> — 우타 라인업 만나면 위험. 매치업 신중.`);
    } else if(data.splits.vsL.ba < 0.280 && data.splits.vsR.ba < 0.280){
      recommendation.push(`<b>🎯 매치업 무관 등판 가능</b> — 좌우 모두 봉쇄. 어떤 라인업에도 OK.`);
    }
  }
  
  // 잠재력 추천
  if(potentialBoost >= 1){
    recommendation.push(`<b>📈 잠재력 ${potentialTier.label}</b> — 현재(${currentTier.label})보다 상위 가능성. 발전 포인트 (${development.length>0?development[0].replace(/<[^>]*>/g,'').slice(0,30):'-'}...) 개선시 등급 상승 기대.`);
  } else {
    recommendation.push(`<b>📊 잠재력 ${potentialTier.label}</b> — 현재 등급에 안착. 큰 변동 없을 가능성.`);
  }
  
  // ─ 역할 추천 배지 (큰 카드의 FV 라벨과 동일 기준 - 선수 평가는 절대 평가) ─
  // roleInfo.short를 사용 → 큰 카드의 long 라벨과 같은 알고리즘
  const roleBadge = roleInfo.short;
  const roleBadgeColor = roleInfo.color;
  
  // ─ 스카우터 총평 (Scout's Note) ─
  // 한 단락으로 "이 선수가 어떤 선수인지" 자연어 종합
  let scoutNote = '';
  
  // 1. 현재 수준 + 유형
  const handStr = data.pHand==='L'?'좌투':'우투';
  let levelStr;
  if(fv >= 60) levelStr = '주전급 이상';
  else if(fv >= 50) levelStr = '주전 후보';
  else if(fv >= 45) levelStr = '백업/롱릴리프';
  else levelStr = '육성 단계';
  
  // 핵심 무기 (가장 높은 grade)
  const sortedG = grades.slice().sort((a,b)=>b.value-a.value);
  const topG = sortedG[0], topG2 = sortedG[1];
  const weakG = sortedG[sortedG.length-1];
  
  let weaponStr = '';
  if(topG.value >= 60){
    weaponStr = `<b style="color:${topG.value>=70?'#ff4560':'#ff8c44'}">${topG.label.split(' ')[0]}</b>이 핵심 무기`;
    if(topG2.value >= 55) weaponStr += `이며, ${topG2.label.split(' ')[0]}도 강점`;
  } else {
    weaponStr = '특별히 두드러진 무기 없이 균형형';
  }
  
  // 약점 표현
  let weakStr = '';
  if(weakG.value <= 40){
    weakStr = `다만 ${weakG.label.split(' ')[0]}이 약점`;
  } else if(weakG.value <= 45){
    weakStr = `${weakG.label.split(' ')[0]}은 다소 부족하지만 활용 가능`;
  }
  
  // 성격 (좌우, 안정성)
  let traitStr = '';
  if(data.gameVariability != null){
    if(data.gameVariability < 0.08) traitStr = '경기별 매우 안정적';
    else if(data.gameVariability >= 0.15) traitStr = '경기별 기복이 큼';
  }
  
  // 좌우 특성
  let lrStr = '';
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const diff = data.splits.vsL.ba - data.splits.vsR.ba;
    if(Math.abs(diff) >= 0.080){
      const strong = diff < 0 ? '좌타' : '우타';
      lrStr = `${strong}에 특히 강한 매치업`;
    }
  }
  
  // 결정구
  let kPitchStr = '';
  const bestK = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.swings >= 15 && d.whiffPct >= 40)
    .sort((a,b)=>b[1].whiffPct-a[1].whiffPct)[0];
  if(bestK){
    kPitchStr = `<b>${bestK[0]}</b>로 헛스윙(${bestK[1].whiffPct.toFixed(0)}%) 유도하는 결정구 보유`;
  }
  
  // 조합
  scoutNote = `${handStr}이며 ${levelStr}. ${weaponStr}.`;
  if(kPitchStr) scoutNote += ` ${kPitchStr}.`;
  if(weakStr) scoutNote += ` ${weakStr}.`;
  if(lrStr) scoutNote += ` ${lrStr}이고`;
  if(traitStr) scoutNote += `${lrStr?', ':' '}${traitStr}.`;
  else if(lrStr) scoutNote += '.';
  
  // 운영 권장
  let opStr = '';
  if(fv >= 60){
    if(data.bbPct < 5 && data.gameVariability != null && data.gameVariability < 0.12) opStr = ` <b>선발진 핵심 자원</b>으로 추천.`;
    else if(data.overall.whiffPct >= 30) opStr = ` <b>중요 상황 등판 가능한 필승조</b>로 활용 추천.`;
    else opStr = ` <b>주전급 활용</b> 가능.`;
  } else if(fv >= 50){
    opStr = ` <b>특정 매치업 / 롱릴리프</b>로 활용. 발전 여지 있음.`;
  } else {
    opStr = ` 현재 수준은 제한적이나 <b>${development.length>0?development[0].replace(/<[^>]*>/g,'').slice(0,15)+'...':'개선 포인트 다수'}</b> 가능.`;
  }
  scoutNote += opStr;
  
  return {
    grades, pitchGrades, summary, strengths, weaknesses, development,
    similar: similarTop, recommendation,
    fv, fvLabel, fvColor,
    currentGrade: currentTier.grade, currentGradeLabel: currentTier.label, currentGradeColor: currentTier.color,
    potentialGrade: potentialTier.grade, potentialGradeLabel: potentialTier.label, potentialGradeColor: potentialTier.color,
    roleBadge, roleBadgeColor,
    scoutNote
  };
};
}

export function initialize(wbdContext) {

}
