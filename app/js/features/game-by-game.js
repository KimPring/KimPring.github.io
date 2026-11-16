/** game-by-game: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:35352
wbdContext.renderPitcherGameByGame = function renderPitcherGameByGame(){
  const el=document.getElementById('p-game-by-game');
  if(!el)return;
  const name=wbdContext.currentPitcher;
  if(!name){el.innerHTML='<div style="padding:20px;color:var(--muted)">투수를 선택해주세요</div>';return;}
  
  // 활성 게임을 날짜순(최신 위)
  const games=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).map(g=>{
    const info=wbdContext._parseGameName(g.name);
    return {g,info,date:info.date||''};
  }).sort((a,b)=>b.date.localeCompare(a.date));
  
  // 각 게임에서 이 투수의 통계
  const rows=[];
  let totalIp=0, totalRuns=0, totalH=0, totalHr=0, totalK=0, totalBB=0, totalOuts=0, totalPit=0, gamesPitched=0;
  
  games.forEach(({g,info,date})=>{
    const gs=wbdContext._getCachedPitcherStats(g.id);
      if(!gs)return;
          const s=gs[name];
    if(!s)return;
    gamesPitched++;
    totalOuts+=s.outs; totalRuns+=s.runs; totalH+=s.hits; totalHr+=s.hrs;
    totalK+=s.ks; totalBB+=s.bbs; totalPit+=s.pitches;
    rows.push({date,info,s});
  });
  totalIp=totalOuts/3;
  
  if(rows.length===0){el.innerHTML='<div style="padding:20px;color:var(--muted)">활성 경기에서 등판 기록이 없어요</div>';return;}
  
  const seasonEra=totalIp>0?(totalRuns/totalIp*9).toFixed(2):'-';
  const seasonWhip=totalIp>0?((totalH+totalBB)/totalIp).toFixed(2):'-';
  const seasonIpDisp=Math.floor(totalIp)+'.'+(totalOuts%3);
  
  let html=`<div style="display:flex;gap:18px;flex-wrap:wrap;padding:14px;background:#0a1828;border:1px solid var(--border);border-radius:6px;margin-bottom:14px">
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">등판</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${gamesPitched}경기</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">총 IP</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#39ff8a">${seasonIpDisp}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">ERA</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#ff4560">${seasonEra}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">WHIP</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#ff8800">${seasonWhip}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">실점</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalRuns}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">K-BB</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalK}-${totalBB}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">피안타-피홈런</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalH}-${totalHr}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">총 투구</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalPit}</div></div>
  </div>`;
  
  // 정렬 적용
  const dataRows=rows.map(({date,info,s})=>({
    date:date||'', oppLabel:`vs ${info.teamA}/${info.teamB}`,
    ip:s.outs, pitches:s.pitches, hits:s.hits, hrs:s.hrs, runs:s.runs, ks:s.ks, bbs:s.bbs,
    era:s.era, whip:s.whip, _orig:{date,info,s}
  }));
  const sorted=wbdContext._applyTblSort('p-game-by-game', dataRows, (r,k)=>{
    if(k==='oppLabel') return r.oppLabel;
    if(k==='date') return r.date;
    return r[k];
  });
  const sh=(k,l)=>wbdContext._sortHeader('p-game-by-game',k,l,'renderPitcherGameByGame');
  html+=`<div class="tbl-wrap"><table class="data-table"><thead><tr>
    ${sh('date','날짜')}${sh('oppLabel','상대')}${sh('ip','IP')}${sh('pitches','투구')}${sh('hits','피안타')}${sh('hrs','피HR')}${sh('runs','실점')}${sh('ks','K')}${sh('bbs','BB')}${sh('era','ERA')}${sh('whip','WHIP')}
  </tr></thead><tbody>`;
  
  sorted.forEach(r=>{
    const {date,info,s}=r._orig;
    const eraCol=s.era<=2?'#39ff8a':s.era<=4?'#88cc44':s.era<=6?'#ff8800':'#ff4560';
    html+=`<tr>
      <td style="font-family:var(--mono);font-size:11px">${date||'-'}</td>
      <td style="font-size:11px">vs ${info.teamA}/${info.teamB}</td>
      <td style="font-family:var(--mono);color:#39ff8a">${s.ipDisp}</td>
      <td style="font-family:var(--mono)">${s.pitches}</td>
      <td style="font-family:var(--mono)">${s.hits}</td>
      <td style="font-family:var(--mono);color:${s.hrs>0?'#ff4560':'var(--muted)'}">${s.hrs}</td>
      <td style="font-family:var(--mono);color:${s.runs>0?'#ff4560':'var(--text)'};font-weight:700">${s.runs}</td>
      <td style="font-family:var(--mono);color:#ff8800">${s.ks}</td>
      <td style="font-family:var(--mono);color:${s.bbs>0?'#ff8800':'var(--muted)'}">${s.bbs}</td>
      <td style="font-family:var(--mono);color:${eraCol};font-weight:700">${s.era.toFixed(2)}</td>
      <td style="font-family:var(--mono);color:${s.whip<=1.2?'#39ff8a':s.whip<=1.5?'#88cc44':'#ff8800'}">${s.whip.toFixed(2)}</td>
    </tr>`;
  });
  html+='</tbody></table></div>';
  
  el.innerHTML=html;
};

// Original index.html:35436
wbdContext.renderBatterGameByGame = function renderBatterGameByGame(){
  const el=document.getElementById('b-game-by-game');
  if(!el)return;
  const name=wbdContext.currentBatter;
  if(!name){el.innerHTML='<div style="padding:20px;color:var(--muted)">타자를 선택해주세요</div>';return;}
  
  const games=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).map(g=>{
    const info=wbdContext._parseGameName(g.name);
    return {g,info,date:info.date||''};
  }).sort((a,b)=>b.date.localeCompare(a.date));
  
  const rows=[];
  let totalAB=0, totalH=0, totalHr=0, totalBB=0, totalK=0, totalPit=0, gamesPlayed=0;
  
  games.forEach(({g,info,date})=>{
    const bs=wbdContext._getCachedBatterStats(g.id);
    if(!bs)return;
    const s=bs[name];
    if(!s||s.pitches<3)return;
    gamesPlayed++;
    totalAB+=s.ab; totalH+=s.hits; totalHr+=s.hrs; totalBB+=s.bbs; totalK+=s.ks; totalPit+=s.pitches;
    rows.push({date,info,s});
  });
  
  if(rows.length===0){el.innerHTML='<div style="padding:20px;color:var(--muted)">활성 경기에서 출장 기록이 없어요</div>';return;}
  
  const seasonBA=totalAB>0?(totalH/totalAB).toFixed(3).replace(/^0/,''):'-';
  const seasonSLG=totalAB>0?((totalH+totalHr*3)/totalAB).toFixed(3).replace(/^0/,''):'-';
  
  let html=`<div style="display:flex;gap:18px;flex-wrap:wrap;padding:14px;background:#0a1828;border:1px solid var(--border);border-radius:6px;margin-bottom:14px">
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">출장</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${gamesPlayed}경기</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">타수</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalAB}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">안타</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#39ff8a">${totalH}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">홈런</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#ffd700">${totalHr}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">타율</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#39ff8a">${seasonBA}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">장타율</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;color:#ff8800">${seasonSLG}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">BB-K</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalBB}-${totalK}</div></div>
    <div><div style="font-size:10px;color:var(--muted);text-transform:uppercase">총 투구상대</div><div style="font-family:var(--mono);font-size:18px;font-weight:700">${totalPit}</div></div>
  </div>`;
  
  // 정렬 적용
  const dataRows=rows.map(({date,info,s})=>({
    date:date||'', oppLabel:`vs ${info.teamA}/${info.teamB}`,
    ab:s.ab, hits:s.hits, hrs:s.hrs, bbs:s.bbs, ks:s.ks, ba:s.ba, slg:s.slg,
    _orig:{date,info,s}
  }));
  const sorted=wbdContext._applyTblSort('b-game-by-game', dataRows, (r,k)=>{
    if(k==='oppLabel') return r.oppLabel;
    if(k==='date') return r.date;
    return r[k];
  });
  const sh=(k,l)=>wbdContext._sortHeader('b-game-by-game',k,l,'renderBatterGameByGame');
  html+=`<div class="tbl-wrap"><table class="data-table"><thead><tr>
    ${sh('date','날짜')}${sh('oppLabel','상대')}${sh('ab','타수')}${sh('hits','안타')}${sh('hrs','HR')}${sh('bbs','BB')}${sh('ks','K')}${sh('ba','타율')}${sh('slg','장타율')}
  </tr></thead><tbody>`;
  
  sorted.forEach(r=>{
    const {date,info,s}=r._orig;
    const baCol=s.ba>=0.4?'#39ff8a':s.ba>=0.3?'#88cc44':s.ba>=0.2?'#ff8800':s.ab>0?'#ff4560':'var(--muted)';
    html+=`<tr>
      <td style="font-family:var(--mono);font-size:11px">${date||'-'}</td>
      <td style="font-size:11px">vs ${info.teamA}/${info.teamB}</td>
      <td style="font-family:var(--mono)">${s.ab}</td>
      <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${s.hits}</td>
      <td style="font-family:var(--mono);color:${s.hrs>0?'#ffd700':'var(--muted)'};font-weight:700">${s.hrs}</td>
      <td style="font-family:var(--mono);color:${s.bbs>0?'#88cc44':'var(--muted)'}">${s.bbs}</td>
      <td style="font-family:var(--mono);color:${s.ks>0?'#ff8800':'var(--muted)'}">${s.ks}</td>
      <td style="font-family:var(--mono);color:${baCol};font-weight:700">${s.baStr}</td>
      <td style="font-family:var(--mono);color:#ff8800">${s.slg.toFixed(3).replace(/^0/,'')}</td>
    </tr>`;
  });
  html+='</tbody></table></div>';
  
  el.innerHTML=html;
};

// Original index.html:35513
wbdContext.renderPotentialVelocity = function renderPotentialVelocity(){
  const el=document.getElementById('p-potential-velocity');
  if(!el)return;
  const name=wbdContext.currentPitcher;
  if(!name){el.innerHTML='<div style="padding:20px;color:var(--muted)">투수를 선택해주세요</div>';return;}
  
  const pd=wbdContext.getPitcherDataByName(name);
  if(pd.length===0){el.innerHTML='<div style="padding:20px;color:var(--muted)">데이터 없음</div>';return;}
  
  const fbGroups=['포심','투심','커터','패스트볼'];
  
  // 직구 평균/최고
  const fbPows=pd.filter(d=>+d.pPow>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.pPow);
  const fbSpds=pd.filter(d=>+d.spdK>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
  const avgFbPow=fbPows.length?fbPows.reduce((a,b)=>a+b,0)/fbPows.length:0;
  const maxFbPow=fbPows.length?fbPows.reduce((a,b)=>Math.max(a,b),0):0;
  const avgFbSpd=fbSpds.length?fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length:0;
  const maxFbSpd=fbSpds.length?fbSpds.reduce((a,b)=>Math.max(a,b),0):0;
  
  const fbKmhs=fbPows.map(p=>wbdContext._ppowToKmh(p));  // 개별 변환 (룩업 비선형 손실 방지)
  const uncappedAvg=fbKmhs.length?fbKmhs.reduce((a,b)=>a+b,0)/fbKmhs.length:0;
  const uncappedMax=wbdContext._ppowToKmh(maxFbPow);
  const diffAvg=uncappedAvg-avgFbSpd;
  const diffMax=uncappedMax-maxFbSpd;
  
  let html=`<div class="card section">
    <div class="card-title">🌟 잠재 구속 분석</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">
      게임 내 구속 캡(140km/h)이 풀렸을 때 추정되는 실제 구속.<br>
      📐 게임 룩업 테이블 직접 사용 (Legacy Norm 기준)<br>
      <span style="font-size:10px">검증: pPow 60 → 115 / pPow 86 → 140 / pPow 100 → 160 km/h</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:14px">
      <div style="padding:14px;background:#0a1828;border:1px solid var(--border);border-radius:6px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-bottom:4px">현재 평균 직구</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:900;color:#88ccff">${avgFbSpd?avgFbSpd.toFixed(1):'-'}<span style="font-size:14px;color:var(--muted)"> km/h</span></div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">원본 구력 평균 ${avgFbPow.toFixed(1)}</div>
      </div>
      <div style="padding:14px;background:#1a0f1a;border:1px solid #cc88ff;border-radius:6px">
        <div style="font-size:10px;color:#cc88ff;text-transform:uppercase;margin-bottom:4px">🌟 잠재 평균 직구</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:900;color:#cc88ff">${uncappedAvg?uncappedAvg.toFixed(1):'-'}<span style="font-size:14px;color:var(--muted)"> km/h</span></div>
        <div style="font-size:10px;color:#39ff8a;margin-top:2px">${diffAvg>0?'+':''}${diffAvg.toFixed(1)} km/h</div>
      </div>
      <div style="padding:14px;background:#0a1828;border:1px solid var(--border);border-radius:6px">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;margin-bottom:4px">현재 최고 구속</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:900;color:#ffcc44">${maxFbSpd||'-'}<span style="font-size:14px;color:var(--muted)"> km/h</span></div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px">원본 최고 ${maxFbPow}</div>
      </div>
      <div style="padding:14px;background:#1a0a14;border:1px solid #ff44cc;border-radius:6px">
        <div style="font-size:10px;color:#ff44cc;text-transform:uppercase;margin-bottom:4px">⚡ 잠재 최고 구속</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:900;color:#ff44cc">${uncappedMax?uncappedMax.toFixed(1):'-'}<span style="font-size:14px;color:var(--muted)"> km/h</span></div>
        <div style="font-size:10px;color:#39ff8a;margin-top:2px">${diffMax>0?'+':''}${diffMax.toFixed(1)} km/h</div>
      </div>
    </div>
  </div>`;
  
  // 구종별 잠재 구속 - 직구 계열만 (변화구는 구속 계산식 다름)
  const fbOnlyGroups=['포심','투심','커터','패스트볼'];
  const groupStats={};
  pd.forEach(d=>{
    const pp=+d.pPow, sp=+d.spdK;
    if(!(pp>0)||!(sp>0))return;  // NaN-safe
    const grp=wbdContext.pitchGroup(d.pType,d);
    if(!fbOnlyGroups.includes(grp))return;
    if(!groupStats[grp])groupStats[grp]={pows:[],spds:[]};
    groupStats[grp].pows.push(pp);
    groupStats[grp].spds.push(sp);
  });
  
  const groupRows=Object.entries(groupStats).filter(([_,data])=>data.pows.length>0).map(([grp,data])=>{
    const sumP=data.pows.reduce((a,b)=>a+b,0);
    const sumS=data.spds.reduce((a,b)=>a+b,0);
    const avgP=sumP/data.pows.length;
    const avgS=sumS/data.spds.length;
    const maxP=data.pows.reduce((a,b)=>Math.max(a,b),0);
    const maxS=data.spds.reduce((a,b)=>Math.max(a,b),0);
    const uncapAvg=avgP>0?wbdContext._ppowToKmh(avgP):0;
    const uncapMax=maxP>0?wbdContext._ppowToKmh(maxP):0;
    return {grp,n:data.pows.length,avgP,maxP,avgS,maxS,uncapAvg,uncapMax};
  }).sort((a,b)=>b.uncapAvg-a.uncapAvg);
  
  // 직구 통합 (모든 직구 계열 합산)
  const allFbPows=[], allFbSpds=[];
  Object.values(groupStats).forEach(data=>{
    allFbPows.push(...data.pows);
    allFbSpds.push(...data.spds);
  });
  let totalRow=null;
  if(allFbPows.length>0){
    const avgP=allFbPows.reduce((a,b)=>a+b,0)/allFbPows.length;
    const maxP=allFbPows.reduce((a,b)=>Math.max(a,b),0);
    const avgS=allFbSpds.reduce((a,b)=>a+b,0)/allFbSpds.length;
    const maxS=allFbSpds.reduce((a,b)=>Math.max(a,b),0);
    totalRow={grp:'⚾ 직구 통합',n:allFbPows.length,avgP,maxP,avgS,maxS,
      uncapAvg:avgP>0?wbdContext._ppowToKmh(avgP):0,
      uncapMax:maxP>0?wbdContext._ppowToKmh(maxP):0};
  }
  
  if(groupRows.length>0){
    html+=`<div class="card section">
      <div class="card-title">🎯 구종별 잠재 구속</div>
      <div class="tbl-wrap"><table class="data-table">
      <thead><tr>
        <th>구종</th><th>구수</th>
        <th>현재 평균</th><th>잠재 평균</th>
        <th>현재 최고</th><th>잠재 최고</th>
      </tr></thead><tbody>`;
    
    // 직구 통합 행 (맨 위, 강조)
    if(totalRow){
      const dAvg=totalRow.uncapAvg-totalRow.avgS;
      const dMax=totalRow.uncapMax-totalRow.maxS;
      const sign=v=>v>=0?'+':'';
      html+=`<tr style="background:#1a1230;border-top:2px solid var(--amber);border-bottom:2px solid var(--amber)">
        <td style="font-weight:700;color:var(--amber)">${totalRow.grp}</td>
        <td style="font-family:var(--mono);font-weight:700">${totalRow.n}</td>
        <td style="font-family:var(--mono);color:#88ccff;font-weight:700">${totalRow.avgS.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:#cc88ff;font-weight:700">${totalRow.uncapAvg.toFixed(1)} <span style="font-size:10px;color:${dAvg>=0?'#39ff8a':'#ff4560'}">(${sign(dAvg)}${dAvg.toFixed(1)})</span></td>
        <td style="font-family:var(--mono);color:#ffcc44;font-weight:700">${totalRow.maxS}</td>
        <td style="font-family:var(--mono);color:#ff44cc;font-weight:700">${totalRow.uncapMax.toFixed(1)} <span style="font-size:10px;color:${dMax>=0?'#39ff8a':'#ff4560'}">(${sign(dMax)}${dMax.toFixed(1)})</span></td>
      </tr>`;
    }
    
    // 구종별
    groupRows.forEach(r=>{
      const dAvg=r.uncapAvg-r.avgS;
      const dMax=r.uncapMax-r.maxS;
      const sign=v=>v>=0?'+':'';
      html+=`<tr>
        <td style="font-weight:600;color:${wbdContext.GROUP_COLORS[r.grp]||'var(--text)'}">${r.grp}</td>
        <td style="font-family:var(--mono)">${r.n}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.avgS.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:#cc88ff">${r.uncapAvg.toFixed(1)} <span style="font-size:10px;color:${dAvg>=0?'#39ff8a':'#ff4560'}">(${sign(dAvg)}${dAvg.toFixed(1)})</span></td>
        <td style="font-family:var(--mono);color:var(--muted)">${r.maxS}</td>
        <td style="font-family:var(--mono);color:#ff44cc">${r.uncapMax.toFixed(1)} <span style="font-size:10px;color:${dMax>=0?'#39ff8a':'#ff4560'}">(${sign(dMax)}${dMax.toFixed(1)})</span></td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 잠재 등급
  let grade='', gradeCol='', gradeDesc='';
  if(uncappedAvg>=160){grade='🏆 SS';gradeCol='#ff4560';gradeDesc='메이저리그 정상급';}
  else if(uncappedAvg>=150){grade='⭐ S';gradeCol='#ff8800';gradeDesc='파이어볼러';}
  else if(uncappedAvg>=140){grade='🔥 A';gradeCol='#ffcc44';gradeDesc='강속구 투수';}
  else if(uncappedAvg>=130){grade='✨ B';gradeCol='#88cc44';gradeDesc='평균 이상';}
  else if(uncappedAvg>=120){grade='💫 C';gradeCol='#88ccff';gradeDesc='보통';}
  else if(uncappedAvg>0){grade='○ D';gradeCol='var(--muted)';gradeDesc='기교파';}
  
  if(grade){
    html+=`<div class="card section" style="text-align:center;padding:24px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">잠재 구속 등급</div>
      <div style="font-size:48px;font-weight:900;color:${gradeCol};line-height:1">${grade}</div>
      <div style="font-size:14px;color:${gradeCol};margin-top:6px;font-weight:700">${gradeDesc}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:8px">잠재 평균 ${uncappedAvg.toFixed(1)} km/h 기준</div>
    </div>`;
  }
  
  el.innerHTML=html;
};
}

export function initialize(wbdContext) {

}
