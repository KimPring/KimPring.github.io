/** team-visuals: migrated analysis and UI logic. Shared state is explicit in wbdContext. */
export function register(wbdContext) {
// Original index.html:12310
wbdContext._setTeamSprayZone = function _setTeamSprayZone(which, mode){
  window._teamSprayZone[which] = (window._teamSprayZone[which]===mode) ? 'off' : mode;
  if(which==='bat') wbdContext.renderTeamBat(); else wbdContext.renderTeamPit();
};

// Original index.html:12314
wbdContext._teamSprayZoneBtns = function _teamSprayZoneBtns(which){
  const cur=window._teamSprayZone[which]||'off';
  const b=(v,l)=>`<button onclick="_setTeamSprayZone('${which}','${v}')" style="padding:3px 9px;font-size:10px;border:1px solid ${cur===v?'var(--amber)':'var(--border)'};background:${cur===v?'rgba(245,166,35,0.15)':'transparent'};color:${cur===v?'var(--amber)':'var(--muted)'};border-radius:4px;cursor:pointer">${l}</button>`;
  return `<div style="display:flex;gap:4px;justify-content:center;margin-bottom:8px">
    ${b('all','전체')}${b('infield','내야')}${b('outfield','외야')}
    ${cur!=='off'?`<button onclick="_setTeamSprayZone('${which}','${cur}')" style="padding:3px 9px;font-size:10px;border:1px solid var(--border);background:transparent;color:var(--muted);border-radius:4px;cursor:pointer">해제</button>`:''}
  </div>`;
};

// Original index.html:12323
wbdContext.renderTeamReport = function renderTeamReport(){
  const el=document.getElementById('team-report-content');
  if(!el) return;
  const team=wbdContext._curTeam();
  if(!team){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>'; return; }
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ 진단서 생성 중...</div>';
  setTimeout(()=>{
    try{
      const prof=wbdContext._computeTeamProfiles();
      const t=prof.byName[team];
      if(!t){ el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">데이터 부족 (${team})</div>`; return; }
      const P=prof.pctOf, A=wbdContext._teamAreaScores(prof,t);
      const cmpName=window._teamCompare;
      const ct=(cmpName&&prof.byName[cmpName])?prof.byName[cmpName]:null;
      const CA=ct?wbdContext._teamAreaScores(prof,ct):null;

      // ── 종합 등급 (개요와 동일 기준: TEAM_W) ──
      const S=wbdContext._teamScores(prof,t);
      const batScore=S.bat, pitScore=S.pit, defScore=S.def, total=S.total;
      const defOAA=S.defInfo.oaa, defRank=S.defInfo.rank, defTeams=S.defInfo.n;
      const W={contact:wbdContext.TEAM_W.total.bat*wbdContext.TEAM_W.bat.contact, power:wbdContext.TEAM_W.total.bat*wbdContext.TEAM_W.bat.power,
               eye:wbdContext.TEAM_W.total.bat*wbdContext.TEAM_W.bat.eye, pStuff:wbdContext.TEAM_W.total.pit*wbdContext.TEAM_W.pit.pStuff,
               pCtrl:wbdContext.TEAM_W.total.pit*wbdContext.TEAM_W.pit.pCtrl, pResult:wbdContext.TEAM_W.total.pit*wbdContext.TEAM_W.pit.pResult,
               def:wbdContext.TEAM_W.total.def};
      const CLb=wbdContext._teamClutch(team,'bat'), CLp=wbdContext._teamClutch(team,'pit');
      const grade=wbdContext._teamGrade(total), gColor=wbdContext._teamGradeColor(grade), gLabel=wbdContext._teamGradeLabel(total);

      // ── 8영역 바 ──
      const areas=[
        {k:'컨택',v:A.contact,w:W.contact,d:`팀타율 ${t.avg.toFixed(3).replace(/^0/,'')} · K% ${t.kPct.toFixed(1)}% · 존내컨택 ${t.zContactPct.toFixed(1)}%`},
        {k:'파워',v:A.power,w:W.power,d:`HR% ${t.hrPct.toFixed(1)}% · 배럴+% ${t.brlpPct.toFixed(1)}% · ISO ${t.iso.toFixed(3).replace(/^0/,'')} · 배럴% ${t.brlPct.toFixed(1)}% · EV ${t.avgEV.toFixed(1)}`},
        {k:'선구',v:A.eye,w:W.eye,d:`BB% ${t.bbPct.toFixed(1)}% · 체이스 ${t.chasePct.toFixed(1)}% · 존내스윙 ${t.zSwingPct.toFixed(1)}%`},
        {k:'투수 구위',v:A.pStuff,w:W.pStuff,d:`피안타율 ${t.oAvg.toFixed(3).replace(/^0/,'')} · 헛스윙 ${t.pWhiffPct.toFixed(1)}% · 피배럴+ ${t.pBrlpPct.toFixed(1)}% · 피EV ${t.pAvgEV.toFixed(1)}`},
        {k:'투수 제구',v:A.pCtrl,w:W.pCtrl,d:`실투 ${t.pMidPct.toFixed(1)}% · 보더라인 ${t.pBorderPct.toFixed(1)}% · BB% ${t.pBBPct.toFixed(1)}%`},
        {k:'투수 결과',v:A.pResult,w:W.pResult,d:`FIP ${t.fip!=null?t.fip.toFixed(2):'-'} · ERA ${t.era!=null?t.era.toFixed(2):'-'} · WHIP ${t.whip!=null?t.whip.toFixed(2):'-'} · K/9 ${t.k9.toFixed(1)}`},
        {k:'수비 (참고)',v:defScore,w:W.def,d:defOAA!=null?`팀 OAA ${defOAA>0?'+':''}${defOAA.toFixed(1)} · 리그 ${defRank}/${defTeams}위`:'데이터 부족',ref:true},
        {k:'클러치 타격 (참고)',v:CLb.pct,w:0,
         d:CLb.ops!=null?`득점권 OPS ${CLb.ops.toFixed(3).replace(/^0/,'')} (리그 ${CLb.lgOps.toFixed(3).replace(/^0/,'')} · ${CLb.diff>=0?'+':''}${(CLb.diff*1000).toFixed(0)}) · ${CLb.ab}타수`:'표본 부족 (10타수 미만)',
         ref:true, noWeight:true},
        {k:'클러치 투수 (참고)',v:CLp.pct,w:0,
         d:CLp.ops!=null?`득점권 피OPS ${CLp.ops.toFixed(3).replace(/^0/,'')} (리그 ${CLp.lgOps.toFixed(3).replace(/^0/,'')} · ${CLp.diff>=0?'+':''}${(CLp.diff*1000).toFixed(0)}) · ${CLp.ab}타수`:'표본 부족 (10타수 미만)',
         ref:true, noWeight:true}
      ];
      // 영역 키 → CA 매핑 (비교용)
      const _areaKeyMap={'컨택':'contact','파워':'power','선구':'eye','투수 구위':'pStuff','투수 제구':'pCtrl','투수 결과':'pResult'};
      let cmpWin=0, cmpLose=0;
      const areaBars=areas.map(a=>{
        const c=wbdContext._pctColor(a.v), tier=wbdContext._pctTier(a.v);
        const ck=_areaKeyMap[a.k];
        const cv=(CA&&ck&&CA[ck]!=null)?CA[ck]:null;
        if(cv!=null){ if(a.v>cv+0.02)cmpWin++; else if(a.v<cv-0.02)cmpLose++; }
        const cc=cv!=null?wbdContext._pctColor(cv):null;
        return `<div style="margin-bottom:10px;${a.ref?'opacity:0.75':''}">
          <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:12px;margin-bottom:3px">
            <span style="font-weight:600">${a.k} <span style="font-size:9px;color:var(--muted)">${a.noWeight?'등급 미반영':'비중 '+(a.w*100).toFixed(0)+'%'}</span></span>
            <span style="font-family:var(--mono);color:${c};font-weight:700">${tier} <span style="font-size:10px">${wbdContext._pctLabel(a.v)}</span>
              ${cv!=null?`<span style="font-size:10px;color:var(--muted);margin-left:5px">vs</span> <span style="color:${cc};font-size:12px" title="${cmpName}">${wbdContext._pctTier(cv)}</span>`:''}</span>
          </div>
          <div style="height:14px;background:var(--card2);border-radius:7px;overflow:hidden;position:relative">
            <div style="height:100%;width:${(a.v*100).toFixed(0)}%;background:${c};opacity:0.8"></div>
            ${cv!=null?`<div style="position:absolute;left:${(cv*100).toFixed(0)}%;top:0;width:2.5px;height:100%;background:#88ccff"></div>`:''}
            <div style="position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.35)"></div>
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:2px">${a.d}</div>
        </div>`;
      }).join('');
      // 매치업 총평
      const matchupHTML=CA?(()=>{
        const verdict = cmpWin>cmpLose+1 ? `<b style="color:#39ff8a">${team} 우위</b>`
                      : cmpLose>cmpWin+1 ? `<b style="color:#ff4560">${cmpName} 우위</b>`
                      : `<b style="color:#ffd700">박빙</b>`;
        return `<div class="card section" style="border-left:4px solid #88ccff">
          <div class="card-title">⚔️ ${team} vs ${cmpName} 매치업</div>
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div style="text-align:center;min-width:100px">
              <div style="font-size:11px;color:var(--muted)">영역 승패</div>
              <div style="font-family:var(--mono);font-size:26px;font-weight:900">
                <span style="color:#39ff8a">${cmpWin}</span><span style="color:var(--muted);font-size:16px">승</span>
                <span style="color:#ff4560">${cmpLose}</span><span style="color:var(--muted);font-size:16px">패</span>
              </div>
            </div>
            <div style="flex:1;min-width:200px;font-size:12px;line-height:1.8">
              ${verdict} — 6개 평가 영역 중 ${cmpWin}개에서 앞섬.<br>
              <span style="color:var(--muted);font-size:11px">막대의 파란 선이 ${cmpName}의 위치입니다.</span>
            </div>
          </div>
        </div>`;
      })():'';

      // ── 자동 코멘트 ──
      const sorted=areas.filter(a=>!a.ref).slice().sort((x,y)=>y.v-x.v);
      const best=sorted[0], worst=sorted[sorted.length-1];
      const comments=[];
      comments.push(`<b style="color:${wbdContext._pctColor(best.v)}">${best.k}</b>이(가) 팀의 핵심 강점 (${wbdContext._pctLabel(best.v)}). ${best.d}`);
      comments.push(`<b style="color:${wbdContext._pctColor(worst.v)}">${worst.k}</b>이(가) 가장 취약 (${wbdContext._pctLabel(worst.v)}). 보강 시 순위 상승 여지.`);
      const batAvg=(A.contact+A.power+A.eye)/3, pitAvg=(A.pStuff+A.pCtrl+A.pResult)/3;
      if(Math.abs(batAvg-pitAvg)>0.18){
        comments.push(batAvg>pitAvg
          ? `타선(${wbdContext._pctTier(batAvg)})이 마운드(${wbdContext._pctTier(pitAvg)})보다 강한 <b>공격형 팀</b> — 투수 보강이 우선.`
          : `마운드(${wbdContext._pctTier(pitAvg)})가 타선(${wbdContext._pctTier(batAvg)})보다 강한 <b>수비형 팀</b> — 타선 보강이 우선.`);
      } else {
        comments.push(`타선(${wbdContext._pctTier(batAvg)})과 마운드(${wbdContext._pctTier(pitAvg)})가 균형 잡힌 <b>밸런스형 팀</b>.`);
      }
      if(t.fip!=null&&t.era!=null&&Math.abs(t.era-t.fip)>0.7){
        comments.push(t.era>t.fip
          ? `ERA(${t.era.toFixed(2)})가 FIP(${t.fip.toFixed(2)})보다 높음 — <b>수비·운이 투수진을 깎아먹는 중</b>. 실제 투구력은 더 좋음.`
          : `ERA(${t.era.toFixed(2)})가 FIP(${t.fip.toFixed(2)})보다 낮음 — <b>수비·운의 덕</b>을 보는 중. 지속 여부 주의.`);
      }

      // ── 핵심 선수 ──
      const topBat=t.batters.slice().sort((a,b)=>(b.owar||0)-(a.owar||0)).slice(0,3);
      const topPit=t.pitchers.slice().sort((a,b)=>(b.pwar||0)-(a.pwar||0)).slice(0,3);
      const plHTML=(arr,type)=>arr.map((p,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;background:${i===0?'rgba(245,166,35,0.10)':'var(--card2)'};border-radius:4px;margin-bottom:4px">
        <span style="font-size:12px;font-weight:${i===0?'700':'400'};cursor:pointer;color:${i===0?'var(--amber)':'var(--text)'}" onclick="openCardDetail('${String(p.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}','${type}')">${i===0?'⭐ ':''}${p.name}</span>
        <span style="font-family:var(--mono);font-size:11px">${type==='batter'?`${(p.avg||0).toFixed(3).replace(/^0/,'')} · ${p.HR||0}HR · WAR ${(p.owar||0).toFixed(2)}`:`${p.era!=null?p.era.toFixed(2):'-'} · ${(p.IP||0).toFixed(1)}IP · WAR ${(p.pwar||0).toFixed(2)}`}</span>
      </div>`).join('');

      el.innerHTML=wbdContext._teamCompareBar()+matchupHTML+`
      <div class="card section" style="background:linear-gradient(135deg,var(--card),var(--card2));border-left:5px solid ${gColor}">
        <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          <div style="text-align:center;min-width:110px">
            <div style="font-size:11px;color:var(--muted);letter-spacing:1px">종합 등급</div>
            <div style="font-size:52px;font-weight:900;color:${gColor};line-height:1.1;font-family:var(--cond)">${grade}</div>
            <div style="font-size:11px;color:var(--muted);font-family:var(--mono)">${(total*100).toFixed(0)}점</div>
          </div>
          <div style="flex:1;min-width:220px">
            <div style="font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px">${wbdContext._teamLogoHTML?wbdContext._teamLogoHTML(team,28):''}${team}</div>
            <div style="font-size:13px;color:${gColor};font-weight:600;margin-top:4px">${gLabel}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:6px">
              타자 ${t.batters.length}명 · 투수 ${t.pitchers.length}명 · ${t.PA}타석 / ${t.IP.toFixed(1)}이닝 ·
              총 WAR <b style="color:var(--amber)">${t.war.toFixed(2)}</b>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${[['🏏 타격',batScore,`컨택${(wbdContext.TEAM_W.bat.contact*100).toFixed(0)}·파워${(wbdContext.TEAM_W.bat.power*100).toFixed(0)}·선구${(wbdContext.TEAM_W.bat.eye*100).toFixed(0)}`],
               ['⚾ 투수',pitScore,`구위${(wbdContext.TEAM_W.pit.pStuff*100).toFixed(0)}·제구${(wbdContext.TEAM_W.pit.pCtrl*100).toFixed(0)}·결과${(wbdContext.TEAM_W.pit.pResult*100).toFixed(0)}`],
               ['🛡️ 수비',defScore, defOAA!=null?`OAA ${defOAA>0?'+':''}${defOAA.toFixed(1)} · ${defRank}/${defTeams}위`:'데이터 부족'],
               ['💥 클러치 타격',CLb.pct, CLb.ops!=null?`득점권 OPS ${CLb.ops.toFixed(3).replace(/^0/,'')} · ${CLb.diff>=0?'+':''}${(CLb.diff*1000).toFixed(0)}`:'표본 부족', true],
               ['🔥 클러치 투수',CLp.pct, CLp.ops!=null?`득점권 피OPS ${CLp.ops.toFixed(3).replace(/^0/,'')} · ${CLp.diff>=0?'+':''}${(CLp.diff*1000).toFixed(0)}`:'표본 부족', true]]
              .map(([lbl,sc,sub,ref])=>{
                const g=wbdContext._teamGrade(sc), col=wbdContext._teamGradeColor(g);
                return `<div style="min-width:96px;text-align:center;background:var(--card2);border:1px ${ref?'dashed':'solid'} ${col}44;border-radius:7px;padding:9px 11px${ref?';opacity:0.88':''}"${ref?' title="종합 등급 미반영 참고 지표"':''}>
                  <div style="font-size:10.5px;color:var(--muted)">${lbl}${ref?' <span style="font-size:8px;opacity:0.8">참고</span>':''}</div>
                  <div style="font-family:var(--cond);font-size:26px;font-weight:900;color:${col};line-height:1.15">${g}</div>
                  <div style="font-size:9px;color:${col};opacity:0.85">${(sc*100).toFixed(0)}점</div>
                  <div style="font-size:8.5px;color:var(--muted);margin-top:2px">${sub}</div>
                </div>`;
              }).join('')}
          </div>
        </div>
      </div>

      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">영역별 평가 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 백분위 · 중앙선=평균)</span></div>
          ${areaBars}
        </div>
        <div class="card">
          <div class="card-title">진단 코멘트</div>
          <div style="font-size:12px;line-height:1.9">
            ${comments.map(c=>`<div style="padding:7px 10px;background:var(--card2);border-radius:4px;margin-bottom:6px">${c}</div>`).join('')}
          </div>
          <div style="margin-top:12px;padding:8px;background:rgba(255,193,7,0.07);border:1px solid rgba(255,193,7,0.25);border-radius:4px;font-size:10px;color:#ffc107;line-height:1.6">
            ⚠️ 수비(OAA)는 추정 지표라 <b>비중 5%</b>로만 반영합니다. 등급을 좌우하지 않습니다.
          </div>
        </div>
      </div>

      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">🏏 핵심 타자 (oWAR 상위)</div>
          ${plHTML(topBat,'batter')||'<div style="font-size:11px;color:var(--muted)">데이터 없음</div>'}
        </div>
        <div class="card">
          <div class="card-title">⚾ 핵심 투수 (pWAR 상위)</div>
          ${plHTML(topPit,'pitcher')||'<div style="font-size:11px;color:var(--muted)">데이터 없음</div>'}
        </div>
      </div>

      <div style="font-size:10px;color:var(--muted);text-align:center;padding:10px">
        ※ 활성 경기 기준 · <b>개요 탭과 동일한 기준</b>으로 계산 (타격 45% + 투수 45% + 수비 10%)<br>
        타격 = 컨택 35 · 파워 40 · 선구 25 &nbsp;|&nbsp; 투수 = 구위 35 · 제구 25 · 결과 40<br>
        상세 분석은 각 탭(타격·투수·수비·추이)에서 확인
      </div>`;
    }catch(e){
      console.error('team report error',e);
      el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">진단서 오류: ${e.message}</div>`;
    }
  },30);
};

// Original index.html:12515
wbdContext.renderTeamBat = function renderTeamBat(){
  const el=document.getElementById('team-bat-content');
  if(!el) return;
  const team=wbdContext._curTeam();
  if(!team){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>'; return; }
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ 분석 중...</div>';
  setTimeout(()=>{
    try{
      const prof=wbdContext._computeTeamProfiles();
      const t=prof.byName[team];
      if(!t){ el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">데이터 부족 (${team})</div>`; return; }
      const P=prof.pctOf;
      // 팀 타자들의 투구 데이터
      const pitches=wbdContext._teamPitchIndex().bat[team]||[];
      const inplay=pitches.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));

      // ── 1) 타구 방향 분포 (좌측/중앙/우측) ──
      const side={left:0,center:0,right:0};
      inplay.forEach(d=>{ const s=wbdContext._fieldSide(d); if(s)side[s]++; });
      const sideTot=side.left+side.center+side.right||1;
      // 리그 평균 방향
      const _ld=wbdContext._leagueDir();
      const lgDir=_ld.counts, lgDirTot=_ld.total;
      const dirBar=(lbl,v,lv,col)=>{
        const p=v/sideTot*100, lp=lv/lgDirTot*100, diff=p-lp;
        return `<div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
            <span>${lbl}</span>
            <span style="font-family:var(--mono)">${p.toFixed(1)}% <span style="color:${diff>2?'#39ff8a':diff<-2?'#ff4560':'var(--muted)'};font-size:10px">(리그 ${lp.toFixed(1)}%, ${diff>=0?'+':''}${diff.toFixed(1)})</span></span>
          </div>
          <div style="height:12px;background:var(--card2);border-radius:6px;overflow:hidden;position:relative">
            <div style="height:100%;width:${Math.min(100,p)}%;background:${col};opacity:0.75"></div>
            <div style="position:absolute;left:${Math.min(100,lp)}%;top:0;height:100%;width:2px;background:#fff;opacity:0.6" title="리그 평균"></div>
          </div>
        </div>`;
      };

      // ── 2) 타구질 6분류 ──
      const q={barrelPlus:0,solid:0,flare:0,topped:0,under:0,weak:0};
      inplay.forEach(d=>{q[wbdContext._bbQuality(d)]++;});
      const qTot=Object.values(q).reduce((a,b)=>a+b,0)||1;
      const _lq=wbdContext._leagueBBQ();
      const lgQ=_lq.counts, lgQTot=_lq.total;
      const qBars=wbdContext._BBQ_ORDER.map(k=>{
        const m=wbdContext._BBQ_META[k], p=q[k]/qTot*100, lp=lgQ[k]/lgQTot*100, diff=p-lp;
        return `<div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
            <span style="color:${m.color}">${m.label}</span>
            <span style="font-family:var(--mono)">${p.toFixed(1)}% <span style="color:${diff>1.5?'#39ff8a':diff<-1.5?'#ff4560':'var(--muted)'};font-size:10px">(${diff>=0?'+':''}${diff.toFixed(1)})</span></span>
          </div>
          <div style="height:10px;background:var(--card2);border-radius:5px;overflow:hidden;position:relative">
            <div style="height:100%;width:${Math.min(100,p*2.5)}%;background:${m.color};opacity:0.7"></div>
            <div style="position:absolute;left:${Math.min(100,lp*2.5)}%;top:0;height:100%;width:2px;background:#fff;opacity:0.55"></div>
          </div>
        </div>`;
      }).join('');

      // ── 3) 팀 스프레이 (공통 함수) ──
      const dots=inplay.filter(d=>d.lx!=null&&d.lz!=null&&(+d.lx||+d.lz)).map(d=>{
        const isHR=+d.result===4, isH=(+d['1BSafe']===1)||isHR;
        return {lx:+d.lx,lz:+d.lz,color:isHR?'#ffd700':(isH?'#39ff8a':'#8090a0'),r:2.4,op:0.75};
      });
      const _bz=window._teamSprayZone.bat||'off';
      const sprayHTML=wbdContext._renderSprayField(dots,{w:420,h:360,pad:10, zoneOverlay:(_bz==='off'?null:_bz)});

      // ── 4) 팀 존 히트맵 (공통 함수) ──
      const zc={};
      pitches.forEach(d=>{
        if(d.zoneX==null)return;
        const [c,r]=wbdContext._zoneCell(d.zoneX,d.zoneY);
        const k=c+','+r;
        if(!zc[k])zc[k]={ab:0,h:0,tb:0,n:0};
        zc[k].n++;
        const res=+d.result;
        if(wbdContext._isABPitch(d))zc[k].ab++;
        if(wbdContext._isHit(d)){zc[k].h++; zc[k].tb+=(+d._hitBase||(res===4?4:1));}
      });
      const zcells={};
      Object.entries(zc).forEach(([k,c])=>{
        if(c.ab<1){ zcells[k]={text:'-',sub:c.n+'구',fill:'#0a1828'}; return; }
        const avg=c.h/c.ab;
        // 절대 기준 팔레트 (다른 존맵과 동일) + 표본 적으면 테두리로 표시
        zcells[k]={text:avg.toFixed(3).replace(/^0/,''),sub:c.n+'구',
                   fill:wbdContext._hotColdPalette(wbdContext._absHotScore('avg',avg)),
                   lowN:(c.ab<5)};
      });
      const zoneHTML=wbdContext._renderZoneHeat(zcells,{size:52});

      // ── 5) 팀 타자 요약 테이블 ──
      const bs=t.batters.slice().sort((a,b)=>(b.PA||0)-(a.PA||0));
      const rows=bs.map(b=>`<tr>
        <td style="font-weight:600;cursor:pointer;color:var(--amber)" onclick="openCardDetail('${String(b.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}','batter')">${b.name}</td>
        <td style="font-family:var(--mono)">${b.PA||0}</td>
        <td style="font-family:var(--mono);font-weight:600">${(b.avg||0).toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono)">${(b.ops||0).toFixed(3).replace(/^0/,'')}</td>
        <td style="font-family:var(--mono)">${b.HR||0}</td>
        <td style="font-family:var(--mono)">${b.evN>0?(b.avgEV||0).toFixed(1):'-'}</td>
        <td style="font-family:var(--mono);color:#ff2020">${b.evN>0?(b.brlpPct||0).toFixed(1):'-'}</td>
        <td style="font-family:var(--mono)">${b.avgLA!=null?b.avgLA.toFixed(1)+'°':'-'}</td>
        <td style="font-family:var(--mono);color:var(--amber)">${(b.owar||0).toFixed(2)}</td>
      </tr>`).join('');

      const f3=v=>v!=null?v.toFixed(3).replace(/^0/,''):'-';
      el.innerHTML=wbdContext._teamCompareBar()+wbdContext._teamCmpStatRow(team,'bat')+`
      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">타구 방향 분포 <span style="font-size:10px;color:var(--muted);font-weight:400">(흰 선 = 리그 평균)</span></div>
          ${dirBar('좌측 (LF·3루)',side.left,lgDir.left,wbdContext._SIDE_COLOR.left)}
          ${dirBar('중앙 (CF)',side.center,lgDir.center,wbdContext._SIDE_COLOR.center)}
          ${dirBar('우측 (RF·1루)',side.right,lgDir.right,wbdContext._SIDE_COLOR.right)}
          <div style="margin-top:10px;padding:8px;background:var(--card2);border-radius:4px;font-size:11px;color:var(--muted)">
            평균 발사각 <b style="color:var(--text)">${t.avgLA!=null?t.avgLA.toFixed(1)+'°':'-'}</b> ·
            평균 EV <b style="color:var(--text)">${t.avgEV.toFixed(1)}</b> ·
            인플레이 <b style="color:var(--text)">${inplay.length}</b>
          </div>
        </div>
        <div class="card">
          <div class="card-title">타구 품질 분포 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 대비)</span></div>
          ${qBars}
        </div>
      </div>
      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">팀 스프레이 차트</div>
          ${wbdContext._teamSprayZoneBtns('bat')}
          <div style="max-width:420px;width:100%;margin:0 auto">${sprayHTML}</div>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:4px">🟡 홈런 · 🟢 안타 · ⚪ 아웃</div>
        </div>
        <div class="card">
          <div class="card-title">팀 존별 타율 (5×5)</div>
          <div style="text-align:center">${zoneHTML}</div>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:4px">셀 = 타율 · <span style="color:#d22d32">빨강=강점</span> · <span style="color:#1e55c8">파랑=약점</span> · 가운데 3×3 = 스트라이크존 · 점선=표본 부족</div>
        </div>
      </div>
      <div class="card section">
        <div class="card-title">타자별 요약 (${bs.length}명)</div>
        <div class="tbl-wrap"><table class="data-table"><thead><tr>
          ${wbdContext._sortTh('선수')}${wbdContext._sortTh('타석')}${wbdContext._sortTh('타율')}${wbdContext._sortTh('OPS')}${wbdContext._sortTh('홈런')}${wbdContext._sortTh('평균EV')}${wbdContext._sortTh('배럴+%')}${wbdContext._sortTh('평균LA')}${wbdContext._sortTh('oWAR')}
        </tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }catch(e){
      console.error('team bat error',e);
      el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">타격 탭 오류: ${e.message}</div>`;
    }
  },30);
};

// Original index.html:12662
wbdContext.renderTeamPit = function renderTeamPit(){
  const el=document.getElementById('team-pit-content');
  if(!el) return;
  const team=wbdContext._curTeam();
  if(!team){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>'; return; }
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ 분석 중...</div>';
  setTimeout(()=>{
    try{
      const prof=wbdContext._computeTeamProfiles();
      const t=prof.byName[team];
      if(!t){ el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">데이터 부족 (${team})</div>`; return; }
      const P=prof.pctOf;
      const pitches=wbdContext._teamPitchIndex().pit[team]||[];
      const inplay=pitches.filter(d=>wbdContext._isInPlay(d)&&!wbdContext._isBunt(d));

      // ── 1) 구종 운용 분포 ──
      const grp={};
      pitches.forEach(d=>{
        const g=wbdContext.pitchGroup(d.pType,d);
        if(!grp[g])grp[g]={n:0,sw:0,wh:0,ip:0,hits:0,evSum:0,evN:0,brlp:0};
        const G_=grp[g]; G_.n++;
        if(wbdContext._isSwing(d))G_.sw++;
        if(wbdContext._isWhiff(d))G_.wh++;
        if(wbdContext._isInPlay(d)&&!wbdContext._isBunt(d)){G_.ip++; G_.evSum+=+d.ev; G_.evN++; if(wbdContext._isBarrelPlus(d))G_.brlp++;}
        if(wbdContext._isHit(d))G_.hits++;
      });
      const gTot=pitches.length||1;
      const gRows=Object.entries(grp).sort((a,b)=>b[1].n-a[1].n).map(([g,v])=>{
        const pct=v.n/gTot*100;
        const wh=v.sw>0?v.wh/v.sw*100:0;
        const ev=v.evN>0?v.evSum/v.evN:0;
        const bp=v.ip>0?v.brlp/v.ip*100:0;
        return `<tr>
          <td style="color:${wbdContext.GROUP_COLORS[g]||'#888'};font-weight:600">${g}</td>
          <td style="font-family:var(--mono)">${v.n}</td>
          <td style="font-family:var(--mono)">${pct.toFixed(1)}%</td>
          <td style="font-family:var(--mono);color:${wh>35?'#39ff8a':wh<20?'#ff4560':'inherit'}">${wh.toFixed(0)}%</td>
          <td style="font-family:var(--mono)">${ev>0?ev.toFixed(1):'-'}</td>
          <td style="font-family:var(--mono);color:${bp>12?'#ff4560':bp<6?'#39ff8a':'inherit'}">${v.ip>0?bp.toFixed(1)+'%':'-'}</td>
        </tr>`;
      }).join('');

      // ── 2) 피타구 품질 ──
      const q={barrelPlus:0,solid:0,flare:0,topped:0,under:0,weak:0};
      inplay.forEach(d=>{q[wbdContext._bbQuality(d)]++;});
      const qTot=Object.values(q).reduce((a,b)=>a+b,0)||1;
      const _lq=wbdContext._leagueBBQ();
      const lgQ=_lq.counts, lgQTot=_lq.total;
      const qBars=wbdContext._BBQ_ORDER.map(k=>{
        const m=wbdContext._BBQ_META[k], p=q[k]/qTot*100, lp=lgQ[k]/lgQTot*100, diff=p-lp;
        // 투수 관점: 배럴+/솔리드 허용은 나쁨(빨강), 톱드/언더/위크는 좋음(초록)
        const good=['topped','under','weak'].includes(k);
        const dc = diff>1.5 ? (good?'#39ff8a':'#ff4560') : diff<-1.5 ? (good?'#ff4560':'#39ff8a') : 'var(--muted)';
        return `<div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
            <span style="color:${m.color}">${m.label}</span>
            <span style="font-family:var(--mono)">${p.toFixed(1)}% <span style="color:${dc};font-size:10px">(${diff>=0?'+':''}${diff.toFixed(1)})</span></span>
          </div>
          <div style="height:10px;background:var(--card2);border-radius:5px;overflow:hidden;position:relative">
            <div style="height:100%;width:${Math.min(100,p*2.5)}%;background:${m.color};opacity:0.7"></div>
            <div style="position:absolute;left:${Math.min(100,lp*2.5)}%;top:0;height:100%;width:2px;background:#fff;opacity:0.55"></div>
          </div>
        </div>`;
      }).join('');

      // ── 3) 팀 피타구 스프레이 ──
      const dots=inplay.filter(d=>d.lx!=null&&d.lz!=null&&(+d.lx||+d.lz)).map(d=>{
        const isHR=+d.result===4, isH=(+d['1BSafe']===1)||isHR;
        return {lx:+d.lx,lz:+d.lz,color:isHR?'#ffd700':(isH?'#ff4560':'#39ff8a'),r:2.4,op:0.75};
      });
      const _pz=window._teamSprayZone.pit||'off';
      const sprayHTML=wbdContext._renderSprayField(dots,{w:420,h:360,pad:10, zoneOverlay:(_pz==='off'?null:_pz)});

      // ── 4) 투구 위치 존 히트맵 ──
      const zc={};
      pitches.forEach(d=>{
        if(d.zoneX==null)return;
        const [c,r]=wbdContext._zoneCell(d.zoneX,d.zoneY);
        const k=c+','+r;
        if(!zc[k])zc[k]={n:0,sw:0,wh:0,ab:0,h:0};
        zc[k].n++;
        if(wbdContext._isSwing(d))zc[k].sw++;
        if(wbdContext._isWhiff(d))zc[k].wh++;
        if(wbdContext._isABPitch(d))zc[k].ab++;
        if(wbdContext._isHit(d))zc[k].h++;
      });
      const zcells={};
      Object.entries(zc).forEach(([k,c])=>{
        if(c.ab<1){ zcells[k]={text:'-',sub:c.n+'구',fill:'#0a1828'}; return; }
        const oavg=c.h/c.ab;
        // 투수 관점: 피안타율 높으면 나쁨(빨강), 낮으면 좋음(파랑) — 타자와 같은 색 규칙
        zcells[k]={text:oavg.toFixed(3).replace(/^0/,''), sub:c.n+'구',
                   fill:wbdContext._hotColdPalette(wbdContext._absHotScore('avg',oavg)),
                   lowN:(c.ab<5)};
      });
      const zoneHTML=wbdContext._renderZoneHeat(zcells,{size:52});

      // ── 5) 투수별 요약 ──
      const ps=t.pitchers.slice().sort((a,b)=>(b.IP||0)-(a.IP||0));
      const rows=ps.map(p=>`<tr>
        <td style="font-weight:600;cursor:pointer;color:var(--amber)" onclick="openCardDetail('${String(p.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}','pitcher')">${p.name}</td>
        <td style="font-family:var(--mono)">${(p.IP||0).toFixed(1)}</td>
        <td style="font-family:var(--mono);font-weight:600">${p.era!=null?p.era.toFixed(2):'-'}</td>
        <td style="font-family:var(--mono)">${p.fip!=null?p.fip.toFixed(2):'-'}</td>
        <td style="font-family:var(--mono)">${p.IP>0?((p.H+p.BB)/p.IP).toFixed(2):'-'}</td>
        <td style="font-family:var(--mono)">${p.K||0}</td>
        <td style="font-family:var(--mono)">${p.BB||0}</td>
        <td style="font-family:var(--mono);color:#ff2020">${p.evN>0?(p.brlpPct||0).toFixed(1):'-'}</td>
        <td style="font-family:var(--mono);color:var(--amber)">${(p.pwar||0).toFixed(2)}</td>
      </tr>`).join('');

      el.innerHTML=wbdContext._teamCompareBar()+wbdContext._teamCmpStatRow(team,'pit')+`
      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">구종 운용</div>
          <div class="tbl-wrap"><table class="data-table"><thead><tr>
            ${wbdContext._sortTh('구종')}${wbdContext._sortTh('투구')}${wbdContext._sortTh('비율')}${wbdContext._sortTh('헛스윙%')}${wbdContext._sortTh('피EV')}${wbdContext._sortTh('피배럴+%')}
          </tr></thead><tbody>${gRows}</tbody></table></div>
          <div style="margin-top:10px;padding:8px;background:var(--card2);border-radius:4px;font-size:11px;color:var(--muted)">
            총 ${pitches.length}구 · 헛스윙 <b style="color:var(--text)">${t.pWhiffPct.toFixed(1)}%</b> ·
            존인 <b style="color:var(--text)">${t.pZinPct.toFixed(1)}%</b> ·
            평균 피EV <b style="color:var(--text)">${t.pAvgEV.toFixed(1)}</b>
          </div>
          <div style="margin-top:10px;padding-top:9px;border-top:1px dashed var(--border)">
            <div style="font-size:10px;color:var(--muted);margin-bottom:6px">투구 위치 분포 <span style="opacity:0.7">(존인만 보면 한복판 몰림을 못 걸러냄)</span></div>
            ${(()=>{
              const segs=[
                {l:'실투',   v:t.pMidPct,    c:'#ff4560', d:'존 중앙 깊숙이 — 장타 위험'},
                {l:'살짝몰림',v:t.pSlightPct, c:'#ff8c44', d:'중앙~중간'},
                {l:'굿존',   v:t.pGoodPct-t.pBorderPct, c:'#ffd700', d:'존 바깥쪽'},
                {l:'보더라인',v:t.pBorderPct, c:'#39ff8a', d:'존 경계 — 최적 제구'}
              ];
              const tot=segs.reduce((s,x)=>s+Math.max(0,x.v),0)||1;
              const bar=segs.map(s=>`<div title="${s.l}: ${s.v.toFixed(1)}% — ${s.d}" style="width:${Math.max(0,s.v)/tot*100}%;background:${s.c};opacity:0.8"></div>`).join('');
              const legend=segs.map(s=>`<span style="font-size:10px;color:${s.c}">■ ${s.l} ${Math.max(0,s.v).toFixed(1)}%</span>`).join(' ');
              return `<div style="height:14px;display:flex;border-radius:7px;overflow:hidden;margin-bottom:5px">${bar}</div>
                      <div style="display:flex;gap:9px;flex-wrap:wrap">${legend}</div>`;
            })()}
          </div>
        </div>
        <div class="card">
          <div class="card-title">피타구 품질 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 대비 · 초록=투수에게 유리)</span></div>
          ${qBars}
        </div>
      </div>
      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">피타구 스프레이</div>
          ${wbdContext._teamSprayZoneBtns('pit')}
          <div style="max-width:420px;width:100%;margin:0 auto">${sprayHTML}</div>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:4px">🟡 피홈런 · 🔴 피안타 · 🟢 아웃</div>
        </div>
        <div class="card">
          <div class="card-title">투구 분포 (5×5)</div>
          <div style="text-align:center">${zoneHTML}</div>
          <div style="font-size:10px;color:var(--muted);text-align:center;margin-top:4px">셀 = 피안타율 · 아래 = 투구수 · <span style="color:#d22d32">빨강=피안타 높음(위험)</span> · <span style="color:#1e55c8">파랑=억제</span> · 점선=표본 부족</div>
        </div>
      </div>
      <div class="card section">
        <div class="card-title">투수별 요약 (${ps.length}명)</div>
        <div class="tbl-wrap"><table class="data-table"><thead><tr>
          ${wbdContext._sortTh('선수')}${wbdContext._sortTh('이닝')}${wbdContext._sortTh('ERA')}${wbdContext._sortTh('FIP')}${wbdContext._sortTh('WHIP')}${wbdContext._sortTh('K')}${wbdContext._sortTh('BB')}${wbdContext._sortTh('피배럴+%')}${wbdContext._sortTh('pWAR')}
        </tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
    }catch(e){
      console.error('team pit error',e);
      el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">투수 탭 오류: ${e.message}</div>`;
    }
  },30);
};

// Original index.html:12835
wbdContext._teamInfieldPassRate = function _teamInfieldPassRate(){
  if(window._ifPassCache && window._ifPassCache._k===wbdContext.G.length) return window._ifPassCache.v;
  const IFA=['1B','2B','3B','SS'], OF=['LF','CF','RF'];
  const POSK=['P','C','1B','2B','3B','SS','LF','CF','RF'];
  const teams={};
  let lgGB=0, lgPass=0;
  for(let i=0;i<wbdContext.G.length;i++){
    const d=wbdContext.G[i];
    if(!(+d.ev>0) || +d.result===3) continue;
    if(!(+d.ldeg<10)) continue;                    // 땅볼만
    // 수비 팀 = 내야수 소속팀
    let tm=null;
    for(const pk of IFA){
      const n=d[`${pk}Name`];
      if(n){ const t=wbdContext._playerTeam(n,'batter'); if(t&&t!=='—'){ tm=t; break; } }
    }
    if(!tm) continue;
    let cPos=null;
    for(const pk of POSK){ if(d[`${pk}Name`]===d.cPlr){ cPos=pk; break; } }
    if(!cPos) continue;
    if(!teams[tm]) teams[tm]={gb:0,pass:0};
    teams[tm].gb++; lgGB++;
    if(OF.includes(cPos)){ teams[tm].pass++; lgPass++; }
  }
  const lgRate=lgGB>0?lgPass/lgGB*100:0;
  const v={lgRate, lgGB, lgPass, byTeam:Object.fromEntries(Object.entries(teams).map(([t,x])=>[t,{
    gb:x.gb, pass:x.pass, rate:x.gb>0?x.pass/x.gb*100:0,
    vsLeague:(x.gb>0?x.pass/x.gb*100:0)-lgRate
  }]))};
  window._ifPassCache={_k:wbdContext.G.length, v};
  return v;
};

// Original index.html:12868
wbdContext.renderTeamDef = function renderTeamDef(){
  const el=document.getElementById('team-def-content');
  if(!el) return;
  const team=wbdContext._curTeam();
  if(!team){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>'; return; }
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ 분석 중...</div>';
  setTimeout(()=>{
    try{
      const data=wbdContext._computeDefenseData();
      if(!data||!data.byPlayer){ el.innerHTML='<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">수비 데이터 없음</div>'; return; }
      // 팀 소속 수비수 (타자 기준 팀 매칭)
      const members=Object.values(data.byPlayer).filter(p=>wbdContext._playerTeam(p.name,'batter')===team && p.chances>=1);
      if(!members.length){ el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">${team} 수비 데이터 부족</div>`; return; }

      const IF=new Set(['1B','2B','3B','SS','P','C']);
      let teamOAA=0, teamCh=0, ifOAA=0, ifCh=0, ofOAA=0, ofCh=0;
      const posAgg={};
      members.forEach(p=>{
        Object.entries(p.byPos||{}).forEach(([pos,ps])=>{
          const o=ps.oaaWeighted||0, c=ps.chances||0;
          teamOAA+=o; teamCh+=c;
          if(IF.has(pos)){ifOAA+=o;ifCh+=c;} else {ofOAA+=o;ofCh+=c;}
          if(!posAgg[pos])posAgg[pos]={oaa:0,ch:0,players:[]};
          posAgg[pos].oaa+=o; posAgg[pos].ch+=c;
          posAgg[pos].players.push({name:p.name,oaa:o,ch:c,outs:ps.outs||0,outRate:ps.outRate||0});
        });
      });
      // ── V11.3: 포지션별 리그 평균 (10기회당 OAA · 아웃률) ──
      const lgPos={};
      Object.values(data.byPlayer).forEach(p=>{
        Object.entries(p.byPos||{}).forEach(([pos,ps])=>{
          if(!lgPos[pos])lgPos[pos]={oaa:0,ch:0,outs:0,players:[]};
          lgPos[pos].oaa+=ps.oaaWeighted||0;
          lgPos[pos].ch+=ps.chances||0;
          lgPos[pos].outs+=ps.outs||0;
          if((ps.chances||0)>=3) lgPos[pos].players.push((ps.oaaWeighted||0)/(ps.chances||1)*10);
        });
      });
      Object.values(lgPos).forEach(v=>{
        v.per10 = v.ch>0 ? v.oaa/v.ch*10 : 0;      // 리그 평균 10기회당 OAA (zero-sum이라 ≈0)
        v.outRate = v.ch>0 ? v.outs/v.ch : 0;       // 리그 평균 아웃률 ← 이게 실질 비교 기준
        v.players.sort((a,b)=>a-b);
      });
      // 백분위 계산 (같은 포지션 내)
      const posPctile=(pos,per10)=>{
        const arr=lgPos[pos]&&lgPos[pos].players; 
        if(!arr||arr.length<3) return null;
        const below=arr.filter(v=>v<=per10).length;
        return below/arr.length;
      };
      // 리그 팀별 OAA 비교
      const teamTotals={};
      Object.values(data.byPlayer).forEach(p=>{
        const tm=wbdContext._playerTeam(p.name,'batter');
        if(!tm||tm==='—')return;
        if(!teamTotals[tm])teamTotals[tm]={oaa:0,ch:0};
        Object.values(p.byPos||{}).forEach(ps=>{teamTotals[tm].oaa+=ps.oaaWeighted||0; teamTotals[tm].ch+=ps.chances||0;});
      });
      const ranked=Object.entries(teamTotals).map(([tm,v])=>({tm,...v})).sort((a,b)=>b.oaa-a.oaa);
      const myRank=ranked.findIndex(r=>r.tm===team)+1;

      const oc=v=>v>2?'#39ff8a':v>0.5?'#88cc44':v<-2?'#ff4560':v<-0.5?'#ff8800':'var(--text)';
      const sgn=v=>(v>0?'+':'')+v.toFixed(1);

      // 포지션별 표
      const POSORD=['P','C','1B','2B','3B','SS','LF','CF','RF'];
      const posRows=POSORD.filter(p=>posAgg[p]).map(pos=>{
        const a=posAgg[pos];
        const per10=a.ch>0?a.oaa/a.ch*10:0;
        const lg=lgPos[pos]||{per10:0,outRate:0};
        const myOuts=a.players.reduce((s,x)=>s+(x.outs||0),0);
        const myRate=a.ch>0?myOuts/a.ch:0;
        const rateDiff=(myRate-lg.outRate)*100;   // %p
        const pct=posPctile(pos,per10);
        const rc = rateDiff>3?'#39ff8a':rateDiff<-3?'#ff4560':'var(--muted)';
        const plist=a.players.sort((x,y)=>y.ch-x.ch).map(pl=>{
          const p10=pl.ch>0?pl.oaa/pl.ch*10:0;
          const pp=posPctile(pos,p10);
          return `<span style="color:${oc(pl.oaa)}">${pl.name}</span> <span style="color:var(--muted);font-size:10px">${sgn(pl.oaa)}${pp!=null?` · 상위 ${Math.round((1-pp)*100)}%`:''}</span>`;
        }).join('<br>');
        return `<tr>
          <td style="font-weight:600">${(data.posNameKor&&data.posNameKor[pos])||pos}</td>
          <td style="font-family:var(--mono)">${a.ch}</td>
          <td style="font-family:var(--mono);color:${oc(a.oaa)};font-weight:700">${sgn(a.oaa)}</td>
          <td style="font-family:var(--mono);color:${oc(per10)}">${sgn(per10)}</td>
          <td style="font-family:var(--mono)">${(myRate*100).toFixed(0)}% <span style="font-size:10px;color:var(--muted)">/ ${(lg.outRate*100).toFixed(0)}%</span></td>
          <td style="font-family:var(--mono);color:${rc};font-weight:${Math.abs(rateDiff)>3?'700':'400'}">${rateDiff>=0?'+':''}${rateDiff.toFixed(1)}%p</td>
          <td style="font-family:var(--mono)">${pct!=null?`<span style="color:${wbdContext._pctColor(pct)}">${wbdContext._pctTier(pct)} ${wbdContext._pctLabel(pct)}</span>`:'-'}</td>
          <td style="font-size:11px;line-height:1.7">${plist}</td>
        </tr>`;
      }).join('');
      // ── 선수별 리그 평균 대비 상세 ──
      const playerRows=members.slice().sort((a,b)=>{
        const ac=Object.values(a.byPos||{}).reduce((s,x)=>s+(x.chances||0),0);
        const bc=Object.values(b.byPos||{}).reduce((s,x)=>s+(x.chances||0),0);
        return bc-ac;
      }).map(p=>{
        const mainPos=p.primaryPos;
        const ps=(p.byPos||{})[mainPos]||{};
        const ch=ps.chances||0, o=ps.oaaWeighted||0;
        if(ch<1) return '';
        const per10=ch>0?o/ch*10:0;
        const lg=lgPos[mainPos]||{outRate:0};
        const myRate=ps.outRate||0;
        const rateDiff=(myRate-lg.outRate)*100;
        const pct=posPctile(mainPos,per10);
        const rc = rateDiff>3?'#39ff8a':rateDiff<-3?'#ff4560':'var(--muted)';
        const _sn=String(p.name).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        return `<tr>
          <td style="font-weight:600;cursor:pointer;color:var(--amber)" onclick="goToDefender('${_sn}')">${p.name}</td>
          <td style="font-size:11px">${(data.posNameKor&&data.posNameKor[mainPos])||mainPos}</td>
          <td style="font-family:var(--mono)">${ch}</td>
          <td style="font-family:var(--mono);color:${oc(o)};font-weight:700">${sgn(o)}</td>
          <td style="font-family:var(--mono);color:${oc(per10)}">${sgn(per10)}</td>
          <td style="font-family:var(--mono)">${(myRate*100).toFixed(0)}% <span style="font-size:10px;color:var(--muted)">/ ${(lg.outRate*100).toFixed(0)}%</span></td>
          <td style="font-family:var(--mono);color:${rc};font-weight:${Math.abs(rateDiff)>3?'700':'400'}">${rateDiff>=0?'+':''}${rateDiff.toFixed(1)}%p</td>
          <td style="font-family:var(--mono)">${pct!=null?`<span style="color:${wbdContext._pctColor(pct)}">${wbdContext._pctTier(pct)} ${wbdContext._pctLabel(pct)}</span>`:'<span style="color:var(--muted)">표본부족</span>'}</td>
        </tr>`;
      }).filter(Boolean).join('');

      // 리그 순위 막대
      const maxAbs=Math.max(...ranked.map(r=>Math.abs(r.oaa)),1);
      const rankBars=ranked.map((r,i)=>{
        const w=Math.abs(r.oaa)/maxAbs*100;
        const isMe=r.tm===team;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;${isMe?'background:rgba(245,166,35,0.1);border-radius:4px;padding:2px 4px':''}">
          <span style="width:20px;font-size:10px;color:var(--muted);text-align:right">${i+1}</span>
          <span style="width:60px;font-size:11px;font-weight:${isMe?'700':'400'};color:${isMe?'var(--amber)':'var(--text)'}">${r.tm}</span>
          <div style="flex:1;height:12px;background:var(--card2);border-radius:6px;overflow:hidden;position:relative">
            <div style="position:absolute;left:50%;top:0;width:1px;height:100%;background:rgba(255,255,255,0.25)"></div>
            <div style="position:absolute;${r.oaa>=0?'left:50%':'right:50%'};height:100%;width:${w/2}%;background:${r.oaa>=0?'#39ff8a':'#ff4560'};opacity:0.7"></div>
          </div>
          <span style="width:46px;font-family:var(--mono);font-size:11px;color:${oc(r.oaa)};text-align:right">${sgn(r.oaa)}</span>
        </div>`;
      }).join('');

      el.innerHTML=wbdContext._teamCompareBar()+`
      <div class="card section" style="background:rgba(255,193,7,0.06);border-color:rgba(255,193,7,0.3)">
        <div style="font-size:11px;color:#ffc107;line-height:1.7">
          ⚠️ <b>OAA는 참고 지표입니다.</b> 포구 위치·시간 데이터 기반 추정치라 표본이 적으면 편차가 큽니다.
          팀 전력 평가에서는 <b>보조 자료로만</b> 활용하고, 타격·투수 지표만큼의 비중을 두지 마세요.
        </div>
      </div>
      <div class="grid2 section" style="gap:14px;grid-template-columns:1fr 1fr">
        <div class="card">
          <div class="card-title">팀 수비 종합</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px;margin-bottom:12px">
            <div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
              <div style="font-size:10px;color:var(--muted)">팀 OAA</div>
              <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:${oc(teamOAA)}">${sgn(teamOAA)}</div>
              <div style="font-size:9px;color:var(--muted)">리그 ${myRank}위 / ${ranked.length}팀</div>
              ${(()=>{const _c=window._teamCompare; if(!_c)return '';
                const cr=ranked.find(r=>r.tm===_c); if(!cr)return '';
                const better=teamOAA>cr.oaa;
                return `<div style="font-size:9.5px;color:${better?'#39ff8a':'#ff4560'};margin-top:3px">${better?'▲':'▼'} ${_c} ${sgn(cr.oaa)}</div>`;})()}
            </div>
            ${(()=>{
              // 내야/외야 리그 평균 아웃률 대비
              let ifOut=0,ofOut=0, lgIfOut=0,lgIfCh=0,lgOfOut=0,lgOfCh=0;
              members.forEach(p=>Object.entries(p.byPos||{}).forEach(([pos,ps])=>{
                if(IF.has(pos)) ifOut+=ps.outs||0; else ofOut+=ps.outs||0;
              }));
              Object.entries(lgPos).forEach(([pos,v])=>{
                if(IF.has(pos)){lgIfOut+=v.outs;lgIfCh+=v.ch;} else {lgOfOut+=v.outs;lgOfCh+=v.ch;}
              });
              const myIf=ifCh>0?ifOut/ifCh*100:0, lgIf=lgIfCh>0?lgIfOut/lgIfCh*100:0;
              const myOf=ofCh>0?ofOut/ofCh*100:0, lgOf=lgOfCh>0?lgOfOut/lgOfCh*100:0;
              const box=(label,oaa,ch,my,lg)=>{
                const d=my-lg, dc=d>3?'#39ff8a':d<-3?'#ff4560':'var(--muted)';
                return `<div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
                  <div style="font-size:10px;color:var(--muted)">${label}</div>
                  <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:${oc(oaa)}">${sgn(oaa)}</div>
                  <div style="font-size:9px;color:var(--muted)">${ch}기회 · 아웃률 ${my.toFixed(0)}%</div>
                  <div style="font-size:9.5px;color:${dc};font-weight:${Math.abs(d)>3?'700':'400'}">리그 ${lg.toFixed(0)}% 대비 ${d>=0?'+':''}${d.toFixed(1)}%p</div>
                </div>`;
              };
              return box('내야',ifOAA,ifCh,myIf,lgIf)+box('외야',ofOAA,ofCh,myOf,lgOf);
            })()}
            ${(()=>{  // V11.5: 내야 통과율 (땅볼이 내야를 뚫고 나간 비율 — 수비 범위 직접 지표)
              try{
                const P=wbdContext._teamInfieldPassRate(), t=P.byTeam[team];
                if(!t||t.gb<20) return '';
                const d=t.vsLeague;   // 낮을수록 좋음
                const col = d<-3?'#39ff8a' : d>3?'#ff4560' : 'var(--muted)';
                const ranked=Object.entries(P.byTeam).filter(([,x])=>x.gb>=20).sort((a,b)=>a[1].rate-b[1].rate);
                const rk=ranked.findIndex(([tm])=>tm===team)+1;
                return `<div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
                  <div style="font-size:10px;color:var(--muted)" title="땅볼 중 내야를 통과해 외야로 나간 비율 — 낮을수록 내야 수비 범위가 넓음">내야 통과율</div>
                  <div style="font-family:var(--mono);font-size:20px;font-weight:700;color:${col}">${t.rate.toFixed(1)}%</div>
                  <div style="font-size:9px;color:var(--muted)">땅볼 ${t.gb} · 통과 ${t.pass}${rk?` · ${rk}/${ranked.length}위`:''}</div>
                  <div style="font-size:9.5px;color:${col};font-weight:${Math.abs(d)>3?'700':'400'}">리그 ${P.lgRate.toFixed(1)}% 대비 ${d>=0?'+':''}${d.toFixed(1)}%p</div>
                </div>`;
              }catch(_){ return ''; }
            })()}
          </div>
          <div style="font-size:11px;color:var(--muted);line-height:1.7">
            총 ${teamCh}회 수비 기회 · 수비수 ${members.length}명<br>
            ${Math.abs(ifOAA-ofOAA)>3?`<span style="color:${ifOAA>ofOAA?'#39ff8a':'#ff4560'}">${ifOAA>ofOAA?'내야가 외야보다 강함':'외야가 내야보다 강함'}</span> (차이 ${Math.abs(ifOAA-ofOAA).toFixed(1)})`:'내야·외야 균형'}
          </div>
        </div>
        <div class="card">
          <div class="card-title">리그 팀 OAA 순위</div>
          ${rankBars}
        </div>
      </div>
      <div class="card section">
        <div class="card-title">포지션별 수비 <span style="font-size:10px;color:var(--muted);font-weight:400">(리그 = 같은 포지션 전체 평균)</span></div>
        <div class="tbl-wrap"><table class="data-table"><thead><tr>
          ${wbdContext._sortTh('포지션')}${wbdContext._sortTh('기회')}${wbdContext._sortTh('OAA')}${wbdContext._sortTh('OAA/10','10기회당 OAA')}
          ${wbdContext._sortTh('아웃률 / 리그','우리 아웃률 / 리그 평균 아웃률')}
          ${wbdContext._sortTh('리그 대비','리그 평균 대비 아웃률 차이')}
          ${wbdContext._sortTh('리그 순위','같은 포지션 선수들 중 위치')}<th>선수</th>
        </tr></thead><tbody>${posRows}</tbody></table></div>
      </div>
      ${(()=>{ // V11.5: 팀 × 포지션 매트릭스 + 포지션별 선수 상세
        try{
          const S=wbdContext._leagueDefenseStats(null);
          if(!S) return '';
          return wbdContext._renderDefMatrix(S, team) +
            `<div class="card section" style="padding:10px 14px;font-size:11px;color:var(--muted)">
              아래는 <b>${team}</b> 선수별 상세 — 같은 포지션 리그 평균과 비교
            </div>` +
            wbdContext._renderDefPosLeaderboard(S,{minChances:3, team});
        }catch(_){ return ''; }
      })()}
      <div class="card section">
        <div class="card-title">선수별 수비 (요약) <span style="font-size:10px;color:var(--muted);font-weight:400">(주 포지션 기준 · 이름 클릭 = 수비수 상세)</span></div>
        <div class="tbl-wrap"><table class="data-table"><thead><tr>
          ${wbdContext._sortTh('선수')}${wbdContext._sortTh('포지션')}${wbdContext._sortTh('기회')}${wbdContext._sortTh('OAA')}${wbdContext._sortTh('OAA/10')}
          ${wbdContext._sortTh('아웃률 / 리그')}${wbdContext._sortTh('리그 대비')}${wbdContext._sortTh('리그 순위')}
        </tr></thead><tbody>${playerRows||'<tr><td colspan="8" style="text-align:center;color:var(--muted)">데이터 없음</td></tr>'}</tbody></table></div>
        <div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.6">
          <b>리그 대비</b>: 같은 포지션 리그 평균 아웃률과의 차이(%p). <span style="color:#39ff8a">+</span>면 평균보다 잘 잡음, <span style="color:#ff4560">−</span>면 못 잡음.<br>
          <b>OAA/10</b>: 10기회당 OAA — 기회 수가 다른 선수끼리 비교할 때 사용.
        </div>
      </div>`;
    }catch(e){
      console.error('team def error',e);
      el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">수비 탭 오류: ${e.message}</div>`;
    }
  },30);
};

// Original index.html:13111
wbdContext.renderTeamTrend = function renderTeamTrend(){
  const el=document.getElementById('team-trend-content');
  if(!el) return;
  const team=wbdContext._curTeam();
  if(!team){ el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>'; return; }
  el.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">⏳ 분석 중...</div>';
  setTimeout(()=>{
    try{
      // 이 팀이 출전한 활성 경기
      const games=wbdContext.GAMES.filter(g=>{
        if(!wbdContext.activeGameIds.has(g.id))return false;
        const i=wbdContext._parseGameName(g.name);
        return wbdContext._normalizeTeam(i.teamA)===team||wbdContext._normalizeTeam(i.teamB)===team;
      }).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
      if(!games.length){ el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">${team} 경기 없음</div>`; return; }

      const recs=[];
      games.forEach(g=>{
        const i=wbdContext._parseGameName(g.name);
        const tA=wbdContext._normalizeTeam(i.teamA), tB=wbdContext._normalizeTeam(i.teamB);
        const sc=wbdContext._computeInningScores(g.pitches||[]);
        const isA=(tA===team);
        const my=isA?sc.totalA:sc.totalB;
        const opp=isA?sc.totalB:sc.totalA;
        const oppName=isA?tB:tA;
        recs.push({name:g.name, date:(i.date||''), opp:oppName, my, oppRuns:opp,
                   res: my>opp?'W':(my<opp?'L':'T')});
      });

      // 누적 승패·득실
      let w=0,l=0,tt=0,rf=0,ra=0;
      const cum=recs.map(r=>{
        if(r.res==='W')w++; else if(r.res==='L')l++; else tt++;
        rf+=r.my; ra+=r.oppRuns;
        return {...r, w,l,tt, diff:rf-ra, pct:(w+l)>0?w/(w+l):0};
      });

      // ── 승률 추이 그래프 ──
      const CW=Math.max(420, cum.length*46), CH=190, PADL=36, PADB=28, PADT=12;
      let ci='';
      ci+=wbdContext.sEl('rect',{x:0,y:0,width:CW,height:CH,fill:'#060e1a',rx:'4'});
      [0,0.25,0.5,0.75,1].forEach(v=>{
        const y=PADT+(1-v)*(CH-PADT-PADB);
        ci+=`<line x1="${PADL}" y1="${y.toFixed(1)}" x2="${CW-8}" y2="${y.toFixed(1)}" stroke="${v===0.5?'#f5a623':'#1a2a40'}" stroke-width="${v===0.5?'1':'0.6'}" opacity="${v===0.5?0.5:1}"/>`;
        ci+=`<text x="${PADL-5}" y="${(y+3).toFixed(1)}" fill="var(--muted)" font-size="9" text-anchor="end">${v.toFixed(2).replace(/^0/,'')}</text>`;
      });
      const px=i=>PADL+(cum.length>1?i/(cum.length-1):0.5)*(CW-PADL-14);
      const py=v=>PADT+(1-v)*(CH-PADT-PADB);
      let path='';
      cum.forEach((c,i)=>{ path+=(i?' L':'M')+px(i).toFixed(1)+','+py(c.pct).toFixed(1); });
      ci+=`<path d="${path}" fill="none" stroke="#f5a623" stroke-width="2"/>`;
      cum.forEach((c,i)=>{
        const col=c.res==='W'?'#39ff8a':c.res==='L'?'#ff4560':'#888';
        ci+=`<circle cx="${px(i).toFixed(1)}" cy="${py(c.pct).toFixed(1)}" r="4" fill="${col}" stroke="#000" stroke-width="0.6"><title>${c.opp} ${c.my}-${c.oppRuns} (${c.res})</title></circle>`;
        ci+=`<text x="${px(i).toFixed(1)}" y="${CH-10}" fill="var(--muted)" font-size="8" text-anchor="middle">${c.opp}</text>`;
      });

      // ── 경기별 득실 막대 ──
      const BW=Math.max(420, recs.length*46), BH=170, BPADT=14, BPADB=26, BMID=(BH-BPADB+BPADT)/2;
      const maxRun=Math.max(...recs.map(r=>Math.max(r.my,r.oppRuns)),1);
      let bi='';
      bi+=wbdContext.sEl('rect',{x:0,y:0,width:BW,height:BH,fill:'#060e1a',rx:'4'});
      bi+=`<line x1="8" y1="${BMID.toFixed(1)}" x2="${BW-8}" y2="${BMID.toFixed(1)}" stroke="#2a4060" stroke-width="1"/>`;
      const bw=Math.min(28,(BW-30)/recs.length*0.7);
      recs.forEach((r,i)=>{
        const cx=14+(i+0.5)*((BW-28)/recs.length);
        const hMy=(r.my/maxRun)*(BMID-BPADT-4);
        const hOp=(r.oppRuns/maxRun)*(BH-BPADB-BMID-4);
        bi+=wbdContext.sEl('rect',{x:(cx-bw/2).toFixed(1),y:(BMID-hMy).toFixed(1),width:bw.toFixed(1),height:hMy.toFixed(1),fill:'#39ff8a',opacity:'0.75',rx:'2'});
        bi+=wbdContext.sEl('rect',{x:(cx-bw/2).toFixed(1),y:BMID.toFixed(1),width:bw.toFixed(1),height:hOp.toFixed(1),fill:'#ff4560',opacity:'0.75',rx:'2'});
        bi+=`<text x="${cx.toFixed(1)}" y="${(BMID-hMy-3).toFixed(1)}" fill="#39ff8a" font-size="9" text-anchor="middle">${r.my}</text>`;
        bi+=`<text x="${cx.toFixed(1)}" y="${(BMID+hOp+10).toFixed(1)}" fill="#ff4560" font-size="9" text-anchor="middle">${r.oppRuns}</text>`;
        bi+=`<text x="${cx.toFixed(1)}" y="${BH-6}" fill="var(--muted)" font-size="8" text-anchor="middle">${r.opp}</text>`;
      });

      // ── 상대별 전적 ──
      const vs={};
      recs.forEach(r=>{
        if(!vs[r.opp])vs[r.opp]={w:0,l:0,t:0,rf:0,ra:0,n:0};
        const v=vs[r.opp]; v.n++;
        if(r.res==='W')v.w++; else if(r.res==='L')v.l++; else v.t++;
        v.rf+=r.my; v.ra+=r.oppRuns;
      });
      const vsRows=Object.entries(vs).sort((a,b)=>b[1].n-a[1].n).map(([opp,v])=>{
        const pct=(v.w+v.l)>0?v.w/(v.w+v.l):0;
        const col=pct>0.6?'#39ff8a':pct<0.4?'#ff4560':'var(--text)';
        return `<tr>
          <td style="font-weight:600">${opp}</td>
          <td style="font-family:var(--mono)">${v.n}</td>
          <td style="font-family:var(--mono);color:${col};font-weight:700">${v.w}-${v.l}${v.t?'-'+v.t:''}</td>
          <td style="font-family:var(--mono);color:${col}">${pct.toFixed(3).replace(/^0/,'')}</td>
          <td style="font-family:var(--mono)">${v.rf}</td>
          <td style="font-family:var(--mono)">${v.ra}</td>
          <td style="font-family:var(--mono);color:${v.rf-v.ra>0?'#39ff8a':v.rf-v.ra<0?'#ff4560':'var(--muted)'}">${v.rf-v.ra>0?'+':''}${v.rf-v.ra}</td>
        </tr>`;
      }).join('');

      // ── 최근 폼 (최근 5경기) ──
      const last5=recs.slice(-5);
      const formStr=last5.map(r=>{
        const c=r.res==='W'?'#39ff8a':r.res==='L'?'#ff4560':'#888';
        return `<span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:4px;background:${c}22;color:${c};font-weight:700;font-size:11px;margin-right:3px" title="${r.opp} ${r.my}-${r.oppRuns}">${r.res}</span>`;
      }).join('');
      const last=cum[cum.length-1];

      // 비교 상대와의 head-to-head 강조
      const _cmp=window._teamCompare;
      const h2h=(_cmp&&vs[_cmp])?(()=>{
        const v=vs[_cmp], pct=(v.w+v.l)>0?v.w/(v.w+v.l):0;
        const col=pct>0.6?'#39ff8a':pct<0.4?'#ff4560':'#ffd700';
        return `<div class="card section" style="border-left:4px solid #88ccff">
          <div class="card-title">⚔️ vs ${_cmp} 상대전적</div>
          <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
            <div style="text-align:center;min-width:100px">
              <div style="font-family:var(--mono);font-size:30px;font-weight:900;color:${col}">${v.w}-${v.l}${v.t?'-'+v.t:''}</div>
              <div style="font-size:11px;color:var(--muted)">승률 ${pct.toFixed(3).replace(/^0/,'')}</div>
            </div>
            <div style="flex:1;min-width:180px;font-size:12px;line-height:1.8">
              ${v.n}경기 · 득점 <b style="color:#39ff8a">${v.rf}</b> / 실점 <b style="color:#ff4560">${v.ra}</b>
              (경기당 ${(v.rf/v.n).toFixed(1)} : ${(v.ra/v.n).toFixed(1)})<br>
              <span style="color:${v.rf-v.ra>0?'#39ff8a':v.rf-v.ra<0?'#ff4560':'var(--muted)'}">득실 ${v.rf-v.ra>0?'+':''}${v.rf-v.ra}</span>
            </div>
          </div>
        </div>`;
      })():(_cmp?`<div class="card section" style="padding:14px;font-size:12px;color:var(--muted)">⚔️ ${_cmp}와의 맞대결 기록이 없습니다.</div>`:'');
      el.innerHTML=wbdContext._teamCompareBar()+h2h+`
      <div class="card section">
        <div class="card-title">시즌 요약</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:12px">
          <div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--muted)">전적</div>
            <div style="font-family:var(--mono);font-size:18px;font-weight:700">${last.w}승 ${last.l}패${last.tt?' '+last.tt+'무':''}</div>
          </div>
          <div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--muted)">승률</div>
            <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:${last.pct>=0.6?'#39ff8a':last.pct<0.4?'#ff4560':'var(--text)'}">${last.pct.toFixed(3).replace(/^0/,'')}</div>
          </div>
          <div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--muted)">득점 / 실점</div>
            <div style="font-family:var(--mono);font-size:18px;font-weight:700">${rf} / ${ra}</div>
          </div>
          <div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--muted)">득실차</div>
            <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:${last.diff>0?'#39ff8a':last.diff<0?'#ff4560':'var(--muted)'}">${last.diff>0?'+':''}${last.diff}</div>
          </div>
          <div style="background:var(--card2);border-radius:6px;padding:10px;text-align:center">
            <div style="font-size:10px;color:var(--muted)">최근 5경기</div>
            <div style="margin-top:4px">${formStr}</div>
          </div>
        </div>
      </div>
      <div class="card section">
        <div class="card-title">승률 추이</div>
        <div style="overflow-x:auto">${wbdContext.makeSVG(CW,CH,ci)}</div>
      </div>
      <div class="card section">
        <div class="card-title">경기별 득실 <span style="font-size:10px;color:var(--muted);font-weight:400">(위=득점, 아래=실점)</span></div>
        <div style="overflow-x:auto">${wbdContext.makeSVG(BW,BH,bi)}</div>
      </div>
      <div class="card section">
        <div class="card-title">상대별 전적</div>
        <div class="tbl-wrap"><table class="data-table"><thead><tr>
          ${wbdContext._sortTh('상대')}${wbdContext._sortTh('경기')}<th>전적</th>${wbdContext._sortTh('승률')}${wbdContext._sortTh('득점')}${wbdContext._sortTh('실점')}${wbdContext._sortTh('득실')}
        </tr></thead><tbody>${vsRows}</tbody></table></div>
      </div>
      <div style="font-size:10px;color:var(--muted);text-align:center;padding:8px">
        ※ 스코어는 이닝별 득점 집계(끝내기 보정 포함) 기준 · 활성 경기만 반영
      </div>`;
    }catch(e){
      console.error('team trend error',e);
      el.innerHTML=`<div class="card section" style="padding:30px;text-align:center;color:#ff4560">추이 탭 오류: ${e.message}</div>`;
    }
  },30);
};

// Original index.html:13289
wbdContext._toggleTeamScoutCompare = function _toggleTeamScoutCompare(opponentName){
  if(!window._teamScoutCompare) window._teamScoutCompare = {opponent:null};
  window._teamScoutCompare.opponent = opponentName || null;
  wbdContext.renderTeamScoutContent();
};

// Original index.html:13295
wbdContext.renderTeamScoutContent = function renderTeamScoutContent(){
  const out = document.getElementById('team-scout-content');
  if(!out) return;
  
  const sel = document.getElementById('team-sel');
  const teamName = sel ? sel.value : '';
  if(!teamName){
    out.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)">팀을 선택해주세요</div>';
    return;
  }
  
  // 로딩 표시 (렉 방지: 비동기 처리)
  out.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted)"><div style="font-size:24px;margin-bottom:10px">⏳</div>진단서 생성 중...</div>';
  
  // setTimeout으로 UI 업데이트 분리해서 렉 방지
  setTimeout(() => {
    try {
      const report = wbdContext._generateTeamScoutReport(teamName);
      if(!report){
        out.innerHTML = `<div class="card section" style="padding:30px;text-align:center;color:var(--muted)">데이터 부족 (${teamName})</div>`;
        return;
      }
      
      // 상대팀 비교 모드 처리
      const opponent = (window._teamScoutCompare && window._teamScoutCompare.opponent) || null;
      let compareReport = null;
      if(opponent && opponent !== teamName){
        try {
          compareReport = wbdContext._generateTeamScoutReport(opponent);
        } catch(e){
          console.error('Compare team error:', e);
        }
      }
      
      out.innerHTML = wbdContext._renderTeamScoutHTML(teamName, report, compareReport);
    } catch(e){
      console.error('Team scout error:', e);
      out.innerHTML = `<div class="card section" style="padding:30px;text-align:center;color:#ff4560">진단서 생성 중 오류: ${e.message}</div>`;
    }
  }, 50);
};

// Original index.html:13337
wbdContext.renderTeamPage = function renderTeamPage(){
  // 편집 토글 버튼 상태 동기화
  const teamBtn=document.getElementById('team-edit-toggle');
  if(teamBtn){
    teamBtn.textContent=window.cardEditMode?'✏️ 편집 ON':'✏️ 편집 OFF';
    teamBtn.style.color=window.cardEditMode?'var(--amber)':'var(--muted)';
    teamBtn.style.borderColor=window.cardEditMode?'var(--amber)':'var(--border)';
    teamBtn.style.background=window.cardEditMode?'rgba(245,166,35,0.1)':'var(--card2)';
  }
  const modeSel=document.getElementById('team-mode');
  const mode=modeSel?modeSel.value:'team';
  const sel=document.getElementById('team-sel');
  const label=document.getElementById('team-sel-label');
  if(!sel)return;
  
  // 모드별 분기
  if(mode==='group'){
    if(label)label.textContent='그룹 선택';
    return wbdContext._renderGroupAnalysisPage(sel);
  }
  if(label)label.textContent='팀 선택';
  
  // 팀 옵션 채우기 (활성 경기 + 수동 팀) — 공용 _getActiveTeams
  const sorted=wbdContext._getActiveTeams();
  const prev=sel.value;
  sel.innerHTML=sorted.map(t=>`<option value="${t}">${t}</option>`).join('');
  if(prev&&sorted.includes(prev))sel.value=prev;
  const team=sel.value||sorted[0];
  if(!team){document.getElementById('team-content').innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">팀 데이터가 없어요</div>';return;}
  if(!sel.value&&team)sel.value=team;

  // 해당 팀의 선수 명단 미리 만들기 (수동 팀 매칭용)
  const teamPlayerSet=new Set();  // 이 팀에 속한 선수 (수동 또는 자동)
  // 수동: MANUAL_TEAMS 검색
  Object.entries(window.MANUAL_TEAMS||{}).forEach(([n,t])=>{
    if(t && String(t).trim()===team) teamPlayerSet.add(String(n));
  });

  // 해당 팀에 속한 경기 (normalized 매칭)
  const teamGames=wbdContext.GAMES.filter(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return false;
    const info=wbdContext._parseGameName(g.name);
    return wbdContext._normalizeTeam(info.teamA)===team||wbdContext._normalizeTeam(info.teamB)===team;
  });

  // 승/패 집계
  let wins=0,losses=0,ties=0,runsFor=0,runsAgainst=0;
  const gameRecords=[];
  teamGames.forEach(g=>{
    const info=wbdContext._parseGameName(g.name);
    const {totalA,totalB}=wbdContext._computeInningScores(g.pitches);
    const isA=wbdContext._normalizeTeam(info.teamA)===team;
    const own=isA?totalA:totalB;
    const opp=isA?totalB:totalA;
    const oppTeam=wbdContext._normalizeTeam(isA?info.teamB:info.teamA);
    runsFor+=own;runsAgainst+=opp;
    if(own>opp)wins++;
    else if(own<opp)losses++;
    else ties++;
    gameRecords.push({date:info.date,opp:oppTeam,own,opp_:opp,result:own>opp?'W':own<opp?'L':'T',id:g.id});
  });

  // 모든 선수 중에서 _playerTeam(수동 우선)이 현재 팀인 선수 (캐시된 이름 사용)
  const allPNames=window._cache.pitcherNames;
  const allBNames=window._cache.batterNames;
  const teamPitchers=new Set(allPNames.filter(n=>wbdContext._playerTeam(n,'pitcher')===team));
  const teamBatters=new Set(allBNames.filter(n=>wbdContext._playerTeam(n,'batter')===team));

  // 팀 평균 OVR (데이터 부족한 선수 제외)
  const pitcherCards=[...teamPitchers].map(n=>wbdContext.calcPitcherCard(n)).filter(c=>c);
  const batterCards=[...teamBatters].map(n=>wbdContext.calcBatterCard(n)).filter(c=>c);
  const pitcherCardsValid=pitcherCards.filter(c=>!c.lowData);
  const batterCardsValid=batterCards.filter(c=>!c.lowData);
  const avgPitcherOVR=pitcherCardsValid.length?Math.round(pitcherCardsValid.reduce((a,c)=>a+c.OVR,0)/pitcherCardsValid.length):0;
  const avgBatterOVR=batterCardsValid.length?Math.round(batterCardsValid.reduce((a,c)=>a+c.OVR,0)/batterCardsValid.length):0;

  // 팀 집계 (타구 기반) - 자동 매칭 게임만 (수동 팀은 게임 매칭 X)
  const teamBatData=[];
  wbdContext.GAMES.forEach(g=>{
    if(!wbdContext.activeGameIds.has(g.id))return;
    const info=wbdContext._parseGameName(g.name);
    const tA=wbdContext._normalizeTeam(info.teamA), tB=wbdContext._normalizeTeam(info.teamB);
    if(tA!==team&&tB!==team)return;
    g.pitches.forEach(d=>{
      const bTeam=d.half===1?tA:tB;
      if(bTeam===team)teamBatData.push(d);
    });
  });
  // 팀 타격 표준 통계 (다른 페이지와 동일한 식 사용)
  const teamHits = teamBatData.filter(wbdContext._isHit).length;
  const teamSingles = teamBatData.filter(d => +d['1BSafe']===1).length;
  const teamHRs = teamBatData.filter(d => +d.result===4).length;
  const teamAB = teamBatData.filter(d => {
    const r=+d.result;
    return wbdContext._isABPitch(d);
  }).length;
  const teamAvg = teamAB > 0 ? teamHits/teamAB : 0;
  const teamSLG = teamAB > 0 ? (teamSingles + teamHRs*4) / teamAB : 0;
  const batted = teamBatData.filter(wbdContext._isInPlay);  // (참고용 - 다른 곳에서 사용)

  // HTML 조립
  const isManualOnly=teamGames.length===0;
  let html='';
  if(isManualOnly){
    html+=`<div style="padding:12px 16px;background:linear-gradient(90deg,#88ccff22,transparent);border-left:3px solid #88ccff;border-radius:4px;margin-bottom:14px;font-size:12px;color:var(--text)">
      ℹ️ <b>${team}</b>은(는) 게임 데이터에 없는 수동 지정 팀입니다. 경기 기록(승/패, 득실)은 표시되지 않으며, <b>수동 지정된 선수 로스터</b>만 보입니다.
    </div>`;
  }
  html+=`<div class="grid4 section">
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">전적</div><div style="font-family:var(--mono);font-size:22px;color:var(--amber);font-weight:700">${wins}승 ${losses}패${ties?' '+ties+'무':''}</div></div>
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">승률</div><div style="font-family:var(--mono);font-size:22px;color:var(--amber);font-weight:700">${teamGames.length?((wins/(wins+losses||1))*100).toFixed(1)+'%':'-'}</div></div>
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">득/실 (경기당)</div><div style="font-family:var(--mono);font-size:20px;color:var(--amber);font-weight:700">${teamGames.length?(runsFor/teamGames.length).toFixed(1):'0'} / ${teamGames.length?(runsAgainst/teamGames.length).toFixed(1):'0'}</div></div>
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">총 경기</div><div style="font-family:var(--mono);font-size:22px;color:var(--amber);font-weight:700">${teamGames.length}</div></div>
  </div>`;

  html+=`<div class="grid3 section">
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 타율</div><div style="font-family:var(--mono);font-size:22px;color:#39ff8a;font-weight:700">${teamAvg.toFixed(3).replace(/^0/,'')}</div></div>
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 장타율</div><div style="font-family:var(--mono);font-size:22px;color:#39ff8a;font-weight:700">${teamSLG.toFixed(3).replace(/^0/,'')}</div></div>
    <div class="card"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">팀 홈런</div><div style="font-family:var(--mono);font-size:22px;color:#ff8800;font-weight:700">${teamHRs}</div></div>
  </div>`;

  html+=`<div class="grid2 section">
    <div class="card"><div class="card-title">⚾ 투수진 평균 OVR</div><div style="font-family:var(--mono);font-size:36px;color:${wbdContext.cardOvrColor(avgPitcherOVR)};font-weight:700;text-align:center;padding:20px 0">${avgPitcherOVR}</div><div style="text-align:center;color:var(--muted);font-size:11px">${pitcherCardsValid.length}명 집계${pitcherCards.length>pitcherCardsValid.length?' · '+(pitcherCards.length-pitcherCardsValid.length)+'명 샘플 부족 제외':''}</div></div>
    <div class="card"><div class="card-title">🏏 타선 평균 OVR</div><div style="font-family:var(--mono);font-size:36px;color:${wbdContext.cardOvrColor(avgBatterOVR)};font-weight:700;text-align:center;padding:20px 0">${avgBatterOVR}</div><div style="text-align:center;color:var(--muted);font-size:11px">${batterCardsValid.length}명 집계${batterCards.length>batterCardsValid.length?' · '+(batterCards.length-batterCardsValid.length)+'명 샘플 부족 제외':''}</div></div>
  </div>`;

  // 🏟️ 팀 로스터 (좌: 투수, 우: 타자)
  // lowData 카드는 맨 아래로
  const sortCards=cards=>cards.slice().sort((a,b)=>{
    if(a.lowData&&!b.lowData)return 1;
    if(!a.lowData&&b.lowData)return -1;
    return b.OVR-a.OVR;
  });
  const sortedPitchers=sortCards(pitcherCards);
  const sortedBatters=sortCards(batterCards);

  const renderRosterCard=(c,type)=>{
    const typeCol=type==='pitcher'?'#ff8c44':'#39ff8a';
    const typeLabel=type==='pitcher'?'투수':'타자';
    const ovrCol=wbdContext.cardOvrColor(c.OVR);
    const badges=wbdContext.computeBadges(c).slice(0,3);
    const badgesHtml=badges.map(b=>`<span title="${b.name}" style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;background:${b.color}33;border:1px solid ${b.color};border-radius:50%;font-size:10px">${b.icon}</span>`).join('');
    let posTag='';
    if(type==='batter'){
      const p=wbdContext.getPrimaryPosition(c.name);
      if(p)posTag=`<span style="display:inline-block;padding:1px 6px;background:${wbdContext.POS_COLORS[p.pos]}22;border:1px solid ${wbdContext.POS_COLORS[p.pos]};border-radius:3px;font-size:9px;color:${wbdContext.POS_COLORS[p.pos]};font-family:var(--mono);font-weight:700;margin-left:4px">${p.name}</span>`;
    }
    const lowBorder=c.lowData?'border:1px dashed #3a5a7a;opacity:0.55':`border:2px solid ${ovrCol};box-shadow:0 0 10px ${ovrCol}44`;
    const lowTag=c.lowData?'<span style="font-size:8px;color:#4a7aaa;background:#0a1828;border:1px solid #2a4060;padding:1px 4px;border-radius:2px;margin-left:4px">📊</span>':'';
    
    // 사진/실루엣 (작은 정사각)
    // V10.1 FIX: 부모도 aspect-ratio:1/1이라 자식의 height:100%가 0이 됨
    //   SVG+img를 형제로 absolute 배치
    // V10.1 FIX2: 투명 PNG일 때 뒤 SVG가 비치는 문제 → img 배경 + onload로 SVG 숨김
    const photoUrl=wbdContext.getPhotoUrl(c.name);
    const silId2 = `sil2_${type}_${(c.name||'').replace(/[^a-zA-Z0-9]/g,'_')}_${Math.floor(Math.random()*100000)}`;
    const _silSvg2 = `<svg id="${silId2}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;display:block;background:linear-gradient(180deg,#1a2438,#0f1828)"><circle cx="50" cy="38" r="16" fill="#3a4560"/><path d="M 20,100 Q 20,65 50,62 Q 80,65 80,100 Z" fill="#3a4560"/></svg>`;
    const photoHTML = photoUrl
      ? `${_silSvg2}<img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="${photoUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:1;background:#0f1828" onload="var s=document.getElementById('${silId2}');if(s)s.style.display='none'" onerror="this.style.display='none'">`
      : _silSvg2;
    
    return `<div style="background:var(--card2);${lowBorder};border-radius:6px;padding:8px;position:relative;transition:transform .15s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
      ${window.cardEditMode?`<button onclick="event.stopPropagation();openQuickTeamGroupEdit('${String(c.name).replace(/'/g,"\\'")}','${type}')" title="팀/그룹 편집" style="position:absolute;top:6px;left:6px;background:rgba(0,0,0,0.7);border:1px solid var(--amber);color:var(--amber);width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;padding:0;z-index:2">✏️</button>`:''}
      <div onclick="openCardDetail('${String(c.name).replace(/'/g,"\\'")}','${type}')" style="cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:9px${window.cardEditMode?';padding-left:24px':''}">
          <div style="display:flex;align-items:center;gap:3px"><span style="color:${typeCol};font-weight:700">${typeLabel}</span>${posTag}${lowTag}</div>
          <span style="font-family:var(--mono);font-size:16px;font-weight:900;color:${ovrCol}">${c.OVR}</span>
        </div>
        <div style="position:relative;width:100%;aspect-ratio:1/1;border-radius:5px;overflow:hidden;border:1.5px solid ${ovrCol}66;margin-bottom:5px;background:#0f1828">
          ${photoHTML}
        </div>
        <div style="font-size:11px;font-weight:700;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
        ${badges.length?`<div style="display:flex;gap:2px;justify-content:center;margin-top:4px">${badgesHtml}</div>`:''}
      </div>
    </div>`;
  };

  const allCount=sortedPitchers.length+sortedBatters.length;
  html+=`<div class="card section"><div class="card-title" style="display:flex;justify-content:space-between;align-items:center"><span>🏟️ 팀 로스터 (${allCount}명)</span><span style="font-size:10px;color:var(--muted);font-weight:400">투수 ${sortedPitchers.length} · 타자 ${sortedBatters.length}</span></div>`;
  html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';

  // 왼쪽: 투수
  html+=`<div style="border-right:1px dashed var(--border);padding-right:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #ff8c44">
      <span style="font-size:16px">⚾</span>
      <span style="font-size:12px;font-weight:700;color:#ff8c44;letter-spacing:1px">투수 ${sortedPitchers.length}명</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">`;
  if(sortedPitchers.length===0)html+='<div style="padding:20px;text-align:center;color:var(--muted);font-size:11px;grid-column:1/-1">투수 데이터가 없어요</div>';
  else sortedPitchers.forEach(c=>{html+=renderRosterCard(c,'pitcher');});
  html+='</div></div>';

  // 오른쪽: 타자
  html+=`<div style="padding-left:0">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid #39ff8a">
      <span style="font-size:16px">🏏</span>
      <span style="font-size:12px;font-weight:700;color:#39ff8a;letter-spacing:1px">타자 ${sortedBatters.length}명</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px">`;
  if(sortedBatters.length===0)html+='<div style="padding:20px;text-align:center;color:var(--muted);font-size:11px;grid-column:1/-1">타자 데이터가 없어요</div>';
  else sortedBatters.forEach(c=>{html+=renderRosterCard(c,'batter');});
  html+='</div></div>';

  html+='</div></div>';

  // 경기 기록
  gameRecords.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  html+='<div class="card section"><div class="card-title">📅 경기 결과</div><div class="tbl-wrap"><table class="data-table"><thead><tr><th>날짜</th><th>결과</th><th>상대</th><th>점수</th></tr></thead><tbody>';
  gameRecords.forEach(r=>{
    const col=r.result==='W'?'#39ff8a':r.result==='L'?'#ff4560':'#888';
    html+=`<tr onclick="openGameScoreboard('${r.id}')" style="cursor:pointer" title="박스스코어 보기"><td style="color:var(--muted);font-family:var(--mono);font-size:11px">${r.date||'—'}</td><td style="color:${col};font-weight:700">${r.result}</td><td>${r.opp}</td><td style="font-family:var(--mono)">${r.own}–${r.opp_}</td></tr>`;
  });
  html+='</tbody></table></div>';

  document.getElementById('team-content').innerHTML=html;
};
}

export function initialize(wbdContext) {
// Original index.html:12309
window._teamSprayZone = window._teamSprayZone || {bat:'off', pit:'off'};

// Original index.html:13287
window._teamScoutCompare = window._teamScoutCompare || {opponent:null};
}
