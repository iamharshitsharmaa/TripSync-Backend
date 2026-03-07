import { Trip } from '../models/Trip.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const ROLE_LEVEL = { viewer: 1, editor: 2, owner: 3 }


export const requireTripAccess = (minRole = 'viewer') =>
  asyncHandler(async (req, res, next) => {
    const trip = await Trip.findById(req.params.tripId || req.params.id)
    if (!trip) throw new ApiError(404, 'Trip not found')

    const member = trip.members.find(
      m => m.user.toString() === req.user._id.toString() && m.inviteStatus === 'accepted'
    )
    if (!member) throw new ApiError(403, 'Not a member of this trip')

    if (ROLE_LEVEL[member.role] < ROLE_LEVEL[minRole]) {
      throw new ApiError(403, `Requires ${minRole} access`)
    }

    req.trip = trip        
    req.memberRole = member.role
    next()
  })