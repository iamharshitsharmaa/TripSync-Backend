import jwt from 'jsonwebtoken'

export const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { _id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }  
  )

  const refreshToken = jwt.sign(
    { _id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  )

  return { accessToken, refreshToken }
}