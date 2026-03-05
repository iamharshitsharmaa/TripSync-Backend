import { Router } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { Trip } from '../models/Trip.js'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)

// Memory storage — send buffer to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new ApiError(400, 'Only image files are allowed'))
  },
})

// POST /api/upload/trip/:tripId
router.post('/upload/trip/:tripId',
  requireTripAccess('editor'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    console.log('UPLOAD — file:', req.file?.originalname, 'size:', req.file?.size)
    console.log('UPLOAD — cloudinary config:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY ? '✅ set' : '❌ missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ set' : '❌ missing',
    })

    if (!req.file) throw new ApiError(400, 'No file received')

    // Check Cloudinary credentials before trying
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new ApiError(500, 'Cloudinary credentials not configured in .env')
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:           'tripsync/covers',
          transformation:   [{ width: 1200, height: 400, crop: 'fill', quality: 'auto:good' }],
          allowed_formats:  ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        },
        (err, result) => {
          if (err) {
            console.error('Cloudinary upload error:', err)
            reject(new ApiError(500, `Cloudinary error: ${err.message}`))
          } else {
            console.log('Cloudinary upload success:', result.secure_url)
            resolve(result)
          }
        }
      )
      stream.end(req.file.buffer)
    })

    // Save URL back to trip document
    const trip = await Trip.findByIdAndUpdate(
      req.params.tripId,
      { coverImage: result.secure_url },
      { new: true }
    )

    res.json(new ApiResponse(200, {
      coverImage: result.secure_url,
      trip,
    }, 'Cover photo updated'))
  })
)

export default router