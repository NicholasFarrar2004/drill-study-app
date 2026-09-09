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
const c=eval(src+'\n;({start,finish,continueReview,wordBankAttempt,wordBankEntries,kbPick,handle,test,refsOf,render,live:()=>live,view:()=>view,attempts:()=>attempts,setView:v=>{view=v}})');
let n=0;const check=(v,msg)=>{assert.ok(v,msg);n++;console.log('ok - '+msg);};
const click=d=>c.handle({dataset:d});
c.start('T3',c.refsOf(c.test('t3')),'practice','t3');
let a=c.live();a.i=1;a.max=1;c.render();
const labels=()=>[...html.matchAll(/data-order="(\d+)"><span class="key">(\d+)<\/span>/g)].map(x=>[+x[1],+x[2]]);
const initial=labels();check(initial.length===3,'three stable keyboard labels');
const number3=initial.find(x=>x[1]===3)[0];const number1=initial.find(x=>x[1]===1)[0];
c.kbPick(1);check(a.answers[1][0]===number1,'number 1 chooses original choice');
check(labels().some(x=>x[0]===number3&&x[1]===3),'remaining third choice still displays 3');
c.kbPick(3);check(a.answers[1][1]===number3,'3 selects original third choice after another selection');
check(c.kbPick(3)===false&&a.answers[1].length===2,'repeated selected key has no effect');
click({unpick:'1'});check(labels().some(x=>x[0]===number3&&x[1]===3),'undo restores original number');
c.kbPick(3);check(a.answers[1][1]===number3,'restored number remains selectable');
click({order:String(number3)});check(a.answers[1].length===2,'stale click cannot duplicate a choice');
click({home:'1'});
c.start('T1',c.refsOf(c.test('t1')),'practice','t1');a=c.live();a.answers=[1,[0,2],3];a.checked=[true,true,true];a.i=2;c.finish();
check(html.includes('Try this test again?'),'first attempt prompts retry');
const first=JSON.stringify(a),id=a.id;click({fullRetry:id});
check(c.live().id!==id&&c.live().refs.length===3&&c.live().answers.every(x=>x===null),'retry creates a fresh full attempt');
check(JSON.stringify(a)===first,'prior attempt preserved');
a=c.live();a.answers=[1,[0,2],3];a.checked=[true,true,true];a.i=2;c.finish();
check(html.includes('Try this test again?'),'subsequent attempt prompts retry');
check(c.wordBankAttempt()?.id===a.id,'word bank available on practice results');
click({home:'1'});check(c.wordBankAttempt()===null,'word bank unavailable outside practice');
c.start('T1',c.refsOf(c.test('t1')),'exam','t1');check(c.wordBankAttempt()===null,'word bank hidden in exam');a=c.live();a.answers=[1,[0,2],3];a.i=2;c.finish();check(!html.includes('Try this test again?'),'exam results do not show practice retry');
console.log(n+' feature checks passed');clearInterval(0);process.exit(0);
