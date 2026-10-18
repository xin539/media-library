import '../src/config.js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import mysql from 'mysql2/promise'

const config = fileURLToPath(new URL('../../.local/mysql/my.ini', import.meta.url))
// Other installations manage their own database service.
if (process.platform === 'win32' && fs.existsSync(config)) {
  const connection = {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    connectTimeout: 1000,
  }
  async function ready() {
    const db = await mysql.createConnection(connection)
    try { await db.query('SELECT 1') } finally { await db.end() }
  }
  try {
    await ready()
    console.log('Local MySQL is ready.')
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') throw error
    const executable = 'C:/Program Files/MySQL/MySQL Server 8.4/bin/mysqld.exe'
    if (!fs.existsSync(executable)) throw new Error(`MySQL executable missing: ${executable}`)
    const child = spawn(executable, [`--defaults-file=${config}`], {
      detached: true, stdio: 'ignore', windowsHide: true,
    })
    let launchError
    child.on('error', error => { launchError = error })
    child.on('exit', code => { launchError = new Error(`MySQL exited (${code}); check .local/mysql/mysql-error.log`) })
    child.unref()
    let started = false
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (launchError) throw launchError
      try { await ready(); started = true; break } catch (error) {
        if (!['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code)) throw error
      }
    }
    if (!started) throw new Error('MySQL startup timed out; check .local/mysql/mysql-error.log')
    console.log('Local MySQL started.')
  }
}
