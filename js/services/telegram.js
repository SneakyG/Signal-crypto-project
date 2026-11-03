/* Cảnh báo qua Telegram (chỉ hoạt động khi trang đang mở) */
const TG={
  q:Promise.resolve(),
  cfg(){return{t:($('tgt').value||'').trim(),c:($('tgc').value||'').trim()}},
  async call(m,p={}){
    const t=this.cfg().t;if(!t)throw new Error('Chưa nhập bot token.');
    const j=await(await fetch(`https://api.telegram.org/bot${t}/${m}?`+new URLSearchParams(p))).json();
    if(!j.ok)throw new Error(j.description||'Telegram báo lỗi.');return j.result},
  // Gửi lần lượt, cách nhau hơn 1 giây để không bị giới hạn tốc độ
  send(text){const{t,c}=this.cfg();if(!t||!c||Sync.idle())return; // máy phụ không gửi để tránh tin trùng
   this.q=this.q.then(()=>this.call('sendMessage',{chat_id:c,text})).catch(()=>{}).then(()=>sleep(1100))},
  say(m){$('tgm').textContent=/fetch/i.test(m)?'Không kết nối được Telegram. Kiểm tra mạng hoặc VPN.':m},
  init(){
    for(const id of['tgt','tgc']){$(id).value=Store.get(id,'');$(id).addEventListener('input',()=>Store.set(id,$(id).value))}
    $('tgid').onclick=async()=>{try{
      const m=(await this.call('getUpdates')).reverse().map(x=>x.message||x.channel_post).find(Boolean);
      if(!m)return this.say('Chưa thấy tin nhắn nào. Hãy nhắn cho bot trước rồi bấm lại.');
      $('tgc').value=m.chat.id;Store.set('tgc',String(m.chat.id));this.say('Đã lấy Chat ID: '+m.chat.id)}catch(e){this.say(e.message)}};
    $('tgtest').onclick=async()=>{try{await this.call('sendMessage',{chat_id:this.cfg().c,text:'Kết nối thành công. Cảnh báo sẽ gửi vào đây.'});this.say('Đã gửi tin thử. Kiểm tra Telegram.')}catch(e){this.say(e.message)}}}
};
