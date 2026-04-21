import express from 'express'
import helmet from 'helmet'
import { createClient } from 'redis'
import routes from './routes.js'
import cron from 'node-cron'
import { deleteInactiveAccounts } from './cron/cronJobs.js'

const app = express()

app.use(helmet())
app.set('trust proxy', 1)
app.use('/', routes)
app.disable('x-powered-by')

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

// Each day at 12:00 AM
cron.schedule('0 0 * * *', () => {
  deleteInactiveAccounts()
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

export { redisClient }
