/* Văn phòng 3D: dựng bằng Three.js (mã nguồn mở, tải từ CDN khi mở trang) và mô hình người 3D "X Bot" có khung xương chuyển động thật
   (mẫu mã nguồn mở trong bộ ví dụ của three.js, gốc từ Mixamo). Mỗi nhân viên dùng dữ liệu thật của bảng (Office.read):
     • Đang làm việc  → ngồi ghế, gõ phím; màn hình trên bàn hiện đúng việc đang làm
     • Có tin vui     → đứng dậy gật gù ăn mừng      • Cần chú ý → đứng lắc đầu
     • Không có việc  → rời bàn đi pha cà phê, lấy nước, ngồi sofa, ngắm phố rồi quay lại
     • Bưu tá Tèo     → mỗi khi có thông báo mới thì cầm phong bì đi tới bàn người phụ trách
   Màn hình lớn trên tường, đồng hồ, cửa sổ ngày/đêm đều chạy theo giờ và số liệu thật. Không tải được 3D thì tự quay về văn phòng 2D. */
const Office3D={
  V:'0.160.0',
  SRC:[
    {three:v=>`https://cdn.jsdelivr.net/npm/three@${v}/+esm`,add:(v,p)=>`https://cdn.jsdelivr.net/npm/three@${v}/examples/jsm/${p}/+esm`},
    {three:v=>`https://esm.sh/three@${v}`,add:(v,p)=>`https://esm.sh/three@${v}/examples/jsm/${p}`}],
  MODEL:['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Xbot.glb','https://threejs.org/examples/models/gltf/Xbot.glb'],
  T:null,el:null,ready:false,running:false,raf:0,people:{},screens:[],tick2:0,
  // Tư thế ngồi/gõ phím: độ xoay (độ) cộng thêm vào khung xương mỗi khung hình
  POSE:{sit:{up:[-88,0,0],leg:[95,0,0],spine:[6,0,0],y:-0.47,fwd:0.06},
    type:{armL:[0,0,62],armR:[0,0,-62],foreL:[0,-55,22],foreR:[0,55,-22],handL:[0,0,0],handR:[0,0,0],sh:[18,0,0]},
    rest:{armL:[0,0,30],armR:[0,0,-30],foreL:[0,-70,0],foreR:[0,70,0]}},
  // ---------- Tải thư viện ----------
  async lib(){
    if(this.T)return this.T;let err;
    for(const s of this.SRC){try{
      const THREE=await import(s.three(this.V));
      const[{OrbitControls},{GLTFLoader},SK]=await Promise.all([import(s.add(this.V,'controls/OrbitControls.js')),import(s.add(this.V,'loaders/GLTFLoader.js')),import(s.add(this.V,'utils/SkeletonUtils.js'))]);
      return this.T={THREE,OrbitControls,GLTFLoader,SK}}catch(e){err=e}}
    throw err||new Error('Không tải được Three.js')},
  async model(){
    const{GLTFLoader}=this.T;let err;
    for(const u of this.MODEL){try{return await new Promise((res,rej)=>new GLTFLoader().load(u,res,undefined,rej))}catch(e){err=e}}
    throw err},
  webgl(){try{const c=document.createElement('canvas');return!!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')))}catch(e){return false}},
  // ---------- Khởi tạo ----------
  async mount(el){
    if(this.ready&&this.el===el){this.start();return true}
    this.el=el;el.innerHTML=`<div class="o3-load"><span class="spin"></span><b>Đang dựng văn phòng 3D…</b><small id="o3msg">Tải thư viện Three.js</small></div>`;
    if(!this.webgl())throw new Error('Trình duyệt không hỗ trợ WebGL');
    await this.lib();$('o3msg')&&($('o3msg').textContent='Tải mô hình nhân viên 3D (~3 MB, chỉ lần đầu)');
    const gltf=await this.model();
    this.build(el,gltf);this.ready=true;this.start();return true},
  build(el,gltf){
    const{THREE,OrbitControls}=this.T,mob=matchMedia('(max-width:760px)').matches;
    el.innerHTML=`<div class="o3-cv"></div><div class="o3-tags"></div>
      <div class="o3-bar"><div class="seg" id="o3cam">${[['all','Toàn cảnh'],['ana','Phân tích'],['desk','Sàn lệnh'],['lab','Tự học'],['comm','Liên lạc'],['rest','Nghỉ ngơi']].map(([k,t],i)=>`<button data-cam="${k}" class="${i?'':'on'}">${t}</button>`).join('')}</div>
      <label class="sw"><input type="checkbox" id="o3say" checked><span></span>Lời nói</label></div>
      <div class="o3-help">Kéo để xoay · cuộn / chụm 2 ngón để phóng to · chạm vào nhân viên để xem chi tiết</div>`;
    const cv=el.querySelector('.o3-cv'),R=new THREE.WebGLRenderer({antialias:!mob,powerPreference:'high-performance'});
    R.setPixelRatio(Math.min(devicePixelRatio||1,mob?1.5:2));R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
    R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=1.05;cv.appendChild(R.domElement);
    const S=new THREE.Scene();S.background=new THREE.Color('#0d1626');S.fog=new THREE.Fog('#0d1626',28,60);
    const cam=new THREE.PerspectiveCamera(42,1,0.1,120);cam.position.set(2,13,17);
    const ctl=new OrbitControls(cam,R.domElement);ctl.target.set(0,0.8,-0.5);ctl.enableDamping=true;ctl.maxPolarAngle=Math.PI*0.47;ctl.minDistance=3;ctl.maxDistance=34;ctl.update();
    Object.assign(this,{R,S,cam,ctl,cv,mob,clock:new THREE.Clock(),tags:el.querySelector('.o3-tags')});
    this.lights();this.room();this.furniture();this.staff(gltf);
    const rs=()=>{const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};
    this.ro=new ResizeObserver(rs);this.ro.observe(cv);rs();
    // Chọn nhân viên
    const ray=new THREE.Raycaster(),m=new THREE.Vector2(),hit=e=>{const r=R.domElement.getBoundingClientRect();m.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(m,cam);
      const h=ray.intersectObjects(Object.values(this.people).map(p=>p.hit),false)[0];return h&&h.object.userData.id};
    let down=null;R.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
    R.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const id=hit(e);if(id){this.focus(id);Office.detail(id)}});
    R.domElement.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const id=hit(e);this.hover=id;R.domElement.style.cursor=id?'pointer':''});
    el.querySelector('#o3cam').onclick=e=>{const b=e.target.closest('[data-cam]');if(!b)return;el.querySelectorAll('#o3cam button').forEach(x=>x.classList.toggle('on',x===b));this.view(b.dataset.cam)};
    el.querySelector('#o3say').onchange=e=>this.tags.classList.toggle('nosay',!e.target.checked);
    this.tags.addEventListener('click',e=>{const t=e.target.closest('[data-tag]');if(t){this.focus(t.dataset.tag);Office.detail(t.dataset.tag)}})},
  // ---------- Hình khối tiện dụng ----------
  mat(c,o={}){const{THREE}=this.T;return new THREE.MeshStandardMaterial({color:c,roughness:o.r!=null?o.r:0.75,metalness:o.m||0,emissive:o.e||'#000',emissiveIntensity:o.ei||1,transparent:o.op!=null,opacity:o.op!=null?o.op:1,map:o.map||null})},
  box(w,h,d,c,x,y,z,o={},par){const{THREE}=this.T,b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),c.isMaterial?c:this.mat(c,o));b.position.set(x,y,z);b.castShadow=o.cs!==false;b.receiveShadow=true;if(o.ry)b.rotation.y=o.ry;(par||this.S).add(b);return b},
  cyl(rt,rb,h,c,x,y,z,o={},par){const{THREE}=this.T,b=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,o.seg||20),c.isMaterial?c:this.mat(c,o));b.position.set(x,y,z);b.castShadow=o.cs!==false;b.receiveShadow=true;(par||this.S).add(b);return b},
  sph(r,c,x,y,z,o={},par){const{THREE}=this.T,b=new THREE.Mesh(new THREE.SphereGeometry(r,o.seg||16,o.seg||12),c.isMaterial?c:this.mat(c,o));b.position.set(x,y,z);b.castShadow=o.cs!==false;(par||this.S).add(b);return b},
  canvas(w,h,draw){const{THREE}=this.T,c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;const g=c.getContext('2d');const o={c,g,t,draw,redraw(){draw(g,w,h);t.needsUpdate=true}};o.redraw();return o},
  plane(w,h,tex,x,y,z,ry=0,em=1,par){const{THREE}=this.T,m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:em,roughness:0.6}));m.position.set(x,y,z);m.rotation.y=ry;(par||this.S).add(m);return m},
  // ---------- Ánh sáng ----------
  lights(){
    const{THREE}=this.T,S=this.S;
    this.hemi=new THREE.HemisphereLight('#dfe8ff','#3b2f25',0.75);S.add(this.hemi);
    const d=this.sun=new THREE.DirectionalLight('#fff3dc',1.5);d.position.set(-16,14,6);d.castShadow=true;d.shadow.mapSize.set(this.mob?1024:2048,this.mob?1024:2048);
    Object.assign(d.shadow.camera,{left:-16,right:16,top:12,bottom:-12,near:1,far:50});d.shadow.bias=-0.0004;S.add(d);
    this.lamps=[];for(const[x,z]of[[-7,-4],[3,-4],[-7,0.5],[-2,0.5],[6,0.5],[-8,5.5],[9,5]]){const p=new THREE.PointLight('#ffe2b0',4,9,2);p.position.set(x,2.9,z);S.add(p);this.lamps.push(p);
      this.cyl(0.32,0.22,0.16,this.mat('#1f2937',{r:0.4,m:0.6}),x,3.05,z,{cs:false});this.cyl(0.24,0.24,0.02,this.mat('#fff7e0',{e:'#ffe2b0',ei:2}),x,2.96,z,{cs:false});this.cyl(0.01,0.01,0.6,'#111',x,3.4,z,{cs:false})}},
  // ---------- Phòng: sàn gỗ, tường, cửa sổ, tranh, đồng hồ, màn hình lớn ----------
  room(){
    const{THREE}=this.T,S=this.S,W=24,D=16;
    const wood=this.canvas(1024,1024,(g,w,h)=>{const pl=8,ph=h/pl;for(let i=0;i<pl;i++){for(let k=-1;k<4;k++){const off=(i%2)*w/8+k*w/3;const l=34+((i*7+k*13)%9);g.fillStyle=`hsl(28,38%,${l}%)`;g.fillRect(off,i*ph,w/3,ph);
        for(let s=0;s<14;s++){g.strokeStyle=`rgba(60,30,10,${0.05+((s*7+i)%5)/60})`;g.beginPath();const y=i*ph+((s*37)%ph);g.moveTo(off,y);g.bezierCurveTo(off+w/9,y+4,off+w/5,y-4,off+w/3,y+2);g.stroke()}
        g.fillStyle='rgba(0,0,0,.35)';g.fillRect(off,i*ph,2,ph)}g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,i*ph,w,2)}});
    wood.t.wrapS=wood.t.wrapT=THREE.RepeatWrapping;wood.t.repeat.set(4,3);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D),this.mat('#ffffff',{map:wood.t,r:0.55}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;S.add(fl);
    // thảm dưới các cụm bàn
    for(const[x,z,w,d,c]of[[-6.5,-3.9,8,3.2,'#1e3a5f'],[3,-3.9,7.5,3.2,'#14532d'],[-6.2,0.9,7.5,3.2,'#3f2d5c'],[5.8,0.9,7.5,3.2,'#5b1f3a'],[-7.6,5.6,6.5,4.2,'#6b4f3a']]){
      const r=new THREE.Mesh(new THREE.PlaneGeometry(w,d),this.mat(c,{r:0.95}));r.rotation.x=-Math.PI/2;r.position.set(x,0.005,z);r.receiveShadow=true;S.add(r)}
    const wall=this.mat('#d9dee6',{r:0.9}),H=3.4;
    this.box(W,H,0.2,wall,0,H/2,-D/2,{cs:false});this.box(0.2,H,D,wall,-W/2,H/2,0,{cs:false});this.box(0.2,H,D,wall,W/2,H/2,0,{cs:false});
    this.box(W,0.12,0.04,'#8b6b4a',0,0.06,-D/2+0.12);this.box(0.04,0.12,D,'#8b6b4a',-W/2+0.12,0.06,0);this.box(0.04,0.12,D,'#8b6b4a',W/2-0.12,0.06,0);
    // cửa sổ kính nhìn ra thành phố (tường trái), đổi ngày/đêm theo giờ thật
    this.sky=this.canvas(1024,512,(g,w,h)=>{const hr=new Date().getHours()+new Date().getMinutes()/60,night=hr<5.5||hr>=18.5,dusk=(hr>=16.5&&hr<18.5)||(hr>=5.5&&hr<7);
      const gr=g.createLinearGradient(0,0,0,h);if(night){gr.addColorStop(0,'#050a1f');gr.addColorStop(1,'#1c2a5a')}else if(dusk){gr.addColorStop(0,'#5b3a8f');gr.addColorStop(0.6,'#f59e6b');gr.addColorStop(1,'#fde3a7')}else{gr.addColorStop(0,'#4aa8e8');gr.addColorStop(1,'#cfeeff')}
      g.fillStyle=gr;g.fillRect(0,0,w,h);if(night)for(let i=0;i<90;i++){g.fillStyle=`rgba(255,255,255,${(i*37%10)/12})`;g.fillRect((i*211)%w,(i*97)%(h*0.5),2,2)}
      else{g.fillStyle='rgba(255,255,255,.85)';for(const[x,y,s]of[[180,90,1],[620,60,1.3],[860,140,.8]]){g.beginPath();g.ellipse(x,y,70*s,22*s,0,0,7);g.ellipse(x+50*s,y-14*s,50*s,20*s,0,0,7);g.fill()}}
      let x=0,k=0;while(x<w){const bw=50+(k*53%70),bh=h*(0.25+(k*37%45)/100);g.fillStyle=night?'#0b1222':dusk?'#3b2b4a':'#5a6b80';g.fillRect(x,h-bh,bw,bh);
        for(let wy=h-bh+10;wy<h-8;wy+=16)for(let wx=x+6;wx<x+bw-8;wx+=12){const on=night?((wx*7+wy*3+k)%5<2):((wx+wy+k)%9===0);if(on){g.fillStyle=night?'#ffd780':'#c6dbef';g.fillRect(wx,wy,6,8)}}
        x+=bw+4;k++}});
    for(const z of[-4.4,0,4.4]){this.plane(3.6,2,this.sky.t,-W/2+0.12,1.85,z,Math.PI/2,0.9);
      this.box(0.12,0.1,3.8,'#374151',-W/2+0.16,0.8,z);this.box(0.12,0.1,3.8,'#374151',-W/2+0.16,2.9,z);this.box(0.12,2.2,0.1,'#374151',-W/2+0.16,1.85,z-1.85);this.box(0.12,2.2,0.1,'#374151',-W/2+0.16,1.85,z+1.85);this.box(0.06,2.1,0.05,'#374151',-W/2+0.15,1.85,z)}
    // màn hình lớn (video wall) trên tường sau
    this.wallScr=this.canvas(1280,480,(g,w,h)=>this.drawWall(g,w,h));
    this.box(7.4,2.75,0.12,'#0b0f17',1.5,1.95,-D/2+0.16,{r:0.3});this.plane(7.2,2.6,this.wallScr.t,1.5,1.95,-D/2+0.23,0,1.25);
    // đồng hồ treo tường
    this.clockC=this.canvas(256,256,(g,w,h)=>{const d=new Date(),c=w/2;g.clearRect(0,0,w,h);g.fillStyle='#f8fafc';g.beginPath();g.arc(c,c,c-6,0,7);g.fill();g.lineWidth=10;g.strokeStyle='#1f2937';g.stroke();
      g.fillStyle='#1f2937';for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.fillRect(c+Math.sin(a)*(c-30)-3,c-Math.cos(a)*(c-30)-8,6,16)}
      const hand=(a,l,wd,col)=>{g.strokeStyle=col;g.lineWidth=wd;g.lineCap='round';g.beginPath();g.moveTo(c,c);g.lineTo(c+Math.sin(a)*l,c-Math.cos(a)*l);g.stroke()};
      hand((d.getHours()%12+d.getMinutes()/60)/12*Math.PI*2,60,10,'#111827');hand((d.getMinutes()+d.getSeconds()/60)/60*Math.PI*2,92,7,'#111827');hand(d.getSeconds()/60*Math.PI*2,100,3,'#ef4444')});
    const ck=new THREE.Mesh(new THREE.CircleGeometry(0.42,40),new THREE.MeshStandardMaterial({map:this.clockC.t,transparent:true,roughness:0.4}));ck.position.set(-4.2,2.5,-D/2+0.12);S.add(ck);
    // biển tên công ty phát sáng
    const logo=this.canvas(1024,192,(g,w,h)=>{g.clearRect(0,0,w,h);g.font='800 110px system-ui,sans-serif';g.textBaseline='middle';const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#38d6b4');gr.addColorStop(1,'#f0d68a');g.fillStyle=gr;g.shadowColor='#38d6b4';g.shadowBlur=24;g.fillText('TÍN HIỆU',30,h/2);g.font='600 46px system-ui';g.fillStyle='#e5e7eb';g.shadowBlur=0;g.fillText('TRADING DESK',640,h/2+8)});
    const lg=new THREE.Mesh(new THREE.PlaneGeometry(4.4,0.82),new THREE.MeshStandardMaterial({map:logo.t,transparent:true,emissive:'#fff',emissiveMap:logo.t,emissiveIntensity:1.4}));lg.position.set(8.4,2.55,-D/2+0.12);S.add(lg);
    // bảng trắng kế hoạch giao dịch
    const wb=this.canvas(768,448,(g,w,h)=>{g.fillStyle='#fbfdff';g.fillRect(0,0,w,h);g.strokeStyle='#cbd5e1';g.lineWidth=10;g.strokeRect(0,0,w,h);g.font='700 38px system-ui';g.fillStyle='#1d4ed8';g.fillText('KẾ HOẠCH GIAO DỊCH',30,62);
      g.font='500 28px system-ui';g.fillStyle='#0f172a';const tp=typeof Strat!=='undefined'?Strat.TP():{t1:1.5,t2:'auto'};
      ['• Rủi ro mỗi lệnh: '+(typeof UI!=='undefined'?UI.risk():5)+'% vốn',`• TP1 ${tp.t1}R: chốt 50%, SL về entry`,`• TP2 ${tp.t2==='auto'?'3–4R':tp.t2+'R'}`,'• Không đuổi giá · không quá vốn'].forEach((t,i)=>g.fillText(t,34,120+i*48));
      g.strokeStyle='#16a34a';g.lineWidth=5;g.beginPath();[[480,380],[530,330],[570,350],[620,270],[660,290],[720,190]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();
      g.strokeStyle='#dc2626';g.setLineDash([10,8]);g.beginPath();g.moveTo(470,400);g.lineTo(740,400);g.stroke();g.setLineDash([])});
    this.box(3.3,1.95,0.06,'#94a3b8',-8.2,1.75,-D/2+0.14);this.plane(3.2,1.86,wb.t,-8.2,1.75,-D/2+0.18,0,0.35);this.box(3.2,0.06,0.16,'#94a3b8',-8.2,0.75,-D/2+0.2);
    // tranh treo tường
    const art=this.canvas(400,300,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#f97316');gr.addColorStop(1,'#7c3aed');g.fillStyle=gr;g.fillRect(0,0,w,h);g.fillStyle='rgba(255,255,255,.85)';g.beginPath();g.arc(w*0.7,h*0.35,46,0,7);g.fill();g.fillStyle='#1e1b4b';g.beginPath();g.moveTo(0,h);g.lineTo(w*0.35,h*0.45);g.lineTo(w*0.6,h*0.75);g.lineTo(w*0.8,h*0.55);g.lineTo(w,h);g.fill()});
    this.box(1.7,1.3,0.05,'#3f2a1c',W/2-0.14,2,-5.5,{ry:Math.PI/2});this.plane(1.56,1.16,art.t,W/2-0.18,2,-5.5,-Math.PI/2,0.25);
    // cửa ra vào + biển EXIT
    this.box(0.1,2.3,1.4,'#6b4423',W/2-0.12,1.15,6.2,{r:0.5});this.sph(0.05,'#d4af37',W/2-0.2,1.1,5.7,{m:1,r:0.3});
    const ex=this.canvas(256,96,(g,w,h)=>{g.fillStyle='#16a34a';g.fillRect(0,0,w,h);g.font='800 60px system-ui';g.fillStyle='#fff';g.fillText('EXIT',60,70)});this.plane(0.6,0.22,ex.t,W/2-0.13,2.55,6.2,-Math.PI/2,1.5)},
  // Nội dung màn hình lớn: giá BTC/ETH, lãi/lỗ, lệnh mở, tin mới (số liệu thật)
  drawWall(g,w,h){
    const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#081120');bg.addColorStop(1,'#0f1f38');g.fillStyle=bg;g.fillRect(0,0,w,h);
    g.strokeStyle='rgba(56,214,180,.08)';for(let x=0;x<w;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}
    g.font='700 34px system-ui';g.fillStyle='#38d6b4';g.fillText('SÀN GIAO DỊCH TÍN HIỆU · LIVE',36,56);
    g.font='500 26px system-ui';g.fillStyle='#94a3b8';g.textAlign='right';g.fillText(new Date().toLocaleTimeString('vi-VN'),w-36,56);g.textAlign='left';
    let px={},S={net:0,w:0,l:0},open=0,news='';try{px=Data.px;S=Book.stats(Book.data.orders);open=Book.data.orders.filter(Book.isOpen).length;news=(News.items[0]||{}).title||''}catch(e){}
    const tile=(x,lab,val,col)=>{g.fillStyle='rgba(255,255,255,.05)';g.fillRect(x,90,286,150);g.font='600 24px system-ui';g.fillStyle='#94a3b8';g.fillText(lab,x+20,128);g.font='800 52px system-ui';g.fillStyle=col;g.fillText(val,x+20,205)};
    tile(36,'BTC',px.BTCUSDT?Fmt.px(px.BTCUSDT):'…','#f8fafc');tile(342,'ETH',px.ETHUSDT?Fmt.px(px.ETHUSDT):'…','#f8fafc');
    tile(648,'Lãi/lỗ hôm nay',Fmt.sgn(S.net||0),(S.net||0)>=0?'#38d6b4':'#ff7b6b');tile(954,'Lệnh mở',String(open),'#f0d68a');
    g.font='600 26px system-ui';g.fillStyle='#e5e7eb';g.fillText(`Thắng ${S.w||0} · Thua ${S.l||0}`,36,292);
    // dải sóng giá minh họa theo thời gian
    g.strokeStyle='#38bdf8';g.lineWidth=4;g.beginPath();const t=Date.now()/4000;for(let x=0;x<=w-72;x+=12){const y=360+Math.sin(x/90+t)*26+Math.sin(x/31+t*1.7)*9;x?g.lineTo(36+x,y):g.moveTo(36,y)}g.stroke();
    g.fillStyle='rgba(240,214,138,.12)';g.fillRect(0,h-64,w,64);g.font='600 26px system-ui';g.fillStyle='#f0d68a';g.fillText('📰 '+(news?news.slice(0,90):'Đang cập nhật tin tức…'),36,h-22)},
  // ---------- Nội thất ----------
  desk(x,z,id,opt={}){
    const S=this.S,top='#a07650',leg='#2b3240';
    this.box(1.6,0.06,0.8,this.mat(top,{r:0.45}),x,0.75,z);for(const dx of[-0.74,0.74])this.box(0.05,0.72,0.7,leg,x+dx,0.37,z,{m:0.6,r:0.4});
    this.box(1.5,0.4,0.03,'#d1d5db',x,0.98,z-0.42,{cs:false}); // vách ngăn
    // màn hình hiển thị đúng việc của nhân viên (cập nhật 2 giây/lần)
    const sc=this.canvas(512,320,(g,w,h)=>this.drawScreen(g,w,h,id));this.screens.push(sc);
    this.box(0.9,0.55,0.04,'#0b0f17',x,1.12,z-0.2,{r:0.3});this.plane(0.86,0.51,sc.t,x,1.12,z-0.178,0,1.1);
    this.box(0.06,0.3,0.06,'#111827',x,0.9,z-0.24);this.box(0.3,0.02,0.2,'#111827',x,0.79,z-0.24);
    if(opt.dual){const s2=this.canvas(512,320,(g,w,h)=>this.drawChart(g,w,h,id));this.screens.push(s2);const b=this.box(0.8,0.5,0.04,'#0b0f17',x+0.78,1.1,z-0.1,{r:0.3});b.rotation.y=-0.45;const p=this.plane(0.76,0.46,s2.t,x+0.77,1.1,z-0.075,-0.45,1.1)}
    this.box(0.5,0.02,0.16,'#1f2937',x-0.05,0.79,z+0.08);this.box(0.08,0.02,0.12,'#1f2937',x+0.36,0.79,z+0.1); // bàn phím, chuột
    this.cyl(0.045,0.04,0.1,this.mat(['#ef4444','#f8fafc','#38d6b4','#f59e0b'][Math.abs(x*7|0)%4]),x-0.6,0.83,z+0.05); // cốc cà phê
    this.box(0.24,0.015,0.32,'#f8fafc',x+0.55,0.785,z+0.12,{ry:0.3});
    this.chair(x,z+0.72,Math.PI)},
  chair(x,z,ry){
    const{THREE}=this.T,g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;this.S.add(g);
    const blk=this.mat('#1f2937',{r:0.5});this.box(0.52,0.08,0.5,blk,0,0.48,0,{},g);this.box(0.5,0.6,0.07,blk,0,0.85,-0.24,{},g);
    this.cyl(0.03,0.03,0.38,'#9ca3af',0,0.27,0,{m:0.8,r:0.3},g);for(let i=0;i<5;i++){const a=i/5*Math.PI*2,b=this.box(0.3,0.03,0.05,'#4b5563',Math.sin(a)*0.15,0.06,Math.cos(a)*0.15,{},g);b.rotation.y=a+Math.PI/2}
    return g},
  plant(x,z,s=1){const p=this.cyl(0.22*s,0.16*s,0.4*s,'#f3f4f6',x,0.2*s,z,{r:0.6});for(let i=0;i<7;i++){const a=i*0.9,r=0.18*s;this.sph((0.2+0.06*(i%3))*s,['#15803d','#16a34a','#22c55e'][i%3],x+Math.sin(a)*r,(0.62+0.12*(i%4))*s,z+Math.cos(a)*r,{seg:10})}},
  furniture(){
    const S=this.S,D={};
    // Phòng Phân tích (hàng sau, trái) và Sàn Lệnh (hàng sau, phải)
    D.rsi2=[-9,-4];D.smc=[-6.5,-4];D.btc100=[-4,-4];D.trader=[1,-4];D.risk=[3.5,-4];D.acc=[6,-4];
    // Radar, Tự học, Liên lạc (hàng giữa)
    D.radar=[-9,0.5];D.lab=[-4.3,0.5];D.calib=[-1.8,0.5];D.news=[3.6,0.5];D.post=[6.1,0.5];D.sync=[8.6,0.5];
    for(const[id,[x,z]]of Object.entries(D))this.desk(x,z,id,{dual:['rsi2','smc','btc100','trader','acc'].includes(id)});
    this.seats=Object.fromEntries(Object.entries(D).map(([id,[x,z]])=>[id,{x,z:z+0.72,ry:Math.PI}]));
    // Bàn bảo vệ cạnh cửa
    this.box(1.4,1.05,0.6,'#334155',9.6,0.52,5.4,{r:0.5});this.box(1.5,0.05,0.7,'#94a3b8',9.6,1.07,5.4,{m:0.4,r:0.3});
    const gs=this.canvas(512,320,(g,w,h)=>this.drawScreen(g,w,h,'guard'));this.screens.push(gs);this.box(0.6,0.4,0.04,'#0b0f17',9.6,1.32,5.25);this.plane(0.56,0.36,gs.t,9.6,1.32,5.272,0,1.1);
    this.chair(9.6,6.1,Math.PI);this.seats.guard={x:9.6,z:6.1,ry:Math.PI};
    for(const z of[3.6,4.2])this.box(0.08,1,0.08,'#9ca3af',10.9,0.5,z,{m:0.8,r:0.3}); // cổng xoay
    // Radar: mái vòm hiển thị
    const rd=this.canvas(512,512,(g,w,h)=>{const c=w/2,a=Date.now()/600;g.fillStyle='#03140d';g.fillRect(0,0,w,h);g.strokeStyle='rgba(34,197,94,.5)';g.lineWidth=2;for(let r=50;r<c;r+=55){g.beginPath();g.arc(c,c,r,0,7);g.stroke()}
      g.beginPath();g.moveTo(c,0);g.lineTo(c,h);g.moveTo(0,c);g.lineTo(w,c);g.stroke();const gr=g.createConicGradient?g.createConicGradient(a,c,c):null;if(gr){gr.addColorStop(0,'rgba(34,197,94,.75)');gr.addColorStop(0.12,'rgba(34,197,94,0)');g.fillStyle=gr;g.beginPath();g.arc(c,c,c-6,0,7);g.fill()}
      let fo=[];try{fo=Sig.focus}catch(e){}fo.slice(0,10).forEach((s,i)=>{const an=i*2.4,r=60+(i*41)%170;g.fillStyle='#86efac';g.beginPath();g.arc(c+Math.cos(an)*r,c+Math.sin(an)*r,7,0,7);g.fill();g.font='600 22px system-ui';g.fillText(s.replace('USDT',''),c+Math.cos(an)*r+10,c+Math.sin(an)*r-8)})});
    this.radarC=rd;const rm=new this.T.THREE.Mesh(new this.T.THREE.CircleGeometry(0.62,48),new this.T.THREE.MeshStandardMaterial({map:rd.t,emissive:'#fff',emissiveMap:rd.t,emissiveIntensity:1}));rm.position.set(-10.8,1.9,0.5);rm.rotation.y=Math.PI/2;S.add(rm);
    this.cyl(0.68,0.68,0.06,'#1f2937',-10.84,1.9,0.5,{}).rotation.z=Math.PI/2;
    // Phòng Tự học: bàn thí nghiệm + bình hóa chất
    this.box(2.2,0.9,0.7,'#e5e7eb',-3,0.45,3,{r:0.4});this.box(2.3,0.05,0.8,'#111827',-3,0.92,3,{r:0.3});
    for(let i=0;i<5;i++){const c=['#38bdf8','#a78bfa','#f472b6','#22c55e','#f59e0b'][i];this.cyl(0.06,0.11,0.24,this.mat(c,{op:0.65,r:0.1,e:c,ei:0.4}),-3.8+i*0.4,1.07,3,{cs:false});this.cyl(0.03,0.03,0.12,this.mat('#e5e7eb',{op:0.5}),-3.8+i*0.4,1.24,3,{cs:false})}
    // Phòng Liên lạc: tủ máy chủ có đèn nhấp nháy, tủ thư
    this.box(0.9,2.1,0.8,'#111827',10.9,1.05,0.4,{r:0.3,m:0.4});this.leds=[];for(let r=0;r<10;r++)for(let k=0;k<4;k++){const b=this.box(0.05,0.03,0.02,this.mat('#22c55e',{e:'#22c55e',ei:2}),10.6+k*0.12,0.3+r*0.18,0.81,{cs:false});this.leds.push(b)}
    this.box(1.2,1.4,0.4,'#7c5a3a',10.9,0.7,-1.6,{ry:Math.PI/2});for(let r=0;r<3;r++)for(let k=0;k<3;k++)this.box(0.02,0.3,0.32,'#5c3c27',10.69,0.25+r*0.45,-1.95+k*0.35,{cs:false});
    // Góc nghỉ ngơi: quầy cà phê, máy pha, bình nước, tủ lạnh, sofa, bàn trà, thảm
    this.box(3.4,0.9,0.7,'#f3f4f6',-10.6,0.45,3.2,{ry:Math.PI/2});this.box(3.5,0.05,0.8,'#374151',-10.6,0.92,3.2,{ry:Math.PI/2,r:0.3});
    this.box(0.4,0.5,0.4,'#111827',-10.75,1.2,2.4,{r:0.3,m:0.3});this.box(0.3,0.06,0.2,'#9ca3af',-10.55,1.05,2.4,{m:0.8});this.box(0.04,0.04,0.04,this.mat('#ef4444',{e:'#ef4444',ei:3}),-10.54,1.36,2.3,{cs:false});
    this.cyl(0.05,0.045,0.1,'#f8fafc',-10.5,1.0,2.9);this.cyl(0.05,0.045,0.1,'#f8fafc',-10.5,1.0,3.1);
    this.box(0.4,1.0,0.4,'#e5e7eb',-11.4,0.5,5.1);this.cyl(0.18,0.18,0.45,this.mat('#7dd3fc',{op:0.6,r:0.1}),-11.4,1.23,5.1,{cs:false});
    this.box(0.8,1.9,0.7,'#d1d5db',-11.3,0.95,6.6,{m:0.3,r:0.3});this.box(0.04,0.5,0.04,'#6b7280',-10.88,1.2,6.4,{m:0.8});
    const sofa=this.mat('#2563eb',{r:0.85});this.box(2.6,0.42,0.95,sofa,-7.6,0.25,7.1);this.box(2.6,0.6,0.25,sofa,-7.6,0.68,7.5);this.box(0.25,0.62,0.95,sofa,-8.85,0.45,7.1);this.box(0.25,0.62,0.95,sofa,-6.35,0.45,7.1);
    for(const dx of[-0.65,0.65])this.box(1.15,0.12,0.8,this.mat('#3b82f6',{r:0.9}),-7.6+dx,0.52,7.05);
    this.box(1.3,0.06,0.7,'#a07650',-7.6,0.42,5.7,{r:0.4});for(const[dx,dz]of[[-0.55,-0.28],[0.55,-0.28],[-0.55,0.28],[0.55,0.28]])this.box(0.05,0.4,0.05,'#2b3240',-7.6+dx,0.2,5.7+dz);
    this.cyl(0.04,0.035,0.09,'#f8fafc',-7.3,0.5,5.6);this.box(0.3,0.02,0.22,'#ef4444',-7.9,0.46,5.75,{ry:0.4});
    // Kệ sách tường phải
    this.box(0.4,2.4,2.6,'#7c5a3a',11.75,1.2,-4.5);for(let r=0;r<4;r++){this.box(0.36,0.04,2.5,'#5c3c27',11.72,0.35+r*0.55,-4.5);
      let z=-5.7;while(z<-3.3){const bw=0.06+((z*100|0)%5)*0.015,bh=0.32+((z*73|0)%4)*0.04;this.box(0.28,bh,bw,['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6','#f8fafc'][Math.abs(z*37|0)%6],11.7,0.37+r*0.55+bh/2,z+bw/2,{cs:false});z+=bw+0.01}}
    // Cây xanh, thùng rác, máy in
    for(const[x,z,s]of[[-11.3,-7.3,1.2],[-0.2,-7.3,1],[11.3,-7.3,1.1],[-11.3,1.3,0.9],[11.3,2.6,1],[-5.4,7.3,1],[-1.2,-1.7,0.8],[7.5,3.5,0.9]])this.plant(x,z,s);
    this.box(0.6,0.4,0.5,'#e5e7eb',-0.2,0.85,-2.2);this.box(0.7,0.65,0.6,'#9ca3af',-0.2,0.32,-2.2);this.box(0.4,0.02,0.3,'#f8fafc',-0.2,1.06,-2.2);
    for(const[x,z]of[[-2.8,-2.6],[7.8,-2.6],[2,2.2]])this.cyl(0.16,0.13,0.4,'#4b5563',x,0.2,z);
    // Điểm nghỉ ngơi nhân viên rảnh hay ghé (vị trí đứng / ngồi, hướng nhìn)
    this.spots=[{x:-10,z:2.4,ry:-Math.PI/2,k:'coffee',say:'☕ Pha cà phê'},{x:-10.8,z:5.1,ry:-Math.PI/2,k:'water',say:'💧 Lấy nước'},{x:-8.1,z:7,ry:Math.PI,k:'sofa',say:'🛋️ Nghỉ một chút',sit:true},{x:-7.1,z:7,ry:Math.PI,k:'sofa2',say:'🛋️ Nghỉ một chút',sit:true},
      {x:-11,z:-1.8,ry:-Math.PI/2,k:'window',say:'🏙️ Ngắm phố'},{x:-8.2,z:-6.9,ry:Math.PI,k:'board',say:'📝 Xem kế hoạch'},{x:1.5,z:-6.4,ry:Math.PI,k:'wall',say:'📺 Xem màn hình lớn'},{x:11,z:-4.5,ry:Math.PI/2,k:'books',say:'📚 Đọc sách'}]},
  // ---------- Màn hình máy tính trên bàn ----------
  STC:{busy:'#38bdf8',happy:'#facc15',alert:'#ef4444',ok:'#22c55e',idle:'#64748b'},
  drawScreen(g,w,h,id){
    const m=(Office.TEAM.find(x=>x.id===id)||{}),r=(m.last||{st:'idle',say:''}),col=this.STC[r.st]||'#64748b';
    g.fillStyle='#0b1220';g.fillRect(0,0,w,h);g.fillStyle=col;g.fillRect(0,0,w,46);g.font='700 26px system-ui';g.fillStyle='#0b1220';g.fillText((m.name||id).toUpperCase(),16,32);
    g.font='500 25px system-ui';g.fillStyle='#e5e7eb';const words=String(r.say||'').split(' ');let line='',y=88;for(const wd of words){const t=line?line+' '+wd:wd;if(g.measureText(t).width>w-32){g.fillText(line,16,y);y+=34;line=wd;if(y>h-60)break}else line=t}if(y<=h-60)g.fillText(line,16,y);
    g.fillStyle='rgba(255,255,255,.06)';g.fillRect(16,h-44,w-32,20);g.fillStyle=col;g.fillRect(16,h-44,(w-32)*(r.st==='idle'?0.1:r.st==='ok'?0.45:0.5+0.5*Math.abs(Math.sin(Date.now()/3000))),20)},
  drawChart(g,w,h,id){
    g.fillStyle='#0a1324';g.fillRect(0,0,w,h);let p=100,t=(Date.now()/2000|0);const rnd=i=>{const x=Math.sin(i*12.9898+id.length*78.233)*43758.5453;return x-Math.floor(x)};
    for(let i=0;i<34;i++){const o=p,c=o+(rnd(i+t)-0.48)*6,hi=Math.max(o,c)+rnd(i+t+7)*3,lo=Math.min(o,c)-rnd(i+t+3)*3,x=12+i*14.6,y=v=>h/2-(v-100)*6;
      g.strokeStyle=g.fillStyle=c>=o?'#38d6b4':'#ff7b6b';g.beginPath();g.moveTo(x+4,y(hi));g.lineTo(x+4,y(lo));g.stroke();g.fillRect(x,Math.min(y(o),y(c)),9,Math.max(2,Math.abs(y(o)-y(c))));p=c}},
  // ---------- Nhân viên 3D ----------
  staff(gltf){
    const{THREE,SK}=this.T;this.anims=gltf.animations;
    const clip=n=>gltf.animations.find(a=>a.name===n);
    for(const m of Office.TEAM){
      const root=SK.clone(gltf.scene),wrap=new THREE.Group();wrap.add(root);this.S.add(wrap);
      const bones={};root.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;
          const mt=o.material.clone();if(/Joint/i.test(o.name)||/Joint/i.test(mt.name))mt.color.set(m.look.pants||'#2b3350');else mt.color.set(m.look.shirt);mt.roughness=0.6;mt.metalness=0.05;o.material=mt}
        if(o.isBone){const k=o.name.replace(/^mixamorig[:_]?/,'');bones[k]=o}});
      const mix=new THREE.AnimationMixer(root),act={};
      for(const n of['idle','walk']){const c=clip(n);if(c){act[n]=mix.clipAction(c);act[n].play();act[n].setEffectiveWeight(n==='idle'?1:0)}}
      for(const n of['agree','headShake']){let c=clip(n);if(c){c=c.clone();THREE.AnimationUtils.makeClipAdditive(c);act[n]=mix.clipAction(c);act[n].blendMode=THREE.AdditiveAnimationBlendMode;act[n].play();act[n].setEffectiveWeight(0)}}
      this.dress(m,bones);
      const hit=new THREE.Mesh(new THREE.CapsuleGeometry(0.32,1.1,4,8),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=0.9;hit.userData.id=m.id;wrap.add(hit);
      const env=this.box(0.22,0.02,0.15,'#fde68a',0,0,0,{cs:false});env.visible=false;if(bones.RightHand){const s=new THREE.Vector3();bones.RightHand.getWorldScale(s);const g=new THREE.Group();g.scale.setScalar(1/(s.x||1));bones.RightHand.add(g);g.add(env);env.position.set(0,0.12,0.03)}
      const seat=this.seats[m.id]||{x:0,z:3,ry:0};wrap.position.set(seat.x,0,seat.z);wrap.rotation.y=seat.ry;
      const tag=document.createElement('div');tag.className='o3-tag';tag.dataset.tag=m.id;tag.innerHTML=`<div class="o3-bub"></div><b>${m.name}</b>`;this.tags.appendChild(tag);
      this.people[m.id]={m,wrap,root,mix,act,bones,hit,env,tag,seat,mode:'sit',path:[],sitW:1,typeW:0,st:'idle',timer:2+Math.random()*6,face:seat.ry,walkW:0,cheer:0,shake:0,spot:null,say:'',sayT:0}}},
  // Tóc, kính, tai nghe, mũ… gắn vào xương đầu để mỗi người một vẻ
  dress(m,b){
    const{THREE}=this.T,H=b.Head;if(!H)return;const s=new THREE.Vector3();H.getWorldScale(s);const g=new THREE.Group();g.scale.setScalar(1/(s.x||1));H.add(g);
    const A=m.look.acc||'',hair=this.mat(m.look.hair,{r:0.9});
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.118,20,14,0,Math.PI*2,0,Math.PI*0.55),hair);cap.position.set(0,0.12,-0.005);cap.scale.set(1,0.95,1.08);g.add(cap);
    if(A.includes('bun')){const bn=new THREE.Mesh(new THREE.SphereGeometry(0.05,12,10),hair);bn.position.set(0,0.2,-0.09);g.add(bn)}
    if(A.includes('glasses')){const gm=this.mat('#111827',{r:0.3,m:0.5});for(const dx of[-0.042,0.042]){const r=new THREE.Mesh(new THREE.TorusGeometry(0.028,0.006,6,16),gm);r.position.set(dx,0.09,0.105);g.add(r)}const br=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.006,0.006),gm);br.position.set(0,0.092,0.108);g.add(br)}
    if(A.includes('headset')){const hm=this.mat('#111827',{r:0.4});const arc=new THREE.Mesh(new THREE.TorusGeometry(0.125,0.012,8,24,Math.PI),hm);arc.position.set(0,0.1,0);arc.rotation.z=0;g.add(arc);
      for(const dx of[-0.125,0.125]){const e=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.03,16),this.mat('#38d6b4',{r:0.4}));e.rotation.z=Math.PI/2;e.position.set(dx,0.08,0);g.add(e)}
      const mic=new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.12,6),hm);mic.rotation.x=Math.PI/2.4;mic.position.set(0.11,0.03,0.06);g.add(mic)}
    if(A.includes('cap')){const cm=this.mat(m.look.capc||'#ef4444',{r:0.7});const c=new THREE.Mesh(new THREE.SphereGeometry(0.124,20,12,0,Math.PI*2,0,Math.PI*0.5),cm);c.position.set(0,0.13,0);g.add(c);
      const v=new THREE.Mesh(new THREE.BoxGeometry(0.17,0.012,0.1),cm);v.position.set(0,0.135,0.13);g.add(v)}
    if(A.includes('helmet')){const hm=this.mat('#facc15',{r:0.35});const c=new THREE.Mesh(new THREE.SphereGeometry(0.135,20,12,0,Math.PI*2,0,Math.PI*0.5),hm);c.position.set(0,0.125,0);g.add(c);const br=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.012,24),hm);br.position.set(0,0.125,0.01);g.add(br)}
    if(A.includes('beret')){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.12,0.04,20),this.mat('#7c3aed',{r:0.9}));c.position.set(0.02,0.215,0);c.rotation.z=0.18;g.add(c)}
    if(A.includes('coat')&&b.Spine1){const s2=new THREE.Vector3();b.Spine1.getWorldScale(s2);const cg=new THREE.Group();cg.scale.setScalar(1/(s2.x||1));b.Spine1.add(cg);const ct=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.24,0.6,16,1,true),this.mat('#f8fafc',{r:0.8}));ct.material.side=THREE.DoubleSide;ct.position.set(0,-0.05,0);cg.add(ct)}},
  // ---------- Hành vi ----------
  CORR:2.7,LANES:[-7.8,-0.5,2.3,9.9],
  route(a,b){ // đi qua lối đi chung, tránh xuyên qua bàn
    const out=[],c=this.CORR,lane=x=>this.LANES.reduce((p,q)=>Math.abs(q-x)<Math.abs(p-x)?q:p),back=z=>z<-1;
    const exit=p=>back(p.z)?[{x:p.x,z:-2.2},{x:lane(p.x),z:-2.2},{x:lane(p.x),z:c}]:[{x:p.x,z:Math.max(c,p.z>c?p.z:c)}];
    out.push(...exit(a));const en=exit(b).reverse();out.push(...en,{x:b.x,z:b.z});
    return out.filter((p,i,A)=>!i||Math.hypot(p.x-A[i-1].x,p.z-A[i-1].z)>0.05)},
  go(p,to,then){p.path=this.route({x:p.wrap.position.x,z:p.wrap.position.z},to);p.dest=to;p.mode='walk';p.then=then},
  think(p,dt){
    const st=p.st;p.timer-=dt;
    if(p.m.id==='post'&&p.deliver&&p.mode!=='walk'){const t=this.people[p.deliver];p.deliver=null;if(t){p.env.visible=true;this.go(p,{x:t.seat.x+0.7,z:t.seat.z+0.2,ry:-Math.PI/2},'deliver')}return}
    if(p.mode==='walk')return;
    const atDesk=Math.hypot(p.wrap.position.x-p.seat.x,p.wrap.position.z-p.seat.z)<0.2;
    if(st==='idle'&&p.m.id!=='guard'){ // rảnh: đi dạo các điểm nghỉ
      if(atDesk&&p.timer<=0){const free=this.spots.filter(s=>!Object.values(this.people).some(q=>q!==p&&q.spot===s));const s=free[(Math.random()*free.length)|0];if(s){p.spot=s;this.go(p,s,'spot')}return}
      if(!atDesk&&p.timer<=0){p.spot=null;this.go(p,p.seat,'seat')}return}
    if(!atDesk){p.spot=null;this.go(p,p.seat,'seat');return}
    p.mode=p.cheer>0?'cheer':st==='happy'&&p.timer<=0?'cheer':st==='alert'?'stand':'sit';
    if(p.mode==='cheer'&&p.cheer<=0){p.cheer=4;p.timer=18+Math.random()*10}},
  arrive(p){
    const d=p.dest||p.seat;p.face=d.ry!=null?d.ry:p.face;
    if(p.then==='spot'){p.mode=p.spot&&p.spot.sit?'sit':'stand';p.timer=12+Math.random()*16;this.pop(p,p.spot?p.spot.say:'')}
    else if(p.then==='deliver'){p.mode='stand';p.env.visible=false;p.timer=2.5;this.pop(p,'📨 Có thư mới!');setTimeout(()=>{if(p.mode!=='walk')this.go(p,p.seat,'seat')},2500)}
    else{p.mode='sit';p.timer=(p.st==='idle'?8:2)+Math.random()*12}},
  pop(p,t){if(!t)return;p.say=t;p.sayT=5},
  step(p,dt){
    const{THREE}=this.T,W=p.wrap;
    if(p.mode==='walk'){const n=p.path[0];if(!n){p.mode='stand';this.arrive(p)}else{const dx=n.x-W.position.x,dz=n.z-W.position.z,d=Math.hypot(dx,dz),v=1.25*dt;
      if(d<=v){W.position.x=n.x;W.position.z=n.z;p.path.shift();if(!p.path.length){this.arrive(p)}}else{W.position.x+=dx/d*v;W.position.z+=dz/d*v;p.face=Math.atan2(dx,dz)}}}
    // xoay mượt về hướng cần nhìn
    let df=p.face-W.rotation.y;df=Math.atan2(Math.sin(df),Math.cos(df));W.rotation.y+=df*Math.min(1,dt*7);
    // trọng số động tác
    const sit=p.mode==='sit'?1:0,walk=p.mode==='walk'?1:0,k=Math.min(1,dt*4);
    p.sitW+=(sit-p.sitW)*Math.min(1,dt*3);p.walkW+=(walk-p.walkW)*k;
    const typing=p.mode==='sit'&&!p.spot&&(p.st==='busy'||(p.st==='ok'&&Math.sin(performance.now()/2600+p.m.id.length)>0.1));p.typeW+=((typing?1:0)-p.typeW)*k;
    if(p.act.walk)p.act.walk.setEffectiveWeight(p.walkW);if(p.act.idle)p.act.idle.setEffectiveWeight(1-p.walkW);
    p.cheer=Math.max(0,p.cheer-dt);if(p.cheer<=0&&p.mode==='cheer')p.mode='sit';
    if(p.act.agree)p.act.agree.setEffectiveWeight(p.mode==='cheer'?1:0);if(p.act.headShake)p.act.headShake.setEffectiveWeight(p.mode==='stand'&&p.st==='alert'?1:0);
    p.mix.update(dt);
    // tư thế ngồi / gõ phím chồng lên khung xương
    const B=p.bones,P=this.POSE,q=new THREE.Quaternion(),e=new THREE.Euler(),R=Math.PI/180;
    const add=(b,a,w)=>{if(!b||!w)return;e.set(a[0]*R*w,a[1]*R*w,a[2]*R*w);q.setFromEuler(e);b.quaternion.multiply(q)};
    const s=p.sitW;add(B.LeftUpLeg,P.sit.up,s);add(B.RightUpLeg,P.sit.up,s);add(B.LeftLeg,P.sit.leg,s);add(B.RightLeg,P.sit.leg,s);add(B.Spine,P.sit.spine,s);
    const t=p.typeW*s;add(B.LeftArm,P.type.armL,t);add(B.RightArm,P.type.armR,t);add(B.LeftForeArm,P.type.foreL,t);add(B.RightForeArm,P.type.foreR,t);add(B.Spine1,P.type.sh,t);
    if(t>0.05){const ph=performance.now()/90;add(B.LeftHand,[Math.sin(ph)*12,0,0],t);add(B.RightHand,[Math.sin(ph+1.7)*12,0,0],t)}
    const rs=s*(1-p.typeW);add(B.LeftArm,P.rest.armL,rs);add(B.RightArm,P.rest.armR,rs);add(B.LeftForeArm,P.rest.foreL,rs);add(B.RightForeArm,P.rest.foreR,rs);
    if(p.mode==='cheer'){const ph=performance.now()/180;add(B.LeftArm,[0,0,-70+Math.sin(ph)*15],1);add(B.RightArm,[0,0,70-Math.sin(ph)*15],1)}
    const back=(p.mode==='stand'||p.mode==='cheer')&&!p.spot&&p.then!=='deliver'?1:0;p.backW=(p.backW||0)+(back-(p.backW||0))*Math.min(1,dt*3); // đứng dậy thì lùi ra sau ghế
    p.root.position.y=P.sit.y*s;p.root.position.z=P.sit.fwd*s-0.45*p.backW;
    p.sayT=Math.max(0,p.sayT-dt)},
  // ---------- Camera ----------
  CAMS:{all:[[2,13,17],[0,0.8,-0.5]],ana:[[-6.5,4.2,2.6],[-6.5,0.9,-4]],desk:[[3.5,4.2,2.6],[3.5,0.9,-4]],lab:[[-3,4,6.8],[-3,0.9,1.2]],comm:[[6,4,6.8],[7,0.9,0.8]],rest:[[-4,4.5,1.5],[-9,0.8,5.5]]},
  view(k){const c=this.CAMS[k];if(c)this.fly(c[0],c[1])},
  focus(id){const p=this.people[id];if(!p)return;const x=p.wrap.position.x,z=p.wrap.position.z;this.fly([x+1.6,2.6,z+3.2],[x,1,z]);this.sel=id;setTimeout(()=>{if(this.sel===id)this.sel=null},6000)},
  fly(pos,tgt){const{THREE}=this.T;this.anim={t:0,p0:this.cam.position.clone(),p1:new THREE.Vector3(...pos),t0:this.ctl.target.clone(),t1:new THREE.Vector3(...tgt)}},
  // ---------- Vòng lặp ----------
  start(){if(!this.ready||this.running)return;this.running=true;this.clock.getDelta();const loop=()=>{if(!this.running)return;this.raf=requestAnimationFrame(loop);this.frame()};loop()},
  stop(){this.running=false;cancelAnimationFrame(this.raf);if(!this.vis){this.vis=1;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&this.el&&this.el.isConnected&&this.el.offsetWidth)this.start()})}},
  frame(){
    if(!this.el.isConnected||!this.el.offsetWidth||document.hidden){this.stop();return} // rời trang Văn phòng hoặc ẩn tab: dừng vẽ cho đỡ tốn pin
    const dt=Math.min(0.05,this.clock.getDelta());
    this.tick2+=dt;if(this.tick2>2){this.tick2=0;this.sync()}
    for(const p of Object.values(this.people)){this.think(p,dt);this.step(p,dt)}
    if(this.anim){const a=this.anim;a.t=Math.min(1,a.t+dt/1.2);const e=a.t<0.5?2*a.t*a.t:1-Math.pow(-2*a.t+2,2)/2;this.cam.position.lerpVectors(a.p0,a.p1,e);this.ctl.target.lerpVectors(a.t0,a.t1,e);if(a.t>=1)this.anim=null}
    this.ctl.update();
    if(this.leds){const t=performance.now();this.leds.forEach((l,i)=>l.material.emissiveIntensity=((t/180+i*7.3)%10)<6?2.5:0.2)}
    if(this.radarC&&(this.fr=(this.fr||0)+1)%3===0)this.radarC.redraw();
    this.R.render(this.S,this.cam);this.labels()},
  // Đồng bộ dữ liệu thật mỗi 2 giây: trạng thái, màn hình, màn hình lớn, đồng hồ, bầu trời, thư mới
  sync(){
    for(const m of Office.TEAM){let r;try{r=Office.read(m.id)}catch(e){r={st:'idle',say:''}}const p=this.people[m.id];m.last=r;if(!p)continue;
      if(p.st!==r.st){p.st=r.st;p.timer=Math.min(p.timer,1.5);if(r.st!=='idle')this.pop(p,r.say)}p.text=r.say}
    this.screens.forEach(s=>s.redraw());this.wallScr.redraw();this.clockC.redraw();
    const h=new Date().getHours();if(h!==this.lastH){this.lastH=h;this.sky.redraw();const night=h<6||h>=18;this.sun.intensity=night?0.25:1.5;this.hemi.intensity=night?0.45:0.75;this.lamps.forEach(l=>l.intensity=night?7:4)}
    try{const L=Book.data.log[0],k=L?L.t+L.text:'';if(this.lastLog!==undefined&&k&&k!==this.lastLog){const who=Office.WHO[L.kind]||'acc';if(who!=='post'&&this.people.post)this.people.post.deliver=who}this.lastLog=k}catch(e){}},
  labels(){
    const{THREE}=this.T,v=new THREE.Vector3(),w=this.cv.clientWidth,h=this.cv.clientHeight;
    for(const p of Object.values(this.people)){
      v.set(0,p.mode==='sit'&&!p.spot?1.55:2.05,0);p.wrap.localToWorld(v);v.project(this.cam);
      const vis=v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1,T=p.tag;if(!vis){if(T.style.display!=='none')T.style.display='none';continue}
      T.style.display='';T.style.transform=`translate(${(v.x+1)/2*w}px,${(1-v.y)/2*h}px) translate(-50%,-100%)`;
      const show=p.sayT>0||this.hover===p.m.id||this.sel===p.m.id,txt=p.sayT>0?p.say:(p.text||'');
      const b=T.firstChild;if(b._t!==txt){b.textContent=txt;b._t=txt}T.classList.toggle('say',show&&!!txt);T.dataset.st=p.st}}
};
