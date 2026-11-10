/* Vẽ phân tích lên biểu đồ: mỗi điều kiện của chiến lược được vẽ ra (vùng, đường, mốc) và gắn với dòng ✓/✗ trong bảng điều kiện.
   Mọi thứ tính lại đúng như chiến lược đã tính tại nến tín hiệu i (không nhìn trước tương lai), riêng phần sau nến i chỉ để bạn xem diễn biến.
   Kết quả: {checks, items:[...], pane?, notes{chỉ số điều kiện → cách đọc trên biểu đồ}}
     line : đường theo từng nến  {type:'line', n, c, v:[giá theo chỉ số nến], ck}
     box  : vùng chữ nhật        {type:'box', n, c, a:chỉ số nến bắt đầu, b:chỉ số nến kết thúc, lo, hi, ck, op}
     hl   : đoạn ngang          {type:'hl', n, c, a, b, p, ck, dash}
     mk   : mốc trên nến         {type:'mk', n, c, j, up:true/false, shape, ck}
     pane : chỉ báo khung dưới   {n, c, v, lv:[mức], ck} */
const Draw={
  C:{trend:'#64748b',ma:'#f59e0b',ma2:'#38bdf8',zone:'#a78bfa',prem:'#ef4444',disc:'#22c55e',eq:'#e5e7eb',sweep:'#f472b6',mss:'#fbbf24',ote:'#2dd4bf',kz:'#60a5fa',smt:'#c084fc',vol:'#fb923c'},
  // Tìm nến tín hiệu theo thời gian
  idx(D,t){let lo=0,hi=D.t.length-1,k=-1;while(lo<=hi){const m=(lo+hi)>>1;if(D.t[m]<=t){k=m;lo=m+1}else hi=m-1}return k},
  spec(D,base,P,i){
    const impl=Strat.impl[base];if(!impl||i<210||i>=D.c.length)return null;
    const a=impl.analyze(D,i,P);if(!a||!a.checks)return null;
    const out={checks:a.checks,req:a.req||[],dir:a.dirN,items:[],notes:{},side:a.side,gate:a.gate||''};
    out.notes[0]='Dải màu dưới đáy biểu đồ: xanh = 4h/1D cho phép LONG, đỏ = cho phép SHORT, xám = chưa rõ hướng.';
    const f=this[base];if(f)try{f.call(this,D,i,P,a,out,impl)}catch(e){console.warn('Draw',e)}
    // Lớp "điều kiện còn thiếu": giá cần chạy thế nào thì điều kiện ✗ mới thành ✓
    out.miss=[];out.need=[];const g=this.need[base];
    if(g&&a.checks.some(c=>!c[1]))try{g.call(this,D,i,P,a,out,impl,a.checks.map(c=>!c[1]))}catch(e){console.warn('Need',e)}
    // điều kiện ✗ phụ thuộc bước trước (VD FVG chỉ có sau MSS): vẫn liệt kê để biết còn phải chờ gì
    a.checks.forEach((c,q)=>{if(!c[1]&&!out.need.some(n=>n.ck===q))out.need.push({ck:q,t:`⏳ ${c[0].split(' (')[0]} · chờ các bước trước`})});
    out.need.sort((x,y)=>x.ck-y.ck);
    return out},
  // ---- Dựng phần tử cho lớp điều kiện còn thiếu ----
  //   lv  : mức giá giá phải chạm/đóng cửa qua {k:'lv', ck, p, n (nhãn trục giá), a (nến bắt đầu vẽ)}
  //   box : vùng giá cần chạm {k:'box', ck, lo, hi, a, n}
  //   kz  : khung giờ killzone sắp tới {k:'kz', ck, ta, tb (ms), n}
  //   need: dòng tóm tắt ở góc biểu đồ {ck, t}
  tw(d){return d>0?'tăng':d<0?'giảm':'chưa rõ'},
  // Killzone tiếp theo kể từ thời điểm t (dò từng 5 phút trong 24 giờ)
  kzNext(impl,t){const st=3e5;let a=Math.ceil(t/st)*st;
    if(impl.inKZ(a))return null;
    for(let q=0;q<288&&!impl.inKZ(a);q++)a+=st;if(!impl.inKZ(a))return null;let b=a;while(impl.inKZ(b)&&b-a<864e5)b+=st;return{ta:a,tb:b,name:impl.kzName(a)}},
  mKz(impl,D,i,out,ck){const step=D.t[1]-D.t[0],nx=this.kzNext(impl,D.t[i]+step);if(!nx)return;
    const w=Math.max(0,nx.ta-(D.t[i]+step)),h=Math.floor(w/36e5),m=Math.round(w%36e5/6e4);
    out.miss.push({k:'kz',ck,ta:nx.ta,tb:nx.tb,n:`Chờ phiên ${nx.name} tiếp theo`});
    out.need.push({ck,t:`⏰ Ngoài killzone: chờ ${nx.name} (còn ${h}h${String(m).padStart(2,'0')})`})},
  // Mức thanh khoản cần bị quét: chỉ lấy mức nằm phía giá phải chạy tới (LONG: dưới giá, SHORT: trên giá), gần nhất trước
  mSweep(D,i,lg,lv,out,ck,P,A){const c=D.c[i],L=lv.filter(([p])=>isFinite(p)&&(lg?p<c:p>c)).sort((x,y)=>lg?y[0]-x[0]:x[0]-y[0]).slice(0,3);
    for(const[p,src]of L)out.miss.push({k:'lv',ck,p,a:i-40,n:`Cần quét ${src}`});
    out.need.push({ck,t:L.length?`💧 Cần râu nến ${lg?'xuống dưới':'vượt lên trên'} ${src0(L)} ${Fmt.px(L[0][0])}${P&&A?` (≥ ${Fmt.px(P.sweepAtr*A)})`:''} rồi đóng cửa quay lại`:`💧 Chưa có mức thanh khoản ${lg?'bên dưới':'bên trên'} để quét`});
    function src0(L){return L[0][1]}},
  mMss(D,i,lg,opp,body,dispBody,left,out,ck,lbl='MSS'){
    if(!isFinite(opp))return;out.miss.push({k:'lv',ck,p:opp,a:i-30,n:`Đóng nến ${lg?'trên':'dưới'} để xác nhận ${lbl}`});
    out.need.push({ck,t:`📐 Cần đóng nến ${lg?'trên':'dưới'} ${Fmt.px(opp)}${dispBody?`, thân ≥ ${dispBody} ATR`:''} để xác nhận ${lbl}${body!=null&&body<dispBody?` (nến phá vừa rồi thân chỉ ${body.toFixed(1)} ATR)`:''}${left!=null?` · còn ${Math.max(0,left)} nến`:''}`})},
  mZones(D,i,lg,zs,out,ck){const c=D.c[i];
    const L=zs.filter(z=>lg?z.lo<c:z.hi>c).map(z=>({...z,d:lg?Math.max(0,c-z.hi):Math.max(0,z.lo-c)})).sort((x,y)=>x.d-y.d).slice(0,2);
    for(const z of L)out.miss.push({k:'box',ck,lo:z.lo,hi:z.hi,a:i-40,n:`Cần chạm vùng này · ${z.type} ${z.tf}`});
    return L.length},
  need:{
    smc(D,i,P,a,out,impl,no){
      const X=impl.ctx(D,P),S=impl.prep(D,P),I=Ind.prep(D),dir=a.dirN,lg=dir>0,b=impl.side(D,i,P,X,S,I,dir),A=I.atr[i];
      if(no[0])out.need.push({ck:0,t:`⚠️ Cần 1H và 4H đồng thuận xu hướng ${lg?'TĂNG':'GIẢM'} (hiện 1H ${this.tw(b.d1)}, 4H ${this.tw(b.d4)})`});
      if(no[2])this.mKz(impl,D,i,out,2);
      const lv=[],as=X.asia[i],ph=X.H.own[i]-1,kd=X.Dd.map[i];
      if(as)lv.push([lg?as.lo:as.hi,lg?'đáy phiên Á':'đỉnh phiên Á']);
      if(ph>=0)lv.push([lg?X.H.A.l[ph]:X.H.A.h[ph],lg?'đáy giờ trước':'đỉnh giờ trước']);
      if(kd>=0)lv.push([lg?X.Dd.A.l[kd]:X.Dd.A.h[kd],lg?'PDL':'PDH']);
      if(no[3])this.mSweep(D,i,lg,lv,out,3,P,A);
      if(no[1]){const k1=X.H.map[i],k4=D.i4?D.i4[i]:-1,zs=[];
        if(k1>=0)for(const z of X.h1.act[k1]||[])if(z.side===dir)zs.push({...z,tf:'1H'});
        if(X.h4&&k4>=0)for(const z of X.h4.act[k4]||[])if(z.side===dir)zs.push({...z,tf:'4H'});
        const n=this.mZones(D,i,lg,zs,out,1),pd=kd>=0?(lg?X.Dd.A.l[kd]:X.Dd.A.h[kd]):NaN;
        if(isFinite(pd)&&(lg?pd<D.c[i]:pd>D.c[i]))out.miss.push({k:'lv',ck:1,p:pd,a:i-40,n:`Hoặc quét ${lg?'PDL':'PDH'}`});
        out.need.push({ck:1,t:`🎯 Cú quét phải chạm ${n?`vùng OB/FVG 1H/4H (hộp cam nét đứt)`:'vùng OB/FVG 1H/4H (hiện chưa có vùng phù hợp)'}${isFinite(pd)?` hoặc quét ${lg?'PDL':'PDH'} ${Fmt.px(pd)}`:''}`})}
      if(b.sw){const left=b.sw.k+P.mssBars-i;
        if(no[4])this.mMss(D,i,lg,b.opp,b.m>0?Math.abs(D.c[b.m]-D.o[b.m])/I.atr[b.m]:null,P.dispBody,left,out,4);
        if(no[5]&&!no[4])out.need.push({ck:5,t:`🟪 Nhịp phá cần để lại FVG ≥ ${P.fvgMin} ATR chưa bị lấp`});
        if(no[6]&&b.z&&isFinite(b.leg)){const eq=(b.ext+b.leg)/2;out.miss.push({k:'lv',ck:6,p:eq,a:b.sw.k,n:`Giá vào phải ${lg?'dưới':'trên'} 50%`});
          out.need.push({ck:6,t:`🦄 Mép FVG (${Fmt.px(b.z.prox)}) cần trùng Breaker Block hoặc nằm ${lg?'dưới':'trên'} 50% nhịp ${Fmt.px(eq)}`})}}
      else if(no[4])out.need.push({ck:4,t:'📐 MSS chỉ tính sau khi có cú quét thanh khoản'})},
    conf(D,i,P,a,out,impl,no){
      const M=Strat.impl.smc,X=M.ctx(D,{poiAge:120}),S=M.prep(D,P),Q=impl.pools(D,P),I=Ind.prep(D),dir=a.dirN,lg=dir>0,b=impl.side(D,i,P,X,S,Q,I,dir),A=I.atr[i];
      if(no[0])out.need.push({ck:0,t:`⚠️ Cần xu hướng 4h ${lg?'TĂNG':'GIẢM'} và 1D không ngược chiều (hiện 4h ${this.tw(D.b4[i])}, 1D ${this.tw(D.b1[i])})`});
      if(no[1])out.need.push({ck:1,t:`🌡️ Biến động ${b.vr.toFixed(2)}× trung vị: cần trong ${P.volLo}–${P.volHi}×, chờ thị trường ${b.vr<P.volLo?'sôi động hơn':'dịu lại'}`});
      if(no[2]){const L=(lg?Q.PL:Q.PH).filter(v=>v.conf<=i&&v.take>i&&i-v.idx<=P.poolLook).map(v=>[v.p,i-v.conf>=P.poolAge?(lg?'đáy swing cũ':'đỉnh swing cũ'):(lg?'đáy gần':'đỉnh gần')]);
        const kd=X.Dd.map[i];if(kd>=0)L.push([lg?X.Dd.A.l[kd]:X.Dd.A.h[kd],lg?'PDL':'PDH']);this.mSweep(D,i,lg,L,out,2,P,A)}
      if(b.sw){const SI=M.prep(D,{k:P.kInt||P.k,fvgMin:P.fvgMin}),opp=lg?SI.hiAt[b.k]:SI.loAt[b.k];
        if(no[3])this.mMss(D,i,lg,opp,b.m>0?b.body:null,P.dispBody,b.k+P.mssBars-i,out,3,'MSB');
        if(no[4])out.need.push({ck:4,t:`📊 Khối lượng nến quét/nến phá mới ${b.vx?b.vx.toFixed(1):'0'}× TB 20 nến, cần ≥ ${P.volMult}×`});
        if(no[5]&&!no[3])out.need.push({ck:5,t:'🟪 Nhịp phá cần để lại FVG hoặc Order Block chưa bị chạm'});
        if(no[6]&&isFinite(b.oA)){out.miss.push({k:'box',ck:6,lo:Math.min(b.oA,b.oB),hi:Math.max(b.oA,b.oB),a:b.li,n:'Vùng POI cần nằm trong OTE 62–79%'});
          out.need.push({ck:6,t:`🎯 FVG/OB cần chồng lên OTE ${Fmt.px(Math.min(b.oA,b.oB))}–${Fmt.px(Math.max(b.oA,b.oB))}`})}
        if(no[7]&&!no[6]){if(b.tgt!=null)out.miss.push({k:'lv',ck:7,p:b.tgt,a:b.k,n:'Thanh khoản đối ứng (quá gần)'});
          out.need.push({ck:7,t:`📏 Chỉ còn ${isFinite(b.room)?b.room.toFixed(1):'?'}R tới thanh khoản đối ứng, cần ≥ ${P.roomR}R`})}}
      else if(no[3])out.need.push({ck:3,t:'📐 MSB chỉ tính sau khi có cú quét thanh khoản'})},
    ict2(D,i,P,a,out,impl,no){
      const X=impl.prep(D),S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgAtr}),I=Ind.prep(D),dir=a.dirN,lg=dir>0,b=impl.side(D,i,P,X,S,I,dir),A=I.atr[i];
      if(no[0])this.mKz(impl,D,i,out,0);
      const lv=[],as=X.asia[i],kd=X.Dd.map[i];if(as)lv.push([lg?as.lo:as.hi,lg?'đáy phiên Á':'đỉnh phiên Á']);
      lv.push([lg?S.loAt[i]:S.hiAt[i],lg?'đáy swing gần nhất':'đỉnh swing gần nhất']);if(kd>=0)lv.push([lg?X.Dd.A.l[kd]:X.Dd.A.h[kd],lg?'PDL':'PDH']);
      if(no[2])this.mSweep(D,i,lg,lv,out,2,P,A);
      if(no[1]){const kH=X.H.map[i],zs=kH>=0?(X.act[kH]||[]).filter(z=>z.side===dir).map(z=>({...z,tf:'1h'})):[],n=this.mZones(D,i,lg,zs,out,1);
        out.need.push({ck:1,t:`🎯 Cú quét phải chạm ${n?'vùng OB/FVG 1h (hộp cam nét đứt)':'vùng OB/FVG 1h (hiện chưa có vùng phù hợp)'} hoặc quét ${lg?'PDL':'PDH'}`})}
      if(b.sw){const opp=lg?S.hiAt[b.sw.k]:S.loAt[b.sw.k];
        if(no[3])this.mMss(D,i,lg,opp,null,P.dispBody,b.sw.k+P.mssBars-i,out,3);
        if(no[4]&&!no[3])out.need.push({ck:4,t:`🟪 Nhịp phá cần để lại FVG ≥ ${P.fvgAtr} ATR chưa lấp`});
        if(no[5]&&isFinite(b.leg)&&isFinite(b.ext)){const eq=(b.ext+b.leg)/2;out.miss.push({k:'lv',ck:5,p:eq,a:b.sw.k,n:`Giá vào phải ${lg?'dưới':'trên'} 50%`});
          out.need.push({ck:5,t:`⚖️ Giá vào cần ở ${lg?'Discount (dưới':'Premium (trên'} ${Fmt.px(eq)})`})}}
      else if(no[3])out.need.push({ck:3,t:'📐 MSS chỉ tính sau khi có cú quét thanh khoản'})},
    rsi2(D,i,P,a,out,impl,no){
      const X=impl.ind(D),lg=a.dirN>0;
      if(no[0])out.need.push({ck:0,t:`⚠️ Cần xu hướng 4h/1D ${lg?'TĂNG':'GIẢM'} (dải màu dưới đáy phải ${lg?'xanh':'đỏ'})`});
      if(no[1]&&isFinite(X.s200[i])){out.miss.push({k:'lv',ck:1,p:X.s200[i],a:i-60,n:`Đóng nến ${lg?'trên':'dưới'} SMA200`});
        out.need.push({ck:1,t:`📈 Cần đóng nến ${lg?'trên':'dưới'} SMA200 ${Fmt.px(X.s200[i])}`})}
      if(no[2])out.need.push({ck:2,t:`🔁 RSI(2) hiện ${X.r2[i].toFixed(0)}, cần ${lg?'< '+P.rl:'> '+(100-P.rl)}: chờ một nhịp ${lg?'giảm':'tăng'} ngắn`})}
  },
  rsi2(D,i,P,a,out,impl){
    const X=impl.ind(D),C=this.C,lg=a.dirN>0;
    out.items.push({type:'line',n:'SMA200',c:C.ma,v:X.s200,ck:1,w:2});
    out.items.push({type:'line',n:'SMA5 (mục tiêu sau TP1)',c:C.ma2,v:X.s5,w:1});
    out.pane={n:'RSI(2)',c:C.ma2,v:X.r2,lv:[P.rl,100-P.rl],ck:2};
    out.items.push({type:'mk',n:`RSI(2) ${X.r2[i].toFixed(0)}`,c:a.checks[2][1]?C.disc:C.prem,j:i,up:!lg,shape:'circle',ck:2});
    out.notes[1]=`Đường cam SMA200: ${lg?'giá phải nằm TRÊN':'giá phải nằm DƯỚI'} đường này.`;
    out.notes[2]=`Khung dưới RSI(2): ${lg?`phải xuống dưới ${P.rl}`:`phải lên trên ${100-P.rl}`} (vạch ngang). Mốc tròn trên nến tín hiệu ghi giá trị RSI(2) lúc đó.`},
  smc(D,i,P,a,out,impl){
    const X=impl.ctx(D,P),S=impl.prep(D,P),I=Ind.prep(D),C=this.C,last=D.c.length-1,step=D.t[1]-D.t[0],from=Math.max(0,i-150);
    const b=impl.side(D,i,P,X,S,I,a.dirN),lg=a.dirN>0,lo0=Math.min(...D.l.slice(from)),hi0=Math.max(...D.h.slice(from));
    // 1) cấu trúc khung lớn: đỉnh/đáy swing 1H gần nhất
    const k1=X.H.map[i];if(k1>=0){const S1=X.h1.S;if(isFinite(S1.hiAt[k1]))out.items.push({type:'hl',n:'Đỉnh cấu trúc 1H',c:C.prem,a:from,b:last,p:S1.hiAt[k1],dash:1,ck:0});
      if(isFinite(S1.loAt[k1]))out.items.push({type:'hl',n:'Đáy cấu trúc 1H',c:C.disc,a:from,b:last,p:S1.loAt[k1],dash:1,ck:0})}
    out.notes[0]=`Cấu trúc (BOS/CHoCH gần nhất) khung 1H và 4H phải cùng hướng ${lg?'tăng':'giảm'}. Đường nét chấm là đỉnh/đáy cấu trúc 1H. Dải màu dưới đáy biểu đồ là xu hướng EMA 4h/1D để tham khảo.`;
    // 3) killzone
    for(let j=Math.max(1,from);j<=last;j++){if(impl.inKZ(D.t[j]+step)&&!impl.inKZ(D.t[j-1]+step)){let e=j;while(e+1<=last&&impl.inKZ(D.t[e+1]+step))e++;
      out.items.push({type:'box',n:impl.kzName(D.t[j]+step),c:C.kz,a:j,b:e,lo:lo0,hi:hi0,op:.05,ck:j<=i&&i<=e?2:null,bg:true});j=e}}
    out.notes[2]='Dải dọc xanh nhạt: killzone London (14:00–17:00) và New York AM (19:30–22:30) giờ VN. Nến tín hiệu phải nằm trong dải.';
    // phiên Á, ngày hôm trước
    const as=X.asia[i];if(as){let j0=i;const d=Math.floor(D.t[i]/864e5);while(j0>0&&Math.floor(D.t[j0-1]/864e5)===d)j0--;
      out.items.push({type:'box',n:'Phiên Á',c:'#94a3b8',a:j0,b:Math.min(last,j0+Math.round(5*36e5/step)-1),lo:as.lo,hi:as.hi,op:.06})}
    const kd=X.Dd.map[i];if(kd>=0)out.items.push({type:'hl',n:'PDH',c:C.prem,a:from,b:last,p:X.Dd.A.h[kd],dash:1},{type:'hl',n:'PDL',c:C.disc,a:from,b:last,p:X.Dd.A.l[kd],dash:1});
    out.notes[1]='Hộp vàng: Order Block / FVG khung 1H hoặc 4H còn hiệu lực mà nến quét chạm vào. Hoặc nến quét qua đỉnh/đáy ngày hôm trước (PDH/PDL).';
    out.notes[3]='Mốc hồng: nến quét qua đáy/đỉnh phiên Á (hộp xám) hoặc đáy/đỉnh của giờ trước rồi đóng cửa quay lại (đường nét đứt là mức bị quét).';
    out.notes[4]='Đường vàng: swing đối ứng; mũi tên MSS là nến thân lớn đóng cửa phá qua nó trong vài nến sau cú quét.';
    out.notes[5]='Hộp tím: FVG do nhịp phá để lại, chưa bị lấp. Đường trắng là giá vào ở mép gần của FVG.';
    out.notes[6]=`Unicorn: hộp cam là Breaker Block (nến ${lg?'tăng':'giảm'} cuối cùng trước cú quét, đã bị nhịp phá vượt qua) chồng lên FVG. Nếu không có, giá vào phải nằm ${lg?'dưới':'trên'} đường 50% của nhịp (${lg?'Discount':'Premium'}).`;
    if(!b.sw)return;
    const k=b.sw.k;
    if(b.poi&&b.poi.tf==='1H'){const t0=X.H.A.t[b.poi.born];let j0=k;while(j0>0&&D.t[j0-1]>=t0)j0--;out.items.push({type:'box',n:b.poi.type+' 1H',c:'#facc15',a:j0,b:last,lo:b.poi.lo,hi:b.poi.hi,op:.12,ck:1})}
    else if(b.poi)out.items.push({type:'box',n:b.poi.type+' 4H',c:'#facc15',a:Math.max(0,k-30),b:last,lo:b.poi.lo,hi:b.poi.hi,op:.12,ck:1});
    out.items.push({type:'mk',n:'Quét · '+b.sw.src,c:C.sweep,j:k,up:!lg,shape:'square',ck:3},{type:'hl',n:'Mức bị quét',c:C.sweep,a:Math.max(0,k-15),b:Math.min(last,k+6),p:b.sw.L,dash:2,ck:b.sw.pd&&!b.poi?1:3});
    if(isFinite(b.opp))out.items.push({type:'hl',n:'Swing đối ứng',c:C.mss,a:Math.max(0,k-10),b:b.m>0?b.m:last,p:b.opp,dash:2,ck:4});
    if(b.m>0)out.items.push({type:'mk',n:'MSS',c:C.mss,j:b.m,up:lg,shape:lg?'arrowUp':'arrowDown',ck:4});
    if(b.bb)out.items.push({type:'box',n:'Breaker Block',c:'#fb923c',a:b.bb.j,b:last,lo:b.bb.lo,hi:b.bb.hi,op:.14,ck:6});
    if(b.z)out.items.push({type:'box',n:'FVG chưa lấp',c:C.zone,a:b.z.born,b:last,lo:b.z.lo,hi:b.z.hi,op:.22,ck:5},{type:'hl',n:'Giá vào (mép FVG)',c:'#e5e7eb',a:b.z.born,b:last,p:b.z.prox,ck:5});
    if(isFinite(b.leg)&&isFinite(b.ext))out.items.push({type:'hl',n:'50% nhịp',c:C.eq,a:k,b:last,p:(b.ext+b.leg)/2,dash:2,ck:6})},
  ict2(D,i,P,a,out,impl){
    const X=impl.prep(D),S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgAtr}),I=Ind.prep(D),C=this.C,last=D.c.length-1,step=D.t[1]-D.t[0];
    const b=impl.side(D,i,P,X,S,I,a.dirN),lg=a.dirN>0,lo0=Math.min(...D.l.slice(Math.max(0,i-150))),hi0=Math.max(...D.h.slice(Math.max(0,i-150)));
    for(let j=Math.max(1,i-150);j<=last;j++){if(impl.inKZ(D.t[j]+step)&&!impl.inKZ(D.t[j-1]+step)){let e=j;while(e+1<=last&&impl.inKZ(D.t[e+1]+step))e++;
      out.items.push({type:'box',n:impl.kzName(D.t[j]+step),c:C.kz,a:j,b:e,lo:lo0,hi:hi0,op:.05,ck:j<=i&&i<=e?0:null,bg:true});j=e}}
    out.notes[0]='Dải dọc xanh nhạt: killzone London (14–17h VN) và New York AM (19:30–22h VN). Nến tín hiệu phải nằm trong dải.';
    const as=X.asia[i];if(as){let j0=i;const d=Math.floor(D.t[i]/864e5);while(j0>0&&Math.floor(D.t[j0-1]/864e5)===d&&(D.t[j0-1]%864e5)>=0)j0--;
      out.items.push({type:'box',n:'Phiên Á',c:'#94a3b8',a:j0,b:Math.min(last,j0+59),lo:as.lo,hi:as.hi,op:.06})}
    const kd=X.Dd.map[i];if(kd>=0){out.items.push({type:'hl',n:'PDH',c:C.prem,a:Math.max(0,i-150),b:last,p:X.Dd.A.h[kd],dash:1},{type:'hl',n:'PDL',c:C.disc,a:Math.max(0,i-150),b:last,p:X.Dd.A.l[kd],dash:1})}
    out.notes[1]='Hộp vàng: Order Block / FVG khung 1h còn hiệu lực mà cú quét chạm vào. Hoặc mức bị quét là đáy/đỉnh ngày hôm trước (đường PDL/PDH).';
    out.notes[2]='Mốc hồng: nến 5m quét qua đáy/đỉnh phiên Á, swing gần nhất hoặc PDL/PDH ít nhất 0,05 ATR rồi đóng cửa quay lại (đường nét đứt là mức bị quét).';
    out.notes[3]='Đường vàng: đỉnh/đáy swing đối ứng; mũi tên MSS là nến thân lớn đóng cửa phá qua trong vòng 8 nến, quãng từ cú quét ≥ 1 ATR.';
    out.notes[4]='Hộp tím: FVG ≥ 0,10 ATR do nhịp phá để lại, chưa bị lấp. Đường trắng là giá vào ở mép gần của FVG.';
    out.notes[5]=`Đường trắng nét đứt: 50% nhịp từ cú quét tới đỉnh/đáy MSS. ${lg?'LONG phải vào dưới':'SHORT phải vào trên'} đường này.`;
    if(!b.sw)return;
    const k=b.sw.k;
    if(b.poi){const t0=X.H.A.t[b.poi.born];let j0=k;while(j0>0&&D.t[j0-1]>=t0)j0--;out.items.push({type:'box',n:b.poi.type+' 1h',c:'#facc15',a:j0,b:last,lo:b.poi.lo,hi:b.poi.hi,op:.12,ck:1})}
    out.items.push({type:'mk',n:'Quét · '+b.sw.src,c:C.sweep,j:k,up:!lg,shape:'square',ck:2},{type:'hl',n:'Mức bị quét',c:C.sweep,a:Math.max(0,k-15),b:Math.min(last,k+6),p:b.sw.L,dash:2,ck:b.sw.pd&&!b.poi?1:2});
    const opp=lg?S.hiAt[k]:S.loAt[k];if(isFinite(opp))out.items.push({type:'hl',n:'Swing đối ứng',c:C.mss,a:Math.max(0,k-10),b:b.m>0?b.m:last,p:opp,dash:2,ck:3});
    if(b.m>0)out.items.push({type:'mk',n:'MSS',c:C.mss,j:b.m,up:lg,shape:lg?'arrowUp':'arrowDown',ck:3});
    if(b.z){out.items.push({type:'box',n:'FVG chưa lấp',c:C.zone,a:b.z.born,b:last,lo:b.z.lo,hi:b.z.hi,op:.22,ck:4},{type:'hl',n:'Giá vào (mép FVG)',c:'#e5e7eb',a:b.z.born,b:last,p:b.z.prox,ck:4})}
    if(isFinite(b.leg)&&isFinite(b.ext))out.items.push({type:'hl',n:'50% nhịp',c:C.eq,a:k,b:last,p:(b.ext+b.leg)/2,dash:2,ck:5})},
  conf(D,i,P,a,out,impl){
    const M=Strat.impl.smc,X=M.ctx(D,{poiAge:120}),S=M.prep(D,P),Q=impl.pools(D,P),I=Ind.prep(D),C=this.C,last=D.c.length-1,from=Math.max(0,i-150);
    const b=impl.side(D,i,P,X,S,Q,I,a.dirN),lg=a.dirN>0;
    out.notes[0]=`Dải màu dưới đáy: xu hướng 4h/1D. LONG cần xanh, SHORT cần đỏ.`;
    out.notes[1]='Biến động: ATR hiện tại phải nằm trong 0,6–2,5 lần ATR trung bình 100 nến (tránh thị trường chết hoặc tin tức giật mạnh).';
    out.notes[2]='Đường nét chấm là các bể thanh khoản (đỉnh/đáy chưa bị lấy). Mốc hồng: nến quét qua đỉnh/đáy bằng nhau, swing cũ hoặc PDH/PDL rồi đóng cửa quay lại.';
    out.notes[3]='Đường vàng: swing đối ứng; mũi tên MSB là nến đóng cửa phá qua trong vòng 15 nến sau cú quét; nhịp phá phải có ít nhất một nến thân ≥ 1 ATR.';
    out.notes[4]='Khối lượng nến quét hoặc nến phá phải ≥ 1,3 lần trung bình 20 nến.';
    out.notes[5]='Hộp tím: FVG hoặc Order Block do nhịp phá để lại, giá chưa quay lại chạm.';
    out.notes[6]='Dải xanh lơ: vùng OTE 62–79% của nhịp từ cú quét tới đỉnh/đáy nhịp phá. Đường trắng (giá vào) là mép gần của phần chồng nhau giữa POI và OTE.';
    out.notes[7]='Đường xanh lá nét đứt: thanh khoản đối ứng (mục tiêu). Phải còn ít nhất 2R từ giá vào.';
    const kd=X.Dd.map[i];if(kd>=0)out.items.push({type:'hl',n:'PDH',c:C.prem,a:from,b:last,p:X.Dd.A.h[kd],dash:1,ck:2},{type:'hl',n:'PDL',c:C.disc,a:from,b:last,p:X.Dd.A.l[kd],dash:1,ck:2});
    for(const v of Q.PH)if(v.conf<=i&&v.idx>=from&&v.take>i)out.items.push({type:'hl',n:'Đỉnh chưa bị lấy',c:C.prem,a:v.idx,b:last,p:v.p,dash:1});
    for(const v of Q.PL)if(v.conf<=i&&v.idx>=from&&v.take>i)out.items.push({type:'hl',n:'Đáy chưa bị lấy',c:C.disc,a:v.idx,b:last,p:v.p,dash:1});
    if(!b.sw)return;
    const k=b.k;
    out.items.push({type:'mk',n:'Quét · '+b.sw.src,c:C.sweep,j:k,up:!lg,shape:'square',ck:2},{type:'hl',n:'Mức bị quét',c:C.sweep,a:Math.max(0,k-20),b:Math.min(last,k+6),p:b.sw.L,dash:2,ck:2});
    const SI=M.prep(D,{k:P.kInt||P.k,fvgMin:P.fvgMin}),opp=lg?SI.hiAt[k]:SI.loAt[k];if(isFinite(opp))out.items.push({type:'hl',n:'Swing đối ứng',c:C.mss,a:Math.max(0,k-10),b:b.m>0?b.m:last,p:opp,dash:2,ck:3});
    if(b.m>0)out.items.push({type:'mk',n:'MSB',c:C.mss,j:b.m,up:lg,shape:lg?'arrowUp':'arrowDown',ck:3});
    if(b.m>0&&isFinite(b.oA))out.items.push({type:'box',n:'OTE 62–79%',c:'#22d3ee',a:b.li,b:last,lo:Math.min(b.oA,b.oB),hi:Math.max(b.oA,b.oB),op:.10,ck:6});
    if(b.z)out.items.push({type:'box',n:b.z.type+' chưa chạm',c:C.zone,a:b.z.born,b:last,lo:b.z.lo,hi:b.z.hi,op:.22,ck:5});
    if(isFinite(b.entry))out.items.push({type:'hl',n:'Giá vào (POI ∩ OTE)',c:'#e5e7eb',a:b.z?b.z.born:k,b:last,p:b.entry,ck:6});
    if(b.tgt!=null)out.items.push({type:'hl',n:'Thanh khoản đối ứng',c:'#22c55e',a:k,b:last,p:b.tgt,dash:2,ck:7})},
  ema(D,i,P,a,out){const I=Ind.prep(D),C=this.C;out.items.push({type:'line',n:'EMA20',c:C.ma2,v:I.e20,w:1},{type:'line',n:'EMA50',c:C.ma,v:I.e50,w:1},{type:'line',n:'EMA200',c:C.prem,v:I.e200,w:2})}
};
