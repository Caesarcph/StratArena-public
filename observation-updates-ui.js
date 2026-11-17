// Browser-local review of verified public observations. No telemetry or personal requests.
(function(root){
  'use strict';
  const text={
    title:['Updates on this browser','此浏览器的更新'],saved:['Saved strategies','已收藏策略'],updates:['Updates','更新'],
    note:['Changes between checked snapshots, not a complete trading history. First visits establish a quiet baseline.','比较已检查快照之间的变化，并非完整交易历史。首次查看仅建立基线，不产生提醒。'],
    privacy:['Favorites, saved portfolio names and review history stay in this browser. No account or notifications are required.','收藏、组合名称和阅读记录仅保存在此浏览器，无需账户或通知权限。'],
    check:['Check for updates','检查更新'],checking:['Checking the shared publication…','正在核验公共发布数据…'],
    failure:['Could not verify the current publication. Previous observations are preserved.','暂时无法核验当前发布数据，已保留之前的观察记录。'],
    ready:['Current publication verified','已核验当前发布数据'],memory:['Session only: this browser could not safely save the digest. Existing saved data was preserved.','仅限当前会话：浏览器无法安全保存摘要，已有保存数据已保留。'],
    checked:['Last checked','上次检查'],reviewed:['Last reviewed','上次已读'],never:['Not yet','尚未'],
    activity:['Detected changes','检测到的变化'],quiet:['No detected changes. This does not mean there were no changes between visits.','暂无检测到的变化，不代表两次访问之间没有变化。'],
    mark:['Mark displayed items reviewed','将已展示内容标为已读'],more:['Show up to 50 retained changes','显示最多 50 条保留记录'],
    unread:['unread','条未读'],overflow:['Older changes have left the 50-item history; current observation cursors remain.','较旧变化已超出 50 条历史上限；当前观察位置仍保留。'],
    current:['Current observations','当前观察'],subject:['Subject / context','对象／比较条件'],value:['Observed state','观察状态'],asof:['Source date (UTC)','来源日期（UTC）'],
    unknown:['Unavailable / not verified','不可用／未核验'],stale:['Data is older than its freshness policy','数据已超过新鲜度阈值'],evidence:['Evidence','证据'],
    controls:['Watch settings','观察设置'],pick:['Choose a saved strategy / market','选择已收藏策略／市场'],add:['Add market','添加市场'],rank:['Add rank comparison','添加排名比较'],
    season:['Watch the model season','观察模型赛季'],remove:['Remove this context','移除此条件'],last:['Remove the favorite to stop its last market watch.','取消收藏可停止该策略最后一个市场的观察。'],
    limit:['More than 100 contexts were requested. No subscriptions were silently dropped; remove contexts or favorites before checking.','所选观察条件超过 100 个，未静默删减任何订阅。请减少条件或收藏后再检查。'],
    missing:['Some favorites have no verified primary market. Choose an available market below.','部分收藏没有已核验的默认市场，请在下方选择可用市场。'],
    concurrent:['Newer observations or settings arrived in another tab. Check again to use the latest state.','另一个标签页已有更新的观察或设置，请重新检查以使用最新状态。'],
    resetTitle:['Local history controls','本地历史管理'],confirm:['I understand this clears the digest history on this browser; favorites and saved portfolios remain.','我了解这会清除此浏览器的摘要历史，收藏及已保存组合仍保留。'],
    clear:['Clear history, keep watch settings','清除历史，保留观察设置'],reset:['Reset digest and baselines','重置摘要与基线'],
    recalculation:['Sources changed; recalculate the saved portfolio to see performance.','来源已变化，请重新计算保存的组合以查看表现。'],
    tracked:['Saved definition tracked. Performance is not recalculated here.','正在观察已保存的定义；此处不会重新计算表现。'],
    sourceRevision:['Verified historical revision','已核验历史修订'],sourceUnknown:['Source changed; continuity is unknown','来源已变化，连续性未确定'],append:['Verified additional observations','已核验新增观察数据']
  };
  const events={
    'state-changed':['Target or effective exposure changed','目标或有效敞口变化'],
    'source-revised':['Evidence revised','证据已修订'],'source-update-unknown':['Source updated; classification unknown','来源更新，类型未确定'],
    'context-changed':['Comparison context changed','比较条件变化'],'availability-lost':['Verified data became unavailable','已核验数据暂不可用'],
    'availability-restored':['Verified data restored','已核验数据恢复'],'rank-changed':['Comparable rank changed','可比排名变化'],
    'rank-recalculated':['Rank recalculated after revision','修订后重新计算排名'],'rank-availability-changed':['Rank availability changed','排名可用性变化'],
    'portfolio-definition-changed':['Saved allocation changed','保存的配置变化'],'portfolio-sources-updated':['Portfolio sources updated','组合来源更新'],
    'season-milestone':['Observed season milestone','已观察到赛季里程碑'],'season-milestone-revised':['Season milestone revised','赛季里程碑修订'],
    'data-stale':['Data became stale','数据已过期'],'data-recovered':['Newer data restored freshness','更新的数据已恢复新鲜度'],
    'freshness-policy-changed':['Freshness policy changed','新鲜度规则变化']
  };
  const language=()=>typeof root.getLang==='function'&&root.getLang()==='zh'?1:0;
  const t=key=>text[key][language()];
  function el(tag,value,attrs={}){const node=document.createElement(tag);if(value!==undefined)node.textContent=value;for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);return node;}
  const now=()=>new Date().toISOString();
  const displayTime=value=>value?new Date(value).toISOString().slice(0,16).replace('T',' ')+' UTC':t('never');
  let localStore=null,lifetime=null;
  function store(){
    const D=root.ObservationDigest;
    let storage;try{storage=root.localStorage;}catch(_){storage={getItem(){throw Error('unavailable');}};}
    return D.createStore(storage,{epoch:'initial-local-digest',now,
      ...(root.navigator.locks?.request?{withLock:fn=>root.navigator.locks.request(D.STORAGE_KEY,fn)}:{})});
  }
  function render(){
    return `<section class="section observation-updates" id="observation-updates" data-private-local aria-busy="true">
      <div class="section-header"><div><div class="eyebrow">${t('updates')}</div><h2>${t('title')}</h2></div></div>
      <p>${t('note')}</p><p class="muted">${t('privacy')}</p>
      <p data-update-status role="status" aria-live="polite">${t('checking')}</p>
      <div data-update-content></div></section>`;
  }
  function selection(id,subject){
    if(subject.kind==='signal')return {kind:'signal',pairId:id.slice(7)};
    if(subject.kind==='rank'){const [,pairId,window,bps]=id.split(':');return {kind:'rank',pairId,window,bps:Number(bps)};}
    if(subject.kind==='portfolio')return {kind:'portfolio',portfolioId:id.slice(10)};
    return {kind:'season'};
  }
  const selectionId=s=>s.kind==='signal'?'signal:'+s.pairId:s.kind==='rank'?`rank:${s.pairId}:${s.window}:${s.bps}`:s.kind==='portfolio'?'portfolio:'+s.portfolioId:'season';
  const hasSubjects=(state,subjects)=>Object.keys(state.subjects).length===subjects.length&&subjects.every(item=>state.subjects[item.id]?.kind===item.kind);
  async function mount(options){
    lifetime?.abort();lifetime=new AbortController();const signal=lifetime.signal;
    const panel=document.getElementById('observation-updates');if(!panel)return;
    const D=root.ObservationDigest,loader=root.ObservationAdapters.createLoader();
    localStore ||= store();let owned=localStore;
    const content=panel.querySelector('[data-update-content]'),status=panel.querySelector('[data-update-status]');
    let handle=null,labels={},busy=false,expanded=false,review=null,missing=false;
    const selected=()=>Object.entries(owned.getState().subjects).map(([id,subject])=>selection(id,subject));
    const alive=()=>!signal.aborted&&panel.isConnected;
    function message(key){if(alive())status.textContent=t(key);}
    function button(label,action){const b=el('button',label,{type:'button',class:'button ghost'});b.addEventListener('click',action,{signal});return b;}
    function label(id,subject){const h=subject?.observed,c=h?.context;
      if(c?.strategyId)return `${labels[id]?.[language()?'zh':'en']||c.strategyId} · ${c.symbol}${c.window?' · '+c.window.value+' · '+c.bps+' bp':''}`;
      return labels[id]?.[language()?'zh':'en']||c?.seasonId||t('unknown');
    }
    function stateText(subject){const h=subject.observed;if(subject.status!=='ready'||!h)return t('unknown');
      if(subject.kind==='signal')return h.context.assets.map((a,i)=>`${a}: ${(h.data.target[i]*100).toFixed(1)}% / ${(h.data.effective[i]*100).toFixed(1)}%`).join(' · ');
      if(subject.kind==='rank')return h.data.rank===null?t('unknown'):`${h.data.rank} / ${h.data.cohortSize}`;
      if(subject.kind==='portfolio')return t('tracked');
      return `${h.data.forwardObservations} ${language()?'个共同观察日':'common observations'}`;
    }
    function draw(){
      if(!alive())return;content.replaceChildren();const state=owned.getState(),view=D.view(state,now(),expanded?50:20);
      review=D.captureReview(state);const shown=new Set(view.events.map(e=>e.id));review.eventIds=review.eventIds.filter(id=>shown.has(id));
      const summary=el('div',undefined,{class:'observation-summary'});
      summary.append(el('p',`${view.unread} ${t('unread')} · ${t('checked')}: ${displayTime(state.lastSnapshot?view.lastCheckedAt:null)} · ${t('reviewed')}: ${displayTime(view.lastReviewedAt)}`));
      if(!owned.getStatus().persistent||options.favoritePersistence?.()===false)summary.append(el('p',t('memory'),{role:'note'}));
      if(view.overflow.dropped)summary.append(el('p',`${view.overflow.dropped} · ${t('overflow')}`));
      if(missing)summary.append(el('p',t('missing')));
      const actions=el('div',undefined,{class:'hero-actions'}),check=button(t('check'),()=>refresh());check.disabled=busy;actions.append(check);
      const token=review,ack=button(t('mark'),async()=>{await owned.dispatch({type:'acknowledge',review:token,epoch:token.epoch});draw();});ack.disabled=busy||!Object.keys(token.heads).length;actions.append(ack);summary.append(actions);content.append(summary);
      content.append(el('h3',t('activity')));const list=el('ol',undefined,{class:'observation-events'});
      for(const event of view.events){const item=el('li',undefined,{class:event.acknowledgedAt?'reviewed':''});
        item.append(el('strong',(events[event.kind]||[event.kind,event.kind])[language()]),el('p',label(event.subjectId,state.subjects[event.subjectId])));
        if(Object.hasOwn(event.details,'oldRank'))item.append(el('p',`${event.details.oldRank??'—'} → ${event.details.newRank??'—'}`));
        if(event.details.oldBounds&&event.details.newBounds)item.append(el('small',`${event.details.oldBounds.join(' – ')} → ${event.details.newBounds.join(' – ')}`));
        const changes=(event.details.changes||[]).filter(change=>change.asset);
        for(const change of changes)item.append(el('p',`${change.asset} · ${change.field==='target'?(language()?'目标':'Target'):(language()?'有效':'Effective')}: ${(change.from*100).toFixed(1)}% → ${(change.to*100).toFixed(1)}%`));
        const classification=event.details.classification;
        if(event.kind==='portfolio-sources-updated')item.append(el('p',t('recalculation')));
        if(classification)item.append(el('p',t(classification==='revision'?'sourceRevision':classification==='append'?'append':'sourceUnknown')));
        item.append(el('small',`${t('asof')}: ${event.asOf||t('unknown')} · ${displayTime(event.detectedAt)}`));list.append(item);
      }
      content.append(view.events.length?list:el('p',t('quiet')));
      if(!expanded&&view.retained>20)content.append(button(t('more'),()=>{expanded=true;draw();}));
      content.append(el('h3',t('current')));
      const wrap=el('div',undefined,{class:'observation-table',tabindex:'0',role:'region','aria-label':t('current')});
      const table=el('table'),thead=el('thead'),tr=el('tr');for(const key of ['subject','value','asof'])tr.append(el('th',t(key),{scope:'col'}));thead.append(tr);table.append(thead);const tbody=el('tbody');
      for(const [id,subject] of Object.entries(state.subjects)){const row=el('tr'),name=el('td',undefined,{'data-label':t('subject')}),value=el('td',stateText(subject),{'data-label':t('value')});name.append(el('strong',label(id,subject)));
        const h=subject.observed;if(h?.context.strategyId){const href=options.evidenceHref?.(h.context.strategyId,h.context.symbol)||'/evidence/';name.append(el('a',t('evidence'),{href}));}
        if(subject.kind==='signal')value.append(el('small',language()?'目标／有效敞口':'Target / effective exposure'));
        if(view.freshness[id]?.status==='stale')value.append(el('small',t('stale')));
        row.append(name,value,el('td',h?.asOf||t('unknown'),{'data-label':t('asof')}));tbody.append(row);
      }table.append(tbody);wrap.append(table);content.append(wrap);
      if(handle)settings(state);
      const reset=el('details'),title=el('summary',t('resetTitle')),consent=el('input',undefined,{type:'checkbox'}),confirm=el('label');confirm.append(consent,document.createTextNode(t('confirm')));reset.append(title,confirm);
      reset.append(button(t('clear'),async()=>{if(!consent.checked)return;await owned.dispatch({type:'clear',newEpoch:crypto.randomUUID(),epoch:owned.getState().epoch});draw();}),button(t('reset'),async()=>{if(!consent.checked)return;await owned.resetPersistent(crypto.randomUUID());draw();await refresh();}));content.append(reset);
    }
    function settings(state){
      const box=el('details'),summary=el('summary',t('controls')),pick=el('select',undefined,{'aria-label':t('pick')});box.append(summary,el('label',t('pick')));
      for(const pair of handle.pairs.filter(p=>options.favoriteIds().includes(p.strategyId)))pick.append(el('option',`${pair.name[language()?'zh':'en']} · ${pair.symbol} · ${pair.assets.join(', ')}`,{value:pair.id}));box.append(pick);
      const window=el('select',undefined,{'aria-label':language()?'排名窗口':'Rank window'}),bps=el('select',undefined,{'aria-label':language()?'成本（基点）':'Cost (bp)'});
      for(const v of ['1M','3M','6M','1Y','3Y','5Y','Max'])window.append(el('option',v,{value:v}));window.value='1Y';
      for(const v of [0,5,10,25])bps.append(el('option',v+' bp',{value:String(v)}));bps.value='10';box.append(window,bps);
      box.append(button(t('add'),()=>pick.value&&refresh([...selected(),{kind:'signal',pairId:pick.value}])),button(t('rank'),()=>pick.value&&refresh([...selected(),{kind:'rank',pairId:pick.value,window:window.value,bps:Number(bps.value)}])));
      if(handle.season)box.append(button(t('season'),()=>refresh([...selected(),{kind:'season'}])));
      for(const [id,subject] of Object.entries(state.subjects)){
        if(subject.kind==='portfolio')continue;
        const sameStrategy=Object.values(state.subjects).filter(s=>s.kind==='signal'&&s.observed?.context.strategyId===subject.observed?.context.strategyId).length;
        const entry=el('p',label(id,subject));
        if(subject.kind==='signal'&&sameStrategy<=1)entry.append(el('small',t('last')));
        else entry.append(button(t('remove'),()=>refresh(selected().filter(s=>selectionId(s)!==selectionId(selection(id,subject))))));box.append(entry);
      }content.append(box);
    }
    async function refresh(explicit=null){
      if(busy||!alive())return;busy=true;panel.setAttribute('aria-busy','true');message('checking');draw();
      const before=owned.getState(),epoch=before.epoch;
      try{
        const loaded=await loader.load({signal});if(!alive())return;if(loaded.status!=='complete')throw Error('publication');handle=loaded;
        const local=await root.PortfolioDefinitions.createStore().list();if(!alive())return;
        const favorites=new Set(options.favoriteIds()),pairs=new Map(handle.pairs.map(p=>[p.id,p]));missing=false;
        let items=explicit||Object.entries(before.subjects).filter(([,s])=>s.kind==='season'||s.kind==='portfolio'||favorites.has(s.observed?.context.strategyId)).map(([id,s])=>selection(id,s));
        items=items.filter(s=>!['signal','rank'].includes(s.kind)||!pairs.has(s.pairId)||favorites.has(pairs.get(s.pairId).strategyId));
        for(const favorite of favorites){
          if(items.some(s=>s.kind==='signal'&&pairs.get(s.pairId)?.strategyId===favorite))continue;
          const actual=handle.pairs.filter(p=>p.strategyId===favorite),catalog=options.catalog.find(s=>s.id===favorite);
          const primary=actual.find(p=>p.symbol===catalog?.instruments?.[0])||(actual.length===1?actual[0]:null);
          if(primary)items.push({kind:'signal',pairId:primary.id});else missing=true;
        }
        if(local.status==='complete')items=[...items.filter(s=>s.kind!=='portfolio'),...local.records.map(r=>({kind:'portfolio',portfolioId:r.id}))];
        items=[...new Map(items.map(s=>[selectionId(s),s])).values()];if(items.length>100){message('limit');return;}
        const dto=await loader.snapshot(handle,items,local.status==='complete'?local:null,before);if(!alive())return;if(dto.status!=='complete')throw Error('snapshot');
        const state=await owned.dispatch({type:'reconcile',subjects:dto.subjects,epoch,expectedRevision:before.revision});
        if(state.epoch!==epoch||!hasSubjects(state,dto.subjects)){message('concurrent');return;}
        const ingested=await owned.dispatch({type:'ingest',snapshot:dto.snapshot,epoch});if(!alive())return;labels=dto.labels;
        message(ingested.epoch===epoch&&ingested.checkStatus==='verified-current'?'ready':'concurrent');
      }catch(_){message('failure');}
      finally{busy=false;if(alive()){panel.setAttribute('aria-busy','false');draw();}}
    }
    root.addEventListener('storage',event=>{
      if(!alive())return;
      if(event.key===D.STORAGE_KEY&&!busy){localStore=store();owned=localStore;message('concurrent');draw();}
      else if(event.key==='favorites'){
        options.refreshFavorites?.();forgetFavorites(options.favoriteIds()).then(()=>{if(alive()){owned=localStore;draw();}});message('concurrent');
      }else if(event.key===root.PortfolioDefinitions.key)message('concurrent');
    },{signal});
    root.addEventListener('quantarena:portfolios-changed',()=>{if(alive())refresh();},{signal});
    draw();await refresh();
  }
  let latestFavorites=null;
  async function forgetFavorites(ids){
    latestFavorites=new Set(ids);localStore ||= store();
    if(localStore.getStatus().persistent)localStore=store();
    for(let attempt=0;attempt<3;attempt++){
      const before=localStore.getState(),subjects=Object.entries(before.subjects)
        .filter(([,s])=>!['signal','rank'].includes(s.kind)||latestFavorites.has(s.observed?.context.strategyId)).map(([id,s])=>({id,kind:s.kind}));
      if(subjects.length===Object.keys(before.subjects).length)return;
      const result=await localStore.dispatch({type:'reconcile',subjects,epoch:before.epoch,expectedRevision:before.revision});
      if(result.epoch!==before.epoch||hasSubjects(result,subjects))return;
    }
  }
  root.ObservationUpdatesUI={render,mount,favoritesChanged:forgetFavorites};
})(window);
