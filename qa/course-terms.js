// smoke test: run the app's logic with a stub DOM, drive it by simulating clicks
const fs=require('fs');
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
let src=fs.readFileSync(require('path').join(__dirname,'../drill.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace(/const TESTS = \[[\s\S]*?\n\];/, `const TESTS = [
 {id:"t1",title:"T1",course:"C1",unit:"U",questions:[
  {q:"q0",options:["a","b","c","d"],correct:1,tags:["alpha"],why:"w"},
  {q:"q1",options:["a","b","c","d"],correct:[0,2],tags:["alpha","beta"],why:"w"},
  {q:"q2",options:["a","b","c","d"],correct:3,tags:["beta"],why:"w"}]},
 {id:"t2",title:"T2",course:"C2",unit:"U",created:"2026-08-30T09:00:00Z",about:"about t2",questions:[
  {eyebrow:"Start",title:"A teaching card",body:"line one\\nline two",img:"data:image/gif;base64,R0lGOD",alt:"a figure"},
  {q:"n0",options:["a","b"],correct:0,tags:["gamma"],why:"w"}]},
 {id:"t3",title:"T3",course:"C3",created:"2026-08-29T09:00:00Z",about:"games",questions:[
  {type:"match",q:"match me",pairs:[["a1","b1"],["a2","b2"],["a3","b3"]],tags:["m"],why:"w"},
  {type:"order",q:"order me",items:["first","second","third"],tags:["o"],why:"w"}]}
];`);

let html="";
// enough of an element for the app: innerHTML, one removable dock, and append
const stubEl={set innerHTML(v){html=v}, get innerHTML(){return html},
  className:"", offsetWidth:0,
  querySelector:sel=>sel===".dock"&&/<div class="dock/.test(html)
    ? {remove(){ html=html.replace(/<div class="dock[\s\S]*$/,""); }} : null,
  insertAdjacentHTML:(_,frag)=>{ html+=frag; }};
let keyHandler=null;
const dockStub={set innerHTML(v){}, get innerHTML(){return ""}, appendChild(){}};
const L={};                                   // document listeners, by type, in registration order
global.document={getElementById:id=>id==="app"?stubEl:id==="dockhost"?dockStub:null,
  addEventListener:(t,f)=>{ (L[t]=L[t]||[]).push(f); },
  removeEventListener:()=>{}, querySelector:()=>null,
  createElement:()=>({style:{},setAttribute(){},addEventListener(){},remove(){}}),
  body:{appendChild(){}}};
global.window={scrollTo:()=>{}};
global.claude={use:()=>Promise.resolve(null)}; global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}}; global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}}; global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};

const assert=require('node:assert/strict');
const c=eval(src+'\n;({test,refsOf,start,finish,archiveIdsFor,testComplete,activeTests,archiveCompleted,courseKey,courseEntries,searchTerms,wordBankEntries,termEntry,termVisual,completedBlock,archiveBlock,render,handle,notes:()=>notes,attempts:()=>attempts,live:()=>live,setArchived:v=>{archived=v},archived:()=>archived,setView:v=>{view=v},notesExpanded:()=>notesExpanded})');
let n=0;const check=(x,msg)=>{assert.ok(x,msg);n++;console.log('ok - '+msg);};
c.start('T1',c.refsOf(c.test('t1')),'practice','t1');let a=c.live();a.answers=[1,[0,2],3];a.checked=[true,true,true];a.i=a.max=2;c.finish();
check(c.testComplete(c.test('t1')),'clean full attempt is complete');check(!c.archived().includes('t1'),'completion does not archive');check(!c.activeTests().some(t=>t.id==='t1'),'completed test leaves active section');check(c.completedBlock().includes('data-test="t1"'),'completed section contains result stack');
const old={list:['t1','t2'],completedRuns:[a.id]};check(JSON.stringify(c.archiveIdsFor(old))===JSON.stringify(['t2']),'legacy automatic completion separated from manual archives');check(old.list.length===2,'legacy interpretation does not mutate stored document');
const manual={...old,archiveVersion:2};check(c.archiveIdsFor(manual).includes('t1'),'explicit archive of completed test survives reload');
c.handle({dataset:{arch:'t1'}});check(c.archiveBlock().includes('data-test="t1"')&&!c.completedBlock().includes('data-test="t1"'),'explicit archive is disjoint from Completed');
c.handle({dataset:{unarch:'t1'}});check(c.completedBlock().includes('data-test="t1"'),'restoring a completed test returns it to Completed');
c.handle({dataset:{fullRetry:a.id}});check(c.activeTests().some(t=>t.id==='t1'),'fresh retake returns test to active section');
c.notes()['t1:0']='Keep this note';c.handle({dataset:{home:'1'}});check(html.includes('id="your-notes"')&&html.includes('Keep this note'),'Notes is collapsible without removing content');
L.toggle.forEach(f=>f({target:{id:'your-notes',open:false}}));c.render();check(!html.includes('class="notes-fold" open'),'collapsed Notes remains collapsed across rendering');check(c.notes()['t1:0']==='Keep this note','collapsing preserves note text');
const entries=c.courseEntries('Fictional Operations');check(entries.length===5,'course glossary includes all 5 course terms');const result=c.searchTerms(entries,'container');check(result.some(e=>e.id==='crate'),'definitions and aliases are searchable');check(c.searchTerms(entries,'totallyabsent').length===0,'search has an empty state');
const visual=c.termVisual(entries.find(e=>e.id==='crate'));check(visual.includes('3 crates')&&visual.includes('flow'),'expanded term has a worked visual example');
check(c.termEntry(entries[0],'Fictional Operations').includes('<details')&&c.termEntry(entries[0],'Fictional Operations').includes('<summary>'),'definitions expand by native accessible disclosure');
console.log(n+' course-library checks passed');process.exit(0);
