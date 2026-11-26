(function(root){
  const accounts=[
    ['Coordinator','coordinator','RELAY_COORDINATOR_KEY','PMO / Coordinator'],
    ['Technical Lead','technical-lead','RELAY_TECH_LEAD_KEY','Technical Manager / Lead'],
    ['HR','hr','RELAY_HR_KEY','HR'],
    ['Employee','employee','RELAY_EMPLOYEE_KEY','Employee'],
    ['Line Manager','line-manager','RELAY_LINE_MANAGER_KEY','Line Manager'],
    ['Management','management','RELAY_MANAGEMENT_KEY','Management']
  ].map(([role,username,key,label])=>({role,username,key,label}));
  const grants={
    'Coordinator':['create','evidence','request','record','resolveBlocker','resolveIntervention','brief'],
    'Technical Lead':['evidence','review','plan','resolveBlocker','resolveIntervention','brief'],
    'HR':['create','confirmStart','resolveBlocker','resolveIntervention','brief'],
    'Employee':['checkIn','brief'],
    'Line Manager':['blocker','resolveBlocker','resolveIntervention','brief'],
    'Management':['intervene','resolveIntervention','brief']
  };
  function can(role,action){return Object.hasOwn(grants,role)&&grants[role].includes(action);}
  function actor(role,bindings={}){
    return {role,caseId:bindings.caseId??'ONB-005',managerName:bindings.managerName??'Luca Gray',project:bindings.project??null};
  }
  function sees(person,c){
    if(!person||!c||!Object.hasOwn(grants,person.role))return false;
    if(person.role==='Employee')return c.id===person.caseId;
    if(person.role==='Line Manager')return Boolean(person.managerName)&&c.manager===person.managerName;
    if(person.role==='Technical Lead' && person.project)return c.project===person.project;
    return true;
  }
  function scope(data,person){
    const cases=data.cases.filter(c=>sees(person,c)),ids=new Set(cases.map(c=>c.id));
    return {snapshot:data.snapshot,cases,evidence:data.evidence.filter(e=>ids.has(e.caseId)),
      briefs:Object.fromEntries(Object.entries(data.briefs).filter(([suffix])=>ids.has('ONB-'+suffix)))};
  }
  function last(s,types){return s.events.slice().reverse().find(e=>types.includes(e.type));}
  function open(s,kind){
    const end=kind==='blocker'?'resolveBlocker':'resolveIntervention',event=last(s,[kind,end]);return event?.type===kind?event:null;
  }
  const sourceTitles={checkIn:'Employee check-in',blocker:'Practical blocker',resolveBlocker:'Blocker resolution',plan:'Knowledge-transfer plan'};
  function eventSource(id,event){
    const title=sourceTitles[event.type];if(!title||!event.sourceId)return null;
    return {id:event.sourceId,caseId:id,title,author:event.role,date:event.at.slice(0,10),body:event.text,origin:'Workspace entry'};
  }
  const api={accounts,can,actor,sees,scope,last,open,sourceTitles,eventSource};
  root.RelayRoles=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
