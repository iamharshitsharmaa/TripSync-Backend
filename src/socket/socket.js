import { Server } from 'socket.io'

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,   // ← reads from Railway env var
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['polling', 'websocket'],
  })

  io.on('connection', (socket) => {
    // Join a trip room
    socket.on('join-trip', (tripId) => {
      socket.join(`trip:${tripId}`)
    })

    // Leave a trip room
    socket.on('leave-trip', (tripId) => {
      socket.leave(`trip:${tripId}`)
    })

    // Broadcast activity changes to everyone else in the room
    socket.on('activity-update', ({ tripId, activity }) => {
      socket.to(`trip:${tripId}`).emit('activity-updated', activity)
    })

    socket.on('activity-added', ({ tripId, activity }) => {
      socket.to(`trip:${tripId}`).emit('activity-added', activity)
    })

    socket.on('activity-deleted', ({ tripId, activityId }) => {
      socket.to(`trip:${tripId}`).emit('activity-deleted', activityId)
    })

    socket.on('disconnect', () => {})
  })

  return io
}