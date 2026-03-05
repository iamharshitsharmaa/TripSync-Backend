import { User } from '../models/User.js'
import { generateTokens } from '../utils/token.utils.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) throw new ApiError(400, 'All fields required')

  const exists = await User.findOne({ email })
  if (exists) throw new ApiError(409, 'Email already registered')

  const user = await User.create({ name, email, password })
  const { accessToken, refreshToken } = generateTokens(user._id)

  user.refreshToken = refreshToken
  await user.save()

  res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',  // HTTPS only in prod
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',  // cross-site cookies
  maxAge:   30 * 24 * 60 * 60 * 1000,  // 30 days
})

  res.status(201).json(new ApiResponse(201, { user, accessToken }, 'Registered'))
})

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+password')
  if (!user) throw new ApiError(401, 'Invalid credentials')

  const ok = await user.isPasswordCorrect(password)
  if (!ok) throw new ApiError(401, 'Invalid credentials')

  const { accessToken, refreshToken } = generateTokens(user._id)
  user.refreshToken = refreshToken
  await user.save()

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.json(new ApiResponse(200, { user, accessToken }, 'Logged in'))
})

// POST /api/auth/refresh
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) throw new ApiError(401, 'No refresh token')

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  const user = await User.findById(decoded._id)
  if (!user || user.refreshToken !== token) throw new ApiError(401, 'Invalid refresh token')

  const { accessToken, refreshToken } = generateTokens(user._id)
  user.refreshToken = refreshToken
  await user.save()

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
  })

  res.json(new ApiResponse(200, { accessToken }, 'Token refreshed'))
})

// POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    req.user.refreshToken = undefined
    await req.user.save()
  }
  res.clearCookie('refreshToken')
  res.json(new ApiResponse(200, {}, 'Logged out'))
})