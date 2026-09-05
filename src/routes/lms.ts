import { Hono } from 'hono'
import { requireAuth, requireAdmin } from '../lib/auth'
import type { Bindings, AuthUser } from '../lib/auth'

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// Helper to handle admin vs student
const isStudent = (c: any) => c.get('user').role === 'student'

// ------------------------------------------------------------
// SUBJECTS & ENROLLMENTS
// ------------------------------------------------------------
app.get('/subjects', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  
  if (user.role === 'student') {
    const { results } = await db.prepare(`
      SELECT s.*, u.name as faculty_name 
      FROM subjects s 
      JOIN enrollments e ON s.id = e.subject_id 
      LEFT JOIN users u ON s.faculty_id = u.id
      WHERE e.student_id = ?
    `).bind(user.id).all()
    return c.json({ subjects: results })
  } else {
    // Admin / Faculty sees all subjects or subjects they teach
    const { results } = await db.prepare(`
      SELECT s.*, u.name as faculty_name 
      FROM subjects s 
      LEFT JOIN users u ON s.faculty_id = u.id
    `).all()
    return c.json({ subjects: results })
  }
})

// ------------------------------------------------------------
// COURSE MATERIALS
// ------------------------------------------------------------
app.get('/materials/:subjectId', requireAuth, async (c) => {
  const db = c.env.DB
  const subjectId = c.req.param('subjectId')
  const { results } = await db.prepare(`
    SELECT m.*, u.name as creator_name
    FROM course_materials m
    LEFT JOIN users u ON m.created_by = u.id
    WHERE m.subject_id = ?
    ORDER BY m.created_at DESC
  `).bind(subjectId).all()
  return c.json({ materials: results })
})

app.post('/materials', requireAdmin, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { subject_id, title, type, content_url } = await c.req.json()
  await db.prepare(`
    INSERT INTO course_materials (subject_id, title, type, content_url, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).bind(subject_id, title, type, content_url, user.id).run()
  return c.json({ success: true })
})

app.delete('/materials/:id', requireAdmin, async (c) => {
  const db = c.env.DB
  const id = c.req.param('id')
  await db.prepare('DELETE FROM course_materials WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ------------------------------------------------------------
// ATTENDANCE
// ------------------------------------------------------------
app.get('/attendance', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  if (user.role === 'student') {
    const { results } = await db.prepare(`
      SELECT a.*, s.name as subject_name, s.code
      FROM attendance a
      JOIN subjects s ON a.subject_id = s.id
      WHERE a.student_id = ?
      ORDER BY a.date DESC
    `).bind(user.id).all()
    return c.json({ attendance: results })
  } else {
    // Admin view could be fetching by subject or date, simplify for now by returning all
    const { results } = await db.prepare(`
      SELECT a.*, s.name as subject_name, u.name as student_name
      FROM attendance a
      JOIN subjects s ON a.subject_id = s.id
      JOIN users u ON a.student_id = u.id
      ORDER BY a.date DESC
    `).all()
    return c.json({ attendance: results })
  }
})

app.post('/attendance', requireAdmin, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { student_id, subject_id, date, status } = await c.req.json()
  
  await db.prepare(`
    INSERT INTO attendance (student_id, subject_id, date, status, recorded_by)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(student_id, subject_id, date) 
    DO UPDATE SET status=excluded.status, recorded_by=excluded.recorded_by
  `).bind(student_id, subject_id, date, status, user.id).run()
  
  return c.json({ success: true })
})

// ------------------------------------------------------------
// EXAMS & MARKS
// ------------------------------------------------------------
app.get('/exams', requireAuth, async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare(`
    SELECT e.*, s.name as subject_name, s.code
    FROM exams e
    JOIN subjects s ON e.subject_id = s.id
    ORDER BY e.exam_date DESC
  `).all()
  return c.json({ exams: results })
})

app.post('/exams', requireAdmin, async (c) => {
  const db = c.env.DB
  const { subject_id, title, exam_date, max_marks } = await c.req.json()
  const res = await db.prepare(`
    INSERT INTO exams (subject_id, title, exam_date, max_marks)
    VALUES (?, ?, ?, ?)
  `).bind(subject_id, title, exam_date, max_marks || 100).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

app.get('/students', requireAdmin, async (c) => {
  const db = c.env.DB
  const { results } = await db.prepare(`
    SELECT id, name, email FROM users WHERE role = 'student' ORDER BY name ASC
  `).all()
  return c.json({ students: results })
})

app.get('/marks', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  if (user.role === 'student') {
    const { results } = await db.prepare(`
      SELECT m.*, e.title as exam_title, e.max_marks, s.name as subject_name, s.code
      FROM marks m
      JOIN exams e ON m.exam_id = e.id
      JOIN subjects s ON e.subject_id = s.id
      WHERE m.student_id = ?
      ORDER BY e.exam_date DESC
    `).bind(user.id).all()
    return c.json({ marks: results })
  } else {
    const { results } = await db.prepare(`
      SELECT m.*, e.title as exam_title, e.max_marks, s.name as subject_name, u.name as student_name
      FROM marks m
      JOIN exams e ON m.exam_id = e.id
      JOIN subjects s ON e.subject_id = s.id
      JOIN users u ON m.student_id = u.id
      ORDER BY e.exam_date DESC, m.created_at DESC
    `).all()
    return c.json({ marks: results })
  }
})

app.post('/marks', requireAdmin, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { exam_id, student_id, marks_obtained, grade, feedback } = await c.req.json()
  
  await db.prepare(`
    INSERT INTO marks (exam_id, student_id, marks_obtained, grade, feedback, entered_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(exam_id, student_id)
    DO UPDATE SET marks_obtained=excluded.marks_obtained, grade=excluded.grade, feedback=excluded.feedback, entered_by=excluded.entered_by, updated_at=CURRENT_TIMESTAMP
  `).bind(exam_id, student_id, marks_obtained, grade || null, feedback || null, user.id).run()
  
  return c.json({ success: true })
})

// ------------------------------------------------------------
// ASSIGNMENTS & SUBMISSIONS
// ------------------------------------------------------------
app.get('/assignments', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  
  if (user.role === 'student') {
    // For students, get assignments for their enrolled subjects and their submission status
    const { results } = await db.prepare(`
      SELECT a.*, s.name as subject_name, sub.status as submission_status, sub.marks_obtained, sub.feedback, sub.content_url as student_content_url
      FROM assignments a
      JOIN enrollments e ON a.subject_id = e.subject_id
      JOIN subjects s ON a.subject_id = s.id
      LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
      WHERE e.student_id = ?
      ORDER BY a.deadline ASC
    `).bind(user.id, user.id).all()
    return c.json({ assignments: results })
  } else {
    const { results } = await db.prepare(`
      SELECT a.*, s.name as subject_name,
        (SELECT COUNT(*) FROM submissions sub WHERE sub.assignment_id = a.id) as submission_count
      FROM assignments a
      JOIN subjects s ON a.subject_id = s.id
      ORDER BY a.deadline ASC
    `).all()
    return c.json({ assignments: results })
  }
})

app.post('/assignments', requireAdmin, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { subject_id, title, description, resource_url, deadline } = await c.req.json()
  
  await db.prepare(`
    INSERT INTO assignments (subject_id, title, description, resource_url, deadline, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(subject_id, title, description || '', resource_url || '', deadline || '', user.id).run()
  
  return c.json({ success: true })
})

app.get('/assignments/:id/submissions', requireAdmin, async (c) => {
  const db = c.env.DB
  const assignmentId = c.req.param('id')
  const { results } = await db.prepare(`
    SELECT sub.*, u.name as student_name, u.email as student_email
    FROM submissions sub
    JOIN users u ON sub.student_id = u.id
    WHERE sub.assignment_id = ?
    ORDER BY sub.submitted_at DESC
  `).bind(assignmentId).all()
  return c.json({ submissions: results })
})

app.post('/submissions/:id/grade', requireAdmin, async (c) => {
  const db = c.env.DB
  const submissionId = c.req.param('id')
  const { marks_obtained, feedback } = await c.req.json()
  await db.prepare(`
    UPDATE submissions
    SET marks_obtained = ?, feedback = ?, status = 'Graded'
    WHERE id = ?
  `).bind(marks_obtained, feedback || '', submissionId).run()
  return c.json({ success: true })
})

app.post('/assignments/:id/submit', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const assignmentId = c.req.param('id')
  const { content_url } = await c.req.json()
  
  if (user.role !== 'student') return c.json({ error: 'Only students can submit' }, 403)
  
  await db.prepare(`
    INSERT INTO submissions (assignment_id, student_id, content_url, status)
    VALUES (?, ?, ?, 'Submitted')
    ON CONFLICT(assignment_id, student_id) DO UPDATE SET content_url=excluded.content_url, status='Submitted'
  `).bind(assignmentId, user.id, content_url).run()
  
  return c.json({ success: true })
})

// ------------------------------------------------------------
// CALENDAR
// ------------------------------------------------------------
app.get('/calendar', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  
  // Aggregate events, exams, and assignment deadlines
  const [events, exams, assignments] = await Promise.all([
    db.prepare(`SELECT 'event' as type, title, event_date as date, venue as description FROM events`).all(),
    user.role === 'student' ?
      db.prepare(`
        SELECT 'exam' as type, e.title || ' (' || s.code || ')' as title, e.exam_date as date, 'Max Marks: ' || e.max_marks as description 
        FROM exams e JOIN enrollments en ON e.subject_id = en.subject_id JOIN subjects s ON e.subject_id = s.id 
        WHERE en.student_id = ?
      `).bind(user.id).all() :
      db.prepare(`SELECT 'exam' as type, e.title || ' (' || s.code || ')' as title, e.exam_date as date, 'Max Marks: ' || e.max_marks as description FROM exams e JOIN subjects s ON e.subject_id = s.id`).all(),
    user.role === 'student' ?
      db.prepare(`
        SELECT 'assignment' as type, a.title || ' (' || s.code || ')' as title, a.deadline as date, a.description 
        FROM assignments a JOIN enrollments en ON a.subject_id = en.subject_id JOIN subjects s ON a.subject_id = s.id 
        WHERE en.student_id = ?
      `).bind(user.id).all() :
      db.prepare(`SELECT 'assignment' as type, a.title || ' (' || s.code || ')' as title, a.deadline as date, a.description FROM assignments a JOIN subjects s ON a.subject_id = s.id`).all()
  ])
  
  const calendarItems = [
    ...(events.results || []),
    ...(exams.results || []),
    ...(assignments.results || [])
  ].filter((i: any) => i.date).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return c.json({ calendar: calendarItems })
})

app.post('/calendar/events', requireAdmin, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { title, description, event_date, venue } = await c.req.json()
  
  await db.prepare(`
    INSERT INTO events (title, description, event_date, venue, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).bind(title, description || '', event_date, venue || '', user.id).run()
  
  return c.json({ success: true })
})

export default app
