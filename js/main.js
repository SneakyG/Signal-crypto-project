/* Khởi động ứng dụng: nạp dữ liệu đã lưu, gắn sự kiện, chạy vòng làm mới (15 giây), quét coin (5 phút) và cập nhật giá (3 giây) */
(async function boot(){
  Strat.init();Book.load();UI.load();UI.fillStrat();
  const pages={main:()=>Sig.render(),book:()=>BookPage.render(),ana:()=>Ana.fillStrats(),news:()=>{if(!NewsPage.loaded)NewsPage.load()},lab:()=>Lab.render(),set:()=>{}};
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on',p.id==='p-'+b.dataset.p));
    scrollTo(0,0);pages[b.dataset.p]()});
  $('alert').onclick=()=>{Notify.enable();$('alert').textContent='Cảnh báo đang bật'};
  TG.init();Sig.init();BookPage.init();Ana.init();NewsPage.init();Lab.init();Settings.init();
  Sig.render();Lab.render();
  setInterval(()=>Tick.run(),3000);Tick.run();
  await Sig.refresh();                                   // hiện nhanh với danh sách coin đã lưu
  Scan.run().then(()=>Sig.refresh());                    // quét realtime chọn coin theo chiến lược, xong thì làm mới
  setInterval(()=>Sig.refresh(),15000);
  setInterval(()=>Scan.run().then(()=>Sig.refresh()),300000);
})();
