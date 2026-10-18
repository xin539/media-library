import { db } from '../db.js'

const fields = `t.id, t.store_id AS storeId, t.title, t.description, t.priority, t.status,
  t.progress, t.assignee_id AS assigneeId, t.creator_id AS creatorId, t.deadline,
  t.created_at AS createdAt, t.updated_at AS updatedAt, t.completed_at AS completedAt,
  t.product_code AS productCode, t.product_name AS productName,
  t.product_image_url AS productImageUrl, t.sku_text AS skuText,
  t.review_note AS reviewNote, t.submitted_at AS submittedAt, t.reviewed_at AS reviewedAt,
  u.nickname AS assigneeName, u.avatar_url AS assigneeAvatar, creator.nickname AS creatorName`
const listStatement = db.prepare(`SELECT ${fields} FROM design_tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN users creator ON creator.id = t.creator_id ORDER BY t.created_at DESC`)
const findStatement = db.prepare(`SELECT ${fields} FROM design_tasks t LEFT JOIN users u ON u.id = t.assignee_id LEFT JOIN users creator ON creator.id = t.creator_id WHERE t.id = ?`)
const insertStatement = db.prepare(`INSERT INTO design_tasks
  (id, store_id, title, description, priority, status, progress, creator_id, deadline, created_at, updated_at,
   product_code, product_name, product_image_url, sku_text)
  VALUES (?, ?, ?, ?, ?, 'available', 0, ?, ?, ?, ?, ?, ?, ?, ?)`)
const claimStatement = db.prepare(`UPDATE design_tasks SET status = 'in_progress', assignee_id = ?, progress = 10, updated_at = ? WHERE id = ? AND status = 'available'`)
const progressStatement = db.prepare(`UPDATE design_tasks SET progress = ?, updated_at = ?
  WHERE id = ? AND assignee_id = ? AND status IN ('in_progress', 'revision')`)
const submitStatement = db.prepare(`UPDATE design_tasks SET status = 'submitted', progress = 100, submitted_at = ?, updated_at = ?
  WHERE id = ? AND assignee_id = ? AND status IN ('in_progress', 'revision')`)
const reviewStatement = db.prepare(`UPDATE design_tasks SET status = ?, review_note = ?, reviewed_at = ?, updated_at = ?,
  completed_at = CASE WHEN ? = 'completed' THEN ? ELSE NULL END,
  progress = CASE WHEN ? = 'revision' THEN 90 ELSE 100 END
  WHERE id = ? AND status = 'submitted'`)

export const findAllTasks = async () => (await listStatement.all())
export const findTaskById = async (id) => (await findStatement.get(id))
export async function insertTask(task) {
  ;(await insertStatement.run(task.id, task.storeId, task.title, task.description, task.priority, task.creatorId, task.deadline, task.createdAt, task.createdAt,
    task.productCode, task.productName, task.productImageUrl, task.skuText))
  return (await findTaskById(task.id))
}
export const claimTask = async (id, userId, now) => (await claimStatement.run(userId, now, id)).changes > 0
export const updateTaskProgress = async (id, userId, progress, now) => (await progressStatement.run(progress, now, id, userId)).changes > 0
export const submitTask = async (id, userId, now) => (await submitStatement.run(now, now, id, userId)).changes > 0
export const reviewTask = async (id, status, note, now) => (await reviewStatement.run(status, note, now, now, status, now, status, id)).changes > 0
