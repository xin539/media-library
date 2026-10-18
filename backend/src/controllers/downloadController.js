import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { findAssetById, findAssetsByFolder, findAssetsByIds } from '../repositories/assetRepository.js'
import { createOperationLog } from '../repositories/logRepository.js'
import { resolveStoragePath } from '../storagePath.js'
import { assertReadable, sendControlledFile } from './fileController.js'

const require = createRequire(import.meta.url)
const archiver = require('archiver')

export async function downloadAssets(request, response, next) {
  try {
    const ids = Array.isArray(request.body?.ids) ? request.body.ids.slice(0, 500) : []
    const assets = ids.length
      ? (await findAssetsByIds(ids))
      : (await findAssetsByFolder(request.body?.storeId, String(request.body?.folderName || '')))
    if (!assets.length) return response.status(400).json({ message: '请至少选择一个文件。' })
    await Promise.all(assets.map(assertReadable))

    response.attachment('media-library-download.zip')
    response.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Security-Policy': "sandbox; default-src 'none'" })
    const archive = archiver('zip', { zlib: { level: 6 } })
    archive.on('error', next)
    archive.pipe(response)

    const usedNames = new Set()
    assets.forEach((asset) => {
      const filePath = resolveStoragePath(asset.filePath)
      if (!fs.existsSync(filePath)) return
      let name = asset.name
      let suffix = 1
      while (usedNames.has(name)) name = `${path.parse(asset.name).name} (${suffix++})${path.extname(asset.name)}`
      usedNames.add(name)
      const archiveName = String(asset.relativePath || name).replaceAll('\\', '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
      archive.file(filePath, { name: archiveName })
    })
    ;(await createOperationLog({ userId: request.user?.id, action: 'download', targetType: 'asset', details: { count: assets.length } }))
    archive.finalize()
  } catch (error) {
    next(error)
  }
}

export async function downloadSingleAsset(request, response, next) {
  try {
    const asset = (await findAssetById(request.params.id))
    if (!asset || asset.deletedAt) return response.status(404).json({ message: '文件不存在。' })
    const filePath = resolveStoragePath(asset.filePath)
    if (!fs.existsSync(filePath)) return response.status(404).json({ message: '磁盘文件不存在。' })
    ;(await createOperationLog({ userId: request.user.id, action: 'download', targetType: 'asset', targetId: asset.id, details: { name: asset.name, storeId: asset.storeId } }))
    await sendControlledFile(request, response, next, asset, true)
  } catch (error) { next(error) }
}
