/* Trung tâm thông báo: hiện thông báo trên trang, ghi nhật ký, gửi Telegram, âm thanh và thông báo của trình duyệt */
const Notify={
  on:false,ctx:null,
  enable(){this.on=true;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();if(window.Notification)Notification.requestPermission()}catch(e){}this.beep()},
  beep(){try{const o=this.ctx.createOscillator();o.connect(this.ctx.destination);o.frequency.value=880;o.start();setTimeout(()=>o.stop(),220)}catch(e){}},
  // kind: loại sự kiện (để ghi nhật ký); html: nội dung toast; text: nội dung Telegram (dòng đầu là tiêu đề); tone: up | dn
  push(kind,html,text,tone){
    toast(html,tone);Book.log(kind,text.split('\n')[0]);TG.send(text);
    if(this.on){this.beep();try{if(window.Notification&&Notification.permission==='granted'){const l=text.split('\n');new Notification(l[0],{body:l.slice(1).join(' ')})}}catch(e){}}}
};
