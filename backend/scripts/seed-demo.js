// Additive, repeatable local demonstration data. Never deletes existing business data.
import { db } from '../src/db.js'
import { scryptSync } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { mkdir, writeFile, access } from 'node:fs/promises'
const password = process.env.DEMO_PASSWORD
if (!password || password.length < 10) { await db.close(); throw new Error('Set DEMO_PASSWORD (at least 10 characters) before running.') }
const now = new Date().toISOString()
const root = new URL('../../storage/assets/', import.meta.url)
await mkdir(root, {recursive:true})
function crc(buf) { let c=0xffffffff; for(const b of buf) {c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)} return (c^0xffffffff)>>>0 }
function chunk(name,data) {const n=Buffer.from(name);const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);n.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([n,data])),data.length+8);return out}
// Original procedural product illustrations, no remote assets or image dependencies.
function poster(i) {
 const w=720,h=540, raw=Buffer.alloc((w*3+1)*h), palettes=[[223,237,227],[241,224,209],[218,228,248]];
 const base=palettes[Math.floor(i/6)];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
  let color=base.map(v=>Math.min(255,v+Math.round((1-y/h)*12)));
  if(((x-365)/190)**2+((y-440)/26)**2<1)color=base.map(v=>v-23);
  const shift=(i%3-1)*35;
  if(x>265+shift&&x<455+shift&&y>170&&y<430)color=[248,247,239];
  if(x>310+shift&&x<410+shift&&y>125&&y<=170)color=[57,79,73];
  if(x>290+shift&&x<430+shift&&y>265&&y<345)color=base.map(v=>v-48);
  if(x>310+shift&&x<410+shift&&y>290&&y<298)color=[247,246,236];
  if(x>325+shift&&x<395+shift&&y>310&&y<315)color=[247,246,236];
  if(x>45&&x<155+(i%6)*15&&y>52&&y<59)color=[69,86,80];
  const p=y*(w*3+1)+1+x*3;raw.set(color,p);
 }
 const hdr=Buffer.alloc(13);hdr.writeUInt32BE(w);hdr.writeUInt32BE(h,4);hdr[8]=8;hdr[9]=2;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',hdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
async function insert(table,row) {
 if(await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(row.id))return;
 const cols=Object.keys(row);await db.prepare(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(()=>'?').join(',')})`).run(...Object.values(row));
}
try {
 await db.transaction(async()=>{
  for(const [suffix,role,name] of [['admin','admin','演示管理员'],['designer','designer','演示设计师'],['viewer','viewer','演示访客']]) {
   const username='demo_'+suffix,id='demo-v1-user-'+suffix;
   const existing=await db.prepare('SELECT id FROM users WHERE username = ?').get(username);
   if(existing&&existing.id!==id)throw new Error('Demo username is already used; no changes committed.');
   await insert('users',{id,openid:'local:'+id,username,nickname:name,role,password_hash:scryptSync(password,username,64).toString('hex'),created_at:now,updated_at:now});
  }
  const names=['演示 · 青禾生活','演示 · 暖橙美妆','演示 · 蓝屿数码'];
  for(let s=0;s<3;s++) {
   const store='demo-v1-store-'+s;
   await insert('stores',{id:store,name:names[s],country:['菲律宾','泰国','美国'][s],category:['家居生活','美妆个护','数码配件'][s],created_at:now,updated_at:now});
   const brief=Buffer.from('【虚构演示资料】\n项目：'+names[s]+'\n需求：制作新品主图、详情配图、推广封面。\n规格：720 x 540，PNG 格式。\n验收：标题清晰、配色统一、文件命名规范。\n');
   const briefName='demo-v1-brief-'+s+'.txt',briefFile=new URL(briefName,root);
   try{await access(briefFile)}catch{await writeFile(briefFile,brief,{flag:'wx'})}
   await insert('task_files',{id:'de100000-0000-4000-8000-'+String(s).padStart(12,'0'),store_id:store,name:'演示商品设计需求.txt',mime_type:'text/plain',size:brief.length,file_path:'/storage/assets/'+briefName,created_at:now,uploader_id:'demo-v1-user-admin',purpose:'reference'});
   for(let n=0;n<6;n++) {
    const i=s*6+n,id='de000000-0000-4000-8000-'+String(i).padStart(12,'0'),filename='demo-v1-asset-'+i+'.png',file=new URL(filename,root),png=poster(i);
    try{await access(file)}catch{await writeFile(file,png,{flag:'wx'})}
    await insert('assets',{id,store_id:store,name:['春季新品主图','产品细节展示','品牌活动海报','社交平台封面','商品详情配图','备用设计稿'][n]+'.png',type:'image',size:png.length,file_path:'/storage/assets/'+filename,created_at:now,deleted_at:n===5?now:null,uploader_id:'demo-v1-user-designer',relative_path:'演示素材/'+filename});
   }
  }
  const statuses=['available','in_progress','submitted','revision','completed','cancelled'];
  for(let i=0;i<6;i++) {
   const status=statuses[i];
   await insert('design_tasks',{id:'demo-v1-task-'+i,store_id:'demo-v1-store-'+i%3,title:['春季新品主图设计','品牌详情页升级','社交媒体推广封面','促销海报修改','产品卖点图交付','旧活动物料归档'][i],description:'【虚构演示任务】制作 3 张商品展示图，突出产品轮廓与品牌配色；交付 PNG 格式。可用于练习领取、进度更新、提交与审核。',priority:i===1?'urgent':'normal',status,progress:[0,45,100,90,100,0][i],creator_id:'demo-v1-user-admin',assignee_id:i===0||i===5?null:'demo-v1-user-designer',deadline:new Date(Date.now()+7*86400000).toISOString(),created_at:now,updated_at:now,completed_at:i===4?now:null,product_code:'DEMO-00'+(i+1),product_name:'演示商品 '+(i+1),sku_text:'标准款 / 展示款',review_note:i===3?'请增大标题字号，并补充产品细节。':null,submitted_at:[2,3,4].includes(i)?now:null,reviewed_at:[3,4].includes(i)?now:null});
  }
 });
 console.log('Demo ready: 3 accounts, 3 stores, 18 images (3 in trash), 6 tasks. Existing records preserved.');
 console.log('Accounts: demo_admin / demo_designer / demo_viewer. Existing demo passwords are not reset on rerun.');
} finally {await db.close()}
