/* Khởi động ứng dụng: nạp dữ liệu đã lưu, gắn sự kiện, chạy vòng làm mới (15 giây), quét coin (5 phút) và cập nhật giá (3 giây) */
(async function boot(){
  Strat.init();Book.load();UI.load();UI.fillStrat();
  const pages={main:()=>Sig.render(),book:()=>BookPage.render(),ana:()=>{Ana.fillStrats();Sim.fill();Sim.paint()},news:()=>{$('nn').textContent='';NewsPage.render()},lab:()=>Lab.render(),office:()=>Office.show(),set:()=>{}};
  document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('on',x===b));
    document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on',p.id==='p-'+b.dataset.p));
    scrollTo(0,0);pages[b.dataset.p]()});
  $('alert').onclick=()=>{Notify.enable();$('alert').textContent='Cảnh báo đang bật'};
  TG.init();Sig.init();BookPage.init();Ana.init();Sim.init();NewsPage.init();Lab.init();Settings.init();Sync.init();
  Sig.render();Lab.render();NewsPage.load();
  document.addEventListener('keydown',e=>{ // phím tắt 1–7 để chuyển trang
    if(e.target.closest&&e.target.closest('input,select,textarea')||e.ctrlKey||e.metaKey||e.altKey)return;
    const b=document.querySelectorAll('#nav button')[+e.key-1];if(b)b.click()});
  setInterval(()=>Tick.run(),3000);Tick.run();setInterval(()=>NetBar.paint(),1000);
  await Sig.refresh();                                   // hiện nhanh với danh sách coin đã lưu
  const scan=()=>Scan.run().then(()=>Sig.refresh()).then(()=>Calib.run(Sig.focus)).then(()=>Sig.refresh()); // quét chọn coin → tối ưu SL/TP → làm mới
  scan();
  setInterval(()=>Sig.refresh(),15000);
  setInterval(scan,300000);
})();
