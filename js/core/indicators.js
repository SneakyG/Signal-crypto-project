/* Chỉ báo kỹ thuật: EMA, SMA, RSI, ATR, MACD histogram, khối lượng trung bình */
const Ind={
  ema(a,p){const k=2/(p+1);let e=a[0];return a.map((v,i)=>i?(e=v*k+e*(1-k)):e)},
  sma(a,p){const r=new Array(a.length).fill(null);let s=0;for(let i=0;i<a.length;i++){s+=a[i];if(i>=p)s-=a[i-p];if(i>=p-1)r[i]=s/p}return r},
  rsi(c,p=14){
    const r=new Array(c.length).fill(null);let g=0,l=0;
    for(let i=1;i<=p;i++){const d=c[i]-c[i-1];d>0?g+=d:l-=d}
    g/=p;l/=p;r[p]=100-100/(1+g/(l||1e-9));
    for(let i=p+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p;r[i]=100-100/(1+g/(l||1e-9))}
    return r},
  atr(h,l,c,p=14){const tr=h.map((x,i)=>i?Math.max(x-l[i],Math.abs(x-c[i-1]),Math.abs(l[i]-c[i-1])):x-l[i]);return Ind.ema(tr,p)},
  // Tính một lần cho mỗi bộ nến và lưu vào D.ind (tự tính lại khi có nến mới)
  prep(D){
    const n=D.c.length,key=n+':'+D.t[n-1]+':'+D.c[n-1];
    if(D.ind&&D.ind.key===key)return D.ind;
    const c=D.c,m12=Ind.ema(c,12),m26=Ind.ema(c,26),macd=c.map((_,i)=>m12[i]-m26[i]),sg=Ind.ema(macd,9);
    return D.ind={key,e20:Ind.ema(c,20),e50:Ind.ema(c,50),e200:Ind.ema(c,200),rsi:Ind.rsi(c),atr:Ind.atr(D.h,D.l,c),hist:macd.map((x,i)=>x-sg[i]),vol:Ind.sma(D.v,20)}}
};
