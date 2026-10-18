import '../src/config.js'
import { DatabaseSync, backup } from 'node:sqlite'
import mysql from 'mysql2/promise'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = new DatabaseSync(new URL('../../data/media-library.db', import.meta.url), { readOnly: true })
const database = process.env.MYSQL_DATABASE
if (!database || !/^[a-zA-Z0-9_]+$/.test(database)) throw new Error('Invalid MYSQL_DATABASE')
const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD,
  charset: 'utf8mb4'
})
const names = ['users','stores','sessions','operation_logs','assets','design_tasks','task_files','app_settings']
const q = name => '`' + name.replaceAll('`','``') + '`'
const short = /^(id|.*_id|token|openid|username|key|.*_at|deadline|role|status|priority|type|purpose|upload_batch)$/
try {
  await conn.query(`CREATE DATABASE IF NOT EXISTS ${q(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin`)
  await conn.changeUser({database})
  const [existing] = await conn.query('SHOW TABLES')
  if (existing.length) throw new Error('目标数据库不为空，已停止迁移，避免覆盖数据。')
  await mkdir(new URL('../../backups/mysql-migration/', import.meta.url), {recursive:true})
  await backup(source, fileURLToPath(new URL('../../backups/mysql-migration/cutover-' + Date.now() + '.sqlite', import.meta.url)))
  source.exec('BEGIN')
  const rowsByTable = new Map()
  for (const table of names) {
    const columns = source.prepare(`PRAGMA table_info(${q(table)})`).all()
    const definitions = columns.map(c => {
      const type = c.type === 'INTEGER' ? 'BIGINT' : short.test(c.name) ? 'VARCHAR(255)' : 'LONGTEXT'
      return `${q(c.name)} ${type}${c.notnull || c.pk ? ' NOT NULL' : ''}${c.dflt_value !== null ? ' DEFAULT ' + c.dflt_value : ''}${c.pk ? ' PRIMARY KEY' : ''}`
    })
    if (table === 'users') definitions.push('UNIQUE KEY (openid)', 'UNIQUE KEY (username)')
    if (table === 'assets') definitions.push("CHECK (type IN ('image','video'))")
    if (table === 'design_tasks') definitions.push("CHECK (priority IN ('normal','urgent'))", "CHECK (status IN ('available','in_progress','submitted','revision','completed','cancelled'))", 'CHECK (progress BETWEEN 0 AND 100)')
    for (const fk of source.prepare(`PRAGMA foreign_key_list(${q(table)})`).all()) {
      definitions.push(`FOREIGN KEY (${q(fk.from)}) REFERENCES ${q(fk.table)} (${q(fk.to)}) ON DELETE ${fk.on_delete}`)
    }
    for (const c of columns.filter(c => /_at$/.test(c.name))) definitions.push(`INDEX (${q(c.name)})`)
    await conn.query(`CREATE TABLE ${q(table)} (${definitions.join(', ')}) ENGINE=InnoDB`)
    rowsByTable.set(table, source.prepare(`SELECT * FROM ${q(table)}`).all())
  }
  await conn.beginTransaction()
  for (const [table, rows] of rowsByTable) {
    for (const row of rows) {
      const cols = Object.keys(row)
      await conn.query(`INSERT INTO ${q(table)} (${cols.map(q).join(',')}) VALUES (${cols.map(()=>'?').join(',')})`, Object.values(row))
    }
    const [actual] = await conn.query(`SELECT * FROM ${q(table)}`)
    const key = table === 'sessions' ? 'token' : table === 'app_settings' ? 'key' : 'id'
    const byId = new Map(actual.map(row => [row[key], row]))
    if (actual.length !== rows.length) throw new Error(`${table}: count mismatch`)
    for (const row of rows) for (const col of Object.keys(row)) {
      if (byId.get(row[key])?.[col] !== row[col]) throw new Error(`${table}.${col}: data mismatch`)
    }
    console.log(`${table}: ${rows.length} rows, every field verified`)
  }
  await conn.commit()
  source.exec('COMMIT')
  console.log('Migration complete')
} catch (error) {
  await conn.rollback()
  throw error
} finally { source.close(); await conn.end() }
