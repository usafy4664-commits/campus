import { Hono } from 'hono'
import { Bindings, sha256, newToken, getUser } from '../lib/auth'

const auth = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/register  -> create a student account
auth.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { name, email, password, student_id, department, phone } = body
  if (!name || !email || !password) {
    return c.json({ error: 'name, email and password are required.' }, 400)
  }
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()
  if (exists) return c.json({ error: 'An account with this email already exists.' }, 409)

  const hash = await sha256(password)
  const res = await c.env.DB.prepare(
    `INSERT INTO users (name, email, password_hash, role, student_id, department, phone)
     VALUES (?, ?, ?, 'student', ?, ?, ?)`
  ).bind(name, email, hash, student_id || null, department || null, phone || null).run()

  return c.json({ success: true, id: res.meta.last_row_id })
})

// POST /api/auth/login  -> returns { token, user }
auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const { email, password } = body
  if (!email || !password) return c.json({ error: 'Email and password are required.' }, 400)

  const hash = await sha256(password)
  const user = await c.env.DB.prepare(
    'SELECT id, name, email, role, student_id, department FROM users WHERE email = ? AND password_hash = ?'
  ).bind(email, hash).first<any>()

  if (!user) return c.json({ error: 'Invalid email or password.' }, 401)

  const token = newToken()
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expires).run()

  return c.json({ success: true, token, user })
})

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  return c.json({ success: true })
})

// GET /api/auth/me  -> current user from token
auth.get('/me', async (c) => {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ user })
})

export default auth
