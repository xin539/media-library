<script setup>
import { onMounted, ref } from 'vue'
import PageHeader from '../components/PageHeader.vue'
import { getMembers, updateMemberRole } from '../api/storeApi.js'
import { useLibraryStore } from '../stores/library.js'
import { useLocale } from '../i18n.js'

const library = useLibraryStore()
const { l } = useLocale()
const members = ref([])
const error = ref('')
async function load() { members.value = (await getMembers()).data }
onMounted(async () => { try { await load() } catch (e) { error.value = e.message } })
async function change(member, role) {
  try {
    await updateMemberRole(member.id, role)
    await load()
    window.dispatchEvent(new Event('operation-log-updated'))
  } catch (e) { error.value = e.message }
}
</script>

<template>
  <PageHeader :title="l('成员与权限', 'Members & permissions', 'สมาชิกและสิทธิ์')" :description="l('所有者可以管理成员并转移所有者身份', 'The owner can manage members and transfer ownership', 'เจ้าของสามารถจัดการสมาชิกและโอนสิทธิ์เจ้าของได้')" />
  <p v-if="error" class="error">{{ error }}</p>
  <div class="resource-table-wrap"><table class="resource-table"><thead><tr><th>{{ l('成员', 'Member', 'สมาชิก') }}</th><th>{{ l('账号', 'Account', 'บัญชี') }}</th><th>{{ l('加入时间', 'Joined', 'เข้าร่วมเมื่อ') }}</th><th>{{ l('角色', 'Role', 'บทบาท') }}</th></tr></thead><tbody>
    <tr v-for="member in members" :key="member.id"><td><div class="member-cell"><img v-if="member.avatarUrl" :src="member.avatarUrl" alt=""><span v-else>{{ member.nickname.slice(0, 1) }}</span><b>{{ member.nickname }}<small v-if="member.id === library.currentUser?.id">{{ l('当前账号', 'Current account', 'บัญชีปัจจุบัน') }}</small></b></div></td><td>{{ member.username || l('微信账号', 'WeChat account', 'บัญชี WeChat') }}</td><td>{{ new Date(member.createdAt).toLocaleString() }}</td><td><span v-if="member.role === 'owner'" class="owner-role">{{ l('文档所有者', 'Workspace owner', 'เจ้าของพื้นที่') }}</span><select v-else :value="member.role" @change="change(member, $event.target.value)"><option v-if="library.currentUser?.role === 'owner'" value="owner">{{ l('设为所有者', 'Make owner', 'ตั้งเป็นเจ้าของ') }}</option><option value="admin">{{ l('管理员', 'Admin', 'ผู้ดูแล') }}</option><option value="designer">{{ l('美工（可编辑）', 'Designer (can edit)', 'นักออกแบบ (แก้ไขได้)') }}</option><option value="viewer">{{ l('查看者', 'Viewer', 'ผู้ดู') }}</option></select></td></tr>
  </tbody></table></div>
  <div class="permission-help"><b>{{ l('权限说明', 'Permissions', 'สิทธิ์การใช้งาน') }}</b><p>{{ l('所有账号都可以创建店铺、上传素材、领取任务和管理文件；任务进度和自检仍由领取该任务的账号操作。', 'All accounts can create stores, upload assets, claim tasks and manage files. Task progress and self-review remain with the account that claimed the task.', 'ทุกบัญชีสามารถสร้างร้าน อัปโหลดสื่อ รับงาน และจัดการไฟล์ได้ ความคืบหน้าและการตรวจงานเป็นของบัญชีที่รับงาน') }}</p></div>
</template>
