import './config.js'
import { db } from './db.js'
import express from 'express'
import cors from 'cors'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

import storeRoutes from './routes/storeRoutes.js'
import assetRoutes from './routes/assetRoutes.js'
import authRoutes from './routes/authRoutes.js'
import logRoutes from './routes/logRoutes.js'
import taskFileRoutes from './routes/taskFileRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

// =====================================================
// 基础配置
// =====================================================

const app = express()

const port = Number(process.env.PORT || 3000)

// ES Module 环境下获取当前文件目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Vue build 后的 dist 目录
const frontendDist = path.resolve(
  __dirname,
  '../../frontend/dist'
)

// =====================================================
// 中间件
// =====================================================

// 如果以后前后端完全都走 3000，实际上可以进一步收紧 CORS。
// 目前开发阶段保留。
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}))

// JSON 请求体
app.use(
  express.json({
    limit: '3mb'
  })
)

// =====================================================
// API
// =====================================================

// 健康检查
app.get('/api/health', async (_request, response) => {
  await db.prepare('SELECT 1 AS ok').get()
  response.json({
    status: 'ok',
    database: 'mysql',
    time: new Date().toISOString(),
    frontend: fs.existsSync(frontendDist)
  })
})

// 店铺 API
app.use('/api/stores', storeRoutes)
app.use('/api/assets', assetRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/task-files', taskFileRoutes)
app.use('/api/tasks', taskRoutes)
// Uploads are private. Do not fall through to the SPA or a static file handler.
app.use('/storage', (_request, response) => {
  response.set('X-Content-Type-Options', 'nosniff')
  response.status(404).json({ message: '文件请通过受控接口访问。' })
})

// =====================================================
// Vue 前端
// =====================================================

// 判断有没有 build 好的前端
if (fs.existsSync(frontendDist)) {
  console.log(`前端目录：${frontendDist}`)

  // 提供 Vue 编译后的 JS / CSS / 图片等静态文件
  app.use(express.static(frontendDist))

  /*
   * Vue SPA fallback
   *
   * 例如访问：
   * /stores
   * /assets
   * /recent
   *
   * 如果这些不是后端 API，
   * 都返回 frontend/dist/index.html，
   * 之后交给 Vue Router 处理。
   */
  app.use((request, response, next) => {
    // API 请求不能返回 index.html
    if (request.path.startsWith('/api/')) {
      return next()
    }

    // 只处理 GET 页面请求
    if (request.method !== 'GET') {
      return next()
    }

    return response.sendFile(
      path.join(frontendDist, 'index.html')
    )
  })
} else {
  console.warn('⚠️ 未发现 Vue dist 目录')
  console.warn(`路径：${frontendDist}`)
  console.warn('请先执行：cd frontend && npm run build')

  // 没 build 前端时访问首页给出提示
  app.get('/', (_request, response) => {
    response.status(503).send(`
      <h2>Media Library 后端已经启动</h2>
      <p>但前端还没有构建。</p>
      <p>请执行：</p>
      <pre>
cd /Volumes/DISK2DATA/media-library/frontend
npm run build
      </pre>
    `)
  })
}

// =====================================================
// API 404
// =====================================================

app.use('/api', (request, response) => {
  response.status(404).json({
    error: 'API_NOT_FOUND',
    message: `接口不存在：${request.method} ${request.originalUrl}`
  })
})

// =====================================================
// 错误处理中间件
// =====================================================

// 一定放在最后
app.use(errorHandler)

// =====================================================
// 启动服务器
// =====================================================

const server = app.listen(port, '0.0.0.0', () => {
  console.log('')
  console.log('========================================')
  console.log('Media Library 已启动')
  console.log(`本机访问：http://localhost:${port}`)
  console.log(`API检查：http://localhost:${port}/api/health`)
  console.log('========================================')
  console.log('')
})

// =====================================================
// 启动错误处理
// =====================================================

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${port} 已经被其他程序占用`)
  } else if (error.code === 'EACCES') {
    console.error(`❌ 没有权限使用端口 ${port}`)
  } else {
    console.error('❌ 服务器启动失败：', error)
  }

  process.exit(1)
})

// =====================================================
// 优雅退出
// =====================================================

function shutdown(signal) {
  console.log(`收到 ${signal}，正在关闭服务器...`)

  server.close(async () => {
    await db.close()
    console.log('服务器已正常关闭')
    process.exit(0)
  })

  // 防止某些连接一直不结束
  setTimeout(() => {
    console.error('服务器关闭超时，强制退出')
    process.exit(1)
  }, 5000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
