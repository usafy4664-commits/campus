import { Hono } from 'hono'
import { Bindings, AuthUser, requireAuth, requireAdmin } from '../lib/auth'

const locations = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// GET /api/locations?search=&category=   (any logged-in user)
locations.get('/', requireAuth, async (c) => {
  const search = c.req.query('search')
  const category = c.req.query('category')
  let sql = 'SELECT * FROM locations'
  const where: string[] = []
  const binds: any[] = []
  if (category) { where.push('category = ?'); binds.push(category) }
  if (search) {
    where.push('(name LIKE ? OR building LIKE ? OR description LIKE ?)')
    const like = `%${search}%`; binds.push(like, like, like)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY category, name'
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all()
  return c.json({ locations: results })
})

// POST /api/locations  (admin)
locations.post('/', requireAdmin, async (c) => {
  const { name, category, building, floor, description } = await c.req.json().catch(() => ({}))
  if (!name || !category) return c.json({ error: 'name and category are required.' }, 400)
  const res = await c.env.DB.prepare(
    `INSERT INTO locations (name, category, building, floor, description) VALUES (?, ?, ?, ?, ?)`
  ).bind(name, category, building || null, floor || null, description || null).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

// DELETE /api/locations/:id  (admin)
locations.delete('/:id', requireAdmin, async (c) => {
  const res = await c.env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(c.req.param('id')).run()
  if (res.meta.changes === 0) return c.json({ error: 'Location not found.' }, 404)
  return c.json({ success: true })
})

export default locations
