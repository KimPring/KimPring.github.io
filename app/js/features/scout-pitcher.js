/** scout-pitcher: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:18164
wbdContext._scoutGeneratePitcherReport = function _scoutGeneratePitcherReport(data){
  if(!data) return {sections:[]};
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const sections = [];
  const lg = wbdContext._scoutLeagueAvgs();
  
  // ───────────────────────────────────────
  // 1. 개요 (Overview) - 객관 통계
  // ───────────────────────────────────────
  const overview = [];
  const handLabel = data.pHand==='L'?'좌투':data.pHand==='R'?'우투':'';
  
  // 통계 기반 등급 평가
  const ovBA = data.overall.ba;
  let perfTier;
  if(ovBA < 0.200) perfTier = '<span style="color:#ff4560">에이스급</span>';
  else if(ovBA < 0.240) perfTier = '<span style="color:#39ff8a">1선발급</span>';
  else if(ovBA < 0.280) perfTier = '<span style="color:#ffd700">주전급</span>';
  else if(ovBA < 0.320) perfTier = '<span style="color:#ff8c44">롱릴리프급</span>';
  else perfTier = '<span style="color:#888">개선 필요</span>';
  
  overview.push(`<b>${handLabel}${handLabel?' ':''}투수</b>. 실전 성적 ${perfTier} (피안타율 <b>${fmt3(ovBA)}</b>)`);
  
  const sampleNote = data.total>=200?'(매우 충분)':data.total>=100?'(충분)':data.total>=50?'(적절)':'(부족, 참고용)';
  overview.push(`총 <b>${data.total.toLocaleString()}구</b> · ${data.games}경기 등판 ${sampleNote}`);
  
  // K/BB
  if(data.k > 0 || data.bb > 0){
    const kbb = data.bb > 0 ? (data.k/data.bb).toFixed(2) : '∞';
    let kbbLabel;
    const kbbN = parseFloat(kbb);
    if(kbb === '∞' || kbbN >= 4) kbbLabel = '<span style="color:#39ff8a">매우 우수</span>';
    else if(kbbN >= 2.5) kbbLabel = '<span style="color:#88ccff">우수</span>';
    else if(kbbN >= 1.5) kbbLabel = '평균';
    else kbbLabel = '<span style="color:#ff8c44">부족</span>';
    overview.push(`K ${data.k} · BB ${data.bb} · HBP ${data.hbp} → <b>K/BB ${kbb}</b> (${kbbLabel})`);
  }
  
  // BB%
  if(data.bbPct > 0){
    let bbLabel;
    if(data.bbPct < 4) bbLabel = '<span style="color:#39ff8a">제구 매우 우수</span>';
    else if(data.bbPct < 7) bbLabel = '<span style="color:#88ccff">제구 양호</span>';
    else if(data.bbPct < 10) bbLabel = '제구 보통';
    else bbLabel = '<span style="color:#ff4560">제구 불안</span>';
    overview.push(`볼넷 비율 <b>${data.bbPct.toFixed(1)}%</b> (전체 투구 대비) — ${bbLabel}`);
  }
  
  // 직구/변화구
  const fbGroups = ['포심','투심','커터','패스트볼','싱커'];
  const fbCount = Object.entries(data.byGroup).filter(([g])=>fbGroups.includes(g)).reduce((s,[g,arr])=>s+arr.length,0);
  const fbPct = data.total>0?fbCount/data.total*100:0;
  let styleType;
  if(fbPct >= 70) styleType = '<span style="color:#ff8c44">직구 위주</span>';
  else if(fbPct >= 55) styleType = '<span style="color:#39ff8a">직구·변화구 균형</span>';
  else if(fbPct >= 40) styleType = '<span style="color:#88ccff">변화구 위주</span>';
  else styleType = '<span style="color:#cc44ff">변화구 의존</span>';
  overview.push(`직구 ${fbPct.toFixed(0)}% · 변화구 ${(100-fbPct).toFixed(0)}% · 사용 구종 ${Object.keys(data.groupDetails).length}종 — ${styleType}`);
  
  // 안정성 (게임별 BAA 표편)
  if(data.gameVariability != null){
    const gv = data.gameVariability;
    let stabilityLabel;
    if(gv < 0.080) stabilityLabel = '<span style="color:#39ff8a">매우 안정</span>';
    else if(gv < 0.120) stabilityLabel = '<span style="color:#88ccff">안정적</span>';
    else if(gv < 0.180) stabilityLabel = '<span style="color:#ffd700">기복 있음</span>';
    else stabilityLabel = '<span style="color:#ff4560">기복 심함</span>';
    let detail = '';
    if(data.badGames > 0 || data.goodGames > 0){
      detail = ` — 망경기 ${data.badGames}회 / 호투 ${data.goodGames}회`;
    }
    overview.push(`경기별 편차 σ=${gv.toFixed(3)} (${stabilityLabel})${detail}`);
  }
  
  sections.push({title:'🔎 개요', color:'#88ccff', items:overview});
  
  // ───────────────────────────────────────
  // 2. 투구 패턴 (자세한 분석)
  // ───────────────────────────────────────
  const patterns = [];
  
  // ─ 구종 분석 (각 구종마다 자세하게) ─
  const sortedGroups = Object.entries(data.groupDetails).sort((a,b)=>b[1].usagePct-a[1].usagePct);
  if(sortedGroups.length){
    sortedGroups.slice(0, 4).forEach(([g, d], idx) => {
      const parts = [];
      const rolePrefix = idx === 0 ? '🥇 주력' : idx === 1 ? '🥈 2번' : idx === 2 ? '🥉 3번' : '4번';
      parts.push(`<b>${rolePrefix} 구종: ${g}</b> (${d.usagePct.toFixed(0)}%, ${d.n}구)`);
      
      const lgGroup = lg.groupAvg && lg.groupAvg[g];
      
      const spdParts = [];
      if(d.avgSpd > 0){
        let spdNote = '';
        if(lgGroup && lgGroup.spdMean > 0){
          // 리그 평균 대비
          if(d.avgSpd >= lgGroup.spdP75) spdNote = ` <span style="color:#39ff8a">(리그 상위, 평균 ${lgGroup.spdMean.toFixed(1)})</span>`;
          else if(d.avgSpd <= lgGroup.spdP25) spdNote = ` <span style="color:#ff8c44">(리그 하위, 평균 ${lgGroup.spdMean.toFixed(1)})</span>`;
          else spdNote = ` (리그 평균 ${lgGroup.spdMean.toFixed(1)})`;
        }
        spdParts.push(`평균 <b>${d.avgSpd.toFixed(1)}km/h</b>${spdNote}`);
      }
      if(d.spdStd > 0 && d.n >= 10){
        if(d.spdStd < 1.5) spdParts.push('구속 매우 일관');
        else if(d.spdStd > 4) spdParts.push(`<span style="color:#ff8c44">구속 들쭉날쭉 (σ${d.spdStd.toFixed(1)})</span>`);
      }
      
      const movParts = [];
      if(d.avgSH > 0 || d.avgSV > 0){
        let movNote = '';
        if(lgGroup && lgGroup.movMean > 0){
          // 리그 평균 대비 (퍼센타일 기반)
          const myMov = d.avgSH + d.avgSV;
          if(myMov >= lgGroup.movP75) movNote = ` <span style="color:#39ff8a">(리그 상위 무브)</span>`;
          else if(myMov <= lgGroup.movP25) movNote = ` <span style="color:#ff8c44">(리그 하위 무브)</span>`;
          else movNote = ` (리그 평균)`;
          // 횡/종 어느게 강한지
          const hRatio = d.avgSH / lgGroup.sHMean;
          const vRatio = d.avgSV / lgGroup.sVMean;
          if(hRatio >= 1.2 && hRatio > vRatio + 0.2) movNote += ' · 횡변 강함';
          else if(vRatio >= 1.2 && vRatio > hRatio + 0.2) movNote += ' · 종변 강함';
        }
        movParts.push(`횡변 ${d.avgSH.toFixed(1)}cm · 종변 ${d.avgSV.toFixed(1)}cm${movNote}`);
      }
      if(d.avgGyro > 0){
        movParts.push(`자이로 ${d.avgGyro.toFixed(1)}°`);
      }
      
      // ─ 사용 패턴 (인존/유인구성) ─
      const usagePart = [];
      let usageStyle = '';
      if(d.inZonePct >= 65){
        usageStyle = `<b style="color:#88ccff">존 적극</b> (인존 ${d.inZonePct.toFixed(0)}%) — 스트라이크로 카운트 잡는 용도`;
      } else if(d.inZonePct <= 35){
        usageStyle = `<b style="color:#cc44ff">유인구성</b> (인존 ${d.inZonePct.toFixed(0)}%) — 존 밖으로 빼서 헛스윙 유도`;
      } else if(d.inZonePct <= 50){
        usageStyle = `<b>경계 활용형</b> (인존 ${d.inZonePct.toFixed(0)}%) — 코너 위주, 골라낼 수 있음`;
      } else {
        usageStyle = `존 위주 (인존 ${d.inZonePct.toFixed(0)}%)`;
      }
      usagePart.push(usageStyle);
      if(d.chaseRate >= 50 && d.n >= 20){
        usagePart.push(`<b style="color:#ff4560">존 밖 체이스율 ${d.chaseRate.toFixed(0)}%</b> (함정 효과적)`);
      } else if(d.chaseRate >= 35 && d.n >= 20){
        usagePart.push(`존 밖 체이스 ${d.chaseRate.toFixed(0)}%`);
      }
      
      // ─ 코스 위치 (9분할 분포 - 어디로 자주 던지는지) ─
      const coursePart = [];
      const cp = d.coursePos;
      const totalIn = (cp.highOut + cp.highMid + cp.highIn + cp.midOut + cp.midMid + cp.midIn + cp.lowOut + cp.lowMid + cp.lowIn);
      if(totalIn >= 15){
        // 가장 자주 던지는 칸 찾기
        // V12.0: coursePos는 투구별 타자 손잡이 기준(몸쪽/바깥)
        const cells = [
          {n:'높은 바깥쪽', v:cp.highOut}, {n:'높은 가운데', v:cp.highMid}, {n:'높은 몸쪽', v:cp.highIn},
          {n:'바깥쪽', v:cp.midOut}, {n:'한가운데', v:cp.midMid}, {n:'몸쪽', v:cp.midIn},
          {n:'낮은 바깥쪽', v:cp.lowOut}, {n:'낮은 가운데', v:cp.lowMid}, {n:'낮은 몸쪽', v:cp.lowIn}
        ];
        cells.sort((a,b)=>b.v-a.v);
        const top1 = cells[0], top2 = cells[1];
        if(top1.v >= 5){
          let courseInfo = `<b>주로 던지는 코스: ${top1.n} ${(top1.v/totalIn*100).toFixed(0)}%`;
          if(top2.v >= 4) courseInfo += `, ${top2.n} ${(top2.v/totalIn*100).toFixed(0)}%`;
          courseInfo += '</b> <span style="font-size:10px;color:var(--muted)">(타자 손잡이 기준)</span>';
          coursePart.push(courseInfo);
        }
        // 높낮이 편향
        const highTotal = cp.highOut + cp.highMid + cp.highIn;
        const lowTotal = cp.lowOut + cp.lowMid + cp.lowIn;
        const midTotal = cp.midOut + cp.midMid + cp.midIn;
        if(highTotal > lowTotal*2 && highTotal >= 8){
          coursePart.push(`높은 공 위주 (${(highTotal/totalIn*100).toFixed(0)}%)`);
        } else if(lowTotal > highTotal*2 && lowTotal >= 8){
          coursePart.push(`낮은 공 위주 (${(lowTotal/totalIn*100).toFixed(0)}%)`);
        }
      }
      
      if(d.midPct >= 20) coursePart.push(`<span style="color:#ff4560">한가운데 ${d.midPct.toFixed(0)}% (실투 많음)</span>`);
      else if(d.midPct < 8 && d.n >= 15) coursePart.push(`<span style="color:#39ff8a">실투 적음 ${d.midPct.toFixed(0)}%</span>`);
      
      // ─ 결과 ─
      const resultParts = [];
      if(d.ab >= 5){
        let baLabel = '';
        if(d.ba < 0.200) baLabel = ' <span style="color:#39ff8a">(매우 우수)</span>';
        else if(d.ba < 0.250) baLabel = ' <span style="color:#88ccff">(우수)</span>';
        else if(d.ba > 0.330) baLabel = ' <span style="color:#ff4560">(피격 많음)</span>';
        resultParts.push(`피안타율 <b>${fmt3(d.ba)}</b>${baLabel}`);
      }
      if(d.swings >= 10){
        let whLabel = '';
        if(d.whiffPct >= 40) whLabel = ' <span style="color:#39ff8a">(결정구급)</span>';
        else if(d.whiffPct >= 30) whLabel = ' <span style="color:#88ccff">(우수)</span>';
        else if(d.whiffPct < 18) whLabel = ' <span style="color:#ff8c44">(낮음)</span>';
        resultParts.push(`헛스윙 <b>${d.whiffPct.toFixed(0)}%</b>${whLabel}`);
      }
      if(d.hr > 0){
        resultParts.push(`<span style="color:#ff4560">피HR ${d.hr}</span>`);
      }
      
      // ─ 좌타/우타 매치업 디테일 ─
      const lrParts = [];
      if(d.vsL.n >= 10){
        let lLine = `<b>vs 좌타</b> ${d.vsL.n}구 (${d.vsLPct.toFixed(0)}%):`;
        if(d.vsL.ab >= 4){
          lLine += ` 피안타 <b>${fmt3(d.vsL.ba)}</b> (${d.vsL.hits}/${d.vsL.ab})`;
        }
        if(d.vsL.swings >= 5){
          lLine += ` · 헛스윙 ${d.vsL.whiffPct.toFixed(0)}%`;
        }
        // 좌타 상대 어느 코스로 던지나
        const lc = d.vsL.course;
        const lcTotal = lc.inn + lc.out + lc.midZone + lc.outZone;
        if(lcTotal >= 10){
          const locParts = [];
          if(lc.inn / lcTotal >= 0.40) locParts.push(`<b>몸쪽 ${(lc.inn/lcTotal*100).toFixed(0)}%</b>`);
          else if(lc.out / lcTotal >= 0.40) locParts.push(`<b>바깥쪽 ${(lc.out/lcTotal*100).toFixed(0)}%</b>`);
          if(lc.high / lcTotal >= 0.40) locParts.push(`<b>높은 공 ${(lc.high/lcTotal*100).toFixed(0)}%</b>`);
          else if(lc.low / lcTotal >= 0.40) locParts.push(`<b>낮은 공 ${(lc.low/lcTotal*100).toFixed(0)}%</b>`);
          if(locParts.length) lLine += `<br><span style="color:var(--muted);margin-left:8px">→ 좌타엔 ${locParts.join(', ')} 로 던짐</span>`;
        }
        lrParts.push(lLine);
      }
      if(d.vsR.n >= 10){
        let rLine = `<b>vs 우타</b> ${d.vsR.n}구 (${d.vsRPct.toFixed(0)}%):`;
        if(d.vsR.ab >= 4){
          rLine += ` 피안타 <b>${fmt3(d.vsR.ba)}</b> (${d.vsR.hits}/${d.vsR.ab})`;
        }
        if(d.vsR.swings >= 5){
          rLine += ` · 헛스윙 ${d.vsR.whiffPct.toFixed(0)}%`;
        }
        const rc = d.vsR.course;
        const rcTotal = rc.inn + rc.out + rc.midZone + rc.outZone;
        if(rcTotal >= 10){
          const locParts = [];
          if(rc.inn / rcTotal >= 0.40) locParts.push(`<b>몸쪽 ${(rc.inn/rcTotal*100).toFixed(0)}%</b>`);
          else if(rc.out / rcTotal >= 0.40) locParts.push(`<b>바깥쪽 ${(rc.out/rcTotal*100).toFixed(0)}%</b>`);
          if(rc.high / rcTotal >= 0.40) locParts.push(`<b>높은 공 ${(rc.high/rcTotal*100).toFixed(0)}%</b>`);
          else if(rc.low / rcTotal >= 0.40) locParts.push(`<b>낮은 공 ${(rc.low/rcTotal*100).toFixed(0)}%</b>`);
          if(locParts.length) rLine += `<br><span style="color:var(--muted);margin-left:8px">→ 우타엔 ${locParts.join(', ')} 로 던짐</span>`;
        }
        lrParts.push(rLine);
      }
      // 좌우 효과 비교
      if(d.vsL.ab >= 4 && d.vsR.ab >= 4){
        const lbR = d.vsL.ba - d.vsR.ba;
        if(Math.abs(lbR) >= 0.080){
          const weakAt = lbR > 0 ? '좌타' : '우타';
          lrParts.push(`<b style="color:#ff4560">⚠️ ${weakAt} 상대 약점</b> (vs좌 ${fmt3(d.vsL.ba)} vs우 ${fmt3(d.vsR.ba)}, 차이 ${(Math.abs(lbR)*1000).toFixed(0)})`);
        }
      }
      
      // ─ 카운트 활용 ─
      const ctPart = [];
      const usage2K = data.twoStrikeByGroup[g] || 0;
      const total2K = Object.values(data.twoStrikeByGroup).reduce((s,v)=>s+v, 0);
      const usageFP = data.firstPitchByGroup[g] || 0;
      const totalFP = Object.values(data.firstPitchByGroup).reduce((s,v)=>s+v, 0);
      if(total2K >= 10 && usage2K/total2K >= 0.35){
        ctPart.push(`<b>결정구 (2스트라이크 ${(usage2K/total2K*100).toFixed(0)}%)</b>`);
      }
      if(totalFP >= 10 && usageFP/totalFP >= 0.40){
        ctPart.push(`<b>초구 ${(usageFP/totalFP*100).toFixed(0)}%</b>`);
      }
      
      let line = parts.join(' ') + '<br>';
      if(spdParts.length || movParts.length) line += `<span style="color:var(--muted);font-size:11px">⚡ ${spdParts.join(' · ')}${spdParts.length && movParts.length?' / ':''}${movParts.join(' · ')}</span><br>`;
      if(usagePart.length) line += `<span style="color:var(--muted);font-size:11px">🎯 ${usagePart.join(' · ')}</span><br>`;
      if(coursePart.length) line += `<span style="color:var(--muted);font-size:11px">📍 ${coursePart.join(' · ')}</span><br>`;
      if(resultParts.length) line += `<span style="color:var(--muted);font-size:11px">📊 ${resultParts.join(' · ')}</span>`;
      if(lrParts.length) line += `<br><span style="color:var(--muted);font-size:11px">🆚 ${lrParts.join('<br>🆚 ')}</span>`;
      if(ctPart.length) line += `<br><span style="color:var(--muted);font-size:11px">🎬 ${ctPart.join(' · ')}</span>`;
      
      patterns.push(line);
    });
  }
  
  // ─ 좌타/우타 상대 별 레퍼토리 분리 ─
  const lrPatterns = [];
  
  // 좌타 상대 구종 분포
  if(data.splits.vsL.n >= 30){
    const vsLByGroup = {};
    let vsLTot = 0;
    Object.entries(data.groupDetails).forEach(([g, d]) => {
      if(d.vsL.n > 0){
        vsLByGroup[g] = d.vsL.n;
        vsLTot += d.vsL.n;
      }
    });
    const sortedL = Object.entries(vsLByGroup).sort((a,b)=>b[1]-a[1]);
    if(sortedL.length && vsLTot >= 20){
      let lLine = `<b>🆚 좌타 상대 (${vsLTot}구)</b>: `;
      lLine += sortedL.slice(0, 4).map(([g, n]) => `${g} <b>${(n/vsLTot*100).toFixed(0)}%</b>`).join(' · ');
      // 결과
      lLine += `<br><span style="color:var(--muted);font-size:11px">피안타율 ${fmt3(data.splits.vsL.ba)} (${data.splits.vsL.hits}/${data.splits.vsL.ab}) · 헛스윙 ${data.splits.vsL.whiffPct.toFixed(0)}%${data.splits.vsL.hr>0?' · HR '+data.splits.vsL.hr:''}</span>`;
      // 좌타 상대 코스 패턴 종합
      const lcCombined = {high:0, low:0, mid:0, inn:0, out:0, midZ:0, outZone:0, total:0};
      Object.values(data.groupDetails).forEach(d => {
        if(!d.vsL.course) return;
        const c = d.vsL.course;
        lcCombined.high += c.high;
        lcCombined.low += c.low;
        lcCombined.mid += c.mid;
        lcCombined.inn += c.inn;
        lcCombined.out += c.out;
        lcCombined.midZ += c.midZone;
        lcCombined.outZone += c.outZone;
        lcCombined.total += d.vsL.n;
      });
      if(lcCombined.total >= 20){
        const coursePatterns = [];
        const inZTot = lcCombined.high + lcCombined.low + lcCombined.mid;
        if(inZTot >= 10){
          if(lcCombined.high / inZTot >= 0.45) coursePatterns.push(`높은 공 ${(lcCombined.high/inZTot*100).toFixed(0)}%`);
          else if(lcCombined.low / inZTot >= 0.45) coursePatterns.push(`낮은 공 ${(lcCombined.low/inZTot*100).toFixed(0)}%`);
          if(lcCombined.inn / inZTot >= 0.40) coursePatterns.push(`몸쪽 ${(lcCombined.inn/inZTot*100).toFixed(0)}%`);
          else if(lcCombined.out / inZTot >= 0.40) coursePatterns.push(`바깥쪽 ${(lcCombined.out/inZTot*100).toFixed(0)}%`);
        }
        if(coursePatterns.length){
          lLine += `<br><span style="color:var(--muted);font-size:11px">→ 코스 경향: ${coursePatterns.join(', ')} 위주</span>`;
        }
      }
      lrPatterns.push(lLine);
    }
  }
  
  // 우타 상대
  if(data.splits.vsR.n >= 30){
    const vsRByGroup = {};
    let vsRTot = 0;
    Object.entries(data.groupDetails).forEach(([g, d]) => {
      if(d.vsR.n > 0){
        vsRByGroup[g] = d.vsR.n;
        vsRTot += d.vsR.n;
      }
    });
    const sortedR = Object.entries(vsRByGroup).sort((a,b)=>b[1]-a[1]);
    if(sortedR.length && vsRTot >= 20){
      let rLine = `<b>🆚 우타 상대 (${vsRTot}구)</b>: `;
      rLine += sortedR.slice(0, 4).map(([g, n]) => `${g} <b>${(n/vsRTot*100).toFixed(0)}%</b>`).join(' · ');
      rLine += `<br><span style="color:var(--muted);font-size:11px">피안타율 ${fmt3(data.splits.vsR.ba)} (${data.splits.vsR.hits}/${data.splits.vsR.ab}) · 헛스윙 ${data.splits.vsR.whiffPct.toFixed(0)}%${data.splits.vsR.hr>0?' · HR '+data.splits.vsR.hr:''}</span>`;
      const rcCombined = {high:0, low:0, mid:0, inn:0, out:0, midZ:0, outZone:0, total:0};
      Object.values(data.groupDetails).forEach(d => {
        if(!d.vsR.course) return;
        const c = d.vsR.course;
        rcCombined.high += c.high;
        rcCombined.low += c.low;
        rcCombined.mid += c.mid;
        rcCombined.inn += c.inn;
        rcCombined.out += c.out;
        rcCombined.midZ += c.midZone;
        rcCombined.outZone += c.outZone;
        rcCombined.total += d.vsR.n;
      });
      if(rcCombined.total >= 20){
        const coursePatterns = [];
        const inZTot = rcCombined.high + rcCombined.low + rcCombined.mid;
        if(inZTot >= 10){
          if(rcCombined.high / inZTot >= 0.45) coursePatterns.push(`높은 공 ${(rcCombined.high/inZTot*100).toFixed(0)}%`);
          else if(rcCombined.low / inZTot >= 0.45) coursePatterns.push(`낮은 공 ${(rcCombined.low/inZTot*100).toFixed(0)}%`);
          if(rcCombined.inn / inZTot >= 0.40) coursePatterns.push(`몸쪽 ${(rcCombined.inn/inZTot*100).toFixed(0)}%`);
          else if(rcCombined.out / inZTot >= 0.40) coursePatterns.push(`바깥쪽 ${(rcCombined.out/inZTot*100).toFixed(0)}%`);
        }
        if(coursePatterns.length){
          rLine += `<br><span style="color:var(--muted);font-size:11px">→ 코스 경향: ${coursePatterns.join(', ')} 위주</span>`;
        }
      }
      lrPatterns.push(rLine);
    }
  }
  
  // 좌우 비교
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    // 좌/우에 다른 무기 사용
    const diffPitches = [];
    Object.entries(data.groupDetails).forEach(([g, d]) => {
      if(d.vsL.n < 5 && d.vsR.n < 5) return;
      const lPctOfL = data.splits.vsL.n > 0 ? d.vsL.n / data.splits.vsL.n * 100 : 0;
      const rPctOfR = data.splits.vsR.n > 0 ? d.vsR.n / data.splits.vsR.n * 100 : 0;
      if(Math.abs(lPctOfL - rPctOfR) >= 12){
        diffPitches.push({g, l:lPctOfL, r:rPctOfR});
      }
    });
    if(diffPitches.length){
      let cmpLine = `<b>좌우별 다른 레퍼토리</b>:`;
      diffPitches.sort((a,b) => Math.abs(b.l-b.r) - Math.abs(a.l-a.r)).slice(0, 3).forEach(p => {
        const more = p.l > p.r ? '좌타' : '우타';
        cmpLine += `<br><span style="color:var(--muted);font-size:11px">→ ${p.g}: 좌타 ${p.l.toFixed(0)}% / 우타 ${p.r.toFixed(0)}% (${more}에 더 자주)</span>`;
      });
      lrPatterns.push(cmpLine);
    }
  }
  
  if(lrPatterns.length) patterns.push(...lrPatterns);
  
  // ─ 카운트별 시퀀싱 패턴 ─
  // 카운트별 구종 분포 (0-0, 1-0, 0-1, 1-1, 2-1, 1-2, 2-2, 3-2)
  const countSequences = {};
  wbdContext.getPitcherDataByName(data.name).forEach(d => {
    const cnt = `${+d.ball}-${+d.strk}`;
    if(!countSequences[cnt]) countSequences[cnt] = [];
    const g = wbdContext.pitchGroup(d.pType, d);
    if(!g || g === '기타') return;
    countSequences[cnt].push(g);
  });
  
  const seqPatterns = [];
  // 주요 카운트만
  const keyCounts = [
    {k:'0-0', label:'초구 (0-0)'},
    {k:'1-0', label:'타자 유리 (1-0)'},
    {k:'0-1', label:'투수 유리 (0-1)'},
    {k:'1-1', label:'평카운트 (1-1)'},
    {k:'2-1', label:'유리한 2-1'},
    {k:'1-2', label:'결정 (1-2)'},
    {k:'2-2', label:'결정 (2-2)'},
    {k:'3-2', label:'풀카운트 (3-2)'}
  ];
  
  const seqLines = [];
  keyCounts.forEach(c => {
    const arr = countSequences[c.k];
    if(!arr || arr.length < 8) return;
    const dist = {};
    arr.forEach(g => { dist[g] = (dist[g]||0) + 1; });
    const sorted = Object.entries(dist).sort((a,b)=>b[1]-a[1]);
    const top = sorted[0];
    const topPct = top[1] / arr.length * 100;
    if(topPct >= 50){
      seqLines.push(`<b>${c.label}</b>: <b style="color:#88ccff">${top[0]}</b> ${topPct.toFixed(0)}% (${top[1]}/${arr.length}구) — 강한 경향`);
    } else if(sorted.length >= 2){
      const top2 = sorted[1];
      const top2Pct = top2[1] / arr.length * 100;
      seqLines.push(`<b>${c.label}</b>: ${top[0]} ${topPct.toFixed(0)}% / ${top2[0]} ${top2Pct.toFixed(0)}% (총 ${arr.length}구)`);
    }
  });
  
  if(seqLines.length){
    let seqHTML = `<b>🎬 카운트별 구종 선택</b><br><span style="color:var(--muted);font-size:11px">`;
    seqHTML += seqLines.join('<br>');
    seqHTML += '</span>';
    patterns.push(seqHTML);
  }
  
  if(data.firstPitchN >= 20){
    const fpsLabel = data.firstPitchStrikePct >= 65 ? '<span style="color:#39ff8a">공격형 (적극 카운트 잡기)</span>'
      : data.firstPitchStrikePct >= 55 ? '<span style="color:#88ccff">균형형</span>'
      : '<span style="color:#ff8c44">관망형 (카운트 양보 잦음)</span>';
    let firstPitchLine = `<b>초구 스타일</b>: 초구 스트라이크율 ${data.firstPitchStrikePct.toFixed(0)}% — ${fpsLabel}`;
    
    if(data.oneZeroN >= 10){
      firstPitchLine += `<br><span style="color:var(--muted);font-size:11px">1-0 카운트에서 다음 공 스트라이크율 ${data.oneZeroStrikePct.toFixed(0)}%`;
      if(data.oneZeroStrikePct >= 65) firstPitchLine += ' — 떨어진 카운트도 빠르게 복구';
      else if(data.oneZeroStrikePct < 50) firstPitchLine += ' — 1-0 뒤 더 떨어지기 쉬움';
      firstPitchLine += '</span>';
    }
    patterns.push(firstPitchLine);
  }
  
  const zu = data.zoneUsage;
  const totZ = zu.high + zu.mid + zu.low;
  if(totZ > 30){
    const highPct = zu.high/totZ*100, midPct = zu.mid/totZ*100, lowPct = zu.low/totZ*100;
    const inZPct = zu.inZone/(zu.inZone+zu.outZone)*100;
    let zoneStyle, zoneAdvice;
    if(highPct >= 45){
      zoneStyle = '<b style="color:#88ccff">하이볼 위주</b>';
      zoneAdvice = '높은 공 적극 노리되, 헛스윙 유도 가능';
    } else if(lowPct >= 45){
      zoneStyle = '<b style="color:#39ff8a">로우볼 위주</b>';
      zoneAdvice = '낮은 공 위주 — 변화구 떨어지는 거 주의';
    } else {
      zoneStyle = '<b>존 전반 활용</b>';
      zoneAdvice = '특정 코스 편향 없음';
    }
    let line = `<b>존 활용</b>: ${zoneStyle} (높 ${highPct.toFixed(0)}% · 중 ${midPct.toFixed(0)}% · 낮 ${lowPct.toFixed(0)}%)`;
    line += `<br><span style="color:var(--muted);font-size:11px">인존 ${inZPct.toFixed(0)}% / 아웃존 ${(100-inZPct).toFixed(0)}% — ${zoneAdvice}</span>`;
    patterns.push(line);
  }
  
  if(data.midN >= 10){
    let midDangerLabel;
    if(data.midHardHitRate >= 30) midDangerLabel = '<span style="color:#ff4560">매우 위험 (한방 가능)</span>';
    else if(data.midHardHitRate >= 20) midDangerLabel = '<span style="color:#ff8c44">위험</span>';
    else midDangerLabel = '<span style="color:#88ccff">평균</span>';
    
    let mLabel;
    if(data.midPitchPct >= 15) mLabel = '<span style="color:#ff4560">실투 많음</span>';
    else if(data.midPitchPct >= 10) mLabel = '실투 보통';
    else mLabel = '<span style="color:#39ff8a">실투 적음 (정밀 제구)</span>';
    
    patterns.push(`<b>실투 패턴</b>: 한가운데 칸 비율 ${data.midPitchPct.toFixed(1)}% — ${mLabel}<br><span style="color:var(--muted);font-size:11px">실투 시 피안타율 ${fmt3(data.midHitRate/100)} · 하드힛 ${data.midHardHitRate.toFixed(0)}% (${midDangerLabel})</span>`);
  }
  
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const lba = data.splits.vsL.ba, rba = data.splits.vsR.ba;
    const lwh = data.splits.vsL.whiffPct, rwh = data.splits.vsR.whiffPct;
    let line = `<b>좌우 매치업</b>: vs좌타 ${fmt3(lba)} (${data.splits.vsL.hits}/${data.splits.vsL.ab}) · vs우타 ${fmt3(rba)} (${data.splits.vsR.hits}/${data.splits.vsR.ab})`;
    if(Math.abs(lba - rba) >= 0.060){
      const weakSide = lba > rba ? '좌타' : '우타';
      const diff = Math.abs(lba - rba) * 1000;
      line += `<br><span style="color:#ff4560;font-size:11px">⚠ ${weakSide} 상대 +${diff.toFixed(0)} 약점 — ${weakSide} 라인업 집중 공략 효과적</span>`;
    } else {
      line += `<br><span style="color:var(--muted);font-size:11px">좌우 편차 작음 (균형형)</span>`;
    }
    line += `<br><span style="color:var(--muted);font-size:11px">헛스윙: 좌타 ${lwh.toFixed(0)}% / 우타 ${rwh.toFixed(0)}%</span>`;
    patterns.push(line);
  }
  
  sections.push({title:'🎯 투구 패턴 상세 분석', color:'#ff8c44', items:patterns});
  
  // ───────────────────────────────────────
  // 3. 강점 (raw 기반)
  // ───────────────────────────────────────
  //   강점 (V9.7 WBD 환경 보정)
  //   WBD 실측 백분위 (n=13~14):
  //     BA: p10=.154, p25=.275 (안타 별로 안 맞음 = 좋음)
  //     헛스윙%: p75=40.6, p90=50
  //     평균EV: p10=96.7, p25=99.0 (V11.1 305경기·투수 82명 인플레이 재실측)
  //     하드힛%: p10=31.9, p25=35.6 (V11.1 재실측)
  //     BB%: p10=0, p25=0 (BB% 0이 흔함)
  // ───────────────────────────────────────
  const strengths = [];
  const weaknesses = [];
  
  if(data.overall.ba < 0.280 && data.overall.ab >= 30){
    strengths.push(`<b>⚾ 압도적 피안타율 ${fmt3(data.overall.ba)}</b> (${data.overall.hits}/${data.overall.ab}) — 평균 ${fmt3(lg.pitcherBA)} 대비 매우 낮음. 안타 거의 안 맞음.`);
  }
  
  const totalSw = data.overall.swings;
  if(totalSw >= 50){
    const ovWhiff = data.overall.whiffPct;
    if(ovWhiff >= 40){
      strengths.push(`<b>❌ 강력한 헛스윙 유도 ${ovWhiff.toFixed(1)}%</b> — 평균 ${lg.pitcherWhiff.toFixed(1)}% 대비 매우 우수.`);
    }
  }
  
  if(data.overall.avgEV > 0 && data.overall.avgEV < 99){
    strengths.push(`<b>🛡️ 피EV 낮음 ${data.overall.avgEV.toFixed(1)}mph</b> — 약한 타구 위주 허용. 빅이닝 위험 적음.`);
  }
  
  if(data.overall.hardPct > 0 && data.overall.hardPct < 35){
    strengths.push(`<b>🛡️ 하드힛 허용 ${data.overall.hardPct.toFixed(1)}%</b> — 강한 타구 거의 안 줌.`);
  }
  
  if(data.splits.vsL.n >= 30 && data.splits.vsL.ba < 0.260){
    strengths.push(`<b>🆚 좌타 봉쇄 ${fmt3(data.splits.vsL.ba)}</b> (${data.splits.vsL.hits}/${data.splits.vsL.ab}). 좌타 라인업 잠재울 수 있음.`);
  }
  if(data.splits.vsR.n >= 30 && data.splits.vsR.ba < 0.260){
    strengths.push(`<b>🆚 우타 봉쇄 ${fmt3(data.splits.vsR.ba)}</b> (${data.splits.vsR.hits}/${data.splits.vsR.ab}). 우타 라인업 잠재울 수 있음.`);
  }
  
  if(data.firstPitchN >= 20 && data.firstPitchStrikePct >= 75){
    strengths.push(`<b>🎯 초구 스트라이크 ${data.firstPitchStrikePct.toFixed(1)}%</b> — 거의 항상 0-1로 카운트 잡기 시작.`);
  }
  
  if(data.bbPct < 1.5){
    strengths.push(`<b>🎯 제구력 우수</b> — 볼넷 비율 ${data.bbPct.toFixed(1)}% (${data.bb}BB). 공짜 출루 거의 없음.`);
  }
  
  if(data.midN >= 10 && data.midPitchPct <= 5){
    strengths.push(`<b>🎯 실투 적음</b> — 한가운데 비율 ${data.midPitchPct.toFixed(1)}%. 위험한 공 잘 안 나옴.`);
  }
  
  if(data.gameVariability != null && data.gameVariability < 0.080 && data.games >= 5){
    strengths.push(`<b>📊 매우 안정적인 운영</b> — 경기별 피안타율 편차 σ${data.gameVariability.toFixed(3)} (망경기 ${data.badGames}회). 매 경기 일정한 성적.`);
  }
  
  // 구종별 PV/xPV 분석 (가장 가치 있는 구종 / 부진 구종 + 운/실력 분리)
  const groupsWithPV = Object.entries(data.groupDetails)
    .filter(([g, d]) => d.n >= 10 && d.pv != null)
    .map(([g, d]) => ({g, ...d}))
    .sort((a, b) => b.pv - a.pv);
  
  if(groupsWithPV.length > 0){
    const top = groupsWithPV[0];
    if(top.pv >= 12){
      strengths.push(`<b>⚖️ ${top.g} 구종 가치 +${top.pv.toFixed(1)}</b> (${top.n}구) — CRV 누적 실점 절감 <b style="color:#39ff8a">엘리트급</b>. 이 구종으로 점수 막아내는 능력 최상위.`);
    } else if(top.pv >= 5){
      strengths.push(`<b>⚖️ ${top.g} 구종 가치 +${top.pv.toFixed(1)}</b> (${top.n}구) — 플러스급. 주력 결정구.`);
    }
    
    // 기대 가치 (xPV) 분석 - 운/실력 분리
    Object.entries(data.groupDetails).forEach(([g, d]) => {
      if(d.n < 15 || d.xpv == null) return;
      const gap = d.pv - d.xpv;  // PV가 xPV보다 높으면 운 좋음
      // 진짜 좋은 공 (xPV 높음): 결과 안 좋아도 좋은 공
      if(d.xpv >= 10 && d.pv < d.xpv - 5){
        strengths.push(`<b>🎯 ${g} 진짜 위력 (xPV +${d.xpv.toFixed(1)})</b> — 실제 결과(PV +${d.pv.toFixed(1)})는 운 나쁨. 타구질 보면 매우 좋은 공. 향후 개선 기대.`);
      }
      // 결과 좋은데 xPV 낮음: 운 좋음 (BABIP luck)
      if(d.pv >= 8 && d.xpv < d.pv - 5){
        weaknesses.push(`<b>🍀 ${g} 운 좋음 (PV +${d.pv.toFixed(1)} vs xPV +${d.xpv.toFixed(1)})</b> — 타구질은 평범한데 결과 좋게 나옴. 회귀 위험.`);
      }
    });
    
    // 100구 정규화 기준 효율
    const eff = groupsWithPV.filter(d => d.n >= 15).sort((a, b) => b.pv100 - a.pv100);
    if(eff.length > 0 && eff[0].pv100 >= 4.5 && eff[0].g !== top.g){
      strengths.push(`<b>📊 ${eff[0].g} 구종 효율</b> — PV/100 +${eff[0].pv100.toFixed(1)} (${eff[0].n}구). 적게 던지지만 효율 매우 높음.`);
    }
  }
  
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.swings < 15) return;
    if(d.whiffPct >= 45){
      strengths.push(`<b>🌀 ${g} 결정구</b> — 헛스윙률 <b style="color:#ff4560">${d.whiffPct.toFixed(0)}%</b>. 매우 효과적.`);
    }
    if(d.ab >= 10 && d.ba < 0.240){
      strengths.push(`<b>⚾ ${g} 봉쇄력</b> — 피안타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 거의 안 맞음.`);
    }
  });
  
  if(data.splits.adv.n >= 30 && data.splits.adv.ba < 0.230){
    strengths.push(`<b>💀 유리 카운트 완벽 마무리</b> — 피안타율 ${fmt3(data.splits.adv.ba)}. 0-1, 0-2만 만들면 거의 잡음.`);
  }
  
  if(!strengths.length){
    strengths.push('데이터상 두드러진 강점이 없는 평범한 투수. 약점 위주로 공략 가능.');
  }
  
  sections.push({title:'💪 강점', color:'#39ff8a', items:strengths});
  
  // ───────────────────────────────────────
  // 4. 약점 (V9.7 WBD 환경 보정)
  // ───────────────────────────────────────
  //   WBD 실측 백분위 (n=13~14):
  //     BA(피안타율): p50=.385, p75=.500, p90=.538
  //     헛스윙%: p25=23.8, p50=29.6
  //     평균EV: p75=102.7, p90=105.3 (V11.1 305경기·투수 82명 인플레이 재실측)
  //     하드힛%: p50=39.2, p75=42.9 (V11.1 재실측)
  //     BB%: p75=3.7, p90=4.76
  // ───────────────────────────────────────
  if(data.overall.ba > 0.450 && data.overall.ab >= 30){
    weaknesses.push(`<b>⚾ 피안타율 ${fmt3(data.overall.ba)} 높음</b> — 평균 ${fmt3(lg.pitcherBA)} 대비 안타 잘 맞음.`);
  }
  
  if(totalSw >= 50 && data.overall.whiffPct < 24){
    weaknesses.push(`<b>❌ 헛스윙 유도 부족 ${data.overall.whiffPct.toFixed(1)}%</b> — 평균 ${lg.pitcherWhiff.toFixed(1)}% 대비 낮음.`);
  }
  
  if(data.overall.avgEV >= 103){
    weaknesses.push(`<b>🔨 피EV ${data.overall.avgEV.toFixed(1)}mph 높음</b> — 강한 타구 자주 허용. 장타·홈런 위험.`);
  }
  
  if(data.overall.hardPct >= 43){
    weaknesses.push(`<b>🔨 하드힛 허용 ${data.overall.hardPct.toFixed(1)}%</b> — 강한 타구 비율 높음.`);
  }
  
  if(data.splits.vsL.n >= 30 && data.splits.vsL.ba >= 0.420){
    weaknesses.push(`<b>⚠️ 좌타 약점 ${fmt3(data.splits.vsL.ba)}</b> (${data.splits.vsL.hits}/${data.splits.vsL.ab}, HR ${data.splits.vsL.hr}). 좌타 라인업 집중 공략.`);
  }
  if(data.splits.vsR.n >= 30 && data.splits.vsR.ba >= 0.420){
    weaknesses.push(`<b>⚠️ 우타 약점 ${fmt3(data.splits.vsR.ba)}</b> (${data.splits.vsR.hits}/${data.splits.vsR.ab}, HR ${data.splits.vsR.hr}). 우타 라인업 집중 공략.`);
  }
  
  if(data.splits.dis.n >= 30){
    if(data.splits.dis.ba >= 0.450){
      weaknesses.push(`<b>🚨 불리 카운트 위기 ${fmt3(data.splits.dis.ba)}</b> — 1-0, 2-0 만들면 안타 쏟아짐.`);
    }
    if(data.splits.dis.hr >= 3){
      weaknesses.push(`<b>💥 불리 카운트 피HR ${data.splits.dis.hr}</b> — 한방 위험.`);
    }
  }
  
  if(data.firstPitchN >= 20 && data.firstPitchStrikePct < 50){
    weaknesses.push(`<b>📉 초구 스트라이크 ${data.firstPitchStrikePct.toFixed(1)}%</b> — 카운트 양보 잦음.`);
  }
  
  if(data.bbPct >= 5){
    weaknesses.push(`<b>💢 볼넷 ${data.bbPct.toFixed(1)}%</b> (${data.bb}BB) — 공짜 출루 잦음. 인내심 가지면 출루 가능.`);
  }
  
  if(data.midN >= 10 && data.midPitchPct >= 12){
    let dangerNote = '';
    if(data.midHardHitRate >= 25) dangerNote = ` · 하드힛율 <b style="color:#ff4560">${data.midHardHitRate.toFixed(0)}%</b>`;
    weaknesses.push(`<b>💢 실투 ${data.midPitchPct.toFixed(1)}%</b> — 피안타율 ${fmt3(data.midHitRate/100)}${dangerNote}. 노리면 큰 타구 가능.`);
  }
  
  if(data.gameVariability != null && data.gameVariability >= 0.150){
    weaknesses.push(`<b>📉 기복 큼</b> — σ${data.gameVariability.toFixed(3)} · 망경기 ${data.badGames}회. 격차 큼.`);
  }
  
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.ab >= 8 && d.ba >= 0.330){
      let extra = '';
      if(d.hr > 0) extra = ` · HR ${d.hr}`;
      weaknesses.push(`<b>⚾ ${g} 피격 ${fmt3(d.ba)}</b> (${d.hits}/${d.ab})${extra} — 이 공 만나면 자주 안타.`);
    }
    if(d.n >= 15 && d.midPct >= 25){
      weaknesses.push(`<b>💢 ${g} 실투 ${d.midPct.toFixed(0)}%</b> — 가운데로 자주 몰림.`);
    }
  });
  
  // 부진 구종 (PV 음수)
  const badPV = Object.entries(data.groupDetails)
    .filter(([g, d]) => d.n >= 15 && d.pv != null && d.pv <= -8)
    .map(([g, d]) => ({g, ...d}))
    .sort((a, b) => a.pv - b.pv);
  if(badPV.length > 0){
    const worst = badPV[0];
    weaknesses.push(`<b>⚖️ ${worst.g} 구종 가치 ${worst.pv.toFixed(1)}</b> (${worst.n}구) — 이 공 던질 때 실점 누적. <b style="color:#ff4560">집중 공략 포인트</b>.`);
  }
  
  const zoneLabels = wbdContext.zoneCourseLabels('R');  // V10.1: 우타 기준 코스명 통일 (좌타+우타 합산 통계)
  const totalHits = data.zoneStats.reduce((s,z)=>s+z.hits, 0);
  if(totalHits >= 5){
    const worstZones = data.zoneStats
      .map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0}))
      .filter(z => z.n >= 8 && z.hitRate >= 30)
      .sort((a,b) => b.hitRate - a.hitRate)
      .slice(0, 2);
    worstZones.forEach(z => {
      const hrNote = z.hr > 0 ? ` (HR ${z.hr})` : '';
      const brlNote = z.brl >= 3 ? ` · 배럴 ${z.brl}` : '';
      weaknesses.push(`<b>🎯 ${zoneLabels[z.i]} 존 <span style="font-size:10px;color:var(--muted)">(우타 기준)</span></b> — ${z.n}구 중 피안타 ${z.hits}개 (<b style="color:#ff4560">${z.hitRate.toFixed(0)}%</b>)${hrNote}${brlNote}.`);
    });
  }
  
  if(!weaknesses.length){
    weaknesses.push('데이터상 두드러진 약점 없음. 정공법 접근 필요.');
  }
  
  sections.push({title:'🪤 약점 / 공략 포인트', color:'#ff4560', items:weaknesses});
  
  // ───────────────────────────────────────
  // 5. 핵심 공략 전략
  // ───────────────────────────────────────
  const strategy = [];
  
  if(data.splits.vsL.n >= 30 && data.splits.vsR.n >= 30){
    const lba = data.splits.vsL.ba, rba = data.splits.vsR.ba;
    if(lba > rba + 0.060){
      strategy.push(`<b>좌타 위주 라인업 구성</b>. 좌타 ${fmt3(lba)} vs 우타 ${fmt3(rba)} (차이 +${((lba-rba)*1000).toFixed(0)}). 좌타 핵심 선수들을 상위 타순에. 우타는 하위로.`);
    } else if(rba > lba + 0.060){
      strategy.push(`<b>우타 위주 라인업 구성</b>. 우타 ${fmt3(rba)} vs 좌타 ${fmt3(lba)} (차이 +${((rba-lba)*1000).toFixed(0)}). 우타 핵심 선수들을 상위 타순에.`);
    }
  }
  
  if(data.splits.adv.n >= 30 && data.splits.dis.n >= 30){
    const advBA = data.splits.adv.ba, disBA = data.splits.dis.ba;
    if(disBA - advBA >= 0.080){
      let advLine = `<b>카운트 절대 빼앗기지 마라</b>. 유리 ${fmt3(advBA)} vs 불리 <b style="color:#39ff8a">${fmt3(disBA)}</b> (차이 +${((disBA-advBA)*1000).toFixed(0)}).`;
      advLine += ` 초구·2구 노릴 공이면 적극 풀스윙. 0-1로 끌려가면 거의 잡힘.`;
      strategy.push(advLine);
    }
    if(data.splits.adv.whiffPct - data.splits.dis.whiffPct >= 15){
      strategy.push(`<b>2스트라이크 무조건 피하라</b>. 유리시 헛스윙 ${data.splits.adv.whiffPct.toFixed(0)}% vs 불리시 ${data.splits.dis.whiffPct.toFixed(0)}%. 컷팅으로 풀카운트까지.`);
    }
  }
  
  const sortedDec = Object.entries(data.twoStrikeByGroup).sort((a,b)=>b[1]-a[1]);
  if(sortedDec.length){
    const total2K = Object.values(data.twoStrikeByGroup).reduce((s,v)=>s+v,0);
    const [decG, decN] = sortedDec[0];
    const pct = decN/total2K*100;
    if(pct >= 40 && total2K >= 15){
      const decD = data.groupDetails[decG];
      let advice = '';
      let lrAdvice = '';
      if(decD){
        // 기본 advice (인존/유인구성)
        if(decD.chaseRate >= 50){
          advice = `존 밖 ${decG} 절대 따라가지 말 것 (체이스율 ${decD.chaseRate.toFixed(0)}%).`;
        } else if(decD.inZonePct >= 60){
          advice = `${decG}가 인존으로 ${decD.inZonePct.toFixed(0)}% 들어옴 — 노릴 만함.`;
        } else {
          advice = `${decG}를 노릴 준비. 코스만 잘 보면 OK.`;
        }
        // 좌타/우타 별 디테일
        if(decD.vsL.n >= 10 && decD.vsR.n >= 10){
          const lc = decD.vsL.course;
          const rc = decD.vsR.course;
          const lcTot = lc.inn + lc.out + lc.midZone + lc.outZone;
          const rcTot = rc.inn + rc.out + rc.midZone + rc.outZone;
          const lrParts = [];
          if(lcTot >= 10){
            // 좌타 상대 가장 자주 던지는 코스
            const lcDetails = [];
            if(lc.inn / lcTot >= 0.35) lcDetails.push(`<b>몸쪽 ${(lc.inn/lcTot*100).toFixed(0)}%</b>`);
            if(lc.out / lcTot >= 0.35) lcDetails.push(`<b>바깥쪽 ${(lc.out/lcTot*100).toFixed(0)}%</b>`);
            if(lc.low / lcTot >= 0.40) lcDetails.push(`<b>낮은 공 ${(lc.low/lcTot*100).toFixed(0)}%</b>`);
            if(lc.high / lcTot >= 0.40) lcDetails.push(`<b>높은 공 ${(lc.high/lcTot*100).toFixed(0)}%</b>`);
            if(lcDetails.length){
              lrParts.push(`좌타엔 ${lcDetails.join(', ')} 로 던짐 (헛스윙 ${decD.vsL.whiffPct.toFixed(0)}%)`);
            }
          }
          if(rcTot >= 10){
            const rcDetails = [];
            if(rc.inn / rcTot >= 0.35) rcDetails.push(`<b>몸쪽 ${(rc.inn/rcTot*100).toFixed(0)}%</b>`);
            if(rc.out / rcTot >= 0.35) rcDetails.push(`<b>바깥쪽 ${(rc.out/rcTot*100).toFixed(0)}%</b>`);
            if(rc.low / rcTot >= 0.40) rcDetails.push(`<b>낮은 공 ${(rc.low/rcTot*100).toFixed(0)}%</b>`);
            if(rc.high / rcTot >= 0.40) rcDetails.push(`<b>높은 공 ${(rc.high/rcTot*100).toFixed(0)}%</b>`);
            if(rcDetails.length){
              lrParts.push(`우타엔 ${rcDetails.join(', ')} 로 던짐 (헛스윙 ${decD.vsR.whiffPct.toFixed(0)}%)`);
            }
          }
          if(lrParts.length){
            lrAdvice = `<br><span style="font-size:11px;color:var(--muted);margin-left:8px">→ ${lrParts.join('<br>→ ')}</span>`;
          }
        }
      }
      strategy.push(`<b>결정구 ${decG} 대응법</b> — 2스트라이크에서 ${pct.toFixed(0)}% 비율 (${decN}회). ${advice}${lrAdvice}`);
    }
    
    // 2번 결정구도 의미 있으면 추가
    if(sortedDec.length >= 2){
      const [decG2, decN2] = sortedDec[1];
      const pct2 = decN2/total2K*100;
      if(pct2 >= 20 && decN2 >= 8){
        const decD2 = data.groupDetails[decG2];
        if(decD2){
          let adv = `<b>2번 결정구 ${decG2}</b> (2스트라이크 ${pct2.toFixed(0)}%, ${decN2}회). `;
          if(decD2.whiffPct >= 40 && decD2.swings >= 8){
            adv += `헛스윙 ${decD2.whiffPct.toFixed(0)}%로 함정형 — 조심.`;
          } else if(decD2.ab >= 4 && decD2.ba < 0.200){
            adv += `피안타율 ${fmt3(decD2.ba)}로 강력. 결정구로 자주 등장.`;
          } else {
            adv += `${decG2} 사용 비율도 높음 — 예측 가능.`;
          }
          strategy.push(adv);
        }
      }
    }
  }
  
  // ─ 좌우 타자별 구종 사용 차이 (좌타로 나올 때와 우타로 나올 때 다른 무기) ─
  const lrPitchUsage = [];
  Object.entries(data.groupDetails).forEach(([g, d]) => {
    if(d.vsL.n < 10 || d.vsR.n < 10) return;
    const lTotal = data.splits.vsL.n;
    const rTotal = data.splits.vsR.n;
    if(lTotal < 20 || rTotal < 20) return;
    const lUsage = d.vsL.n / lTotal * 100;
    const rUsage = d.vsR.n / rTotal * 100;
    if(Math.abs(lUsage - rUsage) >= 12){
      const moreFor = lUsage > rUsage ? '좌타' : '우타';
      const lessFor = lUsage > rUsage ? '우타' : '좌타';
      lrPitchUsage.push({g, lUsage, rUsage, moreFor, lessFor, d});
    }
  });
  if(lrPitchUsage.length){
    lrPitchUsage.slice(0, 2).forEach(p => {
      let line = `<b>${p.moreFor} 상대 ${p.g} 위주</b> (vs좌 ${p.lUsage.toFixed(0)}% / vs우 ${p.rUsage.toFixed(0)}%).`;
      // 결과
      const targetSide = p.moreFor === '좌타' ? p.d.vsL : p.d.vsR;
      if(targetSide.ab >= 4){
        line += ` ${p.moreFor} 상대 피안타율 ${fmt3(targetSide.ba)} · 헛스윙 ${targetSide.whiffPct.toFixed(0)}%.`;
      }
      // 코스
      const tc = targetSide.course;
      const tcTot = tc.inn + tc.out + tc.midZone + tc.outZone;
      if(tcTot >= 8){
        const courseLabels = [];
        if(tc.inn / tcTot >= 0.40) courseLabels.push(`몸쪽으로 ${(tc.inn/tcTot*100).toFixed(0)}%`);
        if(tc.out / tcTot >= 0.40) courseLabels.push(`바깥쪽으로 ${(tc.out/tcTot*100).toFixed(0)}%`);
        if(tc.low / tcTot >= 0.40) courseLabels.push(`낮게 ${(tc.low/tcTot*100).toFixed(0)}%`);
        if(tc.high / tcTot >= 0.40) courseLabels.push(`높게 ${(tc.high/tcTot*100).toFixed(0)}%`);
        if(courseLabels.length){
          line += ` ${p.moreFor}일 때 ${courseLabels.join(', ')} 던짐.`;
        }
      }
      strategy.push(line);
    });
  }
  
  if(data.midN >= 10 && data.midPitchPct >= 10){
    const midProneGroups = Object.entries(data.groupDetails)
      .filter(([g,d]) => d.n >= 15 && d.midPct >= 18)
      .sort((a,b) => b[1].midPct - a[1].midPct);
    if(midProneGroups.length){
      const [mg, md] = midProneGroups[0];
      let line = `<b>${mg} 실투 노려라</b> — 한가운데 ${md.midPct.toFixed(0)}% 비율로 몰림 (피안타율 ${fmt3(md.ba)}).`;
      if(md.usagePct >= 30) line += ` 사용 ${md.usagePct.toFixed(0)}%로 충분히 만남.`;
      strategy.push(line);
    } else {
      strategy.push(`<b>실투 적극 공략</b> — 전체 ${data.midPitchPct.toFixed(0)}%가 한가운데. 가운데 들어오는 공 절대 놓치지 말 것.`);
    }
  }
  
  const totalHits2 = data.zoneStats.reduce((s,z)=>s+z.hits, 0);
  if(totalHits2 >= 5){
    const bestZone = data.zoneStats
      .map((z,i)=>({i, ...z, hitRate: z.ab>0?z.hits/z.ab*100:0}))
      .filter(z => z.n >= 10)
      .sort((a,b) => b.hitRate - a.hitRate)[0];
    if(bestZone && bestZone.hitRate >= 30){
      const zoneAdvice = [
        '높은 외측 — 외야로 밀어 치기',
        '높은 한가운데 — <b style="color:#ff4560">실투성!</b> 풀스윙 적극',
        '높은 안쪽 — 몸쪽 위. 풀히터 적합',
        '바깥쪽 중간 — 외야 갭으로 밀어쳐서 2루타',
        '<b style="color:#ff4560">한가운데 실투</b> — 풀스윙 무조건',
        '안쪽 중간 — 당겨서 좌측 외야',
        '낮은 외측 — 보통 볼. 인내심',
        '낮은 한가운데 — 라인드라이브 적합',
        '낮은 안쪽 — 몸쪽 낮은. 풀스윙 가능'
      ];
      strategy.push(`<b>약한 존 노리기</b>: ${zoneAdvice[bestZone.i]} (피안타율 ${bestZone.hitRate.toFixed(0)}%).`);
    }
  }
  
  const trapPitches = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.n >= 20 && d.chaseRate >= 50)
    .sort((a,b) => b[1].chaseRate - a[1].chaseRate)
    .slice(0, 2);
  if(trapPitches.length){
    trapPitches.forEach(([g, d]) => {
      let line = `<b>${g} 유인구 함정</b> — 존 밖 체이스율 ${d.chaseRate.toFixed(0)}% (헛스윙 ${d.whiffPct.toFixed(0)}%).`;
      // 좌타/우타별 함정 효과
      if(d.vsL.swings >= 5 && d.vsR.swings >= 5){
        const lwh = d.vsL.whiffPct;
        const rwh = d.vsR.whiffPct;
        if(Math.abs(lwh - rwh) >= 12){
          const moreTrap = lwh > rwh ? '좌타' : '우타';
          line += ` 특히 <b>${moreTrap}</b>에 더 효과적 (좌 ${lwh.toFixed(0)}% / 우 ${rwh.toFixed(0)}%).`;
        }
      }
      // 어느 코스로 빠지는지
      const allCourse = {high:0, low:0, inn:0, out:0};
      if(d.vsL.n >= 5){
        allCourse.high += d.vsL.course.high;
        allCourse.low += d.vsL.course.low;
        allCourse.inn += d.vsL.course.inn;
        allCourse.out += d.vsL.course.out;
      }
      if(d.vsR.n >= 5){
        allCourse.high += d.vsR.course.high;
        allCourse.low += d.vsR.course.low;
        allCourse.inn += d.vsR.course.inn;
        allCourse.out += d.vsR.course.out;
      }
      const courseTot = allCourse.high + allCourse.low + allCourse.inn + allCourse.out;
      if(courseTot >= 10){
        const dominant = [];
        if(allCourse.low / courseTot >= 0.40) dominant.push('낮게');
        if(allCourse.out / courseTot >= 0.40) dominant.push('바깥쪽');
        if(allCourse.high / courseTot >= 0.40) dominant.push('높게');
        if(allCourse.inn / courseTot >= 0.40) dominant.push('몸쪽');
        if(dominant.length){
          line += ` 주로 <b>${dominant.join('+')}</b> 으로 빠뜨림 — 이 코스 절대 안 따라가기.`;
        }
      }
      strategy.push(line);
    });
  }
  
  const targetPitch = Object.entries(data.groupDetails)
    .filter(([g,d]) => d.ab >= 8 && d.usagePct >= 10)
    .sort((a,b) => b[1].ba - a[1].ba)[0];
  if(targetPitch && targetPitch[1].ba >= 0.300){
    const [g, d] = targetPitch;
    let line = `<b>${g} 적극 공략</b> — 피안타율 ${fmt3(d.ba)} (${d.hits}/${d.ab}). 사용 비율 ${d.usagePct.toFixed(0)}%.`;
    
    // 좌/우타 별로 더 잘 치는지
    if(d.vsL.ab >= 4 && d.vsR.ab >= 4){
      const lba = d.vsL.ba;
      const rba = d.vsR.ba;
      if(Math.abs(lba - rba) >= 0.080){
        const betterSide = lba > rba ? '좌타' : '우타';
        const betterBA = lba > rba ? lba : rba;
        line += ` 특히 <b>${betterSide}</b> 상대로 ${fmt3(betterBA)} — ${betterSide} 라인업이 더 효과적.`;
      }
    }
    
    // 어디로 자주 들어오는지 - 노릴 코스
    const cp = d.coursePos;
    const ctot = cp.highOut + cp.highMid + cp.highIn + cp.midOut + cp.midMid + cp.midIn + cp.lowOut + cp.lowMid + cp.lowIn;
    if(ctot >= 10){
      const cells = [
        {n:'한가운데', v:cp.midMid, advice:'실투'},
        {n:'중상(높가운데)', v:cp.highMid, advice:'풀스윙'},
        {n:'중하(낮가운데)', v:cp.lowMid, advice:'라인드라이브'},
        {n:'좌중/우중(가운데 옆)', v:cp.midOut+cp.midIn, advice:'당겨치기/밀어치기'},
        {n:'높은 사이드', v:cp.highOut+cp.highIn, advice:'당겨치기'}
      ];
      cells.sort((a,b)=>b.v-a.v);
      if(cells[0].v / ctot >= 0.20){
        line += ` 주로 <b>${cells[0].n}</b>로 들어옴 — ${cells[0].advice} 준비.`;
      }
    }
    line += ` 이 공에 카운트 절대 양보 X.`;
    strategy.push(line);
  }
  
  if(data.firstPitchN >= 20){
    if(data.firstPitchStrikePct >= 65){
      strategy.push(`<b>초구 적극 공략</b> — 초구 스트라이크 ${data.firstPitchStrikePct.toFixed(0)}%. 거의 항상 존에 들어옴. 노릴 공이면 초구부터 풀스윙.`);
    } else if(data.firstPitchStrikePct < 50){
      strategy.push(`<b>초구 인내</b> — 초구 스트라이크 ${data.firstPitchStrikePct.toFixed(0)}%로 낮음. 인내심 가지고 골라내면 1-0.`);
    }
  }
  
  if(data.gameVariability != null && data.gameVariability >= 0.150 && data.badGames > 0){
    strategy.push(`<b>흔들면 무너짐</b> — 기복 큰 투수 (망경기 ${data.badGames}회). 초반 적극적으로.`);
  }
  
  const myTeams = (typeof window.MY_TEAMS !== 'undefined' && window.MY_TEAMS.teams) || [];
  if(myTeams.length){
    const activeTeam = myTeams.find(t => t.id === window.MY_TEAMS.active) || myTeams[0];
    if(activeTeam && activeTeam.lineup){
      const myBatters = [];
      ['1','2','3','4','5','6','7','8','9'].forEach(slot => {
        const n = activeTeam.lineup[slot];
        if(n) myBatters.push(n);
      });
      
      // 이 투수의 주력 구종 가져오기
      const pitcherTopPitches = Object.entries(data.groupDetails)
        .sort((a,b) => b[1].usagePct - a[1].usagePct)
        .slice(0, 3)
        .map(([g]) => g);
      
      const matchups = myBatters.map(n => {
        const allVs = wbdContext.getBatterDataByName(n);
        if(allVs.length < 10) return null;
        const vsThisHand = data.pHand
          ? allVs.filter(d => String(d.pHand).toUpperCase() === data.pHand.toUpperCase())
          : allVs;
        if(vsThisHand.length < 10) return null;
        const hits = vsThisHand.filter(wbdContext._isHit).length;
        const ab = vsThisHand.filter(d => {
          const r=+d.result; return wbdContext._isABPitch(d);
        }).length;
        if(ab < 5) return null;
        
        // 이 투수의 주력 구종 상대 성적
        const pitchScores = [];
        pitcherTopPitches.forEach(g => {
          const vsPitch = allVs.filter(d => wbdContext.pitchGroup(d.pType, d) === g);
          if(vsPitch.length < 5) return;
          const ph = vsPitch.filter(wbdContext._isHit).length;
          const pa = vsPitch.filter(d => {
            const r=+d.result; return wbdContext._isABPitch(d);
          }).length;
          if(pa < 3) return;
          pitchScores.push({pitch:g, ba:ph/pa, ab:pa, hits:ph});
        });
        
        return {name:n, ba:hits/ab, ab, hits, pitchScores};
      }).filter(Boolean).sort((a,b) => b.ba - a.ba);
      
      if(matchups.length){
        const top = matchups[0];
        if(top.ba >= 0.280){
          let line = `<b>🎯 우리 팀 핵심 매치업</b>: <b>${top.name}</b>`;
          line += ` (${data.pHand==='L'?'좌':'우'}투 상대 ${fmt3(top.ba)}, ${top.hits}/${top.ab})`;
          // 이 투수 주력 구종 상대 성적
          if(top.pitchScores.length){
            const ps = top.pitchScores.filter(p => p.ba >= 0.300).sort((a,b)=>b.ba-a.ba);
            if(ps.length){
              const psList = ps.slice(0,2).map(p => `${p.pitch} ${fmt3(p.ba)}`).join(', ');
              line += `<br><span style="color:var(--muted);font-size:11px;margin-left:8px">→ 특히 이 투수 ${psList} 잘 침. 상위 타순 강력 추천.</span>`;
            }
          }
          strategy.push(line);
        }
        
        // 2~3번째도 의미 있으면 추가
        if(matchups.length >= 2 && matchups[1].ba >= 0.300){
          const second = matchups[1];
          let line2 = `<b>🎯 2번 매치업</b>: <b>${second.name}</b> (${fmt3(second.ba)}, ${second.hits}/${second.ab})`;
          if(second.pitchScores.length){
            const ps = second.pitchScores.filter(p => p.ba >= 0.300).sort((a,b)=>b.ba-a.ba);
            if(ps.length){
              line2 += ` · ${ps[0].pitch} ${fmt3(ps[0].ba)}`;
            }
          }
          strategy.push(line2);
        }
        
        // 약점 매치업 (이 투수에게 약한 우리 타자)
        const weakMatch = matchups.slice().reverse().find(m => m.ab >= 8 && m.ba <= 0.240);
        if(weakMatch){
          strategy.push(`<b>⚠️ 매치업 피하기</b>: <b>${weakMatch.name}</b>이 이 ${data.pHand==='L'?'좌':'우'}투에게 ${fmt3(weakMatch.ba)} (${weakMatch.hits}/${weakMatch.ab}). 이 투수 등판 시 하위 타순 / 대타 고려.`);
        }
      }
    }
  }
  
  if(!strategy.length){
    strategy.push('데이터상 특별한 약점 없는 균형형. 결정구 조심하면서 카운트 관리에 집중.');
  }
  
  sections.push({title:'⚔️ 핵심 공략 전략', color:'#cc44ff', items:strategy});
  
  return {sections};
};
}

export function initialize(wbdContext) {

}
