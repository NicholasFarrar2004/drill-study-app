// smoke test: run the app's logic with a stub DOM, drive it by simulating clicks
const fs=require('fs');
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
let src=fs.readFileSync(require('path').join(__dirname,'../drill.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");

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
const c=eval(src+'\n;({tests:TESTS,choiceOrder,remixedPractice,learningRefsFor,withLearningMaterials,start,finish,continueReview,normalize,scoreOf,scorable,roundScorable,firstRound,missedRefs,restartCount,handle,kbPick,render,refsOf,live:()=>live,setLive:a=>live=a})');
let count=0;const check=(v,msg)=>{assert.ok(v,msg);count++;console.log('ok - '+msg);};
const lesson={id:'retake-demo',title:'Fictional workshop',course:'DEMO',questions:[
 {title:'Receive',body:'Inspect and register a parcel.'},
 {q:'First step?',options:['Inspect','Dispatch','Pack'],correct:0,why:'Inspect on receipt.'},
 {q:'Receiving tasks?',options:['Inspect','Register','Dispatch'],correct:[0,1],why:'Both receiving tasks.'},
 {title:'Packing',body:'Wrap, box, seal.'},
 {type:'order',q:'Packing steps?',items:['Wrap','Box','Seal'],why:'Keep contents protected.'},
 {type:'match',q:'Match roles',pairs:[['Receive','Inspect'],['Pack','Wrap'],['Dispatch','Send']],why:'Each stage has a role.'},
 {title:'Dispatch',body:'Label and send.'},
 ...Array.from({length:6},(_,i)=>({q:'Dispatch check '+i,options:['Label','Discard','Receive'],correct:0,why:'Use a label.'}))],learningRefs:{5:[0,3,6]}};
c.tests.push(lesson);const ref=i=>[lesson.id,i];const all=c.refsOf(lesson);
check(c.learningRefsFor(ref(1))[0][1]===0,'question links to preceding teaching slide');
check(c.learningRefsFor(ref(5)).map(r=>r[1]).join(',')==='0,3,6','recap uses explicit teaching links');
check(c.withLearningMaterials([ref(1),ref(2)]).map(r=>r[1]).join(',')==='0,1,2','shared teaching slide appears once');
c.start(lesson.title,all,'practice',lesson.id);let a=c.live();
const answerFor=r=>{const q=lesson.questions[r[1]];return q.type==='order'?[0,1,2]:q.type==='match'?{pairs:[0,1,2],misses:0,done:true}:q.correct??null;};
a.answers=a.refs.map(answerFor);a.answers[1]=null;a.i=a.max=a.refs.length-1;c.finish();
check(!a.done&&a.refs.map(r=>r[1]).join(',')==='0,1','automatic retry replays teaching before missed question');
check(c.scoreOf(a)===9&&c.scorable(a)===10&&c.roundScorable(a)===1,'teaching excluded from scores and retry threshold');
check(html.includes('1 question to review'),'review header counts questions only');
const firstOrder=c.choiceOrder(a,ref(1));c.handle({dataset:{next:'1'}});check(a.i===1,'Got it skips teaching without grading');
c.kbPick(firstOrder.indexOf(0)+1);check(a.answers[a.i]===0&&a.checked[a.i],'number key follows shuffled MC order');c.handle({dataset:{next:'1'}});
check(a.done&&c.missedRefs(a).length===0,'correct answer completes the round');
const mixed=c.remixedPractice(all,a);check(mixed.refs.length===all.length,'full retake keeps all cards');
check(new Set(mixed.refs.map(JSON.stringify)).size===mixed.refs.length,'cards are not duplicated');
check(JSON.stringify(mixed.refs)!==JSON.stringify(all),'retake changes topic order');
check(mixed.refs.findIndex(r=>r[1]===1)<mixed.refs.findIndex(r=>r[1]===2),'contextual follow-ups stay in section order');
for(const r of mixed.refs.filter(r=>lesson.questions[r[1]].q))for(const slide of c.learningRefsFor(r))check(mixed.refs.findIndex(x=>x[1]===slide[1])<mixed.refs.findIndex(x=>x[1]===r[1]),'teaching precedes question '+r[1]);
const previous={refs:all,answers:[],checked:[]};
for(const [i,sides]of [[1,['mc']],[2,['mc']],[4,['order']],[5,['l','r']]])for(const side of sides){
 const old=c.choiceOrder(previous,ref(i),side),next=c.choiceOrder(mixed,ref(i),side);
 check(next.every((v,j)=>v!==old[j]),'choices move for '+i+' '+side);
 check([...next].sort().join(',')===[...old].sort().join(','),'original answer identities retained');}
const repeat=c.remixedPractice(mixed.refs,{...mixed,answers:[],checked:[]});check(JSON.stringify(repeat.refs)!==JSON.stringify(mixed.refs),'later retake reshuffles topic groups');
check(c.choiceOrder(repeat,ref(1)).every((v,i)=>v!==c.choiceOrder(mixed,ref(1))[i]),'later retake reshuffles answers again');
c.start('Multi', [ref(2)],'practice',null,previous);a=c.live();a.i=a.max=a.refs.length-1;c.render();const opts=c.choiceOrder(a,ref(2));
check([...html.matchAll(/data-pick="(\d+)"/g)].map(m=>+m[1]).join(',')===opts.join(','),'render and keyboard use same choice order');
for(const correct of [0,1])c.kbPick(opts.indexOf(correct)+1);c.handle({dataset:{check:'1'}});check([...a.answers[a.i]].sort().join(',')==='0,1','multi-select stores original indexes');
const restored=c.normalize(JSON.parse(JSON.stringify(a)));check(JSON.stringify(restored.choiceOrders)===JSON.stringify(a.choiceOrders),'resume preserves order');
c.start('Matching',[ref(5)],'practice',null,previous);a=c.live();a.i=a.max=a.refs.length-1;c.render();const leftTiles=c.choiceOrder(a,ref(5),'l'),rightTiles=c.choiceOrder(a,ref(5),'r');c.kbPick(1);c.kbPick(rightTiles.indexOf(leftTiles[0])+1);check(a.answers[a.i].pairs.includes(leftTiles[0]),'matching keyboard targets displayed tiles');
c.start('Ordering',[ref(4)],'practice',null,previous);a=c.live();a.i=a.max=a.refs.length-1;c.render();const order=c.choiceOrder(a,ref(4),'order');for(const i of [0,1,2])c.kbPick(order.indexOf(i)+1);check(a.answers[a.i].join(',')==='0,1,2','ordering shortcuts keep original step identities');
const savedOrder=JSON.stringify(a.choiceOrders);c.handle({dataset:{restartDo:'1'}});check(JSON.stringify(a.choiceOrders)!==savedOrder&&a.answers.every(x=>x===null),'manual restart remixes and clears current answers');
c.start('Exam',[ref(1)],'exam');check(c.live().refs.length===1&&!c.live().choiceOrders,'exam subset remains unchanged');
check(c.choiceOrder({choiceOrders:{[JSON.stringify(ref(1))]:{mc:[99,99]}}},ref(1)).join(',')==='0,1,2','invalid saved permutation falls back safely');
console.log(count+' retake checks passed');process.exit(0);
