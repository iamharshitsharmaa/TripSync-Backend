import { Server } from 'socket.io'



const presenceMap = new Map()

function addPresence(tripId, socketId, user) {
  if (!presenceMap.has(tripId)) presenceMap.set(tripId, new Map())
  presenceMap.get(tripId).set(socketId, user)
}

function removePresence(tripId, socketId) {
  presenceMap.get(tripId)?.delete(socketId)
  if (presenceMap.get(tripId)?.size === 0) presenceMap.delete(tripId)
}

function getPresence(tripId) {
  const map = presenceMap.get(tripId)
  if (!map) return []
  
  const seen = new Set()
  const list = []
  for (const user of map.values()) {
    if (!seen.has(user.userId)) { seen.add(user.userId); list.push(user) }
  }
  return list
}


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
    
    const joinedTrips = new Set()

    
    
    socket.on('join:trip', ({ tripId, user }) => {
      if (!tripId) return
      socket.join(`trip:${tripId}`)
      joinedTrips.add(tripId)

      if (user?.userId) {
        socket.data.user = user
        addPresence(tripId, socket.id, user)
        const present = getPresence(tripId)
        io.to(`trip:${tripId}`).emit('presence:update', { tripId, online: present })
      }
    })

    
    socket.on('leave:trip', (tripId) => {
      if (!tripId) return
      socket.leave(`trip:${tripId}`)
      joinedTrips.delete(tripId)
      removePresence(tripId, socket.id)
      io.to(`trip:${tripId}`).emit('presence:update', { tripId, online: getPresence(tripId) })
    })

    
    
    socket.on('presence:get', (tripId) => {
      const present = getPresence(tripId)
      socket.emit('presence:update', {
        tripId,
        online: present,
      })
    })

    
    socket.on('activity-update',  ({ tripId, activity }) => socket.to(`trip:${tripId}`).emit('activity-updated',  activity))
    socket.on('activity-added',   ({ tripId, activity }) => socket.to(`trip:${tripId}`).emit('activity-added',    activity))
    socket.on('activity-deleted', ({ tripId, activityId }) => socket.to(`trip:${tripId}`).emit('activity-deleted', activityId))

    
    socket.on('typing-start', ({ tripId, user }) => socket.to(`trip:${tripId}`).emit('typing-start', { user, socketId: socket.id }))
    socket.on('typing-stop',  ({ tripId })        => socket.to(`trip:${tripId}`).emit('typing-stop',  { socketId: socket.id }))

    
    socket.on('disconnect', () => {
      for (const tripId of joinedTrips) {
        removePresence(tripId, socket.id)
        io.to(`trip:${tripId}`).emit('presence:update', {
          tripId,
          online: getPresence(tripId),
        })
      }
      joinedTrips.clear()
    })
  })

  return io
}