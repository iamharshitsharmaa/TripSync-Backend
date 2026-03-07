import { Message } from '../models/Message.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'


export const getMessages = asyncHandler(async (req, res) => {
  const tripId = req.params.id
  const page   = Math.max(1, parseInt(req.query.page)  || 1)
  const limit  = Math.min(100, parseInt(req.query.limit) || 50)
  const skip   = (page - 1) * limit

  const [messages, total] = await Promise.all([
    Message.find({ trip: tripId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ trip: tripId }),
  ])

  res.status(200).json(
    new ApiResponse(200, {
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, 'Messages fetched')
  )
})


export const sendMessage = asyncHandler(async (req, res) => {
  const { content } = req.body
  if (!content?.trim()) throw new ApiError(400, 'Message content is required')

  const message = await Message.create({
    trip:    req.params.id,
    sender:  req.user._id,
    content: content.trim(),
    readBy:  [req.user._id],
  })

  const populated = await Message.findById(message._id)

  const io = req.app.get('io')
  if (io) io.to(`trip:${req.params.id}`).emit('new-message', populated)

  res.status(201).json(new ApiResponse(201, populated, 'Message sent'))
})


export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.msgId)
  if (!message) throw new ApiError(404, 'Message not found')

  
  const senderId = message.sender?._id
    ? message.sender._id.toString()
    : message.sender.toString()

  const userId = (req.user._id || req.user.id).toString()

  if (senderId !== userId) throw new ApiError(403, 'Not allowed')

  await message.deleteOne()

  const io = req.app.get('io')
  if (io) io.to(`trip:${req.params.id}`).emit('message-deleted', message._id)

  res.json(new ApiResponse(200, null, 'Message deleted'))
})