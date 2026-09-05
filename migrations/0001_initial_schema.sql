-- ============================================================
-- Smart Campus System — Initial Schema (Cloudflare D1 / SQLite)
-- A MySQL-portable version of this schema is documented in README.md
-- ============================================================

-- ------------------------------------------------------------
-- 1. USERS  (Auth & Roles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,               -- SHA-256 hex (demo). Use bcrypt/argon2 in production.
  role          TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  student_id    TEXT,                            -- e.g. "CS2021-045" (null for admins)
  department    TEXT,
  phone         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- Auth sessions (opaque bearer tokens)
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ------------------------------------------------------------
-- 2. COMPLAINTS  (Campus Issue / Complaint Management)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  category    TEXT    NOT NULL,                 -- Electrical, Furniture, Water, Cleaning, Classroom, Other
  description TEXT    NOT NULL,
  location    TEXT,                             -- free text or references a location name
  photo       TEXT,                             -- base64 data URL (nullable)
  status      TEXT    NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','In Progress','Resolved')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_complaints_user   ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- ------------------------------------------------------------
-- 3. LOCATIONS  (Campus Locator)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS locations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,                    -- "Room 204", "Central Library"
  category    TEXT NOT NULL,                    -- Classroom, Lab, Department, Office, Facility, Hall
  building    TEXT,                             -- "Lab Block", "Main Building"
  floor       TEXT,                             -- "Ground", "1st", "2nd"
  description TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_locations_category ON locations(category);

-- ------------------------------------------------------------
-- 4. EVENTS & NOTICES  (Announcements)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  TEXT,                             -- ISO date string for the event
  venue       TEXT,
  created_by  INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notices (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  body        TEXT,
  priority    TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','important','urgent')),
  created_by  INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 5. LOST & FOUND  (Smart Lost & Found)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lost_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  item_name   TEXT    NOT NULL,
  category    TEXT    NOT NULL,                 -- Electronics, Wallet/Cards, Bag, Keys, Books, Accessories, Other
  color       TEXT,
  location    TEXT,                             -- where it was lost
  lost_date   TEXT,
  description TEXT,
  photo       TEXT,                             -- base64 data URL (nullable)
  status      TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','closed')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lost_category ON lost_items(category);

CREATE TABLE IF NOT EXISTS found_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  item_name   TEXT    NOT NULL,
  category    TEXT    NOT NULL,
  color       TEXT,
  location    TEXT,                             -- where it was found
  found_date  TEXT,
  description TEXT,
  photo       TEXT,
  status      TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','closed')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_found_category ON found_items(category);

-- ------------------------------------------------------------
-- 6. EMERGENCY ALERTS  (SOS / Emergency Campus System)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  type        TEXT    NOT NULL,                 -- Medical, Security, Fire, Assistance, Other
  location    TEXT,                             -- free text or a location name
  message     TEXT,
  status      TEXT    NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Acknowledged','Responding','Resolved')),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sos_status ON emergency_alerts(status);
