import { Router } from 'express'
import crypto from 'crypto'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { Trip } from '../models/Trip.js'
import { User } from '../models/User.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)

// ── POST /api/trips/:tripId/invite  (invite by email)
router.post('/trips/:tripId/invite',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const { email, role = 'editor' } = req.body
    if (!email) throw new ApiError(400, 'Email is required')

    const trip = req.trip

    // Check if user already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      const already = trip.members.find(
        m => m.user.toString() === existingUser._id.toString()
      )
      if (already) throw new ApiError(409, 'User is already a member')
    }

    const token   = crypto.randomBytes(32).toString('hex')
    const expiry  = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    // Add pending member
    trip.members.push({
      user:         existingUser?._id || new (await import('mongoose')).default.Types.ObjectId(),
      role,
      inviteStatus: 'pending',
      inviteToken:  token,
      tokenExpiry:  expiry,
      inviteEmail:  email.toLowerCase(),
    })
    await trip.save()

    // Try to send email — don't crash if email fails
    try {
      const { sendInviteEmail } = await import('../services/email.service.js')
      await sendInviteEmail({
        to:          email,
        inviterName: req.user.name,
        tripTitle:   trip.title,
        inviteLink:  `${process.env.CLIENT_URL}/invite/${token}`,
      })
    } catch (emailErr) {
      console.warn('Email send failed (non-fatal):', emailErr.message)
    }

    res.json(new ApiResponse(200, {
      message: 'Invite sent',
      // Return token so frontend can show manual link if email fails
      inviteLink: `${process.env.CLIENT_URL}/invite/${token}`,
    }))
  })
)

// ── POST /api/invites/:token/accept  (accept email invite)
router.post('/invites/:token/accept',
  asyncHandler(async (req, res) => {
    const { token } = req.params
    const trip = await Trip.findOne({ 'members.inviteToken': token })
    if (!trip) throw new ApiError(404, 'Invalid or expired invite link')

    const member = trip.members.find(m => m.inviteToken === token)
    if (!member) throw new ApiError(404, 'Invite not found')
    if (member.tokenExpiry < new Date()) throw new ApiError(400, 'Invite link has expired')

    // Check not already a member
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

// ── POST /api/trips/:tripId/join  (join by invite code)
router.post('/trips/:tripId/join',
  asyncHandler(async (req, res) => {
    const { code } = req.body
    if (!code) throw new ApiError(400, 'Invite code is required')

    const trip = await Trip.findOne({
      _id:        req.params.tripId,
      inviteCode: code.toUpperCase(),
    })
    if (!trip) throw new ApiError(404, 'Invalid invite code')

    // Check not already a member
    const already = trip.members.find(
      m => m.user.toString() === req.user._id.toString()
    )
    if (already) {
      return res.json(new ApiResponse(200, { tripId: trip._id }, 'Already a member'))
    }

    trip.members.push({
      user:         req.user._id,
      role:         'viewer',
      inviteStatus: 'accepted',
    })
    await trip.save()

    res.json(new ApiResponse(200, { tripId: trip._id }, 'Joined trip'))
  })
)

// ── POST /api/trips/:tripId/invite-code/regenerate  (generate new code)
router.post('/trips/:tripId/invite-code/regenerate',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const trip = req.trip
    trip.inviteCode = generateCode()
    await trip.save()
    res.json(new ApiResponse(200, { inviteCode: trip.inviteCode }))
  })
)

// ── PATCH /api/trips/:tripId/members/:userId  (update role)
router.patch('/trips/:tripId/members/:userId',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const { role } = req.body
    if (!['editor', 'viewer'].includes(role)) throw new ApiError(400, 'Invalid role')

    const trip   = req.trip
    const member = trip.members.find(m => m.user.toString() === req.params.userId)
    if (!member) throw new ApiError(404, 'Member not found')

    member.role = role
    await trip.save()
    res.json(new ApiResponse(200, {}, 'Role updated'))
  })
)

// ── DELETE /api/trips/:tripId/members/:userId  (remove member)
router.delete('/trips/:tripId/members/:userId',
  requireTripAccess('owner'),
  asyncHandler(async (req, res) => {
    const trip = req.trip

    // Prevent removing the owner
    const member = trip.members.find(m => m.user.toString() === req.params.userId)
    if (!member) throw new ApiError(404, 'Member not found')
    if (member.role === 'owner') throw new ApiError(403, 'Cannot remove the owner')

    trip.members = trip.members.filter(m => m.user.toString() !== req.params.userId)
    await trip.save()
    res.json(new ApiResponse(200, {}, 'Member removed'))
  })
)

// ── Helper
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars (0,O,1,I)
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default router