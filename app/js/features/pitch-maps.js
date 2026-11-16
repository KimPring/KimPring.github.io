/** pitch-maps: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:9095
wbdContext.renderMapPitchToggles = function renderMapPitchToggles(kind){
  const el=document.getElementById(kind+'-map-pitch-toggles');
  if(!el)return;
  const data=kind==='p'?wbdContext.getPitcherDataFiltered():wbdContext.getBatterDataFiltered();
  // 각 그룹별 데이터 수집 (pitchGroup 함수로 동적 분류)
  const groupData={};
  data.filter(d=>d.spdK>0).forEach(d=>{
    const g=wbdContext.pitchGroup(d.pType,d);
    if(!groupData[g]) groupData[g]=0;
    groupData[g]++;
  });
  const usedGroups=Object.keys(groupData).sort((a,b)=>groupData[b]-groupData[a]);
  const sel=window.mapPitchSel[kind];
  usedGroups.forEach(g=>{ if(sel[g]===undefined)sel[g]=true; });
  el.innerHTML=usedGroups.map(g=>{
    const col=wbdContext.GROUP_COLORS[g]||'#888';
    const on=sel[g];
    const cnt=groupData[g];
    return `<button onclick="toggleMapPitches('${kind}','${g}')" title="${g} (${cnt}구)" style="font-size:11px;padding:4px 10px;border-radius:3px;border:1px solid ${on?col:'var(--border)'};background:${on?col+'33':'transparent'};color:${on?col:'var(--muted)'};cursor:pointer;font-family:var(--cond);font-weight:600">${on?'✓ ':''}${g} <span style="opacity:0.6">(${cnt})</span></button>`;
  }).join('') || '<span style="color:var(--muted);font-size:11px">데이터 없음</span>';
};

// Original index.html:9117
wbdContext.toggleMapPitches = function toggleMapPitches(kind,arg){
  const data=kind==='p'?wbdContext.getPitcherDataFiltered():wbdContext.getBatterDataFiltered();
  const usedGroups=[...new Set(data.filter(d=>d.spdK>0).map(d=>wbdContext.pitchGroup(d.pType,d)))];
  const sel=window.mapPitchSel[kind];
  if(arg==='all')usedGroups.forEach(g=>sel[g]=true);
  else if(arg==='none')usedGroups.forEach(g=>sel[g]=false);
  else sel[arg]=!sel[arg];
  wbdContext.renderMapPitchToggles(kind);
  if(kind==='p')wbdContext.renderPitcherPrecisionMap();
  else wbdContext.renderBatterZoneMap();
};

// Original index.html:9129
wbdContext._passMapPitchFilter = function _passMapPitchFilter(kind,d){
  const sel=window.mapPitchSel[kind];
  if(!sel||Object.keys(sel).length===0)return true;
  const g=wbdContext.pitchGroup(d.pType,d);
  if(sel[g]===undefined)return true;
  return sel[g]===true;
};

// Original index.html:9139
wbdContext.getActivePitcherHandFilter = function getActivePitcherHandFilter(){
  const idx=typeof wbdContext.activePitcherTab!=='undefined'?wbdContext.activePitcherTab:0;
  const suffix=['A',null,'C',null,'E'][idx];
  if(!suffix)return '';
  const el=document.getElementById('p-hand-'+suffix);
  return el?el.value:'';
};

// Original index.html:9146
wbdContext.getActiveBatterHandFilter = function getActiveBatterHandFilter(){
  const idx=typeof wbdContext.activeBatterTab!=='undefined'?wbdContext.activeBatterTab:0;
  const suffix=['A','B','C',null,'E'][idx];
  if(!suffix)return '';
  const el=document.getElementById('b-hand-'+suffix);
  return el?el.value:'';
};

// Original index.html:9154
wbdContext.getBatterDataFiltered = function getBatterDataFiltered(){
  let data=wbdContext.getBatterData();
  const v=wbdContext.getActiveBatterHandFilter();
  if(v)data=data.filter(d=>d.pHand===v);
  return data;
};

// Original index.html:9161
wbdContext.getPitcherDataFiltered = function getPitcherDataFiltered(){
  let data=wbdContext.getPitcherData();
  const v=wbdContext.getActivePitcherHandFilter();
  if(v)data=data.filter(d=>d.bZone===v);
  return data;
};

// Original index.html:9170
wbdContext.renderPrecisionPitchToggles = function renderPrecisionPitchToggles(){
  const el=document.getElementById('p-precision-pitch-toggles');
  if(!el)return;
  const groups=[...new Set(wbdContext.getPitcherDataFiltered().filter(d=>d.spdK>0).map(d=>wbdContext.pitchGroup(d.pType,d)))];
  // 초기화: 첫 렌더 시 전부 true
  groups.forEach(g=>{if(window.precisionPitchSel[g]===undefined)window.precisionPitchSel[g]=true;});
  el.innerHTML=groups.map(g=>{
    const on=window.precisionPitchSel[g];
    const col=wbdContext.GROUP_COLORS[g]||'#888';
    return `<button onclick="togglePrecisionPitches('${g}')" style="font-size:11px;padding:4px 10px;border-radius:3px;border:1px solid ${on?col:'var(--border)'};background:${on?col+'22':'transparent'};color:${on?col:'var(--muted)'};cursor:pointer;font-family:var(--cond);font-weight:600">${on?'✓ ':''}${g}</button>`;
  }).join('');
};

// Original index.html:9182
wbdContext.togglePrecisionPitches = function togglePrecisionPitches(g){
  const groups=[...new Set(wbdContext.getPitcherDataFiltered().filter(d=>d.spdK>0).map(d=>wbdContext.pitchGroup(d.pType,d)))];
  if(g==='all'){groups.forEach(x=>window.precisionPitchSel[x]=true);}
  else if(g==='none'){groups.forEach(x=>window.precisionPitchSel[x]=false);}
  else{window.precisionPitchSel[g]=!window.precisionPitchSel[g];}
  wbdContext.renderPrecisionPitchToggles();
  // E탭 내용만 재렌더 (헤더는 전체 구종 기준 유지)
  wbdContext.renderPitcherPrecisionSummary();
  wbdContext.renderPitcherPrecisionPitchTable();
  wbdContext.renderPitcherPrecisionMap();
  wbdContext.renderPitcherCountStrategy();
  wbdContext.renderPitcherSequenceTable();
};

// Original index.html:9196
wbdContext.getPitcherDataForPrecision = function getPitcherDataForPrecision(){
  let data=wbdContext.getPitcherDataFiltered();
  const sel=window.precisionPitchSel||{};
  const anySelected=Object.values(sel).some(v=>v);
  if(anySelected){
    data=data.filter(d=>{const g=wbdContext.pitchGroup(d.pType,d);return sel[g]===true;});
  }
  return data;
};

// Original index.html:9206
wbdContext._zoneClass = function _zoneClass(d){
  // zoneX, zoneY 절댓값 ≤ 1 → 인존, 그 외 → 아웃존
  const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
  return (zx<=1 && zy<=1) ? 'in' : 'out';
};

// Original index.html:9213
wbdContext._isSwing = function _isSwing(d){ return d.bSwing===1 || d.bSwing===true; };

// Original index.html:9215
wbdContext._isBunt = function _isBunt(d){ return +d.buntGrip>=0.7; };

// Original index.html:9218
wbdContext._isWhiff = function _isWhiff(d){ return wbdContext._isSwing(d) && (!d.ev || +d.ev===0); };

// Original index.html:9220
wbdContext._isContact = function _isContact(d){ return wbdContext._isSwing(d) && +d.ev>0; };

// Original index.html:9224
wbdContext._isK = function _isK(d){ return +d.strk===2 && (+d.call===0 || +d.call===4); };

// Original index.html:9230
wbdContext._isHit = function _isHit(d){ return (+d.ev>0 && wbdContext._isHitPlay(d)) || +d.result===4; };

// Original index.html:9233
wbdContext._battedType = function _battedType(d){
  if(!(+d.ev>0) || +d.result===3) return null;   // 타구 아님/파울
  const la=+d.ldeg;
  if(isNaN(la)) return (+d.result===1?'뜬공':+d.result===2?'땅볼':null); // ldeg 없으면 코드 폴백
  if(la<10) return '땅볼';
  if(la<25) return '라인';
  return '뜬공';
};

// Original index.html:9241
wbdContext._pct = function _pct(n,d){ return d>0 ? (n/d*100).toFixed(1)+'%' : '-'; };

// Original index.html:9251
wbdContext._isHR = function _isHR(d){ return +d.result===4; };

// Original index.html:9254
wbdContext._isBB = function _isBB(d){ return +d.result===5; };

// Original index.html:9257
wbdContext._isHBP = function _isHBP(d){ return +d.result===6; };

// Original index.html:9263
wbdContext._isAB = function _isAB(d){
  const r=+d.result;
  return +d['1BSafe']===1 || r===4 || r===1 || r===2 || wbdContext._isK(d);
};

// Original index.html:9278
wbdContext._renderSprayField = function _renderSprayField(dots, opts){
  opts=opts||{};
  const W=opts.w||520, H=opts.h||440, PAD=opts.pad||12;
  const F=wbdContext.FIELD;
  // V11.4: 내야 모드는 내야 영역만 줌인 (타자 스프레이와 동일 — 라벨 겹침 방지)
  const _zoomIn = opts.zoneOverlay==='infield';
  const lxMin=(opts.lxMin!=null?opts.lxMin:(_zoomIn?-32:-80)), lxMax=(opts.lxMax!=null?opts.lxMax:(_zoomIn?32:80));
  const lzMin=(opts.lzMin!=null?opts.lzMin:(_zoomIn?-72:-142)), lzMax=(opts.lzMax!=null?opts.lzMax:(_zoomIn?-12:-14));
  const mPerPx=Math.max((lzMax-lzMin)/(H-PAD*2),(lxMax-lxMin)/(W-PAD*2));
  const fx=lx=>PAD+(lxMax-lx)/mPerPx;   // lx+ → 화면 왼쪽(3루/LF)
  const fy=lz=>PAD+(lz-lzMin)/mPerPx;   // 외야 위, 홈플레이트 아래
  const P=p=>({x:fx(p.lx),y:fy(p.lz)});
  const hp=P(F.HP),b1=P(F.B1),b2=P(F.B2),b3=P(F.B3),mn=P(F.MND);
  const rfp=P(F.RFP),rc=P(F.RC),cfr=P(F.CFR),cfc=P(F.CFC),cfl=P(F.CFL),lc=P(F.LC),lfp=P(F.LFP);
  let s='';
  s+=wbdContext.sEl('rect',{x:0,y:0,width:W,height:H,fill:'#0a1a06',rx:'4'});
  const outPts=[hp,rfp,rc,cfr,cfc,cfl,lc,lfp].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  s+=wbdContext.sEl('polygon',{points:outPts,fill:'#1e4010',stroke:'rgba(255,255,255,0.15)','stroke-width':'0.6'});
  const fence=[rfp,rc,cfr,cfc,cfl,lc,lfp].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  s+=`<polyline points="${fence}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1.4"/>`;
  s+=`<line x1="${hp.x.toFixed(1)}" y1="${hp.y.toFixed(1)}" x2="${rfp.x.toFixed(1)}" y2="${rfp.y.toFixed(1)}" stroke="rgba(255,255,255,0.3)" stroke-width="0.9"/>`;
  s+=`<line x1="${hp.x.toFixed(1)}" y1="${hp.y.toFixed(1)}" x2="${lfp.x.toFixed(1)}" y2="${lfp.y.toFixed(1)}" stroke="rgba(255,255,255,0.3)" stroke-width="0.9"/>`;
  const dPts=[hp,b1,b2,b3].map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  s+=wbdContext.sEl('polygon',{points:dPts,fill:'#2a1808',opacity:'0.85'});
  s+=wbdContext.sEl('polygon',{points:dPts,fill:'none',stroke:'rgba(255,255,255,0.85)','stroke-width':'1.1'});
  s+=wbdContext.sEl('circle',{cx:mn.x.toFixed(1),cy:mn.y.toFixed(1),r:(opts.small?3:4).toFixed(1),fill:'rgba(180,120,60,0.6)'});
  [[hp,'HP'],[b1,'1B'],[b2,'2B'],[b3,'3B']].forEach(([p,l])=>{
    const bs=opts.small?2.2:3;
    s+=wbdContext.sEl('rect',{x:(p.x-bs).toFixed(1),y:(p.y-bs).toFixed(1),width:(bs*2).toFixed(1),height:(bs*2).toFixed(1),fill:'white',rx:'0.8'});
    if(!opts.small) s+=wbdContext.sEl('text',{x:p.x.toFixed(1),y:(p.y+12).toFixed(1),fill:'rgba(255,255,255,0.6)','font-size':'7','text-anchor':'middle'},l);
  });
  // 히트맵 (격자 밀도)
  if(opts.heat && dots.length){
    const cell=opts.cell||5, grid={}; let maxC=0;
    dots.forEach(d=>{ const k=Math.floor(d.lx/cell)+'_'+Math.floor(d.lz/cell); grid[k]=(grid[k]||0)+1; if(grid[k]>maxC)maxC=grid[k]; });
    Object.entries(grid).forEach(([k,c])=>{
      const [gx,gz]=k.split('_').map(Number);
      const x1=fx((gx+1)*cell), y1=fy((gz+1)*cell), x2=fx(gx*cell), y2=fy(gz*cell);
      const t=c/maxC;
      const col=t<0.5?`rgba(${Math.round(80+t*2*175)},${Math.round(160+t*2*95)},60,${0.25+t*0.5})`:`rgba(255,${Math.round(255-(t-0.5)*2*200)},40,${0.35+t*0.45})`;
      s+=`<rect x="${Math.min(x1,x2).toFixed(1)}" y="${Math.min(y1,y2).toFixed(1)}" width="${Math.abs(x2-x1).toFixed(1)}" height="${Math.abs(y2-y1).toFixed(1)}" fill="${col}" class="sf-cell" data-cnt="${c}"/>`;
    });
  }
  // 점 (존 필터가 걸린 경우 해당 영역 타구만 표시)
  if(opts.dots!==false){
    const dimDots = !!opts.zoneOverlay;
    const _zf=opts.zoneOverlay;
    const _IR=30;
    dots.forEach((d,i)=>{
      if(_zf==='infield'||_zf==='outfield'){
        const _dz=-((+d.lz||0)+20);
        const _dist=Math.sqrt((+d.lx||0)**2+_dz*_dz);
        if(_zf==='infield' && (_dz<=0||_dist>_IR))return;
        if(_zf==='outfield' && (_dz>0&&_dist<=_IR))return;
      }
      const x=fx(d.lx), y=fy(d.lz);
      if(x<-15||x>W+15||y<-15||y>H+15)return;
      if(opts.showTrail) s+=`<line x1="${hp.x.toFixed(1)}" y1="${hp.y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${d.color||'#888'}" stroke-width="0.8" opacity="0.35" stroke-dasharray="3,2"/>`;
      s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${d.r||(opts.small?4:2.6)}" fill="${d.color||'#888'}" opacity="${dimDots?(d.op||0.82)*0.55:(d.op||0.82)}" stroke="#000" stroke-width="0.4" class="sf-dot" data-i="${i}"/>`;
    });
  }
  // V11.3: 5등분 방향 존 오버레이 (opts.zoneOverlay: 'all'|'infield'|'outfield')
  // V11.4 fix: 부채꼴이 SVG 밖으로 넘쳐 상단 카드를 덮고 클릭까지 막던 문제 → clipPath로 영역 제한
  if(opts.zoneOverlay){
    const mode=opts.zoneOverlay;
    const _clipId='sfclip_'+Math.random().toString(36).slice(2,9);
    s+=`<defs><clipPath id="${_clipId}"><rect x="0" y="0" width="${W}" height="${H}" rx="4"/></clipPath></defs>`;
    s+=`<g clip-path="url(#${_clipId})">`;
    const ZN=['우익','우중','중견','좌중','좌익'];
    const ZC=['#ff8c44','#ffb368','#ffd700','#a8d8a8','#88ddaa'];
    const cnt=[0,0,0,0,0]; let tot=0;
    const IR=30;   // 내야 반경 (m)
    dots.forEach(d=>{
      const lx=+d.lx||0, dz=-((+d.lz||0)+wbdContext.FIELD.HP.lz*0+20);
      const _dz=-((+d.lz||0)+20);
      if(_dz<=0)return;
      const dist=Math.sqrt(lx*lx+_dz*_dz);
      if(mode==='infield' && dist>IR) return;
      if(mode==='outfield' && dist<=IR) return;
      const ang=Math.atan2(lx,_dz)*180/Math.PI;
      if(ang<-45||ang>45)return;
      let zi = ang<=-27?0 : ang<=-9?1 : ang<=9?2 : ang<=27?3 : 4;
      cnt[zi]++; tot++;
    });
    // 부채꼴 반지름 — 실제 거리(m) 기준으로 환산해 구장 안에 정확히 맞춤
    let outerR, innerR;
    const _fenceR = 118/mPerPx;              // 담장까지 (중앙 135m − HP 20m ≈ 115m, 여유 포함)
    const _infR   = IR/mPerPx;               // 내야 30m
    if(mode==='infield'){ outerR=_infR; innerR=0; }
    else if(mode==='outfield'){ innerR=_infR; outerR=_fenceR; }
    else { outerR=_fenceR; innerR=0; }
    const toRad=deg=>(-90-deg)*Math.PI/180;
    [[-45,-27,0],[-27,-9,1],[-9,9,2],[9,27,3],[27,45,4]].forEach(([a1,a2,zi])=>{
      const r1=toRad(a2), r2=toRad(a1);
      const p1x=hp.x+outerR*Math.cos(r1), p1y=hp.y+outerR*Math.sin(r1);
      const p2x=hp.x+outerR*Math.cos(r2), p2y=hp.y+outerR*Math.sin(r2);
      let path;
      if(innerR>0){
        const i1x=hp.x+innerR*Math.cos(r1), i1y=hp.y+innerR*Math.sin(r1);
        const i2x=hp.x+innerR*Math.cos(r2), i2y=hp.y+innerR*Math.sin(r2);
        path=`M ${i1x.toFixed(1)} ${i1y.toFixed(1)} L ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${outerR.toFixed(1)} ${outerR.toFixed(1)} 0 0 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)} L ${i2x.toFixed(1)} ${i2y.toFixed(1)} A ${innerR.toFixed(1)} ${innerR.toFixed(1)} 0 0 0 ${i1x.toFixed(1)} ${i1y.toFixed(1)} Z`;
      } else {
        path=`M ${hp.x.toFixed(1)} ${hp.y.toFixed(1)} L ${p1x.toFixed(1)} ${p1y.toFixed(1)} A ${outerR.toFixed(1)} ${outerR.toFixed(1)} 0 0 1 ${p2x.toFixed(1)} ${p2y.toFixed(1)} Z`;
      }
      const pct=tot>0?cnt[zi]/tot*100:0;
      s+=`<path d="${path}" fill="${ZC[zi]}" opacity="${0.10+Math.min(0.30,pct/100*0.9)}" stroke="${ZC[zi]}" stroke-width="0.8" stroke-opacity="0.5"/>`;
      // 라벨
      // 라벨 위치 (타자 스프레이와 동일): 도넛이면 중간, 아니면 65% 지점
      const midR = innerR>0 ? (innerR+outerR)/2 : outerR*(mode==='infield'?0.88:0.72);
      const midA=toRad((a1+a2)/2);
      const lx2=hp.x+midR*Math.cos(midA), ly2=hp.y+midR*Math.sin(midA);
      if(lx2>4&&lx2<W-4&&ly2>12&&ly2<H-6){
        s+=`<text x="${lx2.toFixed(1)}" y="${(ly2-3).toFixed(1)}" fill="#fff" font-size="12" font-weight="800" text-anchor="middle" style="paint-order:stroke;stroke:rgba(0,0,0,0.8);stroke-width:3">${pct.toFixed(1)}%</text>`;
        s+=`<text x="${lx2.toFixed(1)}" y="${(ly2+9).toFixed(1)}" fill="#fff" font-size="8" text-anchor="middle" style="paint-order:stroke;stroke:rgba(0,0,0,0.8);stroke-width:2.5">${ZN[zi]}</text>`;
      }
    });
    s+='</g>';
    s+=wbdContext.sEl('text',{x:8,y:14,fill:'#cdd6e0','font-size':'9'},
      (mode==='all'?'전체':mode==='infield'?'내야(30m 이내)':'외야(30m 밖)')+` · ${tot}타구`);
  }
  // V11.4 fix: 구장 SVG는 overflow를 숨겨 오버레이가 바깥 카드를 덮지 않도록 (전역 makeSVG는 visible)
  return wbdContext.makeSVG(W,H,s).replace('style="overflow:visible;display:block"','style="overflow:hidden;display:block"');
};

// Original index.html:9402
wbdContext._zoneCell = function _zoneCell(zx,zy){
  let col=Math.floor((+zx+2)/0.8), row=Math.floor((2-(+zy||0))/0.8);
  return [Math.max(0,Math.min(4,col)), Math.max(0,Math.min(4,row))];
};

// Original index.html:9407
wbdContext._renderZoneHeat = function _renderZoneHeat(cells, opts){
  opts=opts||{};
  const S=opts.size||56, W=S*5+2, H=S*5+2;
  let items='';
  for(let r=0;r<5;r++){
    for(let c=0;c<5;c++){
      const cell=cells[c+','+r], x=c*S+1, y=r*S+1;
      const inZone=(c>=1&&c<=3&&r>=1&&r<=3);
      const border=inZone?'#f5a623':'#2a4060';
      const fill=(cell&&cell.fill)||'#0a1828';
      const lowN=!!(cell&&cell.lowN);
      const rectAttr={x,y,width:S-2,height:S-2,fill,stroke:border,'stroke-width':inZone?'1.4':'0.8',rx:'2'};
      if(lowN) rectAttr['stroke-dasharray']='3,2';
      items+=wbdContext.sEl('rect',rectAttr);
      if(cell&&cell.text!=null){
        // 배경 대비 확보: 텍스트에 어두운 외곽선
        items+=`<text x="${(x+S/2-1).toFixed(1)}" y="${(y+S/2+2).toFixed(1)}" fill="#fff" font-size="${(opts.size&&opts.size<50?'10':'12')}" text-anchor="middle" font-family="var(--mono)" font-weight="700" style="paint-order:stroke;stroke:rgba(0,0,0,0.55);stroke-width:2.5">${String(cell.text)}</text>`;
        if(cell.sub) items+=`<text x="${(x+S/2-1).toFixed(1)}" y="${(y+S-8).toFixed(1)}" fill="rgba(255,255,255,0.72)" font-size="8" text-anchor="middle" style="paint-order:stroke;stroke:rgba(0,0,0,0.5);stroke-width:2">${String(cell.sub)}</text>`;
      }
    }
  }
  return wbdContext.makeSVG(W,H,items);
};

// Original index.html:9433
wbdContext._pitchOutcome = function _pitchOutcome(d){
  const res=+d.result, call=+d.call;
  if(res===4) return 'hr';                                  // 홈런
  if(res===6 || call===3) return 'hbp';                     // 사구
  if(res===5) return 'bb';                                  // 볼넷 (타석 종료)
  if(res===3) return 'foul';                                // 파울
  if(wbdContext._isInPlay(d)) return wbdContext._isHit(d) ? 'hit' : 'out';         // 인플레이 → 안타/아웃
  if(wbdContext._isWhiff(d)) return 'whiff';                            // 헛스윙 (bSwing 기반, 존 안팎 무관)
  if(wbdContext._isSwing(d)) return 'foul';                             // 스윙했는데 타구 없고 헛스윙도 아님 → 파울팁
  if(wbdContext._isInZone(d)) return 'called';                          // 존 안인데 스윙 안함 = 루킹 스트라이크
  return 'ball';                                             // 존 밖 + 스윙 안함 = 볼
};
}

export function initialize(wbdContext) {
// Original index.html:9093
window.mapPitchSel={p:{},b:{}};

// Original index.html:9169
window.precisionPitchSel={};

// Original index.html:9271
wbdContext.FIELD = {
  HP:{lx:0,lz:-20}, MND:{lx:0,lz:-38.44},
  B1:{lx:-19.40,lz:-39.70}, B2:{lx:0,lz:-59.10}, B3:{lx:+19.40,lz:-39.70},
  RFP:{lx:-74.0,lz:-94.30}, RC:{lx:-54.74,lz:-117.50}, CFR:{lx:-20.0,lz:-135.0},
  CFC:{lx:0,lz:-135.0}, CFL:{lx:+20.0,lz:-135.0}, LC:{lx:+54.74,lz:-117.50}, LFP:{lx:+74.0,lz:-94.30}
};
}
