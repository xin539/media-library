import { secureUpload, completeUpload } from '../middleware/secureUpload.js'
import { assetFile, storeCover, taskImage } from '../controllers/fileController.js'
import { Router } from 'express'
import { listAssets, moveAssetToTrash, permanentlyDeleteAsset, renameAssetFolder, restoreDeletedAsset, setStoreCover, uploadAssets } from '../controllers/assetController.js'
import { requireUser } from '../middleware/auth.js'
import { confirmDeletion } from '../middleware/confirmDeletion.js'
import { downloadAssets, downloadSingleAsset } from '../controllers/downloadController.js'

const router = Router()
router.use(requireUser)
router.get('/', listAssets)
router.get('/stores/:storeId/cover', storeCover)
router.get('/tasks/:taskId/image', taskImage)
router.get('/:id/file', assetFile)
router.patch('/stores/:storeId/folders', renameAssetFolder)
router.patch('/stores/:storeId/cover/:assetId', setStoreCover)
router.post('/download', downloadAssets)
router.get('/:id/download', downloadSingleAsset)
router.patch('/:id/trash', moveAssetToTrash)
router.patch('/:id/restore', restoreDeletedAsset)
router.delete('/:id/permanent', confirmDeletion, permanentlyDeleteAsset)
router.post('/stores/:storeId', secureUpload('assets', { fileSize: 2 * 1024 * 1024 * 1024, files: 20 }), completeUpload(uploadAssets))

export default router
