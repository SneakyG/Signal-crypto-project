/* Quét realtime: mỗi 5 phút backtest các coin phổ biến nhất trên Binance Futures, xếp hạng theo cận dưới tỉ lệ thắng (Wilson)
   rồi tự chọn 3–10 coin đứng đầu để theo dõi và đặt lệnh chờ.
   Chế độ "Tự động": với mỗi coin thử mọi chiến lược (bản gốc và các bản đã lưu ✓70%/★90%) và giữ chiến lược thắng cao nhất cho coin đó. */
const Scan={
  POP:['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','TRXUSDT','AVAXUSDT','LINKUSDT','DOTUSDT','LTCUSDT','BCHUSDT','NEARUSDT','UNIUSDT',
    'ATOMUSDT','XLMUSDT','ETCUSDT','APTUSDT','SUIUSDT','FILUSDT','ARBUSDT','OPUSDT','INJUSDT','AAVEUSDT','TONUSDT','HBARUSDT','ICPUSDT','SEIUSDT','TIAUSDT'],
  DEFAULT:['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','LINKUSDT','AVAXUSDT','LTCUSDT'],
  res:{},best:{},at:0,busy:false,done:0,total:0,MINN:8,
  // Danh sách coin được quét và các chiến lược thử cho từng coin
  universe(){const o=Strat.isAuto()?null:Strat.I().only;return o||this.POP},
  cands(s){
    if(!Strat.isAuto())return[Strat.cur()];
    return Strat.usable().filter(v=>Strat.fits(v,s,UI.tf()))},
  score(r){return r&&r.n!=null?(r.n>=this.MINN?1e4:0)+r.wil*10+r.avg:-1},
  async run(){
    if(this.busy)return;this.busy=true;
    const tf=UI.tf(),todo=this.universe().slice(),mode=Strat.active;
    this.done=0;this.total=todo.length;this.paintBar();
    const worker=async()=>{
      while(todo.length){
        const s=todo.shift();
        try{
          const D=await Sig.series(s,tf,3000),last=D.t[D.c.length-2];let top=null;
          for(const v of this.cands(s)){
            const k=`${v.id}|${tf}|${last}|${JSON.stringify(v.params)}`,c=this.res[s+'#'+v.id];
            const r=c&&c.k===k?c:(this.res[s+'#'+v.id]={k,v:v.id,...Backtest.pack(Backtest.run(D,Strat.impl[v.base],v.params))}); // chỉ tính lại khi có nến mới
            if(!top||this.score(r)>this.score(top))top=r;
            await sleep(0)}
          if(top){this.res[s]={...top,strat:top.v};this.best[s]=top.v}
        }catch(e){if(!this.res[s])this.res[s]={err:1}}
        this.done++;this.paintBar()}};
    try{await Promise.all([worker(),worker(),worker()]);if(mode===Strat.active)this.pick()}
    finally{this.busy=false;this.at=Date.now();this.paintBar();this.renderRank()}},
  sorted(){return this.universe().filter(s=>this.res[s]&&this.res[s].n!=null).map(s=>({s,...this.res[s]})).sort((a,b)=>this.score(b)-this.score(a))},
  pick(){
    const K=Strat.isAuto()?UI.topk():Math.min(UI.topk(),this.universe().length),f=this.sorted().filter(r=>r.n>=this.MINN).slice(0,K).map(r=>r.s);
    for(const s of this.DEFAULT)if(f.length<K&&this.universe().includes(s)&&!f.includes(s))f.push(s); // chưa đủ mẫu: bổ sung coin lớn nhất
    if(f.join()!==Sig.focus.join()){Sig.focus=f;Store.set('focus',f)}},
  paintBar(){
    const b=$('sbar'),t=$('stext');if(!b)return;
    b.style.width=(this.busy&&this.total?this.done/this.total*100:100)+'%';$('sb').classList.toggle('run',this.busy);
    const mode=Strat.isAuto()?'chế độ Tự động (chiến lược tốt nhất cho từng coin)':Strat.label(Strat.cur());
    t.textContent=this.busy?`Đang quét ${this.done}/${this.total} coin theo ${mode}…`
      :this.at?`Đã quét ${this.total} coin lúc ${Fmt.hm(this.at)}, tự quét lại mỗi 5 phút. Đang theo dõi ${Sig.focus.length} coin: ${Sig.focus.map(s=>Fmt.coin(s)).join(', ')}.`:'Chưa quét'},
  renderRank(){
    const el=$('rank');if(!el)return;const rows=this.sorted();
    $('nr').textContent=rows.length;
    put(el,rows.length?`<div class="rank">${rows.map((r,i)=>{
      const sel=Sig.focus.includes(r.s),w=Math.max(2,Math.min(100,r.wil)),v=Strat.byId(r.strat);
      return`<div class="rk2${sel?' sel':''}"><b><span class="rkn">${i+1}</span>${coinLink(r.s,UI.tf())}</b><div class="bar2"><i style="width:${w}%"></i></div><span>${r.n<this.MINN?`<span class="mut">chưa đủ mẫu (${r.n} lệnh)</span>`:`${r.n} lệnh, thắng ${r.win.toFixed(0)}% (cận dưới ${r.wil.toFixed(0)}%), ${r.avg>=0?'+':''}${r.avg.toFixed(2)}R`}${Strat.isAuto()&&v?`<span class="sub">${esc(Strat.label(v))}</span>`:''}</span></div>`}).join('')}</div>`
      :'<div class="empty">Đang quét lần đầu…</div>')}
};
