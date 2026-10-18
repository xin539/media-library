<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useLocale } from '../i18n.js'
const props = defineProps({ confirm: { type: Function, required: true }, finish: { type: Function, required: true } })
const { l } = useLocale()
const password = ref('')
const busy = ref(false)
const error = ref('')
const dialog = ref(null)
const input = ref(null)
const previousFocus = document.activeElement
function cancel() { if (!busy.value) { password.value = ''; props.finish(false) } }
async function submit() {
  if (busy.value || !password.value) return
  busy.value = true
  error.value = ''
  try { await props.confirm(password.value); props.finish(true) }
  catch (e) { error.value = e.message || l('删除失败，请重试。', 'Deletion failed. Try again.', 'ลบไม่สำเร็จ โปรดลองอีกครั้ง') }
  finally { password.value = ''; busy.value = false; input.value?.focus() }
}
function keyboard(event) {
  if (event.key === 'Escape') { event.preventDefault(); cancel() }
  if (event.key !== 'Tab') return
  const items = [...dialog.value.querySelectorAll('input:not(:disabled),button:not(:disabled)')]
  if (!items.length) { event.preventDefault(); return }
  if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus() }
  else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus() }
}
onMounted(() => input.value?.focus())
onBeforeUnmount(() => { password.value = ''; previousFocus?.focus?.() })
</script>
<template>
  <div class="delete-confirm-mask" @click.self="cancel" @keydown="keyboard">
    <form ref="dialog" class="delete-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title" @submit.prevent="submit">
      <h2 id="delete-confirm-title">{{ l('永久删除', 'Delete permanently', 'ลบถาวร') }}</h2>
      <p>{{ l('永久删除后无法恢复。请输入当前账号密码确认。', 'This cannot be undone. Enter your current account password to confirm.', 'การลบนี้ไม่สามารถกู้คืนได้ กรอกรหัสผ่านบัญชีปัจจุบันเพื่อยืนยัน') }}</p>
      <label for="delete-confirm-password">{{ l('当前账号密码', 'Current account password', 'รหัสผ่านบัญชีปัจจุบัน') }}</label>
      <input id="delete-confirm-password" ref="input" v-model="password" type="password" autocomplete="off" required :disabled="busy" maxlength="4096" />
      <p v-if="error" class="delete-confirm-error" role="alert">{{ error }}</p>
      <footer>
        <button type="button" :disabled="busy" @click="cancel">{{ l('取消', 'Cancel', 'ยกเลิก') }}</button>
        <button class="delete-confirm-danger" :disabled="busy || !password">{{ busy ? l('验证并删除中…', 'Verifying and deleting…', 'กำลังตรวจสอบและลบ…') : l('永久删除', 'Delete permanently', 'ลบถาวร') }}</button>
      </footer>
    </form>
  </div>
</template>
<style scoped>
.delete-confirm-mask { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; padding:20px; background:#0f172a66; }
.delete-confirm-dialog { box-sizing:border-box; width:min(440px,100%); padding:24px; border:1px solid #e8edf3; border-radius:12px; background:#fff; color:#172033; box-shadow:0 12px 40px #0f172a1f; }
h2 { margin:0 0 12px; font-size:20px; } p { color:#64748b; font-size:14px; line-height:1.6; } label { display:block; margin:20px 0 8px; font-size:14px; }
input { box-sizing:border-box; width:100%; height:44px; padding:0 12px; border:1px solid #dfe5ec; border-radius:8px; font:inherit; }
input:focus { outline:2px solid #1677ef; outline-offset:2px; }
footer { display:flex; justify-content:flex-end; gap:12px; margin-top:24px; }
button { min-height:42px; padding:8px 16px; border:1px solid #dfe5ec; border-radius:8px; background:#fff; color:#334155; font:inherit; cursor:pointer; }
.delete-confirm-danger { background:#dc2626; color:#fff; border-color:#dc2626; }
.delete-confirm-error { color:#dc2626; } button:disabled { opacity:.5; cursor:not-allowed; }
</style>
