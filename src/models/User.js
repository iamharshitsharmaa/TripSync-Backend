import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true },
  avatar:       { type: String, default: '' },
  refreshToken: { type: String }
}, { timestamps: true })

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 10)
})

// Method to check password
userSchema.methods.isPasswordCorrect = async function(password) {
  return bcrypt.compare(password, this.password)
}

// Remove password from JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password
    delete ret.refreshToken
    return ret
  }
})

export const User = mongoose.model('User', userSchema)