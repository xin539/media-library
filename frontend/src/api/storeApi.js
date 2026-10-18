import { request } from './request.js'

// 查询全部店铺。
export function getStores() {
  return request.get('/stores')
}

// 查询单个店铺。
export function getStore(id) {
  return request.get(`/stores/${id}`)
}

// 创建店铺。
export function createStore(data) {
  return request.post('/stores', data)
}

// 修改店铺。
export function updateStore(id, data) {
  return request.put(`/stores/${id}`, data)
}

// 删除店铺。
export function deleteStore(id) {
  return request.delete(`/stores/${id}`)
}

export function restoreStore(id) {
  return request.patch(`/stores/${id}/restore`)
}

export function permanentlyDeleteStore(id, password) {
  return request.delete(`/stores/${id}/permanent`, { data: { password } })
}

export function getAssets() {
  return request.get('/assets')
}

export function uploadAssets(storeId, files) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  formData.append('paths', JSON.stringify(files.map((file) => file.relativePath || file.webkitRelativePath || file.name)))
  return request.post(`/assets/stores/${storeId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 0
  })
}

export function getTaskFiles() {
  return request.get('/task-files')
}

export function uploadTaskFiles(storeId, files, taskId = null, purpose = 'reference', uploadGroup = {}) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  if (taskId) formData.append('taskId', taskId)
  formData.append('purpose', purpose)
  formData.append('paths', JSON.stringify(files.map((file) => file.relativePath || file.webkitRelativePath || file.name)))
  if (uploadGroup.batch) formData.append('uploadBatch', uploadGroup.batch)
  if (uploadGroup.label) formData.append('uploadLabel', uploadGroup.label)
  return request.post(`/task-files/stores/${storeId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 0 })
}

export function deleteTaskFile(id) {
  return request.delete(`/task-files/${id}`)
}

export const getTasks = () => request.get('/tasks')
export const createTask = (data) => request.post('/tasks', data)
export const claimTask = (id) => request.patch(`/tasks/${id}/claim`)
export const updateTaskProgress = (id, progress) => request.patch(`/tasks/${id}/progress`, { progress })
export const submitTask = (id) => request.patch(`/tasks/${id}/submit`)
export const reviewTask = (id, approved, note = '') => request.patch(`/tasks/${id}/review`, { approved, note })

export function renameAssetFolder(storeId, oldName, newName) {
  return request.patch(`/assets/stores/${storeId}/folders`, { oldName, newName })
}

export function setStoreCover(storeId, assetId) {
  return request.patch(`/assets/stores/${storeId}/cover/${assetId}`)
}

export function getOperationLogs() {
  return request.get('/logs')
}

export function getCurrentUser() {
  return request.get('/auth/me')
}

export function downloadAssets(ids) {
  return request.post('/assets/download', { ids }, { responseType: 'blob' })
}
export const downloadAsset = (id) => request.get(`/assets/${id}/download`, { responseType: 'blob' })
export const downloadTaskFile = (id) => request.get(`/task-files/${id}/download`, { responseType: 'blob' })
export const downloadTaskFiles = (ids) => request.post('/task-files/download', { ids }, { responseType: 'blob' })
export const renameTaskFile = (id, name) => request.patch(`/task-files/${id}`, { name })
export const renameTaskBatch = (storeId, batch, name) => request.patch(`/task-files/stores/${storeId}/batches/${encodeURIComponent(batch)}`, { name })

export function downloadFolder(storeId, folderName) {
  return request.post('/assets/download', { storeId, folderName }, { responseType: 'blob' })
}

export function permanentlyDeleteAsset(id, password) {
  return request.delete(`/assets/${id}/permanent`, { data: { password } })
}

export const moveAssetToTrash = (id) => request.patch(`/assets/${id}/trash`)
export const restoreAsset = (id) => request.patch(`/assets/${id}/restore`)

export function registerUser(data) {
  return request.post('/auth/register', data)
}

export function loginUser(data) {
  return request.post('/auth/login', data)
}

export const getMembers = () => request.get('/auth/members')
export const updateMemberRole = (id, role) => request.patch(`/auth/members/${id}/role`, { role })
