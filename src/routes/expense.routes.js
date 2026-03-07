import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { Expense } from '../models/Expense.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)


router.get('/trips/:tripId/expenses',
  requireTripAccess('viewer'),
  asyncHandler(async (req, res) => {
    const tripObjectId = req.trip._id

    const expenses = await Expense.find({ trip: tripObjectId })
      .populate('paidBy', 'name avatar')
      .populate('splits.user', 'name avatar')
      .sort({ date: -1 })

    const summary = await Expense.aggregate([
      { $match: { trip: tripObjectId } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ])

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    res.json(new ApiResponse(200, { expenses, summary, total }))
  })
)


router.post('/trips/:tripId/expenses',
  requireTripAccess('editor'),
  asyncHandler(async (req, res) => {
    const { title, amount, category, date, activity, receiptUrl, paidBy, notes, splits, isSettlement } = req.body
    if (!title)  throw new ApiError(400, 'Title is required')
    if (!amount) throw new ApiError(400, 'Amount is required')

    const expense = await Expense.create({
      trip:         req.params.tripId,
      paidBy:       paidBy || req.user._id,  
      title,
      amount:       Number(amount),
      category:     category || 'other',
      date:         date ? new Date(date) : new Date(),
      activity:     activity || null,
      receiptUrl:   receiptUrl || '',
      notes:        notes || '',
      isSettlement: isSettlement || false,
      
      splits: Array.isArray(splits)
        ? splits.map(s => ({ user: s.user, amount: Number(s.amount), settled: false }))
        : [],
    })

    await expense.populate('paidBy', 'name avatar')
    await expense.populate('splits.user', 'name avatar')
    res.status(201).json(new ApiResponse(201, expense))
  })
)


router.delete('/expenses/:id',
  asyncHandler(async (req, res) => {
    await Expense.findByIdAndDelete(req.params.id)
    res.json(new ApiResponse(200, {}, 'Deleted'))
  })
)



router.patch('/expenses/:id/splits/:userId/settle',
  asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id)
    if (!expense) throw new ApiError(404, 'Expense not found')

    const split = expense.splits.find(s => s.user?.toString() === req.params.userId)
    if (!split) throw new ApiError(404, 'Split not found')

    split.settled = true
    await expense.save()
    res.json(new ApiResponse(200, expense, 'Split settled'))
  })
)

export default router