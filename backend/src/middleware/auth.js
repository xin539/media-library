import { findUserBySession } from '../repositories/userRepository.js'

export function readCookie(request, name) {
  const cookies = request.headers.cookie || ''
  const item = cookies.split(';').map((value) => value.trim()).find((value) => value.startsWith(`${name}=`))
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null
}

export async function requireUser(request, response, next) {
  const user = (await findUserBySession(readCookie(request, 'media_session')))
  if (!user) return response.status(401).json({ message: '请先登录。' })
  request.user = user
  next()
}

export async function attachUser(request, _response, next) {
  request.user = (await findUserBySession(readCookie(request, 'media_session'))) || null
  next()
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user) return response.status(401).json({ message: '请先登录。' })
    const allowed = roles.includes(request.user.role) || (request.user.role === 'owner' && roles.includes('admin'))
    if (!allowed) return response.status(403).json({ message: '当前账号没有执行此操作的权限。' })
    next()
  }
}
