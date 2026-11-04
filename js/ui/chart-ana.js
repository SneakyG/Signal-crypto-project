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
    return out},
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
  ema(D,i,P,a,out){const I=Ind.prep(D),C=this.C;out.items.push({type:'line',n:'EMA20',c:C.ma2,v:I.e20,w:1},{type:'line',n:'EMA50',c:C.ma,v:I.e50,w:1},{type:'line',n:'EMA200',c:C.prem,v:I.e200,w:2})}
};
