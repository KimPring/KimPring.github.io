/** insights-base: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:15988
wbdContext.findSimilarPlayers = function findSimilarPlayers(card, topN=3){
  const s=card.stats;
  const targetVec=Object.values(s);
  const names=card.type==='pitcher'
    ?(window._cache.pitcherNames||[]).slice()
    :(window._cache.batterNames||[]).slice();

  const sims=[];
  names.forEach(n=>{
    if(String(n)===String(card.name))return;
    const other=card.type==='pitcher'?wbdContext.calcPitcherCard(n):wbdContext.calcBatterCard(n);
    if(!other||other.lowData)return;
    const oVec=Object.values(other.stats);
    // 코사인 유사도
    let dot=0, normA=0, normB=0;
    for(let i=0;i<targetVec.length;i++){
      dot += targetVec[i]*oVec[i];
      normA += targetVec[i]*targetVec[i];
      normB += oVec[i]*oVec[i];
    }
    const cosSim=dot/(Math.sqrt(normA)*Math.sqrt(normB)+1e-9);
    // 유클리드 거리 (작을수록 비슷)
    let dist=0;
    for(let i=0;i<targetVec.length;i++)dist+=(targetVec[i]-oVec[i])**2;
    dist=Math.sqrt(dist);
    // 종합 점수 (코사인 높고 거리 짧을수록 좋음)
    const score=cosSim*100 - dist*0.3;
    sims.push({name:n, card:other, score, dist, cosSim});
  });
  sims.sort((a,b)=>b.score-a.score);
  return sims.slice(0,topN);
};

// Original index.html:16029
wbdContext.generateStrengthReport = function generateStrengthReport(card){
  const reports=[];
  const name=card.name;
  const lowTag=(n,thr)=>n<thr?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
  if(card.type==='pitcher'){
    const pd=wbdContext.getPitcherDataByName(name);
    if(pd.length<1)return [];
    
    // 0) ERA / WHIP - 핵심 결과 지표 (캐싱된 헬퍼)
    const _ps=wbdContext._getPitcherSeason(name);
    const totalIp=_ps.ip, totalOuts=_ps.outs;
    if(totalIp>=3){
      const era=_ps.era;
      const whip=_ps.whip;
      const eraTag=lowTag(totalOuts,15);
      // 실측 분포: ERA p10=2.96, p25=4.23, p50=5.58 / WHIP p10=1.06, p25=1.32, p50=1.50
      if(era<=3.30)reports.push({icon:'🛡️',text:`ERA ${era.toFixed(2)} (${Math.floor(totalIp)}.${totalOuts%3}이닝 · 에이스급 · 리그 상위 15%)${eraTag}`,color:'#39ff8a'});
      else if(era<=4.50)reports.push({icon:'🛡️',text:`ERA ${era.toFixed(2)} (${Math.floor(totalIp)}.${totalOuts%3}이닝 · 우수 · 리그 상위 30%)${eraTag}`,color:'#88cc44'});
      if(whip<=1.10)reports.push({icon:'🔒',text:`WHIP ${whip.toFixed(2)} · 출루 허용 최소 (이닝당 ${whip.toFixed(2)}명 · 상위 15%)`,color:'#39ff8a'});
      else if(whip<=1.30)reports.push({icon:'🔒',text:`WHIP ${whip.toFixed(2)} · 출루 억제 우수 (상위 25%)`,color:'#88cc44'});
    }
    
    // 1) 구속
    const fbGroups=['포심','투심','커터','패스트볼'];
    const fbSpds=pd.filter(d=>d.spdK>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    if(fbSpds.length>=1){
      const avgFb=fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length;
      const tag=lowTag(fbSpds.length,15);
      if(avgFb>=137)reports.push({icon:'⚡',text:`평균 직구 ${avgFb.toFixed(1)}km/h (${fbSpds.length}구 · 리그 상위 10% · 평균 133)${tag}`,color:'#ff4560'});
      else if(avgFb>=135)reports.push({icon:'⚡',text:`평균 직구 ${avgFb.toFixed(1)}km/h (${fbSpds.length}구 · 리그 상위 25%)${tag}`,color:'#ff8800'});
    }
    // 2) K%
    const ks=pd.filter(d=>wbdContext._isK(d)).length;
    const kPct=pd.length?ks/pd.length*100:0;
    const pTag=lowTag(pd.length,30);
    if(kPct>=17)reports.push({icon:'🔥',text:`K% ${kPct.toFixed(1)}% (${pd.length}구 · 리그 상위 10% · 평균 11.8%)${pTag}`,color:'#ff4560'});
    else if(kPct>=15)reports.push({icon:'🔥',text:`K% ${kPct.toFixed(1)}% (${pd.length}구 · 리그 상위 25%)${pTag}`,color:'#ff8800'});
    // 3) BB%
    const bb=pd.filter(d=>d.result===5||d.result===6).length;
    const bbPct=pd.length?bb/pd.length*100:10;
    if(bbPct<=0.5)reports.push({icon:'🎯',text:`BB% ${bbPct.toFixed(1)}% (${pd.length}구 · 리그 상위 10% · 평균 1.5%)${pTag}`,color:'#39ff8a'});
    else if(bbPct<=1.0)reports.push({icon:'🎯',text:`BB% ${bbPct.toFixed(1)}% (${pd.length}구 · 리그 상위 25%)${pTag}`,color:'#88cc44'});
    // 4) 피안타/피홈런 억제
    const batted=pd.filter(wbdContext._isInPlay);
    const battedQ=batted.filter(d=>!wbdContext._isBunt(d)); // 타구질 통계용 (번트 제외)
    if(batted.length>=1){
      const hits = pd.filter(wbdContext._isHit).length;
      // 표준 피안타율 (AB = 인플레이 + K)
      const ab = pd.filter(d => {
        const r=+d.result;
        return wbdContext._isABPitch(d);
      }).length;
      const ba = ab > 0 ? hits/ab : 0;
      const bTag=lowTag(ab,15);
      if(ba<=0.250)reports.push({icon:'🛡️',text:`피안타율 ${ba.toFixed(3).replace(/^0/,'')} (${ab}타수 · 리그 상위 10% · 평균 .346)${bTag}`,color:'#39ff8a'});
      else if(ba<=0.290)reports.push({icon:'🛡️',text:`피안타율 ${ba.toFixed(3).replace(/^0/,'')} (${ab}타수 · 리그 상위 25%)${bTag}`,color:'#88cc44'});
      const hrs=batted.filter(d=>d.result===4).length;
      const hrPct=batted.length>0?hrs/batted.length*100:0;
      if(hrPct<=2.4)reports.push({icon:'🧱',text:`피홈런 ${hrs}개 · HR% ${hrPct.toFixed(1)}% (${batted.length}타구 · 리그 상위 10% · 평균 4.3%)${bTag}`,color:'#39ff8a'});
      else if(hrPct<=2.9)reports.push({icon:'🧱',text:`피홈런 ${hrs}개 · HR% ${hrPct.toFixed(1)}% (${batted.length}타구 · 리그 상위 25%)${bTag}`,color:'#88cc44'});
      // 피하드히트% (EV>=110, 리그 p10=32%, p25=36%, p50=39% · V11.1 인플레이 실측): 낮을수록 강타 억제 · 번트 제외
      const hhA=battedQ.filter(d=>wbdContext._isHardHit(d)).length;
      const hhPctA=battedQ.length?hhA/battedQ.length*100:0;
      if(hhPctA<=32)reports.push({icon:'🛑',text:`피하드히트 ${hhPctA.toFixed(1)}% (${battedQ.length}타구 · 강타 억제 상위 10% · 평균 39.6%)${bTag}`,color:'#39ff8a'});
      else if(hhPctA<=36)reports.push({icon:'🛑',text:`피하드히트 ${hhPctA.toFixed(1)}% (${battedQ.length}타구 · 강타 억제 상위 25%)${bTag}`,color:'#88cc44'});
    }
    // 5) 제구 (5영역 · V7.15: zoneX/Y 둘 다 -1~1 · 보더 공반지름 감안 0.85~1.15)
    let midS=0, sltS=0, gdS=0, brdS=0, inZS=0;
    pd.filter(d=>d.zoneX!=null).forEach(d=>{
      const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
      const rmax=Math.max(zx,zy);
      if(rmax<=1 && rmax<=0.4){midS++;inZS++;}
      else if(rmax>=0.85 && rmax<=1.15){brdS++;inZS++;}
      else if(rmax<=1){
        if(rmax<=0.6){sltS++;inZS++;}
        else{gdS++;inZS++;}
      }
    });
    if(inZS>=1){
      const mRate=midS/inZS*100, bRate=brdS/inZS*100, safeZone=(gdS+brdS)/inZS*100;
      const zTag=lowTag(inZS,30);
      // 실투 낮음 (리그 p10=6.8, p25=12.0, 평균 15.1)
      if(mRate<=7)reports.push({icon:'🎯',text:`존내 실투 ${mRate.toFixed(1)}% (${inZS}구 · 리그 상위 10% · 평균 15.1%)${zTag}`,color:'#39ff8a'});
      else if(mRate<=12)reports.push({icon:'🎯',text:`존내 실투 ${mRate.toFixed(1)}% (${inZS}구 · 리그 상위 25%)${zTag}`,color:'#88cc44'});
      // 보더 높음 (리그 p75=46, p90=52, 평균 37.5)
      if(bRate>=52)reports.push({icon:'✨',text:`보더라인 제구 ${bRate.toFixed(1)}% (${inZS}구 · 리그 상위 10% · 평균 37.5%)${zTag}`,color:'#39ff8a'});
      else if(bRate>=46)reports.push({icon:'✨',text:`보더라인 제구 ${bRate.toFixed(1)}% (${inZS}구 · 리그 상위 25%)${zTag}`,color:'#88cc44'});
      // 안전존 (리그 p75=73, p90=80)
      if(safeZone>=80)reports.push({icon:'📐',text:`안전존 제구 ${safeZone.toFixed(1)}% (${inZS}구 · 굿존+보더, 상위 10%)${zTag}`,color:'#39ff8a'});
      else if(safeZone>=73)reports.push({icon:'📐',text:`안전존 제구 ${safeZone.toFixed(1)}% (${inZS}구 · 굿존+보더, 상위 25%)${zTag}`,color:'#88cc44'});
    }
    // 6) 구종별 제압
    const groups={};
    pd.forEach(d=>{
      const g=wbdContext.pitchGroup(d.pType,d);
      if(!groups[g])groups[g]={batted:0,hits:0,swings:0,whiffs:0};
      if(wbdContext._isInPlay(d)){groups[g].batted++;if(wbdContext._isHit(d))groups[g].hits++;}
      if(d.bSwing){groups[g].swings++;if(d.call===4)groups[g].whiffs++;}
    });
    Object.entries(groups).forEach(([g,v])=>{
      if(v.batted>=1){
        const ba=v.hits/v.batted;
        if(ba<=0.200)reports.push({icon:'🔒',text:`${g} 피안타율 ${ba.toFixed(3).replace(/^0/,'')} (${v.batted}타구 · 제압 구종)${lowTag(v.batted,10)}`,color:'#39ff8a'});
      }
      if(v.swings>=1){
        const whiffPct=v.whiffs/v.swings*100;
        if(whiffPct>=40)reports.push({icon:'💫',text:`${g} 헛스윙률 ${whiffPct.toFixed(1)}% (${v.swings}스윙 · 결정구)${lowTag(v.swings,15)}`,color:'#39ff8a'});
      }
    });
    // 7) 구종 다양성
    const grps=Object.keys(groups).filter(g=>groups[g].batted+groups[g].swings>0);
    if(grps.length>=6)reports.push({icon:'🎭',text:`${grps.length}종 구사 (멀티피처)`,color:'#88cc44'});

    // 8) 초구 스트라이크% (ball=0 & strk=0 에서 스트라이크 판정)
    const firstPitches=pd.filter(d=>d.ball===0&&d.strk===0);
    if(firstPitches.length>=1){
      const fps=firstPitches.filter(d=>d.call===0||d.call===2||d.call===4);
      const fpsPct=fps.length/firstPitches.length*100;
      const fpTag=lowTag(firstPitches.length,20);
      // 리그 p50=72, p75=78, p90=80
      if(fpsPct>=80)reports.push({icon:'🎯',text:`초구 스트라이크 ${fpsPct.toFixed(1)}% (${firstPitches.length}타석 · 리그 상위 10% · 평균 72%)${fpTag}`,color:'#39ff8a'});
      else if(fpsPct>=78)reports.push({icon:'🎯',text:`초구 스트라이크 ${fpsPct.toFixed(1)}% (${firstPitches.length}타석 · 리그 상위 25%)${fpTag}`,color:'#88cc44'});
    }

    // 9) 타석당 투구수 (효율성, 낮을수록 좋음)
    const paEnd=wbdContext._countPaEnd(pd);
    if(paEnd.length>=5){
      const ppPA=pd.length/paEnd.length;
      const paTag=lowTag(paEnd.length,15);
      // 리그 p10=2.64, p25=3.03, p50=3.30
      if(ppPA<=2.8)reports.push({icon:'⚡',text:`타석당 투구수 ${ppPA.toFixed(2)}개 (${paEnd.length}타석 · 리그 상위 10% · 평균 3.30개)${paTag}`,color:'#39ff8a'});
      else if(ppPA<=3.05)reports.push({icon:'⚡',text:`타석당 투구수 ${ppPA.toFixed(2)}개 (${paEnd.length}타석 · 리그 상위 25%)${paTag}`,color:'#88cc44'});
    }

  } else if(card.type==='batter'){
    const bd=wbdContext.getBatterDataByName(name).filter(wbdContext._isInPlay);
    const bdQ=bd.filter(d=>!wbdContext._isBunt(d)); // 타구질용 (번트 제외)
    const allBd=wbdContext.getBatterDataByName(name);
    if(bd.length<1)return [];
    // 표준 BA (AB = 인플레이 + K)
    const hits = allBd.filter(wbdContext._isHit).length;
    const hrs = allBd.filter(d => +d.result===4).length;
    const singles = allBd.filter(d => +d['1BSafe']===1 && +d.result!==4).length;
    const ab = allBd.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const ba = ab > 0 ? hits/ab : 0;
    const slg = ab > 0 ? wbdContext._totalBases(allBd) / ab : 0;  // V10.1: 정확한 SLG
    const bTag=lowTag(ab,15);
    // 1) 타율
    if(ba>=0.400)reports.push({icon:'🎯',text:`타율 ${ba.toFixed(3).replace(/^0/,'')} (${ab}타수 · 리그 상위 10% · 평균 .323)${bTag}`,color:'#39ff8a'});
    else if(ba>=0.360)reports.push({icon:'🎯',text:`타율 ${ba.toFixed(3).replace(/^0/,'')} (${ab}타수 · 리그 상위 25%)${bTag}`,color:'#88cc44'});
    // 2) 장타율
    if(slg>=0.550)reports.push({icon:'💥',text:`장타율 ${slg.toFixed(3).replace(/^0/,'')} (${ab}타수 · 리그 상위 10%)${bTag}`,color:'#ff4560'});
    else if(slg>=0.450)reports.push({icon:'💥',text:`장타율 ${slg.toFixed(3).replace(/^0/,'')} (${ab}타수 · 리그 상위 25%)${bTag}`,color:'#ff8800'});
    // 3) 평균 EV (번트 제외)
    if(bdQ.length>=1){
      const avgEV=bdQ.reduce((a,b)=>a+(+b.ev),0)/bdQ.length;
      if(avgEV>=108)reports.push({icon:'💪',text:`평균 EV ${avgEV.toFixed(1)}km/h (${bdQ.length}타구 · 리그 상위 10% · 평균 97)${bTag}`,color:'#ff4560'});
      else if(avgEV>=102)reports.push({icon:'💪',text:`평균 EV ${avgEV.toFixed(1)}km/h (${bdQ.length}타구 · 리그 상위 25%)${bTag}`,color:'#ff8800'});
      // 4) 배럴% (번트 제외)
      const barrels=bdQ.filter(d=>wbdContext._isBarrel(d)).length;
      const barrelPct=barrels/bdQ.length*100;
      if(barrelPct>=22)reports.push({icon:'🎪',text:`배럴% ${barrelPct.toFixed(1)}% (${bdQ.length}타구 · 리그 상위 10%)${bTag}`,color:'#ffd700'});
      else if(barrelPct>=16)reports.push({icon:'🎪',text:`배럴% ${barrelPct.toFixed(1)}% (${bdQ.length}타구 · 리그 상위 25%)${bTag}`,color:'#cc9900'});
    }
    // 5) 헛스윙 적음
    const swings=allBd.filter(d=>d.bSwing).length;
    const whiffs=allBd.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    if(swings>=1){
      const whiffPct=whiffs/swings*100;
      const sTag=lowTag(swings,15);
      // 리그 실측 p10=21.6%, p25=25.4%, p50=33.9%
      if(whiffPct<=22)reports.push({icon:'🎯',text:`헛스윙 ${whiffPct.toFixed(1)}% (${swings}스윙 · 리그 상위 10% · 평균 34%)${sTag}`,color:'#39ff8a'});
      else if(whiffPct<=26)reports.push({icon:'🎯',text:`헛스윙 ${whiffPct.toFixed(1)}% (${swings}스윙 · 리그 상위 25%)${sTag}`,color:'#88cc44'});
    }
    // 6) 선구안 (체이스 낮음)
    const outZone=allBd.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
    if(outZone.length>=1){
      const chasePct=outZone.filter(d=>d.bSwing).length/outZone.length*100;
      const oTag=lowTag(outZone.length,15);
      if(chasePct<=44)reports.push({icon:'👁️',text:`존밖 체이스 ${chasePct.toFixed(1)}% (${outZone.length}구 · 선구안 상위 10%)${oTag}`,color:'#39ff8a'});
      else if(chasePct<=50)reports.push({icon:'👁️',text:`존밖 체이스 ${chasePct.toFixed(1)}% (${outZone.length}구 · 선구안 상위 25%)${oTag}`,color:'#88cc44'});
    }
    // 7) 스윗스팟
    const hposData=bd.filter(d=>d.hPos!=null);
    if(hposData.length>=1){
      const sweetPct=hposData.filter(d=>+d.hPos>=0.35&&+d.hPos<=0.65).length/hposData.length*100;
      const hTag=lowTag(hposData.length,15);
      if(sweetPct>=27)reports.push({icon:'🎪',text:`스윗스팟% ${sweetPct.toFixed(1)}% (${hposData.length}타구 · 리그 상위 10%)${hTag}`,color:'#cc88ff'});
      else if(sweetPct>=21)reports.push({icon:'🎪',text:`스윗스팟% ${sweetPct.toFixed(1)}% (${hposData.length}타구 · 리그 상위 25%)${hTag}`,color:'#aa77dd'});
    }
    // 8) 홈런 파워 (HR/타구 비율)
    const hrPct=bd.length?hrs/bd.length*100:0;
    if(hrPct>=7.5)reports.push({icon:'🚀',text:`홈런 ${hrs}개 · HR/타구 ${hrPct.toFixed(1)}% (${bd.length}타구 · 리그 상위 10% · 평균 2.5%)${bTag}`,color:'#ff4560'});
    else if(hrPct>=4.5)reports.push({icon:'🚀',text:`홈런 ${hrs}개 · HR/타구 ${hrPct.toFixed(1)}% (${bd.length}타구 · 리그 상위 25%)${bTag}`,color:'#ff8800'});

    // 9) 끈질긴 타자 / 공격적 타자 (타석당 투구수)
    const paEndB=wbdContext._countPaEnd(allBd);
    if(paEndB.length>=5){
      const ppPA=allBd.length/paEndB.length;
      const paTag=lowTag(paEndB.length,10);
      // 리그 p50=3.37, p90=4.81 끈질김, p10=2.5 공격형
      if(ppPA>=4.5)reports.push({icon:'🕰️',text:`타석당 투구수 ${ppPA.toFixed(2)}개 (${paEndB.length}타석 · 끈질김 상위 10% · 평균 3.37개)`,color:'#39ff8a'});
      else if(ppPA>=4.0)reports.push({icon:'🕰️',text:`타석당 투구수 ${ppPA.toFixed(2)}개 (${paEndB.length}타석 · 끈질김 상위 25%)${paTag}`,color:'#88cc44'});
    }

    // 10) 초구 공격성 vs 선구 (특성)
    const firstPitchesB=allBd.filter(d=>d.ball===0&&d.strk===0);
    if(firstPitchesB.length>=5){
      const fpSwPct=firstPitchesB.filter(d=>d.bSwing).length/firstPitchesB.length*100;
      const fpTag=lowTag(firstPitchesB.length,10);
      // 리그 p50=49%, p90=69% 공격형, p10=25% 선구형
      if(fpSwPct>=65)reports.push({icon:'💥',text:`초구 스윙 ${fpSwPct.toFixed(0)}% (${firstPitchesB.length}타석 · 공격적 타자 상위 10%)${fpTag}`,color:'#ff8800'});
      else if(fpSwPct<=28)reports.push({icon:'👁️',text:`초구 스윙 ${fpSwPct.toFixed(0)}% (${firstPitchesB.length}타석 · 선구형 상위 10% · 평균 49%)${fpTag}`,color:'#39ff8a'});
    }

    // 11) 번트 전문가 (특성 · 재미요소)
    const buntsAll=allBd.filter(d=>wbdContext._isBunt(d));
    if(buntsAll.length>=3){
      const buntHits=buntsAll.filter(d=>d['1BSafe']==1).length;
      const buntRate=buntHits/buntsAll.length*100;
      if(buntsAll.length>=5 && buntRate>=50){
        reports.push({icon:'🎋',text:`번트 마스터 · ${buntsAll.length}회 시도, ${buntHits}개 안타 (성공률 ${buntRate.toFixed(0)}%)`,color:'#88ccaa'});
      } else if(buntsAll.length>=5){
        reports.push({icon:'🎋',text:`번트 전문가 · 리그 최다 수준 ${buntsAll.length}회 시도 (성공 ${buntHits}개)`,color:'#66aa88'});
      } else if(buntRate>=70){
        reports.push({icon:'🎋',text:`번트 히터 · ${buntsAll.length}회 중 ${buntHits}개 안타 (${buntRate.toFixed(0)}%)`,color:'#88cc66'});
      } else {
        reports.push({icon:'🎋',text:`번트 시도 ${buntsAll.length}회 (성공 ${buntHits}개 · 리그 평균 이상 시도)`,color:'#66aa88'});
      }
    }
  }
  return reports;
};

// Original index.html:16266
wbdContext.generateWeaknessReport = function generateWeaknessReport(card){
  const reports=[];
  const name=card.name;
  const lowTag=(n,thr)=>n<thr?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
  if(card.type==='pitcher'){
    const pd=wbdContext.getPitcherDataByName(name);
    if(pd.length<1)return [{icon:'📊',text:'데이터 없음',color:'var(--muted)'}];
    
    // 0) ERA / WHIP 약점 (캐싱된 헬퍼)
    const _ps=wbdContext._getPitcherSeason(name);
    const totalIp=_ps.ip, totalOuts=_ps.outs;
    if(totalIp>=3){
      const era=_ps.era;
      const whip=_ps.whip;
      // 실측: ERA p75=7.27, p85=7.89, p90=8.07 / WHIP p75=1.83, p85=2.08, p90=2.17
      if(era>=8.00)reports.push({icon:'🔥',text:`ERA ${era.toFixed(2)} (${Math.floor(totalIp)}.${totalOuts%3}이닝 · 위험 · 리그 하위 15%)`,color:'#ff4560'});
      else if(era>=7.00)reports.push({icon:'🔥',text:`ERA ${era.toFixed(2)} (${Math.floor(totalIp)}.${totalOuts%3}이닝 · 부진 · 리그 하위 25%)`,color:'#ff8800'});
      if(whip>=2.10)reports.push({icon:'🚪',text:`WHIP ${whip.toFixed(2)} · 출루 너무 많이 허용 (하위 15%)`,color:'#ff4560'});
      else if(whip>=1.85)reports.push({icon:'🚪',text:`WHIP ${whip.toFixed(2)} · 출루 허용률 높음 (하위 25%)`,color:'#ff8800'});
    }
    
    // 전체 피홈런 비율 (리그 p75=4.9%, p90=6.4% · V11.1 인플레이 실측)
    const battedAll=pd.filter(wbdContext._isInPlay);
    const battedAllQ=battedAll.filter(d=>!wbdContext._isBunt(d));
    if(battedAll.length>=1){
      const hrsAll=battedAll.filter(d=>d.result===4).length;
      const hrPct=hrsAll/battedAll.length*100;
      const tag=lowTag(battedAll.length,15);
      if(hrPct>=6.4)reports.push({icon:'💥',text:`전체 피홈런 ${hrsAll}개 · HR% ${hrPct.toFixed(1)}% (${battedAll.length}타구 · 리그 상위 10% · 평균 4.3%)${tag}`,color:'#ff4560'});
      else if(hrPct>=4.9)reports.push({icon:'💥',text:`전체 피홈런 ${hrsAll}개 · HR% ${hrPct.toFixed(1)}% (${battedAll.length}타구 · 리그 상위 25%)${tag}`,color:'#ff8800'});
      // 피하드히트 많음 (EV≥110, 번트 제외)
      const hhA=battedAllQ.filter(d=>wbdContext._isHardHit(d)).length;
      const hhPctA=battedAllQ.length?hhA/battedAllQ.length*100:0;
      if(hhPctA>=49)reports.push({icon:'💣',text:`피하드히트 ${hhPctA.toFixed(1)}% (${battedAll.length}타구 · 리그 상위 10% 위험 · 평균 40%)${tag}`,color:'#ff4560'});
      else if(hhPctA>=43)reports.push({icon:'💣',text:`피하드히트 ${hhPctA.toFixed(1)}% (${battedAll.length}타구 · 리그 상위 25% 위험)${tag}`,color:'#ff8800'});
    }
    // 구종별 피안타율 (리그 인플레이 평균 .455 + 0.13 = 0.585 · V11.1)
    const groups={};
    pd.forEach(d=>{
      const g=wbdContext.pitchGroup(d.pType,d);
      if(!groups[g])groups[g]={total:0,batted:0,hits:0,hrs:0,whiffs:0,swings:0};
      groups[g].total++;
      if(wbdContext._isInPlay(d)){groups[g].batted++;if(wbdContext._isHit(d))groups[g].hits++;if(d.result===4)groups[g].hrs++;}
      if(d.bSwing){groups[g].swings++;if(d.call===4)groups[g].whiffs++;}
    });
    Object.entries(groups).forEach(([g,v])=>{
      if(v.batted<1)return;
      const ba=v.hits/v.batted;
      const lowTag=v.batted<10?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(ba>=0.585)reports.push({icon:'⚠️',text:`${g} 피안타율 ${ba.toFixed(3).replace(/^0/,'')} (${v.batted}타구 · 리그 평균 +0.13 이상 위험)${lowTag}`,color:'#ff4560'});
      // 구종별 피홈런 비율
      if(v.hrs>0){
        const hrRate=v.hrs/v.batted*100;
        if(hrRate>=8.5)reports.push({icon:'💥',text:`${g} 피홈런 ${v.hrs}개 / ${v.batted}타구 (${hrRate.toFixed(1)}% · 리그 상위 10%)${lowTag}`,color:'#ff4560'});
        else if(hrRate>=11)reports.push({icon:'💥',text:`${g} 피홈런 ${v.hrs}개 / ${v.batted}타구 (${hrRate.toFixed(1)}% · 리그 상위 25%)${lowTag}`,color:'#ff8800'});
      }
    });
    // 제구 영역 분석 (V7.15: zoneX/Y 둘 다 -1~1 · 공반지름 감안 보더 0.85~1.15)
    let midW=0, sltW=0, gdW=0, brdW=0, inZW=0;
    pd.filter(d=>d.zoneX!=null).forEach(d=>{
      const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
      const rmax=Math.max(zx,zy);
      if(rmax<=1 && rmax<=0.4){midW++;inZW++;}
      else if(rmax>=0.85 && rmax<=1.15){brdW++;inZW++;}
      else if(rmax<=1){
        if(rmax<=0.6){sltW++;inZW++;}
        else{gdW++;inZW++;}
      }
    });
    if(inZW>=1){
      const mRate=midW/inZW*100;
      const sRate=sltW/inZW*100;
      const gRate=gdW/inZW*100;
      const bRate=brdW/inZW*100;
      const zTag=lowTag(inZW,30);
      // 실투 (리그 평균 15.1%, p75=20, p90=25)
      if(mRate>=25)reports.push({icon:'🎯',text:`존내 중앙 실투 ${mRate.toFixed(1)}% (리그 상위 10% · 평균 15.1%)${zTag}`,color:'#ff4560'});
      else if(mRate>=20)reports.push({icon:'🎯',text:`존내 중앙 실투 ${mRate.toFixed(1)}% (리그 상위 25%)${zTag}`,color:'#ff8800'});
      // 살짝 (리그 평균 16.7%, p90=24)
      if(sRate>=24)reports.push({icon:'💢',text:`살짝 몰린 공 ${sRate.toFixed(1)}% (리그 상위 10% · 평균 16.7%)${zTag}`,color:'#ff8c44'});
      // 실투+살짝 합산
      const badMist=mRate+sRate;
      if(badMist>=45)reports.push({icon:'⚠️',text:`중앙권(실투+살짝) ${badMist.toFixed(1)}% (심각 · 리그 평균 31.8%)${zTag}`,color:'#ff4560'});
      // 보더 낮음 (리그 평균 37.5%, p10=28)
      if(bRate<30)reports.push({icon:'📐',text:`존내 보더라인 제구 ${bRate.toFixed(1)}% (리그 평균 37.5% 대비 낮음)${zTag}`,color:'#f5a623'});
      // 안전존 낮음 (리그 평균 66.3%, p10=55)
      const safeZone=gRate+bRate;
      if(safeZone<56)reports.push({icon:'🎯',text:`안전 제구 비율 ${safeZone.toFixed(1)}% (굿존+보더, 리그 평균 66.3% 대비 낮음)${zTag}`,color:'#f5a623'});
    }
    // 2아웃 이후 피안타 (리그 인플레이 평균 .430 + 0.08 · V11.1)
    const twoOutBatted=pd.filter(d=>d.out===2&&wbdContext._isInPlay(d));
    if(twoOutBatted.length>=1){
      const twoOutBa=twoOutBatted.filter(wbdContext._isHit).length/twoOutBatted.length;
      const lowTag=twoOutBatted.length<10?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(twoOutBa>=0.510)reports.push({icon:'⏰',text:`2아웃 이후 피안타율 ${twoOutBa.toFixed(3).replace(/^0/,'')} (${twoOutBatted.length}타구 · 위기 상황 약점)${lowTag}`,color:'#ff8800'});
    }
    // 불리 카운트 피안타
    const badCount=pd.filter(d=>((d.ball===2&&d.strk===0)||(d.ball===3&&d.strk===1))&&wbdContext._isInPlay(d));
    if(badCount.length>=1){
      const bcBa=badCount.filter(wbdContext._isHit).length/badCount.length;
      const lowTag=badCount.length<5?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(bcBa>=0.550)reports.push({icon:'📉',text:`불리 카운트(2-0,3-1) 피안타율 ${bcBa.toFixed(3).replace(/^0/,'')} (${badCount.length}타구)${lowTag}`,color:'#ff8800'});
    }
    // 좌/우타 split
    const vsL=pd.filter(d=>d.bZone==='L'&&wbdContext._isInPlay(d));
    const vsR=pd.filter(d=>d.bZone==='R'&&wbdContext._isInPlay(d));
    if(vsL.length>=1&&vsR.length>=1){
      const baL=vsL.filter(wbdContext._isHit).length/vsL.length;
      const baR=vsR.filter(wbdContext._isHit).length/vsR.length;
      const lowTag=(vsL.length<10||vsR.length<10)?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(Math.abs(baL-baR)>=0.150){
        const weak=baL>baR?'좌타':'우타';
        const num=Math.max(baL,baR).toFixed(3).replace(/^0/,'');
        reports.push({icon:'↔️',text:`${weak} 상대 피안타율 ${num} (split 큼 · 좌${vsL.length}/우${vsR.length}타구)${lowTag}`,color:'#f5a623'});
      }
    }
    // 초구 스트라이크 낮음 (약점)
    const firstPitchesW=pd.filter(d=>d.ball===0&&d.strk===0);
    if(firstPitchesW.length>=1){
      const fpsW=firstPitchesW.filter(d=>d.call===0||d.call===2||d.call===4);
      const fpsPctW=fpsW.length/firstPitchesW.length*100;
      const fpTagW=lowTag(firstPitchesW.length,20);
      if(fpsPctW<60)reports.push({icon:'🎯',text:`초구 스트라이크 ${fpsPctW.toFixed(1)}% (${firstPitchesW.length}타석 · 리그 평균 72% 대비 낮음)${fpTagW}`,color:'#f5a623'});
    }
    // 타석당 투구수 많음 (비효율)
    const paEndW=wbdContext._countPaEnd(pd);
    if(paEndW.length>=5){
      const ppPAW=pd.length/paEndW.length;
      const paTagW=lowTag(paEndW.length,15);
      if(ppPAW>=3.9)reports.push({icon:'⚠️',text:`타석당 투구수 ${ppPAW.toFixed(2)}개 (${paEndW.length}타석 · 리그 상위 10% 비효율 · 평균 3.30개)${paTagW}`,color:'#ff8800'});
      else if(ppPAW>=3.6)reports.push({icon:'⚠️',text:`타석당 투구수 ${ppPAW.toFixed(2)}개 (${paEndW.length}타석 · 리그 상위 25% 비효율)${paTagW}`,color:'#f5a623'});
    }
    if(reports.length===0)reports.push({icon:'✅',text:'눈에 띄는 약점이 없어요',color:'#39ff8a'});
  } else {
    const all=wbdContext.getBatterDataByName(name);
    const bd=all.filter(wbdContext._isInPlay);
    const bdQ=bd.filter(d=>!wbdContext._isBunt(d)); // 타구질용 (번트 제외)
    if(bd.length<1)return [{icon:'📊',text:'데이터 없음',color:'var(--muted)'}];
    // 구종별 헛스윙률 (리그 평균 24%, p90=34% → 40%+ 는 실제 약점)
    const groups={};
    all.forEach(d=>{
      const g=wbdContext.pitchGroup(d.pType,d);
      if(!groups[g])groups[g]={total:0,batted:0,hits:0,whiffs:0,swings:0};
      groups[g].total++;
      if(wbdContext._isInPlay(d)){groups[g].batted++;if(wbdContext._isHit(d))groups[g].hits++;}
      if(d.bSwing){groups[g].swings++;if(!d.ev||+d.ev===0)groups[g].whiffs++;}
    });
    Object.entries(groups).forEach(([g,v])=>{
      if(v.swings<1)return;
      const whiff=v.whiffs/v.swings;
      // 구종별 리그 평균 헛스윙률 (ev=0 기준, 새 로직)
      // 직구계열: 포심 28.8%, 투심 30.3%, 커터 23.3%, 평균 ~29%
      // 변화구: 슬라이더 41%, 스플리터 35%, 커브 51%, 스크류 44%, 평균 ~41%
      const fbGroups=['포심','투심','커터','패스트볼'];
      const isFb=fbGroups.includes(g);
      const thrSevere=isFb?0.45:0.60;  // 직구 45%+ / 변화구 60%+ 심각
      const thrWarn=isFb?0.38:0.52;    // 직구 38%+ / 변화구 52%+ 경고
      const lgAvg=isFb?'29%':'41%';
      const lowTag=v.swings<10?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(whiff>=thrSevere)reports.push({icon:'⚠️',text:`${g} 헛스윙률 ${(whiff*100).toFixed(0)}% (${v.swings}스윙 · 리그 평균 ${lgAvg} 대비 심각)${lowTag}`,color:'#ff4560'});
      else if(whiff>=thrWarn)reports.push({icon:'⚠️',text:`${g} 헛스윙률 ${(whiff*100).toFixed(0)}% (${v.swings}스윙 · 리그 평균 ${lgAvg} 대비 높음)${lowTag}`,color:'#ff8800'});
    });
    // 2스트라이크 이후 헛스윙률
    const twoStr=all.filter(d=>d.strk===2);
    if(twoStr.length>=1){
      const kRate=twoStr.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length/twoStr.length;
      const lowTag=twoStr.length<10?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(kRate>=0.35)reports.push({icon:'📉',text:`2스트라이크 이후 헛스윙률 ${(kRate*100).toFixed(0)}% (${twoStr.length}구)${lowTag}`,color:'#ff8800'});
    }
    // 존밖 체이스
    const outZone=all.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
    if(outZone.length>=1){
      const chaseRate=outZone.filter(d=>d.bSwing).length/outZone.length;
      const lowTag=outZone.length<10?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(chaseRate>=0.60)reports.push({icon:'👀',text:`존 밖 스윙률 ${(chaseRate*100).toFixed(0)}% (${outZone.length}구 · 선구안 약점)${lowTag}`,color:'#f5a623'});
    }
    // 낮은 평균 EV (번트 제외)
    if(bdQ.length>=1){
      const avgEV=bdQ.reduce((a,b)=>a+(+b.ev),0)/bdQ.length;
      const evLowTag=bdQ.length<10?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(avgEV<89)reports.push({icon:'🪶',text:`평균 EV ${avgEV.toFixed(1)} (${bdQ.length}타구 · 타구 품질 약함)${evLowTag}`,color:'#f5a623'});
    }
    // 좌/우투 split
    const vsL=all.filter(d=>d.pHand==='L'&&wbdContext._isInPlay(d));
    const vsR=all.filter(d=>d.pHand==='R'&&wbdContext._isInPlay(d));
    if(vsL.length>=1&&vsR.length>=1){
      const baL=vsL.filter(wbdContext._isHit).length/vsL.length;
      const baR=vsR.filter(wbdContext._isHit).length/vsR.length;
      const lowTag=(vsL.length<10||vsR.length<10)?' <span style="opacity:0.6;font-size:10px">⚠️샘플적음</span>':'';
      if(Math.abs(baL-baR)>=0.150){
        const weak=baL<baR?'좌투':'우투';
        const num=Math.min(baL,baR).toFixed(3).replace(/^0/,'');
        reports.push({icon:'↔️',text:`${weak} 상대 타율 ${num} (split 큼 · 좌${vsL.length}/우${vsR.length}타구)${lowTag}`,color:'#f5a623'});
      }
    }
    if(reports.length===0)reports.push({icon:'✅',text:'눈에 띄는 약점이 없어요',color:'#39ff8a'});
  }
  return reports;
};

// Original index.html:16467
wbdContext.openAdvancedAnalysis = function openAdvancedAnalysis(name,type){
  const c=type==='pitcher'?wbdContext.calcPitcherCard(name):wbdContext.calcBatterCard(name);
  if(!c)return;
  const styles=wbdContext.classifyStyle(c);
  const similar=wbdContext.findSimilarPlayers(c,3);
  const weakness=wbdContext.generateWeaknessReport(c);
  const safeName=String(name).replace(/'/g,"\\'");

  let html=`<div style="margin-bottom:14px">
    <button onclick="closeModal();openCardDetail('${safeName}','${type}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 14px;border-radius:5px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px" onmouseover="this.style.borderColor='var(--amber)';this.style.color='var(--amber)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text)'">← 선수 카드로 돌아가기</button>
  </div>
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:11px;color:${type==='pitcher'?'#ff8c44':'#39ff8a'}">${type==='pitcher'?'투수':'타자'} · 심화 분석</div>
    <div style="font-size:22px;font-weight:900;color:var(--text);margin:4px 0">${name}</div>
    <div style="font-size:30px;font-weight:900;color:${wbdContext.cardOvrColor(c.OVR)};font-family:var(--mono)">${c.OVR} OVR</div>
  </div>`;

  // 스타일 분류
  html+='<div style="margin-bottom:20px">';
  html+='<div style="font-size:12px;color:var(--muted);margin-bottom:8px;letter-spacing:2px">🎭 스타일 분류</div>';
  html+='<div style="display:flex;gap:8px;flex-wrap:wrap">';
  styles.forEach(st=>{
    html+=`<div style="padding:8px 14px;background:${st.color}22;border:1px solid ${st.color};border-radius:6px">
      <div style="font-size:14px;font-weight:700;color:${st.color}">${st.label}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">${st.desc}</div>
    </div>`;
  });
  html+='</div></div>';

  // 유사 선수
  html+='<div style="margin-bottom:20px">';
  html+='<div style="font-size:12px;color:var(--muted);margin-bottom:8px;letter-spacing:2px">🧬 유사 스타일 플레이어 Top 3</div>';
  if(similar.length===0){
    html+='<div style="font-size:11px;color:var(--muted);padding:10px">비교 가능한 선수가 없어요</div>';
  } else {
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">';
    similar.forEach((s,i)=>{
      const ovrCol=wbdContext.cardOvrColor(s.card.OVR);
      const gotoFn=type==='pitcher'?'goToPitcher':'goToBatter';
      html+=`<div onclick="closeModal();${gotoFn}('${String(s.name).replace(/'/g,"\\'")}')" style="background:var(--card2);border:1px solid var(--border);border-radius:4px;padding:10px;cursor:pointer;text-align:center;transition:border-color .15s" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="font-size:9px;color:var(--muted);margin-bottom:2px">#${i+1}</div>
        <div style="font-size:12px;font-weight:600;margin-bottom:2px">${s.name}</div>
        <div style="font-family:var(--mono);font-size:16px;color:${ovrCol};font-weight:700;margin-bottom:4px">${s.card.OVR}</div>
        <div style="font-size:9px;color:var(--amber);font-family:var(--mono)">유사도 ${(s.cosSim*100).toFixed(0)}%</div>
      </div>`;
    });
    html+='</div>';
  }
  html+='</div>';

  // 강점 리포트 (V7.12)
  const strength=wbdContext.generateStrengthReport(c);
  if(strength.length>0){
    html+='<div style="margin-bottom:20px">';
    html+='<div style="font-size:12px;color:var(--muted);margin-bottom:8px;letter-spacing:2px">💪 자동 강점 리포트</div>';
    html+='<div style="display:flex;flex-direction:column;gap:6px">';
    strength.forEach(s=>{
      html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--card2);border-left:3px solid ${s.color};border-radius:3px">
        <span style="font-size:16px">${s.icon}</span>
        <span style="font-size:12px;color:${s.color}">${s.text}</span>
      </div>`;
    });
    html+='</div></div>';
  }

  // 약점 리포트
  html+='<div style="margin-bottom:20px">';
  html+='<div style="font-size:12px;color:var(--muted);margin-bottom:8px;letter-spacing:2px">📉 자동 약점 리포트</div>';
  html+='<div style="display:flex;flex-direction:column;gap:6px">';
  weakness.forEach(w=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--card2);border-left:3px solid ${w.color};border-radius:3px">
      <span style="font-size:16px">${w.icon}</span>
      <span style="font-size:12px;color:${w.color}">${w.text}</span>
    </div>`;
  });
  html+='</div></div>';

  // 투구 궤적 (투수만)
  if(type==='pitcher'){
    html+='<div style="margin-bottom:20px">';
    html+='<div style="font-size:12px;color:var(--muted);margin-bottom:8px;letter-spacing:2px">🌀 구종별 평균 궤적</div>';
    html+=wbdContext.renderTrajectoryViz(name);
    html+='</div>';
  }

  html+=`<div style="text-align:center;margin-top:20px"><button class="btn-secondary" onclick="closeModal()" style="font-size:12px;padding:8px 16px">닫기</button></div>`;
  wbdContext.openModal(html);
};

// Original index.html:16557
wbdContext.renderTrajectoryViz = function renderTrajectoryViz(pitcherName){
  const pd=wbdContext.getPitcherDataByName(pitcherName).filter(d=>d.spdK>0);
  // 구종별 평균 sH, sV 계산
  const groups={};
  pd.forEach(d=>{
    const g=wbdContext.pitchGroup(d.pType,d);
    if(g==='너클볼'||g==='패스트볼')return;
    if(!groups[g])groups[g]={sHs:[],sVs:[],gyros:[],spds:[],n:0};
    groups[g].sHs.push(+d.sH||0);
    groups[g].sVs.push(+d.sV||0);
    groups[g].gyros.push(+d.gyro||0);
    groups[g].spds.push(+d.spdK||0);
    groups[g].n++;
  });
  const validGroups=Object.entries(groups).filter(([_,v])=>v.n>=3);
  if(validGroups.length===0){
    return '<div style="font-size:11px;color:var(--muted);padding:10px;text-align:center">궤적 데이터가 없어요</div>';
  }

  const avg=arr=>arr.reduce((a,b)=>a+b,0)/arr.length;
  // SVG: 포수 시점 (타자 뒤에서 봄). 중앙 (0,0) = 홈플레이트 정중앙, 위쪽=+sV, 오른쪽=+sH
  const W=400, H=280, CX=W/2, CY=H/2;
  const SCALE=0.15; // 스핀 강도 → 픽셀 (시각화용)
  let items='';
  // 홈플레이트 존
  items+=`<rect x="${CX-40}" y="${CY-50}" width="80" height="100" fill="none" stroke="rgba(245,166,35,0.5)" stroke-width="1" stroke-dasharray="4,2"/>`;
  items+=`<text x="${CX}" y="${CY+75}" fill="var(--muted)" font-size="10" text-anchor="middle" font-family="sans-serif">스트라이크 존</text>`;
  // 투수 → 포수 방향 중앙선
  items+=`<line x1="${CX}" y1="${H-10}" x2="${CX}" y2="10" stroke="rgba(255,255,255,0.05)" stroke-dasharray="2,3"/>`;

  let legend='';
  validGroups.forEach(([g,v])=>{
    const avgH=avg(v.sHs), avgV=avg(v.sVs), avgSpd=avg(v.spds);
    const col=wbdContext.GROUP_COLORS[g]||'#888';
    // 투구 시작점은 아래 중앙, 도착점은 (avgH, avgV) 보정
    const startX=CX;
    const startY=H-20;
    const endX=CX+avgH*SCALE*0.7;
    const endY=CY+avgV*SCALE*0.5;
    // 베지어 제어점 (중간점을 돌리면서 커브)
    const cpX=(startX+endX)/2 + avgH*SCALE*0.3;
    const cpY=(startY+endY)/2 - 30;
    items+=`<path d="M ${startX},${startY} Q ${cpX},${cpY} ${endX},${endY}" fill="none" stroke="${col}" stroke-width="2.5" opacity="0.75"/>`;
    items+=`<circle cx="${endX}" cy="${endY}" r="5" fill="${col}" opacity="0.9"/>`;
    items+=`<text x="${endX+8}" y="${endY+4}" fill="${col}" font-size="10" font-weight="600" font-family="sans-serif">${g} ${avgSpd.toFixed(0)}</text>`;
    legend+=`<div style="display:inline-flex;align-items:center;gap:4px;font-size:10px;margin-right:8px"><span style="display:inline-block;width:8px;height:8px;background:${col};border-radius:50%"></span><span style="color:${col}">${g}</span></div>`;
  });

  return `<div style="background:#0a1828;border:1px solid var(--border);border-radius:6px;padding:10px">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:420px;display:block;margin:0 auto">${items}</svg>
    <div style="margin-top:8px;text-align:center">${legend}</div>
    <div style="font-size:9px;color:var(--muted);text-align:center;margin-top:4px">※ 각 구종의 평균 무브먼트 기반 궤적 (포수 시점)</div>
  </div>`;
};

// Original index.html:16621
wbdContext.switchInsightTab = function switchInsightTab(i){
  window.activeInsightTab=i;
  document.querySelectorAll('#page-insights .stab').forEach((b,idx)=>b.classList.toggle('active',idx===i));
  wbdContext.renderInsightsPage();
};

// Original index.html:16631
wbdContext._saveMyTeams = function _saveMyTeams(){try{localStorage.setItem('wbd_my_teams',JSON.stringify(window.MY_TEAMS||{teams:[],active:null}));}catch(e){console.warn('저장 실패',e);}};

// Original index.html:16654
wbdContext.showPitcherPitchGroupAnalysis = function showPitcherPitchGroupAnalysis(pitcherName, group){
  // 1) 전체 리그의 그 구종 데이터 수집
  const allGroupData=wbdContext.G.filter(d=>d.pName && d.pType!=null && wbdContext.pitchGroup(d.pType,d)===group);
  if(!allGroupData.length){alert('해당 구종 데이터가 없습니다.');return;}
  
  // 2) 이 투수의 데이터
  const pData=allGroupData.filter(d=>d.pName===pitcherName);
  if(!pData.length){alert('이 투수는 해당 구종을 던지지 않았어요.');return;}
  
  // 헬퍼: 통계 계산
  const calcStats=(arr)=>{
    const spd=arr.filter(d=>d.spdK>0).map(d=>+d.spdK);
    const sH=arr.filter(d=>d.sH!=null).map(d=>Math.abs(+d.sH));
    const sV=arr.filter(d=>d.sV!=null).map(d=>Math.abs(+d.sV));
    const gy=arr.filter(d=>d.gyro!=null && d.gyro!=='' && +d.gyro!==0).map(d=>Math.abs(+d.gyro));
    const ev=arr.filter(d=>wbdContext._isInPlay(d) && !wbdContext._isBunt(d)).map(d=>+d.ev);
    const swings=arr.filter(d=>d.bSwing).length;
    const whiffs=arr.filter(d=>(d.bSwing && +d.call!==2)).length;
    // 안타: 1BSafe=1 또는 result===4 (홈런)
    const hits=arr.filter(wbdContext._isHit).length;
    const hr=arr.filter(d=>+d.result===4).length;
    // AB: 안타 + 인플레이 아웃 + K (표준 sabermetrics)
    const ab=arr.filter(d=>{
      const r=+d.result;
      const isHit=+d['1BSafe']===1||r===4;
      const isK = (wbdContext._isK(d));
      return isHit || r===1 || r===2 || isK;
    }).length;
    
    // PV/xPV/xPV+ — CRV (Count-based Run Value) 정밀 계산
    const pv = wbdContext._pvSum(arr);
    const xpv = wbdContext._xPvSum(arr);
    const xpvPlus = wbdContext._xPvPlusSum(arr);
    const pv100 = arr.length>0 ? pv/arr.length*100 : 0;
    const xpv100 = arr.length>0 ? xpv/arr.length*100 : 0;
    const xpvPlus100 = arr.length>0 ? xpvPlus/arr.length*100 : 0;
    const pvDiff = pv - xpv;
    const pvDiff100 = arr.length>0 ? pvDiff/arr.length*100 : 0;
    
    const inZone=arr.filter(d=>{
      const zx=+d.zoneX, zy=+d.zoneY;
      return zx>=-1 && zx<=1 && zy>=-1 && zy<=1;
    }).length;
    const hardHit=ev.filter(v=>v>=110).length;
    const barrel=arr.filter(d=>wbdContext._isBarrel(d)).length;
    const sum=(a)=>a.reduce((s,v)=>s+v,0);
    const avg=(a)=>a.length?sum(a)/a.length:null;
    return {
      n:arr.length,
      avgSpd:avg(spd), maxSpd:spd.length?Math.max(...spd):null, minSpd:spd.length?Math.min(...spd):null,
      avgSH:avg(sH), avgSV:avg(sV),
      avgMov:(avg(sH)!=null && avg(sV)!=null)?(avg(sH)+avg(sV))/2:null,
      avgGyro:avg(gy),
      avgEV:avg(ev),
      whiffPct:swings>0?whiffs/swings*100:0,
      ba:ab>0?hits/ab:0,
      hr:hr,
      hrPer1000:arr.length>0?hr/arr.length*1000:0,
      hhPct:ev.length>0?hardHit/ev.length*100:0,
      brlPct:ev.length>0?barrel/ev.length*100:0,
      inZonePct:arr.length>0?inZone/arr.length*100:0,
      pitches:arr.length,
      pv, xpv, xpvPlus, pv100, xpv100, xpvPlus100, pvDiff, pvDiff100
    };
  };
  
  const pStats=calcStats(pData);
  const lgStats=calcStats(allGroupData);
  
  // 3) 다른 투수들의 같은 구종 통계 → 순위 계산
  const otherPitchers={};
  allGroupData.forEach(d=>{
    if(!otherPitchers[d.pName])otherPitchers[d.pName]=[];
    otherPitchers[d.pName].push(d);
  });
  // 최소 5구 이상 던진 투수만
  const pitcherList=Object.entries(otherPitchers).filter(([n,arr])=>arr.length>=5).map(([n,arr])=>({name:n,...calcStats(arr)}));
  const rankByDesc=(key)=>{
    const sorted=[...pitcherList].sort((a,b)=>(b[key]||0)-(a[key]||0));
    const rank=sorted.findIndex(p=>p.name===pitcherName)+1;
    return {rank,total:sorted.length};
  };
  const rankByAsc=(key)=>{
    const sorted=[...pitcherList].sort((a,b)=>(a[key]||0)-(b[key]||0));
    const rank=sorted.findIndex(p=>p.name===pitcherName)+1;
    return {rank,total:sorted.length};
  };
  
  // 4) HTML 구성
  const groupColors={
    '포심':'#ff4560','투심':'#ff8c44','커터':'#ffd700','싱커':'#88ccff',
    '슬라이더':'#39ff8a','커브':'#2196f3','스플리터':'#cc44ff','스크류':'#ff6b8a',
    '체인지업':'#aa88ff','패스트볼':'#ffaa66'
  };
  const gColor=groupColors[group]||'#88ccff';
  
  // 비교 행 헬퍼
  const cmpRow=(label, pVal, lgVal, unit, higherBetter, rankInfo)=>{
    if(pVal==null && lgVal==null)return '';
    const pv=pVal!=null?pVal.toFixed(2):'-';
    const lv=lgVal!=null?lgVal.toFixed(2):'-';
    let diff='', diffCol='';
    if(pVal!=null && lgVal!=null){
      const d=pVal-lgVal;
      const pct=lgVal!==0?(d/lgVal*100):0;
      const isGood=higherBetter?d>0:d<0;
      diffCol=Math.abs(d)<0.01?'var(--muted)':isGood?'#39ff8a':'#ff4560';
      const arrow=d>0?'▲':d<0?'▼':'=';
      diff=`<span style="color:${diffCol};font-weight:700">${arrow} ${Math.abs(d).toFixed(2)} (${pct>=0?'+':''}${pct.toFixed(1)}%)</span>`;
    }
    let rankBar='';
    if(rankInfo && rankInfo.rank>0){
      const percentile=((rankInfo.total-rankInfo.rank+1)/rankInfo.total*100);
      const isTop=percentile>=50;
      const rCol=percentile>=80?'#ffd700':percentile>=60?'#39ff8a':percentile>=40?'#88ccff':percentile>=20?'#ff8c44':'#ff4560';
      rankBar=`<div style="margin-top:4px;font-size:10px"><span style="color:${rCol};font-weight:700">${rankInfo.rank}위 / ${rankInfo.total}명</span> <span style="color:var(--muted)">(상위 ${(100-percentile).toFixed(0)}%)</span></div>`;
    }
    return `<tr>
      <td style="font-size:11px;color:var(--text);padding:8px 10px">${label}</td>
      <td style="text-align:right;font-family:var(--mono);color:${gColor};font-weight:700;padding:8px 10px">${pv}${unit||''}</td>
      <td style="text-align:right;font-family:var(--mono);color:var(--muted);padding:8px 10px">${lv}${unit||''}</td>
      <td style="text-align:right;padding:8px 10px">${diff}${rankBar}</td>
    </tr>`;
  };
  
  const movRank=rankByDesc('avgMov');
  const spdRank=rankByDesc('avgSpd');
  const gyroRank=rankByDesc('avgGyro');
  const whiffRank=rankByDesc('whiffPct');
  const baRank=rankByAsc('ba');
  const hhRank=rankByAsc('hhPct');
  const brlRank=rankByAsc('brlPct');
  const inZoneRank=rankByDesc('inZonePct');
  // PV ranks (양수=좋음이므로 desc)
  const pvRank=rankByDesc('pv');
  const xpvRank=rankByDesc('xpv');
  const xpvPlusRank=rankByDesc('xpvPlus');
  const pv100Rank=rankByDesc('pv100');
  const xpv100Rank=rankByDesc('xpv100');
  const xpvPlus100Rank=rankByDesc('xpvPlus100');
  
  let html=`<div style="max-width:720px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;flex-wrap:wrap">
      <span style="font-size:22px;font-weight:900;color:${gColor}">${group}</span>
      <span style="color:var(--muted);font-size:13px">·</span>
      <span style="font-size:16px;font-weight:700;color:var(--text)">${pitcherName}</span>
    </div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px">리그 비교 분석 · 이 투수의 ${group} ${pStats.pitches}구 vs 리그 전체 ${lgStats.pitches.toLocaleString()}구</div>
    
    <table style="width:100%;border-collapse:collapse;background:var(--card2);border-radius:6px;overflow:hidden">
      <thead>
        <tr style="background:var(--card);font-size:10px;letter-spacing:0.5px;color:var(--muted)">
          <th style="text-align:left;padding:8px 10px">지표</th>
          <th style="text-align:right;padding:8px 10px;color:${gColor}">이 투수</th>
          <th style="text-align:right;padding:8px 10px">리그 평균</th>
          <th style="text-align:right;padding:8px 10px">차이 & 순위</th>
        </tr>
      </thead>
      <tbody style="font-size:12px">
        <tr style="background:rgba(255,140,68,0.05)"><td colspan="4" style="padding:6px 10px;font-size:10px;color:#ff8c44;font-weight:700">⚡ 구속·움직임</td></tr>
        ${cmpRow('평균 구속', pStats.avgSpd, lgStats.avgSpd, ' km/h', true, spdRank)}
        ${cmpRow('최고 구속', pStats.maxSpd, lgStats.maxSpd, ' km/h', true)}
        ${cmpRow('횡변 (sH)', pStats.avgSH, lgStats.avgSH, ' cm', true)}
        ${cmpRow('종변 (sV)', pStats.avgSV, lgStats.avgSV, ' cm', true)}
        ${cmpRow('평균 무브 (횡+종)/2', pStats.avgMov, lgStats.avgMov, ' cm', true, movRank)}
        ${cmpRow('자이로', pStats.avgGyro, lgStats.avgGyro, '°', true, gyroRank)}
        
        <tr style="background:rgba(57,255,138,0.05)"><td colspan="4" style="padding:6px 10px;font-size:10px;color:#39ff8a;font-weight:700">🎯 제구</td></tr>
        ${cmpRow('존인 비율', pStats.inZonePct, lgStats.inZonePct, '%', true, inZoneRank)}
        
        <tr style="background:rgba(204,68,255,0.05)"><td colspan="4" style="padding:6px 10px;font-size:10px;color:#cc44ff;font-weight:700">💪 결과 (압도력)</td></tr>
        ${cmpRow('헛스윙률', pStats.whiffPct, lgStats.whiffPct, '%', true, whiffRank)}
        ${cmpRow('피안타율', pStats.ba, lgStats.ba, '', false, baRank)}
        ${cmpRow('피홈런 (총)', pStats.hr, lgStats.hr/pitcherList.length, '개', false)}
        ${cmpRow('피홈런 (1000구 당)', pStats.hrPer1000, lgStats.hrPer1000, '', false)}
        ${cmpRow('평균 피EV', pStats.avgEV, lgStats.avgEV, ' mph', false)}
        ${cmpRow('하드힛 허용%', pStats.hhPct, lgStats.hhPct, '%', false, hhRank)}
        ${cmpRow('배럴 허용%', pStats.brlPct, lgStats.brlPct, '%', false, brlRank)}
        
        <tr style="background:rgba(255,215,0,0.05)"><td colspan="4" style="padding:6px 10px;font-size:10px;color:#ffd700;font-weight:700">⚖️ 구종 가치 (Pitch Value)</td></tr>
        ${cmpRow('PV (실제, 시즌 누적)', pStats.pv, lgStats.pv/pitcherList.length, '', true, pvRank)}
        ${cmpRow('xPV (기대, EV/LA 기반)', pStats.xpv, lgStats.xpv/pitcherList.length, '', true, xpvRank)}
        ${cmpRow('xPV+ (리그 평균 대비)', pStats.xpvPlus, 0, '', true, xpvPlusRank)}
        ${cmpRow('운 (PV - xPV)', pStats.pvDiff, 0, '', false)}
        ${cmpRow('운/100', pStats.pvDiff100, 0, '', false)}
        ${cmpRow('PV/100', pStats.pv100, pitcherList.reduce((s,p)=>s+(p.pv100||0),0)/Math.max(1,pitcherList.length), '', true, pv100Rank)}
        ${cmpRow('xPV/100', pStats.xpv100, pitcherList.reduce((s,p)=>s+(p.xpv100||0),0)/Math.max(1,pitcherList.length), '', true, xpv100Rank)}
        ${cmpRow('xPV+/100', pStats.xpvPlus100, 0, '', true, xpvPlus100Rank)}
      </tbody>
    </table>
    
    <div style="margin-top:14px;padding:10px;background:var(--card2);border-radius:4px;font-size:10px;color:var(--muted);line-height:1.6">
      💡 <strong style="color:${gColor}">▲</strong> = 리그 평균보다 높음, <strong style="color:#ff4560">▼</strong> = 낮음<br>
      · 구속·움직임은 <span style="color:#39ff8a">▲ 높을수록 좋음</span> / 피안타·피홈런·하드힛은 <span style="color:#39ff8a">▼ 낮을수록 좋음</span><br>
      · 순위 색상: 🥇상위20% / 🟢40~60% / 🔵60~80% / 🟠20~40% / 🔴하위20%<br>
      · 최소 5구 이상 던진 투수 ${pitcherList.length}명 기준
    </div>
    
    <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end">
      <button onclick="closeModal();goToPitchType('${group.replace(/'/g,"\\'")}')" style="background:linear-gradient(90deg,${gColor},#88ccff);color:#000;border:none;padding:8px 16px;border-radius:5px;font-size:12px;font-weight:700;cursor:pointer">🎯 ${group} 전체 랭킹 보기</button>
    </div>
  </div>`;
  wbdContext.openModal(html);
};
}

export function initialize(wbdContext) {
// Original index.html:16620
window.activeInsightTab=window.activeInsightTab||0;

// Original index.html:16629
window.MY_TEAMS=(()=>{try{return JSON.parse(localStorage.getItem('wbd_my_teams')||'{"teams":[],"active":null}');}catch(e){return {teams:[],active:null};}})();

// Original index.html:16634
wbdContext.MY_TEAM_SLOTS = ['P','C','1B','2B','3B','SS','LF','CF','RF','DH'];

// Original index.html:16635
wbdContext.POS_LABEL = {P:'선발투수',C:'포수','1B':'1루수','2B':'2루수','3B':'3루수',SS:'유격수',LF:'좌익수',CF:'중견수',RF:'우익수',DH:'지명타자'};

// Original index.html:16638
wbdContext.DIAMOND_POSITIONS = {
  CF:{x:50,y:12},   // 중앙 외야 (위)
  LF:{x:21,y:26},   // 좌측 외야 (살짝 안쪽)
  RF:{x:79,y:26},   // 우측 외야 (살짝 안쪽)
  SS:{x:33,y:42},   // 유격수
  '2B':{x:67,y:42}, // 2루수
  P:{x:50,y:56},    // 투수 (마운드)
  '3B':{x:17,y:58}, // 3루수 (위로 살짝)
  '1B':{x:83,y:58}, // 1루수 (위로 살짝)
  C:{x:50,y:78},    // 포수
  DH:{x:88,y:90}    // DH (외부)
};
}
