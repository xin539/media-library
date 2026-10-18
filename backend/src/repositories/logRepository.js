import { randomUUID } from 'node:crypto'
import { db } from '../db.js'

const createStatement = db.prepare(`
  INSERT INTO operation_logs
    (id, user_id, action, target_type, target_id, details, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)
const findAllStatement = db.prepare(`
  SELECT logs.id, logs.action, logs.target_type AS targetType,
    logs.target_id AS targetId, logs.details, logs.created_at AS createdAt,
    logs.user_id AS userId, users.nickname, users.avatar_url AS avatarUrl
  FROM operation_logs AS logs
  LEFT JOIN users ON users.id = logs.user_id
  ORDER BY logs.created_at DESC
  LIMIT ?
`)

export async function createOperationLog({ userId = null, action, targetType, targetId = null, details = null }) {
  ;(await createStatement.run(
    randomUUID(), userId, action, targetType, targetId,
    details ? JSON.stringify(details) : null, new Date().toISOString()
  ))
}

export async function findOperationLogs(limit = 200) {
  return (await findAllStatement.all(Math.min(Math.max(Number(limit) || 200, 1), 500)))
    .map((log) => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      nickname: log.nickname || '未登录用户'
    }))
}