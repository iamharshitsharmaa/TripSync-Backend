import { Server } from 'socket.io'

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
     cors: {
      origin: process.env.CLIENT_URL,   // ← reads from Railway env var
      methods: ['GET', 'POST'],
      credentials: true,
    }, 
    // cors: {
    //   origin: "http://localhost:5173",   // local development
    //   methods: ['GET', 'POST'],
    //   credentials: true,
    // },
    transports: ['polling', 'websocket'],
  })

  io.on('connection', (socket) => {

    // ── Trip rooms ──────────────────────────────────────────
    // Use colon style everywhere to match useSocket.js
    socket.on('join:trip', (tripId) => {
      socket.join(`trip:${tripId}`)
      socket.to(`trip:${tripId}`).emit('user-joined', { socketId: socket.id })
    })

    socket.on('leave:trip', (tripId) => {
      socket.leave(`trip:${tripId}`)
    })

    // ── Activities ──────────────────────────────────────────
    socket.on('activity-update', ({ tripId, activity }) => {
      socket.to(`trip:${tripId}`).emit('activity-updated', activity)
    })
    socket.on('activity-added', ({ tripId, activity }) => {
      socket.to(`trip:${tripId}`).emit('activity-added', activity)
    })
    socket.on('activity-deleted', ({ tripId, activityId }) => {
      socket.to(`trip:${tripId}`).emit('activity-deleted', activityId)
    })

    // ── Chat typing indicators ──────────────────────────────
    socket.on('typing-start', ({ tripId, user }) => {
      socket.to(`trip:${tripId}`).emit('typing-start', { user, socketId: socket.id })
    })
    socket.on('typing-stop', ({ tripId }) => {
      socket.to(`trip:${tripId}`).emit('typing-stop', { socketId: socket.id })
    })

    socket.on('disconnect', () => {
      // typing cleanup handled by client-side timeout
    })
  })

  return io
}