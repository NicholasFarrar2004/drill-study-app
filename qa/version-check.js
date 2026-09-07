// checks the version stack, overlap notice, carry-forward and tap-to-reveal
const fs=require('fs');
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
let src=fs.readFileSync(require('path').join(__dirname,'../drill.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace(/const TESTS = \[[\s\S]*?\n\];/, `const TESTS = [
 {id:"v1",title:"Ch4 v1",course:"C1",created:"2026-08-20T09:00:00Z",about:"first cut",
  source:{name:"Ch4 deck",through:"slide 22 of 60",remaining:"slides 23-60"},
  questions:[
   {eyebrow:"E",title:"Card",body:"line",reveal:"the hidden line",ask:"So what?"},
   {q:"shared question one",options:["a","b"],correct:0,tags:["x"],why:"w"},
   {q:"shared question two",options:["a","b"],correct:0,tags:["x"],why:"w"}]},
 {id:"v2",title:"Ch4 v2",course:"C1",created:"2026-08-27T09:00:00Z",about:"second cut",
  supersedes:"v1", carry:{"1":1,"2":2},
  source:{name:"Ch4 deck",through:"slide 40 of 60"},
  questions:[
   {eyebrow:"E",title:"Card",body:"line",reveal:"the hidden line",ask:"So what?"},
   {q:"shared question one",options:["a","b"],correct:0,tags:["x"],why:"w"},
   {q:"shared question two",options:["a","b"],correct:0,tags:["x"],why:"w"}]},
 {id:"other",title:"Other C1 test",course:"C1",created:"2026-08-28T09:00:00Z",about:"o",
  questions:[
   {q:"shared question one",options:["a","b"],correct:0,tags:["x"],why:"w"},
   {q:"shared question two",options:["a","b"],correct:0,tags:["x"],why:"w"},
   {q:"unique here",options:["a","b"],correct:1,tags:["x"],why:"w"}]},
 {id:"far",title:"Different class",course:"C2",created:"2026-08-29T09:00:00Z",about:"f",
  questions:[
   {q:"shared question one",options:["a","b"],correct:0,tags:["x"],why:"w"},
   {q:"shared question two",options:["a","b"],correct:0,tags:["x"],why:"w"}]}
];`);
let html="";
const stubEl={set innerHTML(v){html=v}, get innerHTML(){return html}, className:"", offsetWidth:0,
  querySelector:sel=>sel===".dock"&&/<div class="dock/.test(html)
    ? {remove(){ html=html.replace(/<div class="dock[\s\S]*$/,""); }} : null,
  insertAdjacentHTML:(_,frag)=>{ html+=frag; },
  querySelectorAll:()=>[]};
const dockStub={set innerHTML(v){}, get innerHTML(){return ""}, appendChild(){}};
const L={};
global.document={getElementById:id=>id==="app"?stubEl:id==="dockhost"?dockStub:null,
  addEventListener:(t,f)=>{ (L[t]=L[t]||[]).push(f); },
  removeEventListener:()=>{}, querySelector:()=>null,
  createElement:()=>({style:{},setAttribute(){},addEventListener(){},remove(){}}),
  body:{appendChild(){}}};
global.window={scrollTo:()=>{}};
global.claude={use:()=>Promise.resolve(null)}; global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}}; global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}}; global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
const ctx=eval(src+"\n;({sched:()=>sched,notes:()=>notes,flags:()=>flags,carried:()=>carried,carryForward,view:()=>view,setSched:v=>{sched=v},setNotes:v=>{notes=v},setFlags:v=>{flags=v},overlaps,chainOf,test,activeTests,dueRefs})");
const click=d=>L.click[0]({target:{closest:sel=>sel===".fig img"?null:{dataset:d}}});
const has=s=>html.includes(s);
const ok=(c,m)=>{ if(!c) throw new Error("FAIL: "+m); console.log("ok -",m); };

// ── the stack
ok(!has("Ch4 v1")&&has("Ch4 v2"),"an earlier version is not listed on its own");
ok(has(">v2<"),"the newest card carries a version chip");
ok(has("Show 1 earlier version"),"the stack offers its earlier versions");
click({vers:"v2"});
ok(has("Hide 1 earlier version")&&has("Ch4 v1"),"expanding shows the earlier version");
ok(/data-test="v1"/.test(html),"the earlier version is still openable");
click({vers:"v2"});
ok(!has("Ch4 v1"),"collapsing hides it again");

// ── stats and scheduling ignore the superseded version
ok(ctx.activeTests().map(t=>t.id).join()==="v2,other,far","superseded test drops out of the active set");
ok(html.includes("0/7")||/0<\/span>.*?\/7/s.test(html),"known-of-total counts each question once");

// ── overlap, same course only
const o=ctx.overlaps();
ok(o["v2"]&&o["v2"][0].n===2,"overlap found between two same-course tests");
ok(!o["far"],"a different class is not flagged");
ok(!(o["v2"]||[]).some(x=>x.title==="Ch4 v1"),"a test's own earlier version is not an overlap");
ok(has("Shares 2 questions with"),"the overlap notice renders on the card");

// ── carry-forward
ctx.setSched({"v1:1":{box:3,due:Date.now()+9e8},"v1:2":{box:1,due:0}});
ctx.setNotes({"v1:1":"my note"});
ctx.setFlags(["v1:2"]);
ctx.carryForward();
const s=ctx.sched();
ok(s["v2:1"]&&s["v2:1"].box===3,"an unchanged question keeps its box in the new version");
ok(s["v2:2"].box===1,"and its due date");
ok(ctx.notes()["v2:1"]==="my note","the note comes across");
ok(ctx.flags().includes("v2:2"),"the flag comes across");
ok(ctx.carried().includes("v2"),"the carry is recorded so it runs once");
delete ctx.notes()["v2:1"];
ctx.carryForward();
ok(ctx.notes()["v2:1"]===undefined,"a note deleted on purpose does not come back");

// ── source line
click({home:"1"});
ok(has("Ch4 deck")&&has("through slide 40 of 60"),"the card says where the questions came from");
click({test:"v1"});
ok(has("not yet covered: slides 23-60"),"the remainder is stated on the older version");
ok(has("An earlier version"),"an old version says so when you open it");

// ── tap to reveal
click({home:"1"}); click({practice:"v2"});
ok(has("So what?")&&has("Reveal")&&!has("the hidden line"),"a teaching card withholds the reveal");
ok(has("<b>space</b> to reveal"),"the hint says what space does");
const rk=/data-reveal="([^"]+)"/.exec(html)[1];
click({reveal:rk});
ok(has("the hidden line")&&!has(">Reveal<"),"revealing shows the line");
ok(has("<b>space</b> to continue"),"and the hint moves on");
ok(has("Flag this")&&has("Add a note"),"the teaching card still takes a flag and a note");

console.log("\nAll version checks passed.");

process.exit(0);
