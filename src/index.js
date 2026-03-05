import dotenv from 'dotenv'
dotenv.config()

import app from './app.js'
import { connectDB } from './config/db.js'
import { initSocket } from './socket/socket.js'

connectDB().then(() => {
  const PORT = process.env.PORT || 5000

  // app.listen() returns a native http.Server — pass it directly to Socket.io
  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`)
  })

  const io = initSocket(server)
  app.set('io', io)   // req.app.get('io') works in all controllers

}).catch((err) => {
  console.error('❌ DB connection failed:', err.message)
  process.exit(1)
})