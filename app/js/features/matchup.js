/** matchup: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:14290
wbdContext.renderMatchupPage = function renderMatchupPage(){
  const psel=document.getElementById('mu-pitcher');
  const bsel=document.getElementById('mu-batter');
  const el=document.getElementById('matchup-content');
  if(!psel||!bsel||!el)return;

  const pNames=(window._cache.pitcherNames||[]).slice().sort();
  const bNames=(window._cache.batterNames||[]).slice().sort();
  const prevP=psel.value, prevB=bsel.value;
  psel.innerHTML='<option value="">— 선택 —</option>'+pNames.map(n=>`<option value="${n}">${n}</option>`).join('');
  bsel.innerHTML='<option value="">— 선택 —</option>'+bNames.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(prevP&&pNames.includes(prevP))psel.value=prevP;
  if(prevB&&bNames.includes(prevB))bsel.value=prevB;

  const pitcher=psel.value, batter=bsel.value;
  if(!pitcher||!batter){el.innerHTML='<div class="card section" style="padding:40px;text-align:center;color:var(--muted)">투수와 타자를 선택하세요</div>';return;}

  // 실전 기록 찾기
  const realMatches=wbdContext.getPitcherDataByName(pitcher).filter(d=>String(d.bName)===String(batter));
  const realBatted=realMatches.filter(wbdContext._isInPlay);
  const realHits=realBatted.filter(wbdContext._isHit).length;
  const realHrs=realBatted.filter(d=>d.result===4).length;
  const realKs=realMatches.filter(d=>wbdContext._isK(d)).length;
  const realBBs=realMatches.filter(d=>d.result===5||d.result===6).length;

  // 선수 카드
  const pCard=wbdContext.calcPitcherCard(pitcher);
  const bCard=wbdContext.calcBatterCard(batter);

  // ── V12.0 매치업 모델: 타석 단위 비율(타율=H/AB, K·BB=/PA, HR=/AB) + 좌우 분할 + 표본 수축 + Log5 ──
  //   이전: 투수 K는 '투구당', 타자 K는 '헛스윙률'을 리그 K/PA(.22)와 섞던 척도 불일치 + 선수카드 OVR 보정(근거 없음) → 제거
  const allP=wbdContext.getPitcherDataByName(pitcher), allB=wbdContext.getBatterDataByName(batter);
  const lg=wbdContext._muLeague();
  const bHand=wbdContext._muHandOf(allB,'bZone'), pHand=wbdContext._muHandOf(allP,'pHand');
  const bAllR=wbdContext._muRates(wbdContext._h2hSlash(allB)), bVsR=wbdContext._muRates(wbdContext._h2hSlash(allB.filter(x=>wbdContext._muHand(x.pHand)===pHand)));
  const pAllR=wbdContext._muRates(wbdContext._h2hSlash(allP)), pVsR=wbdContext._muRates(wbdContext._h2hSlash(allP.filter(x=>wbdContext._muHand(x.bZone)===bHand)));
  // 표시용 원값
  const pBa=pAllR.ba||0, pK=(pAllR.k||0)*100, pBB=(pAllR.bb||0)*100, pHrPct=(pAllR.hr||0)*100;
  const bAvg=bAllR.ba||0, bK=(bAllR.k||0)*100, bBB=(bAllR.bb||0)*100, bHrPct=(bAllR.hr||0)*100;
  // 추정치: 전체(수축) ← 좌우 분할(표본 가중) 
  const bE={ba:wbdContext._muEst(bAllR,bVsR,'ba',lg.ba), k:wbdContext._muEst(bAllR,bVsR,'k',lg.k), bb:wbdContext._muEst(bAllR,bVsR,'bb',lg.bb), hr:wbdContext._muEst(bAllR,bVsR,'hr',lg.hr)};
  const pE={ba:wbdContext._muEst(pAllR,pVsR,'ba',lg.ba), k:wbdContext._muEst(pAllR,pVsR,'k',lg.k), bb:wbdContext._muEst(pAllR,pVsR,'bb',lg.bb), hr:wbdContext._muEst(pAllR,pVsR,'hr',lg.hr)};
  const leagueAvg=lg.ba, leagueK=lg.k, leagueBB=lg.bb, leagueHR=lg.hr;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  let combAvg=clamp(wbdContext._muLog5(bE.ba,pE.ba,lg.ba),0.08,0.65);
  let combHR=clamp(wbdContext._muLog5(bE.hr,pE.hr,lg.hr),0.003,0.18);
  let combK=clamp(wbdContext._muLog5(bE.k,pE.k,lg.k),0.04,0.50);
  let combBB=clamp(wbdContext._muLog5(bE.bb,pE.bb,lg.bb),0.01,0.25);
  const splitInfo={bHand,pHand,bVs:bVsR,pVs:pVsR,bAll:bAllR,pAll:pAllR};

  // 실전 맞대결 기록이 충분하면 (5회 이상) 실제 데이터 비율 반영
  if(realBatted.length+realBBs>=5){
    const realPA=Math.max(1,wbdContext._countPaEnd(realMatches).length);   // V12.0: K/BB는 타석당 (투구당 아님)
    const realAB=realMatches.filter(wbdContext._isABPitch).length;
    const realAvg=realAB?realHits/realAB:combAvg;
    const realKRate=realKs/realPA;
    const realBBRate=realBBs/realPA;
    const realHRRate=realAB?realHrs/realAB:combHR;
    // 실전 10+ 이면 50% 반영, 5~9면 25%, 그 이상이면 더 상승
    const wReal=Math.min(0.6,(realMatches.length)/30);
    combAvg=combAvg*(1-wReal)+realAvg*wReal;
    combHR=combHR*(1-wReal)+realHRRate*wReal;
    combK=combK*(1-wReal)+realKRate*wReal;
    combBB=combBB*(1-wReal)+realBBRate*wReal;
  }

  // 몬테카를로 시뮬레이션
  const sims=parseInt(document.getElementById('mu-sims').value);
  // combAvg는 "타수 당 안타 비율(타율)"이므로 PA로 변환
  // PA 단위: BB 먼저 체크 → 통과하면 AB 내부에서 결과 결정
  // AB 내부: K, (안타: HR + 단타), 인플레이아웃 배분
  // 안타 비율 = combAvg (타율), 그 중 홈런 비율 = combHR (HR/AB)
  // 남은 out 비율 = 1 - combAvg - combK
  let simHits=0,simHRs=0,simKs=0,simBBs=0,simOuts=0;
  for(let i=0;i<sims;i++){
    if(Math.random()<combBB){simBBs++;continue;}  // 볼넷
    const r=Math.random();
    if(r<combK){simKs++;}                          // 삼진 (AB의 첫 영역)
    else if(r<combK+combAvg){
      simHits++;                                    // 안타
      // 안타 중 HR 비율 적용
      if(Math.random()<combHR/combAvg)simHRs++;
    }
    else simOuts++;                                 // 인플레이 아웃
  }
  // 타율 = 안타 / 타수 (타수 = PA - BB)
  const atBats=sims-simBBs;
  const expAvg=atBats>0?(simHits/atBats).toFixed(3).replace(/^0/,''):'---';
  const hrRate=atBats>0?(simHRs/atBats*100).toFixed(1):'0.0';
  const kRate=atBats>0?(simKs/atBats*100).toFixed(1):'0.0';
  const bbRate=(simBBs/sims*100).toFixed(1);

  // 유리도 계산 (직관적 기준) - 타율/장타가 핵심
  // V11.1: 리그 앵커 상수 참조 (WBD 실측 leagueAvg=.382, leagueHR=3.37%)
  const avgDelta=combAvg-leagueAvg;
  const hrDelta=combHR-leagueHR;
  const kDelta=combK-leagueK;
  const bbDelta=combBB-leagueBB;

  const edgePoints=
      avgDelta*300   // 타율 (0.100 = ±30점)
    + hrDelta*400    // HR (5% = ±20점)
    + bbDelta*50     // BB 보조
    - kDelta*50;     // K 보조

  // -40 ~ +40 범위를 -1 ~ +1로 정규화 (분모 확대로 중간치 구간 넓힘)
  const batterEdge=Math.max(-1,Math.min(1,edgePoints/40));
  const pitcherEdge=-batterEdge;
  // 박빙 구간 대폭 확장: 점수 차이 약 8점 이내는 박빙
  const winner=batterEdge>0.20?'batter':batterEdge<-0.20?'pitcher':'tie';

  let html='';

  // 헤더 카드
  html+='<div class="grid2 section">';
  html+=`<div class="card" style="border:2px solid #ff6b6b;text-align:center;padding:16px">
    <div style="font-size:32px;margin-bottom:4px">⚾</div>
    <div style="font-size:20px;font-weight:700;color:#ff6b6b;margin-bottom:2px">${pitcher}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${wbdContext._playerTeam(pitcher,'pitcher')}</div>
    <div style="display:flex;justify-content:center;gap:20px;font-size:11px">
      <div><div style="color:var(--muted)">OVR</div><div style="font-family:var(--mono);color:${wbdContext.cardOvrColor(pCard.OVR)};font-size:20px;font-weight:700">${pCard.OVR}</div></div>
      <div><div style="color:var(--muted)">K%</div><div style="font-family:var(--mono);color:var(--amber);font-size:16px;font-weight:700">${pK.toFixed(1)}%</div></div>
      <div><div style="color:var(--muted)">피안타율</div><div style="font-family:var(--mono);color:var(--amber);font-size:16px;font-weight:700">${pBa.toFixed(3).replace(/^0/,'')}</div></div>
    </div>
  </div>`;
  html+=`<div class="card" style="border:2px solid #6bb5ff;text-align:center;padding:16px">
    <div style="font-size:32px;margin-bottom:4px">🏏</div>
    <div style="font-size:20px;font-weight:700;color:#6bb5ff;margin-bottom:2px">${batter}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${wbdContext._playerTeam(batter,'batter')}</div>
    <div style="display:flex;justify-content:center;gap:20px;font-size:11px">
      <div><div style="color:var(--muted)">OVR</div><div style="font-family:var(--mono);color:${wbdContext.cardOvrColor(bCard.OVR)};font-size:20px;font-weight:700">${bCard.OVR}</div></div>
      <div><div style="color:var(--muted)">AVG</div><div style="font-family:var(--mono);color:var(--amber);font-size:16px;font-weight:700">${bAvg.toFixed(3).replace(/^0/,'')}</div></div>
      <div><div style="color:var(--muted)">HR%</div><div style="font-family:var(--mono);color:var(--amber);font-size:16px;font-weight:700">${bHrPct.toFixed(1)}%</div></div>
    </div>
  </div>`;
  html+='</div>';

  // 승부 예측
  const batterWinPct=Math.round(50+batterEdge*50);
  const pitcherWinPct=100-batterWinPct;
  html+=`<div class="card section">
    <div class="card-title">🎯 승부 예측 (${sims}회 시뮬레이션)</div>
    <div style="padding:10px 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px">
        <span style="color:#ff6b6b;font-weight:700">⚾ ${pitcher} 유리 ${pitcherWinPct}%</span>
        <span style="color:#6bb5ff;font-weight:700">🏏 ${batter} 유리 ${batterWinPct}%</span>
      </div>
      <div style="background:#1a2030;height:24px;border-radius:3px;position:relative;overflow:hidden">
        <div style="background:linear-gradient(90deg,#ff6b6b,#6bb5ff);height:100%;width:100%"></div>
        <div style="position:absolute;top:0;left:${pitcherWinPct}%;width:2px;height:100%;background:#fff;box-shadow:0 0 6px #fff"></div>
      </div>
      <div style="text-align:center;margin-top:12px;font-size:14px;font-weight:700;color:${winner==='batter'?'#6bb5ff':winner==='pitcher'?'#ff6b6b':'var(--amber)'}">${winner==='batter'?'🏏 타자 우위':winner==='pitcher'?'⚾ 투수 우위':'⚖️ 박빙'}</div>
    </div>
  </div>`;

  // 예측 결과 분포
  html+=`<div class="grid4 section">
    <div class="card" style="text-align:center;padding:14px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">예상 타율</div><div style="font-size:26px;font-family:var(--mono);color:#39ff8a;font-weight:700">${expAvg}</div></div>
    <div class="card" style="text-align:center;padding:14px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">예상 홈런율</div><div style="font-size:26px;font-family:var(--mono);color:#ff4560;font-weight:700">${hrRate}%</div></div>
    <div class="card" style="text-align:center;padding:14px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">예상 K율</div><div style="font-size:26px;font-family:var(--mono);color:#ff8800;font-weight:700">${kRate}%</div></div>
    <div class="card" style="text-align:center;padding:14px"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">예상 BB율</div><div style="font-size:26px;font-family:var(--mono);color:#44aaff;font-weight:700">${bbRate}%</div></div>
  </div>`;

  // ── V12.0: 좌우 매치업 + 카운트별 + 구종별 예상 ──
  const f3=v=>v==null?'-':v.toFixed(3).replace(/^0/,'');
  const handL=h=>h==='L'?'좌':'우';
  html+=`<div class="grid2 section">
    <div class="card" style="border-left:3px solid #6bb5ff"><div class="card-title" style="font-size:13px">↔️ 좌우 매치업 <span style="font-size:10px;color:var(--muted);font-weight:400">${handL(bHand)}타 vs ${handL(pHand)}투</span></div>
      <div style="font-size:12px;line-height:1.8">
        <div>🏏 <b>${batter}</b> 전체 ${f3(bAllR.ba)} (${bAllR.AB}타수) → <b>vs ${handL(pHand)}투 ${f3(bVsR.ba)}</b> (${bVsR.AB}타수${bVsR.AB<15?' · 표본 적음':''}) · K/PA ${wbdContext._slPct((bVsR.k||0)*100)} · BB ${wbdContext._slPct((bVsR.bb||0)*100)}</div>
        <div>⚾ <b>${pitcher}</b> 전체 ${f3(pAllR.ba)} (${pAllR.AB}타수) → <b>vs ${handL(bHand)}타 ${f3(pVsR.ba)}</b> (${pVsR.AB}타수${pVsR.AB<15?' · 표본 적음':''}) · K/PA ${wbdContext._slPct((pVsR.k||0)*100)} · BB ${wbdContext._slPct((pVsR.bb||0)*100)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">모델: 전체 성적을 리그 평균으로 수축 → 좌우 분할을 표본만큼 가중 → Log5 결합 (리그 타율 ${f3(lg.ba)} · K/PA ${wbdContext._slPct(lg.k*100)} · BB ${wbdContext._slPct(lg.bb*100)}). 추정 타자 ${f3(bE.ba)} × 투수 ${f3(pE.ba)} → <b>${f3(combAvg)}</b></div>
      </div>
    </div>`;
  // 카운트별 예상
  { const cb=wbdContext._atkCountStatsArr(allB), cp=wbdContext._atkCountStatsArr(allP);
    const rows=[['초구','초구'],['유리','타자 유리'],['동일','동일'],['불리','투수 유리'],['2S','2S']].map(([k,l])=>{ const b=cb[k], pq=cp[k]; const lgk=lg.count[k]!=null?lg.count[k]:lg.ba;
      const bb=b&&b.ba!=null?wbdContext._srShrink(b.ba,b.ab,lgk,20):lgk, pp=pq&&pq.ba!=null?wbdContext._srShrink(pq.ba,pq.ab,lgk,20):lgk; const x=wbdContext._muLog5(bb,pp,lgk);
      return {k:l, bab:b?b.ab:0, bba:b?b.ba:null, bsw:b?b.swPct:null, pab:pq?pq.ab:0, pba:pq?pq.ba:null, x, lgk}; });
    const best=rows.slice().sort((a,b)=>a.x-b.x)[0], worst=rows.slice().sort((a,b)=>b.x-a.x)[0];
    html+=`<div class="card" style="border-left:3px solid #f5a623"><div class="card-title" style="font-size:13px">🔢 카운트별 예상 타율 <span style="font-size:10px;color:var(--muted);font-weight:400">타자 성적 × 투수 피성적 (Log5, 20타수 수축)</span></div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>상황</th><th>타자</th><th>투수</th><th>리그</th><th>예상</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${r.k}</td><td class="mono">${f3(r.bba)} <span style="color:var(--muted)">(${r.bab})</span></td><td class="mono">${f3(r.pba)} <span style="color:var(--muted)">(${r.pab})</span></td><td class="mono" style="color:var(--muted)">${f3(r.lgk)}</td><td class="mono" style="font-weight:700;color:${r===best?'#ff6b6b':r===worst?'#6bb5ff':'inherit'}">${f3(r.x)}</td></tr>`).join('')}
      </tbody></table></div>
      <div style="font-size:10px;color:var(--muted);margin-top:4px">⚾ 투수 유리 상황: <b style="color:#ff6b6b">${best.k} ${f3(best.x)}</b> · 🏏 타자 유리: <b style="color:#6bb5ff">${worst.k} ${f3(worst.x)}</b> — ${best.k==='2S'?'2S까지 끌고 가면 투수 쪽':best.k==='초구'?'초구 승부가 투수 쪽':''}</div>
    </div>
  </div>`;
  }
  // 구종별 예상 (투수 레퍼토리 기준)
  { const pg=wbdContext._atkPitchStatsArr(allP), bg=wbdContext._atkPitchStatsArr(allB); const tot=allP.length||1;
    const rows=pg.groups.filter(g=>g.n/tot>=0.06).map(g=>{ const b=bg.groups.find(x=>x.g===g.g); const lgg=lg.grp[g.g]!=null?lg.grp[g.g]:lg.ba;
      const pp=g.ba!=null?wbdContext._srShrink(g.ba,g.ab,lgg,20):lgg, bb=b&&b.ba!=null?wbdContext._srShrink(b.ba,b.ab,lgg,20):lgg; const x=wbdContext._muLog5(bb,pp,lgg);
      return {g:g.g, use:g.n/tot*100, pab:g.ab, pba:g.ba, pwh:g.whPct, bab:b?b.ab:0, bba:b?b.ba:null, bwh:b?b.whPct:null, bsw:b?b.swPct:null, x, lgg, conf:(b?b.ab:0)>=10&&g.ab>=10}; }).sort((a,b)=>b.use-a.use);
    if(rows.length){ const best=rows.slice().sort((a,b)=>a.x-b.x)[0], worst=rows.slice().sort((a,b)=>b.x-a.x)[0];
      html+=`<div class="card section" style="border-left:3px solid #cc44ff"><div class="card-title" style="font-size:13px">🎿 구종별 예상 <span style="font-size:10px;color:var(--muted);font-weight:400">투수 레퍼토리(구사 6%+) × 타자 구종별 대응</span></div>
        <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>구종</th><th>구사</th><th>투수 피안타</th><th>투수 헛%</th><th>타자 타율</th><th>타자 스윙/헛%</th><th>예상</th><th>표본</th></tr></thead><tbody>
        ${rows.map(r=>`<tr><td style="color:${wbdContext.GROUP_COLORS[r.g]||'inherit'}">${wbdContext._esc(r.g)}</td><td class="mono">${r.use.toFixed(0)}%</td><td class="mono">${f3(r.pba)} <span style="color:var(--muted)">(${r.pab})</span></td><td class="mono">${r.pwh!=null?wbdContext._slPct(r.pwh):'-'}</td><td class="mono">${f3(r.bba)} <span style="color:var(--muted)">(${r.bab})</span></td><td class="mono">${r.bsw!=null?wbdContext._slPct(r.bsw):'-'}/${r.bwh!=null?wbdContext._slPct(r.bwh):'-'}</td><td class="mono" style="font-weight:700;color:${r===best?'#ff6b6b':r===worst?'#6bb5ff':'inherit'}">${f3(r.x)}</td><td style="font-size:10px;color:${r.conf?'#39ff8a':'#f5a623'}">${r.conf?'충분':'적음'}</td></tr>`).join('')}
        </tbody></table></div>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">⚾ 투수 추천 구종: <b style="color:#ff6b6b">${wbdContext._esc(best.g)} (예상 ${f3(best.x)})</b> · 🏏 타자가 노릴 구종: <b style="color:#6bb5ff">${wbdContext._esc(worst.g)} (예상 ${f3(worst.x)})</b> · 리그 구종별 타율로 수축(20타수)</div>
      </div>`; }
  }

  // 실제 맞대결 기록
  html+='<div class="card section"><div class="card-title">📜 실전 맞대결 기록</div>';
  if(realMatches.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">이 매치업의 실전 기록이 없습니다</div>';
  } else {
    html+=`<div class="grid4" style="margin-bottom:12px">
      <div style="text-align:center"><div style="font-size:11px;color:var(--muted)">총 투구</div><div style="font-size:20px;font-family:var(--mono);color:var(--amber);font-weight:700">${realMatches.length}</div></div>
      <div style="text-align:center"><div style="font-size:11px;color:var(--muted)">안타</div><div style="font-size:20px;font-family:var(--mono);color:#39ff8a;font-weight:700">${realHits}</div></div>
      <div style="text-align:center"><div style="font-size:11px;color:var(--muted)">홈런</div><div style="font-size:20px;font-family:var(--mono);color:#ff4560;font-weight:700">${realHrs}</div></div>
      <div style="text-align:center"><div style="font-size:11px;color:var(--muted)">삼진</div><div style="font-size:20px;font-family:var(--mono);color:#ff8800;font-weight:700">${realKs}</div></div>
    </div>`;
    if(realBatted.length>0){
      html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>이닝</th><th>카운트</th><th>구종</th><th>구속</th><th>결과</th><th>EV</th></tr></thead><tbody>';
      realMatches.slice(0,20).forEach(d=>{
        const pg=wbdContext.pitchGroup(d.pType,d);
        html+=`<tr>
          <td>${d.inn}이닝${d.half===1?'초':'말'}</td>
          <td style="font-family:var(--mono)">${d.ball}-${d.strk}-${d.out}</td>
          <td style="color:${wbdContext.GROUP_COLORS[pg]||'#888'}">${wbdContext.PITCH_NAMES[d.pType]||d.pType}</td>
          <td style="font-family:var(--mono)">${d.spdK||'-'}</td>
          <td>${wbdContext._isHit(d)?({4:'HomeRun',3:'3B',2:'2B'}[+d._hitBase]||'1B'):+d.result===0?(wbdContext.CALL_NAMES[d.call]||'-'):(wbdContext.RESULT_NAMES[d.result]||'-')}${wbdContext._isK(d)?' (K)':''}</td>
          <td style="font-family:var(--mono)">${d.ev>0?d.ev:'-'}</td>
        </tr>`;
      });
      html+='</tbody></table></div>';
    }
  }
  html+='</div>';

  el.innerHTML=html;
};

// Original index.html:14533
wbdContext.setH2HMode = function setH2HMode(m){
  wbdContext._h2hMode=m;
  document.querySelectorAll('.h2h-mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===m));
  const isDuo = m==='duo';
  const lbl=document.getElementById('h2h-sel-label');
  const handSel=document.getElementById('h2h-hand');
  const sel2=document.getElementById('h2h-player2');
  const lbl2=document.getElementById('h2h-sel2-label');
  // 1:1 상세: 타자+투수 둘 다 선택 / 그 외: 기준선수 하나
  if(lbl) lbl.textContent = isDuo ? '🏏 타자' : (m==='batter' ? '🏏 타자' : '⚾ 투수');
  if(sel2) sel2.style.display = isDuo ? '' : 'none';
  if(lbl2) lbl2.style.display = isDuo ? '' : 'none';
  // list 전용 필터(최소타석·손잡이)는 duo에서 숨김
  document.querySelectorAll('#page-h2h .h2h-list-only').forEach(e=>{ e.style.display = isDuo ? 'none' : ''; });
  if(handSel){
    handSel.options[1].text = m==='batter' ? '우투' : '우타';
    handSel.options[2].text = m==='batter' ? '좌투' : '좌타';
  }
  // 선택값 초기화 (모드 바뀌면 이름 목록이 바뀌므로)
  const psel=document.getElementById('h2h-player');
  if(psel) psel.value='';
  if(sel2) sel2.value='';
  wbdContext.renderH2HPage();
};

// Original index.html:14559
wbdContext._h2hSlash = function _h2hSlash(arr){
  if(!arr||!arr.length) return null;
  // V12.0: 타석 종료는 경기 단위 플래그(_isPaEnd) — 카운트별/구종별 등 부분집합을 넘겨도 타수가 부풀지 않음
  const paEnd=arr.filter(wbdContext._isPaEnd);
  const PA=paEnd.length;
  const BB=arr.filter(d=>+d.result===5).length;
  const HBP=arr.filter(d=>+d.result===6).length;
  const AB=paEnd.filter(d=>+d.result!==5&&+d.result!==6).length;
  const hits=arr.filter(d=>wbdContext._isHit(d)).length;
  const hrs=arr.filter(d=>+d.result===4).length;
  const h2B=arr.filter(d=>(+d._hitBase||0)===2).length;
  const h3B=arr.filter(d=>(+d._hitBase||0)===3).length;
  const h1B=Math.max(0,hits-hrs-h2B-h3B);
  const tb=wbdContext._totalBases(arr);
  // 삼진: 2스트라이크에서 헛스윙(call=4)이나 루킹(call=0)으로 타석 종료
  const K=paEnd.filter(d=>wbdContext._isK(d)&&!wbdContext._isHit(d)&&+d.result!==5&&+d.result!==6).length;
  const inPlay=arr.filter(wbdContext._isInPlay);
  const evs=inPlay.filter(d=>+d.ev>0).map(d=>+d.ev);
  const avgEV=evs.length?evs.reduce((a,b)=>a+b,0)/evs.length:0;
  const maxEV=evs.length?Math.max(...evs):0;
  const swings=arr.filter(wbdContext._isSwing).length;
  const whiffs=arr.filter(wbdContext._isWhiff).length;
  const ba=AB>0?hits/AB:0;
  const obp=PA>0?(hits+BB+HBP)/PA:0;
  const slg=AB>0?tb/AB:0;
  return {PA,AB,hits,h1B,h2B,h3B,hrs,BB,HBP,K,tb,avgEV,maxEV,swings,whiffs,
    ba,obp,slg,ops:obp+slg,
    whiffPct:swings?whiffs/swings*100:0,
    kPct:PA?K/PA*100:0, bbPct:PA?BB/PA*100:0,
    pitches:arr.length};
};

// Original index.html:14591
wbdContext.renderH2HPage = function renderH2HPage(){
  const el=document.getElementById('h2h-content');
  const psel=document.getElementById('h2h-player');
  if(!el||!psel) return;
  const mode=wbdContext._h2hMode;

  // ── 1:1 상세 모드 ──
  if(mode==='duo'){
    const sel2=document.getElementById('h2h-player2');
    const bNames=(window._cache.batterNames||[]).slice().sort((a,b)=>a.localeCompare(b));
    const pNames=(window._cache.pitcherNames||[]).slice().sort((a,b)=>a.localeCompare(b));
    const pb=psel.value, pp=sel2?sel2.value:'';
    psel.innerHTML='<option value="">— 타자 선택 —</option>'+bNames.map(n=>`<option value="${wbdContext._esc(n)}">${wbdContext._esc(n)}</option>`).join('');
    if(sel2) sel2.innerHTML='<option value="">— 투수 선택 —</option>'+pNames.map(n=>`<option value="${wbdContext._esc(n)}">${wbdContext._esc(n)}</option>`).join('');
    if(pb&&bNames.includes(pb)) psel.value=pb;
    if(sel2&&pp&&pNames.includes(pp)) sel2.value=pp;
    const bat=psel.value, pit=sel2?sel2.value:'';
    if(!bat||!pit){ el.innerHTML=`<div class="card section" style="padding:40px;text-align:center;color:var(--muted)">🏏 타자와 ⚾ 투수를 모두 선택하면 그 매치업의 상세 전적이 여기에 펼쳐집니다.</div>`; return; }
    wbdContext._renderH2HDuo(el, bat, pit);
    return;
  }

  const isBat = mode==='batter';
  // 셀렉트 목록 채우기 (내 시점 선수 = 기준 선수)
  const selfNames=((isBat?window._cache.batterNames:window._cache.pitcherNames)||[]).slice().sort((a,b)=>a.localeCompare(b));
  const prev=psel.value;
  psel.innerHTML='<option value="">— 전체 (상대전적 요약) —</option>'+selfNames.map(n=>`<option value="${wbdContext._esc(n)}">${wbdContext._esc(n)}</option>`).join('');
  if(prev&&selfNames.includes(prev)) psel.value=prev;

  const self=psel.value;
  const minPA=parseInt(document.getElementById('h2h-minpa').value)||1;
  const handF=(document.getElementById('h2h-hand').value)||'';

  if(!self){ wbdContext._renderH2HAll(el,isBat,minPA,handF); return; }
  wbdContext._renderH2HSingle(el,isBat,self,minPA,handF);
};

// Original index.html:14629
wbdContext._renderH2HDuo = function _renderH2HDuo(el, bName, pName){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const all=wbdContext.getBatterDataByName(bName);
  const arr=all.filter(d=>wbdContext._canonPlayer(d.pName)===String(pName));
  const bTeam=wbdContext._playerTeam(bName,'batter')||'';
  const pTeam=wbdContext._playerTeam(pName,'pitcher')||'';
  let html=`<div class="card section" style="border-left:4px solid #ffd700">
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#6bb5ff">🏏 ${wbdContext._esc(bName)}</div><div style="font-size:11px;color:var(--muted)">${wbdContext._esc(bTeam)}</div></div>
      <div style="font-size:16px;color:var(--muted)">vs</div>
      <div style="text-align:center"><div style="font-size:20px;font-weight:800;color:#ff6b6b">⚾ ${wbdContext._esc(pName)}</div><div style="font-size:11px;color:var(--muted)">${wbdContext._esc(pTeam)}</div></div>
      <div style="flex:1"></div>
      <div style="font-size:12px;color:var(--muted)">${arr.length}투구</div>
    </div>
  </div>`;
  if(!arr.length){ el.innerHTML=html+`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">이 매치업의 실전 기록이 없습니다.</div>`; return; }
  const s=wbdContext._h2hSlash(arr);
  if(s){
    const cells=[['타석',s.PA],['타수',s.AB],['안타',s.hits],['1루타',s.h1B],['2루타',s.h2B],['3루타',s.h3B],['홈런',s.hrs],['삼진',s.K],
      ['볼넷',s.BB],['타율',fmt3(s.ba)],['출루',fmt3(s.obp)],['장타',fmt3(s.slg)],['OPS',fmt3(s.ops)],['헛스윙%',s.whiffPct.toFixed(0)+'%'],['평균EV',s.avgEV?s.avgEV.toFixed(1):'-'],['최고EV',s.maxEV?s.maxEV.toFixed(0):'-']];
    html+='<div class="card section"><div class="card-title">📊 종합 성적</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:8px">';
    cells.forEach(([l,v])=>{ html+=`<div style="background:var(--card2);border-radius:6px;padding:10px 6px;text-align:center"><div style="font-size:10px;color:var(--muted)">${l}</div><div style="font-family:var(--mono);font-size:17px;font-weight:700">${v}</div></div>`; });
    html+='</div></div>';
  }
  // 구종별 + 구속대별 스플릿 나란히
  html+='<div class="grid2 section">';
  // 구종별
  const byG={}; arr.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);(byG[g]=byG[g]||[]).push(d);});
  const grows=Object.entries(byG).map(([g,ga])=>({g,gs:wbdContext._h2hSlash(ga),n:ga.length})).filter(x=>x.gs).sort((a,b)=>b.n-a.n);
  html+='<div class="card"><div class="card-title">구종별 대응</div>';
  if(grows.length){
    html+='<div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>구종</th><th>투구</th><th>타수</th><th>안타</th><th>HR</th><th>타율</th><th>장타</th><th>헛%</th><th>EV</th></tr></thead><tbody>';
    grows.forEach(({g,gs,n})=>{ html+=`<tr><td style="color:${wbdContext.GROUP_COLORS[g]||'#888'};font-weight:600">${g}</td><td style="font-family:var(--mono)">${n}</td><td style="font-family:var(--mono)">${gs.AB}</td><td style="font-family:var(--mono)">${gs.hits}</td><td style="font-family:var(--mono)">${gs.hrs}</td><td style="font-family:var(--mono);font-weight:700">${fmt3(gs.ba)}</td><td style="font-family:var(--mono)">${fmt3(gs.slg)}</td><td style="font-family:var(--mono)">${gs.whiffPct.toFixed(0)}%</td><td style="font-family:var(--mono)">${gs.avgEV?gs.avgEV.toFixed(1):'-'}</td></tr>`; });
    html+='</tbody></table></div>';
  } else html+='<div style="padding:14px;color:var(--muted);font-size:12px">데이터 없음</div>';
  html+='</div>';
  // 구속대별 (5km)
  const byS={}; arr.forEach(d=>{const sp=+d.spdK; if(!(sp>0))return; const b=Math.floor(sp/5)*5;(byS[b]=byS[b]||[]).push(d);});
  const srows=Object.entries(byS).map(([b,sa])=>({b:+b,ss:wbdContext._h2hSlash(sa),n:sa.length})).filter(x=>x.ss).sort((a,b)=>a.b-b.b);
  html+='<div class="card"><div class="card-title">구속대별 대응 (5km)</div>';
  if(srows.length){
    html+='<div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>구속</th><th>투구</th><th>타수</th><th>안타</th><th>HR</th><th>타율</th><th>장타</th><th>헛%</th><th>EV</th></tr></thead><tbody>';
    srows.forEach(({b,ss,n})=>{ html+=`<tr><td style="font-family:var(--mono);font-weight:600">${b}~${b+5}</td><td style="font-family:var(--mono)">${n}</td><td style="font-family:var(--mono)">${ss.AB}</td><td style="font-family:var(--mono)">${ss.hits}</td><td style="font-family:var(--mono)">${ss.hrs}</td><td style="font-family:var(--mono);font-weight:700">${fmt3(ss.ba)}</td><td style="font-family:var(--mono)">${fmt3(ss.slg)}</td><td style="font-family:var(--mono)">${ss.whiffPct.toFixed(0)}%</td><td style="font-family:var(--mono)">${ss.avgEV?ss.avgEV.toFixed(1):'-'}</td></tr>`; });
    html+='</tbody></table></div>';
  } else html+='<div style="padding:14px;color:var(--muted);font-size:12px">데이터 없음</div>';
  html+='</div></div>';
  // 카운트별 스플릿
  const byC={}; arr.forEach(d=>{const c=`${+d.ball||0}-${+d.strk||0}`;(byC[c]=byC[c]||[]).push(d);});
  const corder=['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2','3-0','3-1','3-2'];
  const crows=corder.filter(c=>byC[c]).map(c=>({c,cs:wbdContext._h2hSlash(byC[c]),n:byC[c].length})).filter(x=>x.cs);
  if(crows.length){
    html+='<div class="card section"><div class="card-title">카운트별 대응</div><div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>카운트</th><th>투구</th><th>타수</th><th>안타</th><th>타율</th><th>장타</th><th>헛%</th><th>EV</th></tr></thead><tbody>';
    crows.forEach(({c,cs,n})=>{ html+=`<tr><td style="font-family:var(--mono);font-weight:600">${c}</td><td style="font-family:var(--mono)">${n}</td><td style="font-family:var(--mono)">${cs.AB}</td><td style="font-family:var(--mono)">${cs.hits}</td><td style="font-family:var(--mono);font-weight:700">${fmt3(cs.ba)}</td><td style="font-family:var(--mono)">${fmt3(cs.slg)}</td><td style="font-family:var(--mono)">${cs.whiffPct.toFixed(0)}%</td><td style="font-family:var(--mono)">${cs.avgEV?cs.avgEV.toFixed(1):'-'}</td></tr>`; });
    html+='</tbody></table></div></div>';
  }
  // 투구 기록 전체
  const srt=arr.slice().reverse();
  html+=`<div class="card section"><div class="card-title">투구 기록 <span style="font-size:10px;color:var(--muted);font-weight:400">(최근순 · ${srt.length}개)</span></div><div class="tbl-wrap" style="max-height:420px;overflow-y:auto"><table class="data-table" style="font-size:11px"><thead><tr><th>이닝</th><th>카운트</th><th>구종</th><th>구속</th><th>결과</th><th>EV</th><th>LA</th></tr></thead><tbody>`;
  srt.forEach(d=>{
    const pg=wbdContext.pitchGroup(d.pType,d);
    const res=wbdContext.RESULT_NAMES[+d.result]||wbdContext.CALL_NAMES[+d.call]||'-';
    const resCol=+d.result===4?'#ff4560':wbdContext._isHit(d)?'#39ff8a':wbdContext._isWhiff(d)?'#ff8800':'var(--text)';
    html+=`<tr><td>${d.inn}${d.half===1?'초':'말'}</td><td style="font-family:var(--mono)">${d.ball||0}-${d.strk||0}</td><td style="color:${wbdContext.GROUP_COLORS[pg]||'#888'}">${(wbdContext.PITCH_NAMES&&wbdContext.PITCH_NAMES[d.pType])||d.pType}</td><td style="font-family:var(--mono)">${d.spdK||'-'}</td><td style="color:${resCol}">${res}</td><td style="font-family:var(--mono)">${+d.ev>0?d.ev:'-'}</td><td style="font-family:var(--mono)">${+d.ev>0&&d.ldeg!=null?(+d.ldeg).toFixed(0)+'°':'-'}</td></tr>`;
  });
  html+='</tbody></table></div></div>';
  html+=`<div style="font-size:10px;color:var(--muted);text-align:center;padding:6px">※ 타자 시점 · 안타 정의는 기록실과 동일 · 활성 경기만 반영</div>`;
  el.innerHTML=html;
};

// Original index.html:14699
wbdContext._esc = function _esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));};

// Original index.html:14701
wbdContext._jsStr = function _jsStr(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;').replace(/</g,'\\x3c');};

// Original index.html:14704
wbdContext._renderH2HSingle = function _renderH2HSingle(el,isBat,self,minPA,handF){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const all = isBat ? wbdContext.getBatterDataByName(self) : wbdContext.getPitcherDataByName(self);
  // 상대 손잡이 필터 (타자기준=상대투수 pHand / 투수기준=상대타자 bHand)
  const handKey = isBat ? 'pHand' : 'bHand';
  let base = handF ? all.filter(d=>String(d[handKey]).toUpperCase()===handF) : all;
  // 상대 이름 키
  const oppKey = isBat ? 'pName' : 'bName';
  const groups={};
  base.forEach(d=>{
    const raw=d[oppKey]; if(raw==null||raw==='') return;
    const opp=wbdContext._canonPlayer(raw);  // 닉변 병합 (캐시 키와 일치시켜야 상세 조회 가능)
    (groups[opp]=groups[opp]||[]).push(d);
  });
  const rows=[];
  Object.entries(groups).forEach(([opp,arr])=>{
    const s=wbdContext._h2hSlash(arr); if(!s) return;
    if(s.PA<minPA) return;
    rows.push({opp,...s});
  });
  rows.sort((a,b)=>b.PA-a.PA);

  const total=wbdContext._h2hSlash(base);
  const oppLabel = isBat ? '상대 투수' : '상대 타자';
  const evLabel = isBat ? '평균EV' : '피평균EV';
  const kLabel = isBat ? '삼진' : 'K';

  let html='';
  // 요약 헤더
  html+=`<div class="card section" style="border-left:4px solid ${isBat?'#6bb5ff':'#ff6b6b'}">
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:10px">
      <div style="font-size:22px;font-weight:800;color:${isBat?'#6bb5ff':'#ff6b6b'}">${isBat?'🏏':'⚾'} ${wbdContext._esc(self)}</div>
      <div style="font-size:12px;color:var(--muted)">${wbdContext._playerTeam(self,isBat?'batter':'pitcher')||''}</div>
      <div style="font-size:12px;color:var(--muted)">· 상대한 ${oppLabel} <b style="color:var(--text)">${rows.length}명</b> (${minPA}타석+${handF?` · ${handF==='R'?'우':'좌'}${isBat?'투':'타'}만`:''})</div>
    </div>`;
  if(total){
    const cells=[
      ['타석',total.PA],['타수',total.AB],['안타',total.hits],
      ['타율',fmt3(total.ba)],['출루',fmt3(total.obp)],['장타',fmt3(total.slg)],
      ['OPS',fmt3(total.ops)],['홈런',total.hrs],[kLabel,total.K],['볼넷',total.BB]
    ];
    html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:6px">';
    cells.forEach(([l,v])=>{
      html+=`<div style="background:var(--card2);border-radius:6px;padding:8px 6px;text-align:center">
        <div style="font-size:10px;color:var(--muted)">${l}</div>
        <div style="font-family:var(--mono);font-size:16px;font-weight:700">${v}</div></div>`;
    });
    html+='</div>';
  }
  html+='</div>';

  if(!rows.length){
    html+=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">조건에 맞는 상대전적이 없습니다. (최소 타석/손잡이 필터를 낮춰보세요)</div>`;
    el.innerHTML=html; return;
  }

  // 상대별 표
  html+=`<div class="card section"><div class="card-title">📋 ${oppLabel}별 전적 <span style="font-size:10px;color:var(--muted);font-weight:400">(행 클릭 → 투구별 상세)</span></div>
    <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>#</th>${wbdContext._sortTh(oppLabel)}${wbdContext._sortTh('타석')}${wbdContext._sortTh('타수')}${wbdContext._sortTh('안타')}${wbdContext._sortTh('2B')}${wbdContext._sortTh('3B')}${wbdContext._sortTh('HR')}${wbdContext._sortTh(kLabel)}${wbdContext._sortTh('BB')}${wbdContext._sortTh('타율')}${wbdContext._sortTh('출루')}${wbdContext._sortTh('장타')}${wbdContext._sortTh('OPS')}${wbdContext._sortTh('헛%')}${wbdContext._sortTh(evLabel)}
    </tr></thead><tbody>`;
  rows.forEach((r,i)=>{
    const baCol=r.ba>=0.400?'#39ff8a':r.ba>=0.300?'#a8e063':r.ba<=0.200?'#ff4560':'var(--text)';
    const opsCol=r.ops>=1.000?'#39ff8a':r.ops>=0.800?'#a8e063':r.ops<=0.600?'#ff4560':'var(--text)';
    html+=`<tr style="cursor:pointer" onclick="showH2HDetail('${isBat?'batter':'pitcher'}','${wbdContext._jsStr(self)}','${wbdContext._jsStr(r.opp)}','${handF}')">
      <td data-rank>${i+1}</td>
      <td style="font-weight:600">${wbdContext._esc(r.opp)}</td>
      <td style="font-family:var(--mono)">${r.PA}</td>
      <td style="font-family:var(--mono)">${r.AB}</td>
      <td style="font-family:var(--mono)">${r.hits}</td>
      <td style="font-family:var(--mono)">${r.h2B}</td>
      <td style="font-family:var(--mono)">${r.h3B}</td>
      <td style="font-family:var(--mono);color:${r.hrs>0?'#ff4560':'var(--muted)'}">${r.hrs}</td>
      <td style="font-family:var(--mono)">${r.K}</td>
      <td style="font-family:var(--mono)">${r.BB}</td>
      <td style="font-family:var(--mono);font-weight:700;color:${baCol}">${fmt3(r.ba)}</td>
      <td style="font-family:var(--mono)">${fmt3(r.obp)}</td>
      <td style="font-family:var(--mono)">${fmt3(r.slg)}</td>
      <td style="font-family:var(--mono);font-weight:700;color:${opsCol}">${fmt3(r.ops)}</td>
      <td style="font-family:var(--mono)">${r.whiffPct.toFixed(0)}%</td>
      <td style="font-family:var(--mono)">${r.avgEV?r.avgEV.toFixed(1):'-'}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';
  html+=`<div style="font-size:10px;color:var(--muted);text-align:center;padding:6px">※ 안타 정의는 기록실과 동일(낫아웃·야수선택 제외) · 삼진=2S 헛스윙/루킹으로 타석종료 · 활성 경기만 반영</div>`;
  el.innerHTML=html;
};

// Original index.html:14793
wbdContext._renderH2HAll = function _renderH2HAll(el,isBat,minPA,handF){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const selfNames=((isBat?window._cache.batterNames:window._cache.pitcherNames)||[]).slice();
  const handKey = isBat ? 'pHand' : 'bHand';
  const oppKey = isBat ? 'pName' : 'bName';
  const rows=[];
  selfNames.forEach(self=>{
    const all=isBat?wbdContext.getBatterDataByName(self):wbdContext.getPitcherDataByName(self);
    const base=handF?all.filter(d=>String(d[handKey]).toUpperCase()===handF):all;
    const s=wbdContext._h2hSlash(base); if(!s||s.PA<minPA) return;
    // 상대 수
    const opps=new Set(); base.forEach(d=>{if(d[oppKey])opps.add(wbdContext._canonPlayer(d[oppKey]));});
    rows.push({self,oppN:opps.size,...s});
  });
  rows.sort((a,b)=>b.ops-a.ops);

  const selfLabel=isBat?'타자':'투수';
  const oppLabel=isBat?'상대투수수':'상대타자수';
  const evLabel=isBat?'평균EV':'피평균EV';
  const kLabel=isBat?'삼진':'K';

  let html=`<div class="card section" style="padding:14px 16px">
    <div style="font-size:15px;font-weight:700;margin-bottom:4px">🆚 상대전적 — 전체 ${selfLabel} 요약</div>
    <div style="font-size:12px;color:var(--muted)">위에서 ${selfLabel}를 고르면 그 선수의 <b>상대별 세부 전적표</b>가 뜹니다. 아래는 전체 ${selfLabel}를 OPS 순으로 정렬한 표 (행 클릭 → 그 선수 선택).</div>
  </div>`;
  if(!rows.length){ el.innerHTML=html+`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">조건에 맞는 데이터가 없습니다.</div>`; return; }
  html+=`<div class="card section"><div class="card-title">📋 전체 ${selfLabel} (${rows.length}명)</div>
    <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>#</th>${wbdContext._sortTh(selfLabel)}${wbdContext._sortTh(oppLabel)}${wbdContext._sortTh('타석')}${wbdContext._sortTh('타수')}${wbdContext._sortTh('안타')}${wbdContext._sortTh('HR')}${wbdContext._sortTh(kLabel)}${wbdContext._sortTh('BB')}${wbdContext._sortTh('타율')}${wbdContext._sortTh('출루')}${wbdContext._sortTh('장타')}${wbdContext._sortTh('OPS')}${wbdContext._sortTh(evLabel)}
    </tr></thead><tbody>`;
  rows.forEach((r,i)=>{
    const baCol=r.ba>=0.400?'#39ff8a':r.ba>=0.300?'#a8e063':r.ba<=0.200?'#ff4560':'var(--text)';
    const opsCol=r.ops>=1.000?'#39ff8a':r.ops>=0.800?'#a8e063':r.ops<=0.600?'#ff4560':'var(--text)';
    html+=`<tr style="cursor:pointer" onclick="_h2hPick('${wbdContext._jsStr(r.self)}')">
      <td data-rank>${i+1}</td>
      <td style="font-weight:600">${wbdContext._esc(r.self)}</td>
      <td style="font-family:var(--mono)">${r.oppN}</td>
      <td style="font-family:var(--mono)">${r.PA}</td>
      <td style="font-family:var(--mono)">${r.AB}</td>
      <td style="font-family:var(--mono)">${r.hits}</td>
      <td style="font-family:var(--mono);color:${r.hrs>0?'#ff4560':'var(--muted)'}">${r.hrs}</td>
      <td style="font-family:var(--mono)">${r.K}</td>
      <td style="font-family:var(--mono)">${r.BB}</td>
      <td style="font-family:var(--mono);font-weight:700;color:${baCol}">${fmt3(r.ba)}</td>
      <td style="font-family:var(--mono)">${fmt3(r.obp)}</td>
      <td style="font-family:var(--mono)">${fmt3(r.slg)}</td>
      <td style="font-family:var(--mono);font-weight:700;color:${opsCol}">${fmt3(r.ops)}</td>
      <td style="font-family:var(--mono)">${r.avgEV?r.avgEV.toFixed(1):'-'}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';
  html+=`<div style="font-size:10px;color:var(--muted);text-align:center;padding:6px">※ ${isBat?'투수':'타자'} 상대 통합 성적 · 안타 정의는 기록실과 동일 · 활성 경기만 반영</div>`;
  el.innerHTML=html;
};

// Original index.html:14847
wbdContext._h2hPick = function _h2hPick(name){
  const psel=document.getElementById('h2h-player');
  if(psel){ psel.value=name; wbdContext.renderH2HPage(); const c=document.getElementById('h2h-content'); if(c)c.scrollIntoView({behavior:'smooth',block:'start'}); }
};

// Original index.html:14854
wbdContext.renderEmbeddedH2H = function renderEmbeddedH2H(containerId, mode){
  const box=document.getElementById(containerId); if(!box) return;
  const isBat = mode==='batter';
  const self = isBat ? wbdContext.currentBatter : wbdContext.currentPitcher;
  const st=wbdContext._embH2HState[containerId]||(wbdContext._embH2HState[containerId]={minPA:1,handF:''});
  if(!self){ box.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">${isBat?'타자':'투수'}를 선택하세요</div>`; return; }
  // 필터 바 + 결과 컨테이너 (한 번만 구성, 이후엔 결과만 갱신)
  const handOpts = isBat
    ? '<option value="">전체 투수</option><option value="R">우투 상대</option><option value="L">좌투 상대</option>'
    : '<option value="">전체 타자</option><option value="R">우타 상대</option><option value="L">좌타 상대</option>';
  box.innerHTML=`<div class="filter-row" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <span class="filter-label">최소 타석</span>
      <select id="${containerId}-minpa" onchange="_embH2HUpd('${containerId}','${mode}')">
        <option value="1">1+</option><option value="3">3+</option><option value="5">5+</option><option value="10">10+</option>
      </select>
      <span class="filter-label">손잡이</span>
      <select id="${containerId}-hand" onchange="_embH2HUpd('${containerId}','${mode}')">${handOpts}</select>
      <span style="font-size:11px;color:var(--muted)">· 현재 선택: <b style="color:var(--text)">${wbdContext._esc(self)}</b></span>
    </div>
    <div id="${containerId}-body"></div>`;
  const mp=document.getElementById(containerId+'-minpa'); if(mp) mp.value=String(st.minPA);
  const hs=document.getElementById(containerId+'-hand'); if(hs) hs.value=st.handF;
  wbdContext._renderH2HSingle(document.getElementById(containerId+'-body'), isBat, self, st.minPA, st.handF);
};

// Original index.html:14878
wbdContext._embH2HUpd = function _embH2HUpd(containerId, mode){
  const st=wbdContext._embH2HState[containerId]||(wbdContext._embH2HState[containerId]={minPA:1,handF:''});
  const mp=document.getElementById(containerId+'-minpa'); const hs=document.getElementById(containerId+'-hand');
  st.minPA=parseInt(mp&&mp.value)||1; st.handF=(hs&&hs.value)||'';
  const isBat=mode==='batter';
  const self=isBat?wbdContext.currentBatter:wbdContext.currentPitcher;
  wbdContext._renderH2HSingle(document.getElementById(containerId+'-body'), isBat, self, st.minPA, st.handF);
};

// Original index.html:14888
wbdContext.showH2HDetail = function showH2HDetail(mode,self,opp,handF){
  const isBat = mode==='batter';
  const all = isBat ? wbdContext.getBatterDataByName(self) : wbdContext.getPitcherDataByName(self);
  const oppKey = isBat ? 'pName' : 'bName';
  let arr = all.filter(d=>wbdContext._canonPlayer(d[oppKey])===String(opp));
  if(handF){ const hk=isBat?'pHand':'bHand'; arr=arr.filter(d=>String(d[hk]).toUpperCase()===handF); }
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const s=wbdContext._h2hSlash(arr);
  const pName = isBat?opp:self;   // 투수 이름
  const bName = isBat?self:opp;   // 타자 이름

  let html=`<div style="max-width:640px;margin:0 auto">
    <div style="font-size:18px;font-weight:800;margin-bottom:2px">🆚 ${wbdContext._esc(bName)} <span style="color:var(--muted);font-weight:400">vs</span> ${wbdContext._esc(pName)}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">${isBat?'🏏 타자':'⚾ 투수'} 시점 · ${arr.length}투구${handF?` · ${handF==='R'?'우':'좌'}${isBat?'투':'타'}만`:''}</div>`;

  if(s){
    const cells=[['타석',s.PA],['타수',s.AB],['안타',s.hits],['홈런',s.hrs],
      ['타율',fmt3(s.ba)],['출루',fmt3(s.obp)],['장타',fmt3(s.slg)],['OPS',fmt3(s.ops)],
      ['삼진',s.K],['볼넷',s.BB],['헛스윙%',s.whiffPct.toFixed(0)+'%'],['평균EV',s.avgEV?s.avgEV.toFixed(1):'-']];
    html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px">';
    cells.forEach(([l,v])=>{
      html+=`<div style="background:var(--card2);border-radius:6px;padding:8px 4px;text-align:center">
        <div style="font-size:9px;color:var(--muted)">${l}</div>
        <div style="font-family:var(--mono);font-size:15px;font-weight:700">${v}</div></div>`;
    });
    html+='</div>';

    // 구종별 스플릿
    const byG={};
    arr.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);(byG[g]=byG[g]||[]).push(d);});
    const grows=Object.entries(byG).map(([g,ga])=>{const gs=wbdContext._h2hSlash(ga);return {g,gs,n:ga.length};}).filter(x=>x.gs).sort((a,b)=>b.n-a.n);
    if(grows.length){
      html+=`<div style="font-size:12px;font-weight:700;margin:10px 0 4px">구종별 대응</div>
        <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>구종</th><th>투구</th><th>타수</th><th>안타</th><th>HR</th><th>타율</th><th>장타</th><th>헛%</th><th>EV</th></tr></thead><tbody>`;
      grows.forEach(({g,gs,n})=>{
        html+=`<tr><td style="color:${wbdContext.GROUP_COLORS[g]||'#888'};font-weight:600">${g}</td>
          <td style="font-family:var(--mono)">${n}</td><td style="font-family:var(--mono)">${gs.AB}</td>
          <td style="font-family:var(--mono)">${gs.hits}</td><td style="font-family:var(--mono)">${gs.hrs}</td>
          <td style="font-family:var(--mono);font-weight:700">${fmt3(gs.ba)}</td>
          <td style="font-family:var(--mono)">${fmt3(gs.slg)}</td>
          <td style="font-family:var(--mono)">${gs.whiffPct.toFixed(0)}%</td>
          <td style="font-family:var(--mono)">${gs.avgEV?gs.avgEV.toFixed(1):'-'}</td></tr>`;
      });
      html+='</tbody></table></div>';
    }
  }

  // 투구별 (최근순 = 삽입 역순, 최대 40)
  const srt=arr.slice().reverse();
  html+=`<div style="font-size:12px;font-weight:700;margin:12px 0 4px">투구 기록 <span style="font-size:10px;color:var(--muted);font-weight:400">(최근 ${Math.min(40,srt.length)}개)</span></div>
    <div class="tbl-wrap" style="max-height:300px;overflow-y:auto"><table class="data-table" style="font-size:11px"><thead><tr><th>이닝</th><th>카운트</th><th>구종</th><th>구속</th><th>결과</th><th>EV</th></tr></thead><tbody>`;
  srt.slice(0,40).forEach(d=>{
    const pg=wbdContext.pitchGroup(d.pType,d);
    const res=wbdContext.RESULT_NAMES[+d.result]||wbdContext.CALL_NAMES[+d.call]||'-';
    const resCol = +d.result===4?'#ff4560':wbdContext._isHit(d)?'#39ff8a':wbdContext._isWhiff(d)?'#ff8800':'var(--text)';
    html+=`<tr>
      <td>${d.inn}${d.half===1?'초':'말'}</td>
      <td style="font-family:var(--mono)">${d.ball||0}-${d.strk||0}</td>
      <td style="color:${wbdContext.GROUP_COLORS[pg]||'#888'}">${(wbdContext.PITCH_NAMES&&wbdContext.PITCH_NAMES[d.pType])||d.pType}</td>
      <td style="font-family:var(--mono)">${d.spdK||'-'}</td>
      <td style="color:${resCol}">${res}</td>
      <td style="font-family:var(--mono)">${+d.ev>0?d.ev:'-'}</td></tr>`;
  });
  html+='</tbody></table></div></div>';
  wbdContext.openModal(html);
};
}

export function initialize(wbdContext) {
// Original index.html:14532
wbdContext._h2hMode = 'batter';

// Original index.html:14853
wbdContext._embH2HState = {};
}
