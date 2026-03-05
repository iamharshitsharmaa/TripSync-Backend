import { Router } from 'express'
import  verifyJWT   from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { getMessages, sendMessage, deleteMessage } from '../controllers/chat.controller.js'

const router = Router({ mergeParams: true }) // mergeParams lets us read :id from parent

router.use(verifyJWT)
router.use(requireTripAccess('viewer'))     // any member can read/send

router.get('/',    getMessages)
router.post('/',   sendMessage)
router.delete('/:msgId', deleteMessage)

export default router