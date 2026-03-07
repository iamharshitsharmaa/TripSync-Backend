import { Router } from 'express'
import crypto from 'crypto'
import mongoose from 'mongoose'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { Trip } from '../models/Trip.js'
import { User } from '../models/User.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)


router.post('/join',
  asyncHandler(async (req, res) => {
    const { code } = req.body
    if (!code) throw new ApiError(400, 'Invite code is required')

    const trip = await Trip.findOne({ inviteCode: code.trim().toUpperCase() })
    if (!trip) throw new ApiError(404, 'Invalid invite code. Check the code and try again.')

    
    const already = trip.members.find(
      m => m.user.toString() === req.user._id.toString() && m.inviteStatus === 'accepted'
    )
    if (already) {
      return res.json(new ApiResponse(200, {
        tripId:    trip._id,
        tripTitle: trip.title,
        alreadyMember: true,
      }, 'You are already a member of this trip'))
    }

    
    trip.members.push({
      user:         req.user._id,
      role:         'viewer',
      inviteStatus: 'accepted',
    })
    await trip.save()

    res.json(new ApiResponse(200, {
      tripId:    trip._id,
      tripTitle: trip.title,
      alreadyMember: false,
    }, `Joined "${trip.title}" successfully!`))
  })
)


router.post('/trips/:tripId/invite',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const { email, role = 'editor' } = req.body
    if (!email) throw new ApiError(400, 'Email is required')

    const trip = req.trip

    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      const already = trip.members.find(
        m => m.user.toString() === existingUser._id.toString()
      )
      if (already) throw new ApiError(409, 'User is already a member')
    }

    const token  = crypto.randomBytes(32).toString('hex')
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000) 

    trip.members.push({
      user:         existingUser?._id || new mongoose.Types.ObjectId(),
      role,
      inviteStatus: 'pending',
      inviteToken:  token,
      tokenExpiry:  expiry,
      inviteEmail:  email.toLowerCase(),
    })
    await trip.save()

    
    try {
      const { sendInviteEmail } = await import('../services/email.service.js')
      await sendInviteEmail({
        to:          email,
        inviterName: req.user.name,
        tripTitle:   trip.title,
        inviteLink:  `${process.env.CLIENT_URL}/invite/${token}`,
      })
    } catch (err) {
      console.warn('Email failed (non-fatal):', err.message)
    }

    res.json(new ApiResponse(200, {
      message:    'Invite sent',
      inviteLink: `${process.env.CLIENT_URL}/invite/${token}`,
    }))
  })
)


router.post('/invites/:token/accept',
  asyncHandler(async (req, res) => {
    const { token } = req.params
    const trip = await Trip.findOne({ 'members.inviteToken': token })
    if (!trip) throw new ApiError(404, 'Invalid or expired invite link')

    const member = trip.members.find(m => m.inviteToken === token)
    if (!member) throw new ApiError(404, 'Invite not found')
    if (member.tokenExpiry < new Date()) throw new ApiError(400, 'Invite link has expired')

    
    const alreadyMember = trip.members.find(
      m => m.user.toString() === req.user._id.toString() && m.inviteStatus === 'accepted'
    )
    if (alreadyMember) {
      return res.json(new ApiResponse(200, { tripId: trip._id }, 'Already a member'))
    }

    member.user         = req.user._id
    member.inviteStatus = 'accepted'
    member.inviteToken  = undefined
    member.tokenExpiry  = undefined
    await trip.save()

    res.json(new ApiResponse(200, { tripId: trip._id }, 'Joined trip successfully'))
  })
)


router.post('/trips/:tripId/invite-code/regenerate',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const trip = req.trip
    trip.inviteCode = generateCode()
    await trip.save()
    res.json(new ApiResponse(200, { inviteCode: trip.inviteCode }))
  })
)


router.patch('/trips/:tripId/members/:userId',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const { role } = req.body
    if (!['editor', 'viewer'].includes(role)) throw new ApiError(400, 'Invalid role')
    const member = req.trip.members.find(m => m.user.toString() === req.params.userId)
    if (!member) throw new ApiError(404, 'Member not found')
    member.role = role
    await req.trip.save()
    res.json(new ApiResponse(200, {}, 'Role updated'))
  })
)


router.delete('/trips/:tripId/members/:userId',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const member = req.trip.members.find(m => m.user.toString() === req.params.userId)
    if (!member) throw new ApiError(404, 'Member not found')
    if (member.role === 'owner') throw new ApiError(403, 'Cannot remove the owner')
    req.trip.members = req.trip.members.filter(m => m.user.toString() !== req.params.userId)
    await req.trip.save()
    res.json(new ApiResponse(200, {}, 'Member removed'))
  })
)

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default router