import { db } from '../db.js'

const selectFields = `
  id,
  store_id AS storeId,
  name,
  type,
  size,
  file_path AS filePath,
  created_at AS createdAt,
  deleted_at AS deletedAt
  , uploader_id AS uploaderId
  , relative_path AS relativePath
`

const findAllStatement = db.prepare(`
  SELECT ${selectFields} FROM assets ORDER BY created_at DESC
`)
const createStatement = db.prepare(`
  INSERT INTO assets (id, store_id, name, type, size, file_path, created_at, uploader_id, relative_path)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`)
const renameFolderStatement = db.prepare(`
  UPDATE assets
  SET relative_path = CONCAT(?, SUBSTRING(relative_path, CHAR_LENGTH(?) + 1))
  WHERE store_id = ? AND relative_path LIKE ?
`)
const findByIdsStatement = db.prepare(`
  SELECT id, store_id AS storeId, deleted_at AS deletedAt, name, file_path AS filePath FROM assets
  WHERE id IN (SELECT value FROM JSON_TABLE(?, '$[*]' COLUMNS(value VARCHAR(255) PATH '$')) AS selected_ids) AND deleted_at IS NULL
`)
const findByFolderStatement = db.prepare(`
  SELECT id, store_id AS storeId, deleted_at AS deletedAt, name, file_path AS filePath, relative_path AS relativePath
  FROM assets WHERE store_id = ? AND relative_path LIKE ? AND deleted_at IS NULL
`)
const findByIdStatement = db.prepare(`SELECT ${selectFields} FROM assets WHERE id = ?`)
const deleteStatement = db.prepare('DELETE FROM assets WHERE id = ?')
const trashStatement = db.prepare('UPDATE assets SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL')
const restoreStatement = db.prepare('UPDATE assets SET deleted_at = NULL WHERE id = ? AND deleted_at IS NOT NULL')

function decodeFilename(name) {
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\ufffd') ? name : decoded
}

function formatAsset(asset) {
  return { ...asset, name: decodeFilename(asset.name) }
}

export async function findAllAssets() {
  return (await findAllStatement.all()).map(formatAsset)
}

export async function insertAsset(asset) {
  ;(await createStatement.run(
    asset.id, asset.storeId, asset.name, asset.type,
    asset.size, asset.filePath, asset.createdAt, asset.uploaderId || null, asset.relativePath || null
  ))
  return formatAsset(asset)
}

export async function renameFolder(storeId, oldName, newName) {
  const result = (await renameFolderStatement.run(newName, oldName, storeId, `${oldName}/%`))
  return result.changes
}

export async function findAssetsByIds(ids) {
  return (await findByIdsStatement.all(JSON.stringify(ids)))
}

export async function findAssetsByFolder(storeId, folderName) {
  return (await findByFolderStatement.all(storeId, `${folderName}/%`))
}

export async function findAssetById(id) {
  const asset = (await findByIdStatement.get(id))
  return asset ? formatAsset(asset) : undefined
}

export const trashAsset = async (id, deletedAt) => (await trashStatement.run(deletedAt, id)).changes > 0
export const restoreAsset = async (id) => (await restoreStatement.run(id)).changes > 0

export async function removeAsset(id) {
  return (await deleteStatement.run(id)).changes > 0
}
