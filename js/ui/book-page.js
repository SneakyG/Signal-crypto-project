/* Trang Sổ lệnh: lệnh chờ khớp, lệnh đã khớp (lãi/lỗ realtime, đòn bẩy, % rủi ro, giá thanh lý; dòng đạt TP1 được tô sáng),
   lịch sử đã đóng (lọc + sắp xếp), thống kê trong ngày, biểu đồ, nhật ký và xuất Excel chuyên nghiệp. */
const BookPage={
  flt:'all',
  init(){
    $('p-book').addEventListener('click',e=>{
      const c=e.target.closest&&e.target.closest('[data-cancel]');
      if(c){if(Book.cancel(c.dataset.cancel)){toast('Đã hủy lệnh chờ. Bạn có thể đặt lại ở Bảng tín hiệu.','up');Sig.render()}return}
      const k=e.target.closest&&e.target.closest('[data-cut]');
      if(k){const o=Book.byId(k.dataset.cut),lv=o&&Book.live(o);if(!o)return;
        if(!lv){toast('Chưa có giá hiện tại, thử lại sau vài giây.','dn');return}
        if(confirm(`Cắt lệnh ${Fmt.coin(o.s)} ${o.side} theo giá thị trường ${Fmt.px(lv.px)}?\nLãi/lỗ tạm tính: ${Fmt.sgn(lv.pnl)}${o.st==='H'?' (gồm 50% đã chốt ở TP1)':''}.\nHãy đóng vị thế này trên sàn cùng lúc.`)){
          if(Book.cut(o.id))Sig.render()}return}
      const f=e.target.closest&&e.target.closest('[data-flt]');if(f){this.flt=f.dataset.flt;this.render();return}
      const ch=e.target.closest&&e.target.closest('[data-chart]');if(ch){ChartView.order(ch.dataset.chart);return}
      if(e.target.closest('a,button,th'))return;
      const r=e.target.closest&&e.target.closest('tr[data-oid]');if(r)ChartView.order(r.dataset.oid)});
    $('xl').onclick=()=>this.export(Book.data);
    $('xlp').onclick=()=>Book.prev&&this.export(Book.prev);
    $('tiles').innerHTML=[['amt','Ký quỹ đã vào lệnh'],['n','Số lệnh'],['gain','Số tiền lãi'],['loss','Số tiền lỗ'],['net','Tổng kết'],['live','Đang chạy (tạm tính)']]
      .map(([k,l])=>`<div class="tile"><i>${l}</i><b id="t-${k}">-</b><small id="t-${k}2"></small></div>`).join('')},
  side:z=>`<span class="sd ${z.side==='LONG'?'up':'dn'}">${z.side}</span>`,
  chip:(v,t,live)=>`<span class="chip ${v>0?'up':v<0?'dn':''}"${live?` data-live="${live}"`:''}>${t}</span>`,
  N:z=>z.notional||z.amt,
  // Nhãn R: 1R = khoảng từ giá vào tới cắt lỗ ban đầu
  rl:(r,pct)=>`<span class="rtag ${r>0?'up':r<0?'dn':''}">${r>0?'+':r<0?'−':''}${+Math.abs(r).toFixed(2)}R</span>${pct!=null?`<span class="sub">${pct>=0?'+':''}${pct.toFixed(2)}%</span>`:''}`,
  // Đã chạm mốc nào: TP1 (kể cả cắt sớm sau TP1), TP2, cắt lỗ
  hits(z){const h1=!!(z.tp1T||z.st==='H'||z.st==='B'||z.st==='T'),h2=z.st==='T',sl=z.st==='S';return{h1,h2,sl}},
  // Vị trí giá trên thang R: −1 = cắt lỗ, 0 = giá vào, tp1R = TP1, tp2R = TP2
  pos(z,px){if(px==null)return null;return z.dir*(px-z.entry)/z.R},
  pct(z,r){const t2=z.tp2R||3;return Math.max(0,Math.min(100,(r+1)/(t2+1)*100))},
  // Tiền của từng nửa lệnh: 50% chốt ở TP1, 50% còn lại (đóng ở TP2 / Entry / cắt sớm, hoặc đang chạy)
  halves(z,rNow){
    const N=this.N(z),k=z.R/z.entry,t1=z.tp1R||1.5,fee=N*2*FEE/100;
    const a=N*0.5*t1*k-fee/2;let b;
    if(Book.isOpen(z))b=rNow==null?null:N*0.5*rNow*k-fee/2;
    else b=(z.pnl||0)-a;
    return{a,b}},
  rail(z,live){
    const t1=z.tp1R||1.5,{h1,h2,sl}=this.hits(z),r=live?null:z.exit!=null?this.pos(z,z.exit):null,P=x=>this.pct(z,x).toFixed(1)+'%';
    const be=h1; // đã chạm TP1: chốt 50% và dời cắt lỗ về giá vào
    let note='';
    if(be){const{a,b}=this.halves(z,r),half=v=>v==null?'đang chạy':Fmt.sgn(v);
      note=`<div class="trn"><span class="c1">✓ Chốt 50% tại TP1 <b>${Fmt.sgn(a)}</b></span><span class="c2">SL dời về Entry</span><span class="c3">50% còn lại: ${h2?`chốt TP2 <b>${half(b)}</b>`:z.st==='B'?`đóng ở Entry <b>${half(b)}</b>`:z.st==='E'?`cắt sớm <b>${half(b)}</b>`:z.st==='M'?`bạn cắt tay <b>${half(b)}</b>`:(live?`→ TP2 <b data-live="h2:${z.id}">…</b>`:`→ TP2 <b class="${b>=0?'up':'dn'}">${half(b)}</b>`)}</span></div>`}
    return`<div class="trw${h2?' h2':h1?' h1':sl?' hsl':''}${be?' be':''}" style="--e:${P(0)};--t1:${P(t1)};--p:${r==null?P(0):P(r)}"${live?` data-live="rl:${z.id}"`:''}>
      <div class="trk"><i class="fill"></i>${be?'<b class="n slx" title="Cắt lỗ cũ"></b><b class="n sl mv" title="Cắt lỗ đã dời về giá vào"><i class="hbe">SL</i></b>':`<b class="n sl${sl?' on':''}"></b>`}<b class="n en"></b><b class="n t1${h1?' on':''}">${be?'<i class="h50">50%</i>':''}</b><b class="n t2${h2?' on':''}"></b>${r!=null||live?'<em class="mk"></em>':''}</div>
      <div class="trl">${be?'<span class="l0 old">SL cũ</span>':`<span class="l0">SL${sl?' ✗':''}</span>`}<span class="l1">TP1${h1?' ✓':''}</span><span class="l2">TP2${h2?' ✓':''}</span></div>${note}</div>`},
  goal(z){const{h1,h2,sl}=this.hits(z);
    if(z.st==='M')return h1?'<span class="gl g1">✓ TP1 chốt 50% · 50% còn lại bạn cắt tay</span>':'<span class="gl ge">✋ Bạn cắt lệnh trước TP1</span>';
    return h2?'<span class="gl g2">🏆 TP1 chốt 50% → TP2 chốt 50% còn lại</span>':h1&&z.st==='B'?'<span class="gl g1">✓ TP1 chốt 50% · 50% còn lại đóng ở Entry</span>':h1&&z.st==='E'?'<span class="gl g1">✓ TP1 chốt 50% · 50% còn lại cắt sớm</span>':h1?'<span class="gl g1">✓ TP1 chốt 50% · SL dời về Entry</span>':sl?'<span class="gl gs">✗ Chạm cắt lỗ</span>':z.st==='E'?'<span class="gl ge">✂ Cắt sớm trước TP1</span>':''},
  bal:z=>z.bal||UI.bal()||1,
  liveTotal(){
    const e=$('t-live');if(!e)return;
    const l=Book.data.orders.filter(Book.isFilled).map(o=>Book.live(o)).filter(Boolean),s=l.reduce((a,x)=>a+x.pnl,0);
    e.textContent=Fmt.sgn(s);e.className=s>=0?'up':'dn';$('t-live2').textContent=`${l.length} lệnh đang chạy, giá cập nhật 3 giây/lần`},
  render(){
    const o=Book.data.orders,S=Book.stats(o),bal=UI.bal(),B=this,ms=z=>Data.MS[z.tf],px=z=>Data.px[z.s];
    $('nb').textContent=o.filter(Book.isOpen).length||'';
    $('bday').textContent=`Ngày ${Book.data.day.split('-').reverse().join('/')}. Tự xoá khi qua ngày mới.`;
    const T=(k,v,fmt,sub,c)=>{const e=$('t-'+k);tween(e,v,fmt);e.className=c||'';$('t-'+k+'2').textContent=sub};
    T('amt',S.amt,Fmt.usd,`${S.n-S.cn} lệnh đã vào · đang giữ $${Book.marginUsed().toFixed(2)} / $${bal} vốn`);
    T('n',S.n,v=>Math.round(v),`${S.op} mở, ${S.cl} đóng, ${S.cn} bỏ/hết hạn`);
    T('gain',S.gain,v=>v>0?Fmt.sgn(v):'$0.00',`${S.w} lệnh đã đóng thắng${S.npart?` + ${S.npart} lệnh đã chốt 50% ở TP1`:''}`,'up');
    T('loss',S.loss,v=>v<0?Fmt.sgn(v):'$0.00',`${S.l} lệnh thua`,'dn');
    T('net',S.net,Fmt.sgn,`${bal?(S.net/bal*100).toFixed(2):0}% vốn, thắng ${S.rate.toFixed(0)}%${S.npart?` · gồm ${Fmt.sgn(S.part)} đã chốt 50% ở TP1 của ${S.npart} lệnh đang chạy`:''}`,S.net>=0?'up':'dn');
    this.liveTotal();
    const done=o.filter(Book.isDone).sort((a,b)=>(a.x||0)-(b.x||0));
    let c=0;put($('pnlc'),done.length?lineChart([0,...done.map(z=>c+=z.pnl)]):'<div class="empty">Biểu đồ lãi/lỗ lũy kế sẽ hiện khi có lệnh đóng.</div>');
    $('pcv').textContent=Fmt.sgn(S.net);$('pcv').className=S.net>=0?'up':'dn';
    const riskCell=z=>{const r=Book.riskNow(z),p=r/B.bal(z)*100;return z.st==='H'?'<span class="chip up">0% · đã về entry</span>':`<span class="chip ${p>10?'dn':''}">${p.toFixed(2)}%</span><span class="sub">−$${r.toFixed(2)}</span>`};
    const levCell=z=>`<b>${z.lev||1}×</b>`,mgCell=z=>z.st==='H'?`${Fmt.usd(z.amt*0.5)}<span class="sub">còn 50% · vị thế $${(B.N(z)*0.5).toFixed(0)}</span>`:`${Fmt.usd(z.amt)}<span class="sub">vị thế $${B.N(z).toFixed(0)}</span>`,liqCell=z=>z.liq?Fmt.px(z.liq):'-';
    // ---- Lệnh chờ khớp ----
    const pend=o.filter(z=>z.st==='P'),left=z=>Math.max(0,Book.effW(z)-Math.floor((Date.now()-z.sigT-ms(z))/ms(z)));
    $('np').textContent=pend.length;
    Tbl.render('pend',$('tpend'),[
      {k:'ts',h:'Giờ đặt',v:z=>z.ts,f:z=>Fmt.hm(z.ts)},
      {k:'s',h:'Coin',v:z=>z.s,f:z=>coinLink(z.s,z.tf)+(z.auto?'<span class="sub">🤖 tự động</span>':'')},
      {k:'side',h:'Hướng',v:z=>z.side,f:B.side},
      {k:'entry',h:'Giá chờ',v:z=>z.entry,f:z=>Fmt.px(z.entry)},
      {k:'now',h:'Giá hiện tại',v:z=>px(z)||0,f:z=>`<span data-live="p:${z.s}"></span>`},
      {k:'gap',h:'Cách giá',v:z=>px(z)?Math.abs(px(z)-z.entry)/z.entry:0,f:z=>`<span data-live="g:${z.id}"></span>`},
      {k:'sl',h:'Cắt lỗ',v:z=>z.sl,f:z=>`${Fmt.px(z.sl)}${B.rl(-1,(z.sl/z.entry-1)*100)}`},
      {k:'tp1',h:'TP1',v:z=>z.tp1,f:z=>`${Fmt.px(z.tp1)}${B.rl(z.tp1R||1.5,(z.tp1/z.entry-1)*100)}`},
      {k:'tp2',h:'TP2',v:z=>z.tp2,f:z=>`${Fmt.px(z.tp2)}${B.rl(z.tp2R||3,(z.tp2/z.entry-1)*100)}`},
      {k:'amt',h:'Ký quỹ',v:z=>z.amt,f:mgCell},
      {k:'lev',h:'Đòn bẩy',v:z=>z.lev||1,f:levCell},
      {k:'risk',h:'% rủi ro vốn',v:z=>Book.riskNow(z),f:riskCell},
      {k:'liq',h:'Thanh lý ≈',v:z=>z.liq||0,f:liqCell},
      {k:'left',h:'Còn hiệu lực',v:left,f:z=>left(z)+' nến'},
      {k:'strat',h:'Chiến lược',v:z=>z.strat.name,f:z=>`<span class="sub">${esc(z.strat.name)}</span>`},
      {k:'act',h:'Thao tác',f:z=>`<button class="bx dn" data-cancel="${z.id}" title="Hủy lệnh chờ để đặt lại với thiết lập khác">Hủy lệnh</button>`}
    ],pend,{def:{k:'ts',d:-1},attr:z=>` data-oid="${z.id}" class="clk" title="Bấm để xem lệnh trên biểu đồ"`,empty:'<div class="empty">Không có lệnh chờ khớp. Bấm Đặt lệnh ở thẻ tín hiệu đang chờ khớp.</div>'});
    // ---- Lệnh đã khớp (lãi/lỗ realtime). Đạt TP1: tô sáng dòng, cắt lỗ = entry, rủi ro = 0 ----
    const fill=o.filter(Book.isFilled),lv=z=>Book.live(z);
    $('nf').textContent=fill.length;
    Tbl.render('fill',$('tfill'),[
      {k:'ft',h:'Giờ khớp',v:z=>z.fillT||z.ts,f:z=>Fmt.hm(z.fillT||z.ts)},
      {k:'s',h:'Coin',v:z=>z.s,f:z=>coinLink(z.s,z.tf)},
      {k:'side',h:'Hướng',v:z=>z.side,f:B.side},
      {k:'entry',h:'Giá vào',v:z=>z.entry,f:z=>Fmt.px(z.entry)},
      {k:'now',h:'Giá hiện tại',v:z=>px(z)||0,f:z=>`<span data-live="p:${z.s}"></span>`},
      {k:'rnow',h:'Lãi hiện tại (R)',v:z=>lv(z)?lv(z).rr:0,f:z=>`<span class="rtag" data-live="rr:${z.id}">…</span>`},
      {k:'sl',h:'Cắt lỗ',v:z=>z.st==='H'?z.entry:z.sl,f:z=>z.st==='H'?`<b class="be">${Fmt.px(z.entry)}</b><span class="sub up">đã dời về entry · 0R</span>`:`${Fmt.px(z.sl)}${B.rl(-1,(z.sl/z.entry-1)*100)}`},
      {k:'tp1',h:'TP1',v:z=>z.tp1,f:z=>`${z.st==='H'?`<span class="chip up">✓ ${Fmt.px(z.tp1)}</span>`:Fmt.px(z.tp1)}${B.rl(z.tp1R||1.5,(z.tp1/z.entry-1)*100)}`},
      {k:'tp2',h:'TP2',v:z=>z.tp2,f:z=>`${Fmt.px(z.tp2)}${B.rl(z.tp2R||3,(z.tp2/z.entry-1)*100)}`},
      {k:'prog',h:'Tiến trình SL → TP1 → TP2',v:z=>this.pos(z,Data.px[z.s])||0,f:z=>this.rail(z,true)},
      {k:'amt',h:'Ký quỹ',v:z=>z.amt,f:mgCell},
      {k:'lev',h:'Đòn bẩy',v:z=>z.lev||1,f:levCell},
      {k:'risk',h:'% rủi ro vốn',v:z=>Book.riskNow(z),f:riskCell},
      {k:'liq',h:'Thanh lý ≈',v:z=>z.liq||0,f:liqCell},
      {k:'pc',h:'Lãi/Lỗ % (ký quỹ)',v:z=>lv(z)?lv(z).pct:0,f:z=>`<span class="chip" data-live="pc:${z.id}">-</span><span class="sub" data-live="pb:${z.id}"></span>`},
      {k:'pm',h:'Lãi (+) / Lỗ (−)',v:z=>lv(z)?lv(z).pnl:0,f:z=>`<span class="chip" data-live="pm:${z.id}">-</span>${z.st==='H'?`<span class="sub up">đã chốt ${Fmt.sgn(Book.realized(z))}</span><span class="sub">50% còn lại: <b data-live="h2:${z.id}">…</b></span>`:''}`},
      {k:'st',h:'Trạng thái',v:z=>ST[z.st],f:z=>`<span class="st ${z.st}">${ST[z.st]}</span>${z.st==='H'?'<span class="wl w" style="margin-top:4px">ĐÃ TÍNH THẮNG</span>':''}${z.mkt?'<span class="sub">vào theo giá thị trường</span>':''}`},
      {k:'act',h:'Thao tác',f:z=>`<button class="bx dn" data-cut="${z.id}" title="Đóng lệnh ngay theo giá thị trường">✋ Cắt lệnh</button>`}
    ],fill,{def:{k:'ft',d:-1},attr:z=>` data-oid="${z.id}" class="clk${z.st==='H'?' tp1':''}" title="Bấm để xem lệnh trên biểu đồ"`,empty:'<div class="empty">Chưa có lệnh nào khớp.</div>'});
    // ---- Lịch sử đã đóng: lọc theo kết quả ----
    const all=o.filter(z=>!Book.isOpen(z)),nc=all.filter(Book.isDone).length,nx=all.filter(Book.isCancel).length;
    const H=z=>this.hits(z),F={closed:Book.isDone,cancel:Book.isCancel,tp2:z=>H(z).h2,tp1:z=>H(z).h1,sl:z=>H(z).sl},list=F[this.flt]?all.filter(F[this.flt]):all;
    $('nh').textContent=all.length;
    const n2=all.filter(z=>H(z).h2).length,n1=all.filter(z=>H(z).h1).length,ns=all.filter(z=>H(z).sl).length,ne=all.filter(z=>z.st==='E'&&!H(z).h1).length;
    put($('hsum'),all.length?`<div class="hsum"><div class="hs g2"><b>${n2}</b><span>Chạm TP2</span></div><div class="hs g1"><b>${n1}</b><span>Chạm TP1 = THẮNG</span></div><div class="hs gs"><b>${ns}</b><span>Chạm cắt lỗ</span></div><div class="hs ge"><b>${ne}</b><span>Cắt sớm trước TP1</span></div><div class="hs gx"><b>${nx}</b><span>Hết hạn / bỏ lệnh</span></div></div>`:'');
    put($('fl'),[['all','Tất cả',all.length],['closed','Đóng lệnh',nc],['tp2','🏆 Chạm TP2',n2],['tp1','✓ Chạm TP1',n1],['sl','✗ Chạm cắt lỗ',ns],['cancel','Hết hạn / Bỏ lệnh',nx]].map(([k,t,n])=>`<button data-flt="${k}"${this.flt===k?' class="on"':''}>${t} (${n})</button>`).join(''));
    const dn=Book.isDone,pct=z=>dn(z)?z.pnl/z.amt*100:0,pb=z=>dn(z)?z.pnl/B.bal(z)*100:0,sd=list.filter(dn),sNet=sd.reduce((a,z)=>a+z.pnl,0),sAmt=sd.reduce((a,z)=>a+z.amt,0),sPct=sAmt?sNet/sAmt*100:0;
    Tbl.render('hist',$('hist'),[
      {k:'x',h:'Giờ đóng',v:z=>z.x||0,f:z=>Fmt.hm(z.x||z.ts)},
      {k:'s',h:'Coin',v:z=>z.s,f:z=>coinLink(z.s,z.tf)},
      {k:'side',h:'Hướng',v:z=>z.side,f:B.side},
      {k:'amt',h:'Ký quỹ',v:z=>z.amt,f:mgCell},
      {k:'lev',h:'Đòn bẩy',v:z=>z.lev||1,f:levCell},
      {k:'entry',h:'Giá vào',v:z=>z.entry,f:z=>Fmt.px(z.entry)},
      {k:'exit',h:'Giá thoát',v:z=>z.exit||0,f:z=>z.exit!=null?Fmt.px(z.exit):'-'},
      {k:'win',h:'Thắng / Thua',v:z=>dn(z)?(z.win?1:0):-1,f:z=>dn(z)?(H(z).h1?'<span class="wl w">THẮNG</span><span class="sub">đã chạm TP1</span>':`<span class="wl l">THUA</span><span class="sub">${z.st==='M'?'cắt tay trước TP1 · không tính vào chiến lược':'chưa chạm TP1'}</span>`):'-'},
      {k:'st',h:'Kết quả',v:z=>ST[z.st],f:z=>`${this.goal(z)||`<span class="st ${z.st}">${ST[z.st]}</span>`}${z.why&&z.st!=='S'?`<span class="sub">${esc(z.why)}</span>`:''}`},
      {k:'prog',h:'Mốc đã chạm',v:z=>(H(z).h2?3:H(z).h1?2:H(z).sl?0:1),f:z=>dn(z)?this.rail(z,false):'-'},
      {k:'rr',h:'R',v:z=>dn(z)?z.rr:0,f:z=>dn(z)?`${z.rr>=0?'+':''}${z.rr.toFixed(2)}R`:'-'},
      {k:'pc',h:'Lãi/Lỗ % (ký quỹ)',v:pct,f:z=>dn(z)?B.chip(pct(z),Fmt.pct(pct(z)))+`<span class="sub ${pb(z)>=0?'up':'dn'}">${Fmt.pct(pb(z))} vốn</span>`:'-'},
      {k:'pm',h:'Lãi (+) / Lỗ (−)',v:z=>dn(z)?z.pnl:0,f:z=>dn(z)?B.chip(z.pnl,Fmt.sgn(z.pnl)):'-'},
      {k:'strat',h:'Chiến lược',v:z=>z.strat.name,f:z=>`<span class="sub">${esc(z.strat.name)}</span>`}
    ],list,{def:{k:'x',d:-1},attr:z=>{const h=H(z);return` class="${h.h2?'r-tp2':h.h1?'r-tp1':h.sl?'r-sl':Book.isCancel(z)?'r-x':''}"`},empty:'<div class="empty">Chưa có lệnh nào trong mục này.</div>',
      foot:sd.length&&this.flt!=='cancel'?['Tổng','','',Fmt.usd(sAmt),'','','',`<b>${sd.filter(z=>z.win).length}/${sd.length}</b> thắng`,'','','',B.chip(sPct,Fmt.pct(sPct)),B.chip(sNet,Fmt.sgn(sNet)),'']:null});
    put($('actlog'),Book.data.log.length?Book.data.log.map(l=>`<p><time>${Fmt.hm(l.t)}</time>${esc(l.text)}</p>`).join(''):'<p class="mut">Chưa có hoạt động nào hôm nay.</p>');
    $('xlp').hidden=!Book.prev;if(Book.prev)$('xlp').textContent='Tải kết quả '+Book.prev.day.split('-').reverse().slice(0,2).join('/')},

  // ================= XUẤT EXCEL =================
  export(b){
    try{download(this.workbook(b).blob({title:'Sổ lệnh '+b.day}),`so-lenh-${b.day}.xlsx`);toast('Đã xuất file Excel.','up')}
    catch(e){toast('Không xuất được Excel: '+esc(e.message),'dn')}},
  workbook(b){
    const W=XL.book(),bal=UI.bal(),fee=FEE/100,C={navy:'0F2A44',teal:'0F766E',ink:'1F2937',mut:'6B7280',line:'D7DEE8',band:'F5F8FB',up:'1A7F37',upbg:'E6F4EA',dn:'C62828',dnbg:'FDECEC',inbg:'FFF6D6',inc:'1F4FD8',head:'E8EEF5'};
    const isD=Book.isDone,isO=Book.isOpen,grp=z=>isD(z)?'Đóng lệnh':isO(z)?'Đang mở':'Bỏ lệnh';
    const O=b.orders.slice().sort((a,c)=>(isD(c)-isD(a))||(isD(a)?(a.x||0)-(c.x||0):(isO(c)-isO(a))||a.ts-c.ts));
    const n=O.length,r0=5,rN=Math.max(r0,r0+n-1),k=O.filter(isD).length,day=b.day.split('-').reverse().join('/');
    const TQ="'Tổng quan'",LK="'Lệnh'",col=c=>`${LK}!$${c}$${r0}:$${c}$${rN}`,VON=`${TQ}!$C$6`,PHI=`${TQ}!$C$8`;
    const st=(x={})=>({sz:10,color:C.ink,...x}),f$='"$"#,##0.00',fS='+"$"#,##0.00;-"$"#,##0.00;"$"0.00',fP='0.00%',fSP='+0.00%;-0.00%;0.00%',fR='+0.00"R";-0.00"R";0.00"R"',fPx='#,##0.00###',fD='dd/mm hh:mm',fL='0"×"';
    const N=z=>z.notional||z.amt,Rp=z=>Math.abs(z.entry-z.sl)/z.entry,pnl=z=>isD(z)?N(z)*(z.rr*Rp(z)-2*fee):0;
    // ---------- Sheet Lệnh ----------
    const L=W.sheet('Lệnh',{tab:C.navy,freeze:'F5'});
    const H=[['STT',5,'0'],['Giờ đặt',12,fD],['Giờ khớp',12,fD],['Giờ đóng',12,fD],['Coin',9],['Khung',6],['Hướng',8],['Chiến lược',20],['Giá vào',12,fPx],['Cắt lỗ',12,fPx],['TP1',12,fPx],['TP2',12,fPx],['Giá thoát',12,fPx],
      ['Ký quỹ',11,f$],['Đòn bẩy',8,fL],['Giá trị vị thế',13,f$],['Thua tối đa',12,f$],['% vốn rủi ro',10,fP],['Trạng thái',22],['Nhóm',11],['Thắng / Thua',10],['Kết quả (R)',10,fR],['Lãi/Lỗ (USDT)',13,fS],['Lãi/Lỗ % ký quỹ',12,fSP],['Lãi/Lỗ % vốn',11,fSP],['Lũy kế (USDT)',13,fS],['Đỉnh lũy kế',12,f$],['Sụt từ đỉnh',12,f$],['Lý do / ghi chú',44],['Nhãn biểu đồ',14]];
    H.forEach((h,i)=>L.width(i+1,h[1]));
    L.set('A1',`DANH SÁCH LỆNH · NGÀY ${day}`,st({b:1,sz:15,color:'FFFFFF',fill:C.navy,indent:1})).merge('A1:AD1').height(1,30);
    for(let c=2;c<=30;c++)L.set([1,c],null,st({fill:C.navy}));
    L.set('A2',`Sắp xếp: lệnh đã đóng theo giờ đóng, rồi lệnh đang mở, rồi lệnh bỏ/hết hạn. Cột P, Q, R, W–AB là công thức, tham chiếu vốn và phí ở sheet Tổng quan.`,st({i:1,color:C.mut})).merge('A2:AD2');
    H.forEach((h,i)=>L.set([4,i+1],h[0],st({b:1,color:'FFFFFF',fill:C.teal,h:'center',wrap:1,bd:'thin',bdc:'0B5F59'})));L.height(4,34);
    let cum=0,peak=0;
    O.forEach((z,i)=>{
      const r=r0+i,bd={bd:'bottom',bdc:'E5EAF0'},band=i%2?{fill:C.band}:{},S=(x={})=>st({...bd,...band,...x}),d=isD(z),p=pnl(z);
      if(d){cum+=p;peak=Math.max(peak,cum)}
      const sv=(c,v,x,f)=>L.set([r,c],v,S(x),f);
      sv(1,i+1,{num:'0',h:'center'});
      sv(2,XL.date(z.ts),{num:fD,h:'center'});sv(3,z.fillT?XL.date(z.fillT):null,{num:fD,h:'center'});sv(4,z.x?XL.date(z.x):null,{num:fD,h:'center'});
      sv(5,Fmt.coin(z.s),{b:1});sv(6,z.tf,{h:'center'});sv(7,z.side,{b:1,color:z.side==='LONG'?C.up:C.dn,h:'center'});sv(8,z.strat?z.strat.name:'',{color:C.mut});
      sv(9,z.entry,{num:fPx});sv(10,z.sl,{num:fPx});sv(11,z.tp1,{num:fPx});sv(12,z.tp2,{num:fPx});sv(13,z.exit!=null?z.exit:null,{num:fPx});
      sv(14,z.amt,{num:f$});sv(15,z.lev||1,{num:fL,h:'center'});
      sv(16,N(z),{num:f$},`N${r}*O${r}`);
      const q=N(z)*(Rp(z)+2*fee);sv(17,q,{num:f$},`P${r}*(ABS(I${r}-J${r})/I${r}+2*${PHI})`);
      sv(18,q/bal,{num:fP},`IFERROR(Q${r}/${VON},0)`);
      sv(19,ST[z.st]);sv(20,grp(z),{h:'center'});sv(21,d?(z.win?'Thắng':'Thua'):'',{h:'center',b:1});sv(22,d?z.rr:null,{num:fR});
      sv(23,p,{num:fS,b:1},`IF(T${r}="Đóng lệnh",P${r}*(V${r}*ABS(I${r}-J${r})/I${r}-2*${PHI}),0)`);
      sv(24,z.amt?p/z.amt:0,{num:fSP},`IFERROR(W${r}/N${r},0)`);sv(25,p/bal,{num:fSP},`IFERROR(W${r}/${VON},0)`);
      if(d){sv(26,cum,{num:fS},`SUM($W$${r0}:W${r})`);sv(27,peak,{num:f$},i?`MAX(AA${r-1},Z${r})`:`MAX(0,Z${r})`);sv(28,peak-cum,{num:f$},`AA${r}-Z${r}`)}
      else{sv(26,null);sv(27,null);sv(28,null)}
      sv(29,z.why||'',{color:C.mut});sv(30,d?`${Fmt.hm(z.x)} ${Fmt.coin(z.s)}`:'',{color:C.mut})});
    if(!n)L.set([r0,1],'Chưa có lệnh nào trong ngày.',st({i:1,color:C.mut})).merge(`A${r0}:M${r0}`);
    const rT=rN+1,tot=st({b:1,fill:C.head,bd:'top',bdc:C.ink});
    for(let c=1;c<=30;c++)L.set([rT,c],null,tot);
    L.set([rT,1],'TỔNG CỘNG (theo bộ lọc)',tot).merge(`A${rT}:M${rT}`);
    const sum=(c,f)=>L.set([rT,c],O.reduce((a,z)=>a+f(z),0),{...tot,num:c===22?fR:c===23?fS:f$},c===22?`SUBTOTAL(1,V${r0}:V${rN})`:`SUBTOTAL(9,${XL.col(c)}${r0}:${XL.col(c)}${rN})`);
    sum(14,z=>z.amt);sum(16,N);sum(17,z=>N(z)*(Rp(z)+2*fee));sum(23,pnl);
    const dd=O.filter(isD);L.set([rT,22],dd.length?dd.reduce((a,z)=>a+z.rr,0)/dd.length:0,{...tot,num:fR},`IFERROR(SUBTOTAL(1,V${r0}:V${rN}),0)`);
    const net=O.reduce((a,z)=>a+pnl(z),0),mg=O.reduce((a,z)=>a+z.amt,0);
    L.set([rT,24],mg?net/mg:0,{...tot,num:fSP},`IFERROR(W${rT}/N${rT},0)`);L.set([rT,25],net/bal,{...tot,num:fSP},`IFERROR(W${rT}/${VON},0)`);
    L.filter=`A4:AD${rN}`;
    const G={color:C.up,fill:C.upbg},Rd={color:C.dn,fill:C.dnbg};
    L.cf(`W${r0}:Y${rT}`,[{op:'greaterThan',val:'0',dxf:G},{op:'lessThan',val:'0',dxf:Rd}]);
    L.cf(`U${r0}:U${rN}`,[{op:'equal',val:'"Thắng"',dxf:{color:C.up,b:1}},{op:'equal',val:'"Thua"',dxf:{color:C.dn,b:1}}]);
    L.cf(`A${r0}:AD${rN}`,[{expr:`$T${r0}="Bỏ lệnh"`,dxf:{color:'9AA5B1'}},{expr:`$S${r0}="${ST.H}"`,dxf:{fill:'EAF7EF'}}]);
    // ---------- Sheet Tổng quan ----------
    const S=W.sheet('Tổng quan',{tab:C.teal});W.sheets.unshift(W.sheets.pop());
    [2,30,18,3,32,18,3].forEach((w,i)=>S.width(i+1,w));for(let c=8;c<=17;c++)S.width(c,11.5);
    S.set('B2',`SỔ LỆNH GIAO DỊCH · NGÀY ${day}`,st({b:1,sz:18,color:'FFFFFF',fill:C.navy,indent:1})).merge('B2:Q2').height(2,40);for(let c=3;c<=17;c++)S.set([2,c],null,st({fill:C.navy}));
    S.set('B3',`Xuất lúc ${Fmt.dt(Date.now())}. Ô chữ xanh nền vàng là thông số có thể sửa; mọi số liệu và biểu đồ tự tính lại. Lãi/lỗ đã trừ phí hai chiều.`,st({i:1,color:C.mut})).merge('B3:Q3');
    const sec=(a,t)=>{const[r,c]=XL.parse(a);S.set([r,c],t,st({b:1,color:'FFFFFF',fill:C.teal,indent:1}));S.set([r,c+1],null,st({fill:C.teal}));S.merge(`${a}:${XL.col(c+1)}${r}`);S.height(r,22)};
    const lab=(a,t,x={})=>S.set(a,t,st({bd:'bottom',bdc:C.line,indent:1,...x}));
    const val=(a,v,num,f,x={})=>S.set(a,v,st({bd:'bottom',bdc:C.line,num,h:'right',b:1,...x}),f);
    const inp=(a,v,num)=>S.set(a,v,st({bd:'thin',bdc:'E2C26B',num,h:'right',b:1,color:C.inc,fill:C.inbg}));
    sec('B5','THÔNG SỐ (CÓ THỂ SỬA)');
    lab('B6','Vốn đầu ngày (USDT)');inp('C6',bal,f$);
    lab('B7','Rủi ro mỗi lệnh (% vốn)');inp('C7',UI.risk()/100,fP);
    lab('B8','Phí mỗi chiều');inp('C8',fee,'0.000%');
    lab('B9','Số lệnh tối đa');inp('C9',UI.slots(),'0');
    const cnt=(g,w)=>O.filter(z=>grp(z)===g&&(w==null||(z.win?'Thắng':'Thua')===w)).length;
    const cl=cnt('Đóng lệnh'),win=cnt('Đóng lệnh','Thắng'),op=cnt('Đang mở'),cx=cnt('Bỏ lệnh');
    sec('B11','KẾT QUẢ LỆNH');
    const KR=[['Số lệnh đã đặt',n,'0',`COUNTA(${col('E')})`],['Lệnh đã đóng',cl,'0',`COUNTIF(${col('T')},"Đóng lệnh")`],['Thắng (đạt TP1)',win,'0',`COUNTIFS(${col('T')},"Đóng lệnh",${col('U')},"Thắng")`],
      ['Thua',cl-win,'0','C13-C14'],['Tỉ lệ thắng',cl?win/cl:0,fP,'IFERROR(C14/C13,0)'],['Đang mở',op,'0',`COUNTIF(${col('T')},"Đang mở")`],['Bỏ lệnh / hết hạn',cx,'0',`COUNTIF(${col('T')},"Bỏ lệnh")`],
      ['Tổng ký quỹ đã vào lệnh',O.filter(z=>grp(z)!=='Bỏ lệnh').reduce((a,z)=>a+z.amt,0),f$,`SUMIF(${col('T')},"<>Bỏ lệnh",${col('N')})`]];
    KR.forEach(([t,v,f,fx],i)=>{lab('B'+(12+i),t);val('C'+(12+i),v,f,fx,i===4?{color:C.teal}:{})});
    const P=O.map(pnl),gain=P.filter(x=>x>0).reduce((a,x)=>a+x,0),loss=P.filter(x=>x<0).reduce((a,x)=>a+x,0),W1=O.filter(z=>isD(z)&&z.win),L1=O.filter(z=>isD(z)&&!z.win);
    const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,mdd=Math.max(0,...O.filter(isD).map((z,i,a)=>{let c2=0,pk=0,m=0;for(const y of a){c2+=pnl(y);pk=Math.max(pk,c2);m=Math.max(m,pk-c2)}return m}));
    const openRisk=O.filter(z=>grp(z)==='Đang mở'&&z.st!=='H').reduce((a,z)=>a+N(z)*(Rp(z)+2*fee),0);
    sec('E5','LÃI / LỖ');
    const PR=[['Tổng lãi',gain,fS,`SUMIF(${col('W')},">0")`,{color:C.up}],['Tổng lỗ',loss,fS,`SUMIF(${col('W')},"<0")`,{color:C.dn}],['LÃI RÒNG',gain+loss,fS,`SUM(${col('W')})`,{sz:13}],
      ['Lãi ròng / vốn',(gain+loss)/bal,fSP,'IFERROR(F8/C6,0)',{}],['Vốn cuối ngày',bal+gain+loss,f$,'C6+F8',{}]];
    PR.forEach(([t,v,f,fx,x],i)=>{lab('E'+(6+i),t,i===2?{b:1,sz:12}:{});val('F'+(6+i),v,f,fx,x)});
    S.cf('F8:F9',[{op:'greaterThan',val:'0',dxf:G},{op:'lessThan',val:'0',dxf:Rd}]);
    sec('E11','CHẤT LƯỢNG GIAO DỊCH');
    const QR=[['Lãi trung bình lệnh thắng',avg(W1.map(pnl)),fS,`IFERROR(AVERAGEIFS(${col('W')},${col('T')},"Đóng lệnh",${col('U')},"Thắng"),0)`],
      ['Lỗ trung bình lệnh thua',avg(L1.map(pnl)),fS,`IFERROR(AVERAGEIFS(${col('W')},${col('T')},"Đóng lệnh",${col('U')},"Thua"),0)`],
      ['Profit factor (lãi ÷ lỗ)',loss?gain/-loss:0,'0.00','IF(F7=0,0,F6/-F7)'],['Kỳ vọng mỗi lệnh (R)',avg(O.filter(isD).map(z=>z.rr)),fR,`IFERROR(AVERAGEIF(${col('T')},"Đóng lệnh",${col('V')}),0)`],
      ['Sụt vốn tối đa trong ngày',mdd,f$,`MAX(0,${col('AB')})`],['Rủi ro đang mở (nếu cùng chạm cắt lỗ)',openRisk,f$,`SUMIFS(${col('Q')},${col('T')},"Đang mở",${col('S')},"<>${ST.H}")`],['Rủi ro đang mở / vốn',openRisk/bal,fP,'IFERROR(F17/C6,0)']];
    QR.forEach(([t,v,f,fx],i)=>{lab('E'+(12+i),t);val('F'+(12+i),v,f,fx)});
    sec('B21','PHÂN BỔ KẾT QUẢ');
    [['Thắng',win,'C14'],['Thua',cl-win,'C15'],['Bỏ / hết hạn',cx,'C18'],['Đang mở',op,'C17']].forEach(([t,v,fx],i)=>{lab('B'+(22+i),t);val('C'+(22+i),v,'0',fx)});
    // ---------- Sheet Theo coin ----------
    const coins=[...new Set(O.map(z=>Fmt.coin(z.s)))].sort(),K=W.sheet('Theo coin',{tab:'B7791F',freeze:'B5'});
    [12,14,10,12,14,15,14,13].forEach((w,i)=>K.width(i+1,w));
    K.set('A1','THỐNG KÊ THEO COIN',st({b:1,sz:15,color:'FFFFFF',fill:C.navy,indent:1})).merge('A1:H1').height(1,30);for(let c=2;c<=8;c++)K.set([1,c],null,st({fill:C.navy}));
    K.set('A2','Tự tính từ sheet Lệnh bằng COUNTIFS / SUMIFS.',st({i:1,color:C.mut})).merge('A2:H2');
    ['Coin','Lệnh đã đóng','Thắng','Tỉ lệ thắng','Ký quỹ đã vào','Lãi/Lỗ (USDT)','Lãi/Lỗ % ký quỹ','R trung bình'].forEach((h,i)=>K.set([4,i+1],h,st({b:1,color:'FFFFFF',fill:C.teal,h:'center',wrap:1,bd:'thin',bdc:'0B5F59'})));K.height(4,30);
    const cr=coins.map((cn,i)=>{
      const r=5+i,zs=O.filter(z=>Fmt.coin(z.s)===cn),cl2=zs.filter(isD),w2=cl2.filter(z=>z.win).length,m2=zs.filter(z=>grp(z)!=='Bỏ lệnh').reduce((a,z)=>a+z.amt,0),p2=zs.reduce((a,z)=>a+pnl(z),0),band=i%2?{fill:C.band}:{},S2=(x={})=>st({bd:'bottom',bdc:'E5EAF0',...band,...x});
      K.set([r,1],cn,S2({b:1}));
      K.set([r,2],cl2.length,S2({num:'0',h:'center'}),`COUNTIFS(${col('E')},A${r},${col('T')},"Đóng lệnh")`);
      K.set([r,3],w2,S2({num:'0',h:'center'}),`COUNTIFS(${col('E')},A${r},${col('T')},"Đóng lệnh",${col('U')},"Thắng")`);
      K.set([r,4],cl2.length?w2/cl2.length:0,S2({num:fP}),`IFERROR(C${r}/B${r},0)`);
      K.set([r,5],m2,S2({num:f$}),`SUMIFS(${col('N')},${col('E')},A${r},${col('T')},"<>Bỏ lệnh")`);
      K.set([r,6],p2,S2({num:fS,b:1}),`SUMIFS(${col('W')},${col('E')},A${r})`);
      K.set([r,7],m2?p2/m2:0,S2({num:fSP}),`IFERROR(F${r}/E${r},0)`);
      K.set([r,8],cl2.length?avg(cl2.map(z=>z.rr)):0,S2({num:fR}),`IFERROR(AVERAGEIFS(${col('V')},${col('E')},A${r},${col('T')},"Đóng lệnh"),0)`);
      return{cn,p2}});
    const kN=Math.max(5,4+coins.length);
    if(coins.length){K.cf(`F5:G${kN}`,[{op:'greaterThan',val:'0',dxf:G},{op:'lessThan',val:'0',dxf:Rd}]);K.cf(`D5:D${kN}`,[{bar:'0F766E'}])}
    else K.set('A5','Chưa có lệnh nào.',st({i:1,color:C.mut}));
    // ---------- Biểu đồ trên Tổng quan ----------
    if(k)S.chart({type:'line',title:'Lãi/lỗ lũy kế trong ngày (USDT)',from:'H5',to:'R21',fmt:'"$"#,##0',cat:{f:`${LK}!$AD$${r0}:$AD$${r0+k-1}`,v:O.slice(0,k).map(z=>`${Fmt.hm(z.x)} ${Fmt.coin(z.s)}`)},
      series:[{name:'Lũy kế',f:`${LK}!$Z$${r0}:$Z$${r0+k-1}`,v:(()=>{let c3=0;return O.slice(0,k).map(z=>c3+=pnl(z))})(),color:C.teal}]});
    else S.set('H6','Biểu đồ lãi/lỗ lũy kế sẽ có khi có lệnh đóng.',st({i:1,color:C.mut}));
    S.chart({type:'doughnut',title:'Kết quả lệnh',from:'H23',to:'L40',legend:'b',cat:{f:`${TQ}!$B$22:$B$25`,v:['Thắng','Thua','Bỏ / hết hạn','Đang mở']},
      series:[{name:'Số lệnh',f:`${TQ}!$C$22:$C$25`,v:[win,cl-win,cx,op],colors:['1A7F37','C62828','9AA5B1','D4A017']}]});
    if(coins.length)S.chart({type:'bar',title:'Lãi/lỗ theo coin (USDT)',from:'M23',to:'R40',fmt:'"$"#,##0.00',cat:{f:`'Theo coin'!$A$5:$A$${4+coins.length}`,v:cr.map(x=>x.cn)},
      series:[{name:'Lãi/lỗ',f:`'Theo coin'!$F$5:$F$${4+coins.length}`,v:cr.map(x=>x.p2),color:C.teal,colors:cr.map(x=>x.p2>=0?'1A7F37':'C62828')}]});
    // ---------- Nhật ký & Giải thích ----------
    const J=W.sheet('Nhật ký',{tab:'64748B',freeze:'A3'});J.width(1,12).width(2,12).width(3,90);
    ['Giờ','Loại','Nội dung'].forEach((h,i)=>J.set([2,i+1],h,st({b:1,color:'FFFFFF',fill:C.teal,bd:'thin',bdc:'0B5F59'})));
    const kind={place:'Đặt lệnh',fill:'Khớp',tp1:'TP1',close:'Đóng',cut:'Cắt sớm',cancel:'Bỏ/Hủy',signal:'Tín hiệu'};
    (b.log||[]).slice().reverse().forEach((l,i)=>{const S3=st({bd:'bottom',bdc:'E5EAF0',...(i%2?{fill:C.band}:{})});J.set([3+i,1],XL.date(l.t),{...S3,num:'hh:mm:ss'});J.set([3+i,2],kind[l.kind]||l.kind,S3);J.set([3+i,3],l.text,S3)});
    J.set('A1','NHẬT KÝ HOẠT ĐỘNG',st({b:1,sz:13,color:C.navy}));
    const E=W.sheet('Giải thích',{tab:'94A3B8'});E.width(1,30).width(2,100);
    E.set('A1','CÁCH ĐỌC SỔ LỆNH',st({b:1,sz:13,color:C.navy}));
    [['1R','Khoảng cách từ giá vào tới cắt lỗ. Cắt lỗ = −1R, TP1 = +1,5R (chốt 50%), TP2 = +3R (chốt phần còn lại).'],
     ['Thắng','Lệnh đã đạt TP1: chốt 50% và dời cắt lỗ về giá vào, phần còn lại không thể lỗ (chỉ còn phí).'],
     ['Ký quỹ','Số tiền đặt lệnh trên sàn (margin), luôn ≤ vốn.'],['Giá trị vị thế','Ký quỹ × đòn bẩy. Lãi/lỗ tính trên giá trị vị thế.'],
     ['Thua tối đa','Số tiền mất nếu chạm cắt lỗ ban đầu, đã gồm phí = vị thế × (khoảng cắt lỗ % + 2 × phí). Bảng chọn đòn bẩy để số này ≈ rủi ro mỗi lệnh × vốn.'],
     ['Lãi/Lỗ % ký quỹ','Lãi/lỗ chia ký quỹ (giống ROE trên sàn).'],['Lãi/Lỗ % vốn','Lãi/lỗ chia vốn đầu ngày.'],
     ['Sụt từ đỉnh','Khoảng giảm của lãi/lỗ lũy kế so với mức cao nhất trước đó trong ngày.'],['Profit factor','Tổng lãi ÷ tổng lỗ. Trên 1 là có lãi; 0 khi chưa có lệnh lỗ.'],
     ['Thông số','Sửa vốn hoặc phí ở sheet Tổng quan, mọi công thức tự tính lại. Giá vào, cắt lỗ, kết quả R là dữ liệu ghi nhận từ bảng Tín hiệu.']]
      .forEach(([a,c2],i)=>{E.set([3+i,1],a,st({b:1,bd:'bottom',bdc:C.line,v:'top'}));E.set([3+i,2],c2,st({wrap:1,bd:'bottom',bdc:C.line,v:'top'}));E.height(3+i,32)});
    return W}
};
