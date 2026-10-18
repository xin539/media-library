import { db } from '../db.js'

const fields = `id, store_id AS storeId, task_id AS taskId, name, mime_type AS mimeType, size,
  file_path AS filePath, created_at AS createdAt, uploader_id AS uploaderId, purpose,
  relative_path AS relativePath, upload_batch AS uploadBatch, upload_label AS uploadLabel`
const allStatement = db.prepare(`SELECT ${fields} FROM task_files ORDER BY created_at DESC`)
const insertStatement = db.prepare(`INSERT INTO task_files
  (id, store_id, task_id, name, mime_type, size, file_path, created_at, uploader_id, purpose, relative_path, upload_batch, upload_label)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const findStatement = db.prepare(`SELECT ${fields} FROM task_files WHERE id = ?`)
const deleteStatement = db.prepare('DELETE FROM task_files WHERE id = ?')
const resultCountStatement = db.prepare("SELECT COUNT(*) AS count FROM task_files WHERE task_id = ? AND purpose = 'result'")

export const findAllTaskFiles = async () => (await allStatement.all())
export async function insertTaskFile(file) {
  ;(await insertStatement.run(file.id, file.storeId, file.taskId || null, file.name, file.mimeType, file.size, file.filePath, file.createdAt, file.uploaderId, file.purpose || 'reference', file.relativePath || null, file.uploadBatch || null, file.uploadLabel || null))
  return (await findStatement.get(file.id))
}
export const findTaskFileById = async (id) => (await findStatement.get(id))
export const removeTaskFile = async (id) => (await deleteStatement.run(id)).changes > 0
export const hasTaskResultFiles = async (taskId) => (await resultCountStatement.get(taskId)).count > 0
