import { Comment } from '../models/Comment.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'


export const getComments = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query

  if (!entityType || !entityId) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Missing entityType or entityId'))
  }

  const comments = await Comment.find({ entityType, entityId })
    .populate('author', 'name avatar')
    .sort({ createdAt: 1 })

  res.json(new ApiResponse(200, comments))
})


export const createComment = asyncHandler(async (req, res) => {
  const { tripId, entityType, entityId, content, parentId } = req.body

  if (!tripId || !entityType || !entityId || !content) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, 'Missing required fields'))
  }

  const comment = await Comment.create({
    trip: tripId,
    author: req.user._id,
    entityType,
    entityId,
    content,
    parentId: parentId || null,
  })

  await comment.populate('author', 'name avatar')

  
  const io = req.app.get('io')
  io?.to(`trip:${tripId}`).emit('comment:added', {
    entityType,
    entityId,
    comment,
  })

  res.status(201).json(new ApiResponse(201, comment))
})


export const deleteComment = asyncHandler(async (req, res) => {
  const deleted = await Comment.findOneAndDelete({
    _id: req.params.id,
    author: req.user._id,
  })

  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, 'Comment not found'))
  }

  res.json(new ApiResponse(200, {}, 'Deleted'))
})