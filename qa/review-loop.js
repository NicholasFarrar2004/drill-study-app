// smoke test: run the app's logic with a stub DOM, drive it by simulating clicks
const fs=require('fs');
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
let src=fs.readFileSync(require('path').join(__dirname,'../drill.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace(/const TESTS = \[[\s\S]*?\n\];/,"const TESTS = [{\"id\": \"loop30\", \"title\": \"Review loop QA\", \"course\": \"QA\", \"questions\": [{\"q\": \"Question 1\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Select both correct answers\", \"options\": [\"First correct\", \"Second correct\", \"Wrong\"], \"correct\": [0, 1], \"why\": \"Both first and second apply.\"}, {\"type\": \"order\", \"q\": \"Put these in order\", \"items\": [\"First\", \"Second\", \"Third\"], \"why\": \"First, then second, then third.\"}, {\"type\": \"match\", \"q\": \"Match the pairs\", \"pairs\": [[\"A\", \"Alpha\"], [\"B\", \"Beta\"]], \"why\": \"A matches Alpha and B matches Beta.\"}, {\"q\": \"Question 5\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 6\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 7\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 8\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 9\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 10\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 11\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 12\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 13\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 14\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 15\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 16\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 17\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 18\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 19\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 20\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 21\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 22\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 23\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 24\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 25\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 26\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 27\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 28\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 29\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"q\": \"Question 30\", \"options\": [\"Correct answer\", \"Wrong answer\"], \"correct\": 0, \"why\": \"The first option is correct.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}, {\"title\": \"Teaching card\", \"body\": \"Not a scored question.\"}]}];");

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
const c=eval(src+'\n;({start,finish,continueReview,normalize,scoreOf,scorable,roundScoreOf,roundScorable,restartCount,missedRefs,originalTotal,firstRound,exportState,attempts:()=>attempts,live:()=>live,view:()=>view,setLive:a=>live=a,refsOf,test,results})');
const click=d=>L.click[0]({target:{closest:sel=>sel===".fig img"?null:{dataset:d}}});
let count=0;const check=(v,msg)=>{assert.ok(v,msg);count++;console.log('ok - '+msg);};
function begin(misses,mode='practice',refs=c.refsOf(c.test('loop30'))){
 c.start('Review loop QA',refs,mode,'loop30');const a=c.live();
 a.answers=a.refs.map(r=>{const i=r[1];return i>=30?null:i===1?[0,1]:i===2?[0,1,2]:i===3?{pairs:[0,1],misses:0,done:true}:0;});
 for(let i=0;i<misses;i++)a.answers[i]=null;
 a.checked=a.refs.map(()=>true);a.i=a.max=a.refs.length-1;return a;
}
let a=begin(5);const original=JSON.stringify(a.answers);c.finish();
check(!a.done&&a.refs.length===5&&c.restartCount(a)===1,'5/30 starts automatic review and excludes teaching cards');
check(c.attempts().filter(x=>x.id===a.id).length===1,'restart keeps one attempt record');
check(c.scoreOf(a)===25&&c.scorable(a)===30,'first score stays 25/30');
check(a.answers.every(v=>v===null)&&a.checked.every(v=>v===false)&&a.i===0&&a.max===0,'review round starts with fresh answers and navigation');
check(JSON.stringify(c.firstRound(a).answers)===original,'original answer evidence retained');
// Use the real UI event path for MC, multi-select, ordering, and matching.
click({pick:'0'});click({next:'1'});
click({pick:'0'});click({pick:'1'});click({check:'1'});click({next:'1'});
click({order:'0'});click({order:'1'});click({order:'2'});click({check:'1'});click({next:'1'});
click({match:'l:0'});click({match:'r:0'});click({match:'l:1'});click({match:'r:1'});click({next:'1'});
click({pick:'1'});click({next:'1'});
check(a.refs.length===1&&c.restartCount(a)===2&&!a.done,'mixed-type review removes correct questions and repeats only one miss');
const loaded=c.normalize(JSON.parse(JSON.stringify(a)));c.setLive(loaded);
check(c.restartCount(loaded)===2&&loaded.refs.length===1&&c.scoreOf(loaded)===25,'JSON reload preserves restart count, queue, and first score');
click({pick:'0'});click({next:'1'});
check(loaded.done&&c.missedRefs(loaded).length===0&&c.view().s==='results','last correct answer ends the loop');
const n=loaded.rounds.length;c.finish();check(loaded.rounds.length===n,'duplicate finish is harmless');
a=begin(6);c.finish();check(a.done&&!a.rounds,'exactly 20 percent does not auto-restart despite extra teaching cards');
click({retry:a.id});check(!a.done&&a.refs.length===6&&c.restartCount(a)===1,'manual review continues larger rounds in same attempt');
a.answers=a.answers.map((_,i)=>i===5?0:null);a.i=a.max=5;c.finish();
check(!a.done&&a.refs.length===5&&c.restartCount(a)===2,'larger review becomes automatic below original 30-question threshold');
a=begin(7);c.finish();check(a.done&&!a.rounds,'above threshold ends round normally');
a=begin(0);c.finish();check(a.done&&!a.rounds,'all correct creates no extra round');
a=begin(1,'exam');c.finish();check(a.done&&!a.rounds,'exam mode never auto-restarts');
a=begin(1,'practice',[['loop30',4],['loop30',5],['loop30',6]]);c.finish();
check(!a.done&&a.refs.length===1&&a.originalTotal===30,'small review uses original test total, not 3-question review size');
check(c.normalize({...a,rounds:[{}]})?.rounds===undefined,'malformed optional metadata cannot break old history');
a=begin(1);c.finish();
for(let k=0;k<25;k++){a.i=a.max=a.refs.length-1;c.finish();}
check(c.restartCount(a)===26&&a.refs.length===1&&!a.done,'repeated misses continue without a restart cap');
click({exit:'1'});click({resume:a.id});
check(c.restartCount(c.live())===26,'save and exit resumes the same round');
const prior=a;
const other=begin(7);c.finish();
c.start('Review loop QA',c.refsOf(c.test('loop30')),'practice','loop30');
const open=c.live();click({retry:other.id});
check(c.live()===open&&other.done,'retrying history resumes existing open attempt without creating a competing run');
console.log(count+' review-loop checks passed');process.exit(0);
