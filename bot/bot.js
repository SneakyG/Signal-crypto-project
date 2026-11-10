/* Máy chủ đám mây cho "Tín hiệu": gửi Telegram cả khi bạn không mở web.
   Chạy CHÍNH mã nguồn của trang (thư mục js/) trong Node.js, đóng vai "máy chính":
     đồng bộ Gist → quét coin → tối ưu SL/TP → làm mới tín hiệu → theo dõi Sổ lệnh (khớp, TP1, TP2, cắt lỗ)
     → tự đặt lệnh nếu bạn bật "Tự động đặt lệnh" → gửi Telegram → ghi Sổ lệnh lại Gist.
   Nhờ dùng chung mã nguồn nên tín hiệu, giá vào, SL/TP giống hệt trên web.
   Khi máy chủ đang chạy, các trang web tự ngừng gửi Telegram để bạn không nhận tin trùng.

   Chạy độc lập hoàn toàn với trình duyệt: không cần mở web, không cần cài gì trên web trước.
   Biến môi trường (GitHub Actions → Settings → Secrets):
     TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  bot token và Chat ID Telegram (tên cũ TG_TOKEN, TG_CHAT vẫn dùng được)
     GIST_TOKEN  mã GitHub quyền "gist" — nên có: Sổ lệnh, thiết lập, trí nhớ tín hiệu lưu trong Gist bí mật, web mở lên đọc chung.
                 Chưa có Gist đồng bộ thì máy chủ TỰ TẠO (web dán cùng mã là thấy). Đã nhập Telegram trên web thì không cần 2 secret Telegram.
     Không có GIST_TOKEN: chạy chế độ tệp — trạng thái lưu ở BOT_STATE (mặc định .bot-state/state.json, workflow giữ lại bằng actions/cache);
                 khi đó bắt buộc có 2 secret Telegram, thiết lập dùng mặc định (Tự động, rủi ro 5%), web không xem được Sổ lệnh của máy chủ.
     BOT_MINUTES  số phút chạy liên tục mỗi lần (mặc định 4,5)   BOT_EVERY  số giây giữa 2 lần làm mới (mặc định 60)
   Nguồn giá: máy chủ GitHub ở Mỹ bị Binance Futures chặn → dùng Binance Spot và ghi nguồn vào Gist; web (chế độ Tự động) đọc và dùng đúng nguồn đó,
   nên tín hiệu trên web và tin Telegram tính từ cùng dữ liệu, cùng mã nguồn (thư mục js/), khớp nhau.
   Chạy thử trên máy: TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… GIST_TOKEN=ghp_xxx node bot/bot.js  (cần Node.js 18 trở lên) */
const vm=require('vm'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),FILE='tin-hieu-sync.json',BOTFILE='tin-hieu-bot.json',GH='https://api.github.com';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(...a)=>console.log(new Date().toLocaleTimeString('vi-VN'),...a);

async function main(opt={}){
  const env=opt.env||process.env,fetchX=opt.fetch||globalThis.fetch,TOKEN=(env.GIST_TOKEN||'').trim();
  const MIN=+(env.BOT_MINUTES||4.5),EVERY=+(env.BOT_EVERY||60),FILEMODE=!TOKEN,STATE=env.BOT_STATE||path.join(ROOT,'.bot-state','state.json');
  const TGT=(env.TELEGRAM_BOT_TOKEN||env.TG_TOKEN||'').trim(),TGC=String(env.TELEGRAM_CHAT_ID||env.TG_CHAT||'').trim();
  if(FILEMODE&&!(TGT&&TGC))throw new Error('Thiếu GIST_TOKEN (mã GitHub quyền gist) hoặc cặp TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID. Cần ít nhất một trong hai để máy chủ chạy được.');
  const gh=async(p,o={})=>{const r=await fetchX(GH+p,{...o,headers:{Authorization:'Bearer '+TOKEN,Accept:'application/vnd.github+json','User-Agent':'tin-hieu-bot',...(o.body?{'Content-Type':'application/json'}:{})}});
    if(!r.ok)throw new Error('GitHub báo lỗi '+r.status+(r.status===401?' (mã GIST_TOKEN sai hoặc hết hạn)':''));return r.json()};

  // ---- Dựng "trình duyệt giả" và nạp toàn bộ mã của trang ----
  const fileSt=(()=>{if(!FILEMODE)return{};try{return JSON.parse(fs.readFileSync(STATE,'utf8'))}catch(e){return{}}})(); // chế độ tệp: khôi phục lần chạy trước
  const store=Object.assign({},fileSt.store||{}),els={},defs={tf:'1h',bal:'1000',risk:'5',slots:'20',topk:'10',strat:'auto',tgt:'',tgc:''};
  const mk=id=>({id,value:defs[id]!==undefined?defs[id]:'',checked:false,innerHTML:'',textContent:'',hidden:false,disabled:false,className:'',style:{setProperty(){}},dataset:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return[]},
    contains(){return false},appendChild(){},remove(){},closest(){return null},blur(){},focus(){},scrollIntoView(){},setAttribute(){},getBoundingClientRect(){return{left:0,top:0,width:0,height:0}}});
  const el=id=>els[id]||(els[id]=mk(id));
  const ctx={console,process:{env:{}},document:{getElementById:el,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>mk('x'),head:{appendChild(){}},body:{appendChild(){},classList:{add(){},remove(){}}},hidden:false,addEventListener(){},documentElement:{}},
    window:{BOT:true},navigator:{},location:{href:''},matchMedia:()=>({matches:false,addEventListener(){}}),getComputedStyle:()=>({getPropertyValue:()=>''}),
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    performance:{now:()=>performance.now()},requestAnimationFrame:f=>setTimeout(()=>f(Date.now()),16),cancelAnimationFrame:clearTimeout,
    setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},AbortController,URL,URLSearchParams,Blob,TextEncoder,TextDecoder,confirm:()=>true,scrollTo(){},
    fetch:(u,o)=>fetchX(u,o)};
  vm.createContext(ctx);
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  const files=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]).filter(f=>f!=='js/main.js'&&!/^https?:/.test(f));
  for(const f of files)vm.runInContext(fs.readFileSync(path.join(ROOT,f),'utf8'),ctx,{filename:f});
  const A=vm.runInContext('({Store,Sync,Sig,Scan,Calib,Book,TG,Strat,AutoLab,UI,Data,Net,Fmt,BookPage,Lab})',ctx);
  for(const o of[A.BookPage,A.Lab,A.Scan])for(const k of['render','renderRank','renderLog','paintBar'])if(o&&typeof o[k]==='function')o[k]=()=>{};

  // ---- Gist đồng bộ: có sẵn thì dùng, chưa có thì máy chủ tự tạo (không cần bật trên web trước) ----
  let st=FILEMODE?(fileSt.bot||{}):{},gid='';
  if(!FILEMODE){const list=await gh('/gists?per_page=100'),g0=list.find(x=>x.files&&x.files[FILE]);
    A.Store.set('syncTok',TOKEN);A.Store.set('syncMain',true);
    if(g0){gid=g0.id;A.Store.set('syncGist',gid);const g=await gh('/gists/'+gid);try{st=JSON.parse((g.files[BOTFILE]||{}).content||'{}')}catch(e){}}
    else{A.Store.set('syncGist','');log('Chưa có Gist đồng bộ → máy chủ tự tạo Gist bí mật mới (trên web dán cùng mã GitHub ở Cài đặt → Đồng bộ là thấy).')}}
  else log('Chế độ tệp (không có GIST_TOKEN): trạng thái lưu ở',path.relative(ROOT,STATE)||STATE);
  A.AutoLab.check=()=>{}; // không tự học trên máy chủ: để web làm (giữ nguyên bộ đếm 100 lệnh)
  A.Sig.render=()=>{};A.Sig.reload=async()=>{}; // không có màn hình: bỏ phần vẽ giao diện; // trên web, đổi thiết lập thì quét lại ngay; máy chủ tự quét trong vòng chạy bên dưới
  // Máy chủ GitHub đặt ở Mỹ: Binance Futures chặn (mã 451) → dùng thẳng dữ liệu Spot (giá gần như trùng Futures)
  try{const r=await fetchX(A.Data.FAPI+'/fapi/v1/ping');if(!r.ok)throw 0;A.Store.set('src','fut')}catch(e){A.Net.st(new URL(A.Data.FAPI).host).until=Date.now()+864e5;A.Store.set('src','spot');log('Binance Futures không truy cập được từ máy chủ này → dùng dữ liệu Spot (web ở chế độ Tự động sẽ dùng cùng nguồn).')}
  A.Strat.init();A.Book.load();A.UI.load();
  if(!FILEMODE){await A.Sync.run();if(A.Sync.err)throw new Error('Đồng bộ lỗi: '+A.Sync.err);gid=A.Store.get('syncGist','')}
  try{A.UI.lockTf()}catch(e){}
  // Telegram: ưu tiên biến môi trường, không có thì dùng token đã nhập trên web (đồng bộ qua Gist)
  if(TGT&&TGC){el('tgt').value=TGT;el('tgc').value=TGC}
  else{el('tgt').value=A.Store.get('tgt','');el('tgc').value=A.Store.get('tgc','')}
  const tgOk=!!(el('tgt').value&&el('tgc').value);
  log(`${FILEMODE?'Tệp trạng thái':'Gist '+gid} · ${A.Book.data.orders.length} lệnh · chiến lược ${A.Strat.active} · khung ${A.UI.tf()} · rủi ro ${A.UI.risk()}% · tự đặt lệnh ${A.Store.get('auto',false)?'BẬT':'tắt'} · Telegram ${tgOk?'có':'CHƯA CÓ token'}`);
  if(!tgOk)log('⚠ Chưa có bot token / Chat ID: thêm secret TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (hoặc nhập ở Cài đặt → Telegram trên web).');


  // Khôi phục trí nhớ giữa các lần chạy: tín hiệu nào đã báo rồi thì không báo lại
  A.Sig.seen=st.seen||{};A.Sig.seeded=st.seeded||{};
  if(!st.at&&tgOk)A.TG.send('🤖 Máy chủ đám mây Tín hiệu đã chạy.\nTừ giờ Telegram sẽ báo tín hiệu mới, khớp lệnh, TP1, đóng lệnh kể cả khi bạn không mở web.\n(Lần chạy đầu chỉ ghi nhớ tín hiệu đang có, chưa báo lại.)');
  const save=async()=>{
    const cut=Date.now()-3*864e5,seen={};for(const[k,v]of Object.entries(A.Sig.seen)){const t=+String(k).split('|').pop();if(!(t>0)||t>cut)seen[k]=v} // bỏ trí nhớ quá 3 ngày
    const S={at:Date.now(),seen,seeded:A.Sig.seeded,focus:A.Sig.focus,tf:A.UI.tf(),runs:(st.runs||0)+1,src:A.Data.src(),ver:2};st.runs0=st.runs0||0;
    if(FILEMODE){try{fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify({store,bot:S}))}catch(e){log('Không ghi được tệp trạng thái:',e.message)}return}
    try{await gh('/gists/'+gid,{method:'PATCH',body:JSON.stringify({files:{[BOTFILE]:{content:JSON.stringify(S)}}})})}catch(e){log('Không ghi được trạng thái máy chủ:',e.message)}};

  if(opt.hook)opt.hook(A); // dùng cho kiểm thử
  // ---- Vòng chạy ----
  const t0=Date.now();let lastScan=0,n=0;
  for(;;){
    n++;
    try{
      await A.Data.prices();
      if(Date.now()-lastScan>5*6e4){await A.Scan.run();await A.Calib.run(A.Sig.focus);lastScan=Date.now();log('Quét xong, theo dõi:',A.Sig.focus.map(A.Fmt.coin).join(', '))}
      await A.Sig.refresh();
      const sig=Object.entries(A.Sig.state).filter(([,x])=>x.ok&&x.tr&&A.Book.isOpen(x.tr.L)).map(([s,x])=>`${A.Fmt.coin(s)} ${x.tr.sig.side} (${x.tr.L.st==='P'?'chờ khớp':'đã khớp'})`);
      log(`Lượt ${n}: ${sig.length?'tín hiệu '+sig.join(', '):'chưa có tín hiệu'} · lệnh mở ${A.Book.data.orders.filter(A.Book.isOpen).length}`);
      if(!FILEMODE){await A.Sync.run();if(A.Sync.err)log('⚠ Đồng bộ:',A.Sync.err)}
    }catch(e){log('Lỗi lượt',n,e.message)}
    await save();
    if(Date.now()-t0>MIN*6e4)break;
    await sleep(EVERY*1000)}
  await A.TG.q; // chờ gửi hết tin Telegram
  return{gid,ctx,A,file:FILEMODE?STATE:null}}

if(require.main===module)main().then(()=>{log('Xong.');process.exit(0)}).catch(e=>{console.error('LỖI:',e.message);process.exit(1)});
module.exports={main};
