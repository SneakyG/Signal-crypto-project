/* Chiến lược của bạn: EMA / MACD / RSI / Volume / ATR + xu hướng khung lớn 1D/4h.
   Có thêm 3 bộ lọc SMC tuỳ chọn (Discount/Premium, quét thanh khoản, vùng OB/FVG). Mặc định TẮT; bộ học sẽ thử bật
   và chỉ giữ lại bộ lọc nào thực sự làm tăng tỉ lệ thắng ("hợp thì viết vào"). */
Strat.impl.ema={
  short:'EMA cũ',hidden:true,
  name:'Chiến lược của bạn (EMA đa khung 1D/4h → khung nhỏ)',
  desc:'Khung 4h (và 1D không được ngược chiều) cho hướng. Khung nhỏ chỉ vào lệnh theo hướng đó khi EMA20/50/200 đúng chiều, MACD cùng chiều, RSI vùng khoẻ, volume cao hơn trung bình, không đuổi giá. Đặt lệnh chờ hồi về một phần ATR; cắt lỗ theo ATR.',
  defaults:{minScore:5,rsiLo:45,rsiHi:68,volMult:1.2,ext:1.5,trendStr:0,needD1:false,needDisc:false,needSweep:false,needZone:false,pb:0.5,slx:1.5,tp1R:1.5,tp2R:3,hold:12,W:3,maxHold:48},
  labels:['Xu hướng 4h/1D','Xu hướng khung nhỏ (EMA20/50/200)','MACD cùng chiều','RSI vùng khoẻ','Volume trên mức trung bình','Không đuổi giá'],
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<210||!D.bias||I.vol[i]==null||I.rsi[i]==null)return null;
    const c=D.c[i],A=I.atr[i];if(!(A>0))return null;
    const vr=D.v[i]/I.vol[i],hs=I.hist[i],hp=I.hist[i-1],r=I.rsi[i],str=Math.abs(I.e20[i]-I.e50[i])/A,bias=D.bias[i],b1=D.b1[i];
    const L=[bias===1&&(!P.needD1||b1===1),c>I.e200[i]&&I.e20[i]>I.e50[i]&&str>=P.trendStr,hs>0&&hs>hp,r>=P.rsiLo&&r<=P.rsiHi,vr>P.volMult,c-I.e20[i]<P.ext*A];
    const S=[bias===-1&&(!P.needD1||b1===-1),c<I.e200[i]&&I.e20[i]<I.e50[i]&&str>=P.trendStr,hs<0&&hs<hp,r>=100-P.rsiHi&&r<=100-P.rsiLo,vr>P.volMult,I.e20[i]-c<P.ext*A];
    const sl=L.filter(Boolean).length,ss=S.filter(Boolean).length,lg=sl>=ss,ck=lg?L:S,sc=lg?sl:ss,dirN=lg?1:-1;
    const base={dir:lg?'LONG':'SHORT',dirN,score:sc,checks:ck.map((ok,k)=>[this.labels[k],ok]),req:[0,1],min:P.minScore,A};
    if(!(ck[0]&&ck[1]&&sc>=P.minScore))return{...base,side:'CHỜ'};
    const R=P.slx*A,entry=c-dirN*P.pb*A;
    if(P.needDisc||P.needSweep||P.needZone){ // bộ lọc SMC tuỳ chọn
      const M=Strat.impl.smc,S2=M.prep(D,M.defaults),eq=(S2.hiAt[i]+S2.loAt[i])/2;
      if(P.needDisc&&!(lg?entry<eq:entry>eq))return{...base,side:'CHỜ',gate:`Bộ lọc SMC (bộ học đã bật): giá vào chưa nằm ở vùng ${lg?'Discount (dưới 50% biên độ)':'Premium (trên 50% biên độ)'}`};
      if(P.needSweep&&!((lg?S2.swU[i]:S2.swD[i])>=i-30))return{...base,side:'CHỜ',gate:'Bộ lọc SMC (bộ học đã bật): 30 nến gần nhất chưa có cú quét thanh khoản'};
      if(P.needZone&&!M.findZone(S2,i,dirN,{maxAge:60,maxDist:3,zone:'any'},A,c))return{...base,side:'CHỜ',gate:'Bộ lọc SMC (bộ học đã bật): không có vùng OB/FVG chưa chạm gần giá'}}
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl:entry-dirN*R,tp1:entry+dirN*P.tp1R*R,tp2:entry+dirN*P.tp2R*R,
      feat:{vr,rsi:r,ext:(lg?c-I.e20[i]:I.e20[i]-c)/A,str,b1ok:b1===dirN,hour:new Date(D.t[i]).getUTCHours(),atrPct:A/c*100}}},
  exit(D,j,pos,P){
    const I=Ind.prep(D),dir=pos.dir,c=D.c[j],r=dir*(c-pos.entry)/pos.R;
    if(D.bias[j]===-dir)return'Xu hướng khung lớn 4h/1D đã đảo chiều ngược lệnh';
    if(!pos.tp1Hit&&r<0&&dir*I.hist[j]<0&&dir*I.hist[j]<dir*I.hist[j-1]&&dir*(c-I.e20[j])<0&&pos.bestR<0.5)return'Mất động lượng: giá dưới giá vào và dưới EMA20';
    if(!pos.tp1Hit&&j-pos.f>=P.hold&&pos.bestR<0.5)return`Quá ${P.hold} nến chưa chạy được 0,5R`;
    if(pos.tp1Hit){const o=this.analyze(D,j,P);if(o&&o.side!=='CHỜ'&&o.dirN===-dir)return'Xuất hiện tín hiệu ngược chiều sau TP1'}
    return null},
  tunables:[
    {k:'volMult',steps:[1.2,1.5,2],tag:'lowVol'},{k:'ext',steps:[1.5,1,0.7],tag:'chase'},{k:'trendStr',steps:[0,0.3,0.6,1],tag:'weak'},
    {k:'needD1',steps:[false,true],tag:'counter1D'},{k:'minScore',steps:[5,6],tag:'weak'},{k:'rsiHi',steps:[68,62,58],tag:'hot'},
    {k:'pb',steps:[0.5,0.8,1.1],tag:'shallow'},{k:'slx',steps:[1.5,2],tag:'stopped'},
    {k:'needDisc',steps:[false,true],tag:'noDisc'},{k:'needSweep',steps:[false,true],tag:'noSweep'},{k:'needZone',steps:[false,true],tag:'noZone'}],
  tagText:{lowVol:'volume thấp',chase:'vào đuổi giá',weak:'xu hướng yếu',counter1D:'ngược xu hướng 1D',hot:'RSI quá nóng',shallow:'hồi chưa đủ sâu',stopped:'cắt lỗ quá sát',noDisc:'sai vùng Discount/Premium',noSweep:'chưa quét thanh khoản',noZone:'xa vùng OB/FVG'},
  tags(f,dirN){const t=[];if(f.vr<1.3)t.push('lowVol');if(f.ext>0.8)t.push('chase');if(f.str<0.5)t.push('weak');if(!f.b1ok)t.push('counter1D');if(dirN>0?f.rsi>62:f.rsi<38)t.push('hot');return t}
};
