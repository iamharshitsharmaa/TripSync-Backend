import { Expense } from '../models/Expense.js'
import { Trip } from '../models/Trip.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

export const getExpenses = asyncHandler(async (req, res) => {
  const { tripId } = req.params

  const expenses = await Expense.find({ trip: tripId })
    .populate('paidBy', 'name avatar')
    .sort({ date: -1 })

  
  const summary = await Expense.aggregate([
    { $match: { trip: new Expense().constructor.Types.ObjectId(tripId) } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ])

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  const trip = await Trip.findById(tripId).select('budgetLimit currency')

  res.json(
    new ApiResponse(200, {
      expenses,
      summary,
      total,
      budgetLimit: trip?.budgetLimit || 0,
      currency: trip?.currency || 'INR',
      remaining: (trip?.budgetLimit || 0) - total,
    })
  )
})

export const createExpense = asyncHandler(async (req, res) => {
  const { title, amount, category, date, activity, receiptUrl } = req.body

  const expense = await Expense.create({
    trip: req.params.tripId,
    paidBy: req.user._id,
    title,
    amount,
    category,
    date,
    activity,
    receiptUrl,
  })

  await expense.populate('paidBy', 'name avatar')

  res.status(201).json(new ApiResponse(201, expense))
})