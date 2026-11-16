/** defense: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:20735
wbdContext._distM = function _distM(x1, y1, x2, y2){
  const dx = (+x1||0) - (+x2||0);
  const dy = (+y1||0) - (+y2||0);
  return Math.sqrt(dx*dx + dy*dy);
};

// Original index.html:20742
wbdContext._computeDefenseData = function _computeDefenseData(){
  if(window._defenseDataCache && window._defenseDataCache._gKey === wbdContext.G.length) {
    return window._defenseDataCache;
  }
  window._defPerf={t0:performance.now()};
  
  // V9.9: 비-선수 cPlr 필터 — bName으로 한 번도 등장 안 한 cPlr은 운영진/AI/디버그
  const bNameSet = new Set();
  wbdContext.G.forEach(d => { if(d.bName) bNameSet.add(wbdContext._canonPlayer(d.bName)); });
  
  // 인플레이 타구 (call=2, result=1 FlyOut or 2 GroundBall) — bName 등록된 사람만
  // 홈런(result=4)은 result 필터에서 자연스럽게 제외됨
  // V11.6: 별칭(닉변/계정변경) 정규화 — 기존엔 pName/bName에만 적용되어
  //        수비 집계(cPlr·포지션Name)는 병합이 안 먹었음 (같은 선수가 다른 이름으로 갈림)
  const _POSNAME_KEYS=['PName','CName','1BName','2BName','3BName','SSName','LFName','CFName','RFName'];
  wbdContext.G.forEach(d => {
    // 원본 이름을 _raw*에 보관 → 별칭이 바뀌어도 항상 원본에서 다시 매핑 (중복 적용 방지)
    if(d._rawCPlr === undefined) d._rawCPlr = d.cPlr;
    if(d._rawCPlr) d.cPlr = wbdContext._canonPlayer(d._rawCPlr);
    for(const k of _POSNAME_KEYS){
      const rk='_raw'+k;
      if(d[rk] === undefined) d[rk] = d[k];
      if(d[rk]) d[k] = wbdContext._canonPlayer(d[rk]);
    }
  });
  const plays = wbdContext.G.filter(d => 
    +d.call === 2 && (+d.result === 1 || +d.result === 2) 
    && d.cPlr && d.cPlr !== '' && bNameSet.has(d.cPlr)
    && !wbdContext._isDummyPitch(d) && !wbdContext._isBunt(d)
  );
  
  // V9.9: 게임 단위 키 매핑 — 같은 게임에서 그 cPlr이 bName으로 등장한 행의 bHCm
  const gameNameHeight = {};  // {gameId: {name: height}}
  wbdContext.G.forEach(d => {
    if(d.bName && d.bHCm && d._gameId != null){
      const h = +d.bHCm;
      if(h > 0){
        if(!gameNameHeight[d._gameId]) gameNameHeight[d._gameId] = {};
        gameNameHeight[d._gameId][d.bName] = h;
      }
    }
  });
  
  // 글로벌 키 (fallback) — 가장 자주 쓰는 키
  const playerHeightCounts = {};  // {name: {height: count}}
  wbdContext.G.forEach(d => {
    if(d.bName && d.bHCm){
      const h = +d.bHCm;
      if(h > 0){
        if(!playerHeightCounts[d.bName]) playerHeightCounts[d.bName] = {};
        playerHeightCounts[d.bName][h] = (playerHeightCounts[d.bName][h] || 0) + 1;
      }
    }
  });
  // 가장 흔한 키
  const playerHeight = {};
  Object.entries(playerHeightCounts).forEach(([name, hCounts]) => {
    const sorted = Object.entries(hCounts).sort((a,b) => b[1] - a[1]);
    playerHeight[name] = +sorted[0][0];
  });
  
  // 포지션 식별 — V9.9 정확화: `<Pos>Name` 컬럼으로 그 선수가 실제 출전한 포지션 직접 매핑
  // (이전: cx/cz와 가장 가까운 PosX/Y 추정 → 멀리 가서 잡으면 다른 포지션으로 잘못 분류됨)
  const posKeys = ['P','C','1B','2B','3B','SS','LF','CF','RF'];
  const posNameKor = {P:'투수', C:'포수', '1B':'1루수', '2B':'2루수', '3B':'3루수', SS:'유격수', LF:'좌익수', CF:'중견수', RF:'우익수'};
  
  // cPlr → 그 행에서 어느 포지션이었는지 (PosName 매칭)
  const _posNameKeys = posKeys.map(pk => pk + 'Name');  // V10.2 perf: 키 문자열 사전 생성
  function findPlayerPos(d){
    const c = d.cPlr;
    for(let k = 0; k < posKeys.length; k++){
      if(d[_posNameKeys[k]] === c) return posKeys[k];
    }
    return null;  // 어디서도 못 찾으면 unknown (P는 PName 없으니 None)
  }
  
  // 각 타구에 대해 — 정확한 포지션 + 시작 위치 + 이동 거리 + 키
  // V9.9: 이동거리 sanity check — 포지션별 합리적 최대 거리 초과 = 데이터 노이즈
  // (실측 p99: 내야 30m, 외야 50m. 그 이상은 송구 후 위치 등 시스템 노이즈로 판단)
  const POS_MAX_DIST = {
    P: 30, C: 30, '1B': 30, '2B': 30, '3B': 30, SS: 30,
    LF: 55, CF: 60, RF: 55
  };
  
  window._defPerf = {t0: performance.now()};
  window._defPerf.pre=performance.now();
  // V10.2 perf: Object.create 프로토타입 위임(492ms@19k건, V8 딕셔너리 모드 유발)도 제거 —
  // 계산 필드를 원본 d에 직접 부착 (_gameId/_hitBase처럼 '_' 필드 부착은 기존 관례, 재계산 시 덮어써서 안전)
  const enriched = [];
  for(let _j=0; _j<plays.length; _j++){
    const d = plays[_j];
    const cx = +d.cx || 0;
    const cz = +d.cz || 0;
    const lx = +d.lx || 0;
    const lz = +d.lz || 0;
    const bestPos = findPlayerPos(d);
    const startX = bestPos ? +d[`${bestPos}PosX`] : null;
    const startY = bestPos ? +d[`${bestPos}PosY`] : null;
    const moveDist = (startX != null && startY != null && !isNaN(startX) && !isNaN(startY)) ? wbdContext._distM(startX, startY, cx, cz) : null;
    // V9.9: 비합리적 이동거리 = 노이즈 (포지션 매칭 무효화)
    const isNoiseyDist = bestPos && moveDist != null && moveDist > (POS_MAX_DIST[bestPos] || 60);
    const finalPos = isNoiseyDist ? null : bestPos;
    const gameH = gameNameHeight[d._gameId]?.[d.cPlr];
    const tT = (+d.cSec||0)-(+d.hSec||0);
    d._cplr = d.cPlr; d._pos = finalPos; d._moveDist = moveDist;
    d._isOut = +d['1BSafe'] === 0; d._isHit = +d['1BSafe'] === 1;
    d._ev = +d.ev || 0; d._ldeg = +d.ldeg || 0;
    d._T = (+d.hSec>0 && +d.cSec>0 && tT>0.05 && tT<20) ? tT : null;
    d._hitDistFromHP = wbdContext._distM(0, -20, lx, lz);
    // V10.2: 포구 방향(전후) — 수비수가 홈에서 멀어지며 잡으면(뒤로) +, 가까워지며 잡으면(앞으로) -.
    //   같은 거리·시간이라도 앞으로 오는 짧은 타구가 잡기 어려움(아웃률 42% vs 후방 79%, 37%p차).
    if(startX!=null && startY!=null){
      const dStart = Math.hypot(startX-0, startY-(-20));   // 시작점의 홈 거리
      const dCatch = Math.hypot(cx-0, cz-(-20));           // 포구점의 홈 거리
      d._catchDir = dCatch - dStart;  // +뒤(후퇴) / -앞(전진)
    } else d._catchDir = null;
    d._playerH = gameH != null ? gameH : (playerHeight[d.cPlr] || null);
    d._noiseyDist = isNoiseyDist;
    if(finalPos != null) enriched.push(d);  // 포지션 못 찾거나 노이즈는 제외
  }

  // ═══ V11.5: 내야 통과 땅볼 귀속 (range 반영) ═══
  // 기존엔 cPlr(실제 포구자) 기준이라 내야를 뚫고 나간 땅볼이 외야수 플레이로만 잡히고
  // 내야수 평가에서 빠졌음 → "닿은 공 처리력"만 보고 "닿을 수 있느냐"(수비 범위)는 미평가.
  //   실측(36경기): 땅볼 994건 중 166건(16.7%)이 내야 통과, 이들 아웃률 5.9%
  //   포함 시 내야 평균 xOut 0.898→0.776, xOut 범위 0.82~0.98→0.66~0.98로 확대되어
  //   "잘해도 +0.05, 놓치면 -0.95"인 비대칭이 완화됨. 선수 변별력 1.36→2.20(+62%).
  // 귀속 방식: 타구 방향각(sdeg) 직선에 가장 가까운 내야수, 12m 이내만.
  //   (외야 포구지점 직선보다 방향각이 정확 — 땅볼은 바운드하며 휘므로. 실측 편차 0.019 vs 0.014)
  const _IF_ASSIGN_POS = ['1B','2B','3B','SS'];
  // V11.6: 귀속 반경을 타구 속도(EV)별로 차등 적용
  //   기존 12m 고정은 "강하게 빠져나간 타구"까지 내야수 책임으로 잡아 과도했음.
  //   실측(FW 63경기 땅볼 1,521건) — 경로거리를 고정하고 EV만 바꿔 비교:
  //     거리 4~7m: EV<95 89.3% / 95~110 74.0% / 110~125 41.0% / 125+ 33.3%
  //     거리 7~10m: EV<95 66.1% / 95~110 57.1% / 110~125 19.6% / 125+ 16.1%
  //     거리 9~12m: EV 125+ 는 16건 중 0건(0%) — 물리적으로 닿을 수 없는 타구
  //   원인은 도달시간 — 같은 3m 거리에서 EV<95는 2.41초, EV125+는 1.62초로 반응 여유가 33% 적음.
  //   → 각 구간의 처리율이 40~50%가 되는 지점을 경계로 설정 (그 이상은 "못 잡는 게 정상")
  const _assignRadius = (ev) => ev>=125 ? 4 : (ev>=110 ? 6 : (ev>=95 ? 8 : 11));
  for(let _j=0; _j<plays.length; _j++){
    const d = plays[_j];
    if(!(+d.ev > 0) || +d.result === 3) continue;          // 인플레이만
    if(!(+d.ldeg < 10)) continue;                           // 땅볼만
    const cPos = findPlayerPos(d);
    if(!cPos || (cPos!=='LF' && cPos!=='CF' && cPos!=='RF')) continue;   // 외야수가 잡은 것만 = 내야 통과
    const s = +d.sdeg;
    if(isNaN(s)) continue;
    // 홈에서 방향각 s로 뻗은 직선 (sdeg 음수=좌측/lx+)
    const ax=0, ay=-20, rad=(-s)*Math.PI/180;
    const bx = ax + 100*Math.sin(rad), by = ay - 100*Math.cos(rad);
    const L2 = (bx-ax)*(bx-ax) + (by-ay)*(by-ay);
    let best=null, bestD=Infinity;
    for(const pk of _IF_ASSIGN_POS){
      const sx=+d[`${pk}PosX`], sy=+d[`${pk}PosY`];
      if(sx==null||sy==null||isNaN(sx)||isNaN(sy)) continue;
      const t = Math.max(0, Math.min(1, ((sx-ax)*(bx-ax)+(sy-ay)*(by-ay))/L2));
      const px=ax+t*(bx-ax), py=ay+t*(by-ay);
      const dd=Math.hypot(sx-px, sy-py);
      if(dd<bestD){ bestD=dd; best=pk; }
    }
    if(!best || bestD > _assignRadius(+d.ev||0)) continue;
    const nm = d[`${best}Name`];
    if(!nm) continue;
    // 가상 플레이 레코드 — 그 내야수가 "닿지 못한" 기회로 집계
    enriched.push({
      _cplr:nm, _pos:best, _moveDist:bestD,
      _isOut:false, _isHit:true,
      _ev:+d.ev||0, _ldeg:+d.ldeg||0, _T:null,
      _hitDistFromHP:wbdContext._distM(0,-20,+d.lx||0,+d.lz||0),
      _catchDir:null, _playerH:(playerHeight[nm]||null),
      _noiseyDist:false, _assigned:true,        // 귀속 플레이 표식
      _gameId:d._gameId, _gameName:d._gameName,
      cPlr:nm, pName:d.pName, bName:d.bName, inn:d.inn, half:d.half
    });
  }
  
  // ━━━ V9.9 OAA v3: 포지션별 분리, 이동거리·EV·발사각 baseline ━━━
  // baseline grid: 포지션 × 이동거리(3m) × EV(10mph) × 발사각(GB/LD/FB)
  // 사용자 지적: 어려운 타구 = 빠른 EV뿐 아니라 "수비 시작 위치에서 멀리 떨어진 곳"도 포함
  // → 거리는 더 세밀한 3m bin으로 유지 (멀어질수록 자동으로 xOut 낮아짐)
  function laCat(ldeg){
    if(ldeg < 10) return 'GB';
    if(ldeg < 25) return 'LD';
    return 'FB';
  }
  
  window._defPerf.enriched = performance.now();
  window._defPerf.enriched=performance.now();
  enriched.forEach(p => { if(p._pos) p._la = laCat(p._ldeg); });
  
  const GLOBAL_OUT_RATE = enriched.filter(p => p._isOut).length / Math.max(1, enriched.length);
  
  // ━━━ V10.1 OAA v4: 요구속도(D/T) 연속 커브 — Statcast catch probability 방식 ━━━
  // 빈 수백 개 + 4단계 폴백 → 그룹별 커브 3개로 교체 (표본 효율 극대화, 폴백 불필요)
  // 리그전 63게임 실측 검증: 외야 플라이 v 0→5 m/s에서 아웃률 83%→25% 단조 감소 확인
  //   외야 라이너(la<10°)는 아웃률 ~10%로 별도 그룹, 내야는 이동거리 D만 약한 신호 (97%→81%)
  const INFIELD_POS = {P:1, C:1, '1B':1, '2B':1, '3B':1, SS:1};
  
  // 커브 빌더: 빈 평균 + 이웃 가중 스무딩(0.5/1/0.5) + 선형 보간 lookup 함수 반환
  function _buildCurve(samples, getX, w, maxX){
    const nb = Math.ceil(maxX/w)+1;
    const sum = new Array(nb).fill(0), cnt = new Array(nb).fill(0);
    samples.forEach(s => {
      const x = getX(s);
      if(x==null || isNaN(x)) return;
      const bi = Math.min(nb-1, Math.max(0, Math.floor(x/w)));
      cnt[bi]++; if(s._isOut) sum[bi]++;
    });
    const rate = new Array(nb).fill(null);
    for(let i=0;i<nb;i++){
      let s=0, c=0;
      [[i-1,0.5],[i,1],[i+1,0.5]].forEach(([j,wt])=>{
        if(j>=0 && j<nb && cnt[j]>0){ s+=sum[j]*wt; c+=cnt[j]*wt; }
      });
      rate[i] = c>=4 ? s/c : null;
    }
    // 빈 빈은 최근접 유효 빈으로 채움 (양방향)
    let last=null;
    for(let i=0;i<nb;i++){ if(rate[i]!=null) last=rate[i]; else if(last!=null) rate[i]=last; }
    last=null;
    for(let i=nb-1;i>=0;i--){ if(rate[i]!=null) last=rate[i]; else if(last!=null) rate[i]=last; }
    const fb = samples.length ? samples.filter(s=>s._isOut).length/samples.length : GLOBAL_OUT_RATE;
    return (x)=>{
      if(x==null || isNaN(x)) return fb;
      const fi = Math.min(nb-1, Math.max(0, x/w));
      const i0 = Math.floor(fi), i1 = Math.min(nb-1, i0+1), t = fi-i0;
      const r0 = rate[i0]??fb, r1 = rate[i1]??fb;
      return r0 + (r1-r0)*t;
    };
  }
  
  // ═══ V11.6: xOut 모델 재설계 ═══
  //  실측 검증(36경기 2,068플레이, 분석기 로직 정확 재현 기준):
  //   · 내야: 포지션별 1D 거리 커브 → 2D 그리드(거리×발사각). 편차 0.0057→0.0019(3배↓)
  //   · 외야: 요구속도(거리/체공시간) → 이동거리 기반. 요구속도는 _T 결측이 8~21%라 폴백이 잦았고
  //           난이도 추정도 부정확했음. 편차 0.0273→0.0132(2배↓), Brier 0.1592→0.1114(30%↓)
  //   · 방향(전진/후퇴/측면) 분리는 유효하므로 유지
  //  ※ 포구 깊이·1루 송구거리는 강력해 보이나 귀속 플레이(내야 통과)의 포구점이 외야라
  //    "통과 여부"를 직접 알려주는 데이터 누수 → 제외.
  //  ※ 주자 수·타자 발속도·EV 추가는 변별력만 떨어뜨려 미채택.
  const _ofAll = enriched.filter(p => p._pos && !INFIELD_POS[p._pos]);
  const _ifAll = enriched.filter(p => p._pos && INFIELD_POS[p._pos]);
  const _dirOf = p => (p._catchDir==null ? 'side' : (p._catchDir > 3 ? 'back' : (p._catchDir < -3 ? 'front' : 'side')));

  // ── 내야: 2D 그리드 (이동거리 × 발사각) + 3×3 이웃 가중 스무딩 ──
  //   1D 커브를 포지션×조건으로 쪼개면 표본이 갈라져 불안정해지는데,
  //   그리드는 이웃 셀을 빌려 쓰므로 세분화하면서도 안정적.
  const _IF_NB1 = 5, _IF_NB2 = 4, _IF_MINC = 8;
  const _ifGrid = (()=>{
    const md = _ifAll.map(p=>p._moveDist).filter(v=>v!=null && !isNaN(v));
    const la = _ifAll.map(p=>p._ldeg);
    if(!md.length) return null;
    const lo1=Math.min(...md), hi1=Math.max(...md), lo2=Math.min(...la), hi2=Math.max(...la);
    const w1=Math.max(1e-9,(hi1-lo1)/_IF_NB1), w2=Math.max(1e-9,(hi2-lo2)/_IF_NB2);
    const cell={}, posFb={};
    let gN=0, gO=0;
    _ifAll.forEach(p=>{
      const pk=p._pos;
      if(!posFb[pk]) posFb[pk]={n:0,o:0};
      posFb[pk].n++; gN++;
      if(p._isOut){ posFb[pk].o++; gO++; }
      if(p._moveDist==null || isNaN(p._moveDist)) return;
      const i1=Math.min(_IF_NB1-1,Math.max(0,Math.floor((p._moveDist-lo1)/w1)));
      const i2=Math.min(_IF_NB2-1,Math.max(0,Math.floor((p._ldeg-lo2)/w2)));
      const k=pk+'|'+i1+'|'+i2;
      if(!cell[k]) cell[k]={n:0,o:0};
      cell[k].n++; if(p._isOut) cell[k].o++;
    });
    const gFb = gN>0 ? gO/gN : GLOBAL_OUT_RATE;
    return (p)=>{
      if(p._moveDist!=null && !isNaN(p._moveDist)){
        const i1=Math.min(_IF_NB1-1,Math.max(0,Math.floor((p._moveDist-lo1)/w1)));
        const i2=Math.min(_IF_NB2-1,Math.max(0,Math.floor((p._ldeg-lo2)/w2)));
        let s=0,c=0;
        for(let di=-1;di<=1;di++) for(let dj=-1;dj<=1;dj++){
          const cc=cell[p._pos+'|'+(i1+di)+'|'+(i2+dj)];
          if(cc && cc.n>0){ const wt=(di===0&&dj===0)?1:0.5; s+=cc.o*wt; c+=cc.n*wt; }
        }
        if(c>=_IF_MINC) return s/c;
      }
      const pf=posFb[p._pos];
      return (pf && pf.n>0) ? pf.o/pf.n : gFb;
    };
  })();

  // ── 외야: 이동거리 커브 (포지션 × 방향 × 발사각2단), 표본 부족 시 2단 폴백 ──
  const _OF_LA_CUT = 25, _OF_MING = 60;
  const _ofKey1 = p => p._pos+'|'+_dirOf(p)+'|'+(p._ldeg>=_OF_LA_CUT?1:0);
  const _ofKey2 = p => p._pos+'|'+(p._ldeg>=_OF_LA_CUT?1:0);
  const _ofCurves = {}, _ofCurves2 = {};
  (function(){
    const g1={}, g2={};
    _ofAll.forEach(p=>{ (g1[_ofKey1(p)]||(g1[_ofKey1(p)]=[])).push(p);
                        (g2[_ofKey2(p)]||(g2[_ofKey2(p)]=[])).push(p); });
    Object.keys(g1).forEach(k=>{ if(g1[k].length>=_OF_MING) _ofCurves[k]=_buildCurve(g1[k], p=>p._moveDist, 5, 60); });
    Object.keys(g2).forEach(k=>{ if(g2[k].length>=_OF_MING) _ofCurves2[k]=_buildCurve(g2[k], p=>p._moveDist, 5, 60); });
  })();
  const _ofFallback = _buildCurve(_ofAll, p=>p._moveDist, 5, 60);

  enriched.forEach(p => {
    if(!p._pos){ p._xOut = GLOBAL_OUT_RATE; p._difficulty = 0.5; return; }
    let xOut;
    if(INFIELD_POS[p._pos]){
      xOut = _ifGrid ? _ifGrid(p) : GLOBAL_OUT_RATE;
    } else {
      const f = _ofCurves[_ofKey1(p)] || _ofCurves2[_ofKey2(p)] || _ofFallback;
      xOut = f(p._moveDist);
    }
    p._xOut = Math.max(0.02, Math.min(0.98, xOut));
  });

  // ═══ V11.5: zero-sum 캘리브레이션 — 내야/외야 구역별로 분리 ═══
  // 기존엔 리그 전체를 한 번에 보정했으나, 내야(아웃률 85~95%)와 외야(27~40%)의
  // 스무딩 편향 방향이 반대라 상쇄되지 않았음.
  //   실측(36경기): 내야 총 OAA -66.3 / 외야 +29.2 → 리그 합 -37.1 (0이어야 정상)
  //   결과적으로 9팀 전원 내야 OAA가 마이너스 = 내야수는 잘해도 감점되는 구조
  // → 구역별로 각각 합이 0이 되도록 보정. 순위 왜곡은 거의 없고(1쌍 교체)
  //   내야 평균 수비수가 0 근처로 정상화되어 포지션 간 비교도 유지됨.
  window._defPerf.curves = performance.now();
  const _calibZone = (arr) => {
    if(!arr.length) return 0;
    const act = arr.filter(p => p._isOut).length;
    let exp = 0; arr.forEach(p => { exp += p._xOut; });
    return (act - exp)/arr.length;
  };
  const _zoneOf = p => (p._pos && INFIELD_POS[p._pos]) ? 'IF' : 'OF';
  const _byZone = {IF:[], OF:[]};
  enriched.forEach(p => { _byZone[_zoneOf(p)].push(p); });
  const _calibIF = _calibZone(_byZone.IF);
  const _calibOF = _calibZone(_byZone.OF);
  enriched.forEach(p => {
    const _c = _zoneOf(p)==='IF' ? _calibIF : _calibOF;
    p._xOut = Math.max(0.02, Math.min(0.98, p._xOut + _c));
    p._difficulty = 1 - p._xOut;  // 0(쉬움)~1(어려움)
  });
  
  // V9.9: 키 그룹별 평균 이동속도 (키 보정 baseline) — 5cm bin
  // 실측: 160대 18.5 m/s, 190대 11.4 m/s (-38%)
  window._defPerf.curves=performance.now();
  const heightSpeedGrid = {};
  enriched.forEach(p => {
    if(p._playerH == null || p._moveSpeed == null) return;
    if(p._moveDist < 0.5 || p._reactTime < 0.1 || p._reactTime > 10) return;
    const hBin = Math.floor(p._playerH / 5) * 5;
    if(!heightSpeedGrid[hBin]) heightSpeedGrid[hBin] = [];
    heightSpeedGrid[hBin].push(p._moveSpeed);
  });
  const heightAvgSpeed = {};  // 키 그룹별 평균 속도 (중앙값 사용 - 더 robust)
  Object.entries(heightSpeedGrid).forEach(([hBin, arr]) => {
    if(arr.length < 30){ heightAvgSpeed[hBin] = null; return; }
    const sorted = [...arr].sort((a,b)=>a-b);
    heightAvgSpeed[hBin] = sorted[Math.floor(sorted.length/2)];  // median
  });
  // 빈 bin은 인접 bin으로 보간
  const sortedBins = Object.keys(heightAvgSpeed).map(Number).sort((a,b)=>a-b);
  function getExpectedSpeed(height){
    if(height == null) return null;
    const hBin = Math.floor(height / 5) * 5;
    if(heightAvgSpeed[hBin] != null) return heightAvgSpeed[hBin];
    // 가장 가까운 bin 찾기
    let bestBin = null, bestDist = Infinity;
    for(const b of sortedBins){
      if(heightAvgSpeed[b] != null){
        const d = Math.abs(b - hBin);
        if(d < bestDist){ bestDist = d; bestBin = b; }
      }
    }
    return bestBin != null ? heightAvgSpeed[bestBin] : null;
  }
  
  // V9.9: 송구 데이터 — 베이스 송구 시도 분석
  // 1루로 송구 (땅볼 처리 후): cPlr이 잡고 1B에게 패스. 이건 일반 아웃 처리에 이미 포함
  // 도루 저지: sb2Sec(2루 도루 시각), sb3Sec, sbhSec, cpSec(포수 송구 시각)
  // 송구 거리/속도는 다른 분석이 필요 — 일단 패스
  
  // V9.9: 선수 × 포지션별 분리 구조 + 게임 단위 키 빈도
  const byPlayerPos = {};
  enriched.forEach(p => {
    if(!p._pos) return;
    const name = p._cplr;
    if(!byPlayerPos[name]) byPlayerPos[name] = {};
    if(!byPlayerPos[name][p._pos]){
      byPlayerPos[name][p._pos] = {
        name, pos: p._pos, chances: 0, outs: 0, hits: 0,
        oaa: 0, oaaWeighted: 0,
        easy: {total:0, outs:0, expOuts:0},
        medium: {total:0, outs:0, expOuts:0},
        hard: {total:0, outs:0, expOuts:0},
        moveDistSum: 0, moveDistN: 0,
        longRunouts: 0,  // 10m 이상 이동 후 잡음 (어려운 잡기)
        farLongCatches: 0,  // 15m+ 잡음 (매우 어려운 잡기)
        hardEvCatches: 0,  // EV >= 105 잡음
        heightCounts: {},  // 게임별 사용한 키 빈도 — 포지션별
        plays: []
      };
    }
    const s = byPlayerPos[name][p._pos];
    s.chances++;
    if(p._isOut) s.outs++;
    if(p._isHit) s.hits++;
    s.oaa += (p._isOut ? 1 : 0) - p._xOut;
    
    // V11.5: 난이도 가중치 제거 — 순수 OAA로 통일
    //   기존엔 난이도별 weight(1.0~1.5)를 곱했으나, 이는 xOut에 이미 반영된 난이도를
    //   한 번 더 보상하는 이중 계산이었고 무엇보다 zero-sum이 깨졌음
    //   (실측 시뮬 2000플레이: 순수합 +0.5 vs 가중합 -51.0).
    //   구역별·포지션별 캘리브레이션으로 잡아둔 편향이 가중치 때문에 무의미해지므로
    //   oaaWeighted를 순수 OAA와 동일하게 유지 — 전 화면(수비분석·수비수상세·팀탭·리그전·내보내기) 값 통일.
    s.oaaWeighted += (p._isOut ? 1 : 0) - p._xOut;
    
    let cat;
    if(p._xOut >= 0.7) cat = s.easy;
    else if(p._xOut >= 0.3) cat = s.medium;
    else cat = s.hard;
    cat.total++;
    cat.expOuts += p._xOut;
    if(p._isOut) cat.outs++;
    
    if(p._moveDist != null){ s.moveDistSum += p._moveDist; s.moveDistN++; }
    if(p._moveDist != null && p._moveDist >= 10 && p._isOut) s.longRunouts++;
    if(p._moveDist != null && p._moveDist >= 15 && p._isOut) s.farLongCatches++;
    if(p._ev >= 105 && p._isOut) s.hardEvCatches++;
    
    // 포지션별 키 빈도
    if(p._playerH != null){
      const h = Math.round(p._playerH * 10) / 10;  // 0.1cm 단위
      s.heightCounts[h] = (s.heightCounts[h] || 0) + 1;
    }
    s.plays.push(p);
  });
  
  // 포지션별 평균 계산
  Object.values(byPlayerPos).forEach(byPos => {
    Object.values(byPos).forEach(s => {
      s.outRate = s.chances > 0 ? s.outs/s.chances : 0;
      s.avgMoveDist = s.moveDistN > 0 ? s.moveDistSum/s.moveDistN : 0;
      s.hardCatchRate = s.hard.total > 0 ? s.hard.outs/s.hard.total*100 : 0;
      s.easyMissCount = s.easy.total - s.easy.outs;
      s.oaaPer10 = s.chances > 0 ? s.oaaWeighted/s.chances*10 : 0;
      // 포지션별 모드 키 (가장 자주 사용한 키)
      const hSorted = Object.entries(s.heightCounts).sort((a,b) => b[1] - a[1]);
      s.modeHeight = hSorted[0] ? +hSorted[0][0] : null;
      s.heightUsage = hSorted[0] && s.chances > 0 ? hSorted[0][1] / s.chances : 0;
    });
  });
  
  // 선수별 종합 — 합산 X, 주 포지션 stat 위주
  window._defPerf.calib = performance.now();
  window._defPerf.grid=performance.now();
  const byPlayer = {};
  Object.entries(byPlayerPos).forEach(([name, byPos]) => {
    const posEntries = Object.entries(byPos);
    let chances=0, outs=0, hits=0, moveDistSum=0, moveDistN=0;
    let longRunouts=0, farLongCatches=0, hardEvCatches=0;
    const posMap = {};
    posEntries.forEach(([pk, s]) => {
      chances += s.chances; outs += s.outs; hits += s.hits;
      moveDistSum += s.moveDistSum; moveDistN += s.moveDistN;
      longRunouts += s.longRunouts;
      farLongCatches += s.farLongCatches;
      hardEvCatches += s.hardEvCatches;
      posMap[pk] = s.chances;
    });
    const posSorted = posEntries.sort((a,b) => b[1].chances - a[1].chances);
    const primaryPos = posSorted[0] ? posSorted[0][0] : '?';
    const primaryStat = posSorted[0] ? posSorted[0][1] : null;
    
    byPlayer[name] = {
      name, chances, outs, hits,
      outRate: chances > 0 ? outs/chances : 0,
      avgMoveDist: moveDistN > 0 ? moveDistSum/moveDistN : 0,
      longRunouts, farLongCatches, hardEvCatches,
      posMap,
      // 전체 평균 키 (글로벌 모드)
      height: playerHeight[name] || null,
      primaryPos,
      primaryPosShare: primaryStat ? primaryStat.chances/chances : 0,
      primaryOaa: primaryStat ? primaryStat.oaaWeighted : 0,
      primaryOaaRaw: primaryStat ? primaryStat.oaa : 0,
      primaryOaaPer10: primaryStat && primaryStat.chances > 0 ? primaryStat.oaaWeighted/primaryStat.chances*10 : 0,
      primaryChances: primaryStat ? primaryStat.chances : 0,
      primaryOutRate: primaryStat ? primaryStat.outRate : 0,
      primaryHardCatch: primaryStat ? primaryStat.hardCatchRate : 0,
      primaryEasyMiss: primaryStat ? primaryStat.easyMissCount : 0,
      primaryHardTotal: primaryStat ? primaryStat.hard.total : 0,
      primaryEasyTotal: primaryStat ? primaryStat.easy.total : 0,
      primaryAvgMoveDist: primaryStat ? primaryStat.avgMoveDist : 0,
      primaryLongRunouts: primaryStat ? primaryStat.longRunouts : 0,
      primaryHeight: primaryStat ? primaryStat.modeHeight : null,
      primaryHeightUsage: primaryStat ? primaryStat.heightUsage : 0,
      totalOaa: posEntries.reduce((sum, [_, s]) => sum + s.oaaWeighted, 0),
      byPos
    };
  });
  
  // 별칭 — 기존 코드 호환 (간소화)
  Object.values(byPlayer).forEach(s => {
    s.oaa = s.primaryOaa;
    s.oaaPer10 = s.primaryOaaPer10;
    s.outRatePrimary = s.primaryOutRate;
    s.chancesPrimary = s.primaryChances;
    s.chancesSecondary = s.chances - s.primaryChances;
  });
  
  // result에 byPlayerPos도 포함
  
  // 포지션별 통계
  window._defPerf.player=performance.now();
  const byPos = {};
  enriched.forEach(p => {
    const pk = p._pos || '?';
    if(!byPos[pk]) byPos[pk] = { chances:0, outs:0, evSum:0, evN:0, distSum:0, distN:0, timeSum:0, timeN:0 };
    const s = byPos[pk];
    s.chances++;
    if(p._isOut) s.outs++;
    if(p._ev > 0){ s.evSum += p._ev; s.evN++; }
    if(p._moveDist != null){ s.distSum += p._moveDist; s.distN++; }
    if(p._reactTime != null){ s.timeSum += p._reactTime; s.timeN++; }
  });
  Object.entries(byPos).forEach(([k, s]) => {
    s.outRate = s.chances > 0 ? s.outs / s.chances : 0;
    s.avgEv = s.evN > 0 ? s.evSum / s.evN : 0;
    s.avgDist = s.distN > 0 ? s.distSum / s.distN : 0;
    s.avgTime = s.timeN > 0 ? s.timeSum / s.timeN : 0;
    s.posName = posNameKor[k] || k;
  });
  
  window._defPerf.end = performance.now();
  const result = { enriched, byPlayer, byPlayerPos, byPos, posKeys, posNameKor, globalOutRate: GLOBAL_OUT_RATE, heightAvgSpeed, _gKey: wbdContext.G.length };
  window._defPerf.end=performance.now();
  window._defenseDataCache = result;
  return result;
};

// Original index.html:21276
wbdContext.setDefenseSort = function setDefenseSort(key){
  // 낮을수록 좋은 지표
  // V9.9: 낮을수록 좋은 지표는 첫 클릭 시 오름차순
  const ascDefault = ['easyMiss'].includes(key);
  if(window._defenseState.sortKey === key){
    window._defenseState.sortDir = window._defenseState.sortDir === 'desc' ? 'asc' : 'desc';
  } else {
    window._defenseState.sortKey = key;
    window._defenseState.sortDir = ascDefault ? 'asc' : 'desc';
  }
  wbdContext.renderDefensePage();
};

// Original index.html:21294
wbdContext.renderBallMapPage = function renderBallMapPage(){
  const st=window._ballmapState;
  const el=document.getElementById('ballmap-content');
  if(!el) return;
  // ── 데이터 수집: 활성 게임 전체 인플레이 (낙구좌표 있는 것) ──
  const games=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id));
  // 날짜 정렬 (최근 필터용)
  const sorted=[...games].sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  let useGames=sorted;
  if(st.period==='r5') useGames=sorted.slice(-5);
  else if(st.period==='r10') useGames=sorted.slice(-10);
  else if(st.period==='r20') useGames=sorted.slice(-20);
  const useIds=new Set(useGames.map(g=>g.id));
  let balls=[];
  const teamSet=new Set();
  useGames.forEach(g=>{
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA), tB=wbdContext._normalizeTeam(info.teamB);
    if(tA) teamSet.add(tA); if(tB) teamSet.add(tB);
    (g.pitches||[]).forEach(d=>{
      if(!wbdContext._isInPlay(d)||wbdContext._isBunt(d)) return;
      const lx=+d.lx, lz=+d.lz;
      if(!lx&&!lz) return;
      if(d.ldeg==null) return;
      // 공격 팀 = half 1이면 teamA(초 공격), 아니면 teamB
      d._atkTeam = d.half===1 ? tA : tB;
      balls.push(d);
    });
  });
  const teamList=[...teamSet].sort();
  if(st.team!=='all') balls=balls.filter(d=>d._atkTeam===st.team);
  // ── 필터 적용 ──
  const la=d=>+d.ldeg, ev=d=>+d.ev;
  if(st.traj==='gb') balls=balls.filter(d=>la(d)<10);
  else if(st.traj==='ld') balls=balls.filter(d=>la(d)>=10&&la(d)<25);
  else if(st.traj==='fb') balls=balls.filter(d=>la(d)>=25&&la(d)<40);
  else if(st.traj==='pop') balls=balls.filter(d=>la(d)>=40);
  if(st.quality==='hh') balls=balls.filter(d=>ev(d)>=110);
  else if(st.quality==='hhp') balls=balls.filter(d=>wbdContext._isHHPlus(d));
  else if(st.quality==='brlp') balls=balls.filter(d=>wbdContext._isBarrelPlus(d));
  const isHitB=d=>(+d['1BSafe']===1)||(+d.result===4);
  if(st.result==='hit') balls=balls.filter(d=>isHitB(d));
  else if(st.result==='out') balls=balls.filter(d=>!isHitB(d));
  else if(st.result==='hr') balls=balls.filter(d=>+d.result===4);
  // ── 통계 요약 ──
  const n=balls.length;
  const hits=balls.filter(d=>isHitB(d)).length;
  const hrs=balls.filter(d=>+d.result===4).length;
  const avgEvV=n?(balls.reduce((s,d)=>s+ev(d),0)/n):0;
  const avgLaV=n?(balls.reduce((s,d)=>s+la(d),0)/n):0;
  const dirCnt={pull:0,cen:0,opp:0};
  balls.forEach(d=>{const k=wbdContext._fieldSide(d,15); if(k==='left')dirCnt.pull++; else if(k==='center')dirCnt.cen++; else if(k==='right')dirCnt.opp++;});
  // ── 필터 바 UI ──
  const btn=(grp,val,label)=>{
    const active=st[grp]===val;
    return `<button onclick="window._ballmapState.${grp}='${val}';renderBallMapPage()" style="background:${active?'var(--amber)':'rgba(255,255,255,0.04)'};color:${active?'#000':'var(--muted)'};border:1px solid ${active?'var(--amber)':'var(--border)'};padding:5px 10px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:${active?'700':'500'}">${label}</button>`;
  };
  let html=`<div class="card section" style="padding:14px 16px">
    <div class="card-title" style="margin-bottom:10px">🗺️ 리그 전체 타구 낙구 분석 <span style="font-size:10px;color:var(--muted)">(V11.2 · 메타 확인 · 활성 경기 대상 · 파울/번트 제외)</span></div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:6px">
      <div><span style="font-size:10px;color:var(--muted);margin-right:6px">팀(공격)</span><select onchange="window._ballmapState.team=this.value;renderBallMapPage()" style="background:rgba(255,255,255,0.05);color:var(--text);border:1px solid var(--border);padding:4px 8px;border-radius:4px;font-size:11px">
        <option value="all" ${st.team==='all'?'selected':''}>전체 팀</option>
        ${teamList.map(t=>`<option value="${t}" ${st.team===t?'selected':''}>${t}</option>`).join('')}
      </select></div>
      <div><span style="font-size:10px;color:var(--muted);margin-right:6px">기간</span>${btn('period','all','전체')}${btn('period','r20','최근20')}${btn('period','r10','최근10')}${btn('period','r5','최근5')}</div>
      <div><span style="font-size:10px;color:var(--muted);margin-right:6px">궤적</span>${btn('traj','all','전체')}${btn('traj','gb','땅볼')}${btn('traj','ld','라인드')}${btn('traj','fb','뜬공')}${btn('traj','pop','팝업')}</div>
      <div><span style="font-size:10px;color:var(--muted);margin-right:6px">품질</span>${btn('quality','all','전체')}${btn('quality','hh','HH(110+)')}${btn('quality','hhp','HH+(125+)')}${btn('quality','brlp','배럴+')}</div>
      <div><span style="font-size:10px;color:var(--muted);margin-right:6px">결과</span>${btn('result','all','전체')}${btn('result','hit','안타만')}${btn('result','out','아웃만')}${btn('result','hr','홈런만')}</div>
      <div><span style="font-size:10px;color:var(--muted);margin-right:6px">표시</span>${btn('view','dots','점')}${btn('view','heat','히트맵')}${btn('view','both','점+히트맵')}</div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:18px;font-size:12px;color:#cdd6e0;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">
      <span>타구 <b style="color:#fff">${n}</b>개</span>
      <span>BA <b style="color:#39ff8a">${n?(hits/n).toFixed(3).replace(/^0/,''):'-'}</b></span>
      <span>HR <b style="color:#ffd700">${hrs}</b></span>
      <span>평균 EV <b>${n?avgEvV.toFixed(1):'-'}</b></span>
      <span>평균 LA <b>${n?avgLaV.toFixed(1)+'°':'-'}</b></span>
      <span>방향: 좌측 <b>${n?(dirCnt.pull/n*100).toFixed(0):0}%</b> · 중앙 <b>${n?(dirCnt.cen/n*100).toFixed(0):0}%</b> · 우측 <b>${n?(dirCnt.opp/n*100).toFixed(0):0}%</b></span>
      <span style="color:var(--muted)">대상 경기 ${useGames.length}</span>
    </div>
  </div>`;
  html+=`<div class="card section"><div id="ballmap-field"></div></div>`;
  // 팀별 요약 비교 테이블 (팀=전체일 때)
  if(st.team==='all' && teamList.length>=2){
    const rows=teamList.map(t=>{
      const tb=balls.filter(d=>d._atkTeam===t);
      if(tb.length<10) return null;
      const th=tb.filter(d=>(+d['1BSafe']===1)||(+d.result===4)).length;
      const tev=tb.reduce((s,d)=>s+(+d.ev),0)/tb.length;
      const tla=tb.reduce((s,d)=>s+(+d.ldeg),0)/tb.length;
      const dc={p:0,c:0,o:0};
      tb.forEach(d=>{const k=wbdContext._fieldSide(d,15); if(k==='left')dc.p++; else if(k==='center')dc.c++; else if(k==='right')dc.o++;});
      const brlp=tb.filter(d=>wbdContext._isBarrelPlus(d)).length;
      return {t,n:tb.length,ba:th/tb.length,ev:tev,la:tla,pull:dc.p/tb.length*100,cen:dc.c/tb.length*100,opp:dc.o/tb.length*100,brlp:brlp/tb.length*100};
    }).filter(Boolean).sort((a,b)=>b.ba-a.ba);
    if(rows.length){
      html+=`<div class="card section"><div class="card-title">팀별 타구 프로파일 <span style="font-size:10px;color:var(--muted)">(현재 필터 적용 · 클릭=해당 팀만 보기)</span></div>
      <div class="tbl-wrap"><table class="data-table compact"><thead><tr><th>팀</th><th>타구</th><th>BA</th><th>평균EV</th><th>평균LA</th><th>좌측%</th><th>중앙%</th><th>우측%</th><th>배럴+%</th></tr></thead><tbody>
      ${rows.map(r=>`<tr style="cursor:pointer" onclick="window._ballmapState.team='${r.t}';renderBallMapPage()"><td>${r.t}</td><td>${r.n}</td><td>${r.ba.toFixed(3).replace(/^0/,'')}</td><td>${r.ev.toFixed(1)}</td><td>${r.la.toFixed(1)}°</td><td>${r.pull.toFixed(0)}</td><td>${r.cen.toFixed(0)}</td><td>${r.opp.toFixed(0)}</td><td>${r.brlp.toFixed(1)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
    }
  }
  el.innerHTML=html;
  wbdContext._renderBallMapField(balls);
};

// Original index.html:21398
wbdContext._renderBallMapField = function _renderBallMapField(balls){
  const el=document.getElementById('ballmap-field');
  if(!el) return;
  const st=window._ballmapState;
  const dots=balls.map(d=>{
    const isHR=+d.result===4;
    const isH=(+d['1BSafe']===1)||isHR;
    return {lx:+d.lx, lz:+d.lz,
            color:isHR?'#ffd700':(isH?'#39ff8a':'#8090a0'),
            r:2.4, op:st.view==='both'?0.55:0.8};
  });
  const svg=wbdContext._renderSprayField(dots,{
    w:520,h:440,pad:12,
    heat:(st.view==='heat'||st.view==='both'),
    dots:(st.view==='dots'||st.view==='both'),
    cell:5
  });
  const legend='<div style="font-size:10px;color:#cdd6e0;margin-top:4px">🟡 홈런 · 🟢 안타 · ⚪ 아웃'+(st.view!=='dots'?' · 히트맵: 밀도(빨강=최다)':'')+'</div>';
  el.innerHTML='<div style="max-width:520px;margin:0 auto">'+svg+legend+'</div>';
  el.querySelectorAll('.sf-dot').forEach(dot=>{
    dot.addEventListener('mouseenter',e=>{const d=balls[+dot.dataset.i];if(d)wbdContext.showTip(e,`${d.bName||''} vs ${d.pName||''}<br>EV:${d.ev} LA:${d.ldeg}°<br>${wbdContext.RESULT_NAMES[d.result]||''}`);});
    dot.addEventListener('mousemove',wbdContext.moveTip);dot.addEventListener('mouseleave',wbdContext.hideTip);
  });
  el.querySelectorAll('.sf-cell').forEach(c=>{
    c.addEventListener('mouseenter',e=>wbdContext.showTip(e,`이 구역 낙구 ${c.dataset.cnt}개`));
    c.addEventListener('mousemove',wbdContext.moveTip);c.addEventListener('mouseleave',wbdContext.hideTip);
  });
};

// Original index.html:21432
wbdContext._leagueDefenseStats = function _leagueDefenseStats(gameIdSet, teamMap){
  // 캐시 키: 경기 ID 집합의 내용까지 반영 (크기만 같고 내용이 다른 경우 오염 방지)
  const key = (gameIdSet
    ? ('g:'+gameIdSet.size+':'+[...gameIdSet].sort().slice(0,40).join(','))
    : 'all') + (teamMap ? '|tm' : '');
  if(!window._lgDefStatsCacheMap || window._lgDefStatsCacheMap._k!==wbdContext.G.length)
    window._lgDefStatsCacheMap={_k:wbdContext.G.length, m:{}};
  const cached = window._lgDefStatsCacheMap.m[key];
  if(cached) return cached;
  const data=wbdContext._computeDefenseData();
  if(!data||!data.enriched) return null;
  const IFA=new Set(['P','C','1B','2B','3B','SS']);
  const rows=data.enriched.filter(p=>{
    if(!p._pos) return false;
    if(gameIdSet && !gameIdSet.has(p._gameId)) return false;
    return true;
  });
  // 포지션별 리그 기준
  const lgPos={};
  rows.forEach(p=>{
    const k=p._pos;
    if(!lgPos[k]) lgPos[k]={n:0,outs:0,oaa:0};
    lgPos[k].n++; if(p._isOut)lgPos[k].outs++;
    lgPos[k].oaa += (p._isOut?1:0) - (p._xOut||0);
  });
  Object.values(lgPos).forEach(v=>{ v.outRate=v.n>0?v.outs/v.n:0; });
  // 선수 × 포지션
  const pp={};
  rows.forEach(p=>{
    const _nm = p._cplr || p.cPlr;
    if(!_nm) return;
    const k=_nm+'\u0000'+p._pos;
    if(!pp[k]) pp[k]={name:_nm,pos:p._pos,n:0,outs:0,oaa:0,assigned:0,team:null};
    const s=pp[k];
    s.n++; if(p._isOut)s.outs++;
    s.oaa += (p._isOut?1:0) - (p._xOut||0);
    if(p._assigned) s.assigned++;
  });
  const players=Object.values(pp).map(s=>{
    const lg=lgPos[s.pos]||{outRate:0};
    s.team = teamMap ? (teamMap[s.name] || null) : wbdContext._playerTeam(s.name,'batter');
    s.outRate=s.n>0?s.outs/s.n:0;
    s.vsLeague=(s.outRate-lg.outRate)*100;
    s.oaaPer10=s.n>0?s.oaa/s.n*10:0;
    s.lgOutRate=lg.outRate;
    return s;
  });
  // 포지션별 백분위
  const byPos={};
  players.forEach(s=>{ (byPos[s.pos]||(byPos[s.pos]=[])).push(s); });
  Object.values(byPos).forEach(arr=>{
    const qual=arr.filter(s=>s.n>=5).map(s=>s.oaaPer10).sort((a,b)=>a-b);
    arr.forEach(s=>{
      s.pctile = qual.length>=3 ? qual.filter(v=>v<=s.oaaPer10).length/qual.length : null;
    });
  });
  // 팀 × 포지션
  const teamPos={};
  players.forEach(s=>{
    if(!s.team||s.team==='—') return;   // teamMap 사용 시 해당 범위 미출전 선수는 자동 제외
    const k=s.team+'\u0000'+s.pos;
    if(!teamPos[k]) teamPos[k]={team:s.team,pos:s.pos,n:0,outs:0,oaa:0,players:[]};
    const t=teamPos[k];
    t.n+=s.n; t.outs+=s.outs; t.oaa+=s.oaa; t.players.push(s);
  });
  Object.values(teamPos).forEach(t=>{
    const lg=lgPos[t.pos]||{outRate:0};
    t.outRate=t.n>0?t.outs/t.n:0;
    t.vsLeague=(t.outRate-lg.outRate)*100;
    t.players.sort((a,b)=>b.n-a.n);
  });
  // 팀 종합
  const teams={};
  Object.values(teamPos).forEach(t=>{
    if(!teams[t.team]) teams[t.team]={team:t.team,oaa:0,n:0,ifOaa:0,ifN:0,ifOuts:0,ofOaa:0,ofN:0,ofOuts:0,byPos:{}};
    const T=teams[t.team];
    T.oaa+=t.oaa; T.n+=t.n; T.byPos[t.pos]=t;
    if(IFA.has(t.pos)){ T.ifOaa+=t.oaa; T.ifN+=t.n; T.ifOuts+=t.outs; }
    else { T.ofOaa+=t.oaa; T.ofN+=t.n; T.ofOuts+=t.outs; }
  });
  // 리그 내야/외야 기준
  let lgIfN=0,lgIfO=0,lgOfN=0,lgOfO=0;
  Object.entries(lgPos).forEach(([pos,v])=>{
    if(IFA.has(pos)){lgIfN+=v.n;lgIfO+=v.outs;} else {lgOfN+=v.n;lgOfO+=v.outs;}
  });
  const lgIfRate=lgIfN>0?lgIfO/lgIfN:0, lgOfRate=lgOfN>0?lgOfO/lgOfN:0;
  Object.values(teams).forEach(T=>{
    T.ifOutRate=T.ifN>0?T.ifOuts/T.ifN:0;
    T.ofOutRate=T.ofN>0?T.ofOuts/T.ofN:0;
    T.ifVsLeague=(T.ifOutRate-lgIfRate)*100;
    T.ofVsLeague=(T.ofOutRate-lgOfRate)*100;
  });
  const teamArr=Object.values(teams).sort((a,b)=>b.oaa-a.oaa);
  teamArr.forEach((t,i)=>t.rank=i+1);
  const v={lgPos, players, byPos, teamPos, teams:teamArr,
           lgIfRate, lgOfRate, totalPlays:rows.length};
  window._lgDefStatsCacheMap.m[key]=v;
  return v;
};

// Original index.html:21534
wbdContext._sortTable = function _sortTable(th){
  const table=th.closest('table'); if(!table) return;
  const tbody=table.querySelector('tbody'); if(!tbody) return;
  const idx=Array.from(th.parentNode.children).indexOf(th);
  const cur=table.getAttribute('data-sort-col');
  const curDir=table.getAttribute('data-sort-dir')||'desc';
  const dir = (String(cur)===String(idx) && curDir==='desc') ? 'asc' : 'desc';
  table.setAttribute('data-sort-col',idx);
  table.setAttribute('data-sort-dir',dir);
  const parse=(td)=>{
    const raw=(td.getAttribute('data-v') != null) ? td.getAttribute('data-v') : td.textContent;
    const s=String(raw).replace(/[,%p\s]/g,'').replace(/[^\d.+-eE]/g,'');
    const n=parseFloat(s);
    return isNaN(n) ? null : n;
  };
  const rows=Array.from(tbody.querySelectorAll('tr'));
  rows.sort((a,b)=>{
    const ta=a.children[idx], tb=b.children[idx];
    if(!ta||!tb) return 0;
    const na=parse(ta), nb=parse(tb);
    if(na!=null && nb!=null) return dir==='desc' ? nb-na : na-nb;
    const sa=(ta.textContent||'').trim(), sb=(tb.textContent||'').trim();
    return dir==='desc' ? sb.localeCompare(sa) : sa.localeCompare(sb);
  });
  rows.forEach(r=>tbody.appendChild(r));
  // 헤더 화살표 갱신
  th.parentNode.querySelectorAll('th').forEach(h=>{
    const b=h.getAttribute('data-label');
    if(b!=null) h.innerHTML=b;
  });
  const lbl=th.getAttribute('data-label')||th.textContent;
  th.innerHTML=lbl+`<span style="color:var(--amber);margin-left:2px">${dir==='desc'?'▼':'▲'}</span>`;
  // 순번 열(#) 재부여
  rows.forEach((r,i)=>{
    const c0=r.children[0];
    if(c0 && c0.getAttribute('data-rank')!=null) c0.textContent=i+1;
  });
};

// Original index.html:21573
wbdContext._sortTh = function _sortTh(label, title){
  const t=title?` title="${title}"`:'';
  return `<th data-label="${label}" onclick="_sortTable(this)" style="cursor:pointer;user-select:none"${t}>${label}</th>`;
};

// Original index.html:21580
wbdContext._defColor = function _defColor(v,hi,lo){ return v>=hi?'#39ff8a':v<=lo?'#ff4560':'var(--text)'; };

// Original index.html:21582
wbdContext._renderDefPosLeaderboard = function _renderDefPosLeaderboard(S, opts){
  opts=opts||{};
  const minCh=opts.minChances||5;
  const teamFilter=opts.team||null;
  let html='';
  wbdContext._DEF_POSORD.forEach(pos=>{
    const lg=S.lgPos[pos];
    if(!lg||lg.n<20) return;
    let arr=(S.byPos[pos]||[]).filter(s=>s.n>=minCh);
    if(teamFilter) arr=arr.filter(s=>s.team===teamFilter);
    if(!arr.length) return;
    arr.sort((a,b)=>b.oaaPer10-a.oaaPer10);
    const rows=arr.map((s,i)=>{
      const vc=wbdContext._defColor(s.vsLeague,8,-8);
      const oc=wbdContext._defColor(s.oaa,1,-1);
      const nm=String(s.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      return `<tr>
        <td style="color:var(--muted);font-size:10px">${i+1}</td>
        <td style="font-weight:600;cursor:pointer;color:var(--amber)" onclick="goToDefender('${nm}')">${s.name}</td>
        <td style="font-size:10px;color:var(--muted)">${s.team||'-'}</td>
        <td style="font-family:var(--mono)">${s.n}</td>
        <td style="font-family:var(--mono)">${(s.outRate*100).toFixed(1)}%</td>
        <td style="font-family:var(--mono);color:${vc};font-weight:${Math.abs(s.vsLeague)>8?'700':'400'}">${s.vsLeague>=0?'+':''}${s.vsLeague.toFixed(1)}%p</td>
        <td style="font-family:var(--mono);color:${oc};font-weight:600">${s.oaa>=0?'+':''}${s.oaa.toFixed(1)}</td>
        <td style="font-family:var(--mono);color:${oc}">${s.oaaPer10>=0?'+':''}${s.oaaPer10.toFixed(2)}</td>
        ${opts.showAssigned!==false?`<td style="font-family:var(--mono);color:${s.assigned>0?'#ff8c44':'var(--muted)'}">${s.assigned||0}</td>`:''}
        <td style="font-size:10px">${s.pctile!=null?`<span style="color:${wbdContext._pctColor(s.pctile)}">${wbdContext._pctTier(s.pctile)}</span>`:'-'}</td>
      </tr>`;
    }).join('');
    html+=`<div class="card section">
      <div class="card-title">${(wbdContext._computeDefenseData().posNameKor||{})[pos]||pos}
        <span style="font-size:10px;color:var(--muted);font-weight:400">리그 아웃률 ${(lg.outRate*100).toFixed(1)}% · ${lg.n}기회 · ${minCh}기회 이상</span></div>
      <div class="tbl-wrap"><table class="data-table compact"><thead><tr>
        <th>#</th>${wbdContext._sortTh('선수')}${wbdContext._sortTh('팀')}${wbdContext._sortTh('기회')}${wbdContext._sortTh('아웃률')}${wbdContext._sortTh('리그대비','리그 동일 포지션 평균 대비')}
        ${wbdContext._sortTh('OAA')}${wbdContext._sortTh('OAA/10','10기회당 OAA — 기회 수가 다른 선수 비교용')}
        ${opts.showAssigned!==false?wbdContext._sortTh('통과','내야를 통과당한 땅볼 수 (수비 범위 지표)'):''}
        ${wbdContext._sortTh('등급','같은 포지션 내 등급')}
      </tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  });
  return html||'<div style="padding:20px;text-align:center;color:var(--muted)">표시할 데이터가 없습니다</div>';
};

// Original index.html:21625
wbdContext._renderDefMatrix = function _renderDefMatrix(S, highlightTeam){
  const teams=S.teams.map(t=>t.team);
  if(!teams.length) return '';
  const head=`<tr><th style="text-align:left">포지션</th><th>리그</th>${teams.map(t=>`<th style="${t===highlightTeam?'color:var(--amber)':''}">${t}</th>`).join('')}</tr>`;
  const body=wbdContext._DEF_POSORD.map(pos=>{
    const lg=S.lgPos[pos];
    if(!lg||lg.n<20) return '';
    const cells=teams.map(t=>{
      const tp=S.teamPos[t+'\u0000'+pos];
      if(!tp||tp.n<5) return '<td style="color:var(--muted)">-</td>';
      const c=wbdContext._defColor(tp.vsLeague,8,-8);
      return `<td style="font-family:var(--mono);color:${c};font-weight:${Math.abs(tp.vsLeague)>8?'700':'400'};${t===highlightTeam?'background:rgba(245,166,35,0.08)':''}" title="${tp.team} ${pos}: 아웃률 ${(tp.outRate*100).toFixed(1)}% (${tp.n}기회) · OAA ${tp.oaa.toFixed(1)}">${tp.vsLeague>=0?'+':''}${tp.vsLeague.toFixed(1)}</td>`;
    }).join('');
    return `<tr><td style="font-weight:600;text-align:left">${(wbdContext._computeDefenseData().posNameKor||{})[pos]||pos}</td>
      <td style="font-family:var(--mono);color:var(--muted)">${(lg.outRate*100).toFixed(0)}%</td>${cells}</tr>`;
  }).join('');
  return `<div class="card section">
    <div class="card-title">팀 × 포지션 매트릭스 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 평균 아웃률 대비 %p · 5기회 이상)</span></div>
    <div class="tbl-wrap"><table class="data-table compact" style="text-align:center"><thead>${head}</thead><tbody>${body}</tbody></table></div>
    <div style="font-size:10px;color:var(--muted);margin-top:6px">🟢 +8%p 이상 · 🔴 −8%p 이하 · 셀에 마우스를 올리면 상세</div>
  </div>`;
};

// Original index.html:21649
wbdContext._renderLeagueDefense = function _renderLeagueDefense(season, games){
  try{
    // V11.6: 다른 리그전 탭과 동일하게 _withSeasonGames로 시즌 전체를 계산
    //   (기존엔 활성 경기에서만 뽑아 비활성 경기가 통째로 누락됐음)
    // V11.5 fix: 선수 소속팀도 "이 리그전 경기 기준"으로 재판정
    //   (리그전 팀기록과 동일 로직 — _leaguePlayerTeams + 리그전 출전팀 화이트리스트)
    //   전체 활성 경기 기준 _playerTeam을 쓰면 연습경기 소속으로 잘못 분류되어
    //   리그전에 없는 팀(TWP·Dt·GE 등)이 표에 나타남
    const PT=wbdContext._leaguePlayerTeams(games);
    const lgTeams=new Set();
    games.forEach(g=>{ const i=wbdContext._parseGameName(g.name);
      [i.teamA,i.teamB].forEach(t=>{const n=wbdContext._normalizeTeam(t); if(n) lgTeams.add(n);}); });
    const tmap={};
    Object.entries(PT.batter||{}).forEach(([n,t])=>{ if(t&&lgTeams.has(t)) tmap[n]=t; });
    Object.entries(PT.pitcher||{}).forEach(([n,t])=>{ if(!tmap[n]&&t&&lgTeams.has(t)) tmap[n]=t; });
    // 시즌 경기를 임시 활성화한 상태에서 계산 (비활성 경기 포함)
    const S=wbdContext._withSeasonGames(games, ()=>wbdContext._leagueDefenseStats(null, tmap));
    const PASS=wbdContext._withSeasonGames(games, ()=>{ try{ return wbdContext._teamInfieldPassRate(); }catch(_){ return null; } });
    if(!S||!S.players.length) return '<div style="padding:40px;text-align:center;color:var(--muted)">수비 데이터가 없습니다</div>';
    if(!window._lgDefView) window._lgDefView='team';
    const view=window._lgDefView;
    const vb=(k,l)=>`<button onclick="window._lgDefView='${k}';renderLeaguePage()" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:${view===k?'var(--amber)':'var(--bg2)'};color:${view===k?'#000':'var(--muted)'};font-weight:600;cursor:pointer">${l}</button>`;

    let html=`<div class="card section" style="padding:10px 14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
      <span style="font-size:12px;color:var(--muted);margin-right:4px">${season} 수비</span>
      ${vb('team','🏆 팀 순위')}${vb('matrix','🔢 팀×포지션')}${vb('pos','👤 포지션별 선수')}${vb('best','⭐ 개인 랭킹')}
    </div>`;

    if(view==='team'){
      const pass=PASS;
      const rows=S.teams.map(t=>{
        const oc=v=>v>1?'#39ff8a':v<-1?'#ff4560':'var(--text)';
        const vc=v=>v>3?'#39ff8a':v<-3?'#ff4560':'var(--muted)';
        const p=pass&&pass.byTeam[t.team];
        return `<tr>
          <td style="color:var(--muted)">${t.rank}</td>
          <td style="font-weight:600">${wbdContext._teamLogoHTML(t.team,20)}${t.team}</td>
          <td style="font-family:var(--mono);color:${oc(t.oaa)};font-weight:700">${t.oaa>=0?'+':''}${t.oaa.toFixed(1)}</td>
          <td style="font-family:var(--mono)">${t.n}</td>
          <td style="font-family:var(--mono);color:${oc(t.ifOaa)}">${t.ifOaa>=0?'+':''}${t.ifOaa.toFixed(1)}</td>
          <td style="font-family:var(--mono)">${(t.ifOutRate*100).toFixed(1)}%</td>
          <td style="font-family:var(--mono);color:${vc(t.ifVsLeague)}">${t.ifVsLeague>=0?'+':''}${t.ifVsLeague.toFixed(1)}%p</td>
          <td style="font-family:var(--mono);color:${oc(t.ofOaa)}">${t.ofOaa>=0?'+':''}${t.ofOaa.toFixed(1)}</td>
          <td style="font-family:var(--mono)">${(t.ofOutRate*100).toFixed(1)}%</td>
          <td style="font-family:var(--mono);color:${vc(t.ofVsLeague)}">${t.ofVsLeague>=0?'+':''}${t.ofVsLeague.toFixed(1)}%p</td>
          <td style="font-family:var(--mono);color:${p?(p.vsLeague<-3?'#39ff8a':p.vsLeague>3?'#ff4560':'var(--muted)'):'var(--muted)'}">${p?p.rate.toFixed(1)+'%':'-'}</td>
        </tr>`;
      }).join('');
      html+=`<div class="card section">
        <div class="card-title">팀 수비 순위 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 내야 ${(S.lgIfRate*100).toFixed(1)}% · 외야 ${(S.lgOfRate*100).toFixed(1)}%)</span></div>
        <div class="tbl-wrap"><table class="data-table"><thead><tr>
          <th>#</th>${wbdContext._sortTh('팀')}${wbdContext._sortTh('OAA')}${wbdContext._sortTh('기회')}
          ${wbdContext._sortTh('내야','내야 OAA')}${wbdContext._sortTh('아웃률','내야 아웃률')}${wbdContext._sortTh('리그대비','내야 리그 평균 대비')}
          ${wbdContext._sortTh('외야','외야 OAA')}${wbdContext._sortTh('아웃률','외야 아웃률')}${wbdContext._sortTh('리그대비','외야 리그 평균 대비')}
          ${wbdContext._sortTh('통과율','땅볼 중 내야를 통과한 비율 — 낮을수록 범위 넓음')}
        </tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
      html+=wbdContext._renderDefMatrix(S);
    }
    else if(view==='matrix'){ html+=wbdContext._renderDefMatrix(S); }
    else if(view==='pos'){ html+=wbdContext._renderDefPosLeaderboard(S,{minChances:5}); }
    else if(view==='best'){
      const qual=S.players.filter(s=>s.n>=8);
      const mk=(arr,title,asc)=>{
        const rows=arr.map((s,i)=>{
          const c=s.oaa>=0?'#39ff8a':'#ff4560';
          return `<tr><td style="color:var(--muted)">${i+1}</td>
            <td style="font-weight:600">${s.name}</td><td style="font-size:10px;color:var(--muted)">${s.team||'-'}</td>
            <td>${(wbdContext._computeDefenseData().posNameKor||{})[s.pos]||s.pos}</td>
            <td style="font-family:var(--mono)">${s.n}</td>
            <td style="font-family:var(--mono)">${(s.outRate*100).toFixed(1)}%</td>
            <td style="font-family:var(--mono);color:${s.vsLeague>0?'#39ff8a':'#ff4560'}">${s.vsLeague>=0?'+':''}${s.vsLeague.toFixed(1)}%p</td>
            <td style="font-family:var(--mono);color:${c};font-weight:700">${s.oaa>=0?'+':''}${s.oaa.toFixed(1)}</td>
            <td style="font-family:var(--mono);color:${c}">${s.oaaPer10>=0?'+':''}${s.oaaPer10.toFixed(2)}</td></tr>`;
        }).join('');
        return `<div class="card section"><div class="card-title">${title} <span style="font-size:10px;color:var(--muted);font-weight:400">8기회 이상</span></div>
          <div class="tbl-wrap"><table class="data-table compact"><thead><tr><th>#</th>${wbdContext._sortTh('선수')}${wbdContext._sortTh('팀')}${wbdContext._sortTh('POS')}${wbdContext._sortTh('기회')}${wbdContext._sortTh('아웃률')}${wbdContext._sortTh('리그대비')}${wbdContext._sortTh('OAA')}${wbdContext._sortTh('OAA/10')}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
      };
      html+=mk(qual.slice().sort((a,b)=>b.oaa-a.oaa).slice(0,15),'⭐ OAA 상위 15');
      html+=mk(qual.slice().sort((a,b)=>a.oaa-b.oaa).slice(0,15),'🔻 OAA 하위 15');
    }
    html+=`<div style="font-size:10px;color:var(--muted);text-align:center;padding:10px;line-height:1.7">
      ※ OAA는 타구 난이도(포지션별 이동거리 커브) 기반 추정 지표 — 참고용으로 활용<br>
      리그대비 = 같은 포지션 리그 평균 아웃률과의 차이 · 총 ${S.totalPlays}플레이 분석
    </div>`;
    return html;
  }catch(e){
    console.error('league defense error',e);
    return `<div class="card section" style="padding:30px;text-align:center;color:#ff4560">수비 분석 오류: ${e.message}</div>`;
  }
};

// Original index.html:21741
wbdContext.renderDefensePage = function renderDefensePage(){
  const root = document.getElementById('defense-content');
  if(!wbdContext.G || !wbdContext.G.length){
    root.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted)">데이터를 먼저 업로드하세요.</div>`;
    return;
  }
  const st = window._defenseState;
  
  const data = wbdContext._computeDefenseData();
  // V9.9: 포지션 필터 (기본 'all' = 주 포지션 기준)
  if(!st.posFilter) st.posFilter = 'all';
  
  // 포지션 필터링 — 'all'이면 각 선수의 주 포지션 stat, 특정 포지션이면 그 포지션 stat
  const allPlayers = [];
  if(st.posFilter === 'all'){
    Object.values(data.byPlayer).forEach(s => {
      if(s.primaryChances >= st.minChances){
        allPlayers.push({
          ...s,
          displayPos: s.primaryPos,
          displayChances: s.primaryChances,
          displayOutRate: s.primaryOutRate,
          displayOaa: s.primaryOaa,
          displayOaaRaw: s.primaryOaaRaw,
          displayHardCatch: s.primaryHardCatch,
          displayHardTotal: s.primaryHardTotal,
          displayEasyMiss: s.primaryEasyMiss,
          displayEasyTotal: s.primaryEasyTotal,
          displayAvgMoveDist: s.primaryAvgMoveDist,
          displayLongRunouts: s.primaryLongRunouts,
          displayHeight: s.primaryHeight,  // 주 포지션에서 가장 자주 쓴 키
        });
      }
    });
  } else {
    Object.entries(data.byPlayerPos).forEach(([name, byPos]) => {
      if(byPos[st.posFilter] && byPos[st.posFilter].chances >= st.minChances){
        const ps = byPos[st.posFilter];
        const p = data.byPlayer[name];
        allPlayers.push({
          ...p,
          displayPos: st.posFilter,
          displayChances: ps.chances,
          displayOutRate: ps.outRate,
          displayOaa: ps.oaaWeighted,
          displayOaaRaw: ps.oaa,
          displayHardCatch: ps.hardCatchRate,
          displayHardTotal: ps.hard.total,
          displayEasyMiss: ps.easyMissCount,
          displayEasyTotal: ps.easy.total,
          displayAvgMoveDist: ps.avgMoveDist,
          displayLongRunouts: ps.longRunouts,
          displayHeight: ps.modeHeight,  // 이 포지션에서 가장 자주 쓴 키
        });
      }
    });
  }
  
  // 정렬 (OAA/10 별도 키)
  const sk = st.sortKey, sd = st.sortDir;
  const sortMap = {
    'oaa': 'displayOaa', 'oaaPer10': 'displayOaaPer10',
    'outRate': 'displayOutRate', 'chances': 'displayChances',
    'hardCatch': 'displayHardCatch', 'easyMiss': 'displayEasyMiss',
    'avgMoveDist': 'displayAvgMoveDist', 'longRunouts': 'displayLongRunouts'
  };
  const realSortKey = sortMap[sk] || sk;
  // displayOaaPer10도 계산해서 항목 부여
  allPlayers.forEach(p => {
    p.displayOaaPer10 = p.displayChances > 0 ? p.displayOaa/p.displayChances*10 : 0;
  });
  allPlayers.sort((a, b) => {
    const va = a[realSortKey] ?? 0, vb = b[realSortKey] ?? 0;
    return sd === 'desc' ? vb - va : va - vb;
  });
  
  const arrow = (k) => sk === k ? (sd === 'desc' ? ' ▼' : ' ▲') : '';
  
  // 포지션별 평균 카드
  const posStats = Object.entries(data.byPos)
    .filter(([k]) => k !== '?' && k !== 'P' && k !== 'C')
    .sort((a, b) => b[1].chances - a[1].chances);
  const posCards = posStats.map(([pk, s]) => {
    const col = s.outRate >= 0.6 ? '#39ff8a' : s.outRate >= 0.45 ? '#88cc44' : s.outRate >= 0.3 ? '#ff8800' : '#ff4560';
    return `<div class="card" style="padding:12px 14px;cursor:pointer" onclick="window._defenseState.posFilter='${pk}';renderDefensePage()">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="font-weight:700;color:var(--amber);font-size:14px">${s.posName}</div>
        <div style="font-size:10px;color:var(--muted)">${s.chances}건</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:11.5px;font-family:var(--mono)">
        <div style="color:#789;font-size:10px">아웃%</div><div style="color:${col};font-weight:700;text-align:right">${(s.outRate*100).toFixed(1)}%</div>
        <div style="color:#789;font-size:10px">평균EV</div><div style="text-align:right">${s.avgEv.toFixed(1)}</div>
        <div style="color:#789;font-size:10px">평균거리</div><div style="text-align:right">${s.avgDist.toFixed(1)}m</div>
      </div>
    </div>`;
  }).join('');
  
  // 포지션 필터 버튼들
  const posFilterBtns = [['all', '전체 (주포지션)'], ['SS','유격수'], ['2B','2루수'], ['3B','3루수'], ['1B','1루수'], ['LF','좌익수'], ['CF','중견수'], ['RF','우익수'], ['C','포수'], ['P','투수']].map(([k, label]) => {
    const isActive = st.posFilter === k;
    return `<button onclick="window._defenseState.posFilter='${k}';renderDefensePage()" style="background:${isActive?'var(--amber)':'rgba(255,255,255,0.04)'};color:${isActive?'#000':'var(--muted)'};border:1px solid ${isActive?'var(--amber)':'var(--border)'};padding:5px 11px;border-radius:4px;font-size:11.5px;cursor:pointer;font-weight:${isActive?'700':'500'}">${label}</button>`;
  }).join(' ');
  
  // 리더보드 테이블
  const rows = allPlayers.map((s, i) => {
    const oaaCol = s.displayOaa > 2 ? '#39ff8a' : s.displayOaa > 0.5 ? '#88cc44' : s.displayOaa < -2 ? '#ff4560' : s.displayOaa < -0.5 ? '#ff8800' : 'var(--text)';
    const outCol = s.displayOutRate >= 0.6 ? '#39ff8a' : s.displayOutRate >= 0.45 ? '#88cc44' : s.displayOutRate >= 0.3 ? '#ff8800' : '#ff4560';
    const oaaPer10 = s.displayOaaPer10;
    const oaa10Col = oaaPer10 > 0.5 ? '#39ff8a' : oaaPer10 < -0.5 ? '#ff4560' : 'var(--text)';
    const hardCol = s.displayHardCatch >= 20 ? '#ffd700' : s.displayHardCatch >= 10 ? '#39ff8a' : s.displayHardCatch >= 5 ? '#88cc44' : '#789';
    const easyMissPct = s.displayEasyTotal > 0 ? s.displayEasyMiss/s.displayEasyTotal*100 : 0;
    const easyCol = easyMissPct === 0 ? '#39ff8a' : easyMissPct < 5 ? '#88cc44' : easyMissPct < 10 ? '#ff8800' : '#ff4560';
    
    return `<tr onclick="window._defenderState=window._defenderState||{};window._defenderState.selectedPlayer='${s.name.replace(/'/g,"\\'")}';window._defenderState.posFilter='${st.posFilter==='all'?'all':st.posFilter}';showPage('defender')" style="cursor:pointer">
      <td>${i+1}</td>
      <td style="font-weight:700">${s.name}</td>
      <td><span style="background:rgba(57,255,138,0.12);color:#39ff8a;padding:2px 7px;border-radius:8px;font-size:10px;font-weight:700">${data.posNameKor[s.displayPos]||s.displayPos}</span>${st.posFilter === 'all' ? `<div style="font-size:9px;color:var(--muted);margin-top:2px">${(s.primaryPosShare*100).toFixed(0)}%</div>` : ''}</td>
      <td style="color:var(--muted);font-size:10.5px" title="이 포지션에서 가장 자주 사용한 키">${s.displayHeight ? s.displayHeight.toFixed(1)+'cm' : '-'}</td>
      <td>${s.displayChances}</td>
      <td style="color:${outCol};font-weight:600">${(s.displayOutRate*100).toFixed(1)}%</td>
      <td style="color:${oaaCol};font-weight:800;font-family:var(--mono)" title="OAA = 실제 아웃 − 기대 아웃률(xOut). 어려운 타구(xOut 낮음)를 잡으면 큰 플러스, 쉬운 타구를 놓치면 큰 마이너스">${s.displayOaa>0?'+':''}${s.displayOaa.toFixed(1)}</td>
      <td style="color:${oaa10Col};font-family:var(--mono)">${oaaPer10>0?'+':''}${oaaPer10.toFixed(2)}</td>
      <td style="color:${hardCol};font-family:var(--mono);font-weight:600" title="어려운 타구 (평균 아웃확률 30% 미만)에서 잡은 비율">${s.displayHardTotal>0?s.displayHardCatch.toFixed(0)+'%':'-'}<div style="font-size:9px;color:#789;font-weight:400">${s.displayHardTotal>0?'('+Math.round(s.displayHardCatch/100*s.displayHardTotal)+'/'+s.displayHardTotal+')':''}</div></td>
      <td style="color:${easyCol};font-family:var(--mono);font-weight:600" title="쉬운 타구 (평균 아웃확률 70%+)에서 놓친 수">${s.displayEasyTotal>0?s.displayEasyMiss:'-'}<div style="font-size:9px;color:#789;font-weight:400">${s.displayEasyTotal>0?'/'+s.displayEasyTotal:''}</div></td>
      <td style="font-family:var(--mono)">${s.displayAvgMoveDist.toFixed(1)}m</td>
      <td style="color:#ffd700;font-family:var(--mono)" title="10m+ 이동해서 잡은 횟수">${s.displayLongRunouts}</td>
    </tr>`;
  }).join('');
  
  root.innerHTML = `
    <div class="page-header"><h2 style="margin:0">🛡️ 수비 분석</h2>
      <div style="font-size:11px;color:var(--muted);margin-top:4px">포구 데이터(cPlr) 기반 · 인플레이 ${data.enriched.length}건 · 글로벌 아웃 처리율 ${(data.globalOutRate*100).toFixed(1)}%</div>
    </div>
    
    <div class="card section">
      <div class="card-title">📊 포지션별 평균 (수비 난이도 비교 · 카드 클릭 = 포지션 필터)</div>
      <div style="font-size:11px;color:#9ab;margin-bottom:12px">평균 EV·이동 거리·시간 — 어느 포지션이 가장 어려운 타구를 처리하는지 비교. 카드 클릭하면 그 포지션 선수들만 보기.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">${posCards}</div>
    </div>
    
    <div class="card section">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
        <span>🏆 수비 리더보드</span>
        <div style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--muted)">
          <span>최소 기회</span>
          <select onchange="window._defenseState.minChances=+this.value;renderDefensePage()" style="background:var(--card2);color:var(--text);border:1px solid var(--border);padding:3px 8px;border-radius:3px;font-size:11px">
            <option value="1" ${st.minChances===1?'selected':''}>전체 (1+)</option>
            <option value="10" ${st.minChances===10?'selected':''}>10건</option>
            <option value="20" ${st.minChances===20?'selected':''}>20건</option>
            <option value="30" ${st.minChances===30?'selected':''}>30건</option>
            <option value="50" ${st.minChances===50?'selected':''}>50건</option>
          </select>
          <span style="margin-left:8px">${allPlayers.length}명</span>
        </div>
      </div>
      
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin:10px 0">${posFilterBtns}</div>
      
      <div style="font-size:11px;color:#9ab;margin-bottom:10px;line-height:1.6">
        ⓘ <b>OAA v3</b>: 같은 <b>포지션 × 거리 × EV × 발사각</b>의 평균 아웃 확률과 비교 (키 보정 X — 키도 본인 선택). 
        <b>"못 잡을 걸 잡으면 +α, 잡아야 할 걸 놓치면 -α"</b> — 어려운 타구 잡으면 1.5×, 쉬운 타구 놓치면 1.5× 페널티.
        <b>포지션별로 분리</b> — 외야수가 가끔 내야 처리한 경우 합산 안 됨. 포지션 버튼 클릭으로 필터링.
      </div>
      
      <div style="overflow-x:auto">
      <table class="data-table gtable compact" style="font-size:11px;min-width:1180px;white-space:nowrap">
        <thead><tr>
          <th>#</th>
          <th style="text-align:left">선수</th>
          <th>${st.posFilter==='all'?'주 포지션':'포지션'}</th>
          <th title="이 포지션에서 가장 자주 사용한 키 (cm)">키</th>
          <th onclick="setDefenseSort('chances')" style="cursor:pointer">기회${arrow('chances')}</th>
          <th onclick="setDefenseSort('outRate')" style="cursor:pointer">아웃%${arrow('outRate')}</th>
          <th onclick="setDefenseSort('oaa')" style="cursor:pointer" title="OAA = 실제 아웃 − 기대 아웃률. 리그 합계 0 기준">OAA${arrow('oaa')}</th>
          <th onclick="setDefenseSort('oaaPer10')" style="cursor:pointer" title="10기회당 OAA — 표본 정규화">OAA/10${arrow('oaaPer10')}</th>
          <th onclick="setDefenseSort('hardCatch')" style="cursor:pointer" title="어려운 타구 처리율 — 평균 아웃확률 30% 미만 타구">어려운 잡기${arrow('hardCatch')}</th>
          <th onclick="setDefenseSort('easyMiss')" style="cursor:pointer" title="쉬운 타구 놓치기 — 평균 아웃확률 70%+ 타구 놓침">쉬운 놓치기${arrow('easyMiss')}</th>
          <th onclick="setDefenseSort('avgMoveDist')" style="cursor:pointer">이동거리${arrow('avgMoveDist')}</th>
          <th onclick="setDefenseSort('longRunouts')" style="cursor:pointer" title="10m+ 이동 후 잡은 횟수">장거리${arrow('longRunouts')}</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      </div>
    </div>
    ${(()=>{  // V11.5: 리그 대비 분석 확장 — 팀×포지션 매트릭스 + 포지션별 선수 랭킹
      try{
        const S=wbdContext._leagueDefenseStats(null);
        if(!S||!S.players.length) return '';
        if(!window._defExtView) window._defExtView='off';
        const v=window._defExtView;
        const btn=(k,l)=>`<button onclick="window._defExtView='${k}';renderDefensePage()" style="font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid var(--border);background:${v===k?'var(--amber)':'var(--bg2)'};color:${v===k?'#000':'var(--muted)'};font-weight:600;cursor:pointer">${l}</button>`;
        let out=`<div class="card section" style="padding:10px 14px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <span style="font-size:12px;color:var(--muted);margin-right:4px">🔍 리그 대비 상세</span>
          ${btn('off','접기')}${btn('matrix','팀×포지션')}${btn('pos','포지션별 선수')}
        </div>`;
        if(v==='matrix') out+=wbdContext._renderDefMatrix(S);
        else if(v==='pos') out+=wbdContext._renderDefPosLeaderboard(S,{minChances:5});
        return out;
      }catch(_){ return ''; }
    })()}
  `;
};
}

export function initialize(wbdContext) {
// Original index.html:20726
window._defenseState = window._defenseState || { 
  view: 'leaderboard',  // leaderboard, player_detail
  selectedPlayer: null,
  minChances: 20,
  sortKey: 'oaa',
  sortDir: 'desc'
};

// Original index.html:21293
window._ballmapState = window._ballmapState || {period:'all', traj:'all', quality:'all', result:'all', view:'dots', team:'all', split:false};

// Original index.html:21579
wbdContext._DEF_POSORD = ['1B','2B','3B','SS','LF','CF','RF'];
}
