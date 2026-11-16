/** navigation-charts: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:3696
wbdContext.toggleMobileMenu = function toggleMobileMenu(){
  const ov=document.getElementById('mobile-menu-overlay');
  if(ov.style.display==='flex')ov.style.display='none';
  else{ov.style.display='flex';}
};

// Original index.html:3701
wbdContext.closeMobileMenu = function closeMobileMenu(e){
  if(e&&e.target&&e.target.id!=='mobile-menu-overlay')return;
  const ov=document.getElementById('mobile-menu-overlay');
  if(ov)ov.style.display='none';
};

// Original index.html:3706
wbdContext.navMobile = function navMobile(name){
  wbdContext.closeMobileMenu();
  wbdContext.showPage(name);
};

// Original index.html:3738
wbdContext._injectHubTabs = function _injectHubTabs(name){
  // 먼저 모든 기존 탭바 제거 (페이지 전환 시 깔끔히)
  document.querySelectorAll('.hub-tabs[data-hub]').forEach(e=>e.remove());
  const hubKey=wbdContext._PAGE_HUB[name]; if(!hubKey)return;
  const pageEl=document.getElementById('page-'+name); if(!pageEl)return;
  const bar=document.createElement('div');
  bar.className='hub-tabs'; bar.setAttribute('data-hub',hubKey);
  bar.innerHTML=wbdContext.HUBS[hubKey].tabs.map(t=>
    `<button class="hub-tab${t.page===name?' active':''}" onclick="showPage('${t.page}')">${t.label}</button>`
  ).join('');
  pageEl.insertBefore(bar, pageEl.firstChild);
};

// Original index.html:3750
wbdContext.showPage = function showPage(name,_internal){
  // 히스토리 처리 (브라우저 뒤로/앞으로가 아닐 때만 push)
  if(!window._suppressHistory && !_internal){
    // 같은 페이지 연속 호출 무시
    const cur=window._pageHistory[window._historyIndex];
    if(cur!==name){
      // 새 페이지 → 현재 위치 이후 잘라내고 push
      window._pageHistory=window._pageHistory.slice(0,window._historyIndex+1);
      window._pageHistory.push(name);
      window._historyIndex=window._pageHistory.length-1;
      // 브라우저 history에도 push (뒤로가기 키 작동)
      try{history.pushState({page:name,idx:window._historyIndex},'',`#${name}`);}catch(e){}
    }
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  const labels={home:'홈',pitcher:'투수',batter:'타자',matchup:'매치업',cards:'카드',leaderboard:'리더보드',team:'팀',compare:'비교',highlights:'하이라이트',awards:'어워드',insights:'인사이트',myteam:'내 팀'};
  document.querySelectorAll('.nav-btn').forEach(b=>{if(b.textContent.includes(labels[name]))b.classList.add('active');});
  // 현재 페이지 모바일 상단에 표시
  const pageTitle=({home:'🏠 홈',pitcher:'⚾ 투수 분석',batter:'🏏 타자 분석',cards:'🃏 선수 카드',leaderboard:'🏅 리더보드',team:'🏆 팀 분석',compare:'⚖️ 선수 비교',highlights:'🎬 하이라이트',awards:'🏆 어워드',matchup:'🎮 매치업',h2h:'🆚 상대전적',rv:'📊 Run Value',xout:'🎯 기대성적·운',insights:'📈 인사이트',myteam:'⚔️ 내 팀 빌더',pitchtype:'🎯 구종 분석',defense:'🛡️ 수비 분석',defender:'🛡️ 수비수 분석',ballmap:'🗺️ 타구 분석',scouting:'📋 상대 공략',scoutreport:'📊 선수 평가',gamereport:'📰 경기후 리포트',pfpmanager:'👤 프로필 사진 관리',records:'📚 기록실',scoutlab:'🎯 팀 공략 리포트'})[name]||name;
  const mobileLogoEl=document.querySelector('#mobile-topbar .mobile-logo');
  if(mobileLogoEl)mobileLogoEl.textContent=pageTitle;
  // 모바일 하단 탭바 active 상태
  document.querySelectorAll('#mobile-bottom-tabs .mbt-btn').forEach(b=>{
    b.classList.toggle('active',b.dataset.page===name);
  });
  // 허브 탭바 주입 (수비/분석/스카우팅처럼 관련 페이지 묶음)
  wbdContext._injectHubTabs(name);
  // 드롭다운 그룹 활성 표시
  const groupMap={
    leaderboard:'ranking',awards:'ranking',insights:'ranking',records:'ranking',
    compare:'strat',matchup:'strat',h2h:'strat',myteam:'strat',
    gamereport:'misc',highlights:'misc',pfpmanager:'misc',
    defense:'defense',defender:'defense',ballmap:'defense',
    rv:'analysis',xout:'analysis',pitchtype:'analysis',
    scouting:'scout',scoutlab:'scout',scoutreport:'scout'
  };
  document.querySelectorAll('.nav-dropdown').forEach(d=>{
    const grp=d.querySelector('[data-group]')?.dataset.group;
    d.classList.toggle('has-active',grp && groupMap[name]===grp);
  });
  // 허브 버튼(단독 nav-btn[data-group]) 활성 표시
  document.querySelectorAll('.nav-btn[data-group]').forEach(b=>{
    if(b.closest('.nav-dropdown')) return;
    b.classList.toggle('active', groupMap[name]===b.dataset.group);
  });
  // 페이지 이동시 모바일 메뉴 자동 닫기
  wbdContext.closeMobileMenu();
  window.scrollTo(0,0);
  // V10.2 perf: 페이지 렌더 비동기 게이트 — 메뉴 전환·클릭 반응은 즉시 그려지고,
  // 무거운 렌더는 다음 프레임에 실행. 렌더 중에는 우상단에 로딩 배지 표시.
  const _doPageRender = () => {
    if(name==='home') wbdContext.renderHome();
    else if(name==='pitcher'){
      document.querySelectorAll('#page-pitcher .stab').forEach((b,i)=>b.classList.toggle('active',i===wbdContext.activePitcherTab));
      document.querySelectorAll('#page-pitcher .spanel').forEach((p,i)=>p.classList.toggle('active',i===wbdContext.activePitcherTab));
      wbdContext.renderPitcherPage();
    } else if(name==='batter'){
      document.querySelectorAll('#page-batter .stab').forEach((b,i)=>b.classList.toggle('active',i===wbdContext.activeBatterTab));
      document.querySelectorAll('#page-batter .spanel').forEach((p,i)=>p.classList.toggle('active',i===wbdContext.activeBatterTab));
      wbdContext.renderBatterPage();
    } else if(name==='cards') wbdContext.renderCards();
    else if(name==='leaderboard') wbdContext.renderLeaderboard();
    else if(name==='team'){ wbdContext.renderTeamPage(); if(typeof wbdContext.switchTeamSubtab==='function') wbdContext.switchTeamSubtab(window._teamSubtab||'overview'); }
    else if(name==='compare') wbdContext.renderComparePage();
    else if(name==='highlights') wbdContext.renderHighlightsPage();
    else if(name==='awards') wbdContext.renderAwardsPage();
    else if(name==='matchup') wbdContext.renderMatchupPage();
    else if(name==='h2h') wbdContext.renderH2HPage();
    else if(name==='rv') wbdContext.renderRunValuePage();
    else if(name==='xout') wbdContext.renderXOutPage();
    else if(name==='insights') wbdContext.renderInsightsPage();
    else if(name==='myteam') wbdContext.renderMyTeamPage();
    else if(name==='pitchtype') wbdContext.renderPitchTypePage();
    else if(name==='ballmap') wbdContext.renderBallMapPage();
    else if(name==='defense') wbdContext.renderDefensePage();
    else if(name==='defender') wbdContext.renderDefenderPage();
    else if(name==='scouting') wbdContext.renderScoutingPage();
    else if(name==='scoutreport') wbdContext.renderScoutReportPage();
    else if(name==='gamereport') wbdContext.renderGameReportPage();
    else if(name==='pfpmanager') wbdContext.renderPfpManagerPage();
    else if(name==='records') wbdContext.renderRecordsPage();
    else if(name==='league') wbdContext.renderLeaguePage();
    else if(name==='scoutlab' && typeof wbdContext.renderScoutLabPage==='function') wbdContext.renderScoutLabPage();
  };
  if(window._pageGateTimer) clearTimeout(window._pageGateTimer);
  wbdContext._pageLoadingBadge(true);
  window._pageGateTimer = setTimeout(() => {
    try { _doPageRender(); } finally { wbdContext._pageLoadingBadge(false); }
  }, 16);
};

// Original index.html:3844
wbdContext._pageLoadingBadge = function _pageLoadingBadge(on){
  let el = document.getElementById('page-loading-badge');
  if(on){
    if(!el){
      el = document.createElement('div');
      el.id = 'page-loading-badge';
      el.innerHTML = '<span class="srv-live-dot busy"></span>불러오는 중';
      el.style.cssText = 'position:fixed;top:14px;right:18px;z-index:9999;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:11px;color:var(--muted);font-family:var(--mono);box-shadow:0 4px 14px rgba(0,0,0,.4);pointer-events:none';
      document.body.appendChild(el);
    }
    el.style.display = 'block';
  } else if(el){
    el.style.display = 'none';
  }
};

// Original index.html:3860
wbdContext.switchStab = function switchStab(type,idx){
  const prefix=type==='pitcher'?'ps':'bs';
  document.querySelectorAll(`#page-${type} .stab`).forEach((b,i)=>b.classList.toggle('active',i===idx));
  document.querySelectorAll(`#page-${type} .spanel`).forEach((p,i)=>p.classList.toggle('active',i===idx));
  if(type==='pitcher'){
    wbdContext.activePitcherTab=idx;
    wbdContext.renderPitcherSubTab(idx);
  }else{
    wbdContext.activeBatterTab=idx;
    wbdContext.renderBatterSubTab(idx);
  }
};

// Original index.html:3873
wbdContext.renderPitcherSubTab = function renderPitcherSubTab(idx){
  if(idx===0){/* rendered by renderPitcherPage */}
  else if(idx===1){wbdContext.renderPitcherZone();wbdContext.renderZone9Bad();wbdContext.renderZone9Good();wbdContext.renderCountGrid();}
  else if(idx===2){wbdContext.renderPitcherRVCard();wbdContext.renderPitcherXOutCard();wbdContext.renderPitcherPctlCard();wbdContext.renderRunnerDonuts();wbdContext.renderInnVelocity();wbdContext.renderLRDonuts();wbdContext.renderResultPitch();}
  else if(idx===3){wbdContext.pitcherLogPage=0;wbdContext.renderPitcherLog();}
  else if(idx===4){wbdContext.renderPrecisionPitchToggles();wbdContext.renderPitcherPrecisionSummary();wbdContext.renderPitcherPrecisionPitchTable();wbdContext.renderPitcherPrecisionFilter();wbdContext.renderPitcherPrecisionMap();wbdContext.renderPitcherCountStrategy();wbdContext.renderPitcherSequenceTable();wbdContext.renderPitcherLRSplit();wbdContext.renderPitcherFatigue();}
  else if(idx===5){wbdContext.renderPitcherGameByGame();}
  else if(idx===6){wbdContext.renderPotentialVelocity();}
  else if(idx===7){wbdContext.renderEmbeddedH2H('p-h2h','pitcher');}
};

// Original index.html:3884
wbdContext.renderBatterSubTab = function renderBatterSubTab(idx){
  if(idx===0){wbdContext.renderBatterSpray();wbdContext.renderBarrel();wbdContext.renderBBQuality();wbdContext.renderLdegHist();wbdContext.renderSdegFan();}
  else if(idx===1){wbdContext.renderSwingRadar();wbdContext.renderHpos();wbdContext.renderSpdBand();wbdContext.renderBatterFilterAnalysis();wbdContext.renderBatterPitchTable();wbdContext.renderTiming();}
  else if(idx===2){wbdContext.renderBatterRVCard();wbdContext.renderBatterXOutCard();wbdContext.renderBatterPctlCard();wbdContext.renderCountTable();wbdContext.renderRunnerTable();wbdContext.renderHeightStats();wbdContext.renderResultPie();}
  else if(idx===3){wbdContext.batterLogPage=0;wbdContext.renderBatterLog();}
  else if(idx===4){wbdContext.renderBatterZoneSummary();wbdContext.renderBatterZoneMap();wbdContext.renderBatterZonePitchFilter();wbdContext.renderBatterZonePitchTable();wbdContext.renderBatterCountCategory();}
  else if(idx===5){wbdContext.renderBatterGameByGame();}
  else if(idx===6){wbdContext.renderEmbeddedH2H('b-h2h','batter');}
};

// Original index.html:3898
wbdContext.showTip = function showTip(e,html){wbdContext.TT.innerHTML=html;wbdContext.TT.style.display='block';wbdContext.moveTip(e)};

// Original index.html:3899
wbdContext.moveTip = function moveTip(e){wbdContext.TT.style.left=(e.clientX+14)+'px';wbdContext.TT.style.top=(e.clientY-8)+'px'};

// Original index.html:3900
wbdContext.hideTip = function hideTip(){wbdContext.TT.style.display='none'};

// Original index.html:3905
wbdContext.openModal = function openModal(html){document.getElementById('modal-content').innerHTML=html;document.getElementById('modal-overlay').classList.add('open')};

// Original index.html:3906
wbdContext.closeModal = function closeModal(){document.getElementById('modal-overlay').classList.remove('open')};

// Original index.html:3907
wbdContext.handleModalClick = function handleModalClick(e){if(e.target===document.getElementById('modal-overlay'))wbdContext.closeModal()};

// Original index.html:3913
wbdContext.makeSVG = function makeSVG(w,h,inner,extra=''){return `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;display:block" ${extra}>${inner}</svg>`};

// Original index.html:3914
wbdContext.sEl = function sEl(tag,attrs,inner=''){return `<${tag} ${Object.entries(attrs).map(([k,v])=>`${k}="${v}"`).join(' ')}>${inner}</${tag}>`};

// Original index.html:3919
wbdContext.countUp = function countUp(el,target,decimals=0){
  let start=0;const dur=600;const t0=performance.now();
  function step(now){
    const p=Math.min((now-t0)/dur,1);
    const cur=target*p;
    el.textContent=decimals?cur.toFixed(decimals):Math.round(cur);
    if(p<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
};

// Original index.html:3933
wbdContext.makeDonut = function makeDonut(data,W,title){
  // data: [{label,count,color}]
  const total=data.reduce((s,d)=>s+d.count,0)||1;
  const CX=W/2,CY=W/2,R=W/2*0.68,r=W/2*0.42;
  let items='',start=0;
  data.filter(d=>d.count>0).forEach(d=>{
    const angle=(d.count/total)*Math.PI*2;
    const x1=CX+R*Math.sin(start),y1=CY-R*Math.cos(start);
    const x2=CX+R*Math.sin(start+angle),y2=CY-R*Math.cos(start+angle);
    const x3=CX+r*Math.sin(start+angle),y3=CY-r*Math.cos(start+angle);
    const x4=CX+r*Math.sin(start),y4=CY-r*Math.cos(start);
    const large=angle>Math.PI?1:0;
    const mid=start+angle/2;
    const lx=CX+(R+14)*Math.sin(mid),ly=CY-(R+14)*Math.cos(mid);
    items+=`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${x3.toFixed(1)},${y3.toFixed(1)} A${r},${r} 0 ${large},0 ${x4.toFixed(1)},${y4.toFixed(1)} Z" fill="${d.color}" opacity="0.88" class="donut-arc" data-label="${d.label}" data-cnt="${d.count}" data-pct="${(d.count/total*100).toFixed(1)}"/>`;
    if(d.count/total>0.05)items+=wbdContext.sEl('text',{x:lx.toFixed(1),y:(ly+3).toFixed(1),fill:'#fff','font-size':'9','text-anchor':'middle'},`${(d.count/total*100).toFixed(0)}%`);
    start+=angle;
  });
  if(title)items+=wbdContext.sEl('text',{x:CX,y:CY+5,fill:'var(--amber)','font-size':'13','text-anchor':'middle','font-weight':'600'},total+'');
  return wbdContext.makeSVG(W,W,items);
};
}

export function initialize(wbdContext) {
// Original index.html:3712
window._pageHistory=[];

// Original index.html:3713
window._historyIndex=-1;

// Original index.html:3714
window._suppressHistory=false;

// Original index.html:3717
wbdContext.HUBS = {
  defense:{ label:'🛡️ 수비', tabs:[
    {page:'defense', label:'팀 수비'},
    {page:'defender', label:'수비수 단독'},
    {page:'ballmap', label:'타구 분석'},
  ]},
  analysis:{ label:'📊 심화 분석', tabs:[
    {page:'rv', label:'Run Value'},
    {page:'xout', label:'기대성적·운'},
    {page:'pitchtype', label:'구종 분석'},
  ]},
  scout:{ label:'📋 스카우팅', tabs:[
    {page:'scouting', label:'상대 공략'},
    {page:'scoutlab', label:'팀 공략'},
    {page:'scoutreport', label:'선수 평가'},
  ]},
};

// Original index.html:3735
wbdContext._PAGE_HUB = {};

// Original index.html:3736
Object.entries(wbdContext.HUBS).forEach(([k,h])=>h.tabs.forEach(t=>wbdContext._PAGE_HUB[t.page]=k));

// Original index.html:3897
wbdContext.TT = document.getElementById('tooltip');

// Original index.html:3908
document.addEventListener('keydown',e=>{if(e.key==='Escape')wbdContext.closeModal()});
}
