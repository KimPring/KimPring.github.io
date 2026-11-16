/** pitcher: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:4726
wbdContext.renderPitcherPage = function renderPitcherPage(){
  const sel=document.getElementById('pitcher-sel');
  if(sel&&sel.selectedIndex>0)wbdContext.currentPitcher=sel.options[sel.selectedIndex].value;
  if(!wbdContext.currentPitcher)return;
  const pd=wbdContext.getPitcherDataFiltered();
  wbdContext.renderPitcherHeader(wbdContext.currentPitcher,pd);
  wbdContext.renderPitcherDonut(pd);
  wbdContext.renderPitcherSpeedHist(pd);
  wbdContext.renderPitcherGroupTable(pd);
  wbdContext.renderSpinMap(pd);
  wbdContext.renderPitcherBBQuality(pd);
  if(wbdContext.activePitcherTab>0) wbdContext.renderPitcherSubTab(wbdContext.activePitcherTab);
};

// Original index.html:4740
wbdContext.renderPitcherHeader = function renderPitcherHeader(pitcherName,pd){
  const FAST_SET=new Set([0,26,27,28,32,33,34,35,36,37,29,30,31]);
  const fbSpds=pd.filter(d=>d.spdK>0&&FAST_SET.has(+d.pType)).map(d=>+d.spdK);
  const brSpds=pd.filter(d=>d.spdK>0&&!FAST_SET.has(+d.pType)).map(d=>+d.spdK);
  const allSpds=pd.filter(d=>d.spdK>0).map(d=>+d.spdK);

  const avg=arr=>arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1):'-';
  const max=arr=>arr.length?Math.max(...arr).toFixed(0):'-';
  const min=arr=>arr.length?Math.min(...arr).toFixed(0):'-';

  const ks=pd.filter(d=>wbdContext._isK(d)).length;
  const bb=pd.filter(d=>d.result===5).length;
  const strK=pd.filter(d=>d.call===0||d.call===4).length;
  const hand=pd[0]?.pHand||'?';
  
  // ERA, WHIP, 실점, 이닝 - 활성 게임별로 누적 (캐싱된 헬퍼)
  const _pSeas=wbdContext._getPitcherSeason(pitcherName);
  const totalIp=_pSeas.ip, totalRuns=_pSeas.runs, totalH=_pSeas.hits, totalBB=_pSeas.bbs, totalOuts=_pSeas.outs;
  const eraVal=totalIp>0?_pSeas.era.toFixed(2):'-';
  const whipVal=totalIp>0?_pSeas.whip.toFixed(2):'-';
  const ipDisp=totalIp>0?_pSeas.ipDisp:'-';

  // 존내 제구 지표 (V7.15 수정): zoneX/Y 둘 다 -1~1 대칭, 공 반지름 감안해서 보더 0.85~1.15
  const zAllH=pd.filter(d=>d.zoneX!=null);
  let midN=0, sltN=0, gdN=0, brdN=0, ballN=0;
  zAllH.forEach(d=>{
    const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
    const rmax=Math.max(zx,zy);
    if(rmax<=1 && rmax<=0.4)midN++;
    else if(rmax>=0.85 && rmax<=1.15)brdN++;
    else if(rmax<=1){
      if(rmax<=0.6)sltN++;
      else gdN++;
    }
    else ballN++;
  });
  const inZoneH=midN+sltN+gdN+brdN;
  let mRateInZH='-', sRateInZH='-', gRateInZH='-', bRateInZH='-', zonePctH='-';
  if(inZoneH>=5){
    mRateInZH=(midN/inZoneH*100).toFixed(1);
    sRateInZH=(sltN/inZoneH*100).toFixed(1);
    gRateInZH=(gdN/inZoneH*100).toFixed(1);
    bRateInZH=(brdN/inZoneH*100).toFixed(1);
    if(zAllH.length>0)zonePctH=(inZoneH/zAllH.length*100).toFixed(0);
  }

  // 초구 스트라이크% 및 이닝당 투구수 (P/IP)
  const firstPitches=pd.filter(d=>d.ball===0&&d.strk===0);
  const fpsCnt=firstPitches.filter(d=>d.call===0||d.call===2||d.call===4).length;
  const fpsPct=firstPitches.length?(fpsCnt/firstPitches.length*100).toFixed(1):'-';
  const paEnd=wbdContext._countPaEnd(pd);
  // 이닝당 투구수: 활성 게임의 IP 사용 (이미 위에서 totalIp 계산됨)
  const ppPA=totalIp>0?(pd.length/totalIp).toFixed(1):'-';

  // 헛스윙률 (스윙했는데 타구 못 만듦)
  const pSwings=pd.filter(d=>d.bSwing);
  const pWhiffs=pSwings.filter(d=>!d.ev||+d.ev===0);
  const whiffPct=pSwings.length?(pWhiffs.length/pSwings.length*100).toFixed(1):'-';

  // 평균 피타속 (피타구 EV)
  const battedPdH=pd.filter(d=>wbdContext._isInPlay(d) && !wbdContext._isBunt(d));
  const avgEvAg=battedPdH.length?(battedPdH.reduce((s,d)=>s+(+d.ev),0)/battedPdH.length).toFixed(1):'-';
  // 피하드히트% (EV>=110)
  const hhAg=battedPdH.filter(d=>wbdContext._isHardHit(d)).length;
  const hhPctAg=battedPdH.length?(hhAg/battedPdH.length*100).toFixed(1):'-';
  const hhpAg=battedPdH.filter(d=>wbdContext._isHHPlus(d)).length;
  const hhpPctAg=battedPdH.length?(hhpAg/battedPdH.length*100).toFixed(1):'-';
  // 피HR% (타구당 홈런 허용)
  const hrAgH=battedPdH.filter(d=>+d.result===4).length;
  const hrPctAgH=battedPdH.length?(hrAgH/battedPdH.length*100).toFixed(1):'-';
  const brlpAg=battedPdH.filter(d=>wbdContext._isBarrelPlus(d)).length;
  const brlpPctAg=battedPdH.length?(brlpAg/battedPdH.length*100).toFixed(1):'-';

  const gameCtx=wbdContext.pitcherGameFilter?(' — '+wbdContext.GAMES.find(g=>g.id===wbdContext.pitcherGameFilter)?.name||''):'(전체 경기 합산)';
  // WAR 표시 (투타 겸업 감지)
  const pWar=wbdContext.calcPitcherWAR(pitcherName);
  const hasBatting=wbdContext.G.some(d=>String(d.bName)===String(pitcherName));
  const bWar=hasBatting?wbdContext.calcBatterWAR(pitcherName):0;
  const totalWar=pWar+bWar;
  const warHTML=hasBatting
    ?`<span class="ph-badge" style="background:linear-gradient(90deg,#ff8c44,#cc44ff);color:#fff;border:none;font-weight:700" title="투타 겸업 총합">⚔️ 투타 ${totalWar.toFixed(2)} WAR</span><span class="ph-badge" style="background:linear-gradient(90deg,#1976d2,#64b5f6);color:#fff;border:none;font-weight:700;font-size:11px" title="투수 부분">⚾ 투수 ${pWar.toFixed(2)} WAR</span><span class="ph-badge" style="background:linear-gradient(90deg,#e91e63,#ff8caa);color:#fff;border:none;font-weight:700;font-size:11px" title="타자 부분">🏏 타자 ${bWar.toFixed(2)} WAR</span>`
    :`<span class="ph-badge" style="background:linear-gradient(90deg,#1976d2,#64b5f6);color:#fff;border:none;font-weight:700" title="투수 WAR (sabermetrics-style, 환경 평균 대비)">⚾ 투수 ${pWar.toFixed(2)} WAR</span>`;
  document.getElementById('pitcher-header').innerHTML=`
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div style="width:56px;height:56px;border-radius:50%;overflow:hidden;border:2px solid var(--amber);box-shadow:0 0 10px rgba(245,217,35,0.3);flex-shrink:0">${(()=>{
        const photoUrl=wbdContext.getPhotoUrl(pitcherName);
        return photoUrl
          ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:100%;height:100%;object-fit:cover">`
          : `<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#0f1828"><circle cx="50" cy="38" r="18" fill="#3a4560"/><path d="M 18,100 Q 18,62 50,60 Q 82,62 82,100 Z" fill="#3a4560"/></svg>`;
      })()}</div>
      <span class="ph-name">${pitcherName}</span>
      <span class="ph-badge">${hand==='R'?'우투':'좌투'}</span>
      ${warHTML}
      <span style="display:inline-flex;align-items:center;gap:2px">
        ${wbdContext.favoriteButton(pitcherName,'pitcher',18)}
        <button onclick="event.stopPropagation();openMemoModal('player_pitcher_${String(pitcherName).replace(/'/g,"").replace(/"/g,'')}','투수 · ${pitcherName.replace(/'/g,"").replace(/"/g,'')}')" title="메모" style="background:transparent;border:none;color:${wbdContext.getMemo('player_pitcher_'+pitcherName)?'var(--amber)':'var(--muted)'};font-size:16px;cursor:pointer;padding:2px 4px">${wbdContext.getMemo('player_pitcher_'+pitcherName)?'📝':'📄'}</button>
        <button onclick="event.stopPropagation();openCardDetail('${String(pitcherName).replace(/'/g,"\\'").replace(/"/g,'\\"')}','pitcher')" title="선수 카드 보기" style="background:transparent;border:1px solid var(--border);color:var(--amber);font-size:12px;cursor:pointer;padding:3px 8px;border-radius:4px;margin-left:4px">🃏 카드</button>
      </span>
      <span style="font-size:11px;color:var(--muted);font-family:var(--mono)">총 ${pd.length}구 · ${paEnd.length}타석</span><span style="font-size:10px;color:var(--muted);font-family:var(--cond)">${gameCtx}</span>
    </div>
    <div class="ph-stats" style="gap:0;flex-wrap:wrap">
      <div style="display:flex;flex-direction:column;gap:6px;margin-right:28px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:.8px;text-transform:uppercase">전체</div>
        <div style="display:flex;gap:18px">
          <div class="ph-stat"><div class="ph-stat-label">평균</div><div class="ph-stat-val" style="font-size:16px">${avg(allSpds)}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">최고</div><div class="ph-stat-val" style="font-size:16px">${max(allSpds)}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">최저</div><div class="ph-stat-val" style="font-size:16px">${min(allSpds)}</div></div>
        </div>
      </div>
      <div style="width:1px;background:var(--border);margin:0 20px 0 0;align-self:stretch"></div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-right:28px">
        <div style="font-size:10px;color:#ff4560;letter-spacing:.8px;text-transform:uppercase">직구/커터 (${fbSpds.length}구)</div>
        <div style="display:flex;gap:18px">
          <div class="ph-stat"><div class="ph-stat-label">평균</div><div class="ph-stat-val" style="font-size:16px;color:#ff7080">${avg(fbSpds)}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">최고</div><div class="ph-stat-val" style="font-size:16px;color:#ff7080">${max(fbSpds)}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">최저</div><div class="ph-stat-val" style="font-size:16px;color:#ff7080">${min(fbSpds)}</div></div>
        </div>
      </div>
      <div style="width:1px;background:var(--border);margin:0 20px 0 0;align-self:stretch"></div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-right:28px">
        <div style="font-size:10px;color:#2196f3;letter-spacing:.8px;text-transform:uppercase">변화구/오프스피드 (${brSpds.length}구)</div>
        <div style="display:flex;gap:18px">
          <div class="ph-stat"><div class="ph-stat-label">평균</div><div class="ph-stat-val" style="font-size:16px;color:#44aaff">${avg(brSpds)}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">최고</div><div class="ph-stat-val" style="font-size:16px;color:#44aaff">${max(brSpds)}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">최저</div><div class="ph-stat-val" style="font-size:16px;color:#44aaff">${min(brSpds)}</div></div>
        </div>
      </div>
      <div style="width:1px;background:var(--border);margin:0 20px 0 0;align-self:stretch"></div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-right:28px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:.8px;text-transform:uppercase">피칭 지표</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          ${(function(){try{const _pr=wbdContext._computeRecordsData().pitchers.find(x=>x.name===pitcherName); if(!_pr)return ''; return `<div class="ph-stat" title="승-패"><div class="ph-stat-label" style="color:#ffd700">승-패</div><div class="ph-stat-val" style="font-size:16px;color:#ffd700;font-weight:700">${_pr.W||0}-${_pr.L||0}</div></div>`+((_pr.SV||0)>0?`<div class="ph-stat" title="세이브"><div class="ph-stat-label" style="color:#60a5fa">SV</div><div class="ph-stat-val" style="font-size:16px;color:#60a5fa">${_pr.SV}</div></div>`:'')+((_pr.HLD||0)>0?`<div class="ph-stat" title="홀드"><div class="ph-stat-label" style="color:#a78bfa">HLD</div><div class="ph-stat-val" style="font-size:16px;color:#a78bfa">${_pr.HLD}</div></div>`:'')+((_pr.QS||0)>0?`<div class="ph-stat" title="퀄리티스타트 (6이닝+ 3실점↓)"><div class="ph-stat-label" style="color:#fbbf24">QS</div><div class="ph-stat-val" style="font-size:16px;color:#fbbf24">${_pr.QS}${(_pr.QSP||0)>0?` (QS+ ${_pr.QSP})`:''}</div></div>`:'');}catch(e){return '';}})()}
          <div class="ph-stat" title="이닝 (3아웃 = 1이닝)"><div class="ph-stat-label" style="color:#39ff8a">IP</div><div class="ph-stat-val" style="font-size:16px;color:#39ff8a">${ipDisp}</div></div>
          <div class="ph-stat" title="평균자책점 = 실점 / 이닝 × 9 (낮을수록 좋음)"><div class="ph-stat-label" style="color:#ff4560">ERA</div><div class="ph-stat-val" style="font-size:16px;color:#ff4560">${eraVal}</div></div>
          ${(()=>{ // V11.5: ERA+ (리그평균 대비, 100=평균 · 높을수록 좋음)
            try{
              const _L=(wbdContext._computeRecordsData()||{}).lg;
              const _lg=(_L&&_L.lgRA9>0)?_L.lgRA9:0;
              const _e=parseFloat(eraVal);
              if(!_lg||!isFinite(_e)||_e<=0) return '';
              const _ep=_lg/_e*100;
              const _c=_ep>=130?'#39ff8a':_ep>=110?'#88cc44':_ep>=90?'var(--text)':_ep>=70?'#ff8800':'#ff4560';
              return `<div class="ph-stat" title="ERA+ = 리그평균 RA9 ${_lg.toFixed(2)} / 본인 ERA × 100 (100=리그평균, 높을수록 좋음)"><div class="ph-stat-label" style="color:#ffaa66">ERA+</div><div class="ph-stat-val" style="font-size:16px;color:${_c};font-weight:700">${_ep.toFixed(0)}</div></div>`;
            }catch(_){ return ''; }
          })()}
          <div class="ph-stat" title="WHIP = (피안타+볼넷) / 이닝 (낮을수록 좋음, 우수 1.20 미만)"><div class="ph-stat-label" style="color:#ff8800">WHIP</div><div class="ph-stat-val" style="font-size:16px;color:#ff8800">${whipVal}</div></div>
          <div class="ph-stat" title="실점"><div class="ph-stat-label" style="color:var(--muted)">실점</div><div class="ph-stat-val" style="font-size:16px">${totalRuns}</div></div>
          ${(()=>{ // V11.5: RA9 (9이닝당 실점 — pWAR 산출 기반)
            const _ip=totalOuts/3;
            if(!(_ip>0)) return '';
            const _r9=totalRuns/_ip*9;
            return `<div class="ph-stat" title="RA9 = 9이닝당 실점 (pWAR 산출 기반 · 낮을수록 좋음)"><div class="ph-stat-label" style="color:#ff9966">RA9</div><div class="ph-stat-val" style="font-size:16px;color:#ff9966">${_r9.toFixed(2)}</div></div>`;
          })()}
          <div class="ph-stat" title="탈삼진 (카운트 2에서 3번째 strike, 루킹+헛스윙 모두)"><div class="ph-stat-label" style="color:#ff8800">K</div><div class="ph-stat-val" style="font-size:16px;color:#ff8800;font-weight:700">${ks}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">K%</div><div class="ph-stat-val" style="font-size:16px">${pd.length>0?(ks/pd.length*100).toFixed(1):0}%</div></div>
          <div class="ph-stat" title="볼넷"><div class="ph-stat-label" style="color:#88cc44">BB</div><div class="ph-stat-val" style="font-size:16px;color:#88cc44">${bb}</div></div>
          <div class="ph-stat"><div class="ph-stat-label">BB%</div><div class="ph-stat-val" style="font-size:16px">${pd.length>0?(bb/pd.length*100).toFixed(1):0}%</div></div>
          <div class="ph-stat"><div class="ph-stat-label">Strike%</div><div class="ph-stat-val" style="font-size:16px">${pd.length>0?(strK/pd.length*100).toFixed(1):0}%</div></div>
          <div class="ph-stat" title="헛스윙률 = 스윙했는데 타구 못 만듦 (리그 평균 32%)"><div class="ph-stat-label" style="color:#aa88ff">헛스윙%</div><div class="ph-stat-val" style="font-size:16px;color:#aa88ff">${whiffPct}${whiffPct==='-'?'':'%'}</div></div>
          <div class="ph-stat" title="평균 피타속 (리그 평균 100.4km/h·인플레이 · 낮을수록 강타 억제)"><div class="ph-stat-label" style="color:#ff6b8a">평균 피EV</div><div class="ph-stat-val" style="font-size:16px;color:#ff6b8a">${avgEvAg}<span style="font-size:10px;color:var(--muted)">${avgEvAg==='-'?'':'km/h'}</span></div></div>
          <div class="ph-stat" title="피HR% = 피홈런 / 인플레이 타구 (타구당 홈런 허용 · 낮을수록 좋음)"><div class="ph-stat-label" style="color:#ff6b8a">피HR%</div><div class="ph-stat-val" style="font-size:16px;color:#ff6b8a">${hrPctAgH}${hrPctAgH==='-'?'':'%'}</div></div>
          <div class="ph-stat" title="피하드히트% (EV≥110 허용률, 리그 평균 39% · 낮을수록 강타 억제)"><div class="ph-stat-label" style="color:#ff9933">피HH%</div><div class="ph-stat-val" style="font-size:16px;color:#ff9933">${hhPctAg}${hhPctAg==='-'?'':'%'}</div></div>
          <div class="ph-stat" title="피HH+% (EV≥125 허용률 · V11.2 WBD 실측: BA .485→.650 점프 지점 · 리그 평균 23.6% · 낮을수록 좋음)"><div class="ph-stat-label" style="color:#ff5533">피HH+%</div><div class="ph-stat-val" style="font-size:16px;color:#ff5533">${hhpPctAg}${hhpPctAg==='-'?'':'%'}</div></div>
          <div class="ph-stat" title="피배럴+% (EV≥125 & LA20~40° 허용률 · 실측 BA .918, 홈런 96% 발생 존 · 리그 평균 10.1% · 낮을수록 좋음)"><div class="ph-stat-label" style="color:#ff2020">피배럴+%</div><div class="ph-stat-val" style="font-size:16px;color:#ff2020">${brlpPctAg}${brlpPctAg==='-'?'':'%'}</div></div>
          <div class="ph-stat" title="초구 스트라이크 비율 (리그 평균 72%)"><div class="ph-stat-label" style="color:#44ccff">초구 S%</div><div class="ph-stat-val" style="font-size:16px;color:#44ccff">${fpsPct}${fpsPct==='-'?'':'%'}</div></div>
          <div class="ph-stat" title="이닝당 투구수 (낮을수록 효율적)"><div class="ph-stat-label" style="color:#ffaa44">P/IP</div><div class="ph-stat-val" style="font-size:16px;color:#ffaa44">${ppPA}</div></div>
        </div>
      </div>
      <div style="width:1px;background:var(--border);margin:0 20px 0 0;align-self:stretch"></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="font-size:10px;color:#cc44ff;letter-spacing:.8px;text-transform:uppercase">존내 제구 (${inZoneH}구 · 존율 ${zonePctH}%)</div>
        <div style="display:flex;gap:12px">
          <div class="ph-stat"><div class="ph-stat-label" style="color:#ff4560">실투</div><div class="ph-stat-val" style="font-size:14px;color:#ff4560">${mRateInZH}${mRateInZH==='-'?'':'%'}</div></div>
          <div class="ph-stat"><div class="ph-stat-label" style="color:#ff8c44">살짝</div><div class="ph-stat-val" style="font-size:14px;color:#ff8c44">${sRateInZH}${sRateInZH==='-'?'':'%'}</div></div>
          <div class="ph-stat"><div class="ph-stat-label" style="color:#f5d923">굿존</div><div class="ph-stat-val" style="font-size:14px;color:#f5d923">${gRateInZH}${gRateInZH==='-'?'':'%'}</div></div>
          <div class="ph-stat"><div class="ph-stat-label" style="color:#39ff8a">보더</div><div class="ph-stat-val" style="font-size:14px;color:#39ff8a">${bRateInZH}${bRateInZH==='-'?'':'%'}</div></div>
        </div>
        <div style="font-size:9px;color:var(--muted);margin-top:-2px">실투/살짝/굿존/보더 (스트존 ±1 · 공반지름 감안 · 볼 제외 존안 기준)</div>
      </div>
    </div>`;
};

// Original index.html:4922
wbdContext.renderPitcherDonut = function renderPitcherDonut(pd){
  const counts={};
  pd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);counts[g]=(counts[g]||0)+1;});
  const data=Object.entries(wbdContext.PITCH_GROUPS).map(([g])=>({label:g,count:counts[g]||0,color:wbdContext.GROUP_COLORS[g]||'#888'})).filter(d=>d.count>0);
  const total=pd.length||1;
  const svg=wbdContext.makeDonut(data,160);
  // 범례: 구종명 + 투구수 + % 가로 배치
  const leg=data.map(d=>`<div class="legend-item" style="min-width:120px"><div class="ldot" style="background:${d.color}"></div><span>${d.label}</span><span style="color:var(--amber);font-family:var(--mono);margin-left:4px">${d.count}</span><span style="color:var(--muted);font-size:10px;margin-left:3px">(${(d.count/total*100).toFixed(0)}%)</span></div>`).join('');
  const el=document.getElementById('p-donut');
  el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">${svg}<div class="legend" style="flex-direction:column;gap:5px">${leg}</div></div>`;
  el.querySelectorAll('.donut-arc').forEach(arc=>{
    arc.addEventListener('mouseenter',e=>wbdContext.showTip(e,`<b>${arc.dataset.label}</b><br>${arc.dataset.cnt}구 (${arc.dataset.pct}%)`));
    arc.addEventListener('mousemove',wbdContext.moveTip);arc.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:4938
wbdContext.renderPitcherSpeedHist = function renderPitcherSpeedHist(pd){
  const spds=pd.filter(d=>d.spdK>0);
  if(!spds.length){document.getElementById('p-speed-hist').innerHTML='<span style="color:var(--muted)">구속 데이터 없음</span>';return;}
  const mn=Math.floor(Math.min(...spds.map(d=>d.spdK))/5)*5;
  const mx=Math.ceil(Math.max(...spds.map(d=>d.spdK))/5)*5;
  const bins=Math.max(1,Math.ceil((mx-mn)/5));
  const hist={};
  spds.forEach(d=>{
    const bi=Math.floor((d.spdK-mn)/5);
    const g=wbdContext.pitchGroup(d.pType,d);
    if(!hist[bi])hist[bi]={};
    hist[bi][g]=(hist[bi][g]||0)+1;
  });
  const maxH=Math.max(...Object.values(hist).map(h=>Object.values(h).reduce((a,b)=>a+b,0)),1);
  const W=460,H=280,padL=34,padB=24,padT=14;
  const bW=(W-padL-10)/bins;

  // 사용된 구종 파악
  const usedGroups=[...new Set(spds.map(d=>wbdContext.pitchGroup(d.pType,d)))];

  let items='';
  // y축 가이드라인
  [0.25,0.5,0.75,1].forEach(t=>{
    const y=(H-padB-padT)*(1-t)+padT;
    items+=wbdContext.sEl('line',{x1:padL,y1:y.toFixed(1),x2:W-10,y2:y.toFixed(1),stroke:'#1a2f4a','stroke-width':'0.5','stroke-dasharray':'3,3'});
    items+=wbdContext.sEl('text',{x:padL-3,y:(y+3).toFixed(1),fill:'#3a5a7a','font-size':'7','text-anchor':'end'},Math.round(maxH*t)+'');
  });

  for(let i=0;i<bins;i++){
    const x=padL+i*bW; const v=mn+i*5;
    const h=hist[i]||{};
    const total=Object.values(h).reduce((a,b)=>a+b,0);
    const barH=(total/maxH)*(H-padB-padT);
    let y=H-padB-barH;
    // 구종별 스택 (사용 빈도 많은 순)
    Object.entries(h).sort((a,b2)=>b2[1]-a[1]).forEach(([g,cnt])=>{
      const gh=(cnt/total)*barH;
      items+=`<rect x="${(x+1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bW-2).toFixed(1)}" height="${gh.toFixed(1)}" fill="${wbdContext.GROUP_COLORS[g]||'#888'}" opacity="0.85" rx="1" class="spd-bar" data-v="${v}" data-g="${g}" data-cnt="${cnt}" data-total="${total}"/>`;
      y+=gh;
    });
    if(total>0)items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:(H-padB-barH-3).toFixed(1),fill:'#bbb','font-size':'7','text-anchor':'middle'},total);
    // x축 라벨: 매 2개 빈마다
    if(i%2===0)items+=wbdContext.sEl('text',{x:(x+bW/2).toFixed(1),y:H-6,fill:'#3a5a7a','font-size':'8','text-anchor':'middle'},v+'');
  }
  // x축 라벨 마지막값
  items+=wbdContext.sEl('text',{x:(padL+bins*bW-bW/2).toFixed(1),y:H-6,fill:'#3a5a7a','font-size':'8','text-anchor':'middle'},mx+'');

  const leg='<div class="legend" style="flex-wrap:wrap;margin-bottom:8px">'+usedGroups.map(g=>`<div class="legend-item"><div class="ldot" style="background:${wbdContext.GROUP_COLORS[g]||'#888'}"></div>${g}</div>`).join('')+'</div>';
  const el=document.getElementById('p-speed-hist');
  el.innerHTML=leg+wbdContext.makeSVG(W,H,items);
  el.querySelectorAll('.spd-bar').forEach(bar=>{
    bar.addEventListener('mouseenter',e=>wbdContext.showTip(e,`<b>${bar.dataset.g}</b>  ${bar.dataset.v}~${+bar.dataset.v+5}km/h<br>${bar.dataset.cnt}구 / 전체 ${bar.dataset.total}구`));
    bar.addEventListener('mousemove',wbdContext.moveTip);
    bar.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:4997
wbdContext.renderPitcherGroupTable = function renderPitcherGroupTable(pd){
  const groups=Object.keys(wbdContext.PITCH_GROUPS);
  const total=pd.length||1;
  const avgF=arr=>arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length):null;
  const avgS=arr=>{const v=avgF(arr);return v!=null?v.toFixed(2):'-';};
  const mx=arr=>arr.length?Math.max(...arr).toFixed(0):'-';
  const mn=arr=>arr.length?Math.min(...arr).toFixed(0):'-';
  const fbGroups=['포심','투심','커터','패스트볼'];

  function grade(val, tiers){
    if(val==null||isNaN(val))return '';
    const abs=Math.abs(val);
    for(const [min,g,col] of tiers){if(abs>=min)return `<span style="color:${col};font-weight:700;font-size:9px;margin-left:2px">${g}</span>`;}
    return '<span style="color:#607080;font-weight:700;font-size:9px;margin-left:2px">C</span>';
  }
  const gradeS =(v)=>grade(v,[[15,'S','#ffd700'],[10,'A','#ff8c44'],[5,'B','#4488ff']]);
  const gradeSpd=(v)=>grade(v,[[137,'S','#ffd700'],[135,'A','#ff8c44'],[133,'B','#4488ff']]);
  const gradeSV =(v)=>grade(v,[[150,'S','#ffd700'],[125,'A','#ff8c44'],[100,'B','#4488ff']]);
  const gradeSH_fb=(v)=>grade(v,[[200,'S','#ffd700'],[150,'A','#ff8c44'],[100,'B','#4488ff']]);
  const gradeSH_br=(v)=>grade(v,[[370,'S','#ffd700'],[350,'A','#ff8c44'],[325,'B','#4488ff']]);

  // 헤더 — 풀 라벨 (V9.9: 가시성 우선)
  const thead=`<thead><tr style="white-space:nowrap">
    <th>구종</th><th title="투구 수">투구수</th><th title="사용 비율">비율%</th>
    <th title="평균 구속 (게임)">평균구속</th><th title="최고 구속">최고구속</th><th title="최저 구속">최저구속</th>
    <th title="원본 평균 구속">원본평균</th><th title="원본 최고 구속">원본최고</th><th title="원본 최저 구속">원본최저</th>
    <th title="스트라이크 비율">Strike%</th><th title="헛스윙률">헛스윙%</th>
    <th title="피안타율">피안타율</th><th title="평균 타구속도">피EV</th><th title="평균 피발사각">피LA</th><th title="피HH+% (EV125+ 허용률)">피HH+%</th><th title="피배럴+% (EV125+&LA20~40 허용률, 홈런 96% 존)">피배럴+%</th>
    <th title="평균 수평 회전">avg sH</th><th title="평균 수직 회전">avg sV</th><th title="평균 자이로">avg Gyro</th>
    <th title="100투구당 PV (실제 결과)">PV/100</th>
    <th title="100투구당 xPV (EV/LA 기반 기대치)">xPV/100</th>
    <th title="100투구당 xPV+ (리그 평균 대비 기대 가치)">xPV+/100</th>
    <th title="100투구당 운 (PV - xPV)">운/100</th>
  </tr></thead>`;

  let html = thead + '<tbody>';
  groups.forEach(g=>{
    const gd=pd.filter(d=>wbdContext.pitchGroup(d.pType,d)===g);
    if(!gd.length)return;
    const spds=gd.filter(d=>d.spdK>0).map(d=>+d.spdK);
    const pows=gd.filter(d=>d.pPow>0).map(d=>+d.pPow);
    const strK=gd.filter(d=>d.call===0||d.call===4).length;
    const swings=gd.filter(d=>d.bSwing).length;
    const hsw=gd.filter(d=>(d.bSwing && +d.call!==2)).length;
    const hits=gd.filter(d => wbdContext._isHit(d)).length;
    const ab = gd.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const ipArr=gd.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
    const evArr=ipArr.map(d=>+d.ev);
    const avgEv=avgF(evArr);
    // V11.2: 피발사각 + 피HH+/피배럴+
    const laArr=ipArr.filter(d=>d.ldeg!=null).map(d=>+d.ldeg);
    const avgLa=avgF(laArr);
    const hhpG=ipArr.filter(d=>wbdContext._isHHPlus(d)).length;
    const brlpG=ipArr.filter(d=>wbdContext._isBarrelPlus(d)).length;
    const hhpRateG=ipArr.length?hhpG/ipArr.length*100:0;
    const brlpRateG=ipArr.length?brlpG/ipArr.length*100:0;
    const sh=gd.filter(d=>d.sH!=null).map(d=>+d.sH);
    const sv=gd.filter(d=>d.sV!=null).map(d=>+d.sV);
    const gy=gd.filter(d=>d.gyro!=null && +d.gyro!==0).map(d=>Math.abs(+d.gyro));
    const isFb=fbGroups.includes(g);
    const avgSpd=avgF(spds), avgSH=avgF(sh), avgSV=avgF(sv), avgGY=avgF(gy);
    const evCol=avgEv==null?'var(--muted)':(avgEv<=95?'#39ff8a':avgEv<=100?'#88cc44':avgEv<=105?'#ff8800':'#ff4560');

    const pv = wbdContext._pvSum(gd);
    const xpv = wbdContext._xPvSum(gd);
    const xpvPlus = wbdContext._xPvPlusSum(gd);
    const pvDiff = pv - xpv;
    const pv100 = gd.length>0 ? pv/gd.length*100 : 0;
    const xpv100 = gd.length>0 ? xpv/gd.length*100 : 0;
    const xpvPlus100 = gd.length>0 ? xpvPlus/gd.length*100 : 0;
    const pvDiff100 = gd.length>0 ? pvDiff/gd.length*100 : 0;
    const pvCol = pv > 5 ? '#39ff8a' : pv < -5 ? '#ff4560' : 'var(--text)';
    const pvW = Math.abs(pv) > 5 ? '700' : '400';
    const xpvCol = xpv > 5 ? '#39ff8a' : xpv < -5 ? '#ff4560' : 'var(--text)';
    const xpvPlusCol = xpvPlus > 3 ? '#39ff8a' : xpvPlus < -3 ? '#ff4560' : 'var(--text)';
    const diffCol = pvDiff > 5 ? '#ffd700' : pvDiff < -5 ? '#88ccff' : 'var(--muted)';
    const pv100Col = pv100 > 1.5 ? '#39ff8a' : pv100 < -1.5 ? '#ff4560' : 'var(--text)';
    const xpv100Col = xpv100 > 1.5 ? '#39ff8a' : xpv100 < -1.5 ? '#ff4560' : 'var(--text)';
    const xpvPlus100Col = xpvPlus100 > 1 ? '#39ff8a' : xpvPlus100 < -1 ? '#ff4560' : 'var(--text)';
    const diff100Col = pvDiff100 > 1 ? '#ffd700' : pvDiff100 < -1 ? '#88ccff' : 'var(--muted)';

    html+=`<tr class="group-row" data-group="${g}" onclick="showPitcherPitchGroupAnalysis('${wbdContext.currentPitcher.replace(/'/g,"\\'")}','${g}')" style="cursor:pointer" title="클릭 → 리그 비교 분석">
      <td style="color:${wbdContext.GROUP_COLORS[g]};font-weight:600">${g} <span style="color:var(--muted);font-size:9px">🔍</span></td>
      <td>${gd.length}</td>
      <td>${(gd.length/total*100).toFixed(1)}%</td>
      <td style="color:var(--amber)">${avgSpd!=null?avgSpd.toFixed(1):'-'}${isFb?gradeSpd(avgSpd):''}</td>
      <td>${mx(spds)}</td>
      <td>${mn(spds)}</td>
      <td style="color:var(--muted)">${avgS(pows)}</td>
      <td style="color:var(--muted)">${mx(pows)}</td>
      <td style="color:var(--muted)">${mn(pows)}</td>
      <td>${(strK/gd.length*100).toFixed(0)}%</td>
      <td>${swings>0?(hsw/swings*100).toFixed(0):0}%</td>
      <td>${ab>0?(hits/ab).toFixed(3):'---'}</td>
      <td style="color:${evCol}">${avgEv!=null?avgEv.toFixed(1):'-'}</td>
      <td style="color:var(--muted)">${avgLa!=null?avgLa.toFixed(1)+'°':'-'}</td>
      <td style="color:#ff5533">${ipArr.length?hhpRateG.toFixed(0)+'%':'-'}</td>
      <td style="color:#ff2020">${ipArr.length?brlpRateG.toFixed(0)+'%':'-'}</td>
      <td style="color:#88ccff">${avgSH!=null?avgSH.toFixed(2):'-'}${isFb?gradeSH_fb(avgSH):gradeSH_br(avgSH)}</td>
      <td style="color:#88ffcc">${avgSV!=null?avgSV.toFixed(2):'-'}${isFb?gradeSV(avgSV):gradeSH_br(avgSV)}</td>
      <td style="color:#ffcc88">${avgGY!=null?avgGY.toFixed(2):'-'}${gradeS(avgGY)}</td>
      <td style="color:${pv100Col};font-family:var(--mono);font-weight:${Math.abs(pv100)>1.5?'700':'400'}">${pv100>0?'+':''}${pv100.toFixed(2)}</td>
      <td style="color:${xpv100Col};font-family:var(--mono)">${xpv100>0?'+':''}${xpv100.toFixed(2)}</td>
      <td style="color:${xpvPlus100Col};font-family:var(--mono);font-weight:${Math.abs(xpvPlus100)>1?'700':'400'}">${xpvPlus100>0?'+':''}${xpvPlus100.toFixed(2)}</td>
      <td style="color:${diff100Col};font-family:var(--mono)" title="100투구당 운 차이">${pvDiff100>0?'+':''}${pvDiff100.toFixed(2)}</td>
    </tr>`;
  });
  html += '</tbody>';
  document.getElementById('p-group-table').innerHTML = html;
};

// Original index.html:5111
wbdContext.renderSpinMap = function renderSpinMap(pd){
  const valid=pd.filter(d=>d.sH!=null&&d.sV!=null);
  if(!valid.length){document.getElementById('p-spin-map').innerHTML='<span style="color:var(--muted)">스핀 데이터 없음</span>';return;}
  const W=340,H=260,px=40,py=15;
  const allH=valid.map(d=>d.sH),allV=valid.map(d=>d.sV);
  const maxH2=Math.max(1,...allH.map(Math.abs))*1.15,maxV=Math.max(1,...allV.map(Math.abs))*1.15;
  const scX=v=>px+(v+maxH2)/(2*maxH2)*(W-px*2);  // 왼쪽=−, 오른쪽=+
  const scY=v=>py+(v+maxV)/(2*maxV)*(H-py*2);     // sV- = 위, sV+ = 아래
  const cx0=scX(0),cy0=scY(0);
  let items='';
  items+=wbdContext.sEl('line',{x1:px,y1:cy0.toFixed(1),x2:W-px,y2:cy0.toFixed(1),stroke:'#1a2f4a','stroke-width':'1'});
  items+=wbdContext.sEl('line',{x1:cx0.toFixed(1),y1:py,x2:cx0.toFixed(1),y2:H-py,stroke:'#1a2f4a','stroke-width':'1'});
  items+=wbdContext.sEl('text',{x:px-2,y:cy0+4,fill:'#ff8080','font-size':'7','text-anchor':'end'},'(−)');
  items+=wbdContext.sEl('text',{x:W-px+2,y:cy0+4,fill:'#8080ff','font-size':'7'},'(+)');
  items+=wbdContext.sEl('text',{x:cx0+2,y:py+8,fill:'#39ff8a','font-size':'7'},'↑ 라이징(−)');
  items+=wbdContext.sEl('text',{x:cx0+2,y:H-py-2,fill:'#ff4560','font-size':'7'},'↓ 드롭(+)');
  valid.forEach((d,i)=>{
    const x=scX(d.sH),y=scY(d.sV);
    const r=4;  // 자이로 크기 가변 제거 (V9.3) - 통일된 크기
    const g=wbdContext.pitchGroup(d.pType,d);
    items+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${wbdContext.GROUP_COLORS[g]||'#888'}" opacity="0.7" class="spin-dot" data-i="${i}"/>`;
  });
  const leg=Object.keys(wbdContext.GROUP_COLORS).filter(g=>pd.some(d=>wbdContext.pitchGroup(d.pType,d)===g)).map(g=>`<div class="legend-item"><div class="ldot" style="background:${wbdContext.GROUP_COLORS[g]}"></div>${g}</div>`).join('');
  const el=document.getElementById('p-spin-map');
  el.innerHTML=`<div class="legend">${leg}</div>${wbdContext.makeSVG(W,H,items)}`;
  el.querySelectorAll('.spin-dot').forEach(dot=>{
    dot.addEventListener('mouseenter',e=>{const d=valid[+dot.dataset.i];wbdContext.showTip(e,`${wbdContext.PITCH_NAMES[d.pType]||d.pType}<br>구속:${d.spdK} sH:${(d.sH||0).toFixed(2)} sV:${(d.sV||0).toFixed(2)}<br>gyro:${(d.gyro||0).toFixed(2)}`);});
    dot.addEventListener('mousemove',wbdContext.moveTip);dot.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:5143
wbdContext.getPitcherZoneData = function getPitcherZoneData(){
  let data=wbdContext.getPitcherDataFiltered();
  // 다중 구종 토글 (그룹 단위)
  const sel=window.pzPitchSel||{};
  const allGroups=[...new Set(data.map(d=>wbdContext.pitchGroup(d.pType,d)))];
  const activeGroups=allGroups.filter(g=>sel[g]!==false);
  if(activeGroups.length<allGroups.length){
    data=data.filter(d=>activeGroups.includes(wbdContext.pitchGroup(d.pType,d)));
  }
  const gSel=document.getElementById('pz-group-sel').value;
  const cSel=document.getElementById('pz-call-sel').value;
  const bSel=document.getElementById('pz-bzone-sel').value;
  if(gSel)data=data.filter(d=>wbdContext.pitchGroup(d.pType,d)===gSel);
  if(cSel!==''){
    if(cSel==='contact') data=data.filter(d=>['hr','hit','out','foul'].includes(wbdContext._pitchOutcome(d)));
    else data=data.filter(d=>wbdContext._pitchOutcome(d)===cSel);
  }
  if(bSel)data=data.filter(d=>d.bZone===bSel);
  return data;
};

// Original index.html:5167
wbdContext._pzRenderPitchToggles = function _pzRenderPitchToggles(){
  const el=document.getElementById('pz-pitch-multi');
  if(!el)return;
  const allPD=wbdContext.getPitcherDataByName(wbdContext.currentPitcher);
  // 각 그룹별 데이터 수집 (pitchGroup 함수로 동적 분류)
  const groupData={};
  allPD.forEach(d=>{
    const g=wbdContext.pitchGroup(d.pType,d);
    if(!groupData[g]) groupData[g]={count:0, samples:[]};
    groupData[g].count++;
    if(groupData[g].samples.length<1) groupData[g].samples.push(d);
  });
  const usedGroups=Object.keys(groupData).sort((a,b)=>groupData[b].count-groupData[a].count);
  const sel=window.pzPitchSel;
  // 기본값: 전부 선택
  usedGroups.forEach(g=>{ if(sel[g]===undefined)sel[g]=true; });
  
  el.innerHTML=usedGroups.map(g=>{
    const col=wbdContext.GROUP_COLORS[g]||'#888';
    const on=sel[g];
    const cnt=groupData[g].count;
    return `<button onclick="pzPitchToggleGroup('${g}')" title="${g} (${cnt}구)" style="font-size:11px;padding:4px 10px;border-radius:3px;border:1px solid ${on?col:'var(--border)'};background:${on?col+'33':'transparent'};color:${on?col:'var(--muted)'};cursor:pointer;font-family:var(--cond);font-weight:600">${on?'✓ ':''}${g} <span style="opacity:0.6">(${cnt})</span></button>`;
  }).join('') || '<span style="color:var(--muted);font-size:11px">데이터 없음</span>';
};

// Original index.html:5191
wbdContext.pzPitchToggleGroup = function pzPitchToggleGroup(g){
  if(window.pzPitchSel[g]===undefined)window.pzPitchSel[g]=true;
  window.pzPitchSel[g]=!window.pzPitchSel[g];
  wbdContext._pzRenderPitchToggles();
  wbdContext.renderPitcherZone();
};

// Original index.html:5197
wbdContext.pzPitchAll = function pzPitchAll(){
  const allPD=wbdContext.getPitcherDataByName(wbdContext.currentPitcher);
  const usedGroups=[...new Set(allPD.map(d=>wbdContext.pitchGroup(d.pType,d)))];
  usedGroups.forEach(g=>window.pzPitchSel[g]=true);
  wbdContext._pzRenderPitchToggles();
  wbdContext.renderPitcherZone();
};

// Original index.html:5204
wbdContext.pzPitchNone = function pzPitchNone(){
  const allPD=wbdContext.getPitcherDataByName(wbdContext.currentPitcher);
  const usedGroups=[...new Set(allPD.map(d=>wbdContext.pitchGroup(d.pType,d)))];
  usedGroups.forEach(g=>window.pzPitchSel[g]=false);
  wbdContext._pzRenderPitchToggles();
  wbdContext.renderPitcherZone();
};

// Original index.html:5212
wbdContext.renderPitcherZone = function renderPitcherZone(){
  // 선수 바뀌면 토글 리셋
  if(window._pzLastPitcher!==wbdContext.currentPitcher){
    window.pzPitchSel={};
    window._pzLastPitcher=wbdContext.currentPitcher;
  }
  wbdContext._pzRenderPitchToggles();
  
  const data=wbdContext.getPitcherZoneData();
  const allData=wbdContext.getPitcherDataByName(wbdContext.currentPitcher);

  /* ── 좌표 설계 ──────────────────────────────────────────
     zoneX/Y: -1~1 이 스트라이크존 경계
     0이 중심, ±1이 존 엣지
     실제 공은 -3~3 범위까지 나올 수 있음
     SVG 중심: (cx=160, cy=195)
     존 가로 반폭: 55px → 존 전체 110px
     존 세로 반높: 70px → 존 전체 140px
     스케일: 55px per unit (zoneX=1 → cx+55)
  ─────────────────────────────────────────────────────── */
  const W=220, H=260;
  const CX=110, CY=126;
  const HW=40, HH=50; // half-width, half-height of strike zone in px

  // zoneX/Y → SVG px
  const toSX=x=>CX+(+x)*HW;
  const toSY=y=>CY-(+y)*HH;

  let items='';

  // ── 배경 ──
  items+=wbdContext.sEl('rect',{x:0,y:0,width:W,height:H,fill:'#060e1a',rx:'4'});

  // ── 포수 박스 (홈플레이트 아래 큰 영역 암시) ──
  items+=wbdContext.sEl('rect',{x:CX-HW*2.5,y:CY+HH*0.9,width:HW*5,height:18,fill:'none',stroke:'#1a3050','stroke-width':'1',rx:'2'});

  // ── 스트라이크존 바깥 확장 표시 영역 (점선) ──
  // 존 1.5배 영역
  items+=wbdContext.sEl('rect',{
    x:(CX-HW*1.5).toFixed(1),y:(CY-HH*1.5).toFixed(1),
    width:(HW*3).toFixed(1),height:(HH*3).toFixed(1),
    fill:'none',stroke:'#1a2a3a','stroke-width':'0.8','stroke-dasharray':'3,4'
  });

  // ── 스트라이크존 실선 ──
  items+=wbdContext.sEl('rect',{
    x:(CX-HW).toFixed(1),y:(CY-HH).toFixed(1),
    width:(HW*2).toFixed(1),height:(HH*2).toFixed(1),
    fill:'rgba(30,60,100,0.25)',stroke:'#4080c0','stroke-width':'2',rx:'2'
  });

  // ── 존 내 3×3 격자 ──
  for(let i=1;i<3;i++){
    const gx=(CX-HW+i*(HW*2/3)).toFixed(1);
    const gy=(CY-HH+i*(HH*2/3)).toFixed(1);
    items+=wbdContext.sEl('line',{x1:gx,y1:(CY-HH).toFixed(1),x2:gx,y2:(CY+HH).toFixed(1),stroke:'#2a4060','stroke-width':'0.6'});
    items+=wbdContext.sEl('line',{x1:(CX-HW).toFixed(1),y1:gy,x2:(CX+HW).toFixed(1),y2:gy,stroke:'#2a4060','stroke-width':'0.6'});
  }

  // ── 홈플레이트 ──
  const hp=CY+HH+8;
  const hpw=HW*0.7;
  items+=`<polygon points="${CX},${hp+14} ${CX+hpw},${hp+5} ${CX+hpw},${hp} ${CX-hpw},${hp} ${CX-hpw},${hp+5}" fill="#2a4060" stroke="#4080c0" stroke-width="1"/>`;

  // ── 중심선 ──
  items+=wbdContext.sEl('line',{x1:CX,y1:(CY-HH-20).toFixed(1),x2:CX,y2:(CY+HH).toFixed(1),stroke:'#1a3050','stroke-width':'0.5','stroke-dasharray':'4,4'});

  // ── 축 라벨 ──
  items+=wbdContext.sEl('text',{x:(CX-HW).toFixed(1),y:(CY-HH-5).toFixed(1),fill:'#3a5a7a','font-size':'9'},`-1`);
  items+=wbdContext.sEl('text',{x:(CX+HW-6).toFixed(1),y:(CY-HH-5).toFixed(1),fill:'#3a5a7a','font-size':'9'},`+1`);
  items+=wbdContext.sEl('text',{x:(CX-HW-20).toFixed(1),y:(CY-HH+6).toFixed(1),fill:'#3a5a7a','font-size':'9'},`+1`);
  items+=wbdContext.sEl('text',{x:(CX-HW-20).toFixed(1),y:(CY+HH+2).toFixed(1),fill:'#3a5a7a','font-size':'9'},`-1`);
  items+=wbdContext.sEl('text',{x:CX,y:(CY-HH-12).toFixed(1),fill:'#3a5a7a','font-size':'8','text-anchor':'middle'},'스트라이크존');

  // ── 투구 점 (구종 그룹별 색상 + 판정별 모양) ──
  // 색상: 구종 그룹(GROUP_COLORS)
  // 모양: Strike=원, Ball=다이아몬드, Hit=삼각형, HBP=X, Swing=사각형
  // V11.3: 판정코드 대신 실제 결과(_pitchOutcome)로 모양 결정
  const shapeFor=(d)=>{
    const oc=wbdContext._pitchOutcome(d);
    return (wbdContext._OUTCOME_META[oc]||{}).shape||'circle';
  };
  const drawShape=(shape, sx, sy, fill, gi)=>{
    const r=3.5;
    if(shape==='circle'){
      return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${r}" fill="${fill}" opacity="0.78" stroke="#000" stroke-width="0.4" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='diamond'){
      const p=`${sx.toFixed(1)},${(sy-r).toFixed(1)} ${(sx+r).toFixed(1)},${sy.toFixed(1)} ${sx.toFixed(1)},${(sy+r).toFixed(1)} ${(sx-r).toFixed(1)},${sy.toFixed(1)}`;
      return `<polygon points="${p}" fill="${fill}" opacity="0.78" stroke="#000" stroke-width="0.4" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='triangle'){
      const p=`${sx.toFixed(1)},${(sy-r).toFixed(1)} ${(sx+r).toFixed(1)},${(sy+r*0.8).toFixed(1)} ${(sx-r).toFixed(1)},${(sy+r*0.8).toFixed(1)}`;
      return `<polygon points="${p}" fill="${fill}" opacity="0.85" stroke="#000" stroke-width="0.5" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='square'){
      return `<rect x="${(sx-r).toFixed(1)}" y="${(sy-r).toFixed(1)}" width="${(r*2).toFixed(1)}" height="${(r*2).toFixed(1)}" fill="${fill}" opacity="0.78" stroke="#000" stroke-width="0.4" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='star'){
      // 홈런 = 별
      let pts='';
      for(let k=0;k<10;k++){
        const ang=(Math.PI/5)*k - Math.PI/2;
        const rr=(k%2===0)?r*1.35:r*0.6;
        pts+=`${(sx+Math.cos(ang)*rr).toFixed(1)},${(sy+Math.sin(ang)*rr).toFixed(1)} `;
      }
      return `<polygon points="${pts.trim()}" fill="${fill}" opacity="0.95" stroke="#000" stroke-width="0.5" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='cross'){
      // X 모양 (group 두 줄)
      return `<g class="zone-dot" data-gi="${gi}" stroke="${fill}" stroke-width="1.6" opacity="0.9">
        <line x1="${(sx-r).toFixed(1)}" y1="${(sy-r).toFixed(1)}" x2="${(sx+r).toFixed(1)}" y2="${(sy+r).toFixed(1)}"/>
        <line x1="${(sx-r).toFixed(1)}" y1="${(sy+r).toFixed(1)}" x2="${(sx+r).toFixed(1)}" y2="${(sy-r).toFixed(1)}"/>
      </g>`;
    }
    if(shape==='dtriangle'){
      // 역삼각형 (아웃)
      const p=`${sx.toFixed(1)},${(sy+r).toFixed(1)} ${(sx+r).toFixed(1)},${(sy-r*0.8).toFixed(1)} ${(sx-r).toFixed(1)},${(sy-r*0.8).toFixed(1)}`;
      return `<polygon points="${p}" fill="${fill}" opacity="0.8" stroke="#000" stroke-width="0.4" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='hbar'){
      // 가로 막대 (볼)
      return `<rect x="${(sx-r).toFixed(1)}" y="${(sy-r*0.45).toFixed(1)}" width="${(r*2).toFixed(1)}" height="${(r*0.9).toFixed(1)}" rx="1" fill="${fill}" opacity="0.75" stroke="#000" stroke-width="0.3" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='ring'){
      // 빈 원 (루킹S)
      return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${r}" fill="none" stroke="${fill}" stroke-width="1.4" opacity="0.9" class="zone-dot" data-gi="${gi}"/>`;
    }
    if(shape==='plus'){
      // + 모양 (사구)
      return `<g class="zone-dot" data-gi="${gi}" stroke="${fill}" stroke-width="1.6" opacity="0.9">
        <line x1="${(sx-r).toFixed(1)}" y1="${sy.toFixed(1)}" x2="${(sx+r).toFixed(1)}" y2="${sy.toFixed(1)}"/>
        <line x1="${sx.toFixed(1)}" y1="${(sy-r).toFixed(1)}" x2="${sx.toFixed(1)}" y2="${(sy+r).toFixed(1)}"/>
      </g>`;
    }
    return '';
  };
  const usedGroups=new Set();
  const usedOutcomes=new Set();
  // V11.3: 결과 필터 (전역 상태)
  const _colorMode=(document.getElementById('pz-color-sel')||{}).value||'group';
  data.forEach((d,i)=>{
    if(d.zoneX==null||d.zoneY==null)return;
    const oc=wbdContext._pitchOutcome(d);
    const sx=toSX(d.zoneX), sy=toSY(d.zoneY);
    if(sx<-10||sx>W+10||sy<-10||sy>H+10)return;
    const grp=wbdContext.pitchGroup(d.pType,d);
    usedGroups.add(grp); usedOutcomes.add(oc);
    const col=_colorMode==='outcome' ? ((wbdContext._OUTCOME_META[oc]||{}).color||'#888') : (wbdContext.GROUP_COLORS[grp]||'#888');
    const gi=allData.indexOf(d);
    items+=drawShape(shapeFor(d), sx, sy, col, gi);
  });

  // 범례: 구종 그룹별 (색상)  + 판정별 (모양)
  const groupLeg=[...usedGroups].map(g=>`<div class="legend-item"><div class="ldot" style="background:${wbdContext.GROUP_COLORS[g]||'#888'}"></div>${g}</div>`).join('');
  // V11.3: 결과별 범례 (모양+색상)
  const _shapeSvg=(shape,col)=>{
    if(shape==='circle') return `<svg width="11" height="11" style="vertical-align:middle"><circle cx="5.5" cy="5.5" r="3.5" fill="${col}"/></svg>`;
    if(shape==='diamond') return `<svg width="11" height="11" style="vertical-align:middle"><polygon points="5.5,2 9,5.5 5.5,9 2,5.5" fill="${col}"/></svg>`;
    if(shape==='triangle') return `<svg width="11" height="11" style="vertical-align:middle"><polygon points="5.5,2 9,8 2,8" fill="${col}"/></svg>`;
    if(shape==='square') return `<svg width="11" height="11" style="vertical-align:middle"><rect x="2" y="2" width="7" height="7" fill="${col}"/></svg>`;
    if(shape==='cross') return `<svg width="11" height="11" style="vertical-align:middle"><line x1="2" y1="2" x2="9" y2="9" stroke="${col}" stroke-width="1.6"/><line x1="2" y1="9" x2="9" y2="2" stroke="${col}" stroke-width="1.6"/></svg>`;
    if(shape==='star') return `<svg width="12" height="12" style="vertical-align:middle"><polygon points="6,1 7.2,4.5 11,4.5 8,6.8 9.2,10.5 6,8.2 2.8,10.5 4,6.8 1,4.5 4.8,4.5" fill="${col}"/></svg>`;
    if(shape==='dtriangle') return `<svg width="11" height="11" style="vertical-align:middle"><polygon points="5.5,9 9,3 2,3" fill="${col}"/></svg>`;
    if(shape==='hbar') return `<svg width="11" height="11" style="vertical-align:middle"><rect x="2" y="4" width="7" height="3" rx="1" fill="${col}"/></svg>`;
    if(shape==='ring') return `<svg width="11" height="11" style="vertical-align:middle"><circle cx="5.5" cy="5.5" r="3.3" fill="none" stroke="${col}" stroke-width="1.5"/></svg>`;
    if(shape==='plus') return `<svg width="11" height="11" style="vertical-align:middle"><line x1="2" y1="5.5" x2="9" y2="5.5" stroke="${col}" stroke-width="1.6"/><line x1="5.5" y1="2" x2="5.5" y2="9" stroke="${col}" stroke-width="1.6"/></svg>`;
    return '';
  };
  const _ocOrder=['hr','hit','out','whiff','called','foul','ball','bb','hbp'];
  const shapeLeg=_ocOrder.filter(k=>usedOutcomes.has(k)).map(k=>{
    const m=wbdContext._OUTCOME_META[k];
    return `<div class="legend-item" style="font-size:10px">${_shapeSvg(m.shape, _colorMode==='outcome'?m.color:'#888')} ${m.label}</div>`;
  }).join('');
  // 결과 필터 버튼
  const el=document.getElementById('p-zone-chart');
  el.innerHTML=`
    ${_colorMode==='group'?`<div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">구종 (색상)</div>
    <div class="legend" style="margin-bottom:6px;flex-wrap:wrap">${groupLeg||'<span style="color:var(--muted);font-size:10px">데이터 없음</span>'}</div>`:''}
    <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px">결과 (모양${_colorMode==='outcome'?'+색상':''})</div>
    <div class="legend" style="margin-bottom:8px;flex-wrap:wrap">${shapeLeg||'<span style="color:var(--muted);font-size:10px">해당 없음</span>'}</div>
    ${wbdContext.makeSVG(W,H,items)}`;

  el.querySelectorAll('.zone-dot').forEach(dot=>{
    dot.addEventListener('click',()=>{
      const d=allData[+dot.dataset.gi];if(!d)return;
      document.getElementById('p-zone-detail').innerHTML=
        `📌 ${wbdContext.PITCH_NAMES[d.pType]||d.pType} | ${d.spdK}km/h | ${wbdContext.CALL_NAMES[d.call]||''} | vs ${d.bName||'?'} | ${wbdContext.RESULT_NAMES[d.result]||''}`;
    });
    dot.addEventListener('mouseenter',e=>{
      const d=allData[+dot.dataset.gi];if(!d)return;
      wbdContext.showTip(e,`${wbdContext.PITCH_NAMES[d.pType]||d.pType}<br>${d.spdK}km/h | ${wbdContext.CALL_NAMES[d.call]||''}<br>vs ${d.bName||'?'} | ${d.ball}-${d.strk}`);
    });
    dot.addEventListener('mousemove',wbdContext.moveTip);
    dot.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:5412
wbdContext.zoneCell = function zoneCell(d){
  if(d.zoneX==null||d.zoneY==null)return -1;
  const col=Math.min(2,Math.max(0,Math.floor((+d.zoneX+1)*1.5)));
  const row=Math.min(2,Math.max(0,2-Math.floor((+d.zoneY+1)*1.5)));
  return row*3+col;
};

// Original index.html:5424
wbdContext.zoneCourseLabels = function zoneCourseLabels(batSide){
  const isLefty = String(batSide||'').toUpperCase()==='L';
  // 가로 어근 (col 0,1,2). 'M'=가운데
  const horiz = isLefty ? ['몸','M','바깥'] : ['바깥','M','몸'];
  // 세로 어근 (row 0,1,2). 'M'=가운데
  const vert = ['위','M','아래'];
  const labels = [];
  for(let row=0; row<3; row++){
    for(let col=0; col<3; col++){
      const h = horiz[col], v = vert[row];
      if(h==='M' && v==='M') labels.push('한가운데');
      else if(h==='M') labels.push(v+'쪽 가운데');         // 위쪽 가운데 / 아래쪽 가운데
      else if(v==='M') labels.push(h+'쪽');                // 몸쪽 / 바깥쪽
      else labels.push(h+'쪽'+v);                          // 몸쪽위 / 바깥아래
    }
  }
  return labels;
};

// Original index.html:5444
wbdContext.drawZone9SVG = function drawZone9SVG(grid,maxVal,colorFn,labelFn,id,note){
  const W=280,H=290,cellW=W/3,cellH=(H-30)/3;
  let items='';
  items+=wbdContext.sEl('rect',{x:0,y:0,width:W,height:H-30,fill:'none',stroke:'#4080c0','stroke-width':'1.5',rx:'3'});
  grid.forEach((c,i)=>{
    const col=i%3,row=Math.floor(i/3);
    const x=col*cellW,y=row*cellH;
    const alpha=maxVal>0?Math.min(c.val/maxVal,1):0;
    const bg=colorFn(alpha);
    items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:(y+1).toFixed(1),width:(cellW-2).toFixed(1),height:(cellH-2).toFixed(1),fill:bg,rx:'3'});
    // 경계선
    items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:(y+1).toFixed(1),width:(cellW-2).toFixed(1),height:(cellH-2).toFixed(1),fill:'none',stroke:'rgba(64,128,192,0.4)','stroke-width':'0.5'});
    const lines=labelFn(c,i);
    const lineH=14;
    const startY=y+cellH/2-(lines.length-1)*lineH/2;
    lines.forEach((l,li)=>{
      items+=wbdContext.sEl('text',{x:(x+cellW/2).toFixed(1),y:(startY+li*lineH).toFixed(1),fill:l.color||'#fff','font-size':l.size||'10','text-anchor':'middle','font-weight':l.bold?'600':'400'},l.text);
    });
  });
  // 방향 라벨
  ['내측','중','외측'].forEach((l,i)=>{
    items+=wbdContext.sEl('text',{x:(cellW*i+cellW/2).toFixed(1),y:H-14,fill:'#3a5a7a','font-size':'8','text-anchor':'middle'},l);
  });
  ['고','중','저'].forEach((l,i)=>{
    items+=wbdContext.sEl('text',{x:-6,y:(cellH*i+cellH/2+4).toFixed(1),fill:'#3a5a7a','font-size':'8','text-anchor':'middle'},l);
  });
  const el=document.getElementById(id);
  el.innerHTML=`<div style="font-size:10px;color:var(--muted);margin-bottom:6px">${note}</div>${wbdContext.makeSVG(W,H,items)}`;
};

// Original index.html:5474
wbdContext.renderZone9Bad = function renderZone9Bad(){
  const pd=wbdContext.getPitcherDataFiltered();
  const grid=Array(9).fill(0).map(()=>({total:0,ab:0,hits:0,hardHits:0,hrs:0}));
  pd.forEach(d=>{
    const ci=wbdContext.zoneCell(d);if(ci<0)return;
    const r=+d.result;
    grid[ci].total++;
    if(wbdContext._isHit(d)){grid[ci].hits++;if(r===4)grid[ci].hrs++;}
    // AB: 표준 (인플레이 + K)
    if(wbdContext._isABPitch(d)){
      grid[ci].ab++;
    }
    if(wbdContext._isInPlay(d)&&wbdContext._isHardHit(d))grid[ci].hardHits++;
  });
  const maxBad=Math.max(...grid.map(c=>c.hits+c.hardHits),1);
  wbdContext.drawZone9SVG(
    grid.map(c=>({...c,val:c.hits+c.hardHits})),
    maxBad,
    alpha=>`rgba(255,69,96,${(alpha*0.65).toFixed(2)})`,
    (c)=>{
      // 표준 피안타율 = hits / ab
      const ba = c.ab>0 ? (c.hits/c.ab).toFixed(3).replace(/^0/,'') : '-';
      return [
        {text:c.total+'구',color:'#ccc',size:'9'},
        {text:`안타 ${c.hits}${c.hrs>0?' (HR '+c.hrs+')':''}`,color:'#ff8090',size:'10',bold:true},
        {text:`HH ${c.hardHits}  BAA ${ba}`,color:'#ff6060',size:'8'},
      ];
    },
    'p-zone9-bad',
    '빨강 강도 = 안타+하드힛(EV≥110) 빈도'
  );
};

// Original index.html:5507
wbdContext.renderZone9Good = function renderZone9Good(){
  const pd=wbdContext.getPitcherDataFiltered();
  const grid=Array(9).fill(0).map(()=>({total:0,whiffs:0,weakHits:0,calledK:0}));
  pd.forEach(d=>{
    const ci=wbdContext.zoneCell(d);if(ci<0)return;
    grid[ci].total++;
    if(d.bSwing&&(d.call===4||d.call===0))grid[ci].whiffs++;   // 헛스윙
    if(d.call===0&&!d.bSwing)grid[ci].calledK++;               // 루킹 스트라이크
    if(wbdContext._isInPlay(d)&&+d.ev<90)grid[ci].weakHits++;                   // 약한 타구
  });
  const maxGood=Math.max(...grid.map(c=>c.whiffs+c.calledK),1);
  wbdContext.drawZone9SVG(
    grid.map(c=>({...c,val:c.whiffs+c.calledK})),
    maxGood,
    alpha=>`rgba(57,255,138,${(alpha*0.6).toFixed(2)})`,
    (c)=>{
      const whiffRate=c.total>0?((c.whiffs+c.calledK)/c.total*100).toFixed(0):0;
      return [
        {text:c.total+'구',color:'#ccc',size:'9'},
        {text:`헛스윙 ${c.whiffs}  루킹 ${c.calledK}`,color:'#39ff8a',size:'10',bold:true},
        {text:`약타 ${c.weakHits}  K율 ${whiffRate}%`,color:'#44ddaa',size:'8'},
      ];
    },
    'p-zone9-good',
    '초록 강도 = 헛스윙+루킹K 빈도'
  );
};

// Original index.html:5535
wbdContext.renderCountGrid = function renderCountGrid(){
  const pd=wbdContext.getPitcherDataFiltered();
  const W=520,cellW=118,cellH=96,padL=32,padT=34,padB=8;
  const H=padT+3*cellH+padB;
  let items='';
  // 헤더
  items+=wbdContext.sEl('text',{x:padL+4*cellW/2,y:14,fill:'var(--muted)','font-size':'11','text-anchor':'middle'},'볼 카운트 →');
  for(let b=0;b<4;b++)items+=wbdContext.sEl('text',{x:(padL+b*cellW+cellW/2).toFixed(1),y:padT-6,fill:'#3a5a7a','font-size':'10','text-anchor':'middle'},b+'볼');
  for(let s=0;s<3;s++)items+=wbdContext.sEl('text',{x:10,y:(padT+s*cellH+cellH/2+4).toFixed(1),fill:'#3a5a7a','font-size':'10'},s+'S');

  for(let b=0;b<4;b++){
    for(let s=0;s<3;s++){
      const cd=pd.filter(d=>+d.ball===b&&+d.strk===s);
      const x=padL+b*cellW,y=padT+s*cellH;
      if(!cd.length){
        items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:(y+1).toFixed(1),width:(cellW-2).toFixed(1),height:(cellH-2).toFixed(1),fill:'#050c18',stroke:'#1a2f4a','stroke-width':'0.5',rx:'3'});
        items+=`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="transparent" class="count-cell" data-b="${b}" data-s="${s}" style="cursor:pointer"/>`;
        continue;
      }
      const strK=cd.filter(d=>d.call===0||d.call===4).length;
      const alpha=strK/cd.length;
      // 구종 분포
      const groups={};
      cd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);groups[g]=(groups[g]||0)+1;});
      const sorted=Object.entries(groups).sort((a,b2)=>b2[1]-a[1]);
      const top=sorted[0];
      const topSpds=cd.filter(d=>wbdContext.pitchGroup(d.pType,d)===top[0]&&d.spdK>0).map(d=>+d.spdK);
      const topAvgSpd=topSpds.length?(topSpds.reduce((a,b2)=>a+b2,0)/topSpds.length).toFixed(0):'-';
      const topPct=(top[1]/cd.length*100).toFixed(0);
      items+=wbdContext.sEl('rect',{x:(x+1).toFixed(1),y:(y+1).toFixed(1),width:(cellW-2).toFixed(1),height:(cellH-2).toFixed(1),fill:`rgba(57,255,138,${(alpha*0.3).toFixed(2)})`,stroke:'#2a4060','stroke-width':'0.8',rx:'3'});
      // 구종명
      items+=wbdContext.sEl('text',{x:(x+cellW/2).toFixed(1),y:(y+20).toFixed(1),fill:wbdContext.GROUP_COLORS[top[0]]||'#fff','font-size':'11','text-anchor':'middle','font-weight':'600'},top[0]);
      // 평균구속
      items+=wbdContext.sEl('text',{x:(x+cellW/2).toFixed(1),y:(y+38).toFixed(1),fill:'var(--amber)','font-size':'13','text-anchor':'middle'},topAvgSpd+'km/h');
      // 비율
      items+=wbdContext.sEl('text',{x:(x+cellW/2).toFixed(1),y:(y+56).toFixed(1),fill:'#ccc','font-size':'11','text-anchor':'middle'},topPct+'%  ('+cd.length+'구)');
      // Strike%
      items+=wbdContext.sEl('text',{x:(x+cellW/2).toFixed(1),y:(y+74).toFixed(1),fill:'#44bb88','font-size':'10','text-anchor':'middle'},'S:'+Math.round(alpha*100)+'%');
      // 투명 클릭 오버레이 (전체 셀 영역)
      items+=`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="transparent" class="count-cell" data-b="${b}" data-s="${s}" style="cursor:pointer"/>`;
    }
  }

  const el=document.getElementById('p-count-grid');
  el.innerHTML=wbdContext.makeSVG(W,H,items);
  el.querySelectorAll('.count-cell').forEach(cell=>{
    cell.style.cursor='pointer';
    cell.addEventListener('click',()=>{
      const b=+cell.getAttribute('data-b'),s=+cell.getAttribute('data-s');
      const cd=pd.filter(d=>+d.ball===b&&+d.strk===s);
      if(!cd.length){document.getElementById('p-count-detail').innerHTML='';return;}
      // 구종별 집계
      const groups={};
      cd.forEach(d=>{
        const g=wbdContext.pitchGroup(d.pType,d);
        if(!groups[g])groups[g]={cnt:0,spds:[],pows:[]};
        groups[g].cnt++;
        if(d.spdK>0)groups[g].spds.push(+d.spdK);
        if(d.pPow>0)groups[g].pows.push(+d.pPow);
      });
      const sorted=Object.entries(groups).sort((a,b2)=>b2[1].cnt-a[1].cnt);
      let summaryHtml=`<div style="background:#060e1a;border:1px solid var(--border);border-radius:6px;padding:14px">
        <div style="font-size:12px;color:var(--amber);margin-bottom:10px;font-family:var(--cond);font-weight:700;letter-spacing:1px">${b}볼 ${s}스트라이크 — 총 ${cd.length}구</div>
        <div style="overflow-x:auto"><table class="data-table" style="margin-bottom:14px">
          <thead><tr><th>구종그룹</th><th>투구수</th><th>비율</th><th>평균구속</th><th>최고구속</th></tr></thead>
          <tbody>`;
      sorted.forEach(([g,v])=>{
        const avgS=v.spds.length?(v.spds.reduce((a,b2)=>a+b2,0)/v.spds.length).toFixed(1):'-';
        const maxS=v.spds.length?Math.max(...v.spds).toFixed(0):'-';
        summaryHtml+=`<tr><td style="color:${wbdContext.GROUP_COLORS[g]};font-weight:600">${g}</td><td>${v.cnt}</td><td>${(v.cnt/cd.length*100).toFixed(1)}%</td><td>${avgS}</td><td>${maxS}</td></tr>`;
      });
      summaryHtml+=`</tbody></table></div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-family:var(--cond);text-transform:uppercase;letter-spacing:.8px">전체 투구 목록</div>
        <div style="overflow-x:auto"><table class="data-table">
          <thead><tr><th>#</th><th>구종</th><th>구속</th><th>판정</th><th>결과</th><th>타자</th></tr></thead>
          <tbody>`;
      cd.forEach((d,i)=>{
        const callBg={0:'badge-strike',1:'badge-ball',2:'badge-hit',4:'badge-swing',3:'badge-hbp'};
        const resBg={4:'badge-hr',5:'badge-walk',6:'badge-hbp',1:'badge-out',2:'badge-out'};
        summaryHtml+=`<tr>
          <td style="color:var(--muted)">${i+1}</td>
          <td style="color:${wbdContext.GROUP_COLORS[wbdContext.pitchGroup(d.pType,d)]}">${wbdContext.PITCH_NAMES[d.pType]||d.pType}</td>
          <td style="font-family:var(--mono)">${d.spdK||'-'}</td>
          <td><span class="badge ${callBg[d.call]||'badge-out'}">${wbdContext.CALL_NAMES[d.call]||d.call}</span></td>
          <td>${d.result>0?`<span class="badge ${resBg[d.result]||'badge-out'}">${wbdContext.RESULT_NAMES[d.result]}</span>`:'<span style="color:var(--muted)">-</span>'}</td>
          <td style="color:var(--muted)">${d.bName||'-'}</td>
        </tr>`;
      });
      summaryHtml+=`</tbody></table></div></div>`;
      document.getElementById('p-count-detail').innerHTML=summaryHtml;
    });
  });
  document.getElementById('p-count-detail').innerHTML='<div style="font-size:11px;color:var(--muted);padding:8px 0">▲ 카운트 칸을 클릭하면 상세 정보가 여기에 표시됩니다</div>';
};

// Original index.html:5631
wbdContext.renderRunnerDonuts = function renderRunnerDonuts(){
  const pd=wbdContext.getPitcherDataFiltered();
  const situations=[
    {label:'무주자',filter:d=>!d.b1&&!d.b2&&!d.b3},
    {label:'1루',filter:d=>d.b1&&!d.b2&&!d.b3},
    {label:'득점권',filter:d=>d.b2||d.b3},
    {label:'만루',filter:d=>d.b1&&d.b2&&d.b3}
  ];
  // 공유 범례 (사용된 구종만)
  const allCounts={};
  pd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);allCounts[g]=(allCounts[g]||0)+1;});
  const sharedLeg=Object.keys(allCounts).map(g=>`<div class="legend-item"><div class="ldot" style="background:${wbdContext.GROUP_COLORS[g]||'#888'}"></div>${g}</div>`).join('');
  let html=`<div class="legend" style="margin-bottom:10px;flex-wrap:wrap">${sharedLeg}</div>`;
  html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
  situations.forEach(sit=>{
    const sub=pd.filter(sit.filter);
    const counts={};
    sub.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);counts[g]=(counts[g]||0)+1;});
    const data=Object.entries(wbdContext.PITCH_GROUPS).map(([g])=>({label:g,count:counts[g]||0,color:wbdContext.GROUP_COLORS[g]})).filter(d=>d.count>0);
    const total=sub.length||1;
    html+=`<div><div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:6px">${sit.label} (${sub.length}구)</div>${wbdContext.makeDonut(data,150)}</div>`;
  });
  html+='</div>';
  const el=document.getElementById('p-runner-donuts');
  el.innerHTML=html;
  el.querySelectorAll('.donut-arc').forEach(arc=>{
    arc.addEventListener('mouseenter',e=>wbdContext.showTip(e,`<b>${arc.dataset.label}</b><br>${arc.dataset.cnt}구 (${arc.dataset.pct}%)`));
    arc.addEventListener('mousemove',wbdContext.moveTip);
    arc.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:5663
wbdContext.renderInnVelocity = function renderInnVelocity(){
  const pd=wbdContext.getPitcherDataFiltered();
  const innings=[...new Set(pd.map(d=>d.inn))].sort((a,b)=>a-b);
  if(!innings.length){document.getElementById('p-inn-velocity').innerHTML='<span style="color:var(--muted)">데이터 없음</span>';return;}

  // 패스트볼 그룹 vs 변화구/오프스피드 그룹
  const FASTBALL_TYPES=new Set([0,26,27,28,32,33,34,35,36,37,29,30,31]); // FB + Cutter
  const isFast=d=>FASTBALL_TYPES.has(+d.pType);

  const W=380,H=160,px=44,py=12,padB=22;
  const avgByInn=(filter)=>innings.map(inn=>{
    const spds=pd.filter(d=>d.inn===inn&&d.spdK>0&&filter(d)).map(d=>+d.spdK);
    return spds.length?spds.reduce((a,b)=>a+b,0)/spds.length:null;
  });

  const fbPts=avgByInn(isFast);
  const brPts=avgByInn(d=>!isFast(d));

  const allVals=[...fbPts,...brPts].filter(Boolean);
  if(!allVals.length){document.getElementById('p-inn-velocity').innerHTML='<span style="color:var(--muted)">구속 데이터 없음</span>';return;}
  const mn=Math.min(...allVals)-4,mx=Math.max(...allVals)+4;

  const scX=i=>px+i/(Math.max(innings.length-1,1))*(W-px-10);
  const scY=v=>py+(mx-v)/(mx-mn)*(H-py-padB);

  let items='';

  // 격자
  [0.25,0.5,0.75,1].forEach(t=>{
    const v=Math.round(mn+t*(mx-mn));
    const y=scY(v);
    items+=wbdContext.sEl('line',{x1:px,y1:y.toFixed(1),x2:W-10,y2:y.toFixed(1),stroke:'#1a2f4a','stroke-width':'0.5'});
    items+=wbdContext.sEl('text',{x:2,y:(y+3).toFixed(1),fill:'#3a5a7a','font-size':'7'},v+'');
  });
  // 이닝 라벨
  innings.forEach((inn,i)=>{
    items+=wbdContext.sEl('text',{x:scX(i).toFixed(1),y:H-5,fill:'#3a5a7a','font-size':'8','text-anchor':'middle'},inn+'이닝');
  });

  // 직구 라인
  let fbPath='';
  innings.forEach((inn,i)=>{
    const v=fbPts[i];if(v==null)return;
    const x=scX(i),y=scY(v);
    fbPath+=fbPath?`L${x.toFixed(1)},${y.toFixed(1)} `:`M${x.toFixed(1)},${y.toFixed(1)} `;
    items+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#ff4560"/>`;
    items+=wbdContext.sEl('text',{x:x.toFixed(1),y:(y-8).toFixed(1),fill:'#ff6070','font-size':'8','text-anchor':'middle'},v.toFixed(1));
  });
  if(fbPath)items=`<path d="${fbPath}" fill="none" stroke="#ff4560" stroke-width="1.8" opacity="0.8"/>`+items;

  // 변화구 라인
  let brPath='';
  innings.forEach((inn,i)=>{
    const v=brPts[i];if(v==null)return;
    const x=scX(i),y=scY(v);
    brPath+=brPath?`L${x.toFixed(1)},${y.toFixed(1)} `:`M${x.toFixed(1)},${y.toFixed(1)} `;
    items+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#2196f3"/>`;
    items+=wbdContext.sEl('text',{x:x.toFixed(1),y:(y-8).toFixed(1),fill:'#44aaff','font-size':'8','text-anchor':'middle'},v.toFixed(1));
  });
  if(brPath)items=`<path d="${brPath}" fill="none" stroke="#2196f3" stroke-width="1.8" opacity="0.8"/>`+items;

  const leg=`<div class="legend"><div class="legend-item"><div class="ldot" style="background:#ff4560"></div>직구/커터 (패스트볼)</div><div class="legend-item"><div class="ldot" style="background:#2196f3"></div>변화구/오프스피드</div></div>`;
  document.getElementById('p-inn-velocity').innerHTML=leg+wbdContext.makeSVG(W,H,items);
};

// Original index.html:5728
wbdContext.renderLRDonuts = function renderLRDonuts(){
  ['L','R'].forEach((bz,idx)=>{
    const sub=wbdContext.getPitcherData().filter(d=>d.bZone===bz);
    const counts={};sub.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);counts[g]=(counts[g]||0)+1;});
    const data=Object.entries(wbdContext.PITCH_GROUPS).map(([g])=>({label:g,count:counts[g]||0,color:wbdContext.GROUP_COLORS[g]})).filter(d=>d.count>0);
    const total=sub.length||1;
    const leg=data.map(d=>`<div class="legend-item" style="font-size:10px"><div class="ldot" style="background:${d.color}"></div>${d.label} <span style="color:var(--amber);font-family:var(--mono)">${(d.count/total*100).toFixed(0)}%</span></div>`).join('');
    const el=document.getElementById(idx===0?'p-lr-l':'p-lr-r');
    el.innerHTML=`<div style="font-size:11px;color:var(--muted);margin-bottom:4px">n=${sub.length}</div><div class="legend" style="flex-wrap:wrap;margin-bottom:6px;gap:4px">${leg}</div>${wbdContext.makeDonut(data,170)}`;
    el.querySelectorAll('.donut-arc').forEach(arc=>{
      arc.addEventListener('mouseenter',e=>wbdContext.showTip(e,`<b>${arc.dataset.label}</b><br>${arc.dataset.cnt}구 (${arc.dataset.pct}%)`));
      arc.addEventListener('mousemove',wbdContext.moveTip);
      arc.addEventListener('mouseleave',wbdContext.hideTip);
    });
  });
};

// Original index.html:5745
wbdContext.renderResultPitch = function renderResultPitch(){
  const pd=wbdContext.getPitcherDataFiltered();
  const resultGroups={홈런:pd.filter(d=>d.result===4),안타:pd.filter(d=>d['1BSafe']),아웃:pd.filter(d=>[1,2].includes(d.result)),볼넷:pd.filter(d=>d.result===5)};
  let html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">';
  Object.entries(resultGroups).forEach(([name,arr])=>{
    const counts={};arr.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);counts[g]=(counts[g]||0)+1;});
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3);
    html+=`<div style="background:var(--card2);border:1px solid var(--border);border-radius:6px;padding:12px"><div style="font-size:12px;color:var(--muted);margin-bottom:8px">${name} (${arr.length}회)</div>`;
    top.forEach(([g,cnt])=>html+=`<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:${wbdContext.GROUP_COLORS[g]}">${g}</span><span style="font-family:var(--mono);color:var(--amber)">${cnt}구</span></div>`);
    if(!top.length)html+='<span style="font-size:11px;color:var(--muted)">데이터 없음</span>';
    html+='</div>';
  });
  html+='</div>';
  document.getElementById('p-result-pitch').innerHTML=html;
};

// Original index.html:5763
wbdContext._finalOutcomeBadge = function _finalOutcomeBadge(d){
  const r=+d.result;
  // 비타구 결과 우선
  if(r===4) return '<span class="badge badge-hr">홈런</span>';
  if(r===5) return '<span class="badge badge-walk">볼넷</span>';
  if(r===6) return '<span class="badge badge-hbp">사구</span>';
  if(r===3) return '<span class="badge" style="background:rgba(204,68,255,0.18);color:#cc44ff">파울</span>';
  // 삼진 (2스트라이크에서 타석 종료 — 헛스윙/루킹)
  if(+d.strk===2 && !wbdContext._isHit(d) && (+d.call===4 || +d.call===0) && r!==1 && r!==2){
    // 타석이 이 투구로 끝났을 때만 삼진 (연속 파울 아님)
    if(+d.call===4) return '<span class="badge badge-out" style="background:rgba(255,69,96,0.22);color:#ff4560">삼진(헛)</span>';
    if(+d.call===0) return '<span class="badge badge-out" style="background:rgba(255,136,68,0.22);color:#ff8844">삼진(루킹)</span>';
  }
  // 인플레이 타구: 안타 vs 아웃 + 타구종류 (실제 발사각 기준)
  const isInPlay=+d.ev>0 && r!==3;
  if(isInPlay){
    const bType = wbdContext._battedType(d) || '타구';
    if(wbdContext._isHit(d)){
      const base=+d._hitBase||0;
      const bl = base===2?'2루타' : base===3?'3루타' : '안타';
      return `<span class="badge badge-hit">${bl}<span style="opacity:.6;font-size:9px">(${bType})</span></span>`;
    }
    return `<span class="badge badge-out">아웃<span style="opacity:.6;font-size:9px">(${bType})</span></span>`;
  }
  // 그 외 (스윙 안 하고 진행중 등)
  if(+d.call===1) return '<span class="badge badge-ball">볼</span>';
  if(+d.call===0) return '<span class="badge badge-strike">스트라이크</span>';
  if(+d.call===4) return '<span class="badge badge-swing">헛스윙</span>';
  return '<span class="badge badge-out" style="opacity:.5">-</span>';
};

// Original index.html:5795
wbdContext.renderPitcherLog = function renderPitcherLog(){
  const innSel=document.getElementById('pl-inn-sel').value;
  const grpSel=document.getElementById('pl-group-sel').value;
  const callSel=document.getElementById('pl-call-sel').value;
  const resSel=document.getElementById('pl-result-sel').value;
  let data=wbdContext.getPitcherDataByName(wbdContext.currentPitcher);
  if(innSel)data=data.filter(d=>d.inn===+innSel);
  if(grpSel)data=data.filter(d=>wbdContext.pitchGroup(d.pType,d)===grpSel);
  if(callSel!=='')data=data.filter(d=>wbdContext._pitchOutcome(d)===callSel);
  if(resSel!=='')data=data.filter(d=>d.result===+resSel);
  const total=data.length,pages=Math.max(1,Math.ceil(total/wbdContext.PAGE_SIZE));
  wbdContext.pitcherLogPage=Math.min(wbdContext.pitcherLogPage,pages-1);
  const slice=data.slice(wbdContext.pitcherLogPage*wbdContext.PAGE_SIZE,(wbdContext.pitcherLogPage+1)*wbdContext.PAGE_SIZE);
  function callBadge(c){const m={0:'badge-strike',1:'badge-ball',2:'badge-hit',4:'badge-swing',3:'badge-hbp'};return`<span class="badge ${m[c]||'badge-out'}">${wbdContext.CALL_NAMES[c]||c}</span>`}
  function resBadge(r){const m={4:'badge-hr',5:'badge-walk',6:'badge-hbp',1:'badge-out',2:'badge-out'};return r>0?`<span class="badge ${m[r]||'badge-out'}">${wbdContext.RESULT_NAMES[r]}</span>`:'<span class="badge badge-out">-</span>'}
  // V11.3: 투수 관점 로그 보강
  function _pl_zone(d){ return d.zoneX!=null ? (wbdContext._isInZone(d)?'<span style="color:#f5a623">존안</span>':'<span style="color:var(--muted)">존밖</span>') : '-'; }
  function _pl_swing(d){
    if(!wbdContext._isSwing(d)) return '<span class="badge badge-out" style="opacity:0.5">노스윙</span>';
    if(wbdContext._isWhiff(d)) return '<span class="badge" style="background:rgba(255,69,96,0.18);color:#ff4560">헛스윙</span>';
    return '<span class="badge" style="background:rgba(57,255,138,0.18);color:#39ff8a">컨택</span>';
  }
  function _pl_hpos(d){
    if(d.hPos==null||!(+d.ev>0)) return '<span style="color:var(--muted)">-</span>';
    const h=+d.hPos, dev=Math.abs(h-0.5);
    // 투수 관점: 타자가 빗맞을수록 좋음
    const col = dev<=0.10?'#ff4560' : dev<=0.20?'#f5a623' : '#39ff8a';
    return `<span style="font-family:var(--mono);color:${col}" title="타자 배트 접촉 위치 (0.5=중심 · 투수는 빗맞힐수록 좋음)">${h.toFixed(2)}</span>`;
  }
  function _pl_bbq(d){
    if(!wbdContext._isInPlay(d)||wbdContext._isBunt(d)) return '<span style="color:var(--muted)">-</span>';
    const q=wbdContext._bbQuality(d), m=wbdContext._BBQ_META[q]||{};
    return `<span class="badge" style="background:${m.color||'#888'}22;color:${m.color||'#888'}">${m.label||q}</span>`;
  }
  let html=`<thead><tr><th>#</th><th>이닝</th><th>타자</th><th>구종</th><th>구속</th><th>코스</th><th>B-S-O</th><th>판정</th><th>스윙</th><th title="타자 배트 접촉 위치 (0.5=중심)">피배트중심</th><th>결과</th><th>EV</th><th>발사각</th><th>피타구질</th><th title="리그 기대 아웃확률 · 🍀피안타인데 잡혔어야 💀잘맞았는데 아웃">xOut</th></tr></thead><tbody>`;
  slice.forEach((d,i)=>{
    const gi=wbdContext._gIndexOf(d);
    html+=`<tr onclick="showPitchModal(${gi})"><td style="color:var(--muted)">${d.id||''}</td><td>${d.inn}이닝${d.half===0?'말':'초'}</td><td>${d.bName||'-'}</td><td style="color:${wbdContext.GROUP_COLORS[wbdContext.pitchGroup(d.pType,d)]}">${wbdContext.PITCH_NAMES[d.pType]||d.pType}</td><td style="font-family:var(--mono)">${d.spdK||'-'}</td><td style="font-size:10px">${_pl_zone(d)}</td><td style="font-family:var(--mono)">${d.ball}-${d.strk}-${d.out}</td><td>${callBadge(d.call)}</td><td>${_pl_swing(d)}</td><td>${_pl_hpos(d)}</td><td>${wbdContext._finalOutcomeBadge(d)}</td><td style="font-family:var(--mono)">${d.ev>0?d.ev:'-'}</td><td style="font-family:var(--mono)">${d.ldeg!=null&&d.ev>0?d.ldeg+'°':'-'}</td><td>${_pl_bbq(d)}</td><td>${wbdContext._xoutBadge(d)}</td></tr>`;
  });
  html+='</tbody>';
  document.getElementById('pitcher-log-table').innerHTML=html;
  let pag='';for(let p=0;p<pages;p++)pag+=`<button class="${p===wbdContext.pitcherLogPage?'active':''}" onclick="pitcherLogPage=${p};renderPitcherLog()">${p+1}</button>`;
  document.getElementById('pitcher-log-pag').innerHTML=pag;
};

// Original index.html:5843
wbdContext.onBatterChange = function onBatterChange(){
  const sel=document.getElementById('batter-sel');
  if(!sel)return;
  const v=sel.options[sel.selectedIndex]?.value;
  if(!v)return;
  wbdContext.currentBatter=v;
  wbdContext.renderBatterPage();
};
}

export function initialize(wbdContext) {
// Original index.html:5165
window.pzPitchSel=window.pzPitchSel||{};
}
