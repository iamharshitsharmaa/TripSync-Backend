import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token) throw new ApiError(401, 'No token provided')

  let decoded
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    // Return 401 for BOTH expired and invalid tokens
    // This is critical — 401 triggers the axios refresh interceptor on the frontend
    if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired')
    }
    throw new ApiError(401, 'Invalid token')
  }

  const user = await User.findById(decoded._id)
  if (!user) throw new ApiError(401, 'User not found')

  req.user = user
  next()
})

export default verifyJWT


