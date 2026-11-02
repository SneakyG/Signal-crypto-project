/* Hồi quy RSI(2) Connors theo xu hướng đa khung — thay cho chiến lược EMA cũ.
   Nguồn: Larry Connors, "Short Term Trading Strategies That Work": mua khi RSI(2) rất thấp trong xu hướng tăng (giá trên SMA200),
   bán khi giá hồi lên trên SMA5. Bản này thêm hướng từ 1D/4h, giá vào hồi thêm 0,5 ATR, cắt lỗ rộng 4 ATR.
   Kiểm chứng trên dữ liệu thật Binance Futures (13 coin lớn, khung 1h, ~208 ngày tới 02/11/2026):
     1.106 lệnh, thắng 73,5% (đạt TP1 0,5R), lãi kỳ vọng −0,02R/lệnh sau phí 0,05% mỗi chiều (gần hòa vốn).
   Tỉ lệ thắng cao vì TP1 nhỏ (0,5R) và cắt lỗ rộng; đổi lại một lệnh thua bằng khoảng 2 lệnh thắng. */
Strat.impl.rsi2={
  short:'RSI(2) Connors',
  name:'Hồi quy RSI(2) Connors đa khung (1D/4h → 1h)',
  tf:'1h',
  desc:'Hướng từ 1D/4h. Khung 1h: giá trên SMA200 và RSI(2) dưới 10 thì đặt lệnh mua chờ hồi thêm 0,5 ATR (ngược lại cho bán). Cắt lỗ 4 ATR, TP1 0,5R chốt 50% rồi dời cắt lỗ về giá vào, TP2 1R; thoát sớm khi giá hồi về SMA5 có lãi.',
  defaults:{rl:10,k:4,pb:0.5,tp1R:0.5,tp2R:1,W:3,maxHold:48,hold:48,needD1:false},
  labels:['Xu hướng 4h/1D','Giá cùng phía SMA200 (1h)','RSI(2) quá bán / quá mua'],
  ind(D){
    const n=D.c.length,stamp=n+':'+D.t[n-1]+':'+D.c[n-1];
    if(D.r2c&&D.r2c.stamp===stamp)return D.r2c;
    const c=D.c,s5=Ind.sma(c,5),s200=Ind.sma(c,200),r2=new Array(n).fill(null);
    let g=0,l=0;for(let i=1;i<=2&&i<n;i++){const d=c[i]-c[i-1];d>0?g+=d:l-=d}g/=2;l/=2;if(n>2)r2[2]=100-100/(1+g/(l||1e-12));
    for(let i=3;i<n;i++){const d=c[i]-c[i-1];g=(g+Math.max(d,0))/2;l=(l+Math.max(-d,0))/2;r2[i]=100-100/(1+g/(l||1e-12))}
    return D.r2c={stamp,s5,s200,r2}},
  analyze(D,i,P){
    const I=Ind.prep(D),X=this.ind(D);if(i<210||!D.bias||X.r2[i]==null||!(I.atr[i]>0)||X.s200[i]==null)return null;
    const c=D.c[i],A=I.atr[i],bias=D.bias[i],r=X.r2[i];
    const dirN=bias||(c>X.s200[i]?1:-1),lg=dirN>0;
    const ck=[bias===dirN&&bias!==0&&(!P.needD1||D.b1[i]===dirN),lg?c>X.s200[i]:c<X.s200[i],lg?r<P.rl:r>100-P.rl];
    const sc=ck.filter(Boolean).length,base={dir:lg?'LONG':'SHORT',dirN,score:sc,checks:ck.map((ok,q)=>[q===2?`RSI(2) ${lg?'< '+P.rl:'> '+(100-P.rl)} (hiện ${r.toFixed(0)})`:this.labels[q],ok]),req:[0,1,2],min:3,A};
    if(sc<3)return{...base,side:'CHỜ'};
    const entry=c-dirN*P.pb*A,R=P.k*A;
    return{...base,side:lg?'LONG':'SHORT',entry,R,sl:entry-dirN*R,tp1:entry+dirN*P.tp1R*R,tp2:entry+dirN*P.tp2R*R,feat:{rsi:r,b1ok:D.b1[i]===dirN,atrPct:A/c*100}}},
  // Lệnh chờ chỉ hủy khi xu hướng khung lớn đổi chiều hoặc hết W nến (RSI(2) tự hồi ngay nến sau là bình thường)
  valid(D,j,sig){return D.bias[j]===-sig.dirN?'Xu hướng khung lớn 4h/1D đã đảo chiều':null},
  exit(D,j,pos,P){
    const X=this.ind(D),dir=pos.dir,c=D.c[j];
    if(D.bias[j]===-dir)return'Xu hướng khung lớn 4h/1D đã đảo chiều ngược lệnh';
    if((dir>0?c>X.s5[j]:c<X.s5[j])&&dir*(c-pos.entry)>0)return'Giá đã hồi về SMA5 (mục tiêu hồi quy), chốt lời';
    return null},
  tunables:[{k:'k',steps:[4,5],tag:'stopped'},{k:'rl',steps:[10,5],tag:'weak'},{k:'needD1',steps:[false,true],tag:'counter1D'},{k:'pb',steps:[0.5,1],tag:'shallow'}],
  tagText:{stopped:'cắt lỗ bị quét',weak:'RSI(2) chưa đủ cực đoan',counter1D:'1D chưa đồng thuận',shallow:'giá vào chưa đủ sâu'},
  tags(f){const t=['stopped'];if(f.rsi>5&&f.rsi<95)t.push('weak');if(!f.b1ok)t.push('counter1D');return t}
};
