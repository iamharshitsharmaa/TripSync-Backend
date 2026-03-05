import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    trip:    { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    sender:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    readBy:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
)

// Always populate sender name + avatar when querying
messageSchema.pre(/^find/, function () {
  this.populate('sender', 'name avatar email')
})

export const Message = mongoose.model('Message', messageSchema)