import { Hono } from 'hono'
import { Bindings, AuthUser, requireAuth, requireAdmin } from '../lib/auth'

// Handles both Events and Notices.
const announcements = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// ---------------- EVENTS ----------------
announcements.get('/events', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM events ORDER BY event_date ASC').all()
  return c.json({ events: results })
})

announcements.post('/events', requireAdmin, async (c) => {
  const user = c.get('user')
  const { title, description, event_date, venue } = await c.req.json().catch(() => ({}))
  if (!title) return c.json({ error: 'title is required.' }, 400)
  const res = await c.env.DB.prepare(
    `INSERT INTO events (title, description, event_date, venue, created_by) VALUES (?, ?, ?, ?, ?)`
  ).bind(title, description || null, event_date || null, venue || null, user.id).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

announcements.delete('/events/:id', requireAdmin, async (c) => {
  const res = await c.env.DB.prepare('DELETE FROM events WHERE id = ?').bind(c.req.param('id')).run()
  if (res.meta.changes === 0) return c.json({ error: 'Event not found.' }, 404)
  return c.json({ success: true })
})

// ---------------- NOTICES ----------------
announcements.get('/notices', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM notices ORDER BY created_at DESC').all()
  return c.json({ notices: results })
})

announcements.post('/notices', requireAdmin, async (c) => {
  const user = c.get('user')
  const { title, body, priority } = await c.req.json().catch(() => ({}))
  if (!title) return c.json({ error: 'title is required.' }, 400)
  const res = await c.env.DB.prepare(
    `INSERT INTO notices (title, body, priority, created_by) VALUES (?, ?, ?, ?)`
  ).bind(title, body || null, priority || 'normal', user.id).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

announcements.delete('/notices/:id', requireAdmin, async (c) => {
  const res = await c.env.DB.prepare('DELETE FROM notices WHERE id = ?').bind(c.req.param('id')).run()
  if (res.meta.changes === 0) return c.json({ error: 'Notice not found.' }, 404)
  return c.json({ success: true })
})

export default announcements
