(function(root){
  function forCatalog(D){
  const policy=root.RelayRoles || require('./roles.js');
  const caseFor=id=>D.cases.find(c=>c.id===id);
  const sources=id=>D.evidence.filter(e=>e.caseId===id);
  const technical=c=>c.reviewKind==='technical'||(!c.reviewKind&&c.id==='ONB-005');
  const blank=()=>({revision:0,phase:'unopened',events:[],task:null,closed:false});
  const requireThat=(ok,message)=>{if(!ok)throw new Error(message);};
  function note(text,min=10,max=600){
    requireThat(typeof text==='string' && text.trim().length>=min && text.trim().length<=max,'Enter an observation of '+min+'–'+max+' characters.');
    return text.trim();
  }
  function date(value){
    requireThat(typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value && value>=D.snapshot,'Choose a valid follow-up date on or after 14 Oct 2026.');
    return value;
  }
  function transition(id,state,cmd,instant=new Date().toISOString()){
    const c=caseFor(id);
    requireThat(c && cmd && policy.can(cmd.role,cmd.type),'This role cannot perform the selected action.');
    requireThat(cmd.revision===state.revision,'This case has changed. Refresh and review its latest entry.');
    const s=JSON.parse(JSON.stringify(state));
    const event={at:instant,role:cmd.role,type:cmd.type};
    if(cmd.actorName)event.actorName=cmd.actorName;
    if(cmd.type==='request'){
      requireThat(cmd.role==='Coordinator' && s.phase==='unopened','Only the coordinator can open a new follow-up.');
      s.task={owner:c.owner,action:c.action,due:date(cmd.due)};
      s.phase='open';
      event.text=c.action+' assigned to '+c.owner+'.';event.due=s.task.due;
    } else if(cmd.type==='review'){
      requireThat(technical(c) && cmd.role==='Technical Lead' && s.phase==='open','An open technical review and the Technical Lead role are required.');
      requireThat(cmd.outcome==='retain' || cmd.outcome==='close','Choose a review outcome.');
      event.outcome=cmd.outcome;
      if(cmd.outcome==='close'){
        requireThat(!policy.open(s,'blocker'),'Resolve the open practical blocker before signing off.');
        requireThat(Array.isArray(cmd.observations) && cmd.observations.length===2,'Record both observed scenarios.');
        event.observations=cmd.observations.map(o=>({name:note(o.name,3,80),observed:note(o.observed,15,600)}));
        const normalize=x=>x.toLowerCase().replace(/\s+/g,' ').trim();
        requireThat(normalize(event.observations[0].name)!==normalize(event.observations[1].name) && normalize(event.observations[0].observed)!==normalize(event.observations[1].observed),'Describe two distinct scenarios and observations.');
        requireThat(cmd.attested===true,'The technical lead must confirm independent execution and escalation judgment.');
        event.text='Technical owner validated independent execution and closed onboarding.';
        event.attested=true;s.closed=true;s.phase='completed';
      }else{
        event.text=note(cmd.note); s.task.due=date(cmd.due);event.due=s.task.due;
      }
    } else if(cmd.type==='record'){
      requireThat(!technical(c) && cmd.role==='Coordinator' && s.phase==='open','An open follow-up and the Coordinator role are required.');
      event.text=note(cmd.note); s.phase='completed';
    } else if(cmd.type==='confirmStart'){
      requireThat(!policy.last(s,['confirmStart']),'HR has already confirmed the start record.');
      requireThat(cmd.start===c.start&&cmd.movement===c.movement,'Review the current start date and movement before confirming.');
      event.text='HR confirmed '+c.movement+' on '+c.start+'.';event.start=c.start;event.movement=c.movement;
    } else if(cmd.type==='checkIn'){
      requireThat(['On track','Need support','Blocked'].includes(cmd.status),'Choose a check-in status.');
      event.status=cmd.status;event.text=cmd.status+' — '+note(cmd.note);
    } else if(cmd.type==='plan'){
      requireThat(!s.closed,'This onboarding case is closed.');
      event.due=date(cmd.due);event.text='Learning activity: '+note(cmd.note)+' Target date: '+event.due+'.';
    } else if(cmd.type==='blocker'||cmd.type==='intervene'){
      requireThat(!policy.open(s,cmd.type),'This case already has an open item of this type.');
      requireThat(['Coordinator','Technical Lead','HR','Line Manager'].includes(cmd.owner),'Choose an accountable role.');
      requireThat(cmd.owner!=='Line Manager'||Boolean(c.manager),'Assign a role that has access to this case.');
      event.owner=cmd.owner;event.due=date(cmd.due);event.text=note(cmd.note);
      if(cmd.type==='blocker'&&s.phase==='completed'){s.closed=false;s.phase='unopened';s.task=null;}
    } else if(cmd.type==='resolveBlocker'||cmd.type==='resolveIntervention'){
      const blocker=cmd.type==='resolveBlocker',item=policy.open(s,blocker?'blocker':'intervene');
      requireThat(item,'There is no open item to resolve.');
      requireThat(cmd.role===item.owner||cmd.role===(blocker?'Line Manager':'Management')||cmd.role==='Coordinator','The assigned role or accountable manager must record the resolution.');
      event.text=note(cmd.note);event.owner=item.owner;
    } else throw new Error('Unknown action.');
    if(policy.sourceTitles[cmd.type]){
      event.sourceId='A-'+id+'-'+(s.revision+1);
      if(cmd.type==='checkIn'&&cmd.status!=='On track'&&s.phase==='completed'){s.closed=false;s.phase='unopened';s.task=null;}
    }
    s.revision++;s.events.push(event);return s;
  }
  function validateBrief(id,brief){
    const refs=sources(id);
    requireThat(refs.length && brief && Array.isArray(brief.findings) && brief.findings.length===refs.length,'A finding is required for each supplied source.');
    const ids=new Set();
    const findings=brief.findings.map(f=>{
      const e=refs.find(x=>x.id===f.sourceId);
      requireThat(e && !ids.has(e.id) && typeof f.quote==='string' && f.quote.trim().length>=10 && e.body.includes(f.quote),'The brief contains unsupported evidence.');
      ids.add(e.id);return {sourceId:e.id,quote:f.quote};
    });
    const question=note(brief.question,8,240);
    requireThat(question.endsWith('?'),'The follow-up must be a question.');
    return {findings,question};
  }
  function exampleBrief(id){
    const rows=D.briefs[id.slice(4)];
    if(!rows || rows.length-1!==sources(id).length)return null;
    return validateBrief(id,{findings:rows.slice(0,-1).map(([sourceId,quote])=>({sourceId,quote})),question:rows.at(-1)});
  }
  return {caseFor,sources,blank,transition,validateBrief,exampleBrief,technical,forCatalog};
  }
  const api=forCatalog(root.RelayData || require('./data.js'));
  root.Relay=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
