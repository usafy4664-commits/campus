-- ============================================================
-- Smart Campus System — LMS Expansion
-- ============================================================

-- ------------------------------------------------------------
-- 7. SUBJECTS & ENROLLMENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,             -- e.g. "CS101"
  name        TEXT NOT NULL,                    -- e.g. "Intro to Programming"
  description TEXT,
  faculty_id  INTEGER,                          -- Reference to admin/faculty who teaches it
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);

CREATE TABLE IF NOT EXISTS enrollments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL,
  subject_id  INTEGER NOT NULL,
  semester    TEXT,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);

-- ------------------------------------------------------------
-- 8. COURSE MATERIALS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id  INTEGER NOT NULL,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('Notes', 'PDF', 'Document', 'Video', 'Link', 'Other')),
  content_url TEXT NOT NULL,                    -- URL to the file or external link
  created_by  INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON course_materials(subject_id);

-- ------------------------------------------------------------
-- 9. ATTENDANCE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id  INTEGER NOT NULL,
  subject_id  INTEGER NOT NULL,
  date        TEXT NOT NULL,                    -- ISO date 'YYYY-MM-DD'
  status      TEXT NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),
  recorded_by INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(student_id, subject_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);

-- ------------------------------------------------------------
-- 10. EXAMS & MARKS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id  INTEGER NOT NULL,
  title       TEXT NOT NULL,                    -- e.g. "Midterm", "Final"
  exam_date   TEXT,                             -- ISO date 'YYYY-MM-DD'
  max_marks   INTEGER NOT NULL DEFAULT 100,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id        INTEGER NOT NULL,
  student_id     INTEGER NOT NULL,
  marks_obtained REAL NOT NULL,
  grade          TEXT,
  feedback       TEXT,
  entered_by     INTEGER,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(exam_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);

-- ------------------------------------------------------------
-- 11. ASSIGNMENTS & SUBMISSIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id  INTEGER NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  resource_url TEXT,
  deadline    TEXT,                             -- ISO datetime
  created_by  INTEGER,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id  INTEGER NOT NULL,
  student_id     INTEGER NOT NULL,
  content_url    TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Graded', 'Late')),
  marks_obtained REAL,
  feedback       TEXT,
  submitted_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(assignment_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
