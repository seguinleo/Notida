import express from 'express'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import argon2 from 'argon2'
import { doubleCsrf } from 'csrf-csrf'
import rateLimit from 'express-rate-limit'
import Encryption from './class/Encryption.js'
import { pool } from './config/config.js'
import passport from './config/passport.js'
import { redisClient } from './config/redis.js'
import { z } from 'zod'

const router = express.Router()
const encryption = new Encryption()

const maxNoteContentLength = 50000
const maxNotesPerUser = 100

const {
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.sessionID,
  cookieName: 'csrfToken',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'Strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  },
  size: 64
})

router.use(cookieParser())

const limiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.'
    })
  }
})

const loginLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.'
    })
  }
})

const sharedNoteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 25,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests, please try again later.'
    })
  }
})

router.use(limiter)

/**
 * @function verifySession
 */
const verifySession = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(403).json({ response: 0 })
  }

  req.user = req.session.user
  next()
}

const uuidSchema = z.string().uuid()

/**
 * @function getKey
 * @description Get the encryption/decryption key for a user.
 * Important: For production, consider using a more secure key management strategy, such as AWS KMS or HashiCorp Vault.
 * The key shoud never be sent to the client!
 */
const getKey = (userId) => {
  if (!uuidSchema.safeParse(userId).success) return null

  return crypto
    .createHmac('sha256', process.env.MASTER_KEY)
    .update(userId)
    .digest()
}

/**
 * @function getAllUserSessions
 * @description Get number of active sessions for a user and clean old sessions.
 */
const getAllUserSessions = async (userId) => {
  try {
    const sessionsKey = `user:sessions:${userId}`
    const sessions = await redisClient.sMembers(sessionsKey)

    if (sessions.length === 0) {
      return 0
    }

    const pipeline = redisClient.multi()

    for (const sid of sessions) {
      pipeline.ttl(`notes:${sid}`)
    }

    const results = await pipeline.exec()

    let activeSessions = 0
    const expiredSessions = []

    results.forEach((ttl, index) => {
      if (ttl > 0) {
        activeSessions++
      } else {
        expiredSessions.push(sessions[index])
      }
    })

    if (expiredSessions.length > 0) {
      await redisClient.sRem(sessionsKey, expiredSessions)
    }

    if (activeSessions === 0) {
      await redisClient.del(sessionsKey)
    }

    return activeSessions
  } catch {
    return 0
  }
}

/**
 * @description Route to verify if the user is authenticated and return csrf token
 */
router.get('/whoami', (req, res) => {
  if (!req.session?.user) {
    return res.json({ isAuthenticated: false })
  }

  const token = generateCsrfToken(req, res)

  return res.json({
    isAuthenticated: true,
    csrfToken: token
  })
})

const createAccountSchema = z.object({
  nameCreate: z
    .string()
    .normalize('NFKC')
    .trim()
    .min(3)
    .max(30)
    .regex(/^[\p{L} -]+$/u),

  psswdCreate: z.string().min(10).max(64),
})

const loginSchema = z.object({
  nameLogin: z
    .string()
    .normalize('NFKC')
    .trim()
    .min(3)
    .max(30)
    .regex(/^[\p{L} -]+$/u),

  psswdLogin: z.string().min(10).max(64),
})

const updatePasswordSchema = z.object({
  psswdOld: z.string().min(10).max(64),
  psswdNew: z.string().min(10).max(64),
})

const deleteAccountSchema = z.object({
  psswd: z.string().min(10).max(64),
})

/**
 * @description Route to create a new user account.
 */
router.post('/create-account', async (req, res) => {
  const parsed = createAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).send('Account creation failed')
  }

  const { nameCreate, psswdCreate } = parsed.data

  const userId = crypto.randomUUID()
  const psswdCreateHash = await argon2.hash(psswdCreate)
  const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ')

  try {
    await pool.execute(
      'INSERT INTO users (id, name, psswd, creationDate) VALUES (?, ?, ?, ?)',
      [userId, nameCreate, psswdCreateHash, currentDate]
    )
    return res.status(200).send('Account created successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

/**
 * @description Route to log in a user.
 */
router.post('/login', loginLimiter, async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(401).send('Wrong username or password.')
  }

  try {
    const user = await new Promise((resolve, reject) => {
      passport.authenticate('local', { session: false }, (err, user) => {
        if (err) return reject(err)
        resolve(user)
      })(req, res, next)
    })

    if (!user) {
      return res.status(401).send('Wrong username or password.')
    }

    req.session.regenerate((err) => {
      if (err) return res.status(401).send('Wrong username or password.')

      req.session.user = {
        id: user.id,
        name: user.name,
      }

      req.session.save(async (err) => {
        if (err) return res.status(401).send('Wrong username or password.')

        try {
          await redisClient.sAdd(
            `user:sessions:${user.id}`,
            req.sessionID
          )

          await pool.execute(
            'UPDATE users SET lastLogin = NOW() WHERE id = ?',
            [user.id]
          )

          return res.status(200).send('Logged in!')
        } catch {
          return res.status(500).json('Internal server error')
        }
      })
    })
  } catch {
    return res.status(500).json('Internal server error')
  }
})

/**
 * @description Route to log out only current device.
 */
router.post('/logout', verifySession, doubleCsrfProtection, async (req, res) => {
  const userId = req.user.id

  try {
    await redisClient.sRem(`user:sessions:${userId}`, req.sessionID)

    req.session.destroy((err) => {
      if (err) return res.status(500).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json('Logged out successfully')
    })
  } catch {
    return res.status(500).json('Internal server error')
  }
})

/**
 * @description Route to log out all devices for a user.
 */
router.post('/logout-all', verifySession, doubleCsrfProtection, async (req, res) => {
  const userId = req.user.id

  try {
    const sessionKeys = await redisClient.sMembers(`user:sessions:${userId}`)

    if (sessionKeys.length > 0) {
      await Promise.all(
        sessionKeys.map(async (sid) => {
          await redisClient.del(`notes:${sid}`)
        })
      )
    }

    await redisClient.del(`user:sessions:${userId}`)

    req.session.destroy((err) => {
      if (err) return res.status(500).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json('All devices logged out successfully')
    })
  } catch {
    return res.status(500).json('Internal server error')
  }
})

/**
 * @description Route to update user password. Log out all devices.
 */
router.post('/update-password', verifySession, doubleCsrfProtection, async (req, res) => {
  const userId = req.user.id
  const parsed = updatePasswordSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json('Invalid input')
  }

  const { psswdOld, psswdNew } = parsed.data

  try {
    const [rows] = await pool.execute(
      'SELECT psswd FROM users WHERE id = ? LIMIT 1',
      [userId]
    )

    if (rows.length !== 1 || !(await argon2.verify(rows[0].psswd, psswdOld))) {
      return res.status(400).json('Wrong password')
    }

    const psswdNewHash = await argon2.hash(psswdNew)

    await pool.execute(
      'UPDATE users SET psswd = ? WHERE id = ?',
      [psswdNewHash, userId]
    )

    const sessions = await redisClient.sMembers(`user:sessions:${userId}`)

    if (sessions.length > 0) {
      await Promise.all(
        sessions.map((sid) => redisClient.del(`notes:${sid}`))
      )

      await redisClient.del(`user:sessions:${userId}`)
    }

    req.session.destroy((err) => {
      if (err) return res.status(500).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json(
        'Password updated. All devices logged out. Please login again.'
      )
    })
  } catch {
    return res.status(500).json('Internal server error')
  }
})

/**
 * @description Route to delete an account and all notes ON DELETE CASCADE.
 * Log out all devices.
 */
router.post('/delete-account', verifySession, doubleCsrfProtection, async (req, res) => {
  const userId = req.user.id
  const parsed = deleteAccountSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json('Invalid input')
  }

  const { psswd } = parsed.data

  try {
    const [rows] = await pool.execute(
      'SELECT psswd FROM users WHERE id = ? LIMIT 1',
      [userId]
    )
    if (rows.length !== 1 || !(await argon2.verify(rows[0].psswd, psswd))) {
      return res.status(400).json('Wrong password')
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [userId])

    const sessions = await redisClient.sMembers(`user:sessions:${userId}`)

    if (sessions.length > 0) {
      await Promise.all(
        sessions.map((sid) => redisClient.del(`notes:${sid}`))
      )

      await redisClient.del(`user:sessions:${userId}`)
    }

    req.session.destroy((err) => {
      if (err) return res.status(500).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json(
        'Account deleted successfully. All notes deleted. All devices logged out.'
      )
    })
  } catch {
    return res.status(500).json('Internal server error')
  }
})

const noteSchema = z.object({
  title: z.string().min(1).max(30),
  content: z.string().max(maxNoteContentLength),
  date: z.string(),
  color: z.enum([
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
    'bg-pink'
  ]).default('bg-default'),
  hidden: z.number().int().min(0).max(1).default(0),
  category: z.string().max(63).nullable().optional(),
  reminder: z.string().max(63).nullable().optional()
})

const updateNoteSchema = noteSchema.extend({
  noteId: uuidSchema
})

/**
 * @description Route to get all user notes
 */
router.post(
  '/get-notes',
  verifySession,
  doubleCsrfProtection,
  async (req, res) => {
    const userId = req.user.id
    const name = req.user.name

    const key = getKey(userId)

    if (!key) {
      return res.status(400).send('Notes retrieval failed')
    }

    try {
      const [
        [userRows],
        allUserSessions,
        [noteRows]
      ] = await Promise.all([
        pool.execute(
          'SELECT lastLogin FROM users WHERE id = ? LIMIT 1',
          [userId]
        ),
        getAllUserSessions(userId),
        pool.execute(`
          SELECT
            id,
            title,
            content,
            historic,
            color,
            updateDate,
            hiddenNote,
            category,
            pinnedNote,
            link,
            reminder
          FROM notes
          WHERE userId = ?
        `, [userId])
      ])

      const lastLogin =
        userRows.length === 1
          ? userRows[0].lastLogin
          : 0

      const notes = noteRows.map(row => ({
        id: row.id,
        title: encryption.decryptData(row.title, key),
        content: encryption.decryptData(row.content, key),
        historic: row.historic
          ? encryption.decryptData(row.historic, key)
          : '',
        color: row.color,
        date: row.updateDate,
        category: row.category,
        link: row.link,
        hidden: row.hiddenNote,
        pinned: row.pinnedNote,
        reminder: row.reminder
      }))

      return res.status(200).json({
        notes,
        name,
        lastLogin,
        allUserSessions,
        maxNoteContentLength,
        maxNotesPerUser
      })
    } catch {
      return res.status(500).json('Internal server error')
    }
  }
)

router.post('/get-note-date', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!uuidSchema.safeParse(noteId).success) {
    return res.status(400).send('Invalid note id')
  }

  try {
    const [rows] = await pool.execute(
      'SELECT updateDate FROM notes WHERE id = ? AND userId = ?',
      [noteId, userId]
    )
    if (rows.length !== 1) {
      return res.status(400).send('Note retrieval failed')
    }
    return res.status(200).json({ date: rows[0].updateDate })
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/add-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const parsed = noteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).send('Invalid input')

  const userId = req.user.id

  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM notes WHERE userId = ?',
      [userId]
    )

    if (rows[0].count >= maxNotesPerUser) {
      return res.status(403).send('Note limit reached')
    }
  } catch {
    return res.status(500).json('Internal server error')
  }

  const { title, content, date, color, hidden, category, reminder } = parsed.data
  const key = getKey(userId)

  if (!userId || !key || !title) return res.status(400).send('Note creation failed')

  const noteId = crypto.randomUUID()

  try {
    await pool.execute(
      'INSERT INTO notes (id, title, content, creationDate, updateDate, color, hiddenNote, category, reminder, userId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        noteId,
        encryption.encryptData(title.trim(), key),
        encryption.encryptData(content.trim(), key),
        date,
        date,
        color,
        hidden,
        category,
        reminder,
        userId
      ]
    )
    return res.status(200).send('Note created successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/update-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const parsed = updateNoteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).send('Invalid input')

  const userId = req.user.id
  const { noteId, title, content, date, color, hidden, category, reminder } = parsed.data
  const key = getKey(userId)

  if (!uuidSchema.safeParse(noteId).success) {
    return res.status(400).send('Invalid note id')
  }
  if (!userId || !key || !title) return res.status(400).send('Update failed')

  try {
    const [rows] = await pool.execute(
      'SELECT content FROM notes WHERE id = ? AND userId = ?',
      [noteId, userId]
    )
    if (rows.length === 0) {
      return res.status(400).send('Update failed')
    }
    const oldContent = rows[0].content

    await pool.execute(`
      UPDATE notes
      SET
        title = ?,
        content = ?,
        historic = ?,
        updateDate = ?,
        color = ?,
        hiddenNote = ?,
        category = ?,
        reminder = ?
      WHERE id = ? AND userId = ?
    `, [
      encryption.encryptData(title.trim(), key),
      encryption.encryptData(content.trim(), key),
      oldContent,
      date,
      color,
      hidden,
      category,
      reminder,
      noteId,
      userId
    ])
    return res.status(200).send('Note updated successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/pin-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!uuidSchema.safeParse(noteId).success) {
    return res.status(400).send('Invalid note id')
  }

  try {
    await pool.execute(`
          UPDATE notes
          SET pinnedNote = CASE WHEN pinnedNote = '0' THEN '1' ELSE '0' END
          WHERE id = ? AND userId = ?
      `, [noteId, userId])
    return res.status(200).send('Note pinned successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/delete-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!uuidSchema.safeParse(noteId).success) {
    return res.status(400).send('Invalid note id')
  }

  try {
    await pool.execute('DELETE FROM notes WHERE id = ? AND userId = ? AND link IS NULL', [noteId, userId])
    return res.status(200).send('Note deleted successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/public-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!uuidSchema.safeParse(noteId).success) {
    return res.status(400).send('Invalid note id')
  }

  const noteLink = crypto.randomBytes(16).toString('hex')

  try {
    await pool.execute('UPDATE notes SET link = ? WHERE id = ? AND userId = ? AND link IS NULL', [noteLink, noteId, userId])
    return res.status(200).send('Note link added successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/private-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!uuidSchema.safeParse(noteId).success) {
    return res.status(400).send('Invalid note id')
  }

  try {
    await pool.execute('UPDATE notes SET link = NULL WHERE id = ? AND userId = ?', [noteId, userId])
    return res.status(200).send('Note link removed successfully')
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.post('/get-shared-note', sharedNoteLimiter, async (req, res) => {
  const { noteLink } = req.body

  if (!noteLink || !/^[a-f0-9]{32}$/i.test(noteLink)) {
    return res.status(400).json('Invalid note link')
  }

  try {
    const [noteRows] = await pool.execute(`
      SELECT title, content, updateDate, reminder, userId
      FROM notes
      WHERE link = ?
      LIMIT 1
    `, [noteLink])

    if (noteRows.length !== 1) {
      return res.status(404).send('Note not found')
    }

    const { title: encryptedTitle, content: encryptedContent, updateDate, reminder, userId } = noteRows[0]

    const key = getKey(userId)
    if (!key) return res.status(400).send('Internal server error')

    const note = {
      title: encryption.decryptData(encryptedTitle, key),
      content: encryption.decryptData(encryptedContent, key),
      date: updateDate,
      reminder
    }

    return res.status(200).json(note)
  } catch {
    return res.status(500).json('Internal server error')
  }
})

router.get('/health', (req, res) => {
  return res.status(200).send('OK')
})

export default router
