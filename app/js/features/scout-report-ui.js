/** scout-report-ui: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:21944
wbdContext.renderScoutingPage = function renderScoutingPage(){
  const out = document.getElementById('scouting-content');
  if(!out) return;
  
  if(!wbdContext.G.length){
    out.innerHTML = '<div style="padding:60px 20px;text-align:center;background:var(--card);border-radius:8px;margin-top:14px"><div style="font-size:64px;margin-bottom:14px">📋</div><div style="font-size:16px;font-weight:700">데이터가 없어요</div><div style="font-size:12px;color:var(--muted);margin-top:6px">경기 데이터를 추가하면 상대 공략 사용 가능</div></div>';
    return;
  }
  
  const state = window._scoutingState;
  const pitcherNames = window._cache.pitcherNames || [];
  const batterNames = window._cache.batterNames || [];
  
  // 첫 진입 시 자동 선택
  if(!state.target){
    if(state.mode === 'pitcher' && pitcherNames.length){
      state.target = pitcherNames[0];
    } else if(state.mode === 'batter' && batterNames.length){
      state.target = batterNames[0];
    }
  }
  
  let html = `<div style="margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:24px">📋</span>
        <span style="font-size:18px;font-weight:800">상대 공략</span>
        <span style="font-size:11px;color:var(--muted)">Opponent Strategy</span>
      </div>
      <span style="margin-left:auto">${wbdContext._rptExportBtns('#scouting-content', '상대공략_'+(state.target||''), {small:true})}</span>
      <div style="display:flex;background:var(--card2);border-radius:6px;overflow:hidden;border:1px solid var(--border)">
        <button onclick="_scoutSwitchMode('pitcher')" style="background:${state.mode==='pitcher'?'#ff8c44':'transparent'};color:${state.mode==='pitcher'?'#000':'var(--text)'};border:none;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer">⚾ 투수 공략</button>
        <button onclick="_scoutSwitchMode('batter')" style="background:${state.mode==='batter'?'#39ff8a':'transparent'};color:${state.mode==='batter'?'#000':'var(--text)'};border:none;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer">🏏 타자 공략</button>
      </div>
    </div>
    
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--muted);letter-spacing:0.5px">분석 대상</span>
      <select id="scout-target-sel" onchange="window._scoutingState.target=this.value;window._scoutingState.split='all';renderScoutingPage()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:5px;font-size:13px;min-width:240px">
        <option value="">${state.mode==='pitcher'?'투수':'타자'} 선택...</option>
        ${(state.mode==='pitcher'?pitcherNames:batterNames).map(n => {
          const c = state.mode==='pitcher' ? wbdContext.calcPitcherCard(n) : wbdContext.calcBatterCard(n);
          if(!c) return '';
          return `<option value="${String(n).replace(/"/g,'&quot;')}"${n===state.target?' selected':''}>${n} (OVR ${c.OVR})</option>`;
        }).join('')}
      </select>
      <span style="font-size:10px;color:var(--muted);font-style:italic">상대 ${state.mode==='pitcher'?'투수':'타자'}를 분석합니다</span>
    </div>
  </div>`;
  
  if(!state.target){
    out.innerHTML = html + '<div style="padding:40px;text-align:center;color:var(--muted)">선수를 선택해주세요</div>';
    return;
  }
  
  // 데이터 수집 + 리포트 생성
  const data = state.mode==='pitcher' ? wbdContext._scoutCollectPitcher(state.target) : wbdContext._scoutCollectBatter(state.target);
  if(!data){
    out.innerHTML = html + '<div style="padding:40px;text-align:center;color:var(--muted)">해당 선수 데이터를 찾을 수 없습니다</div>';
    return;
  }
  
  const report = state.mode==='pitcher' ? wbdContext._scoutGeneratePitcherReport(data) : wbdContext._scoutGenerateBatterReport(data);
  const accentColor = state.mode==='pitcher' ? '#ff8c44' : '#39ff8a';
  const c = data.card;
  const team = wbdContext._playerTeam(data.name, state.mode);
  const photoUrl = wbdContext.getPhotoUrl(data.name);
  const photoHTML = photoUrl
    ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:100%;height:100%;object-fit:cover">`
    : `<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#0f1828"><circle cx="50" cy="38" r="18" fill="#3a4560"/><path d="M 18,100 Q 18,62 50,60 Q 82,62 82,100 Z" fill="#3a4560"/></svg>`;
  
  // ─── 상단 헤더 카드 (선수 정보) ───
  html += `<div style="background:linear-gradient(135deg,var(--card),var(--card2));border-radius:10px;padding:18px;margin-bottom:14px;border-left:4px solid ${accentColor};position:relative;overflow:hidden">
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">
      <div style="width:88px;height:88px;border-radius:50%;overflow:hidden;border:3px solid ${wbdContext.cardOvrColor(c.OVR)};box-shadow:0 0 16px ${wbdContext.cardOvrColor(c.OVR)}66;flex-shrink:0">${photoHTML}</div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase">${state.mode==='pitcher'?'PITCHER':'BATTER'} · ${team || '소속미상'}</div>
        <div style="font-size:24px;font-weight:900;color:var(--text);margin:2px 0">${data.name}</div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px">
          <span style="background:${wbdContext.cardOvrColor(c.OVR)};color:#000;font-family:var(--mono);font-weight:900;font-size:18px;padding:3px 12px;border-radius:14px">OVR ${c.OVR}</span>
          ${(state.mode==='pitcher'?data.pHand:data.bZone) ? `<span style="background:var(--card2);padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;color:${accentColor}">${state.mode==='pitcher'?(data.pHand==='L'?'좌투':data.pHand==='R'?'우투':'?'):(data.bZone==='L'?'좌타':data.bZone==='R'?'우타':'?')}</span>` : ''}
          <span style="font-size:11px;color:var(--muted)">${data.total.toLocaleString()}${state.mode==='pitcher'?'구':'타석'} · ${data.games}경기</span>
          <button onclick="openCardDetail('${String(data.name).replace(/'/g,"\\'")}','${state.mode}')" style="margin-left:auto;background:transparent;border:1px solid var(--border);color:var(--muted);padding:5px 10px;border-radius:4px;font-size:11px;cursor:pointer">🃏 선수 카드 보기</button>
        </div>
      </div>
    </div>
  </div>`;
  
  // ─── 🆚 스플릿 탭 (좌/우 분리 분석) ───
  const splitLabels = state.mode === 'pitcher'
    ? {all:'📊 전체 요약', vsL:'🆚 좌타 상대 공략', vsR:'🆚 우타 상대 공략'}
    : {all:'📊 전체 요약', vsL:'🆚 좌투 상대 공략', vsR:'🆚 우투 상대 공략'};
  
  // 표본 신뢰도
  const vsLn = data.splits.vsL.n || 0;
  const vsRn = data.splits.vsR.n || 0;
  const confidence = (n) => n >= 80 ? '✓ 충분' : n >= 30 ? '△ 참고' : '⚠ 부족';
  const confColor = (n) => n >= 80 ? '#39ff8a' : n >= 30 ? '#ffd700' : '#ff8c44';
  
  html += `<div style="display:flex;background:var(--card2);border-radius:8px;overflow:hidden;margin-bottom:14px;border:1px solid var(--border)">
    <button type="button" onclick="_scoutSwitchSplit('all')" style="flex:1;background:${state.split==='all'?'#88ccff':'transparent'};color:${state.split==='all'?'#000':'var(--text)'};border:none;padding:12px 14px;font-size:13px;font-weight:700;cursor:pointer;border-right:1px solid var(--border)">
      ${splitLabels.all}
      <div style="font-size:9px;color:${state.split==='all'?'#000':'var(--muted)'};opacity:.8;margin-top:2px">방향 판단</div>
    </button>
    <button type="button" onclick="_scoutSwitchSplit('vsL')" style="flex:1;background:${state.split==='vsL'?'#cc44ff':'transparent'};color:${state.split==='vsL'?'#000':'var(--text)'};border:none;padding:12px 14px;font-size:13px;font-weight:700;cursor:pointer;border-right:1px solid var(--border)">
      ${splitLabels.vsL}
      <div style="font-size:9px;margin-top:2px;color:${state.split==='vsL'?'#000':confColor(vsLn)}">${vsLn}구 · ${confidence(vsLn)}</div>
    </button>
    <button type="button" onclick="_scoutSwitchSplit('vsR')" style="flex:1;background:${state.split==='vsR'?'#cc44ff':'transparent'};color:${state.split==='vsR'?'#000':'var(--text)'};border:none;padding:12px 14px;font-size:13px;font-weight:700;cursor:pointer">
      ${splitLabels.vsR}
      <div style="font-size:9px;margin-top:2px;color:${state.split==='vsR'?'#000':confColor(vsRn)}">${vsRn}구 · ${confidence(vsRn)}</div>
    </button>
  </div>`;
  
  // ─── 스플릿 모드: vsL 또는 vsR이면 별도 분석 렌더 ───
  if(state.split === 'vsL' || state.split === 'vsR'){
    try {
      const splitReport = wbdContext._scoutGenerateSplitReport(data, state.mode, state.split);
      html += wbdContext._scoutRenderSplitContent(data, splitReport, state.mode, state.split);
    } catch(e){
      console.error('Split report error:', e);
      html += `<div class="card section" style="padding:30px;text-align:center;color:#ff4560">스플릿 분석 중 오류 발생: ${e.message}<br><span style="color:var(--muted);font-size:11px">전체 탭으로 돌아가기 또는 다른 선수 선택해보세요.</span></div>`;
    }
    out.innerHTML = html;
    // 모바일 최적화 후처리
    if(window.innerWidth <= 768){
      out.querySelectorAll('[data-scout-grid]').forEach(el => {
        el.style.gridTemplateColumns = '1fr';
      });
    }
    return;
  }
  
  // ─── 🎯 공략 엔진 카드 (약점 3단검증 + 강점 + 거르는 공) ───
  try{ html += wbdContext._atkRenderCards(wbdContext._atkEngine(state.target, state.mode), state.mode); }
  catch(e){ console.error('공략엔진 오류:', e); }
  
  // ─── 섹션 렌더 (sections 배열 기반) ───
  // 1, 2번 섹션: 개요/패턴 (단일 컬럼, 정보형)
  for(let i=0; i<2 && i<report.sections.length; i++){
    const sec = report.sections[i];
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid ${sec.color}">
      <div class="card-title" style="display:flex;align-items:center;gap:6px;color:${sec.color};margin-bottom:14px">${sec.title}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${sec.items.map(it => `<div style="background:var(--card2);padding:10px 12px;border-radius:5px;font-size:13px;line-height:1.7;color:var(--text)">${it}</div>`).join('')}
      </div>
    </div>`;
  }
  
  // (구 강점/약점/핵심전략 섹션은 공략 엔진 카드로 대체 — V12 중복 제거)

  // ─── 데이터 백업 (히트맵 + 좌우 split) ───
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
    <div class="card section">
      <div class="card-title">🎯 ${state.mode==='pitcher'?'피안타':'타격'} 히트맵 <span style="font-size:10px;color:var(--muted);font-weight:400">5×5 · ${state.mode==='pitcher'?'피안타율':'타율'}</span></div>
      ${wbdContext._scoutZone5x5(state.target, state.mode, 'avg', {maxW:300})}
      <div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5">
        투수 시점 5×5 (가운데 3×3 = 스트라이크존). 빨간색일수록 ${state.mode==='pitcher'?'피안타율 높음 (조심)':'타율 높음 (강점)'}, 파란색=콜드존.<br>
        숫자 아래는 타수. 상세·다른 지표는 「존·구종」 탭에서.
      </div>
    </div>

    ${(()=>{
      // V11.3: 타구 방향·낙구 분포 (공통 함수 사용 — 다른 화면과 동일 로직/모양)
      const src=(state.mode==='pitcher')?wbdContext.getPitcherDataByName(state.target):wbdContext.getBatterDataByName(state.target);
      const ip=src.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
      if(ip.length<5) return '';
      const side={left:0,center:0,right:0};
      ip.forEach(d=>{const s=wbdContext._fieldSide(d); if(s)side[s]++;});
      const sTot=side.left+side.center+side.right||1;
      const dots=ip.filter(d=>d.lx!=null&&d.lz!=null&&(+d.lx||+d.lz)).map(d=>{
        const isHR=+d.result===4, isH=(+d['1BSafe']===1)||isHR;
        return {lx:+d.lx,lz:+d.lz,
                color:isHR?'#ffd700':(isH?(state.mode==='pitcher'?'#ff4560':'#39ff8a'):'#8090a0'),
                r:2.8,op:0.8};
      });
      const _sz=(window._scoutSprayZone||'off');
      const spray=wbdContext._renderSprayField(dots,{w:380,h:330,pad:10, zoneOverlay:(_sz==='off'?null:_sz)});
      // 5×5 존
      const zc={};
      src.forEach(d=>{ if(d.zoneX==null)return;
        const [c,r]=wbdContext._zoneCell(d.zoneX,d.zoneY); const k=c+','+r;
        if(!zc[k])zc[k]={n:0,ab:0,h:0,tb:0};
        zc[k].n++;
        if(wbdContext._isABPitch(d))zc[k].ab++;
        if(wbdContext._isHit(d)){zc[k].h++; zc[k].tb+=(+d._hitBase||(+d.result===4?4:1));}
      });
      const zcells={};
      Object.entries(zc).forEach(([k,c])=>{
        if(c.ab<1){ zcells[k]={text:'-',sub:c.n+'구',fill:'#0a1828'}; return; }
        const avg=c.h/c.ab;
        zcells[k]={text:avg.toFixed(3).replace(/^0/,''),sub:c.n+'구',fill:wbdContext._hotColdPalette(wbdContext._absHotScore('avg',avg)),lowN:(c.ab<5)};
      });
      const zone=wbdContext._renderZoneHeat(zcells,{size:48});
      const bar=(l,v,t,col)=>{const p=v/t*100;return `<div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span>${l}</span><span style="font-family:var(--mono)">${p.toFixed(0)}%</span></div>
        <div style="height:10px;background:var(--card2);border-radius:5px;overflow:hidden"><div style="height:100%;width:${p}%;background:${col};opacity:0.75"></div></div></div>`;};
      return `<div class="card section">
        <div class="card-title">🗺️ 타구 성향 <span style="font-size:10px;color:var(--muted);font-weight:400">(수비 배치 참고 · 인플레이 ${ip.length})</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px">타구 방향 분포</div>
            ${bar('좌측 (LF·3루)',side.left,sTot,wbdContext._SIDE_COLOR.left)}${bar('중앙 (CF)',side.center,sTot,wbdContext._SIDE_COLOR.center)}${bar('우측 (RF·1루)',side.right,sTot,wbdContext._SIDE_COLOR.right)}
          </div>
          <div style="text-align:center">${zone}
            <div style="font-size:10px;color:var(--muted);margin-top:4px">존별 ${state.mode==='pitcher'?'피안타율':'타율'} (5×5)</div>
          </div>
        </div>
        <div style="display:flex;gap:4px;justify-content:center;margin-top:10px">
          ${['all','infield','outfield'].map(v=>{
            const l={all:'전체',infield:'내야',outfield:'외야'}[v];
            const on=_sz===v;
            return `<button onclick="window._scoutSprayZone=(window._scoutSprayZone==='${v}'?'off':'${v}');renderScoutingPage()" style="padding:3px 9px;font-size:10px;border:1px solid ${on?'var(--amber)':'var(--border)'};background:${on?'rgba(245,166,35,0.15)':'transparent'};color:${on?'var(--amber)':'var(--muted)'};border-radius:4px;cursor:pointer">${l}</button>`;
          }).join('')}
        </div>
        <div style="max-width:380px;width:100%;margin:8px auto 0">${spray}</div>
        <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:4px">
          🟡 홈런 · ${state.mode==='pitcher'?'🔴 피안타':'🟢 안타'} · ⚪ 아웃
        </div>
      </div>`;
    })()}
    
  </div>`;
  
  // ─── 🔬 고밀도 상세 (팀 공략과 공유하는 공용 블록) ───
  try{
    html += `<div style="margin:18px 0 6px;font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.5px;border-bottom:1px solid var(--border);padding-bottom:4px">🔬 심층 상세</div>`;
    html += wbdContext._dbMetrics6(state.target, state.mode);
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" data-scout-grid>
      <div>${wbdContext._dbCourse(state.target, state.mode)}</div>
      <div>${wbdContext._dbGroup(state.target, state.mode)}</div>
    </div>`;
    html += wbdContext._dbCount(state.target, state.mode);
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" data-scout-grid>
      <div>${wbdContext._dbSituational(state.target, state.mode)}</div>
      <div>${wbdContext._dbH2H(state.target, state.mode, null)}</div>
    </div>`;
  }catch(e){ console.error('scouting 심층상세 오류:', e); html+=`<div class="card section" style="color:#ff4560;font-size:12px">심층 상세 생성 중 오류: ${e.message}</div>`; }

  // ─── 푸터 ───
  html += `<div style="background:var(--card2);padding:10px 14px;border-radius:6px;font-size:10px;color:var(--muted);line-height:1.6;text-align:center">
    💡 위 분석은 ${data.total.toLocaleString()}구의 데이터를 기반으로 자동 생성된 것이며, 실제 경기 양상과 다를 수 있습니다. 표본이 작을수록 신뢰도가 낮습니다.
  </div>`;

  out.innerHTML = html;
  if(window.innerWidth<=768){ out.querySelectorAll('[data-scout-grid]').forEach(el=>{el.style.gridTemplateColumns='1fr';}); }
};

// Original index.html:22196
wbdContext._setScoutTab = function _setScoutTab(t){ window._scoutReportState.tab=t; wbdContext.renderScoutReportPage(); };

// Original index.html:22198
wbdContext._pctBar = function _pctBar(label, value, pct, opts){
  opts=opts||{};
  pct=Math.max(0,Math.min(100,pct));
  const col = pct>=80?'#39ff8a' : pct>=60?'#a8e063' : pct>=40?'#f5a623' : pct>=20?'#ff8c44' : '#ff4560';
  const vdisp = opts.vdisp!=null?opts.vdisp:value;
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
    <div style="width:${opts.labelW||110}px;font-size:11.5px;color:var(--text);text-align:right;flex-shrink:0">${label}</div>
    <div style="flex:1;background:var(--card2);border-radius:10px;height:18px;position:relative;overflow:hidden;min-width:80px">
      <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:${col};border-radius:10px;transition:width .3s"></div>
      <div style="position:absolute;left:8px;top:0;height:100%;display:flex;align-items:center;font-family:var(--mono);font-size:10.5px;font-weight:700;color:var(--text);mix-blend-mode:difference">${vdisp}</div>
      <div style="position:absolute;right:6px;top:0;height:100%;display:flex;align-items:center;font-family:var(--mono);font-size:9.5px;color:var(--muted)">${pct.toFixed(0)}%ile</div>
    </div>
  </div>`;
};

// Original index.html:22213
wbdContext._percentileOf = function _percentileOf(arr, v, lowerBetter){
  if(!arr||!arr.length) return 50;
  const n=arr.length;
  let below=0; for(const x of arr){ if(x<v) below++; }
  let p=below/n*100;
  if(lowerBetter) p=100-p;
  return Math.max(0,Math.min(100,p));
};

// Original index.html:22222
wbdContext.renderScoutReportPage = function renderScoutReportPage(){
  const out = document.getElementById('scoutreport-content');
  if(!out) return;
  const state = window._scoutReportState;
  
  // 헤더
  let html = `<div style="background:linear-gradient(135deg,rgba(255,215,0,0.08),var(--card));padding:14px;border-radius:8px;margin-bottom:14px;border-left:3px solid #ffd700">
    <div style="font-size:16px;font-weight:900;color:#ffd700;margin-bottom:6px">📊 선수 평가 리포트</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.6">
      선수의 종합 평가, 잠재력, 강점·약점, 발전 방향을 정리한 스카우팅 양식.
      <b style="color:#ffd700">드래프트·라인업 결정·트레이드 평가</b>에 활용. (※ "상대 공략" 메뉴는 상대팀 공략용)
    </div>
  </div>`;
  
  // 모드 + 선수 선택
  html += `<div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap;align-items:center;gap:8px">
    <div style="display:inline-flex;background:var(--card2);border-radius:6px;overflow:hidden">
      <button onclick="window._scoutReportState.mode='pitcher';window._scoutReportState.target=null;renderScoutReportPage()" style="background:${state.mode==='pitcher'?'#ff8c44':'transparent'};color:${state.mode==='pitcher'?'#000':'var(--text)'};border:none;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer">⚾ 투수 리포트</button>
      <button onclick="window._scoutReportState.mode='batter';window._scoutReportState.target=null;renderScoutReportPage()" style="background:${state.mode==='batter'?'#39ff8a':'transparent'};color:${state.mode==='batter'?'#000':'var(--text)'};border:none;padding:8px 16px;font-size:12px;font-weight:700;cursor:pointer">🏏 타자 리포트</button>
    </div>`;
  
  const names = state.mode === 'pitcher' ? (window._cache.pitcherNames||[]) : (window._cache.batterNames||[]);
  const sortedNames = names.slice().sort();
  html += `<select id="scoutreport-target-sel" onchange="window._scoutReportState.target=this.value;renderScoutReportPage()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:5px;font-size:13px;min-width:240px">
    <option value="">선수 선택...</option>
    ${sortedNames.map(n => `<option value="${n}" ${state.target===n?'selected':''}>${n}</option>`).join('')}
  </select>`;
  
  if(state.target){
    html += wbdContext._rptExportBtns('#scoutreport-content', '선수평가_'+state.target, {print:true});
  }
  html += `</div>`;
  
  if(!state.target){
    html += `<div class="card section" style="padding:30px;text-align:center;color:var(--muted);font-size:13px">
      선수를 선택하면 종합 스카우팅 리포트가 생성됩니다.
    </div>`;
    out.innerHTML = html;
    return;
  }
  
  // 데이터 수집
  const data = state.mode === 'pitcher' ? wbdContext._scoutCollectPitcher(state.target) : wbdContext._scoutCollectBatter(state.target);
  if(!data){
    html += `<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">해당 선수의 데이터가 부족합니다.</div>`;
    out.innerHTML = html;
    return;
  }
  
  // 리포트 생성
  const report = state.mode === 'pitcher' ? wbdContext._generateScoutReportPitcher(data) : wbdContext._generateScoutReportBatter(data);
  
  // ─── 헤더 카드 (선수명 + 최종 등급) — 항상 표시 ───
  html += wbdContext._renderScoutReportHeader(data, report, state.mode);

  // ─── 탭 바 ───
  const tab = state.tab || 'overview';
  const TABS=[['overview','📝 종합'],['metrics','📊 세부 지표'],['zone','🗺️ 존·구종'],['strengths','💪 강약점'],['compare','🔍 비교·추이']];
  html += `<div class="hub-tabs" style="border-bottom:1px solid var(--border)">`+
    TABS.map(([k,l])=>`<button class="hub-tab${k===tab?' active':''}" onclick="_setScoutTab('${k}')">${l}</button>`).join('')+`</div>`;

  // ─── 탭별 콘텐츠 ───
  if(tab==='overview'){
    html += wbdContext._scoutStyleProfile(data, state.mode);
    // V12: 스카우팅 도시에 — 툴 등급(근거·OFP) + 레이더는 도시에 툴 기준
    const _D = state.mode==='batter' ? wbdContext._srBatterDossier(state.target) : wbdContext._srPitcherDossier(state.target);
    if(_D){
      html += `<div class="grid2 section" style="align-items:start">`;
      html += `<div>`+wbdContext._srToolsCard(_D, state.mode)+`</div>`;
      html += `<div>`+wbdContext._scoutRadar({grades:_D.T.filter(t=>t.grade!=null).map(t=>({label:t.label.replace(/\s*\(.*\)$/,''), value:t.grade}))})+`</div>`;
      html += `</div>`;
    } else {
      html += `<div class="grid2 section" style="align-items:start"><div>`+wbdContext._renderScoutReportGrades(data, report, state.mode)+`</div><div>`+wbdContext._scoutRadar(report)+`</div></div>`;
    }
    if(state.mode === 'pitcher') html += wbdContext._renderScoutReportPitchGrades(data, report);
    const extraInsights=wbdContext._scoutAdvancedInsights(data, state.mode);
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #ffd700">
      <div class="card-title" style="display:flex;align-items:center;gap:6px;color:#ffd700;margin-bottom:14px;font-size:14px">📝 종합 평가 (Overall Assessment)</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${report.summary.map(s => `<div style="background:var(--card2);padding:11px 14px;border-radius:5px;font-size:13px;line-height:1.7;color:var(--text)">${s}</div>`).join('')}
        ${extraInsights.map(s => `<div style="background:linear-gradient(90deg,rgba(57,255,138,0.08),var(--card2));padding:11px 14px;border-radius:5px;font-size:13px;line-height:1.7;color:var(--text);border-left:2px solid #39ff8a">${s}</div>`).join('')}
      </div>
    </div>`;
    // 공략 요약 (상대 공략과 동일 엔진)
    try{ const _atkHtml=wbdContext._atkRenderCards(wbdContext._atkEngine(state.target, state.mode), state.mode);
      if(_atkHtml) html += `<div style="margin:6px 0 2px;font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.5px">⚔️ 상대 입장 공략 요약 <span style="font-weight:400">(상대 공략 페이지와 동일)</span></div>`+_atkHtml;
    }catch(e){ console.error('scoutreport 공략엔진:', e); }
    // 도시에 본문: 어프로치·타구·상황별·리스크 (투수: 레퍼토리·커맨드·시퀀싱·스태미너·상황·리스크)
    html += `<div style="margin:14px 0 6px;font-size:11px;color:var(--muted);font-weight:700;letter-spacing:.5px;border-bottom:1px solid var(--border);padding-bottom:4px">📝 상세 평가 (Scouting Dossier)</div>`;
    html += wbdContext._srDossierHTML(state.target, state.mode);
    html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(255,215,0,0.06),var(--card));border-left:4px solid #ffd700">
      <div class="card-title" style="color:#ffd700;font-size:14px;margin-bottom:12px">⭐ 잠재력 & 최종 추천</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px">
        <div style="background:var(--card2);padding:14px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px">현재 등급 (Current)</div>
          <div style="font-size:32px;font-weight:900;color:${report.currentGradeColor}">${report.currentGrade}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">${report.currentGradeLabel}</div>
        </div>
        <div style="background:var(--card2);padding:14px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px">잠재력 (Potential)</div>
          <div style="font-size:32px;font-weight:900;color:${report.potentialGradeColor}">${report.potentialGrade}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px">${report.potentialGradeLabel}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${report.recommendation.map(r => `<div style="background:var(--card2);padding:11px 14px;border-radius:5px;border-left:2px solid #ffd700;font-size:12.5px;line-height:1.65;color:var(--text)">${r}</div>`).join('')}
      </div>
    </div>`;
  }
  else if(tab==='metrics'){
    html += wbdContext._renderScoutPercentiles(data, state.mode);
    html += wbdContext._scoutSplitTables(data, state.mode);
  }
  else if(tab==='zone'){
    html += wbdContext._scoutZoneHeatmap(data, state.mode);
    html += wbdContext._scoutGroupTable(data, state.mode);
  }
  else if(tab==='strengths'){
    html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card section" style="border-left:3px solid #39ff8a">
        <div class="card-title" style="color:#39ff8a;font-size:13px;margin-bottom:12px">💪 강점 (Strengths)</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${report.strengths.map(s => `<div style="background:var(--card2);padding:8px 11px;border-radius:4px;border-left:2px solid #39ff8a;font-size:11.5px;line-height:1.55;color:var(--text)">${s}</div>`).join('')}
        </div>
      </div>
      <div class="card section" style="border-left:3px solid #ff4560">
        <div class="card-title" style="color:#ff4560;font-size:13px;margin-bottom:12px">⚠️ 약점 (Weaknesses)</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${report.weaknesses.map(w => `<div style="background:var(--card2);padding:8px 11px;border-radius:4px;border-left:2px solid #ff4560;font-size:11.5px;line-height:1.55;color:var(--text)">${w}</div>`).join('')}
        </div>
      </div>
      <div class="card section" style="border-left:3px solid #88ccff">
        <div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:12px">📈 발전 방향 (Development)</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${report.development.map(d => `<div style="background:var(--card2);padding:8px 11px;border-radius:4px;border-left:2px solid #88ccff;font-size:11.5px;line-height:1.55;color:var(--text)">${d}</div>`).join('')}
        </div>
      </div>
    </div>`;
  }
  else if(tab==='compare'){
    html += wbdContext._renderScoutRoundTrend(data, state.mode);
    html += wbdContext._scoutH2HHighlights(data, state.mode);
    if(report.similar.length){
      html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #cc44ff">
        <div class="card-title" style="color:#cc44ff;font-size:13px;margin-bottom:12px">🔍 비교 가능 선수 (Similar Profiles)</div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:10px;font-style:italic">유사한 성적·스타일의 선수들 (참고용)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
          ${report.similar.map(s => `<div style="background:var(--card2);padding:10px 12px;border-radius:5px;border-left:2px solid #cc44ff;cursor:pointer" onclick="window._scoutReportState.target='${s.name}';renderScoutReportPage()">
            <div style="font-size:13px;font-weight:700;color:var(--text)">${s.name}</div>
            <div style="font-size:10px;color:var(--muted);margin-top:3px">${s.detail}</div>
            <div style="font-size:11px;color:#cc44ff;margin-top:4px">유사도 ${(s.similarity*100).toFixed(0)}%</div>
          </div>`).join('')}
        </div>
      </div>`;
    }
  }

  // ─── 푸터 ───
  html += `<div style="background:var(--card2);padding:10px 14px;border-radius:6px;font-size:10px;color:var(--muted);line-height:1.6;text-align:center">
    📋 스카우팅 리포트 — ${data.total.toLocaleString()}구·${data.games}경기 데이터 기반 ·
    20-80 스카우팅 스케일 사용 (50=리그 평균, 70+=All-Star급, 80=레전드급)
  </div>`;

  out.innerHTML = html;
};

// Original index.html:22389
wbdContext._renderScoutPercentiles = function _renderScoutPercentiles(data, mode){
  return wbdContext._percentileCardHTML(data.target||data.name, mode);
};

// Original index.html:22393
wbdContext.renderBatterPctlCard = function renderBatterPctlCard(){ const el=document.getElementById('b-pctl-card'); if(!el)return; el.innerHTML= wbdContext.currentBatter?wbdContext._percentileCardHTML(wbdContext.currentBatter,'batter'):''; };

// Original index.html:22394
wbdContext.renderPitcherPctlCard = function renderPitcherPctlCard(){ const el=document.getElementById('p-pctl-card'); if(!el)return; el.innerHTML= wbdContext.currentPitcher?wbdContext._percentileCardHTML(wbdContext.currentPitcher,'pitcher'):''; };

// Original index.html:22396
wbdContext._percentileCardHTML = function _percentileCardHTML(name, mode){
  const rec=wbdContext._computeRecordsData();
  if(mode==='batter'){
    const pool=(rec.batters||[]).filter(b=>b.AB>=20);
    const me=pool.find(b=>b.name===name);
    const xo=(typeof wbdContext.getXOutData==='function')?wbdContext.getXOutData().bat[name]:null;
    const rv=(typeof wbdContext.getRunValueData==='function')?wbdContext.getRunValueData().bat[name]:null;
    // 각 지표 분포
    const col=(k)=>pool.map(b=>b[k]).filter(v=>v!=null&&!isNaN(v));
    const rows=[];
    const push=(lbl,k,lower,fmt)=>{ if(!me||me[k]==null)return; const p=wbdContext._percentileOf(col(k),me[k],lower); rows.push(wbdContext._pctBar(lbl,me[k],p,{vdisp:fmt?fmt(me[k]):me[k]})); };
    const f3=v=>('.'+Math.round(v*1000)).replace('.','.').padStart(4,'0').replace(/^\./,'.'); // simple
    const fmtAvg=v=>(v<1?'.':'')+ (v*1000).toFixed(0).padStart(3,'0');
    push('타율(AVG)','avg',false,fmtAvg);
    push('출루율(OBP)','obp',false,fmtAvg);
    push('장타율(SLG)','slg',false,fmtAvg);
    push('OPS','ops',false,v=>v.toFixed(3));
    push('wRC+','wrcPlus',false,v=>v.toFixed(0));
    push('wOBA','woba',false,fmtAvg);
    push('ISO(순장타)','iso',false,fmtAvg);
    push('평균 EV','avgEV',false,v=>v.toFixed(1));
    push('하드히트%','hhPct',false,v=>v.toFixed(0)+'%');
    push('배럴%','brlPct',false,v=>v.toFixed(0)+'%');
    push('삼진%','kPct',true,v=>v.toFixed(0)+'%');
    // xOut 운, RV
    let extra='';
    if(xo&&xo.bip>=15){ const luck=xo.hits-xo.xHits; extra+=`<div style="margin-top:10px;font-size:12px;color:var(--text)"><b>운(xOut):</b> <span style="font-size:11px;color:var(--muted)">인플레이 타구 기준(BABIP·홈런/삼진 제외, 일반 타율과 다름)</span><br>실제 ${fmtAvg(xo.hits/xo.bip)} vs 기대 ${fmtAvg(xo.xHits/xo.bip)} → <span style="color:${luck>=0?'#39ff8a':'#ff4560'}">${luck>=0?'+':''}${luck.toFixed(1)}안타 ${luck>=1?'(운 따름)':luck<=-1?'(불운)':'(중립)'}</span></div>`; }
    if(rv&&rv.pa>=20){ extra+=`<div style="margin-top:6px;font-size:12px;color:var(--text)"><b>Run Value:</b> ${rv.rv>=0?'+':''}${rv.rv.toFixed(1)} (상황 득점기여, ${rv.pa}타석)</div>`; }
    return `<div class="card section" style="border-left:3px solid #39ff8a"><div class="card-title" style="color:#39ff8a;font-size:13px;margin-bottom:14px">📊 리그 대비 백분위 (상위 %) <span style="font-size:10px;color:var(--muted);font-weight:400">· AB≥20 ${pool.length}명 기준</span></div>${rows.join('')||'<div style="color:var(--muted)">데이터 부족</div>'}${extra}</div>`;
  } else {
    const pool=(rec.pitchers||[]).filter(p=>p.n>=50);
    const me=pool.find(p=>p.name===name);
    const xo=(typeof wbdContext.getXOutData==='function')?wbdContext.getXOutData().pit[name]:null;
    const rv=(typeof wbdContext.getRunValueData==='function')?wbdContext.getRunValueData().pit[name]:null;
    const col=(k)=>pool.map(p=>p[k]).filter(v=>v!=null&&!isNaN(v));
    const rows=[];
    const push=(lbl,k,lower,fmt)=>{ if(!me||me[k]==null)return; const p=wbdContext._percentileOf(col(k),me[k],lower); rows.push(wbdContext._pctBar(lbl,me[k],p,{vdisp:fmt?fmt(me[k]):me[k]})); };
    const fmtAvg=v=>(v<1?'.':'')+(v*1000).toFixed(0).padStart(3,'0');
    push('ERA','era',true,v=>v.toFixed(2));
    push('FIP','fip',true,v=>v.toFixed(2));
    push('WHIP','whip',true,v=>v.toFixed(2));
    push('피안타율','oAvg',true,fmtAvg);
    push('K/9','k9',false,v=>v.toFixed(1));
    push('볼넷%','bbPct',true,v=>v.toFixed(0)+'%');
    push('피평균 EV','avgEV',true,v=>v?v.toFixed(1):'-');
    push('피하드히트%','hhPct',true,v=>v.toFixed(0)+'%');
    let extra='';
    if(xo&&xo.bip>=20){ const luck=xo.hits-xo.xHits; extra+=`<div style="margin-top:10px;font-size:12px;color:var(--text)"><b>운(xOut):</b> <span style="font-size:11px;color:var(--muted)">인플레이 타구 기준(BABIP·홈런/삼진 제외)</span><br>실제 피안타 ${fmtAvg(xo.hits/xo.bip)} vs 기대 ${fmtAvg(xo.xHits/xo.bip)} → <span style="color:${luck<=0?'#39ff8a':'#ff4560'}">${luck<=0?'운 따름(덜 맞음)':'불운(더 맞음)'} ${luck>=0?'+':''}${luck.toFixed(1)}안타</span></div>`; }
    if(rv&&rv.bf>=40){ extra+=`<div style="margin-top:6px;font-size:12px;color:var(--text)"><b>Run Value:</b> ${rv.rv>=0?'+':''}${rv.rv.toFixed(1)} (실점 억제 기여, ${rv.bf}상대타자)</div>`; }
    return `<div class="card section" style="border-left:3px solid #ff8c44"><div class="card-title" style="color:#ff8c44;font-size:13px;margin-bottom:14px">📊 리그 대비 백분위 (상위 %) <span style="font-size:10px;color:var(--muted);font-weight:400">· 투구≥50 ${pool.length}명 기준</span></div>${rows.join('')||'<div style="color:var(--muted)">데이터 부족</div>'}${extra}</div>`;
  }
};

// Original index.html:22453
wbdContext._scoutStyleProfile = function _scoutStyleProfile(data, mode){
  const name=data.target||data.name; const isBat=mode===undefined?true:mode==='batter';
  try{ return wbdContext._srProfileCard(name, isBat?'batter':'pitcher'); }catch(e){ console.error('profile',e); return ''; }
};

// Original index.html:22459
wbdContext._scoutAdvancedInsights = function _scoutAdvancedInsights(data, mode){
  const name=data.target||data.name;
  const isBat=mode==='batter';
  const out=[];
  const f3=v=>(v<1?'.':'')+(v*1000).toFixed(0).padStart(3,'0');
  // RV
  try{ const rv=(isBat?wbdContext.getRunValueData().bat:wbdContext.getRunValueData().pit)[name];
    if(rv){ const n=isBat?rv.pa:rv.bf; const per=n?rv.rv/n*100:0;
      if(isBat && n>=20) out.push(`<b>상황 득점기여(RV):</b> ${rv.rv>=0?'+':''}${rv.rv.toFixed(1)} (${rv.rv>=8?'리그 상위권 — 득점 상황에서 확실히 생산적':rv.rv>=2?'평균 이상 기여':rv.rv<=-3?'득점 기여가 아쉬움 — 상황 타격 보완 필요':'리그 평균 수준'}).`);
      if(!isBat && n>=40) out.push(`<b>실점 억제 기여(RV):</b> ${rv.rv>=0?'+':''}${rv.rv.toFixed(1)} (${rv.rv>=6?'리그 상위권 — 위기 관리 우수':rv.rv>=2?'평균 이상':rv.rv<=-3?'실점 억제가 아쉬움':'리그 평균 수준'}).`);
    } }catch(e){}
  // xOut (운)
  try{ const xo=(isBat?wbdContext.getXOutData().bat:wbdContext.getXOutData().pit)[name];
    if(xo && xo.bip>=15){ const luck=xo.hits-xo.xHits; const ba=xo.hits/xo.bip, xba=xo.xHits/xo.bip;
      if(isBat){
        if(luck<=-3) out.push(`<b>불운 지표(xOut):</b> 인플레이타율 ${f3(ba)}인데 타구질 기대치는 ${f3(xba)} — <span style="color:#39ff8a">${Math.abs(luck).toFixed(0)}안타 손해 봤을 만큼 잘 치고도 안 풀림. 기록보다 실력이 위.</span>`);
        else if(luck>=3) out.push(`<b>행운 지표(xOut):</b> 인플레이타율 ${f3(ba)}가 타구질 기대치 ${f3(xba)}보다 높음 — <span style="color:#ff8c44">+${luck.toFixed(0)}안타만큼 운이 따름. 성적에 거품 가능성.</span>`);
        else out.push(`<b>운 지표(xOut):</b> 실제(${f3(ba)})와 기대(${f3(xba)})가 비슷 — 성적이 타구질 그대로, 지속 가능.`);
      }else{
        if(luck>=3) out.push(`<b>불운 지표(xOut):</b> 피인플레이타율 ${f3(ba)}가 기대 ${f3(xba)}보다 높음 — <span style="color:#39ff8a">잘 던지고도 ${luck.toFixed(0)}안타 더 맞음(수비·운 영향). 실제 구위는 기록보다 좋음.</span>`);
        else if(luck<=-3) out.push(`<b>행운 지표(xOut):</b> 피안타가 기대보다 ${Math.abs(luck).toFixed(0)}개 적음 — 수비·운 덕을 봄. 피안타 반등 주의.`);
        else out.push(`<b>운 지표(xOut):</b> 피안타가 타구질 기대치와 일치 — 안정적.`);
      }
    } }catch(e){}
  // 라운드 추이
  try{ const R=wbdContext.computeRounds();
    if(R.valid){ const all=isBat?wbdContext.getBatterDataByName(name):wbdContext.getPitcherDataByName(name);
      const byR={}; all.forEach(d=>{const rn=R.roundOf[d._gameId]; if(rn)(byR[rn]=byR[rn]||[]).push(d);});
      const rns=Object.keys(byR).map(Number).sort();
      if(rns.length>=2){
        const ba=arr=>{const ab=arr.filter(wbdContext._isABPitch).length;const h=arr.filter(d=>wbdContext._isHit(d)).length;return ab?h/ab:0;};
        const first=ba(byR[rns[0]]), last=ba(byR[rns[rns.length-1]]);
        const diff=last-first;
        if(Math.abs(diff)>=0.04){
          const rose=diff>0;
          // 타자: 타율 상승=좋음 / 투수: 피안타율 상승=나쁨 (방향 반대)
          const good = isBat ? rose : !rose;
          const metric = isBat ? '타율' : '피안타율';
          let verdict;
          if(isBat) verdict = rose ? '후반 상승 — 적응·성장형' : '후반 하락 — 체력·분석당함 의심';
          else      verdict = rose ? '후반 피안타 증가 — 체력 저하·분석당함 의심' : '후반 피안타 감소 — 적응·성장형';
          out.push(`<b>시즌 내 추이:</b> ${metric} ${rns[0]}R ${f3(first)} → ${rns[rns.length-1]}R ${f3(last)} <span style="color:${good?'#39ff8a':'#ff4560'}">(${verdict})</span>.`);
        }
      }
    } }catch(e){}
  // 스플릿 극단 (vs좌우 차이)
  try{ const s=data.splits||{};
    if(s.vsL&&s.vsR&&s.vsL.n>=15&&s.vsR.n>=15){ const dL=s.vsL.ba, dR=s.vsR.ba; const gap=Math.abs(dL-dR);
      if(gap>=0.08){ const strong=dL>dR?'좌':'우'; out.push(`<b>좌우 편차:</b> vs${strong}${isBat?'투':'타'}에 뚜렷이 강함 (좌 ${f3(dL)} / 우 ${f3(dR)}) — ${isBat?'플래툰 활용 또는 반대편 보완 과제':'상대 라인업 좌우 배치가 변수'}.`);
      }
    } }catch(e){}
  return out;
};

// Original index.html:22514
wbdContext._scoutSplitTables = function _scoutSplitTables(data, mode){
  const f3=v=>(v<1?'.':'')+(v*1000).toFixed(0).padStart(3,'0');
  const s=data.splits||{};
  const isBat=mode==='batter';
  // vs 좌/우 + 카운트 상태
  const rows=[
    ['vs 좌'+(isBat?'투':'타'), s.vsL],
    ['vs 우'+(isBat?'투':'타'), s.vsR],
    ['유리 카운트', s.adv],
    ['동일 카운트', s.even],
    ['불리 카운트', s.dis],
  ].filter(r=>r[1]&&r[1].n>0);
  const row=(lbl,st)=>`<tr><td style="font-weight:600">${lbl}</td>
    <td style="font-family:var(--mono)">${st.n||0}</td>
    <td style="font-family:var(--mono)">${st.ab||0}</td>
    <td style="font-family:var(--mono);font-weight:700;color:${st.ba>=0.35?'#39ff8a':st.ba<=0.22?'#ff4560':'var(--text)'}">${f3(st.ba||0)}</td>
    <td style="font-family:var(--mono)">${st.hr||0}</td>
    <td style="font-family:var(--mono)">${(st.whiffPct||0).toFixed(0)}%</td>
    <td style="font-family:var(--mono)">${st.avgEV?st.avgEV.toFixed(1):'-'}</td>
    <td style="font-family:var(--mono)">${(st.hhPct||0).toFixed(0)}%</td></tr>`;
  let html=`<div class="card section" style="border-left:3px solid #88ccff"><div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:12px">🔀 상황별 스플릿 ${isBat?'(타자)':'(투수 피성적)'}</div>
    <div class="tbl-wrap"><table class="data-table" style="font-size:11px;text-align:center"><thead><tr><th>상황</th><th>투구</th><th>타수</th><th>${isBat?'타율':'피안타율'}</th><th>${isBat?'HR':'피HR'}</th><th>헛%</th><th>EV</th><th>HH%</th></tr></thead><tbody>
    ${rows.map(([l,st])=>row(l,st)).join('')}</tbody></table></div></div>`;
  return html;
};

// Original index.html:22540
wbdContext._scoutGroupTable = function _scoutGroupTable(data, mode){
  const f3=v=>(v<1?'.':'')+(v*1000).toFixed(0).padStart(3,'0');
  const gd=data.groupDetails||{};
  const isBat=mode==='batter';
  const entries=Object.entries(gd).filter(([,v])=>(v.n||v.total||0)>=5);
  if(!entries.length) return '';
  // 정렬: 사용량(또는 n) 순
  entries.sort((a,b)=>(b[1].n||b[1].total||0)-(a[1].n||a[1].total||0));
  const rows=entries.map(([g,v])=>{
    const n=v.n||v.total||0; const ba=v.ba!=null?v.ba:(v.baAllow!=null?v.baAllow:0);
    const col=wbdContext.GROUP_COLORS[g]||'#888';
    const baCol = ba>=0.35?(isBat?'#39ff8a':'#ff4560'):ba<=0.22?(isBat?'#ff4560':'#39ff8a'):'var(--text)';
    return `<tr><td style="color:${col};font-weight:600">${g}</td>
      <td style="font-family:var(--mono)">${n}</td>
      <td style="font-family:var(--mono);font-weight:700;color:${baCol}">${f3(ba)}</td>
      <td style="font-family:var(--mono)">${v.hr!=null?v.hr:'-'}</td>
      <td style="font-family:var(--mono)">${v.whiffPct!=null?v.whiffPct.toFixed(0)+'%':(v.whiff!=null?v.whiff.toFixed(0)+'%':'-')}</td>
      <td style="font-family:var(--mono)">${v.avgEV?v.avgEV.toFixed(1):'-'}</td></tr>`;
  }).join('');
  return `<div class="card section" style="border-left:3px solid #cc44ff"><div class="card-title" style="color:#cc44ff;font-size:13px;margin-bottom:12px">🎿 구종그룹별 ${isBat?'대응':'구사·피성적'}</div>
    <div class="tbl-wrap"><table class="data-table" style="font-size:11px;text-align:center"><thead><tr><th>구종</th><th>${isBat?'상대':'구사'}</th><th>${isBat?'타율':'피안타율'}</th><th>HR</th><th>헛%</th><th>EV</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
};

// Original index.html:22564
wbdContext._scoutZoneHeatmap = function _scoutZoneHeatmap(data, mode){
  const name=data.target||data.name;
  const isBat=mode==='batter';
  const col=isBat?'#39ff8a':'#ff8c44';
  const metric=(window._scoutZoneState&&window._scoutZoneState.metric)||'avg';
  // 지표 셀렉터
  const sel=`<select onchange="_scoutZoneSetMetric(this.value)" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:5px 10px;border-radius:5px;font-size:12px">
    ${wbdContext._SCOUT_ZONE_METRICS.map(([v,l])=>`<option value="${v}" ${v===metric?'selected':''}>${l}</option>`).join('')}</select>`;
  const metricNote=metric==='avg'?(isBat?'빨강=고타율(강점)':'빨강=피안타율 높음(조심)')
    :metric==='whiff'?'빨강=헛스윙 많음':metric==='ev'?'빨강=강한 타구':'빨강=높음';
  return `<div class="card section" style="border-left:3px solid ${col}">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div class="card-title" style="color:${col};font-size:13px;margin:0">🗺️ 존별 히트맵 <span style="font-size:10px;color:var(--muted);font-weight:400">투수 시점 5×5</span></div>
      ${sel}
    </div>
    <div id="scout-zone-map">${wbdContext._scoutZone5x5(name, mode, metric, {interactive:false, cellPx:58, maxW:330})}</div>
    <div style="font-size:9px;color:var(--muted);text-align:center;margin-top:8px;line-height:1.5">
      가운데 주황 테두리 3×3 = 스트라이크존 · ${metricNote} ↔ 파랑 · 숫자 아래는 표본수
    </div></div>`;
};

// Original index.html:22584
wbdContext._scoutZoneSetMetric = function _scoutZoneSetMetric(m){
  window._scoutZoneState=window._scoutZoneState||{};
  window._scoutZoneState.metric=m;
  const st=window._scoutReportState;
  const el=document.getElementById('scout-zone-map');
  if(el && st){ el.innerHTML=wbdContext._scoutZone5x5(st.target, st.mode, m, {interactive:false, cellPx:58, maxW:330}); }
};

// Original index.html:22592
wbdContext._scoutRadar = function _scoutRadar(report){
  const g=report.grades||[]; if(g.length<3) return '';
  const N=g.length, cx=120, cy=115, R=85;
  const pts=g.map((x,i)=>{ const ang=-Math.PI/2+i*2*Math.PI/N; const r=R*Math.max(0.1,Math.min(1,(x.value-20)/60)); return [cx+r*Math.cos(ang),cy+r*Math.sin(ang)]; });
  const grid=[0.25,0.5,0.75,1].map(f=>{ const p=g.map((x,i)=>{const ang=-Math.PI/2+i*2*Math.PI/N;return (cx+R*f*Math.cos(ang)).toFixed(1)+','+(cy+R*f*Math.sin(ang)).toFixed(1);}).join(' '); return `<polygon points="${p}" fill="none" stroke="#2a3a4a" stroke-width="0.6"/>`; }).join('');
  const poly=`<polygon points="${pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')}" fill="rgba(57,255,138,0.18)" stroke="#39ff8a" stroke-width="1.6"/>`;
  const labels=g.map((x,i)=>{ const ang=-Math.PI/2+i*2*Math.PI/N; const lx=cx+(R+16)*Math.cos(ang), ly=cy+(R+16)*Math.sin(ang); return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9" fill="var(--muted)" text-anchor="middle" dominant-baseline="middle">${x.label}</text>`; }).join('');
  const dots=pts.map(p=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5" fill="#39ff8a"/>`).join('');
  return `<div class="card section" style="border-left:3px solid #39ff8a"><div class="card-title" style="color:#39ff8a;font-size:13px;margin-bottom:6px">🎯 툴 레이더</div><div style="text-align:center"><svg viewBox="0 0 240 230" style="max-width:280px">${grid}${poly}${dots}${labels}</svg></div></div>`;
};

// Original index.html:22604
wbdContext._scoutH2HHighlights = function _scoutH2HHighlights(data, mode){
  const name=data.target||data.name;
  const isBat=mode==='batter';
  if(typeof wbdContext._h2hSlash!=='function') return '';
  const all=isBat?wbdContext.getBatterDataByName(name):wbdContext.getPitcherDataByName(name);
  const oppKey=isBat?'pName':'bName';
  const groups={};
  all.forEach(d=>{ const raw=d[oppKey]; if(!raw)return; const o=wbdContext._canonPlayer(raw); (groups[o]=groups[o]||[]).push(d); });
  const f3=v=>(v<1?'.':'')+(v*1000).toFixed(0).padStart(3,'0');
  const rows=[];
  Object.entries(groups).forEach(([opp,arr])=>{ const s=wbdContext._h2hSlash(arr); if(s&&s.PA>=4) rows.push({opp,...s}); });
  if(rows.length<2) return '';
  const sorted=rows.slice().sort((a,b)=>b.ba-a.ba);
  const strong=isBat?sorted.slice(0,5):sorted.slice(-5).reverse(); // 타자=고타율, 투수=저피안타
  const weak=isBat?sorted.slice(-5).reverse():sorted.slice(0,5);
  const card=(title,list,col,lbl)=>`<div class="card"><div class="card-title" style="font-size:12px;color:${col}">${title}</div>
    <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>상대</th><th>타석</th><th>${lbl}</th><th>장타</th><th>HR</th></tr></thead><tbody>
    ${list.map(r=>`<tr><td style="font-weight:600">${wbdContext._esc(r.opp)}</td><td style="font-family:var(--mono)">${r.PA}</td><td style="font-family:var(--mono);font-weight:700">${f3(r.ba)}</td><td style="font-family:var(--mono)">${f3(r.slg)}</td><td style="font-family:var(--mono)">${r.hrs}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  const slbl=isBat?'타율':'피안타율';
  return `<div class="grid2 section">
    ${card(isBat?'💪 강한 상대 (고타율)':'💪 잘 막은 상대 (저피안타)', strong, '#39ff8a', slbl)}
    ${card(isBat?'⚠️ 약한 상대 (저타율)':'⚠️ 고전한 상대 (고피안타)', weak, '#ff4560', slbl)}
  </div>`;
};

// Original index.html:22631
wbdContext._renderScoutRoundTrend = function _renderScoutRoundTrend(data, mode){
  const name=data.target||data.name;
  const R=wbdContext.computeRounds();
  if(!R.valid) return `<div class="card section" style="border-left:3px solid #88ccff"><div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:10px">📈 라운드별 추이</div><div style="font-size:12px;color:var(--muted);line-height:1.6">로드된 경기에서 풀리그 라운드 구조를 찾지 못했습니다(단일 대결 또는 라운드 미식별). 여러 라운드가 포함되면 자동으로 라운드별 비교가 표시됩니다.</div></div>`;
  const isBat=mode==='batter';
  const all=isBat?wbdContext.getBatterDataByName(name):wbdContext.getPitcherDataByName(name);
  // 라운드별로 투구 분할
  const byRound={};
  all.forEach(d=>{ const rn=R.roundOf[d._gameId]; if(!rn)return; (byRound[rn]=byRound[rn]||[]).push(d); });
  const rounds=Object.keys(byRound).map(Number).sort((a,b)=>a-b);
  if(rounds.length<2) return `<div class="card section" style="border-left:3px solid #88ccff"><div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:10px">📈 라운드별 추이</div><div style="font-size:12px;color:var(--muted)">이 선수는 한 라운드 데이터만 있어 추이 비교가 어렵습니다.</div></div>`;
  const ni=x=>{const n=+x;return isNaN(n)?0:n;};
  const f3=v=>(v<1?'.':'')+(v*1000).toFixed(0).padStart(3,'0');
  // 라운드별 슬래시 + 고급지표
  function lineOf(arr){
    const paEnd=arr.filter(wbdContext._isPaEnd);
    const BB=arr.filter(d=>ni(d.result)===5).length, HBP=arr.filter(d=>ni(d.result)===6).length;
    const AB=paEnd.filter(d=>ni(d.result)!==5&&ni(d.result)!==6).length;
    const hits=arr.filter(d=>wbdContext._isHit(d)).length;
    const hr=arr.filter(d=>ni(d.result)===4).length;
    const K=paEnd.filter(d=>ni(d.strk)===2&&(ni(d.call)===0||ni(d.call)===4)&&!wbdContext._isHit(d)&&ni(d.result)!==5&&ni(d.result)!==6).length;
    const evs=arr.filter(d=>wbdContext._isInPlay(d)&&+d.ev>0).map(d=>+d.ev);
    const avgEV=evs.length?evs.reduce((a,b)=>a+b,0)/evs.length:0;
    const PA=paEnd.length;
    const ba=AB?hits/AB:0;
    const obp=PA?(hits+BB+HBP)/PA:0;
    const tb=(typeof wbdContext._totalBases==='function')?wbdContext._totalBases(arr):hits;
    const slg=AB?tb/AB:0;
    return {PA,AB,hits,hr,K,BB,ba,obp,slg,ops:obp+slg,avgEV, kPct:PA?K/PA*100:0, bbPct:PA?BB/PA*100:0};
  }
  // 투수: 기존 게임별 정식 집계(_getCachedPitcherStats)를 라운드별로 합산 → 정확한 이닝·ERA·WHIP
  function pitchLineOf(gameIds){
    let outs=0,runs=0,hits=0,bbs=0,hrs=0,ks=0;
    gameIds.forEach(gid=>{ const gs=wbdContext._getCachedPitcherStats(gid); if(gs&&gs[name]){const s=gs[name];outs+=s.outs;runs+=s.runs;hits+=s.hits;bbs+=s.bbs;hrs+=s.hrs;ks+=s.ks;} });
    const ip=outs/3;
    // 피안타율·피평균EV는 투구 기반으로 (게임집계엔 없음)
    const arr=byRound[_curRound]||[];
    return {outs,ip,runs,hits,bbs,hrs,ks,
      era:ip>0?runs/ip*9:null, whip:ip>0?(hits+bbs)/ip:null, k9:ip>0?ks/ip*9:null,
      ipDisp:Math.floor(ip)+'.'+(outs%3)};
  }
  // 각 라운드의 게임ID 목록
  const roundGameIds={};
  rounds.forEach(r=>{ roundGameIds[r]=[...new Set(byRound[r].map(d=>d._gameId))]; });
  let _curRound;
  const cols=rounds.map(r=>{
    _curRound=r;
    const s=lineOf(byRound[r]);
    const ps=isBat?null:pitchLineOf(roundGameIds[r]);
    // 피안타율·피평균EV는 투구 기반 lineOf에서, 이닝/ERA/WHIP/K9은 게임집계에서
    const evs=byRound[r].filter(d=>wbdContext._isInPlay(d)&&+d.ev>0).map(d=>+d.ev);
    const avgEV=evs.length?evs.reduce((a,b)=>a+b,0)/evs.length:0;
    return {r, s: isBat? s : {...s, ...ps, avgEV, ba:(ps.hits!=null && s.AB)? s.hits/s.AB : s.ba}};
  });
  const metricRow=(lbl,get,fmt,better)=>{
    const vals=cols.map(c=>get(c.s));
    const dir = better==='up'?'<span style="font-size:9px;color:var(--muted)" title="높을수록 좋음">▲좋음</span>':better==='down'?'<span style="font-size:9px;color:var(--muted)" title="낮을수록 좋음">▼좋음</span>':'';
    return `<tr><td style="font-weight:600;text-align:left">${lbl} ${dir}</td>`+cols.map((c,i)=>{
      const v=vals[i]; let col='var(--text)';
      if(i>0 && better){ const d=better==='up'?v-vals[i-1]:vals[i-1]-v; col=d>0.0001?'#39ff8a':d<-0.0001?'#ff4560':'var(--muted)'; }
      return `<td style="font-family:var(--mono);color:${col}">${fmt(v)}</td>`;
    }).join('')+`</tr>`;
  };
  let html=`<div class="card section" style="border-left:3px solid #88ccff"><div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:12px">📈 라운드별 추이 <span style="font-size:10px;color:var(--muted);font-weight:400">(풀리그 자동 분할 · 색=이전 라운드 대비)</span></div>
    <div class="tbl-wrap"><table class="data-table" style="text-align:center"><thead><tr><th>지표</th>${cols.map(c=>`<th>${c.r}R</th>`).join('')}</tr></thead><tbody>`;
  html+=metricRow(isBat?'타석':'상대타자',c=>c.PA,v=>v.toFixed(0),null);
  if(isBat){
    html+=metricRow('타율',c=>c.ba,f3,'up');
    html+=metricRow('출루율',c=>c.obp,f3,'up');
    html+=metricRow('장타율',c=>c.slg,f3,'up');
    html+=metricRow('OPS',c=>c.ops,v=>v.toFixed(3),'up');
    html+=metricRow('홈런',c=>c.hr,v=>v.toFixed(0),null);
    html+=metricRow('삼진%',c=>c.kPct,v=>v.toFixed(0)+'%','down');
    html+=metricRow('평균EV',c=>c.avgEV,v=>v?v.toFixed(1):'-','up');
  }else{
    html+=metricRow('이닝',c=>c.ip,v=>v!=null?(Math.floor(v)+'.'+Math.round((v%1)*3)):'-',null);
    html+=metricRow('ERA',c=>c.era,v=>v!=null?v.toFixed(2):'-','down');
    html+=metricRow('WHIP',c=>c.whip,v=>v!=null?v.toFixed(2):'-','down');
    html+=metricRow('피안타율',c=>c.ba,f3,'down');
    html+=metricRow('K/9',c=>c.k9,v=>v!=null?v.toFixed(1):'-','up');
    html+=metricRow('피홈런',c=>c.hrs!=null?c.hrs:c.hr,v=>v.toFixed(0),null);
    html+=metricRow('피평균EV',c=>c.avgEV,v=>v?v.toFixed(1):'-','down');
  }
  html+='</tbody></table></div><div style="font-size:10px;color:var(--muted);margin-top:6px">※ 색=이전 라운드 대비 개선(초록)/악화(빨강) · 투수 이닝·ERA·WHIP는 앱의 정식 집계(_getCachedPitcherStats, 아웃카운트 추적) 기반 · 상단 게임 바의 라운드 필터로 특정 라운드만 전체 분석에 적용 가능.</div></div>';
  return html;
};

// Original index.html:22719
wbdContext._renderScoutReportHeader = function _renderScoutReportHeader(data, report, mode){
  const c = data.card;
  const handLabel = mode === 'pitcher' ? (data.pHand==='L'?'좌투':data.pHand==='R'?'우투':'') : (data.bZone==='L'?'좌타':data.bZone==='R'?'우타':'');
  const teamName = data.team || '';
  const photoUrl = wbdContext.getPhotoUrl(data.name);
  const photoHTML = photoUrl
    ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:100%;height:100%;object-fit:cover">`
    : `<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#0f1828"><circle cx="50" cy="38" r="18" fill="#3a4560"/><path d="M 18,100 Q 18,62 50,60 Q 82,62 82,100 Z" fill="#3a4560"/></svg>`;
  
  return `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(255,215,0,0.05),var(--card));border-left:4px solid #ffd700;padding:18px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:14px">
      <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:200px">
        <div style="width:88px;height:88px;border-radius:50%;overflow:hidden;border:3px solid #ffd700;box-shadow:0 0 16px rgba(255,215,0,0.4);flex-shrink:0">${photoHTML}</div>
        <div style="flex:1">
          <div style="font-size:11px;color:var(--muted);margin-bottom:4px">${mode === 'pitcher' ? 'PITCHER' : 'BATTER'} REPORT</div>
          <div style="font-size:24px;font-weight:900;color:var(--text);margin-bottom:4px">${data.name}</div>
          <div style="font-size:12px;color:var(--muted)">${handLabel} ${teamName ? ' · ' + teamName : ''} · OVR ${c.OVR}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px">표본: ${data.total.toLocaleString()}구 · ${data.games}경기</div>
          ${report.roleBadge ? `<div style="margin-top:10px"><span style="display:inline-block;background:${report.roleBadgeColor};color:#000;padding:6px 14px;border-radius:14px;font-size:13px;font-weight:900;letter-spacing:0.5px">🎯 ${report.roleBadge}</span></div>` : ''}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">OVERALL FUTURE VALUE</div>
        <div style="font-size:36px;font-weight:900;color:${report.fvColor};line-height:1">${report.fv}</div>
        <div style="font-size:11px;color:${report.fvColor};margin-top:2px">${report.fvLabel}</div>
      </div>
    </div>
    ${report.scoutNote ? `<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);padding:12px 16px;border-radius:6px;margin-top:8px">
      <div style="font-size:10px;color:#ffd700;font-weight:700;margin-bottom:5px;letter-spacing:1px">SCOUT'S NOTE</div>
      <div style="font-size:13px;line-height:1.7;color:var(--text);font-style:italic">${report.scoutNote}</div>
    </div>` : ''}
  </div>`;
};

// Original index.html:22754
wbdContext._renderScoutReportGrades = function _renderScoutReportGrades(data, report, mode){
  const grades = report.grades;
  const cellColor = (v) => {
    if(v >= 70) return '#ff4560';
    if(v >= 60) return '#ff8c44';
    if(v >= 55) return '#ffd700';
    if(v >= 45) return '#88ccff';
    if(v >= 35) return '#888';
    return '#666';
  };
  const cellWidth = (v) => Math.max(10, Math.min(100, (v - 20) / 60 * 100));
  
  const gradeRow = (label, value, note) => `<div style="display:grid;grid-template-columns:120px 80px 1fr 1.5fr;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:12px;color:var(--text);font-weight:600">${label}</div>
    <div style="font-size:18px;font-weight:900;color:${cellColor(value)};text-align:center">${value}</div>
    <div style="background:#1a2030;height:8px;border-radius:4px;overflow:hidden">
      <div style="width:${cellWidth(value)}%;height:100%;background:${cellColor(value)};border-radius:4px"></div>
    </div>
    <div style="font-size:11px;color:var(--muted);line-height:1.4">${note}</div>
  </div>`;
  
  let html = `<div class="card section" style="margin-bottom:14px;border-left:3px solid #ff8c44">
    <div class="card-title" style="color:#ff8c44;font-size:14px;margin-bottom:14px">📊 ${mode === 'pitcher' ? '투수 평가 (Pitcher Grades)' : '타자 평가 (Batter Grades)'}</div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:10px;background:var(--card2);padding:6px 10px;border-radius:4px">
      20-80 스카우팅 스케일 — 20: 최하, 50: 평균, 60: 상위, 70: 올스타급, 80: 레전드급
    </div>`;
  
  grades.forEach(g => {
    html += gradeRow(g.label, g.value, g.note);
  });
  
  html += `</div>`;
  return html;
};

// Original index.html:22790
wbdContext._renderScoutReportPitchGrades = function _renderScoutReportPitchGrades(data, report){
  if(!report.pitchGrades || !report.pitchGrades.length) return '';
  const cellColor = (v) => {
    if(v >= 70) return '#ff4560';
    if(v >= 60) return '#ff8c44';
    if(v >= 55) return '#ffd700';
    if(v >= 45) return '#88ccff';
    if(v >= 35) return '#888';
    return '#666';
  };
  
  let html = `<div class="card section" style="margin-bottom:14px;border-left:3px solid #cc44ff">
    <div class="card-title" style="color:#cc44ff;font-size:14px;margin-bottom:12px">🎯 구종별 평가 (Per-Pitch Grades)</div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:14px;background:var(--card2);padding:6px 10px;border-radius:4px">
      각 구종에 20-80 스케일 등급. 구속·무브·결과·헛스윙·제구 종합 평가.
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">`;
  
  report.pitchGrades.forEach(pg => {
    html += `<div style="background:var(--card2);padding:12px 14px;border-radius:6px;border-left:3px solid ${cellColor(pg.grade)}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div>
          <span style="font-size:15px;font-weight:900;color:var(--text)">${pg.pitch}</span>
          <span style="font-size:11px;color:var(--muted);margin-left:8px">사용 ${pg.usagePct.toFixed(0)}%</span>
        </div>
        <div style="text-align:right">
          <span style="font-size:22px;font-weight:900;color:${cellColor(pg.grade)}">${pg.grade}</span>
          <span style="font-size:11px;color:${cellColor(pg.grade)};margin-left:6px;font-weight:700">${pg.label}</span>
        </div>
      </div>
      <div style="font-size:10.5px;color:var(--muted);margin-bottom:7px">${pg.detail}</div>
      ${pg.factors && pg.factors.length ? `<div style="font-size:11px;color:var(--text);line-height:1.55">
        <b style="color:${cellColor(pg.grade)};font-size:10px">평가 근거:</b><br>
        ${pg.factors.map(f => `<span style="display:inline-block;background:#0a121e;padding:2px 7px;border-radius:3px;margin:2px 4px 2px 0;font-size:10.5px">${f}</span>`).join('')}
      </div>` : ''}
    </div>`;
  });
  
  html += `</div></div>`;
  return html;
};
}

export function initialize(wbdContext) {
// Original index.html:22195
window._scoutReportState = window._scoutReportState || {mode:'pitcher', target:null, tab:'overview'};

// Original index.html:22563
wbdContext._SCOUT_ZONE_METRICS = [['avg','타율/피안타율'],['slg','장타율'],['ops','OPS'],['whiff','헛스윙%'],['ev','평균 EV'],['hh','하드히트%'],['brl','배럴%'],['la','평균 발사각']];
}
