/* Tối ưu SL/TP theo thống kê của TỪNG COIN với TỪNG CHIẾN LƯỢC.
   Lấy toàn bộ tín hiệu trong ~5000 nến gần nhất, mô phỏng lại đúng vòng đời lệnh với nhiều mức cắt lỗ và chốt lời:
     cắt lỗ = R gốc của chiến lược × m (m từ 0,8 tới 2,5), TP1 = t1 × R mới, TP2 = t2 × R mới.
   Chọn bộ có lãi kỳ vọng cao nhất trên 70% dữ liệu cũ (huấn luyện) và CHỈ áp dụng nếu nó cũng tốt hơn bản gốc trên 30% dữ liệu mới nhất
   (kiểm chứng). Đồng thời đo hai lỗi bạn hay gặp:
     • "Bị quét SL rồi chạy đúng hướng": lệnh cắt lỗ xong giá chạm TP1 cũ trong 24 nến sau đó.
     • "Suýt chạm TP": lệnh thua mà giá đã đi được ≥ 80% quãng tới TP1.
   TP1 luôn theo Cài đặt (mặc định 1,5R). TP2: cố định theo Cài đặt, hoặc Tự chọn 3 / 3,5 / 4R theo coin.
   Không có cách đặt SL/TP nào chắc chắn; đây là lựa chọn tốt nhất theo thống kê quá khứ của coin đó. */
const Calib={
  res:{},busy:false,
  GRID:{m:[0.8,1,1.25,1.5,2,2.5],t2:[3,3.5,4]}, // TP1 cố định theo Cài đặt; TP2 chọn 3–4R khi để Tự chọn
  key(s,v,tf){return`${s}|${v.id}|${tf}`},
  get(s,v,tf){const r=this.res[this.key(s,v,tf)];return r&&r.pj===JSON.stringify(v.params)?r:null},
  // Chiến lược đã áp dụng SL/TP tối ưu (nếu có): tín hiệu giữ nguyên, chỉ đổi cắt lỗ và chốt lời
  wrap(impl,P,c){
    if(!c||!c.use)return{impl,P};
    const m=c.m,t1=c.t1,t2=c.t2,maxSl=P.maxSl;
    const w=Object.create(impl);
    w.analyze=(D,i,PP)=>{const a=impl.analyze(D,i,PP);if(!a||a.side==='CHỜ')return a;
      const R=a.R*m,d=a.dirN,o={...a,t1R:undefined,t2R:undefined,R,sl:a.entry-d*R,tp1:a.entry+d*t1*R,tp2:a.entry+d*t2*R,calib:c};
      if(maxSl&&R/a.entry*100>maxSl)return{...a,side:'CHỜ',gate:`Cắt lỗ tối ưu theo thống kê cần ${(R/a.entry*100).toFixed(2)}%, vượt giới hạn ${maxSl}% của x${P.fixLev}`};
      return o};
    return{impl:w,P:{...P,tp1R:t1,tp2R:t2}}},
  // Mô phỏng một bộ (m,t1,t2) trên danh sách tín hiệu; đo thêm lỗi "bị quét SL" và "suýt chạm TP"
  sim(D,list,impl,P,m,t1,t2,from,to){
    const PP={...P,tp1R:t1,tp2R:t2},T=[];let hunt=0,stops=0,near=0,lose=0;
    for(const x of list){
      if(x.i<from||x.i>=to)continue;const a=x.a,R=a.R*m,d=a.dirN;
      const sig={...a,t1R:undefined,t2R:undefined,R,sl:a.entry-d*R,tp1:a.entry+d*t1*R,tp2:a.entry+d*t2*R};
      if(P.maxSl&&R/a.entry*100>P.maxSl)continue;
      const L=Life.run(D,x.i,sig,impl,PP);if(!Book.isDone(L))continue;
      const rr=L.rr-2*FEE/100*L.e/R;T.push({rr,win:L.win});
      if(!L.win){lose++;if(L.bestR>=0.8*t1)near++}
      if(L.st==='S'){stops++;for(let j=L.end+1;j<=Math.min(D.c.length-1,L.end+24);j++)if(d>0?D.h[j]>=sig.tp1:D.l[j]<=sig.tp1){hunt++;break}}}
    const s=Backtest.stats(T);return{...s,hunt:stops?hunt/stops*100:0,near:lose?near/lose*100:0}},
  async fit(s,v,tf){
    const k=this.key(s,v,tf),old=this.res[k];
    if(old&&old.pj===JSON.stringify(v.params)&&Date.now()-old.at<36e5)return old;
    const impl=Strat.impl[v.base],P=v.params,D=await Sig.series(s,tf,5000),last=D.c.length-2,list=[],memo={};
    const an=i=>memo[i]!==undefined?memo[i]:(memo[i]=impl.analyze(D,i,P));
    for(let i=210;i<last;i++){const a=an(i);if(!a||a.side==='CHỜ')continue;const p=an(i-1);if(p&&p.side===a.side)continue;list.push({i,a})}
    const cut=Math.floor(D.c.length*0.7),base0={m:1,t1:P.tp1R,t2:P.tp2R};
    const G=this.GRID,cands=[],t2s=Strat.TP().t2==='auto'?G.t2.filter(x=>x>P.tp1R):[P.tp2R];
    for(const m of G.m)for(const t2 of t2s)cands.push({m,t1:P.tp1R,t2});
    if(!cands.some(c=>c.m===1&&c.t1===P.tp1R&&c.t2===P.tp2R))cands.push(base0);
    let best=null;const bTr=this.sim(D,list,impl,P,1,P.tp1R,P.tp2R,0,cut);
    for(const c of cands){const r=this.sim(D,list,impl,P,c.m,c.t1,c.t2,0,cut);
      if(r.n>=12&&(!best||r.avg>best.r.avg+1e-9||(Math.abs(r.avg-best.r.avg)<1e-9&&r.win>best.r.win)))best={...c,r};await sleep(0)}
    const bTe=this.sim(D,list,impl,P,1,P.tp1R,P.tp2R,cut,1e9),bAll=this.sim(D,list,impl,P,1,P.tp1R,P.tp2R,0,1e9);
    let out={at:Date.now(),pj:JSON.stringify(P),s,v:v.id,use:false,m:1,t1:P.tp1R,t2:P.tp2R,before:bAll,after:bAll,n:list.length};
    if(best&&(best.m!==1||best.t1!==P.tp1R||best.t2!==P.tp2R)){
      const te=this.sim(D,list,impl,P,best.m,best.t1,best.t2,cut,1e9);
      // chỉ dùng khi phần kiểm chứng (dữ liệu mới nhất, chưa dùng để chọn) cũng tốt hơn bản gốc
      if(best.r.avg>bTr.avg&&te.n>=4&&te.avg>=bTe.avg)out={...out,use:true,m:best.m,t1:best.t1,t2:best.t2,after:this.sim(D,list,impl,P,best.m,best.t1,best.t2,0,1e9),test:te,testBase:bTe}}
    return this.res[k]=out},
  // Hiệu chỉnh các coin đang theo dõi (chạy nền, từng coin một)
  async run(coins,tf){
    if(this.busy)return;this.busy=true;
    try{for(const s of coins){const v=Strat.forCoin(s);if(!Strat.fits(v,s,tf)||Strat.impl[v.base].noCalib)continue;try{await this.fit(s,v,tf)}catch(e){}}}
    finally{this.busy=false}},
  // Mô tả ngắn cho thẻ tín hiệu
  note(c){
    if(!c)return'Đang tối ưu SL/TP theo thống kê coin này…';
    const b=c.before,a=c.after,f=x=>x.toFixed(0)+'%';
    if(!c.use)return`SL/TP gốc của chiến lược đã là tốt nhất cho coin này (${b.n} lệnh lịch sử: bị quét SL rồi chạy đúng hướng ${f(b.hunt)}, suýt chạm TP1 ${f(b.near)}).`;
    return`SL/TP đã tối ưu theo ${a.n} lệnh lịch sử của coin: cắt lỗ ×${c.m} so với gốc, TP1 ${c.t1}R, TP2 ${c.t2}R. Bị quét SL rồi chạy đúng hướng ${f(b.hunt)} → ${f(a.hunt)}; suýt chạm TP1 ${f(b.near)} → ${f(a.near)}; thắng ${f(b.win)} → ${f(a.win)}; lãi kỳ vọng ${b.avg.toFixed(2)}R → ${a.avg.toFixed(2)}R.`}
};
