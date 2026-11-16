import { routes, pageURL } from './routes.js';
import { restoreControls } from './view-state.js';

const renderers = {
  home:'renderHome',pitcher:'renderPitcherPage',batter:'renderBatterPage',cards:'renderCards',
  leaderboard:'renderLeaderboard',team:'renderTeamPage',compare:'renderComparePage',highlights:'renderHighlightsPage',
  awards:'renderAwardsPage',matchup:'renderMatchupPage',h2h:'renderH2HPage',rv:'renderRunValuePage',xout:'renderXOutPage',
  league:'renderLeaguePage',insights:'renderInsightsPage',myteam:'renderMyTeamPage',records:'renderRecordsPage',
  pfpmanager:'renderPfpManagerPage',pitchtype:'renderPitchTypePage',defense:'renderDefensePage',ballmap:'renderBallMapPage',
  defender:'renderDefenderPage',scouting:'renderScoutingPage',scoutreport:'renderScoutReportPage',scoutlab:'renderScoutLabPage',
  gamereport:'renderGameReportPage'
};

export function installPageController(context,{page,navigate,onChange,onError}) {
  let suppressNavigation=false;
  const legacyPopulate=context.populateSelects;
  // Original populateSelects assumed pitcher and batter controls existed on every screen.
  context.populateSelects=()=>{
    const pitcher=context.currentPitcher,batter=context.currentBatter;
    legacyPopulate();
    if(context._cache.pitcherNames.includes(pitcher))context.currentPitcher=pitcher;
    if(context._cache.batterNames.includes(batter))context.currentBatter=batter;
    const p=document.getElementById('pitcher-sel'),b=document.getElementById('batter-sel');
    if(p)p.value=context.currentPitcher;
    if(b)b.value=context.currentBatter;
  };
  function decorate() {
    document.querySelectorAll('[data-route]').forEach(a=>{
      a.classList.toggle('active',a.dataset.route===page);
      if(a.dataset.route===page)a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    const logo=document.querySelector('#mobile-topbar .mobile-logo');
    if(logo)logo.textContent=routes[page];
    context._injectHubTabs(page);
    document.querySelectorAll('.hub-tab').forEach(button=>{
      const match=button.getAttribute('onclick')?.match(/showPage\('([^']+)'\)/);
      if(!match)return;
      const a=document.createElement('a');
      a.className=button.className;a.href=pageURL(match[1]);a.dataset.route=match[1];a.textContent=button.textContent;
      if(match[1]===page)a.setAttribute('aria-current','page');
      button.replaceWith(a);
    });
  }
  function render(controls,selection) {
    try {
      if(!context.G.length) {
        // Keep the page controls available so users can enable games again from the shared bar.
        let notice=document.getElementById('empty-scope');
        if(!notice){notice=document.createElement('div');notice.id='empty-scope';notice.className='page-empty';document.querySelector('.page').prepend(notice);}
        document.querySelector('.page').dataset.empty='true';
        notice.textContent='활성화된 경기 데이터가 없습니다. 상단 경기 목록에서 분석할 경기를 선택해 주세요.';
        return;
      }
      document.getElementById('empty-scope')?.remove();
      delete document.querySelector('.page').dataset.empty;
      if(page==='pitcher'||page==='batter') {
        const index=context[page==='pitcher'?'activePitcherTab':'activeBatterTab'];
        document.querySelectorAll('.page .stab').forEach((el,i)=>el.classList.toggle('active',i===index));
        document.querySelectorAll('.page .spanel').forEach((el,i)=>el.classList.toggle('active',i===index));
      }
      const draw=()=>{
        // Initial page restoration must finish before controls are restored and saved again.
        // These legacy entry points normally defer rendering with timers for SPA transitions.
        if(page==='rv')return context._renderRunValueInner(document.getElementById('rv-content'));
        if(page==='xout')return context._renderXOutInner(document.getElementById('xout-content'));
        if(page==='records'){context._computeDefenseData();context._computeRecordsData();}
        return context[renderers[page]]();
      };
      restoreControls(controls);
      if(selection)for(const [id,value] of Object.entries(selection)) {
        const el=document.getElementById(id);if(el)el.value=value;
      }
      draw();
      if(controls || selection) {
        restoreControls(controls);
        if(selection)for(const [id,value] of Object.entries(selection)) {
          const el=document.getElementById(id);if(el)el.value=value;
        }
        draw();
        if(page==='home')context.renderGameDashboard();
      }
      if(page==='team')context.switchTeamSubtab(context._teamSubtab||'overview');
      decorate();
    }catch(error){onError(error);}
  }
  context.renderActiveContent=()=>{render();onChange();};
  context.showPage=(target)=>{
    if(suppressNavigation){render();return;}
    if(target===page){render();return;}
    return navigate(target);
  };
  context.goToPitcher=name=>{context.currentPitcher=name;navigate('pitcher',{'pitcher-sel':name});};
  context.goToBatter=name=>{context.currentBatter=name;navigate('batter',{'batter-sel':name});};
  context.goToTeam=name=>navigate('team',{'team-sel':name});
  context.goToDefender=name=>{
    context._defenderState={...(context._defenderState||{}),selectedPlayer:name,posFilter:'all'};
    navigate('defender');
  };
  window.goToTeam=context.goToTeam;
  window.goToDefender=context.goToDefender;
  context._jumpToCompare=(name,type)=>navigate('compare',{'cmp-type':type,'cmp-p1':name});
  context._jumpToMatchup=(name,type)=>navigate('matchup',{[type==='pitcher'?'mu-pitcher':'mu-batter']:name});
  context.goToPitchType=group=>{
    context._pitchTypeState.selectedGroup=group;navigate('pitchtype');
  };
  window.goToPitchType=context.goToPitchType;
  // Data loading is an in-document action, not a request to navigate back to home.
  for(const key of ['loadData','_finishBulkLoad']) {
    const original=context[key];
    context[key]=(...args)=>{
      suppressNavigation=true;
      try{return original(...args);}finally{suppressNavigation=false;onChange();}
    };
  }
  const rebuild=context.rebuildG;
  context.rebuildG=(...args)=>{const result=rebuild(...args);onChange();return result;};
  // Home-only and leaderboard warmups must not render into absent page fragments.
  for(const [key,owner] of [['renderHome','home'],['renderLeaderboard','leaderboard']]) {
    if(page===owner)continue;
    const original=context[key];
    context[key]=(...args)=>document.getElementById(`page-${owner}`)?original(...args):undefined;
  }
  decorate();
  return {render};
}
