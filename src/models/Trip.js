import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:         { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
  inviteStatus: { type: String, enum: ['pending', 'accepted'], default: 'accepted' },
  inviteToken:  { type: String },
  tokenExpiry:  { type: Date },
  inviteEmail:  { type: String },
}, { _id: true })

const daySchema = new mongoose.Schema({
  date:      { type: Date },
  dayNumber: { type: Number },
  title:     { type: String, default: '' },
  notes:     { type: String, default: '' },
}, { _id: true })

const tripSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  coverImage:  { type: String, default: '' },
  currency:    { type: String, default: 'USD' },
  budgetLimit: { type: Number, default: 0 },
  status:      { type: String, enum: ['draft', 'active', 'archived'], default: 'active' },
  inviteCode:  { type: String, default: () => generateCode() }, // auto-generated
  members:     [memberSchema],
  days:        [daySchema],
}, { timestamps: true })

// Auto-generate days — async pre-save (Mongoose 7+)
tripSchema.pre('save', async function () {
  if (this.isModified('startDate') || this.isModified('endDate') || this.isNew) {
    const start = new Date(this.startDate)
    const end   = new Date(this.endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid startDate or endDate')
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1
    if (diffDays > 60) throw new Error('Trip cannot be longer than 60 days')

    this.days = []
    let current = new Date(start)
    let dayNum  = 1

    while (current <= end) {
      this.days.push({ date: new Date(current), dayNumber: dayNum, title: '', notes: '' })
      current.setDate(current.getDate() + 1)
      dayNum++
    }
  }
})

tripSchema.index({ 'members.user': 1 })
tripSchema.index({ inviteCode: 1 })

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export const Trip = mongoose.model('Trip', tripSchema)


