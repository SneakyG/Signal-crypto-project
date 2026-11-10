/* Trang Cài đặt: khoá RSS (tuỳ chọn), đặt lại dữ liệu */
const Settings={
  tpNote(){const t=Strat.TP(),w=t.t2==='auto'?3:+t.t2;$('tpn').innerHTML=(()=>{const R1=(UI.bal()||1000)*UI.risk()/100,m=x=>'$'+(x*R1).toFixed(2);return`1R = ${UI.risk()}% × $${UI.bal()||1000} = <b>$${R1.toFixed(2)}</b>. Chạm TP1 (+${t.t1}R): chốt 50% → <b>+${m(t.t1/2)}</b>, dời cắt lỗ về giá vào (tối thiểu <b>hòa vốn – BE</b>). Chạm tiếp TP2 (+${w}R${t.t2==='auto'?' hoặc 3,5 / 4R':''}): chốt 50% còn lại → <b>+${m(w/2)}</b>, tổng <b>+${m((t.t1+w)/2)}</b> (+${((t.t1+w)/2).toFixed(2)}R) = <b>THẮNG</b>. Chạm cắt lỗ = <b>−${m(1)}</b> = THUA (đã gồm phí sàn; vì vậy các mức lãi trên thực nhận thấp hơn một chút).`})()},
  // Nguồn giá: cho biết web đang lấy giá ở đâu và có khớp máy chủ đám mây không
  srcPaint(){const el=$('srcnote');if(!el)return;const p=Store.get('src','auto'),e=Data.src(),bot=typeof Sync!=='undefined'&&Sync.botOn(),bs=Sync.botSrc,N={fut:'Binance Futures',spot:'Binance Spot'};
    el.innerHTML=`Đang dùng: <b>${N[e]}</b>. `+(bot?(bs?(e===bs?`✅ Khớp máy chủ đám mây (máy chủ dùng ${N[bs]}): tín hiệu trên web và tin Telegram tính từ cùng dữ liệu, cùng mã nguồn.`:`⚠ Máy chủ đám mây đang dùng ${N[bs]}, web dùng ${N[e]}: giá vào / SL / TP có thể lệch nhỏ. Chọn "Tự động" để khớp tuyệt đối.`):'Máy chủ đám mây đang chạy (bản cũ chưa báo nguồn giá).')
      :`Máy chủ đám mây chưa chạy trong 20 phút gần đây${p==='auto'?' nên web dùng Futures':''}.`)},
  init(){
    const ss=$('srcsel');if(ss){ss.value=Store.get('src','auto');ss.onchange=()=>{Store.set('src',ss.value);Data.cache={};this.srcPaint();Sig.reload();toast('Đã đổi nguồn giá. Bảng tải lại dữ liệu và tính lại tín hiệu.','up')}}
    $('rssk').value=Store.get('rssk','');
    const tp=Strat.TP();$('stp1').value=String(tp.t1);$('stp2').value=String(tp.t2);this.tpNote();
    $('tpsave').onclick=()=>{const t1=+$('stp1').value,t2=$('stp2').value;
      if(t2!=='auto'&&+t2<=t1){toast('TP2 phải lớn hơn TP1.','dn');return}
      Store.set('tp1',t1);Store.set('tp2',t2);Strat.applyTP();Strat.save();Calib.res={};this.tpNote();
      toast(`Đã lưu: TP1 ${t1}R, TP2 ${t2==='auto'?'tự chọn 3–4R theo coin':t2+'R'}. Bảng tính lại mọi tín hiệu; lệnh đang mở giữ mức cũ.`,'up');Sig.reload()};
    $('rsssave').onclick=()=>{Store.set('rssk',$('rssk').value.trim());toast('Đã lưu khoá. Bấm Tải lại ở trang Tin tức.','up')};
    $('resetbook').onclick=()=>{if(confirm('Xóa toàn bộ Sổ lệnh hôm nay (cả lệnh đang mở)?')){Book.data={day:Fmt.day(),orders:[],log:[],wipe:Date.now()};Book.save();BookPage.render();Sig.render();Sync.run(true)}};
    $('resetlab').onclick=()=>{if(confirm('Đặt lại chiến lược về bản gốc và xóa các phiên bản đã học?')){Store.set('labDead',[...new Set([...Store.get('labDead',[]),...Strat.list.filter(v=>v.status!=='base').map(v=>v.id)])]);Store.set('lab',null);Strat.list=[];Strat.active='auto';Strat.init();for(const v of Strat.list)v.resetAt=Date.now();Strat.save();UI.fillStrat();Ana.fillStrats();Lab.render();Sig.reload()}}}
};
