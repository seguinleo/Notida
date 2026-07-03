import express from 'express'
import session from 'express-session'
import cors from 'cors'
import { RedisStore } from 'connect-redis'
import routes from './routes.js'
import { pool } from './config/config.js'
import cron from 'node-cron'
import { redisClient } from './config/redis.js'
import { deleteInactiveAccounts } from './cron/cronJobs.js'

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)

const allowedOrigins = [
  process.env.ORIGIN_URL,
]

if (process.env.NODE_ENV === 'production') {
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      return callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-csrf-token']
  }))
}

app.use(express.json({ limit: '100kb' }))

const PORT = process.env.PORT || 3000

try {
  await redisClient.connect()
  console.log('Redis client connected')
} catch (err) {
  console.error(err)
  process.exit(1)
}

const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'notes:',
  ttl: 604800,
  disableTouch: true
})

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is required')
}

app.use(
  session({
    store: redisStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    },
  })
)

app.use('/', routes)

// Each day at 12:00 AM
cron.schedule('0 0 * * *', async () => {
  try {
    await deleteInactiveAccounts()
  } catch (err) {
    console.error('Cron error:', err)
  }
})

const server = app.listen(
  PORT,
  () => {
    console.log(`Server is running on port ${PORT}`)
  })

async function shutdown() {
  server.close()

  await redisClient.quit()
  await pool.end()

  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { redisClient }
