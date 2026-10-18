import { db } from '../db.js'
import { readCookie } from '../middleware/auth.js'
import { Router } from 'express'
import {
  currentUser,
  login,
  listMembers,
  createMember,
  changeMemberRole
} from '../controllers/authController.js'
import { requireRole, requireUser } from '../middleware/auth.js'
const router = Router()
router.get('/me', currentUser)
// 不允许公众自行注册
router.post('/register', (_request, response) => {
  response.status(403).json({
    message: '注册已关闭，请联系管理员创建账号。'
  })
})
router.post('/login', login)
router.get('/members', requireUser, listMembers)
router.post('/members', requireUser, requireRole('admin'), createMember)
router.patch('/members/:id/role', requireUser, requireRole('admin'), changeMemberRole)
router.post('/logout', async (request, response, next) => {
  try {
    const token = readCookie(request, 'media_session')

    if (token) {
      await db.prepare(
        'DELETE FROM sessions WHERE token = ?'
      ).run(token)
    }

    response.clearCookie('media_session', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/'
    })

    response.status(204).end()
  } catch (error) {
    next(error)
  }
})
export default router
