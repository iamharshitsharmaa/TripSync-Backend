import { Router } from 'express'
import Groq from 'groq-sdk'
import verifyJWT from '../middleware/verifyJWT.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

const router = Router()
router.use(verifyJWT)

const SYSTEM = `You are TripSync AI, an expert travel planner. Help users plan trips through friendly conversation.

Ask clarifying questions one or two at a time to understand:
- Destination(s)
- Travel dates and duration
- Number of travelers and who (couple, family, friends, solo)
- Budget range (budget/mid-range/luxury)
- Travel style (adventure, culture, relaxation, food, mix)
- Any special requirements or interests

Once you have enough info (after 3-5 messages), generate a complete trip plan in this EXACT JSON format wrapped in <TRIP_PLAN> tags:

<TRIP_PLAN>
{
  "title": "Trip title",
  "destination": "City, Country",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "currency": "USD",
  "budgetLimit": 2000,
  "summary": "A brief engaging description of the trip",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Arrival & Old Town Exploration",
      "activities": [
        { "title": "Check in to hotel", "time": "14:00", "duration": 30, "type": "accommodation", "notes": "Rest after flight", "cost": 0 },
        { "title": "Walk the Old Town", "time": "16:00", "duration": 120, "type": "sightseeing", "notes": "Visit the main square", "cost": 0 },
        { "title": "Dinner at local restaurant", "time": "19:30", "duration": 90, "type": "food", "notes": "Try local cuisine", "cost": 40 }
      ]
    }
  ],
  "budget": [
    { "title": "Flights (round trip)", "amount": 600, "category": "transport" },
    { "title": "Hotel (5 nights)", "amount": 750, "category": "lodging" },
    { "title": "Food & dining", "amount": 300, "category": "food" },
    { "title": "Activities & tours", "amount": 200, "category": "activities" },
    { "title": "Shopping & souvenirs", "amount": 150, "category": "shopping" }
  ],
  "checklist": {
    "packing": ["Passport", "Travel adapter", "Comfortable walking shoes", "Light jacket", "Sunscreen"],
    "todo": ["Book flights", "Reserve hotels", "Get travel insurance", "Notify bank of travel", "Download offline maps"],
    "custom": []
  }
}
</TRIP_PLAN>

After the JSON, add a friendly 2-3 sentence summary of the plan. Keep messages conversational and enthusiastic.

CRITICAL: Output the JSON directly inside <TRIP_PLAN> tags with NO markdown code fences, NO backticks, NO extra formatting around the JSON.`


router.post('/ai/plan', asyncHandler(async (req, res) => {
  const { messages } = req.body
  if (!messages?.length) throw new ApiError(400, 'Messages are required')
  if (!process.env.GROQ_API_KEY) throw new ApiError(500, 'AI service not configured — add GROQ_API_KEY to environment variables')

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

  
  const history = messages.slice(-20).map(m => ({
    role:    m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content),
  }))

  
  while (history.length > 0 && history[0].role === 'assistant') history.shift()
  if (!history.length) throw new ApiError(400, 'No valid user message found')

  const response = await client.chat.completions.create({
    model:       'llama-3.3-70b-versatile',  
    max_tokens:  4000,
    messages:    [{ role: 'system', content: SYSTEM }, ...history],
    temperature: 0.7,
  })

  const content = response.choices[0]?.message?.content || ''
  res.json(new ApiResponse(200, { content }))
}))

export default router