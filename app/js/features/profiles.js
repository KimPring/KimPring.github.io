/** profiles: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:1768
wbdContext._savePlayerAliases = function _savePlayerAliases(){try{localStorage.setItem('wbd_player_aliases',JSON.stringify(window.PLAYER_ALIAS_USER||{}));localStorage.setItem('wbd_player_aliases_disabled',JSON.stringify(window.PLAYER_ALIAS_DISABLED||[]));}catch(e){console.warn('저장 실패:',e);}};

// Original index.html:1771
wbdContext._buildPlayerAliasMap = function _buildPlayerAliasMap(){
  const merged = Object.assign({}, window.PLAYER_ALIAS_PRESET||{}, window.PLAYER_ALIAS_USER||{});
  // 유저가 해제한 병합 제거 (옛이름을 맵에서 빼면 원래대로 따로 남음)
  const disabled = window.PLAYER_ALIAS_DISABLED||[];
  disabled.forEach(oldName=>{ delete merged[String(oldName)]; });
  // 체인 해소: 옛이름→중간이름→최신이름 이면 옛이름→최신이름으로 평탄화
  const resolve=(name, seen)=>{
    seen=seen||new Set();
    if(seen.has(name)) return name; // 순환 방지
    seen.add(name);
    const to=merged[name];
    if(to && to!==name) return resolve(to, seen);
    return name;
  };
  const flat={};
  for(const k in merged){ flat[k]=resolve(k); }
  return flat;
};

// Original index.html:1792
wbdContext._canonPlayer = function _canonPlayer(name){
  if(name==null) return name;
  const s=String(name);
  const m=window._playerAliasMap||{};
  return m[s]||s;
};

// Original index.html:1801
wbdContext.playerMergeAdd = function playerMergeAdd(oldName, newName){
  if(!oldName||!newName||String(oldName)===String(newName)) return false;
  window.PLAYER_ALIAS_USER=window.PLAYER_ALIAS_USER||{};
  window.PLAYER_ALIAS_USER[String(oldName)]=String(newName);
  // 혹시 해제 목록에 있었으면 제거 (다시 병합)
  window.PLAYER_ALIAS_DISABLED=(window.PLAYER_ALIAS_DISABLED||[]).filter(n=>String(n)!==String(oldName));
  wbdContext._savePlayerAliases(); window._playerAliasMap=wbdContext._buildPlayerAliasMap();
  if(window._cache) window._cache.key=null;  // 캐시 무효화 → 재집계
  return true;
};

// Original index.html:1812
wbdContext.playerMergeDisable = function playerMergeDisable(oldName){
  if(!oldName) return false;
  const s=String(oldName);
  // 유저 설정이면 그냥 삭제, 사전 설정이면 해제 목록에 추가
  if(window.PLAYER_ALIAS_USER && window.PLAYER_ALIAS_USER[s]){ delete window.PLAYER_ALIAS_USER[s]; }
  if(window.PLAYER_ALIAS_PRESET && window.PLAYER_ALIAS_PRESET[s]){
    window.PLAYER_ALIAS_DISABLED=window.PLAYER_ALIAS_DISABLED||[];
    if(!window.PLAYER_ALIAS_DISABLED.map(String).includes(s)) window.PLAYER_ALIAS_DISABLED.push(s);
  }
  wbdContext._savePlayerAliases(); window._playerAliasMap=wbdContext._buildPlayerAliasMap();
  if(window._cache) window._cache.key=null;
  return true;
};

// Original index.html:1826
wbdContext.playerMergeEnable = function playerMergeEnable(oldName){
  const s=String(oldName);
  window.PLAYER_ALIAS_DISABLED=(window.PLAYER_ALIAS_DISABLED||[]).filter(n=>String(n)!==s);
  wbdContext._savePlayerAliases(); window._playerAliasMap=wbdContext._buildPlayerAliasMap();
  if(window._cache) window._cache.key=null;
  return true;
};

// Original index.html:1834
wbdContext.playerMergeList = function playerMergeList(){
  const map=window._playerAliasMap||{};
  const disabled=(window.PLAYER_ALIAS_DISABLED||[]).map(String);
  const rows=[];
  for(const old in map){ rows.push({old, now:map[old], source:(window.PLAYER_ALIAS_USER&&window.PLAYER_ALIAS_USER[old])?'user':'preset'}); }
  // 해제된 사전 설정도 표시 (꺼진 상태로)
  for(const old in (window.PLAYER_ALIAS_PRESET||{})){ if(disabled.includes(old)) rows.push({old, now:window.PLAYER_ALIAS_PRESET[old], source:'preset', disabled:true}); }
  return rows;
};

// Original index.html:1844
wbdContext._saveManualTeams = function _saveManualTeams(){try{localStorage.setItem('wbd_manual_teams',JSON.stringify(window.MANUAL_TEAMS||{}));}catch(e){console.warn('저장 실패:',e);}};

// Original index.html:1845
wbdContext._savePlayerGroups = function _savePlayerGroups(){try{localStorage.setItem('wbd_player_groups',JSON.stringify(window.PLAYER_GROUPS||{groups:[]}));}catch(e){console.warn('저장 실패:',e);}};

// Original index.html:1848
wbdContext._playerGroups = function _playerGroups(name){
  const groups=window.PLAYER_GROUPS?.groups||[];
  return groups.filter(g=>(g.members||[]).includes(String(name)));
};

// Original index.html:1854
wbdContext._autoTeam = function _autoTeam(name,type){
  const cached = window._cache.autoTeam[String(name)+'|'+type];
  if(cached) return cached;
  // 캐시 미스 시 직접 계산 (보통 발생 안 함)
  const teamCnt={};
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    g.pitches.forEach(d=>{
      const playerName=type==='pitcher'?d.pName:d.bName;
      if(String(playerName)!==String(name))return;
      let team;
      if(type==='batter')team=d.half===1?info.teamA:info.teamB;
      else team=d.half===1?info.teamB:info.teamA;
      team=wbdContext._normalizeTeam(team);
      if(team)teamCnt[team]=(teamCnt[team]||0)+1;
    });
  });
  const sorted=Object.entries(teamCnt).sort((a,b)=>b[1]-a[1]);
  return sorted.length?sorted[0][0]:'—';
};

// Original index.html:1934
wbdContext._getNormalizedDefaultMap = function _getNormalizedDefaultMap(){
  if(wbdContext._normalizedDefaultCache) return wbdContext._normalizedDefaultCache;
  wbdContext._normalizedDefaultCache = {};
  const norm = window._normalizePfpName;
  for(const [name, idx] of Object.entries(window.WBD_PFP_INDEX_DEFAULT || {})){
    const k = norm(name);
    // 첫 매칭 우선 (충돌 시 무시)
    if(k && wbdContext._normalizedDefaultCache[k] === undefined){
      wbdContext._normalizedDefaultCache[k] = idx;
    }
  }
  return wbdContext._normalizedDefaultCache;
};

// Original index.html:1974
wbdContext.getPhotoUrl = function getPhotoUrl(name){
  if(!name) return null;
  // V10.1: 우선순위 변경 — 서버에서 받는 게 최신이라 우선, 로컬은 폴백
  // 1순위: WBD 공식 프로필 인덱스 (기본 + localStorage 커스텀 + 정규화 매칭)
  //   서버에서 자동 동기화 — 게임에서 사진 바꾸면 즉시 반영
  const idx = window._getPfpIndex(name);
  if(idx && idx > 0){
    return `https://images.vrcbaseball.com/pfp/${idx}.png`;
  }
  // 2순위: 로컬 PROFILE_MAP (profile_map.js의 profile/ 폴더) — 서버 매핑 없을 때 폴백
  if(window.PROFILE_MAP && window.PROFILE_MAP[name]){
    return `profile/${window.PROFILE_MAP[name]}`;
  }
  return null;
};

// Original index.html:1992
wbdContext._silhouetteSVG = function _silhouetteSVG(size){
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="display:block">
    <defs>
      <linearGradient id="silbg-${size}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a2438"/>
        <stop offset="100%" stop-color="#0f1828"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#silbg-${size})"/>
    <circle cx="50" cy="38" r="16" fill="#3a4560"/>
    <path d="M 20,100 Q 20,65 50,62 Q 80,65 80,100 Z" fill="#3a4560"/>
  </svg>`;
};

// Original index.html:2007
wbdContext.getAvatarHTML = function getAvatarHTML(name, size=48){
  if(!name) return '';
  const url=wbdContext.getPhotoUrl(name);
  const baseStyle=`width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;background:#0f1828;border:2px solid var(--border)`;
  const silhouette=wbdContext._silhouetteSVG(size);
  if(url){
    // 이미지 + 로드 실패시 실루엣으로 자동 fallback
    return `<span class="avatar" style="${baseStyle}">
      <img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${url}" style="width:100%;height:100%;object-fit:cover;display:block" 
           onerror="this.parentNode.innerHTML='${silhouette.replace(/'/g,"&#39;").replace(/"/g,"&quot;")}'">
    </span>`;
  }
  // 실루엣
  return `<span class="avatar" style="${baseStyle}">${silhouette}</span>`;
};

// Original index.html:2024
wbdContext._showOvrLegend = function _showOvrLegend(){
  const tiers=[
    {min:110,name:'레전드',color:'#ff2020',desc:'역대급 - 매우 드문 등급'},
    {min:105,name:'아이콘',color:'#ff5500',desc:'시즌 MVP급'},
    {min:100,name:'슈퍼스타',color:'#ff8800',desc:'리그 최정상'},
    {min:90, name:'올스타',color:'#ffe033',desc:'올스타 후보 - 골드'},
    {min:80, name:'엘리트',color:'#cc44ff',desc:'주전급 - 보라'},
    {min:70, name:'스타터',color:'#2196f3',desc:'평균 이상 - 파랑'},
    {min:60, name:'유망주',color:'#39ff8a',desc:'성장 가능성 - 초록'},
    {min:0,  name:'벤치',color:'#5a7a9a',desc:'기본'}
  ];
  let html=`<div style="max-width:520px">
    <h2 style="margin:0 0 14px;color:var(--amber)">🎨 OVR 등급 색상 가이드</h2>
    <div style="font-size:12px;color:var(--muted);margin-bottom:14px">선수 카드 테두리/숫자 색상은 OVR 점수에 따라 결정됩니다.</div>
    <div style="display:grid;gap:6px">
      ${tiers.map(t=>`<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--card2);border-radius:6px;border-left:4px solid ${t.color}">
        <div style="font-family:var(--mono);font-weight:900;font-size:18px;color:${t.color};min-width:60px">${t.min}+</div>
        <div style="flex:1">
          <div style="font-weight:700;color:${t.color}">${t.name}</div>
          <div style="font-size:11px;color:var(--muted)">${t.desc}</div>
        </div>
      </div>`).join('')}
    </div>
    <div style="margin-top:14px;padding:10px 14px;background:var(--card2);border-radius:6px;font-size:12px;color:var(--muted);border-left:3px solid #4a7aaa">
      <div style="margin-bottom:4px"><span style="color:#4a7aaa">📊</span> <b>데이터 부족</b>: 점선 테두리로 표시. 표본이 적어 신뢰도가 낮은 선수입니다.</div>
      <div>WAR이 음수인 경우는 평균 이하 활약을 의미합니다.</div>
    </div>
  </div>`;
  wbdContext.openModal(html);
};

// Original index.html:2055
wbdContext.diagnoseProfile = function diagnoseProfile(){
  const map=window.PROFILE_MAP||{};
  const keys=Object.keys(map);
  const loaded=window._PROFILE_MAP_LOADED;
  const url=window.location.href;
  const isFile=url.startsWith('file://');
  
  // 매핑된 사진 로드 테스트
  const samples=keys.slice(0,5);
  const tests=samples.map(n=>{
    return new Promise(res=>{
      const path=`profile/${map[n]}`;
      const img=new Image();
      img.onload=()=>res({name:n, file:map[n], path, ok:true});
      img.onerror=()=>res({name:n, file:map[n], path, ok:false});
      img.src=path;
      setTimeout(()=>res({name:n, file:map[n], path, ok:false, timeout:true}),3000);
    });
  });
  
  Promise.all(tests).then(results=>{
    let html=`<div style="text-align:left;font-family:var(--mono);font-size:12px">
      <h2 style="text-align:center;color:var(--amber);margin:0 0 16px">🩺 프로필 사진 진단</h2>
      
      <div style="background:#1a1230;border-left:3px solid #aa88ff;padding:12px;margin-bottom:14px">
        <div style="color:#aa88ff;font-weight:700;margin-bottom:6px">📂 파일 위치</div>
        <div>현재 URL: <code style="color:#88ff88">${url}</code></div>
        <div style="margin-top:6px;color:${isFile?'var(--warn)':'var(--accent)'}">${isFile?'⚠ file:// 직접 열기 (사진 로드 가능, 일부 기능 제한)':'✓ 서버 모드 (모든 기능 정상)'}</div>
      </div>
      
      <div style="background:${loaded?'#0a3a1a':'#3a1a1a'};border-left:3px solid ${loaded?'#39ff8a':'#ff4560'};padding:12px;margin-bottom:14px">
        <div style="font-weight:700;margin-bottom:6px">📜 profile_map.js 상태</div>
        <div>로드됨: <b style="color:${loaded?'#39ff8a':'#ff4560'}">${loaded?'✓ YES':'✗ NO'}</b></div>
        <div>매핑 수: <b>${keys.length}</b>개</div>
        ${!loaded?`<div style="margin-top:6px;color:var(--warn);font-size:11px">⚠ profile_map.js가 분석기와 같은 폴더에 있는지 확인해주세요</div>`:''}
      </div>
      
      <div style="background:#1a2030;border-left:3px solid #88ccff;padding:12px;margin-bottom:14px">
        <div style="color:#88ccff;font-weight:700;margin-bottom:6px">🖼️ 사진 로드 테스트 (처음 ${results.length}명)</div>
        ${results.length===0?'<div style="color:var(--muted)">테스트할 매핑이 없어요</div>':results.map(r=>`
          <div style="padding:6px 0;border-bottom:1px solid #2a3550;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">${r.ok?'✓':'✗'}</span>
            <div style="flex:1">
              <div><b>${r.name}</b> → <code style="color:#88ff88">${r.path}</code></div>
              <div style="color:${r.ok?'#39ff8a':'#ff4560'};font-size:10px">${r.ok?'사진 정상 로드됨':r.timeout?'시간 초과':'파일을 찾을 수 없음 (경로/파일명/대소문자 확인)'}</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div style="background:#1a2030;border-left:3px solid var(--amber);padding:12px;font-size:11px;line-height:1.7">
        <div style="font-weight:700;color:var(--amber);margin-bottom:6px">🔍 체크리스트</div>
        <div>1. 분석기.html과 같은 폴더에 <code style="color:#88ff88">profile_map.js</code> 있는지</div>
        <div>2. 같은 폴더에 <code style="color:#88ff88">profile/</code> 폴더 있는지</div>
        <div>3. profile_map.js의 파일명과 실제 파일명이 <b>대소문자까지</b> 일치하는지</div>
        <div>4. 한글 파일명: 가능하면 영문으로 변경 (일부 시스템에서 인코딩 문제)</div>
        <div>5. 브라우저 새로고침: <b>Ctrl+F5</b> (캐시 무시)</div>
        <div>6. <b>Chrome 보안 정책:</b> file://에서 막힐 수 있음 → 새 시크릿 창에서 시도, 또는 Firefox로 열기</div>
      </div>
    </div>`;
    
    if(typeof wbdContext.openModal==='function'){
      wbdContext.openModal(html);
    } else {
      // openModal 안 만들어진 경우 콘솔에 출력
      console.table(results);
      alert('진단 결과: F12 콘솔 확인');
    }
  });
};
}

export function initialize(wbdContext) {
// Original index.html:1677
window.PROFILE_MAP=window.PROFILE_MAP||{};

// Original index.html:1678
window._PROFILE_MAP_LOADED=false;

// Original index.html:1679
window._PROFILE_MAP_SOURCE='없음';

// Original index.html:1682
try {
  const saved = localStorage.getItem('wbd_profile_map');
  if(saved){
    const obj = JSON.parse(saved);
    if(obj && typeof obj === 'object'){
      window.PROFILE_MAP = obj;
      window._PROFILE_MAP_LOADED = true;
      window._PROFILE_MAP_SOURCE = 'localStorage 백업';
      console.log('✓ profile_map localStorage에서 로드됨, '+Object.keys(obj).length+'개');
    }
  }
} catch(e){ console.warn('localStorage 읽기 실패:', e); }

// Original index.html:1752
window.MANUAL_TEAMS=(()=>{try{return JSON.parse(localStorage.getItem('wbd_manual_teams')||'{}');}catch(e){return {};}})();

// Original index.html:1753
window.PLAYER_GROUPS=(()=>{try{return JSON.parse(localStorage.getItem('wbd_player_groups')||'{"groups":[]}');}catch(e){return {groups:[]};}})();

// Original index.html:1759
window.PLAYER_ALIAS_PRESET = {
  // 오른쪽(값)이 최신 닉네임. 왼쪽(키)이 옛이름/다른계정.
  "あいくんだよー": "あいくんだよー『아이 군』",   // 아이쿤 닉변 (한국어 포함이 최신)
  "にゃんこ3K": "にゃんこ65K",                      // 냥코 닉변 (65K가 최신)
  "오띵__": "낑깡__"                                 // 오띵/낑깡 동일인 계정변경 (낑깡이 최신)
};

// Original index.html:1765
window.PLAYER_ALIAS_USER=(()=>{try{return JSON.parse(localStorage.getItem('wbd_player_aliases')||'{}');}catch(e){return {};}})();

// Original index.html:1767
window.PLAYER_ALIAS_DISABLED=(()=>{try{return JSON.parse(localStorage.getItem('wbd_player_aliases_disabled')||'[]');}catch(e){return [];}})();

// Original index.html:1789
window._playerAliasMap = wbdContext._buildPlayerAliasMap();

// Original index.html:1876
wbdContext.GROUP_PALETTE = ['#ffd700','#ff8c44','#ff4560','#ff6b8a','#cc44ff','#2196f3','#44aaff','#39ff8a','#88cc44','#ffdd44','#888','#fff'];

// Original index.html:1877
wbdContext.GROUP_ICONS = ['⭐','👑','🔥','⚔️','🎯','🛡️','💎','⚡','🌟','🏆','🥇','👻','💪','🎭'];

// Original index.html:1886
window.WBD_PFP_INDEX_DEFAULT = {"keiraiden":124,"明智ナオユキ":129,"檸檬の残骸":130,"わかなで":135,"「yune」":145,"_AKASATA_":146,"木賊（とくさ）":147,"うるの。":152,"まりびあ":154,"tsubasa_jp":156,"SFIDA":157,"Ruby0212":162,"如月テト":163,"あいくんだよー『아이 군』":164,"ぐだもん":166,"siesta_aves":170,"雪川かな":174,"alcohol500":176,"神崎漣 -れん-":178,"shuwaYNZ":383,"天夜（AmayaINS）":202,"shimenawa":205,"sano jpn":210,"なおｐ--":219,"それいゆ るな":235,"メリニット":253,"須磨-suma-":273,"ディシジョン":274,"Ainy4／あいにゃ":277,"わだ、、":278,"Mr․D VRC":279,"碧喘イシュ":281,"ココローグ（cocolog）":282,"ぉじぉじ":290,"ibqrqki":291,"まととまと":292,"鳴海_narumi":302,"P0TA0":309,"なぎっちゅ。":310,"?tarutaru¿":311,"にゃんこ3K":313,"Metalu":315,"kotatu_yowai":317,"clario_claelu":323,"aura_5599":325,"ame_3":328,"こうた_318":338,"Heb1zame":352,"濃いめのラー油":380,"Himajinは暇人":353,"Muna_328":374,"HANA_ARASHI":101,"Pring__":102,"Slaris":103,"Gonyong":104,"ByeolBam":105,"Kr_Luna":106,"ke ro":107,"눈꽃":108,"-라후이-":109,"오띵__":111,"Espressο":112,"DoYaGee":113,"muyang_":116,"Dοpi":117,"장덕춘_":118,"ゆっち一":119,"인생최패망자":120,"-Alta-":121,"bdg06213":122,"Sabo_10":123,"Fresh825":125,"Chunsik03":126,"SOM_candy":127,"Roscosmos":131,"HalF_HearteD":133,"Yaksok~":134,"mochi_2929":136,"甲斐野柊太":137,"あくせる":139,"mungjungh":140,"쟈가리코":141,"Apple_Sherbet":142,"_Chun":144,"あおいぬ":149,"IbikiKai_JP":151,"TaeGeuk_":153,"encounter v":155,"Kenomo":160,"559：広告":161,"_앰프_":165,"Azuner":168,"Penguin_iDOL":169,"紅さかな":171,"CAT tourniquet":172,"vovopo 보보포":173,"Oort__Cloud":175,"卯月満開":180,"_이누_":183,"カズティー":188,"Megu3568":199,"しろくま。":203,"ʚEveɞ":206,"peperon8656":211,"Pizzallaris":212,"Multeinn":213,"coder_":217,"CVPileMaki":218,"Pugeuk":222,"D_arling":223,"˗ˋˏ 카피 ˎˊ˗":228,"편하비_":231,"WhiteMountain":232,"아침땅_":233,"アリアル":238,"ʚneul_ɞ":241,"즉석카레":244,"RiyaJ":268,"とりらむ":280,"柴山犬吉":284,"magimari":320,"낑깡__":326,"NABIMan":339,"소솨소솨":143,"3Ducks":267,"Yuume":324,"schmoneymikey":327,"?fredo?":329,"YukihiroD":332,"meepss":334,"M a x ღ":335,"ItzToai":336,"Saƅer":337,"BegForMercy":340,"DakotaSnow":341,"JayBeary":342,"Aetheryte":343,"AlexTheMango":344,"すーぱーおもちらんど":345,"ashtee842":346,"seikka":347,"hdsteve":348,"Fearless༒Tammer":349,"Luckƴ":350,"유키라_":1,"YangDoki":2,"TIFFANY0421":3,"summer030":4,"StarTree":5,"soosemi":6,"sirian_":7,"Sir_Charlee":8,"roentgenium":9,"o로즈o":10,"Nyanya-":11,"Nosferatu_Hodd":12,"nokcho_":13,"nasomi":14,"MIR_미르":15,"Ma-Wang":16,"LILPAAA":17,"JINHONiM ba7d":18,"jingburger":19,"HOBAL":20,"hinqoc":21,"Hiki King":22,"GreatMoonAroma_":23,"Gosummer12":24,"Dr Dopamine":25,"DAOMM":26,"CallyCarlyDavid":27,"beberrying":28,"히어로 레드":29,"희또__":30,"하율 옹":31,"하로하_":32,"하디아_":33,"피카온_":34,"플리 PLI":35,"큐랑513":36,"카나시 Kanashi":37,"철도왕 길버트":38,"천수이_":39,"주닝요1":40,"제갈 통":41,"저스트 조":42,"임도킹입니다":43,"인디언 빔밥":44,"이원향__":45,"이덕수할아바이":46,"윤이제_블리즈":47,"리냐_LINYA":48,"유샥크_":49,"엘리나_":50,"양홍이햄":51,"야 구 자":52,"아초라_":53,"아오이 히로":54,"스위데 Swideh":55,"솔롱고스":56,"성기사 샬롯":57,"선도위원 강무":58,"서애라_":59,"상 가르마":60,"사랑전도사 젠투":61,"뽀린걸_":62,"빈스_9":63,"부정형인간":64,"베이 bay":65,"버터우스 3세":66,"아르바_":67,"바룬상~":68,"미미짱짱세용":69,"무녀 사야":70,"망 야 _":71,"만강준_":72,"마익호_":73,"마이곰이":74,"로에__":75,"데스해머쵸로키":76,"담비는흥흥":77,"까마귀_":78,"김치만두번영택사스가":79,"구호선_":80,"괴시아키":81,"고소한_누눙지":82,"42dadada":83,"303특공대 강요셉":84,"-소피아-":85,"_victory":86,"보디가드불독":87,"_달타_":88,"_강풍_":89,"__Daki__":90,"__진희__":91,"오그림_":254,"썬써니_":100,"포 메 라 니 안":110,"iRFsA":114,"ときめき":115,"Floră":128,"yun_x":138,"レビノア":357,"버블붐_Bubbleboom":158,"하루（Haru）":159,"白霜らいふ":167,"ByeolBam__":177,"そば処 無期懲役":181,"gabigabi_znda":182,"もみもみもみじ":184,"ぽゆ⁄poyu":185,"なみどめ":186,"鈴 咲羽":187,"初見そら Sora Hazmi":189,"RON狼":190,"Lilim-Abyss":191,"パインサラダ":192,"RaizinSin":193,"まめもも":194,"＊おると＊":195,"ミューティオ":196,"fiatan654（麻婆茄子）":197,"セジュミン":198,"なでこ69":200,"牧瀬ねう":201,"buista_すず":204,"ʚmingɞ":207,"リヴィアス":209,"MAX_GaeBolg":214,"0cta N":215,"らいず-Rize":216,"RuiMk2":220,"KinoPro":221,"마렘_Marem":224,"えもたこ":225,"full_mocco":226,"キジタロー":227,"のらたま":229,"meipuru":230,"sabo_10":234,"芳井はじめ":236,"ノティス":237,"寿司つね-SushiTune":239,"あきな_":240,"いいんちょ_":242,"oinari_0176":243,"sion1252":245,"らしぇ․":246,"Tamari_":247,"misosiruRX":248,"じじじじじじじ":249,"莉羅（レイラ）":250,"yasainiku":251,"INAVA（いなば）":252,"Mokemo":255,"sio_220":256,"りんしゃん0":257,"松猫0326":258,"Daru_min81":259,"Lia-621":260,"さすけっち":261,"きゃとらす":262,"よっしー":263,"なかくん！":264,"ㆍ데트≺Odette≻ㆍ":265,"うに！！！":269,"sirahmare":270,"N30 R0S3":271,"ピーとな":272,"ひかるノースランド":275,"Honda-RA621H":276,"よぉ〜ぐると！":283,"Ayu_Yua":285,"MunkoMonkey":286,"AoSanSan":287,"びりさん":288,"IRaS":289,"レターパック":293,"InamuraRio":294,"ばらりん":295,"れあ471":296,"dorioni":297,"とと（Ottotto）":298,"stellaRasty":299,"ポチシロ":300,"tihada19":303,"Taihou015":304,"p0nzuJPN":305,"火呂之助⁄mayura":306,"VKRm（らむ）":307,"NoboVer2":308,"Parottey":312,"maakun_Xavi":314,"별이__":316,"_송글_":318,"Rite_":319,"SnowStorm15":321,"Luruna Luna":322,"Alto Poco":330,"Mobile_Sprout":331,"はるそら_":333,"skzxstars TW":351,"Megarafa":354,"~kawasaaaki~":355,"Corube":358,"-つる３-":359,"SUGUN":360,"かめかめん":361,"Everestǃ":362,"KrakkaCafe":363,"Sakura Sachiko":364,"nefheim":365,"Yugenki":366,"KuroMaruBC08":367,"うよすま":368,"k@ster":369,"［Jokyo］状況":370,"crani":371,"ハルタ。":372,"가앤슬_":373,"MODECO":375,"Fickle06Cat2053":376,"Ѕeyeon":377,"si_ho":378,"ddil_ddil69":379,"「론구」":381,"Birdy Kat":382,"레이나2":384,"Salmon247":385,"かわず kawaz":386,"わんわん":0,"peperon8655":211,"にゃんこ65K":313,"せーや714":387,"KinetikPaws":388,"コッペぱん":389,"zip_rar":390,"sHis-O（紫蘇）":391,"MuRaZaGi":392,"ＤＯＮＡ":393,"たんしお":394,"Hol_":395,"くろごま25_Kurogoma":396,"darktimehollow":397,"rumina":398,"CoalCat":399,"Low1_jpn":400,"えぐたくだなも！！":401,"あまざき":402,"yumi2012":403,"SnivyFC":404,"ruirui0404":405,"kneesohime":406,"-KYU-":407,"kemorutanica":408,"Tedonsama":409,"神々廻しば":410,"Amellaid":411}

// Original index.html:1889
window._loadCustomPfp = function(){
  try {
    const raw = localStorage.getItem('wbd_pfp_custom');
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
};

// Original index.html:1895
window._saveCustomPfp = function(map){
  try { localStorage.setItem('wbd_pfp_custom', JSON.stringify(map)); return true; }
  catch(e) { return false; }
};

// Original index.html:1905
window._normalizePfpName = function(name){
  if(!name) return '';
  let s = String(name);
  // 1. 그리스 → 라틴 (시각적 동일 문자만)
  s = s.replace(/[ΟοΑαΕεΗηΙιΚκΜμΝνΟοΡρΤτΥυΧχΖζΒβ]/g, c => ({
    'Ο':'O','ο':'o','Α':'A','α':'a','Ε':'E','ε':'e','Η':'H','η':'n',
    'Ι':'I','ι':'i','Κ':'K','κ':'k','Μ':'M','μ':'u','Ν':'N','ν':'v',
    'Ρ':'P','ρ':'p','Τ':'T','τ':'t','Υ':'Y','υ':'u','Χ':'X','χ':'x',
    'Ζ':'Z','ζ':'z','Β':'B','β':'b'
  }[c] || c));
  // 2. 키릴 → 라틴 (시각적 동일 문자만)
  s = s.replace(/[АаВВЕеКкМмНОоРрСсТУуХхЯВЕР]/g, c => ({
    'А':'A','а':'a','В':'B','в':'B','Е':'E','е':'e','К':'K','к':'k',
    'М':'M','м':'M','Н':'H','О':'O','о':'o','Р':'P','р':'p',
    'С':'C','с':'c','Т':'T','У':'Y','у':'y','Х':'X','х':'x'
  }[c] || c));
  // 3. 일본어 장음 ↔ 한자 (시각적 유사)
  s = s.replace(/[ー一]/g, 'ー');  // 한자 일(一) → 장음(ー)로 통일
  // 4. 전각/반각 영숫자 통일 — NFKC 정규화
  s = s.normalize('NFKC');
  // 5. 공백 제거 (실수 띄어쓰기 흡수)
  s = s.replace(/\s+/g, '');
  // 6. 영문 소문자 통일
  s = s.toLowerCase();
  return s;
};

// Original index.html:1933
wbdContext._normalizedDefaultCache = null;

// Original index.html:1949
window._getPfpIndex = function(name){
  if(!name) return null;
  const custom = window._loadCustomPfp();
  // 1. 커스텀 정확 일치
  if(custom[name] !== undefined){
    return custom[name] === null ? null : +custom[name];
  }
  // 2. 기본 정확 일치
  const def = window.WBD_PFP_INDEX_DEFAULT[name];
  if(def !== undefined) return +def;
  // 3. 정규화 매칭 (homoglyph/공백 보정)
  const norm = window._normalizePfpName(name);
  if(!norm) return null;
  // 3-a. 커스텀 정규화
  for(const cName in custom){
    if(window._normalizePfpName(cName) === norm){
      return custom[cName] === null ? null : +custom[cName];
    }
  }
  // 3-b. 기본 정규화
  const normMap = wbdContext._getNormalizedDefaultMap();
  if(normMap[norm] !== undefined) return +normMap[norm];
  return null;
};

// Original index.html:2125
window.diagnoseProfile=wbdContext.diagnoseProfile;
}
