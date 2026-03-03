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

// GET  /api/trips/:tripId/activities?dayIndex=0
router.get(
  '/trips/:tripId/activities',
  requireTripAccess('viewer'),
  getActivities
)

// POST /api/trips/:tripId/activities
router.post(
  '/trips/:tripId/activities',
  requireTripAccess('editor'),
  createActivity
)

// PATCH /api/activities/:id
router.patch(
  '/activities/:id',
  verifyJWT,
  updateActivity
)

// PATCH /api/activities/:id/reorder
router.patch(
  '/activities/:id/reorder',
  verifyJWT,
  reorderActivity
)

// DELETE /api/activities/:id
router.delete(
  '/activities/:id',
  verifyJWT,
  deleteActivity
)

export default router