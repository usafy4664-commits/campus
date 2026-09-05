/* ================================================================
   Smart Campus System — Premium Frontend SPA (vanilla JS + Tailwind)
   Talks to the Hono backend at /api/*
================================================================ */

const App = {
  token: localStorage.getItem('sc_token') || null,
  user: JSON.parse(localStorage.getItem('sc_user') || 'null'),
  route: 'dashboard',
}

/* ---------------- API helper ---------------- */
const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use((cfg) => {
  if (App.token) cfg.headers.Authorization = 'Bearer ' + App.token
  return cfg
})
async function call(method, url, data) {
  try {
    const res = await api({ method, url, data })
    return res.data
  } catch (e) {
    const msg = e?.response?.data?.error || 'Something went wrong.'
    if (e?.response?.status === 401 && App.token) { logout() }
    throw new Error(msg)
  }
}

/* ---------------- Toast ---------------- */
function toast(msg, type = 'success') {
  const colors = {
    success: 'linear-gradient(135deg,#10b981,#059669)',
    error: 'linear-gradient(135deg,#ef4444,#dc2626)',
    info: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    warn: 'linear-gradient(135deg,#f59e0b,#d97706)',
  }
  const icon = { success: 'circle-check', error: 'circle-xmark', info: 'circle-info', warn: 'triangle-exclamation' }[type] || 'circle-info'
  const el = document.createElement('div')
  el.className = 'toast pop-in'
  el.style.background = colors[type] || colors.info
  el.innerHTML = `<i class="fa-solid fa-${icon} text-lg"></i><span>${msg}</span>`
  document.getElementById('toast').appendChild(el)
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(20px)'; el.style.transition = 'all .35s'; setTimeout(() => el.remove(), 350) }, 3400)
}

/* ---------------- Helpers ---------------- */
const esc = (s) => (s ?? '').toString().replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]))
const fmtDate = (s) => s ? new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z')).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const fmtDay = (s) => s ? new Date(s).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—'
const initials = (n) => (n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

function statusPill(status) {
  const map = {
    'Pending': 'bg-amber-100 text-amber-700', 'In Progress': 'bg-blue-100 text-blue-700', 'Resolved': 'bg-emerald-100 text-emerald-700',
    'Active': 'bg-red-100 text-red-700', 'Acknowledged': 'bg-amber-100 text-amber-700', 'Responding': 'bg-blue-100 text-blue-700',
    'open': 'bg-slate-100 text-slate-700', 'matched': 'bg-emerald-100 text-emerald-700', 'closed': 'bg-slate-200 text-slate-500',
  }
  const dot = status === 'Active' ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500 live-dot"></span>' : ''
  return `<span class="pill ${map[status] || 'bg-slate-100 text-slate-600'}">${dot}${esc(status)}</span>`
}
function priorityPill(p) {
  const map = { normal: 'bg-slate-100 text-slate-600', important: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700' }
  const ic = { normal: 'circle', important: 'star', urgent: 'triangle-exclamation' }
  return `<span class="pill ${map[p] || map.normal}"><i class="fa-solid fa-${ic[p] || 'circle'} text-[9px]"></i>${esc(p)}</span>`
}

function fileToBase64(file, maxDim = 1000) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const reader = new FileReader()
    reader.onload = () => { img.src = reader.result }; reader.onerror = reject
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale; canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = reject; reader.readAsDataURL(file)
  })
}

/* ---------------- Session ---------------- */
function saveSession(token, user) {
  App.token = token; App.user = user
  localStorage.setItem('sc_token', token); localStorage.setItem('sc_user', JSON.stringify(user))
  if (typeof injectAIAssistant === 'function') injectAIAssistant()
}
function logout() {
  call('post', '/auth/logout').catch(() => {})
  App.token = null; App.user = null
  localStorage.removeItem('sc_token'); localStorage.removeItem('sc_user')
  const w = document.getElementById('ai-widget')
  if (w) w.remove()
  App.route = 'dashboard'
  try { history.replaceState({ route: 'dashboard' }, '', location.pathname) } catch (e) {}
  render()
}

/* ---------------- Entry welcome voice ---------------- */
const VOICE = {
  entry: '/static/audio/welcome_entry.mp3',
}
function playVoice(src) {
  try {
    const a = new Audio(src)
    a.volume = 0.9
    const p = a.play()
    if (p && p.catch) p.catch(() => {}) // ignore autoplay rejections silently
  } catch (e) {}
}

/* ================================================================ RENDER ROOT */
function render() {
  const root = document.getElementById('app')
  if (!App.token || !App.user) { root.innerHTML = AuthView(); bindAuth(); maybeShowWelcomeSplash(); return }
  root.innerHTML = Shell(); bindShell(); renderRoute()
}

/* "Tap to enter" welcome splash — shown once per browser session on the login screen. */
function maybeShowWelcomeSplash() {
  if (sessionStorage.getItem('sc_entered') === '1') return
  const s = document.createElement('div')
  s.id = 'welcome-splash'
  s.className = 'fixed inset-0 z-[200] hero-gradient mesh flex items-center justify-center p-6 text-center text-white cursor-pointer fade-in'
  s.innerHTML = `
    <div class="blob floaty absolute -top-16 -left-16 w-80 h-80 rounded-full bg-white/10 blur-3xl"></div>
    <div class="blob absolute -bottom-20 -right-10 w-96 h-96 rounded-full bg-white/10 blur-3xl"></div>
    <div class="relative pop-in">
      <div class="w-24 h-24 mx-auto rounded-3xl bg-white/15 backdrop-blur grid place-items-center text-5xl mb-6 shadow-2xl floaty">🎓</div>
      <h1 class="text-4xl sm:text-5xl font-extrabold mb-3">Smart Campus</h1>
      <p class="text-white/80 text-lg mb-10 max-w-sm mx-auto">One connected platform for students & administration</p>
      <button id="enter-btn" class="btn btn-white px-10 py-4 text-lg font-extrabold mx-auto">
        <i class="fa-solid fa-arrow-right"></i><span>Tap to enter</span>
      </button>
    </div>`
  const enter = () => {
    if (sessionStorage.getItem('sc_entered') === '1') return
    sessionStorage.setItem('sc_entered', '1')
    playVoice(VOICE.entry)
    s.style.opacity = '0'; s.style.transition = 'opacity .5s'
    setTimeout(() => s.remove(), 500)
  }
  s.addEventListener('click', enter)
  document.body.appendChild(s)
}

/* ---------------- Router with browser history support ----------------
   go() navigates between app pages AND pushes a history entry so the
   browser's back / forward buttons move between pages inside the app
   (instead of leaving the site). */
const VALID_ROUTES = ['dashboard', 'subjects', 'attendance', 'marks', 'assignments', 'calendar', 'complaints', 'locations', 'announcements', 'lostfound', 'sos']
function go(route, { push = true } = {}) {
  if (!VALID_ROUTES.includes(route)) route = 'dashboard'
  App.route = route
  if (push) {
    try { history.pushState({ route }, '', '#' + route) } catch (e) {}
  }
  render()
}
// Sync App.route from the URL hash (used on first load & hard refresh).
function routeFromHash() {
  const h = (location.hash || '').replace('#', '')
  return VALID_ROUTES.includes(h) ? h : 'dashboard'
}
// Back / forward buttons.
window.addEventListener('popstate', (ev) => {
  const route = (ev.state && ev.state.route) || routeFromHash()
  if (App.token && App.user) { App.route = route; render() }
})

document.addEventListener('DOMContentLoaded', () => {
  // Restore the current page from the URL on load / refresh.
  if (App.token && App.user) {
    App.route = routeFromHash()
    try { history.replaceState({ route: App.route }, '', '#' + App.route) } catch (e) {}
  }
  render()
})

/* ================================================================ AUTH VIEW */
let authMode = 'login'
function AuthView() {
  const feat = [
    ['screwdriver-wrench', 'Complaint Management', 'Report & track campus issues'],
    ['location-dot', 'Campus Locator', 'Find any room or facility'],
    ['bullhorn', 'Events & Notices', 'Never miss an announcement'],
    ['magnifying-glass', 'Smart Lost & Found', 'Auto-matched item recovery'],
    ['tower-broadcast', 'SOS Emergency', 'Instant help when it matters'],
  ]
  return `
  <div class="auth-bg min-h-screen flex items-center justify-center p-4 md:p-8">
    <!-- animated blobs -->
    <div class="blob floaty absolute -top-20 -left-20 w-96 h-96 rounded-full bg-indigo-300/40 blur-3xl"></div>
    <div class="blob absolute -bottom-24 -right-10 w-[28rem] h-[28rem] rounded-full bg-violet-300/40 blur-3xl"></div>
    <div class="blob absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-blue-300/30 blur-3xl"></div>

    <div class="relative w-full max-w-6xl grid lg:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl bg-white pop-in">
      <!-- Brand hero -->
      <div class="hero-gradient mesh text-white p-10 xl:p-14 hidden lg:flex flex-col justify-between relative">
        <div>
          <div class="flex items-center gap-4 mb-12">
            <div class="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-2xl shadow-lg"><i class="fa-solid fa-graduation-cap"></i></div>
            <div><h1 class="text-2xl font-extrabold leading-tight">Smart Campus</h1><p class="text-white/70 text-sm">One platform for the whole campus</p></div>
          </div>
          <h2 class="text-4xl xl:text-5xl font-extrabold leading-[1.1] mb-5">Everything your<br>campus needs,<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-200 to-white">in one place.</span></h2>
          <p class="text-white/75 text-lg leading-relaxed max-w-md">A single connected platform for students and administration — from daily complaints to campus emergencies.</p>
        </div>
        <div class="grid gap-3 mt-10">
          ${feat.map(([i, t, s]) => `
            <div class="flex items-center gap-4 rounded-2xl bg-white/10 backdrop-blur px-4 py-3 hover:bg-white/15 transition">
              <div class="w-11 h-11 rounded-xl bg-white/15 grid place-items-center text-lg flex-shrink-0"><i class="fa-solid fa-${i}"></i></div>
              <div><p class="font-bold leading-tight">${t}</p><p class="text-white/60 text-xs">${s}</p></div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Form -->
      <div class="p-8 sm:p-12 xl:p-16 flex flex-col justify-center">
        <div class="lg:hidden flex items-center gap-3 mb-8">
          <div class="w-12 h-12 rounded-2xl hero-gradient text-white grid place-items-center text-xl"><i class="fa-solid fa-graduation-cap"></i></div>
          <h1 class="text-xl font-extrabold">Smart Campus</h1>
        </div>
        <h2 class="text-3xl font-extrabold text-slate-900 mb-2">${authMode === 'login' ? 'Welcome back 👋' : 'Create your account'}</h2>
        <p class="text-slate-500 mb-8">${authMode === 'login' ? 'Sign in to continue to your dashboard.' : 'Register as a student to get started.'}</p>

        <form id="auth-form" class="space-y-5">
          ${authMode === 'register' ? `
            <div><label class="lbl">Full name</label><input name="name" class="input" placeholder="e.g. Aarav Sharma" required></div>
            <div class="grid grid-cols-2 gap-4">
              <div><label class="lbl">Student ID</label><input name="student_id" class="input" placeholder="CS2021-045"></div>
              <div><label class="lbl">Department</label><input name="department" class="input" placeholder="Computer Science"></div>
            </div>` : ''}
          <div><label class="lbl">Email address</label>
            <div class="relative"><i class="fa-solid fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input name="email" type="email" class="input pl-11" placeholder="you@campus.edu" required></div></div>
          <div><label class="lbl">Password</label>
            <div class="relative"><i class="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
            <input name="password" type="password" class="input pl-11" placeholder="••••••••" required></div></div>
          <button class="btn btn-primary w-full py-3.5 text-base" id="auth-submit">
            <i class="fa-solid fa-${authMode === 'login' ? 'right-to-bracket' : 'user-plus'}"></i>
            <span>${authMode === 'login' ? 'Sign in' : 'Create account'}</span>
          </button>
        </form>

        <p class="text-slate-500 mt-6 text-center">
          ${authMode === 'login' ? "Don't have an account?" : 'Already registered?'}
          <button id="auth-toggle" class="text-indigo-600 font-bold hover:underline ml-1">${authMode === 'login' ? 'Register now' : 'Sign in'}</button>
        </p>

        ${authMode === 'login' ? `
        <div class="mt-8 rounded-2xl bg-slate-50 border border-slate-100 p-5">
          <p class="font-bold text-slate-600 mb-3 text-sm"><i class="fa-solid fa-wand-magic-sparkles text-indigo-500 mr-1"></i>Quick demo login</p>
          <div class="grid grid-cols-2 gap-3">
            <button class="quick-login group text-left rounded-xl bg-white border-2 border-slate-100 p-3 hover:border-indigo-300 hover:shadow-md transition" data-e="admin@campus.edu" data-p="admin123">
              <div class="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-600 grid place-items-center mb-2 group-hover:scale-110 transition"><i class="fa-solid fa-user-shield"></i></div>
              <p class="font-bold text-slate-700 text-sm">Admin</p><p class="text-slate-400 text-xs truncate">admin@campus.edu</p></button>
            <button class="quick-login group text-left rounded-xl bg-white border-2 border-slate-100 p-3 hover:border-emerald-300 hover:shadow-md transition" data-e="aarav@campus.edu" data-p="student123">
              <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-600 grid place-items-center mb-2 group-hover:scale-110 transition"><i class="fa-solid fa-user-graduate"></i></div>
              <p class="font-bold text-slate-700 text-sm">Student</p><p class="text-slate-400 text-xs truncate">aarav@campus.edu</p></button>
          </div>
        </div>` : ''}
      </div>
    </div>
  </div>`
}

function bindAuth() {
  document.getElementById('auth-toggle').onclick = () => { authMode = authMode === 'login' ? 'register' : 'login'; render() }
  document.querySelectorAll('.quick-login').forEach((b) => b.onclick = () => doLogin(b.dataset.e, b.dataset.p))
  document.getElementById('auth-form').onsubmit = async (e) => {
    e.preventDefault()
    const fd = Object.fromEntries(new FormData(e.target).entries())
    const btn = document.getElementById('auth-submit'); const html = btn.innerHTML
    btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i>'
    try {
      if (authMode === 'register') { await call('post', '/auth/register', fd); toast('Account created! Signing you in…') }
      await doLogin(fd.email, fd.password)
    } catch (err) { toast(err.message, 'error'); btn.innerHTML = html }
  }
}
async function doLogin(email, password) {
  const res = await call('post', '/auth/login', { email, password })
  saveSession(res.token, res.user)
  toast('Welcome, ' + res.user.name + '!')
  go('dashboard', { push: false })
  try { history.replaceState({ route: 'dashboard' }, '', '#dashboard') } catch (e) {}
  if (typeof injectAIAssistant === 'function') injectAIAssistant()
}

/* ================================================================ APP SHELL */
const NAV = [
  ['dashboard', 'gauge-high', 'Dashboard', 'Overview'],
  ['subjects', 'book', 'Subjects', 'Course enrollments'],
  ['attendance', 'clipboard-user', 'Attendance', 'Record & history'],
  ['marks', 'chart-simple', 'Marks & Results', 'Academic performance'],
  ['assignments', 'file-pen', 'Assignments', 'Tasks & submissions'],
  ['calendar', 'calendar-days', 'Calendar', 'Timeline & events'],
  ['complaints', 'screwdriver-wrench', 'Complaints', 'Issue management'],
  ['locations', 'location-dot', 'Campus Locator', 'Find places'],
  ['announcements', 'bullhorn', 'Events & Notices', 'Announcements'],
  ['lostfound', 'magnifying-glass', 'Lost & Found', 'Recover items'],
  ['sos', 'tower-broadcast', 'SOS Emergency', 'Urgent help'],
]
const TITLES = Object.fromEntries(NAV.map(([r, i, t]) => [r, t]))
const SUBTITLES = Object.fromEntries(NAV.map(([r, i, t, s]) => [r, s]))

function Shell() {
  const u = App.user, isAdmin = u.role === 'admin'
  return `
  <div class="app-bg flex min-h-screen">
    <!-- Sidebar -->
    <aside id="sidebar" class="sidebar-gradient text-white w-72 flex-shrink-0 flex flex-col fixed lg:sticky top-0 h-screen z-40 -translate-x-full lg:translate-x-0 transition-transform duration-300 shadow-2xl">
      <div class="p-6 flex items-center gap-3.5 border-b border-white/10">
        <div class="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-xl shadow-lg"><i class="fa-solid fa-graduation-cap"></i></div>
        <div><h1 class="font-extrabold text-lg leading-tight">Smart Campus</h1>
          <p class="text-white/50 text-xs flex items-center gap-1"><i class="fa-solid fa-${isAdmin ? 'user-shield' : 'user-graduate'} text-[10px]"></i>${isAdmin ? 'Admin Panel' : 'Student Portal'}</p></div>
      </div>
      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p class="text-white/40 text-[10px] font-bold uppercase tracking-widest px-4 mb-2">Menu</p>
        ${NAV.map(([r, i, t]) => `
          <button data-route="${r}" class="nav-item w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-white/85 ${App.route === r ? 'active' : ''}">
            <i class="fa-solid fa-${i} w-5 text-center text-base"></i><span>${t}</span>
            ${r === 'sos' ? '<span id="sos-badge" class="ml-auto hidden text-[10px] font-extrabold bg-red-500 text-white rounded-full min-w-[20px] h-5 grid place-items-center px-1.5 sos-pulse"></span>' : ''}
          </button>`).join('')}
      </nav>
      <div class="p-4 border-t border-white/10">
        <div class="flex items-center gap-3 mb-3 rounded-2xl bg-white/8 p-3">
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-white/30 to-white/10 grid place-items-center font-extrabold text-sm shadow-inner">${initials(u.name)}</div>
          <div class="min-w-0 flex-1"><p class="text-sm font-bold truncate">${esc(u.name)}</p><p class="text-white/50 text-xs truncate">${esc(u.email)}</p></div>
        </div>
        <button id="logout-btn" class="btn w-full py-2.5 text-sm !bg-white/10 !text-white hover:!bg-white/20"><i class="fa-solid fa-right-from-bracket"></i>Sign out</button>
      </div>
    </aside>
    <div id="backdrop" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 hidden lg:hidden"></div>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="glass border-b border-slate-200/70 sticky top-0 z-20">
        <div class="flex items-center gap-3 px-4 md:px-8 h-16 md:h-[70px]">
          <button id="menu-btn" class="lg:hidden text-slate-600 text-xl w-10 h-10 grid place-items-center rounded-xl hover:bg-slate-100 flex-shrink-0"><i class="fa-solid fa-bars"></i></button>
          <div class="min-w-0">
            <h2 id="page-title" class="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight truncate">Dashboard</h2>
            <p id="page-sub" class="text-slate-400 text-xs font-medium hidden sm:block truncate">Overview</p>
          </div>
          <div class="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div class="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium bg-white rounded-full px-3.5 py-2 border border-slate-200 shadow-sm">
              <i class="fa-regular fa-clock text-indigo-500"></i><span id="clock"></span></div>
            <span class="inline-flex pill ${isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'} !py-2 !px-3.5">
              <i class="fa-solid fa-${isAdmin ? 'user-shield' : 'user-graduate'}"></i>${isAdmin ? 'Administrator' : 'Student'}</span>
          </div>
        </div>
      </header>
      <main id="view" class="flex-1 p-4 md:p-8 max-w-[1400px] w-full mx-auto"></main>
      <footer class="text-center text-slate-400 text-xs py-6">Smart Campus System · One connected platform for students & administration</footer>
    </div>
  </div>`
}

function bindShell() {
  document.querySelectorAll('[data-route]').forEach((b) => b.onclick = () => {
    document.getElementById('sidebar').classList.add('-translate-x-full')
    document.getElementById('backdrop').classList.add('hidden')
    go(b.dataset.route)
  })
  document.getElementById('logout-btn').onclick = logout
  const sb = document.getElementById('sidebar'), bd = document.getElementById('backdrop')
  document.getElementById('menu-btn').onclick = () => { sb.classList.remove('-translate-x-full'); bd.classList.remove('hidden') }
  bd.onclick = () => { sb.classList.add('-translate-x-full'); bd.classList.add('hidden') }
  tickClock()
  if (App.user.role === 'admin') refreshSosBadge()
}

function tickClock() {
  const el = document.getElementById('clock'); if (!el) return
  const set = () => { const c = document.getElementById('clock'); if (c) c.textContent = new Date().toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) }
  set(); clearInterval(window.__clk); window.__clk = setInterval(set, 30000)
}
async function refreshSosBadge() {
  try {
    const { count } = await call('get', '/sos/active/count')
    const b = document.getElementById('sos-badge'); if (!b) return
    if (count > 0) { b.textContent = count; b.classList.remove('hidden') } else b.classList.add('hidden')
  } catch {}
}

function renderRoute() {
  document.getElementById('page-title').textContent = TITLES[App.route] || 'Dashboard'
  const sub = document.getElementById('page-sub'); if (sub) sub.textContent = SUBTITLES[App.route] || ''
  const view = document.getElementById('view')
  view.innerHTML = skeletonGrid()
  const routes = { dashboard: DashboardPage, subjects: SubjectsPage, attendance: AttendancePage, marks: MarksPage, assignments: AssignmentsPage, calendar: CalendarPage, complaints: ComplaintsPage, locations: LocationsPage, announcements: AnnouncementsPage, lostfound: LostFoundPage, sos: SosPage }
  ;(routes[App.route] || DashboardPage)(view)
}

/* ---------------- Shared UI utils ---------------- */
function skeletonGrid() {
  return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-5">${Array(4).fill('<div class="skeleton h-28"></div>').join('')}</div>
    <div class="grid md:grid-cols-3 gap-5 mt-5">${Array(3).fill('<div class="skeleton h-40"></div>').join('')}</div>`
}
function pageHeader(icon, title, subtitle, actionHtml = '') {
  return `<div class="flex flex-wrap items-center justify-between gap-4 mb-7 fade-up">
    <div class="flex items-center gap-4">
      <div class="w-14 h-14 rounded-2xl hero-gradient text-white grid place-items-center text-xl shadow-lg shadow-indigo-200"><i class="fa-solid fa-${icon}"></i></div>
      <div><h3 class="text-2xl font-extrabold text-slate-900">${title}</h3><p class="text-slate-500">${subtitle}</p></div>
    </div>
    ${actionHtml}</div>`
}
function emptyState(icon, title, text = '') {
  return `<div class="card p-14 text-center fade-up">
    <div class="w-20 h-20 mx-auto rounded-3xl bg-slate-50 grid place-items-center text-slate-300 text-4xl mb-4"><i class="fa-solid fa-${icon}"></i></div>
    <p class="text-slate-700 font-bold text-lg">${title}</p>${text ? `<p class="text-slate-400 mt-1">${text}</p>` : ''}</div>`
}
function openModal(html) {
  const m = document.createElement('div')
  m.className = 'fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in'
  m.innerHTML = `<div class="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto pop-in shadow-2xl">${html}</div>`
  m.onclick = (e) => { if (e.target === m) m.remove() }
  document.addEventListener('keydown', function esc(ev) { if (ev.key === 'Escape') { m.remove(); document.removeEventListener('keydown', esc) } })
  document.body.appendChild(m); return m
}
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }

/* ================================================================ DASHBOARD */
function tile(cls, icon, value, label) {
  return `<div class="tile ${cls} p-5"><div class="glow"></div>
    <div class="flex items-center justify-between mb-3"><div class="w-11 h-11 rounded-xl bg-white/20 grid place-items-center text-lg"><i class="fa-solid fa-${icon}"></i></div></div>
    <p class="text-4xl font-extrabold leading-none">${value}</p>
    <p class="text-white/80 text-sm font-medium mt-1.5">${label}</p></div>`
}
function actionCard(icon, title, sub, route, color = 'indigo') {
  const c = { indigo: 'bg-indigo-50 text-indigo-600', emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600', sky: 'bg-sky-50 text-sky-600', violet: 'bg-violet-50 text-violet-600' }[color]
  return `<button onclick="App.route='${route}';render()" class="card card-hover p-6 text-left w-full group">
    <div class="w-14 h-14 rounded-2xl ${c} grid place-items-center text-2xl mb-4 group-hover:scale-110 transition"><i class="fa-solid fa-${icon}"></i></div>
    <p class="font-extrabold text-slate-900 text-lg">${title}</p><p class="text-slate-500 text-sm mt-0.5">${sub}</p>
    <p class="text-indigo-600 text-sm font-bold mt-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">Open <i class="fa-solid fa-arrow-right text-xs"></i></p>
  </button>`
}

async function DashboardPage(view) {
  const isAdmin = App.user.role === 'admin'
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  try {
    if (isAdmin) {
      const s = await call('get', '/stats')
      view.innerHTML = `
      <div class="fade-up space-y-6">
        <div class="hero-gradient mesh rounded-3xl p-8 text-white relative overflow-hidden">
          <div class="blob floaty absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/10 blur-2xl"></div>
          <div class="relative">
            <p class="text-white/70 font-medium">${greet},</p>
            <h3 class="text-3xl font-extrabold mt-1">${esc(App.user.name)} 👋</h3>
            <p class="text-white/70 mt-2 max-w-lg">Here's the live snapshot of everything happening across campus today.</p>
          </div>
        </div>

        ${s.activeSos > 0 ? `<div class="card p-5 border-l-4 border-red-500 bg-red-50/60 flex items-center gap-4 fade-up">
          <div class="w-12 h-12 rounded-2xl bg-red-500 text-white grid place-items-center text-xl sos-pulse"><i class="fa-solid fa-tower-broadcast"></i></div>
          <div class="flex-1"><p class="font-extrabold text-red-700 text-lg">${s.activeSos} active emergency alert${s.activeSos > 1 ? 's' : ''}</p><p class="text-red-600 text-sm">Requires immediate attention from administration.</p></div>
          <button onclick="go('sos')" class="btn btn-danger px-5 py-2.5">Respond now</button>
        </div>` : ''}

        <div>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Campus overview</p>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            ${tile('tile-indigo', 'users', s.students, 'Students')}
            ${tile('tile-violet', 'screwdriver-wrench', s.complaints, 'Total Complaints')}
            ${tile('tile-amber', 'clock', s.pending, 'Pending Issues')}
            ${tile('tile-green', 'circle-check', s.resolved, 'Resolved')}
            ${tile('tile-rose', 'tower-broadcast', s.activeSos, 'Active SOS')}
            ${tile('tile-blue', 'magnifying-glass', s.lost + '/' + s.found, 'Lost / Found')}
            ${tile('tile-sky', 'calendar-days', s.events, 'Events')}
            ${tile('tile-teal', 'bullhorn', s.notices, 'Notices')}
          </div>
        </div>

        <div>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Quick actions</p>
          <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            ${actionCard('screwdriver-wrench', 'Manage Complaints', 'Review & update status', 'complaints', 'indigo')}
            ${actionCard('tower-broadcast', 'Emergency Center', 'Respond to SOS alerts', 'sos', 'rose')}
            ${actionCard('bullhorn', 'Post Announcement', 'Add events & notices', 'announcements', 'amber')}
            ${actionCard('location-dot', 'Manage Locations', 'Add campus places', 'locations', 'sky')}
          </div>
        </div>
      </div>`
    } else {
      const s = await call('get', '/mystats')
      view.innerHTML = `
      <div class="fade-up space-y-6">
        <div class="hero-gradient mesh rounded-3xl p-8 text-white relative overflow-hidden">
          <div class="blob floaty absolute -right-10 -top-12 w-60 h-60 rounded-full bg-white/10 blur-2xl"></div>
          <div class="relative flex items-start justify-between flex-wrap gap-4">
            <div>
              <p class="text-white/70 font-medium">${greet},</p>
              <h3 class="text-3xl font-extrabold mt-1">${esc(App.user.name)} 👋</h3>
              <p class="text-white/70 mt-2">${esc(App.user.student_id || 'Student')}${App.user.department ? ' · ' + esc(App.user.department) : ''}</p>
            </div>
            <button onclick="go('sos')" class="btn btn-danger px-6 py-3.5 text-base sos-pulse"><i class="fa-solid fa-tower-broadcast"></i>Emergency SOS</button>
          </div>
        </div>

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-5 stagger">
          ${tile('tile-indigo', 'screwdriver-wrench', s.myComplaints, 'My Complaints')}
          ${tile('tile-amber', 'clock', s.myPending, 'In Progress')}
          ${tile('tile-green', 'circle-check', s.myResolved, 'Resolved')}
          ${tile('tile-rose', 'tower-broadcast', s.mySos, 'Active SOS')}
        </div>

        <div>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Campus services</p>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            ${actionCard('screwdriver-wrench', 'Report an Issue', 'Fan, light, water, furniture…', 'complaints', 'indigo')}
            ${actionCard('location-dot', 'Find a Location', 'Rooms, labs, offices', 'locations', 'sky')}
            ${actionCard('bullhorn', 'Events & Notices', 'Stay updated', 'announcements', 'amber')}
            ${actionCard('magnifying-glass', 'Lost & Found', 'Report or search items', 'lostfound', 'violet')}
            ${actionCard('tower-broadcast', 'Emergency SOS', 'Get urgent help', 'sos', 'rose')}
            ${actionCard('circle-user', 'My Profile', esc(App.user.email), 'dashboard', 'emerald')}
          </div>
        </div>
      </div>`
    }
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Could not load dashboard', e.message) }
}

/* ================================================================ COMPLAINTS */
const COMPLAINT_CATS = ['Electrical', 'Furniture', 'Water', 'Cleaning', 'Classroom', 'Other']
const CATEGORY_ICON = { Electrical: 'bolt', Furniture: 'chair', Water: 'droplet', Cleaning: 'broom', Classroom: 'chalkboard', Other: 'circle-question' }
const CATEGORY_COLOR = { Electrical: 'bg-amber-50 text-amber-600', Furniture: 'bg-orange-50 text-orange-600', Water: 'bg-sky-50 text-sky-600', Cleaning: 'bg-teal-50 text-teal-600', Classroom: 'bg-violet-50 text-violet-600', Other: 'bg-slate-50 text-slate-600' }

async function ComplaintsPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { complaints } = await call('get', '/complaints')
    const action = isAdmin ? '' : `<button id="new-complaint" class="btn btn-primary px-5 py-3"><i class="fa-solid fa-plus"></i>New Complaint</button>`
    const counts = { All: complaints.length, Pending: 0, 'In Progress': 0, Resolved: 0 }
    complaints.forEach((c) => counts[c.status]++)
    const filters = isAdmin ? `<div class="flex gap-2 flex-wrap mb-6 fade-up">
      ${['All', 'Pending', 'In Progress', 'Resolved'].map((s, i) => `<button class="cfilter btn ${i === 0 ? 'btn-primary' : 'btn-ghost'} px-4 py-2 text-sm" data-s="${s}">${s}<span class="ml-1.5 text-xs opacity-70">${counts[s]}</span></button>`).join('')}</div>` : ''
    view.innerHTML = `${pageHeader('screwdriver-wrench', isAdmin ? 'All Complaints' : 'My Complaints', isAdmin ? 'Review and update the status of every reported issue.' : 'Report campus issues and track their resolution.', action)}
      ${filters}<div id="complaint-list" class="grid gap-4 stagger">${renderComplaints(complaints, isAdmin)}</div>`
    if (!isAdmin) document.getElementById('new-complaint').onclick = openComplaintForm
    bindComplaintActions(isAdmin)
    if (isAdmin) document.querySelectorAll('.cfilter').forEach((b) => b.onclick = () => {
      document.querySelectorAll('.cfilter').forEach((x) => { x.classList.remove('btn-primary'); x.classList.add('btn-ghost') })
      b.classList.add('btn-primary'); b.classList.remove('btn-ghost')
      const f = b.dataset.s === 'All' ? complaints : complaints.filter((c) => c.status === b.dataset.s)
      document.getElementById('complaint-list').innerHTML = renderComplaints(f, isAdmin); bindComplaintActions(isAdmin)
    })
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Could not load complaints', e.message) }
}

function renderComplaints(list, isAdmin) {
  if (!list.length) return emptyState('clipboard-check', isAdmin ? 'No complaints found' : 'No complaints yet', isAdmin ? 'Nothing to review in this filter.' : 'Click "New Complaint" to report a campus issue.')
  return list.map((c) => `
    <div class="card card-hover p-6">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl ${CATEGORY_COLOR[c.category] || CATEGORY_COLOR.Other} grid place-items-center text-xl flex-shrink-0"><i class="fa-solid fa-${CATEGORY_ICON[c.category] || 'circle-question'}"></i></div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3 flex-wrap">
            <div><h4 class="font-extrabold text-slate-900 text-lg">${esc(c.title)}</h4>
              <p class="text-xs text-slate-400 mt-0.5 font-medium">#${c.id} · ${esc(c.category)}${c.location ? ' · <i class="fa-solid fa-location-dot"></i> ' + esc(c.location) : ''}</p></div>
            ${statusPill(c.status)}
          </div>
          <p class="text-slate-600 mt-3">${esc(c.description)}</p>
          ${c.photo ? `<img src="${c.photo}" class="mt-4 rounded-2xl max-h-56 border border-slate-100 shadow-sm">` : ''}
          <div class="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 flex-wrap gap-2">
            <p class="text-xs text-slate-400 font-medium">${isAdmin ? `<span class="inline-flex items-center gap-1.5"><span class="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center text-[10px] font-bold">${initials(c.student_name)}</span>${esc(c.student_name)} ${c.student_id ? '(' + esc(c.student_id) + ')' : ''}</span> · ` : ''}<i class="fa-regular fa-clock"></i> ${fmtDate(c.created_at)}</p>
            ${isAdmin ? complaintStatusButtons(c) : ''}
          </div>
        </div>
      </div>
    </div>`).join('')
}
function complaintStatusButtons(c) {
  return `<div class="flex gap-1.5 flex-wrap">${['Pending', 'In Progress', 'Resolved'].map((s) => `<button class="cstatus btn ${c.status === s ? 'btn-primary' : 'btn-ghost'} px-3 py-1.5 text-xs" data-id="${c.id}" data-s="${s}">${s}</button>`).join('')}</div>`
}
function bindComplaintActions(isAdmin) {
  if (!isAdmin) return
  document.querySelectorAll('.cstatus').forEach((b) => b.onclick = async () => {
    try { await call('patch', `/complaints/${b.dataset.id}/status`, { status: b.dataset.s }); toast('Status updated to "' + b.dataset.s + '"'); ComplaintsPage(document.getElementById('view')) }
    catch (e) { toast(e.message, 'error') }
  })
}

function openComplaintForm() {
  const m = openModal(`
    <div class="p-7">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-2xl hero-gradient text-white grid place-items-center text-lg"><i class="fa-solid fa-screwdriver-wrench"></i></div>
        <div class="flex-1"><h3 class="text-xl font-extrabold text-slate-900">Report a Campus Issue</h3><p class="text-slate-400 text-sm">We'll notify administration right away.</p></div>
        <button class="close text-slate-400 hover:text-slate-600 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="cform" class="space-y-4">
        <div><label class="lbl">Title</label><input name="title" class="input" placeholder="e.g. Fan not working in Room 204" required></div>
        <div class="grid grid-cols-2 gap-4">
          <div><label class="lbl">Category</label><select name="category" class="input">${COMPLAINT_CATS.map((c) => `<option>${c}</option>`).join('')}</select></div>
          <div><label class="lbl">Location</label><input name="location" class="input" placeholder="e.g. Room 204"></div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="lbl !mb-0">Description</label>
            <button type="button" id="voice-btn" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full transition"><i class="fa-solid fa-microphone"></i><span id="voice-label">Speak</span></button>
          </div>
          <textarea name="description" id="cdesc" class="input" rows="3" placeholder="Describe the problem… or tap Speak to use your voice" required></textarea>
          <p id="voice-hint" class="text-xs text-indigo-500 mt-1.5 hidden font-medium"></p>
        </div>
        <div><label class="lbl">Photo (optional)</label>
          <label class="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition">
            <i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-300 mb-1"></i><span class="text-sm text-slate-500">Tap to upload a photo</span>
            <input type="file" id="cphoto" accept="image/*" class="hidden"></label>
          <img id="cpreview" class="mt-3 rounded-2xl max-h-44 hidden border border-slate-100 shadow-sm">
        </div>
        <button class="btn btn-primary w-full py-3.5 text-base" id="csubmit"><i class="fa-solid fa-paper-plane"></i>Submit Complaint</button>
      </form>
    </div>`)
  m.querySelector('.close').onclick = () => m.remove()
  setupVoice(m.querySelector('#voice-btn'), m.querySelector('#cdesc'), m.querySelector('#voice-label'), m.querySelector('#voice-hint'))
  let photoData = null
  m.querySelector('#cphoto').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; photoData = await fileToBase64(f); const img = m.querySelector('#cpreview'); img.src = photoData; img.classList.remove('hidden') }
  m.querySelector('#cform').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    const btn = m.querySelector('#csubmit'); btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i>'
    try { await call('post', '/complaints', { ...fd, photo: photoData }); toast('Complaint submitted successfully!'); m.remove(); ComplaintsPage(document.getElementById('view')) }
    catch (err) { toast(err.message, 'error'); btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>Submit Complaint' }
  }
}

/* Voice input (Web Speech API — browser only, no external AI) */
function setupVoice(btn, textarea, label, hint) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) { btn.disabled = true; btn.classList.add('opacity-40', 'cursor-not-allowed'); btn.title = 'Voice not supported in this browser'; return }
  let rec = null, listening = false
  btn.onclick = () => {
    if (listening) { rec && rec.stop(); return }
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false
    const base = textarea.value ? textarea.value + ' ' : ''
    listening = true; label.textContent = 'Listening…'; btn.classList.add('!bg-red-100', '!text-red-600')
    hint.textContent = '🎤 Listening… speak now'; hint.classList.remove('hidden')
    rec.onresult = (ev) => { let txt = ''; for (let i = 0; i < ev.results.length; i++) txt += ev.results[i][0].transcript; textarea.value = base + txt }
    rec.onerror = (e) => { hint.textContent = 'Voice error: ' + e.error }
    rec.onend = () => { listening = false; label.textContent = 'Speak'; btn.classList.remove('!bg-red-100', '!text-red-600'); hint.classList.add('hidden') }
    rec.start()
  }
}

/* ================================================================ CAMPUS LOCATOR */
const LOC_CATS = ['Classroom', 'Lab', 'Department', 'Office', 'Facility', 'Hall']
const LOC_ICON = { Classroom: 'chalkboard-user', Lab: 'flask', Department: 'building-columns', Office: 'briefcase', Facility: 'building', Hall: 'people-roof' }
const LOC_COLOR = { Classroom: 'bg-violet-50 text-violet-600', Lab: 'bg-sky-50 text-sky-600', Department: 'bg-indigo-50 text-indigo-600', Office: 'bg-amber-50 text-amber-600', Facility: 'bg-emerald-50 text-emerald-600', Hall: 'bg-rose-50 text-rose-600' }

async function LocationsPage(view) {
  const isAdmin = App.user.role === 'admin'
  const action = isAdmin ? `<button id="new-loc" class="btn btn-primary px-5 py-3"><i class="fa-solid fa-plus"></i>Add Location</button>` : ''
  view.innerHTML = `${pageHeader('location-dot', 'Campus Locator', 'Quickly find any room, lab, department or facility.', action)}
    <div class="flex flex-wrap gap-3 mb-6 fade-up">
      <div class="relative flex-1 min-w-[220px]"><i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input id="loc-search" class="input pl-11" placeholder="Search a place by name or building…"></div>
      <select id="loc-cat" class="input max-w-[200px]"><option value="">All categories</option>${LOC_CATS.map((c) => `<option>${c}</option>`).join('')}</select>
    </div>
    <div id="loc-list" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger"></div>`
  if (isAdmin) document.getElementById('new-loc').onclick = openLocationForm
  const load = async () => {
    const search = document.getElementById('loc-search').value, category = document.getElementById('loc-cat').value
    const { locations } = await call('get', `/locations?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`)
    document.getElementById('loc-list').innerHTML = !locations.length ? `<div class="col-span-full">${emptyState('map-location-dot', 'No locations found', 'Try a different search or category.')}</div>` :
      locations.map((l) => `<div class="card card-hover p-6">
        <div class="flex items-start gap-4">
          <div class="w-14 h-14 rounded-2xl ${LOC_COLOR[l.category] || 'bg-slate-50 text-slate-600'} grid place-items-center text-xl flex-shrink-0"><i class="fa-solid fa-${LOC_ICON[l.category] || 'location-dot'}"></i></div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2"><h4 class="font-extrabold text-slate-900 text-lg">${esc(l.name)}</h4>
              ${isAdmin ? `<button class="del-loc text-slate-300 hover:text-red-500 w-8 h-8 grid place-items-center rounded-lg hover:bg-red-50" data-id="${l.id}"><i class="fa-solid fa-trash text-sm"></i></button>` : ''}</div>
            <span class="pill ${LOC_COLOR[l.category] || 'bg-slate-100 text-slate-600'} mt-1.5">${esc(l.category)}</span>
            <p class="text-sm text-slate-500 mt-3 font-medium"><i class="fa-solid fa-building mr-1.5 text-slate-400"></i>${esc(l.building || '—')}${l.floor ? ' · ' + esc(l.floor) + ' floor' : ''}</p>
            ${l.description ? `<p class="text-sm text-slate-400 mt-1">${esc(l.description)}</p>` : ''}
          </div>
        </div></div>`).join('')
    document.querySelectorAll('.del-loc').forEach((b) => b.onclick = async () => { if (confirm('Delete this location?')) { await call('delete', '/locations/' + b.dataset.id); toast('Location deleted'); load() } })
  }
  document.getElementById('loc-search').oninput = debounce(load, 250)
  document.getElementById('loc-cat').onchange = load
  load()
}
function openLocationForm() {
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl hero-gradient text-white grid place-items-center text-lg"><i class="fa-solid fa-location-dot"></i></div><h3 class="text-xl font-extrabold flex-1">Add Location</h3><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="lform" class="space-y-4">
      <div><label class="lbl">Name</label><input name="name" class="input" placeholder="e.g. Room 204" required></div>
      <div class="grid grid-cols-2 gap-4"><div><label class="lbl">Category</label><select name="category" class="input">${LOC_CATS.map((c) => `<option>${c}</option>`).join('')}</select></div><div><label class="lbl">Building</label><input name="building" class="input" placeholder="Lab Block"></div></div>
      <div><label class="lbl">Floor</label><input name="floor" class="input" placeholder="2nd"></div>
      <div><label class="lbl">Description</label><textarea name="description" class="input" rows="2"></textarea></div>
      <button class="btn btn-primary w-full py-3.5">Add Location</button></form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#lform').onsubmit = async (e) => { e.preventDefault(); try { await call('post', '/locations', Object.fromEntries(new FormData(e.target).entries())); toast('Location added'); m.remove(); LocationsPage(document.getElementById('view')) } catch (err) { toast(err.message, 'error') } }
}

/* ================================================================ EVENTS & NOTICES */
async function AnnouncementsPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const [{ events }, { notices }] = await Promise.all([call('get', '/announcements/events'), call('get', '/announcements/notices')])
    view.innerHTML = `${pageHeader('bullhorn', 'Events & Notices', 'Stay up to date with everything happening on campus.')}
      <div class="grid lg:grid-cols-2 gap-6 items-start">
        <section class="fade-up">
          <div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold text-slate-900 flex items-center gap-2"><span class="w-8 h-8 rounded-xl bg-sky-100 text-sky-600 grid place-items-center text-sm"><i class="fa-solid fa-calendar-days"></i></span>Upcoming Events</h3>${isAdmin ? `<button id="new-event" class="btn btn-ghost px-3 py-2 text-sm"><i class="fa-solid fa-plus"></i>Add</button>` : ''}</div>
          <div class="grid gap-4 stagger">${!events.length ? emptyState('calendar-xmark', 'No events yet') : events.map(eventCard.bind(null, isAdmin)).join('')}</div>
        </section>
        <section class="fade-up">
          <div class="flex items-center justify-between mb-4"><h3 class="text-lg font-extrabold text-slate-900 flex items-center gap-2"><span class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 grid place-items-center text-sm"><i class="fa-solid fa-bullhorn"></i></span>Notices</h3>${isAdmin ? `<button id="new-notice" class="btn btn-ghost px-3 py-2 text-sm"><i class="fa-solid fa-plus"></i>Add</button>` : ''}</div>
          <div class="grid gap-4 stagger">${!notices.length ? emptyState('bell-slash', 'No notices yet') : notices.map(noticeCard.bind(null, isAdmin)).join('')}</div>
        </section>
      </div>`
    if (isAdmin) {
      document.getElementById('new-event').onclick = openEventForm
      document.getElementById('new-notice').onclick = openNoticeForm
      document.querySelectorAll('.del-ev').forEach((b) => b.onclick = async () => { if (confirm('Delete event?')) { await call('delete', '/announcements/events/' + b.dataset.id); toast('Event deleted'); AnnouncementsPage(view) } })
      document.querySelectorAll('.del-no').forEach((b) => b.onclick = async () => { if (confirm('Delete notice?')) { await call('delete', '/announcements/notices/' + b.dataset.id); toast('Notice deleted'); AnnouncementsPage(view) } })
    }
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Could not load announcements', e.message) }
}
function eventCard(isAdmin, e) {
  const d = e.event_date ? new Date(e.event_date) : null
  return `<div class="card card-hover p-5"><div class="flex gap-4">
    <div class="flex flex-col items-center justify-center w-16 h-16 rounded-2xl hero-gradient text-white flex-shrink-0 shadow-md">
      <span class="text-[10px] font-bold uppercase tracking-wide">${d ? d.toLocaleString('en', { month: 'short' }) : '—'}</span>
      <span class="text-2xl font-extrabold leading-none">${d ? d.getDate() : '?'}</span></div>
    <div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2"><h4 class="font-extrabold text-slate-900">${esc(e.title)}</h4>${isAdmin ? `<button class="del-ev text-slate-300 hover:text-red-500 w-7 h-7 grid place-items-center rounded-lg hover:bg-red-50" data-id="${e.id}"><i class="fa-solid fa-trash text-xs"></i></button>` : ''}</div>
      ${e.description ? `<p class="text-sm text-slate-600 mt-1">${esc(e.description)}</p>` : ''}
      <p class="text-xs text-slate-400 mt-2 font-medium">${e.venue ? '<i class="fa-solid fa-location-dot mr-1"></i>' + esc(e.venue) : ''} ${e.event_date ? '· ' + fmtDay(e.event_date) : ''}</p></div>
  </div></div>`
}
function noticeCard(isAdmin, n) {
  const bar = { urgent: 'border-red-400', important: 'border-amber-400', normal: 'border-slate-200' }[n.priority] || 'border-slate-200'
  return `<div class="card card-hover p-5 border-l-4 ${bar}">
    <div class="flex items-start justify-between gap-2"><h4 class="font-extrabold text-slate-900">${esc(n.title)}</h4>
      <div class="flex items-center gap-2">${priorityPill(n.priority)}${isAdmin ? `<button class="del-no text-slate-300 hover:text-red-500 w-7 h-7 grid place-items-center rounded-lg hover:bg-red-50" data-id="${n.id}"><i class="fa-solid fa-trash text-xs"></i></button>` : ''}</div></div>
    ${n.body ? `<p class="text-sm text-slate-600 mt-1.5">${esc(n.body)}</p>` : ''}
    <p class="text-xs text-slate-400 mt-2 font-medium"><i class="fa-regular fa-clock mr-1"></i>${fmtDate(n.created_at)}</p></div>`
}
function openEventForm() {
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 grid place-items-center text-lg"><i class="fa-solid fa-calendar-days"></i></div><h3 class="text-xl font-extrabold flex-1">Add Event</h3><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="ef" class="space-y-4"><div><label class="lbl">Title</label><input name="title" class="input" required></div><div><label class="lbl">Description</label><textarea name="description" class="input" rows="2"></textarea></div>
    <div class="grid grid-cols-2 gap-4"><div><label class="lbl">Date</label><input name="event_date" type="date" class="input"></div><div><label class="lbl">Venue</label><input name="venue" class="input"></div></div>
    <button class="btn btn-primary w-full py-3.5">Add Event</button></form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#ef').onsubmit = async (e) => { e.preventDefault(); try { await call('post', '/announcements/events', Object.fromEntries(new FormData(e.target).entries())); toast('Event added'); m.remove(); AnnouncementsPage(document.getElementById('view')) } catch (err) { toast(err.message, 'error') } }
}
function openNoticeForm() {
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 grid place-items-center text-lg"><i class="fa-solid fa-bullhorn"></i></div><h3 class="text-xl font-extrabold flex-1">Add Notice</h3><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="nf" class="space-y-4"><div><label class="lbl">Title</label><input name="title" class="input" required></div><div><label class="lbl">Body</label><textarea name="body" class="input" rows="3"></textarea></div>
    <div><label class="lbl">Priority</label><select name="priority" class="input"><option value="normal">Normal</option><option value="important">Important</option><option value="urgent">Urgent</option></select></div>
    <button class="btn btn-primary w-full py-3.5">Add Notice</button></form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#nf').onsubmit = async (e) => { e.preventDefault(); try { await call('post', '/announcements/notices', Object.fromEntries(new FormData(e.target).entries())); toast('Notice added'); m.remove(); AnnouncementsPage(document.getElementById('view')) } catch (err) { toast(err.message, 'error') } }
}

/* ================================================================ LOST & FOUND */
const LF_CATS = ['Electronics', 'Wallet/Cards', 'Bag', 'Keys', 'Books', 'Accessories', 'Other']
let lfTab = 'lost'
async function LostFoundPage(view) {
  try {
    const [{ items: lost }, { items: found }, { matches }] = await Promise.all([
      call('get', '/lostfound/lost'), call('get', '/lostfound/found'), call('get', '/lostfound/matches')])
    view.innerHTML = `${pageHeader('magnifying-glass', 'Smart Lost & Found', 'Report items and let the system suggest possible matches automatically.',
      `<div class="flex gap-2"><button id="report-lost" class="btn btn-ghost px-4 py-3"><i class="fa-solid fa-circle-question"></i>Report Lost</button><button id="report-found" class="btn btn-primary px-4 py-3"><i class="fa-solid fa-hand-holding-heart"></i>Report Found</button></div>`)}
      ${matches.length ? `<div class="card p-6 mb-6 fade-up" style="background:linear-gradient(135deg,#ecfdf5,#f0fdfa);border-color:#a7f3d0">
        <h4 class="font-extrabold text-emerald-700 mb-4 flex items-center gap-2 text-lg"><span class="w-9 h-9 rounded-xl bg-emerald-500 text-white grid place-items-center"><i class="fa-solid fa-wand-magic-sparkles"></i></span>${matches.length} Possible Match${matches.length > 1 ? 'es' : ''} Found</h4>
        <div class="grid gap-4 stagger">${matches.map(matchCard).join('')}</div></div>` : ''}
      <div class="flex gap-2 mb-5">
        <button class="lftab btn ${lfTab === 'lost' ? 'btn-primary' : 'btn-ghost'} px-5 py-2.5" data-t="lost"><i class="fa-solid fa-circle-question"></i>Lost Items <span class="opacity-70">${lost.length}</span></button>
        <button class="lftab btn ${lfTab === 'found' ? 'btn-primary' : 'btn-ghost'} px-5 py-2.5" data-t="found"><i class="fa-solid fa-hand-holding-heart"></i>Found Items <span class="opacity-70">${found.length}</span></button>
      </div>
      <div id="lf-list" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">${renderLfItems(lfTab === 'lost' ? lost : found, lfTab)}</div>`
    document.getElementById('report-lost').onclick = () => openLfForm('lost')
    document.getElementById('report-found').onclick = () => openLfForm('found')
    document.querySelectorAll('.lftab').forEach((b) => b.onclick = () => { lfTab = b.dataset.t; LostFoundPage(view) })
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Could not load Lost & Found', e.message) }
}
function matchCard(m) {
  return `<div class="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm">
    <div class="flex items-center justify-between mb-3"><span class="pill bg-emerald-100 text-emerald-700"><i class="fa-solid fa-bolt"></i>Match score ${m.score}</span>
      <span class="text-xs text-emerald-600 font-bold">Possible Match</span></div>
    <div class="grid grid-cols-2 gap-3">
      <div class="rounded-xl bg-amber-50 p-3"><p class="text-[10px] font-extrabold text-amber-600 uppercase tracking-wide mb-1"><i class="fa-solid fa-circle-question mr-1"></i>Lost</p><p class="font-bold text-slate-800">${esc(m.lost.item_name)}</p><p class="text-xs text-slate-500 mt-0.5">${esc(m.lost.color || '')}${m.lost.location ? ' · ' + esc(m.lost.location) : ''}</p></div>
      <div class="rounded-xl bg-emerald-50 p-3"><p class="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide mb-1"><i class="fa-solid fa-hand-holding-heart mr-1"></i>Found</p><p class="font-bold text-slate-800">${esc(m.found.item_name)}</p><p class="text-xs text-slate-500 mt-0.5">${esc(m.found.color || '')}${m.found.location ? ' · ' + esc(m.found.location) : ''}</p></div>
    </div>
    <p class="text-xs text-slate-500 mt-3 flex items-start gap-1.5"><i class="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i><span>${m.reasons.map(esc).join(' · ')}</span></p></div>`
}
function renderLfItems(list, type) {
  if (!list.length) return `<div class="col-span-full">${emptyState('box-open', `No ${type} items reported`, 'Reports will appear here.')}</div>`
  return list.map((it) => `<div class="card card-hover overflow-hidden">
    ${it.photo ? `<img src="${it.photo}" class="w-full h-44 object-cover">` : `<div class="w-full h-44 bg-gradient-to-br from-slate-50 to-slate-100 grid place-items-center text-slate-300 text-4xl"><i class="fa-solid fa-box-open"></i></div>`}
    <div class="p-5"><div class="flex items-center justify-between gap-2"><h4 class="font-extrabold text-slate-900 text-lg">${esc(it.item_name)}</h4>
      <span class="pill ${type === 'lost' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">${type}</span></div>
      <p class="text-xs text-slate-500 mt-1 font-medium">${esc(it.category)}${it.color ? ' · ' + esc(it.color) : ''}</p>
      ${it.description ? `<p class="text-sm text-slate-600 mt-2">${esc(it.description)}</p>` : ''}
      <p class="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100 font-medium"><i class="fa-solid fa-location-dot mr-1"></i>${esc(it.location || '—')} · ${esc(it.reporter_name)}</p></div></div>`).join('')
}
function openLfForm(type) {
  const isLost = type === 'lost'
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl ${isLost ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} grid place-items-center text-lg"><i class="fa-solid fa-${isLost ? 'circle-question' : 'hand-holding-heart'}"></i></div><h3 class="text-xl font-extrabold flex-1">Report ${isLost ? 'Lost' : 'Found'} Item</h3><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="lff" class="space-y-4">
      <div><label class="lbl">Item name</label><input name="item_name" class="input" placeholder="e.g. Black Wallet" required></div>
      <div class="grid grid-cols-2 gap-4"><div><label class="lbl">Category</label><select name="category" class="input">${LF_CATS.map((c) => `<option>${c}</option>`).join('')}</select></div><div><label class="lbl">Color</label><input name="color" class="input" placeholder="Black"></div></div>
      <div class="grid grid-cols-2 gap-4"><div><label class="lbl">${isLost ? 'Lost at' : 'Found at'}</label><input name="location" class="input" placeholder="Central Library"></div><div><label class="lbl">Date</label><input name="${isLost ? 'lost_date' : 'found_date'}" type="date" class="input"></div></div>
      <div><label class="lbl">Description</label><textarea name="description" class="input" rows="2"></textarea></div>
      <div><label class="lbl">Photo (optional)</label><label class="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition"><i class="fa-solid fa-cloud-arrow-up text-2xl text-slate-300 mb-1"></i><span class="text-sm text-slate-500">Tap to upload a photo</span><input type="file" id="lfphoto" accept="image/*" class="hidden"></label><img id="lfprev" class="mt-3 rounded-2xl max-h-44 hidden border border-slate-100"></div>
      <button class="btn ${isLost ? 'btn-ghost' : 'btn-primary'} w-full py-3.5" id="lfsub">Submit Report</button></form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  let photoData = null
  m.querySelector('#lfphoto').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; photoData = await fileToBase64(f); const img = m.querySelector('#lfprev'); img.src = photoData; img.classList.remove('hidden') }
  m.querySelector('#lff').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    const btn = m.querySelector('#lfsub'); btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i>'
    try { await call('post', '/lostfound/' + type, { ...fd, photo: photoData }); toast('Report submitted! Checking for matches…'); m.remove(); LostFoundPage(document.getElementById('view')) }
    catch (err) { toast(err.message, 'error'); btn.innerHTML = 'Submit Report' }
  }
}

/* ================================================================ SOS / EMERGENCY */
const SOS_TYPES = [['Medical', 'kit-medical', 'from-red-500 to-rose-600'], ['Security', 'shield-halved', 'from-orange-500 to-amber-600'], ['Fire', 'fire', 'from-rose-500 to-red-700'], ['Assistance', 'hand-holding-hand', 'from-amber-500 to-yellow-600'], ['Other', 'circle-exclamation', 'from-slate-500 to-slate-700']]
async function SosPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { alerts } = await call('get', '/sos')
    if (isAdmin) {
      const active = alerts.filter((a) => a.status !== 'Resolved').length
      view.innerHTML = `${pageHeader('tower-broadcast', 'Emergency Center', 'Live emergency alerts from students — respond and update status.',
        `<div class="flex items-center gap-3"><span class="pill ${active ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}">${active ? '<span class="w-1.5 h-1.5 rounded-full bg-red-500 live-dot"></span>' + active + ' active' : 'All clear'}</span><button id="refresh-sos" class="btn btn-ghost px-4 py-3"><i class="fa-solid fa-rotate"></i>Refresh</button></div>`)}
        <div class="grid gap-4 stagger">${!alerts.length ? emptyState('shield-heart', 'No emergency alerts', 'All clear across campus. ✅') : alerts.map(sosAdminCard).join('')}</div>`
      document.getElementById('refresh-sos').onclick = () => SosPage(view)
      document.querySelectorAll('.sos-status').forEach((b) => b.onclick = async () => {
        try { await call('patch', `/sos/${b.dataset.id}/status`, { status: b.dataset.s }); toast('Alert updated → ' + b.dataset.s); SosPage(view); refreshSosBadge() } catch (e) { toast(e.message, 'error') }
      })
    } else {
      view.innerHTML = `${pageHeader('tower-broadcast', 'Emergency SOS', 'In an emergency, send an instant alert to campus administration.')}
        <div class="card p-8 mb-6 fade-up" style="background:linear-gradient(135deg,#fef2f2,#fff1f2);border-color:#fecaca">
          <p class="text-center text-slate-600 mb-6 font-medium">Select the type of emergency — administration will be alerted <span class="text-red-600 font-bold">immediately</span>.</p>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
            ${SOS_TYPES.map(([t, i, g]) => `<button class="sos-type group card p-5 hover:border-red-300 text-center" data-t="${t}">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${g} text-white grid place-items-center text-xl mb-3 group-hover:scale-110 transition shadow-lg"><i class="fa-solid fa-${i}"></i></div>
              <p class="text-sm font-extrabold text-slate-700">${t}</p></button>`).join('')}
          </div>
        </div>
        <h4 class="font-extrabold text-slate-900 mb-4 flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left text-slate-400"></i>My Alert History</h4>
        <div class="grid gap-4 stagger">${!alerts.length ? emptyState('shield-heart', 'No alerts yet', 'You have not raised any emergency alerts.') : alerts.map(sosStudentCard).join('')}</div>`
      document.querySelectorAll('.sos-type').forEach((b) => b.onclick = () => openSosForm(b.dataset.t))
    }
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Could not load SOS', e.message) }
}
function sosStudentCard(a) {
  return `<div class="card p-5 flex items-center gap-4 ${a.status === 'Active' ? 'border-l-4 border-red-500' : ''}">
    <div class="w-12 h-12 rounded-2xl bg-red-50 text-red-500 grid place-items-center text-lg flex-shrink-0"><i class="fa-solid fa-tower-broadcast"></i></div>
    <div class="flex-1 min-w-0"><p class="font-extrabold text-slate-900">${esc(a.type)} Emergency</p><p class="text-xs text-slate-400 font-medium"><i class="fa-solid fa-location-dot mr-1"></i>${esc(a.location || '—')} · ${fmtDate(a.created_at)}</p>${a.message ? `<p class="text-sm text-slate-600 mt-1">${esc(a.message)}</p>` : ''}</div>
    ${statusPill(a.status)}</div>`
}
function sosAdminCard(a) {
  const steps = ['Active', 'Acknowledged', 'Responding', 'Resolved']
  return `<div class="card p-6 ${a.status === 'Active' ? 'border-l-4 border-red-500' : ''}" ${a.status === 'Active' ? 'style="background:linear-gradient(135deg,#fef2f2,#ffffff)"' : ''}>
    <div class="flex items-start gap-4">
      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${a.status === 'Active' ? 'from-red-500 to-rose-600 sos-pulse' : 'from-slate-400 to-slate-500'} text-white grid place-items-center text-xl flex-shrink-0"><i class="fa-solid fa-tower-broadcast"></i></div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2 flex-wrap">
          <div><h4 class="font-extrabold text-slate-900 text-lg">🚨 ${esc(a.type)} Emergency</h4>
            <p class="text-sm text-slate-500 mt-0.5 font-medium"><i class="fa-solid fa-user mr-1"></i>${esc(a.student_name)} ${a.student_id ? '(' + esc(a.student_id) + ')' : ''}${a.phone ? ' · <i class="fa-solid fa-phone mr-1"></i>' + esc(a.phone) : ''}</p></div>
          ${statusPill(a.status)}
        </div>
        <p class="text-sm text-slate-700 mt-3 font-medium"><i class="fa-solid fa-location-dot mr-1 text-red-400"></i><b>${esc(a.location || 'Unknown location')}</b> · <i class="fa-regular fa-clock mr-1"></i>${fmtDate(a.created_at)}</p>
        ${a.message ? `<p class="text-sm text-slate-600 mt-2 bg-slate-50 rounded-xl p-3">${esc(a.message)}</p>` : ''}
        <div class="flex gap-1.5 mt-4 flex-wrap">${steps.map((s) => `<button class="sos-status btn ${a.status === s ? 'btn-primary' : 'btn-ghost'} px-3.5 py-2 text-xs" data-id="${a.id}" data-s="${s}">${s}</button>`).join('')}</div>
      </div>
    </div></div>`
}
function openSosForm(type) {
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white grid place-items-center text-lg sos-pulse"><i class="fa-solid fa-tower-broadcast"></i></div><div class="flex-1"><h3 class="text-xl font-extrabold text-red-600">${esc(type)} Emergency</h3><p class="text-slate-400 text-sm">Administration will be alerted instantly.</p></div><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="sf" class="space-y-4">
      <div><label class="lbl">Your current location</label><input name="location" class="input" placeholder="e.g. Lab Block, Room 204" required></div>
      <div><label class="lbl">Message (optional)</label><textarea name="message" class="input" rows="2" placeholder="Describe the emergency briefly…"></textarea></div>
      <button class="btn btn-danger w-full py-3.5 text-base" id="sfsub"><i class="fa-solid fa-paper-plane"></i>Send Emergency Alert</button></form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#sf').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    const btn = m.querySelector('#sfsub'); btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i>'
    try { await call('post', '/sos', { type, ...fd }); toast('🚨 Emergency alert sent! Help is being notified.', 'warn'); m.remove(); SosPage(document.getElementById('view')) }
    catch (err) { toast(err.message, 'error'); btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i>Send Emergency Alert' }
  }
}

/* ================================================================ LMS: SUBJECTS & MATERIALS */
async function SubjectsPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { subjects } = await call('get', '/lms/subjects')
    view.innerHTML = `${pageHeader('book', 'Subjects', isAdmin ? 'Manage all enrolled subjects and course materials.' : 'View your enrolled subjects and course materials.')}
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
        ${!subjects.length ? emptyState('book-open-reader', 'No subjects found', 'You are not enrolled in any subjects yet.') : subjects.map(s => `
        <div class="card card-hover p-6 group flex flex-col justify-between" style="border-top: 4px solid #6366f1;">
          <div>
            <div class="flex justify-between items-start mb-2">
              <span class="pill bg-indigo-100 text-indigo-700 font-bold">${esc(s.code)}</span>
              ${isAdmin ? `<button class="text-slate-400 hover:text-indigo-600"><i class="fa-solid fa-pen-to-square"></i></button>` : ''}
            </div>
            <h4 class="font-extrabold text-slate-900 text-xl mb-1">${esc(s.name)}</h4>
            <p class="text-sm text-slate-500 mb-4 font-medium"><i class="fa-solid fa-chalkboard-user mr-1.5"></i>${esc(s.faculty_name || 'Faculty unassigned')}</p>
            ${s.description ? `<p class="text-sm text-slate-600 mb-4">${esc(s.description)}</p>` : ''}
          </div>
          <button class="btn btn-ghost w-full py-2.5 text-indigo-600 hover:bg-indigo-50" onclick="viewCourseMaterials(${s.id}, '${esc(s.name)}')">View Materials <i class="fa-solid fa-arrow-right ml-1 text-xs"></i></button>
        </div>`).join('')}
      </div>`
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Could not load subjects', e.message) }
}
window.viewCourseMaterials = async function(subjectId, subjectName) {
  const view = document.getElementById('view')
  const isAdmin = App.user.role === 'admin'
  try {
    const { materials } = await call('get', `/lms/materials/${subjectId}`)
    const icons = { 'PDF': 'file-pdf text-red-500 bg-red-50', 'Video': 'file-video text-violet-500 bg-violet-50', 'Document': 'file-word text-blue-500 bg-blue-50', 'Notes': 'file-lines text-emerald-500 bg-emerald-50', 'Link': 'link text-indigo-500 bg-indigo-50' }
    
    view.innerHTML = `${pageHeader('folder-open', subjectName, 'Course Materials', `<button onclick="go('subjects')" class="btn btn-ghost px-4 py-2"><i class="fa-solid fa-arrow-left mr-1.5"></i> Back to Subjects</button>`)}
      ${isAdmin ? `<div class="mb-6 fade-up"><button class="btn btn-primary px-4 py-2" onclick="openUploadMaterialModal(${subjectId}, '${esc(subjectName)}')"><i class="fa-solid fa-cloud-arrow-up mr-1.5"></i> Upload Material</button></div>` : ''}
      <div class="grid gap-3 stagger">
        ${!materials.length ? emptyState('folder-open', 'No materials uploaded yet', 'Materials added for this subject will appear here.') : materials.map(m => `
        <div class="card p-4 hover:border-indigo-300 flex items-center gap-4 transition group">
          <a href="${esc(m.content_url)}" target="_blank" class="w-12 h-12 rounded-xl grid place-items-center text-xl flex-shrink-0 ${icons[m.type] || 'text-slate-500 bg-slate-100'} hover:scale-105 transition">
            <i class="fa-solid fa-${(icons[m.type]||'').split(' ')[0]||'file'}"></i>
          </a>
          <a href="${esc(m.content_url)}" target="_blank" class="flex-1 min-w-0">
            <h4 class="font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">${esc(m.title)}</h4>
            <p class="text-xs text-slate-400 mt-0.5"><i class="fa-regular fa-clock mr-1"></i>${fmtDate(m.created_at)} · ${esc(m.creator_name || 'Faculty')}</p>
          </a>
          <span class="pill bg-slate-100 text-slate-600 flex-shrink-0">${esc(m.type)}</span>
          <a href="${esc(m.content_url)}" target="_blank" class="text-slate-400 hover:text-indigo-600 p-2 rounded-lg hover:bg-slate-100 transition" title="Open Resource"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
          ${isAdmin ? `<button onclick="deleteMaterial(${m.id}, ${subjectId}, '${esc(subjectName)}')" class="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition" title="Delete Material"><i class="fa-solid fa-trash-can"></i></button>` : ''}
        </div>`).join('')}
      </div>`
  } catch (e) { toast('Error loading materials: ' + e.message, 'error') }
}

window.deleteMaterial = async function(id, subjectId, subjectName) {
  if (!confirm('Are you sure you want to delete this course material?')) return
  try {
    await call('delete', `/lms/materials/${id}`)
    toast('Material deleted successfully')
    viewCourseMaterials(subjectId, subjectName)
  } catch (e) { toast(e.message, 'error') }
}

window.openUploadMaterialModal = function(subjectId, subjectName) {
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-cloud-arrow-up"></i></div><h3 class="text-xl font-extrabold flex-1">Upload Material</h3><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="umf" class="space-y-4">
      <div><label class="lbl">Title</label><input name="title" class="input" placeholder="e.g. Chapter 1 Notes" required></div>
      <div class="grid grid-cols-2 gap-4">
        <div><label class="lbl">Type</label><select name="type" class="input"><option>Notes</option><option>PDF</option><option>Video</option><option>Link</option><option>Document</option><option>Other</option></select></div>
        <div><label class="lbl">URL / Resource Link</label><input name="content_url" class="input" placeholder="https://..." required></div>
      </div>
      <button class="btn btn-primary w-full py-3.5">Upload Material</button>
    </form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#umf').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    try { await call('post', '/lms/materials', { subject_id: subjectId, ...fd }); toast('Material uploaded successfully'); m.remove(); viewCourseMaterials(subjectId, subjectName) }
    catch (err) { toast(err.message, 'error') }
  }
}

/* ================================================================ LMS: ATTENDANCE */
async function AttendancePage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { attendance } = await call('get', '/lms/attendance')
    if (isAdmin) {
      view.innerHTML = `${pageHeader('clipboard-user', 'Manage Attendance', 'View recorded student attendance across all subjects.')}
        <div class="card p-6 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead><tr class="text-slate-400 border-b border-slate-100"><th class="pb-2 font-semibold">Date</th><th class="pb-2 font-semibold">Student</th><th class="pb-2 font-semibold">Subject</th><th class="pb-2 font-semibold">Status</th></tr></thead>
            <tbody>
              ${!attendance.length ? `<tr><td colspan="4" class="py-6 text-center text-slate-500">No attendance records found</td></tr>` : attendance.map(a => `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td class="py-3 font-medium text-slate-700">${fmtDate(a.date)}</td>
                  <td class="py-3 font-bold text-slate-800">${esc(a.student_name)}</td>
                  <td class="py-3 text-slate-600">${esc(a.subject_name)}</td>
                  <td class="py-3"><span class="pill ${a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${esc(a.status)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`
    } else {
      const total = attendance.length
      const present = attendance.filter(a => a.status === 'Present').length
      const perc = total > 0 ? Math.round((present / total) * 100) : 0
      const color = perc < 75 ? 'text-red-500' : 'text-emerald-500'
      const ring = perc < 75 ? 'border-red-500' : 'border-emerald-500'
      
      view.innerHTML = `${pageHeader('clipboard-user', 'My Attendance', 'Track your overall and subject-wise attendance.')}
        <div class="grid md:grid-cols-3 gap-6 mb-8 fade-up">
          <div class="card p-6 flex items-center justify-between col-span-full md:col-span-1">
            <div><p class="text-slate-500 font-bold text-sm mb-1">Overall Attendance</p><h2 class="text-4xl font-extrabold ${color}">${perc}%</h2>
            ${perc < 75 ? '<p class="text-red-500 text-xs mt-2 font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Attendance Warning: Below 75%</p>' : '<p class="text-emerald-600 text-xs mt-2 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>Good Standing: &ge;75%</p>'}</div>
            <div class="w-20 h-20 rounded-full border-4 ${ring} flex items-center justify-center font-bold text-xl">${present}/${total}</div>
          </div>
          <div class="card p-6 col-span-full md:col-span-2 overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead><tr class="text-slate-400 border-b border-slate-100"><th class="pb-2 font-semibold">Date</th><th class="pb-2 font-semibold">Subject</th><th class="pb-2 font-semibold">Status</th></tr></thead>
              <tbody>
                ${!attendance.length ? `<tr><td colspan="3" class="py-4 text-center text-slate-400">No attendance history</td></tr>` : attendance.map(a => `
                  <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td class="py-3 font-medium text-slate-700">${fmtDate(a.date)}</td>
                    <td class="py-3 font-medium text-slate-700">${esc(a.subject_name)}</td>
                    <td class="py-3"><span class="pill ${a.status === 'Present' ? 'bg-emerald-100 text-emerald-700' : a.status === 'Absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">${esc(a.status)}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`
    }
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Error loading attendance', e.message) }
}

/* ================================================================ LMS: MARKS */
async function MarksPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { marks } = await call('get', '/lms/marks')
    if (isAdmin) {
      view.innerHTML = `${pageHeader('chart-simple', 'Manage Marks & Grades', 'Record student exam results and grade performance.', `
        <div class="flex flex-wrap gap-2">
          <button onclick="openCreateExamModal()" class="btn btn-ghost px-4 py-2 border border-slate-200"><i class="fa-solid fa-plus mr-1.5 text-xs"></i> Create Exam</button>
          <button onclick="openEnterMarksModal()" class="btn btn-primary px-4 py-2"><i class="fa-solid fa-pen-to-square mr-1.5 text-xs"></i> Enter Marks</button>
        </div>`)}
        <div class="card p-6 overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="text-slate-400 border-b border-slate-100">
                <th class="pb-3 font-semibold">Student</th>
                <th class="pb-3 font-semibold">Subject</th>
                <th class="pb-3 font-semibold">Exam</th>
                <th class="pb-3 font-semibold">Marks</th>
                <th class="pb-3 font-semibold">Percentage</th>
                <th class="pb-3 font-semibold">Grade</th>
                <th class="pb-3 font-semibold">Feedback / Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${!marks.length ? `<tr><td colspan="7" class="py-6 text-center text-slate-500">No marks entered yet. Click "Enter Marks" to add records.</td></tr>` : marks.map(m => {
                const pct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0
                return `
                <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td class="py-3 font-bold text-slate-800">${esc(m.student_name)}</td>
                  <td class="py-3 text-slate-600">${esc(m.subject_name)}</td>
                  <td class="py-3 font-medium text-slate-700">${esc(m.exam_title)}</td>
                  <td class="py-3 font-bold text-indigo-600">${m.marks_obtained} / ${m.max_marks}</td>
                  <td class="py-3 font-medium text-slate-600">${pct}%</td>
                  <td class="py-3"><span class="pill bg-indigo-100 text-indigo-700 font-bold">${esc(m.grade || '—')}</span></td>
                  <td class="py-3 text-xs text-slate-500 italic">${esc(m.feedback || '—')}</td>
                </tr>`}).join('')}
            </tbody>
          </table>
        </div>`
    } else {
      if (!marks.length) {
        view.innerHTML = `${pageHeader('chart-simple', 'Marks & Results', 'Your academic performance, CGPA, and grades.')}
          ${emptyState('chart-simple', 'No marks available', 'Your exam marks and grades will appear here once published by faculty.')}`
        return
      }
      
      // Calculate overall statistics
      const totalObtained = marks.reduce((sum, m) => sum + Number(m.marks_obtained || 0), 0)
      const totalMax = marks.reduce((sum, m) => sum + Number(m.max_marks || 100), 0)
      const pct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0'
      const cgpa = (Number(pct) / 9.5).toFixed(2) // Standard 10-point scale conversion
      const standing = Number(pct) >= 75 ? { label: 'Distinction', color: 'emerald' } : Number(pct) >= 60 ? { label: 'First Class', color: 'indigo' } : Number(pct) >= 40 ? { label: 'Pass', color: 'amber' } : { label: 'Needs Improvement', color: 'red' }
      
      view.innerHTML = `${pageHeader('chart-simple', 'Marks & Results', 'Your academic performance, CGPA, and grades.')}
        <!-- Academic Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8 stagger">
          <div class="card p-5 border-l-4 border-indigo-500 flex flex-col justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Percentage</span>
            <div class="my-2">
              <span class="text-4xl font-extrabold text-slate-900">${pct}%</span>
              <span class="pill bg-${standing.color}-100 text-${standing.color}-700 ml-2 font-bold">${standing.label}</span>
            </div>
            <p class="text-xs text-slate-500 font-medium">${totalObtained} out of ${totalMax} total marks</p>
          </div>
          <div class="card p-5 border-l-4 border-emerald-500 flex flex-col justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumulative GPA (CGPA)</span>
            <div class="my-2">
              <span class="text-4xl font-extrabold text-slate-900">${cgpa}</span>
              <span class="text-sm font-semibold text-slate-400">/ 10.0</span>
            </div>
            <p class="text-xs text-emerald-600 font-bold"><i class="fa-solid fa-award mr-1"></i>Official 10-point scale conversion</p>
          </div>
          <div class="card p-5 border-l-4 border-sky-500 flex flex-col justify-between">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Evaluated Exams</span>
            <div class="my-2">
              <span class="text-4xl font-extrabold text-slate-900">${marks.length}</span>
              <span class="text-sm font-semibold text-slate-400">Exams</span>
            </div>
            <p class="text-xs text-slate-500 font-medium">All published results up to date</p>
          </div>
        </div>

        <!-- Subject & Exam Cards Grid -->
        <h4 class="font-extrabold text-slate-900 text-lg mb-4">Exam-wise Breakdown</h4>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          ${marks.map(m => {
            const examPct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0
            return `
            <div class="card p-6 flex flex-col justify-between hover:border-indigo-200 transition">
              <div>
                <div class="flex justify-between items-start mb-2">
                  <span class="pill bg-indigo-100 text-indigo-700 font-bold">${esc(m.code || 'SUB')}</span>
                  <span class="text-xs font-semibold text-slate-400">${examPct}%</span>
                </div>
                <h4 class="font-extrabold text-slate-900 text-lg mb-0.5">${esc(m.subject_name)}</h4>
                <p class="text-xs font-bold text-slate-500 mb-4">${esc(m.exam_title)}</p>
                
                <div class="w-20 h-20 mx-auto rounded-full bg-indigo-50 border-[5px] border-indigo-500 flex flex-col items-center justify-center my-3 shadow-inner">
                  <span class="text-2xl font-extrabold text-indigo-700 leading-none">${esc(m.grade || 'A')}</span>
                </div>
                
                <p class="text-center font-bold text-slate-800 text-base mb-1">${m.marks_obtained} <span class="text-slate-400 text-sm">/ ${m.max_marks}</span></p>
                <!-- Percentage progress bar -->
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
                  <div class="bg-indigo-600 h-full rounded-full transition-all" style="width: ${Math.min(100, examPct)}%"></div>
                </div>
              </div>
              ${m.feedback ? `
                <div class="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
                  <span class="font-bold text-slate-700 flex items-center gap-1 mb-0.5"><i class="fa-solid fa-comment-dots text-indigo-500"></i> Faculty Remarks:</span>
                  <p class="italic">"${esc(m.feedback)}"</p>
                </div>` : ''}
            </div>`
          }).join('')}
        </div>`
    }
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Error loading marks', e.message) }
}

window.openCreateExamModal = async function() {
  try {
    const { subjects } = await call('get', '/lms/subjects')
    if (!subjects.length) return toast('Please create at least one subject first', 'error')
    
    const m = openModal(`<div class="p-7">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-file-pen"></i></div>
        <h3 class="text-xl font-extrabold flex-1">Create New Exam</h3>
        <button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="cef" class="space-y-4">
        <div>
          <label class="lbl">Subject</label>
          <select name="subject_id" class="input" required>
            ${subjects.map(s => `<option value="${s.id}">${esc(s.code)} - ${esc(s.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="lbl">Exam Title</label>
          <input name="title" class="input" placeholder="e.g. Midterm 1, Final Exam, Quiz 2" required>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="lbl">Exam Date</label>
            <input type="date" name="exam_date" class="input" required>
          </div>
          <div>
            <label class="lbl">Max Marks</label>
            <input type="number" name="max_marks" class="input" value="100" min="1" max="500" required>
          </div>
        </div>
        <button class="btn btn-primary w-full py-3.5">Create Exam</button>
      </form>
    </div>`)
    m.querySelector('.close').onclick = () => m.remove()
    m.querySelector('#cef').onsubmit = async (e) => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
      try {
        await call('post', '/lms/exams', { ...fd, max_marks: Number(fd.max_marks) })
        toast('Exam created successfully!')
        m.remove()
        MarksPage(document.getElementById('view'))
      } catch (err) { toast(err.message, 'error') }
    }
  } catch (err) { toast('Error loading subjects: ' + err.message, 'error') }
}

window.openEnterMarksModal = async function() {
  try {
    const [{ exams }, { students }] = await Promise.all([
      call('get', '/lms/exams'),
      call('get', '/lms/students')
    ])
    if (!exams.length) return toast('No exams available. Please create an exam first.', 'error')
    if (!students.length) return toast('No enrolled students found.', 'error')
    
    const m = openModal(`<div class="p-7">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-pen-to-square"></i></div>
        <h3 class="text-xl font-extrabold flex-1">Enter Student Marks</h3>
        <button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="emf" class="space-y-4">
        <div>
          <label class="lbl">Select Exam</label>
          <select name="exam_id" id="em-exam" class="input" required>
            ${exams.map(e => `<option value="${e.id}" data-max="${e.max_marks}">${esc(e.title)} (${esc(e.code || e.subject_name)}) — Max: ${e.max_marks}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="lbl">Select Student</label>
          <select name="student_id" class="input" required>
            ${students.map(s => `<option value="${s.id}">${esc(s.name)} (${esc(s.email)})</option>`).join('')}
          </select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="lbl">Marks Obtained</label>
            <input type="number" step="0.5" name="marks_obtained" id="em-marks" class="input" placeholder="e.g. 85" required>
          </div>
          <div>
            <label class="lbl">Grade</label>
            <select name="grade" id="em-grade" class="input">
              <option value="A+">A+ (Distinction)</option>
              <option value="A">A (Excellent)</option>
              <option value="B+">B+ (Very Good)</option>
              <option value="B">B (Good)</option>
              <option value="C">C (Average)</option>
              <option value="D">D (Pass)</option>
              <option value="F">F (Fail)</option>
            </select>
          </div>
        </div>
        <div>
          <label class="lbl">Feedback / Remarks (Optional)</label>
          <input name="feedback" class="input" placeholder="e.g. Excellent conceptual clarity">
        </div>
        <button class="btn btn-primary w-full py-3.5">Save Marks</button>
      </form>
    </div>`)
    m.querySelector('.close').onclick = () => m.remove()
    m.querySelector('#emf').onsubmit = async (e) => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
      try {
        await call('post', '/lms/marks', {
          exam_id: Number(fd.exam_id),
          student_id: Number(fd.student_id),
          marks_obtained: Number(fd.marks_obtained),
          grade: fd.grade,
          feedback: fd.feedback || ''
        })
        toast('Marks recorded successfully!')
        m.remove()
        MarksPage(document.getElementById('view'))
      } catch (err) { toast(err.message, 'error') }
    }
  } catch (err) { toast('Error loading form data: ' + err.message, 'error') }
}

/* ================================================================ LMS: ASSIGNMENTS */
window.openSubmitAssignmentModal = function(assignmentId) {
  const m = openModal(`<div class="p-7"><div class="flex items-center gap-3 mb-6"><div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-upload"></i></div><h3 class="text-xl font-extrabold flex-1">Submit Assignment</h3><button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
    <form id="saf" class="space-y-4">
      <div><label class="lbl">Submission URL / Link (GitHub, Drive, Docs)</label><input name="content_url" class="input" placeholder="https://..." required></div>
      <button class="btn btn-primary w-full py-3.5">Submit Work</button>
    </form></div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#saf').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    try { await call('post', `/lms/assignments/${assignmentId}/submit`, fd); toast('Assignment submitted successfully'); m.remove(); AssignmentsPage(document.getElementById('view')) }
    catch (err) { toast(err.message, 'error') }
  }
}

async function AssignmentsPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { assignments } = await call('get', '/lms/assignments')
    if (isAdmin) {
      view.innerHTML = `${pageHeader('file-pen', 'Manage Assignments', 'Create course assignments and evaluate student submissions.', `
        <button onclick="openCreateAssignmentModal()" class="btn btn-primary px-4 py-2"><i class="fa-solid fa-plus mr-1.5 text-xs"></i> Create Assignment</button>`)}
        <div class="grid gap-4 stagger">
          ${!assignments.length ? emptyState('file-pen', 'No assignments created yet', 'Click "Create Assignment" to post coursework.') : assignments.map(a => `
          <div class="card p-6 hover:border-indigo-200 transition">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex-1 min-w-[260px]">
                <div class="flex items-center gap-2 mb-1.5">
                  <span class="pill bg-indigo-100 text-indigo-700 font-bold">${esc(a.subject_name)}</span>
                  <span class="pill bg-slate-100 text-slate-600 font-medium"><i class="fa-solid fa-users mr-1"></i>${a.submission_count || 0} Submissions</span>
                </div>
                <h4 class="font-extrabold text-slate-900 text-lg mb-1">${esc(a.title)}</h4>
                <p class="text-sm text-slate-600 mb-3">${esc(a.description || 'No description provided')}</p>
                <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                  <span><i class="fa-regular fa-clock mr-1 text-slate-400"></i>Due: ${fmtDate(a.deadline)}</span>
                  ${a.resource_url ? `<a href="${esc(a.resource_url)}" target="_blank" class="text-indigo-600 hover:underline font-bold"><i class="fa-solid fa-link mr-1"></i>Resource Link</a>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="viewAssignmentSubmissions(${a.id}, '${esc(a.title)}')" class="btn btn-primary px-4 py-2 text-xs">
                  <i class="fa-solid fa-list-check mr-1.5"></i> Review Submissions (${a.submission_count || 0})
                </button>
              </div>
            </div>
          </div>`).join('')}
        </div>`
    } else {
      view.innerHTML = `${pageHeader('file-pen', 'Assignments', 'Track deadlines, view feedback, and submit coursework.')}
        <div class="grid gap-4 stagger">
          ${!assignments.length ? emptyState('file-pen', 'No assignments pending', 'You are all caught up on assignments!') : assignments.map(a => `
          <div class="card p-6 ${a.submission_status === 'Graded' ? 'border-emerald-200 bg-emerald-50/20' : a.submission_status === 'Submitted' ? 'bg-slate-50 border-slate-200' : 'hover:border-indigo-300'} transition">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex-1 min-w-[260px]">
                <span class="pill bg-indigo-100 text-indigo-700 font-bold mb-2">${esc(a.subject_name)}</span>
                <h4 class="font-extrabold text-slate-900 text-lg mt-1 mb-1">${esc(a.title)}</h4>
                <p class="text-sm text-slate-600 mb-3">${esc(a.description)}</p>
                <div class="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                  <span><i class="fa-regular fa-clock mr-1 text-slate-400"></i>Due: ${fmtDate(a.deadline)}</span>
                  ${a.resource_url ? `<a href="${esc(a.resource_url)}" target="_blank" class="text-indigo-600 hover:underline font-bold"><i class="fa-solid fa-link mr-1"></i>Attachment / Instructions</a>` : ''}
                </div>
                
                ${a.student_content_url ? `
                  <p class="text-xs text-slate-500 font-medium mt-2">
                    <i class="fa-solid fa-arrow-up-right-from-square mr-1 text-slate-400"></i>Your submission: 
                    <a href="${esc(a.student_content_url)}" target="_blank" class="text-indigo-600 underline font-semibold truncate max-w-xs inline-block align-bottom">${esc(a.student_content_url)}</a>
                  </p>` : ''}
                
                ${a.submission_status === 'Graded' && a.feedback ? `
                  <div class="mt-4 p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                    <span class="font-bold flex items-center gap-1.5 mb-1 text-emerald-800"><i class="fa-solid fa-comment-dots text-emerald-600"></i> Faculty Feedback:</span>
                    <p class="text-slate-700 leading-relaxed">${esc(a.feedback)}</p>
                  </div>` : ''}
              </div>
              
              <div class="text-right">
                ${a.submission_status === 'Graded' ? `
                  <span class="pill bg-emerald-100 text-emerald-700 font-bold mb-2 block"><i class="fa-solid fa-circle-check mr-1"></i>Graded: ${a.marks_obtained !== null ? a.marks_obtained + ' Marks' : 'Evaluated'}</span>
                  <button class="btn btn-ghost px-3 py-1.5 text-xs text-slate-500 hover:text-indigo-600" onclick="openSubmitAssignmentModal(${a.id})"><i class="fa-solid fa-rotate mr-1"></i> Resubmit</button>` 
                : a.submission_status === 'Submitted' ? `
                  <span class="pill bg-blue-100 text-blue-700 font-bold mb-2 block"><i class="fa-solid fa-paper-plane mr-1"></i>Submitted</span>
                  <button class="btn btn-ghost px-3 py-1.5 text-xs text-slate-500 hover:text-indigo-600" onclick="openSubmitAssignmentModal(${a.id})"><i class="fa-solid fa-rotate mr-1"></i> Update Work</button>`
                : `
                  <span class="pill bg-amber-100 text-amber-700 font-bold mb-2 block"><i class="fa-solid fa-hourglass-half mr-1"></i>Pending</span>
                  <button class="btn btn-primary px-4 py-2 mt-1 text-sm shadow-md" onclick="openSubmitAssignmentModal(${a.id})"><i class="fa-solid fa-upload mr-1.5"></i> Submit Work</button>`}
              </div>
            </div>
          </div>`).join('')}
        </div>`
    }
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Error loading assignments', e.message) }
}

window.openCreateAssignmentModal = async function() {
  try {
    const { subjects } = await call('get', '/lms/subjects')
    if (!subjects.length) return toast('Please create at least one subject first', 'error')
    
    const m = openModal(`<div class="p-7">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-file-circle-plus"></i></div>
        <h3 class="text-xl font-extrabold flex-1">Create Assignment</h3>
        <button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <form id="caf" class="space-y-4">
        <div>
          <label class="lbl">Subject</label>
          <select name="subject_id" class="input" required>
            ${subjects.map(s => `<option value="${s.id}">${esc(s.code)} - ${esc(s.name)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="lbl">Assignment Title</label>
          <input name="title" class="input" placeholder="e.g. Problem Set 2 — Binary Search" required>
        </div>
        <div>
          <label class="lbl">Instructions / Description</label>
          <textarea name="description" class="input" rows="3" placeholder="Provide assignment details and guidelines..." required></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="lbl">Resource / Document URL</label>
            <input name="resource_url" class="input" placeholder="https://drive.google.com/...">
          </div>
          <div>
            <label class="lbl">Deadline</label>
            <input type="datetime-local" name="deadline" class="input" required>
          </div>
        </div>
        <button class="btn btn-primary w-full py-3.5">Post Assignment</button>
      </form>
    </div>`)
    m.querySelector('.close').onclick = () => m.remove()
    m.querySelector('#caf').onsubmit = async (e) => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
      try {
        await call('post', '/lms/assignments', fd)
        toast('Assignment created successfully!')
        m.remove()
        AssignmentsPage(document.getElementById('view'))
      } catch (err) { toast(err.message, 'error') }
    }
  } catch (err) { toast('Error: ' + err.message, 'error') }
}

window.viewAssignmentSubmissions = async function(assignmentId, title) {
  try {
    const { submissions } = await call('get', `/lms/assignments/${assignmentId}/submissions`)
    const m = openModal(`<div class="p-7 max-w-2xl w-full">
      <div class="flex items-center gap-3 mb-6">
        <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-folder-tree"></i></div>
        <div class="flex-1">
          <h3 class="text-xl font-extrabold text-slate-900">${esc(title)}</h3>
          <p class="text-xs text-slate-500">Student Submissions & Evaluation</p>
        </div>
        <button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="text-slate-400 border-b border-slate-100">
              <th class="pb-2 font-semibold">Student</th>
              <th class="pb-2 font-semibold">Work Link</th>
              <th class="pb-2 font-semibold">Submitted At</th>
              <th class="pb-2 font-semibold">Status / Score</th>
              <th class="pb-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            ${!submissions.length ? `<tr><td colspan="5" class="py-6 text-center text-slate-500">No submissions received yet for this assignment.</td></tr>` : submissions.map(s => `
              <tr class="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                <td class="py-3">
                  <p class="font-bold text-slate-800">${esc(s.student_name)}</p>
                  <p class="text-xs text-slate-400">${esc(s.student_email)}</p>
                </td>
                <td class="py-3">
                  <a href="${esc(s.content_url)}" target="_blank" class="text-indigo-600 hover:underline font-bold inline-flex items-center gap-1">
                    <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Open
                  </a>
                </td>
                <td class="py-3 text-xs text-slate-500">${fmtDate(s.submitted_at)}</td>
                <td class="py-3">
                  ${s.status === 'Graded' ? `<span class="pill bg-emerald-100 text-emerald-700 font-bold">${s.marks_obtained !== null ? s.marks_obtained + ' pts' : 'Graded'}</span>` : `<span class="pill bg-blue-100 text-blue-700">Submitted</span>`}
                </td>
                <td class="py-3 text-right">
                  <button onclick="openGradeSubmissionModal(${s.id}, ${assignmentId}, '${esc(title)}', ${s.marks_obtained || 0}, '${esc(s.feedback || '')}')" class="btn btn-ghost px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-50 border border-indigo-200">
                    <i class="fa-solid fa-pen-nib mr-1"></i> Grade
                  </button>
                </td>
              </tr>
              ${s.feedback ? `<tr><td colspan="5" class="pb-3 pt-0 text-xs text-slate-500 italic pl-2">Feedback: "${esc(s.feedback)}"</td></tr>` : ''}`).join('')}
          </tbody>
        </table>
      </div>
    </div>`)
    m.querySelector('.close').onclick = () => m.remove()
  } catch (err) { toast('Error loading submissions: ' + err.message, 'error') }
}

window.openGradeSubmissionModal = function(subId, assignmentId, title, currentMarks = 0, currentFeedback = '') {
  const m = openModal(`<div class="p-7">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 grid place-items-center text-lg"><i class="fa-solid fa-marker"></i></div>
      <h3 class="text-xl font-extrabold flex-1">Grade Submission</h3>
      <button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="gsmf" class="space-y-4">
      <div>
        <label class="lbl">Marks Obtained (Points)</label>
        <input type="number" step="0.5" name="marks_obtained" class="input" value="${currentMarks}" required>
      </div>
      <div>
        <label class="lbl">Faculty Feedback / Comments</label>
        <textarea name="feedback" class="input" rows="3" placeholder="Provide constructive comments for the student...">${esc(currentFeedback)}</textarea>
      </div>
      <button class="btn btn-primary w-full py-3.5">Save Grade & Feedback</button>
    </form>
  </div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#gsmf').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    try {
      await call('post', `/lms/submissions/${subId}/grade`, {
        marks_obtained: Number(fd.marks_obtained),
        feedback: fd.feedback || ''
      })
      toast('Submission graded!')
      m.remove()
      // Refresh the submissions modal
      viewAssignmentSubmissions(assignmentId, title)
    } catch (err) { toast(err.message, 'error') }
  }
}

/* ================================================================ LMS: CALENDAR */
async function CalendarPage(view) {
  const isAdmin = App.user.role === 'admin'
  try {
    const { calendar } = await call('get', '/lms/calendar')
    const icons = { 'exam': 'file-pen text-rose-500 bg-rose-100', 'assignment': 'list-check text-amber-500 bg-amber-100', 'event': 'calendar-day text-sky-500 bg-sky-100' }
    
    view.innerHTML = `${pageHeader('calendar-days', 'Academic Calendar', 'Upcoming deadlines, exams, holidays, and campus events.', `
      ${isAdmin ? `<button onclick="openAddEventModal()" class="btn btn-primary px-4 py-2"><i class="fa-solid fa-plus mr-1.5 text-xs"></i> Add Event</button>` : ''}`)}
      
      <div class="relative border-l-2 border-indigo-100 ml-6 pl-8 py-4 space-y-8 stagger">
        ${!calendar.length ? emptyState('calendar', 'Nothing on the calendar yet', 'Scheduled events, exams, and assignment deadlines will appear here.') : calendar.map(c => `
        <div class="relative">
          <div class="absolute -left-[45px] top-0 w-10 h-10 rounded-full ${(icons[c.type]||'').split(' ')[2]||'bg-slate-100'} grid place-items-center shadow ring-4 ring-slate-50">
            <i class="fa-solid fa-${(icons[c.type]||'').split(' ')[0]||'calendar'} ${(icons[c.type]||'').split(' ')[1]||'text-slate-500'}"></i>
          </div>
          <div class="card p-5 hover:border-indigo-200 transition">
            <div class="flex items-center justify-between gap-2 mb-1">
              <span class="text-xs font-bold text-indigo-600 tracking-wider uppercase">${new Date(c.date).toDateString()}</span>
              <span class="pill ${c.type === 'exam' ? 'bg-rose-100 text-rose-700' : c.type === 'assignment' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'} capitalize font-bold text-[10px]">${esc(c.type)}</span>
            </div>
            <h4 class="font-extrabold text-slate-900 text-lg">${esc(c.title)}</h4>
            ${c.description ? `<p class="text-sm text-slate-600 mt-1">${esc(c.description)}</p>` : ''}
          </div>
        </div>`).join('')}
      </div>`
  } catch (e) { view.innerHTML = emptyState('triangle-exclamation', 'Error loading calendar', e.message) }
}

window.openAddEventModal = function() {
  const m = openModal(`<div class="p-7">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 grid place-items-center text-lg"><i class="fa-solid fa-calendar-plus"></i></div>
      <h3 class="text-xl font-extrabold flex-1">Add Calendar Event</h3>
      <button class="close text-slate-400 text-xl w-9 h-9 grid place-items-center rounded-xl hover:bg-slate-100"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <form id="aef" class="space-y-4">
      <div>
        <label class="lbl">Event Title</label>
        <input name="title" class="input" placeholder="e.g. Annual Tech Symposium, Midterm Break" required>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="lbl">Event Date</label>
          <input type="date" name="event_date" class="input" required>
        </div>
        <div>
          <label class="lbl">Venue / Location</label>
          <input name="venue" class="input" placeholder="e.g. Main Auditorium" required>
        </div>
      </div>
      <div>
        <label class="lbl">Description / Details</label>
        <textarea name="description" class="input" rows="3" placeholder="Additional details about the event..."></textarea>
      </div>
      <button class="btn btn-primary w-full py-3.5">Publish Event</button>
    </form>
  </div>`)
  m.querySelector('.close').onclick = () => m.remove()
  m.querySelector('#aef').onsubmit = async (e) => {
    e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target).entries())
    try {
      await call('post', '/lms/calendar/events', fd)
      toast('Calendar event added successfully!')
      m.remove()
      CalendarPage(document.getElementById('view'))
    } catch (err) { toast(err.message, 'error') }
  }
}


/* ================================================================ AI VOICE ASSISTANT */
function injectAIAssistant() {
  if (document.getElementById('ai-widget')) return
  let voiceEnabled = true
  let isSpeaking = false
  let cachedVoice = null
  let speechQueue = []
  let speechTimeout = null

  const html = `
  <div id="ai-widget" class="fixed bottom-6 right-6 z-50">
    <!-- Chat Panel -->
    <div id="ai-panel" class="hidden absolute bottom-20 right-0 w-[400px] max-w-[94vw] h-[540px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all origin-bottom-right pop-in">
      <div class="hero-gradient text-white p-4 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-white/20 grid place-items-center text-xl shadow-inner"><i class="fa-solid fa-robot"></i></div>
          <div>
            <div class="flex items-center gap-2">
              <p class="font-extrabold leading-tight text-base">Campus AI</p>
              <div id="ai-speaking-wave" class="hidden flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 text-[11px] font-bold cursor-pointer" title="Click to stop speaking">
                <span class="w-1 h-2.5 bg-emerald-300 rounded-full animate-pulse"></span>
                <span class="w-1 h-4 bg-emerald-300 rounded-full animate-pulse [animation-delay:150ms]"></span>
                <span class="w-1 h-2 bg-emerald-300 rounded-full animate-pulse [animation-delay:300ms]"></span>
                <span class="ml-0.5 text-xs">Speaking</span>
              </div>
            </div>
            <p id="ai-voice-status" class="text-white/80 text-xs flex items-center gap-1.5 mt-0.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Fast Voice Enabled</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <button id="ai-voice-toggle" class="w-8 h-8 rounded-full hover:bg-white/20 grid place-items-center text-white/90 hover:text-white transition" title="Toggle Voice Audio">
            <i class="fa-solid fa-volume-high text-sm"></i>
          </button>
          <button id="ai-close" class="w-8 h-8 rounded-full hover:bg-white/20 grid place-items-center text-white/90 hover:text-white transition" title="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>

      <!-- Quick Suggestion Chips -->
      <div class="bg-slate-100/95 px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-slate-600 border-b border-slate-200 scrollbar-none">
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="What is my attendance?">📊 Attendance</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Can I bunk class today?">❓ Bunk Calculator</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="How many assignments are pending?">📝 Assignments</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Show my marks and CGPA">📈 CGPA & Marks</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Explain database normalization">💡 Normalization</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="What is on my schedule today?">📅 Schedule</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Where is the Central Library?">🗺️ Library Map</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="My Wi-Fi is not connecting">🛠️ Wi-Fi Issue</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="What are the latest notices?">📢 Notices</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Emergency contacts and SOS">🚨 SOS Alert</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Give me study tips for exam preparation">💡 Study Tips</button>
        <button class="ai-chip whitespace-nowrap bg-white hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-full border border-slate-200 shadow-2xs transition" data-q="Tell me a joke">😄 Joke</button>
      </div>

      <!-- Messages Area -->
      <div id="ai-messages" class="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-sm">
        <div class="flex items-start gap-2.5 max-w-[88%]">
          <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center flex-shrink-0 shadow-sm"><i class="fa-solid fa-robot text-xs"></i></div>
          <div class="bg-white border border-slate-200 p-3.5 rounded-2xl rounded-tl-sm shadow-sm text-slate-700 leading-relaxed text-xs">
            Hi! I am your <b>Smart Campus AI Voice Assistant</b>. Speak using the microphone or ask about your <b>attendance</b>, <b>bunk limits</b>, <b>assignments</b>, <b>marks & CGPA</b>, or <b>academic explanations</b>!
          </div>
        </div>
      </div>

      <!-- Input Bar -->
      <div class="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
        <button id="ai-voice-btn" class="w-10 h-10 rounded-full bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 grid place-items-center transition flex-shrink-0 text-slate-600 relative" title="Click to speak (fast speech recognition)">
          <i class="fa-solid fa-microphone"></i>
          <span id="ai-mic-pulse" class="hidden absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></span>
        </button>
        <input type="text" id="ai-input" class="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition" placeholder="Ask a question or tap mic to speak...">
        <button id="ai-send" class="w-10 h-10 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 grid place-items-center transition flex-shrink-0 shadow-md" title="Send message">
          <i class="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </div>
    </div>
    
    <!-- Floating Action Button (FAB) -->
    <button id="ai-toggle" class="w-16 h-16 rounded-full hero-gradient text-white shadow-2xl hover:scale-110 transition-transform grid place-items-center text-2xl relative" title="Campus AI Voice Assistant">
      <i class="fa-solid fa-robot"></i>
      <div class="absolute inset-0 rounded-full border-2 border-white/40 animate-ping pointer-events-none"></div>
    </button>
  </div>`
  document.body.insertAdjacentHTML('beforeend', html)
  
  const panel = document.getElementById('ai-panel')
  const input = document.getElementById('ai-input')
  const messages = document.getElementById('ai-messages')
  const voiceBtn = document.getElementById('ai-voice-btn')
  const micPulse = document.getElementById('ai-mic-pulse')
  const voiceToggleBtn = document.getElementById('ai-voice-toggle')
  const voiceStatus = document.getElementById('ai-voice-status')
  const speakingWave = document.getElementById('ai-speaking-wave')

  // Natural TTS Voice Selector with Instant Caching
  const loadNaturalVoice = () => {
    if (!window.speechSynthesis) return null
    const voices = window.speechSynthesis.getVoices()
    if (!voices.length) return null
    // Prefer modern natural English voices (Google US English, Samantha, Jenny, Natural)
    const preferred = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online')) && v.lang.startsWith('en'))
      || voices.find(v => (v.name.includes('Samantha') || v.name.includes('Zira') || v.name.includes('Jenny') || v.name.includes('David') || v.name.includes('Ava')) && v.lang.startsWith('en'))
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'))
    cachedVoice = preferred || voices[0]
    return cachedVoice
  }

  // Pre-load voices immediately
  if (window.speechSynthesis) {
    loadNaturalVoice()
    window.speechSynthesis.onvoiceschanged = () => loadNaturalVoice()
  }

  // Stop any ongoing speech immediately
  const stopSpeaking = () => {
    if (speechTimeout) { clearTimeout(speechTimeout); speechTimeout = null }
    speechQueue = []
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      if (window.speechSynthesis.paused) window.speechSynthesis.resume()
    }
    isSpeaking = false
    if (speakingWave) speakingWave.classList.add('hidden')
    voiceToggleBtn.innerHTML = voiceEnabled ? '<i class="fa-solid fa-volume-high text-sm"></i>' : '<i class="fa-solid fa-volume-xmark text-sm text-white/50"></i>'
  }

  // Clean and phoneticize text for natural, prompt speech
  const sanitizeForSpeech = (text) => {
    return text
      .replace(/[•\*\#\_`~>]/g, '')
      .replace(/https?:\/\/\S+/g, 'link')
      .replace(/\b1NF\b/gi, 'First Normal Form')
      .replace(/\b2NF\b/gi, 'Second Normal Form')
      .replace(/\b3NF\b/gi, 'Third Normal Form')
      .replace(/\bBCNF\b/gi, 'Boyce Codd Normal Form')
      .replace(/\bACID\b/g, 'A C I D')
      .replace(/\bCGPA\b/gi, 'C G P A')
      .replace(/\bGPA\b/gi, 'G P A')
      .replace(/\bDBMS\b/gi, 'D B M S')
      .replace(/\bOS\b/g, 'Operating System')
      .replace(/\bRAM\b/g, 'Ram')
      .replace(/\bCPU\b/g, 'C P U')
      .replace(/\bSQL\b/gi, 'S Q L')
      .replace(/\bNoSQL\b/gi, 'No S Q L')
      .replace(/\bSOS\b/g, 'S O S')
      .replace(/\bPDF\b/gi, 'P D F')
      .replace(/\bAPI\b/gi, 'A P I')
      .replace(/\bREST\b/gi, 'Rest')
      .replace(/\bWi-?Fi\b/gi, 'Wi-Fi')
      .replace(/\bID\b/g, 'I D')
      .replace(/O\(\s*1\s*\)/gi, 'Order 1')
      .replace(/O\(\s*n\s*\)/gi, 'Order n')
      .replace(/O\(\s*log\s*n\s*\)/gi, 'Order log n')
      .replace(/O\(\s*n\s*log\s*n\s*\)/gi, 'Order n log n')
      .replace(/O\(\s*n\^2\s*\)/gi, 'Order n squared')
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Ultra-fast sentence-chunked speech playback
  const speakText = (text) => {
    if (!voiceEnabled || !window.speechSynthesis) return
    stopSpeaking()

    const clean = sanitizeForSpeech(text)
    if (!clean) return

    // Split into sentences for immediate playback of the first sentence
    const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [clean]
    speechQueue = sentences.map(s => s.trim()).filter(Boolean)
    if (!speechQueue.length) return

    // Chromium speech delay workaround: schedule playback in a microtask
    speechTimeout = setTimeout(() => {
      playNextSentence()
    }, 25)
  }

  const playNextSentence = () => {
    if (!speechQueue.length) {
      isSpeaking = false
      if (speakingWave) speakingWave.classList.add('hidden')
      voiceToggleBtn.innerHTML = voiceEnabled ? '<i class="fa-solid fa-volume-high text-sm"></i>' : '<i class="fa-solid fa-volume-xmark text-sm text-white/50"></i>'
      return
    }

    const sentence = speechQueue.shift()
    const utterance = new SpeechSynthesisUtterance(sentence)
    const voice = cachedVoice || loadNaturalVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 1.05 // Confident, crisp speed
    utterance.pitch = 1.02

    utterance.onstart = () => {
      isSpeaking = true
      if (speakingWave) speakingWave.classList.remove('hidden')
      voiceToggleBtn.innerHTML = '<i class="fa-solid fa-volume-high text-sm text-emerald-300 animate-pulse"></i>'
    }

    utterance.onend = () => {
      if (speechQueue.length) {
        playNextSentence()
      } else {
        isSpeaking = false
        if (speakingWave) speakingWave.classList.add('hidden')
        voiceToggleBtn.innerHTML = voiceEnabled ? '<i class="fa-solid fa-volume-high text-sm"></i>' : '<i class="fa-solid fa-volume-xmark text-sm text-white/50"></i>'
      }
    }

    utterance.onerror = () => {
      isSpeaking = false
      if (speakingWave) speakingWave.classList.add('hidden')
      voiceToggleBtn.innerHTML = voiceEnabled ? '<i class="fa-solid fa-volume-high text-sm"></i>' : '<i class="fa-solid fa-volume-xmark text-sm text-white/50"></i>'
    }

    window.speechSynthesis.speak(utterance)
  }

  // Voice Toggle Button
  voiceToggleBtn.onclick = () => {
    if (isSpeaking) stopSpeaking()
    voiceEnabled = !voiceEnabled
    voiceToggleBtn.innerHTML = voiceEnabled ? '<i class="fa-solid fa-volume-high text-sm"></i>' : '<i class="fa-solid fa-volume-xmark text-sm text-white/50"></i>'
    voiceStatus.innerHTML = voiceEnabled ? '<span class="w-2 h-2 rounded-full bg-emerald-400"></span> Fast Voice Enabled' : '<span class="w-2 h-2 rounded-full bg-slate-400"></span> Voice Muted'
    toast(voiceEnabled ? 'Voice playback enabled' : 'Voice playback muted', 'info')
  }

  // Click speaking wave to stop speaking
  if (speakingWave) {
    speakingWave.onclick = () => stopSpeaking()
  }

  const toggle = () => {
    panel.classList.toggle('hidden')
    if (!panel.classList.contains('hidden')) {
      input.focus()
    } else {
      stopSpeaking()
    }
  }
  document.getElementById('ai-toggle').onclick = toggle
  document.getElementById('ai-close').onclick = () => {
    panel.classList.add('hidden')
    stopSpeaking()
  }

  const formatAIMessage = (text) => {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return `<div class="flex items-start gap-1.5 my-1"><span class="text-indigo-500 font-bold">•</span><span>${esc(trimmed.substring(1).trim())}</span></div>`
        }
        return `<div>${esc(line)}</div>`
      })
      .join('')
  }
  
  const addMsg = (text, isUser = false) => {
    const formatted = isUser ? esc(text) : formatAIMessage(text)
    messages.insertAdjacentHTML('beforeend', `
      <div class="flex items-start gap-2.5 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : ''}">
        ${isUser ? '' : `<div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center flex-shrink-0 shadow-sm"><i class="fa-solid fa-robot text-xs"></i></div>`}
        <div class="${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'} p-3.5 rounded-2xl shadow-sm text-xs leading-relaxed">
          ${formatted}
        </div>
      </div>`)
    messages.scrollTop = messages.scrollHeight
  }

  const showTypingIndicator = () => {
    messages.insertAdjacentHTML('beforeend', `
      <div id="ai-typing" class="flex items-center gap-2 max-w-[88%]">
        <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center flex-shrink-0"><i class="fa-solid fa-robot text-xs"></i></div>
        <div class="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-sm text-slate-400 text-xs flex items-center gap-1.5">
          <i class="fa-solid fa-spinner spin text-indigo-500"></i> Thinking...
        </div>
      </div>`)
    messages.scrollTop = messages.scrollHeight
  }

  const removeTypingIndicator = () => {
    const el = document.getElementById('ai-typing')
    if (el) el.remove()
  }

  const sendQuery = async (query) => {
    if (!query || !query.trim()) return
    const q = query.trim()
    addMsg(q, true)
    input.value = ''
    showTypingIndicator()
    
    try {
      const res = await call('post', '/ai/chat', { message: q })
      removeTypingIndicator()
      addMsg(res.response)
      speakText(res.response)
    } catch (e) {
      removeTypingIndicator()
      addMsg("I'm having a little trouble connecting right now. Please try again!")
    }
  }

  document.getElementById('ai-send').onclick = () => sendQuery(input.value)
  input.onkeypress = (e) => { if (e.key === 'Enter') sendQuery(input.value) }

  // Quick suggestion chips click handler
  document.querySelectorAll('.ai-chip').forEach(btn => {
    btn.onclick = () => {
      const query = btn.getAttribute('data-q')
      if (query) sendQuery(query)
    }
  })
  
  // High-Responsiveness Speech Recognition (Fast interim results & silence detection)
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (SR) {
    let rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let isListening = false
    let silenceTimer = null
    let latestTranscript = ''

    const stopListening = () => {
      if (!isListening) return
      isListening = false
      if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
      try { rec.stop() } catch (e) {}
      voiceBtn.classList.remove('!bg-red-500', '!text-white')
      if (micPulse) micPulse.classList.add('hidden')
      input.placeholder = 'Ask a question or tap mic to speak...'
    }

    voiceBtn.onclick = () => {
      if (isListening) {
        // Tap mic again to immediately submit what was heard
        stopListening()
        if (latestTranscript.trim()) {
          sendQuery(latestTranscript.trim())
          latestTranscript = ''
        }
        return
      }

      try {
        stopSpeaking()
        latestTranscript = ''
        isListening = true
        voiceBtn.classList.add('!bg-red-500', '!text-white')
        if (micPulse) micPulse.classList.remove('hidden')
        input.placeholder = 'Listening... Speak now'
        rec.start()
      } catch (e) {
        stopListening()
      }
    }

    rec.onresult = (ev) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const text = ev.results[i][0].transcript
        if (ev.results[i].isFinal) {
          latestTranscript = text
        } else {
          interim += text
        }
      }

      const activeText = (latestTranscript || interim).trim()
      if (activeText) {
        input.value = activeText
        // Fast 750ms silence auto-submit
        if (silenceTimer) clearTimeout(silenceTimer)
        silenceTimer = setTimeout(() => {
          stopListening()
          if (activeText) {
            sendQuery(activeText)
            latestTranscript = ''
          }
        }, 750)
      }
    }

    rec.onend = () => {
      stopListening()
      if (latestTranscript.trim()) {
        sendQuery(latestTranscript.trim())
        latestTranscript = ''
      }
    }

    rec.onerror = () => {
      stopListening()
    }
  } else {
    voiceBtn.title = 'Speech recognition not supported in this browser'
    voiceBtn.classList.add('opacity-50')
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (App.token && App.user) injectAIAssistant()
})

