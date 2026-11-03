/* Đồng bộ giữa các thiết bị (máy tính, điện thoại) qua một GitHub Gist bí mật.
   - Mỗi thiết bị dán cùng một mã GitHub (chỉ cần quyền "gist"). Thiết bị đầu tiên tự tạo Gist "tin-hieu-sync.json",
     các thiết bị sau tự tìm thấy Gist đó.
   - Cứ 20 giây: tải bản trên Gist → gộp với dữ liệu máy này → nếu khác thì ghi lại.
   - Gộp theo TỪNG LỆNH (mã lệnh): lệnh có ở một bên thì giữ; có ở cả hai bên thì lệnh đã đóng thắng lệnh còn mở,
     còn lại lấy bản sửa sau cùng. Nhờ vậy máy này đặt lệnh A, máy kia cắt lệnh B thì vẫn giữ được cả hai.
   - Chiến lược: gộp từng phiên bản; kết quả thắng/thua của phiên bản gộp theo từng lệnh, không đếm trùng.
   - Chỉ MÁY CHÍNH được tự động đặt lệnh, tự học và gửi Telegram, để hai máy không làm trùng. Máy phụ xem, đặt tay, cắt, hủy lệnh. */
const Sync={
  FILE:'tin-hieu-sync.json',DESC:'Tín hiệu – dữ liệu đồng bộ (tự tạo, đừng xóa)',API:'https://api.github.com',
  busy:false,at:0,err:'',timer:null,
  H:Store.get('syncH',{o:{},l:{},c:0}), // dấu vân tay bản đã đồng bộ, để biết dữ liệu nào vừa sửa trên máy này
  token(){return Store.get('syncTok','')},
  on(){return!!this.token()},
  main(){return Store.get('syncMain',false)},
  hash(x){const s=JSON.stringify(x);let h=5381;for(let i=0;i<s.length;i++)h=(h*33+s.charCodeAt(i))|0;return h},
  async gh(path,opt={}){
    const r=await fetch(this.API+path,{...opt,cache:'no-store',headers:{Authorization:'Bearer '+this.token(),Accept:'application/vnd.github+json',...(opt.body?{'Content-Type':'application/json'}:{})}});
    if(r.status===401)throw new Error('Mã GitHub không đúng hoặc đã hết hạn.');
    if(r.status===403||r.status===429)throw new Error('GitHub tạm giới hạn (quá nhiều yêu cầu hoặc mã thiếu quyền "gist").');
    if(!r.ok){const e=new Error('GitHub báo lỗi '+r.status+'.');e.status=r.status;throw e}
    return r.json()},
  // Tìm Gist đồng bộ của bạn; chưa có thì tạo mới (máy tạo ra Gist được đặt làm máy chính)
  async gist(){
    let id=Store.get('syncGist','');if(id)return id;
    const list=await this.gh('/gists?per_page=100'),g=list.find(x=>x.files&&x.files[this.FILE]);
    if(g)id=g.id;
    else{const n=await this.gh('/gists',{method:'POST',body:JSON.stringify({description:this.DESC,public:false,files:{[this.FILE]:{content:JSON.stringify(this.pack())}}})});id=n.id;Store.set('syncMain',true)}
    Store.set('syncGist',id);return id},
  async pull(id){
    const g=await this.gh('/gists/'+id),f=g.files&&g.files[this.FILE];if(!f)return null;
    const txt=f.truncated?await(await fetch(f.raw_url,{cache:'no-store'})).text():f.content;
    try{return JSON.parse(txt)}catch(e){return null}},
  cfg(){const u=Store.get('ui',{});return{ui:{tf:u.tf,bal:u.bal,risk:u.risk,slots:u.slots,topk:u.topk,v:u.v},active:Strat.active,tp1:Store.get('tp1',1.5),tp2:Store.get('tp2','auto')}},
  // Đánh dấu giờ sửa (u) cho mọi thứ đã thay đổi trên máy này kể từ lần đồng bộ trước
  stamp(){
    const now=Date.now(),strip=x=>{const{u,...r}=x;return r};
    for(const o of Book.data.orders){const h=this.hash(strip(o));if(this.H.o[o.id]!==h){o.u=now;this.H.o[o.id]=h}}
    for(const v of Strat.list){const h=this.hash(strip(v));if(this.H.l[v.id]!==h){v.u=now;this.H.l[v.id]=h}}
    const c=this.hash(this.cfg());if(this.H.c!==c){Store.set('syncCfgU',now);this.H.c=c}},
  pack(){return{v:1,at:Date.now(),day:Book.data.day,wipe:Book.data.wipe||0,orders:Book.data.orders,
    lab:{list:Strat.list,dead:Store.get('labDead',[])},cfg:{u:Store.get('syncCfgU',0),...this.cfg()}}},
  // Chọn bản của một lệnh khi cả hai máy đều có
  pickOrder(a,b){
    const rank=o=>Book.isDone(o)?3:Book.isCancel(o)?2:o.st==='H'?1:0,ra=rank(a),rb=rank(b);
    if(ra!==rb&&(ra>=2||rb>=2))return ra>rb?a:b; // đã đóng / đã hủy luôn thắng bản còn mở
    if(a.st==='H'&&b.st==='F')return a;if(b.st==='H'&&a.st==='F')return b;
    return(b.u||0)>(a.u||0)?b:a},
  merge(R){
    let ch=false;const today=Fmt.day();
    // ---- Sổ lệnh ----
    const wipe=Math.max(Book.data.wipe||0,R.wipe||0);if(wipe>(Book.data.wipe||0)){Book.data.wipe=wipe;ch=true}
    const rem=(R.orders||[]).filter(o=>(R.day===today||Book.isOpen(o))&&(o.ts||0)>=wipe),map=new Map();
    for(const o of Book.data.orders)if((o.ts||0)>=wipe)map.set(o.id,o);else ch=true;
    for(const r of rem){const l=map.get(r.id);
      if(!l){map.set(r.id,r);ch=true;continue}
      const p=this.pickOrder(l,r);if(p!==l){map.set(r.id,p);ch=true}}
    if(ch)Book.data.orders=[...map.values()].sort((a,b)=>(a.ts||0)-(b.ts||0));
    for(const o of Book.data.orders)this.H.o[o.id]=this.hash((({u,...x})=>x)(o));
    // ---- Chiến lược và phiên bản (sửa tại chỗ để các tham chiếu đang dùng vẫn đúng) ----
    let labCh=false;const dead=[...new Set([...Store.get('labDead',[]),...((R.lab&&R.lab.dead)||[])])];Store.set('labDead',dead);
    const before=Strat.list.length;Strat.list=Strat.list.filter(v=>!dead.includes(v.id));if(Strat.list.length!==before)labCh=true;
    for(const r of((R.lab&&R.lab.list)||[])){
      if(dead.includes(r.id)||!Strat.impl[r.base])continue;const l=Strat.byId(r.id);
      if(!l){Strat.list.push(r);labCh=true;continue}
      const ra=Math.max(l.resetAt||0,r.resetAt||0);if(ra!==(l.resetAt||0)){l.resetAt=ra;labCh=true} // đã bấm Đặt lại đếm ở một máy
      const tr=new Map();for(const x of[...(l.track||[]),...(r.track||[])])if(!tr.has(x.k)&&(x.t||0)>ra)tr.set(x.k,x);
      const track=[...tr.values()].sort((a,b)=>a.t-b.t).slice(-300),mark=Math.max(l.mark||0,r.mark||0);
      if((r.u||0)>(l.u||0)){const{track:_,mark:__,...rest}=r;Object.assign(l,rest);labCh=true}
      if(track.length!==(l.track||[]).length||mark!==(l.mark||0)){l.track=track;l.mark=Math.min(mark,track.length);labCh=true}}
    for(const v of Strat.list)this.H.l[v.id]=this.hash((({u,...x})=>x)(v));
    // ---- Thiết lập chung (vốn, rủi ro, số lệnh, khung, chiến lược, TP) ----
    let cfgCh=false;const C=R.cfg;
    if(C&&(C.u||0)>Store.get('syncCfgU',0)){
      Store.set('ui',{...Store.get('ui',{}),...C.ui});if(C.tp1!=null)Store.set('tp1',C.tp1);if(C.tp2!=null)Store.set('tp2',C.tp2);
      if(C.active&&(C.active==='auto'||Strat.byId(C.active)))Strat.active=C.active;
      Store.set('syncCfgU',C.u);UI.load();Strat.applyTP();cfgCh=true}
    this.H.c=this.hash(this.cfg());
    return{ch,labCh,cfgCh}},
  async run(force){
    if(!this.on()||this.busy)return;this.busy=true;
    try{
      Book.roll();this.stamp();
      let id=await this.gist(),R;
      try{R=await this.pull(id)}catch(e){if(e.status!==404)throw e;Store.set('syncGist','');id=await this.gist();R=await this.pull(id)} // Gist đã bị xóa → tạo lại từ dữ liệu máy này
      const r=R?this.merge(R):{ch:false,labCh:false,cfgCh:false};
      if(r.ch||r.labCh)Book.save();if(r.labCh||r.cfgCh)Strat.save();
      // Ghi lên Gist khi dữ liệu sau khi gộp khác với bản đang có trên Gist
      const P=this.pack(),diff=!R||this.hash(R.orders)!==this.hash(P.orders)||this.hash(R.lab)!==this.hash(P.lab)||this.hash(R.cfg)!==this.hash(P.cfg)||R.wipe!==P.wipe;
      if(diff||force)await this.gh('/gists/'+id,{method:'PATCH',body:JSON.stringify({files:{[this.FILE]:{content:JSON.stringify(P)}}})});
      Store.set('syncH',this.H);this.at=Date.now();this.err='';
      if(r.ch){BookPage.render();Sig.render()}
      if(r.labCh||r.cfgCh){UI.fillStrat();Ana.fillStrats();Lab.render()}
      if(r.cfgCh)Sig.reload();}
    catch(e){this.err=/fetch/i.test(e.message)?'Không kết nối được GitHub. Kiểm tra mạng.':e.message}
    finally{this.busy=false;this.paint()}},
  // Xóa sạch: Sổ lệnh + phiên bản đã học + bộ đếm. Ghi dấu (wipe, labDead, resetAt) để các máy khác cũng xóa theo khi đồng bộ.
  wipeAll(){
    const now=Date.now();
    Book.data={day:Fmt.day(),orders:[],log:[],wipe:now};Book.prev=null;Book.save();
    Store.set('labDead',[...new Set([...Store.get('labDead',[]),...Strat.list.filter(v=>v.status!=='base').map(v=>v.id)])]);
    Strat.list=Strat.list.filter(v=>v.status==='base');for(const v of Strat.list){v.track=[];v.mark=0;v.resetAt=now;v.stats=null;v.log=[]}
    if(!Strat.isAuto()&&!Strat.byId(Strat.active))Strat.active='auto';
    AutoLab.queue=[];AutoLab.lines=[];Store.set('autolabLog',[]);Strat.save();
    BookPage.render();Sig.render();UI.fillStrat();Ana.fillStrats();Lab.render()},
  paint(){
    const el=$('synst');if(!el)return;
    if(!this.on()){el.innerHTML='Chưa bật đồng bộ. Mỗi thiết bị đang giữ dữ liệu riêng.';el.className='note';return}
    el.className='note '+(this.err?'dn':'up');
    el.innerHTML=this.err?`⚠ ${esc(this.err)}`:`Đã đồng bộ ${this.at?Fmt.hm(this.at):'…'}${Store.get('syncGist','')?` · <a href="https://gist.github.com/${esc(Store.get('syncGist',''))}" target="_blank" rel="noopener">mở file dữ liệu trên GitHub</a>`:''} · máy này là <b>${this.main()?'MÁY CHÍNH (tự đặt lệnh, tự học, gửi Telegram)':'máy phụ (xem, đặt tay, cắt, hủy lệnh)'}</b>.`},
  init(){
    $('syntok').value=this.token();$('synmain').checked=this.main();
    $('synsave').onclick=async()=>{const t=$('syntok').value.trim();if(!t){toast('Hãy dán mã GitHub.','dn');return}
      Store.set('syncTok',t);Store.set('syncGist','');toast('Đang kết nối GitHub…');while(this.busy)await sleep(200);await this.run(true);$('synmain').checked=this.main();
      if(!this.err)toast(this.main()?'Đã tạo nơi lưu đồng bộ. Máy này là <b>máy chính</b>. Dán cùng mã này trên thiết bị kia.':'Đã kết nối dữ liệu đồng bộ. Máy này là <b>máy phụ</b>.','up')};
    $('synwipe').onclick=async()=>{
      if(!confirm('Xóa toàn bộ dữ liệu trên MỌI máy: Sổ lệnh (cả lệnh đang mở), bộ đếm thắng/thua và các phiên bản đã học? Thiết lập vốn, rủi ro, TP và mã GitHub được giữ.'))return;
      while(this.busy)await sleep(200);this.wipeAll();await this.run(true);if(!this.err)toast('Đã xóa dữ liệu trên mọi máy. Bắt đầu lại từ đầu.','up')};
    $('synnow').onclick=async()=>{while(this.busy)await sleep(200);await this.run(true);if(!this.err)toast('Đã đồng bộ.','up')};
    $('synoff').onclick=()=>{if(!confirm('Tắt đồng bộ trên máy này? Dữ liệu trên máy và trên GitHub vẫn giữ nguyên.'))return;Store.set('syncTok','');Store.set('syncGist','');$('syntok').value='';this.paint()};
    $('synmain').addEventListener('change',()=>{Store.set('syncMain',$('synmain').checked);this.paint();
      toast($('synmain').checked?'Máy này là <b>máy chính</b>. Hãy bỏ chọn ở thiết bị kia để tránh đặt lệnh trùng.':'Máy này là máy phụ: không tự đặt lệnh, không tự học, không gửi Telegram.',$('synmain').checked?'up':'')});
    this.paint();this.run();clearInterval(this.timer);this.timer=setInterval(()=>this.run(),20000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.run()})}, // mở lại tab trên điện thoại → đồng bộ ngay
  // Máy phụ (khi đã bật đồng bộ) không tự đặt lệnh, không tự học, không gửi Telegram
  idle(){return this.on()&&!this.main()}
};
