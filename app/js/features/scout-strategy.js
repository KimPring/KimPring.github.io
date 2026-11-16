/** scout-strategy: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:24324
wbdContext._memoByGame = function _memoByGame(tag, name, compute){
  const k=(typeof wbdContext._gameStatsKey==='function'?wbdContext._gameStatsKey():wbdContext.GAMES.length);
  if(window._memoG.key!==k){ window._memoG.key=k; window._memoG.map=new Map(); }
  const id=tag+'|'+String(name);
  if(window._memoG.map.has(id)) return window._memoG.map.get(id);
  const v=compute(); window._memoG.map.set(id,v); return v;
};

// Original index.html:24345
wbdContext._atkLoc = function _atkLoc(d){
  const zx=+d.zoneX, zy=+d.zoneY;
  if(isNaN(zx)||isNaN(zy)) return null;
  const lefty = String(d.bZone||'R').toUpperCase()==='L';
  const inZone = zx>=-1&&zx<=1&&zy>=-1&&zy<=1;
  const innerSide = lefty ? (zx<-0.33) : (zx>0.33);
  const outerSide = lefty ? (zx>0.33) : (zx<-0.33);
  const col = innerSide?'몸쪽':outerSide?'바깥':'가운데';
  const row = zy>0.33?'높은':zy<-0.33?'낮은':'중간';
  if(inZone) return {inZone:true, col, row, cell:row+' '+col, fam:[row,col], lefty};
  let dir;
  if(zx<-1) dir = lefty?'몸쪽 볼':'바깥 볼'; else if(zx>1) dir = lefty?'바깥 볼':'몸쪽 볼'; else if(zy>1) dir='높은 볼'; else dir='낮은 볼';
  return {inZone:false, col, row, ball:dir, fam:[dir.split(' ')[0]], lefty};
};

// Original index.html:24359
wbdContext._atkIsFastball = function _atkIsFastball(g){ return ['패스트볼','포심','투심','드롭','커터','싱커','라이징','라이징 슬라이더','라이징 싱커'].includes(g); };

// Original index.html:24360
wbdContext._atkPitchClass = function _atkPitchClass(d){ const g=wbdContext.pitchGroup(d.pType,d); if(!g||g==='기타')return null; return wbdContext._atkIsFastball(g)?'직구':'변화구'; };

// Original index.html:24361
wbdContext._atkCountState = function _atkCountState(d){ const b=+d.ball, s=+d.strk; if(b===0&&s===0)return '초구'; if(s===2)return '2S'; if(b>s)return '유리'; if(b<s)return '불리'; return '동일'; };

// Original index.html:24363
wbdContext._josaRo = function _josaRo(w){ const c=w.charCodeAt(w.length-1); const jong=(c>=0xAC00&&c<=0xD7A3)?(c-0xAC00)%28:0; return (jong===0||jong===8)?'로':'으로'; };

// Original index.html:24366
wbdContext._atkBucket = function _atkBucket(arr){
  const b={seen:arr.length, sw:0, wh:0, ab:0, hits:0, hr:0, ko:0, evS:0, evN:0, con:0, tb:0};
  arr.forEach(x=>{ if(wbdContext._isSwing(x)){b.sw++; if(wbdContext._isWhiff(x))b.wh++; else b.con++;}
    if(wbdContext._isABPitch(x)){b.ab++; if(wbdContext._isHit(x)){b.hits++; b.tb+=(+x._hitBase||(+x.result===4?4:1));} if(+x.result===4)b.hr++; if(wbdContext._isK(x)&&!wbdContext._isHit(x))b.ko++;}
    if(wbdContext._isInPlay(x)){b.evS+=+x.ev; b.evN++;} });
  b.ba=b.ab>0?b.hits/b.ab:null; b.slg=b.ab>0?b.tb/b.ab:null; b.swPct=b.seen>0?b.sw/b.seen*100:null;
  b.whPct=b.sw>0?b.wh/b.sw*100:null; b.ev=b.evN>0?b.evS/b.evN:null; b.kPct=b.ab>0?b.ko/b.ab*100:null;
  return b;
};

// Original index.html:24378
wbdContext._atkCourseStats = function _atkCourseStats(name, mode){ return wbdContext._atkCourseStatsArr(wbdContext._dbData(name,mode)); };

// Original index.html:24379
wbdContext._atkCourseStatsArr = function _atkCourseStatsArr(d){
  const H={몸쪽:[],가운데:[],바깥:[]}, V={높은:[],중간:[],낮은:[]}, cells={}, balls={};
  d.forEach(x=>{ const L=wbdContext._atkLoc(x); if(!L)return;
    if(L.inZone){ H[L.col].push(x); V[L.row].push(x); (cells[L.cell]=cells[L.cell]||[]).push(x); }
    else { (balls[L.ball]=balls[L.ball]||[]).push(x); } });
  return {H:wbdContext._atkBK(H), V:wbdContext._atkBK(V), cells:wbdContext._atkBK(cells), balls:wbdContext._atkBK(balls)};
};

// Original index.html:24387
wbdContext._atkPitchStats = function _atkPitchStats(name, mode){ return wbdContext._atkPitchStatsArr(wbdContext._dbData(name,mode)); };

// Original index.html:24388
wbdContext._atkPitchStatsArr = function _atkPitchStatsArr(d){
  const cls={직구:[],변화구:[]}, grp={};
  d.forEach(x=>{ const c=wbdContext._atkPitchClass(x); if(c)cls[c].push(x);
    const g=wbdContext.pitchGroup(x.pType,x); if(g&&g!=='기타'){(grp[g]=grp[g]||[]).push(x);} });
  // 직구 구속대: 본인이 본 직구 중앙값 기준 상/하
  const fbSp=cls.직구.map(x=>+x.spdK).filter(v=>v>0).sort((a,b)=>a-b);
  const med=fbSp.length?fbSp[Math.floor(fbSp.length/2)]:null;
  const fast=med!=null?wbdContext._atkBucket(cls.직구.filter(x=>+x.spdK>=med+3)):null;
  const slow=med!=null?wbdContext._atkBucket(cls.직구.filter(x=>+x.spdK>0&&+x.spdK<=med-3)):null;
  return {fb:wbdContext._atkBucket(cls.직구), brk:wbdContext._atkBucket(cls.변화구), fbMed:med, fbFast:fast, fbSlow:slow,
    groups:Object.entries(grp).map(([g,a])=>({g, n:a.length, ...(wbdContext._atkBucket(a))})).filter(x=>x.ab>=3||x.sw>=5)};
};

// Original index.html:24401
wbdContext._atkCrossStats = function _atkCrossStats(name, mode){ return wbdContext._atkCrossStatsArr(wbdContext._dbData(name,mode)); };

// Original index.html:24402
wbdContext._atkCrossStatsArr = function _atkCrossStatsArr(d){
  const cross={};
  d.forEach(x=>{ const L=wbdContext._atkLoc(x), c=wbdContext._atkPitchClass(x); if(!L||!c)return;
    const loc = L.inZone? L.col : L.ball.split(' ')[0];
    (cross[loc+' '+c]=cross[loc+' '+c]||[]).push(x); });
  return wbdContext._atkBK(cross);
};

// Original index.html:24410
wbdContext._atkCountStats = function _atkCountStats(name, mode){ return wbdContext._atkCountStatsArr(wbdContext._dbData(name,mode)); };

// Original index.html:24411
wbdContext._atkCountStatsArr = function _atkCountStatsArr(d){
  const by={초구:[],유리:[],동일:[],불리:[],'2S':[]};
  d.forEach(x=>{ const c=wbdContext._atkCountState(x); if(by[c])by[c].push(x); });
  const r=wbdContext._atkBK(by);
  // 각 상황 체이스(존 밖 스윙률)
  for(const k in by){ const oz=by[k].filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;}); r[k].chase=oz.length>=4?oz.filter(wbdContext._isSwing).length/oz.length*100:null; r[k].ozN=oz.length; }
  return r;
};

// Original index.html:24420
wbdContext._atk2S = function _atk2S(name, mode){ return wbdContext._atk2SArr(wbdContext._dbData(name,mode)); };

// Original index.html:24421
wbdContext._atk2SArr = function _atk2SArr(dAll){
  const d=dAll.filter(x=>+x.strk===2); const grp={}, loc={};
  d.forEach(x=>{ const g=wbdContext.pitchGroup(x.pType,x); if(g&&g!=='기타')(grp[g]=grp[g]||[]).push(x);
    const L=wbdContext._atkLoc(x); if(L){ const k=L.inZone?L.cell:L.ball; (loc[k]=loc[k]||[]).push(x);} });
  const G=Object.entries(wbdContext._atkBK(grp)).map(([g,b])=>({g,...b})).filter(x=>x.sw>=4);
  const Lc=Object.entries(wbdContext._atkBK(loc)).map(([k,b])=>({k,...b})).filter(x=>x.seen>=4);
  return {byPitch:G.sort((a,b)=>(b.whPct||0)-(a.whPct||0)), byLoc:Lc.sort((a,b)=>(b.whPct||0)-(a.whPct||0)), n:d.length,
    kPct: (()=>{ const ab=d.filter(wbdContext._isABPitch); const k=ab.filter(x=>wbdContext._isK(x)&&!wbdContext._isHit(x)).length; return ab.length?k/ab.length*100:null; })()};
};

// Original index.html:24432
wbdContext._atkClassify = function _atkClassify(b, self){
  if(!b || b.seen<5) return null;
  const AB=4, SW=4;
  const weakBA = b.ba!=null && b.ab>=AB && b.ba <= self.ba-0.05;
  const strongBA= b.ba!=null && b.ab>=AB && b.ba >= self.ba+0.06;
  const swings  = b.swPct!=null && b.swPct >= Math.max(32, self.swPct-12);
  const whiffs  = b.whPct!=null && b.sw>=SW && b.whPct >= self.whPct+6;
  const softCon = b.ev!=null && b.evN>=3 && b.ev <= (self.ev||100)-4;
  if(strongBA) return 'avoid';
  if(weakBA && swings && (whiffs||softCon)) return 'strong';
  if(weakBA && swings) return 'induce';
  if(weakBA && !swings) return 'take';
  if(whiffs && swings) return 'induce';
  return null;
};

// Original index.html:24447
wbdContext._atkConf = function _atkConf(b){ const n=Math.max(b.ab||0,(b.sw||0)); return n>=15?'높음': n>=8?'보통': ('낮음·표본'+n); };

// Original index.html:24448
wbdContext._atkLabelFam = function _atkLabelFam(label){ return label.split(' ').filter(w=>['높은','중간','낮은','몸쪽','가운데','바깥'].includes(w)); };

// Original index.html:24451
wbdContext._atkBatter = function _atkBatter(name){ return wbdContext._memoByGame('_atkBatter', name, ()=>wbdContext._atkBatter__raw(name)); };

// Original index.html:24452
wbdContext._atkBatter__raw = function _atkBatter__raw(name){
  const d=wbdContext.getBatterDataByName(name); if(!d.length) return null;
  const A=wbdContext._atkBatterCore(name,d); if(!A) return null;
  A.splitLR=wbdContext._atkSplitLR(name,'batter',d);
  return A;
};

// Original index.html:24458
wbdContext._atkBatterCore = function _atkBatterCore(name,d){
  if(!d||!d.length) return null;
  const s=wbdContext._h2hSlash(d)||{};
  const self={ ba:s.ba||0, swPct:d.length?d.filter(wbdContext._isSwing).length/d.length*100:0,
    whPct:(()=>{const sw=d.filter(wbdContext._isSwing).length;return sw?d.filter(wbdContext._isWhiff).length/sw*100:0;})(),
    ev:(()=>{const b=d.filter(wbdContext._isInPlay);return b.length?b.reduce((a,x)=>a+(+x.ev),0)/b.length:100;})() };
  const cs=wbdContext._atkCourseStatsArr(d), ps=wbdContext._atkPitchStatsArr(d), cross=wbdContext._atkCrossStatsArr(d);
  const ct=wbdContext._atkCountStatsArr(d), k2=wbdContext._atk2SArr(d);
  const oz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;});
  const chase=oz.length?oz.filter(wbdContext._isSwing).length/oz.length*100:null;
  // 선구안 성향 라벨만 리그 분포 백분위로 (이 리그는 체이스 절대값이 전반적으로 높아 절대 기준은 무의미)
  const _lgChase=(typeof wbdContext._slLeagueDist==='function')?wbdContext._slLeagueDist().bat.chase:[];
  const chasePct=(chase!=null&&_lgChase.length>=8)?wbdContext._slPctile(chase,_lgChase,false):null; // 높을수록 선구안 좋음
  const goodEye=chasePct!=null&&chasePct>=75, badEye=chasePct!=null&&chasePct<=25;
  const fpB=ct['초구']; const fpSw=fpB.swPct;
  const hand=String(d[0]&&d[0].bZone||'').toUpperCase();  // 타자 손
  // 좌/우투 · 득점권 · 당김
  const vsL=wbdContext._atkBucket(d.filter(x=>String(x.pHand).toUpperCase()==='L')), vsR=wbdContext._atkBucket(d.filter(x=>String(x.pHand).toUpperCase()==='R'));
  const risp=wbdContext._atkBucket(d.filter(x=>+x.b2===1||+x.b3===1)), noRun=wbdContext._atkBucket(d.filter(x=>!(+x.b1===1||+x.b2===1||+x.b3===1)));
  const ip=d.filter(x=>wbdContext._isInPlay(x)&&!isNaN(+x.sdeg));
  const pullSide=hand==='L'?'right':'left';
  const pullN=ip.filter(x=>wbdContext._fieldSide(x)===pullSide).length, oppoN=ip.filter(x=>wbdContext._fieldSide(x)===(pullSide==='left'?'right':'left')).length;
  const pullPct=ip.length?pullN/ip.length*100:null;

  // ── 후보 수집 ──
  const cand=[];
  const add=(label,b,kind)=>{ const t=wbdContext._atkClassify(b,self); if(!t)return; cand.push({label,b,kind,tier:t}); };
  for(const k in cs.cells) add(k,cs.cells[k],'존칸');
  for(const k in cross) add(k,cross[k],'교차');
  if(ps.fb) add('직구',ps.fb,'구종'); if(ps.brk) add('변화구',ps.brk,'구종');
  ps.groups.forEach(g=>add(g.g,g,'구종세부'));
  for(const k in cs.balls) add(k,cs.balls[k],'볼');
  if(ps.fbFast&&ps.fbMed) add(`빠른 직구(${Math.round(ps.fbMed+3)}km+)`,ps.fbFast,'구속');
  if(ps.fbSlow&&ps.fbMed) add(`느린 직구(${Math.round(ps.fbMed-3)}km-)`,ps.fbSlow,'구속');
  // 점수
  const tierW={strong:3, induce:1.8, avoid:-5, take:0.6};
  cand.forEach(c=>{ const b=c.b; let sc=(tierW[c.tier]||0);
    if(b.ba!=null) sc+=Math.max(0,(self.ba-b.ba))*4;
    if(b.whPct!=null) sc+=Math.max(0,(b.whPct-self.whPct))/20;
    if(c.kind==='교차') sc+=0.4; if(c.kind==='존칸') sc+=0.3; if(c.kind==='구속') sc+=0.2;
    const nn=Math.max(b.ab||0,b.sw||0); sc*=(nn>=12?1.1: nn>=8?1.0: nn>=5?0.72:0.5);
    c.score=sc; });
  const byTier=t=>cand.filter(c=>c.tier===t).sort((a,b)=>b.score-a.score);
  const strong=byTier('strong'), induce=byTier('induce'), take=byTier('take'), avoid=byTier('avoid');
  // 다양성 억제: 같은 위치 패밀리(높은/몸쪽…)는 최대 2개, 같은 라벨 1개
  const pick=[], seenLbl=new Set(), famCnt={};
  [...strong,...induce].forEach(c=>{ if(pick.length>=4||seenLbl.has(c.label))return;
    const fams=wbdContext._atkLabelFam(c.label); if(fams.some(f=>(famCnt[f]||0)>=2))return;
    fams.forEach(f=>famCnt[f]=(famCnt[f]||0)+1); seenLbl.add(c.label); pick.push(c); });

  // ── 서사 ──
  const W=pick.map(c=>{ const b=c.b;
    const tierTag=c.tier==='strong'?'✅ 강력 공략':'△ 범타 유도';
    const icon=c.kind==='구종'||c.kind==='구종세부'||c.kind==='구속'?'🪃':c.kind==='볼'?'🎣':'🎯';
    let why=`${c.label} 타율 ${wbdContext._slFmt3(b.ba)}`;
    if(b.ba!=null) why+=` (본인 ${wbdContext._slFmt3(self.ba)} 대비 ${Math.round((b.ba-self.ba)*1000)}p)`;
    if(b.swPct!=null) why+=` · 스윙 ${wbdContext._slPct(b.swPct)}`; if(b.whPct!=null) why+=` · 헛스윙 ${wbdContext._slPct(b.whPct)}`; if(b.ev!=null) why+=` · EV ${b.ev.toFixed(0)}`;
    // V12.0: 공략법은 판정 근거에 맞춰 — 헛스윙이 근거면 결정구, 약한 타구가 근거면 카운트 잡기/범타 유도
    const whiffy=b.whPct!=null&&b.sw>=4&&b.whPct>=self.whPct+6, softy=b.ev!=null&&b.evN>=3&&b.ev<=(self.ev||100)-4, isPitchKind=(c.kind==='구종'||c.kind==='구종세부'||c.kind==='구속');
    const subj=isPitchKind?`${c.label} 비중↑`:`${c.label}${wbdContext._josaRo(c.label)} 승부`;
    let how;
    if(c.tier==='strong'){
      if(whiffy&&softy) how=`${subj} — 헛스윙(${wbdContext._slPct(b.whPct)})도 나오고 맞아도 약함(EV ${b.ev.toFixed(0)}) → 카운트 잡기부터 2S 결정구까지 전천후`;
      else if(whiffy) how=`${subj} — 헛스윙 ${wbdContext._slPct(b.whPct)} → 2스트라이크 결정구로`;
      else if(softy) how=`${subj} — 헛스윙은 적지만 맞아도 약한 타구(EV ${b.ev.toFixed(0)}) → 초반 카운트 잡기·범타 유도용, 결정구는 다른 공으로`;
      else how=`${subj} — 타율 낮음(${wbdContext._slFmt3(b.ba)}), 손은 댐 → 카운트 싸움에 적극 활용`;
    } else how=`${subj} — 맞혀도 약하니 ${isPitchKind?'적극 활용':'범타 유도 위치로'}`;
    return {icon,tier:tierTag,title:c.label,why,how,conf:wbdContext._atkConf(b),n:b.ab||b.sw,score:c.score}; });
  const takeNotes=take.slice(0,2).map(c=>({label:c.label,b:c.b}));

  // ── 상황별 인사이트 (카운트·초구·2S·좌우·득점권·당김) → 약점/강점/시퀀스 재료 ──
  const ins=[]; // {kind,text}
  // 초구
  if(fpB.seen>=10 && fpSw!=null){
    if(fpSw<=25) ins.push({k:'fp',w:true,t:`초구 소극적(스윙 ${wbdContext._slPct(fpSw)}) → 초구 스트라이크 공짜`});
    else if(fpSw>=50){ const fpBA=fpB.ba; ins.push({k:'fp',w:fpBA!=null&&fpBA<self.ba-0.05, t:`초구 적극(스윙 ${wbdContext._slPct(fpSw)})${fpBA!=null?`, 초구 타율 ${wbdContext._slFmt3(fpBA)}`:''} → ${fpBA!=null&&fpBA>=self.ba?'초구 존에 넣지 말 것':'초구 존 경계 유인 유효'}`}); }
  }
  // 카운트별 체이스 변화 (2S/불리에서 급증 = 몰면 뭐든 됨)
  if(ct['2S'].chase!=null && chase!=null && ct['2S'].chase>=chase+12) ins.push({k:'ct',w:true,t:`2스트라이크 되면 존 밖 스윙 ${wbdContext._slPct(ct['2S'].chase)}(평소 ${wbdContext._slPct(chase)}) → 2S 만들면 볼로 끝낼 수 있음`});
  if(ct['유리'].ba!=null && ct['유리'].ab>=8 && ct['유리'].ba>=self.ba+0.06) ins.push({k:'ct',w:false,t:`타자 유리 카운트 타율 ${wbdContext._slFmt3(ct['유리'].ba)} → 볼 먼저 주면 위험, 카운트 선점 필수`});
  if(ct['불리'].ba!=null && ct['불리'].ab>=8 && ct['불리'].ba<=self.ba-0.06) ins.push({k:'ct',w:true,t:`몰리면 타율 ${wbdContext._slFmt3(ct['불리'].ba)}로 급락 → 스트라이크 선점이 곧 승부`});
  // 2S 접근
  if(k2.kPct!=null && k2.n>=20){ if(k2.kPct>=35) ins.push({k:'2s',w:true,t:`2S 삼진율 ${wbdContext._slPct(k2.kPct)} → 결정구로 삼진 노려도 됨`}); else if(k2.kPct<=15) ins.push({k:'2s',w:false,t:`2S 삼진율 ${wbdContext._slPct(k2.kPct)}(커트·컨택↑) → 삼진보단 범타 유도`}); }
  const putAway=k2.byPitch.find(x=>x.sw>=5&&x.whPct>=35);
  if(putAway) ins.push({k:'2s',w:true,t:`2S 결정구 추천: ${putAway.g} (헛스윙 ${wbdContext._slPct(putAway.whPct)}, ${putAway.sw}스윙)`});
  const putLoc=k2.byLoc.find(x=>x.sw>=4&&x.whPct>=40);
  if(putLoc) ins.push({k:'2s',w:true,t:`2S 결정구 위치: ${putLoc.k} (헛스윙 ${wbdContext._slPct(putLoc.whPct)})`});
  // 좌/우투
  if(vsL.ab>=8&&vsR.ab>=8&&vsL.ba!=null&&vsR.ba!=null){ const dd=vsL.ba-vsR.ba;
    if(dd<=-0.08) ins.push({k:'lr',w:true,t:`좌투 상대 ${wbdContext._slFmt3(vsL.ba)} vs 우투 ${wbdContext._slFmt3(vsR.ba)} → 좌투 매치업 유리`});
    else if(dd>=0.08) ins.push({k:'lr',w:true,t:`우투 상대 ${wbdContext._slFmt3(vsR.ba)} vs 좌투 ${wbdContext._slFmt3(vsL.ba)} → 우투 매치업 유리`}); }
  // 득점권
  if(risp.ab>=8&&risp.ba!=null){ if(risp.ba>=self.ba+0.06) ins.push({k:'risp',w:false,t:`득점권 ${wbdContext._slFmt3(risp.ba)}(평소보다↑) → 주자 2·3루 땐 거르기 고려`}); else if(risp.ba<=self.ba-0.06) ins.push({k:'risp',w:true,t:`득점권 ${wbdContext._slFmt3(risp.ba)}(평소보다↓) → 주자 있을 때 승부해도 됨`}); }
  // 당김/밀어
  if(pullPct!=null&&ip.length>=15){ if(pullPct>=55) ins.push({k:'dir',w:false,t:`당겨치기 ${wbdContext._slPct(pullPct)} → ${hand==='L'?'우측':'좌측'} 시프트·몸쪽 공은 당겨맞을 위험`}); else if(pullPct<=30) ins.push({k:'dir',w:false,t:`밀어치기 위주(당김 ${wbdContext._slPct(pullPct)}) → 바깥 공 밀어치기 주의, 반대 시프트`}); }

  // ── 강점 ──
  const S=[];
  avoid.slice(0,2).forEach(c=>S.push({icon:'🚫',title:`${c.label} 강함`,why:`${c.label} 타율 ${wbdContext._slFmt3(c.b.ba)} (본인보다 높음)${c.b.slg?` · 장타 ${c.b.slg.toFixed(3)}`:''}`,how:`${c.label}${wbdContext._josaRo(c.label)} 넣지 말 것`}));
  if(goodEye) S.push({icon:'👁️',title:'선구안 좋음',why:`존 밖 스윙률 ${wbdContext._slPct(chase)} (리그 상위 ${100-chasePct}%)`,how:'볼로 카운트 낭비 금물, 존 안 승부'});
  if(s.ba>=0.34) S.push({icon:'💪',title:'강타자',why:`타율 ${wbdContext._slFmt3(s.ba)}, OPS ${s.ops?s.ops.toFixed(3):'-'}`,how:'실투 절대 금물, 구석 위주'});
  ins.filter(i=>!i.w).slice(0,2).forEach(i=>S.push({icon:'⚠️',title:i.t.split(' → ')[0],why:'',how:i.t.split(' → ')[1]||''}));

  // ── 승부 시퀀스 ──
  const seq=[];
  // 초구
  if(fpSw!=null&&fpSw<=25) seq.push({step:'초구',t:'스트라이크 선점 — 안 휘두르니 존에 넣어 0-1'});
  else if(fpSw!=null&&fpSw>=50&&fpB.ba!=null&&fpB.ba>=self.ba) seq.push({step:'초구',t:'존 밖 경계로 유인 — 초구 적극+잘 침, 존 안 금물'});
  else seq.push({step:'초구',t:(avoid[0]?`${avoid[0].label} 피해서 `:'')+'구석 스트라이크'});
  // 카운트
  const cFav=ct['유리']; if(cFav.ba!=null&&cFav.ab>=6&&cFav.ba>=self.ba+0.05) seq.push({step:'볼 앞설 때',t:`위험(타율 ${wbdContext._slFmt3(cFav.ba)}) — 정면승부 말고 ${W[0]?W[0].title+wbdContext._josaRo(W[0].title):'약점 구역으로'}`}); else seq.push({step:'카운트',t:`${W[0]?W[0].title+wbdContext._josaRo(W[0].title)+(W[0].tier.includes('강력')?' 헛스윙':' 범타'):'약점 구역으로'} 유도하며 몰기`});
  // 결정구
  if(putAway||putLoc) seq.push({step:'2S 결정구',t:[putAway?`${putAway.g}(2S 헛스윙 ${wbdContext._slPct(putAway.whPct)})`:null, putLoc?`${putLoc.k}(헛 ${wbdContext._slPct(putLoc.whPct)})`:null].filter(Boolean).join(' · ')+(k2.kPct!=null&&k2.kPct<=15?' — 커트 많음 → 범타 유도도 OK':'')});
  else if(W[0]) seq.push({step:'2S 결정구',t:`${W[0].title} — 2S 표본 적어 전체 약점 기준`});
  // 주의
  if(ct['2S'].chase!=null&&chase!=null&&ct['2S'].chase>=chase+12) seq.push({step:'참고',t:`2S에선 볼도 쫓음(${wbdContext._slPct(ct['2S'].chase)}) — 존 안 넣지 말고 빼서 끝내기`});
  if(risp.ab>=8&&risp.ba!=null&&risp.ba>=self.ba+0.06) seq.push({step:'주자시',t:`득점권 ${wbdContext._slFmt3(risp.ba)} — 1루 비면 거르기 선택지`});

  // ── 요약 ──
  const feats=[];
  if(ps.fb&&ps.brk&&ps.fb.ba!=null&&ps.brk.ba!=null){ const diff=ps.fb.ba-ps.brk.ba;
    if(diff>=0.05) feats.push(`직구(${wbdContext._slFmt3(ps.fb.ba)})엔 강하나 변화구(${wbdContext._slFmt3(ps.brk.ba)})에 약함`);
    else if(diff<=-0.05) feats.push(`변화구(${wbdContext._slFmt3(ps.brk.ba)})는 치지만 직구(${wbdContext._slFmt3(ps.fb.ba)})에 약함`); }
  if(goodEye)feats.push('선구안 좋아 유인구로는 한계'); else if(badEye)feats.push(`유인구에 잘 속음(존 밖 스윙 ${wbdContext._slPct(chase)}, 리그 하위)`);
  if(W[0]) feats.push(`가장 확실한 공략처는 ${W[0].title}`);
  const ctIns=ins.find(i=>i.k==='ct'||i.k==='2s'); if(ctIns) feats.push(ctIns.t.split(' → ')[0]);
  if(!feats.length) feats.push('뚜렷한 약점이 적은 까다로운 타자 — 구석·카운트 싸움 필요');
  const summary=feats.join('. ')+'.';
  return {mode:'batter', s, self, summary, weaknesses:W.slice(0,4), strengths:S.slice(0,4), takeNotes, insights:ins.filter(i=>i.w).map(i=>i.t), sequence:seq, cs, ps, cross, ct, k2, chase, fpSw, vsL, vsR, risp, pullPct};
};

// Original index.html:24590
wbdContext._atkPitcher = function _atkPitcher(name){ return wbdContext._memoByGame('_atkPitcher', name, ()=>wbdContext._atkPitcher__raw(name)); };

// Original index.html:24591
wbdContext._atkPitcher__raw = function _atkPitcher__raw(name){
  const d=wbdContext.getPitcherDataByName(name); if(!d.length) return null;
  const P=wbdContext._atkPitcherCore(name,d); if(!P) return null;
  P.splitLR=wbdContext._atkSplitLR(name,'pitcher',d);
  return P;
};

// Original index.html:24597
wbdContext._atkPitcherCore = function _atkPitcherCore(name,d){
  if(!d||!d.length) return null;
  const s=wbdContext._h2hSlash(d)||{}; const se=wbdContext._getPitcherSeason(name)||{};
  const ps=wbdContext._atkPitchStatsArr(d), cs=wbdContext._atkCourseStatsArr(d), cross=wbdContext._atkCrossStatsArr(d);
  const tot=d.length||1; const self={ba:s.ba||0};
  const mix=ps.groups.map(g=>({...g, pct:g.n/tot*100})).sort((a,b)=>b.n-a.n);
  // 카운트별 구종 선택 (예측)
  const byCt={초구:{},유리:{},동일:{},불리:{},'2S':{}}, ctN={초구:0,유리:0,동일:0,불리:0,'2S':0};
  d.forEach(x=>{ const c=wbdContext._atkCountState(x); const g=wbdContext.pitchGroup(x.pType,x); if(!g||g==='기타'||!byCt[c])return; byCt[c][g]=(byCt[c][g]||0)+1; ctN[c]++; });
  const topOf=c=>{ const e=Object.entries(byCt[c]).sort((a,b)=>b[1]-a[1])[0]; return e&&ctN[c]>=8?{g:e[0],pct:e[1]/ctN[c]*100,n:ctN[c]}:null; };
  const fpTop=topOf('초구'), behindTop=topOf('유리') /* 타자유리=투수 몰림 */, twoSTop=topOf('2S');
  // 2S 결정구 위치
  const k2loc={}; d.filter(x=>+x.strk===2).forEach(x=>{ const L=wbdContext._atkLoc(x); if(!L)return; const k=L.inZone?L.cell:L.ball; k2loc[k]=(k2loc[k]||0)+1; });
  const k2tot=Object.values(k2loc).reduce((a,b)=>a+b,0); const k2top=Object.entries(k2loc).sort((a,b)=>b[1]-a[1])[0];
  // 초구 스트라이크율 / 볼넷
  const fp=d.filter(x=>+x.ball===0&&+x.strk===0);
  const fpStrike=fp.length?fp.filter(x=>+x.call===0||wbdContext._isSwing(x)||(+x.result>=1&&+x.result<=4)).length/fp.length*100:null;
  // 좌/우타, 주자
  const vsL=wbdContext._atkBucket(d.filter(x=>String(x.bZone).toUpperCase()==='L')), vsR=wbdContext._atkBucket(d.filter(x=>String(x.bZone).toUpperCase()==='R'));
  const onBase=d.filter(x=>+x.b1===1||+x.b2===1||+x.b3===1), empty=d.filter(x=>!(+x.b1===1||+x.b2===1||+x.b3===1));
  const obB=wbdContext._atkBucket(onBase), emB=wbdContext._atkBucket(empty);
  const obBB=onBase.length?onBase.filter(x=>+x.result===5).length/Math.max(1,wbdContext._countPaEnd(onBase).length)*100:null;
  const emBB=empty.length?empty.filter(x=>+x.result===5).length/Math.max(1,wbdContext._countPaEnd(empty).length)*100:null;
  // 구속
  const fbSp=d.filter(x=>wbdContext._atkPitchClass(x)==='직구'&&+x.spdK>0).map(x=>+x.spdK); const fbAvg=fbSp.length?fbSp.reduce((a,b)=>a+b,0)/fbSp.length:null;

  const W=[], S=[];
  // 1) 잘 맞는 구종 (비중도 고려: 많이 던지는 구종이 잘 맞으면 최고)
  mix.filter(x=>x.ab>=6&&x.ba!=null&&x.ba>=self.ba+0.04).sort((a,b)=>(b.ba-self.ba)*(0.5+b.pct/100)-(a.ba-self.ba)*(0.5+a.pct/100)).slice(0,2).forEach(g=>{
    W.push({icon:'🎯',tier:'✅ 노림 구종',title:`${g.g} 노림`,score:(g.ba-self.ba)*(1+g.pct/50)*10,
      why:`${g.g} 피안타율 ${wbdContext._slFmt3(g.ba)} (전체 ${wbdContext._slFmt3(self.ba)} 대비 +${Math.round((g.ba-self.ba)*1000)}p)${g.slg?` · 장타 ${g.slg.toFixed(3)}`:''} · 비중 ${g.pct.toFixed(0)}%`,
      how:`${g.g} 올 확률 높은 카운트에서 적극 — ${g.pct>=35?'주력이라 자주 옴':'올 때 놓치지 말 것'}`,conf:g.ab>=15?'높음':g.ab>=8?'보통':'낮음·표본'+g.ab,n:g.ab}); });
  // 2) 구종×위치 잘 맞는 조합
  const crossHot=Object.entries(cross).map(([k,b])=>({k,b})).filter(x=>x.b.ab>=5&&x.b.ba!=null&&x.b.ba>=self.ba+0.07).sort((a,b)=>b.b.ba-a.b.ba)[0];
  if(crossHot) W.push({icon:'📍',tier:'✅ 노림 코스',title:`${crossHot.k} 노림`,score:(crossHot.b.ba-self.ba)*8,why:`${crossHot.k} 피안타율 ${wbdContext._slFmt3(crossHot.b.ba)} — 이 조합이 가장 잘 맞음`,how:`${crossHot.k} 들어오면 적극 스윙`,conf:wbdContext._atkConf(crossHot.b),n:crossHot.b.ab});
  // 3) 카운트 패턴 (예측 가능성)
  if(behindTop&&behindTop.pct>=70) W.push({icon:'🔮',tier:'✅ 패턴',title:`몰리면 ${behindTop.g}`,score:behindTop.pct/25,why:`볼 앞설 때 ${behindTop.g} ${wbdContext._slPct(behindTop.pct)} (${behindTop.n}구) — 뻔함`,how:`볼카운트 앞서면 ${behindTop.g} 노리고 풀스윙`,conf:behindTop.n>=20?'높음':'보통',n:behindTop.n});
  if(twoSTop&&twoSTop.pct>=60) W.push({icon:'🔮',tier:'✅ 패턴',title:`2S 결정구 ${twoSTop.g}`,score:twoSTop.pct/30,why:`2스트라이크에 ${twoSTop.g} ${wbdContext._slPct(twoSTop.pct)}${k2top&&k2tot>=8?` · 위치는 ${k2top[0]} ${Math.round(k2top[1]/k2tot*100)}%`:''}`,how:`2S에선 ${twoSTop.g}${k2top?` ${k2top[0]}`:''} 대비 — 존 밖이면 참기`,conf:twoSTop.n>=20?'높음':'보통',n:twoSTop.n});
  if(fpTop&&fpTop.pct>=65&&fpStrike!=null&&fpStrike>=58) W.push({icon:'🅰️',tier:'✅ 초구',title:`초구 ${fpTop.g} 노림`,score:fpTop.pct/30,why:`초구 ${fpTop.g} ${wbdContext._slPct(fpTop.pct)} · 초구 스트라이크 ${wbdContext._slPct(fpStrike)}`,how:`초구부터 ${fpTop.g} 노리고 적극 — 몰리기 전에`,conf:fpTop.n>=20?'높음':'보통',n:fpTop.n});
  // 4) 제구/주자
  if(s.bbPct!=null&&s.bbPct>=10) W.push({icon:'🎚️',tier:'참고',title:'제구 불안',score:s.bbPct/8,why:`볼넷률 ${wbdContext._slPct(s.bbPct)}`,how:'카운트 기다려 볼넷·몰린 실투 노림',conf:s.PA>=40?'높음':'보통',n:s.PA});
  if(obB.ab>=8&&emB.ab>=8&&obB.ba!=null&&emB.ba!=null&&obB.ba>=emB.ba+0.07) W.push({icon:'🏃',tier:'참고',title:'주자 있으면 흔들림',score:1.4,why:`주자 있을 때 피안타율 ${wbdContext._slFmt3(obB.ba)} vs 없을 때 ${wbdContext._slFmt3(emB.ba)}${obBB!=null&&emBB!=null&&obBB>=emBB+4?` · 볼넷도 ${wbdContext._slPct(obBB)}↑`:''}`,how:'출루 먼저 — 주자 쌓이면 실투 급증',conf:'보통',n:obB.ab});
  // 5) 좌우
  if(vsL.ab>=8&&vsR.ab>=8&&vsL.ba!=null&&vsR.ba!=null){ const dd=vsL.ba-vsR.ba; if(Math.abs(dd)>=0.08) W.push({icon:'↔️',tier:'참고',title:dd>0?'좌타에 약함':'우타에 약함',score:1.2,why:`vs 좌타 ${wbdContext._slFmt3(vsL.ba)} / vs 우타 ${wbdContext._slFmt3(vsR.ba)}`,how:`${dd>0?'좌타':'우타'} 위주 라인업`,conf:'보통',n:Math.min(vsL.ab,vsR.ab)}); }
  // 강점(조심)
  const nasty=mix.filter(x=>x.ab>=6&&x.ba!=null).sort((a,b)=>a.ba-b.ba)[0];
  if(nasty&&nasty.ba<=self.ba-0.05) S.push({icon:'⚠️',title:`${nasty.g} 조심`,why:`${nasty.g} 피안타율 ${wbdContext._slFmt3(nasty.ba)}${nasty.whPct!=null?` · 헛스윙 ${wbdContext._slPct(nasty.whPct)}`:''}`,how:`${nasty.g}는 커트/골라내고 다른 구종 노림`});
  const crossCold=Object.entries(cross).map(([k,b])=>({k,b})).filter(x=>x.b.ab>=5&&x.b.ba!=null&&x.b.ba<=self.ba-0.08).sort((a,b)=>a.b.ba-b.b.ba)[0];
  if(crossCold) S.push({icon:'🧊',title:`${crossCold.k} 안 맞음`,why:`${crossCold.k} 피안타율 ${wbdContext._slFmt3(crossCold.b.ba)}`,how:'이 조합은 버리고 기다리기'});
  if(se.era!=null&&se.era<=3) S.push({icon:'🧊',title:'전반적 안정',why:`ERA ${se.era.toFixed(2)}, WHIP ${se.whip!=null?se.whip.toFixed(2):'-'}`,how:'한 방보다 출루 쌓기'});
  W.sort((a,b)=>(b.score||0)-(a.score||0));

  // 시퀀스(타자 입장)
  const seq=[];
  // V12.0: 구종 집중도에 따라 문구 분기 — 45% 미만이면 '노려라'가 아니라 '구종 분산'
  if(fpTop&&fpStrike!=null){
    if(fpStrike<52) seq.push({step:'초구',t:`초구 스트라이크 ${wbdContext._slPct(fpStrike)}로 낮음 → 초구는 지켜보고 카운트 선점 (볼 앞서면 ${behindTop?behindTop.g+' '+wbdContext._slPct(behindTop.pct):'실투'} 노림)`});
    else if(fpTop.pct>=45) seq.push({step:'초구',t:`${fpTop.g} ${wbdContext._slPct(fpTop.pct)}·스트라이크 ${wbdContext._slPct(fpStrike)} → 초구 ${fpTop.g} 노리고 적극`});
    else seq.push({step:'초구',t:`초구 구종 분산(최다 ${fpTop.g} ${wbdContext._slPct(fpTop.pct)})·스트라이크 ${wbdContext._slPct(fpStrike)} → 구종 찍지 말고 존 안 공만 적극, 볼은 버리기`});
  } else seq.push({step:'초구',t:'초구 성향 표본 부족'});
  if(behindTop) seq.push({step:'볼 앞설 때',t:`${behindTop.g} ${wbdContext._slPct(behindTop.pct)} → ${behindTop.pct>=70?'뻔함 — 노리고 풀스윙':behindTop.pct>=50?`${behindTop.g} 우선 노림, 다른 구종은 몰린 공만`:'구종 분산 — 찍지 말고 몰린 공만'}`});
  if(twoSTop) seq.push({step:'2S 몰렸을 때',t:`결정구 ${twoSTop.g}${k2top&&k2tot>=8?` ${k2top[0]}`:''} 대비 — 존 밖 떨어지면 참고 커트`});
  if(W.find(w=>w.tier.includes('노림'))) seq.push({step:'노림',t:W.filter(w=>w.tier.includes('노림')).map(w=>w.title.replace(' 노림','')).join(' · ')});
  if(obB.ab>=8&&emB.ba!=null&&obB.ba!=null&&obB.ba>=emB.ba+0.07) seq.push({step:'전략',t:'선두타자 출루에 집중 — 주자 쌓이면 무너짐'});

  const feats=[];
  if(mix[0]) feats.push(`${mix[0].g} ${mix[0].pct.toFixed(0)}%${fbAvg?` (직구 평균 ${fbAvg.toFixed(0)}km)`:''}`);
  if(behindTop&&behindTop.pct>=70) feats.push(`몰리면 ${behindTop.g} ${wbdContext._slPct(behindTop.pct)}로 뻔함`);
  if(twoSTop&&twoSTop.pct>=60) feats.push(`2S 결정구 ${twoSTop.g} 고정`);
  if(s.bbPct>=10) feats.push('제구 불안');
  if(W.find(w=>w.tier.includes('노림'))) feats.push(`노림: ${W.find(w=>w.tier.includes('노림')).title.replace(' 노림','')}`);
  const summary=(feats.length?feats.join(' · '):'뚜렷한 약점 적은 안정적 투수')+'.';
  return {mode:'pitcher', s, se, self, summary, weaknesses:W.slice(0,4), strengths:S.slice(0,3), takeNotes:[], insights:[], sequence:seq, mix, cs, ps, cross, byCt, ctN, fpStrike, vsL, vsR, obB, emB, fbAvg};
};

// Original index.html:24673
wbdContext._atkSplitLR = function _atkSplitLR(name, mode, d){
  const key=mode==='batter'?'pHand':'bZone';
  const out={};
  ['L','R'].forEach(h=>{
    const sub=d.filter(x=>String(x[key]).toUpperCase()===h);
    if(sub.length<50){ out[h]={n:sub.length, ok:false}; return; }
    try{
      const C=mode==='batter'?wbdContext._atkBatterCore(name,sub):wbdContext._atkPitcherCore(name,sub);
      if(!C){ out[h]={n:sub.length, ok:false}; return; }
      const r={n:sub.length, ok:true, ba:C.s&&C.s.ba, ops:C.s&&C.s.ops, weak:C.weaknesses.slice(0,2).map(w=>({tier:w.tier,title:w.title,how:w.how})), strong:C.strengths.slice(0,1).map(x=>x.title), summary:C.summary};
      if(mode==='pitcher'){ r.mix=(C.mix||[]).slice(0,3).map(m=>`${m.g} ${m.pct.toFixed(0)}%`); const hot=Object.entries(C.cross||{}).map(([k,b])=>({k,b})).filter(x=>x.b.ab>=4&&x.b.ba!=null).sort((a,b)=>b.b.ba-a.b.ba)[0]; if(hot) r.hot=`${hot.k} ${wbdContext._slFmt3(hot.b.ba)}`; }
      else { r.seq=(C.sequence||[]).slice(0,3).map(x=>x.step+': '+x.t); }
      out[h]=r;
    }catch(e){ out[h]={n:sub.length, ok:false}; }
  });
  return out;
};

// Original index.html:24690
wbdContext._atkRenderSplitLR = function _atkRenderSplitLR(A, mode){
  if(!A||!A.splitLR) return '';
  const isBat=mode==='batter'; const L=A.splitLR.L, R=A.splitLR.R;
  if(!(L&&L.ok)&&!(R&&R.ok)) return '';
  const lbl=isBat?['vs 좌투','vs 우투']:['vs 좌타','vs 우타'];
  const col=(side,title)=>{ if(!side||!side.ok) return `<div><div style="font-weight:700;margin-bottom:4px">${title}</div><div style="font-size:11px;color:var(--muted)">표본 부족 (${side?side.n:0}구)</div></div>`;
    return `<div><div style="font-weight:700;margin-bottom:4px">${title} <span style="font-size:10px;color:var(--muted);font-weight:400">${side.n}구 · ${isBat?'타율':'피안타율'} ${wbdContext._slFmt3(side.ba)}</span></div>
      ${side.mix?`<div style="font-size:11px;color:var(--muted)">구종: ${side.mix.join(' · ')}</div>`:''}
      ${side.hot?`<div style="font-size:11px;color:#39ff8a">잘 맞는 조합: ${wbdContext._esc(side.hot)}</div>`:''}
      ${side.weak.map(w=>`<div style="font-size:11.5px;margin-top:3px"><span style="color:${(w.tier||'').includes('✅')?'#39ff8a':'#f5a623'};font-size:10px">${wbdContext._esc(w.tier||'')}</span> <b>${wbdContext._esc(w.title)}</b> → ${wbdContext._esc(w.how)}</div>`).join('')}
      ${side.strong.length?`<div style="font-size:11px;color:#ff4560;margin-top:3px">🚫 ${wbdContext._esc(side.strong[0])}</div>`:''}</div>`; };
  const diff=(L&&L.ok&&R&&R.ok&&L.ba!=null&&R.ba!=null)?Math.abs(L.ba-R.ba):0;
  return `<div class="card section" style="border-left:3px solid #cc44ff"><div class="card-title" style="font-size:13px">↔️ 좌/우 분할 공략 <span style="font-weight:400;font-size:10px;color:var(--muted)">${isBat?'상대 투수 손잡이별':'상대 타자 좌우별'} — 접근·구종이 달라짐${diff>=0.08?` · <b style="color:#f5a623">편차 큼(${Math.round(diff*1000)}p)</b>`:''}</span></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" class="sl-grid2">${col(L,lbl[0])}${col(R,lbl[1])}</div></div>`;
};

// Original index.html:24705
wbdContext._atkEngine = function _atkEngine(name, mode){ return mode==='pitcher'?wbdContext._atkPitcher(name):wbdContext._atkBatter(name); };

// Original index.html:24708
wbdContext._atkRenderCards = function _atkRenderCards(A, mode){
  if(!A) return '';
  const isBat=mode==='batter'; const accent=isBat?'#ff8c44':'#39ff8a';
  let h='';
  h+=`<div style="background:rgba(255,215,0,0.07);border:1px solid rgba(255,215,0,0.2);padding:11px 13px;border-radius:6px;font-size:12.5px;line-height:1.7;margin-bottom:12px"><b style="color:#ffd700">📋 요약.</b> ${wbdContext._esc(A.summary)}</div>`;
  // 승부 시퀀스
  if(A.sequence&&A.sequence.length){
    h+=`<div class="card section" style="border-left:3px solid ${accent}"><div class="card-title">🧭 ${isBat?'승부 시퀀스 (투수 입장)':'타석 플랜 (타자 입장)'}</div><div style="display:flex;flex-direction:column;gap:6px">`+
      A.sequence.map(st=>`<div style="display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.55"><div style="min-width:78px;font-size:11px;font-weight:700;color:${accent};padding-top:2px">${wbdContext._esc(st.step)}</div><div style="flex:1">${wbdContext._esc(st.t)}</div></div>`).join('')+`</div></div>`;
  }
  h+=wbdContext._atkRenderSplitLR(A, mode);
  // 약점(공략 포인트)
  if(A.weaknesses.length){
    h+=`<div class="card section"><div class="card-title">⚔️ 공략 포인트 <span style="font-weight:400;font-size:11px;color:var(--muted)">· ${isBat?'약함+스윙함+유도됨 3단 검증':'잘 맞음·패턴·제구 기준'}</span></div>`;
    h+=A.weaknesses.map((w,i)=>{ const tc=(w.tier||'').includes('✅')?'#39ff8a':(w.tier==='참고')?'#88ccff':'#f5a623';
      const low=String(w.conf||'').includes('낮음'), mid=String(w.conf||'').includes('보통'); const cbg=low?'rgba(245,166,35,.16)':mid?'rgba(136,204,255,.16)':'rgba(57,255,138,.16)'; const ccol=low?'#f5a623':mid?'#88ccff':'#39ff8a';
      return `<div style="display:flex;gap:11px;align-items:flex-start;background:var(--card2);padding:11px 13px;border-radius:7px;border-left:3px solid ${i===0?'#ff4560':'#f5a623'};margin-bottom:9px">
      <div style="font-size:18px;flex-shrink:0">${w.icon}</div>
      <div style="flex:1;font-size:12.5px;line-height:1.6">
        <div style="font-weight:700;margin-bottom:3px">${w.tier?`<span style="font-size:10px;color:${tc};margin-right:5px">${wbdContext._esc(w.tier)}</span>`:''}${wbdContext._esc(w.title)} <span style="font-size:10px;padding:2px 7px;border-radius:9px;background:${cbg};color:${ccol}">신뢰 ${wbdContext._esc(w.conf||'보통')}</span></div>
        <div style="color:var(--text)"><b style="color:var(--muted);font-weight:400">근거</b> ${wbdContext._esc(w.why)}</div>
        <div style="color:${accent};margin-top:3px"><b style="color:var(--muted);font-weight:400">공략</b> → ${wbdContext._esc(w.how)}</div>
      </div></div>`;}).join('');
    if(A.insights&&A.insights.length) h+=`<div style="font-size:11.5px;line-height:1.7;margin-top:4px;padding:8px 10px;background:rgba(136,204,255,.06);border-radius:6px"><b style="color:#88ccff">＋ 상황별 추가 포인트</b><br>${A.insights.map(t=>'· '+wbdContext._esc(t)).join('<br>')}</div>`;
    if(A.takeNotes&&A.takeNotes.length) h+=`<div style="font-size:11px;color:var(--muted);margin-top:6px;line-height:1.6"><b>⚪ 거르는 공(참고):</b> ${A.takeNotes.map(t=>`${wbdContext._esc(t.label)}(타율 ${wbdContext._slFmt3(t.b.ba)}·스윙 ${wbdContext._slPct(t.b.swPct)})`).join(', ')} — 약하지만 손을 안 대 유인 효과 적음. 카운트 잡기용.</div>`;
    h+=`</div>`;
  } else {
    h+=`<div class="card section"><div class="card-title">⚔️ 공략 포인트</div><div style="font-size:12px;color:var(--muted)">뚜렷한 빈틈이 적음. 아래 세부 지표로 상황별로 노려야 함.</div>${A.insights&&A.insights.length?`<div style="font-size:11.5px;line-height:1.7;margin-top:8px">${A.insights.map(t=>'· '+wbdContext._esc(t)).join('<br>')}</div>`:''}</div>`;
  }
  // 강점
  if(A.strengths.length){
    h+=`<div class="card section"><div class="card-title">🛡️ ${isBat?'피해야 할 강점':'조심할 것'}</div>`;
    h+=A.strengths.map(st=>`<div style="display:flex;gap:11px;align-items:flex-start;background:var(--card2);padding:10px 12px;border-radius:7px;border-left:3px solid #ff4560;margin-bottom:8px">
      <div style="font-size:16px;flex-shrink:0">${st.icon}</div>
      <div style="flex:1;font-size:12px;line-height:1.55"><div style="font-weight:700">${wbdContext._esc(st.title)}</div>${st.why?`<div style="color:var(--muted)">${wbdContext._esc(st.why)}</div>`:''}<div style="color:#ff4560;margin-top:2px">→ ${wbdContext._esc(st.how)}</div></div></div>`).join('')+`</div>`;
  }
  return h;
};

// Original index.html:24755
wbdContext._dbData = function _dbData(name, mode){ return mode==='pitcher'?wbdContext.getPitcherDataByName(name):wbdContext.getBatterDataByName(name); };

// Original index.html:24758
wbdContext._dbMetrics6 = function _dbMetrics6(name, mode){
  const d=wbdContext._dbData(name,mode); const s=wbdContext._h2hSlash(d)||{};
  const bd=d.filter(wbdContext._isInPlay);
  const ev=bd.length?bd.reduce((a,x)=>a+(+x.ev),0)/bd.length:null;
  const hh=bd.length?bd.filter(x=>+x.ev>=110).length/bd.length*100:null;
  const brl=bd.length?bd.filter(x=>+x.ev>=105&&+x.ldeg>=8&&+x.ldeg<=32).length/bd.length*100:null;
  const laArr=bd.filter(x=>x.ldeg!=null); const la=laArr.length?laArr.reduce((a,x)=>a+(+x.ldeg),0)/laArr.length:null;
  const dist=wbdContext._slLeagueDist();
  const isBat=mode==='batter';
  // xBA (인플레이 BABIP성)
  let xba=null; try{ if(typeof wbdContext.getXOutData==='function'){ const xd=wbdContext.getXOutData(); const xo=(isBat?xd.bat:xd.pit)[name]||(isBat?xd.bat:xd.pit)[(typeof wbdContext._canonPlayer==='function'?wbdContext._canonPlayer(name):name)]; if(xo&&xo.bip>0) xba=xo.xHits/xo.bip; } }catch(e){}
  const baLbl=isBat?'타율':'피안타율';
  const cells=[];
  const mk=(lbl,val,pctl,col)=>{ const ptxt=pctl==null?'':(pctl>=50?`상위 ${100-pctl}%`:`하위 ${pctl}%`);
    cells.push(`<div style="background:var(--card2);border:1px solid var(--border);border-radius:7px;padding:9px 10px"><div style="font-size:10px;color:var(--muted)">${lbl}</div><div style="font-family:var(--mono);font-size:18px;font-weight:700;margin-top:2px;color:${col||'inherit'}">${val}</div><div style="font-size:9px;color:var(--muted);margin-top:1px">${ptxt}</div></div>`); };
  // 백분위: 타자는 ba 높을수록 상위, 투수는 피안타율 낮을수록 상위(=좋음). 여기선 '선수 능력' 관점 통일.
  mk(baLbl, wbdContext._slFmt3(s.ba), wbdContext._slPctile(s.ba, dist.bat.ba, isBat), isBat?(s.ba>=0.34?'#ff4560':''):(s.ba<=0.25?'#39ff8a':s.ba>=0.35?'#ff4560':''));
  mk('OPS', s.ops?s.ops.toFixed(3):'-', wbdContext._slPctile(s.ops, dist.bat.ops, true), s.ops>=0.85?'#ff4560':'');
  mk('삼진%', wbdContext._slPct(s.kPct), null, '');
  mk('볼넷%', wbdContext._slPct(s.bbPct), null, '');
  mk('평균 EV', ev?ev.toFixed(1):'-', wbdContext._slPctile(ev, dist.bat.ev, true), '');
  mk('하드히트%', wbdContext._slPct(hh), wbdContext._slPctile(hh, dist.bat.hh, true), hh>=40?'#ff4560':'');
  mk('배럴%', wbdContext._slPct(brl), wbdContext._slPctile(brl, dist.bat.brl, true), brl>=12?'#ff4560':'');
  mk('평균 발사각', la!=null?la.toFixed(1)+'°':'-', null, '');
  let html=`<div class="card section"><div class="card-title">📊 종합 지표 (리그 백분위)</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${cells.join('')}</div>`;
  if(xba!=null) html+=`<div style="font-size:10px;color:var(--muted);margin-top:6px">인플레이 xBA(타구질 기대, 홈런·삼진 제외) <b style="font-family:var(--mono)">${wbdContext._slFmt3(xba)}</b> ${xba<s.ba-0.02?'→ 실제보다 낮음(운↑)':xba>s.ba+0.02?'→ 실제보다 높음(운↓)':''}</div>`;
  return html+`</div>`;
};

// Original index.html:24790
wbdContext._dbCourse = function _dbCourse(name, mode){
  const cs=wbdContext._atkCourseStats(name,mode);
  const d=wbdContext._dbData(name,mode); const self=wbdContext._h2hSlash(d)||{ba:0};
  const isBat=mode==='batter'; const lbl=isBat?'타율':'피안타율';
  // 9칸 표: 행=높은/중간/낮은, 열=몸쪽/가운데/바깥
  const rows=['높은','중간','낮은'];
  const cols=['몸쪽','가운데','바깥'];
  const cell=(r,c)=>{ const k=r+' '+c; const b=cs.cells[k];
    if(!b||b.ab<3) return `<td style="text-align:center;padding:5px 3px;color:var(--muted)">${b&&b.seen?`<span style="font-size:9px">${b.seen}구</span>`:'-'}</td>`;
    const vs=Math.round((b.ba-self.ba)*1000);
    // 공략 관점: 타자 타율 낮으면 초록(공략), 투수 피안타율 높으면 초록(노림)
    const good=isBat?(vs<=-50):(vs>=50);  // 공략처
    const bad=isBat?(vs>=60):(vs<=-60);   // 강점
    const bg=good?'rgba(57,255,138,.14)':bad?'rgba(255,69,96,.14)':'transparent';
    return `<td style="text-align:center;padding:5px 3px;background:${bg};border-radius:3px">
      <div style="font-family:var(--mono);font-weight:700;font-size:12px">${wbdContext._slFmt3(b.ba)}</div>
      <div style="font-size:8px;color:var(--muted)">${b.ab}타·스윙${b.swPct!=null?b.swPct.toFixed(0):'-'}%</div>
      <div style="font-size:8px;color:${good?'#39ff8a':bad?'#ff4560':'var(--muted)'}">${vs>0?'+':''}${vs}</div></td>`; };
  let grid=`<table style="width:100%;border-collapse:separate;border-spacing:3px;font-size:11px"><thead><tr><th></th>${cols.map(c=>`<th style="font-size:10px;color:var(--muted);font-weight:600">${c}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r=>{ grid+=`<tr><td style="font-size:10px;color:var(--muted);font-weight:600">${r}</td>${cols.map(c=>cell(r,c)).join('')}</tr>`; });
  grid+=`</tbody></table>`;
  // 볼영역
  const ballKeys=['몸쪽 볼','바깥 볼','높은 볼','낮은 볼'].filter(k=>cs.balls[k]&&cs.balls[k].seen>=4);
  const ballRow=ballKeys.map(k=>{ const b=cs.balls[k]; return `<tr><td>${k}</td><td class="mono">${b.seen}</td><td class="mono">${b.swPct!=null?wbdContext._slPct(b.swPct):'-'}</td><td class="mono">${b.whPct!=null?wbdContext._slPct(b.whPct):'-'}</td><td class="mono">${b.ba!=null?wbdContext._slFmt3(b.ba):'-'}</td></tr>`; }).join('');
  return `<div class="card section"><div class="card-title">🧭 코스별 ${lbl} <span style="font-weight:400;font-size:10px;color:var(--muted)">· 존 안 9칸 · 본인 전체 ${wbdContext._slFmt3(self.ba)} 대비</span></div>
    ${grid}
    <div style="font-size:9px;color:var(--muted);margin-top:4px">칸: ${lbl} / 타수·스윙률 / 본인대비(±). ${isBat?'초록=본인보다 약한 칸(공략처)':'초록=잘 맞는 칸(노림)'} · 빨강=${isBat?'강점':'잘 막음'}. 3타수 미만은 구수만.</div>
    ${ballKeys.length?`<div style="margin-top:10px"><div style="font-size:10px;color:var(--muted);margin-bottom:4px">존 밖 볼영역 (스윙률 낮으면 "거르는 공")</div><div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>볼</th><th>구수</th><th>스윙%</th><th>헛%</th><th>${lbl}</th></tr></thead><tbody>${ballRow}</tbody></table></div></div>`:''}</div>`;
};

// Original index.html:24821
wbdContext._dbCount = function _dbCount(name, mode){
  const d=wbdContext._dbData(name,mode); if(!d.length) return '';
  const isBat=mode==='batter'; const lbl=isBat?'타율':'피안타율';
  const ct=wbdContext._atkCountStatsArr(d), self=wbdContext._atkBucket(d);
  const ozAll=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;}); const chaseAll=ozAll.length>=10?ozAll.filter(wbdContext._isSwing).length/ozAll.length*100:null;
  const rows=[['초구','초구 (0-0)'],['유리',isBat?'유리 (볼 앞섬)':'타자 유리 (볼 앞섬)'],['동일','동일 카운트'],['불리',isBat?'불리 (스트 앞섬)':'투수 유리 (스트 앞섬)'],['2S','2스트라이크']];
  const fmtD=v=>(v>0?'+':'')+(v*1000).toFixed(0);
  const memo=(k,b)=>{ const m=[];
    if(b.ba!=null&&self.ba!=null&&b.ab>=4){ const dv=b.ba-self.ba; if(Math.abs(dv)>=0.05) m.push(`<span style="color:${(dv<0)===isBat?'#39ff8a':'#ff4560'}">본인 대비 ${fmtD(dv)}</span>`); }
    if(k==='초구'&&b.swPct!=null){ m.push(b.swPct>=40?(isBat?'초구 적극 → 초구 볼로 유인 가능':'초구 공격적 승부'):b.swPct<=20?(isBat?'초구 지켜봄 → 초구 스트라이크 먼저':'초구 신중'):'초구 보통'); }
    if(k==='2S'&&b.chase!=null&&chaseAll!=null){ const dc=b.chase-chaseAll; if(dc>=10) m.push(isBat?`2S 체이스 ${dc.toFixed(0)}p↑ → 몰리면 유인구`:`2S 체이스 유도 ${dc.toFixed(0)}p↑`); else if(dc<=-10) m.push(isBat?'2S에도 존 지킴 → 유인구 비효율':'2S 유인구 잘 안 통함'); }
    if(k==='유리'&&b.ba!=null&&b.ab>=4&&self.ba!=null&&b.ba>=self.ba+0.06) m.push(isBat?'볼 앞서면 노림 → 빼기 금물':'볼 앞서면 공략당함');
    if(k==='불리'&&b.whPct!=null&&self.whPct!=null&&b.sw>=4&&b.whPct>=self.whPct+8) m.push(isBat?'몰리면 헛스윙↑':'몰아넣으면 헛스윙 유도');
    return m.join(' · ')||'<span style="color:var(--muted)">-</span>'; };
  const body=rows.map(([k,label])=>{ const b=ct[k]; if(!b||!b.seen) return '';
    const conf=wbdContext._atkConf(b); const low=conf.startsWith('낮음');
    return `<tr><td>${label}</td><td class="mono">${b.seen}</td><td class="mono">${b.ab}</td><td class="mono" style="font-weight:700">${b.ab>=3?wbdContext._slFmt3(b.ba):'<span style="color:var(--muted)">-</span>'}</td><td class="mono">${b.ab>=3&&b.slg!=null?b.slg.toFixed(3):'-'}</td><td class="mono">${b.swPct!=null?wbdContext._slPct(b.swPct):'-'}</td><td class="mono">${b.whPct!=null&&b.sw>=3?wbdContext._slPct(b.whPct):'-'}</td><td class="mono">${b.chase!=null?wbdContext._slPct(b.chase):'-'}</td><td><span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${low?'#f5a62322':'#39ff8a22'};color:${low?'#f5a623':'#39ff8a'}">${conf}</span></td><td style="font-size:11px">${memo(k,b)}</td></tr>`; }).join('');
  return `<div class="card section"><div class="card-title">🔢 카운트별 ${lbl} <span style="font-weight:400;font-size:10px;color:var(--muted)">· 본인 전체 ${wbdContext._slFmt3(self.ba)} / 체이스 ${chaseAll!=null?wbdContext._slPct(chaseAll):'-'} 대비</span></div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>상황</th><th>투구</th><th>타수</th><th>${lbl}</th><th>장타</th><th>스윙%</th><th>헛%</th><th>체이스%</th><th>표본</th><th>메모</th></tr></thead><tbody>${body}</tbody></table></div>
    <div style="font-size:9px;color:var(--muted);margin-top:4px">유리/불리는 타자 관점(볼&gt;스트=타자 유리). 타수는 그 카운트에서 타석이 끝난 수. 체이스=존 밖 스윙률. ${isBat?'초록=본인보다 약한 상황(공략처)':'초록=평소보다 잘 맞는 상황(노림)'} · 빨강=반대.</div></div>`;
};

// Original index.html:24843
wbdContext._dbGroup = function _dbGroup(name, mode){
  const d=wbdContext._dbData(name,mode);
  const by={};
  d.forEach(x=>{ const g=wbdContext.pitchGroup(x.pType,x); if(!g||g==='기타')return; (by[g]=by[g]||[]).push(x); });
  const isBat=mode==='batter'; const lbl=isBat?'타율':'피안타율';
  const rows=Object.entries(by).map(([g,arr])=>({g, s:wbdContext._h2hSlash(arr), n:arr.length})).filter(x=>x.s&&x.s.AB>=3).sort((a,b)=>b.n-a.n);
  if(!rows.length) return '';
  const body=rows.map(r=>{ const sp=by[r.g].filter(x=>+x.spdK>0).map(x=>+x.spdK); const lo=sp.length?Math.min(...sp):0,hi=sp.length?Math.max(...sp):0;
    const hot=isBat?r.s.ba>=0.35:r.s.ba<=0.22; const cold=isBat?r.s.ba<0.22:r.s.ba>=0.35;
    return `<tr><td>${wbdContext._esc(r.g)}</td><td class="mono">${r.s.AB}</td><td class="mono">${sp.length?lo.toFixed(0)+'~'+hi.toFixed(0):'-'}</td><td class="mono" style="color:${hot?'#ff4560':cold?'#39ff8a':'inherit'}">${wbdContext._slFmt3(r.s.ba)}</td><td class="mono">${wbdContext._slPct(r.s.whiffPct)}</td><td class="mono">${r.s.avgEV?r.s.avgEV.toFixed(0):'-'}</td></tr>`; }).join('');
  return `<div class="card section"><div class="card-title">🎿 구종 그룹별 ${isBat?'대응':'구사·피성적'}</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>구종</th><th>${isBat?'상대':'구사'}</th><th>구속</th><th>${lbl}</th><th>헛%</th><th>EV</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
};

// Original index.html:24857
wbdContext._dbSituational = function _dbSituational(name, mode){
  const d=wbdContext._dbData(name,mode);
  const isBat=mode==='batter';
  const handKey=isBat?'pHand':'bZone';
  const vsL=wbdContext._h2hSlash(d.filter(x=>String(x[handKey]).toUpperCase()==='L'));
  const vsR=wbdContext._h2hSlash(d.filter(x=>String(x[handKey]).toUpperCase()==='R'));
  const risp=wbdContext._h2hSlash(d.filter(x=>+x.b2===1||+x.b3===1));
  const recentG=[...new Set(d.map(x=>x._gameId))].slice(-5);
  const recent=wbdContext._h2hSlash(d.filter(x=>recentG.includes(x._gameId)));
  const lbl=isBat?'타율':'피안타율';
  const r=(nm,s)=>`<tr><td>${nm}</td><td class="mono">${s?(isBat?s.AB:s.AB):'-'}</td><td class="mono">${wbdContext._slFmt3(s&&s.ba)}</td><td class="mono">${s&&s.ops?s.ops.toFixed(3):'-'}</td></tr>`;
  return `<div class="card section"><div class="card-title">📐 상황별 (좌우·득점권·최근)</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>상황</th><th>${isBat?'타수':'상대'}</th><th>${lbl}</th><th>OPS</th></tr></thead><tbody>
    ${r(isBat?'vs 좌투':'vs 좌타', vsL)}
    ${r(isBat?'vs 우투':'vs 우타', vsR)}
    ${r('득점권(2·3루)', risp)}
    ${r('최근 5경기', recent)}
  </tbody></table></div><div style="font-size:9px;color:var(--muted);margin-top:6px">좌/우는 손잡이 결측 투구 제외라 합이 전체와 다를 수 있음.</div></div>`;
};

// Original index.html:24877
wbdContext._dbH2H = function _dbH2H(name, mode, excludeTeam){
  const d=wbdContext._dbData(name,mode);
  const isBat=mode==='batter';
  const oppKey=isBat?'pName':'bName';           // 타자 분석이면 상대는 투수
  const oppType=isBat?'pitcher':'batter';
  const by={};
  d.forEach(x=>{ const o=x[oppKey]; if(!o)return; (by[o]=by[o]||[]).push(x); });
  let rows=Object.entries(by).map(([o,arr])=>({o, team:wbdContext._playerTeam(o,oppType), s:wbdContext._h2hSlash(arr)})).filter(x=>x.s&&x.s.PA>=3);
  if(excludeTeam) rows=rows.filter(x=>x.team!==excludeTeam);
  if(!rows.length) return '';
  // 타자분석: 이 타자를 잘 막은(피안타율 낮은) 투수 순 / 투수분석: 이 투수를 잘 친(타율 높은) 타자 순
  rows.sort((a,b)=> isBat ? (a.s.ba||0)-(b.s.ba||0) : (b.s.ba||0)-(a.s.ba||0));
  const title=isBat?'🆚 이 타자를 상대한 투수들 (잘 막은 순)':'🆚 이 투수를 상대한 타자들 (잘 친 순)';
  const col3=isBat?'피안타율':'타율';
  const body=rows.slice(0,10).map(x=>`<tr><td style="font-weight:600">${wbdContext._esc(x.o)}</td><td style="font-size:10px;color:var(--muted)">${wbdContext._esc(x.team||'-')}</td><td class="mono">${x.s.PA}</td><td class="mono" style="color:${isBat?(x.s.ba<=0.25?'#39ff8a':x.s.ba>=0.4?'#ff4560':'inherit'):(x.s.ba>=0.4?'#39ff8a':'inherit')}">${wbdContext._slFmt3(x.s.ba)}</td><td class="mono">${x.s.ops.toFixed(3)}</td></tr>`).join('');
  return `<div class="card section"><div class="card-title">${title}</div><div class="tbl-wrap"><table class="data-table" style="font-size:12px"><thead><tr><th>${isBat?'투수':'타자'}</th><th>팀</th><th>${isBat?'타석':'타석'}</th><th>${col3}</th><th>OPS</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
};

// Original index.html:24896
wbdContext._dbSpray = function _dbSpray(name, mode){
  const d=wbdContext._dbData(name,mode);
  const pts=d.filter(x=>x.lz!=null&&(+x.lz!==0||+x.lx!==0)&&wbdContext._isInPlay(x));
  if(pts.length<4) return '';
  const isBat=mode==='batter';
  const dots=pts.map(x=>({lx:+x.lx,lz:+x.lz, color:wbdContext._isHit(x)?(+x.result===4?'#ffd700':(isBat?'#39ff8a':'#ff4560')):'#8090a0', r:2.6, op:0.82}));
  const svg=(typeof wbdContext._renderSprayField==='function')?wbdContext._renderSprayField(dots,{w:320,h:280,small:true}):'';
  return `<div class="card section"><div class="card-title">🗺️ 타구 방향·낙하 (스프레이)</div><div style="max-width:320px;margin:0 auto">${svg}</div><div style="font-size:9px;color:var(--muted);text-align:center;margin-top:6px">🟡홈런 ${isBat?'🟢안타':'🔴피안타'} ⚪아웃 · n=${pts.length}</div></div>`;
};

// Original index.html:24915
wbdContext._srPctTo80 = function _srPctTo80(p){ if(p==null||isNaN(p)) return null; return Math.max(20, Math.min(80, Math.round((20+p*0.6)/5)*5)); };

// Original index.html:24916
wbdContext._srGradeCol = function _srGradeCol(v){ return v==null?'#666': v>=70?'#ff4560': v>=60?'#ff8c44': v>=55?'#ffd700': v>=45?'#88ccff': v>=35?'#888':'#666'; };

// Original index.html:24917
wbdContext._srGradeWord = function _srGradeWord(v){ return v==null?'-': v>=70?'엘리트': v>=60?'플러스': v>=55?'평균 이상': v>=45?'평균': v>=35?'평균 이하':'약점'; };

// Original index.html:24918
wbdContext._srPct = function _srPct(v,d){ return v==null||isNaN(v)?'-':v.toFixed(d==null?0:d)+'%'; };

// Original index.html:24919
wbdContext._srF3 = function _srF3(v){ return v==null||isNaN(v)?'-':(v<1?'.':'')+(Math.round(v*1000)).toString().padStart(3,'0'); };

// Original index.html:24920
wbdContext._srStd = function _srStd(arr){ if(!arr||arr.length<2)return null; const m=arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((a,b)=>a+(b-m)*(b-m),0)/arr.length); };

// Original index.html:24926
wbdContext._stuffFeat = function _stuffFeat(x){ const g=wbdContext.pitchGroup(x.pType,x); if(!g||g==='기타') return null; const v=+x.spdK; const mv=(x.sH!=null&&x.sV!=null)?Math.abs(+x.sH)+Math.abs(+x.sV):NaN; if(!(v>0)||isNaN(mv)) return null; return {g,v,mv}; };

// Original index.html:24927
wbdContext._stuffTable = function _stuffTable(){
  const key=(typeof wbdContext._gameStatsKey==='function'?wbdContext._gameStatsKey():wbdContext.GAMES.length);
  if(window._stuffTabCache&&window._stuffTabCache._k===key) return window._stuffTabCache;
  const byG={};
  (window._cache.pitcherNames||[]).forEach(n=>{ wbdContext.getPitcherDataByName(n).forEach(x=>{ const f=wbdContext._stuffFeat(x); if(!f)return; const o=byG[f.g]=byG[f.g]||{v:[],mv:[],rows:[]}; o.v.push(f.v); o.mv.push(f.mv); o.rows.push(x); }); });
  const q=(arr,pc)=>{const t=[...arr].sort((a,b)=>a-b); return t[Math.min(t.length-1,Math.floor(t.length*pc))];};
  const tab={_k:key};
  for(const g in byG){ const o=byG[g]; if(o.rows.length<150) continue;   // 칸당 표본 확보 위해 구종 150구 이상만
    const vq=[q(o.v,1/3),q(o.v,2/3)], mq=[q(o.mv,1/3),q(o.mv,2/3)], cell={};
    o.rows.forEach(x=>{ const f=wbdContext._stuffFeat(x); const k=(f.v<vq[0]?0:f.v<vq[1]?1:2)+'_'+(f.mv<mq[0]?0:f.mv<mq[1]?1:2); const c=cell[k]=cell[k]||{sw:0,wh:0,n:0}; c.n++; if(wbdContext._isSwing(x)){c.sw++; if(wbdContext._isWhiff(x))c.wh++;} });
    for(const k in cell){ const c=cell[k]; c.whiff=c.sw>=20?c.wh/c.sw*100:null; }
    tab[g]={vq,mq,cell}; }
  return window._stuffTabCache=tab;
};

// Original index.html:24942
wbdContext._xWhiffArr = function _xWhiffArr(d){
  const tab=wbdContext._stuffTable(); let sum=0,n=0;
  d.forEach(x=>{ const f=wbdContext._stuffFeat(x); if(!f||!tab[f.g]) return; const t=tab[f.g]; const c=t.cell[(f.v<t.vq[0]?0:f.v<t.vq[1]?1:2)+'_'+(f.mv<t.mq[0]?0:f.mv<t.mq[1]?1:2)]; if(c&&c.whiff!=null){sum+=c.whiff;n++;} });
  return {x:n>=30?sum/n:null, n};
};

// Original index.html:24949
wbdContext._hittOf = function _hittOf(zonePct, xWhiff, prm){ if(zonePct==null||xWhiff==null||!prm) return null; return (zonePct-prm.zm)/(prm.zsd||1) - (xWhiff-prm.xm)/(prm.xsd||1); };

// Original index.html:24950
wbdContext._srPools = function _srPools(){
  const key=(typeof wbdContext._gameStatsKey==='function'?wbdContext._gameStatsKey():wbdContext.GAMES.length);
  if(window._srPoolCache&&window._srPoolCache._k===key) return window._srPoolCache;
  const B={contact:[],brkBA:[],fbBA:[],k2Pct:[],rispBA:[],bbPct:[],kPct:[],gbPct:[],pullPct:[],ldPct:[],batSpd:[],zSw:[],chase:[],ba:[],slg:[],iso:[],ev:[],hh:[],brl:[],evMax:[],zCon:[],ev90:[],swPct:[],fpSw:[],farChase:[],fbBrkGap:[],s2Chase:[]};
  (window._cache.batterNames||[]).forEach(n=>{ const d=wbdContext.getBatterDataByName(n); if(d.length<60)return; const s=wbdContext._h2hSlash(d); if(!s||s.AB<20)return;
    const sw=d.filter(wbdContext._isSwing).length, wh=d.filter(wbdContext._isWhiff).length; if(sw>=15) B.contact.push((sw-wh)/sw*100);
    const ps=wbdContext._atkPitchStats(n,'batter'); if(ps.brk&&ps.brk.ab>=8) B.brkBA.push(ps.brk.ba); if(ps.fb&&ps.fb.ab>=8) B.fbBA.push(ps.fb.ba);
    const k2=wbdContext._atk2S(n,'batter'); if(k2.kPct!=null&&k2.n>=15) B.k2Pct.push(k2.kPct);
    const r=wbdContext._atkBucket(d.filter(x=>+x.b2===1||+x.b3===1)); if(r.ab>=8&&r.ba!=null) B.rispBA.push(r.ba);
    B.bbPct.push(s.bbPct); B.kPct.push(s.kPct); B.ba.push(s.ba); B.slg.push(s.slg); B.iso.push(s.slg-s.ba);
    const bd=d.filter(wbdContext._isInPlay); if(bd.length>=10){ const t=bd.map(wbdContext._battedType).filter(Boolean); if(t.length>=8){B.gbPct.push(t.filter(x=>x==='땅볼').length/t.length*100); B.ldPct.push(t.filter(x=>x==='라인').length/t.length*100);}
      B.ev.push(bd.reduce((a,x)=>a+(+x.ev),0)/bd.length); B.evMax.push(Math.max(...bd.map(x=>+x.ev))); { const ev=bd.map(x=>+x.ev).sort((a,b)=>a-b); B.ev90.push(ev[Math.min(ev.length-1,Math.floor(ev.length*0.9))]); } B.hh.push(bd.filter(x=>+x.ev>=110).length/bd.length*100); B.brl.push(bd.filter(x=>+x.ev>=105&&+x.ldeg>=8&&+x.ldeg<=32).length/bd.length*100);
      const hand=String(d[0]&&d[0].bZone||'').toUpperCase(); const ps2=hand==='L'?'right':'left'; const ipd=bd.filter(x=>!isNaN(+x.sdeg)); if(ipd.length>=8) B.pullPct.push(ipd.filter(x=>wbdContext._fieldSide(x)===ps2).length/ipd.length*100); }
    const bs=d.filter(x=>+x.batSpd>0&&wbdContext._isSwing(x)).map(x=>+x.batSpd); if(bs.length>=8) B.batSpd.push(bs.reduce((a,b)=>a+b,0)/bs.length);
    const inz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}), oz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;});
    if(inz.length>=15) B.zSw.push(inz.filter(wbdContext._isSwing).length/inz.length*100); if(oz.length>=15) B.chase.push(oz.filter(wbdContext._isSwing).length/oz.length*100);
    { const zs=inz.filter(wbdContext._isSwing); if(zs.length>=12) B.zCon.push(zs.filter(x=>!wbdContext._isWhiff(x)).length/zs.length*100); }
    // V12.0 유형 프로파일용 분포: 전체 스윙률·초구 스윙률·먼 볼 체이스·직구/변화구 존 스윙 격차·2S 체이스
    B.swPct.push(sw/d.length*100); { const fp=d.filter(x=>+x.ball===0&&+x.strk===0); if(fp.length>=10) B.fpSw.push(fp.filter(wbdContext._isSwing).length/fp.length*100); }
    { const far=d.filter(x=>{const zx=+x.zoneX,zy=+x.zoneY;return !isNaN(zx)&&(Math.abs(zx)>1.6||Math.abs(zy)>1.6);}); if(far.length>=10) B.farChase.push(far.filter(wbdContext._isSwing).length/far.length*100); }
    { const fi=inz.filter(x=>wbdContext._atkPitchClass(x)==='직구'), bi=inz.filter(x=>wbdContext._atkPitchClass(x)==='변화구'); if(fi.length>=10&&bi.length>=10) B.fbBrkGap.push(fi.filter(wbdContext._isSwing).length/fi.length*100-bi.filter(wbdContext._isSwing).length/bi.length*100); }
    { const o2=oz.filter(x=>+x.strk===2); if(o2.length>=8) B.s2Chase.push(o2.filter(wbdContext._isSwing).length/o2.length*100); } });
  const P={zonePct:[],fStrike:[],bbPct:[],kPct:[],whiff:[],baa:[],slgA:[],fbVelo:[],fbVeloMax:[],rispBAA:[],mixEnt:[],k9:[],era:[],whip:[],hhA:[],gbA:[],mov:[],edge:[],mid:[],xWhiff:[],hitt:[],far:[],strikePct:[],ozPct:[],fbPct:[],twoSBrk:[]}; const _hp=[];
  (window._cache.pitcherNames||[]).forEach(n=>{ const d=wbdContext.getPitcherDataByName(n); if(d.length<80)return; const s=wbdContext._h2hSlash(d); if(!s||s.AB<25)return;
    const inzArr=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}); const inz=inzArr.length, loc=d.filter(x=>wbdContext._atkLoc(x)).length; if(loc>=40) P.zonePct.push(inz/loc*100);
    const xw=wbdContext._xWhiffArr(d); if(xw.x!=null){ P.xWhiff.push(xw.x); if(loc>=40) _hp.push({z:inz/loc*100, x:xw.x}); }
    if(inz>=25){ const edge=inzArr.filter(x=>{const L=wbdContext._atkLoc(x);return !(L.row==='중간'&&L.col==='가운데');}).length; P.edge.push(edge/inz*100); }
    if(loc>=40){ const midN=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone&&L.row==='중간'&&L.col==='가운데';}).length; P.mid.push(midN/loc*100);
      const farN=d.filter(x=>{const L=wbdContext._atkLoc(x); return L&&(Math.abs(+x.zoneX)>1.7||Math.abs(+x.zoneY)>1.7);}).length; P.far.push(farN/loc*100); P.ozPct.push(100-inz/loc*100); }
    if(d.length>=40){ P.strikePct.push(d.filter(x=>+x.call===0||wbdContext._isSwing(x)||(+x.ev>0&&+x.result!==3)).length/d.length*100); const fbN=d.filter(x=>wbdContext._atkPitchClass(x)==='직구').length; P.fbPct.push(fbN/d.length*100); const s2=d.filter(x=>+x.strk===2); if(s2.length>=15) P.twoSBrk.push(s2.filter(x=>wbdContext._atkPitchClass(x)==='변화구').length/s2.length*100); }
    const fp=d.filter(x=>+x.ball===0&&+x.strk===0); if(fp.length>=12) P.fStrike.push(fp.filter(x=>+x.call===0||wbdContext._isSwing(x)||(+x.result>=1&&+x.result<=4)).length/fp.length*100);
    P.bbPct.push(s.bbPct); P.kPct.push(s.kPct); P.baa.push(s.ba); P.slgA.push(s.slg);
    const sw=d.filter(wbdContext._isSwing).length, wh=d.filter(wbdContext._isWhiff).length; if(sw>=20) P.whiff.push(wh/sw*100);
    const fv=d.filter(x=>wbdContext._atkPitchClass(x)==='직구'&&+x.spdK>0).map(x=>+x.spdK); if(fv.length>=15){P.fbVelo.push(fv.reduce((a,b)=>a+b,0)/fv.length); P.fbVeloMax.push(Math.max(...fv));}
    const r=wbdContext._atkBucket(d.filter(x=>+x.b2===1||+x.b3===1)); if(r.ab>=8&&r.ba!=null) P.rispBAA.push(r.ba);
    const se=wbdContext._getPitcherSeason(n); if(se&&se.ip>=5){P.k9.push(se.ip>0?se.ks/se.ip*9:0); P.era.push(se.era); P.whip.push(se.whip);}
    const bd=d.filter(wbdContext._isInPlay); if(bd.length>=10){ P.hhA.push(bd.filter(x=>+x.ev>=110).length/bd.length*100); const t=bd.map(wbdContext._battedType).filter(Boolean); if(t.length>=8)P.gbA.push(t.filter(x=>x==='땅볼').length/t.length*100); }
    const mv=d.filter(x=>x.sH!=null&&x.sV!=null).map(x=>Math.abs(+x.sH)+Math.abs(+x.sV)); if(mv.length>=15) P.mov.push(mv.reduce((a,b)=>a+b,0)/mv.length);
    const grp={}; d.forEach(x=>{const g=wbdContext.pitchGroup(x.pType,x); if(g&&g!=='기타')grp[g]=(grp[g]||0)+1;}); const tot=Object.values(grp).reduce((a,b)=>a+b,0); if(tot>=40){ let e=0; Object.values(grp).forEach(c=>{const p=c/tot; e-=p*Math.log2(p);}); P.mixEnt.push(e);} });
  // 피안타 허용 경향 복합지표 파라미터(z-score용) + 풀
  if(_hp.length>=5){ const zm=wbdContext._srMean(_hp.map(o=>o.z)), xm=wbdContext._srMean(_hp.map(o=>o.x)); const zsd=wbdContext._srStd(_hp.map(o=>o.z))||1, xsd=wbdContext._srStd(_hp.map(o=>o.x))||1; P._hittPrm={zm,zsd,xm,xsd}; _hp.forEach(o=>P.hitt.push(wbdContext._hittOf(o.z,o.x,P._hittPrm))); }
  return window._srPoolCache={_k:key,B,P};
};

// Original index.html:24994
wbdContext._srShrink = function _srShrink(v, n, m, k){ if(v==null||isNaN(v)||m==null) return v; n=Math.max(0,+n||0); return (n*v + k*m)/(n+k); };

// Original index.html:24995
wbdContext._srMean = function _srMean(arr){ const xs=(arr||[]).filter(x=>x!=null&&!isNaN(x)); return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null; };

// Original index.html:24996
wbdContext._srPctile = function _srPctile(v, arr, lowerBetter){ if(v==null||isNaN(v)||!arr||arr.length<6) return null; let below=0; arr.forEach(x=>{if(x<v)below++;}); let p=below/arr.length*100; return lowerBetter?100-p:p; };

// Original index.html:24997
wbdContext._srGrade = function _srGrade(v, arr, lowerBetter){ return wbdContext._srPctTo80(wbdContext._srPctile(v,arr,lowerBetter)); };

// Original index.html:25000
wbdContext._srBatterDossier = function _srBatterDossier(name){ return wbdContext._memoByGame('_srBatterDossier', name, ()=>wbdContext._srBatterDossier__raw(name)); };

// Original index.html:25001
wbdContext._srBatterDossier__raw = function _srBatterDossier__raw(name){
  const d=wbdContext.getBatterDataByName(name); if(d.length<20) return null;
  const s=wbdContext._h2hSlash(d)||{}; const pools=wbdContext._srPools().B;
  const sw=d.filter(wbdContext._isSwing).length, wh=d.filter(wbdContext._isWhiff).length;
  const contact=sw?(sw-wh)/sw*100:null;
  const ps=wbdContext._atkPitchStats(name,'batter'), ct=wbdContext._atkCountStats(name,'batter'), k2=wbdContext._atk2S(name,'batter');
  const inz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}), oz=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&!L.inZone;});
  const zSw=inz.length?inz.filter(wbdContext._isSwing).length/inz.length*100:null, chase=oz.length?oz.filter(wbdContext._isSwing).length/oz.length*100:null;
  const fpSw=ct['초구'].swPct;
  const bd=d.filter(wbdContext._isInPlay); const evAvg=bd.length?bd.reduce((a,x)=>a+(+x.ev),0)/bd.length:null, evMax=bd.length?Math.max(...bd.map(x=>+x.ev)):null;
  const laArr=bd.filter(x=>x.ldeg!=null&&!isNaN(+x.ldeg)); const laAvg=laArr.length?laArr.reduce((a,x)=>a+(+x.ldeg),0)/laArr.length:null;
  const hh=bd.length?bd.filter(x=>+x.ev>=110).length/bd.length*100:null, brl=bd.length?bd.filter(x=>+x.ev>=105&&+x.ldeg>=8&&+x.ldeg<=32).length/bd.length*100:null;
  const types=bd.map(wbdContext._battedType).filter(Boolean); const tN=types.length||1;
  const gb=types.filter(x=>x==='땅볼').length/tN*100, ld=types.filter(x=>x==='라인').length/tN*100, fb=types.filter(x=>x==='뜬공').length/tN*100;
  const hand=String(d[0]&&d[0].bZone||'').toUpperCase(); const pullSide=hand==='L'?'right':'left';
  const ipd=bd.filter(x=>!isNaN(+x.sdeg)); const pull=ipd.length?ipd.filter(x=>wbdContext._fieldSide(x)===pullSide).length/ipd.length*100:null, cen=ipd.length?ipd.filter(x=>wbdContext._fieldSide(x)==='center').length/ipd.length*100:null, oppo=pull!=null?100-pull-cen:null;
  const bs=d.filter(x=>+x.batSpd>0&&wbdContext._isSwing(x)).map(x=>+x.batSpd); const batSpd=bs.length?bs.reduce((a,b)=>a+b,0)/bs.length:null;
  const risp=wbdContext._atkBucket(d.filter(x=>+x.b2===1||+x.b3===1)), empty=wbdContext._atkBucket(d.filter(x=>!(+x.b1===1||+x.b2===1||+x.b3===1)));
  const vsL=wbdContext._atkBucket(d.filter(x=>String(x.pHand).toUpperCase()==='L')), vsR=wbdContext._atkBucket(d.filter(x=>String(x.pHand).toUpperCase()==='R'));
  const fbHR=bd.filter(x=>+x.result===4).length, fbN=types.filter(x=>x==='뜬공').length; const hrFb=fbN?fbHR/fbN*100:null;
  // 경기별 기복
  const byG={}; d.forEach(x=>{(byG[x._gameId]=byG[x._gameId]||[]).push(x);});
  const gBAs=Object.values(byG).map(a=>wbdContext._h2hSlash(a)).filter(g=>g&&g.AB>=3).map(g=>g.ba); const gStd=wbdContext._srStd(gBAs);
  const recentG=[...new Set(d.map(x=>x._gameId))].slice(-5); const recent=wbdContext._h2hSlash(d.filter(x=>recentG.includes(x._gameId)));
  let xba=null; try{ const xo=wbdContext.getXOutData().bat[name]||wbdContext.getXOutData().bat[wbdContext._canonPlayer(name)]; if(xo&&xo.bip>0) xba=xo.xHits/xo.bip; }catch(e){}
  const bipBA=(()=>{const h=bd.filter(x=>wbdContext._isHit(x)&&+x.result!==4).length; const n=bd.filter(x=>+x.result!==4).length; return n?h/n:null;})();

  // ── 툴 등급 (20-80, 리그 백분위) — V12 검증 기반 재정의
  //   split-half 신뢰도(r): 배트스피드 .79 · 체이스 .70 · EV .69 · 컨택률 .68 · K% .53 · 하드히트 .50 · 배럴 .46  ← 툴에 사용
  //                      타율 .21 · ISO .24 · 볼넷 .23 · 변화구대응 .14 · 득점권 -.16  ← 단독 등급 부적합(수축·블렌드 또는 제외)
  const T=[];
  const tool=(key,label,val,pool,lower,fmt,note)=>{ const g=wbdContext._srGrade(val,pool,lower); const p=wbdContext._srPctile(val,pool,lower); T.push({key,label,grade:g,pct:p,val:fmt(val),note}); };
  const blend=(key,label,parts,note)=>{ const ok=parts.map(q=>({p:wbdContext._srPctile(q.val,q.pool,q.lower),w:q.w})).filter(q=>q.p!=null); if(!ok.length){T.push({key,label,grade:null,pct:null,val:'-',note}); return;}
    const ws=ok.reduce((a,q)=>a+q.w,0); const pct=ok.reduce((a,q)=>a+q.p*q.w,0)/ws; T.push({key,label,grade:wbdContext._srPctTo80(pct),pct,val:'',note}); };
  const baS=wbdContext._srShrink(s.ba, s.AB, wbdContext._srMean(pools.ba), 60);          // 타율: 60타수 수축
  const isoS=wbdContext._srShrink((s.slg||0)-(s.ba||0), s.AB, wbdContext._srMean(pools.iso), 60);
  // V12.0 재검증(z-합성, 홀/짝 경기): 타격=EV .3+하드히트 .25+존 컨택 .2+수축타율 .25 → 반복성 .60→.66, 다음 반기 타율 예측 .43→.54
  const zSwA=inz.filter(wbdContext._isSwing); const zCon=zSwA.length>=12?zSwA.filter(x=>!wbdContext._isWhiff(x)).length/zSwA.length*100:null;
  const ev90=(()=>{ if(bd.length<10) return null; const ev=bd.map(x=>+x.ev).sort((a,b)=>a-b); return ev[Math.min(ev.length-1,Math.floor(ev.length*0.9))]; })();
  blend('hit','타격 (Hit)',[{val:evAvg,pool:pools.ev,lower:false,w:.3},{val:hh,pool:pools.hh,lower:false,w:.25},{val:zCon,pool:pools.zCon,lower:false,w:.2},{val:baS,pool:pools.ba,lower:false,w:.25}],`타율 ${wbdContext._srF3(s.ba)}(수축 ${wbdContext._srF3(baS)}) · EV ${evAvg?evAvg.toFixed(0):'-'} · 하드히트 ${wbdContext._srPct(hh)} · 존 안 컨택 ${wbdContext._srPct(zCon)} — 이 리그 타율은 강한 타구가 좌우(타율 자체는 반복성 .2라 보조)`);
  // 파워=EV .3+하드히트 .25+EV 상위10% .2+최고EV .15+배럴 .1 → 반복성 .68→.74, 다음 반기 OPS 예측 .54→.60 (ISO는 반복성 .34라 제외)
  blend('power','파워 (Power)',[{val:evAvg,pool:pools.ev,lower:false,w:.3},{val:hh,pool:pools.hh,lower:false,w:.25},{val:ev90,pool:pools.ev90,lower:false,w:.2},{val:evMax,pool:pools.evMax,lower:false,w:.15},{val:brl,pool:pools.brl,lower:false,w:.1}],`EV ${evAvg?evAvg.toFixed(0):'-'} (상위10% ${ev90?ev90.toFixed(0):'-'} · 최고 ${evMax?evMax.toFixed(0):'-'}) · 하드히트 ${wbdContext._srPct(hh)} · 배럴 ${wbdContext._srPct(brl)} · ISO ${wbdContext._srF3((s.slg||0)-(s.ba||0))}(참고)`);
  tool('contact','컨택률 (Contact)',contact,pools.contact,false,v=>wbdContext._srPct(v),`스윙 대비 컨택 ${wbdContext._srPct(contact)} · 헛스윙 ${wbdContext._srPct(100-(contact||0))}`);
  blend('eye','선구안 (Eye)',[{val:chase,pool:pools.chase,lower:true,w:.85},{val:s.bbPct,pool:pools.bbPct,lower:false,w:.15}],`존 밖 스윙 ${wbdContext._srPct(chase)} · 존 안 스윙 ${wbdContext._srPct(zSw)} · 볼넷율 ${wbdContext._srPct(s.bbPct)}`);
  // 삼진 회피=K% .4+컨택 .3+존 컨택 .3 → 반복성 .49→.57, 다음 반기 K% 예측 .49→.55
  blend('kav','삼진 회피 (K)',[{val:s.kPct,pool:pools.kPct,lower:true,w:.4},{val:contact,pool:pools.contact,lower:false,w:.3},{val:zCon,pool:pools.zCon,lower:false,w:.3}],`삼진율 ${wbdContext._srPct(s.kPct)}${k2.n>=15?` · 2S 삼진율 ${wbdContext._srPct(k2.kPct)}`:''} · 존 안 컨택 ${wbdContext._srPct(zCon)}`);
  if(batSpd!=null) tool('swing','스윙 스피드',batSpd,pools.batSpd,false,v=>v.toFixed(0),`평균 배트 스피드 ${batSpd.toFixed(0)} · EV ${evAvg?evAvg.toFixed(0):'-'}`);
  const valid=T.filter(t=>t.grade!=null);
  const w={hit:.35,power:.25,contact:.15,eye:.15,kav:.1,swing:0};
  const ofp=valid.length?Math.round(valid.reduce((a,t)=>a+t.grade*(w[t.key]||0.05),0)/valid.reduce((a,t)=>a+(w[t.key]||0.05),0)/5)*5:null;

  // ── 어프로치 서사 ──
  const app=[];
  const pc=wbdContext._srPctile(chase,pools.chase,true), pz=wbdContext._srPctile(zSw,pools.zSw,false), pf=null;
  app.push(`존 안 스윙 ${wbdContext._srPct(zSw)} / 존 밖 스윙 ${wbdContext._srPct(chase)}${pc!=null?` (선구안 리그 ${pc>=50?'상위':'하위'} ${pc>=50?100-Math.round(pc):Math.round(pc)}%)`:''}.`);
  if(fpSw!=null) app.push(`초구 스윙 ${wbdContext._srPct(fpSw)}${fpSw>=50?' — 초구부터 적극':fpSw<=25?' — 초구는 지켜보는 편':''}${ct['초구'].ba!=null&&ct['초구'].ab>=5?`, 초구 타율 ${wbdContext._srF3(ct['초구'].ba)}`:''}.`);
  if(k2.n>=15) app.push(`2스트라이크에서 ${k2.kPct>=35?`삼진율 ${wbdContext._srPct(k2.kPct)}로 취약`:k2.kPct<=15?`삼진율 ${wbdContext._srPct(k2.kPct)}로 커트·컨택 능력 우수`:`삼진율 ${wbdContext._srPct(k2.kPct)}`}${ct['2S'].chase!=null&&chase!=null&&ct['2S'].chase>=chase+10?`, 몰리면 존 밖 추격 급증(${wbdContext._srPct(ct['2S'].chase)})`:''}.`);
  if(ct['유리'].ab>=6&&ct['유리'].ba!=null){ const fa=ct['유리'].ba, be=ct['불리'].ba; const tag= (be!=null&&ct['불리'].ab>=6)? (fa-be>=0.08?' — 유리할 때 확실히 때리고 몰리면 약해짐':be-fa>=0.08?' — 몰려도 안 죽는 타자(카운트 무관)':' — 카운트 무관하게 꾸준') : '';
    app.push(`볼 앞선 카운트 ${wbdContext._srF3(fa)} / 몰린 카운트 ${wbdContext._srF3(be)}${tag}.`); }
  app.push(`BB% ${wbdContext._srPct(s.bbPct)} / K% ${wbdContext._srPct(s.kPct)}${s.bbPct!=null&&s.kPct!=null?(s.bbPct>=s.kPct?' — 볼넷이 삼진보다 많은 출루형':s.kPct>=s.bbPct*3?' — 삼진 많은 프리스윙어':''):''}.`);

  // ── 타구 서사 ──
  const bb=[];
  const typeWord= ld>=30?'라인드라이브형': gb>=50?'땅볼형': fb>=45?'플라이볼형':'균형형';
  const dirWord= pull!=null?(pull>=55?'당겨치기 위주':pull<=30?'밀어치기 위주':'좌우 고른 분포'):'';
  bb.push(`${typeWord}${dirWord?' · '+dirWord:''} — 땅볼 ${wbdContext._srPct(gb)} / 라인 ${wbdContext._srPct(ld)} / 뜬공 ${wbdContext._srPct(fb)}${pull!=null?`, 당김 ${wbdContext._srPct(pull)} · 중앙 ${wbdContext._srPct(cen)} · 반대 ${wbdContext._srPct(oppo)}`:''}.`);
  bb.push(`평균 EV ${evAvg?evAvg.toFixed(1):'-'} (최고 ${evMax?evMax.toFixed(0):'-'}) · 발사각 ${laAvg!=null?laAvg.toFixed(1)+'°':'-'} · 하드히트 ${wbdContext._srPct(hh)} · 배럴 ${wbdContext._srPct(brl)}${hrFb!=null&&fbN>=8?` · HR/FB ${wbdContext._srPct(hrFb)}`:''}.`);
  const pev=wbdContext._srPctile(evAvg,pools.ev,false); if(pev!=null) bb.push(pev>=75?'타구 질은 리그 최상위권 — 맞으면 위협적.':pev<=25?'타구 질은 리그 하위권 — 컨택은 되나 강하게 못 때림.':'타구 질 리그 평균권.');

  // ── 상황별 표 데이터 ──
  const sit=[['주자 없음',empty],['득점권(2·3루)',risp],['vs 좌투',vsL],['vs 우투',vsR],['유리 카운트',ct['유리']],['동일',ct['동일']],['2스트라이크',ct['2S']]].map(([l,b])=>({l,ab:b.ab,ba:b.ba,slg:b.slg,wh:b.whPct,ev:b.ev}));
  if(recent) sit.push({l:'최근 5경기',ab:recent.AB,ba:recent.ba,slg:recent.slg,wh:recent.whiffPct,ev:recent.avgEV});

  // ── 리스크 ──
  const risk=[];
  if(gStd!=null) risk.push({lvl:gStd>=0.22?'high':gStd>=0.15?'mid':'low', t:`경기별 타율 표준편차 ${wbdContext._srF3(gStd)} (${gBAs.length}경기) — ${gStd>=0.22?'기복 큼':gStd>=0.15?'보통':'꾸준함'}`});
  if(xba!=null&&bipBA!=null){ const dlt=bipBA-xba; if(Math.abs(dlt)>=0.03) risk.push({lvl:dlt>0?'mid':'low', t:`인플레이 타율 ${wbdContext._srF3(bipBA)} vs 기대 ${wbdContext._srF3(xba)} — ${dlt>0?'운이 따른 편, 회귀 가능성':'불운, 반등 여지'}`}); }
  if(vsL.ab>=8&&vsR.ab>=8&&vsL.ba!=null&&vsR.ba!=null&&Math.abs(vsL.ba-vsR.ba)>=0.1) risk.push({lvl:'mid', t:`플래툰 편차 큼 — vs 좌투 ${wbdContext._srF3(vsL.ba)} / vs 우투 ${wbdContext._srF3(vsR.ba)}`});
  if(s.AB<60) risk.push({lvl:'mid', t:`표본 ${s.AB}타수 — 등급 신뢰도 제한적`});
  if(!risk.length) risk.push({lvl:'low', t:'특이 리스크 없음 — 표본·기복·플래툰 모두 안정'});

  return {name, hand, s, T, ofp, app, bb, sit, risk, contact, chase, zSw, fpSw, k2, gb, ld, fb, pull, cen, oppo, evAvg, evMax, laAvg, hh, brl, batSpd, gStd, xba, bipBA, recent};
};

// Original index.html:25086
wbdContext._srPitcherDossier = function _srPitcherDossier(name){ return wbdContext._memoByGame('_srPitcherDossier', name, ()=>wbdContext._srPitcherDossier__raw(name)); };

// Original index.html:25087
wbdContext._srPitcherDossier__raw = function _srPitcherDossier__raw(name){
  const d=wbdContext.getPitcherDataByName(name); if(d.length<30) return null;
  const s=wbdContext._h2hSlash(d)||{}; const se=wbdContext._getPitcherSeason(name)||{}; const pools=wbdContext._srPools().P;
  const ps=wbdContext._atkPitchStats(name,'pitcher'); const tot=d.length||1;
  const locN=d.filter(x=>wbdContext._atkLoc(x)).length, inzN=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}).length; const zonePct=locN?inzN/locN*100:null;
  const fp=d.filter(x=>+x.ball===0&&+x.strk===0); const fStrike=fp.length?fp.filter(x=>+x.call===0||wbdContext._isSwing(x)||(+x.result>=1&&+x.result<=4)).length/fp.length*100:null;
  const sw=d.filter(wbdContext._isSwing).length, wh=d.filter(wbdContext._isWhiff).length; const whiff=sw?wh/sw*100:null;
  const fv=d.filter(x=>wbdContext._atkPitchClass(x)==='직구'&&+x.spdK>0).map(x=>+x.spdK); const fbVelo=fv.length?fv.reduce((a,b)=>a+b,0)/fv.length:null, fbMax=fv.length?Math.max(...fv):null;
  const mid=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone&&L.row==='중간'&&L.col==='가운데';}).length; const midPct=locN?mid/locN*100:null;
  const bd=d.filter(wbdContext._isInPlay); const hhA=bd.length?bd.filter(x=>+x.ev>=110).length/bd.length*100:null; const types=bd.map(wbdContext._battedType).filter(Boolean); const gbA=types.length?types.filter(x=>x==='땅볼').length/types.length*100:null;
  const risp=wbdContext._atkBucket(d.filter(x=>+x.b2===1||+x.b3===1)), onB=wbdContext._atkBucket(d.filter(x=>+x.b1===1||+x.b2===1||+x.b3===1)), empty=wbdContext._atkBucket(d.filter(x=>!(+x.b1===1||+x.b2===1||+x.b3===1)));
  const vsL=wbdContext._atkBucket(d.filter(x=>String(x.bZone).toUpperCase()==='L')), vsR=wbdContext._atkBucket(d.filter(x=>String(x.bZone).toUpperCase()==='R'));
  const k9=se.ip>0?se.ks/se.ip*9:null;
  // 레퍼토리
  const grp={}; d.forEach(x=>{const g=wbdContext.pitchGroup(x.pType,x); if(g&&g!=='기타')(grp[g]=grp[g]||[]).push(x);});
  const rep=Object.entries(grp).map(([g,a])=>{ const b=wbdContext._atkBucket(a); const sp=a.filter(x=>+x.spdK>0).map(x=>+x.spdK); const mv=a.filter(x=>x.sH!=null&&x.sV!=null);
    const inz=a.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}).length, lc=a.filter(x=>wbdContext._atkLoc(x)).length;
    const fpU=a.filter(x=>+x.ball===0&&+x.strk===0).length, k2U=a.filter(x=>+x.strk===2).length;
    return {g, n:a.length, pct:a.length/tot*100, velo:sp.length?sp.reduce((x,y)=>x+y,0)/sp.length:null, veloMax:sp.length?Math.max(...sp):null,
      sH:mv.length?mv.reduce((x,y)=>x+(+y.sH),0)/mv.length:null, sV:mv.length?mv.reduce((x,y)=>x+(+y.sV),0)/mv.length:null,
      zone:lc?inz/lc*100:null, whiff:b.whPct, baa:b.ba, slg:b.slg, ab:b.ab, fpUse:fp.length?fpU/fp.length*100:null, k2Use:(()=>{const n2=d.filter(x=>+x.strk===2).length;return n2?k2U/n2*100:null;})()}; }).sort((a,b)=>b.n-a.n);
  // 시퀀싱 (카운트별 구종) + 예측가능성
  const byCt={초구:{},유리:{},동일:{},불리:{},'2S':{}}, ctN={초구:0,유리:0,동일:0,불리:0,'2S':0};
  d.forEach(x=>{ const c=wbdContext._atkCountState(x); const g=wbdContext.pitchGroup(x.pType,x); if(!g||g==='기타'||!byCt[c])return; byCt[c][g]=(byCt[c][g]||0)+1; ctN[c]++; });
  const seqRows=Object.keys(byCt).map(c=>{ const e=Object.entries(byCt[c]).sort((a,b)=>b[1]-a[1]); return {c, n:ctN[c], top:e.slice(0,3).map(([g,n])=>({g,pct:n/ctN[c]*100}))}; });
  const predict=(()=>{ const rows=seqRows.filter(r=>r.n>=8&&r.top[0]); if(!rows.length)return null; return rows.reduce((a,r)=>a+r.top[0].pct,0)/rows.length; })();
  let ent=null; { const cnt={}; d.forEach(x=>{const g=wbdContext.pitchGroup(x.pType,x); if(g&&g!=='기타')cnt[g]=(cnt[g]||0)+1;}); const t=Object.values(cnt).reduce((a,b)=>a+b,0); if(t){ ent=0; Object.values(cnt).forEach(c=>{const p=c/t; ent-=p*Math.log2(p);}); } }
  // 스태미너: 경기 내 투구수 구간 / 이닝 구간
  const byG={}; d.forEach(x=>{(byG[x._gameId]=byG[x._gameId]||[]).push(x);});
  const pcB={'1~25구':[],'26~50구':[],'51~75구':[],'76구+':[]}; const innB={'1~2회':[],'3~4회':[],'5회+':[]};
  Object.values(byG).forEach(a=>{ a.forEach((x,i)=>{ const n=i+1; const k=n<=25?'1~25구':n<=50?'26~50구':n<=75?'51~75구':'76구+'; pcB[k].push(x); const inn=+x.inn; const ik=inn<=2?'1~2회':inn<=4?'3~4회':'5회+'; innB[ik].push(x); }); });
  const stam=o=>Object.entries(o).map(([k,a])=>{ const b=wbdContext._atkBucket(a); const sp=a.filter(x=>wbdContext._atkPitchClass(x)==='직구'&&+x.spdK>0).map(x=>+x.spdK); return {k,n:a.length,baa:b.ba,ab:b.ab,whiff:b.whPct,velo:sp.length?sp.reduce((x,y)=>x+y,0)/sp.length:null,bb:(()=>{const pa=wbdContext._countPaEnd(a).length;return pa?a.filter(x=>+x.result===5).length/pa*100:null;})()}; });
  const stamPC=stam(pcB), stamInn=stam(innB);
  const gamesN=Object.keys(byG).length; const avgPC=gamesN?d.length/gamesN:null;
  // 경기별 기복(피안타율)
  const gBAs=Object.values(byG).map(a=>wbdContext._h2hSlash(a)).filter(g=>g&&g.AB>=4).map(g=>g.ba); const gStd=wbdContext._srStd(gBAs);

  // ── 등급 — V12 검증 기반 재정의 (구속·무브는 기존 리포트 등급 재사용)
  //   split-half 신뢰도(r): 구속 .91 · 존투구율 .51 · 실투율 .35 · 피장타 .31 · 초구S .26 · 헛스윙 .25 · 구석 .22 · K% .22
  //                      볼넷 .03 · 피하드히트 -.14 · 득점권 -.14 ← 노이즈, 툴에서 제외
  //   V12.0: 구위=기대 헛스윙(Stuff+ 방식, r .74), 피안타 억제=기대 허용 경향 75%+실제 25% (r .69). 툴 등급 반복성: 구속 .91 무브 .84 구위 .74 억제 .69 제구 .45 커맨드 .31, OFP .78
  //   결과 상관(vs 피안타율): 헛스윙 -.49 · 존투구율 +.46(!) · 실투 +.38 · 구석 -.26 — 이 리그는 존에 많이 넣을수록 맞음(타고)
  const T=[];
  const tool=(key,label,val,pool,lower,fmt,note)=>{ const g=wbdContext._srGrade(val,pool,lower); const p=wbdContext._srPctile(val,pool,lower); T.push({key,label,grade:g,pct:p,val:fmt(val),note}); };
  const blend=(key,label,parts,note)=>{ const ok=parts.map(q=>({p:wbdContext._srPctile(q.val,q.pool,q.lower),w:q.w})).filter(q=>q.p!=null); if(!ok.length){T.push({key,label,grade:null,pct:null,val:'-',note}); return;}
    const ws=ok.reduce((a,q)=>a+q.w,0); const pct=ok.reduce((a,q)=>a+q.p*q.w,0)/ws; T.push({key,label,grade:wbdContext._srPctTo80(pct),pct,val:'',note}); };
  let rep0=null; try{ rep0=wbdContext._generateScoutReportPitcher(wbdContext._scoutCollectPitcher(name)); }catch(e){}
  const rg=k=>rep0&&rep0.grades&&rep0.grades.find(g=>g.key===k);
  const gv=rg('velocity'), gm=rg('movement');
  T.push({key:'velo',label:'구속 (Velocity)',grade:gv?gv.value:wbdContext._srGrade(fbVelo,pools.fbVelo,false),pct:wbdContext._srPctile(fbVelo,pools.fbVelo,false),val:'',note:`직구 평균 ${fbVelo?fbVelo.toFixed(1):'-'} · 최고 ${fbMax?fbMax.toFixed(0):'-'}km`});
  T.push({key:'mov',label:'무브먼트',grade:gm?gm.value:null,pct:null,val:'',note:gm?gm.note:'구종별 리그 대비 무브 (데이터 부족)'});
  // 구위 = 구속·무브 조합 기대 헛스윙(Stuff+ 방식, _xWhiffArr). 실제 헛스윙/K는 근거로만 (검증: 기대치가 실제보다 다음 반기 헛스윙·K·피OPS를 더 잘 예측)
  const xw=wbdContext._xWhiffArr(d);
  tool('stuff','구위 (Stuff)',xw.x,pools.xWhiff,false,v=>v==null?'-':v.toFixed(1)+'%',`기대 헛스윙 ${wbdContext._srPct(xw.x)} (구속·무브 조합 기준) · 실제 헛스윙 ${wbdContext._srPct(whiff)} · 삼진율 ${wbdContext._srPct(s.kPct)} · K/9 ${k9!=null?k9.toFixed(1):'-'}${xw.x!=null&&whiff!=null?(whiff>=xw.x+5?' — 구위 대비 실제 헛스윙↑(디셉션/타자 수준 영향)':whiff<=xw.x-5?' — 구위 대비 실제 헛스윙↓(코스/타자 수준 영향)':''):''}`);
  const inzArr=d.filter(x=>{const L=wbdContext._atkLoc(x);return L&&L.inZone;}); const edgeRate=inzArr.length?inzArr.filter(x=>{const L=wbdContext._atkLoc(x);return !(L.row==='중간'&&L.col==='가운데');}).length/inzArr.length*100:null;
  blend('cmd','커맨드 (Command)',[{val:midPct,pool:pools.mid,lower:true,w:.6},{val:edgeRate,pool:pools.edge,lower:false,w:.4}],`실투(가운데) ${wbdContext._srPct(midPct)} · 구석 투구 ${wbdContext._srPct(edgeRate)} — 원하는 코스에 넣는 정확도(실투 적을수록↑)`);
  // 제구=존 투구율 .5+크게 빠진 공(|x|,|y|>1.7) 적음 .3+스트라이크율 .2 → 반복성 .45→.52 (초구 스트라이크는 반복성 .14라 제외, 근거에만)
  const farPct=locN>=40?d.filter(x=>{const L=wbdContext._atkLoc(x); return L&&(Math.abs(+x.zoneX)>1.7||Math.abs(+x.zoneY)>1.7);}).length/locN*100:null;
  const strikePct=d.length>=40?d.filter(x=>+x.call===0||wbdContext._isSwing(x)||(+x.ev>0&&+x.result!==3)).length/d.length*100:null;
  blend('ctrl','제구 (Control)',[{val:zonePct,pool:pools.zonePct,lower:false,w:.5},{val:farPct,pool:pools.far,lower:true,w:.3},{val:strikePct,pool:pools.strikePct,lower:false,w:.2}],`존 투구율 ${wbdContext._srPct(zonePct)} · 초구 스트라이크 ${wbdContext._srPct(fStrike)}(참고) · 크게 빠진 공 ${wbdContext._srPct(farPct)} · 스트라이크율 ${wbdContext._srPct(strikePct)} · 볼넷율 ${wbdContext._srPct(s.bbPct)}(참고) — 스트라이크 능력. ※ 이 리그는 존 투구율↑일수록 피안타↑ 경향이라 높다고 좋은 것만은 아님`);
  // 피안타 억제 = 기대 허용 경향(z존투구율 − z기대헛스윙, 낮을수록 좋음) 75% + 실제 피장타·피안타(수축) 25%
  const baaS=wbdContext._srShrink(s.ba, s.AB, wbdContext._srMean(pools.baa), 120), slgS=wbdContext._srShrink(s.slg, s.AB, wbdContext._srMean(pools.slgA), 100);
  const hitt=wbdContext._hittOf(zonePct, xw.x, pools._hittPrm);
  blend('hitSup','피안타 억제',[{val:hitt,pool:pools.hitt,lower:true,w:.75},{val:slgS,pool:pools.slgA,lower:true,w:.15},{val:baaS,pool:pools.baa,lower:true,w:.10}],`기대 허용 경향 ${hitt!=null?(hitt>0?'+':'')+hitt.toFixed(2):'-'}(존 투구율 ${wbdContext._srPct(zonePct)} vs 기대 헛스윙 ${wbdContext._srPct(xw.x)}) · 실제 피안타율 ${wbdContext._srF3(s.ba)} · 피장타율 ${wbdContext._srF3(s.slg)} · 땅볼 유도 ${wbdContext._srPct(gbA)} — 이 리그는 존에 많이 넣고 구위가 약할수록 맞음(기대치가 실제보다 다음 경기를 2배 잘 예측)`);
  const valid=T.filter(t=>t.grade!=null);
  const w={velo:.2,mov:.15,stuff:.25,cmd:.2,ctrl:.1,hitSup:.1};
  const ofp=valid.length?Math.round(valid.reduce((a,t)=>a+t.grade*(w[t.key]||0.05),0)/valid.reduce((a,t)=>a+(w[t.key]||0.05),0)/5)*5:null;

  // ── 서사 ──
  const cmdN=[]; cmdN.push(`존 투구율 ${wbdContext._srPct(zonePct)}, 초구 스트라이크 ${wbdContext._srPct(fStrike)}${fStrike!=null?(fStrike>=62?' — 초구부터 적극적으로 존 공략':fStrike<=50?' — 초구 볼이 많아 카운트 싸움 불리':''):''}.`);
  cmdN.push(`볼넷율 ${wbdContext._srPct(s.bbPct)}, 가운데 몰린 공 ${wbdContext._srPct(midPct)}${midPct!=null&&midPct>=14?' — 실투 빈도 높음':midPct!=null&&midPct<=8?' — 실투 드묾':''}.`);
  const seqN=[]; const top0=seqRows.find(r=>r.c==='초구'), topB=seqRows.find(r=>r.c==='유리'), top2=seqRows.find(r=>r.c==='2S');
  if(top0&&top0.top[0]) seqN.push(`초구 ${top0.top[0].g} ${wbdContext._srPct(top0.top[0].pct)}${top0.top[1]?` / ${top0.top[1].g} ${wbdContext._srPct(top0.top[1].pct)}`:''}.`);
  if(topB&&topB.top[0]&&topB.n>=8) seqN.push(`볼 앞설 때(몰리면) ${topB.top[0].g} ${wbdContext._srPct(topB.top[0].pct)}${topB.top[0].pct>=70?' — 뻔해서 타자가 노리기 쉬움':''}.`);
  if(top2&&top2.top[0]&&top2.n>=8) seqN.push(`2스트라이크 결정구 ${top2.top[0].g} ${wbdContext._srPct(top2.top[0].pct)}${top2.top[1]?` / ${top2.top[1].g} ${wbdContext._srPct(top2.top[1].pct)}`:''}.`);
  if(predict!=null) seqN.push(`패턴 예측도 ${wbdContext._srPct(predict)} — ${predict>=65?'단조로움, 타자 적응 쉬움':predict<=45?'다양함, 읽기 어려움':'보통'}.`);
  const stamN=[]; const p1=stamPC['0'], p3=stamPC[2]; const sv0=stamPC[0]&&stamPC[0].velo, sv2=(stamPC[2]&&stamPC[2].n>=15?stamPC[2]:stamPC[1]).velo;
  stamN.push(`경기당 평균 ${avgPC?avgPC.toFixed(0):'-'}구 (${gamesN}경기).`);
  if(stamPC[0]&&stamPC[0].velo&&sv2){ const dv=sv2-stamPC[0].velo; stamN.push(`직구 구속 ${stamPC[0].velo.toFixed(1)} → ${(stamPC[2]&&stamPC[2].n>=15?'51구 이후':'26구 이후')} ${sv2.toFixed(1)}km (${dv>=0?'+':''}${dv.toFixed(1)})${dv<=-2?' — 후반 구속 저하 뚜렷':dv>=0?' — 구속 유지':''}.`); }
  const late=stamPC.filter(x=>x.n>=20&&x.ab>=5).slice(-1)[0], early=stamPC[0];
  if(late&&early&&late.k!==early.k&&late.baa!=null&&early.baa!=null) stamN.push(`피안타율 ${early.k} ${wbdContext._srF3(early.baa)} → ${late.k} ${wbdContext._srF3(late.baa)}${late.baa>=early.baa+0.08?' — 투구수 쌓이면 급격히 맞음':late.baa<=early.baa-0.05?' — 후반이 오히려 강함':''}.`);
  const sit=[['주자 없음',empty],['주자 있음',onB],['득점권(2·3루)',risp],['vs 좌타',vsL],['vs 우타',vsR]].map(([l,b])=>({l,ab:b.ab,ba:b.ba,slg:b.slg,wh:b.whPct,ev:b.ev}));
  const risk=[];
  if(gStd!=null) risk.push({lvl:gStd>=0.2?'high':gStd>=0.13?'mid':'low', t:`경기별 피안타율 표준편차 ${wbdContext._srF3(gStd)} (${gBAs.length}경기) — ${gStd>=0.2?'기복 큼':gStd>=0.13?'보통':'꾸준함'}`});
  if(onB.ab>=8&&empty.ab>=8&&onB.ba!=null&&empty.ba!=null&&onB.ba>=empty.ba+0.07) risk.push({lvl:'high', t:`주자 있을 때 피안타 ${wbdContext._srF3(onB.ba)} vs 없을 때 ${wbdContext._srF3(empty.ba)} — 주자 쌓이면 흔들림`});
  if(predict!=null&&predict>=65) risk.push({lvl:'mid', t:`카운트별 구종 패턴 예측도 ${wbdContext._srPct(predict)} — 두 번째 타순부터 적응당할 위험`});
  if(vsL.ab>=8&&vsR.ab>=8&&vsL.ba!=null&&vsR.ba!=null&&Math.abs(vsL.ba-vsR.ba)>=0.1) risk.push({lvl:'mid', t:`플래툰 편차 — vs 좌타 ${wbdContext._srF3(vsL.ba)} / vs 우타 ${wbdContext._srF3(vsR.ba)}`});
  if(s.AB<60) risk.push({lvl:'mid', t:`표본 ${s.AB}타수 — 등급 신뢰도 제한적`});
  if(!risk.length) risk.push({lvl:'low', t:'특이 리스크 없음'});
  return {name, s, se, T, ofp, rep, seqRows, predict, ent, cmdN, seqN, stamN, stamPC, stamInn, sit, risk, zonePct, fStrike, whiff, fbVelo, fbMax, midPct, k9, gStd, avgPC, gamesN};
};
}

export function initialize(wbdContext) {
// Original index.html:24323
window._memoG = window._memoG || {key:null, map:new Map()};

// Original index.html:24375
wbdContext._atkBK = o=>{ const r={}; for(const k in o)r[k]=wbdContext._atkBucket(o[k]); return r; };
}
