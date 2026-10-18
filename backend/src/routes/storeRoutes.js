import { Router } from 'express'
import {
  createStore,
  deleteStore,
  editStore,
  getStore,
  listStores,
  permanentlyDeleteStore,
  restoreDeletedStore
} from '../controllers/storeController.js'
import { requireUser } from '../middleware/auth.js'
import { confirmDeletion } from '../middleware/confirmDeletion.js'

const router = Router()
router.use(requireUser)

router.get('/', listStores)
router.post('/', createStore)
router.get('/:id', getStore)
router.put('/:id', editStore)
router.patch('/:id/restore', restoreDeletedStore)
router.delete('/:id/permanent', confirmDeletion, permanentlyDeleteStore)
router.delete('/:id', deleteStore)

export default router
