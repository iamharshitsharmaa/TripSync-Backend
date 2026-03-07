import 'dotenv/config'

import app from './app.js'
import { connectDB } from './config/db.js'
import { initSocket } from './socket/socket.js'


connectDB().then(() => {
  const PORT = process.env.PORT || 5000

  const server = app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`)
  })

  const io = initSocket(server)
  app.set('io', io)

}).catch((err) => {
  console.error('❌ DB connection failed:', err.message)
  process.exit(1)
})