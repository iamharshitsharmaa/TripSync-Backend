import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, select: false },        // optional — Google users have no password
  avatar:       { type: String, default: '' },
  googleId:     { type: String, default: null },        // set for Google OAuth users
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  refreshToken: { type: String, select: false },
  isVerified:   { type: Boolean, default: false },      // Google users are auto-verified
  lastLoginAt:  { type: Date },
}, { timestamps: true })

// Hash password before saving (only if modified and exists)
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return
  this.password = await bcrypt.hash(this.password, 12)  // 12 rounds (up from 10)
})

userSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.password) return false   // Google-only account
  return bcrypt.compare(password, this.password)
}

// Strip sensitive fields from JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password
    delete ret.refreshToken
    delete ret.googleId
    return ret
  }
})

export const User = mongoose.model('User', userSchema)