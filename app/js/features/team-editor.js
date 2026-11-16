/** team-editor: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:8127
wbdContext.openTeamGroupEditor = function openTeamGroupEditor(){
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8132
wbdContext.openQuickTeamGroupEdit = function openQuickTeamGroupEdit(name, type){
  const auto=wbdContext._autoTeam(name, type);
  const manual=(window.MANUAL_TEAMS||{})[name];
  const groups=window.PLAYER_GROUPS?.groups||[];
  
  // 데이터에 있는 모든 팀 (게임 이름에서 직접 추출 - 빠름)
  const allTeams=new Set();
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA);
    const tB=wbdContext._normalizeTeam(info.teamB);
    if(tA && !wbdContext._isScrimTeam(tA)) allTeams.add(tA);
    if(tB && !wbdContext._isScrimTeam(tB)) allTeams.add(tB);
  });
  // 수동 팀들도 추가
  Object.values(window.MANUAL_TEAMS||{}).forEach(t=>{
    if(t && String(t).trim()) allTeams.add(String(t).trim());
  });
  const teamsArr=[...allTeams].sort();
  
  const safeName=name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
  const photoUrl=wbdContext.getPhotoUrl(name);
  const photoHTML=photoUrl
    ? `<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid var(--border)">`
    : `<svg viewBox="0 0 100 100" width="60" height="60" style="display:block;background:linear-gradient(180deg,#1a2438,#0f1828);border-radius:50%;border:2px solid var(--border)"><circle cx="50" cy="38" r="16" fill="#3a4560"/><path d="M 20,100 Q 20,65 50,62 Q 80,65 80,100 Z" fill="#3a4560"/></svg>`;
  
  const typeLabel=type==='pitcher'?'투수':'타자';
  const typeCol=type==='pitcher'?'#ff8c44':'#39ff8a';
  
  const modalEl=document.getElementById('quick-tg-modal') || (()=>{
    const div=document.createElement('div');
    div.id='quick-tg-modal';
    div.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    document.body.appendChild(div);
    return div;
  })();
  
  modalEl.innerHTML=`<div style="background:var(--card);border:1px solid var(--amber);border-radius:10px;padding:24px;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;position:relative">
    <button onclick="closeQuickTGEdit()" style="position:absolute;top:12px;right:12px;background:transparent;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1;padding:0">×</button>
    
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid var(--border)">
      ${photoHTML}
      <div style="flex:1;min-width:0">
        <div style="font-size:10px;color:${typeCol};font-weight:700;letter-spacing:1px">${typeLabel.toUpperCase()}</div>
        <div style="font-size:18px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
      </div>
    </div>
    
    <!-- 팀 -->
    <div style="margin-bottom:18px">
      <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--amber)">🏟️ 소속 팀</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:8px">자동 판단: <b style="color:var(--text)">${auto}</b></div>
      <select id="quick-tg-team" onchange="_quickTGSetTeam('${safeName}',this.value)" style="width:100%;background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 10px;border-radius:4px;font-size:13px">
        <option value=""${!manual?' selected':''}>(자동 사용)</option>
        ${teamsArr.map(t=>`<option value="${t.replace(/"/g,'&quot;')}"${manual===t?' selected':''}>${t}</option>`).join('')}
        ${manual && !teamsArr.includes(manual)?`<option value="${manual.replace(/"/g,'&quot;')}" selected>${manual}</option>`:''}
        <option value="__custom__">+ 새 팀 만들기</option>
      </select>
      ${manual?`<div style="font-size:11px;color:var(--amber);margin-top:6px">✓ 수동 지정: ${manual}${manual!==auto?' (자동과 다름)':''}</div>`:''}
    </div>
    
    <!-- 그룹 -->
    <div>
      <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:#39ff8a">👥 소속 그룹</div>
      ${groups.length?`
        <div style="font-size:11px;color:var(--muted);margin-bottom:8px">체크한 그룹에 멤버로 추가됩니다</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:200px;overflow-y:auto">
          ${groups.map(g=>{
            const isMember=(g.members||[]).map(String).includes(String(name));
            return `<label style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:${isMember?g.color+'22':'var(--card2)'};border:1px solid ${isMember?g.color:'var(--border)'};border-radius:4px;cursor:pointer;font-size:12px">
              <input type="checkbox" ${isMember?'checked':''} onchange="_quickTGToggleGroup('${safeName}','${g.id}',this.checked)" style="cursor:pointer">
              <span style="font-size:14px">${g.icon||'👥'}</span>
              <span style="flex:1;color:${isMember?g.color:'var(--text)'};font-weight:${isMember?'700':'400'}">${g.name}</span>
              <span style="font-size:10px;color:var(--muted)">${(g.members||[]).length}명</span>
            </label>`;
          }).join('')}
        </div>
      `:`
        <div style="text-align:center;padding:16px;background:var(--card2);border-radius:6px;color:var(--muted);font-size:12px">
          아직 그룹이 없어요<br>
          <button onclick="closeQuickTGEdit();openTeamGroupEditor();_setTGTab('groups');_startEditGroup('new');" style="margin-top:8px;background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:6px 14px;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer">+ 그룹 만들러 가기</button>
        </div>
      `}
    </div>
    
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
      <button onclick="closeQuickTGEdit();openTeamGroupEditor()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:7px 14px;border-radius:4px;font-size:12px;cursor:pointer">⚙️ 전체 편집기</button>
      <button onclick="closeQuickTGEdit()" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:7px 18px;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer">완료</button>
    </div>
  </div>`;
};

// Original index.html:8225
wbdContext.closeQuickTGEdit = function closeQuickTGEdit(){
  const m=document.getElementById('quick-tg-modal');
  if(m)m.remove();
};

// Original index.html:8230
wbdContext._quickTGSetTeam = function _quickTGSetTeam(name, value){
  if(value==='__custom__'){
    const newName=prompt('새 팀명을 입력하세요','');
    if(newName && newName.trim()){
      window.MANUAL_TEAMS[name]=newName.trim();
    }
    wbdContext._saveManualTeams();
    if(typeof wbdContext.renderCards==='function')wbdContext.renderCards();
    if(document.getElementById('page-team').classList.contains('active'))wbdContext.renderTeamPage();
    wbdContext.openQuickTeamGroupEdit(name, _quickTGCurrentType||'batter');  // 다시 열기
    return;
  }
  if(!value){delete window.MANUAL_TEAMS[name];}
  else {window.MANUAL_TEAMS[name]=value;}
  wbdContext._saveManualTeams();
  if(typeof wbdContext.renderCards==='function')wbdContext.renderCards();
  if(document.getElementById('page-team').classList.contains('active'))wbdContext.renderTeamPage();
};

// Original index.html:8249
wbdContext._quickTGToggleGroup = function _quickTGToggleGroup(name, groupId, checked){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===groupId);
  if(!g)return;
  if(!g.members)g.members=[];
  if(checked){
    if(!g.members.map(String).includes(String(name))) g.members.push(name);
  } else {
    g.members=g.members.filter(m=>String(m)!==String(name));
  }
  wbdContext._savePlayerGroups();
  if(typeof wbdContext.renderCards==='function')wbdContext.renderCards();
  if(document.getElementById('page-team').classList.contains('active'))wbdContext.renderTeamPage();
  // 모달 다시 그리기 (체크박스 색 갱신)
  // 단순히 체크박스 색만 바뀌면 좋으니 굳이 다시 안 그려도 OK
  // 하지만 그룹 멤버 수가 바뀌니 재렌더
  const sel=document.getElementById('quick-tg-team');
  // type을 알 수 없어서 그냥 페이지 갱신만 함
};

// Original index.html:8267
wbdContext._setTGTab = function _setTGTab(tab){window._teamGroupTab=tab;wbdContext._renderTeamGroupModal();};

// Original index.html:8269
wbdContext._renderTeamGroupModal = function _renderTeamGroupModal(){
  const tab=window._teamGroupTab||'teams';
  const tabBtn=(id,icon,label)=>{
    const active=tab===id;
    return `<button onclick="_setTGTab('${id}')" style="background:${active?'var(--amber)':'var(--card2)'};color:${active?'#000':'var(--text)'};border:1px solid ${active?'var(--amber)':'var(--border)'};padding:8px 16px;border-radius:6px 6px 0 0;font-size:13px;font-weight:${active?'700':'500'};cursor:pointer">${icon} ${label}</button>`;
  };
  let html=`<div style="max-width:900px;margin:0 auto">
    <h2 style="text-align:center;margin:0 0 16px;color:var(--amber)">👥 팀/그룹 수동 편집</h2>
    <div style="display:flex;gap:6px;margin-bottom:0;border-bottom:2px solid var(--amber)">
      ${tabBtn('teams','🏟️','팀 편집')}
      ${tabBtn('groups','👥','그룹 관리')}
    </div>
    <div style="background:var(--card);border:1px solid var(--amber);border-top:none;padding:18px;border-radius:0 0 8px 8px;max-height:70vh;overflow-y:auto">
      ${tab==='teams'?wbdContext._renderTeamEditTab():wbdContext._renderGroupEditTab()}
    </div>
  </div>`;
  wbdContext.openModal(html);
};

// Original index.html:8289
wbdContext._renderTeamEditTab = function _renderTeamEditTab(){
  const allPlayers=new Map(); // name → {type, count}
  wbdContext.G.forEach(d=>{
    if(d.pName){
      if(!allPlayers.has(String(d.pName))) allPlayers.set(String(d.pName),{name:String(d.pName),type:'pitcher',count:0});
      allPlayers.get(String(d.pName)).count++;
    }
    if(d.bName){
      const k=String(d.bName);
      if(!allPlayers.has(k)) allPlayers.set(k,{name:k,type:'batter',count:0});
      // 만약 이미 투수로 있는데 타자도 있으면 hybrid 표시 가능 (지금은 type 그대로 둠)
    }
  });
  // 자동 팀 캐싱 (1회 계산, 모든 선수)
  const autoTeamCache={};  // {name+type: team}
  const allTeams=new Set();
  // GAMES 한번만 순회해서 모든 선수의 카운트 수집
  const teamCntByPlayer={};  // {name|type: {team: count}}
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA);
    const tB=wbdContext._normalizeTeam(info.teamB);
    if(tA && !wbdContext._isScrimTeam(tA)) allTeams.add(tA);
    if(tB && !wbdContext._isScrimTeam(tB)) allTeams.add(tB);
    g.pitches.forEach(d=>{
      if(d.pName){
        const key=String(d.pName)+'|pitcher';
        const team=d.half===1?tB:tA;
        if(team){
          if(!teamCntByPlayer[key])teamCntByPlayer[key]={};
          teamCntByPlayer[key][team]=(teamCntByPlayer[key][team]||0)+1;
        }
      }
      if(d.bName){
        const key=String(d.bName)+'|batter';
        const team=d.half===1?tA:tB;
        if(team){
          if(!teamCntByPlayer[key])teamCntByPlayer[key]={};
          teamCntByPlayer[key][team]=(teamCntByPlayer[key][team]||0)+1;
        }
      }
    });
  });
  // 각 선수 자동 팀 = 최다 카운트
  Object.entries(teamCntByPlayer).forEach(([key,cnts])=>{
    const sorted=Object.entries(cnts).sort((a,b)=>b[1]-a[1]);
    if(sorted.length) autoTeamCache[key]=sorted[0][0];
  });
  Object.values(window.MANUAL_TEAMS||{}).forEach(t=>{ if(t)allTeams.add(t); });
  
  const search=(window._teamSearchQuery||'').toLowerCase();
  const fmode=window._teamFilterMode||'all';
  
  let players=[...allPlayers.values()];
  if(search)players=players.filter(p=>p.name.toLowerCase().includes(search));
  if(fmode==='pitcher')players=players.filter(p=>p.type==='pitcher');
  else if(fmode==='batter')players=players.filter(p=>p.type==='batter');
  else if(fmode==='manual')players=players.filter(p=>(window.MANUAL_TEAMS||{})[p.name]);
  players.sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  
  const teamsArr=[...allTeams].sort();
  const teamsOpts=teamsArr.map(t=>`<option value="${t.replace(/"/g,'&quot;')}">${t}</option>`).join('');
  
  let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap;padding:10px;background:var(--card2);border-radius:6px">
    <input type="text" id="team-search-input" placeholder="🔍 선수 검색..." value="${search}" oninput="_onTeamSearchInput(this.value)" style="flex:1;min-width:160px;padding:6px 10px;background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:4px;font-size:12px">
    <select onchange="window._teamFilterMode=this.value;_renderTeamGroupModal()" style="background:var(--card);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:4px;font-size:12px">
      <option value="all"${fmode==='all'?' selected':''}>전체</option>
      <option value="pitcher"${fmode==='pitcher'?' selected':''}>투수만</option>
      <option value="batter"${fmode==='batter'?' selected':''}>타자만</option>
      <option value="manual"${fmode==='manual'?' selected':''}>수동 지정만</option>
    </select>
    <button onclick="if(confirm('모든 수동 팀 지정을 초기화할까요?')){window.MANUAL_TEAMS={};_saveManualTeams();renderCards();_renderTeamGroupModal();}" style="background:transparent;border:1px solid var(--danger,#ff4560);color:var(--danger,#ff4560);padding:6px 10px;border-radius:4px;font-size:11px;cursor:pointer">🗑 모두 자동으로</button>
    <span style="font-size:11px;color:var(--muted);margin-left:auto">${players.length}명</span>
  </div>`;
  
  html+=`<div style="font-size:11px;color:var(--muted);margin-bottom:10px">💡 비워두거나 <b>(자동 사용)</b> 선택 시 자동 판단을 사용. <b>+ 새 팀 만들기</b>로 데이터에 없던 팀명도 추가 가능</div>`;
  
  if(!players.length){
    html+='<div style="text-align:center;color:var(--muted);padding:30px">조건에 맞는 선수가 없어요</div>';
    return html;
  }
  
  html+='<div style="display:flex;flex-direction:column;gap:6px">';
  players.forEach(p=>{
    const auto=autoTeamCache[p.name+'|'+p.type]||'—';
    const manual=(window.MANUAL_TEAMS||{})[p.name];
    const current=manual||'';
    const conflict=manual && auto!=='—' && manual!==auto;
    const safeName=p.name.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const typeCol=p.type==='pitcher'?'#ff8c44':'#39ff8a';
    const typeLabel=p.type==='pitcher'?'투수':'타자';
    const borderL=manual?(conflict?'4px solid #ffaa00':'4px solid var(--amber)'):'4px solid transparent';
    
    // 사용자 input 상태 ('__custom__'이면 직접 입력 모드)
    const usingCustom=current && !teamsArr.includes(current);
    
    html+=`<div data-player="${safeName}" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--card2);border-radius:4px;border-left:${borderL}">
      ${wbdContext.getAvatarHTML(p.name,32)}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name} <span style="color:${typeCol};font-size:10px;margin-left:4px">${typeLabel}</span>${conflict?' <span title="자동 판단과 다름" style="color:#ffaa00;font-size:10px">⚠</span>':''}</div>
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono)">자동: ${auto}${manual?` → 수동: <b style="color:var(--amber)">${manual}</b>`:''}</div>
      </div>
      <select onchange="_setManualTeam('${safeName}',this.value,this.parentNode)" style="background:var(--card);border:1px solid var(--border);color:var(--text);padding:5px 8px;border-radius:4px;font-size:11px;min-width:140px">
        <option value=""${!current?' selected':''}>(자동 사용)</option>
        ${teamsArr.map(t=>`<option value="${t.replace(/"/g,'&quot;')}"${current===t?' selected':''}>${t}</option>`).join('')}
        ${usingCustom?`<option value="${current.replace(/"/g,'&quot;')}" selected>${current}</option>`:''}
        <option value="__custom__">+ 새 팀 만들기</option>
      </select>
    </div>`;
  });
  html+='</div>';
  return html;
};

// Original index.html:8404
wbdContext._setManualTeam = function _setManualTeam(name,value,row){
  if(value==='__custom__'){
    const newName=prompt('새 팀명을 입력하세요','');
    if(newName && newName.trim()){
      window.MANUAL_TEAMS[name]=newName.trim();
      wbdContext._saveManualTeams();
      wbdContext.renderCards();
      wbdContext._renderTeamGroupModal();
    } else {
      wbdContext._renderTeamGroupModal(); // select 원복
    }
    return;
  }
  if(!value){
    delete window.MANUAL_TEAMS[name];
  } else {
    window.MANUAL_TEAMS[name]=value;
  }
  wbdContext._saveManualTeams();
  wbdContext.renderCards();
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8430
wbdContext._renderGroupEditTab = function _renderGroupEditTab(){
  const groups=window.PLAYER_GROUPS?.groups||[];
  const editing=window._editingGroupId;
  
  // 편집 모드면 폼 표시
  if(editing!==null){
    return wbdContext._renderGroupForm(editing);
  }
  
  let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
    <button onclick="_startEditGroup('new')" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">+ 새 그룹 만들기</button>
    <span style="font-size:11px;color:var(--muted);margin-left:auto">${groups.length}개 그룹</span>
  </div>`;
  
  if(!groups.length){
    html+='<div style="text-align:center;color:var(--muted);padding:30px;font-size:13px">아직 그룹이 없어요. 위 버튼으로 첫 그룹을 만들어보세요!</div>';
    return html;
  }
  
  html+='<div style="display:flex;flex-direction:column;gap:8px">';
  groups.forEach(g=>{
    const safeId=g.id.replace(/'/g,"\\'");
    const members=g.members||[];
    html+=`<div style="background:var(--card2);border:1px solid var(--border);border-left:4px solid ${g.color||'#888'};border-radius:6px;padding:12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:18px">${g.icon||'👥'}</span>
        <span style="font-size:14px;font-weight:700;color:${g.color||'var(--text)'}">${g.name}</span>
        <span style="font-size:11px;color:var(--muted)">${members.length}명</span>
        <div style="margin-left:auto;display:flex;gap:6px">
          <button onclick="_startEditGroup('${safeId}')" style="background:var(--card);border:1px solid var(--border);color:var(--text);padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer">편집</button>
          <button onclick="_deleteGroup('${safeId}')" style="background:transparent;border:1px solid var(--danger,#ff4560);color:var(--danger,#ff4560);padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer">삭제</button>
        </div>
      </div>
      ${g.note?`<div style="font-size:11px;color:var(--muted);margin-bottom:6px">${g.note}</div>`:''}
      <div style="font-size:11px;color:var(--text);font-family:var(--mono)">${members.length?members.slice(0,8).join(', ')+(members.length>8?` 외 ${members.length-8}명`:''):'(멤버 없음)'}</div>
    </div>`;
  });
  html+='</div>';
  return html;
};

// Original index.html:8471
wbdContext._startEditGroup = function _startEditGroup(id){
  if(id==='new'){
    // 새 그룹 임시 생성
    const newId='g'+Date.now();
    if(!window.PLAYER_GROUPS.groups) window.PLAYER_GROUPS.groups=[];
    window.PLAYER_GROUPS.groups.push({
      id:newId, name:'새 그룹', color:wbdContext.GROUP_PALETTE[Math.floor(Math.random()*wbdContext.GROUP_PALETTE.length)],
      icon:'⭐', members:[], note:''
    });
    window._editingGroupId=newId;
    window._isNewGroup=true;
  } else {
    window._editingGroupId=id;
    window._isNewGroup=false;
  }
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8489
wbdContext._deleteGroup = function _deleteGroup(id){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(!g)return;
  if(!confirm(`"${g.name}" 그룹을 삭제할까요?`))return;
  window.PLAYER_GROUPS.groups=window.PLAYER_GROUPS.groups.filter(x=>x.id!==id);
  wbdContext._savePlayerGroups();
  wbdContext.renderCards();
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8499
wbdContext._renderGroupForm = function _renderGroupForm(id){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(!g){window._editingGroupId=null;return wbdContext._renderGroupEditTab();}
  const isNew=window._isNewGroup;
  
  const allNames=[...new Set([...wbdContext.G.map(d=>String(d.pName||'')),...wbdContext.G.map(d=>String(d.bName||''))])].filter(n=>n).sort();
  
  let html=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
    <button onclick="_cancelGroupEdit()" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:6px 12px;border-radius:4px;font-size:11px;cursor:pointer">← 목록으로</button>
    <span style="font-size:14px;font-weight:700;margin-left:8px">${isNew?'새 그룹 만들기':'그룹 편집'}</span>
  </div>`;
  
  // 그룹 정보 입력
  html+=`<div style="background:var(--card2);border-radius:6px;padding:14px;margin-bottom:14px">
    <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 12px;align-items:center;margin-bottom:14px">
      <label style="font-size:12px;color:var(--muted)">이름</label>
      <input type="text" value="${(g.name||'').replace(/"/g,'&quot;')}" oninput="_updateGroupField('${id}','name',this.value)" style="padding:6px 10px;background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:4px;font-size:13px;font-weight:600">
      
      <label style="font-size:12px;color:var(--muted)">아이콘</label>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${wbdContext.GROUP_ICONS.map(ic=>`<button onclick="_updateGroupField('${id}','icon','${ic}')" style="background:${g.icon===ic?'var(--amber)':'var(--card)'};border:1px solid ${g.icon===ic?'var(--amber)':'var(--border)'};padding:4px 8px;border-radius:4px;font-size:14px;cursor:pointer">${ic}</button>`).join('')}
      </div>
      
      <label style="font-size:12px;color:var(--muted)">색상</label>
      <div style="display:flex;flex-wrap:wrap;gap:4px">
        ${wbdContext.GROUP_PALETTE.map(c=>`<button onclick="_updateGroupField('${id}','color','${c}')" title="${c}" style="background:${c};border:2px solid ${g.color===c?'#fff':'transparent'};width:24px;height:24px;border-radius:50%;cursor:pointer"></button>`).join('')}
      </div>
      
      <label style="font-size:12px;color:var(--muted)">비고</label>
      <input type="text" value="${(g.note||'').replace(/"/g,'&quot;')}" oninput="_updateGroupField('${id}','note',this.value)" placeholder="(선택) 그룹 설명" style="padding:6px 10px;background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:4px;font-size:12px">
    </div>
    
    <!-- 미리보기 -->
    <div style="font-size:11px;color:var(--muted);margin-bottom:6px">미리보기:</div>
    <div id="group-preview-${id}"><span style="font-size:11px;background:${g.color}22;border:1px solid ${g.color};color:${g.color};padding:3px 8px;border-radius:10px;font-weight:600">${g.icon||''} ${g.name||'(이름 없음)'}</span></div>
  </div>`;
  
  // 멤버 추가
  const memberSet=new Set((g.members||[]).map(String));
  const search=(window._memberSearchQuery||'').toLowerCase();
  let candidates=allNames.filter(n=>!memberSet.has(n));
  if(search)candidates=candidates.filter(n=>n.toLowerCase().includes(search));
  candidates=candidates.slice(0,30);
  
  html+=`<div style="background:var(--card2);border-radius:6px;padding:14px;margin-bottom:14px">
    <div style="font-size:12px;font-weight:600;margin-bottom:8px">멤버 추가 (총 ${allNames.length}명 중)</div>
    <input type="text" id="member-search-input" placeholder="🔍 선수 검색..." value="${search}" oninput="_onMemberSearchInput(this.value)" style="width:100%;padding:6px 10px;background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:4px;font-size:12px;margin-bottom:8px">
    ${candidates.length?`<div style="display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow-y:auto">${candidates.map(n=>`<button onclick="_addGroupMember('${id}','${n.replace(/'/g,"\\'")}')" style="background:var(--card);border:1px solid var(--border);color:var(--text);padding:4px 10px;border-radius:4px;font-size:11px;cursor:pointer">+ ${n}</button>`).join('')}</div>`:'<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px">검색 결과 없음</div>'}
  </div>`;
  
  // 현재 멤버
  const members=g.members||[];
  html+=`<div style="background:var(--card2);border-radius:6px;padding:14px">
    <div style="font-size:12px;font-weight:600;margin-bottom:8px">현재 멤버 (${members.length}명)</div>
    ${members.length?`<div style="display:flex;flex-wrap:wrap;gap:4px">${members.map(n=>{
      const inData=allNames.includes(String(n));
      return `<span style="background:var(--card);border:1px solid ${inData?'var(--border)':'#ff4560'};padding:3px 6px 3px 8px;border-radius:4px;font-size:11px;display:inline-flex;align-items:center;gap:4px;${inData?'':'opacity:0.6'}">${inData?'':'⚠ '}${n}<button onclick="_removeGroupMember('${id}','${String(n).replace(/'/g,"\\'")}')" style="background:transparent;border:none;color:var(--muted);cursor:pointer;padding:0 2px;font-size:13px;line-height:1">×</button></span>`;
    }).join('')}</div>`:'<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px">아직 멤버 없음</div>'}
  </div>
  
  <div style="margin-top:16px;display:flex;gap:8px;justify-content:center">
    <button onclick="_saveGroupAndClose('${id}')" style="background:linear-gradient(90deg,#39ff8a,#88ccff);color:#000;border:none;padding:8px 24px;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer">💾 저장</button>
    <button onclick="_cancelGroupEdit()" style="background:transparent;border:1px solid var(--border);color:var(--muted);padding:8px 16px;border-radius:6px;font-size:12px;cursor:pointer">취소</button>
  </div>`;
  return html;
};

// Original index.html:8566
wbdContext._updateGroupField = function _updateGroupField(id,field,value){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(!g)return;
  g[field]=value;
  // 텍스트 input(name, note)은 미리보기만 부분 갱신 (포커스 유지)
  if(field==='name'||field==='note'){
    wbdContext._updateGroupPreview(id);
  } else {
    // icon, color는 버튼 선택이라 재렌더 OK
    wbdContext._renderTeamGroupModal();
  }
};

// Original index.html:8580
wbdContext._updateGroupPreview = function _updateGroupPreview(id){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(!g)return;
  const previewEl=document.getElementById('group-preview-'+id);
  if(previewEl){
    previewEl.innerHTML=`<span style="font-size:11px;background:${g.color}22;border:1px solid ${g.color};color:${g.color};padding:3px 8px;border-radius:10px;font-weight:600">${g.icon||''} ${g.name||'(이름 없음)'}</span>`;
  }
};

// Original index.html:8591
wbdContext._onTeamSearchInput = function _onTeamSearchInput(value){
  window._teamSearchQuery = value;
  clearTimeout(window._tgSearchDebounce);
  window._tgSearchDebounce = setTimeout(()=>{
    wbdContext._renderTeamGroupModal();
    // 재렌더 후 input에 포커스 복원 + 커서 위치 끝으로
    const el = document.getElementById('team-search-input');
    if(el){ el.focus(); el.setSelectionRange(value.length, value.length); }
  }, 250);
};

// Original index.html:8601
wbdContext._onMemberSearchInput = function _onMemberSearchInput(value){
  window._memberSearchQuery = value;
  clearTimeout(window._tgSearchDebounce);
  window._tgSearchDebounce = setTimeout(()=>{
    wbdContext._renderTeamGroupModal();
    const el = document.getElementById('member-search-input');
    if(el){ el.focus(); el.setSelectionRange(value.length, value.length); }
  }, 250);
};

// Original index.html:8611
wbdContext._addGroupMember = function _addGroupMember(id,name){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(!g)return;
  if(!g.members)g.members=[];
  if(!g.members.includes(name)) g.members.push(name);
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8619
wbdContext._removeGroupMember = function _removeGroupMember(id,name){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(!g||!g.members)return;
  g.members=g.members.filter(m=>String(m)!==String(name));
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8626
wbdContext._saveGroupAndClose = function _saveGroupAndClose(id){
  const g=window.PLAYER_GROUPS.groups.find(x=>x.id===id);
  if(g && (!g.name || !g.name.trim())){
    alert('그룹 이름을 입력해주세요');
    return;
  }
  wbdContext._savePlayerGroups();
  window._editingGroupId=null;
  window._isNewGroup=false;
  window._memberSearchQuery='';
  wbdContext.renderCards();
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8640
wbdContext._cancelGroupEdit = function _cancelGroupEdit(){
  // 새 그룹 만들기 중이었다면 폐기
  if(window._isNewGroup){
    window.PLAYER_GROUPS.groups=window.PLAYER_GROUPS.groups.filter(g=>g.id!==window._editingGroupId);
  } else {
    // 기존 편집이었다면 localStorage에서 다시 로드 (변경사항 폐기)
    try{window.PLAYER_GROUPS=JSON.parse(localStorage.getItem('wbd_player_groups')||'{"groups":[]}');}catch(e){}
  }
  window._editingGroupId=null;
  window._isNewGroup=false;
  window._memberSearchQuery='';
  wbdContext._renderTeamGroupModal();
};

// Original index.html:8654
wbdContext.openCardDetail = function openCardDetail(name,type){
  const c=type==='pitcher'?wbdContext.calcPitcherCard(name):wbdContext.calcBatterCard(name);
  if(!c)return;
  const radar=wbdContext.makeCardRadar(c.stats,160);
  const bars=Object.entries(c.stats).map(([k,v])=>{
    const tooltip=wbdContext._statTooltipHTML(k);
    const info=wbdContext.STAT_INFO[k];
    return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span title="${tooltip.replace(/"/g,'&quot;')}" style="font-size:11px;color:var(--muted);width:64px;cursor:help;border-bottom:1px dotted var(--muted);display:inline-flex;align-items:center;gap:3px">${info?info.icon:''}${k}</span>
      <div style="flex:1;height:8px;background:#1a2f4a;border-radius:4px;overflow:hidden">
        <div style="width:${Math.min(100,v)}%;height:100%;background:${wbdContext.statBarBg(v)};border-radius:4px${wbdContext.statGlow(v)};transition:width .5s"></div>
      </div>
      <span style="font-size:12px;color:${wbdContext.statColor(v)};width:30px;text-align:right;font-family:var(--mono);font-weight:700">${v}${v>=100?'▲':''}</span>
    </div>`;
  }).join('');
  
  // 뒷면 컨텐츠 생성
  const backContent=wbdContext.buildCardBack(name,type,c);
  const safeName=String(name).replace(/'/g,"\\'").replace(/"/g,'\\"');
  
  wbdContext.openModal(`<div id="card-flip-container" style="perspective:1000px;position:relative">
    <div id="card-flip-inner" style="position:relative;transition:transform 0.6s;transform-style:preserve-3d">
      <div id="card-front" style="backface-visibility:hidden;-webkit-backface-visibility:hidden">
        <div style="text-align:center;margin-bottom:16px">
          <div style="display:flex;justify-content:center;gap:10px;margin-bottom:10px;align-items:center">
            ${wbdContext.favoriteButton(name,type,22)}
            <button onclick="event.stopPropagation();openMemoModal('player_${type}_${String(name).replace(/'/g,"").replace(/"/g,'')}','${type==='pitcher'?'투수':'타자'} · ${name.replace(/'/g,"").replace(/"/g,'')}')" title="메모" style="background:transparent;border:none;color:${wbdContext.getMemo('player_'+type+'_'+name)?'var(--amber)':'var(--muted)'};font-size:20px;cursor:pointer;padding:2px 4px">${wbdContext.getMemo('player_'+type+'_'+name)?'📝':'📄'}</button>
            <button onclick="event.stopPropagation();exportCardAsPNG('${safeName}','${type}')" title="PNG 이미지로 저장" style="background:transparent;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:2px 4px">📷</button>
            <button onclick="event.stopPropagation();showStatInfo()" title="능력치 설명 / 계산식 보기" style="background:transparent;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:2px 4px">📖</button>
            <button onclick="event.stopPropagation();exportPlayerCardJSON('${safeName}','${type}')" title="JSON 데이터로 저장" style="background:transparent;border:none;color:var(--muted);font-size:18px;cursor:pointer;padding:2px 4px">📋</button>
            <button onclick="event.stopPropagation();openQuickTeamGroupEdit('${safeName}','${type}')" title="팀/그룹 편집" style="background:transparent;border:none;color:#88ccff;font-size:18px;cursor:pointer;padding:2px 4px">✏️</button>
            <button onclick="event.stopPropagation();flipCard()" title="뒷면 보기 (상세 통계)" style="background:#2196f3;border:1px solid #2196f3;color:#fff;font-size:13px;cursor:pointer;padding:3px 10px;border-radius:4px;margin-left:6px">🔄 뒷면 (통계)</button>
          </div>
          <div style="font-size:11px;color:${type==='pitcher'?'#ff8c44':'#39ff8a'};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">${type==='pitcher'?'PITCHER':'BATTER'}</div>
          <div style="display:flex;justify-content:center;margin:14px 0 18px">
            <div style="position:relative">
              ${wbdContext.getAvatarHTML(name, 220)}
              <div style="position:absolute;bottom:-6px;right:-6px;background:${wbdContext.cardOvrColor(c.OVR)};color:#000;font-family:var(--mono);font-weight:900;font-size:18px;padding:6px 12px;border-radius:20px;border:3px solid var(--card);box-shadow:0 2px 8px rgba(0,0,0,0.5)">${c.OVR}</div>
            </div>
          </div>
          <div style="font-size:26px;font-weight:900;color:var(--text);margin:4px 0">${name}</div>
          ${type==='batter'?(()=>{const p=wbdContext.getPrimaryPosition(name);return p?`<div style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;background:${wbdContext.POS_COLORS[p.pos]}22;border:1px solid ${wbdContext.POS_COLORS[p.pos]};border-radius:12px;font-size:11px;margin-bottom:4px"><span style="font-family:var(--mono);font-weight:700;color:${wbdContext.POS_COLORS[p.pos]}">${p.name}</span><span style="color:var(--muted)">·</span><span style="color:var(--muted)">${p.long} ${p.innings}이닝</span></div>`:'';})():''}
          <div style="margin-top:8px">${wbdContext.renderBadges(wbdContext.computeBadges(c))}</div>
          ${(()=>{ if(!window.SHOW_FORM) return '';
            const f=wbdContext._recentForm(name,type,5); if(!f) return '';
            const items = type==='pitcher'
              ? [['피안타율',f.recent.oAvg,f.season.oAvg,v=>v!=null?v.toFixed(3).replace(/^0/,''):'-',false],
                 ['헛스윙%',f.recent.whiff,f.season.whiff,v=>v!=null?v.toFixed(1)+'%':'-',true],
                 ['피배럴+%',f.recent.brlp,f.season.brlp,v=>v!=null?v.toFixed(1)+'%':'-',false]]
              : [['타율',f.recent.avg,f.season.avg,v=>v!=null?v.toFixed(3).replace(/^0/,''):'-',true],
                 ['장타율',f.recent.slg,f.season.slg,v=>v!=null?v.toFixed(3).replace(/^0/,''):'-',true],
                 ['배럴+%',f.recent.brlp,f.season.brlp,v=>v!=null?v.toFixed(1)+'%':'-',true],
                 ['평균EV',f.recent.ev,f.season.ev,v=>v!=null?v.toFixed(1):'-',true]];
            const rows=items.map(([l,r,s,fmt,hb])=>{
              if(r==null||s==null) return '';
              const up=(r>s)===hb, same=Math.abs(r-s)<(Math.abs(s)*0.02);
              const col=same?'var(--muted)':(up?'#39ff8a':'#ff4560');
              return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0">
                <span style="color:var(--muted)">${l}</span>
                <span style="font-family:var(--mono)"><b style="color:${col}">${fmt(r)}</b> <span style="color:var(--muted);font-size:10px">/ 시즌 ${fmt(s)}</span></span>
              </div>`;
            }).join('');
            const pos=Math.max(0,Math.min(1,0.5+(f.norm||0)*1.6));
            return `<div style="margin-top:10px;padding:12px;background:linear-gradient(135deg,${f.color}18,transparent);border:1px solid ${f.color}44;border-radius:8px;text-align:left">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:9px">
                <span style="font-size:20px;filter:drop-shadow(0 0 6px ${f.color})">${f.icon}</span>
                <div style="flex:1">
                  <div style="font-size:13px;font-weight:800;color:${f.color};letter-spacing:0.3px">컨디션 ${f.label}</div>
                  <div style="font-size:10px;color:var(--muted)">최근 ${f.games}경기 · 시즌 평균 대비</div>
                </div>
              </div>
              <div style="height:5px;background:linear-gradient(90deg,#37474f,#546e7a 35%,#7a8fa6 50%,#ff8c44 72%,#ff4560);border-radius:3px;position:relative;opacity:0.6;margin-bottom:10px">
                <div style="position:absolute;left:50%;top:-3px;width:1px;height:11px;background:rgba(255,255,255,0.4)"></div>
                <div style="position:absolute;left:${(pos*100).toFixed(0)}%;top:-4px;transform:translateX(-50%);width:12px;height:12px;border-radius:50%;background:${f.color};border:2px solid var(--card);box-shadow:0 0 10px ${f.color}"></div>
              </div>
              ${rows}</div>`;
          })()}
        </div>
        <!-- 능력치 (육각형 + 바) -->
        <div style="display:flex;justify-content:center;margin-bottom:16px">${radar}</div>
        ${bars}
        <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:12px">${c.detail}</div>
        ${wbdContext.getMemo('player_'+type+'_'+name)?`<div style="margin-top:14px;padding:10px 12px;background:var(--card2);border-left:3px solid var(--amber);border-radius:3px;font-size:12px;white-space:pre-wrap">📝 ${wbdContext.getMemo('player_'+type+'_'+name).replace(/</g,'&lt;')}</div>`:''}
        <div style="text-align:center;margin-top:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button class="btn-secondary" onclick="closeModal();${type==='pitcher'?'goToPitcher':'goToBatter'}('${safeName}')">📊 상세 분석</button>
          <button class="btn-secondary" onclick="openAdvancedAnalysis('${safeName}','${type}')" style="background:#2196f3;color:#fff;border-color:#2196f3">🔬 심화 분석</button>
          <button class="btn-secondary" onclick="closeModal();_jumpToCompare('${safeName}','${type}')" style="background:#cc44ff;color:#fff;border-color:#cc44ff" title="비교 페이지에 추가">⚖️ 비교</button>
          <button class="btn-secondary" onclick="closeModal();_jumpToMatchup('${safeName}','${type}')" style="background:#39ff8a;color:#000;border-color:#39ff8a" title="매치업 페이지로">🎮 매치업</button>
        </div>
      </div>
      <div id="card-back" style="position:absolute;top:0;left:0;right:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(180deg)">
        ${backContent}
      </div>
    </div>
  </div>`);
};

// Original index.html:8752
wbdContext.flipCard = function flipCard(){
  const inner=document.getElementById('card-flip-inner');
  if(!inner)return;
  const isFlipped=inner.dataset.flipped==='1';
  inner.style.transform=isFlipped?'rotateY(0deg)':'rotateY(180deg)';
  inner.dataset.flipped=isFlipped?'0':'1';
};

// Original index.html:8761
wbdContext.buildCardBack = function buildCardBack(name,type,card){
  const safeName=String(name).replace(/'/g,"\\'").replace(/"/g,'\\"');
  let html=`<div style="text-align:center;margin-bottom:14px">
    <div style="display:flex;justify-content:center;gap:10px;margin-bottom:10px">
      <button onclick="event.stopPropagation();flipCard()" style="background:#2196f3;border:1px solid #2196f3;color:#fff;font-size:13px;cursor:pointer;padding:3px 10px;border-radius:4px">🔄 앞면</button>
    </div>
    <div style="display:flex;justify-content:center;margin-bottom:6px">${wbdContext.getAvatarHTML(name, 56)}</div>
    <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px">${name}</div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">상세 통계</div>
  </div>`;
  
  if(type==='pitcher'){
    // 투수 뒷면: ERA/WHIP/IP 누적 + 상대 좌/우 스플릿 + 카운트별 K/BB
    const _ps=wbdContext._getPitcherSeason(name);
    const totalIp=_ps.ip, totalRuns=_ps.runs, totalH=_ps.hits, totalHr=_ps.hrs;
    const totalK=_ps.ks, totalBB=_ps.bbs, totalOuts=_ps.outs, totalPit=_ps.pitches, games=_ps.games;
    const era=totalIp>0?_ps.era.toFixed(2):'-';
    const whip=totalIp>0?_ps.whip.toFixed(2):'-';
    const ipDisp=_ps.ipDisp;
    const kbb=totalBB>0?(totalK/totalBB).toFixed(2):(totalK>0?'∞':'-');
    
    // 추가 정보: 평균/최고 구속, 헛스윙%, 손잡이
    const allP=wbdContext.getPitcherDataByName(name);
    const fbGroups=['포심','투심','커터','패스트볼'];
    const fbSpds=allP.filter(d=>+d.spdK>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.spdK);
    const avgFb=fbSpds.length?(fbSpds.reduce((a,b)=>a+b,0)/fbSpds.length):0;
    const maxFb=fbSpds.length?Math.max(...fbSpds):0;
    const sw=allP.filter(d=>d.bSwing).length;
    const wh=allP.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    const whiffPct=sw?(wh/sw*100):0;
    const hand=allP[0]?.pHand||'?';
    const handLabel=hand==='L'?'좌투':hand==='R'?'우투':hand;
    // 구종 다양성
    const pitchTypes=new Set(allP.map(d=>wbdContext.pitchGroup(d.pType,d)));
    pitchTypes.delete('기타');
    
    // 좌/우 타자 상대 (bZone 사용)
    const vsR=allP.filter(d=>String(d.bZone).toUpperCase()==='R');
    const vsL=allP.filter(d=>String(d.bZone).toUpperCase()==='L');
    const splitStat=(arr)=>{
      // 표준 BA 계산 (AB = 인플레이 + K)
      const hits = arr.filter(wbdContext._isHit).length;
      const ab = arr.filter(d => {
        const r=+d.result;
        return wbdContext._isABPitch(d);
      }).length;
      const ba = ab > 0 ? hits/ab : 0;
      const hr = arr.filter(d => +d.result===4).length;
      const bd = arr.filter(wbdContext._isInPlay);
      return {n:arr.length, ab, bd:bd.length, ba, hr};
    };
    const r=splitStat(vsR), l=splitStat(vsL);
    
    // 손잡이 + 구종 다양성 표시
    html+=`<div style="text-align:center;margin-bottom:12px">
      <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:#1a2a40;border:1px solid var(--border);border-radius:12px;font-size:11px">
        <span style="color:#aa88ff;font-weight:700">${handLabel}</span>
        <span style="color:var(--muted)">·</span>
        <span style="color:#88ccff">구종 ${pitchTypes.size}종</span>
      </span>
    </div>`;
    
    // 잠재 구속 (pPow → km/h, 개별 변환 후 평균 - 룩업 테이블 비선형 손실 방지)
    const fbPows=allP.filter(d=>+d.pPow>0&&fbGroups.includes(wbdContext.pitchGroup(d.pType,d))).map(d=>+d.pPow);
    const fbKmhs=fbPows.map(p=>wbdContext._ppowToKmh(p));  // 개별 변환
    const uncappedAvg=fbKmhs.length?fbKmhs.reduce((a,b)=>a+b,0)/fbKmhs.length:0;
    const maxFbPow=fbPows.length?fbPows.reduce((a,b)=>Math.max(a,b),0):0;
    const uncappedMax=maxFbPow>0?wbdContext._ppowToKmh(maxFbPow):0;
    
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px;margin-bottom:14px;padding:12px;background:#0a1828;border:1px solid var(--border);border-radius:6px">
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">등판</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${games}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">IP</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#39ff8a">${ipDisp}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">ERA</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff4560">${era}</div></div>
      ${(()=>{ // V11.5: ERA+ (100=리그평균, 높을수록 좋음)
        try{
          const _L=(wbdContext._computeRecordsData()||{}).lg;
          const _lg=(_L&&_L.lgRA9>0)?_L.lgRA9:0;
          const _e=parseFloat(era);
          if(!_lg||!isFinite(_e)||_e<=0) return '';
          const _ep=_lg/_e*100;
          const _c=_ep>=130?'#39ff8a':_ep>=110?'#88cc44':_ep>=90?'var(--text)':_ep>=70?'#ff8800':'#ff4560';
          return `<div title="리그평균 RA9 ${_lg.toFixed(2)} 대비"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">ERA+</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:${_c}">${_ep.toFixed(0)}</div></div>`;
        }catch(_){ return ''; }
      })()}
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">WHIP</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff8800">${whip}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">실점</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${totalRuns}</div></div>
      ${totalIp>0?`<div title="9이닝당 실점 — pWAR 산출 기반"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">RA9</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff9966">${(totalRuns/totalIp*9).toFixed(2)}</div></div>`:''}
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">K</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff8800">${totalK}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">BB</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${totalBB}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">K/BB</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#88cc44">${kbb}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">피안타</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${totalH}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">피HR</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff4560">${totalHr}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">평균직구</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ffcc44">${avgFb?avgFb.toFixed(1):'-'}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">최고구속</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff6b8a">${maxFb||'-'}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">헛스윙%</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#aa88ff">${whiffPct.toFixed(0)}%</div></div>
      <div title="pPow 기반 환산 (캡 없을 때 추정)"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">🌟 잠재구속</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#cc88ff">${uncappedAvg?uncappedAvg.toFixed(1):'-'}</div></div>
      <div title="pPow 최대값 기반 환산"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">⚡ 잠재최고</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff44cc">${uncappedMax?uncappedMax.toFixed(1):'-'}</div></div>
    </div>`;
    
    // 좌/우 타자 상대 split
    if(r.n>0||l.n>0){
      html+=`<div style="margin-bottom:14px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;text-transform:uppercase">상대 좌타/우타</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="padding:10px;background:#0a1828;border:1px solid var(--border);border-radius:4px">
            <div style="font-size:10px;color:#ff8800;font-weight:700">vs 우타 (${r.n}구)</div>
            <div style="font-family:var(--mono);font-size:14px">피BA <b>${r.ba.toFixed(3).replace(/^0/,'')}</b> · HR ${r.hr}</div>
          </div>
          <div style="padding:10px;background:#0a1828;border:1px solid var(--border);border-radius:4px">
            <div style="font-size:10px;color:#39ff8a;font-weight:700">vs 좌타 (${l.n}구)</div>
            <div style="font-family:var(--mono);font-size:14px">피BA <b>${l.ba.toFixed(3).replace(/^0/,'')}</b> · HR ${l.hr}</div>
          </div>
        </div>
      </div>`;
    }
    
    // 카운트별 K/BB 패턴
    const counts={'유리':allP.filter(d=>d.strk>d.ball),'평형':allP.filter(d=>d.strk===d.ball),'불리':allP.filter(d=>d.ball>d.strk)};
    html+=`<div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;text-transform:uppercase">카운트별 결과</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">`;
    Object.entries(counts).forEach(([label,arr])=>{
      const ks=arr.filter(d=>wbdContext._isK(d)).length;
      const bbs=arr.filter(d=>+d.result===5).length;
      html+=`<div style="padding:8px;background:#0a1828;border:1px solid var(--border);border-radius:4px;text-align:center">
        <div style="font-size:10px;color:var(--muted)">${label}</div>
        <div style="font-family:var(--mono);font-size:13px;font-weight:700">${arr.length}구</div>
        <div style="font-size:10px;color:#ff8800">K ${ks}</div>
        <div style="font-size:10px;color:#88cc44">BB ${bbs}</div>
      </div>`;
    });
    html+='</div></div>';
    
  }else{
    // 타자 뒷면: 시즌 누적 + 상대 좌/우 투수 + 카운트별 BA
    const _bs=wbdContext._getBatterSeason(name);
    // V10.2: 1·2·3루타는 기록실 advanced(베이스 추적)에서 정밀값 보강
    try{
      const _rb=wbdContext._computeRecordsData().batters.find(b=>b.name===name);
      if(_rb){ _bs.h1B=_rb.h1B; _bs.h2B=_rb.h2B; _bs.h3B=_rb.h3B; }
    }catch(e){}
    const totalAB=_bs.ab, totalH=_bs.hits, totalHr=_bs.hrs;
    const totalBB=_bs.bbs, totalK=_bs.ks, totalPit=_bs.pitches, games=_bs.games;
    const ba=totalAB>0?_bs.ba.toFixed(3).replace(/^0/,''):'-';
    const slg=totalAB>0?_bs.slg.toFixed(3).replace(/^0/,''):'-';
    const obp=(totalAB+totalBB)>0?_bs.obp.toFixed(3).replace(/^0/,''):'-';
    
    // vs 좌/우 투수
    const allB=wbdContext.getBatterDataByName(name);
    const vsR=allB.filter(d=>d.pHand==='R');
    const vsL=allB.filter(d=>d.pHand==='L');
    const splitStat=(arr)=>{
      // 표준 BA (AB = 인플레이 + K)
      const hits = arr.filter(wbdContext._isHit).length;
      const ab = arr.filter(d => {
        const r=+d.result;
        return wbdContext._isABPitch(d);
      }).length;
      const hr = arr.filter(d => +d.result===4).length;
      const baV = ab > 0 ? hits/ab : 0;
      const bd = arr.filter(wbdContext._isInPlay);
      return {n: arr.length, ab, bd: bd.length, ba: baV, hr};
    };
    const r=splitStat(vsR), l=splitStat(vsL);
    
    // 추가: 평균 EV, HH%, HR%, 헛스윙%, 키, 손잡이
    const allBat=allB.filter(wbdContext._isInPlay);
    const allBatQ=allBat.filter(d=>!wbdContext._isBunt(d));
    const avgEV=allBatQ.length?allBatQ.reduce((a,b)=>a+(+b.ev),0)/allBatQ.length:0;
    const hhPct=allBatQ.length?allBatQ.filter(d=>wbdContext._isHardHit(d)).length/allBatQ.length*100:0;
    const hrPct=allBat.length?totalHr/allBat.length*100:0;
    const sw=allB.filter(d=>d.bSwing).length;
    const wh=allB.filter(d=>d.bSwing&&(!d.ev||+d.ev===0)).length;
    const whiffPct=sw?wh/sw*100:0;
    // 평균 비거리 (실측)
    const dists=allBatQ.filter(d=>(+d.lx||0)!==0||(+d.lz||0)!==0).map(d=>Math.sqrt((+d.lx)**2+(+d.lz)**2));
    const avgDist=dists.length?dists.reduce((a,b)=>a+b,0)/dists.length:0;
    const maxDist=dists.length?Math.max(...dists):0;
    
    const height=allB[0]?+allB[0].bHCm:0;
    // bZone 사용 (가장 빈도 높은 값)
    const bZoneCounts={};
    allB.forEach(d=>{const z=String(d.bZone).toUpperCase();if(z==='L'||z==='R')bZoneCounts[z]=(bZoneCounts[z]||0)+1;});
    const bZoneTop=Object.entries(bZoneCounts).sort((a,b)=>b[1]-a[1])[0];
    const batLabel=bZoneTop?(bZoneTop[0]==='L'?'좌타':'우타'):'?';
    
    // 손잡이 + 키 표시
    html+=`<div style="text-align:center;margin-bottom:12px">
      <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:#1a2a40;border:1px solid var(--border);border-radius:12px;font-size:11px">
        <span style="color:#39ff8a;font-weight:700">${batLabel}</span>
        ${height?`<span style="color:var(--muted)">·</span><span style="color:#88ccff">${height}cm</span>`:''}
      </span>
    </div>`;
    
    html+=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(80px,1fr));gap:10px;margin-bottom:14px;padding:12px;background:#0a1828;border:1px solid var(--border);border-radius:6px">
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">출장</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${games}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">타석</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${totalAB+totalBB}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">타수</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${totalAB}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">안타</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#39ff8a">${totalH}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">HR</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ffd700">${totalHr}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">타율</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#39ff8a">${ba}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">장타율</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff8800">${slg}</div></div>
      <div title="OPS = 출루율 + 장타율"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">OPS</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#cc66ff">${totalAB>0?_bs.ops.toFixed(3).replace(/^0/,''):'-'}</div></div>
      <div title="1루타·2루타·3루타"><div style="font-size:9px;color:var(--muted);text-transform:uppercase">1·2·3루타</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#88ccaa">${_bs.h1B??'-'}·${_bs.h2B??'-'}·${_bs.h3B??'-'}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">출루율</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#88cc44">${obp}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">BB</div><div style="font-family:var(--mono);font-size:16px;font-weight:700">${totalBB}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">K</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff8800">${totalK}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">평균 EV</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ffcc44">${avgEV?avgEV.toFixed(1):'-'}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">HH%</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff6b8a">${hhPct.toFixed(0)}%</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">HR%</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ffd700">${hrPct.toFixed(1)}%</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">헛스윙%</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#aa88ff">${whiffPct.toFixed(0)}%</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">평균비거리</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#88ccff">${avgDist?avgDist.toFixed(0):'-'}</div></div>
      <div><div style="font-size:9px;color:var(--muted);text-transform:uppercase">최장비거리</div><div style="font-family:var(--mono);font-size:16px;font-weight:700;color:#ff8800">${maxDist?maxDist.toFixed(0):'-'}</div></div>
    </div>`;
    
    if(r.n>0||l.n>0){
      html+=`<div style="margin-bottom:14px">
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px;text-transform:uppercase">상대 좌투/우투</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="padding:10px;background:#0a1828;border:1px solid var(--border);border-radius:4px">
            <div style="font-size:10px;color:#ff8800;font-weight:700">vs 우투 (${r.n}구)</div>
            <div style="font-family:var(--mono);font-size:14px">BA <b>${r.ba.toFixed(3).replace(/^0/,'')}</b> · HR ${r.hr}</div>
          </div>
          <div style="padding:10px;background:#0a1828;border:1px solid var(--border);border-radius:4px">
            <div style="font-size:10px;color:#39ff8a;font-weight:700">vs 좌투 (${l.n}구)</div>
            <div style="font-family:var(--mono);font-size:14px">BA <b>${l.ba.toFixed(3).replace(/^0/,'')}</b> · HR ${l.hr}</div>
          </div>
        </div>
      </div>`;
    }
    
    // 카운트별 타율
    const counts={'유리':allB.filter(d=>d.ball>d.strk),'평형':allB.filter(d=>d.ball===d.strk),'불리':allB.filter(d=>d.strk>d.ball)};
    html+=`<div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:6px;text-transform:uppercase">카운트별 결과</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">`;
    Object.entries(counts).forEach(([label,arr])=>{
      // 표준 BA (AB = 인플레이 + K)
      const hits = arr.filter(wbdContext._isHit).length;
      const ab = arr.filter(d => {
        const r=+d.result;
        return wbdContext._isABPitch(d);
      }).length;
      const cBa = ab > 0 ? (hits/ab).toFixed(3).replace(/^0/,'') : '-';
      const bd = arr.filter(wbdContext._isInPlay);
      html+=`<div style="padding:8px;background:#0a1828;border:1px solid var(--border);border-radius:4px;text-align:center">
        <div style="font-size:10px;color:var(--muted)">${label}</div>
        <div style="font-family:var(--mono);font-size:13px;font-weight:700">${ab}타수</div>
        <div style="font-family:var(--mono);font-size:11px;color:#39ff8a">BA ${cBa}</div>
      </div>`;
    });
    html+='</div></div>';
  }
  
  return html;
};

// Original index.html:9022
wbdContext._textForBg = function _textForBg(rgbStr){
  const m=rgbStr.match(/\d+/g);
  if(!m)return '#fff';
  const [r,g,b]=m.map(Number);
  // 밝기 (Luminance 근사)
  const l=(r*299+g*587+b*114)/1000;
  return l>170?'#222':'#fff';
};

// Original index.html:9033
wbdContext._hotColdPalette = function _hotColdPalette(t){
  t=Math.max(0,Math.min(1,t));
  // V11.3: 중간값이 흰색이라 평균권 셀이 배경과 구분 안 되던 문제 수정
  //   0=진파랑 → 0.5=중간톤 회보라(흰색 아님) → 1=진빨강
  //   양끝 채도를 높이고 중앙을 어둡게 해서 어떤 값이든 대비 확보
  let R,G,B;
  if(t<0.5){
    const k=t/0.5;                      // 0→0.5
    R=Math.round(30+(120-30)*k);
    G=Math.round(85+(120-85)*k);
    B=Math.round(200+(145-200)*k);
  } else {
    const k=(t-0.5)/0.5;                // 0.5→1
    R=Math.round(120+(210-120)*k);
    G=Math.round(120+(50-120)*k);
    B=Math.round(145+(55-145)*k);
  }
  return`rgb(${R},${G},${B})`;
};

// Original index.html:9053
wbdContext._absHotScore = function _absHotScore(metric,v){
  if(v===null||v===undefined)return 0.5;
  if(metric==='avg'){
    // 타율: 0.150=콜드, 0.300=중립, 0.500=핫
    if(v<=0.150)return 0;
    if(v>=0.500)return 1;
    if(v<=0.300)return (v-0.150)/0.150*0.5;
    return 0.5+(v-0.300)/0.200*0.5;
  }
  if(metric==='slg'){
    // 장타율: 0.250=콜드, 0.450=중립, 0.800=핫
    if(v<=0.250)return 0;
    if(v>=0.800)return 1;
    if(v<=0.450)return (v-0.250)/0.200*0.5;
    return 0.5+(v-0.450)/0.350*0.5;
  }
  if(metric==='ev'){
    // EV: 80=콜드, 95=중립, 115=핫
    if(v<=80)return 0;
    if(v>=115)return 1;
    if(v<=95)return (v-80)/15*0.5;
    return 0.5+(v-95)/20*0.5;
  }
  if(metric==='whiff'){
    // 헛스윙률: 타자 관점에서 낮을수록 좋음 → 높을수록 콜드로 표시 (타자가 헛스윙 많이 = 그 존이 콜드)
    // 0.15=핫(컨택잘됨, 타자입장 좋음), 0.30=중립, 0.50=콜드
    if(v<=0.15)return 1;
    if(v>=0.50)return 0;
    if(v<=0.30)return 1-(v-0.15)/0.15*0.5;
    return 0.5-(v-0.30)/0.20*0.5;
  }
  if(metric==='count'){
    // 투구 빈도: 빈도 높을수록 핫(자주 던짐) - 상대 정규화 유지용
    return v;
  }
  return 0.5;
};
}

export function initialize(wbdContext) {
// Original index.html:8123
window._teamGroupTab='teams';

// Original index.html:8124
window._teamSearchQuery='';

// Original index.html:8125
window._teamFilterMode='all';

// Original index.html:8428
window._editingGroupId=null;

// Original index.html:8590
window._tgSearchDebounce = null;
}
