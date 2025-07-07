import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import routes from './routes.js'
import https from 'https'
import fs from 'fs'

const app = express()

app.use(cors())
app.use(helmet())
app.set('trust proxy', 1)
app.use('/', routes)

const PORT = process.env.PORT || 3000

if (process.env.NODE_ENV === 'production') {
  https
    .createServer({
      key: fs.readFileSync(process.env.SSL_KEY),
      cert: fs.readFileSync(process.env.SSL_CERT),
    }, app)
    .listen(PORT, () => {
      console.log('Server listening on: https://localhost:%s', PORT)
    })
} else {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}
