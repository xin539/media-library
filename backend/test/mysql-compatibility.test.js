import test, {after} from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {db} from '../src/db.js'
import {insertStore, removeStore} from '../src/repositories/storeRepository.js'
import {insertAsset, renameFolder, findAssetsByIds, findAssetsByFolder} from '../src/repositories/assetRepository.js'
import {insertTask, claimTask} from '../src/repositories/taskRepository.js'
after(() => db.close())

test('MySQL 中文文件夹重命名、批量查询与事务回滚', async t => {
  const id=randomUUID(), now=new Date().toISOString(), assetId=randomUUID()
  await insertStore({id,name:'迁移测试',country:'泰国',category:'测试',avatarPath:null,createdAt:now,updatedAt:now})
  t.after(()=>removeStore(id))
  await insertAsset({id:assetId,storeId:id,name:'图.png',type:'image',size:2,filePath:'/test.png',createdAt:now,relativePath:'中文/图.png'})
  assert.equal(await renameFolder(id,'中文','新名称'),1)
  assert.equal((await findAssetsByFolder(id,'新名称'))[0].relativePath,'新名称/图.png')
  assert.equal((await findAssetsByIds([assetId]))[0].id,assetId)
  assert.deepEqual(await findAssetsByIds([]),[])
  await assert.rejects(db.transaction(async()=>{
    await db.prepare('UPDATE stores SET name=? WHERE id=?').run('不应保存',id)
    throw new Error('rollback')
  }),/rollback/)
  assert.equal((await db.prepare('SELECT name FROM stores WHERE id=?').get(id)).name,'迁移测试')
})

test('并发领取同一个任务只能成功一次', async t => {
  const id=randomUUID(), uid=randomUUID(), taskId=randomUUID(), now=new Date().toISOString()
  await insertStore({id,name:'并发测试',country:'菲律宾',category:'测试',avatarPath:null,createdAt:now,updatedAt:now})
  await db.prepare('INSERT INTO users(id,openid,nickname,created_at,updated_at) VALUES(?,?,?,?,?)').run(uid,uid,'测试',now,now)
  t.after(async()=>{await removeStore(id);await db.prepare('DELETE FROM users WHERE id=?').run(uid)})
  await insertTask({id:taskId,storeId:id,title:'并发任务',description:'',priority:'normal',creatorId:uid,createdAt:now})
  const results=await Promise.all([claimTask(taskId,uid,now),claimTask(taskId,uid,now)])
  assert.equal(results.filter(Boolean).length,1)
})
