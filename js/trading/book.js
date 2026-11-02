/* Sổ lệnh: lưu lệnh đã đặt, theo dõi vòng đời tới khi đóng, lãi/lỗ realtime, hủy lệnh chờ, tự reset khi qua ngày. */
const ST={P:'Chờ khớp',F:'Đã khớp',H:'Đã chốt 50% ở TP1 · SL = Entry',C:'Bỏ lệnh (mất tín hiệu)',X:'Hết hạn',U:'Bạn đã hủy',S:'Cắt lỗ',B:'TP1 rồi về hòa vốn',T:'Chốt TP2',E:'Cắt sớm',M:'Bạn cắt lệnh'};
const Book={
  data:{day:Fmt.day(),orders:[],log:[]},prev:null,
  isOpen:o=>o.st==='P'||o.st==='F'||o.st==='H',
  isFilled:o=>o.st==='F'||o.st==='H',
  isDone:o=>o.st==='S'||o.st==='B'||o.st==='T'||o.st==='E'||o.st==='M',
  isCancel:o=>o.st==='C'||o.st==='X'||o.st==='U',
  load(){
    const b=Store.get('book',null);if(b&&Array.isArray(b.orders))this.data={log:[],...b};
    const p=Store.get('bookPrev',null);if(p&&Array.isArray(p.orders))this.prev=p},
  save(){Store.set('book',this.data);Store.set('bookPrev',this.prev)},
  byId(id){return this.data.orders.find(o=>o.id===id)},
  openFor(s){return this.data.orders.find(o=>o.s===s&&Book.isOpen(o))},
  log(kind,text){this.data.log.unshift({t:Date.now(),kind,text});if(this.data.log.length>80)this.data.log.length=80},
  // Qua ngày: xoá lịch sử và thống kê (lưu bản hôm qua để tải Excel); lệnh đang mở vẫn được theo dõi
  roll(){
    if(this.data.day===Fmt.day())return;
    const done=this.data.orders.filter(o=>!Book.isOpen(o));if(done.length)this.prev={day:this.data.day,orders:done};
    this.data={day:Fmt.day(),orders:this.data.orders.filter(Book.isOpen),log:[]};this.save()},
  add(o){this.data.orders.push(o);this.log('place',`Đặt lệnh ${o.side} ${Fmt.coin(o.s)}: ký quỹ $${o.amt.toFixed(2)} × ${o.lev||1} = vị thế $${(o.notional||o.amt).toFixed(0)}`);this.save()},
  cancel(id){
    const o=this.byId(id);if(!o||o.st!=='P')return false;
    o.st='U';o.x=Date.now();o.pnl=0;o.why='Bạn đã hủy lệnh chờ để đặt lại';this.log('cancel',`Hủy lệnh chờ ${Fmt.coin(o.s)}`);this.save();return true},
  // Lãi/lỗ realtime của lệnh đang chạy theo giá hiện tại (giá lấy từ Data.px, 3 giây cập nhật một lần)
  live(o){
    if(o.st!=='F'&&o.st!=='H')return null;
    const C=Data.cache[o.s+'|'+o.tf],px=Data.px[o.s]!=null?Data.px[o.s]:(C?C.c[C.c.length-1]:null);if(px==null)return null;
    const rr=Life.mtm(o,px),pnl=Life.money(o,rr);return{px,rr,pnl,pct:pnl/o.amt*100,pctBal:pnl/(o.bal||UI.bal()||1)*100}},
  // Số tiền còn có thể mất nếu chạm cắt lỗ hiện tại (sau TP1 cắt lỗ đã về giá vào nên chỉ còn phí)
  riskNow(o){
    if(!Book.isOpen(o))return 0;const N=o.notional||o.amt;
    return o.st==='H'?N*2*FEE/100*0.5:N*(Math.abs(o.entry-o.sl)/o.entry+2*FEE/100)},
  lev(o){return o.lev||1},
  // Ký quỹ đang giữ bởi mọi lệnh mở (lệnh chờ khớp cũng giữ ký quỹ trên sàn)
  marginUsed(){return this.data.orders.filter(Book.isOpen).reduce((a,o)=>a+(o.amt||0)*(o.st==='H'?0.5:1),0)},
  // Lãi đã chốt ở TP1 (50% vị thế) của lệnh đang chạy, đã trừ phần phí tương ứng
  realized(o){if(o.st!=='H')return 0;const N=o.notional||o.amt;return N*0.5*(o.tp1R||1.5)*o.R/o.entry-N*FEE/100},
  // Thống kê: lãi/lỗ đã đóng + phần đã chốt 50% ở TP1 của lệnh đang chạy (đó là tiền đã về tài khoản)
  stats(l){
    const cl=l.filter(Book.isDone),w=cl.filter(z=>z.win).length,part=l.filter(z=>z.st==='H').map(z=>Book.realized(z));
    const pg=part.filter(x=>x>0).reduce((a,x)=>a+x,0),pl=part.filter(x=>x<0).reduce((a,x)=>a+x,0);
    return{n:l.length,op:l.filter(Book.isOpen).length,cl:cl.length,cn:l.filter(Book.isCancel).length,
      amt:l.filter(z=>!Book.isCancel(z)).reduce((a,z)=>a+z.amt,0),camt:cl.reduce((a,z)=>a+z.amt,0),w,l:cl.length-w,
      gain:cl.reduce((a,z)=>a+(z.pnl>0?z.pnl:0),0)+pg,loss:cl.reduce((a,z)=>a+(z.pnl<0?z.pnl:0),0)+pl,
      net:cl.reduce((a,z)=>a+(z.pnl||0),0)+pg+pl,part:pg+pl,npart:part.length,rate:cl.length?w/cl.length*100:0}},
  // Cập nhật mọi lệnh đang mở theo dữ liệu nến mới nhất. cur: {"COIN|khung": bộ nến} đã tải sẵn trong lượt làm mới.
  async sync(cur){
    this.roll();
    for(const o of this.data.orders.filter(Book.isOpen)){
      const key=o.s+'|'+o.tf;let D=cur[key];
      if(!D){try{D=cur[key]=await Sig.series(o.s,o.tf)}catch(e){continue}}
      const i=D.t.indexOf(o.sigT);if(i<0)continue;
      const L=Life.run(D,i,{dirN:o.dir,entry:o.entry,sl:o.sl,tp1:o.tp1,tp2:o.tp2,R:o.R,mkt:o.mkt},Strat.impl[o.strat.base],o.P);
      this.apply(o,L,D)}
    this.save()},
  apply(o,L,D){
    const ms=Data.MS[o.tf],name=`${Fmt.coin(o.s)} ${o.side}`;
    if(L.fill!=null&&!o.fillT){
      o.fillT=Math.min(D.t[L.fill]+ms,Date.now());
      Notify.push('fill',`Lệnh chờ <b>${name}</b> đã khớp tại ${Fmt.px(o.entry)}`,
        `✅ LỆNH CHỜ ĐÃ KHỚP ${name} (${o.tf})\nGiá vào ${Fmt.px(o.entry)}. Cắt lỗ ${Fmt.px(o.sl)}, TP1 ${Fmt.px(o.tp1)}, TP2 ${Fmt.px(o.tp2)}.`,'up')}
    if(L.tp1At!=null&&!o.tp1T){
      o.tp1T=Math.min(D.t[L.tp1At]+ms,Date.now());o.win=true;
      Notify.push('tp1',`<b>${name}</b> đạt TP1: tính là lệnh thắng, SL về giá vào`,
        `🎯 ĐẠT TP1 ${name} (${o.tf})\nChốt 50% lệnh, dời cắt lỗ về giá vào (entry) ${Fmt.px(o.entry)}. Phần còn lại chạy tới TP2 ${Fmt.px(o.tp2)}. Tính là lệnh THẮNG.`,'up')}
    const rk={P:0,F:1,H:2};
    if(Book.isOpen(L)){if(rk[L.st]>rk[o.st])o.st=L.st;return} // giá realtime có thể đã đi trước dữ liệu nến: không lùi trạng thái
    if(o.fillT&&(L.st==='C'||L.st==='X'))return;                  // đã khớp theo giá realtime: bỏ qua kết luận "không khớp" của nến
    if(o.tp1T&&L.st==='S'){L={...L,st:'B',rr:0.5*(o.tp1R||1.5),exit:o.entry}} // sau TP1 cắt lỗ đã ở giá vào
    if(Book.isDone(L)){this.finish(o,L.st,L.rr,L.exit,L.why,Math.min(D.t[L.end]+ms,Date.now()));return}
    o.st=L.st;o.x=Math.min(D.t[L.end]+ms,Date.now());o.why=L.why||null;
    {
      o.pnl=0;
      Notify.push('cancel',`Lệnh chờ <b>${name}</b> bị bỏ: ${L.why}`,`❌ BỎ LỆNH CHỜ ${name} (${o.tf})\nLý do: ${L.why}. Hãy hủy lệnh limit ${Fmt.px(o.entry)} trên sàn nếu còn treo.`,'dn')}}
,
  // Đóng lệnh: ghi kết quả, tiền, nhật ký tự học và thông báo. record=false: không ghi vào tiến trình chiến lược
  finish(o,st,rr,exit,why,x,record=true){
    const name=`${Fmt.coin(o.s)} ${o.side}`;
    o.st=st;o.x=x||Date.now();o.why=why||null;o.rr=rr;o.exit=exit;o.win=!!o.tp1T;o.pnl=Life.money(o,rr);
    if(record&&typeof AutoLab!=='undefined')AutoLab.rec(o.strat.id,`${o.s}|${o.sigT}|${o.strat.id}`,o.win,o.rr,'lệnh thật');
    const up=o.pnl>=0,head={S:'🛑 CẮT LỖ',B:'🟰 VỀ HÒA VỐN SAU TP1',T:'🏁 CHỐT TP2',E:'✂️ CẮT LỆNH SỚM',M:'✋ BẠN CẮT LỆNH'}[st];
    Notify.push(st==='E'||st==='M'?'cut':'close',
      `${st==='E'?'Cắt lệnh sớm':st==='M'?'Bạn đã cắt lệnh':'Đóng lệnh'} <b>${name}</b>: <b class="${up?'up':'dn'}">${Fmt.sgn(o.pnl)}</b>${st==='E'?`<br><small>${why}</small>`:''}`,
      `${head} ${name} (${o.tf})\n${why?'Lý do: '+why+'\n':''}Giá thoát ${Fmt.px(exit)}. ${up?'Lãi':'Lỗ'} ${Fmt.usd(Math.abs(o.pnl))} (${Fmt.pct(o.pnl/o.amt*100)} ký quỹ, ${Fmt.pct(o.pnl/(o.bal||UI.bal()||1)*100)} vốn), đã trừ phí.${st==='E'||st==='M'?'\nHãy đóng vị thế này trên sàn nếu chưa đóng.':''}`,up?'up':'dn')},
  // Theo dõi realtime theo giá mỗi 3 giây: khớp, chạm TP1 (chốt 50%, SL về giá vào), TP2, cắt lỗ, về giá vào. Trả về true nếu có thay đổi.
  liveTick(){
    let ch=false;const now=Date.now();
    for(const o of this.data.orders.filter(Book.isOpen)){
      const p=Data.px[o.s];if(p==null||!(o.R>0))continue;const d=o.dir,name=`${Fmt.coin(o.s)} ${o.side}`,t1=o.tp1R||1.5,t2=o.tp2R||3;
      const past=lv=>d>0?p>=lv:p<=lv,below=lv=>d>0?p<=lv:p>=lv;
      if(o.st==='P'&&below(o.entry)){o.st='F';o.fillT=now;ch=true;
        Notify.push('fill',`Lệnh chờ <b>${name}</b> đã khớp tại ${Fmt.px(o.entry)}`,`✅ LỆNH CHỜ ĐÃ KHỚP ${name} (${o.tf})\nGiá vào ${Fmt.px(o.entry)}. Cắt lỗ ${Fmt.px(o.sl)}, TP1 ${Fmt.px(o.tp1)}, TP2 ${Fmt.px(o.tp2)}.`,'up');continue}
      if(o.st==='F'){
        if(below(o.sl)){this.finish(o,'S',-1,o.sl,null,now);ch=true;continue}
        if(past(o.tp1)){o.st='H';o.tp1T=now;o.win=true;ch=true;const a=this.realized(o);
          Notify.push('tp1',`<b>${name}</b> chạm TP1: chốt 50% <b class="up">${Fmt.sgn(a)}</b>, SL dời về giá vào. Tính là lệnh THẮNG`,
            `🎯 CHẠM TP1 ${name} (${o.tf})\nChốt 50% lệnh: ${Fmt.sgn(a)}. Dời cắt lỗ về giá vào ${Fmt.px(o.entry)}. Phần còn lại chạy tới TP2 ${Fmt.px(o.tp2)}. Tính là lệnh THẮNG.`,'up')}
        continue}
      if(o.st==='H'){
        if(past(o.tp2)){this.finish(o,'T',0.5*t1+0.5*t2,o.tp2,null,now);ch=true}
        else if(below(o.entry)){this.finish(o,'B',0.5*t1,o.entry,null,now);ch=true}}}
    if(ch)this.save();return ch},
  // Bạn tự cắt lệnh đang chạy theo giá thị trường. Chỉ ghi vào tiến trình chiến lược nếu đã chạm TP1 (kết quả thắng đã chắc chắn).
  cut(id){
    const o=this.byId(id),p=o&&Data.px[o.s];if(!o||!Book.isFilled(o)||p==null)return false;
    this.finish(o,'M',Life.mtm(o,p),p,o.tp1T?'Bạn cắt 50% còn lại sau TP1':'Bạn cắt lệnh trước TP1',Date.now(),!!o.tp1T);
    this.log('cut',`Bạn cắt lệnh ${Fmt.coin(o.s)} ${o.side} tại ${Fmt.px(p)}: ${Fmt.sgn(o.pnl)}`);this.save();return true}
};
