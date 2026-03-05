import dotenv from 'dotenv'
dotenv.config()

import { createServer } from 'http'
import app from './app.js'
import { connectDB } from './config/db.js'
import { initSocket } from './socket/socket.js'

const httpServer = createServer(app)

if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv')
  dotenv.default.config()
}

connectDB().then(() => {
  const io = initSocket(httpServer)
  app.use((req, _res, next) => { req.io = io; next() })
  app.set('io', io)

  const PORT = process.env.PORT || 5000
  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`)
  })
}).catch((err) => {
  console.error('❌ DB connection failed:', err.message)
  process.exit(1)
})


