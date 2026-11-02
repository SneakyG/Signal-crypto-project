/* Cập nhật giá và lãi/lỗ realtime mỗi 3 giây (không vẽ lại bảng, chỉ đổi chữ tại chỗ) + dải giá chạy ngang đầu trang */
const Tick={
  async run(){await Data.prices();Data.stats24();if(Book.liveTick())Sig.render();this.paint();NetBar.paint()},
  paint(){
    document.querySelectorAll('[data-live]').forEach(el=>{
      const v=el.dataset.live,i=v.indexOf(':'),k=v.slice(0,i),id=v.slice(i+1);
      if(k==='p'){
        const p=Data.px[id];if(p==null)return;const t=Fmt.px(p),lp=el._p;el._p=p;
        if(el.textContent!==t){el.textContent=t;if(lp!=null&&lp!==p){el.classList.remove('fu','fd');void el.offsetWidth;el.classList.add(p>lp?'fu':'fd')}}
        return}
      if(k==='g'){const o=Book.byId(id);if(!o||Data.px[o.s]==null)return;const t=Fmt.pct((Data.px[o.s]-o.entry)/o.entry*100);if(el.textContent!==t)el.textContent=t;return}
      if(k==='h2'){const o=Book.byId(id);if(!o||Data.px[o.s]==null)return;const v=BookPage.halves(o,BookPage.pos(o,Data.px[o.s])).b;el.textContent=Fmt.sgn(v);el.className=v>=0?'up':'dn';return}
      if(k==='rl'){const o=Book.byId(id);if(!o||Data.px[o.s]==null)return;const r=BookPage.pos(o,Data.px[o.s]);el.style.setProperty('--p',BookPage.pct(o,r).toFixed(1)+'%');el.classList.toggle('neg',r<0);return}
      if(k==='c'){const c=Data.chg[id];if(c==null)return;el.textContent=Fmt.pct(c);el.className='tc '+(c>=0?'up':'dn');return}
      const o=Book.byId(id),lv=o&&Book.live(o);if(!lv)return;
      if(k==='pc'){el.textContent=Fmt.pct(lv.pct);el.className='chip '+(lv.pct>0?'up':lv.pct<0?'dn':'')}
      else if(k==='pm'){el.textContent=Fmt.sgn(lv.pnl);el.className='chip '+(lv.pnl>0?'up':lv.pnl<0?'dn':'')}
      else if(k==='pb'){el.textContent=Fmt.pct(lv.pctBal)+' vốn';el.className='sub '+(lv.pctBal>=0?'up':'dn')}});
    if(typeof BookPage!=='undefined')BookPage.liveTotal()}
};
const Tape={
  sig:'',
  render(){
    const el=$('tape');if(!el)return;
    const list=[...new Set(['BTCUSDT','ETHUSDT',...Sig.focus,...Book.data.orders.filter(Book.isOpen).map(o=>o.s)])],sig=list.join();
    if(sig===this.sig)return;this.sig=sig;
    const one=list.map(s=>`<a class="ti" href="${TV(s,UI.tf())}" target="_blank" rel="noopener"><b>${Fmt.coin(s)}</b><span data-live="p:${s}">${Fmt.px(Data.px[s])}</span><span class="tc" data-live="c:${s}"></span></a>`).join('');
    const k=Math.max(1,Math.ceil(10/list.length)),half=one.repeat(k); // đủ dài để dải chạy liền mạch
    el.innerHTML=`<div class="tt" style="--n:${list.length*k}">${half}${half}</div>`;Tick.paint()}
};
