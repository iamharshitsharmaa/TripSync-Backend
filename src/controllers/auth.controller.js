import { User } from '../models/User.js'
import { generateTokens } from '../utils/token.utils.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'


const cookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge:   30 * 24 * 60 * 60 * 1000,
})


function validatePassword(password) {
  if (!password || password.length < 8)
    throw new ApiError(400, 'Password must be at least 8 characters')
  if (!/[A-Z]/.test(password))
    throw new ApiError(400, 'Password must contain at least one uppercase letter')
  if (!/[0-9]/.test(password))
    throw new ApiError(400, 'Password must contain at least one number')
}


export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name?.trim() || !email?.trim() || !password)
    throw new ApiError(400, 'All fields required')

  validatePassword(password)

  const exists = await User.findOne({ email: email.toLowerCase() })
  if (exists) throw new ApiError(409, 'Email already registered')

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    password,
    isVerified: false,
    lastLoginAt: new Date(),
  })

  const { accessToken, refreshToken } = generateTokens(user._id)
  user.refreshToken = refreshToken
  await user.save({ validateModifiedOnly: true })

  res.cookie('refreshToken', refreshToken, cookieOptions())
  res.status(201).json(new ApiResponse(201, { user, accessToken }, 'Registered'))
})


export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) throw new ApiError(400, 'Email and password required')

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken')
  if (!user) throw new ApiError(401, 'Invalid credentials')

  if (user.authProvider === 'google' && !user.password)
    throw new ApiError(401, 'This account uses Google sign-in. Please use the Google button.')

  const ok = await user.isPasswordCorrect(password)
  if (!ok) throw new ApiError(401, 'Invalid credentials')

  const { accessToken, refreshToken } = generateTokens(user._id)
  user.refreshToken = refreshToken
  user.lastLoginAt  = new Date()
  await user.save({ validateModifiedOnly: true })

  res.cookie('refreshToken', refreshToken, cookieOptions())
  res.json(new ApiResponse(200, { user, accessToken }, 'Logged in'))
})




export const googleAuth = asyncHandler(async (req, res) => {
  const { idToken } = req.body  
  if (!idToken) throw new ApiError(400, 'Google token required')

  
  let profile
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (!response.ok) throw new Error(`Google returned ${response.status}`)
    profile = await response.json()
  } catch {
    throw new ApiError(401, 'Could not verify Google token')
  }

  const { sub: googleId, email, name, picture } = profile
  if (!email) throw new ApiError(401, 'Google account has no email address')

  
  let user = await User.findOne({ $or: [{ googleId }, { email }] }).select('+refreshToken')

  if (user) {
    if (!user.googleId) {
      user.googleId     = googleId
      user.authProvider = 'google'
      user.isVerified   = true
      if (picture && !user.avatar) user.avatar = picture
    }
  } else {
    user = new User({
      name,
      email,
      googleId,
      avatar:       picture || '',
      authProvider: 'google',
      isVerified:   true,
    })
  }

  const { accessToken, refreshToken } = generateTokens(user._id)
  user.refreshToken = refreshToken
  user.lastLoginAt  = new Date()
  await user.save({ validateModifiedOnly: true })

  res.cookie('refreshToken', refreshToken, cookieOptions())
  res.status(200).json(new ApiResponse(200, { user, accessToken }, 'Authenticated with Google'))
})


export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken
  if (!token) throw new ApiError(401, 'No refresh token')

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
  } catch {
    throw new ApiError(401, 'Refresh token expired or invalid')
  }

  const user = await User.findById(decoded._id).select('+refreshToken')
  if (!user || user.refreshToken !== token)
    throw new ApiError(401, 'Invalid refresh token')

  const { accessToken, refreshToken } = generateTokens(user._id)
  user.refreshToken = refreshToken
  await user.save({ validateModifiedOnly: true })

  res.cookie('refreshToken', refreshToken, cookieOptions())
  res.json(new ApiResponse(200, { accessToken }, 'Token refreshed'))
})


export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } })
  }
  res.clearCookie('refreshToken', cookieOptions())
  res.json(new ApiResponse(200, {}, 'Logged out'))
})