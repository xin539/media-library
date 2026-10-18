<script setup>
import { ref } from 'vue'
import { useLocale } from '../i18n.js'
import { downloadAsset, downloadTaskFile } from '../api/storeApi.js'
// trash=true 时显示恢复和永久删除，否则显示移入回收站。
const props = defineProps({ asset: { type: Object, required: true }, storeName: { type: String, default: '' }, trash: Boolean, selectable: Boolean, selected: Boolean, canSetCover: Boolean, canManage: { type: Boolean, default: true }, detailed: Boolean, compact: Boolean })
const { t, l } = useLocale()
const downloading = ref(false)
const downloadError = ref('')
const previewFailed = ref(false)
defineEmits(['delete', 'restore', 'purge', 'toggle', 'set-cover'])
// 将文件字节数转换成便于阅读的 KB 或 MB。
const formatSize = (bytes) => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`
async function download() {
  downloading.value = true
  downloadError.value = ''
  try {
    const blob = props.asset.taskFile ? await downloadTaskFile(props.asset.id) : await downloadAsset(props.asset.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = props.asset.name
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    window.dispatchEvent(new Event('operation-log-updated'))
  } catch (error) {
    downloadError.value = error.message || l('下载失败', 'Download failed', 'ดาวน์โหลดไม่สำเร็จ')
  } finally {
    downloading.value = false
  }
}
</script>
<template><article class="asset-card" :class="{ selected: props.selected, detailed: props.detailed, compact: props.compact }"><label v-if="props.selectable" class="asset-select"><input type="checkbox" :checked="props.selected" @change="$emit('toggle')"><span></span></label><div class="asset-preview"><img v-if="asset.type === 'image' && !previewFailed" :src="asset.url" :alt="asset.name" @error="previewFailed = true"><video v-else-if="asset.type !== 'image' && !previewFailed" :src="asset.url" controls preload="metadata" @error="previewFailed = true"></video><div v-else class="asset-preview-error"><b>{{ l('预览加载失败', 'Preview unavailable', 'โหลดตัวอย่างไม่สำเร็จ') }}</b><button @click="previewFailed = false">{{ l('重试', 'Retry', 'ลองอีกครั้ง') }}</button></div></div>
  <div class="asset-info"><b :title="asset.name">{{ asset.name }}</b><template v-if="props.detailed"><small class="asset-store-line">{{ storeName || l('未知店铺', 'Unknown store', 'ไม่ทราบร้าน') }}</small><div class="asset-meta-row"><span>{{ asset.name.split('.').pop()?.toUpperCase() || (asset.type === 'image' ? 'IMAGE' : 'VIDEO') }}</span><span>{{ formatSize(asset.size) }}</span><span>{{ asset.taskFile ? l('任务附件', 'Task attachment', 'ไฟล์แนบงาน') : l('店铺素材', 'Store asset', 'สื่อร้านค้า') }}</span></div><time>{{ t.uploadTime }}：{{ new Date(asset.createdAt).toLocaleString() }}</time></template><small v-else>{{ storeName }} · {{ formatSize(asset.size) }} · {{ t.uploadTime }} {{ new Date(asset.createdAt).toLocaleString() }}</small>
    <div v-if="trash" class="asset-actions"><button @click="$emit('restore')">{{ t.restore }}</button><button class="danger" @click="$emit('purge')">{{ t.permanentDelete }}</button></div>
    <template v-else><small v-if="downloadError" class="asset-download-error">{{ downloadError }}</small>
    <div v-else class="asset-actions"><button class="asset-download" :disabled="downloading" @click="download">{{ downloading ? l('下载中…', 'Downloading…', 'กำลังดาวน์โหลด…') : t.download }}</button><button v-if="props.canManage" class="danger" @click="$emit('delete')">{{ t.moveTrash }}</button><button v-if="props.canManage && props.canSetCover && asset.type === 'image'" class="cover-action" @click="$emit('set-cover')">{{ t.setCover }}</button></div></template>
  </div></article></template>
