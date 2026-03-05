import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin:     'http://localhost:5173' , // Change to your frontend URL in production   ||    process.env.CLIENT_URL
      credentials: true,
      methods:     ['GET', 'POST'],
    },
    // Allow both websocket and polling — polling is fallback if WS fails
    transports: ['websocket', 'polling'],
  })

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
      if (!token) return next(new Error('No token'))

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user    = await User.findById(decoded._id).select('name avatar')
      if (!user) return next(new Error('User not found'))

      socket.user = user
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user?.name}`)

    socket.on('join:trip', (tripId) => {
      socket.join(`trip:${tripId}`)
      console.log(`${socket.user?.name} joined trip:${tripId}`)
    })

    socket.on('leave:trip', (tripId) => {
      socket.leave(`trip:${tripId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user?.name}`)
    })
  })

  return io
}