<script setup>
import { computed, ref, watch } from 'vue';
import { useLocale } from '../i18n.js';
import { buildResultFileTree, getResultFolder, collectResultFiles } from '../utils/resultFileTree.js';
import ResultFileThumbnail from './ResultFileThumbnail.vue';
const props = defineProps({ files: { type: Array, required: true }, disabled: Boolean });
const emit = defineEmits(['remove']);
const { language } = useLocale();
const l = (zh, en, th) => language.value === 'en' ? en : language.value === 'th' ? th : zh;
const currentPath = ref([]);
const tree = computed(() => buildResultFileTree(props.files));
watch(tree, (root) => {
  while (currentPath.value.length && !getResultFolder(root, currentPath.value)) currentPath.value = currentPath.value.slice(0, -1);
});
const currentFolder = computed(() => getResultFolder(tree.value, currentPath.value) || tree.value);
const children = computed(() => [...currentFolder.value.children.values()].sort((a, b) =>
  (a.type === b.type ? 0 : a.type === 'folder' ? -1 : 1) || a.name.localeCompare(b.name, undefined, { numeric: true })));
const rootFolderCount = computed(() => [...tree.value.children.values()].filter(node => node.type === 'folder').length);
const size = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : bytes < 1073741824 ? `${(bytes / 1048576).toFixed(1)} MB` : `${(bytes / 1073741824).toFixed(1)} GB`;
const type = (node) => node.type === 'folder' ? l('文件夹', 'Folder', 'โฟลเดอร์') : (node.name.includes('.') ? node.name.split('.').pop().toUpperCase() : 'FILE');
function enter(node) { if (node.type === 'folder') currentPath.value = [...currentPath.value, node.name]; }
function remove(node) { if (!props.disabled) emit('remove', { files: collectResultFiles(node) }); }
</script>

<template>
  <div class="result-browser">
    <nav class="result-browser-nav" :aria-label="l('已选文件目录', 'Selected file location', 'ตำแหน่งไฟล์ที่เลือก')">
      <button type="button" :disabled="!currentPath.length" :aria-label="l('返回上一级', 'Go up', 'ย้อนกลับ')" @click="currentPath = currentPath.slice(0, -1)">←</button>
      <div class="result-crumbs">
        <button type="button" :aria-current="!currentPath.length ? 'page' : undefined" @click="currentPath = []">{{ l('全部', 'All', 'ทั้งหมด') }}</button>
        <template v-for="(part, index) in currentPath" :key="index">
          <span aria-hidden="true">/</span>
          <button type="button" :title="part" :aria-current="index === currentPath.length - 1 ? 'page' : undefined" @click="currentPath = currentPath.slice(0, index + 1)">{{ part }}</button>
        </template>
      </div>
    </nav>
    <div class="result-browser-columns"><span>{{ l('名称', 'Name', 'ชื่อ') }}</span><span>{{ l('类型', 'Type', 'ประเภท') }}</span><span>{{ l('大小', 'Size', 'ขนาด') }}</span><span></span></div>
    <div :key="JSON.stringify(currentPath)" class="result-browser-scroll">
      <div v-for="node in children" :key="node.id" class="result-browser-row" :class="{ 'is-folder': node.type === 'folder' }" @click="enter(node)">
        <button v-if="node.type === 'folder'" type="button" class="result-node-name" @click.stop="enter(node)">
          <span class="result-folder-icon" aria-hidden="true">▰</span>
          <span class="result-node-text"><b :title="node.name">{{ node.name }}</b><small>{{ l(`${node.count} 个文件`, `${node.count} files`, `${node.count} ไฟล์`) }}</small></span>
        </button>
        <div v-else class="result-node-name"><ResultFileThumbnail :file="node.file" /><b :title="node.name">{{ node.name }}</b></div>
        <span class="result-node-type" :title="type(node)">{{ type(node) }}</span>
        <span class="result-node-size">{{ node.type === 'folder' ? '—' : size(node.file.size) }}</span>
        <button type="button" class="result-node-remove" :disabled="disabled" :aria-label="`${l('移除', 'Remove', 'นำออก')} ${node.name}`" @click.stop="remove(node)">×</button>
      </div>
      <p v-if="!children.length" class="result-browser-empty">{{ l('尚未选择文件，可选择或拖入文件夹', 'Choose files or drop a folder here', 'เลือกไฟล์หรือลากโฟลเดอร์มาที่นี่') }}</p>
    </div>
    <div class="result-browser-summary">{{ l(`已选择 ${rootFolderCount} 个文件夹 · ${files.length} 个文件`, `Selected ${rootFolderCount} folders · ${files.length} files`, `เลือก ${rootFolderCount} โฟลเดอร์ · ${files.length} ไฟล์`) }}<small>{{ l('上传包含全部已选文件，不受当前目录影响；空文件夹不会被读取。', 'Uploads include all selected files, regardless of location. Empty folders are not included.', 'อัปโหลดไฟล์ที่เลือกทั้งหมด ไม่ขึ้นกับตำแหน่งปัจจุบัน ไม่รวมโฟลเดอร์ว่าง') }}</small></div>
  </div>
</template>

<style scoped>
.result-browser { margin-top: 12px; border: 1px solid #e3e9f1; border-radius: 8px; background: #fff; overflow: hidden; color: #172033; }
.result-browser button { margin: 0; min-height: 0; box-shadow: none; }
.result-browser-nav { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 4px 10px; border-bottom: 1px solid #edf1f5; }
.result-browser-nav button { background: transparent; border: 0; padding: 5px 8px; color: #1677ef; font-size: 13px; flex-shrink: 0; }
.result-browser-nav button:disabled { opacity: .35; cursor: default; }
.result-crumbs { display: flex; align-items: center; gap: 2px; overflow-x: auto; min-width: 0; font-size: 13px; color: #8491a4; }
.result-crumbs button { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-crumbs button[aria-current] { font-weight: 600; color: #172033; }
.result-browser-columns, .result-browser-row { display: grid; grid-template-columns: minmax(0, 1fr) 70px 80px 32px; align-items: center; gap: 10px; padding: 0 14px; }
.result-browser-columns { height: 34px; background: #f7f9fc; font-size: 12px; color: #8491a4; }
.result-browser-scroll { max-height: 350px; overflow-y: auto; overscroll-behavior: contain; }
.result-browser-row { min-height: 58px; border-bottom: 1px solid #edf1f5; font-size: 13px; }
.result-browser-row:hover { background: #f4f8fd; }
.result-browser-row.is-folder { cursor: pointer; }
.result-browser .result-node-name { display: flex; align-items: center; gap: 10px; min-width: 0; padding: 0; border: 0; background: transparent; color: #172033; text-align: left; font: inherit; }
.result-node-name b { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
.result-node-text { min-width: 0; }
.result-node-text small { color: #8491a4; font-size: 11px; }
.result-folder-icon { display: inline-flex; justify-content: center; align-items: center; width: 36px; height: 36px; flex-shrink: 0; border-radius: 6px; background: #fff4ce; color: #bc8b24; font-size: 22px; }
.result-node-type, .result-node-size { color: #8491a4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.result-browser .result-node-remove { padding: 4px; background: transparent; border: 0; color: #8491a4; font-size: 22px; }
.result-node-remove:hover { color: #d14343; }
.result-browser-summary { padding: 10px 14px; font-size: 13px; color: #58677c; background: #f7f9fc; }
.result-browser-summary small { display: block; margin-top: 5px; font-size: 11px; color: #8491a4; }
.result-browser-empty { padding: 25px 12px; text-align: center; color: #8491a4; font-size: 13px; }
@media (max-width: 560px) { .result-browser-columns, .result-browser-row { grid-template-columns: minmax(0, 1fr) 45px 62px 24px; gap: 5px; padding: 0 8px; } }
</style>
