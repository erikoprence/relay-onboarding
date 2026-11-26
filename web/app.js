(async function(){
  'use strict';
  const D=window.RelayData,C=window.Relay,$=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const fmt=s=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s));
  const fileMode=location.protocol==='file:' || document.documentElement.hasAttribute('data-portable');
  const storeKey='relay.readiness.workspace.v1';
  let accountRole=null, states={}, live=false, busy=false, timer;
  let selected=location.hash.substring(1) || 'ONB-005';
  const P=window.RelayRoles,V=window.RelayRoleView;
  const offlineBase=fileMode?{...D,cases:[...D.cases],evidence:[...D.evidence]}:null;
  let viewRevision=0;
  const briefs={};
  const state=id=>states[id]||C.blank();
  const role=()=>$('role').value;
  function readLocal(){const raw=localStorage.getItem(storeKey);return raw?JSON.parse(raw):{};}
  async function retrieve(){
    const rev=++viewRevision;
    if(fileMode){
      states=readLocal();
      const view=P.scope(offlineBase,P.actor(role()));
      for(const c of view.cases)for(const e of state(c.id).events){const src=P.eventSource(c.id,e);if(src)view.evidence.push(src);}
      Object.assign(D,view);return;
    }
    const response=await fetch('/api/state?role='+encodeURIComponent(role()),{cache:'no-store'});if(!response.ok)throw new Error('Cannot read the workspace.');
    const data=await response.json();if(rev!==viewRevision)return;states=data.cases;live=data.live;Object.assign(D,data.catalog);accountRole=data.accountRole;
    if(accountRole){$('role').value=accountRole;$('role').disabled=true;$('role-label').textContent='Signed in';}
    Object.keys(briefs).forEach(id=>delete briefs[id]);
  }
  function toast(s){$('message').textContent=s;clearTimeout(timer);timer=setTimeout(()=>$('message').textContent='',4500);}
  const demoIntro='Sample workspace · '+(fileMode?'Browser storage':'Local server and SQLite');
  function renderQueue(){
    const q=$('search').value.trim().toLowerCase(), f=$('filter').value;
    const rows=D.cases.filter(c=>{
      const p=state(c.id).phase, origin=$('origin-filter').value||'all';
      if(origin!=='all' && (c.origin||'Starter pack')!==origin)return false;
      return [c.name,c.id,c.project,c.signal].join(' ').toLowerCase().includes(q) &&
        (f==='all'||f==='open'&&p==='open'||f==='done'&&p==='completed'||f==='attention'&&p!=='completed'&&!['Project reference','Progress check'].includes(c.signal));
    }).sort((a,b)=>(a.id==='ONB-005'?-1:b.id==='ONB-005'?1:a.id.localeCompare(b.id)));
    $('total').textContent=rows.length;
    $('queue').innerHTML=rows.map(c=>'<button class="case-item '+(c.id===selected?'active':'')+'" data-case="'+c.id+'" '+(c.id===selected?'aria-current="page"':'')+'><span class="avatar">'+esc(c.name.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join(''))+'</span><span><b>'+esc(c.name)+'</b><small>'+esc(c.project||'Project missing')+' · '+c.id+'</small></span></button>').join('')||'<p class="empty">No matching cases.</p>';
  }
  function briefBody(id){
    const brief=briefs[id]?.brief||C.exampleBrief(id);
    if(!C.sources(id).length)return '<p class="sub">Only a tracker row is available. Request a dated observation from the owner before comparing sources.</p>';
    const mode=briefs[id]?.mode==='live'?'Live local model · citation checks passed':'Saved AI example · generated during preparation';
    const local='<details class="brief-box" id="local-topics"><summary>Find evidence by topic</summary><label class="field">Topic<select id="topic">'+window.RelayClassifier.categories.map(t=>'<option>'+esc(t)+'</option>').join('')+'</select></label><div id="topic-results"></div><p class="sub">A small classifier runs on this device. Check its topic suggestions against the source.</p></details>';
    if(!brief)return '<div class="brief-content"><p class="sub">Inspect the source messages or find related sentences by topic.</p>'+(live?'<button class="secondary" id="generate">Generate a live brief</button>':'')+local+'</div>';
    return '<div class="brief-content"><span class="tag">'+mode+'</span>'+brief.findings.map(f=>'<p><button class="link" data-source="'+esc(f.sourceId)+'">'+esc(f.sourceId)+'</button> &nbsp;“'+esc(f.quote)+'”</p>').join('')+'<p><b>Suggested question</b><br>'+esc(brief.question)+'</p><p class="sub">Compare each quote with its source before using the question.</p>'+(live?'<button class="secondary" id="generate">Generate a live brief</button>':'')+local+'</div>';
  }
  function showTopic(){
    if(!$('topic'))return;
    const matches=window.RelayClassifier.inspect(C.sources(selected)).filter(x=>x.label===$('topic').value);
    $('topic-results').innerHTML=matches.map(x=>'<p><button class="link" data-source="'+esc(x.sourceId)+'">'+esc(x.sourceId)+'</button> &nbsp;“'+esc(x.quote)+'”</p>').join('')||'<p class="empty">No sentence matched this topic with enough evidence. Inspect the full sources.</p>';
  }
  function sourceCards(c){
    const list=C.sources(c.id);
    if(!list.length)return '<p class="empty">This case has a tracker entry only. Ask the owner for corroborating evidence.</p>';
    return '<div class="evidence-grid">'+list.map(e=>'<article class="source" id="src-'+e.id+'" tabindex="-1"><div class="source-meta"><span class="ref">'+e.id+'</span>'+fmt(e.date)+'</div><h3>'+esc(e.author)+'</h3><p>'+esc(e.body)+'</p></article>').join('')+'</div>';
  }
  function decision(c,s){
    if(s.closed)return ['Onboarding closed','The technical owner recorded two independent execution observations. The case history preserves the original disagreement.',''];
    if(s.phase==='completed')return ['Follow-up recorded','The coordinator recorded the owner’s response. The original tracker status is preserved.',''];
    if(s.phase==='open'){
      const eva=C.technical(c), reviewer=role()==='Technical Lead';
      const button=eva?(reviewer?'<button class="primary" id="review">Record technical review</button>':'<button class="secondary" id="switch-role">Switch to Technical Lead</button>'):(reviewer?'<button class="secondary" id="switch-role">Switch to Coordinator</button>':'<button class="primary" id="record">Record follow-up result</button>');
      const waiting=accountRole && ((eva&&!reviewer)||(!eva&&reviewer));
      return [eva?'Technical review requested':'Follow-up in progress',s.task.action+' · Assigned to '+s.task.owner+' · Due '+fmt(s.task.due)+'.',waiting?'':button];
    }
    const btn=role()==='Coordinator'?'<button class="primary" id="request">'+esc(C.technical(c)?c.action:'Assign follow-up')+' <span aria-hidden="true">&nbsp;→</span></button>':'<button class="secondary" id="switch-role">Switch to Coordinator</button>';
    return [C.technical(c)?'Keep onboarding open':c.action,c.reason,accountRole==='Technical Lead'?'':btn];
  }
  function detailRows(c,s){
    const rows=[['Record source',c.origin||'Starter pack'],['Movement',c.movement],['Start date',fmt(c.start)],['Project',c.project||'Unconfirmed'],['Listed manager',c.manager||'Unconfirmed'],['Tracker status',c.status],['Tracker updated',fmt(c.updated)],['Expected readiness','Unconfirmed']];
    const hr=P.last(s,['confirmStart']),checkIn=P.last(s,['checkIn']),plan=P.last(s,['plan']);
    rows.push(['HR start confirmation',hr?'Confirmed':'Awaiting confirmation']);
    if(checkIn)rows.push(['Latest employee check-in',checkIn.status]);
    if(plan)rows.push(['Latest learning plan',plan.text]);
    return rows.map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('');
  }
  function render(){
    if(!C.caseFor(selected))selected=D.cases[0]?.id;
    $('new-case').hidden=fileMode||!P.can(role(),'create');
    renderQueue();
    const c=C.caseFor(selected);
    if(!c){$('detail').innerHTML='<h1>No assigned cases</h1><p>No onboarding cases match this account’s assignments.</p>';return;}
    const s=state(selected),dec=V.caseDecision(c,s,role(),decision(c,s)),list=C.sources(c.id);
    const history=s.events.slice().reverse().map(ev=>'<div class="activity"><small>'+esc(ev.actorName && !ev.actorName.startsWith('demo / ')?ev.actorName+' ('+ev.role+')':ev.role)+' · '+esc(fmt(ev.at))+'</small><p>'+esc(ev.text)+'</p>'+(ev.due?'<small>Follow-up due '+fmt(ev.due)+'</small>':'')+(ev.observations?'<details><summary>Observed execution</summary>'+ev.observations.map(o=>'<p><b>'+esc(o.name)+'</b><br>'+esc(o.observed)+'</p>').join('')+'<p>Technical owner confirmed independent execution and escalation judgment.</p></details>':'')+'</div>').join('');
    const signal=s.closed?'Validated closure':s.phase==='completed'?'Follow-up recorded':c.signal;
    $('detail').innerHTML=V.overview(D.cases,state,role())+'<div class="bread">Workspace <span>/</span> Cases <span>/</span> '+c.id+'</div><div class="titleline"><h1>'+esc(c.name)+'</h1><span class="pill '+(s.phase==='completed'?'ok':'')+'">'+esc(signal)+'</span></div><div class="meta"><b>'+esc(c.project||'Project unconfirmed')+'</b><span>'+esc(c.movement)+'</span><span>Started '+fmt(c.start)+'</span></div>'+
      '<section class="decision"><div class="kicker">'+esc(role()+' workspace')+'</div><h2>'+esc(dec[0])+'</h2><p>'+esc(dec[1])+'</p>'+dec[2]+'</section>'+V.outstanding(s,role())+
      '<section class="panel"><div class="section-head"><h2>Source evidence</h2><span class="tag">'+list.length+' message'+(list.length===1?'':'s')+'</span></div>'+sourceCards(c)+(fileMode||!P.can(role(),'evidence')?'':'<button class="link add-source" id="add-source">+ Add source evidence</button>')+'<details class="brief-box" id="brief"><summary>AI evidence brief</summary><div id="brief-body">'+briefBody(c.id)+'</div></details></section>'+
      '<div class="cols"><section class="panel"><h2>Case record</h2><dl>'+detailRows(c,s)+'</dl></section><section class="panel"><h2>Decision history</h2>'+history+'<div class="activity"><small>Source tracker · '+fmt(c.updated)+'</small><p>'+esc(c.status)+'</p></div></section></div><div class="foot">'+demoIntro+(accountRole?' · Signed in as '+esc(accountRole):' · Demo role switching enabled.')+'</div>';
  }
  function changeCase(id){
    if(!C.caseFor(id))return;selected=id;render();
  }
  const dateField=(value='2026-10-16')=>'<label class="field">Next follow-up date<input type="date" name="due" min="'+D.snapshot+'" value="'+esc(value)+'" required></label>';
  const noteField=label=>'<label class="field">'+label+'<textarea name="note" minlength="10" maxlength="600" required></textarea></label>';
  function modal(type){
    const c=C.caseFor(selected),s=state(c.id),eva=C.technical(c);
    $('modal-label').textContent=c.id+' / '+role();
    let fields,title,go;
    if(Object.hasOwn(V.pages,type)){title=V.pages[type].title;go=V.pages[type].button;fields=V.form(type,c);}
    else if(type==='request'){
      title=eva?'Request technical review':'Assign follow-up';go='Create follow-up';
      fields='<p>'+esc(c.action)+'</p><p class="sub">Responsible role <b>'+esc(c.owner)+'</b></p>'+dateField(c.origin==='Workspace entry'?new Date(Date.now()+2*86400000).toISOString().slice(0,10):undefined);
    }else if(type==='record'){
      title='Record follow-up result';go='Save result';fields=noteField('What did the owner confirm?');
    }else{
      title='Record technical review';go='Save review';
      fields='<label class="field">Review outcome<select name="outcome" id="outcome"><option value="retain">Keep '+esc(c.status)+'</option><option value="close">Validate independent execution and close</option></select></label><div id="review-fields"></div>';
    }
    $('dialog-content').innerHTML='<h2>'+title+'</h2><form id="action-form">'+fields+'<p class="error" role="alert" id="form-error"></p><div class="btn-row"><button class="primary" type="submit">'+go+'</button><button class="secondary" id="cancel" type="button">Cancel</button></div></form>';
    const form=$('action-form'), revision=s.revision;
    function outcomeFields(){
      if($('outcome').value==='retain'){$('review-fields').innerHTML=noteField('Which work still needs support?')+dateField(s.task.due);return;}
      $('review-fields').innerHTML=[1,2].map(i=>'<fieldset><legend>Observed scenario '+i+'</legend><label class="field">Scenario name<input name="name'+i+'" minlength="3" maxlength="80" required></label><label class="field">What did you observe?<textarea name="observed'+i+'" minlength="15" maxlength="600" required></textarea></label></fieldset>').join('')+'<label class="check"><input type="checkbox" name="attested" required>I observed both scenarios and confirm independent execution and appropriate escalation.</label>';
    }
    if(type==='review'){$('outcome').addEventListener('change',outcomeFields);outcomeFields();}
    $('cancel').onclick=()=>$('dialog').close();
    form.onsubmit=async e=>{
      e.preventDefault();if(busy)return;busy=true;
      const button=form.querySelector('[type=submit]');button.disabled=true;
      const values=Object.fromEntries(new FormData(form));
      const cmd={type,role:role(),revision,...values};
      if(type==='confirmStart'){cmd.start=c.start;cmd.movement=c.movement;}
      if(values.outcome==='close'){cmd.observations=[1,2].map(i=>({name:values['name'+i],observed:values['observed'+i]}));cmd.attested=values.attested==='on';}
      try{await apply(c.id,cmd);await retrieve();$('dialog').close();render();toast('Saved to decision history.');}
      catch(err){$('form-error').textContent=err.message;try{await retrieve();render();}catch{}}
      finally{busy=false;button.disabled=false;}
    };
    $('dialog').showModal();
  }
  function entryForm(kind){
    if(fileMode)return;
    const creating=kind==='case',id=selected,revision=state(id).revision,requestId=crypto.randomUUID(),today=new Date().toISOString().slice(0,10);
    const input=(label,name,{type='text',required=true,value='',limit=120}={})=>'<label class="field">'+label+'<input name="'+name+'" type="'+type+'" maxlength="'+limit+'" value="'+esc(value)+'" '+(required?'required':'')+'></label>';
    const selector=(label,name,options)=>'<label class="field">'+label+'<select name="'+name+'">'+options.map(([v,s])=>'<option value="'+esc(v)+'">'+esc(s)+'</option>').join('')+'</select></label>';
    const area=(label,name,max)=>'<label class="field">'+label+'<textarea name="'+name+'" minlength="10" maxlength="'+max+'" required></textarea></label>';
    const fields=creating?
      input('Fictional employee name','name')+input('Start date','start',{type:'date',value:today})+
      selector('Movement','movement',[['New Hire','New hire'],['Reallocation','Reallocation']])+input('Project (optional)','project',{required:false})+
      input('Manager (optional)','manager',{required:false})+input('Tracker status','status',{value:'Pre-Onboarding'})+
      selector('Workflow','reviewKind',[['followup','Coordinator follow-up'],['technical','Technical review of two scenarios']])+
      input('Responsible role','owner',{value:'PMO Coordinator'})+input('Next action','action',{limit:160})+area('Why is this action needed?','reason',600):
      input('Source title','title')+input('Source author or role','author')+input('Source date','date',{type:'date',value:today})+area('Fictional source message','body',2400);
    $('modal-label').textContent=creating?role()+' / Case intake':id+' / Source evidence';
    $('dialog-content').innerHTML='<h2>'+(creating?'New onboarding case':'Add source evidence')+'</h2><form id="entry-form">'+fields+'<p class="error" role="alert" id="entry-error"></p><div class="btn-row"><button class="primary" type="submit">Save '+(creating?'case':'source')+'</button><button class="secondary" type="button" id="cancel-entry">Cancel</button></div></form>';
    const form=$('entry-form');
    if(creating){
      form.elements.reviewKind.onchange=()=>{const tech=form.elements.reviewKind.value==='technical';form.elements.owner.readOnly=tech;form.elements.owner.value=tech?'Technical Lead':'PMO Coordinator';};
    }
    $('cancel-entry').onclick=()=>$('dialog').close();
    form.onsubmit=async event=>{
      event.preventDefault();if(busy)return;busy=true;const button=form.querySelector('[type=submit]');button.disabled=true;
      try{
        const payload={...Object.fromEntries(new FormData(form)),requestId,role:role(),revision};
        const res=await fetch(creating?'/api/cases':'/api/cases/'+id+'/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        const out=await res.json();if(!res.ok)throw new Error(out.error+(res.status===409?' Close this form and reopen the case.':''));
        await retrieve();$('dialog').close();
        if(creating){$('search').value='';$('filter').value='all';$('origin-filter').value='all';selected=out.id;location.hash=out.id;}
        render();toast(creating?'Case saved to the database.':'Source added to case history.');
      }catch(err){$('entry-error').textContent=err.message;try{await retrieve();render();}catch{}}
      finally{button.disabled=false;busy=false;}
    };
    $('dialog').showModal();
  }
  async function apply(id,cmd){
    if(fileMode){
      const change=()=>{const latest=readLocal();latest[id]=C.transition(id,latest[id]||C.blank(),cmd);localStorage.setItem(storeKey,JSON.stringify(latest));states=latest;};
      if(navigator.locks)await navigator.locks.request(storeKey,change);else change();return;
    }
    const result=await fetch('/api/cases/'+id+'/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cmd)});
    const body=await result.json();if(!result.ok)throw new Error(body.error);states[id]=body;
  }
  $('queue').onclick=e=>{const id=e.target.closest('[data-case]')?.dataset.case;if(id){location.hash=id;changeCase(id);}};
  window.addEventListener('hashchange',()=>changeCase(location.hash.substring(1)));
  window.addEventListener('storage',async e=>{if(fileMode&&e.key===storeKey){await retrieve();render();}});
  $('new-case').onclick=()=>entryForm('case');
  $('origin-filter').onchange=renderQueue;
  async function switchView(){
    $('queue').innerHTML='';$('detail').innerHTML='<p>Loading workspace…</p>';$('new-case').hidden=true;
    try{await retrieve();render();}catch{$('detail').innerHTML='<p>Unable to load this workspace. Refresh to retry.</p>';}
  }
  $('role').onchange=switchView;$('search').oninput=renderQueue;$('filter').onchange=renderQueue;
  $('detail').addEventListener('change',e=>{if(e.target.id==='topic')showTopic();});
  $('detail').addEventListener('toggle',e=>{if(e.target.id==='local-topics'&&e.target.open)showTopic();},true);
  $('dismiss').onclick=()=>$('dialog').close();
  $('detail').onclick=async e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.jump){location.hash=b.dataset.jump;changeCase(b.dataset.jump);return;}
    if(b.dataset.roleAction){modal(b.dataset.roleAction);return;}
    if(b.id==='add-source'){entryForm('evidence');return;}
    if(['request','review','record'].includes(b.id)){modal(b.id);return;}
    if(b.id==='switch-role'){$('role').value=role()==='Coordinator'?'Technical Lead':'Coordinator';await switchView();return;}
    if(b.dataset.source){const src=$('src-'+b.dataset.source);src?.focus();src?.classList.add('flash');setTimeout(()=>src?.classList.remove('flash'),1600);return;}
    if(b.id==='generate'){
      const id=selected;b.disabled=true;b.textContent='Reading source messages…';
      try{const response=await fetch('/api/cases/'+id+'/brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:role()})});const out=await response.json();if(!response.ok)throw new Error(out.error);briefs[id]={mode:'live',brief:C.validateBrief(id,out.brief)};if(selected===id)$('brief-body').innerHTML=briefBody(id);}
      catch(err){toast(err.message);}
      finally{b.disabled=false;b.textContent='Generate a live brief';}
    }
  };
  try{await retrieve();render();}catch{$('detail').innerHTML='<h1>Workspace unavailable</h1><p>Start the local server, or open Relay-Demo.html in a browser with local storage enabled.</p>';}
})();
