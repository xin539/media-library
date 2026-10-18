import { permanentlyDelete } from '../permanentDeletion.js'
import { randomUUID } from 'node:crypto'
import {
  findAllStores,
  findStoreById,
  insertStore,
  restoreStore,
  trashStore,
  updateStore
} from '../repositories/storeRepository.js'
import { createOperationLog } from '../repositories/logRepository.js'

// 清理和验证用户输入，避免把无效数据写入数据库。
function readStoreInput(body = {}) {
  const store = {
    name: String(body.name || '').trim(),
    avatarPath: body.avatarPath ? String(body.avatarPath) : null,
    country: String(body.country || '').trim(),
    category: String(body.category || '').trim()
  }

  if (!store.name || !store.country || !store.category) {
    const error = new Error('店铺名称、国家和类别不能为空。')
    error.status = 400
    throw error
  }

  return store
}

export async function listStores(_request, response) {
  response.json({ data: (await findAllStores()) })
}

export async function getStore(request, response) {
  const store = (await findStoreById(request.params.id))
  if (!store) return response.status(404).json({ message: '店铺不存在。' })
  response.json({ data: store })
}

export async function createStore(request, response) {
  const input = readStoreInput(request.body)
  const now = new Date().toISOString()
  const store = (await insertStore({ id: randomUUID(), ...input, createdAt: now, updatedAt: now }))
  ;(await createOperationLog({ userId: request.user?.id, action: 'create', targetType: 'store', targetId: store.id, details: { name: store.name } }))
  response.status(201).json({ data: store })
}

export async function editStore(request, response) {
  const input = readStoreInput(request.body)
  const store = (await updateStore(request.params.id, { ...input, updatedAt: new Date().toISOString() }))
  if (!store) return response.status(404).json({ message: '店铺不存在。' })
  ;(await createOperationLog({ userId: request.user?.id, action: 'update', targetType: 'store', targetId: store.id, details: { name: store.name } }))
  response.json({ data: store })
}

export async function deleteStore(request, response) {
  const deletedAt = new Date().toISOString()
  if (!(await trashStore(request.params.id, deletedAt))) {
    return response.status(404).json({ message: '店铺不存在。' })
  }
  ;(await createOperationLog({ userId: request.user?.id, action: 'delete', targetType: 'store', targetId: request.params.id }))
  response.json({ data: { id: request.params.id, deletedAt } })
}

export async function restoreDeletedStore(request, response) {
  const store = (await restoreStore(request.params.id, new Date().toISOString()))
  if (!store) return response.status(404).json({ message: '回收站中没有该店铺。' })
  ;(await createOperationLog({ userId: request.user?.id, action: 'restore', targetType: 'store', targetId: store.id, details: { name: store.name } }))
  response.json({ data: store })
}

export async function permanentlyDeleteStore(request, response, next) {
  try {
    await permanentlyDelete('store', request.params.id, request.user.id)
    response.status(204).end()
  } catch (error) { next(error) }
}
