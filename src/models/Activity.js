import mongoose from 'mongoose'

const activitySchema = new mongoose.Schema({
  trip:          { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  dayIndex:      { type: Number, required: true }, 
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:         { type: String, required: true, trim: true },
  type:          { type: String, enum: ['activity', 'food', 'transport', 'lodging', 'other'], default: 'activity' },
  startTime:     { type: String, default: '' }, 
  endTime:       { type: String, default: '' },
  location:      { type: String, default: '' },
  notes:         { type: String, default: '' },
  position:      { type: Number, required: true }, 
  estimatedCost: { type: Number, default: 0 },
  attachments:   [String], 
}, { timestamps: true })

activitySchema.index({ trip: 1, dayIndex: 1, position: 1 })

export const Activity = mongoose.model('Activity', activitySchema)