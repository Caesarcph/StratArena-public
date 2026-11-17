// Shared public snapshot validation and private, in-browser observation DTOs.
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(root);
  else root.ObservationAdapters=factory(root);
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const METHOD='observation-projection-v2',BPS=[0,5,10,25],WINDOWS=['1M','3M','6M','1Y','3Y','5Y','Max'];
  const FINANCIAL=['data/evidence/index.json','data/performance.json','data/costs/index.json','data/ai_seasons.json','data/ai_seasons_config.json'];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const same=(a,b)=>canonical(a)===canonical(b);
  const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
  function ensure(ok,reason){if(!ok)throw new Error(reason);}
  function keys(value,required,optional=[]){ensure(value&&typeof value==='object'&&!Array.isArray(value)&&required.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>required.includes(k)||optional.includes(k)),'invalid-fields');}
  function digest(value){ensure(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),'invalid-digest');return value;}
  function token(value,max=180){ensure(typeof value==='string'&&value.length>0&&value.length<=max&&/^[A-Za-z0-9_.:/|=^+-]+$/.test(value)&&!['__proto__','constructor','prototype'].includes(value),'invalid-identifier');return value;}
  function day(value){ensure(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value,'invalid-day');return value;}
  function time(value){ensure(typeof value==='string'&&value.length<=40&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value)),'invalid-time');return Date.parse(value);}
  function integer(value,min=0,max=Number.MAX_SAFE_INTEGER){ensure(Number.isSafeInteger(value)&&value>=min&&value<=max,'invalid-integer');return value;}
  function universe(kind,assets){ensure(['single','basket'].includes(kind)&&Array.isArray(assets)&&assets.length>0&&assets.length<=64&&new Set(assets).size===assets.length&&(kind!=='single'||assets.length===1),'invalid-universe');assets.forEach(a=>token(a,64));}

  function createLoader(options={}){
    const fetcher=options.fetch||root.fetch?.bind(root),crypto=options.crypto||root.crypto;
    const origin=new URL(options.origin||root.location?.origin);ensure(['http:','https:'].includes(origin.protocol),'unsupported-origin');
    const trusted=new WeakMap();let generation=0,lastSuccess=0,localVersion=null;
    const definitions=options.definitions||root.PortfolioDefinitions,math=options.math||root.PortfolioMarginal;
    const qualified=value=>canonical([value.strategyId,value.symbol,value.kind,value.assets]);
    async function hash(bytes){ensure(crypto?.subtle,'cryptography-unavailable');return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
    const hashValue=value=>hash(new TextEncoder().encode(canonical(value)));
    function receipts(chain,current){
      ensure(Array.isArray(chain)&&chain.length<=64,'invalid-receipts');
      chain.forEach((item,i)=>{keys(item,['fromEpoch','toEpoch']);digest(item.fromEpoch);digest(item.toEpoch);ensure(item.fromEpoch!==item.toEpoch&&(!i||chain[i-1].toEpoch===item.fromEpoch),'invalid-receipts');});
      ensure(!chain.length||new Set([chain[0].fromEpoch,...chain.map(item=>item.toEpoch)]).size===chain.length+1,'repeated-receipt-epoch');
      ensure(!chain.length||chain.at(-1).toEpoch===current,'receipt-endpoint-mismatch');
    }
    function receipt(chain,old,current){
      if(!old||old===current)return null;
      const at=chain.findIndex(item=>item.fromEpoch===old);
      return at>=0&&chain.at(-1).toEpoch===current?{fromEpoch:old,toEpoch:current}:null;
    }
    function abort(signal){if(signal?.aborted)throw new Error('aborted');}
    function pathAllowed(path){return path==='data/observations/index.json'||/^data\/observations\/[a-f0-9]{64}\.json$/.test(path)||FINANCIAL.includes(path);}
    async function bytes(path,maximum,signal,expected){
      abort(signal);ensure(pathAllowed(path),'invalid-path');
      const url=new URL('/'+path,origin.origin).href;
      const response=await fetcher(url,{credentials:'same-origin',redirect:'error',cache:'no-cache',signal});
      ensure(response?.ok,'http-'+response?.status);ensure(!response.redirected&&response.url===url,'redirect-rejected');
      const length=response.headers.get('content-length');
      if(length!==null)ensure(/^\d+$/.test(length)&&Number(length)<=maximum,'size-bound');
      const reader=response.body?.getReader();ensure(reader,'streaming-unavailable');const chunks=[];let total=0;
      try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>maximum||(expected!==undefined&&total>expected)){await reader.cancel();throw new Error('size-bound');}chunks.push(part.value);}}
      finally{reader.releaseLock();}
      ensure(expected===undefined||total===expected,'size-mismatch');const raw=new Uint8Array(total);let offset=0;for(const chunk of chunks){raw.set(chunk,offset);offset+=chunk.byteLength;}abort(signal);return raw;
    }
    const parse=raw=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
    async function referenced(reference,path,maximum,signal){
      keys(reference,['path','sha256','bytes']);ensure(reference.path===path,'reference-path-mismatch');digest(reference.sha256);integer(reference.bytes,1,maximum);
      const raw=await bytes(path,maximum,signal,reference.bytes);ensure(await hash(raw)===reference.sha256,'checksum-mismatch');return parse(raw);
    }
    async function validate(body,descriptor,financial){
      keys(body,['schemaVersion','method','sourceGeneratedAt','publishedAt','source','costsBps','windows','pairs','cohorts','season','rankingMethod','history']);
      ensure(body.schemaVersion===2&&body.method===METHOD&&body.publishedAt===descriptor.publishedAt,'unsupported-projection');
      ensure(time(body.publishedAt)>=time(body.sourceGeneratedAt),'invalid-publication-order');
      ensure(same(body.costsBps,BPS)&&same(body.windows,WINDOWS),'unsupported-cost-context');
      const index=financial['data/evidence/index.json'],performance=financial['data/performance.json'],costs=financial['data/costs/index.json'];
      ensure(index.schemaVersion===2&&index.executionModel==='synthetic-daily-target-v3'&&index.coverage?.allStrategiesComplete===true,'unsupported-evidence');
      ensure(index.generatedAt===performance.generatedAt&&index.generatedAt===body.sourceGeneratedAt&&performance.evidenceIndexFile==='data/evidence/index.json','publication-mismatch');
      ensure(body.source['data/evidence/index.json'].sha256===descriptor.sourceEvidenceIndexSha256,'source-pin-mismatch');
      ensure(costs.schemaVersion===1&&costs.model?.id==='synthetic-exposure-cost-v1'&&costs.coverage?.allComplete===true&&same(costs.costsBps,BPS)&&same(costs.windows,WINDOWS),'unsupported-costs');
      ensure(costs.source.indexSha256===descriptor.sourceEvidenceIndexSha256&&costs.source.performanceSha256===body.source['data/performance.json'].sha256&&costs.source.generatedAt===body.sourceGeneratedAt,'stale-cost-source');
      ensure(Array.isArray(body.pairs)&&body.pairs.length===integer(index.coverage.complete,1,10000)&&body.pairs.length===index.coverage.expectedPairs&&body.pairs.length===costs.coverage.complete,'coverage-mismatch');
      ensure(Array.isArray(index.cohort)&&index.cohort.length===body.pairs.length&&Array.isArray(costs.pairs)&&costs.pairs.length===body.pairs.length,'coverage-mismatch');
      const registry=new Map(),costPairs=new Map(),pairs=new Map(),runs=Object.create(null);
      for(const row of index.cohort){const key=canonical([row.strategyId,row.symbol]);ensure(row.status==='complete'&&!registry.has(key),'invalid-evidence-cohort');registry.set(key,row);}
      for(const row of costs.pairs){const key=canonical([row.strategyId,row.symbol]);ensure(!costPairs.has(key),'duplicate-cost-pair');costPairs.set(key,row);}
      for(const pair of body.pairs){
        keys(pair,['id','strategyId','symbol','kind','assets','runId','manifestSha256','name','executionModel','ruleVersion','asOf','count','target','effective','revisionEpoch','proof','lineageStatus','ranks','lineageEpoch','lineageScope','revisionProofs','continuity']);
        token(pair.strategyId);token(pair.symbol);universe(pair.kind,pair.assets);digest(pair.id);digest(pair.runId);digest(pair.manifestSha256);
        ensure(pair.id===await hashValue([pair.strategyId,pair.symbol])&&!pairs.has(pair.id),'pair-identity-mismatch');
        keys(pair.name,['en','zh']);ensure(Object.values(pair.name).every(v=>typeof v==='string'&&v.length>0&&v.length<=400),'invalid-label');
        ensure(pair.executionModel===index.executionModel,'execution-model-mismatch');if(pair.ruleVersion!==null)token(pair.ruleVersion);
        day(pair.asOf);ensure(pair.asOf<=new Date(time(body.sourceGeneratedAt)).toISOString().slice(0,10),'future-observation');integer(pair.count,2);
        for(const vector of [pair.target,pair.effective])ensure(Array.isArray(vector)&&vector.length===pair.assets.length&&vector.every(Number.isFinite)&&Number.isFinite(vector.reduce((n,v)=>n+Math.abs(v),0)),'invalid-weights');
        ensure(['verified','unknown'].includes(pair.lineageStatus),'invalid-lineage');
        if(pair.lineageStatus==='verified')digest(pair.lineageEpoch);else ensure(pair.lineageEpoch===null,'unknown-lineage-epoch');
        digest(pair.revisionEpoch);digest(pair.lineageScope);receipts(pair.revisionProofs,pair.revisionEpoch);
        ensure(['initial','unchanged','append','revision','unknown'].includes(pair.continuity),'invalid-continuity');
        keys(pair.proof,['edges']);ensure(Array.isArray(pair.proof.edges)&&pair.proof.edges.length<=64,'invalid-proof');
        pair.proof.edges.forEach((edge,i)=>{keys(edge,['from','to','kind']);digest(edge.from);digest(edge.to);ensure(['append','revision'].includes(edge.kind)&&(!i||edge.from===pair.proof.edges[i-1].to),'invalid-proof');});
        ensure(!pair.proof.edges.length||pair.proof.edges.at(-1).to===pair.runId,'proof-endpoint-mismatch');
        const key=canonical([pair.strategyId,pair.symbol]),entry=registry.get(key),cost=costPairs.get(key),ref=index.runs?.[pair.strategyId]?.[pair.symbol];
        ensure(entry&&cost&&ref&&ref.runId===pair.runId&&entry.runId===pair.runId&&ref.manifest===`data/evidence/runs/${pair.runId}/manifest.json`,'current-run-mismatch');
        ensure(entry.kind===pair.kind&&same(entry.universe,pair.assets)&&cost.kind===pair.kind&&same(cost.assets,pair.assets)&&cost.runId===pair.runId,'current-universe-mismatch');
        (runs[pair.strategyId]||=(Object.create(null)))[pair.symbol]=pair.runId;
        keys(pair.ranks,WINDOWS);pairs.set(pair.id,pair);
      }
      ensure(same(runs,performance.evidenceRunIds),'performance-run-mismatch');
      ensure(body.cohorts&&typeof body.cohorts==='object'&&!Array.isArray(body.cohorts),'invalid-cohorts');
      const actualMembers=new Map();
      for(const [id,cohort] of Object.entries(body.cohorts)){
        digest(id);keys(cohort,['context','members','membershipHash','revisionEpoch','size','revisionProofs']);
        const c=cohort.context;keys(c,['anchor','assets','datesSha256','end','kind','marketHash','model','observations','start','window']);
        universe(c.kind,c.assets);digest(c.datesSha256);digest(c.marketHash);day(c.start);day(c.end);integer(c.observations,2);
        ensure(c.start<=c.end&&WINDOWS.includes(c.window)&&['start-close','initial-capital'].includes(c.anchor)&&c.model==='synthetic-exposure-cost-v1','invalid-rank-context');
        ensure(await hashValue({window:c.window,context:c})===id,'cohort-hash-mismatch');
        ensure(Array.isArray(cohort.members)&&cohort.members.length===integer(cohort.size,1,body.pairs.length)&&new Set(cohort.members).size===cohort.size&&same(cohort.members,cohort.members.slice().sort()),'invalid-membership');
        ensure(cohort.members.every(id=>pairs.has(id))&&await hashValue(cohort.members)===cohort.membershipHash,'membership-hash-mismatch');
        const epochs=cohort.members.map(id=>[id,pairs.get(id).revisionEpoch]);
        ensure(cohort.revisionEpoch===await hashValue(epochs),'cohort-revision-mismatch');receipts(cohort.revisionProofs,cohort.revisionEpoch);actualMembers.set(id,[]);
      }
      for(const pair of pairs.values())for(const [window,value] of Object.entries(pair.ranks)){
        ensure(value&&typeof value==='object','invalid-rank');
        if(value.status==='unavailable'){keys(value,['status','reason']);token(value.reason);continue;}
        keys(value,['status','cohortId','values']);ensure(value.status==='available','invalid-rank');const cohort=body.cohorts[value.cohortId];
        ensure(cohort&&cohort.context.window===window&&cohort.context.kind===pair.kind&&same(cohort.context.assets,pair.assets),'rank-universe-mismatch');
        ensure(cohort.context.end===pair.asOf,'rank-endpoint-mismatch');
        ensure(Array.isArray(value.values)&&value.values.length===4&&value.values.every(v=>v===null||(Number.isSafeInteger(v)&&v>=1&&v<=cohort.size&&cohort.size>=2)),'invalid-rank-values');
        actualMembers.get(value.cohortId).push(pair.id);
      }
      for(const [id,members] of actualMembers)ensure(same(members.sort(),body.cohorts[id].members),'rank-membership-mismatch');
      ensure(Array.isArray(body.history)&&body.history.length<=8,'invalid-history');const seenHistory=new Set();let previousTime=Infinity;
      for(const item of body.history){
        keys(item,['id','publishedAt','sourceIndexSha256','heads','changes']);digest(item.id);digest(item.sourceIndexSha256);
        ensure(!seenHistory.has(item.id)&&time(item.publishedAt)<time(body.publishedAt)&&time(item.publishedAt)<=previousTime,'invalid-history-order');seenHistory.add(item.id);previousTime=time(item.publishedAt);
        ensure(item.heads&&typeof item.heads==='object'&&!Array.isArray(item.heads)&&Object.keys(item.heads).length<=10000&&same(Object.keys(item.heads).sort(),Object.keys(item.changes).sort()),'invalid-history-heads');
        for(const [id,old] of Object.entries(item.heads)){
          digest(id);keys(old,['strategyId','symbol','kind','assets','runId','manifestSha256','revisionEpoch','lineageScope']);token(old.strategyId);token(old.symbol);universe(old.kind,old.assets);digest(old.runId);digest(old.manifestSha256);digest(old.revisionEpoch);digest(old.lineageScope);
          ensure(id===await hashValue([old.strategyId,old.symbol]),'history-identity-mismatch');
          const kind=item.changes[id],current=pairs.get(id);ensure(['unchanged','append','revision','unknown'].includes(kind),'invalid-history-change');
          if(kind!=='unknown'){
            ensure(current&&qualified(old)===qualified(current)&&old.lineageScope===current.lineageScope,'unproved-history-scope');
            if(kind==='unchanged')ensure(old.runId===current.runId&&old.manifestSha256===current.manifestSha256&&old.revisionEpoch===current.revisionEpoch,'unproved-unchanged-history');
            if(kind==='append')ensure(old.runId!==current.runId&&old.revisionEpoch===current.revisionEpoch,'unproved-history-append');
            if(kind==='revision')ensure(old.revisionEpoch!==current.revisionEpoch,'unproved-history-revision');
          }
        }
      }
      if(body.season!==null)await validateSeason(body,financial,pairs);
      return pairs;
    }
    async function validateSeason(body,financial,pairs){
      const season=body.season,ai=financial['data/ai_seasons.json'],config=financial['data/ai_seasons_config.json'];
      ensure(ai&&config,'missing-season-source');keys(season,['seasonId','freezeId','state','asOf','forwardObservations','revisionEpoch','countBasis','milestones','sourcePairs','revisionProofs']);
      ensure(ai.configSha256===body.source['data/ai_seasons_config.json'].sha256&&ai.inputEvidence?.indexSha256===body.source['data/evidence/index.json'].sha256&&ai.id===config.id&&season.seasonId===ai.id,'stale-season-source');
      const frozen={protocol:ai.protocol,configSha256:ai.configSha256,rules:ai.submissions.map(item=>[item.id,item.rulesSha256])};
      ensure(await hashValue(frozen)===season.freezeId&&season.state===ai.state&&season.countBasis==='minimum-across-declared-markets','season-freeze-mismatch');
      const windows=Object.values(ai.windows);ensure(windows.length>0,'missing-season-markets');
      for(const value of windows){ensure(Array.isArray(value.dates)&&value.dates.length===integer(value.observationCount)&&same(value.dates,[...new Set(value.dates)].sort()),'invalid-season-dates');value.dates.forEach(day);ensure(value.observedThrough===(value.dates.at(-1)||null),'invalid-season-endpoint');}
      const count=Math.min(...windows.map(v=>v.observationCount)),observed=windows.map(v=>v.observedThrough).filter(Boolean),epochs=[];
      let covered=Boolean(ai.end);
      for(const [market,source] of Object.entries(ai.inputEvidence.markets)){
        const pair=pairs.get(await hashValue([source.strategyId,market]));
        ensure(pair&&pair.kind==='single'&&same(pair.assets,[market])&&pair.runId===source.runId&&pair.manifestSha256===source.manifestSha256&&pair.asOf===source.observedThrough,'season-price-source-mismatch');
        epochs.push([pair.id,pair.revisionEpoch]);covered=covered&&source.observedThrough>=ai.end;
      }
      epochs.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
      ensure(same(season.sourcePairs,epochs.map(([id])=>id))&&season.forwardObservations===count&&season.asOf===(observed.length===windows.length?observed.sort()[0]:null)&&season.revisionEpoch===await hashValue(epochs),'season-observation-mismatch');receipts(season.revisionProofs,season.revisionEpoch);
      const minimum=integer(ai.minimumObservationsForRanking,1),expected=[['first-common-observation',1,count>=1],['ranking-eligible',minimum,ai.rankingEligible&&count>=minimum],['complete-window',minimum,ai.state==='completed'&&ai.rankingEligible&&covered&&count>=minimum]];
      ensure(Array.isArray(season.milestones)&&season.milestones.length===3,'invalid-milestones');
      for(let i=0;i<3;i++){const m=season.milestones[i],[id,threshold,met]=expected[i];keys(m,['id','threshold','met','proofId']);ensure(m.id===id&&m.threshold===threshold&&m.met===Boolean(met)&&m.proofId===(met?await hashValue([body.source['data/ai_seasons.json'].sha256,id,count]):null),'unproved-milestone');}
    }
    async function load(request={}){
      const serial=++generation;
      try{
        ensure(typeof fetcher==='function','fetch-unavailable');const raw=await bytes('data/observations/index.json',32768,request.signal),descriptor=parse(raw);
        keys(descriptor,['schemaVersion','method','publishedAt','projection','sourceEvidenceIndexSha256']);ensure(descriptor.schemaVersion===2&&descriptor.method===METHOD,'unsupported-projection');time(descriptor.publishedAt);digest(descriptor.sourceEvidenceIndexSha256);
        const body=await referenced(descriptor.projection,`data/observations/${digest(descriptor.projection.sha256)}.json`,8*1024*1024,request.signal);
        keys(body.source,FINANCIAL.slice(0,3),FINANCIAL.slice(3));ensure((body.season===null)===(!body.source[FINANCIAL[3]]&&!body.source[FINANCIAL[4]]),'season-capability-mismatch');
        const financial=Object.create(null);
        await Promise.all(Object.entries(body.source).map(async([name,ref])=>{financial[name]=await referenced(ref,name,32*1024*1024,request.signal);}));
        const pairs=await validate(body,descriptor,financial);
        const tools=financial['data/costs/index.json'].tools;
        const methodPins=['cost_scenarios.py','build_cost_rankings.py'].map(name=>{const tool=tools?.[name];ensure(tool?.path===`data/costs/tools/${name}`,'missing-rank-method');return digest(tool.sha256);});
        const rankMethod='rank-v1.'+await hashValue(methodPins);
        ensure(body.rankingMethod===rankMethod,'rank-method-mismatch');
        const again=await bytes('data/observations/index.json',32768,request.signal);ensure(await hash(raw)===await hash(again),'publication-changed');abort(request.signal);
        ensure(serial===generation,'superseded');lastSuccess=serial;
        const result=Object.freeze({status:'complete',id:descriptor.projection.sha256,publishedAt:body.publishedAt,sourceGeneratedAt:body.sourceGeneratedAt,
          pairs:clone(body.pairs),season:clone(body.season)});
        trusted.set(result,{body,pairs,rankMethod,qualified:new Map([...pairs.values()].map(p=>[qualified(p),p])),generation:serial});return result;
      }catch(error){return {status:'unavailable',reason:error.name==='AbortError'?'aborted':error.message};}
    }
    async function portfolioObservation(state,record,id,old,definitionRevision){
      try{
        keys(record,['id','name','definition','definitionHash','savedAt']);token(record.id,80);time(record.savedAt);digest(record.definitionHash);
        ensure(typeof record.name==='string'&&record.name.length>0&&record.name.length<=80,'invalid-local-name');
        const definition=definitions.validate(record.definition);
        ensure(await definitions.definitionHash(definition)===record.definitionHash,'saved-definition-checksum');
        ensure(definition.modelId===math.modelId,'unsupported-portfolio-model');
        const refs=new Map(definition.base.map(r=>[qualified(r),r]));ensure(refs.size===definition.base.length,'duplicate-portfolio-scope');
        const raw=Object.fromEntries([...refs.keys()].sort().map(key=>[key,refs.get(key).weight]));
        const [before]=math.normalizeAllocations(raw);let after={...before};
        if(definition.operation==='addition'&&definition.alpha>0){
          const key=qualified(definition.candidate);refs.set(key,definition.candidate);
          after=Object.fromEntries(Object.entries(before).map(([k,v])=>[k,(1-definition.alpha)*v]));after[key]=(after[key]||0)+definition.alpha;after=math.normalizeAllocations(after)[0];
        }else if(definition.operation==='removal'){
          const removed=definition.base.find(r=>r.runId===definition.removeRunId),key=qualified(removed);
          if(Object.hasOwn(before,key))after=math.removeAllocation(before,key);
          ensure(Object.keys(after).length>0,'empty-after-portfolio');
        }
        const active=[...new Set([...Object.keys(before),...Object.keys(after)])].sort();
        const current=active.map(key=>{const pair=state.qualified.get(key);ensure(pair,'current-scope-unavailable');return {key,pair};});
        const semantic={modelId:definition.modelId,operation:definition.operation,before,after,bps:definition.bps,cadence:definition.cadence,window:definition.window};
        const epochs=current.map(({key,pair})=>[key,pair.revisionEpoch]);
        const item={id,kind:'portfolio',availability:'available',context:{portfolioId:record.id,modelVersion:definition.modelId},
          asOf:current.map(({pair})=>pair.asOf).sort()[0],data:{definitionRevision,definitionHash:await hashValue(semantic),
            sourcesHash:await hashValue(current.map(({key,pair})=>[key,pair.runId,pair.manifestSha256])),
            revisionEpoch:epochs.some(([,value])=>value===null)?null:await hashValue(epochs)}};
        item.observationId=await hashValue(item);
        const revisionWitnesses=[];
        for(const witness of state.body.history){
          const prior=current.map(({key,pair})=>({key,pair,head:witness.heads[pair.id],kind:witness.changes[pair.id]}));
          if(prior.some(row=>!row.head||qualified(row.head)!==row.key))continue;
          const sourceHash=await hashValue(prior.map(({key,head})=>[key,head.runId,head.manifestSha256]));
          const oldEpoch=await hashValue(prior.map(({key,head})=>[key,head.revisionEpoch]));
          const revision=prior.some(row=>row.kind==='revision'),known=prior.every(row=>['unchanged','append','revision'].includes(row.kind));
          if(known&&revision&&oldEpoch!==item.data.revisionEpoch)revisionWitnesses.push({fromEpoch:oldEpoch,toEpoch:item.data.revisionEpoch,
            fromSourcesHash:sourceHash,toSourcesHash:item.data.sourcesHash});
          if(known&&!revision&&old&&same(old.context,item.context)&&old.data.definitionHash===item.data.definitionHash
            &&sourceHash===old.data.sourcesHash&&oldEpoch===old.data.revisionEpoch&&sourceHash!==item.data.sourcesHash)
            item.proof={edges:[{from:sourceHash,to:item.data.sourcesHash,kind:'append'}]};
        }
        if(revisionWitnesses.length)item.proof={...(item.proof||{}),revisionWitnesses};
        return item;
      }catch(error){return {id,kind:'portfolio',availability:'unavailable',reason:'saved-definition-unavailable',observationId:await hashValue(['portfolio-unavailable',id,error.message])};}
    }
    async function snapshot(handle,selections,portfolioState=null,previousState=null){
      try{
        const state=trusted.get(handle);ensure(state,'unverified-snapshot');ensure(state.generation===generation&&lastSuccess===generation,'snapshot-not-current');ensure(Array.isArray(selections)&&selections.length<=100,'too-many-subjects');
        const local=portfolioState===null?null:clone(portfolioState);
        const previousSubjects=clone(previousState?.subjects||{});
        const portfolioAvailable=Boolean(local?.status==='complete'&&definitions&&math);
        let localPin=null;
        if(portfolioAvailable){
          keys(local,['status','schemaVersion','revision','records']);ensure(local.schemaVersion===1&&Array.isArray(local.records)&&local.records.length<=20,'invalid-local-store');integer(local.revision);
          ensure(new Set(local.records.map(r=>r.id)).size===local.records.length,'duplicate-local-record');
          localPin=await hashValue(local);
          ensure(!localVersion||local.revision>=localVersion.revision,'older-local-state');
          ensure(!localVersion||local.revision!==localVersion.revision||localPin===localVersion.hash,'ambiguous-local-state');
          localVersion={revision:local.revision,hash:localPin};
        }
        const observations=[],labels=Object.create(null);
        for(const selection of clone(selections)){
          ensure(selection&&['signal','rank','season','portfolio'].includes(selection.kind),'unsupported-selection');
          if(selection.kind==='portfolio'){
            keys(selection,['kind','portfolioId']);token(selection.portfolioId,80);const id='portfolio:'+selection.portfolioId;
            if(!portfolioAvailable){observations.push({id,kind:'portfolio',availability:'unsupported',reason:'portfolio-adapter-unavailable',observationId:await hashValue(['portfolio-unsupported',id])});continue;}
            const record=local.records.find(r=>r.id===selection.portfolioId);
            if(!record){observations.push({id,kind:'portfolio',availability:'unavailable',reason:'saved-definition-missing',observationId:await hashValue(['portfolio-missing',id])});continue;}
            labels[id]={en:record.name,zh:record.name};observations.push(await portfolioObservation(state,record,id,previousSubjects[id]?.observed,local.revision));continue;
          }
          if(selection.kind==='season'){
            keys(selection,['kind']);const s=state.body.season;const id='season:'+(s?s.seasonId:'current');
            if(!s){observations.push({id,kind:'season',availability:'unsupported',reason:'season-adapter-unavailable',observationId:await hashValue(['season-unsupported'])});continue;}
            const item={id,kind:'season',availability:'available',context:{seasonId:s.seasonId,freezeId:s.freezeId},asOf:s.asOf,data:{revisionEpoch:s.revisionEpoch,forwardObservations:s.forwardObservations,milestones:clone(s.milestones)}};
            item.observationId=await hashValue(item);const prior=previousSubjects[id]?.observed;
            const proved=prior&&same(prior.context,item.context)&&receipt(s.revisionProofs,prior.data.revisionEpoch,item.data.revisionEpoch);item.proof={revisionChain:clone(s.revisionProofs),...(proved?{revision:proved}:{})};observations.push(item);continue;
          }
          keys(selection,selection.kind==='signal'?['kind','pairId']:['kind','pairId','window','bps']);digest(selection.pairId);
          const pair=state.pairs.get(selection.pairId),id=selection.kind+':'+selection.pairId+(selection.kind==='rank'?':'+selection.window+':'+selection.bps:'');
          if(selection.kind==='rank')ensure(WINDOWS.includes(selection.window)&&BPS.includes(selection.bps),'invalid-rank-selection');
          if(!pair){observations.push({id,kind:selection.kind,availability:'unavailable',reason:'not-in-current-publication',observationId:await hashValue(['missing',id])});continue;}
          labels[id]=clone(pair.name);
          const context={strategyId:pair.strategyId,symbol:pair.symbol,kind:pair.kind,assets:pair.assets.slice()};let item;
          if(selection.kind==='signal')item={id,kind:'signal',availability:'available',context:{...context,executionModel:pair.executionModel,ruleVersion:pair.ruleVersion},asOf:pair.asOf,
            data:{runId:pair.runId,revisionEpoch:pair.revisionEpoch,count:pair.count,target:pair.target.slice(),effective:pair.effective.slice()},proof:clone(pair.proof),
            freshness:{policyId:pair.assets.every(a=>['BTC-USD','ETH-USD'].includes(a))?'crypto-calendar-2':'calendar-4',staleAfterDays:pair.assets.every(a=>['BTC-USD','ETH-USD'].includes(a))?2:4}};
          else{
            const rank=pair.ranks[selection.window];
            if(rank.status!=='available'){observations.push({id,kind:'rank',availability:'unavailable',reason:rank.reason,observationId:await hashValue(['rank-unavailable',id,rank.reason])});continue;}
            const cohort=state.body.cohorts[rank.cohortId],c=cohort.context;
            item={id,kind:'rank',availability:'available',context:{...context,window:{mode:selection.window==='Max'?'full':'rolling',value:selection.window},bps:selection.bps,metric:'net-total-return',direction:'desc',modelVersion:c.model,anchor:c.anchor,methodVersion:state.rankMethod},asOf:c.end,
              data:{rank:rank.values[BPS.indexOf(selection.bps)],cohortSize:cohort.size,membershipHash:cohort.membershipHash,revisionEpoch:cohort.revisionEpoch,start:c.start,end:c.end,datesHash:c.datesSha256}};
          }
          const identity={...item};delete identity.proof;item.observationId=await hashValue(identity);observations.push(item);
          const prior=previousSubjects[id]?.observed;
          const compatible=prior&&(selection.kind==='signal'?same([prior.context.strategyId,prior.context.symbol,prior.context.kind,prior.context.assets],[context.strategyId,context.symbol,context.kind,context.assets]):same(prior.context,item.context));
          const chain=selection.kind==='signal'?pair.revisionProofs:state.body.cohorts[pair.ranks[selection.window].cohortId].revisionProofs;
          const proved=compatible&&receipt(chain,prior.data.revisionEpoch,item.data.revisionEpoch);
          item.proof={...(item.proof||{}),revisionChain:clone(chain),...(proved?{revision:proved}:{})};
        }
        ensure(new Set(observations.map(item=>item.id)).size===observations.length,'duplicate-subject');
        ensure(state.generation===generation&&lastSuccess===generation,'snapshot-not-current');
        if(portfolioAvailable)ensure(localVersion.revision===local.revision&&localVersion.hash===localPin,'superseded-local-state');
        return {status:'complete',subjects:observations.map(({id,kind})=>({id,kind})),labels,
          snapshot:{schemaVersion:1,verified:true,id:handle.id,publishedAt:handle.publishedAt,confirmedCurrent:true,capabilities:['signal','rank',...(state.body.season?['season']:[]),...(portfolioAvailable?['portfolio']:[])],observations}};
      }catch(error){return {status:'unavailable',reason:error.message};}
    }
    return {load,snapshot};
  }
  return {createLoader,method:METHOD};
});
