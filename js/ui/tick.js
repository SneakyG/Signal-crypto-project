/* Cập nhật giá và lãi/lỗ realtime mỗi 3 giây (không vẽ lại bảng, chỉ đổi chữ tại chỗ) */
const Tick={
  async run(){await Data.prices();this.paint()},
  paint(){
    document.querySelectorAll('[data-live]').forEach(el=>{
      const v=el.dataset.live,i=v.indexOf(':'),k=v.slice(0,i),id=v.slice(i+1);
      if(k==='p'){
        const p=Data.px[id];if(p==null)return;const t=Fmt.px(p),lp=el._p;el._p=p;
        if(el.textContent!==t){el.textContent=t;if(lp!=null&&lp!==p){el.classList.remove('fu','fd');void el.offsetWidth;el.classList.add(p>lp?'fu':'fd')}}
        return}
      const o=Book.byId(id),lv=o&&Book.live(o);if(!lv)return;
      if(k==='pc'){el.textContent=Fmt.pct(lv.pct);el.className='chip '+(lv.pct>0?'up':lv.pct<0?'dn':'')}
      else if(k==='pm'){el.textContent=Fmt.sgn(lv.pnl);el.className='chip '+(lv.pnl>0?'up':lv.pnl<0?'dn':'')}});
    if(typeof BookPage!=='undefined')BookPage.liveTotal()}
};
