import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import useAuthStore from '../store/authStore'

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'http://localhost:5000'

let socket = null

export function useSocket(tripId) {
  const { accessToken } = useAuthStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!accessToken || !tripId) return

    // 🔌 Connect
    socket = io(SOCKET_URL, {
      auth: { token: accessToken },
    })

    socket.emit('join:trip', tripId)

    // 🔄 React Query auto-refetch on socket events
    socket.on('activity:created', () =>
      queryClient.invalidateQueries(['activities', tripId])
    )

    socket.on('activity:updated', () =>
      queryClient.invalidateQueries(['activities', tripId])
    )

    socket.on('activity:reordered', () =>
      queryClient.invalidateQueries(['activities', tripId])
    )

    socket.on('activity:deleted', () =>
      queryClient.invalidateQueries(['activities', tripId])
    )

    socket.on('comment:added', (data) =>
      queryClient.invalidateQueries([
        'comments',
        data.entityType,
        data.entityId,
      ])
    )

    return () => {
      socket.emit('leave:trip', tripId)
      socket.disconnect()
    }
  }, [tripId, accessToken, queryClient])

  return socket
}