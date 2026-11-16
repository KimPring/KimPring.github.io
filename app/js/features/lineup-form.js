/** lineup-form: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:34668
wbdContext.calcBestLineup = function calcBestLineup(criterion='combo', topN=3){
  const byPos={0:[],1:[],2:[],3:[],4:[],5:[],6:[],7:[],8:[],9:[]};
  const MIN=wbdContext._getFieldingMin();

  // 투수 모드 (window.bestLineupPitcherMode): 'pitcher'(기본) / 'batter' / 'total'
  const pitcherMode=window.bestLineupPitcherMode||'pitcher';

  // ── 타자 포지션 (1~9) 및 DH(9) ──
  // ⚠️ pos=0 (투수)은 타자 row에서 제외 — 투수 자리는 따로 처리
  const bNames=(window._cache.batterNames||[]).slice();
  bNames.forEach(n=>{
    const bd=wbdContext.getBatterDataByName(n).filter(wbdContext._isInPlay);
    if(bd.length<MIN.ab)return;
    const {posInnings,totalInnings}=wbdContext.calcFieldingInnings(n);
    if(totalInnings<MIN.innings)return;
    const primary=wbdContext.getPrimaryPosition(n);
    if(!primary)return;
    if(primary.pos===0)return;  // 타자 row인데 주 포지션이 투수면 제외 (투수 row에서 따로 처리)
    const card=wbdContext.calcBatterCard(n);
    if(!card||card.lowData)return;
    const war=wbdContext.calcBatterWAR(n);
    let score=0;
    if(criterion==='ovr')score=card.OVR;
    else if(criterion==='war')score=war;
    else score=card.OVR*0.7+war*15*0.3;  // combo: OVR 70% + WAR 30%
    byPos[primary.pos].push({
      name:n, type:'batter', card, war, score,
      primary, primaryInnings:primary.innings, totalInnings,
      team:wbdContext._playerTeam(n,'batter')
    });
  });

  // ── 투수 포지션 (0) ── pitcherMode에 따라 평가 기준 다름
  // pitcher: 투수 OVR + 투수 WAR (기본, 100% 투수 성적)
  // batter: 투수 OVR + 타자 WAR (타자 활약도 고려)
  // total: 투수 OVR + 합산 WAR (P+B 합)
  const pNames=(window._cache.pitcherNames||[]).slice();
  pNames.forEach(n=>{
    const pd=wbdContext.getPitcherDataByName(n);
    if(pd.length<MIN.pitch)return;
    const card=wbdContext.calcPitcherCard(n);
    if(!card||card.lowData)return;
    const pWar=wbdContext.calcPitcherWAR(n);
    const isHybrid=wbdContext.G.some(d=>String(d.bName)===String(n));
    const bWar=isHybrid?wbdContext.calcBatterWAR(n):0;
    let war;
    if(pitcherMode==='batter') war=bWar;
    else if(pitcherMode==='total') war=pWar+bWar;
    else war=pWar;  // 'pitcher' 기본
    
    let score=0;
    if(criterion==='ovr')score=card.OVR;
    else if(criterion==='war')score=war;
    else score=card.OVR*0.7+war*15*0.3;  // combo: OVR 70% + WAR 30%
    byPos[0].push({
      name:n, type:'pitcher', card, war, pWar, bWar, score,
      primary:{pos:0,name:'P',long:'투수',innings:Math.round(pd.length/15)},
      primaryInnings:Math.round(pd.length/15), totalInnings:Math.round(pd.length/15),
      team:wbdContext._playerTeam(n,'pitcher')
    });
  });

  Object.keys(byPos).forEach(pos=>{
    byPos[pos].sort((a,b)=>b.score-a.score);
    byPos[pos]=byPos[pos].slice(0,topN);
  });
  return byPos;
};

// Original index.html:34739
wbdContext.setBestLineupCriterion = function setBestLineupCriterion(c){window.bestLineupCriterion=c;wbdContext.renderInsightsPage();};

// Original index.html:34740
wbdContext.renderBestLineup = function renderBestLineup(){
  const criterion=window.bestLineupCriterion||'ovr';
  const pitcherMode=window.bestLineupPitcherMode||'pitcher';
  const byPos=wbdContext.calcBestLineup(criterion,3);
  const critLabel={ovr:'OVR 순',war:'WAR 순',combo:'종합 (OVR 70% + WAR 30%)'}[criterion];

  let html=`<div class="card section" style="background:linear-gradient(135deg,#0a1d14,#0a1828);border:1px solid #39ff8a;padding:18px">
    <div style="text-align:center">
      <div style="font-size:11px;color:#39ff8a;letter-spacing:3px;margin-bottom:4px">BEST POSITIONAL LINEUP</div>
      <div style="font-size:22px;font-weight:700">🏆 베스트 포지션 라인업</div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">각 포지션별 ${critLabel} 1위 선수로 구성된 드림팀</div>
    </div>
  </div>`;

  // 기준 전환 버튼
  html+='<div class="filter-row" style="margin-bottom:14px;justify-content:center">';
  ['ovr','war','combo'].forEach(c=>{
    const active=criterion===c?'background:var(--amber);color:#111;border-color:var(--amber)':'';
    const label={ovr:'⭐ OVR',war:'📊 WAR',combo:'🎯 종합'}[c];
    html+=`<button class="btn-secondary" onclick="setBestLineupCriterion('${c}')" style="font-size:12px;padding:6px 14px;${active}">${label}</button>`;
  });
  html+='</div>';

  // 야구장 다이아몬드 시각화 (SVG)
  const W=720, H=560;
  // 포지션별 좌표 (야구장 표준 위치)
  const posCoords={
    0:{x:W/2,     y:H*0.60, label:'투수'},      // P
    1:{x:W/2,     y:H*0.82, label:'포수'},      // C (홈플레이트)
    2:{x:W*0.82,  y:H*0.58, label:'1루수'},    // 1B
    3:{x:W*0.68,  y:H*0.30, label:'2루수'},    // 2B (1루/2루 사이)
    4:{x:W*0.18,  y:H*0.58, label:'3루수'},    // 3B
    5:{x:W*0.32,  y:H*0.30, label:'유격수'},   // SS (2루/3루 사이)
    6:{x:W*0.12,  y:H*0.15, label:'좌익수'},   // LF
    7:{x:W/2,     y:H*0.08, label:'중견수'},   // CF
    8:{x:W*0.88,  y:H*0.15, label:'우익수'}    // RF
  };

  let svg='';
  // 배경: 잔디
  svg+=`<defs>
    <radialGradient id="grass" cx="50%" cy="80%" r="100%">
      <stop offset="0%" stop-color="#2a5f3a"/>
      <stop offset="100%" stop-color="#0d2817"/>
    </radialGradient>
    <radialGradient id="infield" cx="50%" cy="90%" r="60%">
      <stop offset="0%" stop-color="#8b5a2b"/>
      <stop offset="100%" stop-color="#6b3f1e"/>
    </radialGradient>
  </defs>`;
  svg+=`<rect width="${W}" height="${H}" fill="url(#grass)"/>`;
  // 외야 펜스 (아치)
  svg+=`<path d="M 20,${H*0.85} Q ${W/2},${H*0.02} ${W-20},${H*0.85} Z" fill="url(#grass)" opacity="0.9"/>`;
  // 내야 (다이아몬드 주변 흙)
  const hx=W/2, hy=H*0.82; // 홈
  const f1x=W*0.78, f1y=H*0.55; // 1루
  const f2x=W/2, f2y=H*0.35; // 2루
  const f3x=W*0.22, f3y=H*0.55; // 3루
  svg+=`<polygon points="${hx},${hy} ${f1x},${f1y} ${f2x},${f2y} ${f3x},${f3y}" fill="url(#infield)" stroke="#d4a373" stroke-width="1.5"/>`;
  // 마운드
  svg+=`<circle cx="${W/2}" cy="${H*0.60}" r="22" fill="#a06a3a" stroke="#d4a373" stroke-width="1"/>`;
  // 투수판
  svg+=`<rect x="${W/2-8}" y="${H*0.60-2}" width="16" height="3" fill="#fff"/>`;
  // 베이스
  [[hx,hy],[f1x,f1y],[f2x,f2y],[f3x,f3y]].forEach(([x,y])=>{
    svg+=`<rect x="${x-6}" y="${y-6}" width="12" height="12" fill="#fff" stroke="#333" stroke-width="0.5" transform="rotate(45 ${x} ${y})"/>`;
  });

  // 각 포지션에 1위 선수 카드 표시
  Object.entries(posCoords).forEach(([pos,coord])=>{
    const list=byPos[pos];
    const top=list&&list[0];
    const col=wbdContext.POS_COLORS[+pos];
    if(!top){
      svg+=`<g>
        <circle cx="${coord.x}" cy="${coord.y}" r="22" fill="#1a1f2a" stroke="${col}" stroke-width="1.5" stroke-dasharray="3,2" opacity="0.5"/>
        <text x="${coord.x}" y="${coord.y+4}" font-size="10" fill="${col}" text-anchor="middle" font-weight="700" font-family="monospace">${wbdContext.POS_NAMES[+pos]}</text>
      </g>`;
      return;
    }
    const ovrCol=wbdContext.cardOvrColor(top.card.OVR);
    // 카드 배경
    const gotoFn=top.type==='pitcher'?'goToPitcher':'goToBatter';
    svg+=`<g style="cursor:pointer" onclick="${gotoFn}('${String(top.name).replace(/'/g,"\\'")}')">
      <rect x="${coord.x-52}" y="${coord.y-26}" width="104" height="56" rx="6" fill="#0a1828" stroke="${col}" stroke-width="2" opacity="0.95"/>
      <text x="${coord.x}" y="${coord.y-12}" font-size="9" fill="${col}" text-anchor="middle" font-weight="700" font-family="monospace" letter-spacing="1">${wbdContext.POS_NAMES[+pos]} · ${coord.label}</text>
      <text x="${coord.x}" y="${coord.y+3}" font-size="12" fill="#fff" text-anchor="middle" font-weight="700" font-family="sans-serif">${top.name.slice(0,10)}</text>
      <text x="${coord.x-34}" y="${coord.y+20}" font-size="13" fill="${ovrCol}" text-anchor="middle" font-weight="900" font-family="monospace">${top.card.OVR}</text>
      <text x="${coord.x-34}" y="${coord.y+28}" font-size="7" fill="#8896ad" text-anchor="middle" font-family="monospace">OVR</text>
      <text x="${coord.x+2}" y="${coord.y+20}" font-size="12" fill="var(--amber)" text-anchor="middle" font-weight="700" font-family="monospace">${top.war.toFixed(2)}</text>
      <text x="${coord.x+2}" y="${coord.y+28}" font-size="7" fill="#8896ad" text-anchor="middle" font-family="monospace">WAR</text>
      <text x="${coord.x+34}" y="${coord.y+20}" font-size="11" fill="#39ff8a" text-anchor="middle" font-weight="700" font-family="monospace">${top.primaryInnings}</text>
      <text x="${coord.x+34}" y="${coord.y+28}" font-size="7" fill="#8896ad" text-anchor="middle" font-family="monospace">이닝</text>
    </g>`;
  });

  html+=`<div class="card section" style="padding:16px;background:#050c18">
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin:0 auto">${svg}</svg>
  </div>`;

  // DH 별도 카드
  const dhTop=byPos[9]&&byPos[9][0];
  if(dhTop){
    const ovrCol=wbdContext.cardOvrColor(dhTop.card.OVR);
    html+=`<div class="card section" onclick="goToBatter('${String(dhTop.name).replace(/'/g,"\\'")}')" style="cursor:pointer;border:2px solid ${wbdContext.POS_COLORS[9]};padding:14px">
      <div style="display:flex;align-items:center;gap:14px">
        <div style="width:48px;height:48px;background:${wbdContext.POS_COLORS[9]}22;border:2px solid ${wbdContext.POS_COLORS[9]};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;color:${wbdContext.POS_COLORS[9]};font-weight:900;font-family:var(--mono)">DH</div>
        <div style="flex:1">
          <div style="font-size:11px;color:${wbdContext.POS_COLORS[9]};letter-spacing:1px;margin-bottom:2px">지명타자 · 베스트</div>
          <div style="font-size:18px;font-weight:700">${dhTop.name}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${dhTop.team}</div>
        </div>
        <div style="text-align:center"><div style="font-size:9px;color:var(--muted)">OVR</div><div style="font-family:var(--mono);color:${ovrCol};font-weight:900;font-size:20px">${dhTop.card.OVR}</div></div>
        <div style="text-align:center"><div style="font-size:9px;color:var(--muted)">WAR</div><div style="font-family:var(--mono);color:var(--amber);font-weight:700;font-size:18px">${dhTop.war.toFixed(2)}</div></div>
        <div style="text-align:center"><div style="font-size:9px;color:var(--muted)">이닝</div><div style="font-family:var(--mono);color:#39ff8a;font-weight:700;font-size:18px">${dhTop.primaryInnings}</div></div>
      </div>
    </div>`;
  }

  // 포지션별 Top 3 상세 테이블 (정렬 가능)
  html+='<div class="card section"><div class="card-title">📋 포지션별 Top 3 (주전 경쟁)</div>';
  html+=`<div style="font-size:11px;color:var(--muted);margin-bottom:10px;padding:6px 10px;background:var(--card2);border-radius:4px">💡 컬럼명 클릭 → 정렬 (▼내림차순 ▲오름차순 — 원래대로). 투수 WAR은 <b style="color:#88ccff">${pitcherMode==='batter'?'타자 WAR':pitcherMode==='total'?'투타 합산 WAR':'투수 WAR'}</b> 기준 (위 ⚾ 토글로 변경)</div>`;
  
  const sortKey=window.bestTop3SortKey||null;
  const sortDir=window.bestTop3SortDir||0;  // 0:default, 1:desc, -1:asc
  const sortHeader=(key,label)=>{
    const isActive=sortKey===key;
    const arrow=!isActive?'':sortDir===1?' ▼':sortDir===-1?' ▲':'';
    const color=isActive?'color:var(--amber);font-weight:700':'';
    return `<th onclick="_top3Sort('${key}')" style="cursor:pointer;user-select:none;${color}" title="클릭하여 정렬">${label}${arrow}</th>`;
  };
  html+=`<div class="tbl-wrap"><table class="data-table"><thead><tr>
    ${sortHeader('pos','포지션')}
    <th>#</th>
    ${sortHeader('name','이름')}
    ${sortHeader('team','팀')}
    ${sortHeader('ovr','OVR')}
    ${sortHeader('war','WAR')}
    ${sortHeader('innings','이닝')}
  </tr></thead><tbody>`;
  
  // 정렬 적용
  let allRows=[];
  [0,1,2,3,4,5,6,7,8,9].forEach(pos=>{
    const list=byPos[pos]||[];
    list.forEach((p,i)=>{
      allRows.push({...p, _pos:pos, _rank:i+1});
    });
  });
  if(sortKey&&sortDir!==0){
    const getVal=(r)=>{
      if(sortKey==='pos')return r._pos;
      if(sortKey==='name')return r.name;
      if(sortKey==='team')return r.team||'';
      if(sortKey==='ovr')return r.card.OVR;
      if(sortKey==='war')return r.war;
      if(sortKey==='innings')return r.primaryInnings;
      return 0;
    };
    allRows.sort((a,b)=>{
      const va=getVal(a), vb=getVal(b);
      if(typeof va==='string')return sortDir*va.localeCompare(vb);
      return sortDir*(vb-va);
    });
  }
  
  allRows.forEach(p=>{
    const pos=p._pos;
    const col=wbdContext.POS_COLORS[pos];
    const ovrCol=wbdContext.cardOvrColor(p.card.OVR);
    const rank=p._rank;
    const rankIcon=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const gotoFn=p.type==='pitcher'?'goToPitcher':'goToBatter';
    // 정렬 모드면 매 row 포지션 표시, 기본 모드면 1위에만
    const showPos=sortDir!==0||rank===1;
    // 투수면 WAR 출처 표시
    const warTooltip=p.type==='pitcher'
      ?`title="${pitcherMode==='batter'?'타자 WAR':pitcherMode==='total'?`P:${p.pWar.toFixed(2)} + B:${p.bWar.toFixed(2)} 합산`:'투수 WAR'}"`
      :'';
    html+=`<tr onclick="${gotoFn}('${String(p.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${showPos?`<div style="display:inline-flex;align-items:center;gap:4px"><span style="width:22px;height:22px;background:${col}22;border:1.5px solid ${col};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:9px;color:${col};font-weight:900;font-family:var(--mono)">${wbdContext.POS_NAMES[pos]}</span><span style="font-size:10px;color:var(--muted)">${wbdContext.POS_LONG[pos]}</span></div>`:''}</td>
      <td style="text-align:center">${rankIcon}</td>
      <td style="font-weight:600">${p.name}</td>
      <td style="color:var(--muted);font-size:11px">${p.team}</td>
      <td style="font-family:var(--mono);color:${ovrCol};font-weight:700">${p.card.OVR}</td>
      <td ${warTooltip} style="font-family:var(--mono);color:var(--amber);font-weight:700">${p.war.toFixed(2)}</td>
      <td style="font-family:var(--mono);color:#39ff8a">${p.primaryInnings}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  return html;
};

// Original index.html:34935
wbdContext._top3Sort = function _top3Sort(key){
  if(window.bestTop3SortKey!==key){
    window.bestTop3SortKey=key;
    window.bestTop3SortDir=1;  // 내림차순부터
  } else {
    if(window.bestTop3SortDir===1) window.bestTop3SortDir=-1;
    else if(window.bestTop3SortDir===-1){ window.bestTop3SortKey=null; window.bestTop3SortDir=0; }
    else window.bestTop3SortDir=1;
  }
  wbdContext.renderInsightsPage();
};

// Original index.html:34948
wbdContext.renderRecentForm = function renderRecentForm(){
  if(wbdContext.GAMES.length===0||wbdContext.G.length===0)return '<div style="padding:40px;text-align:center;color:var(--muted)">활성화된 경기가 없어요</div>';
  
  // 활성 경기를 날짜순 (최신이 마지막)
  const gamesWithDate=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).map(g=>{
    const info=wbdContext._parseGameName(g.name);
    return {g,info,date:info.date||''};
  }).sort((a,b)=>a.date.localeCompare(b.date));
  
  if(gamesWithDate.length<3)return '<div style="padding:40px;text-align:center;color:var(--muted)">최근 폼 분석에는 최소 3경기 이상 필요해요</div>';
  
  const recentN=window.recentFormN||5;
  const recentGames=gamesWithDate.slice(-recentN);
  const recentGameIds=new Set(recentGames.map(x=>x.g.id));
  
  // 최근 경기 pitches 수집
  const recentPitches=[];
  recentGames.forEach(({g})=>{
    g.pitches.forEach(p=>recentPitches.push(p));
  });
  
  function batterStats(pitches){
    const all=pitches;
    const bd=all.filter(wbdContext._isInPlay);
    const bdQ=bd.filter(d=>!wbdContext._isBunt(d));
    if(bd.length===0)return null;
    // 표준 BA (AB = 인플레이 + K)
    const hits = all.filter(wbdContext._isHit).length;
    const hrs = all.filter(d => +d.result===4).length;
    const ab = all.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const ba = ab > 0 ? hits/ab : 0;
    const avgEV=bdQ.length?bdQ.reduce((a,b)=>a+(+b.ev),0)/bdQ.length:0;
    const hh=bdQ.length?bdQ.filter(d=>wbdContext._isHardHit(d)).length/bdQ.length*100:0;
    const sw=all.filter(d=>d.bSwing).length;
    const wh=all.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    const whiffPct=sw?wh/sw*100:0;
    const oz=all.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
    const ozSw=oz.filter(d=>d.bSwing).length;
    const chasePct=oz.length?ozSw/oz.length*100:0;
    const bb=all.filter(d=>d.result===5).length;
    const paEnd=wbdContext._countPaEnd(all);
    const bbPct=paEnd.length?bb/paEnd.length*100:0;
    return {n:bd.length,pa:paEnd.length,ba,hrs,avgEV,hh,whiffPct,chasePct,bbPct};
  }
  
  function pitcherStats(pitches){
    const pd=pitches;
    const bd=pd.filter(wbdContext._isInPlay);
    const bdQ=bd.filter(d=>!wbdContext._isBunt(d));
    if(pd.length<3)return null;
    // 표준 피안타율 (AB = 인플레이 + K)
    const hits = pd.filter(wbdContext._isHit).length;
    const hrs = pd.filter(d => +d.result===4).length;
    const ab = pd.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const ba = ab > 0 ? hits/ab : 0;
    const ks=pd.filter(d=>wbdContext._isK(d)).length;
    const bb=pd.filter(d=>d.result===5).length;
    const paEnd=wbdContext._countPaEnd(pd);
    const kPct=paEnd.length?ks/paEnd.length*100:0;
    const bbPct=paEnd.length?bb/paEnd.length*100:0;
    const fbSpds=pd.filter(d=>d.spdK>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    const avgFb=fbSpds.length?fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length:0;
    const maxFb=fbSpds.length?Math.max(...fbSpds):0;
    const sw=pd.filter(d=>d.bSwing).length;
    const wh=pd.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    const whiffPct=sw?wh/sw*100:0;
    const avgEv=bdQ.length?bdQ.reduce((a,b)=>a+(+b.ev),0)/bdQ.length:0;
    // 제구: 실투율 (정중앙 ±0.4)
    const inZ=pd.filter(d=>d.zoneX!=null&&Math.abs(+d.zoneX)<=1&&Math.abs(+d.zoneY||0)<=1);
    const mistake=inZ.filter(d=>{const r=Math.max(Math.abs(+d.zoneX||0),Math.abs(+d.zoneY||0));return r<=0.4;}).length;
    const mistakePct=inZ.length?mistake/inZ.length*100:0;
    // 보더라인% (존 외곽)
    const border=pd.filter(d=>{
      if(d.zoneX==null)return false;
      const r=Math.max(Math.abs(+d.zoneX||0),Math.abs(+d.zoneY||0));
      return r>=0.85 && r<=1.15;
    }).length;
    const borderPct=pd.length?border/pd.length*100:0;
    // 체이스 유도%
    const oz=pd.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+d.zoneY||0)>1));
    const ozSw=oz.filter(d=>d.bSwing).length;
    const chasePct=oz.length?ozSw/oz.length*100:0;
    return {n:pd.length,pa:paEnd.length,ba,hrs,kPct,bbPct,avgFb,maxFb,whiffPct,avgEv,mistakePct,borderPct,chasePct};
  }
  
  // 타자별 최근 vs 시즌
  const batterRows=[];
  const batterNames=(window._cache.batterNames||[]).slice();
  batterNames.forEach(name=>{
    const seasonAll=wbdContext.getBatterDataByName(name);
    const recentAll=recentPitches.filter(d=>String(d.bName)===String(name));
    const seasonStats=batterStats(seasonAll);
    const recentStats=batterStats(recentAll);
    if(!seasonStats||!recentStats||recentStats.n<3||seasonStats.n<10)return;
    batterRows.push({name,season:seasonStats,recent:recentStats});
  });
  
  // 투수별
  const pitcherRows=[];
  const pitcherNames=(window._cache.pitcherNames||[]).slice();
  
  // 시즌 ERA/WHIP/IP 계산 (활성 게임 전체) - 캐싱 사용
  const seasonEra={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const gs=wbdContext._getCachedPitcherStats(g.id);
    if(!gs)return;
    Object.entries(gs).forEach(([pn,s])=>{
      if(!seasonEra[pn])seasonEra[pn]={outs:0,runs:0,hits:0,bbs:0};
      seasonEra[pn].outs+=s.outs;seasonEra[pn].runs+=s.runs;
      seasonEra[pn].hits+=s.hits;seasonEra[pn].bbs+=s.bbs;
    });
  });
  // 최근 ERA/WHIP/IP (recent 게임 한정) - 캐싱 사용
  const recentEra={};
  recentGames.forEach(({g})=>{
    const gs=wbdContext._getCachedPitcherStats(g.id);
    if(!gs)return;
    Object.entries(gs).forEach(([pn,s])=>{
      if(!recentEra[pn])recentEra[pn]={outs:0,runs:0,hits:0,bbs:0};
      recentEra[pn].outs+=s.outs;recentEra[pn].runs+=s.runs;
      recentEra[pn].hits+=s.hits;recentEra[pn].bbs+=s.bbs;
    });
  });
  
  pitcherNames.forEach(name=>{
    const seasonAll=wbdContext.getPitcherDataByName(name);
    const recentAll=recentPitches.filter(d=>String(d.pName)===String(name));
    const seasonStats=pitcherStats(seasonAll);
    const recentStats=pitcherStats(recentAll);
    if(!seasonStats||!recentStats||recentStats.n<10||seasonStats.n<30)return;
    // ERA 데이터 추가
    const sEra=seasonEra[name];
    const rEra=recentEra[name];
    if(sEra && sEra.outs>=9){
      const sIp=sEra.outs/3, rIp=rEra?rEra.outs/3:0;
      seasonStats.era=sIp>0?sEra.runs/sIp*9:0;
      seasonStats.whip=sIp>0?(sEra.hits+sEra.bbs)/sIp:0;
      seasonStats.ip=sIp;
      recentStats.era=rIp>0?rEra.runs/rIp*9:0;
      recentStats.whip=rIp>0?(rEra.hits+rEra.bbs)/rIp:0;
      recentStats.ip=rIp;
    }
    pitcherRows.push({name,season:seasonStats,recent:recentStats});
  });
  
  let html=`<div class="card section">
    <div class="card-title">🔥 최근 ${recentN}경기 폼 분석</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px">
      활성 경기 ${gamesWithDate.length}개 중 가장 최근 ${recentGames.length}경기 vs 시즌 전체 비교
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
      <span style="font-size:12px;color:var(--muted)">분석 경기수:</span>`;
  [3,5,7,10].forEach(n=>{
    html+=`<button class="stab${recentN===n?' active':''}" onclick="window.recentFormN=${n};renderInsightsPage()">최근 ${n}경기</button>`;
  });
  html+=`</div></div>`;
  
  const arrow=(d,thresh)=>{
    if(d>thresh)return '<span style="color:#39ff8a">▲</span>';
    if(d<-thresh)return '<span style="color:#ff4560">▼</span>';
    return '<span style="color:var(--muted)">─</span>';
  };
  const sign=v=>(v>=0?'+':'')+v.toFixed(1);
  const sign3=v=>(v>=0?'+':'')+v.toFixed(3).replace(/^(\+|-)?0/,'$1');
  
  // 1. 폼 상승 타자
  const batterUp=batterRows.map(r=>({...r,baD:r.recent.ba-r.season.ba}))
    .filter(r=>r.baD>0.05).sort((a,b)=>b.baD-a.baD).slice(0,10);
  
  if(batterUp.length>0){
    html+=`<div class="card section"><div class="card-title">🔥 폼 상승 타자 Top ${batterUp.length}</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 BA</th><th>최근 BA</th><th>변화</th>
      <th>시즌 EV</th><th>최근 EV</th><th>시즌 헛스윙%</th><th>최근 헛스윙%</th><th>최근 HR</th>
      </tr></thead><tbody>`;
    batterUp.forEach(r=>{
      const evD=r.recent.avgEV-r.season.avgEV;
      const whD=r.recent.whiffPct-r.season.whiffPct;
      html+=`<tr onclick="goToBatter('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono)">${r.season.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${r.recent.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${sign3(r.baD)} ${arrow(r.baD,0.001)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.avgEV.toFixed(1)}</td>
        <td style="font-family:var(--mono)">${r.recent.avgEV.toFixed(1)} ${arrow(evD,1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.whiffPct.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:${whD<0?'#39ff8a':'#ff4560'}">${r.recent.whiffPct.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:#ffd700">${r.recent.hrs}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 2. 폼 하락 타자
  const batterDown=batterRows.map(r=>({...r,baD:r.recent.ba-r.season.ba}))
    .filter(r=>r.baD<-0.05).sort((a,b)=>a.baD-b.baD).slice(0,10);
  
  if(batterDown.length>0){
    html+=`<div class="card section"><div class="card-title">❄️ 폼 하락 타자 Top ${batterDown.length}</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 BA</th><th>최근 BA</th><th>변화</th>
      <th>시즌 EV</th><th>최근 EV</th><th>시즌 헛스윙%</th><th>최근 헛스윙%</th>
      </tr></thead><tbody>`;
    batterDown.forEach(r=>{
      const evD=r.recent.avgEV-r.season.avgEV;
      const whD=r.recent.whiffPct-r.season.whiffPct;
      html+=`<tr onclick="goToBatter('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono)">${r.season.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:#ff4560;font-weight:700">${r.recent.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:#ff4560;font-weight:700">${sign3(r.baD)} ${arrow(r.baD,0.001)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.avgEV.toFixed(1)}</td>
        <td style="font-family:var(--mono)">${r.recent.avgEV.toFixed(1)} ${arrow(evD,1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.whiffPct.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:${whD>0?'#ff4560':'#39ff8a'}">${r.recent.whiffPct.toFixed(0)}%</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 3. 선구안 개선
  const eyeUp=batterRows.map(r=>({...r,chD:r.recent.chasePct-r.season.chasePct,bbD:r.recent.bbPct-r.season.bbPct}))
    .filter(r=>r.chD<-3||r.bbD>1).sort((a,b)=>(b.bbD-b.chD)-(a.bbD-a.chD)).slice(0,8);
  
  if(eyeUp.length>0){
    html+=`<div class="card section"><div class="card-title">👁️ 선구안 개선 타자</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 체이스%</th><th>최근 체이스%</th><th>시즌 BB%</th><th>최근 BB%</th>
      </tr></thead><tbody>`;
    eyeUp.forEach(r=>{
      html+=`<tr onclick="goToBatter('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.chasePct.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:${r.chD<0?'#39ff8a':'#ff4560'}">${r.recent.chasePct.toFixed(0)}% ${arrow(-r.chD,1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.bbPct.toFixed(1)}%</td>
        <td style="font-family:var(--mono);color:${r.bbD>0?'#39ff8a':'var(--muted)'}">${r.recent.bbPct.toFixed(1)}% ${arrow(r.bbD,0.5)}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 4. 파워 상승
  const pwrUp=batterRows.map(r=>({...r,evD:r.recent.avgEV-r.season.avgEV,hhD:r.recent.hh-r.season.hh}))
    .filter(r=>r.evD>2&&r.hhD>3).sort((a,b)=>(b.evD+b.hhD)-(a.evD+a.hhD)).slice(0,8);
  
  if(pwrUp.length>0){
    html+=`<div class="card section"><div class="card-title">💪 파워 상승 타자</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 EV</th><th>최근 EV</th><th>시즌 HH%</th><th>최근 HH%</th><th>최근 HR</th>
      </tr></thead><tbody>`;
    pwrUp.forEach(r=>{
      html+=`<tr onclick="goToBatter('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.avgEV.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:#ff8800;font-weight:700">${r.recent.avgEV.toFixed(1)} ${arrow(r.evD,0.1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.hh.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:#ff4560">${r.recent.hh.toFixed(0)}% ${arrow(r.hhD,0.1)}</td>
        <td style="font-family:var(--mono);color:#ffd700">${r.recent.hrs}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 5. 호조 투수
  const pitcherUp=pitcherRows.map(r=>({...r,baD:r.recent.ba-r.season.ba,kD:r.recent.kPct-r.season.kPct}))
    .filter(r=>r.baD<-0.03||r.kD>3).sort((a,b)=>(a.baD-b.baD)+(b.kD-a.kD)).slice(0,8);
  
  if(pitcherUp.length>0){
    html+=`<div class="card section"><div class="card-title">🔥 호조 투수</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 피BA</th><th>최근 피BA</th><th>시즌 K%</th><th>최근 K%</th>
      <th>시즌 직구</th><th>최근 직구</th><th>최근 헛스윙%</th>
      </tr></thead><tbody>`;
    pitcherUp.forEach(r=>{
      const fbD=r.recent.avgFb-r.season.avgFb;
      const whD=r.recent.whiffPct-r.season.whiffPct;
      html+=`<tr onclick="goToPitcher('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:${r.baD<0?'#39ff8a':'#ff4560'};font-weight:700">${r.recent.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.kPct.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:${r.kD>0?'#39ff8a':'#ff4560'}">${r.recent.kPct.toFixed(0)}% ${arrow(r.kD,0.1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.avgFb.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:#ff8800">${r.recent.avgFb.toFixed(1)} ${arrow(fbD,0.1)}</td>
        <td style="font-family:var(--mono)">${r.recent.whiffPct.toFixed(0)}% ${arrow(whD,0.1)}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // ERA 향상 / 악화 투수 (ERA 데이터 있는 투수만)
  const eraData=pitcherRows.filter(r=>r.season.era!=null && r.recent.era!=null && r.season.ip>=3 && r.recent.ip>=1);
  const eraImproved=eraData.map(r=>({...r,eraD:r.recent.era-r.season.era,whipD:r.recent.whip-r.season.whip}))
    .filter(r=>r.eraD<-0.5).sort((a,b)=>a.eraD-b.eraD).slice(0,6);
  if(eraImproved.length>0){
    html+=`<div class="card section"><div class="card-title">🛡️ ERA 향상 투수</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 ERA</th><th>최근 ERA</th><th>변화</th>
      <th>시즌 WHIP</th><th>최근 WHIP</th><th>최근 IP</th>
      </tr></thead><tbody>`;
    eraImproved.forEach(r=>{
      const ipDisp=Math.floor(r.recent.ip)+'.'+(Math.round((r.recent.ip%1)*3));
      html+=`<tr onclick="goToPitcher('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.era.toFixed(2)}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${r.recent.era.toFixed(2)}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${r.eraD.toFixed(2)} ${arrow(-r.eraD,0.1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.whip.toFixed(2)}</td>
        <td style="font-family:var(--mono);color:${r.whipD<0?'#39ff8a':'#ff8800'}">${r.recent.whip.toFixed(2)} ${arrow(-r.whipD,0.05)}</td>
        <td style="font-family:var(--mono)">${ipDisp}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 7. 구속 상승/하락 투수
  const velChanged=pitcherRows.map(r=>({...r,fbD:r.recent.avgFb-r.season.avgFb}))
    .filter(r=>Math.abs(r.fbD)>=1.5 && r.season.avgFb>0 && r.recent.avgFb>0)
    .sort((a,b)=>Math.abs(b.fbD)-Math.abs(a.fbD)).slice(0,8);
  if(velChanged.length>0){
    html+=`<div class="card section"><div class="card-title">⚡ 구속 변화 투수</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 평균직구</th><th>최근 평균직구</th><th>변화</th><th>최근 최고구속</th>
      </tr></thead><tbody>`;
    velChanged.forEach(r=>{
      const col=r.fbD>0?'#39ff8a':'#ff4560';
      html+=`<tr onclick="goToPitcher('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.avgFb.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:${col};font-weight:700">${r.recent.avgFb.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:${col};font-weight:700">${r.fbD>0?'+':''}${r.fbD.toFixed(1)} ${arrow(r.fbD,0.1)}</td>
        <td style="font-family:var(--mono);color:#ffcc44">${r.recent.maxFb||'-'}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 8. 제구 변화 투수 (실투율 + BB%)
  const cmdChanged=pitcherRows.map(r=>({...r,mD:r.recent.mistakePct-r.season.mistakePct,bbD:r.recent.bbPct-r.season.bbPct}))
    .filter(r=>Math.abs(r.mD)>=1.5 || Math.abs(r.bbD)>=1.5)
    .sort((a,b)=>(Math.abs(b.mD)+Math.abs(b.bbD))-(Math.abs(a.mD)+Math.abs(a.bbD))).slice(0,8);
  if(cmdChanged.length>0){
    html+=`<div class="card section"><div class="card-title">🎯 제구 변화 투수</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 실투율</th><th>최근 실투율</th><th>시즌 BB%</th><th>최근 BB%</th><th>최근 보더%</th>
      </tr></thead><tbody>`;
    cmdChanged.forEach(r=>{
      const mCol=r.mD<0?'#39ff8a':'#ff4560';
      const bbCol=r.bbD<0?'#39ff8a':'#ff4560';
      html+=`<tr onclick="goToPitcher('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.mistakePct.toFixed(1)}%</td>
        <td style="font-family:var(--mono);color:${mCol};font-weight:700">${r.recent.mistakePct.toFixed(1)}% ${arrow(-r.mD,0.1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.bbPct.toFixed(1)}%</td>
        <td style="font-family:var(--mono);color:${bbCol};font-weight:700">${r.recent.bbPct.toFixed(1)}% ${arrow(-r.bbD,0.1)}</td>
        <td style="font-family:var(--mono);color:#88ccff">${r.recent.borderPct.toFixed(1)}%</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 6. 부진 투수
  const pitcherDown=pitcherRows.map(r=>({...r,baD:r.recent.ba-r.season.ba,kD:r.recent.kPct-r.season.kPct}))
    .filter(r=>r.baD>0.04).sort((a,b)=>b.baD-a.baD).slice(0,8);
  
  if(pitcherDown.length>0){
    html+=`<div class="card section"><div class="card-title">❄️ 부진 투수</div>
      <div class="tbl-wrap"><table class="data-table"><thead><tr>
      <th>이름</th><th>시즌 피BA</th><th>최근 피BA</th><th>시즌 K%</th><th>최근 K%</th>
      <th>시즌 피EV</th><th>최근 피EV</th><th>시즌 BB%</th><th>최근 BB%</th>
      </tr></thead><tbody>`;
    pitcherDown.forEach(r=>{
      const evD=r.recent.avgEv-r.season.avgEv;
      const bbD=r.recent.bbPct-r.season.bbPct;
      html+=`<tr onclick="goToPitcher('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td style="font-weight:600">${r.name}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:#ff4560;font-weight:700">${r.recent.ba.toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.kPct.toFixed(0)}%</td>
        <td style="font-family:var(--mono);color:${r.kD<0?'#ff4560':'var(--text)'}">${r.recent.kPct.toFixed(0)}% ${arrow(r.kD,0.1)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.avgEv.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:${evD>0?'#ff4560':'var(--text)'}">${r.recent.avgEv.toFixed(1)} ${arrow(evD,0.5)}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.season.bbPct.toFixed(1)}%</td>
        <td style="font-family:var(--mono);color:${bbD>0?'#ff4560':'var(--text)'}">${r.recent.bbPct.toFixed(1)}% ${arrow(bbD,0.5)}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  if(batterUp.length===0&&batterDown.length===0&&pitcherUp.length===0&&pitcherDown.length===0){
    html+='<div style="padding:40px;text-align:center;color:var(--muted)">최근 폼 변화가 두드러진 선수가 없어요</div>';
  }
  
  return html;
};
}

export function initialize(wbdContext) {
// Original index.html:34738
window.bestLineupCriterion=window.bestLineupCriterion||'combo';
}
