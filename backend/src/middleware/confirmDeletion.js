import { timingSafeEqual } from 'node:crypto'
import { db } from '../db.js'
import { hashPassword } from '../controllers/authController.js'

const attempts = new Map()
const windowMs = 15 * 60 * 1000

// Reuse the current account's scrypt format; no shared password or fallback.
export async function confirmDeletion(request, response, next) {
  try {
    if (!request.user) return response.status(401).json({ message: '请先登录。' })
    const user = await db.prepare('SELECT id, username, role, password_hash AS passwordHash FROM users WHERE id = ?').get(request.user.id)
    if (!user || !['owner', 'admin'].includes(user.role)) return response.status(403).json({ message: '只有所有者或管理员可以永久删除。' })
    const now = Date.now()
    for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id)
    const entry = attempts.get(user.id) || { count: 0, until: now + windowMs }
    if (entry.count >= 5) {
      response.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)))
      return response.status(429).json({ message: '验证尝试过多，请稍后再试。' })
    }
    entry.count++
    attempts.set(user.id, entry)
    const password = request.body?.password
    // Never forward the submitted secret to controllers or operation logs.
    if (request.body) delete request.body.password
    if (typeof password !== 'string' || !password.length || password.length > 4096 || !user.username || !/^[0-9a-f]{128}$/i.test(user.passwordHash || '')) {
      return response.status(403).json({ message: '当前账号密码验证失败。' })
    }
    const candidate = await hashPassword(password, user.username)
    if (!timingSafeEqual(candidate, Buffer.from(user.passwordHash, 'hex'))) return response.status(403).json({ message: '当前账号密码验证失败。' })
    attempts.delete(user.id)
    next()
  } catch (_error) {
    next(Object.assign(new Error('无法完成账号验证，请稍后重试。'), { status: 500 }))
  }
}
