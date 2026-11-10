// Kiểm thử máy chủ đám mây với GitHub / Binance / Telegram giả lập
const {main}=require('./bot.js');
function gen(seed,n,stp=9e5){let s=seed;const rnd=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};const T0=Math.floor((Date.now()-n*stp)/stp)*stp,rows=[];let p=100;
  for(let k=0;k<n;k++){const reg=Math.sin(k/2500)*0.0004+Math.sin(k/400)*0.0007,o=p,ret=reg+(rnd()-.5)*0.006;p=o*(1+ret);rows.push([T0+k*stp,o,Math.max(o,p)*(1+rnd()*0.002),Math.min(o,p)*(1-rnd()*0.002),p,1000*(0.5+rnd()*2)*(1+Math.abs(ret)*100)])}return rows}
const agg=(rows,m)=>{const o=[];for(let i=0;i+m<=rows.length;i+=m){const g=rows.slice(i,i+m);o.push([g[0][0],g[0][1],Math.max(...g.map(x=>x[2])),Math.min(...g.map(x=>x[3])),g[g.length-1][4],g.reduce((a,x)=>a+x[5],0)])}return o};
const DS={};for(const [sym,seed] of [['BTCUSDT',7],['ETHUSDT',11],['SOLUSDT',5],['BNBUSDT',3]]){const r=gen(seed,20000);DS[sym]={'15m':r,'1h':agg(r,4),'4h':agg(r,16),'1d':agg(r,96),'5m':gen(seed+9,8000,3e5)}}
const day=new Date().toLocaleDateString('en-CA');
const files={'tin-hieu-sync.json':JSON.stringify({v:1,at:Date.now(),day,wipe:0,orders:[],lab:{list:[],dead:[]},mainAt:Date.now()-36e5,
  cfg:{u:5,ui:{tf:'15m',bal:'1000',risk:'5',slots:'20',topk:'3',v:6},active:'auto',tp1:1.5,tp2:'auto',auto:true,tg:{t:'TT',c:'CC',u:1}}}),'other.txt':'x'};
const TGM=[],calls={gh:0,fapi:0,spot:0};
const J=(o,st=200)=>({ok:st<300,status:st,headers:{get:()=>null},json:async()=>o,text:async()=>JSON.stringify(o)});
const fetch=async(u,o={})=>{const url=new URL(u);
  if(url.host==='api.github.com'){calls.gh++;if(o.headers.Authorization!=='Bearer TOK')return J({},401);
    if(url.pathname==='/gists')return J([{id:'g9',files:{'tin-hieu-sync.json':{}}}]);
    if(url.pathname==='/gists/g9'&&(o.method||'GET')==='GET')return J({files:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,{content:v,truncated:false}]))});
    if(url.pathname==='/gists/g9'&&o.method==='PATCH'){for(const[k,v]of Object.entries(JSON.parse(o.body).files))files[k]=v.content;return J({})}
    return J({},404)}
  if(url.host==='api.telegram.org'){TGM.push(url.searchParams.get('text'));return J({ok:true,result:{}})}
  if(url.host==='fapi.binance.com'){calls.fapi++;if(process.env.DBG)console.log('FAPI',u.slice(0,120));return J({code:0,msg:'restricted location'},451)}
  if(url.host==='data-api.binance.vision'){calls.spot++;
    if(url.pathname.includes('klines')){const s=url.searchParams.get('symbol'),i=url.searchParams.get('interval'),lim=+url.searchParams.get('limit'),end=url.searchParams.get('endTime');let a=(DS[s]&&DS[s][i])||[];if(end)a=a.filter(r=>r[0]<=+end);if(!a.length)return J({code:-1121},400);return J(a.slice(-lim).map(r=>[r[0],...r.slice(1).map(String)]))}
    if(url.pathname.includes('ticker/price'))return J(Object.keys(DS).map(s=>({symbol:s,price:String(DS[s]['15m'].slice(-1)[0][4])})));
    if(url.pathname.includes('ticker/24hr'))return J(Object.keys(DS).map(s=>({symbol:s,lastPrice:String(DS[s]['15m'].slice(-1)[0][4]),priceChangePercent:'1.2'})))}
  return J({},404)};
const fakeSig=A=>{const tr0=A.Sig.track.bind(A.Sig);A.Sig.track=function(D,impl,P){if(!Object.keys(A.Data.cache).some(k=>k.startsWith('BTCUSDT|')&&A.Data.cache[k]===D))return tr0(D,impl,P);/* BTC ở bất kỳ khung nào */const i=D.c.length-3,c=D.c[D.c.length-1],e=c*0.995,R=c*0.006;
  return{i,sig:{side:'LONG',dirN:1,entry:e,sl:e-R,R,tp1:e+1.5*R,tp2:e+3*R,feat:{}},L:{st:'P',i,e,sl:e-R,tp1:e+1.5*R,tp2:e+3*R,R,dir:1,fill:null,res:null}}}};
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n)}else{fail++;console.log('FAIL',n,d!==undefined?JSON.stringify(d).slice(0,400):'')}};
(async()=>{
  const env={GIST_TOKEN:'TOK',BOT_MINUTES:'0',BOT_EVERY:'1'};
  const t0=Date.now();const r1=await main({env,fetch,hook:fakeSig});
  const S1=JSON.parse(files['tin-hieu-sync.json']),B1=JSON.parse(files['tin-hieu-bot.json']||'{}');
  ok(`chạy xong lượt 1 (${((Date.now()-t0)/1000).toFixed(1)}s)`,true);
  ok('Futures bị chặn 451 → dùng Spot, không gọi lại Futures liên tục',calls.fapi<=3&&calls.spot>10,calls);
  ok('dùng token Telegram đồng bộ từ web (Gist) khi không có secret',TGM.length>0,TGM.length);
  ok('lần chạy đầu gửi tin chào',TGM.some(t=>t.startsWith('🤖 Máy chủ đám mây')),TGM.map(t=>t.split('\n')[0]));
  const placed=S1.orders.filter(o=>o.auto);
  ok(`tự động đặt lệnh như máy chính và ghi vào Gist (${placed.length} lệnh)`,placed.length>0,S1.orders.length);
  ok('mỗi lệnh tự đặt có tin Telegram',placed.length<=TGM.filter(t=>t.startsWith('🤖 TỰ ĐỘNG ĐẶT LỆNH')).length,TGM.map(t=>t.split('\n')[0]));
  ok(`rủi ro 5%: mỗi lệnh thua đúng $50 (${placed.map(o=>o.riskUSD.toFixed(2))})`,placed.length>0&&placed.every(o=>Math.abs(o.riskUSD-50)<0.05),placed.map(o=>o.riskUSD));
  ok('ghi trạng thái máy chủ (trí nhớ tín hiệu, giờ chạy)',B1.at>0&&Object.keys(B1.seeded||{}).length>0&&B1.runs===1,Object.keys(B1));
  const n1=TGM.length,o1=S1.orders.length;
  await main({env,fetch,hook:fakeSig});
  const S2=JSON.parse(files['tin-hieu-sync.json']),B2=JSON.parse(files['tin-hieu-bot.json']);
  ok('lượt 2: không đặt trùng lệnh, không gửi lại tin cũ',S2.orders.length===o1&&TGM.slice(n1).every(t=>!t.startsWith('🤖 TỰ ĐỘNG')&&!t.startsWith('🤖 Máy chủ')),{o1,o2:S2.orders.length,msg:TGM.slice(n1).map(t=>t.split('\n')[0])});
  ok('lượt 2 tăng số lần chạy',B2.runs===2,B2.runs);
  // Tín hiệu mới xuất hiện giữa 2 lần chạy → có tin "TÍN HIỆU MỚI"
  // Tín hiệu xuất hiện lúc không ai mở web và chưa báo → máy chủ gửi "📌 TÍN HIỆU MỚI" (tắt tự đặt lệnh)
  {const B=JSON.parse(files['tin-hieu-bot.json']);for(const k of Object.keys(B.seen))if(k.startsWith('BTCUSDT|'))delete B.seen[k];files['tin-hieu-bot.json']=JSON.stringify(B);
   const S=JSON.parse(files['tin-hieu-sync.json']);S.cfg.auto=false;S.cfg.u=Date.now();S.orders=[];files['tin-hieu-sync.json']=JSON.stringify(S);
   const n3=TGM.length;await main({env,fetch,hook:fakeSig});const M=TGM.slice(n3);
   ok('tín hiệu mới khi không mở web → gửi "📌 TÍN HIỆU MỚI" kèm giá vào, SL, TP',M.some(t=>t.startsWith('📌 TÍN HIỆU MỚI BTC LONG')&&/Cắt lỗ/.test(t)),M.map(t=>t.split('\n')[0]));
   const n4=TGM.length;await main({env,fetch,hook:fakeSig});ok('lần chạy sau không báo lại tín hiệu đó',!TGM.slice(n4).some(t=>t.startsWith('📌')),TGM.slice(n4).map(t=>t.split('\n')[0]))}
  // Web đọc nhịp của máy chủ → web không gửi Telegram nữa (tránh trùng)
  ok('máy chủ ghi nhịp "đang chạy" để web tự ngừng gửi',Date.now()-JSON.parse(files['tin-hieu-bot.json']).at<6e4);
  ok('thiếu GIST_TOKEN báo lỗi rõ ràng',await main({env:{},fetch}).then(()=>false,e=>/GIST_TOKEN/.test(e.message)));
  ok('máy chủ ghi nguồn giá đang dùng (Spot vì Futures bị chặn) để web khớp theo',JSON.parse(files['tin-hieu-bot.json']).src==='spot',JSON.parse(files['tin-hieu-bot.json']).src);
  // ---- Độc lập với web: chưa từng bật Đồng bộ trên web → máy chủ tự tạo Gist; secret mang tên TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ----
  {const G={},chats=[];let created=0;
   const f2=async(u,o={})=>{const url=new URL(u);
     if(url.host==='api.github.com'){if(o.headers.Authorization!=='Bearer TOK2')return J({},401);
       if(url.pathname==='/gists'&&(o.method||'GET')==='GET')return J(Object.entries(G).map(([id,fl])=>({id,files:Object.fromEntries(Object.keys(fl).map(k=>[k,{}]))})));
       if(url.pathname==='/gists'&&o.method==='POST'){created++;const id='new'+created;G[id]={};for(const[k,v]of Object.entries(JSON.parse(o.body).files))G[id][k]=v.content;return J({id})}
       const m=url.pathname.match(/^\/gists\/(\w+)$/);if(m&&G[m[1]]){if((o.method||'GET')==='GET')return J({files:Object.fromEntries(Object.entries(G[m[1]]).map(([k,v])=>[k,{content:v,truncated:false}]))});
         if(o.method==='PATCH'){for(const[k,v]of Object.entries(JSON.parse(o.body).files))G[m[1]][k]=v.content;return J({})}}
       return J({},404)}
     if(url.host==='api.telegram.org'){chats.push(url.searchParams.get('chat_id')||(o.body&&String(o.body).match(/chat_id[^0-9-]*(-?\d+)/)||[])[1]);TGM.push(url.searchParams.get('text')||'');return J({ok:true,result:{}})}
     return fetch(u,o)};
   const env2={GIST_TOKEN:'TOK2',TELEGRAM_BOT_TOKEN:'BOTX',TELEGRAM_CHAT_ID:'777',BOT_MINUTES:'0',BOT_EVERY:'1'};
   const r=await main({env:env2,fetch:f2});const id=Object.keys(G)[0];
   ok('chưa có Gist (chưa bật gì trên web) → máy chủ tự tạo Gist đồng bộ và chạy bình thường',created===1&&id&&G[id]['tin-hieu-sync.json']&&G[id]['tin-hieu-bot.json'],{created,files:id&&Object.keys(G[id])});
   ok('dùng secret TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID',chats.length>0&&chats.every(c=>c==='777'),chats.slice(0,3));
   await main({env:env2,fetch:f2});ok('lượt sau dùng lại Gist đã tạo, không tạo thêm',created===1&&JSON.parse(G[id]['tin-hieu-bot.json']).runs===2,{created,runs:JSON.parse(G[id]['tin-hieu-bot.json']).runs})}
  // ---- Chế độ tệp: không có GIST_TOKEN, chỉ có Telegram → trạng thái lưu tệp (workflow giữ lại bằng actions/cache) ----
  {const os=require('os'),fsx=require('fs'),pth=require('path'),dir=fsx.mkdtempSync(pth.join(os.tmpdir(),'thbot-')),file=pth.join(dir,'state.json');let ghc=0;
   const f3=async(u,o={})=>{const url=new URL(u);if(url.host==='api.github.com'){ghc++;return J({},401)}if(url.host==='api.telegram.org'){TGM.push(url.searchParams.get('text')||'');return J({ok:true,result:{}})}return fetch(u,o)};
   const env3={TELEGRAM_BOT_TOKEN:'BOTY',TELEGRAM_CHAT_ID:'888',BOT_STATE:file,BOT_MINUTES:'0',BOT_EVERY:'1'};
   const n0=TGM.length;await main({env:env3,fetch:f3});const st1=JSON.parse(fsx.readFileSync(file,'utf8'));
   ok('không có GIST_TOKEN: vẫn chạy, gửi Telegram, lưu trạng thái ra tệp, không gọi GitHub',ghc===0&&TGM.slice(n0).some(t=>t.startsWith('🤖 Máy chủ'))&&st1.bot&&st1.bot.runs===1&&st1.store,{ghc,runs:st1.bot&&st1.bot.runs});
   const n1=TGM.length;await main({env:env3,fetch:f3});const st2=JSON.parse(fsx.readFileSync(file,'utf8'));
   ok('chế độ tệp, lượt 2: nhớ lần trước (không chào lại, không báo lại tín hiệu cũ)',st2.bot.runs===2&&!TGM.slice(n1).some(t=>t.startsWith('🤖 Máy chủ')||t.startsWith('📌')),{runs:st2.bot.runs,msg:TGM.slice(n1).map(t=>t.split('\n')[0])})}
  ok('thiếu cả GIST_TOKEN lẫn Telegram: báo lỗi rõ ràng',await main({env:{TELEGRAM_BOT_TOKEN:'x'},fetch}).then(()=>false,e=>/TELEGRAM_BOT_TOKEN/.test(e.message)&&/GIST_TOKEN/.test(e.message)));
  console.log(`\nTỔNG: ${pass} đạt, ${fail} lỗi`);process.exit(fail?1:0)})().catch(e=>{console.log('LỖI TEST',e.stack);process.exit(1)});
