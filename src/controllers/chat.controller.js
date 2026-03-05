import { Message } from '../models/Message.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

// GET /api/trips/:id/messages?page=1&limit=50
export const getMessages = asyncHandler(async (req, res) => {
  const tripId = req.params.id
  const page   = Math.max(1, parseInt(req.query.page)  || 1)
  const limit  = Math.min(100, parseInt(req.query.limit) || 50)
  const skip   = (page - 1) * limit

  const [messages, total] = await Promise.all([
    Message.find({ trip: tripId })
      .sort({ createdAt: -1 })   // newest first from DB
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ trip: tripId }),
  ])

  // Return oldest-first so the UI can just render in order
  const ordered = messages.reverse()

  res.status(200).json(
    new ApiResponse(200, {
      messages: ordered,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, 'Messages fetched')
  )
})

// POST /api/trips/:id/messages
export const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body
  if (!content?.trim()) throw new ApiError(400, 'Message content is required')

  const message = await Message.create({
    trip:    req.params.id,
    sender:  req.user._id,
    content: content.trim(),
    readBy:  [req.user._id],
  })

  // message is already populated via pre-find hook on create... 
  // but create doesn't trigger pre-find, so fetch it explicitly
  const populated = await Message.findById(message._id)

  // Emit via socket so all room members get it in real time
  // req.io is attached in app.js
  if (req.io) {
    req.io.to(`trip:${req.params.id}`).emit('new-message', populated)
  }

  res.status(201).json(new ApiResponse(201, populated, 'Message sent'))
})

// DELETE /api/trips/:id/messages/:msgId  (only sender or owner)
export const deleteMessage = asyncHandler(async (req, res) => {
  const msg = await Message.findById(req.params.msgId)
  if (!msg) throw new ApiError(404, 'Message not found')

  const isOwner  = req.member?.role === 'owner'
  const isSender = msg.sender._id.toString() === req.user._id.toString()

  if (!isOwner && !isSender) throw new ApiError(403, 'Not allowed')

  await msg.deleteOne()

  if (req.io) {
    req.io.to(`trip:${req.params.id}`).emit('message-deleted', req.params.msgId)
  }

  res.status(200).json(new ApiResponse(200, {}, 'Message deleted'))
})