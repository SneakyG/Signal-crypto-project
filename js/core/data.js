/* Dữ liệu thị trường Binance: ưu tiên Futures (khớp với biểu đồ TradingView .P), dự phòng Spot.
   Có bộ nhớ đệm: lần đầu tải lịch sử, các lần sau chỉ tải nến mới. */
const Data={
  FAPI:'https://fapi.binance.com',SPOT:['https://data-api.binance.vision','https://api.binance.com'],
  MS:{'5m':3e5,'15m':9e5,'1h':36e5,'4h':144e5,'1d':864e5},
  F:['t','o','h','l','c','v'],
  cache:{},lk:{},px:{},pxAt:0,
  async raw(sym,tf,limit,end){
    const q=`symbol=${sym}&interval=${tf}&limit=${limit}`+(end?`&endTime=${end}`:'');
    const urls=[`${this.FAPI}/fapi/v1/klines?${q}`,...this.SPOT.map(b=>`${b}/api/v3/klines?${q}`)];
    for(const u of urls){try{const r=await fetch(u);if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)&&j.length)return j}catch(e){}}
    throw new Error('Không lấy được dữ liệu '+sym)},
  mk(rows){const D={t:[],o:[],h:[],l:[],c:[],v:[]};for(const r of rows){D.t.push(r[0]);D.o.push(+r[1]);D.h.push(+r[2]);D.l.push(+r[3]);D.c.push(+r[4]);D.v.push(+r[5])}return D},
  // Đảm bảo có ít nhất `need` nến. Các lệnh gọi cùng một cặp (coin, khung) được xếp hàng để không ghi chồng dữ liệu.
  load(sym,tf,need){
    const key=sym+'|'+tf,p=(this.lk[key]||Promise.resolve()).then(()=>this._load(sym,tf,need));
    this.lk[key]=p.catch(()=>{});return p},
  async _load(sym,tf,need){
    const key=sym+'|'+tf,ms=this.MS[tf];let D=this.cache[key];
    if(!D){
      let rows=[],end;
      while(rows.length<need){ // coin mới niêm yết có thể ít lịch sử hơn yêu cầu: dùng phần có sẵn
        const want=Math.min(1000,need-rows.length);let k;
        try{k=await this.raw(sym,tf,want,end)}catch(e){if(!rows.length)throw e;break}
        rows=k.concat(rows);if(k.length<want)break;end=k[0][0]-1}
      return this.cache[key]=this.mk(rows)}
    const miss=Math.ceil((Date.now()-D.t[D.t.length-1])/ms)+2;
    if(miss>900){delete this.cache[key];return this._load(sym,tf,need)}
    const N=this.mk(await this.raw(sym,tf,Math.max(5,miss)));
    let cut=D.t.length;while(cut>0&&D.t[cut-1]>=N.t[0])cut--;
    for(const a of this.F){D[a].length=cut;D[a].push(...N[a])}
    while(D.t.length<need){
      const want=Math.min(1000,need-D.t.length);let old;
      try{old=await this.raw(sym,tf,want,D.t[0]-1)}catch(e){break} // hết lịch sử cũ hơn: dừng, dùng phần đang có
      const O=this.mk(old);for(const a of this.F)D[a]=O[a].concat(D[a]);
      if(old.length<want)break}
    return D},
  // Giá hiện tại của mọi hợp đồng trong 1 lần gọi
  async prices(){
    for(const u of [this.FAPI+'/fapi/v1/ticker/price',...this.SPOT.map(b=>b+'/api/v3/ticker/price')]){
      try{const r=await fetch(u);if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)){for(const x of j)this.px[x.symbol]=+x.price;this.pxAt=Date.now();return true}}catch(e){}}
    return false}
};
