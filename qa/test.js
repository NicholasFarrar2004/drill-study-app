// smoke test: run the app's logic with a stub DOM, drive it by simulating clicks
const fs=require('fs');
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
global.DrillRuntime={connect:()=>Promise.resolve(null),fail:()=>{}};
let src=fs.readFileSync(require('path').join(__dirname,'../drill.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
src=src.replace('el.innerHTML="<div class=empty>Loading your study data…</div>";', "render();");
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
const ctx=eval(src+"\n;({attempts:()=>attempts,sched:()=>sched,view:()=>view,live:()=>live,scoreOf,right,qOf,dueRefs,archived:()=>archived,normalize,figure,setLive:v=>{live=v},notes:()=>notes,notesText,noteRefs,exportState})");

const click=d=>L.click[0]({target:{closest:sel=>sel===".fig img"?null:{dataset:d}}});
const change=v=>L.change[0]({target:{closest:()=>({value:v})}});
const attempts_push=r=>ctx.attempts().push(r);
const has=s=>html.includes(s);
const ok=(c,m)=>{ if(!c) throw new Error("FAIL: "+m); console.log("ok -",m); };

ok(!ctx.figure({img:'data:image/webp;base64,x" onerror="alert(1)',alt:'demo'}).includes('src="data:image/webp;base64,x" onerror="'),'image source cannot escape its attribute');
ok(has("Nothing due"),"home starts with nothing due");
ok(has("not taken yet"),"test shows as not taken");

click({practice:"t1"});
ok(has("q0")&&has("1/3"),"practice starts at q0");

click({pick:"1"});                                  // correct single-answer
ok(has("Correct")&&has("Continue"),"single-answer reveals on pick");
click({next:"1"});
ok(has("q1")&&has("Select every answer"),"advances to select-all");

click({pick:"0"});                                  // partial multi selection
ok(!has("Not quite")&&has("Check"),"multi does not reveal until Check");
click({check:"1"});
ok(has("Not quite"),"incomplete multi marked wrong");
click({next:"1"});

click({pick:"0"});                                  // wrong single-answer
click({next:"1"});                                  // finish
ok(ctx.view().s==="results","finishes into results");
const a=ctx.attempts()[0];
ok(ctx.scoreOf(a)===1,"scored 1 of 3");
ok(a.done&&a.finishedAt,"attempt logged as done");

const sc=ctx.sched();
ok(sc["t1:0"].box===1&&sc["t1:0"].due>Date.now(),"correct answer scheduled forward");
ok(sc["t1:1"].box===0&&sc["t1:1"].due<=Date.now(),"missed question due immediately");

click({home:"1"});
ok(has("2 questions to review"),"both misses are due for review");
ok(has("1/3 first pass"),"home shows last score");
ok(has("alpha")&&has("beta"),"weak spots list missed tags");

click({review:"1"});
ok(has("Review")&&has("1/2"),"review session built from due questions");
click({pick:"0"}); click({check:"1"}); click({next:"1"});
click({pick:"3"}); click({next:"1"});
ok(ctx.attempts().length===2,"second attempt logged separately");

click({home:"1"});
ok(has("Original attempt")&&(html.match(/data-att=/g)||[]).length===2,"both attempts in the log");

// resume: leave mid-test, come back
click({practice:"t1"}); click({pick:"1"}); click({next:"1"}); click({exit:"1"});
ok(has("In progress")&&has("Question 2 of 3"),"resume offered at the right question");
const openA=ctx.attempts().find(a=>!a.done);
click({resume:openA.id});
ok(has("q1"),"resume lands on the right question");

// restarting a test discards only that test's stale in-progress attempt
click({home:"1"}); click({practice:"t1"});
ok(ctx.attempts().filter(a=>!a.done).length===1,"no orphaned in-progress attempt for the same test");
click({exit:"1"});
click({review:"1"});                       // a review runs alongside a paused test
ok(ctx.attempts().filter(a=>!a.done).length===2,"a review can run alongside a paused test");
ok((html.match(/data-resume=/g)||[]).length===0,"quiz view, not home");
click({exit:"1"});
ok((html.match(/data-resume=/g)||[]).length===2,"home offers a Resume for every paused attempt");

// discarding one unfinished run, with a confirm, leaves the others and the finished log alone
{
  const doomed=ctx.attempts().filter(a=>!a.done)[1];
  const doneBefore=ctx.attempts().filter(a=>a.done).length;
  ok(html.includes('data-drop-ask="'+doomed.id+'"'),"each paused run offers a Discard");
  click({dropAsk:doomed.id});
  ok(html.includes("Discard this run?")&&!html.includes('data-resume="'+doomed.id+'"'),
     "Discard asks first and hides its own Resume while asking");
  click({dropCancel:"1"});
  ok(html.includes('data-resume="'+doomed.id+'"'),"Keep it puts the run back untouched");
  click({dropAsk:doomed.id}); click({dropDo:doomed.id});
  ok(!ctx.attempts().some(a=>a.id===doomed.id),"Discard removes that run");
  ok((html.match(/data-resume=/g)||[]).length===1,"the other paused run survives");
  ok(ctx.attempts().filter(a=>a.done).length===doneBefore,"finished attempts are untouched");
  const survivor=ctx.attempts().find(a=>!a.done);
  click({dropDo:survivor.id+"-nope"});
  ok(ctx.attempts().some(a=>a.id===survivor.id),"a discard aimed at a missing run is a no-op");
  const finished=ctx.attempts().find(a=>a.done);
  if(finished){ click({dropDo:finished.id});
    ok(ctx.attempts().some(a=>a.id===finished.id),"a finished attempt cannot be discarded"); }
}

// elapsed time banks on interaction, not only on the 1s tick
const timed=ctx.attempts().find(a=>!a.done);
const before=timed.elapsed;
click({resume:timed.id});
const t=Date.now(); while(Date.now()-t<40);          // 40ms of work, no timer tick
click({pick:"1"});
ok(timed.elapsed>before,"fast answers still record elapsed time");

// teaching cards: shown, never scored, never scheduled
click({home:"1"}); click({practice:"t2"});
ok(has("A teaching card")&&has("Got it"),"note card renders with its own button");
ok(has("line one")&&has("line two"),"note body splits into paragraphs");
ok(has("<img src=\"data:image/gif")&&has('alt="a figure"'),"note figure renders with alt text");
ok(has("Tap the figure to enlarge"),"figure invites a zoom");
ok(!has("data-pick"),"a note offers no answer options");
click({next:"1"});
ok(has("n0")&&has("2/2"),"advances past the note into the question");
click({pick:"0"}); click({next:"1"});
const n=ctx.attempts()[0];
ok(ctx.scoreOf(n)===1,"note excluded from the score");
ok(has("1 / 1"),"results count only the scorable card");
ok(!has("A teaching card"),"note excluded from the graded review");
ok(!ctx.sched()["t2:0"]&&ctx.sched()["t2:1"],"note excluded from the review schedule");
click({home:"1"});
ok(has("about t2")&&has("Newest"),"home shows the blurb and marks the newest test");
ok(has("1 teaching card"),"home counts explainer cards separately");
ok(!ctx.archived().includes("t2")&&has("Completed ·"),"a clean full test moves to Completed without auto-archive");
click({unarch:"t2"});
ok(html.indexOf('data-test="t2"')>html.indexOf('Completed ·'),"completed tests are in their own section");

// keyboard: letters pick, Enter advances, and neither may crash on a teaching card
// a real document fires EVERY keydown listener, not just the last one registered
// every data-hook the markup emits must appear in the delegation selector, or the
// control is dead on arrival — this has bitten twice
const SEL_SRC=(src.match(/const SEL="([\s\S]*?)";/)||[])[1]||"";
const SELHAS=s=>SEL_SRC.includes(s);
const press=k=>L.keydown.forEach(f=>f({key:k,preventDefault(){},metaKey:false,ctrlKey:false}));
click({home:"1"}); click({practice:"t2"});
ok(has("A teaching card"),"on a teaching card");
press("A");                                    // used to throw on q.options.length
ok(has("A teaching card"),"a letter key on a card does nothing");
press("Enter");
ok(has("n0"),"Enter advances past a teaching card");
press("A");
ok(has("Correct")||has("Not quite"),"a letter key answers a question");

// full keyboard control of a run: numbers choose, space confirms and continues
click({home:"1"}); click({practice:"t1"});
ok(html.includes('class="key">1<')&&html.includes('class="key">4<'),
   "options are badged with the key you actually press");
ok(html.includes("to answer")&&!html.includes("space</b> to check"),
   "a single-answer practice card says 'to answer' — it reveals on choice, nothing to confirm");
press("2");
ok(ctx.attempts()[0].answers[0]===1,"pressing 2 selects the second option");
ok(ctx.attempts()[0].checked[0]===true,"and reveals it, as tapping does");
ok(html.includes("space</b> to continue"),"the hint switches to continue");
press("1");
ok(ctx.attempts()[0].answers[0]===1,"a number after the reveal cannot change the answer");
press(" ");
ok(ctx.live().i===1,"space moves to the next question");
{ // card 2 is select-all: numbers toggle, and space is a real check step here
  ok(ctx.live().i===1,"on to the select-all card");
  ok(html.includes("to choose")&&html.includes("space</b> to check"),
     "select-all does have a check step, and says so");
  press(" ");
  ok(ctx.live().i===1&&!ctx.live().checked[1],"space does nothing with no answer picked");
  press("9");
  ok(ctx.live().answers[1]==null,"a number past the last option does nothing");
  press("1"); press("3");
  ok(Array.isArray(ctx.live().answers[1])&&ctx.live().answers[1].length===2,"numbers toggle two on");
  press("3");
  ok(ctx.live().answers[1].length===1,"and toggle one back off");
  press("C");
  ok(ctx.live().answers[1].length===2,"letters still work as an alias");
  press(" ");
  ok(ctx.live().checked[1]===true,"space checks the select-all card");
  press(" ");
  ok(ctx.live().i===2,"and space again moves on");
}
// a teaching card takes space too
click({home:"1"}); click({practice:"t2"});
ok(html.includes("space</b> to continue"),"a teaching card says space continues");
press(" ");
ok(ctx.live().i===1,"space advances past a teaching card");
// order and match are keyboard-drivable
click({home:"1"}); click({practice:"t3"});
{
  const a=ctx.live();
  ok(html.includes('data-match'),"match card up");
  press("1"); press("1");
  const st=a.answers[a.i]||{pairs:[]};
  ok(st.pairs.length===1||st.misses===1,"two number presses attempt a pairing");
}

// archiving hides a test from the library, the schedule and the stats
click({home:"1"});
ok(has('data-test="t2"')&&!has("Archived ·"),"nothing archived yet");
const dueBefore=(html.match(/questions? to review/)||[]).length;
click({arch:"t2"});
ok(!has('data-arch="t2"'),"archived test leaves the main list");
ok(has("Archived · 1 test")&&has('data-unarch="t2"'),"archived drawer lists it with a restore");
ok(!ctx.dueRefs().some(r=>r[0]==="t2"),"archived questions drop out of the review queue");
const openT2=ctx.attempts().find(a=>a.testId==="t2"&&!a.done);
ok(openT2,"there is an unfinished run on t2 to archive around");
ok(html.indexOf('data-resume="'+openT2.id+'"')>html.indexOf("Archived ·"),"an archived unfinished run is available only inside its archived stack");
click({unarch:"t2"});
ok(has('data-arch="t2"')&&!has("Archived ·"),"restoring puts it back");
ok(ctx.attempts().includes(openT2)&&has('data-resume="'+openT2.id+'"'),
   "the unfinished run was kept, not discarded, and comes back with it");

// per-question notes: write on the card, gather on Home, copy out as text
click({home:"1"}); click({practice:"t1"});
ok(html.includes('data-note-open="t1:0"')&&!html.includes("textarea"),
   "a question card offers a note, closed by default");
click({noteOpen:"t1:0"});
ok(html.includes('<textarea data-note="t1:0"'),"opening it shows the box for that exact question");
click({noteOpen:"t1:0"});
ok(!html.includes("textarea"),"tapping again closes it");
ctx.notes()["t1:0"]="option b is worded twice";      // what typing into the box banks
ctx.notes()["t3:1"]="the ordering here is ambiguous";
ctx.notes()["t1:9"]="points at a card that no longer exists";
click({noteOpen:"t1:0"});
ok(html.includes("option b is worded twice"),"a saved note comes back into the box");
click({noteClose:"1"});
ok(!html.includes("textarea")&&html.includes('data-note-open="t1:0"'),"Done closes the box");
click({exit:"1"});
ok(html.includes("Your notes · 2"),"Home lists the notes, skipping the one with no question behind it");
ok(html.includes("option b is worded twice")&&html.includes("the ordering here is ambiguous"),
   "both notes are shown");
ok(html.includes("data-note-copy"),"and there is a copy-out");
{
  const txt=ctx.notesText();
  ok(txt.includes("Q1")&&txt.includes("Question: q0")&&txt.includes("My note: option b is worded twice"),
     "the copied text names the test, the question number, the stem and the note");
  ok(txt.split("\n\n").length===2,"one block per note");
  ok(!txt.includes("no longer exists"),"a note with no question behind it is left out");
}
ctx.notes()["t1:0"]=""; delete ctx.notes()["t1:0"];
delete ctx.notes()["t3:1"]; delete ctx.notes()["t1:9"];
click({home:"1"});
ok(!html.includes("Your notes"),"with nothing noted the section is gone");
ok(html.includes("data-export-all"),"the hand-off card is there whether or not anything is noted");

// the export must carry the whole store, not just the notes
{
  ctx.notes()["t1:2"]="this one is badly worded";
  const x=ctx.exportState();
  ok(x.tests.length===3&&x.attempts.length===ctx.attempts().filter(a=>a.refs).length,
     "every test and every usable attempt is exported");
  const q=x.tests.find(t=>t.id==="t1").questions[2];
  ok(q.ref==="t1:2"&&q.note==="this one is badly worded"&&q.prompt==="q2",
     "a question carries its ref, its prompt and its note");
  ok(q.correct===3&&Array.isArray(q.tags),"the answer key and tags come along");
  ok(x.notes.length===1&&x.notes[0].questionNumber===3,
     "notes are also listed flat, with a 1-based question number");
  const a=x.attempts.find(a=>a.done);
  ok(a&&a.score!=null&&a.answers.every(r=>r.ref),"a finished attempt carries its score and per-question refs");
  ok(x.schedule&&x.flags&&x.archived,"schedule, flags and archive are in there too");
  ok(JSON.parse(JSON.stringify(x)),"the whole thing is JSON-serializable");
  delete ctx.notes()["t1:2"];
}

// the flourish: eggs must never block, break state, or fire on an ordinary run
click({home:"1"});
ok(html.includes('data-mark="1"'),"the wordmark is a control now");
ok(SELHAS("[data-mark]"),"and the delegation selector actually reaches it");
// sweep every screen: any button carrying a data-hook that SEL does not match is a dead control
{
  const seen=new Set(), sweep=()=>{
    for(const m of html.matchAll(/<button[^>]*?>/g))
      for(const a of m[0].matchAll(/\sdata-([a-z-]+)=/g)) seen.add(a[1]);
  };
  const at=JSON.parse(JSON.stringify(ctx.view()));
  click({home:"1"}); sweep();
  click({view:"browse"}); sweep();
  click({test:"t2"}); sweep();
  click({practice:"t2"}); sweep(); click({next:"1"}); sweep();
  const dead=[...seen].filter(h=>!SELHAS("[data-"+h+"]"));
  ok(dead.length===0,"every data-hook a button emits is routed by SEL"+(dead.length?" — dead: "+dead:""));
  click({exit:"1"});
}
ok(html.includes('data-count='),"stat tiles carry a count-up target");
{
  const before=JSON.stringify(ctx.attempts());
  for(let n=0;n<7;n++) click({mark:"1"});          // past the 5-tap threshold, twice over
  ok(JSON.stringify(ctx.attempts())===before,"tapping the wordmark changes no data");
  ok(ctx.view().s==="home","and does not navigate");
}
{
  const before=JSON.stringify(ctx.attempts());
  ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"]
    .forEach(press);
  ok(JSON.stringify(ctx.attempts())===before,"the konami code touches no data either");
  ok(ctx.view().s==="home","and leaves the view alone");
}

// browse view: filter by class, newest first, and the same archive control
click({view:"browse"});
ok(has("Browse by class")&&has('data-course'),"browse view renders a class picker");
ok(has('value="C1"')&&has('value="C2"'),"every class with an active test is offered");
ok(html.indexOf('data-test="t2"')<html.indexOf('data-test="t1"'),"browse sorts newest first");
change("C1");
ok(has('data-test="t1"')&&!has('data-test="t2"'),"picking a class filters the list");
ok(has("1 test · newest first"),"browse reports how many are shown");
change("C2"); click({arch:"t2"});
ok(has("Nothing active for C2"),"filtering to a class whose only test is archived is empty, not broken");
ok(has("Archived · 1 test"),"the archive drawer is available in browse too");
click({unarch:"t2"}); change("All");
ok(has('data-test="t1"')&&has('data-test="t2"'),"All shows everything again");
click({view:"home"});
ok(has("Due now"),"switching back to Today works");

// ---- matching game ----
click({home:"1"}); click({practice:"t3"});
ok(has("match me")&&has("data-match=")&&has("0 of 3 matched"),"match card renders a grid");
ok(!has("data-pick"),"a match card has no multiple-choice options");
click({match:"l:0"}); ok(has("tile on"),"tapping a term selects it");
click({match:"l:0"}); ok(!has("tile on"),"tapping it again deselects");
click({match:"l:0"}); click({match:"r:1"});
ok(has("1 wrong try")&&!has("tile on"),"a wrong pair counts a miss and clears the selection");
click({match:"l:0"}); click({match:"r:0"});
ok(has("1 of 3 matched")&&has("tile matched"),"a right pair locks in");
click({match:"l:1"}); click({match:"r:1"});
click({match:"l:2"}); click({match:"r:2"});
ok(has("3 of 3 matched")&&has("Not quite"),"finishing with a miss scores it wrong");
const m=ctx.attempts()[0];
ok(m.answers[0].done&&m.answers[0].misses===1,"match state is recorded on the attempt");
click({next:"1"});

// ---- ordering ----
ok(has("order me")&&has("data-order="),"order card lists the steps");
click({order:"2"}); click({order:"0"});
ok((html.match(/data-unpick=/g)||[]).length===2,"chosen steps stack up in a list");
click({unpick:"0"});
ok((html.match(/data-unpick=/g)||[]).length===1,"tapping a chosen step takes it back");
click({order:"1"}); click({order:"2"});
ok(has("Check"),"Check appears once every step is placed");
click({check:"1"});
ok(has("Correct"),"the right sequence is marked right");
const o0=ctx.attempts()[0];
ok(JSON.stringify(o0.answers[1])==="[0,1,2]","order records the original indexes, not the shuffled ones");
click({next:"1"});
ok(ctx.scoreOf(ctx.attempts()[0])===1,"match wrong, order right, scored 1");
ok(has("wrong tries"),"results describe the match attempt");
ok(has("first \u2192 second \u2192 third"),"results show the sequence");

// a wrong sequence really is wrong
click({home:"1"}); click({practice:"t3"});
click({match:"l:0"}); click({match:"r:0"});
click({match:"l:1"}); click({match:"r:1"});
click({match:"l:2"}); click({match:"r:2"});
ok(has("Correct"),"a clean match scores right");
click({next:"1"});
click({order:"2"}); click({order:"1"}); click({order:"0"}); click({check:"1"});
ok(has("Not quite"),"a reversed sequence is wrong");
click({next:"1"});
ok(ctx.scoreOf(ctx.attempts()[0])===1,"clean match counted, wrong order not");

// ---- records written by older versions must not break a screen ----
// the very first build stored {i,answers,done} with no refs at all
const N=ctx.normalize;
ok(N({i:0,answers:[1],done:false})===null,"a legacy record with no refs is dropped");
ok(N(null)===null&&N("x")===null&&N({refs:[]})===null,"junk records are dropped");
ok(N({refs:["t1:0"]})===null,"refs that are not [testId,index] pairs are dropped");
ok(N({refs:[["gone-test",0]],answers:[null]})===null,"an attempt on a test that no longer exists is dropped");
ok(N({refs:[["t1",0]],answers:[null]})!==null,"an attempt on a test that still exists is kept");
const fixed=N({refs:[["t1",0],["t1",1]],done:true,startedAt:5});
ok(fixed&&fixed.answers.length===2&&fixed.checked.length===2,"missing answers/checked are rebuilt");
ok(fixed.i===0&&fixed.elapsed===0&&fixed.finishedAt===5,"missing index, elapsed and finish time get sane values");
ok(fixed.title==="T1","a missing title falls back to the test's own");
const wild=N({refs:[["t1",0]],i:99,elapsed:"x",mode:"weird",answers:[1,2,3]});
ok(wild.i===0&&wild.elapsed===0&&wild.mode==="practice"&&wild.answers.length===1,
   "out-of-range index, bad elapsed, unknown mode and a mismatched answer array are all repaired");

// and the home screen survives a store that contains one
attempts_push({i:0,answers:[0],done:false});      // straight into the in-memory list
click({home:"1"});
ok(has("Drill")&&has("Due now"),"home still renders with a malformed record present");

// ---- going back mid-test, and restarting ----
click({home:"1"}); click({practice:"t1"});
ok(has('data-back="1" disabled'),"Back is present but disabled on the first card");
ok(has("data-restart-ask"),"Restart is always offered");
click({pick:"1"}); click({next:"1"});           // q0 right, now on q1
click({pick:"0"}); click({check:"1"}); click({next:"1"});   // q1 wrong, now on q2
ok(has("q2")&&!has('data-back="1" disabled'),"Back becomes live once you have moved on");
click({back:"1"});
ok(has("q1")&&has("Not quite"),"Back shows the earlier question with its verdict again");
ok(has("data-jump")&&has("Latest")&&!has('data-fwd="1" disabled'),"Forward and Latest are live while behind");
ok(!has('data-pick="0"><span class="key">A</span>')||has("disabled"),"an answered practice question stays locked");
const snapAns=JSON.stringify(ctx.attempts()[0].answers);
click({pick:"2"});
ok(JSON.stringify(ctx.attempts()[0].answers)===snapAns,"tapping an option on a reviewed question changes nothing");
click({back:"1"});
ok(has("q0")&&has('data-back="1" disabled'),"Back again reaches the first question");
click({jump:"1"});
ok(has("q2"),"Skip returns to the furthest card reached");
ok(!has("data-jump")&&has('data-fwd="1" disabled'),"Forward and Latest go quiet once caught up");

// Next from a revisited card walks forward rather than finishing early
click({back:"1"}); click({next:"1"});
ok(has("q2")&&ctx.view().s==="quiz","Next from a revisited card advances instead of finishing");

// restart asks first, and can be waved off
click({restartAsk:"1"});
ok(has("Start this run over?")&&has("data-restart-do")&&has("data-cancel"),"Restart asks before wiping anything");
ok(has("q2"),"the card stays visible behind the confirmation");
ok((html.match(/class="dock/g)||[]).length===1,"only the confirmation dock is on screen");
click({cancel:"1"});
ok(has("q2")&&ctx.attempts()[0].answers[0]!=null,"Keep going leaves the run untouched");
const schedBefore=JSON.stringify(ctx.sched());
click({restartAsk:"1"}); click({restartDo:"1"});
const r0=ctx.attempts()[0];
ok(r0.i===0&&r0.max===0,"restart returns to the first card");
ok(r0.answers.every(x=>x===null)&&r0.checked.every(x=>x===false),"restart clears every answer");
ok(r0.elapsed===0,"restart resets the clock");
ok(has("q0")&&has('data-back="1" disabled'),"and the screen is back at the start");
ok(ctx.attempts().filter(a=>!a.done&&a.testId==="t1").length===1,"restart reuses the attempt rather than orphaning it");
ok(JSON.stringify(ctx.sched())===schedBefore,"restart leaves the review schedule alone");
click({exit:"1"});
click({resume:ctx.attempts().find(a=>!a.done&&a.testId==="t1").id});
ok(has("q0"),"a restarted run resumes at the start");

// ---- no card may trap you ----
click({home:"1"}); click({practice:"t3"});          // t3 opens on a match card
ok(has("data-match=")&&has(">Skip<"),"an unfinished match card offers a Skip");
click({next:"1"});
ok(has("order me"),"Skip moves past a match card");
ok(has(">Skip<"),"an unfinished order card offers a Skip too");
click({order:"0"});
ok(has(">Skip<"),"still skippable while partly ordered");
click({order:"1"}); click({order:"2"});
ok(!has(">Skip<")&&has("Check"),"the Skip goes away once the card can be answered");
click({check:"1"});
ok(!has(">Skip<"),"and stays away once it is checked");
click({home:"1"}); click({practice:"t1"});
ok(has(">Skip<"),"an unanswered multiple-choice question is skippable");
click({pick:"1"});
ok(!has(">Skip<"),"answering removes the Skip");
click({next:"1"}); click({next:"1"});               // skip q1 outright
ok(has("q2"),"skipping leaves the answer blank and moves on");
click({pick:"3"}); click({next:"1"});
const sk=ctx.attempts()[0];
ok(sk.answers[1]===null,"a skipped question keeps a blank answer");
ok(ctx.scoreOf(sk)===sk.answers.filter((v,i)=>v!==null&&ctx.right(ctx.qOf(sk.refs[i]),v)).length,
   "the score counts only the questions actually answered right");

// a note card never shows a Skip - it already has one button
click({home:"1"}); click({practice:"t2"});
ok(has("A teaching card")&&!has(">Skip<"),"teaching cards have no Skip");

// ---- moving freely in both directions ----
click({home:"1"}); click({practice:"t1"});
click({pick:"1"}); click({next:"1"});
click({pick:"0"}); click({check:"1"}); click({next:"1"});   // now on q2, max 2
click({back:"1"}); click({back:"1"});
ok(has("q0"),"walked back two");
click({fwd:"1"});
ok(has("q1"),"Forward moves one card ahead");
click({fwd:"1"});
ok(has("q2"),"Forward again reaches the frontier");
click({fwd:"1"});
ok(has("q2"),"Forward stops at the furthest card seen, it cannot run ahead");
click({back:"1"}); click({jump:"1"});
ok(has("q2"),"Latest jumps straight to the frontier");

// swipe uses the same two handlers, so the same bounds apply
const swipeL=()=>click({fwd:"1"}), swipeR=()=>click({back:"1"});
swipeR(); swipeR(); ok(has("q0"),"swiping right walks back");
swipeL(); swipeL(); swipeL(); ok(has("q2"),"swiping left walks forward and stops at the frontier");

// ---- controls that outlive their run must not throw ----
click({home:"1"});
ctx.setLive(null);
["back","fwd","jump","check","next","pick","order","unpick","restartAsk","restartDo","cancel"]
  .forEach(k=>click({[k]:"1"}));
ok(ctx.view().s==="home","a stale control with no run behind it lands on Home instead of throwing");
click({att:"does-not-exist"});
ok(ctx.view().s==="home","opening an attempt that is gone falls back to Home");

console.log("\nAll checks passed.");
process.exit(0);  // timers from the app keep node alive
