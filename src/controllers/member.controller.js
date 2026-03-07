import crypto from 'crypto'
import { Trip } from '../models/Trip.js'
import { User } from '../models/User.js'
import { sendInviteEmail } from '../services/email.service.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import mongoose from 'mongoose'


export const inviteMember = asyncHandler(async (req, res) => {
  const { email, role = 'viewer' } = req.body
  const trip = req.trip

  
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    const already = trip.members.find(m => m.user.toString() === existingUser._id.toString())
    if (already) throw new ApiError(409, 'User already a member')
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000) 

  
  trip.members.push({
    user: existingUser?._id || new mongoose.Types.ObjectId(), 
    role,
    inviteStatus: 'pending',
    inviteToken: token,
    tokenExpiry: expiry,
    inviteEmail: email, 
  })
  await trip.save()

  await sendInviteEmail({
    to: email,
    inviterName: req.user.name,
    tripTitle: trip.title,
    inviteLink: `${process.env.CLIENT_URL}/invite/${token}`
  })

  res.json(new ApiResponse(200, {}, 'Invite sent'))
})


export const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params
  const trip = await Trip.findOne({ 'members.inviteToken': token })
  if (!trip) throw new ApiError(404, 'Invalid or expired invite')

  const member = trip.members.find(m => m.inviteToken === token)
  if (member.tokenExpiry < new Date()) throw new ApiError(400, 'Invite expired')

  member.user = req.user._id
  member.inviteStatus = 'accepted'
  member.inviteToken = undefined
  member.tokenExpiry = undefined
  await trip.save()

  res.json(new ApiResponse(200, { tripId: trip._id }, 'Joined trip'))
})


export const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body
  const member = req.trip.members.find(m => m.user.toString() === req.params.userId)
  if (!member) throw new ApiError(404, 'Member not found')
  member.role = role
  await req.trip.save()
  res.json(new ApiResponse(200, {}, 'Role updated'))
})


export const removeMember = asyncHandler(async (req, res) => {
  req.trip.members = req.trip.members.filter(m => m.user.toString() !== req.params.userId)
  await req.trip.save()
  res.json(new ApiResponse(200, {}, 'Member removed'))
})