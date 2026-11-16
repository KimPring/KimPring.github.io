/** team-scout: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:25532
wbdContext._slPctile = function _slPctile(val, arr, higherIsBetter){
  const xs=arr.filter(v=>v!=null&&!isNaN(v)); if(xs.length<4||val==null||isNaN(val)) return null;
  let below=0; xs.forEach(v=>{ if(v<val) below++; });
  let p=below/xs.length*100;
  return higherIsBetter? Math.round(p) : Math.round(100-p);
};

// Original index.html:25538
wbdContext._slFmt3 = function _slFmt3(v){ return v==null?'-':(v<1?'.':'')+(Math.round(v*1000)).toString().padStart(3,'0'); };

// Original index.html:25539
wbdContext._slPct = function _slPct(v,d){ return v==null?'-':(v).toFixed(d==null?0:d)+'%'; };

// Original index.html:25542
wbdContext._slTeamRoster = function _slTeamRoster(team){
  const bats=[], pits=[];
  (window._cache.batterNames||[]).forEach(n=>{ if(wbdContext._playerTeam(n,'batter')===team) bats.push(n); });
  (window._cache.pitcherNames||[]).forEach(n=>{ if(wbdContext._playerTeam(n,'pitcher')===team) pits.push(n); });
  return {bats, pits};
};

// Original index.html:25550
wbdContext._slLeagueDist = function _slLeagueDist(){
  const key=(typeof wbdContext._gameStatsKey==='function'?wbdContext._gameStatsKey():(wbdContext.GAMES.length));
  if(window._slDist && window._slDist._k===key) return window._slDist;
  const bat={ba:[],ops:[],chase:[],hh:[],ev:[],brl:[],k:[]};
  (window._cache.batterNames||[]).forEach(n=>{
    const d=wbdContext.getBatterDataByName(n); if(d.length<40) return;
    const s=wbdContext._h2hSlash(d); if(!s||s.AB<20) return;
    bat.ba.push(s.ba); bat.ops.push(s.ops);
    const bd=d.filter(wbdContext._isInPlay);
    if(bd.length){ bat.ev.push(bd.reduce((a,x)=>a+(+x.ev),0)/bd.length);
      bat.hh.push(bd.filter(x=>+x.ev>=110).length/bd.length*100);
      bat.brl.push(bd.filter(x=>+x.ev>=105&&+x.ldeg>=8&&+x.ldeg<=32).length/bd.length*100); }
    const oz=d.filter(x=>{const zx=+x.zoneX,zy=+x.zoneY; return !(zx>=-1&&zx<=1&&zy>=-1&&zy<=1);});
    if(oz.length) bat.chase.push(oz.filter(x=>x.bSwing).length/oz.length*100);
    bat.k.push(s.kPct);
  });
  const pit={era:[],whip:[],baa:[],k9:[]};
  (window._cache.pitcherNames||[]).forEach(n=>{
    const se=wbdContext._getPitcherSeason(n); if(!se||se.ip<5) return;
    pit.era.push(se.era); pit.whip.push(se.whip); pit.k9.push(se.ip>0?se.ks/se.ip*9:0);
    const d=wbdContext.getPitcherDataByName(n); const s=wbdContext._h2hSlash(d); if(s&&s.AB>=15) pit.baa.push(s.ba);
  });
  return window._slDist={_k:key, bat, pit};
};

// Original index.html:25577
wbdContext._slBatterPlan = function _slBatterPlan(name){ return wbdContext._memoByGame('_slBatterPlan', name, ()=>wbdContext._slBatterPlan__raw(name)); };

// Original index.html:25578
wbdContext._slBatterPlan__raw = function _slBatterPlan__raw(name){
  const data=wbdContext._scoutCollectBatter(name); if(!data) return null;
  let rep=null; try{ rep=wbdContext._generateScoutReportBatter(data); }catch(e){}
  const dist=wbdContext._slLeagueDist().bat;
  const d=wbdContext.getBatterDataByName(name);
  const s=wbdContext._h2hSlash(d)||{};
  const ca=data.courseAll||{};
  const gv=data.byGroupVs||{};
  // 구종: 직구 vs 변화구 묶음
  const fb=gv['패스트볼']||gv['직구'];
  let brkHits=0,brkAb=0; Object.entries(gv).forEach(([g,st])=>{ if(g!=='패스트볼'&&g!=='직구'&&st){brkHits+=(st.ba||0)*(st.ab||0);brkAb+=(st.ab||0);} });
  const brkBA=brkAb>0?brkHits/brkAb:null;
  const fbBA=fb?fb.ba:null;
  // 약점 존(콜드): courseAll 중 타율 낮은 곳
  const courses=[['몸쪽',ca.inner],['바깥',ca.outer],['높은코스',ca.high],['낮은코스',ca.low]].filter(x=>x[1]&&x[1].ab>=4);
  courses.sort((a,b)=>(a[1].ba||0)-(b[1].ba||0));
  const coldCourse=courses[0], hotCourse=courses[courses.length-1];
  // xOut (있으면)
  let xba=null; try{ if(typeof wbdContext.getXOutData==='function'){ const xo=wbdContext.getXOutData().bat[name]||wbdContext.getXOutData().bat[(typeof wbdContext._canonPlayer==='function'?wbdContext._canonPlayer(name):name)]; if(xo&&xo.bip>0) xba=xo.xHits/xo.bip; } }catch(e){}
  // ── 한 줄 특징 ──
  const feats=[];
  const chaseP=wbdContext._slPctile(data.chasePct, dist.chase, false); // 낮을수록 선구안 좋음→상위
  if(data.chasePct!=null){ if(data.chasePct<=22) feats.push('볼에 잘 안 속음(선구안↑)'); else if(data.chasePct>=35) feats.push('유인구 잘 쫓음'); }
  if(s.ba>=0.34) feats.push('강타자'); else if(s.ba!=null&&s.ba<0.24) feats.push('타구 약함');
  if(data.firstPitchSwingPct!=null&&data.firstPitchSwingPct<=25) feats.push('초구 소극적');
  if(fbBA!=null&&brkBA!=null){ if(fbBA-brkBA>=0.08) feats.push('직구에 강, 변화구에 약'); }
  // ── 한 줄 공략법 ──
  let plan;
  if(s.ba>=0.34 && data.chasePct!=null && data.chasePct<30){ plan='존에 넣지 말 것 · 변화구를 볼존으로'; }
  else if(fbBA!=null&&brkBA!=null&&fbBA-brkBA>=0.08){ plan='변화구 비중↑ · '+(coldCourse?coldCourse[0]+' 낮은 변화구 결정구':'바깥 변화구 결정구'); }
  else if(data.chasePct!=null&&data.chasePct<=22){ plan='존 안 승부 · '+(coldCourse?coldCourse[0]+' 코스 공략':'코너 활용'); }
  else { plan='유인구로 헛스윙 유도'+(coldCourse?' ('+coldCourse[0]+')':''); }
  // ── 약점 Top3 ──
  const weak=[];
  if(brkBA!=null&&fbBA!=null&&fbBA-brkBA>=0.06){ weak.push({t:'변화구에 약함', why:`변화구 피안타율 ${wbdContext._slFmt3(brkBA)} vs 직구 ${wbdContext._slFmt3(fbBA)}`, conf: brkAb>=20?'높음':'보통', n:brkAb}); }
  if(coldCourse){ weak.push({t:`${coldCourse[0]} 코스 약점`, why:`${coldCourse[0]} 타율 ${wbdContext._slFmt3(coldCourse[1].ba)}, 헛스윙 ${wbdContext._slPct(coldCourse[1].whiffPct)}`, conf: coldCourse[1].ab>=8?'높음':'보통', n:coldCourse[1].ab}); }
  if(data.firstPitchSwingPct!=null&&data.firstPitchSwingPct<=28){ weak.push({t:'초구 소극적', why:`초구 스윙률 ${wbdContext._slPct(data.firstPitchSwingPct)} → 선제 스트라이크 쉬움`, conf:'보통', n:data.firstPitchN}); }
  if(data.twoStrikeWhiffPct!=null&&data.twoStrikeWhiffPct>=30){ weak.push({t:'2스트라이크 헛스윙 많음', why:`2S 헛스윙률 ${wbdContext._slPct(data.twoStrikeWhiffPct)} → 결정구에 약함`, conf:'보통', n:data.twoStrikeN}); }
  return {data, rep, s, xba, feats, plan, weak:weak.slice(0,3), coldCourse, hotCourse, fbBA, brkBA, gv, ca, dist};
};

// Original index.html:25620
wbdContext._slPitcherPlan = function _slPitcherPlan(name){ return wbdContext._memoByGame('_slPitcherPlan', name, ()=>wbdContext._slPitcherPlan__raw(name)); };

// Original index.html:25621
wbdContext._slPitcherPlan__raw = function _slPitcherPlan__raw(name){
  const data=wbdContext._scoutCollectPitcher(name); if(!data) return null;
  let rep=null; try{ rep=wbdContext._generateScoutReportPitcher(data); }catch(e){}
  const se=wbdContext._getPitcherSeason(name)||{};
  const d=wbdContext.getPitcherDataByName(name);
  const s=wbdContext._h2hSlash(d)||{};
  const gv=data.byGroup||{};
  // 구종 비중
  const tot=d.length||1;
  const mix=Object.entries(gv).map(([g,arr])=>({g, n:(arr&&arr.length)||0, pct:((arr&&arr.length)||0)/tot*100})).filter(x=>x.n>0).sort((a,b)=>b.n-a.n);
  const fbMix=mix.find(x=>x.g==='패스트볼'||x.g==='직구');
  // 초구 스트라이크율
  const fp=d.filter(x=>+x.ball===0&&+x.strk===0);
  const fpStrike=fp.length?fp.filter(x=>+x.call===0||x.bSwing||+x.result<=4).length/fp.length*100:null;
  // 볼넷율
  const bbPct=s.bbPct;
  // 가장 약한(피안타율 높은) 구종 = 노림
  const grpBA=Object.entries(gv).map(([g,arr])=>{ const ss=wbdContext._h2hSlash(arr||[]); return {g, ba:ss?ss.ba:null, ab:ss?ss.AB:0}; }).filter(x=>x.ab>=6).sort((a,b)=>(b.ba||0)-(a.ba||0));
  const targetPitch=grpBA[0];
  const feats=[];
  if(fbMix&&fbMix.pct>=55) feats.push('직구 위주');
  if(bbPct!=null&&bbPct>=10) feats.push('제구 불안(볼넷↑)');
  if(fpStrike!=null&&fpStrike>=62) feats.push('초구 스트라이크 많음');
  if(mix.length<=2) feats.push('구종 단조');
  let plan;
  if(bbPct!=null&&bbPct>=11){ plan='카운트 기다리면 볼넷 · 가운데 실투 대기'; }
  else if(fpStrike!=null&&fpStrike>=62&&fbMix){ plan='초구 '+fbMix.g+' 적극 노림'; }
  else if(targetPitch){ plan=targetPitch.g+' 노림('+wbdContext._slFmt3(targetPitch.ba)+')'; }
  else { plan='바깥 변화구 참고 몸쪽 빠른 공만'; }
  const weak=[];
  if(targetPitch) weak.push({t:targetPitch.g+'가 약점', why:`리그가 이 투수 ${targetPitch.g} 상대 피안타율 ${wbdContext._slFmt3(targetPitch.ba)}`, conf: targetPitch.ab>=15?'높음':'보통', n:targetPitch.ab});
  if(bbPct!=null&&bbPct>=10) weak.push({t:'제구 불안', why:`볼넷률 ${wbdContext._slPct(bbPct)} → 참을성 있게`, conf:'보통', n:s.PA});
  if(mix.length<=2) weak.push({t:'결정구 단조', why:`구종 ${mix.length}종 → 2스트라이크 노림 예측 쉬움`, conf:'보통'});
  return {data, rep, se, s, feats, plan, weak:weak.slice(0,3), mix, fbMix, fpStrike, bbPct, grpBA, targetPitch, gv};
};

// Original index.html:25659
wbdContext._slJumpTeam = function _slJumpTeam(team){ const st=window._scoutLabState; if(st){ st.team=team; st.sel=null; } wbdContext.showPage('scoutlab'); if(st&&!(wbdContext._getActiveTeams()||[]).includes(team)) wbdContext._toast('ℹ️ 팀 공략', `${team}은(는) 현재 활성 경기에 없어 첫 팀이 표시됩니다`, '#f5a623', 4000); };

// Original index.html:25660
wbdContext.renderScoutLabPage = function renderScoutLabPage(){
  const out=document.getElementById('scoutlab-content'); if(!out) return;
  const st=window._scoutLabState;
  const teams=(typeof wbdContext._getActiveTeams==='function'?wbdContext._getActiveTeams():[]);
  if((!st.team || !teams.includes(st.team)) && teams.length){ st.team=teams[0]; st.sel=null; } // 활성 경기 바뀌면 팀 재선택
  let html=`<div class="card section" style="border-left:3px solid #f5a623">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div style="font-size:16px;font-weight:900">🎯 팀 공략 리포트 <span style="font-size:11px;color:var(--muted);font-weight:400">Team Attack Plan</span></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><div style="font-size:10px;color:var(--muted)">상대 팀 전체를 한 번에 — 투수용(타자 공략)·타자용(투수 공략)·수비용(시프트)</div>${wbdContext._rptExportBtns('#scoutlab-content', '팀공략_'+(st.team||'')+'_'+(st.mode||''), {small:true})}</div>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px">
      <span style="font-size:12px;color:var(--muted)">상대 팀</span>
      <select onchange="window._scoutLabState.team=this.value;window._scoutLabState.sel=null;renderScoutLabPage()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:7px 11px;border-radius:6px;font-size:13px;min-width:220px">
        ${teams.map(t=>`<option value="${wbdContext._esc(t)}" ${t===st.team?'selected':''}>${wbdContext._esc(t)}</option>`).join('')}
      </select>
      <span style="font-size:10px;color:var(--muted)">팀 배정은 <b>도구→팀 구성 편집</b>에서 (수동 지정 연동)</span>
    </div>`;
  // 모드 토글
  const modes=[['bat','⚾ 투수용','이 타자들 잡기','#f5a623'],['pit','🏏 타자용','이 투수들 치기','#ff4560'],['def','🛡️ 수비용','외야 시프트','#39ff8a']];
  html+=`<div style="display:flex;background:var(--card2);border:1px solid var(--border);border-radius:8px;overflow:hidden;max-width:560px;margin-top:12px">`+
    modes.map(([m,l,sub,c])=>`<button onclick="window._scoutLabState.mode='${m}';window._scoutLabState.sel=null;renderScoutLabPage()" style="flex:1;background:${st.mode===m?c:'transparent'};color:${st.mode===m?'#000':'var(--muted)'};border:none;padding:9px 6px;font-size:12px;font-weight:700;cursor:pointer;line-height:1.3">${l}<small style="display:block;font-weight:400;font-size:10px;opacity:.85">${sub}</small></button>`).join('')+
    `</div></div>`;

  if(!st.team){ out.innerHTML=html+'<div class="card section" style="color:var(--muted)">팀이 없습니다. 먼저 경기를 로드하고 팀을 배정하세요.</div>'; return; }
  const roster=wbdContext._slTeamRoster(st.team);

  if(st.mode==='bat') html+=wbdContext._slRenderBatMode(roster, st);
  else if(st.mode==='pit') html+=wbdContext._slRenderPitMode(roster, st);
  else html+=wbdContext._slRenderDefMode(roster, st);

  out.innerHTML=html;
};

// Original index.html:25694
wbdContext._slRenderBatMode = function _slRenderBatMode(roster, st){
  const names=roster.bats.filter(n=>wbdContext.getBatterDataByName(n).length>=20);
  if(!names.length) return '<div class="card section" style="color:var(--muted)">이 팀의 타자 데이터가 부족합니다.</div>';
  const plans=names.map(n=>({n, p:wbdContext._slBatterPlan(n)})).filter(x=>x.p);
  plans.sort((a,b)=>(b.p.s.ops||0)-(a.p.s.ops||0));
  // 팀 요약
  let fbH=0,fbA=0,brkH=0,brkA=0,chaseSum=0,chaseN=0;
  plans.forEach(({p})=>{ if(p.fbBA!=null){fbH+=p.fbBA;fbA++;} if(p.brkBA!=null){brkH+=p.brkBA;brkA++;} if(p.data.chasePct!=null){chaseSum+=p.data.chasePct;chaseN++;} });
  const teamFB=fbA?fbH/fbA:null, teamBRK=brkA?brkH/brkA:null, teamChase=chaseN?chaseSum/chaseN:null;
  let h=`<div style="background:linear-gradient(135deg,rgba(245,166,35,.08),var(--card));border-left:4px solid #f5a623;padding:12px 14px;border-radius:6px;margin-bottom:12px">
    <div style="font-size:11px;color:#f5a623;font-weight:700;margin-bottom:5px">팀 요약 — 투수 입장 (${wbdContext._esc(st.team)}, 타자 ${plans.length}명)</div>
    <div style="font-size:12.5px;line-height:1.7">직구 상대 평균 <b style="color:#ff4560">${wbdContext._slFmt3(teamFB)}</b> / 변화구 <b style="color:#39ff8a">${wbdContext._slFmt3(teamBRK)}</b>${teamChase!=null?` · 평균 체이스 <b style="color:#f5a623">${wbdContext._slPct(teamChase)}</b>`:''}. ${teamFB!=null&&teamBRK!=null&&teamFB-teamBRK>0.05?'변화구 비중을 높이는 게 팀 전체에 유효.':'코스·카운트별 공략은 선수별 상세 참고.'} <span style="color:var(--muted)">이름 클릭 → 상세.</span></div></div>`;
  // 한 줄 표
  h+=`<div class="card section"><div class="card-title">📋 선수별 한 줄 공략표 <span style="font-weight:400;font-size:11px;color:var(--muted)">· 클릭 → 상세</span></div>
    <div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>타자</th><th>타/투</th><th>타율</th><th>OPS</th><th>BB%</th><th>체이스</th><th>약점 핵심</th><th>공략법</th></tr></thead><tbody>`;
  plans.forEach(({n,p})=>{
    const low=p.data.PA<60;
    const A=wbdContext._atkEngine(n,'batter'); const w0=A&&A.weaknesses[0];
    h+=`<tr style="cursor:pointer;${low?'opacity:.6':''}" onclick="window._scoutLabState.sel='${wbdContext._esc(n).replace(/'/g,"\\'")}';renderScoutLabPage()">
      <td style="font-weight:700;color:#2196f3">${wbdContext._esc(n)} ▸</td>
      <td class="mono">${p.data.isLefty?'좌':'우'}/${p.data.total}</td>
      <td class="mono" style="color:${p.s.ba>=0.34?'#ff4560':'inherit'}">${wbdContext._slFmt3(p.s.ba)}</td>
      <td class="mono">${p.s.ops?p.s.ops.toFixed(3):'-'}</td>
      <td class="mono">${wbdContext._slPct(p.s.bbPct,0)}</td>
      <td class="mono" style="color:${p.data.chasePct>=35?'#ff4560':p.data.chasePct<=22?'#39ff8a':'inherit'}">${wbdContext._slPct(p.data.chasePct)}</td>
      <td style="font-size:11px">${w0?wbdContext._esc(w0.title):'-'}</td>
      <td style="font-size:11.5px;color:#f5a623">${w0?wbdContext._esc(w0.how):(A?wbdContext._esc(A.summary.split('.')[0]):'-')}</td></tr>`;
  });
  h+=`</tbody></table></div><div style="font-size:10px;color:var(--muted);margin-top:8px">150구 미만은 흐리게(참고값). 안타/타율은 기록실과 동일 정의(_isHit).</div></div>`;
  // 선택 상세
  if(st.sel){ const pp=wbdContext._slBatterPlan(st.sel); if(pp) h+=wbdContext._slBatterDetail(st.sel, pp, st.team); }
  return h;
};

// Original index.html:25729
wbdContext._slBatterDetail = function _slBatterDetail(name, P, team){
  const d=wbdContext.getBatterDataByName(name);
  const data=P.data, rep=P.rep, s=P.s, ca=P.ca, gv=P.gv, dist=P.dist;
  // 헤더
  const diffScore=(s.ba>=0.34?2:0)+(data.chasePct<=24?1:0)+(s.ops>=0.85?1:0);
  const diff=diffScore>=3?['상','#ff4560']:diffScore>=1?['중','#f5a623']:['하','#39ff8a'];
  let h=`<div class="card section" style="border-left:3px solid #2196f3">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div><div style="font-size:11px;color:var(--muted)">개별 상세 · ${wbdContext._esc(team)}</div>
        <div style="font-size:19px;font-weight:900">${wbdContext._esc(name)} <span style="font-size:12px;font-weight:400;color:var(--muted)">${data.isLefty?'좌타':'우타'} · ${data.total}구 ${data.PA}타석</span></div></div>
      <div style="text-align:right"><div style="font-size:10px;color:var(--muted)">공략 난이도</div><div style="font-size:24px;font-weight:900;color:${diff[1]}">${diff[0]}</div></div>
    </div>
    ${rep&&rep.scoutNote?`<div style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);padding:11px 13px;border-radius:6px;font-style:italic;font-size:12.5px;line-height:1.7;margin-top:10px">${rep.scoutNote}</div>`:''}
  </div>`;
  // ① 공략 엔진 카드 (약점 3단검증 + 강점 + 거르는 공)
  h+=wbdContext._atkRenderCards(wbdContext._atkEngine(name,'batter'),'batter');
  // ② 종합 지표 (공용)
  h+=wbdContext._dbMetrics6(name,'batter');
  // ③ 5×5존 + ④ 코스별(공용)
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2">
    <div class="card section"><div class="card-title">존별 피안타율 (5×5)</div>${wbdContext._scoutZone5x5(name,'batter','avg',{interactive:false,cellPx:52,maxW:290})}<div style="font-size:9px;color:var(--muted);text-align:center;margin-top:6px">파란 칸 = 공략 포인트</div></div>
    <div>${wbdContext._dbCourse(name,'batter')}</div>
  </div>`;
  // ⑤ 스프레이(공용) + ⑥ 시프트
  const shift=wbdContext._slOutfieldShift(d, data.isLefty);
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2">
    <div>${wbdContext._dbSpray(name,'batter')}</div>
    <div class="card section"><div class="card-title">외야 시프트 추천</div>${shift.html}</div>
  </div>`;
  // ⑦ 카운트(공용)
  h+=wbdContext._dbCount(name,'batter');
  // ⑧ 상황별 + 상대전적(공용) — 상대전적은 보고있는 팀 제외
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2">
    <div>${wbdContext._dbSituational(name,'batter')}</div>
    <div>${wbdContext._dbH2H(name,'batter',team)}</div>
  </div>`;
  // ⑨ 구종대응(공용)
  h+=wbdContext._dbGroup(name,'batter');
  return h;
};

// Original index.html:25773
wbdContext._slOutfieldShift = function _slOutfieldShift(d, isLefty){
  const of=d.filter(x=>{ if(x.lz==null)return false; const dx=+x.lx||0, dz=-((+x.lz||0)+20); return Math.sqrt(dx*dx+dz*dz)>30 && wbdContext._isInPlay(x); });
  if(of.length<10) return {html:'<div style="font-size:12px;color:var(--muted)">외야 타구 10개 미만 — 기본 위치 유지.</div>'};
  const avgLx=of.reduce((a,x)=>a+(+x.lx||0),0)/of.length; // +면 좌(LF)쪽
  const pull=isLefty? avgLx<0 : avgLx>0; // 당겨치는지
  const mag=Math.min(6,Math.abs(avgLx)/8).toFixed(0);
  const dirWord=avgLx>2?'좌익(LF)쪽':avgLx<-2?'우익(RF)쪽':'중앙';
  const rows=[['좌익수', avgLx>2?`${dirWord}으로 ${mag}m, 뒤로 4m`:avgLx<-2?'중견쪽으로 5m':'거의 그대로'],
    ['중견수', avgLx>2?'레프트쪽 3m':avgLx<-2?'라이트쪽 3m':'거의 그대로'],
    ['우익수', avgLx<-2?`${dirWord}으로 ${mag}m, 뒤로 4m`:avgLx>2?'우익선 앞 5m':'거의 그대로']];
  return {html:`<div class="tbl-wrap"><table class="data-table" style="font-size:12px"><tbody>
    ${rows.map(r=>`<tr><td style="font-weight:700;width:70px">${r[0]}</td><td style="color:#f5a623">${r[1]}</td></tr>`).join('')}
  </tbody></table></div><div style="font-size:9px;color:var(--muted);margin-top:6px">외야 타구 ${of.length}개 · 평균 방향 ${dirWord} ${pull?'(당겨침)':'(밀어침/중앙)'} 기준. 30↑ 신뢰.</div>`};
};

// Original index.html:25789
wbdContext._slRenderPitMode = function _slRenderPitMode(roster, st){
  const names=roster.pits.filter(n=>wbdContext.getPitcherDataByName(n).length>=20);
  if(!names.length) return '<div class="card section" style="color:var(--muted)">이 팀의 투수 데이터가 부족합니다.</div>';
  const plans=names.map(n=>({n, p:wbdContext._slPitcherPlan(n)})).filter(x=>x.p);
  plans.sort((a,b)=>((a.p.se.era||99)-(b.p.se.era||99)));
  let h=`<div style="background:linear-gradient(135deg,rgba(255,69,96,.08),var(--card));border-left:4px solid #ff4560;padding:12px 14px;border-radius:6px;margin-bottom:12px">
    <div style="font-size:11px;color:#ff4560;font-weight:700;margin-bottom:5px">팀 요약 — 타자 입장 (${wbdContext._esc(st.team)}, 투수 ${plans.length}명)</div>
    <div style="font-size:12.5px;line-height:1.7">상대 투수진 공략. 제구 불안·구종 단조·초구 스트라이크 많은 투수를 노려라. <span style="color:var(--muted)">이름 클릭 → 상세.</span></div></div>`;
  h+=`<div class="card section"><div class="card-title">📋 선수별 한 줄 공략표</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>투수</th><th>투/구수</th><th>ERA</th><th>WHIP</th><th>특징</th><th>공략법</th></tr></thead><tbody>`;
  plans.forEach(({n,p})=>{
    const low=p.data.total<150;
    const A=wbdContext._atkEngine(n,'pitcher'); const w0=A&&A.weaknesses[0];
    h+=`<tr style="cursor:pointer;${low?'opacity:.6':''}" onclick="window._scoutLabState.sel='${wbdContext._esc(n).replace(/'/g,"\\'")}';renderScoutLabPage()">
      <td style="font-weight:700;color:#2196f3">${wbdContext._esc(n)} ▸</td>
      <td class="mono">${(p.data.pHand==='L'?'좌':p.data.pHand==='R'?'우':'-')}/${p.data.total}</td>
      <td class="mono">${p.se.era!=null?p.se.era.toFixed(2):'-'}</td>
      <td class="mono">${p.se.whip!=null?p.se.whip.toFixed(2):'-'}</td>
      <td style="font-size:11px">${w0?wbdContext._esc(w0.title):(A?wbdContext._esc(A.summary.split('·')[0]):'-')}</td>
      <td style="font-size:11.5px;color:#39ff8a">${w0?wbdContext._esc(w0.how):'-'}</td></tr>`;
  });
  h+=`</tbody></table></div></div>`;
  if(st.sel){ const pp=wbdContext._slPitcherPlan(st.sel); if(pp) h+=wbdContext._slPitcherDetail(st.sel, pp, st.team); }
  return h;
};

// Original index.html:25814
wbdContext._slPitcherDetail = function _slPitcherDetail(name, P, team){
  const d=wbdContext.getPitcherDataByName(name);
  const data=P.data, rep=P.rep, se=P.se, s=P.s;
  let h=`<div class="card section" style="border-left:3px solid #2196f3">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
      <div><div style="font-size:11px;color:var(--muted)">개별 상세 · ${wbdContext._esc(team)}</div>
        <div style="font-size:19px;font-weight:900">${wbdContext._esc(name)} <span style="font-size:12px;font-weight:400;color:var(--muted)">${data.pHand==='L'?'좌투':'우투'} · ${data.total}구 · ${se.ipDisp||'-'}이닝</span></div></div>
      <div style="text-align:right"><div style="font-size:10px;color:var(--muted)">ERA / WHIP</div><div style="font-size:20px;font-weight:900;color:#f5a623">${se.era!=null?se.era.toFixed(2):'-'}</div><div style="font-size:11px;color:var(--muted)">${se.whip!=null?se.whip.toFixed(2):'-'}</div></div>
    </div>
    ${rep&&rep.scoutNote?`<div style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);padding:11px 13px;border-radius:6px;font-style:italic;font-size:12.5px;line-height:1.7;margin-top:10px">${rep.scoutNote}</div>`:''}
  </div>`;
  // ① 공략 엔진 카드
  h+=wbdContext._atkRenderCards(wbdContext._atkEngine(name,'pitcher'),'pitcher');
  // 노림 존 (이 투수 상대 리그 타율 높은 존) + 구종/구속
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2">
    <div class="card section"><div class="card-title">② 노림 존 — 이 투수 피안타율 (5×5)</div>${wbdContext._scoutZone5x5(name,'pitcher','avg',{interactive:false,cellPx:52,maxW:290})}<div style="font-size:9px;color:var(--muted);text-align:center;margin-top:6px">빨간 칸 = 이 투수가 여기 던지면 잘 맞음 → 노려라</div></div>
    <div class="card section"><div class="card-title">③ 구종·구속 + 노림</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>구종</th><th>비중</th><th>구속</th><th>피안타율</th></tr></thead><tbody>
      ${P.mix.map(m=>{ const arr=P.gv[m.g]||[]; const sp=arr.filter(x=>+x.spdK>0).map(x=>+x.spdK); const lo=sp.length?Math.min(...sp):0, hi=sp.length?Math.max(...sp):0; const ss=wbdContext._h2hSlash(arr); return `<tr><td>${wbdContext._esc(m.g)}</td><td class="mono">${m.pct.toFixed(0)}%</td><td class="mono">${sp.length?lo.toFixed(0)+'~'+hi.toFixed(0):'-'}</td><td class="mono" style="color:${ss&&ss.ba>=0.35?'#39ff8a':''}">${ss?wbdContext._slFmt3(ss.ba):'-'}</td></tr>`; }).join('')}
    </tbody></table></div>
    <div style="font-size:12px;line-height:1.7;margin-top:10px">
      ${P.fpStrike!=null?`<div><b>초구:</b> 스트라이크 ${wbdContext._slPct(P.fpStrike)} ${P.fpStrike>=62?'→ <span style="color:#39ff8a">초구 적극</span>':'→ 기다려도 됨'}</div>`:''}
      ${P.bbPct!=null?`<div><b>제구:</b> 볼넷률 ${wbdContext._slPct(P.bbPct)} ${P.bbPct>=10?'→ <span style="color:#39ff8a">참을성</span>':''}</div>`:''}
      ${P.targetPitch?`<div><b>노림 구종:</b> <span style="color:#39ff8a">${wbdContext._esc(P.targetPitch.g)}</span> (리그 ${wbdContext._slFmt3(P.targetPitch.ba)})</div>`:''}
    </div></div>
  </div>`;
  // ④ 종합 지표 + 코스별 + 카운트 + 상황별 + 상대전적 (공용)
  h+=wbdContext._dbMetrics6(name,'pitcher');
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2"><div>${wbdContext._dbCourse(name,'pitcher')}</div><div>${wbdContext._dbSpray(name,'pitcher')}</div></div>`;
  h+=wbdContext._dbCount(name,'pitcher');
  h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2"><div>${wbdContext._dbSituational(name,'pitcher')}</div><div>${wbdContext._dbH2H(name,'pitcher',team)}</div></div>`;
  return h;
};

// Original index.html:25848
wbdContext._slRenderDefMode = function _slRenderDefMode(roster, st){
  const names=roster.bats.filter(n=>wbdContext.getBatterDataByName(n).length>=20);
  if(!names.length) return '<div class="card section" style="color:var(--muted)">이 팀의 타자 데이터가 부족합니다.</div>';
  let h=`<div style="background:linear-gradient(135deg,rgba(57,255,138,.08),var(--card));border-left:4px solid #39ff8a;padding:12px 14px;border-radius:6px;margin-bottom:12px">
    <div style="font-size:11px;color:#39ff8a;font-weight:700;margin-bottom:5px">수비 시프트 요약 (${wbdContext._esc(st.team)} 타자별)</div>
    <div style="font-size:12.5px;line-height:1.7">타구 방향·낙하 기준 외야수 추천 포지션. 30타구↑만 신뢰, 10 미만 미표시.</div></div>`;
  h+=`<div class="card section"><div class="card-title">🛡️ 선수별 외야 시프트</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>타자</th><th>타구수</th><th>좌익수</th><th>중견수</th><th>우익수</th></tr></thead><tbody>`;
  names.forEach(n=>{
    const d=wbdContext.getBatterDataByName(n); const data=wbdContext._scoutCollectBatter(n); if(!data)return;
    const of=d.filter(x=>{ if(x.lz==null)return false; const dx=+x.lx||0, dz=-((+x.lz||0)+20); return Math.sqrt(dx*dx+dz*dz)>30 && wbdContext._isInPlay(x); });
    const sh=wbdContext._slOutfieldShift(d, data.isLefty);
    const m=sh.html.match(/<td style="color:#f5a623">([^<]*)<\/td>/g)||[];
    const cells=m.map(x=>x.replace(/<[^>]+>/g,''));
    h+=`<tr style="cursor:pointer" onclick="window._scoutLabState.mode='bat';window._scoutLabState.sel='${wbdContext._esc(n).replace(/'/g,"\\'")}';renderScoutLabPage()"><td style="font-weight:700;color:#2196f3">${wbdContext._esc(n)} ▸</td><td class="mono">${of.length}</td><td style="font-size:11px">${cells[0]||'-'}</td><td style="font-size:11px">${cells[1]||'-'}</td><td style="font-size:11px">${cells[2]||'-'}</td></tr>`;
  });
  h+=`</tbody></table></div><div style="font-size:10px;color:var(--muted);margin-top:8px">이름 클릭 → 투수용 상세(스프레이·낙하 그림 포함).</div></div>`;
  return h;
};
}

export function initialize(wbdContext) {
// Original index.html:25528
window._scoutLabState = window._scoutLabState || {team:null, mode:'bat', sel:null};
}
