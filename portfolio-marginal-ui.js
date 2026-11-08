// Evidence-backed comparison worksheet. All personal definitions remain local.
(function(root) {
  'use strict';
  let previousAbort;
  const text={
    title:['What changes when one strategy changes?','增减一个策略，会改变什么？'],
    intro:['Compare the same shared dates, with independent strategy sleeves and explicit allocation costs.','在相同的共同日期内，比较独立策略组合，并单独计算配置调整费用。'],
    base:['Base portfolio','基础组合'],use:['Use builder weights','使用上方模拟器权重'],addBase:['Add to base','加入基础组合'],removeBase:['Remove from base','移出基础组合'],
    operation:['Experiment','比较操作'],addition:['Add a strategy','添加策略'],removal:['Remove a strategy','移除策略'],subject:['Candidate / component','候选策略／现有成分'],
    alpha:['Candidate share after addition (%)','添加后候选策略占比（%）'],bps:['Cost per one-way risky turnover (bp)','单边风险资产换手成本（基点）'],cadence:['Allocation rebalance','配置再平衡'],
    monthly:['Monthly','每月'],quarterly:['Quarterly','每季度'],never:['No scheduled rebalance','不定期再平衡'],window:['Calendar lookback','日历观察窗口'],calculate:['Calculate from evidence','使用证据计算'],
    loading:['Loading verified publication metadata…','正在核验发布索引…'],ready:['Choose the base and one change. Full records load only when you calculate.','选择基础组合和一个变动，点击计算后才加载完整记录。'],
    working:['Verifying complete records and calculating…','正在核验完整记录并计算…'],changed:['Settings changed. Calculate again to update the comparison.','设置已改变，请重新计算。'],
    unavailable:['Comparison unavailable','暂时无法比较'],empty:['Add at least one base component.','请先添加基础组合成分。'],weight:['Raw weight','原始权重'],
    limits:['Independent sleeves: no cross-strategy order netting. Synthetic exposure fees exclude financing, borrow, funding, taxes and market impact. Both paths are recalculated on the exact same shared closes; skipped native dates still compound inside each sleeve.','采用独立策略组合，不跨策略抵消交易。合成敞口费用不包含融资、借券、资金费、税费和市场冲击。前后路径均在完全相同的共同收盘日期重算；未出现在共同日期中的原生收益仍在各策略内复利累计。'],
    metric:['Metric','指标'],gb:['Before · gross','调整前·扣费前'],ga:['After · gross','调整后·扣费前'],nb:['Before · net','调整前·扣费后'],na:['After · net','调整后·扣费后'],delta:['Net: after − before','扣费后：后 − 前'],pp:['pp','个百分点'],
    totalReturn:['Total return','总收益'],cagr:['Annualized return','年化收益'],calendarLogVolatility:['Calendar-time log volatility','按日历时间计算的对数波动率'],maxDrawdown:['Maximum drawdown','最大回撤'],
    internal:['Internal strategy fees','策略内部费用'],outer:['Allocation adjustment fees','组合配置费用'],totalFees:['Total fees paid','已付费用合计'],feesNote:['Fees are per unit of initial portfolio capital. The initial transfer fee is included; the curve is not rebased to hide it. Paid fees differ from terminal wealth drag.','费用以每单位组合初始资金计。计入首次配置调整费，曲线不会重新归一化来隐藏该费用。已付费用与期末财富差额不是同一指标。'],
    dates:['Shared closes','共同收盘日期'],zero:['All base weights are zero; equal weights were used.','基础权重全为零，已使用等权配置。'],noop:['The allocation is unchanged; before and after are identical.','配置未改变，前后结果完全相同。'],
    sample:['Curves are display samples; metrics and downloadable results use every shared interval. Solid lines: net. Dashed lines: gross.','曲线为展示采样，指标和下载结果使用全部共同区间。实线为扣费后，虚线为扣费前。'],
    scroll:['Swipe tables sideways, or focus them and use arrow keys, to see all comparison columns.','左右滑动表格，或聚焦后使用方向键，查看全部对比列。'],
    noDownside:['No negative base-return intervals: downside correlation is unavailable.','基础组合没有负收益区间，无法计算下跌期相关性。'],
    fewDownside:['Fewer than three downside intervals: correlation is unavailable.','下跌区间不足三个，无法计算相关性。'],
    constant:['Constant returns in the downside sample: correlation is undefined.','下跌样本中的收益没有变化，相关性未定义。'],
    cashBase:['The base has no risky target exposure at the last shared close; overlap is unavailable.','最后一个共同收盘时点，基础组合没有风险资产目标敞口，无法计算重合率。'],
    cashSubject:['The compared strategy has no risky target exposure at the last shared close; overlap is unavailable.','最后一个共同收盘时点，比较策略没有风险资产目标敞口，无法计算重合率。'],
    noMonths:['There are no complete shared-close monthly periods.','没有完整的共同收盘月度区间。'],
    analysis:['Downside and exposure overlap','下跌期关系与敞口重合'],downside:['Downside correlation (downside / all intervals)','下跌期相关性（下跌／全部区间）'],months:['Joint losing months / complete months','共同亏损月份／完整月份'],overlap:['Signed exposure overlap','按多空方向计算的敞口重合'],opposed:['Opposing exposure','相反方向敞口'],recovery:['Peak-to-recovery days','从高点到恢复的天数'],ongoing:['Ongoing or unavailable','尚未恢复或无法计算'],
    asset:['Asset','资产'],baseLong:['Base long','基础多头'],baseShort:['Base short','基础空头'],subjectLong:['Subject long','比较策略多头'],subjectShort:['Subject short','比较策略空头'],
    provenance:['Dates, source pins and fee ledger','日期、来源版本与费用明细'],download:['Download full result JSON','下载完整结果 JSON'],share:['Create pinned share link','生成固定版本分享链接'],shareNote:['Only copy/send this link if you want to share its strategy selections and weights. Names are never included.','此链接包含策略选择与权重，仅在愿意分享时复制或发送；不会包含本地名称。'],
    saved:['Saved on this browser','保存在此浏览器'],name:['Local name','本地名称'],save:['Save verified experiment','保存已验证实验'],load:['Load','载入'],erase:['Delete saved definition','删除已保存定义'],noSaved:['No saved definitions.','暂无已保存定义。'],stored:['Saved locally.','已保存在本地。'],historical:['Pinned historical publication','固定的历史发布版本'],current:['Current verified publication','当前已核验发布版本']
  };
  const lang=()=>typeof root.getLang==='function' && root.getLang()==='zh' ? 1:0;
  const t=key=>text[key][lang()];
  function element(tag,value,attrs={}) { const el=document.createElement(tag);if(value!==undefined)el.textContent=value;Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el; }
  function render() {
    const options=values=>values.map(v=>`<option value="${v}">${text[v]?t(v):v}</option>`).join('');
    return `<section class="section pm-worksheet" id="pm-app" data-private-local aria-busy="true">
      <div class="section-header"><div><h2>${t('title')}</h2><p>${t('intro')}</p></div></div>
      <div class="card"><h3>${t('base')}</h3><div class="pm-actions"><button type="button" id="pm-use">${t('use')}</button><select id="pm-base-choice" aria-label="${t('base')}"></select><button type="button" id="pm-add-base">${t('addBase')}</button></div><div id="pm-base"></div>
      <div class="pm-controls">
        <label>${t('operation')}<select id="pm-operation">${options(['addition','removal'])}</select></label>
        <label>${t('subject')}<select id="pm-subject"></select></label>
        <label id="pm-alpha-label">${t('alpha')}<input id="pm-alpha" type="number" min="0" max="100" step="1" value="20"></label>
        <label>${t('bps')}<select id="pm-bps">${options(['0','5','10','25'])}</select></label>
        <label>${t('cadence')}<select id="pm-cadence">${options(['monthly','quarterly','never'])}</select></label>
        <label>${t('window')}<select id="pm-window">${options(['1M','3M','6M','1Y','3Y','5Y','Max'])}</select></label>
      </div><p class="small-note">${t('limits')}</p><button class="button primary" id="pm-calculate" type="button" disabled>${t('calculate')}</button><p id="pm-status" role="status" aria-live="polite">${t('loading')}</p></div>
      <div id="pm-results" hidden></div><div class="card pm-private-actions"><button type="button" id="pm-share" disabled>${t('share')}</button><input id="pm-share-url" readonly hidden aria-label="${t('share')}"><p class="small-note">${t('shareNote')}</p><h3>${t('saved')}</h3><label>${t('name')}<input id="pm-name" maxlength="80" autocomplete="off"></label><button type="button" id="pm-save" disabled>${t('save')}</button><div id="pm-saved"></div></div>
      </section>`;
  }
  async function mount(getBuilder) {
    const app=document.getElementById('pm-app'); if(!app)return;
    previousAbort?.abort();const lifetime=new AbortController();previousAbort=lifetime;
    const id=name=>app.querySelector('#pm-'+name), setStatus=value=>{id('status').textContent=value;};
    const D=root.PortfolioDefinitions, loader=root.PortfolioEvidence?.createLoader(), engine=root.PortfolioMarginal;
    if(!D||!loader||!engine){setStatus(t('unavailable'));return;}
    const store=root.PortfolioSavedDefinitions;
    let snapshot,base=[],verified=null,savedId=null,generation=0,calculation=null;
    const label=ref=>`${ref.strategyId} · ${ref.symbol} · ${ref.kind==='basket'?'['+ref.assets.join(' / ')+']':ref.assets.join(' / ')}`;
    const alive=()=>app.isConnected&&!lifetime.signal.aborted;
    function invalidate() { generation++;calculation?.abort();verified=null;id('results').hidden=true;id('share').disabled=true;id('save').disabled=true;id('share-url').hidden=true;id('calculate').disabled=snapshot?.status!=='complete';app.setAttribute('aria-busy','false');setStatus(t('changed')); }
    function populate(select,refs,chosen) { select.replaceChildren(...refs.map(ref=>element('option',label(ref),{value:ref.runId})));if(refs.some(r=>r.runId===chosen))select.value=chosen; }
    function showBase() {
      id('base').replaceChildren();
      if(!base.length)id('base').append(element('p',t('empty'),{class:'muted'}));
      base.forEach((ref,index)=>{
        const row=element('div',undefined,{class:'pm-base-row'}), name=element('span',label(ref));
        const input=element('input',undefined,{type:'number',min:'0',max:'1000000',step:'0.5','aria-label':t('weight')+' '+label(ref)});input.value=ref.weight;
        input.addEventListener('input',()=>{base[index].weight=input.value==='' ? NaN:Number(input.value);invalidate();});
        const remove=element('button',t('removeBase'),{type:'button'});remove.addEventListener('click',()=>{base.splice(index,1);invalidate();showBase();});
        row.append(name,input,remove);id('base').append(row);
      });
      const choice=id('subject').value;
      populate(id('subject'),id('operation').value==='removal' ? base : (snapshot?.selections||[]).filter(r=>r.status==='complete'),choice);
      id('alpha-label').hidden=id('operation').value==='removal';
    }
    async function savedList() {
      const state=await store.list();if(!alive())return;
      const box=id('saved');box.replaceChildren();
      if(state.status!=='complete'){box.append(element('p',t('unavailable')+': '+state.reason));return;}
      if(!state.records.length)box.append(element('p',t('noSaved'),{class:'muted'}));
      state.records.forEach(record=>{
        const row=element('div',undefined,{class:'pm-actions'}), load=element('button',t('load'),{type:'button'}),erase=element('button',t('erase'),{type:'button'});
        load.addEventListener('click',()=>loadDefinition(record.definition,record.id,record.name));
        erase.addEventListener('click',async()=>{const result=await store.remove(record.id);if(!alive())return;if(result.status!=='complete')setStatus(t('unavailable')+': '+result.reason);else{if(savedId===record.id)savedId=null;await savedList();}});
        row.append(element('span',record.name),load,erase);box.append(row);
      });
    }
    function useBuilder() {
      if(snapshot?.status!=='complete')throw new Error(t('unavailable'));
      const legacy=getBuilder?.() || {entries:[]};
      const next=(legacy.entries||[]).map(entry=>{
        const matches=snapshot.selections.filter(ref=>ref.status==='complete'&&ref.strategyId===entry.strategyId&&ref.symbol===legacy.instrument);
        if(matches.length!==1)throw new Error('Builder component has no unique verified run: '+entry.strategyId);
        return {...matches[0],weight:entry.weight};
      });
      if(next.length>10)throw new Error('Choose at most ten base sleeves');
      base=next;savedId=null;invalidate();showBase();
      if(!base.length)setStatus(t('empty'));
    }
    function table(headers,rows) {
      const wrap=element('div',undefined,{class:'pm-table-wrap',tabindex:'0'}),table=element('table'),head=element('tr');
      headers.forEach(value=>head.append(element('th',value,{scope:'col'})));const thead=element('thead');thead.append(head);table.append(thead);
      const body=element('tbody');rows.forEach(values=>{const row=element('tr');values.forEach((value,i)=>row.append(element(i?'td':'th',value,i?{}:{scope:'row'})));body.append(row);});table.append(body);wrap.append(table);return wrap;
    }
    function display(result,definition) {
      const box=id('results');box.replaceChildren();box.hidden=false;box.className='card pm-result';
      const fmt=value=>typeof value==='number'&&Number.isFinite(value)?(100*value).toFixed(2)+'%':'—';
      const num=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(4):'—';
      const paths=['grossBefore','grossAfter','netBefore','netAfter'];
      box.append(element('h3',`${t('dates')}: ${result.dates[0]} → ${result.dates.at(-1)} (${result.dates.length})`));
      box.append(element('p',t('scroll'),{class:'small-note'}));
      if(result.context.allZeroEqualWeightFallback)box.append(element('p',t('zero')));
      if(result.context.exactAllocationNoOp)box.append(element('p',t('noop')));
      const metrics=['totalReturn','cagr','calendarLogVolatility','maxDrawdown'];
      const rows=metrics.map(key=>[t(key),...paths.map(p=>fmt(result.paths[p].metrics[key])),Number.isFinite(result.deltas.net[key])?`${(100*result.deltas.net[key]).toFixed(2)} ${t('pp')}`:'—']);
      for(const [key,name] of [['totalInternalFeesPaid','internal'],['totalOuterFeesPaid','outer'],['totalFeesPaid','totalFees']])rows.push([t(name),...paths.map(p=>num(result.paths[p][key])),num(result.paths.netAfter[key]-result.paths.netBefore[key])]);
      rows.push([t('recovery'),...paths.map(p=>result.paths[p].metrics.recovery.peakToRecoveryDays ?? t('ongoing')),'—']);
      box.append(table([t('metric'),t('gb'),t('ga'),t('nb'),t('na'),t('delta')],rows),element('p',t('feesNote'),{class:'small-note'}));
      const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 720 260');svg.setAttribute('role','img');svg.setAttribute('aria-label',t('title'));svg.classList.add('pm-chart');
      const values=paths.flatMap(p=>result.paths[p].wealth),min=values.reduce((a,b)=>Math.min(a,b),1),max=values.reduce((a,b)=>Math.max(a,b),1),span=max-min||1;
      for(const value of [...new Set([min,1,max])]){const y=232-208*(value-min)/span,line=document.createElementNS(ns,'line');line.setAttribute('x1','72');line.setAttribute('x2','696');line.setAttribute('y1',y);line.setAttribute('y2',y);line.setAttribute('stroke','var(--stroke)');svg.append(line);const label=document.createElementNS(ns,'text');label.setAttribute('x','64');label.setAttribute('y',y+4);label.setAttribute('text-anchor','end');label.setAttribute('fill','var(--muted)');label.textContent=value.toFixed(3);svg.append(label);}
      paths.forEach((p,j)=>{const line=document.createElementNS(ns,'polyline'),wealth=result.paths[p].wealth;const count=Math.min(256,wealth.length);const indices=[...new Set(Array.from({length:count},(_,i)=>Math.round(i*(wealth.length-1)/(count-1))))];line.setAttribute('points',indices.map(i=>`${72+624*i/(wealth.length-1)},${232-208*(wealth[i]-min)/span}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke',j%2?'var(--accent-2)':'var(--accent)');line.setAttribute('stroke-width',j<2?'1.5':'2.5');if(j<2)line.setAttribute('stroke-dasharray','5 4');svg.append(line);});
      const legend=element('div',undefined,{class:'pm-legend'});['gb','ga','nb','na'].forEach((key,i)=>legend.append(element('span',t(key),{class:`pm-key ${i%2?'pm-after':'pm-before'} ${i<2?'pm-gross':''}`})));
      box.append(legend,svg,element('p',t('sample'),{class:'small-note'}));
      const analysis=(result.candidateAnalysis||result.removedAnalysis)?.net;
      box.append(element('h3',t('analysis')));
      if(analysis?.status==='complete') {
        box.append(table([t('metric'),t('na')],[
          [t('downside'),`${num(analysis.downsideCorrelation.correlation)} · ${analysis.downsideCorrelation.downsideCount} / ${analysis.downsideCorrelation.totalIntervals}`],
          [t('months'),`${analysis.jointLosingMonths.jointLosingCount ?? '—'} / ${analysis.jointLosingMonths.completeCount ?? 0}`],
          [t('overlap'),fmt(analysis.latestOverlap.signedJaccard)], [t('opposed'),num(analysis.latestOverlap.opposingNotional)]
        ]));
        const reasons={'no-downside':'noDownside','too-few-pairs':'fewDownside','constant-return':'constant','cash-only-base':'cashBase','cash-only-candidate':'cashSubject','no-complete-monthly-periods':'noMonths'};
        for(const metric of [analysis.downsideCorrelation,analysis.jointLosingMonths,analysis.latestOverlap])if(metric.status==='unavailable'&&reasons[metric.reason])box.append(element('p',t(reasons[metric.reason]),{class:'small-note'}));
        box.append(table([t('asset'),t('baseLong'),t('baseShort'),t('subjectLong'),t('subjectShort')],analysis.latestOverlap.assets.map(row=>[row.asset,...['baseLong','baseShort','candidateLong','candidateShort'].map(key=>fmt(row[key]))])));
      } else box.append(element('p',t('unavailable')+': '+(analysis?.reason||'unchanged allocation')));
      const detail=element('details'),summary=element('summary',t('provenance'));
      detail.append(summary,element('pre',JSON.stringify({experimentId:result.experimentId,definition,context:result.context,allocationFees:{before:result.paths.netBefore.outerEvents,after:result.paths.netAfter.outerEvents}},null,2)));box.append(detail);
      const download=element('button',t('download'),{type:'button',id:'pm-download'});download.addEventListener('click',()=>{
        const url=URL.createObjectURL(new Blob([JSON.stringify({definition,result},null,2)],{type:'application/json'}));const a=element('a',undefined,{href:url,download:'quantarena-portfolio-'+result.experimentId.slice(0,12)+'.json'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
        document.dispatchEvent(new CustomEvent("qa:download-ready", { detail: { anchor: download } }));
      });box.append(download);
    }
    async function calculate() {
      invalidate(); const token=generation;calculation=new AbortController();const abort=()=>calculation?.abort();lifetime.signal.addEventListener('abort',abort,{once:true});
      setStatus(t('working'));id('calculate').disabled=true;app.setAttribute('aria-busy','true');
      try {
        if(snapshot?.status!=='complete')throw new Error(t('unavailable'));
        if(!base.length)throw new Error(t('empty'));
        const operation=id('operation').value,alpha=Number(id('alpha').value)/100;
        if(base.some(r=>!Number.isFinite(r.weight)||r.weight<0||r.weight>1e6))throw new Error('Invalid base weight');
        if(operation==='addition'&&(id('alpha').value===''||!Number.isFinite(alpha)||alpha<0||alpha>1))throw new Error('Invalid candidate fraction');
        const candidate=snapshot.selections.find(r=>r.runId===id('subject').value),baseInput=base.map(r=>({...r,assets:r.assets.slice()}));
        const refs=[...baseInput];if(operation==='addition'&&alpha>0&&candidate&&!refs.some(r=>r.runId===candidate.runId))refs.push(candidate);
        const loaded=await loader.loadSelection(snapshot,refs,{signal:calculation.signal});if(loaded.status!=='complete')throw new Error(loaded.reason);
        const byRun=new Map(loaded.references.map(r=>[r.runId,r]));
        const definition={schemaVersion:1,modelId:D.modelId,indexSha256:loaded.expectedIndexSha256,operation,base:baseInput.map(r=>({...byRun.get(r.runId),weight:r.weight})),bps:Number(id('bps').value),cadence:id('cadence').value,window:id('window').value};
        if(operation==='addition'){definition.alpha=alpha;definition.candidate=alpha>0?byRun.get(candidate?.runId):null;}else definition.removeRunId=id('subject').value;
        const normalized=D.validate(definition),settings={sourceIndexBytes:loaded.sourceIndexBytes,expectedIndexSha256:loaded.expectedIndexSha256,bps:normalized.bps,cadence:normalized.cadence,window:normalized.window};
        const result=operation==='addition'?await engine.compareAddition(normalized.base,normalized.candidate,normalized.alpha,loaded.bundles,settings):await engine.compareRemoval(normalized.base,normalized.removeRunId,loaded.bundles,settings);
        if(!alive()||token!==generation)return;if(result.status!=='complete')throw new Error(result.reason);
        verified={definition:normalized,result};display(result,normalized);id('share').disabled=false;id('save').disabled=false;setStatus(`${snapshot.mode==='historical'?t('historical'):t('current')} · ${snapshot.indexSha256.slice(0,12)}`);
      }catch(error){if(alive()&&token===generation)setStatus(t('unavailable')+': '+error.message);}
      finally{lifetime.signal.removeEventListener('abort',abort);if(alive()&&token===generation){id('calculate').disabled=false;app.setAttribute('aria-busy','false');}}
    }
    async function loadDefinition(value,idValue=null,name='') {
      invalidate(); const token=generation;snapshot=null;base=[];showBase();id('calculate').disabled=true;savedId=idValue;id('name').value=name;setStatus(t('loading'));app.setAttribute('aria-busy','true');
      try {const definition=D.validate(value),loaded=await loader.loadSnapshot({indexSha256:definition.indexSha256,signal:lifetime.signal});if(!alive()||token!==generation)return;if(loaded.status!=='complete')throw new Error(loaded.reason);snapshot=loaded;base=definition.base;
        populate(id('base-choice'),snapshot.selections.filter(r=>r.status==='complete'));
        for(const key of ['operation','bps','cadence','window'])id(key).value=definition[key];id('alpha').value=(definition.alpha??.2)*100;showBase();id('subject').value=definition.candidate?.runId||definition.removeRunId||id('subject').value;await calculate();
      }catch(error){if(alive()&&token===generation){app.setAttribute('aria-busy','false');setStatus(t('unavailable')+': '+error.message);}}
    }
    id('calculate').addEventListener('click',calculate);
    id('use').addEventListener('click',()=>{try{useBuilder();}catch(error){setStatus(t('unavailable')+': '+error.message);}});
    id('add-base').addEventListener('click',()=>{if(!snapshot)return;const ref=snapshot.selections.find(r=>r.runId===id('base-choice').value);if(ref&&!base.some(r=>r.runId===ref.runId)&&base.length<10){base.push({...ref,weight:100});invalidate();showBase();}});
    for(const key of ['operation','subject','alpha','bps','cadence','window'])id(key).addEventListener('change',()=>{invalidate();if(key==='operation')showBase();});
    id('alpha').addEventListener('input',invalidate);
    id('share').addEventListener('click',()=>{if(!verified)return;try{const url=new URL(location.href);url.searchParams.set('page','compare');url.searchParams.set('pm',D.encode(verified.definition));const field=id('share-url');field.value=url.toString();field.hidden=false;field.focus();field.select();}catch(error){setStatus(t('unavailable')+': '+error.message);}});
    id('save').addEventListener('click',async()=>{if(!verified)return;const result=await store.save(id('name').value,verified.definition,savedId);if(!alive())return;if(result.status==='complete'){savedId=result.record.id;setStatus(t('stored'));await savedList();}else setStatus(t('unavailable')+': '+result.reason);});
    root.addEventListener('storage',event=>{if(event.key===D.key)savedList();},{signal:lifetime.signal});
    id('bps').value='10';id('window').value='5Y';await savedList();
    const shared=new URLSearchParams(location.search).get('pm');
    if(shared){try{await loadDefinition(D.decode(shared));}catch(error){setStatus(t('unavailable')+': '+error.message);}return;}
    snapshot=await loader.loadSnapshot({signal:lifetime.signal});if(!alive())return;
    if(snapshot.status!=='complete'){app.setAttribute('aria-busy','false');setStatus(t('unavailable')+': '+snapshot.reason);return;}
    populate(id('base-choice'),snapshot.selections.filter(r=>r.status==='complete'));
    try{useBuilder();}catch(error){setStatus(t('unavailable')+': '+error.message);}
    id('calculate').disabled=false;app.setAttribute('aria-busy','false');if(base.length)setStatus(t('ready'));
  }
  root.PortfolioMarginalUI={render,mount};
})(window);
