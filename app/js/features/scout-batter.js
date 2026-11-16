/** scout-batter: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:19255
wbdContext._scoutGenerateBatterReport = function _scoutGenerateBatterReport(data){
  if(!data) return {sections:[]};
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const sections = [];
  const lg = wbdContext._scoutLeagueAvgs();
  
  // ───────────────────────────────────────
  // 1. 개요
  // ───────────────────────────────────────
  const overview = [];
  const sideLabel = data.bZone==='L'?'좌타':data.bZone==='R'?'우타':'';
  
  const overallBA = (data.splits.vsL.ab + data.splits.vsR.ab) > 0
    ? ((data.splits.vsL.hits + data.splits.vsR.hits) / (data.splits.vsL.ab + data.splits.vsR.ab))
    : 0;
  
  let perfTier;
  // V9.7 WBD 환경 보정: 평균 .333, p50=.308, p75=.500
  if(overallBA >= 0.500) perfTier = '<span style="color:#ff4560">슈퍼스타급</span>';
  else if(overallBA >= 0.420) perfTier = '<span style="color:#ffd700">올스타급</span>';
  else if(overallBA >= 0.350) perfTier = '<span style="color:#39ff8a">주전급</span>';
  else if(overallBA >= 0.280) perfTier = '<span style="color:#88ccff">평균</span>';
  else perfTier = '<span style="color:#888">개선 필요</span>';
  
  overview.push(`<b>${sideLabel}${sideLabel?' ':''}타자</b>. 실전 성적 ${perfTier} (타율 <b>${fmt3(overallBA)}</b>)`);
  
  const sampleNote = data.PA>=150?'(매우 충분)':data.PA>=80?'(충분)':data.PA>=40?'(적절)':'(부족, 참고용)';
  overview.push(`총 <b>${data.PA.toLocaleString()}타석</b> (${data.total.toLocaleString()}구) · ${data.games}경기 ${sampleNote}`);
  
  if(data.chaseN >= 30){
    let chaseLabel;
    if(data.chasePct <= 22) chaseLabel = '<span style="color:#39ff8a">매우 우수 (유인구 안 통함)</span>';
    else if(data.chasePct <= 30) chaseLabel = '<span style="color:#88ccff">우수</span>';
    else if(data.chasePct <= 38) chaseLabel = '평균';
    else chaseLabel = '<span style="color:#ff4560">유인구에 약함</span>';
    overview.push(`선구안: 체이스율 <b>${data.chasePct.toFixed(1)}%</b> — ${chaseLabel}`);
  }
  
  const allBd = wbdContext.getBatterDataByName(data.name).filter(d => wbdContext._isInPlay(d));
  if(allBd.length >= 10){
    const avgEV = allBd.reduce((s,d)=>s+(+d.ev),0)/allBd.length;
    const hh = allBd.filter(d => wbdContext._isHardHit(d)).length;
    const hhPct = hh/allBd.length*100;
    let powerLabel;
    if(hhPct >= 18) powerLabel = '<span style="color:#ff4560">강력한 파워</span>';
    else if(hhPct >= 12) powerLabel = '<span style="color:#88ccff">평균 이상</span>';
    else if(hhPct >= 7) powerLabel = '평균';
    else powerLabel = '<span style="color:#888">파워 부족</span>';
    overview.push(`파워: 평균 EV <b>${avgEV.toFixed(1)}mph</b> · 하드힛(110+) <b>${hhPct.toFixed(1)}%</b> — ${powerLabel}`);
  }
  
  if(data.firstPitchN >= 20){
    let fpsLabel;
    if(data.firstPitchSwingPct >= 40) fpsLabel = '<b style="color:#ff8c44">초구 적극형</b>';
    else if(data.firstPitchSwingPct >= 25) fpsLabel = '<b>초구 균형형</b>';
    else fpsLabel = '<b style="color:#88ccff">초구 관망형</b>';
    overview.push(`타격 스타일: ${fpsLabel} (초구 스윙 ${data.firstPitchSwingPct.toFixed(0)}%)`);
  }
  
  sections.push({title:'🔎 개요', color:'#88ccff', items:overview});
  
  // ───────────────────────────────────────
  // 2. 타격 패턴 (구종별 + 코스별 상세)
  // ───────────────────────────────────────
  const patterns = [];
  
  const sortedByVs = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.n >= 10)
    .sort((a,b) => b[1].vsPct - a[1].vsPct);
  
  sortedByVs.slice(0, 4).forEach(([g, d], idx) => {
    const parts = [];
    parts.push(`<b>vs ${g}</b> (${d.vsPct.toFixed(0)}% 비율, ${d.n}구)`);
    
    const resultParts = [];
    if(d.ab >= 5){
      let baLabel = '';
      if(d.ba >= 0.330) baLabel = ' <span style="color:#ff4560">(잘 침)</span>';
      else if(d.ba >= 0.280) baLabel = ' <span style="color:#ff8c44">(잘 침)</span>';
      else if(d.ba < 0.200) baLabel = ' <span style="color:#39ff8a">(약점)</span>';
      resultParts.push(`타율 <b>${fmt3(d.ba)}</b> (${d.hits}/${d.ab})${baLabel}`);
    }
    if(d.swings >= 10){
      let whLabel = '';
      if(d.whiffPct >= 40) whLabel = ' <span style="color:#39ff8a">(헛스윙 많음)</span>';
      else if(d.whiffPct < 18) whLabel = ' <span style="color:#ff4560">(컨택 잘 됨)</span>';
      resultParts.push(`헛스윙 ${d.whiffPct.toFixed(0)}%${whLabel}`);
    }
    if(d.hr > 0) resultParts.push(`<span style="color:#ff4560">HR ${d.hr}</span>`);
    if(d.avgEV > 0 && d.ab >= 5) resultParts.push(`평균EV ${d.avgEV.toFixed(1)}mph`);
    
    const courseParts = [];
    if(d.inner.n >= 5){
      let innerNote = '';
      if(d.inner.ba !== null){
        innerNote = `타율 ${fmt3(d.inner.ba)}`;
        if(d.inner.ba >= 0.330) innerNote += ' <span style="color:#ff4560">강점</span>';
        else if(d.inner.ba < 0.240) innerNote += ' <span style="color:#39ff8a">약점</span>';
      }
      courseParts.push(`<b>몸쪽</b> ${d.inner.swingPct.toFixed(0)}% 스윙, ${innerNote}`);
    }
    if(d.outer.n >= 5){
      let outerNote = '';
      if(d.outer.ba !== null){
        outerNote = `타율 ${fmt3(d.outer.ba)}`;
        if(d.outer.ba >= 0.330) outerNote += ' <span style="color:#ff4560">강점</span>';
        else if(d.outer.ba < 0.240) outerNote += ' <span style="color:#39ff8a">약점</span>';
      }
      courseParts.push(`<b>바깥쪽</b> ${d.outer.swingPct.toFixed(0)}% 스윙, ${outerNote}`);
    }
    
    const heightParts = [];
    if(d.high.n >= 5){
      let highNote = '';
      if(d.high.ba !== null){
        highNote = `타율 ${fmt3(d.high.ba)}`;
        if(d.high.whiffPct >= 35) highNote += ' <span style="color:#39ff8a">헛스윙 많음</span>';
        else if(d.high.ba >= 0.330) highNote += ' <span style="color:#ff4560">강점</span>';
      }
      heightParts.push(`<b>높</b> ${highNote}`);
    }
    if(d.low.n >= 5){
      let lowNote = '';
      if(d.low.ba !== null){
        lowNote = `타율 ${fmt3(d.low.ba)}`;
        if(d.low.whiffPct >= 35) lowNote += ' <span style="color:#39ff8a">헛스윙 많음</span>';
        else if(d.low.ba >= 0.330) lowNote += ' <span style="color:#ff4560">강점</span>';
      }
      heightParts.push(`<b>낮</b> ${lowNote}`);
    }
    
    let line = parts.join(' ') + '<br>';
    if(resultParts.length) line += `<span style="color:var(--muted);font-size:11px">📊 ${resultParts.join(' · ')}</span><br>`;
    if(courseParts.length) line += `<span style="color:var(--muted);font-size:11px">↔️ ${courseParts.join(' / ')}</span>`;
    if(heightParts.length) line += `<br><span style="color:var(--muted);font-size:11px">↕️ ${heightParts.join(' / ')}</span>`;
    
    patterns.push(line);
  });
  
  const cAll = data.courseAll;
  const innerLabel = data.isLefty ? '몸쪽(좌측)' : '몸쪽(우측)';
  const outerLabel = data.isLefty ? '바깥쪽(우측)' : '바깥쪽(좌측)';
  
  if(cAll.inner.n >= 15 || cAll.outer.n >= 15){
    let parts = [`<b>좌우 코스 종합</b>`];
    let detailParts = [];
    
    if(cAll.inner.n >= 10){
      detailParts.push(`${innerLabel}: 스윙 ${cAll.inner.swingPct.toFixed(0)}% · ${cAll.inner.ba!==null?'타율 '+fmt3(cAll.inner.ba):'-'} · 헛스윙 ${cAll.inner.whiffPct.toFixed(0)}%${cAll.inner.hr>0?' · HR '+cAll.inner.hr:''}`);
    }
    if(cAll.outer.n >= 10){
      detailParts.push(`${outerLabel}: 스윙 ${cAll.outer.swingPct.toFixed(0)}% · ${cAll.outer.ba!==null?'타율 '+fmt3(cAll.outer.ba):'-'} · 헛스윙 ${cAll.outer.whiffPct.toFixed(0)}%${cAll.outer.hr>0?' · HR '+cAll.outer.hr:''}`);
    }
    
    if(cAll.inner.ba !== null && cAll.outer.ba !== null){
      const diff = cAll.inner.ba - cAll.outer.ba;
      if(Math.abs(diff) >= 0.060){
        const strongSide = diff > 0 ? innerLabel : outerLabel;
        detailParts.push(`<b style="color:#ffd700">→ ${strongSide} 위주로 잘 침 (차이 ${(Math.abs(diff)*1000).toFixed(0)})</b>`);
      }
    }
    
    let line = parts.join(' ') + '<br><span style="color:var(--muted);font-size:11px">';
    line += detailParts.join('<br>');
    line += '</span>';
    patterns.push(line);
  }
  
  if(cAll.high.n >= 15 || cAll.low.n >= 15){
    let detailParts = [];
    if(cAll.high.n >= 10){
      detailParts.push(`높은 공: 스윙 ${cAll.high.swingPct.toFixed(0)}% · ${cAll.high.ba!==null?'타율 '+fmt3(cAll.high.ba):'-'} · 헛스윙 ${cAll.high.whiffPct.toFixed(0)}%`);
    }
    if(cAll.low.n >= 10){
      detailParts.push(`낮은 공: 스윙 ${cAll.low.swingPct.toFixed(0)}% · ${cAll.low.ba!==null?'타율 '+fmt3(cAll.low.ba):'-'} · 헛스윙 ${cAll.low.whiffPct.toFixed(0)}%`);
    }
    
    if(cAll.high.ba !== null && cAll.low.ba !== null){
      const diff = cAll.high.ba - cAll.low.ba;
      if(Math.abs(diff) >= 0.060){
        const strongSide = diff > 0 ? '높은 공' : '낮은 공';
        detailParts.push(`<b style="color:#ffd700">→ ${strongSide} 위주로 잘 침 (차이 ${(Math.abs(diff)*1000).toFixed(0)})</b>`);
      }
    }
    
    let line = `<b>높낮이 종합</b><br><span style="color:var(--muted);font-size:11px">`;
    line += detailParts.join('<br>');
    line += '</span>';
    patterns.push(line);
  }
  
  if(data.firstPitchN >= 20 || data.twoStrikeN >= 20){
    let parts = [`<b>카운트 패턴</b>`];
    let detailParts = [];
    if(data.firstPitchN >= 20){
      detailParts.push(`초구: 스윙 ${data.firstPitchSwingPct.toFixed(0)}% ${data.firstPitchSwingPct>=40?'(적극형)':data.firstPitchSwingPct<=15?'(관망)':'(균형)'}`);
    }
    if(data.twoStrikeN >= 20){
      detailParts.push(`2스트라이크: 헛스윙 ${data.twoStrikeWhiffPct.toFixed(0)}% ${data.twoStrikeWhiffPct>=40?'<span style="color:#39ff8a">(잡힘)</span>':data.twoStrikeWhiffPct<=20?'<span style="color:#ff4560">(끈질김)</span>':''}`);
    }
    if(data.splits.adv.n >= 20 && data.splits.dis.n >= 20){
      detailParts.push(`유리: ${fmt3(data.splits.adv.ba)} · 불리: ${fmt3(data.splits.dis.ba)} (차이 ${((data.splits.adv.ba-data.splits.dis.ba)*1000).toFixed(0)})`);
    }
    patterns.push(parts.join('') + '<br><span style="color:var(--muted);font-size:11px">' + detailParts.join('<br>') + '</span>');
  }
  
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    let parts = [`<b>좌우 매치업</b>`];
    let detailParts = [];
    detailParts.push(`vs 좌투: ${fmt3(data.splits.vsL.ba)} (${data.splits.vsL.hits}/${data.splits.vsL.ab}, HR ${data.splits.vsL.hr})`);
    detailParts.push(`vs 우투: ${fmt3(data.splits.vsR.ba)} (${data.splits.vsR.hits}/${data.splits.vsR.ab}, HR ${data.splits.vsR.hr})`);
    const diff = data.splits.vsL.ba - data.splits.vsR.ba;
    if(Math.abs(diff) >= 0.060){
      const stronger = diff > 0 ? '좌투' : '우투';
      detailParts.push(`<b style="color:#ffd700">→ ${stronger} 위주로 잘 침 (차이 ${(Math.abs(diff)*1000).toFixed(0)})</b>`);
    }
    patterns.push(parts.join('') + '<br><span style="color:var(--muted);font-size:11px">' + detailParts.join('<br>') + '</span>');
  }
  
  sections.push({title:'🎯 타격 패턴 상세 분석', color:'#39ff8a', items:patterns});
  
  // ───────────────────────────────────────
  // 3. 강점 (raw 기반)
  // ───────────────────────────────────────
  const strengths = [];
  
  // V9.7 WBD 환경 보정: 평균 BA .333, p75=.500
  if(overallBA >= 0.420 && (data.splits.vsL.ab + data.splits.vsR.ab) >= 30){
    strengths.push(`<b>🔥 타율 ${fmt3(overallBA)}</b> — 평균 ${fmt3(lg.batterBA)} 대비 매우 높음.`);
  }
  
  if(allBd.length >= 15){
    const avgEV = allBd.reduce((s,d)=>s+(+d.ev),0)/allBd.length;
    const hh = allBd.filter(d => wbdContext._isHardHit(d)).length;
    const hhPct = hh/allBd.length*100;
    const hrs = wbdContext.getBatterDataByName(data.name).filter(d => +d.result===4).length;
    if(hhPct >= 15){
      strengths.push(`<b>💥 강한 파워 ${hhPct.toFixed(1)}% 하드힛</b> (110mph+) — 평균 EV ${avgEV.toFixed(1)}mph · HR ${hrs}개. 실투 금지.`);
    }
    if(hrs >= 5){
      const hrRate = data.AB>0 ? hrs/data.AB*100 : 0;
      strengths.push(`<b>💣 HR ${hrs}개</b> (타수당 ${hrRate.toFixed(1)}%) — 한방 위협 큼.`);
    }
  }
  
  if(data.chaseN >= 30 && data.chasePct < 24){
    strengths.push(`<b>👁️ 뛰어난 선구안</b> — 체이스율 ${data.chasePct.toFixed(1)}%. 유인구 거의 안 따라감.`);
  }
  
  // 좌투/우투 학살 (V9.7 WBD 환경 보정: 평균 .333 → .420+)
  if(data.splits.vsL.n >= 30 && data.splits.vsL.ba >= 0.420){
    strengths.push(`<b>🆚 좌투 학살 ${fmt3(data.splits.vsL.ba)}</b> (${data.splits.vsL.hits}/${data.splits.vsL.ab}). HR ${data.splits.vsL.hr}.`);
  }
  if(data.splits.vsR.n >= 30 && data.splits.vsR.ba >= 0.420){
    strengths.push(`<b>🆚 우투 학살 ${fmt3(data.splits.vsR.ba)}</b> (${data.splits.vsR.hits}/${data.splits.vsR.ab}). HR ${data.splits.vsR.hr}.`);
  }
  
  if(data.splits.adv.n >= 30 && data.splits.adv.ba >= 0.450){
    strengths.push(`<b>📊 유리 카운트 폭발 ${fmt3(data.splits.adv.ba)}</b> — 볼 카운트 주면 위험.`);
  }
  
  // 핫존 (V9.7 WBD 환경 보정: 평균 피BA .377 → 진짜 위험 핫존 .500+, p75)
  const zoneLabels = wbdContext.zoneCourseLabels(data.bZone);  // V9.9: 타자 시점 (몸쪽/바깥)
  const hotZones = data.zoneStats
    .map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0, brlRate: z.n>0?z.brl/z.n*100:0}))
    .filter(z => z.ab >= 5 && z.hitRate >= 50)
    .sort((a,b) => b.hitRate - a.hitRate)
    .slice(0, 3);
  hotZones.forEach(z => {
    let detail = '';
    if(z.hr > 0) detail = ` · HR ${z.hr}`;
    if(z.brlRate >= 20) detail += ` · 배럴 ${z.brlRate.toFixed(0)}%`;
    strengths.push(`<b>🔥 ${zoneLabels[z.i]} 핫존</b> — 타율 ${fmt3(z.hitRate/100)} (${z.hits}/${z.ab})${detail}. 이 코스 절대 던지지 말 것.`);
  });
  
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.ab < 8) return;
    if(d.ba >= 0.420){
      let courseDetail = '';
      if(d.inner.ba !== null && d.outer.ba !== null){
        if(d.inner.ba > d.outer.ba + 0.080) courseDetail = ` · 특히 몸쪽(${fmt3(d.inner.ba)}) 강점`;
        else if(d.outer.ba > d.inner.ba + 0.080) courseDetail = ` · 특히 바깥쪽(${fmt3(d.outer.ba)}) 강점`;
      }
      if(!courseDetail && d.high.ba !== null && d.low.ba !== null){
        if(d.high.ba > d.low.ba + 0.080) courseDetail = ` · 높은 공(${fmt3(d.high.ba)}) 강점`;
        else if(d.low.ba > d.high.ba + 0.080) courseDetail = ` · 낮은 공(${fmt3(d.low.ba)}) 강점`;
      }
      strengths.push(`<b>⚾ ${g} 강타</b> — 타율 ${fmt3(d.ba)} (${d.hits}/${d.ab})${courseDetail}. 던지면 큰일.`);
    }
  });
  
  if(!strengths.length){
    strengths.push('데이터상 두드러진 강점 없음. 정공법 접근 가능.');
  }
  
  sections.push({title:'💪 강점', color:'#ff4560', items:strengths});
  
  // ───────────────────────────────────────
  // 4. 약점 (V9.7 WBD 환경 보정)
  //   WBD 실측: 타자 BA p25=.200, p50=.308, p75=.500
  //   타자 BA 분산이 매우 커서 보수적 임계값 사용
  // ───────────────────────────────────────
  const weaknesses = [];
  
  if(overallBA <= 0.200 && (data.splits.vsL.ab + data.splits.vsR.ab) >= 30){
    weaknesses.push(`<b>💨 타율 ${fmt3(overallBA)}</b> — 컨택 약함. 결정구로 쉽게 잡힘.`);
  }
  
  if(data.twoStrikeN >= 20 && data.twoStrikeWhiffPct >= 40){
    weaknesses.push(`<b>❌ 2스트라이크 헛스윙 ${data.twoStrikeWhiffPct.toFixed(0)}%</b> — 결정구만 던지면 잡힘.`);
  }
  
  if(data.chaseN >= 30 && data.chasePct >= 38){
    weaknesses.push(`<b>🪤 체이스 ${data.chasePct.toFixed(1)}%</b> — 유인구 자주 따라감. 변화구 유인구 적극.`);
  }
  
  if(data.splits.vsL.n >= 30 && data.splits.vsL.ba <= 0.200){
    weaknesses.push(`<b>⚠️ 좌투 약점 ${fmt3(data.splits.vsL.ba)}</b> (${data.splits.vsL.hits}/${data.splits.vsL.ab}). 좌투 매치업 유리.`);
  }
  if(data.splits.vsR.n >= 30 && data.splits.vsR.ba <= 0.200){
    weaknesses.push(`<b>⚠️ 우투 약점 ${fmt3(data.splits.vsR.ba)}</b> (${data.splits.vsR.hits}/${data.splits.vsR.ab}). 우투 매치업 유리.`);
  }
  
  if(data.splits.dis.n >= 30){
    if(data.splits.dis.ba <= 0.220){
      weaknesses.push(`<b>📉 불리 카운트 무력화 ${fmt3(data.splits.dis.ba)}</b> — 0-1, 1-2 만들면 거의 잡음.`);
    }
    if(data.splits.dis.whiffPct >= 40){
      weaknesses.push(`<b>🪤 불리 카운트 헛스윙 ${data.splits.dis.whiffPct.toFixed(0)}%</b> — 카운트 잡고 결정구.`);
    }
  }
  
  if(data.high.n >= 15 && data.high.whiffRate >= 35){
    weaknesses.push(`<b>⬆️ 높은 공 헛스윙 ${data.high.whiffRate.toFixed(0)}%</b> — 하이볼/라이즈볼 유도.`);
  }
  if(data.low.n >= 15 && data.low.whiffRate >= 35){
    weaknesses.push(`<b>⬇️ 낮은 공 헛스윙 ${data.low.whiffRate.toFixed(0)}%</b> — 낮은 슬라이더/포크볼.`);
  }
  
  const cAll2 = data.courseAll;
  if(cAll2.inner.n >= 15 && cAll2.inner.ba !== null && cAll2.inner.ba <= 0.200){
    const lab = data.isLefty ? '몸쪽(좌측)' : '몸쪽(우측)';
    weaknesses.push(`<b>↔️ ${lab} 약점 ${fmt3(cAll2.inner.ba)}</b> — 몸쪽 적극 공략.`);
  }
  if(cAll2.outer.n >= 15 && cAll2.outer.ba !== null && cAll2.outer.ba <= 0.200){
    const lab = data.isLefty ? '바깥쪽(우측)' : '바깥쪽(좌측)';
    weaknesses.push(`<b>↔️ ${lab} 약점 ${fmt3(cAll2.outer.ba)}</b> — 바깥쪽 코스 적극 공략.`);
  }
  
  const coldZones = data.zoneStats
    .map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0, whPct: z.swing>0?z.whiff/z.swing*100:0}))
    .filter(z => z.n >= 10)
    .sort((a,b) => a.hitRate - b.hitRate)
    .slice(0, 2);
  coldZones.forEach(z => {
    if(z.hitRate < 18){
      weaknesses.push(`<b>❄️ ${zoneLabels[z.i]} 콜드존 ${fmt3(z.hitRate/100)}</b> (${z.hits}/${z.ab}) · 헛스윙 ${z.whPct.toFixed(0)}%. 적극 던질 것.`);
    }
  });
  
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.ab >= 8 && d.ba <= 0.240){
      let courseAdvice = '';
      const courses = [
        {name:'몸쪽', d:d.inner},
        {name:'바깥쪽', d:d.outer},
        {name:'높은', d:d.high},
        {name:'낮은', d:d.low}
      ].filter(c => c.d.n >= 5 && c.d.ba !== null).sort((a,b) => a.d.ba - b.d.ba);
      if(courses.length && courses[0].d.ba < 0.150){
        courseAdvice = ` (특히 <b>${courses[0].name}</b>은 ${fmt3(courses[0].d.ba)})`;
      }
      weaknesses.push(`<b>⚾ ${g} 못 침 ${fmt3(d.ba)}</b> (${d.hits}/${d.ab})${courseAdvice} — 결정구로 매우 효과적.`);
    }
    if(d.swings >= 10 && d.whiffPct >= 45){
      weaknesses.push(`<b>🌀 ${g} 헛스윙 ${d.whiffPct.toFixed(0)}%</b> — 결정구 추천.`);
    }
  });
  
  if(!weaknesses.length){
    weaknesses.push('데이터상 두드러진 약점 없음. 신중한 카운트 관리 필요.');
  }
  
  sections.push({title:'🪤 약점', color:'#39ff8a', items:weaknesses});
  
  // ───────────────────────────────────────
  // 5. 핵심 공략 전략
  // ───────────────────────────────────────
  const strategy = [];
  
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const lba = data.splits.vsL.ba, rba = data.splits.vsR.ba;
    if(lba < rba - 0.060){
      strategy.push(`<b>좌투로 상대하라</b> — 좌투 ${fmt3(lba)} vs 우투 ${fmt3(rba)} (차이 -${((rba-lba)*1000).toFixed(0)}). 큰 경기에서 우투 등판 시 대타 고려.`);
    } else if(rba < lba - 0.060){
      strategy.push(`<b>우투로 상대하라</b> — 우투 ${fmt3(rba)} vs 좌투 ${fmt3(lba)} (차이 -${((lba-rba)*1000).toFixed(0)}).`);
    }
  }
  
  if(data.splits.adv.n >= 30 && data.splits.dis.n >= 30){
    const advBA = data.splits.adv.ba, disBA = data.splits.dis.ba;
    if(advBA - disBA >= 0.100){
      strategy.push(`<b>카운트 절대 양보 X</b> — 유리 ${fmt3(advBA)} vs 불리 ${fmt3(disBA)} (차이 +${((advBA-disBA)*1000).toFixed(0)}). 초구 무조건 스트라이크.`);
    }
  }
  
  if(data.firstPitchN >= 20){
    if(data.firstPitchSwingPct >= 40){
      strategy.push(`<b>초구는 존 밖이나 코너로</b> — 초구 스윙 ${data.firstPitchSwingPct.toFixed(0)}% (적극형). 가운데 절대 X.`);
    } else if(data.firstPitchSwingPct <= 15){
      strategy.push(`<b>초구는 무조건 스트라이크</b> — 초구 스윙 ${data.firstPitchSwingPct.toFixed(0)}% (관망형). 0-1로 시작.`);
    }
  }
  
  let bestK = {pitch:null, pct:0, n:0};
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.swings < 10) return;
    if(d.whiffPct > bestK.pct){
      bestK = {pitch:g, pct:d.whiffPct, n:d.swings};
    }
  });
  if(bestK.pitch && bestK.pct >= 35){
    let locAdvice = '';
    const d = data.groupDetails[bestK.pitch];
    if(d){
      const courses = [
        {name:'몸쪽', d:d.inner},
        {name:'바깥쪽', d:d.outer},
        {name:'높은', d:d.high},
        {name:'낮은', d:d.low}
      ].filter(c => c.d.swing >= 5).sort((a,b) => b.d.whiffPct - a.d.whiffPct);
      if(courses.length && courses[0].d.whiffPct >= 40){
        locAdvice = ` 특히 <b>${courses[0].name}</b> 코스 헛스윙 ${courses[0].d.whiffPct.toFixed(0)}% — 이 코스로.`;
      }
    }
    strategy.push(`<b>결정구 추천: ${bestK.pitch}</b> — 헛스윙 ${bestK.pct.toFixed(0)}% (${bestK.n}스윙).${locAdvice} 2스트라이크에서 적극.`);
  }
  
  const bestColdZone = data.zoneStats
    .map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0}))
    .filter(z => z.n >= 10)
    .sort((a,b) => a.hitRate - b.hitRate)[0];
  if(bestColdZone && bestColdZone.hitRate < 20){
    const zoneAdvice = [
      '높은 외측 — 외각 슬라이더',
      '높은 가운데 — 높은 직구로 압박',
      '높은 안쪽 — 몸쪽 위 직구',
      '바깥쪽 중간 — 외각 변화구',
      '한가운데 — 보통 강점, 던지지 말 것',
      '안쪽 중간 — 몸쪽 변화구',
      '낮은 외측 — 외각 슬라이더',
      '낮은 가운데 — 낮은 직구/싱커',
      '낮은 안쪽 — 몸쪽 낮은 슬라이더'
    ];
    strategy.push(`<b>약점 코스: ${zoneLabels[bestColdZone.i]}</b> — 타율 ${fmt3(bestColdZone.hitRate/100)}. ${zoneAdvice[bestColdZone.i]} 적극.`);
  }
  
  const weakPitch = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.ab >= 6)
    .sort((a,b) => a[1].ba - b[1].ba)[0];
  if(weakPitch && weakPitch[1].ba < 0.200){
    const [g, d] = weakPitch;
    let advice = `<b>${g} 적극 사용</b> — 이 타자가 ${fmt3(d.ba)}로 약함 (${d.hits}/${d.ab}).`;
    const courses = [
      {name:'몸쪽', d:d.inner},
      {name:'바깥쪽', d:d.outer},
      {name:'높은', d:d.high},
      {name:'낮은', d:d.low}
    ].filter(c => c.d.n >= 5 && c.d.ba !== null).sort((a,b) => a.d.ba - b.d.ba);
    if(courses.length && courses[0].d.ba < 0.150){
      advice += ` 특히 <b>${courses[0].name}</b>으로 던지면 ${fmt3(courses[0].d.ba)}.`;
    }
    strategy.push(advice);
  }
  
  if(data.high.n >= 15 && data.low.n >= 15){
    const highWhiff = data.high.whiffRate;
    const lowWhiff = data.low.whiffRate;
    if(highWhiff > lowWhiff + 10){
      strategy.push(`<b>높은 공으로 승부</b> — 높 헛스윙 ${highWhiff.toFixed(0)}% vs 낮 ${lowWhiff.toFixed(0)}%. 라이즈볼/하이패스트볼.`);
    } else if(lowWhiff > highWhiff + 10){
      strategy.push(`<b>낮은 공으로 승부</b> — 낮 헛스윙 ${lowWhiff.toFixed(0)}% vs 높 ${highWhiff.toFixed(0)}%. 낮은 변화구.`);
    }
  }
  
  if(cAll2.inner.n >= 15 && cAll2.outer.n >= 15 && cAll2.inner.ba !== null && cAll2.outer.ba !== null){
    const innerLab = data.isLefty ? '몸쪽(좌측)' : '몸쪽(우측)';
    const outerLab = data.isLefty ? '바깥쪽(우측)' : '바깥쪽(좌측)';
    const diff = cAll2.inner.ba - cAll2.outer.ba;
    if(diff >= 0.080){
      strategy.push(`<b>${outerLab}으로 승부</b> — 몸쪽 ${fmt3(cAll2.inner.ba)} vs 바깥쪽 ${fmt3(cAll2.outer.ba)} (차이 ${(diff*1000).toFixed(0)}).`);
    } else if(diff <= -0.080){
      strategy.push(`<b>${innerLab}으로 승부</b> — 바깥쪽 ${fmt3(cAll2.outer.ba)} vs 몸쪽 ${fmt3(cAll2.inner.ba)} (차이 ${(Math.abs(diff)*1000).toFixed(0)}).`);
    }
  }
  
  if(!strategy.length){
    strategy.push('균형형 타자. 카운트 관리하면서 신중한 승부.');
  }
  
  sections.push({title:'⚔️ 핵심 공략 전략', color:'#cc44ff', items:strategy});
  
  return {sections};
};

// Original index.html:19768
wbdContext._scoutGenerateSplitReport = function _scoutGenerateSplitReport(data, mode, split){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const lg = wbdContext._scoutLeagueAvgs();
  
  // 스플릿 대상 필터
  const isVsL = split === 'vsL';
  const splitData = isVsL ? data.splits.vsL : data.splits.vsR;
  const splitN = splitData.n || 0;
  
  // 표본 부족
  if(splitN < 10){
    return {
      insufficient: true,
      message: `${isVsL ? (mode==='pitcher'?'좌타':'좌투') : (mode==='pitcher'?'우타':'우투')} 상대 데이터가 ${splitN}구뿐이라 신뢰할 만한 분석 불가. 전체 탭 참고.`
    };
  }
  
  // 구종별 분포 (이 스플릿 한정)
  const splitGroupStats = {};
  Object.entries(data.groupDetails || {}).forEach(([g, d]) => {
    const sd = isVsL ? d.vsL : d.vsR;
    if(!sd || sd.n < 3) return;
    splitGroupStats[g] = {
      g,
      n: sd.n,
      usagePct: splitN > 0 ? sd.n/splitN*100 : 0,
      ba: sd.ba,
      ab: sd.ab,
      hits: sd.hits,
      hr: sd.hr,
      swings: sd.swings,
      whiffs: sd.whiffs,
      whiffPct: sd.whiffPct,
      course: sd.course || {},
      // 글로벌 데이터
      avgSpd: d.avgSpd,
      avgSH: d.avgSH,
      avgSV: d.avgSV,
      avgGyro: d.avgGyro,
      midPct: d.midPct,
      inZonePct: d.inZonePct,
      chaseRate: d.chaseRate
    };
  });
  
  const sortedGroups = Object.entries(splitGroupStats).sort((a,b)=>b[1].n-a[1].n);
  
  // 핵심 3줄
  const top3 = [];
  
  if(mode === 'pitcher'){
    // 투수 + 좌/우타 상대 공략
    const sideLabel = isVsL ? '좌타' : '우타';
    
    // 1) 결정구
    const decisivePitch = sortedGroups.filter(([g,d]) => d.swings >= 5).sort((a,b)=>b[1].whiffPct-a[1].whiffPct)[0];
    if(decisivePitch && decisivePitch[1].whiffPct >= 35){
      const [g, d] = decisivePitch;
      // 어느 코스로 빠지는지
      const c = d.course;
      const cTot = (c.inn||0) + (c.out||0) + (c.midZone||0) + (c.outZone||0);
      let locStr = '';
      if(cTot >= 5){
        const dominantCourse = [];
        if((c.low||0)/cTot >= 0.40) dominantCourse.push('낮은 공');
        if((c.high||0)/cTot >= 0.40) dominantCourse.push('높은 공');
        if((c.out||0)/cTot >= 0.40) dominantCourse.push('바깥쪽');
        if((c.inn||0)/cTot >= 0.40) dominantCourse.push('몸쪽');
        if(dominantCourse.length) locStr = ` (${dominantCourse.join('+')} 위주)`;
      }
      top3.push({
        tag: 'TRAP', color: '#ff4560',
        label: `결정구 ${g}${locStr}`,
        detail: `${sideLabel} 상대 ${g} 헛스윙 ${d.whiffPct.toFixed(0)}%. 존 밖으로 빠지는 거 절대 따라가지 마세요.`
      });
    }
    
    // 2) 노릴 만한 구종
    const targetPitch = sortedGroups.filter(([g,d]) => d.ab >= 5 && d.ba >= 0.300).sort((a,b)=>b[1].ba-a[1].ba)[0];
    if(targetPitch){
      const [g, d] = targetPitch;
      top3.push({
        tag: 'NOW', color: '#39ff8a',
        label: `${g} 노려라`,
        detail: `${sideLabel}로서 이 투수 ${g} 상대 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 사용 비율 ${d.usagePct.toFixed(0)}%. 카운트 양보 X.`
      });
    } else {
      // 그나마 잘 친 구종
      const okPitch = sortedGroups.filter(([g,d]) => d.ab >= 5).sort((a,b)=>b[1].ba-a[1].ba)[0];
      if(okPitch && okPitch[1].ba >= 0.250){
        const [g, d] = okPitch;
        top3.push({
          tag: 'NOW', color: '#ffd700',
          label: `그나마 ${g}`,
          detail: `${sideLabel} 상대 이 투수의 가장 약한 구종이 ${g} (${fmt3(d.ba)}). 이 공 만나면 적극.`
        });
      }
    }
    
    // 3) 코스 패턴 분석
    const courseCombined = {high:0, low:0, mid:0, inn:0, out:0, midZ:0, total:0};
    Object.values(splitGroupStats).forEach(d => {
      if(!d.course) return;
      courseCombined.high += (d.course.high||0);
      courseCombined.low += (d.course.low||0);
      courseCombined.mid += (d.course.mid||0);
      courseCombined.inn += (d.course.inn||0);
      courseCombined.out += (d.course.out||0);
      courseCombined.midZ += (d.course.midZone||0);
      courseCombined.total += d.n;
    });
    const inZTot = courseCombined.high + courseCombined.low + courseCombined.mid;
    if(inZTot >= 15){
      // 가장 자주 던지는 코스
      const courseList = [
        {n:'높은 공', v:courseCombined.high},
        {n:'낮은 공', v:courseCombined.low},
        {n:'한가운데', v:courseCombined.mid},
        {n:'몸쪽', v:courseCombined.inn},
        {n:'바깥쪽', v:courseCombined.out}
      ].sort((a,b)=>b.v-a.v);
      if(courseList[0].v/inZTot >= 0.40){
        top3.push({
          tag: 'NOTE', color: '#88ccff',
          label: `${courseList[0].n} 위주`,
          detail: `${sideLabel}에 ${courseList[0].n}으로 ${(courseList[0].v/inZTot*100).toFixed(0)}% 비율. 예측하고 준비.`
        });
      }
    }
    
  } else {
    // 타자 + 좌/우투 상대
    const sideLabel = isVsL ? '좌투' : '우투';
    
    // 1) 약점 구종 (이 타자가 이 손 상대로 못 치는 구종)
    const weakPitch = sortedGroups.filter(([g,d]) => d.ab >= 4 && d.ba !== null && d.ba <= 0.220).sort((a,b)=>a[1].ba-b[1].ba)[0];
    if(weakPitch){
      const [g, d] = weakPitch;
      top3.push({
        tag: 'NOW', color: '#39ff8a',
        label: `${g} 결정구`,
        detail: `이 타자가 ${sideLabel}의 ${g}에 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 결정구로 강력.`
      });
    }
    
    // 2) 헛스윙 잘 나오는 구종
    const kPitch = sortedGroups.filter(([g,d]) => d.swings >= 5 && d.whiffPct >= 40).sort((a,b)=>b[1].whiffPct-a[1].whiffPct)[0];
    if(kPitch){
      const [g, d] = kPitch;
      top3.push({
        tag: 'TRAP', color: '#ff4560',
        label: `${g} 유인`,
        detail: `${sideLabel}의 ${g}에 헛스윙 ${d.whiffPct.toFixed(0)}% (${d.whiffs}/${d.swings}). 존 밖으로 빼서 헛스윙 유도.`
      });
    }
    
    // 3) 강점 구종 경고
    const strongPitch = sortedGroups.filter(([g,d]) => d.ab >= 5 && d.ba !== null && d.ba >= 0.320).sort((a,b)=>b[1].ba-a[1].ba)[0];
    if(strongPitch){
      const [g, d] = strongPitch;
      top3.push({
        tag: 'NO', color: '#ff4560',
        label: `${g} 절대 X`,
        detail: `${sideLabel}의 ${g} 상대 ${fmt3(d.ba)}${d.hr>0?', HR '+d.hr:''}. 이 공 던지면 큰일.`
      });
    }
  }
  
  // 4번 (남는 자리) - 카운트별 패턴이나 코스
  if(top3.length < 3){
    // 카운트별 패턴 - 이 스플릿에서 자주 가는 카운트가 있는지
    const myAll = wbdContext.G.filter(d => {
      if(mode === 'pitcher'){
        if(d.pName !== data.name) return false;
        return String(d.bZone).toUpperCase() === (isVsL ? 'L' : 'R');
      } else {
        if(d.bName !== data.name) return false;
        return String(d.pHand).toUpperCase() === (isVsL ? 'L' : 'R');
      }
    });
    // 2스트라이크 결정구 패턴
    const k2 = myAll.filter(d => +d.strk === 2 && +d.ball < 3);
    if(k2.length >= 10){
      const k2dist = {};
      k2.forEach(d => {
        const g = wbdContext.pitchGroup(d.pType, d);
        if(!g || g === '기타') return;
        k2dist[g] = (k2dist[g]||0) + 1;
      });
      const sortedK2 = Object.entries(k2dist).sort((a,b)=>b[1]-a[1]);
      if(sortedK2.length && sortedK2[0][1]/k2.length >= 0.4){
        const [g, n] = sortedK2[0];
        const side = isVsL ? '좌타' : '우타';
        const sideLab = mode === 'pitcher' ? side : (isVsL ? '좌투' : '우투');
        top3.push({
          tag: 'NOTE', color: '#ffd700',
          label: `2K엔 ${g}`,
          detail: `${sideLab} 상대${mode === 'pitcher' ? '로 ' : ''} 2스트라이크에서 ${g} ${(n/k2.length*100).toFixed(0)}% 비율. 예측 가능.`
        });
      }
    }
  }
  
  // V10.0: 스플릿 한정 9구역 + 카운트 + 코스 통계 (전체 요약 수준으로 보강)
  const splitPitches = wbdContext.G.filter(d => {
    if(mode === 'pitcher'){
      if(d.pName !== data.name) return false;
      return String(d.bZone).toUpperCase() === (isVsL ? 'L' : 'R');
    } else {
      if(d.bName !== data.name) return false;
      return String(d.pHand).toUpperCase() === (isVsL ? 'L' : 'R');
    }
  });
  
  // 9구역 통계
  const splitZoneStats = Array(9).fill(0).map(() => ({n:0, ab:0, hits:0, hrs:0, brl:0, swings:0, whiffs:0}));
  splitPitches.forEach(d => {
    const ci = wbdContext.zoneCell(d);
    if(ci < 0) return;
    const z = splitZoneStats[ci];
    z.n++;
    const r = +d.result;
    const isHit = +d['1BSafe']===1 || r===4;
    const isK = wbdContext._isK(d);
    if(isHit || r===1 || r===2 || isK) z.ab++;
    if(isHit) z.hits++;
    if(r===4) z.hrs++;
    if(wbdContext._isBarrel(d)) z.brl++;
    if(d.bSwing){ z.swings++; if(+d.call!==2) z.whiffs++; }
  });
  
  // 카운트별 (유리/평형/불리)
  const countStat = (arr) => {
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const sw = arr.filter(d => d.bSwing).length;
    const wh = arr.filter(d => d.bSwing && +d.call!==2).length;
    return {n:arr.length, ab, hits, ba: ab>0?hits/ab:null, swPct: arr.length>0?sw/arr.length*100:0, whPct: sw>0?wh/sw*100:0};
  };
  const splitCounts = {
    adv: countStat(splitPitches.filter(d => +d.ball > +d.strk)),
    even: countStat(splitPitches.filter(d => +d.ball === +d.strk)),
    dis: countStat(splitPitches.filter(d => +d.ball < +d.strk))
  };
  
  return {
    insufficient: false,
    sideLabel: isVsL ? (mode==='pitcher'?'좌타':'좌투') : (mode==='pitcher'?'우타':'우투'),
    splitN,
    splitData,
    sortedGroups,
    top3: top3.slice(0, 3),
    zoneStats: splitZoneStats,
    counts: splitCounts,
    bZone: data.bZone
  };
};

// Original index.html:20029
wbdContext._scoutRenderSplitContent = function _scoutRenderSplitContent(data, splitReport, mode, split){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  
  if(!splitReport){
    return `<div class="card section" style="padding:30px;text-align:center;color:var(--muted);border:1px dashed var(--border)">
      <div style="font-size:24px;margin-bottom:10px">⚠️</div>
      <div style="font-size:13px">스플릿 분석 데이터를 불러오지 못했어요. 전체 탭을 참고해주세요.</div>
    </div>`;
  }
  
  if(splitReport.insufficient){
    return `<div class="card section" style="padding:30px;text-align:center;color:var(--muted);border:1px dashed var(--border)">
      <div style="font-size:24px;margin-bottom:10px">⚠️</div>
      <div style="font-size:13px">${splitReport.message||'데이터가 부족해 분석할 수 없어요.'}</div>
    </div>`;
  }
  
  const sideLabel = splitReport.sideLabel || (split==='vsL'?'좌투':'우투');
  const sd = splitReport.splitData || {ba:0,hits:0,ab:0,whiffPct:0,swings:0,hr:0};
  const sortedGroups = splitReport.sortedGroups || [];
  const splitN = splitReport.splitN || 0;
  const isVsL = split === 'vsL';
  
  let html = '';
  
  // ═ 핵심 3줄
  if(splitReport.top3 && splitReport.top3.length){
    html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(204,68,255,0.10),var(--card));border:1.5px solid #cc44ff;padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span style="font-size:18px">⚔️</span>
        <span style="font-size:14px;font-weight:900;color:#cc44ff;letter-spacing:0.5px">${sideLabel} ${mode==='pitcher'?'공략':'봉쇄'} 핵심 3줄</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${splitReport.top3.map(p => `<div style="display:flex;gap:12px;align-items:flex-start;background:var(--card2);padding:11px 14px;border-radius:6px;border-left:3px solid ${p.color}">
          <div style="background:${p.color};color:#000;font-size:11px;font-weight:900;padding:4px 9px;border-radius:11px;flex-shrink:0;min-width:34px;text-align:center">${p.tag}</div>
          <div style="font-size:13px;line-height:1.65;color:var(--text);flex:1"><b>${p.label}</b> — ${p.detail}</div>
        </div>`).join('')}
      </div>
    </div>`;
  }
  
  // ═ 종합 성적 카드 (이 스플릿)
  html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #88ccff">
    <div class="card-title" style="color:#88ccff;font-size:14px;margin-bottom:12px">📊 ${sideLabel} 상대 종합 성적</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px" data-scout-grid>`;
  
  const statCards = [
    {label: mode==='pitcher'?'피안타율':'타율', value: fmt3(sd.ba), n: `${sd.hits}/${sd.ab}`},
    {label: '헛스윙률', value: sd.whiffPct.toFixed(1)+'%', n: `${sd.swings}스윙`},
    {label: 'HR', value: sd.hr || 0, n: ''},
    {label: '평균 EV', value: sd.avgEV ? sd.avgEV.toFixed(1)+'mph' : '-', n: ''},
    {label: '하드힛%', value: sd.hardPct ? sd.hardPct.toFixed(1)+'%' : '-', n: ''}
  ];
  statCards.forEach(s => {
    html += `<div style="background:var(--card2);padding:12px;border-radius:6px;text-align:center">
      <div style="font-size:10px;color:var(--muted);margin-bottom:4px">${s.label}</div>
      <div style="font-size:20px;font-weight:900;color:var(--text)">${s.value}</div>
      ${s.n ? `<div style="font-size:9px;color:var(--muted);margin-top:2px">${s.n}</div>` : ''}
    </div>`;
  });
  html += `</div></div>`;
  
  // ═ 구종별 분석 (이 스플릿)
  if(sortedGroups.length){
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #ff8c44">
      <div class="card-title" style="color:#ff8c44;font-size:14px;margin-bottom:12px">🎯 ${sideLabel} 상대 구종별 ${mode==='pitcher'?'분포·결과':'대응'}</div>
      <div style="display:flex;flex-direction:column;gap:8px">`;
    
    sortedGroups.slice(0, 6).forEach(([g, d]) => {
      // 결과 평가
      let resultColor = '#88ccff', resultLabel = '';
      if(mode === 'pitcher'){
        // 투수: 피안타율 낮을수록 좋음
        if(d.ba !== null && d.ab >= 4){
          if(d.ba < 0.200) { resultColor = '#39ff8a'; resultLabel = '봉쇄'; }
          else if(d.ba < 0.260) { resultColor = '#88ccff'; resultLabel = '안정'; }
          else if(d.ba < 0.320) { resultColor = '#ffd700'; resultLabel = '평균'; }
          else { resultColor = '#ff4560'; resultLabel = '피격'; }
        }
      } else {
        // 타자: 타율 높을수록 좋음
        if(d.ba !== null && d.ab >= 4){
          if(d.ba >= 0.330) { resultColor = '#ff4560'; resultLabel = '강타'; }
          else if(d.ba >= 0.280) { resultColor = '#ff8c44'; resultLabel = '잘 침'; }
          else if(d.ba >= 0.220) { resultColor = '#88ccff'; resultLabel = '평균'; }
          else { resultColor = '#39ff8a'; resultLabel = '약점'; }
        }
      }
      
      // 코스 정보 (어디로 던졌나)
      const c = d.course;
      let courseInfo = '';
      if(c){
        const cTot = (c.inn||0) + (c.out||0) + (c.midZone||0);
        const inZTot = (c.high||0) + (c.low||0) + (c.mid||0);
        if(cTot >= 5 || inZTot >= 5){
          const dom = [];
          const total = Math.max(cTot, inZTot);
          if((c.low||0)/total >= 0.35) dom.push('낮');
          if((c.high||0)/total >= 0.35) dom.push('높');
          if((c.inn||0)/total >= 0.35) dom.push(isVsL && mode==='pitcher' ? '몸쪽(좌타입장)' : '몸쪽');
          if((c.out||0)/total >= 0.35) dom.push(isVsL && mode==='pitcher' ? '바깥쪽(좌타입장)' : '바깥쪽');
          if(dom.length) courseInfo = dom.join('+');
        }
      }
      
      html += `<div style="background:var(--card2);padding:11px 14px;border-radius:6px;border-left:3px solid ${resultColor}">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
          <div>
            <span style="font-size:14px;font-weight:900;color:var(--text)">${g}</span>
            <span style="font-size:11px;color:var(--muted);margin-left:8px">${d.n}구 (${d.usagePct.toFixed(0)}%)</span>
          </div>
          ${resultLabel ? `<span style="background:${resultColor};color:#000;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:900">${resultLabel}</span>` : ''}
        </div>
        <div style="font-size:11px;color:var(--muted);line-height:1.55">
          ${mode==='pitcher' ? '피안타율' : '타율'} <b style="color:var(--text)">${d.ab>=3?fmt3(d.ba):'-'}</b>${d.ab>=3?` (${d.hits}/${d.ab})`:''}
          · 헛스윙 <b style="color:var(--text)">${d.swings>=3?d.whiffPct.toFixed(0)+'%':'-'}</b>
          ${d.hr>0?` · <span style="color:#ff4560">HR ${d.hr}</span>`:''}
          ${d.avgSpd > 0 ? ` · ${d.avgSpd.toFixed(1)}km/h` : ''}
          ${courseInfo ? `<br>📍 ${mode==='pitcher'?'주 코스':'대응 코스'}: <b style="color:var(--text)">${courseInfo}</b>` : ''}
        </div>
      </div>`;
    });
    html += `</div></div>`;
  }
  
  // ═ V10.0: 9구역 핫존/콜드존 (스플릿 한정)
  const zStats = splitReport.zoneStats || [];
  if(zStats.length === 9 && zStats.reduce((s,z)=>s+z.n,0) >= 15){
    const zLabels = wbdContext.zoneCourseLabels(splitReport.bZone);
    const zoneWithRate = zStats.map((z,i)=>({
      i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0, whiffRate: z.swings>0?z.whiffs/z.swings*100:0
    }));
    // 타자 공략: 타자가 잘 치는 핫존 = 위험 / 못 치는 콜드존 = 약점
    // 투수 공략: 피안타 높은 존 = 약점 / 낮은 존 = 강점
    const hotList = zoneWithRate.filter(z => z.ab >= 3).sort((a,b)=>b.hitRate-a.hitRate);
    const coldList = zoneWithRate.filter(z => z.ab >= 3).sort((a,b)=>a.hitRate-b.hitRate);
    
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #cc44ff">
      <div class="card-title" style="color:#cc44ff;font-size:14px;margin-bottom:12px">🗺️ ${sideLabel} 상대 9구역 ${mode==='pitcher'?'피격':'타격'} 분포</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-width:280px;margin:0 auto 12px">`;
    // 3x3 그리드 — 타율 높을수록 빨강
    zoneWithRate.forEach((z) => {
      const intensity = z.ab >= 3 ? Math.min(z.hitRate/70, 1) : 0;
      const bg = z.ab < 3 ? 'var(--card2)' : `rgba(255,69,96,${0.12+intensity*0.6})`;
      const baStr = z.ab>=3 ? ('.'+(z.hitRate*10).toFixed(0).padStart(3,'0')) : '-';
      html += `<div style="background:${bg};border:1px solid var(--border);border-radius:5px;padding:8px 4px;text-align:center">
        <div style="font-size:8px;color:var(--muted);line-height:1.2">${zLabels[z.i]}</div>
        <div style="font-size:14px;font-weight:900;color:var(--text);font-family:var(--mono)">${baStr}</div>
        <div style="font-size:8px;color:var(--muted)">${z.hits}/${z.ab}</div>
      </div>`;
    });
    html += `</div>`;
    // 핫존/콜드존 텍스트 요약
    if(hotList.length && hotList[0].hitRate >= 35){
      const hz = hotList[0];
      html += `<div style="background:rgba(255,69,96,0.1);border-left:3px solid #ff4560;padding:9px 12px;border-radius:5px;font-size:12px;margin-bottom:6px">
        🔥 <b>${zLabels[hz.i]}</b> ${mode==='pitcher'?'핫존':'강점'} — ${mode==='pitcher'?'피안타율':'타율'} <b>.${(hz.hitRate*10).toFixed(0).padStart(3,'0')}</b> (${hz.hits}/${hz.ab}). ${mode==='pitcher'?'이 코스 피하기.':'이 코스 노림.'}</div>`;
    }
    if(coldList.length && coldList[0].hitRate < 20 && coldList[0].ab >= 4){
      const cz = coldList[0];
      html += `<div style="background:rgba(57,255,138,0.1);border-left:3px solid #39ff8a;padding:9px 12px;border-radius:5px;font-size:12px">
        ❄️ <b>${zLabels[cz.i]}</b> ${mode==='pitcher'?'안전존':'약점'} — ${mode==='pitcher'?'피안타율':'타율'} <b>.${(cz.hitRate*10).toFixed(0).padStart(3,'0')}</b> (${cz.hits}/${cz.ab}). ${mode==='pitcher'?'적극 던질 곳.':'여기로 승부.'}</div>`;
    }
    html += `</div>`;
  }
  
  // ═ V10.0: 카운트별 성적 (스플릿 한정)
  const cnts = splitReport.counts;
  if(cnts && (cnts.adv.n + cnts.even.n + cnts.dis.n) >= 15){
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #88cc44">
      <div class="card-title" style="color:#88cc44;font-size:14px;margin-bottom:12px">⚖️ ${sideLabel} 상대 카운트별 성적</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">`;
    const cntDefs = [
      {key:'adv', label:'유리 카운트', sub:'볼>스트', color:'#39ff8a'},
      {key:'even', label:'평형 카운트', sub:'볼=스트', color:'#ffd700'},
      {key:'dis', label:'불리 카운트', sub:'스트>볼', color:'#ff8c44'}
    ];
    cntDefs.forEach(cd => {
      const c = cnts[cd.key];
      const baStr = c.ba!=null ? ('.'+(c.ba*1000).toFixed(0).padStart(3,'0')) : '-';
      html += `<div style="background:var(--card2);padding:11px 8px;border-radius:6px;text-align:center;border-top:2px solid ${cd.color}">
        <div style="font-size:10px;color:var(--muted)">${cd.label}</div>
        <div style="font-size:8px;color:var(--muted);margin-bottom:4px">${cd.sub}</div>
        <div style="font-size:18px;font-weight:900;color:var(--text);font-family:var(--mono)">${baStr}</div>
        <div style="font-size:9px;color:var(--muted);margin-top:2px">${c.hits}/${c.ab} · 헛스윙 ${c.whPct.toFixed(0)}%</div>
      </div>`;
    });
    html += `</div></div>`;
  }
  
  // ═ 추천 조언
  html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(255,215,0,0.05),var(--card));border-left:3px solid #ffd700">
    <div class="card-title" style="color:#ffd700;font-size:14px;margin-bottom:12px">💡 ${sideLabel} 상대 ${mode==='pitcher'?'공략':'운영'} 조언</div>
    <div style="display:flex;flex-direction:column;gap:8px">`;
  
  const advice = [];
  
  if(mode === 'pitcher'){
    // 좌/우타 상대 투수 공략 조언
    // 1) 노릴 만한 구종
    const okPitches = sortedGroups.filter(([g,d]) => d.ab >= 5 && d.ba !== null && d.ba >= 0.270);
    if(okPitches.length){
      const [g, d] = okPitches[0];
      advice.push(`<b>✅ 노릴 구종:</b> <b style="color:#39ff8a">${g}</b> — ${sideLabel}로서 이 투수 ${g} 상대 ${fmt3(d.ba)}. 사용 비율 ${d.usagePct.toFixed(0)}%로 충분히 만남.`);
    }
    // 2) 피해야 할 구종
    const badPitches = sortedGroups.filter(([g,d]) => d.swings >= 5 && d.whiffPct >= 35);
    if(badPitches.length){
      const [g, d] = badPitches[0];
      advice.push(`<b>❌ 피할 구종:</b> <b style="color:#ff4560">${g}</b> — 헛스윙 ${d.whiffPct.toFixed(0)}% (${d.whiffs}/${d.swings}). 존 밖 ${g} 절대 안 따라가기.`);
    }
    // 3) 카운트 전략
    if(splitN >= 50){
      advice.push(`<b>🎬 카운트 전략:</b> 초구·1구를 적극 공략. ${sideLabel}로서 카운트를 유리하게 가져갈 것.`);
    }
    // 4) 타순 추천
    if(splitN >= 30){
      const ba = splitReport.splitData.ba;
      if(ba >= 0.270){
        advice.push(`<b>📋 라인업:</b> ${sideLabel} 핵심 타자 상위 타순에 배치. 이 투수에 강함.`);
      } else if(ba <= 0.220){
        advice.push(`<b>📋 라인업:</b> ${sideLabel} 라인업은 이 투수에 약점. 매치업 조정 고려.`);
      }
    }
  } else {
    // 좌/우투 상대 타자 봉쇄 조언
    // 1) 결정구
    const kPitches = sortedGroups.filter(([g,d]) => d.swings >= 5 && d.whiffPct >= 40);
    if(kPitches.length){
      const [g, d] = kPitches[0];
      const c = d.course;
      const cTot = (c.high||0) + (c.low||0) + (c.mid||0);
      let where = '';
      if(cTot >= 5){
        if((c.low||0)/cTot >= 0.40) where = ' (낮은 코스로)';
        else if((c.high||0)/cTot >= 0.40) where = ' (높은 코스로)';
      }
      advice.push(`<b>✅ 결정구:</b> <b style="color:#39ff8a">${g}</b>${where} — 이 타자의 ${g} 헛스윙 ${d.whiffPct.toFixed(0)}%. 2K에서 적극.`);
    }
    // 2) 약한 구종
    const weakPitches = sortedGroups.filter(([g,d]) => d.ab >= 4 && d.ba !== null && d.ba <= 0.200);
    if(weakPitches.length){
      const [g, d] = weakPitches[0];
      advice.push(`<b>⚾ 추천 사용:</b> <b style="color:#88ccff">${g}</b> — 이 타자가 ${g} 상대 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 비중 늘리기.`);
    }
    // 3) 피할 구종 (강타)
    const strongPitches = sortedGroups.filter(([g,d]) => d.ab >= 5 && d.ba !== null && d.ba >= 0.320);
    if(strongPitches.length){
      const [g, d] = strongPitches[0];
      advice.push(`<b>❌ 피할 구종:</b> <b style="color:#ff4560">${g}</b> — ${fmt3(d.ba)} (${d.hits}/${d.ab})${d.hr>0?', HR '+d.hr:''}. 던지면 큰일.`);
    }
    // 4) 운영
    if(splitN >= 30){
      const ba = splitReport.splitData.ba;
      if(ba <= 0.220){
        advice.push(`<b>📋 운영:</b> 이 타자는 ${sideLabel}에 약함 (${fmt3(ba)}). ${sideLabel} 등판 시 우리쪽 유리.`);
      } else if(ba >= 0.290){
        advice.push(`<b>📋 운영:</b> 이 타자는 ${sideLabel}에 강함 (${fmt3(ba)}). 매치업 신중.`);
      }
    }
  }
  
  if(!advice.length) advice.push('데이터상 특별한 패턴 없음. 전체 탭의 일반 패턴 참고.');
  advice.forEach(a => {
    html += `<div style="background:var(--card2);padding:10px 12px;border-radius:5px;font-size:12px;line-height:1.65;color:var(--text)">${a}</div>`;
  });
  
  html += `</div></div>`;
  
  // 표본 부족 경고
  if(splitN < 30){
    html += `<div style="background:rgba(255,140,68,0.1);border:1px solid #ff8c44;padding:11px 14px;border-radius:6px;font-size:11px;color:#ff8c44;text-align:center;margin-bottom:14px">
      ⚠ ${sideLabel} 상대 데이터가 ${splitN}구뿐입니다. 분석 결과는 참고용이며, 전체 탭과 함께 보세요.
    </div>`;
  }
  
  return html;
};

// Original index.html:20314
wbdContext._scoutZone5x5 = function _scoutZone5x5(name, mode, metric, opts){
  const arr=(mode==='pitcher')?wbdContext.getPitcherDataByName(name):wbdContext.getBatterDataByName(name);
  const cells=wbdContext._zone5x5Cells(arr.filter(d=>d.zoneX!=null));
  return wbdContext._zone5x5SVG(cells, metric||'avg', opts||{});
};

// Original index.html:20324
wbdContext.onDefenderChange = function onDefenderChange(){
  const name = document.getElementById('defender-sel').value;
  window._defenderState = window._defenderState || {};
  window._defenderState.selectedPlayer = name;
  window._defenderState.posFilter = 'all';
  // 포지션 셀렉터 갱신
  wbdContext.updateDefenderPosSelector();
  wbdContext.renderDefenderPage();
};

// Original index.html:20334
wbdContext.onDefenderPosChange = function onDefenderPosChange(){
  window._defenderState = window._defenderState || {};
  window._defenderState.posFilter = document.getElementById('defender-pos-sel').value;
  wbdContext.renderDefenderPage();
};

// Original index.html:20340
wbdContext.updateDefenderPosSelector = function updateDefenderPosSelector(){
  const data = wbdContext._computeDefenseData();
  const name = window._defenderState?.selectedPlayer;
  const sel = document.getElementById('defender-pos-sel');
  if(!name || !data.byPlayerPos[name]){
    sel.innerHTML = '<option value="all">주 포지션</option>';
    return;
  }
  const positions = Object.entries(data.byPlayerPos[name]).sort((a,b) => b[1].chances - a[1].chances);
  let opts = '<option value="all">전체 (주 포지션 기준)</option>';
  positions.forEach(([pk, ps]) => {
    opts += `<option value="${pk}">${data.posNameKor[pk]||pk} (${ps.chances}건)</option>`;
  });
  sel.innerHTML = opts;
};

// Original index.html:20356
wbdContext.populateDefenderSelector = function populateDefenderSelector(){
  const data = wbdContext._computeDefenseData();
  const sel = document.getElementById('defender-sel');
  if(!sel) return;
  // V9.9: 모든 선수 표시 (1건 이상)
  const players = Object.values(data.byPlayer).filter(s => s.chances >= 1)
    .sort((a, b) => b.chances - a.chances);
  let opts = '<option value="">— 선수 선택 —</option>';
  players.forEach(p => {
    const posLabel = data.posNameKor[p.primaryPos] || p.primaryPos;
    opts += `<option value="${p.name}">${p.name} · ${posLabel} (${p.chances}건)</option>`;
  });
  sel.innerHTML = opts;
};

// Original index.html:20372
wbdContext._renderDefenseHeatmap = function _renderDefenseHeatmap(plays, W=460, H=460){
  // V11.5: 구버전 근사 좌표(폴 ±69m·중앙 -138m·BD 27.4)를 쓰고 있던 것을
  //        공통 실측 FIELD 상수 기반 _renderSprayField()로 교체 — 다른 화면과 구장 모양 통일
  const dots = plays.map(p => ({
    lx: +p.cx || 0,
    lz: +p.cz || 0,
    color: p._isOut ? '#39ff8a' : '#ff4560',
    r: (p._ev >= 105 ? 4 : 3),
    op: 0.75
  }));
  // 구버전과 동일한 표시 크기 유지 (makeSVG는 width:100%라 컨테이너 폭만큼 커지므로 상한 지정)
  return `<div style="max-width:${W}px;width:100%;margin:0 auto">${wbdContext._renderSprayField(dots, {w:W, h:H, pad:12})}</div>`;
};

// Original index.html:20386
wbdContext.renderDefenderPage = function renderDefenderPage(){
  const root = document.getElementById('defender-content');
  if(!wbdContext.G || !wbdContext.G.length){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">데이터를 먼저 업로드하세요.</div>`; return; }
  
  wbdContext.populateDefenderSelector();
  
  const st = window._defenderState = window._defenderState || {};
  const data = wbdContext._computeDefenseData();
  
  // 셀렉터 값 동기화
  const sel = document.getElementById('defender-sel');
  if(st.selectedPlayer && sel.value !== st.selectedPlayer){
    // 셀렉터가 비어있으면 값 설정
    if([...sel.options].some(o => o.value === st.selectedPlayer)){
      sel.value = st.selectedPlayer;
    }
  }
  if(!st.selectedPlayer){
    root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">선수를 선택하세요. 상단 셀렉터에서 수비 기회 10건 이상의 선수 목록을 볼 수 있습니다.</div>`;
    return;
  }
  
  const name = st.selectedPlayer;
  const p = data.byPlayer[name];
  if(!p){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">선수 데이터 없음 (수비 기회 부족)</div>`; return; }
  
  // 포지션 필터 (셀렉터 갱신은 onDefenderChange에서)
  wbdContext.updateDefenderPosSelector();
  const posSel = document.getElementById('defender-pos-sel');
  if(st.posFilter && posSel.value !== st.posFilter){
    if([...posSel.options].some(o => o.value === st.posFilter)) posSel.value = st.posFilter;
  }
  const filterPos = st.posFilter || 'all';
  
  // 현재 보고 있는 포지션의 통계
  let viewPos, ps, plays;
  if(filterPos === 'all'){
    viewPos = p.primaryPos;
    ps = p.byPos[p.primaryPos];
    plays = ps.plays;
  } else {
    viewPos = filterPos;
    ps = p.byPos[filterPos];
    if(!ps){ root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">이 포지션에서의 기회가 없습니다.</div>`; return; }
    plays = ps.plays;
  }
  
  const posLabel = data.posNameKor[viewPos] || viewPos;
  
  // ━━━ 백분위 (해당 포지션 한정, 5건 이상) ━━━
  const samePosPlayers = Object.entries(data.byPlayerPos)
    .map(([n, byP]) => byP[viewPos])
    .filter(s => s && s.chances >= 5);
  function pctile(val, key, higherBetter=true){
    if(val == null) return null;
    const vals = samePosPlayers.map(p => p[key]).filter(v => v != null);
    if(!vals.length) return null;
    const below = vals.filter(v => higherBetter ? v < val : v > val).length;
    return below / vals.length * 100;
  }
  function pctileBadge(pct){
    if(pct == null) return '';
    const col = pct >= 80 ? '#39ff8a' : pct >= 60 ? '#88cc44' : pct >= 40 ? '#ff8800' : '#ff4560';
    return `<span style="color:${col};font-size:10px;margin-left:4px">⊕ ${posLabel} 상위 ${(100-pct).toFixed(0)}%</span>`;
  }
  const oaaPctile = pctile(ps.oaaWeighted, 'oaaWeighted', true);
  const outPctile = pctile(ps.outRate, 'outRate', true);
  const hardPctile = pctile(ps.hardCatchRate, 'hardCatchRate', true);
  const distPctile = pctile(ps.avgMoveDist, 'avgMoveDist', true);  // 이동거리 많이 한 게 좋음 (커버 범위)
  
  // ━━━ 색상 ━━━
  const oaaCol = ps.oaaWeighted > 2 ? '#39ff8a' : ps.oaaWeighted > 0.5 ? '#88cc44' : ps.oaaWeighted < -2 ? '#ff4560' : ps.oaaWeighted < -0.5 ? '#ff8800' : 'var(--text)';
  const outCol = ps.outRate >= 0.6 ? '#39ff8a' : ps.outRate >= 0.45 ? '#88cc44' : ps.outRate >= 0.3 ? '#ff8800' : '#ff4560';
  
  // ━━━ 포지션 배지 ━━━
  const posBadges = Object.entries(p.posMap).sort((a,b) => b[1]-a[1]).map(([pk, n]) => {
    const pct = (n/p.chances*100).toFixed(0);
    const isMain = pk === p.primaryPos;
    const isCurrent = pk === viewPos;
    const bg = isCurrent ? 'rgba(255,215,0,0.18)' : isMain ? 'rgba(57,255,138,0.18)' : 'rgba(255,255,255,0.05)';
    const fg = isCurrent ? '#ffd700' : isMain ? '#39ff8a' : 'var(--text)';
    const border = isCurrent ? '#ffd700' : isMain ? '#39ff8a' : 'var(--border)';
    return `<span style="background:${bg};color:${fg};padding:3px 10px;border-radius:12px;font-size:11px;font-weight:${isCurrent||isMain?'700':'500'};border:1px solid ${border}">${data.posNameKor[pk]||pk} ${pct}% (${n})${isMain?' ⭐':''}${isCurrent?' 👁️':''}</span>`;
  }).join(' ');
  
  // ━━━ V11.3: 방향별 / 거리별 수비 분석 ━━━
  const _dirLabel={front:'전진 (앞으로)',back:'후퇴 (뒤로)',side:'측면 (옆으로)'};
  const _dirIcon={front:'⬆️',back:'⬇️',side:'↔️'};
  const dirAgg={front:{n:0,out:0,oaa:0},back:{n:0,out:0,oaa:0},side:{n:0,out:0,oaa:0}};
  const distBins=[{lo:0,hi:5,l:'0~5m'},{lo:5,hi:10,l:'5~10m'},{lo:10,hi:15,l:'10~15m'},
                  {lo:15,hi:20,l:'15~20m'},{lo:20,hi:999,l:'20m+'}];
  const distAgg=distBins.map(b=>({...b,n:0,out:0,oaa:0}));
  (plays||[]).forEach(pl=>{
    const dir = (pl._catchDir==null) ? 'side' : (pl._catchDir>3?'back':(pl._catchDir<-3?'front':'side'));
    const da=dirAgg[dir]; da.n++; if(pl._isOut)da.out++; da.oaa+=((pl._isOut?1:0)-(pl._xOut||0));
    const md=pl._moveDist;
    if(md!=null){
      const b=distAgg.find(x=>md>=x.lo&&md<x.hi);
      if(b){ b.n++; if(pl._isOut)b.out++; b.oaa+=((pl._isOut?1:0)-(pl._xOut||0)); }
    }
  });
  const _ocol=v=>v>1?'#39ff8a':v<-1?'#ff4560':'var(--text)';
  const _sgn=v=>(v>0?'+':'')+v.toFixed(1);
  // 리그 평균 아웃률 (같은 포지션, 방향별)
  const lgDir={front:{n:0,out:0},back:{n:0,out:0},side:{n:0,out:0}};
  (data.enriched||[]).forEach(pl=>{
    if(pl._pos!==viewPos) return;
    const dir=(pl._catchDir==null)?'side':(pl._catchDir>3?'back':(pl._catchDir<-3?'front':'side'));
    lgDir[dir].n++; if(pl._isOut)lgDir[dir].out++;
  });
  const dirCards=['front','back','side'].map(k=>{
    const a=dirAgg[k];
    if(!a.n) return `<div class="card" style="padding:12px;opacity:0.5">
      <div style="font-size:11px;color:var(--muted)">${_dirIcon[k]} ${_dirLabel[k]}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">기회 없음</div></div>`;
    const rate=a.out/a.n*100;
    const lg=lgDir[k].n>0?lgDir[k].out/lgDir[k].n*100:null;
    const diff=lg!=null?rate-lg:null;
    return `<div class="card" style="padding:12px">
      <div style="font-size:11px;color:var(--muted)">${_dirIcon[k]} ${_dirLabel[k]}</div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-top:5px">
        <span style="font-size:22px;font-weight:800;font-family:var(--mono);color:${rate>=60?'#39ff8a':rate<35?'#ff4560':'var(--text)'}">${rate.toFixed(0)}%</span>
        <span style="font-size:10px;color:var(--muted)">${a.out}/${a.n}</span>
      </div>
      ${lg!=null?`<div style="font-size:10px;color:${diff>5?'#39ff8a':diff<-5?'#ff4560':'var(--muted)'}">리그 ${lg.toFixed(0)}% (${diff>=0?'+':''}${diff.toFixed(0)}%p)</div>`:''}
      <div style="font-size:10px;color:${_ocol(a.oaa)};margin-top:3px">OAA ${_sgn(a.oaa)}</div>
    </div>`;
  }).join('');
  // 거리별 막대
  const maxDistN=Math.max(...distAgg.map(b=>b.n),1);
  const distRows=distAgg.filter(b=>b.n>0).map(b=>{
    const rate=b.out/b.n*100;
    return `<div style="margin-bottom:7px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span>${b.l} <span style="color:var(--muted);font-size:10px">(${b.n}회)</span></span>
        <span style="font-family:var(--mono)">아웃 ${rate.toFixed(0)}% · <span style="color:${_ocol(b.oaa)}">OAA ${_sgn(b.oaa)}</span></span>
      </div>
      <div style="height:12px;background:var(--card2);border-radius:6px;overflow:hidden;display:flex">
        <div style="height:100%;width:${rate}%;background:#39ff8a;opacity:0.7"></div>
        <div style="height:100%;width:${100-rate}%;background:#ff4560;opacity:0.35"></div>
      </div>
    </div>`;
  }).join('');
  const dirSection=`
  <div class="card section">
    <div class="card-title">방향별 수비 <span style="font-size:10px;color:var(--muted);font-weight:400">(${data.posNameKor[viewPos]||viewPos} · 리그 동일 포지션 대비)</span></div>
    <div class="grid3" style="grid-template-columns:1fr 1fr 1fr;gap:10px">${dirCards}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.6">
      실측: 외야 플라이는 <b>전진 아웃률이 후퇴보다 훨씬 높음</b>(쉬움). 후퇴 타구를 잘 잡으면 높은 평가.
    </div>
  </div>
  <div class="card section">
    <div class="card-title">이동거리별 처리</div>
    ${distRows||'<div style="font-size:11px;color:var(--muted)">데이터 없음</div>'}
    <div style="font-size:10px;color:var(--muted);margin-top:6px">초록=아웃 · 빨강=안타 허용 · 거리가 멀수록 난이도 상승</div>
  </div>`;

  // ━━━ 포지션별 OAA 표 ━━━
  const posOaaRows = Object.entries(p.byPos).sort((a,b) => b[1].chances - a[1].chances).map(([pk, pps]) => {
    const isMain = pk === p.primaryPos;
    const oc = pps.oaaWeighted > 1 ? '#39ff8a' : pps.oaaWeighted < -1 ? '#ff4560' : 'var(--text)';
    const orc = pps.outRate >= 0.6 ? '#39ff8a' : pps.outRate >= 0.45 ? '#88cc44' : pps.outRate >= 0.3 ? '#ff8800' : '#ff4560';
    const oaaP10 = pps.chances > 0 ? pps.oaaWeighted/pps.chances*10 : 0;
    const hardCol = pps.hardCatchRate >= 20 ? '#ffd700' : pps.hardCatchRate >= 10 ? '#39ff8a' : pps.hardCatchRate >= 5 ? '#88cc44' : '#789';
    const easyMissPct = pps.easy.total > 0 ? pps.easyMissCount/pps.easy.total*100 : 0;
    const easyCol = easyMissPct === 0 ? '#39ff8a' : easyMissPct < 5 ? '#88cc44' : easyMissPct < 10 ? '#ff8800' : '#ff4560';
    return `<tr ${isMain?'style="background:rgba(57,255,138,0.04)"':''}>
      <td><span style="background:${isMain?'rgba(57,255,138,0.2)':'rgba(255,255,255,0.05)'};color:${isMain?'#39ff8a':'var(--text)'};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:700">${data.posNameKor[pk]||pk}${isMain?' ⭐':''}</span></td>
      <td>${pps.chances}</td>
      <td style="color:${orc};font-weight:600">${(pps.outRate*100).toFixed(1)}%</td>
      <td style="color:${oc};font-family:var(--mono);font-weight:700">${pps.oaaWeighted>0?'+':''}${pps.oaaWeighted.toFixed(1)}</td>
      <td style="color:${oc};font-family:var(--mono)">${oaaP10>0?'+':''}${oaaP10.toFixed(2)}</td>
      <td style="color:${hardCol};font-family:var(--mono)">${pps.hard.total>0?pps.hard.outs+'/'+pps.hard.total+' ('+pps.hardCatchRate.toFixed(0)+'%)':'-'}</td>
      <td style="color:${easyCol};font-family:var(--mono)">${pps.easy.total>0?pps.easyMissCount+'/'+pps.easy.total:'-'}</td>
      <td>${pps.avgMoveDist.toFixed(1)}m</td>
    </tr>`;
  }).join('');
  
  // 분포 히스토그램 (이동 거리만)
  function makeHist(values, label, color, binSize, maxBin){
    if(!values.length) return '';
    const W2=320, H2=130, px=30, py=10;
    const bins = Math.ceil(maxBin / binSize);
    const hist = new Array(bins).fill(0);
    values.forEach(v => {
      const i = Math.min(Math.floor(v/binSize), bins-1);
      if(i >= 0) hist[i]++;
    });
    const maxH = Math.max(...hist, 1);
    const bW = (W2 - px - 10) / bins;
    const baseY = H2 - 28;
    let svgItems = '';
    hist.forEach((cnt, i) => {
      const x = px + i*bW;
      const h = (cnt/maxH) * (baseY - py - 2);
      const y = baseY - h;
      svgItems += `<rect x="${(x+0.5).toFixed(1)}" y="${y.toFixed(1)}" width="${(bW-1).toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85" rx="0.5"/>`;
      if(cnt > 0) svgItems += `<text x="${(x+bW/2).toFixed(1)}" y="${(y-2).toFixed(1)}" fill="#cfd" font-size="8" text-anchor="middle">${cnt}</text>`;
    });
    svgItems += `<line x1="${px}" y1="${baseY}" x2="${W2-10}" y2="${baseY}" stroke="rgba(255,255,255,0.25)" stroke-width="0.7"/>`;
    for(let i=0;i<=bins;i+=Math.max(1, Math.floor(bins/5))){
      const x = px + i*bW;
      const val = i*binSize;
      svgItems += `<text x="${x.toFixed(1)}" y="${(baseY+12).toFixed(1)}" fill="#7a9ab0" font-size="9" text-anchor="middle">${val}</text>`;
    }
    const avg = values.reduce((a,b)=>a+b,0)/values.length;
    svgItems += `<text x="${(W2-10).toFixed(1)}" y="${(py+10).toFixed(1)}" fill="${color}" font-size="10" text-anchor="end" font-weight="600">평균 ${avg.toFixed(2)}</text>`;
    svgItems += `<text x="${(W2/2).toFixed(1)}" y="${(H2-4).toFixed(1)}" fill="#5a7a9a" font-size="9" text-anchor="middle">${label}</text>`;
    return `<svg width="100%" height="${H2}" viewBox="0 0 ${W2} ${H2}" preserveAspectRatio="xMidYMid meet">${svgItems}</svg>`;
  }
  const distValues = plays.map(pp => pp._moveDist).filter(v => v != null);
  const distHist = makeHist(distValues, '이동 거리 (m) — 시작 위치에서 포구 지점까지', '#ffd700', 2, 30);
  // EV 분포 — 어떤 강도의 타구를 주로 처리하는지
  const evValues = plays.map(pp => pp._ev).filter(v => v > 0);
  const evHist = makeHist(evValues, '타구속도 EV (mph) — 처리한 타구의 강도 분포', '#88ccff', 5, 130);
  
  // ━━━ 히트맵 ━━━
  const heatmap = wbdContext._renderDefenseHeatmap(plays);
  
  // ━━━ 평가 텍스트 ━━━
  let assessment = '';
  if(ps.chances >= 20){
    const traits = [];
    if(ps.oaaWeighted >= 5) traits.push(`🌟 <b>${posLabel} 엘리트</b> - OAA ${ps.oaaWeighted.toFixed(1)} (상위 ${(100-(oaaPctile||50)).toFixed(0)}%)`);
    else if(ps.oaaWeighted >= 2) traits.push(`✨ ${posLabel} 우수 수비수`);
    else if(ps.oaaWeighted <= -3) traits.push(`⚠️ ${posLabel}에서 수비 부진`);
    
    if(ps.hardCatchRate >= 20) traits.push(`💪 <b>어려운 타구 잘 잡음</b> - 어려운 잡기 ${ps.hardCatchRate.toFixed(0)}% (${ps.hard.outs}/${ps.hard.total})`);
    if(ps.easyMissCount === 0 && ps.easy.total >= 15) traits.push(`🎯 <b>쉬운 타구 100% 처리</b> - ${ps.easy.total}개 모두 잡음`);
    if(ps.easyMissCount >= 5) traits.push(`😬 쉬운 타구 ${ps.easyMissCount}개 놓침 - 집중력 이슈`);
    
    if(ps.longRunouts >= 10) traits.push(`🏃 <b>넓은 커버 범위</b> - 10m+ 이동해 잡은 횟수 ${ps.longRunouts}`);
    if(ps.farLongCatches >= 3) traits.push(`🚀 15m+ 장거리 캐치 ${ps.farLongCatches}회 — 비범한 수비 범위`);
    
    if(traits.length){
      assessment = `<div class="card section" style="border-left:3px solid var(--amber)">
        <div class="card-title">📋 ${posLabel} 수비 평가</div>
        <ul style="margin:0;padding-left:18px;line-height:1.9">${traits.map(t => '<li>'+t+'</li>').join('')}</ul>
      </div>`;
    }
  }
  
  // ━━━ KPI 카드 ━━━
  const heightInfo = p.height ? ` · 키 ${p.height.toFixed(1)}cm` : '';
  
  root.innerHTML = `
    <div style="padding:0 4px 14px;border-bottom:1px solid var(--border);margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <h2 style="margin:0;font-size:24px">🛡️ ${name}</h2>
        <span style="background:rgba(57,255,138,0.15);color:#39ff8a;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">${posLabel} ${filterPos==='all'?`(${(p.primaryPosShare*100).toFixed(0)}% 출전)`:''}</span>
        <span style="color:var(--muted);font-size:12px">${heightInfo} · 전체 수비 ${p.chances}건 / ${posLabel} ${ps.chances}건</span>
      </div>
    </div>
    
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px">
      <div class="card" style="padding:14px;border-left:3px solid ${oaaCol}">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px">OAA (${posLabel})</div>
        <div style="color:${oaaCol};font-weight:800;font-size:28px;font-family:var(--mono);margin-top:4px">${ps.oaaWeighted>0?'+':''}${ps.oaaWeighted.toFixed(1)}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:3px">10기회당 ${ps.chances>0?(ps.oaaWeighted/ps.chances*10).toFixed(2):'-'}${pctileBadge(oaaPctile)}</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px">아웃 처리율</div>
        <div style="color:${outCol};font-weight:800;font-size:28px;font-family:var(--mono);margin-top:4px">${(ps.outRate*100).toFixed(1)}%</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:3px">${ps.outs} / ${ps.chances} 기회${pctileBadge(outPctile)}</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px">어려운 잡기</div>
        <div style="color:#ffd700;font-weight:800;font-size:28px;font-family:var(--mono);margin-top:4px">${ps.hard.total>0?ps.hardCatchRate.toFixed(0)+'%':'-'}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:3px">${ps.hard.outs}/${ps.hard.total} (xOut<30%)${pctileBadge(hardPctile)}</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px">쉬운 놓치기</div>
        <div style="color:${ps.easyMissCount===0?'#39ff8a':'#ff8800'};font-weight:800;font-size:28px;font-family:var(--mono);margin-top:4px">${ps.easy.total>0?ps.easyMissCount:'-'}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:3px">/${ps.easy.total} (xOut≥70%)</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px">평균 이동 거리</div>
        <div style="color:#ff8c44;font-weight:800;font-size:28px;font-family:var(--mono);margin-top:4px">${ps.avgMoveDist.toFixed(1)}<span style="font-size:14px;font-weight:400">m</span></div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:3px">시작 위치 → 포구 위치${pctileBadge(distPctile)}</div>
      </div>
      <div class="card" style="padding:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px">장거리 잡기</div>
        <div style="color:#cc88ff;font-weight:800;font-size:28px;font-family:var(--mono);margin-top:4px">${ps.longRunouts}</div>
        <div style="font-size:10.5px;color:var(--muted);margin-top:3px">10m+ 이동 후 처리 (${ps.farLongCatches} 15m+)</div>
      </div>
    </div>
    
    ${assessment}
    
    <div class="card section">
      <div class="card-title">🏟️ 수비 포지션 분포</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0">${posBadges}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:10px">⭐ = 주 포지션 (전체 출전 중 최다) · 👁️ = 현재 보고 있는 포지션 · 셀렉터로 포지션 전환 가능</div>
    </div>
    
    <div class="card section">
      <div class="card-title">🎯 포지션별 수비 성적 — 각 포지션 따로</div>
      <div style="font-size:11px;color:#9ab;margin-bottom:10px;line-height:1.5">
        ⓘ 같은 포지션 × 거리 × EV × 발사각의 평균 아웃 확률과 비교한 OAA. 
        <b>어려운 잡기</b> = 평균 아웃확률 30% 미만 타구 처리. 
        <b>쉬운 놓치기</b> = 70%+ 타구 놓침 (큰 페널티).
      </div>
      <div style="overflow-x:auto">
        <table class="data-table gtable compact" style="font-size:11px;width:100%;min-width:780px">
          <thead><tr>
            <th>포지션</th><th>기회</th><th>아웃%</th><th>OAA</th><th>OAA/10</th>
            <th>어려운 잡기</th><th>쉬운 놓치기</th><th>평균 이동거리</th>
          </tr></thead>
          <tbody>${posOaaRows}</tbody>
        </table>
      </div>
    </div>
    ${dirSection}
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:20px">
      <div class="card section">
        <div class="card-title">📐 이동 거리 분포 (${posLabel})</div>
        ${distHist}
      </div>
      <div class="card section">
        <div class="card-title">⚡ 타구 강도(EV) 분포 (${posLabel})</div>
        ${evHist}
      </div>
    </div>
    
    <div class="card section">
      <div class="card-title">🗺️ 수비 히트맵 — 포구 위치 (${posLabel})</div>
      <div style="display:flex;gap:14px;font-size:11px;color:var(--muted);margin-bottom:6px;flex-wrap:wrap">
        <span><span style="display:inline-block;width:10px;height:10px;background:#39ff8a;border-radius:50%;vertical-align:middle"></span> 아웃 처리 (${ps.outs})</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#ff4560;border-radius:50%;vertical-align:middle"></span> 안타 허용 (${ps.hits})</span>
        <span style="color:var(--muted)">큰 점 = EV≥105 강타구</span>
        <span style="color:var(--muted);margin-left:auto">← 3루/좌익 / 1루/우익 →</span>
      </div>
      <div style="display:flex;justify-content:center">${heatmap}</div>
    </div>
  `;
};
}

export function initialize(wbdContext) {

}
