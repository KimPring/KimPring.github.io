const stateKeys = [
  'currentPitcher','currentBatter','activePitcherTab','activeBatterTab','pitcherGameFilter','batterGameFilter','gameFilter',
  '_roundFilter','_h2hMode','_embH2HState','activeInsightTab','_teamSubtab','_teamCompare','_teamScoutCompare',
  '_scoutingState','_scoutReportState','_scoutLabState','_gameReportState','_recordsState','_defenseState',
  '_defenderState','_ballmapState','_pitchTypeState','_leagueSeason','_leagueRecTab','_leagueOpenTeam',
  'batterHeightFilter','_sprayZoneFilter','pzPitchSel','mapPitchSel','precisionPitchSel','_tblSort',
  'fieldingPosFilter','fieldingMinLevel','fieldingCustomAb','fieldingCustomPitch','fieldingCustomInnings',
  'fieldingSortKey','fieldingSortDir','bestLineupCriterion','bestLineupPitcherMode','recentFormN'
];
export function captureState(context) {
  const state={};
  for (const key of stateKeys) if(context[key]!==undefined) state[key]=structuredClone(context[key]);
  return state;
}
export function restoreState(context,state={}) {
  for (const key of stateKeys) if(Object.hasOwn(state,key))context[key]=state[key];
}
export function captureControls(root=document) {
  return Object.fromEntries([...root.querySelectorAll('.page input[id],.page select[id],.page textarea[id]')]
    .filter(el=>el.type!=='file' && el.type!=='password')
    .map(el=>[el.id,{value:el.value,checked:el.checked}]));
}
export function restoreControls(controls={},root=document) {
  for (const [id,state] of Object.entries(controls)) {
    const el=root.getElementById(id);
    if (!el || el.type==='file')continue;
    // Never erase a newly populated default when an old selected option no longer exists.
    if(el.tagName!=='SELECT'||[...el.options].some(o=>o.value===state.value))el.value=state.value;
    if(el.type==='checkbox'||el.type==='radio')el.checked=state.checked;
  }
}
