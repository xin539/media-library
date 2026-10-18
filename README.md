# Media Library · 素材管理与设计任务协作

Vue 3 + Pinia + Vue Router + Element Plus 前端，Express 5 + MySQL 8 后端。
支持店铺管理、素材上传下载、回收站、设计任务领取/提交/审核以及成员角色管理。

## 核心代码

- `backend/src/server.js`：应用装配、中间件、接口与前端静态资源托管。
- `backend/src/routes/`：路由与权限中间件。
- `backend/src/controllers/`：业务校验、文件处理与响应。
- `backend/src/repositories/`：SQL、字段映射与数据访问。
- `backend/src/db.js`：MySQL 连接池及事务上下文。
- `frontend/src/views/`：页面；`stores/library.js`：共享状态；`api/`：请求封装。

## 在新电脑运行

准备 Node.js 22.13 或更高版本（建议 Node.js 24）、MySQL 8。

1. 在 MySQL 中创建空数据库 `media_library`（utf8mb4），创建仅有该库权限的应用账号。
2. 复制 `backend/.env.example` 为 `backend/.env`，填写自己的 MySQL 账号和密码。核心账号密码登录不需要微信 API Key。
3. 在终端执行：

```powershell
cd backend
npm ci
node scripts/init-db.js
$env:DEMO_PASSWORD = Read-Host '设置演示账号密码（至少10位，仅用于本地演示）'
node scripts/seed-demo.js
Remove-Item Env:DEMO_PASSWORD
cd ../frontend
npm ci
npm run build
cd ../backend
npm start
```

打开 http://localhost:3000 ，使用 `demo_admin`、`demo_designer` 或 `demo_viewer` 登录，密码为刚刚自行设置的值。
健康检查：http://localhost:3000/api/health 。上述环境变量命令为 PowerShell 语法。

初始化脚本只允许空数据库；不覆盖已有库。演示脚本可重复执行，不删除已有记录、不重置已存在的演示密码。
演示内容：3 个虚构店铺、18 张程序生成的示意图（3 张位于回收站）、3 份需求文件、6 种状态的设计任务。
图片可从“最近上传”查看；素材中心按国家和店铺筛选。系统关闭公开注册，通过管理员管理成员。

## 配置和数据保护

仓库仅提供配置模板，不包含真实 API Key、数据库密码、登录会话、原用户信息或业务素材。
`backend/.env`、`.local/`、`storage/`、`data/`、`backups/` 和日志均被排除。
后端密钥只放服务器环境变量；不要放入 `VITE_*`，因为这些变量会进入浏览器构建产物。
仓库中的 `schema.sql` 只有表结构；演示素材由脚本在本地生成。

## 验证与说明

前端构建：`cd frontend` 后执行 `npm run build`。
后端测试可能写入测试记录，应配置独立测试数据库后执行 `npm test`，不要对业务库运行。
`migrate-mysql.js` 用于已有 SQLite 快照迁移，新安装使用 `init-db.js`。

这是源代码仓库。GitHub Pages 不能直接运行 Express + MySQL；在线运行需另行部署 Node.js 服务、MySQL 和持久化文件存储。
