<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import AssetCard from '../components/AssetCard.vue'
import UploadDialog from '../components/UploadDialog.vue'
import { useLibraryStore } from '../stores/library'
import { downloadAssets, downloadFolder, downloadTaskFile, renameAssetFolder, setStoreCover } from '../api/storeApi.js'
import { serverFileUrl } from '../api/request.js'
import { downloadTaskFiles, renameTaskFile, renameTaskBatch } from '../api/storeApi.js'
import { saveDownload } from '../utils/saveDownload.js'
import { useLocale } from '../i18n.js'

// route 提供当前地址中的店铺 id；router 用于返回首页。
const props = defineProps({ storeId: { type: String, default: '' }, embedded: Boolean, mediaType: { type: String, default: '' } })
const activeStoreId = computed(() => props.storeId || route.params.id)
const route = useRoute(); const router = useRouter(); const library = useLibraryStore()
const { t, l } = useLocale()
const uploadOpen = ref(false); const uploadMode = ref('media'); const uploading = ref(false); const uploadError = ref(''); const filter = ref('all'); const currentFolder = ref(''); const editingFolder = ref(''); const editingName = ref('')
const currentUploadBatch = ref('')
const selectedIds = ref([])
const actionBusy = ref(false)
const actionError = ref('')
async function fileAction(action) {
  if (actionBusy.value) return
  actionBusy.value = true; actionError.value = ''
  try { await action(); window.dispatchEvent(new Event('operation-log-updated')) }
  catch (error) { actionError.value = error.message || l('操作失败，请重试。', 'Operation failed. Please retry.', 'ดำเนินการไม่สำเร็จ') }
  finally { actionBusy.value = false }
}
function renameUploaded(target, group = false) {
  const name = window.prompt(l('请输入新名称（文件请保留扩展名）', 'New name (keep the file extension)', 'ชื่อใหม่ (เก็บนามสกุลไฟล์)'), group ? target.label : target.name)
  if (!name?.trim()) return
  fileAction(async () => {
    const response = group ? await renameTaskBatch(activeStoreId.value, target.id, name.trim()) : await renameTaskFile(target.id, name.trim())
    for (const update of response.data) {
      const file = library.taskFiles.find(file => file.id === update.id)
      if (file) Object.assign(file, update)
    }
  })
}
function deleteUploaded(files) {
  if (!window.confirm(l(`确定永久删除这 ${files.length} 个文件？无法从回收站恢复。`, `Permanently delete ${files.length} files? This cannot be undone.`, `ลบ ${files.length} ไฟล์ถาวรหรือไม่? ไม่สามารถกู้คืนได้`))) return
  fileAction(async () => {
    for (const file of files) await library.removeTaskFile(file.id)
    if (currentUploadBatch.value && !allStoreFiles.value.some(file => file.uploadBatch === currentUploadBatch.value)) closeFolder()
  })
}
function downloadGroup(group) { fileAction(async () => saveDownload(await downloadTaskFiles(group.files.map(file => file.id)), `${group.label}.zip`)) }
const canUpload = computed(() => Boolean(library.currentUser))
const canManageFile = () => true
// 根据唯一 id 取得当前店铺。
const store = computed(() => library.storeById(activeStoreId.value))
const storesByCountry = computed(() => [...new Set(library.stores.map(item => item.country || l('未设置国家', 'Unspecified country', 'ไม่ระบุประเทศ')))].map(country => ({ country, stores: library.stores.filter(item => (item.country || l('未设置国家', 'Unspecified country', 'ไม่ระบุประเทศ')) === country) })))
watch(() => [activeStoreId.value, route.query.type, props.mediaType], () => {
  currentFolder.value = ''; currentUploadBatch.value = ''; selectedIds.value = []
  editingFolder.value = ''; editingName.value = ''; uploadOpen.value = false; uploadError.value = ''
  filter.value = props.mediaType || (['video', 'file'].includes(route.query.type) ? route.query.type : 'file')
}, { immediate: true })
function switchStore(event) { router.push({ name: 'store', params: { id: event.target.value } }) }
// 按“全部、图片、视频”过滤当前店铺素材。
const storeAssets = computed(() => [...library.assetsForStore(activeStoreId.value)].sort((a, b) => b.createdAt - a.createdAt))
const allStoreFiles = computed(() => [...library.taskFilesForStore(activeStoreId.value)].sort((a, b) => b.createdAt - a.createdAt))
const groupedTaskFiles = computed(() => allStoreFiles.value.filter((file) => file.uploadBatch))
const uploadGroups = computed(() => [...new Map(groupedTaskFiles.value.map((file) => [file.uploadBatch, {
  id: file.uploadBatch,
  label: file.uploadLabel || file.relativePath?.split('/')[0] || l('上传文件夹', 'Uploaded folder', 'โฟลเดอร์ที่อัปโหลด'),
  files: groupedTaskFiles.value.filter((item) => item.uploadBatch === file.uploadBatch)
}])).values()])
const visibleTaskFiles = computed(() => allStoreFiles.value.filter((file) => {
  if (currentFolder.value) return false
  if (currentUploadBatch.value) return file.uploadBatch === currentUploadBatch.value
  return !file.uploadBatch
}))
const storeFiles = computed(() => visibleTaskFiles.value.filter((file) => library.taskFileMediaType(file) === 'file'))
const taskImages = computed(() => currentFolder.value ? [] : visibleTaskFiles.value
  .filter(file => library.taskFileMediaType(file) !== 'file')
  .filter(file => filter.value === 'all' || library.taskFileMediaType(file) === filter.value)
  .map(file => ({ ...file, type: library.taskFileMediaType(file), taskFile: true })))
const categoryCounts = computed(() => {
  const imageCount = visibleAssets.value.filter((asset) => asset.type === 'image').length + visibleTaskFiles.value.filter((file) => library.taskFileMediaType(file) === 'image').length
  const videoCount = visibleAssets.value.filter((asset) => asset.type === 'video').length + visibleTaskFiles.value.filter((file) => library.taskFileMediaType(file) === 'video').length
  const folderCount = currentFolder.value || currentUploadBatch.value ? 0 : folders.value.length + uploadGroups.value.length
  const fileCount = storeFiles.value.length + folderCount
  return { all: imageCount + videoCount + fileCount, file: fileCount, image: imageCount, video: videoCount }
})
const folders = computed(() => [...new Set(storeAssets.value.filter((asset) => asset.relativePath?.includes('/')).map((asset) => asset.relativePath.split('/')[0]))])
const visibleAssets = computed(() => storeAssets.value.filter((asset) => {
  if (currentUploadBatch.value) return false
  const path = asset.relativePath || asset.name
  const inFolder = currentFolder.value ? path.startsWith(`${currentFolder.value}/`) : !path.includes('/')
  return inFolder
}))
const assets = computed(() => visibleAssets.value.filter(asset => filter.value === 'all' || asset.type === filter.value))
const allSelected = computed(() => assets.value.length > 0 && assets.value.every((asset) => selectedIds.value.includes(asset.id)))
function assetName(asset) { return asset.relativePath?.split('/').pop() || asset.name }
function openFolder(folder) { currentFolder.value = folder; currentUploadBatch.value = ''; filter.value = 'all' }
function openUploadGroup(group) { currentUploadBatch.value = group.id; currentFolder.value = ''; filter.value = 'all' }
function closeFolder() { currentFolder.value = ''; currentUploadBatch.value = '' }
function toggleAsset(id) { selectedIds.value = selectedIds.value.includes(id) ? selectedIds.value.filter((item) => item !== id) : [...selectedIds.value, id] }
function toggleAll() {
  const visibleIds = assets.value.map((asset) => asset.id)
  selectedIds.value = allSelected.value
    ? selectedIds.value.filter((id) => !visibleIds.includes(id))
    : [...new Set([...selectedIds.value, ...visibleIds])]
}
async function downloadSelected() {
  const blob = await downloadAssets(selectedIds.value)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = 'media-library-download.zip'; link.click(); URL.revokeObjectURL(url)
}
async function downloadFolderZip(folder) {
  const blob = await downloadFolder(activeStoreId.value, folder)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = `${folder}.zip`; link.click(); URL.revokeObjectURL(url)
}
async function setCover(asset) {
  const response = await setStoreCover(activeStoreId.value, asset.id)
  const index = library.stores.findIndex((item) => item.id === activeStoreId.value)
  if (index !== -1) library.stores[index] = { ...library.stores[index], ...response.data, avatar: serverFileUrl(`/api/assets/stores/${activeStoreId.value}/cover`) }
}
function folderLatestTime(folder) {
  const latest = storeAssets.value.find((asset) => asset.relativePath?.startsWith(`${folder}/`))
  return latest ? new Date(latest.createdAt).toLocaleString() : ''
}
function folderAssets(folder) {
  return storeAssets.value.filter((asset) => asset.relativePath?.startsWith(`${folder}/`))
}
function startRename(folder) { editingFolder.value = folder; editingName.value = folder }
async function saveRename(folder) {
  const newName = editingName.value.trim()
  if (!newName || newName === folder || newName.includes('/')) { editingFolder.value = ''; return }
  await renameAssetFolder(activeStoreId.value, folder, newName)
  storeAssets.value.filter((asset) => asset.relativePath?.startsWith(`${folder}/`)).forEach((asset) => {
    asset.relativePath = `${newName}${asset.relativePath.slice(folder.length)}`
  })
  editingFolder.value = ''
}
async function upload(files) {
  uploading.value = true; uploadError.value = ''
  try {
    if (uploadMode.value === 'media') await library.addAssets(activeStoreId.value, files)
    else await library.addTaskFiles(activeStoreId.value, files)
    uploadOpen.value = false
  } catch (error) { uploadError.value = error.message || l('上传失败，请重试。', 'Upload failed. Please try again.', 'อัปโหลดไม่สำเร็จ โปรดลองอีกครั้ง') } finally { uploading.value = false }
}
function openUpload(mode) {
  uploadMode.value = mode
  uploadError.value = ''
  uploadOpen.value = true
}
defineExpose({ openUpload })
const formatSize = (size) => size < 1048576 ? `${Math.max(1, Math.round(size / 1024))} KB` : `${(size / 1048576).toFixed(1)} MB`
async function downloadFile(file) { saveDownload(await downloadTaskFile(file.id), file.name); window.dispatchEvent(new Event('operation-log-updated')) }
</script>
<template>
  <template v-if="store">
    <p v-if="actionError" class="error" role="alert">{{ actionError }}</p>
    <nav v-if="!embedded" class="store-breadcrumb"><router-link to="/media">{{ l('全部店铺', 'All stores', 'ร้านค้าทั้งหมด') }}</router-link><span>/</span><span>{{ store.name }}</span></nav>
    <PageHeader v-if="!embedded" :title="store.name" :description="[store.country, store.category].filter(Boolean).join(' · ')"><div class="header-actions store-actions"><label class="store-switch">{{ l('切换店铺', 'Switch store', 'สลับร้านค้า') }}<select :value="store.id" :disabled="uploading" @change="switchStore"><optgroup v-for="group in storesByCountry" :key="group.country" :label="group.country"><option v-for="item in group.stores" :key="item.id" :value="item.id">{{ item.name }}</option></optgroup></select></label><button v-if="canUpload" class="secondary" @click="openUpload('file')">＋ {{ l('上传文件', 'Upload files', 'อัปโหลดไฟล์') }}</button><button v-if="canUpload" class="primary" @click="openUpload('media')">＋ {{ l('上传视频', 'Upload videos', 'อัปโหลดวิดีโอ') }}</button></div></PageHeader>
    <div v-if="!embedded || currentFolder || currentUploadBatch || (filter !== 'file' && assets.length)" class="filters store-category-filters"><button v-if="currentFolder || currentUploadBatch" class="secondary" @click="closeFolder">← {{ t.backFolder }}</button><span v-if="currentFolder || currentUploadBatch" class="folder-path">{{ currentFolder || uploadGroups.find((group) => group.id === currentUploadBatch)?.label }}</span><button v-for="item in (embedded ? [] : ['file','video'])" :key="item" :class="{ active: filter === item }" @click="filter = item"><span>{{ item === 'all' ? t.all : item === 'file' ? t.files : item === 'image' ? t.images : t.videos }}</span><b>{{ categoryCounts[item] }}</b></button><button v-if="filter !== 'file' && assets.length" class="secondary select-all" @click="toggleAll">{{ allSelected ? t.cancelSelect : `${t.selectAll} ${assets.length}` }}</button><button v-if="selectedIds.length && filter !== 'file'" class="primary" @click="downloadSelected">{{ t.download }} {{ selectedIds.length }}</button></div>
    <div v-if="(filter === 'all' || filter === 'file') && !currentFolder && !currentUploadBatch && folders.length" class="folder-grid"><div v-for="folder in folders" :key="folder" class="folder-card"><button class="folder-open" @click="openFolder(folder)"><span>▰</span><b>{{ editingFolder === folder ? t.rename : folder }}</b><small>{{ t.files }} {{ folderAssets(folder).length }} · {{ t.images }} {{ folderAssets(folder).filter((asset) => asset.type === 'image').length }} · {{ t.videos }} {{ folderAssets(folder).filter((asset) => asset.type === 'video').length }}<br>{{ t.latestUpload }} {{ folderLatestTime(folder) }}</small></button><div v-if="editingFolder === folder" class="folder-rename"><input v-model="editingName" @keyup.enter="saveRename(folder)" @keyup.esc="editingFolder = ''"><button @click="saveRename(folder)">{{ t.save }}</button></div><div v-else class="folder-actions"><button @click.stop="startRename(folder)">{{ t.rename }}</button><button @click.stop="downloadFolderZip(folder)">{{ t.downloadFolder }}</button></div></div></div>
    <div v-if="(filter === 'all' || filter === 'file') && !currentFolder && !currentUploadBatch && uploadGroups.length" class="folder-grid"><div v-for="group in uploadGroups" :key="group.id" class="folder-card"><button class="folder-open" @click="openUploadGroup(group)"><span>▰</span><b>{{ group.label }}</b><small>{{ l('包含', 'Contains', 'ประกอบด้วย') }} {{ group.files.length }} {{ l('项', 'items', 'รายการ') }}<br>{{ t.latestUpload }} {{ new Date(group.files[0].createdAt).toLocaleString() }}</small></button><div class="folder-actions"><button :disabled="actionBusy" @click="renameUploaded(group, true)">{{ t.rename }}</button><button :disabled="actionBusy" @click="downloadGroup(group)">{{ t.download }}</button><button class="danger" :disabled="actionBusy" @click="deleteUploaded(group.files)">{{ t.remove }}</button></div></div></div>
    <section v-if="(filter === 'all' || filter === 'file') && storeFiles.length" class="store-file-section"><h2 v-if="filter === 'all'">{{ t.files }}</h2><div class="task-file-list"><article v-for="file in storeFiles" :key="file.id" class="task-file-row"><span class="task-file-icon">{{ file.name.split('.').pop()?.slice(0, 4).toUpperCase() || 'FILE' }}</span><div><b class="task-file-name">{{ file.name }}</b><small>{{ file.mimeType || t.files }} · {{ formatSize(file.size) }} · {{ new Date(file.createdAt).toLocaleString() }}</small></div><button :disabled="actionBusy" @click="renameUploaded(file)">{{ t.rename }}</button><button :disabled="actionBusy" @click="fileAction(() => downloadFile(file))">{{ t.download }}</button><button v-if="canManageFile(file)" :disabled="actionBusy" class="danger" @click="deleteUploaded([file])">{{ t.remove }}</button></article></div></section>
    <div v-if="filter !== 'file' && assets.length" class="asset-grid"><AssetCard v-for="asset in assets" :key="asset.id" :asset="asset" selectable :selected="selectedIds.includes(asset.id)" can-set-cover can-manage @toggle="toggleAsset(asset.id)" @set-cover="setCover(asset)" @delete="library.moveToTrash(asset.id)" /></div>
    <div v-if="taskImages.length" class="asset-grid"><div v-for="asset in taskImages" :key="asset.id"><AssetCard :asset="asset" can-manage @delete="deleteUploaded([asset])" /><button class="secondary" :disabled="actionBusy" @click="renameUploaded(asset)">{{ t.rename }}</button></div></div>
    <div v-if="filter === 'file' && !storeFiles.length && (currentUploadBatch || currentFolder || (!uploadGroups.length && !folders.length))" class="store-empty">{{ l('暂无文件', 'No files yet', 'ยังไม่มีไฟล์') }}</div>
    <div v-if="filter === 'video' && !assets.length && !taskImages.length" class="store-empty">{{ l('暂无视频', 'No videos yet', 'ยังไม่มีวิดีโอ') }}</div>
    <UploadDialog v-if="canUpload" :video-only="uploadMode === 'media'" :file-mode="uploadMode === 'file'" :open="uploadOpen" :store-name="store.name" :submitting="uploading" :external-error="uploadError" @close="!uploading && (uploadOpen = false)" @submit="upload" />
  </template><div v-else class="empty"><b>{{ l('店铺不存在', 'Store not found', 'ไม่พบร้านค้า') }}</b><p><router-link to="/">{{ t.backStore }}</router-link></p></div>
</template>
<style scoped>
.store-empty { padding:48px 16px; text-align:center; color:var(--muted); font-size:14px; }
.store-breadcrumb { display:flex; align-items:center; gap:12px; margin-bottom:18px; color:var(--muted); font-size:14px; }
.store-breadcrumb a { color:#1769aa; text-decoration:none; }
.store-breadcrumb a:hover { text-decoration:underline; }
.store-actions { flex-wrap:wrap; }
.store-switch { display:flex; align-items:center; gap:10px; color:var(--muted); font-size:14px; }
.store-switch select { width:180px; min-height:40px; border:1px solid var(--border); border-radius:6px; background:white; padding:8px 12px; color:var(--text); }
.store-category-filters { border-bottom:1px solid var(--border); padding-bottom:16px; }
</style>
