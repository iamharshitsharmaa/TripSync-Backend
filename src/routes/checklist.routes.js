import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { Checklist } from '../models/Checklist.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)


router.get('/trips/:tripId/checklists',
  requireTripAccess('viewer'),
  asyncHandler(async (req, res) => {
    const lists = await Checklist.find({ trip: req.params.tripId })
    res.json(new ApiResponse(200, lists))
  })
)


router.post('/trips/:tripId/checklists',
  requireTripAccess('editor'),
  asyncHandler(async (req, res) => {
    const { title, type } = req.body
    if (!title) throw new ApiError(400, 'Title is required')
    const list = await Checklist.create({ trip: req.params.tripId, title, type: type || 'custom' })
    res.status(201).json(new ApiResponse(201, list))
  })
)


router.post('/checklists/:id/items',
  asyncHandler(async (req, res) => {
    const { text } = req.body
    if (!text) throw new ApiError(400, 'Item text is required')
    const list = await Checklist.findById(req.params.id)
    if (!list) throw new ApiError(404, 'Checklist not found')
    list.items.push({ text, position: list.items.length, isChecked: false })
    await list.save()
    res.json(new ApiResponse(200, list))
  })
)


router.patch('/checklists/:id/items/:itemId',
  asyncHandler(async (req, res) => {
    const { isChecked, assignedTo } = req.body
    const list = await Checklist.findById(req.params.id)
    if (!list) throw new ApiError(404, 'Checklist not found')
    const item = list.items.id(req.params.itemId)
    if (!item) throw new ApiError(404, 'Item not found')
    if (isChecked !== undefined) item.isChecked = isChecked
    if (assignedTo !== undefined) item.assignedTo = assignedTo
    await list.save()
    res.json(new ApiResponse(200, list))
  })
)


router.delete('/checklists/:id/items/:itemId',
  asyncHandler(async (req, res) => {
    const list = await Checklist.findById(req.params.id)
    if (!list) throw new ApiError(404, 'Checklist not found')
    list.items.pull({ _id: req.params.itemId })
    await list.save()
    res.json(new ApiResponse(200, list))
  })
)


router.delete('/checklists/:id',
  asyncHandler(async (req, res) => {
    await Checklist.findByIdAndDelete(req.params.id)
    res.json(new ApiResponse(200, {}, 'Checklist deleted'))
  })
)

export default router