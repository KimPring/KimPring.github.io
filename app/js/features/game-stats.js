/** game-stats: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:10049
wbdContext.calcGameDecisions = function calcGameDecisions(gamePitches, info){
  const data=gamePitches; if(!data.length) return {};
  // 최종 점수 (끝내기 보정 포함)
  const sc=wbdContext._computeInningScores(data);
  const finalA=sc.totalA, finalB=sc.totalB;
  if(finalA===finalB) return {}; // 무승부: 승패 없음
  const homeWon = finalB>finalA;  // 홈(teamB) 승리 여부

  // 투수별 등판 구간 추적 (각 half 별로 순서대로)
  //   half=1 투수 = 홈팀(teamB) 투수 / half=0 투수 = 원정팀(teamA) 투수
  // 각 투수의 등판 동안: 이닝수, 실점, 등판/강판 시점 팀 점수차
  const stints={};  // key=half|pName, {half,name,firstIdx,lastIdx,outs,runs}
  const order={1:[],0:[]};
  let cur={1:null,0:null};
  data.forEach((d,idx)=>{
    const hf=+d.half, pn=d.pName; if(!pn) return;
    const key=hf+'|'+pn;
    if(!stints[key]){ stints[key]={half:hf,name:pn,firstIdx:idx,lastIdx:idx,team:(hf===1?info.teamB:info.teamA)}; order[hf].push(key); }
    stints[key].lastIdx=idx;
  });
  // 각 투수의 이닝(outs)·실점(runs) 계산: calcPitcherGameStats 재활용
  const pg=wbdContext.calcPitcherGameStats(data);  // {name:{outs,runs,...}}
  // half별 투수 순서대로 stint 정보 보강
  const result={W:null,L:null,S:null,H:[],QS:[],QSP:[]};
  // 승리팀/패배팀 투수 목록 (half 기준)
  // 홈 승리 → 홈투수(half=1)가 승/세이브/홀드 대상, 원정투수(half=0) 중 패전
  const winHalf = homeWon?1:0;   // 이긴 팀이 던진 half
  const loseHalf = homeWon?0:1;
  const winPs = order[winHalf].map(k=>stints[k]);   // 이긴 팀 투수들 (등판순)
  const losePs = order[loseHalf].map(k=>stints[k]);  // 진 팀 투수들

  // 선발 = 각 팀 첫 투수
  const winStarter=winPs[0], loseStarter=losePs[0];

  // ── 승리투수(W) ──
  //   리드를 처음 잡아서 끝까지 유지된 시점에 던지던 승리팀 투수.
  //   선발이 최소 5이닝(15아웃) 던지고 리드 유지 시 선발 승. 아니면 리드 시점 구원투수 승.
  //   간이 규칙: 결승점(리드가 영구히 바뀐 마지막 동점→리드 전환) 시점의 이닝을 찾고,
  //   그 시점에 던지던 승리팀 투수가 승. 단 선발이 5이닝 미만이면 다음 투수에게.
  // 결승타 시점 = 승팀이 마지막으로 동점에서 앞선 순간
  let leadIdx=-1, curA=0, curB=0;
  for(let i=0;i<data.length;i++){
    const a=+data[i].scoreA||0, b=+data[i].scoreB||0;
    if(a>curA||b>curB){
      const wasLead = homeWon ? (curB>curA) : (curA>curB);
      const nowLead = homeWon ? (b>a) : (a>b);
      if(!wasLead && nowLead) leadIdx=i;  // 동점/뒤지다 → 리드 전환
      curA=Math.max(curA,a); curB=Math.max(curB,b);
    }
  }
  // 끝내기 보정: score 미반영이면 마지막 투구가 결승
  if(leadIdx<0) leadIdx=data.length-1;
  // V11.1 fix: 승리투수 = 결승점 시점에 "이미 등판한"(firstIdx<=leadIdx) 승팀 투수 중 마지막.
  //   결승점 이후 등판한 투수(firstIdx>leadIdx)는 승리 아님 → 세이브/홀드 후보.
  //   이닝 번호가 아니라 투구 인덱스(시간 순서)로 비교해야 정확
  //   (예: 9회초 결승점 후 9회말 새 투수 등판 시 그 투수는 승리 아님).
  let winner=null;
  for(const s of winPs){
    if(s.firstIdx<=leadIdx) winner=s;  // 결승점 시점까지 등판한 마지막 승팀 투수
  }
  if(!winner) winner=winStarter;
  // 선발 5이닝 규칙: winner가 선발인데 5이닝 미만이면 다음(결승점 이전 등판) 투수
  const starterOuts=(pg[winStarter.name]||{}).outs||0;
  if(winner===winStarter && starterOuts<15 && winPs.length>1){
    // 결승점 이전 등판한 두 번째 투수
    if(winPs[1] && winPs[1].firstIdx<=leadIdx) winner=winPs[1];
  }
  if(winner) result.W=winner.name;

  // ── 패전투수(L) ──
  //   결승점을 허용한 패배팀 투수 = 결승점 시점(leadIdx)에 던지고 있던 패팀 투수.
  let loser=null;
  for(const s of losePs){
    if(s.firstIdx<=leadIdx && leadIdx<=s.lastIdx) { loser=s; break; }  // 결승점 시점 등판 중
  }
  if(!loser){ // 폴백: 결승점 직전까지 등판한 마지막 패팀 투수
    for(const s of losePs){ if(s.firstIdx<=leadIdx) loser=s; }
  }
  if(!loser) loser=losePs[losePs.length-1];
  if(loser) result.L=loser.name;

  // ── 세이브(S) / 홀드(H) ──
  //   승리투수 이후 등판해 리드 지킨 투수들. 마지막 투수가 경기 끝까지 리드 지키면 세이브.
  //   승리투수와 마무리 사이 중간계투는 홀드.
  if(winPs.length>1){
    const closer=winPs[winPs.length-1];
    // 마지막 투수가 승리투수가 아니고, 승리투수보다 나중에(또는 결승점 이후) 등판했으면 세이브
    if(closer.name!==result.W && closer.firstIdx>(winner?winner.firstIdx:-1)){
      const cOuts=(pg[closer.name]||{}).outs||0;
      const margin=Math.abs(finalA-finalB);
      if(cOuts>=1 && (margin<=3 || cOuts>=3)) result.S=closer.name;
    }
    // 홀드: 승리투수 다음 ~ 마무리 이전 중간계투 (리드 유지 강판)
    const winIdx = winPs.findIndex(s=>s.name===result.W);
    for(let i=Math.max(1,winIdx+1);i<winPs.length-1;i++){
      const mid=winPs[i];
      if(mid.name!==result.W && mid.name!==result.S) result.H.push(mid.name);
    }
  }

  // ── QS / QS+ ── (선발만, 실점 기준 근사)
  //   QS: 선발 6이닝(18아웃)+ 3실점 이하. QS+: 7이닝(21아웃)+ 2실점 이하.
  [winStarter, loseStarter].forEach(st=>{
    if(!st) return;
    const o=(pg[st.name]||{}).outs||0, r=(pg[st.name]||{}).runs||0;
    if(o>=18 && r<=3) result.QS.push(st.name);
    if(o>=21 && r<=3) result.QSP.push(st.name);  // QS+: 7이닝 3실점 이하
  });

  return {homeWon, finalA, finalB, decisions:result};
};

// Original index.html:10161
wbdContext.calcPitcherGameStats = function calcPitcherGameStats(gamePitches){
  // V11.6 fix: 이닝교대(SIDE)·종료(END) 마커를 제거한 뒤 계산.
  //   이 행들이 남아 있으면 각 이닝의 "마지막 투구"가 마커 행이 되어
  //   실제 투수의 마지막 투구에 3아웃 채우기가 적용되지 않았음.
  const sorted=gamePitches.filter(p=>!wbdContext._isDummyPitch(p));
  const map={};
  
  const ensure=pn=>{
    if(!map[pn])map[pn]={n:0,outs:0,hits:0,hrs:0,ks:0,bbs:0,runs:0,batters:new Set()};
    return map[pn];
  };
  
  // 이닝(half)별로 그룹화
  const halves=[];
  let curKey=null;
  for(const p of sorted){
    const k=`${p.inn}_${p.half}`;
    if(k!==curKey){halves.push([]);curKey=k;}
    halves[halves.length-1].push(p);
  }
  
  for(const halfPitches of halves){
    if(halfPitches.length===0)continue;
    let runnerOwner={1:null,2:null,3:null};
    let prevB1=0,prevB2=0,prevB3=0;
    
    for(let i=0;i<halfPitches.length;i++){
      const p=halfPitches[i];
      const next=halfPitches[i+1]||sorted[sorted.indexOf(p)+1];
      const pn=p.pName;
      if(!pn||String(pn)==='0')continue;
      const s=ensure(pn);
      s.n++;
      s.batters.add(p.bName);
      
      // 아웃 카운트: out 컬럼 변화로 판단 (정확)
      // 같은 이닝 내 다음 투구의 out > 현재 out 이면 아웃 발생
      // 이닝 마지막 투구 = 3번째 아웃 (마지막 out 값 + 1)
      const nextInHalf=halfPitches[i+1];
      if(nextInHalf){
        const outDelta=(+nextInHalf.out||0)-(+p.out||0);
        if(outDelta>0)s.outs+=outDelta;
      }else{
        // 이닝(또는 경기)의 마지막 투구.
        // V11.3 fix: 경기 전체의 마지막 투구는 그 이닝이 종료됐다는 보장이 없음.
        //   - 끝내기: 이닝 미완(출루로 경기 종료)
        //   - 콜드게임/서스펜디드: 이닝 미완인 채로 경기 종료 (예: 8회말 1아웃에서 콜드)
        //   따라서 경기 마지막 투구는 3아웃으로 채우지 않고, 그 투구가 아웃이면 +1만 인정.
        //   반면 이닝 중간의 마지막 투구(다음 이닝 존재)는 안타처럼 보여도 정상 3아웃 종료.
        const isGameLastPitch = (sorted.indexOf(p) === sorted.length-1);
        if(isGameLastPitch){
          // 경기 마지막 투구: 이닝 종료 보장 없음(끝내기·콜드게임). 3아웃으로 채우지 않음.
          //   그 타석 자체가 아웃이면 +1, 출루면 +0.
          //   - 출루(안타/홈런/볼넷/사구): 타자가 살았으니 아웃 아님 → +0 (끝내기 안타 등)
          //   - 그 외(인플레이 아웃·삼진·뜬공·땅볼): 타자 아웃 → +1
          //     (예: 콜드게임 8회말 1아웃에서 타자주자 아웃+3루주자 득점 → 2아웃 = +1)
          const isOutPitch = !( (+p.result===4) || (+p['1BSafe']===1&&+p.ev>0) || (+p.result===5) || (+p.result===6) );
          s.outs += isOutPitch ? 1 : 0;
        }else{
          s.outs+=Math.max(0, 3-(+p.out||0));  // 이닝 중간 종료: 정상 3아웃까지 채움
        }
      }
      
      if(+p.ev>0&&(+p['1BSafe']===1||+p.result===4))s.hits++;
      // result=2 + 1BSafe=1 도 안타로 (인플레이 안타)
      if(+p['1BSafe']===1 && +p.ev>0 && +p.result!==4)s.hits=s.hits; // 이미 위에서 카운트
      if(+p.result===4)s.hrs++;
      if(+p.strk===2 && (+p.call===0 || +p.call===4))s.ks++;
      if(+p.result===5)s.bbs++;
      
      const halfV=+p.half;
      const myScore=halfV===1?+p.scoreA:+p.scoreB;
      const nextScore=next?(halfV===1?+next.scoreA:+next.scoreB):myScore;
      let runScored=(nextScore||0)-(myScore||0);
      // V10.3: 끝내기 홈런/안타 보정 — 경기 종료로 next 상태가 없어 점수 변화가 0으로 잡힘.
      //   홈런(result=4)은 주자수+1점이 확정 득점이므로, score 변화로 못 잡으면 결과로 직접 인정.
      if(+p.result===4){
        const hrRuns=(prevB1?1:0)+(prevB2?1:0)+(prevB3?1:0)+1;
        if(runScored < hrRuns) runScored = hrRuns;
      }
      
      const nextB1=next?+next.b1:0;
      const nextB2=next?+next.b2:0;
      const nextB3=next?+next.b3:0;
      
      if(runScored>0){
        const isHR=+p.result===4;
        if(isHR){
          // 홈런: 모든 베이스 주자(원래 owner) + 타자(현재 투수)
          const runners=[];
          if(prevB3)runners.push(runnerOwner[3]||pn);
          if(prevB2)runners.push(runnerOwner[2]||pn);
          if(prevB1)runners.push(runnerOwner[1]||pn);
          runners.push(pn);
          runners.slice(0,runScored).forEach(r=>{ensure(r).runs++;});
        }else{
          // 안타/실책: 가장 진루한 주자부터 (3→2→1)
          const inOrder=[];
          if(prevB3 && !nextB3)inOrder.push(runnerOwner[3]||pn);
          if(prevB2 && nextB2===0 && nextB3===0)inOrder.push(runnerOwner[2]||pn);
          if(prevB1 && nextB1===0 && nextB2===0 && nextB3===0)inOrder.push(runnerOwner[1]||pn);
          while(inOrder.length<runScored)inOrder.push(pn);
          inOrder.slice(0,runScored).forEach(r=>{ensure(r).runs++;});
        }
      }
      
      // 다음 베이스 owner 갱신
      const newOwner={1:null,2:null,3:null};
      if(nextB1){
        if(prevB1===0)newOwner[1]=pn;
        else newOwner[1]=runnerOwner[1];
      }
      if(nextB2){
        if(prevB1 && prevB2===0)newOwner[2]=runnerOwner[1];
        else if(prevB2)newOwner[2]=runnerOwner[2];
        else newOwner[2]=pn;
      }
      if(nextB3){
        if(prevB2 && prevB3===0)newOwner[3]=runnerOwner[2];
        else if(prevB1 && prevB2===0 && prevB3===0)newOwner[3]=runnerOwner[1];
        else if(prevB3)newOwner[3]=runnerOwner[3];
        else newOwner[3]=pn;
      }
      runnerOwner=newOwner;
      prevB1=nextB1;prevB2=nextB2;prevB3=nextB3;
    }
  }
  
  const result={};
  for(const pn in map){
    const s=map[pn];
    const ip=s.outs/3;
    const era=ip>0?s.runs/ip*9:0;
    const whip=ip>0?(s.hits+s.bbs)/ip:0;
    result[pn]={
      pitches:s.n, outs:s.outs, ip,
      hits:s.hits, hrs:s.hrs, ks:s.ks, bbs:s.bbs, runs:s.runs,
      batters:s.batters.size,
      era, whip,
      ipDisp: Math.floor(ip)+'.'+(s.outs%3)
    };
  }
  return result;
};

// Original index.html:10307
wbdContext.calcBatterGameStats = function calcBatterGameStats(gamePitches){
  const map={};
  // 먼저 paEnd 만 추리기 (정확한 타석 종료)
  // 타자별로 그룹화 후 _countPaEnd
  const byBatter={};
  gamePitches.forEach(p=>{
    if(!p.bName||String(p.bName)==='0')return;
    if(!byBatter[p.bName])byBatter[p.bName]=[];
    byBatter[p.bName].push(p);
  });
  // 각 타자의 타석 종료 투구만 추출
  const paEndSet=new Set();
  for(const bn in byBatter){
    const ends=wbdContext._countPaEnd(byBatter[bn]);
    ends.forEach(p=>paEndSet.add(p));
  }
  
  for(const p of gamePitches){
    const bn=p.bName;
    if(!bn||String(bn)==='0')continue;
    if(!map[bn])map[bn]={n:0,ab:0,hits:0,hrs:0,bbs:0,ks:0,bat:0};
    const s=map[bn];
    s.n++;
    if(wbdContext._isInPlay(p)){
      s.bat++;
      // V11.6 fix: 야수선택(선행주자 포스아웃) 제외 — 헤더·기록실과 정의 통일.
      //   기존엔 1BSafe=1이면 무조건 안타로 세어 경기별 성적이 헤더보다 많게 나왔음
      //   (실측 Slaris 2R: 경기별 7안타 vs 헤더 6안타)
      if(wbdContext._isHit(p))s.hits++;
      if(+p.result===4)s.hrs++;
    }
    // 타수: 타석 종료 투구 중 BB(5)/HBP(6) 제외
    if(paEndSet.has(p) && +p.result!==5 && +p.result!==6)s.ab++;
    // 볼넷
    if(+p.result===5)s.bbs++;
    // 삼진
    if(+p.strk===2 && (+p.call===0 || +p.call===4))s.ks++;
  }
  const result={};
  for(const bn in map){
    const s=map[bn];
    const ba=s.ab>0?s.hits/s.ab:0;
    const slg=s.ab>0?(s.hits+s.hrs*3)/s.ab:0;
    result[bn]={
      pitches:s.n, ab:s.ab, hits:s.hits, hrs:s.hrs, bbs:s.bbs, ks:s.ks,
      ba, slg, baStr: ba.toFixed(3).replace(/^0/,'')
    };
  }
  return result;
};

// Original index.html:10361
wbdContext._passZoneSpdFilter = function _passZoneSpdFilter(arr){
  const mn=wbdContext._spdVal('b-zone-spd-min',80);
  const mx=wbdContext._spdVal('b-zone-spd-max',175);
  if(mn<=80&&mx>=175)return arr;
  return arr.filter(d=>+d.spdK>=mn&&+d.spdK<=mx);
};

// Original index.html:10367
wbdContext.renderBatterZoneSummary = function renderBatterZoneSummary(){
  const el=document.getElementById('b-zone-summary');
  if(!el)return;
  const all=wbdContext._passZoneSpdFilter(wbdContext.getBatterDataFiltered().filter(d=>d.spdK>0));
  const zones=[['전체',all],['인존',all.filter(d=>wbdContext._zoneClass(d)==='in')],['아웃존',all.filter(d=>wbdContext._zoneClass(d)==='out')]];
  const zoneColors=['#cc44ff','#39ff8a','#ff8c44'];
  let html='<div class="grid3">';
  zones.forEach(([label,arr],i)=>{
    const pitches=arr.length;
    const swings=arr.filter(wbdContext._isSwing).length;
    const whiffs=arr.filter(wbdContext._isWhiff).length;
    const contacts=arr.filter(wbdContext._isContact).length;
    const ks=arr.filter(wbdContext._isK).length;
    const swingPct=wbdContext._pct(swings,pitches);
    const whiffPct=wbdContext._pct(whiffs,swings);
    const contactPct=wbdContext._pct(contacts,swings);
    const kPct=wbdContext._pct(ks,pitches);
    html+=`<div class="card" style="border-left:3px solid ${zoneColors[i]}">
      <div style="font-size:13px;font-weight:700;color:${zoneColors[i]};margin-bottom:10px">${label} <span style="font-size:10px;color:var(--muted)">${pitches}구</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div><div style="color:var(--muted);font-size:10px">스윙률</div><div style="font-family:var(--mono);color:var(--amber);font-size:18px">${swingPct}</div></div>
        <div><div style="color:var(--muted);font-size:10px">컨택률</div><div style="font-family:var(--mono);color:var(--green);font-size:18px">${contactPct}</div></div>
        <div><div style="color:var(--muted);font-size:10px">헛스윙률</div><div style="font-family:var(--mono);color:var(--red);font-size:18px">${whiffPct}</div></div>
        <div><div style="color:var(--muted);font-size:10px">삼진률(투구당)</div><div style="font-family:var(--mono);color:#ff6600;font-size:18px">${kPct}</div></div>
      </div>
    </div>`;
  });
  el.innerHTML=html+'</div>';
};

// Original index.html:10399
wbdContext._zone5x5CellOf = function _zone5x5CellOf(zx,zy){
  let c=Math.floor((zx+2)/0.8), r=Math.floor((2-(zy||0))/0.8);
  return [Math.max(0,Math.min(4,c)), Math.max(0,Math.min(4,r))];
};

// Original index.html:10404
wbdContext._zone5x5Cells = function _zone5x5Cells(arr){
  const cells={};
  arr.forEach(d=>{
    if(d.zoneX==null) return;
    const [c,r]=wbdContext._zone5x5CellOf(+d.zoneX,+d.zoneY);
    const k=c+','+r;
    if(!cells[k])cells[k]={pitches:0,ab:0,swings:0,whiffs:0,batted:0,hits:0,hrs:0,evSum:0,evCnt:0,tbs:0,laSum:0,laCnt:0,hhN:0,hhpN:0,brlN:0,brlpN:0,pa:0,ob:0};
    const z=cells[k], res=+d.result;
    z.pitches++;
    if(wbdContext._isSwing(d))z.swings++;
    if(wbdContext._isWhiff(d))z.whiffs++;
    if(wbdContext._isInPlay(d)){
      z.batted++;z.evSum+=+d.ev;z.evCnt++;
      const _la=+d.ldeg; if(d.ldeg!=null&&!isNaN(_la)){z.laSum+=_la;z.laCnt++;}
      if(wbdContext._isHardHit(d))z.hhN++;
      if(wbdContext._isHHPlus(d))z.hhpN++;
      if(+d.ev>=105&&_la>=8&&_la<=32)z.brlN++;
      if(wbdContext._isBarrelPlus(d))z.brlpN++;
    }
    if(res===5||res===6){z.pa++;z.ob++;}
    if(wbdContext._isHit(d))z.hits++;
    if(res===4)z.hrs++;
    if(wbdContext._isABPitch(d)){ z.ab++; z.pa++; if(wbdContext._isHit(d)) z.ob++; }
    if(wbdContext._isHit(d)){ z.tbs += (+d._hitBase || (res===4?4:1)); }
  });
  return cells;
};

// Original index.html:10433
wbdContext._zone5x5SVG = function _zone5x5SVG(cells, metric, opts){
  opts=opts||{};
  const cellVals=[];
  Object.values(cells).forEach(c=>{
    if(metric==='whiff'){ if(c.swings>=2)cellVals.push(c.whiffs/c.swings); }
    else if(metric==='ev'){ if(c.batted>=2)cellVals.push(c.evSum/c.evCnt); }
    else if(metric==='la'){ if(c.laCnt>=2)cellVals.push(c.laSum/c.laCnt); }
    else if(metric==='hh'){ if(c.batted>=2)cellVals.push(c.hhN/c.batted); }
    else if(metric==='hhp'){ if(c.batted>=2)cellVals.push(c.hhpN/c.batted); }
    else if(metric==='brl'){ if(c.batted>=2)cellVals.push(c.brlN/c.batted); }
    else if(metric==='brlp'){ if(c.batted>=2)cellVals.push(c.brlpN/c.batted); }
    else if(metric==='ops'){ if(c.ab>=2)cellVals.push((c.pa>0?c.ob/c.pa:0)+(c.tbs/c.ab)); }
    else if(c.ab>=2){ if(metric==='avg')cellVals.push(c.hits/c.ab); else if(metric==='slg')cellVals.push(c.tbs/c.ab); }
  });
  const minV=Math.min(...cellVals,0), maxV=Math.max(...cellVals,1);
  const S=opts.cellPx||56, W=S*5+2, H=S*5+2;
  let items='';
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
    const cell=cells[c+','+r], x=c*S+1, y=r*S+1;
    const isInZone=(c>=1&&c<=3&&r>=1&&r<=3);
    const inZoneBorder=isInZone?'#f5a623':'#2a4060';
    let fill='#0a1828', text='', sub='';
    const hasData = metric==='whiff' ? (cell&&cell.swings>=1) :
      (metric==='ev'||metric==='hh'||metric==='hhp'||metric==='brl'||metric==='brlp') ? (cell&&cell.batted>=1) :
      metric==='la' ? (cell&&cell.laCnt>=1) : (cell&&cell.ab>=1);
    if(hasData){
      let v=0;
      if(metric==='avg'){v=cell.hits/cell.ab;text=v.toFixed(3).replace(/^0/,'');}
      else if(metric==='slg'){v=cell.tbs/cell.ab;text=v.toFixed(3).replace(/^0/,'');}
      else if(metric==='ev'){v=cell.evSum/cell.evCnt;text=v.toFixed(0);}
      else if(metric==='whiff'){v=cell.whiffs/cell.swings;text=(v*100).toFixed(0)+'%';}
      else if(metric==='la'){v=cell.laSum/cell.laCnt;text=v.toFixed(0)+'°';}
      else if(metric==='hh'){v=cell.hhN/cell.batted;text=(v*100).toFixed(0)+'%';}
      else if(metric==='hhp'){v=cell.hhpN/cell.batted;text=(v*100).toFixed(0)+'%';}
      else if(metric==='brl'){v=cell.brlN/cell.batted;text=(v*100).toFixed(0)+'%';}
      else if(metric==='brlp'){v=cell.brlpN/cell.batted;text=(v*100).toFixed(0)+'%';}
      else if(metric==='ops'){v=(cell.pa>0?cell.ob/cell.pa:0)+(cell.tbs/cell.ab);text=v.toFixed(3).replace(/^0/,'');}
      if(['la','hh','hhp','brl','brlp','ops'].includes(metric)){
        const norm=Math.max(0,Math.min(1,(v-minV)/Math.max(0.001,maxV-minV)));
        fill=wbdContext._hotColdPalette(metric==='la'?Math.max(0,Math.min(1,(v+20)/60)):norm);
      } else { fill=wbdContext._hotColdPalette(wbdContext._absHotScore(metric,v)); }
      sub = metric==='whiff' ? cell.swings+'스윙' : metric==='ev' ? cell.batted+'타구' : cell.ab+'타수';
    } else if(cell){ sub=cell.pitches+'구'; }
    const txtCol=wbdContext._textForBg(fill);
    const subCol=txtCol==='#222'?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.6)';
    const fs=(S*0.23).toFixed(0), sfs=(S*0.145).toFixed(0);
    items+=opts.interactive?`<g class="zone-cell" data-c="${c}" data-r="${r}">`:'';
    items+=`<rect x="${x}" y="${y}" width="${S-2}" height="${S-2}" fill="${fill}" stroke="${inZoneBorder}" stroke-width="${isInZone?1.5:0.8}" rx="2"/>`;
    if(text)items+=`<text x="${x+S/2}" y="${y+S/2+2}" fill="${txtCol}" font-size="${fs}" font-weight="700" text-anchor="middle" font-family="var(--mono)">${text}</text>`;
    if(sub)items+=`<text x="${x+S/2}" y="${y+S-6}" fill="${subCol}" font-size="${sfs}" text-anchor="middle">${sub}</text>`;
    items+=opts.interactive?'</g>':'';
  }
  // 반응형: viewBox만 고정, 폭은 컨테이너에 맞춤(max-width로 과대 방지)
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${opts.maxW||W}px;height:auto;display:block;margin:0 auto">${items}</svg>`;
};

// Original index.html:10490
wbdContext.renderBatterZoneMap = function renderBatterZoneMap(){
  const el=document.getElementById('b-zone-map');
  if(!el)return;
  if(typeof wbdContext._initSpdSelects==='function')wbdContext._initSpdSelects();
  const metric=document.getElementById('b-zone-metric').value;
  wbdContext.renderMapPitchToggles('b');
  let all=wbdContext.getBatterDataFiltered().filter(d=>d.spdK>0 && d.zoneX!=null);
  all=all.filter(d=>wbdContext._passMapPitchFilter('b',d));
  all=wbdContext._passZoneSpdFilter(all);
  // 공용 집계·렌더 사용 (중복 제거)
  const cells=wbdContext._zone5x5Cells(all);
  el.innerHTML=`${wbdContext._zone5x5SVG(cells, metric, {interactive:true, cellPx:56})}
    <div style="margin-top:10px;font-size:10px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap">
      <span>🟧 가운데 3×3 = 인존(스트라이크존)</span>
      <span>🔴 핫존 ↔ 🔵 콜드존</span>
    </div>`;
  // 툴팁
  el.querySelectorAll('.zone-cell').forEach(g=>{
    const c=+g.dataset.c, r=+g.dataset.r;
    const cell=cells[c+','+r];
    if(!cell)return;
    g.style.cursor='pointer';
    g.addEventListener('mouseenter',e=>{
      const evAvg=cell.evCnt>0?(cell.evSum/cell.evCnt).toFixed(1):'-';
      const baStr = cell.ab>0 ? (cell.hits/cell.ab).toFixed(3).replace(/^0/,'') : '-';
      wbdContext.showTip(e,`<b>존 [${c+1},${r+1}]</b><br>
        투구수: ${cell.pitches}<br>
        스윙률: ${wbdContext._pct(cell.swings,cell.pitches)}<br>
        헛스윙률: ${wbdContext._pct(cell.whiffs,cell.swings)}<br>
        타수: ${cell.ab}<br>
        안타: ${cell.hits} (BA <b>${baStr}</b>)<br>
        타구수: ${cell.batted}<br>
        홈런: ${cell.hrs}<br>
        평균 EV: ${evAvg}`);
    });
    g.addEventListener("mousemove",wbdContext.moveTip);
    g.addEventListener('mouseleave',wbdContext.hideTip);
    g.addEventListener('click',()=>{wbdContext.hideTip();wbdContext.showZoneDetailModal(c,r);});
  });
};

// Original index.html:10532
wbdContext.showZoneDetailModal = function showZoneDetailModal(col,row){
  let all=wbdContext.getBatterDataFiltered().filter(d=>d.spdK>0 && d.zoneX!=null);
  all=all.filter(d=>wbdContext._passMapPitchFilter('b',d));
  all=wbdContext._passZoneSpdFilter(all);
  const getCell=(zx,zy)=>{
    let c=Math.floor((zx+2)/0.8), r=Math.floor((2-zy)/0.8);
    return [Math.max(0,Math.min(4,c)),Math.max(0,Math.min(4,r))];
  };
  const cd=all.filter(d=>{const p=getCell(+d.zoneX,+d.zoneY||0);return p[0]===col&&p[1]===row;});
  const colName=col<=1?'좌':(col>=3?'우':'중앙');
  const rowName=row<=1?'상단':(row>=3?'하단':'중단');
  const inZone=(col>=1&&col<=3&&row>=1&&row<=3);
  function agg(arr){
    const sw=arr.filter(wbdContext._isSwing).length, wh=arr.filter(wbdContext._isWhiff).length;
    const looking=arr.filter(d=>!d.bSwing&&+d.call===0).length; // 루킹 스트라이크
    const foul=arr.filter(d=>+d.result===3).length;
    const ball=arr.filter(d=>+d.call===1||+d.result===5).length;
    const ip=arr.filter(wbdContext._isInPlay);
    const hits=arr.filter(wbdContext._isHit).length;
    const hrs=arr.filter(d=>+d.result===4).length;
    const doubles=arr.filter(d=>wbdContext._isHit(d)&&+d._hitBase===2).length;
    const triples=arr.filter(d=>wbdContext._isHit(d)&&+d._hitBase===3).length;
    const singles=hits-doubles-triples-hrs;
    const outs=ip.filter(d=>!wbdContext._isHit(d)).length;
    const ev=ip.map(d=>+d.ev).filter(v=>v>0);
    const evM=ev.length?ev.reduce((a,b)=>a+b,0)/ev.length:null;
    const evMax=ev.length?Math.max(...ev):null;
    const la=ip.map(d=>+d.ldeg).filter(v=>!isNaN(v));
    const laM=la.length?la.reduce((a,b)=>a+b,0)/la.length:null;
    const hp=ip.map(d=>Math.abs(+d.hPos)).filter(v=>!isNaN(v));
    const hpM=hp.length?hp.reduce((a,b)=>a+b,0)/hp.length:null;
    const brlp=ip.filter(wbdContext._isBarrelPlus).length;
    const hhp=ip.filter(wbdContext._isHHPlus).length;
    // 타구 유형 (땅볼/라인/뜬공)
    const gb=la.filter(v=>v<10).length, ld=la.filter(v=>v>=10&&v<25).length, fb=la.filter(v=>v>=25).length;
    const tbs=arr.filter(d=>wbdContext._isHit(d)).reduce((s,d)=>s+(+d._hitBase||(+d.result===4?4:1)),0);
    const ab2=ip.length;
    const contact=sw>0?(sw-wh)/sw*100:null; // 컨택률(스윙 중 맞힌 비율)
    return {n:arr.length,sw,wh,looking,foul,ball,ab:ab2,hits,hrs,doubles,triples,singles,outs,
      avg:ab2?hits/ab2:null,slg:ab2?tbs/ab2:null,
      swR:arr.length?sw/arr.length*100:0,whR:sw?wh/sw*100:0,contact,
      ev:evM,evMax,la:laM,hpos:hpM,brlp:ip.length?brlp/ip.length*100:null,hhp:ip.length?hhp/ip.length*100:null,
      gb,ld,fb,gbR:ab2?gb/ab2*100:null,ldR:ab2?ld/ab2*100:null,fbR:ab2?fb/ab2*100:null};
  }
  const A=agg(cd);
  const byPitch={};
  cd.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);(byPitch[g]=byPitch[g]||[]).push(d);});
  const pitchRows=Object.entries(byPitch).map(([g,arr])=>Object.assign({g:g},agg(arr))).sort((a,b)=>b.n-a.n);
  const bySpd={};
  cd.forEach(d=>{const b=Math.floor(+d.spdK/5)*5;(bySpd[b]=bySpd[b]||[]).push(d);});
  const spdRows=Object.entries(bySpd).map(([b,arr])=>Object.assign({b:+b},agg(arr))).sort((a,b)=>a.b-b.b);
  const fmt3=v=>v!=null?v.toFixed(3).replace(/^0/,''):'-';
  const fmtP=v=>v!=null?v.toFixed(0)+'%':'-';
  const fmt1=v=>v!=null?v.toFixed(1):'-';
  const fmt0=v=>v!=null?v.toFixed(0):'-';
  let html='<div style="max-height:82vh;overflow-y:auto">';
  html+='<div style="font-size:16px;font-weight:700;margin-bottom:4px">🎯 존 상세 ['+colName+'\u00b7'+rowName+'] '+(inZone?'<span style="color:#f5a623;font-size:11px">인존</span>':'<span style="color:#5a7;font-size:11px">존밖</span>')+'</div>';
  html+='<div style="font-size:11px;color:var(--muted);margin-bottom:12px">'+(wbdContext.currentBatter||'')+' \u00b7 필터 적용됨 \u00b7 '+A.n+'구 / '+A.ab+'타수</div>';
  // 요약 카드
  html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px">';
  const cards=[['타율',fmt3(A.avg),'#39ff8a'],['장타율',fmt3(A.slg),'#ffd700'],['헛스윙',fmtP(A.whR),'#ff5533'],
    ['컨택률',fmtP(A.contact),'#4fc3f7'],['평균EV',fmt1(A.ev),'#ff8c44'],['최고EV',fmt0(A.evMax),'#ff6622'],
    ['평균LA',A.la!=null?A.la.toFixed(0)+'\u00b0':'-','#8af'],['|hPos|',A.hpos!=null?A.hpos.toFixed(2):'-','#c9f'],
    ['배럴+%',fmtP(A.brlp),'#ff2020'],['HH+%',fmtP(A.hhp),'#ff5533'],['홈런',A.hrs,'#fff'],['스윙률',fmtP(A.swR),'#aaa']];
  cards.forEach(function(x){html+='<div style="background:#141e2c;border-radius:6px;padding:7px;text-align:center"><div style="font-size:9.5px;color:var(--muted)">'+x[0]+'</div><div style="font-size:15px;font-weight:700;color:'+x[2]+';font-family:var(--mono)">'+x[1]+'</div></div>';});
  html+='</div>';
  // 결과 분포 (한 줄 요약)
  html+='<div style="background:#0e1826;border-radius:6px;padding:8px 10px;margin-bottom:12px;font-size:11px;display:flex;gap:14px;flex-wrap:wrap">';
  html+='<span>안타 <b style="color:#39ff8a">'+A.hits+'</b> (1B '+A.singles+' / 2B '+A.doubles+' / 3B '+A.triples+' / HR '+A.hrs+')</span>';
  html+='<span>인플레이아웃 <b>'+A.outs+'</b></span>';
  html+='<span>헛스윙 <b style="color:#ff5533">'+A.wh+'</b></span>';
  html+='<span>루킹 <b>'+A.looking+'</b></span>';
  html+='<span>파울 <b>'+A.foul+'</b></span>';
  html+='<span>볼 <b>'+A.ball+'</b></span>';
  html+='</div>';
  // 타구 유형
  if(A.ab>0){
    html+='<div style="background:#0e1826;border-radius:6px;padding:8px 10px;margin-bottom:14px;font-size:11px;display:flex;gap:16px;flex-wrap:wrap">';
    html+='<span style="color:var(--muted)">타구유형:</span>';
    html+='<span>땅볼 <b>'+A.gb+'</b> ('+fmtP(A.gbR)+')</span>';
    html+='<span>라인드라이브 <b>'+A.ld+'</b> ('+fmtP(A.ldR)+')</span>';
    html+='<span>뜬공 <b>'+A.fb+'</b> ('+fmtP(A.fbR)+')</span>';
    html+='</div>';
  }
  // 구종별 상세 표
  html+='<div style="font-size:12px;font-weight:600;margin:8px 0 4px">구종별 대응</div>';
  html+='<div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>구종</th><th>투구</th><th>타수</th><th>타율</th><th>장타</th><th>헛스윙</th><th>컨택</th><th>EV</th><th>LA</th><th>배럴+</th><th>|hPos|</th><th>HR</th></tr></thead><tbody>';
  pitchRows.forEach(function(r){
    const cl=(typeof wbdContext.GROUP_COLORS!=='undefined'&&wbdContext.GROUP_COLORS[r.g])||'#ccc';
    html+='<tr><td style="color:'+cl+';font-weight:600">'+r.g+'</td><td>'+r.n+'</td><td>'+r.ab+'</td><td>'+fmt3(r.avg)+'</td><td>'+fmt3(r.slg)+'</td><td>'+fmtP(r.whR)+'</td><td>'+fmtP(r.contact)+'</td><td>'+fmt0(r.ev)+'</td><td>'+(r.la!=null?r.la.toFixed(0)+'\u00b0':'-')+'</td><td>'+fmtP(r.brlp)+'</td><td>'+(r.hpos!=null?r.hpos.toFixed(2):'-')+'</td><td>'+r.hrs+'</td></tr>';
  });
  html+='</tbody></table></div>';
  // 구속대별 상세 표
  if(spdRows.length>1){
    html+='<div style="font-size:12px;font-weight:600;margin:14px 0 4px">구속대별 대응 (5km)</div>';
    html+='<div class="tbl-wrap"><table class="data-table" style="font-size:11px"><thead><tr><th>구속</th><th>투구</th><th>타수</th><th>타율</th><th>장타</th><th>헛스윙</th><th>컨택</th><th>EV</th><th>LA</th><th>배럴+</th><th>HR</th></tr></thead><tbody>';
    spdRows.forEach(function(r){
      html+='<tr><td style="font-weight:600">'+r.b+'~'+(r.b+5)+'</td><td>'+r.n+'</td><td>'+r.ab+'</td><td>'+fmt3(r.avg)+'</td><td>'+fmt3(r.slg)+'</td><td>'+fmtP(r.whR)+'</td><td>'+fmtP(r.contact)+'</td><td>'+fmt0(r.ev)+'</td><td>'+(r.la!=null?r.la.toFixed(0)+'\u00b0':'-')+'</td><td>'+fmtP(r.brlp)+'</td><td>'+r.hrs+'</td></tr>';
    });
    html+='</tbody></table></div>';
  }
  html+='</div>';
  wbdContext.openModal(html);
};

// Original index.html:10638
wbdContext.renderBatterZonePitchFilter = function renderBatterZonePitchFilter(){
  const sel=document.getElementById('b-zone-pitch-filter');
  if(!sel||sel.options.length>1)return;
  const groups=[...new Set(wbdContext.getBatterDataFiltered().filter(d=>d.spdK>0).map(d=>wbdContext.pitchGroup(d.pType,d)))];
  groups.forEach(g=>{const o=document.createElement('option');o.value=g;o.textContent=g;sel.appendChild(o);});
};

// Original index.html:10644
wbdContext.renderBatterZonePitchTable = function renderBatterZonePitchTable(){
  const tbl=document.getElementById('b-zone-pitch-table');
  if(!tbl)return;
  const filter=document.getElementById('b-zone-pitch-filter').value;
  const all=wbdContext._passZoneSpdFilter(wbdContext.getBatterDataFiltered().filter(d=>d.spdK>0));
  const data=filter?all.filter(d=>wbdContext.pitchGroup(d.pType,d)===filter):all;
  const groups={};
  data.forEach(d=>{
    const g=wbdContext.pitchGroup(d.pType,d);
    const zone=wbdContext._zoneClass(d);
    const k=g+'|'+zone;
    if(!groups[k])groups[k]={group:g,zone,pitches:0,swings:0,whiffs:0,batted:0,hits:0,evSum:0,evCnt:0};
    groups[k].pitches++;
    if(wbdContext._isSwing(d))groups[k].swings++;
    if(wbdContext._isWhiff(d))groups[k].whiffs++;
    if(wbdContext._isInPlay(d)){groups[k].batted++;groups[k].evSum+=+d.ev;groups[k].evCnt++;}
    if(wbdContext._isHit(d))groups[k].hits++;
  });
  const rows=Object.values(groups).sort((a,b)=>b.pitches-a.pitches);
  let html='<thead><tr><th>구종</th><th>존</th><th>투구</th><th>스윙%</th><th>헛스윙%</th><th>타율</th><th>평균EV</th></tr></thead><tbody>';
  rows.forEach(r=>{
    const zoneColor=r.zone==='in'?'#39ff8a':'#ff8c44';
    const evAvg=r.evCnt>0?(r.evSum/r.evCnt).toFixed(1):'-';
    const avg=r.batted>0?(r.hits/r.batted).toFixed(3).replace(/^0/,''):'-';
    html+=`<tr><td style="color:${wbdContext.GROUP_COLORS[r.group]||'#888'}">${r.group}</td><td style="color:${zoneColor}">${r.zone==='in'?'인존':'아웃존'}</td><td>${r.pitches}</td><td>${wbdContext._pct(r.swings,r.pitches)}</td><td style="color:${r.whiffs/Math.max(1,r.swings)>0.35?'#ff4560':'inherit'}">${wbdContext._pct(r.whiffs,r.swings)}</td><td>${avg}</td><td>${evAvg}</td></tr>`;
  });
  tbl.innerHTML=html+'</tbody>';
};

// Original index.html:10674
wbdContext.renderBatterCountCategory = function renderBatterCountCategory(){
  const el=document.getElementById('b-count-category');
  if(!el)return;
  const all=wbdContext.getBatterDataFiltered().filter(d=>d.spdK>0);
  // 유리(2-0,3-0,3-1), 평가(0-0,1-0,1-1,2-1,3-2), 불리(0-1,0-2,1-2,2-2)
  const cats={
    '유리(타자)':{preds:[[2,0],[3,0],[3,1]],color:'#39ff8a'},
    '평가(평균)':{preds:[[0,0],[1,0],[1,1],[2,1],[3,2]],color:'#f5a623'},
    '불리(투수)':{preds:[[0,1],[0,2],[1,2],[2,2]],color:'#ff4560'}
  };
  let html='<div class="grid3">';
  Object.entries(cats).forEach(([name,c])=>{
    const arr=all.filter(d=>c.preds.some(([b,s])=>+d.ball===b && +d.strk===s));
    const pitches=arr.length;
    const swings=arr.filter(wbdContext._isSwing).length;
    const whiffs=arr.filter(wbdContext._isWhiff).length;
    const batted=arr.filter(wbdContext._isInPlay).length;
    const hits=arr.filter(wbdContext._isHit).length;
    const hrs=arr.filter(d=>d.result===4).length;
    const avg=batted>0?(hits/batted).toFixed(3).replace(/^0/,''):'-';
    const slg=batted>0?((arr.filter(d=>d['1BSafe']===1).length+hrs*3)/batted).toFixed(3).replace(/^0/,''):'-';
    html+=`<div class="card" style="border-left:3px solid ${c.color}">
      <div style="font-size:13px;font-weight:700;color:${c.color};margin-bottom:10px">${name}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px">${pitches}구 · ${batted}타구</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px">
        <div>타율: <span style="color:var(--amber);font-family:var(--mono)">${avg}</span></div>
        <div>장타율: <span style="color:var(--amber);font-family:var(--mono)">${slg}</span></div>
        <div>스윙률: <span style="color:var(--text);font-family:var(--mono)">${wbdContext._pct(swings,pitches)}</span></div>
        <div>헛스윙률: <span style="color:${whiffs/Math.max(1,swings)>0.3?'#ff4560':'var(--text)'};font-family:var(--mono)">${wbdContext._pct(whiffs,swings)}</span></div>
        <div>홈런: <span style="color:#ff9900;font-family:var(--mono)">${hrs}</span></div>
      </div>
    </div>`;
  });
  el.innerHTML=html+'</div>';
};

// Original index.html:10711
wbdContext._precisionClass = function _precisionClass(d){
  // WBD 스트라이크존: zoneX/zoneY 둘 다 -1~1 (공 반지름 ±0.06 고려로 경계 넘어도 스트라이크 가능)
  // 공 반지름 감안해서 보더라인은 0.85~1.15까지 포함 (공이 존 경계에 걸쳐있는 경우)
  const zx=Math.abs(+d.zoneX||0), zy=Math.abs(+d.zoneY||0);
  const rmax=Math.max(zx,zy);
  const isInZone=rmax<=1;
  // 중앙 실투: 존 깊숙이
  if(isInZone && rmax<=0.4)return 'middle';
  // 보더라인: 존 경계 (0.85~1.15, 공 반지름 고려)
  if(rmax>=0.85 && rmax<=1.15)return 'border';
  // 존 안: 살짝 / 굿존
  if(isInZone){
    if(rmax<=0.6)return 'slight';
    return 'good';
  }
  return 'ball';
};

// Original index.html:10728
wbdContext.renderPitcherPrecisionSummary = function renderPitcherPrecisionSummary(){
  const el=document.getElementById('p-precision-summary');
  if(!el)return;
  const all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0 && d.zoneX!=null);
  const classes={
    middle:{label:'🎯 중앙 실투',color:'#ff4560',desc:'존 한가운데 (|x|,|y|≤0.4)',explain:'가장 치기 좋은 코스. 실투 위험 매우 높음.'},
    slight:{label:'💢 살짝 몰림',color:'#ff8c44',desc:'중앙 근처 (0.4~0.6)',explain:'실투는 아니지만 치기 쉬운 위치. 주의 필요.'},
    good:{label:'✅ 굿존',color:'#f5d923',desc:'존 안쪽 양호구간 (0.6~0.85)',explain:'스트라이크면서 안전한 구간. 무난한 피칭.'},
    border:{label:'✨ 보더라인',color:'#39ff8a',desc:'존 경계 (0.85~1.15, 공반지름 포함)',explain:'경계선을 아슬하게 찌른 공. 타자가 치기 가장 어려움.'},
    ball:{label:'⚫ 볼(존밖)',color:'#5a7a9a',desc:'스트라이크 존 바깥 (>1.15)',explain:'유인구 의도 or 실투 구분 불가. 존 안 기준에서 제외.'}
  };
  const stats={};
  Object.keys(classes).forEach(k=>stats[k]={pitches:0,swings:0,whiffs:0,batted:0,hits:0,hrs:0,evSum:0,evCnt:0});
  all.forEach(d=>{
    const c=wbdContext._precisionClass(d);
    stats[c].pitches++;
    if(wbdContext._isSwing(d))stats[c].swings++;
    if(wbdContext._isWhiff(d))stats[c].whiffs++;
    if(wbdContext._isInPlay(d)){stats[c].batted++;stats[c].evSum+=+d.ev;stats[c].evCnt++;}
    if(wbdContext._isHit(d))stats[c].hits++;
    if(d.result===4)stats[c].hrs++;
  });
  const total=all.length;
  const inZoneTotal=stats.middle.pitches+stats.slight.pitches+stats.good.pitches+stats.border.pitches;
  // 필터 상태
  const sel=window.precisionPitchSel||{};
  const selectedGroups=Object.entries(sel).filter(([_,v])=>v).map(([k,_])=>k);
  const totalGroups=Object.keys(sel).length;
  const isFiltered=totalGroups>0&&selectedGroups.length<totalGroups&&selectedGroups.length>0;
  const filterNotice=isFiltered?`<div style="margin-top:6px;padding:4px 8px;background:#1a2f4a;border-radius:3px;font-size:11px;color:#88ccff">⚙️ 현재 구종 필터 적용 중: ${selectedGroups.join(', ')} (헤더 수치와 다를 수 있음)</div>`:'';
  // 설명 박스
  let html=`<div style="margin-bottom:12px;padding:10px 12px;background:var(--card2);border-left:3px solid #cc44ff;border-radius:4px;font-size:11px;line-height:1.6;color:var(--muted)">
    <div style="font-weight:700;color:#cc44ff;margin-bottom:4px">📖 제구 영역 분류란?</div>
    스트라이크존은 <b>zoneX, zoneY 둘 다 -1~1</b>. 공 반지름을 감안해 경계를 살짝 넘어가도 스트라이크가 됩니다. 5단계로 분류:<br>
    <span style="color:#ff4560;font-weight:700">🎯 중앙실투</span>(≤0.4, 위험) → <span style="color:#ff8c44;font-weight:700">💢 살짝몰림</span>(0.4~0.6) → <span style="color:#f5d923;font-weight:700">✅ 굿존</span>(0.6~0.85, 안전) → <span style="color:#39ff8a;font-weight:700">✨ 보더라인</span>(0.85~1.15, 공반지름 포함) → <span style="color:#5a7a9a;font-weight:700">⚫ 볼</span>(>1.15)<br>
    <span style="color:var(--amber);font-weight:700">큰 수치</span>는 <b>전체 투구 대비</b> · <span style="color:#cc88ff;font-weight:700">괄호 안</span>은 <b>볼 제외, 존 안 투구 중 비율</b>
    ${filterNotice}
  </div>`;
  html+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px">';
  Object.entries(classes).forEach(([k,c])=>{
    const s=stats[k];
    const avg=s.batted>0?(s.hits/s.batted).toFixed(3).replace(/^0/,''):'-';
    const evAvg=s.evCnt>0?(s.evSum/s.evCnt).toFixed(1):'-';
    const isBad=k==='middle'||k==='slight';
    const isBall=k==='ball';
    const inZonePct=(!isBall&&inZoneTotal>0)?(s.pitches/inZoneTotal*100).toFixed(1)+'%':null;
    const mainPct=wbdContext._pct(s.pitches,total);
    html+=`<div class="card" style="border-left:3px solid ${c.color};padding:10px">
      <div style="font-size:11px;font-weight:700;color:${c.color};margin-bottom:2px">${c.label}</div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:6px;line-height:1.3">${c.desc}</div>
      <div style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap">
        <div style="font-family:var(--mono);font-size:20px;color:${isBad?'#ff4560':'var(--amber)'}">${mainPct}</div>
        ${inZonePct?`<div style="font-family:var(--mono);font-size:12px;color:#cc88ff">(${inZonePct})</div>`:''}
      </div>
      <div style="font-size:9px;color:var(--muted);margin-bottom:6px">${s.pitches}구${inZonePct?` · 존안중`:''}</div>
      <div style="font-size:10px;line-height:1.7;border-top:1px dashed var(--border);padding-top:4px">
        <div>피안타율: <span style="color:${isBad&&+avg>0.3?'#ff4560':'var(--text)'};font-family:var(--mono)">${avg}</span></div>
        <div>피홈런: <span style="color:#ff9900;font-family:var(--mono)">${s.hrs}</span></div>
        <div>헛스윙률: <span style="color:var(--green);font-family:var(--mono)">${wbdContext._pct(s.whiffs,s.swings)}</span></div>
        <div>평균EV: <span style="font-family:var(--mono)">${evAvg}</span></div>
      </div>
      <div style="margin-top:6px;padding-top:4px;border-top:1px solid var(--border);font-size:9px;color:var(--muted);line-height:1.3">💡 ${c.explain}</div>
    </div>`;
  });
  const mistakeRate=stats.middle.pitches/Math.max(1,total)*100;
  const mistakeInZoneRate=inZoneTotal>0?(stats.middle.pitches/inZoneTotal*100):0;
  // 존 안 기준 등급 (리그 p10=6.8, p50=15.1, p75=20.0, p90=25.1)
  const grade=mistakeInZoneRate<8?'🥇 매우 우수':mistakeInZoneRate<14?'🥈 우수':mistakeInZoneRate<20?'🥉 평균':'⚠ 불안정';
  html+='</div>';
  html+=`<div style="margin-top:14px;padding:12px;background:#0a1828;border:1px solid var(--border);border-radius:6px;font-size:12px">
    <span style="color:var(--muted)">실투율 평가(존 안 기준): </span><span style="color:var(--amber);font-weight:700">${grade}</span>
    <span style="color:var(--muted);margin-left:14px">존내 실투율 ${mistakeInZoneRate.toFixed(1)}% <span style="color:#666">· 리그 평균 15.1%</span> · 낮을수록 제구가 좋음</span>
  </div>`;
  el.innerHTML=html;
};

// Original index.html:10805
wbdContext.renderPitcherPrecisionPitchTable = function renderPitcherPrecisionPitchTable(){
  const tbl=document.getElementById('p-precision-pitch-table');
  if(!tbl)return;
  const all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0 && d.zoneX!=null);
  const groups={};
  all.forEach(d=>{
    const g=wbdContext.pitchGroup(d.pType,d);
    if(!groups[g])groups[g]={g,total:0,middle:0,border:0,mHits:0,mBatted:0,bHits:0,bBatted:0,zxArr:[],zyArr:[]};
    groups[g].total++;
    const c=wbdContext._precisionClass(d);
    if(c==='middle'){
      groups[g].middle++;
      if(wbdContext._isInPlay(d)){groups[g].mBatted++;if(wbdContext._isHit(d))groups[g].mHits++;}
    }
    if(c==='border'){
      groups[g].border++;
      if(wbdContext._isInPlay(d)){groups[g].bBatted++;if(wbdContext._isHit(d))groups[g].bHits++;}
    }
    groups[g].zxArr.push(+d.zoneX||0);
    groups[g].zyArr.push(+d.zoneY||0);
  });
  const std=arr=>{if(arr.length<2)return 0;const m=arr.reduce((a,b)=>a+b,0)/arr.length;return Math.sqrt(arr.reduce((s,v)=>s+(v-m)*(v-m),0)/arr.length);};
  const rows=Object.values(groups).filter(r=>r.total>=5).sort((a,b)=>b.total-a.total);
  let html='<thead><tr><th>구종</th><th>투구수</th><th>실투율</th><th>보더라인율</th><th>실투 피안타율</th><th>보더라인 피안타율</th><th>제구 편차(zx)</th><th>제구 편차(zy)</th></tr></thead><tbody>';
  rows.forEach(r=>{
    const mRate=r.middle/r.total*100;
    const bRate=r.border/r.total*100;
    const mAvg=r.mBatted>0?(r.mHits/r.mBatted).toFixed(3).replace(/^0/,''):'-';
    const bAvg=r.bBatted>0?(r.bHits/r.bBatted).toFixed(3).replace(/^0/,''):'-';
    html+=`<tr>
      <td style="color:${wbdContext.GROUP_COLORS[r.g]||'#888'}">${r.g}</td>
      <td>${r.total}</td>
      <td style="color:${mRate>20?'#ff4560':mRate>10?'#f5a623':'#39ff8a'}">${mRate.toFixed(1)}%</td>
      <td style="color:#39ff8a">${bRate.toFixed(1)}%</td>
      <td style="color:${+mAvg>0.3?'#ff4560':'inherit'}">${mAvg}</td>
      <td>${bAvg}</td>
      <td>${std(r.zxArr).toFixed(2)}</td>
      <td>${std(r.zyArr).toFixed(2)}</td>
    </tr>`;
  });
  tbl.innerHTML=html+'</tbody>';
};

// Original index.html:10849
wbdContext.renderPitcherPrecisionFilter = function renderPitcherPrecisionFilter(){
  // 이전 버전 호환용 — 이제 mapPitchToggles로 대체
};

// Original index.html:10852
wbdContext.renderPitcherPrecisionMap = function renderPitcherPrecisionMap(){
  const el=document.getElementById('p-precision-map');
  if(!el)return;
  const metric=document.getElementById('p-precision-metric').value;
  wbdContext.renderMapPitchToggles('p');
  let all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0 && d.zoneX!=null);
  all=all.filter(d=>wbdContext._passMapPitchFilter('p',d));
  const cells={};
  const getCell=(zx,zy)=>{
    let col=Math.floor((zx+2)/0.8), row=Math.floor((2-zy)/0.8);
    col=Math.max(0,Math.min(4,col));row=Math.max(0,Math.min(4,row));
    return [col,row];
  };
  all.forEach(d=>{
    const [c,r]=getCell(+d.zoneX,+d.zoneY||0);
    const k=c+','+r;
    if(!cells[k])cells[k]={pitches:0,swings:0,whiffs:0,batted:0,hits:0,hrs:0,evSum:0,evCnt:0,laSum:0,laCnt:0,hhN:0,hhpN:0,brlN:0,brlpN:0};
    cells[k].pitches++;
    if(wbdContext._isSwing(d))cells[k].swings++;
    if(wbdContext._isWhiff(d))cells[k].whiffs++;
    if(wbdContext._isInPlay(d)){
      cells[k].batted++;cells[k].evSum+=+d.ev;cells[k].evCnt++;
      const _la=+d.ldeg; if(d.ldeg!=null&&!isNaN(_la)){cells[k].laSum+=_la;cells[k].laCnt++;}
      if(wbdContext._isHardHit(d))cells[k].hhN++;
      if(wbdContext._isHHPlus(d))cells[k].hhpN++;
      if(+d.ev>=105&&_la>=8&&_la<=32)cells[k].brlN++;
      if(wbdContext._isBarrelPlus(d))cells[k].brlpN++;
    }
    if(wbdContext._isHit(d))cells[k].hits++;
    if(d.result===4)cells[k].hrs++;
  });
  const cellVals=[];
  Object.values(cells).forEach(c=>{
    if(metric==='count')cellVals.push(c.pitches);
    else if(metric==='avg'&&c.batted>=2)cellVals.push(c.hits/c.batted);
    else if(metric==='whiff'&&c.swings>=2)cellVals.push(c.whiffs/c.swings);
    else if(metric==='ev'&&c.evCnt>=2)cellVals.push(c.evSum/c.evCnt);
    else if(metric==='la'&&c.laCnt>=2)cellVals.push(c.laSum/c.laCnt);
    else if(metric==='hh'&&c.batted>=2)cellVals.push(c.hhN/c.batted);
    else if(metric==='hhp'&&c.batted>=2)cellVals.push(c.hhpN/c.batted);
    else if(metric==='brl'&&c.batted>=2)cellVals.push(c.brlN/c.batted);
    else if(metric==='brlp'&&c.batted>=2)cellVals.push(c.brlpN/c.batted);
  });
  const minV=Math.min(...cellVals,0), maxV=Math.max(...cellVals,1);
  const S=56, W=S*5+2, H=S*5+2;
  let items='';
  for(let r=0;r<5;r++){
    for(let c=0;c<5;c++){
      const cell=cells[c+','+r];
      const x=c*S+1, y=r*S+1;
      const isInZone=(c>=1&&c<=3&&r>=1&&r<=3);
      const border=isInZone?'#f5a623':'#2a4060';
      let fill='#0a1828', text='', sub='';
      if(cell){
        let v=null;
        if(metric==='count'){v=cell.pitches;text=cell.pitches;}
        else if(metric==='avg'&&cell.batted>=1){v=cell.hits/cell.batted;text=v.toFixed(3).replace(/^0/,'');}
        else if(metric==='whiff'&&cell.swings>=1){v=cell.whiffs/cell.swings;text=(v*100).toFixed(0)+'%';}
        else if(metric==='ev'&&cell.evCnt>=1){v=cell.evSum/cell.evCnt;text=v.toFixed(0);}
        else if(metric==='la'&&cell.laCnt>=1){v=cell.laSum/cell.laCnt;text=v.toFixed(0)+'°';}
        else if(metric==='hh'&&cell.batted>=1){v=cell.hhN/cell.batted;text=(v*100).toFixed(0)+'%';}
        else if(metric==='hhp'&&cell.batted>=1){v=cell.hhpN/cell.batted;text=(v*100).toFixed(0)+'%';}
        else if(metric==='brl'&&cell.batted>=1){v=cell.brlN/cell.batted;text=(v*100).toFixed(0)+'%';}
        else if(metric==='brlp'&&cell.batted>=1){v=cell.brlpN/cell.batted;text=(v*100).toFixed(0)+'%';}
        if(v!==null){
          // 절대 기준 팔레트 사용. 투수 관점이므로 일부 지표는 반대로 (타자 피안타율 높음=투수에겐 콜드=파랑)
          let score;
          if(metric==='count'){
            // 빈도는 상대 정규화 유지
            const norm=Math.max(0,Math.min(1,(v-minV)/Math.max(0.001,maxV-minV)));
            score=norm;
          } else if(metric==='avg'||metric==='ev'){
            // 피안타율/피EV 높으면 투수에겐 나쁨 → 타자관점 점수를 반전
            score=1-wbdContext._absHotScore(metric,v);
          } else if(metric==='la'){
            // 피발사각: 낮을수록(땅볼) 투수에게 좋음 → 높으면 나쁨(콜드=파랑 아님, 투수 핫=빨강은 나쁜쪽)
            const norm=Math.max(0,Math.min(1,(v+20)/60));
            score=norm;
          } else if(metric==='hh'||metric==='hhp'||metric==='brl'||metric==='brlp'){
            // 강타 허용률: 높을수록 투수에게 나쁨
            const norm=Math.max(0,Math.min(1,(v-minV)/Math.max(0.001,maxV-minV)));
            score=norm;
          } else if(metric==='whiff'){
            // 헛스윙률 높으면 투수에겐 좋음 → 타자관점(낮으면 핫)을 반전한 원래 점수 그대로 씀
            // 즉 whiff값이 높을수록 투수 입장 핫(빨강)
            // _absHotScore에서 whiff는 낮을수록 1(타자핫)이므로 뒤집는다
            score=1-wbdContext._absHotScore(metric,v);
          }
          fill=wbdContext._hotColdPalette(score);
        }
        sub=cell.pitches+'구';
      }
      items+=`<g class="pp-cell" data-c="${c}" data-r="${r}">`;
      items+=`<rect x="${x}" y="${y}" width="${S-2}" height="${S-2}" fill="${fill}" stroke="${border}" stroke-width="${isInZone?1.5:0.8}" rx="2"/>`;
      const txtCol=wbdContext._textForBg(fill);
      const subCol=wbdContext._textForBg(fill)==='#222'?'rgba(0,0,0,0.55)':'rgba(255,255,255,0.6)';
      if(text)items+=`<text x="${x+S/2}" y="${y+S/2+2}" fill="${txtCol}" font-size="13" font-weight="700" text-anchor="middle" font-family="Share Tech Mono">${text}</text>`;
      if(sub&&metric!=='count')items+=`<text x="${x+S/2}" y="${y+S-6}" fill="${subCol}" font-size="8" text-anchor="middle">${sub}</text>`;
      items+=`</g>`;
    }
  }
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${items}</svg>
    <div style="margin-top:8px;font-size:10px;color:var(--muted)">🟧 가운데 3×3 = 인존 · 투수 시점</div>`;
  el.querySelectorAll('.pp-cell').forEach(g=>{
    const c=+g.dataset.c, r=+g.dataset.r;
    const cell=cells[c+','+r];
    if(!cell)return;
    g.style.cursor='pointer';
    g.addEventListener('mouseenter',e=>{
      const avg=cell.batted>0?(cell.hits/cell.batted).toFixed(3).replace(/^0/,''):'-';
      const evA=cell.evCnt>0?(cell.evSum/cell.evCnt).toFixed(1):'-';
      wbdContext.showTip(e,`<b>존 [${c+1},${r+1}]</b><br>
        투구수: ${cell.pitches}<br>
        헛스윙률: ${wbdContext._pct(cell.whiffs,cell.swings)}<br>
        피안타: ${cell.hits}/${cell.batted} (${avg})<br>
        피홈런: ${cell.hrs}<br>
        평균EV: ${evA}`);
    });
    g.addEventListener("mousemove",wbdContext.moveTip);
    g.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:10976
wbdContext.renderPitcherCountStrategy = function renderPitcherCountStrategy(){
  const el=document.getElementById('p-count-strategy');
  if(!el)return;
  const all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0);
  const cats={
    '초구(0-0)':{preds:[[0,0]],color:'#2196f3'},
    '유리(투수)':{preds:[[0,1],[0,2],[1,2],[2,2]],color:'#39ff8a'},
    '불리(투수)':{preds:[[2,0],[3,0],[3,1]],color:'#ff4560'}
  };
  let html='';
  Object.entries(cats).forEach(([name,c])=>{
    const arr=all.filter(d=>c.preds.some(([b,s])=>+d.ball===b && +d.strk===s));
    const topPitch={};
    arr.forEach(d=>{const g=wbdContext.pitchGroup(d.pType,d);topPitch[g]=(topPitch[g]||0)+1;});
    const sorted=Object.entries(topPitch).sort((a,b)=>b[1]-a[1]).slice(0,3);
    const inZone=arr.filter(d=>wbdContext._zoneClass(d)==='in').length;
    const whiffs=arr.filter(wbdContext._isWhiff).length;
    const swings=arr.filter(wbdContext._isSwing).length;
    html+=`<div style="margin-bottom:12px;padding:10px;background:#0a1828;border-left:3px solid ${c.color};border-radius:4px">
      <div style="font-size:12px;font-weight:700;color:${c.color};margin-bottom:6px">${name} · ${arr.length}구</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--muted);margin-bottom:6px">
        <span>존 비율: <span style="color:var(--amber);font-family:var(--mono)">${wbdContext._pct(inZone,arr.length)}</span></span>
        <span>헛스윙률: <span style="color:var(--green);font-family:var(--mono)">${wbdContext._pct(whiffs,swings)}</span></span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${sorted.map(([g,n])=>`<span style="font-size:11px;padding:2px 8px;background:${wbdContext.GROUP_COLORS[g]||'#888'}33;color:${wbdContext.GROUP_COLORS[g]||'#888'};border-radius:3px">${g} ${(n/arr.length*100).toFixed(0)}%</span>`).join('')}</div>
    </div>`;
  });
  el.innerHTML=html;
};

// Original index.html:11007
wbdContext.renderPitcherSequenceTable = function renderPitcherSequenceTable(){
  const tbl=document.getElementById('p-sequence-table');
  if(!tbl)return;
  const all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0).sort((a,b)=>(+a.id||0)-(+b.id||0));
  const seqs={};
  for(let i=1;i<all.length;i++){
    const prev=all[i-1], curr=all[i];
    // 같은 타자 상대인지 (타자 바뀌면 시퀀스 끊김)
    if(prev.bName!==curr.bName)continue;
    const g1=wbdContext.pitchGroup(prev.pType,prev), g2=wbdContext.pitchGroup(curr.pType,curr);
    const k=g1+' → '+g2;
    if(!seqs[k])seqs[k]={g1,g2,count:0,swings:0,whiffs:0,hits:0,batted:0};
    seqs[k].count++;
    if(wbdContext._isSwing(curr))seqs[k].swings++;
    if(wbdContext._isWhiff(curr))seqs[k].whiffs++;
    if(wbdContext._isInPlay(curr)){seqs[k].batted++;if(wbdContext._isHit(curr))seqs[k].hits++;}
  }
  const rows=Object.entries(seqs).sort((a,b)=>b[1].count-a[1].count).slice(0,10);
  let html='<thead><tr><th>시퀀스</th><th>빈도</th><th>헛스윙률</th><th>피안타율</th></tr></thead><tbody>';
  rows.forEach(([k,r])=>{
    const avg=r.batted>0?(r.hits/r.batted).toFixed(3).replace(/^0/,''):'-';
    html+=`<tr>
      <td><span style="color:${wbdContext.GROUP_COLORS[r.g1]||'#888'}">${r.g1}</span> → <span style="color:${wbdContext.GROUP_COLORS[r.g2]||'#888'}">${r.g2}</span></td>
      <td>${r.count}</td>
      <td style="color:${r.whiffs/Math.max(1,r.swings)>0.35?'#39ff8a':'inherit'}">${wbdContext._pct(r.whiffs,r.swings)}</td>
      <td>${avg}</td>
    </tr>`;
  });
  tbl.innerHTML=html+'</tbody>';
};

// Original index.html:11039
wbdContext.renderPitcherLRSplit = function renderPitcherLRSplit(){
  const tbl=document.getElementById('p-lr-split-table');
  if(!tbl)return;
  const all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0 && (d.bZone==='L'||d.bZone==='R'));
  const stats={R:{label:'우타 상대',pitches:0,swings:0,whiffs:0,batted:0,hits:0,hrs:0,bb:0,ks:0},
               L:{label:'좌타 상대',pitches:0,swings:0,whiffs:0,batted:0,hits:0,hrs:0,bb:0,ks:0}};
  all.forEach(d=>{
    const s=stats[d.bZone];
    s.pitches++;
    if(wbdContext._isSwing(d))s.swings++;
    if(wbdContext._isWhiff(d))s.whiffs++;
    if(wbdContext._isInPlay(d))s.batted++;
    if(wbdContext._isHit(d))s.hits++;
    if(d.result===4)s.hrs++;
    if(d.result===5)s.bb++;
    if(wbdContext._isK(d))s.ks++;
  });
  const data=Object.entries(stats).map(([k,s])=>({
    zone:k, label:s.label, pitches:s.pitches,
    avg:s.batted>0?s.hits/s.batted:0,
    whiff:s.swings>0?s.whiffs/s.swings*100:0,
    hrs:s.hrs, ks:s.ks, bb:s.bb
  }));
  const sorted=wbdContext._applyTblSort('p-lr-split-table', data, (r,k)=>r[k]);
  const sh=(k,l)=>wbdContext._sortHeader('p-lr-split-table',k,l,'renderPitcherLRSplit');
  let html=`<thead><tr>${sh('label','구분')}${sh('pitches','투구')}${sh('avg','피안타율')}${sh('whiff','헛스윙률')}${sh('hrs','피홈런')}${sh('ks','K')}${sh('bb','BB')}</tr></thead><tbody>`;
  sorted.forEach(r=>{
    const avgStr=r.avg>0?r.avg.toFixed(3).replace(/^0/,''):'-';
    html+=`<tr><td style="color:${r.zone==='L'?'#44aaff':'#ff6b6b'}">${r.label}</td><td>${r.pitches}</td><td>${avgStr}</td><td>${r.whiff.toFixed(0)}%</td><td style="color:#ff9900">${r.hrs}</td><td>${r.ks}</td><td>${r.bb}</td></tr>`;
  });
  tbl.innerHTML=html+'</tbody>';
};

// Original index.html:11073
wbdContext.renderPitcherFatigue = function renderPitcherFatigue(){
  const tbl=document.getElementById('p-fatigue-table');
  if(!tbl)return;
  const all=wbdContext.getPitcherDataForPrecision().filter(d=>d.spdK>0);
  // 게임별로 pCnt 정렬 후 구간 분류
  const bands=[{label:'1-15구',min:0,max:14},{label:'16-30구',min:15,max:29},{label:'31-45구',min:30,max:44},{label:'46+구',min:45,max:999}];
  const stats=bands.map(b=>({...b,spd:[],hits:0,batted:0,bb:0,ks:0,pitches:0}));
  all.forEach(d=>{
    const c=+d.pCnt||0;
    const band=stats.find(b=>c>=b.min&&c<=b.max);
    if(!band)return;
    band.pitches++;
    if(d.spdK>0)band.spd.push(+d.spdK);
    if(wbdContext._isInPlay(d))band.batted++;
    if(wbdContext._isHit(d))band.hits++;
    if(d.result===5||d.result===6)band.bb++;
    if(wbdContext._isK(d))band.ks++;
  });
  const avg=arr=>arr.length?(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1):'-';
  let html='<thead><tr><th>구간</th><th>투구</th><th>평균구속</th><th>피안타율</th><th>K</th><th>BB</th></tr></thead><tbody>';
  stats.forEach(s=>{
    if(s.pitches===0)return;
    const ba=s.batted>0?(s.hits/s.batted).toFixed(3).replace(/^0/,''):'-';
    html+=`<tr><td>${s.label}</td><td>${s.pitches}</td><td style="font-family:var(--mono)">${avg(s.spd)}</td><td>${ba}</td><td>${s.ks}</td><td>${s.bb}</td></tr>`;
  });
  tbl.innerHTML=html+'</tbody>';
};
}

export function initialize(wbdContext) {

}
