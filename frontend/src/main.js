// Vue 应用入口：在这里安装全局插件并挂载根组件。
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import './asset-library.css'
import './panel-members.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

// Pinia 管理店铺和素材数据；Router 管理不同页面的地址。
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
