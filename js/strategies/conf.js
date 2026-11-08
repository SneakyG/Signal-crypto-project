/* SMC + ICT Confluence: chỉ vào lệnh khi ĐỦ 8 yếu tố hội tụ (thiếu 1 = đứng ngoài, tránh vào lệnh giả / overtrading).
   Quy trình:
   1) Phân tích dữ liệu: xu hướng khung lớn 4h (1D không ngược chiều), biến động ATR so với trung vị 100 nến.
   2) Tín hiệu ICT/SMC: bể thanh khoản (đỉnh/đáy bằng nhau EQH/EQL, swing đứng yên ≥ 20 nến, PDH/PDL) bị QUÉT (stop run:
      râu vượt qua rồi đóng cửa quay lại) → phá cấu trúc (MSB/CHoCH) bằng nến thân lớn → để lại vùng POI (FVG hoặc Order Block).
   3) Hội tụ: POI phải nằm trong vùng OTE 62–79% của nhịp từ đáy/đỉnh cú quét tới đỉnh/đáy nhịp phá.
   4) Điều kiện vào: thời điểm (cú quét gần đây, phá cấu trúc trong ≤ 15 nến), giá (Limit ở mép gần của phần POI ∩ OTE,
      chưa hồi qua điểm vào), khối lượng (nến quét/nến phá ≥ 1,3× khối lượng TB 20 nến).
   5) Rủi ro: SL ngoài râu cú quét + 0,1 ATR (tối thiểu 0,25% giá). Khối lượng lệnh = % rủi ro tài khoản ÷ khoảng SL (Cài đặt).
      Phải còn ≥ 2R tới thanh khoản đối ứng mới vào.
   6) Theo dõi: TP1 = đỉnh/đáy nhịp phá (1–1,5R) chốt 50%, dời SL về giá vào + phí; TP2 = thanh khoản đối ứng (2,5–3R).
   7) Thoát thích ứng: đóng sớm khi thị trường đổi trạng thái (CHoCH ngược chiều thân lớn sau khi khớp, hoặc xu hướng 4h/1D đảo).
   Khung: cố định 1h (kiểm chứng 24 coin ~250 ngày: 1h có lãi, 15m/5m lỗ sau phí vì cú quét giả quá nhiều).
   8) Giới hạn: xem dòng mô tả trong Cài đặt và phần cuối trả lời của Claude (dữ liệu nến, không có order flow / tin tức). */
Strat.impl.conf={
  short:'SMC + ICT Confluence',
  name:'SMC + ICT Confluence (quét thanh khoản → MSB → POI ∩ OTE)',
  desc:'Khung 1h, mọi coin. Chỉ vào khi đủ 8 yếu tố: thuận xu hướng 4h/1D, biến động bình thường, quét bể thanh khoản (EQH/EQL, swing cũ, PDH/PDL) rồi đóng cửa quay lại, phá cấu trúc bằng nến thân lớn, khối lượng xác nhận, để lại FVG/Order Block chưa chạm, vùng đó trùng OTE 62–79%, còn ≥ 2R tới thanh khoản đối ứng. Limit ở mép vùng. SL ngoài cú quét. TP1 đỉnh/đáy nhịp phá chốt 50% rồi dời SL về giá vào + phí, TP2 thanh khoản đối ứng. Thoát sớm khi CHoCH ngược chiều hoặc xu hướng lớn đảo.',
  tf:'1h',rev:1,noCalib:true,cancelTp1:true, // kiểm chứng: 15m và 5m lỗ sau phí, 1h có lãi ổn định → cố định khung 1h
  defaults:{k:3,kInt:2,fvgMin:0.10,sweepAtr:0.05,mssBars:15,dispBody:1.0,volMult:1.3,eqTol:0.1,poolAge:20,poolLook:150,oteLo:0.62,oteHi:0.79,
    roomR:2,slBuf:0.1,minSl:0.25,volLo:0.6,volHi:2.5,beOff:0.1,tp1R:1.5,tp2R:3,t1Min:1.0,t2Min:2.5,W:12,maxHold:96},
  labels:['Thuận xu hướng khung lớn 4h/1D','Biến động bình thường (ATR 0,6–2,5× trung vị)','Quét bể thanh khoản rồi đóng cửa quay lại (stop run)',
    'Phá cấu trúc (MSB/CHoCH) trong 15 nến, nhịp phá có nến thân ≥ 1 ATR','Khối lượng xác nhận (≥ 1,3× TB 20 nến)','Để lại FVG / Order Block chưa chạm',
    'Vùng POI trùng OTE 62–79%','Còn ≥ 2R tới thanh khoản đối ứng'],
  // Pivot đỉnh/đáy (xác nhận sau k nến) và nến đầu tiên giá vượt qua nó (lúc thanh khoản bị lấy)
  pools(D,P){
    const n=D.c.length,stamp=n+':'+D.t[n-1]+':'+D.c[n-1]+':'+P.k;if(D.confP&&D.confP.stamp===stamp)return D.confP;
    const h=D.h,l=D.l,k=P.k,PH=[],PL=[];
    for(let p=k;p<n-k;p++){let H=true,L=true;
      for(let q=p-k;q<=p+k;q++){if(q===p)continue;if(h[q]>=h[p])H=false;if(l[q]<=l[p])L=false}
      if(H){let t=n;for(let j=p+k+1;j<n;j++)if(h[j]>h[p]){t=j;break}PH.push({p:h[p],idx:p,conf:p+k,take:t})}
      if(L){let t=n;for(let j=p+k+1;j<n;j++)if(l[j]<l[p]){t=j;break}PL.push({p:l[p],idx:p,conf:p+k,take:t})}}
    const at=(L)=>{const m=new Map();for(const v of L){if(v.take>=n)continue;if(!m.has(v.take))m.set(v.take,[]);m.get(v.take).push(v)}return m};
    const I=Ind.prep(D),am=Ind.sma(I.atr,100);
    return D.confP={stamp,PH,PL,takeH:at(PH),takeL:at(PL),am}},
  // Cú quét tại nến k theo chiều dir (LONG quét đáy, SHORT quét đỉnh): trả về mức thanh khoản bị quét hoặc null
  sweepAt(D,k,dir,P,Q,X,A){
    const lg=dir>0,L=lg?Q.PL:Q.PH,taken=(lg?Q.takeL:Q.takeH).get(k)||[],out=[];
    for(const v of taken){if(v.conf>=k||k-v.idx>P.poolLook)continue;
      const eq=L.some(q=>q!==v&&q.conf<k&&k-q.idx<=P.poolLook&&q.take>=k&&Math.abs(q.p-v.p)<=P.eqTol*A);
      const old=k-v.conf>=P.poolAge;
      if(eq||old)out.push({L:v.p,src:eq?(lg?'đáy bằng nhau (EQL)':'đỉnh bằng nhau (EQH)'):(lg?'đáy swing cũ':'đỉnh swing cũ')})}
    const kd=X.Dd.map[k];
    if(kd>=0){const pd=lg?X.Dd.A.l[kd]:X.Dd.A.h[kd],d0=X.Dd.own[k];let first=true;
      for(let j=k-1;j>=0&&X.Dd.own[j]===d0;j--)if(lg?D.l[j]<pd:D.h[j]>pd){first=false;break}
      if(first&&(lg?D.l[k]<pd:D.h[k]>pd))out.push({L:pd,src:lg?'đáy ngày hôm trước (PDL)':'đỉnh ngày hôm trước (PDH)',pd:1})}
    let best=null;
    for(const s of out){const ok=lg?D.l[k]<=s.L-P.sweepAtr*A&&D.c[k]>s.L:D.h[k]>=s.L+P.sweepAtr*A&&D.c[k]<s.L;
      if(ok&&(!best||(lg?s.L<best.L:s.L>best.L)))best=s}
    return best},
  side(D,i,P,X,S,Q,I,dir){
    const lg=dir>0,A=I.atr,best={sc:-1},am=Q.am[i];
    const ck0=D.bias?D.bias[i]===dir:false,vr=am>0?A[i]/am:1,ck1=vr>=P.volLo&&vr<=P.volHi;
    for(let k=i;k>=Math.max(3,i-P.mssBars);k--){
      const ck=new Array(8).fill(false);ck[0]=ck0;ck[1]=ck1;
      const sw=this.sweepAt(D,k,dir,P,Q,X,A[k]);
      if(!sw){if(best.sc<0)Object.assign(best,{sc:ck.filter(Boolean).length,ck,dir,vr});continue}
      ck[2]=true;
      const SI=Strat.impl.smc.prep(D,{k:P.kInt,fvgMin:P.fvgMin}),ext=lg?D.l[k]:D.h[k],opp=lg?SI.hiAt[k]:SI.loAt[k];let m=-1; // swing đối ứng nội bộ (pivot 2 nến)
      for(let j=k+1;j<=Math.min(i,k+P.mssBars);j++)if(isFinite(opp)&&(lg?D.c[j]>opp:D.c[j]<opp)){m=j;break}
      let body=0;if(m>0)for(let j=k;j<=m;j++)if(lg?D.c[j]>D.o[j]:D.c[j]<D.o[j])body=Math.max(body,Math.abs(D.c[j]-D.o[j])/A[j]); // nến thân lớn nhất của nhịp phá (displacement)
      ck[3]=m>0&&body>=P.dispBody;
      let vx=0;for(let j=k;j<=(m>0?m:Math.min(i,k+P.mssBars));j++){const av=I.vol[j-1]||I.vol[j];if(av>0)vx=Math.max(vx,D.v[j]/av)}
      ck[4]=vx>=P.volMult;
      // nhịp phá: đỉnh/đáy cao/thấp nhất từ cú quét tới nến i
      let leg=lg?-Infinity:Infinity,li=k;for(let j=k;j<=i;j++){if(lg?D.h[j]>leg:D.l[j]<leg){leg=lg?D.h[j]:D.l[j];li=j}}
      const rng=Math.abs(leg-ext),oA=leg-dir*P.oteLo*rng,oB=leg-dir*P.oteHi*rng; // oA: mép 62% (gần giá), oB: mép 79%
      // vùng POI cùng chiều sinh ra trong nhịp phá, chưa bị chạm tới nến i
      const zs=[];if(m>0)for(let q=S.zones.length-1;q>=0;q--){const Z=S.zones[q];if(Z.born>Math.min(i,m+1))continue;if(Z.born<=k)break;
        if(Z.side===dir&&(Z.mit==null||Z.mit>i)&&(Z.type!=='FVG'||Z.hi-Z.lo>=P.fvgMin*A[Z.born]))zs.push(Z)}
      ck[5]=zs.length>0&&ck[3];
      let z=zs[0]||null,entry=NaN,ote=false;
      for(const Z of zs){const e=lg?Math.min(Z.prox,oA):Math.max(Z.prox,oA),far=lg?Math.max(Z.lo,oB):Math.min(Z.hi,oB);
        if(lg?e>=far:e<=far){z=Z;entry=e;ote=true;break}}
      ck[6]=ote&&ck[5];
      // đã hồi qua điểm vào sau đỉnh/đáy nhịp phá → lỡ nhịp
      let touched=false;if(ote)for(let j=li+1;j<=i;j++)if(lg?D.l[j]<=entry:D.h[j]>=entry){touched=true;break}
      // khoảng còn lại tới thanh khoản đối ứng (đỉnh/đáy chưa bị lấy phía trên/dưới đỉnh nhịp phá, hoặc PDH/PDL)
      let R=NaN,sl=NaN,tgt=null,room=NaN;
      if(ote){sl=ext-dir*P.slBuf*A[k];R=Math.abs(entry-sl);if(R/entry*100<P.minSl){R=entry*P.minSl/100;sl=entry-dir*R}
        const LL=lg?Q.PH:Q.PL;for(const v of LL){if(v.conf>i||v.take<=i||i-v.idx>P.poolLook*3)continue;if(lg?v.p<=leg:v.p>=leg)continue;
          if(tgt==null||(lg?v.p<tgt:v.p>tgt))tgt=v.p}
        const kd=X.Dd.map[i];if(kd>=0){const pd=lg?X.Dd.A.h[kd]:X.Dd.A.l[kd];if((lg?pd>leg:pd<leg)&&(tgt==null||(lg?pd<tgt:pd>tgt)))tgt=pd}
        room=tgt==null?Infinity:dir*(tgt-entry)/R;ck[7]=room>=P.roomR}
      const sc=ck.filter(Boolean).length;
      if(sc>best.sc)Object.assign(best,{sc,ck,dir,vr,sw,k,m,body,vx,leg,li,ext,oA,oB,z,entry,touched,R,sl,tgt,room});
      if(sc===8)break}
    return best},
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<300||!(I.atr[i]>0)||!D.bias)return null;
    const M=Strat.impl.smc,X=M.ctx(D,{poiAge:120}),S=M.prep(D,P),Q=this.pools(D,P),A=I.atr[i];
    const L=this.side(D,i,P,X,S,Q,I,1),Sh=this.side(D,i,P,X,S,Q,I,-1),b=Sh.sc>L.sc?Sh:L,lg=b.dir>0,dirN=b.dir;
    const extra=[` (4h ${D.b4[i]>0?'tăng':D.b4[i]<0?'giảm':'chưa rõ'}, 1D ${D.b1[i]>0?'tăng':D.b1[i]<0?'giảm':'đi ngang'})`,` · hiện ${b.vr.toFixed(2)}×`,
      b.sw?` · ${b.sw.src}`:'',b.m>0?` · thân ${b.body.toFixed(1)} ATR`:'',b.vx?` · ${b.vx.toFixed(1)}×`:'',b.z?` · ${b.z.type}`:'','',isFinite(b.room)?` · ${b.room.toFixed(1)}R`:b.room===Infinity?' · không còn đỉnh/đáy cản':''];
    const base={dir:lg?'LONG':'SHORT',dirN,score:b.sc,checks:b.ck.map((ok,q)=>[this.labels[q]+extra[q],ok]),req:[0,1,2,3,4,5,6,7],min:8,A,
      sweep:b.sw?{k:b.k,t:D.t[b.k],src:b.sw.src,dir:dirN,L:b.sw.L}:null,poi:b.z?{lo:b.z.lo,hi:b.z.hi,born:b.z.born,type:b.z.type}:null,
      ote:b.sw&&b.m>0?{a:b.oA,b:b.oB,k:b.k,li:b.li}:null,tgt:b.tgt};
    if(b.sc<8)return{...base,side:'CHỜ'};
    if(b.touched)return{...base,side:'CHỜ',gate:'Giá đã hồi qua điểm vào trước khi đủ điều kiện: bỏ thiết lập (không đuổi giá)'};
    const entry=b.entry,R=b.R,sl=b.sl;
    const lr=dirN*(b.leg-entry)/R,t1=!isFinite(lr)||lr>=P.tp1R?P.tp1R:Math.max(P.t1Min,lr);
    let t2=P.tp2R;if(isFinite(b.room)&&b.room>=P.t2Min&&b.room<t2)t2=b.room;t2=Math.max(t2,t1+0.5);
    const tp1=entry+dirN*t1*R,tp2=entry+dirN*t2*R;
    if(lg?D.h[i]>=tp1:D.l[i]<=tp1)return{...base,side:'CHỜ',gate:'Giá đã chạy tới TP1 mà chưa hồi về vùng: bỏ thiết lập'};
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl,tp1,tp2,t1R:+t1.toFixed(2),t2R:+t2.toFixed(2),
      feat:{slPct:R/entry*100,src:b.sw.src,poi:b.z.type,disp:b.body,vx:b.vx,vr:b.vr,room:b.room,age:i-b.k,hour:new Date(D.t[i]).getUTCHours()}}},
  // Lệnh chờ: hủy khi giá chạy tới TP1 trước, đóng cửa xuyên SL, hoặc xu hướng khung lớn đảo chiều
  valid(D,j,sig,P){
    if(sig.dirN>0?D.h[j]>=sig.tp1:D.l[j]<=sig.tp1)return'Giá chạy tới TP1 mà chưa hồi về vùng để khớp: hủy lệnh chờ';
    if(sig.dirN>0?D.c[j]<sig.sl:D.c[j]>sig.sl)return'Giá đóng cửa xuyên qua cú quét, thiết lập không còn hợp lệ';
    if(D.bias&&D.bias[j]===-sig.dirN)return'Xu hướng khung lớn 4h/1D đã đảo chiều: hủy lệnh chờ';
    return null},
  // Thoát thích ứng khi thị trường đổi trạng thái
  exit(D,j,pos,P){
    const dir=pos.dir;
    if(D.bias&&D.bias[j]===-dir)return'Thị trường đổi trạng thái: xu hướng 4h/1D đảo ngược lệnh';
    const S=Strat.impl.smc.prep(D,P),I=Ind.prep(D),lv=dir>0?S.loAt[j-1]:S.hiAt[j-1];
    // CHoCH ngược chiều: nến thân lớn đóng cửa xuyên swing đối ứng vừa hình thành SAU khi khớp lệnh
    if(isFinite(lv)&&(dir>0?D.c[j]<lv:D.c[j]>lv)&&Math.abs(D.c[j]-D.o[j])>=P.dispBody*I.atr[j]){
      const Q=this.pools(D,P),L=dir>0?Q.PL:Q.PH;
      if(L.some(v=>v.p===lv&&v.idx>=pos.f&&v.conf<j))return'Thị trường đổi trạng thái: CHoCH ngược chiều bằng nến thân lớn'}
    return null},
  dash(x,s){
    const a=x.an||{},rows=[],ck=a.checks||[];
    if(ck[0])rows.push(['Xu hướng',(ck[0][0].match(/\((.*)\)/)||[,''])[1]||'-']);
    if(ck.length)rows.push(['Hội tụ',`${ck.filter(c=>c[1]).length}/8 yếu tố${a.sweep?' · '+a.sweep.src:''}`]);
    const r=typeof Scan!=='undefined'&&x.v&&Scan.res[s+'#'+x.v.id];
    if(r&&r.n!=null){rows.push(['Tỉ lệ thắng (TP2)',r.n?`${r.win.toFixed(0)}% · ${r.n} lệnh`:'chưa có lệnh']);
      if(r.sum!=null)rows.push(['Tổng tăng trưởng',`${r.sum>=0?'+':''}${r.sum.toFixed(1)}R (sau phí)`])}
    const o=typeof Book!=='undefined'&&Book.openFor(s);
    if(o&&Book.isFilled(o)){const lv=Book.live(o);rows.push(['Lệnh hiện tại',lv?`${lv.rr>=0?'+':''}${lv.rr.toFixed(2)}R${o.st==='H'?' · đã TP1, SL ở giá vào':''}`:'-'])}
    else if(o)rows.push(['Lệnh hiện tại','đang chờ giá hồi về vùng POI ∩ OTE']);
    return rows},
  tunables:[
    {k:'dispBody',steps:[1.0,1.2,1.5],tag:'weakDisp'},{k:'volMult',steps:[1.3,1.6,2.0],tag:'lowVol'},
    {k:'roomR',steps:[2,2.5,3],tag:'room'},{k:'minSl',steps:[0.25,0.35,0.45],tag:'stopped'}],
  tagText:{weakDisp:'nến phá cấu trúc yếu',lowVol:'khối lượng xác nhận yếu',room:'ít khoảng trống tới thanh khoản đối ứng',stopped:'cắt lỗ quá sát'},
  tags(f){const t=[];if(f.disp<1.3)t.push('weakDisp');if(f.vx<1.8)t.push('lowVol');if(f.room<3)t.push('room');if(f.slPct<0.35)t.push('stopped');return t}
};
