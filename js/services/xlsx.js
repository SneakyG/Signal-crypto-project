/* Xuất Excel (.xlsx) không cần thư viện: tự tạo gói ZIP chứa các phần XML của bảng tính */
function crc32(u){let t=crc32.t;if(!t){t=crc32.t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}}let r=-1;for(const b of u)r=t[(r^b)&255]^(r>>>8);return(r^-1)>>>0}
function sheet(rows){
  const cell=(v,i,j,b)=>{const a=`r="${String.fromCharCode(65+j)}${i+1}"`,st=b?' s="1"':'';return typeof v==='number'&&isFinite(v)?`<c ${a}${st}><v>${v}</v></c>`:v===''||v==null?'':`<c ${a}${st} t="inlineStr"><is><t>${esc(v)}</t></is></c>`};
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="16" width="20" customWidth="1"/></cols><sheetData>${rows.map((r,i)=>`<row r="${i+1}">${r.map((v,j)=>cell(v,i,j,r.b)).join('')}</row>`).join('')}</sheetData></worksheet>`}
function xlsx(rows){
  const X='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',R='http://schemas.openxmlformats.org/officeDocument/2006/relationships',M='http://schemas.openxmlformats.org/spreadsheetml/2006/main',CT='application/vnd.openxmlformats-officedocument.spreadsheetml.';
  const files=[
    ['[Content_Types].xml',X+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}styles+xml"/></Types>`],
    ['_rels/.rels',X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml',X+`<workbook xmlns="${M}" xmlns:r="${R}"><sheets><sheet name="Sổ lệnh" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',X+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${R}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',X+`<styleSheet xmlns="${M}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml',sheet(rows)]];
  const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  const u16=n=>[n&255,n>>8&255],u32=n=>[n&255,n>>8&255,n>>16&255,n>>>24&255];
  for(const[n,s]of files){
    const nm=enc.encode(n),d=enc.encode(s),c=crc32(d),L=d.length;
    const h=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(L),...u32(L),...u16(nm.length),...u16(0)]);
    parts.push(h,nm,d);
    cd.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(c),...u32(L),...u32(L),...u16(nm.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nm);
    off+=h.length+nm.length+L}
  const sz=cd.reduce((a,x)=>a+x.length,0);
  return new Blob([...parts,...cd,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(sz),...u32(off),...u16(0)])],{type:CT+'sheet'})}

function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
