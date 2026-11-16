/** scout-batter-grades: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:23710
wbdContext._generateScoutReportBatter = function _generateScoutReportBatter(data){ return wbdContext._memoByGame('_generateScoutReportBatter', data&&data.name, ()=>wbdContext._generateScoutReportBatter__raw(data)); };

// Original index.html:23711
wbdContext._generateScoutReportBatter__raw = function _generateScoutReportBatter__raw(data){
  const c = data.card;
  const lg = wbdContext._scoutLeagueAvgs();
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  
  const pctileTo80 = (myValue, lgValues, higherBetter=true) => {
    if(!lgValues || lgValues.length < 5) return 50;
    const sorted = lgValues.slice().sort((a,b)=>a-b);
    let pct = higherBetter
      ? sorted.filter(v => v <= myValue).length / sorted.length
      : sorted.filter(v => v >= myValue).length / sorted.length;
    return Math.round((20 + pct * 60) / 5) * 5;
  };
  
  // 리그 통계
  const batterNames = window._cache.batterNames || [];
  const lgBA = [], lgEV = [], lgHH = [], lgChase = [], lgK = [], lgWalk = [], lgHRrate = [];
  batterNames.forEach(n => {
    const arr = wbdContext.getBatterDataByName(n);
    if(arr.length < 30) return;
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    if(ab > 10) lgBA.push(hits/ab);
    const bd = arr.filter(wbdContext._isInPlay);
    if(bd.length > 5){
      lgEV.push(bd.reduce((s,d)=>s+(+d.ev),0)/bd.length);
      lgHH.push(bd.filter(d=>wbdContext._isHardHit(d)).length/bd.length*100);
    }
    const outZ = arr.filter(d => {const zx=+d.zoneX, zy=+d.zoneY; return !(zx>=-1 && zx<=1 && zy>=-1 && zy<=1);});
    if(outZ.length >= 10) lgChase.push(outZ.filter(d=>d.bSwing).length/outZ.length*100);
    const sw = arr.filter(d=>d.bSwing).length;
    const wh = arr.filter(d=>(d.bSwing && +d.call!==2)).length;
    if(sw > 20) lgK.push(wh/sw*100);
    const bb = arr.filter(d=>+d.result===5).length;
    lgWalk.push(bb/arr.length*100);
    const hrs = arr.filter(d=>+d.result===4).length;
    lgHRrate.push(hrs/arr.length*100);
  });
  
  // 타자 raw 데이터
  const myAll = wbdContext.getBatterDataByName(data.name);
  const myBD = myAll.filter(wbdContext._isInPlay);
  const myAvgEV = myBD.length > 0 ? myBD.reduce((s,d)=>s+(+d.ev),0)/myBD.length : 0;
  const myHHcount = myBD.filter(d => wbdContext._isHardHit(d)).length;
  const myHHpct = myBD.length > 0 ? myHHcount/myBD.length*100 : 0;
  const myHR = myAll.filter(d => +d.result===4).length;
  const myHRrate = myAll.length>0 ? myHR/myAll.length*100 : 0;
  const myBB = myAll.filter(d => +d.result===5).length;
  const myBBrate = myAll.length>0 ? myBB/myAll.length*100 : 0;
  const mySwings = myAll.filter(d=>d.bSwing).length;
  const myWhiffs = myAll.filter(d=>(d.bSwing && +d.call!==2)).length;
  const myWhiffPct = mySwings>0 ? myWhiffs/mySwings*100 : 0;
  const overallBA = (data.splits.vsL.ab + data.splits.vsR.ab) > 0
    ? (data.splits.vsL.hits + data.splits.vsR.hits) / (data.splits.vsL.ab + data.splits.vsR.ab)
    : 0;
  
  // ─ 타자 평가 (raw 데이터 기반, 3핵심 항목만 - 측정 가능한 것만) ─
  // 1. Hit (컨택/타율)
  const hitGrade = pctileTo80(overallBA, lgBA);
  const hitNote = `타율 ${fmt3(overallBA)} (리그 평균 ${fmt3(lgBA.length?lgBA.reduce((s,v)=>s+v,0)/lgBA.length:0.250)}) · 헛스윙 ${myWhiffPct.toFixed(0)}%`;
  
  // 2. Power (파워/EV/하드힛/HR)
  const evGrade = myAvgEV > 0 ? pctileTo80(myAvgEV, lgEV) : 50;
  const hhGrade = myHHpct > 0 ? pctileTo80(myHHpct, lgHH) : 50;
  const hrGrade = pctileTo80(myHRrate, lgHRrate);
  const powerGrade = Math.round((evGrade + hhGrade + hrGrade) / 3 / 5) * 5;
  const powerNote = `평균 EV ${myAvgEV.toFixed(1)}mph · 하드힛 ${myHHpct.toFixed(1)}% · HR ${myHR} (${myHRrate.toFixed(2)}%/타석)`;
  
  // 3. Eye (선구안 - 체이스 + BB)
  const chaseGrade = data.chaseN >= 30 ? pctileTo80(data.chasePct, lgChase, false) : 50;
  const eyeGrade = chaseGrade;
  const eyeNote = `체이스율 ${data.chasePct.toFixed(1)}% · BB% ${myBBrate.toFixed(1)}`;
  
  // 호환성을 위해 다른 곳에서 참조하는 변수 유지 (FV 계산엔 사용 안 함)
  const disciplineScore = hitGrade;
  const clutchScore = hitGrade;
  let clutchBA = data.splits.dis.n >= 30 ? data.splits.dis.ba : null;
  let versScore = 50;
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const diff = Math.abs(data.splits.vsL.ba - data.splits.vsR.ba);
    versScore = diff <= 0.050 ? 60 : diff <= 0.080 ? 55 : diff <= 0.120 ? 45 : 35;
  }
  
  const grades = [
    {key:'hit', label:'컨택 (Hit)', value:hitGrade, note:hitNote},
    {key:'power', label:'파워 (Power)', value:powerGrade, note:powerNote},
    {key:'eye', label:'선구안 (Eye)', value:eyeGrade, note:eyeNote}
  ];
  
  // ─ FV ─ (3핵심 항목 가중치)
  const fv = Math.round((hitGrade*0.40 + powerGrade*0.35 + eyeGrade*0.25) / 5) * 5;
  let fvLabel, fvColor;
  if(fv >= 70) { fvLabel = 'STAR / FRANCHISE (슈퍼스타)'; fvColor = '#ff4560'; }
  else if(fv >= 60) { fvLabel = 'ALL-STAR (올스타급)'; fvColor = '#ff8c44'; }
  else if(fv >= 55) { fvLabel = 'EVERYDAY REGULAR (주전)'; fvColor = '#ffd700'; }
  else if(fv >= 50) { fvLabel = 'AVERAGE REGULAR / PLATOON (백업/플래툰)'; fvColor = '#88ccff'; }
  else if(fv >= 45) { fvLabel = 'BENCH / RESERVE (벤치)'; fvColor = '#888'; }
  else { fvLabel = 'ORG DEPTH / AAAA (육성)'; fvColor = '#666'; }
  
  // ─ 현재 등급 ─
  const currentTier = c.OVR >= 100 ? {grade:'AA', label:'슈퍼스타급', color:'#ff4560'}
                    : c.OVR >= 90 ? {grade:'A+', label:'올스타급', color:'#ff8c44'}
                    : c.OVR >= 80 ? {grade:'A', label:'주전급', color:'#ffd700'}
                    : c.OVR >= 70 ? {grade:'B+', label:'평균 주전급', color:'#39ff8a'}
                    : c.OVR >= 60 ? {grade:'B', label:'백업/유망주급', color:'#88ccff'}
                    : {grade:'C', label:'육성 단계', color:'#888'};
  
  // 잠재력
  let potentialBoost = 0;
  if(data.total < 100) potentialBoost = 1;
  if(powerGrade >= 60 || hitGrade >= 60) potentialBoost += 0.5;
  if(eyeGrade >= 60 && hitGrade <= 50) potentialBoost += 0.5;  // 선구안 좋고 타율 낮으면 발전 여지
  
  const potentialTiers = [
    {grade:'C', label:'육성 단계', color:'#888'},
    {grade:'B', label:'백업급', color:'#88ccff'},
    {grade:'B+', label:'평균 주전급', color:'#39ff8a'},
    {grade:'A', label:'주전급', color:'#ffd700'},
    {grade:'A+', label:'올스타급', color:'#ff8c44'},
    {grade:'AA', label:'슈퍼스타급', color:'#ff4560'}
  ];
  const currentIdx = potentialTiers.findIndex(t => t.grade === currentTier.grade);
  const potentialIdx = Math.min(potentialTiers.length-1, currentIdx + Math.round(potentialBoost));
  const potentialTier = potentialTiers[potentialIdx];
  
  // ─ 종합 평가 ─
  const summary = [];
  let headlineParts = [];
  if(hitGrade >= 60) headlineParts.push('정밀 컨택');
  if(powerGrade >= 60) headlineParts.push('강한 파워');
  if(eyeGrade >= 60) headlineParts.push('뛰어난 선구안');
  if(!headlineParts.length){
    if(hitGrade <= 40) headlineParts.push('약한 컨택');
    if(powerGrade <= 40) headlineParts.push('파워 부족');
  }
  const headline = headlineParts.length ? `<b>${headlineParts.join(' · ')}</b> 을 갖춘` : '<b>평균적</b> 수준의';
  summary.push(`${data.bZone==='L'?'좌타':'우타'}, ${headline} 타자. 실전 타율 ${fmt3(overallBA)} · HR ${myHR}.`);
  
  // 타격 스타일
  let style = '';
  if(eyeGrade >= 55 && powerGrade >= 55 && hitGrade >= 55) style = '<b>완전체 타입</b> — 컨택·파워·선구 모두 균형';
  else if(powerGrade >= 60 && hitGrade <= 50) style = '<b>슬러거 타입</b> — 파워 위주, 컨택은 부족';
  else if(hitGrade >= 60 && powerGrade <= 50) style = '<b>컨택 타입</b> — 정확한 타격, 파워는 평균';
  else if(eyeGrade >= 60 && hitGrade <= 50) style = '<b>선구형 타입</b> — 출루 능력 위주';
  else if(hitGrade <= 40 && powerGrade <= 40) style = '<b>전반적 약함</b> — 모든 영역에서 부족';
  else style = '<b>균형형</b> — 특정 스타일 분류 어려움';
  summary.push(`타격 스타일: ${style}`);
  
  // 핵심 스플릿
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const lba = data.splits.vsL.ba, rba = data.splits.vsR.ba;
    let splitNote = `vs좌투 ${fmt3(lba)} / vs우투 ${fmt3(rba)}`;
    if(Math.abs(lba - rba) >= 0.080){
      const better = lba > rba ? '좌투' : '우투';
      splitNote += ` — <b style="color:#ffd700">${better}에 강함</b> (차이 ${(Math.abs(lba-rba)*1000).toFixed(0)})`;
    } else {
      splitNote += ` — 좌우 균등`;
    }
    summary.push(splitNote);
  }
  
  // 카운트 스타일
  if(data.firstPitchN >= 20){
    let cstyle;
    if(data.firstPitchSwingPct >= 40) cstyle = '<b>적극형</b> — 초구부터 휘두름';
    else if(data.firstPitchSwingPct <= 18) cstyle = '<b>관망형</b> — 카운트 끌고 가서 승부';
    else cstyle = '<b>균형형</b>';
    summary.push(`카운트 스타일: ${cstyle} (초구 스윙 ${data.firstPitchSwingPct.toFixed(0)}% · 체이스 ${data.chasePct.toFixed(1)}%)`);
  }
  
  // ─ 강점 ─
  const strengths = [];
  if(hitGrade >= 60) strengths.push(`<b>컨택 ${hitGrade}</b> — 타율 ${fmt3(overallBA)}, 헛스윙 ${myWhiffPct.toFixed(0)}%. 변화구도 잘 맞춤.`);
  if(powerGrade >= 60) strengths.push(`<b>파워 ${powerGrade}</b> — EV ${myAvgEV.toFixed(1)}mph, 하드힛 ${myHHpct.toFixed(0)}%, HR ${myHR}. 한방 위협 큼.`);
  if(eyeGrade >= 60) strengths.push(`<b>선구 ${eyeGrade}</b> — 체이스 ${data.chasePct.toFixed(1)}%, BB% ${myBBrate.toFixed(1)}. 유인구 안 통함.`);
  // 좌우 편차 강점/약점은 별도 (clutchScore/versScore 항목 제거됨)
  if(clutchBA !== null && clutchBA >= 0.260) strengths.push(`<b>위기 상황 강함</b> — 불리 카운트(0-1, 1-2 등)에서 타율 ${fmt3(clutchBA)}. 카운트 끌려도 안 무너짐.`);
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30 && versScore >= 55){
    strengths.push(`<b>좌우 균등</b> — 좌우투 편차 적음. 매치업 가리지 않음.`);
  }
  
  // 핫존 (V9.7 WBD 환경 보정: BA .350 → .450 이상이 진짜 핫존)
  const zoneLabels = wbdContext.zoneCourseLabels(data.bZone);  // V9.9: 타자 시점
  const hotZones = data.zoneStats.map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0}))
    .filter(z => z.ab >= 5 && z.hitRate >= 45).sort((a,b)=>b.hitRate-a.hitRate).slice(0, 2);
  hotZones.forEach(z => {
    strengths.push(`<b>${zoneLabels[z.i]} 핫존</b> — 타율 ${fmt3(z.hitRate/100)} (${z.hits}/${z.ab}). 이 코스 잘 침.`);
  });
  
  // 구종별 강점 (V9.7 WBD 환경 보정: 평균 .333 → 강타 기준 .420)
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.ab >= 8 && d.ba >= 0.420){
      strengths.push(`<b>${g} 강타</b> — 타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}, HR ${d.hr}).`);
    }
  });
  
  if(!strengths.length) strengths.push('데이터상 두드러진 강점 없음.');
  
  // ─ 약점 ─
  const weaknesses = [];
  if(hitGrade <= 40) weaknesses.push(`<b>컨택 ${hitGrade}</b> — 타율 ${fmt3(overallBA)}, 헛스윙 ${myWhiffPct.toFixed(0)}%. 결정구로 쉽게 잡힘.`);
  if(powerGrade <= 40) weaknesses.push(`<b>파워 ${powerGrade}</b> — EV ${myAvgEV.toFixed(1)}, 하드힛 ${myHHpct.toFixed(0)}%. 한방 위협 거의 없음.`);
  if(eyeGrade <= 40) weaknesses.push(`<b>선구 ${eyeGrade}</b> — 체이스 ${data.chasePct.toFixed(1)}%. 유인구에 자주 속음.`);
  if(clutchBA !== null && clutchBA < 0.190) weaknesses.push(`<b>위기 약함</b> — 불리 카운트 타율 ${fmt3(clutchBA)}. 카운트 잡히면 무력.`);
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30 && versScore <= 40){
    const diff = Math.abs(data.splits.vsL.ba - data.splits.vsR.ba);
    const weakSide = data.splits.vsL.ba < data.splits.vsR.ba ? '좌투' : '우투';
    weaknesses.push(`<b>좌우 편차 큼</b> — ${weakSide}에 약함 (차이 ${(diff*1000).toFixed(0)}). 매치업 가림.`);
  }
  
  // 좌우 약점
  if(data.splits.vsL.n >= 30 && data.splits.vsL.ba <= 0.220){
    weaknesses.push(`<b>좌투 약점</b> — vs좌투 ${fmt3(data.splits.vsL.ba)}. 좌투 상대 대타 필요.`);
  }
  if(data.splits.vsR.n >= 30 && data.splits.vsR.ba <= 0.220){
    weaknesses.push(`<b>우투 약점</b> — vs우투 ${fmt3(data.splits.vsR.ba)}. 우투 상대 대타 필요.`);
  }
  
  // 콜드존
  const coldZones = data.zoneStats.map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0}))
    .filter(z => z.n >= 10).sort((a,b)=>a.hitRate-b.hitRate).slice(0, 1);
  coldZones.forEach(z => {
    if(z.hitRate < 18){
      weaknesses.push(`<b>${zoneLabels[z.i]} 콜드존</b> — 타율 ${fmt3(z.hitRate/100)}. 이 코스 못 침.`);
    }
  });
  
  // 구종별 약점
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.ab >= 8 && d.ba <= 0.240){
      weaknesses.push(`<b>${g} 약점</b> — 타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 결정구로 잡힘.`);
    }
    if(d.swings >= 10 && d.whiffPct >= 50){
      weaknesses.push(`<b>${g} 헛스윙</b> — 헛스윙 ${d.whiffPct.toFixed(0)}%. 결정구로 매우 효과적.`);
    }
  });
  
  if(!weaknesses.length) weaknesses.push('데이터상 두드러진 약점 없음.');
  
  // ─ 발전 방향 (자세하게 이유 + 구체 방법) ─
  const development = [];
  
  // 1. 컨택 개선 (헛스윙 / 헛스윙 코스)
  if(hitGrade <= 50 && myWhiffPct >= 28){
    let line = `<b>🎯 컨택 개선</b> — 헛스윙 ${myWhiffPct.toFixed(0)}% (25% 이하 목표).`;
    // 어느 구종에 헛스윙 많은지
    const whiffPitches = Object.entries(data.groupDetails)
      .filter(([g,d]) => d.swings >= 10 && d.whiffPct >= 35)
      .sort((a,b) => b[1].whiffPct - a[1].whiffPct);
    if(whiffPitches.length){
      line += `<br>• 약한 구종: ${whiffPitches.slice(0,2).map(([g,d]) => `<b>${g}</b> 헛스윙 ${d.whiffPct.toFixed(0)}%`).join(', ')}`;
    }
    // 어느 코스에 헛스윙 많은지
    const cAll = data.courseAll;
    const courseIssues = [];
    if(data.high.n >= 15 && data.high.whiffRate >= 35) courseIssues.push(`높은 공 헛스윙 ${data.high.whiffRate.toFixed(0)}%`);
    if(data.low.n >= 15 && data.low.whiffRate >= 35) courseIssues.push(`낮은 공 헛스윙 ${data.low.whiffRate.toFixed(0)}%`);
    if(courseIssues.length){
      line += `<br>• 약한 코스: ${courseIssues.join(' / ')}`;
    }
    line += `<br>• 방법: 약한 구종/코스 컨택 훈련, 스윙 판단력 향상 (특히 2스트라이크 컷팅 능력)`;
    development.push(line);
  }
  
  // 2. 선구안 (체이스 / 어디 코스 체이스)
  if(eyeGrade <= 50 && data.chasePct >= 32){
    let line = `<b>👁️ 선구안 향상</b> — 체이스율 ${data.chasePct.toFixed(1)}% (28% 이하 목표).`;
    line += `<br>• 영향: 유인구로 잡히기 쉬움, BB% ${myBBrate.toFixed(1)}로 출루 능력 제한`;
    // 어느 구종에 잘 속는지
    const trapped = Object.entries(data.groupDetails)
      .filter(([g,d]) => d.swings >= 10 && d.whiffPct >= 40 && d.ba !== null && d.ba < 0.250)
      .sort((a,b) => b[1].whiffPct - a[1].whiffPct);
    if(trapped.length){
      line += `<br>• 잘 속는 구종: ${trapped.slice(0,2).map(([g])=>`<b>${g}</b>`).join(', ')}`;
    }
    line += `<br>• 방법: 존 인식 훈련 / 변화구 식별 (구종별 궤적 학습) / 2스트라이크 전 인내심`;
    development.push(line);
  }
  
  // 3. 파워 향상
  if(powerGrade <= 45 && myAvgEV < 90){
    let line = `<b>💥 파워 향상</b> — 평균 EV ${myAvgEV.toFixed(1)}mph (92+ 목표).`;
    line += `<br>• 영향: 하드힛 ${myHHpct.toFixed(0)}% · HR ${myHR}개로 한방 위협 적음`;
    // 발사각 정보 (lDeg)
    const myAll = wbdContext.getBatterDataByName(data.name).filter(d => wbdContext._isInPlay(d));
    if(myAll.length >= 10){
      const avgLdeg = myAll.reduce((s,d)=>s+(+d.ldeg || 0), 0)/myAll.length;
      if(avgLdeg < 8){
        line += `<br>• 원인 추정: 발사각 평균 ${avgLdeg.toFixed(1)}° (낮음) — 땅볼 위주, 어퍼컷 필요`;
      } else if(avgLdeg > 25){
        line += `<br>• 원인 추정: 발사각 ${avgLdeg.toFixed(1)}° (높음) — 뜬공 위주, 라인드라이브 각도 필요`;
      }
    }
    line += `<br>• 방법: 스윙 메커닉 개선 (발사각 10-25° 영역 늘리기), 어퍼컷 + 강한 임팩트`;
    development.push(line);
  }
  
  // 4. 좌/우 편차
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const diff = data.splits.vsL.ba - data.splits.vsR.ba;
    if(Math.abs(diff) >= 0.080){
      const weakSide = diff < 0 ? '좌투' : '우투';
      const weakStats = diff < 0 ? data.splits.vsL : data.splits.vsR;
      let line = `<b>🆚 ${weakSide} 대응 개선</b> — vs${weakSide} ${fmt3(weakStats.ba)} (${weakStats.hits}/${weakStats.ab}).`;
      
      // 어느 구종에 잘리는지
      const handFilter = weakSide === '좌투' ? 'L' : 'R';
      const vsHand = wbdContext.getBatterDataByName(data.name).filter(d => String(d.pHand).toUpperCase() === handFilter);
      const handByGroup = {};
      vsHand.forEach(d => {
        const g = wbdContext.pitchGroup(d.pType, d);
        if(!g || g === '기타') return;
        if(!handByGroup[g]) handByGroup[g] = [];
        handByGroup[g].push(d);
      });
      const handPitchStats = Object.entries(handByGroup)
        .filter(([g, arr]) => arr.length >= 8)
        .map(([g, arr]) => {
          const hits = arr.filter(wbdContext._isHit).length;
          const ab = arr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
          return {g, ba: ab>0?hits/ab:0, n:arr.length, ab};
        })
        .filter(s => s.ab >= 4)
        .sort((a,b) => a.ba - b.ba);
      if(handPitchStats.length){
        line += `<br>• 가장 약한 구종 (${weakSide} 상대): <b>${handPitchStats[0].g}</b> ${fmt3(handPitchStats[0].ba)}`;
      }
      line += `<br>• 방법: ${weakSide} 변화구 패턴 학습 (특히 ${weakSide==='좌투'?'좌투의 슬라이더/체인지업':'우투의 슬라이더/커브'}), 매치업 분석`;
      development.push(line);
    }
  }
  
  // 5. 카운트 약점
  if(data.splits.dis.n >= 30 && data.splits.dis.ba <= 0.240){
    let line = `<b>📉 불리 카운트 대응</b> — 0-1, 1-2 등에서 타율 ${fmt3(data.splits.dis.ba)}.`;
    line += `<br>• 영향: 카운트 끌려가면 거의 잡힘. 헛스윙 ${data.splits.dis.whiffPct.toFixed(0)}%`;
    line += `<br>• 방법: 2스트라이크 컷팅 / 디펜스 스윙 능력 향상, 카운트별 스윙존 좁히는 훈련`;
    development.push(line);
  }
  
  // 6. 콜드존
  if(coldZones.length && coldZones[0].hitRate < 18){
    const cz = coldZones[0];
    let line = `<b>❄️ ${zoneLabels[cz.i]} 코스 보완</b> — 타율 ${fmt3(cz.hitRate/100)} (${cz.hits}/${cz.ab}).`;
    // 그 코스에서 어느 구종이 약한지
    const inThisZone = wbdContext.G.filter(d => {
      if(d.bName !== data.name) return false;
      const zx = +d.zoneX, zy = +d.zoneY;
      if(zx<-1||zx>1||zy<-1||zy>1) return false;
      const ci = zx<-0.33?0:zx<0.33?1:2;
      const ri = zy>0.33?0:zy>-0.33?1:2;
      return ri*3 + ci === cz.i;
    });
    const inZoneByG = {};
    inThisZone.forEach(d => {
      const g = wbdContext.pitchGroup(d.pType, d);
      if(!g || g === '기타') return;
      if(!inZoneByG[g]) inZoneByG[g] = [];
      inZoneByG[g].push(d);
    });
    const zoneTopPitches = Object.entries(inZoneByG).sort((a,b)=>b[1].length-a[1].length).slice(0,2);
    if(zoneTopPitches.length){
      line += `<br>• 이 코스로 자주 들어오는 구종: ${zoneTopPitches.map(([g,arr])=>`<b>${g}</b> ${arr.length}개`).join(', ')}`;
    }
    line += `<br>• 방법: 이 코스로 들어오는 ${zoneTopPitches.length?zoneTopPitches[0][0]:'구종'} 식별 훈련, 해당 코스 타격 자세 점검`;
    development.push(line);
  }
  
  // 7. 약점 구종 (잘 못 치는 구종 - 코스별 분석까지)
  const weakPitches = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.ab >= 8 && d.ba <= 0.200)
    .sort((a,b) => a[1].ba - b[1].ba);
  if(weakPitches.length){
    const [g, d] = weakPitches[0];
    let line = `<b>⚾ ${g} 대응 개선</b> — 타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}).`;
    // 코스별 약점
    const courses = [
      {name:'몸쪽', d:d.inner},
      {name:'바깥쪽', d:d.outer},
      {name:'높은', d:d.high},
      {name:'낮은', d:d.low}
    ].filter(c => c.d.n >= 5 && c.d.ba !== null).sort((a,b) => a.d.ba - b.d.ba);
    if(courses.length && courses[0].d.ba < 0.240){
      line += `<br>• 특히 ${g} <b>${courses[0].name}</b> 코스에서 ${fmt3(courses[0].d.ba)} — 이 코스 집중 훈련`;
    }
    // 헛스윙 위주인지
    if(d.swings >= 10 && d.whiffPct >= 40){
      line += `<br>• 헛스윙 ${d.whiffPct.toFixed(0)}% — 구종 식별 능력 부족`;
    }
    line += `<br>• 방법: ${g} 궤적 분석 + 타이밍 훈련, 약한 코스 집중 BP`;
    development.push(line);
  }
  
  if(!development.length) development.push('현재 폼 유지. 큰 개선 포인트 없음.');
  
  // ─ 유사 선수 ─
  const similar = [];
  batterNames.forEach(n => {
    if(n === data.name) return;
    const other = wbdContext.calcBatterCard(n);
    if(!other || other.lowData) return;
    const otherArr = wbdContext.getBatterDataByName(n);
    if(otherArr.length < 50) return;
    const otherHits = otherArr.filter(wbdContext._isHit).length;
    const otherAB = otherArr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    const otherBA = otherAB>0 ? otherHits/otherAB : 0.250;
    const otherBD = otherArr.filter(wbdContext._isInPlay);
    const otherEV = otherBD.length>0 ? otherBD.reduce((s,d)=>s+(+d.ev),0)/otherBD.length : 0;
    const otherHR = otherArr.filter(d=>+d.result===4).length;
    
    const ovrDiff = Math.abs(other.OVR - c.OVR);
    const handMatch = otherArr[0]?.bZone === data.bZone ? 0 : 0.2;
    const baDiff = Math.abs(otherBA - overallBA);
    const evDiff = Math.abs(otherEV - myAvgEV);
    const hrDiff = Math.abs(otherHR - myHR);
    
    const distance = (ovrDiff/30)*0.4 + handMatch + baDiff*4 + (evDiff/15)*0.3 + (hrDiff/20)*0.2;
    const similarity = Math.max(0, 1 - distance);
    if(similarity >= 0.65){
      const detail = `OVR ${other.OVR} · ${otherArr[0]?.bZone==='L'?'좌':'우'}타 · 타율 ${fmt3(otherBA)} · HR ${otherHR}`;
      similar.push({name:n, detail, similarity});
    }
  });
  similar.sort((a,b)=>b.similarity-a.similarity);
  const similarTop = similar.slice(0, 4);
  
  // ─ 추천 ─
  const recommendation = [];
  
  if(fv >= 60){
    recommendation.push(`<b>🌟 핵심 자원</b> — 라인업 중심 (3~5번). 트레이드 시 최고 평가. <b>키핑 강력 추천.</b>`);
  } else if(fv >= 55){
    recommendation.push(`<b>🌟 주전급</b> — 라인업 고정 가능 (1~7번 어디든). 트레이드 시 적정 평가.`);
  } else if(fv >= 50){
    recommendation.push(`<b>📊 평균 주전/플래툰</b> — 특정 매치업 또는 하위타순. 트레이드 시 보조 카드.`);
  } else if(fv >= 45){
    recommendation.push(`<b>📊 백업/대타</b> — 제한적 활용. 트레이드 시 마이너 자원.`);
  } else {
    recommendation.push(`<b>🔄 육성 또는 트레이드</b> — 현재 수준으로는 사용 어려움.`);
  }
  
  // 매치업
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const lba = data.splits.vsL.ba, rba = data.splits.vsR.ba;
    if(lba >= 0.310 && rba <= 0.230){
      recommendation.push(`<b>🎯 좌투 등판시 핵심</b> — vs좌투 ${fmt3(lba)}. 좌투 만나면 라인업 상위. 우투 만나면 하위 또는 벤치.`);
    } else if(rba >= 0.310 && lba <= 0.230){
      recommendation.push(`<b>🎯 우투 등판시 핵심</b> — vs우투 ${fmt3(rba)}. 우투 만나면 라인업 상위. 좌투 만나면 하위 또는 벤치.`);
    } else if(lba >= 0.290 && rba >= 0.290){
      recommendation.push(`<b>🎯 매치업 무관</b> — 좌우 모두 강함. 어떤 투수에도 활용 가능.`);
    }
  }
  
  // 타순 추천
  if(powerGrade >= 60 && hitGrade >= 50){
    recommendation.push(`<b>🎯 타순 추천: 3-5번</b> — 파워와 컨택 모두 갖춤. 클린업 적합.`);
  } else if(eyeGrade >= 60 && hitGrade >= 50){
    recommendation.push(`<b>🎯 타순 추천: 1-2번</b> — 선구안 좋음. 테이블세터 적합.`);
  } else if(hitGrade >= 55){
    recommendation.push(`<b>🎯 타순 추천: 2번 / 6-7번</b> — 컨택 능력으로 안타 생산.`);
  }
  
  // 잠재력
  if(potentialBoost >= 1){
    recommendation.push(`<b>📈 잠재력 ${potentialTier.label}</b> — 현재(${currentTier.label})보다 상위 가능성. ${development.length>0?development[0].replace(/<[^>]*>/g,'').slice(0,30):'-'} 등 개선시 등급 상승.`);
  } else {
    recommendation.push(`<b>📊 잠재력 ${potentialTier.label}</b> — 현재 등급에 안착.`);
  }
  
  // ─ 역할 추천 배지 ─
  let roleBadge = '', roleBadgeColor = '#888';
  if(fv >= 65){
    roleBadge = '중심타선 핵심 (3-5번)';
    roleBadgeColor = '#ff4560';
  } else if(fv >= 60){
    if(powerGrade >= 60 && hitGrade >= 55){
      roleBadge = '중심타선 (3-5번)';
      roleBadgeColor = '#ff8c44';
    } else if(eyeGrade >= 60 && hitGrade >= 55){
      roleBadge = '리드오프 (1-2번)';
      roleBadgeColor = '#ff8c44';
    } else {
      roleBadge = '주전 라인업';
      roleBadgeColor = '#ff8c44';
    }
  } else if(fv >= 55){
    if(eyeGrade >= 55 && hitGrade >= 50){
      roleBadge = '상위타선 (1-2번)';
      roleBadgeColor = '#ffd700';
    } else if(powerGrade >= 55){
      roleBadge = '중심타선 (5-6번)';
      roleBadgeColor = '#ffd700';
    } else {
      roleBadge = '주전 (6-8번)';
      roleBadgeColor = '#ffd700';
    }
  } else if(fv >= 50){
    // 좌우 편차로 플래툰 여부
    if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
      const diff = Math.abs(data.splits.vsL.ba - data.splits.vsR.ba);
      if(diff >= 0.080){
        roleBadge = '플래툰 전용';
        roleBadgeColor = '#39ff8a';
      } else {
        roleBadge = '하위타선 (7-9번)';
        roleBadgeColor = '#39ff8a';
      }
    } else {
      roleBadge = '하위타선 / 백업';
      roleBadgeColor = '#39ff8a';
    }
  } else if(fv >= 45){
    roleBadge = '대타 카드 / 백업';
    roleBadgeColor = '#88ccff';
  } else {
    roleBadge = '육성 / 트라이아웃';
    roleBadgeColor = '#666';
  }
  
  // ─ 스카우터 총평 ─
  let scoutNote = '';
  const handStr = data.bZone==='L'?'좌타':'우타';
  let levelStr;
  if(fv >= 60) levelStr = '주전급 이상';
  else if(fv >= 50) levelStr = '주전 후보';
  else if(fv >= 45) levelStr = '백업/플래툰';
  else levelStr = '육성 단계';
  
  const sortedG = grades.slice().sort((a,b)=>b.value-a.value);
  const topG = sortedG[0], topG2 = sortedG[1];
  const weakG = sortedG[sortedG.length-1];
  
  let weaponStr = '';
  if(topG.value >= 60){
    weaponStr = `<b style="color:${topG.value>=70?'#ff4560':'#ff8c44'}">${topG.label.split(' ')[0]}</b>이 핵심 무기`;
    if(topG2.value >= 55) weaponStr += `, ${topG2.label.split(' ')[0]}도 강점`;
  } else if(topG.value >= 50){
    weaponStr = `특별히 두드러진 강점 없는 균형형`;
  } else {
    weaponStr = `전반적으로 평균 미만`;
  }
  
  let weakStr = '';
  if(weakG.value <= 40){
    weakStr = `다만 ${weakG.label.split(' ')[0]}이 약점`;
  } else if(weakG.value <= 45){
    weakStr = `${weakG.label.split(' ')[0]}은 다소 부족`;
  }
  
  // 좌우
  let lrStr = '';
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const diff = data.splits.vsL.ba - data.splits.vsR.ba;
    if(Math.abs(diff) >= 0.080){
      const strong = diff > 0 ? '좌투' : '우투';
      lrStr = `${strong}에 특히 강함`;
    }
  }
  
  // 핫존 (V9.7 WBD 환경 보정: 평균 .333 → 진짜 핫존 .450+, p75)
  const myZ = data.zoneStats || [];
  const myHotZones = myZ.map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0}))
    .filter(z => z.ab >= 5 && z.hitRate >= 45).sort((a,b)=>b.hitRate-a.hitRate);
  const zoneLabelsForNote = wbdContext.zoneCourseLabels(data.bZone);  // V9.9: 타자 시점
  let hotStr = '';
  if(myHotZones.length){
    hotStr = `<b>${zoneLabelsForNote[myHotZones[0].i]}</b> 코스 핫존 보유`;
  }
  
  // 좋아하는 구종 (V9.7 WBD 환경 보정: 평균 .333 → .400+)
  const topPitch = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.ab >= 8 && d.ba >= 0.400)
    .sort((a,b)=>b[1].ba-a[1].ba)[0];
  let pitchStr = '';
  if(topPitch){
    pitchStr = `<b>${topPitch[0]}</b>에 강함 (${fmt3(topPitch[1].ba)})`;
  }
  
  scoutNote = `${handStr}, ${levelStr}. ${weaponStr}.`;
  if(hotStr) scoutNote += ` ${hotStr}하고`;
  if(pitchStr) scoutNote += `${hotStr?', ':' '}${pitchStr}`;
  if(hotStr || pitchStr) scoutNote += '.';
  if(weakStr) scoutNote += ` ${weakStr}.`;
  if(lrStr) scoutNote += ` ${lrStr}.`;
  
  // 운영 권장
  let opStr = '';
  if(fv >= 60){
    if(powerGrade >= 60) opStr = ` <b>중심타선 (3-5번) 핵심</b>으로 추천.`;
    else if(eyeGrade >= 60) opStr = ` <b>상위타선 (1-2번)</b>에서 출루 기대.`;
    else opStr = ` <b>주전 라인업 핵심</b>으로 활용.`;
  } else if(fv >= 50){
    if(lrStr) opStr = ` 매치업에 따라 <b>플래툰</b> 활용 추천.`;
    else opStr = ` <b>하위타선 / 백업</b> 활용.`;
  } else {
    opStr = ` 현재 수준은 제한적이나 <b>${development.length>0?development[0].replace(/<[^>]*>/g,'').slice(0,15)+'...':'개선 포인트 다수'}</b>로 발전 가능.`;
  }
  scoutNote += opStr;
  
  return {
    grades, summary, strengths, weaknesses, development,
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
