<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../i18n.js'
const props = defineProps({ open: Boolean, storeName: { type: String, default: '' }, submitting: Boolean, externalError: { type: String, default: '' }, fileMode: Boolean, videoOnly: Boolean })
const emit = defineEmits(['close', 'submit'])
const selected = ref([])
const error = ref('')
const { t, l } = useLocale()
const dragging = ref(false)

// 释放本弹窗创建的临时预览地址。
function releasePreviews() {
  selected.value.forEach((item) => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) })
  selected.value = []
}
// 关闭弹窗或销毁组件时都执行清理。
watch(() => props.open, (open) => { if (!open) releasePreviews() })
onBeforeUnmount(releasePreviews)

function addFiles(fileList, replace = true) {
  const files = [...(fileList || [])].filter((file) => props.fileMode || (!props.videoOnly && file.type.startsWith('image/')) || file.type.startsWith('video/'))
  if (replace) releasePreviews()
  selected.value = replace ? [] : selected.value
  selected.value.push(...files.map((file) => ({ file, relativePath: file.relativePath || file.webkitRelativePath || file.name, previewUrl: props.fileMode ? '' : URL.createObjectURL(file), type: file.type.startsWith('video/') ? 'video' : 'image' })))
  error.value = files.length ? '' : (props.fileMode ? l('请选择文件', 'Choose files', 'เลือกไฟล์') : t.value.chooseMedia)
}
function choose(event) {
  const files = [...(event.target.files || [])].map((file) => {
    file.relativePath = file.webkitRelativePath || file.name
    return file
  }).filter((file) => props.fileMode || (!props.videoOnly && file.type.startsWith('image/')) || file.type.startsWith('video/'))
  addFiles(files)
  event.target.value = ''
}
function readEntry(entry) {
  if (entry.isFile) {
    return new Promise((resolve, reject) => entry.file((file) => {
      file.relativePath = entry.fullPath.replace(/^\//, '')
      resolve(file)
    }, reject))
  }
  if (!entry.isDirectory) return Promise.resolve([])
  const reader = entry.createReader()
  return new Promise((resolve, reject) => {
    const files = []
    const readEntries = () => reader.readEntries(async (entries) => {
      if (!entries.length) return resolve((await Promise.all(files)).flat())
      files.push(...entries.map(readEntry))
      readEntries()
    }, reject)
    readEntries()
  })
}
async function getDroppedFiles(event) {
  const items = [...(event.dataTransfer?.items || [])]
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean)
  if (entries.length) return (await Promise.all(entries.map(async (entry) => {
    const files = await readEntry(entry)
    return files.flat ? files.flat() : files
  }))).flat()
  return [...(event.dataTransfer?.files || [])]
}
function dragOver(event) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
  dragging.value = true
}
function dragEnter(event) {
  event.preventDefault()
  dragging.value = true
}
function dragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) dragging.value = false
}
async function drop(event) {
  event.preventDefault()
  event.stopPropagation()
  dragging.value = false
  try {
    const files = (await getDroppedFiles(event)).filter((file) => props.fileMode || (!props.videoOnly && file.type.startsWith('image/')) || file.type.startsWith('video/'))
    addFiles(files, false)
  } catch {
    error.value = l('读取文件夹失败，请改用“选择文件夹”。', 'Could not read the folder. Use “Choose folder” instead.', 'อ่านโฟลเดอร์ไม่สำเร็จ โปรดใช้ “เลือกโฟลเดอร์”')
  }
}
function submit() {
  // 原始 File 对象交给父页面保存，previewUrl 不进入数据库。
  if (props.submitting) return
  if (!selected.value.length) { error.value = props.fileMode ? l('请选择文件', 'Choose files', 'เลือกไฟล์') : t.value.chooseMedia; return }
  emit('submit', selected.value.map((item) => item.file))
}
</script>
<template>
  <div v-if="open" class="modal-mask" @click.self="$emit('close')"><section class="modal wide-modal">
    <header><div><h2>{{ fileMode ? l('上传文件', 'Upload files', 'อัปโหลดไฟล์') : videoOnly ? l('上传视频', 'Upload videos', 'อัปโหลดวิดีโอ') : t.uploadMedia }}</h2><p>{{ t.upload }} · {{ storeName }}</p></div><button @click="$emit('close')">×</button></header>
    <div class="drop-zone" :class="{ dragging }" @dragenter="dragEnter" @dragover="dragOver" @dragleave="dragLeave" @drop="drop">
      <span>{{ dragging ? t.dropMedia : l('拖入文件或文件夹', 'Drop files or folders here', 'ลากไฟล์หรือโฟลเดอร์มาวาง') }}</span>
      <div class="drop-actions"><label class="drop-action">{{ fileMode ? l('选择文件', 'Choose files', 'เลือกไฟล์') : videoOnly ? l('选择视频', 'Choose videos', 'เลือกวิดีโอ') : l('选择图片/视频', 'Choose images/videos', 'เลือกรูปภาพ/วิดีโอ') }}<input type="file" multiple :accept="fileMode ? undefined : videoOnly ? 'video/*' : 'image/*,video/*'" @change="choose"></label><label class="drop-action">{{ l('选择文件夹', 'Choose folder', 'เลือกโฟลเดอร์') }}<input type="file" multiple webkitdirectory directory @change="choose"></label></div>
    </div>
    <div v-if="selected.length" :class="fileMode ? 'upload-file-list' : 'preview-list'">
      <div v-for="(item, index) in selected" :key="`${item.file.name}-${index}`">
        <template v-if="fileMode"><span class="upload-file-icon">{{ item.file.name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE' }}</span><div><b :title="item.file.name">{{ item.file.name }}</b><small>{{ item.file.type || t.files }} · {{ item.file.size < 1048576 ? Math.max(1, Math.round(item.file.size / 1024)) + ' KB' : (item.file.size / 1048576).toFixed(1) + ' MB' }}</small></div></template>
        <template v-else><img v-if="item.type === 'image'" :src="item.previewUrl"><video v-else :src="item.previewUrl" muted></video><span>{{ item.file.name }}</span></template>
      </div>
    </div>
    <p v-if="error || externalError" class="error">{{ error || externalError }}</p>
    <footer><button class="secondary" :disabled="submitting" @click="$emit('close')">{{ t.cancel }}</button><button class="primary" :disabled="submitting" @click="submit">{{ submitting ? l('上传中…', 'Uploading…', 'กำลังอัปโหลด…') : t.confirmUpload }}</button></footer>
  </section></div>
</template>
