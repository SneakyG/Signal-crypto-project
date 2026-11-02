/* Danh sách chiến lược và các phiên bản của chúng:
   base = bản gốc, learning = bản đang học, saved70 = đã đạt 7/10 lệnh thắng, saved90 = đã đạt 9/10 (bản dự phòng). */
const Strat={
  impl:{},list:[],active:'auto',
  init(){
    const s=Store.get('lab',null);
    if(s&&Array.isArray(s.list)&&s.list.length){this.list=s.list;this.active=s.active||this.list[0].id}
    for(const b of Object.keys(this.impl))
      if(!this.list.some(v=>v.base===b&&v.status==='base'))
        this.list.push({id:b+'-v1',base:b,ver:1,status:'base',params:{...this.impl[b].defaults},parent:null,created:Date.now(),stats:null,log:[]});
    this.list=this.list.filter(v=>this.impl[v.base]);
    for(const v of this.list)v.params=v.status==='base'?{...this.impl[v.base].defaults}:{...this.impl[v.base].defaults,...v.params}; // thêm tham số mới nếu mã được nâng cấp
    const a=this.byId(this.active);if(this.active!=='auto'&&(!a||a.status==='learning'||this.impl[a.base].hidden))this.active='auto';
    this.save()},
  byId(id){return this.list.find(v=>v.id===id)},
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
  ORDER:['rsi2','smc','btc100','ema'],
  clone(v,status){
    const ver=Math.max(...this.list.filter(x=>x.base===v.base).map(x=>x.ver))+1;
    const c={id:v.base+'-v'+ver,base:v.base,ver,status,params:{...v.params},parent:v.id,created:Date.now(),stats:null,log:[]};
    this.list.push(c);return c}
};
