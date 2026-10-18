import { randomUUID } from 'node:crypto'
import { findStoreById } from '../repositories/storeRepository.js'
import { claimTask, findAllTasks, findTaskById, insertTask, reviewTask, submitTask, updateTaskProgress } from '../repositories/taskRepository.js'
import { createOperationLog } from '../repositories/logRepository.js'
import { hasTaskResultFiles } from '../repositories/taskFileRepository.js'

function portableStorageUrl(value) {
  if (!value) return null
  if (String(value).startsWith('/storage/')) return String(value)
  try {
    const parsed = new URL(String(value))
    return parsed.pathname.startsWith('/storage/') ? parsed.pathname : String(value)
  } catch {
    return String(value)
  }
}
const portableTask = (task) => ({ ...task, productImageUrl: portableStorageUrl(task.productImageUrl) })

export const listTasks = async (request, response) => {
  const tasks = (await findAllTasks()).map(portableTask)
  response.json({ data: tasks })
}
export async function createTask(request, response) {
  const title = String(request.body?.title || '').trim()
  const store = (await findStoreById(request.body?.storeId))
  if (!title || !store || store.deletedAt) return response.status(400).json({ message: '请选择店铺并填写任务名称。' })
  const now = new Date().toISOString()
  const task = (await insertTask({
    id: randomUUID(), storeId: store.id, title,
    description: String(request.body?.description || '').trim(),
    priority: request.body?.priority === 'urgent' ? 'urgent' : 'normal',
    deadline: request.body?.deadline || null, creatorId: request.user.id, createdAt: now,
    productCode: String(request.body?.productCode || '').trim() || null,
    productName: String(request.body?.productName || title).trim(),
    productImageUrl: portableStorageUrl(String(request.body?.productImageUrl || '').trim()),
    skuText: String(request.body?.skuText || '').trim() || null
  }))
  ;(await createOperationLog({ userId: request.user.id, action: 'create', targetType: 'task', targetId: task.id, details: { name: task.title } }))
  response.status(201).json({ data: task })
}
export async function takeTask(request, response) {
  if (!(await claimTask(request.params.id, request.user.id, new Date().toISOString()))) return response.status(409).json({ message: '任务已被领取或不存在。' })
  const task = (await findTaskById(request.params.id))
  ;(await createOperationLog({ userId: request.user.id, action: 'claim', targetType: 'task', targetId: task.id, details: { name: task.title, storeId: task.storeId } }))
  response.json({ data: task })
}
export async function setTaskProgress(request, response) {
  const progress = Math.max(10, Math.min(95, Number(request.body?.progress) || 10))
  if (!(await updateTaskProgress(request.params.id, request.user.id, progress, new Date().toISOString()))) return response.status(403).json({ message: '只能更新自己领取的任务。' })
  const task = (await findTaskById(request.params.id))
  ;(await createOperationLog({ userId: request.user.id, action: 'progress', targetType: 'task', targetId: task.id, details: { name: task.title, progress, storeId: task.storeId } }))
  response.json({ data: task })
}

export async function submitForReview(request, response) {
  const now = new Date().toISOString()
  if (!(await hasTaskResultFiles(request.params.id))) return response.status(400).json({ message: '请先上传至少一个成品文件，再提交自检。' })
  if (!(await submitTask(request.params.id, request.user.id, now))) return response.status(403).json({ message: '只能提交自己正在制作或返修的任务。' })
  const task = (await findTaskById(request.params.id))
  ;(await createOperationLog({ userId: request.user.id, action: 'submit', targetType: 'task', targetId: task.id, details: { name: task.title, storeId: task.storeId } }))
  response.json({ data: task })
}

export async function reviewSubmittedTask(request, response) {
  const existing = (await findTaskById(request.params.id))
  if (!existing) return response.status(404).json({ message: '任务不存在。' })
  if (existing.assigneeId !== request.user.id) return response.status(403).json({ message: '只能由领取该任务的美工本人完成自检。' })
  const approved = request.body?.approved === true
  const note = String(request.body?.note || '').trim()
  const status = approved ? 'completed' : 'revision'
  if (!(await reviewTask(request.params.id, status, note || null, new Date().toISOString()))) return response.status(409).json({ message: '任务不在待审核状态。' })
  const task = (await findTaskById(request.params.id))
  ;(await createOperationLog({ userId: request.user.id, action: approved ? 'self_approve' : 'self_revision', targetType: 'task', targetId: task.id, details: { name: task.title, note, storeId: task.storeId } }))
  response.json({ data: task })
}
