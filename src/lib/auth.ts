import type { Context, Next } from 'hono'

export type Bindings = { DB: D1Database }

export interface AuthUser {
  id: number
  name: string
  email: string
  role: 'student' | 'admin'
  student_id: string | null
  department: string | null
}

// SHA-256 hex hash using the Web Crypto API (works on Cloudflare Workers).
// NOTE: For a real production system use bcrypt/argon2. SHA-256 is used here
// only to keep the demo self-contained on the edge runtime.
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function newToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Reads the bearer token, validates the session, and returns the user (or null).
export async function getUser(c: Context<{ Bindings: Bindings }>): Promise<AuthUser | null> {
  const header = c.req.header('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null

  const row = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.role, u.student_id, u.department, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`
  ).bind(token).first<any>()

  if (!row) return null
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
    return null
  }
  return {
    id: row.id, name: row.name, email: row.email, role: row.role,
    student_id: row.student_id, department: row.department,
  }
}

// Middleware: requires any authenticated user. Stores user on context.
export async function requireAuth(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Unauthorized. Please log in.' }, 401)
  c.set('user' as never, user as never)
  await next()
}

// Middleware: requires an admin user.
export async function requireAdmin(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = await getUser(c)
  if (!user) return c.json({ error: 'Unauthorized. Please log in.' }, 401)
  if (user.role !== 'admin') return c.json({ error: 'Forbidden. Admin access required.' }, 403)
  c.set('user' as never, user as never)
  await next()
}
