import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, select: false },        
  avatar:       { type: String, default: '' },
  googleId:     { type: String, default: null },        
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  refreshToken: { type: String, select: false },
  isVerified:   { type: Boolean, default: false },      
  lastLoginAt:  { type: Date },
}, { timestamps: true })


userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return
  this.password = await bcrypt.hash(this.password, 12)  
})

userSchema.methods.isPasswordCorrect = async function (password) {
  if (!this.password) return false   
  return bcrypt.compare(password, this.password)
}


userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password
    delete ret.refreshToken
    delete ret.googleId
    return ret
  }
})

export const User = mongoose.model('User', userSchema)