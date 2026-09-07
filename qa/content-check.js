// Content check for Drill tests. Run: node content-check.js [path/to/drill.html]
const fs=require("fs");
const file=process.argv[2]||"drill.html";
const html=fs.readFileSync(file,"utf8");
const src=html.slice(html.indexOf("<script>"),html.lastIndexOf("</script>"));
const a=src.indexOf("const IMG="), b=src.indexOf("\n];",src.indexOf("const TESTS"))+3;
eval(src.slice(a,b).replace(/^const /gm,"var "));

const issues=[], warn=[], tagUse={}, ids=new Set();
// The readability budget became a rule on 2026-09-01. Tests authored from then on must meet it;
// older ones report as a backlog so the check stays useful instead of permanently red.
const RULE_FROM=Date.parse("2026-09-01T00:00:00Z");
const overBudget={};
let BOUND=false, TEST="";
const budget=(msg,hard)=>{
  overBudget[TEST]=(overBudget[TEST]||0)+1;
  (BOUND&&hard?issues:warn).push(msg+(BOUND?"":" [pre-rule]"));
};
const kindOf=q=>q.type||(q.options?"mc":"note");
for(const t of TESTS){
  if(ids.has(t.id)) issues.push("duplicate test id "+t.id);
  ids.add(t.id);
  for(const f of ["title","course","created","about"]) if(!t[f]) issues.push(t.id+" missing "+f);
  if(isNaN(Date.parse(t.created))) issues.push(t.id+" unparseable created date");
  BOUND = !isNaN(Date.parse(t.created)) && Date.parse(t.created)>=RULE_FROM;
  TEST = t.id;
  const stems=new Set();
  t.questions.forEach((q,i)=>{
    const k=kindOf(q), at=t.id+" #"+i;
    if(q.img&&!q.alt) issues.push(at+" image without alt text");
    if(q.img&&!/^data:image\/(?:webp|png|jpeg|gif);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(q.img)) issues.push(at+" image is not a complete base64 image data URL");
    if(k==="note"){ if(!q.title||!q.body) issues.push(at+" teaching card missing title or body"); return; }
    if(!q.q) issues.push(at+" no stem");
    if(!q.why) issues.push(at+" no explanation");
    if(q.why){
      const keep=q.why.split("\n")[0].trim(), kw=keep.split(/\s+/).length;
      if(kw>22) budget(at+" keeper line is "+kw+" words — limit is 22",true);
      else if(kw>15) budget(at+" keeper line is "+kw+" words, aim for 15");
      if(/;/.test(keep)) budget(at+" keeper line has a semicolon — split it or cut it");
      if(!q.why.includes("\n")&&q.why.split(/\s+/).length>26)
        budget(at+" explanation is one long block — split it into a keeper line and detail",true);
      if(q.q&&keep.toLowerCase().startsWith(q.q.toLowerCase().slice(0,18)))
        budget(at+" keeper line restates the stem");
    }
    if(!(q.tags||[]).length) issues.push(at+" no tags");
    (q.tags||[]).forEach(g=>{ tagUse[g]=(tagUse[g]||0)+1; if(g!==g.trim()) issues.push(at+" tag has stray whitespace"); });
    if(q.q){
      if(stems.has(q.q)) issues.push(at+" duplicate stem");
      stems.add(q.q);
      const w=q.q.split(/\s+/).length;
      if(w>28) budget(at+" stem is "+w+" words — limit is 28",true);
      else if(w>20) budget(at+" stem is "+w+" words, aim for 20");
      if((q.q.match(/,/g)||[]).length>=3) budget(at+" stem has 3+ commas — probably one clause too many");
      const jargon=(q.q+" "+q.options?.join(" ")).match(/\b(heterogen\w+|endogen\w+|exogen\w+|orthogonal|ceteris paribus|intertemporal|stochastic)\b/i);
      if(jargon) budget(at+' uses "'+jargon[0]+'" — say it in plain words');
    }
    if(/according to the authors|the article states|the lecture says/i.test(q.q||""))
      warn.push(at+" asks about the reading rather than the idea");
    if(k==="mc"){
      if(!Array.isArray(q.options)||q.options.length<2) return issues.push(at+" bad options");
      if(new Set(q.options).size!==q.options.length) issues.push(at+" duplicate option text");
      const c=Array.isArray(q.correct)?q.correct:[q.correct];
      c.forEach(x=>{ if(!Number.isInteger(x)||x<0||x>=q.options.length) issues.push(at+" correct index out of range"); });
      if(Array.isArray(q.correct)&&new Set(q.correct).size!==q.correct.length) issues.push(at+" duplicate correct index");
      if(q.options.some(o=>/all of the above|none of the above/i.test(o))) issues.push(at+" throwaway option");
      const ow=q.options.map(o=>o.split(/\s+/).length), longest=Math.max(...ow);
      if(longest>16) budget(at+" an option runs "+longest+" words — limit is 16",true);
      else if(longest>12) budget(at+" longest option is "+longest+" words, aim for 12");
      if(ow.reduce((x,y)=>x+y,0)>44) budget(at+" the options total "+ow.reduce((x,y)=>x+y,0)+" words — a wall to read");
      // a systematically longer or shorter right answer is a tell
      const L=q.options.map(o=>o.length), avgOthers=(s,idx)=>{
        const rest=L.filter((_,k)=>k!==idx); return rest.reduce((x,y)=>x+y,0)/rest.length; };
      if(!Array.isArray(q.correct)){
        const r=L[q.correct]/avgOthers(L,q.correct);
        if(r>1.6||r<0.55) warn.push(at+" correct answer is "+(r>1?"much longer":"much shorter")+" than the others");
      } else {
        const odd=[...q.options.keys()].find(i=>!q.correct.includes(i));
        if(odd!=null){ const r=L[odd]/avgOthers(L,odd);
          if(r>1.6||r<0.55) warn.push(at+" the odd-one-out stands out by length"); }
      }
    }
    if(k==="match"){
      if(!Array.isArray(q.pairs)||q.pairs.length<3) return issues.push(at+" match needs at least 3 pairs");
      const l=q.pairs.map(p=>p[0]), r=q.pairs.map(p=>p[1]);
      if(new Set(l).size!==l.length) issues.push(at+" duplicate term on the left");
      if(new Set(r).size!==r.length) issues.push(at+" duplicate term on the right");
      if(q.pairs.some(p=>p[0].length>40||p[1].length>52)) warn.push(at+" match tiles will be cramped");
    }
    if(k==="order"){
      if(!Array.isArray(q.items)||q.items.length<3) return issues.push(at+" order needs at least 3 steps");
      if(new Set(q.items).size!==q.items.length) issues.push(at+" duplicate step");
    }
  });
  const pos={}; let n=0;
  t.questions.filter(q=>q.options&&!Array.isArray(q.correct)).forEach(q=>{pos[q.correct]=(pos[q.correct]||0)+1;n++;});
  if(n>=8){ const worst=Math.max(...Object.values(pos));
    if(worst/n>0.45) issues.push(t.id+": "+Math.round(worst/n*100)+"% of answers sit in one slot"); }
}
Object.entries(tagUse).filter(([,n])=>n===1).forEach(([g])=>warn.push('tag used only once: "'+g+'"'));

console.log(TESTS.length+" tests, "+TESTS.reduce((n,t)=>n+t.questions.length,0)+" cards, "+Object.keys(tagUse).length+" tags");
const backlog=Object.entries(overBudget).filter(([id])=>{
  const t=TESTS.find(x=>x.id===id);
  return !(t&&!isNaN(Date.parse(t.created))&&Date.parse(t.created)>=RULE_FROM);
});
if(backlog.length) console.log("\nreadability backlog (written before the rule):\n - "
  +backlog.map(([id,n])=>id+": "+n+" finding"+(n===1?"":"s")).join("\n - ")
  +"\n   these do not fail the check; rewrite them when you next touch that course.");
if(warn.length) console.log("\nworth a look:\n - "+warn.join("\n - "));
if(issues.length){ console.log("\nPROBLEMS:\n - "+issues.join("\n - ")); process.exit(1); }
console.log("\nno problems found.");
