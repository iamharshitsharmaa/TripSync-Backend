import { Router } from 'express'
import verifyJWT from '../middleware/verifyJWT.js'
import { requireTripAccess } from '../middleware/requireTripAccess.js'
import {
  getActivities,
  createActivity,
  updateActivity,
  reorderActivity,
  deleteActivity,
} from '../controllers/activity.controller.js'

const router = Router()
router.use(verifyJWT)


router.get(
  '/trips/:tripId/activities',
  requireTripAccess('viewer'),
  getActivities
)


router.post(
  '/trips/:tripId/activities',
  requireTripAccess('editor'),
  createActivity
)


router.patch(
  '/activities/:id',
  verifyJWT,
  updateActivity
)


router.patch(
  '/activities/:id/reorder',
  verifyJWT,
  reorderActivity
)


router.delete(
  '/activities/:id',
  verifyJWT,
  deleteActivity
)

export default router