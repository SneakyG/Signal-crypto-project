/* Danh sách chiến lược và các phiên bản của chúng:
   base = bản gốc, learning = bản đang học, saved70 = đã đạt 7/10 lệnh thắng, saved90 = đã đạt 9/10 (bản dự phòng). */
const Strat={
  impl:{},list:[],active:'auto',
  N:100, // số lệnh mỗi lần đánh giá tự học (mốc 70% = 70/100, 90% = 90/100)
  init(){
    const s=Store.get('lab',null);
    if(s&&Array.isArray(s.list)&&s.list.length){this.list=s.list;this.active=s.active||this.list[0].id}
    for(const b of Object.keys(this.impl))
      if(!this.list.some(v=>v.base===b&&v.status==='base'))
        this.list.push({id:b+'-v1',base:b,ver:1,status:'base',params:{...this.impl[b].defaults},parent:null,created:Date.now(),stats:null,log:[]});
    this.list=this.list.filter(v=>this.impl[v.base]&&(v.status==='base'||(v.rev||1)===(this.impl[v.base].rev||1)));
    for(const v of this.list){const r=this.impl[v.base].rev||1;if(v.status==='base'&&(v.rev||1)!==r){v.track=[];v.mark=0;v.stats=null;v.log=[]}v.rev=r} // chiến lược đã viết lại: học lại từ đầu
    for(const v of this.list)v.params=v.status==='base'?{...this.impl[v.base].defaults}:{...this.impl[v.base].defaults,...v.params}; // thêm tham số mới nếu mã được nâng cấp
    this.applyTP();
    const a=this.byId(this.active);if(this.active!=='auto'&&(!a||a.status==='learning'||this.impl[a.base].hidden))this.active='auto';
    this.save()},
  byId(id){return this.list.find(v=>v.id===id)},
  // Mức chốt lời dùng chung (trang Cài đặt): TP1 cố định, TP2 cố định hoặc 'auto' = tự chọn 3 / 3,5 / 4R theo thống kê từng coin
  TP(){return{t1:+Store.get('tp1',1.5)||1.5,t2:Store.get('tp2','auto')}},
  applyTP(){const{t1,t2}=this.TP();for(const v of this.list){v.params.tp1R=t1;v.params.tp2R=t2==='auto'?Math.max(3,t1+0.5):Math.max(+t2,t1+0.5)}},
  AUTO:'auto',
  isAuto(){return this.active==='auto'},
  // Chiến lược dùng cho một coin: chế độ Tự động lấy chiến lược thắng cao nhất của coin đó (từ lần quét), mặc định bản gốc "Của bạn"
  forCoin(s){
    if(this.isAuto()){const id=typeof Scan!=='undefined'&&Scan.best[s];return this.byId(id)||this.byId('rsi2-v1')}
    return this.cur()},
  // Chiến lược có áp dụng cho coin s và khung tf không (BTC x100 chỉ dùng cho BTC khung 15m)
  fits(v,s,tf){const I=this.impl[v.base];return(!I.only||I.only.includes(s))&&(!I.tf||!tf||I.tf===tf)},
  cur(){return this.byId(this.active)||this.byId('rsi2-v1')},
  I(){return this.impl[this.cur().base]},
  P(){return this.cur().params},
  save(){Store.set('lab',{list:this.list,active:this.active})},
  label(v){const t={base:'',learning:' (đang học)',saved70:' ✓70%',saved90:' ★90%'}[v.status]||'';return`${this.impl[v.base].short} v${v.ver}${t}`},
  // Các phiên bản được phép chọn làm chiến lược chính (không gồm bản đang học vì tham số của nó còn thay đổi)
  usable(){return this.list.filter(v=>v.status!=='learning'&&!this.impl[v.base].hidden).sort((a,b)=>this.ORDER.indexOf(a.base)-this.ORDER.indexOf(b.base)||a.ver-b.ver)},
  ORDER:['rsi2','smc','ict2','ema'],
  clone(v,status){
    const dead=Store.get('labDead',[]).filter(id=>id.startsWith(v.base+'-v')).map(id=>+id.split('-v')[1]||0),ver=Math.max(...this.list.filter(x=>x.base===v.base).map(x=>x.ver),...dead)+1;
    const c={id:v.base+'-v'+ver,base:v.base,ver,rev:this.impl[v.base].rev||1,status,params:{...v.params},parent:v.id,created:Date.now(),stats:null,log:[]};
    this.list.push(c);return c}
};
