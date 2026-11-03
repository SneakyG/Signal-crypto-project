/* Bộ học: học từ các lệnh thua để nâng cấp chiến lược.
   1) Chia dữ liệu theo thời gian: 60% đầu để HỌC, 40% sau để KIỂM CHỨNG (phần này không dùng để chọn tham số).
   2) Phân tích nguyên nhân các lệnh thua (ngược 1D, volume thấp, đuổi giá, sai Discount/Premium...).
   3) Thử siết từng tham số một nấc; giữ nấc nào làm tăng cận dưới tỉ lệ thắng ở phần HỌC mà không làm xấu phần KIỂM CHỨNG.
   4) Mốc: 100 lệnh kiểm chứng gần nhất thắng ≥70 (và lãi kỳ vọng dương) → lưu phiên bản ✓70% rồi nhân bản để học tiếp;
      thắng ≥90 → lưu bản dự phòng ★90%. "Thắng" nghĩa là lệnh đã đạt TP1.
   Phần kiểm chứng chưa đủ 100 lệnh thì chưa xét mốc. */
const Learn={
  running:false,stopFlag:false,
  fmt(s){return s.n?`${s.w}/${s.n} thắng (${s.win.toFixed(0)}%), cận dưới ${s.wil.toFixed(0)}%, ${s.avg>=0?'+':''}${s.avg.toFixed(2)}R mỗi lệnh`:'chưa có lệnh'},
  async data(coins,tf,n,say){
    const set=[];
    for(const s of coins){say(`Tải dữ liệu ${Fmt.coin(s)}…`);try{set.push({s,D:await Sig.series(s,tf,n)})}catch(e){say(`Bỏ qua ${Fmt.coin(s)}: không tải được`)}}
    return set},
  evalP(set,impl,P){
    const tr=[],va=[];
    for(const{s,D}of set){const cut=Math.floor(D.c.length*0.6);for(const t of Backtest.trades(D,impl,P).trades)(t.i<cut?tr:va).push({...t,s})}
    va.sort((a,b)=>a.t-b.t);
    const l10=va.slice(-Strat.N);
    return{tr:Backtest.stats(tr),va:Backtest.stats(va),T:tr,V:va,last10:l10.filter(t=>t.win).length,n10:l10.length}},
  milestone(e){const N=Strat.N;if(e.n10<N||e.va.avg<=0)return 0;return e.last10>=0.9*N?90:e.last10>=0.7*N?70:0},
  failures(T,impl){
    const c={},L=T.filter(t=>!t.win);
    for(const t of L)for(const g of impl.tags(t.feat||{},t.side==='LONG'?1:-1))c[g]=(c[g]||0)+1;
    return{n:L.length,top:Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([g,k])=>`${impl.tagText[g]||g} (${k}/${L.length})`)}},
  snap(e,o){
    const p=s=>({n:s.n,w:s.w,win:s.win,wil:s.wil,avg:s.avg});
    return{tr:p(e.tr),va:p(e.va),last10:e.last10,n10:e.n10,at:Date.now(),tf:o.tf,coins:o.coins.map(Fmt.coin)}},
  stop(){this.stopFlag=true},
  // baseId: phiên bản xuất phát; o: {coins, tf, iters}; say: hàm ghi nhật ký tiến trình
  async run(baseId,o,say){
    if(this.running)return null;this.running=true;this.stopFlag=false;
    try{
      const base=Strat.byId(baseId),impl=Strat.impl[base.base];
      const set=await this.data(o.coins,o.tf,5000,say);
      if(!set.length)throw new Error('Không tải được dữ liệu để học');
      let W=base.status==='learning'?base:Strat.clone(base,'learning');
      let cur=this.evalP(set,impl,W.params),lvl=base.status==='saved90'?90:base.status==='saved70'?70:0;
      say(`Bắt đầu từ ${Strat.label(base)}. Huấn luyện: ${this.fmt(cur.tr)}. Kiểm chứng: ${this.fmt(cur.va)}. ${Strat.N} lệnh kiểm chứng gần nhất: ${cur.last10}/${cur.n10} thắng${cur.n10<Strat.N?` (chưa đủ ${Strat.N} lệnh để xét mốc)`:''}.`);
      // Đạt mốc → lưu phiên bản này, nhân bản để học tiếp. Trả về true nếu đã đạt 90%.
      const check=()=>{
        const ms=this.milestone(cur);if(ms<=lvl)return false;
        W.status=ms>=90?'saved90':'saved70';W.stats=this.snap(cur,o);lvl=ms;
        say(`🏁 Đạt mốc ${ms}%: lưu ${Strat.label(W)} (${Strat.N} lệnh kiểm chứng gần nhất thắng ${cur.last10}/${cur.n10}). Nhân bản ra bản mới để học tiếp.`);
        W=Strat.clone(W,'learning');Strat.save();return ms>=90};
      let done=check();
      for(let it=1;it<=o.iters&&!this.stopFlag&&!done;it++){
        const fl=this.failures(cur.T,impl);
        say(`Bước ${it}: ${fl.n} lệnh thua ở phần học${fl.top.length?'. Nguyên nhân hay gặp: '+fl.top.join(', '):''}.`);
        const cands=[];
        for(const t of impl.tunables){
          const idx=t.steps.indexOf(W.params[t.k]);if(idx<0||idx>=t.steps.length-1)continue;
          const P2={...W.params,[t.k]:t.steps[idx+1]};
          cands.push({t,P2,e:this.evalP(set,impl,P2),from:W.params[t.k],to:t.steps[idx+1]});await sleep(0)}
        const minN=Math.max(8,Math.floor(cur.tr.n*0.5));
        const ok=cands.filter(c=>c.e.tr.n>=minN&&c.e.tr.wil>cur.tr.wil+0.5&&(c.e.va.n<6||c.e.va.wil>=cur.va.wil-3))
          .sort((a,b)=>b.e.tr.wil-a.e.tr.wil||b.e.tr.avg-a.e.tr.avg);
        if(!ok.length){say('Không còn nấc siết nào làm tốt hơn mà vẫn đủ số lệnh. Dừng học.');break}
        const c=ok[0];W.params=c.P2;
        const line=`Siết "${c.t.k}": ${c.from} → ${c.to}. Huấn luyện ${cur.tr.win.toFixed(0)}% → ${c.e.tr.win.toFixed(0)}% (${c.e.tr.n} lệnh), kiểm chứng ${cur.va.win.toFixed(0)}% → ${c.e.va.win.toFixed(0)}% (${c.e.va.n} lệnh).`;
        W.log.push({t:Date.now(),text:line});if(W.log.length>40)W.log.shift();
        say(line);cur=c.e;Strat.save();
        done=check();await sleep(0)}
      W.stats=this.snap(cur,o);Strat.save();
      say(`Kết thúc. ${Strat.label(W)}: huấn luyện ${this.fmt(cur.tr)}; kiểm chứng ${this.fmt(cur.va)}; ${Strat.N} lệnh gần nhất ${cur.last10}/${cur.n10}.`);
      return W
    }catch(e){say('Lỗi: '+e.message);return null}
    finally{this.running=false}}
};
