import { Hono } from 'hono'
import { requireAuth } from '../lib/auth'
import type { Bindings, AuthUser } from '../lib/auth'

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// ------------------------------------------------------------
// AI ASSISTANT (Keyword Matching Mock)
// ------------------------------------------------------------
app.post('/chat', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { message } = await c.req.json()
  const q = (message || '').toLowerCase()
  
  let responseText = "I'm not sure how to help with that. Try asking about your attendance, assignments, marks, or classes."

  // 1. ATTENDANCE
  if (q.includes('attendance')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`SELECT status FROM attendance WHERE student_id = ?`).bind(user.id).all()
      if (results.length === 0) {
        responseText = "I couldn't find any attendance records for you."
      } else {
        const total = results.length
        const present = results.filter((r: any) => r.status === 'Present').length
        const percent = ((present / total) * 100).toFixed(1)
        responseText = `Your overall attendance is ${percent}% (${present} present out of ${total} classes).`
      }
    } else {
      responseText = "You are an admin, you can view all attendance in the Attendance section."
    }
  }
  
  // 2. ASSIGNMENTS
  else if (q.includes('assignment') || q.includes('pending')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT a.id FROM assignments a
        JOIN enrollments e ON a.subject_id = e.subject_id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? AND s.id IS NULL
      `).bind(user.id, user.id).all()
      const count = results.length
      responseText = count > 0 
        ? `You have ${count} pending assignment(s) left to submit.` 
        : "Great job! You have no pending assignments."
    }
  }
  
  // 3. MARKS
  else if (q.includes('mark') || q.includes('grade') || q.includes('result')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT m.grade, e.title, s.name as subject 
        FROM marks m 
        JOIN exams e ON m.exam_id = e.id 
        JOIN subjects s ON e.subject_id = s.id 
        WHERE m.student_id = ?
      `).bind(user.id).all()
      if (results.length === 0) {
        responseText = "No marks have been uploaded for you yet."
      } else {
        const marksStr = results.map((r: any) => `${r.subject} (${r.title}): ${r.grade}`).join(', ')
        responseText = `Here are your recent grades: ${marksStr}.`
      }
    }
  }
  
  // 4. CLASSES / CALENDAR
  else if (q.includes('class') || q.includes('today')) {
    responseText = "Checking your calendar... You have 2 classes scheduled for today. Check your Calendar section for timings."
  }
  
  // 5. EXPLAIN / SUMMARIZE
  else if (q.includes('explain') || q.includes('summarize')) {
    responseText = "I am a simple keyword assistant for now and cannot summarize study materials. Future updates will bring full AI capabilities!"
  }

  return c.json({ response: responseText })
})

export default app
