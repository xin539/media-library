<script setup>
import { ref } from 'vue'
import { loginUser, registerUser } from '../api/storeApi.js'
import { useLibraryStore } from '../stores/library'
import { useLocale } from '../i18n.js'
const props = defineProps({ initialError: { type: String, default: '' } })
const emit = defineEmits(['login-success'])
const library = useLibraryStore()
const { language, t, l, setLanguage } = useLocale()
const loginError = ref(props.initialError)
const nickname = ref('')
const avatarUrl = ref('')
const registering = ref(false)
const mode = ref('login')
const username = ref('')
const password = ref('')
const showPassword = ref(false)
function chooseAvatar(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { loginError.value = t.value.chooseAvatarError; return }
  if (file.size > 1.5 * 1024 * 1024) { loginError.value = t.value.avatarSizeError; return }
  const reader = new FileReader()
  reader.onload = () => { avatarUrl.value = reader.result }
  reader.readAsDataURL(file)
}

async function register() {
  if (!username.value.trim() || !password.value) { loginError.value = l('请输入账号和密码。', 'Enter your account and password.', 'กรอกชื่อบัญชีและรหัสผ่าน'); return }
  if (!nickname.value.trim()) { loginError.value = l('请输入名字。', 'Enter your name.', 'กรอกชื่อ'); return }
  registering.value = true
  loginError.value = ''
  try {
    const data = (await registerUser({ username: username.value, password: password.value, nickname: nickname.value, avatarUrl: avatarUrl.value || null })).data
    library.currentUser = data
    await library.load()
    emit('login-success', data)
  } catch (error) {
    loginError.value = error.message
  } finally {
    registering.value = false
  }
}

async function login() {
  if (!username.value.trim() || !password.value) { loginError.value = l('请输入账号和密码。', 'Enter your account and password.', 'กรอกชื่อบัญชีและรหัสผ่าน'); return }
  registering.value = true
  loginError.value = ''
  try {
    const data = (await loginUser({ username: username.value, password: password.value })).data
    library.currentUser = data
    await library.load()
    emit('login-success', data)
  } catch (error) {
    loginError.value = error.message
  } finally {
    registering.value = false
  }
}


</script>
<template>
  <div class="login-page">
    <section class="brand-copy">
      <span class="eyebrow">SHARED WORKSPACE</span>
      <h1>{{ l('高效管理 · 共享灵感','Manage efficiently. Share inspiration.','จัดการอย่างมีประสิทธิภาพ แชร์แรงบันดาลใจ') }}</h1>
      <p>{{ l('让素材、创意与团队更近一步','Bring assets, ideas and teams closer.','เชื่อมสื่อ ไอเดีย และทีมให้ใกล้กัน') }}</p>
      <ul class="features">
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10h-1M12 12v9m-3-6 3-3 3 3"/></svg><div><b>{{ l('云端存储','Cloud storage','พื้นที่เก็บข้อมูลบนคลาวด์') }}</b><small>{{ l('安全管理，随时访问','Manage securely, access anytime','จัดการอย่างปลอดภัย เข้าถึงได้ทุกเวลา') }}</small></div></li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/></svg><div><b>{{ l('团队协作','Team collaboration','ทำงานร่วมกัน') }}</b><small>{{ l('高效沟通，共同创作','Communicate clearly, create together','สื่อสารอย่างมีประสิทธิภาพ สร้างสรรค์ร่วมกัน') }}</small></div></li>
        <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/></svg><div><b>{{ l('数据安全','Data security','ความปลอดภัยของข้อมูล') }}</b><small>{{ l('多重保障，放心使用','Multiple safeguards for peace of mind','หลายชั้นการป้องกัน ใช้งานอย่างมั่นใจ') }}</small></div></li>
      </ul>
    </section>
    <section class="signin-card">
      <header class="card-top"><span>{{ l('共享工作空间','Shared workspace','พื้นที่ทำงานร่วมกัน') }}</span><select v-model="language" :aria-label="t.language" @change="setLanguage(language)"><option value="zh">中文</option><option value="en">English</option><option value="th">ไทย</option></select></header>
      <h2>{{ mode === 'login' ? l('欢迎回来','Welcome back','ยินดีต้อนรับกลับ') : l('创建协作账号','Create an account','สร้างบัญชี') }}</h2>
      <p class="intro">{{ mode === 'login' ? t.loginHint : t.registerHint }}</p>
      <p class="admin-note">{{ l('账号由管理员创建，请联系管理员开通。','Contact your administrator to create an account.','กรุณาติดต่อผู้ดูแลเพื่อสร้างบัญชี') }}</p>
      <form @submit.prevent="mode === 'login' ? login() : register()">
        <label v-if="mode === 'register'" class="avatar-field"><img v-if="avatarUrl" :src="avatarUrl" :alt="l('头像预览','Avatar preview','ตัวอย่างรูปโปรไฟล์')"><span>{{ l('上传头像','Upload avatar','อัปโหลดรูปโปรไฟล์') }}</span><input type="file" accept="image/*" :disabled="registering" @change="chooseAvatar"></label>
        <label class="field"><span>{{ t.account }}</span><div class="input-wrap"><input v-model="username" maxlength="30" :placeholder="t.account" autocomplete="username" :disabled="registering" required></div></label>
        <label class="field"><span>{{ t.password }}</span><div class="input-wrap"><input v-model="password" :type="showPassword ? 'text' : 'password'" :minlength="mode === 'register' ? 6 : undefined" :placeholder="t.password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" :disabled="registering" required><button type="button" :aria-pressed="showPassword" @click="showPassword = !showPassword">{{ showPassword ? l('隐藏','Hide','ซ่อน') : l('显示','Show','แสดง') }}</button></div></label>
        <label v-if="mode === 'register'" class="field"><span>{{ t.name }}</span><div class="input-wrap"><input v-model="nickname" maxlength="30" :placeholder="t.name" autocomplete="name" :disabled="registering" required></div></label>
        <p v-if="loginError" class="error-message" role="alert">{{ loginError }}</p>
        <button type="submit" class="signin-submit" :disabled="registering"><span>{{ registering ? l('处理中…','Processing…','กำลังดำเนินการ…') : mode === 'login' ? t.login : t.register }}</span><span aria-hidden="true">→</span></button>
      </form>
      <footer class="signin-footer"><i aria-hidden="true"></i>{{ l('团队共享空间 · 集中管理素材','Shared workspace · Centralized assets','พื้นที่ทำงานร่วมกัน · จัดการสื่อจากส่วนกลาง') }}</footer>
    </section>
  </div>
</template>
<style scoped>
.login-page { box-sizing:border-box; width:100vw; min-height:100vh; min-height:100dvh; position:relative; overflow:hidden; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:center; gap:5%; padding:48px 14% 48px 8%; background-image:url('../assets/login-bg.jpg'); background-size:cover; background-position:center; background-repeat:no-repeat; color:#213c58; }
.login-page * { box-sizing:border-box; }
.eyebrow { font-size:12px; font-weight:700; letter-spacing:3px; color:#3b719a; }
.brand-copy h1 { font-size:clamp(28px,2.6vw,44px); line-height:1.4; margin:20px 0 12px; }
.brand-copy>p { font-size:16px; color:#58738b; line-height:1.8; }
.features { display:grid; gap:26px; list-style:none; padding:0; margin:42px 0 0; }
.features li { display:flex; gap:16px; align-items:center; }
.features svg { width:26px; height:26px; flex-shrink:0; fill:none; stroke:#317caf; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
.features b,.features small { display:block; }
.features b { font-size:15px; margin-bottom:5px; }
.features small { font-size:13px; color:#60798c; line-height:1.6; }
.signin-card { justify-self:end; width:clamp(400px,30vw,480px); max-width:100%; padding:42px 40px; border:1px solid rgba(255,255,255,.65); border-radius:22px; background:rgba(255,255,255,.88); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px); box-shadow:0 24px 70px rgba(30,60,100,.12); }
.card-top { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:12px; color:#62778b; }
.card-top select { min-width:80px; max-width:120px; padding:7px; background:transparent; border:1px solid #dbe3ee; border-radius:8px; color:#3f5e78; font:inherit; }
.signin-card h2 { margin:30px 0 8px; color:#20354a; font-size:30px; line-height:1.3; }
.intro { margin:0; color:#718396; font-size:14px; line-height:1.7; }
.admin-note { margin:20px 0 24px; color:#7a8b9c; font-size:12px; line-height:1.7; }
.field { display:block; margin-bottom:20px; }
.field>span { display:block; margin-bottom:9px; color:#43576b; font-size:13px; font-weight:600; }
.input-wrap { display:flex; height:54px; overflow:hidden; border:1px solid #dbe3ee; border-radius:11px; background:rgba(255,255,255,.72); transition:border-color .2s ease,box-shadow .2s ease,background .2s ease; }
.input-wrap:focus-within { border-color:#2f7fd4; box-shadow:0 0 0 3px rgba(47,127,212,.1); background:#fff; }
.input-wrap input { min-width:0; flex:1; width:100%; padding:0 14px; border:0; outline:none; background:transparent; font:inherit; font-size:14px; color:#253d52; }
.input-wrap input::placeholder { color:#9aa8b5; }
.input-wrap button { flex-shrink:0; border:0; padding:0 12px; background:transparent; color:#2f7fd4; font:inherit; font-size:12px; }
.signin-submit { display:flex; width:100%; height:54px; align-items:center; justify-content:space-between; padding:0 20px; border:0; border-radius:10px; background:linear-gradient(100deg,#1976bd,#277fd1); color:white; font:inherit; font-size:15px; font-weight:600; transition:transform .15s ease,box-shadow .15s ease; }
.signin-submit:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 20px #1976bd26; }
.signin-submit:disabled { opacity:.55; cursor:not-allowed; }
.signin-footer { display:flex; justify-content:center; align-items:center; gap:8px; margin-top:26px; color:#8797a6; font-size:11px; line-height:1.6; }
.signin-footer i { width:7px; height:7px; flex-shrink:0; border-radius:50%; background:#37b785; box-shadow:0 0 0 3px #37b78516; }
.error-message { color:#bc3545; font-size:13px; line-height:1.6; overflow-wrap:anywhere; }
.avatar-field { display:grid; gap:8px; margin-bottom:16px; font-size:13px; }
.avatar-field img { width:56px; height:56px; object-fit:cover; border-radius:50%; }
.avatar-field input { max-width:100%; }
button:focus-visible,select:focus-visible { outline:2px solid #2f7fd4; outline-offset:3px; }
@media(min-width:768px) and (max-width:1023px) { .login-page { padding:32px 5%; grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr); gap:24px; } .signin-card { width:100%; padding:32px 26px; } .brand-copy h1 { font-size:28px; } .features { gap:20px; } }
@media(max-width:767px) { .login-page { display:flex; justify-content:center; padding:24px 0; background-position:35% center; } .brand-copy { display:none; } .signin-card { width:calc(100% - 32px); max-width:440px; padding:30px 22px; } }
@media(prefers-reduced-motion:reduce) { .input-wrap,.signin-submit { transition:none; } }
</style>
