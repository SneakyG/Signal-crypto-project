/* Trang Cài đặt: khoá RSS (tuỳ chọn), đặt lại dữ liệu */
const Settings={
  init(){
    $('rssk').value=Store.get('rssk','');
    $('rsssave').onclick=()=>{Store.set('rssk',$('rssk').value.trim());toast('Đã lưu khoá. Bấm Tải lại ở trang Tin tức.','up')};
    $('resetbook').onclick=()=>{if(confirm('Xóa toàn bộ Sổ lệnh hôm nay (cả lệnh đang mở)?')){Book.data={day:Fmt.day(),orders:[],log:[]};Book.save();Sig.render()}};
    $('resetlab').onclick=()=>{if(confirm('Đặt lại chiến lược về bản gốc và xóa các phiên bản đã học?')){Store.set('lab',null);Strat.list=[];Strat.active='auto';Strat.init();UI.fillStrat();Ana.fillStrats();Lab.render();Sig.reload()}}}
};
