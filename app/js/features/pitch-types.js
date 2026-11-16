/** pitch-types: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:16867
wbdContext._aggregatePitchTypeStats = function _aggregatePitchTypeStats(){
  // V10.2 perf: G 변경 전까지 메모이즈 — 구종 페이지 진입마다 1.7초 재계산하던 것 제거
  if(window._ptStatsMemo && window._ptStatsMemo._key === wbdContext.G.length) return window._ptStatsMemo;
  const groupStats={};  // {group: {pitches:N, count, ...}}
  const playerByGroup={};  // {group: {pName: {...}}}
  
  wbdContext.G.forEach(d=>{
    if(!d.pName||d.pType==null)return;
    if(wbdContext._isDummyPitch(d)) return;  // Forfeit 더미 제외
    const g=wbdContext.pitchGroup(d.pType,d);
    if(!g||g==='기타')return;
    
    if(!groupStats[g])groupStats[g]={
      pitches:0, fbCount:0,
      spdSum:0, spdN:0,
      sHSum:0, sVSum:0, movN:0,
      gyroSum:0, gyroN:0,
      swing:0, whiff:0, called:0,
      contact:0, foul:0, hit:0, hr:0, hbp:0, walk:0,
      ab:0, evSum:0, evN:0, hardHit:0, barrel:0,
      inZone:0, outZone:0
    };
    const s=groupStats[g];
    s.pitches++;
    
    if(d.spdK>0){s.spdSum+=+d.spdK;s.spdN++;}
    const sH=+d.sH||0, sV=+d.sV||0;
    if(sH||sV){s.sHSum+=Math.abs(sH);s.sVSum+=Math.abs(sV);s.movN++;}
    // 자이로 (0은 자이로 모드 OFF로 간주, 집계 제외)
    if(d.gyro!=null && d.gyro!=='' && +d.gyro!==0){s.gyroSum+=Math.abs(+d.gyro);s.gyroN++;}
    
    // 스윙/헛스윙
    if(d.bSwing){s.swing++;}
    // 헛스윙: 스윙했는데 컨택 안 됨 (call!==2) — 스트존 헛스윙(call=0) + 볼존 헛스윙(call=4) 모두 포함
    if(d.bSwing && +d.call!==2){
      s.whiff++;
    }
    if(+d.call===0)s.called++; // 콜드 스트라이크 판정 (단, bSwing=0이어야 진짜 콜드)
    // ※ V9.7 버그픽스: call===2는 인플레이 타구(컨택)이지 진짜 안타 아님
    // 진짜 안타 = 1BSafe===1 || result===4 → 아래 isHit로 처리
    if(+d.call===2) s.battedBall = (s.battedBall||0) + 1;  // 인플레이 컨택 별도 카운터
    // 컨택 (파울 등): 스윙해서 컨택 (call===2)
    if(d.bSwing && +d.call===2) s.contact++;
    
    // 결과 (정확한 로직: 1BSafe=1 또는 result===4 = 안타)
    const res=+d.result;
    const is1BSafe=+d['1BSafe']===1;
    const isHR=res===4;
    const isHit=is1BSafe||isHR;
    if(res===3)s.foul++;
    if(isHR)s.hr++;
    if(isHit)s.hit++;
    if(res===5)s.walk++;
    if(res===6)s.hbp++;
    
    // AB: 안타 or 인플레이 아웃 (FlyOut=1, GroundBall=2) or HR + K (표준 sabermetrics)
    const isK = (wbdContext._isK(d));
    if(isHit || res===1 || res===2 || isK){
      s.ab++;
    }
    // RV (Run Value) 누적 - 구종 가치 계산용 (CRV: Count-based Run Value)
    if(!s.rv) s.rv = 0;
    s.rv += -wbdContext._crvOfPitch(d);  // CRV는 투수 입장 (양수=좋음), 누적은 RV(타자 입장)로 → 부호 반전
    
    // EV / 하드힛 / 배럴
    if(wbdContext._isInPlay(d)){
      s.evSum+=+d.ev;s.evN++;
      if(wbdContext._isHardHit(d))s.hardHit++;
      if(wbdContext._isBarrel(d))s.barrel++;
      if(d.ldeg!=null){s.laSum=(s.laSum||0)+(+d.ldeg);s.laN=(s.laN||0)+1;}
      if(wbdContext._isHHPlus(d))s.hhp=(s.hhp||0)+1;
      if(wbdContext._isBarrelPlus(d))s.brlp=(s.brlp||0)+1;
    }
    
    // 존
    const zx=+d.zoneX, zy=+d.zoneY;
    if(zx>=-1 && zx<=1 && zy>=-1 && zy<=1)s.inZone++;
    else s.outZone++;
    
    // 투수별 집계
    if(!playerByGroup[g])playerByGroup[g]={};
    if(!playerByGroup[g][d.pName])playerByGroup[g][d.pName]={
      pitches:0, spdSum:0, spdN:0,
      sHSum:0, sVSum:0, movN:0,
      gyroSum:0, gyroN:0,
      swing:0, whiff:0,
      hit:0, ab:0, hr:0,
      evSum:0, evN:0, hardHit:0, barrel:0,
      inZone:0
    };
    const ps=playerByGroup[g][d.pName];
    ps.pitches++;
    if(d.spdK>0){ps.spdSum+=+d.spdK;ps.spdN++;}
    if(sH||sV){ps.sHSum+=Math.abs(sH);ps.sVSum+=Math.abs(sV);ps.movN++;}
    if(d.gyro!=null && d.gyro!=='' && +d.gyro!==0){ps.gyroSum+=Math.abs(+d.gyro);ps.gyroN++;}
    if(d.bSwing)ps.swing++;
    if((d.bSwing && +d.call!==2))ps.whiff++;
    // 안타/AB (정확한 로직)
    const pIs1BSafe=+d['1BSafe']===1;
    const pIsHR=res===4;
    const pIsHit=pIs1BSafe||pIsHR;
    if(pIsHit)ps.hit++;
    if(pIsHR)ps.hr++;
    const pIsK = (wbdContext._isK(d));
    if(pIsHit || res===1 || res===2 || pIsK)ps.ab++;
    // RV
    if(!ps.rv) ps.rv = 0;
    ps.rv += -wbdContext._crvOfPitch(d);  // CRV (투수 양수=좋음) → RV(타자 양수=좋음)로 부호 반전
    if(wbdContext._isInPlay(d)){
      ps.evSum+=+d.ev;ps.evN++;
      if(wbdContext._isHardHit(d))ps.hardHit++;
      if(wbdContext._isBarrel(d))ps.barrel++;
      if(d.ldeg!=null){ps.laSum=(ps.laSum||0)+(+d.ldeg);ps.laN=(ps.laN||0)+1;}
      if(wbdContext._isHHPlus(d))ps.hhp=(ps.hhp||0)+1;
      if(wbdContext._isBarrelPlus(d))ps.brlp=(ps.brlp||0)+1;
    }
    if(zx>=-1 && zx<=1 && zy>=-1 && zy<=1)ps.inZone++;
  });
  
  window._ptStatsMemo = {groupStats, playerByGroup, _key: wbdContext.G.length};
  return window._ptStatsMemo;
};

// Original index.html:16991
wbdContext.setMetaSort = function setMetaSort(key){
  // 낮을수록 좋은 지표는 첫 클릭 시 오름차순 시작
  const ascDefault = ['ba', 'avgEv', 'hhPct', 'brlPct'].includes(key);
  if(window._metaSortKey === key){
    // 같은 컬럼 클릭 → 방향 토글
    window._metaSortDir = window._metaSortDir === 'desc' ? 'asc' : 'desc';
  } else {
    window._metaSortKey = key;
    window._metaSortDir = ascDefault ? 'asc' : 'desc';
  }
  wbdContext.renderPitchTypePage();
};

// Original index.html:17004
wbdContext.renderPitchTypePage = function renderPitchTypePage(){
  const out=document.getElementById('pitchtype-content');
  if(!out)return;
  if(!wbdContext.G.length){
    out.innerHTML='<div style="padding:60px 20px;text-align:center;background:var(--card);border-radius:8px"><div style="font-size:64px;margin-bottom:14px">📂</div><div style="font-size:16px;font-weight:700">데이터가 없어요</div><div style="font-size:12px;color:var(--muted);margin-top:6px">경기 데이터를 추가하면 구종별 분석이 가능합니다</div></div>';
    return;
  }
  
  const {groupStats, playerByGroup}=wbdContext._aggregatePitchTypeStats();
  const groups=Object.keys(groupStats).sort((a,b)=>groupStats[b].pitches-groupStats[a].pitches);
  
  // 첫 진입 시 가장 많이 던진 구종 자동 선택
  if(!window._pitchTypeState.selectedGroup || !groups.includes(window._pitchTypeState.selectedGroup)){
    window._pitchTypeState.selectedGroup=groups[0];
  }
  const selected=window._pitchTypeState.selectedGroup;
  const stats=groupStats[selected]||{};
  
  // 구종 색상 매핑
  const groupColors={
    '포심':'#ff4560','투심':'#ff8c44','커터':'#ffd700','싱커':'#88ccff',
    '슬라이더':'#39ff8a','커브':'#2196f3','스플리터':'#cc44ff','스크류':'#ff6b8a',
    '체인지업':'#aa88ff','라이즈 체인지업':'#bb99ff','써클 체인지업':'#9977dd',
    '페이드 체인지업':'#cc99ee','드롭 체인지업':'#aa77cc',
    '라이징':'#ff9988','라이징 슬라이더':'#7fdf9f','라이징 싱커':'#99ddff',
    '드롭':'#5588ff','패스트볼':'#ffaa66','너클볼':'#ddd'
  };
  const gColor=groupColors[selected]||'#88ccff';
  
  // ─── 헤더: 구종 선택 칩 ───
  let html=`<div style="margin-bottom:14px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px;letter-spacing:0.5px">구종 선택 (사용량 순)</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px">
      ${groups.map(g=>{
        const col=groupColors[g]||'#88ccff';
        const isSel=g===selected;
        const usagePct=((groupStats[g].pitches/wbdContext.G.length)*100).toFixed(1);
        return `<button onclick="window._pitchTypeState.selectedGroup='${g}';renderPitchTypePage()" style="background:${isSel?col:'var(--card2)'};color:${isSel?'#000':col};border:1.5px solid ${col};padding:6px 12px;border-radius:6px;font-size:12px;font-weight:${isSel?'800':'600'};cursor:pointer;transition:all .15s">${g} <span style="opacity:0.7;font-size:10px">${usagePct}%</span></button>`;
      }).join('')}
    </div>
  </div>`;
  
  // ═════════════════════════════════════════════════════════
  // ─── 🔥 V9.9 구종 메타 보드 — 4 KPI + 컴팩트 테이블 ───
  // ═════════════════════════════════════════════════════════
  // 모든 구종 분석 (표본 < 50은 "표본" 티어로 별도 표시)
  // V10.2 perf: 그룹마다 G×pitchGroup 풀스캔(8그룹×7만=57만 호출) → 1패스 분류 + 메모
  let _ptByGroup = window._ptByGroupMemo;
  if(!_ptByGroup || _ptByGroup._key !== wbdContext.G.length){
    _ptByGroup = {_key: wbdContext.G.length};
    for(let _j=0; _j<wbdContext.G.length; _j++){
      const d = wbdContext.G[_j];
      if(d.pType == null || wbdContext._isDummyPitch(d)) continue;
      const _g = wbdContext.pitchGroup(d.pType, d);
      (_ptByGroup[_g] = _ptByGroup[_g] || []).push(d);
    }
    window._ptByGroupMemo = _ptByGroup;
  }
  const metaRowsAll = groups.map(g => {
    const s = groupStats[g];
    const groupPs = _ptByGroup[g] || [];
    const xpv = wbdContext._xPvSum(groupPs);
    const xpvPlus = wbdContext._xPvPlusSum(groupPs);
    const pv = -(s.rv||0);
    const xpv100 = s.pitches > 0 ? xpv/s.pitches*100 : 0;
    const xpvPlus100 = s.pitches > 0 ? xpvPlus/s.pitches*100 : 0;
    const pv100 = s.pitches > 0 ? pv/s.pitches*100 : 0;
    const pvDiff100 = pv100 - xpv100;
    // 체이스% — 스트존 밖(call=4 발생 가능) + 스윙 비율 (근사)
    // call=4는 볼존 헛스윙. 볼존에서의 스윙 비율 추정
    const chasePitches = groupPs.filter(d => +d.call === 4 || (d.bSwing && +d.call === 4)).length;
    // 정확한 체이스% 계산: bSwing이고 볼존(call=1 or 4)인 비율
    // 단순화: 헛스윙 중 볼존 비율
    const totalSwingsBall = groupPs.filter(d => d.bSwing && (+d.call === 4 || +d.call === 1)).length;
    const totalBallZone = groupPs.filter(d => +d.call === 1 || +d.call === 4).length;
    const chasePct = totalBallZone > 0 ? totalSwingsBall/totalBallZone*100 : null;
    const pitcherSet = new Set(groupPs.map(p => p.pName).filter(Boolean));
    return {
      g, n: s.pitches,
      pitchers: pitcherSet.size,
      usage: s.pitches / wbdContext.G.length * 100,
      avgSpd: s.spdN>0 ? s.spdSum/s.spdN : null,
      ba: s.ab>0 ? s.hit/s.ab : null,
      whiffPct: s.swing>0 ? s.whiff/s.swing*100 : null,
      chasePct,
      brlPct: s.evN>0 ? s.barrel/s.evN*100 : null,
      hhPct: s.evN>0 ? s.hardHit/s.evN*100 : null,
      avgEv: s.evN>0 ? s.evSum/s.evN : null,
      xpv100, xpvPlus100, pv100, pvDiff100,
      smallSample: s.pitches < 50
    };
  }).filter(r => r.n > 0);

  // 표본 충분 + 부족 분리
  // V9.9: 메타 보드 정렬 (전역 상태 — 기본 xPV+/100 내림차순)
  window._metaSortKey = window._metaSortKey || 'xpvPlus100';
  window._metaSortDir = window._metaSortDir || 'desc';
  const _mk = window._metaSortKey, _md = window._metaSortDir;
  const _metaSort = (a, b) => {
    let va = a[_mk], vb = b[_mk];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;  // null은 항상 마지막
    if (vb == null) return -1;
    return _md === 'desc' ? vb - va : va - vb;
  };
  const metaRowsValid = metaRowsAll.filter(r => !r.smallSample).sort(_metaSort);
  const metaRowsSmall = metaRowsAll.filter(r => r.smallSample).sort(_metaSort);

  // 메타 등급 (xPV+/100 기준)
  function metaTier(v, isSmall){
    if(isSmall) return {tier:'표본', col:'#607080', label:'표본 부족'};
    if(v >= 1.0) return {tier:'S', col:'#ffd700', label:'메타 최상'};
    if(v >= 0.4) return {tier:'A', col:'#39ff8a', label:'평균 이상'};
    if(v >= -0.4) return {tier:'B', col:'#88ccff', label:'평균'};
    if(v >= -1.0) return {tier:'C', col:'#ff8c44', label:'주의'};
    return {tier:'D', col:'#ff4560', label:'비효율'};
  }

  if(metaRowsValid.length > 0 || metaRowsSmall.length > 0){
    // 4개 KPI 추출
    const topMeta = metaRowsValid[0] || metaRowsAll[0];  // xPV+/100 최고 = 현 메타 1위
    const topWhiff = [...metaRowsValid].filter(r => r.whiffPct != null).sort((a,b) => b.whiffPct - a.whiffPct)[0];  // 헛스윙 무기
    const topBA = [...metaRowsValid].filter(r => r.ba != null).sort((a,b) => a.ba - b.ba)[0];  // 피격 억제 (피BA 최저)
    const topLuck = [...metaRowsValid].sort((a,b) => Math.abs(b.pvDiff100) - Math.abs(a.pvDiff100))[0];  // 회귀 체크 (운/100 절댓값 최고)

    const kpiCard = (label, row, valLabel, valStr, valColor, subText) => {
      if(!row) return '';
      const t = metaTier(row.xpvPlus100, row.smallSample);
      const col = groupColors[row.g] || '#88ccff';
      return `<div style="background:var(--card2);border:1px solid var(--border);border-left:3px solid ${t.col};border-radius:6px;padding:11px 13px;flex:1 1 200px;min-width:180px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px;margin-bottom:4px">${label}</div>
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:2px">
          <span style="color:${col};font-weight:800;font-size:17px">${row.g}</span>
          <span style="background:${t.col};color:#000;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:800">${t.tier}</span>
        </div>
        <div style="color:${valColor};font-weight:800;font-size:21px;font-family:var(--mono);letter-spacing:0.5px;margin-bottom:2px">${valStr}</div>
        <div style="font-size:10px;color:var(--muted)">${subText}</div>
      </div>`;
    };

    html += `<div style="background:linear-gradient(135deg,rgba(245,166,35,0.06),rgba(34,168,255,0.04));border:1px solid var(--border);border-left:3px solid var(--amber);border-radius:8px;padding:16px 18px;margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap">
        <div style="font-size:15px;font-weight:700;color:var(--amber)">🎯 구종 메타 보드</div>
        <div style="font-size:11px;color:var(--muted)">활성 CSV 기준 · xPV+/100 중심 · ${metaRowsAll.length}개 구종</div>
        <div style="margin-left:auto;font-size:10.5px;color:var(--muted)">티어는 기대가치·헛스윙·피BA·타구질을 합산</div>
      </div>
      
      <!-- 4 KPI 카드 -->
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin:14px 0">
        ${topMeta ? kpiCard('현 메타 1위', topMeta, '', `${topMeta.xpvPlus100>0?'+':''}${topMeta.xpvPlus100.toFixed(2)}`, '#39ff8a', `100구 · 메타 ${metaTier(topMeta.xpvPlus100, topMeta.smallSample).label}`) : ''}
        ${topWhiff ? kpiCard('헛스윙 무기', topWhiff, '', `${topWhiff.whiffPct.toFixed(1)}%`, '#ff4560', `${topWhiff.n}구 · CSW ${(topWhiff.whiffPct).toFixed(1)}%`) : ''}
        ${topBA ? kpiCard('피격 억제', topBA, '', topBA.ba.toFixed(3), '#39ff8a', `${topBA.n}구 · EV ${topBA.avgEv!=null?topBA.avgEv.toFixed(1):'-'}`) : ''}
        ${topLuck ? kpiCard('회귀 체크', topLuck, '', `${topLuck.pvDiff100>0?'+':''}${topLuck.pvDiff100.toFixed(2)}`, topLuck.pvDiff100>0?'#ffd700':'#88ccff', `운/100 · xPV+ ${topLuck.xpvPlus100>0?'+':''}${topLuck.xpvPlus100.toFixed(2)}`) : ''}
      </div>
      
      <!-- 메타 테이블 -->
      <div style="overflow-x:auto">
      <table class="data-table gtable" style="width:100%;min-width:1100px">
        <thead><tr>
          <th style="width:48px">티어</th>
          <th>구종</th>
          <th onclick="setMetaSort('usage')" title="전체 투구 중 사용 비율 (클릭 정렬)" style="cursor:pointer">사용률${_mk==='usage'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('n')" title="투구 수 (클릭 정렬)" style="cursor:pointer">투구${_mk==='n'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('pitchers')" title="이 구종을 던지는 투수 수 (클릭 정렬)" style="cursor:pointer">투수${_mk==='pitchers'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('xpvPlus100')" title="100투구당 리그 평균 대비 기대 PV — 메타 핵심 지표 (클릭 정렬)" style="cursor:pointer">xPV+/100${_mk==='xpvPlus100'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('pv100')" title="100투구당 실제 PV (클릭 정렬)" style="cursor:pointer">PV/100${_mk==='pv100'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('pvDiff100')" title="PV - xPV / 100. 양수=운, 음수=불운 (클릭 정렬)" style="cursor:pointer">운/100${_mk==='pvDiff100'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('ba')" title="피안타율 — 낮을수록 좋음 (클릭 정렬, 기본 오름차순)" style="cursor:pointer">피BA${_mk==='ba'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('whiffPct')" title="헛스윙률 — 높을수록 좋음 (클릭 정렬)" style="cursor:pointer">헛스윙%${_mk==='whiffPct'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('chasePct')" title="볼존 스윙률 — 높을수록 좋음 (클릭 정렬)" style="cursor:pointer">체이스%${_mk==='chasePct'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('avgEv')" title="평균 타구속도 — 낮을수록 좋음 (클릭 정렬, 기본 오름차순)" style="cursor:pointer">평균EV${_mk==='avgEv'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('hhPct')" title="하드힛 % (EV≥110) — 낮을수록 좋음 (클릭 정렬, 기본 오름차순)" style="cursor:pointer">HH%${_mk==='hhPct'?(_md==='desc'?' ▼':' ▲'):''}</th>
          <th onclick="setMetaSort('brlPct')" title="배럴 % (EV≥105 + 발사각 8~32°) — 낮을수록 좋음 (클릭 정렬, 기본 오름차순)" style="cursor:pointer">배럴%${_mk==='brlPct'?(_md==='desc'?' ▼':' ▲'):''}</th>
        </tr></thead>
        <tbody>
          ${[...metaRowsValid, ...metaRowsSmall].map(r => {
            const t = metaTier(r.xpvPlus100, r.smallSample);
            const col = groupColors[r.g] || '#88ccff';
            const baCol = r.ba == null ? 'var(--muted)' : r.ba <= 0.250 ? '#39ff8a' : r.ba <= 0.350 ? '#88cc44' : r.ba <= 0.450 ? '#ff8800' : '#ff4560';
            const whCol = r.whiffPct == null ? 'var(--muted)' : r.whiffPct >= 40 ? '#39ff8a' : r.whiffPct >= 30 ? '#88cc44' : r.whiffPct >= 20 ? '#ff8800' : '#ff4560';
            const chaseCol = r.chasePct == null ? 'var(--muted)' : r.chasePct >= 35 ? '#39ff8a' : r.chasePct >= 25 ? '#88cc44' : 'var(--text)';
            const brlCol = r.brlPct == null ? 'var(--muted)' : r.brlPct <= 5 ? '#39ff8a' : r.brlPct <= 10 ? '#88cc44' : r.brlPct <= 18 ? '#ff8800' : '#ff4560';
            const hhCol = r.hhPct == null ? 'var(--muted)' : r.hhPct <= 25 ? '#39ff8a' : r.hhPct <= 35 ? '#88cc44' : r.hhPct <= 45 ? '#ff8800' : '#ff4560';
            const evCol = r.avgEv == null ? 'var(--muted)' : r.avgEv <= 95 ? '#39ff8a' : r.avgEv <= 100 ? '#88cc44' : r.avgEv <= 105 ? '#ff8800' : '#ff4560';
            const xpvPlusCol = r.xpvPlus100 > 0.4 ? '#39ff8a' : r.xpvPlus100 < -0.4 ? '#ff4560' : 'var(--text)';
            const pv100Col = r.pv100 > 0.5 ? '#39ff8a' : r.pv100 < -0.5 ? '#ff4560' : 'var(--text)';
            const luckCol = r.pvDiff100 > 1 ? '#ffd700' : r.pvDiff100 < -1 ? '#88ccff' : 'var(--muted)';
            const tierBadge = r.smallSample 
              ? `<span style="background:transparent;border:1px solid ${t.col};color:${t.col};padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:700">${t.tier}</span>`
              : `<span style="background:${t.col};color:#000;padding:1px 7px;border-radius:8px;font-size:10px;font-weight:800">${t.tier}</span>`;
            return `<tr style="cursor:pointer" onclick="window._pitchTypeState.selectedGroup='${r.g}';renderPitchTypePage()" title="${r.g} 상세 보기">
              <td style="text-align:center">${tierBadge}</td>
              <td style="color:${col};font-weight:700">${r.g} <span style="color:var(--muted);font-size:9.5px;font-weight:400">${t.label}</span></td>
              <td>${r.usage.toFixed(1)}%</td>
              <td>${r.n.toLocaleString()}</td>
              <td>${r.pitchers}</td>
              <td style="color:${xpvPlusCol};font-family:var(--mono);font-weight:700">${r.xpvPlus100>0?'+':''}${r.xpvPlus100.toFixed(2)}</td>
              <td style="color:${pv100Col};font-family:var(--mono)">${r.pv100>0?'+':''}${r.pv100.toFixed(2)}</td>
              <td style="color:${luckCol};font-family:var(--mono)">${r.pvDiff100>0?'+':''}${r.pvDiff100.toFixed(2)}</td>
              <td style="color:${baCol};font-weight:600">${r.ba!=null?r.ba.toFixed(3):'-'}</td>
              <td style="color:${whCol};font-weight:600">${r.whiffPct!=null?r.whiffPct.toFixed(1)+'%':'-'}</td>
              <td style="color:${chaseCol}">${r.chasePct!=null?r.chasePct.toFixed(1)+'%':'-'}</td>
              <td style="color:${evCol}">${r.avgEv!=null?r.avgEv.toFixed(1):'-'}</td>
              <td style="color:${hhCol}">${r.hhPct!=null?r.hhPct.toFixed(1)+'%':'-'}</td>
              <td style="color:${brlCol}">${r.brlPct!=null?r.brlPct.toFixed(1)+'%':'-'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>`;
  }
  
  // ─── 선택된 구종의 전체 통계 ───
  const avgSpd=stats.spdN>0?(stats.spdSum/stats.spdN).toFixed(1):'-';
  const avgSH=stats.movN>0?(stats.sHSum/stats.movN).toFixed(1):'-';
  const avgSV=stats.movN>0?(stats.sVSum/stats.movN).toFixed(1):'-';
  const avgMov=stats.movN>0?(((stats.sHSum+stats.sVSum)/stats.movN)/2).toFixed(1):'-';
  const avgGyro=stats.gyroN>0?(stats.gyroSum/stats.gyroN).toFixed(1):'-';
  const whiffPct=stats.swing>0?(stats.whiff/stats.swing*100).toFixed(1):'-';
  const csw=stats.pitches>0?((stats.whiff+stats.called)/stats.pitches*100).toFixed(1):'-';
  const ba=stats.ab>0?(stats.hit/stats.ab).toFixed(3):'-';
  const hrRate=stats.pitches>0?(stats.hr/stats.pitches*1000).toFixed(1):'-';
  const hhPct=stats.evN>0?(stats.hardHit/stats.evN*100).toFixed(1):'-';
  const brlPct=stats.evN>0?(stats.barrel/stats.evN*100).toFixed(1):'-';
  const avgEV=stats.evN>0?(stats.evSum/stats.evN).toFixed(1):'-';
  const inZonePct=stats.pitches>0?(stats.inZone/stats.pitches*100).toFixed(1):'-';
  // 구종 가치 (PV/xPV/xPV+) — 전체 그룹 데이터로 새 CRV 계산
  const groupAllPitches = wbdContext.G.filter(d => d.pType != null && wbdContext.pitchGroup(d.pType, d) === selected);
  const pvGroup = wbdContext._pvSum(groupAllPitches);
  const xpvGroup = wbdContext._xPvSum(groupAllPitches);
  const xpvPlusGroup = wbdContext._xPvPlusSum(groupAllPitches);
  const pv100Group = stats.pitches>0 ? pvGroup/stats.pitches*100 : 0;
  const xpv100Group = stats.pitches>0 ? xpvGroup/stats.pitches*100 : 0;
  const xpvPlus100Group = stats.pitches>0 ? xpvPlusGroup/stats.pitches*100 : 0;
  const pvDiffGroup = pvGroup - xpvGroup;
  const pvDiff100Group = stats.pitches>0 ? pvDiffGroup/stats.pitches*100 : 0;
  const pvColor = pvGroup > 7 ? '#39ff8a' : pvGroup < -7 ? '#ff4560' : '#aaaaaa';
  const pvLabel = pvGroup > 22 ? '엘리트' : pvGroup > 7 ? '플러스' : pvGroup > -7 ? '평균' : pvGroup > -22 ? '마이너스' : '부진';
  const xpvColor = xpvGroup > 7 ? '#39ff8a' : xpvGroup < -7 ? '#ff4560' : '#aaaaaa';
  const xpvPlusColor = xpvPlusGroup > 3 ? '#39ff8a' : xpvPlusGroup < -3 ? '#ff4560' : '#aaaaaa';
  const diffColor = pvDiffGroup > 5 ? '#ffd700' : pvDiffGroup < -5 ? '#88ccff' : '#aaaaaa';
  const diffLabel = pvDiffGroup > 5 ? '운 좋음' : pvDiffGroup < -5 ? '운 나쁨' : '실력대로';
  
  html+=`<div class="card section" style="margin-bottom:14px;border-left:4px solid ${gColor}">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <span style="font-size:24px;font-weight:900;color:${gColor}">${selected}</span>
      <span style="color:var(--muted);font-size:12px">전체 통계 · ${stats.pitches.toLocaleString()}구</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
      ${[
        {label:'⚡ 평균 구속',val:avgSpd+(avgSpd!=='-'?' km/h':''),color:'#ff8c44'},
        {label:'↔️ 횡변',val:avgSH+(avgSH!=='-'?' cm':''),color:'#88ccff'},
        {label:'↕️ 종변',val:avgSV+(avgSV!=='-'?' cm':''),color:'#39ff8a'},
        {label:'🌀 평균 무브',val:avgMov+(avgMov!=='-'?' cm':''),color:'#cc44ff'},
        {label:'⟳ 자이로',val:avgGyro+(avgGyro!=='-'?'°':''),color:'#ffd700'},
        {label:'🎯 존인 비율',val:inZonePct+(inZonePct!=='-'?'%':''),color:'#39ff8a'},
        {label:'❌ 헛스윙률',val:whiffPct+(whiffPct!=='-'?'%':''),color:'#ff4560'},
        {label:'⚡ CSW%',val:csw+(csw!=='-'?'%':''),color:'#cc44ff'},
        {label:'⚾ 피안타율',val:ba,color:'#ff8c44'},
        {label:'💥 피홈런 (per 1000)',val:hrRate,color:'#ff2020'},
        {label:'💪 평균 EV',val:avgEV+(avgEV!=='-'?' mph':''),color:'#88ccff'},
        {label:'🔨 하드힛%',val:hhPct+(hhPct!=='-'?'%':''),color:'#ff5500'},
        {label:'🎯 배럴%',val:brlPct+(brlPct!=='-'?'%':''),color:'#ff2020'},
        {label:'⚖️ 구종 가치 (PV, '+pvLabel+')',val:(pvGroup>0?'+':'')+pvGroup.toFixed(1),color:pvColor},
        {label:'🎯 기대 가치 (xPV)',val:(xpvGroup>0?'+':'')+xpvGroup.toFixed(1),color:xpvColor},
        {label:'⭐ xPV+ (리그 평균 대비)',val:(xpvPlusGroup>0?'+':'')+xpvPlusGroup.toFixed(1),color:xpvPlusColor},
        {label:'🍀 운 ('+diffLabel+')',val:(pvDiffGroup>0?'+':'')+pvDiffGroup.toFixed(1),color:diffColor},
        {label:'📊 PV/100',val:(pv100Group>0?'+':'')+pv100Group.toFixed(2),color:pvColor},
        {label:'📈 xPV/100',val:(xpv100Group>0?'+':'')+xpv100Group.toFixed(2),color:xpvColor},
        {label:'🌟 xPV+/100',val:(xpvPlus100Group>0?'+':'')+xpvPlus100Group.toFixed(2),color:xpvPlusColor},
        {label:'💫 운/100',val:(pvDiff100Group>0?'+':'')+pvDiff100Group.toFixed(2),color:diffColor}
      ].map(s=>`<div style="background:var(--card2);padding:10px;border-radius:5px;border-left:2px solid ${s.color}">
        <div style="font-size:10px;color:var(--muted);margin-bottom:3px">${s.label}</div>
        <div style="font-size:16px;font-weight:800;color:${s.color};font-family:var(--mono)">${s.val}</div>
      </div>`).join('')}
    </div>
  </div>`;
  
  // ─── 투수별 랭킹 테이블 ───
  const playersInGroup=playerByGroup[selected]||{};
  const minP=window._pitchTypeState.minPitches;
  const sortKey=window._pitchTypeState.sortKey;
  const sortDir=window._pitchTypeState.sortDir;
  
  // xPV/xPV+ 계산용 - 각 투수의 (그 구종) 데이터를 G에서 필터링
  const rows=Object.entries(playersInGroup)
    .filter(([n,s])=>s.pitches>=minP)
    .map(([name,s])=>{
      const playerPitches = wbdContext.getPitcherDataByName(name).filter(d => wbdContext.pitchGroup(d.pType, d) === selected);
      const xpv = wbdContext._xPvSum(playerPitches);
      const xpvPlus = wbdContext._xPvPlusSum(playerPitches);
      const pv = -(s.rv||0);
      const pvDiff = pv - xpv;
      return {
        name,
        team:wbdContext._playerTeam(name,'pitcher')||'',
        pitches:s.pitches,
        usage:s.pitches,
        spd:s.spdN>0?s.spdSum/s.spdN:0,
        mov:s.movN>0?(s.sHSum+s.sVSum)/s.movN/2:0,
        sH:s.movN>0?s.sHSum/s.movN:0,
        sV:s.movN>0?s.sVSum/s.movN:0,
        gyro:s.gyroN>0?s.gyroSum/s.gyroN:0,
        whiffPct:s.swing>0?s.whiff/s.swing*100:0,
        ba:s.ab>0?s.hit/s.ab:0,
        hr:s.hr,
        hhPct:s.evN>0?s.hardHit/s.evN*100:0,
        brlPct:s.evN>0?s.barrel/s.evN*100:0,
        hhpPct:s.evN>0?(s.hhp||0)/s.evN*100:0,
        brlpPct:s.evN>0?(s.brlp||0)/s.evN*100:0,
        avgLA:s.laN>0?(s.laSum||0)/s.laN:null,
        inZonePct:s.pitches>0?s.inZone/s.pitches*100:0,
        pv: pv,
        xpv: xpv,
        xpvPlus: xpvPlus,
        pvDiff: pvDiff,  // 양수=운 좋음, 음수=운 나쁨
        pv100: s.pitches>0 ? pv / s.pitches * 100 : 0,
        xpv100: s.pitches>0 ? xpv / s.pitches * 100 : 0,
        xpvPlus100: s.pitches>0 ? xpvPlus / s.pitches * 100 : 0,  // ⭐ 신규
        pvDiff100: s.pitches>0 ? pvDiff / s.pitches * 100 : 0  // 운/100
      };
    });
  
  rows.sort((a,b)=>{
    const va=a[sortKey]||0, vb=b[sortKey]||0;
    return sortDir==='desc'?vb-va:va-vb;
  });
  
  const setSort=(k)=>`window._pitchTypeState.sortDir=(window._pitchTypeState.sortKey==='${k}'&&window._pitchTypeState.sortDir==='desc')?'asc':'desc';window._pitchTypeState.sortKey='${k}';renderPitchTypePage()`;
  const sortIcon=(k)=>sortKey===k?(sortDir==='desc'?' ▼':' ▲'):'';
  
  html+=`<div class="card section">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap">
      <span class="card-title" style="margin:0">📋 ${selected} 투수별 랭킹</span>
      <span style="color:var(--muted);font-size:11px;margin-left:8px">${rows.length}명 · 최소 ${minP}구 이상</span>
      <div style="margin-left:auto;display:flex;align-items:center;gap:6px">
        <span style="font-size:11px;color:var(--muted)">최소 투구수</span>
        <select onchange="window._pitchTypeState.minPitches=+this.value;renderPitchTypePage()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:4px;font-size:11px">
          ${[5,10,20,30,50,100].map(v=>`<option value="${v}"${v===minP?' selected':''}>${v}구</option>`).join('')}
        </select>
      </div>
    </div>
    
    ${rows.length===0?`<div style="padding:40px 20px;text-align:center;color:var(--muted);font-size:12px">조건을 만족하는 투수가 없습니다. 최소 투구수를 줄여보세요.</div>`:`
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch">
      <table class="data-table gtable compact" style="font-size:11px;min-width:1260px;white-space:nowrap">
        <thead>
          <tr>
            <th style="text-align:left">이름</th>
            <th style="text-align:left">팀</th>
            <th onclick="${setSort('pitches')}" title="투구수">투구${sortIcon('pitches')}</th>
            <th onclick="${setSort('spd')}" title="평균 구속 (km/h)">구속${sortIcon('spd')}</th>
            <th onclick="${setSort('sH')}" title="평균 수평 회전 (cm)">횡변${sortIcon('sH')}</th>
            <th onclick="${setSort('sV')}" title="평균 수직 회전 (cm)">종변${sortIcon('sV')}</th>
            <th onclick="${setSort('mov')}" title="평균 무브먼트 (횡+종)/2 (cm)">무브${sortIcon('mov')}</th>
            <th onclick="${setSort('gyro')}" title="평균 자이로 (°)">자이로${sortIcon('gyro')}</th>
            <th onclick="${setSort('inZonePct')}" title="존인 비율 (%)">존인%${sortIcon('inZonePct')}</th>
            <th onclick="${setSort('whiffPct')}" title="헛스윙률 (스윙 대비)">헛스윙%${sortIcon('whiffPct')}</th>
            <th onclick="${setSort('ba')}" title="피안타율">피안타율${sortIcon('ba')}</th>
            <th onclick="${setSort('hr')}" title="피홈런 (개수)">피HR${sortIcon('hr')}</th>
            <th onclick="${setSort('hhPct')}" title="하드힛% (EV≥110)">HH%${sortIcon('hhPct')}</th>
            <th onclick="${setSort('brlPct')}" title="배럴% (EV≥105 + 8~32°)">배럴%${sortIcon('brlPct')}</th>
            <th onclick="${setSort('hhpPct')}" title="HH+% (EV≥125 허용률)">HH+%${sortIcon('hhpPct')}</th>
            <th onclick="${setSort('brlpPct')}" title="배럴+% (EV≥125 & LA20~40°, 홈런 96% 존)">배럴+%${sortIcon('brlpPct')}</th>
            <th onclick="${setSort('avgLA')}" title="평균 피발사각">피LA${sortIcon('avgLA')}</th>
            <th onclick="${setSort('pv100')}" title="100투구당 PV (실제)">PV/100${sortIcon('pv100')}</th>
            <th onclick="${setSort('xpv100')}" title="100투구당 xPV (기대치)">xPV/100${sortIcon('xpv100')}</th>
            <th onclick="${setSort('xpvPlus100')}" title="100투구당 xPV+ (리그 평균 대비)">xPV+/100${sortIcon('xpvPlus100')}</th>
            <th onclick="${setSort('pvDiff100')}" title="100투구당 운 (PV-xPV)">운/100${sortIcon('pvDiff100')}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i)=>{
            const safeN=String(r.name).replace(/'/g,"\\'");
            return `<tr onclick="openCardDetail('${safeN}','pitcher')">
              <td style="font-weight:700;color:${gColor}">${i+1}. ${r.name}</td>
              <td style="color:var(--muted)">${r.team}</td>
              <td>${r.pitches}</td>
              <td style="color:#ff8c44;font-weight:600">${r.spd?r.spd.toFixed(1):'-'}</td>
              <td style="color:#88ccff">${r.sH?r.sH.toFixed(1):'-'}</td>
              <td style="color:#39ff8a">${r.sV?r.sV.toFixed(1):'-'}</td>
              <td style="color:#cc44ff;font-weight:600">${r.mov?r.mov.toFixed(1):'-'}</td>
              <td style="color:#ffd700">${r.gyro?r.gyro.toFixed(1):'-'}</td>
              <td>${r.inZonePct?r.inZonePct.toFixed(1):'-'}</td>
              <td style="color:${r.whiffPct>30?'#ff4560':'inherit'};font-weight:${r.whiffPct>30?'700':'400'}">${r.whiffPct?r.whiffPct.toFixed(1):'-'}</td>
              <td style="color:${r.ba<0.300?'#39ff8a':r.ba>0.420?'#ff4560':'inherit'}">${r.ba?r.ba.toFixed(3):'-'}</td>
              <td>${r.hr}</td>
              <td style="color:${r.hhPct>25?'#ff4560':'inherit'}">${r.hhPct?r.hhPct.toFixed(1):'-'}</td>
              <td style="color:${r.brlPct>10?'#ff2020':'inherit'}">${r.brlPct?r.brlPct.toFixed(1):'-'}</td>
              <td style="color:${r.hhpPct>23?'#ff5533':'inherit'}">${r.hhpPct?r.hhpPct.toFixed(1):'-'}</td>
              <td style="color:${r.brlpPct>10?'#ff2020':'inherit'}">${r.brlpPct?r.brlpPct.toFixed(1):'-'}</td>
              <td style="color:var(--muted)">${r.avgLA!=null?r.avgLA.toFixed(1)+'°':'-'}</td>
              <td style="color:${r.pv100>1.5?'#39ff8a':r.pv100<-1.5?'#ff4560':'inherit'};font-weight:${Math.abs(r.pv100)>1.5?'700':'400'};font-family:var(--mono)">${r.pv100>0?'+':''}${r.pv100.toFixed(2)}</td>
              <td style="color:${r.xpv100>1.5?'#39ff8a':r.xpv100<-1.5?'#ff4560':'inherit'};font-family:var(--mono)">${r.xpv100>0?'+':''}${r.xpv100.toFixed(2)}</td>
              <td style="color:${r.xpvPlus100>1?'#39ff8a':r.xpvPlus100<-1?'#ff4560':'inherit'};font-weight:${Math.abs(r.xpvPlus100)>1?'700':'400'};font-family:var(--mono)">${r.xpvPlus100>0?'+':''}${r.xpvPlus100.toFixed(2)}</td>
              <td style="color:${r.pvDiff100>1?'#ffd700':r.pvDiff100<-1?'#88ccff':'var(--muted)'};font-family:var(--mono)">${r.pvDiff100>0?'+':''}${r.pvDiff100.toFixed(2)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}
    
    <div style="margin-top:12px;padding:10px;background:var(--card2);border-radius:4px;font-size:10px;color:var(--muted);line-height:1.6">
      💡 컬럼 클릭 → 정렬 / 행 클릭 → 선수 카드 모달<br>
      <b>구속</b>(km/h) <b>무브</b>(횡+종 평균 cm) <b>자이로</b>(°) <b>존인</b>(존 안 비율) <b>헛스윙</b>(스윙 대비) <b>HH%</b>(EV≥110mph) <b>배럴</b>(EV≥105+발사각 8~32°)<br>
      <b style="color:#39ff8a">PV (Pitch Value)</b>: 구종 가치 — <b>CRV (Count-based Run Value) 정밀 계산</b> 적용. 각 투구를 (이전 카운트) → (이후 카운트) 전이로 보고 카운트별 평균 RE 차이로 RV 산출. Fangraphs/Statcast가 실제 쓰는 방식. <b>0-2에서 K vs 3-2에서 K의 가치 차이 정확히 반영</b>. 모든 투구 (콜드 스트라이크/볼/파울 포함) 가치 계산. WBD 실측 데이터(310 PA) 기반 zero-centered. 평균 투수 ≈ 0, 좋은 투수 500투구 +11, 1000투구 +22<br>
      <b style="color:#39ff8a">PV/100</b>: 100투구당 정규화 (구종 자체 효율, 표본 차이 보정)
    </div>
  </div>`;
  
  out.innerHTML=html;
};
}

export function initialize(wbdContext) {
// Original index.html:16859
window._pitchTypeState={
  selectedGroup:null,
  sortKey:'xpvPlus100',  // V10.2: 기본 정렬을 투구수 → 구종의 순수한 질(xPV+/100, 운 배제·리그평균 대비)
  sortDir:'desc',
  minPitches:20
};
}
