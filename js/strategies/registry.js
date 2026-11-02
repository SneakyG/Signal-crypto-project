/* Danh sách chiến lược và các phiên bản của chúng:
   base = bản gốc, learning = bản đang học, saved70 = đã đạt 7/10 lệnh thắng, saved90 = đã đạt 9/10 (bản dự phòng). */
const Strat={
  impl:{},list:[],active:'ema-v1',
  init(){
    const s=Store.get('lab',null);
    if(s&&Array.isArray(s.list)&&s.list.length){this.list=s.list;this.active=s.active||this.list[0].id}
    for(const b of Object.keys(this.impl))
      if(!this.list.some(v=>v.base===b&&v.status==='base'))
        this.list.push({id:b+'-v1',base:b,ver:1,status:'base',params:{...this.impl[b].defaults},parent:null,created:Date.now(),stats:null,log:[]});
    for(const v of this.list)v.params={...this.impl[v.base].defaults,...v.params}; // thêm tham số mới nếu mã được nâng cấp
    if(!this.byId(this.active)||this.byId(this.active).status==='learning')this.active=this.list.find(v=>v.status==='base').id;
    this.save()},
  byId(id){return this.list.find(v=>v.id===id)},
  cur(){return this.byId(this.active)},
  I(){return this.impl[this.cur().base]},
  P(){return this.cur().params},
  save(){Store.set('lab',{list:this.list,active:this.active})},
  label(v){const t={base:'',learning:' (đang học)',saved70:' ✓70%',saved90:' ★90%'}[v.status]||'';return`${this.impl[v.base].short} v${v.ver}${t}`},
  // Các phiên bản được phép chọn làm chiến lược chính (không gồm bản đang học vì tham số của nó còn thay đổi)
  usable(){return this.list.filter(v=>v.status!=='learning').sort((a,b)=>['ema','smc'].indexOf(a.base)-['ema','smc'].indexOf(b.base)||a.ver-b.ver)},
  clone(v,status){
    const ver=Math.max(...this.list.filter(x=>x.base===v.base).map(x=>x.ver))+1;
    const c={id:v.base+'-v'+ver,base:v.base,ver,status,params:{...v.params},parent:v.id,created:Date.now(),stats:null,log:[]};
    this.list.push(c);return c}
};
