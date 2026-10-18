import { Router } from 'express'
import { listOperationLogs } from '../controllers/logController.js'
import { requireUser } from '../middleware/auth.js'

const router = Router()
router.use(requireUser)
router.get('/', listOperationLogs)
export default router
