/** comparison-awards: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:13560
wbdContext.computeBadges = function computeBadges(card){
  const badges=[];
  const s=card.stats;
  if(card.type==='pitcher'){
    if(s.구속>=95)badges.push({icon:'⚡',name:'파이어볼러',desc:'빠른 구속',color:'#ff8800'});
    if(s.탈삼진>=90)badges.push({icon:'🔥',name:'삼진왕',desc:'K% 최상위',color:'#ff4560'});
    if(s.제구>=90)badges.push({icon:'🎯',name:'제구의 장인',desc:'보더라인 제구 일품',color:'#39ff8a'});
    if(s.구위>=90)badges.push({icon:'💎',name:'구위 마스터',desc:'피안타 억제',color:'#9c27b0'});
    if(s.구변>=90)badges.push({icon:'🌀',name:'변화구 아티스트',desc:'무브먼트 최상',color:'#2196f3'});
    if(s.구종>=90)badges.push({icon:'🎭',name:'멀티레인지',desc:'다양한 구종 구사',color:'#f5a623'});
    if(s.안정성>=90)badges.push({icon:'📏',name:'한결같은 팔',desc:'구속 편차 극소',color:'#cc44ff'});
    if(card.OVR>=90)badges.push({icon:'👑',name:'에이스',desc:'종합 OVR 최상위',color:'#ffd700'});
  } else {
    if(s.파워>=95)badges.push({icon:'💥',name:'거포',desc:'타구 파워 최상',color:'#ff8800'});
    if(s.갭파워>=90)badges.push({icon:'💪',name:'갭파워',desc:'강타구 머신',color:'#ff6b8a'});
    if(s.컨택>=90)badges.push({icon:'🎯',name:'컨택 달인',desc:'정타 + 헛스윙 회피',color:'#39ff8a'});
    if(s.선구>=90)badges.push({icon:'👁️',name:'선구안의 신',desc:'볼/스트라이크 구분 마스터',color:'#2196f3'});
    if(s.장타력>=95)badges.push({icon:'🚀',name:'슬러거',desc:'장타율 최상',color:'#ff4560'});
    if(s.스윗스팟>=90)badges.push({icon:'🎪',name:'배럴 머신',desc:'배트 중심 타격',color:'#cc44ff'});
    if(card.OVR>=90)badges.push({icon:'👑',name:'MVP급',desc:'종합 OVR 최상위',color:'#ffd700'});
    // 번트 전문가 뱃지
    const ex=card.extras;
    if(ex){
      if(ex.buntTry>=5 && ex.buntRate>=50)badges.push({icon:'🎋',name:'번트 마스터',desc:`${ex.buntTry}회 시도 · 성공률 ${ex.buntRate.toFixed(0)}%`,color:'#88ccaa'});
      else if(ex.buntTry>=5)badges.push({icon:'🎋',name:'번트 전문가',desc:`${ex.buntTry}회 시도 (리그 최다 수준)`,color:'#66aa88'});
      else if(ex.buntHits>=3 && ex.buntRate>=70)badges.push({icon:'🎋',name:'번트 히터',desc:`번트 안타 ${ex.buntHits}개 (${ex.buntRate.toFixed(0)}%)`,color:'#88cc66'});
    }
  }
  return badges;
};

// Original index.html:13590
wbdContext.renderBadges = function renderBadges(badges){
  if(!badges||!badges.length)return '';
  return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;justify-content:center">'+badges.map(b=>
    `<div title="${b.desc}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:${b.color}22;border:1px solid ${b.color};color:${b.color};border-radius:12px;font-size:10px;font-weight:600;font-family:var(--cond)"><span style="font-size:12px">${b.icon}</span>${b.name}</div>`
  ).join('')+'</div>';
};

// Original index.html:13598
wbdContext.renderComparePage = function renderComparePage(){
  const type=document.getElementById('cmp-type').value;
  const sel1=document.getElementById('cmp-p1');
  const sel2=document.getElementById('cmp-p2');
  if(!sel1||!sel2)return;

  // 선수 목록
  const names=type==='pitcher'
    ?(window._cache.pitcherNames||[]).slice()
    :(window._cache.batterNames||[]).slice();
  names.sort();

  const prev1=sel1.value, prev2=sel2.value;
  sel1.innerHTML='<option value="">— 선택 —</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join('');
  sel2.innerHTML='<option value="">— 선택 —</option>'+names.map(n=>`<option value="${n}">${n}</option>`).join('');
  if(prev1&&names.includes(prev1))sel1.value=prev1;
  if(prev2&&names.includes(prev2))sel2.value=prev2;

  const el=document.getElementById('compare-content');
  const p1=sel1.value, p2=sel2.value;
  if(!p1||!p2){
    el.innerHTML='<div class="card section" style="padding:40px;text-align:center;color:var(--muted)">두 선수를 선택하세요</div>';
    return;
  }

  const c1=type==='pitcher'?wbdContext.calcPitcherCard(p1):wbdContext.calcBatterCard(p1);
  const c2=type==='pitcher'?wbdContext.calcPitcherCard(p2):wbdContext.calcBatterCard(p2);
  const team1=wbdContext._playerTeam(p1,type);
  const team2=wbdContext._playerTeam(p2,type);
  const b1=wbdContext.computeBadges(c1), b2=wbdContext.computeBadges(c2);

  // 오버레이 레이더
  const keys=Object.keys(c1.stats);
  const radar=wbdContext._makeOverlayRadar([{stats:c1.stats,color:'#ff9900',name:p1},{stats:c2.stats,color:'#44aaff',name:p2}],420);

  let html='<div class="grid2 section">';
  // Left card
  html+=`<div class="card" style="border:2px solid #ff9900;text-align:center">
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">${type==='pitcher'?'투수':'타자'}</div>
    <div style="font-size:22px;font-weight:700;color:#ff9900;margin-bottom:4px">${p1}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">${team1}</div>
    <div style="font-size:48px;font-family:var(--mono);color:${wbdContext.cardOvrColor(c1.OVR)};font-weight:700">${c1.OVR}</div>
    <div style="font-size:11px;color:var(--muted)">OVR</div>
    ${wbdContext.renderBadges(b1)}
  </div>`;
  // Right card
  html+=`<div class="card" style="border:2px solid #44aaff;text-align:center">
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">${type==='pitcher'?'투수':'타자'}</div>
    <div style="font-size:22px;font-weight:700;color:#44aaff;margin-bottom:4px">${p2}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">${team2}</div>
    <div style="font-size:48px;font-family:var(--mono);color:${wbdContext.cardOvrColor(c2.OVR)};font-weight:700">${c2.OVR}</div>
    <div style="font-size:11px;color:var(--muted)">OVR</div>
    ${wbdContext.renderBadges(b2)}
  </div>`;
  html+='</div>';

  // 레이더 차트
  html+='<div class="card section"><div class="card-title">📊 능력치 오버레이 비교</div>';
  html+='<div style="display:flex;justify-content:center;align-items:center;gap:40px;flex-wrap:wrap">';
  html+='<div style="text-align:center">'+radar+'</div>';
  // 범례 + 스탯 표
  html+='<div style="min-width:280px">';
  html+=`<div style="display:flex;gap:16px;margin-bottom:14px;font-size:12px">
    <div><span style="display:inline-block;width:10px;height:10px;background:#ff9900;border-radius:50%;margin-right:6px"></span>${p1}</div>
    <div><span style="display:inline-block;width:10px;height:10px;background:#44aaff;border-radius:50%;margin-right:6px"></span>${p2}</div>
  </div>`;
  html+='<table class="data-table" style="font-size:12px"><thead><tr><th>스탯</th><th style="color:#ff9900">'+p1+'</th><th></th><th style="color:#44aaff">'+p2+'</th></tr></thead><tbody>';
  keys.forEach(k=>{
    const v1=c1.stats[k], v2=c2.stats[k];
    const diff=v1-v2;
    const winArrow=diff>0?'◀':diff<0?'▶':'=';
    const winColor=diff>0?'#ff9900':diff<0?'#44aaff':'var(--muted)';
    html+=`<tr>
      <td style="color:var(--muted)">${k}</td>
      <td style="font-family:var(--mono);color:${wbdContext.statColor(v1)};font-weight:700;text-align:right">${v1}</td>
      <td style="color:${winColor};text-align:center;font-size:11px">${winArrow}${Math.abs(diff)||''}</td>
      <td style="font-family:var(--mono);color:${wbdContext.statColor(v2)};font-weight:700">${v2}</td>
    </tr>`;
  });
  html+=`<tr style="border-top:2px solid var(--border)">
    <td style="font-weight:700">OVR</td>
    <td style="font-family:var(--mono);color:${wbdContext.cardOvrColor(c1.OVR)};font-weight:700;text-align:right;font-size:14px">${c1.OVR}</td>
    <td style="text-align:center;font-size:11px">${c1.OVR>c2.OVR?'◀':c1.OVR<c2.OVR?'▶':'='}</td>
    <td style="font-family:var(--mono);color:${wbdContext.cardOvrColor(c2.OVR)};font-weight:700;font-size:14px">${c2.OVR}</td>
  </tr>`;
  html+='</tbody></table>';
  html+='</div></div></div>';

  el.innerHTML=html;
};

// Original index.html:13689
wbdContext._makeOverlayRadar = function _makeOverlayRadar(series,W){
  const keys=Object.keys(series[0].stats);
  const N=keys.length, CX=W/2, CY=W/2, R=W/2-40;
  let items='';
  // Grid
  [0.25,0.5,0.75,1].forEach(t=>{
    const pts=[];
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2-Math.PI/2;
      pts.push(`${CX+Math.cos(a)*R*t},${CY+Math.sin(a)*R*t}`);
    }
    items+=`<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`;
  });
  // Axes + labels
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2-Math.PI/2;
    const lx=CX+Math.cos(a)*(R+20), ly=CY+Math.sin(a)*(R+20);
    items+=`<line x1="${CX}" y1="${CY}" x2="${CX+Math.cos(a)*R}" y2="${CY+Math.sin(a)*R}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`;
    items+=`<text x="${lx}" y="${ly+4}" fill="var(--muted)" font-size="11" text-anchor="middle">${keys[i]}</text>`;
  }
  // Series
  series.forEach(s=>{
    const pts=[];
    keys.forEach((k,i)=>{
      const v=s.stats[k];
      const norm=Math.min(1.18,(v-30)/(110-30));
      const a=i/N*Math.PI*2-Math.PI/2;
      pts.push(`${CX+Math.cos(a)*R*norm},${CY+Math.sin(a)*R*norm}`);
    });
    items+=`<polygon points="${pts.join(' ')}" fill="${s.color}33" stroke="${s.color}" stroke-width="2"/>`;
    // Points
    keys.forEach((k,i)=>{
      const v=s.stats[k];
      const norm=Math.min(1.18,(v-30)/(110-30));
      const a=i/N*Math.PI*2-Math.PI/2;
      items+=`<circle cx="${CX+Math.cos(a)*R*norm}" cy="${CY+Math.sin(a)*R*norm}" r="3" fill="${s.color}"/>`;
    });
  });
  return `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}">${items}</svg>`;
};

// Original index.html:13730
wbdContext.swapComparePlayers = function swapComparePlayers(){
  const s1=document.getElementById('cmp-p1'), s2=document.getElementById('cmp-p2');
  const t=s1.value; s1.value=s2.value; s2.value=t;
  wbdContext.renderComparePage();
};

// Original index.html:13737
wbdContext.renderHighlightsPage = function renderHighlightsPage(){
  const cat=document.getElementById('hl-category').value;
  const sort=document.getElementById('hl-sort').value;
  const limit=+document.getElementById('hl-limit').value;
  const el=document.getElementById('highlights-content');
  if(!el)return;

  // 수집
  const plays=[];
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    g.pitches.forEach((d,idx)=>{
      let match=false, sortKey=0, detail='';
      if(cat==='hr' && d.result===4){match=true;sortKey=+d.ev||0;detail=`EV ${d.ev||'-'} · 발사각 ${d.ldeg||'-'}°`;}
      else if(cat==='barrel' && wbdContext._isInPlay(d) && wbdContext._isBarrel(d)){match=true;sortKey=+d.ev;detail=`EV ${d.ev} · 발사각 ${d.ldeg}°`;}
      else if(cat==='hardhit' && wbdContext._isInPlay(d) && d.ev>=115){match=true;sortKey=+d.ev;detail=`EV ${d.ev}`;}
      else if(cat==='k' && wbdContext._isK(d)){match=true;sortKey=+d.spdK||0;detail=`구속 ${d.spdK||'-'}km/h · ${wbdContext.PITCH_NAMES[d.pType]||''}`;}
      else if(cat==='walk' && d.result===5){match=true;sortKey=+d.pCnt||0;detail=`${d.ball}-${d.strk} 카운트`;}
      else if(cat==='fast' && +d.pPow>0){match=true;sortKey=+d.pPow;detail=`원본 구력 ${d.pPow} · 표시 ${d.spdK||'-'}km/h · ${wbdContext.PITCH_NAMES[d.pType]||''}`;}
      if(match){
        plays.push({
          d,gameName:g.name,info,date:info.date||'',
          pitcher:d.pName,batter:d.bName,
          sortKey, detail, inning:d.inn, half:d.half
        });
      }
    });
  });

  // 정렬
  if(sort==='top')plays.sort((a,b)=>b.sortKey-a.sortKey);
  else plays.sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.sortKey-a.sortKey);
  const top=plays.slice(0,limit);
  if(top.length===0){el.innerHTML='<div class="card section" style="padding:40px;text-align:center;color:var(--muted)">조건에 맞는 플레이가 없어요</div>';return;}

  const catLabel={hr:'⚾ 홈런',barrel:'🎯 배럴 타구',hardhit:'💪 강타',k:'🔥 헛스윙 삼진',walk:'✨ 볼넷',fast:'💪 최고 원본 구력'}[cat];
  let html=`<div class="card section"><div class="card-title">${catLabel} · ${top.length}개</div>`;
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>날짜</th><th>상황</th><th>투수</th><th>타자</th><th>구종/구속</th><th>디테일</th></tr></thead><tbody>';
  top.forEach((p,i)=>{
    const halfTxt=p.half===1?'초':'말';
    const pitchG=wbdContext.pitchGroup(p.d.pType,p.d);
    html+=`<tr>
      <td>${i+1}</td>
      <td style="font-size:10px;color:var(--muted);font-family:var(--mono)">${p.date||'—'}</td>
      <td style="font-size:11px">${p.inning}이닝 ${halfTxt}</td>
      <td onclick="goToPitcher('${String(p.pitcher).replace(/'/g,"\\'")}')" style="cursor:pointer;color:#ff6b6b">${p.pitcher||'—'}</td>
      <td onclick="goToBatter('${String(p.batter).replace(/'/g,"\\'")}')" style="cursor:pointer;color:#6bb5ff">${p.batter||'—'}</td>
      <td><span style="color:${wbdContext.GROUP_COLORS[pitchG]||'#888'}">${wbdContext.PITCH_NAMES[p.d.pType]||'—'}</span> <span style="color:var(--muted);font-family:var(--mono);font-size:11px">${p.d.spdK||'-'}km/h</span></td>
      <td style="font-family:var(--mono);font-size:11px;color:var(--amber)">${p.detail}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';
  el.innerHTML=html;
};

// Original index.html:13794
wbdContext.openGlobalSearch = function openGlobalSearch(){
  const ov=document.getElementById('global-search-overlay');
  ov.style.display='block';
  setTimeout(()=>document.getElementById('global-search-input').focus(),50);
  wbdContext.renderGlobalSearchResults();
};

// Original index.html:13800
wbdContext.closeGlobalSearch = function closeGlobalSearch(){document.getElementById('global-search-overlay').style.display='none';};

// Original index.html:13801
wbdContext.renderGlobalSearchResults = function renderGlobalSearchResults(){
  const q=(document.getElementById('global-search-input').value||'').toLowerCase().trim();
  const el=document.getElementById('global-search-results');
  if(!el)return;
  const pitchers=window._cache.pitcherNames;
  const batters=window._cache.batterNames;
  const teams=wbdContext._getActiveTeams();
  const games=wbdContext.GAMES.map(g=>{const info=wbdContext._parseGameName(g.name);return {g,info};});

  const match=s=>(s||'').toLowerCase().includes(q);
  const pMatch=q?pitchers.filter(n=>match(n)).slice(0,10):pitchers.slice(0,5);
  const bMatch=q?batters.filter(n=>match(n)).slice(0,10):batters.slice(0,5);
  const tMatch=q?teams.filter(t=>match(t)).slice(0,10):[];
  const gMatch=q?games.filter(x=>match(x.info.teamA)||match(x.info.teamB)||match(x.info.date)).slice(0,6):[];

  let html='';
  if(!q)html='<div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">검색어를 입력하세요</div>';

  const section=(label,items)=>{
    if(!items.length)return '';
    return `<div style="padding:6px 10px;font-size:10px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px">${label}</div>${items.join('')}`;
  };

  const pItems=pMatch.map(n=>{
    const c=wbdContext.calcPitcherCard(n);
    const safeN=String(n).replace(/'/g,"\\'");
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:4px;transition:background .1s" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
      <span style="font-size:16px">⚾</span>
      <div onclick="closeGlobalSearch();openCardDetail('${safeN}','pitcher')" style="flex:1;cursor:pointer">
        <div style="font-size:13px;font-weight:600">${n}</div>
        <div style="font-size:10px;color:var(--muted)">${wbdContext._playerTeam(n,'pitcher')}</div>
      </div>
      <div style="font-family:var(--mono);color:${wbdContext.cardOvrColor(c.OVR)};font-weight:700">${c.OVR}</div>
      <button onclick="closeGlobalSearch();goToPitcher('${safeN}')" title="상세 분석" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">📊</button>
      <button onclick="closeGlobalSearch();_jumpToMatchup('${safeN}','pitcher')" title="매치업" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">🎮</button>
    </div>`;
  });
  const bItems=bMatch.map(n=>{
    const c=wbdContext.calcBatterCard(n);
    const safeN=String(n).replace(/'/g,"\\'");
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:4px;transition:background .1s" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
      <span style="font-size:16px">🏏</span>
      <div onclick="closeGlobalSearch();openCardDetail('${safeN}','batter')" style="flex:1;cursor:pointer">
        <div style="font-size:13px;font-weight:600">${n}</div>
        <div style="font-size:10px;color:var(--muted)">${wbdContext._playerTeam(n,'batter')}</div>
      </div>
      <div style="font-family:var(--mono);color:${wbdContext.cardOvrColor(c.OVR)};font-weight:700">${c.OVR}</div>
      <button onclick="closeGlobalSearch();goToBatter('${safeN}')" title="상세 분석" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">📊</button>
      <button onclick="closeGlobalSearch();_jumpToMatchup('${safeN}','batter')" title="매치업" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer">🎮</button>
    </div>`;
  });
  const tItems=tMatch.map(t=>
    `<div onclick="closeGlobalSearch();goToTeam('${t.replace(/'/g,"\\'")}')" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-radius:4px" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''"><span style="font-size:16px">🏆</span><div style="font-size:13px;font-weight:600">${t}</div></div>`
  );
  const gItems=gMatch.map(x=>
    `<div onclick="closeGlobalSearch();openGameScoreboard('${x.g.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;border-radius:4px" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''"><span style="font-size:16px">📊</span><div style="flex:1"><div style="font-size:13px;font-weight:600">${x.info.teamA} vs ${x.info.teamB}</div><div style="font-size:10px;color:var(--muted)">${x.info.date||''}</div></div></div>`
  );

  html=section('투수',pItems)+section('타자',bItems)+section('팀',tItems)+section('경기',gItems)||html;
  el.innerHTML=html;
};

// Original index.html:13876
wbdContext.calcPitcherWAR = function calcPitcherWAR(name){
  const k = String(name);
  const c = window._cache.pitcherWAR;
  if(c[k] !== undefined) return c[k];
  c[k] = wbdContext._calcPitcherWARImpl(name);
  return c[k];
};

// Original index.html:13883
wbdContext._calcPitcherWARImpl = function _calcPitcherWARImpl(name){
  // V10.1: 기록실 pWAR로 통합 — FIP(WBD 리그 RA9 보정) 기반
  // V11.3: n>=15 컷 제거. WAR는 누적 스탯이라 최소 투구 제한 부적절(기록실 pwar와 통일).
  try {
    const r = wbdContext._computeRecordsData().pitchers.find(p => p.name === String(name));
    if(r && r.pwar != null && r.n > 0) return +r.pwar.toFixed(2);
  } catch(e){}
  return 0;
};

// Original index.html:13893
wbdContext.calcBatterWAR = function calcBatterWAR(name){
  const k = String(name);
  const c = window._cache.batterWAR;
  if(c[k] !== undefined) return c[k];
  c[k] = wbdContext._calcBatterWARImpl(name);
  return c[k];
};

// Original index.html:13900
wbdContext._calcBatterWARImpl = function _calcBatterWARImpl(name){
  // V10.1: 기록실 oWAR로 통합 — 안타 분류(2/3루타) + WBD 환경 보정 wOBA/wRAA/RPW 기반
  // V11.3: PA>=5 컷 제거. WAR는 누적 스탯이라 타석이 적으면 값도 작게 나오므로
  //   인위적 최소 타석 제한은 부적절(리그전 기록실 owar와 불일치 원인이었음). 실제 값으로 통일.
  try {
    const r = wbdContext._computeRecordsData().batters.find(b => b.name === String(name));
    if(r && r.PA > 0) return +r.owar.toFixed(2);
  } catch(e){}
  return 0;
};

// Original index.html:13912
wbdContext.renderAwardsPage = function renderAwardsPage(){
  const el=document.getElementById('awards-content');
  if(!el)return;
  if(wbdContext.GAMES.length===0||wbdContext.G.length===0){
    el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">데이터가 없어요</div>';
    return;
  }

  // 시즌 범위 (활성/전체) - 데이터는 항상 활성 게임 기준
  // 'all' 모드 = 규정(최소 경기/타석/투구) 무시
  const seasonScope_local=window.awardSeasonScope||'active';
  const dataSource=wbdContext.G;
  
  // 모든 투수/타자 수집 및 계산
  const pNames=[...new Set(dataSource.filter(d=>d.pName).map(d=>d.pName))];
  const bNames=[...new Set(dataSource.filter(d=>d.bName).map(d=>d.bName))];

  const pStats=pNames.map(n=>{
    const pd=dataSource.filter(d=>String(d.pName)===String(n));
    if(pd.length<5)return null;  // 너무 적으면 스킵 (5투구 미만)
    const card=wbdContext.calcPitcherCard(n);
    const war=wbdContext.calcPitcherWAR(n);
    const battedPd=pd.filter(wbdContext._isInPlay);
    const hits=pd.filter(wbdContext._isHit).length;
    const hrs=pd.filter(d => +d.result===4).length;
    const ks=pd.filter(d=>wbdContext._isK(d)).length;  // 진짜 K (카운트 2에서 3번째 strike, 루킹+헛스윙 모두)
    const bbs=pd.filter(d=>d.result===5).length;
    // 표준 피안타율 (AB = 인플레이 + K)
    const ab = pd.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const fbSpds=pd.filter(d=>d.spdK>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    const fbPows=pd.filter(d=>+d.pPow>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.pPow);
    // 잠재구속 (개별 변환 후 평균)
    const fbKmhsP=fbPows.map(p=>wbdContext._ppowToKmh(p));
    const avgPotential=fbKmhsP.length?fbKmhsP.reduce((a,b)=>a+b,0)/fbKmhsP.length:0;
    // 헛스윙% (스윙 중 헛스윙 비율)
    const swings=pd.filter(d=>d.bSwing).length;
    const whiffs=pd.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    const whiffPctP=swings>0?whiffs/swings*100:0;
    // K/BB
    const kbb=bbs>0?ks/bbs:(ks>0?99:0);
    // 구종 수 (5% 이상 비율)
    const groupCnt={};
    pd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);groupCnt[g]=(groupCnt[g]||0)+1;});
    const validGroups=Object.values(groupCnt).filter(c=>c/pd.length>=0.05).length;
    const _rp=(()=>{try{return wbdContext._computeRecordsData().pitchers.find(x=>x.name===n);}catch(e){return null;}})();
    return {name:n,card,war,hits,hrs,ks,bbs,kbb,kPct:ks/pd.length*100,baAgainst: ab>0 ? hits/ab : 1, ab, pitches:pd.length,avgSpd:fbSpds.length?fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length:0,avgPotential,whiffPctP,validGroups,team:wbdContext._playerTeam(n,'pitcher'),
      W:_rp?_rp.W:0, L:_rp?_rp.L:0, SV:_rp?_rp.SV:0, HLD:_rp?_rp.HLD:0, QS:_rp?_rp.QS:0, QSP:_rp?_rp.QSP:0, era:_rp?_rp.era:null, ip:_rp?_rp.IP:0};
  }).filter(Boolean);

  const bStats=bNames.map(n=>{
    const allB=dataSource.filter(d=>String(d.bName)===String(n));
    const bd=allB.filter(wbdContext._isInPlay);
    if(bd.length<3)return null;  // 너무 적으면 스킵 (3타구 미만)
    const card=wbdContext.calcBatterCard(n);
    const war=wbdContext.calcBatterWAR(n);
    // 표준 BA (AB = 인플레이 + K)
    const hits = allB.filter(wbdContext._isHit).length;
    const hrs = allB.filter(d => +d.result===4).length;
    const singles = allB.filter(d => +d['1BSafe']===1 && +d.result!==4).length;
    const ab = allB.filter(d => {
      const r=+d.result;
      return wbdContext._isABPitch(d);
    }).length;
    const avg = ab > 0 ? hits/ab : 0;
    const slg = ab > 0 ? wbdContext._totalBases(allB) / ab : 0;  // V10.1: 정확한 SLG
    const barrels=bd.filter(d=>wbdContext._isBarrel(d)).length;
    // BB/HBP/PA (전체 투구 중 result로 계산)
    const bbs=allB.filter(d=>d.result===5).length;
    const hbps=allB.filter(d=>d.result===6).length;
    // OBP = (hits + BB + HBP) / (AB + BB + HBP)
    const obpDenom = ab + bbs + hbps;
    const obp = obpDenom > 0 ? (hits + bbs + hbps) / obpDenom : 0;
    const ops=obp+slg;
    // 평균 EV (강타자상)
    const avgEV=bd.length?bd.reduce((s,d)=>s+(+d.ev||0),0)/bd.length:0;
    // 헛스윙률 (컨택왕)
    const swings=allB.filter(d=>d.bSwing).length;
    const whiffs=allB.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    const whiffPctB=swings>0?whiffs/swings*100:99;
    // 체이스율 (선구안왕)
    const ozPitches=allB.filter(d=>d.zoneX!=null&&(Math.abs(+d.zoneX)>1||Math.abs(+(d.zoneY||0))>1));
    const ozSwings=ozPitches.filter(d=>d.bSwing).length;
    const chasePct=ozPitches.length>0?ozSwings/ozPitches.length*100:99;
    // wOBA (WBD 보정 가중치)
    const singles_b = allB.filter(d => +d['1BSafe']===1 && +d.result!==4).length;
    const wobaDenom = ab + bbs + hbps;
    const woba = wobaDenom>0 ? (0.55*bbs + 0.55*hbps + 0.45*singles_b + 1.80*hrs) / wobaDenom : 0;
    const _rb=(()=>{try{return wbdContext._computeRecordsData().batters.find(x=>x.name===n);}catch(e){return null;}})();
    return {name:n,card,war,hits,hrs,avg,slg,obp,ops,woba,barrels, ab, abs: ab, bbs,hbps,avgEV,whiffPctB,chasePct,team:wbdContext._playerTeam(n,'batter'),
      wrcPlus:_rb?_rb.wrcPlus:0, iso:_rb?_rb.iso:0, h2B:_rb?_rb.h2B:0};
  }).filter(Boolean);

  // ─── 수상자 선정 ───
  const sort=(arr,key,desc=true)=>[...arr].sort((a,b)=>desc?b[key]-a[key]:a[key]-b[key]);

  // 규정 타석/투구 기준 (리그 평균 수준 보장)
  // 사용자 토글: 매우널널/널널/보통/엄격/매우엄격/직접
  const awardLevel=window.awardThresholdLevel||'normal';
  const thresholds={
    veryloose: {ab:10, pitch:25,  ip:2,  label:'매우 널널'},
    loose:     {ab:15, pitch:50,  ip:3,  label:'널널'},
    normal:    {ab:30, pitch:100, ip:5,  label:'보통'},
    strict:    {ab:60, pitch:200, ip:10, label:'엄격'},
    verystrict:{ab:100,pitch:300, ip:15, label:'매우 엄격'}
  };
  let T;
  if(awardLevel==='custom'){
    T={ab:window.awardCustomAb||30, pitch:window.awardCustomPitch||100, ip:window.awardCustomIp||5, label:'직접'};
  } else {
    T=thresholds[awardLevel]||thresholds.normal;
  }
  const MIN_AB_AWARD=T.ab;
  const MIN_PITCH_AWARD=T.pitch;
  const MIN_IP_AWARD=T.ip;

  // MVP: 투타 통합 WAR 1위 (투타 겸업이면 총합 WAR 사용)
  // 전체 모드면 최소 경기 기준 무시
  const useMin=seasonScope_local!=='all';
  const qualifyP=useMin?pStats.filter(x=>x.pitches>=MIN_PITCH_AWARD):pStats;
  const qualifyB=useMin?bStats.filter(x=>x.abs>=MIN_AB_AWARD):bStats;
  // 투타 겸업 선수 감지 (이름이 pStats와 bStats 둘 다 있음)
  const pNameSet=new Set(pStats.map(x=>x.name));
  const bNameSet=new Set(bStats.map(x=>x.name));
  const hybridNames=[...pNameSet].filter(n=>bNameSet.has(n));
  const hybridStats=hybridNames.map(n=>{
    const p=pStats.find(x=>x.name===n);
    const b=bStats.find(x=>x.name===n);
    const totalWar=(p?.war||0)+(b?.war||0);
    return {name:n, pWar:p?.war||0, bWar:b?.war||0, totalWar, p, b, team:p?.team||b?.team};
  }).filter(x=>{
    if(!useMin) return true;
    const p=x.p, b=x.b;
    return (p&&p.pitches>=MIN_PITCH_AWARD) || (b&&b.abs>=MIN_AB_AWARD);
  });
  
  // MVP 후보 (투타 통합)
  const mvpCandidates=[
    ...qualifyP.filter(x=>!bNameSet.has(x.name)).map(x=>({...x,type:'pitcher',mvpScore:x.war*0.85,displayWar:x.war})),
    ...qualifyB.filter(x=>!pNameSet.has(x.name)).map(x=>({...x,type:'batter',mvpScore:x.war,displayWar:x.war})),
    // 투타 겸업: 총합 WAR을 가중치 1.0으로
    ...hybridStats.map(x=>({name:x.name,team:x.team,type:'hybrid',mvpScore:x.totalWar,displayWar:x.totalWar,war:x.totalWar,pWar:x.pWar,bWar:x.bWar}))
  ];
  mvpCandidates.sort((a,b)=>b.mvpScore-a.mvpScore);
  const mvp=mvpCandidates[0];

  // 타자 MVP, 투수 MVP, 통합 MVP 3개로 분리
  // 사이영상: 투수 WAR 1위 (= 투수 MVP)
  const cy=sort(qualifyP,'war')[0];
  // 타자 MVP: 타자 WAR 1위
  const batMvp=sort(qualifyB,'war')[0];
  // === 타자 어워드 ===
  const hrKing=sort(qualifyB,'hrs')[0];           // 홈런왕
  const avgKing=sort(qualifyB,'avg')[0];          // 타격왕
  const obpKing=sort(qualifyB,'obp')[0];          // 출루왕
  const slgKing=sort(qualifyB,'slg')[0];          // 장타왕
  const opsKing=sort(qualifyB,'ops')[0];          // OPS왕
  const wobaKing=sort(qualifyB,'woba')[0];        // wOBA왕 (가중 출루율)
  const hitsKing=sort(qualifyB,'hits')[0];        // 안타왕
  const brlKing=sort(qualifyB,'barrels')[0];      // 배럴왕
  const evKing=sort(qualifyB,'avgEV')[0];         // 강타자상
  // 컨택왕 (헛스윙% 가장 낮음, 30+ 스윙)
  const contactKing=sort(qualifyB.filter(x=>x.whiffPctB<99),'whiffPctB',false)[0];
  // 선구안왕 (체이스율 가장 낮음 + BB 어느정도 있는)
  const eyeKing=sort(qualifyB.filter(x=>x.chasePct<99&&x.bbs>=2),'chasePct',false)[0];
  
  // === 투수 어워드 ===
  const kKing=sort(qualifyP,'ks')[0];                              // 탈삼진왕
  const spdKing=sort(qualifyP.filter(x=>x.avgSpd>0),'avgSpd')[0];  // 구속왕
  const potKing=sort(qualifyP.filter(x=>x.avgPotential>0),'avgPotential')[0]; // 잠재구속왕
  const kbbKing=sort(qualifyP,'kbb')[0];                           // K/BB왕
  const whiffKing=sort(qualifyP,'whiffPctP')[0];                   // 헛스윙왕
  const varietyKing=sort(qualifyP,'validGroups')[0];               // 변화구왕
  // V11: 새 스탯 부문 — 결과기록은 규정 무관(누적), wRC+/ISO는 규정 적용
  const winKing=sort(qualifyP.filter(x=>x.W>0),'W')[0];            // 다승왕
  const saveKing=sort(pStats.filter(x=>x.SV>0),'SV')[0];          // 세이브왕 (규정무관 전체)
  const holdKing=sort(pStats.filter(x=>x.HLD>0),'HLD')[0];        // 홀드왕
  const qsKing=sort(qualifyP.filter(x=>x.QS>0),'QS')[0];          // QS왕
  const wrcKing=sort(qualifyB.filter(x=>x.wrcPlus),'wrcPlus')[0]; // wRC+왕
  const isoKing=sort(qualifyB.filter(x=>x.iso),'iso')[0];         // 장타력(ISO)왕
  
  // ERA/WHIP/이닝이터왕 - 시즌 누적 통계 (활성 게임)
  const pitcherSeasonStats={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const gs=wbdContext._getCachedPitcherStats(g.id);
      if(!gs)return;
          Object.entries(gs).forEach(([pn,s])=>{
      if(!pitcherSeasonStats[pn])pitcherSeasonStats[pn]={name:pn,outs:0,runs:0,hits:0,bbs:0,pitches:0};
      const p=pitcherSeasonStats[pn];
      p.outs+=s.outs;p.runs+=s.runs;p.hits+=s.hits;p.bbs+=s.bbs;p.pitches+=s.pitches;
    });
  });
  const pitcherSeasonList=Object.values(pitcherSeasonStats).map(p=>{
    const ip=p.outs/3;
    return {...p,ip,era:ip>0?p.runs/ip*9:99,whip:ip>0?(p.hits+p.bbs)/ip:99,
      ipDisp:Math.floor(ip)+'.'+(p.outs%3),team:wbdContext._playerTeam(p.name,'pitcher')};
  });
  // 규정 이닝: 토글 기준 사용 (전체 모드면 최소 0.1이닝만)
  const minIp=useMin?MIN_IP_AWARD:0.1;
  const eraQualified=pitcherSeasonList.filter(p=>p.ip>=minIp);
  const eraKing=eraQualified.length?[...eraQualified].sort((a,b)=>a.era-b.era)[0]:null;
  const whipKing=eraQualified.length?[...eraQualified].sort((a,b)=>a.whip-b.whip)[0]:null;
  const ipKing=pitcherSeasonList.length?[...pitcherSeasonList].sort((a,b)=>b.ip-a.ip)[0]:null;
  
  // 신인왕: 샘플 적은 선수 중 최고 WAR (규정 미달 = 신인)
  const rookieP=sort(pStats.filter(x=>x.pitches<MIN_PITCH_AWARD&&x.pitches>=30),'war')[0];
  const rookieB=sort(bStats.filter(x=>x.abs<MIN_AB_AWARD&&x.abs>=10),'war')[0];
  const rookie=rookieP&&rookieB?(rookieP.war*0.85>rookieB.war?{...rookieP,type:'pitcher'}:{...rookieB,type:'batter'}):(rookieP?{...rookieP,type:'pitcher'}:rookieB?{...rookieB,type:'batter'}:null);

  // 어워드 카드 생성 헬퍼 (WAR 표시 옵션 추가)
  const awardCard=(icon,title,subtitle,winner,metric,metricLabel,color,showWar=true)=>{
    if(!winner)return `<div class="card" style="opacity:0.4;text-align:center;padding:20px"><div style="font-size:32px">${icon}</div><div style="font-size:13px;font-weight:700;color:${color};margin:6px 0">${title}</div><div style="font-size:11px;color:var(--muted)">데이터 부족</div></div>`;
    const type=winner.type||(winner.card?winner.card.type:'pitcher');
    let gotoFn;
    if(type==='hybrid') gotoFn='goToBatter'; // 겸업은 일단 타자 페이지로
    else gotoFn=type==='pitcher'?'goToPitcher':'goToBatter';
    // hybrid 표시 (투타 통합)
    const hybridLabel=type==='hybrid'?`<div style="font-size:10px;color:#cc44ff;margin-bottom:4px">⚔️ 투타 겸업 · P:${winner.pWar.toFixed(2)} / B:${winner.bWar.toFixed(2)}</div>`:'';
    // WAR 부가 표시 (메인 metric이 WAR이 아닐 때만)
    const warSub=showWar&&metricLabel!=='WAR'&&winner.war!=null
      ?`<div style="font-size:10px;color:var(--muted);margin-top:4px">WAR <b style="color:#ffd700">${winner.war.toFixed(2)}</b></div>`:'';
    return `<div class="card" style="border:2px solid ${color};box-shadow:0 0 20px ${color}44;text-align:center;padding:18px;cursor:pointer;transition:transform .2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''" onclick="${gotoFn}('${String(winner.name).replace(/'/g,"\\'")}')">
      <div style="font-size:40px;margin-bottom:6px">${icon}</div>
      <div style="font-size:12px;font-weight:700;color:${color};letter-spacing:1px;margin-bottom:2px">${title}</div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:12px">${subtitle}</div>
      ${hybridLabel}
      <div style="font-size:18px;font-weight:700;margin-bottom:2px">${winner.name}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${winner.team||'—'}</div>
      <div style="font-size:26px;font-family:var(--mono);color:var(--amber);font-weight:700">${metric}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px">${metricLabel}</div>
      ${warSub}
    </div>`;
  };

  let html='<div class="card section" style="text-align:center;padding:24px;background:linear-gradient(135deg,#1a1230,#0a1828);border:1px solid var(--amber)"><div style="font-size:11px;color:var(--amber);letter-spacing:3px;margin-bottom:6px">ANNUAL AWARDS</div><div style="font-size:28px;font-weight:700">🏆 시즌 어워드</div><div style="font-size:11px;color:var(--muted);margin-top:6px">활성 경기 기준 자동 선정</div></div>';
  
  // 규정 기준 토글 (5단계 + 전체 + 직접)
  const seasonScope=window.awardSeasonScope||'active';
  html+=`<div class="card section" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
    <span style="font-size:12px;color:var(--muted);font-weight:600">📏 규정:</span>
    <button class="stab${awardLevel==='veryloose'?' active':''}" onclick="window.awardThresholdLevel='veryloose';renderAwardsPage()" style="font-size:11px" title="타석 ${thresholds.veryloose.ab}+ / 투구 ${thresholds.veryloose.pitch}+">매우 널널</button>
    <button class="stab${awardLevel==='loose'?' active':''}" onclick="window.awardThresholdLevel='loose';renderAwardsPage()" style="font-size:11px" title="타석 ${thresholds.loose.ab}+ / 투구 ${thresholds.loose.pitch}+">널널</button>
    <button class="stab${awardLevel==='normal'?' active':''}" onclick="window.awardThresholdLevel='normal';renderAwardsPage()" style="font-size:11px" title="타석 ${thresholds.normal.ab}+ / 투구 ${thresholds.normal.pitch}+">보통</button>
    <button class="stab${awardLevel==='strict'?' active':''}" onclick="window.awardThresholdLevel='strict';renderAwardsPage()" style="font-size:11px" title="타석 ${thresholds.strict.ab}+ / 투구 ${thresholds.strict.pitch}+">엄격</button>
    <button class="stab${awardLevel==='verystrict'?' active':''}" onclick="window.awardThresholdLevel='verystrict';renderAwardsPage()" style="font-size:11px" title="타석 ${thresholds.verystrict.ab}+ / 투구 ${thresholds.verystrict.pitch}+">매우 엄격</button>
    <button class="stab${awardLevel==='custom'?' active':''}" onclick="window.awardThresholdLevel='custom';renderAwardsPage()" style="font-size:11px;${awardLevel==='custom'?'border-color:#aa88ff;color:#aa88ff':''}">⚙️ 직접</button>
    <button class="stab${seasonScope==='all'?' active':''}" onclick="window.awardSeasonScope='${seasonScope==='all'?'active':'all'}';renderAwardsPage()" style="font-size:11px;margin-left:6px;${seasonScope==='all'?'border-color:var(--amber);color:var(--amber)':''}">🌐 전체 (규정 무시)</button>
    <span style="margin-left:auto;font-size:10px;color:var(--muted);font-family:var(--mono)">${seasonScope==='all'?'전체 (규정 X)':T.label} · 타석 ${T.ab}+ / 투구 ${T.pitch}+ / IP ${T.ip}+</span>
  </div>`;
  
  // 직접 설정 입력
  if(awardLevel==='custom'&&seasonScope!=='all'){
    html+=`<div class="card section" style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-size:12px;color:#aa88ff;font-weight:600">⚙️ 직접 설정:</span>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">최소 타석 <input type="number" min="0" value="${window.awardCustomAb||30}" onchange="window.awardCustomAb=Math.max(0,+this.value||0);renderAwardsPage()" style="width:64px;padding:4px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-family:var(--mono)"></label>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">최소 투구 <input type="number" min="0" value="${window.awardCustomPitch||100}" onchange="window.awardCustomPitch=Math.max(0,+this.value||0);renderAwardsPage()" style="width:64px;padding:4px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-family:var(--mono)"></label>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">최소 IP <input type="number" min="0" value="${window.awardCustomIp||5}" onchange="window.awardCustomIp=Math.max(0,+this.value||0);renderAwardsPage()" style="width:64px;padding:4px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-family:var(--mono)"></label>
    </div>`;
  }

  // 메인 어워드 (타자 MVP + 투수 MVP/사이영 + 통합 MVP)
  html+='<div class="grid3 section">';
  if(batMvp)html+=awardCard('🏏','타자 MVP','Batter MVP',{...batMvp,type:'batter'},batMvp.war.toFixed(2),'WAR','#ff6b8a');
  else html+=awardCard('🏏','타자 MVP','Batter MVP',null,null,null,'#ff6b8a');
  if(cy)html+=awardCard('👑','투수 MVP','Cy Young (Pitcher MVP)',{...cy,type:'pitcher'},cy.war.toFixed(2),'WAR','#88ccff');
  else html+=awardCard('👑','투수 MVP','Cy Young (Pitcher MVP)',null,null,null,'#88ccff');
  if(mvp)html+=awardCard('🏆','통합 MVP','Overall MVP',mvp,mvp.war.toFixed(2),'WAR','#ffd700');
  else html+=awardCard('🏆','통합 MVP','Overall MVP',null,null,null,'#ffd700');
  html+='</div>';

  // === 타자 어워드 ===
  html+='<div class="card-title section" style="font-size:14px;color:#ff6b8a;margin-top:18px">🏏 타자 부문</div>';
  // 슬래시 라인 (타격왕/출루왕/장타왕/OPS왕)
  html+='<div class="grid4 section">';
  html+=awardCard('🏏','타격왕','Batting Champion',avgKing?{...avgKing,type:'batter'}:null,avgKing?avgKing.avg.toFixed(3).replace(/^0/,''):null,'타율','#39ff8a');
  html+=awardCard('🚶','출루왕','OBP Leader',obpKing?{...obpKing,type:'batter'}:null,obpKing?obpKing.obp.toFixed(3).replace(/^0/,''):null,'OBP','#44aaff');
  html+=awardCard('💫','장타왕','SLG Leader',slgKing?{...slgKing,type:'batter'}:null,slgKing?slgKing.slg.toFixed(3).replace(/^0/,''):null,'SLG','#ffaa44');
  html+=awardCard('🌟','OPS왕','OPS Leader',opsKing?{...opsKing,type:'batter'}:null,opsKing?opsKing.ops.toFixed(3):null,'OPS','#ffd700');
  html+=awardCard('⭐','wOBA왕','Weighted OBP',wobaKing?{...wobaKing,type:'batter'}:null,wobaKing?wobaKing.woba.toFixed(3).replace(/^0/,''):null,'wOBA','#cc44ff');
  html+=awardCard('📈','wRC+왕','wRC+ Leader',wrcKing?{...wrcKing,type:'batter'}:null,wrcKing?wrcKing.wrcPlus.toFixed(0):null,'wRC+','#ffc844');
  html+=awardCard('🎪','장타력왕','ISO Leader',isoKing?{...isoKing,type:'batter'}:null,isoKing?isoKing.iso.toFixed(3).replace(/^0/,''):null,'ISO','#ffaa66');
  html+='</div>';
  // 파워 + 컨택 (홈런왕/안타왕/배럴왕/강타자)
  html+='<div class="grid4 section">';
  html+=awardCard('⚾','홈런왕','Home Run King',hrKing?{...hrKing,type:'batter'}:null,hrKing?hrKing.hrs:null,'홈런','#ff4560');
  html+=awardCard('🎯','안타왕','Hits Leader',hitsKing?{...hitsKing,type:'batter'}:null,hitsKing?hitsKing.hits:null,'안타','#88ccff');
  html+=awardCard('💥','배럴왕','Barrel Machine',brlKing?{...brlKing,type:'batter'}:null,brlKing?brlKing.barrels:null,'배럴','#cc44ff');
  html+=awardCard('💪','강타자상','Hardest Hitter',evKing?{...evKing,type:'batter'}:null,evKing?evKing.avgEV.toFixed(1):null,'평균EV','#ff8800');
  html+='</div>';
  // 컨택 + 선구안
  html+='<div class="grid2 section">';
  html+=awardCard('🎪','컨택왕','Contact King',contactKing?{...contactKing,type:'batter'}:null,contactKing?contactKing.whiffPctB.toFixed(1)+'%':null,'헛스윙률','#88cc44');
  html+=awardCard('👁️','선구안왕','Plate Discipline',eyeKing?{...eyeKing,type:'batter'}:null,eyeKing?eyeKing.chasePct.toFixed(1)+'%':null,'존밖스윙률','#aa88ff');
  html+='</div>';

  // === 투수 어워드 ===
  html+='<div class="card-title section" style="font-size:14px;color:#88ccff;margin-top:18px">⚾ 투수 부문</div>';
  // ERA / WHIP / 이닝이터
  html+='<div class="grid4 section">';
  html+=awardCard('🛡️','방어율왕','ERA Champion',eraKing?{...eraKing,type:'pitcher'}:null,eraKing?eraKing.era.toFixed(2):null,'ERA','#39ff8a');
  html+=awardCard('🔒','WHIP왕','WHIP Champion',whipKing?{...whipKing,type:'pitcher'}:null,whipKing?whipKing.whip.toFixed(2):null,'WHIP','#88cc44');
  html+=awardCard('⏱️','이닝이터','Workhorse',ipKing?{...ipKing,type:'pitcher'}:null,ipKing?ipKing.ipDisp:null,'IP','#ff8c44');
  html+=awardCard('🔥','탈삼진왕','Strikeout King',kKing?{...kKing,type:'pitcher'}:null,kKing?kKing.ks:null,'K','#ff8800');
  html+='</div>';
  // 구속/잠재구속/K_BB/헛스윙
  html+='<div class="grid4 section">';
  html+=awardCard('⚡','구속왕','Fastest Gun',spdKing?{...spdKing,type:'pitcher'}:null,spdKing?spdKing.avgSpd.toFixed(1):null,'km/h','#2196f3');
  html+=awardCard('🌟','잠재구속왕','Potential Speed',potKing?{...potKing,type:'pitcher'}:null,potKing?potKing.avgPotential.toFixed(1):null,'km/h','#cc88ff');
  html+=awardCard('⚖️','K/BB왕','K-BB Ratio',kbbKing?{...kbbKing,type:'pitcher'}:null,kbbKing?(kbbKing.kbb>=99?'∞':kbbKing.kbb.toFixed(2)):null,'K/BB','#ffd700');
  html+=awardCard('🌪️','헛스윙왕','Whiff Master',whiffKing?{...whiffKing,type:'pitcher'}:null,whiffKing?whiffKing.whiffPctP.toFixed(1)+'%':null,'헛스윙률','#aa88ff');
  html+='</div>';
  // 변화구
  html+='<div class="grid2 section">';
  html+=awardCard('🎨','변화구왕','Pitch Variety',varietyKing?{...varietyKing,type:'pitcher'}:null,varietyKing?varietyKing.validGroups:null,'유효 구종','#cc44ff');
  // V11: 결과기록 어워드
  html+=awardCard('🏆','다승왕','Win Leader',winKing?{...winKing,type:'pitcher'}:null,winKing?winKing.W:null,'승','#ffd700');
  html+=awardCard('🔐','세이브왕','Save Leader',saveKing?{...saveKing,type:'pitcher'}:null,saveKing?saveKing.SV:null,'세이브','#60a5fa');
  html+=awardCard('🤝','홀드왕','Hold Leader',holdKing?{...holdKing,type:'pitcher'}:null,holdKing?holdKing.HLD:null,'홀드','#a78bfa');
  html+=awardCard('💎','퀄리티스타트왕','QS Leader',qsKing?{...qsKing,type:'pitcher'}:null,qsKing?qsKing.QS:null,'QS','#fbbf24');
  html+=awardCard('⭐','신인왕','Rookie of the Year',rookie,rookie?rookie.war.toFixed(2):null,'WAR','#44aaff');
  html+='</div>';

  // WAR 리더보드
  html+='<div class="card section"><div class="card-title">📊 WAR 리더보드 Top 15</div>';
  html+='<div class="grid2"><div>';
  html+='<div style="padding:8px 10px;font-size:11px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px">⚾ 투수</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>이름</th><th>WAR</th><th>K</th><th>피안타율</th></tr></thead><tbody>';
  sort(pStats,'war').slice(0,15).forEach((p,i)=>{
    html+=`<tr onclick="goToPitcher('${String(p.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-weight:600">${p.name}</td>
      <td style="font-family:var(--mono);color:var(--amber);font-weight:700">${p.war.toFixed(2)}</td>
      <td style="font-family:var(--mono)">${p.ks}</td>
      <td style="font-family:var(--mono)">${p.baAgainst.toFixed(3).replace(/^0/,'')}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';
  html+='<div>';
  html+='<div style="padding:8px 10px;font-size:11px;color:var(--muted);font-family:var(--mono);text-transform:uppercase;letter-spacing:1px">🏏 타자</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>이름</th><th>WAR</th><th>HR</th><th>AVG</th></tr></thead><tbody>';
  sort(bStats,'war').slice(0,15).forEach((b,i)=>{
    html+=`<tr onclick="goToBatter('${String(b.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-weight:600">${b.name}</td>
      <td style="font-family:var(--mono);color:var(--amber);font-weight:700">${b.war.toFixed(2)}</td>
      <td style="font-family:var(--mono)">${b.hrs}</td>
      <td style="font-family:var(--mono)">${b.avg.toFixed(3).replace(/^0/,'')}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div></div></div>';

  el.innerHTML=html;
};

// Original index.html:14271
wbdContext._muHand = function _muHand(v){ return String(v||'').toUpperCase()==='L'?'L':'R'; };

// Original index.html:14272
wbdContext._muHandOf = function _muHandOf(arr,key){ let l=0,r=0; arr.forEach(x=>{ if(wbdContext._muHand(x[key])==='L')l++; else r++; }); return l>r?'L':'R'; };

// Original index.html:14273
wbdContext._muRates = function _muRates(s){ if(!s) return {ba:null,k:null,bb:null,hr:null,AB:0,PA:0}; return {ba:s.AB?s.hits/s.AB:null, k:s.PA?s.K/s.PA:null, bb:s.PA?(s.BB+s.HBP)/s.PA:null, hr:s.AB?s.hrs/s.AB:null, AB:s.AB, PA:s.PA}; };

// Original index.html:14275
wbdContext._muEst = function _muEst(all, vs, key, lgVal, k){ k=k||30; const nk=(key==='ba'||key==='hr')?'AB':'PA';
  const base=all[key]!=null?wbdContext._srShrink(all[key], all[nk], lgVal, k):lgVal;
  if(vs&&vs[key]!=null&&vs[nk]>0){ const w=vs[nk]/(vs[nk]+40); const v=wbdContext._srShrink(vs[key], vs[nk], base, k); return v*w+base*(1-w); }
  return base; };

// Original index.html:14280
wbdContext._muLog5 = function _muLog5(b,p,l){ if(l==null||l<=0||l>=1) return (b+p)/2; const num=b*p/l, den=num+(1-b)*(1-p)/(1-l); return den>0?num/den:l; };

// Original index.html:14282
wbdContext._muLeague = function _muLeague(){ return wbdContext._memoByGame('_muLeague','', ()=>{
  let AB=0,H=0,PA=0,K=0,BB=0,HR=0; const ct={}, grp={};
  (window._cache.batterNames||[]).forEach(n=>{ const d=wbdContext.getBatterDataByName(n); const s=wbdContext._h2hSlash(d); if(!s)return; AB+=s.AB;H+=s.hits;PA+=s.PA;K+=s.K;BB+=s.BB+s.HBP;HR+=s.hrs;
    const c=wbdContext._atkCountStatsArr(d); for(const k in c){ const o=ct[k]=ct[k]||{ab:0,h:0}; o.ab+=c[k].ab; o.h+=c[k].hits; }
    wbdContext._atkPitchStatsArr(d).groups.forEach(g=>{ const o=grp[g.g]=grp[g.g]||{ab:0,h:0}; o.ab+=g.ab; o.h+=g.hits; }); });
  const r={ba:AB?H/AB:0.35, k:PA?K/PA:0.2, bb:PA?BB/PA:0.08, hr:AB?HR/AB:0.03, count:{}, grp:{}};
  for(const k in ct) r.count[k]=ct[k].ab?ct[k].h/ct[k].ab:r.ba; for(const g in grp) r.grp[g]=grp[g].ab?grp[g].h/grp[g].ab:r.ba;
  return r; }); };
}

export function initialize(wbdContext) {
// Original index.html:13863
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')wbdContext.closeGlobalSearch();
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();wbdContext.openGlobalSearch();}
});
}
