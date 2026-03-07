import { Trip } from '../models/Trip.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'


export const getTrips = asyncHandler(async (req, res) => {
  console.log('GET /trips — user:', req.user?._id)

  const trips = await Trip.find({
    members: {
      $elemMatch: {
        user: req.user._id,
        inviteStatus: 'accepted',
      },
    },
  })
    .populate('owner', 'name avatar')
    .populate('members.user', 'name avatar email')
    .sort({ createdAt: -1 })

  console.log('GET /trips — found:', trips.length)
  res.json(new ApiResponse(200, trips))
})


export const createTrip = asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate, currency, budgetLimit } = req.body

  if (!title)     throw new ApiError(400, 'Title is required')
  if (!startDate) throw new ApiError(400, 'Start date is required')
  if (!endDate)   throw new ApiError(400, 'End date is required')

  const start = new Date(startDate)
  const end   = new Date(endDate)

  if (isNaN(start.getTime())) throw new ApiError(400, 'Invalid start date')
  if (isNaN(end.getTime()))   throw new ApiError(400, 'Invalid end date')
  if (start > end)            throw new ApiError(400, 'Start date must be before end date')

  const trip = await Trip.create({
    title:       title.trim(),
    description: description || '',
    owner:       req.user._id,
    startDate:   start,
    endDate:     end,
    currency:    currency || 'USD',
    budgetLimit: Number(budgetLimit) || 0,
    members: [{
      user:         req.user._id,
      role:         'owner',
      inviteStatus: 'accepted',
    }],
  })

  console.log('POST /trips — created:', trip._id)
  res.status(201).json(new ApiResponse(201, trip, 'Trip created'))
})


export const getTrip = asyncHandler(async (req, res) => {
  console.log('GET /trips/:id —', req.params.id)

  const trip = await Trip.findById(req.params.id)
    .populate('owner', 'name avatar')
    .populate('members.user', 'name email avatar')

  if (!trip) throw new ApiError(404, 'Trip not found')

  res.json(new ApiResponse(200, trip))
})


export const updateTrip = asyncHandler(async (req, res) => {
  const { title, description, startDate, endDate, currency, budgetLimit, status } = req.body
  const trip = req.trip 

  

  if (title)       trip.title       = title.trim()
  if (description !== undefined) trip.description = description
  if (startDate)   trip.startDate   = new Date(startDate)
  if (endDate)     trip.endDate     = new Date(endDate)
  if (currency)    trip.currency    = currency
  if (budgetLimit !== undefined) trip.budgetLimit = Number(budgetLimit) || 0
  if (status)      trip.status      = status

  if ('status' in req.body) {
  trip.status = req.body.status ?? undefined  
}

  await trip.save()
  res.json(new ApiResponse(200, trip, 'Trip updated'))
})


export const deleteTrip = asyncHandler(async (req, res) => {
  await Trip.findByIdAndDelete(req.params.id)
  res.json(new ApiResponse(200, {}, 'Trip deleted'))
})