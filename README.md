# 🎓 Smart Campus System

A complete, end-to-end campus services platform that brings six important campus
modules into **one connected platform** for **Students** and **Admins**.

> Built as a full working system: **beautiful frontend + REST backend + relational database**.
> The included frontend is a fully functional reference client that consumes the documented API —
> your team's separately-developed UI can call the exact same endpoints.

---

## 1. Project Overview
- **Name**: Smart Campus System
- **Goal**: Bring key campus services into one platform and make it easier for students and
  administration to communicate and manage campus problems.
- **Users / Roles**: `student` and `admin` — the system detects the role after login and shows
  the appropriate dashboard and features.
- **Tech Stack**: Hono (TypeScript) · Cloudflare Pages/Workers · **Cloudflare D1 (SQLite)** ·
  TailwindCSS · vanilla-JS SPA · Web Speech API (voice).

## 2. The 6 Modules (all implemented)

| # | Module | Student can | Admin can |
|---|--------|-------------|-----------|
| 1 | 🔐 **User Login & Roles** | Register, log in, see student dashboard | Log in, see admin dashboard & controls |
| 2 | 🛠️ **Complaint Management** | Create complaint (title, category, photo, **voice** description), track status | See all complaints, filter, update status `Pending → In Progress → Resolved` |
| 3 | 📍 **Campus Locator** | Search rooms/labs/offices by name & category | Add / delete locations |
| 4 | 📢 **Events & Notices** | View events & notices | Create / delete events & notices |
| 5 | 🔎 **Smart Lost & Found** | Report lost/found items with photo, see **possible matches** | Same + oversight |
| 6 | 🚨 **SOS Emergency** | Trigger emergency alert (Medical/Security/Fire/…) | See live alerts, update `Active → Acknowledged → Responding → Resolved` |

### Lost & Found matching (basic logic — NO AI/LLM)
Every open lost item is compared against every open found item using explainable rules:
`+50` same category · `+30` same color · `+40` shared name/description keywords · `+30` same location.
A total **≥ 60** is shown as a *Possible Match* with the reasons listed.
Example: *Lost: Black Wallet — Library* vs *Found: Wallet (Black) — Library* → **score 150, Possible Match**.

---

## 3. Live / Local URLs
- **Local dev (sandbox)**: `https://3000-<sandbox>.sandbox.novita.ai` (from `wrangler pages dev`)
- **Production**: _not deployed yet_ — deploy to Cloudflare Pages (see §8).

### Demo accounts (seeded)
| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@campus.edu` | `admin123` |
| Student | `aarav@campus.edu` | `student123` |
| Student | `diya@campus.edu` | `student123` |

---

## 4. API Reference

All API routes are under `/api`. Protected routes require the header
`Authorization: Bearer <token>` (token returned by login). `admin`-only routes are marked 🔒admin.

### Auth
| Method | Path | Body | Notes |
|--------|------|------|-------|
| POST | `/api/auth/register` | `{name,email,password,student_id?,department?,phone?}` | Creates a **student** |
| POST | `/api/auth/login` | `{email,password}` | → `{token, user}` |
| POST | `/api/auth/logout` | — | Invalidates the token |
| GET | `/api/auth/me` | — | Current user |

### Complaints
| Method | Path | Body / Query | Notes |
|--------|------|------|-------|
| GET | `/api/complaints` | `?status=&category=` | Student → own; Admin → all |
| GET | `/api/complaints/:id` | — | Owner or admin |
| POST | `/api/complaints` | `{title,category,description,location?,photo?}` | `photo` = base64 data URL |
| PATCH | `/api/complaints/:id/status` | `{status}` | 🔒admin · `Pending`/`In Progress`/`Resolved` |

### Locations
| Method | Path | Body / Query |
|--------|------|------|
| GET | `/api/locations` | `?search=&category=` |
| POST | `/api/locations` | `{name,category,building?,floor?,description?}` 🔒admin |
| DELETE | `/api/locations/:id` | 🔒admin |

### Events & Notices
| Method | Path | Body |
|--------|------|------|
| GET | `/api/announcements/events` | — |
| POST | `/api/announcements/events` | `{title,description?,event_date?,venue?}` 🔒admin |
| DELETE | `/api/announcements/events/:id` | 🔒admin |
| GET | `/api/announcements/notices` | — |
| POST | `/api/announcements/notices` | `{title,body?,priority?}` 🔒admin |
| DELETE | `/api/announcements/notices/:id` | 🔒admin |

### Lost & Found
| Method | Path | Body |
|--------|------|------|
| GET | `/api/lostfound/lost` / `/found` | — |
| POST | `/api/lostfound/lost` | `{item_name,category,color?,location?,lost_date?,description?,photo?}` |
| POST | `/api/lostfound/found` | `{item_name,category,color?,location?,found_date?,description?,photo?}` |
| GET | `/api/lostfound/matches` | All possible lost↔found matches |
| GET | `/api/lostfound/matches/:type/:id` | Matches for one item (`type`=`lost`\|`found`) |

### SOS Emergency
| Method | Path | Body |
|--------|------|------|
| GET | `/api/sos` | Student → own; Admin → all (Active first) |
| POST | `/api/sos` | `{type,location?,message?}` |
| PATCH | `/api/sos/:id/status` | `{status}` 🔒admin · `Active`/`Acknowledged`/`Responding`/`Resolved` |
| GET | `/api/sos/active/count` | 🔒admin — live badge |

### Dashboard stats
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/stats` | 🔒admin — campus-wide counts |
| GET | `/api/mystats` | student — personal counts |

---

## 5. Data Architecture

**Storage service**: Cloudflare **D1** (SQLite). Tables:
`users`, `sessions`, `complaints`, `locations`, `events`, `notices`,
`lost_items`, `found_items`, `emergency_alerts`.

**Data flow**:
```
Frontend (SPA) → Backend API (Hono) → D1 Database → back to Frontend
Student → Complaint → Backend → DB → Admin → Status update → Student
```

Photos are stored as **base64 data URLs** directly in the row (client-side resized to ≤900px),
keeping the demo fully self-contained.

### ⚙️ MySQL-portable schema
The project runs on D1/SQLite, but the schema was designed to port cleanly to **MySQL**.
Swap the types as below (SQLite `migrations/0001_initial_schema.sql` → MySQL):

| SQLite | MySQL |
|--------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `INT AUTO_INCREMENT PRIMARY KEY` |
| `TEXT` | `VARCHAR(255)` / `TEXT` |
| `DATETIME DEFAULT CURRENT_TIMESTAMP` | `DATETIME DEFAULT CURRENT_TIMESTAMP` |
| `CHECK (x IN (...))` | `ENUM(...)` (or keep the CHECK on MySQL 8+) |

Example — MySQL version of the two core tables:

```sql
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('student','admin') NOT NULL DEFAULT 'student',
  student_id    VARCHAR(64),
  department    VARCHAR(128),
  phone         VARCHAR(32),
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE complaints (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(64)  NOT NULL,
  description TEXT NOT NULL,
  location    VARCHAR(255),
  photo       LONGTEXT,                 -- base64 (or store a file path/URL)
  status      ENUM('Pending','In Progress','Resolved') NOT NULL DEFAULT 'Pending',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
The remaining tables (`locations`, `events`, `notices`, `lost_items`, `found_items`,
`emergency_alerts`) follow the same pattern — see `migrations/0001_initial_schema.sql`
for the full, commented source of truth.

> **Note on passwords**: the demo uses SHA-256 (edge-runtime friendly). For a MySQL/Node backend,
> use **bcrypt/argon2** instead.

---

## 6. User Guide
1. Open the app → **Sign in** (use a demo account or register a new student).
2. **Student**: report a complaint (type or 🎤 *Speak* the description, attach a photo),
   find a location, read events/notices, report lost/found items and view suggested matches,
   or press **Emergency SOS**.
3. **Admin**: view campus stats, update complaint & SOS statuses, add locations,
   post events & notices, and monitor the **Emergency Center** (a live badge shows active alerts).

---

## 7. Local Development
```bash
npm install                      # (already installed in this environment)
npm run build                    # build to dist/
npm run db:migrate:local         # apply migrations to local D1
npm run db:seed                  # load demo data
pm2 start ecosystem.config.cjs   # serve at http://localhost:3000
# reset DB anytime:  npm run db:reset
```

## 8. Deployment (Cloudflare Pages)
```bash
npx wrangler d1 create webapp-production        # create the real D1, copy database_id → wrangler.jsonc
npx wrangler d1 migrations apply webapp-production   # migrate production
npm run deploy                                   # build + wrangler pages deploy
```

---

## 9. Status
- **Deployment**: ✅ Running locally (sandbox) · ⏳ Not yet on Cloudflare Pages
- **Completed**: All 6 modules, auth + roles, voice complaints, photo upload, Lost & Found matching,
  SOS workflow, admin/student dashboards, seed data.
- **Last Updated**: 2026-09-05

### Features not yet implemented / next steps
- Password hashing upgrade to bcrypt/argon2 (currently SHA-256 for the edge demo).
- Real-time push for SOS (currently polled via a refresh button + badge).
- Email/SMS notification hooks for emergencies.
- Pagination for very large complaint/lost-found lists.
- Optional map view for the Campus Locator.
