/* The fixed reference date preserves the meaning of "stale" in the October case file. */
(function (root) {
  const snapshot = '2026-10-14';
  const rows = [
    ['001','Mila Rowan','2026-10-05','New Hire','Aurora','Jon Vale','Shadowing','2026-10-13','Progress check','Request a supported-execution observation','Technical Lead','Shadowing records observation only. Ask the lead to watch Mila perform one agreed task.'],
    ['002','Leo Marin','2026-10-07','Reallocation','Nimbus','Sara Neri','Access Pending','2026-10-14','Access blocker','Follow up on two missing accounts','Access Support','Orion awaits owner approval and Helix awaits provisioning. Ask Leo to confirm that he can sign in to the active VPN.'],
    ['003','Nora Venn','2026-09-28','New Hire',null,'Tomas Reed','On Track','2026-09-30','Missing details','Confirm the project assignment','PMO Coordinator','The tracker has no project and its last update is 14 days old. Confirm the assignment before planning training.'],
    ['004','Aron Bell','2026-10-01','Reallocation','Helios',null,'KT Started','2026-10-11','Missing details','Identify the accountable manager','PMO Coordinator','Training has started, but the tracker has no manager. Ask the coordinator to identify the manager and technical owner.'],
    ['005','Eva Stone','2026-09-21','New Hire','Orion','Luca Gray','Ready with Support','2026-10-13','Conflicting evidence','Request technical review','Technical Lead','Keep Eva at Ready with Support. Her lead identifies two outstanding scenarios. Ask the technical lead to observe and record how she handles each one.'],
    ['006','Noah Lane','2026-10-12','New Hire','Atlas','Maya Ford','Pre-Onboarding','2026-10-12','Project reference','Confirm the first learning activity','KT Owner','The Atlas owner supplied an approved folder. Confirm Noah can access it and agree the first learning activity.'],
    ['007','Iris Moon','2026-09-15','Reallocation','Nova','Rita Cole','On Track','2026-09-20','Stale update','Refresh access and shadowing evidence','Line Manager','The last update is 24 days old. Access was expected the following week. Ask for an actual sign-in result and a dated training update.'],
    ['008','Theo Park','2026-10-03','New Hire','Pulse','Mark Hale','Blocked','2026-10-14','Unspecified blocker','Identify the blocker and its owner','Line Manager','The tracker says Blocked. The cause, owner and recovery date are missing. Ask the manager to establish all three.'],
    ['009','Lina West','2026-10-06','Reallocation',null,'Nina Cross','KT Started','2026-10-09','Missing details','Follow up on the unanswered request','Technical Manager','The tracker has no project. The coordinator still needs an exact role, knowledge-transfer owner and expected readiness date.'],
    ['010','Owen Hart','2026-09-29','New Hire','Vega','Alex North','Partially Ready','2026-10-14','Review needed','Schedule an observed readiness review','Technical Lead','Owen reports working alone on standard activities. Ask the lead to observe exceptions and production changes and set a review date.']
  ];
  const cases = rows.map(([number,name,start,movement,project,manager,status,updated,signal,action,owner,reason]) =>
    ({id:'ONB-'+number,name,start,movement,project,manager,status,updated,signal,action,owner,reason}));
  const evidence = [
    ['E1','002','Access request','Project Manager','2026-10-07','Please create Leo\'s Nova VPN, Orion Portal and Helix Service Desk accounts before his project start. Project code: NIM-482.'],
    ['E2','002','Delayed account','Access Support','2026-10-14','Nova VPN is active. Orion Portal is still awaiting application-owner approval. Helix Service Desk has not yet been provisioned.'],
    ['E3','005','Weekly KT update','Technical Lead','2026-10-13','Eva completed the first training topics and can handle standard requests with occasional support. Two complex scenarios still need to be covered. The Technical Lead classifies her as Ready with Support.'],
    ['E4','005','Conflicting progress update','Line Manager','2026-10-13','From the local side everything looks complete and Eva is working independently. The Line Manager considers onboarding closed.'],
    ['E5','009','Unanswered request','PMO Coordinator','2026-10-08','Request to confirm Lina\'s exact project role, assigned KT owner and expected readiness date. No response recorded as of 14 Oct 2026.'],
    ['E6','010','Employee check-in','Employee','2026-10-14','I can complete the daily standard activities alone, but I still need help for exceptions and production changes. All tools are available. I have not yet received a date for the final readiness review.'],
    ['E7','007','Stale tracker note','Tracker note','2026-09-20','Shadowing started; access expected next week. No later tracker update exists.'],
    ['E8','006','Documentation location','KT Owner','2026-10-11','Training guide and runbook are available in /Team/Operations/Onboarding. The documents are project-owned and should not be copied outside that location. Keep only the folder reference in a central onboarding index.']
  ].map(([id,num,title,author,date,body])=>({id,caseId:'ONB-'+num,title,author,date,body}));
  // LLM-authored demonstration outputs. Every quotation is checked again before display.
  const briefs = {
    '002':[['E1',"Please create Leo's Nova VPN, Orion Portal and Helix Service Desk accounts before his project start."],['E2','Orion Portal is still awaiting application-owner approval. Helix Service Desk has not yet been provisioned.'],'Who can approve Orion, provision Helix and confirm a successful sign-in?'],
    '005':[['E3','Two complex scenarios still need to be covered.'],['E4','The Line Manager considers onboarding closed.'],'What did Eva do independently in each of the two outstanding scenarios?'],
    '006':[['E8','Keep only the folder reference in a central onboarding index.'],'Can Noah open the approved folder and find his first learning activity?'],
    '007':[['E7','Shadowing started; access expected next week.'],'Can Iris now sign in and complete a task under observation?'],
    '009':[['E5','No response recorded as of 14 Oct 2026.'],'Who can confirm the project role, training owner and expected readiness date?'],
    '010':[['E6','I can complete the daily standard activities alone, but I still need help for exceptions and production changes.'],'When can the technical owner observe Owen handling an exception?']
  };
  const data = {snapshot,cases,evidence,briefs};
  root.RelayData=data;
  if(typeof module!=='undefined') module.exports=data;
})(globalThis);
