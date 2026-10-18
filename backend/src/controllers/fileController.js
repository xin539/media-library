import fs from 'node:fs/promises'
import { findAssetById } from '../repositories/assetRepository.js'
import { findTaskFileById } from '../repositories/taskFileRepository.js'
import { findStoreById } from '../repositories/storeRepository.js'
import { findTaskById } from '../repositories/taskRepository.js'
import { db } from '../db.js'
import { resolveStoragePath } from '../storagePath.js'
import { readableType } from '../filePolicy.js'

export async function assertReadable(record) {
  const store = record && await findStoreById(record.storeId)
  if (!record || record.deletedAt || !store || store.deletedAt) throw Object.assign(new Error('素材不存在。'), { status: 404 })
  // Existing business policy: all authenticated workspace members share active stores.
  return record
}
export async function sendControlledFile(request, response, next, record, download = false) {
  try {
    await assertReadable(record)
    const diskPath = resolveStoragePath(record.filePath)
    const stat = await fs.stat(diskPath).catch(() => null)
    if (!stat?.isFile()) return response.status(404).json({ message: '素材文件不存在。' })
    const mime = await readableType(diskPath)
    response.set({
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
      'Content-Security-Policy': "sandbox; default-src 'none'",
      'Content-Type': mime || 'application/octet-stream'
    })
    response.attachment(String(record.name || 'download').replace(/[\r\n\\/]/g, '_'))
    response.set('Content-Type', mime || 'application/octet-stream')
    if (mime && !download) response.set('Content-Disposition', 'inline')
    response.sendFile(diskPath, { acceptRanges: true, cacheControl: false, lastModified: false }, error => {
      if (!error) return
      if (response.headersSent) return response.destroy()
      response.status(error.status === 416 ? 416 : 404).json({ message: '无法读取文件。' })
    })
  } catch (error) { next(error) }
}
export async function assetFile(request, response, next) {
  if (!/^[a-f0-9-]{36}$/i.test(request.params.id)) return response.status(404).json({ message: '素材不存在。' })
  try { return await sendControlledFile(request, response, next, await findAssetById(request.params.id)) } catch (e) { next(e) }
}
export async function taskFile(request, response, next) {
  if (!/^[a-f0-9-]{36}$/i.test(request.params.id)) return response.status(404).json({ message: '素材不存在。' })
  try { return await sendControlledFile(request, response, next, await findTaskFileById(request.params.id)) } catch (e) { next(e) }
}
// Compatibility for DB-backed historical cover/product-image URLs; never accept a path from a request.
async function linkedRecord(value) {
  if (!value) return null
  let pathname
  try { pathname = new URL(value, 'http://local').pathname } catch { return null }
  const api = pathname.match(/^\/api\/(assets|task-files)\/([^/]+)\/file$/)
  if (api) return api[1] === 'assets' ? findAssetById(api[2]) : findTaskFileById(api[2])
  if (!pathname.startsWith('/storage/')) return null
  const asset = await db.prepare('SELECT id FROM assets WHERE file_path = ?').get(pathname)
  if (asset) return findAssetById(asset.id)
  const file = await db.prepare('SELECT id FROM task_files WHERE file_path = ?').get(pathname)
  return file ? findTaskFileById(file.id) : null
}
export async function storeCover(request, response, next) {
  try {
    const store = await findStoreById(request.params.storeId)
    const record = store && !store.deletedAt && await linkedRecord(store.avatarPath)
    if (!record || record.storeId !== store.id) return response.status(404).json({ message: '封面不存在。' })
    return sendControlledFile(request, response, next, record)
  } catch (e) { next(e) }
}
export async function taskImage(request, response, next) {
  try {
    const task = await findTaskById(request.params.taskId)
    const record = task && await linkedRecord(task.productImageUrl)
    if (!record || record.storeId !== task.storeId) return response.status(404).json({ message: '任务图片不存在。' })
    return sendControlledFile(request, response, next, record)
  } catch (e) { next(e) }
}
