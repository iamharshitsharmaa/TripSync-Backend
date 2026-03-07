import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { Comment } from '../models/Comment.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)


router.get('/comments', asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query
  if (!entityType || !entityId) throw new ApiError(400, 'entityType and entityId are required')

  const comments = await Comment.find({ entityType, entityId })
    .populate('author', 'name avatar')
    .sort({ createdAt: 1 })

  res.json(new ApiResponse(200, comments))
}))


router.post('/comments', asyncHandler(async (req, res) => {
  const { tripId, entityType, entityId, content, parentId } = req.body

  if (!tripId || !entityType || !entityId || !content) {
    throw new ApiError(400, 'tripId, entityType, entityId and content are required')
  }

  const comment = await Comment.create({
    trip:       tripId,
    author:     req.user._id,
    entityType,
    entityId,
    content:    content.trim(),
    parentId:   parentId || null,
  })

  await comment.populate('author', 'name avatar')

  
  req.app.get('io')
    ?.to(`trip:${tripId}`)
    .emit('comment:added', { entityType, entityId, comment })

  res.status(201).json(new ApiResponse(201, comment, 'Comment posted'))
}))


router.delete('/comments/:id', asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({
    _id:    req.params.id,
    author: req.user._id,
  })

  if (!comment) throw new ApiError(404, 'Comment not found or not yours')

  await comment.deleteOne()
  res.json(new ApiResponse(200, {}, 'Comment deleted'))
}))

export default router
