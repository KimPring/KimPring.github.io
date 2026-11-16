import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { routes,pageFile,pageURL } from '../js/core/routes.js';
import { captureState,restoreState } from '../js/core/view-state.js';

const root=new URL('../../',import.meta.url);
const original=await readFile(new URL('index.html',root),'utf8');
const manifest=JSON.parse(await readFile(new URL('app/migration.json',root),'utf8'));
test('original index.html is byte-for-byte unchanged',()=>{
  assert.equal(createHash('sha256').update(original).digest('hex'),manifest.sha256);
});
test('every route is a real HTML document with exactly its own page fragment',async()=>{
  assert.deepEqual(Object.keys(routes).sort(),manifest.pages.sort());
  for(const page of Object.keys(routes)) {
    const html=await readFile(new URL(`app/${pageFile(page)}`,root),'utf8');
    const ids=[...html.matchAll(/id="page-([^"]+)"/g)].map(m=>m[1]);
    assert.deepEqual(ids,[page]);
    assert.match(html,/<script type="module" src="app\/js\/bootstrap.js"><\/script>/);
    assert.equal((html.match(/<script/g)||[]).length,1);
    for(const m of html.matchAll(/data-route="([^"]+)"/g))assert.ok(Object.hasOwn(routes,m[1]));
  }
});
test('routes work under nested GitHub Pages paths',()=>{
  assert.equal(pageURL('pitcher','https://example.test/repo/app/js/core/routes.js').href,'https://example.test/repo/app/pitcher.html');
  assert.throws(()=>pageFile('../index'));
});
test('view snapshots isolate mutable state and exclude analysis caches',()=>{
  const state={currentPitcher:'Pring__',_scoutReportState:{target:'Pring__',tab:'overview'},_cache:{huge:true}};
  const snapshot=captureState(state);
  state._scoutReportState.target='changed';
  assert.equal(snapshot._scoutReportState.target,'Pring__');
  assert.equal(snapshot._cache,undefined);
  const restored={};restoreState(restored,snapshot);
  assert.equal(restored.currentPitcher,'Pring__');
});

// Execute the analysis engines in DOM stubs. This is a computational regression test.
function stubElement(){return {style:{},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
  value:'',innerHTML:'',textContent:'',options:[],addEventListener(){},appendChild(){},insertBefore(){},
  querySelector(){return null;},querySelectorAll(){return []},setAttribute(){},getAttribute(){return null}};}
function environment(){
  const elements=new Map(), values=new Map();
  return {
    console:{log(){},warn(){},error(){}},performance:{now:()=>0},
    setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,requestIdleCallback:()=>0,
    document:{getElementById(id){if(!elements.has(id))elements.set(id,stubElement());return elements.get(id);},
      querySelector(){return null},querySelectorAll(){return []},createElement:stubElement,addEventListener(){},
      body:stubElement(),head:stubElement(),documentElement:stubElement()},
    localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},
    addEventListener(){},location:{hash:'',href:'http://localhost/app/',pathname:'/app/'},
    navigator:{userAgent:'unit-test'},innerWidth:1440,scrollTo(){},alert(){},confirm:()=>true
  };
}
const sandbox=environment();sandbox.window=sandbox;
vm.createContext(sandbox);
const source=[...original.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(m=>!/\bsrc=/.test(m[1])).map(m=>m[2]).join('\n')
  .replace('initServerLibrary(false).then(()=>autoLoadAllServerFiles());','');
vm.runInContext(source,sandbox,{timeout:10000});
const savedGlobals=new Map();
const env=environment();
for(const [key,value] of Object.entries(env)) {
  savedGlobals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));
  Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
}
globalThis.window=globalThis;
const {createRuntime}=await import('../js/core/runtime.js');
const context=createRuntime(globalThis);
const fixtures=['data/league/26_Summer/2026_06_26_AT_vs_IQ.txt','data/league/26_Summer/포스트시즌/2026_10_10_RB_vs_KW.txt','data/scrim/260902.txt'];
const json=value=>JSON.parse(JSON.stringify(value));
const input=await Promise.all(fixtures.map(file=>readFile(new URL(file,root),'utf8')));
test('CSV parsing preserves original values across old and new log formats',()=>{
  for(const text of input)assert.deepEqual(json(context.parseCSV(text)),json(sandbox.parseCSV(text)));
});
for(let i=0;i<fixtures.length;i++) {
  const name=fixtures[i].split('/').pop();
  context.addGame(input[i],name);sandbox.addGame(input[i],name);
}
context.rebuildG();sandbox.rebuildG();
const originalRecords=sandbox._computeRecordsData(),records=context._computeRecordsData();
test('season batting and pitching statistics match the original',()=>{
  assert.deepEqual(json(records.batters),json(originalRecords.batters));
  assert.deepEqual(json(records.pitchers),json(originalRecords.pitchers));
});
test('player card ratings and WAR match the original',()=>{
  for(const name of context._cache.pitcherNames) {
    assert.deepEqual(json(context.calcPitcherCard(name)),json(sandbox.calcPitcherCard(name)));
    assert.equal(context.calcPitcherWAR(name),sandbox.calcPitcherWAR(name));
  }
  for(const name of context._cache.batterNames) {
    assert.deepEqual(json(context.calcBatterCard(name)),json(sandbox.calcBatterCard(name)));
    assert.equal(context.calcBatterWAR(name),sandbox.calcBatterWAR(name));
  }
});
test('RE24 and player run values match the original',()=>{
  const before=sandbox.getRunValueData(),after=context.getRunValueData();
  for(const key of ['RE','REn','bat','pit','cnt','totalPA','games'])assert.deepEqual(json(after[key]),json(before[key]));
});
test('defensive position totals and player OAA match the original',()=>{
  const before=sandbox._computeDefenseData(),after=context._computeDefenseData();
  assert.deepEqual(json(after.byPos),json(before.byPos));
  assert.equal(after.globalOutRate,before.globalOutRate);
  const stats=data=>Object.fromEntries(Object.entries(data.byPlayer).map(([name,row])=>
    [name,Object.fromEntries(['chances','outs','oaa','oaaWeighted'].map(key=>[key,row[key]]))]));
  assert.deepEqual(json(stats(after)),json(stats(before)));
});
test('expected hitting outcomes match the original',()=>{
  assert.deepEqual(json(context.getXOutData()),json(sandbox.getXOutData()));
});
for(const [key,descriptor] of savedGlobals) {
  if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
}
globalThis.document=env.document;
globalThis.localStorage=env.localStorage;
