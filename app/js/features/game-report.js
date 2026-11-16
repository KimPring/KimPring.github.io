/** game-report: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:25874
wbdContext.renderGameReportPage = function renderGameReportPage(){
  const out = document.getElementById('gamereport-content');
  if(!out) return;
  const state = window._gameReportState;
  const games = wbdContext.GAMES || [];
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  
  // 첫 진입 시 자동으로 첫 게임 선택
  if(!state.gameId && games.length){
    state.gameId = games[0].id;
  }
  
  // 헤더
  let html = `<div style="background:linear-gradient(135deg,rgba(255,69,96,0.08),var(--card));padding:14px;border-radius:8px;margin-bottom:14px;border-left:3px solid #ff4560">
    <div style="font-size:16px;font-weight:900;color:#ff4560;margin-bottom:6px">📰 경기후 자동 리포트</div>
    <div style="font-size:12px;color:var(--muted);line-height:1.6">
      한 경기에 대한 자동 분석. <b>MVP / 승부처 / 패배 원인 / 타선·투수 평가 / 다음 경기 체크포인트</b>까지 자동 생성.
    </div>
  </div>`;
  
  // 경기 선택
  html += `<div class="filter-row" style="margin-bottom:14px;flex-wrap:wrap;align-items:center;gap:8px">
    <span style="font-size:11px;color:var(--muted);letter-spacing:0.5px">경기 선택</span>
    <select id="gamereport-game-sel" onchange="window._gameReportState.gameId=this.value;renderGameReportPage()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:5px;font-size:13px;min-width:280px">
      <option value="">경기 선택...</option>
      ${games.map(g => {
        const info = wbdContext._parseGameName(g.name || '');
        const label = info.teamA && info.teamB ? `${info.teamA} vs ${info.teamB}${info.date?' ('+info.date+')':''}` : (g.name || g.id);
        return `<option value="${g.id}"${state.gameId===g.id?' selected':''}>${label}</option>`;
      }).join('')}
    </select>`;
  if(state.gameId){
    html += `<button onclick="window.print()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:8px 14px;border-radius:5px;font-size:12px;cursor:pointer">🖨️ 인쇄</button>`;
  }
  html += `</div>`;
  
  if(!state.gameId){
    html += `<div class="card section" style="padding:30px;text-align:center;color:var(--muted);font-size:13px">
      경기를 선택하면 자동 리포트가 생성됩니다.
    </div>`;
    out.innerHTML = html;
    return;
  }
  
  const game = games.find(g => g.id === state.gameId);
  if(!game || !game.pitches || !game.pitches.length){
    html += `<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">경기 데이터가 없습니다.</div>`;
    out.innerHTML = html;
    return;
  }
  
  let report;
  try {
    report = wbdContext._generateGameReport(game);
  } catch(e){
    console.error('Game report generation error:', e);
    html += `<div class="card section" style="padding:30px;text-align:center;color:#ff4560">
      <div style="font-size:24px;margin-bottom:10px">❌</div>
      <div style="font-size:14px;font-weight:700;margin-bottom:6px">리포트 생성 중 오류</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6">${e.message}<br><span style="font-size:10px">${e.stack ? e.stack.split('\n')[1] : ''}</span></div>
      <div style="font-size:11px;color:var(--muted);margin-top:10px">F12 콘솔에서 자세한 내용 확인 가능</div>
    </div>`;
    out.innerHTML = html;
    return;
  }
  if(!report){
    html += `<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">리포트 데이터 부족</div>`;
    out.innerHTML = html;
    return;
  }
  
  // ─ 경기 헤더 + 스코어 ─
  const isAwin = report.totalA > report.totalB;
  const isBwin = report.totalB > report.totalA;
  html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(255,69,96,0.05),var(--card));border-left:4px solid #ff4560;padding:18px">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:10px;color:#ff4560;letter-spacing:2px;font-weight:700;margin-bottom:10px">GAME RECAP</div>
      <div style="display:flex;justify-content:center;align-items:center;gap:24px;flex-wrap:wrap">
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--muted)">${isAwin?'🏆 ':''}${report.teamA_name}</div>
          <div style="font-size:42px;font-weight:900;color:${isAwin?'#ff4560':'var(--text)'};line-height:1">${report.totalA}</div>
        </div>
        <div style="font-size:24px;color:var(--muted)">vs</div>
        <div style="text-align:left">
          <div style="font-size:11px;color:var(--muted)">${isBwin?'🏆 ':''}${report.teamB_name}</div>
          <div style="font-size:42px;font-weight:900;color:${isBwin?'#2196f3':'var(--text)'};line-height:1">${report.totalB}</div>
        </div>
      </div>
    </div>
    <div style="background:var(--card2);padding:10px 14px;border-radius:6px;text-align:center;font-size:13px;line-height:1.5;color:var(--text);font-style:italic">
      ${report.resultHeadline || report.headline}
    </div>
  </div>`;
  
  // ═══════════════════════════════════════════════
  // 📊 이닝별 흐름 차트
  // ═══════════════════════════════════════════════
  if(report.inningFlow && report.inningFlow.length){
    const maxInn = report.inningFlow.length;
    const colW = Math.max(28, Math.min(50, Math.floor(420 / maxInn)));
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #88ccff">
      <div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:12px">📊 이닝별 흐름</div>
      <div style="overflow-x:auto"><table style="border-collapse:collapse;font-family:var(--mono);font-size:12px;margin:0 auto">
        <thead><tr>
          <th style="padding:6px 8px;color:var(--muted);text-align:left;font-size:10px;font-weight:700">팀</th>
          ${report.inningFlow.map(f => `<th style="padding:6px 4px;color:var(--muted);text-align:center;font-size:10px;min-width:${colW}px">${f.inn}회</th>`).join('')}
          <th style="padding:6px 8px;color:#88ccff;text-align:center;font-size:11px;font-weight:900;border-left:2px solid #88ccff">R</th>
        </tr></thead>
        <tbody>
          <tr style="border-top:1px solid var(--border)">
            <td style="padding:8px 8px;color:#ff4560;font-weight:700;font-size:11px">${report.teamA_name}</td>
            ${report.inningFlow.map(f => `<td style="padding:8px 4px;text-align:center;color:${f.rA>=3?'#ff4560':f.rA>0?'#ff8c44':'var(--muted)'};font-weight:${f.rA>=3?900:f.rA>0?700:400}">${f.rA||'-'}</td>`).join('')}
            <td style="padding:8px 8px;text-align:center;color:#ff4560;font-weight:900;font-size:14px;border-left:2px solid #88ccff">${report.totalA}</td>
          </tr>
          <tr style="border-top:1px solid var(--border)">
            <td style="padding:8px 8px;color:#2196f3;font-weight:700;font-size:11px">${report.teamB_name}</td>
            ${report.inningFlow.map(f => `<td style="padding:8px 4px;text-align:center;color:${f.rB>=3?'#2196f3':f.rB>0?'#88ccff':'var(--muted)'};font-weight:${f.rB>=3?900:f.rB>0?700:400}">${f.rB||'-'}</td>`).join('')}
            <td style="padding:8px 8px;text-align:center;color:#2196f3;font-weight:900;font-size:14px;border-left:2px solid #88ccff">${report.totalB}</td>
          </tr>
        </tbody>
      </table></div>`;
    
    // 흐름 이벤트 (역전/리드/쐐기)
    const events = [];
    (report.leadChanges || []).forEach(c => {
      if(c.type === 'reverse'){
        events.push(`🔄 <b>${c.inn}회</b> 역전 (${c.fromTeam} → <b style="color:#ff4560">${c.toTeam}</b>) · ${c.score}`);
      } else if(c.type === 'firstLead'){
        events.push(`🎯 <b>${c.inn}회</b> <b style="color:#39ff8a">${c.toTeam}</b> 선취 · ${c.score}`);
      } else if(c.type === 'tie'){
        events.push(`⚖️ <b>${c.inn}회</b> 동점 · ${c.score}`);
      }
    });
    (report.bigInnings || []).forEach(b => {
      events.push(`💥 <b>${b.inn}회</b> <b style="color:${b.team === report.teamA_name ? '#ff4560' : '#2196f3'}">${b.team}</b>의 <b>${b.runs}점</b> 빅이닝 · ${b.cumA}-${b.cumB}`);
    });
    if(report.clinchInning){
      events.push(`🔒 <b>${report.clinchInning.inn}회</b> <b style="color:#ffd700">${report.clinchInning.team}</b>의 ${report.clinchInning.runs}점 쐐기 · ${report.clinchInning.score}`);
    }
    if(events.length){
      html += `<div style="margin-top:14px;padding:10px 12px;background:var(--card2);border-radius:6px">
        <div style="font-size:10px;color:#88ccff;font-weight:700;margin-bottom:8px;letter-spacing:0.5px">⚡ 흐름 이벤트</div>
        <div style="display:flex;flex-direction:column;gap:5px;font-size:11.5px;line-height:1.7;color:var(--text)">
          ${events.map(e => `<div>${e}</div>`).join('')}
        </div>
      </div>`;
    }
    html += `</div>`;
  }
  
  // ═══════════════════════════════════════════════
  // 🏆 승리 요인 / 📉 패배 원인 (팀별 분리)
  // ═══════════════════════════════════════════════
  if(report.winner && (report.winFactors.length || report.lossFactors.length)){
    const loser = report.winner === report.teamA_name ? report.teamB_name : report.teamA_name;
    const winColor = report.winner === report.teamA_name ? '#ff4560' : '#2196f3';
    const lossColor = loser === report.teamA_name ? '#ff4560' : '#2196f3';
    
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" data-scout-grid>
      <div class="card section" style="border-left:3px solid #39ff8a;background:linear-gradient(135deg,rgba(57,255,138,0.04),var(--card))">
        <div class="card-title" style="color:#39ff8a;font-size:13px;margin-bottom:12px">
          🏆 <b style="color:${winColor}">${report.winner}</b> 승리 요인
        </div>
        ${report.winFactors.length ? `<div style="display:flex;flex-direction:column;gap:8px">
          ${report.winFactors.map(f => `<div style="background:var(--card2);padding:10px 13px;border-radius:5px;border-left:2px solid #39ff8a;font-size:12px;line-height:1.6;color:var(--text)">${f}</div>`).join('')}
        </div>` : '<div style="color:var(--muted);font-size:11px;font-style:italic">특정 요인 없음 (전반적 우세)</div>'}
      </div>
      <div class="card section" style="border-left:3px solid #ff4560;background:linear-gradient(135deg,rgba(255,69,96,0.04),var(--card))">
        <div class="card-title" style="color:#ff4560;font-size:13px;margin-bottom:12px">
          📉 <b style="color:${lossColor}">${loser}</b> 패배 원인
        </div>
        ${report.lossFactors.length ? `<div style="display:flex;flex-direction:column;gap:8px">
          ${report.lossFactors.map(f => `<div style="background:var(--card2);padding:10px 13px;border-radius:5px;border-left:2px solid #ff4560;font-size:12px;line-height:1.6;color:var(--text)">${f}</div>`).join('')}
        </div>` : '<div style="color:var(--muted);font-size:11px;font-style:italic">특정 원인 없음 (실력 차이)</div>'}
      </div>
    </div>`;
  }
  
  // ─ MVP / 베스트 투수 ─
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" data-scout-grid>
    <div class="card section" style="border-left:3px solid #ffd700">
      <div class="card-title" style="color:#ffd700;font-size:13px;margin-bottom:12px">⭐ MVP 후보</div>`;
  if(report.mvp){
    html += `<div style="background:var(--card2);padding:14px;border-radius:6px;cursor:pointer" onclick="openCardDetail('${String(report.mvp.name).replace(/'/g,"\\'")}','batter')">
      <div style="font-size:18px;font-weight:900;color:var(--text);margin-bottom:6px">${report.mvp.name}</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6">${report.mvp.reason}</div>
    </div>`;
  } else {
    html += `<div style="color:var(--muted);font-size:11px;font-style:italic;padding:8px">두드러진 활약 없음</div>`;
  }
  html += `</div>
    <div class="card section" style="border-left:3px solid #ff8c44">
      <div class="card-title" style="color:#ff8c44;font-size:13px;margin-bottom:12px">⚾ 베스트 투수</div>`;
  if(report.bestPitcher){
    html += `<div style="background:var(--card2);padding:14px;border-radius:6px;cursor:pointer" onclick="openCardDetail('${String(report.bestPitcher.name).replace(/'/g,"\\'")}','pitcher')">
      <div style="font-size:18px;font-weight:900;color:var(--text);margin-bottom:6px">${report.bestPitcher.name}</div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6">${report.bestPitcher.reason}</div>
    </div>`;
  } else {
    html += `<div style="color:var(--muted);font-size:11px;font-style:italic;padding:8px">두드러진 호투 없음</div>`;
  }
  html += `</div></div>`;
  
  // ─ 박스스코어: 투수 (팀별) ─
  function pitcherBoxTable(arr, teamName, color){
    if(!arr.length) return '';
    let h = `<div class="card section" style="margin-bottom:14px;border-left:3px solid ${color}">
      <div class="card-title" style="color:${color};font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        ⚾ ${teamName} 투수 박스스코어
      </div>
      <div style="overflow-x:auto"><table style="width:100%;font-size:11.5px;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid var(--border);color:var(--muted);font-size:10px">
          <th style="padding:6px 4px;text-align:left">선수</th>
          <th style="padding:6px 4px">IP</th>
          <th style="padding:6px 4px">R</th>
          <th style="padding:6px 4px">H</th>
          <th style="padding:6px 4px">HR</th>
          <th style="padding:6px 4px">BB</th>
          <th style="padding:6px 4px">K</th>
          <th style="padding:6px 4px">투구</th>
          <th style="padding:6px 4px">피안타율</th>
          <th style="padding:6px 4px">WHIP</th>
          <th style="padding:6px 4px">헛스윙%</th>
        </tr></thead><tbody>`;
    arr.forEach(s => {
      h += `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:7px 4px;font-weight:700;cursor:pointer;color:${color}" onclick="openCardDetail('${String(s.name).replace(/'/g,"\\'")}','pitcher')">${s.name}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${s.ipDisplay}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.runs>=3?'#ff4560':s.runs>0?'#ff8c44':'#39ff8a'}">${s.runs}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${s.hits}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.hr>0?'#ff4560':'var(--muted)'}">${s.hr}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.bb>=3?'#ff4560':s.bb>0?'#ff8c44':'var(--text)'}">${s.bb}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:#39ff8a;font-weight:700">${s.k}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:var(--muted)">${s.n}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${fmt3(s.ba)}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${s.whip.toFixed(2)}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.whPct>=30?'#ff4560':'var(--text)'}">${s.whPct.toFixed(0)}%</td>
      </tr>`;
    });
    // 팀 합계
    const tIP = arr.reduce((s,p)=>s+p.outs,0);
    const tRuns = arr.reduce((s,p)=>s+p.runs,0);
    const tHits = arr.reduce((s,p)=>s+p.hits,0);
    const tHR = arr.reduce((s,p)=>s+p.hr,0);
    const tBB = arr.reduce((s,p)=>s+p.bb,0);
    const tK = arr.reduce((s,p)=>s+p.k,0);
    const tN = arr.reduce((s,p)=>s+p.n,0);
    h += `<tr style="background:var(--card2);font-weight:700;border-top:2px solid ${color}">
      <td style="padding:7px 4px;color:${color}">팀 합계</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${Math.floor(tIP/3)}.${tIP%3}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tRuns}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tHits}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tHR}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tBB}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tK}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tN}</td>
      <td style="padding:7px 4px"></td>
      <td style="padding:7px 4px"></td>
      <td style="padding:7px 4px"></td>
    </tr>`;
    h += `</tbody></table></div></div>`;
    return h;
  }
  
  // ─ 박스스코어: 타자 (팀별) ─
  function batterBoxTable(arr, teamName, color){
    if(!arr.length) return '';
    let h = `<div class="card section" style="margin-bottom:14px;border-left:3px solid ${color}">
      <div class="card-title" style="color:${color};font-size:13px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        🏏 ${teamName} 타자 박스스코어
      </div>
      <div style="overflow-x:auto"><table style="width:100%;font-size:11.5px;border-collapse:collapse">
        <thead><tr style="border-bottom:1px solid var(--border);color:var(--muted);font-size:10px">
          <th style="padding:6px 4px;text-align:left">선수</th>
          <th style="padding:6px 4px">PA</th>
          <th style="padding:6px 4px">AB</th>
          <th style="padding:6px 4px">H</th>
          <th style="padding:6px 4px">HR</th>
          <th style="padding:6px 4px">BB</th>
          <th style="padding:6px 4px">K</th>
          <th style="padding:6px 4px">타율</th>
          <th style="padding:6px 4px">하드힛</th>
          <th style="padding:6px 4px">배럴</th>
          <th style="padding:6px 4px">최고 EV</th>
        </tr></thead><tbody>`;
    arr.forEach(s => {
      h += `<tr style="border-bottom:1px solid var(--border)">
        <td style="padding:7px 4px;font-weight:700;cursor:pointer;color:${color}" onclick="openCardDetail('${String(s.name).replace(/'/g,"\\'")}','batter')">${s.name}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:var(--muted)">${s.pa}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${s.ab}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.hits>=2?'#39ff8a':'var(--text)'};font-weight:${s.hits>=2?'700':'normal'}">${s.hits}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.hr>0?'#ff4560':'var(--muted)'};font-weight:${s.hr>0?'700':'normal'}">${s.hr}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.bb>0?'#88cc44':'var(--muted)'}">${s.bb}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.k>=2?'#ff8c44':'var(--muted)'}">${s.k}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.ba>=0.500?'#ff4560':s.ba>=0.300?'#39ff8a':'var(--text)'}">${fmt3(s.ba)}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${s.hh}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.brl>0?'#ff8c44':'var(--muted)'}">${s.brl}</td>
        <td style="padding:7px 4px;text-align:center;font-family:var(--mono);color:${s.maxEV>=110?'#ff4560':'var(--text)'}">${s.maxEV>0?s.maxEV.toFixed(1)+'mph':'-'}</td>
      </tr>`;
    });
    const tAB = arr.reduce((s,b)=>s+b.ab,0);
    const tHits = arr.reduce((s,b)=>s+b.hits,0);
    const tHR = arr.reduce((s,b)=>s+b.hr,0);
    const tBB = arr.reduce((s,b)=>s+b.bb,0);
    const tK = arr.reduce((s,b)=>s+b.k,0);
    const tHH = arr.reduce((s,b)=>s+b.hh,0);
    const tBrl = arr.reduce((s,b)=>s+b.brl,0);
    h += `<tr style="background:var(--card2);font-weight:700;border-top:2px solid ${color}">
      <td style="padding:7px 4px;color:${color}">팀 합계</td>
      <td style="padding:7px 4px"></td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tAB}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tHits}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tHR}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tBB}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tK}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tAB>0?fmt3(tHits/tAB):'-'}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tHH}</td>
      <td style="padding:7px 4px;text-align:center;font-family:var(--mono)">${tBrl}</td>
      <td style="padding:7px 4px"></td>
    </tr>`;
    h += `</tbody></table></div></div>`;
    return h;
  }
  
  // ─ 양팀 박스스코어 표시 ─
  html += pitcherBoxTable(report.teamA_pitcher_box, report.teamA_name, '#ff4560');
  html += pitcherBoxTable(report.teamB_pitcher_box, report.teamB_name, '#2196f3');
  html += batterBoxTable(report.teamA_batter_box, report.teamA_name, '#ff4560');
  html += batterBoxTable(report.teamB_batter_box, report.teamB_name, '#2196f3');
  
  // ─ 승부처 ─
  if(report.keyMoments && report.keyMoments.length){
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #ff4560">
      <div class="card-title" style="color:#ff4560;font-size:13px;margin-bottom:12px">🎬 승부처 / 결정적 장면</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${report.keyMoments.map(m => `<div style="background:var(--card2);padding:11px 14px;border-radius:6px;border-left:2px solid #ff4560;font-size:12px;line-height:1.65;color:var(--text)">${m}</div>`).join('')}
      </div>
    </div>`;
  }
  
  // ─ 위험 신호 ─
  if(report.warnings && report.warnings.length){
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #ff4560">
      <div class="card-title" style="color:#ff4560;font-size:13px;margin-bottom:12px">⚠️ 위험 신호 (Watch List)</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${report.warnings.map(w => `<div style="background:var(--card2);padding:10px 12px;border-radius:5px;border-left:2px solid #ff4560;font-size:11.5px;line-height:1.6;color:var(--text)">${w}</div>`).join('')}
      </div>
    </div>`;
  }
  
  // ─ 다음 경기 체크포인트 ─
  if(report.nextCheckpoints && report.nextCheckpoints.length){
    html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(204,68,255,0.06),var(--card));border-left:3px solid #cc44ff">
      <div class="card-title" style="color:#cc44ff;font-size:13px;margin-bottom:12px">🎯 다음 경기 체크포인트</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${report.nextCheckpoints.map(n => `<div style="background:var(--card2);padding:10px 12px;border-radius:5px;border-left:2px solid #cc44ff;font-size:11.5px;line-height:1.6;color:var(--text)">${n}</div>`).join('')}
      </div>
    </div>`;
  }
  
  html += `<div style="background:var(--card2);padding:10px 14px;border-radius:6px;font-size:10px;color:var(--muted);line-height:1.6;text-align:center">
    📰 자동 리포트 — ${game.pitches.length.toLocaleString()}구 분석 · 데이터 기반 자동 생성
  </div>`;
  
  out.innerHTML = html;
};

// Original index.html:26242
wbdContext._generateGameReport = function _generateGameReport(game){
  const fmt3 = v => (v==null||isNaN(v))?'-':(v>=1||v<=-1)?v.toFixed(3):(v<0?'-.':'.')+(Math.abs(v)*1000).toFixed(0).padStart(3,'0');
  const pitches = game.pitches || [];
  const info = wbdContext._parseGameName(game.name || '');
  const teamA_name = info.teamA || 'A팀';
  const teamB_name = info.teamB || 'B팀';
  
  // ─ 팀별 선수 분류 (half 사용: half=1 → A공격/B수비, half=0 → B공격/A수비) ─
  // 투수: half=1일 때 던지면 B팀, half=0일 때 던지면 A팀
  // 타자: half=1일 때 치면 A팀, half=0일 때 치면 B팀
  const teamA_pitchers = new Set();
  const teamB_pitchers = new Set();
  const teamA_batters = new Set();
  const teamB_batters = new Set();
  pitches.forEach(d => {
    if(d.pName){
      if(+d.half === 1) teamB_pitchers.add(d.pName);
      else teamA_pitchers.add(d.pName);
    }
    if(d.bName){
      if(+d.half === 1) teamA_batters.add(d.bName);
      else teamB_batters.add(d.bName);
    }
  });
  
  // 팀명 매핑
  const playerTeam = (name, mode) => {
    if(mode === 'pitcher'){
      if(teamA_pitchers.has(name)) return teamA_name;
      if(teamB_pitchers.has(name)) return teamB_name;
    } else {
      if(teamA_batters.has(name)) return teamA_name;
      if(teamB_batters.has(name)) return teamB_name;
    }
    return '?';
  };
  
  // ─ 점수 계산 (이닝별) ─
  const {totalA, totalB} = wbdContext._computeInningScores(pitches);
  const winner = totalA > totalB ? teamA_name : totalB > totalA ? teamB_name : null;
  const loser = totalA > totalB ? teamB_name : totalB > totalA ? teamA_name : null;
  
  // ─ 투수별 박스스코어 (정밀) ─
  // 박스스코어 모달과 동일한 정확한 통계 계산 사용
  const gameStats = wbdContext.calcPitcherGameStats(pitches);
  
  function calcPitcherBoxscore(name){
    const arr = pitches.filter(d => d.pName === name);
    if(!arr.length) return null;
    
    const s = gameStats[name];
    if(!s) return null;
    
    const outs = s.outs;
    const ip = s.ip;
    const ipDisplay = outs > 0 ? `${Math.floor(outs/3)}.${outs%3}` : '0.0';
    
    // 헛스윙
    const sw = arr.filter(d => d.bSwing).length;
    const wh = arr.filter(d => (d.bSwing && +d.call !== 2)).length;
    const whPct = sw > 0 ? wh/sw*100 : 0;
    
    // PA 수 (inn/half/bIdx로 정확하게 그룹핑)
    const PAset = new Set();
    arr.forEach(d => {
      PAset.add(`${d.inn}_${d.half}_${d.bIdx}`);
    });
    const pa = PAset.size;
    
    // AB = PA - BB
    const ab = pa - s.bbs;
    const ba = ab > 0 ? s.hits/ab : 0;
    const whip = ip > 0 ? (s.hits + s.bbs) / ip : 0;
    
    return {
      name, n: s.pitches, pa, ab, 
      hits: s.hits, hr: s.hrs, bb: s.bbs, k: s.ks,
      outs, ip, ipDisplay, runs: s.runs,
      whPct, sw, wh, ba, whip,
      era: s.era
    };
  }
  
  // 박스스코어 모달과 동일한 정확한 타자 통계
  const batterGameStats = wbdContext.calcBatterGameStats(pitches);
  
  // ─ 타자별 박스스코어 ─
  function calcBatterBoxscore(name){
    const arr = pitches.filter(d => d.bName === name);
    if(!arr.length) return null;
    
    const s = batterGameStats[name];
    if(!s) return null;
    
    // PA 수 (inn/half/bIdx로 정확하게)
    const PAset = new Set();
    arr.forEach(d => {
      PAset.add(`${d.inn}_${d.half}_${d.bIdx}`);
    });
    const pa = PAset.size;
    
    const bd = arr.filter(wbdContext._isInPlay);
    const hh = bd.filter(d => wbdContext._isHardHit(d)).length;
    const maxEV = bd.length ? Math.max(...bd.map(d => +d.ev)) : 0;
    const brl = bd.filter(d => wbdContext._isBarrel(d)).length;
    
    return {
      name, pa, ab: s.ab, hits: s.hits, hr: s.hrs, bb: s.bbs, k: s.ks,
      hh, brl, maxEV,
      ba: s.ba
    };
  }
  
  // 팀별 박스스코어
  const teamA_pitcher_box = Array.from(teamA_pitchers).map(calcPitcherBoxscore).filter(Boolean).filter(s => s.n >= 5);
  const teamB_pitcher_box = Array.from(teamB_pitchers).map(calcPitcherBoxscore).filter(Boolean).filter(s => s.n >= 5);
  const teamA_batter_box = Array.from(teamA_batters).map(calcBatterBoxscore).filter(Boolean).filter(s => s.pa >= 1);
  const teamB_batter_box = Array.from(teamB_batters).map(calcBatterBoxscore).filter(Boolean).filter(s => s.pa >= 1);
  
  // 출장순 정렬
  const orderInGame = (name, key) => {
    const idx = pitches.findIndex(d => String(d[key]) === String(name));
    return idx >= 0 ? idx : 9999;
  };
  teamA_pitcher_box.sort((a,b) => orderInGame(a.name,'pName') - orderInGame(b.name,'pName'));
  teamB_pitcher_box.sort((a,b) => orderInGame(a.name,'pName') - orderInGame(b.name,'pName'));
  teamA_batter_box.sort((a,b) => orderInGame(a.name,'bName') - orderInGame(b.name,'bName'));
  teamB_batter_box.sort((a,b) => orderInGame(a.name,'bName') - orderInGame(b.name,'bName'));
  
  // ─ MVP (양팀 통합 - 가장 활약한 타자) ─
  const allBatters = [...teamA_batter_box, ...teamB_batter_box];
  const sortedB = allBatters.slice().sort((a,b) => {
    const aScore = a.hits + a.hr*3 + a.hh*0.5 + a.brl;
    const bScore = b.hits + b.hr*3 + b.hh*0.5 + b.brl;
    return bScore - aScore;
  });
  let mvp = null;
  if(sortedB.length){
    const top = sortedB[0];
    if(top.hits >= 2 || top.hr >= 1){
      let reason = `<b>${playerTeam(top.name, 'batter')}</b> · ${top.ab}타수 ${top.hits}안타 (타율 ${fmt3(top.ba)})`;
      if(top.hr > 0) reason += ` · <b style="color:#ff4560">HR ${top.hr}</b>`;
      if(top.hh > 0) reason += ` · 하드힛 ${top.hh}개`;
      if(top.brl > 0) reason += ` · 배럴 ${top.brl}개`;
      if(top.maxEV > 0) reason += `<br>최고 EV <b>${top.maxEV.toFixed(1)}mph</b>`;
      mvp = {name: top.name, team: playerTeam(top.name, 'batter'), reason};
    }
  }
  
  // ─ 베스트 투수 ─
  const allPitchers = [...teamA_pitcher_box, ...teamB_pitcher_box];
  const sortedP = allPitchers.slice().sort((a,b) => {
    const aS = (a.outs/3)*10 + a.k*3 - a.runs*5 - a.hr*5 - a.bb*2;
    const bS = (b.outs/3)*10 + b.k*3 - b.runs*5 - b.hr*5 - b.bb*2;
    return bS - aS;
  });
  let bestPitcher = null;
  if(sortedP.length){
    const top = sortedP[0];
    if(top.outs >= 6 && top.runs <= 3){  // 최소 2이닝, 3실점 이하
      let reason = `<b>${playerTeam(top.name, 'pitcher')}</b> · ${top.ipDisplay}이닝 ${top.runs}실점`;
      reason += `<br>${top.hits}피안타 · K ${top.k} · BB ${top.bb}`;
      reason += ` · 피안타율 <b>${fmt3(top.ba)}</b>`;
      if(top.whPct >= 25) reason += ` · 헛스윙 <b style="color:#ff4560">${top.whPct.toFixed(0)}%</b>`;
      bestPitcher = {name: top.name, team: playerTeam(top.name, 'pitcher'), reason};
    }
  }
  
  // ─ 헤드라인 ─
  let headline = '';
  if(winner){
    headline = `<b>${winner} ${totalA > totalB ? totalA : totalB} : ${totalA > totalB ? totalB : totalA} ${loser}</b>`;
    if(mvp && playerTeam(mvp.name, 'batter') === winner){
      headline += ` — <b>${mvp.name}</b>의 활약이 결정적.`;
    } else if(bestPitcher && playerTeam(bestPitcher.name, 'pitcher') === winner){
      headline += ` — <b>${bestPitcher.name}</b>의 호투가 승리 이끔.`;
    } else {
      headline += `.`;
    }
  } else {
    headline = `<b>무승부 (${totalA}-${totalB})</b>`;
  }
  
  // ─ 승부처 ─
  const keyMoments = [];
  const hrPlays = pitches.filter(d => +d.result === 4);
  hrPlays.forEach(d => {
    const ev = d.ev ? +d.ev : 0;
    const ldeg = d.ldeg ? +d.ldeg : 0;
    const inning = d.inn || '?';
    const bTeam = playerTeam(d.bName, 'batter');
    keyMoments.push(`💥 ${inning}회 <b>${d.bName}</b> <span style="color:var(--muted);font-size:10px">(${bTeam})</span>의 홈런 (vs ${d.pName} · ${wbdContext.pitchGroup(d.pType, d)}${ev>0?', EV '+ev.toFixed(1)+'mph':''}${ldeg!==0?', 발사각 '+ldeg.toFixed(0)+'°':''})`);
  });
  const brlPlays = pitches.filter(d => 
    wbdContext._isBarrel(d) && 
    (+d['1BSafe']===1) && +d.result !== 4
  );
  brlPlays.slice(0, 3).forEach(d => {
    const ev = d.ev ? +d.ev : 0;
    const bTeam = playerTeam(d.bName, 'batter');
    keyMoments.push(`🔥 ${d.inn}회 <b>${d.bName}</b> <span style="color:var(--muted);font-size:10px">(${bTeam})</span>의 배럴 타구 (vs ${d.pName}, EV ${ev.toFixed(1)}mph)`);
  });
  const fullCountK = pitches.filter(d => 
    +d.ball === 3 && +d.strk === 2 && (d.bSwing && +d.call !== 2)
  );
  fullCountK.slice(0, 2).forEach(d => {
    const pTeam = playerTeam(d.pName, 'pitcher');
    keyMoments.push(`❌ ${d.inn}회 <b>${d.pName}</b> <span style="color:var(--muted);font-size:10px">(${pTeam})</span>의 풀카운트 헛스윙 K (vs ${d.bName} · ${wbdContext.pitchGroup(d.pType, d)})`);
  });
  
  // ─ 위험 신호 (팀별 분리) ─
  const warnings = [];
  allBatters.filter(s => s.ab >= 4 && s.hits === 0 && s.k >= 2).forEach(s => {
    warnings.push(`⚠️ <b>${s.name}</b> <span style="color:var(--muted);font-size:10px">(${playerTeam(s.name,'batter')})</span>: ${s.ab}타수 무안타 · K ${s.k} — 컨택 부진`);
  });
  allPitchers.filter(s => s.outs >= 3 && (s.runs >= 4 || s.hr >= 2)).forEach(s => {
    warnings.push(`⚠️ <b>${s.name}</b> <span style="color:var(--muted);font-size:10px">(${playerTeam(s.name,'pitcher')})</span>: ${s.ipDisplay}이닝 ${s.runs}실점${s.hr>0?' · 피HR '+s.hr:''} — 다음 등판 주의`);
  });
  allPitchers.filter(s => s.bb >= 3).forEach(s => {
    warnings.push(`⚠️ <b>${s.name}</b> <span style="color:var(--muted);font-size:10px">(${playerTeam(s.name,'pitcher')})</span>: ${s.ipDisplay}이닝 BB ${s.bb} — 제구 점검`);
  });
  
  // ─ 다음 경기 체크포인트 ─
  const nextCheckpoints = [];
  if(mvp){
    nextCheckpoints.push(`🔥 <b>${mvp.name}</b> (${mvp.team}) 폼 좋음. 다음 경기 상위 타순 배치.`);
  }
  if(bestPitcher){
    nextCheckpoints.push(`⚾ <b>${bestPitcher.name}</b> (${bestPitcher.team}) 컨디션 좋음. 중요 경기 우선 등판 카드.`);
  }
  const badBatters = allBatters.filter(s => s.ab >= 3 && s.hits === 0);
  if(badBatters.length >= 3){
    nextCheckpoints.push(`📉 침묵 타자 ${badBatters.length}명 — 라인업 조정 / 매치업 확인 필요.`);
  }
  const struggledPitchers = allPitchers.filter(s => s.outs >= 3 && s.runs >= 4);
  if(struggledPitchers.length){
    nextCheckpoints.push(`⚾ 흔들린 투수 ${struggledPitchers.length}명 — 휴식 또는 보직 변경 검토.`);
  }
  if(!nextCheckpoints.length){
    nextCheckpoints.push('특별한 체크포인트 없음. 안정적인 경기.');
  }
  
  // ═══════════════════════════════════════════════
  // 📊 이닝별 흐름 + 승부처 + 승패 원인 분석
  // ═══════════════════════════════════════════════
  
  // 이닝별 점수 계산
  const inningScores = wbdContext._computeInningScores(pitches);
  const innings = inningScores.innings || [];
  const runsA = inningScores.runsA || {};
  const runsB = inningScores.runsB || {};
  
  // 이닝별 누적 + 리드 추적
  const inningFlow = [];
  let cumA = 0, cumB = 0, prevLead = 0;  // prevLead: A 리드=1, B 리드=-1, 동점=0
  const leadChanges = [];  // {inn, fromLead, toLead, byTeam}
  const bigInnings = [];   // {inn, team, runs}
  
  innings.forEach(inn => {
    const rA = runsA[inn] || 0;
    const rB = runsB[inn] || 0;
    cumA += rA;
    cumB += rB;
    const curLead = cumA > cumB ? 1 : cumA < cumB ? -1 : 0;
    
    // 빅이닝 감지 (한 이닝에 3점+)
    if(rA >= 3) bigInnings.push({inn, team: teamA_name, runs: rA, cumA, cumB});
    if(rB >= 3) bigInnings.push({inn, team: teamB_name, runs: rB, cumA, cumB});
    
    // 리드 변경 감지
    if(prevLead !== 0 && curLead !== 0 && prevLead !== curLead){
      // 역전
      leadChanges.push({
        inn,
        type: 'reverse',
        fromTeam: prevLead === 1 ? teamA_name : teamB_name,
        toTeam: curLead === 1 ? teamA_name : teamB_name,
        score: `${cumA}-${cumB}`
      });
    } else if(prevLead === 0 && curLead !== 0){
      // 첫 득점/리드 잡음
      if(cumA + cumB > 0){
        leadChanges.push({
          inn,
          type: 'firstLead',
          toTeam: curLead === 1 ? teamA_name : teamB_name,
          score: `${cumA}-${cumB}`
        });
      }
    } else if(prevLead !== 0 && curLead === 0){
      // 동점 (추격)
      leadChanges.push({
        inn,
        type: 'tie',
        score: `${cumA}-${cumB}`
      });
    }
    
    inningFlow.push({inn, rA, rB, cumA, cumB, lead: curLead});
    prevLead = curLead;
  });
  
  // 쐐기점 (게임 결정짓는 마지막 의미 있는 점수)
  // = 최종 이닝 중에서, 그 이전엔 경기가 박빙(2점차 이내)이었다가, 그 이닝에서 3점+ 벌어지게 만든 이닝
  let clinchInning = null;
  for(let i = inningFlow.length - 1; i >= 0; i--){
    const cur = inningFlow[i];
    const diff = Math.abs(cur.cumA - cur.cumB);
    const prevDiff = i > 0 ? Math.abs(inningFlow[i-1].cumA - inningFlow[i-1].cumB) : 0;
    // 이전 차이는 2점 이내, 이번 이닝에서 3점+ 벌어짐
    if(prevDiff <= 2 && diff >= 3 && (cur.rA >= 2 || cur.rB >= 2)){
      const team = cur.rA > cur.rB ? teamA_name : teamB_name;
      clinchInning = {inn: cur.inn, team, score: `${cur.cumA}-${cur.cumB}`, runs: Math.max(cur.rA, cur.rB)};
      break;
    }
  }
  
  // ═══════════════════════════════════════════════
  // 🏆 승리팀 승리 요인 / 📉 패배팀 패배 원인
  // ═══════════════════════════════════════════════
  const winFactors = [];
  const lossFactors = [];
  
  if(winner){
    const winnerBoxBatters = winner === teamA_name ? teamA_batter_box : teamB_batter_box;
    const winnerBoxPitchers = winner === teamA_name ? teamA_pitcher_box : teamB_pitcher_box;
    const loserBoxBatters = winner === teamA_name ? teamB_batter_box : teamA_batter_box;
    const loserBoxPitchers = winner === teamA_name ? teamB_pitcher_box : teamA_pitcher_box;
    
    // ─ 승리 요인 ─
    // 1. 빅이닝
    const winnerBig = bigInnings.filter(b => b.team === winner);
    if(winnerBig.length){
      const top = winnerBig.reduce((a,b) => a.runs > b.runs ? a : b);
      winFactors.push(`💥 <b>${top.inn}회 ${top.runs}점 빅이닝</b> — 경기 흐름 가져옴`);
    }
    
    // 2. 호투 선발/구원
    const goodWinPitchers = winnerBoxPitchers.filter(s => s.outs >= 6 && s.runs <= 2);
    if(goodWinPitchers.length){
      const ace = goodWinPitchers.reduce((a,b) => a.outs > b.outs ? a : b);
      winFactors.push(`⚾ <b>${ace.name}의 호투</b> — ${ace.ipDisplay}이닝 ${ace.runs}실점${ace.k>=5?` · K ${ace.k}`:''}`);
    }
    
    // 3. 다득점 타자 (2안타+ 또는 HR)
    const hotBatters = winnerBoxBatters.filter(b => b.hits >= 2 || b.hr >= 1);
    if(hotBatters.length >= 2){
      winFactors.push(`🔥 <b>타선 응집력</b> — ${hotBatters.length}명이 멀티히트/홈런 (${hotBatters.slice(0,3).map(b => b.name).join(', ')})`);
    } else if(hotBatters.length === 1){
      const h = hotBatters[0];
      winFactors.push(`🏏 <b>${h.name}의 활약</b> — ${h.hits}안타${h.hr>0?` · HR ${h.hr}`:''} (타율 ${fmt3(h.ba)})`);
    }
    
    // 4. 클러치 / 결정타 (HR / 배럴)
    const winnerHRs = pitches.filter(d => +d.result === 4 && playerTeam(d.bName, 'batter') === winner);
    if(winnerHRs.length >= 2){
      winFactors.push(`💣 <b>장타 폭발</b> — HR ${winnerHRs.length}개 (${winnerHRs.map(d => d.bName).filter((v,i,a)=>a.indexOf(v)===i).join(', ')})`);
    }
    
    // 5. 제구력
    const winTotalBB = winnerBoxPitchers.reduce((s,p)=>s+p.bb, 0);
    const winTotalIP = winnerBoxPitchers.reduce((s,p)=>s+p.outs, 0)/3;
    if(winTotalIP >= 5 && winTotalBB <= 2){
      winFactors.push(`🎯 <b>안정적 제구</b> — BB ${winTotalBB}개만 허용 (공짜 출루 없음)`);
    }
    
    // ─ 패배 원인 ─
    // 1. 무너진 이닝 (상대 빅이닝 허용)
    const loserAllowed = bigInnings.filter(b => b.team === winner);
    if(loserAllowed.length){
      const worst = loserAllowed.reduce((a,b) => a.runs > b.runs ? a : b);
      lossFactors.push(`💔 <b>${worst.inn}회 ${worst.runs}실점</b> — 결정적 이닝 무너짐`);
    }
    
    // 2. 무너진 투수
    const badLossPitchers = loserBoxPitchers.filter(s => s.outs >= 3 && s.runs >= 3);
    if(badLossPitchers.length){
      const worst = badLossPitchers.reduce((a,b) => a.runs > b.runs ? a : b);
      lossFactors.push(`⚾ <b>${worst.name} 부진</b> — ${worst.ipDisplay}이닝 ${worst.runs}실점${worst.hr>0?` · 피HR ${worst.hr}`:''}`);
    }
    
    // 3. 타선 침묵
    const loserSilent = loserBoxBatters.filter(b => b.ab >= 3 && b.hits === 0);
    if(loserSilent.length >= 3){
      lossFactors.push(`😶 <b>타선 침묵</b> — ${loserSilent.length}명 무안타 (${loserSilent.slice(0,3).map(b => b.name).join(', ')})`);
    }
    
    // 4. 득점권 부진 (간단 추정 - 1B/2B/3B 주자 있는 상황의 안타율)
    const loserBatterNames = new Set(loserBoxBatters.map(b => b.name));
    const risp = pitches.filter(d => 
      loserBatterNames.has(d.bName) && 
      (+d.b2 === 1 || +d.b3 === 1)
    );
    if(risp.length){
      // PA 단위로
      const rispPAs = {};
      risp.forEach(d => {
        const key = `${d.inn}_${d.half}_${d.bIdx}`;
        if(!rispPAs[key]) rispPAs[key] = {pitches:[], lastResult:0};
        rispPAs[key].pitches.push(d);
        rispPAs[key].lastResult = +d.result;
      });
      const rispPAarr = Object.values(rispPAs);
      const rispHits = rispPAarr.filter(pa => 
        pa.pitches.some(d => +d['1BSafe']===1) || pa.lastResult === 4
      ).length;
      const rispAB = rispPAarr.filter(pa => {
        const r = pa.lastResult;
        return pa.pitches.some(d => +d['1BSafe']===1) || r===4 || r===1 || r===2;
      }).length;
      if(rispAB >= 4){
        const rispBA = rispHits / rispAB;
        if(rispBA <= 0.150){
          lossFactors.push(`🎯 <b>득점권 부진</b> — ${rispHits}/${rispAB} (${fmt3(rispBA)}) · 찬스 살리지 못함`);
        }
      }
    }
    
    // 5. 사사구 / 자멸
    const lossTotalBB = loserBoxPitchers.reduce((s,p)=>s+p.bb, 0);
    if(lossTotalBB >= 5){
      lossFactors.push(`📉 <b>사사구 자멸</b> — BB ${lossTotalBB}개 허용 (공짜 출루 너무 많음)`);
    }
    
    // 6. 4번/3번 타자 침묵
    const loserCleanup = loserBoxBatters.slice(2, 5);  // 3-5번 추정 (출장순 정렬됨)
    if(loserCleanup.length >= 2){
      const cleanupHits = loserCleanup.reduce((s,b)=>s+b.hits, 0);
      const cleanupAB = loserCleanup.reduce((s,b)=>s+b.ab, 0);
      if(cleanupAB >= 8 && cleanupHits === 0){
        lossFactors.push(`🛑 <b>중심타선 침묵</b> — 3-5번 타자 무안타`);
      }
    }
  }
  
  // 결과 요약 헤드라인 강화
  let resultHeadline = '';
  if(winner){
    const score = `${winner === teamA_name ? totalA : totalB} : ${winner === teamA_name ? totalB : totalA}`;
    resultHeadline = `<b>${winner}</b>의 <b>${score}</b> 승리`;
    if(clinchInning){
      resultHeadline += ` — <b>${clinchInning.inn}회 ${clinchInning.runs}점 쐐기점</b>으로 승부 결정`;
    } else if(bigInnings.length){
      const top = bigInnings.reduce((a,b) => a.runs > b.runs ? a : b);
      resultHeadline += ` — <b>${top.inn}회 ${top.runs}점 빅이닝</b> 결정적`;
    } else if(leadChanges.filter(c => c.type === 'reverse').length){
      const lastReverse = leadChanges.filter(c => c.type === 'reverse').pop();
      resultHeadline += ` — <b>${lastReverse.inn}회 역전승</b>`;
    }
  } else {
    resultHeadline = `<b>무승부 (${totalA}-${totalB})</b>`;
  }
  
  return {
    headline, resultHeadline, mvp, bestPitcher,
    teamA_name, teamB_name, totalA, totalB, winner,
    teamA_pitcher_box, teamB_pitcher_box,
    teamA_batter_box, teamB_batter_box,
    keyMoments: keyMoments.slice(0, 8),
    warnings: warnings.slice(0, 6),
    nextCheckpoints,
    // 새로 추가
    inningFlow, bigInnings, leadChanges, clinchInning,
    winFactors, lossFactors
  };
};

// Original index.html:26715
wbdContext._renderTeamScoutHTML = function _renderTeamScoutHTML(teamName, report, compareReport){
  // 다른 팀 목록 (비교용)
  const allTeams = (window._teamScoutLeagueCache && window._teamScoutLeagueCache.leagueTeamStats)
    ? window._teamScoutLeagueCache.leagueTeamStats.map(t => t.team).filter(t => t !== teamName).sort()
    : [];
  const curOpponent = (window._teamScoutCompare && window._teamScoutCompare.opponent) || '';
  
  let html = `<div style="background:linear-gradient(135deg,rgba(57,255,138,0.08),var(--card));padding:14px;border-radius:8px;margin-bottom:14px;border-left:3px solid #39ff8a">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
      <div>
        <div style="font-size:16px;font-weight:900;color:#39ff8a;margin-bottom:4px">🏆 팀 전력 진단서</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6">
          <b>${teamName}</b> 팀의 강점·약점·운영 추천 (감독용 작전 보고서)
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span style="font-size:10px;color:var(--muted);letter-spacing:0.5px">상대팀 비교:</span>
        <select onchange="_toggleTeamScoutCompare(this.value)" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:5px;font-size:11px;min-width:140px">
          <option value="">선택 안함</option>
          ${allTeams.map(t => `<option value="${t}"${curOpponent===t?' selected':''}>${t}</option>`).join('')}
        </select>
        <button onclick="window.print()" style="background:var(--card2);border:1px solid var(--border);color:var(--text);padding:6px 12px;border-radius:5px;font-size:11px;cursor:pointer">🖨️ 인쇄</button>
      </div>
    </div>
  </div>`;
  
  // ─ 팀 헤더 + 스타일 ─
  html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(57,255,138,0.05),var(--card));border-left:4px solid #39ff8a;padding:18px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:14px">
      <div>
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">TEAM SCOUT REPORT</div>
        <div style="font-size:24px;font-weight:900;color:var(--text);margin-bottom:6px">${teamName}</div>
        <div style="font-size:12px;color:var(--muted)">타자 ${report.batterCount}명 · 투수 ${report.pitcherCount}명 · 총 ${report.gameCount}경기</div>
        <div style="margin-top:10px"><span style="display:inline-block;background:${report.styleColor};color:#000;padding:6px 14px;border-radius:14px;font-size:13px;font-weight:900">🎯 ${report.style}</span></div>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 평가</div>
        <div style="font-size:32px;font-weight:900;color:${report.gradeColor};line-height:1">${report.grade}</div>
        <div style="font-size:11px;color:${report.gradeColor};margin-top:2px">${report.gradeLabel}</div>
      </div>
    </div>
    <div style="background:rgba(57,255,138,0.08);border:1px solid rgba(57,255,138,0.2);padding:12px 16px;border-radius:6px">
      <div style="font-size:10px;color:#39ff8a;font-weight:700;margin-bottom:5px;letter-spacing:1px">감독 총평</div>
      <div style="font-size:13px;line-height:1.7;color:var(--text);font-style:italic">${report.summary}</div>
    </div>
  </div>`;
  
  // ─ 상대팀 비교 (선택 시에만) ─
  if(compareReport){
    const m = report._meta, om = compareReport._meta;
    const fmtPct = v => (v*100).toFixed(0)+'%';
    
    // 항목별 우위 판단
    const compareCells = [
      {label: '타율 (BA)', our: m.pctBA, opp: om.pctBA, ourVal: report.metrics.find(x=>x.label==='팀 타율')?.value || '-', oppVal: compareReport.metrics.find(x=>x.label==='팀 타율')?.value || '-'},
      {label: '파워 (하드힛%)', our: m.pctHH, opp: om.pctHH, ourVal: report.metrics.find(x=>x.label==='하드힛율')?.value || '-', oppVal: compareReport.metrics.find(x=>x.label==='하드힛율')?.value || '-'},
      {label: '선구안 (체이스%)', our: m.pctChase, opp: om.pctChase, ourVal: report.metrics.find(x=>x.label==='체이스율')?.value || '-', oppVal: compareReport.metrics.find(x=>x.label==='체이스율')?.value || '-'},
      {label: '피안타율 (BAA)', our: m.pctBAA, opp: om.pctBAA, ourVal: report.metrics.find(x=>x.label==='피안타율')?.value || '-', oppVal: compareReport.metrics.find(x=>x.label==='피안타율')?.value || '-'},
      {label: '탈삼진 (K%)', our: m.pctK, opp: om.pctK, ourVal: report.metrics.find(x=>x.label==='탈삼진율')?.value || '-', oppVal: compareReport.metrics.find(x=>x.label==='탈삼진율')?.value || '-'},
    ];
    
    // 우위 카운트
    const ourWins = compareCells.filter(c => c.our > c.opp + 0.05).length;
    const oppWins = compareCells.filter(c => c.opp > c.our + 0.05).length;
    const ties = compareCells.length - ourWins - oppWins;
    
    // 승리 플랜 / 피해야 할 운영
    const winPlan = [];
    const avoidOps = [];
    if(m.pctHH > om.pctHH + 0.1) winPlan.push('💥 <b>장타력 우위</b> — 빅이닝 노려라. 4번 풀스윙 적극.');
    if(m.pctBA > om.pctBA + 0.1) winPlan.push('🏏 <b>컨택 우위</b> — 이어치기·진루타로 점수 짜내기 OK.');
    if(m.pctBAA > om.pctBAA + 0.1) winPlan.push('🛡️ <b>투수진 우위</b> — 로우스코어 야구로 끌고 가라. 1-2점차도 충분.');
    if(m.pctK > om.pctK + 0.1) winPlan.push('🎯 <b>탈삼진 우위</b> — 2스트라이크 후 결정구 적극. K로 끝내라.');
    if(m.pctChase < om.pctChase - 0.1) winPlan.push('👁️ <b>선구안 우위</b> — 인내 우선. 좋은 공만 노리고 BB 가져와라.');
    
    if(om.pctHH > m.pctHH + 0.1) avoidOps.push('💥 <b>상대 장타력 위험</b> — 한가운데 실투 금지. HR 코스 피하기.');
    if(om.pctBAA > m.pctBAA + 0.1) avoidOps.push('🛡️ <b>상대 투수진 강함</b> — 큰 이닝 기대 X. 한 점씩 짜내야 함.');
    if(om.pctK > m.pctK + 0.1) avoidOps.push('🎯 <b>상대 탈삼진 강함</b> — 적극 어프로치 자제. 카운트 깊이 가지 마라.');
    
    let verdict = '';
    if(ourWins >= 4) verdict = `<b style="color:#39ff8a">${teamName} 압도 우위</b> — 거의 모든 영역에서 앞섬`;
    else if(ourWins >= 3) verdict = `<b style="color:#39ff8a">${teamName} 우위</b>`;
    else if(oppWins >= 4) verdict = `<b style="color:#ff4560">${compareReport ? Object.values(window._teamScoutCompare)[0] : '상대'} 압도 우위</b> — 매치업 매우 불리`;
    else if(oppWins >= 3) verdict = `<b style="color:#ff4560">상대팀 우위</b>`;
    else verdict = `<b style="color:#ffd700">박빙</b> — 컨디션·기세에 좌우될 매치업`;
    
    html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(204,68,255,0.06),var(--card));border-left:3px solid #cc44ff">
      <div class="card-title" style="color:#cc44ff;font-size:14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        ⚔️ vs <b style="color:#ff4560">${(window._teamScoutCompare&&window._teamScoutCompare.opponent)||''}</b> 매치업 분석
      </div>
      
      <!-- 비교 표 -->
      <div style="overflow-x:auto;margin-bottom:14px"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="border-bottom:1px solid var(--border);color:var(--muted);font-size:10px">
            <th style="padding:8px 8px;text-align:left">지표</th>
            <th style="padding:8px 8px;text-align:center;color:#39ff8a">${teamName}</th>
            <th style="padding:8px 8px;text-align:center">vs</th>
            <th style="padding:8px 8px;text-align:center;color:#ff4560">${(window._teamScoutCompare&&window._teamScoutCompare.opponent)||''}</th>
            <th style="padding:8px 8px;text-align:center">우위</th>
          </tr>
        </thead>
        <tbody>
          ${compareCells.map(c => {
            const ours = c.our > c.opp + 0.05;
            const opps = c.opp > c.our + 0.05;
            const winSide = ours ? '🟢' : opps ? '🔴' : '⚖️';
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:9px 8px;font-weight:700">${c.label}</td>
              <td style="padding:9px 8px;text-align:center;font-family:var(--mono);${ours?'color:#39ff8a;font-weight:900':''}">${c.ourVal}<br><span style="font-size:9px;color:var(--muted)">상위 ${fmtPct(1-c.our)}</span></td>
              <td style="padding:9px 8px;text-align:center;color:var(--muted)">vs</td>
              <td style="padding:9px 8px;text-align:center;font-family:var(--mono);${opps?'color:#ff4560;font-weight:900':''}">${c.oppVal}<br><span style="font-size:9px;color:var(--muted)">상위 ${fmtPct(1-c.opp)}</span></td>
              <td style="padding:9px 8px;text-align:center;font-size:16px">${winSide}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
      
      <!-- 종합 판단 -->
      <div style="background:var(--card2);padding:12px 14px;border-radius:6px;text-align:center;font-size:13px;margin-bottom:14px">
        <div style="font-size:10px;color:var(--muted);letter-spacing:0.5px;margin-bottom:6px">종합 판단</div>
        ${verdict}
        <div style="font-size:11px;color:var(--muted);margin-top:6px">${teamName} ${ourWins}승 · 박빙 ${ties} · 상대 ${oppWins}승</div>
      </div>
      
      <!-- 승리 플랜 / 피해야 할 운영 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" data-scout-grid>
        <div style="background:var(--card2);padding:12px;border-radius:6px;border-left:2px solid #39ff8a">
          <div style="font-size:10px;color:#39ff8a;font-weight:700;margin-bottom:8px;letter-spacing:0.5px">🎯 승리 플랜</div>
          ${winPlan.length ? `<div style="display:flex;flex-direction:column;gap:6px;font-size:11.5px;line-height:1.6">
            ${winPlan.map(p => `<div>${p}</div>`).join('')}
          </div>` : '<div style="font-size:11px;color:var(--muted);font-style:italic">뚜렷한 우위 없음 — 기본기 충실히</div>'}
        </div>
        <div style="background:var(--card2);padding:12px;border-radius:6px;border-left:2px solid #ff4560">
          <div style="font-size:10px;color:#ff4560;font-weight:700;margin-bottom:8px;letter-spacing:0.5px">⚠️ 피해야 할 운영</div>
          ${avoidOps.length ? `<div style="display:flex;flex-direction:column;gap:6px;font-size:11.5px;line-height:1.6">
            ${avoidOps.map(p => `<div>${p}</div>`).join('')}
          </div>` : '<div style="font-size:11px;color:var(--muted);font-style:italic">큰 위험 없음 — 평소대로 운영</div>'}
        </div>
      </div>
    </div>`;
  }
  
  // ─ 공격/수비 종합 등급 (큰 시각화) ─
  const pctToLetterGrade = (pct) => {
    if(pct >= 0.85) return {letter:'S', color:'#ff4560', label:'엘리트'};
    if(pct >= 0.70) return {letter:'A', color:'#ff8c44', label:'상위'};
    if(pct >= 0.55) return {letter:'B+', color:'#ffd700', label:'평균↑'};
    if(pct >= 0.40) return {letter:'B', color:'#39ff8a', label:'평균'};
    if(pct >= 0.25) return {letter:'C', color:'#88ccff', label:'평균↓'};
    return {letter:'D', color:'#888', label:'약체'};
  };
  // 공격 = pctBA + pctHH + pctChase (선구안도 공격에 포함)
  const offensePct = (report._meta.pctBA + report._meta.pctHH + report._meta.pctChase) / 3;
  // 수비 = pctBAA + pctK
  const defensePct = (report._meta.pctBAA + report._meta.pctK) / 2;
  const offGrade = pctToLetterGrade(offensePct);
  const defGrade = pctToLetterGrade(defensePct);
  
  // 비교 메시지
  let compareMsg = '';
  if(offensePct > defensePct + 0.25) compareMsg = '🔥 타격 위주 팀 — 공격은 강하지만 투수진이 약점';
  else if(defensePct > offensePct + 0.25) compareMsg = '🛡️ 수비 위주 팀 — 투수진은 좋지만 타선이 약점';
  else if(offensePct >= 0.70 && defensePct >= 0.70) compareMsg = '⭐ 균형 잡힌 강팀 — 공·수 모두 우수';
  else if(offensePct < 0.40 && defensePct < 0.40) compareMsg = '⚠️ 종합 약체 — 공·수 모두 부족';
  else compareMsg = '⚖️ 균형형 팀';
  
  html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(255,140,68,0.06),var(--card));border-left:3px solid #ff8c44">
    <div class="card-title" style="color:#ff8c44;font-size:14px;margin-bottom:14px">⚔️ 공격 / 🛡️ 수비 종합 등급</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px" data-scout-grid>
      <div style="background:linear-gradient(135deg,${offGrade.color}22,var(--card2));border:2px solid ${offGrade.color}88;border-radius:8px;padding:18px;text-align:center;position:relative;overflow:hidden">
        <div style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:6px">⚔️ OFFENSE · 공격력</div>
        <div style="font-size:56px;font-weight:900;color:${offGrade.color};line-height:1;margin-bottom:6px">${offGrade.letter}</div>
        <div style="font-size:13px;color:${offGrade.color};font-weight:700;margin-bottom:8px">${offGrade.label}</div>
        <div style="font-size:10px;color:var(--muted);line-height:1.5">
          타율 · 파워 · 선구안 종합<br>
          <b style="color:var(--text)">상위 ${((1-offensePct)*100).toFixed(0)}%</b>
        </div>
      </div>
      <div style="background:linear-gradient(135deg,${defGrade.color}22,var(--card2));border:2px solid ${defGrade.color}88;border-radius:8px;padding:18px;text-align:center;position:relative;overflow:hidden">
        <div style="font-size:11px;color:var(--muted);letter-spacing:1px;margin-bottom:6px">🛡️ DEFENSE · 투수력</div>
        <div style="font-size:56px;font-weight:900;color:${defGrade.color};line-height:1;margin-bottom:6px">${defGrade.letter}</div>
        <div style="font-size:13px;color:${defGrade.color};font-weight:700;margin-bottom:8px">${defGrade.label}</div>
        <div style="font-size:10px;color:var(--muted);line-height:1.5">
          피안타율 · 탈삼진 종합<br>
          <b style="color:var(--text)">상위 ${((1-defensePct)*100).toFixed(0)}%</b>
        </div>
      </div>
    </div>
    <div style="margin-top:14px;padding:10px 14px;background:var(--card2);border-radius:6px;text-align:center;font-size:13px;font-weight:700;color:var(--text)">
      ${compareMsg}
    </div>
  </div>`;
  
  // ─ 팀 5대 지표 ─
  html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #88ccff">
    <div class="card-title" style="color:#88ccff;font-size:14px;margin-bottom:14px">📊 팀 5대 지표 (세부)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px" data-scout-grid>`;
  report.metrics.forEach(m => {
    html += `<div style="background:var(--card2);padding:12px;border-radius:6px;text-align:center;border-bottom:3px solid ${m.color}">
      <div style="font-size:10px;color:var(--muted);margin-bottom:4px">${m.label}</div>
      <div style="font-size:22px;font-weight:900;color:${m.color}">${m.value}</div>
      <div style="font-size:10px;color:${m.color};margin-top:3px;font-weight:700">${m.tier}</div>
      <div style="font-size:9px;color:var(--muted);margin-top:3px;line-height:1.4">${m.note}</div>
    </div>`;
  });
  html += `</div></div>`;
  
  // ─ 강점 / 약점 (2컬럼) ─
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" data-scout-grid>
    <div class="card section" style="border-left:3px solid #39ff8a">
      <div class="card-title" style="color:#39ff8a;font-size:13px;margin-bottom:12px">💪 팀 강점</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${report.strengths.map(s => `<div style="background:var(--card2);padding:9px 12px;border-radius:5px;border-left:2px solid #39ff8a;font-size:11.5px;line-height:1.6;color:var(--text)">${s}</div>`).join('')}
      </div>
    </div>
    <div class="card section" style="border-left:3px solid #ff4560">
      <div class="card-title" style="color:#ff4560;font-size:13px;margin-bottom:12px">⚠️ 팀 약점</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${report.weaknesses.map(w => `<div style="background:var(--card2);padding:9px 12px;border-radius:5px;border-left:2px solid #ff4560;font-size:11.5px;line-height:1.6;color:var(--text)">${w}</div>`).join('')}
      </div>
    </div>
  </div>`;
  
  // ─ 핵심 선수 ─
  if(report.coreBatters.length || report.corePitchers.length){
    // 투수를 역할별로 그룹화 (track 정보 우선 활용)
    const pitcherGroups = {};
    (report.corePitchers || []).forEach(p => {
      let group;
      const r = p.role || '';
      // 선발 트랙: track === 'starter'인 모든 선수는 무조건 선발 카테고리에 들어감
      if(p.track === 'starter'){
        if(r.includes('에이스') || r.includes('1선발')) group = '🌟 1선발 (에이스)';
        else if(r.includes('2선발')) group = '⚾ 2선발';
        else if(r.includes('3선발')) group = '🛡️ 3선발';
        else if(r.includes('4선발')) group = '🛡️ 4선발';
        else if(r.includes('백업 선발')) group = '🔧 백업 선발';
        else group = '🔧 백업 선발';
      }
      // 마무리 트랙
      else if(p.track === 'closer'){
        if(r.includes('마무리')) group = '🔒 마무리';
        else group = '🔒 마무리';
      }
      // 셋업 트랙
      else if(p.track === 'setup'){
        if(r.includes('셋업') || r.includes('필승조')) group = '⚡ 필승조 (셋업)';
        else if(r.includes('중간')) group = '🔄 중간 계투';
        else if(r.includes('추격조')) group = '🪶 추격조 / 원포인트';
        else if(r.includes('패전조')) group = '⛔ 패전조';
        else group = '🔄 중간 계투';
      }
      // 롱릴리프 트랙
      else if(p.track === 'long'){
        group = '⏳ 롱릴리프';
      }
      // 기타 (스폿/다목적/대체 자원)
      else {
        if(r.includes('스폿') || r.includes('다목적')) group = '🔄 스폿 / 다목적';
        else group = '🔧 대체 자원';
      }
      
      if(!pitcherGroups[group]) pitcherGroups[group] = [];
      pitcherGroups[group].push(p);
    });
    const pitcherGroupOrder = ['🌟 1선발 (에이스)', '⚾ 2선발', '🛡️ 3선발', '🛡️ 4선발', '🔧 백업 선발', '🔒 마무리', '⚡ 필승조 (셋업)', '🔄 중간 계투', '⏳ 롱릴리프', '🪶 추격조 / 원포인트', '⛔ 패전조', '🔄 스폿 / 다목적', '🔧 대체 자원'];
    
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px" data-scout-grid>
      <div class="card section" style="border-left:3px solid #ff8c44">
        <div class="card-title" style="color:#ff8c44;font-size:13px;margin-bottom:12px">🏏 핵심 타자</div>
        ${report.coreBatters.length ? `<div style="display:flex;flex-direction:column;gap:8px">
          ${report.coreBatters.map(p => `<div style="background:var(--card2);padding:10px 12px;border-radius:5px;cursor:pointer" onclick="openCardDetail('${String(p.name).replace(/'/g,"\\'")}','batter')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:13px;font-weight:700;color:var(--text)">${p.name}</div>
              <div style="font-size:10px;color:#ff8c44;font-weight:700">${p.role}</div>
            </div>
            <div style="font-size:10px;color:var(--muted);line-height:1.5">${p.note}</div>
          </div>`).join('')}
        </div>` : '<div style="color:var(--muted);font-size:11px;font-style:italic">데이터 부족</div>'}
      </div>
      <div class="card section" style="border-left:3px solid #cc44ff">
        <div class="card-title" style="color:#cc44ff;font-size:13px;margin-bottom:12px">⚾ 핵심 투수 (역할별)</div>
        ${report.corePitchers.length ? `<div style="display:flex;flex-direction:column;gap:10px">
          ${pitcherGroupOrder.filter(g => pitcherGroups[g]).map(g => `<div>
            <div style="font-size:10px;color:#cc44ff;font-weight:700;margin-bottom:4px;letter-spacing:0.5px">${g}</div>
            ${pitcherGroups[g].map(p => `<div style="background:var(--card2);padding:8px 11px;border-radius:5px;cursor:pointer;margin-bottom:4px" onclick="openCardDetail('${String(p.name).replace(/'/g,"\\'")}','pitcher')">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <div style="font-size:12px;font-weight:700;color:var(--text)">${p.name}</div>
                <div style="font-size:9.5px;color:#cc44ff;font-weight:700">${p.role}</div>
              </div>
              <div style="font-size:10px;color:var(--muted);line-height:1.5">${p.note}</div>
            </div>`).join('')}
          </div>`).join('')}
        </div>` : '<div style="color:var(--muted);font-size:11px;font-style:italic">데이터 부족</div>'}
      </div>
    </div>`;
  }
  
  // ─ 운영 추천 ─
  html += `<div class="card section" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(255,215,0,0.06),var(--card));border-left:4px solid #ffd700">
    <div class="card-title" style="color:#ffd700;font-size:14px;margin-bottom:12px">💡 감독용 운영 추천</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${report.operations.map(o => `<div style="background:var(--card2);padding:11px 14px;border-radius:6px;border-left:2px solid #ffd700;font-size:12.5px;line-height:1.65;color:var(--text)">${o}</div>`).join('')}
    </div>
  </div>`;
  
  // ─ 추천 라인업 (야구 이론 기반) ─
  if(report.suggestedLineup && report.suggestedLineup.length){
    // 좌우 패턴 분석
    const handPattern = report.suggestedLineup.map(p => p.bZone || '?').join('');
    let patternWarning = '';
    if(/LLL/.test(handPattern)) patternWarning = `<span style="color:#ff8c44">⚠ 좌타 3연속 구간 있음 (좌투 만나면 위험)</span>`;
    else if(/RRR/.test(handPattern)) patternWarning = `<span style="color:#ff8c44">⚠ 우타 3연속 구간 있음 (우투 만나면 위험)</span>`;
    
    html += `<div class="card section" style="margin-bottom:14px;border-left:3px solid #88ccff">
      <div class="card-title" style="color:#88ccff;font-size:13px;margin-bottom:12px">📋 추천 라인업 (야구 이론 기반)</div>
      <div style="font-size:10px;color:var(--muted);margin-bottom:10px;background:var(--card2);padding:6px 10px;border-radius:4px;line-height:1.5">
        💡 야구 정석 라인업: <b>2번에 최고 타자</b>(현대 야구), 3번 종합 best, 4번 순수 파워, 5번 보호. 1번은 출루+선구안.
        ${patternWarning ? '<br>'+patternWarning : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${report.suggestedLineup.map((p, i) => {
          const handColor = p.bZone === 'L' ? '#ff6b8a' : p.bZone === 'R' ? '#88ccff' : '#888';
          return `<div style="display:grid;grid-template-columns:42px 1fr 1.8fr;gap:10px;align-items:center;background:var(--card2);padding:9px 12px;border-radius:5px;border-left:3px solid ${handColor}">
            <div style="font-size:14px;font-weight:900;color:#88ccff;text-align:center">${i+1}번</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);cursor:pointer" onclick="openCardDetail('${String(p.name).replace(/'/g,"\\'")}','batter')">${p.name}</div>
            <div style="font-size:10.5px;color:var(--muted);line-height:1.5">${p.note}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }
  
  html += `<div style="background:var(--card2);padding:10px 14px;border-radius:6px;font-size:10px;color:var(--muted);line-height:1.6;text-align:center">
    🏆 팀 전력 진단서 — ${report.gameCount}경기 · 타자 ${report.batterCount}명 / 투수 ${report.pitcherCount}명 데이터 기반
  </div>`;
  
  return html;
};

// Original index.html:27058
wbdContext._gIndexOf = function _gIndexOf(d){
  if(!window._gIdxMap || window._gIdxMap._k!==wbdContext.G.length){
    const m=new Map();
    for(let i=0;i<wbdContext.G.length;i++) m.set(wbdContext.G[i], i);
    m._k=wbdContext.G.length;
    window._gIdxMap=m;
  }
  const v=window._gIdxMap.get(d);
  return v===undefined ? -1 : v;
};
}

export function initialize(wbdContext) {
// Original index.html:25872
window._gameReportState = window._gameReportState || {gameId: null};
}
