import { permanentlyDelete } from '../permanentDeletion.js'
import { db } from '../db.js'
import { randomUUID } from 'node:crypto'
import { findAllAssets, findAssetById, insertAsset, renameFolder, restoreAsset, trashAsset } from '../repositories/assetRepository.js'
import { findStoreById } from '../repositories/storeRepository.js'
import { updateStoreAvatar } from '../repositories/storeRepository.js'
import { createOperationLog } from '../repositories/logRepository.js'

function decodeUploadedFilename(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\ufffd') ? name : decoded
}

function withFileUrl(_request, asset) {
  return {
    ...asset,
    // 使用同源相对地址，避免把上传者的 localhost/LAN 地址发给其他设备。
    url: `/api/assets/${asset.id}/file`,
    filePath: `/api/assets/${asset.id}/file`
  }
}

const isVisibleFile = (asset) => !pathBasename(asset.name).startsWith('._') && pathBasename(asset.name) !== '.DS_Store'
const pathBasename = (value = '') => String(value).replaceAll('\\', '/').split('/').pop()

export async function listAssets(request, response) {
  response.json({ data: (await findAllAssets()).filter(isVisibleFile).map((asset) => withFileUrl(request, asset)) })
}

export async function uploadAssets(request, response) {
  const uploadStore = await findStoreById(request.params.storeId)
  if (!uploadStore || uploadStore.deletedAt) {
    return response.status(404).json({ message: '店铺不存在。' })
  }

  const files = request.files || []
  if (!files.length) {
    return response.status(400).json({ message: '请至少上传一个图片或视频文件。' })
  }

  let relativePaths = []
  try { relativePaths = JSON.parse(request.body.paths || '[]') } catch { relativePaths = [] }
  const assets = await db.transaction(async () => {
  const created = await Promise.all(files.map(async (file, index) => (await insertAsset({
    id: randomUUID(),
    storeId: request.params.storeId,
    name: decodeUploadedFilename(file.originalname),
    type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    size: file.size,
    filePath: `/storage/assets/${file.filename}`,
    createdAt: new Date().toISOString(),
    uploaderId: request.user?.id || null,
    relativePath: relativePaths[index] || file.originalname
  }))))
  ;(await createOperationLog({
    userId: request.user?.id,
    action: 'upload',
    targetType: 'asset',
    details: { storeId: request.params.storeId, count: created.length, names: created.map((asset) => asset.name) }
  }))

  return created
  })
  request.uploadCommitted = true
  response.status(201).json({ data: assets.map((asset) => withFileUrl(request, asset)) })
}

export async function renameAssetFolder(request, response) {
  const oldName = String(request.body?.oldName || '').trim()
  const newName = String(request.body?.newName || '').trim()
  if (!oldName || !newName || oldName.includes('/') || newName.includes('/')) {
    return response.status(400).json({ message: '文件夹名称不能为空且不能包含斜杠。' })
  }
  if (!(await findStoreById(request.params.storeId))) {
    return response.status(404).json({ message: '店铺不存在。' })
  }
  if (oldName === newName) return response.json({ data: { oldName, newName, count: 0 } })

  const count = (await renameFolder(request.params.storeId, oldName, newName))
  ;(await createOperationLog({
    userId: request.user?.id,
    action: 'rename',
    targetType: 'folder',
    details: { storeId: request.params.storeId, oldName, newName, count }
  }))
  response.json({ data: { oldName, newName, count } })
}

export async function moveAssetToTrash(request, response) {
  const asset = (await findAssetById(request.params.id))
  if (!asset || asset.deletedAt) {
    return response.status(404).json({ message: '素材不存在或已在回收站中。' })
  }
  const deletedAt = new Date().toISOString()
  if (!(await trashAsset(request.params.id, deletedAt))) {
    return response.status(404).json({ message: '素材不存在或已在回收站中。' })
  }
  ;(await createOperationLog({ userId: request.user.id, action: 'delete', targetType: 'asset', targetId: request.params.id }))
  response.json({ data: { id: request.params.id, deletedAt } })
}

export async function restoreDeletedAsset(request, response) {
  if (!(await restoreAsset(request.params.id))) {
    return response.status(404).json({ message: '回收站中没有该素材。' })
  }
  const asset = (await findAssetById(request.params.id))
  ;(await createOperationLog({ userId: request.user.id, action: 'restore', targetType: 'asset', targetId: asset.id, details: { name: asset.name } }))
  response.json({ data: withFileUrl(request, asset) })
}

export async function permanentlyDeleteAsset(request, response, next) {
  try {
    await permanentlyDelete('asset', request.params.id, request.user.id)
    response.status(204).end()
  } catch (error) { next(error) }
}

export async function setStoreCover(request, response) {
  const asset = (await findAssetById(request.params.assetId))
  if (!asset || asset.type !== 'image' || asset.storeId !== request.params.storeId) {
    return response.status(404).json({ message: '图片不存在或不属于该店铺。' })
  }
  const store = (await updateStoreAvatar(request.params.storeId, asset.filePath, new Date().toISOString()))
  if (!store) return response.status(404).json({ message: '店铺不存在。' })
  ;(await createOperationLog({ userId: request.user?.id, action: 'set_cover', targetType: 'store', targetId: store.id, details: { assetId: asset.id, name: asset.name } }))
  response.json({ data: store })
}
