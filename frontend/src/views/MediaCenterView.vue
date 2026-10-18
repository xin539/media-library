<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useLibraryStore } from '../stores/library.js'
import { useLocale } from '../i18n.js'
import StoreView from './StoreView.vue'
import PageHeader from '../components/PageHeader.vue'
import StoreDialog from '../components/StoreDialog.vue'
const library = useLibraryStore()
const route = useRoute()
const { l } = useLocale()
const country = ref('')
const storeView = ref(null)
const createOpen = ref(false)
const saving = ref(false)
const createError = ref('')
const uploadHint = ref('')
const hasSelectedStore = computed(() => stores.value.some(item => item.id === selectedStore.value))
function openUpload() {
  if (!hasSelectedStore.value) {
    uploadHint.value = l('请先选择店铺，再上传文件或视频。', 'Select a store before uploading files or videos.', 'กรุณาเลือกร้านค้าก่อนอัปโหลด')
    document.getElementById('media-store-picker')?.focus()
    return
  }
  uploadHint.value = ''
  storeView.value?.openUpload(mediaType.value === 'video' ? 'media' : 'file')
}
async function createStore(form) {
  if (saving.value) return
  saving.value = true; createError.value = ''
  const previousIds = new Set(library.activeStores.map(item => item.id))
  try {
    await library.saveStore(form)
    country.value = normalize(form.country)
    selectedStore.value = library.activeStores.find(item => !previousIds.has(item.id))?.id || ''
    createOpen.value = false
  } catch (error) { createError.value = error.message || l('创建失败，请重试','Could not create store','สร้างร้านค้าไม่สำเร็จ') }
  finally { saving.value = false }
}
const mediaType = ref(['file', 'video'].includes(route.query.type) ? route.query.type : 'file')
const selectedStore = ref(String(route.query.store || ''))
watch(selectedStore, () => { uploadHint.value = '' })
function normalize(value = '') {
  if (/菲律宾|philippines/i.test(value)) return '菲律宾'
  if (/马来西亚|malaysia/i.test(value)) return '马来西亚'
  if (/泰国|thailand/i.test(value)) return '泰国'
  if (/中国|china/i.test(value)) return '中国'
  return value || '未设置国家'
}
const countries = computed(() => [...new Set(['菲律宾', '马来西亚', '泰国', ...library.activeStores.map(item => normalize(item.country))])].filter(item => item !== '中国'))
const countryLabel = value => ({ 菲律宾:l('菲律宾','Philippines','ฟิลิปปินส์'), 马来西亚:l('马来西亚','Malaysia','มาเลเซีย'), 泰国:l('泰国','Thailand','ประเทศไทย'), 中国:l('中国','China','จีน') })[value] || value
const stores = computed(() => library.activeStores.filter(item => normalize(item.country) === country.value))
watch(() => library.activeStores, items => {
  if (!country.value) {
    const initial = items.find(item => item.id === selectedStore.value)
    country.value = initial && normalize(initial.country) !== '中国' ? normalize(initial.country) : '菲律宾'
  }
}, { immediate:true })
function chooseCountry(value) { country.value = value; selectedStore.value = '' }
</script>
<template>
  <section class="workspace-page media-center-page">
  <PageHeader :title="l('素材中心','Media center','ศูนย์สื่อ')" :description="l('管理各店铺的素材文件与视频，支持多国家多店铺统一管理','Manage files and videos across your stores and countries.','จัดการไฟล์และวิดีโอของร้านค้าในหลายประเทศในที่เดียว')" />
  <div class="country-store-toolbar">
    <div class="country-options" :aria-label="l('国家','Country','ประเทศ')">
      <button v-for="item in countries" :key="item" :class="{ chosen: country === item }" :aria-pressed="country === item" @click="chooseCountry(item)">{{ countryLabel(item) }}</button>
    </div>
    <div class="shop-picker"><label for="media-store-picker">{{ l('店铺','Store','ร้านค้า') }}</label>
      <select id="media-store-picker" v-model="selectedStore">
        <option value="">{{ stores.length ? l('请选择店铺','Select store','เลือกร้านค้า') : l('该国家暂无店铺','No stores in this country','ไม่มีร้านค้าในประเทศนี้') }}</option>
        <option v-for="item in stores" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    <button v-if="library.currentUser" class="primary create-store-button" @click="createError = ''; createOpen = true">＋ {{ l('创建店铺','Create store','สร้างร้านค้า') }}</button>
    </div>
  </div>
  <div class="media-action-row"><div class="media-tabs" role="tablist" aria-label="素材类型">
    <button v-for="item in ['file', 'video']" :key="item" role="tab" :aria-selected="mediaType === item" :class="{ active: mediaType === item }" @click="mediaType = item">{{ item === 'image' ? l('图片','Images','รูปภาพ') : item === 'video' ? l('视频','Videos','วิดีโอ') : l('文件','Files','ไฟล์') }}</button>
  </div><button v-if="library.currentUser" class="primary" @click="openUpload">＋ {{ mediaType === 'video' ? l('上传视频','Upload videos','อัปโหลดวิดีโอ') : l('上传文件／文件夹','Upload files / folder','อัปโหลดไฟล์ / โฟลเดอร์') }}</button></div>
  <p v-if="uploadHint" class="error" role="alert">{{ uploadHint }}</p>
  <p class="media-upload-help">{{ hasSelectedStore ? l('点击上传，可拖入文件／文件夹，或打开系统窗口选择本地文件路径。', 'Click Upload to drop files or folders, or browse your computer.', 'คลิกอัปโหลดเพื่อลากไฟล์หรือเลือกไฟล์จากคอมพิวเตอร์') : l('先选择店铺，再点击上传；支持拖入文件／文件夹或选择本地文件。', 'Select a store, then upload by dropping files or browsing your computer.', 'เลือกร้านค้าก่อน แล้วอัปโหลดโดยลากหรือเลือกไฟล์') }}</p>
  <StoreDialog :open="createOpen" :default-country="country" :submitting="saving" :external-error="createError" @close="!saving && (createOpen = false)" @save="createStore" />
  <StoreView ref="storeView" v-if="selectedStore && stores.some(item => item.id === selectedStore)" :key="selectedStore" :store-id="selectedStore" :media-type="mediaType" embedded />
  <div v-else class="selection-hint ui-empty">
<svg class="empty-illustration" viewBox="0 0 160 128" aria-hidden="true"><ellipse cx="80" cy="116" rx="48" ry="6" fill="#eef4fb"/><path d="m36 64 44-18 44 18-44 20Z" fill="#c5ddf9"/><path d="m36 64 44 20v34l-44-20Z" fill="#dbeafd"/><path d="m80 84 44-20v34l-44 20Z" fill="#a8cdf7"/><path d="m36 64-16 20 45 17 15-17Z" fill="#eef5ff" stroke="#d3e5fa"/><path d="m80 84 16 17 44-19-16-18Z" fill="#e1efff" stroke="#c5ddf9"/><rect x="58" y="12" width="36" height="34" rx="6" transform="rotate(-12 58 12)" fill="#e7f1fe"/><path d="m63 36 8-11 8 7 5-6 9 12" fill="#a8cdf7"/><circle cx="85" cy="18" r="3" fill="#bad6f7"/><path d="M110 18v-8m13 16 6-6" stroke="#1677ef" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="46" r="3" fill="#c5ddf9"/></svg>
    <h2>{{ stores.length ? l('请选择店铺','Select a store','เลือกร้านค้า') : l('该国家暂无店铺','No stores yet','ยังไม่มีร้านค้า') }}</h2>
    <p>{{ stores.length ? l('请选择店铺，下方直接显示该店铺的文件和视频。','Select a store to view its files and videos here.','เลือกร้านค้าเพื่อดูไฟล์ รูปภาพ และวิดีโอที่นี่') : l('该国家暂无店铺，请选择其他国家。','No stores in this country. Select another country.','ไม่มีร้านค้าในประเทศนี้ โปรดเลือกประเทศอื่น') }}</p>
  </div>
  </section>
</template>
<style scoped>
.country-store-toolbar { display:flex; flex-direction:column; align-items:stretch; gap:24px; margin-bottom:24px; }
.country-options { display:flex; flex-wrap:wrap; gap:8px; }
.country-options button { height:42px; padding:0 28px; border:0; border-radius:8px; background:transparent; color:#566174; cursor:pointer; font-size:14px; }
.country-options button:hover { background:#eef6ff; color:var(--brand); }
.country-options button.chosen { background:var(--brand); color:#fff; box-shadow:0 4px 12px #1677ef26; }
.shop-picker { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
.shop-picker > label { flex-basis:100%; color:#334155; font-size:13px; font-weight:600; }
.shop-picker select { width:320px; max-width:100%; min-width:0; height:44px; }
.media-action-row { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:24px; border-bottom:1px solid var(--border); }
.media-action-row > button { margin-bottom:12px; }
.media-tabs { display:flex; gap:24px; }
.media-tabs button { background:transparent; border:0; border-bottom:3px solid transparent; border-radius:0; padding:16px 12px; color:#7b8798; cursor:pointer; font-size:14px; }
.media-tabs button.active { color:var(--brand); border-bottom-color:var(--brand); font-weight:600; }
.media-tabs button:hover { color:var(--brand); }
.selection-hint { min-height:320px; }
.media-upload-help { margin: -8px 0 20px; color: #8491a4; font-size: 13px; }
@media(max-width:640px) { .country-options button { padding:0 16px; } .shop-picker select { width:100%; } }
</style>
