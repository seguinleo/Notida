import express from 'express'
import cookieParser from 'cookie-parser'
import { redisClient } from './server.js'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { doubleCsrf } from 'csrf-csrf'
import rateLimit from 'express-rate-limit'
import Encryption from './class/Encryption.js'
import { pool } from './config/config.js'
import passport from './config/passport.js'
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
  getSessionIdentifier: (req) => req.session?.id || req.ip,
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
  message: 'Too many requests, please try again later.',
})

const loginLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 5,
  message: 'Too many requests, please try again later.',
})

const sharedNoteLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 25,
  message: 'Too many requests, please try again later.',
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

/**
 * @function getKey
 * @description Get the encryption/decryption key for a user.
 * Important: This key has to be store in a secure vault like AWS KMS,
 * Azure Key Vault or a self-hosted solution like Hashicorp instead of the mysql database.
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
 * @description Get number of active sessions for a user and clean old sessions.
 */
const getAllUserSessions = async (userId) => {
  try {
    const sessions = await redisClient.sMembers(`user:sessions:${userId}`)

    if (!sessions.length) return 0

    const valid = await Promise.all(
      sessions.map(async (sid) => {
        const exists = await redisClient.exists(`notes:${sid}`)
        if (!exists) {
          await redisClient.sRem(`user:sessions:${userId}`, sid)
          return false
        }
        return true
      })
    )

    return valid.filter(Boolean).length
  } catch {
    return 0
  }
}

/**
 * @description Route to verify if the user is authenticated.
 */
router.post('/whoami', verifySession, (req, res) => {
  return res.json({ isAuthenticated: true })
})

/**
 * @description Route to send CSRF token to client.
 */
router.get("/csrf-token", (req, res) => {
  const token = generateCsrfToken(req, res)
  res.json({ csrfToken: token })
})

const createAccountSchema = z.object({
  nameCreate: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[\p{L} -]+$/u),

  psswdCreate: z.string().min(10).max(64),
})

const loginSchema = z.object({
  nameLogin: z
    .string()
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

  const id = crypto.randomBytes(12).toString('hex')
  const psswdCreateHash = await bcrypt.hash(psswdCreate, 12)
  const keyBase64 = crypto.randomBytes(32).toString('base64')

  try {
    await pool.execute(
      "INSERT INTO users (id, name, psswd, oneKey) VALUES (?, ?, ?, ?)",
      [id, nameCreate, psswdCreateHash, keyBase64]
    )
    return res.status(200).send('Account created successfully')
  } catch {
    return res.status(400).send('Account creation failed')
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
          return res.status(401).send('Wrong username or password.')
        }
      })
    })
  } catch {
    return res.status(401).send('Wrong username or password.')
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
      if (err) return res.status(400).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json('Logged out successfully')
    })
  } catch {
    return res.status(400).json('Internal server error')
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
      if (err) return res.status(400).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json('All devices logged out successfully')
    })
  } catch {
    return res.status(400).json('Internal server error')
  }
})

/**
 * @description Route to update user password. Log out all devices.
 */
router.post('/update-password', verifySession, doubleCsrfProtection, async (req, res) => {
  const userId = req.user.id
  const parsed = updatePasswordSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json('Internal server error')
  }

  const { psswdOld, psswdNew } = parsed.data

  try {
    const [rows] = await pool.execute(
      "SELECT psswd FROM users WHERE id = ? LIMIT 1",
      [userId]
    )

    if (rows.length !== 1 || !(await bcrypt.compare(psswdOld, rows[0].psswd))) {
      return res.status(400).json('Wrong password')
    }

    const psswdNewHash = await bcrypt.hash(psswdNew, 12)

    await pool.execute(
      "UPDATE users SET psswd = ? WHERE id = ?",
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
      if (err) return res.status(400).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json(
        'Password updated. All devices logged out. Please login again.'
      )
    })
  } catch {
    return res.status(400).json('Internal server error')
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
    return res.status(400).json('Internal server error')
  }

  const { psswd } = parsed.data

  try {
    const [rows] = await pool.execute(
      "SELECT psswd FROM users WHERE id = ? LIMIT 1",
      [userId]
    )
    if (rows.length !== 1 || !(await bcrypt.compare(psswd, rows[0].psswd))) {
      return res.status(400).json('Wrong password')
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [userId])

    const sessions = await redisClient.sMembers(`user:sessions:${userId}`)

    if (sessions.length > 0) {
      await Promise.all(
        sessions.map((sid) => redisClient.del(`notes:${sid}`))
      )

      await redisClient.del(`user:sessions:${userId}`)
    }

    req.session.destroy((err) => {
      if (err) return res.status(400).json('Internal server error')
      res.clearCookie('connect.sid')
      res.clearCookie('csrfToken')
      return res.status(200).json(
        'Account deleted successfully. All notes deleted. All devices logged out.'
      )
    })
  } catch {
    return res.status(400).json('Internal server error')
  }
})

const noteSchema = z.object({
  title: z.string().min(1).max(30),
  content: z.string().max(maxNoteContentLength),
  color: z.enum([
    "bg-default",
    "bg-red",
    "bg-orange",
    "bg-yellow",
    "bg-lime",
    "bg-green",
    "bg-cyan",
    "bg-light-blue",
    "bg-blue",
    "bg-purple",
    "bg-pink"
  ]).default("bg-default"),
  hidden: z.number().int().min(0).max(1).default(0),
  category: z.string().max(63).nullable().optional(),
  reminder: z.string().max(63).nullable().optional()
})

const updateNoteSchema = noteSchema.extend({
  noteId: z.string().regex(/^[a-f0-9]{24}$/i)
})

/**
 * @description Route to get all user notes
 */
router.post('/get-notes', verifySession, doubleCsrfProtection, async (req, res) => {
  const userId = req.user.id
  const name = req.user.name
  const key = await getKey(userId)
  const lastLogin = await getLastLogin(userId)
  const allUserSessions = await getAllUserSessions(userId)

  if (!key) return res.status(400).send('Notes retrieval failed')

  try {
    const [rows] = await pool.execute(`
        SELECT id, title, content, historic, color, dateNote, hiddenNote, category, pinnedNote, link, reminder
        FROM notes
        WHERE user = ?
      `, [userId])

    if (rows.length === 0) {
      return res.status(200).json({ notes: [], name, lastLogin, maxNoteContentLength, maxNotesPerUser })
    }

    const notes = rows.map(row => {
      const title = encryption.decryptData(row.title, key)
      const content = encryption.decryptData(row.content, key)
      const historic = encryption.decryptData(row.historic, key)

      return {
        id: row.id,
        title,
        content,
        historic,
        color: row.color,
        date: row.dateNote,
        category: row.category || null,
        link: row.link || null,
        hidden: row.hiddenNote,
        pinned: row.pinnedNote,
        reminder: row.reminder || null,
      }
    })

    return res.status(200).json({ notes, name, lastLogin, allUserSessions, maxNoteContentLength, maxNotesPerUser })
  } catch {
    return res.status(400).send('Notes retrieval failed')
  }
})

router.post('/add-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const parsed = noteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).send('Invalid input')

  const userId = req.user.id

  const [rows] = await pool.execute(
    "SELECT COUNT(*) as count FROM notes WHERE user = ?",
    [userId]
  )

  if (rows[0].count >= maxNotesPerUser) {
    return res.status(403).send('Note limit reached')
  }

  const { title, content, color, hidden, category, reminder } = parsed.data
  const key = await getKey(userId)

  if (!userId || !key || !title) return res.status(400).send('Note creation failed')

  const noteId = crypto.randomBytes(12).toString('hex')
  const dateNote = new Date().toISOString().slice(0, 19).replace('T', ' ')

  try {
    await pool.execute(
      "INSERT INTO notes (id, title, content, dateNote, color, hiddenNote, category, reminder, user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        noteId,
        encryption.encryptData(title.trim(), key),
        encryption.encryptData(content.trim(), key),
        dateNote,
        color,
        hidden,
        category,
        reminder,
        userId
      ]
    )
    return res.status(200).send('Note created successfully')
  } catch {
    return res.status(400).send('Note creation failed')
  }
})

router.post('/update-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const parsed = updateNoteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).send('Invalid input')

  const userId = req.user.id

  const [rows] = await pool.execute(
    "SELECT COUNT(*) as count FROM notes WHERE user = ?",
    [userId]
  )

  if (rows[0].count >= maxNotesPerUser) {
    return res.status(403).send('Note limit reached')
  }

  const { noteId, title, content, color, hidden, category, reminder } = parsed.data
  const key = await getKey(userId)

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(400).send('Update failed')
  if (!userId || !key || !title) return res.status(400).send('Update failed')

  const dateNote = new Date().toISOString().slice(0, 19).replace('T', ' ')

  try {
    const [rows] = await pool.execute(
      'SELECT content FROM notes WHERE id = ? AND user = ?',
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
        dateNote = ?,
        color = ?,
        hiddenNote = ?,
        category = ?,
        reminder = ?
      WHERE id = ? AND user = ?
    `, [
      encryption.encryptData(title.trim(), key),
      encryption.encryptData(content.trim(), key),
      oldContent,
      dateNote,
      color,
      hidden,
      category,
      reminder,
      noteId,
      userId
    ])
    return res.status(200).send('Note updated successfully')
  } catch {
    return res.status(400).send('Update failed')
  }
})

router.post('/pin-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(400).send('Pin note failed')

  try {
    await pool.execute(`
          UPDATE notes
          SET pinnedNote = CASE WHEN pinnedNote = '0' THEN '1' ELSE '0' END
          WHERE id = ? AND user = ?
      `, [noteId, userId])
    return res.status(200).send('Note pinned successfully')
  } catch {
    return res.status(400).send('Pin note failed')
  }
})

router.post('/delete-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(400).send('Note deletion failed')

  try {
    await pool.execute("DELETE FROM notes WHERE id = ? AND user = ? AND link IS NULL", [noteId, userId])
    return res.status(200).send('Note deleted successfully')
  } catch {
    return res.status(400).send('Note deletion failed')
  }
})

router.post('/public-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(400).send('Note modification failed')

  const noteLink = crypto.randomBytes(16).toString('hex')

  try {
    await pool.execute("UPDATE notes SET link = ? WHERE id = ? AND user = ? AND link IS NULL", [noteLink, noteId, userId])
    return res.status(200).send('Note link added successfully')
  } catch {
    return res.status(400).send('Note modification failed')
  }
})

router.post('/private-note', verifySession, doubleCsrfProtection, async (req, res) => {
  const { noteId } = req.body
  const userId = req.user.id

  if (!noteId || !/^[a-f0-9]{24}$/i.test(noteId)) return res.status(400).send('Note modification failed')

  try {
    await pool.execute("UPDATE notes SET link = NULL WHERE id = ? AND user = ?", [noteId, userId])
    return res.status(200).send('Note link removed successfully')
  } catch {
    return res.status(400).send('Note modification failed')
  }
})

router.post('/get-shared-note', sharedNoteLimiter, async (req, res) => {
  const { noteLink } = req.body

  if (!noteLink || !/^[a-f0-9]{32}$/i.test(noteLink)) {
    return res.status(400).json('Invalid note link')
  }

  try {
    const [noteRows] = await pool.execute(`
      SELECT title, content, dateNote, reminder, user
      FROM notes
      WHERE link = ?
      LIMIT 1
    `, [noteLink])

    if (noteRows.length !== 1) {
      return res.status(404).send('Note not found')
    }

    const { title: encryptedTitle, content: encryptedContent, dateNote, reminder, user } = noteRows[0]

    const key = await getKey(user)
    if (!key) return res.status(400).send('Internal server error')

    const note = {
      title: encryption.decryptData(encryptedTitle, key),
      content: encryption.decryptData(encryptedContent, key),
      date: dateNote,
      reminder
    }

    return res.status(200).json(note)
  } catch {
    return res.status(400).send('Internal server error')
  }
})

router.get('/health', (req, res) => {
  return res.status(200).send('OK')
})

export default router
