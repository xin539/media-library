import { db } from '../db.js'
import { sendControlledFile } from './fileController.js'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { resolveStoragePath } from '../storagePath.js'
import { findStoreById } from '../repositories/storeRepository.js'
import { findAllTaskFiles, findTaskFileById, insertTaskFile, removeTaskFile } from '../repositories/taskFileRepository.js'
import { createOperationLog } from '../repositories/logRepository.js'
import { findTaskById } from '../repositories/taskRepository.js'

const decodeName = (name) => {
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\ufffd') ? name : decoded
}
// 文件地址始终相对于当前访问的服务器，跨电脑访问时不会指向上传者本机。
const withUrl = (_request, file) => ({ ...file, url: `/api/task-files/${file.id}/file`, filePath: `/api/task-files/${file.id}/file` })
const isVisibleFile = (file) => {
  const name = String(file.name || '').replaceAll('\\', '/').split('/').pop()
  return !name.startsWith('._') && name !== '.DS_Store'
}

export async function listTaskFiles(request, response) {
  const files = (await findAllTaskFiles()).filter(isVisibleFile)
  response.json({ data: files.map((file) => withUrl(request, file)) })
}
export async function uploadTaskFiles(request, response) {
  const store = (await findStoreById(request.params.storeId))
  if (!store || store.deletedAt) return response.status(404).json({ message: '店铺不存在。' })
  if (!request.files?.length) return response.status(400).json({ message: '请至少选择一个文件。' })
  const taskId = request.body?.taskId || null
  let task = null
  if (taskId) {
    task = (await findTaskById(taskId))
    if (!task || task.storeId !== store.id) return response.status(400).json({ message: '任务不存在或不属于当前店铺。' })
    if (request.body?.purpose === 'result' && task.assigneeId !== request.user.id) {
      return response.status(403).json({ message: '只能由领取该任务的美工上传成品。' })
    }
  }
  let relativePaths = []
  try { relativePaths = JSON.parse(request.body?.paths || '[]') } catch { relativePaths = [] }
  const productCode = String(task?.productCode || '').trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '')
  const usedNames = new Set(taskId ? (await findAllTaskFiles()).filter(item => item.taskId === taskId).map(item => item.name.toLowerCase()) : [])
  const names = request.files.map(file => {
    const original = decodeName(file.originalname)
    const extension = path.extname(original)
    if (!productCode || !(file.mimetype?.startsWith('image/') || /\.(png|jpe?g|webp|gif|avif|heic|heif|bmp|tiff?)$/i.test(extension))) return original
    let sequence = 1
    let name = `${productCode}-${String(sequence).padStart(2, '0')}${extension}`
    while (usedNames.has(name.toLowerCase())) name = `${productCode}-${String(++sequence).padStart(2, '0')}${extension}`
    usedNames.add(name.toLowerCase())
    return name
  })
  const files = await db.transaction(async () => {
  const created = await Promise.all(request.files.map(async (file, index) => (await insertTaskFile({
    id: randomUUID(), storeId: store.id, taskId, purpose: request.body?.purpose === 'result' ? 'result' : 'reference', name: names[index], mimeType: file.mimetype || null,
    size: file.size, filePath: `/storage/tasks/${file.filename}`, createdAt: new Date().toISOString(), uploaderId: request.user?.id || null,
    relativePath: path.posix.join(path.posix.dirname(String(relativePaths[index] || '').replaceAll('\\', '/')), names[index]), uploadBatch: request.body?.uploadBatch || null, uploadLabel: request.body?.uploadLabel || null
  }))))
  ;(await createOperationLog({ userId: request.user?.id, action: 'upload', targetType: 'task_file', details: { storeId: store.id, count: created.length } }))
  return created
  })
  request.uploadCommitted = true
  response.status(201).json({ data: files.map((file) => withUrl(request, file)) })
}
export async function deleteTaskFile(request, response) {
  const file = (await findTaskFileById(request.params.id))
  if (!file) return response.status(404).json({ message: '文件不存在。' })
  const diskPath = resolveStoragePath(file.filePath)
  if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath)
  ;(await removeTaskFile(file.id))
  response.status(204).end()
}
export async function downloadTaskFile(request, response, next) {
  try { return await sendControlledFile(request, response, next, await findTaskFileById(request.params.id), true) } catch (e) { next(e) }
}
