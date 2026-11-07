// Validated, versioned portfolio definitions; explicit local saves only.
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else {
    root.PortfolioDefinitions = factory(root);
    root.PortfolioSavedDefinitions = root.PortfolioDefinitions.createStore();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';
  const KEY = 'quantarena.portfolioDefinitions.v1', MODEL = 'independent-sleeves-shared-close-v1';
  const windows = ['1M','3M','6M','1Y','3Y','5Y','Max'];
  const copy = value => JSON.parse(JSON.stringify(value));
  function requireValue(ok, message) { if (!ok) throw new Error(message); }
  function keys(value, allowed) { requireValue(value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).every(k=>allowed.includes(k)), 'Unexpected definition fields'); }
  function hash(value) { requireValue(typeof value==='string' && /^[a-f0-9]{64}$/.test(value), 'Invalid evidence pin'); return value; }
  function reference(value) {
    keys(value,['strategyId','symbol','kind','assets','runId','manifestSha256','weight']);
    requireValue(['strategyId','symbol'].every(k=>typeof value[k]==='string' && value[k].length>0 && value[k].length<=100), 'Invalid strategy identity');
    requireValue(['single','basket'].includes(value.kind) && Array.isArray(value.assets) && value.assets.length>0 && value.assets.length<=32 && new Set(value.assets).size===value.assets.length && value.assets.every(s=>typeof s==='string' && s.length>0 && s.length<=100) && (value.kind!=='single' || value.assets.length===1),'Invalid asset universe');
    return {strategyId:value.strategyId,symbol:value.symbol,kind:value.kind,assets:value.assets.slice(),runId:hash(value.runId),manifestSha256:hash(value.manifestSha256)};
  }
  function validate(value) {
    keys(value,['schemaVersion','modelId','indexSha256','operation','base','candidate','removeRunId','alpha','bps','cadence','window']);
    requireValue(value.schemaVersion===1 && value.modelId===MODEL,'Unsupported portfolio definition');
    requireValue(Array.isArray(value.base) && value.base.length>0 && value.base.length<=10,'Choose one to ten base sleeves');
    const base=value.base.map(item=>{
      const ref=reference(item);
      requireValue(typeof item.weight==='number' && Number.isFinite(item.weight) && item.weight>=0 && item.weight<=1e6,'Invalid base weight');
      return {...ref,weight:item.weight===0 ? 0 : item.weight};
    });
    requireValue(new Set(base.map(item=>item.runId)).size===base.length,'Duplicate base sleeve');
    requireValue([0,5,10,25].includes(value.bps) && ['monthly','quarterly','never'].includes(value.cadence) && windows.includes(value.window),'Unsupported experiment settings');
    requireValue(['addition','removal'].includes(value.operation),'Unknown operation');
    const result={schemaVersion:1,modelId:MODEL,indexSha256:hash(value.indexSha256),operation:value.operation,base,bps:value.bps,cadence:value.cadence,window:value.window};
    if(value.operation==='addition') {
      requireValue(typeof value.alpha==='number' && Number.isFinite(value.alpha) && value.alpha>=0 && value.alpha<=1,'Candidate allocation must be between zero and one');
      requireValue(value.removeRunId===undefined,'Addition cannot include removal');
      result.alpha=value.alpha===0 ? 0 : value.alpha;
      result.candidate=value.alpha===0 ? null : reference(value.candidate);
    } else {
      requireValue(value.alpha===undefined && value.candidate===undefined,'Removal cannot include addition');
      result.removeRunId=hash(value.removeRunId);
      requireValue(base.some(item=>item.runId===result.removeRunId),'Removed sleeve is not in the base');
    }
    return result;
  }
  function encode(value) {
    const bytes=new TextEncoder().encode(JSON.stringify(validate(value)));
    const encoded=root.btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    requireValue(encoded.length<=40000,'Shared definition exceeds supported URL size');
    return encoded;
  }
  function decode(text) {
    requireValue(typeof text==='string' && text.length>0 && text.length<=40000 && /^[A-Za-z0-9_-]+$/.test(text),'Invalid or oversized shared definition');
    const raw=root.atob(text.replace(/-/g,'+').replace(/_/g,'/'));
    return validate(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0)))));
  }
  async function definitionHash(value) {
    const bytes=new TextEncoder().encode(JSON.stringify(validate(value)));
    return Array.from(new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  }
  function createStore(options={}) {
    const storage=()=>options.storage || root.localStorage;
    const locks=()=>options.locks || root.navigator?.locks;
    function read() {
      const raw=storage().getItem(KEY);
      if(raw===null) return {schemaVersion:1,revision:0,records:[]};
      requireValue(raw.length<=1000000,'Portfolio store exceeds supported size');
      const state=JSON.parse(raw);
      keys(state,['schemaVersion','revision','records']);
      requireValue(state.schemaVersion===1 && Number.isSafeInteger(state.revision) && state.revision>=0 && Array.isArray(state.records) && state.records.length<=20,'Unsupported or damaged portfolio store');
      state.records.forEach(record=>{
        keys(record,['id','name','definition','definitionHash','savedAt']);
        requireValue(typeof record.id==='string' && /^[a-f0-9-]{36}$/.test(record.id) && typeof record.name==='string' && record.name.length>0 && record.name.length<=80 && typeof record.savedAt==='string' && Number.isFinite(Date.parse(record.savedAt)),'Invalid saved portfolio');
        record.definition=validate(record.definition); hash(record.definitionHash);
      });
      requireValue(new Set(state.records.map(r=>r.id)).size===state.records.length,'Duplicate saved portfolio');
      return state;
    }
    async function list() {
      try {
        const state=read();
        for(const record of state.records) requireValue(await definitionHash(record.definition)===record.definitionHash,'Saved definition checksum differs');
        return {status:'complete',...copy(state)};
      } catch(error) { return {status:'unavailable',reason:error.message,records:[]}; }
    }
    async function mutate(fn) {
      try {
        requireValue(locks()?.request,'Safe local saving is unavailable in this browser');
        return await locks().request(KEY,async()=>{
          const state=read();
          for(const record of state.records) requireValue(await definitionHash(record.definition)===record.definitionHash,'Saved definition checksum differs');
          const result=await fn(state);
          state.revision++;
          const raw=JSON.stringify(state); requireValue(raw.length<=1000000,'Portfolio store is full');
          storage().setItem(KEY,raw);
          root.dispatchEvent?.(new CustomEvent('quantarena:portfolios-changed'));
          return {status:'complete',record:result ? copy(result):null,revision:state.revision};
        });
      } catch(error) { return {status:'unavailable',reason:error.message}; }
    }
    async function save(name, definition, id=null) {
      // Snapshot caller input before waiting for the cross-tab lock.
      let normalized, title;
      try { normalized=validate(copy(definition)); title=String(name).trim(); requireValue(title.length>0 && title.length<=80,'Choose a name of one to eighty characters'); }
      catch(error) { return {status:'unavailable',reason:error.message}; }
      return mutate(async state=>{
        const index=id===null ? -1:state.records.findIndex(r=>r.id===id);
        requireValue(id===null || index>=0,'Saved portfolio no longer exists');
        requireValue(index>=0 || state.records.length<20,'Twenty saved portfolios already exist');
        const record={id:id || root.crypto.randomUUID(),name:title,definition:normalized,definitionHash:await definitionHash(normalized),savedAt:new Date().toISOString()};
        if(index<0) state.records.push(record); else state.records[index]=record;
        return record;
      });
    }
    const remove=id=>mutate(state=>{ const index=state.records.findIndex(r=>r.id===id); requireValue(index>=0,'Saved portfolio no longer exists'); state.records.splice(index,1); });
    return {list,save,remove};
  }
  return {key:KEY,modelId:MODEL,validate,encode,decode,definitionHash,createStore};
});
