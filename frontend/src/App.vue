<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import OperationLogPanel from './components/OperationLogPanel.vue'
import Login from './views/Login.vue'
import { getCurrentUser } from './api/storeApi.js'
import { useLocale } from './i18n.js'
import { useLibraryStore } from './stores/library'


const library = useLibraryStore()
const { language, t, l, setLanguage } = useLocale()
const user = ref(null)
const checkingUser = ref(true)
const sessionError = ref('')
const settingsOpen = ref(false)
const settingsRefreshing = ref(false)
const settingsMessage = ref('')

async function refreshWorkspace() {
  settingsRefreshing.value = true
  settingsMessage.value = ''
  try {
    await library.load()
    settingsMessage.value = l('数据已刷新。', 'Workspace refreshed.', 'รีเฟรชข้อมูลแล้ว')
  } catch (error) {
    settingsMessage.value = error.message || l('刷新失败。', 'Refresh failed.', 'รีเฟรชไม่สำเร็จ')
  } finally {
    settingsRefreshing.value = false
  }
}

onMounted(async () => {
  try {
    user.value = (await getCurrentUser()).data
    library.currentUser = user.value
    if (user.value) await library.load()
  } catch (error) {
    sessionError.value = error.message
  } finally {
    checkingUser.value = false
  }
})
// 应用卸载时释放图片和视频的临时预览地址，避免内存泄漏。
onBeforeUnmount(() => library.releaseAllUrls())

const switchingAccount = ref(false)

async function switchAccount() {
  if (switchingAccount.value) return

  if (!window.confirm('切换账号会离开当前页面，请先保存未提交的内容。继续吗？')) {
    return
  }

  switchingAccount.value = true
  settingsMessage.value = ''

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin'
    })

    if (!response.ok) {
      throw new Error('退出失败，请重试。')
    }

    window.location.replace(
      window.location.pathname + '#/'
    )
    window.location.reload()
  } catch (error) {
    settingsMessage.value = error.message
    switchingAccount.value = false
  }
}
</script>

<template>
  <!-- 正在检查登录状态 -->
  <div v-if="checkingUser" class="login-state auth-loading">
    <span class="auth-spinner"></span>
    <b>{{ t.library }}</b>
    <small>
      {{
        l(
          '正在连接共享空间…',
          'Connecting to shared workspace…',
          'กำลังเชื่อมต่อพื้นที่ทำงาน…'
        )
      }}
    </small>
  </div>

  <Login v-else-if="!user" :initial-error="sessionError" @login-success="user = $event" />
  <!-- 已登录 -->
  <div v-else class="app-shell">
    <AppSidebar />

    <header class="global-appbar">
      <div class="global-appbar-brand">
        <button type="button" :aria-label="l('菜单', 'Menu', 'เมนู')">
          <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span>{{ t.library }}</span>
      </div>

      <div class="global-appbar-metrics">
        <span>{{ t.stores }} <b>{{ library.activeStores.length }}</b></span>
        <span>{{ t.imagesCount }} <b>{{ library.imageCount }}</b></span>
        <span>{{ t.videosCount }} <b>{{ library.videoCount }}</b></span>
      </div>

      <div class="global-appbar-actions">
        <button
          type="button"
          :title="l('刷新', 'Refresh', 'รีเฟรช')"
          :disabled="settingsRefreshing || switchingAccount"
          @click="refreshWorkspace"
        >
          <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></svg>
        </button>

        <router-link
          to="/recent"
          class="global-icon-link"
          :title="t.recent"
        >
          <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" /></svg>
        </router-link>

        <button
          type="button"
          :class="{ active: settingsOpen }"
          :title="l('设置', 'Settings', 'ตั้งค่า')"
          @click="settingsOpen = true"
        >
          <svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-1 3-3 1-2 4 2 3v3l4 3 3-1 3 1 4-3v-3l2-3-2-4-3-1-1-3Z" /><circle cx="12" cy="12" r="3" /></svg>
        </button>

        <span class="global-user">
          <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="">
          <b v-else>{{ user.nickname?.slice(0, 1) || 'U' }}</b>
          <small>{{ user.nickname }}</small>
        </span>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <OperationLogPanel :user="user" />

    <!-- 设置弹窗 -->
    <div
      v-if="settingsOpen"
      class="modal-mask settings-mask"
      @click.self="!switchingAccount && (settingsOpen = false)"
    >
      <section
        class="modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-settings-title"
      >
        <header>
          <div>
            <h2 id="global-settings-title">
              {{ l('全局设置', 'Global settings', 'การตั้งค่าทั่วไป') }}
            </h2>
            <p>
              {{
                l(
                  '设置会应用到整个系统',
                  'Settings apply across the entire app',
                  'การตั้งค่าจะใช้กับทั้งระบบ'
                )
              }}
            </p>
          </div>
          <button
            type="button"
            :aria-label="t.close"
            :disabled="switchingAccount"
            @click="settingsOpen = false"
          >
            ×
          </button>
        </header>

        <div class="settings-content">
          <label class="settings-row">
            <span>
              <b>{{ t.language }}</b>
              <small>
                {{
                  l(
                    '切换后所有页面立即更新',
                    'All pages update immediately',
                    'ทุกหน้าจะอัปเดตทันที'
                  )
                }}
              </small>
            </span>
            <select v-model="language" @change="setLanguage(language)">
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="th">ไทย</option>
            </select>
          </label>

          <!-- 当前账号及切换按钮 -->
          <div class="settings-row">
            <span>
              <b>{{ l('当前账号', 'Current account', 'บัญชีปัจจุบัน') }}</b>
              <small>
                {{ user.nickname }} · {{ user.username || '—' }} · {{ user.role }}
              </small>
            </span>
            <button
              type="button"
              class="secondary"
              :disabled="switchingAccount || settingsRefreshing"
              @click="switchAccount"
            >
              {{
                switchingAccount
                  ? l('正在退出…', 'Signing out…', 'กำลังออกจากระบบ…')
                  : l('切换账号', 'Switch account', 'สลับบัญชี')
              }}
            </button>
          </div>

          <div class="settings-row">
            <span>
              <b>{{ l('共享数据', 'Shared data', 'ข้อมูลที่แชร์') }}</b>
              <small>
                {{
                  l(
                    '重新从服务器读取店铺、素材和任务',
                    'Reload stores, assets and tasks from the server',
                    'โหลดร้านค้า สื่อ และงานจากเซิร์ฟเวอร์ใหม่'
                  )
                }}
              </small>
            </span>
            <button
              type="button"
              class="secondary"
              :disabled="settingsRefreshing || switchingAccount"
              @click="refreshWorkspace"
            >
              {{
                settingsRefreshing
                  ? l('刷新中…', 'Refreshing…', 'กำลังรีเฟรช…')
                  : l('立即刷新', 'Refresh now', 'รีเฟรชตอนนี้')
              }}
            </button>
          </div>

          <p
            v-if="settingsMessage"
            class="settings-message"
            role="status"
          >
            {{ settingsMessage }}
          </p>
        </div>

        <footer>
          <button
            type="button"
            class="primary"
            :disabled="switchingAccount"
            @click="settingsOpen = false"
          >
            {{ t.close }}
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
<style src="./workspace-ui.css"></style>
<style scoped>
.login-state.auth-loading { min-height:100dvh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; background:#f5f7fa; }
</style>
