/** shortcuts-fielding: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:34307
wbdContext.calcFieldingInnings = function calcFieldingInnings(name){
  const posInnings={};
  let totalInnings=0;
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const plays=g.pitches.filter(d=>String(d.bName)===String(name)&&d.bPos!=null);
    if(plays.length===0)return;
    // 이 경기의 최대 이닝 수 (양 팀 합산이 아닌, 경기 이닝 수)
    const maxInn=Math.max(...g.pitches.map(d=>+d.inn||0));
    if(maxInn===0)return;
    // 선수의 주 포지션 (가장 많이 기록된 bPos)
    const posCnt={};
    plays.forEach(d=>{const p=+d.bPos;posCnt[p]=(posCnt[p]||0)+1;});
    const sorted=Object.entries(posCnt).sort((a,b)=>b[1]-a[1]);
    const mainPos=+sorted[0][0];
    // 추가: 만약 선수가 경기 중간에 교체됐으면(포지션 여러개) 각 포지션을 타석 비율로 배분
    if(sorted.length>=2){
      const totalPlays=plays.length;
      sorted.forEach(([p,cnt])=>{
        const share=Math.round(maxInn*(cnt/totalPlays));
        posInnings[+p]=(posInnings[+p]||0)+share;
        totalInnings+=share;
      });
    } else {
      posInnings[mainPos]=(posInnings[mainPos]||0)+maxInn;
      totalInnings+=maxInn;
    }
  });
  return {posInnings, totalInnings};
};

// Original index.html:34341
wbdContext.getPrimaryPosition = function getPrimaryPosition(name){
  const {posInnings}=wbdContext.calcFieldingInnings(name);
  const entries=Object.entries(posInnings);  // DH 포함 전체
  if(entries.length===0){
    return null;
  }
  entries.sort((a,b)=>b[1]-a[1]);
  const [pos,innings]=entries[0];
  return {pos:+pos, name:wbdContext.POS_NAMES[+pos], long:wbdContext.POS_LONG[+pos], innings};
};

// Original index.html:34353
wbdContext.renderFieldingLeaderboard = function renderFieldingLeaderboard(posFilter='all'){
  const MIN=wbdContext._getFieldingMin();
  const pitcherMode=window.bestLineupPitcherMode||'pitcher';
  // 모든 타자의 포지션별 이닝 집계 (OVR·WAR 포함)
  // ⚠️ 타자가 P(0) 포지션에 있으면 표시 X (투수 row에서 따로 처리)
  const bNames=(window._cache.batterNames||[]).slice();
  const rows=[];
  bNames.forEach(n=>{
    const bd=wbdContext.getBatterDataByName(n).filter(wbdContext._isInPlay);
    if(bd.length<MIN.ab)return;
    const {posInnings,totalInnings}=wbdContext.calcFieldingInnings(n);
    if(totalInnings<MIN.innings)return;
    const card=wbdContext.calcBatterCard(n);
    const war=wbdContext.calcBatterWAR(n);
    const primary=wbdContext.getPrimaryPosition(n);
    if(primary&&primary.pos===0)return;  // 주 포지션이 투수면 제외
    // posInnings에서 0(P) 제거 (타자 row이므로)
    const cleanPosInnings={};
    Object.entries(posInnings).forEach(([k,v])=>{ if(+k!==0) cleanPosInnings[k]=v; });
    rows.push({name:n, posInnings:cleanPosInnings, totalInnings, type:'batter', team:wbdContext._playerTeam(n,'batter'), primary, OVR:card?card.OVR:0, WAR:war, lowData:card?card.lowData:true});
  });
  
  // 투수 추가 (pos=0) - pitcherMode에 따라 WAR 표시 다름
  const pNames=(window._cache.pitcherNames||[]).slice();
  pNames.forEach(n=>{
    const pd=wbdContext.getPitcherDataByName(n);
    if(pd.length<MIN.pitch)return;
    const card=wbdContext.calcPitcherCard(n);
    if(!card)return;
    const pWar=wbdContext.calcPitcherWAR(n);
    const isHybrid=wbdContext.G.some(d=>String(d.bName)===String(n));
    const bWar=isHybrid?wbdContext.calcBatterWAR(n):0;
    let war;
    if(pitcherMode==='batter') war=bWar;
    else if(pitcherMode==='total') war=pWar+bWar;
    else war=pWar;
    const _ps=wbdContext._getPitcherSeason(n);
    const ip=Math.round(_ps.ip||pd.length/15);
    rows.push({
      name:n, type:'pitcher',
      posInnings:{0:ip}, totalInnings:ip,
      team:wbdContext._playerTeam(n,'pitcher'),
      primary:{pos:0,name:'P',long:'투수',innings:ip},
      OVR:card.OVR, WAR:war, pWar, bWar, isHybrid, lowData:card.lowData
    });
  });

  let html='';
  if(posFilter==='all'){
    // 전체 요약: 주 포지션별 선수 목록
    const byPrimary={};
    rows.forEach(r=>{
      if(!r.primary)return;
      const key=r.primary.pos;
      if(!byPrimary[key])byPrimary[key]=[];
      byPrimary[key].push(r);
    });
    html+='<div class="grid3 section" style="gap:12px">';
    [0,1,2,3,4,5,6,7,8,9].forEach(pos=>{
      const players=byPrimary[pos]||[];
      if(players.length===0)return;
      players.sort((a,b)=>(b.posInnings[pos]||0)-(a.posInnings[pos]||0));
      html+=`<div class="card">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--border)">
          <div style="width:32px;height:32px;background:${wbdContext.POS_COLORS[pos]}22;border:2px solid ${wbdContext.POS_COLORS[pos]};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:${wbdContext.POS_COLORS[pos]};font-family:var(--mono)">${wbdContext.POS_NAMES[pos]}</div>
          <div>
            <div style="font-size:13px;font-weight:700">${wbdContext.POS_LONG[pos]}</div>
            <div style="font-size:10px;color:var(--muted)">${players.length}명</div>
          </div>
        </div>
        <div style="font-size:11px">`;
      players.slice(0,8).forEach((p,i)=>{
        const ovrCol=wbdContext.cardOvrColor(p.OVR);
        const goto=p.type==='pitcher'?`goToPitcher('${String(p.name).replace(/'/g,"\\'")}')`:`goToBatter('${String(p.name).replace(/'/g,"\\'")}')`;
        html+=`<div onclick="${goto}" style="display:grid;grid-template-columns:auto 1fr auto auto auto;gap:6px;align-items:center;padding:4px 0;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.03)" onmouseover="this.style.background='var(--card2)'" onmouseout="this.style.background=''">
          <span style="color:var(--muted);font-size:10px;width:16px">${i+1}</span>
          <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</span>
          <span title="OVR" style="font-family:var(--mono);color:${ovrCol};font-weight:700;font-size:10px">${p.OVR}</span>
          <span title="${p.type==='pitcher'?'투수 WAR':'타자 WAR'}" style="font-family:var(--mono);color:var(--amber);font-weight:700;font-size:10px">${p.WAR.toFixed(2)}</span>
          <span style="font-family:var(--mono);color:${wbdContext.POS_COLORS[pos]};font-weight:700;font-size:10px">${p.posInnings[pos]}ip</span>
        </div>`;
      });
      if(players.length>8)html+=`<div style="text-align:center;color:var(--muted);font-size:10px;padding:4px 0">+${players.length-8}명</div>`;
      html+=`<div style="margin-top:6px;padding-top:4px;border-top:1px dashed rgba(255,255,255,0.05);display:flex;justify-content:space-between;font-size:9px;color:var(--muted)"><span>OVR · WAR · 이닝</span></div>`;
      html+='</div></div>';
    });
    html+='</div>';

    // 멀티 포지션 선수 테이블
    const multiPos=rows.filter(r=>Object.keys(r.posInnings).filter(p=>+p!==9).length>=2);
    multiPos.forEach(r=>{
      r.posCount=Object.keys(r.posInnings).filter(p=>+p!==9).length;
    });
    multiPos.sort((a,b)=>b.posCount-a.posCount||b.totalInnings-a.totalInnings);
    if(multiPos.length>0){
      html+='<div class="card section"><div class="card-title">🔄 유틸리티 플레이어 (여러 포지션)</div>';
      html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>이름</th><th>팀</th><th>주 포지션</th><th>OVR</th><th>WAR</th><th>포지션 수</th><th>총 이닝</th><th>포지션 분포</th></tr></thead><tbody>';
      multiPos.slice(0,15).forEach((r,i)=>{
        const posBadges=Object.entries(r.posInnings).filter(([p,_])=>+p!==9).sort((a,b)=>b[1]-a[1]).map(([p,inn])=>
          `<span style="display:inline-block;padding:2px 6px;margin-right:4px;background:${wbdContext.POS_COLORS[+p]}22;border:1px solid ${wbdContext.POS_COLORS[+p]};border-radius:3px;font-size:10px;font-weight:600;color:${wbdContext.POS_COLORS[+p]};font-family:var(--mono)">${wbdContext.POS_NAMES[+p]} ${inn}</span>`
        ).join('');
        const ovrCol=wbdContext.cardOvrColor(r.OVR);
        html+=`<tr onclick="goToBatter('${String(r.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
          <td>${i+1}</td>
          <td style="font-weight:600">${r.name}</td>
          <td style="color:var(--muted);font-size:11px">${r.team}</td>
          <td><span style="color:${wbdContext.POS_COLORS[r.primary.pos]};font-family:var(--mono);font-weight:700">${r.primary.name}</span></td>
          <td style="font-family:var(--mono);color:${ovrCol};font-weight:700">${r.OVR}</td>
          <td style="font-family:var(--mono);color:var(--amber);font-weight:700">${r.WAR.toFixed(2)}</td>
          <td style="font-family:var(--mono);color:var(--amber);font-weight:700">${r.posCount}개</td>
          <td style="font-family:var(--mono)">${r.totalInnings}</td>
          <td>${posBadges}</td>
        </tr>`;
      });
      html+='</tbody></table></div></div>';
    }
  } else {
    // 특정 포지션만
    const pos=+posFilter;
    let filtered=rows.filter(r=>(r.posInnings[pos]||0)>0);
    
    // 정렬 상태 (클릭 헤더)
    const sortKey=window.fieldingSortKey||'posInn';  // posInn (기본), name, team, OVR, WAR, total, pct
    const sortDir=window.fieldingSortDir||'desc';    // desc / asc
    
    filtered.sort((a,b)=>{
      let va, vb;
      if(sortKey==='name'){ va=a.name; vb=b.name; return sortDir==='asc'?String(va).localeCompare(vb,'ko'):String(vb).localeCompare(va,'ko'); }
      if(sortKey==='team'){ va=a.team||''; vb=b.team||''; return sortDir==='asc'?String(va).localeCompare(vb):String(vb).localeCompare(va); }
      if(sortKey==='primary'){ va=a.primary?.pos||0; vb=b.primary?.pos||0; }
      else if(sortKey==='OVR'){ va=a.OVR||0; vb=b.OVR||0; }
      else if(sortKey==='WAR'){ va=a.WAR||0; vb=b.WAR||0; }
      else if(sortKey==='total'){ va=a.totalInnings||0; vb=b.totalInnings||0; }
      else if(sortKey==='pct'){ 
        va=a.totalInnings?(a.posInnings[pos]||0)/a.totalInnings:0;
        vb=b.totalInnings?(b.posInnings[pos]||0)/b.totalInnings:0;
      }
      else { va=a.posInnings[pos]||0; vb=b.posInnings[pos]||0; }  // posInn 기본
      return sortDir==='asc'?va-vb:vb-va;
    });
    
    const arrow=k=>sortKey===k?(sortDir==='asc'?' ▲':' ▼'):'';
    const sortBtn=(k,label)=>`<th onclick="setFieldingSort('${k}')" style="cursor:pointer;user-select:none" title="클릭하여 정렬">${label}${arrow(k)}</th>`;
    
    html+=`<div class="card section">
      <div class="card-title" style="display:flex;align-items:center;gap:10px">
        <div style="width:32px;height:32px;background:${wbdContext.POS_COLORS[pos]}22;border:2px solid ${wbdContext.POS_COLORS[pos]};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:900;color:${wbdContext.POS_COLORS[pos]};font-family:var(--mono)">${wbdContext.POS_NAMES[pos]}</div>
        <span>${wbdContext.POS_LONG[pos]} · ${filtered.length}명 출전</span>
        <span style="margin-left:auto;font-size:10px;color:var(--muted)">컬럼 헤더 클릭으로 정렬</span>
      </div>`;
    html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th>'
      +sortBtn('name','이름')+sortBtn('team','팀')+sortBtn('primary','주 포지션')
      +sortBtn('OVR','OVR')+sortBtn('WAR','WAR')+sortBtn('posInn',wbdContext.POS_LONG[pos]+' 이닝')
      +sortBtn('total','총 이닝')+sortBtn('pct','비중')
      +'</tr></thead><tbody>';
    filtered.forEach((r,i)=>{
      const rank=i+1, medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
      const posInn=r.posInnings[pos]||0;
      const pct=r.totalInnings?(posInn/r.totalInnings*100).toFixed(0):0;
      const ovrCol=wbdContext.cardOvrColor(r.OVR);
      const goto=r.type==='pitcher'?`goToPitcher('${String(r.name).replace(/'/g,"\\'")}')`:`goToBatter('${String(r.name).replace(/'/g,"\\'")}')`;
      html+=`<tr onclick="${goto}" style="cursor:pointer">
        <td style="text-align:center">${medal}</td>
        <td style="font-weight:600">${r.name}</td>
        <td style="color:var(--muted);font-size:11px">${r.team}</td>
        <td><span style="color:${wbdContext.POS_COLORS[r.primary.pos]};font-family:var(--mono);font-weight:700">${r.primary.name}</span></td>
        <td style="font-family:var(--mono);color:${ovrCol};font-weight:700">${r.OVR}</td>
        <td title="${r.type==='pitcher'?'투수 WAR':'타자 WAR'}" style="font-family:var(--mono);color:var(--amber);font-weight:700">${r.WAR.toFixed(2)}</td>
        <td style="font-family:var(--mono);color:${wbdContext.POS_COLORS[pos]};font-size:16px;font-weight:700">${posInn}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.totalInnings}</td>
        <td style="font-family:var(--mono);color:var(--amber)">${pct}%</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  return html;
};

// Original index.html:34532
wbdContext.renderPlayerFieldingSection = function renderPlayerFieldingSection(name){
  const {posInnings,totalInnings}=wbdContext.calcFieldingInnings(name);
  if(totalInnings===0)return '';
  const primary=wbdContext.getPrimaryPosition(name);
  const sorted=Object.entries(posInnings).sort((a,b)=>b[1]-a[1]);
  const maxInn=Math.max(...sorted.map(([_,n])=>n));

  let html=`<div class="card section"><div class="card-title">🥎 수비 포지션별 이닝 (총 ${totalInnings}이닝)</div>`;
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">';
  sorted.forEach(([pos,inn])=>{
    const posNum=+pos;
    const col=wbdContext.POS_COLORS[posNum];
    const pct=(inn/totalInnings*100).toFixed(0);
    const barW=(inn/maxInn*100).toFixed(0);
    const isPrimary=primary&&primary.pos===posNum;
    html+=`<div style="background:var(--card2);border:1px solid ${isPrimary?col:'var(--border)'};border-radius:6px;padding:10px${isPrimary?`;box-shadow:0 0 8px ${col}55`:''}">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:24px;height:24px;background:${col}22;border:1.5px solid ${col};border-radius:50%;display:flex;align-items:center;justify-content:center;color:${col};font-weight:900;font-size:10px;font-family:var(--mono)">${wbdContext.POS_NAMES[posNum]}</div>
          <span style="font-size:12px;font-weight:600">${wbdContext.POS_LONG[posNum]}</span>
          ${isPrimary?'<span style="font-size:9px;color:var(--amber);background:var(--amber)22;padding:1px 4px;border-radius:2px">주</span>':''}
        </div>
        <span style="font-size:13px;font-family:var(--mono);color:${col};font-weight:700">${inn}</span>
      </div>
      <div style="height:4px;background:#1a2030;border-radius:2px;overflow:hidden;margin-bottom:4px">
        <div style="height:100%;width:${barW}%;background:${col};border-radius:2px"></div>
      </div>
      <div style="font-size:10px;color:var(--muted);text-align:right">${pct}%</div>
    </div>`;
  });
  html+='</div></div>';
  return html;
};

// Original index.html:34568
wbdContext.setFieldingFilter = function setFieldingFilter(pos){
  window.fieldingPosFilter=pos;
  wbdContext.renderInsightsPage();
};

// Original index.html:34579
wbdContext.setFieldingSort = function setFieldingSort(k){
  if(window.fieldingSortKey===k){
    window.fieldingSortDir=window.fieldingSortDir==='desc'?'asc':'desc';
  } else {
    window.fieldingSortKey=k;
    window.fieldingSortDir='desc';
  }
  wbdContext.renderInsightsPage();
};

// Original index.html:34588
wbdContext.setFieldingMinLevel = function setFieldingMinLevel(l){window.fieldingMinLevel=l;wbdContext.renderInsightsPage();};

// Original index.html:34589
wbdContext.setFieldingCustom = function setFieldingCustom(field,v){
  v=Math.max(0,+v||0);
  if(field==='ab')window.fieldingCustomAb=v;
  else if(field==='pitch')window.fieldingCustomPitch=v;
  else if(field==='innings')window.fieldingCustomInnings=v;
  if(window.fieldingMinLevel==='custom')wbdContext.renderInsightsPage();
};

// Original index.html:34604
wbdContext._getFieldingMin = function _getFieldingMin(){
  const lv=window.fieldingMinLevel||'normal';
  if(lv==='custom')return {ab:window.fieldingCustomAb,pitch:window.fieldingCustomPitch,innings:window.fieldingCustomInnings,label:'직접'};
  return wbdContext.FIELDING_MIN_PRESETS[lv]||wbdContext.FIELDING_MIN_PRESETS.normal;
};

// Original index.html:34612
wbdContext.renderFieldingSection = function renderFieldingSection(){
  const current=window.fieldingPosFilter||'all';
  const minLevel=window.fieldingMinLevel||'normal';
  const cur=wbdContext._getFieldingMin();
  const pitcherMode=window.bestLineupPitcherMode||'pitcher';
  
  // 공통 최소 기준 토글
  let html='<div class="card section" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
  html+='<span style="font-size:12px;color:var(--muted);font-weight:600">📏 최소 기준:</span>';
  ['veryloose','loose','normal','strict','verystrict'].forEach(l=>{
    const T=wbdContext.FIELDING_MIN_PRESETS[l];
    const active=minLevel===l?' active':'';
    html+=`<button class="stab${active}" onclick="setFieldingMinLevel('${l}')" style="font-size:11px" title="타석 ${T.ab}+ / 투구 ${T.pitch}+ / 출전 ${T.innings}이닝+">${T.label}</button>`;
  });
  html+=`<button class="stab${minLevel==='all'?' active':''}" onclick="setFieldingMinLevel('all')" style="font-size:11px;${minLevel==='all'?'border-color:var(--amber);color:var(--amber)':''}">🌐 전체</button>`;
  html+=`<button class="stab${minLevel==='custom'?' active':''}" onclick="setFieldingMinLevel('custom')" style="font-size:11px;${minLevel==='custom'?'border-color:#aa88ff;color:#aa88ff':''}">⚙️ 직접</button>`;
  html+=`<span style="margin-left:auto;font-size:10px;color:var(--muted);font-family:var(--mono)">현재: ${cur.label} (타석 ${cur.ab}+ / 투구 ${cur.pitch}+ / 이닝 ${cur.innings}+)</span>`;
  html+='</div>';
  
  // 직접 설정 입력
  if(minLevel==='custom'){
    html+=`<div class="card section" style="margin-bottom:14px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">
      <span style="font-size:12px;color:#aa88ff;font-weight:600">⚙️ 직접 설정:</span>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">최소 타석 <input type="number" min="0" value="${window.fieldingCustomAb}" onchange="setFieldingCustom('ab',this.value)" style="width:64px;padding:4px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-family:var(--mono)"></label>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">최소 투구 <input type="number" min="0" value="${window.fieldingCustomPitch}" onchange="setFieldingCustom('pitch',this.value)" style="width:64px;padding:4px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-family:var(--mono)"></label>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)">최소 이닝 <input type="number" min="0" value="${window.fieldingCustomInnings}" onchange="setFieldingCustom('innings',this.value)" style="width:64px;padding:4px;background:var(--card2);border:1px solid var(--border);color:var(--text);font-family:var(--mono)"></label>
    </div>`;
  }
  
  // 투수 WAR 평가 모드 (투타 겸업 처리)
  html+='<div class="card section" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
  html+='<span style="font-size:12px;color:var(--muted);font-weight:600">⚾ 투수(P) 평가 기준:</span>';
  html+=`<button class="stab${pitcherMode==='pitcher'?' active':''}" onclick="window.bestLineupPitcherMode='pitcher';renderInsightsPage()" style="font-size:11px;${pitcherMode==='pitcher'?'border-color:#88ccff;color:#88ccff':''}" title="100% 투수 성적만 (기본)">⚾ 투수 WAR</button>`;
  html+=`<button class="stab${pitcherMode==='batter'?' active':''}" onclick="window.bestLineupPitcherMode='batter';renderInsightsPage()" style="font-size:11px;${pitcherMode==='batter'?'border-color:#ff6b8a;color:#ff6b8a':''}" title="타자 WAR로 평가">🏏 타자 WAR</button>`;
  html+=`<button class="stab${pitcherMode==='total'?' active':''}" onclick="window.bestLineupPitcherMode='total';renderInsightsPage()" style="font-size:11px;${pitcherMode==='total'?'border-color:#cc44ff;color:#cc44ff':''}" title="투수+타자 합산 WAR">⚔️ 투타 합산</button>`;
  html+=`<span style="margin-left:auto;font-size:10px;color:var(--muted)">투타 겸업 선수의 평가 기준</span>`;
  html+='</div>';
  
  // Best Lineup
  html+=wbdContext.renderBestLineup();
  html+='<div class="card-title" style="margin:24px 0 10px;font-size:16px">📊 포지션별 상세 이닝</div>';
  html+='<div class="filter-row" style="margin-bottom:16px;flex-wrap:wrap">';
  html+=`<button class="stab${current==='all'?' active':''}" onclick="setFieldingFilter('all')">🏟️ 전체</button>`;
  [0,1,2,3,4,5,6,7,8,9].forEach(pos=>{
    const active=current==String(pos)?' active':'';
    html+=`<button class="stab${active}" onclick="setFieldingFilter('${pos}')" style="border-color:${wbdContext.POS_COLORS[pos]}${current==String(pos)?';background:'+wbdContext.POS_COLORS[pos]+'22':''}">${wbdContext.POS_NAMES[pos]} <span style="font-size:9px;color:var(--muted);margin-left:4px">${wbdContext.POS_LONG[pos]}</span></button>`;
  });
  html+='</div>';
  html+=wbdContext.renderFieldingLeaderboard(current);
  return html;
};
}

export function initialize(wbdContext) {
// Original index.html:34208
window.addEventListener('load',()=>{
  // 약간 딜레이 후 시도 (데이터 준비 시간)
  setTimeout(()=>{if(location.hash.startsWith('#s='))wbdContext.applyShareURL();},500);
  // 팀 공략: #scoutlab 해시 딥링크
  setTimeout(()=>{if(location.hash==='#scoutlab' && typeof wbdContext.showPage==='function')wbdContext.showPage('scoutlab');},700);
});

// Original index.html:34214
window.addEventListener('hashchange',()=>{ if(location.hash==='#scoutlab' && typeof wbdContext.showPage==='function')wbdContext.showPage('scoutlab'); });

// Original index.html:34218
document.addEventListener('click',(e)=>{
  document.querySelectorAll('.filter-tools-menu.open').forEach(m=>{
    if(!m.contains(e.target))m.classList.remove('open');
  });
});

// Original index.html:34224
window.addEventListener('popstate',(e)=>{
  if(e.state && e.state.page){
    window._suppressHistory=true;
    window._historyIndex=e.state.idx;
    wbdContext.showPage(e.state.page,true);  // _internal=true → 히스토리에 다시 추가 안 함
    window._suppressHistory=false;
  }
});

// Original index.html:34234
document.addEventListener('keydown',(e)=>{
  // input/textarea/contenteditable 안에서는 무시
  const tag=e.target.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||e.target.isContentEditable)return;
  // ESC: 모달 닫기
  if(e.key==='Escape'){
    const overlay=document.getElementById('modal-overlay');
    if(overlay && overlay.classList.contains('open')){
      wbdContext.closeModal();
      e.preventDefault();
      return;
    }
    const quickTG=document.getElementById('quick-tg-modal');
    if(quickTG){
      wbdContext.closeQuickTGEdit();
      e.preventDefault();
      return;
    }
  }
  // /: 글로벌 검색 열기 + 포커스
  if(e.key==='/'){
    e.preventDefault();
    const search=document.getElementById('global-search-input');
    if(search && search.offsetParent!==null){
      // 이미 열려있으면 포커스만
      search.focus();
      search.select();
    } else if(typeof wbdContext.openGlobalSearch==='function'){
      // 닫혀있으면 모달 열기 (openGlobalSearch가 알아서 포커스함)
      wbdContext.openGlobalSearch();
    }
    return;
  }
  // ?: 키보드 단축키 도움말
  if(e.key==='?' && !e.ctrlKey && !e.metaKey){
    if(typeof wbdContext.openShortcutsModal==='function'){
      wbdContext.openShortcutsModal();
      e.preventDefault();
    }
    return;
  }
  // 숫자 1-9: 페이지 전환
  if(e.key>='1' && e.key<='9' && !e.ctrlKey && !e.metaKey && !e.altKey){
    const pages=['home','pitcher','batter','cards','leaderboard','team','compare','awards','insights'];
    const idx=parseInt(e.key)-1;
    if(pages[idx]){wbdContext.showPage(pages[idx]);e.preventDefault();}
    return;
  }
  // Alt+←: 뒤로
  if(e.key==='ArrowLeft' && e.altKey){
    history.back();
    e.preventDefault();
  }
  // Alt+→: 앞으로
  if(e.key==='ArrowRight' && e.altKey){
    history.forward();
    e.preventDefault();
  }
});

// Original index.html:34300
wbdContext.POS_NAMES = {0:'P',1:'C',2:'1B',3:'2B',4:'3B',5:'SS',6:'LF',7:'CF',8:'RF',9:'DH'};

// Original index.html:34301
wbdContext.POS_LONG = {0:'투수',1:'포수',2:'1루수',3:'2루수',4:'3루수',5:'유격수',6:'좌익수',7:'중견수',8:'우익수',9:'지명타자'};

// Original index.html:34302
wbdContext.POS_COLORS = {0:'#ff4560',1:'#ffd700',2:'#39ff8a',3:'#44aaff',4:'#cc44ff',5:'#ff8800',6:'#88dd77',7:'#2196f3',8:'#f5a623',9:'#8896ad'};

// Original index.html:34567
window.fieldingPosFilter=window.fieldingPosFilter||'all';

// Original index.html:34572
window.fieldingMinLevel=window.fieldingMinLevel||'normal';

// Original index.html:34573
window.fieldingCustomAb=window.fieldingCustomAb||30;

// Original index.html:34574
window.fieldingCustomPitch=window.fieldingCustomPitch||50;

// Original index.html:34575
window.fieldingCustomInnings=window.fieldingCustomInnings||10;

// Original index.html:34577
window.fieldingSortKey=window.fieldingSortKey||'posInn';

// Original index.html:34578
window.fieldingSortDir=window.fieldingSortDir||'desc';

// Original index.html:34596
wbdContext.FIELDING_MIN_PRESETS = {
  veryloose: {ab:10,  pitch:20,  innings:3,   label:'매우 널널'},
  loose:     {ab:20,  pitch:35,  innings:7,   label:'널널'},
  normal:    {ab:30,  pitch:50,  innings:10,  label:'보통'},
  strict:    {ab:60,  pitch:100, innings:20,  label:'엄격'},
  verystrict:{ab:100, pitch:170, innings:35,  label:'매우 엄격'},
  all:       {ab:0,   pitch:0,   innings:0,   label:'전체 (기준 없음)'}
};

// Original index.html:34610
wbdContext.FIELDING_MIN = new Proxy({}, {get:(_,k)=>wbdContext.FIELDING_MIN_PRESETS[k]||wbdContext._getFieldingMin()});
}
