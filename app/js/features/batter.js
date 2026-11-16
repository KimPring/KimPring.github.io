/** batter: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:5852
wbdContext.renderBatterPage = function renderBatterPage(){
  wbdContext.populateBatterHeightOptions();
  const sel=document.getElementById('batter-sel');
  if(sel&&sel.selectedIndex>0)wbdContext.currentBatter=sel.options[sel.selectedIndex].value;
  if(!wbdContext.currentBatter)return;
  const bd=wbdContext.getBatterDataFiltered().filter(wbdContext._isInPlay);
  wbdContext.renderBatterHeader(wbdContext.currentBatter,bd);
  // 수비 이닝 섹션 삽입
  const el=document.getElementById('batter-fielding');
  if(el)el.innerHTML=wbdContext.renderPlayerFieldingSection(wbdContext.currentBatter);
  wbdContext.renderBatterSubTab(wbdContext.activeBatterTab);
};

// Original index.html:5865
wbdContext.renderBatterHeader = function renderBatterHeader(batterName,bd){
  if(!bd)bd=wbdContext.getBatterDataFiltered().filter(wbdContext._isInPlay);
  if(!batterName)batterName=wbdContext.currentBatter;
  const hits=bd.filter(d=>wbdContext._isHit(d)).length;
  const hrs=bd.filter(d=>d.result===4).length;
  // 타구질(EV, LA, 배럴): 번트 제외
  const bdQ=bd.filter(d=>!wbdContext._isBunt(d));
  const evVals=bdQ.map(d=>+d.ev);
  const avgEV=evVals.length?(evVals.reduce((a,b)=>a+b,0)/evVals.length).toFixed(1):'-';
  const laVals=bdQ.filter(d=>d.ldeg!=null).map(d=>+d.ldeg);
  const avgLA=laVals.length?(laVals.reduce((a,b)=>a+b,0)/laVals.length).toFixed(1):'-';
  const allBd=wbdContext.getBatterDataFiltered();
  const bZone=allBd[0]?.bZone||'?';
  // 키: 반올림 후 집계
  const heightMap={};
  allBd.forEach(d=>{if(d.bHCm){const h=Math.round(+d.bHCm);heightMap[h]=(heightMap[h]||0)+1;}});
  const heights=Object.keys(heightMap).map(Number).sort((a,b)=>b-a);
  const heightStr=heights.length<=1
    ?(heights[0]||'?')+'cm'
    :heights.slice(0,3).map(h=>h+'cm('+heightMap[h]+')').join(' / ');
  const height=heightStr;
  // 정확한 타석/타수/볼넷/사구 (paEnd 기반)
  const paEnd=wbdContext._countPaEnd(allBd);
  const PA=paEnd.length;  // 타석
  const BB=allBd.filter(d=>+d.result===5).length;  // 볼넷
  const HBP=allBd.filter(d=>+d.result===6).length;  // 사구
  const AB=paEnd.filter(d=>+d.result!==5&&+d.result!==6).length;  // 타수 (BB/HBP 제외)
  const OBP=PA>0?((hits+BB+HBP)/PA).toFixed(3).replace(/^0/,''):'---';
  // BA = hits/AB (정통 야구), SLG = (1B + 2*2B + 3*3B + 4*HR)/AB
  // 우리 데이터엔 1B/2B/3B 구분 없음 → 1BSafe(단타) + HR만
  const avg=AB>0?(hits/AB).toFixed(3).replace(/^0/,''):'---';
  // V10.1: _hitBase 분류 기반 정확한 SLG (2/3루타 반영)
  const slg=AB>0?((wbdContext._totalBases(paEnd))/AB).toFixed(3).replace(/^0/,''):'---';
  // V10.1: 클래식 세부 기록 — 1/2/3루타, OPS, ISO, BABIP
  const h2B=paEnd.filter(d=>(+d._hitBase||0)===2).length;
  const h3B=paEnd.filter(d=>(+d._hitBase||0)===3).length;
  const h1B=hits-hrs-h2B-h3B;
  const _avgN=AB>0?hits/AB:0, _slgN=AB>0?wbdContext._totalBases(paEnd)/AB:0, _obpN=PA>0?(hits+BB+HBP)/PA:0;
  const opsStr=AB>0?(_obpN+_slgN).toFixed(3).replace(/^0/,''):'---';
  const isoStr=AB>0?(_slgN-_avgN).toFixed(3).replace(/^0/,''):'---';
  const _kCnt=allBd.filter(d=>wbdContext._isK(d)).length;
  const _babipDen=AB-_kCnt-hrs;
  const babipStr=_babipDen>0?((hits-hrs)/_babipDen).toFixed(3).replace(/^0/,''):'---';
  const ppPA=PA>0?(allBd.length/PA).toFixed(2):'-';
  // 하드힛 (EV >= 110) · 번트 제외
  const hhCnt=bdQ.filter(d=>wbdContext._isHardHit(d)).length;
  const hhPct=bdQ.length>0?(hhCnt/bdQ.length*100).toFixed(1):'0';
  // 배트 길이/중심: 최빈값(mode) 사용
  function batMode(arr){
    if(!arr.length)return null;
    const m={};arr.forEach(v=>{const k=(+v).toFixed(2);m[k]=(m[k]||0)+1;});
    return +Object.entries(m).sort((a,b)=>b[1]-a[1])[0][0];
  }
  const batLens=allBd.filter(d=>d.batLen>0).map(d=>+d.batLen);
  const batCens=allBd.filter(d=>d.batCen>0).map(d=>+d.batCen);
  const avgBatLen=batLens.length?batMode(batLens).toFixed(2):'-';
  const avgBatCen=batCens.length?batMode(batCens).toFixed(2):'-';

  // 추가 스탯: 스윗스팟%, 평균 hPos (번트 제외)
  const hposData=bdQ.filter(d=>d.hPos!=null);
  const sweetPct=hposData.length?(hposData.filter(d=>+d.hPos>=0.35&&+d.hPos<=0.65).length/hposData.length*100).toFixed(1):'-';
  const avgHpos=hposData.length?(hposData.reduce((a,b)=>a+(+b.hPos),0)/hposData.length).toFixed(2):'-';

  // 초구 스윙률
  const firstPitches=allBd.filter(d=>d.ball===0&&d.strk===0);
  const fpSwPct=firstPitches.length?(firstPitches.filter(d=>d.bSwing).length/firstPitches.length*100).toFixed(1):'-';

  // 존별 스윙/컨택/헛스윙 (allBd 전체 기준, 존 데이터 있는 것만)
  const zData=allBd.filter(d=>d.zoneX!=null);
  const inZone=zData.filter(d=>Math.abs(+d.zoneX)<=1&&Math.abs(+d.zoneY||0)<=1);
  const outZone=zData.filter(d=>Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1);
  const calcRates=(arr)=>{
    if(!arr.length)return {swingPct:'-',contactPct:'-',whiffPct:'-'};
    // _isSwing: bSwing 누락 보정 (ev>0 or call=2면 스윙으로 인정)
    const swings=arr.filter(wbdContext._isSwing).length;
    // 헛스윙 = 스윙했는데 타구 못 만듦 (ev=0)
    const whiffs=arr.filter(d=>wbdContext._isSwing(d)&&(!d.ev||+d.ev===0)).length;
    const contacts=swings-whiffs;
    return {
      swingPct:(swings/arr.length*100).toFixed(0),
      contactPct:swings?(contacts/swings*100).toFixed(0):'-',
      whiffPct:swings?(whiffs/swings*100).toFixed(0):'-'
    };
  };
  const zAll=calcRates(zData);
  const zIn=calcRates(inZone);
  const zOut=calcRates(outZone);
  // WAR (투타 겸업 감지)
  const bWar_h=wbdContext.calcBatterWAR(batterName);
  const hasPitching_h=wbdContext.G.some(d=>String(d.pName)===String(batterName));
  const pWar_h=hasPitching_h?wbdContext.calcPitcherWAR(batterName):0;
  const totalWar_h=bWar_h+pWar_h;
  const warHTML_h=hasPitching_h
    ?'<span class="ph-badge" style="background:linear-gradient(90deg,#ff8c44,#cc44ff);color:#fff;border:none;font-weight:700" title="투타 겸업 총합">⚔️ 투타 '+totalWar_h.toFixed(2)+' WAR</span><span class="ph-badge" style="background:linear-gradient(90deg,#e91e63,#ff8caa);color:#fff;border:none;font-weight:700;font-size:11px" title="타자 부분">🏏 타자 '+bWar_h.toFixed(2)+' WAR</span><span class="ph-badge" style="background:linear-gradient(90deg,#1976d2,#64b5f6);color:#fff;border:none;font-weight:700;font-size:11px" title="투수 부분">⚾ 투수 '+pWar_h.toFixed(2)+' WAR</span>'
    :'<span class="ph-badge" style="background:linear-gradient(90deg,#e91e63,#ff8caa);color:#fff;border:none;font-weight:700" title="타자 WAR (wOBA-style, 환경 평균 대비)">🏏 타자 '+bWar_h.toFixed(2)+' WAR</span>';

  document.getElementById('batter-header').innerHTML=
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">'
    +(function(){
      const photoUrl=wbdContext.getPhotoUrl(batterName);
      const photoInner = photoUrl
        ? '<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+photoUrl+'" style="width:100%;height:100%;object-fit:cover">'
        : '<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#0f1828"><circle cx="50" cy="38" r="18" fill="#3a4560"/><path d="M 18,100 Q 18,62 50,60 Q 82,62 82,100 Z" fill="#3a4560"/></svg>';
      return '<div style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:2px solid var(--amber);box-shadow:0 0 10px rgba(245,217,35,0.3);flex-shrink:0">'+photoInner+'</div>';
    })()
    +'<span class="ph-name">'+batterName+'</span>'
    +'<span class="ph-badge">'+(bZone==='R'?'우타':'좌타')+'</span>'
    +warHTML_h
    +'<span class="ph-badge" style="cursor:pointer" onclick="document.getElementById(\'batter-height-filter\').value=\'\';onBatterHeightFilter()" title="키 필터 초기화">'+height+'</span>'
    +'<span class="ph-badge" style="color:#c8a060;border-color:#8a6030">배트 '+avgBatLen+'m / 중심 '+avgBatCen+'</span>'
    +'<span style="display:inline-flex;align-items:center;gap:2px">'
    +wbdContext.favoriteButton(batterName,'batter',18)
    +'<button onclick="event.stopPropagation();openMemoModal(\'player_batter_'+String(batterName).replace(/'/g,"").replace(/"/g,'')+'\',\'타자 · '+batterName.replace(/'/g,"").replace(/"/g,'')+'\')" title="메모" style="background:transparent;border:none;color:'+(wbdContext.getMemo('player_batter_'+batterName)?'var(--amber)':'var(--muted)')+';font-size:16px;cursor:pointer;padding:2px 4px">'+(wbdContext.getMemo('player_batter_'+batterName)?'📝':'📄')+'</button>'
    +'<button onclick="event.stopPropagation();openCardDetail(\''+String(batterName).replace(/'/g,"\\'").replace(/"/g,'\\"')+'\',\'batter\')" title="선수 카드 보기" style="background:transparent;border:1px solid var(--border);color:var(--amber);font-size:12px;cursor:pointer;padding:3px 8px;border-radius:4px;margin-left:4px">🃏 카드</button>'
    +'</span>'
    +'</div>'
    // 1줄: 타격 결과
    +'<div class="ph-stats">'
    +'<div class="ph-stat"><div class="ph-stat-label">타석</div><div class="ph-stat-val">'+PA+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">타수</div><div class="ph-stat-val">'+AB+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">안타</div><div class="ph-stat-val">'+hits+'</div></div>'
    +'<div class="ph-stat" title="1루타 / 2루타 / 3루타 (V10.1 베이스 추적 분류)"><div class="ph-stat-label" style="color:#88ccaa">1·2·3루타</div><div class="ph-stat-val" style="color:#88ccaa;font-size:15px">'+h1B+'·'+h2B+'·'+h3B+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">홈런</div><div class="ph-stat-val">'+hrs+'</div></div>'
    +'<div class="ph-stat" title="HR% = 홈런 / 인플레이 타구 (타구당 홈런 비율)"><div class="ph-stat-label" style="color:#ff6b8a">HR%</div><div class="ph-stat-val" style="color:#ff6b8a">'+( bd.length>0?(hrs/bd.length*100).toFixed(1):0 )+'%</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">BB</div><div class="ph-stat-val">'+BB+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">HBP</div><div class="ph-stat-val">'+HBP+'</div></div>'
    +'<div class="ph-stat" title="당한 삼진 (카운트 2에서 3번째 strike)"><div class="ph-stat-label" style="color:#ff8800">K</div><div class="ph-stat-val" style="color:#ff8800">'+(allBd.filter(d=>wbdContext._isK(d)).length)+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#39ff8a">타율</div><div class="ph-stat-val" style="color:#39ff8a">'+avg+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#88cc44">출루율</div><div class="ph-stat-val" style="color:#88cc44">'+OBP+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#ff8800">장타율</div><div class="ph-stat-val" style="color:#ff8800">'+slg+'</div></div>'
    +'<div class="ph-stat" title="OPS = 출루율 + 장타율"><div class="ph-stat-label" style="color:#cc66ff">OPS</div><div class="ph-stat-val" style="color:#cc66ff">'+opsStr+'</div></div>'
    +(function(){try{const _r=wbdContext._computeRecordsData().batters.find(b=>b.name===batterName);return _r&&_r.PA>0?'<div class="ph-stat" title="조정 득점 창출력 — 리그 평균 100 (wOBA 기반, WBD 리그 자체 보정)"><div class="ph-stat-label" style="color:#ffc844">wRC+</div><div class="ph-stat-val" style="color:#ffc844">'+_r.wrcPlus.toFixed(0)+'</div></div>':''}catch(e){return ''}})()
    +'<div class="ph-stat" title="ISO = 장타율 - 타율 (순수 장타력)"><div class="ph-stat-label" style="color:#ffaa66">ISO</div><div class="ph-stat-val" style="color:#ffaa66">'+isoStr+'</div></div>'
    +'<div class="ph-stat" title="BABIP = (안타-HR)/(타수-K-HR) · 인플레이 타구의 안타 비율"><div class="ph-stat-label" style="color:#66ccdd">BABIP</div><div class="ph-stat-val" style="color:#66ccdd">'+babipStr+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">평균EV</div><div class="ph-stat-val">'+avgEV+'<span style="font-size:11px;color:var(--muted)">km/h</span></div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label">평균LA</div><div class="ph-stat-val">'+avgLA+'<span style="font-size:11px;color:var(--muted)">°</span></div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#ff8c44">HH%<span style="font-size:9px;color:var(--muted)"> (≥110)</span></div><div class="ph-stat-val" style="color:#ff8c44">'+hhPct+'%</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#ffd700">배럴%<span style="font-size:9px;color:var(--muted)"> (≥105&amp;LA8~32)</span></div><div class="ph-stat-val" style="color:#ffd700">'+( bdQ.length>0?(bdQ.filter(d=>wbdContext._isBarrel(d)).length/bdQ.length*100).toFixed(1):0 )+'%</div></div>'
    +'<div class="ph-stat" title="HH+ = EV 125 이상 (WBD 실측: BA .485→.650 점프 지점)"><div class="ph-stat-label" style="color:#ff5533">HH+%<span style="font-size:9px;color:var(--muted)"> (≥125)</span></div><div class="ph-stat-val" style="color:#ff5533">'+( bdQ.length>0?(bdQ.filter(d=>wbdContext._isHHPlus(d)).length/bdQ.length*100).toFixed(1):0 )+'%</div></div>'
    +'<div class="ph-stat" title="배럴+ = EV 125+ &amp; LA 20~40° (WBD 실측 BA .91 · 홈런 전량 이 존)"><div class="ph-stat-label" style="color:#ff2020">배럴+%<span style="font-size:9px;color:var(--muted)"> (≥125&amp;LA20~40)</span></div><div class="ph-stat-val" style="color:#ff2020">'+( bdQ.length>0?(bdQ.filter(d=>wbdContext._isBarrelPlus(d)).length/bdQ.length*100).toFixed(1):0 )+'%</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#cc88ff">스윗스팟%<span style="font-size:9px;color:var(--muted)"> (hPos 0.35~0.65)</span></div><div class="ph-stat-val" style="color:#cc88ff">'+sweetPct+(sweetPct==='-'?'':'%')+'</div></div>'
    +'<div class="ph-stat"><div class="ph-stat-label" style="color:#cc88ff">평균 hPos</div><div class="ph-stat-val" style="color:#cc88ff">'+avgHpos+'</div></div>'
    +'<div class="ph-stat" title="초구 스윙률 (리그 평균 49% · 높으면 공격적, 낮으면 선구형)"><div class="ph-stat-label" style="color:#44ccff">초구 스윙%</div><div class="ph-stat-val" style="color:#44ccff">'+fpSwPct+(fpSwPct==='-'?'':'%')+'</div></div>'
    +'<div class="ph-stat" title="타석당 투구수 (높으면 끈질김)"><div class="ph-stat-label" style="color:#ffaa44">P/PA</div><div class="ph-stat-val" style="color:#ffaa44">'+ppPA+'</div></div>'
    +'</div>'
    // 2줄: 존별 스윙/컨택/헛스윙
    +'<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:10px;padding:10px 14px;background:var(--card2);border-radius:4px;border-left:3px solid #44aaff">'
    +'<div style="display:flex;gap:14px;align-items:center">'
    +'<div style="font-size:10px;color:#44aaff;font-weight:700;letter-spacing:1px;text-transform:uppercase">전체</div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">스윙%</div><div class="ph-stat-val" style="font-size:15px">'+zAll.swingPct+'%</div></div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">컨택%</div><div class="ph-stat-val" style="font-size:15px;color:#39ff8a">'+zAll.contactPct+'%</div></div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">헛스윙%</div><div class="ph-stat-val" style="font-size:15px;color:#ff4560">'+zAll.whiffPct+'%</div></div>'
    +'</div>'
    +'<div style="width:1px;background:var(--border);align-self:stretch"></div>'
    +'<div style="display:flex;gap:14px;align-items:center">'
    +'<div style="font-size:10px;color:#39ff8a;font-weight:700;letter-spacing:1px;text-transform:uppercase">존 안</div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">스윙%</div><div class="ph-stat-val" style="font-size:15px">'+zIn.swingPct+'%</div></div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">컨택%</div><div class="ph-stat-val" style="font-size:15px;color:#39ff8a">'+zIn.contactPct+'%</div></div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">헛스윙%</div><div class="ph-stat-val" style="font-size:15px;color:#ff4560">'+zIn.whiffPct+'%</div></div>'
    +'</div>'
    +'<div style="width:1px;background:var(--border);align-self:stretch"></div>'
    +'<div style="display:flex;gap:14px;align-items:center">'
    +'<div style="font-size:10px;color:#ff8c44;font-weight:700;letter-spacing:1px;text-transform:uppercase">존 밖</div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">스윙%</div><div class="ph-stat-val" style="font-size:15px">'+zOut.swingPct+'%</div></div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">컨택%</div><div class="ph-stat-val" style="font-size:15px;color:#39ff8a">'+zOut.contactPct+'%</div></div>'
    +'<div class="ph-stat" style="margin:0"><div class="ph-stat-label">헛스윙%</div><div class="ph-stat-val" style="font-size:15px;color:#ff4560">'+zOut.whiffPct+'%</div></div>'
    +'</div>'
    +'</div>';
};

// Original index.html:6036
wbdContext.getBatterSprayData = function getBatterSprayData(){
  const grp=document.getElementById('ba-group-sel').value;
  const sMin=+document.getElementById('ba-spd-min').value;
  const sMax=+document.getElementById('ba-spd-max').value;
  let data=wbdContext.getBatterDataFiltered().filter(wbdContext._isInPlay);  // V12 fix: 파울(result=3, ev>0) 제외 — 스프레이 방향 분포 왜곡 방지
  if(grp)data=data.filter(d=>wbdContext.pitchGroup(d.pType,d)===grp);
  data=data.filter(d=>d.spdK>=sMin&&d.spdK<=sMax);
  return data;
};

// Original index.html:6049
wbdContext.setSprayZone = function setSprayZone(mode){
  wbdContext._sprayZoneFilter = mode;
  // 버튼 상태 업데이트
  document.querySelectorAll('.spray-zone-btn').forEach(btn => {
    if(btn.dataset.mode === mode){
      btn.style.background = 'rgba(57,255,138,0.15)';
      btn.style.borderColor = '#39ff8a';
      btn.style.color = '#39ff8a';
    } else {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'var(--muted)';
      btn.style.color = 'var(--muted)';
    }
  });
  wbdContext.renderBatterSpray();
};

// Original index.html:6066
wbdContext.renderBatterSpray = function renderBatterSpray(){
  const data=wbdContext.getBatterSprayData();
  const el=document.getElementById('b-spray');
  const W=500,H=540;
  const pts=data.filter(d=>d.lz!=null&&(+d.lz!==0||+d.lx!==0));
  if(!pts.length){
    el.innerHTML='<span style="color:var(--muted)">낙구 좌표 데이터 없음</span>';
    return;
  }
  // 홈플레이트: lx=0, lz=-20 (스펙)
  // 내야방향: z- (더 음수 = 외야)
  // lx+: 좌측(3루/LF방향), lx-: 우측(1루/RF방향)
  // ── V11.2 실측 FIELD_CONFIG 반영 ─────────────
  const HP ={lx:0,     lz:-20};
  const MND={lx:0,     lz:-38.44};              // 마운드 중심
  const B1={lx:-19.40, lz:-39.70};              // 1루 (실측)
  const B2={lx:0,      lz:-59.10};              // 2루 (실측)
  const B3={lx:+19.40, lz:-39.70};              // 3루 (실측)
  // 외야 펜스 (실측: 좌우폴 74m, 좌우중간 (54.74,117.5), 중앙 135m)
  const RFP={lx:-74.0,   lz:-94.30};            // 우익폴
  const RC ={lx:-54.74,  lz:-117.50};           // 우중
  const CFR={lx:-20.0,   lz:-135.0};            // 중견 우측
  const CFC={lx:0,       lz:-135.0};            // 중앙 (신규)
  const CFL={lx:+20.0,   lz:-135.0};            // 중견 좌측
  const LC ={lx:+54.74,  lz:-117.50};           // 좌중
  const LFP={lx:+74.0,   lz:-94.30};            // 좌익폴

  // ── 뷰 범위 계산 ─────────────────────────────────────────
  // 내야 모드: 내야 영역만 줌인 (±38m × HP~2루+여유)
  const INFIELD_ZOOM = wbdContext._sprayZoneFilter === 'infield';
  let lxMin, lxMax, lzMin, lzMax;
  if(INFIELD_ZOOM){
    const infieldPts = pts.filter(d=>{ const dx=+d.lx||0, dz=-(+d.lz||0+20); return Math.sqrt(dx*dx+dz*dz)<=30; });
    const pxs = infieldPts.map(d=>+d.lx||0);
    const pzs = infieldPts.map(d=>+d.lz||0);
    const dataLxMin = pxs.length ? Math.min(...pxs) : -30;
    const dataLxMax = pxs.length ? Math.max(...pxs) : 30;
    const dataLzMin = pzs.length ? Math.min(...pzs) : -65;
    const dataLzMax = pzs.length ? Math.max(...pzs) : -15;
    lxMin = Math.min(dataLxMin, B3.lx-8, -32); lxMax = Math.max(dataLxMax, B1.lx+8, 32);
    lzMin = Math.min(dataLzMin, B2.lz-8, -72);  lzMax = Math.max(dataLzMax, HP.lz+8, -12);
  } else {
    const fieldLx=[HP.lx,B1.lx,B3.lx,RFP.lx,LFP.lx,CFR.lx,CFL.lx,RC.lx,LC.lx];
    const fieldLz=[HP.lz,B2.lz,CFR.lz,CFC.lz,RFP.lz,RC.lz];
    const allLx=[...pts.map(d=>+d.lx||0),...fieldLx];
    const allLz=[...pts.map(d=>+d.lz||0),...fieldLz];
    lxMin=Math.min(...allLx)-6; lxMax=Math.max(...allLx)+6;
    lzMin=Math.min(...allLz)-8; lzMax=Math.max(...allLz)+10;
  }
  const PAD=12;
  const scaleW=W-PAD*2, scaleH=H-PAD*2-18;
  const mPerPx=Math.max((lzMax-lzMin)/scaleH, (lxMax-lxMin)/scaleW);

  // toX: lx+→화면왼쪽(LF), lx-→화면오른쪽(RF)
  // toY: lzMin(외야,더음수)→화면상단, lzMax(HP근처)→화면하단
  const toX=lx=>PAD+(lxMax-lx)/mPerPx;
  const toY=lz=>PAD+(lz-lzMin)/mPerPx;
  const px=p=>({x:toX(p.lx),y:toY(p.lz)});

  const hpP=px(HP), b1P=px(B1), b2P=px(B2), b3P=px(B3);
  const rfpP=px(RFP), rcP=px(RC), cfrP=px(CFR), cflP=px(CFL), lcP=px(LC), lfpP=px(LFP);

  let items='';
  items+=wbdContext.sEl('rect',{x:0,y:0,width:W,height:H,fill:'#1a3a0a',rx:'4'});

  // 외야 잔디 폴리곤 (내야 줌인 모드에서는 전체 배경만)
  if(!INFIELD_ZOOM){
    const cfcP=px(CFC);
    const outPts=[hpP,rfpP,rcP,cfrP,cfcP,cflP,lcP,lfpP].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    items+=wbdContext.sEl('polygon',{points:outPts,fill:'#1e4010',stroke:'rgba(255,255,255,0.15)','stroke-width':'0.5'});
    // 외야 펜스 라인 (파울폴→외야→파울폴)
    const fencePts=[rfpP,rcP,cfrP,cfcP,cflP,lcP,lfpP].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    items+=`<polyline points="${fencePts}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>`;
    // 파울라인 (HP→파울폴)
    items+=`<line x1="${hpP.x.toFixed(1)}" y1="${hpP.y.toFixed(1)}" x2="${rfpP.x.toFixed(1)}" y2="${rfpP.y.toFixed(1)}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
    items+=`<line x1="${hpP.x.toFixed(1)}" y1="${hpP.y.toFixed(1)}" x2="${lfpP.x.toFixed(1)}" y2="${lfpP.y.toFixed(1)}" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
  } else {
    // 내야 줌인: 잔디 + 파울라인 연장선
    items+=`<line x1="${hpP.x.toFixed(1)}" y1="${hpP.y.toFixed(1)}" x2="${(hpP.x-(rfpP.x-hpP.x)*0.6).toFixed(1)}" y2="${(hpP.y+(rfpP.y-hpP.y)*0.6).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,3"/>`;
    items+=`<line x1="${hpP.x.toFixed(1)}" y1="${hpP.y.toFixed(1)}" x2="${(hpP.x+(lfpP.x-hpP.x)*0.6).toFixed(1)}" y2="${(hpP.y+(lfpP.y-hpP.y)*0.6).toFixed(1)}" stroke="rgba(255,255,255,0.2)" stroke-width="1" stroke-dasharray="4,3"/>`;
  }
  // 내야 흙: 마운드(lz=0) 중심, 홈플레이트(lz=-20) 이하는 클립
  // 흙 원 대신 다이아몬드 내부만 연한 흙색으로 채움
  const dPtsFill=[hpP,b1P,b2P,b3P].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  items+=wbdContext.sEl('polygon',{points:dPtsFill,fill:'#2a1808',opacity:'0.8'});

  // 내야 다이아몬드
  const dPts=[hpP,b1P,b2P,b3P].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  items+=wbdContext.sEl('polygon',{points:dPts,fill:'none',stroke:'rgba(255,255,255,0.9)','stroke-width':'1.5'});



  // 베이스 마커
  [[hpP,'HP'],[b1P,'1B'],[b2P,'2B'],[b3P,'3B']].forEach(([p,lbl])=>{
    items+=wbdContext.sEl('rect',{x:(p.x-4).toFixed(1),y:(p.y-4).toFixed(1),width:'8',height:'8',fill:'white',rx:'1'});
    items+=wbdContext.sEl('text',{x:p.x.toFixed(1),y:(p.y-7).toFixed(1),fill:'rgba(255,255,255,0.6)','font-size':'7','text-anchor':'middle'},lbl);
  });

  // 타구 점
  pts.forEach(d=>{
    const x=toX(+d.lx||0), y=toY(+d.lz||0);
    if(x<-15||x>W+15||y<-15||y>H+15)return;
    const col=d.result===4?'#ffd700':d['1BSafe']?'#39ff8a':d.result===3?'#ff8c00':'#607080';
    const baseR = INFIELD_ZOOM ? (d.result===4?10:7) : (d.result===4?8:5.5);
    const r=baseR;
    items+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${col}" opacity="${wbdContext._sprayZoneFilter!=='off'?0.5:0.9}" stroke="#000" stroke-width="0.5" class="spray-dot" data-i="${wbdContext._gIndexOf(d)}"/>`;
  });

  // ───── V9.7: 5등분 방향별 비율 오버레이 ─────
  if(wbdContext._sprayZoneFilter !== 'off'){
    const ZONE_NAMES = ['우익','우중','중견','좌중','좌익'];
    const ZONE_COLORS = ['#ff8c44','#ffb368','#ffd700','#a8d8a8','#88ddaa'];
    const zoneCounts = [0,0,0,0,0];
    let totalInField = 0;
    
    // 내야/외야 경계: HP에서 30m
    //   내야 다이아몬드 (BD=27.4) 외곽 ~30m, 그 이내가 내야 영역
    const INFIELD_RADIUS = 30;
    
    const fairPts = pts.filter(d => +d.result !== 3);  // 파울 제외
    fairPts.forEach(d => {
      const lx = +d.lx || 0;
      const lz = +d.lz || 0;
      const dz = -(lz + 20);
      if(dz <= 0) return;
      const dist = Math.sqrt(lx*lx + dz*dz);
      // 필터: 내야/외야
      if(wbdContext._sprayZoneFilter === 'infield' && dist > INFIELD_RADIUS) return;
      if(wbdContext._sprayZoneFilter === 'outfield' && dist <= INFIELD_RADIUS) return;
      
      const angleDeg = Math.atan2(lx, dz) * 180 / Math.PI;
      if(angleDeg < -45 || angleDeg > 45) return;
      let zi;
      if(angleDeg <= -27) zi = 0;
      else if(angleDeg <= -9) zi = 1;
      else if(angleDeg <= 9) zi = 2;
      else if(angleDeg <= 27) zi = 3;
      else zi = 4;
      zoneCounts[zi]++;
      totalInField++;
    });
    
    // 모드별 부채꼴 반지름 다르게
    let outerR, innerR;
    if(wbdContext._sprayZoneFilter === 'all'){
      outerR = 210; innerR = 0;
    } else if(wbdContext._sprayZoneFilter === 'infield'){
      // 내야: HP 가까이만 (30m → px 환산, 줌인된 스케일 사용)
      outerR = Math.min(30 / mPerPx, 210);
      innerR = 0;
    } else {
      // 외야: 30m 밖 (도넛 모양)
      innerR = Math.min(30 / mPerPx, 80);
      outerR = 210;
    }
    
    const fieldToSvgRad = (fieldDeg) => (-90 - fieldDeg) * Math.PI / 180;
    
    [[-45,-27,0],[-27,-9,1],[-9,9,2],[9,27,3],[27,45,4]].forEach(([a1,a2,zi])=>{
      const r1 = fieldToSvgRad(a2);
      const r2 = fieldToSvgRad(a1);
      // 외곽 호
      const p1x = hpP.x + outerR * Math.cos(r1);
      const p1y = hpP.y + outerR * Math.sin(r1);
      const p2x = hpP.x + outerR * Math.cos(r2);
      const p2y = hpP.y + outerR * Math.sin(r2);
      
      let path;
      if(innerR > 0){
        // 도넛 섹터 (외야 모드)
        const ip1x = hpP.x + innerR * Math.cos(r1);
        const ip1y = hpP.y + innerR * Math.sin(r1);
        const ip2x = hpP.x + innerR * Math.cos(r2);
        const ip2y = hpP.y + innerR * Math.sin(r2);
        path = `M ${ip1x.toFixed(1)} ${ip1y.toFixed(1)} L ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${outerR} ${outerR} 0 0 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)} L ${ip2x.toFixed(1)} ${ip2y.toFixed(1)} A ${innerR} ${innerR} 0 0 0 ${ip1x.toFixed(1)} ${ip1y.toFixed(1)} Z`;
      } else {
        // 일반 부채꼴
        path = `M ${hpP.x.toFixed(1)} ${hpP.y.toFixed(1)} L ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${outerR} ${outerR} 0 0 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)} Z`;
      }
      items += `<path d="${path}" fill="${ZONE_COLORS[zi]}" fill-opacity="0.25" stroke="${ZONE_COLORS[zi]}" stroke-width="1.2" stroke-dasharray="3,2"/>`;
    });
    
    // 비율 라벨 (부채꼴 가운데 반경 위치)
    if(totalInField > 0){
      const labelR = innerR > 0 ? (innerR + outerR) / 2 : outerR * 0.65;
      [[-45,-27,0],[-27,-9,1],[-9,9,2],[9,27,3],[27,45,4]].forEach(([a1,a2,zi])=>{
        const midDeg = (a1 + a2) / 2;
        const midRad = fieldToSvgRad(midDeg);
        const lx_px = hpP.x + labelR * Math.cos(midRad);
        const ly_px = hpP.y + labelR * Math.sin(midRad);
        const pct = (zoneCounts[zi] / totalInField * 100).toFixed(1);
        items += wbdContext.sEl('text',{x:lx_px.toFixed(1), y:(ly_px-3).toFixed(1), fill:'#fff', 'font-size':'12', 'font-weight':'800', 'text-anchor':'middle', 'paint-order':'stroke', 'stroke':'rgba(0,0,0,0.8)', 'stroke-width':'3'}, pct + '%');
        items += wbdContext.sEl('text',{x:lx_px.toFixed(1), y:(ly_px+9).toFixed(1), fill:'#fff', 'font-size':'8', 'text-anchor':'middle', 'paint-order':'stroke', 'stroke':'rgba(0,0,0,0.8)', 'stroke-width':'2.5'}, ZONE_NAMES[zi]);
      });
      
      // 총 타구수 라벨 (좌상단)
      const filterLabel = wbdContext._sprayZoneFilter === 'all' ? '전체 페어볼' : wbdContext._sprayZoneFilter === 'infield' ? '내야 타구 (≤30m)' : '외야 타구 (>30m)';
      items += wbdContext.sEl('text',{x:6, y:14, fill:'#fff', 'font-size':'10', 'font-weight':'700', 'paint-order':'stroke', 'stroke':'rgba(0,0,0,0.8)', 'stroke-width':'2.5'}, `${filterLabel}: ${totalInField}개`);
    } else {
      items += wbdContext.sEl('text',{x:W/2, y:H/2, fill:'#fff', 'font-size':'12', 'text-anchor':'middle', 'paint-order':'stroke', 'stroke':'rgba(0,0,0,0.8)', 'stroke-width':'3'}, '해당 영역 타구 없음');
    }
  }

  // 10m 스케일바
  const tenM=10/mPerPx;
  items+=`<line x1="${(W-PAD-tenM).toFixed(1)}" y1="${H-10}" x2="${W-PAD}" y2="${H-10}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>`;
  items+=wbdContext.sEl('text',{x:(W-PAD-tenM/2).toFixed(1),y:H-3,fill:'rgba(255,255,255,0.5)','font-size':'7','text-anchor':'middle'},'10m');

  const leg='<div class="legend"><div class="legend-item"><div class="ldot" style="background:#ffd700"></div>홈런</div><div class="legend-item"><div class="ldot" style="background:#39ff8a"></div>안타</div><div class="legend-item"><div class="ldot" style="background:#ff8c00"></div>파울</div><div class="legend-item"><div class="ldot" style="background:#607080"></div>아웃</div></div>';
  el.innerHTML=leg+wbdContext.makeSVG(W,H,items);
  el.querySelectorAll('.spray-dot').forEach(dot=>{
    dot.addEventListener('mouseenter',e=>{const d=wbdContext.G[+dot.dataset.i];if(d)wbdContext.showTip(e,'EV:'+d.ev+'km/h LA:'+d.ldeg+'° SA:'+d.sdeg+'°<br>'+(wbdContext.RESULT_NAMES[d.result]||''));});
    dot.addEventListener('mousemove',wbdContext.moveTip);dot.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:6282
wbdContext.renderBarrel = function renderBarrel(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>wbdContext._isInPlay(d)&&d.ldeg!=null);
  const W=300,H=240,px=45,py=15;
  const evVals=data.map(d=>+d.ev),laVals=data.map(d=>+d.ldeg);
  const maxEV=135,minEV=0;
  const minLA=-30,maxLA=70;
  const scX=v=>px+(v-minEV)/(maxEV-minEV)*(W-px-10);
  const scY=v=>py+(maxLA-v)/(maxLA-minLA)*(H-py-20);
  // 먼저 계산
  const barrels=data.filter(d=>+d.ev>105&&+d.ldeg>=8&&+d.ldeg<=32).length;
  const hardHits=data.filter(d=>wbdContext._isHardHit(d)).length;
  const hhX=scX(110);
  let items='';
  const bx1=scX(105),by1=scY(32),by2=scY(8);
  items+=wbdContext.sEl('rect',{x:bx1.toFixed(1),y:by1.toFixed(1),width:(W-10-bx1).toFixed(1),height:(by2-by1).toFixed(1),fill:'rgba(255,215,0,0.12)',stroke:'#ffd700','stroke-width':'1','stroke-dasharray':'4,3'});
  // BARREL 라벨: 배럴존 오른쪽 상단
  items+=wbdContext.sEl('text',{x:(W-12).toFixed(1),y:(by1+10).toFixed(1),fill:'#ffd700','font-size':'8','text-anchor':'end'},'▶ BARREL');
  items+=wbdContext.sEl('line',{x1:px,y1:scY(0).toFixed(1),x2:W-10,y2:scY(0).toFixed(1),stroke:'#1a2f4a','stroke-width':'0.8','stroke-dasharray':'3,3'});
  items+=wbdContext.sEl('line',{x1:hhX.toFixed(1),y1:py,x2:hhX.toFixed(1),y2:H-20,stroke:'#ff8c44','stroke-width':'1','stroke-dasharray':'3,2'});
  items+=wbdContext.sEl('text',{x:(hhX+2).toFixed(1),y:(py+8).toFixed(1),fill:'#ff8c44','font-size':'7'},'HH≥110');
  data.forEach((d,i)=>{
    const col=wbdContext.RESULT_COLORS[d.result]||'#607080';
    items+=`<circle cx="${scX(+d.ev).toFixed(1)}" cy="${scY(+d.ldeg).toFixed(1)}" r="4" fill="${col}" opacity="0.85" class="barrel-dot" data-i="${wbdContext._gIndexOf(d)}"/>`;
  });
  [0,30,60,90,120].forEach(v=>{items+=wbdContext.sEl('text',{x:scX(v).toFixed(1),y:H-4,fill:'#3a5a7a','font-size':'7','text-anchor':'middle'},v+'')});
  [-20,0,20,40,60].forEach(v=>{items+=wbdContext.sEl('text',{x:2,y:(scY(v)+3).toFixed(1),fill:'#3a5a7a','font-size':'7'},v+'°')});
  items+=wbdContext.sEl('text',{x:px,y:10,fill:'var(--amber)','font-size':'8'},'배럴: '+barrels+'개 ('+( data.length>0?(barrels/data.length*100).toFixed(0):0 )+'%)  HH: '+hardHits+'개 ('+( data.length>0?(hardHits/data.length*100).toFixed(0):0 )+'%)');
  const el=document.getElementById('b-barrel');
  el.innerHTML=wbdContext.makeSVG(W,H,items);
  el.querySelectorAll('.barrel-dot').forEach(dot=>{
    dot.addEventListener('mouseenter',e=>{const d=wbdContext.G[+dot.dataset.i];wbdContext.showTip(e,`${d.bName} EV:${d.ev}km/h LA:${d.ldeg}°<br>${wbdContext.RESULT_NAMES[d.result]||''}`);});
    dot.addEventListener('mousemove',wbdContext.moveTip);dot.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:6318
wbdContext._leagueBBQualityDist = function _leagueBBQualityDist(){
  // 리그 전체 인플레이 타구의 품질 분포 (캐시)
  const genKey='bbq_'+window._cache.generation;
  if(window._bbqLeagueCache && window._bbqLeagueCache.key===genKey) return window._bbqLeagueCache.dist;
  const dist={barrelPlus:0,solid:0,flare:0,topped:0,under:0,weak:0}; let total=0;
  Object.values(window._cache.batterData).forEach(arr=>{
    arr.forEach(d=>{
      if(!wbdContext._isInPlay(d)||d.ldeg==null||wbdContext._isBunt(d)) return;
      dist[wbdContext._bbQuality(d)]++; total++;
    });
  });
  const pct={}; wbdContext._BBQ_ORDER.forEach(k=>pct[k]=total>0?dist[k]/total*100:0);
  window._bbqLeagueCache={key:genKey, dist:pct};
  return pct;
};

// Original index.html:6333
wbdContext.renderBBQuality = function renderBBQuality(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>wbdContext._isInPlay(d)&&d.ldeg!=null&&!wbdContext._isBunt(d));
  wbdContext._renderBBQCore(data,'b-bbquality','b-bbquality-bars',false);
};

// Original index.html:6337
wbdContext.renderPitcherBBQuality = function renderPitcherBBQuality(pd){
  const data=(pd||[]).filter(d=>wbdContext._isInPlay(d)&&d.ldeg!=null&&!wbdContext._isBunt(d));
  wbdContext._renderBBQCore(data,'p-bbquality','p-bbquality-bars',true);
};

// Original index.html:6341
wbdContext._renderBBQCore = function _renderBBQCore(data,elId,barsElId,isPitcher){
  const el=document.getElementById(elId);
  const elBars=document.getElementById(barsElId);
  if(!el) return;
  if(!data.length){el.innerHTML='<span style="color:var(--muted)">데이터 없음</span>';if(elBars)elBars.innerHTML='';return;}
  // ── 반원 극좌표: 중심 왼쪽, 각도=LA(-90~+90), 반지름=EV(0~135) ──
  const W=360,H=340;
  const cx=30, cy=H/2, maxR=Math.min(W-cx-15,(H-20)/2), maxEV=135;
  const rOf=ev=>Math.min(ev,maxEV)/maxEV*maxR;
  const xyOf=(ev,la)=>{const r=rOf(ev),a=la*Math.PI/180;return [cx+r*Math.cos(a), cy-r*Math.sin(a)];};
  let items='';
  // 배경 존 채우기: LA 3° × EV 5 그리드 셀을 부채꼴 조각으로
  const laStep=3, evStep=5;
  for(let la=-90;la<90;la+=laStep){
    for(let ev=0;ev<maxEV;ev+=evStep){
      const q=wbdContext._bbQuality({ev:ev+evStep/2, ldeg:la+laStep/2});
      const col=wbdContext._BBQ_META[q].color;
      const r1=rOf(ev), r2=rOf(ev+evStep);
      const a1=la*Math.PI/180, a2=(la+laStep)*Math.PI/180;
      const p1=[cx+r1*Math.cos(a1),cy-r1*Math.sin(a1)], p2=[cx+r2*Math.cos(a1),cy-r2*Math.sin(a1)];
      const p3=[cx+r2*Math.cos(a2),cy-r2*Math.sin(a2)], p4=[cx+r1*Math.cos(a2),cy-r1*Math.sin(a2)];
      items+=`<path d="M${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)} A${r2.toFixed(1)},${r2.toFixed(1)} 0 0 ${a2>a1?0:1} ${p3[0].toFixed(1)},${p3[1].toFixed(1)} L${p4[0].toFixed(1)},${p4[1].toFixed(1)} A${r1.toFixed(1)},${r1.toFixed(1)} 0 0 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)} Z" fill="${col}" opacity="0.30"/>`;
    }
  }
  // 기준선: LA 0°, ±45°, EV 링(110, 125)
  [[-90,''],[-45,'-45°'],[0,'0°'],[45,'+45°'],[90,'']].forEach(([la,lbl])=>{
    const [x,y]=xyOf(maxEV,la);
    items+=wbdContext.sEl('line',{x1:cx,y1:cy,x2:x.toFixed(1),y2:y.toFixed(1),stroke:'rgba(255,255,255,0.25)','stroke-width':'0.6','stroke-dasharray':'3,3'});
    if(lbl){const [lx,ly]=xyOf(maxEV+6,la);items+=wbdContext.sEl('text',{x:lx.toFixed(1),y:(ly+3).toFixed(1),fill:'#8aa','font-size':'8'},lbl);}
  });
  [110,125].forEach(ev=>{
    const r=rOf(ev);
    items+=`<path d="M${cx},${(cy+r).toFixed(1)} A${r.toFixed(1)},${r.toFixed(1)} 0 0 1 ${cx},${(cy-r).toFixed(1)}" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.7" stroke-dasharray="4,3"/>`;
    items+=wbdContext.sEl('text',{x:(cx+3).toFixed(1),y:(cy-r-2).toFixed(1),fill:'#8aa','font-size':'7'},'EV'+ev);
  });
  // 타구 점 오버레이
  data.forEach(d=>{
    const [x,y]=xyOf(+d.ev,+d.ldeg);
    const isHitD=(+d['1BSafe']===1)||(+d.result===4);
    const col=+d.result===4?'#ffd700':(isHitD?'#39ff8a':'#f0f4f8');
    items+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${col}" stroke="rgba(0,0,0,0.5)" stroke-width="0.6" opacity="0.95" class="bbq-dot" data-i="${wbdContext._gIndexOf(d)}"/>`;
  });
  // 범례 (오른쪽)
  const legX=W-4;
  wbdContext._BBQ_ORDER.forEach((k,i)=>{
    const m=wbdContext._BBQ_META[k];
    const cnt=data.filter(d=>wbdContext._bbQuality(d)===k).length;
    const pct=(cnt/data.length*100).toFixed(0);
    items+=wbdContext.sEl('rect',{x:legX-92,y:14+i*16,width:'9',height:'9',fill:m.color,opacity:'0.8',rx:'2'});
    items+=wbdContext.sEl('text',{x:legX-79,y:22+i*16,fill:'#cdd6e0','font-size':'8'},`${m.label} ${cnt} (${pct}%)`);
  });
  items+=wbdContext.sEl('text',{x:legX-92,y:8,fill:'var(--muted)','font-size':'7'},'점: 🟡HR 🟢안타 ⚪아웃');
  el.innerHTML=wbdContext.makeSVG(W,H,items);
  el.querySelectorAll('.bbq-dot').forEach(dot=>{
    dot.addEventListener('mouseenter',e=>{const d=wbdContext.G[+dot.dataset.i];if(d){const q=wbdContext._BBQ_META[wbdContext._bbQuality(d)];wbdContext.showTip(e,`<b style="color:${q.color}">${q.label}</b><br>EV:${d.ev}km/h LA:${d.ldeg}°<br>${wbdContext.RESULT_NAMES[d.result]||''}`);}});
    dot.addEventListener('mousemove',wbdContext.moveTip);dot.addEventListener('mouseleave',wbdContext.hideTip);
  });
  // ── 분포 막대 (선수 vs 리그) ──
  if(elBars){
    const lg=wbdContext._leagueBBQualityDist();
    let html='<div style="display:flex;flex-direction:column;gap:8px;padding:6px 4px">';
    wbdContext._BBQ_ORDER.forEach(k=>{
      const m=wbdContext._BBQ_META[k];
      const cnt=data.filter(d=>wbdContext._bbQuality(d)===k).length;
      const pPct=cnt/data.length*100;
      const lPct=lg[k]||0;
      const diff=pPct-lPct;
      const diffStr=(diff>=0?'+':'')+diff.toFixed(1);
      const goodHigh=(k==='barrelPlus'||k==='solid'||k==='flare');
      const isGood=isPitcher ? (goodHigh?diff<=0:diff>=0) : (goodHigh?diff>=0:diff<=0);
      const diffCol=isGood?'#39ff8a':'#ff6060';
      html+=`<div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
          <span style="color:${m.color};font-weight:600">${m.label}</span>
          <span style="color:#cdd6e0">${pPct.toFixed(1)}% <span style="color:var(--muted);font-size:9px">(리그 ${lPct.toFixed(1)}%)</span> <span style="color:${diffCol};font-size:10px">${diffStr}</span></span>
        </div>
        <div style="position:relative;height:12px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">
          <div style="position:absolute;left:0;top:0;height:100%;width:${Math.min(pPct,100).toFixed(1)}%;background:${m.color};opacity:0.75;border-radius:3px"></div>
          <div style="position:absolute;left:${Math.min(lPct,100).toFixed(1)}%;top:0;height:100%;width:2px;background:#fff;opacity:0.9" title="리그 평균"></div>
        </div>
      </div>`;
    });
    // HH+/배럴+ 요약
    const hhp=data.filter(d=>wbdContext._isHHPlus(d)).length, brlp=data.filter(d=>wbdContext._isBarrelPlus(d)).length;
    const pfx=isPitcher?'피':'';
    html+=`<div style="margin-top:6px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:11px;display:flex;gap:16px">
      <span title="EV 125+ (WBD 실측 점프 지점 · 리그 평균 23.6%)"><span style="color:#ff5533;font-weight:700">${pfx}HH+</span> <span style="color:#cdd6e0">${hhp}개 (${(hhp/data.length*100).toFixed(1)}%)</span></span>
      <span title="EV 125+ & LA 20~40° (실측 BA .918 · 리그 평균 10.1%)"><span style="color:#ff2020;font-weight:700">${pfx}배럴+</span> <span style="color:#cdd6e0">${brlp}개 (${(brlp/data.length*100).toFixed(1)}%)</span></span>
    </div>`;
    html+='</div>';
    elBars.innerHTML=html;
  }
};

// Original index.html:6435
wbdContext.renderLdegHist = function renderLdegHist(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>wbdContext._isInPlay(d)&&d.ldeg!=null).map(d=>+d.ldeg);
  if(!data.length){document.getElementById('b-ldeg-hist').innerHTML='<span style="color:var(--muted)">데이터 없음</span>';return;}
  // V9.8: 빈 폭 10° → 5°로 정밀화. 임계값(10°, 25°)이 빈 경계에 정확히 맞아 LD 누락 버그 해결
  const lo=-20,hi=60,step=5,bins=Math.ceil((hi-lo)/step);
  const hist=Array(bins).fill(0);
  data.forEach(v=>{const i=Math.min(Math.floor((v-lo)/step),bins-1);if(i>=0)hist[i]++;});
  const maxH=Math.max(...hist,1);
  const W=340,H=150,px=30,py=10,bW=(W-px-10)/bins;
  const baseY=H-32;
  const avgLA=data.reduce((a,b)=>a+b,0)/data.length;
  let items='';
  // 빈 단위 분류 (이제 임계값과 빈 경계가 정확히 일치)
  let gbCnt=0, ldCnt=0, fbCnt=0;
  hist.forEach((cnt,i)=>{
    const x=px+i*bW,v=lo+(i+0.5)*step;
    const h=(cnt/maxH)*(baseY-py-2),y=baseY-h;
    const col=v<10?'#607080':v<25?'#39ff8a':'#2196f3';
    if(v<10)gbCnt+=cnt; else if(v<25)ldCnt+=cnt; else fbCnt+=cnt;
    items+=wbdContext.sEl('rect',{x:(x+0.5).toFixed(1),y:y.toFixed(1),width:(bW-1).toFixed(1),height:h.toFixed(1),fill:col,opacity:'0.85',rx:'0.5'});
    if(cnt>0)items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:(y-1).toFixed(1),fill:'#ccc','font-size':'7','font-weight':'600','text-anchor':'middle'},cnt);
  });
  const totalCnt=gbCnt+ldCnt+fbCnt||1;
  const gbPct=(gbCnt/totalCnt*100).toFixed(1);
  const ldPct=(ldCnt/totalCnt*100).toFixed(1);
  const fbPct=(fbCnt/totalCnt*100).toFixed(1);
  // X축 baseline
  items+=wbdContext.sEl('line',{x1:px,y1:baseY,x2:W-10,y2:baseY,stroke:'rgba(255,255,255,0.25)','stroke-width':'0.7'});
  // X축 5° 간격 tick (모두), 10° 간격만 라벨
  for(let i=0;i<=bins;i++){
    const x=px+i*bW;
    const val=lo+i*step;
    const isMajor=val%10===0;
    items+=wbdContext.sEl('line',{x1:x.toFixed(1),y1:baseY.toFixed(1),x2:x.toFixed(1),y2:(baseY+(isMajor?4:2)).toFixed(1),stroke:`rgba(255,255,255,${isMajor?0.45:0.2})`,'stroke-width':'0.7'});
    if(isMajor){
      items+=wbdContext.sEl('text',{x:x.toFixed(1),y:(baseY+12).toFixed(1),fill:'#7a9ab0','font-size':'8','text-anchor':'middle'},val+'°');
    }
  }
  items+=wbdContext.sEl('text',{x:(W/2).toFixed(1),y:(H-4).toFixed(1),fill:'#5a7a9a','font-size':'8','text-anchor':'middle'},'발사각 (°) — 각 막대는 좌측 경계값부터 +5° 미만 구간');
  // 평균선
  const ax=px+(avgLA-lo)/step*bW;
  items+=wbdContext.sEl('line',{x1:ax.toFixed(1),y1:py,x2:ax.toFixed(1),y2:baseY.toFixed(1),stroke:'var(--amber)','stroke-width':'1.5','stroke-dasharray':'3,2'});
  items+=wbdContext.sEl('text',{x:(ax+3).toFixed(1),y:(py+10).toFixed(1),fill:'var(--amber)','font-size':'9','font-weight':'600'},`avg ${avgLA.toFixed(1)}°`);
  // 위쪽 범례 — 라벨 + 분류 기준 + 비율 통합 (땅/직/뜬)
  const leg=`<div class="legend" style="display:flex;flex-wrap:wrap;gap:14px;font-size:11px;margin-bottom:8px;padding:6px 8px;background:rgba(0,0,0,0.25);border-radius:4px">
    <div class="legend-item" style="display:flex;align-items:center;gap:5px">
      <div class="lsq" style="background:#607080"></div>
      <span style="color:#9ab">땅 <span style="color:#5a7a9a;font-size:10px">(&lt;10°)</span></span>
      <b style="color:#cfd6e2;font-family:var(--mono)">${gbPct}%</b>
      <span style="color:#5a7a9a;font-size:10px">(${gbCnt})</span>
    </div>
    <div class="legend-item" style="display:flex;align-items:center;gap:5px">
      <div class="lsq" style="background:#39ff8a"></div>
      <span style="color:#9ab">직 <span style="color:#5a7a9a;font-size:10px">(10°~24°)</span></span>
      <b style="color:#cfd6e2;font-family:var(--mono)">${ldPct}%</b>
      <span style="color:#5a7a9a;font-size:10px">(${ldCnt})</span>
    </div>
    <div class="legend-item" style="display:flex;align-items:center;gap:5px">
      <div class="lsq" style="background:#2196f3"></div>
      <span style="color:#9ab">뜬 <span style="color:#5a7a9a;font-size:10px">(≥25°)</span></span>
      <b style="color:#cfd6e2;font-family:var(--mono)">${fbPct}%</b>
      <span style="color:#5a7a9a;font-size:10px">(${fbCnt})</span>
    </div>
  </div>`;
  document.getElementById('b-ldeg-hist').innerHTML=leg+wbdContext.makeSVG(W,H,items);
};

// Original index.html:6502
wbdContext.renderSdegFan = function renderSdegFan(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>wbdContext._isInPlay(d)&&d.sdeg!=null).map(d=>+d.sdeg);
  if(!data.length){document.getElementById('b-sdeg-fan').innerHTML='<span style="color:var(--muted)">데이터 없음</span>';return;}
  const W=300,H=120,lo=-60,hi=60,step=10,bins=Math.ceil((hi-lo)/step);
  const hist=Array(bins).fill(0);
  data.forEach(v=>{const i=Math.min(Math.floor((v-lo)/step),bins-1);if(i>=0)hist[i]++;});
  const maxH=Math.max(...hist,1),bW=(W-20)/bins,px=10;
  let items='';
  hist.forEach((cnt,i)=>{
    const x=px+i*bW,v=lo+(i+0.5)*step;
    const h=(cnt/maxH)*(H-30),y=H-30-h;
    const col=v<-15?'#ff4560':v>15?'#2196f3':'#39ff8a';
    items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:y.toFixed(1),width:(bW-2).toFixed(1),height:h.toFixed(1),fill:col,opacity:'0.8',rx:'1'});
    if(cnt>0)items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:(y-2).toFixed(1),fill:'#ccc','font-size':'7','text-anchor':'middle'},cnt);
  });
  [-50,-25,0,25,50].forEach(v=>{
    const x=px+(v-lo)/step*bW;
    items+=wbdContext.sEl('text',{x:x.toFixed(1),y:H-12,fill:'#3a5a7a','font-size':'7','text-anchor':'middle'},v+'°');
  });
  items+=wbdContext.sEl('text',{x:px,y:H-2,fill:'#ff4560','font-size':'8'},'← 당겨치기');
  items+=wbdContext.sEl('text',{x:W-px-60,y:H-2,fill:'#2196f3','font-size':'8'},'밀어치기 →');
  const pull=data.filter(v=>v<-15).length,center=data.filter(v=>v>=-15&&v<=15).length,oppo=data.filter(v=>v>15).length;
  items+=wbdContext.sEl('text',{x:W/2,y:10,fill:'var(--muted)','font-size':'8','text-anchor':'middle'},`좌:${pull} 중:${center} 우:${oppo}`);
  document.getElementById('b-sdeg-fan').innerHTML=wbdContext.makeSVG(W,H,items);
};

// Original index.html:6529
wbdContext.renderSwingRadar = function renderSwingRadar(){
  const all=wbdContext.getBatterDataFiltered();
  const data=all.filter(d=>d.rotS!=null||d.shS!=null||d.lgS!=null||d.batSpd>0);
  const el=document.getElementById('b-radar');
  if(!data.length){el.innerHTML='<span style="color:var(--muted)">스윙 지표 데이터 없음</span>';return;}
  const avg=k=>{const v=data.filter(d=>d[k]!=null&&+d[k]!==0).map(d=>Math.abs(+d[k]));return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
  // 5개 축: 배트파워, 짧은회전, 긴회전, 짧은이동, 긴이동
  const labels=['batSpd','rotS','rotL','shS','lgS'];
  const lnames=['배트파워','짧은회전','긴회전','짧은이동','긴이동'];
  // 상위권 기준 고정 최댓값
  const maxV={batSpd:170, rotS:250, rotL:20, shS:150, lgS:100};
  const vals=labels.map(k=>Math.min(1,avg(k)/(maxV[k]||1)));
  const avgs={};labels.forEach(k=>{avgs[k]=avg(k);});
  // 발사각 통계
  const laData=all.filter(d=>wbdContext._isInPlay(d)&&d.ldeg!=null).map(d=>+d.ldeg);
  const avgLA=laData.length?(laData.reduce((a,b)=>a+b,0)/laData.length).toFixed(1):'-';
  const maxLAv=laData.length?Math.max(...laData).toFixed(0):'-';
  const minLAv=laData.length?Math.min(...laData).toFixed(0):'-';
  const N=5,CX=120,CY=115,R=82;
  let items='';
  [0.25,0.5,0.75,1].forEach(t=>{
    const pts=Array.from({length:N},(_,i)=>{const a=i/N*2*Math.PI-Math.PI/2;return (CX+R*t*Math.cos(a)).toFixed(1)+','+(CY+R*t*Math.sin(a)).toFixed(1);}).join(' ');
    items+=wbdContext.sEl('polygon',{points:pts,fill:'none',stroke:'#1a2f4a','stroke-width':'0.5'});
    const tv=t===1?'MAX':t===0.5?'50%':'';
    if(tv)items+=wbdContext.sEl('text',{x:(CX+2).toFixed(1),y:(CY-R*t-2).toFixed(1),fill:'#2a4a6a','font-size':'6'},tv);
  });
  labels.forEach((_,i)=>{const a=i/N*2*Math.PI-Math.PI/2;items+=wbdContext.sEl('line',{x1:CX,y1:CY,x2:(CX+R*Math.cos(a)).toFixed(1),y2:(CY+R*Math.sin(a)).toFixed(1),stroke:'#1a2f4a','stroke-width':'0.5'});});
  const dpts=vals.map((v,i)=>{const a=i/N*2*Math.PI-Math.PI/2;return (CX+R*v*Math.cos(a)).toFixed(1)+','+(CY+R*v*Math.sin(a)).toFixed(1);}).join(' ');
  items+=wbdContext.sEl('polygon',{points:dpts,fill:'rgba(57,255,138,0.15)',stroke:'var(--green)','stroke-width':'1.5'});
  vals.forEach((v,i)=>{const a=i/N*2*Math.PI-Math.PI/2;items+=`<circle cx="${(CX+R*v*Math.cos(a)).toFixed(1)}" cy="${(CY+R*v*Math.sin(a)).toFixed(1)}" r="3" fill="var(--green)"/>`;});
  labels.forEach((k,i)=>{
    const a=i/N*2*Math.PI-Math.PI/2;
    const lx=CX+(R+26)*Math.cos(a),ly=CY+(R+26)*Math.sin(a);
    const lines=lnames[i].split('\n');
    lines.forEach((l,li)=>items+=wbdContext.sEl('text',{x:lx.toFixed(1),y:(ly+(li-lines.length/2+0.5)*10).toFixed(1),fill:'#9ab','font-size':'8','text-anchor':'middle'},l));
    const val=avgs[k]>0?avgs[k].toFixed(1):'0';
    items+=wbdContext.sEl('text',{x:lx.toFixed(1),y:(ly+lines.length*6+4).toFixed(1),fill:'var(--amber)','font-size':'8','text-anchor':'middle'},val);
  });
  // 오른쪽 발사각 요약 박스
  items+=wbdContext.sEl('rect',{x:'248',y:'5',width:'70',height:'70',fill:'rgba(10,20,40,0.8)',stroke:'#1a2f4a','stroke-width':'0.5',rx:'3'});
  items+=wbdContext.sEl('text',{x:'283',y:'18',fill:'#9ab','font-size':'8','text-anchor':'middle'},'발사각(°)');
  items+=wbdContext.sEl('text',{x:'283',y:'36',fill:'var(--amber)','font-size':'14','text-anchor':'middle','font-weight':'600'},avgLA+'°');
  items+=wbdContext.sEl('text',{x:'283',y:'48',fill:'#3a5a7a','font-size':'7','text-anchor':'middle'},'평균');
  items+=wbdContext.sEl('text',{x:'263',y:'65',fill:'#2196f3','font-size':'8','text-anchor':'middle'},'최저 '+minLAv+'°');
  items+=wbdContext.sEl('text',{x:'305',y:'65',fill:'#ff4560','font-size':'8','text-anchor':'middle'},'최고 '+maxLAv+'°');
  el.innerHTML=wbdContext.makeSVG(330,235,items);
};

// Original index.html:6577
wbdContext.renderHpos = function renderHpos(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>wbdContext._isInPlay(d)&&d.hPos!=null);
  const W=300,H=80,px=20,bins=15;
  const hist=Array(bins).fill(0);
  data.forEach(d=>{const i=Math.min(Math.floor(+d.hPos*bins),bins-1);if(i>=0)hist[i]++;});
  const maxH=Math.max(...hist,1),bW=(W-px*2)/bins;
  let items='';
  items+=wbdContext.sEl('rect',{x:px,y:H-14,width:W-px*2,height:5,fill:'#1a3060',rx:'2'});
  // sweet spot highlight
  const sx=px+Math.floor(0.5*bins)*bW,sw=Math.floor(0.25*bins)*bW;
  items+=wbdContext.sEl('rect',{x:sx.toFixed(1),y:10,width:sw.toFixed(1),height:H-26,fill:'rgba(57,255,138,0.06)',stroke:'var(--green)','stroke-width':'0.5','stroke-dasharray':'3,2'});
  hist.forEach((cnt,i)=>{
    const x=px+i*bW,t=i/bins;
    const col=t<0.15?'#ff4560':t>0.85?'#607080':'#f5a623';
    const h=(cnt/maxH)*(H-26),y=H-19-h;
    items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:y.toFixed(1),width:(bW-2).toFixed(1),height:h.toFixed(1),fill:col,opacity:'0.8',rx:'1'});
    if(cnt>0)items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:(y-1).toFixed(1),fill:'#ccc','font-size':'7','text-anchor':'middle'},cnt);
  });
  items+=wbdContext.sEl('text',{x:px,y:H,fill:'#3a5a7a','font-size':'7'},'손잡이');
  items+=wbdContext.sEl('text',{x:W-px-18,y:H,fill:'#3a5a7a','font-size':'7'},'끝');
  items+=wbdContext.sEl('text',{x:(sx+sw/2).toFixed(1),y:8,fill:'var(--green)','font-size':'7','text-anchor':'middle'},'스윗스팟');
  document.getElementById('b-hpos').innerHTML=wbdContext.makeSVG(W,H,items);
};

// Original index.html:6601
wbdContext.renderSpdBand = function renderSpdBand(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>wbdContext._isInPlay(d)&&d.spdK>0);
  if(!data.length){document.getElementById('b-spd-band').innerHTML='<span style="color:var(--muted)">데이터 없음</span>';return;}
  const lo=80,hi=180,step=10,bins=Math.ceil((hi-lo)/step);
  const bands=Array.from({length:bins},(_, i)=>({min:lo+i*step,max:lo+(i+1)*step,hits:0,total:0,evSum:0,laSum:0,hh:0}));
  data.forEach(d=>{
    const bi=Math.floor((+d.spdK-lo)/step);
    if(bi>=0&&bi<bins){bands[bi].total++;if(wbdContext._isHit(d))bands[bi].hits++;bands[bi].evSum+=+d.ev;bands[bi].laSum+=+(d.ldeg||0);if(wbdContext._isHardHit(d))bands[bi].hh++;}
  });
  const W=380,H=130,px=40,py=10,bW=(W-px-10)/bins;
  let items='';
  let bestBand=null,bestAvg=0;
  bands.forEach((b,i)=>{
    if(!b.total)return;
    const avg=b.hits/b.total;
    const hhR=b.hh/b.total;
    if(avg>bestAvg){bestAvg=avg;bestBand=b;}
    const x=px+i*bW;
    const h=(avg)*(H-py-30),y=H-30-h;
    items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:y.toFixed(1),width:(bW-2).toFixed(1),height:h.toFixed(1),fill:'var(--amber)',opacity:'0.8',rx:'2'});
    items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:(y-1).toFixed(1),fill:'#ccc','font-size':'7','text-anchor':'middle'},(avg*100).toFixed(0)+'%');
    const hh2=hhR*(H-py-30);const hy=H-30-hh2;
    items+=wbdContext.sEl('rect',{x:(x+bW*0.5).toFixed(1),y:hy.toFixed(1),width:(bW*0.4).toFixed(1),height:hh2.toFixed(1),fill:'#ff8c44',opacity:'0.7',rx:'1'});
    items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:H-12,fill:'#3a5a7a','font-size':'7','text-anchor':'middle'},b.min+'');
    items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:H-3,fill:'#3a5a7a','font-size':'7','text-anchor':'middle'},'('+b.total+')');
  });
  const strong=bestBand?`<div style="font-size:11px;color:var(--green);margin-top:6px">💪 강한 구속대: ${bestBand.min}~${bestBand.max}km/h (안타율 ${(bestAvg*100).toFixed(0)}%)</div>`:'';
  document.getElementById('b-spd-band').innerHTML=wbdContext.makeSVG(W,H,items)+strong;
};

// Original index.html:6631
wbdContext.renderBatterPitchTable = function renderBatterPitchTable(){
  const groups=Object.keys(wbdContext.PITCH_GROUPS);
  const data=[];
  groups.forEach(g=>{
    const gd=wbdContext.getBatterDataFiltered().filter(d=>wbdContext.pitchGroup(d.pType,d)===g);
    if(!gd.length)return;
    const hits=gd.filter(d=>wbdContext._isHit(d)).length;
    const ab=gd.filter(wbdContext._isInPlay).length;
    const swings=gd.filter(d=>d.bSwing).length;
    const hsw=gd.filter(d=>(d.bSwing && +d.call!==2)).length;
    const evVals=gd.filter(wbdContext._isInPlay).map(d=>+d.ev);
    const avgEV=evVals.length?evVals.reduce((a,b)=>a+b,0)/evVals.length:null;
    const laVals=gd.filter(d=>d.ldeg!=null&&wbdContext._isInPlay(d)).map(d=>+d.ldeg);
    const avgLA=laVals.length?laVals.reduce((a,b)=>a+b,0)/laVals.length:null;
    const avgN=ab>0?hits/ab:null;
    const whiffN=swings>0?hsw/swings*100:0;
    const hhRateN=evVals.length>0?evVals.filter(v=>v>=110).length/evVals.length*100:0;
    // V11.2: 배럴%/HH+/배럴+ (인플레이 기준, 번트 제외)
    const ipG=gd.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
    const brlN=ipG.filter(d=>wbdContext._isBarrel(d)).length;
    const hhpN=ipG.filter(d=>wbdContext._isHHPlus(d)).length;
    const brlpN=ipG.filter(d=>wbdContext._isBarrelPlus(d)).length;
    const brlRate=ipG.length?brlN/ipG.length*100:0;
    const hhpRate=ipG.length?hhpN/ipG.length*100:0;
    const brlpRate=ipG.length?brlpN/ipG.length*100:0;
    data.push({group:g, pitches:gd.length, ab, hits, avg:avgN, whiff:whiffN, ev:avgEV, la:avgLA, hh:hhRateN, brl:brlRate, hhp:hhpRate, brlp:brlpRate});
  });
  const sorted=wbdContext._applyTblSort('b-pitch-table', data, (r,k)=>r[k]);
  const sh=(k,l)=>wbdContext._sortHeader('b-pitch-table',k,l,'renderBatterPitchTable');
  let html=`<thead><tr>${sh('group','구종그룹')}${sh('pitches','투구수')}${sh('avg','안타율')}${sh('whiff','헛스윙%')}${sh('ev','평균EV')}${sh('la','평균LA')}${sh('hh','HH%(≥110)')}${sh('brl','배럴%')}${sh('hhp','HH+%')}${sh('brlp','배럴+%')}</tr></thead><tbody>`;
  sorted.forEach(r=>{
    const avgStr=r.avg!=null?r.avg.toFixed(3):'---';
    const evStr=r.ev!=null?r.ev.toFixed(1):'-';
    const laStr=r.la!=null?r.la.toFixed(1)+'°':'-';
    html+='<tr><td style="color:'+wbdContext.GROUP_COLORS[r.group]+'">'+r.group+'</td><td>'+r.pitches+'</td><td>'+avgStr+'</td><td>'+r.whiff.toFixed(0)+'%</td><td>'+evStr+'</td><td>'+laStr+'</td><td style="color:#ff8c44">'+r.hh.toFixed(0)+'%</td><td style="color:#ffd700">'+r.brl.toFixed(0)+'%</td><td style="color:#ff5533">'+r.hhp.toFixed(0)+'%</td><td style="color:#ff2020">'+r.brlp.toFixed(0)+'%</td></tr>';
  });
  html+='</tbody>';
  document.getElementById('b-pitch-table').innerHTML=html;
};

// Original index.html:6671
wbdContext.renderTiming = function renderTiming(){
  const data=wbdContext.getBatterDataFiltered().filter(d=>d.hSec>0&&d.pSec>0).map(d=>({rt:+d.hSec-d.pSec,hit:wbdContext._isHit(d)}));
  if(!data.length){document.getElementById('b-timing').innerHTML='<span style="color:var(--muted)">타이밍 데이터 없음</span>';return;}
  const vals=data.map(d=>d.rt).filter(v=>v>0&&v<3);
  if(!vals.length){document.getElementById('b-timing').innerHTML='<span style="color:var(--muted)">데이터 없음</span>';return;}
  const mn=Math.floor(Math.min(...vals)*10)/10,mx=Math.ceil(Math.max(...vals)*10)/10;
  const bins=12,step=(mx-mn)/bins;
  const hist=Array(bins).fill(0).map(()=>({hit:0,out:0}));
  data.filter(d=>d.rt>0&&d.rt<3).forEach(d=>{
    const i=Math.min(Math.floor((d.rt-mn)/step),bins-1);
    if(i>=0){if(d.hit)hist[i].hit++;else hist[i].out++;}
  });
  const maxH=Math.max(...hist.map(h=>h.hit+h.out),1);
  const W=340,H=120,px=30,py=10,bW=(W-px-10)/bins;
  let items='';
  hist.forEach((h,i)=>{
    const x=px+i*bW,total=h.hit+h.out;
    const th=(total/maxH)*(H-py-20),hh=(h.hit/Math.max(total,1))*th;
    const y=H-20-th;
    items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:y.toFixed(1),width:(bW-2).toFixed(1),height:th.toFixed(1),fill:'#607080',opacity:'0.5',rx:'1'});
    if(hh>0)items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:(y+th-hh).toFixed(1),width:(bW-2).toFixed(1),height:hh.toFixed(1),fill:'var(--green)',opacity:'0.8',rx:'1'});
    if(i%3===0)items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:H-5,fill:'#3a5a7a','font-size':'7','text-anchor':'middle'},(mn+i*step).toFixed(1)+'s');
  });
  items+=wbdContext.sEl('text',{x:px,y:10,fill:'var(--muted)','font-size':'8'},'빠른 반응 →                    늦은 반응');
  const leg=`<div class="legend"><div class="legend-item"><div class="lsq" style="background:var(--green)"></div>안타</div><div class="legend-item"><div class="lsq" style="background:#607080"></div>아웃</div></div>`;
  document.getElementById('b-timing').innerHTML=leg+wbdContext.makeSVG(W,H,items);
};

// Original index.html:6701
wbdContext._buildSpdCombo = function _buildSpdCombo(comboId, targetId, defVal, onChange){
  const host=document.getElementById(comboId);
  if(!host || host._built)return;
  host._built=true;
  const st={value:defVal};
  window._spdCombo[targetId]=st;
  host.className='spd-combo';
  host.innerHTML=`<div class="spd-combo-btn"><span class="v">${defVal}</span><span class="arw">▼</span></div>
    <div class="spd-combo-pop"><input type="number" placeholder="직접 입력" step="1"><div class="spd-combo-grid"></div></div>`;
  const btn=host.querySelector('.spd-combo-btn');
  const pop=host.querySelector('.spd-combo-pop');
  const inp=host.querySelector('input');
  const grid=host.querySelector('.spd-combo-grid');
  // 그리드 옵션 (5km 단위)
  let opts='';
  for(let v=80;v<=175;v+=5)opts+=`<div class="spd-combo-opt${v===defVal?' sel':''}" data-v="${v}">${v}</div>`;
  grid.innerHTML=opts;
  function setVal(v,fire){
    v=Math.max(60,Math.min(200,+v||0));
    st.value=v;
    host.querySelector('.spd-combo-btn .v').textContent=v;
    grid.querySelectorAll('.spd-combo-opt').forEach(o=>o.classList.toggle('sel',+o.dataset.v===v));
    if(fire!==false && typeof onChange==='function')onChange(v);
  }
  btn.onclick=e=>{e.stopPropagation();const wasOpen=host.classList.contains('open');
    document.querySelectorAll('.spd-combo.open').forEach(c=>c.classList.remove('open'));
    if(!wasOpen){host.classList.add('open');inp.value='';setTimeout(()=>inp.focus(),30);}};
  grid.querySelectorAll('.spd-combo-opt').forEach(o=>{
    o.onclick=e=>{e.stopPropagation();setVal(+o.dataset.v);host.classList.remove('open');};
  });
  inp.oninput=()=>{if(inp.value!=='')setVal(inp.value);};
  inp.onkeydown=e=>{if(e.key==='Enter'){host.classList.remove('open');}};
  inp.onclick=e=>e.stopPropagation();
  pop.onclick=e=>e.stopPropagation();
  return st;
};

// Original index.html:6740
wbdContext._spdVal = function _spdVal(targetId, def){const s=window._spdCombo[targetId];return s?s.value:def;};

// Original index.html:6741
wbdContext._initSpdSelects = function _initSpdSelects(){
  wbdContext._buildSpdCombo('bf-spd-min-combo','bf-spd-min',80,()=>wbdContext.renderBatterFilterAnalysis());
  wbdContext._buildSpdCombo('bf-spd-max-combo','bf-spd-max',175,()=>wbdContext.renderBatterFilterAnalysis());
  wbdContext._buildSpdCombo('b-zone-spd-min-combo','b-zone-spd-min',80,()=>{wbdContext.renderBatterZoneMap();wbdContext.renderBatterZonePitchTable();wbdContext.renderBatterZoneSummary();});
  wbdContext._buildSpdCombo('b-zone-spd-max-combo','b-zone-spd-max',175,()=>{wbdContext.renderBatterZoneMap();wbdContext.renderBatterZonePitchTable();wbdContext.renderBatterZoneSummary();});
};

// Original index.html:6748
wbdContext.renderBatterFilterAnalysis = function renderBatterFilterAnalysis(){
  wbdContext._initSpdSelects();
  const gv=id=>{const e=document.getElementById(id);return e?e.value:'';};
  const spdMin=wbdContext._spdVal('bf-spd-min',80), spdMax=wbdContext._spdVal('bf-spd-max',175);
  const zoneF=gv('bf-zone'), countF=gv('bf-count'), splitBy=gv('bf-splitby')||'pitch';
  let data=wbdContext.getBatterDataFiltered().filter(d=>+d.spdK>=spdMin&&+d.spdK<=spdMax);
  // 코스 필터 (몸쪽/바깥은 타자손 기준: 우타 zx+가 몸쪽)
  function inward(d){const zx=+d.zoneX; const h=d.bZone; return h==='R'?zx:(h==='L'?-zx:zx);}
  if(zoneF){
    data=data.filter(d=>{
      const zx=+d.zoneX, zy=+d.zoneY, iw=inward(d), rm=Math.max(Math.abs(zx),Math.abs(zy));
      switch(zoneF){
        case 'in': return iw>0.3;
        case 'mid-h': return iw>=-0.3&&iw<=0.3;
        case 'out': return iw<-0.3;
        case 'hi': return zy>0.3;
        case 'mid-v': return zy>=-0.3&&zy<=0.3;
        case 'lo': return zy<-0.3;
        case 'inzone': return rm<=1;
        case 'outzone': return rm>1;
      }
      return true;
    });
  }
  // 카운트 필터
  if(countF){
    data=data.filter(d=>{
      const b=+d.ball||0,s=+d.strk||0;
      switch(countF){
        case 'first': return b===0&&s===0;
        case 'ahead': return b>s;
        case 'even': return b===s;
        case 'behind': return s>b;
        case '2strike': return s===2;
      }
      return true;
    });
  }
  // 묶기 키
  function keyOf(d){
    const sp=+d.spdK;
    if(splitBy==='pitch') return wbdContext.pitchGroup(d.pType,d);
    if(splitBy==='spd5'){const b=Math.floor(sp/5)*5; return b+'~'+(b+5);}
    if(splitBy==='spd10'){const b=Math.floor(sp/10)*10; return b+'~'+(b+10);}
    if(splitBy==='zone9'){
      const iw=inward(d),zy=+d.zoneY;
      const h=iw>0.3?'몸쪽':(iw<-0.3?'바깥':'중앙');
      const v=zy>0.3?'상':(zy<-0.3?'하':'중');
      return v+h;
    }
    if(splitBy==='count'){const b=+d.ball||0,s=+d.strk||0; return b+'-'+s;}
    return '전체';
  }
  const buckets={};
  data.forEach(d=>{const k=keyOf(d); (buckets[k]=buckets[k]||[]).push(d);});
  // 각 버킷 집계
  const rows=Object.entries(buckets).map(([k,gd])=>{
    const swings=gd.filter(d=>d.bSwing).length;
    const hsw=gd.filter(d=>d.bSwing&&+d.call!==2).length;
    const ip=gd.filter(wbdContext._isInPlay);
    const ab=ip.length, hits=gd.filter(wbdContext._isHitPlay).length;
    const ev=ip.map(d=>+d.ev).filter(v=>v>0);
    const evM=ev.length?ev.reduce((a,b)=>a+b,0)/ev.length:null;
    const la=ip.map(d=>+d.ldeg).filter(v=>!isNaN(v));
    const laM=la.length?la.reduce((a,b)=>a+b,0)/la.length:null;
    const hp=ip.map(d=>Math.abs(+d.hPos)).filter(v=>!isNaN(v));
    const hpM=hp.length?hp.reduce((a,b)=>a+b,0)/hp.length:null;
    const gaps=gd.map(d=>+d.hSec-(+d.pSec)).filter(v=>v>0&&v<5);
    const gapM=gaps.length?gaps.reduce((a,b)=>a+b,0)/gaps.length:null;
    const brl=ip.filter(d=>wbdContext._isBarrelPlus(d)).length;
    return {key:k,n:gd.length,swings,ab,hits,avg:ab?hits/ab:null,
      whiff:swings?hsw/swings*100:null,ev:evM,la:laM,hpos:hpM,timing:gapM,
      brlp:ip.length?brl/ip.length*100:null};
  });
  // 정렬: 구속키면 숫자순, 아니면 타수순
  if(splitBy==='spd5'||splitBy==='spd10') rows.sort((a,b)=>parseInt(a.key)-parseInt(b.key));
  else if(splitBy==='count') rows.sort((a,b)=>a.key.localeCompare(b.key));
  else rows.sort((a,b)=>b.ab-a.ab);
  const sorted=wbdContext._applyTblSort('b-filter-analysis',rows,(r,k)=>r[k]);
  const sh=(k,l)=>wbdContext._sortHeader('b-filter-analysis',k,l,'renderBatterFilterAnalysis');
  const lblMap={pitch:'구종',spd5:'구속',spd10:'구속',zone9:'코스',count:'카운트'};
  let html=`<thead><tr>${sh('key',lblMap[splitBy]||'구분')}${sh('n','투구')}${sh('ab','타수')}${sh('avg','안타율')}${sh('whiff','헛스윙%')}${sh('ev','EV')}${sh('la','LA')}${sh('hpos','|hPos|')}${sh('timing','반응')}${sh('brlp','배럴+%')}</tr></thead><tbody>`;
  function heat(v,type){
    if(v==null)return '';
    let t;
    if(type==='avg')t=Math.max(0,Math.min(1,(v-0.15)/0.35));
    else if(type==='whiff')t=1-Math.max(0,Math.min(1,(v-10)/40));
    else if(type==='ev')t=Math.max(0,Math.min(1,(v-90)/35));
    else if(type==='hpos')t=1-Math.max(0,Math.min(1,(v-0.3)/0.5));
    else return '';
    const r=Math.round(200-t*150),g=Math.round(60+t*130);
    return `background:rgba(${r},${g},70,0.35)`;
  }
  sorted.forEach(r=>{
    const colr = splitBy==='pitch'?(wbdContext.GROUP_COLORS[r.key]||'#ccc'):'#ccd';
    html+=`<tr><td style="color:${colr};font-weight:600">${r.key}</td>`;
    html+=`<td>${r.n}</td><td>${r.ab}</td>`;
    html+=`<td style="${heat(r.avg,'avg')}">${r.avg!=null?'.'+String(Math.round(r.avg*1000)).padStart(3,'0'):'-'}</td>`;
    html+=`<td style="${heat(r.whiff,'whiff')}">${r.whiff!=null?r.whiff.toFixed(0)+'%':'-'}</td>`;
    html+=`<td style="${heat(r.ev,'ev')}">${r.ev!=null?r.ev.toFixed(0):'-'}</td>`;
    html+=`<td>${r.la!=null?r.la.toFixed(1)+'°':'-'}</td>`;
    html+=`<td style="${heat(r.hpos,'hpos')}">${r.hpos!=null?r.hpos.toFixed(2):'-'}</td>`;
    html+=`<td>${r.timing!=null?r.timing.toFixed(3):'-'}</td>`;
    html+=`<td style="color:#ff5533">${r.brlp!=null?r.brlp.toFixed(0)+'%':'-'}</td>`;
    html+='</tr>';
  });
  html+='</tbody>';
  document.getElementById('b-filter-analysis').innerHTML=html;
  const tot=data.length, totAb=data.filter(wbdContext._isInPlay).length;
  const te=document.getElementById('bf-total');
  if(te)te.textContent=`필터 결과: ${tot}구 / ${totAb}타수`;
};

// Original index.html:6864
wbdContext._tblSortToggle = function _tblSortToggle(tableId, key, callback){
  const cur=window._tblSort[tableId]||{key:null,dir:0};
  if(cur.key!==key){
    window._tblSort[tableId]={key, dir:1};
  } else {
    if(cur.dir===1) window._tblSort[tableId]={key, dir:-1};
    else if(cur.dir===-1) window._tblSort[tableId]={key:null, dir:0};
    else window._tblSort[tableId]={key, dir:1};
  }
  if(typeof callback==='function') callback();
};

// Original index.html:6876
wbdContext._sortHeader = function _sortHeader(tableId, key, label, callback){
  const cur=window._tblSort[tableId]||{key:null,dir:0};
  const isActive=cur.key===key;
  const arrow=!isActive?'':cur.dir===1?' ▼':cur.dir===-1?' ▲':'';
  const color=isActive?'color:var(--amber);font-weight:700':'';
  const fnName=callback;
  return `<th onclick="_tblSortToggle('${tableId}','${key}',${fnName})" style="cursor:pointer;user-select:none;${color}" title="클릭하여 정렬 (▼내림 → ▲오름 → 원래대로)">${label}${arrow}</th>`;
};

// Original index.html:6885
wbdContext._applyTblSort = function _applyTblSort(tableId, rows, getValFn){
  const cur=window._tblSort[tableId];
  if(!cur||cur.dir===0||!cur.key) return rows;  // 원래 순서
  const sorted=[...rows];
  sorted.sort((a,b)=>{
    let va=getValFn(a, cur.key);
    let vb=getValFn(b, cur.key);
    // null/undefined 끝으로
    if(va==null) return 1;
    if(vb==null) return -1;
    if(typeof va==='string' && typeof vb==='string') return cur.dir*va.localeCompare(vb,'ko');
    return cur.dir*((+vb||0)-(+va||0));
  });
  return sorted;
};

// Original index.html:6901
wbdContext.renderCountTable = function renderCountTable(){
  const bd=wbdContext.getBatterDataFiltered();
  const counts=[[0,0],[0,1],[1,0],[0,2],[1,1],[2,0],[2,1],[1,2],[2,2],[3,0],[3,1],[3,2]];
  // 데이터 수집 (표준 BA 사용: AB = 인플레이 + K)
  const allFiltered = wbdContext.getBatterDataFiltered();
  const data=[];
  counts.forEach(([b,s])=>{
    // 카운트별 모든 투구 (EV 조건 X, K도 카운트)
    const sub = allFiltered.filter(d => +d.ball===b && +d.strk===s);
    if(!sub.length) return;
    const hits = sub.filter(d => wbdContext._isHit(d)).length;
    const ab = sub.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    if(!ab) return;
    data.push({count:`${b}-${s}`, ab, hits, avg:hits/ab});
  });
  // 정렬
  const sorted=wbdContext._applyTblSort('b-count-table', data, (r,k)=>r[k]);
  // 헤더 (정렬 가능)
  const sh=(k,l)=>wbdContext._sortHeader('b-count-table',k,l,'renderCountTable');
  let html=`<thead><tr>${sh('count','카운트')}${sh('ab','타수')}${sh('hits','안타')}${sh('avg','타율')}</tr></thead><tbody>`;
  sorted.forEach(r=>{
    html+=`<tr><td style="font-family:var(--mono)">${r.count}</td><td>${r.ab}</td><td>${r.hits}</td><td>${r.avg.toFixed(3)}</td></tr>`;
  });
  document.getElementById('b-count-table').innerHTML=html+'</tbody>';
};

// Original index.html:6930
wbdContext.renderRunnerTable = function renderRunnerTable(){
  const allF = wbdContext.getBatterDataFiltered();
  const sits=[
    {l:'무주자',f:d=>!d.b1&&!d.b2&&!d.b3},
    {l:'주자 있음',f:d=>d.b1||d.b2||d.b3},
    {l:'득점권',f:d=>d.b2||d.b3},
    {l:'만루',f:d=>d.b1&&d.b2&&d.b3}
  ];
  const data=[];
  sits.forEach(s=>{
    const sub=allF.filter(s.f);
    const hits=sub.filter(d => wbdContext._isHit(d)).length;
    const ab = sub.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    data.push({sit:s.l, ab, hits, avg: ab>0?hits/ab:0});
  });
  const sorted=wbdContext._applyTblSort('b-runner-table', data, (r,k)=>r[k]);
  const sh=(k,l)=>wbdContext._sortHeader('b-runner-table',k,l,'renderRunnerTable');
  let html=`<thead><tr>${sh('sit','상황')}${sh('ab','타수')}${sh('hits','안타')}${sh('avg','타율')}</tr></thead><tbody>`;
  sorted.forEach(r=>{
    html+=`<tr><td>${r.sit}</td><td>${r.ab}</td><td>${r.hits}</td><td>${r.ab>0?r.avg.toFixed(3):'---'}</td></tr>`;
  });
  document.getElementById('b-runner-table').innerHTML=html+'</tbody>';
};

// Original index.html:6957
wbdContext.renderHeightStats = function renderHeightStats(){
  const el=document.getElementById('b-height-stats');
  if(!el)return;
  const all=wbdContext.getBatterDataFiltered();
  if(!all.length){el.innerHTML='<span style="color:var(--muted)">데이터 없음</span>';return;}
  // 키별 집계
  // V10.3 fix: 타수(AB)를 'ev>0이면 무조건'에서 '타석 종료 투구 중 볼넷·사구 제외'로 수정.
  //   파울(ev>0이지만 타석 진행중)이 타수로 잘못 잡히던 버그. 안타도 낫아웃 출루 제외 통일.
  const byH={};
  // 타석 종료 판정 위해 타자별 정렬 필요 — all은 시간순 가정, 인덱스로 다음 투구 확인
  all.forEach((d,i)=>{
    if(!d.bHCm)return;
    const h=Math.round(+d.bHCm);
    if(!byH[h])byH[h]={total:0,hits:0,hrs:0,ab:0,evSum:0,evCnt:0,laSum:0,laCnt:0};
    byH[h].total++;
    // V11.1 fix: 타구질(EV/LA)은 인플레이 타구에서만 집계 — 파울(result=3) 제외
    if(wbdContext._isInPlay(d)){
      byH[h].evSum+=+d.ev;byH[h].evCnt++;
      if(d.ldeg!=null){byH[h].laSum+=+d.ldeg;byH[h].laCnt++;}
    }
    // 타석 종료 판정: 다음 투구가 다른 타자/이닝/게임이거나, 확정 종료 이벤트(HR/BB/HBP)
    const res=+d.result;
    if(wbdContext._isPaEnd(d)){
      // 안타: 낫아웃 출루 제외 (1BSafe=1 & ev>0) 또는 홈런
      const isHit=wbdContext._isHit(d);
      // 타수: 타석 종료 - 볼넷(5)/사구(6) 제외
      if(res!==5&&res!==6) byH[h].ab++;
      if(isHit) byH[h].hits++;
      if(res===4) byH[h].hrs++;
    }
  });
  const heights=Object.keys(byH).map(Number).sort((a,b)=>b-a);
  if(!heights.length){el.innerHTML='<span style="color:var(--muted)">키 데이터 없음</span>';return;}
  let html='<div class="tbl-wrap"><table class="data-table">'
    +'<thead><tr><th>키(cm)</th><th>경기내투구</th><th>타수</th><th>안타</th><th>홈런</th><th>타율</th><th>평균EV</th><th>평균LA</th></tr></thead><tbody>';
  heights.forEach(h=>{
    const r=byH[h];
    const avg=r.ab>0?(r.hits/r.ab).toFixed(3):'---';
    const avgEV=r.evCnt>0?(r.evSum/r.evCnt).toFixed(1):'-';
    const avgLA=r.laCnt>0?(r.laSum/r.laCnt).toFixed(1)+'\u00b0':'-';
    html+=`<tr><td style="color:var(--amber);font-family:var(--mono)">${h}</td>`
      +`<td>${r.total}</td><td>${r.ab}</td><td>${r.hits}</td><td>${r.hrs}</td>`
      +`<td style="font-family:var(--mono)">${avg}</td>`
      +`<td style="font-family:var(--mono)">${avgEV}</td>`
      +`<td style="font-family:var(--mono)">${avgLA}</td></tr>`;
  });
  html+='</tbody></table></div>';
  if(heights.length>1){
    html+='<div style="font-size:10px;color:var(--muted);margin-top:8px">* 여러 경기에서 다른 키 설정이 감지됨</div>';
  }
  el.innerHTML=html;
};

// Original index.html:7010
wbdContext.renderResultPie = function renderResultPie(){
  const bd=wbdContext.getBatterDataFiltered().filter(d=>d.ev>0);
  const counts={};
  bd.forEach(d=>{const r=d.result||0;counts[r]=(counts[r]||0)+1;});
  const total=Object.values(counts).reduce((a,b)=>a+b,0)||1;
  const order=[4,1,2,5,6,3,0].filter(k=>counts[k]);
  const CX=120,CY=100,R=80;
  let items='',start=0;
  const W=240;
  order.forEach(k=>{
    const cnt=counts[k];const angle=(cnt/total)*Math.PI*2;
    const x1=CX+R*Math.sin(start),y1=CY-R*Math.cos(start);
    const x2=CX+R*Math.sin(start+angle),y2=CY-R*Math.cos(start+angle);
    const large=angle>Math.PI?1:0;
    const mid=start+angle/2;
    const lx=CX+(R+14)*Math.sin(mid),ly=CY-(R+14)*Math.cos(mid);
    items+=`<path d="M${CX},${CY} L${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${wbdContext.RESULT_COLORS[k]}" opacity="0.88"/>`;
    if(cnt/total>0.05)items+=wbdContext.sEl('text',{x:lx.toFixed(1),y:(ly+3).toFixed(1),fill:'#fff','font-size':'8','text-anchor':'middle'},`${wbdContext.RESULT_NAMES[k]} ${(cnt/total*100).toFixed(0)}%`);
    start+=angle;
  });
  const leg=order.map(k=>`<div class="legend-item"><div class="ldot" style="background:${wbdContext.RESULT_COLORS[k]}"></div>${wbdContext.RESULT_NAMES[k]||k}</div>`).join('');
  document.getElementById('b-result-pie').innerHTML=`<div class="legend">${leg}</div>${wbdContext.makeSVG(W,200,items)}`;
};

// Original index.html:7034
wbdContext.renderCompareRadar = function renderCompareRadar(){
  const b1=document.getElementById('compare-bat1').value;
  const b2=document.getElementById('compare-bat2').value;
  if(!b1||!b2){document.getElementById('b-compare-radar').innerHTML='<span style="color:var(--muted)">두 타자를 선택하세요</span>';return;}
  const keys=['avg','slg','avgEV','barrelPct','whiffPct'];
  const lnames=['타율','장타율','평균EV%','배럴%','헛스윙%'];
  function getStats(name){
    const bd=wbdContext.getBatterDataByName(name).filter(wbdContext._isInPlay);
    const hits=bd.filter(d=>wbdContext._isHit(d)).length;
    const hrs=bd.filter(d=>d.result===4).length;
    const evVals=bd.map(d=>+d.ev);
    const avgEV=evVals.length?evVals.reduce((a,b)=>a+b,0)/evVals.length:0;
    const barrels=bd.filter(d=>wbdContext._isBarrel(d)).length;
    const allBd=wbdContext.getBatterDataByName(name);
    const swings=allBd.filter(d=>d.bSwing).length;
    const whiff=allBd.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    return {avg:bd.length>0?hits/bd.length:0,slg:bd.length>0?(hits+hrs*3)/bd.length:0,avgEV:avgEV/130,barrelPct:bd.length>0?barrels/bd.length:0,whiffPct:swings>0?whiff/swings:0};
  }
  const s1=getStats(b1),s2=getStats(b2);
  const N=5,CX=140,CY=120,R=90;
  let items='';
  [0.25,0.5,0.75,1].forEach(t=>{
    const pts=Array.from({length:N},(_,i)=>{const a=i/N*2*Math.PI-Math.PI/2;return `${(CX+R*t*Math.cos(a)).toFixed(1)},${(CY+R*t*Math.sin(a)).toFixed(1)}`}).join(' ');
    items+=wbdContext.sEl('polygon',{points:pts,fill:'none',stroke:'#1a2f4a','stroke-width':'0.5'});
  });
  keys.forEach((_,i)=>{const a=i/N*2*Math.PI-Math.PI/2;items+=wbdContext.sEl('line',{x1:CX,y1:CY,x2:(CX+R*Math.cos(a)).toFixed(1),y2:(CY+R*Math.sin(a)).toFixed(1),stroke:'#1a2f4a','stroke-width':'0.5'})});
  [[s1,'#f5a623'],[s2,'#2196f3']].forEach(([s,col])=>{
    const pts=keys.map((k,i)=>{const a=i/N*2*Math.PI-Math.PI/2;const v=s[k];return `${(CX+R*v*Math.cos(a)).toFixed(1)},${(CY+R*v*Math.sin(a)).toFixed(1)}`}).join(' ');
    items+=wbdContext.sEl('polygon',{points:pts,fill:`${col}22`,stroke:col,'stroke-width':'1.5'});
  });
  keys.forEach((_,i)=>{const a=i/N*2*Math.PI-Math.PI/2;const lx=CX+(R+20)*Math.cos(a),ly=CY+(R+20)*Math.sin(a);items+=wbdContext.sEl('text',{x:lx.toFixed(1),y:(ly+4).toFixed(1),fill:'#9ab','font-size':'9','text-anchor':'middle'},lnames[i])});
  const leg=`<div class="legend"><div class="legend-item"><div class="ldot" style="background:#f5a623"></div>${b1}</div><div class="legend-item"><div class="ldot" style="background:#2196f3"></div>${b2}</div></div>`;
  document.getElementById('b-compare-radar').innerHTML=leg+wbdContext.makeSVG(280,240,items);
};

// Original index.html:7070
wbdContext.renderBatterLog = function renderBatterLog(){
  const innSel=document.getElementById('bl-inn-sel').value;
  const grpSel=document.getElementById('bl-group-sel').value;
  const resSel=document.getElementById('bl-result-sel').value;
  const callSel=document.getElementById('bl-call-sel').value;
  const zoneSel=document.getElementById('bl-zone-sel')?document.getElementById('bl-zone-sel').value:'';
  let data=wbdContext.getBatterDataFiltered();
  if(innSel)data=data.filter(d=>d.inn===+innSel);
  if(grpSel)data=data.filter(d=>wbdContext.pitchGroup(d.pType,d)===grpSel);
  if(resSel!=='')data=data.filter(d=>d.result===+resSel);
  if(callSel!=='')data=data.filter(d=>wbdContext._pitchOutcome(d)===callSel);
  if(zoneSel==='in')data=data.filter(d=>d.zoneX!=null&&Math.abs(+d.zoneX)<=1&&Math.abs(+d.zoneY||0)<=1);
  else if(zoneSel==='out')data=data.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
  const total=data.length,pages=Math.max(1,Math.ceil(total/wbdContext.PAGE_SIZE));
  wbdContext.batterLogPage=Math.min(wbdContext.batterLogPage,pages-1);
  const slice=data.slice(wbdContext.batterLogPage*wbdContext.PAGE_SIZE,(wbdContext.batterLogPage+1)*wbdContext.PAGE_SIZE);
  function cb(c){const m={0:'badge-strike',1:'badge-ball',2:'badge-hit',4:'badge-swing',3:'badge-hbp'};return`<span class="badge ${m[c]||'badge-out'}">${wbdContext.CALL_NAMES[c]||c}</span>`}
  function rb(r){const m={4:'badge-hr',5:'badge-walk',6:'badge-hbp',1:'badge-out',2:'badge-out'};return r>0?`<span class="badge ${m[r]||'badge-out'}">${wbdContext.RESULT_NAMES[r]}</span>`:'<span class="badge badge-out">-</span>'}
  // V9.9: 스윙 표식 — bSwing(parseCSV 보정 적용됨) 기준
  // 스윙했으면 컨택(타구 발생)/헛스윙 구분, 안 했으면 노스윙
  function sb(d){
    const swung=wbdContext._isSwing(d);
    if(!swung) return '<span class="badge badge-out" style="opacity:0.5">노스윙</span>';
    // 스윙함 — 타구 발생(ev>0) = 컨택, 아니면 헛스윙
    if(+d.ev>0) return '<span class="badge" style="background:rgba(57,255,138,0.18);color:#39ff8a">컨택</span>';
    return '<span class="badge" style="background:rgba(255,69,96,0.18);color:#ff4560">헛스윙</span>';
  }
  // V11.3: 배트 중심(hPos) 색상 — 중심에 가까울수록 초록
  function hposBadge(d){
    if(d.hPos==null||!(+d.ev>0)) return '<span style="color:var(--muted)">-</span>';
    const h=+d.hPos;
    const dev=Math.abs(h-0.5);                       // 중심(0.5)에서 벗어난 정도
    const col = dev<=0.10?'#39ff8a' : dev<=0.20?'#f5a623' : '#ff4560';
    const lbl = dev<=0.10?'중심' : dev<=0.20?'약간빗나감' : '빗맞음';
    return `<span style="font-family:var(--mono);color:${col}" title="${lbl} (0.5=배트 중심)">${h.toFixed(2)}</span>`;
  }
  // 타구 품질 뱃지
  function bbqBadge(d){
    if(!wbdContext._isInPlay(d)||wbdContext._isBunt(d)) return '<span style="color:var(--muted)">-</span>';
    const q=wbdContext._bbQuality(d), m=wbdContext._BBQ_META[q]||{};
    return `<span class="badge" style="background:${m.color||'#888'}22;color:${m.color||'#888'}">${m.label||q}</span>`;
  }
  let html=`<thead><tr><th>#</th><th>이닝</th><th>투수</th><th>구종</th><th>구속</th><th>코스</th><th>판정</th><th>스윙</th><th title="배트 접촉 위치 (0.5=중심)">배트중심</th><th title="배트 속도">배트속도</th><th>결과</th><th>EV</th><th>발사각</th><th>타구품질</th><th title="리그 기대 아웃확률 · 🍀행운안타 💀불운아웃">xOut</th></tr></thead><tbody>`;
  slice.forEach(d=>{
    const gi=wbdContext._gIndexOf(d);
    const _zc = d.zoneX!=null ? (wbdContext._isInZone(d)?'<span style="color:#f5a623">존안</span>':'<span style="color:var(--muted)">존밖</span>') : '-';
    html+=`<tr onclick="showPitchModal(${gi})"><td style="color:var(--muted)">${d.id||''}</td><td>${d.inn}이닝${d.half===0?'말':'초'}</td><td>${d.pName||'-'}</td><td style="color:${wbdContext.GROUP_COLORS[wbdContext.pitchGroup(d.pType,d)]}">${wbdContext.PITCH_NAMES[d.pType]||d.pType}</td><td style="font-family:var(--mono)">${d.spdK||'-'}</td><td style="font-size:10px">${_zc}</td><td>${cb(d.call)}</td><td>${sb(d)}</td><td>${hposBadge(d)}</td><td style="font-family:var(--mono);color:var(--muted)">${d.batSpd>0?d.batSpd:'-'}</td><td>${wbdContext._finalOutcomeBadge(d)}</td><td style="font-family:var(--mono)">${d.ev>0?d.ev:'-'}</td><td style="font-family:var(--mono)">${d.ldeg!=null&&d.ev>0?d.ldeg+'°':'-'}</td><td>${bbqBadge(d)}</td><td>${wbdContext._xoutBadge(d)}</td></tr>`;
  });
  html+='</tbody>';
  document.getElementById('batter-log-table').innerHTML=html;
  let pag='';for(let p=0;p<pages;p++)pag+=`<button class="${p===wbdContext.batterLogPage?'active':''}" onclick="batterLogPage=${p};renderBatterLog()">${p+1}</button>`;
  document.getElementById('batter-log-pag').innerHTML=pag;
};

// Original index.html:7127
wbdContext.showPitchModal = function showPitchModal(gi){
  const d=wbdContext.G[gi];if(!d)return;

  // ── 존맵 (투수 존 차트와 동일 좌표계: CX + zoneX*HW, 존 밖도 표시) ──
  const W=220,H=250, CX=110, CY=120, HW=40, HH=50;
  const toSX=x=>CX+(+x)*HW, toSY=y=>CY-(+y)*HH;
  let items='';
  items+=wbdContext.sEl('rect',{x:0,y:0,width:W,height:H,fill:'#060e1a',rx:'4'});
  // 존 밖 격자(±2) 가이드
  items+=wbdContext.sEl('rect',{x:toSX(-2),y:toSY(2),width:(HW*4),height:(HH*4),fill:'none',stroke:'#1a2a40','stroke-width':'1','stroke-dasharray':'2,3'});
  // 스트라이크존 (±1)
  items+=wbdContext.sEl('rect',{x:toSX(-1),y:toSY(1),width:(HW*2),height:(HH*2),fill:'rgba(245,166,35,0.05)',stroke:'#f5a623','stroke-width':'1.5'});
  // 존 3분할 보조선
  for(let i=1;i<3;i++){
    const gx=toSX(-1+i*(2/3)), gy=toSY(1-i*(2/3));
    items+=`<line x1="${gx.toFixed(1)}" y1="${toSY(1).toFixed(1)}" x2="${gx.toFixed(1)}" y2="${toSY(-1).toFixed(1)}" stroke="#f5a623" stroke-width="0.4" opacity="0.35"/>`;
    items+=`<line x1="${toSX(-1).toFixed(1)}" y1="${gy.toFixed(1)}" x2="${toSX(1).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="#f5a623" stroke-width="0.4" opacity="0.35"/>`;
  }
  // 홈플레이트 표시
  items+=`<polygon points="${CX-14},${H-16} ${CX+14},${H-16} ${CX+14},${H-10} ${CX},${H-4} ${CX-14},${H-10}" fill="#152238" stroke="#2a4060" stroke-width="0.8"/>`;
  // 목표 위치
  if(d.targetX!=null&&!isNaN(+d.targetX)){
    const tx=toSX(d.targetX), ty=toSY(d.targetY||0);
    items+=`<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="6" fill="none" stroke="#f5a623" stroke-width="1.5" stroke-dasharray="3,2"/>`;
  }
  // 실제 투구 위치 (결과 기반 색상 — 존 차트와 통일)
  if(d.zoneX!=null&&!isNaN(+d.zoneX)){
    const ax=toSX(d.zoneX), ay=toSY(d.zoneY||0);
    const oc=wbdContext._pitchOutcome(d), meta=wbdContext._OUTCOME_META[oc]||{};
    items+=`<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="6.5" fill="${meta.color||'#888'}" opacity="0.92" stroke="#000" stroke-width="0.6"/>`;
    // 목표→실제 연결선 (제구 편차)
    if(d.targetX!=null&&!isNaN(+d.targetX)){
      items+=`<line x1="${toSX(d.targetX).toFixed(1)}" y1="${toSY(d.targetY||0).toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" stroke="#f5a623" stroke-width="0.8" opacity="0.45" stroke-dasharray="2,2"/>`;
    }
  }
  const zoneSVG=wbdContext.makeSVG(W,H,items);

  // ── 낙구 위치 (타구 분석 탭과 동일한 실측 FIELD_CONFIG) ──
  let sprayMini='';
  if(wbdContext._isInPlay(d)&&d.lx!=null&&d.lz!=null&&(+d.lx||+d.lz)){
    const oc=wbdContext._pitchOutcome(d), meta=wbdContext._OUTCOME_META[oc]||{};
    const dist=Math.hypot(+d.lx-wbdContext.FIELD.HP.lx, +d.lz-wbdContext.FIELD.HP.lz);
    const svg=wbdContext._renderSprayField([{lx:+d.lx,lz:+d.lz,color:meta.color||'#888',r:5,op:0.95}],
                                {w:220,h:200,pad:8,small:true,showTrail:true});
    sprayMini=`<div style="margin-top:10px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">낙구 위치 · 비거리 ${dist.toFixed(0)}m</div>${svg}</div>`;
  }

  // ── 배트 중심(hPos) 시각화 ──
  let hposBar='';
  if(d.hPos!=null&&+d.ev>0){
    const h=+d.hPos, dev=Math.abs(h-0.5);
    const col = dev<=0.10?'#39ff8a' : dev<=0.20?'#f5a623' : '#ff4560';
    const lbl = dev<=0.10?'중심 타격' : dev<=0.20?'약간 빗나감' : '빗맞음';
    const BW=200,BH=26;
    let b='';
    b+=wbdContext.sEl('rect',{x:0,y:8,width:BW,height:10,fill:'#152238',rx:'5'});
    // 스윗스팟 구간 (0.35~0.65)
    b+=wbdContext.sEl('rect',{x:(BW*0.35).toFixed(1),y:8,width:(BW*0.30).toFixed(1),height:10,fill:'rgba(204,136,255,0.25)',rx:'5'});
    b+=`<line x1="${(BW*0.5).toFixed(1)}" y1="4" x2="${(BW*0.5).toFixed(1)}" y2="22" stroke="#cc88ff" stroke-width="1" stroke-dasharray="2,2"/>`;
    b+=`<circle cx="${(BW*h).toFixed(1)}" cy="13" r="6" fill="${col}" stroke="#000" stroke-width="0.6"/>`;
    hposBar=`<div style="margin-top:10px"><div style="font-size:10px;color:var(--muted);margin-bottom:2px">배트 접촉 위치 (hPos) — <span style="color:${col}">${h.toFixed(2)} · ${lbl}</span></div>${wbdContext.makeSVG(BW,BH,b)}<div style="font-size:9px;color:var(--muted);display:flex;justify-content:space-between"><span>손잡이</span><span style="color:#cc88ff">중심</span><span>끝</span></div></div>`;
  }

  const oc=wbdContext._pitchOutcome(d), ocMeta=wbdContext._OUTCOME_META[oc]||{};
  const bbq=(wbdContext._isInPlay(d)&&!wbdContext._isBunt(d))?wbdContext._BBQ_META[wbdContext._bbQuality(d)]:null;
  // ── xOut (기대 아웃확률) + 행운/불운 판정 ──
  let xoutBlock='';
  if(typeof wbdContext._pitchXOut==='function'){
    const xo=wbdContext._pitchXOut(d);
    if(xo!=null){
      const pct=Math.round(xo*100);
      const isOut=wbdContext._isInPlay(d)&&!wbdContext._isHit(d);
      const isHR=+d.result===4;
      let verdict='', vcol='var(--text)';
      if(isHR){ verdict='홈런 (아웃 불가)'; vcol='#ff4560'; }
      else if(!isOut && xo>=0.7){ verdict='🍀 행운의 안타 (원래 잡혔어야)'; vcol='#39ff8a'; }
      else if(isOut && xo<=0.35){ verdict='💀 불운한 아웃 (잘 친 타구)'; vcol='#ff4560'; }
      else if(!isOut){ verdict='안타 (타구질상 적정)'; vcol='var(--text)'; }
      else { verdict='아웃 (타구질상 적정)'; vcol='var(--text)'; }
      const barCol = xo>=0.7?'#39ff8a':xo>=0.4?'#f5a623':'#ff4560';
      xoutBlock=`<div style="margin-top:12px;background:var(--card2);border-radius:6px;padding:10px 12px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:5px">🎯 기대 아웃확률 (xOut) — 같은 EV·발사각 타구의 리그 아웃율</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="flex:1;background:#152238;height:16px;border-radius:8px;overflow:hidden;position:relative">
            <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:${barCol};border-radius:8px"></div>
            <div style="position:absolute;left:8px;top:0;height:100%;display:flex;align-items:center;font-family:var(--mono);font-size:11px;font-weight:700;color:#fff;mix-blend-mode:difference">${pct}% 아웃</div>
          </div>
        </div>
        <div style="font-size:12px;font-weight:700;color:${vcol};margin-top:6px;text-align:center">${verdict}</div>
      </div>`;
    }
  }
  // 배럴/하드히트 태그
  let qualTags='';
  if(wbdContext._isInPlay(d)&&+d.ev>0){
    const t=[];
    if(wbdContext._isBarrel(d)) t.push('<span style="background:#ff456022;color:#ff4560;padding:1px 7px;border-radius:10px;font-size:10px">배럴</span>');
    if(wbdContext._isHardHit(d)) t.push('<span style="background:#ff8c4422;color:#ff8c44;padding:1px 7px;border-radius:10px;font-size:10px">하드히트</span>');
    if(t.length) qualTags=`<div style="margin-top:4px;display:flex;gap:5px">${t.join('')}</div>`;
  }
  // ── Run Value (이 타석의 득점 기대값 변화) ──
  let rvBlock='';
  try{
    if(typeof wbdContext.getRunValueData==='function'){
      const D=wbdContext.getRunValueData();
      const b1=d.b1?1:0,b2=d.b2?1:0,b3=d.b3?1:0,ou=+d.out||0;
      if(ou<3){
        const reNow=D.REget(b1,b2,b3,ou);
        rvBlock=`<div style="margin-top:8px;background:var(--card2);border-radius:6px;padding:8px 12px;font-size:11px">
          <span style="color:var(--muted)">현재 상황 득점 기대값(RE):</span> <b style="font-family:var(--mono);color:#ffd700">${reNow.toFixed(2)}점</b>
          <span style="color:var(--muted);font-size:10px"> · ${b1||b2||b3?['1루','2루','3루'].filter((_,i)=>[b1,b2,b3][i]).join('·')+' 주자':'주자 없음'} ${ou}아웃</span></div>`;
      }
    }
  }catch(e){}
  // ── 같은 상황(카운트·구종) 리그 평균 비교 ──
  let leagueBlock='';
  try{
    const cnt=(+d.ball||0)+'-'+(+d.strk||0);
    const pg=wbdContext.pitchGroup(d.pType,d);
    const peers=wbdContext.G.filter(x=>((+x.ball||0)+'-'+(+x.strk||0))===cnt && wbdContext.pitchGroup(x.pType,x)===pg);
    if(peers.length>=20){
      const sw=peers.filter(wbdContext._isSwing).length;
      const wh=peers.filter(wbdContext._isWhiff).length;
      const ip=peers.filter(wbdContext._isInPlay);
      const hits=peers.filter(wbdContext._isHit).length;
      const ab=peers.filter(x=>{const r=+x.result;return +x['1BSafe']===1||r===4||r===1||r===2||(+x.strk===2&&(+x.call===0||+x.call===4));}).length;
      const avgEV=ip.filter(x=>+x.ev>0).length? ip.filter(x=>+x.ev>0).reduce((s,x)=>s+(+x.ev),0)/ip.filter(x=>+x.ev>0).length : 0;
      leagueBlock=`<div style="margin-top:8px;background:var(--card2);border-radius:6px;padding:8px 12px;font-size:11px;line-height:1.7">
        <div style="color:var(--muted);margin-bottom:3px">📊 같은 상황 리그 평균 <span style="font-size:9px">(${cnt} 카운트 · ${pg} · ${peers.length}구)</span></div>
        <span style="color:var(--muted)">헛스윙률</span> <b style="font-family:var(--mono)">${sw?(wh/sw*100).toFixed(0):'-'}%</b> ·
        <span style="color:var(--muted)">피안타율</span> <b style="font-family:var(--mono)">${ab?('.'+(hits/ab*1000).toFixed(0).padStart(3,'0')):'-'}</b> ·
        <span style="color:var(--muted)">평균EV</span> <b style="font-family:var(--mono)">${avgEV?avgEV.toFixed(1):'-'}</b></div>`;
    }
  }catch(e){}
  const html=`<h3 style="color:var(--amber);font-family:var(--cond);margin-bottom:16px;font-size:16px">투구 #${d.id||''} 상세</h3>
  <div class="grid2" style="gap:16px">
  <div>${zoneSVG}<div style="font-size:9px;color:var(--muted);text-align:center;margin-top:4px">⭕ 목표 &nbsp;●&nbsp; 실제 (색=결과)</div>${sprayMini}</div>
  <div style="font-size:12px;line-height:2.1;font-family:var(--mono)">
    <div><span style="color:var(--muted)">투수:</span> ${d.pName||'-'} (${d.pHand||'?'}투)</div>
    <div><span style="color:var(--muted)">타자:</span> ${d.bName||'-'} (${d.bZone||'?'}타)</div>
    <div><span style="color:var(--muted)">이닝:</span> ${d.inn}이닝 ${d.half===0?'말':'초'}</div>
    <div><span style="color:var(--muted)">카운트:</span> ${d.ball}볼 ${d.strk}스트 ${d.out}아웃</div>
    <div><span style="color:var(--muted)">구종:</span> <span style="color:${wbdContext.GROUP_COLORS[wbdContext.pitchGroup(d.pType,d)]}">${wbdContext.PITCH_NAMES[d.pType]||d.pType}</span></div>
    <div><span style="color:var(--muted)">구속:</span> ${d.spdK}km/h (원본:${d.pPow||'-'})</div>
    <div><span style="color:var(--muted)">스핀:</span> H:${(d.sH||0)} V:${(d.sV||0)} G:${(d.gyro||0)}</div>
    <div><span style="color:var(--muted)">코스:</span> ${d.zoneX!=null?(wbdContext._isInZone(d)?'<span style="color:#f5a623">존 안</span>':'<span style="color:var(--muted)">존 밖</span>'):'-'}</div>
    <div><span style="color:var(--muted)">결과:</span> <span style="color:${ocMeta.color||'#888'};font-weight:600">${ocMeta.label||'-'}</span></div>
    <div><span style="color:var(--muted)">스윙:</span> ${wbdContext._isSwing(d)?(+d.ev>0?'<span style="color:#39ff8a">스윙 (컨택)</span>':'<span style="color:#ff4560">스윙 (헛스윙)</span>'):'<span style="color:var(--muted)">노스윙</span>'}</div>
    ${d.batSpd>0?`<div><span style="color:var(--muted)">배트속도:</span> ${d.batSpd}km/h</div>`:''}
    ${d.ev>0?`<div><span style="color:var(--muted)">타구속도:</span> ${d.ev}km/h</div>`:''}
    ${d.ldeg!=null&&d.ev>0?`<div><span style="color:var(--muted)">발사각:</span> ${d.ldeg}°</div>`:''}
    ${d.sdeg!=null&&d.ev>0?`<div><span style="color:var(--muted)">타구방향:</span> ${d.sdeg}° <span style="font-size:10px;color:${wbdContext._SIDE_COLOR[wbdContext._fieldSide(d)]||'var(--muted)'}">${wbdContext._SIDE_DESC[wbdContext._fieldSide(d)]||'-'}</span></div>`:''}
    ${bbq?`<div><span style="color:var(--muted)">타구질:</span> <span style="color:${bbq.color}">${bbq.label}</span></div>`:''}
    ${qualTags}
    ${hposBar}
  </div>
  </div>
  ${xoutBlock}
  ${rvBlock}
  ${leagueBlock}`;
  wbdContext.openModal(html);
};
}

export function initialize(wbdContext) {
// Original index.html:6048
wbdContext._sprayZoneFilter = 'off';

// Original index.html:6700
window._spdCombo=window._spdCombo||{};

// Original index.html:6738
document.addEventListener('click',()=>{document.querySelectorAll('.spd-combo.open').forEach(c=>c.classList.remove('open'));});

// Original index.html:6863
window._tblSort=window._tblSort||{};
}
