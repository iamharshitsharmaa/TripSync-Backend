import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  isChecked: {
    type: Boolean,
    default: false,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  position: {
    type: Number,
    default: 0,
  },
})

const checklistSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['packing', 'todo', 'custom'],
      default: 'custom',
    },
    items: [itemSchema],
  },
  { timestamps: true }
)


checklistSchema.index({ trip: 1 })

export const Checklist = mongoose.model('Checklist', checklistSchema)

