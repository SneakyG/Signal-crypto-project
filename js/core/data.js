/* Bộ giới hạn yêu cầu tới Binance (theo từng máy chủ).
   Binance tính "trọng số" cho mỗi yêu cầu (tối đa 2400/phút với Futures). Vượt giới hạn sẽ bị trả mã 429, cố gửi tiếp sẽ bị chặn IP
   (mã 418 "I'm a teapot") từ 2 phút tới 3 ngày. Bảng tự giữ dưới ~45% giới hạn, và khi gặp 429/418 thì NGỪNG hẳn mọi yêu cầu tới máy chủ đó
   cho tới hết thời gian chặn (đọc Retry-After), dùng máy chủ Spot dự phòng nếu được. */
const Net={
  h:{},LIMIT:1100,
  host(u){return new URL(u).host},
  st(h){return this.h[h]||(this.h[h]={until:0,used:[],code:0})},
  blocked(u){return Date.now()<this.st(this.host(u)).until},
  waitLeft(){return Math.max(0,...Object.values(this.h).map(x=>x.until-Date.now()))},
  banned(){return Object.entries(this.h).filter(([k,x])=>Date.now()<x.until).map(([k,x])=>({host:k,code:x.code,left:x.until-Date.now()}))},
  weight(u){if(u.includes('/ticker/24hr'))return u.includes('fapi')?40:80;if(u.includes('/ticker/price'))return u.includes('fapi')?2:4;const m=/limit=(\d+)/.exec(u),l=m?+m[1]:500;return l<100?1:l<500?2:l<=1000?5:10},
  async fetch(u,opt){
    const S=this.st(this.host(u)),w=this.weight(u);
    for(;;){
      const now=Date.now();if(now<S.until)throw new Error('Binance đang tạm chặn, thử lại sau '+Math.ceil((S.until-now)/1000)+' giây');
      S.used=S.used.filter(x=>now-x.t<6e4);const sum=S.used.reduce((a,x)=>a+x.w,0);
      if(sum+w<=this.LIMIT){S.used.push({t:now,w});break}
      await sleep(Math.min(6e4,6e4-(now-S.used[0].t)+50))}
    const r=await fetch(u,opt);
    if(r.status===429||r.status===418){
      const ra=+(r.headers.get('Retry-After')||0)*1000;S.code=r.status;
      S.until=Date.now()+Math.max(ra,r.status===418?18e4:6e4);S.used=[];
      if(typeof NetBar!=='undefined')NetBar.show()}
    return r}
};
/* Dữ liệu thị trường Binance: ưu tiên Futures (khớp với biểu đồ TradingView .P), dự phòng Spot.
   Có bộ nhớ đệm: lần đầu tải lịch sử, các lần sau chỉ tải nến mới. */
const Data={
  FAPI:'https://fapi.binance.com',SPOT:['https://data-api.binance.vision','https://api.binance.com'],
  MS:{'5m':3e5,'15m':9e5,'1h':36e5,'4h':144e5,'1d':864e5},
  F:['t','o','h','l','c','v'],
  cache:{},lk:{},px:{},pxAt:0,chg:{},chgAt:0,
  async raw(sym,tf,limit,end){
    const q=`symbol=${sym}&interval=${tf}&limit=${limit}`+(end?`&endTime=${end}`:'');
    const urls=[`${this.FAPI}/fapi/v1/klines?${q}`,...this.SPOT.map(b=>`${b}/api/v3/klines?${q}`)];
    for(const u of urls){if(Net.blocked(u))continue;try{const r=await Net.fetch(u);if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)&&j.length)return j}catch(e){}}
    throw new Error(Net.banned().length?`Binance đang tạm chặn do quá nhiều yêu cầu, bảng tự thử lại sau ${Math.ceil(Net.waitLeft()/1000)} giây`:'Không lấy được dữ liệu '+sym)},
  // Cập nhật nến đang chạy bằng giá realtime (giữ đúng đỉnh/đáy để phát hiện chạm SL/TP)
  live(sym,D){const p=this.px[sym],i=D.t.length-1;if(p==null||i<0)return;if(D.c[i]!==p){D.c[i]=p;if(p>D.h[i])D.h[i]=p;if(p<D.l[i])D.l[i]=p}},
  mk(rows){const D={t:[],o:[],h:[],l:[],c:[],v:[]};for(const r of rows){D.t.push(r[0]);D.o.push(+r[1]);D.h.push(+r[2]);D.l.push(+r[3]);D.c.push(+r[4]);D.v.push(+r[5])}return D},
  // Đảm bảo có ít nhất `need` nến. Các lệnh gọi cùng một cặp (coin, khung) được xếp hàng để không ghi chồng dữ liệu.
  // maxAge (ms): nếu dữ liệu vừa tải trong khoảng này thì dùng luôn, không gọi API (dùng cho khung 4h/1D)
  load(sym,tf,need,maxAge=0){
    const key=sym+'|'+tf,C=this.cache[key];
    if(maxAge&&C&&C.t.length>=need&&Date.now()-C._at<maxAge)return Promise.resolve(C);
    const p=(this.lk[key]||Promise.resolve()).then(()=>this._load(sym,tf,need)).then(D=>{D._at=Date.now();return D});
    this.lk[key]=p.catch(()=>{});return p},
  async _load(sym,tf,need){
    const key=sym+'|'+tf,ms=this.MS[tf];let D=this.cache[key];
    if(!D){
      let rows=[],end;
      while(rows.length<need){ // coin mới niêm yết có thể ít lịch sử hơn yêu cầu: dùng phần có sẵn
        const want=Math.min(1000,need-rows.length);let k;
        try{k=await this.raw(sym,tf,want,end)}catch(e){if(!rows.length)throw e;break}
        rows=k.concat(rows);if(k.length<want)break;end=k[0][0]-1}
      const M=this.mk(rows);if(M.t.length<need)M._full=1; // sàn không có thêm lịch sử cũ hơn: ghi nhớ để không hỏi lại
      return this.cache[key]=M}
    const n0=D.t.length;
    if((n0>=need||D._full)&&(Date.now()<D.t[n0-1]+ms+4000||Date.now()-(D._stale||0)<6e4)){this.live(sym,D);return D} // chưa có nến mới, hoặc vừa hỏi mà sàn chưa có nến mới
    const miss=Math.ceil((Date.now()-D.t[D.t.length-1])/ms)+2;
    if(miss>900){delete this.cache[key];return this._load(sym,tf,need)}
    const N=this.mk(await this.raw(sym,tf,Math.max(5,miss)));
    const lastT=D.t[n0-1];let cut=D.t.length;while(cut>0&&D.t[cut-1]>=N.t[0])cut--;
    for(const a of this.F){D[a].length=cut;D[a].push(...N[a])}
    D._stale=D.t[D.t.length-1]===lastT?Date.now():0;
    while(D.t.length<need&&!D._full){
      const want=Math.min(1000,need-D.t.length);let old;
      try{old=await this.raw(sym,tf,want,D.t[0]-1)}catch(e){if(!Net.banned().length)D._full=1;break} // hết lịch sử cũ hơn: dừng, dùng phần đang có
      const O=this.mk(old);for(const a of this.F)D[a]=O[a].concat(D[a]);
      if(old.length<want){D._full=1;break}}
    return D},
  // Biến động 24 giờ của mọi hợp đồng (gọi tối đa 1 lần/phút)
  async stats24(){
    if(Date.now()-this.chgAt<6e4)return true;
    for(const u of [this.FAPI+'/fapi/v1/ticker/24hr',...this.SPOT.map(b=>b+'/api/v3/ticker/24hr')]){
      if(Net.blocked(u))continue;try{const r=await Net.fetch(u);if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)){for(const x of j){this.chg[x.symbol]=+x.priceChangePercent;if(this.px[x.symbol]==null)this.px[x.symbol]=+x.lastPrice}this.chgAt=Date.now();return true}}catch(e){}}
    return false},
  // Giá hiện tại của mọi hợp đồng trong 1 lần gọi
  async prices(){
    for(const u of [this.FAPI+'/fapi/v1/ticker/price',...this.SPOT.map(b=>b+'/api/v3/ticker/price')]){
      if(Net.blocked(u))continue;try{const r=await Net.fetch(u);if(!r.ok)continue;const j=await r.json();if(Array.isArray(j)){for(const x of j)this.px[x.symbol]=+x.price;this.pxAt=Date.now();return true}}catch(e){}}
    return false}
};

// Thanh cảnh báo khi Binance tạm chặn
const NetBar={
  show(){this.paint()},
  paint(){
    const b=Net.banned(),el=document.getElementById('netbar');if(!el)return;
    if(!b.length){el.hidden=true;return}
    const left=Math.ceil(Math.max(...b.map(x=>x.left))/1000),mm=Math.floor(left/60),ss=String(left%60).padStart(2,'0');
    el.hidden=false;el.innerHTML=`<b>⚠ Binance đang tạm chặn kết nối từ mạng của bạn</b> (mã ${b.map(x=>x.code).join('/')}: gửi quá nhiều yêu cầu). Bảng đã ngừng gọi máy chủ bị chặn, dùng nguồn dự phòng nếu có, và tự thử lại sau <b>${mm}:${ss}</b>. Hãy <b>đóng các tab khác đang mở bảng này</b> (kể cả bản cũ), vì mọi tab dùng chung giới hạn của Binance.`}
};
