/* BTC Scalping · ICT / SMC (khung 5m) — lướt sóng ngắn theo mô hình ICT "Silver Bullet": quét thanh khoản → MSS → vào ở FVG.
   Các bước (đều dùng nến ĐÃ ĐÓNG, không nhìn trước tương lai):
     1) Hướng: xu hướng 1h (EMA20/EMA50) và cấu trúc 15m (BOS/CHoCH) phải cùng chiều. Hai khung này dựng lại từ nến 5m.
     2) Thời điểm: chỉ trong kill zone London (14–17h VN) và New York (19–22h VN), lúc thanh khoản cao nhất.
     3) Quét thanh khoản: râu xuyên đáy/đỉnh swing gần nhất hoặc đáy/đỉnh của giờ trước rồi đóng cửa quay lại.
     4) MSS: sau cú quét, nến đóng cửa phá đỉnh/đáy cấu trúc với lực (thân ≥ 1,2 ATR hoặc để lại FVG).
     5) Vào lệnh chờ ở giữa (CE) FVG sinh ra trong nhịp phá, chưa bị lấp.
     Điểm cộng: giá vào ở Discount (LONG) / Premium (SHORT) của nhịp, volume nhịp phá ≥ 1,3× trung bình, vùng OTE 62–79%.
   Cắt lỗ: ngoài cực trị cú quét + 0,1 ATR, nhưng KHÔNG hẹp hơn 0,5% giá (tối đa 0,9%). TP1 / TP2 theo Cài đặt (mặc định 1,5R / 3R).
   Vì sao cắt lỗ tối thiểu 0,5%: phí sàn ~0,1% mỗi lệnh (2 chiều). Cắt lỗ 0,2% thì phí ăn mất 0,5R mỗi lệnh.
   Kiểm chứng BTCUSDT Futures 5m, 104 ngày tới 04/11/2026, đã trừ phí 0,05%/chiều:
     cắt lỗ tối thiểu 0,1%: 35 lệnh, thua 63%, −0,52R/lệnh (trước phí +0,10R/lệnh: có lợi thế nhỏ nhưng phí nuốt hết)
     cắt lỗ tối thiểu 0,5% + bắt buộc OTE (mặc định): 14 lệnh, 2 thắng / 7 hòa vốn / 5 thua (36%), +0,21R/lệnh.
   Mẫu 14 lệnh là RẤT NHỎ, chưa đủ để khẳng định có lãi; bộ tự học sẽ tiếp tục theo dõi từng 100 lệnh.
   Quản lý lệnh kiểu lướt sóng: lệnh chờ tối đa 6 nến (30 phút) và bị bỏ khi hết kill zone; đang chạy mà MSS 5m đảo chiều
   hoặc 2 giờ chưa đi được 0,5R thì cắt sớm; giữ tối đa 3 giờ. Đòn bẩy tự tính từ khoảng cắt lỗ (thanh lý luôn xa ≥ 2 lần cắt lỗ). */
Strat.impl.scalp={
  short:'BTC Scalp ICT',
  name:'BTC Scalping · ICT / SMC (1h/15m → 5m, Silver Bullet)',
  only:['BTCUSDT'],tf:'5m',
  desc:'Chỉ BTC, khung 5m, lướt sóng ngắn trong kill zone London / New York. Hướng 1h + cấu trúc 15m. Chờ quét thanh khoản → phá cấu trúc có lực (MSS) → lệnh chờ ở giữa FVG của nhịp phá. Bắt buộc giá vào trong vùng OTE 62–79%. Cắt lỗ ngoài cú quét, tối thiểu 0,5% để phí không ăn mất lợi thế. Lệnh chờ 30 phút, giữ tối đa 3 giờ, tự cắt khi MSS ngược chiều.',
  defaults:{k:2,look:12,disp:1.2,fvgMin:0.1,minScore:6,slBuf:0.1,minSl:0.5,maxSl:0.9,needOTE:true,volMin:1.3,kz:1,tp1R:1.5,tp2R:3,hold:24,W:6,maxHold:36},
  labels:['Xu hướng 1h + cấu trúc 15m đồng thuận','Trong kill zone London / New York','Quét thanh khoản (swing gần / đỉnh-đáy giờ trước)','Phá cấu trúc MSS có lực','FVG chưa lấp trong nhịp phá','Giá vào ở Discount / Premium của nhịp','Volume nhịp phá ≥ 1,3× trung bình','Vùng OTE 62–79%'],
  // London 07–10h UTC, New York 12–15h UTC (gồm giờ Silver Bullet 14–15h UTC)
  inKZ(t){const d=new Date(t),h=d.getUTCHours();return(h>=7&&h<10)||(h>=12&&h<15)},
  // Dựng khung 1h và 15m từ nến 5m; map[i] = chỉ số nến khung lớn ĐÃ ĐÓNG tại thời điểm nến 5m thứ i đóng
  prep(D){
    const n=D.c.length,stamp=n+':'+D.t[n-1]+':'+D.c[n-1];if(D.scp&&D.scp.stamp===stamp)return D.scp;
    const step=n>1?D.t[1]-D.t[0]:3e5;
    const agg=ms=>{const A={t:[],o:[],h:[],l:[],c:[],v:[]},map=new Int32Array(n).fill(-1);let cur=null;
      for(let i=0;i<n;i++){const b=Math.floor(D.t[i]/ms)*ms;
        if(b!==cur){cur=b;A.t.push(b);A.o.push(D.o[i]);A.h.push(D.h[i]);A.l.push(D.l[i]);A.c.push(D.c[i]);A.v.push(D.v[i])}
        else{const k=A.t.length-1;A.h[k]=Math.max(A.h[k],D.h[i]);A.l[k]=Math.min(A.l[k],D.l[i]);A.c[k]=D.c[i];A.v[k]+=D.v[i]}
        map[i]=(D.t[i]+step)%ms===0?A.t.length-1:A.t.length-2}
      return{A,map}};
    const H=agg(36e5),M=agg(9e5),e20=Ind.ema(H.A.c,20),e50=Ind.ema(H.A.c,50);
    const tr=H.A.c.map((c,k)=>k<50?0:c>e50[k]&&e20[k]>e50[k]?1:c<e50[k]&&e20[k]<e50[k]?-1:0);
    const S15=Strat.impl.smc.prep(M.A,{k:2,fvgMin:0.25});
    return D.scp={stamp,H,M,tr,S15}},
  trendAt(X,i){const kH=X.H.map[i],k15=X.M.map[i];return{h:kH>=0?X.tr[kH]:0,m:k15>=0?X.S15.dirAt[k15]:0,kH}},
  // Cú quét gần nhất trong `look` nến: râu xuyên mức thanh khoản rồi đóng cửa quay lại
  sweep(D,i,lg,S,X,look){
    for(let j=i;j>=Math.max(2,i-look);j--){
      const lv=[[lg?S.loAt[j-1]:S.hiAt[j-1],lg?'đáy swing gần nhất':'đỉnh swing gần nhất']],kH=X.H.map[j];
      if(kH>=0)lv.push([lg?X.H.A.l[kH]:X.H.A.h[kH],lg?'đáy giờ trước':'đỉnh giờ trước']);
      for(const[L,src]of lv)if(isFinite(L)&&(lg?D.l[j]<L&&D.c[j]>L:D.h[j]>L&&D.c[j]<L))return{k:j,src,lvl:L}}
    return{k:-1,src:''}},
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<300||!(I.atr[i]>0))return null;
    const X=this.prep(D),S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgMin}),A=I.atr[i],T=this.trendAt(X,i);
    if(T.kH<52)return null;
    const dirN=T.h||T.m||1,lg=dirN>0,ck=new Array(8).fill(false),step=D.t[1]-D.t[0];
    ck[0]=T.h!==0&&T.h===T.m;
    ck[1]=!P.kz||this.inKZ(D.t[i]+step);
    const sw=this.sweep(D,i,lg,S,X,P.look);ck[2]=sw.k>=0;
    let m=-1,z=null,entry=NaN,sl=NaN,R=NaN,ext=NaN,leg=NaN;
    if(ck[2]){
      const lvl=lg?S.hiAt[sw.k]:S.loAt[sw.k];
      for(let j=sw.k+1;j<=i;j++)if(isFinite(lvl)&&(lg?D.c[j]>lvl:D.c[j]<lvl)){m=j;break}
      if(m>0){const body=Math.abs(D.c[m]-D.o[m]),g=P.fvgMin*A,fvg=(a,b)=>lg?D.l[b]-D.h[a]>=g:D.l[a]-D.h[b]>=g;
        ck[3]=body>=P.disp*I.atr[m]||(m>=2&&fvg(m-2,m))||(m+1<=i&&fvg(m-1,m+1));
        ck[6]=D.v[m]/(I.vol[m]||1)>=P.volMin}
      for(let q=S.zones.length-1;q>=0;q--){const Z=S.zones[q];if(Z.born>i)continue;if(Z.born<sw.k)break;
        if(Z.type==='FVG'&&Z.side===dirN&&(Z.mit==null||Z.mit>i)&&(lg?Z.mid<D.c[i]:Z.mid>D.c[i])){z=Z;break}}
      ck[4]=!!z&&ck[3];
      ext=lg?Infinity:-Infinity;leg=lg?-Infinity:Infinity;
      for(let j=sw.k;j<=i;j++){ext=lg?Math.min(ext,D.l[j]):Math.max(ext,D.h[j]);leg=lg?Math.max(leg,D.h[j]):Math.min(leg,D.l[j])}
      if(z){entry=z.mid;sl=ext-dirN*P.slBuf*A;R=Math.abs(entry-sl);if(R/entry*100<P.minSl){R=entry*P.minSl/100;sl=entry-dirN*R}
        const eq=(ext+leg)/2,r=Math.abs(leg-entry)/Math.abs(leg-ext||1);ck[5]=lg?entry<eq:entry>eq;ck[7]=r>=0.62&&r<=0.79}}
    const sc=ck.filter(Boolean).length;
    const base={dir:lg?'LONG':'SHORT',dirN,score:sc,checks:ck.map((ok,q)=>[this.labels[q]+(q===2&&ok?` · ${sw.src}`:''),ok]),req:[0,1,2,3,4],min:P.minScore,A};
    if(!(ck[0]&&ck[1]&&ck[2]&&ck[3]&&ck[4]&&sc>=P.minScore))return{...base,side:'CHỜ'};
    if(P.needOTE&&!ck[7])return{...base,side:'CHỜ',gate:'Bộ học đã bật bắt buộc vùng OTE 62–79%, nhưng giá vào chưa nằm trong vùng này'};
    const slPct=R/entry*100;
    if(slPct>P.maxSl)return{...base,side:'CHỜ',gate:`Cắt lỗ theo cú quét cần ${slPct.toFixed(2)}%, quá rộng cho lướt sóng (tối đa ${P.maxSl}%)`};
    if(lg?D.c[i]>=entry+P.tp1R*R:D.c[i]<=entry-P.tp1R*R)return{...base,side:'CHỜ',gate:'Giá đã đi quá TP1 so với FVG: bỏ qua, chờ thiết lập mới'};
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl,tp1:entry+dirN*P.tp1R*R,tp2:entry+dirN*P.tp2R*R,
      feat:{disc:ck[5],vol:ck[6],ote:ck[7],slPct,src:sw.src,hour:new Date(D.t[i]).getUTCHours(),age:i-sw.k}}},
  // Lệnh chờ: bỏ khi giá đóng cửa xuyên cú quét, xu hướng 1h đảo chiều, hoặc đã hết kill zone
  valid(D,j,sig,P){
    if(sig.dirN>0?D.c[j]<sig.sl:D.c[j]>sig.sl)return'Giá đóng cửa xuyên qua cú quét, thiết lập không còn hợp lệ';
    const T=this.trendAt(this.prep(D),j);if(T.h===-sig.dirN)return'Xu hướng 1h đã đảo chiều';
    if(P.kz&&!this.inKZ(D.t[j]+(D.t[1]-D.t[0])))return'Đã hết kill zone, lướt sóng không giữ lệnh chờ ngoài giờ thanh khoản cao';
    return null},
  exit(D,j,pos,P){
    const S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgMin}),dir=pos.dir;
    if(S.dirAt[j]===-dir&&S.dirAt[pos.f]===dir)return'MSS 5m ngược chiều: cấu trúc đã đổi';
    if(!pos.tp1Hit&&j-pos.f>=P.hold&&pos.bestR<0.5)return`Quá ${P.hold} nến (${P.hold*5/60} giờ) chưa chạy được 0,5R`;
    return null},
  tunables:[{k:'minScore',steps:[6,7,8],tag:'weak'},{k:'minSl',steps:[0.5,0.6,0.7],tag:'fee'},{k:'disp',steps:[1.2,1.6,2],tag:'weakDisp'},
    {k:'volMin',steps:[1.3,1.7],tag:'lowVol'},{k:'slBuf',steps:[0.1,0.25],tag:'stopped'},{k:'look',steps:[12,8,6],tag:'oldSweep'}],
  tagText:{fee:'cắt lỗ hẹp nên phí chiếm nhiều',weak:'ít điểm hợp lưu',noOTE:'giá vào ngoài vùng OTE',weakDisp:'nhịp phá yếu',lowVol:'volume nhịp phá thấp',stopped:'cắt lỗ quá sát cú quét',oldSweep:'cú quét đã cũ'},
  tags(f){const t=['stopped'];if(f.slPct<0.6)t.push('fee');if(!f.vol)t.push('lowVol');if(f.age>8)t.push('oldSweep');if(!f.disc)t.push('weak');t.push('weakDisp');return t}
};
