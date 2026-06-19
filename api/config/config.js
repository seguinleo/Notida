import mysql from 'mysql2/promise'
import dotenvx from '@dotenvx/dotenvx'

dotenvx.config({
  path: '.env'
})

/**
 * !!!!!!!!!!!!!!!
 * EDIT ALL ENVIRONMENT VARIABLES FOR PRODUCTION
 * !!!!!!!!!!!!!!!
 * EDIT HOST, DATABASE, USER AND PASSWORD FOR PRODUCTION
 * !!!!!!!!!!!!!!!
 */

const { DB_HOST, DB_DATABASE, DB_USER, DB_PASSWORD, DB_PORT, DB_CHARSET } = process.env

if (!DB_HOST || !DB_DATABASE || !DB_USER || !DB_PASSWORD) {
  throw new Error('Missing required database environment variables')
}

const options = {
  host: DB_HOST,
  port: DB_PORT,
  database: DB_DATABASE,
  user: DB_USER,
  password: DB_PASSWORD,
  charset: DB_CHARSET || 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  connectTimeout: 10000
}

const pool = mysql.createPool(options)

try {
  const connection = await pool.getConnection()
  console.log('Database connected')
  connection.release()
} catch (error) {
  console.error('Database connection failed', error)
  process.exit(1)
}

export { pool }
