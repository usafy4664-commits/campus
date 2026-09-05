import { Hono } from 'hono'
import { Bindings, AuthUser, requireAuth, requireAdmin } from '../lib/auth'

const sos = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

const VALID_STATUS = ['Active', 'Acknowledged', 'Responding', 'Resolved']

// GET /api/sos
//   - admin: all alerts (newest / most urgent first)
//   - student: only their own alerts
sos.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  let sql = `SELECT e.*, u.name AS student_name, u.student_id, u.phone
               FROM emergency_alerts e JOIN users u ON u.id = e.user_id`
  const binds: any[] = []
  if (user.role !== 'admin') { sql += ' WHERE e.user_id = ?'; binds.push(user.id) }
  // Active alerts float to the top, then by newest.
  sql += ` ORDER BY CASE e.status WHEN 'Active' THEN 0 WHEN 'Acknowledged' THEN 1
             WHEN 'Responding' THEN 2 ELSE 3 END, e.created_at DESC`
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ alerts: results })
})

// POST /api/sos  (student triggers SOS)
sos.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const { type, location, message } = await c.req.json().catch(() => ({}))
  if (!type) return c.json({ error: 'type is required (Medical, Security, Fire, Assistance, Other).' }, 400)
  const res = await c.env.DB.prepare(
    `INSERT INTO emergency_alerts (user_id, type, location, message) VALUES (?, ?, ?, ?)`
  ).bind(user.id, type, location || null, message || null).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

// PATCH /api/sos/:id/status  (admin updates status)
sos.patch('/:id/status', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json().catch(() => ({}))
  if (!VALID_STATUS.includes(status)) {
    return c.json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` }, 400)
  }
  const res = await c.env.DB.prepare(
    `UPDATE emergency_alerts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, id).run()
  if (res.meta.changes === 0) return c.json({ error: 'Alert not found.' }, 404)
  return c.json({ success: true })
})

// GET /api/sos/active/count  (admin: for live badge)
sos.get('/active/count', requireAdmin, async (c) => {
  const row = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM emergency_alerts WHERE status = 'Active'`).first<any>()
  return c.json({ count: row?.n ?? 0 })
})

export default sos
