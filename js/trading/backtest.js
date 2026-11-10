/* Backtest: chạy đúng quy trình lệnh chờ trên lịch sử giá.
   Chỉ đặt lệnh khi có tín hiệu MỚI (nến trước chưa cùng chiều); mỗi lần chỉ giữ một lệnh trên một coin. */
const Backtest={
  // Một nến một bước; bản đồng bộ chạy liền, bản async nhường luồng mỗi ~12ms và dừng ngay khi bị hủy
  *steps(D,impl,P,opt,o){
    const last=D.c.length-1,from=opt.from||210,to=Math.min(opt.to==null?last-2:opt.to,last-2),fee=opt.fee==null?FEE:opt.fee,memo={};
    const an=i=>memo[i]!==undefined?memo[i]:(memo[i]=impl.analyze(D,i,P));
    for(let i=from;i<=to;i++){
      yield;
      const s=an(i);if(!s||s.side==='CHỜ')continue;
      const p=an(i-1);if(p&&p.side===s.side)continue;
      const L=Life.run(D,i,s,impl,P);
      if(L.st==='P'||L.st==='F'||L.st==='H')break; // chưa kết thúc (hết dữ liệu): không tính
      o.placed++;
      if(L.st==='C'||L.st==='X'){o.miss++;i=L.end;continue}
      o.trades.push({i,t:D.t[i],side:s.side,st:L.st,win:L.win,be:L.be,tp1:L.tp1Hit,rr:L.rr-2*fee/100*L.e/L.R,gross:L.rr,end:L.end,why:L.why,feat:s.feat});
      i=L.end}},
  trades(D,impl,P,opt={}){const o={trades:[],placed:0,miss:0};for(const _ of this.steps(D,impl,P,opt,o));return o},
  async tradesAsync(D,impl,P,opt={},live=()=>true){
    const o={trades:[],placed:0,miss:0},sl=Idle.slice();let n=0;
    for(const _ of this.steps(D,impl,P,opt,o)){if((++n&15)===0&&await sl()&&!live())return null}
    return live()?o:null},
  stats(T){
    const n=T.length,w=T.filter(t=>t.win).length,be=T.filter(t=>t.be).length,sum=T.reduce((a,t)=>a+t.rr,0);
    const gp=T.filter(t=>t.rr>0).reduce((a,t)=>a+t.rr,0),gl=-T.filter(t=>t.rr<=0).reduce((a,t)=>a+t.rr,0);
    let eq=0,pk=0,dd=0,run=0,ml=0;
    for(const t of T){eq+=t.rr;pk=Math.max(pk,eq);dd=Math.max(dd,pk-eq);if(t.win)run=0;else ml=Math.max(ml,++run)}
    const ls=n-w-be;
    return{n,w,be,ls,nl:n-ls,lossP:n?ls/n*100:0,nlWil:wilson(n-ls,n),beP:n?be/n*100:0,win:n?w/n*100:0,avg:n?sum/n:0,pf:gl?gp/gl:gp?99:0,dd,ml,wil:wilson(w,n)}},
  run(D,impl,P,opt){const r=this.trades(D,impl,P,opt);return{...r,...this.stats(r.trades)}},
  // Không chặn giao diện; trả về null nếu bị hủy giữa chừng (live() = false)
  async runAsync(D,impl,P,opt,live){const r=await this.tradesAsync(D,impl,P,opt,live);return r&&{...r,...this.stats(r.trades)}},
  pack(r){return{n:r.n,placed:r.placed,miss:r.miss,win:r.win,wil:r.wil,avg:r.avg,pf:r.pf,w:r.w,be:r.be,ls:r.ls,tp1n:r.trades.filter(t=>t.tp1).length,sum:r.avg*r.n}}
};
