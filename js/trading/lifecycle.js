/* Vòng đời một lệnh (dùng chung cho thẻ tín hiệu, backtest, học và Sổ lệnh):

   Chờ khớp (P) ── giá chạm giá đặt ──▶ Đã khớp (F) ── chạm TP1 ──▶ Đã TP1 (H, cắt 50%, SL dời về giá vào)
     │ mất tín hiệu → C | quá W nến → X          │ chạm SL → S (-1R)     │ chạm SL(=giá vào) → B (+0,75R) | chạm TP2 → T (+2,25R)
                                                  └ chiến lược báo hết hy vọng → E (thoát sớm tại giá đóng nến)

   Quy ước bảo thủ: trong cùng một nến, chạm cả SL lẫn TP thì tính là chạm SL; TP chỉ tính từ nến sau nến khớp.
   Tính là THẮNG khi đã đạt TP1 (vì đã chốt 50% và dời SL về hòa vốn). Thoát sớm trước TP1 thắng nếu có lãi. */
const Life={
  run(D,i,sig,impl,P){
    const dir=sig.dirN,E=sig.entry,SL=sig.sl,T1=sig.tp1,T2=sig.tp2,R=sig.R,last=D.c.length-1,W=P.W||3,MH=P.maxHold||48;
    const out={st:'P',i,e:E,sl:SL,tp1:T1,tp2:T2,R,dir,fill:null,tp1At:null,end:null,exit:null,rr:null,why:null,win:false,tp1Hit:false,bestR:0};
    let f=-1;
    for(let j=i+1;j<=last;j++){ // ---- pha chờ khớp ----
      if(dir>0?D.l[j]<=E:D.h[j]>=E){f=j;break}
      if(dir>0?D.h[j]>=T1:D.l[j]<=T1){out.st='C';out.end=j;out.why='Giá đã chạy qua TP1 khi chưa khớp';return out}
      if(j>=last)return out; // nến đang chạy: chưa đánh giá lại tín hiệu
      const g=impl.analyze(D,j,P);
      if(!g||g.side==='CHỜ'||g.dirN!==dir){out.st='C';out.end=j;out.why='Mất tín hiệu sau khi nến đóng';return out}
      if(j-i>=W){out.st='X';out.end=j;out.why=`Quá ${W} nến chưa khớp`;return out}}
    if(f<0)return out;
    out.fill=f;out.st='F'; // ---- pha đã khớp ----
    let sl=SL,tp1=false;const pos={dir,entry:E,R,f,bestR:0,tp1Hit:false};
    const fin=(st,rr,exit,j,why)=>{out.st=st;out.rr=rr;out.exit=exit;out.end=j;if(why)out.why=why;out.tp1Hit=tp1;out.win=tp1||(st==='E'&&rr>0);return out};
    for(let j=f;j<=last;j++){
      const hi=D.h[j],lo=D.l[j];
      if(dir>0?lo<=sl:hi>=sl)return tp1?fin('B',0.5*P.tp1R,sl,j):fin('S',-1,sl,j);
      if(j>f){
        if(!tp1){if(dir>0?hi>=T1:lo<=T1){tp1=true;pos.tp1Hit=true;out.tp1At=j;out.st='H';sl=E}}
        else if(dir>0?hi>=T2:lo<=T2)return fin('T',0.5*P.tp1R+0.5*P.tp2R,T2,j);
        pos.bestR=Math.max(pos.bestR,dir*((dir>0?hi:lo)-E)/R);out.bestR=pos.bestR;
        if(j<last){ // chỉ xét thoát sớm trên nến đã đóng
          const c=D.c[j],r=dir*(c-E)/R,why=impl.exit(D,j,pos,P)||(j-f>=MH?`Hết thời gian giữ lệnh (${MH} nến)`:null);
          if(why)return fin('E',tp1?0.5*P.tp1R+0.5*r:r,c,j,why)}}}
    out.tp1Hit=tp1;return out},
  // Lãi/lỗ tạm tính theo giá hiện tại, đơn vị R của toàn bộ vị thế
  mtm(o,price){if(o.st==='P')return null;const r=o.dir*(price-o.entry)/o.R;return o.st==='H'?0.5*o.tp1R+0.5*r:r},
  // Đổi R thành tiền: số tiền lệnh × (R × khoảng cắt lỗ theo % giá) trừ phí hai chiều
  money(o,rr){return o.amt*(rr*o.R/o.entry-2*FEE/100)}
};
