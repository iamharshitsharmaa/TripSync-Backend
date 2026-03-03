import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { Expense } from '../models/Expense.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)

// GET /api/trips/:tripId/expenses
router.get('/trips/:tripId/expenses',
  requireTripAccess('viewer'),
  asyncHandler(async (req, res) => {
    const tripObjectId = req.trip._id

    const expenses = await Expense.find({ trip: tripObjectId })
      .populate('paidBy', 'name avatar')
      .sort({ date: -1 })

    // Aggregation for category breakdown
    const summary = await Expense.aggregate([
      { $match: { trip: tripObjectId } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ])

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)

    res.json(new ApiResponse(200, { expenses, summary, total }))
  })
)

// POST /api/trips/:tripId/expenses
router.post('/trips/:tripId/expenses',
  requireTripAccess('editor'),
  asyncHandler(async (req, res) => {
    const { title, amount, category, date, activity, receiptUrl } = req.body
    if (!title)  throw new ApiError(400, 'Title is required')
    if (!amount) throw new ApiError(400, 'Amount is required')

    const expense = await Expense.create({
      trip:       req.params.tripId,
      paidBy:     req.user._id,
      title,
      amount:     Number(amount),
      category:   category || 'other',
      date:       date ? new Date(date) : new Date(),
      activity:   activity || null,
      receiptUrl: receiptUrl || '',
    })
    await expense.populate('paidBy', 'name avatar')
    res.status(201).json(new ApiResponse(201, expense))
  })
)

// DELETE /api/expenses/:id
router.delete('/expenses/:id',
  asyncHandler(async (req, res) => {
    await Expense.findByIdAndDelete(req.params.id)
    res.json(new ApiResponse(200, {}, 'Deleted'))
  })
)

export default router