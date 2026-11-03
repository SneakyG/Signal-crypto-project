/* SMC / ICT: cấu trúc thị trường (BOS/CHoCH), Order Block, Fair Value Gap, quét thanh khoản, Discount/Premium, kill zone.
   Quy trình: khung lớn 1D/4h cho HƯỚNG → khung nhỏ chờ giá hồi về vùng OB/FVG chưa chạm theo hướng đó → đặt lệnh chờ tại vùng. */
Strat.impl.smc={
  short:'SMC / ICT',
  name:'SMC / ICT (cấu trúc, Order Block, FVG, thanh khoản)',
  desc:'Khung 1D/4h xác định hướng. Khung nhỏ tìm Order Block / Fair Value Gap chưa bị chạm sau khi cấu trúc bị phá (BOS/CHoCH), chỉ mua ở vùng Discount và bán ở vùng Premium, ưu tiên khi có quét thanh khoản. Lệnh chờ đặt tại giữa vùng, cắt lỗ ngoài vùng.',
  defaults:{k:3,fvgMin:0.25,maxAge:60,maxDist:3,minScore:4,zone:'any',entry:'mid',slBuf:0.25,minR:0.8,maxR:3,needSweep:false,needDisc:false,session:0,sweepAge:30,tp1R:1.5,tp2R:3,hold:12,W:6,maxHold:48},
  labels:['Xu hướng 4h/1D','Cấu trúc khung nhỏ (BOS/CHoCH)','Vùng OB/FVG chưa chạm','Đúng vùng Discount/Premium','Có quét thanh khoản'],
  inKZ(t){const h=new Date(t).getUTCHours();return(h>=7&&h<10)||(h>=12&&h<16)}, // London 7-10h, New York 12-16h (UTC)
  // Tính một lần: pivot, cấu trúc, vùng OB/FVG, quét thanh khoản. Mọi thứ chỉ dựa vào nến đã biết tại thời điểm đó.
  prep(D,P){
    const n=D.c.length,stamp=n+':'+D.t[n-1]+':'+D.c[n-1],key=P.k+':'+P.fvgMin;
    if(D.smcStamp!==stamp){D.smcC={};D.smcStamp=stamp}
    if(D.smcC[key])return D.smcC[key];
    const I=Ind.prep(D),A=I.atr,o=D.o,h=D.h,l=D.l,c=D.c,k=P.k,span=60;
    const dirAt=new Int8Array(n),hiAt=new Float64Array(n),loAt=new Float64Array(n),swU=new Int32Array(n).fill(-1),swD=new Int32Array(n).fill(-1),zones=[];
    let dir=0,lastH=null,lastL=null,sU=-1,sD=-1;
    const ob=(i,side)=>{ // nến ngược chiều gần nhất trước cú phá cấu trúc
      for(let j=i-1;j>=Math.max(0,i-12);j--){
        if(side>0?c[j]<o[j]:c[j]>o[j]){const top=Math.max(o[j],c[j]),bot=Math.min(o[j],c[j]);
          return{side,type:'OB',lo:l[j],hi:h[j],prox:side>0?top:bot,mid:(top+bot)/2,born:i}}}
      return null};
    for(let i=0;i<n;i++){
      const p=i-k; // pivot chỉ được xác nhận sau k nến bên phải
      if(p>=k){let H=true,Lw=true;for(let q=p-k;q<=p+k;q++){if(q===p)continue;if(h[q]>=h[p])H=false;if(l[q]<=l[p])Lw=false}
        if(H)lastH={p:h[p],used:false};if(Lw)lastL={p:l[p],used:false}}
      if(lastL&&l[i]<lastL.p&&c[i]>lastL.p)sU=i;   // râu quét đáy rồi đóng cửa quay lại
      if(lastH&&h[i]>lastH.p&&c[i]<lastH.p)sD=i;   // râu quét đỉnh rồi đóng cửa quay lại
      if(lastH&&!lastH.used&&c[i]>lastH.p){lastH.used=true;dir=1;const z=ob(i,1);if(z)zones.push(z)}
      if(lastL&&!lastL.used&&c[i]<lastL.p){lastL.used=true;dir=-1;const z=ob(i,-1);if(z)zones.push(z)}
      if(i>=2&&A[i]>0){const g=P.fvgMin*A[i];
        if(l[i]-h[i-2]>=g)zones.push({side:1,type:'FVG',lo:h[i-2],hi:l[i],prox:l[i],mid:(h[i-2]+l[i])/2,born:i});
        if(l[i-2]-h[i]>=g)zones.push({side:-1,type:'FVG',lo:h[i],hi:l[i-2],prox:h[i],mid:(h[i]+l[i-2])/2,born:i})}
      dirAt[i]=dir;hiAt[i]=lastH?lastH.p:NaN;loAt[i]=lastL?lastL.p:NaN;swU[i]=sU;swD[i]=sD}
    for(const z of zones){ // lần đầu giá chạm cạnh gần của vùng = vùng đã dùng
      z.mit=null;const end=Math.min(n-1,z.born+span+10);
      for(let j=z.born+1;j<=end;j++){if(z.side>0?l[j]<=z.prox:h[j]>=z.prox){z.mit=j;break}}}
    return D.smcC[key]={key,dirAt,hiAt,loAt,swU,swD,zones,births:zones.map(z=>z.born)}},
  // Vùng chưa chạm, cùng chiều, gần giá nhất
  findZone(S,i,dirN,P,A,c){
    let lo=0,hi=S.births.length-1,idx=-1;
    while(lo<=hi){const m=(lo+hi)>>1;if(S.births[m]<=i){idx=m;lo=m+1}else hi=m-1}
    let z=null;
    for(let q=idx;q>=0;q--){
      const Z=S.zones[q];if(Z.born<i-P.maxAge)break;
      if(Z.side!==dirN||(Z.mit!=null&&Z.mit<=i)||(P.zone!=='any'&&Z.type!==P.zone))continue;
      const d=dirN>0?c-Z.prox:Z.prox-c;if(d<=0||d>P.maxDist*A)continue;
      if(!z||d<z.d)z={...Z,d}}
    return z},
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<210||!D.bias||!(I.atr[i]>0))return null;
    const S=this.prep(D,P),A=I.atr[i],c=D.c[i],bias=D.bias[i],dirN=bias||S.dirAt[i]||1,lg=dirN>0;
    const z=this.findZone(S,i,dirN,P,A,c),entry=z?(P.entry==='prox'?z.prox:z.mid):NaN,eq=(S.hiAt[i]+S.loAt[i])/2;
    const disc=!!z&&(lg?entry<eq:entry>eq),sweep=(lg?S.swU[i]:S.swD[i])>=i-P.sweepAge;
    const ck=[bias===dirN&&bias!==0,S.dirAt[i]===dirN,!!z,disc,sweep],sc=ck.filter(Boolean).length;
    const base={dir:lg?'LONG':'SHORT',dirN,score:sc,checks:ck.map((ok,q)=>[this.labels[q],ok]),req:[0,1,2],min:P.minScore,A};
    const ses=!P.session||this.inKZ(D.t[i]);
    if(!(ck[0]&&ck[1]&&ck[2]&&sc>=P.minScore))return{...base,side:'CHỜ'};
    if(P.needSweep&&!sweep)return{...base,side:'CHỜ',gate:'Bộ học đã bật bắt buộc quét thanh khoản, nhưng chưa có'};
    if(P.needDisc&&!disc)return{...base,side:'CHỜ',gate:'Bộ học đã bật bắt buộc vùng Discount/Premium, nhưng vùng hiện tại chưa đạt'};
    if(!ses)return{...base,side:'CHỜ',gate:'Bộ học đã giới hạn chỉ vào lệnh trong giờ London (14–17h VN) và New York (19–23h VN)'};
    let sl=lg?z.lo-P.slBuf*A:z.hi+P.slBuf*A,R=Math.abs(entry-sl);
    if(R<P.minR*A){R=P.minR*A;sl=entry-dirN*R}
    if(lg?c>=entry+P.tp1R*R:c<=entry-P.tp1R*R)return{...base,side:'CHỜ',gate:'Giá đã đi quá TP1 so với vùng vào lệnh: chờ vùng mới gần giá hơn'};
    if(R>P.maxR*A)return{...base,side:'CHỜ',gate:`Vùng ${z.type} quá rộng: cắt lỗ cần ${(R/A).toFixed(1)} ATR, vượt giới hạn ${P.maxR} ATR`};
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl,tp1:entry+dirN*P.tp1R*R,tp2:entry+dirN*P.tp2R*R,
      feat:{zoneType:z.type,disc,sweep,dist:z.d/A,age:i-z.born,hour:new Date(D.t[i]).getUTCHours(),vr:D.v[i]/(I.vol[i]||1)}}},
  // Lệnh chờ còn hiệu lực không? (giá chạm mép vùng là bình thường, không hủy)
  valid(D,j,sig,P){
    if(D.bias[j]===-sig.dirN)return'Xu hướng khung lớn 4h/1D đã đảo chiều';
    if(sig.dirN>0?D.c[j]<sig.sl:D.c[j]>sig.sl)return'Giá đóng cửa xuyên qua vùng, thiết lập không còn hợp lệ';
    return null},
  // Lý do thoát sớm (tại nến đã đóng j sau khi lệnh khớp); trả về chuỗi lý do hoặc null
  exit(D,j,pos,P){
    const S=this.prep(D,P),dir=pos.dir;
    if(D.bias[j]===-dir)return'Xu hướng khung lớn 4h/1D đã đảo chiều ngược lệnh';
    if(S.dirAt[j]===-dir&&S.dirAt[pos.f]===dir)return'CHoCH ngược chiều: cấu trúc khung nhỏ đã đổi';
    if(!pos.tp1Hit&&j-pos.f>=P.hold&&pos.bestR<0.5)return`Quá ${P.hold} nến chưa chạy được 0,5R`;
    return null},
  // Các "nấc siết" mà bộ học được phép thử (từ lỏng đến chặt)
  tunables:[
    {k:'minScore',steps:[4,5],tag:'weak'},{k:'needDisc',steps:[false,true],tag:'noDisc'},{k:'needSweep',steps:[false,true],tag:'noSweep'},
    {k:'zone',steps:['any','OB'],tag:'fvg'},{k:'maxDist',steps:[3,2,1.2],tag:'far'},{k:'maxAge',steps:[60,40,25],tag:'old'},
    {k:'session',steps:[0,1],tag:'offhours'},{k:'slBuf',steps:[0.25,0.5],tag:'stopped'},{k:'fvgMin',steps:[0.25,0.5,0.8],tag:'fvg'}],
  tagText:{weak:'điểm điều kiện thấp',noDisc:'sai vùng Discount/Premium',noSweep:'chưa quét thanh khoản',fvg:'vào ở vùng FVG yếu',far:'vùng quá xa giá',old:'vùng quá cũ',offhours:'ngoài giờ London/New York',stopped:'cắt lỗ quá sát'},
  tags(f){const t=[];if(!f.disc)t.push('noDisc');if(!f.sweep)t.push('noSweep');if(f.zoneType==='FVG')t.push('fvg');if(f.dist>2)t.push('far');if(f.age>40)t.push('old');const h=f.hour;if(!((h>=7&&h<10)||(h>=12&&h<16)))t.push('offhours');return t}
};
