/* Chia vốn theo RỦI RO MỖI LỆNH và giới hạn KÝ QUỸ TỔNG.
     Rủi ro X% là số tiền mất TỐI ĐA khi chạm cắt lỗ, ĐÃ GỒM phí sàn 2 chiều (≈0,05% × 2):
       giá trị vị thế = vốn × X% ÷ (khoảng cắt lỗ % + 0,1%)  → vốn 1000$, rủi ro 5%: chạm cắt lỗ mất đúng 50$ kể cả phí.
     (Trước đây phí tính riêng nên cắt lỗ hẹp 0,25% thực tế mất ~7% vốn.)
     Ký quỹ = giá trị vị thế ÷ đòn bẩy
   Đòn bẩy được TÍNH từ khoảng cắt lỗ, không lấy một mức cố định:
     • Trần an toàn: giá thanh lý phải cách giá vào ít nhất 2 lần khoảng cắt lỗ → đòn bẩy ≤ 1 ÷ (2 × cắt lỗ % + ký quỹ duy trì).
       Cắt lỗ càng rộng thì trần càng thấp (cắt lỗ 4% → tối đa ~11×; cắt lỗ 0,5% → tối đa ~71×).
     • Chọn đòn bẩy THẤP NHẤT đủ để ký quỹ nằm trong ngân sách mỗi lệnh = min(vốn ÷ số lệnh tối đa, ký quỹ còn trống).
   Tổng ký quỹ của mọi lệnh đang mở (kể cả lệnh chờ khớp, vì sàn cũng giữ ký quỹ cho lệnh chờ) không bao giờ vượt vốn:
   không đủ chỗ thì giảm vị thế (thua ít hơn X%) hoặc không cho đặt.
   Chiến lược có đòn bẩy cố định (BTC x100) dùng đúng đòn bẩy đó. */
const Sizing={
  MMR:0.004,   // ký quỹ duy trì bậc thấp nhất (Binance BTC/ETH ≈ 0,4%), để ước tính giá thanh lý (ký quỹ riêng lẻ)
  LIQ_X:2,     // thanh lý phải cách giá vào ≥ 2 lần khoảng cắt lỗ
  MAXLEV:125,  // giới hạn của sàn
  // Đòn bẩy tối đa Binance cho phép thường khác nhau theo coin (ước tính thận trọng; sàn có thể đổi)
  symMax(s){if(!s)return this.MAXLEV;if(s==='BTCUSDT'||s==='ETHUSDT')return 125;return['BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','LINKUSDT','LTCUSDT','BCHUSDT','AVAXUSDT','DOTUSDT','TRXUSDT','ETCUSDT'].includes(s)?75:50},
  safeLev(sl,s){return Math.max(1,Math.min(this.symMax(s),Math.floor(1/(sl*this.LIQ_X+this.MMR))))},
  // o: {bal, risk, slots, entry, sl, dir, fixLev?, margin? (ký quỹ người dùng nhập), avail? (ký quỹ còn trống)}
  trade(o){
    const sl=Math.abs(o.entry-o.sl)/o.entry,f=2*FEE/100,lossT=o.bal*o.risk/100,avail=Math.max(0,o.avail==null?o.bal:Math.min(o.avail,o.bal));
    let notional=lossT/(sl+f),lev,levCut=false,capped=false,room=false;
    const budget=Math.min(avail,o.margin>0?o.margin:o.bal/(o.slots||20),o.margCap?o.bal*o.margCap:Infinity),cap=this.safeLev(sl,o.s);
    if(o.fixLev)lev=o.fixLev;
    else{const need=Math.max(1,Math.ceil(notional/Math.max(budget,1e-9)));lev=Math.min(need,cap);levCut=need>cap}
    let margin=notional/lev;
    if(margin>avail){margin=avail;notional=margin*lev;capped=true;room=avail<o.bal}   // không đủ ký quỹ trống → giảm vị thế
    const liqDist=Math.max(0,1/lev-this.MMR),fee=notional*f,loss=notional*sl+fee;
    return{sl,notional,lev,margin,qty:notional/o.entry,loss,fee,R1:lossT,full:loss>=lossT*0.995,lossPct:loss/(o.bal||1)*100,liq:o.entry*(1-o.dir*liqDist),liqDist,
      liqBeforeSL:liqDist<=sl,capped,room,levCut,cap,budget,avail,none:avail<1}},
  // Tóm tắt cho thanh KPI theo khoảng cắt lỗ điển hình của các coin đang theo dõi
  plan(bal,risk,slots,slPcts,fixLev,avail){
    const ref=median(slPcts)||0.006,t=this.trade({bal,risk,slots,entry:1,sl:1-ref,dir:1,fixLev,avail});
    return{bal,risk,N:slots,ref,...t,A:t.margin,tot:bal*risk/100}}
};
