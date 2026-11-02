/* Sổ lệnh: lưu lệnh đã đặt, theo dõi vòng đời tới khi đóng, lãi/lỗ realtime, hủy lệnh chờ, tự reset khi qua ngày. */
const ST={P:'Chờ khớp',F:'Đã khớp',H:'Đã TP1 (SL về giá vào)',C:'Bỏ lệnh (mất tín hiệu)',X:'Hết hạn',U:'Bạn đã hủy',S:'Cắt lỗ',B:'TP1 rồi về hòa vốn',T:'Chốt TP2',E:'Cắt sớm'};
const Book={
  data:{day:Fmt.day(),orders:[],log:[]},prev:null,
  isOpen:o=>o.st==='P'||o.st==='F'||o.st==='H',
  isFilled:o=>o.st==='F'||o.st==='H',
  isDone:o=>o.st==='S'||o.st==='B'||o.st==='T'||o.st==='E',
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
  add(o){this.data.orders.push(o);this.log('place',`Đặt lệnh ${o.side} ${Fmt.coin(o.s)} $${o.amt}`);this.save()},
  cancel(id){
    const o=this.byId(id);if(!o||o.st!=='P')return false;
    o.st='U';o.x=Date.now();o.pnl=0;o.why='Bạn đã hủy lệnh chờ để đặt lại';this.log('cancel',`Hủy lệnh chờ ${Fmt.coin(o.s)}`);this.save();return true},
  // Lãi/lỗ realtime của lệnh đang chạy theo giá hiện tại (giá lấy từ Data.px, 3 giây cập nhật một lần)
  live(o){
    if(o.st!=='F'&&o.st!=='H')return null;
    const C=Data.cache[o.s+'|'+o.tf],px=Data.px[o.s]!=null?Data.px[o.s]:(C?C.c[C.c.length-1]:null);if(px==null)return null;
    const rr=Life.mtm(o,px),pnl=Life.money(o,rr);return{px,rr,pnl,pct:pnl/o.amt*100}},
  stats(l){
    const cl=l.filter(Book.isDone),w=cl.filter(z=>z.win).length;
    return{n:l.length,op:l.filter(Book.isOpen).length,cl:cl.length,cn:l.filter(Book.isCancel).length,
      amt:l.filter(z=>!Book.isCancel(z)).reduce((a,z)=>a+z.amt,0),camt:cl.reduce((a,z)=>a+z.amt,0),w,l:cl.length-w,
      gain:cl.reduce((a,z)=>a+(z.pnl>0?z.pnl:0),0),loss:cl.reduce((a,z)=>a+(z.pnl<0?z.pnl:0),0),
      net:cl.reduce((a,z)=>a+(z.pnl||0),0),rate:cl.length?w/cl.length*100:0}},
  // Cập nhật mọi lệnh đang mở theo dữ liệu nến mới nhất. cur: {"COIN|khung": bộ nến} đã tải sẵn trong lượt làm mới.
  async sync(cur){
    this.roll();
    for(const o of this.data.orders.filter(Book.isOpen)){
      const key=o.s+'|'+o.tf;let D=cur[key];
      if(!D){try{D=cur[key]=await Sig.series(o.s,o.tf)}catch(e){continue}}
      const i=D.t.indexOf(o.sigT);if(i<0)continue;
      const L=Life.run(D,i,{dirN:o.dir,entry:o.entry,sl:o.sl,tp1:o.tp1,tp2:o.tp2,R:o.R},Strat.impl[o.strat.base],o.P);
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
        `🎯 ĐẠT TP1 ${name} (${o.tf})\nChốt 50% lệnh, dời cắt lỗ về giá vào ${Fmt.px(o.entry)}. Phần còn lại chạy tới TP2 ${Fmt.px(o.tp2)}. Tính là lệnh THẮNG.`,'up')}
    o.st=L.st;
    if(Book.isOpen(o))return;
    o.x=Math.min(D.t[L.end]+ms,Date.now());o.why=L.why||null;
    if(Book.isDone(o)){
      o.rr=L.rr;o.exit=L.exit;o.win=L.win;o.pnl=Life.money(o,L.rr);
      const up=o.pnl>=0,head={S:'🛑 CẮT LỖ',B:'🟰 VỀ HÒA VỐN SAU TP1',T:'🏁 CHỐT TP2',E:'✂️ CẮT LỆNH SỚM'}[L.st];
      Notify.push(L.st==='E'?'cut':'close',
        `${L.st==='E'?'Cắt lệnh sớm':'Đóng lệnh'} <b>${name}</b>: <b class="${up?'up':'dn'}">${Fmt.sgn(o.pnl)}</b>${L.st==='E'?`<br><small>${L.why}</small>`:''}`,
        `${head} ${name} (${o.tf})\n${L.why?'Lý do: '+L.why+'\n':''}Giá thoát ${Fmt.px(o.exit)}. ${up?'Lãi':'Lỗ'} ${Fmt.usd(Math.abs(o.pnl))} (${Fmt.pct(o.pnl/o.amt*100)}), đã trừ phí.${L.st==='E'?'\nHãy đóng vị thế này trên sàn nếu chưa đóng.':''}`,up?'up':'dn')}
    else{
      o.pnl=0;
      Notify.push('cancel',`Lệnh chờ <b>${name}</b> bị bỏ: ${L.why}`,`❌ BỎ LỆNH CHỜ ${name} (${o.tf})\nLý do: ${L.why}. Hãy hủy lệnh limit ${Fmt.px(o.entry)} trên sàn nếu còn treo.`,'dn')}}
};
