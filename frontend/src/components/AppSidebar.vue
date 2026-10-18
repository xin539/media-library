<script setup>
import { useLocale } from '../i18n.js'
import { useLibraryStore } from '../stores/library.js'
import { useRoute } from 'vue-router'
const { language, t, l, setLanguage } = useLocale()
const library = useLibraryStore()
const route = useRoute()
const isTaskSelected = view => route.path === '/tasks' && (route.query.view || 'available') === view
</script>
<template>
  <!-- 全站共用的左侧导航；router-link 会自动标记当前页面。 -->
  <aside class="sidebar">
    <div class="brand"><div class="brand-logo">M</div><div><b>{{ t.library }}</b><small>Media Library</small></div></div>
    <nav>
      <router-link to="/media" :class="{ 'router-link-active': route.name === 'store' }"><i aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M3 7h7l2 3h9v10H3ZM3 7V4h7l2 3h9v3" /></svg></i><span>{{ l('素材中心', 'Media center', 'ศูนย์สื่อ') }}</span></router-link>
      <small class="nav-heading">{{ t.designTasks }}</small>
      <div class="task-nav-group">
        <router-link to="/tasks?view=available" class="task-parent" active-class="task-parent-active" exact-active-class="task-parent-exact"><i aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg></i><span>{{ t.tasks }}</span></router-link>
        <div class="task-subnav">
          <router-link v-for="item in [{view:'available',label:t.pendingClaim},{view:'mine',label:t.myTasks},{view:'review',label:t.pendingReview},{view:'completed',label:t.completed}]" :key="item.view" :to="{path:'/tasks',query:{view:item.view}}" active-class="task-route-match" exact-active-class="task-route-exact" :aria-current="isTaskSelected(item.view) ? 'page' : undefined" :class="{'task-selected':isTaskSelected(item.view)}">{{ item.label }}</router-link>
        </div>
      </div>
      <router-link to="/recent"><i class="nav-history-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 7v5l3 2M4.9 5.6A8 8 0 1 1 4 15M4 5v4h4"/></svg></i><span>{{ t.recent }}</span></router-link>
      <router-link to="/trash"><i aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></svg></i><span>{{ t.trash }}</span></router-link>
      <template v-if="['owner', 'admin'].includes(library.currentUser?.role)"><small class="nav-heading">{{ t.management }}</small><router-link to="/members"><i aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24"><path d="M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m16-8a4 4 0 0 1 4 4v4M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 0a4 4 0 0 1 0 8" /></svg></i><span>{{ t.membersPermissions }}</span></router-link></template>
    </nav>
    <label class="sidebar-language"><span>{{ t.language }}</span><select v-model="language" @change="setLanguage(language)"><option value="zh">{{ t.chinese }}</option><option value="en">{{ t.english }}</option><option value="th">{{ t.thai }}</option></select></label>
    <div class="server-status"><i></i><div><b>{{ t.serverConnected }}</b><small>MySQL · {{ t.sharedStorage }}</small></div></div>
  </aside>
</template>
<style scoped>
.sidebar nav .task-subnav { padding:4px 0 8px 28px; }
.sidebar nav .task-subnav a { min-height:36px; padding:0 12px; border-radius:8px; font-size:13px; color:#b8c8d8; }
.sidebar nav .task-subnav a.task-selected { background:#1677ef; color:#fff; font-weight:600; box-shadow:none; }
.sidebar nav .task-subnav a:hover { background:#ffffff12; color:#fff; }
.sidebar nav .task-parent-active { background:#ffffff0a; color:#fff; }
.sidebar nav a:focus-visible { outline:2px solid #88ceff; outline-offset:2px; }
.nav-history-icon svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
@media(max-width:640px) {
  .sidebar nav .task-subnav { padding:4px 0; }
  .sidebar nav .task-subnav a { padding:4px 2px; font-size:11px; text-align:center; }
}
</style>
