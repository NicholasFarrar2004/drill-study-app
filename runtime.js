/* The only host-specific boundary. SQLite persists across browsers and restarts. */
window.DrillRuntime = (() => {
  let state, queue=Promise.resolve(), failed=false, pending=0;
  const copy=x=>JSON.parse(JSON.stringify(x));
  const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
  async function request(path,body){
    const r=await fetch(path,{cache:'no-store', ...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const d=await r.json(); if(!r.ok) throw Error(d.error||'Could not save'); return d;
  }
  function download(data,filename='drill-state.json'){
    const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=u;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);
  }
  function fail(e){
    failed=true;
    let panel=document.getElementById('storage-error');if(panel)return;
    panel=document.createElement('div');panel.id='storage-error';panel.setAttribute('role','alertdialog');panel.setAttribute('aria-label','Study data needs attention');
    panel.style.cssText='position:fixed;inset:0;z-index:99999;background:var(--surface,#fff);color:var(--ink,#151821);padding:32px;overflow:auto';
    const title=document.createElement('h2');title.textContent='Your progress needs attention';
    const msg=document.createElement('p');msg.textContent=e.message+' Your previously saved data is safe. Save your current work before reloading.';
    const save=document.createElement('button');save.className='btn';save.textContent='Save recovery file';
    save.onclick=()=>download({app:'Drill',schemaVersion:2,documents:state?.documents||{},study:window.drillStudyExport?.()},'drill-recovery.json');
    const reload=document.createElement('button');reload.className='btn';reload.textContent='Reload saved progress';reload.onclick=()=>location.reload();
    panel.append(title,msg,save,reload);document.body.append(panel);
  }
  const snapshot=value=>({exists:value!==undefined,data:()=>freeze(copy(value))});
  function write(path,value,del=false){
    if(failed)return Promise.resolve();
    const frozen=del?undefined:copy(value);
    if(del)delete state.documents[path];else state.documents[path]=frozen;
    pending++;
    queue=queue.then(async()=>{
      if(failed)return;
      const result=await request('/api/write',{revision:state.revision,path,value:frozen,delete:del});state.revision=result.revision;
    }).catch(fail).finally(()=>pending--);
    return queue;
  }
  const db={doc:path=>({get:async()=>snapshot(state.documents[path]),set:value=>write(path,value),delete:()=>write(path,null,true)}),
    collection:prefix=>{const q={orderBy:()=>q,limit:()=>q,get:async()=>({docs:Object.entries(state.documents).filter(([k])=>k.startsWith(prefix+'/')).map(([,v])=>v).sort((a,b)=>(b.startedAt||0)-(a.startedAt||0)).map(snapshot)})};return q;}};
  async function connect(){state=await request('/api/state');return db;}
  async function save(study){await queue;if(failed)throw Error('Save needs attention');download({app:'Drill',schemaVersion:2,exportedAt:new Date().toISOString(),documents:copy(state.documents),study});}
  async function restore(file){
    try{await queue;const data=JSON.parse(await file.text());await request('/api/import',data);location.reload();}
    catch(e){alert('Import did not change your study data. '+e.message);}
  }
  window.addEventListener('beforeunload',e=>{if(pending){e.preventDefault();e.returnValue='';}});
  return {connect,save,restore,fail,flush:()=>queue};
})();
