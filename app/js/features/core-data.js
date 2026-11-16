/** core-data: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:2252
wbdContext.pitchGroup = function pitchGroup(t,d){if(d!==undefined){const isFb=[0,26,27,28,29,30,31,32,33,34,35,36,37].includes(+t);if(isFb&&(+d.sH||0)===0&&(+d.sV||0)===0)return'패스트볼';}for(const[g,arr]of Object.entries(wbdContext.PITCH_GROUPS)){if(arr.includes(+t))return g;}return'기타';};

// Original index.html:2267
wbdContext.rebuildG = function rebuildG(){
  wbdContext.G=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).flatMap(g=>g.pitches);
  wbdContext._rebuildCaches();
};

// Original index.html:2289
wbdContext._rebuildCaches = function _rebuildCaches(){
  const c = window._cache;
  c.generation++;
  // V11.3: 팀 탭/리그 비교용 파생 캐시도 함께 무효화 (G.length가 같아도 내용이 바뀔 수 있음)
  window._lgInPlayCache=null; window._lgBBQCache=null; window._lgDirCache=null;
  window._teamPitchCache=null; window._teamProfCache=null; window._gIdxMap=null; window._formCache=null;
  window._bbqLeagueCache=null; window._scoutLeagueCache=null; window._teamScoutLeagueCache=null;
  window._defenseDataCache=null; window._lgDefCache=null; window._lgClutchCache=null; window._ifPassCache=null; window._lgDefStatsCacheMap=null;

  c.pitcherData = {};
  c.batterData = {};
  c.pitcherCard = {};
  c.batterCard = {};
  c.pitcherWAR = {};
  c.batterWAR = {};
  c.autoTeam = {};
  
  // 1. 선수별 데이터 인덱싱 (G를 한 번만 순회)
  const teamCntByPlayer = {};  // 자동 팀 계산용
  wbdContext.GAMES.forEach(g => {
    if(!wbdContext.activeGameIds.has(g.id)) return;
    const info = wbdContext._parseGameName(g.name);
    const tA = wbdContext._normalizeTeam(info.teamA);
    const tB = wbdContext._normalizeTeam(info.teamB);
    g.pitches.forEach(d => {
      // 선수별 인덱스
      if(d.pName){
        const k = wbdContext._canonPlayer(d.pName);  // V11.1: 닉변/계정변경 병합
        if(!c.pitcherData[k]) c.pitcherData[k] = [];
        c.pitcherData[k].push(d);
        // 자동 팀 카운트
        const team = d.half===1 ? tB : tA;
        if(team){
          const key = k + '|pitcher';
          if(!teamCntByPlayer[key]) teamCntByPlayer[key] = {};
          teamCntByPlayer[key][team] = (teamCntByPlayer[key][team]||0) + 1;
        }
      }
      if(d.bName){
        const k = wbdContext._canonPlayer(d.bName);  // V11.1: 닉변/계정변경 병합
        if(!c.batterData[k]) c.batterData[k] = [];
        c.batterData[k].push(d);
        const team = d.half===1 ? tA : tB;
        if(team){
          const key = k + '|batter';
          if(!teamCntByPlayer[key]) teamCntByPlayer[key] = {};
          teamCntByPlayer[key][team] = (teamCntByPlayer[key][team]||0) + 1;
        }
      }
    });
  });
  
  c.pitcherNames = Object.keys(c.pitcherData).sort();
  c.batterNames = Object.keys(c.batterData).sort();
  
  // 자동 팀 = 최다 카운트
  Object.entries(teamCntByPlayer).forEach(([key, cnts]) => {
    const sorted = Object.entries(cnts).sort((a,b) => b[1]-a[1]);
    if(sorted.length) c.autoTeam[key] = sorted[0][0];
  });
};

// Original index.html:2352
wbdContext.getPitcherDataByName = function getPitcherDataByName(name){return window._cache.pitcherData[String(name)] || [];};

// Original index.html:2353
wbdContext.getBatterDataByName = function getBatterDataByName(name){return window._cache.batterData[String(name)] || [];};

// Original index.html:2357
wbdContext._gameFingerprint = function _gameFingerprint(pitches){
  if(!pitches || !pitches.length) return '';
  // 빠른 처리를 위해 첫 5구 + 가운데 5구 + 마지막 5구 + 총수로 압축
  // (전체 해시는 큰 게임에서 느릴 수 있음. 이 정도로도 우연 일치 확률 거의 0)
  const sample = (arr) => arr.map(d => 
    `${d.inn}|${d.half}|${d.bName}|${d.pName}|${d.pType}|${d.spdK}|${d.call}|${d.result}|${d.ev||0}`
  ).join('§');
  const n = pitches.length;
  const head = pitches.slice(0, 5);
  const mid = pitches.slice(Math.floor(n/2)-2, Math.floor(n/2)+3);
  const tail = pitches.slice(-5);
  return `${n}::${sample(head)}::${sample(mid)}::${sample(tail)}`;
};

// Original index.html:2373
wbdContext._filenameScore = function _filenameScore(filename){
  const info = wbdContext._parseGameName(filename || '');
  let score = 0;
  if(info.date) score += 10;  // 날짜 있음
  if(info.teamA && info.teamA !== 'Team A') score += 5;  // 진짜 팀명
  if(info.teamB && info.teamB !== 'Team B') score += 5;
  return score;
};

// Original index.html:2396
wbdContext._markFieldersChoice = function _markFieldersChoice(pitches){
  for(let i=0; i<pitches.length; i++){
    const d = pitches[i];
    if(+d['1BSafe'] !== 1) continue;      // 타자가 1루 세이프인 경우만 대상
    if(+d.result === 4) continue;          // 홈런 제외
    const bIdx = String(d.bIdx);
    for(const slot of ['out1','out2','out3']){
      const codeRaw = d[slot+'Code'];
      if(codeRaw==null || codeRaw==='') continue;   // 구 데이터: 컬럼 없음 → 판정 스킵
      const code = +codeRaw;
      if(!isFinite(code)) continue;
      const method = (code >> 7) & 0x7;
      if(method !== 1) continue;                    // 포스아웃(1)만
      const outIdx = d[slot+'BatterIndex'];
      if(outIdx==null || outIdx==='') continue;
      if(String(outIdx) === bIdx) continue;         // 타자 본인 아웃은 이미 1BSafe=0 처리됨
      d._isFC = true;                               // 선행주자 포스아웃 → 야수선택
      break;
    }
  }
};

// Original index.html:2423
wbdContext._markPaEnds = function _markPaEnds(pitches){
  for(let i=0;i<pitches.length;i++){
    const d=pitches[i], nx=pitches[i+1], r=+d.result;
    d._paEnd = !nx || (r>=4&&r<=6) || d.inn!==nx.inn || d.half!==nx.half || d.bName!==nx.bName;
  }
};

// Original index.html:2429
wbdContext._classifyHitTypes = function _classifyHitTypes(pitches){
  const EMPTY = v => v==null || v==='255' || +v===255;
  wbdContext._markPaEnds(pitches);           // V12.0: 타석 종료 플래그 (경기 단위 1회)
  wbdContext._markFieldersChoice(pitches);   // V11.3: 야수선택 먼저 판정
  for(let i=0; i<pitches.length; i++){
    const d = pitches[i];
    if(+d['1BSafe'] !== 1) continue;
    if(+d.result === 4){ d._hitBase = 4; d._hitBaseConf = 'exact'; continue; }  // 홈런
    if(d._isFC){ continue; }   // 야수선택은 안타가 아니므로 루타수 분류 대상 아님
    
    const inn = d.inn, half = d.half;
    const prevBases = new Set([d.b1Idx, d.b2Idx, d.b3Idx].filter(x => !EMPTY(x)).map(String));
    
    // 같은 이닝/하프의 다음 타석 첫 투구 찾기
    let nxt = null;
    for(let j=i+1; j<Math.min(i+40, pitches.length); j++){
      const nr = pitches[j];
      if(nr.inn !== inn || nr.half !== half) break;  // 이닝 종료
      if(nr.bName !== d.bName){ nxt = nr; break; }
    }
    
    if(!nxt){
      d._hitBase = 1; d._hitBaseConf = 'inning_end';  // 3아웃 직전 안타 — 보수적 1루타
      continue;
    }
    
    const newB = {1: nxt.b1Idx, 2: nxt.b2Idx, 3: nxt.b3Idx};
    const newIds = new Set(Object.values(newB).filter(x => !EMPTY(x)).map(String));
    const added = [...newIds].filter(x => !prevBases.has(x));
    
    if(added.length === 1){
      const bid = added[0];
      const base = +Object.keys(newB).find(b => String(newB[b]) === bid);
      d._hitBase = base; d._hitBaseConf = 'exact';
    } else {
      // 타자가 베이스에 없음 (주루사/홈인) 또는 모호 — 타구 거리로 추정
      const lx = +d.lx || 0, lz = +d.lz || 0;
      const dist = Math.sqrt(lx*lx + (lz+20)*(lz+20));  // HP는 lz=-20
      d._hitBase = dist >= 90 ? 2 : 1;  // WBD 측정: 2루타 99m+, 1루타 대부분 <90m
      d._hitBaseConf = 'estimated';
    }
  }
};

// Original index.html:2475
wbdContext._isHitPlay = function _isHitPlay(d){
  if(+d.result === 4) return true;                 // 홈런
  if(+d['1BSafe'] !== 1) return false;             // 1루 세이프 아니면 안타 아님
  if(d._isFC) return false;                        // V11.3: 선행주자 포스아웃 = 야수선택
  return true;
};

// Original index.html:2486
wbdContext._dpOutCount = function _dpOutCount(d){
  let n = 0;
  for(const slot of ['out1','out2','out3']){
    const raw = d[slot+'Code'];
    if(raw==null || raw==='') continue;
    const code = +raw;
    if(!isFinite(code)) continue;
    const method = (code >> 7) & 0x7;
    if(method === 4) continue;          // 삼진 제외
    n++;
  }
  return n;
};

// Original index.html:2500
wbdContext._hasForceOut = function _hasForceOut(d){
  for(const slot of ['out1','out2','out3']){
    const raw = d[slot+'Code'];
    if(raw==null || raw==='') continue;
    const code = +raw;
    if(!isFinite(code)) continue;
    if(((code >> 7) & 0x7) === 1) return true;   // 방식 1 = 포스
  }
  return false;
};

// Original index.html:2510
wbdContext._isDP = function _isDP(d){  return (+d.ev>0) && wbdContext._dpOutCount(d) === 2 && wbdContext._hasForceOut(d); };

// Original index.html:2511
wbdContext._isTP = function _isTP(d){  return (+d.ev>0) && wbdContext._dpOutCount(d) >= 3 && wbdContext._hasForceOut(d); };

// Original index.html:2512
wbdContext._isGIDP = function _isGIDP(d){ return wbdContext._isDP(d) && +d.result === 2; };

// Original index.html:2516
wbdContext._totalBases = function _totalBases(arr){
  let tb = 0;
  arr.forEach(d => {
    if(wbdContext._isHit(d)){   // V12.0: 통합 안타 정의 (낫아웃 출루 제외)
      tb += d._hitBase || (+d.result===4 ? 4 : 1);
    }
  });
  return tb;
};

// Original index.html:2526
wbdContext.addGame = function addGame(text,filename,meta){
  const _tAdd = performance.now();
  try{
    const pitches=wbdContext.parseCSV(text);
    if(!pitches.length)throw new Error('데이터 없음');
    wbdContext._classifyHitTypes(pitches);  // V10.1: 안타 종류 분류 (d._hitBase)
    
    // V10.0: 중복 감지 — 콘텐츠 지문이 같은 기존 게임 찾기
    const fp = wbdContext._gameFingerprint(pitches);
    if(fp){
      const newScore = wbdContext._filenameScore(filename);
      for(let i = 0; i < wbdContext.GAMES.length; i++){
        const existing = wbdContext.GAMES[i];
        const exFp = existing._fp || wbdContext._gameFingerprint(existing.pitches);
        existing._fp = exFp;  // 캐시
        if(exFp === fp){
          // 동일 게임 발견 — 메타데이터 풍부도 비교
          const oldScore = wbdContext._filenameScore(existing.name);
          if(newScore > oldScore){
            // 새 파일이 더 풍부 → 기존 제거하고 새로 추가
            console.log(`[중복 제거] "${existing.name}" → "${filename}" (메타 풍부)`);
            wbdContext.activeGameIds.delete(existing.id);
            wbdContext.GAMES.splice(i, 1);
            break;  // 추가 진행
          } else {
            // 기존이 같거나 더 풍부 → 새 게임 추가 안 함
            console.log(`[중복 무시] "${filename}" (기존 "${existing.name}" 유지)`);
            const err = new Error('DUPLICATE');
            err.code = 'DUPLICATE';
            err.existing = existing.name;
            throw err;
          }
        }
      }
    }
    
    const id='g'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    meta=meta||{};
    const serverMeta={
      source:meta.source||'local',
      category:meta.category||'',
      categoryName:meta.categoryName||'',
      groupId:meta.groupId||meta._groupId||'',
      groupName:meta.groupName||meta._group||'',
      path:meta.path||''
    };
    pitches.forEach(p=>{
      p._gameId=id;p._gameName=filename;
      p._source=serverMeta.source;
      p._category=serverMeta.category;
      p._categoryName=serverMeta.categoryName;
      p._groupId=serverMeta.groupId;
      p._groupName=serverMeta.groupName;
      p._serverPath=serverMeta.path;
    });
    const game={id,name:filename,pitches,_fp:fp,...serverMeta};
    wbdContext.GAMES.push(game);
    window._parseMs = (window._parseMs||0) + (performance.now()-_tAdd);
    wbdContext.activeGameIds.add(id);
    return game;
  }catch(e){throw e;}
};

// Original index.html:2594
wbdContext._fastCell = function _fastCell(s){
  if(!s)return '';
  // 시작 공백
  let a=0, b=s.length;
  while(a<b && (s.charCodeAt(a)===32||s.charCodeAt(a)===9||s.charCodeAt(a)===13))a++;
  while(b>a && (s.charCodeAt(b-1)===32||s.charCodeAt(b-1)===9||s.charCodeAt(b-1)===13))b--;
  if(a>=b)return '';
  // 따옴표 양끝
  const c1=s.charCodeAt(a), c2=s.charCodeAt(b-1);
  if((c1===34&&c2===34)||(c1===39&&c2===39)){a++;b--;}
  return a===0&&b===s.length?s:s.substring(a,b);
};

// Original index.html:2607
wbdContext.parseCSV = function parseCSV(text){
  // 빠른 줄 분할 - 정규식 대신 indexOf
  const len=text.length;
  if(!len)throw new Error('데이터가 부족합니다');
  
  // 첫 줄 (헤더)
  let pos=0;
  let nl=text.indexOf('\n');
  if(nl<0)throw new Error('데이터가 부족합니다 (최소 2줄)');
  let headerLine=text.substring(0,nl);
  if(headerLine.endsWith('\r'))headerLine=headerLine.substring(0,headerLine.length-1);
  const headers=headerLine.split(',').map(h=>wbdContext._fastCell(h));
  const numHeaders=headers.length;
  pos=nl+1;
  
  const data=[];
  
  // 헤더별로 boolean/숫자 변환 미리 결정 (런타임에 매번 안 함)
  // - true/false 가능한 컬럼은 'b1','b2','b3','bSwing','1BSafe' 등
  // - 나머지는 숫자 시도
  const numericHeaders=new Array(numHeaders);
  const stringHeaders=new Array(numHeaders);
  for(let j=0;j<numHeaders;j++){
    // pName, bName, gameID 등 문자열로 둘 컬럼
    const h=headers[j];
    stringHeaders[j]=(h==='pName'||h==='bName'||h==='gameID'||h==='date'||h==='_gameId'||h==='_gameName');
    numericHeaders[j]=!stringHeaders[j];
  }
  
  while(pos<len){
    nl=text.indexOf('\n',pos);
    let line;
    if(nl<0){line=text.substring(pos);pos=len;}
    else {
      line=text.substring(pos,nl);
      if(line.endsWith('\r'))line=line.substring(0,line.length-1);
      pos=nl+1;
    }
    if(!line||line==='\r')continue;
    
    // split 한 번
    const vals=line.split(',');
    const row={};
    const cellLen=Math.min(vals.length,numHeaders);
    for(let j=0;j<cellLen;j++){
      const v=wbdContext._fastCell(vals[j]);
      if(v==='')continue;  // 빈 값은 스킵 (결과: undefined)
      // 빠른 boolean
      if(v==='true'){row[headers[j]]=true;continue;}
      if(v==='false'){row[headers[j]]=false;continue;}
      // 문자열 컬럼은 그대로
      if(stringHeaders[j]){row[headers[j]]=v;continue;}
      // 숫자 시도 (Number는 isNaN+parseFloat 한 번에)
      const n=+v;
      row[headers[j]]=n!==n?v:n;  // NaN이면 문자열, 아니면 숫자
    }
    data.push(row);
  }
  
  // V9.9: bSwing 한방향 보정
  // 스윙 판정은 bSwing을 봐야 하지만, "스윙이 명백한데 bSwing=0"인 오류만 정정.
  //   - call=2(인플레이) 또는 ev>0(타구속도 측정됨) = 배트에 공이 맞음 = 무조건 스윙
  //   - call=4(Swing) = WBD가 '볼존 스윙 헛스윙'으로 판정한 코드 = 무조건 스윙
  //   스윙 안 했는데 위 경우가 나올 수 없음 (이레귤러 제외)
  // 반대 방향(bSwing=1인데 call=0)은 건드리지 않음 — 스트존 안 헛스윙이라 정상.
  // ※ 한계: 존 안 헛스윙인데 bSwing=0인 경우는 루킹과 구분 불가 → 보정 못함.
  for(let i=0;i<data.length;i++){
    const r=data[i];
    if(r.bSwing===1||r.bSwing===true) continue;  // 이미 스윙으로 기록됨
    const c=+r.call;
    if(c===2 || c===4 || +r.ev>0){
      r.bSwing=1;  // 스윙 확정 (bSwing=0 오류 정정)
    }
  }
  
  return data;
};

// Original index.html:2685
wbdContext.loadData = function loadData(text,filename,append,deferRebuild,meta){
  try{
    if(!append){wbdContext.GAMES=[];wbdContext.activeGameIds=new Set();}
    const game=wbdContext.addGame(text,filename,meta);
    if(deferRebuild)return;
    wbdContext.rebuildG();
    if(!wbdContext.G.length)throw new Error('데이터가 없습니다');
    document.getElementById('upload-page').style.display='none';
    document.getElementById('app').style.display='block';
    wbdContext.updateNavInfo();
    wbdContext.populateSelects();
    wbdContext.renderGamesList();
    wbdContext.showPage('home');
  }catch(e){
    // V10.0: 중복은 에러가 아닌 정상 동작 — 조용히 처리
    if(e.code === 'DUPLICATE'){
      // 카운트 (마지막에 토스트로 안내)
      if(!window._dupSkipped) window._dupSkipped = [];
      window._dupSkipped.push({file:filename, kept:e.existing});
      if(deferRebuild) return;  // 일괄 로드 중이면 그냥 계속
      wbdContext.rebuildG();
      return;
    }
    const el=document.getElementById('upload-error');
    if(el){
      el.textContent='⚠ 파싱 오류: '+e.message;
      el.style.display='block';
    }
  }
};

// Original index.html:2717
wbdContext._finishBulkLoad = function _finishBulkLoad(){
  const _tFin = performance.now();
  wbdContext.rebuildG();
  
  // V10.0: 모두 중복이라 G가 비었지만 GAMES는 있는 경우 — 정상 처리됨, 화면 유지
  if(!wbdContext.G.length && wbdContext.GAMES.length === 0){
    // 처음 업로드인데 전부 중복 또는 파싱 실패 — 업로드 페이지에서 안내
    if(window._dupSkipped && window._dupSkipped.length){
      const el = document.getElementById('upload-error');
      if(el){
        el.textContent = `⚠ 업로드한 ${window._dupSkipped.length}개 파일 모두 이미 등록된 게임입니다.`;
        el.style.display = 'block';
      }
      window._dupSkipped = [];
    }
    return;
  }
  if(!wbdContext.G.length) return;
  
  const upload=document.getElementById('upload-page');
  if(upload && upload.style.display!=='none'){
    upload.style.display='none';
    document.getElementById('app').style.display='block';
    wbdContext.showPage('home');
  }
  wbdContext.updateNavInfo();
  wbdContext.populateSelects();
  wbdContext.renderGamesList();
  if(typeof wbdContext.renderActiveContent==='function')wbdContext.renderActiveContent();
  
  // V10.0: 중복 스킵 안내
  if(window._dupSkipped && window._dupSkipped.length){
    const list = window._dupSkipped;
    window._dupSkipped = [];
    const count = list.length;
    let msg = `🔁 중복 파일 ${count}개 자동 처리됨`;
    const detail = list.slice(0, 3).map(d => {
      const fnShort = (s) => s.length>32 ? s.slice(0,14)+'…'+s.slice(-15) : s;
      return `• ${fnShort(d.file)} (기존 "${fnShort(d.kept)}" 유지)`;
    }).join('\n');
    const more = count > 3 ? `\n…그 외 ${count-3}개` : '';
    wbdContext._toast(msg, detail + more, '#88ccff', 6000);
  }

  window._finishMs = performance.now()-_tFin;
  // V10.2 perf: 유휴 시간에 기록실/수비 캐시 사전 워밍 — 기록실 첫 진입도 즉시 열리게
  const _warm = () => { try{ wbdContext._computeDefenseData(); wbdContext._computeRecordsData(); }catch(e){}
    // 2차 워밍: 리더보드 카드 캐시 + 구종 집계 (다음 유휴 슬롯에)
    const _warm2 = () => { try{ wbdContext._aggregatePitchTypeStats(); if(typeof wbdContext.renderLeaderboard==='function') wbdContext.renderLeaderboard(); }catch(e){} };
    if(typeof requestIdleCallback === 'function') requestIdleCallback(_warm2, {timeout: 6000}); else setTimeout(_warm2, 1500);
  };
  if(typeof requestIdleCallback === 'function') requestIdleCallback(_warm, {timeout: 4000});
  else setTimeout(_warm, 1200);
};

// Original index.html:2773
wbdContext._toast = function _toast(title, body, color, duration){
  let t = document.getElementById('_app_toast');
  if(!t){
    t = document.createElement('div');
    t.id = '_app_toast';
    t.style.cssText = 'position:fixed;top:70px;right:20px;z-index:99999;max-width:380px;background:var(--card,#1a1d2e);border:1px solid var(--border,#333);border-left:4px solid #88ccff;border-radius:6px;padding:12px 16px;box-shadow:0 4px 16px rgba(0,0,0,0.4);font-size:12px;line-height:1.55;color:var(--text,#e8e8e8);transition:opacity 0.3s,transform 0.3s;opacity:0;transform:translateX(20px)';
    document.body.appendChild(t);
  }
  t.style.borderLeftColor = color || '#88ccff';
  t.innerHTML = `<div style="font-weight:700;color:${color||'#88ccff'};margin-bottom:6px">${title}</div>
    ${body?`<div style="white-space:pre-line;color:var(--muted,#888);font-size:11px">${body}</div>`:''}
    <div style="font-size:10px;color:var(--muted,#888);margin-top:6px;text-align:right">자동 닫힘…</div>`;
  // 트랜지션
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(0)';
  });
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
  }, duration || 4000);
};

// Original index.html:2797
wbdContext.updateNavInfo = function updateNavInfo(){
  document.getElementById('nav-file-info').textContent=
    `${wbdContext.GAMES.length}경기  |  ${wbdContext.G.length}투구  |  투수 ${window._cache.pitcherNames.length}명  타자 ${window._cache.batterNames.length}명`;
};

// Original index.html:2803
wbdContext.toggleGamesPanel = function toggleGamesPanel(){
  wbdContext.gamesPanelOpen=!wbdContext.gamesPanelOpen;
  document.getElementById('games-panel').style.display=wbdContext.gamesPanelOpen?'block':'none';
  document.getElementById('games-bar-arrow').style.transform=wbdContext.gamesPanelOpen?'rotate(180deg)':'';
};

// Original index.html:2809
wbdContext.updateGamesSummary = function updateGamesSummary(){
  const active=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id));
  const total=wbdContext.GAMES.length;
  const el=document.getElementById('games-summary-text');
  if(!el)return;
  const names=active.map(g=>{
    const n=g.name.replace(/\.[^.]+$/,''); // remove extension
    return n.length>16?n.slice(0,14)+'…':n;
  });
  if(total===0){el.textContent='없음';return;}
  if(active.length===total){
    el.textContent=total+'경기 전체 활성  ('+wbdContext.G.length+'투구)';
  } else {
    el.textContent=active.length+'/'+total+'경기 활성  ('+wbdContext.G.length+'투구)';
  }
};

// Original index.html:2826
wbdContext.renderGamesList = function renderGamesList(){
  const el=document.getElementById('games-list');
  if(!el)return;
  el.innerHTML=wbdContext.GAMES.map(g=>{
    const active=wbdContext.activeGameIds.has(g.id);
    const pitchers=[...new Set(g.pitches.map(d=>d.pName).filter(Boolean))].length;
    const batters=[...new Set(g.pitches.map(d=>d.bName).filter(Boolean))].length;
    const shortName=g.name.replace(/\.[^.]+$/,'');
    return '<div class="game-chip '+(active?'active':'')+'" onclick="toggleGame(\''+g.id+'\')">'
      +'<div class="gc-check">'+(active?'✓':'')+'</div>'
      +'<div>'
      +'<div class="gc-name">'+shortName+'</div>'
            +'<div class="gc-meta" title="'+wbdContext._gameCategoryLabel(g)+' · '+wbdContext._gameGroupLabel(g)+'">'+g.pitches.length+'투구  투수'+pitchers+'  타자'+batters+'</div>'
      +'</div>'
      +'<button class="gc-del" onclick="event.stopPropagation();removeGame(\''+g.id+'\')" title="삭제">✕</button>'
      +'</div>';
  }).join('');
  wbdContext.updateGamesSummary();
  wbdContext._renderRoundFilterBar();
};

// Original index.html:2849
wbdContext.removeGame = function removeGame(gid){
  wbdContext.GAMES=wbdContext.GAMES.filter(g=>g.id!==gid);
  wbdContext.activeGameIds.delete(gid);
  if(!wbdContext.GAMES.length){
    document.getElementById('app').style.display='none';
    document.getElementById('upload-page').style.display='flex';
    return;
  }
  wbdContext.rebuildG();
  wbdContext.updateNavInfo();
  wbdContext.renderGamesList();
  wbdContext.populateSelects();
  wbdContext.renderActiveContent();
};

// Original index.html:2870
wbdContext._gameDateKey = function _gameDateKey(name){
  // 다양한 파일명 포맷 지원:
  //  · 2026_06_26_AT_vs_IQ                                  (짧은 팀명)
  //  · league_2025_11_14_ishikawa_fighting_folks_vs_hoshizora_milkyways_pXPZ9  (긴 팀명 + 접두사/해시)
  const s=String(name||'').replace(/\.(csv|txt)$/i,'');
  // 날짜 추출 (문자열 어디든 YYYY_MM_DD)
  const dm=s.match(/(\d{4})[_-](\d{2})[_-](\d{2})/);
  if(!dm) return null;
  const date=+(dm[1]+dm[2]+dm[3]);
  // 날짜 이후 부분에서 _vs_ 기준으로 팀 양쪽 추출
  const after=s.slice(dm.index+dm[0].length).replace(/^[_-]+/,'');
  const vm=after.split(/[_-]vs[_-]/i);
  if(vm.length<2) return null;
  let t1=vm[0].trim();
  // 오른쪽 팀명 뒤의 랜덤 해시(영숫자 10자+) 제거
  let t2=vm[1].replace(/[_-][A-Za-z0-9]{8,}$/,'').trim();
  if(!t1||!t2) return null;
  const n=x=>x.toUpperCase().replace(/[_-]+/g,'_').replace(/^_|_$/g,'');
  t1=n(t1); t2=n(t2);
  return {date, t1, t2, pair:[t1,t2].sort().join('|')};
};

// Original index.html:2891
wbdContext._gamePhase = function _gamePhase(g){
  // 포스트시즌 여부 (라운드 판별에서 제외)
  const p=(g.pitches&&g.pitches[0])||{};
  return p._phaseName||g.phaseName||'';
};

// Original index.html:2896
wbdContext.computeRounds = function computeRounds(){
  const gKey=wbdContext.GAMES.map(g=>g.id).join(',');
  if(wbdContext._roundCache.gKey===gKey && wbdContext._roundCache.data) return wbdContext._roundCache.data;
  // 그룹(시즌)별로
  const byGroup={};
  wbdContext.GAMES.forEach(g=>{
    const grp=g.groupId||g.groupName||'__all__';
    (byGroup[grp]=byGroup[grp]||[]).push(g);
  });
  const roundOf={};         // gameId → 라운드 번호 (리그전 정규시즌만)
  const roundGroup={};      // gameId → 그룹키 (어느 시즌의 라운드인지)
  const groups=[];          // [{key, name, maxRound, roundGames:{r:[ids]}}]
  Object.entries(byGroup).forEach(([grp,games])=>{
    // 라운드는 '리그전'에만 의미 — 스크림·이벤트 등은 라운드 미부여
    const isLeague = games.some(g=>String(g.category||'').toLowerCase()==='league') ||
                     String(grp).toLowerCase().indexOf('league')>=0;
    if(!isLeague) return;
    // 정규시즌만 (포스트시즌 제외)
    const reg=games.filter(g=>wbdContext._gamePhase(g).indexOf('포스트')<0);
    const withKey=reg.map(g=>({g,k:wbdContext._gameDateKey(g.name)})).filter(x=>x.k);
    if(withKey.length<2) return;
    withKey.sort((a,b)=>a.k.date-b.k.date);
    const seen={}; const roundGames={};
    withKey.forEach(({g,k})=>{
      seen[k.pair]=(seen[k.pair]||0)+1;
      const rn=seen[k.pair];
      (roundGames[rn]=roundGames[rn]||[]).push(g.id);
    });
    // 신뢰할 라운드만: 최대 라운드 경기수 대비 40% 미만 꼬리(포스트시즌·불완전)는 미부여
    const roundNums=Object.keys(roundGames).map(Number).sort((a,b)=>a-b);
    const peak=Math.max(...roundNums.map(r=>roundGames[r].length));
    let mx=0; const keptRounds={};
    roundNums.forEach(r=>{
      if(roundGames[r].length >= Math.max(3, peak*0.4)){ mx=Math.max(mx,r); keptRounds[r]=roundGames[r]; roundGames[r].forEach(id=>{roundOf[id]=r; roundGroup[id]=grp;}); }
    });
    if(mx>=2){
      const name=(games[0]&&(games[0].groupName||games[0].seasonName))||grp.replace(/^league\//,'').replace(/_/g,' ');
      groups.push({key:grp, name, maxRound:mx, roundGames:keptRounds});
    }
  });
  const data={roundOf, roundGroup, groups, valid:groups.length>0};
  wbdContext._roundCache={gKey,data};
  return data;
};

// Original index.html:2942
wbdContext.setRoundFilter = function setRoundFilter(group, round){
  const cur=window._roundFilter;
  // 같은 버튼 재클릭 → 해제
  if(cur && group && cur.group===group && cur.round===round){ window._roundFilter=null; }
  else if(group==null){ window._roundFilter=null; }
  else { window._roundFilter={group, round}; }
  const R=wbdContext.computeRounds();
  if(window._roundFilter==null){
    wbdContext.GAMES.forEach(g=>wbdContext.activeGameIds.add(g.id));   // 전체 복원
  }else{
    const {group:fg, round:fr}=window._roundFilter;
    wbdContext.GAMES.forEach(g=>{
      if(R.roundGroup[g.id]===fg && R.roundOf[g.id]===fr) wbdContext.activeGameIds.add(g.id);
      else wbdContext.activeGameIds.delete(g.id);
    });
  }
  wbdContext.rebuildG(); wbdContext.updateNavInfo(); wbdContext.renderGamesList(); wbdContext.populateSelects(); wbdContext.renderActiveContent();
  wbdContext._renderRoundFilterBar();
};

// Original index.html:2961
wbdContext._renderRoundFilterBar = function _renderRoundFilterBar(){
  const bar=document.getElementById('round-filter-bar'); if(!bar)return;
  const lbl=document.getElementById('dash-round-label');
  const R=wbdContext.computeRounds();
  if(!R.valid){ bar.style.display='none'; if(lbl)lbl.style.display='none'; return; }
  const cur=window._roundFilter;
  let btns=`<button class="rf-btn${cur==null?' active':''}" onclick="setRoundFilter(null)">전체</button>`;
  R.groups.forEach(gr=>{
    btns+=`<span style="font-size:10px;color:var(--muted);margin:0 2px 0 6px">${gr.name}</span>`;
    for(let r=1;r<=gr.maxRound;r++){
      const on = cur&&cur.group===gr.key&&cur.round===r;
      btns+=`<button class="rf-btn${on?' active':''}" onclick="setRoundFilter('${gr.key.replace(/'/g,"\\'")}',${r})">${r}R</button>`;
    }
  });
  bar.innerHTML=btns; bar.style.display='inline-flex';
  if(lbl)lbl.style.display='inline';
};

// Original index.html:2979
wbdContext.renderActiveContent = function renderActiveContent(){
  const active=document.querySelector('.page.active');
  if(!active)return;
  const id=active.id;
  
  // 활성 경기 변경 시 캐시 무효화 (팀 진단서 리그 캐시 등)
  if(window._teamScoutLeagueCache) window._teamScoutLeagueCache = null;
  
  if(id==='page-home')wbdContext.renderHome();
  else if(id==='page-pitcher')wbdContext.renderPitcherPage();
  else if(id==='page-batter')wbdContext.renderBatterPage();
  else if(id==='page-team' && typeof wbdContext.renderTeamPage==='function'){wbdContext.renderTeamPage(); if(typeof wbdContext.switchTeamSubtab==='function') wbdContext.switchTeamSubtab(window._teamSubtab||'overview');}
  else if(id==='page-scouting' && typeof wbdContext.renderScoutingPage==='function')wbdContext.renderScoutingPage();
  else if(id==='page-scoutreport' && typeof wbdContext.renderScoutReportPage==='function')wbdContext.renderScoutReportPage();
  else if(id==='page-gamereport' && typeof wbdContext.renderGameReportPage==='function')wbdContext.renderGameReportPage();
  else if(id==='page-pitchtype' && typeof wbdContext.renderPitchTypePage==='function')wbdContext.renderPitchTypePage();
  else if(id==='page-leaderboard' && typeof wbdContext.renderLeaderboard==='function')wbdContext.renderLeaderboard();
  else if(id==='page-cards' && typeof renderCardsPage==='function')renderCardsPage();
};

// Original index.html:2999
wbdContext.populateSelects = function populateSelects(){
  // V10.2 perf: 이름 목록은 _rebuildCaches가 이미 정렬해둔 캐시 사용 (G 재스캔 2회 제거)
  const pitchers=(window._cache&&window._cache.pitcherNames)||[];
  const batters=(window._cache&&window._cache.batterNames)||[];
  const innings=[...new Set(wbdContext.G.map(d=>d.inn))].sort((a,b)=>a-b);
  const groups=Object.keys(wbdContext.PITCH_GROUPS);
  const results=Object.keys(wbdContext.RESULT_NAMES).map(Number);

  function fill(id,arr,all='전체'){const s=document.getElementById(id);if(!s)return;s.innerHTML=`<option value="">${all}</option>`+arr.map(v=>`<option value="${v}">${v}</option>`).join('')}
  function fillNum(id,arr,fmt,all='전체'){const s=document.getElementById(id);if(!s)return;s.innerHTML=`<option value="">${all}</option>`+arr.map(v=>`<option value="${v}">${fmt?fmt(v):v}</option>`).join('')}

  fill('pitcher-sel',pitchers,'투수 선택');
  fill('batter-sel',batters,'타자 선택');
  // zone group filter
  const s=document.getElementById('pz-group-sel');
  if(s)s.innerHTML='<option value="">전체</option>'+groups.map(g=>`<option value="${g}">${g}</option>`).join('');
  // log filters
  fillNum('pl-inn-sel',innings,v=>v+'이닝','전체 이닝');
  fill('pl-group-sel',groups,'전체 구종');
  fillNum('pl-result-sel',results,v=>wbdContext.RESULT_NAMES[v],'전체 결과');
  fillNum('bl-inn-sel',innings,v=>v+'이닝','전체 이닝');
  fill('bl-group-sel',groups,'전체 구종');
  fillNum('bl-result-sel',results,v=>wbdContext.RESULT_NAMES[v],'전체 결과');
  // batter spray group
  const bg=document.getElementById('ba-group-sel');
  if(bg)bg.innerHTML='<option value="">전체</option>'+groups.map(g=>`<option value="${g}">${g}</option>`).join('');
  // compare radars
  fill('compare-bat1',batters,'선택');
  fill('compare-bat2',batters,'선택');

  // Populate game selectors
  const gameOpts='<option value="">전체 경기</option>'+wbdContext.GAMES.map(g=>`<option value="${g.id}">${g.name}</option>`).join('');
  ['pitcher-game-sel','batter-game-sel'].forEach(id=>{const s=document.getElementById(id);if(s)s.innerHTML=gameOpts;});

  wbdContext.currentPitcher=pitchers[0]||'';
  wbdContext.currentBatter=batters[0]||'';
  if(wbdContext.currentPitcher&&document.getElementById('pitcher-sel'))document.getElementById('pitcher-sel').value=wbdContext.currentPitcher;
  if(wbdContext.currentBatter&&document.getElementById('batter-sel'))document.getElementById('batter-sel').value=wbdContext.currentBatter;
};

// Original index.html:3043
wbdContext.onPitcherGameFilter = function onPitcherGameFilter(){
  const sel=document.getElementById('pitcher-game-sel');
  wbdContext.pitcherGameFilter=sel?sel.value:'';
  wbdContext.renderPitcherPage();
};

// Original index.html:3048
wbdContext.onBatterGameFilter = function onBatterGameFilter(){
  const sel=document.getElementById('batter-game-sel');
  wbdContext.batterGameFilter=sel?sel.value:'';
  wbdContext.renderBatterPage();
};

// Original index.html:3053
wbdContext.onBatterHeightFilter = function onBatterHeightFilter(){
  // 현재 선수의 게임 데이터 중 선택된 키일 때만 보기
  // 별도 변수에 저장 → renderBatterPage에서 필터 적용
  const sel=document.getElementById('batter-height-filter');
  window.batterHeightFilter=sel?sel.value:'';
  wbdContext.renderBatterPage();
};

// Original index.html:3062
wbdContext.populateBatterHeightOptions = function populateBatterHeightOptions(){
  const sel=document.getElementById('batter-height-filter');
  if(!sel)return;
  // 현재 선택된 타자가 실제 사용한 키만 (반올림된 정수 cm)
  if(!wbdContext.currentBatter){
    sel.innerHTML='<option value="">전체</option>';
    return;
  }
  const heightCounts={};
  wbdContext.G.forEach(d=>{
    if(String(d.bName)===String(wbdContext.currentBatter) && +d.bHCm>0){
      const h=Math.round(+d.bHCm);
      heightCounts[h]=(heightCounts[h]||0)+1;
    }
  });
  const sorted=Object.keys(heightCounts).map(Number).sort((a,b)=>b-a);
  const cur=sel.value;
  if(sorted.length<=1){
    // 키가 1개 이하면 필터 의미 없음
    sel.innerHTML='<option value="">전체</option>';
    sel.disabled=true;
    return;
  }
  sel.disabled=false;
  sel.innerHTML='<option value="">전체</option>'+sorted.map(h=>{
    const cnt=heightCounts[h];
    return `<option value="${h}"${String(h)===cur?' selected':''}>${h}cm (${cnt}구)</option>`;
  }).join('');
};

// Original index.html:3092
wbdContext.getPitcherData = function getPitcherData(){
  let data=wbdContext.getPitcherDataByName(wbdContext.currentPitcher);
  if(wbdContext.pitcherGameFilter)data=data.filter(d=>d._gameId===wbdContext.pitcherGameFilter);
  return data;
};

// Original index.html:3098
wbdContext.getBatterData = function getBatterData(){
  let data=wbdContext.getBatterDataByName(wbdContext.currentBatter);
  if(wbdContext.batterGameFilter)data=data.filter(d=>d._gameId===wbdContext.batterGameFilter);
  if(window.batterHeightFilter){
    const targetH=+window.batterHeightFilter;
    data=data.filter(d=>Math.round(+d.bHCm)===targetH);
  }
  return data;
};

// Original index.html:3136
wbdContext.readMultipleFiles = function readMultipleFiles(files, appendFirst){
  // files: plain Array (not FileList)
  // appendFirst: true = all files append, false = first replaces then rest append
  let idx=0;
  function next(){
    if(idx>=files.length){
      wbdContext._finishBulkLoad();
      return;
    }
    const file=files[idx];
    const append=appendFirst||(idx>0);
    const isFirst=idx===0;
    const isLast=idx===files.length-1;
    idx++;
    const reader=new FileReader();
    reader.onload=e=>{
      // 첫 파일: 일반 로드 (화면 즉시 전환)
      // 중간/마지막 파일: deferRebuild로 데이터만 추가, 다음 호출
      if(isFirst){
        wbdContext.loadData(e.target.result,file.name,append,false);
      } else {
        // 데이터만 추가 (rebuild는 마지막에서 한 번에)
        wbdContext.loadData(e.target.result,file.name,true,!isLast);
      }
      // setTimeout으로 다음 파일은 다음 tick에 → UI 응답성 유지
      setTimeout(next,0);
    };
    reader.onerror=()=>{
      console.error('Failed to read file:',file.name);
      setTimeout(next,0);
    };
    reader.readAsText(file,'utf-8');
  }
  next();
};
}

export function initialize(wbdContext) {
// Original index.html:2180
wbdContext.PITCH_NAMES = {0:'Fastball',1:'Knuckleball',2:'Rising Slider-S',3:'Slider-S',4:'Slider-A',5:'Slider-F',6:'Sinker-S',7:'Sinker-A',8:'Sinker-F',9:'Rising Sinker-S',10:'Splitter-S',11:'Splitter-A',12:'Splitter-F',13:'Curve-S',14:'Screwball-S',15:'Rising-S',16:'Rising-A',17:'Rising-F',18:'Rising Slider-A',19:'Rising Slider-F',20:'Rising Sinker-A',21:'Rising Sinker-F',22:'Curve-A',23:'Curve-F',24:'Screwball-A',25:'Screwball-F',26:'4-Seam FB-S',27:'4-Seam FB-A',28:'4-Seam FB-F',29:'Cutter-S',30:'Cutter-A',31:'Cutter-F',32:'2-Seam FB-S',33:'2-Seam FB-A',34:'2-Seam FB-F',35:'Drop FB-S',36:'Drop FB-A',37:'Drop FB-F',38:'Straight CU',39:'Rise CU-S',40:'Rise CU-A',41:'Rise CU-F',42:'Circle CU-S',43:'Circle CU-A',44:'Circle CU-F',45:'Fade CU-S',46:'Fade CU-A',47:'Fade CU-F',48:'Drop CU-S',49:'Drop CU-A',50:'Drop CU-F'};

// Original index.html:2182
wbdContext.PITCH_GROUPS = {
  패스트볼:[0],                                    // Fastball
  너클볼:[1],                                       // Knuckleball
  포심:[26,27,28],                                  // 4-Seam FB -S/-A/-F
  투심:[32,33,34],                                  // 2-Seam FB -S/-A/-F
  '드롭':[35,36,37],                                // Drop FB -S/-A/-F
  커터:[29,30,31],                                  // Cutter -S/-A/-F
  슬라이더:[3,4,5],                                 // Slider -S/-A/-F
  '라이징 슬라이더':[2,18,19],                       // Rising Slider -S/-A/-F
  '라이징':[15,16,17],                              // Rising (라이징 패스트볼) -S/-A/-F
  싱커:[6,7,8],                                     // Sinker -S/-A/-F
  '라이징 싱커':[9,20,21],                          // Rising Sinker -S/-A/-F
  스플리터:[10,11,12],                              // Splitter -S/-A/-F
  커브:[13,22,23],                                  // Curve -S/-A/-F
  스크류:[14,24,25],                                // Screwball -S/-A/-F
  체인지업:[38],                                    // Straight CU
  '라이즈 체인지업':[39,40,41],                      // Rise CU -S/-A/-F
  '써클 체인지업':[42,43,44],                        // Circle CU -S/-A/-F
  '페이드 체인지업':[45,46,47],                      // Fade CU -S/-A/-F
  '드롭 체인지업':[48,49,50]                         // Drop CU -S/-A/-F
};

// Original index.html:2203
wbdContext.GROUP_COLORS = {
  패스트볼:'#b0b8c8',
  너클볼:'#888',
  포심:'#ff4560',
  투심:'#ff7043',
  '드롭':'#ff5722',
  커터:'#ff8c44',
  슬라이더:'#2196f3',
  '라이징 슬라이더':'#03a9f4',
  '라이징':'#44aaff',
  싱커:'#f5a623',
  '라이징 싱커':'#ffb74d',
  스플리터:'#ffdd44',
  커브:'#9c27b0',
  스크류:'#cc44ff',
  체인지업:'#39ff8a',
  '라이즈 체인지업':'#4caf50',
  '써클 체인지업':'#26a69a',
  '페이드 체인지업':'#00bcd4',
  '드롭 체인지업':'#66bb6a'
};

// Original index.html:2225
wbdContext.PITCH_BASE_KR = {
  'Fastball':'패스트볼',
  'Knuckleball':'너클볼',
  '4-Seam FB':'포심',
  '2-Seam FB':'투심',
  'Cutter':'커터',
  'Sinker':'싱커',
  'Slider':'슬라이더',
  'Curve':'커브',
  'Splitter':'스플리터',
  'Screwball':'스크류',
  'Rising':'라이징',
  'Rising Slider':'라이징 슬라이더',
  'Rising Sinker':'라이징 싱커',
  'Drop FB':'드롭',
  'Straight CU':'체인지업',
  'Rise CU':'라이즈 체인지업',
  'Circle CU':'써클 체인지업',
  'Fade CU':'페이드 체인지업',
  'Drop CU':'드롭 체인지업'
};

// Original index.html:2246
wbdContext.CALL_NAMES = {0:'Strike',1:'Ball',2:'Hit',3:'DeadBall',4:'Swing',5:'None'};

// Original index.html:2247
wbdContext.CALL_COLORS = {0:'#39ff8a',1:'#ff4560',2:'#ffdd44',3:'#cc44ff',4:'#2196f3',5:'#607080'};

// Original index.html:2248
wbdContext.RESULT_NAMES = {0:'None',1:'FlyOut',2:'GroundBall',3:'Foul',4:'HomeRun',5:'Walk',6:'HBP'};

// Original index.html:2249
wbdContext.RESULT_COLORS = {0:'#607080',1:'#888',2:'#557799',3:'#ff8c00',4:'#ffd700',5:'#44ddff',6:'#cc44ff'};

// Original index.html:2250
wbdContext.PAGE_SIZE = 100;

// Original index.html:2257
wbdContext.GAMES = [];

// Original index.html:2258
wbdContext.G = [];

// Original index.html:2259
wbdContext.activeGameIds = new Set();

// Original index.html:2260
wbdContext.currentPitcher = '';

// Original index.html:2261
wbdContext.currentBatter = '';

// Original index.html:2262
wbdContext.pitcherLogPage = 0;
wbdContext.batterLogPage = 0;

// Original index.html:2263
wbdContext.activePitcherTab = 0;

// Original index.html:2264
wbdContext.activeBatterTab = 0;

// Original index.html:2265
wbdContext.gameFilter = '';

// Original index.html:2276
window._cache = {
  pitcherData: {},    // {name: [pitches]}  // 투수별 데이터 인덱스
  batterData: {},     // {name: [pitches]}  // 타자별 데이터 인덱스
  pitcherNames: [],   // 모든 투수 이름 (정렬됨)
  batterNames: [],    // 모든 타자 이름 (정렬됨)
  pitcherCard: {},    // {name: card}      // calcPitcherCard 결과 캐시
  batterCard: {},     // {name: card}
  pitcherWAR: {},     // {name: war}
  batterWAR: {},
  autoTeam: {},       // {name|type: team}  // 자동 팀 캐시
  generation: 0       // 데이터 변경 시 +1
};

// Original index.html:2802
wbdContext.gamesPanelOpen = false;

// Original index.html:2869
wbdContext._roundCache = {gKey:'',data:null};

// Original index.html:2941
window._roundFilter=null;

// Original index.html:3040
wbdContext.pitcherGameFilter = '';

// Original index.html:3041
wbdContext.batterGameFilter = '';

// Original index.html:3111
wbdContext.dz = document.getElementById('drop-zone');

// Original index.html:3112
wbdContext.fi = document.getElementById('file-input');

// Original index.html:3113
wbdContext.dz.addEventListener('dragover',e=>{e.preventDefault();wbdContext.dz.classList.add('dragover')});

// Original index.html:3114
wbdContext.dz.addEventListener('dragleave',()=>wbdContext.dz.classList.remove('dragover'));

// Original index.html:3115
wbdContext.dz.addEventListener('drop',e=>{
  e.preventDefault();wbdContext.dz.classList.remove('dragover');
  const files=Array.from(e.dataTransfer.files);
  if(!files.length)return;
  wbdContext.readMultipleFiles(files, false);
});

// Original index.html:3121
wbdContext.fi.addEventListener('change',()=>{
  if(!wbdContext.fi.files.length)return;
  const files=Array.from(wbdContext.fi.files);
  wbdContext.fi.value='';
  wbdContext.readMultipleFiles(files, false);
});

// Original index.html:3128
wbdContext.addFi = document.getElementById('add-file-input');

// Original index.html:3129
wbdContext.addFi.addEventListener('change',()=>{
  if(!wbdContext.addFi.files.length)return;
  const files=Array.from(wbdContext.addFi.files);
  wbdContext.addFi.value='';
  wbdContext.readMultipleFiles(files, true);
});
}
