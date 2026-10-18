<script setup>
import { reactive, ref, watch, onBeforeUnmount } from 'vue'
import { useLocale } from '../i18n.js'
const { t, l } = useLocale()
// store 为空时是新建模式，有值时是编辑模式。
const props = defineProps({ open: Boolean, store: { type: Object, default: null }, defaultCountry: { type: String, default: '' }, submitting: Boolean, externalError: { type: String, default: '' } })
const emit = defineEmits(['close', 'save'])
const form = reactive({ name: '', avatar: '', country: '', category: '' })
const errors = reactive({ message: '' })
const isDragging = ref(false)
const avatarInput = ref(null)
let avatarReader = null
let dragDepth = 0
function resetAvatarRead() {
  if (avatarReader) { avatarReader.onload = null; avatarReader.abort(); avatarReader = null }
  dragDepth = 0
  isDragging.value = false
}
onBeforeUnmount(resetAvatarRead)

// 每次打开弹窗时重新填充表单，避免残留上一次的数据。
watch(() => [props.open, props.store], () => {
  resetAvatarRead()
  Object.assign(form, props.store || { name: '', avatar: '', country: props.defaultCountry, category: '' })
  errors.message = ''
}, { immediate: true })

function chooseAvatar(event) {
  const file = event.target.files?.[0]
  handleAvatarFile(file)
  event.target.value = ''
}

function handleAvatarFile(file) {
  if (!file || props.submitting) return
  resetAvatarRead()
  if (!file?.type.startsWith('image/')) {
    errors.message = t.value.chooseAvatarError
    return
  }
  if (file.size > 1.5 * 1024 * 1024) {
    errors.message = t.value.avatarSizeError
    return
  }
  // 头像转成 Data URL，方便跟随店铺资料保存。
  const reader = new FileReader()
  avatarReader = reader
  reader.onload = () => { form.avatar = String(reader.result); errors.message = '' }
  reader.onerror = () => { errors.message = l('图片读取失败，请重新选择。', 'Could not read this image. Please try again.', 'อ่านรูปไม่สำเร็จ โปรดเลือกใหม่') }
  reader.readAsDataURL(file)
}

function dragEnter() { if (!props.submitting) { dragDepth++; isDragging.value = true } }
function dragLeave() { dragDepth = Math.max(0, dragDepth - 1); isDragging.value = dragDepth > 0 }
function dropAvatar(event) {
  dragDepth = 0
  isDragging.value = false
  handleAvatarFile(event.dataTransfer.files?.[0])
}

function submit() {
  if (props.submitting) return
  // 店铺名称、国家和类别均为必填项。
  if (![form.name, form.country, form.category].every((value) => value.trim())) {
    errors.message = t.value.storeRequiredError; return
  }
  emit('save', { ...form })
}
</script>
<template>
  <div v-if="open" class="modal-mask store-dialog-mask" @click.self="$emit('close')">
    <section class="modal store-dialog" role="dialog" aria-modal="true" aria-labelledby="store-dialog-title">
      <header class="store-dialog-header">
        <div class="store-heading">
          <span class="store-heading-icon" aria-hidden="true"><svg viewBox="0 0 48 48"><path d="M10 21v19h28V21" fill="#1677ef"/><path d="m9 9-4 12a6 6 0 0 0 10 4 6 6 0 0 0 9 0 6 6 0 0 0 9 0 6 6 0 0 0 10-4L39 9Z" fill="#3694fb"/><path d="M20 40V29h8v11" fill="#fff"/></svg></span>
          <div><h2 id="store-dialog-title">{{ store ? t.editStore : t.createStore }}</h2><p>{{ store ? t.editStoreDescription : t.createStoreDescription }}</p></div>
        </div>
        <button type="button" class="dialog-close" :aria-label="t.close" @click="$emit('close')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </header>
      <div class="store-dialog-body">
        <div class="store-avatar-field">
          <b id="store-avatar-label">{{ t.storeAvatar }}</b>
          <input ref="avatarInput" class="store-avatar-input" type="file" accept="image/*" :disabled="submitting" @change="chooseAvatar">
          <button type="button" class="store-avatar-dropzone" :class="{ 'is-dragging': isDragging }" :disabled="submitting" aria-labelledby="store-avatar-label" @click="avatarInput?.click()" @dragenter.prevent="dragEnter" @dragover.prevent @dragleave.prevent="dragLeave" @drop.prevent="dropAvatar">
            <template v-if="form.avatar">
              <img class="store-avatar-image" :src="form.avatar" :alt="t.storeAvatar">
              <strong>{{ l('已选择图片', 'Image selected', 'เลือกรูปแล้ว') }} · <span>{{ l('重新选择', 'Replace image', 'เลือกรูปใหม่') }}</span></strong>
            </template>
            <template v-else>
              <svg class="store-upload-illustration" viewBox="0 0 240 84" aria-hidden="true">
                <rect x="17" y="24" width="40" height="34" rx="5" transform="rotate(-14 17 24)" fill="#dbeafe"/><path d="m25 49 9-12 8 6 6-6 11 12" fill="#b9d7fb"/>
                <rect x="184" y="19" width="40" height="34" rx="5" transform="rotate(12 184 19)" fill="#e3efff"/>
                <path d="m188 44 9-10 8 6 7-6 9 16" fill="#c5ddfa"/>
                <path d="M92 65a19 19 0 0 1-4-38 29 29 0 0 1 55-2 20 20 0 0 1 3 40Z" fill="#1677ef"/>
                <path d="M120 53V30m-10 10 10-10 10 10" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M166 13v10m-5-5h10M69 66v8m-4-4h8" stroke="#bfdbfe" stroke-width="3" stroke-linecap="round"/>
              </svg>
              <strong>{{ isDragging ? l('松开即可选择图片', 'Drop to select image', 'ปล่อยเพื่อเลือกรูป') : l('拖拽图片到此处，或', 'Drag an image here, or', 'ลากรูปมาที่นี่ หรือ') }} <span v-if="!isDragging">{{ l('点击上传', 'click to upload', 'คลิกเพื่ออัปโหลด') }}</span></strong>
            </template>
            <small>{{ l('支持图片格式（如 JPG / PNG / WebP），建议正方形，不超过 1.5 MB', 'Image formats including JPG / PNG / WebP · Square recommended · Up to 1.5 MB', 'รองรับไฟล์รูป เช่น JPG / PNG / WebP · แนะนำรูปสี่เหลี่ยมจัตุรัส · ไม่เกิน 1.5 MB') }}</small>
          </button>
        </div>
        <div class="store-form-grid">
          <label class="form-field full"><span>{{ t.storeName }} <em>*</em></span><input v-model="form.name" autocomplete="organization" :placeholder="t.storeNameExample"></label>
          <div class="form-field">
            <span id="store-country-label">{{ t.storeCountry }} <em>*</em></span>
            <div class="store-country-readonly" aria-labelledby="store-country-label">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>
              <span>{{ form.country || l('待识别', 'Not identified yet', 'รอระบุประเทศ') }}</span>
            </div>
            <small>{{ l('根据当前国家自动关联', 'Linked to the current country', 'เชื่อมโยงกับประเทศปัจจุบันโดยอัตโนมัติ') }}</small>
          </div>
          <label class="form-field"><span>{{ t.storeCategory }} <em>*</em></span><input v-model="form.category" :placeholder="t.categoryExample"></label>
        </div>
        <p v-if="errors.message || externalError" class="error store-dialog-error" role="alert">{{ errors.message || externalError }}</p>
      </div>
      <footer class="store-dialog-footer">
        <button type="button" class="primer-secondary-button" @click="$emit('close')">{{ t.cancel }}</button>
        <button type="button" class="primer-primary-button" :disabled="submitting" @click="submit">{{ store ? t.saveChanges : t.createStore }} <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></button>
      </footer>
    </section>
  </div>
</template>
<style scoped>
.store-dialog-mask { padding:24px; background:rgba(39,52,72,.32); backdrop-filter:blur(5px); -webkit-backdrop-filter:blur(5px); }
.store-dialog.store-dialog { display:flex; flex-direction:column; width:min(1080px,calc(100vw - 64px)); max-width:none; max-height:calc(100dvh - 48px); padding:0; overflow:hidden; background:#fff; border:1px solid #edf1f5; border-radius:22px; box-shadow:0 24px 80px #1e375a2e; }
.store-dialog.store-dialog .store-dialog-header { display:flex; flex:none; align-items:center; justify-content:space-between; gap:24px; min-height:145px; padding:32px 48px; border-bottom:1px solid #edf1f5; background:linear-gradient(100deg,#fff,#f7faff); }
.store-heading { display:flex; align-items:center; gap:24px; min-width:0; }
.store-heading-icon { display:grid; place-items:center; width:72px; height:72px; flex:none; background:#eef6ff; border-radius:16px; }
.store-heading-icon svg { width:44px; height:44px; }
.store-dialog.store-dialog h2 { margin:0; font-size:30px; font-weight:700; color:#14213a; }
.store-dialog.store-dialog .store-dialog-header p { margin:8px 0 0; font-size:16px; color:#7f8da3; line-height:1.5; }
.store-dialog.store-dialog .dialog-close { display:grid; place-items:center; width:44px; height:44px; padding:0; flex:none; border:0; border-radius:50%; color:#39465a; background:#ffffffb3; cursor:pointer; }
.dialog-close svg, .store-dialog-footer svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.store-dialog.store-dialog .dialog-close:hover { background:#f2f5f9; }
.store-dialog-body { padding:24px 48px 32px; min-height:0; overflow-y:auto; }
.store-dialog.store-dialog .store-avatar-field { display:block; margin:0 0 28px; padding:0; border:0; }
.store-avatar-field > b { display:block; margin-bottom:12px; font-size:16px; color:#14213a; }
.store-avatar-input { display:none; }
.store-dialog.store-dialog .store-avatar-dropzone { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; width:100%; min-height:220px; padding:20px; border:1.5px dashed #9ecbff; border-radius:16px; background:linear-gradient(180deg,#fbfdff,#f5faff); color:#14213a; font-family:inherit; cursor:pointer; transition:border-color .2s,background .2s,box-shadow .2s; }
.store-dialog.store-dialog .store-avatar-dropzone:hover { border-color:#1677ef; background:#f3f8ff; }
.store-dialog.store-dialog .store-avatar-dropzone.is-dragging { border-color:#1677ef; background:#edf6ff; box-shadow:0 0 0 4px #1677ef14; }
.store-upload-illustration { width:240px; max-width:100%; height:84px; }
.store-avatar-dropzone strong { font-size:16px; font-weight:600; }
.store-avatar-dropzone strong span { color:#1677ef; }
.store-avatar-dropzone small { color:#8290a5; font-size:13px; line-height:1.6; }
.store-avatar-image { width:120px; height:120px; border-radius:16px; object-fit:cover; border:1px solid #dbe3ee; }
.store-dialog.store-dialog .store-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px; padding:0; }
.store-form-grid .full { grid-column:1 / -1; }
.store-dialog.store-dialog .form-field { display:flex; flex-direction:column; gap:10px; min-width:0; margin:0; color:#14213a; font-size:16px; font-weight:600; }
.form-field em { color:#ef4444; font-style:normal; }
.store-dialog.store-dialog .form-field input:not([type=file]) { width:100%; height:54px; min-height:54px; padding:0 18px; border:1px solid #dbe3ee; border-radius:12px; background:#fff; color:#39465a; font-size:16px; font-weight:400; }
.store-dialog.store-dialog .form-field input:focus { border-color:#1677ef; box-shadow:0 0 0 3px #1677ef14; outline:none; }
.store-country-readonly { display:flex; align-items:center; gap:12px; min-height:54px; padding:0 18px; border:1px solid #dbe3ee; border-radius:12px; background:#f8fafc; color:#263247; font-weight:400; }
.store-country-readonly svg { width:22px; height:22px; flex:none; fill:none; stroke:#8290a5; stroke-width:1.6; }
.form-field small { color:#8290a5; font-size:12px; font-weight:400; }
.store-dialog.store-dialog .store-dialog-footer { display:flex; flex:none; align-items:center; justify-content:flex-end; gap:14px; min-height:96px; padding:20px 48px; border-top:1px solid #edf1f5; background:#fbfcfe; }
.store-dialog-footer button { display:inline-flex; align-items:center; justify-content:center; gap:12px; min-height:48px; padding:0 28px; border:1px solid #dbe3ee; border-radius:10px; background:#fff; color:#223047; font-size:16px; font-weight:600; cursor:pointer; }
.store-dialog-footer .primer-primary-button { padding:0 30px; border:0; background:linear-gradient(135deg,#2487f5,#0875ed); color:#fff; box-shadow:0 6px 18px #1677ef33; }
.store-dialog-footer .primer-primary-button:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 22px #1677ef40; }
.store-dialog button:disabled { opacity:.5; cursor:not-allowed; transform:none; }
.store-dialog button:focus-visible { outline:2px solid #1677ef; outline-offset:3px; }
.store-dialog.store-dialog .store-dialog-error { margin:20px 0 0; color:#dc2626; font-size:14px; }
@media(max-width:899px) {
  .store-dialog-mask { padding:16px; }
  .store-dialog.store-dialog { width:calc(100vw - 32px); max-height:calc(100dvh - 32px); }
  .store-dialog.store-dialog .store-dialog-header { min-height:0; padding:24px; gap:12px; }
  .store-heading { gap:16px; }
  .store-heading-icon { width:56px; height:56px; }
  .store-dialog.store-dialog h2 { font-size:24px; }
  .store-dialog.store-dialog .store-dialog-header p { font-size:14px; }
  .store-dialog-body { padding:24px; }
  .store-dialog.store-dialog .store-form-grid { grid-template-columns:1fr; }
  .store-dialog.store-dialog .store-dialog-footer { padding:16px 24px; min-height:80px; }
  .store-dialog.store-dialog .store-avatar-dropzone { min-height:200px; padding:16px; }
}
</style>
