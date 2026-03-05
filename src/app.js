import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes        from './routes/auth.routes.js'
import tripRoutes        from './routes/trip.routes.js'
import memberRoutes      from './routes/member.routes.js'
import activityRoutes    from './routes/activity.routes.js'
import commentRoutes     from './routes/comment.routes.js'
import checklistRoutes   from './routes/checklist.routes.js'
import reservationRoutes from './routes/reservation.routes.js'
import expenseRoutes     from './routes/expense.routes.js'
import uploadRoutes      from './routes/upload.routes.js'

const app = express()

app.use(cors({
  origin: process.env.CLIENT_URL  ,                 // Local development: http://localhost:5173 
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV })
})

// Routes
app.use('/api/auth',  authRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api',       memberRoutes)      // /api/trips/:id/invite, /api/invites/:token/accept, /api/trips/:id/join
app.use('/api',       activityRoutes)    // /api/trips/:id/activities + /api/activities/:id
app.use('/api',       commentRoutes)     // /api/comments
app.use('/api',       checklistRoutes)   // /api/trips/:id/checklists
app.use('/api',       reservationRoutes) // /api/trips/:id/reservations
app.use('/api',       expenseRoutes)     // /api/trips/:id/expenses
app.use('/api',       uploadRoutes)      // /api/upload/trip/:id

// Global error handler — MUST be last
app.use((err, req, res, next) => {
  console.error('ERROR:', err.message)
  console.error(err.stack)
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  })
})

export default app