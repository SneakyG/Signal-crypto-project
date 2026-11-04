/* SMC / ICT High Winrate (Unicorn): quy trình 7 bước, thiếu 1 bước = BỎ LỆNH.
   1) Thuận cấu trúc khung 1H và 4H (BOS/CHoCH gần nhất cùng chiều).
   2) Nến quét nằm trong / chạm vùng POI khung lớn: Order Block hoặc FVG 1H/4H còn hiệu lực, hoặc vừa quét PDH/PDL.
   3) Trong killzone London 14:00–17:00 hoặc New York AM 19:30–22:30 giờ VN.
   4) Nến khung nhỏ quét đáy/đỉnh phiên Á hoặc đáy/đỉnh của giờ trước (hoặc PDL/PDH) rồi đóng cửa quay lại.
   5) Trong vài nến có nến thân lớn (thân ≥ 1 ATR) phá swing đối ứng (MSS). Kiểm chứng thực tế: thân 0,6 ATR lỗ −10R, 1 ATR mới có lãi.
   6) Nhịp phá để lại FVG rõ ràng, chưa bị lấp.
   7) Unicorn: FVG chồng lên Breaker Block (đỉnh/đáy cũ bị phá) hoặc giá vào nằm trong Discount (LONG) / Premium (SHORT).
   Lệnh: Limit ở mép gần của FVG. SL ngoài râu nến quét + 0,05% giá. TP1 1,0–1,5R (đỉnh/đáy nhịp phá nếu gần hơn 1,5R) chốt 50%,
   dời SL về giá vào + phí; TP2 2,5R tới mức TP2 Cài đặt (thanh khoản đối ứng khung 1H/ngày nếu nằm trong khoảng đó).
   Hủy lệnh chờ khi giá chạy tới TP1 trước khi khớp. Khung nến khuyến nghị: 5m hoặc 15m. */
Strat.impl.smc={
  short:'SMC / ICT',
  name:'SMC / ICT High Winrate (Unicorn: HTF → quét → MSS → FVG)',
  desc:'Thuận cấu trúc 1H/4H. Trong killzone London / New York AM, nến khung nhỏ quét đáy/đỉnh phiên Á hoặc giờ trước tại vùng OB/FVG 1H/4H (hoặc quét PDH/PDL) → MSS thân lớn để lại FVG → Limit ở mép FVG trùng Breaker Block hoặc trong Discount/Premium. SL ngoài cú quét + 0,05%. TP1 1–1,5R chốt 50% rồi dời SL về giá vào + phí, TP2 2,5–3R.',
  rev:2,noCalib:true, // SL/TP đã theo cấu trúc (cú quét, nhịp phá, thanh khoản đối ứng) nên không cho bộ tối ưu SL/TP co giãn
  cancelTp1:true,
  defaults:{k:3,fvgMin:0.10,sweepAtr:0.05,mssBars:10,dispBody:1.0,slPct:0.05,minSl:0.2,poiAge:120,htf:2,needUni:false,t1Min:1.0,t2Min:2.5,beOff:0.1,
    tp1R:1.5,tp2R:3,W:12,maxHold:96},
  labels:['Thuận cấu trúc khung 1H và 4H','Chạm vùng POI 1H/4H (OB / FVG) hoặc quét PDH/PDL','Trong killzone London / New York AM',
    'Quét đáy/đỉnh phiên Á hoặc giờ trước rồi đóng cửa quay lại','MSS: nến thân lớn (≥ 1 ATR) phá swing đối ứng','Nhịp phá để lại FVG rõ, chưa lấp',
    'Unicorn: FVG trùng Breaker Block hoặc ở Discount/Premium'],
  // London 07:00–10:00 UTC, New York AM 12:30–15:30 UTC (= 14–17h và 19:30–22:30 giờ VN)
  inKZ(t){const d=new Date(t),m=d.getUTCHours()*60+d.getUTCMinutes();return(m>=420&&m<600)||(m>=750&&m<930)},
  kzName(t){const d=new Date(t),m=d.getUTCHours()*60+d.getUTCMinutes();return m>=420&&m<600?'London':m>=750&&m<930?'New York AM':''},
  // Tính một lần: cấu trúc pivot, vùng OB/FVG, quét thanh khoản. Mọi thứ chỉ dựa vào nến đã biết tại thời điểm đó.
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
  // Vùng OB/FVG chưa chạm gần giá nhất (dùng cho bộ lọc của chiến lược EMA)
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
  // Bối cảnh khung lớn dựng từ dữ liệu khung nhỏ (1H, ngày) và 4H (D.D4): cấu trúc, vùng POI còn hiệu lực, phiên Á, giờ trước
  ctx(D,P){
    const n=D.c.length,stamp=n+':'+D.t[n-1]+':'+D.c[n-1]+':'+P.poiAge;if(D.smcX&&D.smcX.stamp===stamp)return D.smcX;
    const step=n>1?D.t[1]-D.t[0]:3e5;
    // gộp nến: map[i] = nến khung lớn ĐÃ ĐÓNG mới nhất khi nến i đóng; own[i] = nến khung lớn chứa nến i
    const agg=ms=>{const A={t:[],o:[],h:[],l:[],c:[],v:[]},map=new Int32Array(n).fill(-1),own=new Int32Array(n);let cur=null;
      for(let i=0;i<n;i++){const b=Math.floor(D.t[i]/ms)*ms;
        if(b!==cur){cur=b;A.t.push(b);A.o.push(D.o[i]);A.h.push(D.h[i]);A.l.push(D.l[i]);A.c.push(D.c[i]);A.v.push(D.v[i])}
        else{const k=A.t.length-1;A.h[k]=Math.max(A.h[k],D.h[i]);A.l[k]=Math.min(A.l[k],D.l[i]);A.c[k]=D.c[i];A.v[k]+=D.v[i]}
        own[i]=A.t.length-1;map[i]=(D.t[i]+step)%ms===0?A.t.length-1:A.t.length-2}
      return{A,map,own}};
    // vùng OB/FVG khung lớn còn hiệu lực tại từng nến khung lớn (chưa bị đóng cửa xuyên qua, chưa quá cũ)
    const live=(A,age)=>{const S=this.prep(A,{k:2,fvgMin:0.25}),Z=S.zones.slice().sort((a,b)=>a.born-b.born),act=[];let L=[],zi=0;
      for(let k=0;k<A.c.length;k++){while(zi<Z.length&&Z[zi].born<=k){L.push(Z[zi]);zi++}
        const c=A.c[k];L=L.filter(z=>k-z.born<=age&&(z.side>0?c>=z.lo:c<=z.hi));act[k]=L.slice()}
      return{S,act}};
    const H=agg(36e5),Dd=agg(864e5),h1=live(H.A,P.poiAge),D4=D.D4||null,h4=D4&&D4.c.length>10?live(D4,Math.ceil(P.poiAge/4)):null;
    const asia=new Array(n).fill(null);let day=null,hi=-Infinity,lo=Infinity;
    for(let i=0;i<n;i++){const d=Math.floor(D.t[i]/864e5),m=(D.t[i]%864e5)/6e4;if(d!==day){day=d;hi=-Infinity;lo=Infinity}
      if(m<300){hi=Math.max(hi,D.h[i]);lo=Math.min(lo,D.l[i])}else if(isFinite(hi))asia[i]={hi,lo}}
    return D.smcX={stamp,H,Dd,h1,h4,asia}},
  // Hướng cấu trúc khung lớn tại nến i: [1H, 4H] (1 tăng, −1 giảm, 0 chưa rõ)
  htfDir(D,X,i){const k1=X.H.map[i],d1=k1>=0?X.h1.S.dirAt[k1]:0,k4=D.i4?D.i4[i]:-1,d4=X.h4&&k4>=0?X.h4.S.dirAt[k4]:0;return[d1,d4]},
  // Đánh giá một chiều (1 LONG, −1 SHORT) tại nến i: tìm cú quét gần nhất trong mssBars nến cho thiết lập đủ nhất
  side(D,i,P,X,S,I,dir){
    const lg=dir>0,best={sc:-1},step=D.t[1]-D.t[0];
    const[d1,d4]=this.htfDir(D,X,i),trend=P.htf===2?d1===dir&&d4===dir:P.htf===1?d4===dir||(d4===0&&d1===dir):true,kz=this.inKZ(D.t[i]+step);
    for(let k=i;k>=Math.max(3,i-P.mssBars);k--){
      const Ak=I.atr[k],lv=[],as=X.asia[k],ph=X.H.own[k]-1,kd=X.Dd.map[k];
      if(as)lv.push([lg?as.lo:as.hi,lg?'đáy phiên Á':'đỉnh phiên Á',0]);
      if(ph>=0)lv.push([lg?X.H.A.l[ph]:X.H.A.h[ph],lg?'đáy giờ trước':'đỉnh giờ trước',0]);
      if(kd>=0)lv.push([lg?X.Dd.A.l[kd]:X.Dd.A.h[kd],lg?'đáy ngày hôm trước (PDL)':'đỉnh ngày hôm trước (PDH)',1]);
      let sw=null;for(const[L,src,pd]of lv)if(isFinite(L)&&(lg?D.l[k]<=L-P.sweepAtr*Ak&&D.c[k]>L:D.h[k]>=L+P.sweepAtr*Ak&&D.c[k]<L)){sw={k,L,src,pd};break}
      const ck=new Array(7).fill(false);ck[0]=trend;ck[2]=kz;
      if(!sw){if(best.sc<0)Object.assign(best,{sc:ck.filter(Boolean).length,ck,dir,d1,d4});continue}
      ck[3]=true;
      const ext=lg?D.l[k]:D.h[k],hit=z=>z.side===dir&&D.l[k]<=z.hi&&D.h[k]>=z.lo,k1=X.H.map[k],k4=D.i4?D.i4[k]:-1;
      const poi=(k1>=0&&X.h1.act[k1].find(hit)&&{...X.h1.act[k1].find(hit),tf:'1H'})||(X.h4&&k4>=0&&X.h4.act[k4]&&X.h4.act[k4].find(hit)&&{...X.h4.act[k4].find(hit),tf:'4H',born:-1})||null;
      ck[1]=!!poi||!!sw.pd;
      // MSS: nến thân lớn đóng cửa vượt swing đối ứng gần nhất trong mssBars nến sau cú quét
      const opp=lg?S.hiAt[k]:S.loAt[k];let m=-1;
      for(let j=k+1;j<=Math.min(i,k+P.mssBars);j++)if(isFinite(opp)&&(lg?D.c[j]>opp:D.c[j]<opp)){m=j;break}
      if(m>0)ck[4]=Math.abs(D.c[m]-D.o[m])>=P.dispBody*I.atr[m];
      // FVG cùng chiều sinh ra trong nhịp phá (từ sau cú quét tới nến sau MSS), chưa bị lấp tới nến i
      let z=null;if(m>0)for(let q=S.zones.length-1;q>=0;q--){const Zq=S.zones[q];if(Zq.born>Math.min(i,m+1))continue;if(Zq.born<=k)break;
        if(Zq.type==='FVG'&&Zq.side===dir&&Zq.hi-Zq.lo>=P.fvgMin*I.atr[Zq.born]&&(Zq.mit==null||Zq.mit>i)){z=Zq;break}}
      ck[5]=!!z&&ck[4];
      // Breaker Block: nến ngược màu cuối cùng trước cú quét (LONG: nến tăng; SHORT: nến giảm), bị nhịp phá vượt qua
      let bb=null;for(let j=k-1;j>=Math.max(0,k-12);j--)if(lg?D.c[j]>D.o[j]:D.c[j]<D.o[j]){bb={lo:D.l[j],hi:D.h[j],j};break}
      let leg=lg?-Infinity:Infinity;for(let j=k;j<=i;j++)leg=lg?Math.max(leg,D.h[j]):Math.min(leg,D.l[j]);
      const entry=z?z.prox:NaN,brk=!!z&&!!bb&&(lg?D.c[m]>bb.hi:D.c[m]<bb.lo)&&z.lo<=bb.hi&&z.hi>=bb.lo,
        lvlBrk=!!z&&isFinite(opp)&&z.lo<=opp&&z.hi>=opp,disc=!!z&&(lg?entry<(ext+leg)/2:entry>(ext+leg)/2);
      ck[6]=P.needUni?brk||lvlBrk:brk||lvlBrk||disc;
      const sc=ck.filter(Boolean).length;
      if(sc>best.sc)Object.assign(best,{sc,ck,dir,d1,d4,sw,poi,m,z,entry,ext,leg,opp,bb:brk?bb:null,uni:brk||lvlBrk,disc});
      if(sc===7)break}
    return best},
  analyze(D,i,P){
    const I=Ind.prep(D);if(i<300||!(I.atr[i]>0))return null;
    const X=this.ctx(D,P),S=this.prep(D,P),A=I.atr[i];
    const L=this.side(D,i,P,X,S,I,1),Sh=this.side(D,i,P,X,S,I,-1),b=Sh.sc>L.sc?Sh:L,lg=b.dir>0,dirN=b.dir;
    const tw=d=>d>0?'tăng':d<0?'giảm':'chưa rõ',src=b.sw?` · ${b.sw.src}`:'',poiTxt=b.poi?` · ${b.poi.type} ${b.poi.tf}`:b.sw&&b.sw.pd?' · PDH/PDL':'';
    const extra=[` (1H ${tw(b.d1)}, 4H ${tw(b.d4)})`,poiTxt,'',src,'','',b.uni?' · Breaker':b.disc?' · Discount/Premium':''];
    const base={dir:lg?'LONG':'SHORT',dirN,score:b.sc,checks:b.ck.map((ok,q)=>[this.labels[q]+(q===0||ok?extra[q]:''),ok]),req:[0,1,2,3,4,5,6],min:7,A,
      sweep:b.sw?{k:b.sw.k,t:D.t[b.sw.k],src:b.sw.src,dir:dirN}:null,fvg:b.z?{lo:b.z.lo,hi:b.z.hi,born:b.z.born}:null,kz:this.kzName(D.t[i]+(D.t[1]-D.t[0]))};
    if(b.sc<7)return{...base,side:'CHỜ'};
    // SL: ngoài râu nến quét + 0,05% giá; quá hẹp (dưới minSl %) thì nới ra để phí sàn không ăn hết lợi thế
    const entry=b.entry;let sl=b.ext-dirN*b.ext*P.slPct/100,R=Math.abs(entry-sl);
    if(R/entry*100<P.minSl){R=entry*P.minSl/100;sl=entry-dirN*R}
    // TP1: đỉnh/đáy của nhịp phá (thanh khoản nội bộ) nếu nằm trong 1,0–1,5R; TP2: thanh khoản đối ứng 1H/ngày nếu trong 2,5R–TP2
    const lr=dirN*(b.leg-entry)/R,t1=!isFinite(lr)||lr>=P.tp1R?P.tp1R:Math.min(P.tp1R,Math.max(P.t1Min,lr));
    const k1=X.H.map[i],kd=X.Dd.map[i],cand=[];
    if(k1>=0){const S1=X.h1.S;cand.push(lg?S1.hiAt[k1]:S1.loAt[k1])}
    if(kd>=0)cand.push(lg?X.Dd.A.h[kd]:X.Dd.A.l[kd]);
    let t2=P.tp2R;for(const v of cand){const r=dirN*(v-entry)/R;if(isFinite(r)&&r>=P.t2Min&&r<t2)t2=r}
    t2=Math.max(t2,t1+0.5);
    const tp1=entry+dirN*t1*R,tp2=entry+dirN*t2*R;
    if(lg?D.h[i]>=tp1:D.l[i]<=tp1)return{...base,side:'CHỜ',gate:'Giá đã chạy tới TP1 mà chưa quay lại FVG: bỏ thiết lập (không đuổi giá)'};
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl,tp1,tp2,t1R:+t1.toFixed(2),t2R:+t2.toFixed(2),
      feat:{slPct:R/entry*100,src:b.sw.src,poi:b.poi?b.poi.type+' '+b.poi.tf:'PDH/PDL',uni:b.uni,kz:base.kz,hour:new Date(D.t[i]).getUTCHours(),age:i-b.sw.k,disp:Math.abs(D.c[b.m]-D.o[b.m])/A}}},
  // Lệnh chờ còn hiệu lực không? Hủy khi giá chạy tới TP1 trước khi khớp, hoặc đóng cửa xuyên qua cú quét
  valid(D,j,sig,P){
    if(sig.dirN>0?D.h[j]>=sig.tp1:D.l[j]<=sig.tp1)return'Giá chạy tới TP1 mà chưa quay lại FVG để khớp: hủy lệnh chờ';
    if(sig.dirN>0?D.c[j]<sig.sl:D.c[j]>sig.sl)return'Giá đóng cửa xuyên qua cú quét, thiết lập không còn hợp lệ';
    return null},
  exit(){return null}, // không cắt sớm: chỉ SL, TP1 (dời SL về giá vào + phí), TP2 hoặc hết thời gian giữ
  // Bảng trạng thái trên thẻ: killzone, xu hướng 1H/4H, thống kê kiểm chứng (thắng, TP1, BE, tổng R) và lệnh hiện tại
  dash(x,s){
    const now=Date.now(),kz=this.kzName(now),a=x.an||{},rows=[];
    let next='';if(!kz){const d=new Date(now),m=d.getUTCHours()*60+d.getUTCMinutes(),st=[420,750].map(v=>v>m?v-m:v+1440-m),w=Math.min(...st);next=`còn ${Math.floor(w/60)}h${String(w%60).padStart(2,'0')} tới ${st[0]===w?'London':'New York AM'}`}
    rows.push(['Killzone',kz?`🟢 Đang ${kz}`:`⚪ Ngoài giờ · ${next}`]);
    const c0=a.checks&&a.checks[0];if(c0)rows.push(['Xu hướng',(c0[0].match(/\((.*)\)/)||[,''])[1]||'-']);
    const r=typeof Scan!=='undefined'&&x.v&&Scan.res[s+'#'+x.v.id];
    if(r&&r.n!=null){rows.push(['Tỉ lệ thắng (TP2)',r.n?`${r.win.toFixed(0)}% · ${r.n} lệnh`:'chưa có lệnh']);
      if(r.tp1n!=null)rows.push(['Khớp TP1 / Hòa vốn',`${r.tp1n} / ${r.be} lệnh`]);
      if(r.sum!=null)rows.push(['Tổng tăng trưởng',`${r.sum>=0?'+':''}${r.sum.toFixed(1)}R (sau phí)`])}
    const o=typeof Book!=='undefined'&&Book.openFor(s);
    if(o&&Book.isFilled(o)){const lv=Book.live(o);rows.push(['Lệnh hiện tại',lv?`${lv.rr>=0?'+':''}${lv.rr.toFixed(2)}R${o.st==='H'?' · đã TP1, SL ở giá vào':''}`:'-'])}
    else if(o)rows.push(['Lệnh hiện tại','đang chờ khớp ở mép FVG']);
    return rows},
  // Các "nấc siết" mà bộ học được phép thử (từ lỏng đến chặt)
  tunables:[
    {k:'needUni',steps:[false,true],tag:'noUni'},{k:'dispBody',steps:[1.0,1.2,1.5],tag:'weakDisp'},{k:'fvgMin',steps:[0.10,0.20,0.30],tag:'fvg'},
    {k:'minSl',steps:[0.2,0.3,0.4],tag:'stopped'},{k:'mssBars',steps:[10,8,6],tag:'slow'}],
  tagText:{noUni:'FVG không trùng Breaker Block',weakDisp:'nến phá cấu trúc yếu',fvg:'FVG nhỏ',stopped:'cắt lỗ quá sát',slow:'MSS đến chậm sau cú quét'},
  tags(f){const t=[];if(!f.uni)t.push('noUni');if(f.disp<1.3)t.push('weakDisp');if(f.slPct<0.3)t.push('stopped');if(f.age>6)t.push('slow');t.push('fvg');return t}
};
