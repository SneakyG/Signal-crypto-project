/* Trang Tin tức: tin từ các toà soạn crypto uy tín, lọc theo coin và theo nhãn Tăng / Giảm / Trung lập */
const NewsPage={
  coin:'ALL',tone:'all',loaded:false,
  init(){
    $('p-news').addEventListener('click',e=>{
      const c=e.target.closest&&e.target.closest('[data-nc]');if(c){this.coin=c.dataset.nc;this.render();return}
      const t=e.target.closest&&e.target.closest('[data-nt]');if(t){this.tone=t.dataset.nt;this.render()}});
    $('nrefresh').onclick=()=>this.load(true)},
  async load(force){
    this.loaded=true;put($('nlist'),'<div class="empty">Đang tải tin tức từ các nguồn uy tín…</div>');
    try{await News.load(force)}catch(e){News.err='Lỗi tải tin: '+e.message}
    this.render()},
  render(){
    const all=News.items;
    if(!all.length){put($('nlist'),`<div class="empty">${esc(News.err||'Chưa có tin.')}</div>`);put($('nchips'),'');put($('nsum'),'');return}
    const cnt={};for(const it of all)for(const c of it.coins)cnt[c]=(cnt[c]||0)+1;
    const coins=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);
    put($('nchips'),`<div class="fl"><button data-nc="ALL"${this.coin==='ALL'?' class="on"':''}>Tất cả (${all.length})</button>${coins.map(c=>`<button data-nc="${c}"${this.coin===c?' class="on"':''}>${c} (${cnt[c]})</button>`).join('')}</div>
      <div class="fl">${[['all','Mọi nhãn'],['up','Tăng'],['dn','Giảm'],['nt','Trung lập']].map(([k,t])=>`<button data-nt="${k}"${this.tone===k?' class="on"':''}>${t}</button>`).join('')}</div>`);
    const byCoin=this.coin==='ALL'?all:all.filter(i=>i.coins.includes(this.coin)),list=this.tone==='all'?byCoin:byCoin.filter(i=>i.tone===this.tone);
    const u=byCoin.filter(i=>i.tone==='up').length,d=byCoin.filter(i=>i.tone==='dn').length,n=byCoin.length-u-d,tot=byCoin.length||1;
    put($('nsum'),`<div class="panel"><b>Tâm lý tin tức ${this.coin==='ALL'?'toàn thị trường':this.coin}</b>: <span class="up">${u} tin tăng</span>, <span class="dn">${d} tin giảm</span>, ${n} trung lập (trong ${byCoin.length} tin)
      <div class="sentbar"><i class="u" style="width:${u/tot*100}%"></i><i class="n" style="width:${n/tot*100}%"></i><i class="d" style="width:${d/tot*100}%"></i></div>
      <p class="note">Nhãn Tăng/Giảm do bảng tự gán theo từ khoá trong tiêu đề và mô tả, chỉ để tham khảo nhanh. Hãy đọc bài gốc trước khi quyết định. Cập nhật lúc ${Fmt.hm(News.at)}.</p></div>`);
    const lab={up:'Tin tăng',dn:'Tin giảm',nt:'Trung lập'};
    put($('nlist'),list.length?`<div class="nlist">${list.slice(0,60).map(i=>`<div class="nw ${i.tone==='nt'?'':i.tone}"><a href="${esc(i.link)}" target="_blank" rel="noopener">${esc(i.title)}</a>
      <div class="m"><span class="tag ${i.tone==='nt'?'':i.tone}">${lab[i.tone]}</span><span>${esc(i.src)} ✓ nguồn uy tín</span><span>${Fmt.ago(i.t)}</span>${i.coins.slice(0,4).map(c=>`<span class="tag">${c}</span>`).join('')}</div>
      ${i.text?`<p>${esc(i.text.slice(0,170))}${i.text.length>170?'…':''}</p>`:''}</div>`).join('')}</div>`:'<div class="empty">Không có tin nào khớp bộ lọc. Các nguồn RSS miễn phí chỉ trả về khoảng 10 tin mới nhất mỗi nguồn; nhập khoá rss2json ở Cài đặt để lấy nhiều tin hơn.</div>')}
};
