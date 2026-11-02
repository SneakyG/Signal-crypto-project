/* Trang Tin tức: tự cập nhật mỗi 60 giây, đánh dấu tin MỚI, lọc theo coin và nhãn Tăng / Giảm / Trung lập.
   Tin mới về coin đang theo dõi hoặc đang có lệnh sẽ hiện thông báo dù bạn đang ở trang khác. */
const NewsPage={
  coin:'ALL',tone:'all',loaded:false,timer:null,next:0,
  init(){
    $('p-news').addEventListener('click',e=>{
      const c=e.target.closest&&e.target.closest('[data-nc]');if(c){this.coin=c.dataset.nc;this.render();return}
      const t=e.target.closest&&e.target.closest('[data-nt]');if(t){this.tone=t.dataset.nt;this.render()}});
    $('nrefresh').onclick=()=>this.load(true);
    setInterval(()=>this.load(false),6e4);setInterval(()=>this.clock(),1000)},
  clock(){const e=$('nclock');if(!e||!News.at)return;const s=Math.max(0,Math.round((News.at+6e4-Date.now())/1000));e.textContent=`Cập nhật ${Fmt.ago(News.at)} · lần tới sau ${s} giây`},
  async load(force){
    if(!this.loaded){this.loaded=true;put($('nlist'),'<div class="nlist">'+'<div class="nw sk"><i></i><i></i></div>'.repeat(5)+'</div>')}
    try{await News.load(true)}catch(e){News.err='Lỗi tải tin: '+e.message}
    const nw=News.newNow||[];
    if(nw.length){
      const watch=new Set([...Sig.focus,...Book.data.orders.filter(Book.isOpen).map(o=>o.s)].map(Fmt.coin)),hot=nw.filter(i=>i.coins.some(c=>watch.has(c)));
      if(!$('p-news').classList.contains('on'))$('nn').textContent=(+$('nn').textContent||0)+nw.length;
      for(const i of hot.slice(0,2))toast(`<b>Tin ${i.tone==='up'?'tăng':i.tone==='dn'?'giảm':'mới'} · ${i.coins.slice(0,2).join(', ')}</b><br>${esc(i.title)}`,i.tone==='nt'?'':i.tone)}
    this.render()},
  render(){
    if(!$('p-news').classList.contains('on')&&this.loaded&&News.items.length){this.clock();return}
    const all=News.items;this.clock();
    if(!all.length){if(News.err)put($('nlist'),`<div class="empty">${esc(News.err)}</div>`);return}
    const cnt={};for(const it of all)for(const c of it.coins)cnt[c]=(cnt[c]||0)+1;
    const coins=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    put($('nchips'),`<div class="fl"><button data-nc="ALL"${this.coin==='ALL'?' class="on"':''}>Tất cả (${all.length})</button>${coins.map(c=>`<button data-nc="${c}"${this.coin===c?' class="on"':''}>${c} (${cnt[c]})</button>`).join('')}</div>
      <div class="fl">${[['all','Mọi nhãn'],['up','Tăng'],['dn','Giảm'],['nt','Trung lập']].map(([k,t])=>`<button data-nt="${k}"${this.tone===k?' class="on"':''}>${t}</button>`).join('')}</div>`);
    const byCoin=this.coin==='ALL'?all:all.filter(i=>i.coins.includes(this.coin)),list=this.tone==='all'?byCoin:byCoin.filter(i=>i.tone===this.tone);
    const u=byCoin.filter(i=>i.tone==='up').length,d=byCoin.filter(i=>i.tone==='dn').length,n=byCoin.length-u-d,tot=byCoin.length||1;
    const srcs=Object.entries(News.src).map(([k,v])=>`${k} (${v})`).join(', ');
    put($('nsum'),`<div class="panel"><b>Tâm lý tin tức ${this.coin==='ALL'?'toàn thị trường':this.coin}</b>: <span class="up">${u} tin tăng</span>, <span class="dn">${d} tin giảm</span>, ${n} trung lập (trong ${byCoin.length} tin)
      <div class="sentbar"><i class="u" style="width:${u/tot*100}%"></i><i class="n" style="width:${n/tot*100}%"></i><i class="d" style="width:${d/tot*100}%"></i></div>
      <p class="note">Nhãn Tăng/Giảm do bảng tự gán theo từ khoá trong tiêu đề và mô tả, chỉ để tham khảo nhanh. Hãy đọc bài gốc trước khi quyết định.${srcs?' Nguồn: '+esc(srcs)+'.':''}</p></div>`);
    const lab={up:'Tin tăng',dn:'Tin giảm',nt:'Trung lập'};
    put($('nlist'),list.length?`<div class="nlist">${list.slice(0,80).map(i=>{const nw=News.fresh.has(i.link||i.title);return`<div class="nw ${i.tone==='nt'?'':i.tone}${nw?' new':''}"><a href="${esc(i.link)}" target="_blank" rel="noopener">${nw?'<span class="nbadge">MỚI</span> ':''}${esc(i.title)}</a>
      <div class="m"><span class="tag ${i.tone==='nt'?'':i.tone}">${lab[i.tone]}</span><span>${esc(i.src)} ✓</span><span>${Fmt.ago(i.t)}</span>${i.coins.slice(0,4).map(c=>`<span class="tag">${c}</span>`).join('')}</div>
      ${i.text?`<p>${esc(i.text.slice(0,180))}${i.text.length>180?'…':''}</p>`:''}</div>`}).join('')}</div>`:'<div class="empty">Không có tin nào khớp bộ lọc.</div>')}
};
