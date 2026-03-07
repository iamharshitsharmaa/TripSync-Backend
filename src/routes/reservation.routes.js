import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { Reservation } from '../models/Reservation.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)


router.get('/trips/:tripId/reservations', requireTripAccess('viewer'), asyncHandler(async (req, res) => {
  const list = await Reservation.find({ trip: req.params.tripId }).sort({ checkIn: 1 })
  res.json(new ApiResponse(200, list))
}))


router.post('/trips/:tripId/reservations', requireTripAccess('editor'), asyncHandler(async (req, res) => {
  const { title, type, confirmationNo, checkIn, checkOut, notes } = req.body
  const res_ = await Reservation.create({ trip: req.params.tripId, title, type, confirmationNo, checkIn, checkOut, notes })
  res.status(201).json(new ApiResponse(201, res_))
}))


router.delete('/reservations/:id', asyncHandler(async (req, res) => {
  await Reservation.findByIdAndDelete(req.params.id)
  res.json(new ApiResponse(200, {}, 'Deleted'))
}))

export default router