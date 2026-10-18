import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import { createTask, listTasks, reviewSubmittedTask, setTaskProgress, submitForReview, takeTask } from '../controllers/taskController.js'
const router = Router()
router.use(requireUser)
router.get('/', listTasks)
router.post('/', createTask)
router.patch('/:id/claim', takeTask)
router.patch('/:id/progress', setTaskProgress)
router.patch('/:id/submit', submitForReview)
router.patch('/:id/review', reviewSubmittedTask)
export default router
