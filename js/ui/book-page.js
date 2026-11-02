/* Trang Sổ lệnh: lệnh chờ khớp, lệnh đã khớp (lãi/lỗ chạy realtime), lịch sử đã đóng (lọc + sắp xếp, lãi/lỗ cố định),
   thống kê trong ngày, biểu đồ, nhật ký hoạt động và xuất Excel. Mọi bảng đều bấm vào tiêu đề cột để sắp xếp. */
const BookPage={
  flt:'all',
  init(){
    $('p-book').addEventListener('click',e=>{
      const c=e.target.closest&&e.target.closest('[data-cancel]');
      if(c){if(Book.cancel(c.dataset.cancel)){toast('Đã hủy lệnh chờ. Bạn có thể đặt lại ở Bảng tín hiệu.','up');Sig.render()}return}
      const f=e.target.closest&&e.target.closest('[data-flt]');if(f){this.flt=f.dataset.flt;this.render()}});
    $('xl').onclick=()=>this.export(Book.data);
    $('xlp').onclick=()=>Book.prev&&this.export(Book.prev);
    $('tiles').innerHTML=[['amt','Số tiền đặt lệnh'],['n','Số lệnh'],['gain','Số tiền lãi'],['loss','Số tiền lỗ'],['net','Tổng kết'],['live','Đang chạy (tạm tính)']]
      .map(([k,l])=>`<div class="tile"><i>${l}</i><b id="t-${k}">-</b><small id="t-${k}2"></small></div>`).join('')},
  side:z=>`<span class="${z.side==='LONG'?'up':'dn'}">${z.side}</span>`,
  chip:(v,t,live)=>`<span class="chip ${v>0?'up':v<0?'dn':''}"${live?` data-live="${live}"`:''}>${t}</span>`,
  liveTotal(){
    const e=$('t-live');if(!e)return;
    const l=Book.data.orders.filter(Book.isFilled).map(o=>Book.live(o)).filter(Boolean),s=l.reduce((a,x)=>a+x.pnl,0);
    e.textContent=Fmt.sgn(s);e.className=s>=0?'up':'dn';$('t-live2').textContent=`${l.length} lệnh đang chạy, giá cập nhật 3 giây/lần`},
  render(){
    const o=Book.data.orders,S=Book.stats(o),bal=UI.bal(),B=this,ms=z=>Data.MS[z.tf],px=z=>Data.px[z.s];
    $('nb').textContent=o.filter(Book.isOpen).length||'';
    $('bday').textContent=`Ngày ${Book.data.day.split('-').reverse().join('/')}. Tự xoá khi qua ngày mới.`;
    const T=(k,v,fmt,sub,c)=>{const e=$('t-'+k);tween(e,v,fmt);e.className=c||'';$('t-'+k+'2').textContent=sub};
    T('amt',S.amt,Fmt.usd,`${S.n-S.cn} lệnh đã vào`);
    T('n',S.n,v=>Math.round(v),`${S.op} mở, ${S.cl} đóng, ${S.cn} bỏ/hết hạn`);
    T('gain',S.gain,v=>v>0?Fmt.sgn(v):'$0.00',`${S.w} lệnh thắng (đạt TP1)`,'up');
    T('loss',S.loss,v=>v<0?Fmt.sgn(v):'$0.00',`${S.l} lệnh thua`,'dn');
    T('net',S.net,Fmt.sgn,`${bal?(S.net/bal*100).toFixed(2):0}% vốn, thắng ${S.rate.toFixed(0)}%`,S.net>=0?'up':'dn');
    this.liveTotal();
    const done=o.filter(z=>Book.isDone(z)).sort((a,b)=>(a.x||0)-(b.x||0));
    let c=0;put($('pnlc'),done.length?lineChart([0,...done.map(z=>c+=z.pnl)]):'<div class="empty">Biểu đồ lãi/lỗ lũy kế sẽ hiện khi có lệnh đóng.</div>');
    $('pcv').textContent=Fmt.sgn(S.net);$('pcv').className=S.net>=0?'up':'dn';
    // ---- Lệnh chờ khớp ----
    const pend=o.filter(z=>z.st==='P'),left=z=>Math.max(0,(z.P.W||3)-Math.floor((Date.now()-z.sigT-ms(z))/ms(z)));
    $('np').textContent=pend.length;
    Tbl.render('pend',$('tpend'),[
      {k:'ts',h:'Giờ đặt',v:z=>z.ts,f:z=>Fmt.hm(z.ts)},
      {k:'s',h:'Coin',v:z=>z.s,f:z=>coinLink(z.s,z.tf)},
      {k:'side',h:'Hướng',v:z=>z.side,f:B.side},
      {k:'amt',h:'Số tiền',v:z=>z.amt,f:z=>Fmt.usd(z.amt)},
      {k:'entry',h:'Giá chờ',v:z=>z.entry,f:z=>Fmt.px(z.entry)},
      {k:'now',h:'Giá hiện tại',v:z=>px(z)||0,f:z=>`<span data-live="p:${z.s}">${Fmt.px(px(z))}</span>`},
      {k:'gap',h:'Cách giá',v:z=>px(z)?Math.abs(px(z)-z.entry)/z.entry:0,f:z=>px(z)?Fmt.pct((px(z)-z.entry)/z.entry*100):'-'},
      {k:'sl',h:'Cắt lỗ',v:z=>z.sl,f:z=>Fmt.px(z.sl)},
      {k:'tp1',h:'TP1',v:z=>z.tp1,f:z=>Fmt.px(z.tp1)},
      {k:'left',h:'Còn hiệu lực',v:left,f:z=>left(z)+' nến'},
      {k:'strat',h:'Chiến lược',v:z=>z.strat.name,f:z=>`<span class="sub">${esc(z.strat.name)}</span>`},
      {k:'act',h:'Thao tác',f:z=>`<button class="bx dn" data-cancel="${z.id}" title="Hủy lệnh chờ để đặt lại với thiết lập khác">Hủy lệnh</button>`}
    ],pend,{def:{k:'ts',d:-1},empty:'<div class="empty">Không có lệnh chờ khớp. Bấm Đặt lệnh ở thẻ tín hiệu đang chờ khớp.</div>'});
    // ---- Lệnh đã khớp (lãi/lỗ realtime) ----
    const fill=o.filter(Book.isFilled),lv=z=>Book.live(z);
    $('nf').textContent=fill.length;
    Tbl.render('fill',$('tfill'),[
      {k:'ft',h:'Giờ khớp',v:z=>z.fillT||z.ts,f:z=>Fmt.hm(z.fillT||z.ts)},
      {k:'s',h:'Coin',v:z=>z.s,f:z=>coinLink(z.s,z.tf)},
      {k:'side',h:'Hướng',v:z=>z.side,f:B.side},
      {k:'amt',h:'Số tiền',v:z=>z.amt,f:z=>Fmt.usd(z.amt)},
      {k:'entry',h:'Giá vào',v:z=>z.entry,f:z=>Fmt.px(z.entry)},
      {k:'now',h:'Giá hiện tại',v:z=>px(z)||0,f:z=>`<span data-live="p:${z.s}">${Fmt.px(px(z))}</span>`},
      {k:'sl',h:'Cắt lỗ',v:z=>z.st==='H'?z.entry:z.sl,f:z=>z.st==='H'?`${Fmt.px(z.entry)} <span class="sub">đã dời về giá vào</span>`:Fmt.px(z.sl)},
      {k:'tp1',h:'TP1',v:z=>z.tp1,f:z=>Fmt.px(z.tp1)+(z.st==='H'?' ✓':'')},
      {k:'tp2',h:'TP2',v:z=>z.tp2,f:z=>Fmt.px(z.tp2)},
      {k:'pc',h:'Lãi/Lỗ %',v:z=>lv(z)?lv(z).pct:0,f:z=>lv(z)?B.chip(lv(z).pct,Fmt.pct(lv(z).pct),'pc:'+z.id):'-'},
      {k:'pm',h:'Lãi (+) / Lỗ (−)',v:z=>lv(z)?lv(z).pnl:0,f:z=>lv(z)?B.chip(lv(z).pnl,Fmt.sgn(lv(z).pnl),'pm:'+z.id):'-'},
      {k:'st',h:'Trạng thái',v:z=>ST[z.st],f:z=>`<span class="st ${z.st}">${ST[z.st]}</span>`},
      {k:'strat',h:'Chiến lược',v:z=>z.strat.name,f:z=>`<span class="sub">${esc(z.strat.name)}</span>`}
    ],fill,{def:{k:'ft',d:-1},empty:'<div class="empty">Chưa có lệnh nào khớp.</div>'});
    // ---- Lịch sử đã đóng: lọc theo kết quả ----
    const all=o.filter(z=>!Book.isOpen(z)),nc=all.filter(Book.isDone).length,nx=all.filter(Book.isCancel).length;
    const list=this.flt==='closed'?all.filter(Book.isDone):this.flt==='cancel'?all.filter(Book.isCancel):all;
    $('nh').textContent=all.length;
    put($('fl'),[['all','Tất cả',all.length],['closed','Đóng lệnh',nc],['cancel','Hết hạn / Bỏ lệnh',nx]].map(([k,t,n])=>`<button data-flt="${k}"${this.flt===k?' class="on"':''}>${t} (${n})</button>`).join(''));
    const dn=z=>Book.isDone(z),pct=z=>dn(z)?z.pnl/z.amt*100:0,sd=list.filter(dn),sNet=sd.reduce((a,z)=>a+z.pnl,0),sAmt=sd.reduce((a,z)=>a+z.amt,0),sPct=sAmt?sNet/sAmt*100:0;
    Tbl.render('hist',$('hist'),[
      {k:'x',h:'Giờ đóng',v:z=>z.x||0,f:z=>Fmt.hm(z.x||z.ts)},
      {k:'s',h:'Coin',v:z=>z.s,f:z=>coinLink(z.s,z.tf)},
      {k:'side',h:'Hướng',v:z=>z.side,f:B.side},
      {k:'amt',h:'Số tiền',v:z=>z.amt,f:z=>Fmt.usd(z.amt)},
      {k:'entry',h:'Giá vào',v:z=>z.entry,f:z=>Fmt.px(z.entry)},
      {k:'exit',h:'Giá thoát',v:z=>z.exit||0,f:z=>z.exit!=null?Fmt.px(z.exit):'-'},
      {k:'st',h:'Kết quả',v:z=>ST[z.st],f:z=>`<span class="st ${z.st}">${ST[z.st]}</span>${z.why&&z.st!=='S'?`<span class="sub">${esc(z.why)}</span>`:''}`},
      {k:'pc',h:'Lãi/Lỗ %',v:pct,f:z=>dn(z)?B.chip(pct(z),Fmt.pct(pct(z))):'-'},
      {k:'pm',h:'Lãi (+) / Lỗ (−)',v:z=>dn(z)?z.pnl:0,f:z=>dn(z)?B.chip(z.pnl,Fmt.sgn(z.pnl)):'-'},
      {k:'strat',h:'Chiến lược',v:z=>z.strat.name,f:z=>`<span class="sub">${esc(z.strat.name)}</span>`}
    ],list,{def:{k:'x',d:-1},empty:'<div class="empty">Chưa có lệnh nào trong mục này.</div>',
      foot:sd.length&&this.flt!=='cancel'?['Tổng','','','','','','',B.chip(sPct,Fmt.pct(sPct)),B.chip(sNet,Fmt.sgn(sNet)),'']:null});
    put($('actlog'),Book.data.log.length?Book.data.log.map(l=>`<p><time>${Fmt.hm(l.t)}</time>${esc(l.text)}</p>`).join(''):'<p class="mut">Chưa có hoạt động nào hôm nay.</p>');
    $('xlp').hidden=!Book.prev;if(Book.prev)$('xlp').textContent='Tải kết quả '+Book.prev.day.split('-').reverse().slice(0,2).join('/')},
  export(b){
    const S=Book.stats(b.orders),B=r=>(r.b=1,r),r2=x=>+x.toFixed(2);
    const H=B(['Giờ đặt','Giờ khớp','Coin','Khung','Hướng','Số tiền (USDT)','Giá vào','Giá thoát','Kết quả (R)','Lãi/Lỗ (%)','Lãi/Lỗ (USDT)','Trạng thái','Lý do','Chiến lược','Giờ đóng']);
    const rows=[B(['Sổ lệnh ngày',b.day]),['Số lệnh',S.n],['Số tiền đặt lệnh (USDT)',r2(S.amt)],['Số lệnh thắng (đạt TP1)',S.w],['Số lệnh thua',S.l],['Số lệnh bỏ / hết hạn',S.cn],['Số lệnh đang mở',S.op],
      ['Số tiền lãi (USDT)',r2(S.gain)],['Số tiền lỗ (USDT)',r2(S.loss)],B(['Tổng kết (USDT)',r2(S.net)]),['Tỉ lệ thắng (%)',r2(S.rate)],[],H,
      ...b.orders.slice().sort((a,c)=>a.ts-c.ts).map(z=>{const d=Book.isDone(z);
        return[Fmt.dt(z.ts),z.fillT?Fmt.dt(z.fillT):'',z.s,z.tf,z.side,z.amt,z.entry,z.exit!=null?z.exit:'',d?r2(z.rr):'',d?r2(z.pnl/z.amt*100):'',d?r2(z.pnl):'',ST[z.st],z.why||'',z.strat?z.strat.name:'',z.x?Fmt.dt(z.x):'']})];
    download(xlsx(rows),`so-lenh-${b.day}.xlsx`)}
};
