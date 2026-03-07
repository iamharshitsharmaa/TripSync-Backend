import mongoose from 'mongoose'

const splitSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:   { type: Number, required: true, min: 0 },
  settled:  { type: Boolean, default: false },
}, { _id: false })

const expenseSchema = new mongoose.Schema({
  trip:         { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  paidBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:        { type: String, required: true, trim: true },
  amount:       { type: Number, required: true, min: 0 },
  category:     { type: String, enum: ['food','transport','lodging','activities','shopping','health','other'], default: 'other' },
  date:         { type: Date, default: Date.now },
  notes:        { type: String, default: '' },
  receiptUrl:   { type: String, default: '' },
  activity:     { type: mongoose.Schema.Types.ObjectId, ref: 'Activity', default: null },
  isSettlement: { type: Boolean, default: false },
  
  splits:       { type: [splitSchema], default: [] },
}, { timestamps: true })

expenseSchema.index({ trip: 1, date: -1 })
expenseSchema.index({ trip: 1, paidBy: 1 })

export const Expense = mongoose.model('Expense', expenseSchema)