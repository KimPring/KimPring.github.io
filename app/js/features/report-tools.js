/** report-tools: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:25182
wbdContext._srReliabBadge = function _srReliabBadge(mode,key){ const r=(wbdContext._SR_RELIAB[mode]||{})[key]; if(r==null) return ''; const lv=r>=.6?['안정','#39ff8a']:r>=.4?['보통','#88ccff']:['변동 큼','#f5a623']; return `<span title="반복성 r=${r} (반 시즌이 나머지 반을 예측하는 정도)" style="font-size:9px;padding:1px 6px;border-radius:8px;background:${lv[1]}22;color:${lv[1]};margin-left:4px">${lv[0]} r${r}</span>`; };

// Original index.html:25183
wbdContext._srToolsCard = function _srToolsCard(D, mode){
  const isBat=mode==='batter';
  const rows=D.T.map(t=>`<div style="display:grid;grid-template-columns:118px 46px 1fr 1.6fr;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--border)">
    <div style="font-size:12px;font-weight:600">${t.label}${wbdContext._srReliabBadge(mode,t.key)}</div>
    <div style="font-size:18px;font-weight:900;color:${wbdContext._srGradeCol(t.grade)};text-align:center">${t.grade==null?'-':t.grade}</div>
    <div><div style="background:#1a2030;height:8px;border-radius:4px;overflow:hidden"><div style="width:${t.grade==null?0:Math.max(6,(t.grade-20)/60*100)}%;height:100%;background:${wbdContext._srGradeCol(t.grade)}"></div></div><div style="font-size:9px;color:var(--muted);margin-top:2px">${wbdContext._srGradeWord(t.grade)}${t.pct!=null?` · 리그 ${t.pct>=50?'상위 '+(100-Math.round(t.pct)):'하위 '+Math.round(t.pct)}%`:''}</div></div>
    <div style="font-size:11px;color:var(--muted);line-height:1.45">${wbdContext._esc(t.note)}</div></div>`).join('');
  return `<div class="card section" style="border-left:3px solid #ff8c44"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
    <div class="card-title" style="color:#ff8c44;font-size:14px;margin:0">📊 ${isBat?'타자 툴 등급':'투수 툴 등급'} <span style="font-size:10px;color:var(--muted);font-weight:400">20-80 · 리그 백분위 · 표본 수축 적용 · 배지=반복성(검증값)</span></div>
    ${D.ofp!=null?`<div style="text-align:right"><div style="font-size:9px;color:var(--muted)">OFP (종합)</div><div style="font-size:24px;font-weight:900;color:${wbdContext._srGradeCol(D.ofp)}">${D.ofp}</div></div>`:''}</div>${rows}</div>`;
};

// Original index.html:25194
wbdContext._srNarrCard = function _srNarrCard(title, lines, col){ if(!lines||!lines.length)return ''; return `<div class="card section" style="border-left:3px solid ${col||'#88ccff'}"><div class="card-title" style="font-size:13px">${title}</div><div style="font-size:12.5px;line-height:1.8">${lines.map(l=>`<div>· ${wbdContext._esc(l)}</div>`).join('')}</div></div>`; };

// Original index.html:25195
wbdContext._srSitTable = function _srSitTable(sit, mode){
  const lbl=mode==='batter'?'타율':'피안타율';
  return `<div class="card section"><div class="card-title" style="font-size:13px">📐 상황별 성적</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>상황</th><th>타수</th><th>${lbl}</th><th>장타율</th><th>헛%</th><th>EV</th></tr></thead><tbody>
    ${sit.map(r=>`<tr><td>${r.l}</td><td class="mono">${r.ab||0}</td><td class="mono">${wbdContext._srF3(r.ba)}</td><td class="mono">${r.slg!=null?r.slg.toFixed(3):'-'}</td><td class="mono">${wbdContext._srPct(r.wh)}</td><td class="mono">${r.ev?r.ev.toFixed(0):'-'}</td></tr>`).join('')}
  </tbody></table></div></div>`;
};

// Original index.html:25201
wbdContext._srRiskCard = function _srRiskCard(risk){
  const col={high:'#ff4560',mid:'#f5a623',low:'#39ff8a'}; const word={high:'높음',mid:'주의',low:'낮음'};
  return `<div class="card section" style="border-left:3px solid #ff4560"><div class="card-title" style="font-size:13px">⚠️ 리스크 · 기복</div>${risk.map(r=>`<div style="display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.6;margin-bottom:5px"><span style="font-size:10px;font-weight:700;color:${col[r.lvl]};min-width:34px;padding-top:2px">${word[r.lvl]}</span><span>${wbdContext._esc(r.t)}</span></div>`).join('')}</div>`;
};

// Original index.html:25205
wbdContext._srRepertoireCard = function _srRepertoireCard(D){
  const rows=D.rep.map(r=>`<tr><td style="font-weight:600">${wbdContext._esc(r.g)}</td><td class="mono">${r.pct.toFixed(0)}%</td><td class="mono">${r.velo?r.velo.toFixed(0)+'/'+(r.veloMax?r.veloMax.toFixed(0):'-'):'-'}</td><td class="mono">${r.sH!=null?r.sH.toFixed(0)+'/'+r.sV.toFixed(0):'-'}</td><td class="mono">${wbdContext._srPct(r.zone)}</td><td class="mono" style="color:${r.whiff>=35?'#39ff8a':''}">${wbdContext._srPct(r.whiff)}</td><td class="mono" style="color:${r.baa!=null&&r.ab>=6?(r.baa>=0.35?'#ff4560':r.baa<=0.22?'#39ff8a':''):''}">${r.ab>=4?wbdContext._srF3(r.baa):'-'}</td><td class="mono">${r.ab>=4&&r.slg!=null?r.slg.toFixed(3):'-'}</td><td class="mono">${wbdContext._srPct(r.fpUse)}</td><td class="mono">${wbdContext._srPct(r.k2Use)}</td></tr>`).join('');
  return `<div class="card section" style="border-left:3px solid #cc44ff"><div class="card-title" style="font-size:13px;color:#cc44ff">🎿 레퍼토리</div><div class="tbl-wrap"><table class="data-table" style="font-size:11.5px"><thead><tr><th>구종</th><th>비중</th><th>구속 평/최</th><th>무브 H/V</th><th>존%</th><th>헛%</th><th>피안타</th><th>피장타</th><th>초구</th><th>2S</th></tr></thead><tbody>${rows}</tbody></table></div><div style="font-size:9px;color:var(--muted);margin-top:5px">초구/2S = 해당 카운트에서 이 구종을 던진 비율. 구속 평균/최고(km).</div></div>`;
};

// Original index.html:25209
wbdContext._srSequenceCard = function _srSequenceCard(D){
  const rows=D.seqRows.filter(r=>r.n>=5).map(r=>`<tr><td>${r.c}</td><td class="mono">${r.n}</td><td>${r.top.map((t,i)=>`<span style="${i===0?'font-weight:700':''};margin-right:8px">${wbdContext._esc(t.g)} <span class="mono" style="color:${i===0&&t.pct>=65?'#f5a623':'var(--muted)'}">${t.pct.toFixed(0)}%</span></span>`).join('')}</td></tr>`).join('');
  return `<div class="card section"><div class="card-title" style="font-size:13px">🔮 시퀀싱 (카운트별 구종 선택)</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>카운트</th><th>구수</th><th>구종 분포 (상위 3)</th></tr></thead><tbody>${rows}</tbody></table></div><div style="font-size:12px;line-height:1.7;margin-top:8px">${D.seqN.map(l=>`<div>· ${wbdContext._esc(l)}</div>`).join('')}</div></div>`;
};

// Original index.html:25213
wbdContext._srStaminaCard = function _srStaminaCard(D){
  const row=r=>`<tr><td>${r.k}</td><td class="mono">${r.n}</td><td class="mono">${r.velo?r.velo.toFixed(1):'-'}</td><td class="mono" style="color:${r.baa!=null&&r.ab>=5&&r.baa>=0.38?'#ff4560':''}">${r.ab>=4?wbdContext._srF3(r.baa):'-'}</td><td class="mono">${wbdContext._srPct(r.whiff)}</td><td class="mono">${wbdContext._srPct(r.bb)}</td></tr>`;
  return `<div class="card section"><div class="card-title" style="font-size:13px">⏱️ 스태미너 (투구수·이닝 구간별)</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" class="sl-grid2">
    <div class="tbl-wrap"><table class="data-table" style="font-size:11.5px"><thead><tr><th>투구수</th><th>구</th><th>직구km</th><th>피안타</th><th>헛%</th><th>BB%</th></tr></thead><tbody>${D.stamPC.filter(r=>r.n>=8).map(row).join('')}</tbody></table></div>
    <div class="tbl-wrap"><table class="data-table" style="font-size:11.5px"><thead><tr><th>이닝</th><th>구</th><th>직구km</th><th>피안타</th><th>헛%</th><th>BB%</th></tr></thead><tbody>${D.stamInn.filter(r=>r.n>=8).map(row).join('')}</tbody></table></div></div>
    <div style="font-size:12px;line-height:1.7;margin-top:8px">${D.stamN.map(l=>`<div>· ${wbdContext._esc(l)}</div>`).join('')}</div></div>`;
};

// Original index.html:25222
wbdContext._srDossierHTML = function _srDossierHTML(name, mode){
  try{
    if(mode==='batter'){ const D=wbdContext._srBatterDossier(name); if(!D) return '';
      let h='';  // 툴 등급은 종합 탭 상단에서 1회만 (중복 제거)
      h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2"><div>${wbdContext._srNarrCard('🧠 어프로치 (Approach)',D.app,'#88ccff')}</div><div>${wbdContext._srNarrCard('💥 타구 프로파일 (Batted Ball)',D.bb,'#39ff8a')}</div></div>`;
      h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2"><div>${wbdContext._srSitTable(D.sit,'batter')}</div><div>${wbdContext._srRiskCard(D.risk)}</div></div>`;
      return h; }
    else { const D=wbdContext._srPitcherDossier(name); if(!D) return '';
      let h='';
      h+=wbdContext._srRepertoireCard(D);
      h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2"><div>${wbdContext._srNarrCard('🎯 커맨드 & 컨트롤',D.cmdN,'#88ccff')}</div><div>${wbdContext._srSequenceCard(D)}</div></div>`;
      h+=wbdContext._srStaminaCard(D);
      h+=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2"><div>${wbdContext._srSitTable(D.sit,'pitcher')}</div><div>${wbdContext._srRiskCard(D.risk)}</div></div>`;
      return h; }
  }catch(e){ console.error('dossier error:',e); return `<div class="card section" style="color:#ff4560;font-size:12px">상세 리포트 생성 오류: ${wbdContext._esc(e.message)}</div>`; }
};

// Original index.html:25243
wbdContext._prfPct = function _prfPct(v,pool){ return wbdContext._srPctile(v,pool,false); };

// Original index.html:25244
wbdContext._prfLv = function _prfLv(p){ return p==null?null: p>=85?2: p>=68?1: p<=15?-2: p<=32?-1: 0; };

// Original index.html:25245
wbdContext._prfRank = function _prfRank(p,hi){ if(p==null) return ''; const top=hi?100-Math.round(p):Math.round(p); return `리그 ${hi?'상위':'하위'} ${Math.max(1,top)}%`; };

// Original index.html:25246
wbdContext._prfTopPct = function _prfTopPct(p){ return p==null?'':(p>=50?`리그 상위 ${Math.max(1,100-Math.round(p))}%`:`리그 하위 ${Math.max(1,Math.round(p))}%`); };

// Original index.html:25247
wbdContext._prfGood = function _prfGood(p,lowerBetter){ return p==null?'':wbdContext._prfTopPct(lowerBetter?100-p:p); };

// Original index.html:25249
wbdContext._srProfileBatter = function _srProfileBatter(name){ return wbdContext._memoByGame('_srProfileBatter', name, ()=>wbdContext._srProfileBatter__raw(name)); };

// Original index.html:25250
wbdContext._srProfileBatter__raw = function _srProfileBatter__raw(name){
  const D=wbdContext._srBatterDossier(name); if(!D) return null;
  const d=wbdContext.getBatterDataByName(name); const P=wbdContext._srPools().B; const s=D.s||{};
  const F3=wbdContext._srF3, PC=wbdContext._srPct;
  // ── 축 계산 ──
  const sw=d.filter(wbdContext._isSwing); const swPct=d.length?sw.length/d.length*100:null;
  const inz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}), oz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;});
  const far=d.filter(x=>{const zx=+x.zoneX,zy=+x.zoneY;return !isNaN(zx)&&(Math.abs(zx)>1.6||Math.abs(zy)>1.6);}); const farChase=far.length>=10?far.filter(wbdContext._isSwing).length/far.length*100:null;
  const zSwA=inz.filter(wbdContext._isSwing), ozSwA=oz.filter(wbdContext._isSwing);
  const zCon=zSwA.length>=12?zSwA.filter(x=>!wbdContext._isWhiff(x)).length/zSwA.length*100:null, ozCon=ozSwA.length>=10?ozSwA.filter(x=>!wbdContext._isWhiff(x)).length/ozSwA.length*100:null;
  const fi=inz.filter(x=>wbdContext._atkPitchClass(x)==='직구'), bi=inz.filter(x=>wbdContext._atkPitchClass(x)==='변화구');
  const fbBrkGap=(fi.length>=10&&bi.length>=10)?(fi.filter(wbdContext._isSwing).length/fi.length*100-bi.filter(wbdContext._isSwing).length/bi.length*100):null;
  const o2=oz.filter(x=>+x.strk===2); const s2Chase=o2.length>=8?o2.filter(wbdContext._isSwing).length/o2.length*100:null;
  const ks=d.filter(x=>wbdContext._isK(x)&&!wbdContext._isHit(x)); const lookK=ks.length>=5?ks.filter(x=>+x.call===0).length/ks.length*100:null;
  const ahead=d.filter(x=>+x.ball>+x.strk); const aheadSw=ahead.length>=10?ahead.filter(wbdContext._isSwing).length/ahead.length*100:null;
  const ct=wbdContext._atkCountStats(name,'batter'), ps=wbdContext._atkPitchStats(name,'batter'), cs=wbdContext._atkCourseStats(name,'batter'), k2=D.k2||wbdContext._atk2S(name,'batter');
  const cells=Object.entries(cs.cells).map(([k,b])=>({k,...b})).filter(c=>c.ab>=3);
  const hitTot=cells.reduce((a,c)=>a+c.hits,0); const topCells=cells.slice().sort((a,b)=>b.hits-a.hits).slice(0,3); const hotShare=hitTot>=8?topCells.reduce((a,c)=>a+c.hits,0)/hitTot*100:null;
  const q5=cells.filter(c=>c.ab>=5); const bestCells=q5.length>=3?q5.filter(c=>c.ba>=(s.ba||0)+0.03).sort((a,b)=>b.ba-a.ba).slice(0,2):[], worstCells=q5.length>=3?q5.filter(c=>c.ba<=(s.ba||0)-0.03&&!bestCells.includes(c)).sort((a,b)=>a.ba-b.ba).slice(0,2):[];
  const vsL=wbdContext._atkBucket(d.filter(x=>String(x.pHand).toUpperCase()==='L')), vsR=wbdContext._atkBucket(d.filter(x=>String(x.pHand).toUpperCase()==='R'));
  // ── 백분위 ──
  const p={ sw:wbdContext._prfPct(swPct,P.swPct), chase:wbdContext._prfPct(D.chase,P.chase), far:wbdContext._prfPct(farChase,P.farChase), zSw:wbdContext._prfPct(D.zSw,P.zSw), fp:wbdContext._prfPct(D.fpSw,P.fpSw),
    contact:wbdContext._prfPct(D.contact,P.contact), zCon:wbdContext._prfPct(zCon,P.zCon), k:wbdContext._prfPct(s.kPct,P.kPct), bb:wbdContext._prfPct(s.bbPct,P.bbPct), ev:wbdContext._prfPct(D.evAvg,P.ev), hh:wbdContext._prfPct(D.hh,P.hh), brl:wbdContext._prfPct(D.brl,P.brl),
    gb:wbdContext._prfPct(D.gb,P.gbPct), ld:wbdContext._prfPct(D.ld,P.ldPct), pull:wbdContext._prfPct(D.pull,P.pullPct), bat:wbdContext._prfPct(D.batSpd,P.batSpd), gap:wbdContext._prfPct(fbBrkGap,P.fbBrkGap), ba:wbdContext._prfPct(s.ba,P.ba), iso:wbdContext._prfPct((s.slg||0)-(s.ba||0),P.iso) };
  const L={}; for(const k in p) L[k]=wbdContext._prfLv(p[k]);
  // ── 1차 유형 (우선순위) ──
  let arch=null; const why=[];
  if(L.sw===-2 || (L.sw===-1 && L.zSw<=-1)){
    arch={icon:'🧘',name:'관망형 — 스윙 자체가 적다',key:'passive'};
    why.push(`전체 스윙률 ${PC(swPct)}로 ${wbdContext._prfTopPct(p.sw)}, 존 안 공도 ${PC(D.zSw)}만 휘두른다(${wbdContext._prfTopPct(p.zSw)}).`);
    if(L.chase<=-1) why.push(`볼은 거의 안 쫓지만(존 밖 ${PC(D.chase)}) 존 안 공도 자주 흘려보내 초구 스트라이크를 쉽게 내준다.`);
    if(lookK!=null&&lookK>=50) why.push(`삼진의 ${PC(lookK)}가 루킹 — 기다리다 당하는 유형.`);
    if(L.zCon>=1) why.push(`대신 휘두르면 맞히는 능력은 있다(존 안 컨택 ${PC(zCon)}, ${wbdContext._prfTopPct(p.zCon)}).`);
    if(L.hh>=1) why.push(`휘두르면 강하다(하드히트 ${PC(D.hh)}, ${wbdContext._prfTopPct(p.hh)}) — 스윙은 적어도 존 안 실투는 위험.`);
  } else if(L.chase>=1 && L.zSw>=0 && (L.far>=1 || L.chase===2)){
    arch={icon:'🌀',name:'배드볼 히터 — 존 근처면 다 휘두른다',key:'badball'};
    why.push(`존 밖 스윙 ${PC(D.chase)}(체이스 ${wbdContext._prfTopPct(p.chase)}), 크게 빠진 공에도 ${PC(farChase)} 손이 나간다.`);
    if(ozCon!=null) why.push(ozCon>=60?`볼을 맞히는 능력(존 밖 컨택 ${PC(ozCon)})이 있어 유인구로 범타는 나와도 삼진은 잘 안 당하는 타입.`:`볼엔 헛스윙이 많아(존 밖 컨택 ${PC(ozCon)}) 유인구→삼진 패턴이 통한다.`);
    if(s2Chase!=null&&D.chase!=null&&s2Chase>=D.chase+10) why.push(`2S가 되면 체이스가 ${PC(s2Chase)}까지 올라간다 — 몰리면 볼로 끝낼 수 있다.`);
  } else if(L.chase<=-1 && L.sw<=0 && L.sw>=-1){
    arch={icon:'👁️',name:'선구·선택형 — 볼 고르고 자기 공만 친다',key:'selective'};
    why.push(`리그 기준으로 볼을 덜 쫓는 편(존 밖 스윙 ${PC(D.chase)}, 선구안 ${wbdContext._prfGood(p.chase,true)})이면서 존 안에서도 ${PC(D.zSw)}만 휘두른다 — 아무 스트라이크나 치지 않는다.`);
    if(hotShare!=null) why.push(hotShare>=55?`안타의 ${PC(hotShare)}가 ${topCells.map(c=>c.k).join('·')} 3칸에 몰려 있다 — 치기 좋은 코스만 골라 치는 타입(그 코스는 피해야).`:`안타가 존 전역에 고르게 퍼져(상위 3칸 ${PC(hotShare)}) 특정 코스를 기다리기보단 '볼만 안 치는' 쪽.`);
    if(L.bb>=1) why.push(`볼넷율 ${PC(s.bbPct)}(${wbdContext._prfTopPct(p.bb)}) — 볼넷이 드문 이 리그에서 볼넷도 잘 고르는 편.`);
  } else if(L.gap===2 || (L.gap===1 && fbBrkGap>=12)){
    arch={icon:'🔮',name:'직구 노림수형 — 직구를 찍고 들어간다',key:'guessFB'};
    why.push(`존 안 직구엔 ${PC(fi.filter(wbdContext._isSwing).length/fi.length*100)} 휘두르면서 변화구엔 ${PC(bi.filter(wbdContext._isSwing).length/bi.length*100)}만 — 격차 ${fbBrkGap.toFixed(0)}p(${wbdContext._prfTopPct(p.gap)}).`);
    if(ps.fb&&ps.brk&&ps.fb.ba!=null&&ps.brk.ba!=null) why.push(`결과도 직구 ${F3(ps.fb.ba)} vs 변화구 ${F3(ps.brk.ba)}${ps.fb.ba-ps.brk.ba>=0.06?' — 노린 공은 치지만 변화구가 오면 약하다. 변화구 비중↑이 정석.':' — 다만 변화구도 못 치는 편은 아니라 카운트별로 섞어야.'}`);
  } else if(L.gap===-2 || (L.gap===-1 && fbBrkGap<=-12)){
    arch={icon:'🔮',name:'변화구 선호형 — 직구보다 변화구에 손이 나간다',key:'guessBRK'};
    why.push(`존 안 변화구 스윙률이 직구보다 ${Math.abs(fbBrkGap).toFixed(0)}p 높다(${wbdContext._prfTopPct(100-p.gap)}) — 떨어지는 공을 기다리는 드문 타입.`);
    if(ps.fb&&ps.brk&&ps.fb.ba!=null&&ps.brk.ba!=null) why.push(`직구 ${F3(ps.fb.ba)} vs 변화구 ${F3(ps.brk.ba)} — ${ps.brk.ba>ps.fb.ba?'변화구로 승부하면 손해, 직구로 밀어붙여야':'결과는 직구가 더 좋아 노림수와 결과가 어긋나는 중'}.`);
  } else if(L.fp===2 || (L.fp===1 && D.fpSw>=50)){
    arch={icon:'⚡',name:'초구 공격형 — 카운트 싸움 전에 끝낸다',key:'firstPitch',};
    why.push(`초구 스윙 ${PC(D.fpSw)}(${wbdContext._prfTopPct(p.fp)}).`);
    const fpB=ct['초구']; if(fpB&&fpB.ab>=5&&fpB.ba!=null) why.push(fpB.ba>=(s.ba||0)?`초구 타율 ${F3(fpB.ba)}로 전체(${F3(s.ba)})보다 좋다 — 초구 존 안은 금물, 초구를 볼로 빼면 카운트 공짜.`:`초구 타율은 ${F3(fpB.ba)}로 전체(${F3(s.ba)})보다 낮다 — 적극성에 비해 초구 성과는 평범, 초구 유인구가 통한다.`);
  } else if(L.hh>=1 && L.gb<=0 && (L.pull>=1 || L.ev>=1)){
    arch={icon:'💥',name:L.pull>=1?'당겨치는 슬러거':'플라이볼 슬러거',key:'slugger'};
    why.push(`하드히트 ${PC(D.hh)}(${wbdContext._prfTopPct(p.hh)}), 평균 EV ${D.evAvg?D.evAvg.toFixed(0):'-'}(${wbdContext._prfTopPct(p.ev)})${D.pull!=null?`, 당김 ${PC(D.pull)}`:''}. 맞으면 멀리 간다.`);
    if(L.contact<=-1) why.push(`대신 컨택률 ${PC(D.contact)}(${wbdContext._prfTopPct(p.contact)})로 헛스윙이 많다 — 전형적인 파워/컨택 트레이드오프.`);
  } else if(L.contact>=1 && L.hh<=-1){
    arch={icon:'🎯',name:'똑딱이 컨택형 — 맞히지만 약하다',key:'slap'};
    why.push(`컨택률 ${PC(D.contact)}(${wbdContext._prfTopPct(p.contact)})로 배트에 잘 맞히지만 하드히트 ${PC(D.hh)}(${wbdContext._prfTopPct(p.hh)}) — 강한 타구가 드물다.`);
    why.push(`이 리그는 강한 타구가 안타를 만드는 구조라 수비 정면이면 잡힌다. 존 안에서 승부해도 장타 위험이 작다.`);
  } else if(L.k>=1 && L.contact<=-1 && L.hh>=1){
    arch={icon:'🎲',name:'올오어낫싱 — 삼진 아니면 장타',key:'allOrNothing'};
    why.push(`삼진율 ${PC(s.kPct)}(${wbdContext._prfTopPct(p.k)}로 많음)인데 하드히트 ${PC(D.hh)}(${wbdContext._prfTopPct(p.hh)}).`);
    why.push(`헛스윙 유도가 통하는 동시에 실투 한 방이 치명적 — 존 밖 결정구로 끝내고 가운데는 절대 금물.`);
  } else {
    arch={icon:'⚖️',name:'균형형 — 한쪽으로 치우치지 않는다',key:'balanced'};
    why.push(`스윙률 ${PC(swPct)}·존 밖 스윙 ${PC(D.chase)}·컨택 ${PC(D.contact)}·하드히트 ${PC(D.hh)} 모두 리그 중간권 — 뚜렷한 습관이 없어 특정 패턴으로 요리하기 어렵다.`);
  }
  // ── 2차 특성 태그 ──
  const tags=[];
  const T=(cond,label,col)=>{ if(cond) tags.push({label,col:col||'var(--amber)'}); };
  T(L.hh===2,'🔥 강타구 생산','#ff4560'); T(L.hh===1,'중장거리','#ff8c44'); T(L.hh<=-1,'약한 타구','#888');
  T(L.bat>=1,'빠른 배트','#ff8c44'); T(L.bat<=-1,'느린 배트','#888');
  T(D.ld>=30,'라인드라이브형','#39ff8a'); T(D.gb>=50,'땅볼 성향','#88ccff'); T(D.fb>=45,'뜬공 성향','#88ccff');
  T(D.pull!=null&&D.pull>=55,'당겨치기'); T(D.pull!=null&&D.pull<=30,'밀어치기'); T(D.pull!=null&&D.pull>30&&D.pull<55,'스프레이');
  T(L.contact>=1,'정교한 컨택','#39ff8a'); T(L.contact<=-1,'거친 컨택','#f5a623');
  T(L.k>=1,'삼진 많음','#f5a623'); T(L.k<=-1,'삼진 적음','#39ff8a'); T(L.bb>=1,'볼넷 리그 상위','#39ff8a');
  const fa=ct['유리'], be=ct['불리']; const ctDiff=(fa&&be&&fa.ab>=6&&be.ab>=6&&fa.ba!=null&&be.ba!=null)?fa.ba-be.ba:null;
  T(ctDiff!=null&&ctDiff>=0.08,'카운트 의존(유리할 때만)','#f5a623'); T(ctDiff!=null&&ctDiff<=-0.08,'몰려도 안 죽음','#39ff8a');
  T(s2Chase!=null&&D.chase!=null&&s2Chase>=D.chase+12,'2S 체이스 급증','#f5a623'); T(k2&&k2.n>=15&&k2.kPct>=35,'2S 삼진 취약','#f5a623'); T(k2&&k2.n>=15&&k2.kPct<=15,'2S 커트형','#39ff8a');
  const fbBrk=(ps.fb&&ps.brk&&ps.fb.ab>=8&&ps.brk.ab>=8&&ps.fb.ba!=null&&ps.brk.ba!=null)?ps.fb.ba-ps.brk.ba:null;
  T(fbBrk!=null&&fbBrk>=0.08,'직구 강·변화구 약','#88ccff'); T(fbBrk!=null&&fbBrk<=-0.08,'변화구 강·직구 약','#88ccff');
  const vf=(ps.fbFast&&ps.fbSlow&&ps.fbFast.ab>=6&&ps.fbSlow.ab>=6&&ps.fbFast.ba!=null&&ps.fbSlow.ba!=null)?ps.fbFast.ba-ps.fbSlow.ba:null;
  T(vf!=null&&vf<=-0.1,`빠른 직구 약함(${Math.round(ps.fbMed+3)}km+)`,'#88ccff'); T(vf!=null&&vf>=0.1,`느린 직구 약함(${Math.round(ps.fbMed-3)}km-)`,'#88ccff');
  const lr=(vsL.ab>=8&&vsR.ab>=8&&vsL.ba!=null&&vsR.ba!=null)?vsL.ba-vsR.ba:null;
  T(lr!=null&&Math.abs(lr)>=0.1,lr>0?'좌투 강·우투 약':'우투 강·좌투 약','#cc44ff');
  T(D.gStd!=null&&D.gStd>=0.22,'기복 큼','#f5a623'); T(D.gStd!=null&&D.gStd<=0.12,'꾸준함','#39ff8a');
  // ── 서술 문단 ──
  const paras=[];
  paras.push({h:'어프로치',t:why.join(' ')});
  { const t=[];
    t.push(`컨택률 ${PC(D.contact)}(${wbdContext._prfTopPct(p.contact)}) · 존 안 컨택 ${PC(zCon)} · 존 밖 컨택 ${PC(ozCon)}.`);
    t.push(`삼진율 ${PC(s.kPct)}(${wbdContext._prfGood(p.k,true)})${lookK!=null?`, 그중 루킹 ${PC(lookK)}`:''} · 볼넷율 ${PC(s.bbPct)}(${wbdContext._prfTopPct(p.bb)})${L.sw>=1?` — 스윙률 ${PC(swPct)}(${wbdContext._prfTopPct(p.sw)})의 적극적 스윙어`:L.sw<=-1?` — 스윙률 ${PC(swPct)}(${wbdContext._prfTopPct(p.sw)})로 스윙을 아끼는 편`:''}.`);
    if(aheadSw!=null) t.push(`볼 앞선 카운트 스윙 ${PC(aheadSw)} — ${aheadSw>=60?'유리해도 기다리지 않고 공격적':aheadSw<=35?'유리하면 기다려서 볼넷·실투를 노림':'보통'}.`);
    if(k2&&k2.n>=15) t.push(`2스트라이크 삼진율 ${PC(k2.kPct)}${s2Chase!=null?` · 2S 체이스 ${PC(s2Chase)}`:''}${k2.kPct<=15?' — 커트로 버티는 능력 좋음':k2.kPct>=40?' — 몰리면 끝까지 몰아도 됨':''}.`);
    paras.push({h:'컨택·삼진·볼넷',t:t.join(' ')}); }
  { const t=[];
    t.push(`평균 EV ${D.evAvg?D.evAvg.toFixed(0):'-'}(${wbdContext._prfTopPct(p.ev)}) · 하드히트 ${PC(D.hh)} · 배럴 ${PC(D.brl)}${D.batSpd?` · 배트 스피드 ${D.batSpd.toFixed(0)}(${wbdContext._prfTopPct(p.bat)})`:''}.`);
    t.push(`땅볼 ${PC(D.gb)} / 라인 ${PC(D.ld)} / 뜬공 ${PC(D.fb)}${D.pull!=null?` · 당김 ${PC(D.pull)} / 중앙 ${PC(D.cen)} / 반대 ${PC(D.oppo)}`:''} — ${D.ld>=30?'라인드라이브가 많아 BABIP가 높게 유지되는 타입':D.gb>=50?'땅볼이 많아 내야 시프트·수비 정면이 효과적':D.fb>=45?'띄우는 타자라 외야 깊게':'타구 유형 균형'}${D.pull!=null&&D.pull>=55?', 당김 쪽 외야 시프트 고려':D.pull!=null&&D.pull<=30?', 밀어치기 쪽 수비 이동':''}.`);
    paras.push({h:'타구·파워',t:t.join(' ')}); }
  { const t=[];
    if(fbBrk!=null) t.push(`직구 ${F3(ps.fb.ba)} vs 변화구 ${F3(ps.brk.ba)}${Math.abs(fbBrk)>=0.08?(fbBrk>0?' — 변화구로 승부':' — 직구로 밀어붙이기'):' — 구종 편차 작음'}.`);
    if(vf!=null&&Math.abs(vf)>=0.08) t.push(`직구 구속대: 빠른 직구 ${F3(ps.fbFast.ba)} / 느린 직구 ${F3(ps.fbSlow.ba)} — ${vf<0?'빠른 공으로 윽박지르는 게':'느린 공·완급이'} 통한다.`);
    if(bestCells.length||worstCells.length) t.push(`${bestCells.length?`잘 치는 코스 ${bestCells.map(c=>`${c.k} ${F3(c.ba)}`).join(', ')}`:''}${bestCells.length&&worstCells.length?' / ':''}${worstCells.length?`약한 코스 ${worstCells.map(c=>`${c.k} ${F3(c.ba)}`).join(', ')}`:''}.`);
    if(ctDiff!=null) t.push(`볼 앞선 카운트 ${F3(fa.ba)} / 몰린 카운트 ${F3(be.ba)}${ctDiff>=0.08?' — 카운트를 먼저 잡으면 급격히 약해진다':ctDiff<=-0.08?' — 카운트와 무관하게 위협적':''}.`);
    if(lr!=null) t.push(`vs 좌투 ${F3(vsL.ba)} / vs 우투 ${F3(vsR.ba)}${Math.abs(lr)>=0.1?' — 플래툰 편차 큼':''}.`);
    paras.push({h:'상황·구종·코스',t:t.join(' ')}); }
  // ── 한줄 결론 (투수 입장) ──
  let verdict='';
  switch(arch.key){
    case 'passive': verdict='초구·카운트 선점을 공짜로 얻는 타자 — 스트라이크 먼저, 몰린 뒤 유인구.'; break;
    case 'badball': verdict=(ozCon!=null&&ozCon>=60)?'존 안은 금물, 존 밖으로 범타 유도 — 삼진보단 약한 타구를 노려라.':'존 밖 유인구가 정석 — 존 안 넣을 이유가 없다.'; break;
    case 'selective': verdict=(hotShare!=null&&hotShare>=55)?`${topCells.map(c=>c.k).join('·')}만 피하면 된다 — 그 외 코스로 스트라이크 승부.`:'볼로 유인이 안 되니 존 구석 승부 + 카운트 선점.'; break;
    case 'guessFB': verdict='초구부터 변화구 비중↑ — 직구를 기다리는 타이밍을 깨라.'; break;
    case 'guessBRK': verdict='직구로 정면 승부 — 변화구는 결정구로만.'; break;
    case 'firstPitch': verdict=(ct['초구']&&ct['초구'].ba!=null&&ct['초구'].ba>=(s.ba||0))?'초구 존 안 금물 — 초구 볼로 빼면 카운트를 공짜로 얻는다.':'초구 적극성을 역이용 — 초구 유인구로 쉬운 아웃.'; break;
    case 'slugger': verdict='가운데·높은 쪽 실투 한 방이 치명적 — 낮게, 바깥으로, 2S까지 끌고 가서 헛스윙.'; break;
    case 'slap': verdict='장타 위험 작으니 존 안 승부 OK — 수비 정면 유도, 볼넷만 주지 말 것.'; break;
    case 'allOrNothing': verdict='존 밖 결정구로 삼진 — 실투만 없으면 이긴다.'; break;
    default: verdict='특정 패턴보다 카운트·코스 조합 — 약한 코스와 2S 결정구 조합을 상황별로.';
  }
  const conf=s.AB>=80?'높음':s.AB>=40?'보통':`낮음·${s.AB}타수`;
  return {arch, tags, paras, verdict, conf, metrics:{swPct,farChase,zCon,ozCon,fbBrkGap,s2Chase,lookK,aheadSw,hotShare}};
};

// Original index.html:25379
wbdContext._srProfilePitcher = function _srProfilePitcher(name){ return wbdContext._memoByGame('_srProfilePitcher', name, ()=>wbdContext._srProfilePitcher__raw(name)); };

// Original index.html:25380
wbdContext._srProfilePitcher__raw = function _srProfilePitcher__raw(name){
  const D=wbdContext._srPitcherDossier(name); if(!D) return null;
  const d=wbdContext.getPitcherDataByName(name); const P=wbdContext._srPools().P; const s=D.s||{}; const F3=wbdContext._srF3, PC=wbdContext._srPct;
  const loc=d.filter(x=>wbdContext._atkLoc(x)); const ozPct=loc.length?100-loc.filter(x=>wbdContext._atkLoc(x).inZone).length/loc.length*100:null;
  const far=loc.length?loc.filter(x=>Math.abs(+x.zoneX)>1.7||Math.abs(+x.zoneY)>1.7).length/loc.length*100:null;
  const fbPct=d.length?d.filter(x=>wbdContext._atkPitchClass(x)==='직구').length/d.length*100:null;
  const s2=d.filter(x=>+x.strk===2); const twoSBrk=s2.length>=15?s2.filter(x=>wbdContext._atkPitchClass(x)==='변화구').length/s2.length*100:null;
  const xw=wbdContext._xWhiffArr(d); const oz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;}); const chaseInd=oz.length>=20?oz.filter(wbdContext._isSwing).length/oz.length*100:null;
  const vsL=wbdContext._atkBucket(d.filter(x=>String(x.bZone).toUpperCase()==='L')), vsR=wbdContext._atkBucket(d.filter(x=>String(x.bZone).toUpperCase()==='R'));
  const onB=wbdContext._atkBucket(d.filter(x=>+x.b1===1||+x.b2===1||+x.b3===1)), emp=wbdContext._atkBucket(d.filter(x=>!(+x.b1===1||+x.b2===1||+x.b3===1)));
  const p={ velo:wbdContext._prfPct(D.fbVelo,P.fbVelo), xw:wbdContext._prfPct(xw.x,P.xWhiff), zone:wbdContext._prfPct(D.zonePct,P.zonePct), oz:wbdContext._prfPct(ozPct,P.ozPct), mid:wbdContext._prfPct(D.midPct,P.mid), far:wbdContext._prfPct(far,P.far), ent:wbdContext._prfPct(D.ent,P.mixEnt), fb:wbdContext._prfPct(fbPct,P.fbPct), s2b:wbdContext._prfPct(twoSBrk,P.twoSBrk), k:wbdContext._prfPct(s.kPct,P.kPct), bb:wbdContext._prfPct(s.bbPct,P.bbPct), mov:null };
  const L={}; for(const k in p) L[k]=wbdContext._prfLv(p[k]);
  const top=D.rep&&D.rep[0]; const second=D.rep&&D.rep[1];
  let arch; const why=[];
  if(L.velo>=1 && L.xw>=1){ arch={icon:'🔥',name:'파워 피처 — 구위로 윽박지른다',key:'power'};
    why.push(`직구 평균 ${D.fbVelo?D.fbVelo.toFixed(0):'-'}km(${wbdContext._prfTopPct(p.velo)}), 구속·무브 조합 기대 헛스윙 ${PC(xw.x)}(${wbdContext._prfTopPct(p.xw)}).`);
    why.push(L.zone>=1?`존에 과감하게 넣는다(존 투구율 ${PC(D.zonePct)}) — 이 리그 특성상 맞을 위험도 같이 커지는 스타일.`:`존 밖으로 빼며 헛스윙을 유도하는 쪽(존 투구율 ${PC(D.zonePct)}).`); }
  else if(L.oz>=1 && chaseInd!=null){ arch={icon:'🎣',name:'유인형 — 존 밖에서 승부한다',key:'chaser'};
    why.push(`존 투구율 ${PC(D.zonePct)}(${wbdContext._prfTopPct(100-p.oz)}로 낮음) — 볼로 스윙을 끌어내는 투수. 상대 타자 체이스 ${PC(chaseInd)}.`);
    why.push(L.far>=1?`다만 크게 빠지는 공도 ${PC(far)}(${wbdContext._prfTopPct(p.far)})로 많아 선구안 좋은 타자에겐 볼넷·유리 카운트를 내준다.`:`빠지는 공은 적당히 존 근처에 머문다(크게 빠짐 ${PC(far)}) — 의도된 유인.`); }
  else if(L.zone>=1){ arch={icon:'🎯',name:'존 공략형 — 맞혀 잡는다',key:'zoneFiller'};
    why.push(`존 투구율 ${PC(D.zonePct)}(${wbdContext._prfTopPct(p.zone)}), 스트라이크 선점 중심. 볼넷율 ${PC(s.bbPct)}.`);
    why.push(`이 리그는 존 안 공을 잘 때리는 환경(존 투구율↑=피안타↑, r +.46)이라 ${L.mid<=-1?'실투가 적은 편(가운데 '+PC(D.midPct)+')이라 버티지만':'가운데 몰림 '+PC(D.midPct)+'까지 겹치면'} 강타자 상대론 리스크.`); }
  else if(L.ent>=1){ arch={icon:'🎲',name:'다구종 믹스형 — 읽기 어렵게 섞는다',key:'mixer'};
    why.push(`구종 다양성 ${wbdContext._prfTopPct(p.ent)} — ${D.rep.slice(0,4).map(r=>`${r.g} ${r.pct.toFixed(0)}%`).join(' · ')}.`);
    why.push(D.predict!=null?`카운트별 패턴 예측도 ${PC(D.predict)}${D.predict<=50?' — 실제로도 패턴이 잘 안 읽힌다':' — 섞긴 하지만 카운트별로는 뻔한 편'}.`:''); }
  else if(L.fb===2 || (L.fb===1 && fbPct>=60)){ arch={icon:'⚾',name:'직구 위주 — 단순하지만 힘으로',key:'fbHeavy'};
    why.push(`직구 계열 ${PC(fbPct)}(${wbdContext._prfTopPct(p.fb)}). ${top?`${top.g} ${top.pct.toFixed(0)}%`:''}${second?` + ${second.g} ${second.pct.toFixed(0)}%`:''}.`);
    why.push(L.velo>=1?`구속(${D.fbVelo.toFixed(0)}km)이 받쳐줘 성립하는 스타일.`:`구속이 ${wbdContext._prfTopPct(p.velo)}라 직구만으론 버거움 — 타자가 직구를 찍고 들어오면 위험.`); }
  else if(L.velo>=1){ arch={icon:'🚀',name:'강속구형 — 구속으로 승부, 무브·구위는 평범',key:'velo'};
    why.push(`직구 평균 ${D.fbVelo?D.fbVelo.toFixed(0):'-'}km(${wbdContext._prfTopPct(p.velo)})이지만 구속·무브 조합 기대 헛스윙은 ${PC(xw.x)}(${wbdContext._prfTopPct(p.xw)}) — 빠르지만 밋밋한 편.`);
    why.push(L.zone>=1?`존에 넣는 비율도 높아(${PC(D.zonePct)}) 구속에 익숙한 타자에겐 맞을 수 있다.`:`존 밖 비중이 커(존 투구율 ${PC(D.zonePct)}) 구속으로 헛스윙·범타를 유도하는 쪽.`); }
  else if(L.fb<=-1 && fbPct!=null && fbPct<=45){ arch={icon:'🪄',name:'변화구 중심 — 떨어뜨려 잡는다',key:'brkHeavy'};
    why.push(`직구 비중 ${PC(fbPct)}(${wbdContext._prfTopPct(p.fb)}로 낮음)${twoSBrk!=null?`, 2S에선 변화구 ${PC(twoSBrk)}`:''}. 주무기 ${top?top.g:'-'}${top&&top.whiff!=null?`(헛스윙 ${PC(top.whiff)})`:''}.`);
    why.push(`직구를 보여주지 않으면 변화구도 읽히기 쉬움 — 카운트 초반 직구 비중이 열쇠.`); }
  else if(L.ent<=-1 && D.rep&&D.rep.length>=2 && (D.rep[0].pct+D.rep[1].pct)>=75){ arch={icon:'🔁',name:'투피치형 — 두 구종으로 승부한다',key:'twoPitch'};
    why.push(`${D.rep[0].g} ${D.rep[0].pct.toFixed(0)}% + ${D.rep[1].g} ${D.rep[1].pct.toFixed(0)}%로 ${(D.rep[0].pct+D.rep[1].pct).toFixed(0)}% — 구종 다양성 ${wbdContext._prfTopPct(p.ent)}.`);
    why.push(D.predict!=null&&D.predict>=60?`카운트별 패턴 예측도 ${PC(D.predict)}까지 높아 두 번째 타순부턴 읽힌다 — 타자는 둘 중 하나만 노리면 된다.`:`구종은 둘이지만 카운트별 선택은 섞는 편(예측도 ${PC(D.predict)}) — 구속·코스 차이로 버틴다.`); }
  else { arch={icon:'⚖️',name:'밸런스형 — 특정 축에 치우치지 않는다',key:'balanced'};
    why.push(`구속 ${wbdContext._prfTopPct(p.velo)} · 존 투구율 ${PC(D.zonePct)} · 구종 다양성 ${wbdContext._prfTopPct(p.ent)} — 눈에 띄는 한 축보다 조합으로 승부.`); }
  const tags=[]; const T=(c,l,col)=>{ if(c) tags.push({label:l,col:col||'var(--amber)'}); };
  T(L.velo>=1,'구속 상위','#ff4560'); T(L.velo<=-1,'구속 하위','#888'); T(L.xw>=1,'구위 상위','#ff8c44'); T(L.xw<=-1,'구위 하위','#888');
  T(L.mid<=-1,'실투 적음','#39ff8a'); T(L.mid>=1,'실투 많음','#f5a623'); T(L.far>=1,'크게 빠지는 공 많음','#f5a623'); T(L.far<=-1,'크게 안 빠짐','#39ff8a');
  T(D.predict!=null&&D.predict>=65,'패턴 뻔함','#f5a623'); T(D.predict!=null&&D.predict<=45,'패턴 다양','#39ff8a');
  T(twoSBrk!=null&&twoSBrk>=65,'2S 변화구 결정구'); T(twoSBrk!=null&&twoSBrk<=35,'2S 직구 승부');
  T(L.k>=1,'삼진 많음','#39ff8a'); T(L.bb>=1,'볼넷 리그 상위','#f5a623'); T(L.bb<=-1,'볼넷 적음','#39ff8a');
  const lr=(vsL.ab>=8&&vsR.ab>=8&&vsL.ba!=null&&vsR.ba!=null)?vsL.ba-vsR.ba:null; T(lr!=null&&Math.abs(lr)>=0.1,lr>0?'좌타에 약함':'우타에 약함','#cc44ff');
  T(onB.ab>=8&&emp.ab>=8&&onB.ba!=null&&emp.ba!=null&&onB.ba>=emp.ba+0.07,'주자 있으면 흔들림','#f5a623');
  { const pc=D.stamPC||[]; const a=pc[0], b=pc.filter(x=>x.n>=15).slice(-1)[0]; if(a&&b&&a.velo&&b.velo&&b!==a){ T(b.velo<=a.velo-2,'후반 구속 저하','#f5a623'); T(b.velo>=a.velo,'구속 유지','#39ff8a'); } }
  T(D.gStd!=null&&D.gStd>=0.2,'기복 큼','#f5a623'); T(D.gStd!=null&&D.gStd<=0.1,'꾸준함','#39ff8a');
  const paras=[]; paras.push({h:'투구 철학',t:why.filter(Boolean).join(' ')});
  { const t=[]; t.push(`레퍼토리: ${D.rep.slice(0,5).map(r=>`${r.g} ${r.pct.toFixed(0)}%${r.velo?`(${r.velo.toFixed(0)}km)`:''}`).join(' · ')}.`);
    const seqRows=D.seqRows||[]; const f0=seqRows.find(r=>r.c==='초구'), f2=seqRows.find(r=>r.c==='2S'), fb=seqRows.find(r=>r.c==='유리');
    if(f0&&f0.top[0]) t.push(`초구 ${f0.top[0].g} ${PC(f0.top[0].pct)}${fb&&fb.top[0]&&fb.n>=8?`, 몰리면 ${fb.top[0].g} ${PC(fb.top[0].pct)}`:''}${f2&&f2.top[0]&&f2.n>=8?`, 2S 결정구 ${f2.top[0].g} ${PC(f2.top[0].pct)}`:''}.`);
    if(D.predict!=null) t.push(`카운트별 구종 예측도 ${PC(D.predict)} — ${D.predict>=65?'두 번째 타순부터 읽힐 위험':D.predict<=45?'읽기 어려움':'보통'}.`);
    paras.push({h:'레퍼토리·시퀀싱',t:t.join(' ')}); }
  { const t=[]; t.push(`존 투구율 ${PC(D.zonePct)}(${wbdContext._prfTopPct(p.zone)}) · 가운데 몰림 ${PC(D.midPct)}(실투 ${L.mid<=-1?'적은 편':L.mid>=1?'많은 편':'보통'}, ${wbdContext._prfGood(p.mid,true)}) · 크게 빠진 공 ${PC(far)}(${wbdContext._prfGood(p.far,true)}) · 초구 스트라이크 ${PC(D.fStrike)}.`);
    t.push(`기대 헛스윙 ${PC(xw.x)} vs 실제 ${PC(D.whiff)}${xw.x!=null&&D.whiff!=null?(D.whiff>=xw.x+5?' — 구위 이상으로 헛스윙을 끌어낸다(디셉션·코스)':D.whiff<=xw.x-5?' — 구위에 비해 헛스윙이 적다(코스·타자 수준)':' — 구위대로 나온다'):''}.`);
    paras.push({h:'제구·구위',t:t.join(' ')}); }
  { const t=[]; if(lr!=null) t.push(`vs 좌타 ${F3(vsL.ba)} / vs 우타 ${F3(vsR.ba)}${Math.abs(lr)>=0.1?' — 플래툰 편차 큼':''}.`);
    if(onB.ab>=8&&emp.ab>=8&&onB.ba!=null&&emp.ba!=null) t.push(`주자 없을 때 ${F3(emp.ba)} / 있을 때 ${F3(onB.ba)}${onB.ba>=emp.ba+0.07?' — 주자 나가면 흔들린다':onB.ba<=emp.ba-0.05?' — 주자 있을 때 오히려 집중':''}.`);
    if(D.stamN&&D.stamN.length) t.push(D.stamN.slice(0,2).join(' '));
    paras.push({h:'상황·스태미너',t:t.join(' ')}); }
  let verdict='';
  switch(arch.key){
    case 'power': verdict=L.zone>=1?'존 안 직구를 노리고 들어가면 승산 — 빠른 공에 강한 타자 우선.':'존 밖 유인구를 참아내는 선구가 핵심 — 몰리기 전에 존 안 공만.'; break;
    case 'chaser': verdict='볼은 버리고 카운트를 먼저 잡아라 — 유리 카운트에선 존 안 공만 때린다.'; break;
    case 'zoneFiller': verdict='초구부터 적극 — 존에 들어오는 비율이 높으니 기다릴 이유가 없다.'; break;
    case 'mixer': verdict='구종을 찍지 말고 코스로 — 몰린 공만 공략, 실투를 기다린다.'; break;
    case 'fbHeavy': verdict='직구 타이밍에 맞추고 변화구는 커트 — 직구에 강한 타자 라인업.'; break;
    case 'brkHeavy': verdict='초반 카운트 직구를 노리고, 2S에선 떨어지는 공 참기.'; break;
    case 'velo': verdict='구속에 타이밍만 맞추면 된다 — 변화구 비중이 낮으니 직구 찍고 들어가기.'; break;
    case 'twoPitch': verdict='둘 중 잘 치는 구종 하나를 찍고 들어가라 — 나머지는 커트.';
    default: verdict='한 축으로 요리 불가 — 카운트별 구종 패턴과 잘 맞는 조합(코스×구종)을 노린다.';
  }
  const conf=s.AB>=100?'높음':s.AB>=50?'보통':`낮음·${s.AB}타수`;
  return {arch, tags, paras, verdict, conf, metrics:{ozPct,far,fbPct,twoSBrk,xWhiff:xw.x,chaseInd}};
};

// Original index.html:25460
wbdContext._srProfileCard = function _srProfileCard(name, mode){
  const isBat=mode==='batter'; const R=isBat?wbdContext._srProfileBatter(name):wbdContext._srProfilePitcher(name); if(!R) return '';
  const low=String(R.conf).startsWith('낮음');
  return `<div class="card section" style="border-left:3px solid #ffd700;background:linear-gradient(135deg,rgba(255,215,0,0.05),var(--card))">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px"><div class="card-title" style="color:#ffd700;font-size:14px;margin:0">🧬 선수 유형 프로파일 <span style="font-size:10px;color:var(--muted);font-weight:400">스윙 결정 · 컨택 · 타구 · 상황 축을 리그 백분위로 조합</span></div><span style="font-size:10px;padding:2px 8px;border-radius:9px;background:${low?'#f5a62322':'#39ff8a22'};color:${low?'#f5a623':'#39ff8a'}">표본 ${wbdContext._esc(R.conf)}</span></div>
    <div style="font-size:17px;font-weight:800;color:var(--text);margin:8px 0 6px">${R.arch.icon} ${wbdContext._esc(R.arch.name)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${R.tags.map(t=>`<span style="background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:3px 10px;font-size:11px;color:${t.col}">${wbdContext._esc(t.label)}</span>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px" class="sl-grid2">${R.paras.filter(pp=>pp.t).map(pp=>`<div style="font-size:12.5px;line-height:1.7"><b style="color:#ffd700;font-size:11px">${wbdContext._esc(pp.h)}</b><br>${wbdContext._esc(pp.t)}</div>`).join('')}</div>
    <div style="margin-top:10px;padding:8px 11px;background:rgba(255,215,0,.08);border-radius:6px;font-size:12.5px"><b style="color:#ffd700">${isBat?'투수 입장 결론':'타자 입장 결론'}</b> → ${wbdContext._esc(R.verdict)}</div>
  </div>`;
};

// Original index.html:25477
wbdContext._rptLoadH2C = function _rptLoadH2C(){
  if(window.html2canvas) return Promise.resolve(window.html2canvas);
  if(window._h2cLoading) return window._h2cLoading;
  window._h2cLoading=new Promise((res,rej)=>{ const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.onload=()=>res(window.html2canvas); sc.onerror=()=>{window._h2cLoading=null; rej(new Error('html2canvas 로드 실패 (네트워크)'));}; document.head.appendChild(sc); });
  return window._h2cLoading;
};

// Original index.html:25483
wbdContext._rptCapture = async function _rptCapture(sel){
  const el=typeof sel==='string'?document.querySelector(sel):sel; if(!el) throw new Error('캡처 대상 없음');
  const h2c=await wbdContext._rptLoadH2C();
  const bg=getComputedStyle(document.body).backgroundColor||'#0b0f17';
  const scale=Math.max(1, Math.min(2, 16000/Math.max(el.scrollHeight,1)));
  return h2c(el,{backgroundColor:bg, scale, useCORS:true, logging:false, windowWidth:document.documentElement.clientWidth,
    onclone:doc=>{ doc.querySelectorAll('button,select,.no-export,#_app_toast').forEach(n=>n.remove()); const root=doc.querySelector(sel); if(root){ root.style.padding='16px'; const stamp=doc.createElement('div'); stamp.style.cssText='font-size:10px;color:#6b7a90;text-align:right;margin-top:10px'; stamp.textContent='WBD Analyzer · '+new Date().toLocaleDateString('ko-KR'); root.appendChild(stamp);} }});
};

// Original index.html:25491
wbdContext._rptExportImage = async function _rptExportImage(sel, name, mode){
  const btnLabel=mode==='copy'?'복사':'저장';
  try{
    wbdContext._toast('🖼️ 이미지 생성 중…', '잠시만요 (처음 한 번은 라이브러리 로드)', '#88ccff', 4000);
    const canvas=await wbdContext._rptCapture(sel);
    const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));
    if(!blob) throw new Error('PNG 변환 실패');
    const fname=`WBD_${String(name||'report').replace(/[\\/:*?"<>|\s]+/g,'_')}_${new Date().toISOString().slice(0,10)}.png`;
    if(mode==='copy'){
      if(!navigator.clipboard||!window.ClipboardItem) throw new Error('이 브라우저는 이미지 클립보드 복사를 지원하지 않음 → 저장을 이용하세요');
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      wbdContext._toast('📋 클립보드에 복사됨', '디스코드 등에 Ctrl+V로 붙여넣기', '#39ff8a', 3500);
    } else {
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=fname; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();},2000);
      wbdContext._toast('💾 이미지 저장됨', fname, '#39ff8a', 3500);
    }
  }catch(e){ console.warn('[리포트 이미지]', e); wbdContext._toast('❌ 이미지 '+btnLabel+' 실패', (e&&e.message)||String(e), '#ff4560', 6000); }
};

// Original index.html:25510
wbdContext._rptExportBtns = function _rptExportBtns(sel, name, opts){
  opts=opts||{}; const sz=opts.small?'6px 10px':'8px 12px', fs=opts.small?'11px':'12px';
  const st=`background:var(--card2);border:1px solid var(--border);color:var(--text);padding:${sz};border-radius:5px;font-size:${fs};cursor:pointer`;
  const q=JSON.stringify(sel).replace(/'/g,'&#39;'), n=JSON.stringify(String(name||'')).replace(/'/g,'&#39;').replace(/</g,'&lt;');
  return `<span class="no-export" style="display:inline-flex;gap:6px;flex-wrap:wrap">`+
    `<button onclick='_rptExportImage(${q},${n},"save")' style="${st}" title="리포트를 PNG로 저장">🖼️ 이미지</button>`+
    `<button onclick='_rptExportImage(${q},${n},"copy")' style="${st}" title="PNG를 클립보드에 복사 (디스코드 붙여넣기)">📋 복사</button>`+
    (opts.print?`<button onclick="window.print()" style="${st}">🖨️ 인쇄</button>`:'')+`</span>`;
};
}

export function initialize(wbdContext) {
// Original index.html:25181
wbdContext._SR_RELIAB = {batter:{hit:.62,power:.68,contact:.50,eye:.60,kav:.57,swing:.78}, pitcher:{velo:.91,mov:.84,stuff:.74,cmd:.31,ctrl:.52,hitSup:.69}};
}
