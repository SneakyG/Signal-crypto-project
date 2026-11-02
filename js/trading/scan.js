/* Quét realtime: mỗi 5 phút backtest các coin phổ biến nhất theo CHIẾN LƯỢC ĐANG CHỌN,
   xếp hạng theo cận dưới tỉ lệ thắng (Wilson) rồi tự chọn 3-4 coin đứng đầu để theo dõi và đặt lệnh chờ. */
const Scan={
  POP:['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','TRXUSDT','AVAXUSDT','LINKUSDT','DOTUSDT','LTCUSDT','BCHUSDT','NEARUSDT','UNIUSDT','ATOMUSDT','XLMUSDT','ETCUSDT','APTUSDT','SUIUSDT'],
  DEFAULT:['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT'],
  res:{},at:0,busy:false,done:0,total:0,MINN:8,
  key(){return Strat.active+'|'+UI.tf()},
  async run(){
    if(this.busy)return;this.busy=true;
    const tf=UI.tf(),st=Strat.cur(),impl=Strat.I(),k=this.key(),todo=this.POP.slice();
    this.done=0;this.total=todo.length;this.paintBar();
    const worker=async()=>{
      while(todo.length){
        const s=todo.shift();
        try{
          const D=await Sig.series(s,tf,3000),stamp=k+'|'+D.t[D.c.length-2],r=this.res[s];
          if(!r||r.stamp!==stamp)this.res[s]={stamp,...Backtest.pack(Backtest.run(D,impl,st.params))}; // chỉ tính lại khi có nến mới đóng
        }catch(e){if(!this.res[s])this.res[s]={err:1}}
        this.done++;this.paintBar()}};
    try{await Promise.all([worker(),worker(),worker(),worker()]);this.pick()}
    finally{this.busy=false;this.at=Date.now();this.paintBar();this.renderRank()}},
  sorted(){
    return this.POP.filter(s=>this.res[s]&&this.res[s].n!=null).map(s=>({s,...this.res[s]}))
      .sort((a,b)=>(b.n>=this.MINN)-(a.n>=this.MINN)||b.wil-a.wil||b.avg-a.avg)},
  pick(){
    const K=UI.topk(),f=this.sorted().filter(r=>r.n>=this.MINN).slice(0,K).map(r=>r.s);
    for(const s of this.DEFAULT)if(f.length<K&&!f.includes(s))f.push(s); // chưa đủ mẫu: bổ sung coin lớn nhất
    if(f.join()!==Sig.focus.join()){Sig.focus=f;Store.set('focus',f)}},
  paintBar(){
    const b=$('sbar'),t=$('stext');if(!b)return;
    b.style.width=(this.busy&&this.total?this.done/this.total*100:100)+'%';$('sb').classList.toggle('run',this.busy);
    t.textContent=this.busy?`Đang quét ${this.done}/${this.total} coin phổ biến theo chiến lược ${Strat.label(Strat.cur())}…`
      :this.at?`Đã quét ${this.total} coin lúc ${Fmt.hm(this.at)}, tự quét lại mỗi 5 phút. Đang theo dõi: ${Sig.focus.map(s=>Fmt.coin(s)).join(', ')}.`:'Chưa quét'},
  renderRank(){
    const el=$('rank');if(!el)return;const rows=this.sorted();
    $('nr').textContent=rows.length;
    put(el,rows.length?`<div class="rank">${rows.map(r=>{
      const sel=Sig.focus.includes(r.s),w=Math.max(2,Math.min(100,r.wil));
      return`<div class="rk2${sel?' sel':''}"><b>${coinLink(r.s,UI.tf())}</b><div class="bar2"><i style="width:${w}%"></i></div><span>${r.n<this.MINN?`<span class="mut">chưa đủ mẫu (${r.n} lệnh)</span>`:`${r.n} lệnh, thắng ${r.win.toFixed(0)}% (cận dưới ${r.wil.toFixed(0)}%), ${r.avg>=0?'+':''}${r.avg.toFixed(2)}R`}</span></div>`}).join('')}</div>`
      :'<div class="empty">Đang quét lần đầu…</div>')}
};
