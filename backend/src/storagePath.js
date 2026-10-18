import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

export const storageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../storage')

// 数据库存储的是 /storage/... URL；磁盘路径必须基于项目目录，不能依赖启动命令的 cwd。
export function resolveStoragePath(filePath) {
  const value = String(filePath || '')
  const relativePath = value.replace(/^\/storage\//, '')
  if (!relativePath || relativePath.includes('\\') || relativePath.includes('\0') || relativePath.split('/').includes('..') || path.isAbsolute(relativePath)) {
    throw Object.assign(new Error('文件路径无效。'), { status: 400 })
  }
  const resolved = path.resolve(storageRoot, relativePath)
  const inside = candidate => candidate.startsWith(storageRoot + path.sep)
  if (!inside(resolved) || (fs.existsSync(resolved) && !inside(fs.realpathSync(resolved)))) {
    throw Object.assign(new Error('文件路径无效。'), { status: 400 })
  }
  return resolved
}
