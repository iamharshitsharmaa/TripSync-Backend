import { Router } from 'express'
import { register, login, googleAuth, refresh, logout } from '../controllers/auth.controller.js'
import verifyJWT from '../middleware/verifyJWT.js'

const router = Router()

router.post('/register', register)
router.post('/login',    login)
router.post('/google',   googleAuth)   
router.post('/refresh',  refresh)
router.post('/logout',   verifyJWT, logout)

export default router