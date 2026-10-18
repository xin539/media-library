import './config.js'
import mysql from 'mysql2/promise'
import { AsyncLocalStorage } from 'node:async_hooks'

if (!process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
  throw new Error('请配置 MYSQL_DATABASE 和 MYSQL_USER，再启动 MySQL 后端。')
}
export const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: 'utf8mb4',
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 100,
  connectTimeout: 10000,
  supportBigNumbers: true,
  bigNumberStrings: false
})
const transactions = new AsyncLocalStorage()
const query = async (sql, params = []) => {
  const [rows] = await (transactions.getStore() || pool).query(sql, params.map(value => value ?? null))
  return rows
}
export const db = {
  prepare(sql) {
    return {
      all: (...params) => query(sql, params),
      get: async (...params) => (await query(sql, params))[0],
      run: async (...params) => {
        const result = await query(sql, params)
        return { changes: result.affectedRows, lastInsertRowid: result.insertId }
      }
    }
  },
  exec: (sql) => query(sql),
  async transaction(fn) {
    if (transactions.getStore()) return fn()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const result = await transactions.run(connection, fn)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally { connection.release() }
  },
  close: () => pool.end()
}
await query('SELECT 1 FROM app_settings LIMIT 1')
