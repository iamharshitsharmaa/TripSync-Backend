import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { getMessages, sendMessage, deleteMessage } from '../controllers/chat.controller.js'

const router = Router()
router.use(verifyJWT)

router.get( '/trips/:id/messages', requireTripAccess('viewer'), getMessages)
router.post('/trips/:id/messages', requireTripAccess('viewer'), sendMessage)
router.delete('/trips/:id/messages/:msgId', requireTripAccess('viewer'), deleteMessage)

export default router