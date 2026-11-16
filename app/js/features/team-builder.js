/** team-builder: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:30302
wbdContext.renderMyTeamPage = function renderMyTeamPage(){
  const out=document.getElementById('myteam-content');
  if(!out)return;
  const teams=window.MY_TEAMS.teams||[];
  const activeId=window.MY_TEAMS.active;
  const team=teams.find(t=>t.id===activeId)||teams[0];
  
  let html=`<div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap;align-items:center">
    <span class="filter-label">내 팀</span>
    <select id="myteam-select" onchange="_selectMyTeam(this.value)" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:4px;font-size:12px">
      ${teams.length?teams.map(t=>`<option value="${t.id}"${team&&t.id===team.id?' selected':''}>${t.name||'(이름 없음)'}</option>`).join(''):'<option value="">(없음)</option>'}
    </select>
    <button onclick="_createMyTeam()" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:6px 12px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer">+ 새 팀</button>
    <button onclick="_importTeamFromExisting()" style="background:linear-gradient(90deg,#cc44ff,#ff6b8a);color:#fff;border:none;padding:6px 12px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer">📥 팀/그룹 불러오기</button>
    ${team?`<button onclick="_renameMyTeam('${team.id}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer">✏️ 팀 정보 수정</button>
    <button onclick="_clearLineup('${team.id}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer">🧹 비우기</button>
    <button onclick="_deleteMyTeam('${team.id}')" style="background:transparent;border:1px solid var(--red);color:var(--red);padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer">🗑 삭제</button>`:''}
    ${teams.length>=2?`<button onclick="_simulateMatch()" style="margin-left:auto;background:linear-gradient(90deg,#f5a623,#ff6b8a);color:#000;border:none;padding:8px 18px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">⚔️ 팀 대결 시뮬</button>`:''}
  </div>`;
  
  if(!team){
    html+=`<div style="padding:60px;text-align:center;color:var(--muted);background:var(--card);border-radius:8px">
      <div style="font-size:48px;margin-bottom:14px">⚔️</div>
      <div style="font-size:14px;margin-bottom:14px">아직 팀이 없어요. 새 팀을 만들거나 기존 팀/그룹에서 불러오세요!</div>
      <button onclick="_createMyTeam()" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px">+ 새 팀 만들기</button>
      <button onclick="_importTeamFromExisting()" style="background:linear-gradient(90deg,#cc44ff,#ff6b8a);color:#fff;border:none;padding:10px 20px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer">📥 팀/그룹 불러오기</button>
    </div>`;
    out.innerHTML=html;
    return;
  }
  
  // 팀 통계
  html+=wbdContext._renderMyTeamStats(team);
  
  // 메인 영역: 다이아몬드 + 타순 + 대기/불펜
  html+=`<div class="card section" style="margin-top:14px;background:linear-gradient(135deg,var(--card),var(--card2))">
    <div class="card-title" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span style="display:inline-flex;align-items:center;gap:8px"><span style="font-size:22px">${team.icon||'📋'}</span><span style="color:${team.color||'var(--text)'}">${team.name}</span><span style="color:var(--muted);font-weight:400">— 라인업</span></span>
      ${window.cardEditMode?'<span style="font-size:11px;color:var(--amber);font-weight:600;background:rgba(245,166,35,0.1);padding:3px 8px;border-radius:3px;border:1px solid rgba(245,166,35,0.3)">✋ 라인업 ↔ 대기 드래그&드랍으로 선수 교체</span>':''}
      <button id="myteam-edit-toggle" onclick="toggleCardEditMode()" title="편집 모드 (✕ 제거 + 드래그 이동)" style="margin-left:auto;background:var(--card2);border:1px solid var(--border);color:${window.cardEditMode?'var(--amber)':'var(--muted)'};padding:5px 10px;border-radius:4px;font-size:11px;cursor:pointer;${window.cardEditMode?'border-color:var(--amber);background:rgba(245,166,35,0.1)':''}">${window.cardEditMode?'✏️ 편집 ON':'✏️ 편집 OFF'}</button>
    </div>
    <div style="display:grid;grid-template-columns:minmax(420px,2.4fr) minmax(220px,1fr) minmax(200px,1fr);gap:14px">
      <!-- 다이아몬드 라인업 -->
      <div>
        <div style="background:radial-gradient(ellipse at center 50%,#1a3a2a 0%,#0a1828 60%,#050d18 100%);border:1px solid var(--border);border-radius:10px;padding:60px 60px 80px 60px;position:relative;aspect-ratio:1/1.05;overflow:visible;min-height:680px">
          <!-- 다이아몬드 라인 (베이스 위치) -->
          <svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.5">
            <!-- 외야 펜스 (큰 호) -->
            <path d="M 8 50 Q 50 -8 92 50" fill="none" stroke="#5a8a5a" stroke-width="0.4" stroke-dasharray="2 1.5" opacity="0.5"/>
            <!-- 다이아몬드: 2B(위) - 1B(우) - 홈(아래) - 3B(좌) -->
            <path d="M 50 33 L 73 56 L 50 79 L 27 56 Z" fill="rgba(120,180,120,0.05)" stroke="#88cc88" stroke-width="0.5" stroke-dasharray="1.8 1"/>
            <!-- 마운드 -->
            <circle cx="50" cy="56" r="4.5" fill="rgba(160,120,90,0.15)" stroke="#a08060" stroke-width="0.4"/>
            <circle cx="50" cy="56" r="0.8" fill="#a08060" opacity="0.6"/>
            <!-- 베이스 마커 -->
            <rect x="48.5" y="31.5" width="3" height="3" fill="#fff" opacity="0.6"/>
            <rect x="71.5" y="54.5" width="3" height="3" fill="#fff" opacity="0.6"/>
            <rect x="25.5" y="54.5" width="3" height="3" fill="#fff" opacity="0.6"/>
            <!-- 홈 (오각형) -->
            <path d="M 47 79 L 53 79 L 53 81.5 L 50 83 L 47 81.5 Z" fill="#fff" opacity="0.6"/>
            <!-- 좌타석/우타석 라인 (홈 옆) -->
            <line x1="44" y1="78" x2="44" y2="83" stroke="#fff" stroke-width="0.2" opacity="0.4"/>
            <line x1="56" y1="78" x2="56" y2="83" stroke="#fff" stroke-width="0.2" opacity="0.4"/>
          </svg>
          ${wbdContext.MY_TEAM_SLOTS.map(pos=>{
            const xy=wbdContext.DIAMOND_POSITIONS[pos];
            return wbdContext._renderDiamondSlot(team,pos,xy);
          }).join('')}
          <div style="position:absolute;bottom:8px;left:10px;font-size:10px;color:var(--muted);font-style:italic">${team.name}</div>
        </div>
      </div>
      
      <!-- 타순 -->
      <div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;text-align:center;background:var(--card2);padding:6px;border-radius:6px;font-weight:700">⚾ 타순${window.cardEditMode?' <span style="color:var(--amber);font-size:10px;font-weight:600">(드래그 교환)</span>':''}</div>
        ${wbdContext._renderBattingOrder(team)}
      </div>
      
      <!-- 대기 / 불펜 (확장 슬롯) -->
      <div>
        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;text-align:center;background:var(--card2);padding:6px;border-radius:6px;font-weight:700">📋 대기 / 불펜</div>
        ${wbdContext._renderBenchSlots(team)}
      </div>
    </div>
  </div>`;
  out.innerHTML=html;
};

// Original index.html:30390
wbdContext._renderDiamondSlot = function _renderDiamondSlot(team,pos,xy){
  const playerName=team.lineup?.[pos];
  const isPitcher=pos==='P';
  const isDH=pos==='DH';
  const slotColor=isPitcher?'#ff8c44':isDH?'#cc44ff':'#39ff8a';
  const safeId=team.id;
  const editOn=window.cardEditMode;
  const safePlayer=playerName?String(playerName).replace(/'/g,"\\'"):'';
  
  let cardContent='';
  let xButton='';
  if(playerName){
    const card=isPitcher?wbdContext.calcPitcherCard(playerName):wbdContext.calcBatterCard(playerName);
    if(card){
      const ovrCol=wbdContext.cardOvrColor(card.OVR);
      const photoUrl=wbdContext.getPhotoUrl(playerName);
      const photoHTML=photoUrl
        ?`<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:100%;height:100%;object-fit:cover" draggable="false">`
        :`<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#0f1828"><circle cx="50" cy="38" r="18" fill="#3a4560"/><path d="M 18,100 Q 18,62 50,60 Q 82,62 82,100 Z" fill="#3a4560"/></svg>`;
      const lowDataMark=card.lowData?'<div title="데이터 부족" style="position:absolute;top:3px;left:3px;background:rgba(10,24,40,0.9);color:#4a7aaa;font-size:10px;padding:2px 5px;border-radius:3px;border:1px solid #2a4060;line-height:1">📊</div>':'';
      cardContent=`<div ${editOn?`draggable="true" ondragstart="_dragSlotStart(event,'${safeId}','${pos}')" ondragover="event.preventDefault()" ondrop="_dragSlotDrop(event,'${safeId}','${pos}')"`:''} style="position:relative;width:100%;background:linear-gradient(180deg,${ovrCol}22,${ovrCol}08);border:2px solid ${ovrCol};border-radius:10px;overflow:hidden;box-shadow:0 0 16px ${ovrCol}66,0 3px 10px rgba(0,0,0,0.7);transition:transform .15s">
        <div style="position:relative;width:100%;aspect-ratio:1/1;overflow:hidden">${photoHTML}${lowDataMark}
          <div style="position:absolute;bottom:3px;right:3px;background:${ovrCol};color:#000;font-family:var(--mono);font-weight:900;font-size:16px;padding:2px 9px;border-radius:10px;border:2px solid var(--card);box-shadow:0 2px 5px rgba(0,0,0,0.7)">${card.OVR}</div>
        </div>
        <div style="padding:5px 6px;background:rgba(0,0,0,0.6);font-size:13px;font-weight:700;color:#fff;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.3px">${playerName}</div>
      </div>`;
      // ✕ 버튼은 wrapper 안에 (카드 외부) - overflow 영향 없음
      if(editOn){
        xButton=`<button onclick="event.stopPropagation();_clearSlot('${safeId}','${pos}')" title="제거" style="position:absolute;top:14px;right:-10px;width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#ff5570,#cc2040);border:2px solid var(--bg);color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;box-shadow:0 3px 10px rgba(204,32,64,0.6),0 0 0 1px rgba(255,255,255,0.1);z-index:10;transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform='scale(1.15) rotate(90deg)';this.style.boxShadow='0 4px 14px rgba(204,32,64,0.8),0 0 0 2px rgba(255,255,255,0.15)'" onmouseout="this.style.transform='';this.style.boxShadow='0 3px 10px rgba(204,32,64,0.6),0 0 0 1px rgba(255,255,255,0.1)'">✕</button>`;
      }
    }
  } else {
    // DH 슬롯이 비어있고 P가 있을 때 → P의 batter 카드를 placeholder로 표시
    if(isDH && team.lineup?.P){
      const pName=team.lineup.P;
      const pBatCard=wbdContext.calcBatterCard(pName);
      if(pBatCard){
        const ovrCol=wbdContext.cardOvrColor(pBatCard.OVR);
        const photoUrl=wbdContext.getPhotoUrl(pName);
        const photoHTML=photoUrl
          ?`<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;opacity:0.55" draggable="false">`
          :`<svg viewBox="0 0 100 100" style="width:100%;height:100%;background:#0f1828;opacity:0.55"><circle cx="50" cy="38" r="18" fill="#3a4560"/><path d="M 18,100 Q 18,62 50,60 Q 82,62 82,100 Z" fill="#3a4560"/></svg>`;
        cardContent=`<div ${editOn?`ondragover="event.preventDefault()" ondrop="_dragSlotDrop(event,'${safeId}','${pos}')"`:''} title="투수가 자동으로 타석에 섭니다 (DH 미사용)" style="position:relative;width:100%;background:linear-gradient(180deg,${ovrCol}15,${ovrCol}05);border:2px dashed ${ovrCol}88;border-radius:10px;overflow:hidden;box-shadow:0 0 8px ${ovrCol}33;transition:transform .15s">
          <div style="position:relative;width:100%;aspect-ratio:1/1;overflow:hidden">${photoHTML}
            <div style="position:absolute;top:3px;left:3px;background:rgba(255,140,68,0.9);color:#000;font-size:9px;font-weight:900;padding:2px 6px;border-radius:3px;letter-spacing:0.5px">P 타석</div>
            <div style="position:absolute;bottom:3px;right:3px;background:${ovrCol}cc;color:#000;font-family:var(--mono);font-weight:900;font-size:14px;padding:2px 8px;border-radius:9px;border:2px solid var(--card);box-shadow:0 2px 5px rgba(0,0,0,0.7)">${pBatCard.OVR}</div>
          </div>
          <div style="padding:4px 6px;background:rgba(0,0,0,0.6);font-size:11px;font-weight:600;color:#ddd;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:0.3px">${pName}</div>
        </div>`;
      }
    }
    if(!cardContent){
      cardContent=`<div ${editOn?`ondragover="event.preventDefault()" ondrop="_dragSlotDrop(event,'${safeId}','${pos}')"`:''} style="width:100%;aspect-ratio:1/1.2;border:2px dashed ${slotColor};border-radius:10px;background:rgba(0,0,0,0.5);display:flex;flex-direction:column;align-items:center;justify-content:center;color:${slotColor};transition:all .15s">
        <div style="font-size:36px;line-height:1;font-weight:300">+</div>
        <div style="font-size:11px;font-weight:700;margin-top:6px">${isDH?'DH 지정':'선수 추가'}</div>
      </div>`;
    }
  }
  let clickHandler='';
  if(editOn){
    clickHandler=`_pickPlayer('${safeId}','${pos}','${isPitcher?'pitcher':'batter'}')`;
  } else if(playerName){
    clickHandler=`openCardDetail('${safePlayer}','${isPitcher?'pitcher':'batter'}')`;
  } else {
    clickHandler=`_pickPlayer('${safeId}','${pos}','${isPitcher?'pitcher':'batter'}')`;
  }
  return `<div onclick="${clickHandler}" style="position:absolute;left:${xy.x}%;top:${xy.y}%;transform:translate(-50%,-50%);width:92px;cursor:${editOn?'grab':'pointer'};z-index:1" onmouseover="this.style.zIndex=10;this.querySelector('.slot-card')&&(this.querySelector('.slot-card').style.transform='scale(1.05)')" onmouseout="this.style.zIndex=1;this.querySelector('.slot-card')&&(this.querySelector('.slot-card').style.transform='')">
    <div style="display:inline-block;background:rgba(0,0,0,0.85);border:1px solid ${slotColor};padding:1px 9px;border-radius:3px;font-size:10px;font-weight:700;color:${slotColor};margin-bottom:4px;letter-spacing:0.5px">${pos}</div>
    <div class="slot-card" style="position:relative;transition:transform .15s">${cardContent}${xButton}</div>
  </div>`;
};

// Original index.html:30466
wbdContext._dragSlotStart = function _dragSlotStart(e,teamId,pos){
  window._dragSlot={teamId,kind:'lineup',pos};
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain','lineup:'+pos);}catch(_){}
};

// Original index.html:30471
wbdContext._dragBenchStart = function _dragBenchStart(e,teamId,benchKind,idx){
  window._dragSlot={teamId,kind:'bench',benchKind,idx};
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain','bench:'+benchKind+':'+idx);}catch(_){}
};

// Original index.html:30478
wbdContext._getSlotPlayer = function _getSlotPlayer(team,slot){
  if(slot.kind==='lineup')return team.lineup?.[slot.pos];
  if(slot.kind==='bench'){
    if(Array.isArray(team.bench))return team.bench[slot.idx];
    return team.bench?.[slot.benchKind]?.[slot.idx];
  }
  return null;
};

// Original index.html:30490
wbdContext._slotAcceptType = function _slotAcceptType(slot){
  if(slot.kind==='lineup'){
    if(slot.pos==='P')return 'pitcher';
    return 'batter';  // 모든 야수 슬롯 + DH는 타자만
  }
  if(slot.kind==='bench'){
    return slot.benchKind==='pitchers'?'pitcher':'batter';
  }
  return null;
};

// Original index.html:30501
wbdContext._dragSlotDrop = function _dragSlotDrop(e,teamId,pos){
  e.preventDefault();
  wbdContext._dragHandleDrop(teamId,{teamId,kind:'lineup',pos});
};

// Original index.html:30505
wbdContext._dragBenchDrop = function _dragBenchDrop(e,teamId,benchKind,idx){
  e.preventDefault();
  wbdContext._dragHandleDrop(teamId,{teamId,kind:'bench',benchKind,idx});
};

// Original index.html:30510
wbdContext._dragHandleDrop = function _dragHandleDrop(teamId,dst){
  const src=window._dragSlot;
  if(!src||src.teamId!==teamId){window._dragSlot=null;return;}
  // 같은 슬롯이면 스킵
  if(src.kind===dst.kind && src.pos===dst.pos && src.benchKind===dst.benchKind && src.idx===dst.idx){
    window._dragSlot=null;return;
  }
  const t=window.MY_TEAMS.teams.find(x=>x.id===teamId);
  if(!t){window._dragSlot=null;return;}
  
  const srcPlayer=wbdContext._getSlotPlayer(t,src);
  const dstPlayer=wbdContext._getSlotPlayer(t,dst);
  if(!srcPlayer && !dstPlayer){window._dragSlot=null;return;}
  
  // 타입 호환성 체크
  // 타입 호환성 체크 - 선수의 type은 그 선수가 있던 슬롯의 type (투타겸업 선수 대응)
  const dstAccepts=wbdContext._slotAcceptType(dst);
  const srcAccepts=wbdContext._slotAcceptType(src);
  // src 선수의 효과적 type = src 슬롯 type
  const srcType=srcPlayer?srcAccepts:null;
  // dst 선수의 효과적 type = dst 슬롯 type
  const dstType=dstPlayer?dstAccepts:null;
  
  // src 선수가 dst 슬롯에 갈 수 있는지: srcAccepts === dstAccepts (또는 둘 중 하나 null)
  if(srcPlayer && dstAccepts && srcAccepts!==dstAccepts){
    alert(`이 슬롯은 ${dstAccepts==='pitcher'?'투수':'타자'}만 배치 가능합니다`);
    window._dragSlot=null;return;
  }
  // dst 선수가 src 슬롯으로 돌아갈 수 있는지
  if(dstPlayer && srcAccepts && dstAccepts!==srcAccepts){
    alert(`원래 슬롯은 ${srcAccepts==='pitcher'?'투수':'타자'}만 가능합니다`);
    window._dragSlot=null;return;
  }
  
  // 데이터 적용 - 양쪽 swap
  // bench는 splice 기반이라 순서 주의: 먼저 dst 빈자리 만들고, src 빈자리 만들고, 둘 다 채우기
  // 간단하게: 원본 제거 → 목적지에 src 넣기, 목적지 원본은 src 자리에 swap
  
  // 정확한 swap 구현
  // 1) src/dst 데이터 모두 임시 백업
  const A=srcPlayer, B=dstPlayer;
  
  // 2) 원본 위치들 비우기 (bench는 splice가 인덱스 변경시키니 한꺼번에 처리)
  // helper: set value or remove
  const _writeSlot=(slot,val)=>{
    if(slot.kind==='lineup'){
      if(val)t.lineup[slot.pos]=val;
      else if(t.lineup)delete t.lineup[slot.pos];
    } else if(slot.kind==='bench'){
      if(!t.bench||Array.isArray(t.bench))t.bench={pitchers:[],batters:[]};
      if(!t.bench[slot.benchKind])t.bench[slot.benchKind]=[];
      const arr=t.bench[slot.benchKind];
      if(val){
        // idx 위치에 set (확장)
        while(arr.length<slot.idx)arr.push(null);
        arr[slot.idx]=val;
      } else {
        if(slot.idx<arr.length)arr.splice(slot.idx,1);
      }
    }
  };
  
  // 양쪽이 bench면 splice 영향 있어서 동일 배열의 경우 한번에 처리
  if(src.kind==='bench' && dst.kind==='bench' && src.benchKind===dst.benchKind){
    const arr=t.bench[src.benchKind];
    if(arr){
      // 두 idx 직접 swap
      const tmp=arr[src.idx];
      if(B!==undefined)arr[src.idx]=B;else arr.splice(src.idx,1);
      if(A!==undefined && src.idx!==dst.idx) {
        // 인덱스 보정 (src 제거됐으면)
        if(!B && src.idx<dst.idx){
          arr.splice(dst.idx-1,0,A);
        } else {
          while(arr.length<=dst.idx)arr.push(null);
          arr[dst.idx]=A;
        }
      }
      // null 정리
      t.bench[src.benchKind]=arr.filter(x=>x);
    }
  } else {
    // 다른 카테고리 또는 lineup-bench 간 swap
    _writeSlot(src,B||null);
    _writeSlot(dst,A||null);
    // null 정리 (bench)
    if(t.bench && !Array.isArray(t.bench)){
      ['pitchers','batters'].forEach(k=>{
        if(t.bench[k])t.bench[k]=t.bench[k].filter(x=>x);
      });
    }
  }
  
  delete t.battingOrder;
  wbdContext._saveMyTeams();
  window._dragSlot=null;
  wbdContext.renderMyTeamPage();
};

// Original index.html:30609
wbdContext._renderBattingOrder = function _renderBattingOrder(team){
  // 타순: lineup에서 투수(P) 빼고 → DH가 있으면 P 자리에 DH 들어감, 없으면 P가 9번 (타자카드로 평가)
  const order=team.battingOrder || wbdContext._defaultBattingOrder(team);
  let html='<div id="batting-order-list" style="display:flex;flex-direction:column;gap:5px">';
  for(let i=0;i<9;i++){
    const pos=order[i];
    const playerName=pos?team.lineup?.[pos]:null;
    const isPitcherBat=pos==='P';  // P가 타석에 들어가는 경우
    let card=null;
    if(playerName){
      // P여도 타석은 batter 카드로 평가
      card=wbdContext.calcBatterCard(playerName);
    }
    const ovrCol=card?wbdContext.cardOvrColor(card.OVR):'var(--muted)';
    const safePName=playerName?String(playerName).replace(/'/g,"\\'"):'';
    // 카드 모달은 P일 땐 pitcher (선수 본 모습), 일반 슬롯은 batter
    const modalType=isPitcherBat?'pitcher':'batter';
    const baseStyle=`display:flex;align-items:center;gap:6px;background:var(--card2);padding:5px 8px;border-radius:4px;border-left:3px solid ${ovrCol};transition:background .15s`;
    const editOn=window.cardEditMode;
    const dragAttrs=editOn&&playerName?`draggable="true" ondragstart="_dragOrderStart(event,${i})" ondragover="event.preventDefault();this.style.background='rgba(245,166,35,0.15)'" ondragleave="this.style.background=''" ondrop="this.style.background='';_dragOrderDrop(event,${i})"`:`ondragover="event.preventDefault();this.style.background='rgba(245,166,35,0.15)'" ondragleave="this.style.background=''" ondrop="this.style.background='';_dragOrderDrop(event,${i})"`;
    if(playerName){
      const posLabel=isPitcherBat
        ?`<span style="display:inline-block;background:rgba(255,140,68,0.2);color:#ff8c44;padding:0 5px;border-radius:2px;font-size:9px;font-weight:700;margin-right:4px">P 타석</span>`
        :`${pos} · `;
      html+=`<div onclick="openCardDetail('${safePName}','${modalType}')" ${dragAttrs} style="${baseStyle};cursor:${editOn?'grab':'pointer'}" onmouseover="this.style.background='var(--card)'" onmouseout="this.style.background='var(--card2)'">
        <span style="font-family:var(--mono);font-size:13px;font-weight:900;color:var(--amber);width:18px;text-align:center">${i+1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${playerName}</div>
          <div style="font-size:9px;color:var(--muted)">${posLabel}OVR ${card?card.OVR:'-'}</div>
        </div>
      </div>`;
    } else {
      html+=`<div ${dragAttrs} style="${baseStyle}">
        <span style="font-family:var(--mono);font-size:13px;font-weight:900;color:var(--amber);width:18px;text-align:center">${i+1}</span>
        <div style="flex:1;min-width:0"><div style="font-size:10px;color:var(--muted);font-style:italic">선수 미선택</div></div>
      </div>`;
    }
  }
  html+='</div>';
  return html;
};

// Original index.html:30651
wbdContext._defaultBattingOrder = function _defaultBattingOrder(team){
  // 기본 타순: DH가 있으면 P 빠짐, 없으면 P가 9번
  const lineup=team.lineup||{};
  const hasDH=!!lineup.DH;
  const order=[];
  // 일반적인 야구 타순 (1번 빠른 발, 4번 강타자 등 대신 OVR 순으로 단순화)
  const positionOrder=hasDH?['DH','CF','SS','RF','LF','3B','1B','2B','C']:['CF','SS','RF','LF','3B','1B','2B','C','P'];
  positionOrder.forEach(pos=>order.push(pos));
  return order;
};

// Original index.html:30664
wbdContext._dragOrderStart = function _dragOrderStart(e,idx){
  window._dragOrderIdx=idx;
  e.dataTransfer.effectAllowed='move';
  try{e.dataTransfer.setData('text/plain','order:'+idx);}catch(_){}
  e.stopPropagation();
};

// Original index.html:30670
wbdContext._dragOrderDrop = function _dragOrderDrop(e,dstIdx){
  e.preventDefault();
  e.stopPropagation();
  const srcIdx=window._dragOrderIdx;
  window._dragOrderIdx=null;
  if(srcIdx==null||srcIdx===dstIdx)return;
  const team=window.MY_TEAMS.teams.find(t=>t.id===window.MY_TEAMS.active);
  if(!team)return;
  const order=(team.battingOrder||wbdContext._defaultBattingOrder(team)).slice();
  // swap
  [order[srcIdx],order[dstIdx]]=[order[dstIdx],order[srcIdx]];
  team.battingOrder=order;
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30686
wbdContext._renderBenchSlots = function _renderBenchSlots(team){
  // 마이그레이션: 옛 bench가 배열이면 새 구조로
  if(Array.isArray(team.bench)){
    const old=team.bench;
    team.bench={pitchers:[],batters:[]};
    old.filter(n=>n).forEach(n=>{
      if(window._cache.pitcherNames.includes(n))team.bench.pitchers.push(n);
      else team.bench.batters.push(n);
    });
  }
  if(!team.bench||typeof team.bench!=='object')team.bench={pitchers:[],batters:[]};
  if(!team.bench.pitchers)team.bench.pitchers=[];
  if(!team.bench.batters)team.bench.batters=[];
  
  const renderSlot=(playerName,kind,idx)=>{
    let card=null;
    const type=kind==='pitchers'?'pitcher':'batter';
    if(playerName){
      card=type==='pitcher'?wbdContext.calcPitcherCard(playerName):wbdContext.calcBatterCard(playerName);
    }
    const ovrCol=card?wbdContext.cardOvrColor(card.OVR):'var(--muted)';
    const safePName=playerName?String(playerName).replace(/'/g,"\\'"):'';
    const benchClick=(window.cardEditMode||!playerName)
      ? `_pickBenchPlayer('${team.id}','${kind}',${idx})`
      : `openCardDetail('${safePName}','${type}')`;
    const editOn=window.cardEditMode;
    // 드래그 속성 (편집 ON일 때만)
    const dragAttrs=editOn?(playerName
      ?`draggable="true" ondragstart="_dragBenchStart(event,'${team.id}','${kind}',${idx})" ondragover="event.preventDefault();this.style.background='rgba(245,166,35,0.15)'" ondragleave="this.style.background=''" ondrop="this.style.background='';_dragBenchDrop(event,'${team.id}','${kind}',${idx})"`
      :`ondragover="event.preventDefault();this.style.background='rgba(245,166,35,0.15)'" ondragleave="this.style.background=''" ondrop="this.style.background='';_dragBenchDrop(event,'${team.id}','${kind}',${idx})"`):'';
    return `<div onclick="${benchClick}" ${dragAttrs} style="background:var(--card2);padding:6px 9px;border-radius:5px;border-left:3px solid ${playerName?ovrCol:'var(--border)'};cursor:${editOn&&playerName?'grab':'pointer'};transition:background .15s;min-height:38px" onmouseover="this.style.background='var(--card)'" onmouseout="this.style.background='var(--card2)'">
      ${playerName?`<div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${playerName}</div>
          <div style="font-size:9px;color:var(--muted)">OVR ${card?card.OVR:'-'}${card?.lowData?' 📊':''}</div>
        </div>
        ${editOn?`<button onclick="event.stopPropagation();_clearBench('${team.id}','${kind}',${idx})" title="제거" style="background:linear-gradient(135deg,#ff5570,#cc2040);border:1px solid rgba(255,255,255,0.15);color:#fff;font-size:11px;font-weight:700;cursor:pointer;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;padding:0;line-height:1;box-shadow:0 2px 5px rgba(204,32,64,0.5);transition:transform .12s" onmouseover="this.style.transform='scale(1.1) rotate(90deg)'" onmouseout="this.style.transform=''">✕</button>`:''}
      </div>`:`<div style="font-size:10px;color:var(--muted);font-style:italic;text-align:center;line-height:24px">${editOn?'드래그/클릭하여 추가':'선수 추가'}</div>`}
    </div>`;
  };
  
  let html='<div style="display:flex;flex-direction:column;gap:10px">';
  // 투수 섹션
  html+='<div>';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;font-size:11px;color:#ff8c44;font-weight:700"><span>⚾ 불펜 (투수)</span>';
  if(window.cardEditMode)html+=`<button onclick="_addBenchSlot('${team.id}','pitchers')" title="슬롯 추가" style="background:transparent;border:1px solid #ff8c4477;color:#ff8c44;font-size:14px;cursor:pointer;width:20px;height:20px;border-radius:50%;line-height:1;padding:0;display:flex;align-items:center;justify-content:center">+</button>`;
  html+='</div>';
  const pCount=Math.min(10,Math.max(team.bench.pitchers.length+1,5));  // 최소 5칸, 최대 10칸
  for(let i=0;i<pCount;i++){
    html+=renderSlot(team.bench.pitchers[i],'pitchers',i);
  }
  html+='</div>';
  // 타자 섹션
  html+='<div>';
  html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;font-size:11px;color:#39ff8a;font-weight:700"><span>🏏 대기 (타자)</span>';
  if(window.cardEditMode)html+=`<button onclick="_addBenchSlot('${team.id}','batters')" title="슬롯 추가" style="background:transparent;border:1px solid #39ff8a77;color:#39ff8a;font-size:14px;cursor:pointer;width:20px;height:20px;border-radius:50%;line-height:1;padding:0;display:flex;align-items:center;justify-content:center">+</button>`;
  html+='</div>';
  const bCount=Math.min(10,Math.max(team.bench.batters.length+1,5));
  for(let i=0;i<bCount;i++){
    html+=renderSlot(team.bench.batters[i],'batters',i);
  }
  html+='</div>';
  html+='</div>';
  return html;
};

// Original index.html:30751
wbdContext._addBenchSlot = function _addBenchSlot(teamId,kind){
  const t=window.MY_TEAMS.teams.find(x=>x.id===teamId);
  const cur=(t?.bench?.[kind]||[]).length;
  if(cur>=10){alert('최대 10명까지만 추가 가능합니다');return;}
  wbdContext._pickBenchPlayer(teamId,kind,cur);
};

// Original index.html:30758
wbdContext._renderMyTeamStats = function _renderMyTeamStats(team){
  const lineup=team.lineup||{};
  const players=Object.entries(lineup).filter(([_,n])=>n);
  if(!players.length){
    return `<div class="card stat" style="text-align:center;color:var(--muted);padding:20px">선수를 채워주세요</div>`;
  }
  const pitcherName=lineup.P;
  const dhName=lineup.DH;
  // 타석 서는 타자: DH 있으면 P 대신 DH가 8명에 추가, 없으면 P도 타석
  const fieldBatters=['C','1B','2B','3B','SS','LF','CF','RF'].map(p=>lineup[p]).filter(Boolean);
  const allBatters=dhName?[...fieldBatters,dhName]:[...fieldBatters,pitcherName].filter(Boolean);
  
  const pCard=pitcherName?wbdContext.calcPitcherCard(pitcherName):null;
  const bCards=allBatters.map(n=>wbdContext.calcBatterCard(n)).filter(c=>c);
  const avgPOvr=pCard?pCard.OVR:0;
  const avgBOvr=bCards.length?Math.round(bCards.reduce((s,c)=>s+c.OVR,0)/bCards.length):0;
  const totalWar=(pitcherName?(wbdContext.calcPitcherWAR(pitcherName)||0):0) + allBatters.reduce((s,n)=>s+(wbdContext.calcBatterWAR(n)||0),0);
  const teamScore=(avgPOvr*0.4 + avgBOvr*0.6) * (1 + totalWar*0.02);
  
  return `<div class="grid3">
    <div class="card stat" style="text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase">투수 OVR</div><div style="font-size:30px;font-weight:900;color:${wbdContext.cardOvrColor(avgPOvr)};font-family:var(--mono)">${avgPOvr||'-'}</div><div style="font-size:11px;color:var(--muted)">${pitcherName||'미선택'}</div></div>
    <div class="card stat" style="text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase">타자 평균 OVR (${bCards.length}/${dhName?'9':'9'})${dhName?' · DH':''}</div><div style="font-size:30px;font-weight:900;color:${wbdContext.cardOvrColor(avgBOvr)};font-family:var(--mono)">${avgBOvr||'-'}</div><div style="font-size:11px;color:var(--muted)">합산 WAR ${totalWar.toFixed(2)}</div></div>
    <div class="card stat" style="text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase">팀 종합 점수</div><div style="font-size:30px;font-weight:900;color:var(--amber);font-family:var(--mono)">${teamScore.toFixed(0)}</div><div style="font-size:11px;color:var(--muted)">${players.length}/10 채움 ${dhName?'(DH)':''}</div></div>
  </div>`;
};

// Original index.html:30784
wbdContext._createMyTeam = function _createMyTeam(){
  const name=prompt('새 팀 이름','내 드림팀');
  if(!name||!name.trim())return;
  const id='mt'+Date.now();
  if(!window.MY_TEAMS.teams)window.MY_TEAMS.teams=[];
  window.MY_TEAMS.teams.push({id,name:name.trim(),lineup:{},bench:{pitchers:[],batters:[]}});
  window.MY_TEAMS.active=id;
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30795
wbdContext._selectMyTeam = function _selectMyTeam(id){
  window.MY_TEAMS.active=id;
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30801
wbdContext._renameMyTeam = function _renameMyTeam(id){
  const t=window.MY_TEAMS.teams.find(x=>x.id===id);
  if(!t)return;
  // 팀 정보 종합 편집 모달
  const colors=['#39ff8a','#ff8c44','#cc44ff','#2196f3','#ffe033','#ff4560','#88ccff','#ff6b8a','#aa88ff','#5fd4d4'];
  const icons=['⚾','🏆','⭐','🔥','⚡','💎','👑','🎯','🎮','🚀','💯','🦾'];
  const curColor=t.color||'#39ff8a';
  const curIcon=t.icon||'⚾';
  let html=`<div style="max-width:480px">
    <h2 style="margin:0 0 14px;color:var(--amber)">✏️ 팀 정보 수정</h2>
    <div style="display:grid;gap:14px">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;letter-spacing:0.5px">팀 이름</div>
        <input id="team-edit-name" type="text" value="${(t.name||'').replace(/"/g,'&quot;')}" placeholder="팀 이름" style="width:100%;padding:9px 12px;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:5px;font-size:14px;font-weight:600">
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;letter-spacing:0.5px">아이콘</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${icons.map(ic=>`<button onclick="window._editTeamIcon='${ic}';document.querySelectorAll('.team-icon-btn').forEach(b=>b.classList.toggle('active',b.dataset.icon==='${ic}'))" data-icon="${ic}" class="team-icon-btn ${ic===curIcon?'active':''}" style="width:38px;height:38px;background:var(--card2);border:1px solid var(--border);border-radius:6px;font-size:18px;cursor:pointer;transition:all .15s">${ic}</button>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;letter-spacing:0.5px">색상</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          ${colors.map(c=>`<button onclick="window._editTeamColor='${c}';document.querySelectorAll('.team-color-btn').forEach(b=>b.classList.toggle('active',b.dataset.color==='${c}'))" data-color="${c}" class="team-color-btn ${c===curColor?'active':''}" style="width:32px;height:32px;background:${c};border:2px solid ${c===curColor?'#fff':'transparent'};border-radius:50%;cursor:pointer;transition:all .15s"></button>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;letter-spacing:0.5px">미리보기</div>
        <div id="team-edit-preview" style="padding:12px;background:var(--card2);border-radius:6px;border-left:4px solid ${curColor}">
          <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700">
            <span style="font-size:20px">${curIcon}</span>
            <span id="team-edit-preview-name">${t.name||'팀 이름'}</span>
          </div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:18px;justify-content:flex-end">
      <button onclick="closeModal()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:9px 18px;border-radius:5px;font-size:13px;cursor:pointer">취소</button>
      <button onclick="_saveMyTeamEdit('${id}')" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:9px 22px;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer">💾 저장</button>
    </div>
    <style>
      .team-icon-btn.active{border-color:var(--amber)!important;background:rgba(245,166,35,0.15)!important;transform:scale(1.05)}
      .team-color-btn.active{border-color:#fff!important;transform:scale(1.15);box-shadow:0 0 0 2px rgba(255,255,255,0.3)}
    

/* ━━━━━━━━━━ V10.1 SERVER UI / DATA HUB ━━━━━━━━━━ */
.data-hub{background:linear-gradient(135deg,rgba(13,31,58,.96),rgba(8,17,31,.98));border:1px solid var(--border);border-radius:10px;padding:16px;box-shadow:0 8px 22px rgba(0,0,0,.16)}
.data-hub-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.data-hub-title{display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.9px;color:var(--amber);font-size:15px}
.data-hub-sub{font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px}
.data-hub-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.data-hub-btn{background:rgba(255,255,255,.035);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:7px 11px;font-size:11px;font-weight:700;letter-spacing:.5px;cursor:pointer}
.data-hub-btn:hover{border-color:var(--amber);color:var(--amber);background:rgba(245,166,35,.08)}
.data-hub-btn.primary{background:var(--amber);border-color:var(--amber);color:#000}
.data-hub-btn.danger{border-color:rgba(255,69,96,.75);color:#ff7890}
.data-hub-kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:10px;margin-bottom:14px}
.data-kpi{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:8px;padding:11px 12px;min-height:72px}
.data-kpi .label{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.data-kpi .val{font-family:var(--mono);font-size:23px;color:var(--amber)}
.data-kpi .sub{font-size:10px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.data-section-label{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin:12px 0 8px;display:flex;align-items:center;gap:6px}
.data-cat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.data-cat-card{background:var(--card2);border:1px solid var(--border);border-radius:9px;padding:11px 12px;cursor:pointer;transition:all .15s;position:relative;overflow:hidden}
.data-cat-card:hover{transform:translateY(-1px);border-color:var(--amber);background:rgba(245,166,35,.06)}
.data-cat-card.active-filter{border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.25) inset}
.data-cat-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.data-cat-name{font-size:13px;font-weight:800;color:var(--text)}
.data-cat-count{font-size:12px;color:var(--amber);font-family:var(--mono)}
.data-cat-sub{font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:4px}
.data-cat-progress{height:4px;background:rgba(255,255,255,.08);border-radius:999px;margin-top:9px;overflow:hidden}
.data-cat-progress span{display:block;height:100%;background:var(--amber);border-radius:999px;min-width:2px}
.data-chip-wrap{display:flex;gap:7px;flex-wrap:wrap}
.data-chip{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:11px;padding:6px 10px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .12s}
.data-chip:hover{border-color:var(--amber);color:var(--text);background:rgba(245,166,35,.06)}
.data-chip.active{border-color:var(--amber);color:var(--amber);background:rgba(245,166,35,.10);font-weight:700}
.data-chip .cnt{font-family:var(--mono);color:var(--amber)}
.load-screen-progress{margin-top:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden;background:rgba(255,255,255,.035)}
.load-screen-progress-bar{height:9px;background:linear-gradient(90deg,var(--amber),#ffd36b);width:0%;transition:width .18s ease}
.load-screen-progress-text{font-size:11px;color:var(--muted);font-family:var(--mono);padding:8px 10px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
#dashboard-grid .game-card-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
@media(max-width:900px){.data-hub-kpis{grid-template-columns:repeat(2,1fr)}.data-cat-grid{grid-template-columns:1fr}.data-hub-actions{width:100%}.data-hub-btn{flex:1}.data-hub{padding:12px}}
@media(max-width:480px){.data-hub-kpis{grid-template-columns:1fr}.data-kpi{min-height:62px}.data-kpi .val{font-size:20px}}


/* ━━━━━━━━━━ V10.1 SERVER UI FINAL FIX ━━━━━━━━━━ */
.data-hub-final{background:linear-gradient(135deg,rgba(14,28,48,.98),rgba(7,15,27,.98));border:1px solid var(--border);border-radius:12px;padding:16px;box-shadow:0 10px 28px rgba(0,0,0,.22);overflow:hidden}
.dhf-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:14px}
.dhf-title{font-size:16px;font-weight:900;color:var(--amber);letter-spacing:1px;display:flex;align-items:center;gap:8px}
.dhf-sub{font-size:11px;color:var(--muted);font-family:var(--mono);margin-top:4px;line-height:1.5}
.dhf-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.dhf-btn{background:rgba(255,255,255,.035);border:1px solid var(--border);color:var(--text);border-radius:7px;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:.4px;cursor:pointer;transition:all .12s;font-family:var(--cond)}
.dhf-btn:hover{border-color:var(--amber);color:var(--amber);background:rgba(245,166,35,.08)}
.dhf-btn.primary{background:var(--amber);border-color:var(--amber);color:#000}
.dhf-btn.danger{border-color:rgba(255,69,96,.75);color:#ff7890}
.dhf-btn.good{border-color:rgba(57,255,138,.55);color:#39ff8a}
.dhf-kpis{display:grid;grid-template-columns:repeat(5,minmax(110px,1fr));gap:10px;margin-bottom:14px}
.dhf-kpi{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:9px;padding:11px 12px;min-height:72px}
.dhf-kpi .l{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.dhf-kpi .v{font-family:var(--mono);font-size:24px;color:var(--amber);line-height:1.05}
.dhf-kpi .s{font-size:10px;color:var(--muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-label{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin:14px 0 8px;display:flex;align-items:center;justify-content:space-between;gap:8px}
.dhf-cat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:10px}
.dhf-card{background:var(--card2);border:1px solid var(--border);border-radius:10px;padding:11px 12px;transition:all .12s;position:relative;overflow:hidden}
.dhf-card:hover{border-color:var(--amber);background:rgba(245,166,35,.055)}
.dhf-card.active-view{border-color:var(--amber);box-shadow:0 0 0 1px rgba(245,166,35,.22) inset}
.dhf-card .top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}
.dhf-card .name{font-size:13px;font-weight:900;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-card .count{font-size:12px;color:var(--amber);font-family:var(--mono);white-space:nowrap}
.dhf-card .meta{font-size:10px;color:var(--muted);font-family:var(--mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.dhf-progress{height:4px;background:rgba(255,255,255,.08);border-radius:999px;margin-top:9px;overflow:hidden}
.dhf-progress span{display:block;height:100%;background:var(--amber);border-radius:999px;min-width:2px}
.dhf-mini-actions{display:flex;gap:5px;margin-top:9px;flex-wrap:wrap}
.dhf-mini-actions .dhf-btn{padding:4px 8px;font-size:10px;border-radius:5px}
.dhf-group-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px;max-height:250px;overflow-y:auto;padding-right:4px}
.dhf-group-card{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;background:rgba(255,255,255,.027);border:1px solid var(--border);border-radius:9px;padding:9px 10px;transition:all .12s}
.dhf-group-card:hover{border-color:var(--amber);background:rgba(245,166,35,.045)}
.dhf-group-card.viewing{border-color:var(--amber)}
.dhf-group-card input{accent-color:var(--amber);cursor:pointer}
.dhf-group-main{min-width:0;cursor:pointer}
.dhf-group-name{font-size:12px;font-weight:900;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-group-meta{font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dhf-badge{font-size:9px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:2px 6px;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;max-width:120px;overflow:hidden;text-overflow:ellipsis}
.dhf-note{font-size:10px;color:var(--muted);line-height:1.5;margin-top:8px;border-top:1px dashed var(--border);padding-top:8px}
.game-card-title,.game-team-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:980px){.dhf-kpis{grid-template-columns:repeat(2,1fr)}.dhf-actions{width:100%}.dhf-btn{flex:1}.dhf-group-grid{grid-template-columns:1fr}.dhf-cat-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dhf-kpis,.dhf-cat-grid{grid-template-columns:1fr}.dhf-actions{display:grid;grid-template-columns:1fr 1fr;width:100%}.dhf-btn{width:100%}}

</style>
  </div>`;
  window._editTeamIcon=curIcon;
  window._editTeamColor=curColor;
  wbdContext.openModal(html);
  // 이름 input 변경 시 미리보기
  setTimeout(()=>{
    const inp=document.getElementById('team-edit-name');
    if(inp){
      inp.focus();
      inp.addEventListener('input',()=>{
        const p=document.getElementById('team-edit-preview-name');
        if(p)p.textContent=inp.value||'팀 이름';
      });
    }
  },50);
};

// Original index.html:30947
wbdContext._saveMyTeamEdit = function _saveMyTeamEdit(id){
  const t=window.MY_TEAMS.teams.find(x=>x.id===id);
  if(!t)return;
  const name=(document.getElementById('team-edit-name')?.value||'').trim();
  if(!name){alert('이름을 입력해주세요');return;}
  t.name=name;
  t.icon=window._editTeamIcon||'⚾';
  t.color=window._editTeamColor||'#39ff8a';
  wbdContext._saveMyTeams();
  wbdContext.closeModal();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30960
wbdContext._clearLineup = function _clearLineup(id){
  if(!confirm('라인업을 모두 비울까요?'))return;
  const t=window.MY_TEAMS.teams.find(x=>x.id===id);
  if(!t)return;
  t.lineup={};
  t.bench=[];
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30970
wbdContext._deleteMyTeam = function _deleteMyTeam(id){
  if(!confirm('이 팀을 삭제할까요?'))return;
  window.MY_TEAMS.teams=window.MY_TEAMS.teams.filter(x=>x.id!==id);
  if(window.MY_TEAMS.active===id) window.MY_TEAMS.active=window.MY_TEAMS.teams[0]?.id||null;
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30978
wbdContext._clearSlot = function _clearSlot(teamId,pos){
  const t=window.MY_TEAMS.teams.find(x=>x.id===teamId);
  if(!t)return;
  if(t.lineup)delete t.lineup[pos];
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:30986
wbdContext._clearBench = function _clearBench(teamId,kind,idx){
  const t=window.MY_TEAMS.teams.find(x=>x.id===teamId);
  if(!t||!t.bench)return;
  // 새 구조 (object) 또는 옛 구조 (array)
  if(Array.isArray(t.bench)){
    // 옛 구조 - 인덱스만
    t.bench.splice(idx,1);
  } else {
    if(!t.bench[kind])return;
    t.bench[kind].splice(idx,1);
  }
  wbdContext._saveMyTeams();
  wbdContext.renderMyTeamPage();
};

// Original index.html:31003
wbdContext._pickPlayer = function _pickPlayer(teamId,pos,type){
  window._pickContext={teamId,pos,type,kind:'lineup'};
  wbdContext._showPickModal();
};

// Original index.html:31008
wbdContext._pickBenchPlayer = function _pickBenchPlayer(teamId,kind,idx){
  // kind: 'pitchers' or 'batters' (또는 옛 구조 호환 위한 idx만)
  if(typeof kind==='number'){idx=kind;kind=null;}
  window._pickContext={teamId,kind:'bench',benchKind:kind,idx};
  wbdContext._showPickModal();
};

// Original index.html:31015
wbdContext._showPickModal = function _showPickModal(){
  const ctx=window._pickContext;
  if(!ctx)return;
  const t=window.MY_TEAMS.teams.find(x=>x.id===ctx.teamId);
  if(!t)return;
  
  // 현재 사용중 선수 - {name|type} 조합으로 (같은 이름의 투수/타자 별개)
  const usedNames=new Set();
  // 라인업: P 슬롯 = 투수, 나머지 = 타자
  Object.entries(t.lineup||{}).forEach(([p,n])=>{
    if(ctx.kind==='lineup' && p===ctx.pos)return;
    if(n){
      const slotType=p==='P'?'pitcher':'batter';
      usedNames.add(n+'|'+slotType);
    }
  });
  // 벤치
  if(t.bench){
    if(Array.isArray(t.bench)){
      t.bench.forEach((n,i)=>{
        if(ctx.kind==='bench' && i===ctx.idx)return;
        if(n){
          // 옛 구조 - 자동 판단
          const tp=window._cache.pitcherNames.includes(n)?'pitcher':'batter';
          usedNames.add(n+'|'+tp);
        }
      });
    } else {
      ['pitchers','batters'].forEach(k=>{
        (t.bench[k]||[]).forEach((n,i)=>{
          if(ctx.kind==='bench' && ctx.benchKind===k && i===ctx.idx)return;
          if(n){
            const tp=k==='pitchers'?'pitcher':'batter';
            usedNames.add(n+'|'+tp);
          }
        });
      });
    }
  }
  
  // 필터 상태
  // 벤치-투수 슬롯이면 투수만, 벤치-타자 슬롯이면 타자만 자동 적용
  let defaultType='all';
  if(ctx.kind==='lineup')defaultType=ctx.type;
  else if(ctx.benchKind==='pitchers')defaultType='pitcher';
  else if(ctx.benchKind==='batters')defaultType='batter';
  const filterType=window._pickFilterType||defaultType;
  const filterSrc=window._pickFilterSrc||'all';
  const search=(window._pickSearch||'').toLowerCase();
  
  // 후보 만들기
  let candidates=[];
  const wantPitcher=filterType==='pitcher'||filterType==='all';
  const wantBatter=filterType==='batter'||filterType==='all';
  // 라인업 슬롯이면 그 타입만 (override)
  const lineupRestrict=ctx.kind==='lineup'?ctx.type:null;
  if(wantPitcher && lineupRestrict!=='batter'){
    window._cache.pitcherNames.forEach(n=>{
      const c=wbdContext.calcPitcherCard(n);
      if(c)candidates.push({name:n,type:'pitcher',card:c});
    });
  }
  if(wantBatter && lineupRestrict!=='pitcher'){
    window._cache.batterNames.forEach(n=>{
      const c=wbdContext.calcBatterCard(n);
      if(c)candidates.push({name:n,type:'batter',card:c});
    });
  }
  
  // 팀/그룹 필터
  if(filterSrc!=='all' && filterSrc.startsWith('team:')){
    const tname=filterSrc.substring(5);
    candidates=candidates.filter(c=>wbdContext._playerTeam(c.name,c.type)===tname);
  } else if(filterSrc!=='all' && filterSrc.startsWith('group:')){
    const gid=filterSrc.substring(6);
    const g=(window.PLAYER_GROUPS?.groups||[]).find(x=>x.id===gid);
    if(g){
      const memSet=new Set((g.members||[]).map(String));
      candidates=candidates.filter(c=>memSet.has(String(c.name)));
    }
  }
  
  // 검색
  if(search)candidates=candidates.filter(c=>c.name.toLowerCase().includes(search));
  
  // 정렬
  candidates.sort((a,b)=>{
    if(a.card.lowData&&!b.card.lowData)return 1;
    if(!a.card.lowData&&b.card.lowData)return -1;
    return b.card.OVR-a.card.OVR;
  });
  
  // 팀/그룹 옵션
  const allTeams=new Set();
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA),tB=wbdContext._normalizeTeam(info.teamB);
    if(tA&&!wbdContext._isScrimTeam(tA))allTeams.add(tA);
    if(tB&&!wbdContext._isScrimTeam(tB))allTeams.add(tB);
  });
  Object.values(window.MANUAL_TEAMS||{}).forEach(t=>{if(t)allTeams.add(t);});
  const teamsArr=[...allTeams].sort();
  const groups=window.PLAYER_GROUPS?.groups||[];
  
  const slotLabel=ctx.kind==='lineup'?wbdContext.POS_LABEL[ctx.pos]:(ctx.benchKind==='pitchers'?'불펜 (투수)':ctx.benchKind==='batters'?'대기 (타자)':`대기 ${ctx.idx+1}번`);
  const titleIcon=ctx.kind==='lineup'?(ctx.pos==='P'?'⚾':ctx.pos==='DH'?'🎯':'🏏'):(ctx.benchKind==='pitchers'?'⚾':'🏏');
  
  let html=`<div style="max-width:760px;margin:0 auto">
    <h2 style="margin:0 0 14px;color:var(--amber)">${titleIcon} ${slotLabel} 선택</h2>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <input type="text" id="pick-search" placeholder="🔍 이름 검색..." value="${search}" oninput="window._pickSearch=this.value;_refreshPickList()" style="flex:1;min-width:160px;padding:7px 12px;background:var(--card2);border:1px solid var(--border);color:var(--text);border-radius:4px;font-size:12px">
      ${ctx.kind==='bench' && !ctx.benchKind?`<select onchange="window._pickFilterType=this.value;_refreshPickList()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:4px;font-size:12px">
        <option value="all"${filterType==='all'?' selected':''}>전체</option>
        <option value="pitcher"${filterType==='pitcher'?' selected':''}>투수만</option>
        <option value="batter"${filterType==='batter'?' selected':''}>타자만</option>
      </select>`:''}
      <select onchange="window._pickFilterSrc=this.value;_refreshPickList()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:4px;font-size:12px">
        <option value="all"${filterSrc==='all'?' selected':''}>전체 선수</option>
        <optgroup label="── 팀에서 ──">${teamsArr.map(t=>`<option value="team:${t.replace(/"/g,'&quot;')}"${filterSrc==='team:'+t?' selected':''}>🏟️ ${t}</option>`).join('')}</optgroup>
        ${groups.length?`<optgroup label="── 그룹에서 ──">${groups.map(g=>`<option value="group:${g.id}"${filterSrc==='group:'+g.id?' selected':''}>${g.icon||'👥'} ${g.name}</option>`).join('')}</optgroup>`:''}
      </select>
    </div>
    <div id="pick-list-container" style="max-height:60vh;overflow-y:auto">${wbdContext._renderPickListInner(candidates,usedNames)}</div>
  </div>`;
  wbdContext.openModal(html);
};

// Original index.html:31143
wbdContext._renderPickListInner = function _renderPickListInner(candidates,usedNames){
  if(!candidates.length){
    return '<div style="padding:30px;text-align:center;color:var(--muted)">조건에 맞는 선수가 없어요</div>';
  }
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
    ${candidates.slice(0,200).map(c=>{
      const used=usedNames.has(c.name+'|'+c.type);
      const ovrCol=wbdContext.cardOvrColor(c.card.OVR);
      const photoUrl=wbdContext.getPhotoUrl(c.name);
      const photoHTML=photoUrl
        ?`<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid ${ovrCol}">`
        :`<svg viewBox="0 0 100 100" width="36" height="36" style="border-radius:50%;background:#0f1828;border:2px solid ${ovrCol}"><circle cx="50" cy="38" r="16" fill="#3a4560"/><path d="M 20,100 Q 20,65 50,62 Q 80,65 80,100 Z" fill="#3a4560"/></svg>`;
      const typeLabel=c.type==='pitcher'?'투수':'타자';
      const typeCol=c.type==='pitcher'?'#ff8c44':'#39ff8a';
      return `<div onclick="${used?'':`_assignPickedPlayer('${String(c.name).replace(/'/g,"\\'")}','${c.type}')`}" style="background:var(--card2);border:1px solid ${c.card.lowData?'#3a5a7a':ovrCol+'77'};border-radius:6px;padding:8px;cursor:${used?'not-allowed':'pointer'};opacity:${used?'0.4':'1'};transition:transform .1s" ${used?'':'onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'"'}>
        <div style="display:flex;align-items:center;gap:8px">
          ${photoHTML}
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
            <div style="font-size:9px;color:var(--muted)"><span style="color:${typeCol}">${typeLabel}</span> · OVR <b style="color:${ovrCol}">${c.card.OVR}</b>${c.card.lowData?' 📊':''}${used?' <span style="color:var(--muted)">(이미 있음)</span>':''}</div>
          </div>
        </div>
      </div>`;
    }).join('')}
    ${candidates.length>200?`<div style="grid-column:1/-1;text-align:center;padding:10px;color:var(--muted);font-size:11px">상위 200명만 표시. 검색으로 좁혀주세요</div>`:''}
  </div>`;
};

// Original index.html:31171
wbdContext._refreshPickList = function _refreshPickList(){
  const ctx=window._pickContext;
  if(!ctx)return;
  const container=document.getElementById('pick-list-container');
  if(!container)return;
  const t=window.MY_TEAMS.teams.find(x=>x.id===ctx.teamId);
  if(!t)return;
  
  // 사용중 선수 (lineup + bench) - {name|type} 조합
  const usedNames=new Set();
  Object.entries(t.lineup||{}).forEach(([p,n])=>{
    if(ctx.kind==='lineup' && p===ctx.pos)return;
    if(n){
      const slotType=p==='P'?'pitcher':'batter';
      usedNames.add(n+'|'+slotType);
    }
  });
  if(t.bench){
    if(Array.isArray(t.bench)){
      t.bench.forEach((n,i)=>{
        if(ctx.kind==='bench' && i===ctx.idx)return;
        if(n){
          const tp=window._cache.pitcherNames.includes(n)?'pitcher':'batter';
          usedNames.add(n+'|'+tp);
        }
      });
    } else {
      ['pitchers','batters'].forEach(k=>{
        (t.bench[k]||[]).forEach((n,i)=>{
          if(ctx.kind==='bench' && ctx.benchKind===k && i===ctx.idx)return;
          if(n){
            const tp=k==='pitchers'?'pitcher':'batter';
            usedNames.add(n+'|'+tp);
          }
        });
      });
    }
  }
  
  // 필터 타입 결정 (벤치 슬롯이면 자동 고정)
  let defaultType='all';
  if(ctx.kind==='lineup')defaultType=ctx.type;
  else if(ctx.benchKind==='pitchers')defaultType='pitcher';
  else if(ctx.benchKind==='batters')defaultType='batter';
  const filterType=window._pickFilterType||defaultType;
  const filterSrc=window._pickFilterSrc||'all';
  const search=(window._pickSearch||'').toLowerCase();
  
  let candidates=[];
  const lineupRestrict=ctx.kind==='lineup'?ctx.type:null;
  const wantPitcher=filterType==='pitcher'||filterType==='all';
  const wantBatter=filterType==='batter'||filterType==='all';
  if(wantPitcher && lineupRestrict!=='batter'){
    window._cache.pitcherNames.forEach(n=>{
      const c=wbdContext.calcPitcherCard(n);
      if(c)candidates.push({name:n,type:'pitcher',card:c});
    });
  }
  if(wantBatter && lineupRestrict!=='pitcher'){
    window._cache.batterNames.forEach(n=>{
      const c=wbdContext.calcBatterCard(n);
      if(c)candidates.push({name:n,type:'batter',card:c});
    });
  }
  if(filterSrc.startsWith('team:')){
    const tname=filterSrc.substring(5);
    candidates=candidates.filter(c=>wbdContext._playerTeam(c.name,c.type)===tname);
  } else if(filterSrc.startsWith('group:')){
    const gid=filterSrc.substring(6);
    const g=(window.PLAYER_GROUPS?.groups||[]).find(x=>x.id===gid);
    if(g){
      const memSet=new Set((g.members||[]).map(String));
      candidates=candidates.filter(c=>memSet.has(String(c.name)));
    }
  }
  if(search)candidates=candidates.filter(c=>c.name.toLowerCase().includes(search));
  candidates.sort((a,b)=>{
    if(a.card.lowData&&!b.card.lowData)return 1;
    if(!a.card.lowData&&b.card.lowData)return -1;
    return b.card.OVR-a.card.OVR;
  });
  
  container.innerHTML=wbdContext._renderPickListInner(candidates,usedNames);
};

// Original index.html:31256
wbdContext._assignPickedPlayer = function _assignPickedPlayer(name,type){
  const ctx=window._pickContext;
  if(!ctx)return;
  const t=window.MY_TEAMS.teams.find(x=>x.id===ctx.teamId);
  if(!t)return;
  if(ctx.kind==='lineup'){
    if(!t.lineup)t.lineup={};
    t.lineup[ctx.pos]=name;
  } else {
    // 새 구조 정규화
    if(!t.bench||Array.isArray(t.bench))t.bench={pitchers:[],batters:[]};
    if(!t.bench.pitchers)t.bench.pitchers=[];
    if(!t.bench.batters)t.bench.batters=[];
    // benchKind 자동 결정 (없으면 선수 타입 기반)
    const k=ctx.benchKind||(type==='pitcher'?'pitchers':'batters');
    // 선택한 idx에 삽입 (그 자리가 비어있거나 인덱스 초과면 push)
    if(typeof ctx.idx==='number' && ctx.idx<t.bench[k].length){
      t.bench[k][ctx.idx]=name;
    } else {
      t.bench[k].push(name);
    }
  }
  delete t.battingOrder;
  wbdContext._saveMyTeams();
  wbdContext.closeModal();
  window._pickContext=null;
  window._pickSearch='';
  wbdContext.renderMyTeamPage();
};

// Original index.html:31287
wbdContext._importTeamFromExisting = function _importTeamFromExisting(){
  // 데이터에 있는 팀 + 그룹 목록
  const allTeams=new Set();
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA),tB=wbdContext._normalizeTeam(info.teamB);
    if(tA&&!wbdContext._isScrimTeam(tA))allTeams.add(tA);
    if(tB&&!wbdContext._isScrimTeam(tB))allTeams.add(tB);
  });
  Object.values(window.MANUAL_TEAMS||{}).forEach(t=>{if(t)allTeams.add(t);});
  const teamsArr=[...allTeams].sort();
  const groups=window.PLAYER_GROUPS?.groups||[];
  
  let html=`<div style="max-width:560px;margin:0 auto">
    <h2 style="margin:0 0 12px;color:var(--amber)">📥 팀/그룹에서 불러오기</h2>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">
      선택한 팀/그룹의 선수들로 자동 라인업 구성 (OVR 높은 순). 투수 1명 + 타자 8명.
    </div>`;
  
  if(teamsArr.length){
    html+=`<div style="margin-bottom:14px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#88ccff">🏟️ 팀에서</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px">
        ${teamsArr.map(t=>`<button onclick="_importFromSource('team','${t.replace(/'/g,"\\'")}')" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px;border-radius:4px;font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='var(--border)'">${t}</button>`).join('')}
      </div>
    </div>`;
  }
  
  if(groups.length){
    html+=`<div>
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#39ff8a">👥 그룹에서</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px">
        ${groups.map(g=>`<button onclick="_importFromSource('group','${g.id}')" style="background:var(--card2);border:1px solid ${g.color}77;color:var(--text);padding:8px;border-radius:4px;font-size:12px;cursor:pointer;text-align:left" onmouseover="this.style.borderColor='${g.color}'" onmouseout="this.style.borderColor='${g.color}77'">${g.icon||'👥'} ${g.name} <span style="color:var(--muted);font-size:10px">(${(g.members||[]).length}명)</span></button>`).join('')}
      </div>
    </div>`;
  }
  
  if(!teamsArr.length && !groups.length){
    html+='<div style="padding:30px;text-align:center;color:var(--muted)">불러올 팀이나 그룹이 없어요</div>';
  }
  html+='</div>';
  wbdContext.openModal(html);
};

// Original index.html:31332
wbdContext._importFromSource = function _importFromSource(srcType, srcId){
  // 해당 소스의 모든 선수 가져오기
  let candidates=[];
  if(srcType==='team'){
    window._cache.pitcherNames.forEach(n=>{
      if(wbdContext._playerTeam(n,'pitcher')===srcId){
        const c=wbdContext.calcPitcherCard(n);
        if(c)candidates.push({name:n,type:'pitcher',card:c});
      }
    });
    window._cache.batterNames.forEach(n=>{
      if(wbdContext._playerTeam(n,'batter')===srcId){
        const c=wbdContext.calcBatterCard(n);
        if(c)candidates.push({name:n,type:'batter',card:c});
      }
    });
  } else if(srcType==='group'){
    const g=(window.PLAYER_GROUPS?.groups||[]).find(x=>x.id===srcId);
    if(!g){alert('그룹을 찾을 수 없어요');return;}
    const members=g.members||[];
    members.forEach(n=>{
      if(window._cache.pitcherNames.includes(n)){
        const c=wbdContext.calcPitcherCard(n);
        if(c)candidates.push({name:n,type:'pitcher',card:c});
      }
      if(window._cache.batterNames.includes(n)){
        const c=wbdContext.calcBatterCard(n);
        if(c)candidates.push({name:n,type:'batter',card:c});
      }
    });
  }
  
  // 새 팀 만들기 → 자동 배치
  const sourceName=srcType==='team'?srcId:(window.PLAYER_GROUPS?.groups||[]).find(x=>x.id===srcId)?.name||'그룹';
  const teamName=prompt('팀 이름',sourceName);
  if(!teamName||!teamName.trim()){return;}
  
  const id='mt'+Date.now();
  const lineup={};
  // 투수: 가장 높은 OVR
  const pitchers=candidates.filter(c=>c.type==='pitcher').sort((a,b)=>b.card.OVR-a.card.OVR);
  if(pitchers.length) lineup.P=pitchers[0].name;
  
  // 타자: 가장 높은 OVR 9명 (DH 포함)
  const batters=candidates.filter(c=>c.type==='batter').sort((a,b)=>b.card.OVR-a.card.OVR);
  const positions=['CF','SS','RF','LF','3B','1B','2B','C','DH'];  // 9포지션 (DH 포함)
  for(let i=0;i<positions.length && i<batters.length;i++){
    lineup[positions[i]]=batters[i].name;
  }
  
  // 나머지는 대기 (투수/타자 분리)
  const used=new Set(Object.values(lineup));
  const benchPitchers=pitchers.slice(1).map(c=>c.name).filter(n=>!used.has(n));
  const benchBatters=batters.slice(positions.length).map(c=>c.name).filter(n=>!used.has(n));
  const bench={pitchers:benchPitchers,batters:benchBatters};
  
  if(!window.MY_TEAMS.teams)window.MY_TEAMS.teams=[];
  window.MY_TEAMS.teams.push({id,name:teamName.trim(),lineup,bench});
  window.MY_TEAMS.active=id;
  wbdContext._saveMyTeams();
  wbdContext.closeModal();
  wbdContext.renderMyTeamPage();
};
}

export function initialize(wbdContext) {
// Original index.html:30464
window._dragSlot=null;

// Original index.html:30663
window._dragOrderIdx=null;

// Original index.html:31001
window._pickContext=null;
}
