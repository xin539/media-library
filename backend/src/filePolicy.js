import path from 'node:path'
import { fileTypeFromFile } from 'file-type'

export const mediaTypes = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4',
  '.mov': 'video/quicktime', '.webm': 'video/webm'
}
export const documentTypes = {
  '.pdf': 'application/pdf', '.zip': 'application/zip', '.psd': 'image/vnd.adobe.photoshop',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}
export function declaredType(file, documents = false) {
  const ext = path.extname(file.originalname).toLowerCase()
  const mime = mediaTypes[ext] || (documents && documentTypes[ext])
  if (!mime || file.mimetype !== mime) throw Object.assign(new Error('文件扩展名或 MIME 类型不支持或不匹配。'), { status: 400 })
  return { ext, mime }
}
export async function verifyFile(file, documents = false) {
  const expected = declaredType(file, documents)
  let detected
  try { detected = await fileTypeFromFile(file.path) } catch { /* invalid/truncated */ }
  if (!detected || detected.mime !== expected.mime) throw Object.assign(new Error('文件真实类型与声明不符或文件已损坏。'), { status: 400 })
  return { ext: expected.ext === '.jpeg' ? '.jpg' : expected.ext, mime: detected.mime }
}
export async function readableType(filePath) {
  try {
    const detected = await fileTypeFromFile(filePath)
    return detected && Object.values(mediaTypes).includes(detected.mime) ? detected.mime : null
  } catch { return null }
}
