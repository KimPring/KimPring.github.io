/** export: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:32677
wbdContext.exportLeaderboardCSV = function exportLeaderboardCSV(){
  // 현재 활성 리더보드 내용을 CSV로
  const cat=document.getElementById('lb-category')?.value;
  if(!cat){alert('리더보드 페이지에서 실행하세요');return;}
  const isPitcher=cat.startsWith('p-');
  const names=isPitcher
    ?(window._cache.pitcherNames||[]).slice()
    :(window._cache.batterNames||[]).slice();
  let csv='이름,팀,OVR,';
  if(isPitcher)csv+='평균구속,K%,BB%,피안타율,피홈런,투구수\n';
  else csv+='타율,장타율,홈런,평균EV,배럴%,타구수\n';
  names.forEach(n=>{
    if(isPitcher){
      const pd=wbdContext.getPitcherDataByName(n);
      if(pd.length<10)return;
      const c=wbdContext.calcPitcherCard(n);
      const bp=pd.filter(wbdContext._isInPlay);
      const hits=bp.filter(wbdContext._isHit).length;
      const hrs=bp.filter(d=>d.result===4).length;
      const bb=pd.filter(d=>d.result===5||d.result===6).length;
      const ks=pd.filter(d=>wbdContext._isK(d)).length;
      const fbSpds=pd.filter(d=>d.spdK>0&&['포심','투심','커터','패스트볼'].includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
      const avgSpd=fbSpds.length?fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length:0;
      csv+=`"${n}","${wbdContext._playerTeam(n,'pitcher')}",${c.OVR},${avgSpd.toFixed(1)},${(ks/pd.length*100).toFixed(1)},${(bb/pd.length*100).toFixed(1)},${bp.length?(hits/bp.length).toFixed(3):'0.000'},${hrs},${pd.length}\n`;
    } else {
      const bd=wbdContext.getBatterDataByName(n).filter(wbdContext._isInPlay);
      if(bd.length<5)return;
      const c=wbdContext.calcBatterCard(n);
      const hits=bd.filter(d=>wbdContext._isHit(d)).length;
      const hrs=bd.filter(d=>d.result===4).length;
      const barrels=bd.filter(d=>wbdContext._isBarrel(d)).length;
      const avgEV=bd.reduce((a,b)=>a+(+b.ev),0)/bd.length;
      const avg=hits/bd.length, slg=(bd.filter(d=>d['1BSafe']).length+hrs*3)/bd.length;
      csv+=`"${n}","${wbdContext._playerTeam(n,'batter')}",${c.OVR},${avg.toFixed(3)},${slg.toFixed(3)},${hrs},${avgEV.toFixed(1)},${(barrels/bd.length*100).toFixed(1)},${bd.length}\n`;
    }
  });
  wbdContext._downloadFile('\uFEFF'+csv,`wbd_leaderboard_${isPitcher?'pitcher':'batter'}_${Date.now()}.csv`,'text/csv;charset=utf-8');
};

// Original index.html:32716
wbdContext.exportAllPlayersJSON = function exportAllPlayersJSON(){
  const pNames=(window._cache.pitcherNames||[]).slice();
  const bNames=(window._cache.batterNames||[]).slice();
  const data={
    generatedAt:new Date().toISOString(),
    version:'V7',
    activeGames:[...wbdContext.activeGameIds].map(id=>{
      const g=wbdContext.GAMES.find(x=>x.id===id);
      return g?{id,name:g.name,pitchCount:g.pitches.length}:null;
    }).filter(Boolean),
    pitchers:pNames.map(n=>{
      const c=wbdContext.calcPitcherCard(n);
      return c?{name:n,team:wbdContext._playerTeam(n,'pitcher'),OVR:c.OVR,stats:c.stats,badges:wbdContext.computeBadges(c).map(b=>b.name),styles:wbdContext.classifyStyle(c).map(s=>s.label)}:null;
    }).filter(Boolean).sort((a,b)=>b.OVR-a.OVR),
    batters:bNames.map(n=>{
      const c=wbdContext.calcBatterCard(n);
      return c?{name:n,team:wbdContext._playerTeam(n,'batter'),OVR:c.OVR,stats:c.stats,badges:wbdContext.computeBadges(c).map(b=>b.name),styles:wbdContext.classifyStyle(c).map(s=>s.label)}:null;
    }).filter(Boolean).sort((a,b)=>b.OVR-a.OVR),
    teamAliases:window.teamAliases||{}
  };
  wbdContext._downloadFile(JSON.stringify(data,null,2),`wbd_analysis_${Date.now()}.json`,'application/json');
};

// Original index.html:32743
wbdContext._expEmptyLine = function _expEmptyLine(){ return {pa:0,ab:0,h:0,hr:0,k:0,bb:0,swing:0,whiff:0,tb:0,evSum:0,evN:0}; };

// Original index.html:32744
wbdContext._expAccum = function _expAccum(line,d,isPaEnd){
  const r=+d.result;
  const isHit=(+d['1BSafe']===1&&+d.ev>0)||r===4;
  if(d.bSwing){ line.swing++; if(+d.call!==2) line.whiff++; }
  if(+d.ev>0&&r!==3){ line.evSum+=+d.ev; line.evN++; }
  if(isPaEnd){
    line.pa++;
    if(r!==5&&r!==6) line.ab++;
    if(r===5) line.bb++;
    if(isHit){ line.h++; line.tb += (+d._hitBase||0)||(r===4?4:1); }
    if(r===4) line.hr++;
    if(wbdContext._isK(d)) line.k++;
  }
};

// Original index.html:32758
wbdContext._expFinalize = function _expFinalize(line){
  if(!line||line.pa===0&&line.swing===0) return null;
  const r=v=>v==null?null:+v.toFixed(3);
  return {
    PA:line.pa, AB:line.ab, H:line.h, HR:line.hr, K:line.k, BB:line.bb,
    AVG: line.ab>0?r(line.h/line.ab):null,
    SLG: line.ab>0?r(line.tb/line.ab):null,
    whiffPct: line.swing>0?+(line.whiff/line.swing*100).toFixed(1):null,
    avgEV: line.evN>0?+(line.evSum/line.evN).toFixed(1):null
  };
};

// Original index.html:32770
wbdContext._expZoneIdx = function _expZoneIdx(d, zb){
  const x=+d.zoneX, y=+d.zoneY;
  if(isNaN(x)||isNaN(y)) return -1;
  const cx = x < zb.x1 ? 0 : (x < zb.x2 ? 1 : 2);
  const cy = y < zb.y1 ? 0 : (y < zb.y2 ? 1 : 2);  // y 작을수록 아래로 가정
  return cy*3+cx;
};

// Original index.html:32777
wbdContext._expZoneBounds = function _expZoneBounds(rows){
  const xs=rows.map(d=>+d.zoneX).filter(v=>!isNaN(v)).sort((a,b)=>a-b);
  const ys=rows.map(d=>+d.zoneY).filter(v=>!isNaN(v)).sort((a,b)=>a-b);
  const q=(a,p)=>a.length?a[Math.floor(a.length*p)]:0;
  return {x1:q(xs,0.33), x2:q(xs,0.66), y1:q(ys,0.33), y2:q(ys,0.66)};
};

// Original index.html:32784
wbdContext._expPaEndFlags = function _expPaEndFlags(rows){
  const f=new Array(rows.length);
  for(let i=0;i<rows.length;i++) f[i]=wbdContext._isPaEnd(rows[i]);  // V12.0: 경기 단위 플래그
  return f;
};

// Original index.html:32790
wbdContext._buildPlayerSplits = function _buildPlayerSplits(rows, role){
  if(!rows||rows.length<10) return null;  // 표본 너무 작으면 생략
  const flags=wbdContext._expPaEndFlags(rows);
  const zb=wbdContext._expZoneBounds(rows);
  // 상대 핸드 키: 투수면 상대타자(bZone), 타자면 상대투수(pHand)
  const handKey = role==='pitcher' ? (d=>d.bZone==='L'?'vsL':'vsR') : (d=>d.pHand==='L'?'vsL':'vsR');
  const byHand={vsL:wbdContext._expEmptyLine(), vsR:wbdContext._expEmptyLine()};
  const byGroup={};   // 구종그룹별
  const byCount={ahead:wbdContext._expEmptyLine(), behind:wbdContext._expEmptyLine(), even:wbdContext._expEmptyLine()};
  const grpSpd={};    // 구종별 평균구속
  const zone=Array.from({length:9},()=>wbdContext._expEmptyLine());
  for(let i=0;i<rows.length;i++){
    const d=rows[i], end=flags[i];
    wbdContext._expAccum(byHand[handKey(d)], d, end);
    if(d.pType!=null){ const g=wbdContext.pitchGroup(d.pType,d);
      if(!byGroup[g]) byGroup[g]=wbdContext._expEmptyLine();
      wbdContext._expAccum(byGroup[g], d, end);
      const sp=+d.spdK; if(sp>0){ if(!grpSpd[g])grpSpd[g]={s:0,n:0}; grpSpd[g].s+=sp; grpSpd[g].n++; }
    }
    // 카운트: 투수 유리(스트라이크>볼) / 불리 / 동일
    const b=+d.ball||0, s=+d.strk||0;
    const adv = role==='pitcher' ? (s>b?'ahead':(b>s?'behind':'even')) : (b>s?'ahead':(s>b?'behind':'even'));
    wbdContext._expAccum(byCount[adv], d, end);
    const zi=wbdContext._expZoneIdx(d, zb); if(zi>=0) wbdContext._expAccum(zone[zi], d, end);
  }
  const finGroup={};
  for(const g in byGroup){
    const fz=wbdContext._expFinalize(byGroup[g]); if(!fz) continue;
    const pitchN=byGroup[g].swing+ (byGroup[g].pa); // 근사 노출
    finGroup[g]={...fz, avgSpd: grpSpd[g]&&grpSpd[g].n? +(grpSpd[g].s/grpSpd[g].n).toFixed(1):null};
  }
  // 구사율(투수) / 구종 마주침 비율(타자) — 그룹별 투구수
  const grpPitchCnt={}; let totPitch=0;
  for(let i=0;i<rows.length;i++){ const d=rows[i]; if(d.pType!=null){ const g=wbdContext.pitchGroup(d.pType,d); grpPitchCnt[g]=(grpPitchCnt[g]||0)+1; totPitch++; } }
  for(const g in finGroup){ finGroup[g].pitchPct = totPitch>0? +(grpPitchCnt[g]/totPitch*100).toFixed(1):null; }
  return {
    byHand: {vsL:wbdContext._expFinalize(byHand.vsL), vsR:wbdContext._expFinalize(byHand.vsR)},
    byPitchGroup: finGroup,
    byCount: {ahead:wbdContext._expFinalize(byCount.ahead), behind:wbdContext._expFinalize(byCount.behind), even:wbdContext._expFinalize(byCount.even)},
    zone9: zone.map(z=>wbdContext._expFinalize(z)),
    zoneNote: role==='pitcher'?'9칸=상대 타자 시점 3x3(0:좌상~8:우하), 값=해당 존 피안타/헛스윙':'9칸=3x3 존, 값=해당 존 스윙/컨택'
  };
};

// Original index.html:32834
wbdContext.exportAnalyticsBundle = function exportAnalyticsBundle(opts){
  opts=opts||{includeRawPitches:true,includeMatchups:false};
  const pNames=(window._cache.pitcherNames||[]).slice();
  const bNames=(window._cache.batterNames||[]).slice();
  
  // 1) 메타 정보
  const meta={
    generatedAt:new Date().toISOString(),
    appVersion:'V12.0',
    schemaVersion:19,
    schemaChanges:{
      v19_changes:[
        '🆕 scouting — 스카우팅 도시에 + 공략 엔진 산출물. batters/pitchers[name] = {ofp, tools{key:{grade,pct,note}}, attack{summary,weaknesses[],strengths[],sequence[],insights[],takeNotes[]}, risk[]}. 타자 approach/battedBall 서사, 투수 repertoire(구속·무브·존%·헛%·피안타·초구/2S 사용)·sequencing(카운트별 구종)·predictability·stamina(투구수/이닝 구간) 추가.',
        '   · tools 등급: 리그 백분위→20-80, 비율지표는 표본 수축(shrinkage). 타자 hit(수축 타율·컨택·EV 블렌드)/power(EV·배럴·하드히트·ISO)/contact/eye(체이스 85·볼넷 15)/kav(삼진 회피)/swing, 투수 velo/mov(구종별 리그대비·구사량 가중)/stuff(헛스윙 70·K% 30)/cmd(실투 60·구석 40=코스 정확도)/ctrl(존 투구율 60·초구S 40=스트라이크 능력)/hitSup(피장타 60·피안타 40)',
        '   · 검증(split-half r, 홀/짝 경기): 타자 hit .59 power .65 contact .50 eye .60 kav .53 swing .78 OFP .65 / 투수 velo .91 mov .84 ctrl .45 cmd .31 stuff .26 hitSup .22 OFP .60. 득점권·변화구대응·2S대응·볼넷(투수)·피하드히트는 r≤.3이라 툴에서 제외(상황별 표에만).',
        '   · 몸쪽/바깥 판정은 투구별 타자 손잡이(bZone) 기준(우타 몸쪽=zoneX>0.33, 좌타는 반대). attack.splitLR = 좌/우 분할 공략(타자: vs좌투/우투, 투수: vs좌타/우타).',
        '   · attack 약점: 본인 전체 대비 + 3단 검증(약함·스윙함·헛/범타 유도). tier=✅강력/△범타/참고, conf=높음/보통/낮음·표본N',
        '📌 카드 능력치(players[].card.stats) v19.3 재보정: 중앙 타자 ~77·투수 ~79, p10 55~60, 핵심 p90 ~95(100+ 몬스터/90+ S/85~89 A/80~84 B/70대 C). OVR=가중평균(타자 파워1.3 컨택1.2 갭.8 선구.7 스윗.4 / 투수 구위1.4 K1.0 제구.9 구속.8 구변.8 안정.4 구종.4), 피크 보너스 없음. 선구 BB%=타석당, 파워 ISO×120, 구위=(0.48−피안타율)×120+(7−피HR%)×6+(K/PA−18)×1.5+(기대헛스윙−리그)×2.5+(100.2−피EV)×2, 탈삼진=K/PA×0.25+(기대헛스윙−리그)×0.3. STAT_INFO formula 참조',
        '📌 scouting.profile(v19.2): batters/pitchers[name].profile = {arch:{icon,name,key}, tags[], paras[{h,t}], verdict, conf} — 축별 리그 백분위 조합 유형 서술',
        '📌 타자 tools 재정의(v19.2): hit=EV .3+하드히트 .25+존컨택 .2+수축타율 .25 / power=EV .3+하드히트 .25+EV상위10% .2+최고EV .15+배럴 .1 / kav=K% .4+컨택 .3+존컨택 .3 ; 투수 ctrl=존투구율 .5+크게빠진공↓ .3+스트라이크율 .2. 반복성: 타자 hit .62 power .68 kav .57 OFP .69 / 투수 ctrl .52 OFP .80',
        '📌 투수 tools 재정의(v19.1): stuff=기대 헛스윙(구종별 구속×무브 칸의 리그 헛스윙률 평균, Stuff+ 방식; 반복성 .75, 다음 반기 헛스윙 예측 .43) / hitSup=기대 허용 경향(z존투구율−z기대헛스윙) 75%+실제 피장타·피안타 25% (다음 반기 피안타율 예측 .54). 툴 등급 반복성: velo .91 mov .84 stuff .74 hitSup .69 ctrl .45 cmd .31 OFP .78',
        '📌 matchups(옵션) 모델: 타석 단위 비율 + 좌우 분할 가중 + Log5. attack.splitLR 참고',
        '📌 타석 종료(PA/AB) 정의 변경: 경기 단위 시간순에서 1회 판정한 플래그(_paEnd) 기반. 이전엔 상황별(카운트/구종/코스) 부분집합에서 "다음 투구가 다른 타자"로 판정해 타수가 2~3배 부풀고 타율이 낮게 나옴. 이제 splits의 byCount/byPitchGroup/zone9 타수 합 = 전체 타수. 부수: 타순 일순 타석 분리, 땅볼/뜬공 오기록 파울(카운트 이어짐) 제외, 미완 타석(주자 아웃 종료) 제외 → 전체 타율도 소폭 변동.',
        '📌 코스별 집계 정의 변경: 존 안(|x|,|y|≤1) 9칸만 코스로, 존 밖은 볼영역(몸쪽/바깥/높은/낮은 볼)으로 분리. 이전엔 볼까지 섞이고 가로·세로 중복 집계돼 코스 타율이 전체보다 낮게 나왔음.',
        '📌 정의 통일 영향: 리그 평균 타율(WAR 기준선)·매치업 K%·스프레이 방향 분포가 공용 정의(_isHit/_isK/_isInPlay)로 재계산되어 이전 내보내기와 값이 소폭 달라질 수 있음(정확해진 방향).',
      ],
      v18_changes:[
        '🆕 runValue — RE24 기반 Run Value. RE(루상·아웃 상태별 기대득점 24칸) + batters/pitchers 선수별 RV 합·RV/100. 활성 경기 기준.',
        '🆕 xOut — 기대 성적. 인플레이 타구(홈런 제외, BABIP 성격)의 리그 기대 아웃확률로 batters/pitchers별 ba vs xba, luck(실제−기대 안타) 산출. 수비 xOut 모델 재사용.',
        '🆕 rounds — 풀리그 라운드 자동 판별(roundOf: 경기ID→라운드, maxRound: 그룹별 최대). 포스트시즌·꼬리 라운드 미부여.',
      ],
      v17_changes:[
        '🆕 teamDefense.teams[i].infieldPass — 팀 내야 통과율',
        '   · groundBalls(땅볼 수) / passed(내야 통과) / rate(통과율%) / lgRate(리그 평균) / vsLeague(리그 대비 %p)',
        '   · 추정 없이 직접 집계(포구자가 외야수면 통과) — OAA보다 신뢰도 높은 수비 범위 지표',
        '📌 OAA 계산 방식 변경: 내야 통과 땅볼을 방향각 기준 최근접 내야수(12m 이내)에게 귀속 — 수비 범위 반영'
      ],
      v16_changes:[
        '🆕 pitchers[i].season.advanced에 RA9 / ERAplus 추가',
        '   · RA9 = 실점/이닝×9 (pWAR 산출 기반). WBD는 자책 구분이 없어 ERA와 동일값이나 비교 기준으로 명시',
        '   · ERAplus = 리그평균 RA9 / 본인 ERA × 100 (100=평균, 높을수록 좋음)',
        '🆕 teams[i].pitching에 runs / ra9 / eraPlus 추가 (팀 단위 실점 지표)',
        '📌 FIP-는 낮을수록 좋고 ERA+는 높을수록 좋음 — 방향이 반대이므로 해석 시 주의'
      ],
      v15_changes:[
        '🆕 standings 블록 — 활성 경기 기준 순위표: G/W/L/T, 승률, 득점·실점·득실차, 경기당 득실, 피타고리안 기대승률(지수 1.83), gameLog(경기별 상대·스코어·승패)',
        '   · 스코어는 이닝별 득점 집계 기반 (끝내기·수비미스 보정 포함)',
        '🆕 teamDefense 블록 — 팀 수비 세부 분석',
        '   · infield/outfield: 내야·외야 분리 OAA·아웃률 + 리그 동일 구역 평균 대비(%p)',
        '   · byPos: 포지션별 OAA·아웃률·리그대비 + 해당 포지션 선수 목록',
        '   · players: 선수별 처리수·아웃률·OAA·OAA/10기회·리그대비(%p)·동일포지션 백분위 (약한 순 정렬)',
        '   · leagueByPos: 포지션별 리그 기준 아웃률 (비교 기준선)',
        '📌 팀 OAA 합계만으론 "내야가 좋은지 외야가 나쁜지" 판별이 불가능했던 문제 해소'
      ],
      v14_changes:[
        '🆕 teams 블록 신규 — 팀 탭(개요·전력 진단서)과 동일 기준의 팀 분석 데이터',
        '   · grade: overall/batting/pitching/defense 등급 + 점수 (타격45%+투수45%+수비10%)',
        '   · areas: 6영역 리그 백분위 (contact/power/eye/pitchStuff/pitchControl/pitchResult)',
        '   · batting: 전통 지표 + HH/HH+/배럴/배럴+ · 존내컨택% · 체이스% · 존내스윙% · BABIP · oWAR',
        '   · pitching: ERA/FIP/WHIP + 제구 세분화(실투율·보더라인%) + 피타구질 4종 + pWAR',
        '   · defense: 팀 OAA · 리그 순위 (추정 지표, 종합 비중 10%)',
        '   · clutch: 득점권 OPS (타격/투수) · 리그 평균 대비 — 종합 등급 미반영 참고값',
        '📌 평가 기준 재설계 반영 — 파워는 홈런형/장타형 균형, 제구는 실투·보더라인 기반, 컨택은 존내컨택 포함'
      ],
      v13_changes:[
        '🆕 batters[i].season.GIDP — 땅볼 병살타 수. pitchers[i].season.GIDPinduced/DPinduced — 유도한 병살 수',
        '🆕 안타 판정에 야수선택(FC) 반영 — 선행주자가 포스아웃되면 타자는 안타 아님(MLB 규칙 10.05(b)(1)). H/BA/OBP/SLG/TB 등 모든 타격 지표에 적용',
        '📌 병살 인정 기준: 인플레이 2아웃 + 포스아웃 1개 이상 (태그만 2개인 경우는 런다운 꼬임과 구별 불가하여 제외). 삼중살은 별도',
        '📌 이 판정들은 아웃코드(outNCode)가 있는 신규 CSV에서만 동작. 구 데이터(118컬럼)는 판별 불가로 기존 로직 유지 → GIDP=0',
        '📌 codeMaps.outCode 추가 — OutCode 비트필드 해석(야수/베이스/방식)'
      ],
      v12_changes:[
        '🆕 codeMaps 블록 추가 (최상위) — result/call/batType/pType 원시 코드 → 의미 매핑 + hitDetermination(안타 판정법) + keyFields(핵심 필드 설명). 원시 투구로그를 매번 추론 없이 바로 해석 가능',
        '📌 result: 0=None/1=FlyOut/2=GroundBall/3=Foul/4=HR/5=Walk/6=HBP · call: 0=Strike/1=Ball/2=Hit/3=DeadBall/4=Swing · 안타=1BSafe==1 (result 1/2는 아웃)',
        '📌 pTypeToGroup: 51개 구종 코드 → 19개 구종 그룹 매핑'
      ],
      v11_changes:[
        '🆕 batters[i].season.battedBall에 HH+/배럴+/타구품질 추가 — {hhPlusPct(EV125+), barrelPlusPct(EV125+&LA20~40°), quality:{barrelPlus,solid,flare,topped,under,weak 각 비율}}. WBD 실측 보정 6분류',
        '🆕 pitchTypes.groups[g] 및 playersByGroup에 avgLA/hhPlusPct/barrelPlusPct 추가 — 피발사각·피HH+·피배럴+ 허용률',
        '🆕 glossary에 HH+/배럴+/타구품질 6분류 정의 추가',
        '📌 HH+/배럴+ 실측 근거: HH+(EV125+)=BA .485→.650 점프 지점, 배럴+(EV125+&LA20~40°)=BA .918·홈런 96% 발생 존',
        '📌 기존 v10 구조 모두 유지 (하위 호환)'
      ],
      v9_changes:[
        '🆕 league: 리그 기준선 블록 추가 — lgRA9/RPW/wOBA + 타격·투수 부문 평균(자격자 기준). AI가 개별 선수를 리그 평균 대비로 해석 가능',
        '🆕 glossary: 지표 사전 추가 — 모든 커스텀/세이버 지표의 정의·방향(높을/낮을수록 좋음)·산식 요약',
        '🆕 players[i].splits: 상황별 분할 추가 — byHand(좌우 상대), byPitchGroup(구종그룹별 성적·구사율·평균구속), byCount(유리/불리 카운트), zone9(3x3 존 격자). 원시 투구로그 없이 집계 격자만 담아 경량 유지',
        '📌 기존 v8 구조는 모두 그대로 유지 (하위 호환). 추가 필드만 얹음'
      ],
      v8_changes:[
        '📊 (NEW) batters[i].season.advanced: {h1B, h2B, h3B, TB, wOBA, wRCplus, wRAA, oWAR, HRpct} — 베이스 추적 안타 분류 기반',
        '📊 (NEW) pitchers[i].season.advanced: {FIP, FIPminus, WHIP, KBB, pWAR, estIP, HRpct} — WBD 리그 RA9 보정',
        '📊 wOBA/wRC+/FIP 모두 WBD 리그 자체 환경 상수 사용 (리그 평균 = 100 기준)',
        '⚠️ 기존 season.wOBA(v7)는 안타 분류 이전 근사치 — advanced.wOBA가 정확한 값',
        '📊 타자 oWAR(타격만, 수비는 OAA 신뢰도 검증 후 합류 예정) / 투수 pWAR(RA9/실점 기반, bWAR식 — V10.2에서 FIP 기반에서 교체) / WAR144(KBO 144경기 환산) / 투수 ERA(실점=자책). dOAA_ref는 참고용',
        '⚙️ calcBatterWAR/calcPitcherWAR 전면 통합 — 리더보드·헤더·카드의 WAR이 모두 새 식 사용'
      ],
      v7_changes:[
        '📊 (NEW) batters[i].season.battedBall: 타구 프로파일 추가 — {n, avgLA, gbPct, ldPct, fbPct, gb, ld, fb, thresholds}',
        '📊 임계값: 땅볼(GB)<10°, 직선(LD)10°~24°, 뜬공(FB)>=25° — 표준 MLB 분류',
        '🐛 (CRITICAL) 차트 표시 버그픽스: 빈 폭 10°→5°로 정밀화하여 20°~24° 데이터가 LD로 정확히 카운트됨 (내보내기 데이터는 처음부터 정확)',
        '🗺️ 스프레이 차트 내야 줌인 모드 + 차트 크기 확대 (500×540)',
        '🏷️ 발사각 분포 차트 — 타구유형 비율을 SVG 박스 → 차트 위 범례로 통합, X축 빈 가장자리 눈금 추가'
      ],
      v6_changes:[
        '🐛 (CRITICAL) call 코드 정의 명확화: 0=Strike(콜드+스트존 헛스윙), 1=Ball, 2=Hit(인플레이), 3=DeadBall, 4=Swing(볼존 헛스윙만), 5=None',
        '🐛 K 판정 단순화: strk=2 + (call=0 OR call=4) — bSwing 노이즈 무시, 41곳 통일',
        '🐛 헛스윙 정의 유지: bSwing&&call!==2 (스트존+볼존 헛스윙 모두 포함, 헛스윙률 31.7% 정상)',
        '🐛 (CRITICAL) 파울 CRV 처리 버그픽스: result=3 파울이 볼로 잘못 처리되던 문제 → result 우선 판정',
        '🐛 (CRITICAL) call===2 hit 이중 증가 버그픽스: BA > 1.000 발생 원인 제거',
        '⚖️ xPV+ (xPVPlus) 신규 추가: 리그 평균 대비 기대 가치',
        '⚖️ 운/100 (pvDiff100) 신규 추가: 100투구당 운 차이',
        '📊 pitchTypes.groups[g].xpvPlus / pvDiff100 필드 추가',
        '📊 pitchers[i].season.seasonXPVPlus / seasonLuck 필드 추가',
        '🧹 Forfeit 더미 투구 분석 집계에서 자동 제외'
      ],
      v5_changes:[
        '🏆 awards: MVP/사이영/홈런왕/타격왕/OPS왕/wOBA왕/K왕/ERA1위/WHIP1위/PV왕/xPV왕 등 시즌 수상자. (V10.2) MVP=oWAR 1위, CyYoung=pWAR(실점 기반) 1위, overall.MVP=투타 합산 WAR 1위 — 자격: AB≥20/투구≥50',
        '🏆 teamReports: 팀별 핵심 투수(로테이션)/핵심 타자(중심타선) 분류 + 강점/약점 + 라인업',
        '🏆 scoutReports: OVR 상위 30 투수/타자의 강점/약점/FV 등급/스카우트 노트',
        '⚖️ PV 가중치 1.7배 강화: 40이닝(~600투구) 기준 분포감 확대',
        '⚖️ 임계값 조정: 엘리트 ±22, 플러스 ±7, 셀 색상 ±5'
      ],
      v4_changes:[
        '⚖️ pitchTypes.groups[g].pv: 시즌 누적 PV (CRV, 실제 결과 기반)',
        '⚖️ pitchTypes.groups[g].xpv: 기대 PV (EV/LA 기반, BABIP 운 제거)',
        '⚖️ pitchTypes.groups[g].pv100/xpv100: 100투구 정규화',
        '⚖️ pitchTypes.groups[g].pvDiff: PV-xPV 운 차이 (양수=운 좋음/회귀 위험)',
        '⚖️ pitchTypes.playersByGroup[g][name]: 동일 PV/xPV/pv100/xpv100/pvDiff',
        '📊 pitchers[i].season.seasonPV / seasonXPV: 투수 시즌 총 PV/xPV',
        '📊 pitchers[i].season.wOBAagainst / BABIPagainst: 피wOBA, 피BABIP',
        '📊 batters[i].season.wOBA / BABIP / kbb / ISO: 신규 sabermetrics',
        '🐛 OPS 식 버그 수정 (문자열 연결 → 실수 합)'
      ]
    },
    totalGames:wbdContext.GAMES.length,
    activeGameCount:wbdContext.activeGameIds.size,
    totalPitches:wbdContext.G.length,
    totalPitchers:pNames.length,
    totalBatters:bNames.length,
    pitchTypes:[...new Set(wbdContext.G.map(d=>d.pType).filter(x=>x!=null))],
    pitchGroups:[...new Set(wbdContext.G.map(d=>typeof wbdContext.pitchGroup==='function'?wbdContext.pitchGroup(d.pType):null).filter(Boolean))]
  };
  
  // 2) 게임 정보 + 경기별 선수 통계 (이닝/실점 등)
  const games=wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).map(g=>{
    const pStats=wbdContext._getCachedPitcherStats(g.id)||{};
    const bStats=wbdContext._getCachedBatterStats(g.id)||{};
    const obj={
      id:g.id,
      name:g.name,
      info:g.info||null,
      pitchCount:g.pitches.length,
      pitcherStats:pStats,  // {name: {outs,runs,hits,...}}
      batterStats:bStats    // {name: {ab,hits,hrs,bbs,ks,pitches}}
    };
    if(opts.includeRawPitches)obj.pitches=g.pitches;
    return obj;
  });
  
  // 3) 투수 풀 데이터 (카드 + 시즌 누적 + 게임별 등)
  const pitchers=pNames.map(n=>{
    const c=wbdContext.calcPitcherCard(n);
    if(!c)return null;
    const season=wbdContext._getPitcherSeason(n);
    return {
      name:n,
      team:wbdContext._playerTeam(n,'pitcher'),
      OVR:c.OVR,
      stats:c.stats,        // 능력치 (구속, 구위, 제구 등)
      detail:c.detail,
      lowData:c.lowData,
      badges:wbdContext.computeBadges(c).map(b=>({icon:b.icon,name:b.name,desc:b.desc,color:b.color})),
      styles:wbdContext.classifyStyle(c).map(s=>({label:s.label,desc:s.desc})),
      strength:(typeof wbdContext.generateStrengthReport==='function')?wbdContext.generateStrengthReport(c).map(x=>x.text):[],
      weakness:(typeof wbdContext.generateWeaknessReport==='function')?wbdContext.generateWeaknessReport(c).map(x=>x.text):[],
      splits:(()=>{ try{ return wbdContext._buildPlayerSplits(wbdContext.getPitcherDataByName(n), 'pitcher'); }catch(_){ return null; } })(),
      season:{
        games:season.games,
        IP:+(season.ip||0).toFixed(1),
        IPdisp:season.ipDisp,
        outs:season.outs,
        runs:season.runs,
        ERA:+(season.era||0).toFixed(2),
        // V10.1 schema v8: FIP/WHIP/pWAR (WBD 리그 RA9 보정)
        advanced:(()=>{try{
          const _r=wbdContext._computeRecordsData().pitchers.find(p=>p.name===n);
          return _r?{FIP:_r.fip!=null?+_r.fip.toFixed(2):null,FIPminus:_r.fipMinus!=null?+_r.fipMinus.toFixed(0):null,
            WHIP:_r.whip!=null?+_r.whip.toFixed(2):null,KBB:_r.kbb!=null?+Math.min(_r.kbb,99).toFixed(1):null,
            pWAR:_r.pwar!=null?+_r.pwar.toFixed(2):null,WAR144:_r.war144!=null?+_r.war144.toFixed(1):null,
            ERA:_r.era!=null?+_r.era.toFixed(2):null,estIP:+_r.IP.toFixed(1),
            RA9:_r.ra9!=null?+_r.ra9.toFixed(2):null,ERAplus:_r.eraPlus!=null?+_r.eraPlus.toFixed(0):null,
            HRpct:_r.hrPct!=null?+_r.hrPct.toFixed(2):null,
            W:_r.W||0,L:_r.L||0,SV:_r.SV||0,HLD:_r.HLD||0,QS:_r.QS||0,QSplus:_r.QSP||0}:null;
        }catch(_){return null}})(),
        WHIP:+(season.whip||0).toFixed(2),
        K:season.ks,
        BB:season.bbs,
        H:season.hits,
        HR:season.hrs,
        pitches:season.pitches,
        // V11.3: 병살 유도 (신규 CSV 아웃코드 기반. 구 데이터는 0)
        GIDPinduced:(()=>{try{return wbdContext.getPitcherDataByName(n).filter(d => wbdContext._isGIDP(d)).length}catch(_){return 0}})(),
        DPinduced:(()=>{try{return wbdContext.getPitcherDataByName(n).filter(d => wbdContext._isDP(d)).length}catch(_){return 0}})(),
        Kper9:season.ip>0?+((season.ks*9/season.ip).toFixed(2)):0,
        BBper9:season.ip>0?+((season.bbs*9/season.ip).toFixed(2)):0,
        // V9.7 신규 - 투수 시즌 총 PV/xPV (모든 구종 합산)
        seasonPV:(() => {
          try {
            const pitches = wbdContext.getPitcherDataByName(n);
            return +wbdContext._pvSum(pitches).toFixed(2);
          } catch(_) { return 0; }
        })(),
        seasonXPV:(() => {
          try {
            const pitches = wbdContext.getPitcherDataByName(n);
            return +wbdContext._xPvSum(pitches).toFixed(2);
          } catch(_) { return 0; }
        })(),
        seasonXPVPlus:(() => {
          try {
            const pitches = wbdContext.getPitcherDataByName(n);
            return +wbdContext._xPvPlusSum(pitches).toFixed(2);
          } catch(_) { return 0; }
        })(),
        seasonLuck:(() => {
          // PV - xPV (양수=운 좋음, 음수=운 나쁨)
          try {
            const pitches = wbdContext.getPitcherDataByName(n);
            return +(wbdContext._pvSum(pitches) - wbdContext._xPvSum(pitches)).toFixed(2);
          } catch(_) { return 0; }
        })(),
        // 피wOBA, 피BABIP (투수가 허용한 상대 타격 가치)
        wOBAagainst:(() => {
          try {
            const pitches = wbdContext.getPitcherDataByName(n);
            const stat = wbdContext._calcStandardStats(pitches);
            return +(stat.woba || 0).toFixed(3);
          } catch(_) { return 0; }
        })(),
        BABIPagainst:(() => {
          try {
            const pitches = wbdContext.getPitcherDataByName(n);
            const stat = wbdContext._calcStandardStats(pitches);
            return +(stat.babip || 0).toFixed(3);
          } catch(_) { return 0; }
        })()
      }
    };
  }).filter(Boolean).sort((a,b)=>b.OVR-a.OVR);
  
  // 4) 타자 풀 데이터
  const batters=bNames.map(n=>{
    const c=wbdContext.calcBatterCard(n);
    if(!c)return null;
    const season=wbdContext._getBatterSeason(n);
    const ex=c.extras||{};
    return {
      name:n,
      team:wbdContext._playerTeam(n,'batter'),
      OVR:c.OVR,
      stats:c.stats,
      detail:c.detail,
      lowData:c.lowData,
      badges:wbdContext.computeBadges(c).map(b=>({icon:b.icon,name:b.name,desc:b.desc,color:b.color})),
      styles:wbdContext.classifyStyle(c).map(s=>({label:s.label,desc:s.desc})),
      strength:(typeof wbdContext.generateStrengthReport==='function')?wbdContext.generateStrengthReport(c).map(x=>x.text):[],
      weakness:(typeof wbdContext.generateWeaknessReport==='function')?wbdContext.generateWeaknessReport(c).map(x=>x.text):[],
      splits:(()=>{ try{ return wbdContext._buildPlayerSplits(wbdContext.getBatterDataByName(n), 'batter'); }catch(_){ return null; } })(),
      season:{
        games:season.games,
        PA:ex.PA||0,
        AB:ex.AB||season.ab,
        H:ex.hits||season.hits,
        HR:ex.hrs||season.hrs,
        BB:ex.BB||season.bbs,
        HBP:ex.HBP||0,
        K:season.ks,
        // V11.3: 병살타 (신규 CSV 아웃코드 기반. 구 데이터는 0)
        GIDP:(()=>{try{const _r=wbdContext._computeRecordsData().batters.find(b=>b.name===n);return _r?(_r.GIDP||0):0}catch(_){return 0}})(),
        BA:+((ex.batAvg||season.ba||0).toFixed(3)),
        OBP:+((ex.obp||season.obp||0).toFixed(3)),
        SLG:+((ex.slg||season.slg||0).toFixed(3)),
        OPS:+(((ex.obp||season.obp||0) + (ex.slg||season.slg||0)).toFixed(3)),
        // V10.1 schema v8: 안타 분류 + WBD 리그 보정 세이버메트릭스
        advanced:(()=>{try{
          const _r=wbdContext._computeRecordsData().batters.find(b=>b.name===n);
          return _r?{h1B:_r.h1B,h2B:_r.h2B,h3B:_r.h3B,TB:_r.TB,
            wOBA:+_r.woba.toFixed(3),wRCplus:+_r.wrcPlus.toFixed(0),
            wRAA:+_r.wraa.toFixed(1),oWAR:+_r.owar.toFixed(2),
            WAR144:+_r.war144.toFixed(1),
            HRpct:_r.hrPct!=null?+_r.hrPct.toFixed(2):null,
            dOAA_ref:_r.dOaa!=null?+_r.dOaa.toFixed(1):null,
            dWAR_ref:_r.dWar!=null?+_r.dWar.toFixed(2):null,
            WAR_ref:+_r.war.toFixed(2)}:null;
        }catch(_){return null}})(),
        // V9.7 신규 sabermetrics 통계
        wOBA:(() => {
          try {
            const pitches = wbdContext.getBatterDataByName(n);
            const stat = wbdContext._calcStandardStats(pitches);
            return +(stat.woba || 0).toFixed(3);
          } catch(_) { return 0; }
        })(),
        BABIP:(() => {
          try {
            const pitches = wbdContext.getBatterDataByName(n);
            const stat = wbdContext._calcStandardStats(pitches);
            return +(stat.babip || 0).toFixed(3);
          } catch(_) { return 0; }
        })(),
        kbb:(() => {
          try {
            const pitches = wbdContext.getBatterDataByName(n);
            const stat = wbdContext._calcStandardStats(pitches);
            return stat.kbb === Infinity ? 999 : +(stat.kbb || 0).toFixed(2);
          } catch(_) { return 0; }
        })(),
        ISO:+(((ex.slg||season.slg||0) - (ex.batAvg||season.ba||0)).toFixed(3)),
        // V9.8 신규: 타구 프로파일 (Batted Ball Profile)
        battedBall:(() => {
          try {
            const pitches = wbdContext.getBatterDataByName(n).filter(d => wbdContext._isInPlay(d) && d.ldeg != null && !wbdContext._isBunt(d));
            const las = pitches.map(d => +d.ldeg);
            if(las.length === 0) return {n:0, avgLA:null, gbPct:null, ldPct:null, fbPct:null};
            // 빈 단위 분류 (차트 표시와 100% 일치): center<10 땅, <25 직, 이상 뜬
            // raw 분류 (정확한 임계값): <10 / 10~24 / >=25
            let gb=0, ld=0, fb=0;
            las.forEach(v => { if(v<10) gb++; else if(v<25) ld++; else fb++; });
            const total = las.length;
            const avgLA = las.reduce((a,b)=>a+b,0)/total;
            // V11.2: HH+/배럴+/타구품질 6분류
            const hhPlus = pitches.filter(d=>wbdContext._isHHPlus(d)).length;
            const barrelPlus = pitches.filter(d=>wbdContext._isBarrelPlus(d)).length;
            const q={barrelPlus:0,solid:0,flare:0,topped:0,under:0,weak:0};
            pitches.forEach(d=>{q[wbdContext._bbQuality(d)]++;});
            const qPct={}; Object.keys(q).forEach(k=>qPct[k]=+(q[k]/total*100).toFixed(1));
            return {
              n: total,
              avgLA: +avgLA.toFixed(2),
              gbPct: +(gb/total*100).toFixed(1),
              ldPct: +(ld/total*100).toFixed(1),
              fbPct: +(fb/total*100).toFixed(1),
              gb, ld, fb,
              thresholds: '<10°=GB / 10°~24°=LD / >=25°=FB',
              hhPlusPct: +(hhPlus/total*100).toFixed(1),
              barrelPlusPct: +(barrelPlus/total*100).toFixed(1),
              quality: qPct,
              qualityDef: 'barrelPlus=EV125+&LA20~40° / solid / flare / topped=LA<0 / under / weak (WBD 실측 6분류)'
            };
          } catch(_) { return {n:0, avgLA:null, gbPct:null, ldPct:null, fbPct:null}; }
        })(),
        bunt:{tries:ex.buntTry||0,hits:ex.buntHits||0,rate:+((ex.buntRate||0).toFixed(1))}
      }
    };
  }).filter(Boolean).sort((a,b)=>b.OVR-a.OVR);
  
  // 5) 매치업 데이터 (선택, 용량 큼)
  let matchups=null;
  if(opts.includeMatchups && typeof _getMatchupStats==='function'){
    matchups=[];
    for(const p of pNames){
      for(const b of bNames){
        try{
          const m=_getMatchupStats(p,b);
          if(m && m.pitches>=3){
            matchups.push({pitcher:p,batter:b,...m});
          }
        }catch(_){}
      }
    }
  }
  
  // 6) 팀 분석 (자동 + 수동)
  const teamMap={};
  pitchers.forEach(p=>{
    if(!p.team)return;
    if(!teamMap[p.team])teamMap[p.team]={name:p.team,pitchers:[],batters:[]};
    teamMap[p.team].pitchers.push({name:p.name,OVR:p.OVR});
  });
  batters.forEach(b=>{
    if(!b.team)return;
    if(!teamMap[b.team])teamMap[b.team]={name:b.team,pitchers:[],batters:[]};
    teamMap[b.team].batters.push({name:b.name,OVR:b.OVR});
  });
  const teams=Object.values(teamMap).map(t=>{
    const allP=t.pitchers.length;
    const allB=t.batters.length;
    return {
      name:t.name,
      pitcherCount:allP,
      batterCount:allB,
      avgPitcherOVR:allP?+(t.pitchers.reduce((s,x)=>s+x.OVR,0)/allP).toFixed(1):0,
      avgBatterOVR:allB?+(t.batters.reduce((s,x)=>s+x.OVR,0)/allB).toFixed(1):0,
      topPitcher:t.pitchers.sort((a,b)=>b.OVR-a.OVR).slice(0,3).map(p=>p.name),
      topBatter:t.batters.sort((a,b)=>b.OVR-a.OVR).slice(0,3).map(p=>p.name),
      pitchers:t.pitchers,
      batters:t.batters
    };
  }).sort((a,b)=>(b.avgPitcherOVR+b.avgBatterOVR)-(a.avgPitcherOVR+a.avgBatterOVR));
  
  // 7) 사용자 데이터 (LS)
  const lsData={};
  ['wbd_team_aliases','wbd_my_teams','wbd_manual_teams','wbd_player_groups','wbd_favorites','wbd_memos','wbd_card_overrides','presets'].forEach(k=>{
    try{
      const v=localStorage.getItem(k);
      if(v!==null){try{lsData[k]=JSON.parse(v);}catch(_){lsData[k]=v;}}
    }catch(_){}
  });
  
  // 8) 구종 분석 데이터 (구종별 전체 통계 + 투수별 구종 통계)
  let pitchTypes=null;
  try{
    const {groupStats, playerByGroup}=wbdContext._aggregatePitchTypeStats();
    pitchTypes={
      groups:{},
      playersByGroup:{}
    };
    Object.entries(groupStats).forEach(([g,s])=>{
      // PV/xPV 계산 (그룹 전체 데이터)
      const groupPitches = wbdContext.G.filter(d => d.pType != null && wbdContext.pitchGroup(d.pType, d) === g);
      const pv = +wbdContext._pvSum(groupPitches).toFixed(2);
      const xpv = +wbdContext._xPvSum(groupPitches).toFixed(2);
      const xpvPlus = +wbdContext._xPvPlusSum(groupPitches).toFixed(2);
      const pv100 = s.pitches > 0 ? +(pv / s.pitches * 100).toFixed(3) : 0;
      const xpv100 = s.pitches > 0 ? +(xpv / s.pitches * 100).toFixed(3) : 0;
      const xpvPlus100 = s.pitches > 0 ? +(xpvPlus / s.pitches * 100).toFixed(3) : 0;
      const pvDiff = +(pv - xpv).toFixed(2);
      const pvDiff100 = s.pitches > 0 ? +(pvDiff / s.pitches * 100).toFixed(3) : 0;
      pitchTypes.groups[g]={
        pitches:s.pitches,
        usagePct:+((s.pitches/wbdContext.G.length)*100).toFixed(2),
        avgSpd:s.spdN>0?+(s.spdSum/s.spdN).toFixed(2):null,
        avgSH:s.movN>0?+(s.sHSum/s.movN).toFixed(2):null,
        avgSV:s.movN>0?+(s.sVSum/s.movN).toFixed(2):null,
        avgMov:s.movN>0?+(((s.sHSum+s.sVSum)/s.movN)/2).toFixed(2):null,
        avgGyro:s.gyroN>0?+(s.gyroSum/s.gyroN).toFixed(2):null,
        inZonePct:+(s.inZone/s.pitches*100).toFixed(2),
        whiffPct:s.swing>0?+(s.whiff/s.swing*100).toFixed(2):null,
        ba:s.ab>0?+(s.hit/s.ab).toFixed(3):null,
        hr:s.hr,
        hrPer1000:+(s.hr/s.pitches*1000).toFixed(2),
        avgEV:s.evN>0?+(s.evSum/s.evN).toFixed(2):null,
        avgLA:s.laN>0?+((s.laSum||0)/s.laN).toFixed(2):null,
        hardHitPct:s.evN>0?+(s.hardHit/s.evN*100).toFixed(2):null,
        barrelPct:s.evN>0?+(s.barrel/s.evN*100).toFixed(2):null,
        hhPlusPct:s.evN>0?+((s.hhp||0)/s.evN*100).toFixed(2):null,
        barrelPlusPct:s.evN>0?+((s.brlp||0)/s.evN*100).toFixed(2):null,
        // ⚖️ 구종 가치 (V9.7 CRV 정밀 계산)
        pv,           // 시즌 누적 PV (실제 결과 기반)
        xpv,          // 기대 PV (EV/LA 기반, BABIP 운 제거)
        xpvPlus,      // xPV+ (리그 평균 대비)
        pv100,        // PV/100 (100투구 정규화)
        xpv100,       // xPV/100
        xpvPlus100,   // xPV+/100
        pvDiff,       // 운 = PV - xPV
        pvDiff100     // 운/100
      };
    });
    Object.entries(playerByGroup).forEach(([g,playerMap])=>{
      pitchTypes.playersByGroup[g]={};
      Object.entries(playerMap).forEach(([name,s])=>{
        // 투수별 PV/xPV 계산
        const playerPitches = wbdContext.getPitcherDataByName(name).filter(d => wbdContext.pitchGroup(d.pType, d) === g);
        const pv = +wbdContext._pvSum(playerPitches).toFixed(2);
        const xpv = +wbdContext._xPvSum(playerPitches).toFixed(2);
        const xpvPlus = +wbdContext._xPvPlusSum(playerPitches).toFixed(2);
        const pv100 = s.pitches > 0 ? +(pv / s.pitches * 100).toFixed(3) : 0;
        const xpv100 = s.pitches > 0 ? +(xpv / s.pitches * 100).toFixed(3) : 0;
        const xpvPlus100 = s.pitches > 0 ? +(xpvPlus / s.pitches * 100).toFixed(3) : 0;
        const pvDiff = +(pv - xpv).toFixed(2);
        const pvDiff100 = s.pitches > 0 ? +(pvDiff / s.pitches * 100).toFixed(3) : 0;
        pitchTypes.playersByGroup[g][name]={
          pitches:s.pitches,
          avgSpd:s.spdN>0?+(s.spdSum/s.spdN).toFixed(2):null,
          avgSH:s.movN>0?+(s.sHSum/s.movN).toFixed(2):null,
          avgSV:s.movN>0?+(s.sVSum/s.movN).toFixed(2):null,
          avgMov:s.movN>0?+(((s.sHSum+s.sVSum)/s.movN)/2).toFixed(2):null,
          avgGyro:s.gyroN>0?+(s.gyroSum/s.gyroN).toFixed(2):null,
          inZonePct:+(s.inZone/s.pitches*100).toFixed(2),
          whiffPct:s.swing>0?+(s.whiff/s.swing*100).toFixed(2):null,
          ba:s.ab>0?+(s.hit/s.ab).toFixed(3):null,
          hr:s.hr,
          avgEV:s.evN>0?+(s.evSum/s.evN).toFixed(2):null,
          avgLA:s.laN>0?+((s.laSum||0)/s.laN).toFixed(2):null,
          hardHitPct:s.evN>0?+(s.hardHit/s.evN*100).toFixed(2):null,
          barrelPct:s.evN>0?+(s.barrel/s.evN*100).toFixed(2):null,
          hhPlusPct:s.evN>0?+((s.hhp||0)/s.evN*100).toFixed(2):null,
          barrelPlusPct:s.evN>0?+((s.brlp||0)/s.evN*100).toFixed(2):null,
          // ⚖️ 구종 가치 (V9.7 CRV + xPV+ + 운/100)
          pv, xpv, xpvPlus, pv100, xpv100, xpvPlus100, pvDiff, pvDiff100
        };
      });
    });
  }catch(e){console.warn('pitch type aggregation failed',e);}
  
  // 9) 어워드 (시즌 수상자 — MVP/사이영/홈런왕 등)
  let awards=null;
  try{
    awards={};
    // 투수/타자 리스트에서 핵심 통계로 1위 산출 (이미 pitchers/batters 정렬됨)
    const sortBy=(arr,key,desc=true)=>[...arr].sort((a,b)=>desc?((b[key]||b.season?.[key])||0)-((a[key]||a.season?.[key])||0):((a[key]||a.season?.[key])||0)-((b[key]||b.season?.[key])||0));
    
    // 타자 어워드
    const qualifyB=batters.filter(b=>(b.season?.AB||0)>=20);
    // V10.2: MVP/사이영을 OVR 1위 → WAR 기반으로 교체 (앱 내 어워드 페이지와 동일 기준, 자격 요건 동일)
    const _rec = (()=>{ try{ return wbdContext._computeRecordsData(); }catch(e){ return null; } })();
    const _warB = (()=>{ if(!_rec) return null;
      const q=_rec.batters.filter(b=>b.AB>=20).sort((a,b)=>(b.owar||0)-(a.owar||0))[0];
      return q?{name:q.name, team:q.team, oWAR:+(q.owar||0).toFixed(2)}:null; })();
    awards.batting = {
      MVP: _warB || (batters[0] ? {name:batters[0].name, team:batters[0].team, OVR:batters[0].OVR} : null),
      HRKing: (() => { const t=sortBy(qualifyB,'HR'); return t[0] ? {name:t[0].name, hr:t[0].season.HR} : null; })(),
      AVGKing: (() => { const t=sortBy(qualifyB,'BA'); return t[0] ? {name:t[0].name, ba:t[0].season.BA} : null; })(),
      OBPKing: (() => { const t=sortBy(qualifyB,'OBP'); return t[0] ? {name:t[0].name, obp:t[0].season.OBP} : null; })(),
      SLGKing: (() => { const t=sortBy(qualifyB,'SLG'); return t[0] ? {name:t[0].name, slg:t[0].season.SLG} : null; })(),
      OPSKing: (() => { const t=sortBy(qualifyB,'OPS'); return t[0] ? {name:t[0].name, ops:t[0].season.OPS} : null; })(),
      wOBAKing: (() => { // V10.2: advanced(기록실) wOBA 기준으로 통일 — season.wOBA(구버전 계산)와 정렬 불일치 해소
        if(_rec){ const t=_rec.batters.filter(b=>b.AB>=20).sort((a,b)=>(b.woba||0)-(a.woba||0))[0];
          if(t) return {name:t.name, team:t.team, woba:+t.woba.toFixed(3)}; }
        const t=sortBy(qualifyB,'wOBA'); return t[0] ? {name:t[0].name, woba:t[0].season.wOBA} : null; })(),
      HitsKing: (() => { const t=sortBy(qualifyB,'H'); return t[0] ? {name:t[0].name, hits:t[0].season.H} : null; })(),
    };
    
    // 투수 어워드
    const qualifyP=pitchers.filter(p=>(p.season?.pitches||0)>=50);
    awards.pitching = {
      CyYoung: (()=>{ if(!_rec) return pitchers[0]?{name:pitchers[0].name, team:pitchers[0].team, OVR:pitchers[0].OVR}:null;
        const q=_rec.pitchers.filter(p=>p.n>=50).sort((a,b)=>(b.pwar||-99)-(a.pwar||-99))[0];
        return q?{name:q.name, team:q.team, pWAR:+(q.pwar||0).toFixed(2), ERA:q.era!=null?+q.era.toFixed(2):null}:null; })(),
      KKing: (() => { const t=sortBy(qualifyP,'K'); return t[0] ? {name:t[0].name, k:t[0].season.K} : null; })(),
      ERA_Best: (() => { const t=sortBy(qualifyP,'ERA',false); return t[0] ? {name:t[0].name, era:t[0].season.ERA} : null; })(),
      WHIP_Best: (() => { const t=sortBy(qualifyP,'WHIP',false); return t[0] ? {name:t[0].name, whip:t[0].season.WHIP} : null; })(),
      PVKing: (() => { const t=sortBy(qualifyP,'seasonPV'); return t[0] ? {name:t[0].name, pv:t[0].season.seasonPV} : null; })(),  // V9.7
      xPVKing: (() => { const t=sortBy(qualifyP,'seasonXPV'); return t[0] ? {name:t[0].name, xpv:t[0].season.seasonXPV} : null; })(),
    };
    
    // V10.2: 종합 MVP = 투타 합산 WAR 1위 (앱 내 통합 MVP와 동일 철학). OVR top10은 참고로 유지
    const allPlayers = [
      ...pitchers.map(p => ({name:p.name, team:p.team, OVR:p.OVR, type:'pitcher'})),
      ...batters.map(b => ({name:b.name, team:b.team, OVR:b.OVR, type:'batter'}))
    ].sort((a,b)=>b.OVR-a.OVR);
    const _warMvp = (()=>{ if(!_rec) return null;
      const wm={};
      _rec.batters.forEach(b=>{ if(b.AB>=20) wm[b.name]={name:b.name, team:b.team, WAR:+(b.owar||0)}; });
      _rec.pitchers.forEach(p=>{ if(p.n>=50){ if(!wm[p.name]) wm[p.name]={name:p.name, team:p.team, WAR:0}; wm[p.name].WAR=+(wm[p.name].WAR+(p.pwar||0)); } });
      const top=Object.values(wm).sort((a,b)=>b.WAR-a.WAR)[0];
      return top?{...top, WAR:+top.WAR.toFixed(2)}:null; })();
    awards.overall = {
      MVP: _warMvp || allPlayers[0] || null,
      top10_OVR: allPlayers.slice(0, 10)
    };
  }catch(e){console.warn('awards aggregation failed',e);}
  
  // 10) 팀 진단서 (핵심 투수/타자 분류 + 라인업)
  let teamReports=null;
  try{
    teamReports={};
    if(typeof wbdContext._generateTeamScoutReport === 'function'){
      const teamNames = Object.keys(teamMap);
      teamNames.forEach(team => {
        try{
          const r = wbdContext._generateTeamScoutReport(team);
          if(!r) return;
          teamReports[team] = {
            corePitchers: (r.corePitchers||[]).map(p => ({
              name: p.name,
              role: p.role,
              track: p.track,
              ba: +(p.ba||0).toFixed(3),
              whPct: +(p.whPct||0).toFixed(1),
              bbPct: +(p.bbPct||0).toFixed(1),
              stability: +(p.stability||0).toFixed(3)
            })),
            coreBatters: (r.coreBatters||[]).map(b => ({
              name: b.name,
              role: b.role,
              ba: +(b.ba||0).toFixed(3),
              ops: +(b.ops||0).toFixed(3),
              hr: b.hr||0
            })),
            strengths: r.strengths || [],
            weaknesses: r.weaknesses || [],
            lineup: r.lineup || null
          };
        }catch(_){}
      });
    }
  }catch(e){console.warn('team reports failed',e);}
  
  // 11) 선수 평가 리포트 (강점/약점/스카우트 노트)
  let scoutReports=null;
  try{
    scoutReports={pitchers:{}, batters:{}};
    if(typeof _scoutDataFor==='function' && typeof wbdContext._generateScoutReportPitcher==='function'){
      // 핵심 선수만 (OVR 상위 N명, 너무 크지 않게)
      const topPitchers = pitchers.slice(0, 30);
      const topBatters = batters.slice(0, 30);
      
      topPitchers.forEach(p => {
        try{
          const data = _scoutDataFor(p.name, 'pitcher');
          if(!data) return;
          const report = wbdContext._generateScoutReportPitcher(data);
          if(!report) return;
          scoutReports.pitchers[p.name] = {
            fvLabel: report.fvLabel,
            fv: report.fv,
            roleBadge: report.roleBadge,
            strengths: (report.strengths || []).map(s => s.replace(/<[^>]+>/g, '')).slice(0, 8),
            weaknesses: (report.weaknesses || []).map(s => s.replace(/<[^>]+>/g, '')).slice(0, 8),
            scoutNote: (report.scoutNote || '').replace(/<[^>]+>/g, '')
          };
        }catch(_){}
      });
      
      topBatters.forEach(b => {
        try{
          const data = _scoutDataFor(b.name, 'batter');
          if(!data) return;
          if(typeof wbdContext._generateScoutReportBatter !== 'function') return;
          const report = wbdContext._generateScoutReportBatter(data);
          if(!report) return;
          scoutReports.batters[b.name] = {
            fvLabel: report.fvLabel,
            fv: report.fv,
            roleBadge: report.roleBadge,
            strengths: (report.strengths || []).map(s => s.replace(/<[^>]+>/g, '')).slice(0, 8),
            weaknesses: (report.weaknesses || []).map(s => s.replace(/<[^>]+>/g, '')).slice(0, 8),
            scoutNote: (report.scoutNote || '').replace(/<[^>]+>/g, '')
          };
        }catch(_){}
      });
    }
  }catch(e){console.warn('scout reports failed',e);}
  
  return {
    meta,
    games,
    pitchers,
    batters,
    teams,
    matchups,
    pitchTypes,
    awards,
    teamReports,
    scoutReports,
    runValue:(()=>{ try{
      if(typeof wbdContext.getRunValueData!=='function') return null;
      const D=wbdContext.getRunValueData();
      const RE={}; Object.keys(D.RE||{}).forEach(k=>{ RE[k]=+D.RE[k].toFixed(3); });
      const bat={}; Object.entries(D.bat||{}).forEach(([n,v])=>{ if(v.pa>=10) bat[n]={rv:+v.rv.toFixed(2),pa:v.pa,per100:+(v.rv/v.pa*100).toFixed(2)}; });
      const pit={}; Object.entries(D.pit||{}).forEach(([n,v])=>{ if(v.bf>=20) pit[n]={rv:+v.rv.toFixed(2),bf:v.bf,per100:+(v.rv/v.bf*100).toFixed(2)}; });
      return { note:'RE24 기반 Run Value. RE=루상·아웃(b1b2b3|out) 상태별 기대득점. bat/pit=선수별 RV 합(타석/상대타자 기준). 활성 경기 기준.', RE, batters:bat, pitchers:pit };
    }catch(e){ return null; } })(),
    rounds:(()=>{ try{
      if(typeof wbdContext.computeRounds!=='function') return null;
      const R=wbdContext.computeRounds(); if(!R.valid) return null;
      const maxRound={}; R.groups.forEach(g=>{maxRound[g.key]=g.maxRound;});
      return { note:'풀리그 라운드 자동 판별(리그전 한정, 매치업 N번째 대결=NR). roundOf=경기ID별 라운드, roundGroup=경기ID별 시즌, groups=시즌별 라운드 수. 포스트시즌·꼬리·비리그전은 미부여.', roundOf:R.roundOf, roundGroup:R.roundGroup, maxRound, groups:R.groups.map(g=>({key:g.key,name:g.name,maxRound:g.maxRound})) };
    }catch(e){ return null; } })(),
    xOut:(()=>{ try{
      if(typeof wbdContext.getXOutData!=='function') return null;
      const D=wbdContext.getXOutData();
      const bat={}; Object.entries(D.bat||{}).forEach(([n,v])=>{ if(v.bip>=15) bat[n]={bip:v.bip,hits:v.hits,xHits:+v.xHits.toFixed(1),ba:+(v.hits/v.bip).toFixed(3),xba:+(v.xHits/v.bip).toFixed(3),luck:+(v.hits-v.xHits).toFixed(1)}; });
      const pit={}; Object.entries(D.pit||{}).forEach(([n,v])=>{ if(v.bip>=20) pit[n]={bip:v.bip,hits:v.hits,xHits:+v.xHits.toFixed(1),ba:+(v.hits/v.bip).toFixed(3),xba:+(v.xHits/v.bip).toFixed(3),luck:+(v.hits-v.xHits).toFixed(1)}; });
      return { note:'기대 성적(xOut). 인플레이 타구(BABIP 성격, 홈런 제외)의 리그 기대 아웃확률 기반. luck=실제안타−기대안타(양수=운좋음, 투수는 양수=불운). 활성 경기 기준.', batters:bat, pitchers:pit };
    }catch(e){ return null; } })(),
    scouting:(()=>{ try{
      // V12 스카우팅 도시에 + 공략 엔진 산출물 (활성 경기 기준). 표본 작은 선수는 생략.
      if(typeof wbdContext._atkEngine!=='function'||typeof wbdContext._srBatterDossier!=='function') return null;
      const strip=w=>({tier:w.tier||null,title:w.title,why:w.why,how:w.how,conf:w.conf||null,n:w.n||null});
      const bat={}, pit={};
      (window._cache.batterNames||[]).forEach(n=>{ const d=wbdContext.getBatterDataByName(n); if(d.length<60)return;
        const D=wbdContext._srBatterDossier(n), A=wbdContext._atkEngine(n,'batter'); if(!D||!A)return;
        const tools={}; D.T.forEach(t=>{ if(t.grade!=null) tools[t.key]={grade:t.grade,pct:t.pct!=null?+t.pct.toFixed(0):null,note:t.note}; });
        bat[n]={ofp:D.ofp, tools, approach:D.app, battedBall:D.bb, risk:D.risk, attack:{summary:A.summary, weaknesses:A.weaknesses.map(strip), strengths:A.strengths.map(s=>({title:s.title,why:s.why,how:s.how})), sequence:A.sequence, takeNotes:(A.takeNotes||[]).map(t=>t.label), insights:A.insights||[], splitLR:A.splitLR||null}, profile:(()=>{try{const R=wbdContext._srProfileBatter(n);return R?{arch:R.arch,tags:R.tags.map(t=>t.label),paras:R.paras,verdict:R.verdict,conf:R.conf}:null;}catch(e){return null;}})()}; });
      (window._cache.pitcherNames||[]).forEach(n=>{ const d=wbdContext.getPitcherDataByName(n); if(d.length<80)return;
        const D=wbdContext._srPitcherDossier(n), A=wbdContext._atkEngine(n,'pitcher'); if(!D||!A)return;
        const tools={}; D.T.forEach(t=>{ if(t.grade!=null) tools[t.key]={grade:t.grade,pct:t.pct!=null?+t.pct.toFixed(0):null,note:t.note}; });
        pit[n]={ofp:D.ofp, tools, repertoire:D.rep.map(r=>({pitch:r.g,usagePct:+r.pct.toFixed(1),velo:r.velo!=null?+r.velo.toFixed(1):null,veloMax:r.veloMax,movH:r.sH!=null?+r.sH.toFixed(1):null,movV:r.sV!=null?+r.sV.toFixed(1):null,zonePct:r.zone!=null?+r.zone.toFixed(1):null,whiffPct:r.whiff!=null?+r.whiff.toFixed(1):null,baa:r.baa!=null?+r.baa.toFixed(3):null,slgA:r.slg!=null?+r.slg.toFixed(3):null,firstPitchUse:r.fpUse!=null?+r.fpUse.toFixed(1):null,twoStrikeUse:r.k2Use!=null?+r.k2Use.toFixed(1):null})),
          sequencing:D.seqRows.map(r=>({count:r.c,n:r.n,top:r.top.map(t=>({pitch:t.g,pct:+t.pct.toFixed(1)}))})), predictability:D.predict!=null?+D.predict.toFixed(1):null,
          command:D.cmdN, stamina:{byPitchCount:D.stamPC.map(r=>({bucket:r.k,n:r.n,velo:r.velo!=null?+r.velo.toFixed(1):null,baa:r.baa!=null?+r.baa.toFixed(3):null,whiffPct:r.whiff!=null?+r.whiff.toFixed(1):null,bbPct:r.bb!=null?+r.bb.toFixed(1):null})),byInning:D.stamInn.map(r=>({bucket:r.k,n:r.n,velo:r.velo!=null?+r.velo.toFixed(1):null,baa:r.baa!=null?+r.baa.toFixed(3):null})),notes:D.stamN},
          risk:D.risk, attack:{summary:A.summary, weaknesses:A.weaknesses.map(strip), strengths:A.strengths.map(s=>({title:s.title,why:s.why,how:s.how})), sequence:A.sequence, splitLR:A.splitLR||null}, profile:(()=>{try{const R=wbdContext._srProfilePitcher(n);return R?{arch:R.arch,tags:R.tags.map(t=>t.label),paras:R.paras,verdict:R.verdict,conf:R.conf}:null;}catch(e){return null;}})()}; });
      return { note:'스카우팅 도시에 + 공략 엔진. tools=20-80 등급(리그 백분위 기반, pct=백분위, note=근거). ofp=종합(가중). attack=상대 입장 공략(약점은 "약함+스윙함+유도됨" 3단 검증, tier ✅강력/△범타/참고, conf=표본 신뢰도). sequence=승부 시퀀스. 투수 repertoire/sequencing(카운트별 구종)/stamina(투구수·이닝 구간). 코스 판정은 존 안 9칸 기준(존 밖 볼은 별도). 모든 약점 판정은 리그가 아닌 본인 전체 대비.', batters:bat, pitchers:pit };
    }catch(e){ return null; } })(),
    league:(()=>{ try{
      const lg=wbdContext._computeRecordsData().lg||{};
      const bs=wbdContext._computeRecordsData().batters, ps=wbdContext._computeRecordsData().pitchers;
      const avg=(arr,k)=>arr.length?+(arr.reduce((s,x)=>s+(x[k]||0),0)/arr.length).toFixed(3):null;
      return {
        env:'WBD는 MLB 대비 극단적 타고(打高) 리그 — 리그 평균을 기준선으로 해석할 것',
        lgRA9:+(lg.lgRA9||0).toFixed(2), lgRPG:+(lg.lgRPG||0).toFixed(2), RPW:+(lg.RPW||0).toFixed(2),
        lgwOBA:+(lg.lgWoba||0).toFixed(3),
        batting:{ avgAVG:avg(bs.filter(b=>b.AB>=20),'avg'), avgOBP:avg(bs.filter(b=>b.AB>=20),'obp'),
          avgSLG:avg(bs.filter(b=>b.AB>=20),'slg'), avgOPS:avg(bs.filter(b=>b.AB>=20),'ops'),
          avgK_pct:avg(bs.filter(b=>b.AB>=20),'kPct'), avgBB_pct:avg(bs.filter(b=>b.AB>=20),'bbPct') },
        pitching:{ avgERA:avg(ps.filter(p=>p.n>=50),'era'), avgFIP:avg(ps.filter(p=>p.n>=50),'fip'),
          avgOppAVG:avg(ps.filter(p=>p.n>=50),'oAvg'), avgK9:avg(ps.filter(p=>p.n>=50),'k9'),
          avgWhiff_pct:avg(ps.filter(p=>p.n>=50),'whiffPct') },
        note:'avg* 는 자격(타자 AB≥20/투수 투구≥50) 충족 선수들의 평균. 개별 선수 비교 시 이 값을 100% 기준선으로 삼으면 됨'
      };
    }catch(_){ return null; } })(),
    // V11.4: 팀 분석 블록 — 팀 탭(개요·진단서)과 동일한 기준으로 산출
    teams:(()=>{
      try{
        const prof=wbdContext._computeTeamProfiles();
        // 팀 ERA+ 기준선 (리그 전체 RA9)
        let _lgRA9Ref=0;
        try{
          const _ti=(prof.teams||[]).reduce((a,x)=>a+(x.IP||0),0);
          const _tr=(prof.teams||[]).reduce((a,x)=>a+(x.pRuns||0),0);
          _lgRA9Ref=_ti>0?_tr/_ti*9:0;
        }catch(_){}
        return (prof.teams||[]).map(t=>{
          const S=wbdContext._teamScores(prof,t);
          const A=S.A, P=prof.pctOf;
          const CLb=wbdContext._teamClutch(t.team,'bat'), CLp=wbdContext._teamClutch(t.team,'pit');
          const r3=v=>v==null?null:+v.toFixed(3);
          const r2=v=>v==null?null:+v.toFixed(2);
          const r1=v=>v==null?null:+v.toFixed(1);
          const pct=v=>v==null?null:+(v*100).toFixed(1);
          return {
            team:t.team,
            roster:{ batters:t.batters.length, pitchers:t.pitchers.length, PA:t.PA, IP:r1(t.IP) },
            grade:{
              overall:wbdContext._teamGrade(S.total), overallScore:pct(S.total),
              batting:wbdContext._teamGrade(S.bat),   battingScore:pct(S.bat),
              pitching:wbdContext._teamGrade(S.pit),  pitchingScore:pct(S.pit),
              defense:wbdContext._teamGrade(S.def),   defenseScore:pct(S.def),
              weights:'타격45% + 투수45% + 수비10% · 타격=컨택35/파워40/선구25 · 투수=구위35/제구25/결과40'
            },
            areas:{
              contact:pct(A.contact), power:pct(A.power), eye:pct(A.eye),
              pitchStuff:pct(A.pStuff), pitchControl:pct(A.pCtrl), pitchResult:pct(A.pResult),
              note:'0~100 리그 백분위 (높을수록 상위)'
            },
            batting:{
              avg:r3(t.avg), obp:r3(t.obp), slg:r3(t.slg), ops:r3(t.ops), iso:r3(t.iso), woba:r3(t.woba),
              HR:t.HR, hrPct:r1(t.hrPct), bbPct:r1(t.bbPct), kPct:r1(t.kPct),
              avgEV:r1(t.avgEV), avgLA:r1(t.avgLA),
              hhPct:r1(t.hhPct), hhPlusPct:r1(t.hhpPct), barrelPct:r1(t.brlPct), barrelPlusPct:r1(t.brlpPct),
              zContactPct:r1(t.zContactPct), chasePct:r1(t.chasePct), zSwingPct:r1(t.zSwingPct),
              sweetPct:r1(t.sweetPct), babip:r3(t.babip), GIDP:t.GIDP, oWAR:r2(t.owar)
            },
            pitching:{
              era:r2(t.era), fip:r2(t.fip), whip:r2(t.whip), k9:r1(t.k9),
              runs:t.pRuns!=null?t.pRuns:null, ra9:r2(t.IP>0&&t.pRuns!=null?t.pRuns/t.IP*9:null),
              eraPlus:t.era!=null&&t.era>0?Math.round((_lgRA9Ref||0)>0?(_lgRA9Ref/t.era*100):0)||null:null,
              oppAVG:r3(t.oAvg), kPct:r1(t.pKPct), bbPct:r1(t.pBBPct), kbb:r2(t.pKBB),
              hrPct:r1(t.pHRPct), whiffPct:r1(t.pWhiffPct), zonePct:r1(t.pZinPct),
              middlePct:r1(t.pMidPct), borderPct:r1(t.pBorderPct),
              avgEV:r1(t.pAvgEV), avgLA:r1(t.pAvgLA),
              hhPct:r1(t.pHhPct), hhPlusPct:r1(t.pHhpPct), barrelPct:r1(t.pBrlPct), barrelPlusPct:r1(t.pBrlpPct),
              GIDPinduced:t.pGIDP, pWAR:r2(t.pwar)
            },
            defense:{ oaa:r1(S.defInfo.oaa), leagueRank:S.defInfo.rank, leagueTeams:S.defInfo.n,
                      note:'OAA는 추정 지표 — 종합 등급 비중 10%' },
            clutch:{
              battingOPS:r3(CLb.ops), battingDiff:r3(CLb.diff), battingAB:CLb.ab,
              pitchingOPS:r3(CLp.ops), pitchingDiff:r3(CLp.diff), pitchingAB:CLp.ab,
              leagueOPS:r3(CLb.lgOps),
              note:'득점권(2·3루) OPS · 종합 등급 미반영 참고 지표'
            },
            totalWAR:r2(t.war)
          };
        });
      }catch(e){ return []; }
    })(),
    // V11.5: 리그 순위표 — 활성 경기 기준 승패·득실 (이닝별 득점 집계, 끝내기 보정 포함)
    standings:(()=>{
      try{
        const rec={};
        const ini=t=>({team:t,G:0,W:0,L:0,T:0,RF:0,RA:0,games:[]});
        wbdContext.GAMES.filter(g=>wbdContext.activeGameIds.has(g.id)).forEach(g=>{
          const i=wbdContext._parseGameName(g.name);
          const tA=wbdContext._normalizeTeam(i.teamA), tB=wbdContext._normalizeTeam(i.teamB);
          if(!tA||!tB) return;
          const sc=wbdContext._computeInningScores(g.pitches||[]);
          if(!rec[tA])rec[tA]=ini(tA);
          if(!rec[tB])rec[tB]=ini(tB);
          const A=rec[tA], B=rec[tB];
          A.G++; B.G++;
          A.RF+=sc.totalA; A.RA+=sc.totalB;
          B.RF+=sc.totalB; B.RA+=sc.totalA;
          let resA;
          if(sc.totalA>sc.totalB){A.W++;B.L++;resA='W';}
          else if(sc.totalB>sc.totalA){B.W++;A.L++;resA='L';}
          else {A.T++;B.T++;resA='T';}
          A.games.push({date:i.date||'', opp:tB, rf:sc.totalA, ra:sc.totalB, result:resA});
          B.games.push({date:i.date||'', opp:tA, rf:sc.totalB, ra:sc.totalA, result:resA==='W'?'L':(resA==='L'?'W':'T')});
        });
        return Object.values(rec).map(r=>({
          team:r.team, G:r.G, W:r.W, L:r.L, T:r.T,
          winPct:+((r.W+r.L)>0?r.W/(r.W+r.L):0).toFixed(3),
          RF:r.RF, RA:r.RA, diff:r.RF-r.RA,
          rpg:+(r.G>0?r.RF/r.G:0).toFixed(2), rapg:+(r.G>0?r.RA/r.G:0).toFixed(2),
          // 피타고리안 기대승률 (WBD 지수 1.83)
          pythWinPct:+((r.RF>0||r.RA>0)?Math.pow(r.RF,1.83)/(Math.pow(r.RF,1.83)+Math.pow(r.RA,1.83)):0).toFixed(3),
          gameLog:r.games
        })).sort((a,b)=>b.winPct-a.winPct||b.diff-a.diff);
      }catch(e){ return []; }
    })(),
    // V11.5: 팀 수비 세부 — 내야/외야 분리 + 포지션별 + 선수별 (리그 동일 포지션 대비)
    teamDefense:(()=>{
      try{
        const dd=wbdContext._computeDefenseData();
        if(!dd||!dd.byPlayer) return [];
        const IF=new Set(['P','C','1B','2B','3B','SS']);
        // 리그 포지션별 기준
        const lgPos={};
        Object.values(dd.byPlayer).forEach(p=>{
          Object.entries(p.byPos||{}).forEach(([pos,ps])=>{
            if(!lgPos[pos])lgPos[pos]={oaa:0,ch:0,outs:0,per10:[]};
            lgPos[pos].oaa+=ps.oaaWeighted||0;
            lgPos[pos].ch+=ps.chances||0;
            lgPos[pos].outs+=ps.outs||0;
            if((ps.chances||0)>=3) lgPos[pos].per10.push((ps.oaaWeighted||0)/(ps.chances||1)*10);
          });
        });
        Object.values(lgPos).forEach(v=>{
          v.outRate=v.ch>0?v.outs/v.ch:0;
          v.per10.sort((a,b)=>a-b);
        });
        const pctileOf=(pos,p10)=>{
          const arr=lgPos[pos]&&lgPos[pos].per10;
          if(!arr||arr.length<3) return null;
          return +(arr.filter(v=>v<=p10).length/arr.length).toFixed(2);
        };
        // 팀별 집계
        const teams={};
        Object.values(dd.byPlayer).forEach(p=>{
          const tm=wbdContext._playerTeam(p.name,'batter');
          if(!tm||tm==='—') return;
          if(!teams[tm])teams[tm]={team:tm, oaa:0, chances:0, outs:0,
            infield:{oaa:0,chances:0,outs:0}, outfield:{oaa:0,chances:0,outs:0},
            byPos:{}, players:[]};
          const T=teams[tm];
          Object.entries(p.byPos||{}).forEach(([pos,ps])=>{
            const o=ps.oaaWeighted||0, ch=ps.chances||0, out=ps.outs||0;
            if(ch<1) return;
            T.oaa+=o; T.chances+=ch; T.outs+=out;
            const zone = IF.has(pos) ? T.infield : T.outfield;
            zone.oaa+=o; zone.chances+=ch; zone.outs+=out;
            if(!T.byPos[pos])T.byPos[pos]={oaa:0,chances:0,outs:0,players:[]};
            T.byPos[pos].oaa+=o; T.byPos[pos].chances+=ch; T.byPos[pos].outs+=out;
            const p10=ch>0?o/ch*10:0;
            const entry={name:p.name, pos, chances:ch, outs:out,
              outRate:+(ch>0?out/ch:0).toFixed(3),
              oaa:+o.toFixed(1), oaaPer10:+p10.toFixed(2),
              lgOutRate:+(lgPos[pos]?lgPos[pos].outRate:0).toFixed(3),
              vsLeague:+(((ch>0?out/ch:0)-(lgPos[pos]?lgPos[pos].outRate:0))*100).toFixed(1),
              leaguePctile:pctileOf(pos,p10)};
            T.byPos[pos].players.push(entry);
            T.players.push(entry);
          });
        });
        // 리그 내야/외야 기준
        let lgIf={ch:0,outs:0}, lgOf={ch:0,outs:0};
        Object.entries(lgPos).forEach(([pos,v])=>{
          const z=IF.has(pos)?lgIf:lgOf; z.ch+=v.ch; z.outs+=v.outs;
        });
        const zoneStat=(z,lgz)=>({
          oaa:+z.oaa.toFixed(1), chances:z.chances,
          outRate:+(z.chances>0?z.outs/z.chances:0).toFixed(3),
          lgOutRate:+(lgz.ch>0?lgz.outs/lgz.ch:0).toFixed(3),
          vsLeague:+(((z.chances>0?z.outs/z.chances:0)-(lgz.ch>0?lgz.outs/lgz.ch:0))*100).toFixed(1)
        });
        let _pass={byTeam:{},lgRate:0};
        try{ _pass=wbdContext._teamInfieldPassRate(); }catch(_){}
        const arr=Object.values(teams).map(T=>({
          team:T.team,
          oaa:+T.oaa.toFixed(1), chances:T.chances,
          infieldPass:(()=>{ const x=_pass.byTeam[T.team];
            return x?{groundBalls:x.gb, passed:x.pass, rate:+x.rate.toFixed(1),
                      lgRate:+_pass.lgRate.toFixed(1), vsLeague:+x.vsLeague.toFixed(1)}:null; })(),
          outRate:+(T.chances>0?T.outs/T.chances:0).toFixed(3),
          infield:zoneStat(T.infield,lgIf),
          outfield:zoneStat(T.outfield,lgOf),
          byPos:Object.fromEntries(Object.entries(T.byPos).map(([pos,v])=>[pos,{
            oaa:+v.oaa.toFixed(1), chances:v.chances,
            outRate:+(v.chances>0?v.outs/v.chances:0).toFixed(3),
            lgOutRate:+(lgPos[pos]?lgPos[pos].outRate:0).toFixed(3),
            vsLeague:+(((v.chances>0?v.outs/v.chances:0)-(lgPos[pos]?lgPos[pos].outRate:0))*100).toFixed(1),
            players:v.players.sort((a,b)=>b.chances-a.chances)
          }])),
          players:T.players.sort((a,b)=>a.vsLeague-b.vsLeague)
        })).sort((a,b)=>b.oaa-a.oaa);
        arr.forEach((t,i)=>{t.leagueRank=i+1;});
        return {
          note:'OAA는 추정 지표 · vsLeague는 같은 포지션 리그 평균 아웃률과의 차이(%p) · leaguePctile은 동일 포지션 내 백분위(0~1)',
          leagueByPos:Object.fromEntries(Object.entries(lgPos).map(([pos,v])=>[pos,{
            chances:v.ch, outRate:+v.outRate.toFixed(3), totalOAA:+v.oaa.toFixed(1)
          }])),
          teams:arr
        };
      }catch(e){ return []; }
    })(),
    codeMaps:{
      _desc:'CSV/JSON 원시 코드값 → 의미 매핑. 원시 투구로그(pitches) 해석용. 이거 없이 result/call/pType를 추론하지 말 것',
      result:{'0':'None(타석 진행중/무결과)','1':'FlyOut(뜬공 아웃)','2':'GroundBall(땅볼 아웃)','3':'Foul(파울)','4':'HomeRun','5':'Walk(볼넷)','6':'HBP(몸에 맞는 공)'},
      call:{'0':'Strike(스트라이크)','1':'Ball(볼)','2':'Hit(인플레이 타구/컨택)','3':'DeadBall','4':'Swing(스윙 스트라이크)','5':'None'},
      pitchOutcome:'투구 결과 분류(_pitchOutcome): hr(홈런)/hit(안타)/out(인플레이 아웃)/whiff(헛스윙, bSwing 기반·존 무관)/called(루킹 스트라이크)/foul(파울)/ball(볼)/bb(볼넷)/hbp(사구). 원시 call 코드는 Hit에 안타·아웃·파울이 섞이고 Swing이 존밖 헛스윙만 잡히므로 분석 시 이 분류 사용 권장',
      hPos:'배트 접촉 위치(0~1). 0.5=배트 중심. |hPos-0.5|가 작을수록 중심 타격. 스윗스팟 기준 0.35~0.65',
      hitDetermination:'안타 여부는 result가 아니라 1BSafe==1 (또는 result==4 홈런)으로 판정. result 1/2는 아웃임에 주의. 안타 루타수는 _hitBase(1/2/3, 홈런4)로 별도 추적(추정 포함)',
      batType:{'0':'Normal(일반)','1':'Forced(강력충돌)','2':'Physics(물리)','3':'Physics Adjust(물리보정)','4':'Forced Assist(강제보정)','5':'Sweep(스윕)','6':'PC Batting'},
      bunt:'번트 판정은 batType이 아니라 buntGrip>=0.7로 함 (공식 명세: batType에 번트 없음)',
      pTypeToGroup:{'0':'패스트볼','1':'너클볼','2':'라이징슬라이더','3':'슬라이더','4':'슬라이더','5':'슬라이더','6':'싱커','7':'싱커','8':'싱커','9':'라이징싱커','10':'스플리터','11':'스플리터','12':'스플리터','13':'커브','14':'스크류','15':'라이징','16':'라이징','17':'라이징','18':'라이징슬라이더','19':'라이징슬라이더','20':'라이징싱커','21':'라이징싱커','22':'커브','23':'커브','24':'스크류','25':'스크류','26':'포심','27':'포심','28':'포심','29':'커터','30':'커터','31':'커터','32':'투심','33':'투심','34':'투심','35':'드롭','36':'드롭','37':'드롭','38':'체인지업','39':'라이즈체인지업','40':'라이즈체인지업','41':'라이즈체인지업','42':'써클체인지업','43':'써클체인지업','44':'써클체인지업','45':'페이드체인지업','46':'페이드체인지업','47':'페이드체인지업','48':'드롭체인지업','49':'드롭체인지업','50':'드롭체인지업'},
      outCode:'아웃코드 비트필드(신규 CSV) — 하위4비트=처리야수(1=P,2=C,3=1B,4=2B,5=3B,6=SS,7=LF,8=CF,9=RF), 4~6비트=아웃 베이스(1=1루,2=2루,3=3루,4=홈), 7~9비트=방식(1=포스,2=태그,3=플라이포구,4=삼진,5=어필). out1~3은 순서 없는 슬롯이므로 셋 다 확인해야 함',
      fieldersChoice:'선행주자가 포스아웃(방식=1)되면 타자는 안타가 아니라 야수선택(FC). 타구질·수비 의도·시간과 무관하게 적용',
      pTypeSuffix:'구종 코드 3연속(-S/-A/-F)은 회전 정도 변형(예: 26/27/28 모두 포심). 그룹 단위로 집계 권장',
      keyFields:'ev=타구속도(km/h), ldeg=발사각(°), sdeg=타구방향각(°, 음수=좌측(LF·3루)/양수=우측(RF·1루)), spdK=구속(km/h), zoneX/zoneY=투구위치(±1 존안; 투수 시점, +X=우타자 몸쪽), sH/sV=회전(횡/종), lx/lz=낙구좌표, cPlr/cPos=포구자/포지션, 9포지션 PosX/Y=수비스타트위치. 파생(앱 계산): _paEnd=타석 종료 투구(경기 단위 판정; PA/AB는 이 플래그 기준 — 다음 투구가 다른 타자/이닝이거나 HR·BB·HBP), _hitBase=안타 루타(1~4, _hitBaseConf=exact/estimated/inning_end), _isFC=야수선택, _xOut=타구 아웃 기대확률. ※ result=1/2(뜬공/땅볼)인데 _paEnd=false면 파울 오기록이라 인플레이로 세지 말 것'
    },
    glossary:{
      _desc:'WBD 커스텀/세이버 지표 정의 — 모든 지표는 WBD 리그 자체 환경 보정값 (MLB 상수 미사용)',
      oWAR:'타자 종합 기여 승수(타격). 높을수록 좋음. (wRAA + 대체수준보정)/RPW. 리그 RPW로 환산',
      pWAR:'투수 종합 기여 승수. 높을수록 좋음. V10.2부터 실점(RA9) 기반(bWAR식) — WBD는 BB가 희귀해 FIP 변별력이 낮아 실점 기반 채택',
      WAR144:'WAR를 KBO 144경기 기준으로 환산(순위 불변, 스케일만 KBO 감각)',
      wOBA:'타석당 득점가치 가중 평균. 높을수록 좋음. WBD 리그 가중치/스케일 사용',
      'wRC+':'리그 평균=100 기준 득점생산력 지수. 110이면 평균보다 10% 우수',
      FIP:'수비 무관 평균자책(K·BB·HR만). 낮을수록 좋음. 참고지표(WBD에선 변별력 낮음)',
      'FIP-':'리그 평균=100 기준 FIP 지수. 낮을수록 좋음',
      ERA:'평균자책점(실점=자책 단순화). 낮을수록 좋음',
      WHIP:'이닝당 출루허용(피안타+볼넷). 낮을수록 좋음',
      HRpct:'타자=홈런/타석%, 투수=피홈런/상대타자%',
      GIDP:'땅볼 병살타 — 한 인플레이 땅볼로 2아웃 발생(포스아웃 1개 이상 포함). 타자는 낮을수록/투수(GIDPinduced)는 높을수록 좋음. 신규 CSV 아웃코드 기반이라 구 데이터는 0',
      fieldersChoice:'야수선택 — 선행주자가 포스아웃되어 타자가 1루에 산 경우. 안타로 집계하지 않음(MLB 규칙 10.05(b)(1)). 타수(AB)에는 포함',
      ra9:'9이닝당 실점 — 실점/이닝×9. pWAR 산출 기반 지표. WBD는 자책 구분이 없어 ERA와 값이 같으나, 이닝이 다른 투수 비교 시 명확한 기준. 낮을수록 좋음',
      eraPlus:'ERA+ — 리그 평균 RA9 / 본인 ERA × 100. 100=리그 평균, 높을수록 좋음(150 = 평균보다 50% 우수). FIP-와 방향이 반대이므로 주의',
      pythWinPct:'피타고리안 기대승률 — 득점^1.83/(득점^1.83+실점^1.83). 실제 승률과 크게 다르면 운·클러치 영향이 컸다는 뜻(높으면 저평가, 낮으면 초과달성)',
      assignRadius:'내야 통과 타구 귀속 반경 — 타구 방향각 직선에서 이 거리 안에 있던 내야수에게 "닿을 수 있었던 기회"로 귀속. 타구 속도(EV)별 차등: 125+ 4m / 110~125 6m / 95~110 8m / 95 미만 11m. 강한 타구일수록 도달시간이 짧아 반응 여유가 없기 때문(실측: 같은 3m 거리에서 EV<95는 2.41초, EV125+는 1.62초)',
      infieldPassRate:'내야 통과율 — 땅볼 중 내야를 뚫고 외야로 나간 비율. 추정 없이 직접 집계되며(포구자가 외야수면 통과) 낮을수록 내야 수비 범위가 넓음. OAA와 달리 모델 가정이 없어 신뢰도가 높음',
      oaa:'OAA(Outs Above Average) = 실제 아웃(1/0) − 기대 아웃률(xOut)의 합. xOut은 리그 실측에서 산출 — 내야는 이동거리×발사각 2D 그리드(포지션별), 외야는 포지션×방향(전진/후퇴/측면)×발사각별 이동거리 커브. 난이도는 xOut에 이미 반영되므로 별도 가중치 없음 — 전 화면 동일 계산',
      oaaCalibration:'OAA는 내야/외야 구역별로 각각 zero-sum 보정됨 — 각 구역 합계가 0. 내야(아웃률 85~95%)와 외야(27~40%)는 난이도 분포가 달라 전체 일괄 보정 시 내야가 구조적으로 불리해지므로 분리 처리',
      vsLeague:'리그 대비 — 같은 포지션(또는 구역) 리그 평균 아웃률과의 차이(%p). +면 평균보다 잘 잡음',
      oaaPer10:'10기회당 OAA — 기회 수가 다른 선수끼리 비교할 때 사용',
      leaguePctile:'동일 포지션 내 백분위(0~1) — 1에 가까울수록 그 포지션 최상위',
      zContactPct:'존내 컨택% — 스트라이크존 안 스윙 중 배트에 맞힌 비율. 리그 73.0%. 삼진과 별개로 "칠 수 있는 공을 실제로 맞히는 능력". 높을수록 좋음',
      chasePct:'체이스% — 존 밖 투구에 스윙한 비율. 리그 54.4%. 낮을수록 선구안 좋음',
      zSwingPct:'존내 스윙% — 스트라이크존 안 투구에 스윙한 비율. 리그 61.4%. 적극성 지표(유형에 따라 갈려 보조 비중만 사용)',
      middlePct:'실투율 — 존 중앙 깊숙이(중심에서 0.4 이내) 들어간 투구 비율. 투수는 낮을수록 좋음',
      borderPct:'보더라인% — 존 경계(0.85~1.15)에 던진 비율. 스트라이크·볼이 갈리는 지점으로, 높을수록 제구가 정밀함',
      teamGrade:'팀 등급 — 타격45% + 투수45% + 수비10%. 타격=컨택35/파워40/선구25, 투수=구위35/제구25/결과40. 각 영역은 리그 백분위 기반이며 S+~D로 표기',
      clutch:'클러치 — 득점권(2·3루 주자) OPS를 리그 평균과 비교. 타자는 높을수록/투수는 낮을수록 좋음. 표본 변동이 커서 종합 등급에는 미반영(참고 지표)',
      'HH+':'하드힛 플러스 = EV 125km/h 이상 인플레이 타구 비율. WBD 실측: BA .485→.650 점프 지점. 기존 HH(110+)보다 상위 강타 변별. 타자=높을수록/투수=낮을수록 좋음',
      'barrel+':'배럴 플러스 = EV 125+ & 발사각 20~40° 인플레이 타구 비율. WBD 실측 BA .918, 리그 홈런 96%가 이 존에서 발생. 홈런 직결 최상급 컨택. 타자=높을수록/투수=낮을수록 좋음',
      battedBallQuality:'타구 품질 6분류(WBD 실측 보정): barrelPlus(EV125+&LA20~40°, BA.918) / solid(BA.620) / flare(플레어·버너, BA.547) / topped(LA<0 땅볼, BA.248) / under(밑긁음 팝업, BA.225) / weak(빗맞음, BA.298). Statcast 스타일',
      seasonPV:'구종 가치 합 — 투구 결과 기반 누적 득점기여(투수 관점). 높을수록 좋음',
      seasonXPV:'기대 구종 가치 — 타구질 기반 기대값',
      OAA:'수비 아웃 기여(Outs Above Average). 양수면 평균 이상 수비',
      splits:'선수별 상황 분할: byHand(vsL/vsR 상대 좌우투/좌우타), byPitchGroup(구종그룹별 성적+구사율+평균구속), byCount(ahead=유리/behind=불리/even 카운트), zone9(3x3 존 격자, 0:좌상~8:우하). null이면 표본 부족(<10구)'
    },
    userData:lsData
  };
};

// Original index.html:33790
wbdContext.exportAnalyticsBundleDownload = function exportAnalyticsBundleDownload(opts){
  opts=opts||{};
  const data=wbdContext.exportAnalyticsBundle(opts);
  const json=JSON.stringify(data,null,2);
  const sizeMB=(new Blob([json]).size/1048576).toFixed(2);
  if(parseFloat(sizeMB)>20){
    if(!confirm(`분석 패키지 크기 ${sizeMB}MB. 진행할까요?`))return;
  }
  const tag=opts.includeRawPitches?'full':'lite';
  wbdContext._downloadFile(json,`wbd_analytics_${tag}_${new Date().toISOString().slice(0,10)}.json`,'application/json');
};

// Original index.html:33803
wbdContext.exportPitchesCSV = function exportPitchesCSV(){
  if(!wbdContext.G.length){alert('데이터가 없습니다.');return;}
  // 모든 키 수집 (희귀 키 포함)
  const allKeys=new Set();
  wbdContext.G.forEach(d=>Object.keys(d).forEach(k=>allKeys.add(k)));
  const headers=[...allKeys];
  const rows=wbdContext.G.map(d=>headers.map(h=>{
    const v=d[h];
    if(v==null)return '';
    if(typeof v==='string')return `"${v.replace(/"/g,'""')}"`;
    if(typeof v==='boolean')return v?'1':'';
    return v;
  }).join(','));
  const csv='\ufeff'+[headers.join(','),...rows].join('\n');
  wbdContext._downloadFile(csv,`wbd_pitches_${new Date().toISOString().slice(0,10)}.csv`,'text/csv');
};

// Original index.html:33821
wbdContext.exportGameLogsCSV = function exportGameLogsCSV(type){
  const isP=type==='pitcher';
  const rows=[];
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const stats=isP?(wbdContext._getCachedPitcherStats(g.id)||{}):(wbdContext._getCachedBatterStats(g.id)||{});
    Object.entries(stats).forEach(([name,s])=>{
      const row={
        gameId:g.id,
        gameName:g.name,
        date:g.info?.date||'',
        teamA:g.info?.teamA||'',
        teamB:g.info?.teamB||'',
        playerName:name,
        team:wbdContext._playerTeam(name,type)||''
      };
      Object.entries(s).forEach(([k,v])=>{
        if(typeof v==='object')return;  // batters Set 등 제외
        row[k]=v;
      });
      // 파생 지표 추가
      if(isP){
        const ip=s.outs/3;
        row.IP=+ip.toFixed(1);
        row.ERA=ip>0?+(s.runs*9/ip).toFixed(2):0;
        row.WHIP=ip>0?+((s.hits+s.bbs)/ip).toFixed(2):0;
      } else {
        row.BA=s.ab>0?+(s.hits/s.ab).toFixed(3):0;
        row.SLG=s.ab>0?+((s.hits+s.hrs*3)/s.ab).toFixed(3):0;
      }
      rows.push(row);
    });
  });
  if(!rows.length){alert('데이터가 없습니다.');return;}
  const headers=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const csvRows=rows.map(r=>headers.map(h=>{
    const v=r[h];
    if(v==null)return '';
    if(typeof v==='string')return `"${v.replace(/"/g,'""')}"`;
    return v;
  }).join(','));
  const csv='\ufeff'+[headers.join(','),...csvRows].join('\n');
  wbdContext._downloadFile(csv,`wbd_${type}_gamelog_${new Date().toISOString().slice(0,10)}.csv`,'text/csv');
};

// Original index.html:33867
wbdContext.exportFullBackup = function exportFullBackup(){
  const pNames=(window._cache.pitcherNames||[]).slice();
  const bNames=(window._cache.batterNames||[]).slice();
  
  // 모든 LocalStorage 데이터
  const lsData={};
  const lsKeys=['wbd_team_aliases','wbd_my_teams','wbd_manual_teams','wbd_player_groups','wbd_favorites','wbd_memos','wbd_card_overrides','presets','theme','wbd_user_prefs'];
  lsKeys.forEach(k=>{
    try{
      const v=localStorage.getItem(k);
      if(v!==null)lsData[k]=v;
    }catch(e){}
  });
  
  // 풀 분석 데이터
  const data={
    generatedAt:new Date().toISOString(),
    appVersion:'V11.4',
    schemaVersion:2,
    
    // 메타 정보
    meta:{
      totalGames:wbdContext.GAMES.length,
      activeGameCount:wbdContext.activeGameIds.size,
      totalPitches:wbdContext.G.length,
      totalPitchers:pNames.length,
      totalBatters:bNames.length,
      pitchTypes:[...new Set(wbdContext.G.map(d=>d.pType).filter(Boolean))]
    },
    
    // 게임 정보 (활성 + 비활성 모두, raw 데이터 포함)
    games:wbdContext.GAMES.map(g=>({
      id:g.id,
      name:g.name,
      active:wbdContext.activeGameIds.has(g.id),
      pitchCount:g.pitches.length,
      info:g.info||null,
      // raw 투구 데이터까지 (용량 ↑)
      pitches:g.pitches
    })),
    
    // 모든 투수 (풀 카드 정보)
    pitchers:pNames.map(n=>{
      const c=wbdContext.calcPitcherCard(n);
      if(!c)return null;
      const season=(typeof wbdContext._getPitcherSeason==='function')?wbdContext._getPitcherSeason(n):null;
      return {
        name:n,
        team:wbdContext._playerTeam(n,'pitcher'),
        OVR:c.OVR,
        stats:c.stats,
        detail:c.detail,
        lowData:c.lowData||false,
        badges:wbdContext.computeBadges(c).map(b=>({icon:b.icon,name:b.name,desc:b.desc})),
        styles:wbdContext.classifyStyle(c).map(s=>({label:s.label,desc:s.desc})),
        strength:(typeof wbdContext.generateStrengthReport==='function')?wbdContext.generateStrengthReport(c).map(x=>x.text):[],
        weakness:(typeof wbdContext.generateWeaknessReport==='function')?wbdContext.generateWeaknessReport(c).map(x=>x.text):[],
        season:season?{
          IP:(season.outs/3).toFixed(1),
          ERA:season.outs>0?(season.runs*27/season.outs).toFixed(2):null,
          K:season.k,
          BB:season.bb,
          H:season.h,
          HR:season.hr,
          runs:season.runs
        }:null
      };
    }).filter(Boolean).sort((a,b)=>b.OVR-a.OVR),
    
    // 모든 타자 (풀 카드 정보)
    batters:bNames.map(n=>{
      const c=wbdContext.calcBatterCard(n);
      if(!c)return null;
      return {
        name:n,
        team:wbdContext._playerTeam(n,'batter'),
        OVR:c.OVR,
        stats:c.stats,
        detail:c.detail,
        lowData:c.lowData||false,
        badges:wbdContext.computeBadges(c).map(b=>({icon:b.icon,name:b.name,desc:b.desc})),
        styles:wbdContext.classifyStyle(c).map(s=>({label:s.label,desc:s.desc})),
        strength:(typeof wbdContext.generateStrengthReport==='function')?wbdContext.generateStrengthReport(c).map(x=>x.text):[],
        weakness:(typeof wbdContext.generateWeaknessReport==='function')?wbdContext.generateWeaknessReport(c).map(x=>x.text):[],
        extras:c.extras||null  // PA, AB, BB, HR, OBP, SLG 등
      };
    }).filter(Boolean).sort((a,b)=>b.OVR-a.OVR),
    
    // 사용자 데이터 (LocalStorage 전체)
    userData:lsData
  };
  
  const json=JSON.stringify(data,null,2);
  const sizeKB=Math.round(new Blob([json]).size/1024);
  if(sizeKB>15000){
    if(!confirm(`백업 파일 크기 ${(sizeKB/1024).toFixed(1)}MB. 큰 편이지만 진행할까요?`))return;
  }
  wbdContext._downloadFile(json,`wbd_full_backup_${new Date().toISOString().slice(0,10)}.json`,'application/json');
};

// Original index.html:33968
wbdContext.importFullBackup = function importFullBackup(){
  const inp=document.createElement('input');
  inp.type='file';
  inp.accept='.json';
  inp.onchange=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=JSON.parse(ev.target.result);
        if(!data.userData){
          alert('올바른 WBD 백업 파일이 아닙니다.');
          return;
        }
        const msg='⚠️ 다음 데이터를 복원합니다:\n\n'+
          `· 내 팀: ${data.userData.wbd_my_teams?'있음':'없음'}\n`+
          `· 수동 팀/그룹: ${data.userData.wbd_manual_teams||data.userData.wbd_player_groups?'있음':'없음'}\n`+
          `· 팀명 병합: ${data.userData.wbd_team_aliases?'있음':'없음'}\n`+
          `· 즐겨찾기/메모: ${data.userData.wbd_favorites||data.userData.wbd_memos?'있음':'없음'}\n`+
          `· 프리셋: ${data.userData.presets?'있음':'없음'}\n\n`+
          '⚠️ 현재 LocalStorage 데이터는 덮어쓰기 됩니다.\n계속할까요?';
        if(!confirm(msg))return;
        // 복원
        Object.entries(data.userData).forEach(([k,v])=>{
          try{localStorage.setItem(k,v);}catch(_){}
        });
        alert('✅ 복원 완료! 페이지를 새로고침합니다.');
        location.reload();
      }catch(err){
        alert('파일 읽기 실패: '+err.message);
      }
    };
    reader.readAsText(file);
  };
  inp.click();
};

// Original index.html:34007
wbdContext.exportPlayersCSV = function exportPlayersCSV(type){
  const isPitcher=type==='pitcher';
  const names=[...new Set(wbdContext.G.filter(d=>isPitcher?d.pName:d.bName).map(d=>isPitcher?d.pName:d.bName))];
  const cards=names.map(n=>isPitcher?wbdContext.calcPitcherCard(n):wbdContext.calcBatterCard(n)).filter(Boolean);
  if(!cards.length){alert('데이터가 없습니다.');return;}
  // 헤더: 이름, 팀, OVR, 각 능력치, 데이터 부족
  const statKeys=Object.keys(cards[0].stats);
  const header=['이름','팀','OVR',...statKeys,'데이터부족','뱃지'];
  const rows=cards.sort((a,b)=>b.OVR-a.OVR).map(c=>{
    const team=wbdContext._playerTeam(c.name,type);
    const badges=wbdContext.computeBadges(c).map(b=>b.name).join('|');
    return [
      `"${c.name}"`,`"${team||''}"`,c.OVR,
      ...statKeys.map(k=>c.stats[k]||0),
      c.lowData?'Y':'',
      `"${badges}"`
    ].join(',');
  });
  const csv='\ufeff'+[header.join(','),...rows].join('\n');  // UTF-8 BOM (Excel)
  wbdContext._downloadFile(csv,`wbd_${type}_cards_${new Date().toISOString().slice(0,10)}.csv`,'text/csv');
};

// Original index.html:34029
wbdContext.exportPlayerCardJSON = function exportPlayerCardJSON(name,type){
  const c=type==='pitcher'?wbdContext.calcPitcherCard(name):wbdContext.calcBatterCard(name);
  if(!c)return;
  const data={
    name,type,team:wbdContext._playerTeam(name,type),
    OVR:c.OVR,stats:c.stats,
    badges:wbdContext.computeBadges(c).map(b=>({icon:b.icon,name:b.name,desc:b.desc})),
    styles:wbdContext.classifyStyle(c).map(s=>({label:s.label,desc:s.desc})),
    weakness:wbdContext.generateWeaknessReport(c).map(w=>w.text),
    strength:wbdContext.generateStrengthReport(c).map(s=>s.text),
    similar:wbdContext.findSimilarPlayers(c,3).map(s=>({name:s.name,OVR:s.card.OVR,similarity:Math.round(s.cosSim*100)})),
    generatedAt:new Date().toISOString()
  };
  wbdContext._downloadFile(JSON.stringify(data,null,2),`${name}_${type}_card.json`,'application/json');
};

// Original index.html:34047
wbdContext.getShareableState = function getShareableState(){
  const state={
    page:document.querySelector('.page.active')?.id?.replace('page-','')||'home',
    activeGameIds:[...wbdContext.activeGameIds].slice(0,100), // 안전 상한
    teamAliases:window.teamAliases||{},
    theme:wbdContext.LS.get('theme','dark')
  };
  // 선택된 선수도 추가
  if(state.page==='pitcher'&&typeof wbdContext.currentPitcher!=='undefined')state.pitcher=wbdContext.currentPitcher;
  if(state.page==='batter'&&typeof wbdContext.currentBatter!=='undefined')state.batter=wbdContext.currentBatter;
  return state;
};

// Original index.html:34059
wbdContext.encodeState = function encodeState(state){
  try{
    const str=JSON.stringify(state);
    // Base64 인코딩 (UTF-8 안전)
    return btoa(unescape(encodeURIComponent(str)));
  }catch(e){return '';}
};

// Original index.html:34066
wbdContext.decodeState = function decodeState(encoded){
  try{
    const str=decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(str);
  }catch(e){return null;}
};

// Original index.html:34072
wbdContext.generateShareURL = function generateShareURL(){
  const state=wbdContext.getShareableState();
  const enc=wbdContext.encodeState(state);
  return location.origin+location.pathname+'#s='+enc;
};

// Original index.html:34077
wbdContext.copyShareURL = function copyShareURL(){
  const url=wbdContext.generateShareURL();
  navigator.clipboard?.writeText(url).then(()=>{
    alert('🔗 공유 URL이 클립보드에 복사됐어요!\n\n상대방이 같은 상태(활성 경기, 테마, 선택된 선수 등)로 열 수 있어요.\n※ 경기 데이터 자체는 공유되지 않으니 상대방도 파일을 업로드해야 해요.');
  }).catch(()=>{
    // fallback: prompt
    prompt('아래 URL을 복사하세요:',url);
  });
};

// Original index.html:34088
wbdContext.applyShareURL = function applyShareURL(){
  const hash=location.hash;
  if(!hash.startsWith('#s='))return false;
  const enc=hash.slice(3);
  const state=wbdContext.decodeState(enc);
  if(!state)return false;
  // 활성 경기 적용 (ID가 현재 파일과 일치하는 것만)
  if(state.activeGameIds){
    wbdContext.activeGameIds=new Set(state.activeGameIds.filter(id=>wbdContext.GAMES.some(g=>g.id===id)));
  }
  if(state.teamAliases){
    window.teamAliases=state.teamAliases;
    if(typeof wbdContext._saveTeamAliases==='function')wbdContext._saveTeamAliases();
  }
  if(state.theme)wbdContext.applyTheme(state.theme);
  wbdContext.rebuildG();
  wbdContext.updateNavInfo();
  wbdContext.renderGamesList();
  wbdContext.populateSelects();
  // 페이지 이동
  if(state.page){
    if(state.pitcher&&state.page==='pitcher'){
      wbdContext.currentPitcher=state.pitcher;
      const sel=document.getElementById('pitcher-sel');
      if(sel)sel.value=state.pitcher;
    }
    if(state.batter&&state.page==='batter'){
      wbdContext.currentBatter=state.batter;
      const sel=document.getElementById('batter-sel');
      if(sel)sel.value=state.batter;
    }
    wbdContext.showPage(state.page);
  }
  // URL 해시 제거 (새로고침 시 재적용 방지)
  history.replaceState(null,'',location.pathname);
  return true;
};

// Original index.html:34127
wbdContext.openExportModal = function openExportModal(){
  const html=`<div style="margin-bottom:14px">
    <div style="font-size:18px;font-weight:700;margin-bottom:4px">📤 데이터 내보내기 / 가져오기</div>
    <div style="font-size:12px;color:var(--muted)">분석 결과 저장, 백업, 다른 기기로 옮기기</div>
  </div>
  
  <div style="font-size:11px;font-weight:700;color:var(--amber);margin-bottom:8px;letter-spacing:0.5px">📦 풀 백업 / 복원</div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    <button class="btn-secondary" onclick="exportFullBackup();closeModal()" style="text-align:left;padding:14px;font-size:12px;border-left:3px solid var(--amber)">
      <div style="font-weight:700;color:var(--amber);margin-bottom:2px">💾 모든 데이터 백업 (풀 JSON)</div>
      <div style="font-size:10px;color:var(--muted)">경기 raw 데이터 + 선수 카드 + 내 팀/수동팀/그룹/즐겨찾기/메모/프리셋/팀병합 전부. 다른 기기로 옮기거나 백업용</div>
    </button>
    <button class="btn-secondary" onclick="closeModal();importFullBackup()" style="text-align:left;padding:14px;font-size:12px;border-left:3px solid #2196f3">
      <div style="font-weight:700;color:#2196f3;margin-bottom:2px">📥 백업 파일 복원</div>
      <div style="font-size:10px;color:var(--muted)">위에서 만든 백업 JSON으로 모든 사용자 데이터 복원 (현재 데이터 덮어쓰기)</div>
    </button>
  </div>
  
  <div style="font-size:11px;font-weight:700;color:#cc44ff;margin-bottom:8px;letter-spacing:0.5px">📊 분석 데이터 풀 패키지 (외부 분석용)</div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    <button class="btn-secondary" onclick="exportAnalyticsBundleDownload({includeRawPitches:true});closeModal()" style="text-align:left;padding:14px;font-size:12px;border-left:3px solid #cc44ff">
      <div style="font-weight:700;color:#cc44ff;margin-bottom:2px">📦 분석 풀 패키지 JSON (raw 포함)</div>
      <div style="font-size:10px;color:var(--muted)">메타 + 게임별 통계 + 모든 raw 투구 + 카드 + 시즌누적 + 팀 분석. 외부 도구·노트북 분석용 (수MB)</div>
    </button>
    <button class="btn-secondary" onclick="exportAnalyticsBundleDownload({includeRawPitches:false});closeModal()" style="text-align:left;padding:14px;font-size:12px;border-left:3px solid #cc44ff">
      <div style="font-weight:700;color:#cc44ff;margin-bottom:2px">📦 분석 패키지 JSON (집계만, raw 제외)</div>
      <div style="font-size:10px;color:var(--muted)">raw 투구 빼고 집계 데이터만. 시즌통계·OPS/ERA·뱃지·팀분석 등 (수백KB)</div>
    </button>
    <button class="btn-secondary" onclick="exportPitchesCSV();closeModal()" style="text-align:left;padding:14px;font-size:12px;border-left:3px solid #cc44ff">
      <div style="font-weight:700;color:#cc44ff;margin-bottom:2px">🎯 모든 투구 raw CSV (한 행 = 한 투구)</div>
      <div style="font-size:10px;color:var(--muted)">12,000+ 투구 모두 CSV로. pType, spdK, zoneX/Y, ev, ldeg 등 모든 필드. R·Python·Excel 분석</div>
    </button>
    <button class="btn-secondary" onclick="exportGameLogsCSV('pitcher');closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#ff8c44;margin-bottom:2px">⚾ 투수 게임로그 CSV</div>
      <div style="font-size:10px;color:var(--muted)">한 행 = 한 경기·한 투수. IP, ERA, WHIP, K/BB 모두 포함 (피벗테이블·트렌드 분석)</div>
    </button>
    <button class="btn-secondary" onclick="exportGameLogsCSV('batter');closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#39ff8a;margin-bottom:2px">🏏 타자 게임로그 CSV</div>
      <div style="font-size:10px;color:var(--muted)">한 행 = 한 경기·한 타자. AB, H, HR, BA, SLG 모두 포함</div>
    </button>
  </div>
  
  <div style="font-size:11px;font-weight:700;color:#39ff8a;margin-bottom:8px;letter-spacing:0.5px">📊 카드 결과만 (간략)</div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    <button class="btn-secondary" onclick="exportAllPlayersJSON();closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#39ff8a;margin-bottom:2px">📄 전체 선수 분석 JSON (간략)</div>
      <div style="font-size:10px;color:var(--muted)">모든 선수 카드·스탯·뱃지·스타일 (이전 형식, 작은 용량)</div>
    </button>
    <button class="btn-secondary" onclick="exportPlayersCSV('pitcher');closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#ff8c44;margin-bottom:2px">⚾ 투수 카드 CSV</div>
      <div style="font-size:10px;color:var(--muted)">Excel·구글시트용. 이름, 팀, OVR, 7개 능력치, 뱃지 모두 포함</div>
    </button>
    <button class="btn-secondary" onclick="exportPlayersCSV('batter');closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#39ff8a;margin-bottom:2px">🏏 타자 카드 CSV</div>
      <div style="font-size:10px;color:var(--muted)">Excel·구글시트용. 이름, 팀, OVR, 5개 능력치, 뱃지 모두 포함</div>
    </button>
    <button class="btn-secondary" onclick="exportLeaderboardCSV();closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#cc44ff;margin-bottom:2px">🏅 리더보드 CSV (현재 페이지)</div>
      <div style="font-size:10px;color:var(--muted)">현재 보고 있는 카테고리 기준 (페이지 이동 후 다시 열면 변경됨)</div>
    </button>
  </div>
  
  <div style="font-size:11px;font-weight:700;color:#88ccff;margin-bottom:8px;letter-spacing:0.5px">🔗 공유</div>
  <div style="display:flex;flex-direction:column;gap:8px">
    <button class="btn-secondary" onclick="copyShareURL();closeModal()" style="text-align:left;padding:12px;font-size:12px">
      <div style="font-weight:700;color:#88ccff;margin-bottom:2px">🔗 현재 상태 URL 공유</div>
      <div style="font-size:10px;color:var(--muted)">활성 경기·테마·선택된 선수 링크로 복사 (상대방도 같은 경기 파일 필요)</div>
    </button>
  </div>
  
  <div style="margin-top:14px;padding:10px;background:var(--card2);border-radius:4px;font-size:10px;color:var(--muted);line-height:1.5">
    💡 <strong>풀 백업 vs 분석 JSON</strong><br>
    · <span style="color:var(--amber)">풀 백업</span>: 모든 raw 데이터 + 사용자 설정 → 다른 기기 이동·완전 백업용 (1~10MB+)<br>
    · <span style="color:#39ff8a">분석 JSON</span>: 카드 결과만 → 외부 분석·가벼운 공유 (수십~수백KB)<br>
    · <span style="color:#cc44ff">CSV</span>: Excel·구글시트로 표 작업
  </div>`;
  wbdContext.openModal(html);
};
}

export function initialize(wbdContext) {

}
