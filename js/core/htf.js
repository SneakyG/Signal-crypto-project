/* Xu hướng khung lớn (1D và 4h) → gắn vào từng nến khung nhỏ.
   Chỉ dùng nến khung lớn ĐÃ ĐÓNG tại thời điểm nến nhỏ đóng, nên không nhìn trước tương lai (không look-ahead). */
const HTF={
  // 1 = tăng (EMA20 > EMA50 và giá > EMA200), -1 = giảm, 0 = đi ngang/chưa rõ
  trend(D){const I=Ind.prep(D),r=new Int8Array(D.c.length);for(let i=200;i<r.length;i++){const c=D.c[i];r[i]=I.e20[i]>I.e50[i]&&c>I.e200[i]?1:I.e20[i]<I.e50[i]&&c<I.e200[i]?-1:0}return r},
  need(tf,n){const f=x=>Math.min(1500,Math.ceil(n*Data.MS[tf]/Data.MS[x])+260);return{h4:f('4h'),d1:f('1d')}},
  // bias: 1 chỉ được LONG, -1 chỉ được SHORT, 0 đứng ngoài. 4h phải rõ ràng và 1D không được ngược chiều.
  attach(D,D4,D1,tf){
    const key=D.t.length+':'+D.t[D.t.length-1]+':'+D4.t.length+':'+D4.t[D4.t.length-1]+':'+D1.t.length+':'+D1.t[D1.t.length-1];
    if(D.biasKey===key)return D;
    const b4=HTF.trend(D4),b1=HTF.trend(D1),n=D.c.length,ms=Data.MS[tf],bias=new Int8Array(n),x4=new Int8Array(n),x1=new Int8Array(n);
    let j4=-1,j1=-1;
    for(let i=0;i<n;i++){
      const close=D.t[i]+ms;
      while(j4+1<D4.t.length&&D4.t[j4+1]+Data.MS['4h']<=close)j4++;
      while(j1+1<D1.t.length&&D1.t[j1+1]+Data.MS['1d']<=close)j1++;
      const t4=j4>=0?b4[j4]:0,t1=j1>=0?b1[j1]:0;
      x4[i]=t4;x1[i]=t1;bias[i]=t4===1&&t1>=0?1:t4===-1&&t1<=0?-1:0}
    D.bias=bias;D.b4=x4;D.b1=x1;D.biasKey=key;return D}
};
