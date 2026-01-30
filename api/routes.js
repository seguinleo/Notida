import express from 'express'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import { RedisStore } from 'connect-redis'
import { createClient } from 'redis'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { Buffer } from 'buffer'
import rateLimit from 'express-rate-limit'
import jwt from 'jsonwebtoken'
import Encryption from './class/Encryption.js'
import { pool } from './config/config.js'
import passport from './config/passport.js'

const app = express()
const encryption = new Encryption()

const redisClient = createClient({
  url: process.env.REDIS_URL,
})
redisClient.connect()
  .then(() => console.log('Redis client connected'))
  .catch(console.error)
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'notes:',
  ttl: 604800,
})

const maxNoteContentLength = 20000
const maxDataByteSize = 1000000

app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 604800000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict'
  }
}))

app.use(cookieParser())
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))

const limiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
})

const loginLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
})

app.use(limiter)

/**
 * @function verifyJWTToken
 * @description Middleware to check if the user is authenticated with a valid JWT token.
 * If the token is missing or invalid, it responds with a 401 status and
 * stops all cloud requests.
 */
const verifyJWTToken = async (req, res, next) => {
  const token = req.cookies?.jwtToken
  if (!token) return res.status(403).json({ response: 0 })

  try {
    const isBlacklisted = await redisClient.get(`blacklist:${token}`)
    if (isBlacklisted) return res.status(403).json({ response: 0 })

    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
      return res.status(403).json({ response: 0 })
    }

    const tokenActive = await redisClient.sIsMember(`user:tokens:${decoded.id}`, token)
    if (!tokenActive) return res.status(403).json({ response: 0 })

    req.userId = decoded.id

    next()
  } catch {
    return res.status(403).json({ response: 0 })
  }
}

/**
 * @function verifyCsrfToken
 * @description Verify CSRF token.
 */
const verifyCsrfToken = (req, res, next) => {
  const userToken = req.headers['x-csrf-token']
  const storedToken = req.cookies?.csrfToken

  if (!userToken || !storedToken) {
    return res.status(403).json('Invalid CSRF token')
  }

  try {
    const userBuffer = Buffer.from(userToken, 'utf8')
    const storedBuffer = Buffer.from(storedToken, 'utf8')

    if (userBuffer.length !== storedBuffer.length ||
      !crypto.timingSafeEqual(userBuffer, storedBuffer)) {
      return res.status(403).json('Invalid CSRF token')
    }
  } catch {
    return res.status(403).json('Invalid CSRF token')
  }

  next()
}

/**
 * @function blacklistToken
 * @description Function to blacklist a token to kill a session.
 */
const blacklistToken = async (token) => {
  const decoded = jwt.decode(token)
  if (!decoded?.exp) return

  const ttl = decoded.exp - Math.floor(Date.now() / 1000)
  if (ttl > 0) {
    await redisClient.set(`blacklist:${token}`, '1', { EX: ttl })
  }
}

/**
 * @function getKey
 * @description Get the encryption/decryption key for a user.
 * Important: This key has to be store in a secure vault like AWS KMS,
 * Azure Key Vault or a self-hosted solution instead of the mysql database.
 * The key is never sent to the client.
 */
const getKey = async (userId) => {
  if (!userId || !/^[a-f0-9]{24}$/i.test(userId)) return 0

  try {
    const [rows] = await pool.execute(
      "SELECT oneKey FROM users WHERE id = ? LIMIT 1",
      [userId]
    )

    if (rows.length !== 1) return 0
    return rows[0].oneKey
  } catch {
    return 0
  }
}

/**
 * @function getLastLogin
 * @description Get the last login timestamp for a user.
 */
const getLastLogin = async (userId) => {
  try {
    const [rows] = await pool.execute("SELECT lastLogin FROM users WHERE id = ? LIMIT 1", [userId])

    if (rows.length !== 1) return 0
    return rows[0].lastLogin
  } catch {
    return 0
  }
}

/**
 * @function getAllUserSessions
 * @description Get number of active sessions for a user and clean old tokens.
 */
const getAllUserSessions = async (userId) => {
  try {
    const tokens = await redisClient.sMembers(`user:tokens:${userId}`)
    if (!tokens || tokens.length === 0) return 0

    const results = await Promise.all(tokens.map(async (token) => {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`)
      if (isBlacklisted) {
        await redisClient.sRem(`user:tokens:${userId}`, token)
        return 0
      }

      try {
        jwt.verify(token, process.env.JWT_SECRET)
        return 1
      } catch {
        await redisClient.sRem(`user:tokens:${userId}`, token)
        return 0
      }
    }))

    return results.reduce((acc, val) => acc + val, 0)
  } catch {
    return 0
  }
}

/**
 * @description Route to verify if the user is authenticated.
 */
app.post('/whoami', async (req, res) => {
  const token = req.cookies?.jwtToken
  if (!token) return res.json({ isAuthenticated: false })

  try {
    const isBlacklisted = await redisClient.get(`blacklist:${token}`)
    if (isBlacklisted) return res.json({ isAuthenticated: false })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const active = await redisClient.sIsMember(
      `user:tokens:${decoded.id}`,
      token
    )
    if (!active) return res.json({ isAuthenticated: false })

    return res.json({ isAuthenticated: true })
  } catch {
    return res.json({ isAuthenticated: false })
  }
})

/**
 * @description Route to check if app is locked with biometric.
 */
app.post('/get-lock-app', (req, res) => {
  const lockApp = req.session.lockApp ? true : false
  return res.status(200).json({ lockApp })
})

/**
 * @description Route to lock app with biometric.
 */
app.post('/lock-app', (req, res) => {
  const lockApp = req.session.lockApp ? false : true
  req.session.lockApp = lockApp
  return res.status(200).send('App lock status updated')
})

/**
 * @description Route to create a new user account.
 * Store encryption key securely in a vault like AWS KMS,
 * Azure Key Vault or a self-hosted solution instead of the mysql database.
 */
app.post('/create-account', async (req, res) => {
  const { nameCreate, psswdCreate } = req.body

  if (!/^[\p{L} -]+$/u.test(nameCreate.normalize('NFC'))
    || nameCreate.length < 3
    || nameCreate.length > 30
    || psswdCreate.length < 10
    || psswdCreate.length > 64
  ) {
    return res.status(401).send('Account creation failed')
  }

  const id = crypto.randomBytes(12).toString('hex')
  const psswdCreateHash = await bcrypt.hash(psswdCreate, 12)
  const key = crypto.randomBytes(32)
  const keyBase64 = Buffer.from(key).toString('base64')

  try {
    await pool.execute(
      "INSERT INTO users (id, name, psswd, oneKey) VALUES (?, ?, ?, ?)",
      [id, nameCreate, psswdCreateHash, keyBase64]
    )
    return res.status(200).send('Account created successfully')
  } catch {
    return res.status(401).send('Account creation failed')
  }
})

/**
 * @description Route to log in a user. Create and store JWT token in Redis.
 */
app.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const user = await new Promise((resolve, reject) => {
      passport.authenticate('local', { session: false }, (err, user) => {
        if (err) return reject(err)
        resolve(user)
      })(req, res, next)
    })

    if (!user) return res.status(401).send('Wrong username or password.')

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: 604800 }
    )

    await redisClient.sAdd(`user:tokens:${user.id}`, token)
    await redisClient.expire(`user:tokens:${user.id}`, 604800)

    req.session.regenerate((err) => {
      if (err) return res.status(401).send('Internal server error')

      req.session.name = user.name
      req.session.lockApp = false

      res.cookie('jwtToken', token, {
        maxAge: 604800000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
      })

      const csrfToken = crypto.randomBytes(32).toString('hex')
      res.cookie('csrfToken', csrfToken, {
        maxAge: 604800000,
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
      })

      pool.execute(
        "UPDATE users SET lastLogin = NOW() WHERE id = ?",
        [user.id]
      )

      return res.status(200).send('Logged in!')
    })
  } catch {
    return res.status(401).send('Wrong username or password.')
  }
})

/**
 * @description Route to log out only current device. Blacklist current JWT token.
 */
app.post('/logout', verifyJWTToken, async (req, res) => {
  const token = req.cookies?.jwtToken
  if (!token) return res.status(401).json('Internal server error')

  try {
    await blacklistToken(token)
    await redisClient.sRem(`user:tokens:${req.userId}`, token)

    req.session.destroy((err) => {
      if (err) return res.status(401).json('Internal server error')

      res.clearCookie('connect.sid')
      res.clearCookie('jwtToken')
      res.clearCookie('csrfToken')
      return res.status(200).json('Logged out successfully')
    })
  } catch {
    return res.status(401).json('Internal server error')
  }
})

/**
 * @description Route to log out all devices for a user. Blacklist all JWT tokens associated with the user.
 */
app.post('/logout-all', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const userId = req.userId

  try {
    const tokens = await redisClient.sMembers(`user:tokens:${userId}`)

    if (tokens && tokens.length > 0) {
      await Promise.all(
        tokens.map(token => blacklistToken(token))
      )
      await redisClient.del(`user:tokens:${userId}`)
    }

    req.session.destroy((err) => {
      if (err) return res.status(401).json('Internal server error')

      res.clearCookie('connect.sid')
      res.clearCookie('jwtToken')
      res.clearCookie('csrfToken')
      return res.status(200).json('All devices logged out successfully')
    })
  } catch {
    return res.status(401).json('Internal server error')
  }
})

/**
 * @description Route to update user password. Log out and blacklist all JWT tokens associated with the user.
 */
app.post('/update-password', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { psswdOld, psswdNew } = req.body
  const userId = req.userId

  if (!userId || !psswdOld || !psswdNew || psswdNew.length < 10) {
    return res.status(401).json('Internal server error')
  }

  try {
    const [rows] = await pool.execute(
      "SELECT psswd FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    if (rows.length !== 1 || !(await bcrypt.compare(psswdOld, rows[0].psswd))) {
      return res.status(401).json('Wrong password')
    }

    const psswdNewHash = await bcrypt.hash(psswdNew, 12)
    await pool.execute(
      "UPDATE users SET psswd = ? WHERE id = ?",
      [psswdNewHash, userId]
    )

    const tokens = await redisClient.sMembers(`user:tokens:${userId}`)

    if (tokens && tokens.length > 0) {
      await Promise.all(
        tokens.map(token => blacklistToken(token))
      )
      await redisClient.del(`user:tokens:${userId}`)
    }

    req.session.destroy((err) => {
      if (err) return res.status(401).json('Internal server error')

      res.clearCookie('connect.sid')
      res.clearCookie('jwtToken')
      res.clearCookie('csrfToken')
      return res.status(200).json('Password updated. All devices logged out. Please login again.')
    })
  } catch {
    return res.status(401).json('Internal server error')
  }
})

/**
 * @description Route to delete an account and all notes ON DELETE CASCADE.
 * Log out and blacklist all JWT tokens associated with the user.
 */
app.post('/delete-account', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { psswd } = req.body
  const userId = req.userId

  if (!userId || !psswd) {
    return res.status(401).json('Internal server error')
  }

  try {
    const [rows] = await pool.execute(
      "SELECT psswd FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    if (rows.length !== 1 || !(await bcrypt.compare(psswd, rows[0].psswd))) {
      return res.status(401).json('Wrong password')
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [userId])

    const tokens = await redisClient.sMembers(`user:tokens:${userId}`)

    if (tokens && tokens.length > 0) {
      await Promise.all(
        tokens.map(token => blacklistToken(token))
      )
      await redisClient.del(`user:tokens:${userId}`)
    }

    req.session.destroy((err) => {
      if (err) return res.status(401).json('Internal server error')

      res.clearCookie('connect.sid')
      res.clearCookie('jwtToken')
      res.clearCookie('csrfToken')
      return res.status(200).json('Account deleted successfully. All devices logged out.')
    })
  } catch {
    return res.status(401).json('Internal server error')
  }
})

/**
 * @description Route to get all user notes
 */
app.post('/get-notes', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const userId = req.userId
  const name = req.session.name
  const key = await getKey(userId)
  const lastLogin = await getLastLogin(userId)
  const allUserSessions = await getAllUserSessions(userId)

  if (!key) return res.status(401).send('Notes retrieval failed')

  try {
    const [rows] = await pool.execute(`
        SELECT id, title, content, historic, color, dateNote, hiddenNote, category, folder, pinnedNote, link, reminder
        FROM notes
        WHERE user = ?
      `, [userId])

    if (rows.length === 0) {
      return res.status(200).json({ notes: [], name, lastLogin, maxNoteContentLength, maxDataByteSize, dataByteSize: 0 })
    }

    let dataByteSize = 0

    const notes = rows.map(row => {
      const title = encryption.decryptData(row.title, key)
      const content = encryption.decryptData(row.content, key)
      const historic = encryption.decryptData(row.historic, key)
      const noteSizeInBytes = Buffer.byteLength(title, 'utf8') + Buffer.byteLength(content, 'utf8')
      dataByteSize += noteSizeInBytes

      return {
        id: row.id,
        title,
        content,
        historic,
        color: row.color,
        date: row.dateNote,
        folder: row.folder || null,
        category: row.category || null,
        link: row.link || null,
        hidden: row.hiddenNote,
        pinned: row.pinnedNote,
        reminder: row.reminder || null,
      }
    })

    return res.status(200).json({ notes, name, lastLogin, allUserSessions, maxNoteContentLength, maxDataByteSize, dataByteSize })
  } catch {
    return res.status(401).send('Notes retrieval failed')
  }
})

app.post('/add-note', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { title, content, color, hidden, folder, category, reminder } = req.body
  const userId = req.userId
  const key = await getKey(userId)
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

  if (!userId || !key || !title) return res.status(401).send('Note creation failed')
  if (
    typeof title !== 'string' ||
    typeof content !== 'string' ||
    title.length > 30 ||
    content.length > maxNoteContentLength
  ) {
    return res.status(401).send('Note creation failed')
  }
  if (!allColors.includes(color)) return res.status(401).send('Note creation failed')
  if (reminder && !new Date(reminder).getTime()) return res.status(401).send('Note creation failed')

  const noteId = crypto.randomBytes(12).toString('hex')
  const dateNote = new Date().toISOString().slice(0, 19).replace('T', ' ')

  try {
    await pool.execute(
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
        userId
      ]
    )
    return res.status(200).send('Note created successfully')
  } catch {
    return res.status(401).send('Note creation failed')
  }
})

app.post('/update-note', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { noteId, title, content, color, hidden, folder, category, reminder } = req.body
  const userId = req.userId
  const key = await getKey(userId)
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
  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(401).send('Update failed')
  if (!userId || !key || !title) return res.status(401).send('Update failed')
  if (
    typeof title !== 'string' ||
    typeof content !== 'string' ||
    title.length > 30 ||
    content.length > maxNoteContentLength
  ) {
    return res.status(401).send('Update failed')
  }
  if (!allColors.includes(color)) return res.status(401).send('Update failed')
  if (reminder && !new Date(reminder).getTime()) return res.status(401).send('Update failed')

  const dateNote = new Date().toISOString().slice(0, 19).replace('T', ' ')

  try {
    const [rows] = await pool.execute(
      'SELECT content FROM notes WHERE id = ? AND user = ?',
      [noteId, userId]
    )
    if (rows.length === 0) {
      return res.status(401).send('Update failed')
    }
    const oldContent = rows[0].content

    await pool.execute(`
      UPDATE notes
      SET
        title = ?,
        content = ?,
        historic = ?,
        dateNote = ?,
        color = ?,
        hiddenNote = ?,
        folder = ?,
        category = ?,
        reminder = ?
      WHERE id = ? AND user = ?
    `, [
      encryption.encryptData(title, key),
      encryption.encryptData(content, key),
      oldContent,
      dateNote,
      color,
      hidden,
      folder,
      category,
      reminder,
      noteId,
      userId
    ])
    return res.status(200).send('Note updated successfully')
  } catch {
    return res.status(401).send('Update failed')
  }
})

app.post('/pin-note', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { noteId } = req.body
  const userId = req.userId

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(401).send('Pin note failed')

  try {
    await pool.execute(`
          UPDATE notes
          SET pinnedNote = CASE WHEN pinnedNote = '0' THEN '1' ELSE '0' END
          WHERE id = ? AND user = ?
      `, [noteId, userId])
    return res.status(200).send('Note pinned successfully')
  } catch {
    return res.status(401).send('Pin note failed')
  }
})

app.post('/delete-note', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { noteId } = req.body
  const userId = req.userId

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(401).send('Note deletion failed')

  try {
    await pool.execute("DELETE FROM notes WHERE id = ? AND user = ? AND link IS NULL", [noteId, userId])
    return res.status(200).send('Note deleted successfully')
  } catch {
    return res.status(401).send('Note deletion failed')
  }
})

app.post('/public-note', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { noteId } = req.body
  const userId = req.userId

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(401).send('Note modification failed')

  const noteLink = crypto.randomBytes(16).toString('hex')

  try {
    await pool.execute("UPDATE notes SET link = ? WHERE id = ? AND user = ? AND link IS NULL AND hiddenNote = 0", [noteLink, noteId, userId])
    return res.status(200).send('Note link added successfully')
  } catch {
    return res.status(401).send('Note modification failed')
  }
})

app.post('/private-note', verifyJWTToken, verifyCsrfToken, async (req, res) => {
  const { noteId, noteLink } = req.body
  const userId = req.userId

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(401).send('Note modification failed')
  if (!noteLink || !/^[a-f0-9]{32}$/i.test(noteLink)) return res.status(401).send('Note modification failed')

  try {
    await pool.execute("UPDATE notes SET link = NULL WHERE id = ? AND user = ? AND link = ?", [noteId, userId, noteLink])
    return res.status(200).send('Note link removed successfully')
  } catch {
    return res.status(401).send('Note modification failed')
  }
})

app.post('/get-shared-note', async (req, res) => {
  const { noteLink } = req.body

  if (!noteLink || !/^[a-f0-9]{32}$/i.test(noteLink)) {
    return res.status(401).json('Invalid note link')
  }

  try {
    const [noteRows] = await pool.execute(`
      SELECT title, content, dateNote, user
      FROM notes
      WHERE link = ?
      LIMIT 1
    `, [noteLink])

    if (noteRows.length !== 1) {
      return res.status(404).send('Note not found')
    }

    const { title: encryptedTitle, content: encryptedContent, dateNote, user } = noteRows[0]

    const key = await getKey(user)
    if (!key) return res.status(401).send('Internal server error')

    const note = {
      title: encryption.decryptData(encryptedTitle, key),
      content: encryption.decryptData(encryptedContent, key),
      date: dateNote
    }

    return res.status(200).json(note)
  } catch {
    return res.status(401).send('Internal server error')
  }
})

app.get('/health', (req, res) => {
  return res.status(200).send('OK')
})

export default app
