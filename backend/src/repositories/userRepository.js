import { db } from '../db.js'

const findByOpenidStatement = db.prepare(`
  SELECT id, openid, nickname, avatar_url AS avatarUrl, role FROM users WHERE openid = ?
`)
const findByUsernameStatement = db.prepare(`
  SELECT id, username, nickname, avatar_url AS avatarUrl, password_hash AS passwordHash, role
  FROM users WHERE username = ?
`)
const createStatement = db.prepare(`
  INSERT INTO users (id, openid, nickname, avatar_url, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
`)
const createLocalStatement = db.prepare(`
  INSERT INTO users (id, openid, username, nickname, avatar_url, password_hash, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
const countAdminsStatement = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role IN ('owner', 'admin')")
const setRoleStatement = db.prepare('UPDATE users SET role = ? WHERE id = ?')
const listUsersStatement = db.prepare(`SELECT id, username, nickname, avatar_url AS avatarUrl, role, created_at AS createdAt FROM users ORDER BY created_at ASC`)
const updateStatement = db.prepare(`
  UPDATE users SET nickname = ?, avatar_url = ?, updated_at = ? WHERE openid = ?
`)
const createSessionStatement = db.prepare(`
  INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)
`)
const findSessionStatement = db.prepare(`
  SELECT users.id, users.openid, users.username, users.nickname, users.avatar_url AS avatarUrl, users.role
  FROM sessions JOIN users ON users.id = sessions.user_id
  WHERE sessions.token = ? AND sessions.expires_at > ?
`)

export async function createLocalUser({ id, username, nickname, avatarUrl, passwordHash }) {
  const now = new Date().toISOString()
  ;(await createLocalStatement.run(id, `local:${id}`, username, nickname, avatarUrl || null, passwordHash, now, now))
  if ((await countAdminsStatement.get()).count === 0) await setRoleStatement.run('owner', id)
  return (await findByUsernameStatement.get(username))
}

export async function findUserByUsername(username) {
  return (await findByUsernameStatement.get(username))
}

export async function saveWechatUser(user) {
  const now = new Date().toISOString()
  const existing = (await findByOpenidStatement.get(user.openid))
  if (existing) {
    ;(await updateStatement.run(user.nickname, user.avatarUrl, now, user.openid))
    return { ...existing, nickname: user.nickname, avatarUrl: user.avatarUrl }
  }

  ;(await createStatement.run(user.id, user.openid, user.nickname, user.avatarUrl, now, now))
  if ((await countAdminsStatement.get()).count === 0) await setRoleStatement.run('owner', user.id)
  return (await findByOpenidStatement.get(user.openid))
}

export async function createSession(token, userId, expiresAt) {
  ;(await createSessionStatement.run(token, userId, expiresAt))
}

export async function findUserBySession(token) {
  return (await findSessionStatement.get(token, new Date().toISOString()))
}

export const findAllUsers = async () => (await listUsersStatement.all())
export async function updateUserRole(id, role) {
  return (await setRoleStatement.run(role, id)).changes > 0
}

export async function transferOwnership(id) {
  return db.transaction(async () => {
    ;(await db.exec("UPDATE users SET role = 'admin' WHERE role = 'owner'"))
    const changed = (await setRoleStatement.run('owner', id)).changes > 0
    if (!changed) throw new Error('成员不存在。')
    return true
  })
}
