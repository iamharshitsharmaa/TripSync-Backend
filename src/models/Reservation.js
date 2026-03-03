import mongoose from 'mongoose'

const reservationSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  type: {
    type: String,
    enum: ['hotel', 'flight', 'car', 'restaurant', 'other'],
    default: 'other',
  },
  title:          { type: String, required: true, trim: true },
  confirmationNo: { type: String, default: '' },
  checkIn:        { type: Date },
  checkOut:       { type: Date },
  notes:          { type: String, default: '' },
  attachments:    [String], // Cloudinary URLs
}, { timestamps: true })

reservationSchema.index({ trip: 1, checkIn: 1 })

export const Reservation = mongoose.model('Reservation', reservationSchema)