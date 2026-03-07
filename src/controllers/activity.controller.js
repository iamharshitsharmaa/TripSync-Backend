import { Activity } from '../models/Activity.js'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'


export const getActivities = asyncHandler(async (req, res) => {
  const { dayIndex } = req.query
  const query = { trip: req.params.tripId }
  if (dayIndex !== undefined) query.dayIndex = Number(dayIndex)

  const activities = await Activity.find(query)
    .sort({ dayIndex: 1, position: 1 })
    .populate('createdBy', 'name avatar')
  res.json(new ApiResponse(200, activities))
})


export const createActivity = asyncHandler(async (req, res) => {
  const { title, type, startTime, endTime, location, notes, dayIndex, estimatedCost } = req.body

  const last = await Activity.findOne({ trip: req.params.tripId, dayIndex }).sort({ position: -1 })
  const position = (last?.position || 0) + 1

  const activity = await Activity.create({
    trip: req.params.tripId,
    createdBy: req.user._id,
    title, type, startTime, endTime, location, notes, dayIndex, estimatedCost, position
  })

  req.app.get('io')?.to(`trip:${req.params.tripId}`).emit('activity:created', activity)
  res.status(201).json(new ApiResponse(201, activity, 'Activity created'))
})


export const updateActivity = asyncHandler(async (req, res) => {
  const { title, type, startTime, endTime, location, notes, estimatedCost } = req.body
  const activity = await Activity.findById(req.params.id)
  if (!activity) throw new ApiError(404, 'Activity not found')

  Object.assign(activity, { title, type, startTime, endTime, location, notes, estimatedCost })
  await activity.save()

  req.app.get('io')?.to(`trip:${activity.trip}`).emit('activity:updated', activity)
  res.json(new ApiResponse(200, activity))
})


export const reorderActivity = asyncHandler(async (req, res) => {
  const { prevPosition, nextPosition, dayIndex } = req.body  

  const activity = await Activity.findById(req.params.id)
  if (!activity) throw new ApiError(404, 'Not found')

  
  if (dayIndex !== undefined && Number(dayIndex) !== activity.dayIndex) {
    activity.dayIndex = Number(dayIndex)
  }

  
  let newPosition
  if (prevPosition == null)      newPosition = nextPosition / 2
  else if (nextPosition == null) newPosition = prevPosition + 1
  else                           newPosition = (prevPosition + nextPosition) / 2

  
  if (
    prevPosition != null && Math.abs(newPosition - prevPosition) < 0.001 ||
    nextPosition != null && Math.abs(newPosition - nextPosition) < 0.001
  ) {
    const siblings = await Activity
      .find({ trip: activity.trip, dayIndex: activity.dayIndex })
      .sort({ position: 1 })
    await Promise.all(siblings.map((s, i) =>
      Activity.findByIdAndUpdate(s._id, { position: i + 1 })
    ))
    newPosition = siblings.findIndex(s => s._id.toString() === activity._id.toString()) + 1
  }

  activity.position = newPosition
  await activity.save()

  req.app.get('io')?.to(`trip:${activity.trip}`).emit('activity:reordered', {
    id: activity._id,
    position: newPosition,
    dayIndex: activity.dayIndex,   
  })

  res.json(new ApiResponse(200, activity))
})


export const deleteActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.findByIdAndDelete(req.params.id)
  req.app.get('io')?.to(`trip:${activity.trip}`).emit('activity:deleted', { id: req.params.id })
  res.json(new ApiResponse(200, {}, 'Deleted'))
})