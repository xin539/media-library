import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { storageRoot } from '../storagePath.js'
import { declaredType, verifyFile } from '../filePolicy.js'

// Both staging and final files are outside the web root. Each request owns its staging directory.
export function secureUpload(kind, { documents = false, fileSize, files }) {
  return async (request, response, next) => {
    let temp
    const moved = []
    try {
      const staging = path.join(storageRoot, '.staging')
      await fs.mkdir(staging, { recursive: true })
      temp = await fs.mkdtemp(path.join(staging, 'upload-'))
      const cleanup = async () => {
        await fs.rm(temp, { recursive: true, force: true }).catch(() => {})
        if (!request.uploadCommitted) await Promise.all(moved.map(p => fs.unlink(p).catch(() => {})))
      }
      response.once('finish', () => { void cleanup() })
      request.cleanupUpload = cleanup
      const parser = multer({
        storage: multer.diskStorage({ destination: temp, filename: (_req, _file, cb) => cb(null, randomUUID()) }),
        limits: { files, fileSize, fieldSize: 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const name = file.originalname.replaceAll('\\', '/').split('/').pop()
          if (name.startsWith('._') || name === '.DS_Store') return cb(null, false)
          try { declaredType(file, documents); cb(null, true) } catch (e) { cb(e) }
        }
      }).array('files', files)
      await new Promise((resolve, reject) => parser(request, response, e => e ? reject(e) : resolve()))
      const validated = []
      for (const file of request.files || []) validated.push(await verifyFile(file, documents))
      await fs.mkdir(path.join(storageRoot, kind), { recursive: true })
      for (const [i, file] of (request.files || []).entries()) {
        file.filename = randomUUID() + validated[i].ext
        const destination = path.join(storageRoot, kind, file.filename)
        await fs.rename(file.path, destination)
        moved.push(destination)
        file.path = destination
        file.mimetype = validated[i].mime
      }
      await fs.rm(temp, { recursive: true, force: true })
      next()
    } catch (error) {
      if (temp) await fs.rm(temp, { recursive: true, force: true }).catch(() => {})
      await Promise.all(moved.map(p => fs.unlink(p).catch(() => {})))
      if (error.code === 'LIMIT_FILE_SIZE') return next(Object.assign(new Error('文件过大。'), { status: 413 }))
      if (error instanceof multer.MulterError) return next(Object.assign(new Error('上传文件数量或表单超出限制。'), { status: 400 }))
      next(error)
    }
  }
}

// Run cleanup after database work settles, including when the client has disconnected.
export function completeUpload(handler) {
  return async (request, response, next) => {
    try { await handler(request, response, next) }
    catch (error) { next(error) }
    finally { await request.cleanupUpload?.() }
  }
}
