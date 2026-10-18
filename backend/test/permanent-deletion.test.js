import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID, randomBytes } from 'node:crypto'
import express from 'express'
import { db } from '../src/db.js'
import { hashPassword } from '../src/controllers/authController.js'
import { createLocalUser, createSession } from '../src/repositories/userRepository.js'
import { insertStore } from '../src/repositories/storeRepository.js'
import { insertAsset } from '../src/repositories/assetRepository.js'
import assetRoutes from '../src/routes/assetRoutes.js'
import storeRoutes from '../src/routes/storeRoutes.js'
import { storageRoot } from '../src/storagePath.js'

test('permanent deletion requires current identity and password', async t => {
  const userIds = [], storeIds = [], assetIds = []
  const folder = await fs.mkdtemp(path.join(storageRoot, 'security-test-'))
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWZkAAAAASUVORK5CYII=', 'base64')
  const now = new Date().toISOString()
  const app = express(); app.use(express.json())
  app.use('/api/assets', assetRoutes); app.use('/api/stores', storeRoutes)
  app.use((err, req, res, next) => res.status(err.status || 500).json({ message: err.status ? err.message : 'error' }))
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    for (const id of [...assetIds, ...storeIds]) await db.prepare('DELETE FROM operation_logs WHERE target_id = ?').run(id)
    for (const id of storeIds) await db.prepare('DELETE FROM stores WHERE id = ?').run(id)
    for (const id of userIds) await db.prepare('DELETE FROM users WHERE id = ?').run(id)
    await fs.rm(folder, { recursive: true, force: true })
    await db.close()
  })
  async function user(role) {
    const id = randomUUID(), username = `test-${id.slice(0, 20)}`
    const password = randomBytes(20).toString('hex'), token = randomBytes(32).toString('hex')
    userIds.push(id)
    await createLocalUser({ id, username, nickname: 'security-test', passwordHash: (await hashPassword(password, username)).toString('hex') })
    await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
    await createSession(token, id, new Date(Date.now() + 60000).toISOString())
    return { id, password, token }
  }
  const owner = await user('owner'), admin = await user('admin'), designer = await user('designer')
  async function fixture(trashed = true) {
    const storeId = randomUUID(), id = randomUUID(), disk = path.join(folder, `${id}.png`)
    storeIds.push(storeId); assetIds.push(id)
    await insertStore({ id: storeId, name: 'security-test', country: '测试', category: '测试', createdAt: now, updatedAt: now })
    await fs.writeFile(disk, png)
    await insertAsset({ id, storeId, name: 'security-test.png', type: 'image', size: png.length, filePath: `/storage/${path.basename(folder)}/${id}.png`, createdAt: now })
    if (trashed) await db.prepare('UPDATE assets SET deleted_at = ? WHERE id = ?').run(now, id)
    return { id, storeId, disk }
  }
  const remove = (record, account, password = account?.password, kind = 'assets') => fetch(`${base}/api/${kind}/${kind === 'assets' ? record.id : record.storeId}/permanent`, { method:'DELETE', headers:{ 'Content-Type':'application/json', ...(account ? { Cookie:`media_session=${account.token}` } : {}) }, body:JSON.stringify({ password }) })
  const read = (record, account) => fetch(`${base}/api/assets/${record.id}/file`, { headers: account ? { Cookie:`media_session=${account.token}` } : {} })
  const record = await fixture()
  await t.test('unauthenticated and ordinary users rejected', async () => {
    assert.equal((await remove(record)).status, 401)
    assert.equal((await remove(record, designer)).status, 403)
    assert.equal((await read(record)).status, 401)
  })
  await t.test('owner and admin wrong password rejected', async () => {
    for (const account of [owner, admin]) assert.equal((await remove(record, account, 'wrong-test-password')).status, 403)
    assert.ok(await fs.stat(record.disk))
  })
  await t.test('trashed file rejects reads; restoration permits preview', async () => {
    assert.equal((await read(record, owner)).status, 404)
    await db.prepare('UPDATE assets SET deleted_at = NULL WHERE id = ?').run(record.id)
    const result = await read(record, owner)
    assert.equal(result.status, 200)
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff')
    assert.match(result.headers.get('cache-control'), /private/)
    assert.deepEqual(Buffer.from(await result.arrayBuffer()), png)
  })
  await t.test('active asset cannot be permanently deleted', async () => assert.equal((await remove(record, owner)).status, 400))
  await t.test('valid current password deletes disk and row, logs no secrets', async () => {
    await db.prepare('UPDATE assets SET deleted_at = ? WHERE id = ?').run(now, record.id)
    assert.equal((await remove(record, owner)).status, 204)
    await assert.rejects(fs.stat(record.disk), { code:'ENOENT' })
    assert.equal(await db.prepare('SELECT id FROM assets WHERE id = ?').get(record.id), undefined)
    const logs = await db.prepare('SELECT * FROM operation_logs WHERE target_id = ?').all(record.id)
    assert.equal(logs.length, 1); assert.equal(logs[0].action, 'purge'); assert.equal(logs[0].user_id, owner.id)
    assert.ok(!JSON.stringify(logs).includes(owner.password)); assert.ok(!JSON.stringify(logs).includes(owner.token))
  })
  await t.test('store deletion requires trash and cleans associated media', async () => {
    const item = await fixture()
    assert.equal((await remove(item, admin, admin.password, 'stores')).status, 400)
    await db.prepare('UPDATE stores SET deleted_at = ? WHERE id = ?').run(now, item.storeId)
    assert.equal((await remove(item, admin, admin.password, 'stores')).status, 204)
    await assert.rejects(fs.stat(item.disk), { code:'ENOENT' })
    assert.equal(await db.prepare('SELECT id FROM assets WHERE id = ?').get(item.id), undefined)
  })
  await t.test('filesystem failure does not remove database record', async () => {
    const item = await fixture()
    await fs.unlink(item.disk); await fs.mkdir(item.disk)
    assert.equal((await remove(item, owner)).status, 500)
    assert.ok(await db.prepare('SELECT id FROM assets WHERE id = ?').get(item.id))
  })
  await t.test('missing target returns 404', async () => assert.equal((await remove({id:randomUUID()}, owner)).status, 404))
  await t.test('database/log failure rolls back record and restores file', async () => {
    const item = await fixture()
    // Fail inside the transaction after staging, deletion and logging.
    const transaction = db.transaction
    db.transaction = fn => transaction.call(db, async () => { await fn(); throw new Error('test transaction failure') })
    try {
      assert.equal((await remove(item, owner)).status, 500)
      assert.deepEqual(await fs.readFile(item.disk), png)
      assert.ok(await db.prepare('SELECT id FROM assets WHERE id = ?').get(item.id))
      assert.equal((await db.prepare('SELECT id FROM operation_logs WHERE target_id = ?').all(item.id)).length, 0)
    } finally { db.transaction = transaction }
  })
  await t.test('legacy shared deletion password is absent from source', async () => {
    for (const file of ['assetController.js', 'storeController.js']) {
      const source = await fs.readFile(new URL(`../src/controllers/${file}`, import.meta.url), 'utf8')
      assert.ok(!source.includes('TRASH_DELETE_PASSWORD'))
    }
  })
})
