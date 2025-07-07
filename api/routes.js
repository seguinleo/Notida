import express from 'express'
import session from 'express-session'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import { RedisStore } from 'connect-redis'
import { createClient } from 'redis'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import Encryption from './class/Encryption.js'
import { pool } from './config/config.js'

const app = express()
const encryption = new Encryption()

const redisClient = createClient();
redisClient.connect({
  url: process.env.REDIS_URL
})
  .then(() => console.log('Redis client connected'))
  .catch(console.error)
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'notes:',
  ttl: 604800,
})

app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 604800000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  }
}))

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
})

/**
 * @function checkToken
 * @description Middleware to check if the user is authenticated with a valid JWT token.
 * If the token is missing or invalid, it responds with a 401 status and
 * stops all cloud requests.
 */
const checkToken = (req, res, next) => {
  if (!req.cookies) {
    return res.status(401).json({ response: 0 })
  }

  const token = req.cookies.token
  if (!token) {
    return res.status(401).json({ response: 0 })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ response: 0 })
    }
    if (req.session.name !== decoded.id) {
      return res.status(401).json({ response: 0 })
    }
    next()
  })
}

/**
 * @function getKey
 * @async
 * @param {string} name - The username of the user.
 * @param {string} userId - The ID of the user.
 * @description Get the encryption/decryption key for a user.
 * 
 * !! Important: This key has to be store in a secure vault like AWS KMS, Azure Key Vault or a self-hosted solution instead of the mysql database !!
 * 
 * The key is never sent to the client.
 */
const getKey = async (name, userId) => {
  if (!name || !userId) return 0

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT oneKey FROM users WHERE name = ? AND id = ? LIMIT 1", [name, userId])
    connection.release()

    if (rows.length !== 1) return 0

    return rows[0].oneKey
  } catch {
    return 0
  }
}

/**
 * @function getLastLogin
 * @async
 * @param {string} name - The username of the user.
 * @param {string} userId - The ID of the user.
 * @description Get the last login timestamp for a user.
 */
const getLastLogin = async (name, userId) => {
  if (!name || !userId) return 0

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT lastLogin FROM users WHERE name = ? AND id = ? LIMIT 1", [name, userId])
    connection.release()

    if (rows.length !== 1) return 0
    return rows[0].lastLogin
  } catch {
    return 0
  }
}

app.post('/get-lock-app', (req, res) => {
  const lockApp = req.session.lockApp || false
  res.status(200).json({ lockApp })
})

app.post('/get-user', async (req, res) => {
  const name = req.session.name

  if (!name || !/^[a-zA-ZÀ-ÿ -]+$/.test(name)) {
    return res.json({ name: false })
  }

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT name FROM users WHERE name = ? LIMIT 1", [name])
    connection.release()

    if (!rows || rows.length !== 1) {
      return res.status(401).json({ name: false })
    }

    res.json({ name: rows[0].name })
  } catch {
    return res.status(401).json({ name: false })
  }
})

app.post('/create-user', async (req, res) => {
  const { nameCreate, psswdCreate } = req.body

  if (!/^[a-zA-ZÀ-ÿ -]+$/.test(nameCreate) || nameCreate.length < 3 || nameCreate.length > 30 || psswdCreate.length < 10 || psswdCreate.length > 64) {
    return res.status(401).send('Account creation failed')
  }

  const id = crypto.randomBytes(12).toString('hex')
  const psswdCreateHash = await bcrypt.hash(psswdCreate, 10)
  const key = crypto.randomBytes(32);

  const binary = []
  const bytes = new Uint8Array(key)
  for (let i = 0; i < bytes.byteLength; i += 1) binary.push(String.fromCharCode(bytes[i]))
  const keyBase64 = btoa(binary.join(''))

  try {
    const connection = await pool.getConnection()
    await connection.execute(
      "INSERT INTO users (id, name, psswd, oneKey) VALUES (?, ?, ?, ?)",
      [id, nameCreate, psswdCreateHash, keyBase64]
    )
    connection.release()
    res.status(200).send('Account created successfully')
  } catch {
    return res.status(401).send('Account creation failed')
  }
})

app.post('/login', limiter, async (req, res) => {
  const { nameConnect, psswdConnect } = req.body

  if (!/^[a-zA-ZÀ-ÿ -]+$/.test(nameConnect) || nameConnect.length < 3 || nameConnect.length > 30 || psswdConnect.length < 10 || psswdConnect.length > 64) {
    return res.status(401).send('Connection failed')
  }

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT id, name, psswd FROM users WHERE name = ? LIMIT 1", [nameConnect])
    connection.release()

    if (rows.length !== 1 || !(await bcrypt.compare(psswdConnect, rows[0].psswd))) {
      return res.status(401).send('Connection failed')
    }

    res.cookie('token', jwt.sign({ id: rows[0].name }, process.env.JWT_SECRET, {
      expiresIn: 604800,
    }), {
      maxAge: 604800000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    })

    req.session.name = rows[0].name
    req.session.userId = rows[0].id
    req.session.lockApp = false

    await connection.execute("UPDATE users SET lastLogin = NOW() WHERE name = ?", [nameConnect])

    res.status(200).send('Connection successful')
  } catch {
    return res.status(401).send('Connection failed')
  }
})

app.post('/logout', checkToken, async (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Logout failed')
    }
    res.clearCookie('token')
    res.clearCookie('connect.sid')
    res.status(200).send('Logout successful')
  })
})

app.post('/update-password', checkToken, async (req, res) => {
  const { psswdOld, psswdNew } = req.body
  const name = req.session.name
  const userId = req.session.userId

  if (!name || !userId || !psswdOld || psswdNew.length < 10 || psswdNew.length > 64) {
    return res.status(401).send('Password update failed')
  }

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT psswd FROM users WHERE name = ? AND id = ? LIMIT 1", [name, userId])
    if (rows.length !== 1 || !(await bcrypt.compare(psswdOld, rows[0].psswd))) {
      return res.status(401).send('Password update failed')
    }

    const psswdNewHash = await bcrypt.hash(psswdNew, 10)
    await connection.execute("UPDATE users SET psswd = ? WHERE name = ? AND id = ?", [psswdNewHash, name, userId])
    connection.release()
    res.status(200).send('Password updated successfully')
  } catch {
    return res.status(401).send('Password update failed')
  }
})

app.post('/delete-user', checkToken, async (req, res) => {
  const { psswd } = req.body
  const name = req.session.name
  const userId = req.session.userId

  if (!name || !userId || psswd.length < 10 || psswd.length > 64) {
    return res.status(401).send('Account deletion failed')
  }

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT psswd FROM users WHERE name = ? AND id = ? LIMIT 1", [name, userId])
    if (rows.length !== 1 || !(await bcrypt.compare(psswd, rows[0].psswd))) {
      return res.status(401).send('Account deletion failed')
    }

    await connection.execute("DELETE FROM users WHERE name = ? AND id = ?", [name, userId])
    connection.release()

    req.session.destroy()
    res.clearCookie('connect.sid')
    res.status(200).send('Account deleted successfully')
  } catch {
    return res.status(401).send('Account deletion failed')
  }
})

app.post('/get-notes', checkToken, async (req, res) => {
  const name = req.session.name
  const userId = req.session.userId
  const key = await getKey(name, userId)
  const lastLogin = await getLastLogin(name, userId)

  if (!name || !userId || !key) {
    return res.status(401).send('Notes retrieval failed')
  }

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute("SELECT id, title, content, color, dateNote, hiddenNote, category, folder, pinnedNote, link, reminder FROM notes WHERE user = ?", [name])
    connection.release()

    const notes = rows.map(row => ({
      id: row.id,
      title: encryption.decryptData(row.title, key),
      content: encryption.decryptData(row.content, key),
      color: row.color,
      date: row.dateNote,
      folder: row.folder || null,
      category: row.category || null,
      link: row.link || null,
      hidden: row.hiddenNote,
      pinned: row.pinnedNote,
      reminder: row.reminder || null,
    }))

    res.status(200).json({ notes, lastLogin })
  } catch {
    return res.status(401).send('Notes retrieval failed')
  }
})

app.post('/add-note', checkToken, async (req, res) => {
  const { title, content, color, hidden, folder, category, reminder } = req.body
  const name = req.session.name
  const userId = req.session.userId
  const key = await getKey(name, userId)

  if (!name || !userId || !key || !title) {
    return res.status(401).send('Note creation failed')
  }

  const noteId = crypto.randomBytes(12).toString('hex')
  const dateNote = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const allColors = [
    'bg-default',
    'bg-red',
    'bg-orange',
    'bg-yellow',
    'bg-lime',
    'bg-green',
    'bg-cyan',
    'bg-light-blue',
    'bg-blue',
    'bg-purple',
    'bg-pink',
  ]

  if (title.length > 30 || content.length > 20000 || !allColors.includes(color)) {
    return res.status(401).send('Note creation failed')
  }

  try {
    const connection = await pool.getConnection()
    await connection.execute(
      "INSERT INTO notes (id, title, content, dateNote, color, hiddenNote, folder, category, reminder, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        noteId,
        encryption.encryptData(title, key),
        encryption.encryptData(content, key),
        dateNote,
        color,
        hidden,
        folder,
        category,
        reminder,
        name,
      ]
    )
    connection.release()
    res.status(200).send('Note created successfully')
  } catch {
    return res.status(401).send('Note creation failed')
  }
})

app.post('/pin-note', checkToken, async (req, res) => {
  const { noteId } = req.body
  const name = req.session.name

  if (!name || !noteId) {
    return res.status(401).send('Pin note failed')
  }

  try {
    const connection = await pool.getConnection()
    await connection.execute(`
          UPDATE notes
          SET pinnedNote = CASE WHEN pinnedNote = '0' THEN '1' ELSE '0' END
          WHERE id = ? AND user = ?
      `, [noteId, name])
    connection.release()
    res.status(200).send('Note pinned successfully')
  } catch {
    return res.status(401).send('Pin note failed')
  }
})

app.post('/update-note', checkToken, async (req, res) => {
  const { noteId, title, content, color, hidden, folder, category, reminder } = req.body
  const name = req.session.name
  const userId = req.session.userId
  const key = await getKey(name, userId)

  if (!name || !userId || !key || !noteId || !title) {
    return res.status(401).send('Update failed')
  }

  const dateNote = new Date().toISOString().slice(0, 19).replace('T', ' ')

  const allColors = [
    'bg-default',
    'bg-red',
    'bg-orange',
    'bg-yellow',
    'bg-lime',
    'bg-green',
    'bg-cyan',
    'bg-light-blue',
    'bg-blue',
    'bg-purple',
    'bg-pink',
  ]

  if (title.length > 30 || content.length > 20000 || !allColors.includes(color)) {
    return res.status(401).send('Update failed')
  }

  try {
    const connection = await pool.getConnection()
    await connection.execute(`
            UPDATE notes
            SET title = ?, content = ?, dateNote = ?, color = ?, hiddenNote = ?, folder = ?, category = ?, reminder = ?
            WHERE id = ? AND user = ?
        `, [
      encryption.encryptData(title, key),
      encryption.encryptData(content, key),
      dateNote,
      color,
      hidden,
      folder,
      category,
      reminder,
      noteId,
      name
    ])
    connection.release()
    res.status(200).send('Note updated successfully')
  } catch {
    return res.status(401).send('Update failed')
  }
})

app.post('/delete-note', checkToken, async (req, res) => {
  const { noteId } = req.body
  const name = req.session.name

  if (!name || !noteId) {
    return res.status(401).send('Note deletion failed')
  }

  try {
    const connection = await pool.getConnection()
    await connection.execute("DELETE FROM notes WHERE id = ? AND user = ? AND link IS NULL", [noteId, name])
    connection.release()
    res.status(200).send('Note deleted successfully')
  } catch {
    return res.status(401).send('Note deletion failed')
  }
})

app.post('/public-note', checkToken, async (req, res) => {
  const { noteId } = req.body
  const name = req.session.name

  if (!name || !noteId) {
    return res.status(401).send('Note modification failed')
  }

  const noteLink = crypto.randomBytes(16).toString('hex')

  try {
    const connection = await pool.getConnection()
    await connection.execute("UPDATE notes SET link = ? WHERE id = ? AND user = ? AND link IS NULL AND hiddenNote = 0", [noteLink, noteId, name])
    connection.release()
    res.status(200).send('Note link added successfully')
  } catch {
    return res.status(401).send('Note modification failed')
  }
})

app.post('/private-note', checkToken, async (req, res) => {
  const { noteId, noteLink } = req.body
  const name = req.session.name

  if (!name || !noteId || !noteLink) {
    return res.status(401).send('Note modification failed')
  }

  try {
    const connection = await pool.getConnection()
    await connection.execute("UPDATE notes SET link = NULL WHERE id = ? AND user = ? AND link = ?", [noteId, name, noteLink])
    connection.release()
    res.status(200).send('Note link removed successfully')
  } catch {
    return res.status(401).send('Note modification failed')
  }
})

app.post('/get-shared-note', async (req, res) => {
  const { noteLink } = req.body

  if (!noteLink || !/^[a-zA-Z0-9]{32}$/.test(noteLink)) {
    return res.status(401).send('Invalid note link')
  }

  try {
    const connection = await pool.getConnection()
    const [rows] = await connection.execute(`
          SELECT notes.title, notes.content, notes.dateNote, notes.link, users.oneKey
          FROM notes
          INNER JOIN users ON notes.user = users.name
          WHERE notes.link = ?
          LIMIT 1
      `, [noteLink])
    connection.release()

    if (rows.length !== 1) {
      return res.status(404).send('Note not found')
    }

    const note = {
      title: encryption.decryptData(rows[0].title, rows[0].oneKey),
      content: encryption.decryptData(rows[0].content, rows[0].oneKey),
      date: rows[0].dateNote
    }

    res.status(200).json(note)
  } catch {
    return res.status(401).send('Invalid note link')
  }
})

app.post('/lock-app', (req, res) => {
  const lockApp = req.session.lockApp ? !req.session.lockApp : true
  req.session.lockApp = lockApp
  res.status(200).send('App lock status updated')
})

app.get('/health', (req, res) => {
  res.status(200).send('OK')
})

export default app
