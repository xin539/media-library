import archiver from 'archiver'
import fs from 'node:fs/promises'
import path from 'node:path'
import { db } from '../db.js'
import { findAllTaskFiles, findTaskFileById } from '../repositories/taskFileRepository.js'
import { assertReadable } from './fileController.js'
import { resolveStoragePath } from '../storagePath.js'
import { createOperationLog } from '../repositories/logRepository.js'

export async function renameTaskFiles(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name || name.length > 180 || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name)) return res.status(400).json({ message: '名称为空、过长或包含非法字符。' });
    const file = req.params.id ? await findTaskFileById(req.params.id) : null;
    const files = req.params.id ? (file ? [file] : []) : (await findAllTaskFiles()).filter(f => f.storeId === req.params.storeId && f.uploadBatch === req.params.batch);
    if (!files.length) return res.status(404).json({ message: '文件不存在。' });
    await Promise.all(files.map(assertReadable));
    // Existing workspace files are shared by signed-in members, as with folder rename.
    if (file && path.extname(name).toLowerCase() !== path.extname(file.name).toLowerCase()) return res.status(400).json({ message: '请保留原文件扩展名。' });
    await db.transaction(async () => {
      for (const item of files) {
        if (file) {
          const relative = path.posix.join(path.posix.dirname(String(item.relativePath || item.name).replaceAll('\\', '/')), name);
          await db.prepare('UPDATE task_files SET name = ?, relative_path = ? WHERE id = ?').run(name, relative, item.id);
          item.name = name; item.relativePath = relative;
        } else {
          await db.prepare('UPDATE task_files SET upload_label = ? WHERE id = ?').run(name, item.id);
          item.uploadLabel = name;
        }
      }
      await createOperationLog({ userId: req.user.id, action: 'rename', targetType: 'task_file', details: { count: files.length, name } });
    });
    res.json({ data: files.map(({ id, name, relativePath, uploadLabel }) => ({ id, name, relativePath, uploadLabel })) });
  } catch (error) { next(error); }
}

export async function downloadTaskFiles(req, res, next) {
  try {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || !ids.length || ids.length > 10000 || ids.some(id => typeof id !== 'string')) return res.status(400).json({ message: '请选择 1 至 10000 个文件。' });
    const wanted = new Set(ids);
    const files = (await findAllTaskFiles()).filter(file => wanted.has(file.id));
    if (files.length !== wanted.size) return res.status(404).json({ message: '部分文件已被删除，请刷新后重试。' });
    for (const file of files) {
      await assertReadable(file);
      const stat = await fs.stat(resolveStoragePath(file.filePath));
      if (!stat.isFile()) throw Object.assign(new Error('文件不存在。'), { status: 404 });
    }
    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', error => res.headersSent ? res.destroy(error) : next(error));
    res.on('close', () => archive.abort());
    res.attachment('task-files.zip');
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    archive.pipe(res);
    const used = new Set();
    for (const file of files) {
      const original = String(file.relativePath || file.name).replaceAll('\\', '/').split('/').filter(p => p && p !== '.' && p !== '..').map(p => p.replace(/[<>:"|?*\x00-\x1f]/g, '_')).join('/') || file.id;
      let name = original; let suffix = 1;
      while (used.has(name.toLowerCase())) name = `${path.posix.join(path.posix.dirname(original), path.posix.parse(original).name)} (${suffix++})${path.posix.extname(original)}`;
      used.add(name.toLowerCase());
      archive.file(resolveStoragePath(file.filePath), { name });
    }
    await archive.finalize();
  } catch (error) { if (res.headersSent) res.destroy(error); else next(error); }
}

// Authenticated GET is needed for native browser drag-out downloads.
export async function downloadTaskFolder(req, res, next) {
  try {
    const folder = String(req.query.folder || '');
    if (!folder || /[\\/]/.test(folder)) return res.status(400).json({ message: '请选择文件夹。' });
    const files = (await findAllTaskFiles()).filter(file => file.taskId === req.params.taskId
      && (file.uploadBatch || '') === String(req.query.batch || '')
      && file.purpose === String(req.query.purpose || '')
      && String(file.relativePath || '').replaceAll('\\', '/').startsWith(`${folder}/`));
    req.body = { ids: files.map(file => file.id) };
    return downloadTaskFiles(req, res, next);
  } catch (error) { next(error); }
}
