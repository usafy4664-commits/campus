-- ============================================================
-- Smart Campus System — Seed / Demo Data
-- Passwords (SHA-256):  admin123 / student123
-- ============================================================

-- Users -------------------------------------------------------
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, student_id, department, phone) VALUES
  (1, 'Campus Admin', 'admin@campus.edu',   '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin',   NULL,        'Administration', '9000000001'),
  (2, 'Aarav Sharma', 'aarav@campus.edu',   '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'student', 'CS2021-045', 'Computer Science', '9000000002'),
  (3, 'Diya Patel',   'diya@campus.edu',    '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b', 'student', 'EC2021-102', 'Electronics',      '9000000003');

-- Locations ---------------------------------------------------
INSERT OR IGNORE INTO locations (name, category, building, floor, description) VALUES
  ('Room 101',            'Classroom',  'Main Building', 'Ground', 'First-year lecture hall'),
  ('Room 204',            'Classroom',  'Lab Block',     '2nd',    'CS department classroom'),
  ('Computer Lab 1',      'Lab',        'Lab Block',     '1st',    'Programming & software lab'),
  ('Electronics Lab',     'Lab',        'Lab Block',     '1st',    'Circuits & embedded systems lab'),
  ('CS Department Office', 'Department', 'Main Building', '2nd',    'Computer Science faculty office'),
  ('Admin Office',        'Office',     'Main Building', 'Ground', 'Administration & accounts'),
  ('Central Library',     'Facility',   'Library Block', 'Ground', 'Books, reading rooms & digital section'),
  ('Seminar Hall',        'Hall',       'Main Building', '3rd',    'Events, workshops & seminars'),
  ('Cafeteria',           'Facility',   'Campus Center', 'Ground', 'Food court & student lounge'),
  ('Staff Room',          'Office',     'Main Building', '1st',    'Common faculty staff room');

-- Events ------------------------------------------------------
INSERT OR IGNORE INTO events (title, description, event_date, venue, created_by) VALUES
  ('Tech Fest 2026',        'Annual technical festival with coding, robotics & project expo.', '2026-10-15', 'Seminar Hall',   1),
  ('AI Workshop',           'Hands-on introductory workshop on machine learning basics.',      '2026-09-20', 'Computer Lab 1', 1),
  ('Sports Day',            'Inter-department sports competitions and cultural performances.',  '2026-09-28', 'Campus Ground',  1);

-- Notices -----------------------------------------------------
INSERT OR IGNORE INTO notices (title, body, priority, created_by) VALUES
  ('Semester Exam Schedule', 'End-semester exams begin from Nov 1. Timetable available at the admin office.', 'important', 1),
  ('Library Timings Update', 'Library will remain open till 9 PM during exam week.',                          'normal',    1),
  ('Campus Maintenance',     'Water supply to Lab Block will be interrupted on Sunday 8-11 AM.',              'urgent',    1);

-- Complaints --------------------------------------------------
INSERT OR IGNORE INTO complaints (user_id, title, category, description, location, status) VALUES
  (2, 'Fan not working in Room 204', 'Electrical', 'The ceiling fan near the window is not turning on.', 'Room 204',       'Pending'),
  (3, 'Broken chair in Lab 1',       'Furniture',  'One chair has a broken backrest, unsafe to sit.',    'Computer Lab 1', 'In Progress');

-- Lost & Found (demo match: black wallet at Central Library) --
INSERT OR IGNORE INTO lost_items (user_id, item_name, category, color, location, lost_date, description) VALUES
  (2, 'Black Wallet', 'Wallet/Cards', 'Black', 'Central Library', '2026-09-03', 'Leather wallet with college ID inside.');
INSERT OR IGNORE INTO found_items (user_id, item_name, category, color, location, found_date, description) VALUES
  (3, 'Wallet', 'Wallet/Cards', 'Black', 'Central Library', '2026-09-03', 'Found a black wallet near the reading room.');

-- Emergency alert (demo) --------------------------------------
INSERT OR IGNORE INTO emergency_alerts (user_id, type, location, message, status) VALUES
  (3, 'Medical', 'Electronics Lab', 'Student feeling dizzy, needs assistance.', 'Active');

-- ============================================================
-- LMS DATA (V1 Scope)
-- ============================================================

-- Subjects ----------------------------------------------------
INSERT OR IGNORE INTO subjects (id, code, name, description, faculty_id) VALUES
  (1, 'CS101', 'Intro to Programming', 'Basics of C and Python programming.', 1),
  (2, 'CS202', 'Database Management Systems', 'Relational algebra, SQL, normalization.', 1),
  (3, 'EC105', 'Basic Electronics', 'Semiconductors, diodes, circuits.', 1);

-- Enrollments -------------------------------------------------
INSERT OR IGNORE INTO enrollments (student_id, subject_id, semester) VALUES
  (2, 1, 'Fall 2026'),
  (2, 2, 'Fall 2026'),
  (3, 3, 'Fall 2026');

-- Course Materials --------------------------------------------
INSERT OR IGNORE INTO course_materials (subject_id, title, type, content_url, created_by) VALUES
  (1, 'Chapter 1: Intro to Python', 'PDF', '#', 1),
  (1, 'Python Setup Guide', 'Link', 'https://python.org', 1),
  (2, 'SQL Normalization Notes', 'Notes', '#', 1),
  (2, 'Lecture 4: ER Diagrams', 'Video', '#', 1);

-- Attendance --------------------------------------------------
INSERT OR IGNORE INTO attendance (student_id, subject_id, date, status, recorded_by) VALUES
  (2, 1, '2026-09-01', 'Present', 1),
  (2, 1, '2026-09-02', 'Absent', 1),
  (2, 1, '2026-09-03', 'Present', 1),
  (2, 2, '2026-09-01', 'Present', 1);

-- Exams & Marks -----------------------------------------------
INSERT OR IGNORE INTO exams (id, subject_id, title, exam_date, max_marks) VALUES
  (1, 1, 'Midterm', '2026-10-01', 100),
  (2, 2, 'Midterm', '2026-10-02', 100);

INSERT OR IGNORE INTO marks (exam_id, student_id, marks_obtained, grade, entered_by) VALUES
  (1, 2, 85.5, 'A', 1),
  (2, 2, 92.0, 'A+', 1);

-- Assignments & Submissions -----------------------------------
INSERT OR IGNORE INTO assignments (id, subject_id, title, description, deadline, created_by) VALUES
  (1, 1, 'Assignment 1: Variables & Loops', 'Write a script to print primes.', '2026-09-15T23:59:00Z', 1),
  (2, 2, 'Assignment 1: ER Models', 'Draw ER diagrams for a library.', '2026-09-20T23:59:00Z', 1);

INSERT OR IGNORE INTO submissions (assignment_id, student_id, content_url, status, marks_obtained) VALUES
  (1, 2, '#', 'Graded', 9.5);

