/** run-value-xout: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:31947
wbdContext._rvKey = function _rvKey(){ const gen=window._cache?window._cache.generation:-1; return gen+'::'+[...wbdContext.activeGameIds].sort().join(','); };

// Original index.html:31948
wbdContext.getRunValueData = function getRunValueData(){
  const key=wbdContext._rvKey();
  if(wbdContext._rvCache.key===key && wbdContext._rvCache.data) return wbdContext._rvCache.data;
  const RE_sum={},RE_cnt={};
  const games=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id));
  // ── 1차: RE24 매트릭스 학습 ──
  const halvesByGame=[];
  for(const g of games){
    const ps=g.pitches; if(!ps||!ps.length)continue;
    let finalA=0,finalB=0; for(const p of ps){ if(+p.scoreA>finalA)finalA=+p.scoreA; if(+p.scoreB>finalB)finalB=+p.scoreB; }
    const {order,hp}=wbdContext._gameHalves(ps);
    halvesByGame.push({g,order,hp,finalA,finalB});
    order.forEach((hk,idx)=>{
      const arr=hp[hk]; const half=+arr[0].half;
      let endBat=null;
      for(let j=idx+1;j<order.length;j++){ if(+hp[order[j]][0].half===half){ endBat=wbdContext._bScore(hp[order[j]][0]); break; } }
      if(endBat==null) endBat = half===1?finalA:finalB;
      let prevB='\u0000';
      for(const p of arr){
        if(prevB===p.bName) continue; prevB=p.bName;
        const [b1,b2,b3,out]=wbdContext._baseOutState(p); if(out>=3)continue;
        const rr=Math.max(0,endBat-wbdContext._bScore(p)); const k=wbdContext._stateKey(b1,b2,b3,out);
        RE_sum[k]=(RE_sum[k]||0)+rr; RE_cnt[k]=(RE_cnt[k]||0)+1;
      }
    });
  }
  const RE={},REn={};
  for(const k in RE_cnt){ RE[k]=RE_sum[k]/RE_cnt[k]; REn[k]=RE_cnt[k]; }
  const REget=(b1,b2,b3,out)=> out>=3?0:(RE[wbdContext._stateKey(b1,b2,b3,out)]||0);
  // ── 2차: Run Value 집계 ──
  const bat={},pit={},cnt={}; // cnt: 카운트별 (투구 단위 접근 대신 PA RV를 시작카운트에 귀속)
  const addB=(n,rv)=>{ if(!n)return; (bat[n]=bat[n]||{rv:0,pa:0,pos:0,neg:0})&&(bat[n].rv+=rv,bat[n].pa++, rv>0?bat[n].pos+=rv:bat[n].neg+=rv); };
  const addP=(n,rv)=>{ if(!n)return; (pit[n]=pit[n]||{rv:0,bf:0})&&(pit[n].rv+= -rv, pit[n].bf++); };
  for(const {order,hp,finalA,finalB} of halvesByGame){
    order.forEach((hk,idx)=>{
      const arr=hp[hk]; const half=+arr[0].half;
      let endBat=null;
      for(let j=idx+1;j<order.length;j++){ if(+hp[order[j]][0].half===half){ endBat=wbdContext._bScore(hp[order[j]][0]); break; } }
      if(endBat==null) endBat=half===1?finalA:finalB;
      // PA 분할
      const pas=[]; let cur=null,prevB='\u0000';
      for(const p of arr){ const bn=p.bName; if(cur==null||prevB!==bn){ cur={b:wbdContext._canonPlayer(bn),p:wbdContext._canonPlayer(p.pName),first:p,pitches:[p]}; pas.push(cur); prevB=bn; } else cur.pitches.push(p); }
      for(let i=0;i<pas.length;i++){
        const pa=pas[i]; const f=pa.first;
        const [b1,b2,b3,out]=wbdContext._baseOutState(f); if(out>=3)continue;
        let s1,runs;
        if(i+1<pas.length){ const nf=pas[i+1].first; s1=wbdContext._baseOutState(nf); runs=Math.max(0,wbdContext._bScore(nf)-wbdContext._bScore(f)); }
        else { s1=[0,0,0,3]; runs=Math.max(0,endBat-wbdContext._bScore(f)); }
        const rv=REget(s1[0],s1[1],s1[2],s1[3])-REget(b1,b2,b3,out)+runs;
        addB(pa.b,rv); addP(pa.p,rv);
        // 카운트별: 시작 카운트(대개 0-0) 대신, 각 투구가 만든 "카운트 전이 가치"는 별도 — 여기선 결과를 2S/3B 등 '마지막 카운트'에 귀속
        const last=pa.pitches[pa.pitches.length-1]; const ck=(+last.ball||0)+'-'+(+last.strk||0);
        (cnt[ck]=cnt[ck]||{rv:0,n:0}).rv+=rv; cnt[ck].n++;
      }
    });
  }
  const data={RE,REn,REget,bat,pit,cnt,
    totalPA:Object.values(bat).reduce((a,v)=>a+v.pa,0),
    games:games.length};
  wbdContext._rvCache={gen:window._cache?window._cache.generation:-1,key,data};
  return data;
};

// Original index.html:32021
wbdContext._buildXOutGrid = function _buildXOutGrid(){
  const gKey=(window._cache?window._cache.generation:-1)+'::'+wbdContext.G.length;
  if(wbdContext._xoutGridCache.gKey===gKey && wbdContext._xoutGridCache.grid) return wbdContext._xoutGridCache;
  const def=wbdContext._computeDefenseData(); const enr=def.enriched||[];
  const g={}; let outs=0,n=0;
  enr.forEach(p=>{
    const ev=+p._ev||0, la=+p._ldeg||0;
    if(ev<=0) return;
    const k=(Math.floor(ev/10)*10)+'|'+(Math.floor((la+30)/10)*10-30);
    const c=g[k]||(g[k]=[0,0]); c[1]++; if(p._isOut)c[0]++;
    n++; if(p._isOut)outs++;
  });
  wbdContext._xoutGridCache={gKey,grid:g,global:n?outs/n:0.5};
  return wbdContext._xoutGridCache;
};

// Original index.html:32037
wbdContext._pitchXOut = function _pitchXOut(d){
  if(!(+d.ev>0) || +d.result===3) return null;    // 비인플레이/파울
  if(+d.result===4) return 0;                       // 홈런 = 절대 아웃 아님
  const gc=wbdContext._buildXOutGrid();
  const ev=+d.ev, la=+d.ldeg||0;
  // 이웃 셀 평균 (EV±10, LA±10 격자 3x3)
  let hits=0,n=0;
  for(let de=-10;de<=10;de+=10) for(let dl=-10;dl<=10;dl+=10){
    const k=(Math.floor((ev+de)/10)*10)+'|'+(Math.floor((la+dl+30)/10)*10-30);
    const c=gc.grid[k]; if(c){ n+=c[1]; hits+=(c[1]-c[0]); }
  }
  if(n<8){ // 폴백: 전역
    const k=(Math.floor(ev/10)*10)+'|'+(Math.floor((la+30)/10)*10-30);
    const c=gc.grid[k];
    if(c&&c[1]>0) return Math.max(0.02,Math.min(0.98,c[0]/c[1]));
    return gc.global;
  }
  return Math.max(0.02,Math.min(0.98,1-hits/n));
};

// Original index.html:32057
wbdContext._xoutBadge = function _xoutBadge(d){
  const xo=wbdContext._pitchXOut(d);
  if(xo==null) return '<span style="color:var(--muted)">-</span>';
  const isOut = wbdContext._isInPlay(d) && !wbdContext._isHit(d);
  const pct=Math.round(xo*100);
  // 잘 맞혔는데 아웃(불운) / 빗맞았는데 안타(행운) 강조
  let tag='', col='var(--text)';
  if(!isOut && xo>=0.7){ tag='🍀'; col='#39ff8a'; }       // 안타인데 원래 잡혔어야(행운 안타)
  else if(isOut && xo<=0.35){ tag='💀'; col='#ff4560'; }   // 아웃인데 잘 친 타구(불운 아웃)
  return `<span style="font-family:var(--mono);color:${col}" title="리그 기대 아웃확률 ${pct}%">${pct}% ${tag}</span>`;
};

// Original index.html:32070
wbdContext.getXOutData = function getXOutData(){
  const gKey=(window._cache?window._cache.generation:-1)+'::'+wbdContext.G.length;
  if(wbdContext._xoutAggCache.gKey===gKey && wbdContext._xoutAggCache.data) return wbdContext._xoutAggCache.data;
  const def=wbdContext._computeDefenseData();
  const enr=def.enriched||[];
  // 타구별 xOut → 타자/투수 집계. HR은 수비 enriched에서 빠질 수 있으니 별도 보강.
  const bat={}, pit={};
  const B=(n)=>bat[n]||(bat[n]={bip:0, hits:0, xHits:0, out:0, xOut:0});
  const P=(n)=>pit[n]||(pit[n]={bip:0, hits:0, xHits:0});
  enr.forEach(p=>{
    const bn=wbdContext._canonPlayer(p.bName), pn=wbdContext._canonPlayer(p.pName);
    const xo=Math.max(0,Math.min(1,+p._xOut||0));
    const isOut=!!p._isOut;
    if(bn){ const b=B(bn); b.bip++; b.xHits+=(1-xo); b.xOut+=xo; if(!isOut)b.hits++; else b.out++; }
    if(pn){ const q=P(pn); q.bip++; q.xHits+=(1-xo); if(!isOut)q.hits++; }
  });
  // HR 보강: enriched에 없을 수 있는 홈런을 전 타구에서 직접 세서 '무조건 안타(xOut=0)'로 추가하지 않음
  // (대신 enriched가 이미 인플레이 전수를 포함하면 중복됨 → 중복 방지 위해 보강 생략하고
  //  BABIP 성격의 "인플레이 타구" 기준으로 해석. HR 포함 xBA가 필요하면 추후 확장)
  const data={bat,pit,_gKey:wbdContext.G.length};
  wbdContext._xoutAggCache={gKey,data};
  return data;
};

// Original index.html:32094
wbdContext.renderBatterXOutCard = function renderBatterXOutCard(){ wbdContext._renderPlayerXOutCard('b-xout-card', wbdContext.currentBatter, true); };

// Original index.html:32095
wbdContext.renderPitcherXOutCard = function renderPitcherXOutCard(){ wbdContext._renderPlayerXOutCard('p-xout-card', wbdContext.currentPitcher, false); };

// Original index.html:32096
wbdContext._renderPlayerXOutCard = function _renderPlayerXOutCard(containerId, name, isBat){
  const box=document.getElementById(containerId); if(!box)return;
  if(!name){ box.innerHTML=''; return; }
  const D=wbdContext.getXOutData();
  const v=(isBat?D.bat:D.pit)[name];
  if(!v||v.bip<5){ box.innerHTML=`<div class="card section" style="padding:12px;color:var(--muted);font-size:12px">인플레이 타구 표본이 적어 xOut 분석 생략</div>`; return; }
  const f3=x=>(x>=1||x<=-1)?x.toFixed(3):(x<0?'-.':'.')+(Math.abs(x)*1000).toFixed(0).padStart(3,'0');
  const sgn=x=>(x>0?'+':'')+x.toFixed(1);
  const ba=v.hits/v.bip, xba=v.xHits/v.bip, luck=v.hits-v.xHits;
  // 타자: 실제>기대 = 운좋음(+) / 투수: 피안타 실제>기대 = 불운(+는 나쁨)
  let verdict, vcol;
  if(isBat){
    verdict = luck>=3?'운이 따랐음':luck<=-3?'불운 (더 쳤어야)':'운 중립';
    vcol = luck>=3?'#39ff8a':luck<=-3?'#ff4560':'var(--muted)';
  }else{
    verdict = luck<=-3?'운이 따랐음 (덜 맞음)':luck>=3?'불운 (더 맞음)':'운 중립';
    vcol = luck<=-3?'#39ff8a':luck>=3?'#ff4560':'var(--muted)';
  }
  const baLbl=isBat?'인플레이 타율':'피인플레이타율';
  const xbaLbl=isBat?'기대 타율(xBA)':'기대 피안타율';
  const cells=[
    [baLbl,f3(ba),'var(--text)'],
    [xbaLbl,f3(xba),'var(--amber)'],
    ['운(실제−기대)',sgn(luck)+'안타',vcol],
    ['인플레이 타구',v.bip,'var(--text)'],
  ];
  box.innerHTML=`<div class="card section" style="border-left:4px solid ${vcol}">
    <div class="card-title">🎯 기대 성적·운 (xOut) <span style="font-size:11px;color:${vcol};font-weight:700;margin-left:6px">${verdict}</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px">
      ${cells.map(([l,x,c])=>`<div style="background:var(--card2);border-radius:6px;padding:10px 6px;text-align:center"><div style="font-size:10px;color:var(--muted)">${l}</div><div style="font-family:var(--mono);font-size:17px;font-weight:700;color:${c}">${x}</div></div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">타구질 기대치 대비 ${isBat?'실제 안타':'실제 피안타'}가 ${Math.abs(luck).toFixed(1)}개 ${luck>=0?(isBat?'더 많음':'더 많음'):'적음'} · 인플레이(BABIP) 기준, 홈런 제외</div>
  </div>`;
};

// Original index.html:32131
wbdContext.renderXOutPage = function renderXOutPage(){
  const el=document.getElementById('xout-content'); if(!el)return;
  if(!wbdContext.G.length){ el.innerHTML='<div class="card section" style="padding:40px;text-align:center;color:var(--muted)">데이터가 없어요</div>'; return; }
  setTimeout(()=>{ try{ wbdContext._renderXOutInner(el); }catch(e){ console.error('xout',e); el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">xOut 오류: ${e.message}</div>`; } },20);
};

// Original index.html:32136
wbdContext._renderXOutInner = function _renderXOutInner(el){
  const D=wbdContext.getXOutData();
  const minBIP=parseInt((document.getElementById('xo-min')||{}).value)||25;
  const sgn=v=>(v>0?'+':'')+v.toFixed(1);
  const f3=v=>(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  // 타자: 실제 인플레이 타율 vs 기대(xBIP타율)
  let brows=Object.entries(D.bat).map(([n,v])=>{
    const ba=v.bip?v.hits/v.bip:0, xba=v.bip?v.xHits/v.bip:0;
    return {n,team:wbdContext._playerTeam(n,'batter'),bip:v.bip,hits:v.hits,xHits:v.xHits,ba,xba,luck:v.hits-v.xHits};
  }).filter(r=>r.bip>=minBIP);
  let prows=Object.entries(D.pit).map(([n,v])=>{
    const ba=v.bip?v.hits/v.bip:0, xba=v.bip?v.xHits/v.bip:0;
    return {n,team:wbdContext._playerTeam(n,'pitcher'),bip:v.bip,hits:v.hits,xHits:v.xHits,ba,xba,luck:v.hits-v.xHits};
  }).filter(r=>r.bip>=minBIP);

  let html='';
  html+=`<div class="card section" style="background:linear-gradient(135deg,#0a1828,#160a1a);border:1px solid #39ff8a;padding:16px">
    <div style="font-size:11px;color:#39ff8a;letter-spacing:3px;margin-bottom:4px">EXPECTED STATS · xOUT</div>
    <div style="font-size:13px;line-height:1.7">모든 인플레이 타구에 <b>리그 아웃 확률(xOut)</b>을 매겨, 타구질 대비 <b>실제 성적이 운이 좋았나/나빴나</b>를 분리. 수비 분석의 정교한 xOut(방향·발사각·이동거리 반영) 재사용. <span style="color:var(--muted)">인플레이 타구 기준(BABIP 성격) · 홈런 등 비인플레이 제외.</span></div>
  </div>`;
  html+=`<div style="font-size:11px;color:var(--muted);line-height:1.6;margin:-4px 0 10px;padding:8px 10px;background:rgba(245,166,35,.07);border-left:3px solid #f5a623;border-radius:4px">⚠️ <b>해석 주의 (V12.0 검증)</b>: 이 리그에서 인플레이 타율은 홀/짝 경기 분할 상관이 타자 .16·투수 .09, x타율도 .14~.19라 <b>"운"은 지난 결과를 설명할 뿐 다음 경기를 예측하지 못함</b>. "불운했으니 곧 터진다"식 전망엔 쓰지 말고, 타구질(EV·발사각) 자체는 타자 평가 탭의 파워·컨택 툴(반복성 .5~.8)로 볼 것.</div>`;
  html+=`<div class="filter-row" style="margin:4px 0 12px"><span class="filter-label">최소 인플레이 타구</span>
    <select id="xo-min" onchange="renderXOutPage()">${[15,25,40,60].map(v=>`<option value="${v}"${v===minBIP?' selected':''}>${v}+</option>`).join('')}</select></div>`;

  // 타자: 가장 불운/행운
  brows.sort((a,b)=>a.luck-b.luck); // 음수=불운 먼저
  const bUnlucky=brows.slice(0,8), bLucky=brows.slice(-8).reverse();
  html+=`<div class="grid2 section">
    <div class="card"><div class="card-title">🏏 가장 불운한 타자 <span style="font-size:10px;color:var(--muted);font-weight:400">실제&lt;기대</span></div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>타자</th><th>타구</th><th>실타율</th><th>x타율</th><th>운</th></tr></thead><tbody>
      ${bUnlucky.map(r=>`<tr><td style="font-weight:600">${wbdContext._esc(r.n)}</td><td style="font-family:var(--mono)">${r.bip}</td><td style="font-family:var(--mono)">${f3(r.ba)}</td><td style="font-family:var(--mono)">${f3(r.xba)}</td><td style="font-family:var(--mono);color:#ff4560;font-weight:700">${sgn(r.luck)}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="card-title">🍀 가장 운 좋은 타자 <span style="font-size:10px;color:var(--muted);font-weight:400">실제&gt;기대</span></div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>타자</th><th>타구</th><th>실타율</th><th>x타율</th><th>운</th></tr></thead><tbody>
      ${bLucky.map(r=>`<tr><td style="font-weight:600">${wbdContext._esc(r.n)}</td><td style="font-family:var(--mono)">${r.bip}</td><td style="font-family:var(--mono)">${f3(r.ba)}</td><td style="font-family:var(--mono)">${f3(r.xba)}</td><td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${sgn(r.luck)}</td></tr>`).join('')}
      </tbody></table></div></div>
  </div>`;

  // 투수: 피안타 기준 (음수 luck = 기대보다 덜 맞음 = 운 좋음)
  prows.sort((a,b)=>b.luck-a.luck); // 양수(기대보다 더 맞음=불운) 먼저
  const pUnlucky=prows.slice(0,8), pLucky=prows.slice(-8).reverse();
  html+=`<div class="grid2 section">
    <div class="card"><div class="card-title">⚾ 가장 불운한 투수 <span style="font-size:10px;color:var(--muted);font-weight:400">피안타&gt;기대</span></div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>투수</th><th>타구</th><th>실피안타율</th><th>x피안타율</th><th>운</th></tr></thead><tbody>
      ${pUnlucky.map(r=>`<tr><td style="font-weight:600">${wbdContext._esc(r.n)}</td><td style="font-family:var(--mono)">${r.bip}</td><td style="font-family:var(--mono)">${f3(r.ba)}</td><td style="font-family:var(--mono)">${f3(r.xba)}</td><td style="font-family:var(--mono);color:#ff4560;font-weight:700">${sgn(r.luck)}</td></tr>`).join('')}
      </tbody></table></div></div>
    <div class="card"><div class="card-title">🍀 가장 운 좋은 투수 <span style="font-size:10px;color:var(--muted);font-weight:400">피안타&lt;기대</span></div>
      <div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>투수</th><th>타구</th><th>실피안타율</th><th>x피안타율</th><th>운</th></tr></thead><tbody>
      ${pLucky.map(r=>`<tr><td style="font-weight:600">${wbdContext._esc(r.n)}</td><td style="font-family:var(--mono)">${r.bip}</td><td style="font-family:var(--mono)">${f3(r.ba)}</td><td style="font-family:var(--mono)">${f3(r.xba)}</td><td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${sgn(r.luck)}</td></tr>`).join('')}
      </tbody></table></div></div>
  </div>`;
  html+=`<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">※ 인플레이 타구(BABIP) 기준 · 실타율=인플레이 안타율, x타율=타구질 기대안타율 · 운=실제−기대(안타 개수) · 수비 xOut 모델 재사용 · 활성 경기만</div>`;
  el.innerHTML=html;
};

// Original index.html:32192
wbdContext.renderRunValuePage = function renderRunValuePage(){
  const el=document.getElementById('rv-content'); if(!el)return;
  if(!wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).length){ el.innerHTML='<div class="card section" style="padding:40px;text-align:center;color:var(--muted)">데이터가 없어요</div>'; return; }
  setTimeout(()=>{
    try{ wbdContext._renderRunValueInner(el); }
    catch(e){ console.error('RV page error',e); el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">Run Value 오류: ${e.message}</div>`; }
  },20);
};

// Original index.html:32200
wbdContext._renderRunValueInner = function _renderRunValueInner(el){
  const D=wbdContext.getRunValueData();
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const sgn=v=>(v>0?'+':'')+v.toFixed(1);
  const minPA=parseInt((document.getElementById('rv-minpa')||{}).value)||20;
  const minBF=parseInt((document.getElementById('rv-minbf')||{}).value)||40;
  const teamF=(document.getElementById('rv-team')||{}).value||'';

  let html='';
  // ── 설명 배너 ──
  html+=`<div class="card section" style="background:linear-gradient(135deg,#0a1828,#160a1a);border:1px solid var(--amber);padding:16px">
    <div style="font-size:11px;color:var(--amber);letter-spacing:3px;margin-bottom:4px">RUN VALUE · RE24</div>
    <div style="font-size:13px;line-height:1.7;color:var(--text)">모든 플레이를 <b>득점 기대값(RE) 변화 + 실제 득점</b>으로 환산한 지표. 타율·OPS가 못 보는 <b>상황별 득점 기여</b>를 점수로 나타냄. 이 리그 ${D.games}경기 · ${D.totalPA}타석으로 직접 학습. <span style="color:var(--muted)">RV &gt; 0 = 득점 환경을 유리하게 만듦.</span></div>
  </div>`;

  // ── RE24 히트맵 ──
  html+='<div class="card section"><div class="card-title">🔢 RE24 매트릭스 <span style="font-size:10px;color:var(--muted);font-weight:400">— 각 상황에서 이닝 끝까지 기대 득점</span></div>';
  const baseRows=[['---',0,0,0],['1--',1,0,0],['-2-',0,1,0],['--3',0,0,1],['12-',1,1,0],['1-3',1,0,1],['-23',0,1,1],['만루',1,1,1]];
  const vals=[]; baseRows.forEach(([,b1,b2,b3])=>[0,1,2].forEach(o=>{const v=D.REget(b1,b2,b3,o);if(v>0)vals.push(v);}));
  const vmax=Math.max(...vals,0.1);
  const heat=v=>{ if(v<=0)return 'var(--card2)'; const t=Math.min(1,v/vmax); const r=Math.round(20+t*200),g=Math.round(40+t*120),b2=Math.round(90-t*60); return `rgba(${r},${g},${b2},0.85)`; };
  html+='<div style="overflow-x:auto"><table class="data-table" style="text-align:center"><thead><tr><th>주자\\아웃</th><th>0사</th><th>1사</th><th>2사</th></tr></thead><tbody>';
  baseRows.forEach(([lbl,b1,b2,b3])=>{
    html+=`<tr><td style="font-family:var(--mono);font-weight:700">${lbl}</td>`;
    [0,1,2].forEach(o=>{ const v=D.REget(b1,b2,b3,o); const n=D.REn[wbdContext._stateKey(b1,b2,b3,o)]||0;
      html+=`<td style="background:${heat(v)};font-family:var(--mono);font-weight:700;color:#fff" title="${n}회 표본">${v>0?v.toFixed(3):'-'}</td>`; });
    html+='</tr>';
  });
  html+='</tbody></table></div><div style="font-size:10px;color:var(--muted);padding:6px">※ 셀 색이 진할수록 기대 득점이 높음 · 괄호는 표본 수(hover)</div></div>';

  // ── 팀 필터 + 최소 표본 ──
  const teams=[...new Set(Object.keys(D.bat).map(n=>wbdContext._playerTeam(n,'batter')).filter(Boolean))].sort();
  html+=`<div class="filter-row" style="margin:4px 0 12px;flex-wrap:wrap;gap:8px">
    <span class="filter-label">팀</span><select id="rv-team" onchange="renderRunValuePage()"><option value="">전체</option>${teams.map(t=>`<option value="${t}"${t===teamF?' selected':''}>${t}</option>`).join('')}</select>
    <span class="filter-label">최소 타석</span><select id="rv-minpa" onchange="renderRunValuePage()">${[10,20,30,40].map(v=>`<option value="${v}"${v===minPA?' selected':''}>${v}+</option>`).join('')}</select>
    <span class="filter-label">최소 상대타자</span><select id="rv-minbf" onchange="renderRunValuePage()">${[20,40,60,80].map(v=>`<option value="${v}"${v===minBF?' selected':''}>${v}+</option>`).join('')}</select>
  </div>`;

  // ── 타자 RV 랭킹 ──
  let brows=Object.entries(D.bat).map(([n,v])=>({n,...v,team:wbdContext._playerTeam(n,'batter'),per:v.pa?v.rv/v.pa*100:0})).filter(r=>r.pa>=minPA);
  if(teamF) brows=brows.filter(r=>r.team===teamF);
  brows.sort((a,b)=>b.rv-a.rv);
  html+=`<div class="card section"><div class="card-title">🏏 타자 Run Value <span style="font-size:10px;color:var(--muted);font-weight:400">(${brows.length}명 · ${minPA}타석+)</span></div>
    <div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th>${wbdContext._sortTh('타자')}${wbdContext._sortTh('팀')}${wbdContext._sortTh('타석')}${wbdContext._sortTh('RV')}${wbdContext._sortTh('RV/100')}${wbdContext._sortTh('창출')}${wbdContext._sortTh('손실')}</tr></thead><tbody>`;
  brows.forEach((r,i)=>{ const c=r.rv>=8?'#39ff8a':r.rv>=3?'#a8e063':r.rv<=-3?'#ff4560':'var(--text)';
    html+=`<tr><td data-rank>${i+1}</td><td style="font-weight:600">${wbdContext._esc(r.n)}</td><td>${r.team||'-'}</td><td style="font-family:var(--mono)">${r.pa}</td><td style="font-family:var(--mono);font-weight:700;color:${c}">${sgn(r.rv)}</td><td style="font-family:var(--mono)">${sgn(r.per)}</td><td style="font-family:var(--mono);color:#39ff8a">+${r.pos.toFixed(1)}</td><td style="font-family:var(--mono);color:#ff4560">${r.neg.toFixed(1)}</td></tr>`; });
  html+='</tbody></table></div></div>';

  // ── 투수 RV 랭킹 ──
  let prows=Object.entries(D.pit).map(([n,v])=>({n,...v,team:wbdContext._playerTeam(n,'pitcher'),per:v.bf?v.rv/v.bf*100:0})).filter(r=>r.bf>=minBF);
  if(teamF) prows=prows.filter(r=>r.team===teamF);
  prows.sort((a,b)=>b.rv-a.rv);
  html+=`<div class="card section"><div class="card-title">⚾ 투수 Run Value <span style="font-size:10px;color:var(--muted);font-weight:400">(${prows.length}명 · 상대타자 ${minBF}+ · 높을수록 실점 억제)</span></div>
    <div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th>${wbdContext._sortTh('투수')}${wbdContext._sortTh('팀')}${wbdContext._sortTh('상대타자')}${wbdContext._sortTh('RV')}${wbdContext._sortTh('RV/100')}</tr></thead><tbody>`;
  prows.forEach((r,i)=>{ const c=r.rv>=6?'#39ff8a':r.rv>=2?'#a8e063':r.rv<=-3?'#ff4560':'var(--text)';
    html+=`<tr><td data-rank>${i+1}</td><td style="font-weight:600">${wbdContext._esc(r.n)}</td><td>${r.team||'-'}</td><td style="font-family:var(--mono)">${r.bf}</td><td style="font-family:var(--mono);font-weight:700;color:${c}">${sgn(r.rv)}</td><td style="font-family:var(--mono)">${sgn(r.per)}</td></tr>`; });
  html+='</tbody></table></div></div>';

  // ── 카운트별 RV ──
  const corder=['0-0','0-1','0-2','1-0','1-1','1-2','2-0','2-1','2-2','3-0','3-1','3-2'];
  const crows=corder.filter(c=>D.cnt[c]).map(c=>({c,...D.cnt[c],avg:D.cnt[c].n?D.cnt[c].rv/D.cnt[c].n:0}));
  html+=`<div class="card section"><div class="card-title">🎯 종료 카운트별 평균 Run Value <span style="font-size:10px;color:var(--muted);font-weight:400">— 타석이 이 카운트에서 끝났을 때 타자 쪽 평균 가치</span></div>
    <div class="tbl-wrap"><table class="data-table" style="text-align:center"><thead><tr><th>카운트</th><th>타석수</th><th>평균 RV</th><th>합계 RV</th></tr></thead><tbody>`;
  crows.forEach(r=>{ const c=r.avg>=0.05?'#39ff8a':r.avg<=-0.05?'#ff4560':'var(--text)';
    html+=`<tr><td style="font-family:var(--mono);font-weight:700">${r.c}</td><td style="font-family:var(--mono)">${r.n}</td><td style="font-family:var(--mono);font-weight:700;color:${c}">${r.avg>=0?'+':''}${r.avg.toFixed(3)}</td><td style="font-family:var(--mono)">${sgn(r.rv)}</td></tr>`; });
  html+='</tbody></table></div><div style="font-size:10px;color:var(--muted);padding:6px">※ 투수 유리 카운트(2스트라이크)는 음수, 타자 유리 카운트(3볼)는 양수가 정상</div></div>';

  html+=`<div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">※ RV = RE(끝상태)−RE(시작상태)+득점 · 타석 기준 · 투수 RV = −타자 RV · 활성 경기만 반영</div>`;
  el.innerHTML=html;
};

// Original index.html:32272
wbdContext._playerRVRank = function _playerRVRank(D, name, isBat){
  const map=isBat?D.bat:D.pit;
  const minKey=isBat?'pa':'bf';
  const me=map[name]; if(!me) return null;
  const qualified=Object.entries(map).filter(([,v])=>v[minKey]>=(isBat?20:40)).sort((a,b)=>b[1].rv-a[1].rv);
  const idx=qualified.findIndex(([n])=>n===name);
  return {me, rank: idx>=0?idx+1:null, total:qualified.length};
};

// Original index.html:32280
wbdContext.renderBatterRVCard = function renderBatterRVCard(){ wbdContext._renderPlayerRVCard('b-rv-card', wbdContext.currentBatter, true); };

// Original index.html:32281
wbdContext.renderPitcherRVCard = function renderPitcherRVCard(){ wbdContext._renderPlayerRVCard('p-rv-card', wbdContext.currentPitcher, false); };

// Original index.html:32282
wbdContext._renderPlayerRVCard = function _renderPlayerRVCard(containerId, name, isBat){
  const box=document.getElementById(containerId); if(!box)return;
  if(!name){ box.innerHTML=''; return; }
  const D=wbdContext.getRunValueData();
  const info=wbdContext._playerRVRank(D,name,isBat);
  const sgn=v=>(v>0?'+':'')+v.toFixed(1);
  if(!info){ box.innerHTML=`<div class="card section" style="padding:14px;color:var(--muted);font-size:12px">Run Value 데이터 없음</div>`; return; }
  const me=info.me;
  const n = isBat?me.pa:me.bf;
  const per = n? me.rv/n*100 : 0;
  const rvCol=me.rv>=5?'#39ff8a':me.rv>=0?'#a8e063':'#ff4560';
  // 레버리지 가중 클러치: 이 선수 PA 중 '중요 상황' RV (RE 시작값이 높은 상황) 합산
  const lev=wbdContext._playerLeverageRV(D,name,isBat);
  let cells=[
    ['시즌 RV', sgn(me.rv), rvCol],
    ['RV/100'+(isBat?'PA':'BF'), sgn(per), rvCol],
    ['리그 순위', info.rank?`${info.rank}위 / ${info.total}`:'-', 'var(--text)'],
  ];
  if(isBat){ cells.push(['득점 창출','+'+me.pos.toFixed(1),'#39ff8a'],['득점 손실',me.neg.toFixed(1),'#ff4560']); }
  if(lev){ cells.push(['클러치 RV', sgn(lev.clutchRV), lev.clutchRV>=0?'#39ff8a':'#ff4560']); }
  box.innerHTML=`<div class="card section" style="border-left:4px solid #39ff8a">
    <div class="card-title">📊 Run Value (RE24) <span style="font-size:10px;color:var(--muted);font-weight:400">— 상황 득점 기여 · ${isBat?'타석':'상대타자'} ${n}</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px">
      ${cells.map(([l,v,c])=>`<div style="background:var(--card2);border-radius:6px;padding:10px 6px;text-align:center"><div style="font-size:10px;color:var(--muted)">${l}</div><div style="font-family:var(--mono);font-size:17px;font-weight:700;color:${c}">${v}</div></div>`).join('')}
    </div>
    ${lev?`<div style="font-size:11px;color:var(--muted);margin-top:8px">클러치 RV = 레버리지(상황 중요도) 가중 RV 합 · 승부처에서의 기여를 강조</div>`:''}
  </div>`;
};

// Original index.html:32311
wbdContext._playerLeverageRV = function _playerLeverageRV(D,name,isBat){
  // 재계산: PA별 RV와 시작상태 레버리지. getRunValueData는 합계만 주므로 간이 재집계.
  const key=wbdContext._rvKey()+'::lev::'+name+'::'+(isBat?'b':'p');
  if(wbdContext._levCache.key===key) return wbdContext._levCache.val;
  const games=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id));
  const avgRE=0.45; // 리그 평균 RE(무사주자없음 근처) 기준 레버리지 중심
  let clutchRV=0, plays=0;
  for(const g of games){
    const ps=g.pitches; if(!ps||!ps.length)continue;
    let finalA=0,finalB=0; for(const p of ps){ if(+p.scoreA>finalA)finalA=+p.scoreA; if(+p.scoreB>finalB)finalB=+p.scoreB; }
    const {order,hp}=wbdContext._gameHalves(ps);
    order.forEach((hk,idx)=>{
      const arr=hp[hk]; const half=+arr[0].half;
      let endBat=null; for(let j=idx+1;j<order.length;j++){ if(+hp[order[j]][0].half===half){ endBat=wbdContext._bScore(hp[order[j]][0]); break; } }
      if(endBat==null) endBat=half===1?finalA:finalB;
      const pas=[]; let cur=null,prevB='\u0000';
      for(const p of arr){ const bn=p.bName; if(cur==null||prevB!==bn){ cur={b:wbdContext._canonPlayer(bn),p:wbdContext._canonPlayer(p.pName),first:p}; pas.push(cur); prevB=bn; } }
      for(let i=0;i<pas.length;i++){
        const pa=pas[i]; const who=isBat?pa.b:pa.p; if(who!==name)continue;
        const f=pa.first; const [b1,b2,b3,out]=wbdContext._baseOutState(f); if(out>=3)continue;
        let s1,runs;
        if(i+1<pas.length){ const nf=pas[i+1].first; s1=wbdContext._baseOutState(nf); runs=Math.max(0,wbdContext._bScore(nf)-wbdContext._bScore(f)); }
        else { s1=[0,0,0,3]; runs=Math.max(0,endBat-wbdContext._bScore(f)); }
        const startRE=D.REget(b1,b2,b3,out);
        let rv=D.REget(s1[0],s1[1],s1[2],s1[3])-startRE+runs;
        if(!isBat) rv=-rv;
        // 접전(7회+ ±2) 또는 득점권이면 레버리지 ↑
        const diff=Math.abs((+f.scoreA||0)-(+f.scoreB||0));
        const lateClose=(+f.inn>=7&&diff<=2)?1.5:1;
        const risp=(b2||b3)?1.4:1;
        const lev=lateClose*risp*(startRE/avgRE);
        clutchRV+=rv*lev; plays++;
      }
    });
  }
  const val=plays?{clutchRV,plays}:null;
  wbdContext._levCache={key,val};
  return val;
};

// Original index.html:32353
wbdContext.renderClutch = function renderClutch(){
  if(wbdContext.G.length===0)return '<div style="padding:40px;text-align:center;color:var(--muted)">데이터가 없어요</div>';

  // 클러치 상황: 득점권(2루/3루 주자), 7회+ 접전, 2아웃 득점권
  const clutchPitches=wbdContext.G.filter(d=>{
    const scoreDiff=Math.abs((+d.scoreA||0)-(+d.scoreB||0));
    const runnerOn=d.b2>0||d.b3>0;
    const lateClose=(+d.inn>=7)&&scoreDiff<=2;
    return runnerOn||lateClose;
  });

  if(clutchPitches.length===0)return '<div style="padding:40px;text-align:center;color:var(--muted)">클러치 상황이 없어요</div>';

  // 투수 클러치 성적
  const pitcherClutch={};
  clutchPitches.forEach(d=>{
    if(!d.pName)return;
    if(!pitcherClutch[d.pName])pitcherClutch[d.pName]={n:0,batted:0,hits:0,hrs:0,ks:0,bbs:0};
    const c=pitcherClutch[d.pName];
    c.n++;
    if(wbdContext._isInPlay(d)){c.batted++;if(wbdContext._isHit(d))c.hits++;if(d.result===4)c.hrs++;}
    if(wbdContext._isK(d))c.ks++;
    if(d.result===5||d.result===6)c.bbs++;
  });
  // 타자 클러치 성적
  const batterClutch={};
  clutchPitches.forEach(d=>{
    if(!d.bName)return;
    if(!batterClutch[d.bName])batterClutch[d.bName]={n:0,batted:0,hits:0,hrs:0,rbiLike:0};
    const c=batterClutch[d.bName];
    c.n++;
    if(wbdContext._isInPlay(d)){c.batted++;if(wbdContext._isHit(d))c.hits++;if(d.result===4)c.hrs++;if(wbdContext._isHit(d))c.rbiLike+=(d.b2>0?1:0)+(d.b3>0?1:0);}
  });

  const pClutch=Object.entries(pitcherClutch).filter(([_,v])=>v.batted>=8).map(([name,v])=>({
    name,...v,baAgainst:v.hits/v.batted,kPct:v.ks/v.n*100,team:wbdContext._playerTeam(name,'pitcher')
  })).sort((a,b)=>a.baAgainst-b.baAgainst);

  const bClutch=Object.entries(batterClutch).filter(([_,v])=>v.batted>=8).map(([name,v])=>({
    name,...v,ba:v.hits/v.batted,team:wbdContext._playerTeam(name,'batter')
  })).sort((a,b)=>b.ba-a.ba);

  let html=`<div class="card section" style="background:linear-gradient(135deg,#180a1a,#0a1828);border:1px solid var(--amber);padding:18px">
    <div style="text-align:center">
      <div style="font-size:11px;color:var(--amber);letter-spacing:3px;margin-bottom:4px">CLUTCH ANALYSIS</div>
      <div style="font-size:22px;font-weight:700">🎯 위기 상황 성적</div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">득점권(2,3루 주자) 또는 7회+ 2점차 이내 접전 상황 · 총 ${clutchPitches.length}투구</div>
    </div>
  </div>`;

  html+='<div class="grid2 section">';
  // 투수 클러치 Top10
  html+='<div class="card"><div class="card-title">⚾ 위기 관리 베스트 투수 (피안타율 낮은순)</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>이름</th><th>팀</th><th>피안타율</th><th>K</th><th>HR</th></tr></thead><tbody>';
  pClutch.slice(0,10).forEach((p,i)=>{
    html+=`<tr onclick="goToPitcher('${String(p.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-weight:600">${p.name}</td>
      <td style="color:var(--muted);font-size:11px">${p.team}</td>
      <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${p.baAgainst.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono)">${p.ks}</td>
      <td style="font-family:var(--mono);color:${p.hrs>0?'#ff4560':'var(--muted)'}">${p.hrs}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 타자 클러치 Top10
  html+='<div class="card"><div class="card-title">🏏 해결사 타자 (클러치 타율 높은순)</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>이름</th><th>팀</th><th>클러치 AVG</th><th>H</th><th>HR</th></tr></thead><tbody>';
  bClutch.slice(0,10).forEach((b,i)=>{
    html+=`<tr onclick="goToBatter('${String(b.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-weight:600">${b.name}</td>
      <td style="color:var(--muted);font-size:11px">${b.team}</td>
      <td style="font-family:var(--mono);color:#39ff8a;font-weight:700">${b.ba.toFixed(3).replace(/^0/,'')}</td>
      <td style="font-family:var(--mono)">${b.hits}</td>
      <td style="font-family:var(--mono);color:${b.hrs>0?'#ff4560':'var(--muted)'}">${b.hrs}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';
  html+='</div>';

  // 워스트
  const pWorst=pClutch.slice().sort((a,b)=>b.baAgainst-a.baAgainst).slice(0,5);
  const bWorst=bClutch.slice().sort((a,b)=>a.ba-b.ba).slice(0,5);
  html+='<div class="grid2 section">';
  html+='<div class="card"><div class="card-title">📉 위기에서 무너진 투수</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>이름</th><th>피안타율</th><th>샘플</th></tr></thead><tbody>';
  pWorst.forEach(p=>html+=`<tr onclick="goToPitcher('${String(p.name).replace(/'/g,"\\'")}')" style="cursor:pointer"><td>${p.name}</td><td style="font-family:var(--mono);color:#ff4560;font-weight:700">${p.baAgainst.toFixed(3).replace(/^0/,'')}</td><td style="color:var(--muted)">${p.batted}</td></tr>`);
  html+='</tbody></table></div></div>';
  html+='<div class="card"><div class="card-title">🧊 클러치 약한 타자</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>이름</th><th>클러치 AVG</th><th>샘플</th></tr></thead><tbody>';
  bWorst.forEach(b=>html+=`<tr onclick="goToBatter('${String(b.name).replace(/'/g,"\\'")}')" style="cursor:pointer"><td>${b.name}</td><td style="font-family:var(--mono);color:#2196f3;font-weight:700">${b.ba.toFixed(3).replace(/^0/,'')}</td><td style="color:var(--muted)">${b.batted}</td></tr>`);
  html+='</tbody></table></div></div>';
  html+='</div>';

  return html;
};

// Original index.html:32453
wbdContext.renderHallOfFame = function renderHallOfFame(){
  if(wbdContext.G.length===0)return '<div style="padding:40px;text-align:center;color:var(--muted)">데이터가 없어요</div>';

  // 시즌 최고 기록 모음
  // 1. 최고 원본 구력 (pPow, 직구만)
  const FB_TYPES=[0,26,27,28,29,30,31,32,33,34,35,36,37];
  const fastest=[...wbdContext.G].filter(d=>+d.pPow>0&&FB_TYPES.includes(+d.pType)).sort((a,b)=>(+b.pPow)-(+a.pPow)).slice(0,10);
  // 2. 가장 멀리 날아간 홈런 (실제 낙구 위치 lx, lz 기반 · sqrt(lx² + lz²))
  const deepHrs=wbdContext.G.filter(d=>d.result===4 && (+d.lx!==0 || +d.lz!==0))
    .map(d=>({...d,dist:Math.sqrt((+d.lx||0)**2+(+d.lz||0)**2)}))
    .sort((a,b)=>b.dist-a.dist).slice(0,10);
  // 3. 최고 EV 삭제 (130 캡 존재, 변별력 부족)
  // 4. 경기별 최다 탈삼진 (투수별)
  const gameKs={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    g.pitches.forEach(d=>{
      if(!d.pName)return;
      if(wbdContext._isK(d)){
        const key=d.pName+'@'+g.id;
        if(!gameKs[key])gameKs[key]={name:d.pName,gameId:g.id,gameName:g.name,ks:0};
        gameKs[key].ks++;
      }
    });
  });
  const topGameKs=Object.values(gameKs).sort((a,b)=>b.ks-a.ks).slice(0,10);
  // 5. 경기별 최다 안타 (타자별)
  const gameHits={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    g.pitches.forEach(d=>{
      if(!d.bName||!d.ev)return;
      if(wbdContext._isHit(d)){
        const key=d.bName+'@'+g.id;
        if(!gameHits[key])gameHits[key]={name:d.bName,gameId:g.id,gameName:g.name,hits:0,hrs:0};
        gameHits[key].hits++;
        if(d.result===4)gameHits[key].hrs++;
      }
    });
  });
  const topGameHits=Object.values(gameHits).sort((a,b)=>b.hits-a.hits||b.hrs-a.hrs).slice(0,10);

  let html=`<div class="card section" style="background:linear-gradient(135deg,#2a1f0d,#0a1828);border:1px solid #ffd700;padding:18px">
    <div style="text-align:center">
      <div style="font-size:11px;color:#ffd700;letter-spacing:3px;margin-bottom:4px">HALL OF FAME</div>
      <div style="font-size:22px;font-weight:700">🎖 시즌 최고 기록</div>
      <div style="font-size:11px;color:var(--muted);margin-top:6px">활성 경기 내 모든 시간대 누적 기록</div>
    </div>
  </div>`;

  // 최고 원본 구력 Top 10
  html+='<div class="card section"><div class="card-title">💪 최고 원본 구력 (pPow, 직구 기준) Top 10 <span style="font-size:11px;font-weight:normal;color:var(--muted)">(구속 제한 풀면 실제 도달 가능한 최대치 추정)</span></div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>원본 구력</th><th>표시 구속</th><th>투수</th><th>구종</th><th>타자</th><th>결과</th></tr></thead><tbody>';
  fastest.forEach((d,i)=>{
    const rank=i+1;
    const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const pg=wbdContext.pitchGroup(d.pType,d);
    const res=d.result===4?'홈런':wbdContext.RESULT_NAMES[d.result]||wbdContext.CALL_NAMES[d.call]||'—';
    html+=`<tr>
      <td style="text-align:center">${medal}</td>
      <td style="font-family:var(--mono);color:#39ff8a;font-size:18px;font-weight:900">${d.pPow}</td>
      <td style="font-family:var(--mono);color:var(--muted)">${d.spdK}<span style="font-size:10px"> km/h</span></td>
      <td onclick="goToPitcher('${String(d.pName).replace(/'/g,"\\'")}')" style="cursor:pointer;font-weight:600">${d.pName}</td>
      <td style="color:${wbdContext.GROUP_COLORS[pg]||'#888'}">${wbdContext.PITCH_NAMES[d.pType]||'—'}</td>
      <td onclick="goToBatter('${String(d.bName).replace(/'/g,"\\'")}')" style="cursor:pointer;color:var(--muted)">${d.bName||'—'}</td>
      <td style="font-size:11px">${res}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 최장 비거리 홈런 (실제 낙구 위치 기반)
  html+='<div class="card section"><div class="card-title">🚀 최장 비거리 홈런 Top 10 <span style="font-size:11px;font-weight:normal;color:var(--muted)">(실측 낙구 위치 기반 · 단위: 가상 거리)</span></div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>비거리</th><th>낙구 좌표</th><th>타자</th><th>EV</th><th>발사각</th><th>투수</th><th>구종</th></tr></thead><tbody>';
  deepHrs.forEach((d,i)=>{
    const rank=i+1;
    const medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':rank;
    const pg=wbdContext.pitchGroup(d.pType,d);
    html+=`<tr>
      <td style="text-align:center">${medal}</td>
      <td style="font-family:var(--mono);color:#ff4560;font-size:16px;font-weight:900">${d.dist.toFixed(1)}</td>
      <td style="font-family:var(--mono);color:var(--muted);font-size:11px">(${(+d.lx).toFixed(0)}, ${(+d.lz).toFixed(0)})</td>
      <td onclick="goToBatter('${String(d.bName).replace(/'/g,"\\'")}')" style="cursor:pointer;font-weight:600">${d.bName||'—'}</td>
      <td style="font-family:var(--mono)">${d.ev}</td>
      <td style="font-family:var(--mono);color:var(--muted)">${d.ldeg||'-'}°</td>
      <td onclick="goToPitcher('${String(d.pName).replace(/'/g,"\\'")}')" style="cursor:pointer;color:var(--muted)">${d.pName||'—'}</td>
      <td style="color:${wbdContext.GROUP_COLORS[pg]||'#888'};font-size:11px">${wbdContext.PITCH_NAMES[d.pType]||'—'}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 경기별 최다 K
  html+='<div class="card section"><div class="card-title">🔥 단일 경기 최다 탈삼진</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>탈삼진</th><th>투수</th><th>경기</th></tr></thead><tbody>';
  topGameKs.forEach((k,i)=>{
    const info=wbdContext._parseGameName(k.gameName);
    html+=`<tr onclick="goToPitcher('${String(k.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-family:var(--mono);color:#ff8800;font-size:16px;font-weight:900">${k.ks}</td>
      <td style="font-weight:600">${k.name}</td>
      <td style="font-size:11px;color:var(--muted)">${info.teamA} vs ${info.teamB} · ${info.date||'—'}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 경기별 최다 안타
  html+='<div class="card section"><div class="card-title">🏏 단일 경기 최다 안타</div>';
  html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>안타</th><th>HR</th><th>타자</th><th>경기</th></tr></thead><tbody>';
  topGameHits.forEach((h,i)=>{
    const info=wbdContext._parseGameName(h.gameName);
    html+=`<tr onclick="goToBatter('${String(h.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-family:var(--mono);color:#39ff8a;font-size:16px;font-weight:900">${h.hits}</td>
      <td style="font-family:var(--mono);color:${h.hrs>0?'#ff4560':'var(--muted)'}">${h.hrs}</td>
      <td style="font-weight:600">${h.name}</td>
      <td style="font-size:11px;color:var(--muted)">${info.teamA} vs ${info.teamB} · ${info.date||'—'}</td>
    </tr>`;
  });
  html+='</tbody></table></div></div>';

  // 시즌 누적 투수 통계 - ERA, WHIP, IP, 실점
  const pitcherSeason={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const gs=wbdContext._getCachedPitcherStats(g.id);
      if(!gs)return;
          Object.entries(gs).forEach(([pn,s])=>{
      if(!pitcherSeason[pn])pitcherSeason[pn]={name:pn,outs:0,runs:0,hits:0,bbs:0,hrs:0,ks:0,pitches:0,games:0};
      const p=pitcherSeason[pn];
      p.outs+=s.outs;p.runs+=s.runs;p.hits+=s.hits;p.bbs+=s.bbs;p.hrs+=s.hrs;p.ks+=s.ks;p.pitches+=s.pitches;p.games++;
    });
  });
  const pitchersList=Object.values(pitcherSeason).map(p=>{
    const ip=p.outs/3;
    return {...p,ip,era:ip>0?p.runs/ip*9:99,whip:ip>0?(p.hits+p.bbs)/ip:99,ipDisp:Math.floor(ip)+'.'+(p.outs%3)};
  });
  
  // 시즌 ERA 1위 (최소 5이닝)
  const eraTop=pitchersList.filter(p=>p.outs>=15).sort((a,b)=>a.era-b.era).slice(0,10);
  if(eraTop.length>0){
    html+='<div class="card section"><div class="card-title">🛡️ 시즌 최저 ERA Top 10 <span style="font-size:11px;font-weight:normal;color:var(--muted)">(최소 5이닝)</span></div>';
    html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>ERA</th><th>WHIP</th><th>IP</th><th>실점</th><th>K-BB</th><th>투수</th></tr></thead><tbody>';
    eraTop.forEach((p,i)=>{
      html+=`<tr onclick="goToPitcher('${String(p.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td>${i+1}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-size:16px;font-weight:900">${p.era.toFixed(2)}</td>
        <td style="font-family:var(--mono);color:#88cc44">${p.whip.toFixed(2)}</td>
        <td style="font-family:var(--mono)">${p.ipDisp}</td>
        <td style="font-family:var(--mono);color:${p.runs===0?'#ffd700':'#ff8800'};font-weight:${p.runs===0?'700':'400'}">${p.runs}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${p.ks}-${p.bbs}</td>
        <td style="font-weight:600">${p.name}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 시즌 최다 이닝 (이닝이터)
  const ipTop=pitchersList.sort((a,b)=>b.ip-a.ip).slice(0,10);
  if(ipTop.length>0){
    html+='<div class="card section"><div class="card-title">⏱️ 시즌 최다 이닝 (이닝이터)</div>';
    html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>IP</th><th>등판</th><th>K</th><th>ERA</th><th>투수</th></tr></thead><tbody>';
    ipTop.forEach((p,i)=>{
      html+=`<tr onclick="goToPitcher('${String(p.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td>${i+1}</td>
        <td style="font-family:var(--mono);color:#39ff8a;font-size:16px;font-weight:900">${p.ipDisp}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${p.games}경기</td>
        <td style="font-family:var(--mono);color:#ff8800">${p.ks}</td>
        <td style="font-family:var(--mono)">${p.era.toFixed(2)}</td>
        <td style="font-weight:600">${p.name}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }
  
  // 단일 경기 무실점 등판 (최소 2이닝)
  const noRunGames=[];
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const gs=wbdContext._getCachedPitcherStats(g.id);
      if(!gs)return;
          Object.entries(gs).forEach(([pn,s])=>{
      if(s.runs===0 && s.outs>=6){
        noRunGames.push({name:pn,gameId:g.id,gameName:g.name,...s});
      }
    });
  });
  noRunGames.sort((a,b)=>b.outs-a.outs);
  if(noRunGames.length>0){
    html+='<div class="card section"><div class="card-title">🌟 단일 경기 무실점 등판 <span style="font-size:11px;font-weight:normal;color:var(--muted)">(최소 2이닝)</span></div>';
    html+='<div class="tbl-wrap"><table class="data-table"><thead><tr><th>#</th><th>IP</th><th>K</th><th>피안타</th><th>BB</th><th>투수</th><th>경기</th></tr></thead><tbody>';
    noRunGames.slice(0,10).forEach((n,i)=>{
      const info=wbdContext._parseGameName(n.gameName);
      html+=`<tr onclick="goToPitcher('${String(n.name).replace(/'/g,"\\'")}')" style="cursor:pointer">
        <td>${i+1}</td>
        <td style="font-family:var(--mono);color:#ffd700;font-size:15px;font-weight:900">${n.ipDisp}</td>
        <td style="font-family:var(--mono);color:#ff8800">${n.ks}</td>
        <td style="font-family:var(--mono)">${n.hits}</td>
        <td style="font-family:var(--mono);color:var(--muted)">${n.bbs}</td>
        <td style="font-weight:600">${n.name}</td>
        <td style="font-size:11px;color:var(--muted)">${info.teamA} vs ${info.teamB} · ${info.date||'—'}</td>
      </tr>`;
    });
    html+='</tbody></table></div></div>';
  }

  return html;
};

// Original index.html:32668
wbdContext._downloadFile = function _downloadFile(content, filename, type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=filename;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
}

export function initialize(wbdContext) {
// Original index.html:31946
wbdContext._rvCache = {gen:-1,key:'',data:null};

// Original index.html:32020
wbdContext._xoutGridCache = {gKey:-1,grid:null,global:0.5};

// Original index.html:32069
wbdContext._xoutAggCache = {gKey:-1,data:null};

// Original index.html:32350
wbdContext._levCache = {key:'',val:null};
}
