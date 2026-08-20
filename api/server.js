import express from 'express'
import cors from 'cors'
import cron from 'node-cron'
import routes from './routes.js'
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

app.use('/', routes)

// Each day at 12:00 AM
cron.schedule('0 0 * * *', async () => {
  try {
    await deleteInactiveAccounts()
  } catch (err) {
    console.error('Cron error:', err)
  }
})

app.listen(
  PORT,
  // '127.0.0.1',
  () => {
    console.log(`Server is running on port ${PORT}`)
  })
