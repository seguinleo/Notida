import express from 'express'
import session from 'express-session'
import { RedisStore } from 'connect-redis'
import helmet from 'helmet'
import { createClient } from 'redis'
import routes from './routes.js'
import cron from 'node-cron'
import { deleteInactiveAccounts } from './cron/cronJobs.js'

const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet())
app.use(express.json({ limit: '50kb' }))

const PORT = process.env.PORT || 3000

const redisClient = createClient({
  url: process.env.REDIS_URL,
})

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
})

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
    },
  })
)

app.use('/', routes)

// Each day at 12:00 AM
cron.schedule('0 0 * * *', () => {
  deleteInactiveAccounts()
})

app.listen(
  PORT,
  //'127.0.0.1',
  () => {
    console.log(`Server is running on port ${PORT}`)
  })

export { redisClient }
