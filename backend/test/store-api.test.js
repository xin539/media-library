import assert from 'node:assert/strict'
import test, { after } from 'node:test'
import { db } from '../src/db.js'
after(() => db.close())
import { randomUUID } from 'node:crypto'
import { findStoreById, insertStore, removeStore, updateStore } from '../src/repositories/storeRepository.js'
import { findAssetById, insertAsset, removeAsset, restoreAsset, trashAsset } from '../src/repositories/assetRepository.js'

test('店铺可以新增、查询、修改和删除', async () => {
  const id = randomUUID()
  const now = new Date().toISOString()

  const created = (await insertStore({
    id,
    name: '接口测试店铺',
    avatarPath: null,
    country: '中国',
    category: '服装',
    createdAt: now,
    updatedAt: now
  }))
  assert.equal(created.name, '接口测试店铺')

  const updated = (await updateStore(id, {
    name: '修改后的店铺',
    avatarPath: null,
    country: '中国',
    category: '家居',
    updatedAt: new Date().toISOString()
  }))
  assert.equal(updated.category, '家居')
  assert.equal((await findStoreById(id)).name, '修改后的店铺')

  assert.equal((await removeStore(id)), true)
  assert.equal((await findStoreById(id)), undefined)
})

test('素材移入回收站和恢复会持久化', async (t) => {
  const storeId = randomUUID()
  const assetId = randomUUID()
  const now = new Date().toISOString()
  t.after(async () => (await removeStore(storeId)))
  ;(await insertStore({ id: storeId, name: '回收站测试店铺', avatarPath: null, country: '中国', category: '测试', createdAt: now, updatedAt: now }))
  ;(await insertAsset({ id: assetId, storeId, name: '测试图片.png', type: 'image', size: 10, filePath: '/storage/assets/test.png', createdAt: now }))

  assert.equal((await trashAsset(assetId, now)), true)
  assert.equal((await findAssetById(assetId)).deletedAt, now)
  assert.equal((await trashAsset(assetId, now)), false)
  assert.equal((await restoreAsset(assetId)), true)
  assert.equal((await findAssetById(assetId)).deletedAt, null)
  assert.equal((await restoreAsset(assetId)), false)
  assert.equal((await removeAsset(assetId)), true)
})
