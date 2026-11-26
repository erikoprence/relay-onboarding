(function(root){
  const P=root.RelayRoles;
  const escape=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const pages={
    confirmStart:{title:'Confirm start or movement',button:'Confirm start',lead:c=>'Confirm '+c.name+'’s '+c.movement.toLowerCase()+' with the recorded start date of '+c.start+'.'},
    checkIn:{title:'Employee check-in',button:'Submit check-in',options:['On track','Need support','Blocked'],note:'What can you do independently, or where do you need help?'},
    blocker:{title:'Record a practical blocker',button:'Log blocker',owner:true,due:true,note:'What is blocking work, and what would resolve it?'},
    resolveBlocker:{title:'Resolve practical blocker',button:'Record resolution',note:'What changed, and how was the resolution confirmed?'},
    intervene:{title:'Request management intervention',button:'Assign intervention',owner:true,due:true,note:'What decision or support does this case need?'},
    resolveIntervention:{title:'Complete intervention',button:'Record outcome',note:'What action was taken and what was the outcome?'},
    plan:{title:'Plan knowledge transfer',button:'Save learning activity',due:true,note:'Which activity will the employee practise, and how will it be observed?'}
  };
  const btn=(type,label=pages[type].button)=>'<button type="button" class="secondary" data-role-action="'+type+'">'+escape(label)+'</button>';
  const field=(label,control)=>'<label class="field">'+label+control+'</label>';
  function form(type,c){
    const p=pages[type],opts=values=>values.map(v=>'<option>'+escape(v)+'</option>').join('');
    const defaultDate=new Date(Math.max(Date.now(),Date.parse(c.start))+2*86400000).toISOString().slice(0,10);
    return (p.lead?'<p>'+escape(p.lead(c))+'</p>':'')+
      (p.options?field('Current progress','<select name="status">'+opts(p.options)+'</select>'):'')+
      (p.note?field(p.note,'<textarea name="note" minlength="10" maxlength="600" required></textarea>'):'')+
      (p.owner?field('Accountable role','<select name="owner">'+opts(['Coordinator','Technical Lead','HR',...(c.manager?['Line Manager']:[])])+'</select>'):'')+
      (p.due?field('Target date','<input type="date" name="due" min="2026-10-14" value="'+defaultDate+'" required>'):'');
  }
  function caseDecision(c,s,role,base){
    const last=(types)=>P.last(s,types),block=P.open(s,'blocker'),inter=P.open(s,'intervene');
    if(role==='HR'){
      const confirmation=last(['confirmStart']);
      return [confirmation?'Start record confirmed':'Confirm the start record',c.name+' · '+c.movement+' · '+c.start+' · Listed manager: '+(c.manager||'unconfirmed')+'.',confirmation?'':btn('confirmStart')];
    }
    if(role==='Employee'){
      const recent=last(['checkIn']);
      return ['My onboarding', (s.closed?'Technical readiness validated. ':'Current tracker status: '+c.status+'. ')+(s.task&&s.phase==='open'?'Next: '+s.task.action+' ('+s.task.owner+', due '+s.task.due+'). ':'Next: '+c.action+'. ')+(recent?'Latest check-in: '+recent.status+'.':'Your check-in goes to the case history.'),btn('checkIn')];
    }
    if(role==='Line Manager')return [block?'Practical blocker open':'Local progress',block?block.text+' Owner: '+block.owner+'. Due '+block.due+'.':c.reason,block?'':btn('blocker')];
    if(role==='Management')return [inter?'Intervention assigned':'Review case risk',inter?inter.text+' Owner: '+inter.owner+'. Due '+inter.due+'.':c.reason,inter?'':btn('intervene')];
    if(role==='Technical Lead' && !s.closed)return [base[0],base[1],base[2]+' '+btn('plan')];
    return base;
  }
  function outstanding(s,role){
    let html='';
    for(const [key,end,title] of [['blocker','resolveBlocker','Practical blocker'],['intervene','resolveIntervention','Management intervention']]){
      const e=P.open(s,key);if(!e)continue;
      const accountable=key==='blocker'?'Line Manager':'Management';
      const allowed=P.can(role,end)&&[e.owner,accountable,'Coordinator'].includes(role);
      html+='<section class="panel role-item"><h2>'+title+'</h2><p>'+escape(e.text)+'</p><p class="sub">'+escape(e.owner)+' · Due '+escape(e.due)+'</p>'+(allowed?btn(end):'')+'</section>';
    }
    return html;
  }
  function risk(c,s){
    if(P.open(s,'intervene'))return 'Intervention open';
    if(P.open(s,'blocker'))return 'Practical blocker';
    if(s.closed||s.phase==='completed')return '';
    if(P.last(s,['checkIn'])?.status==='Blocked')return 'Employee reports a blocker';
    if(s.phase==='open')return 'Follow-up open';
    return ['Access blocker','Conflicting evidence','Stale update','Unspecified blocker'].includes(c.signal)?c.signal:'';
  }
  function overview(cases,state,role){
    if(role==='HR'){
      const pending=cases.filter(c=>!P.last(state(c.id),['confirmStart']));
      return '<section class="panel portfolio"><div class="section-head"><h2>Start confirmations</h2><span class="tag">'+(cases.length-pending.length)+' of '+cases.length+' confirmed</span></div>'+
        (pending.length?'<details><summary>Awaiting HR confirmation ('+pending.length+')</summary><div class="risk-list">'+pending.map(c=>'<button class="link" data-jump="'+escape(c.id)+'">'+escape(c.name)+' · '+escape(c.start)+'</button>').join('')+'</div></details>':'<p class="sub">All recorded starts have been confirmed.</p>')+'</section>';
    }
    if(role!=='Management')return '';
    const flagged=cases.map(c=>({c,why:risk(c,state(c.id))})).filter(item=>item.why);
    return '<section class="panel portfolio"><div class="section-head"><h2>Portfolio risk</h2><span class="tag">'+flagged.length+' of '+cases.length+' cases</span></div>'+
      (flagged.length?'<details><summary>Cases needing attention</summary><div class="risk-list">'+flagged.map(({c,why})=>'<button class="link" data-jump="'+escape(c.id)+'">'+escape(c.name)+' · '+escape(why)+'</button>').join('')+'</div></details>':'<p class="sub">No cases currently flagged.</p>')+'</section>';
  }
  root.RelayRoleView={pages,form,caseDecision,outstanding,overview};
})(globalThis);
