import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { createUploader } from '../config/cloudinary.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()

// 🔐 Protect all upload routes
router.use(verifyJWT)

// POST /api/upload/trip/:tripId
router.post(
  '/trip/:tripId',
  createUploader('trips').single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new Error('No file uploaded')
    }

    res.json(
      new ApiResponse(200, {
        url: req.file.path,
        public_id: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      })
    )
  })
)

export default router