/* A small explainable, on-device multinomial Naive Bayes text classifier.
   Training examples are synthetic phrases written for the hackathon. */
(function(root){
  const training={
    'Training gaps':[
      'Two complex scenarios still need to be covered in training.',
      'The employee needs help for exceptions and production changes.',
      'Additional learning is required before the remaining scenarios can be handled.',
      'Shadowing continues while exceptions require support.',
      'One complex task still requires step by step guidance.'
    ],
    'Readiness and closure':[
      'The manager considers onboarding closed after independent execution.',
      'Everything looks complete and the employee is working independently.',
      'The technical lead classifies readiness as ready with support.',
      'The technical owner signed the final readiness decision.',
      'Standard requests can be handled independently with occasional support.'
    ],
    'System access':[
      'The portal account awaits application owner approval.',
      'VPN access is active but sign in is still unconfirmed.',
      'A requested account has not yet been provisioned.',
      'Access support must create accounts for the service desk.',
      'All tools are available and the user can sign in.'
    ],
    'Ownership and scheduling':[
      'Confirm the exact project role and assigned training owner.',
      'The final readiness review has no date yet.',
      'The coordinator has received no response to the request.',
      'No one has recorded an expected review date.',
      'Assign a person and schedule the next follow up.'
    ],
    'Project documentation':[
      'The runbook and training guide live in the project folder.',
      'Use only the approved document location in the central index.',
      'Documents are project owned and should never be copied outside that location.',
      'The project document owner maintains the folder reference.',
      'The guide is available from the team knowledge directory.'
    ]
  };
  const stop=new Set('a an and as at be by for from has have he her his in is it of on or that the their these this to was were will with'.split(' '));
  const words=s=>(s.toLowerCase().match(/[a-z]+/g)||[]).filter(w=>!stop.has(w));
  const model={},vocab=new Set();
  for(const [category,examples] of Object.entries(training)){
    const counts=new Map();let total=0;
    for(const sample of examples)for(const word of words(sample)){counts.set(word,(counts.get(word)||0)+1);vocab.add(word);total++;}
    model[category]={counts,total};
  }
  function classify(sentence){
    const tokens=words(sentence).filter(w=>vocab.has(w));
    if(new Set(tokens).size<2)return null;
    const ranked=Object.entries(model).map(([label,{counts,total}])=>({
      label,score:tokens.reduce((sum,w)=>sum+Math.log(((counts.get(w)||0)+1)/(total+vocab.size)),0)
    })).sort((a,b)=>b.score-a.score);
    if(ranked[0].score-ranked[1].score<Math.log(1.6))return null;
    return ranked[0].label;
  }
  function inspect(sources){
    const found=[];
    for(const s of sources){
      const parts=s.body.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
      for(const part of parts){
        const quote=part.trim(),label=classify(quote);
        if(label)found.push({label,sourceId:s.id,quote});
      }
    }
    return found;
  }
  const api={categories:Object.keys(training),classify,inspect};
  root.RelayClassifier=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
