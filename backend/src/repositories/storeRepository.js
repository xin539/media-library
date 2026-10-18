import { db } from '../db.js'

// Repository 只负责 SQL，不处理 HTTP 请求。
const selectFields = `
  id,
  name,
  avatar_path AS avatarPath,
  country,
  category,
  created_at AS createdAt,
  updated_at AS updatedAt,
  deleted_at AS deletedAt
`

const findAllStatement = db.prepare(`
  SELECT ${selectFields}
  FROM stores
  ORDER BY updated_at DESC
`)

const findByIdStatement = db.prepare(`
  SELECT ${selectFields}
  FROM stores
  WHERE id = ?
`)

const createStatement = db.prepare(`
  INSERT INTO stores (
    id, name, avatar_path, country, category, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const updateStatement = db.prepare(`
  UPDATE stores
  SET name = ?, avatar_path = ?, country = ?, category = ?, updated_at = ?
  WHERE id = ?
`)

const trashStatement = db.prepare('UPDATE stores SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL')
const restoreStatement = db.prepare('UPDATE stores SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL')
const deleteStatement = db.prepare('DELETE FROM stores WHERE id = ?')
const updateAvatarStatement = db.prepare('UPDATE stores SET avatar_path = ?, updated_at = ? WHERE id = ?')

export async function findAllStores() {
  return (await findAllStatement.all())
}

export async function findStoreById(id) {
  return (await findByIdStatement.get(id))
}

export async function insertStore(store) {
  ;(await createStatement.run(
    store.id,
    store.name,
    store.avatarPath,
    store.country,
    store.category,
    store.createdAt,
    store.updatedAt
  ))
  return (await findStoreById(store.id))
}

export async function updateStore(id, store) {
  const result = (await updateStatement.run(
    store.name,
    store.avatarPath,
    store.country,
    store.category,
    store.updatedAt,
    id
  ))
  return result.changes ? (await findStoreById(id)) : null
}

export async function removeStore(id) {
  return (await deleteStatement.run(id)).changes > 0
}

export async function trashStore(id, deletedAt) {
  return (await trashStatement.run(deletedAt, deletedAt, id)).changes > 0
}

export async function restoreStore(id, updatedAt) {
  const result = (await restoreStatement.run(updatedAt, id))
  return result.changes ? (await findStoreById(id)) : null
}

export async function updateStoreAvatar(id, avatarPath, updatedAt) {
  const result = (await updateAvatarStatement.run(avatarPath, updatedAt, id))
  return result.changes ? (await findStoreById(id)) : null
}
