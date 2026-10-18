<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { getMembers, getOperationLogs, updateMemberRole } from '../api/storeApi.js'
import { useLocale } from '../i18n.js'

const props = defineProps({ user: { type: Object, default: null } })
const { t, l } = useLocale()
const logs = ref([])
const members = ref([])
const loading = ref(true)
const activeFilter = ref('all')
const actionName = (action) => ({
  create: l('创建了', 'created', 'สร้าง'), update: l('编辑了', 'edited', 'แก้ไข'), delete: l('删除了', 'deleted', 'ลบ'), upload: l('上传了', 'uploaded', 'อัปโหลด'), download: l('下载了', 'downloaded', 'ดาวน์โหลด'), login: l('登录了', 'logged in', 'เข้าสู่ระบบ'), register: l('注册了', 'registered', 'ลงทะเบียน'), rename: l('重命名了', 'renamed', 'เปลี่ยนชื่อ'), purge: l('永久删除了', 'permanently deleted', 'ลบถาวร'), set_cover: l('设置了首页图', 'set the cover', 'ตั้งรูปหน้าปก'), claim: l('领取了', 'claimed', 'รับงาน'), progress: l('更新了进度', 'updated progress', 'อัปเดตความคืบหน้า'), complete: l('完成了', 'completed', 'เสร็จสิ้น')
})[action] || action
const targetName = (target) => ({ store: t.value.stores, asset: l('素材', 'asset', 'สื่อ'), task_file: t.value.files, task: t.value.tasks, folder: l('文件夹', 'folder', 'โฟลเดอร์'), user: l('账号', 'account', 'บัญชี') })[target] || target
const filters = computed(() => [
  { value: 'all', label: t.value.all }, { value: 'upload', label: t.value.upload },
  { value: 'download', label: t.value.download }, { value: 'update', label: t.value.edit },
  { value: 'delete', label: t.value.remove }
])

const visibleLogs = () => activeFilter.value === 'all'
  ? logs.value
  : logs.value.filter((log) => log.action === activeFilter.value)

async function loadLogs() {
  try {
    members.value = (await getMembers()).data
    logs.value = (await getOperationLogs()).data
  } finally {
    loading.value = false
  }
}

const roleName = (member) => member.role === 'owner' ? l('文档所有者', 'Workspace owner', 'เจ้าของพื้นที่') : member.role === 'viewer' ? l('可查看', 'Can view', 'ดูได้') : l('可编辑', 'Can edit', 'แก้ไขได้')
async function changeRole(member, role) {
  const updated = (await updateMemberRole(member.id, role)).data
  Object.assign(member, updated)
}

onMounted(() => {
  loadLogs()
  window.addEventListener('operation-log-updated', loadLogs)
})
onBeforeUnmount(() => window.removeEventListener('operation-log-updated', loadLogs))
defineExpose({ loadLogs })
</script>

<template>
  <aside class="operation-panel">
    <header class="operation-header">
      <div><b>{{ t.operationLog }}</b><small>{{ l('共享素材库的操作记录', 'Shared workspace activity', 'กิจกรรมในพื้นที่ทำงานร่วมกัน') }}</small></div>
      <button class="operation-refresh" :title="t.refresh" @click="loading = true; loadLogs()"><svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></svg></button>
    </header>
    <section v-if="props.user" class="owner-section">
      <div class="member-heading"><span>{{ l('空间成员', 'Workspace members', 'สมาชิกพื้นที่') }} · {{ members.length }}</span><i :title="t.membersPermissions">ⓘ</i></div>
      <router-link v-if="['owner', 'admin'].includes(props.user.role)" to="/members" class="invite-member-button">{{ t.membersPermissions }}</router-link>
      <div class="panel-member-list"><div v-for="(member, index) in members" :key="member.id" class="owner-row">
        <img v-if="member.avatarUrl" :src="member.avatarUrl" alt="" class="owner-avatar">
        <span v-else class="owner-avatar placeholder">{{ member.nickname.slice(0, 1) }}</span>
        <div><strong>{{ member.nickname }}</strong><small v-if="member.id === props.user.id">{{ t.me }}</small></div>
        <span v-if="member.role === 'owner'" class="owner-role">{{ roleName(member) }}</span>
        <select v-else-if="['owner', 'admin'].includes(props.user.role)" :value="member.role" class="panel-role-select" @change="changeRole(member, $event.target.value)"><option v-if="props.user.role === 'owner'" value="owner">{{ l('设为所有者', 'Make owner', 'ตั้งเป็นเจ้าของ') }}</option><option value="admin">{{ l('管理员', 'Admin', 'ผู้ดูแล') }}</option><option value="designer">{{ l('可编辑', 'Can edit', 'แก้ไขได้') }}</option><option value="viewer">{{ l('可查看', 'Can view', 'ดูได้') }}</option></select>
        <span v-else class="owner-role">{{ roleName(member) }}</span>
      </div></div>
    </section>
    <nav class="operation-filters" :aria-label="l('日志筛选', 'Activity filters', 'ตัวกรองกิจกรรม')">
      <button v-for="filter in filters" :key="filter.value" :class="{ active: activeFilter === filter.value }" @click="activeFilter = filter.value">{{ filter.label }}</button>
    </nav>
    <div v-if="loading" class="operation-empty">{{ l('正在加载...', 'Loading...', 'กำลังโหลด...') }}</div>
    <div v-else-if="!visibleLogs().length" class="operation-empty">{{ t.noLogs }}</div>
    <div v-else class="operation-items">
      <article v-for="log in visibleLogs().slice(0, 30)" :key="log.id" class="operation-item">
        <img v-if="log.avatarUrl" :src="log.avatarUrl" alt="" class="operation-avatar">
        <span v-else class="operation-avatar placeholder">{{ log.nickname.slice(0, 1) }}</span>
        <div class="operation-content">
          <div><strong>{{ log.nickname }}</strong><span class="operation-action">{{ actionName(log.action) }}</span></div>
          <small v-if="log.details?.name">{{ targetName(log.targetType) }} · {{ log.details.name }}</small>
          <small v-else-if="log.details?.count">{{ targetName(log.targetType) }} · {{ l(`${log.details.count} 个文件`, `${log.details.count} files`, `${log.details.count} ไฟล์`) }}</small>
          <small v-else>{{ targetName(log.targetType) }}</small>
          <time>{{ new Date(log.createdAt).toLocaleString() }}</time>
        </div>
      </article>
    </div>
  </aside>
</template>
