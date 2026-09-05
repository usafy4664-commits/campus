import { Hono } from 'hono'
import { Bindings, AuthUser, requireAuth } from '../lib/auth'

const lostfound = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// -------- Basic matching logic (NO AI/LLM) --------
// Scores a candidate pair using simple, explainable rules:
//   +50  same category
//   +30  same/overlapping color
//   +40  shared keyword(s) in item name / description
//   +30  same location (case-insensitive contains)
// A total score >= 60 is treated as a "possible match".
function tokenize(s: string | null | undefined): string[] {
  if (!s) return []
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2)
}

function matchScore(lost: any, found: any): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  if (lost.category && found.category && lost.category === found.category) {
    score += 50; reasons.push(`Same category (${lost.category})`)
  }
  if (lost.color && found.color && lost.color.toLowerCase() === found.color.toLowerCase()) {
    score += 30; reasons.push(`Same color (${lost.color})`)
  }
  const lostWords = new Set([...tokenize(lost.item_name), ...tokenize(lost.description)])
  const foundWords = new Set([...tokenize(found.item_name), ...tokenize(found.description)])
  const shared = [...lostWords].filter((w) => foundWords.has(w))
  if (shared.length) { score += 40; reasons.push(`Matching keywords: ${shared.join(', ')}`) }

  if (lost.location && found.location) {
    const a = lost.location.toLowerCase(), b = found.location.toLowerCase()
    if (a === b || a.includes(b) || b.includes(a)) { score += 30; reasons.push(`Same location (${found.location})`) }
  }
  return { score, reasons }
}

// ---------------- LOST ITEMS ----------------
lostfound.get('/lost', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT l.*, u.name AS reporter_name FROM lost_items l JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC`
  ).all()
  return c.json({ items: results })
})

lostfound.post('/lost', requireAuth, async (c) => {
  const user = c.get('user')
  const b = await c.req.json().catch(() => ({}))
  if (!b.item_name || !b.category) return c.json({ error: 'item_name and category are required.' }, 400)
  const res = await c.env.DB.prepare(
    `INSERT INTO lost_items (user_id, item_name, category, color, location, lost_date, description, photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(user.id, b.item_name, b.category, b.color || null, b.location || null,
         b.lost_date || null, b.description || null, b.photo || null).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

// ---------------- FOUND ITEMS ----------------
lostfound.get('/found', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT f.*, u.name AS reporter_name FROM found_items f JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC`
  ).all()
  return c.json({ items: results })
})

lostfound.post('/found', requireAuth, async (c) => {
  const user = c.get('user')
  const b = await c.req.json().catch(() => ({}))
  if (!b.item_name || !b.category) return c.json({ error: 'item_name and category are required.' }, 400)
  const res = await c.env.DB.prepare(
    `INSERT INTO found_items (user_id, item_name, category, color, location, found_date, description, photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(user.id, b.item_name, b.category, b.color || null, b.location || null,
         b.found_date || null, b.description || null, b.photo || null).run()
  return c.json({ success: true, id: res.meta.last_row_id })
})

// ---------------- MATCHING ----------------
// GET /api/lostfound/matches
//   Compares every open lost item with every open found item and
//   returns pairs scoring >= 60, sorted by score.
lostfound.get('/matches', requireAuth, async (c) => {
  const lost = (await c.env.DB.prepare(`SELECT * FROM lost_items WHERE status != 'closed'`).all()).results as any[]
  const found = (await c.env.DB.prepare(`SELECT * FROM found_items WHERE status != 'closed'`).all()).results as any[]

  const matches: any[] = []
  for (const l of lost) {
    for (const f of found) {
      const { score, reasons } = matchScore(l, f)
      if (score >= 60) {
        matches.push({
          score,
          reasons,
          lost:  { id: l.id, item_name: l.item_name, category: l.category, color: l.color, location: l.location, lost_date: l.lost_date },
          found: { id: f.id, item_name: f.item_name, category: f.category, color: f.color, location: f.location, found_date: f.found_date },
        })
      }
    }
  }
  matches.sort((a, b) => b.score - a.score)
  return c.json({ matches })
})

// GET /api/lostfound/matches/:type/:id  -> matches for one specific item
lostfound.get('/matches/:type/:id', requireAuth, async (c) => {
  const type = c.req.param('type') // 'lost' or 'found'
  const id = c.req.param('id')
  if (type !== 'lost' && type !== 'found') return c.json({ error: "type must be 'lost' or 'found'." }, 400)

  if (type === 'lost') {
    const l = await c.env.DB.prepare('SELECT * FROM lost_items WHERE id = ?').bind(id).first<any>()
    if (!l) return c.json({ error: 'Lost item not found.' }, 404)
    const found = (await c.env.DB.prepare(`SELECT * FROM found_items WHERE status != 'closed'`).all()).results as any[]
    const matches = found.map((f) => ({ ...matchScore(l, f), item: f }))
      .filter((m) => m.score >= 60).sort((a, b) => b.score - a.score)
    return c.json({ matches })
  } else {
    const f = await c.env.DB.prepare('SELECT * FROM found_items WHERE id = ?').bind(id).first<any>()
    if (!f) return c.json({ error: 'Found item not found.' }, 404)
    const lost = (await c.env.DB.prepare(`SELECT * FROM lost_items WHERE status != 'closed'`).all()).results as any[]
    const matches = lost.map((l) => ({ ...matchScore(l, f), item: l }))
      .filter((m) => m.score >= 60).sort((a, b) => b.score - a.score)
    return c.json({ matches })
  }
})

export default lostfound
