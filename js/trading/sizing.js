/* Chia vốn: mọi lệnh dùng CÙNG MỘT khoản tiền, đủ để mở tối đa N lệnh (20-25).
   Khoản mỗi lệnh A sao cho nếu cả N lệnh cùng cắt lỗ thì tổng lỗ đúng bằng mức rủi ro tổng:  A = vốn × rủi ro% ÷ (N × khoảng cắt lỗ điển hình theo % giá). */
const Sizing={
  plan(bal,rk,N,slPcts){
    const ref=median(slPcts)||0.006,A=bal*rk/100/(N*ref);
    return{bal,rk,N,A,ref,lev:Math.max(1,Math.ceil(N*A/(bal||1))),tot:bal*rk/100}}
};
