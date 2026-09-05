import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import type { Bindings, AuthUser } from './lib/auth'
import { requireAuth, requireAdmin } from './lib/auth'
import authRoutes from './routes/auth'
import complaintRoutes from './routes/complaints'
import locationRoutes from './routes/locations'
import announcementRoutes from './routes/announcements'
import lostfoundRoutes from './routes/lostfound'
import sosRoutes from './routes/sos'
import lmsRoutes from './routes/lms'
import aiRoutes from './routes/ai'

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

app.use('/api/*', cors())

// ---------------- API ROUTES ----------------
app.route('/api/auth', authRoutes)
app.route('/api/complaints', complaintRoutes)
app.route('/api/locations', locationRoutes)
app.route('/api/announcements', announcementRoutes)
app.route('/api/lostfound', lostfoundRoutes)
app.route('/api/sos', sosRoutes)
app.route('/api/lms', lmsRoutes)
app.route('/api/ai', aiRoutes)

// Dashboard summary stats
app.get('/api/stats', requireAdmin, async (c) => {
  const db = c.env.DB
  const q = async (sql: string) => (await db.prepare(sql).first<any>())?.n ?? 0
  const [students, complaints, pending, resolved, activeSos, lost, found, events, notices] = await Promise.all([
    q(`SELECT COUNT(*) n FROM users WHERE role='student'`),
    q(`SELECT COUNT(*) n FROM complaints`),
    q(`SELECT COUNT(*) n FROM complaints WHERE status='Pending'`),
    q(`SELECT COUNT(*) n FROM complaints WHERE status='Resolved'`),
    q(`SELECT COUNT(*) n FROM emergency_alerts WHERE status='Active'`),
    q(`SELECT COUNT(*) n FROM lost_items WHERE status!='closed'`),
    q(`SELECT COUNT(*) n FROM found_items WHERE status!='closed'`),
    q(`SELECT COUNT(*) n FROM events`),
    q(`SELECT COUNT(*) n FROM notices`),
  ])
  return c.json({ students, complaints, pending, resolved, activeSos, lost, found, events, notices })
})

// Student-side quick counts
app.get('/api/mystats', requireAuth, async (c) => {
  const user = c.get('user')
  const db = c.env.DB
  const q = async (sql: string) => (await db.prepare(sql).bind(user.id).first<any>())?.n ?? 0
  const [myComplaints, myPending, myResolved, mySos] = await Promise.all([
    q(`SELECT COUNT(*) n FROM complaints WHERE user_id=?`),
    q(`SELECT COUNT(*) n FROM complaints WHERE user_id=? AND status!='Resolved'`),
    q(`SELECT COUNT(*) n FROM complaints WHERE user_id=? AND status='Resolved'`),
    q(`SELECT COUNT(*) n FROM emergency_alerts WHERE user_id=? AND status!='Resolved'`),
  ])
  return c.json({ myComplaints, myPending, myResolved, mySos })
})

// ---------------- STATIC ASSETS ----------------
app.use('/static/*', serveStatic({ root: './public' }))

// ---------------- SPA ENTRY ----------------
// All non-API routes serve the single-page app.
app.get('*', (c) => c.html(INDEX_HTML))

export default app

// The frontend HTML shell — the app logic lives in /static/app.js.
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5.0" />
  <meta name="theme-color" content="#4f46e5" />
  <meta name="description" content="Smart Campus System — one connected platform for students and administration." />
  <meta name="format-detection" content="telephone=no" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>Smart Campus System</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <link href="/static/style.css" rel="stylesheet" />
  <script>
    tailwind.config = {
      theme: { extend: {
        fontFamily: { sans: ['"Plus Jakarta Sans"', 'sans-serif'] },
        colors: {
          brand: { 50:'#eef4ff',100:'#dbe6ff',200:'#bccfff',300:'#8faeff',400:'#5b82ff',500:'#3b5cff',600:'#2438e6',700:'#1c2bc0',900:'#141d78' }
        }
      } }
    }
  </script>
</head>
<body class="font-sans bg-slate-50 text-slate-800 antialiased">
  <div id="app"></div>
  <div id="toast" class="toast-wrap"></div>
  <script src="/static/app.js"></script>
</body>
</html>`
