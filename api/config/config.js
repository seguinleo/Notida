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

const options = {
  host: DB_HOST || 'localhost',
  port: DB_PORT || 3306,
  database: DB_DATABASE || 'notida',
  user: DB_USER || 'user',
  password: DB_PASSWORD,
  charset: DB_CHARSET || 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}

const pool = mysql.createPool(options)

pool.getConnection()
  .then(connection => {
    console.log('Connected to the database')
    connection.release()
  })
  .catch(() => {
    console.error('Error connecting to the database')
  })

export { pool }
