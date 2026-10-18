import { secureUpload, completeUpload } from '../middleware/secureUpload.js'
import { taskFile } from '../controllers/fileController.js'
import { Router } from 'express'
import { requireUser } from '../middleware/auth.js'
import { renameTaskFiles, downloadTaskFiles, downloadTaskFolder } from '../controllers/taskFileActions.js'
import { deleteTaskFile, downloadTaskFile, listTaskFiles, uploadTaskFiles } from '../controllers/taskFileController.js'

const router = Router()
router.use(requireUser)
router.get('/', listTaskFiles)
router.post('/download', downloadTaskFiles)
router.get('/tasks/:taskId/folder-download', downloadTaskFolder)
router.patch('/stores/:storeId/batches/:batch', renameTaskFiles)
router.patch('/:id', renameTaskFiles)
router.get('/:id/file', taskFile)
router.post('/stores/:storeId', secureUpload('tasks', { documents: true, fileSize: 500 * 1024 * 1024, files: 50 }), completeUpload(uploadTaskFiles))
router.get('/:id/download', downloadTaskFile)
router.delete('/:id', deleteTaskFile)
export default router
