/* BTC x100 · SMC/ICT hợp lưu — chỉ dành cho BTCUSDT, khung vào lệnh 15m, đòn bẩy cố định x100.
   Mô hình ICT "sweep → MSS → FVG" theo hướng khung lớn:
     1) Hướng: 4h rõ ràng, 1D không ngược chiều (chỉ LONG khi tăng, chỉ SHORT khi giảm).
     2) Quét thanh khoản: râu xuyên đáy/đỉnh cũ, đáy/đỉnh ngày hôm trước (PDL/PDH) hoặc đáy/đỉnh phiên Á, rồi đóng cửa quay lại.
     3) MSS: sau cú quét, nến đóng cửa vượt đỉnh/đáy cấu trúc gần nhất với lực mạnh (thân ≥ 1,2 ATR hoặc tạo FVG).
     4) Vào lệnh chờ ở giữa FVG/OB (CE) sinh ra trong nhịp phá, chưa bị lấp.
     Điểm cộng: vùng Discount/Premium của 4h, OTE 62–79%, kill zone London/New York, SMT phân kỳ với ETH, volume nhịp phá.
   Cắt lỗ: ngoài cực trị của cú quét. Với x100, thanh lý chỉ cách giá vào ≈ 0,6%, nên bỏ qua mọi thiết lập có cắt lỗ > 0,45%. */
Strat.impl.btc100={
  short:'BTC x100 ICT',
  name:'BTC x100 · SMC/ICT hợp lưu (1D/4h → 15m)',
  only:['BTCUSDT'],tf:'15m',
  desc:'Chỉ BTC, khung 15m, đòn bẩy x100. Hướng từ 1D/4h. Chờ quét thanh khoản → phá cấu trúc có lực (MSS) → đặt lệnh chờ ở giữa FVG/OB của nhịp phá. Cộng điểm khi có Discount/Premium 4h, OTE, kill zone, SMT với ETH, volume. Cắt lỗ ngoài cú quét, tối đa 0,45% để không bị thanh lý trước.',
  defaults:{k:2,look:16,disp:1.2,fvgMin:0.15,minScore:5,maxSl:0.45,minSl:0.12,slBuf:0.1,needOTE:false,needKZ:false,needSMT:false,needDisc:false,needD1:false,tp1R:1.5,tp2R:3,hold:16,W:8,maxHold:32,fixLev:100},
  labels:['Xu hướng 1D/4h đồng thuận','Quét thanh khoản (đáy/đỉnh cũ, PDL/PDH, phiên Á)','Phá cấu trúc MSS có lực','FVG/OB chưa lấp trong nhịp phá','Vùng Discount/Premium của 4h','Vùng OTE 62–79%','Kill zone London / New York','SMT phân kỳ với ETH','Volume nhịp phá ≥ 1,5× TB'],
  inKZ(t){const h=new Date(t).getUTCHours();return(h>=7&&h<10)||(h>=12&&h<16)},
  // Cú quét thanh khoản gần nhất trong `look` nến. Trả về {k: chỉ số nến quét, src: loại thanh khoản}
  sweep(D,i,lg,S,look){
    let k=-1,src='';
    const sw=lg?S.swU[i]:S.swD[i];if(sw>=i-look){k=sw;src=lg?'đáy cấu trúc gần nhất':'đỉnh cấu trúc gần nhất'}
    const hit=(L,from,name)=>{for(let j=i;j>=Math.max(from,i-look);j--)if(lg?(D.l[j]<L&&D.c[j]>L):(D.h[j]>L&&D.c[j]<L)){if(j>k){k=j;src=name}return}};
    const j1=D.i1?D.i1[i]:-1;
    if(j1>=0&&D.D1)hit(lg?D.D1.l[j1]:D.D1.h[j1],0,lg?'đáy ngày hôm trước (PDL)':'đỉnh ngày hôm trước (PDH)');
    const ms=Data.MS['15m'],day=Math.floor(D.t[i]/864e5)*864e5,a0=i-Math.round((D.t[i]-day)/ms),a1=a0+28; // phiên Á: 0h–7h UTC (7h–14h VN)
    if(a0>=0&&a1<=i&&D.t[a0]===day){let lo=Infinity,hi=-Infinity;for(let j=a0;j<a1;j++){lo=Math.min(lo,D.l[j]);hi=Math.max(hi,D.h[j])}hit(lg?lo:hi,a1,lg?'đáy phiên Á':'đỉnh phiên Á')}
    return{k,src}},
  // SMT: tại cú quét BTC tạo đáy (đỉnh) mới nhưng ETH thì không → lực bán (mua) đang yếu
  smt(D,k,lg){
    const E=D.eth;if(!E||k<21)return false;
    let lo=0,hi=E.t.length-1,js=-1;while(lo<=hi){const m=(lo+hi)>>1;if(E.t[m]<=D.t[k]){js=m;lo=m+1}else hi=m-1}
    if(js<21||E.t[js]!==D.t[k])return false;
    let pb=lg?Infinity:-Infinity,pe=lg?Infinity:-Infinity;
    for(let j=1;j<=20;j++){pb=lg?Math.min(pb,D.l[k-j]):Math.max(pb,D.h[k-j]);pe=lg?Math.min(pe,E.l[js-j]):Math.max(pe,E.h[js-j])}
    const nb=lg?Math.min(D.l[k],D.l[k-1]):Math.max(D.h[k],D.h[k-1]),ne=lg?Math.min(E.l[js],E.l[js-1]):Math.max(E.h[js],E.h[js-1]);
    return lg?(nb<pb&&ne>pe):(nb>pb&&ne<pe)},
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<210||!D.bias||!(I.atr[i]>0))return null;
    const M=Strat.impl.smc,S=M.prep(D,{k:P.k,fvgMin:P.fvgMin}),A=I.atr[i],bias=D.bias[i];
    const dirN=bias||S.dirAt[i]||1,lg=dirN>0,ck=new Array(9).fill(false);
    ck[0]=bias===dirN&&bias!==0&&(!P.needD1||D.b1[i]===dirN);
    const sw=this.sweep(D,i,lg,S,P.look);ck[1]=sw.k>=0;
    let m=-1,z=null,entry=NaN,ext=NaN,leg=NaN,sl=NaN,R=NaN,slPct=NaN;
    if(ck[1]){
      const lvl=lg?S.hiAt[sw.k]:S.loAt[sw.k];
      for(let j=sw.k+1;j<=i;j++)if(isFinite(lvl)&&(lg?D.c[j]>lvl:D.c[j]<lvl)){m=j;break}
      if(m>0){
        const body=Math.abs(D.c[m]-D.o[m]),g=P.fvgMin*A,fvg=(a,b)=>lg?D.l[b]-D.h[a]>=g:D.l[a]-D.h[b]>=g;
        ck[2]=body>=P.disp*I.atr[m]||(m>=sw.k+2&&fvg(m-2,m))||(m+1<=i&&fvg(m-1,m+1))}
      for(let q=S.zones.length-1;q>=0;q--){const Z=S.zones[q];if(Z.born>i)continue;if(Z.born<sw.k)break;
        if(Z.side===dirN&&(Z.mit==null||Z.mit>i)&&(lg?Z.mid<D.c[i]:Z.mid>D.c[i])){z=Z;break}}
      ck[3]=!!z&&ck[2];
      ext=lg?Infinity:-Infinity;leg=lg?-Infinity:Infinity;
      for(let j=sw.k;j<=i;j++){ext=lg?Math.min(ext,D.l[j]):Math.max(ext,D.h[j]);leg=lg?Math.max(leg,D.h[j]):Math.min(leg,D.l[j])}
      if(z){
        entry=z.mid;sl=ext-dirN*P.slBuf*A;R=Math.abs(entry-sl);
        if(R/entry*100<P.minSl){R=entry*P.minSl/100;sl=entry-dirN*R}
        slPct=R/entry*100;
        const j4=D.i4?D.i4[i]:-1;
        if(j4>=0&&D.D4){const S4=M.prep(D.D4,{k:3,fvgMin:0.25}),eq=(S4.hiAt[j4]+S4.loAt[j4])/2;ck[4]=isFinite(eq)&&(lg?entry<eq:entry>eq)}
        const r=Math.abs(leg-entry)/Math.abs(leg-ext||1);ck[5]=r>=0.618&&r<=0.79}
      ck[6]=this.inKZ(D.t[i]+Data.MS['15m']);
      ck[7]=this.smt(D,sw.k,lg);
      ck[8]=m>0&&D.v[m]/(I.vol[m]||1)>=1.5}
    const sc=ck.filter(Boolean).length;
    const base={dir:lg?'LONG':'SHORT',dirN,score:sc,checks:ck.map((ok,q)=>[this.labels[q]+(q===1&&ok?` · ${sw.src}`:''),ok]),req:[0,1,2,3],min:P.minScore,A};
    if(!(ck[0]&&ck[1]&&ck[2]&&ck[3]&&sc>=P.minScore))return{...base,side:'CHỜ'};
    const need=[['needOTE',5,'vùng OTE 62–79%'],['needKZ',6,'kill zone London/New York'],['needSMT',7,'SMT phân kỳ với ETH'],['needDisc',4,'vùng Discount/Premium 4h']].find(([k,q])=>P[k]&&!ck[q]);
    if(need)return{...base,side:'CHỜ',gate:`Bộ học đã bật bắt buộc ${need[2]}, nhưng hiện chưa đạt`};
    const liq=(1/P.fixLev-Sizing.MMR)*100;
    if(slPct>P.maxSl)return{...base,side:'CHỜ',gate:`Cắt lỗ theo cấu trúc cần ${slPct.toFixed(2)}%, vượt giới hạn ${P.maxSl}% cho x${P.fixLev} (thanh lý chỉ cách ≈ ${liq.toFixed(2)}%). Bỏ qua để không bị thanh lý trước khi chạm cắt lỗ.`};
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl,tp1:entry+dirN*P.tp1R*R,tp2:entry+dirN*P.tp2R*R,
      feat:{disc:ck[4],ote:ck[5],kz:ck[6],smt:ck[7],vol:ck[8],slPct,src:sw.src}}},
  valid(D,j,sig,P){
    if(D.bias[j]===-sig.dirN)return'Xu hướng khung lớn 4h/1D đã đảo chiều';
    if(sig.dirN>0?D.c[j]<sig.sl:D.c[j]>sig.sl)return'Giá đóng cửa xuyên qua cú quét, thiết lập không còn hợp lệ';
    return null},
  exit(D,j,pos,P){
    const S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgMin}),dir=pos.dir;
    if(D.bias[j]===-dir)return'Xu hướng khung lớn 4h/1D đã đảo chiều ngược lệnh';
    if(!pos.tp1Hit&&S.dirAt[j]===-dir&&S.dirAt[pos.f]===dir)return'CHoCH ngược chiều trên 15m: cấu trúc đã đổi';
    if(!pos.tp1Hit&&j-pos.f>=P.hold&&pos.bestR<0.5)return`Quá ${P.hold} nến (${P.hold/4} giờ) chưa chạy được 0,5R`;
    return null},
  tunables:[
    {k:'minScore',steps:[5,6,7,8],tag:'weak'},{k:'needKZ',steps:[false,true],tag:'offhours'},{k:'needOTE',steps:[false,true],tag:'noOTE'},
    {k:'needSMT',steps:[false,true],tag:'noSMT'},{k:'needDisc',steps:[false,true],tag:'noDisc'},{k:'disp',steps:[1.2,1.6,2],tag:'weakDisp'},
    {k:'maxSl',steps:[0.45,0.35],tag:'wideSL'},{k:'look',steps:[16,10],tag:'oldSweep'},{k:'needD1',steps:[false,true],tag:'counter1D'}],
  tagText:{weak:'ít yếu tố hợp lưu',offhours:'ngoài kill zone',noOTE:'ngoài vùng OTE',noSMT:'không có SMT với ETH',noDisc:'sai vùng Discount/Premium 4h',weakDisp:'nhịp phá yếu',wideSL:'cắt lỗ rộng',oldSweep:'cú quét đã cũ',counter1D:'1D chưa đồng thuận'},
  tags(f){const t=[];if(!f.kz)t.push('offhours');if(!f.ote)t.push('noOTE');if(!f.smt)t.push('noSMT');if(!f.disc)t.push('noDisc');if(!f.vol)t.push('weakDisp');if(f.slPct>0.35)t.push('wideSL');return t}
};
