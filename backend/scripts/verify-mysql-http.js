import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { db } from '../src/db.js'

const base = 'http://127.0.0.1:3000'
let cookie = '', userId, storeId
const files = []
async function api(route, options = {}) {
  const response = await fetch(base + route, {...options, headers:{cookie, ...options.headers}})
  const body = await response.json()
  assert.ok(response.ok, `${route}: ${response.status} ${JSON.stringify(body)}`)
  return {body, response}
}
const json = body => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
try {
  assert.equal((await api('/api/health')).body.database, 'mysql')
  const credentials = {username:'migration_' + randomUUID().slice(0,8), nickname:'迁移验证',password:randomUUID()}
  const registered = await api('/api/auth/register', json(credentials))
  userId = registered.body.data.id
  assert.equal(registered.body.data.role, 'designer')
  const logged = await api('/api/auth/login', json(credentials))
  cookie = logged.response.headers.get('set-cookie').split(';')[0]
  assert.equal((await api('/api/auth/me')).body.data.id, userId)
  for (const route of ['/api/stores','/api/assets','/api/tasks','/api/task-files','/api/logs']) {
    const {body} = await api(route)
    assert.ok(Array.isArray(body.data))
  }
  const now = new Date().toISOString()
  storeId = randomUUID()
  await db.prepare('INSERT INTO stores(id,name,country,category,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(storeId,'迁移测试店铺','泰国','测试',now,now)
  const task = (await api('/api/tasks',json({storeId,title:'测试成品持久化',skuText:'蓝色\n绿色'}))).body.data
  const claim = await api(`/api/tasks/${task.id}/claim`,{method:'PATCH'})
  assert.equal(claim.body.data.assigneeId,userId)
  const form = new FormData()
  form.append('taskId',task.id)
  form.append('purpose','result')
  form.append('files',new Blob(['mysql migration verification'],{type:'text/plain'}),'验证成品.txt')
  const uploaded = (await api(`/api/task-files/stores/${storeId}`,{method:'POST',body:form})).body.data
  files.push(...uploaded)
  assert.equal(uploaded[0].name,'验证成品.txt')
  assert.equal(uploaded[0].taskId,task.id)
  const downloaded = await fetch(base+`/api/task-files/${uploaded[0].id}/download`,{headers:{cookie}})
  assert.equal(await downloaded.text(),'mysql migration verification')
  assert.equal((await api(`/api/tasks/${task.id}/submit`,{method:'PATCH'})).body.data.status,'submitted')
  for (const file of files) {
    const response = await fetch(base+`/api/task-files/${file.id}`,{method:'DELETE',headers:{cookie}})
    assert.equal(response.status,204)
  }
  console.log('HTTP verified: registration, login, session, lists, task claim, file upload/download/delete, submission')
} finally {
  if(storeId) await db.prepare('DELETE FROM stores WHERE id=?').run(storeId)
  if(userId) {
    await db.prepare('DELETE FROM operation_logs WHERE user_id=?').run(userId)
    await db.prepare('DELETE FROM users WHERE id=?').run(userId)
  }
  await db.close()
}
