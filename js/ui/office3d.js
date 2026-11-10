/* Văn phòng 3D "Modern Tech & Trading Hub" — Three.js (tải từ CDN khi mở trang) + mô hình người có khung xương "X Bot" (mẫu mở của three.js).
   5 khu: Sàn giao dịch trung tâm · Tech & Algo Lab · Phòng Điều hành (kính) · Coffee Lounge · Sảnh lễ tân & An ninh.
   • Vật liệu PBR: sàn gỗ bóng phản chiếu môi trường, bê tông xám, kính cường lực, cây kim tiền; nắng chiếu qua vách kính đổ bóng mềm, đèn LED dải trắng ấm / xanh lạnh.
   • Nhân vật: trang phục theo vai trò (sơ mi xắn tay + tai nghe Bluetooth, hoodie + kính, vest công sở, đồng phục bảo vệ / bưu tá / pha chế), khuôn mặt có biểu cảm
     (cười khi có tin vui, nhíu mày khi cần chú ý, chớp mắt, mấp máy môi khi nói).
   • Máy trạng thái hành động: Làm việc (gõ phím, rê chuột, xoay ghế trao đổi, đứng viết bảng kính) → Giải lao (pha cà phê, bi-a, bi lắc, sofa lướt điện thoại / xem TV)
     → Di chuyển (tìm đường A* tránh bàn ghế, bảo vệ đi tuần, bưu tá phát thư).
   • Dữ liệu thật: trạng thái và lời nói của từng nhân viên lấy từ Office.read (tín hiệu, Sổ lệnh, rủi ro, tự học…); màn hình nến, bảng giá lớn,
     bảng điều khiển Winrate / PnL / cảnh báo rủi ro, TV tin tài chính, đồng hồ thế giới đều chạy theo số liệu và giờ thật.
   • Bấm vào nhân vật: camera bay tới và bám theo, hiện thẻ hồ sơ. Âm thanh vòm 3D tự tổng hợp (gõ phím, trò chuyện, máy pha cà phê, máy chủ) to/nhỏ theo vị trí camera.
   Không tải được 3D thì tự quay về văn phòng 2D. */
const Office3D={
  V:'0.160.0',
  SRC:[
    {three:v=>`https://cdn.jsdelivr.net/npm/three@${v}/+esm`,add:(v,p)=>`https://cdn.jsdelivr.net/npm/three@${v}/examples/jsm/${p}/+esm`},
    {three:v=>`https://esm.sh/three@${v}`,add:(v,p)=>`https://esm.sh/three@${v}/examples/jsm/${p}`}],
  MODEL:['https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Xbot.glb','https://threejs.org/examples/models/gltf/Xbot.glb'],
  T:null,el:null,ready:false,running:false,raf:0,people:{},screens:[],scrI:0,tick2:0,mats:{},
  // ---------- Quy hoạch: 5 khu (x, z theo mét; sàn 32 × 22 m) ----------
  ZONES:[
    {k:'trade',n:'Sàn giao dịch',x:[-6.6,6.6],z:[-10.8,0.6],c:'#38bdf8',cam:[[0,6.2,5.2],[0,0.9,-4.6]]},
    {k:'lab',n:'Tech & Algo Lab',x:[-15.8,-7],z:[-10.8,-3.5],c:'#a78bfa',cam:[[-7.6,5.4,0.6],[-11.8,0.9,-7.2]]},
    {k:'exec',n:'Phòng Điều hành',x:[7,15.8],z:[-10.8,-3.5],c:'#f0d68a',cam:[[8.2,5.4,0.6],[11.6,1.3,-7.6]]},
    {k:'lounge',n:'Coffee Lounge',x:[-15.8,-6],z:[2.2,10.8],c:'#f59e0b',cam:[[-6.2,5.6,14],[-10.8,0.8,6.2]]},
    {k:'lobby',n:'Sảnh lễ tân',x:[6,15.8],z:[2.2,10.8],c:'#34d399',cam:[[14.6,4.6,13],[8.8,1.3,6.2]]}],
  CAM_ALL:[[0,21,22.5],[0,0,0.2]],
  // Chỗ ngồi: [x, z, hướng nhìn, khu]
  SEATS:{radar:[-3.6,-5.6,Math.PI,'trade'],rsi2:[0,-5.6,Math.PI,'trade'],smc:[3.6,-5.6,Math.PI,'trade'],
    btc100:[-3.6,-1.6,Math.PI,'trade'],trader:[0,-1.6,Math.PI,'trade'],news:[3.6,-1.6,Math.PI,'trade'],
    lab:[-13.8,-5.2,Math.PI,'lab'],calib:[-11.4,-5.2,Math.PI,'lab'],sync:[-9,-5.2,Math.PI,'lab'],
    risk:[9.6,-5.4,Math.PI,'exec'],acc:[13,-5.4,Math.PI,'exec'],
    guard:[14.6,3.4,-Math.PI/2,'lobby'],post:[14.4,10.2,Math.PI,'lobby'],recep:[8.7,6.8,Math.PI/2,'lobby'],barista:[-14.75,4.6,Math.PI/2,'lounge']},
  NEIGH:[['radar','rsi2'],['rsi2','smc'],['btc100','trader'],['trader','news'],['lab','calib'],['calib','sync'],['risk','acc']],
  // Ngoại hình 3D theo vai trò. fit: 0 sơ mi, 1 vest, 2 hoodie, 3 áo thun, 4 bảo vệ, 5 bưu tá, 6 pha chế. sl: tay áo dài tới đâu (0,33 ngắn · 0,47 xắn · 0,7 dài)
  LOOK:{
    radar:{fit:0,shirt:'#cfe3f7',pants:'#1f2a3d',hair:'short',acc:'headset'},
    rsi2:{fit:0,shirt:'#fde7c7',pants:'#2b2f3a',hair:'bun',acc:'glasses earbud'},
    smc:{fit:0,shirt:'#e4dcfb',pants:'#273043',hair:'side',acc:'glasses headset'},
    btc100:{fit:0,shirt:'#f9d4d4',pants:'#1c2433',hair:'short',acc:'cap earbud',capc:'#111827'},
    trader:{fit:0,shirt:'#d5f3e1',pants:'#2d3446',hair:'pony',acc:'headset'},
    news:{fit:1,jacket:'#be185d',shirt:'#fdf2f8',tie:'#fdf2f8',pants:'#1f2937',hair:'long',acc:'beret'},
    risk:{fit:1,jacket:'#1e293b',shirt:'#f8fafc',tie:'#b91c1c',pants:'#1e293b',hair:'side',acc:'glasses'},
    acc:{fit:1,jacket:'#475569',shirt:'#f8fafc',tie:'#0ea5e9',pants:'#334155',hair:'bob',acc:''},
    lab:{fit:2,shirt:'#4b5563',pants:'#1f2937',shoe:'#e5e7eb',hair:'bald',acc:'glasses hood'},
    calib:{fit:3,shirt:'#f97316',pants:'#2c4a72',shoe:'#e5e7eb',hair:'short',acc:'glasses'},
    sync:{fit:2,shirt:'#0f766e',pants:'#1e3a5f',shoe:'#e5e7eb',hair:'bun',acc:'glasses hood'},
    post:{fit:5,shirt:'#2563eb',tie:'#facc15',pants:'#1e3a8a',hair:'short',acc:'cap bag',capc:'#1d4ed8'},
    guard:{fit:4,shirt:'#1e293b',tie:'#facc15',pants:'#0f172a',hair:'short',acc:'cap badge radio',capc:'#0f172a'},
    barista:{fit:6,shirt:'#f5f5f4',tie:'#78350f',pants:'#1c1917',hair:'pony',acc:'',skin:'#f1c27d',hairc:'#3b2416'},
    recep:{fit:1,jacket:'#0f766e',shirt:'#f8fafc',tie:'#f8fafc',pants:'#134e4a',hair:'bun',acc:'earbud',skin:'#f6d0b1',hairc:'#1f2937'}},
  NPC:[{id:'barista',name:'Chị Thu Barista',role:'Pha chế Coffee Lounge',job:'Pha espresso, latte cho cả văn phòng. Ai rảnh ghé quầy là có cà phê nóng.'},
    {id:'recep',name:'Lễ tân Hạnh',role:'Lễ tân sảnh',job:'Đón khách ở sảnh, mở cổng soát vé thông minh và chào mọi người ra vào.'}],
  // ---------- Điểm sinh hoạt (giải lao, làm việc phụ) ----------
  SPOTS:[
    {k:'coffee',x:-13.1,z:3.9,ry:-Math.PI/2,pose:'cup',prop:'cup',snd:'espresso',say:['☕ Cần thêm cà phê!','☕ Một ly espresso nhé chị Thu!','☕ Nạp caffeine rồi soi kèo tiếp']},
    {k:'coffee',x:-13.1,z:5.3,ry:-Math.PI/2,pose:'cup',prop:'cup',snd:'espresso',say:['☕ Latte ít đường nha!','☕ Cà phê sáng nay thơm quá']},
    {k:'water',x:-14.6,z:8.4,ry:-Math.PI/2,pose:'cup',prop:'cup',say:['💧 Uống ngụm nước','💧 Phải uống đủ nước mới tỉnh']},
    {k:'sofa',x:-12.2,z:10.0,ry:Math.PI,sit:'sofa',pose:'phone',prop:'phone',say:['📱 Lướt điện thoại chút','📱 Check nhóm chat trader','📱 Xem biểu đồ trên điện thoại']},
    {k:'sofa',x:-10.8,z:10.0,ry:Math.PI,sit:'sofa',pose:'lean',say:['📺 Xem tin tài chính trên TV','📺 TV đang nói về Bitcoin kìa']},
    {k:'pool',x:-11.8,z:4.4,ry:Math.PI/2,pair:'pool',pose:'cue',prop:'cue',say:['🎱 Một ván bi-a nào!','🎱 Bi số 8 vào lỗ góc nhé']},
    {k:'pool',x:-8.2,z:4.4,ry:-Math.PI/2,pair:'pool',pose:'cue',prop:'cue',say:['🎱 Chơi luôn!','🎱 Lần này tôi thắng']},
    {k:'foos',x:-7.5,z:6.55,ry:0,pair:'foos',pose:'foos',say:['⚽ Bi lắc thôi!','⚽ Vào!!!']},
    {k:'foos',x:-7.5,z:8.05,ry:Math.PI,pair:'foos',pose:'foos',say:['⚽ Chấp anh 2 trái','⚽ Thủ môn đâu rồi?']},
    {k:'window',x:-15.1,z:-1.6,ry:-Math.PI/2,say:['🏙️ Ngắm phố một lát','🏙️ Nắng đẹp ghê']},
    {k:'window',x:-15.1,z:1.2,ry:-Math.PI/2,say:['🏙️ Thư giãn mắt chút']},
    {k:'board',x:-14.55,z:-7.6,ry:-Math.PI/2,pose:'write',prop:'pen',only:['lab','calib','sync'],work:1,say:['✍️ Viết công thức lên bảng kính','✍️ Kỳ vọng = W·R − L','✍️ Thử tham số mới cho bộ học']},
    {k:'wall',x:-1.2,z:-8.7,ry:Math.PI,work:1,only:['radar','rsi2','smc','btc100','trader','news'],say:['📺 Xem bảng giá lớn','📺 Coin nào đang chạy mạnh?']},
    {k:'exec',x:14.3,z:-9.7,ry:Math.PI,work:1,only:['risk','acc'],say:['📊 Xem bảng Winrate / PnL','📊 Kiểm tra cảnh báo rủi ro']}],
  CHAT:['Kèo này R:R đẹp đấy','Nhớ dời SL về entry khi chạm TP1 nhé','Killzone sắp mở rồi','Thị trường hôm nay biến động mạnh','Đừng đuổi giá nha','Chờ nến đóng cửa đã','Ok, theo kế hoạch'],
  // ---------- Tải thư viện ----------
  async lib(){
    if(this.T)return this.T;let err;
    for(const s of this.SRC){try{
      const THREE=await import(s.three(this.V));
      const[{OrbitControls},{GLTFLoader},SK,{RoomEnvironment}]=await Promise.all(['controls/OrbitControls.js','loaders/GLTFLoader.js','utils/SkeletonUtils.js','environments/RoomEnvironment.js'].map(p=>import(s.add(this.V,p))));
      // Hậu kỳ phát sáng (bloom) + đèn vùng cho video wall: không bắt buộc, tải lỗi thì chạy bản thường
      let FX=null;try{const[{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass},{RectAreaLightUniformsLib}]=await Promise.all(['postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js','lights/RectAreaLightUniformsLib.js'].map(p=>import(s.add(this.V,p))));
        FX={EffectComposer,RenderPass,UnrealBloomPass,OutputPass,RectAreaLightUniformsLib}}catch(e){console.warn('Office3D: không tải được hậu kỳ, dùng bản thường',e)}
      return this.T={THREE,OrbitControls,GLTFLoader,SK,RoomEnvironment,FX}}catch(e){err=e}}
    throw err||new Error('Không tải được Three.js')},
  async model(){
    const{GLTFLoader}=this.T;let err;
    for(const u of this.MODEL){try{return await new Promise((res,rej)=>new GLTFLoader().load(u,res,undefined,rej))}catch(e){err=e}}
    throw err},
  webgl(){try{const c=document.createElement('canvas');return!!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl')))}catch(e){return false}},
  pref(k,d){try{return typeof Store!=='undefined'?Store.get(k,d):d}catch(e){return d}},
  setPref(k,v){try{if(typeof Store!=='undefined')Store.set(k,v)}catch(e){}},
  // ---------- Khởi tạo ----------
  async mount(el){
    if(this.ready&&this.el===el){this.start();return true}
    this.el=el;el.innerHTML=`<div class="o3-load"><span class="spin"></span><b>Đang dựng Trading Hub 3D…</b><small id="o3msg">Tải thư viện Three.js</small></div>`;
    if(!this.webgl())throw new Error('Trình duyệt không hỗ trợ WebGL');
    await this.lib();const msg=el.querySelector('#o3msg');if(msg)msg.textContent='Tải mô hình nhân viên 3D (~3 MB, chỉ lần đầu)';
    const gltf=await this.model();
    this.build(el,gltf);this.ready=true;this.start();return true},
  build(el,gltf){
    const{THREE,OrbitControls,RoomEnvironment}=this.T,mob=matchMedia('(max-width:760px)').matches;this.gltf=gltf;this.mob=mob;
    el.innerHTML=`<div class="o3-cv"></div><div class="o3-tags"></div>
      <div class="o3-bar"><div class="seg" id="o3cam"><button data-cam="all" class="on">Toàn cảnh</button>${this.ZONES.map(z=>`<button data-cam="${z.k}" style="--zc:${z.c}"><i class="o3-zd"></i>${z.n}</button>`).join('')}</div>
        <div class="o3-tg"><label class="sw" title="Bọt thoại"><input type="checkbox" id="o3say" checked><span></span>💬<em> Lời nói</em></label><label class="sw" title="Âm thanh vòm 3D"><input type="checkbox" id="o3snd"><span></span>🔊<em> Âm thanh</em></label><label class="sw" title="Đồ họa cao: phát sáng màn hình (bloom), ánh sáng hắt, bóng đổ nét hơn. Tắt nếu máy chạy chậm"><input type="checkbox" id="o3hq"><span></span>✨<em> Đồ họa cao</em></label><button class="o3-tod" id="o3tod" title="Ánh sáng: theo giờ thật Việt Nam / luôn ban ngày / luôn ban đêm"></button><label class="sw" title="Camera tự tham quan các khu"><input type="checkbox" id="o3tour"><span></span>🎥<em> Tham quan</em></label></div></div>
      <div class="o3-kpi" id="o3kpi"></div>
      <div class="o3-card" id="o3card" hidden></div>
      <canvas class="o3-map" id="o3map" width="220" height="152" title="Sơ đồ: bấm vào khu hoặc nhân viên để bay tới"></canvas>
      <div class="o3-help"><span class="o3-hk">Kéo để xoay · cuộn / chụm 2 ngón để phóng to · bấm vào nhân viên để xem hồ sơ</span><span class="o3-hkb"> · <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / mũi tên di chuyển · <kbd>Shift</kbd> đi nhanh · <kbd>Q</kbd><kbd>E</kbd> hạ / nâng · <kbd>Esc</kbd> bỏ chọn</span></div>`;
    const cv=el.querySelector('.o3-cv'),R=new THREE.WebGLRenderer({antialias:!mob,powerPreference:'high-performance'});
    R.setPixelRatio(Math.min(devicePixelRatio||1,mob?1.5:2));R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
    R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;R.toneMappingExposure=0.95;cv.appendChild(R.domElement);
    this.aniso=Math.min(16,R.capabilities.getMaxAnisotropy()||4);this.hq=!!this.pref('o3hq',!mob);this.tod=this.pref('o3tod','auto');
    const S=new THREE.Scene();S.background=new THREE.Color('#0b1322');S.fog=new THREE.Fog('#0b1322',40,90);
    const pm=new THREE.PMREMGenerator(R);S.environment=pm.fromScene(new RoomEnvironment(R),0.04).texture;pm.dispose(); // phản chiếu PBR
    const cam=new THREE.PerspectiveCamera(40,1,0.1,160);cam.position.set(...this.CAM_ALL[0]);
    const ctl=new OrbitControls(cam,R.domElement);ctl.target.set(...this.CAM_ALL[1]);ctl.enableDamping=true;ctl.maxPolarAngle=Math.PI*0.47;ctl.minDistance=2.2;ctl.maxDistance=40;ctl.update();
    Object.assign(this,{R,S,cam,ctl,cv,clock:new THREE.Clock(),tags:el.querySelector('.o3-tags'),card:el.querySelector('#o3card'),map:el.querySelector('#o3map'),kpi:el.querySelector('#o3kpi')});
    this.gridInit();this.lights();this.room();this.zoneTrade();this.zoneLab();this.zoneExec();this.zoneLounge();this.zoneLobby();this.decor();this.steamInit();this.staff(gltf);
    this.fxInit();this.extras();this.mood(true);
    const bar=el.querySelector('.o3-bar'),lay=()=>{if(matchMedia('(max-width:760px)').matches){this.kpi.style.top=this.card.style.top='';return}const y=bar.offsetTop+bar.offsetHeight+8;this.kpi.style.top=y+'px';this.card.style.top=(y+38)+'px'};new ResizeObserver(lay).observe(bar);lay();
    const rs=()=>{const w=cv.clientWidth,h=cv.clientHeight;if(!w||!h)return;R.setSize(w,h,false);if(this.fx)this.fx.comp.setSize(w,h);cam.aspect=w/h;cam.fov=cam.aspect<0.8?56:40;cam.updateProjectionMatrix()};
    this.ro=new ResizeObserver(rs);this.ro.observe(cv);rs();if(cam.aspect<0.8){cam.position.set(24,38,0.2);ctl.target.set(0,0,0.2);ctl.update()}
    // Chọn nhân viên bằng chuột / chạm
    const ray=new THREE.Raycaster(),m=new THREE.Vector2(),hit=e=>{const r=R.domElement.getBoundingClientRect();m.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(m,cam);
      const h=ray.intersectObjects(Object.values(this.people).map(p=>p.hit),false)[0];return h&&h.object.userData.id};
    let down=null;R.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];this.userMove()});
    R.domElement.addEventListener('wheel',()=>this.userMove(),{passive:true});
    R.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const id=hit(e);if(id)this.select(id)});
    R.domElement.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;const id=hit(e);this.hover=id;R.domElement.style.cursor=id?'pointer':''});
    el.querySelector('#o3cam').onclick=e=>{const b=e.target.closest('[data-cam]');if(!b)return;this.tour(false);this.view(b.dataset.cam)};
    const say=el.querySelector('#o3say');say.checked=this.pref('o3say',true);this.tags.classList.toggle('nosay',!say.checked);say.onchange=()=>{this.tags.classList.toggle('nosay',!say.checked);this.setPref('o3say',say.checked)};
    const snd=el.querySelector('#o3snd');snd.onchange=()=>{this.Snd.toggle(this,snd.checked)};
    const tr=el.querySelector('#o3tour');tr.onchange=()=>this.tour(tr.checked);
    const hq=el.querySelector('#o3hq');hq.checked=this.hq;hq.onchange=()=>{this.setHQ(hq.checked)};
    const tod=el.querySelector('#o3tod');this.todBtn=tod;this.paintTod();tod.onclick=()=>{const o=['auto','day','night'];this.tod=o[(o.indexOf(this.tod)+1)%3];this.setPref('o3tod',this.tod);this.paintTod();this.mood(true)};
    this.tags.addEventListener('click',e=>{const t=e.target.closest('[data-tag]');if(t)this.select(t.dataset.tag)});
    this.card.addEventListener('click',e=>{if(e.target.closest('.o3-x'))this.unselect();const g=e.target.closest('[data-o3more]');if(g&&typeof Office!=='undefined'&&Office.detail)Office.detail(g.dataset.o3more)});
    this.map.addEventListener('click',e=>this.mapClick(e));this.keysInit()},
  // ---------- Vật liệu & hình khối ----------
  mat(c,o={}){
    const key=o.map||o.noCache?null:JSON.stringify([c,o]);if(key&&this.mats[key])return this.mats[key];
    const{THREE}=this.T,m=new THREE.MeshStandardMaterial({color:c,roughness:o.r!=null?o.r:0.7,metalness:o.m||0,emissive:o.e||'#000',emissiveIntensity:o.ei!=null?o.ei:1,
      transparent:o.op!=null,opacity:o.op!=null?o.op:1,map:o.map||null,envMapIntensity:o.env!=null?o.env:0.55,side:o.ds?THREE.DoubleSide:THREE.FrontSide,depthWrite:o.op!=null&&o.op<0.5?false:true});
    if(key)this.mats[key]=m;return m},
  glass(o={}){const{THREE}=this.T;return this.mats['glass'+(o.tint||'')]||(this.mats['glass'+(o.tint||'')]=new THREE.MeshPhysicalMaterial({color:o.tint||'#d6ebff',roughness:0.02,metalness:0,transparent:true,opacity:o.op||0.07,envMapIntensity:0.5,clearcoat:0.5,clearcoatRoughness:0.03,ior:1.52,side:THREE.DoubleSide,depthWrite:false}))},
  mesh(geo,mat,x,y,z,o={},par){const{THREE}=this.T,b=new THREE.Mesh(geo,mat.isMaterial?mat:this.mat(mat,o));b.position.set(x,y,z);b.castShadow=!!o.cs;b.receiveShadow=o.rs!==false;if(o.ry)b.rotation.y=o.ry;if(o.rx)b.rotation.x=o.rx;if(o.rz)b.rotation.z=o.rz;(par||this.S).add(b);return b},
  box(w,h,d,c,x,y,z,o={},par){const{THREE}=this.T;if(o.cs==null)o={...o,cs:w*h*d>0.02};return this.mesh(new THREE.BoxGeometry(w,h,d),c,x,y,z,o,par)},
  cyl(rt,rb,h,c,x,y,z,o={},par){const{THREE}=this.T;return this.mesh(new THREE.CylinderGeometry(rt,rb,h,o.seg||24,1,!!o.open,o.t0||0,o.tl||Math.PI*2),c,x,y,z,o,par)},
  sph(r,c,x,y,z,o={},par){const{THREE}=this.T;return this.mesh(new THREE.SphereGeometry(r,o.seg||18,o.seg?Math.max(6,o.seg*0.7|0):12),c,x,y,z,o,par)},
  group(x,z,ry=0,y=0,par){const{THREE}=this.T,g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;(par||this.S).add(g);return g},
  canvas(w,h,draw,o={}){const{THREE}=this.T,c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=this.aniso||4;
    const g=c.getContext('2d');const s={c,g,t,draw,redraw(){try{draw(g,w,h)}catch(e){}t.needsUpdate=true}};s.redraw();if(o.live)this.screens.push(s);return s},
  screen(w,h,tex,x,y,z,ry=0,o={},par){const{THREE}=this.T,geo=o.curve?this.bent(w,h,o.curve):new THREE.PlaneGeometry(w,h);
    const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:tex,emissive:'#ffffff',emissiveMap:tex,emissiveIntensity:o.em!=null?o.em:1,roughness:0.35,metalness:0,transparent:!!o.tr,envMapIntensity:0.3,depthWrite:!o.tr}));
    m.material.userData.em=o.em!=null?o.em:1;(this.scrMats=this.scrMats||[]).push(m.material);m.position.set(x,y,z);m.rotation.y=ry;(par||this.S).add(m);return m},
  bent(w,h,k){const{THREE}=this.T,g=new THREE.PlaneGeometry(w,h,14,1),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,k*x*x/(w*w/4))}g.computeVertexNormals();return g},
  arcShape(r1,r2,a0,a1,seg=28){const{THREE}=this.T,s=new THREE.Shape();for(let i=0;i<=seg;i++){const a=a0+(a1-a0)*i/seg,x=Math.sin(a)*r2,y=-Math.cos(a)*r2;i?s.lineTo(x,y):s.moveTo(x,y)}
    for(let i=seg;i>=0;i--){const a=a0+(a1-a0)*i/seg;s.lineTo(Math.sin(a)*r1,-Math.cos(a)*r1)}return s},
  extrude(shape,depth,c,x,y,z,o={},par){const{THREE}=this.T,g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:2,curveSegments:24});
    const m=this.mesh(g,c,x,y,z,{cs:true,...o},par);m.rotation.x=-Math.PI/2;return m},
  // Họa tiết vẽ bằng canvas (không cần tải ảnh): gỗ, bê tông, đá, thảm
  tex(kind,rep){const{THREE}=this.T;this.texC=this.texC||{};if(this.texC[kind])return this.texC[kind];const r=(i)=>{const x=Math.sin(i*12.9898)*43758.5453;return x-Math.floor(x)};
    const draw={
      wood:(g,w,h)=>{const pl=10,ph=h/pl;for(let i=0;i<pl;i++){for(let k=-1;k<4;k++){const off=(i%2)*w/6+k*w/3,l=30+r(i*7+k)*12;g.fillStyle=`hsl(${26+r(i+k*3)*6},${36+r(i*3+k)*10}%,${l}%)`;g.fillRect(off,i*ph,w/3,ph);
        for(let s=0;s<16;s++){g.strokeStyle=`rgba(50,25,8,${0.04+r(s*7+i+k)*0.08})`;g.lineWidth=1+r(s+i)*1.5;g.beginPath();const y=i*ph+r(s*37+k)*ph;g.moveTo(off,y);g.bezierCurveTo(off+w/9,y+r(s)*6-3,off+w/5,y-4,off+w/3,y+r(s+1)*4-2);g.stroke()}
        g.fillStyle='rgba(0,0,0,.4)';g.fillRect(off,i*ph,2,ph)}g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,i*ph,w,2)}},
      concrete:(g,w,h)=>{g.fillStyle='#8f949b';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=110+r(i)*70|0;g.fillStyle=`rgba(${v},${v},${v+4},${0.08+r(i*3)*0.1})`;g.fillRect(r(i*5)*w,r(i*7)*h,1+r(i*11)*3,1+r(i*13)*3)}
        g.strokeStyle='rgba(60,64,70,.35)';g.lineWidth=2;for(let x=0;x<=w;x+=w/2)for(let y=0;y<=h;y+=h/2){g.strokeRect(x,y,w/2,h/2)}for(const[x,y]of[[.12,.15],[.38,.15],[.62,.15],[.88,.15],[.12,.65],[.38,.65],[.62,.65],[.88,.65]]){g.fillStyle='rgba(50,52,56,.5)';g.beginPath();g.arc(x*w,y*h,4,0,7);g.fill()}},
      stone:(g,w,h)=>{g.fillStyle='#e7e5e4';g.fillRect(0,0,w,h);for(let i=0;i<60;i++){g.strokeStyle=`rgba(120,113,108,${0.05+r(i)*0.12})`;g.lineWidth=1+r(i*2)*2;g.beginPath();let x=r(i*3)*w,y=r(i*5)*h;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(r(i*9+k)-0.5)*120;y+=(r(i*7+k)-0.3)*90;g.lineTo(x,y)}g.stroke()}
        g.strokeStyle='rgba(87,83,78,.35)';g.lineWidth=3;for(let x=0;x<=w;x+=w/2)for(let y=0;y<=h;y+=h/2)g.strokeRect(x,y,w/2,h/2)},
      epoxy:(g,w,h)=>{g.fillStyle='#2a2f38';g.fillRect(0,0,w,h);for(let i=0;i<5000;i++){g.fillStyle=`rgba(255,255,255,${r(i)*0.05})`;g.fillRect(r(i*3)*w,r(i*7)*h,2,2)}},
      carpet:(g,w,h)=>{g.fillStyle='#1b2a44';g.fillRect(0,0,w,h);for(let i=0;i<14000;i++){g.fillStyle=`rgba(${r(i)>0.5?120:20},${r(i)>0.5?150:30},${r(i)>0.5?200:60},.08)`;g.fillRect(r(i*3)*w,r(i*7)*h,2,2)}g.strokeStyle='rgba(240,214,138,.12)';g.lineWidth=3;for(let x=0;x<w;x+=64){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}},
      rug:(g,w,h)=>{g.fillStyle='#7c4a2d';g.fillRect(0,0,w,h);g.strokeStyle='#e9d5b7';g.lineWidth=14;g.strokeRect(30,30,w-60,h-60);g.lineWidth=4;g.strokeRect(60,60,w-120,h-120);for(let i=0;i<12000;i++){g.fillStyle=`rgba(0,0,0,${r(i)*0.08})`;g.fillRect(r(i*3)*w,r(i*7)*h,2,2)}
        g.fillStyle='rgba(233,213,183,.5)';for(let x=110;x<w-100;x+=80)for(let y=110;y<h-100;y+=80){g.beginPath();g.moveTo(x,y-14);g.lineTo(x+14,y);g.lineTo(x,y+14);g.lineTo(x-14,y);g.fill()}},
      felt:(g,w,h)=>{g.fillStyle='#0f6b3e';g.fillRect(0,0,w,h);for(let i=0;i<8000;i++){g.fillStyle=`rgba(0,0,0,${r(i)*0.06})`;g.fillRect(r(i*3)*w,r(i*7)*h,2,2)}}}[kind];
    const s=this.canvas(512,512,draw);s.t.wrapS=s.t.wrapT=THREE.RepeatWrapping;if(rep)s.t.repeat.set(rep[0],rep[1]);return this.texC[kind]=s.t},
  // Bản đồ pháp tuyến (normal map) dựng từ chính họa tiết: rãnh ván gỗ, vân bê tông, sợi thảm nổi khối dưới ánh đèn
  nrm(kind,str=2.2){this.nC=this.nC||{};if(this.nC[kind])return this.nC[kind];const{THREE}=this.T,src=this.tex(kind).image,w=src.width,h=src.height,sd=src.getContext('2d').getImageData(0,0,w,h).data;
    const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),o=g.createImageData(w,h),L=(x,y)=>{x=(x+w)%w;y=(y+h)%h;const i=(y*w+x)*4;return(sd[i]*0.3+sd[i+1]*0.59+sd[i+2]*0.11)/255};
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=(L(x+1,y)-L(x-1,y))*str,dy=(L(x,y+1)-L(x,y-1))*str,l=Math.hypot(dx,dy,1),i=(y*w+x)*4;o.data[i]=(-dx/l*0.5+0.5)*255;o.data[i+1]=(dy/l*0.5+0.5)*255;o.data[i+2]=(1/l*0.5+0.5)*255;o.data[i+3]=255}
    g.putImageData(o,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=this.aniso||4;return this.nC[kind]=t},
  nrmRep(kind,rep,k){const t=this.nrm(kind).clone();t.needsUpdate=true;t.repeat.set(rep[0],rep[1]);return t},
  NSC:{carpet:1.3,stone:0.35,epoxy:0.25,rug:0.9,felt:0.5,wood:0.55,concrete:0.7},
  floorPatch(x0,x1,z0,z1,kind,rep,o={}){const{THREE}=this.T,t=this.tex(kind).clone();t.needsUpdate=true;t.repeat.set(rep[0],rep[1]);
    const m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),this.mat('#ffffff',{map:t,r:o.r!=null?o.r:0.5,env:o.env!=null?o.env:0.6,noCache:true}));
    if(this.NSC[kind]){m.material.normalMap=this.nrmRep(kind,rep);m.material.normalScale.setScalar(this.NSC[kind])}m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,o.y||0.004,(z0+z1)/2);m.receiveShadow=true;this.S.add(m);return m},
  // ---------- Lưới tìm đường (A*) ----------
  GRID:{x0:-16,z0:-11,cs:0.35,nx:92,nz:63},
  gridInit(){this.GRID.b=new Uint8Array(this.GRID.nx*this.GRID.nz)},
  // chặn một hình chữ nhật (tâm x,z; rộng w theo x, sâu d theo z; xoay ry) + lề an toàn
  block(x,z,w,d,ry=0,pad=0.28){const G=this.GRID,c=Math.abs(Math.cos(ry)),s=Math.abs(Math.sin(ry)),W=w*c+d*s,D=w*s+d*c;
    const i1=Math.max(0,Math.floor((x-W/2-pad-G.x0)/G.cs)),i2=Math.min(G.nx-1,Math.floor((x+W/2+pad-G.x0)/G.cs)),j1=Math.max(0,Math.floor((z-D/2-pad-G.z0)/G.cs)),j2=Math.min(G.nz-1,Math.floor((z+D/2+pad-G.z0)/G.cs));
    for(let j=j1;j<=j2;j++)for(let i=i1;i<=i2;i++)G.b[j*G.nx+i]=1},
  cellOf(x,z){const G=this.GRID;return[Math.max(0,Math.min(G.nx-1,Math.floor((x-G.x0)/G.cs))),Math.max(0,Math.min(G.nz-1,Math.floor((z-G.z0)/G.cs)))]},
  free(i,j){const G=this.GRID;return i>=0&&j>=0&&i<G.nx&&j<G.nz&&!G.b[j*G.nx+i]},
  nearFree(i,j){if(this.free(i,j))return[i,j];for(let r=1;r<12;r++)for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;if(this.free(i+di,j+dj))return[i+di,j+dj]}return[i,j]},
  los(a,b){const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(d/0.12);for(let k=1;k<n;k++){const t=k/n,[i,j]=this.cellOf(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t);if(!this.free(i,j))return false}return true},
  path(a,b){
    const G=this.GRID,nx=G.nx,[si,sj]=this.nearFree(...this.cellOf(a.x,a.z)),[gi,gj]=this.nearFree(...this.cellOf(b.x,b.z)),S=sj*nx+si,E=gj*nx+gi;
    const g=new Float32Array(nx*G.nz).fill(1e9),from=new Int32Array(nx*G.nz).fill(-1),closed=new Uint8Array(nx*G.nz),heap=[];
    const push=(f,n)=>{heap.push([f,n]); /* (điểm f, ô n) — trước đây khai báo ngược thứ tự tham số nên A* dừng ngay bước đầu và nhân viên đi thẳng xuyên vật cản */let k=heap.length-1;while(k){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p}};
    const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m}}return top};
    const h=n=>{const i=n%nx,j=n/nx|0;return Math.hypot(i-gi,j-gj)};g[S]=0;push(h(S),S);let it=0;
    /* 60000 bước: đủ cho đường dài nhất (sảnh → góc Lab) qua nhiều vách / cửa; trước đây 9000 bước có thể bỏ cuộc và đi thẳng xuyên tường */while(heap.length&&it++<60000){const[,n]=pop();if(closed[n])continue;closed[n]=1;if(n===E)break;const i=n%nx,j=n/nx|0;
      for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){if(!di&&!dj)continue;const a2=i+di,b2=j+dj;if(!this.free(a2,b2))continue;if(di&&dj&&(!this.free(i+di,j)||!this.free(i,j+dj)))continue;
        const m=b2*nx+a2,ng=g[n]+(di&&dj?1.414:1);if(ng<g[m]){g[m]=ng;from[m]=n;push(ng+h(m),m)}}}
    const pts=[];let n=E;if(from[E]<0&&E!==S)return[{x:b.x,z:b.z}];while(n>=0&&n!==S){pts.push({x:G.x0+(n%nx+0.5)*G.cs,z:G.z0+((n/nx|0)+0.5)*G.cs});n=from[n]}pts.reverse();pts.push({x:b.x,z:b.z});
    const out=[];let cur={x:a.x,z:a.z};for(let k=0;k<pts.length;k++){if(k===pts.length-1||!this.los(cur,pts[k+1])){out.push(pts[k]);cur=pts[k]}}return out}, // kéo căng đường đi cho mượt
  // ---------- Ánh sáng: nắng qua vách kính + LED dải ----------
  lights(){
    const{THREE}=this.T,S=this.S;
    this.hemi=new THREE.HemisphereLight('#dfe9ff','#3a2f26',0.45);S.add(this.hemi);
    const d=this.sun=new THREE.DirectionalLight('#fff1d6',2.2);d.position.set(-24,17,6);d.target.position.set(-2,0,0);S.add(d.target);d.castShadow=true;const sm=this.mob?1024:2048;d.shadow.mapSize.set(sm,sm);
    Object.assign(d.shadow.camera,{left:-19,right:19,top:14,bottom:-14,near:1,far:70});d.shadow.bias=-0.0005;d.shadow.normalBias=0.02;d.shadow.radius=4;S.add(d);
    this.lamps=[];const pl=(x,y,z,c,i,dist)=>{const p=new THREE.PointLight(c,i,dist,2);p.position.set(x,y,z);S.add(p);this.lamps.push({p,i});return p};
    const many=!this.mob;
    pl(-2,3.1,-4,'#dbeafe',9,11);pl(2,3.1,-2,'#ffe4c4',8,11);if(many){pl(-11.4,3,-6.5,'#a5b4fc',7,9);pl(11.3,3,-7,'#fff1d6',7,9)}
    pl(-10.6,2.8,6,'#ffd7a0',9,11);pl(11,3,6.5,'#e0f2fe',7,10);
    // dải LED treo trần
    const warm=this.mat('#fff4e0',{e:'#ffd9a0',ei:2.2}),cool=this.mat('#e0f2ff',{e:'#7cc7ff',ei:2.4}),cab=this.mat('#111827',{m:0.6,r:0.4}),hou=this.mat('#c7ccd4',{m:0.8,r:0.3});
    const strip=(x,z,len,m,ry=0,y=3.75)=>{const g=this.group(x,z,ry,y);this.box(len,0.025,0.05,cab,0,0.02,0,{cs:false},g);this.box(len-0.06,0.01,0.04,m,0,0.004,0,{cs:false},g);
      for(const dx of[-len/2+0.3,len/2-0.3])this.box(0.01,4.2-y,0.01,cab,dx,(4.2-y)/2,0,{cs:false},g)};
    for(const z of[-6.2,-2.2])strip(0,z,10.5,cool);strip(0,-4.2,10.5,warm);
    for(const z of[-8.6,-5.6])strip(-11.4,z,7,cool);for(const z of[-8.6,-5.6])strip(11.4,z,7.2,warm);
    strip(11,5.2,6.5,cool);strip(11,8.6,6.5,cool);
    for(const[x,z]of[[-12.6,9.2],[-10.4,9.2],[-10.6,4.4],[-9.4,4.4],[-13.4,4.6],[-13.4,6.2]]){const y=3.0;this.cyl(0.005,0.005,1.2,cab,x,y+0.6,z);this.sph(0.12,this.mat('#fff7e6',{e:'#ffcf8a',ei:2.2,r:0.3}),x,y,z,{seg:20})}},
  // ---------- Vỏ tòa nhà: sàn, tường bê tông, vách kính, bầu trời thành phố ----------
  room(){
    const{THREE}=this.T,S=this.S,H=4.2;
    // sàn gỗ bóng (phản chiếu môi trường) + vật liệu riêng từng khu
    // sàn gỗ phủ bóng (clearcoat): ánh màn hình, đèn trần in vệt sáng lên mặt sàn; rãnh ván nổi khối nhờ normal map
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(32,22),new THREE.MeshPhysicalMaterial({map:(()=>{const t=this.tex('wood').clone();t.needsUpdate=true;t.repeat.set(6,4);return t})(),
      normalMap:this.nrmRep('wood',[6,4]),normalScale:new THREE.Vector2(0.55,0.55),roughness:0.36,clearcoat:0.6,clearcoatRoughness:0.14,envMapIntensity:1.0}));
    fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;S.add(fl);
    this.floorPatch(-16,-7,-11,-3.5,'epoxy',[3,3],{r:0.18,env:1.2});
    this.floorPatch(7,16,-11,-3.5,'carpet',[3,3],{r:0.95,env:0.2});
    this.floorPatch(6,16,2.2,11,'stone',[3,3],{r:0.32,env:0.75});
    this.floorPatch(-13.6,-8.6,8.3,10.9,'rug',[1,1],{r:0.95,env:0.1,y:0.008});
    const conc=this.mat('#ffffff',{map:(()=>{const t=this.tex('concrete').clone();t.needsUpdate=true;t.repeat.set(4,1);return t})(),r:0.92,env:0.25,noCache:true});
    const conc2=this.mat('#ffffff',{map:(()=>{const t=this.tex('concrete').clone();t.needsUpdate=true;t.repeat.set(3,1);return t})(),r:0.92,env:0.25,noCache:true});
    conc.normalMap=this.nrmRep('concrete',[4,1]);conc.normalScale.setScalar(0.7);conc2.normalMap=this.nrmRep('concrete',[3,1]);conc2.normalScale.setScalar(0.7);
    this.box(32,H,0.3,conc,0,H/2,-11.15,{cs:false});this.box(0.3,H,16.55,conc2,16.15,H/2,-2.875,{cs:false});this.box(0.3,H,2.55,conc2,16.15,H/2,9.875,{cs:false});this.box(0.3,H-2.75,3.2,conc2,16.15,2.75+(H-2.75)/2,7.0,{cs:false});
    this.block(0,-11.1,32,0.3,0,0.3);this.block(16.1,0,0.3,22,0,0.3);this.block(-16.1,0,0.3,22,0,0.3);
    this.walls=[];this.wall([-16,-11],[16,-11],H);this.wall([16,-11],[16,5.4],H);this.wall([16,8.6],[16,11],H);this.wall([-16,-11],[-16,11],H,{kind:'glass'});
    // vách kính khổng lồ (tường trái) + khung nhôm: nắng chiếu qua đổ bóng song cửa
    const fr=this.mat('#2b3240',{m:0.7,r:0.35});
    this.box(0.08,H,22,this.glass(),-16,H/2,0,{cs:false});
    for(let z=-11;z<=11.01;z+=2.75)this.box(0.14,H,0.1,fr,-16,H/2,z,{cs:true});this.box(0.14,0.12,22,fr,-16,0.06,0);this.box(0.14,0.16,22,fr,-16,H-0.08,0,{cs:true});this.box(0.12,0.06,22,fr,-16,2.7,0,{cs:true});
    // phố bên ngoài (đổi ngày / đêm theo giờ thật)
    this.sky=this.canvas(2048,768,(g,w,h)=>this.drawSky(g,w,h));
    const sk=new THREE.Mesh(new THREE.PlaneGeometry(90,34),new THREE.MeshBasicMaterial({map:this.sky.t,fog:false}));sk.position.set(-34,9,0);sk.rotation.y=Math.PI/2;S.add(sk);const sk2=sk.clone();sk2.position.set(26,9,7);sk2.rotation.y=-Math.PI/2;S.add(sk2);
    this.cyl(0.06,0.06,H,'#d6d3d1',-16,H/2,-11,{});
    // phào chân tường
    this.box(32,0.1,0.04,'#3f3f46',0,0.05,-10.98);this.box(0.04,0.1,22,'#3f3f46',15.98,0.05,0);
    // cột bê tông giữa sàn
    for(const[x,z]of[[-6.6,1.4],[6.6,1.4]]){this.box(0.6,H,0.6,conc2,x,H/2,z,{cs:true});this.block(x,z,0.6,0.6)}
    // nhãn khu vực in trên sàn
    for(const Z of this.ZONES){const c=this.canvas(1024,160,(g,w,h)=>{g.clearRect(0,0,w,h);g.font='800 84px system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle=Z.c;g.globalAlpha=0.85;g.fillText(Z.n.toUpperCase(),w/2,h/2)});
      const m=new THREE.Mesh(new THREE.PlaneGeometry(4.2,0.66),new THREE.MeshBasicMaterial({map:c.t,transparent:true,depthWrite:false,opacity:0.55}));m.rotation.x=-Math.PI/2;
      const lp={trade:[0,0.15],lab:[-11.4,-3.95],exec:[11.4,-3.95],lounge:[-10.8,2.75],lobby:[10.6,2.75]}[Z.k];m.position.set(lp[0],0.012,lp[1]);S.add(m)}},
  drawSky(g,w,h){
    const ph=this.phase(),night=ph==='night',dusk=ph==='dusk';
    const gr=g.createLinearGradient(0,0,0,h);if(night){gr.addColorStop(0,'#030716');gr.addColorStop(1,'#1a2552')}else if(dusk){gr.addColorStop(0,'#4c3a8f');gr.addColorStop(0.6,'#f59e6b');gr.addColorStop(1,'#fde3a7')}else{gr.addColorStop(0,'#3d9ae0');gr.addColorStop(1,'#d6f0ff')}
    g.fillStyle=gr;g.fillRect(0,0,w,h);const r=i=>{const x=Math.sin(i*12.9898)*43758.5453;return x-Math.floor(x)};
    if(night)for(let i=0;i<220;i++){g.fillStyle=`rgba(255,255,255,${r(i)*0.8})`;g.fillRect(r(i*3)*w,r(i*7)*h*0.45,2,2)}
    else{g.fillStyle='rgba(255,255,255,.8)';for(let i=0;i<7;i++){const x=r(i*5)*w,y=40+r(i*9)*160,s=0.7+r(i)*1.2;g.beginPath();g.ellipse(x,y,90*s,26*s,0,0,7);g.ellipse(x+60*s,y-16*s,60*s,24*s,0,0,7);g.fill()}}
    for(const layer of[0,1]){let x=-20,k=layer*31;while(x<w){const bw=60+r(k)*110,bh=h*(layer?0.3+r(k*3)*0.35:0.18+r(k*5)*0.2);
      g.fillStyle=night?(layer?'#0a1020':'#121a30'):dusk?(layer?'#2f2441':'#4a3a5c'):(layer?'#4e5f75':'#7b8da3');g.fillRect(x,h-bh,bw,bh);
      if(layer)for(let wy=h-bh+12;wy<h-10;wy+=18)for(let wx=x+8;wx<x+bw-10;wx+=14){const on=night?r(wx*7+wy*3+k)<0.42:r(wx+wy+k)<0.1;if(on){g.fillStyle=night?'#ffd780':'#cfe2f5';g.fillRect(wx,wy,7,9)}}
      if(layer&&r(k*11)<0.25){g.fillStyle=night?'#ef4444':'#94a3b8';g.fillRect(x+bw/2-1,h-bh-26,3,26)}x+=bw+6;k++}}
    this.tower(g,w,h,night,dusk)},
  TOWER_MARK:1,
  // tháp chọc trời bậc thang ở đường chân trời (gợi phố Sài Gòn về đêm): cửa sổ sáng, đèn đỏ đỉnh tháp
  tower(g,w,h,night,dusk){const x=w*0.63,b=h,tw=86;const tiers=[[1,0.0,0.36],[0.82,0.36,0.6],[0.62,0.6,0.78],[0.42,0.78,0.88]];
    g.fillStyle=night?'#0d1428':dusk?'#33284a':'#5d6f86';for(const[k,a,c]of tiers){const ww=tw*k;g.fillRect(x-ww/2,b-h*c,ww,h*(c-a)+1)}
    g.fillRect(x-2,b-h*0.97,4,h*0.09);if(night){for(const[k,a,c]of tiers){const ww=tw*k;for(let y=b-h*c+8;y<b-h*a-6;y+=11)for(let xx=x-ww/2+6;xx<x+ww/2-6;xx+=9){if(Math.sin(xx*7.1+y*3.3)>-0.1){g.fillStyle=Math.sin(xx+y)>0.6?'#fde68a':'#93c5fd';g.globalAlpha=0.75;g.fillRect(xx,y,5,6);g.globalAlpha=1}}}
      g.strokeStyle='rgba(56,189,248,.8)';g.lineWidth=2;for(const[k,,c]of tiers){const ww=tw*k;g.beginPath();g.moveTo(x-ww/2,b-h*c);g.lineTo(x+ww/2,b-h*c);g.stroke()}g.fillStyle='#ef4444';g.beginPath();g.arc(x,b-h*0.975,4,0,7);g.fill()}},
  // ---------- Khu 1: Sàn giao dịch trung tâm ----------
  zoneTrade(){
    const{THREE}=this.T;
    // video wall + đồng hồ thế giới trên tường
    this.wallScr=this.canvas(1600,460,(g,w,h)=>this.drawWall(g,w,h));
    this.box(9.4,2.8,0.14,'#06090f',0,2.15,-10.93,{r:0.3,m:0.4,cs:false});this.screen(9.2,2.62,this.wallScr.t,0,2.15,-10.85,0,{em:1.1});
    this.box(9.6,0.06,0.25,'#1f2937',0,0.72,-10.86,{m:0.6});
    this.clocks=this.canvas(1600,240,(g,w,h)=>this.drawClocks(g,w,h));this.box(7.2,1.06,0.08,'#0b1220',0,3.94,-10.95,{cs:false});this.screen(7.1,1.0,this.clocks.t,0,3.94,-10.9,0,{em:0.9});
    // 6 bàn cong, mỗi bàn 3 màn hình cong
    for(const id of['radar','rsi2','smc','btc100','trader','news']){const[x,z,ry]=this.SEATS[id];this.curvedDesk(id,x,z,ry,3)}
    // thảm chống ồn dưới cụm bàn
    this.floorPatch(-5.8,5.8,-7.2,-0.6,'carpet',[2,1],{r:0.95,env:0.15,y:0.006})},
  curvedDesk(id,x,z,ry,nMon,o={}){
    const{THREE}=this.T,g=this.group(x,z,ry),top=this.mat('#ffffff',{map:this.tex('wood'),r:0.32,env:0.8}),dark=this.mat('#1c2230',{m:0.5,r:0.35});
    if(!top.normalMap){top.normalMap=this.nrm('wood');top.normalScale.setScalar(0.35)}this.deskG=this.deskG||{};this.deskG[id]=g;
    this.extrude(this.arcShape(0.5,1.2,-1.05,1.05),0.045,o.top||top,0,0.72,0,{},g);
    this.cyl(1.16,1.16,0.62,this.mat('#2a3142',{r:0.6,ds:true}),0,0.4,0,{open:true,t0:-1.0,tl:2.0,cs:true},g);
    for(const a of[-0.9,0.9])this.box(0.05,0.7,0.5,dark,Math.sin(a)*0.85,0.36,Math.cos(a)*0.85,{ry:a},g);
    const led=this.mesh(new THREE.TorusGeometry(1.2,0.01,6,48,2.1),this.mat('#38d6b4',{e:'#38d6b4',ei:1.6}),0,0.755,0,{rx:Math.PI/2,rz:Math.PI/2-1.05},g); // LED viền bàn
    // màn hình
    const angs=nMon===3?[-0.62,0,0.62]:nMon===2?[-0.32,0.32]:[0];this.mons=this.mons||{};this.mons[id]=[];
    angs.forEach((a,k)=>{const R=0.98,mx=Math.sin(a)*R,mz=Math.cos(a)*R,kind=nMon===1?'status':k===(nMon===3?1:0)?'chart':k===0?'status':this.monKind(id);
      const sc=this.canvas(384,224,(cg,w,h)=>this.drawMon(cg,w,h,id,kind),{live:1});
      const b=this.mesh(this.bent(0.66,0.4,0.05),'#06090f',mx,1.17,mz,{ry:a+Math.PI,r:0.3,m:0.4,ds:true},g);b.position.x+=Math.sin(a)*0.012;b.position.z+=Math.cos(a)*0.012;
      this.screen(0.63,0.37,sc.t,mx,1.17,mz,a+Math.PI,{curve:0.05,em:1.15},g);this.box(0.04,0.38,0.04,dark,Math.sin(a)*1.03,0.95,Math.cos(a)*1.03,{},g);this.mons[id].push(sc)});
    this.box(0.46,0.018,0.15,'#1f2937',0,0.78,0.62,{r:0.4},g);this.box(0.07,0.02,0.11,'#1f2937',0.36,0.78,0.64,{r:0.3},g);this.box(0.24,0.004,0.2,'#111827',0.36,0.772,0.64,{cs:false},g); // bàn phím, chuột, lót chuột
    // phụ kiện: cốc cà phê (bốc khói), sổ tay, tai nghe, cây nhỏ
    const r=(x*7+z*3)|0,cupC=['#ef4444','#f8fafc','#38d6b4','#f59e0b'][Math.abs(r)%4];
    const cupX=-0.62,cupZ=0.66;this.cyl(0.042,0.036,0.1,cupC,cupX,0.83,cupZ,{r:0.3},g);this.cyl(0.036,0.036,0.005,'#3b2416',cupX,0.875,cupZ,{},g);
    const wp=new THREE.Vector3(cupX,0.9,cupZ);g.updateMatrixWorld(true);g.localToWorld(wp);if(Math.abs(r)%3!==1)this.steamAt(wp.x,wp.y,wp.z,0.6);
    this.box(0.2,0.014,0.27,['#1e3a8a','#7c2d12','#14532d'][Math.abs(r)%3],0.66,0.78,0.5,{ry:0.3},g);
    if(Math.abs(r)%2===0){this.cyl(0.07,0.07,0.012,'#111827',-0.78,0.79,0.32,{},g);this.mesh(new THREE.TorusGeometry(0.07,0.012,8,20,Math.PI),'#111827',-0.78,0.8,0.32,{rx:-Math.PI/2},g)}
    else{this.cyl(0.05,0.04,0.08,'#f5f5f4',-0.8,0.82,0.3,{},g);for(let i=0;i<5;i++)this.sph(0.035,'#16a34a',-0.8+Math.sin(i*1.3)*0.03,0.9+i*0.012,0.3+Math.cos(i*1.3)*0.03,{seg:8},g)}
    // ghế công thái học
    const ch=this.chair(0,0,0,g);this.chairs=this.chairs||{};this.chairs[id]=ch;
    // vùng cấm đi xuyên: mặt bàn phía trước ghế
    const fx=x+Math.sin(ry)*0.85,fz=z+Math.cos(ry)*0.85;this.block(fx,fz,2.3,0.75,ry,0.22);return g},
  monKind(id){return{trader:'orders',news:'news',lab:'code',calib:'code',sync:'code',risk:'risk',acc:'pnl',radar:'heat'}[id]||'heat'},
  chair(x,z,ry,par){
    const g=this.group(x,z,ry,0,par),blk=this.mat('#1f2937',{r:0.55}),mesh=this.mat('#334155',{r:0.8}),chr=this.mat('#9ca3af',{m:0.85,r:0.25});
    this.box(0.5,0.08,0.48,blk,0,0.47,0,{cs:true},g);this.mesh(this.bent(0.48,0.62,-0.04),mesh,0,0.86,-0.26,{cs:true},g).material.side=this.T.THREE.DoubleSide;
    this.box(0.28,0.14,0.06,blk,0,1.25,-0.28,{},g);for(const dx of[-0.27,0.27]){this.box(0.04,0.2,0.04,blk,dx,0.58,-0.02,{},g);this.box(0.06,0.03,0.26,blk,dx,0.69,0.02,{},g)}
    this.cyl(0.028,0.028,0.36,chr,0,0.27,0,{},g);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const b=this.box(0.3,0.03,0.05,chr,Math.sin(a)*0.15,0.07,Math.cos(a)*0.15,{},g);b.rotation.y=a+Math.PI/2;this.sph(0.03,'#111827',Math.sin(a)*0.29,0.03,Math.cos(a)*0.29,{seg:8},g)}
    return g},
  // ---------- Khu 2: Tech & Algo Lab ----------
  zoneLab(){
    const{THREE}=this.T;this.partition(-7,-10.85,-7,-3.56);this.partition(-15.85,-3.5,-9.75,-3.5);this.archway(-9.75,-3.5,-7.0,-3.5,'TECH & ALGO LAB','#a78bfa'); // khu mở: vòm 2,75 m không cửa
    // tủ máy chủ: đèn LED nhấp nháy (InstancedMesh cho nhẹ)
    const N=5*14*3,led=new THREE.InstancedMesh(new THREE.BoxGeometry(0.035,0.018,0.01),new THREE.MeshBasicMaterial({toneMapped:false}),N);let k=0;const col=new THREE.Color(),M=new THREE.Matrix4();
    for(let r=0;r<5;r++){const x=-14.9+r*1.0,z=-10.35;this.box(0.8,2.2,0.9,this.mat('#0e1118',{m:0.5,r:0.35}),x,1.1,z,{cs:true});this.box(0.76,2.1,0.02,this.mat('#1a1f2b',{m:0.6,r:0.3}),x,1.1,z+0.455,{cs:false});
      for(let u=0;u<14;u++){this.box(0.7,0.02,0.01,'#2a3140',x,0.25+u*0.13,z+0.468,{cs:false});for(let c=0;c<3;c++){M.makeTranslation(x-0.28+c*0.05,0.29+u*0.13,z+0.47);led.setMatrixAt(k,M);led.setColorAt(k,col.set('#22c55e'));k++}}
      this.block(x,z,0.8,0.9)}
    this.S.add(led);this.leds=led;this.ledN=N;this.cyl(0.18,0.18,0.03,this.mat('#38bdf8',{e:'#38bdf8',ei:1.4}),-12.9,2.23,-10.35,{cs:false});
    // bảng kính viết công thức / thuật toán (đứng cạnh vách kính)
    const bd=this.canvas(1024,640,(g,w,h)=>this.drawBoard(g,w,h));const bg=this.group(-15.35,-7.6,Math.PI/2);
    this.box(0.04,1.5,2.6,this.glass({tint:'#e0f2fe',op:0.22}),0,1.55,0,{ry:Math.PI/2,cs:false},bg);this.screen(2.5,1.42,bd.t,0,1.55,0.03,0,{tr:1,em:1.3},bg);
    for(const dx of[-1.25,1.25])this.box(0.05,1.0,0.05,'#94a3b8',dx,0.5,0,{m:0.8},bg);this.box(2.6,0.04,0.12,'#94a3b8',0,0.8,0.04,{m:0.8},bg);this.block(-15.35,-7.6,0.3,2.6);
    for(const id of['lab','calib','sync']){const[x,z,ry]=this.SEATS[id];this.curvedDesk(id,x,z,ry,2,{top:this.mat('#e5e7eb',{r:0.35,env:0.7})})}
    // cáp mạng, ổ cắm sàn
    for(let i=0;i<4;i++)this.cyl(0.02,0.02,4.6,'#38bdf8',-14.9+i*1.2,0.03,-8.0,{rx:Math.PI/2,cs:false})},
  // ================= Kiến trúc: tường, vách kính, cửa (đơn vị mét, trục x ngang, z sâu) =================
  // Mọi tường / vách đều ghi vào this.walls (đoạn thẳng 2D + chiều cao) — dùng chung cho camera WASD va chạm;
  // đồng thời chặn lưới A* để nhân viên tự đi không xuyên tường. Cửa chỉ chặn camera khi đang đóng.
  wall(a,b,h,o={}){(this.walls=this.walls||[]).push({a,b,h,door:o.door||null,kind:o.kind||'wall'})},
  alu(){return this.mats.alu||(this.mats.alu=this.mat('#16191e',{m:0.55,r:0.58,env:0.6}))}, // nhôm sơn tĩnh điện đen mờ
  frost(){return this.mats.frost||(this.mats.frost=this.mat('#f1f5f9',{op:0.42,r:0.9,env:0.2}))}, // decal mờ (sand-blast) trên kính
  // vách kính cường lực 12 mm, khung nhôm đen mờ mảnh, 2 đường decal mờ ngang tầm mắt; khung đổ bóng, kính để ánh sáng đi qua
  partition(x1,z1,x2,z2,o={}){
    const L=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,ry=Math.atan2(x2-x1,z2-z1)-Math.PI/2,g=this.group(cx,cz,ry),H=o.h||2.9,fr=this.alu();
    this.box(L,H-0.1,0.012,this.glass(),0,H/2,0,{cs:false},g);
    this.box(L,0.06,0.07,fr,0,H-0.03,0,{cs:true},g);this.box(L,0.07,0.07,fr,0,0.035,0,{cs:true},g); // ray trên / chân
    for(const y of[1.02,1.5])this.box(L-0.02,y===1.02?0.05:0.012,0.014,this.frost(),0,y,0,{cs:false},g);
    const n=Math.max(1,Math.round(L/1.5));for(let k=0;k<=n;k++)this.box(0.035,H,0.06,fr,-L/2+k*L/n,H/2,0,{cs:true},g); // đố đứng
    this.block(cx,cz,L,0.07,ry,o.pad!=null?o.pad:0.18);this.wall([x1,z1],[x2,z2],H,{kind:'glass'});return g},
  // khung vòm mở (không cửa) cho khu mở: 2 trụ nhôm + dầm đầu có dải LED + biển tên hai mặt
  archway(x1,z1,x2,z2,label,col){
    const L=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,ry=Math.atan2(x2-x1,z2-z1)-Math.PI/2,g=this.group(cx,cz,ry),fr=this.alu(),H=2.9;
    for(const d of[-L/2,L/2]){this.box(0.12,H,0.16,fr,d,H/2,0,{cs:true},g);this.block(x1+(x2-x1)*(d/L+0.5),z1+(z2-z1)*(d/L+0.5),0.14,0.18,ry,0.12)}
    this.box(L+0.12,0.34,0.16,fr,0,H-0.17,0,{cs:true},g);this.box(L-0.1,0.018,0.05,this.mat(col,{e:col,ei:2.2}),0,H-0.35,0,{cs:false},g);
    const c=this.canvas(512,64,(gg,w,h)=>{gg.fillStyle='#0b0f16';gg.fillRect(0,0,w,h);gg.font='800 34px system-ui';gg.textAlign='center';gg.fillStyle=col;gg.fillText(label,w/2,44)});
    for(const s of[1,-1])this.screen(Math.min(2.2,L*0.8),0.26,c.t,0,H-0.17,s*0.085,s>0?0:Math.PI,{em:1.25},g);return g},
  // cửa kính mở quay 1 cánh trong khung nhôm, khóa thông minh, tay nắm inox dọc, 3 bản lề; tâm xoay đặt đúng trục bản lề
  //   doorway nằm trên đường z = const từ x1 tới x2; hinge: 'x1' | 'x2'; swing: -1 mở vào phía z âm, +1 phía z dương
  swingDoor(x1,x2,z,o={}){
    const{THREE}=this.T,fr=this.alu(),inox=this.mat('#d6dbe1',{m:1,r:0.18,env:1.2}),H=2.25,top=2.9,W=Math.abs(x2-x1)-0.08,hx=o.hinge==='x2'?x2-0.04:x1+0.04,dir=o.hinge==='x2'?-1:1;
    const g=this.group(0,0,0);
    // khung bao: 2 thanh đứng, đố ngang trên cửa, ô kính cố định phía trên (transom)
    for(const x of[x1,x2])this.box(0.06,top,0.1,fr,x,top/2,z,{cs:true},g);this.box(Math.abs(x2-x1)+0.06,0.06,0.1,fr,(x1+x2)/2,H+0.03,z,{cs:true},g);
    this.box(Math.abs(x2-x1)-0.06,top-H-0.1,0.012,this.glass(),(x1+x2)/2,(top+H)/2+0.02,z,{cs:false},g);
    if(o.label){const c=this.canvas(256,64,(gg,w,h)=>{gg.clearRect(0,0,w,h);gg.font='800 30px system-ui';gg.textAlign='center';gg.fillStyle='rgba(241,245,249,.85)';gg.fillText(o.label,w/2,42)});
      for(const s of[1,-1])this.screen(0.9,0.22,c.t,(x1+x2)/2,(top+H)/2+0.02,z+s*0.009,s>0?0:Math.PI,{em:0.6,tr:1},g)}
    // cánh cửa: nhóm con gốc tại trục bản lề → xoay quanh y đúng như cửa thật
    const pv=this.group(hx,z,0,0,g),leaf=this.group(dir*W/2,0,0,0,pv);
    this.box(W,H-0.03,0.012,this.glass({tint:'#e0f2fe',op:0.09}),0,H/2,0,{cs:false},leaf);
    for(const y of[0.07,H-0.06])this.box(W,0.1,0.04,fr,0,y,0,{cs:true},leaf); // kẹp kính trên/dưới (patch fitting)
    for(const y of[1.02,1.5])this.box(W-0.06,y===1.02?0.05:0.012,0.015,this.frost(),0,y,0,{cs:false},leaf);
    for(const y of[0.3,1.12,1.95])this.cyl(0.018,0.018,0.11,inox,-dir*W/2,y,0,{},leaf); // bản lề
    const hX=dir*(W/2-0.09);for(const s of[1,-1]){this.cyl(0.013,0.013,0.95,inox,hX,1.05,s*0.05,{cs:true},leaf);for(const y of[0.7,1.4])this.cyl(0.008,0.008,0.05,inox,hX,y,s*0.03,{rx:Math.PI/2},leaf)}
    const lockM=this.mat('#ef4444',{e:'#ef4444',ei:2.2,noCache:true});this.box(0.05,0.12,0.03,'#0b0f16',hX-dir*0.07,1.05,0.025,{},leaf);this.box(0.012,0.03,0.006,lockM,hX-dir*0.07,1.09,0.042,{cs:false},leaf);
    const D={kind:'swing',pv,x:(x1+x2)/2,z,dir,sw:o.swing||-1,open:0,hold:0,r:1.45,lock:lockM,W};(this.doors=this.doors||[]).push(D);
    this.wall([x1,z],[x2,z],H,{door:D,kind:'door'});return D},
  // cửa kính tự động 2 cánh trượt (lối vào chính) trên đường x = const từ z1 tới z2: ô kính cố định 2 bên, 2 cánh trượt ra, hộp motor + cảm biến
  slideDoor(x,z1,z2,o={}){
    const fr=this.alu(),inox=this.mat('#d6dbe1',{m:1,r:0.18,env:1.2}),H=2.6,L=z2-z1,side=(L-2.0)/2,lw=1.04,g=this.group(0,0,0);
    for(const z of[z1,z2])this.box(0.1,H+0.3,0.06,fr,x,(H+0.3)/2,z,{cs:true},g);
    for(const z of[z1+side/2,z2-side/2]){this.box(0.012,H-0.06,side-0.04,this.glass({tint:'#d1fae5',op:0.09}),x,H/2,z,{cs:false},g);this.box(0.05,0.06,side,fr,x,0.03,z,{cs:true},g)}
    this.box(0.22,0.24,L+0.08,fr,x-0.06,H+0.12,(z1+z2)/2,{cs:true},g); // hộp motor
    const sens=this.mat('#38bdf8',{e:'#38bdf8',ei:1.5,noCache:true});this.box(0.04,0.03,0.18,'#0b0f16',x-0.18,H+0.04,(z1+z2)/2,{},g);this.box(0.006,0.012,0.08,sens,x-0.2,H+0.04,(z1+z2)/2,{cs:false},g);
    const leaves=[];for(const s of[-1,1]){const lg=this.group(x-0.07,(z1+z2)/2+s*lw/2,0,0,g);
      this.box(0.012,H-0.04,lw-0.04,this.glass({tint:'#d1fae5',op:0.09}),0,H/2,0,{cs:false},lg);this.box(0.04,0.08,lw,fr,0,0.04,0,{cs:true},lg);this.box(0.04,0.05,lw,fr,0,H-0.03,0,{cs:true},lg);
      this.box(0.04,H,0.035,fr,0,H/2,s*(lw/2-0.017),{cs:true},lg);this.box(0.012,0.04,lw-0.08,this.frost(),0,1.05,0,{cs:false},lg);
      this.cyl(0.012,0.012,1.2,inox,-0.04,1.15,-s*(lw/2-0.06),{cs:true},lg);this.cyl(0.012,0.012,1.2,inox,0.04,1.15,-s*(lw/2-0.06),{cs:true},lg);leaves.push({g:lg,s,z0:lg.position.z})}
    const D={kind:'slide',leaves,x,z:(z1+z2)/2,open:0,hold:0,r:2.3,sens,travel:lw-0.06};(this.doors=this.doors||[]).push(D);
    this.wall([x,z1+side],[x,z2-side],H,{door:D,kind:'door'});this.wall([x,z1],[x,z1+side],H,{kind:'glass'});this.wall([x,z2-side],[x,z2],H,{kind:'glass'});return D},
  // vách lam gỗ nghệ thuật (lam đứng, ray chân + ray trên) — nhìn xuyên được một phần, vẫn chặn lối đi
  slats(x1,z1,x2,z2,o={}){const{THREE}=this.T,L=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,ry=Math.atan2(x2-x1,z2-z1)-Math.PI/2,g=this.group(cx,cz,ry),H=o.h||2.6,step=0.17;
    const wd=this.mats.slat||(this.mats.slat=this.mat('#ffffff',{map:this.tex('wood'),r:0.55,env:0.4})),n=Math.max(2,Math.floor(L/step)),im=new THREE.InstancedMesh(new THREE.BoxGeometry(0.045,H-0.12,0.11),wd,n),M=new THREE.Matrix4();
    for(let k=0;k<n;k++){M.makeTranslation(-L/2+(k+0.5)*L/n,H/2,0);im.setMatrixAt(k,M)}im.castShadow=true;im.receiveShadow=true;g.add(im);
    const dk=this.mat('#3b2a1e',{r:0.6});this.box(L,0.08,0.14,dk,0,0.04,0,{cs:true},g);this.box(L,0.06,0.14,dk,0,H-0.03,0,{cs:true},g);
    this.block(cx,cz,L,0.12,ry,0.18);this.wall([x1,z1],[x2,z2],H,{kind:'slats'});return g},
  // cửa vòm gỗ mở (open portal): 2 trụ + vòm bán nguyệt
  woodArch(x1,z1,x2,z2){const{THREE}=this.T,L=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,ry=Math.atan2(x2-x1,z2-z1)-Math.PI/2,g=this.group(cx,cz,ry),dk=this.mat('#5b3a22',{r:0.45,env:0.5}),sp=2.6-L/2;
    for(const d of[-L/2,L/2]){this.box(0.14,sp,0.16,dk,d,sp/2,0,{cs:true},g);this.block(x1+(x2-x1)*(d/L+0.5),z1+(z2-z1)*(d/L+0.5),0.16,0.18,ry,0.1)}
    if(sp>0.5){const a=this.mesh(new THREE.TorusGeometry(L/2,0.07,10,32,Math.PI),dk,0,sp,0,{cs:true},g);a.scale.z=1.15}
    const led=this.mesh(new THREE.TorusGeometry(L/2-0.075,0.012,6,32,Math.PI),this.mat('#fbbf24',{e:'#f59e0b',ei:2}),0,sp,0,{},g);return g},
  // cửa tự mở khi có người (hoặc camera ở tầm thấp) lại gần; giữ mở thêm một chút cho khỏi đóng/mở liên tục
  doorStep(dt){if(!this.doors)return;const ps=Object.values(this.people),C=this.cam.position,ez=t=>t*t*(3-2*t);
    for(const D of this.doors){let near=ps.some(p=>Math.hypot(p.wrap.position.x-D.x,p.wrap.position.z-D.z)<D.r);
      if(!near&&C.y<2.6&&Math.hypot(C.x-D.x,C.z-D.z)<D.r+0.4)near=true;
      D.hold=near?1.2:Math.max(0,D.hold-dt);const want=D.hold>0?1:0,sp=D.kind==='slide'?1.4:1.1,o0=D.open;
      D.open=want?Math.min(1,D.open+dt*sp):Math.max(0,D.open-dt*sp*0.8);if(D.open===o0)continue;const e=ez(D.open);
      if(D.kind==='swing'){D.pv.rotation.y=-D.dir*D.sw*e*Math.PI/2;D.lock.emissive.set(D.open>0.05?'#22c55e':'#ef4444');D.lock.color.set(D.open>0.05?'#22c55e':'#ef4444');if(o0===0&&this.Snd.on&&this.Snd.ctx)this.Snd.tone(D.x,D.z,880,0.05,0.05)}
      else{for(const L of D.leaves)L.g.position.z=L.z0+L.s*e*D.travel;D.sens.emissive.set(D.open>0.02?'#22c55e':'#38bdf8');if(o0===0&&this.Snd.on&&this.Snd.ctx)this.Snd.tone(D.x,D.z,220,0.4,0.03)}}},
  // camera đi từ a tới b có cắt tường / cửa đang đóng không (chỉ xét khi camera thấp hơn đỉnh vách)
  hitWall(a,b,y){const r=0.22,W=this.walls||[];for(const w of W){if(y>w.h+0.12)continue;if(w.door&&w.door.open>0.55)continue;
      const[x1,z1]=w.a,[x2,z2]=w.b,dx=x2-x1,dz=z2-z1,len2=dx*dx+dz*dz||1,dist=(px,pz)=>{const t=Math.max(0,Math.min(1,((px-x1)*dx+(pz-z1)*dz)/len2));return Math.hypot(px-x1-dx*t,pz-z1-dz*t)};
      const s1=(dx*(a.z-z1)-dz*(a.x-x1)),s2=(dx*(b.z-z1)-dz*(b.x-x1)),t1=((a.x-x1)*dx+(a.z-z1)*dz)/len2;
      if(s1*s2<0&&t1>-0.05&&t1<1.05)return true; // cắt qua
      if(dist(b.x,b.z)<r&&dist(b.x,b.z)<dist(a.x,a.z))return true} // tiến sát hơn bán kính an toàn
    return false},
  // ---------- Khu 3: Phòng Điều hành (kính cách âm) ----------
  zoneExec(){
    // phòng kín vách kính cách âm; cửa quay 1 cánh 1,2 m bản lề sát góc, mở vào trong và áp sát vách trái: không cấn bàn làm việc
    this.partition(7,-10.85,7,-3.56,{pad:0.14});this.partition(8.3,-3.5,15.85,-3.5,{pad:0.14});this.execDoor=this.swingDoor(7.06,8.3,-3.5,{hinge:'x1',swing:-1,label:'ĐIỀU HÀNH'});
    // đèn rọi ấm trong phòng (đổ bóng mềm qua vách kính ra hành lang ở đồ họa cao)
    if(!this.mob){const{THREE}=this.T,sp=this.execSpot=new THREE.SpotLight('#ffe2b8',0,11,1.0,0.8,1.4);sp.position.set(11.4,3.95,-7.0);sp.target.position.set(11.0,0,-5.6);sp.shadow.mapSize.set(1024,1024);sp.shadow.bias=-0.0006;sp.shadow.normalBias=0.03;sp.shadow.radius=5;this.S.add(sp,sp.target)}
    this.execScr=this.canvas(1600,620,(g,w,h)=>this.drawExec(g,w,h),{live:1});
    this.box(7.6,3.0,0.12,'#06090f',11.4,2.05,-10.93,{cs:false});this.screen(7.4,2.86,this.execScr.t,11.4,2.05,-10.85,0,{em:1.1});
    // bàn họp tròn + ghế
    this.cyl(0.85,0.85,0.05,this.mat('#ffffff',{map:this.tex('wood'),r:0.25,env:0.9}),11.3,0.75,-8.3,{cs:true,seg:40});this.cyl(0.1,0.3,0.72,'#1f2937',11.3,0.37,-8.3,{m:0.6});
    for(let i=0;i<4;i++){const a=i/4*Math.PI*2+0.6;this.chair(11.3+Math.sin(a)*1.25,-8.3+Math.cos(a)*1.25,a+Math.PI)}this.block(11.3,-8.3,2.9,2.9,0,0.1);
    for(const id of['risk','acc']){const[x,z,ry]=this.SEATS[id];this.curvedDesk(id,x,z,ry,2,{top:this.mat('#ffffff',{map:this.tex('wood'),r:0.22,env:1.0})})}
    this.plant(15.2,-10.2,1.3);this.plant(7.7,-10.2,1.1)},
  // ---------- Khu 4: Coffee Lounge ----------
  zoneLounge(){
    const{THREE}=this.T,wd=this.mat('#ffffff',{map:this.tex('wood'),r:0.3,env:0.8}),blk=this.mat('#1c1917',{r:0.4,m:0.3}),chr=this.mat('#c0c4cc',{m:0.9,r:0.2});
    // quầy bar + quầy sau, máy espresso, cối xay, ly tách
    this.box(0.7,1.0,4.2,this.mat('#292524',{r:0.5}),-14.0,0.5,5.0,{cs:true});this.box(0.86,0.06,4.4,this.mat('#e7e5e4',{map:this.tex('stone'),r:0.15,env:1.1}),-14.0,1.03,5.0,{cs:true});
    this.box(0.04,0.06,4.1,this.mat('#f59e0b',{e:'#f59e0b',ei:1.6}),-13.64,0.94,5.0,{cs:false});this.block(-14.0,5.0,0.86,4.4,0,0.2);
    this.box(0.55,0.95,4.2,this.mat('#1c1917',{r:0.5}),-15.55,0.47,5.0,{cs:false});this.box(0.6,0.04,4.3,this.mat('#e7e5e4',{map:this.tex('stone'),r:0.15}),-15.55,0.96,5.0);
    const em=this.group(-14.0,3.75,Math.PI/2,1.06);this.box(0.55,0.42,0.4,chr,0,0.21,0,{cs:true},em);this.box(0.5,0.08,0.34,'#111827',0,0.46,0,{},em);for(const dx of[-0.13,0.13]){this.cyl(0.035,0.035,0.08,blk,dx,0.12,0.24,{},em);this.cyl(0.03,0.025,0.06,'#f5f5f4',dx,0.03,0.24,{},em)}
    this.box(0.1,0.06,0.02,this.mat('#ef4444',{e:'#ef4444',ei:2}),0.15,0.33,0.205,{cs:false},em);this.espresso=new THREE.Vector3(-13.95,1.62,3.75);
    this.cyl(0.08,0.1,0.32,blk,-14.05,1.22,4.45);this.cyl(0.09,0.06,0.12,this.mat('#a16207',{op:0.7}),-14.05,1.43,4.45);
    for(let i=0;i<6;i++)this.cyl(0.04,0.033,0.08,'#f5f5f4',-15.5,1.02,3.4+i*0.18);for(let i=0;i<5;i++)this.cyl(0.05,0.05,0.22,['#7c2d12','#14532d','#1e3a8a','#78350f','#b45309'][i],-15.6,1.1,5.6+i*0.2);
    const menu=this.canvas(512,320,(g,w,h)=>{g.fillStyle='#1c1917';g.fillRect(0,0,w,h);g.font='800 46px Georgia,serif';g.fillStyle='#fbbf24';g.fillText('COFFEE BAR',30,64);g.font='500 30px system-ui';g.fillStyle='#f5f5f4';
      [['Espresso','35k'],['Latte','45k'],['Cold Brew','50k'],['Bạc xỉu','40k']].forEach(([a,b],i)=>{g.fillText(a,34,126+i*48);g.fillText(b,w-110,126+i*48)})});
    this.screen(1.2,0.75,menu.t,-15.92,2.1,5.0,Math.PI/2,{em:0.8});
    for(const z of[3.9,5.3,6.6]){this.cyl(0.19,0.19,0.05,'#7c2d12',-13.15,0.74,z,{cs:true});this.cyl(0.025,0.025,0.72,chr,-13.15,0.37,z);this.cyl(0.18,0.2,0.02,chr,-13.15,0.01,z)}
    // bình nước + tủ lạnh
    this.box(0.36,1.0,0.36,'#e5e7eb',-15.45,0.5,8.4,{cs:true});this.cyl(0.16,0.16,0.42,this.mat('#7dd3fc',{op:0.55,r:0.05}),-15.45,1.22,8.4,{cs:false});this.block(-15.45,8.4,0.4,0.4);
    this.box(0.75,1.9,0.7,this.mat('#d1d5db',{m:0.6,r:0.25}),-15.45,0.95,9.5,{cs:true});this.block(-15.45,9.5,0.75,0.7);
    // bàn bi-a
    const pt=this.group(-10,4.4,0);this.box(2.7,0.16,1.56,'#5b2c12',0,0.74,0,{cs:true,r:0.35},pt);this.box(2.54,0.02,1.4,this.mat('#ffffff',{map:this.tex('felt'),r:0.95,env:0.05}),0,0.83,0,{},pt);
    for(const[dx,dz]of[[-1.27,0.7],[0,0.73],[1.27,0.7],[-1.27,-0.7],[0,-0.73],[1.27,-0.7]])this.cyl(0.055,0.055,0.03,'#050505',dx,0.835,dz,{},pt);
    for(const[dx,dz]of[[-1.15,-0.6],[1.15,-0.6],[-1.15,0.6],[1.15,0.6]])this.box(0.14,0.68,0.14,'#4a230e',dx,0.34,dz,{},pt);
    this.balls=[];const bc=['#f8fafc','#facc15','#2563eb','#dc2626','#7c3aed','#f97316','#16a34a','#7f1d1d','#111827'];
    bc.forEach((c,i)=>{const row=i?Math.floor((Math.sqrt(8*i+1)-1)/2):0,col=i?i-row*(row+1)/2:0,bx=i?0.45+row*0.052:-0.6,bz=i?(col-row/2)*0.06:0;this.balls.push(this.sph(0.03,this.mat(c,{r:0.15,env:1.2}),bx,0.87,bz,{seg:14},pt))});
    this.pool=pt;this.block(-10,4.4,2.7,1.56,0,0.3);
    const cr=this.group(-8.2,10.85,Math.PI);this.box(0.9,1.3,0.05,'#5b2c12',0,1.3,0,{},cr);for(let i=0;i<4;i++)this.cyl(0.01,0.006,1.4,'#d4a373',-0.3+i*0.2,1.15,0.06,{},cr);
    // bàn bi lắc
    const fb=this.group(-7.5,7.3,0);this.box(1.2,0.24,0.72,'#0f172a',0,0.82,0,{cs:true},fb);this.box(1.1,0.02,0.62,'#15803d',0,0.88,0,{},fb);for(const[dx,dz]of[[-0.5,-0.28],[0.5,-0.28],[-0.5,0.28],[0.5,0.28]])this.box(0.08,0.72,0.08,'#0f172a',dx,0.36,dz,{},fb);
    this.rods=[];for(let i=0;i<8;i++){const x=-0.46+i*0.13,rd=this.group(x,0,0,0.95,fb);this.cyl(0.008,0.008,1.0,chr,0,0,0,{rx:Math.PI/2,cs:false},rd);this.cyl(0.02,0.02,0.1,'#111827',0,0,i%2?0.55:-0.55,{rx:Math.PI/2},rd);
      for(let k=-1;k<=1;k++)this.box(0.03,0.08,0.03,i%2?'#dc2626':'#2563eb',0,-0.04,k*0.18,{cs:false},rd);this.rods.push(rd)}
    this.block(-7.5,7.3,1.2,0.72,0,0.25);
    // sofa + bàn trà + TV tin tức tài chính
    const sf=this.group(-11.5,10.2,Math.PI),sm=this.mat('#475569',{r:0.9,env:0.2}),sm2=this.mat('#64748b',{r:0.95,env:0.2});
    this.box(2.6,0.42,0.95,sm,0,0.22,0,{cs:true},sf);this.box(2.6,0.62,0.22,sm,0,0.6,-0.42,{cs:true},sf);for(const dx of[-1.3,1.3])this.box(0.22,0.6,0.95,sm,dx,0.32,0,{cs:true},sf);
    for(const dx of[-0.62,0.62]){this.box(1.15,0.14,0.75,sm2,dx,0.5,0.06,{},sf);this.box(1.1,0.42,0.14,sm2,dx,0.72,-0.27,{rx:-0.15},sf)}this.box(0.36,0.3,0.12,'#f59e0b',-1.0,0.7,-0.18,{rz:0.3,rx:-0.3},sf);this.block(-11.5,10.2,2.8,1.0,0,0.15);
    this.cyl(0.42,0.42,0.04,this.mat('#ffffff',{map:this.tex('wood'),r:0.25}),-11.5,0.42,8.75,{cs:true,seg:32});this.cyl(0.05,0.18,0.4,'#1c1917',-11.5,0.2,8.75);this.block(-11.5,8.75,0.9,0.9,0,0.1);
    this.cyl(0.04,0.035,0.09,'#f5f5f4',-11.35,0.49,8.7);this.box(0.22,0.02,0.3,'#1e3a8a',-11.7,0.45,8.8,{ry:0.4});
    this.tvC=this.canvas(768,432,(g,w,h)=>this.drawTV(g,w,h));this.box(1.9,0.5,0.4,'#1c1917',-11.5,0.25,7.55,{cs:true});this.box(1.66,0.96,0.05,'#050505',-11.5,1.15,7.55,{cs:true,m:0.4,r:0.3});
    this.screen(1.6,0.9,this.tvC.t,-11.5,1.15,7.58,0,{em:1.0});this.block(-11.5,7.55,1.9,0.4,0,0.15);
    this.plant(-15.3,10.4,1.25);this.plant(-6.9,10.3,1.1);this.plant(-15.2,2.7,1.0);
    // ranh giới Coffee Lounge: vách lam gỗ hình chữ L, cửa vòm mở phía hành lang (2,4 m) và phía sàn giao dịch (2,6 m)
    this.slats(-15.85,2.2,-12.9,2.2);this.woodArch(-12.9,2.2,-10.5,2.2);this.slats(-10.5,2.2,-6.0,2.2);
    this.slats(-6.0,2.2,-6.0,6.2);this.woodArch(-6.0,6.2,-6.0,8.8);this.slats(-6.0,8.8,-6.0,10.95)},
  // ---------- Khu 5: Sảnh lễ tân & An ninh ----------
  zoneLobby(){
    const{THREE}=this.T,chr=this.mat('#c0c4cc',{m:0.9,r:0.18});
    // cửa kính trượt lối vào (tường phải)
    this.mainDoor=this.slideDoor(15.95,5.4,8.6); // cửa kính tự động 2 cánh trượt, lối thông thủy 2 m
    this.partition(10.2,2.2,15.85,2.2,{pad:0.14}); // vách kính ngăn sảnh với khu làm việc; lối vào văn phòng rộng 3,6 m giữa tường logo và vách
    const ent=this.canvas(512,96,(g,w,h)=>{g.fillStyle='#052e2b';g.fillRect(0,0,w,h);g.font='800 52px system-ui';g.textAlign='center';g.fillStyle='#34d399';g.fillText('LỐI VÀO · ENTRANCE',w/2,66)});this.screen(1.8,0.34,ent.t,15.86,3.12,7.0,-Math.PI/2,{em:1.2});
    // cổng soát vé thông minh (đèn LED đổi màu khi có người đi qua)
    this.gates=[];for(const z of[5.6,6.65,7.7,8.75]){const g=this.group(13,z,0);this.box(1.0,1.0,0.22,chr,0,0.5,0,{cs:true},g);this.box(0.98,0.02,0.2,'#111827',0,1.01,0,{},g);
      const l=this.box(0.9,0.025,0.025,this.mat('#22c55e',{e:'#22c55e',ei:2.5,noCache:true}),0,0.92,0.115,{cs:false},g);const l2=this.box(0.9,0.025,0.025,l.material,0,0.92,-0.115,{cs:false},g);
      this.box(0.12,0.08,0.1,this.mat('#0ea5e9',{e:'#0ea5e9',ei:1.5}),0.3,1.05,0,{cs:false},g);if(z<8.7)for(const dz of[0.3,0.75])this.box(0.012,0.55,0.34,this.glass({tint:'#e0f2fe',op:0.3}),0.1,0.75,dz,{cs:false},g);this.gates.push(l.material);this.block(13,z,1.0,0.22,0,0.18)}
    // quầy lễ tân cong + tường logo
    const rg=this.group(8.7,6.8,Math.PI/2);this.extrude(this.arcShape(0.55,1.25,-1.15,1.15),0.06,this.mat('#f5f5f4',{map:this.tex('stone'),r:0.15,env:1.1}),0,1.04,0,{},rg);
    this.cyl(1.2,1.2,1.02,this.mat('#0f766e',{r:0.35,ds:true}),0,0.51,0,{open:true,t0:-1.1,tl:2.2,cs:true},rg);this.cyl(1.215,1.215,0.03,this.mat('#5eead4',{e:'#2dd4bf',ei:2}),0,0.2,0,{open:true,t0:-1.1,tl:2.2},rg);
    const rs=this.canvas(384,224,(g,w,h)=>this.drawMon(g,w,h,'recep','status'),{live:1});this.box(0.5,0.32,0.03,'#06090f',0,1.28,0.75,{},rg);this.screen(0.47,0.29,rs.t,0,1.28,0.735,Math.PI,{},rg);
    this.chair(0,0,0,rg);this.block(8.7+0.85,6.8,0.8,2.4,0,0.2);
    const logo=this.canvas(1024,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#0b1220');gr.addColorStop(1,'#13233d');g.fillStyle=gr;g.fillRect(0,0,w,h);
      g.textAlign='center';g.font='900 150px system-ui,sans-serif';const t=g.createLinearGradient(200,0,w-200,0);t.addColorStop(0,'#38d6b4');t.addColorStop(1,'#f0d68a');g.fillStyle=t;g.shadowColor='#38d6b4';g.shadowBlur=36;g.fillText('TÍN HIỆU',w/2,250);
      g.shadowBlur=0;g.font='600 54px system-ui';g.fillStyle='#e5e7eb';g.fillText('TRADING HUB',w/2,330);g.font='400 30px system-ui';g.fillStyle='#94a3b8';g.fillText('Signals · Risk · Learning',w/2,400)});
    this.box(0.16,3.2,4.6,this.mat('#ffffff',{map:(()=>{const t=this.tex('concrete').clone();t.needsUpdate=true;return t})(),r:0.9,noCache:true}),6.95,1.6,6.8,{cs:true});this.screen(4.2,2.1,logo.t,7.04,2.0,6.8,Math.PI/2,{em:1.0});this.block(6.95,6.8,0.16,4.6);
    // bàn bảo vệ + màn hình camera an ninh
    const gd=this.group(...this.SEATS.guard.slice(0,2),this.SEATS.guard[2]);this.box(1.3,0.95,0.6,'#334155',0,0.475,0.8,{cs:true},gd);this.box(1.4,0.04,0.7,'#94a3b8',0,0.97,0.8,{m:0.5,r:0.3},gd);
    const cc=this.canvas(384,224,(g,w,h)=>this.drawMon(g,w,h,'guard','cctv'),{live:1});this.box(0.66,0.4,0.04,'#06090f',0,1.25,1.02,{},gd);this.screen(0.62,0.36,cc.t,0,1.25,1.0,Math.PI,{},gd);
    this.chair(0,0,0,gd);this.block(14.6-0.8,3.4,0.6,1.4,0,0.2);
    // quầy bưu tá + tủ thư
    const pd=this.group(...this.SEATS.post.slice(0,2),this.SEATS.post[2]);this.box(1.5,0.76,0.7,'#7c5a3a',0,0.38,0.8,{cs:true},pd);this.box(1.56,0.04,0.76,this.mat('#ffffff',{map:this.tex('wood'),r:0.3}),0,0.78,0.8,{},pd);
    const pm=this.canvas(384,224,(g,w,h)=>this.drawMon(g,w,h,'post','status'),{live:1});this.box(0.5,0.32,0.03,'#06090f',0,1.0,1.0,{},pd);this.screen(0.47,0.29,pm.t,0,1.0,0.98,Math.PI,{},pd);
    this.chair(0,0,0,pd);for(let i=0;i<4;i++)this.box(0.36,0.06,0.26,['#fde68a','#fef3c7','#fbbf24','#fde68a'][i],-0.45+i*0.08,0.82+i*0.06,0.7,{ry:i*0.2},pd);this.block(14.4,10.2-0.8,1.5,0.7,0,0.2);
    const mb=this.group(15.7,9.6,-Math.PI/2);this.box(1.6,1.6,0.35,'#7c5a3a',0,0.8,0,{cs:true},mb);for(let r=0;r<4;r++)for(let c=0;c<5;c++)this.box(0.26,0.3,0.02,r*5+c===7?'#fde68a':'#5c3c27',-0.62+c*0.31,0.3+r*0.36,0.18,{cs:false},mb);this.block(15.7,9.6,0.35,1.6,0,0.2);
    // ghế chờ
    for(const dx of[-0.6,0.6]){const a=this.group(10.4+dx,3.2,0);this.box(0.7,0.4,0.7,'#0f766e',0,0.2,0,{cs:true},a);this.box(0.7,0.5,0.15,'#0f766e',0,0.55,-0.28,{},a);this.block(10.4+dx,3.2,0.7,0.7,0,0.15)}
    this.cyl(0.25,0.25,0.42,this.mat('#f5f5f4',{map:this.tex('stone'),r:0.2}),10.4,0.21,3.2+0.05);
    this.plant(15.3,3.0,1.35);this.plant(7.6,10.3,1.2);this.plant(7.6,3.0,1.1)},
  // ---------- Cây xanh (kim tiền), bình nước, chi tiết rải rác ----------
  plant(x,z,s=1){
    const{THREE}=this.T;this.leafG=this.leafG||new THREE.SphereGeometry(1,8,6);this.leafM=this.leafM||this.mat('#2f7d32',{r:0.6,env:0.3});this.leafM2=this.leafM2||this.mat('#4caf50',{r:0.55,env:0.3});
    this.cyl(0.24*s,0.18*s,0.42*s,this.mat('#e7e5e4',{r:0.35,env:0.8}),x,0.21*s,z,{cs:true});this.cyl(0.22*s,0.22*s,0.02,'#3b2416',x,0.41*s,z);
    for(let k=0;k<3;k++){const a=k*2.1;this.cyl(0.012*s,0.016*s,0.9*s,'#6b4f2a',x+Math.sin(a)*0.03*s,0.85*s,z+Math.cos(a)*0.03*s,{rz:Math.sin(a)*0.08,rx:Math.cos(a)*0.08})}
    const n=46,im=new THREE.InstancedMesh(this.leafG,this.leafM,n),im2=new THREE.InstancedMesh(this.leafG,this.leafM2,n),M=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
    for(let i=0;i<n*2;i++){const a=i*2.399,r=(0.08+((i*37)%17)/17*0.32)*s,y=(1.05+((i*53)%23)/23*0.55)*s;v.set(x+Math.sin(a)*r,y,z+Math.cos(a)*r);e.set(0.6,a,0.3);q.setFromEuler(e);sc.set(0.07*s,0.012*s,0.045*s);M.compose(v,q,sc);(i%2?im2:im).setMatrixAt(i>>1,M)}
    im.castShadow=im2.castShadow=true;this.S.add(im,im2);this.block(x,z,0.48*s,0.48*s,0,0.1)},
  decor(){
    // cây xanh rải rác + thùng rác + máy in
    for(const[x,z,s]of[[-6.2,-10.4,1.2],[6.2,-10.4,1.2],[-0.2,0.9,0.9],[-15.3,-2.9,1.0],[5.4,1.6,0.8],[-5.4,1.6,0.8]])this.plant(x,z,s);
    this.box(0.6,0.4,0.5,'#e5e7eb',5.6,0.85,-9.4,{cs:true});this.box(0.7,0.65,0.6,'#9ca3af',5.6,0.32,-9.4,{cs:true});this.box(0.4,0.02,0.3,'#f8fafc',5.6,1.06,-9.4);this.block(5.6,-9.4,0.7,0.6);
    for(const[x,z]of[[-6.2,-7.2],[6.2,-7.2],[-7.6,1.5]])this.cyl(0.16,0.13,0.4,this.mat('#4b5563',{m:0.5,r:0.4}),x,0.2,z,{cs:true})},
  // ---------- Hơi nước bốc lên từ cốc cà phê / máy espresso ----------
  steamSrc:[],
  steamAt(x,y,z,k=1){this.steamSrc.push({x,y,z,k})},
  steamInit(){
    const{THREE}=this.T;if(this.espresso)this.steamAt(this.espresso.x,this.espresso.y,this.espresso.z,1.6);
    const per=10,N=this.steamSrc.length*per,pos=new Float32Array(N*3),c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
    gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    this.steam={pts:new THREE.Points(geo,new THREE.PointsMaterial({size:0.09,map:new THREE.CanvasTexture(c),transparent:true,opacity:0.3,depthWrite:false})),per,life:new Float32Array(N).map(()=>Math.random())};
    this.steam.pts.frustumCulled=false;this.S.add(this.steam.pts)},
  steamStep(dt){const s=this.steam;if(!s)return;const p=s.pts.geometry.attributes.position,t=performance.now()/1000;
    this.steamSrc.forEach((src,si)=>{const boost=src.k>1?(this.brewing?1.4:0.6):1;for(let k=0;k<s.per;k++){const i=si*s.per+k;s.life[i]+=dt*0.45*boost;if(s.life[i]>1)s.life[i]-=1;const L=s.life[i];
      p.setXYZ(i,src.x+Math.sin(t*1.7+i)*0.025*L*src.k,src.y+L*0.32*src.k,src.z+Math.cos(t*1.3+i*2)*0.025*L*src.k)}});p.needsUpdate=true},
  // ---------- Nội dung các màn hình (số liệu thật) ----------
  g(){const o={};try{o.px=Data.px||{}}catch(e){o.px={}}try{o.S=Book.stats(Book.data.orders)}catch(e){o.S={net:0,w:0,l:0,be:0}}
    try{o.open=Book.data.orders.filter(Book.isOpen)}catch(e){o.open=[]}try{o.news=(News.items||[]).slice(0,6)}catch(e){o.news=[]}try{o.focus=Sig.focus.slice()}catch(e){o.focus=['BTCUSDT','ETHUSDT']}return o},
  candles(s){try{const tf=typeof UI!=='undefined'?UI.tf():'1h',D=Data.cache[s+'|'+tf];if(D&&D.c&&D.c.length>40){const n=D.c.length,k=Math.max(0,n-46);const o=D.o.slice(k),h=D.h.slice(k),l=D.l.slice(k),c=D.c.slice(k);const px=Data.px&&Data.px[s];if(px){c[c.length-1]=px;h[h.length-1]=Math.max(h[h.length-1],px);l[l.length-1]=Math.min(l[l.length-1],px)}return{o,h,l,c,tf}}}catch(e){}return null},
  fake(seed,n=46){const r=i=>{const x=Math.sin(i*12.9898+seed*78.233)*43758.5453;return x-Math.floor(x)},t=Date.now()/3000|0,o=[],h=[],l=[],c=[];let p=100;for(let i=0;i<n;i++){const op=p,cl=op+(r(i+t)-0.48)*3;o.push(op);c.push(cl);h.push(Math.max(op,cl)+r(i+t+7)*1.4);l.push(Math.min(op,cl)-r(i+t+3)*1.4);p=cl}return{o,h,l,c,tf:'demo'}},
  drawCandles(g,x,y,w,h,D,lev){const n=D.c.length,mx=Math.max(...D.h),mn=Math.min(...D.l),Y=v=>y+h-(v-mn)/(mx-mn||1)*h,bw=w/n;
    g.strokeStyle='rgba(148,163,184,.12)';g.lineWidth=1;for(let k=1;k<4;k++){g.beginPath();g.moveTo(x,y+h*k/4);g.lineTo(x+w,y+h*k/4);g.stroke()}
    for(let i=0;i<n;i++){const up=D.c[i]>=D.o[i];g.strokeStyle=g.fillStyle=up?'#38d6b4':'#ff6b6b';const cx=x+i*bw+bw/2;g.beginPath();g.moveTo(cx,Y(D.h[i]));g.lineTo(cx,Y(D.l[i]));g.stroke();g.fillRect(cx-bw*0.32,Math.min(Y(D.o[i]),Y(D.c[i])),bw*0.64,Math.max(1.5,Math.abs(Y(D.o[i])-Y(D.c[i]))))}
    const last=D.c[n-1];g.setLineDash([6,5]);g.strokeStyle='#f0d68a';g.beginPath();g.moveTo(x,Y(last));g.lineTo(x+w,Y(last));g.stroke();g.setLineDash([]);
    if(lev)for(const[v,c]of lev)if(v>mn&&v<mx){g.strokeStyle=c;g.lineWidth=2;g.beginPath();g.moveTo(x,Y(v));g.lineTo(x+w,Y(v));g.stroke();g.lineWidth=1}},
  coinOf(id){try{const b={rsi2:'rsi2',smc:'smc',btc100:'ict2'}[id];if(b){const c=Office.coinsOf(b);if(c.length)return c[(Date.now()/12000|0)%c.length]}
    if(id==='trader'){const o=Book.data.orders.filter(Book.isOpen);if(o.length)return o[(Date.now()/12000|0)%o.length].s}
    const f=Sig.focus;if(f.length)return f[(['radar','rsi2','smc','btc100','trader','news'].indexOf(id)+(Date.now()/15000|0))%f.length]}catch(e){}return'BTCUSDT'},
  STC:{busy:'#38bdf8',happy:'#facc15',alert:'#ef4444',ok:'#22c55e',idle:'#64748b'},
  wrap(g,txt,x,y,maxW,lh,maxY){const words=String(txt||'').split(' ');let line='';for(const wd of words){const t=line?line+' '+wd:wd;if(g.measureText(t).width>maxW&&line){g.fillText(line,x,y);y+=lh;line=wd;if(y>maxY)return y}else line=t}g.fillText(line,x,y);return y},
  drawMon(g,w,h,id,kind){
    g.fillStyle='#0a1222';g.fillRect(0,0,w,h);const p=this.people[id],m=p?p.m:{name:id},r=(m.last||{st:'idle',say:''}),col=this.STC[r.st]||'#64748b',G=this.g();
    if(kind==='status'){g.fillStyle=col;g.fillRect(0,0,w,36);g.font='700 20px system-ui';g.fillStyle='#0b1220';g.fillText((m.name||id).toUpperCase(),12,25);g.font='500 19px system-ui';g.fillStyle='#e5e7eb';
      this.wrap(g,r.say||'Sẵn sàng.',12,66,w-24,26,h-40);g.fillStyle='rgba(255,255,255,.07)';g.fillRect(12,h-26,w-24,12);g.fillStyle=col;g.fillRect(12,h-26,(w-24)*(r.st==='idle'?0.12:0.45+0.5*Math.abs(Math.sin(Date.now()/2500))),12);return}
    if(kind==='chart'){const s=this.coinOf(id),D=this.candles(s)||this.fake(s.length+id.length);g.font='700 19px system-ui';g.fillStyle='#e5e7eb';g.fillText(s.replace('USDT','')+'/USDT',12,26);g.font='500 15px system-ui';g.fillStyle='#94a3b8';g.fillText(D.tf==='demo'?'đang tải dữ liệu…':D.tf,w-70,26);
      let lev=null;try{const o=Book.openFor(s);if(o)lev=[[o.entry,'#e5e7eb'],[o.sl,'#ef4444'],[o.tp1,'#22c55e'],[o.tp2,'#16a34a']]}catch(e){}this.drawCandles(g,10,38,w-20,h-50,D,lev);return}
    if(kind==='orders'){g.font='700 19px system-ui';g.fillStyle='#38d6b4';g.fillText('LỆNH ĐANG MỞ',12,26);g.font='500 16px system-ui';if(!G.open.length){g.fillStyle='#94a3b8';g.fillText('Chưa có lệnh mở',12,60)}
      G.open.slice(0,6).forEach((o,i)=>{let rr=null;try{const L=Book.live(o);rr=L&&L.rr}catch(e){}g.fillStyle='#e5e7eb';g.fillText(`${o.s.replace('USDT','')} ${o.side}`,12,58+i*27);g.fillStyle=rr==null?'#94a3b8':rr>=0?'#38d6b4':'#ff6b6b';g.fillText(rr==null?(o.st==='P'?'chờ khớp':'-'):`${rr>=0?'+':''}${rr.toFixed(2)}R`,w-110,58+i*27)});return}
    if(kind==='news'){g.font='700 19px system-ui';g.fillStyle='#f0d68a';g.fillText('TIN MỚI',12,26);g.font='500 16px system-ui';g.fillStyle='#e5e7eb';let y=56;for(const n of G.news.slice(0,3)){y=this.wrap(g,'• '+n.title,12,y,w-24,21,h-20)+28;if(y>h-20)break}if(!G.news.length){g.fillStyle='#94a3b8';g.fillText('Đang cập nhật tin tức…',12,60)}return}
    if(kind==='code'){const t=Date.now()/700|0,L=['for (const v of Strat.list) {','  const r = Backtest.run(D, impl, v.params)','  if (r.lossP > 30) AutoLab.relearn(v)','}','const size = bal * risk / Math.abs(e - sl)','if (rr >= tp1R) sl = entry * (1 + fee)','// tối ưu SL/TP theo thống kê coin','Calib.fit(s, v, tf).then(apply)','sync.push(gist, Book.data)'];
      g.font='15px ui-monospace,monospace';for(let i=0;i<9;i++){const s=L[(i+t)%L.length];g.fillStyle=['#93c5fd','#e5e7eb','#fca5a5','#e5e7eb','#86efac','#fde68a','#64748b','#c4b5fd','#5eead4'][(i+t)%9];g.fillText(String(i+1+t%40).padStart(3)+'  '+s,10,24+i*22)}return}
    if(kind==='risk'||kind==='pnl'){let used=0,bal=1;try{used=Book.marginUsed();bal=UI.bal()||1}catch(e){}g.font='700 19px system-ui';g.fillStyle='#f0d68a';g.fillText(kind==='risk'?'KÝ QUỸ ĐÃ DÙNG':'LÃI / LỖ',12,26);
      if(kind==='risk'){const f=Math.min(1,used/bal);g.lineWidth=18;g.strokeStyle='rgba(255,255,255,.08)';g.beginPath();g.arc(w/2,h-30,90,Math.PI,0);g.stroke();g.strokeStyle=f>0.8?'#ef4444':f>0.5?'#f59e0b':'#22c55e';g.beginPath();g.arc(w/2,h-30,90,Math.PI,Math.PI+Math.PI*f);g.stroke();
        g.font='800 30px system-ui';g.fillStyle='#e5e7eb';g.textAlign='center';g.fillText((f*100).toFixed(0)+'%',w/2,h-36);g.textAlign='left'}
      else{const S=G.S;g.font='800 40px system-ui';g.fillStyle=(S.net||0)>=0?'#38d6b4':'#ff6b6b';g.fillText(typeof Fmt!=='undefined'?Fmt.sgn(S.net||0):String(S.net||0),12,96);g.font='500 18px system-ui';g.fillStyle='#cbd5e1';g.fillText(`Thắng ${S.w||0} · BE ${S.be||0} · Thua ${S.l||0}`,12,136)}return}
    if(kind==='cctv'){const t=Date.now()/1000;for(let k=0;k<4;k++){const x=(k%2)*w/2,y=(k/2|0)*h/2;g.fillStyle=['#1f2937','#111827','#1e293b','#0f172a'][k];g.fillRect(x+2,y+2,w/2-4,h/2-4);g.strokeStyle='rgba(148,163,184,.25)';
        for(let i=0;i<5;i++){g.beginPath();g.moveTo(x+10,y+20+i*18);g.lineTo(x+w/2-10,y+30+i*14);g.stroke()}g.fillStyle='#94a3b8';g.font='13px monospace';g.fillText(['CAM 1 SẢNH','CAM 2 SÀN','CAM 3 LAB','CAM 4 LOUNGE'][k],x+8,y+h/2-10)}
      if((t|0)%2){g.fillStyle='#ef4444';g.beginPath();g.arc(w-18,16,6,0,7);g.fill()}return}
    // heat: bảng nhiệt các coin đang theo dõi
    g.font='700 19px system-ui';g.fillStyle='#38bdf8';g.fillText('RADAR COIN',12,26);const f=G.focus.slice(0,9);f.forEach((s,i)=>{const x=12+(i%3)*((w-24)/3),y=40+(i/3|0)*58;let ch=0;try{const D=this.candles(s);if(D)ch=(D.c[D.c.length-1]/D.c[D.c.length-24]-1)*100}catch(e){}
      g.fillStyle=ch>=0?`rgba(56,214,180,${0.2+Math.min(0.6,Math.abs(ch)/4)})`:`rgba(255,107,107,${0.2+Math.min(0.6,Math.abs(ch)/4)})`;g.fillRect(x,y,(w-24)/3-6,52);g.fillStyle='#f8fafc';g.font='700 16px system-ui';g.fillText(s.replace('USDT',''),x+8,y+22);g.font='500 14px system-ui';g.fillText((ch>=0?'+':'')+ch.toFixed(2)+'%',x+8,y+42)})},
  drawWall(g,w,h){
    const bg=g.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#07101f');bg.addColorStop(1,'#0e1c33');g.fillStyle=bg;g.fillRect(0,0,w,h);const G=this.g();
    g.font='800 34px system-ui';g.fillStyle='#38d6b4';g.fillText('MARKET WALL · LIVE',30,50);g.font='500 26px system-ui';g.fillStyle='#94a3b8';g.textAlign='right';g.fillText(new Date().toLocaleTimeString('vi-VN'),w-30,50);g.textAlign='left';
    // biểu đồ BTC lớn bên trái
    const D=this.candles('BTCUSDT')||this.fake(7,60);g.font='700 26px system-ui';g.fillStyle='#f8fafc';g.fillText('BTC/USDT '+(G.px.BTCUSDT&&typeof Fmt!=='undefined'?Fmt.px(G.px.BTCUSDT):''),30,96);this.drawCandles(g,30,110,760,h-180,D);
    // lưới giá các coin theo dõi
    G.focus.slice(0,8).forEach((s,i)=>{const x=820+(i%2)*380,y=78+(i/2|0)*78;let ch=0;const C=this.candles(s);if(C)ch=(C.c[C.c.length-1]/C.c[0]-1)*100;
      g.fillStyle='rgba(255,255,255,.05)';g.fillRect(x,y,366,68);g.font='700 24px system-ui';g.fillStyle='#e5e7eb';g.fillText(s.replace('USDT',''),x+14,y+30);g.font='600 22px system-ui';g.fillStyle='#cbd5e1';g.fillText(G.px[s]&&typeof Fmt!=='undefined'?Fmt.px(G.px[s]):'…',x+14,y+58);
      g.fillStyle=ch>=0?'#38d6b4':'#ff6b6b';g.textAlign='right';g.fillText((ch>=0?'▲ ':'▼ ')+Math.abs(ch).toFixed(2)+'%',x+352,y+44);g.textAlign='left';
      if(C){g.strokeStyle=ch>=0?'#38d6b4':'#ff6b6b';g.lineWidth=2;g.beginPath();const mx=Math.max(...C.c),mn=Math.min(...C.c);C.c.forEach((v,k)=>{const px=x+150+k*(110/C.c.length),py=y+60-(v-mn)/(mx-mn||1)*44;k?g.lineTo(px,py):g.moveTo(px,py)});g.stroke();g.lineWidth=1}});
    g.fillStyle='rgba(240,214,138,.12)';g.fillRect(0,h-50,w,50);g.font='600 24px system-ui';g.fillStyle='#f0d68a';const nt=G.news.map(n=>n.title).join('   •   ')||'Đang cập nhật tin tức…',tw=g.measureText(nt).width+200,off=(Date.now()/16)%tw;
    g.fillText('📰 '+nt,w-off,h-16);g.fillText('📰 '+nt,w-off+tw,h-16)},
  drawExec(g,w,h){
    const bg=g.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#0a0f1c');bg.addColorStop(1,'#1a1408');g.fillStyle=bg;g.fillRect(0,0,w,h);const G=this.g(),S=G.S;
    g.font='800 36px system-ui';g.fillStyle='#f0d68a';g.fillText('EXECUTIVE COMMAND CENTER',34,56);g.font='500 24px system-ui';g.fillStyle='#94a3b8';g.textAlign='right';g.fillText(new Date().toLocaleString('vi-VN'),w-34,56);g.textAlign='left';
    const n=(S.w||0)+(S.be||0)+(S.l||0),wr=n?(S.w||0)/n*100:0,nl=n?((S.w||0)+(S.be||0))/n*100:0;let used=0,bal=1;try{used=Book.marginUsed();bal=UI.bal()||1}catch(e){}
    const tile=(x,lab,val,sub,col)=>{g.fillStyle='rgba(255,255,255,.05)';g.fillRect(x,84,360,170);g.font='600 22px system-ui';g.fillStyle='#94a3b8';g.fillText(lab,x+20,120);g.font='800 58px system-ui';g.fillStyle=col;g.fillText(val,x+20,192);g.font='500 20px system-ui';g.fillStyle='#cbd5e1';g.fillText(sub,x+20,232)};
    tile(34,'WINRATE (chạm TP2)',wr.toFixed(0)+'%',`${S.w||0} thắng / ${n} lệnh đã đóng`,'#38d6b4');tile(414,'KHÔNG THUA',nl.toFixed(0)+'%',`Thắng + hòa vốn (BE ${S.be||0})`,'#a5b4fc');
    tile(794,'PnL TỔNG',typeof Fmt!=='undefined'?Fmt.sgn(S.net||0):String(S.net||0),'Đã gồm phí sàn',(S.net||0)>=0?'#38d6b4':'#ff6b6b');tile(1174,'KÝ QUỸ ĐANG DÙNG',(used/bal*100).toFixed(0)+'%',`${G.open.length} lệnh mở`,used/bal>0.8?'#ef4444':used/bal>0.5?'#f59e0b':'#22c55e');
    // cảnh báo rủi ro
    g.font='700 26px system-ui';g.fillStyle='#fca5a5';g.fillText('⚠ CẢNH BÁO RỦI RO',34,306);let al=[];
    try{for(const id of['risk','guard','acc','trader']){const r=Office.read(id);if(r.st==='alert')al.push(r.say)}}catch(e){}if(!al.length)al=['Không có cảnh báo. Mọi chỉ số trong giới hạn an toàn.'];
    g.font='500 22px system-ui';al.slice(0,3).forEach((t,i)=>{g.fillStyle=i===0&&al[0].startsWith('Không')?'#86efac':'#fecaca';this.wrap(g,'• '+t,34,344+i*64,720,28,344+i*64+30)});
    // đường vốn (PnL cộng dồn các lệnh đã đóng)
    g.font='700 26px system-ui';g.fillStyle='#e5e7eb';g.fillText('ĐƯỜNG VỐN',820,306);let eq=[0];try{const done=Book.data.orders.filter(o=>!Book.isOpen(o)&&o.pnl!=null).sort((a,b)=>(a.closeT||a.ts)-(b.closeT||b.ts));for(const o of done.slice(-60))eq.push(eq[eq.length-1]+o.pnl)}catch(e){}
    if(eq.length<3)eq=[0,0];const mx=Math.max(...eq),mn=Math.min(...eq);g.strokeStyle='rgba(255,255,255,.1)';g.strokeRect(820,322,746,260);g.strokeStyle=eq[eq.length-1]>=0?'#38d6b4':'#ff6b6b';g.lineWidth=4;g.beginPath();
    eq.forEach((v,i)=>{const x=830+i/(eq.length-1)*726,y=572-(v-mn)/(mx-mn||1)*240;i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke();g.lineWidth=1},
  drawTV(g,w,h){
    const G=this.g();g.fillStyle='#0b1020';g.fillRect(0,0,w,h);g.fillStyle='#b91c1c';g.fillRect(0,0,w,56);g.font='800 30px system-ui';g.fillStyle='#fff';g.fillText('TIN TÀI CHÍNH 24/7',18,38);
    g.fillStyle=(Date.now()/600|0)%2?'#fff':'#fca5a5';g.font='700 20px system-ui';g.fillText('● LIVE',w-104,36);
    const n=G.news[(Date.now()/9000|0)%Math.max(1,G.news.length)];g.font='700 30px system-ui';g.fillStyle='#f8fafc';this.wrap(g,n?n.title:'Bitcoin, Ethereum và thị trường crypto hôm nay',22,110,w-44,38,h-120);
    g.fillStyle='#1e293b';g.fillRect(0,h-62,w,62);g.font='700 24px system-ui';const t=G.focus.slice(0,6).map(s=>`${s.replace('USDT','')} ${G.px[s]&&typeof Fmt!=='undefined'?Fmt.px(G.px[s]):''}`).join('   ·   '),tw=g.measureText(t).width+120,off=(Date.now()/14)%tw;
    g.fillStyle='#fde68a';g.fillText(t,w-off,h-22);g.fillText(t,w-off+tw,h-22)},
  drawClocks(g,w,h){
    g.fillStyle='#0b1220';g.fillRect(0,0,w,h);const Z=[['NEW YORK','America/New_York'],['LONDON','Europe/London'],['TOKYO','Asia/Tokyo'],['VIỆT NAM','Asia/Ho_Chi_Minh']];
    Z.forEach(([n,tz],i)=>{const cx=200+i*400,cy=h/2,R=86;let hh=0,mm=0,ss=0;try{const p=new Intl.DateTimeFormat('en-GB',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date());hh=+p.find(x=>x.type==='hour').value;mm=+p.find(x=>x.type==='minute').value;ss=+p.find(x=>x.type==='second').value}catch(e){}
      g.fillStyle='#f8fafc';g.beginPath();g.arc(cx-70,cy,R,0,7);g.fill();g.lineWidth=8;g.strokeStyle='#38d6b4';g.stroke();g.fillStyle='#1f2937';for(let k=0;k<12;k++){const a=k/12*Math.PI*2;g.fillRect(cx-70+Math.sin(a)*(R-16)-2,cy-Math.cos(a)*(R-16)-6,4,12)}
      const hand=(a,l,wd,c)=>{g.strokeStyle=c;g.lineWidth=wd;g.lineCap='round';g.beginPath();g.moveTo(cx-70,cy);g.lineTo(cx-70+Math.sin(a)*l,cy-Math.cos(a)*l);g.stroke()};
      hand((hh%12+mm/60)/12*Math.PI*2,46,8,'#111827');hand((mm+ss/60)/60*Math.PI*2,68,5,'#111827');hand(ss/60*Math.PI*2,74,2,'#ef4444');
      g.font='800 34px system-ui';g.fillStyle='#e5e7eb';g.fillText(n,cx+30,cy-12);g.font='700 44px ui-monospace,monospace';g.fillStyle='#f0d68a';g.fillText(String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'),cx+30,cy+40)})},
  drawBoard(g,w,h){
    g.clearRect(0,0,w,h);g.font='800 44px system-ui';g.fillStyle='#7dd3fc';g.shadowColor='#38bdf8';g.shadowBlur=14;g.fillText('ALGO NOTES',30,60);g.shadowBlur=0;
    const L=[['Size = Vốn × Rủi ro% ÷ |Entry − SL|','#e0f2fe'],['E[R] = W·R̄w − L·R̄l − phí','#bbf7d0'],['RSI(2) < 10 ∧ Close > SMA200 → LONG','#fde68a'],['FVG: Low[i] > High[i−2]','#c4b5fd'],
      ['TP1 = 1,5R → chốt 50%, SL → Entry + phí','#fecaca'],['100 lệnh: thua > 30 → tự học lại','#a7f3d0'],['Killzone: 14–17h · 19:30–22:30','#fbcfe8']];
    g.font='600 36px "Segoe Print","Comic Sans MS",cursive';L.forEach(([t,c],i)=>{g.fillStyle=c;g.fillText(t,34,130+i*70)});
    g.strokeStyle='#86efac';g.lineWidth=4;g.beginPath();[[700,590],[760,540],[800,560],[860,470],[900,500],[980,380]].forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke()},
  // ---------- Nhân vật 3D ----------
  // Áo quần vẽ bằng shader theo vùng cơ thể ở tư thế gốc (bind pose) của X Bot: đầu/tay = da, thân = áo, chân = quần, giày; vest có cổ chữ V + cà vạt
  outfitMat(L){
    const{THREE}=this.T,C=c=>new THREE.Color(c),m=new THREE.MeshStandardMaterial({roughness:0.68,metalness:0.02,envMapIntensity:0.45});
    const U={uSkin:{value:C(L.skin)},uShirt:{value:C(L.shirt)},uPants:{value:C(L.pants)},uShoe:{value:C(L.shoe||'#141414')},uAcc:{value:C(L.tie||L.shirt)},uJacket:{value:C(L.jacket||L.shirt)},
      uFit:{value:L.fit},uSl:{value:[0.47,0.7,0.7,0.33,0.33,0.33,0.47][L.fit]}};
    m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vB;').replace('#include <begin_vertex>','#include <begin_vertex>\nvB=position;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vB;uniform vec3 uSkin,uShirt,uPants,uShoe,uAcc,uJacket;uniform float uFit,uSl;
vec3 outfit(){vec3 p=vB;float ax=abs(p.x),y=p.y,z=p.z;bool arm=ax>0.19&&y>1.27;
 if(arm){if(ax>0.7)return uSkin;vec3 sc=(uFit==1.0)?uJacket:uShirt;
  if(ax<uSl){if(uFit==5.0&&ax>uSl-0.035)return uAcc;if((uFit==0.0||uFit==6.0)&&ax>uSl-0.035)return uShirt*0.86;if(uFit==1.0&&ax>0.66)return vec3(0.95);return sc;}return uSkin;}
 if(y>1.53||(y>1.495&&ax<0.06))return(uFit==2.0&&y<1.58&&z<-0.02)?uShirt*0.9:uSkin;
 if(y>1.47&&uFit!=4.0&&z>0.0&&ax<0.07)return(uFit==1.0)?vec3(0.95):uShirt*0.93;
 if(y<0.075)return uShoe;
 if(y<0.99){if(uFit==6.0&&z>0.02&&y>0.5)return uAcc;if(uFit==4.0&&ax>0.12&&ax<0.135&&y>0.1)return uAcc*0.9;return uPants;}
 if(y<1.035)return(uFit==2.0||uFit==3.0)?uShirt*0.92:vec3(0.07,0.06,0.06);
 if(uFit==1.0){float v=(y-1.16)*0.36;if(z>0.0&&ax<v){if(ax<0.021&&y<1.47&&uAcc!=uShirt)return uAcc;return uShirt;}if(z>0.0&&ax>0.06&&ax<0.11&&y>1.36&&y<1.38)return uJacket*1.3;return uJacket;}
 if(uFit==6.0&&z>0.02&&ax<0.15&&y<1.36){if(y>1.33)return uAcc*0.7;return uAcc;}
 if(uFit==2.0){if(z>0.04&&ax<0.11&&y<1.15&&y>1.04)return uShirt*0.8;if(z>0.05&&ax>0.025&&ax<0.035&&y>1.3)return vec3(0.92);}
 if(uFit==4.0){if(z>0.03&&y>1.28&&y<1.36&&ax>0.05&&ax<0.13)return uShirt*1.35;if(ax>0.15&&y>1.45)return uAcc*0.8;}
 if(uFit==5.0&&y>1.2&&y<1.24)return uAcc;
 if(uFit==0.0&&z>0.0&&ax<0.007&&y<1.47)return uShirt*0.82;
 return uShirt;}`).replace('#include <color_fragment>','#include <color_fragment>\nvec3 oc=outfit();if(distance(oc,uSkin)>0.02){float fn=fract(sin(dot(floor(vB*vec3(240.,480.,240.)),vec3(12.9898,78.233,37.719)))*43758.5453);oc*=0.92+0.08*fn+0.025*sin(vB.y*140.);}diffuseColor.rgb=oc;')};
    m.customProgramCacheKey=()=>'o3outfit2';return m},
  lookOf(id){
    const t=(typeof Office!=='undefined'&&Office.TEAM.find(x=>x.id===id))||{},b=t.look||{},L={...this.LOOK[id]||{fit:0,shirt:'#e5e7eb',pants:'#1f2937',hair:'short',acc:''}};
    L.skin=L.skin||b.skin||'#f1c27d';L.hairc=L.hairc||b.hair||'#2b1b10';return L},
  staff(gltf){
    const{THREE,SK}=this.T,clip=n=>gltf.animations.find(a=>a.name===n),team=(typeof Office!=='undefined'?Office.TEAM:[]).concat(this.NPC);
    for(const m of team){
      const L=this.lookOf(m.id),root=SK.clone(gltf.scene),wrap=new THREE.Group();wrap.add(root);this.S.add(wrap);const mat=this.outfitMat(L),bones={};
      root.traverse(o=>{if(o.isMesh||o.isSkinnedMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;o.material=mat}if(o.isBone)bones[o.name.replace(/^mixamorig[:_]?/,'')]=o});
      const mix=new THREE.AnimationMixer(root),act={};
      for(const n of['idle','walk']){const c=clip(n);if(c){act[n]=mix.clipAction(c);act[n].play();act[n].setEffectiveWeight(n==='idle'?1:0)}}
      for(const n of['agree','headShake']){let c=clip(n);if(c){c=c.clone();THREE.AnimationUtils.makeClipAdditive(c);act[n]=mix.clipAction(c);act[n].blendMode=THREE.AdditiveAnimationBlendMode;act[n].play();act[n].setEffectiveWeight(0)}}
      if(act.idle)act.idle.time=Math.random()*2;
      const face=this.dress(L,bones),props=this.props(bones);
      const hit=new THREE.Mesh(new THREE.CapsuleGeometry(0.34,1.1,4,8),new THREE.MeshBasicMaterial({visible:false}));hit.position.y=0.9;hit.userData.id=m.id;wrap.add(hit);
      const S=this.SEATS[m.id]||[0,3,0,'trade'],seat={x:S[0],z:S[1],ry:S[2],zone:S[3]};wrap.position.set(seat.x,0,seat.z);wrap.rotation.y=seat.ry;
      const tag=document.createElement('div');tag.className='o3-tag';tag.dataset.tag=m.id;tag.innerHTML=`<div class="o3-bub"></div><b>${m.name}</b>`;this.tags.appendChild(tag);
      this.people[m.id]={m,L,wrap,root,mix,act,bones,face,props,hit,tag,seat,npc:!!this.NPC.find(x=>x.id===m.id),mode:'sit',act2:'desk',pose:'type',pw:{},path:[],sitW:1,walkW:0,backW:0,st:'idle',
        timer:2+Math.random()*8,face0:seat.ry,yaw:seat.ry,spot:null,say:'',sayT:0,cheer:0,blink:2+Math.random()*3,expr:{smile:0.3,brow:0,open:0},swivel:0,chatT:0,clickT:0}}
    this.people.barista&&(this.people.barista.mode='stand',this.people.barista.pose='barista');
    if(this.people.guard){this.people.guard.patrol=0}},
  // Gắn vật thể vào xương: tự bù tỉ lệ của khung xương
  att(bone,fn){const{THREE}=this.T;if(!bone)return null;const s=new THREE.Vector3();bone.getWorldScale(s);const g=new THREE.Group();g.scale.setScalar(1/(s.x||1));bone.add(g);fn&&fn(g);return g},
  // Tóc, khuôn mặt (mắt, lông mày, miệng có biểu cảm), kính, tai nghe Bluetooth, mũ, mũ trùm hoodie, phù hiệu…
  dress(L,b){
    const{THREE}=this.T,H=b.Head;if(!H)return null;const A=L.acc||'',hair=this.mat(L.hairc,{r:0.55,env:0.7}),F={};
    this.att(H,g=>{
      // khuôn mặt (toạ độ đo từ đầu X Bot: mặt trước z≈0,135, mắt cao 0,088 so với xương đầu)
      const white=this.mat('#ffffff',{r:0.3}),dark=this.mat('#111827',{r:0.3}),lip=this.mat('#9f1239',{r:0.5}),skin=this.mat(L.skin,{r:0.6});
      F.eyes=[];for(const dx of[-0.033,0.033]){const e=new THREE.Group();e.position.set(dx,0.088,0.127);g.add(e);const s=new THREE.Mesh(new THREE.SphereGeometry(0.016,14,10),white);s.scale.set(1,1.1,0.6);e.add(s);
        const pu=new THREE.Mesh(new THREE.SphereGeometry(0.0088,10,8),dark);pu.position.z=0.0085;pu.scale.z=0.5;e.add(pu);const hl=new THREE.Mesh(new THREE.SphereGeometry(0.0028,6,4),white);hl.position.set(0.004,0.004,0.013);e.add(hl);F.eyes.push(e)}
      F.brows=[];for(const dx of[-0.034,0.034]){const br=new THREE.Mesh(new THREE.BoxGeometry(0.03,0.006,0.008),hair);br.position.set(dx,0.116,0.132);g.add(br);F.brows.push(br)}
      const nose=new THREE.Mesh(new THREE.SphereGeometry(0.012,10,8),skin);nose.position.set(0,0.058,0.137);nose.scale.set(0.85,1.1,1);g.add(nose);
      for(const dx of[-0.088,0.088]){const ear=new THREE.Mesh(new THREE.SphereGeometry(0.02,10,8),skin);ear.position.set(dx,0.07,0.0);ear.scale.set(0.45,1,0.75);g.add(ear)}
      F.smile=new THREE.Mesh(new THREE.TorusGeometry(0.018,0.0038,6,16,Math.PI),lip);F.smile.position.set(0,0.036,0.133);F.smile.rotation.z=Math.PI;g.add(F.smile);
      F.frown=new THREE.Mesh(new THREE.TorusGeometry(0.017,0.0038,6,16,Math.PI),lip);F.frown.position.set(0,0.01,0.134);g.add(F.frown);
      F.mouth=new THREE.Mesh(new THREE.SphereGeometry(0.012,12,8),this.mat('#4c0519',{r:0.6}));F.mouth.position.set(0,0.025,0.132);F.mouth.scale.set(1,0.5,0.4);g.add(F.mouth);
      F.blush=[];for(const dx of[-0.052,0.052]){const bl=new THREE.Mesh(new THREE.CircleGeometry(0.012,12),this.mat('#fb7185',{op:0.0,noCache:true}));bl.position.set(dx,0.05,0.127);bl.rotation.y=dx>0?0.6:-0.6;g.add(bl);F.blush.push(bl)}
      // tóc: chỏm cầu nghiêng (trước cao, sau thấp) ôm sát đầu
      const st=L.hair,capped=A.includes('cap'),cap=(ph,tilt=-0.32,k=1)=>{const c=new THREE.Mesh(new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*ph),hair);c.scale.set(0.099*k,0.13*k,0.143*k);c.position.set(0,0.092,0);c.rotation.x=tilt;c.castShadow=true;g.add(c);return c};
      if(capped){}
      else if(st==='bald'){const r=new THREE.Mesh(new THREE.TorusGeometry(0.094,0.018,8,24,Math.PI*1.2),hair);r.rotation.set(Math.PI/2,0,Math.PI*0.9);r.position.set(0,0.085,-0.005);r.scale.set(1,1.4,1);g.add(r)}
      else if(st==='long'){cap(0.55,-0.3);const bk=new THREE.Mesh(new THREE.CylinderGeometry(0.112,0.105,0.28,18,1,true,Math.PI*0.6,Math.PI*0.8),hair);bk.position.set(0,-0.02,-0.012);bk.scale.z=1.25;g.add(bk)}
      else if(st==='bob'){cap(0.6,-0.2,1.03);const bk=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.112,0.12,18,1,true,Math.PI*0.45,Math.PI*1.1),hair);bk.position.set(0,0.04,-0.005);bk.scale.z=1.3;g.add(bk)}
      else{cap(0.5,st==='side'?-0.28:-0.32);if(st==='side'){const f=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.025,0.05),hair);f.position.set(-0.025,0.16,0.11);f.rotation.set(-0.4,0,0.28);g.add(f)}
        if(st==='bun'){const bn=new THREE.Mesh(new THREE.SphereGeometry(0.048,14,10),hair);bn.position.set(0,0.2,-0.1);g.add(bn)}
        if(st==='pony'){const bn=new THREE.Mesh(new THREE.SphereGeometry(0.028,10,8),hair);bn.position.set(0,0.13,-0.14);g.add(bn);const pt=new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.008,0.2,10),hair);pt.position.set(0,0.03,-0.16);pt.rotation.x=0.3;g.add(pt)}}
      if(A.includes('glasses')){const gm=this.mat('#111827',{r:0.3,m:0.5});for(const dx of[-0.033,0.033]){const r=new THREE.Mesh(new THREE.TorusGeometry(0.021,0.0035,6,18),gm);r.position.set(dx,0.088,0.142);g.add(r);
          const ln=new THREE.Mesh(new THREE.CircleGeometry(0.019,16),this.glass({tint:'#bae6fd',op:0.18}));ln.position.set(dx,0.088,0.143);g.add(ln)}
        const br=new THREE.Mesh(new THREE.BoxGeometry(0.024,0.004,0.004),gm);br.position.set(0,0.091,0.144);g.add(br);for(const dx of[-0.073,0.073]){const t=new THREE.Mesh(new THREE.BoxGeometry(0.004,0.004,0.11),gm);t.position.set(dx,0.088,0.088);t.rotation.y=dx>0?-0.28:0.28;g.add(t)}}
      if(A.includes('headset')){const hm=this.mat('#111827',{r:0.4,m:0.3});const arc=new THREE.Mesh(new THREE.TorusGeometry(0.118,0.008,8,24,Math.PI),hm);arc.position.set(0,0.098,0);g.add(arc);
        for(const dx of[-0.1,0.1]){const e=new THREE.Mesh(new THREE.CylinderGeometry(0.034,0.034,0.026,16),this.mat('#38d6b4',{r:0.4,e:'#0d9488',ei:0.4}));e.rotation.z=Math.PI/2;e.position.set(dx,0.074,0);g.add(e)}
        const mic=new THREE.Mesh(new THREE.CylinderGeometry(0.0035,0.0035,0.12,6),hm);mic.position.set(0.075,0.045,0.08);mic.rotation.set(Math.PI/2,0,0.5);g.add(mic);const mt=new THREE.Mesh(new THREE.SphereGeometry(0.008,8,6),hm);mt.position.set(0.045,0.03,0.135);g.add(mt)}
      if(A.includes('earbud')){const e=new THREE.Mesh(new THREE.CapsuleGeometry(0.008,0.02,4,8),this.mat('#f8fafc',{r:0.2}));e.position.set(0.092,0.065,0.012);e.rotation.x=0.3;g.add(e);const led=new THREE.Mesh(new THREE.SphereGeometry(0.003,6,4),this.mat('#38bdf8',{e:'#38bdf8',ei:3}));led.position.set(0.1,0.075,0.014);g.add(led)}
      if(capped){const cm=this.mat(L.capc||'#ef4444',{r:0.7});const c=new THREE.Mesh(new THREE.SphereGeometry(1,22,12,0,Math.PI*2,0,Math.PI*0.5),cm);c.scale.set(0.104,0.125,0.148);c.position.set(0,0.11,0);c.rotation.x=-0.1;g.add(c);
        const v=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.008,20,1,false,-Math.PI/2,Math.PI),cm);v.position.set(0,0.13,0.11);v.rotation.x=0.08;g.add(v);
        if(L.fit===4){const bd=new THREE.Mesh(new THREE.CircleGeometry(0.018,12),this.mat('#facc15',{m:0.8,r:0.3}));bd.position.set(0,0.19,0.125);bd.rotation.x=-0.45;g.add(bd)}}
      if(A.includes('beret')){const c=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.11,0.04,22),this.mat('#7c3aed',{r:0.9}));c.position.set(0.015,0.205,-0.005);c.rotation.z=0.18;g.add(c)}
      // biểu cảm lưu sẵn
      F.g=g});
    if(A.includes('hood')&&b.Spine2)this.att(b.Spine2,g=>{const h=new THREE.Mesh(new THREE.TorusGeometry(0.1,0.04,10,20,Math.PI*1.25),this.mat(L.shirt,{r:0.85}));h.position.set(0,0.17,-0.1);h.rotation.set(Math.PI/2.3,0,Math.PI*0.88);g.add(h)});
    if(A.includes('badge')&&b.Spine2)this.att(b.Spine2,g=>{const s=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,0.006,6),this.mat('#facc15',{m:0.9,r:0.25}));s.rotation.x=Math.PI/2;s.position.set(0.07,0.0,0.148);g.add(s)});
    if(A.includes('radio')&&b.Spine)this.att(b.Spine,g=>{const r=new THREE.Mesh(new THREE.BoxGeometry(0.04,0.09,0.03),this.mat('#111827',{r:0.4}));r.position.set(-0.15,-0.02,0.05);g.add(r)});
    if(A.includes('bag')&&b.Spine)this.att(b.Spine,g=>{const r=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.18,0.07),this.mat('#92400e',{r:0.7}));r.position.set(0.18,-0.12,0.02);g.add(r);
      const s=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.008,6,24),this.mat('#78350f'));s.position.set(0.02,0.12,0);s.rotation.set(0,Math.PI/2,0.6);g.add(s)});
    return F},
  // Đồ cầm tay: cốc, điện thoại, gậy bi-a, bút (ẩn/hiện theo hành động)
  props(b){const{THREE}=this.T,P={};const h=b.RightHand;if(!h)return P;
    this.att(h,g=>{P.cup=new THREE.Group();const c=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.03,0.09,14),this.mat('#f5f5f4',{r:0.3}));P.cup.add(c);P.cup.position.set(0.02,0.08,0.05);g.add(P.cup);
      P.phone=new THREE.Mesh(new THREE.BoxGeometry(0.07,0.14,0.01),this.mat('#111827',{r:0.2,m:0.4,e:'#1e3a8a',ei:0.6}));P.phone.position.set(0,0.05,0.035);P.phone.rotation.x=-0.6;g.add(P.phone);
      P.cue=new THREE.Mesh(new THREE.CylinderGeometry(0.008,0.014,1.45,10),this.mat('#d4a373',{r:0.4}));P.cue.position.set(0,0.06,0.62);P.cue.rotation.x=Math.PI/2;g.add(P.cue);
      P.pen=new THREE.Mesh(new THREE.CylinderGeometry(0.006,0.006,0.13,8),this.mat('#2563eb'));P.pen.position.set(0,0.08,0.03);P.pen.rotation.x=0.4;g.add(P.pen);
      P.env=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.02,0.15),this.mat('#fde68a'));P.env.position.set(0,0.12,0.03);g.add(P.env)});
    for(const k in P)P[k].visible=false;return P},
  // ---------- Tư thế (cộng vào khung xương sau hoạt ảnh gốc) ----------
  POSES:{
    type:t=>[['LeftArm',[0,0,62]],['RightArm',[0,0,-62]],['LeftForeArm',[0,-55,22]],['RightForeArm',[0,55,-22]],['Spine1',[16,0,0]],['LeftHand',[Math.sin(t*11)*12,0,0]],['RightHand',[Math.sin(t*11+1.7)*12,0,0]]],
    mouse:t=>[['LeftArm',[0,0,62]],['LeftForeArm',[0,-55,22]],['RightArm',[0,0,-52]],['RightForeArm',[0,38,-28]],['Spine1',[12,0,0]],['RightHand',[0,Math.sin(t*2.6)*10,Math.sin(t*1.9)*6]],['Head',[6,Math.sin(t*0.7)*8,0]]],
    rest:t=>[['LeftArm',[0,0,30]],['RightArm',[0,0,-30]],['LeftForeArm',[0,-70,0]],['RightForeArm',[0,70,0]],['Head',[0,Math.sin(t*0.5)*10,0]]],
    talk:t=>[['LeftArm',[0,0,30]],['LeftForeArm',[0,-70,0]],['RightArm',[0,0,-40]],['RightForeArm',[0,78+Math.sin(t*4)*18,-10]],['RightHand',[Math.sin(t*5)*15,0,0]],['Head',[0,Math.sin(t*1.3)*6,Math.sin(t*2)*4]]],
    phone:t=>[['LeftArm',[0,0,42]],['RightArm',[0,0,-42]],['LeftForeArm',[0,-118,25]],['RightForeArm',[0,118,-25]],['Neck',[22,0,0]],['Head',[10,0,0]],['RightHand',[Math.sin(t*1.5)>0.7?8:0,0,0]]],
    lean:t=>[['Spine',[-14,0,0]],['LeftArm',[0,0,22]],['RightArm',[0,0,-22]],['LeftForeArm',[0,-40,0]],['RightForeArm',[0,40,0]],['Head',[4,Math.sin(t*0.3)*6,0]]],
    cup:t=>[['RightArm',[0,0,-38]],['RightForeArm',[0,122+(Math.sin(t*0.8)>0.85?12:0),-10]],['LeftArm',[0,0,8]],['Head',[Math.sin(t*0.8)>0.85?-10:0,0,0]]],
    cue:t=>{const s=Math.max(0,Math.sin(t*1.6));return[['Spine',[18,0,0]],['Spine1',[14,0,0]],['LeftArm',[0,0,68]],['LeftForeArm',[0,-18,0]],['RightArm',[0,0,-42]],['RightForeArm',[0,72-s*28,-18]],['Head',[-12,0,0]]]},
    chalk:t=>[['RightArm',[0,0,-45]],['RightForeArm',[0,95,0]],['LeftArm',[0,0,40]],['LeftForeArm',[0,-80,0]],['Head',[0,Math.sin(t*0.6)*14,0]]],
    write:t=>[['RightArm',[0,0,-105]],['RightForeArm',[0,30+Math.sin(t*3)*8,0]],['RightHand',[Math.sin(t*7)*10,0,Math.sin(t*5)*10]],['LeftArm',[0,0,15]],['Head',[-8,0,0]]],
    foos:t=>[['Spine1',[14,0,0]],['LeftArm',[0,0,48]],['RightArm',[0,0,-48]],['LeftForeArm',[0,-28,14]],['RightForeArm',[0,28,-14]],['LeftHand',[0,Math.sin(t*9)*25,0]],['RightHand',[0,Math.sin(t*9+2)*25,0]],['Spine',[0,Math.sin(t*3)*6,0]]],
    barista:t=>[['LeftArm',[0,0,55]],['RightArm',[0,0,-55]],['LeftForeArm',[0,-60,20]],['RightForeArm',[0,60+Math.sin(t*2)*15,-20]],['Spine1',[10,0,0]],['Head',[8,Math.sin(t*0.6)*12,0]]],
    wave:t=>[['RightArm',[0,0,-150]],['RightForeArm',[0,25+Math.sin(t*9)*25,0]],['Head',[0,0,Math.sin(t*2)*5]]],
    look:t=>[['Head',[0,Math.sin(t*0.9)*35,0]],['LeftArm',[0,0,8]],['RightArm',[0,0,-8]]],
    cheer:t=>[['LeftArm',[0,-25,150+Math.sin(t*5.5)*14]],['RightArm',[0,25,-150-Math.sin(t*5.5)*14]],['LeftForeArm',[0,-20,0]],['RightForeArm',[0,20,0]],['Head',[-10,0,0]]],
    worry:t=>[['LeftArm',[0,0,35]],['RightArm',[0,0,-35]],['LeftForeArm',[0,-95,0]],['RightForeArm',[0,95,0]],['Spine1',[6,0,0]]],
    none:()=>[]},
  SIT:{chair:{y:-0.47,fwd:0.06},sofa:{y:-0.58,fwd:0.12},stool:{y:-0.3,fwd:0.04}},
  // ---------- Hành vi (máy trạng thái) ----------
  pop(p,t,s=5){if(!t)return;p.say=t;p.sayT=s},
  pick(a){return a[(Math.random()*a.length)|0]},
  go(p,to,then){p.path=this.path({x:p.wrap.position.x,z:p.wrap.position.z},to);p.dest=to;p.mode='walk';p.then=then;p.pose='none';this.showProp(p,null)},
  showProp(p,k){for(const n in p.props)p.props[n].visible=n===k},
  atSeat(p){return Math.hypot(p.wrap.position.x-p.seat.x,p.wrap.position.z-p.seat.z)<0.25},
  spotFree(s,p){return!Object.values(this.people).some(q=>q!==p&&q.spot===s)},
  leisure(p){ // chọn hoạt động giải lao: ưu tiên vào cặp bi-a / bi lắc đang có người chờ
    const S=this.SPOTS.filter(s=>!s.work&&this.spotFree(s,p)),wait=S.filter(s=>s.pair&&this.SPOTS.some(o=>o!==s&&o.pair===s.pair&&!this.spotFree(o,p)));
    if(wait.length&&Math.random()<0.8)return wait[0];const pool=S.filter(s=>!s.pair||Math.random()<0.5);return this.pick(pool.length?pool:S)},
  think(p,dt){
    p.timer-=dt;if(p.mode==='walk')return;const id=p.m.id,st=p.st;
    if(p.npc)return this.thinkNpc(p);
    if(id==='post'&&p.deliver){const t=this.people[p.deliver];p.deliver=null;if(t){p.carry=1;this.go(p,{x:t.seat.x+Math.cos(t.seat.ry)*0.75,z:t.seat.z-Math.sin(t.seat.ry)*0.75,ry:t.seat.ry-Math.PI/2},'deliver');this.showProp(p,'env');p.spot=null;return}}
    if(id==='guard'&&st!=='alert')return this.thinkGuard(p);
    if(id==='post'&&st==='idle')return this.thinkPost(p);
    const atDesk=this.atSeat(p);
    if(st==='idle'||(st==='ok'&&p.brk)){ // rảnh: đi giải lao, đổi chỗ sau một lúc
      if(p.timer>0)return;if(st==='ok'&&p.brk&&!atDesk){p.brk=0;p.spot=null;return this.go(p,p.seat,'seat')}
      if(atDesk||Math.random()<0.65){const s=this.leisure(p);if(s){p.spot=s;p.timer=99;return this.go(p,s,'spot')}}
      p.spot=null;return this.go(p,p.seat,'seat')}
    if(!atDesk){if(p.spot&&p.spot.work&&p.timer>0)return;p.spot=null;return this.go(p,p.seat,'seat')}
    // đang làm việc tại bàn
    if(st==='happy'&&p.cheer<=0&&!p.cheered){p.cheered=1;p.cheer=4;p.mode='stand'}if(st!=='happy')p.cheered=0;
    if(p.cheer>0){p.mode='stand';p.pose='cheer';return}
    if(st==='alert'){p.mode='stand';p.pose='worry';return}
    p.mode='sit';
    if(p.timer<=0){
      const r=Math.random(),work=this.SPOTS.filter(s=>s.work&&s.only&&s.only.includes(id)&&this.spotFree(s,p));
      if(work.length&&r<0.18){const s=this.pick(work);p.spot=s;p.timer=14+Math.random()*10;return this.go(p,s,'spot')}
      if(st==='ok'&&r<0.12){p.brk=1;p.timer=0;return}
      const nb=this.NEIGH.find(([a,b])=>(a===id||b===id)&&this.people[a]&&this.people[b]&&this.people[a].mode==='sit'&&this.people[b].mode==='sit'&&this.atSeat(this.people[a])&&this.atSeat(this.people[b])&&!this.people[a].chatT&&!this.people[b].chatT);
      if(nb&&r<0.55){const[a,b]=nb.map(k=>this.people[k]),side=(this.people[nb[1]].seat.x-this.people[nb[0]].seat.x)>0?1:-1;
        a.chatT=b.chatT=7;a.swivel=side;b.swivel=-side;a.pose='talk';b.pose='rest';this.pop(a,'💬 '+this.pick(this.CHAT),4);setTimeout(()=>{this.pop(b,'💬 '+this.pick(this.CHAT),3.5);b.pose='talk';a.pose='rest'},3500);p.timer=8;return}
      p.pose=st==='busy'||Math.random()<0.6?(Math.random()<0.75?'type':'mouse'):'rest';p.timer=6+Math.random()*10;
      if(st==='busy'&&Math.random()<0.3&&p.text)this.pop(p,p.text,4)}},
  thinkGuard(p){ // đi tuần: sảnh → sàn giao dịch → lounge → về chốt
    if(p.timer>0)return;const R=[{x:12.2,z:4.8,ry:Math.PI/2},{x:10.8,z:9.6,ry:0},{x:5.2,z:-0.4,ry:Math.PI},{x:-5.2,z:-3.6,ry:-Math.PI/2},{x:-6.2,z:1.2,ry:Math.PI/2},{x:-8.6,z:6.2,ry:0},{x:0,z:1.6,ry:0},{x:6,z:-7.6,ry:Math.PI},{x:14,z:4.6,ry:-Math.PI/2}];
    if(p.patrol==null)p.patrol=0;if(p.patrol>=R.length){p.patrol=0;p.timer=12+Math.random()*10;p.spot=null;return this.go(p,p.seat,'seat')}
    const w=R[p.patrol++];p.spot={k:'patrol'};p.timer=99;this.go(p,w,'patrol')},
  thinkPost(p){ // bưu tá rảnh: đi vòng phát thư qua các bàn rồi về quầy
    if(p.timer>0)return;const ids=['radar','rsi2','smc','btc100','trader','news','risk','acc','lab'];if(!p.round)p.round=[];
    if(!p.round.length&&!this.atSeat(p)){p.timer=18+Math.random()*14;p.spot=null;return this.go(p,p.seat,'seat')}
    if(!p.round.length)p.round=ids.sort(()=>Math.random()-0.5).slice(0,3);const t=this.people[p.round.shift()];if(!t)return;
    p.spot={k:'round'};p.timer=99;this.showProp(p,'env');this.go(p,{x:t.seat.x+Math.cos(t.seat.ry)*0.75,z:t.seat.z-Math.sin(t.seat.ry)*0.75,ry:t.seat.ry-Math.PI/2},'round')},
  thinkNpc(p){
    if(p.m.id==='barista'){p.mode='stand';const busy=Object.values(this.people).some(q=>q.spot&&q.spot.k==='coffee'&&q.mode!=='walk');this.brewing=busy;
      if(p.timer<=0){p.timer=5+Math.random()*6;p.pose=busy&&Math.random()<0.5?'cup':'barista';this.showProp(p,p.pose==='cup'?'cup':null);if(busy)this.pop(p,this.pick(['☕ Cà phê của bạn đây!','☕ Espresso nóng hổi!','☕ Đợi chút, đang pha nha']),3.5)}}
    if(p.m.id==='recep'){p.mode='sit';if(p.timer<=0){p.timer=8+Math.random()*10;const g=this.people.guard,near=g&&Math.hypot(g.wrap.position.x-11,g.wrap.position.z-6.5)<4.5&&g.mode==='walk';
      if(near||Math.random()<0.25){p.pose='wave';p.waveT=2.5;this.pop(p,near?'👋 Chào bác Sơn!':'👋 Xin chào quý khách!',3)}else p.pose=Math.random()<0.6?'type':'rest'}if(p.waveT>0&&(p.waveT-=1/60)<=0)p.pose='type'}},
  arrive(p){
    const d=p.dest||p.seat;if(d.ry!=null)p.face0=d.ry;
    if(p.then==='spot'&&p.spot){const s=p.spot;p.mode=s.sit?'sit':'stand';p.sitK=s.sit||'chair';p.pose=s.pose||'look';this.showProp(p,s.prop||null);p.timer=s.work?p.timer:16+Math.random()*16;this.pop(p,this.pick(s.say||['']));
      if(s.pair){const mate=Object.values(this.people).find(q=>q!==p&&q.spot&&q.spot.pair===s.pair&&q.mode!=='walk');if(mate){mate.timer=Math.max(mate.timer,18);p.timer=18}else p.timer=20}
      if(s.snd)this.Snd.blip(this,s.snd)}
    else if(p.then==='deliver'||p.then==='round'){p.mode='stand';p.pose='talk';p.timer=p.then==='round'?3:2.8;this.pop(p,p.then==='deliver'?'📨 Có thư mới cho bạn!':'📨 Phát thư nè',3);
      setTimeout(()=>{this.showProp(p,null);p.pose='none'},1600);if(p.then==='deliver')setTimeout(()=>{if(p.mode!=='walk'){p.spot=null;this.go(p,p.seat,'seat')}},2800)}
    else if(p.then==='patrol'){p.mode='stand';p.pose='look';p.timer=2+Math.random()*3;if(Math.random()<0.3)this.pop(p,this.pick(['🔦 Đi tuần một vòng','👮 Mọi thứ ổn','🚪 Kiểm tra cửa ra vào']),3);
      if(Math.hypot(p.wrap.position.x-13,p.wrap.position.z-7)<3){this.gatePulse=2;this.gateBeep=1}}
    else{p.mode='sit';p.sitK='chair';p.pose='type';p.timer=(p.st==='idle'?6:2)+Math.random()*10;p.spot=null}},
  // ---------- Một khung hình cho một người ----------
  step(p,dt,t){
    const{THREE}=this.T,W=p.wrap;
    if(p.mode==='walk'){const n=p.path[0];if(!n){p.mode='stand';this.arrive(p)}else{const dx=n.x-W.position.x,dz=n.z-W.position.z,d=Math.hypot(dx,dz),v=(p.m.id==='guard'?1.05:1.3)*dt;
      if(d<=v){W.position.x=n.x;W.position.z=n.z;p.path.shift();if(!p.path.length)this.arrive(p)}else{W.position.x+=dx/d*v;W.position.z+=dz/d*v;p.face0=Math.atan2(dx,dz)}}}
    // xoay ghế trao đổi với đồng nghiệp
    p.chatT=Math.max(0,p.chatT-dt);if(!p.chatT&&p.swivel){p.swivel=0;if(p.pose==='talk')p.pose='type'}
    const sw=p.mode==='sit'&&this.atSeat(p)?p.swivel*0.75:0;p.swv=(p.swv||0)+(sw-(p.swv||0))*Math.min(1,dt*3);
    let target=p.face0+p.swv,df=target-W.rotation.y;df=Math.atan2(Math.sin(df),Math.cos(df));W.rotation.y+=df*Math.min(1,dt*7);
    const ch=this.chairs&&this.chairs[p.m.id];if(ch)ch.rotation.y=this.atSeat(p)?p.swv:0;
    // trọng số
    const sit=p.mode==='sit'?1:0,walk=p.mode==='walk'?1:0,k=Math.min(1,dt*4);p.sitW+=(sit-p.sitW)*Math.min(1,dt*3);p.walkW+=(walk-p.walkW)*k;
    if(p.act.walk){p.act.walk.setEffectiveWeight(p.walkW);p.act.walk.timeScale=p.m.id==='guard'?0.85:1}if(p.act.idle)p.act.idle.setEffectiveWeight(1-p.walkW);
    p.cheer=Math.max(0,p.cheer-dt);if(p.cheer<=0&&p.pose==='cheer')p.pose='type';
    if(p.act.agree)p.act.agree.setEffectiveWeight(p.pose==='cheer'?1:0);if(p.act.headShake)p.act.headShake.setEffectiveWeight(p.pose==='worry'?0.8:0);
    p.mix.update(dt);
    // tư thế cộng thêm
    const B=p.bones,q=new THREE.Quaternion(),e=new THREE.Euler(),R=Math.PI/180,add=(b,a,w)=>{if(!b||!w)return;e.set(a[0]*R*w,a[1]*R*w,a[2]*R*w);q.setFromEuler(e);b.quaternion.multiply(q)};
    const s=p.sitW,SK=this.SIT[p.sitK||'chair'];add(B.LeftUpLeg,[-88,0,0],s);add(B.RightUpLeg,[-88,0,0],s);add(B.LeftLeg,[95,0,0],s);add(B.RightLeg,[95,0,0],s);add(B.Spine,[6,0,0],s);
    const want=p.mode==='walk'?'none':p.pose||'none';for(const n in this.POSES){const w0=p.pw[n]||0,w1=n===want?1:0;if(!w0&&!w1)continue;const w=w0+(w1-w0)*Math.min(1,dt*5);p.pw[n]=w<0.003&&!w1?0:w;
      if(p.pw[n])for(const[bn,a]of this.POSES[n](t+p.m.id.length))add(B[bn],a,p.pw[n])}
    // sống động: nhịp thở, thỉnh thoảng liếc sang màn hình bên cạnh / đồng nghiệp, đổi tư thế nhẹ
    const ph=p.ph||(p.ph=1+Math.random()*6),still=p.mode==='walk'?0.3:1;add(B.Spine2,[Math.sin(t*1.65+ph)*1.8*still,0,0],1);add(B.Neck,[Math.sin(t*1.65+ph+0.6)*0.8,0,0],1);
    if(p.mode!=='walk'){const gl=Math.max(0,Math.sin(t*0.21+ph*2.3)-0.55)/0.45;add(B.Head,[0,Math.sin(t*0.07+ph)>0?gl*16:-gl*16,0],1);add(B.Spine,[0,Math.sin(t*0.13+ph)*1.5,0],1)}
    const back=(p.mode==='stand'&&this.atSeat(p))?1:0;p.backW+=(back-p.backW)*Math.min(1,dt*3); // đứng dậy tại bàn thì lùi ra sau ghế
    p.root.position.y=SK.y*s;p.root.position.z=SK.fwd*s-0.45*p.backW;
    this.faceStep(p,dt,t);p.sayT=Math.max(0,p.sayT-dt)},
  // Biểu cảm: cười / nhíu mày / chớp mắt / nói
  faceStep(p,dt,t){const F=p.face;if(!F||!F.smile)return;const st=p.st,leis=p.spot&&!p.spot.work;
    const tg={smile:p.pose==='cheer'||st==='happy'?1:st==='alert'?-0.9:leis?0.7:st==='busy'?0.05:0.35,brow:st==='alert'?1:p.pose==='cheer'?-0.6:st==='busy'?0.35:0,open:p.sayT>0?0.5+0.5*Math.sin(t*16):p.pose==='cheer'?0.8:0};
    for(const k in tg)p.expr[k]+=(tg[k]-p.expr[k])*Math.min(1,dt*5);const E=p.expr;
    F.smile.visible=E.smile>0.05;F.smile.scale.set(1,Math.max(0.2,E.smile),1);F.frown.visible=E.smile<-0.05;F.frown.scale.set(1,Math.max(0.2,-E.smile),1);
    F.mouth.visible=E.open>0.15;F.mouth.scale.set(1,0.25+E.open*0.75,0.4);if(F.mouth.visible){F.smile.visible=E.smile>0.4;F.frown.visible=false}
    F.brows.forEach((b,i)=>{b.rotation.z=(i?-1:1)*E.brow*0.45;b.position.y=0.112+(E.brow<0?-E.brow*0.008:-E.brow*0.004)});
    F.blush.forEach(b=>b.material.opacity=Math.max(0,E.smile-0.6)*0.9);
    p.blink-=dt;const bl=p.blink<0.12&&p.blink>0?0.12:1;if(p.blink<0)p.blink=2.5+Math.random()*4;F.eyes.forEach(e=>e.scale.y=bl)},
  // ---------- Camera ----------
  view(k){this.sel=null;this.follow=null;this.hideCard();const z=this.ZONES.find(z=>z.k===k),port=this.cam.aspect<0.8,c=k==='all'?(port?[[24,38,0.2],[0,0,0.2]]:this.CAM_ALL):z&&z.cam;if(c)this.fly(c[0],c[1],1.4,k==='all'&&port);this.el.querySelectorAll('#o3cam button').forEach(b=>b.classList.toggle('on',b.dataset.cam===k))},
  fly(pos,tgt,dur=1.4,raw){const{THREE}=this.T,k=raw?1:this.cam.aspect<1?1.75:1;pos=pos.map((v,i)=>tgt[i]+(v-tgt[i])*k);this.anim={t:0,dur,p0:this.cam.position.clone(),p1:new THREE.Vector3(...pos),t0:this.ctl.target.clone(),t1:new THREE.Vector3(...tgt)}},
  select(id){const p=this.people[id];if(!p)return;this.tour(false);this.sel=id;if(this.ring){this.ring.visible=true;this.ringT=0}this.el.querySelectorAll('#o3cam button').forEach(b=>b.classList.remove('on'));const x=p.wrap.position.x,z=p.wrap.position.z,ry=p.wrap.rotation.y;
    const desk=this.atSeat(p)&&!p.npc,a=ry+0.4,d=2.6; // tại bàn: camera cao hơn để nhìn qua dàn màn hình thấy mặt
    this.fly([x+Math.sin(a)*d,desk?2.95:2.2,z+Math.cos(a)*d],[x,p.mode==='sit'?1.05:1.3,z]);this.follow=id;this.showCard(id);this.pop(p,p.npc?'👋 Xin chào!':(p.text||'👋'),4)},
  unselect(){this.sel=null;this.follow=null;this.hideCard()},
  userMove(){if(this.anim&&this.anim.t>0.15)this.anim=null;if(this.touring)this.tour(false)},
  tour(on){this.touring=on;const c=this.el&&this.el.querySelector('#o3tour');if(c)c.checked=on;this.tourT=0;this.tourI=0;if(on){this.unselect();this.tourStep()}},
  tourStep(){const list=['all',...this.ZONES.map(z=>z.k)],busy=Object.values(this.people).filter(p=>!p.npc&&(p.st==='happy'||p.st==='alert'));
    if(busy.length&&this.tourI%3===2){const p=busy[this.tourI%busy.length];this.sel=p.m.id;const x=p.wrap.position.x,z=p.wrap.position.z;this.fly([x+2.2,2.6,z+2.6],[x,1.1,z],2.2);this.tourI++;return}
    this.view(list[this.tourI++%list.length]);this.anim&&(this.anim.dur=2.4)},
  // ---------- Thẻ hồ sơ ----------
  STT:{busy:'Đang làm việc',happy:'Có tin vui',alert:'Cần chú ý',ok:'Sẵn sàng',idle:'Đang nghỉ'},
  ACT:{desk:'Tại bàn làm việc',coffee:'Ở quầy cà phê',water:'Lấy nước',sofa:'Nghỉ trên sofa',pool:'Chơi bi-a',foos:'Chơi bi lắc',window:'Ngắm phố',board:'Viết bảng kính thuật toán',wall:'Xem bảng giá lớn',exec:'Xem bảng điều hành',patrol:'Đi tuần tra',round:'Đi phát thư'},
  showCard(id){this.cardId=id;this.card.hidden=false;this.renderCard()},
  hideCard(){this.cardId=null;if(this.card)this.card.hidden=true;if(this.ring)this.ring.visible=false;if(this.selSpot)this.selSpot.intensity=0},
  renderCard(){const id=this.cardId,p=this.people[id];if(!p)return;const m=p.m,esc2=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    let r={st:p.st,say:p.text||'',kv:[]};if(!p.npc){try{r=Office.read(id)}catch(e){}}
    const av=!p.npc&&typeof Office!=='undefined'&&Office.sprite?Office.sprite(m.look,3):`<span class="o3-emo">${id==='barista'?'☕':'🛎️'}</span>`;
    const where=p.mode==='walk'?'Đang di chuyển':p.spot?this.ACT[p.spot.k]||'Đang nghỉ':p.npc?(id==='barista'?'Sau quầy bar':'Tại quầy lễ tân'):this.ACT.desk;
    const html=`<button class="o3-x" title="Đóng">×</button><div class="o3-ch">${av}<div><b>${esc2(m.name)}</b><small>${esc2(m.role)}</small></div></div>
      <div class="o3-row"><span class="o3-st st-${r.st}">${this.STT[r.st]||'Đang nghỉ'}</span><span class="o3-where">📍 ${where}</span></div>
      ${r.say?`<p class="o3-sy">“${esc2(r.say)}”</p>`:''}${r.kv&&r.kv.length?`<div class="o3-kv">${r.kv.slice(0,4).map(([k,v])=>`<div><small>${esc2(k)}</small><b>${esc2(v)}</b></div>`).join('')}</div>`:''}
      <p class="o3-job">${esc2(m.job||'')}</p>${p.npc?'':`<button class="bx o3-more" data-o3more="${id}">Mở hồ sơ đầy đủ →</button>`}`;
    if(this.card._h!==html){this.card.innerHTML=html;this.card._h=html}},
  // ---------- Thanh chỉ số + sơ đồ thu nhỏ ----------
  renderKpi(){const G=this.g(),S=G.S,n=(S.w||0)+(S.be||0)+(S.l||0);let kz='';try{kz=Strat.impl.smc.kzName(Date.now())}catch(e){}
    const working=Object.values(this.people).filter(p=>!p.npc&&(p.st==='busy'||p.st==='happy')).length,team=Object.values(this.people).filter(p=>!p.npc).length;
    const html=`<span>🏆 Winrate <b>${n?((S.w||0)/n*100).toFixed(0):0}%</b></span><span>💰 <b class="${(S.net||0)>=0?'up':'dn'}">${typeof Fmt!=='undefined'?Fmt.sgn(S.net||0):S.net||0}</b></span><span>📂 <b>${G.open.length}</b> lệnh mở</span><span>⏱ ${kz?'<b class="up">Killzone '+kz+'</b>':'Ngoài killzone'}</span><span>👥 <b>${working}/${team}</b> đang làm</span>`;
    if(this.kpi._h!==html){this.kpi.innerHTML=html;this.kpi._h=html}},
  mapXY(x,z){const c=this.map;return[(x+16)/32*c.width,(z+11)/22*c.height]},
  renderMap(){const c=this.map;if(!c||!c.offsetWidth)return;const g=c.getContext('2d'),W=c.width,H=c.height;g.clearRect(0,0,W,H);g.fillStyle='rgba(10,18,32,.82)';g.fillRect(0,0,W,H);
    for(const Z of this.ZONES){const[a,b]=this.mapXY(Z.x[0],Z.z[0]),[c2,d]=this.mapXY(Z.x[1],Z.z[1]);g.fillStyle=Z.c+'33';g.fillRect(a,b,c2-a,d-b);g.strokeStyle=Z.c+'aa';g.strokeRect(a+0.5,b+0.5,c2-a-1,d-b-1)}
    g.strokeStyle='rgba(125,211,252,.6)';g.lineWidth=2;g.beginPath();g.moveTo(1,0);g.lineTo(1,H);g.stroke();g.lineWidth=1;
    for(const p of Object.values(this.people)){const[x,y]=this.mapXY(p.wrap.position.x,p.wrap.position.z);g.fillStyle=p.npc?'#e5e7eb':this.STC[p.st]||'#64748b';g.beginPath();g.arc(x,y,this.sel===p.m.id?5:3.4,0,7);g.fill();if(this.sel===p.m.id){g.strokeStyle='#fff';g.stroke()}}
    // vùng camera đang thấy trên mặt sàn (hình thang) + vị trí, hướng camera
    const F=this.camFoot().map(([x,z])=>this.mapXY(x,z));g.save();g.beginPath();F.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fillStyle='rgba(240,214,138,.16)';g.fill();g.strokeStyle='rgba(240,214,138,.85)';g.lineWidth=1.2;g.stroke();g.restore();
    const[cx,cy]=this.mapXY(this.cam.position.x,this.cam.position.z),[tx,ty]=this.mapXY(this.ctl.target.x,this.ctl.target.z),an=Math.atan2(ty-cy,tx-cx),X=Math.max(5,Math.min(W-5,cx)),Y=Math.max(5,Math.min(H-5,cy));
    g.strokeStyle='rgba(240,214,138,.5)';g.setLineDash([3,3]);g.beginPath();g.moveTo(X,Y);g.lineTo(tx,ty);g.stroke();g.setLineDash([]);g.fillStyle='#f0d68a';g.beginPath();g.arc(tx,ty,2.5,0,7);g.fill();
    g.save();g.translate(X,Y);g.rotate(an);g.fillStyle='#f0d68a';g.strokeStyle='#0b1220';g.beginPath();g.moveTo(7,0);g.lineTo(-5,-5);g.lineTo(-2,0);g.lineTo(-5,5);g.closePath();g.fill();g.stroke();g.restore()},
  camFoot(){const{THREE}=this.T,ray=this._ray||(this._ray=new THREE.Raycaster()),v=this._v2||(this._v2=new THREE.Vector2()),out=[];
    for(const[x,y]of[[-1,-1],[1,-1],[1,1],[-1,1]]){v.set(x,y);ray.setFromCamera(v,this.cam);const o=ray.ray.origin,d=ray.ray.direction;let t=d.y<-1e-3?-o.y/d.y:45;t=Math.min(t,45);out.push([o.x+d.x*t,o.z+d.z*t])}return out},
  mapClick(e){const r=this.map.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*32-16,z=(e.clientY-r.top)/r.height*22-11;
    const p=Object.values(this.people).map(p=>[p,Math.hypot(p.wrap.position.x-x,p.wrap.position.z-z)]).sort((a,b)=>a[1]-b[1])[0];if(p&&p[1]<1.2)return this.select(p[0].m.id);
    const Z=this.ZONES.find(Z=>x>=Z.x[0]&&x<=Z.x[1]&&z>=Z.z[0]&&z<=Z.z[1]);if(Z)return this.view(Z.k);this.tour(false);this.fly([x+3,7,z+8],[x,0.5,z])},
  // ---------- Âm thanh vòm 3D tự tổng hợp (không cần tải file) ----------
  Snd:{ctx:null,on:false,
    toggle(O,on){this.on=on;O.setPref('o3snd',on);if(on&&!this.ctx)this.init(O);if(this.ctx){on?this.ctx.resume():this.ctx.suspend()}},
    init(O){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const C=this.ctx=new AC();this.master=C.createGain();this.master.gain.value=0.9;this.master.connect(C.destination);
      const n=C.createBuffer(1,C.sampleRate*2,C.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=n;this.keys={};
      for(const[id,S]of Object.entries(O.SEATS))this.keys[id]=this.pan(S[0],0.8,S[1]+Math.cos(S[2])*0.6,1.2,1);
      this.murmurT=this.loop(0,1.4,-3.6,'bandpass',420,0.9,0.05,2.5);this.murmurL=this.loop(-10.5,1.3,7,'bandpass',380,0.9,0.0,2.5);
      this.esp=this.loop(-13.8,1.3,3.75,'bandpass',2600,0.7,0.0,1.4);this.hum=this.loop(-12.9,1.2,-10.2,'lowpass',260,0.7,0.09,1.8);
      const o=C.createOscillator();o.type='sawtooth';o.frequency.value=55;const og=C.createGain();og.gain.value=0.012;const f=C.createBiquadFilter();f.type='lowpass';f.frequency.value=160;o.connect(f).connect(og).connect(this.pan(-12.9,1.2,-10.2,1.8));o.start();
      this.tv=this.loop(-11.5,1.15,7.6,'bandpass',1100,1.4,0.0,1.6);
      this.city=this.loop(-15.6,1.6,0,'lowpass',320,0.6,0.03,4)}, // phố bên ngoài vách kính (xe cộ trầm, đêm rõ hơn)
    pan(x,y,z,ref=1.5,cheap){const C=this.ctx,p=C.createPanner();p.panningModel=cheap||matchMedia('(max-width:760px)').matches?'equalpower':'HRTF';p.distanceModel='inverse';p.refDistance=ref;p.maxDistance=60;p.rolloffFactor=1.5;
      if(p.positionX){p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z}else p.setPosition(x,y,z);p.connect(this.master);return p},
    loop(x,y,z,type,f,Q,g0,ref){const C=this.ctx,s=C.createBufferSource();s.buffer=this.noise;s.loop=true;const fl=C.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=Q;const g=C.createGain();g.gain.value=g0;s.connect(fl).connect(g).connect(this.pan(x,y,z,ref));s.start();return g},
    click(id){const C=this.ctx,P=this.keys[id];if(!P)return;const s=C.createBufferSource();s.buffer=this.noise;const f=C.createBiquadFilter();f.type='highpass';f.frequency.value=2200+Math.random()*1800;const g=C.createGain(),t=C.currentTime;
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.18+Math.random()*0.18,t+0.002);g.gain.exponentialRampToValueAtTime(0.0001,t+0.035);s.connect(f).connect(g).connect(P);s.start(t,Math.random()*1.5,0.05)},
    tone(x,z,fr,dur,vol){const C=this.ctx,o=C.createOscillator(),g=C.createGain(),t=C.currentTime;o.frequency.value=fr;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g).connect(this.pan(x,1,z,1.2));o.start(t);o.stop(t+dur+0.02)},
    blip(O,k){if(!this.on||!this.ctx)return;if(k==='espresso'){const g=this.esp.gain,t=this.ctx.currentTime;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0.16,t+0.3);g.linearRampToValueAtTime(0.03,t+4)}},
    frame(O,dt){if(!this.on||!this.ctx)return;const C=this.ctx,L=C.listener,c=O.cam.position,f=new O.T.THREE.Vector3();O.cam.getWorldDirection(f);
      if(L.positionX){L.positionX.value=c.x;L.positionY.value=c.y;L.positionZ.value=c.z;L.forwardX.value=f.x;L.forwardY.value=f.y;L.forwardZ.value=f.z;L.upX.value=0;L.upY.value=1;L.upZ.value=0}else{L.setPosition(c.x,c.y,c.z);L.setOrientation(f.x,f.y,f.z,0,1,0)}
      this.fx(O);for(const p of Object.values(O.people))if(p.pose==='type'&&p.mode==='sit'&&p.pw.type>0.5&&Math.random()<dt*9)this.click(p.m.id);
      if((this.amb=(this.amb||0)+dt)<0.3)return;this.amb=0;
      const P=Object.values(O.people),inL=P.filter(p=>p.spot&&!p.spot.work&&p.mode!=='walk').length,talk=P.filter(p=>p.sayT>0).length;
      const t=C.currentTime;this.murmurT.gain.setTargetAtTime(0.03+Math.min(0.08,talk*0.015)*(0.6+0.4*Math.random()),t,0.3);this.murmurL.gain.setTargetAtTime(Math.min(0.12,inL*0.03)*(0.6+0.4*Math.random()),t,0.3);
      if(this.city)this.city.gain.setTargetAtTime((O.ph0==='night'?0.06:0.035)*(0.85+0.3*Math.random()),t,0.8);
      this.tv.gain.setTargetAtTime(P.some(p=>p.spot&&p.spot.k==='sofa'&&p.mode!=='walk')?0.05*(0.5+0.5*Math.random()):0.012,t,0.2);
      this.fx(O)},
    fx(O){if(O.poolShot){O.poolShot=0;this.tone(-10,4.4,1900,0.05,0.25);setTimeout(()=>this.ctx&&this.tone(-9.6,4.4,1600,0.04,0.15),180)}
      if(O.gateBeep){O.gateBeep=0;this.tone(13,7,1250,0.12,0.12)}}},
  // ---------- Vòng lặp ----------
  start(){if(!this.ready||this.running)return;this.running=true;this.clock.getDelta();const loop=()=>{if(!this.running)return;this.raf=requestAnimationFrame(loop);this.frame()};loop()},
  stop(){this.running=false;cancelAnimationFrame(this.raf);if(this.Snd.ctx)this.Snd.ctx.suspend();if(!this.vis){this.vis=1;document.addEventListener('visibilitychange',()=>{if(!document.hidden&&this.el&&this.el.isConnected&&this.el.offsetWidth)this.start()})}},
  frame(){
    if(!this.el.isConnected||!this.el.offsetWidth||document.hidden){this.stop();return} // rời trang Văn phòng hoặc ẩn tab: dừng vẽ cho đỡ tốn pin
    if(this.Snd.on&&this.Snd.ctx&&this.Snd.ctx.state==='suspended')this.Snd.ctx.resume();
    const dt=Math.min(0.05,this.clock.getDelta()),t=performance.now()/1000;
    this.tick2+=dt;if(this.tick2>2){this.tick2=0;this.sync()}
    for(const p of Object.values(this.people)){this.think(p,dt);this.step(p,dt,t)}
    // camera: bay mượt / bám theo nhân vật đang chọn / tham quan tự động
    if(this.anim){const a=this.anim;a.t=Math.min(1,a.t+dt/(a.dur||1.4));const e=a.t<0.5?4*a.t*a.t*a.t:1-Math.pow(-2*a.t+2,3)/2;this.cam.position.lerpVectors(a.p0,a.p1,e);this.ctl.target.lerpVectors(a.t0,a.t1,e);if(a.t>=1)this.anim=null}
    else if(this.follow&&this.people[this.follow]){const p=this.people[this.follow].wrap.position,tg=this.ctl.target,dx=p.x-tg.x,dz=p.z-tg.z;tg.x+=dx*Math.min(1,dt*3);tg.z+=dz*Math.min(1,dt*3);this.cam.position.x+=dx*Math.min(1,dt*3);this.cam.position.z+=dz*Math.min(1,dt*3)}
    if(this.touring){this.tourT+=dt;if(this.tourT>9){this.tourT=0;this.tourStep()}}
    this.doorStep(dt);this.keyStep(dt);this.ctl.update();
    // đèn máy chủ nhấp nháy, cổng soát vé, bi-a, bi lắc, hơi nước
    this.fr=(this.fr||0)+1;if(this.leds&&this.fr%4===0){const{THREE}=this.T,c=new THREE.Color();for(let i=0;i<this.ledN;i++){const v=Math.sin(t*(3+i%7)+i*1.7);c.set(i%9===0?(v>0.6?'#f59e0b':'#3a2a05'):v>-0.2?'#22c55e':'#063015');this.leds.setColorAt(i,c)}this.leds.instanceColor.needsUpdate=true}
    if(this.gates){this.gatePulse=Math.max(0,(this.gatePulse||0)-dt);const on=this.gatePulse>0&&(t*6|0)%2;this.gates.forEach((m,i)=>{m.emissive.set(on&&i===1?'#38bdf8':'#22c55e')})}
    this.poolStep(dt,t);if(this.rods){const play=Object.values(this.people).filter(p=>p.spot&&p.spot.pair==='foos'&&p.mode!=='walk').length;this.rods.forEach((r,i)=>{r.rotation.z=play?Math.sin(t*(7+i)+i)*0.9:0;r.position.z=play?Math.sin(t*2.3+i)*0.08:0})}
    this.steamStep(dt);this.Snd.frame(this,dt);
    // màn hình: vẽ lại luân phiên vài cái mỗi khung để không giật
    if(this.fr%5===1){this.wallScr.redraw();this.tvC.redraw()}
    const n=this.screens.length;if(n){const per=Math.max(1,Math.ceil(n/50));for(let k=0;k<per;k++){this.screens[this.scrI%n].redraw();this.scrI++}}
    this.selStep(dt,t);this.draw3d();this.labels();if((this.mapT=(this.mapT||0)+dt)>0.25){this.mapT=0;this.renderMap();this.zoneHere();if(this.cardId)this.renderCard()}},
  poolStep(dt,t){if(!this.balls)return;const pl=Object.values(this.people).filter(p=>p.spot&&p.spot.pair==='pool'&&p.mode!=='walk');
    pl.forEach((p,i)=>{const turn=((t/5)|0)%Math.max(1,pl.length)===i;p.pose=turn?'cue':'chalk';this.showProp(p,'cue')});
    const cb=this.balls[0];if(pl.length&&(t%5)<0.05&&!this.shot){this.shot={t:0,dx:(Math.random()-0.2)*0.9,dz:(Math.random()-0.5)*0.6};this.poolShot=1}
    if(this.shot){const s=this.shot;s.t+=dt;const k=Math.max(0,1-s.t/1.6);cb.position.x=Math.max(-1.2,Math.min(1.2,cb.position.x+s.dx*k*dt*2));cb.position.z=Math.max(-0.65,Math.min(0.65,cb.position.z+s.dz*k*dt*2));cb.rotation.x+=k*dt*10;
      if(s.t>1.6){this.shot=null;if(Math.abs(cb.position.x)>1.1)cb.position.set(-0.6,0.87,0)}}},

  // ================= Nâng cấp hình ảnh: hậu kỳ, ánh sáng theo giờ, hắt sáng màn hình, đèn bàn, vòng chọn =================
  hourVN(){const d=new Date();return(d.getUTCHours()+7+d.getUTCMinutes()/60)%24}, // giờ Việt Nam (UTC+7), không phụ thuộc múi giờ máy
  phase(){if(this.tod==='day')return'day';if(this.tod==='night')return'night';const h=this.hourVN();return h<5.5||h>=18.5?'night':(h>=16.8&&h<18.5)||(h>=5.5&&h<6.8)?'dusk':'day'},
  paintTod(){const b=this.todBtn;if(!b)return;const[i,t]={auto:['🕒','Theo giờ thật'],day:['☀️','Ban ngày'],night:['🌙','Đêm Sài Gòn']}[this.tod]||['🕒','Theo giờ thật'];b.innerHTML=`${i}<em> ${t}</em>`;b.title='Ánh sáng: '+t+' (bấm để đổi: theo giờ thật Việt Nam → ban ngày → đêm)'},
  MOOD:{ // nắng/trăng, trời, đèn trần, bloom, vệt sáng màn hình, đèn vùng video wall, đèn bàn, phơi sáng
    day:{sun:['#fff1d6',2.2],hemi:['#dfe9ff','#3a2f26',0.45],lamp:1,bloom:0.28,glow:1,area:2.2,desk:0.5,exp:0.95,scr:1.15,bg:'#0b1322'},
    dusk:{sun:['#ffb27a',1.2],hemi:['#c7b8ff','#3a2a22',0.28],lamp:0.85,bloom:0.45,glow:1.6,area:2.6,desk:1.0,exp:0.95,scr:1.25,bg:'#120f22'},
    night:{sun:['#9db7ff',0.28],hemi:['#4b5d8f','#140f0c',0.08],lamp:0.62,bloom:0.6,glow:2.6,area:3.2,desk:1.3,exp:0.92,scr:1.45,bg:'#050912'}},
  mood(force){const ph=this.phase();if(!force&&ph===this.ph0)return;this.ph0=ph;const M=this.MOOD[ph];if(!this.sun)return;
    this.sun.color.set(M.sun[0]);this.sun.intensity=M.sun[1];this.hemi.color.set(M.hemi[0]);this.hemi.groundColor.set(M.hemi[1]);this.hemi.intensity=M.hemi[2];
    (this.lamps||[]).forEach(l=>l.p.intensity=l.i*M.lamp);this.R.toneMappingExposure=M.exp;this.S.background.set(M.bg);if(this.S.fog)this.S.fog.color.set(M.bg);
    (this.glowMats||[]).forEach(m=>m.opacity=Math.min(0.85,m.userData.op*M.glow));(this.areas||[]).forEach(a=>a.intensity=this.hq?M.area:0);(this.deskLamps||[]).forEach(l=>l.intensity=this.hq?M.desk:0);
    (this.lampHeads||[]).forEach(m=>m.emissiveIntensity=ph==='day'?0.8:1.6);if(this.execSpot){this.execSpot.intensity=({day:9,dusk:16,night:22})[ph];this.execSpot.castShadow=!!this.hq}(this.scrMats||[]).forEach(m=>m.emissiveIntensity=m.userData.em*M.scr);if(this.fx)this.fx.bloom.strength=M.bloom;if(this.sky)this.sky.redraw()},
  fxInit(){const{THREE,FX}=this.T;if(this.fx||!FX||!this.hq)return;try{const R=this.R,pr=R.getPixelRatio(),w=Math.max(2,this.cv.clientWidth||2),h=Math.max(2,this.cv.clientHeight||2);
      const rt=new THREE.WebGLRenderTarget(w*pr,h*pr,{type:THREE.HalfFloatType,samples:R.capabilities.isWebGL2?4:0}); // khử răng cưa (MSAA) cho cả khung hậu kỳ
      const comp=new FX.EffectComposer(R,rt);comp.setPixelRatio(pr);comp.setSize(w,h);comp.addPass(new FX.RenderPass(this.S,this.cam));
      /* ngưỡng 1.25: chỉ màn hình, LED, bóng đèn mới tỏa sáng; sàn đá trắng, ghế mạ crôm không bị chói */const bloom=new FX.UnrealBloomPass(new THREE.Vector2(w,h),0.4,0.38,1.25);comp.addPass(bloom);comp.addPass(new FX.OutputPass());this.fx={comp,bloom}}catch(e){console.warn('Office3D bloom',e);this.fx=null}},
  draw3d(){if(this.fx&&this.hq)this.fx.comp.render();else this.R.render(this.S,this.cam)},
  setHQ(on){this.hq=on;this.setPref('o3hq',on);if(on)this.fxInit();else if(this.fx){try{this.fx.comp.renderTarget1.dispose();this.fx.comp.renderTarget2.dispose()}catch(e){}this.fx=null}
    const sm=on?(this.mob?2048:4096):(this.mob?1024:2048),sh=this.sun.shadow;if(sh.mapSize.x!==sm){sh.mapSize.set(sm,sm);if(sh.map){sh.map.dispose();sh.map=null}}
    this.R.setPixelRatio(Math.min(devicePixelRatio||1,this.mob?1.5:on?2:1.5));const w=this.cv.clientWidth,h=this.cv.clientHeight;if(w&&h){this.R.setSize(w,h,false);if(this.fx)this.fx.comp.setSize(w,h)}this.mood(true)},
  extras(){
    const{THREE,FX}=this.T,S=this.S;
    // (1) vệt sáng màn hình hắt lên mặt bàn, ghế và sàn: tấm cộng sáng mờ, gần như không tốn GPU, đêm sáng rõ hơn
    const glowT=this.canvas(128,128,(g,w,h)=>{g.clearRect(0,0,w,h);const r=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.45,'rgba(255,255,255,.4)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,w,h)}).t;
    this.glowMats=[];const gm=(c,op)=>{const m=new THREE.MeshBasicMaterial({map:glowT,color:c,transparent:true,opacity:op,blending:THREE.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,toneMapped:false,fog:false});m.userData.op=op;this.glowMats.push(m);return m};
    const deskGlow=gm('#5fb8ff',0.16),floorGlow=gm('#4aa3ff',0.07),wallGlow=gm('#7cc4ff',0.09),execGlow=gm('#ffcf8a',0.06);
    const decal=(w,h,m,x,y,z,par,ry=0)=>{const d=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);d.rotation.x=-Math.PI/2;d.rotation.z=ry;d.position.set(x,y,z);d.renderOrder=2;(par||S).add(d);return d};
    for(const g of Object.values(this.deskG||{})){decal(1.9,0.85,deskGlow,0,0.772,0.74,g);decal(2.4,2.0,floorGlow,0,0.012,0.2,g)}
    decal(10,4.2,wallGlow,0,0.014,-8.9);decal(8,3.6,wallGlow,11.4,0.014,-9.0);
    // (2) video wall + màn điều hành chiếu sáng sàn thật (RectAreaLight, chỉ ở đồ họa cao)
    this.areas=[];if(FX&&FX.RectAreaLightUniformsLib){try{FX.RectAreaLightUniformsLib.init();for(const[x,y,w,h,c]of[[0,2.15,9.2,2.6,'#86c5ff'],[11.4,2.05,7.4,2.86,'#9fd0ff']]){const a=new THREE.RectAreaLight(c,0,w,h);a.position.set(x,y,-10.78);a.lookAt(x,y-0.6,0);S.add(a);this.areas.push(a)}}catch(e){this.areas=[]}}
    // (3) đèn bàn kim loại ở Phòng Điều hành và Lab: chao đèn phát sáng + đèn ấm thật (chỉ đồ họa cao)
    this.deskLamps=[];this.lampHeads=[];for(const id of['risk','acc','lab']){const g=this.deskG&&this.deskG[id];if(g)this.deskLamp(g,0.8,0.78,id!=='lab')}
    // (4) vòng sáng + đèn rọi dưới nhân viên đang xem hồ sơ
    this.ring=new THREE.Mesh(new THREE.RingGeometry(0.42,0.52,56),new THREE.MeshBasicMaterial({color:'#38d6b4',transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
    this.ring.rotation.x=-Math.PI/2;this.ring.position.y=0.02;this.ring.visible=false;this.ring.renderOrder=3;S.add(this.ring);
    if(!this.mob){const sp=this.selSpot=new THREE.SpotLight('#e0fffa',0,7,0.42,0.65,1.6);sp.position.set(0,5,0);S.add(sp);S.add(sp.target)}
    // (5) thẻ tên đeo cổ cho nhân viên văn phòng (màu theo khu làm việc)
    for(const p of Object.values(this.people)){if(p.npc||!p.bones.Spine2)continue;const Z=this.ZONES.find(z=>z.k===p.seat.zone)||this.ZONES[0];
      this.att(p.bones.Spine2,g=>{const strap=this.mat(Z.c,{r:0.6}),seg=(a,b)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),L=A.distanceTo(B),m=new THREE.Mesh(new THREE.CylinderGeometry(0.0045,0.0045,L,5),strap);m.position.copy(A).add(B).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());g.add(m)};
        seg([-0.075,0.16,0.1],[-0.012,-0.02,0.158]);seg([0.075,0.16,0.1],[0.012,-0.02,0.158]);
        const card=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.07,0.004),this.mat('#f8fafc',{r:0.35}));card.position.set(0,-0.06,0.162);g.add(card);
        const band=new THREE.Mesh(new THREE.BoxGeometry(0.05,0.018,0.0045),this.mat(Z.c,{r:0.4,e:Z.c,ei:0.25}));band.position.set(0,-0.033,0.1625);g.add(band)})}},
  deskLamp(g,x,z,warm){const{THREE}=this.T,met=this.mat('#1f2937',{m:0.85,r:0.3});this.cyl(0.07,0.08,0.02,met,x,0.775,z,{},g);
    const a1=this.cyl(0.008,0.008,0.36,met,x,0.95,z-0.05,{rx:-0.3},g),hx=x-0.0,hy=1.12,hz=z-0.16;this.cyl(0.008,0.008,0.24,met,x,hy+0.02,z-0.13,{rx:1.2},g);
    const head=this.mesh(new THREE.ConeGeometry(0.07,0.09,20,1,true),met,hx,hy,hz-0.05,{rx:0.5,ds:true},g);
    const bulb=this.mat(warm?'#fff3d6':'#e6f4ff',{e:warm?'#ffcf8a':'#a5d8ff',ei:2.2,noCache:true});this.sph(0.028,bulb,hx,hy-0.035,hz-0.07,{seg:12},g);this.lampHeads.push(bulb);
    if(!this.mob){const l=new THREE.PointLight(warm?'#ffcf8a':'#cfe8ff',0,3.2,2);l.position.set(hx,hy-0.08,hz-0.1);g.add(l);this.deskLamps.push(l)}},
  selStep(dt,t){const r=this.ring,p=this.sel&&this.people[this.sel];if(!r||!r.visible||!p){if(this.selSpot&&this.selSpot.intensity)this.selSpot.intensity=0;return}
    const P=p.wrap.position;r.position.x=P.x;r.position.z=P.z;this.ringT=(this.ringT||0)+dt;const k=1+Math.sin(t*3)*0.06,intro=Math.min(1,this.ringT*3);r.scale.setScalar(k*(0.6+0.4*intro));r.material.opacity=0.55+0.3*Math.sin(t*3);
    if(this.selSpot){this.selSpot.position.set(P.x+0.6,4.6,P.z+0.8);this.selSpot.target.position.set(P.x,0.9,P.z);this.selSpot.intensity=this.hq?7*intro:0}},
  // Nút khu vực sáng theo nơi camera đang nhìn (kể cả khi bạn tự xoay / kéo)
  zoneHere(){const T=this.ctl.target,Z=this.ZONES.find(z=>T.x>=z.x[0]&&T.x<=z.x[1]&&T.z>=z.z[0]&&T.z<=z.z[1]),k=Z?Z.k:'';if(k===this.hereK)return;this.hereK=k;
    this.el.querySelectorAll('#o3cam button').forEach(b=>b.classList.toggle('here',b.dataset.cam===k))},

  // ================= Điều khiển camera bằng bàn phím: WASD / mũi tên, Shift đi nhanh, Q/E hạ/nâng =================
  // Di chuyển cả camera lẫn điểm nhìn (target) cùng một đoạn: vẫn xoay bằng chuột bình thường trong lúc đi.
  // Vận tốc tiến dần tới vận tốc mong muốn (quán tính nhẹ khi bắt đầu / dừng), tính theo thời gian thực dt nên 30 hay 144 FPS đi nhanh như nhau.
  KEYMAP:{KeyW:'f',ArrowUp:'f',KeyS:'b',ArrowDown:'b',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r',KeyQ:'dn',KeyE:'up'},
  KSPD:{walk:4.2,sprint:2.3,lift:2.6,damp:9},     // m/giây, hệ số Shift, tốc độ nâng/hạ, độ "bám" (càng lớn càng ít trôi)
  BOUND:{x:[-15.4,15.6],z:[-10.6,10.7],roof:4.0,ty:[0.25,3.2],cy:[0.9,38],far:40}, // trong phòng (dưới trần) không xuyên tường; trên cao (toàn cảnh) được ra ngoài
  keysInit(){if(this.kb)return;this.kb={down:{},vel:null};const K=this.kb;
    // bỏ qua khi đang gõ chữ (ô nhập, chọn, vùng soạn thảo), khi giữ Ctrl/Alt/⌘, hoặc khi không ở trang Văn phòng 3D
    this.keyOk=e=>{const t=e.target,ed=t&&(t.isContentEditable||(t.closest&&t.closest('input,select,textarea,[contenteditable=""],[contenteditable="true"]')));
      return!ed&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&this.running&&this.el&&this.el.isConnected&&this.el.offsetWidth>0&&!document.querySelector('.modal.on')};
    addEventListener('keydown',e=>{const a=this.KEYMAP[e.code];
      if(e.code==='Escape'&&this.keyOk(e)&&this.sel){this.unselect();return}
      if(!a||!this.keyOk(e))return;e.preventDefault(); // không cuộn trang bằng mũi tên khi đang ở văn phòng
      if(!K.down[a]){K.down[a]=1;this.userMove();if(this.follow)this.follow=null}K.shift=e.shiftKey});
    addEventListener('keyup',e=>{const a=this.KEYMAP[e.code];if(a)delete K.down[a];K.shift=e.shiftKey});
    const clear=()=>{K.down={};K.shift=false}; // rời cửa sổ khi đang giữ phím: không để camera tự trôi mãi
    addEventListener('blur',clear);document.addEventListener('visibilitychange',clear)},
  keyStep(dt){const K=this.kb;if(!K||!dt)return;const{THREE}=this.T,D=K.down,S=this.KSPD;
    if(!K.vel)K.vel=new THREE.Vector3();
    const cam=this.cam.position,tg=this.ctl.target,f=new THREE.Vector3(tg.x-cam.x,0,tg.z-cam.z);if(f.lengthSq()<1e-6)this.cam.getWorldDirection(f).setY(0);f.normalize();
    const r=new THREE.Vector3(-f.z,0,f.x),want=new THREE.Vector3(),mv=(D.f?1:0)-(D.b?1:0),st=(D.r?1:0)-(D.l?1:0),up=(D.up?1:0)-(D.dn?1:0);
    // càng ở xa (toàn cảnh) đi càng nhanh để không phải giữ phím quá lâu
    const dist=cam.distanceTo(tg),sp=S.walk*Math.max(1,Math.min(3,dist/8))*(K.shift?S.sprint:1);
    want.addScaledVector(f,mv).addScaledVector(r,st);if(want.lengthSq()>1)want.normalize();want.multiplyScalar(sp);want.y=up*S.lift*(K.shift?1.6:1);
    K.vel.lerp(want,1-Math.exp(-S.damp*dt));if(K.vel.lengthSq()<1e-5){K.vel.set(0,0,0);return}
    const d=K.vel.clone().multiplyScalar(dt),B=this.BOUND,inX=v=>v>=B.x[0]&&v<=B.x[1],inZ=v=>v>=B.z[0]&&v<=B.z[1];
    // giới hạn: điểm nhìn luôn trong văn phòng; camera dưới trần thì không ra khỏi tường bao, trên cao thì trong vùng rộng
    const low=cam.y+d.y<B.roof,cx=cam.x+d.x,cz=cam.z+d.z,tx=tg.x+d.x,tz=tg.z+d.z;
    if(!inX(tx)||(low&&!inX(cx))||Math.abs(cx)>B.far){d.x=0;K.vel.x=0}
    if(!inZ(tz)||(low&&!inZ(cz))||Math.abs(cz)>B.far){d.z=0;K.vel.z=0}
    if(tg.y+d.y<B.ty[0]||tg.y+d.y>B.ty[1]||cam.y+d.y<B.cy[0]||cam.y+d.y>B.cy[1]){d.y=0;K.vel.y=0}
    if(cam.y+d.y<3.05&&(d.x||d.z)){const b=(dx,dz)=>this.hitWall(cam,{x:cam.x+dx,z:cam.z+dz},cam.y+d.y);
      if(b(d.x,d.z)){if(!b(d.x,0)){d.z=0;K.vel.z*=0.3}else if(!b(0,d.z)){d.x=0;K.vel.x*=0.3}else{d.x=d.z=0;K.vel.x=K.vel.z=0}}} // chạm tường: trượt dọc theo tường
    cam.add(d);tg.add(d)},
  // Đồng bộ dữ liệu thật mỗi 2 giây: trạng thái, lời nói, bầu trời, đồng hồ, thư mới
  sync(){
    for(const m of(typeof Office!=='undefined'?Office.TEAM:[])){let r;try{r=Office.read(m.id)}catch(e){r={st:'idle',say:''}}const p=this.people[m.id];m.last=r;if(!p)continue;
      if(p.st!==r.st){const was=p.st;p.st=r.st;p.timer=Math.min(p.timer,1.5);if(r.st!=='idle')this.pop(p,r.say);if(was==='idle'&&r.st!=='idle'&&p.spot&&!p.spot.work){p.timer=0;p.spot=null;p.brk=0;if(p.mode!=='walk')this.go(p,p.seat,'seat')}}p.text=r.say}
    for(const p of Object.values(this.people))if(p.npc)p.text=p.m.job;
    this.clocks.redraw();this.renderKpi();
    this.mood();
    try{const L=Book.data.log[0],k=L?L.t+L.text:'';if(this.lastLog!==undefined&&k&&k!==this.lastLog){const who=Office.WHO[L.kind]||'acc';if(who!=='post'&&this.people.post)this.people.post.deliver=who}this.lastLog=k}catch(e){}},
  labels(){
    const{THREE}=this.T,v=new THREE.Vector3(),w=this.cv.clientWidth,h=this.cv.clientHeight;
    for(const p of Object.values(this.people)){
      if(p.bones.Head){p.bones.Head.getWorldPosition(v);v.y+=0.32}else{v.set(0,2,0);p.wrap.localToWorld(v)}v.project(this.cam);
      const vis=v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1,T=p.tag;if(!vis){if(T.style.display!=='none')T.style.display='none';continue}
      T.style.display='';T.style.transform=`translate(${(v.x+1)/2*w}px,${(1-v.y)/2*h}px) translate(-50%,-100%)`;
      const far=this.cam.position.distanceTo(p.wrap.position)>(this.mob?17:28),show=(p.sayT>0&&!far)||this.hover===p.m.id||this.sel===p.m.id,txt=p.sayT>0?p.say:(p.text||''); // ở xa thì chỉ hiện tên cho đỡ rối
      const b=T.firstChild;if(b._t!==txt){b.textContent=txt;b._t=txt}T.classList.toggle('say',show&&!!txt);T.dataset.st=p.npc?'ok':p.st;T.classList.toggle('sel',this.sel===p.m.id)}}
};
