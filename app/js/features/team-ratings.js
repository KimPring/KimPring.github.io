/** team-ratings: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:27072
wbdContext._toggleFormDisplay = function _toggleFormDisplay(){
  window.SHOW_FORM=!window.SHOW_FORM;
  localStorage.setItem('wbd_show_form', window.SHOW_FORM?'1':'0');
  if(typeof wbdContext.renderCards==='function') wbdContext.renderCards();
  const b=document.getElementById('form-toggle-btn');
  if(b){ b.textContent=window.SHOW_FORM?'🔥 폼 표시 ON':'🔥 폼 표시 OFF';
         b.style.color=window.SHOW_FORM?'var(--amber)':'var(--muted)';
         b.style.borderColor=window.SHOW_FORM?'var(--amber)':'var(--border)'; }
};

// Original index.html:27081
wbdContext._recentForm = function _recentForm(name, type, nGames){
  const N=nGames||5;
  if(!window._formCache || window._formCache._k!==wbdContext.G.length) window._formCache={_k:wbdContext.G.length, v:{}};
  const ck=type+'|'+name+'|'+N;
  if(window._formCache.v[ck]!==undefined) return window._formCache.v[ck];
  const all=(type==='pitcher')?wbdContext.getPitcherDataByName(name):wbdContext.getBatterDataByName(name);
  if(!all.length){ window._formCache.v[ck]=null; return null; }
  // 경기 목록 (등장 순서 유지)
  const gids=[]; const seen=new Set();
  for(let i=0;i<all.length;i++){ const g=all[i]._gameId; if(g&&!seen.has(g)){seen.add(g); gids.push(g);} }
  if(gids.length<3){ window._formCache.v[ck]=null; return null; }   // 표본 부족
  const recentIds=new Set(gids.slice(-N));
  const recent=all.filter(d=>recentIds.has(d._gameId));
  const calc=arr=>{
    if(type==='pitcher'){
      const ip=arr.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
      const ab=arr.filter(wbdContext._isABPitch).length;
      const h=arr.filter(wbdContext._isHit).length;
      const sw=arr.filter(wbdContext._isSwing).length, wh=arr.filter(wbdContext._isWhiff).length;
      const brlp=ip.filter(wbdContext._isBarrelPlus).length;
      return {oAvg:ab>0?h/ab:null, whiff:sw>0?wh/sw*100:null, brlp:ip.length>0?brlp/ip.length*100:null, n:arr.length};
    } else {
      const ip=arr.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
      const ab=arr.filter(wbdContext._isABPitch).length;
      const h=arr.filter(wbdContext._isHit).length;
      let tb=0; arr.forEach(d=>{ if(wbdContext._isHit(d)) tb+=(+d._hitBase||(+d.result===4?4:1)); });
      const brlp=ip.length>0?ip.filter(wbdContext._isBarrelPlus).length/ip.length*100:null;
      const evs=ip.map(d=>+d.ev).filter(v=>v>0);
      return {avg:ab>0?h/ab:null, slg:ab>0?tb/ab:null, brlp, ev:evs.length?evs.reduce((a,b)=>a+b,0)/evs.length:null, n:arr.length};
    }
  };
  const R=calc(recent), S=calc(all);
  // 최근 표본이 너무 적으면 판정 보류
  const minN=(type==='pitcher')?25:12;
  if(R.n<minN){ window._formCache.v[ck]=null; return null; }
  // 지표별 상대 변화 → 점수화
  let score=0, cnt=0;
  const add=(r,s,higherBetter,weight)=>{
    if(r==null||s==null||!isFinite(r)||!isFinite(s))return;
    const base=Math.abs(s)>0.0001?Math.abs(s):1;
    let rel=(r-s)/base;
    if(!higherBetter) rel=-rel;
    score+=rel*(weight||1); cnt+=(weight||1);
  };
  if(type==='pitcher'){
    add(R.oAvg,S.oAvg,false,1.2);
    add(R.whiff,S.whiff,true,1.0);
    add(R.brlp,S.brlp,false,0.8);
  } else {
    add(R.avg,S.avg,true,1.2);
    add(R.slg,S.slg,true,1.0);
    add(R.brlp,S.brlp,true,0.6);
    add(R.ev,S.ev,true,0.6);
  }
  if(!cnt){ window._formCache.v[ck]=null; return null; }
  const norm=score/cnt;   // 시즌 대비 상대 변화율
  let level, label, color, icon;
  if(norm>=0.22){ level=2; label='최상'; color='#ff4560'; icon='🔥'; }
  else if(norm>=0.08){ level=1; label='상승'; color='#ff8c44'; icon='📈'; }
  else if(norm>-0.08){ level=0; label='보통'; color='#88ccff'; icon='➖'; }
  else if(norm>-0.22){ level=-1; label='하락'; color='#7a8fa6'; icon='📉'; }
  else { level=-2; label='부진'; color='#5a6a7a'; icon='🧊'; }
  const out={level,label,color,icon,norm,recent:R,season:S,games:Math.min(N,gids.length)};
  window._formCache.v[ck]=out;
  return out;
};

// Original index.html:27153
wbdContext._fieldSide = function _fieldSide(d, thr){
  const s=+d.sdeg;
  if(isNaN(s)) return null;
  const t=(thr==null?10:thr);
  return s<-t ? 'left' : (s>t ? 'right' : 'center');
};

// Original index.html:27160
wbdContext._leagueInPlay = function _leagueInPlay(){
  if(window._lgInPlayCache && window._lgInPlayCache._k===wbdContext.G.length) return window._lgInPlayCache.arr;
  const arr=wbdContext.G.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));
  window._lgInPlayCache={_k:wbdContext.G.length, arr};
  return arr;
};

// Original index.html:27167
wbdContext._leagueBBQ = function _leagueBBQ(){
  if(window._lgBBQCache && window._lgBBQCache._k===wbdContext.G.length) return window._lgBBQCache.v;
  const q={barrelPlus:0,solid:0,flare:0,topped:0,under:0,weak:0};
  wbdContext._leagueInPlay().forEach(d=>{q[wbdContext._bbQuality(d)]++;});
  const tot=Object.values(q).reduce((a,b)=>a+b,0)||1;
  const v={counts:q,total:tot};
  window._lgBBQCache={_k:wbdContext.G.length, v};
  return v;
};

// Original index.html:27177
wbdContext._leagueDir = function _leagueDir(){
  if(window._lgDirCache && window._lgDirCache._k===wbdContext.G.length) return window._lgDirCache.v;
  const d={left:0,center:0,right:0};
  wbdContext._leagueInPlay().forEach(p=>{ const k=wbdContext._fieldSide(p); if(k)d[k]++; });
  const v={counts:d,total:(d.left+d.center+d.right)||1};
  window._lgDirCache={_k:wbdContext.G.length, v};
  return v;
};

// Original index.html:27186
wbdContext._teamPitchIndex = function _teamPitchIndex(){
  if(window._teamPitchCache && window._teamPitchCache._k===wbdContext.G.length) return window._teamPitchCache.v;
  const bat={}, pit={};
  for(let i=0;i<wbdContext.G.length;i++){
    const d=wbdContext.G[i];
    if(d.bName){ const t=wbdContext._playerTeam(d.bName,'batter'); if(t&&t!=='—'){(bat[t]||(bat[t]=[])).push(d);} }
    if(d.pName){ const t=wbdContext._playerTeam(d.pName,'pitcher'); if(t&&t!=='—'){(pit[t]||(pit[t]=[])).push(d);} }
  }
  const v={bat,pit};
  window._teamPitchCache={_k:wbdContext.G.length, v};
  return v;
};

// Original index.html:27202
wbdContext._computeTeamProfiles = function _computeTeamProfiles(){
  if(window._teamProfCache && window._teamProfCache._k===wbdContext.G.length) return window._teamProfCache.v;
  const rec=wbdContext._computeRecordsData();
  const PT={batter:{},pitcher:{}};
  (rec.batters||[]).forEach(b=>{PT.batter[b.name]=wbdContext._playerTeam(b.name,'batter');});
  (rec.pitchers||[]).forEach(p=>{PT.pitcher[p.name]=wbdContext._playerTeam(p.name,'pitcher');});
  const teams={};
  const ini=t=>({team:t,PA:0,AB:0,H:0,h2B:0,h3B:0,HR:0,TB:0,BB:0,HBP:0,K:0,GIDP:0,owar:0,woba_w:0,
    evSum:0,evN:0,hhN:0,hhpN:0,brlN:0,brlpN:0,laSum:0,laN:0,sw:0,wh:0,ozN:0,ozSw:0,ozWh:0,izN:0,izSw:0,izWh:0,hposN:0,sweetN:0,bipN:0,bipH:0,
    IP:0,pK:0,pBB:0,pH:0,pHR:0,pBF:0,pRuns:0,pGIDP:0,era_w:0,fip_w:0,pwar:0,
    pEvSum:0,pEvN:0,pHhN:0,pHhpN:0,pBrlN:0,pBrlpN:0,pLaSum:0,pLaN:0,pSw:0,pWh:0,pZin:0,pN:0,pLoc:0,pMid:0,pSlight:0,pGood:0,pBorder:0,
    batters:[],pitchers:[]});
  (rec.batters||[]).forEach(b=>{const t=PT.batter[b.name]; if(!t||t==='—')return;
    if(!teams[t])teams[t]=ini(t); const T=teams[t];
    T.PA+=b.PA||0;T.AB+=b.AB||0;T.H+=b.H||0;T.h2B+=b.h2B||0;T.h3B+=b.h3B||0;T.HR+=b.HR||0;
    T.TB+=b.TB||0;T.BB+=b.BB||0;T.HBP+=b.HBP||0;T.K+=b.K||0;T.GIDP+=b.GIDP||0;T.owar+=b.owar||0;
    T.woba_w+=(b.woba||0)*(b.PA||0);
    T.evSum+=b.evSum||0;T.evN+=b.evN||0;T.hhN+=b.hhN||0;T.hhpN+=b.hhpN||0;
    T.brlN+=b.brlN||0;T.brlpN+=b.brlpN||0;T.laSum+=b.laSum||0;T.laN+=b.laN||0;
    T.batters.push(b);});
  (rec.pitchers||[]).forEach(p=>{const t=PT.pitcher[p.name]; if(!t||t==='—')return;
    if(!teams[t])teams[t]=ini(t); const T=teams[t];
    T.IP+=p.IP||0;T.pK+=p.K||0;T.pBB+=p.BB||0;T.pH+=p.H||0;T.pHR+=p.HR||0;T.pBF+=p.BF||0;T.pRuns+=(p.runs||0);
    T.pGIDP+=p.GIDP||0;T.pwar+=p.pwar||0;
    T.era_w+=(p.era||0)*(p.IP||0);T.fip_w+=(p.fip||0)*(p.IP||0);
    T.pEvSum+=p.evSum||0;T.pEvN+=p.evN||0;T.pHhN+=p.hhN||0;T.pHhpN+=p.hhpN||0;
    T.pBrlN+=p.brlN||0;T.pBrlpN+=p.brlpN||0;T.pLaSum+=p.laSum||0;T.pLaN+=p.laN||0;
    T.pitchers.push(p);});
  // 투구 단위 집계 (스윙/체이스/존인) — G 1회 스캔
  const bTeamOf={}, pTeamOf={};
  Object.keys(PT.batter).forEach(n=>bTeamOf[n]=PT.batter[n]);
  Object.keys(PT.pitcher).forEach(n=>pTeamOf[n]=PT.pitcher[n]);
  for(let i=0;i<wbdContext.G.length;i++){
    const d=wbdContext.G[i];
    const bt=bTeamOf[wbdContext._canonPlayer(d.bName)], pt=pTeamOf[wbdContext._canonPlayer(d.pName)];  // V11.6: 별칭 정규화
    if(bt&&teams[bt]){
      const T=teams[bt];
      const _sw=wbdContext._isSwing(d), _wh=wbdContext._isWhiff(d);
      if(_sw)T.sw++;
      if(_wh)T.wh++;
      if(wbdContext._isOutZone(d)){
        T.ozN++;
        if(_sw){ T.ozSw++; if(_wh)T.ozWh++; }        // 존밖 스윙 중 헛스윙
      } else if(wbdContext._isInZone(d)){
        T.izN++;
        if(_sw){ T.izSw++; if(_wh)T.izWh++; }        // 존안 스윙 중 헛스윙
      }
      // 스윗스팟 (배트 중심 타격)
      if(wbdContext._isInPlay(d)&&!wbdContext._isBunt(d)&&d.hPos!=null){
        T.hposN++;
        const _h=+d.hPos;
        if(_h>=0.35&&_h<=0.65)T.sweetN++;
      }
      // BABIP용 (인플레이 안타 / 인플레이 타구, 홈런 제외)
      if(wbdContext._isInPlay(d)&&!wbdContext._isBunt(d)&&+d.result!==4){
        T.bipN++;
        if(wbdContext._isHit(d))T.bipH++;
      }
    }
    if(pt&&teams[pt]){
      const T=teams[pt];
      T.pN++;
      if(wbdContext._isSwing(d))T.pSw++;
      if(wbdContext._isWhiff(d))T.pWh++;
      if(wbdContext._isInZone(d))T.pZin++;
      // V11.3: 제구 세분화 (실투/살짝몰림/굿존/보더라인/볼)
      if(d.zoneX!=null){
        T.pLoc++;
        const pc=wbdContext._precisionClass(d);
        if(pc==='middle')T.pMid++;
        else if(pc==='slight')T.pSlight++;
        else if(pc==='good')T.pGood++;
        else if(pc==='border')T.pBorder++;
      }
    }
  }
  // 파생 지표
  const arr=Object.values(teams).map(t=>{
    const avg=t.AB>0?t.H/t.AB:0;
    const obp=(t.PA>0)?((t.H+t.BB+t.HBP)/t.PA):0;
    const slg=t.AB>0?t.TB/t.AB:0;
    return {...t,
      avg, obp, slg, ops:obp+slg, iso:Math.max(0,slg-avg),
      hrPct:t.PA>0?t.HR/t.PA*100:0,
      bbPct:t.PA>0?t.BB/t.PA*100:0, kPct:t.PA>0?t.K/t.PA*100:0,
      woba:t.PA>0?t.woba_w/t.PA:0,
      avgEV:t.evN>0?t.evSum/t.evN:0, avgLA:t.laN>0?t.laSum/t.laN:null,
      hhPct:t.evN>0?t.hhN/t.evN*100:0, hhpPct:t.evN>0?t.hhpN/t.evN*100:0,
      brlPct:t.evN>0?t.brlN/t.evN*100:0, brlpPct:t.evN>0?t.brlpN/t.evN*100:0,
      whiffPct:t.sw>0?t.wh/t.sw*100:0, chasePct:t.ozN>0?t.ozSw/t.ozN*100:0,
      zContactPct:t.izSw>0?(t.izSw-t.izWh)/t.izSw*100:0,      // 존내 컨택률
      ozWhiffPct:t.ozSw>0?t.ozWh/t.ozSw*100:0,                // 존밖 스윙 중 헛스윙률
      zSwingPct:t.izN>0?t.izSw/t.izN*100:0,                   // 존내 스윙률 (칠 공은 치는가)
      sweetPct:t.hposN>0?t.sweetN/t.hposN*100:0,              // 스윗스팟 (배트 중심)
      babip:t.bipN>0?t.bipH/t.bipN:0,
      era:t.IP>0?t.era_w/t.IP:null, fip:t.IP>0?t.fip_w/t.IP:null,
      whip:t.IP>0?(t.pH+t.pBB)/t.IP:null,
      k9:t.IP>0?t.pK/t.IP*9:0, pKPct:t.pBF>0?t.pK/t.pBF*100:0, pBBPct:t.pBF>0?t.pBB/t.pBF*100:0,
      pKBB:t.pBB>0?t.pK/t.pBB:(t.pK>0?99:0),
      pHRPct:t.pBF>0?t.pHR/t.pBF*100:0,
      oAvg:(t.pBF-t.pBB)>0?t.pH/(t.pBF-t.pBB):0,
      pAvgEV:t.pEvN>0?t.pEvSum/t.pEvN:0, pAvgLA:t.pLaN>0?t.pLaSum/t.pLaN:null,
      pHhPct:t.pEvN>0?t.pHhN/t.pEvN*100:0, pHhpPct:t.pEvN>0?t.pHhpN/t.pEvN*100:0,
      pBrlPct:t.pEvN>0?t.pBrlN/t.pEvN*100:0, pBrlpPct:t.pEvN>0?t.pBrlpN/t.pEvN*100:0,
      pWhiffPct:t.pSw>0?t.pWh/t.pSw*100:0, pZinPct:t.pN>0?t.pZin/t.pN*100:0,
      pMidPct:t.pLoc>0?t.pMid/t.pLoc*100:0,
      pBorderPct:t.pLoc>0?t.pBorder/t.pLoc*100:0,
      pGoodPct:t.pLoc>0?(t.pGood+t.pBorder)/t.pLoc*100:0,
      pSlightPct:t.pLoc>0?t.pSlight/t.pLoc*100:0,
      war:(t.owar||0)+(t.pwar||0)
    };
  });
  // 리그 백분위 계산기
  const pctOf=(val,key,higherBetter=true)=>{
    const vals=arr.map(x=>x[key]).filter(v=>v!=null&&!isNaN(v));
    if(vals.length<2||val==null||isNaN(val))return 0.5;
    const below=vals.filter(v=>v<=val).length;
    let p=below/vals.length;
    if(!higherBetter)p=1-p+(1/vals.length);
    return Math.max(0,Math.min(1,p));
  };
  const out={teams:arr, pctOf, byName:Object.fromEntries(arr.map(t=>[t.team,t]))};
  window._teamProfCache={_k:wbdContext.G.length, v:out};
  return out;
};

// Original index.html:27335
wbdContext._teamDefPct = function _teamDefPct(team){
  try{
    const dd=wbdContext._computeDefenseData();
    if(!dd||!dd.byPlayer) return {pct:0.5, oaa:null, rank:null, n:0};
    const tot={};
    Object.values(dd.byPlayer).forEach(p=>{
      const tm=wbdContext._playerTeam(p.name,'batter');
      if(!tm||tm==='—')return;
      if(!tot[tm])tot[tm]=0;
      Object.values(p.byPos||{}).forEach(ps=>{tot[tm]+=ps.oaaWeighted||0;});
    });
    const arr=Object.entries(tot).map(([tm,v])=>({tm,v})).sort((a,b)=>b.v-a.v);
    const idx=arr.findIndex(x=>x.tm===team);
    if(idx<0) return {pct:0.5, oaa:null, rank:null, n:arr.length};
    const pct=arr.length>1 ? 1-(idx/(arr.length-1)) : 0.5;
    return {pct, oaa:arr[idx].v, rank:idx+1, n:arr.length};
  }catch(_){ return {pct:0.5, oaa:null, rank:null, n:0}; }
};

// Original index.html:27356
wbdContext._clutchStats = function _clutchStats(arr){
  let ab=0,h=0,tb=0,bb=0,hbp=0;
  for(let i=0;i<arr.length;i++){
    const d=arr[i], r=+d.result;
    if(r===5)bb++;
    else if(r===6)hbp++;
    if(wbdContext._isABPitch(d))ab++;
    if(wbdContext._isHit(d)){ h++; tb += (+d._hitBase || (r===4?4:1)); }
  }
  const pa=ab+bb+hbp;
  if(ab<10) return null;
  const ba=h/ab, obp=pa>0?(h+bb+hbp)/pa:0, slg=tb/ab;
  return {ab,pa,ba,obp,slg,ops:obp+slg};
};

// Original index.html:27371
wbdContext._leagueClutch = function _leagueClutch(){
  if(window._lgClutchCache && window._lgClutchCache._k===wbdContext.G.length) return window._lgClutchCache.v;
  const rsp=wbdContext.G.filter(d=>(+d.b2===1||+d.b3===1));
  const v=wbdContext._clutchStats(rsp);
  window._lgClutchCache={_k:wbdContext.G.length, v};
  return v;
};

// Original index.html:27379
wbdContext._teamClutch = function _teamClutch(team, side){
  try{
    const idx=wbdContext._teamPitchIndex();
    const src=(side==='pit') ? (idx.pit[team]||[]) : (idx.bat[team]||[]);
    const rsp=src.filter(d=>(+d.b2===1||+d.b3===1));
    const s=wbdContext._clutchStats(rsp);
    const lg=wbdContext._leagueClutch();
    if(!s||!lg) return {ops:null, lgOps:lg?lg.ops:null, diff:null, pct:0.5, ab:s?s.ab:0, side};
    const diff=s.ops-lg.ops;
    // 투수는 낮을수록 좋음 → 부호 반전
    const signed = (side==='pit') ? -diff : diff;
    const pct=Math.max(0,Math.min(1,0.5+signed*1.2));
    return {ops:s.ops, ba:s.ba, obp:s.obp, slg:s.slg, lgOps:lg.ops, diff, pct, ab:s.ab, side};
  }catch(_){ return {ops:null, lgOps:null, diff:null, pct:0.5, ab:0, side}; }
};

// Original index.html:27395
wbdContext._teamScores = function _teamScores(prof, t){
  const A=wbdContext._teamAreaScores(prof,t);
  const W=wbdContext.TEAM_W;
  const bat = A.contact*W.bat.contact + A.power*W.bat.power + A.eye*W.bat.eye;
  const pit = A.pStuff*W.pit.pStuff + A.pCtrl*W.pit.pCtrl + A.pResult*W.pit.pResult;
  const d = wbdContext._teamDefPct(t.team);
  const total = bat*W.total.bat + pit*W.total.pit + d.pct*W.total.def;
  return {A, bat, pit, def:d.pct, defInfo:d, total};
};

// Original index.html:27405
wbdContext._teamGrade = function _teamGrade(p){
  return p>=0.90?'S+' : p>=0.80?'S' : p>=0.70?'A+' : p>=0.60?'A'
       : p>=0.50?'B+' : p>=0.40?'B' : p>=0.30?'C+' : p>=0.20?'C' : 'D';
};

// Original index.html:27409
wbdContext._teamGradeColor = function _teamGradeColor(g){
  return g.startsWith('S')?'#ff2d55' : g.startsWith('A')?'#ff8c44'
       : g.startsWith('B')?'#ffd700' : g.startsWith('C')?'#88ccff' : '#8a97a8';
};

// Original index.html:27413
wbdContext._teamGradeLabel = function _teamGradeLabel(p){
  return p>=0.80?'리그 최상위 — 우승 후보' : p>=0.70?'상위권 — 포스트시즌 경쟁력'
       : p>=0.60?'중상위 — 강점 살리면 상위권 도전' : p>=0.45?'중위권 — 약점 보완이 관건'
       : p>=0.30?'하위권 — 구조적 보강 필요' : '재건 단계';
};

// Original index.html:27420
wbdContext._teamAreaScores = function _teamAreaScores(prof, t){
  const P=prof.pctOf;
  const f3=v=>(v==null||isNaN(v))?'-':v.toFixed(3).replace(/^0/,'');
  const f1=(v,s)=>(v==null||isNaN(v))?'-':v.toFixed(1)+(s||'');
  const f2=v=>(v==null||isNaN(v))?'-':v.toFixed(2);
  // mk: [라벨, 원시값, 표시문자열, 백분위, 가중치]
  const mk=(label,raw,disp,pct,w)=>({label,raw,disp,pct,w});
  const wavg=items=>{
    let s=0,c=0; items.forEach(i=>{s+=i.pct*i.w;c+=i.w;});
    return c>0?s/c:0.5;
  };
  const B={};
  // V11.4: 컨택 = 결과(타율) + 과정(맞히는 능력)
  //   스윗스팟(hPos)은 파워로도 이어져 성격이 중복, BABIP는 운·상대수비 영향이 커서 제외
  B.contact=[
    mk('팀 타율', t.avg, f3(t.avg), P(t.avg,'avg',true), 0.42),
    mk('삼진률 K%', t.kPct, f1(t.kPct,'%'), P(t.kPct,'kPct',false), 0.32),
    mk('존내 컨택%', t.zContactPct, f1(t.zContactPct,'%'), P(t.zContactPct,'zContactPct',true), 0.26)
  ];
  // V11.3: 파워 = 홈런형(배럴+·HH+·HR%) + 장타형(ISO·HH·평균EV) 균형
  //   EV125 기준은 키 큰 타자에 유리(실측: 175cm 배럴+ 1.8% vs 190cm 12.4%)
  //   → 2루타 이상 장타력·타구속도를 반영하는 지표를 함께 넣어 체격 편중 완화
  B.power=[
    mk('배럴+% (홈런존)', t.brlpPct, f1(t.brlpPct,'%'), P(t.brlpPct,'brlpPct',true), 0.22),
    mk('HH+% (EV125+)', t.hhpPct, f1(t.hhpPct,'%'), P(t.hhpPct,'hhpPct',true), 0.16),
    mk('HR% (타석당)', t.hrPct, f1(t.hrPct,'%'), P(t.hrPct,'hrPct',true), 0.18),
    mk('ISO (순장타)', t.iso, f3(t.iso), P(t.iso,'iso',true), 0.20),
    mk('배럴% (EV105+)', t.brlPct, f1(t.brlPct,'%'), P(t.brlPct,'brlPct',true), 0.12),
    mk('HH% (EV110+)', t.hhPct, f1(t.hhPct,'%'), P(t.hhPct,'hhPct',true), 0.07),
    mk('평균 EV', t.avgEV, f1(t.avgEV), P(t.avgEV,'avgEV',true), 0.05)
  ];
  // V11.4: 선구 = 볼을 골라내는 능력이 핵심
  //   존밖 헛스윙은 "쫓아간 뒤 못 맞힌 것"이라 컨택 영역 성격 → 제외
  //   존내 스윙은 유형(자기 존을 기다리는 타자)에 따라 갈려서 보조 비중만
  B.eye=[
    mk('볼넷률 BB%', t.bbPct, f1(t.bbPct,'%'), P(t.bbPct,'bbPct',true), 0.45),
    mk('체이스% (존밖 스윙)', t.chasePct, f1(t.chasePct,'%'), P(t.chasePct,'chasePct',false), 0.45),
    mk('존내 스윙% (적극성)', t.zSwingPct, f1(t.zSwingPct,'%'), P(t.zSwingPct,'zSwingPct',true), 0.10)
  ];
  // V11.3: 강타 억제도 EV125 단일 기준이 아닌 다층으로 (상대 타자 체격에 따른 편차 완화)
  B.pStuff=[
    mk('피안타율', t.oAvg, f3(t.oAvg), P(t.oAvg,'oAvg',false), 0.30),
    mk('헛스윙 유도%', t.pWhiffPct, f1(t.pWhiffPct,'%'), P(t.pWhiffPct,'pWhiffPct',true), 0.30),
    mk('피배럴+%', t.pBrlpPct, f1(t.pBrlpPct,'%'), P(t.pBrlpPct,'pBrlpPct',false), 0.16),
    mk('피배럴% (EV105+)', t.pBrlPct, f1(t.pBrlPct,'%'), P(t.pBrlPct,'pBrlPct',false), 0.12),
    mk('피HH% (EV110+)', t.pHhPct, f1(t.pHhPct,'%'), P(t.pHhPct,'pHhPct',false), 0.07),
    mk('평균 피EV', t.pAvgEV, f1(t.pAvgEV), P(t.pAvgEV,'pAvgEV',false), 0.05)
  ];
  // V11.3: 제구 = "존에 넣었나"가 아니라 "어디에 넣었나"
  //   존인%만 보면 한복판에 몰려도 높게 나와 변별력이 없음(실제로 존인% 상위 = 투수결과 하위 경향)
  //   실투(중앙 깊숙이)는 감점, 보더라인(존 경계)은 가점 — 살짝 몰림은 중립
  B.pCtrl=[
    mk('실투율 (한복판)', t.pMidPct, f1(t.pMidPct,'%'), P(t.pMidPct,'pMidPct',false), 0.32),
    mk('보더라인%', t.pBorderPct, f1(t.pBorderPct,'%'), P(t.pBorderPct,'pBorderPct',true), 0.30),
    mk('볼넷 허용 BB%', t.pBBPct, f1(t.pBBPct,'%'), P(t.pBBPct,'pBBPct',false), 0.26),
    mk('스트라이크 획득%', t.pZinPct, f1(t.pZinPct,'%'), P(t.pZinPct,'pZinPct',true), 0.12)
  ];
  B.pResult=[
    mk('FIP (수비무관)', t.fip, f2(t.fip), t.fip!=null?P(t.fip,'fip',false):0.5, 0.28),
    mk('ERA', t.era, f2(t.era), t.era!=null?P(t.era,'era',false):0.5, 0.24),
    mk('WHIP', t.whip, f2(t.whip), t.whip!=null?P(t.whip,'whip',false):0.5, 0.22),
    mk('K/9 (탈삼진)', t.k9, f1(t.k9), P(t.k9,'k9',true), 0.14),
    mk('피홈런 HR%', t.pHR!=null&&t.pBF>0?(t.pHR/t.pBF*100):null, t.pBF>0?f1(t.pHR/t.pBF*100,'%'):'-',
       t.pBF>0?P(t.pHR/t.pBF*100,'pHRPct',false):0.5, 0.12)
  ];
  return {
    contact:wavg(B.contact), power:wavg(B.power), eye:wavg(B.eye),
    pStuff:wavg(B.pStuff), pCtrl:wavg(B.pCtrl), pResult:wavg(B.pResult),
    breakdown:B
  };
};

// Original index.html:27491
wbdContext._computeAllTeamStats = function _computeAllTeamStats(){
  // 선수→팀 매핑 미리 캐싱
  const batterTeamMap = {}, pitcherTeamMap = {};
  (window._cache.batterNames || []).forEach(n => {
    batterTeamMap[n] = wbdContext._playerTeam(n, 'batter') || '_unknown_';
  });
  (window._cache.pitcherNames || []).forEach(n => {
    pitcherTeamMap[n] = wbdContext._playerTeam(n, 'pitcher') || '_unknown_';
  });
  
  function emptyAccum(){
    return {bN:0, bHits:0, bAB:0, bHR:0, bBB:0, bBDCnt:0, bEvSum:0, bHH:0, bSw:0, bWh:0, bOutZN:0, bOutZSw:0};
  }
  function emptyPAccum(){
    return {pN:0, pHits:0, pAB:0, pHR:0, pBB:0, pSw:0, pWh:0};
  }
  
  const teamBatStats = {}, teamPitchStats = {};
  
  // V11.3: 타석 경계 + isHit/isAB 정의를 기록실(_computeRecordsData)과 통일.
  //   - isHit: 낫아웃 출루(ev=0) 제외 → (1BSafe===1 && ev>0) || HR
  //   - AB/H/HR/BB는 '타석 종료 투구'에서만 카운트 (한 타석 여러 투구 중복 방지)
  //   - AB = 볼넷(5)·사구(6) 아닌 모든 타석 (기록실과 동일)
  //   - EV·스윙·체이스는 개별 투구(구질) 기준이라 모든 투구 순회 유지
  for(let i=0; i<wbdContext.G.length; i++){
    const d = wbdContext.G[i];
    const bName = d.bName, pName = d.pName;
    const r = +d.result;
    const isHit = (+d['1BSafe']===1 && +d.ev>0) || r===4;  // 기록실과 동일 (낫아웃 제외)
    // 타석 종료 여부: 다음 투구가 다른 타석이거나 확정 종료 이벤트(HR/BB/HBP)
    const isPAEnd = wbdContext._isPaEnd(d);
    const isAB = isPAEnd && r!==5 && r!==6;  // 타석 종료 & 볼넷·사구 아님 (기록실과 동일)

    if(bName && batterTeamMap[bName]){
      const t = batterTeamMap[bName];
      if(!teamBatStats[t]) teamBatStats[t] = emptyAccum();
      const a = teamBatStats[t];
      a.bN++;
      if(isPAEnd && isHit) a.bHits++;   // 안타는 타석 종료 시점에만
      if(isAB) a.bAB++;
      if(isPAEnd && r===4) a.bHR++;
      if(isPAEnd && r===5) a.bBB++;
      const ev = +d.ev;
      if(ev > 0 && r !== 3){  // V11.1: 파울 제외
        a.bBDCnt++;
        a.bEvSum += ev;
        if(ev >= 110) a.bHH++;
      }
      if(d.bSwing){
        a.bSw++;
        if(+d.call !== 2) a.bWh++;
      }
      const zx = +d.zoneX, zy = +d.zoneY;
      const inZone = (zx>=-1 && zx<=1 && zy>=-1 && zy<=1);
      if(!inZone && !isNaN(zx) && !isNaN(zy)){
        a.bOutZN++;
        if(d.bSwing) a.bOutZSw++;
      }
    }

    if(pName && pitcherTeamMap[pName]){
      const t = pitcherTeamMap[pName];
      if(!teamPitchStats[t]) teamPitchStats[t] = emptyPAccum();
      const a = teamPitchStats[t];
      a.pN++;
      if(isPAEnd && isHit) a.pHits++;
      if(isAB) a.pAB++;
      if(isPAEnd && r===4) a.pHR++;
      if(isPAEnd && r===5) a.pBB++;
      if(d.bSwing){
        a.pSw++;
        if(+d.call !== 2) a.pWh++;
      }
    }
  }
  
  function accumToStats(b, p){
    b = b || emptyAccum();
    p = p || emptyPAccum();
    return {
      bN: b.bN, bAB: b.bAB, bHits: b.bHits, bHR: b.bHR,
      bBA: b.bAB > 0 ? b.bHits/b.bAB : 0,
      bAvgEV: b.bBDCnt > 0 ? b.bEvSum/b.bBDCnt : 0,
      bHHpct: b.bBDCnt > 0 ? b.bHH/b.bBDCnt*100 : 0,
      bWhPct: b.bSw > 0 ? b.bWh/b.bSw*100 : 0,
      bChase: b.bOutZN > 0 ? b.bOutZSw/b.bOutZN*100 : 50,
      bBBpct: b.bN > 0 ? b.bBB/b.bN*100 : 0,
      bBD: b.bBDCnt,
      pN: p.pN, pAB: p.pAB, pHits: p.pHits, pHR: p.pHR,
      pBA: p.pAB > 0 ? p.pHits/p.pAB : 0,
      pBBpct: p.pN > 0 ? p.pBB/p.pN*100 : 0,
      pWhPct: p.pSw > 0 ? p.pWh/p.pSw*100 : 0
    };
  }
  
  // 리그 팀 통계 배열
  const allTeamNames = new Set([...Object.keys(teamBatStats), ...Object.keys(teamPitchStats)]);
  const leagueTeamStats = [];
  allTeamNames.forEach(t => {
    if(t === '_unknown_') return;
    const s = accumToStats(teamBatStats[t], teamPitchStats[t]);
    // V11.3: 표본 컷 완화 (50→10) + 조건 AND화. 경기 수 적은 리그(리그 초반) 대응.
    //   이전엔 타수·피타수 둘 중 하나라도 50 미만이면 제외 → 1경기 한 팀이 순위·백분위에서 통째로 빠짐.
    //   이제 타격·투수 표본이 둘 다 극소(각 10 미만)일 때만 제외. 한쪽이라도 있으면 포함.
    if(s.bAB < 10 && s.pAB < 10) return;
    leagueTeamStats.push({team: t, ...s});
  });
  
  return {teamBatStats, teamPitchStats, leagueTeamStats, accumToStats};
};

// Original index.html:27603
wbdContext._generateTeamScoutReport = function _generateTeamScoutReport(teamName){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  
  // 팀 소속 선수
  const batterNames = (window._cache.batterNames || []).filter(n => wbdContext._playerTeam(n, 'batter') === teamName);
  const pitcherNames = (window._cache.pitcherNames || []).filter(n => wbdContext._playerTeam(n, 'pitcher') === teamName);
  
  if(!batterNames.length && !pitcherNames.length) return null;
  
  // ─ 캐시 활용: 리그 전체 팀 통계는 G가 안 바뀌면 재사용 ─
  if(!window._teamScoutLeagueCache || window._teamScoutLeagueCache._t !== wbdContext.G.length){
    window._teamScoutLeagueCache = wbdContext._computeAllTeamStats();
    window._teamScoutLeagueCache._t = wbdContext.G.length;
  }
  const lgCache = window._teamScoutLeagueCache;
  const teamBatStats = lgCache.teamBatStats;
  const teamPitchStats = lgCache.teamPitchStats;
  const leagueTeamStats = lgCache.leagueTeamStats;
  
  // accumToStats는 캐시에서 가져옴
  const accumToStats = lgCache.accumToStats;
  
  // 우리팀 통계
  const myStats = accumToStats(teamBatStats[teamName], teamPitchStats[teamName]);
  const oBBA = myStats.bBA, oBHR = myStats.bHR, oBAvgEV = myStats.bAvgEV, oBHHpct = myStats.bHHpct;
  const oBWhiffPct = myStats.bWhPct, oBChase = myStats.bChase, oBBBpct = myStats.bBBpct;
  const oBHits = myStats.bHits, oBAB = myStats.bAB;
  const oPBA = myStats.pBA, oPHR = myStats.pHR, oPBBpct = myStats.pBBpct, oPWhiffPct = myStats.pWhPct;
  const oPHits = myStats.pHits, oPAB = myStats.pAB;
  
  // 우리팀 투구/타격 수는 myStats에서 가져옴 (G.filter 추가 호출 불필요)
  const ourPitchingN = myStats.pN;
  
  // 팀 모든 데이터 (게임 수)
  const teamGames = new Set();
  for(let i=0; i<wbdContext.G.length; i++){
    const d = wbdContext.G[i];
    if(batterNames.includes(d.bName) || pitcherNames.includes(d.pName)){
      if(d._gameId) teamGames.add(d._gameId);
    }
  }
  const teamGamesCount = teamGames.size;
  
  // 리그 평균
  const lg = wbdContext._scoutLeagueAvgs();
  
  // ─ 백분위 계산 함수 (리그 내 다른 팀들 대비) ─
  // higherBetter: 높을수록 좋은 지표
  // 우리팀 = leagueTeamStats 안에 포함됨 → 같은 데이터로 비교 (이상 없음)
  function teamPctile(myVal, key, higherBetter = true){
    if(leagueTeamStats.length < 2) return 0.5;
    const vals = leagueTeamStats.map(s => s[key]).filter(v => v !== null && !isNaN(v));
    if(!vals.length) return 0.5;
    const sorted = vals.slice().sort((a,b)=>a-b);
    let countAtOrBelow = sorted.filter(v => v <= myVal).length;
    let pct = countAtOrBelow / sorted.length;
    if(!higherBetter) pct = 1 - pct + (1/sorted.length);  // 낮을수록 좋으면 뒤집기
    return Math.max(0, Math.min(1, pct));
  }
  
  // 각 항목별 백분위 (0~1)
  const pctBA = teamPctile(oBBA, 'bBA', true);
  const pctBAA = teamPctile(oPBA, 'pBA', false);  // 피안타율은 낮을수록 좋음
  const pctHH = teamPctile(oBHHpct, 'bHHpct', true);
  const pctK = teamPctile(oPWhiffPct, 'pWhPct', true);
  const pctChase = teamPctile(oBChase, 'bChase', false);  // 체이스는 낮을수록 좋음
  
  // 디버그용 메타
  const leagueAvgs = {
    bBA: leagueTeamStats.reduce((s,t)=>s+t.bBA,0)/leagueTeamStats.length,
    pBA: leagueTeamStats.reduce((s,t)=>s+t.pBA,0)/leagueTeamStats.length,
    bHHpct: leagueTeamStats.reduce((s,t)=>s+t.bHHpct,0)/leagueTeamStats.length,
    pWhPct: leagueTeamStats.reduce((s,t)=>s+t.pWhPct,0)/leagueTeamStats.length,
    bChase: leagueTeamStats.reduce((s,t)=>s+t.bChase,0)/leagueTeamStats.length
  };
  
  // ─ 팀 스타일 분류 (백분위 기반) ─
  let style = '균형형', styleColor = '#88ccff';
  if(pctHH >= 0.75 && pctBA >= 0.5) { style = '장타력 위주'; styleColor = '#ff4560'; }
  else if(pctBA >= 0.75 && pctHH < 0.5) { style = '컨택 위주'; styleColor = '#39ff8a'; }
  else if(pctBAA >= 0.75) { style = '투수력 위주'; styleColor = '#cc44ff'; }
  else if(pctK >= 0.75) { style = '탈삼진 투수진'; styleColor = '#88ccff'; }
  else if(pctBA >= 0.6 && pctHH >= 0.5) { style = '공격형 균형'; styleColor = '#ff8c44'; }
  else if(pctBA <= 0.3 && pctBAA <= 0.3) { style = '재건 / 약체'; styleColor = '#888'; }
  else { style = '균형형'; styleColor = '#88ccff'; }
  
  // ─ 종합 등급 (5대 지표 평균 백분위 기반) ─
  // 가중치: 타격 40% (BA + HH 절반씩), 투구 40% (BAA + K 절반씩), 선구 20% (Chase)
  const overallPct = (pctBA*0.20 + pctHH*0.20 + pctBAA*0.20 + pctK*0.20 + pctChase*0.20);
  
  let grade, gradeColor, gradeLabel;
  if(overallPct >= 0.85) { grade = 'A+'; gradeColor = '#ff4560'; gradeLabel = '우승 후보 (리그 상위 15%)'; }
  else if(overallPct >= 0.70) { grade = 'A'; gradeColor = '#ff8c44'; gradeLabel = '상위권 (리그 상위 30%)'; }
  else if(overallPct >= 0.55) { grade = 'B+'; gradeColor = '#ffd700'; gradeLabel = '중상위 (평균 이상)'; }
  else if(overallPct >= 0.40) { grade = 'B'; gradeColor = '#39ff8a'; gradeLabel = '중위권 (평균 수준)'; }
  else if(overallPct >= 0.25) { grade = 'C'; gradeColor = '#88ccff'; gradeLabel = '하위권 (평균 이하)'; }
  else { grade = 'D'; gradeColor = '#888'; gradeLabel = '재건 필요 (리그 하위 25%)'; }
  
  // ─ 5대 지표 (백분위 기반 티어) ─
  const tierColor = (rank) => rank === 'S' ? '#ff4560' : rank === 'A' ? '#ff8c44' : rank === 'B' ? '#ffd700' : rank === 'C' ? '#88ccff' : '#888';
  // 백분위 → 티어 (리그 내 상대 평가)
  // S: 상위 15%, A: 상위 30%, B: 중위 30~70%, C: 하위 30%, D: 하위 15%
  function pctToTier(pct){
    if(pct >= 0.85) return 'S급';
    if(pct >= 0.70) return 'A급';
    if(pct >= 0.40) return 'B급';
    if(pct >= 0.20) return 'C급';
    return 'D급';
  }
  
  const rankInLeague = (pct) => {
    const n = leagueTeamStats.length;
    // V11.3 fix: pct=이하팀비율. 순위 = n - (이하 팀 수) + 1. (이전 +1 누락으로 2위가 1위로 뜸)
    const rank = Math.max(1, Math.min(n, Math.round(n - pct * n + 1)));
    return `리그 ${rank}/${n}위권`;
  };
  
  const metrics = [
    {
      label: '팀 타율',
      value: fmt3(oBBA),
      tier: pctToTier(pctBA),
      color: tierColor(pctToTier(pctBA).charAt(0)),
      note: `리그 평균 ${fmt3(leagueAvgs.bBA)} · ${rankInLeague(pctBA)}`
    },
    {
      label: '팀 피안타율',
      value: fmt3(oPBA),
      tier: pctToTier(pctBAA),
      color: tierColor(pctToTier(pctBAA).charAt(0)),
      note: `리그 평균 ${fmt3(leagueAvgs.pBA)} · ${rankInLeague(pctBAA)}`
    },
    {
      label: '팀 파워 (HH%)',
      value: oBHHpct.toFixed(1) + '%',
      tier: pctToTier(pctHH),
      color: tierColor(pctToTier(pctHH).charAt(0)),
      note: `HR ${oBHR} · 리그 평균 ${leagueAvgs.bHHpct.toFixed(1)}% · ${rankInLeague(pctHH)}`
    },
    {
      label: '팀 헛스윙 유도',
      value: oPWhiffPct.toFixed(1) + '%',
      tier: pctToTier(pctK),
      color: tierColor(pctToTier(pctK).charAt(0)),
      note: `리그 평균 ${leagueAvgs.pWhPct.toFixed(1)}% · ${rankInLeague(pctK)}`
    },
    {
      label: '팀 선구안',
      value: oBChase.toFixed(1) + '%',
      tier: pctToTier(pctChase),
      color: tierColor(pctToTier(pctChase).charAt(0)),
      note: `리그 평균 ${leagueAvgs.bChase.toFixed(1)}% · ${rankInLeague(pctChase)}`
    }
  ];
  
  // ─ 강점 / 약점 (백분위 기반) ─
  const strengths = [], weaknesses = [];
  
  if(pctBA >= 0.75) strengths.push(`<b>🔥 팀 타율 ${fmt3(oBBA)}</b> — 리그 상위권 (${rankInLeague(pctBA)}). 컨택 능력 우수.`);
  else if(pctBA <= 0.25) weaknesses.push(`<b>💨 팀 타율 ${fmt3(oBBA)}</b> — 리그 하위권 (${rankInLeague(pctBA)}). 안타 생산 부족.`);
  
  if(pctHH >= 0.75) strengths.push(`<b>💥 강타 능력</b> — 하드힛 ${oBHHpct.toFixed(1)}%, HR ${oBHR}. 리그 상위 (${rankInLeague(pctHH)}).`);
  else if(pctHH <= 0.25) weaknesses.push(`<b>💪 파워 부족</b> — 하드힛 ${oBHHpct.toFixed(1)}%, HR ${oBHR}. 리그 하위 (${rankInLeague(pctHH)}).`);
  
  if(pctChase >= 0.75) strengths.push(`<b>👁️ 선구안 우수</b> — 체이스 ${oBChase.toFixed(1)}%. 리그 상위 (${rankInLeague(pctChase)}). 유인구 안 통함.`);
  else if(pctChase <= 0.25) weaknesses.push(`<b>🪤 선구안 약함</b> — 체이스 ${oBChase.toFixed(1)}%. 리그 하위 (${rankInLeague(pctChase)}). 유인구에 자주 속음.`);
  
  if(pctBAA >= 0.75) strengths.push(`<b>🛡️ 투수진 우수</b> — 피안타율 ${fmt3(oPBA)}. 리그 상위 (${rankInLeague(pctBAA)}). 안타 잘 안 줌.`);
  else if(pctBAA <= 0.25) weaknesses.push(`<b>📉 투수진 부진</b> — 피안타율 ${fmt3(oPBA)}. 리그 하위 (${rankInLeague(pctBAA)}). 안타 자주 맞음.`);
  
  if(pctK >= 0.75) strengths.push(`<b>❌ 탈삼진 능력</b> — 헛스윙 ${oPWhiffPct.toFixed(1)}%. 리그 상위 (${rankInLeague(pctK)}). 결정구 좋음.`);
  else if(pctK <= 0.25) weaknesses.push(`<b>📉 헛스윙 부족</b> — 헛스윙 ${oPWhiffPct.toFixed(1)}%. 리그 하위 (${rankInLeague(pctK)}). 결정구 부족.`);
  
  // 추가 보조 지표 (절대 기준은 명확한 경우만 — BB는 5% 이하면 진짜 좋음, 8% 이상이면 진짜 나쁨)
  if(oPBBpct < 5 && ourPitchingN >= 200) strengths.push(`<b>🎯 제구력 우수</b> — BB% ${oPBBpct.toFixed(1)}%. 공짜 출루 거의 없음.`);
  else if(oPBBpct >= 9) weaknesses.push(`<b>💢 사사구 많음</b> — BB% ${oPBBpct.toFixed(1)}%. 제구 불안.`);
  
  if(oPHR <= 5 && ourPitchingN >= 300) strengths.push(`<b>🛡️ 피HR 적음</b> — ${oPHR}개. 한방 위험 적음.`);
  else if(oPHR >= 25) weaknesses.push(`<b>💥 피HR 많음</b> — ${oPHR}개. 한방 위험 큼.`);
  
  if(!strengths.length) strengths.push('두드러진 강점 없음. 모든 영역에서 리그 평균 수준.');
  if(!weaknesses.length) weaknesses.push('두드러진 약점 없음. 모든 영역에서 리그 평균 이상.');
  
  // ─ 우리팀 선수별 데이터 미리 인덱싱 (G.filter 반복 호출 방지) ─
  const myBatterData = {};   // name -> array of pitches
  const myPitcherData = {};  // name -> array of pitches
  const batterSet = new Set(batterNames);
  const pitcherSet = new Set(pitcherNames);
  for(let i=0; i<wbdContext.G.length; i++){
    const d = wbdContext.G[i];
    if(batterSet.has(d.bName)){
      if(!myBatterData[d.bName]) myBatterData[d.bName] = [];
      myBatterData[d.bName].push(d);
    }
    if(pitcherSet.has(d.pName)){
      if(!myPitcherData[d.pName]) myPitcherData[d.pName] = [];
      myPitcherData[d.pName].push(d);
    }
  }
  
  // ─ 핵심 선수 ─
  const coreBatters = batterNames.map(n => {
    const arr = myBatterData[n] || [];
    if(arr.length < 30) return null;
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    if(ab < 15) return null;
    const ba = hits/ab;
    const hr = arr.filter(d => +d.result===4).length;
    const bd = arr.filter(wbdContext._isInPlay);
    const hh = bd.filter(d => wbdContext._isHardHit(d)).length;
    const hhPct = bd.length>0 ? hh/bd.length*100 : 0;
    const c = wbdContext.calcBatterCard(n);
    
    let role = '', score = 0;
    if(ba >= 0.300 && hr >= 5) { role = '중심타선 핵심'; score = ba * 1000 + hr * 10; }
    else if(hr >= 5 || hhPct >= 14) { role = '파워 타자'; score = hr * 15 + hhPct; }
    else if(ba >= 0.290) { role = '컨택 타자'; score = ba * 1000; }
    else if(ba >= 0.260) { role = '주전 라인업'; score = ba * 1000; }
    else return null;
    
    return {
      name: n,
      role,
      score,
      note: `타율 ${fmt3(ba)} · HR ${hr}${hhPct>=10?' · HH '+hhPct.toFixed(0)+'%':''}${c?' · OVR '+c.OVR:''}`
    };
  }).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0, 5);
  
  const corePitchers = pitcherNames.map(n => {
    const arr = myPitcherData[n] || [];
    if(arr.length < 30) return null;
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    if(ab < 15) return null;
    const ba = hits/ab;
    const sw = arr.filter(d=>d.bSwing).length;
    const wh = arr.filter(d=>(d.bSwing && +d.call!==2)).length;
    const whPct = sw>0 ? wh/sw*100 : 0;
    
    // ─ 등판 패턴 분석 (실제 inn 활용) ─
    // 게임별로: 몇 회부터 등판했나, 몇 이닝 던졌나, 마지막 등판 이닝 몇 회였나
    const gameGroups = {};
    arr.forEach(d => {
      if(!d._gameId) return;
      if(!gameGroups[d._gameId]) gameGroups[d._gameId] = {pitches:0, innings:new Set(), firstInn:99, lastInn:0};
      const g = gameGroups[d._gameId];
      g.pitches++;
      const inn = +d.inn;
      if(inn > 0){
        g.innings.add(inn);
        if(inn < g.firstInn) g.firstInn = inn;
        if(inn > g.lastInn) g.lastInn = inn;
      }
    });
    const gameIds = Object.keys(gameGroups);
    const games = gameIds.length;
    if(!games) return null;
    
    const pitchesPerGame = arr.length / games;
    
    // 첫 회(1-2회) 등판 비율 = 선발 신호
    const firstInnApps = gameIds.filter(gid => gameGroups[gid].firstInn <= 2).length;
    const firstInnRatio = firstInnApps / games;
    
    // 평균 등판 이닝 수
    const innsList = gameIds.map(gid => gameGroups[gid].innings.size);
    const avgInns = innsList.reduce((s,v)=>s+v, 0) / innsList.length;
    
    // 마지막 이닝 등판 (9회 또는 최종 이닝)
    // 각 경기 _gameId로 최종 이닝 알아내기
    const lastInnApps = gameIds.filter(gid => {
      // 그 경기의 마지막 이닝
      const allGamePitches = wbdContext.G.filter(d => d._gameId === gid);
      if(!allGamePitches.length) return false;
      const finalInn = Math.max(...allGamePitches.map(d => +d.inn || 0));
      return gameGroups[gid].lastInn >= finalInn - 0.5;  // 마지막 이닝까지 등판
    }).length;
    const lastInnRatio = games > 0 ? lastInnApps / games : 0;
    
    // 1이닝 (정확히 1이닝 내외) 등판 비율 = 마무리/셋업 시그널
    const oneInnApps = innsList.filter(n => n <= 1).length;
    const oneInnRatio = oneInnApps / games;
    
    const bb = arr.filter(d => +d.result===5).length;
    const bbPct = arr.length>0 ? bb/arr.length*100 : 0;
    const hr = arr.filter(d => +d.result===4).length;
    const hrRate = ab > 0 ? hr/ab*100 : 0;
    
    // 안정성 (경기별 피안타율 표편)
    let stability = 0;
    if(games >= 3){
      const baPerGame = gameIds.map(gid => {
        const garr = arr.filter(d => d._gameId === gid);
        const gAb = garr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
        const gHits = garr.filter(wbdContext._isHit).length;
        return gAb >= 3 ? gHits/gAb : null;
      }).filter(v => v !== null);
      if(baPerGame.length >= 3){
        const mean = baPerGame.reduce((s,v)=>s+v,0)/baPerGame.length;
        const variance = baPerGame.reduce((s,v)=>s+(v-mean)**2,0)/baPerGame.length;
        stability = Math.sqrt(variance);
      }
    }
    
    const c = wbdContext.calcPitcherCard(n);
    
    // ─ 역할 분류 (실제 등판 패턴 절대 우선) ─
    let role = '', score = 0;
    let roleDetail = '';
    let track = '';  // 'starter' | 'closer' | 'setup' | 'long' | 'other'
    
    // 1) 선발 (1회 등판 비율 ≥ 50% OR 평균 ≥ 3이닝) - 패턴이면 무조건 선발
    if(firstInnRatio >= 0.5 || avgInns >= 3){
      track = 'starter';
      roleDetail = `1회 등판 ${firstInnApps}/${games} · 평균 ${avgInns.toFixed(1)}이닝`;
      // 임시 라벨 (나중에 팀 내 상대 평가로 재할당)
      role = '선발';
      score = (1-ba)*200 + whPct - bbPct*3 - hrRate*2;
    }
    // 2) 마무리 후보
    else if(lastInnRatio >= 0.5 && oneInnRatio >= 0.6 && games >= 3){
      track = 'closer';
      roleDetail = `마지막 이닝 등판 ${lastInnApps}/${games} · 평균 ${avgInns.toFixed(1)}이닝`;
      role = '마무리';
      score = (1-ba)*180 + whPct*1.5;
    }
    // 3) 셋업맨/중간 (짧고 자주)
    else if(oneInnRatio >= 0.6 && games >= 3 && avgInns < 1.5){
      track = 'setup';
      roleDetail = `짧은 등판 ${oneInnApps}/${games} · 평균 ${avgInns.toFixed(1)}이닝`;
      role = '셋업/중간';
      score = (1-ba)*150 + whPct;
    }
    // 4) 롱릴리프 (2-3이닝씩, 첫 회 아님)
    else if(avgInns >= 1.5 && avgInns < 3 && firstInnRatio < 0.5){
      track = 'long';
      roleDetail = `중간 등판 · 평균 ${avgInns.toFixed(1)}이닝`;
      role = '롱릴리프';
      score = (1-ba)*120 + whPct*0.5;
    }
    // 5) 기타 (분류 애매)
    else {
      track = 'other';
      roleDetail = `평균 ${avgInns.toFixed(1)}이닝 · 패턴 다양`;
      if(ba < 0.300) role = '스폿/다목적';
      else if(ba < 0.350) role = '대체 자원';
      else return null;
      score = (1-ba)*80;
    }
    
    return {
      name: n,
      role,
      roleDetail,
      score,
      track,  // 트랙 (선발/마무리/셋업/롱릴리프)
      ba, whPct, games, pitchesPerGame, bbPct, hr, stability,
      avgInns, firstInnRatio, lastInnRatio, oneInnRatio,
      note: `${games}경기 · ${roleDetail} · 피안타 ${fmt3(ba)}${whPct>=20?' · 헛스윙 '+whPct.toFixed(0)+'%':''}${bbPct>0?' · BB% '+bbPct.toFixed(1):''}${c?' · OVR '+c.OVR:''}`
    };
  }).filter(Boolean);
  
  // ─ 트랙별로 팀 내 상대 등급 매기기 (ba 절대 기준 X) ─
  // 선발 트랙: 팀 내 ba 순으로 정렬해서 1선발/2선발/.../부진 선발 라벨
  const allCorePitchers = corePitchers;
  const starters = allCorePitchers.filter(p => p.track === 'starter').sort((a,b)=>a.ba - b.ba);
  const closers = allCorePitchers.filter(p => p.track === 'closer').sort((a,b)=>a.ba - b.ba);
  const setups = allCorePitchers.filter(p => p.track === 'setup').sort((a,b)=>a.ba - b.ba);
  const longs = allCorePitchers.filter(p => p.track === 'long').sort((a,b)=>a.ba - b.ba);
  
  // 선발 등급: 팀 내 순위 기반 (라벨 통일: "주전 N선발")
  // 한 팀 기본 3~4선발 로테이션
  starters.forEach((p, i) => {
    if(starters.length === 1){
      // 1명뿐이면 성적 기반
      if(p.ba < 0.260 && p.bbPct < 8 && p.stability < 0.15) p.role = '주전 1선발 (에이스)';
      else if(p.ba < 0.300) p.role = '주전 1선발';
      else if(p.ba < 0.380) p.role = '주전 1선발 (부진)';
      else p.role = '주전 1선발 (재건)';
    } else if(i === 0){
      // 1위 (팀 내 최고 선발)
      if(p.ba < 0.260 && p.stability < 0.15) p.role = '주전 1선발 (에이스)';
      else p.role = '주전 1선발';
    } else if(i === 1){
      p.role = '주전 2선발';
    } else if(i === 2){
      p.role = '주전 3선발';
    } else if(i === 3){
      p.role = '주전 4선발';
    } else {
      // 5번째부터는 백업 선발 (3~4선발 로테이션 기본)
      p.role = '백업 선발';
    }
  });
  
  // 마무리 등급
  closers.forEach((p, i) => {
    if(i === 0){
      if(p.ba < 0.240 && p.whPct >= 25) p.role = '마무리 (Closer)';
      else p.role = '마무리 (팀 내 최고)';
    } else if(i === 1){
      p.role = '마무리 후보';
    } else {
      p.role = '마무리 대체';
    }
  });
  
  // 셋업 등급
  setups.forEach((p, i) => {
    if(setups.length === 1){
      if(p.ba < 0.260 && p.whPct >= 22) p.role = '필승조 (셋업)';
      else if(p.ba < 0.320) p.role = '중간 계투';
      else p.role = '추격조';
    } else if(i === 0){
      if(p.ba < 0.260) p.role = '필승조 (셋업)';
      else p.role = '셋업 (팀 내 최고)';
    } else if(i < setups.length / 2){
      p.role = '중간 계투';
    } else {
      p.role = '추격조';
    }
  });
  
  // 롱릴리프 등급
  longs.forEach((p, i) => {
    if(i === 0){
      if(p.ba < 0.280) p.role = '롱릴리프 (핵심)';
      else p.role = '롱릴리프';
    } else {
      p.role = '롱릴리프 / 추격조';
    }
  });
  
  // 최종 정렬: 트랙 우선순위 (선발 > 마무리 > 셋업 > 롱릴리프 > 기타) + 각 트랙 내 ba 순
  const trackOrder = {'starter': 0, 'closer': 1, 'setup': 2, 'long': 3, 'other': 4};
  const corePitchers_final = allCorePitchers.sort((a, b) => {
    const tA = trackOrder[a.track] || 9;
    const tB = trackOrder[b.track] || 9;
    if(tA !== tB) return tA - tB;
    return a.ba - b.ba;  // 같은 트랙이면 ba 낮은 순 (좋은 순)
  }).slice(0, 12);  // 선발 5명+마무리+셋업+롱릴리프까지 모두 표시
  
  // corePitchers 재할당 (위 변수명을 그대로 사용)
  const corePitchersResult = corePitchers_final;
  
  // ─ 감독 총평 (분석적·구체적) ─
  let summary = '';
  
  // 1. 등급 + 스타일 한 줄로
  const gradeDesc = grade === 'A+' ? '리그 상위 15% 우승권 전력'
                  : grade === 'A' ? '리그 상위 30%의 강팀'
                  : grade === 'B+' ? '평균 이상의 안정적 팀'
                  : grade === 'B' ? '리그 평균 수준'
                  : grade === 'C' ? '리그 하위권, 보강 시급'
                  : '재건이 필요한 약체';
  summary += `<b>${style} 스타일의 ${gradeDesc}</b>. `;
  
  // 2. 타선·투수 비교 (구체적 백분위 언급)
  const offRank = (pctBA + pctHH) / 2;
  const defRank = (pctBAA + pctK) / 2;
  
  if(offRank >= 0.65 && defRank >= 0.65){
    summary += `타선(상위 ${((1-offRank)*100).toFixed(0)}%)과 투수진(상위 ${((1-defRank)*100).toFixed(0)}%) 모두 강한 균형 잡힌 팀. `;
  } else if(offRank >= 0.65 && defRank <= 0.35){
    summary += `타선은 강한데 투수진이 약점. 자주 <b>난타전</b>이 될 가능성. 타격 컨디션이 곧 성적. `;
  } else if(defRank >= 0.65 && offRank <= 0.35){
    summary += `투수진은 좋지만 타선이 부진. <b>로우스코어 박빙</b> 경기 많을 듯. 1점만 내도 이길 수 있는 야구. `;
  } else if(offRank <= 0.35 && defRank <= 0.35){
    summary += `타선·투수진 모두 약함. 정공법으로는 한계, <b>작전·매치업</b>으로 승부 봐야 함. `;
  } else if(offRank >= 0.55){
    summary += `타선 의존도 높음. 투수진은 평균 수준이라 5점 이상 내야 안정. `;
  } else if(defRank >= 0.55){
    summary += `투수진 의존도 높음. 1-2점만 막아도 이길 수 있는 야구가 가능. `;
  } else {
    summary += `모든 영역이 평균 근처. 특정 경기/매치업에 따라 결과 갈림. `;
  }
  
  // 3. 가장 두드러진 강점/약점 1개씩
  const allPcts = [
    {name:'타율', pct:pctBA, type:'+'},
    {name:'피안타율', pct:pctBAA, type:'+'},
    {name:'장타력', pct:pctHH, type:'+'},
    {name:'탈삼진', pct:pctK, type:'+'},
    {name:'선구안', pct:pctChase, type:'+'}
  ];
  const bestArea = allPcts.slice().sort((a,b) => b.pct - a.pct)[0];
  const worstArea = allPcts.slice().sort((a,b) => a.pct - b.pct)[0];
  if(bestArea.pct >= 0.65){
    summary += `최강점은 <b>${bestArea.name}</b> (리그 ${Math.max(1, Math.round(leagueTeamStats.length - bestArea.pct * leagueTeamStats.length))}위권). `;
  }
  if(worstArea.pct <= 0.35){
    summary += `최약점은 <b>${worstArea.name}</b> — 보강 필요. `;
  }
  
  // 4. 핵심 자원
  if(coreBatters.length && corePitchers.length){
    summary += `핵심 자원: <b>${coreBatters[0].name}</b>(타)·<b>${corePitchers[0].name}</b>(투).`;
  } else if(coreBatters.length){
    summary += `타선 핵심: <b>${coreBatters[0].name}</b>. 투수진 보강 시급.`;
  } else if(corePitchers.length){
    summary += `투수 핵심: <b>${corePitchers[0].name}</b>. 타선 보강 시급.`;
  } else {
    summary += `핵심 자원 부재. 전반적 영입/육성 필요.`;
  }
  
  // ─ 운영 추천 (백분위 + 깊은 분석) ─
  const operations = [];
  
  // 1. 공격 전술 (타선 백분위 기반)
  if(pctHH >= 0.7){
    operations.push(`<b>⚔️ 공격 전술 — 장타 야구</b>: 하드힛 ${oBHHpct.toFixed(1)}% (리그 상위). 희생번트·도루 최소화하고 <b>빅이닝</b> 노려라. 1점차로 끝나는 경기는 손해.`);
  } else if(pctBA >= 0.7 && pctHH < 0.4){
    operations.push(`<b>⚔️ 공격 전술 — 연결 야구</b>: 타율 ${fmt3(oBBA)} 우수, 파워는 부족. <b>이어치기·진루타·도루</b>로 점수 짜내라. 4번에 너무 의존하지 말 것.`);
  } else if(pctChase <= 0.3){
    operations.push(`<b>⚔️ 공격 전술 — 인내 우선</b>: 체이스 ${oBChase.toFixed(1)}% (선구안 리그 하위). 적극 어프로치 자제. <b>2-1 카운트까지 좋은 공만</b> 노리는 훈련 필수.`);
  } else if(pctBA <= 0.3 && pctHH <= 0.3){
    operations.push(`<b>⚔️ 공격 전술 — 스몰볼</b>: 컨택·파워 모두 약함 (리그 하위). <b>번트·런앤히트·도루</b> 적극. 1점씩 짜내야 함. 큰 이닝 노리면 자멸.`);
  } else if(pctBA >= 0.55 && pctHH >= 0.55){
    operations.push(`<b>⚔️ 공격 전술 — 균형 야구</b>: 컨택·파워 모두 평균 이상. 상황별 유연 대응. 주자 있을 땐 컨택, 빈 베이스 땐 적극 풀스윙.`);
  } else {
    operations.push(`<b>⚔️ 공격 전술 — 보강 필요</b>: 타선이 평균 수준. 상위 3-5번에 화력 집중하고 하위 타순은 작전 위주로.`);
  }
  
  // 2. 투수 전술
  if(pctK >= 0.7 && pctBAA >= 0.5){
    operations.push(`<b>🛡️ 투수 전술 — 탈삼진 위주</b>: 헛스윙 ${oPWhiffPct.toFixed(1)}% (리그 상위). 변화구 잘 통함. <b>2스트라이크 후 결정구 적극</b>. 카운트만 잡으면 K로 끝낼 수 있음.`);
  } else if(pctBAA >= 0.7 && pctK < 0.5){
    operations.push(`<b>🛡️ 투수 전술 — 약한 타구 유도</b>: 피안타율 ${fmt3(oPBA)} 우수, 헛스윙은 평범. <b>컨택은 시키되 약한 타구로</b> 처리하는 스타일. 수비 집중 필요.`);
  } else if(pctBAA <= 0.3){
    operations.push(`<b>🛡️ 투수 전술 — 보강 시급</b>: 피안타율 ${fmt3(oPBA)} (리그 하위). 정면 승부 X. <b>코너 정확도 / 변화구 무브 우선 보강</b>. 가운데 들어가면 즉시 강판.`);
  } else if(pctK <= 0.3){
    operations.push(`<b>🛡️ 투수 전술 — 컨택 게임</b>: 헛스윙 ${oPWhiffPct.toFixed(1)}% (리그 하위). K 못 잡음. <b>인필드 수비 강화</b>·병살 유도가 핵심.`);
  } else {
    operations.push(`<b>🛡️ 투수 전술 — 코너 야구</b>: 투수진 평균 수준. 정면 승부보다 코너·유인구 적극.`);
  }
  
  // 3. 선발/구원 운영 (위에서 트랙별로 분류된 starters/closers/setups/longs 재사용)
  const opStarters = starters;
  const opClosers = closers;
  const opSetups = setups;
  const opLongs = longs;
  
  if(opStarters.length >= 3){
    const rotationStarters = opStarters.slice(0, Math.min(4, opStarters.length));
    let msg = '';
    if(opStarters.length >= 4){
      msg = '4선발 안정 (3~4선발 로테이션 충분).';
    } else if(opStarters.length === 3){
      msg = '3선발 가용 (기본 로테이션 OK, 4선발 보강하면 더 좋음).';
    }
    operations.push(`<b>🎯 선발 로테이션</b>: <b>${rotationStarters.map(p => p.name).join(' · ')}</b>${opStarters.length > 4 ? ` + 백업 ${opStarters.length - 4}명`:''}. ${msg}`);
  } else if(opStarters.length === 2){
    operations.push(`<b>🎯 선발진 부족</b>: 검증된 선발 2명 (<b>${opStarters.map(p=>p.name).join(' · ')}</b>)만 있음 — 3선발 추가 보강 시급.`);
  } else if(opStarters.length === 1){
    operations.push(`<b>⚠️ 선발진 매우 부족</b>: <b>${opStarters[0].name}</b> 1명만 검증됨. 2~3선발 영입 절실.`);
  } else {
    operations.push(`<b>⚠️ 선발진 공백</b>: 등판 패턴상 선발급 투수 없음. 구원진으로 막거나 선발 영입 필요.`);
  }
  
  if(closers.length){
    operations.push(`<b>🔒 마무리</b>: <b>${closers[0].name}</b> (${fmt3(closers[0].ba)} · K%유발 ${closers[0].whPct.toFixed(0)}%). 9회 리드 상황 고정.`);
  } else if(setups.length){
    operations.push(`<b>🔒 마무리 후보</b>: 진짜 마무리급 없음. <b>${setups[0].name}</b>이 셋업급 → 마무리 전환 고려.`);
  }
  
  if(setups.length >= 2){
    operations.push(`<b>⚡ 필승조</b>: <b>${setups.slice(0,3).map(p=>p.name).join(' · ')}</b>. 7-8회 박빙 상황 투입.`);
  } else if(setups.length === 1 && !closers.length){
    operations.push(`<b>⚡ 필승조 약함</b>: 셋업급 ${setups[0].name} 1명뿐. 7-8회 위기시 흔들릴 위험.`);
  }
  
  // 4. 라인업 추천 (이전 라인업 코드 활용 예고)
  if(coreBatters.length >= 3){
    const core3 = coreBatters.slice(0,3).map(p => p.name).join(' · ');
    operations.push(`<b>📋 핵심 타선</b>: <b>${core3}</b>를 2-3-4번에 배치 추천 (아래 추천 라인업 참고).`);
  }
  
  // 5. 명백한 약점 경고 (절대 기준)
  if(oPBBpct >= 8){
    operations.push(`<b>⚠️ 제구 위기</b>: 투수진 BB% ${oPBBpct.toFixed(1)}% (정상치 5% 이하). 공짜 출루로 자멸하는 패턴. 초구 스트라이크 / 카운트 잡기 훈련 시급.`);
  }
  
  if(oPHR >= 25 && ourPitchingN >= 500){
    operations.push(`<b>⚠️ 피홈런 다발</b>: ${oPHR}개 (리그 평균 대비 매우 높음). 실투 줄이고 한방 위험 코스 (한가운데, 높은 직구) 회피 훈련.`);
  }
  
  // 6. 매치업 전략 (스타일 기반)
  if(style === '재건 / 약체'){
    operations.push(`<b>🎲 매치업 전략</b>: 약체 팀. 강팀 만나면 <b>스몰볼 + 짧은 투수 운영</b>으로 단기전 노리고, 약팀 만나면 화력전 시도.`);
  } else if(style === '장타력 위주'){
    operations.push(`<b>🎲 매치업 전략</b>: 장타 의존도 높음. <b>좌투/사이드암 만나면 위험</b> — 대타 카드 준비. 정통파 우투 상대로 강함.`);
  } else if(style === '투수력 위주'){
    operations.push(`<b>🎲 매치업 전략</b>: 투수 우위 팀. <b>로우스코어 야구</b>로 끌고 가야 유리. 1-2점 차로도 충분.`);
  }
  
  if(!operations.length) operations.push('특별한 추천 없음. 안정적 운영.');
  
  // ─ 추천 라인업 (sabermetrics 기반 최적화) ─
  // 각 선수의 종합 스탯 + 좌우 정보 모음
  const allHitters = batterNames.map(n => {
    const arr = myBatterData[n] || [];
    if(arr.length < 30) return null;
    const hits = arr.filter(wbdContext._isHit).length;
    const ab = arr.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    if(ab < 15) return null;
    const ba = hits/ab;
    const hr = arr.filter(d => +d.result===4).length;
    const singles = arr.filter(d => +d['1BSafe']===1).length;  // 단타
    const bd = arr.filter(wbdContext._isInPlay);
    const hh = bd.filter(d => wbdContext._isHardHit(d)).length;
    const hhPct = bd.length>0 ? hh/bd.length*100 : 0;
    const avgEV = bd.length>0 ? bd.reduce((s,d)=>s+(+d.ev),0)/bd.length : 0;
    const bb = arr.filter(d => +d.result===5).length;
    const hbp = arr.filter(d => +d.result===6).length;
    const obpDenom = ab + bb + hbp;
    const obp = obpDenom > 0 ? (hits + bb + hbp) / obpDenom : 0;
    const outZ = arr.filter(d => {const zx=+d.zoneX,zy=+d.zoneY; return !(zx>=-1&&zx<=1&&zy>=-1&&zy<=1);});
    const chase = outZ.length>0 ? outZ.filter(d=>d.bSwing).length/outZ.length*100 : 100;
    const sw = arr.filter(d => d.bSwing).length;
    const wh = arr.filter(d => (d.bSwing && +d.call !== 2)).length;
    const whPct = sw > 0 ? wh/sw*100 : 0;
    
    // 추정 SLG / ISO (장타력 지표)
    // 단타 + HR*4 (2루타/3루타 데이터 없으므로 단순화)
    // 실제로는 GroundBall hits = singles 대부분이므로 ISO = HR/AB *4 정도로 추정
    const slg = ab > 0 ? (singles + hr*4) / ab : 0;
    const iso = slg - ba;  // 장타력 (순수 파워)
    
    // OPS 추정
    const ops = obp + slg;
    
    // 클러치 (불리 카운트 타율)
    const dis = arr.filter(d => (+d.ball===0&&+d.strk===1) || (+d.ball===0&&+d.strk===2) || (+d.ball===1&&+d.strk===2));
    const disAB = dis.filter(d => {const r=+d.result; return wbdContext._isABPitch(d);}).length;
    const disHits = dis.filter(wbdContext._isHit).length;
    const clutchBA = disAB > 0 ? disHits/disAB : 0;
    
    // 좌우 (bZone)
    const bZone = arr[0]?.bZone || '?';
    
    // 표본 신뢰도 보너스
    const sampleBonus = Math.min(1, ab / 50);
    
    // ─ 각 타순별 적합도 점수 (sabermetrics 기반) ─
    // 1번 (리드오프): 출루 + 빠른 발 (스피드 데이터 없으니 OBP+체이스 낮음)
    //   주요: OBP, BB%, 체이스율 낮음, 컨택
    const score1 = (
      obp * 200 +                       // 출루 최우선
      (bb / Math.max(ab, 1)) * 100 +    // BB% 가산
      (40 - Math.min(40, chase)) * 1.5 + // 체이스 낮을수록 좋음 (40→0pt, 0→60pt)
      ba * 50 -                          // 타율 보조
      whPct * 0.3 +                      // 헛스윙 페널티
      sampleBonus * 20                   // 표본 신뢰도
    );
    
    // 2번 (현대 야구의 핵심 - 최고 타자가 여기): OPS 위주, 컨택+파워+선구 균형
    //   주요: OPS, 헛스윙 낮음
    const score2 = (
      ops * 300 +                        // OPS 최우선
      ba * 80 -
      whPct * 0.4 +
      obp * 80 +
      iso * 100 +
      sampleBonus * 30
    );
    
    // 3번 (정통 best 타자): OPS 최강 (보통 팀 최고 타자)
    //   주요: OPS, ISO, BA, HR
    const score3 = (
      ops * 350 +                        // OPS 핵심
      iso * 200 +                        // 장타력
      ba * 100 +
      hr * 6 +
      hhPct * 1.5 +
      sampleBonus * 30
    );
    
    // 4번 (클린업/순수 파워): HR + ISO + 하드힛 / 컨택 약간 양보 가능
    //   주요: HR, HH%, EV, ISO
    const score4 = (
      hr * 18 +                          // HR이 핵심
      hhPct * 5 +
      avgEV * 0.8 +
      iso * 250 +
      slg * 100 +
      ba * 30 +
      sampleBonus * 20
    );
    
    // 5번 (보호타자): 4번 뒤를 받치는 타자 - 파워 있는데 4번보다 약간 떨어지는 정도
    //   주요: HR, ISO, BA 균형
    const score5 = (
      hr * 12 +
      iso * 180 +
      hhPct * 3 +
      ba * 80 +
      ops * 100 +
      sampleBonus * 15
    );
    
    // 6번 (보조 파워): 5번보다 더 약한 파워, 클러치 가능하면 좋음
    const score6 = (
      ba * 100 +
      hhPct * 2 +
      hr * 8 +
      clutchBA * 60 +
      ops * 80
    );
    
    // 7번 (안정 컨택): 단순 BA 위주
    const score7 = (
      ba * 120 +
      ops * 60 +
      hhPct
    );
    
    // 8-9번 (하위): 그냥 컨택 + 출루 가능하면 좋음
    const score89 = (
      ba * 80 +
      obp * 60 -
      whPct * 0.2
    );
    
    return {
      name:n, bZone, ba, hr, hhPct, avgEV, bb, hbp, chase, ab, hits, obp, whPct, slg, iso, ops, clutchBA, singles,
      scores: {p1:score1, p2:score2, p3:score3, p4:score4, p5:score5, p6:score6, p7:score7, p89:score89},
      // 종합 점수 (전체 능력 - wOBA 비슷)
      overall: obp * 100 + slg * 100 + iso * 50 - whPct * 0.3
    };
  }).filter(Boolean);
  
  // ─ 라인업 구성 (그리디 최적화) ─
  // 각 자리에 가장 적합한 후보를 선택하되, 중복 피함
  // 순서: 3번 → 4번 → 2번 → 1번 → 5번 → 6 → 7 → 8 → 9
  // (이론: 최고 타자가 3-4-2번에 들어가야 득점 기회 최대)
  
  const suggestedLineup = [];
  const used = new Set();
  
  function pickBest(scoreKey){
    const candidates = allHitters.filter(p => !used.has(p.name) && p.ab >= 20);
    if(!candidates.length) return null;
    return candidates.slice().sort((a,b) => b.scores[scoreKey] - a.scores[scoreKey])[0];
  }
  
  // 3번 먼저 - 보통 팀 최고 타자
  const p3 = pickBest('p3');
  if(p3) used.add(p3.name);
  // 4번 - 파워
  const p4 = pickBest('p4');
  if(p4) used.add(p4.name);
  // 2번 - 현대 야구 핵심 (OPS best)
  const p2 = pickBest('p2');
  if(p2) used.add(p2.name);
  // 1번 - 리드오프
  const p1 = pickBest('p1');
  if(p1) used.add(p1.name);
  // 5번 - 보호
  const p5 = pickBest('p5');
  if(p5) used.add(p5.name);
  // 6번 - 보조 파워
  const p6 = pickBest('p6');
  if(p6) used.add(p6.name);
  // 7번 - 안정 컨택
  const p7 = pickBest('p7');
  if(p7) used.add(p7.name);
  // 8번
  const p8 = pickBest('p89');
  if(p8) used.add(p8.name);
  // 9번
  const p9 = pickBest('p89');
  if(p9) used.add(p9.name);
  
  // 좌우 교차 체크
  const lineupOrder = [p1, p2, p3, p4, p5, p6, p7, p8, p9];
  
  // 각 타순별 설명 생성 (자세하게)
  function tagFor(p, pos){
    if(!p) return null;
    const sup = [];
    if(pos === 1) {
      sup.push(`OBP ${fmt3(p.obp)}`);
      sup.push(`체이스 ${p.chase.toFixed(0)}%`);
      sup.push(`BB ${p.bb}`);
    } else if(pos === 2) {
      sup.push(`OPS ${fmt3(p.ops)}`);
      sup.push(`타율 ${fmt3(p.ba)}`);
      if(p.hhPct >= 9) sup.push(`HH ${p.hhPct.toFixed(0)}%`);
    } else if(pos === 3) {
      sup.push(`OPS ${fmt3(p.ops)}`);
      sup.push(`타율 ${fmt3(p.ba)}`);
      sup.push(`HR ${p.hr}`);
      if(p.iso > 0) sup.push(`ISO ${fmt3(p.iso)}`);
    } else if(pos === 4) {
      sup.push(`HR ${p.hr}`);
      sup.push(`ISO ${fmt3(p.iso)}`);
      sup.push(`HH ${p.hhPct.toFixed(0)}%`);
      sup.push(`EV ${p.avgEV.toFixed(0)}mph`);
    } else if(pos === 5) {
      sup.push(`타율 ${fmt3(p.ba)}`);
      sup.push(`HR ${p.hr}`);
      if(p.iso > 0) sup.push(`ISO ${fmt3(p.iso)}`);
    } else if(pos === 6 || pos === 7){
      sup.push(`타율 ${fmt3(p.ba)}`);
      if(p.hr > 0) sup.push(`HR ${p.hr}`);
      if(p.clutchBA > 0) sup.push(`불리타율 ${fmt3(p.clutchBA)}`);
    } else {
      sup.push(`타율 ${fmt3(p.ba)}`);
      if(p.hr > 0) sup.push(`HR ${p.hr}`);
      sup.push(`OBP ${fmt3(p.obp)}`);
    }
    return sup.join(' · ');
  }
  
  const posLabels = ['리드오프 (출루형)', '핵심 연결 (OPS↑)', '종합 최고 (Best)', '클린업 (파워)', '보호 타자', '보조 파워', '안정 컨택', '하위 타순', '하위 타순'];
  lineupOrder.forEach((p, i) => {
    if(p){
      suggestedLineup.push({
        name: p.name,
        bZone: p.bZone,
        note: `<b>${p.bZone==='L'?'좌':p.bZone==='R'?'우':'?'}타</b> · ${posLabels[i]} — ${tagFor(p, i+1)}`
      });
    }
  });
  
  return {
    batterCount: batterNames.length,
    pitcherCount: pitcherNames.length,
    gameCount: teamGamesCount,
    style, styleColor,
    grade, gradeColor, gradeLabel,
    summary,
    metrics,
    strengths, weaknesses,
    coreBatters, corePitchers: corePitchersResult,
    operations,
    suggestedLineup: suggestedLineup.slice(0, 9),
    // 메타 (디버그용)
    _meta: {
      pctBA, pctBAA, pctHH, pctK, pctChase, overallPct,
      leagueTeams: leagueTeamStats.length
    }
  };
};
}

export function initialize(wbdContext) {
// Original index.html:27071
window.SHOW_FORM = (localStorage.getItem('wbd_show_form')!=='0');

// Original index.html:27150
wbdContext._SIDE_LABEL = {left:'좌측', center:'중앙', right:'우측'};

// Original index.html:27151
wbdContext._SIDE_DESC = {left:'좌측 (LF·3루)', center:'중앙 (CF)', right:'우측 (RF·1루)'};

// Original index.html:27152
wbdContext._SIDE_COLOR = {left:'#88ccff', center:'#ffd700', right:'#cc88ff'};

// Original index.html:27329
wbdContext.TEAM_W = {
  bat:  {contact:0.35, power:0.40, eye:0.25},          // 타격 내부 배분
  pit:  {pStuff:0.35,  pCtrl:0.25, pResult:0.40},      // 투수 내부 배분
  total:{bat:0.45, pit:0.45, def:0.10}                 // 팀 종합 (수비는 OAA 신뢰도 감안)
};
}
