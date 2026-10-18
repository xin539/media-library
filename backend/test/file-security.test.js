import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import express from 'express'
import { db } from '../src/db.js'
import { secureUpload, completeUpload } from '../src/middleware/secureUpload.js'
import { uploadAssets } from '../src/controllers/assetController.js'
import { assetFile, taskFile } from '../src/controllers/fileController.js'
import { requireUser } from '../src/middleware/auth.js'
import { storageRoot, resolveStoragePath } from '../src/storagePath.js'
import { insertStore, removeStore } from '../src/repositories/storeRepository.js'

test('controlled storage integration', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'media-security-test-'))
  const storeId = randomUUID()
  const now = new Date().toISOString()
  const records = []
  let server
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    for (const r of records) {
      const row = await db.prepare('SELECT file_path FROM assets WHERE id = ?').get(r.id)
      if (row) await fs.unlink(resolveStoragePath(row.file_path)).catch(() => {})
      await db.prepare('DELETE FROM assets WHERE id = ?').run(r.id)
    }
    await db.prepare("DELETE FROM operation_logs WHERE JSON_UNQUOTE(JSON_EXTRACT(details, '$.storeId')) = ?").run(storeId)
    await removeStore(storeId)
    await fs.rm(temp, { recursive: true, force: true })
    await db.close()
  })
  await insertStore({ id: storeId, name: 'file-security-test', country: '测试', category: '测试', createdAt: now, updatedAt: now })
  // Only this isolated test server injects identity. Production routes use requireUser.
  const app = express()
  app.post('/upload', secureUpload('assets', { fileSize: 1000000, files: 20 }), completeUpload(async (req, res, next) => {
    req.params.storeId = storeId
    req.user = {}
    await uploadAssets(req, res, next)
  }))
  app.post('/failure', secureUpload('assets', { fileSize: 1000000, files: 20 }), completeUpload(async () => { throw new Error('simulated database failure') }))
  app.get('/file/:id', assetFile)
  app.get('/task-file/:id', taskFile)
  app.get('/unauth/:id', requireUser, assetFile)
  app.use((err, req, res, next) => res.status(err.status || 500).json({ message: 'rejected' }))
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  async function upload(name, mime, bytes, route = '/upload') {
    const data = new FormData()
    data.append('files', new Blob([bytes], { type: mime }), name)
    return fetch(base + route, { method: 'POST', body: data })
  }
  for (const [ext, mime] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp'], ['mp4', 'video/mp4']]) {
    await t.test(`valid ${ext}, preview and range`, async () => {
      const output = path.join(temp, `fixture.${ext}`)
      if (ext === 'webp') await fs.writeFile(output, Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'))
      else execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=64x64:d=1', ...(ext === 'mp4' ? ['-c:v', 'libx264', '-pix_fmt', 'yuv420p'] : ['-frames:v', '1']), output])
      const bytes = await fs.readFile(output)
      const res = await upload(`fixture.${ext}`, mime, bytes)
      assert.equal(res.status, 201, await res.clone().text())
      const record = (await res.json()).data[0]; records.push(record)
      assert.match(record.url, /^\/api\/assets\/[^/]+\/file$/)
      const preview = await fetch(`${base}/file/${record.id}`)
      assert.equal(preview.status, 200)
      assert.equal(preview.headers.get('x-content-type-options'), 'nosniff')
      assert.equal(preview.headers.get('content-type'), mime)
      assert.match(preview.headers.get('cache-control'), /private/)
      assert.deepEqual(Buffer.from(await preview.arrayBuffer()), bytes)
      if (ext === 'mp4') {
        const partial = await fetch(`${base}/file/${record.id}`, { headers: { Range: 'bytes=10-29' } })
        assert.equal(partial.status, 206)
        assert.equal(partial.headers.get('content-range'), `bytes 10-29/${bytes.length}`)
        assert.equal((await partial.arrayBuffer()).byteLength, 20)
      }
    })
  }
  for (const [name, mime] of [['bad.HTML', 'text/html'], ['bad.svg', 'image/svg+xml'], ['bad.js', 'application/javascript'], ['fake.jpg', 'image/jpeg'], ['fake.jpg', 'text/html']]) {
    await t.test(`reject ${name} ${mime}`, async () => assert.equal((await upload(name, mime, '<html><script>alert(1)</script></html>')).status, 400))
  }
  await t.test('unknown id and no session', async () => {
    assert.equal((await fetch(`${base}/file/${randomUUID()}`)).status, 404)
    assert.equal((await fetch(`${base}/unauth/${records[0].id}`)).status, 401)
  })
  await t.test('path traversal', () => {
    for (const value of ['../secret', '/storage/../secret', '/etc/passwd', '/storage/assets/../../secret']) assert.throws(() => resolveStoragePath(value))
  })
  await t.test('historical task files remain readable', async () => {
    const rows = await db.prepare('SELECT f.id FROM task_files f JOIN stores s ON s.id = f.store_id WHERE s.deleted_at IS NULL').all()
    for (const row of rows) {
      const response = await fetch(`${base}/task-file/${row.id}`)
      assert.equal(response.status, 200)
      await response.arrayBuffer()
    }
  })
  await t.test('trashed assets cannot be read', async () => {
    await db.prepare('UPDATE assets SET deleted_at = ? WHERE id = ?').run(now, records[0].id)
    assert.equal((await fetch(`${base}/file/${records[0].id}`)).status, 404)
  })
  await t.test('failed database work cleans moved files', async () => {
    const before = await fs.readdir(path.join(storageRoot, 'assets'))
    assert.equal((await upload('ok.png', 'image/png', await fs.readFile(path.join(temp, 'fixture.png')), '/failure')).status, 500)
    // Wait for the completed controller's asynchronous filesystem cleanup.
    for (let i = 0; i < 20; i++) {
      const after = await fs.readdir(path.join(storageRoot, 'assets'))
      if (after.length === before.length) { assert.deepEqual(after.sort(), before.sort()); return }
      await new Promise(resolve => setTimeout(resolve, 10))
    }
    assert.fail('orphan upload remained')
  })
})
