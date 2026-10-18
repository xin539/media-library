import fs from 'node:fs/promises'
import path from 'node:path'
import { db } from './db.js'
import { storageRoot, resolveStoragePath } from './storagePath.js'
import { createOperationLog } from './repositories/logRepository.js'

const fail = (message, status) => Object.assign(new Error(message), { status })

// Files and MySQL cannot share a transaction. Move files into a private quarantine
// first, restore them on rollback, and physically remove them only after commit.
export async function permanentlyDelete(kind, id, userId) {
  if (!['asset', 'store'].includes(kind)) throw fail('删除对象无效。', 400)
  const table = kind === 'asset' ? 'assets' : 'stores'
  const moved = []
  let job
  let committed = false
  try {
    await db.transaction(async () => {
      const target = await db.prepare(`SELECT * FROM ${table} WHERE id = ? FOR UPDATE`).get(id)
      if (!target) throw fail('删除对象不存在。', 404)
      if (!target.deleted_at) throw fail('请先将该对象移入回收站。', 400)
      const files = kind === 'asset' ? [target] : await db.prepare('SELECT file_path FROM assets WHERE store_id = ? UNION ALL SELECT file_path FROM task_files WHERE store_id = ?').all(id, id)
      const root = path.join(storageRoot, '.purge')
      await fs.mkdir(root, { recursive: true })
      job = await fs.mkdtemp(path.join(root, 'delete-'))
      const plan = [...new Set(files.map(file => file.file_path))].map((value, index) => ({ original: resolveStoragePath(value), staged: path.join(job, String(index)) }))
      // If the process stops unexpectedly, this manifest supports manual recovery.
      // No password, hash, cookie or session is stored here.
      await fs.writeFile(path.join(job, 'manifest.json'), JSON.stringify({ kind, id, files: plan }), { mode: 0o600 })
      for (const entry of plan) {
        try {
          const stat = await fs.lstat(entry.original)
          if (!stat.isFile() || stat.isSymbolicLink()) throw fail('文件状态异常，未执行永久删除。', 500)
          await fs.rename(entry.original, entry.staged)
          moved.push(entry)
        } catch (error) {
          if (error.code !== 'ENOENT') throw error
        }
      }
      await db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
      await createOperationLog({ userId, action: 'purge', targetType: kind, targetId: id, details: { name: target.name } })
    })
    committed = true
    for (const entry of moved) await fs.unlink(entry.staged)
    await fs.rm(job, { recursive: true, force: true })
  } catch (error) {
    if (!committed) {
      try {
        for (const entry of moved.reverse()) await fs.rename(entry.staged, entry.original)
        if (job) await fs.rm(job, { recursive: true, force: true })
      } catch {
        throw fail('删除未完成，文件恢复需要管理员检查私有删除暂存区。', 500)
      }
    }
    if (committed) throw fail('数据库记录已删除，但磁盘清理未完成，请联系管理员检查私有删除暂存区。', 500)
    if (error.status) throw error
    throw fail('永久删除失败，未完成删除，请稍后重试。', 500)
  }
}
