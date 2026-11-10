/* Cảnh báo qua Telegram.
   Ai gửi (để không trùng tin): 1) máy chủ đám mây (bot/bot.js chạy trên GitHub Actions) nếu đang chạy → các trang web không gửi nữa;
   2) không có máy chủ: máy chính gửi; 3) máy chính đã tắt trang hơn 5 phút: máy phụ đang mở gửi thay.
   Token và Chat ID được đồng bộ qua Gist nên chỉ cần nhập ở một máy. */
const TG={
  q:Promise.resolve(),
  cfg(){return{t:($('tgt').value||'').trim(),c:($('tgc').value||'').trim()}},
  async call(m,p={}){
    const t=this.cfg().t;if(!t)throw new Error('Chưa nhập bot token.');
    const j=await(await fetch(`https://api.telegram.org/bot${t}/${m}?`+new URLSearchParams(p))).json();
    if(!j.ok)throw new Error(j.description||'Telegram báo lỗi.');return j.result},
  // Gửi lần lượt, cách nhau hơn 1 giây để không bị giới hạn tốc độ
  who(){if(typeof window!=='undefined'&&window.BOT)return'bot-self';if(Sync.botOn())return'bot';if(!Sync.idle())return'me';return Sync.mainStale()?'me':'main'},
  send(text){const{t,c}=this.cfg();if(!t||!c||this.who()==='bot'||this.who()==='main')return; // tránh tin trùng
   this.q=this.q.then(()=>this.call('sendMessage',{chat_id:c,text})).catch(()=>{}).then(()=>sleep(1100))},
  // Dòng trạng thái: ai đang gửi Telegram lúc này
  paint(){if(typeof Settings!=='undefined'&&Settings.srcPaint)try{Settings.srcPaint()}catch(e){}const el=$('tgwho');if(!el)return;const{t,c}=this.cfg(),w=this.who(),ago=x=>Math.max(0,Math.round((Date.now()-x)/6e4));
    el.className='note '+(t&&c?'up':'dn');
    el.innerHTML=!t||!c?'⚠ Chưa có bot token / Chat ID nên chưa gửi được tin nào.'
      :w==='bot'?`✅ <b>Máy chủ đám mây</b> đang gửi Telegram (chạy lần cuối ${ago(Sync.botAt)} phút trước), kể cả khi bạn tắt hết trình duyệt. Trang web này không gửi để tránh trùng tin.`
      :w==='main'?`Máy chính đang mở và gửi Telegram (đồng bộ ${ago(Sync.mainAt)} phút trước). Máy này là máy phụ nên không gửi để tránh trùng tin.`
      :`✅ Máy này đang gửi Telegram${Sync.idle()?' thay máy chính (máy chính đang tắt trang)':''}. ⚠ Tắt trang thì không còn ai gửi, trừ khi bạn bật <b>máy chủ đám mây</b> (hướng dẫn trong file bot/HUONG-DAN.md).`},
  say(m){$('tgm').textContent=/fetch/i.test(m)?'Không kết nối được Telegram. Kiểm tra mạng hoặc VPN.':m},
  init(){
    for(const id of['tgt','tgc']){$(id).value=Store.get(id,'');$(id).addEventListener('input',()=>{Store.set(id,$(id).value);Store.set('tgU',Date.now());this.paint()})}this.paint();setInterval(()=>this.paint(),30000);
    $('tgid').onclick=async()=>{try{
      const m=(await this.call('getUpdates')).reverse().map(x=>x.message||x.channel_post).find(Boolean);
      if(!m)return this.say('Chưa thấy tin nhắn nào. Hãy nhắn cho bot trước rồi bấm lại.');
      $('tgc').value=m.chat.id;Store.set('tgc',String(m.chat.id));this.say('Đã lấy Chat ID: '+m.chat.id)}catch(e){this.say(e.message)}};
    $('tgtest').onclick=async()=>{try{await this.call('sendMessage',{chat_id:this.cfg().c,text:'Kết nối thành công. Cảnh báo sẽ gửi vào đây.'});this.say('Đã gửi tin thử. Kiểm tra Telegram.')}catch(e){this.say(e.message)}}}
};
