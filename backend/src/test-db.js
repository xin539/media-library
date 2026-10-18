import { randomUUID } from 'node:crypto'
import { db } from './db.js'

// 创建唯一店铺ID。
const storeId = randomUUID()
const now = new Date().toISOString()

// 使用预编译语句，不能把用户填写的内容直接拼进SQL。
const createStore = db.prepare(`
  INSERT INTO stores (
    id,
    name,
    avatar_path,
    country,
    category,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

// 新增一条店铺数据。
await createStore.run(
  storeId,
  '测试服装店',
  null,
  '中国',
  '服装',
  now,
  now
)

console.log('店铺创建成功，ID：', storeId)

// 查询全部店铺。
const findStores = db.prepare(`
  SELECT
    id,
    name,
    avatar_path AS avatarPath,
    country,
    category,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM stores
  ORDER BY created_at DESC
`)

const stores = await findStores.all()

console.log('数据库中的店铺：')
console.table(stores)

// 根据ID查询单个店铺。
const findStoreById = db.prepare(`
  SELECT *
  FROM stores
  WHERE id = ?
`)

const selectedStore = await findStoreById.get(storeId)

console.log('刚刚创建的店铺：')
console.log(selectedStore)

// 修改店铺名称。
const updateStore = db.prepare(`
  UPDATE stores
  SET name = ?, updated_at = ?
  WHERE id = ?
`)

await updateStore.run(
  '修改后的服装店',
  new Date().toISOString(),
  storeId
)

console.log('店铺名称修改成功')

// 关闭数据库连接。
await db.close()
