/** team-simulation: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:31397
wbdContext._simulateMatch = function _simulateMatch(){
  const teams=window.MY_TEAMS.teams||[];
  if(teams.length<2){alert('팀이 2개 이상 필요합니다');return;}
  
  let html=`<div style="max-width:680px;margin:0 auto">
    <h2 style="margin:0 0 14px;color:var(--amber)">⚔️ 팀 대결 시뮬레이션</h2>
    <div class="grid2" style="margin-bottom:16px">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 A (홈)</div>
        <select id="sim-team-a" style="width:100%;background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:4px;font-size:13px">
          ${teams.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 B (원정)</div>
        <select id="sim-team-b" style="width:100%;background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:4px;font-size:13px">
          ${teams.map((t,i)=>`<option value="${t.id}"${i===1?' selected':''}>${t.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button onclick="_runSimulation(1)" style="flex:1;background:var(--card2);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:4px;font-size:12px;cursor:pointer">단일 경기</button>
      <button onclick="_runSimulation(100)" style="flex:1;background:linear-gradient(90deg,#f5a623,#ff6b8a);color:#000;border:none;padding:10px;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer">100경기 시뮬</button>
      <button onclick="_runSimulation(1000)" style="flex:1;background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:10px;border-radius:4px;font-size:13px;font-weight:700;cursor:pointer">1000경기 시뮬</button>
    </div>
    <div id="sim-result"></div>
  </div>`;
  wbdContext.openModal(html);
};

// Original index.html:31427
wbdContext._calcTeamPower = function _calcTeamPower(team){
  const lineup=team.lineup||{};
  const pName=lineup.P;
  const dhName=lineup.DH;
  // 타석에 서는 타자 = DH 있으면 8명+DH=9명, 없으면 8명+P=9명
  const fieldBatters=['C','1B','2B','3B','SS','LF','CF','RF'].map(p=>lineup[p]).filter(Boolean);
  const allBatters=dhName?[...fieldBatters,dhName]:[...fieldBatters,pName].filter(Boolean);
  
  const pCard=pName?wbdContext.calcPitcherCard(pName):null;
  const bCards=allBatters.map(n=>wbdContext.calcBatterCard(n)).filter(c=>c);
  const pStats=pCard?pCard.stats:null;
  const pitching=pCard?(pStats['구위']||50)*0.3 + (pStats['제구']||50)*0.25 + (pStats['탈삼진']||50)*0.25 + (pStats['안정성']||50)*0.2:50;
  const pitcherWar=pName?(wbdContext.calcPitcherWAR(pName)||0):0;
  const batting=bCards.length?bCards.reduce((s,c)=>{
    const st=c.stats;
    return s + (st['파워']||50)*0.25 + (st['컨택']||50)*0.3 + (st['갭파워']||50)*0.2 + (st['선구']||50)*0.15 + (st['스윗스팟']||50)*0.1;
  },0)/bCards.length:50;
  const batterWar=allBatters.reduce((s,n)=>s+(wbdContext.calcBatterWAR(n)||0),0);
  return {pitching,batting,pitcherWar,batterWar,full:!!pCard&&fieldBatters.length===8,hasDH:!!dhName};
};

// Original index.html:31448
wbdContext._simOneGame = function _simOneGame(powerA,powerB){
  const baseRunsA = 4.5 + (powerA.batting - powerB.pitching)*0.06 + (powerA.batterWar*0.05);
  const baseRunsB = 4.5 + (powerB.batting - powerA.pitching)*0.06 + (powerB.batterWar*0.05);
  const noise=()=>(Math.random()+Math.random()+Math.random()-1.5)*2.0;
  const runsA=Math.max(0,Math.round(baseRunsA+noise()));
  const runsB=Math.max(0,Math.round(baseRunsB+noise()));
  if(runsA===runsB){
    if(Math.random()<0.5+(powerA.batting-powerB.batting)*0.005)return {a:runsA+1,b:runsB};
    return {a:runsA,b:runsB+1};
  }
  return {a:runsA,b:runsB};
};

// Original index.html:31461
wbdContext._runSimulation = function _runSimulation(n){
  const idA=document.getElementById('sim-team-a').value;
  const idB=document.getElementById('sim-team-b').value;
  if(idA===idB){
    document.getElementById('sim-result').innerHTML='<div style="padding:20px;text-align:center;color:var(--red)">⚠ 같은 팀끼리 대결할 수 없어요</div>';
    return;
  }
  const teamA=window.MY_TEAMS.teams.find(t=>t.id===idA);
  const teamB=window.MY_TEAMS.teams.find(t=>t.id===idB);
  const powerA=wbdContext._calcTeamPower(teamA);
  const powerB=wbdContext._calcTeamPower(teamB);
  
  if(!powerA.full || !powerB.full){
    document.getElementById('sim-result').innerHTML=`<div style="padding:20px;text-align:center;color:#ffaa00;background:var(--card2);border-radius:6px">
      ⚠ 두 팀 모두 선발투수 1 + 야수 8명이 모두 채워져 있어야 해요.
      <div style="font-size:11px;color:var(--muted);margin-top:6px">${teamA.name}: ${powerA.full?'OK':'미완성'} / ${teamB.name}: ${powerB.full?'OK':'미완성'}</div>
    </div>`;
    return;
  }
  
  // 로딩 표시 (큰 시뮬에서)
  if(n>=100){
    document.getElementById('sim-result').innerHTML=`<div style="padding:30px;text-align:center;background:var(--card2);border-radius:6px">
      <div style="display:inline-block;width:40px;height:40px;border:4px solid var(--border);border-top-color:var(--amber);border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <div style="margin-top:14px;font-size:13px;color:var(--muted)">${n.toLocaleString()}경기 시뮬 중...</div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}

/* ━━━━━━━━━━ V10.1 SERVER UI / DATA HUB ━━━━━━━━━━ */
.data-hub{background:linear-gradient(135deg,rgba(13,31,58,.96),rgba(8,17,31,.98));border:1px solid var(--border);border-radius:10px;padding:16px;box-shadow:0 8px 22px rgba(0,0,0,.16)}
.data-hub-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.data-hub-title{display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.9px;color:var(--amber);font-size:15px}
.data-hub-sub{font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px}
.data-hub-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.data-hub-btn{background:rgba(255,255,255,.035);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 11px;font-size:11px;font-weight:700;letter-spacing:.5px;cursor:pointer}
.data-hub-btn:hover{border-color:var(--amber);color:var(--amber);background:rgba(245,166,35,.08)}
.data-hub-btn.primary{background:var(--amber);border-color:var(--amber);color:#000}
.data-hub-btn.danger{border-color:rgba(255,69,96,.75);color:#ff7890}
.data-hub-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin-bottom:14px}
.data-kpi{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:8px;padding:11px 12px;min-height:72px}
.data-kpi .label{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.data-kpi .val{font-family:var(--mono);font-size:23px;color:var(--amber)}
.data-kpi .sub{font-size:10px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.data-section-label{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin:12px 0 8px;display:flex;align-items:center;gap:6px}
.data-cat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.data-cat-card{background:var(--card2);border:1px solid var(--border);border-radius:9px;padding:11px 12px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.data-cat-card:hover{transform:translateY(-1px);border-color:var(--amber);background:rgba(245,166,35,.06)}
.data-cat-card.active-filter{border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.25) inset}
.data-cat-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.data-cat-name{font-size:13px;font-weight:800;color:var(--text)}
.data-cat-count{font-size:12px;color:var(--amber);font-family:var(--mono)}
.data-cat-sub{font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:4px}
.data-cat-progress{height:4px;background:rgba(255,255,255,.08);border-radius:999px;margin-top:9px;overflow:hidden}
.data-cat-progress span{display:block;height:100%;background:var(--amber);border-radius:999px;min-width:2px}
.data-chip-wrap{display:flex;gap:7px;flex-wrap:wrap}
.data-chip{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:11px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .12s}
.data-chip:hover{border-color:var(--amber);color:var(--text);background:rgba(245,166,35,.06)}
.data-chip.active{border-color:var(--amber);color:var(--amber);background:rgba(245,166,35,.10);font-weight:700}
.data-chip .cnt{font-family:var(--mono);color:var(--amber)}
.load-screen-progress{margin-top:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:rgba(255,255,255,.035)}
.load-screen-progress-bar{height:9px;background:linear-gradient(90deg,var(--amber),#ffd36b);width:0%;transition:width .18s ease}
.load-screen-progress-text{font-size:11px;color:var(--muted);font-family:var(--mono);padding:8px 10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
#dashboard-grid .game-card-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
@media(max-width:900px){.data-hub-kpis{grid-template-columns:repeat(2,1fr)}.data-cat-grid{grid-template-columns:1fr}.data-hub-actions{width:100%}.data-hub-btn{flex:1}.data-hub{padding:12px}}
@media(max-width:480px){.data-hub-kpis{grid-template-columns:1fr}.data-kpi{min-height:62px}.data-kpi .val{font-size:20px}}


/* ━━━━━━━━━━ V10.1 SERVER UI FINAL FIX ━━━━━━━━━━ */
.data-hub-final{background:linear-gradient(135deg,rgba(14,28,48,.98),rgba(7,15,27,.98));border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:0 10px 28px rgba(0,0,0,.22);overflow:hidden}
.dhf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.dhf-title{font-size:16px;font-weight:900;color:var(--amber);letter-spacing:1px;display:flex;align-items:center;gap:8px}
.dhf-sub{font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px;line-height:1.5}
.dhf-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.dhf-btn{background:rgba(255,255,255,.035);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:.4px;cursor:pointer;transition:all .12s;font-family:var(--cond)}
.dhf-btn:hover{border-color:var(--amber);color:var(--amber);background:rgba(245,166,35,.08)}
.dhf-btn.primary{background:var(--amber);border-color:var(--amber);color:#000}
.dhf-btn.danger{border-color:rgba(255,69,96,.75);color:#ff7890}
.dhf-btn.good{border-color:rgba(57,255,138,.55);color:#39ff8a}
.dhf-kpis{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin-bottom:14px}
.dhf-kpi{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:9px;padding:11px 12px;min-height:72px}
.dhf-kpi .l{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.dhf-kpi .v{font-family:var(--mono);font-size:24px;color:var(--amber);line-height:1.05}
.dhf-kpi .s{font-size:10px;color:var(--muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-label{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin:14px 0 8px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.dhf-cat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}
.dhf-card{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:11px 12px;transition:all .12s;position:relative;overflow:hidden}
.dhf-card:hover{border-color:var(--amber);background:rgba(245,166,35,.055)}
.dhf-card.active-view{border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.22) inset}
.dhf-card .top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}
.dhf-card .name{font-size:13px;font-weight:900;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-card .count{font-size:12px;color:var(--amber);font-family:var(--mono);white-space:nowrap}
.dhf-card .meta{font-size:10px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.dhf-progress{height:4px;background:rgba(255,255,255,.08);border-radius:999px;margin-top:9px;overflow:hidden}
.dhf-progress span{display:block;height:100%;background:var(--amber);border-radius:999px;min-width:2px}
.dhf-mini-actions{display:flex;gap:5px;margin-top:9px;flex-wrap:wrap}
.dhf-mini-actions .dhf-btn{padding:4px 8px;font-size:10px;border-radius:5px}
.dhf-group-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px;max-height:250px;overflow-y:auto;padding-right:4px}
.dhf-group-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;background:rgba(255,255,255,.027);border:1px solid var(--border);border-radius:9px;padding:9px 10px;transition:all .12s}
.dhf-group-card:hover{border-color:var(--amber);background:rgba(245,166,35,.045)}
.dhf-group-card.viewing{border-color:var(--amber)}
.dhf-group-card input{accent-color:var(--amber);cursor:pointer}
.dhf-group-main{min-width:0;cursor:pointer}
.dhf-group-name{font-size:12px;font-weight:900;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-group-meta{font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-badge{font-size:9px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:2px 6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;max-width:120px;overflow:hidden;text-overflow:ellipsis}
.dhf-note{font-size:10px;color:var(--muted);line-height:1.5;margin-top:8px;border-top:1px dashed var(--border);padding-top:8px}
.game-card-title,.game-team-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:980px){.dhf-kpis{grid-template-columns:repeat(2,1fr)}.dhf-actions{width:100%}.dhf-btn{flex:1}.dhf-group-grid{grid-template-columns:1fr}.dhf-cat-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dhf-kpis,.dhf-cat-grid{grid-template-columns:1fr}.dhf-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.dhf-btn{width:100%}}

</style>`;
    // 다음 tick에서 실행 (UI 반영 후)
    setTimeout(()=>wbdContext._runSimActual(idA,idB,n),20);
    return;
  }
  wbdContext._runSimActual(idA,idB,n);
};

// Original index.html:31579
wbdContext._runSimActual = function _runSimActual(idA,idB,n){
  const teamA=window.MY_TEAMS.teams.find(t=>t.id===idA);
  const teamB=window.MY_TEAMS.teams.find(t=>t.id===idB);
  const powerA=wbdContext._calcTeamPower(teamA);
  const powerB=wbdContext._calcTeamPower(teamB);

  let winsA=0, winsB=0, totalRunsA=0, totalRunsB=0, blowoutsA=0, blowoutsB=0;
  const results=[];
  for(let i=0;i<n;i++){
    const r=wbdContext._simOneGame(powerA,powerB);
    if(r.a>r.b)winsA++;else winsB++;
    totalRunsA+=r.a;totalRunsB+=r.b;
    if(r.a-r.b>=8)blowoutsA++;
    if(r.b-r.a>=8)blowoutsB++;
    if(i<5)results.push(r);
  }
  const avgRunsA=(totalRunsA/n).toFixed(2);
  const avgRunsB=(totalRunsB/n).toFixed(2);
  const winRateA=(winsA/n*100).toFixed(1);
  const winRateB=(winsB/n*100).toFixed(1);
  
  let html=`<div style="background:var(--card2);border-radius:6px;padding:14px;margin-top:14px">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px">
      <div style="flex:1;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 A${powerA.hasDH?' · DH':''}</div>
        <div style="font-size:16px;font-weight:700">${teamA.name}</div>
      </div>
      <div style="font-size:24px;color:var(--muted)">VS</div>
      <div style="flex:1;text-align:center">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 B${powerB.hasDH?' · DH':''}</div>
        <div style="font-size:16px;font-weight:700">${teamB.name}</div>
      </div>
    </div>
    <div style="margin-bottom:14px">
      <div style="display:flex;font-size:11px;margin-bottom:4px">
        <span style="flex:${winsA||1};color:#39ff8a;font-weight:700">${winRateA}% 승</span>
        <span style="flex:${winsB||1};text-align:right;color:#ff6b8a;font-weight:700">${winRateB}% 승</span>
      </div>
      <div style="display:flex;height:24px;border-radius:4px;overflow:hidden">
        <div style="flex:${winsA||0.01};background:linear-gradient(90deg,#39ff8a,#88cc44);display:flex;align-items:center;justify-content:flex-start;padding-left:8px;color:#000;font-weight:700;font-size:12px">${winsA}</div>
        <div style="flex:${winsB||0.01};background:linear-gradient(90deg,#ff6b8a,#cc4488);display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:#fff;font-weight:700;font-size:12px">${winsB}</div>
      </div>
    </div>
    <div class="grid2" style="gap:10px;margin-bottom:14px">
      <div style="background:var(--card);padding:10px;border-radius:4px;text-align:center">
        <div style="font-size:10px;color:var(--muted)">평균 득점</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:900;color:#39ff8a">${avgRunsA}</div>
      </div>
      <div style="background:var(--card);padding:10px;border-radius:4px;text-align:center">
        <div style="font-size:10px;color:var(--muted)">평균 득점</div>
        <div style="font-family:var(--mono);font-size:24px;font-weight:900;color:#ff6b8a">${avgRunsB}</div>
      </div>
    </div>
    ${blowoutsA||blowoutsB?`<div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:14px">8점 차 이상 대승: ${teamA.name} ${blowoutsA} · ${teamB.name} ${blowoutsB}</div>`:''}
    ${n>=5?`<div style="font-size:11px;color:var(--muted);margin-bottom:6px">샘플 경기 결과:</div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">
      ${results.map(r=>{
        const winner=r.a>r.b?'a':'b';
        return `<div style="background:var(--card);padding:6px 10px;border-radius:4px;font-family:var(--mono);font-size:12px"><span style="color:${winner==='a'?'#39ff8a':'var(--muted)'}">${r.a}</span> : <span style="color:${winner==='b'?'#ff6b8a':'var(--muted)'}">${r.b}</span></div>`;
      }).join('')}
    </div>`:''}
    <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);font-size:11px;color:var(--muted);display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div>${teamA.name}: 투 <b style="color:var(--text)">${powerA.pitching.toFixed(0)}</b> · 타 <b style="color:var(--text)">${powerA.batting.toFixed(0)}</b> · WAR <b style="color:var(--text)">${(powerA.pitcherWar+powerA.batterWar).toFixed(2)}</b></div>
      <div>${teamB.name}: 투 <b style="color:var(--text)">${powerB.pitching.toFixed(0)}</b> · 타 <b style="color:var(--text)">${powerB.batting.toFixed(0)}</b> · WAR <b style="color:var(--text)">${(powerB.pitcherWar+powerB.batterWar).toFixed(2)}</b></div>
    </div>
  </div>`;
  document.getElementById('sim-result').innerHTML=html;
};

// Original index.html:31648
wbdContext.renderInsightsPage = function renderInsightsPage(){
  const tab=window.activeInsightTab||0;
  const el=document.getElementById('insights-content');
  if(!el)return;
  if(tab===0)el.innerHTML=wbdContext.renderSeasonTrends();
  else if(tab===1)el.innerHTML=wbdContext.renderRivalries();
  else if(tab===2)el.innerHTML=wbdContext.renderClutch();
  else if(tab===3)el.innerHTML=wbdContext.renderHallOfFame();
  else if(tab===4)el.innerHTML=wbdContext.renderFieldingSection();
  else if(tab===5)el.innerHTML=wbdContext.renderRecentForm();
};

// Original index.html:31661
wbdContext.renderSeasonTrends = function renderSeasonTrends(){
  if(wbdContext.GAMES.length===0||wbdContext.G.length===0)return '<div style="padding:40px;text-align:center;color:var(--muted)">활성화된 경기가 없어요</div>';
  // 경기를 날짜순으로 정렬
  const gamesWithDate=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).map(g=>{
    const info=wbdContext._parseGameName(g.name);
    return {g,info,date:info.date||''};
  }).sort((a,b)=>a.date.localeCompare(b.date));

  if(gamesWithDate.length<3)return '<div style="padding:40px;text-align:center;color:var(--muted)">트렌드 분석에는 최소 3경기 이상 필요해요</div>';

  // 경기별 통계
  const gameStats=gamesWithDate.map(({g,info,date})=>{
    const batted=g.pitches.filter(wbdContext._isInPlay);
    const hits=batted.filter(wbdContext._isHit).length;
    const hrs=batted.filter(d=>d.result===4).length;
    const fbSpds=g.pitches.filter(d=>d.spdK>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    const ks=g.pitches.filter(d=>wbdContext._isK(d)).length;
    // 게임 평균 ERA, WHIP (양팀 투수 합산) - 캐시
    const ps=wbdContext._getCachedPitcherStats(g.id)||{};
    let totalRuns=0,totalOuts=0,totalH=0,totalBB=0;
    Object.values(ps).forEach(s=>{totalRuns+=s.runs;totalOuts+=s.outs;totalH+=s.hits;totalBB+=s.bbs;});
    const ip=totalOuts/3;
    return {
      date,name:`${info.teamA||'?'} vs ${info.teamB||'?'}`,
      ba:batted.length?hits/batted.length:0,
      hrs,
      avgFbSpd:fbSpds.length?fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length:0,
      ks,
      pitchCount:g.pitches.length,
      avgEra:ip>0?totalRuns/ip*9:0,
      avgWhip:ip>0?(totalH+totalBB)/ip:0
    };
  });

  // SVG 그래프 만들기 함수
  const makeLineChart=(data,yKey,label,color,formatter=v=>v.toFixed(0))=>{
    const W=760, H=180, padL=50, padR=20, padT=20, padB=30;
    const plotW=W-padL-padR, plotH=H-padT-padB;
    const vals=data.map(d=>d[yKey]).filter(v=>v!=null&&!isNaN(v));
    if(vals.length===0)return '';
    const minV=Math.min(...vals)*0.95;
    const maxV=Math.max(...vals)*1.05;
    const range=maxV-minV||1;
    const points=data.map((d,i)=>{
      const x=padL+(i/(data.length-1||1))*plotW;
      const y=padT+plotH-((d[yKey]-minV)/range)*plotH;
      return {x,y,d};
    });
    const path=points.map((p,i)=>(i===0?'M':'L')+`${p.x},${p.y}`).join(' ');
    // 이동평균 (3경기)
    const maPts=[];
    for(let i=0;i<data.length;i++){
      const start=Math.max(0,i-2);
      const slice=data.slice(start,i+1).map(d=>d[yKey]).filter(v=>v!=null&&!isNaN(v));
      const avg=slice.reduce((a,b)=>a+b,0)/slice.length;
      const x=padL+(i/(data.length-1||1))*plotW;
      const y=padT+plotH-((avg-minV)/range)*plotH;
      maPts.push(`${x},${y}`);
    }
    const maPath='M '+maPts.join(' L ');

    let g='';
    // 그리드
    [0,0.25,0.5,0.75,1].forEach(t=>{
      const y=padT+plotH*t;
      const v=maxV-range*t;
      g+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="rgba(255,255,255,0.04)"/>`;
      g+=`<text x="${padL-6}" y="${y+4}" fill="var(--muted)" font-size="10" text-anchor="end" font-family="monospace">${formatter(v)}</text>`;
    });
    // 이동평균선
    g+=`<path d="${maPath}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3,3" opacity="0.5"/>`;
    // 실제 선
    g+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.8"/>`;
    // 포인트
    points.forEach((p,i)=>{
      g+=`<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" style="cursor:pointer"><title>${p.d.date} · ${p.d.name}: ${formatter(p.d[yKey])}</title></circle>`;
    });
    return `<div style="margin-bottom:16px"><div style="font-size:12px;color:var(--muted);margin-bottom:4px">${label} (점선: 3경기 이동평균)</div><svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block">${g}</svg></div>`;
  };

  // 구종 트렌드 (전체 리그 vs 시간)
  let html='<div class="card section"><div class="card-title">📈 리그 시즌 트렌드</div>';
  html+=makeLineChart(gameStats,'ba','📊 경기별 리그 타율','#39ff8a',v=>v.toFixed(3).replace(/^0/,''));
  html+=makeLineChart(gameStats,'avgEra','🛡️ 경기별 리그 평균 ERA','#ff4560',v=>v.toFixed(2));
  html+=makeLineChart(gameStats,'avgWhip','🔒 경기별 리그 평균 WHIP','#ff8800',v=>v.toFixed(2));
  html+=makeLineChart(gameStats,'hrs','⚾ 경기별 홈런 수','#ff4560',v=>v.toFixed(0));
  html+=makeLineChart(gameStats,'avgFbSpd','⚡ 경기별 평균 직구 구속 (km/h)','#2196f3',v=>v.toFixed(1));
  html+=makeLineChart(gameStats,'ks','🔥 경기별 총 탈삼진','#ff8800',v=>v.toFixed(0));
  html+='</div>';

  // 전/중/후반 비교
  const chunkSize=Math.ceil(gameStats.length/3);
  const chunks=[gameStats.slice(0,chunkSize),gameStats.slice(chunkSize,chunkSize*2),gameStats.slice(chunkSize*2)];
  const chunkLabels=['🌱 초반','🌿 중반','🍂 후반'];
  const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;

  html+='<div class="card section"><div class="card-title">📊 시즌 전/중/후반 비교</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>구간</th><th>경기수</th><th>평균 타율</th><th>평균 홈런/경기</th><th>평균 구속</th><th>평균 K/경기</th></tr></thead><tbody>';
  chunks.forEach((c,i)=>{
    if(c.length===0)return;
    html+=`<tr><td style="font-weight:600">${chunkLabels[i]}</td>
      <td>${c.length}</td>
      <td style="font-family:var(--mono);color:#39ff8a">${avg(c.map(x=>x.ba)).toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono);color:#ff4560">${avg(c.map(x=>x.hrs)).toFixed(1)}</td>
      <td style="font-family:var(--mono);color:#2196f3">${avg(c.map(x=>x.avgFbSpd)).toFixed(1)}</td>
      <td style="font-family:var(--mono);color:#ff8800">${avg(c.map(x=>x.ks)).toFixed(1)}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 핫 스트릭 / 슬럼프
  html+='<div class="card section"><div class="card-title">🔥 선수 핫/콜드 스트릭</div>';
  // 최근 30%의 경기와 전체 비교
  const recentCnt=Math.max(3,Math.floor(gamesWithDate.length*0.3));
  const recentIds=new Set(gamesWithDate.slice(-recentCnt).map(x=>x.g.id));
  const players={batter:{},pitcher:{}};
  wbdContext.G.forEach(d=>{
    if(d.bName){
      if(!players.batter[d.bName])players.batter[d.bName]={all:[],recent:[]};
      players.batter[d.bName].all.push(d);
      if(recentIds.has(d._gameId))players.batter[d.bName].recent.push(d);
    }
    if(d.pName){
      if(!players.pitcher[d.pName])players.pitcher[d.pName]={all:[],recent:[]};
      players.pitcher[d.pName].all.push(d);
      if(recentIds.has(d._gameId))players.pitcher[d.pName].recent.push(d);
    }
  });
  // 타자 핫/콜드
  const hotBatters=[];
  Object.entries(players.batter).forEach(([name,v])=>{
    const allB=v.all.filter(wbdContext._isInPlay);
    const recB=v.recent.filter(wbdContext._isInPlay);
    if(allB.length<20||recB.length<8)return;
    const allAvg=allB.filter(wbdContext._isHit).length/allB.length;
    const recAvg=recB.filter(wbdContext._isHit).length/recB.length;
    hotBatters.push({name,allAvg,recAvg,diff:recAvg-allAvg,recN:recB.length});
  });
  hotBatters.sort((a,b)=>b.diff-a.diff);
  const hot=hotBatters.slice(0,5);
  const cold=hotBatters.slice(-5).reverse();
  html+='<div class="grid2"><div><div style="padding:8px 10px;color:#ff4560;font-size:11px;font-family:var(--mono);letter-spacing:1px">🔥 상승세 타자 (최근 vs 시즌)</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>이름</th><th>시즌</th><th>최근</th><th>차이</th></tr></thead><tbody>';
  hot.forEach(h=>{
    html+=`<tr onclick="goToBatter('${String(h.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${h.name}</td><td style="font-family:var(--mono);color:var(--muted)">${h.allAvg.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono);color:#39ff8a">${h.recAvg.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">+${h.diff.toFixed(3).replace(/^0\./,'.')}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';
  html+='<div><div style="padding:8px 10px;color:#2196f3;font-size:11px;font-family:var(--mono);letter-spacing:1px">❄️ 하락세 타자</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>이름</th><th>시즌</th><th>최근</th><th>차이</th></tr></thead><tbody>';
  cold.forEach(h=>{
    html+=`<tr onclick="goToBatter('${String(h.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${h.name}</td><td style="font-family:var(--mono);color:var(--muted)">${h.allAvg.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono);color:#2196f3">${h.recAvg.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono);color:#2196f3;font-weight:700">${h.diff.toFixed(3).replace(/^0\./,'.')}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div></div></div>';

  return html;
};

// Original index.html:31827
wbdContext.renderRivalries = function renderRivalries(){
  if(wbdContext.GAMES.length===0)return '<div style="padding:40px;text-align:center;color:var(--muted)">경기 데이터가 없어요</div>';

  // 두 팀 맞대결 기록 집계
  const pairs={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA), tB=wbdContext._normalizeTeam(info.teamB);
    if(!tA||!tB)return;
    const key=[tA,tB].sort().join(' vs ');
    if(!pairs[key])pairs[key]={teams:[tA,tB].sort(),games:[]};
    pairs[key].games.push({g,info,tA,tB});
  });

  const sorted=Object.values(pairs).filter(p=>p.games.length>=1).sort((a,b)=>b.games.length-a.games.length);

  let html='<div class="card section"><div class="card-title">⚔️ 팀별 맞대결 기록</div>';
  if(sorted.length===0){
    html+='<div style="padding:20px;text-align:center;color:var(--muted)">맞대결 기록이 없어요</div></div>';
    return html;
  }

  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>매치업</th><th>경기수</th><th>전적</th><th>총 득점</th><th>평균 점수차</th><th>최다 득점</th></tr></thead><tbody>';
  sorted.forEach(p=>{
    const t1=p.teams[0], t2=p.teams[1];
    let t1Wins=0, t2Wins=0, ties=0;
    let t1Total=0, t2Total=0;
    let maxDiff=0, maxScore='';
    p.games.forEach(({g,info,tA,tB})=>{
      const {totalA,totalB}=wbdContext._computeInningScores(g.pitches);
      // tA=info.teamA, tB=info.teamB (normalized됨)
      // t1은 pairs.teams[0] 이므로 t1이 info.teamA인지 확인
      const t1IsA=tA===t1;
      const s1=t1IsA?totalA:totalB;
      const s2=t1IsA?totalB:totalA;
      t1Total+=s1; t2Total+=s2;
      if(s1>s2)t1Wins++;
      else if(s2>s1)t2Wins++;
      else ties++;
      if(s1+s2>maxDiff){maxDiff=s1+s2;maxScore=`${s1}-${s2}`;}
    });
    const n=p.games.length;
    const avgDiff=Math.abs((t1Total-t2Total)/n).toFixed(1);
    html+=`<tr>
      <td style="font-weight:600;font-size:12px">${t1} <span style="color:var(--muted)">vs</span> ${t2}</td>
      <td style="font-family:var(--mono)">${n}</td>
      <td style="font-family:var(--mono);font-size:12px"><span style="color:#39ff8a;font-weight:700">${t1Wins}</span><span style="color:var(--muted)"> - </span><span style="color:#ff4560;font-weight:700">${t2Wins}</span>${ties?' <span style="color:var(--muted)">('+ties+'T)</span>':''}</td>
      <td style="font-family:var(--mono);color:var(--amber)">${t1Total} - ${t2Total}</td>
      <td style="font-family:var(--mono)">${avgDiff}</td>
      <td style="font-family:var(--mono);color:var(--muted);font-size:11px">${maxScore}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 라이벌리 하이라이트 (3경기 이상 맞붙은 팀만)
  const bigRivalries=sorted.filter(p=>p.games.length>=3);
  if(bigRivalries.length>0){
    html+='<div class="card section"><div class="card-title">🔥 치열한 라이벌리 (3경기+)</div>';
    html+='<div class="grid2">';
    bigRivalries.slice(0,4).forEach(p=>{
      const t1=p.teams[0], t2=p.teams[1];
      let t1Wins=0, t2Wins=0;
      let totalRuns=0;
      const gamesList=[];
      p.games.forEach(({g,info,tA,tB})=>{
        const {totalA,totalB}=wbdContext._computeInningScores(g.pitches);
        const t1IsA=tA===t1;
        const s1=t1IsA?totalA:totalB;
        const s2=t1IsA?totalB:totalA;
        totalRuns+=s1+s2;
        if(s1>s2)t1Wins++;
        else if(s2>s1)t2Wins++;
        gamesList.push({date:info.date,s1,s2});
      });
      gamesList.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
      html+=`<div class="card" style="border:1px solid var(--amber)">
        <div style="text-align:center;margin-bottom:10px">
          <div style="font-size:14px;font-weight:700;margin-bottom:2px">${t1} vs ${t2}</div>
          <div style="font-size:11px;color:var(--muted)">${p.games.length}경기 · 평균 득점 ${(totalRuns/p.games.length).toFixed(1)}점</div>
        </div>
        <div style="text-align:center;padding:12px 0;background:var(--card2);border-radius:4px;margin-bottom:8px">
          <div style="display:flex;justify-content:center;align-items:center;gap:16px">
            <div><div style="font-size:10px;color:var(--muted)">${t1.slice(0,12)}</div><div style="font-size:28px;font-weight:900;color:${t1Wins>t2Wins?'#39ff8a':'var(--muted)'};font-family:var(--mono)">${t1Wins}</div></div>
            <div style="font-size:14px;color:var(--muted)">–</div>
            <div><div style="font-size:10px;color:var(--muted)">${t2.slice(0,12)}</div><div style="font-size:28px;font-weight:900;color:${t2Wins>t1Wins?'#39ff8a':'var(--muted)'};font-family:var(--mono)">${t2Wins}</div></div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-bottom:4px">최근 경기</div>
        <div style="font-family:var(--mono);font-size:11px">`;
      gamesList.slice(0,3).forEach(game=>{
        const w=game.s1>game.s2?t1:game.s2>game.s1?t2:'무승부';
        html+=`<div style="padding:3px 0;display:flex;justify-content:space-between"><span style="color:var(--muted)">${game.date||'—'}</span><span>${game.s1}-${game.s2}</span><span style="color:${w===t1?'#39ff8a':w===t2?'#ff4560':'var(--muted)'}">${w==='무승부'?'T':w===t1?'◀':'▶'}</span></div>`;
      });
      html+='</div></div>';
    });
    html+='</div></div>';
  }

  return html;
};

// Original index.html:31937
wbdContext._bScore = function _bScore(p){ return +p.half===1 ? (+p.scoreA||0) : (+p.scoreB||0); };

// Original index.html:31938
wbdContext._baseOutState = function _baseOutState(p){ return [p.b1?1:0, p.b2?1:0, p.b3?1:0, +p.out||0]; };

// Original index.html:31939
wbdContext._stateKey = function _stateKey(b1,b2,b3,out){ return b1+''+b2+''+b3+'|'+out; };

// Original index.html:31941
wbdContext._gameHalves = function _gameHalves(ps){
  const order=[]; const hp={};
  for(const p of ps){ const k=p.inn+'_'+p.half; if(!order.length||order[order.length-1]!==k)order.push(k); (hp[k]=hp[k]||[]).push(p); }
  return {order,hp};
};
}

export function initialize(wbdContext) {

}
