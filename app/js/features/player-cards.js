/** player-cards: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:7293
wbdContext.calcPitcherCard = function calcPitcherCard(name){
  const k = String(name);
  const c = window._cache.pitcherCard;
  if(c[k] !== undefined) return c[k];
  c[k] = wbdContext._calcPitcherCardImpl(name);
  return c[k];
};

// Original index.html:7300
wbdContext._calcPitcherCardImpl = function _calcPitcherCardImpl(name){
  const pd=wbdContext.getPitcherDataByName(name);
  if(!pd.length)return null;
  // 경기 수 기반 동적 기준
  const minP=Math.max(5,wbdContext.G.length*0.005);
  const lowDataP=pd.length<minP;

  const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
  const pw=(v,mn,mx,exp)=>Math.round(Math.max(30,Math.pow(Math.max(0,v-mn)/Math.max(1,mx-mn),exp)*69+30));
  const toStat=(v,mn,mx)=>Math.round(Math.max(30,(v-mn)/Math.max(1,mx-mn)*69+30));
  const fbGroups=['포심','투심','커터','패스트볼'];

  // 구속: 직구계열 평균구속
  const spds=pd.filter(d=>d.spdK>0).map(d=>+d.spdK);
  const avgSpd=avg(spds);
  const fbSpdArr=pd.filter(d=>d.spdK>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType))).map(d=>+d.spdK);
  const avgFbSpd=fbSpdArr.length?avg(fbSpdArr):avgSpd;
  const SPD=pw(avgFbSpd,118.3,138.14,1.5); // V12.0 재보정 (p10 55/p50 80/p90 93/max 100)

  // 구위 (V12.0 재설계): 결과(피안타율·피홈런·K/타석) + 과정(구속·무브 조합 기대 헛스윙, 평균 피EV)
  //   이전 식은 피안타·피EV·배럴·배럴+·존내헛스윙·체이스 7개 항목이 같은 타구질을 중복 집계했고 삼진이 빠져 있었음.
  //   검증(투수 47명): ERA 연동 −.65→−.80, 피OPS 연동 −.73→−.92, 반기 반복성 .24→.28
  const battedPd=pd.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
  const baHits=battedPd.filter(wbdContext._isHit).length;
  const baHrs=battedPd.filter(d=>d.result===4).length;
  const baAgainst=battedPd.length?baHits/battedPd.length:0.45;
  const hrAgainst=battedPd.length?baHrs/battedPd.length*100:4.3;
  const avgEvAgainst=battedPd.length?battedPd.reduce((s,d)=>s+(+d.ev),0)/battedPd.length:100.8;
  const paN=wbdContext._countPaEnd(pd).length;
  const kPA=paN?pd.filter(d=>wbdContext._isK(d)&&!wbdContext._isHit(d)).length/paN*100:18;          // K/타석% (리그 ≈18)
  const xwObj=(typeof wbdContext._xWhiffArr==='function')?wbdContext._xWhiffArr(pd):{x:null};
  const lgXW=(typeof wbdContext._srPools==='function')?wbdContext._srMean(wbdContext._srPools().P.xWhiff):null;
  const xwDelta=(xwObj.x!=null&&lgXW!=null)?(xwObj.x-lgXW):0;                 // 기대 헛스윙 리그 대비(p)
  const domScore=(0.48-baAgainst)*120+(7.0-Math.min(7,hrAgainst))*6+(kPA-18)*1.5+xwDelta*2.5+(100.2-avgEvAgainst)*2;
  const DOM=pw(domScore,-41.12,50.62,0.7);  // V12.0 재보정 (p10 56/p50 79/p90 97/max 107 — 바닥 뭉침 해소)

  // 제구 (V7.15 수정): zoneX/Y 둘 다 -1~1 대칭 · 공 반지름 감안 보더 0.85~1.15
  const bb=pd.filter(d=>d.result===5||d.result===6).length;
  const bbPct=pd.length?bb/pd.length*100:10;
  const bbScore=Math.min(115,Math.max(30,Math.pow(Math.max(0,4.0-bbPct)/4.0,1.0)*78+38));
  let midCnt=0, sltCnt=0, gdCnt=0, brdCnt=0;
  pd.filter(d=>d.zoneX!=null).forEach(d=>{
    const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
    const rmax=Math.max(zx,zy);
    if(rmax<=1 && rmax<=0.4)midCnt++;
    else if(rmax>=0.85 && rmax<=1.15)brdCnt++;
    else if(rmax<=1){
      if(rmax<=0.6)sltCnt++;
      else gdCnt++;
    }
  });
  const inZoneN=midCnt+sltCnt+gdCnt+brdCnt;
  let goodZoneScore=70, badMistScore=70, inZoneRatio=0, mRateInZ=0, bRateInZ=0, gRateInZ=0, sRateInZ=0;
  if(inZoneN>=10){
    mRateInZ=midCnt/inZoneN*100;
    sRateInZ=sltCnt/inZoneN*100;
    gRateInZ=gdCnt/inZoneN*100;
    bRateInZ=brdCnt/inZoneN*100;
    inZoneRatio=inZoneN/pd.filter(d=>d.zoneX!=null).length*100;
    // 굿존+보더 (좋은 제구): 리그 p50=66%, p90=80%
    const goodZone=gRateInZ+bRateInZ;
    goodZoneScore=Math.min(115,Math.max(30,Math.pow(Math.max(0,(goodZone-50)/32),0.9)*70+30));
    // 실투+살짝*0.5 (나쁜 제구): 리그 평균 ~23%, 높을수록 나쁨
    const badMist=mRateInZ+sRateInZ*0.5;
    badMistScore=Math.min(115,Math.max(30,Math.pow(Math.max(0,(40-badMist)/30),0.9)*70+30));
  }
  const ctlRaw=bbScore*0.25+goodZoneScore*0.4+badMistScore*0.35;
  const CTL=pw(ctlRaw,49.98,95.91,0.9);  // V12.0 재보정: 구성 동일, 스케일만 통일 (p10 58/p50 79/p90 98/max 102)

  // 구변 (V7.16 강화): 이동량 + 자이로 + 변화구 헛스윙률
  // 수평/수직 이동량으로 "볼 움직임", 자이로로 "회전 품질", 변화구 헛스윙률로 "실전 효과" 평가
  const brkPd=pd.filter(d=>{const t=+d.pType;const isFb=[0,26,27,28,29,30,31,32,33,34,35,36,37].includes(t);const isNoRot=isFb&&Math.abs(+d.sH)<0.5&&Math.abs(+d.sV)<0.5;return d.spdK>0&&wbdContext.pitchGroup(t)!=='너클볼'&&!isNoRot;});
  const gyArr=brkPd.filter(d=>d.gyro!=null && +d.gyro!==0).map(d=>Math.abs(+d.gyro));
  const fbPd=brkPd.filter(d=>fbGroups.includes(wbdContext.pitchGroup(d.pType)));
  const offPd=brkPd.filter(d=>!fbGroups.includes(wbdContext.pitchGroup(d.pType)));
  const brkTotal=Math.max(1,brkPd.length);
  const fbRatio=fbPd.length/brkTotal;
  const offRatio=offPd.length/brkTotal;
  const fbBrk=fbPd.length>0?(avg(fbPd.map(d=>Math.abs(+d.sH)))/250+avg(fbPd.map(d=>Math.abs(+d.sV)))/200)/2*100:0;
  const offBrk=offPd.length>0?(avg(offPd.map(d=>Math.abs(+d.sH)))/400+avg(offPd.map(d=>Math.abs(+d.sV)))/400)/2*100:0;
  const movScore=fbBrk*fbRatio+offBrk*offRatio;
  const gyroBonus=Math.min(10,avg(gyArr)*2);
  // 변화구 헛스윙률 보너스 (리그 p10=20, p50=39.5, p90=57)
  const offSwings=pd.filter(d=>d.bSwing && !fbGroups.includes(wbdContext.pitchGroup(d.pType)));
  const offWhiffs=offSwings.filter(d=>!d.ev||+d.ev===0);
  const offWhiffPct=offSwings.length?offWhiffs.length/offSwings.length*100:40;
  const offWhiffBonus=(offWhiffPct-40)*0.25; // -5 ~ +5 범위
  // 직구 헛스윙률 보너스 (리그 p10=18.8, p50=28, p90=35.5): 직구 움직임/볼끝 효과
  const fbSwings=pd.filter(d=>d.bSwing && fbGroups.includes(wbdContext.pitchGroup(d.pType)));
  const fbWhiffs=fbSwings.filter(d=>!d.ev||+d.ev===0);
  const fbWhiffPct=fbSwings.length?fbWhiffs.length/fbSwings.length*100:28;
  const fbWhiffBonus=(fbWhiffPct-28)*0.2; // -2 ~ +2 범위
  const brkScore=movScore+gyroBonus+offWhiffBonus+fbWhiffBonus;
  const BRK=pw(brkScore,46.11,85.92,0.5);  // V12.0 재보정 (p10 57/p50 78/p90 98/max 102)

  // 탈삼진 (V12.0 재설계): K/타석(결과) + 기대 헛스윙 보너스(과정)
  //   이전 '투구당 K'는 타석당 투구수에 따라 흔들려 반기 반복성 .15 → .42, ERA 연동 −.44→−.57 (K% 연동 .96 유지)
  const ks=pd.filter(d=>wbdContext._isK(d)).length;
  const kPct=pd.length?ks/pd.length*100:5;   // 투구당 K% (상세 표시용)
  const kScore=kPA*0.25+xwDelta*0.3;
  const K=pw(kScore,1.78,6.87,0.6);  // V12.0 재보정 (p10 56/p50 79/p90 96/max 107)

  // 구종 (V7): 1종→58, 2종→66, 3종→73, 4종→79, 5종→85, 6종→91, 7종→97, 8종→102
  const groupCnt={};
  pd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType);groupCnt[g]=(groupCnt[g]||0)+1;});
  const validGroups=Object.values(groupCnt).filter(n=>n/pd.length>=0.05).length;
  const VAR=Math.max(30,Math.min(115,Math.round(58+Math.pow(Math.max(0,validGroups-1)/7,0.85)*44))); // 곡선 조정

  // 안정성: 지수 0.4로 대폭 상향 (편차3=약80, 편차5=약70, 편차7=약60)
  const fbSpds=pd.filter(d=>d.spdK>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType))).map(d=>+d.spdK);
  const fbAvg2=avg(fbSpds);
  const fbStd=fbSpds.length>1?Math.sqrt(fbSpds.reduce((s,v)=>{const dv=v-fbAvg2;return s+dv*dv;},0)/fbSpds.length):7;
  const STB=pw(16-fbStd,-8.02,12.31,1.5);  // V12.0 재보정 (p10 60/p50 78/p90 91/max 94)

  // === ERA 기반 보너스 (좋은 결과 = 능력치 가산점) ===
  // ERA 분포: p10=2.96, p25=4.23, p50=5.58, p75=7.27, p90=8.07
  // 시즌 ERA 가져오기 (캐시 우선)
  let eraBonus = 0;
  try {
    const seasonStats = (typeof wbdContext._getPitcherSeason==='function') ? wbdContext._getPitcherSeason(name) : null;
    if(seasonStats && seasonStats.outs >= 9){  // 최소 3이닝
      const era = seasonStats.runs * 27 / seasonStats.outs;
      // ERA 보너스 (가산점만, 마이너스 없음): 좋은 ERA만 보상
      if(era <= 3.0) eraBonus = 5;
      else if(era <= 4.0) eraBonus = 3;
      else if(era <= 5.0) eraBonus = 1;
      else eraBonus = 0;
    }
  } catch(e){}
  // 구위/제구/구변에 가산점 적용 (구속/구종/안정성은 결과 무관 능력치라 제외)
  // 보너스 적용 (기존 능력치는 99 캡 없음 - 110처럼 더 높을 수 있음)
  const DOM_adj = Math.max(30, DOM + eraBonus);
  const CTL_adj = Math.max(30, CTL + eraBonus);
  const BRK_adj = Math.max(30, BRK + eraBonus);
  
  // 투수 OVR (V12.0): 구위 1.4 · 탈삼진 1.0 · 제구 0.9 · 구속 0.8 · 구변 0.8 · 안정성 0.4 · 구종 0.4 (피크 보너스 없음)
  const pOvrItems = [
    {v:DOM_adj, w:1.4},
    {v:K,       w:1.0},
    {v:CTL_adj, w:0.9},
    {v:SPD,     w:0.8},
    {v:BRK_adj, w:0.8},
    {v:STB,     w:0.4},
    {v:VAR,     w:0.4}
  ];
  const pTotalW = pOvrItems.reduce((s,i)=>s+i.w, 0);
  const OVR = Math.round(pOvrItems.reduce((s,i)=>s+i.v*i.w, 0) / pTotalW);
  return{name,type:'pitcher',OVR,
    stats:{구속:SPD,구위:DOM_adj,제구:CTL_adj,구변:BRK_adj,탈삼진:K,구종:VAR,안정성:STB},
    detail:'직구 '+avgFbSpd.toFixed(1)+'  전체 '+avgSpd.toFixed(1)+'  피안타율 '+baAgainst.toFixed(3)+'  K% '+kPct.toFixed(0)+'%  BB% '+bbPct.toFixed(0)+'%  유효구종 '+validGroups+'종'+(eraBonus!==0?'  ERA보너스 '+(eraBonus>0?'+':'')+eraBonus:''),lowData:lowDataP};
};

// Original index.html:7452
wbdContext.calcBatterCard = function calcBatterCard(name){
  const k = String(name);
  const c = window._cache.batterCard;
  if(c[k] !== undefined) return c[k];
  c[k] = wbdContext._calcBatterCardImpl(name);
  return c[k];
};

// Original index.html:7459
wbdContext._calcBatterCardImpl = function _calcBatterCardImpl(name){
  const all=wbdContext.getBatterDataByName(name);
  const bd=all.filter(wbdContext._isInPlay);
  // 타구질 통계용 (번트 제외, EV/하드히트/배럴/비거리 계산시 사용)
  const bdQ=bd.filter(d=>!wbdContext._isBunt(d));
  // 경기 수 기반 동적 기준
  const minB=Math.max(2,wbdContext.G.filter(wbdContext._isInPlay).length*0.003);
  const lowDataB=bd.length<minB;

  const avg2=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
  const toStat=(v,mn,mx)=>Math.round(Math.max(30,(v-mn)/Math.max(1,mx-mn)*69+30));
  const pw=(v,mn,mx,exp)=>Math.round(Math.max(30,Math.pow(Math.max(0,v-mn)/Math.max(1,mx-mn),exp)*69+30));

  const hits=bd.filter(d=>wbdContext._isHit(d)).length;
  const hrs=bd.filter(d=>d.result===4).length;
  // 정확한 타석/타수 (paEnd 기반)
  const paEndAll=wbdContext._countPaEnd(all);
  const PA=paEndAll.length;
  const BB=all.filter(d=>+d.result===5).length;
  const HBP=all.filter(d=>+d.result===6).length;
  const AB=paEndAll.filter(d=>+d.result!==5&&+d.result!==6).length;
  // 타구질: 번트 제외
  const avgEV=avg2(bdQ.map(d=>+d.ev));
  const hh=bdQ.filter(d=>wbdContext._isHardHit(d)).length;
  const barrels=bdQ.filter(d=>wbdContext._isBarrel(d)).length;
  const batAvg=AB>0?hits/AB:0;  // 정통 야구식 (BB/HBP 제외)
  const hhPct=bdQ.length?hh/bdQ.length*100:0;
  const brlPct=bdQ.length?barrels/bdQ.length*100:0;
  const hrPct=bd.length?hrs/bd.length*100:0;
  // V10.1: _hitBase 분류 기반 정확한 SLG + 세부 기록
  const slg=AB>0?wbdContext._totalBases(bd)/AB:0;
  const obp=PA>0?(hits+BB+HBP)/PA:0;
  const h2B=bd.filter(d=>(+d._hitBase||0)===2).length;
  const h3B=bd.filter(d=>(+d._hitBase||0)===3).length;
  const h1B=hits-hrs-h2B-h3B;
  const ops=obp+slg;

  // ===== 갭파워 (GAP): 얼마나 강한 타구를 날리는가 =====
  // 매 타구마다 그 경기의 키 기반 EV 캡으로 보정
  // 키별 EV 캡: 160cm=120, 165cm=125, 170cm=128, 175cm+=130
  const _getEVCap=wbdContext._evCapByHeight;
  // 매 투구(=그 타석의 키)마다 캡 차이의 50% 만큼 EV 보너스
  const adjEVs = bdQ.filter(d=>+d.bHCm>0).map(d=>{
    const cap = _getEVCap(+d.bHCm);
    const bonus = (130 - cap) * 0.5;
    return +d.ev + bonus;
  });
  const adjAvgEV = adjEVs.length ? adjEVs.reduce((a,b)=>a+b,0)/adjEVs.length : avgEV;
  
  // HH%도 키별로 약간 보정 (작은 선수의 110+ 도달 더 어려움)
  const hhAdjArr = bdQ.filter(d=>+d.bHCm>0).map(d=>{
    const cap = _getEVCap(+d.bHCm);
    return wbdContext._isHardHit(d) ? (1 + (130-cap)/200) : 0;  // 보정 가중치 (적중시)
  });
  const hhAdjSum = hhAdjArr.reduce((a,b)=>a+b,0);
  const hhAdjPct = bdQ.length ? hhAdjSum/bdQ.length*100 : hhPct;
  
  // V11.2: 키보정 HH+% 추가 (EV≥키캡-5) — 순수 타구속도 상위 변별 강화
  const adjHhpN = bdQ.filter(d=>wbdContext._isHHPlusAdj(d)).length;
  const adjHhpPct = bdQ.length ? adjHhpN/bdQ.length*100 : 0;
  const gapScore = (adjAvgEV - 85) * 1.5    // 키 보정 평균 EV
                 + adjHhpPct * 1.0            // 키 보정 HH+% (V11.2 신규 — 상위 변별)
                 + hhPct * 0.8;               // HH% (꾸준한 강타 생산)
  const GAP = pw(gapScore, 33.51, 133.27, 0.6);  // V12.0 재보정 (전 리그 83타자: p10 56/p50 77/p90 94/max 102)
  
  // 파워 (POW): 얼마나 강하고 효율 좋은 타구를 보내는가 (HR/장타로 이어지는 능력)
  // HR 결과 중심 — 키 작아서 못 넘기면 진짜 파워 낮은 게 맞음 (보정 X)
  const ldHits=bdQ.filter(d=>+d.ldeg>=10&&+d.ldeg<=30).length;
  const ldPct=bdQ.length?ldHits/bdQ.length*100:0;
  
  // V11.2: 키보정 배럴+%(홈런 직결 스윙) + ISO(추정 2·3루타 반영) 신규 — HH%는 GAP과 중복이라 제거
  const adjBrlpN = bdQ.filter(d=>wbdContext._isBarrelPlusAdj(d)).length;
  const adjBrlpPct = bdQ.length ? adjBrlpN/bdQ.length*100 : 0;
  const isoV = Math.max(0, slg - batAvg);
  const pwrScore = hrPct * 4.5                // HR% 핵심 (결과 — 절대 기준)
                 + adjBrlpPct * 1.5             // 키보정 배럴+% (홈런 직결 과정 — 상대 기준, V11.2 신규)
                 + brlPct * 1.0                 // 기존 배럴% (솔리드 장타 생산)
                 + isoV * 120;                  // ISO ×120 (V12.0: ×30일 땐 기여 편차 3.7로 2·3루타가 사실상 무시됐음 → 장타 결과가 실제로 반영되게)
  const PWR = pw(pwrScore, 23.49, 178.02, 0.5);  // V12.0 재보정 (전 리그 83타자: p10 57/p50 76/p90 97/max 110 — 핵심 결과형이라 상단 넓게)

  // 컨택 (V8.5): 타율 50% + 헛스윙 회피 25% + 존내 컨택 15% + 존밖 컨택 10%
  // 타율이 모두가 아닌 "결과 지표"로 50%만, 나머지는 실제 컨택 능력(존별 컨택) 반영
  // V9.9: bSwing 누락 보정 — _isSwing 사용 (ev>0/call=2면 스윙 인정)
  const swings=all.filter(wbdContext._isSwing).length;
  const whiff=all.filter(d=>wbdContext._isSwing(d)&&(!d.ev||+d.ev===0)).length;
  const whiffPct=swings>0?whiff/swings:0.35;
  // 존 안 컨택률 (리그 p50=78%, p90=92%)
  const izAll=all.filter(d=>d.zoneX!=null&&Math.abs(+d.zoneX)<=1&&Math.abs(+d.zoneY||0)<=1);
  const izSwAll=izAll.filter(wbdContext._isSwing);
  const izContAll=izSwAll.filter(d=>+d.ev>0);
  const izContPct=izSwAll.length?izContAll.length/izSwAll.length*100:75;
  // 존 밖 컨택률 (체이스 했을 때 컨택, 리그 p50=60%, p90=75%)
  const ozAll=all.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
  const ozSwAll=ozAll.filter(wbdContext._isSwing);
  const ozContAll=ozSwAll.filter(d=>+d.ev>0);
  const ozContPct=ozSwAll.length?ozContAll.length/ozSwAll.length*100:60;
  const conScore=batAvg*100*0.60 + (100-whiffPct*100)*0.20 + izContPct*0.15 + ozContPct*0.05;
  const CON=pw(conScore,31.06,58.44,0.8); // V12.0 재보정 (p10 58/p50 77/p90 91/max 112 — 타격왕급은 100+ 가능)

  // 선구: 존밖스윙률(50%) + BB%(50%) 정규화 통합 [수정]
  const outZone=all.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+(d.zoneY||0))>1));
  const bbAll=all.filter(d=>d.result===5).length; // 볼넷만(HBP 제외)
  const bbPctEye=PA?bbAll/PA*100:0;   // V12.0: 타석당 BB% (이전엔 투구당이라 BB 기여가 체이스의 1/6 수준이었음)
  let eyeVal,eyeDetail;
  if(outZone.length>5){
    const chaseRate=outZone.filter(d=>d.bSwing).length/outZone.length*100;
    const ozNorm=(1-chaseRate/100)*100;           // 0~100 (낮은 체이스율 = 높은 점수)
    const bbNorm=Math.min(100,bbPctEye/12*100);    // 0~100 (타석당 BB% 12%=만점, 리그 p90≈4%)
    const eyeRaw=ozNorm*0.5+bbNorm*0.5;            // 50:50 합산
    eyeVal=pw(eyeRaw,5.64,51.92,0.5); // V12.0 재보정 (p10 60/p50 75/p90 91/max 111)
    eyeDetail='존밖스윙 '+chaseRate.toFixed(0)+'%  BB% '+bbPctEye.toFixed(1)+'%';
  } else {
    const bbNorm=Math.min(100,bbPctEye/12*100);
    const eyeRaw=50+bbNorm*0.5;
    eyeVal=pw(eyeRaw,5.64,51.92,0.5);
    eyeDetail='BB% '+bbPctEye.toFixed(1)+'%';
  }

  // 장타력 제거 (V8.4): PWR과 지표 중복 — 나중에 다른 능력치로 대체 예정

  // 스윗스팟: 대폭 상향 (범위 5~45) · 번트 제외
  // 40%=약84, 30%=약69, 50%=약95
  const hposData=bdQ.filter(d=>d.hPos!=null);
  let SWT=null,swtDetail='';
  if(hposData.length>=3){
    const sweetPct=hposData.filter(d=>+d.hPos>=0.35&&+d.hPos<=0.65).length/hposData.length*100;
    SWT=pw(sweetPct,-0.3,31.27,0.7); // V12.0 재보정 (p10 58/p50 76/p90 90/max 97)
    swtDetail='스윗스팟 '+sweetPct.toFixed(0)+'%';
  }

  const statObj={파워:PWR,갭파워:GAP,컨택:CON,선구:eyeVal};
  if(SWT!=null)statObj['스윗스팟']=SWT;
  // OVR (V12.0): 핵심·변별력 큰 능력치 가중 ↑ — 파워 1.3 · 컨택 1.2 · 갭파워 0.8 · 선구 0.7 · 스윗스팟 0.4 (피크 보너스 없음)
  const ovrItems=[
    {v:PWR, w:1.3},
    {v:CON, w:1.2},
    {v:GAP, w:0.8},
    {v:eyeVal, w:0.7}
  ];
  if(SWT!=null) ovrItems.push({v:SWT, w:0.4});
  const totalW = ovrItems.reduce((s,i)=>s+i.w, 0);
  const OVR = Math.round(ovrItems.reduce((s,i)=>s+i.v*i.w, 0) / totalW);

  let detail='타율 '+batAvg.toFixed(3).replace(/^0/,'')+'  EV '+avgEV.toFixed(1)+'  HH% '+hhPct.toFixed(0)+'%  '+eyeDetail;
  if(swtDetail)detail+='  '+swtDetail;
  // 번트 통계 (배지/강점 리포트용)
  const buntsAll=all.filter(d=>wbdContext._isBunt(d));
  const buntHits=buntsAll.filter(d=>d['1BSafe']==1).length;
  const extras={
    buntTry:buntsAll.length, buntHits, buntRate:buntsAll.length?buntHits/buntsAll.length*100:0,
    PA, AB, BB, HBP, hits, hrs, h1B, h2B, h3B, batAvg, slg, obp, ops
  };
  return{name,type:'batter',OVR,stats:statObj,detail,lowData:lowDataB,extras};
};

// Original index.html:7614
wbdContext.statColor = function statColor(v){
  if(v>=110)return'#ff2020';   // 빨강
  if(v>=105)return'#ff5500';   // 진주황
  if(v>=100)return'#ff8800';   // 주황
  if(v>=90) return'#ffe033';   // 노랑
  if(v>=80) return'#cc44ff';   // 보라
  if(v>=70) return'#2196f3';   // 파랑
  if(v>=60) return'#39ff8a';   // 초록
  return'#607080';
};

// Original index.html:7715
wbdContext._statTooltipHTML = function _statTooltipHTML(statKey){
  const info=wbdContext.STAT_INFO[statKey];
  if(!info)return '';
  return `${info.icon} ${info.label}\n\n${info.desc}\n\n📐 계산식:\n${info.formula}\n\n💡 ${info.detail}`;
};

// Original index.html:7721
wbdContext.showStatInfo = function showStatInfo(){
  let html='<div style="max-width:720px;max-height:75vh;overflow-y:auto;padding-right:8px">';
  html+='<h2 style="margin:0 0 8px;color:var(--amber)">📖 능력치 상세 가이드</h2>';
  html+='<div style="font-size:12px;color:var(--muted);margin-bottom:14px;line-height:1.5">실제 계산 공식과 의미. 모든 능력치는 30~115점 범위로 정규화되며 110+는 매우 드뭅니다.</div>';
  
  // 공통 정규화 설명
  html+=`<div style="background:rgba(33,150,243,0.08);border-left:3px solid #2196f3;padding:10px 12px;border-radius:4px;margin-bottom:14px;font-size:11px;color:var(--text)">
    <div style="font-weight:700;color:#2196f3;margin-bottom:4px">🧮 정규화 함수</div>
    <div style="font-family:var(--mono);background:var(--card2);padding:4px 8px;border-radius:3px;margin-bottom:4px">pw(v, mn, mx, exp) = ((v − mn) / (mx − mn))<sup>exp</sup> × 69 + 30</div>
    <div style="color:var(--muted)">원시 점수 v를 [mn, mx] 범위로 정규화 후 30~99점으로 변환. 지수(exp)가 1보다 작으면 하위가 빠르게 떨어지고, 1보다 크면 상위가 더 높이 솟음.</div>
  </div>`;
  
  const sections=[
    {title:'⚾ 투수 능력치',color:'#ff8c44',keys:['구속','구위','제구','구변','탈삼진','구종','안정성'],note:'OVR 가중치: 구위·제구 1.0 / 탈삼진·구속·구변 0.9 / 구종·안정성 0.7'},
    {title:'🏏 타자 능력치',color:'#39ff8a',keys:['파워','갭파워','컨택','선구','스윗스팟'],note:'OVR 가중치: 파워·컨택 1.0 / 선구·갭파워 0.9 / 스윗스팟 0.7'}
  ];
  sections.forEach(sec=>{
    html+=`<div style="margin-bottom:18px">
      <div style="font-size:14px;font-weight:700;color:${sec.color};margin-bottom:4px;padding-bottom:6px;border-bottom:2px solid ${sec.color}55">${sec.title}</div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;font-style:italic">${sec.note}</div>`;
    sec.keys.forEach(k=>{
      const i=wbdContext.STAT_INFO[k];
      if(!i)return;
      html+=`<div style="background:var(--card2);border-radius:6px;padding:12px;margin-bottom:8px;border-left:3px solid ${sec.color}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:18px">${i.icon}</span>
          <span style="font-size:14px;font-weight:700;color:var(--text)">${i.label}</span>
        </div>
        <div style="font-size:12px;color:var(--text);margin-bottom:8px;line-height:1.5">${i.desc}</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;line-height:1.5;background:var(--card);padding:6px 8px;border-radius:4px;font-family:var(--mono)"><span style="color:${sec.color};font-weight:700;font-family:var(--cond)">📐 공식: </span>${i.formula}</div>
        <div style="font-size:11px;color:var(--muted);line-height:1.5"><span style="color:${sec.color};font-weight:700">💡 해석: </span>${i.detail}</div>
      </div>`;
    });
    html+='</div>';
  });
  
  html+='<div style="background:rgba(245,166,35,0.08);border-left:3px solid var(--amber);padding:12px;border-radius:6px;margin-top:14px">';
  html+='<div style="font-size:12px;font-weight:700;color:var(--amber);margin-bottom:6px">📊 등급 색상</div>';
  html+='<div style="display:flex;flex-wrap:wrap;gap:6px;font-size:11px">';
  [{v:110,name:'레전드'},{v:105,name:'아이콘'},{v:100,name:'슈퍼스타'},{v:90,name:'올스타'},{v:80,name:'엘리트'},{v:70,name:'스타터'},{v:60,name:'유망주'},{v:0,name:'벤치'}].forEach(t=>{
    html+=`<span style="background:${wbdContext.statColor(t.v)}22;color:${wbdContext.statColor(t.v)};border:1px solid ${wbdContext.statColor(t.v)};padding:3px 8px;border-radius:3px;font-weight:600">${t.v}+ ${t.name}</span>`;
  });
  html+='</div></div>';
  
  html+='</div>';
  wbdContext.openModal(html);
};

// Original index.html:7768
wbdContext.statBarBg = function statBarBg(v){
  if(v>=110)return'linear-gradient(90deg,#cc0000,#ff2020)';
  if(v>=105)return'linear-gradient(90deg,#cc3300,#ff5500)';
  if(v>=100)return'linear-gradient(90deg,#cc6600,#ff8800)';
  if(v>=90) return'linear-gradient(90deg,#ccaa00,#ffe033)';
  if(v>=80) return'#cc44ff';
  if(v>=70) return'#2196f3';
  if(v>=60) return'#39ff8a';
  return'#4a6a8a';
};

// Original index.html:7778
wbdContext.statGlow = function statGlow(v){
  if(v>=110)return';box-shadow:0 0 7px #ff2020';
  if(v>=105)return';box-shadow:0 0 6px #ff5500';
  if(v>=100)return';box-shadow:0 0 5px #ff8800';
  if(v>=90) return';box-shadow:0 0 3px #ffe033';
  return'';
};

// Original index.html:7789
wbdContext._clearCardFilter = function _clearCardFilter(which){
  if(which==='filter') document.getElementById('card-filter').value='all';
  else if(which==='team') document.getElementById('card-team').value='all';
  else if(which==='group') document.getElementById('card-group').value='all';
  else if(which==='sort') document.getElementById('card-sort').value='ovr';
  wbdContext.renderCards();
};

// Original index.html:7796
wbdContext._clearAllCardFilters = function _clearAllCardFilters(){
  document.getElementById('card-filter').value='all';
  document.getElementById('card-team').value='all';
  document.getElementById('card-group').value='all';
  document.getElementById('card-sort').value='ovr';
  wbdContext.renderCards();
};

// Original index.html:7804
wbdContext.toggleCardEditMode = function toggleCardEditMode(){
  window.cardEditMode=!window.cardEditMode;
  const updateBtn=(id)=>{
    const btn=document.getElementById(id);
    if(!btn)return;
    btn.textContent=window.cardEditMode?'✏️ 편집 ON':'✏️ 편집 OFF';
    btn.style.color=window.cardEditMode?'var(--amber)':'var(--muted)';
    btn.style.borderColor=window.cardEditMode?'var(--amber)':'var(--border)';
    btn.style.background=window.cardEditMode?'rgba(245,166,35,0.1)':'var(--card2)';
  };
  updateBtn('card-edit-toggle');
  updateBtn('team-edit-toggle');
  updateBtn('myteam-edit-toggle');
  // 영향받는 페이지 다시 렌더
  if(typeof wbdContext.renderCards==='function')wbdContext.renderCards();
  if(document.getElementById('page-team')&&document.getElementById('page-team').classList.contains('active')){
    if(typeof wbdContext.renderTeamPage==='function')wbdContext.renderTeamPage();
  }
  if(document.getElementById('page-myteam')&&document.getElementById('page-myteam').classList.contains('active')){
    if(typeof wbdContext.renderMyTeamPage==='function')wbdContext.renderMyTeamPage();
  }
};

// Original index.html:7829
wbdContext._formOf = function _formOf(c){
  if(!window.SHOW_FORM) return null;
  try{ return wbdContext._recentForm(c.name,c.type,5); }catch(_){ return null; }
};

// Original index.html:7834
wbdContext._formGlowStyle = function _formGlowStyle(f){
  if(!f||f.level===0) return '';
  if(f.level===2) return `box-shadow:0 0 0 1px ${f.color}66, 0 0 18px -4px ${f.color}aa;`;
  if(f.level===1) return `box-shadow:0 0 0 1px ${f.color}44, 0 0 12px -6px ${f.color}88;`;
  if(f.level===-2) return `box-shadow:inset 0 0 24px -10px #0008;`;
  return '';
};

// Original index.html:7842
wbdContext._formCornerHTML = function _formCornerHTML(f){
  if(!f||f.level===0) return '';
  const heat = f.level===2 ? 'linear-gradient(135deg,#ff4560,#ff8c44)'
             : f.level===1 ? 'linear-gradient(135deg,#ff8c44,#ffd700)'
             : f.level===-1 ? 'linear-gradient(135deg,#546e7a,#7a8fa6)'
             : 'linear-gradient(135deg,#37474f,#546e7a)';
  return `<div title="최근 ${f.games}경기 컨디션: ${f.label}" style="position:absolute;top:0;left:0;z-index:3;
      background:${heat};color:#fff;font-size:9.5px;font-weight:800;letter-spacing:0.3px;
      padding:2px 8px 3px 6px;border-radius:10px 0 10px 0;box-shadow:0 2px 6px rgba(0,0,0,0.4);
      display:flex;align-items:center;gap:3px">
      <span style="font-size:10px;line-height:1">${f.icon}</span><span>${f.label}</span>
    </div>`;
};

// Original index.html:7856
wbdContext._formTrendHTML = function _formTrendHTML(f){
  if(!f) return '';
  const pos=Math.max(0,Math.min(1,0.5+(f.norm||0)*1.6));   // 0=부진 ~ 1=최상
  const c=f.color;
  return `<div title="시즌 평균 대비 최근 5경기 위치" style="margin-top:7px">
    <div style="display:flex;align-items:center;gap:5px">
      <span style="font-size:8px;color:var(--muted);letter-spacing:0.5px">FORM</span>
      <div style="flex:1;height:4px;background:linear-gradient(90deg,#37474f,#546e7a 35%,#7a8fa6 50%,#ff8c44 72%,#ff4560);border-radius:2px;position:relative;opacity:0.55">
        <div style="position:absolute;left:50%;top:-2px;width:1px;height:8px;background:rgba(255,255,255,0.35)"></div>
        <div style="position:absolute;left:${(pos*100).toFixed(0)}%;top:-3px;transform:translateX(-50%);
             width:9px;height:9px;border-radius:50%;background:${c};border:1.5px solid var(--card);box-shadow:0 0 6px ${c}"></div>
      </div>
      <span style="font-size:8.5px;color:${c};font-weight:700;width:26px;text-align:right">${f.label}</span>
    </div>
  </div>`;
};

// Original index.html:7872
wbdContext.cardBorderStyle = function cardBorderStyle(ovr){
  if(ovr>=110)return'border:2px solid #ff2020;box-shadow:0 0 18px rgba(255,32,32,0.5),0 0 36px rgba(255,32,32,0.2)';
  if(ovr>=105)return'border:2px solid #ff5500;box-shadow:0 0 16px rgba(255,85,0,0.45),0 0 32px rgba(255,85,0,0.18)';
  if(ovr>=100)return'border:2px solid #ff8800;box-shadow:0 0 14px rgba(255,136,0,0.4),0 0 28px rgba(255,136,0,0.15)';
  if(ovr>=90) return'border:2px solid #ffe033;box-shadow:0 0 12px rgba(255,224,51,0.35)';
  if(ovr>=80) return'border:2px solid #cc44ff;box-shadow:0 0 10px rgba(204,68,255,0.32)';
  if(ovr>=70) return'border:2px solid #2196f3;box-shadow:0 0 8px rgba(33,150,243,0.25)';
  if(ovr>=60) return'border:2px solid #39ff8a;box-shadow:0 0 8px rgba(57,255,138,0.22)';
  return'border:2px solid var(--border)';
};

// Original index.html:7883
wbdContext.cardOvrColor = function cardOvrColor(ovr){
  if(ovr>=110)return'#ff2020';
  if(ovr>=105)return'#ff5500';
  if(ovr>=100)return'#ff8800';
  if(ovr>=90) return'#ffe033';
  if(ovr>=80) return'#cc44ff';
  if(ovr>=70) return'#2196f3';
  if(ovr>=60) return'#39ff8a';
  return'#607080';
};

// Original index.html:7894
wbdContext.makeCardRadar = function makeCardRadar(stats,W){
  const keys=Object.keys(stats);
  const N=keys.length,CX=W/2,CY=W/2,R=W/2-18;
  let items='';
  [0.33,0.66,1].forEach(t=>{
    const pts=keys.map((_,i)=>{const a=i/N*2*Math.PI-Math.PI/2;return`${(CX+R*t*Math.cos(a)).toFixed(1)},${(CY+R*t*Math.sin(a)).toFixed(1)}`;}).join(' ');
    items+=`<polygon points="${pts}" fill="none" stroke="#1a2f4a" stroke-width="0.8"/>`;
  });
  const hasOver=Object.values(stats).some(v=>v>=100);
  const dpts=keys.map((k,i)=>{
    const v=Math.min(1.18,stats[k]/99);
    const a=i/N*2*Math.PI-Math.PI/2;
    return`${(CX+R*v*Math.cos(a)).toFixed(1)},${(CY+R*v*Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  const radarFill=hasOver?'rgba(255,120,0,0.2)':'rgba(245,166,35,0.2)';
  const radarStroke=hasOver?'#ff9900':'#f5a623';
  items+=`<polygon points="${dpts}" fill="${radarFill}" stroke="${radarStroke}" stroke-width="1.5"/>`;
  keys.forEach((k,i)=>{
    const a=i/N*2*Math.PI-Math.PI/2;
    const lx=CX+(R+12)*Math.cos(a),ly=CY+(R+12)*Math.sin(a);
    items+=`<text x="${lx.toFixed(1)}" y="${(ly+3).toFixed(1)}" fill="#6a8aaa" font-size="8" text-anchor="middle">${k}</text>`;
  });
  return`<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg">${items}</svg>`;
};

// Original index.html:7919
wbdContext.renderCards = function renderCards(){
  // 폼 토글 버튼 상태 동기화
  (function(){ const b=document.getElementById('form-toggle-btn');
    if(b){ b.textContent=window.SHOW_FORM?'🔥 폼 표시 ON':'🔥 폼 표시 OFF';
           b.style.color=window.SHOW_FORM?'var(--amber)':'var(--muted)'; } })();
  const filter=document.getElementById('card-filter').value;
  const sort=document.getElementById('card-sort').value;
  const teamSel=document.getElementById('card-team');
  const teamFilter=teamSel?teamSel.value:'all';
  const groupSel=document.getElementById('card-group');
  const groupFilter=groupSel?groupSel.value:'all';
  // 캐시된 이름 사용 (G.map 안 함)
  const pitchers=window._cache.pitcherNames;
  const batters=window._cache.batterNames;
  let cards=[];
  // favorites 필터: 즐겨찾기만 표시 (둘 다 포함)
  if(filter==='favorites'){
    const favs=wbdContext.getFavorites();
    favs.pitcher.forEach(n=>{const c=wbdContext.calcPitcherCard(n);if(c){c.team=wbdContext._playerTeam(n,'pitcher');cards.push(c);}});
    favs.batter.forEach(n=>{const c=wbdContext.calcBatterCard(n);if(c){c.team=wbdContext._playerTeam(n,'batter');cards.push(c);}});
  } else {
    if(filter!=='batter')pitchers.forEach(n=>{const c=wbdContext.calcPitcherCard(n);if(c){c.team=wbdContext._playerTeam(n,'pitcher');cards.push(c);}});
    if(filter!=='pitcher')batters.forEach(n=>{const c=wbdContext.calcBatterCard(n);if(c){c.team=wbdContext._playerTeam(n,'batter');cards.push(c);}});
  }
  
  // 팀 select 옵션 동적 갱신
  if(teamSel){
    const allTeams=[...new Set(cards.map(c=>c.team).filter(t=>t&&t!=='—'))].sort();
    const cur=teamSel.value;
    teamSel.innerHTML='<option value="all">🏟️ 전체 팀 ('+cards.length+'명)</option>'
      +allTeams.map(t=>{
        const cnt=cards.filter(c=>c.team===t).length;
        return `<option value="${t.replace(/"/g,'&quot;')}"${cur===t?' selected':''}>${t} (${cnt}명)</option>`;
      }).join('');
    if(cur!=='all'&&!allTeams.includes(cur)) teamSel.value='all';
  }
  
  // 그룹 select 옵션 동적 갱신
  if(groupSel){
    const groups=window.PLAYER_GROUPS?.groups||[];
    const cur=groupSel.value;
    groupSel.innerHTML='<option value="all">👥 전체 그룹</option>'
      +groups.map(g=>`<option value="${g.id}"${cur===g.id?' selected':''}>${g.icon||'👥'} ${g.name} (${(g.members||[]).length}명)</option>`).join('');
    if(cur!=='all' && !groups.find(g=>g.id===cur)) groupSel.value='all';
  }
  
  // 팀 필터 적용
  if(teamFilter!=='all') cards=cards.filter(c=>c.team===teamFilter);
  // 그룹 필터 적용
  if(groupFilter!=='all'){
    const g=(window.PLAYER_GROUPS?.groups||[]).find(x=>x.id===groupFilter);
    if(g){
      const memberSet=new Set((g.members||[]).map(String));
      cards=cards.filter(c=>memberSet.has(String(c.name)));
    }
  }
  
  if(sort==='ovr')cards.sort((a,b)=>{
    if(a.lowData&&!b.lowData)return 1;
    if(!a.lowData&&b.lowData)return -1;
    return b.OVR-a.OVR;
  });
  else if(sort==='name') cards.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sort.startsWith('p:')||sort.startsWith('b:')){
    // 능력치별 정렬: "p:구속" / "b:파워" 등
    const wantType=sort.startsWith('p:')?'pitcher':'batter';
    const statKey=sort.substring(2);
    cards.sort((a,b)=>{
      // 같은 타입이 아닌 카드는 뒤로
      const aType=a.type===wantType?0:1;
      const bType=b.type===wantType?0:1;
      if(aType!==bType)return aType-bType;
      // 데이터 부족 뒤로
      if(a.lowData&&!b.lowData)return 1;
      if(!a.lowData&&b.lowData)return -1;
      // 능력치 값 비교
      const av=a.stats?.[statKey]||0;
      const bv=b.stats?.[statKey]||0;
      return bv-av;
    });
  }
  else cards.sort((a,b)=>a.name.localeCompare(b.name));
  
  // 활성 필터 칩 표시
  const filterArea=document.getElementById('cards-active-filters');
  if(filterArea){
    const chips=[];
    if(filter!=='all') chips.push({label:filter==='pitcher'?'투수만':filter==='batter'?'타자만':filter==='favorites'?'⭐ 즐겨찾기':filter,color:filter==='favorites'?'#ffd700':'#ff8c44',clear:'_clearCardFilter("filter")'});
    if(teamFilter!=='all') chips.push({label:'🏟️ '+teamFilter,color:'#88ccff',clear:'_clearCardFilter("team")'});
    if(groupFilter!=='all'){
      const g=(window.PLAYER_GROUPS?.groups||[]).find(x=>x.id===groupFilter);
      if(g) chips.push({label:(g.icon||'👥')+' '+g.name,color:g.color||'#39ff8a',clear:'_clearCardFilter("group")'});
    }
    if(sort!=='ovr' && sort!=='name'){
      const sortLabel=sort.startsWith('p:')?'⚾ '+sort.substring(2)+' 순':sort.startsWith('b:')?'🏏 '+sort.substring(2)+' 순':sort;
      chips.push({label:sortLabel,color:'#ffe033',clear:'_clearCardFilter("sort")'});
    }
    if(chips.length){
      filterArea.innerHTML=`<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:8px 12px;background:var(--card2);border-radius:6px;border-left:3px solid var(--amber)">
        <span style="font-size:11px;color:var(--muted);font-weight:600">활성 필터:</span>
        ${chips.map(c=>`<span style="display:inline-flex;align-items:center;gap:4px;background:${c.color}22;border:1px solid ${c.color};color:${c.color};padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600">${c.label}<button onclick="${c.clear}" style="background:transparent;border:none;color:${c.color};cursor:pointer;padding:0 0 0 2px;font-size:13px;line-height:1">✕</button></span>`).join('')}
        <span style="font-size:11px;color:var(--muted);margin-left:auto">${cards.length}명</span>
        <button onclick="_clearAllCardFilters()" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:3px 10px;border-radius:4px;font-size:11px;cursor:pointer">전부 초기화</button>
      </div>`;
    } else {
      filterArea.innerHTML='';
    }
  }

  const el=document.getElementById('cards-grid');
  if(!cards.length){
    el.style.display='block';
    let emptyMsg='';
    if(filter==='favorites'){
      emptyMsg=`<div style="grid-column:1/-1;padding:60px 20px;text-align:center;background:var(--card);border-radius:8px;border:2px dashed var(--border)">
        <div style="font-size:64px;margin-bottom:14px">⭐</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text)">즐겨찾기 선수가 없어요</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:18px">선수 카드의 ☆ 버튼을 누르면 즐겨찾기에 추가됩니다.<br>즐겨찾기한 선수는 빠르게 모아 볼 수 있어요.</div>
        <button onclick="_clearCardFilter('filter')" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:9px 20px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">전체 카드로 돌아가기</button>
      </div>`;
    } else if(teamFilter!=='all' || groupFilter!=='all') {
      emptyMsg=`<div style="grid-column:1/-1;padding:60px 20px;text-align:center;background:var(--card);border-radius:8px;border:2px dashed var(--border)">
        <div style="font-size:64px;margin-bottom:14px">🔍</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">조건에 맞는 선수가 없어요</div>
        <div style="font-size:13px;color:var(--muted);margin-bottom:18px">필터를 풀거나 다른 팀/그룹을 선택해보세요.</div>
        <button onclick="_clearAllCardFilters()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:9px 20px;border-radius:6px;font-size:13px;cursor:pointer">필터 모두 초기화</button>
      </div>`;
    } else {
      emptyMsg=`<div style="grid-column:1/-1;padding:60px 20px;text-align:center;background:var(--card);border-radius:8px;border:2px dashed var(--border)">
        <div style="font-size:64px;margin-bottom:14px">📂</div>
        <div style="font-size:16px;font-weight:700;margin-bottom:8px">데이터가 없어요</div>
        <div style="font-size:13px;color:var(--muted)">상단 [+ 경기] 버튼으로 경기 데이터를 추가해보세요.</div>
      </div>`;
    }
    el.innerHTML=emptyMsg;
    return;
  }
  el.style.display='grid';
  el.innerHTML=cards.map(c=>{
    const typeLabel=c.type==='pitcher'?'투수':'타자';
    const typeCol=c.type==='pitcher'?'#ff8c44':'#39ff8a';
    const sortStatKey=(sort.startsWith('p:')||sort.startsWith('b:'))?sort.substring(2):null;
    const bars=Object.entries(c.stats).map(([k,v])=>{
      const isHighlight=k===sortStatKey;
      const tt=wbdContext._statTooltipHTML(k);
      return `<div style="display:flex;align-items:center;gap:4px;margin-bottom:3px;${isHighlight?'background:rgba(245,166,35,0.12);padding:2px 4px;border-radius:3px;border-left:2px solid var(--amber)':''}">
        <span title="${tt.replace(/"/g,'&quot;')}" style="font-size:8px;color:${isHighlight?'var(--amber)':'var(--muted)'};width:30px;font-weight:${isHighlight?'700':'400'};cursor:help">${k}</span>
        <div style="flex:1;height:5px;background:#1a2f4a;border-radius:3px;overflow:hidden">
          <div style="width:${Math.min(100,v)}%;height:100%;background:${wbdContext.statBarBg(v)};border-radius:3px${wbdContext.statGlow(v)};transition:width .3s"></div>
        </div>
        <span style="font-size:8px;color:${wbdContext.statColor(v)};width:22px;text-align:right;font-family:var(--mono);font-weight:${v>=100||isHighlight?'900':'400'}">${v}</span>
      </div>`;
    }).join('');
    const lowBorder=c.lowData?'border:1px dashed #3a5a7a;opacity:0.8':wbdContext.cardBorderStyle(c.OVR);
    const lowTag=c.lowData?'<span title="표본이 적어 신뢰도가 낮습니다" style="font-size:9px;color:#4a7aaa;background:#0a1828;border:1px solid #2a4060;padding:1px 6px;border-radius:3px;margin-left:5px">📊 데이터 부족</span>':'';
    // 뱃지: 카드에는 최대 3개 아이콘만 표시 (호버 시 이름 툴팁)
    const badges=wbdContext.computeBadges(c);
    const badgesMini=badges.length?`<div style="display:flex;gap:3px;justify-content:center;margin-top:6px;flex-wrap:wrap">${badges.slice(0,4).map(b=>`<span title="${b.name} · ${b.desc}" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:${b.color}33;border:1px solid ${b.color};border-radius:50%;font-size:10px">${b.icon}</span>`).join('')}${badges.length>4?`<span style="font-size:10px;color:var(--muted);align-self:center">+${badges.length-4}</span>`:''}</div>`:'';
    
    // 큰 사각형 사진 (육각형 자리). 사진 우하단에 OVR 배지
    // V10.1 FIX: 부모(6056)가 aspect-ratio:1/1이라 자식의 height:100%가 0이 됨
    //   → SVG+img를 부모의 직접 자식으로 absolute 배치
    // V10.1 FIX2: 투명 PNG일 때 뒤 SVG가 비쳐 보이는 문제
    //   → img에 어두운 배경 지정 + onload 시 SVG 숨김 (이중 방어)
    const photoUrl=wbdContext.getPhotoUrl(c.name);
    const ovrColor=wbdContext.cardOvrColor(c.OVR);
    const silId = `sil_${c.type}_${(c.name||'').replace(/[^a-zA-Z0-9]/g,'_')}_${Math.floor(Math.random()*100000)}`;
    const _silSquareSvg = `<svg id="${silId}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;display:block;background:linear-gradient(180deg,#1a2438,#0f1828)"><circle cx="50" cy="38" r="16" fill="#3a4560"/><path d="M 20,100 Q 20,65 50,62 Q 80,65 80,100 Z" fill="#3a4560"/></svg>`;
    const photoSquareHTML = photoUrl
      ? `${_silSquareSvg}<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;background:#0f1828" onload="var s=document.getElementById('${silId}');if(s)s.style.display='none'" onerror="this.style.display='none'">`
      : _silSquareSvg;
    
    const _f=wbdContext._formOf(c);
    return`<div onclick="openCardDetail('${c.name}','${c.type}')" style="background:var(--card);${lowBorder};${wbdContext._formGlowStyle(_f)}border-radius:10px;padding:14px;cursor:pointer;transition:transform .15s,box-shadow .15s;position:relative" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform=''">
      <div style="position:absolute;top:6px;right:6px;display:flex;gap:2px;z-index:2">${wbdContext.favoriteButton(c.name,c.type,14)}</div>
      ${window.cardEditMode?`<button onclick="event.stopPropagation();openQuickTeamGroupEdit('${String(c.name).replace(/'/g,"\\'")}','${c.type}')" title="팀/그룹 편집" style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);border:1px solid var(--amber);color:var(--amber);width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;padding:0;z-index:2">✏️</button>`:''}
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;padding-right:24px">
        <span style="font-size:11px;font-weight:700;color:${typeCol};background:${typeCol}22;padding:2px 6px;border-radius:3px">${typeLabel}</span>${lowTag}
      </div>
      <!-- 큰 사각형 사진 + OVR 배지 -->
      <div style="position:relative;width:100%;aspect-ratio:1/1;border-radius:8px;overflow:hidden;border:2px solid ${ovrColor}55;margin-bottom:10px;background:#0f1828">
        ${photoSquareHTML}${wbdContext._formCornerHTML(_f)}
        <div style="position:absolute;bottom:6px;right:6px;background:${ovrColor};color:#000;font-family:var(--mono);font-weight:900;font-size:18px;padding:3px 9px;border-radius:14px;border:2px solid var(--card);box-shadow:0 2px 6px rgba(0,0,0,0.5);z-index:2">${c.OVR}</div>
      </div>
      <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
      ${c.team&&c.team!=='—'?`<div style="font-size:10px;color:var(--muted);text-align:center;margin-bottom:6px;font-family:var(--mono)">${c.team}</div>`:'<div style="margin-bottom:4px"></div>'}
      ${(()=>{
        const grps=wbdContext._playerGroups(c.name);
        if(!grps.length)return '';
        const show=grps.slice(0,2);
        const more=grps.length-show.length;
        return `<div style="display:flex;gap:3px;justify-content:center;margin-bottom:6px;flex-wrap:wrap">${show.map(g=>`<span title="${g.name}${g.note?' · '+g.note:''}" style="font-size:9px;background:${g.color}22;border:1px solid ${g.color};color:${g.color};padding:1px 5px;border-radius:8px;font-weight:600">${g.icon||''} ${g.name}</span>`).join('')}${more>0?`<span style="font-size:9px;color:var(--muted);align-self:center">+${more}</span>`:''}</div>`;
      })()}
      ${bars}
      ${wbdContext._formTrendHTML(_f)}
      ${badgesMini}
      <div style="font-size:9px;color:var(--muted);margin-top:6px">${c.detail}</div>
    </div>`;
  }).join('');
};
}

export function initialize(wbdContext) {
// Original index.html:7626
wbdContext.STAT_INFO = {
  // ─── 투수 ───
  '구속':{
    label:'구속 (Velocity)',
    icon:'⚡',
    desc:'직구 계열(포심/투심/커터/패스트볼) 평균 구속',
    formula:'직구계열 평균 구속 → pw(avgFbSpd, 118.3, 138.14, 1.5) [V12.0 재보정]',
    detail:'직구(포심·투심·커터·패스트볼) 평균 km/h. V12.0: p10 55 / 중앙 80 / p90 93 / 최대 100.'
  },
  '구위':{
    label:'구위 (Dominance / Stuff)',
    icon:'💪',
    desc:'타자를 압도하는 종합 능력. 피안타율·피홈런·피EV·존내헛스윙·배럴허용·배럴+허용·체이스 유도 통합',
    formula:'(0.48 − 피안타율)×120 + (7 − min(7, 피홈런%))×6 + (K/타석% − 18)×1.5 + (기대헛스윙% − 리그평균)×2.5 + (100.2 − 평균피EV)×2 → pw(score, −41.12, 50.62, 0.7) + ERA 보너스 [V12.0 재설계]. 기대헛스윙=구종별 [구속 3분위×무브 3분위] 칸의 리그 헛스윙률 평균(Stuff+ 방식)',
    detail:'결과(피안타·피홈런·삼진) + 과정(구속·무브로 본 기대 헛스윙, 피EV). 이전 식은 피안타·피EV·배럴·배럴+·존내헛스윙·체이스 7항목이 같은 타구질을 중복 집계하고 삼진이 빠져 있었음. 검증(47명): ERA 연동 −.65→−.80, 피OPS −.73→−.92. V12.0: p10 56 / 중앙 79 / p90 97 / 최대 107 (바닥 뭉침 해소).'
  },
  '제구':{
    label:'제구 (Control)',
    icon:'🎯',
    desc:'볼넷 비율(25%) + 굿존+보더 활용(40%) + 실투/살짝 회피(35%) 가중 평균',
    formula:'볼넷점수×0.25 + 굿존점수×0.4 + 실투회피점수×0.35 → pw(score, 49.98, 95.91, 0.9) + ERA 보너스 [V12.0 스케일 통일]. 볼넷점수=(4 − BB%)/4×78+38, 굿존=굿존+보더 비율, 실투=한가운데+살짝×0.5',
    detail:'구성은 그대로(볼넷·존 위치), 다른 능력치와 같은 30~115 매핑으로 통일. V12.0: p10 58 / 중앙 79 / p90 98 / 최대 102. ※ 크게 빠지는 공은 이 리그에선 의도된 유인구가 많아 감점 항목으로 넣지 않음.'
  },
  '구변':{
    label:'구변 (Movement / Break)',
    icon:'🌀',
    desc:'직구 + 변화구 무브먼트(이동량) + 자이로 + 헛스윙률',
    formula:'직구/변화구 이동량 가중 + 자이로 보너스 + 변화구 헛스윙 보너스 + 직구 헛스윙 보너스 → pw(score, 46.11, 85.92, 0.5) + ERA 보너스 [V12.0 재보정]',
    detail:'무브먼트(과정)가 핵심, 헛스윙은 ±5 보정. 반기 반복성 .90. V12.0: p10 57 / 중앙 78 / p90 98 / 최대 102.'
  },
  '탈삼진':{
    label:'탈삼진 (K Rate)',
    icon:'❌',
    desc:'K% (실제 삼진 / 전체 투구) + 전체 헛스윙률 보너스',
    formula:'K/타석%×0.25 + (기대헛스윙% − 리그평균)×0.3 → pw(score, 1.78, 6.87, 0.6) [V12.0 재설계]',
    detail:'실제 삼진(타석당)이 핵심, 기대 헛스윙은 과정 보너스. 이전 투구당 K는 타석당 투구수에 따라 흔들려 반기 반복성 .15→.42, ERA 연동 −.44→−.57. V12.0: p10 56 / 중앙 79 / p90 96 / 최대 107.'
  },
  '구종':{
    label:'구종 (Repertoire)',
    icon:'🎭',
    desc:'5% 이상 사용한 구종 그룹 수',
    formula:'유효구종수: 1종→58, 2종→66, 3종→73, 4종→79, 5종→85, 6종→91, 7종→97, 8종→102 (지수 0.85 곡선)',
    detail:'전체 투구의 5% 이상 던진 구종만 카운트. 단순 구종 다양성 평가 (균등성 고려 X).'
  },
  '안정성':{
    label:'안정성 (Stability)',
    icon:'🛡️',
    desc:'직구 구속의 표준편차 (편차가 작을수록 일관성 ↑)',
    formula:'16 − 직구 구속 표준편차 → pw(score, −8.02, 12.31, 1.5) [V12.0 재보정]',
    detail:'직구 구속이 일정할수록 높음. V12.0: p10 60 / 중앙 78 / p90 91 / 최대 94.'
  },
  // ─── 타자 ───
  '파워':{
    label:'파워 (Power)',
    icon:'💥',
    desc:'순수 장타력. HR%(핵심) + 키보정 배럴+% + 배럴% + ISO(추정 2·3루타 반영)',
    formula:'HR%×4.5 + 키보정배럴+%×1.5 + 배럴%×1.0 + ISO×120 → pw(score, 23.49, 178.02, 0.5) [V12.0]. ISO 가중 30→120: 이전엔 ISO 기여 편차가 3.7(HR 18.6)이라 2·3루타가 사실상 무시됐음',
    detail:'홈런(결과)이 가장 큰 비중, 2·3루타(ISO)도 실제로 반영. 배럴+·배럴은 과정 보너스. V12.0 전 리그 재보정: p10 57 / 중앙 76 / p90 97 / 최대 110 — 핵심 결과형이라 상단을 넓게 둠.'
  },
  '갭파워':{
    label:'갭파워 (Gap Power)',
    icon:'📈',
    desc:'타구 강도. 키 보정 평균 EV + 키 보정 HH+% + HH%',
    formula:'(키보정 평균EV − 85)×1.5 + 키보정 HH+%×1.0 + HH%×0.8 → pw(score, 33.51, 133.27, 0.6) [V12.0 재보정]. 키별 EV 캡: 160cm=120, 165cm=125, 170cm=128, 175cm+=130',
    detail:'작은 선수의 110+ 도달 더 어려운 점 보정. 순수 과정 지표(반기 반복성 .64로 안정). V12.0: p10 56 / 중앙 77 / p90 94 / 최대 102.'
  },
  '컨택':{
    label:'컨택 (Contact)',
    icon:'🎯',
    desc:'타율(60%) + 헛스윙 회피(20%) + 존내 컨택(15%) + 존밖 컨택(5%)',
    formula:'타율×100×0.60 + (100 − 헛스윙률%)×0.20 + 존내컨택률%×0.15 + 존밖컨택률%×0.05 → pw(score, 31.06, 58.44, 0.8) [V12.0 재보정]',
    detail:'결과 지표(타율) 60%, 실제 컨택 능력(헛스윙·존별 컨택) 40% — 타격왕이면 헛스윙이 많아도 높게 나오는 밸런스. V12.0: p10 58 / 중앙 77 / p90 91 / 최대 112(타격왕급 100+ 가능).'
  },
  '선구':{
    label:'선구 (Plate Discipline)',
    icon:'👁️',
    desc:'존밖 스윙 억제(50%) + 볼넷 비율(50%)',
    formula:'(1 − 체이스율)×100×0.5 + min(100, 타석당BB%/12×100)×0.5 → pw(score, 5.64, 51.92, 0.5) [V12.0]. 존밖 투구 5개 이상 있어야 체이스율 계산',
    detail:'존 밖 공을 안 따라가고(체이스율 ↓) 볼넷을 잘 골라내는 능력. V12.0: BB%를 투구당→타석당으로 교정(이전엔 BB 기여가 체이스의 1/6), 상한 12%. p10 60 / 중앙 75 / p90 91 / 최대 111.'
  },
  '스윗스팟':{
    label:'스윗스팟 (Sweet Spot %)',
    icon:'🎀',
    desc:'배트 스윗스팟(hPos 0.35~0.65) 적중 타구 비율',
    formula:'hPos 0.35~0.65 적중 비율 → pw(sweetPct, −0.3, 31.27, 0.7) [V12.0 재보정]',
    detail:'배트 가운데 부분(스윗스팟)으로 친 타구 비율. hPos 데이터 3개 이상 있어야 계산. 반기 반복성 .38로 변동 큰 보조 지표. V12.0: p10 58 / 중앙 76 / p90 90 / 최대 97.'
  }
};

// Original index.html:7787
window.cardEditMode=false;
}
