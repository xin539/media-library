// Classify the uploaded item itself; never inspect/extract archive contents.
export function fileMediaType(file = {}) {
  const extension = String(file.name || '').split('.').pop().toLowerCase()
  if (['png','jpg','jpeg','gif','webp','avif','bmp','svg','heic','heif','tif','tiff','ico'].includes(extension)) return 'image'
  if (['mp4','mov','webm','mkv','avi','m4v','mpeg','mpg'].includes(extension)) return 'video'
  if (['zip','rar','7z','tar','gz','pdf','psd','ai','doc','docx','xls','xlsx','ppt','pptx','txt','csv'].includes(extension)) return 'file'
  const mime = String(file.mimeType || file.type || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'file'
}
