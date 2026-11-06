/* Institutional ICT BTC Scalper v2.0 — lướt sóng BTC/USDT theo ICT 2022 Mentorship (theo nghiên cứu của bạn).
   Khung: HTF 1h (vùng quan tâm POI) · MTF 5m (quét thanh khoản, MSS, FVG, vào lệnh). 1h và ngày được dựng lại từ nến 5m đã đóng.
   (Tinh chỉnh vào lệnh trên 1m chưa làm: mỗi lần làm mới phải tải thêm hàng nghìn nến 1m, dễ bị Binance chặn; FVG 5m được dùng thay.)

   TRÌNH TỰ 5 BƯỚC (tất cả bắt buộc, theo đúng thứ tự thời gian)
   B1 Killzone : London 07:00–10:00 UTC (14–17h VN), New York AM 12:30–15:00 UTC (19:30–22h VN).
   B1 HTF POI  : nến quét chạm một Order Block / FVG khung 1h còn hiệu lực cùng chiều, HOẶC mức bị quét là đáy/đỉnh ngày hôm trước (PDL/PDH).
   B2 Sweep    : râu nến 5m xuyên đáy phiên Á / đáy swing gần nhất / PDL ít nhất 0,05×ATR(14) rồi ĐÓNG CỬA quay lại trên mức đó (SHORT ngược lại).
   B3 MSS      : trong tối đa 8 nến sau cú quét, nến thân lớn đóng cửa vượt đỉnh swing đối ứng gần nhất; quãng từ đáy quét tới giá đóng ≥ 1,0×ATR;
                 nhịp này để lại ít nhất 1 FVG rộng ≥ 0,10×ATR chưa bị lấp.
   B4 Entry    : Buy Limit ở MÉP TRÊN của FVG (mép gần), và giá vào phải ở vùng Discount (< 50% nhịp từ đáy quét tới đỉnh MSS). SHORT ngược lại.
                 Hủy lệnh chờ nếu giá chạy tới +1,5R trước khi quay lại FVG, hoặc quá 20 nến 5m chưa khớp.
   QUẢN LÝ: SL = đáy nến quét − 0,05×ATR; nếu SL hẹp hơn 0,15% thì nới ra 0,20%. TP1 +1,5R chốt 50%, dời SL về giá vào + phí (0,1%);
            TP2 +3R chốt nốt. Khối lượng = vốn × rủi ro% ÷ |Entry − SL|; đòn bẩy tự tính để ký quỹ ≤ 20% tài khoản.
   Rủi ro mỗi lệnh dùng chung ô Rủi ro (mặc định 5%) như mọi chiến lược. */
Strat.impl.ict2={
  short:'ICT BTC Scalper v2',
  name:'Institutional ICT BTC Scalper v2.0 (1h POI → 5m)',
  only:['BTCUSDT'],tf:'5m',margCap:0.2,cancelTp1:true,sweepAlert:true,
  desc:'Chỉ BTC, khung 5m, theo ICT 2022 Mentorship. Trong killzone London / New York AM: nến 5m quét thanh khoản (đáy/đỉnh phiên Á, swing gần nhất, PDL/PDH) tại vùng OB/FVG khung 1h → trong 8 nến có MSS thân lớn (≥ 1 ATR) để lại FVG ≥ 0,1 ATR → lệnh chờ ở mép gần của FVG, trong vùng Discount/Premium. SL ngoài cú quét (tối thiểu 0,2% nếu quá hẹp), TP1 1,5R chốt 50% rồi dời SL về giá vào + phí, TP2 3R. Rủi ro theo ô Rủi ro mỗi lệnh (mặc định 5%), ký quỹ ≤ 20% tài khoản.',
  defaults:{k:2,sweepAtr:0.05,mssAtr:1.0,dispBody:0.5,fvgAtr:0.10,mssBars:8,slBuf:0.05,minSl:0.15,setSl:0.20,poiAge:120,beOff:0.1,tp1R:1.5,tp2R:3,W:20,maxHold:288},
  labels:['Trong killzone London / New York AM','Chạm vùng quan tâm 1h (OB / FVG) hoặc quét PDL/PDH','Quét thanh khoản 5m (≥ 0,05 ATR) rồi đóng cửa quay lại','MSS thân lớn trong 8 nến, quãng ≥ 1 ATR','Để lại FVG ≥ 0,10 ATR chưa lấp','Giá vào ở Discount (LONG) / Premium (SHORT)'],
  inKZ(t){const d=new Date(t),m=d.getUTCHours()*60+d.getUTCMinutes();return(m>=420&&m<600)||(m>=750&&m<900)}, // 07:00–10:00 và 12:30–15:00 UTC
  kzName(t){const d=new Date(t),m=d.getUTCHours()*60+d.getUTCMinutes();return m>=420&&m<600?'London':m>=750&&m<900?'New York AM':''},
  // Dựng 1h + ngày từ nến 5m, vùng OB/FVG 1h còn hiệu lực theo từng giờ, đáy/đỉnh phiên Á (00–05h UTC) và ngày hôm trước
  prep(D){
    const n=D.c.length,stamp=n+':'+D.t[n-1]+':'+D.c[n-1];if(D.ict2&&D.ict2.stamp===stamp)return D.ict2;
    const step=n>1?D.t[1]-D.t[0]:3e5;
    const agg=ms=>{const A={t:[],o:[],h:[],l:[],c:[],v:[]},map=new Int32Array(n).fill(-1);let cur=null;
      for(let i=0;i<n;i++){const b=Math.floor(D.t[i]/ms)*ms;
        if(b!==cur){cur=b;A.t.push(b);A.o.push(D.o[i]);A.h.push(D.h[i]);A.l.push(D.l[i]);A.c.push(D.c[i]);A.v.push(D.v[i])}
        else{const k=A.t.length-1;A.h[k]=Math.max(A.h[k],D.h[i]);A.l[k]=Math.min(A.l[k],D.l[i]);A.c[k]=D.c[i];A.v[k]+=D.v[i]}
        map[i]=(D.t[i]+step)%ms===0?A.t.length-1:A.t.length-2}
      return{A,map}};
    const H=agg(36e5),Dd=agg(864e5),S1=Strat.impl.smc.prep(H.A,{k:2,fvgMin:0.25});
    // vùng 1h còn hiệu lực tại giờ k: sinh ra ≤ k, trong poiAge giờ, chưa bị giá ĐÓNG CỬA xuyên qua mép xa
    const act=[];let live=[],zi=0;const Z=S1.zones.slice().sort((a,b)=>a.born-b.born);
    for(let k=0;k<H.A.c.length;k++){
      while(zi<Z.length&&Z[zi].born<=k){live.push(Z[zi]);zi++}
      const c=H.A.c[k];live=live.filter(z=>k-z.born<=this.defaults.poiAge&&(z.side>0?c>=z.lo:c<=z.hi));act[k]=live.slice()}
    // phiên Á 00:00–05:00 UTC của ngày hiện tại
    const asia=new Array(n).fill(null);let day=null,hi=-Infinity,lo=Infinity;
    for(let i=0;i<n;i++){const d=Math.floor(D.t[i]/864e5),m=(D.t[i]%864e5)/6e4;if(d!==day){day=d;hi=-Infinity;lo=Infinity}
      if(m<300){hi=Math.max(hi,D.h[i]);lo=Math.min(lo,D.l[i])}else if(isFinite(hi))asia[i]={hi,lo}}
    return D.ict2={stamp,H,Dd,act,asia}},
  // Đánh giá một chiều (dir = 1 LONG, −1 SHORT) tại nến i: tìm cú quét gần nhất trong mssBars nến cho thiết lập đầy đủ nhất
  side(D,i,P,X,S,I,dir){
    const lg=dir>0,A=I.atr[i],best={sc:-1};
    for(let k=i;k>=Math.max(3,i-P.mssBars);k--){
      const Ak=I.atr[k],lv=[],as=X.asia[k],kd=X.Dd.map[k];
      if(as)lv.push([lg?as.lo:as.hi,lg?'đáy phiên Á':'đỉnh phiên Á',0]);
      lv.push([lg?S.loAt[k-1]:S.hiAt[k-1],lg?'đáy swing gần nhất':'đỉnh swing gần nhất',0]);
      if(kd>=0)lv.push([lg?X.Dd.A.l[kd]:X.Dd.A.h[kd],lg?'đáy ngày hôm trước (PDL)':'đỉnh ngày hôm trước (PDH)',1]);
      let sw=null;for(const[L,src,pd]of lv)if(isFinite(L)&&(lg?D.l[k]<=L-P.sweepAtr*Ak&&D.c[k]>L:D.h[k]>=L+P.sweepAtr*Ak&&D.c[k]<L)){sw={k,L,src,pd};break}
      const ck=new Array(6).fill(false);ck[0]=this.inKZ(D.t[i]+(D.t[1]-D.t[0]));if(!sw){if(best.sc<0)Object.assign(best,{sc:ck.filter(Boolean).length,ck,dir});continue}
      ck[2]=true;
      const ext=lg?D.l[k]:D.h[k],kH=X.H.map[k],poi=kH>=0?X.act[kH].find(z=>z.side===dir&&D.l[k]<=z.hi&&D.h[k]>=z.lo):null;
      ck[1]=!!poi||!!sw.pd;
      const opp=lg?S.hiAt[k]:S.loAt[k];let m=-1;
      for(let j=k+1;j<=Math.min(i,k+P.mssBars);j++)if(isFinite(opp)&&(lg?D.c[j]>opp:D.c[j]<opp)){m=j;break}
      if(m>0)ck[3]=Math.abs(D.c[m]-ext)>=P.mssAtr*I.atr[m]&&Math.abs(D.c[m]-D.o[m])>=P.dispBody*I.atr[m];
      let z=null;if(m>0)for(let q=S.zones.length-1;q>=0;q--){const Zq=S.zones[q];if(Zq.born>Math.min(i,m+1))continue;if(Zq.born<=k)break;
        if(Zq.type==='FVG'&&Zq.side===dir&&Zq.hi-Zq.lo>=P.fvgAtr*I.atr[Zq.born]&&(Zq.mit==null||Zq.mit>i)){z=Zq;break}}
      ck[4]=!!z&&ck[3];
      let leg=lg?-Infinity:Infinity;for(let j=k;j<=i;j++)leg=lg?Math.max(leg,D.h[j]):Math.min(leg,D.l[j]);
      const entry=z?z.prox:NaN;ck[5]=!!z&&(lg?entry<(ext+leg)/2:entry>(ext+leg)/2);
      const sc=ck.filter(Boolean).length;
      if(sc>best.sc)Object.assign(best,{sc,ck,dir,sw,poi,m,z,entry,ext,leg});
      if(sc===6)break}
    return best},
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<300||!(I.atr[i]>0))return null;
    const X=this.prep(D),S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgAtr}),A=I.atr[i];
    const L=this.side(D,i,P,X,S,I,1),Sh=this.side(D,i,P,X,S,I,-1),b=Sh.sc>L.sc?Sh:L,lg=b.dir>0,dirN=b.dir;
    const src=b.sw?` · ${b.sw.src}`:'',poiTxt=b.poi?` · ${b.poi.type} 1h`:b.sw&&b.sw.pd?' · PDL/PDH':'';
    const base={dir:lg?'LONG':'SHORT',dirN,score:b.sc,checks:b.ck.map((ok,q)=>[this.labels[q]+(q===2&&ok?src:q===1&&ok?poiTxt:''),ok]),req:[0,1,2,3,4,5],min:6,A,
      sweep:b.sw?{k:b.sw.k,t:D.t[b.sw.k],src:b.sw.src,dir:dirN}:null,fvg:b.z?{lo:b.z.lo,hi:b.z.hi,born:b.z.born}:null,kz:this.kzName(D.t[i]+(D.t[1]-D.t[0]))};
    if(b.sc<6)return{...base,side:'CHỜ'};
    const entry=b.entry;let sl=b.ext-dirN*P.slBuf*A,R=Math.abs(entry-sl);
    if(R/entry*100<P.minSl){R=entry*P.setSl/100;sl=entry-dirN*R}
    if(lg?D.h[i]>=entry+P.tp1R*R:D.l[i]<=entry-P.tp1R*R)return{...base,side:'CHỜ',gate:'Giá đã chạy tới +1,5R mà chưa quay lại FVG: bỏ thiết lập'};
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl,tp1:entry+dirN*P.tp1R*R,tp2:entry+dirN*P.tp2R*R,
      feat:{slPct:R/entry*100,src:b.sw.src,poi:b.poi?b.poi.type:'PDL/PDH',kz:base.kz,age:i-b.sw.k}}},
  // Lệnh chờ: hủy khi giá chạy tới +1,5R trước khi khớp, hoặc đóng cửa xuyên SL (hết 20 nến do vòng đời lệnh xử lý)
  valid(D,j,sig,P){
    if(sig.dirN>0?D.h[j]>=sig.entry+P.tp1R*sig.R:D.l[j]<=sig.entry-P.tp1R*sig.R)return'Giá chạy tới +1,5R mà chưa quay lại FVG để khớp';
    if(sig.dirN>0?D.c[j]<sig.sl:D.c[j]>sig.sl)return'Giá đóng cửa xuyên qua cú quét, thiết lập không còn hợp lệ';
    return null},
  exit(){return null}, // không cắt sớm: chỉ SL, TP1 (dời SL về giá vào + phí), TP2 hoặc hết 1 ngày
  // Bảng trạng thái trên thẻ: killzone, khoảng cách tới FVG, R:R, lãi/lỗ theo R
  dash(x,s){
    const now=Date.now(),kz=this.kzName(now),a=x.an||{},px=Data.px[s]||x.price,o=Book.openFor(s),rows=[];
    let next='';if(!kz){const d=new Date(now),m=d.getUTCHours()*60+d.getUTCMinutes(),st=[420,750].map(v=>v>m?v-m:v+1440-m),w=Math.min(...st);next=`còn ${Math.floor(w/60)}h${String(w%60).padStart(2,'0')} tới ${st[0]===w?'London':'New York AM'}`}
    rows.push(['Killzone',kz?`🟢 Đang ${kz}`:`⚪ Ngoài giờ · ${next}`]);
    const L=x.tr&&x.tr.L&&Book.isOpen(x.tr.L)?x.tr.L:null,e=o?o.entry:L?L.e:a.fvg?(a.dirN>0?a.fvg.hi:a.fvg.lo):null;
    rows.push(['Khoảng cách tới FVG',e?`${((px-e)/px*100).toFixed(2)}% (${Fmt.px(e)})`:'chưa có FVG']);
    const P=x.P||(x.v&&x.v.params)||this.defaults;rows.push(['R:R','TP1 1:'+P.tp1R+' · TP2 1:'+P.tp2R]);
    if(o&&Book.isFilled(o)){const lv=Book.live(o);rows.push(['Lãi/lỗ tạm tính',lv?`${lv.rr>=0?'+':''}${lv.rr.toFixed(2)}R (${Fmt.sgn(lv.pnl)})`:'-'])}
    else rows.push(['Lãi/lỗ tạm tính',o?'lệnh đang chờ khớp':'chưa có lệnh']);
    if(a.sweep)rows.push(['Cú quét gần nhất',`${a.sweep.dir>0?'↓':'↑'} ${a.sweep.src} lúc ${Fmt.hm(a.sweep.t+3e5)}`]);
    return rows}
};
