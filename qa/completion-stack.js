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
// Keep legacy fixtures in fixed order; retakes.js tests the real shuffler.
src+='\n;remixedPractice=(refs,previous)=>({refs:withLearningMaterials(refs),choiceOrders:{}});';
const c=eval(src+'\n;({start,finish,continueReview,normalize,scoreOf,scorable,restartCount,firstRound,testSessions,archiveCompleted,fullAttempt,selectedSession,testCard,sessionFor,refsOf,test,attempts:()=>attempts,archived:()=>archived,completed:()=>completedRuns,view:()=>view,live:()=>live,reset:()=>{attempts=[];archived=[];completedRuns=[];stackPositions={};live=null},render})');
const click=d=>L.click[0]({target:{closest:sel=>sel===".fig img"?null:{dataset:d}}});
let count=0;const check=(v,msg)=>{assert.ok(v,msg);count++;console.log('ok - '+msg);};
function record(id,answers,stamp=100,extra={}){return {id,testId:'t1',title:'T1',mode:'practice',refs:c.refsOf(c.test('t1')),answers,checked:[true,true,true],i:2,max:2,done:true,startedAt:stamp,finishedAt:stamp+10,elapsed:1000,...extra};}
function add(a){c.attempts().push(a);return a;}
c.reset();const root=add(record('root',[1,null,null]));
check(!c.testSessions(c.test('t1'))[0].complete,'unresolved full attempt is not complete');
const partial=add(record('partial',[3],120,{testId:null,refs:[['t1',2]],checked:[true],i:0,max:0}));
check(c.testSessions(c.test('t1'))[0].remaining===1,'legacy subset review resolves only its own question');
const last=add(record('last',[[0,2]],140,{testId:null,refs:[['t1',1]],checked:[true],i:0,max:0}));
const before=JSON.stringify(c.attempts());c.archiveCompleted();
check(c.testSessions(c.test('t1'))[0].complete,'exact legacy review chain completes the full test');
check(!c.archived().includes('t1'),'completed legacy test stays out of manual archive');
check(JSON.stringify(c.attempts())===before,'recognizing old completion never rewrites attempts');
check(c.completed().length===1,'one archive marker per completed full attempt');
click({unarch:'t1'});c.archiveCompleted();check(!c.archived().includes('t1'),'manual restore survives repeat completion check');
const next=add(record('retake',[1,null,null],200));c.archiveCompleted();
let sessions=c.testSessions(c.test('t1'));
check(sessions.length===2&&sessions[1].label==='Retake 1'&&sessions[0].label==='Original attempt','full retakes receive distinct labels');
check(!sessions[1].complete&&sessions[1].remaining===2,'old correct reviews cannot complete a newer retake');
let card=c.testCard(c.test('t1'));
check((card.match(/class="attempt-face"/g)||[]).length===1&&card.includes('Retake 1')&&!card.includes('Original attempt'),'one visible face with latest retake on top');
check(card.includes('layered')&&card.includes('data-stack-back'),'multiple attempts use one layered test card');
click({stackBack:'t1'});card=c.testCard(c.test('t1'));
check(card.includes('Original attempt')&&!card.includes('Retake 1'),'earlier control reveals underlying original');
click({stackBack:'t1'});check(c.selectedSession(c.test('t1'),sessions).index===0,'stack navigation stops at original');
click({stackForward:'t1'});click({stackForward:'t1'});check(c.selectedSession(c.test('t1'),sessions).index===1,'stack navigation stops at newest retake');
check(c.scoreOf(root)===1&&c.scoreOf(next)===1,'flipping cards preserves independent first-pass scores');
c.start('T1',c.refsOf(c.test('t1')),'practice','t1');const a=c.live();a.startedAt=300;
check(c.testSessions(c.test('t1')).at(-1).label==='Retake 2','new full retake is added on top');
check(!c.archived().includes('t1'),'starting a retake makes the test active');
a.answers=[1,null,null];a.checked=[true,true,true];a.i=a.max=2;c.finish();
c.continueReview(a);a.answers=[[0,2],3];a.checked=[true,true];a.i=a.max=1;c.finish();
check(c.sessionFor(a).complete&&!c.archived().includes('t1'),'finishing a full test review loop completes without archiving it');
check(c.scoreOf(a)===1&&c.scorable(a)===3&&c.restartCount(a)===1,'completion preserves first score and restart count');
check(c.testSessions(c.test('t1')).length===3,'review restart does not add a retake card');
click({home:'1'});check((html.match(/aria-label="T1"/g)||[]).length===1,'home contains exactly one test card for all retakes');
click({att:a.id});check(html.includes('complete-banner')&&html.includes('<details class="fold"><summary>First-round answers'),'completion is prominent while answer detail stays collapsed');
c.reset();add(record('small',[1],100,{refs:[['t1',0]],checked:[true],i:0,max:0}));c.archiveCompleted();
check(!c.archived().includes('t1')&&!c.testSessions(c.test('t1')).length,'a perfect small review is not a full test completion');
c.reset();add(record('fail',[1,null,null]));add(record('unrelated',[1],120,{testId:null,refs:[['t1',0]],checked:[true],i:0,max:0}));
check(c.testSessions(c.test('t1'))[0].linked.length===0,'unrelated correct-question review is not silently attached');
c.reset();add(record('duplicate',[1,[0,2],3],100,{refs:[['t1',0],['t1',0],['t1',2]]}));
check(!c.fullAttempt(c.attempts()[0]),'duplicate refs cannot disguise an incomplete full test');
c.reset();c.start('T2',c.refsOf(c.test('t2')),'practice','t2');const note=c.live();note.answers=[null,0];note.i=note.max=1;c.finish();
check(c.sessionFor(note).complete,'teaching cards never block full-test completion');
c.reset();c.start('T1',c.refsOf(c.test('t1')),'practice','t1');const paused=c.live();click({exit:'1'});
check((html.match(new RegExp('data-resume="'+paused.id+'"','g'))||[]).length===1,'paused full test has one Resume in its stack');
click({dropAsk:paused.id});check(html.includes('Discard this run?')&&!html.includes('data-resume="'+paused.id+'"'),'discard confirmation appears on the same stack face');
click({dropCancel:'1'});check(c.attempts().includes(paused),'cancel discard preserves the attempt');
// Reload all saved metadata through the same JSON representation as the backend.
c.reset();const saved=add(record('saved',[1,[0,2],3]));c.archiveCompleted();const marker=c.completed().slice();
click({unarch:'t1'});const savedDocs=JSON.parse(JSON.stringify({attempts:c.attempts(),completed:c.completed(),archived:c.archived()}));
check(savedDocs.completed[0]===marker[0]&&!savedDocs.archived.length,'restore preference is persistable independently of completion');
c.reset();const legacyRoot=add(record('legacy-root',[1,null,null]));add(record('legacy-review',[3],120,{testId:null,refs:[['t1',2]],checked:[true],i:0,max:0}));
c.continueReview(legacyRoot);check(legacyRoot.refs.length===1&&legacyRoot.refs[0][1]===1,'continuing an older partial chain repeats only the unresolved question');
legacyRoot.answers=[[0,2]];legacyRoot.checked=[true];legacyRoot.i=legacyRoot.max=0;c.finish();
check(c.sessionFor(legacyRoot).complete&&!c.archived().includes('t1'),'legacy review evidence survives continuation and permits completion');
console.log(count+' completion-stack checks passed');process.exit(0);
