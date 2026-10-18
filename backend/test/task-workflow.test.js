import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { randomUUID } from 'node:crypto'
import { db } from '../src/db.js'
after(() => db.close())
import { insertStore, removeStore } from '../src/repositories/storeRepository.js'
import { claimTask, findTaskById, insertTask, reviewTask, submitTask, updateTaskProgress } from '../src/repositories/taskRepository.js'

test('美工任务可以领取、提交、退回并再次审核完成', async (t) => {
  const now = new Date().toISOString(); const storeId = randomUUID(); const userId = randomUUID(); const taskId = randomUUID()
  ;(await db.prepare(`INSERT INTO users (id, openid, nickname, role, created_at, updated_at) VALUES (?, ?, ?, 'designer', ?, ?)`).run(userId, `test:${userId}`, '测试美工', now, now))
  ;(await insertStore({ id: storeId, name: '任务流程测试店铺', avatarPath: null, country: '中国', category: '测试', createdAt: now, updatedAt: now }))
  t.after(async () => { ;(await removeStore(storeId)); ;(await db.prepare('DELETE FROM users WHERE id = ?').run(userId)) })
  ;(await insertTask({ id: taskId, storeId, title: '测试任务', description: '', priority: 'normal', creatorId: null, deadline: null, createdAt: now, productCode: null, productName: '测试商品', productImageUrl: null, skuText: null }))
  assert.equal((await claimTask(taskId, userId, now)), true)
  assert.equal((await updateTaskProgress(taskId, userId, 75, now)), true)
  assert.equal((await submitTask(taskId, userId, now)), true)
  assert.equal((await reviewTask(taskId, 'revision', '请调整尺寸', now)), true)
  assert.equal((await findTaskById(taskId)).status, 'revision')
  assert.equal((await submitTask(taskId, userId, now)), true)
  assert.equal((await reviewTask(taskId, 'completed', null, now)), true)
  assert.equal((await findTaskById(taskId)).status, 'completed')
})
