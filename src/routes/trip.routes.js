import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import { getTrips, createTrip, getTrip, updateTrip, deleteTrip } from '../controllers/trip.controller.js'

const router = Router()
router.use(verifyJWT) 

router.get('/', getTrips)
router.post('/', createTrip)
router.get('/:id', requireTripAccess('viewer'), getTrip)
router.patch('/:id', requireTripAccess('editor'), updateTrip)
router.delete('/:id', requireTripAccess('owner'), deleteTrip)

export default router