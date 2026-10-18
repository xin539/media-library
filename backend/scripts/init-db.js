import '../src/config.js'
import mysql from 'mysql2/promise'
import { readFile } from 'node:fs/promises'
const connection = await mysql.createConnection({host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3306),user:process.env.MYSQL_USER,password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE})
try {
 const [tables] = await connection.query('SHOW TABLES')
 if(tables.length) throw new Error('Database must be empty. Existing data is never overwritten.')
 const schema = await readFile(new URL('../schema.sql',import.meta.url),'utf8')
 for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await connection.query(statement)
 console.log('Schema initialized. Set DEMO_PASSWORD and run node scripts/seed-demo.js next.')
} finally {await connection.end()}
