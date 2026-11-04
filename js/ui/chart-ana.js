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
    const S=impl.prep(D,P),I=Ind.prep(D),A=I.atr[i],c=D.c[i],dirN=a.dirN,lg=dirN>0,C=this.C,last=D.c.length-1,from=Math.max(0,i-80);
    // Cấu trúc: CHoCH (đổi hướng) và BOS (phá tiếp cùng hướng)
    let j0=i;while(j0>1&&S.dirAt[j0-1]===S.dirAt[i])j0--; // mốc đổi hướng gần nhất trước tín hiệu (có thể rất xa)
    const st=Math.max(1,Math.min(j0,i-150)),ev=[];for(let j=st;j<=last;j++){if(S.dirAt[j]&&S.dirAt[j]!==S.dirAt[j-1])ev.push({j,t:S.dirAt[j-1]?'CHoCH':'BOS',d:S.dirAt[j]})}
    const ob=new Set(S.zones.filter(z=>z.type==='OB').map(z=>z.born));
    for(let j=Math.max(st,i-150);j<=last;j++)if(ob.has(j)&&!ev.some(e=>e.j===j))ev.push({j,t:'BOS',d:S.dirAt[j]});
    ev.sort((x,y)=>x.j-y.j);const pre=ev.filter(e=>e.j<=i),key=pre[pre.length-1];
    for(const e of[...pre.slice(-5),...ev.filter(e=>e.j>i).slice(-3)])out.items.push({type:'mk',n:`${e.t} ${e.d>0?'↑':'↓'}`,c:e.d>0?C.disc:C.prem,j:e.j,up:e.d<0,shape:e.d>0?'arrowUp':'arrowDown',ck:e===key&&e.d===dirN?1:null});
    out.notes[1]='Mốc BOS / CHoCH: nơi giá đóng cửa phá đỉnh/đáy cấu trúc. Hướng mốc gần nhất trước nến tín hiệu phải cùng hướng lệnh.';
    // Đỉnh/đáy cấu trúc, cân bằng 50%, vùng Premium/Discount
    const hi=S.hiAt[i],lo=S.loAt[i];
    if(isFinite(hi)&&isFinite(lo)&&hi>lo){const eq=(hi+lo)/2;
      out.items.push({type:'box',n:'Premium',c:C.prem,a:from,b:last,lo:eq,hi,op:.05,ck:3});
      out.items.push({type:'box',n:'Discount',c:C.disc,a:from,b:last,lo,hi:eq,op:.05,ck:3});
      out.items.push({type:'hl',n:'Cân bằng 50%',c:C.eq,a:from,b:last,p:eq,dash:2,ck:3});
      out.items.push({type:'hl',n:'Đỉnh cấu trúc',c:C.prem,a:from,b:last,p:hi,dash:1});
      out.items.push({type:'hl',n:'Đáy cấu trúc',c:C.disc,a:from,b:last,p:lo,dash:1});
      out.notes[3]=`Nửa trên (đỏ nhạt) là Premium, nửa dưới (xanh nhạt) là Discount, chia bởi đường cân bằng 50% giữa đỉnh và đáy cấu trúc. ${lg?'LONG nên vào ở Discount':'SHORT nên vào ở Premium'}.`}
    // Vùng OB/FVG được chọn + vài vùng chưa chạm khác
    const z=impl.findZone(S,i,dirN,P,A,c);
    if(z)out.items.push({type:'box',n:`${z.type} chưa chạm (vùng vào lệnh)`,c:C.zone,a:z.born,b:last,lo:z.lo,hi:z.hi,op:.22,ck:2});
    let k=0;for(let q=S.zones.length-1;q>=0&&k<4;q--){const Z=S.zones[q];if(Z.born>i||Z.born<i-P.maxAge)continue;if(z&&Z.born===z.born&&Z.lo===z.lo)continue;
      if(Z.mit!=null&&Z.mit<=i)continue;k++;out.items.push({type:'box',n:`${Z.type} ${Z.side>0?'tăng':'giảm'}`,c:Z.side>0?C.disc:C.prem,a:Z.born,b:Math.min(last,Z.mit!=null?Z.mit:last),lo:Z.lo,hi:Z.hi,op:.08})}
    out.notes[2]=z?`Hộp tím: vùng ${z.type} chưa bị giá chạm, cách giá ${(z.d/A).toFixed(1)} ATR (tối đa ${P.maxDist} ATR). Lệnh chờ đặt giữa vùng.`
      :`Chưa có vùng OB/FVG ${lg?'tăng':'giảm'} chưa chạm trong phạm vi ${P.maxDist} ATR quanh giá. Các hộp mờ là vùng khác hướng hoặc quá xa.`;
    // Quét thanh khoản
    const sw=lg?S.swU[i]:S.swD[i];
    if(sw>=0&&sw>=i-P.sweepAge-40)out.items.push({type:'mk',n:'Quét thanh khoản',c:C.sweep,j:sw,up:!lg,shape:'square',ck:sw>=i-P.sweepAge?4:null});
    out.notes[4]=`Mốc hồng: nến quét qua ${lg?'đáy':'đỉnh'} cũ rồi đóng cửa quay lại. Cần xảy ra trong ${P.sweepAge} nến trước tín hiệu.`},
  btc100(D,i,P,a,out,impl){
    const M=Strat.impl.smc,S=M.prep(D,{k:P.k,fvgMin:P.fvgMin}),I=Ind.prep(D),A=I.atr[i],dirN=a.dirN,lg=dirN>0,C=this.C,last=D.c.length-1;
    const sw=impl.sweep(D,i,lg,S,P.look);
    out.notes[1]=`Mốc hồng: cú quét thanh khoản trong ${P.look} nến gần nhất (đáy/đỉnh cấu trúc, PDL/PDH hoặc phiên Á).`;
    // Kill zone London / New York: dải dọc nhạt
    const lo0=Math.min(...D.l.slice(Math.max(0,i-120))),hi0=Math.max(...D.h.slice(Math.max(0,i-120)));
    for(let j=Math.max(1,i-120);j<=last;j++){const h=new Date(D.t[j]).getUTCHours(),p=new Date(D.t[j-1]).getUTCHours();
      if((h===7||h===12)&&p!==h){let e=j;while(e+1<=last&&impl.inKZ(D.t[e+1]))e++;out.items.push({type:'box',n:h===7?'London':'New York',c:C.kz,a:j,b:e,lo:lo0,hi:hi0,op:.05,ck:j<=i&&i<=e?6:null,bg:true});j=e}}
    out.notes[6]='Dải dọc xanh nhạt: giờ London (14–17h VN) và New York (19–23h VN). Nến tín hiệu phải nằm trong dải.';
    if(sw.k<0){out.notes[2]='Chưa có cú quét nên chưa xét phá cấu trúc.';return}
    out.items.push({type:'mk',n:'Quét · '+sw.src,c:C.sweep,j:sw.k,up:!lg,shape:'square',ck:1});
    const lvl=lg?S.hiAt[sw.k]:S.loAt[sw.k];let m=-1;
    for(let j=sw.k+1;j<=i;j++)if(isFinite(lvl)&&(lg?D.c[j]>lvl:D.c[j]<lvl)){m=j;break}
    if(isFinite(lvl))out.items.push({type:'hl',n:'Mức cấu trúc cần phá',c:C.mss,a:Math.max(0,sw.k-10),b:m>0?m:last,p:lvl,dash:2,ck:2});
    if(m>0){out.items.push({type:'mk',n:'MSS',c:C.mss,j:m,up:lg,shape:lg?'arrowUp':'arrowDown',ck:a.checks[2][1]?2:null});
      const vr=D.v[m]/(I.vol[m]||1);out.items.push({type:'mk',n:`Vol ×${vr.toFixed(1)}`,c:C.vol,j:m,up:!lg,shape:'circle',ck:8})}
    out.notes[2]=m>0?'Đường vàng: mức đỉnh/đáy cấu trúc; mũi tên MSS là nến đóng cửa phá qua mức đó (cần thân nến lớn hoặc để lại FVG).':'Đường vàng: mức cấu trúc giá cần đóng cửa phá qua. Chưa phá.';
    out.notes[8]='Mốc cam: khối lượng nến phá so với trung bình 20 nến (cần ≥ 1,5×).';
    let z=null;for(let q=S.zones.length-1;q>=0;q--){const Z=S.zones[q];if(Z.born>i)continue;if(Z.born<sw.k)break;if(Z.side===dirN&&(Z.mit==null||Z.mit>i)&&(lg?Z.mid<D.c[i]:Z.mid>D.c[i])){z=Z;break}}
    if(z)out.items.push({type:'box',n:`${z.type} chưa lấp`,c:C.zone,a:z.born,b:last,lo:z.lo,hi:z.hi,op:.22,ck:3});
    out.notes[3]=z?`Hộp tím: vùng ${z.type} sinh ra trong nhịp phá, chưa bị lấp. Lệnh chờ đặt giữa vùng.`:'Chưa có FVG/OB chưa lấp trong nhịp phá.';
    let ext=lg?Infinity:-Infinity,leg=lg?-Infinity:Infinity;for(let j=sw.k;j<=i;j++){ext=lg?Math.min(ext,D.l[j]):Math.max(ext,D.h[j]);leg=lg?Math.max(leg,D.h[j]):Math.min(leg,D.l[j])}
    if(isFinite(ext)&&isFinite(leg)&&leg!==ext){const p1=leg-(leg-ext)*0.618,p2=leg-(leg-ext)*0.79;
      out.items.push({type:'box',n:'OTE 62–79%',c:C.ote,a:sw.k,b:last,lo:Math.min(p1,p2),hi:Math.max(p1,p2),op:.1,ck:5});
      out.notes[5]='Hộp xanh ngọc: vùng hồi 62–79% của nhịp từ điểm quét tới đỉnh/đáy nhịp phá. Giá vào nên nằm trong vùng này.'}
    const j4=D.i4?D.i4[i]:-1;
    if(j4>=0&&D.D4){const S4=M.prep(D.D4,{k:3,fvgMin:0.25}),eq=(S4.hiAt[j4]+S4.loAt[j4])/2;
      if(isFinite(eq))out.items.push({type:'hl',n:'Cân bằng 50% khung 4h',c:C.eq,a:Math.max(0,i-120),b:last,p:eq,dash:2,ck:4});
      out.notes[4]=`Đường trắng nét đứt: cân bằng 50% của khung 4h. ${lg?'Giá vào LONG phải nằm dưới':'Giá vào SHORT phải nằm trên'} đường này.`}
    out.items.push({type:'mk',n:a.checks[7][1]?'SMT ✓':'SMT ✗',c:C.smt,j:sw.k,up:lg,shape:'circle',ck:7});
    out.notes[7]='Mốc tím tại điểm quét: BTC tạo đáy/đỉnh mới nhưng ETH thì không (phân kỳ SMT).'},
  scalp(D,i,P,a,out,impl){
    const S=Strat.impl.smc.prep(D,{k:P.k,fvgMin:P.fvgMin}),X=impl.prep(D),I=Ind.prep(D),dirN=a.dirN,lg=dirN>0,C=this.C,last=D.c.length-1,step=D.t[1]-D.t[0];
    out.notes[0]='Dải màu dưới đáy: xu hướng 4h/1D (tham khảo). Điều kiện thật: EMA20/EMA50 khung 1h và cấu trúc 15m (dựng từ nến 5m) phải cùng chiều.';
    const lo0=Math.min(...D.l.slice(Math.max(0,i-150))),hi0=Math.max(...D.h.slice(Math.max(0,i-150)));
    for(let j=Math.max(1,i-150);j<=last;j++){if(impl.inKZ(D.t[j]+step)&&!impl.inKZ(D.t[j-1]+step)){let e=j;while(e+1<=last&&impl.inKZ(D.t[e+1]+step))e++;
      out.items.push({type:'box',n:new Date(D.t[j]+step).getUTCHours()<11?'London':'New York',c:C.kz,a:j,b:e,lo:lo0,hi:hi0,op:.05,ck:j<=i&&i<=e?1:null,bg:true});j=e}}
    out.notes[1]='Dải dọc xanh nhạt: kill zone London (14–17h VN) và New York (19–22h VN). Nến tín hiệu phải nằm trong dải.';
    const sw=impl.sweep(D,i,lg,S,X,P.look);
    out.notes[2]=`Mốc hồng: nến quét qua ${lg?'đáy':'đỉnh'} swing gần nhất hoặc ${lg?'đáy':'đỉnh'} của giờ trước rồi đóng cửa quay lại, trong ${P.look} nến gần nhất.`;
    if(sw.k<0){out.notes[3]='Chưa có cú quét nên chưa xét phá cấu trúc.';return}
    out.items.push({type:'mk',n:'Quét · '+sw.src,c:C.sweep,j:sw.k,up:!lg,shape:'square',ck:2});
    out.items.push({type:'hl',n:'Mức thanh khoản bị quét',c:C.sweep,a:Math.max(0,sw.k-12),b:Math.min(last,sw.k+6),p:sw.lvl,dash:2,ck:2});
    const lvl=lg?S.hiAt[sw.k]:S.loAt[sw.k];let m=-1;for(let j=sw.k+1;j<=i;j++)if(isFinite(lvl)&&(lg?D.c[j]>lvl:D.c[j]<lvl)){m=j;break}
    if(isFinite(lvl))out.items.push({type:'hl',n:'Mức cấu trúc cần phá',c:C.mss,a:Math.max(0,sw.k-10),b:m>0?m:last,p:lvl,dash:2,ck:3});
    if(m>0){out.items.push({type:'mk',n:'MSS',c:C.mss,j:m,up:lg,shape:lg?'arrowUp':'arrowDown',ck:a.checks[3][1]?3:null});
      out.items.push({type:'mk',n:`Vol ×${(D.v[m]/(I.vol[m]||1)).toFixed(1)}`,c:C.vol,j:m,up:!lg,shape:'circle',ck:6})}
    out.notes[3]=m>0?'Đường vàng: đỉnh/đáy cấu trúc 5m; mũi tên MSS là nến đóng cửa phá qua (cần thân ≥ 1,2 ATR hoặc để lại FVG).':'Đường vàng: mức cấu trúc giá cần đóng cửa phá qua. Chưa phá.';
    out.notes[6]='Mốc cam: volume nến phá so với trung bình 20 nến (cần ≥ '+P.volMin+'×).';
    let z=null;for(let q=S.zones.length-1;q>=0;q--){const Z=S.zones[q];if(Z.born>i)continue;if(Z.born<sw.k)break;if(Z.type==='FVG'&&Z.side===dirN&&(Z.mit==null||Z.mit>i)&&(lg?Z.mid<D.c[i]:Z.mid>D.c[i])){z=Z;break}}
    if(z){out.items.push({type:'box',n:'FVG chưa lấp',c:C.zone,a:z.born,b:last,lo:z.lo,hi:z.hi,op:.22,ck:4});out.items.push({type:'hl',n:'CE (giữa FVG) = giá vào',c:'#e5e7eb',a:z.born,b:last,p:z.mid,dash:1,ck:4})}
    out.notes[4]=z?'Hộp tím: FVG sinh ra trong nhịp phá, chưa bị lấp. Lệnh chờ đặt ở giữa FVG (CE).':'Chưa có FVG chưa lấp trong nhịp phá.';
    let ext=lg?Infinity:-Infinity,leg=lg?-Infinity:Infinity;for(let j=sw.k;j<=i;j++){ext=lg?Math.min(ext,D.l[j]):Math.max(ext,D.h[j]);leg=lg?Math.max(leg,D.h[j]):Math.min(leg,D.l[j])}
    if(isFinite(ext)&&isFinite(leg)&&leg!==ext){const eq=(ext+leg)/2,p1=leg-(leg-ext)*0.62,p2=leg-(leg-ext)*0.79;
      out.items.push({type:'hl',n:'Cân bằng 50% của nhịp',c:C.eq,a:sw.k,b:last,p:eq,dash:2,ck:5});
      out.items.push({type:'box',n:'OTE 62–79%',c:C.ote,a:sw.k,b:last,lo:Math.min(p1,p2),hi:Math.max(p1,p2),op:.1,ck:7});
      out.notes[5]=`Đường trắng nét đứt: 50% của nhịp từ cú quét tới đỉnh/đáy nhịp phá. ${lg?'LONG vào dưới':'SHORT vào trên'} đường này (Discount/Premium).`;
      out.notes[7]='Hộp xanh ngọc: vùng OTE 62–79% của nhịp. Bản mặc định bắt buộc giá vào nằm trong vùng này.'}},
  ema(D,i,P,a,out){const I=Ind.prep(D),C=this.C;out.items.push({type:'line',n:'EMA20',c:C.ma2,v:I.e20,w:1},{type:'line',n:'EMA50',c:C.ma,v:I.e50,w:1},{type:'line',n:'EMA200',c:C.prem,v:I.e200,w:2})}
};
