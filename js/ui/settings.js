/* Trang Cài đặt: khoá RSS (tuỳ chọn), đặt lại dữ liệu */
const Settings={
  tpNote(){const t=Strat.TP(),w=t.t2==='auto'?3:+t.t2;$('tpn').innerHTML=`Chạm TP1 (+${t.t1}R): chốt 50%, dời cắt lỗ về giá vào → lệnh THẮNG ít nhất <b>+${(t.t1/2).toFixed(2)}R</b>. Chạm tiếp TP2 (+${w}R${t.t2==='auto'?' hoặc 3,5 / 4R':''}) → tổng <b>+${((t.t1+w)/2).toFixed(2)}R</b>. Thua = −1R. Để hòa vốn khi phần còn lại về giá vào, cần thắng ≥ <b>${(100/(1+t.t1/2)).toFixed(0)}%</b> số lệnh.`},
  init(){
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
