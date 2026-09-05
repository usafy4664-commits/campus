import { Hono } from 'hono'
import { Bindings, AuthUser, requireAuth, requireAdmin } from '../lib/auth'

const complaints = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

const VALID_STATUS = ['Pending', 'In Progress', 'Resolved']

// GET /api/complaints
//   - admin: all complaints (optionally ?status= & ?category=)
//   - student: only their own complaints
complaints.get('/', requireAuth, async (c) => {
  const user = c.get('user')
  const status = c.req.query('status')
  const category = c.req.query('category')

  let sql = `SELECT co.*, u.name AS student_name, u.student_id
               FROM complaints co JOIN users u ON u.id = co.user_id`
  const where: string[] = []
  const binds: any[] = []

  if (user.role !== 'admin') { where.push('co.user_id = ?'); binds.push(user.id) }
  if (status)   { where.push('co.status = ?');   binds.push(status) }
  if (category) { where.push('co.category = ?'); binds.push(category) }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY co.created_at DESC'

  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ complaints: results })
})

// GET /api/complaints/:id
complaints.get('/:id', requireAuth, async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const row = await c.env.DB.prepare(
    `SELECT co.*, u.name AS student_name, u.student_id
       FROM complaints co JOIN users u ON u.id = co.user_id WHERE co.id = ?`
  ).bind(id).first<any>()
  if (!row) return c.json({ error: 'Complaint not found.' }, 404)
  if (user.role !== 'admin' && row.user_id !== user.id) return c.json({ error: 'Forbidden.' }, 403)
  return c.json({ complaint: row })
})

// POST /api/complaints  (student creates)
complaints.post('/', requireAuth, async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => ({}))
  const { title, category, description, location, photo } = body
  if (!title || !category || !description) {
    return c.json({ error: 'title, category and description are required.' }, 400)
  }
  const res = await c.env.DB.prepare(
    `INSERT INTO complaints (user_id, title, category, description, location, photo)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(user.id, title, category, description, location || null, photo || null).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

// PATCH /api/complaints/:id/status  (admin updates status)
complaints.patch('/:id/status', requireAdmin, async (c) => {
  const id = c.req.param('id')
  const { status } = await c.req.json().catch(() => ({}))
  if (!VALID_STATUS.includes(status)) {
    return c.json({ error: `status must be one of: ${VALID_STATUS.join(', ')}` }, 400)
  }
  const res = await c.env.DB.prepare(
    `UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(status, id).run()
  if (res.meta.changes === 0) return c.json({ error: 'Complaint not found.' }, 404)
  return c.json({ success: true })
})

export default complaints
