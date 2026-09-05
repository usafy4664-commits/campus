import { Hono } from 'hono'
import { requireAuth } from '../lib/auth'
import type { Bindings, AuthUser } from '../lib/auth'

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// ------------------------------------------------------------
// EXTENSIVE EDUCATIONAL & ACADEMIC KNOWLEDGE BASE
// ------------------------------------------------------------
const TOPIC_EXPLANATIONS: Record<string, string> = {
  // Database Systems
  'database normalization': `Database Normalization organizes database relations to reduce data redundancy and eliminate anomalies (Insertion, Update, Deletion):
• 1NF (First Normal Form): Eliminate duplicate columns; ensure all attributes contain atomic, single-valued entries.
• 2NF (Second Normal Form): Satisfy 1NF and eliminate partial dependency — every non-key attribute must depend on the whole primary key.
• 3NF (Third Normal Form): Satisfy 2NF and eliminate transitive dependency (if A -> B and B -> C, then remove C from A).
• BCNF (Boyce-Codd NF): A stricter 3NF where for every functional dependency X -> Y, X must be a superkey.`,

  'normalization': `Database Normalization structures relations to minimize redundancy and prevent data anomalies:
• 1NF: Atomic values only, no repeating groups.
• 2NF: 1NF plus no partial functional dependencies on composite candidate keys.
• 3NF: 2NF plus no transitive dependencies between non-prime attributes.
• BCNF: Strictest normal form where every determinant must be a candidate key.`,

  '1nf': `First Normal Form (1NF) rules:
• Each column must contain atomic (indivisible) values.
• No multi-valued attributes or comma-separated lists in a single cell.
• Each row must be uniquely identifiable via a Primary Key.`,

  '2nf': `Second Normal Form (2NF) rules:
• Table must be in 1NF.
• No partial dependencies: Non-prime attributes must depend on the whole candidate key, not a partial subset.
• If primary key is a single column, 1NF automatically satisfies 2NF.`,

  '3nf': `Third Normal Form (3NF) rules:
• Table must be in 2NF.
• No transitive dependencies: Non-prime attributes must not determine other non-prime attributes (X -> Y and Y -> Z where Z is non-prime is disallowed).`,

  'bcnf': `Boyce-Codd Normal Form (BCNF):
• A stricter version of 3NF.
• For every functional dependency X -> Y, X must be a superkey.
• Eliminates remaining anomalies when relations have overlapping candidate keys.`,

  'acid': `ACID properties ensure reliable, fault-tolerant database transactions:
• Atomicity: Transactions are all-or-nothing units. If any step fails, the entire transaction rolls back.
• Consistency: Enforces database integrity constraints before and after every transaction.
• Isolation: Concurrent transactions execute without cross-contamination (e.g. Serializability).
• Durability: Once committed, state changes survive server crashes and power loss via write-ahead logging (WAL).`,

  'indexing': `Database Indexing speeds up data retrieval without scanning every table row:
• B-Tree Index: Balanced tree structure optimal for equality and range queries (O(log n) search time).
• Hash Index: Uses hashing for lightning-fast O(1) equality lookups, but does not support range scans.
• Clustered vs Non-Clustered: A clustered index defines the physical order of rows (one per table), while non-clustered indexes store separate pointers.`,

  'sql joins': `SQL Joins combine columns from one or more tables based on related fields:
• INNER JOIN: Returns records matching in both tables.
• LEFT JOIN: Returns all records from the left table, and matched records from the right table.
• RIGHT JOIN: Returns all records from the right table, and matched records from the left table.
• FULL OUTER JOIN: Returns all records when there is a match in either left or right table.
• CROSS JOIN: Cartesian product of all rows across both tables.`,

  'sql vs nosql': `Comparison between SQL and NoSQL databases:
• SQL (Relational): Structured schemas, ACID transactions, relational joins (e.g. SQLite, PostgreSQL, MySQL). Ideal for financial and ERP systems.
• NoSQL: Flexible schemas (Document, Key-Value, Columnar, Graph), horizontal scalability, eventual consistency (e.g. MongoDB, Redis, Cassandra). Ideal for big data and high-velocity streaming.`,

  // Algorithms & Data Structures
  'binary search': `Binary Search is an optimal O(log n) divide-and-conquer search algorithm:
• Condition: The target array must already be sorted.
• Mechanism: Compare target value to middle element. If smaller, search left half; if larger, search right half.
• Time Complexity: Best O(1), Average/Worst O(log n). Space complexity is O(1) iterative.`,

  'data structures': `Core Data Structures in Computer Science:
• Arrays: Contiguous memory blocks with O(1) index access and fixed size.
• Linked Lists: Dynamic nodes connected via pointers with O(1) insertion/deletion at ends.
• Stacks & Queues: LIFO (Last In First Out) and FIFO (First In First Out) buffers for recursion, undo operations, and task scheduling.
• Hash Maps: Key-value stores using hashing achieving O(1) average lookup and insert.
• Trees (BST, AVL, Red-Black): Hierarchical structures offering O(log n) search and ordered traversals.
• Graphs: Vertices and edges modeling networks, traversed using BFS and DFS.`,

  'sorting algorithms': `Common Sorting Algorithms comparison:
• QuickSort: Divide-and-conquer partitioning. Average O(n log n), in-place, cache-friendly.
• MergeSort: Stable divide-and-conquer with guaranteed O(n log n), requires O(n) auxiliary space.
• HeapSort: In-place comparison sort using a binary heap, guaranteed O(n log n).
• Bubble/Selection/Insertion Sort: Simple O(n^2) algorithms suitable primarily for educational demonstration or small datasets.`,

  'recursion': `Recursion is a problem-solving technique where a function calls itself to solve smaller sub-problems:
• Base Case: Crucial terminating condition that halts recursion and prevents infinite call stack loops.
• Recursive Step: Breaks the problem into simpler instances, advancing toward the base case.
• Memory: Uses execution call stack; excessive depth risks Stack Overflow. Tail-call optimization helps mitigate this.`,

  'big o': `Big O Notation measures the upper bound of algorithmic time or space complexity:
• O(1): Constant time (e.g. array index lookup, hash map get).
• O(log n): Logarithmic time (e.g. binary search, balanced BST search).
• O(n): Linear time (e.g. linear scan, counting elements).
• O(n log n): Linearithmic time (e.g. MergeSort, QuickSort average).
• O(n^2): Quadratic time (e.g. nested loops, BubbleSort).
• O(2^n): Exponential time (e.g. brute-force recursive Fibonacci).`,

  'dynamic programming': `Dynamic Programming (DP) solves complex optimization problems by breaking them into overlapping subproblems:
• Optimal Substructure: Optimal solution to problem contains optimal solutions to its subproblems.
• Overlapping Subproblems: Same subproblems are evaluated multiple times.
• Approaches: Top-Down with Memoization (caching recursive results) or Bottom-Up Tabulation (iteratively building tables).`,

  // Operating Systems
  'deadlock': `A Deadlock occurs when multiple processes cannot proceed because each holds a resource while waiting for another:
Four Coffman conditions necessary for deadlock:
1. Mutual Exclusion: Resources cannot be shared simultaneously.
2. Hold and Wait: A process holds allocated resources while waiting for more.
3. No Preemption: Resources cannot be forcibly revoked from a process.
4. Circular Wait: A closed chain of processes waiting in a circle.
Handling: Banker's algorithm (avoidance), resource hierarchy ordering (prevention), or detection & recovery.`,

  'operating systems': `An Operating System (OS) manages hardware and provides services to user applications:
• Process Management: CPU scheduling (FCFS, Round Robin, Priority, Multi-level queues).
• Memory Management: Paging, segmentation, and virtual memory.
• Storage & File Systems: File allocation tables, inodes, access control.
• Device Management: Interrupt handling, device drivers, and I/O buffering.`,

  'virtual memory': `Virtual Memory abstracts physical RAM using secondary storage (disk swap space):
• Paging: Memory is divided into fixed-size blocks called pages (virtual) and frames (physical).
• Page Fault: Occurs when a referenced page is not in physical RAM, triggering disk retrieval.
• Page Replacement Algorithms: FIFO, LRU (Least Recently Used), and Optimal Page Replacement.`,

  'cpu scheduling': `CPU Scheduling algorithms allocate processor time among active processes:
• FCFS (First Come First Served): Simple, non-preemptive, suffers from Convoy Effect.
• SJF (Shortest Job First): Optimal minimum average waiting time; requires knowing burst times in advance.
• Round Robin (RR): Preemptive scheduling with a fixed time quantum; optimal for time-sharing interactive systems.
• Priority Scheduling: Assigns priority levels; uses aging technique to prevent starvation.`,

  // Object-Oriented Programming
  'oop': `The 4 Pillars of Object-Oriented Programming (OOP):
1. Encapsulation: Restricting direct access to internal state and bundling methods with data (using private fields, getters/setters).
2. Abstraction: Hiding implementation details and exposing only essential interfaces.
3. Inheritance: Reusing code by allowing derived classes to inherit fields and methods from base classes.
4. Polymorphism: Allowing entities to take multiple forms via method overloading (compile-time) and method overriding (runtime).`,

  'solid principles': `The SOLID Principles of Object-Oriented Software Design:
• S (Single Responsibility): A class should have only one reason to change.
• O (Open/Closed): Open for extension, closed for modification.
• L (Liskov Substitution): Subtypes must be substitutable for their base types without altering correctness.
• I (Interface Segregation): Clients should not be forced to depend upon interfaces they do not use.
• D (Dependency Inversion): Depend upon abstractions, not concrete implementations.`,

  // Computer Networks & Web
  'rest api': `REST (Representational State Transfer) is an architectural style for scalable web APIs:
• Standard Verbs: GET (Read), POST (Create), PUT/PATCH (Update), DELETE (Remove).
• Principles: Statelessness (no client session stored on server), Uniform Interface, Cacheability, Client-Server separation.`,

  'osi model': `The OSI (Open Systems Interconnection) 7-Layer Model:
7. Application: User interface & network services (HTTP, DNS, SSH).
6. Presentation: Encryption, compression, and formatting (TLS/SSL, JSON).
5. Session: Establishes and manages connections.
4. Transport: End-to-end delivery and reliability (TCP, UDP).
3. Network: Routing and logical addressing (IP, ICMP).
2. Data Link: Physical addressing and MAC frames (Ethernet, Wi-Fi).
1. Physical: Raw binary transmission over cables and radio waves.`,

  'tcp vs udp': `Comparison between TCP and UDP transport protocols:
• TCP (Transmission Control Protocol): Connection-oriented, reliable, guarantees packet delivery and ordering via 3-way handshakes, ACKs, and retransmissions. Used for Web (HTTP), Email, File transfers.
• UDP (User Datagram Protocol): Connectionless, lightweight, low-latency without delivery guarantees. Used for Video streaming, Gaming, VoIP, DNS queries.`,

  'git': `Git is a distributed version control system for source code:
• Commit: A snapshot of your project state saved in history.
• Branch: An independent line of development (e.g. 'main', 'feature-x').
• Remote: A repository hosted online (like GitHub, GitLab).
• Push & Pull: Push sends your local commits to remote; Pull fetches and merges remote changes.
• Merge & Rebase: Integrates divergent branches into a unified history.`,

  'docker': `Docker is a platform for containerizing applications:
• Container: Lightweight, isolated executable package including code, runtime, system tools, and libraries.
• Image: Read-only template used to build containers (defined in a Dockerfile).
• Docker Hub: Cloud registry to share and pull pre-built container images.`,

  'cyber security': `Core Cyber Security fundamentals:
• CIA Triad: Confidentiality (encryption), Integrity (hashing/checksums), Availability (redundancy/DDoS protection).
• SQL Injection: Attacker injects malicious SQL into queries; prevented using prepared statements and parameterized queries.
• XSS (Cross-Site Scripting): Attacker injects malicious scripts into web pages; prevented via HTML escaping and Content Security Policy (CSP).
• CSRF (Cross-Site Request Forgery): Unauthorized commands submitted from a trusted user; prevented using anti-CSRF tokens and SameSite cookies.`
}

// ------------------------------------------------------------
// STUDY TIPS, ADVICE & MOTIVATION
// ------------------------------------------------------------
const STUDY_ADVICE = `Here are 4 proven academic success strategies:
1. Active Recall: Test yourself frequently with flashcards and quizzes rather than passively re-reading notes.
2. Pomodoro Technique: Study in focused 25-minute sprints separated by 5-minute restorative breaks.
3. Feynman Technique: Explain concepts simply in plain words as if teaching a beginner to immediately reveal knowledge gaps.
4. Spaced Repetition: Review new material after 24 hours, 7 days, and 30 days to cement it into long-term memory.`

const FEYNMAN_TECHNIQUE = `The Feynman Technique for mastering any difficult topic:
1. Choose a concept to learn.
2. Teach it to a 12-year-old: Write an explanation using simple language and analogies.
3. Identify knowledge gaps: Pinpoint where you hesitated or used jargon, and review your notes.
4. Simplify and refine: Create a clear, intuitive narrative you can explain from memory.`

const POMODORO_TECHNIQUE = `The Pomodoro Technique time-management workflow:
1. Pick one specific task (e.g. complete 3 practice problems).
2. Set a timer for 25 minutes and work with zero distractions.
3. Take a 5-minute break (stretch, drink water, rest your eyes).
4. After 4 cycles, reward yourself with an extended 20-30 minute break.`

const JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "There are 10 types of people in the world: those who understand binary, and those who don't.",
  "Why was the JavaScript developer sad? Because they didn't know how to 'null' their feelings!",
  "A SQL query walks into a bar, approaches two tables, and asks: 'Can I join you?'",
  "Why do Java developers wear glasses? Because they don't C#!",
  "Hardware: The part of a computer you can kick; Software: The part you can only curse at!"
]

const MOTIVATION = [
  "“The expert in anything was once a beginner.” Keep coding and learning every day!",
  "“Success is the sum of small efforts, repeated day in and day out.” Every class you attend and assignment you complete builds your future!",
  "“It always seems impossible until it's done.” Take your challenges one line of code at a time!",
  "“Push yourself, because no one else is going to do it for you.” Focus on steady progress, not perfection!"
]

// ------------------------------------------------------------
// CAMPUS FAQs & SERVICES DIRECTORY
// ------------------------------------------------------------
const CAMPUS_INFO = {
  library: `Central Library Services:
• Timings: Monday to Saturday 8:00 AM – 10:00 PM; Sunday 9:00 AM – 5:00 PM.
• Location: Central Academic Complex, 2nd & 3rd Floors.
• Borrowing Limit: Up to 4 books for 14 days per student.
• Facilities: High-speed Wi-Fi, air-conditioned silent study cabins, digital e-library, and photocopy counter.`,

  canteen: `Campus Cafeteria & Food Court:
• Main Dining Hall: Ground Floor, Student Activity Center.
• Meal Timings: Breakfast 7:30–9:30 AM, Lunch 12:30–2:30 PM, Evening Tea & Snacks 4:30–6:00 PM, Dinner 7:30–9:30 PM.
• Offerings: Hygienic vegetarian & non-vegetarian thalis, quick snacks, fresh juices, and cafe drinks.`,

  hostel: `Hostel Guidelines & Accommodation:
• Blocks: Boys Hostel (Blocks A, B, C); Girls Hostel (Blocks 1 & 2).
• Night Curfew: 10:00 PM on weekdays; 10:30 PM on weekends.
• Facilities: 24/7 Wi-Fi, solar hot water, study lounges, indoor games, and laundry service.
• Night Pass: Apply through the Hostel Warden office at least 12 hours in advance.`,

  wifi: `Campus Wi-Fi Setup:
• SSID: "Campus-WiFi" or "Campus-Student".
• Login: Open any browser and sign in using your student email (e.g. aarav@campus.edu) and campus portal password.
• Need Support? Submit a quick ticket under the Complaints section or visit the IT Helpdesk in the Admin Block.`,

  examRules: `University Examination Guidelines:
• Mandatory Requirements: Physical College ID Card and official Exam Hall Ticket.
• Reporting Time: Report to the examination hall at least 20 minutes before the bell.
• Prohibited Items: Smartwatches, mobile phones, programmable calculators, and unauthorized paper notes.
• Passing Criteria: Minimum 40% in final written exam and minimum 75% overall course attendance.`,

  career: `Career & Placement Cell (CDC):
• Eligibility: Minimum 6.5 CGPA with no active backlogs for tier-1 campus recruitment drives.
• Recommended Roadmap: Master Data Structures & Algorithms, build 2 comprehensive full-stack projects, and practice mock coding interviews on LeetCode.
• Placement Office: 1st Floor, Placement & Corporate Relations Wing.`
}

// ------------------------------------------------------------
// AI CHAT DISPATCHER
// ------------------------------------------------------------
app.post('/chat', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { message } = await c.req.json()
  const rawQ = (message || '').trim()
  const q = rawQ.toLowerCase()

  if (!q) {
    return c.json({ response: "Hello! I am your Smart Campus Voice Assistant. Ask me about attendance, assignments, marks & CGPA, schedule, campus locations, or ask me to explain any academic topic!" })
  }

  // 1. GREETINGS & SOCIAL
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))\b/.test(q)) {
    const roleGreeting = user.role === 'admin' ? `Hello Administrator ${user.name}!` : `Hi ${user.name}!`
    return c.json({
      response: `${roleGreeting} I am ready to help you. You can ask about your attendance percentage, bunk limits, pending assignments, exam marks, enrolled subjects, campus locations, or ask me to explain any engineering concept!`
    })
  }

  if (q.includes('joke')) {
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)]
    return c.json({ response: `${joke} 😄 Let me know if you'd like another one or need help with your courses!` })
  }

  if (q.includes('motivation') || q.includes('inspire') || q.includes('quote')) {
    const quote = MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)]
    return c.json({ response: `Here is your inspiration for today: ${quote}` })
  }

  if (q.includes('who are you') || q.includes('what can you do') || q.includes('features') || q === 'help') {
    return c.json({
      response: `I am your 24/7 Smart Campus AI Voice Assistant. Here is what I can do for you:
• 📊 Attendance & Bunk Calculator: Check overall percentage, subject attendance, and how many classes you can safely bunk.
• 📝 Assignments: View pending deadlines, submission status, and faculty grading feedback.
• 📈 Marks & CGPA: View exam results, calculate cumulative GPA, and review letter grades.
• 📚 Subjects & Notes: Check enrolled subjects, faculty teachers, and download lecture materials.
• 📅 Schedule & Timetable: Preview exams, holidays, and campus events.
• 🏛️ Campus Navigation: Locate the Central Library, Cafeteria, Hostels, Labs, and Sports Complex.
• 📢 Notices & Complaints: Track notices, file hostel/Wi-Fi tickets, and report lost & found items.
• 💡 Academic Tutor: Explain Computer Science topics (Normalization, ACID, Binary Search, OOP, etc.).
• 🚨 Emergency SOS: Instant alerts to campus security.`
    })
  }

  if (/^(thank you|thanks|thx|awesome|great|cool|bye|goodbye)\b/.test(q)) {
    return c.json({ response: "You're very welcome! I am always here to assist your academic journey. Best of luck with your studies!" })
  }

  // 2. BUNK CALCULATOR & CLASS ATTENDANCE
  if (q.includes('bunk') || q.includes('skip class') || q.includes('can i miss') || q.includes('miss class') || q.includes('attendance threshold') || q.includes('75%')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`SELECT status FROM attendance WHERE student_id = ?`).bind(user.id).all()
      if (!results.length) {
        return c.json({ response: "You do not have any recorded classes yet. Attend upcoming lectures to establish your attendance record!" })
      }

      const total = results.length
      const present = results.filter((r: any) => r.status === 'Present').length
      const currentPct = ((present / total) * 100).toFixed(1)

      // Formula for skippable classes: present / (total + x) >= 0.75  =>  x <= (present / 0.75) - total
      const skippable = Math.floor((present / 0.75) - total)

      if (skippable > 0) {
        return c.json({
          response: `Your current attendance is ${currentPct}% (${present} present out of ${total} total classes). You can safely bunk up to ${skippable} more class(es) and remain above the mandatory 75% attendance threshold!`
        })
      } else if (skippable === 0) {
        return c.json({
          response: `Your attendance is right on the edge at ${currentPct}% (${present} present out of ${total} classes). You cannot bunk any classes right now without falling below the 75% minimum!`
        })
      } else {
        // Classes needed to reach 75%: (present + y) / (total + y) >= 0.75 => y >= (0.75*total - present) / 0.25
        const needed = Math.ceil((0.75 * total - present) / 0.25)
        return c.json({
          response: `Warning: Your attendance is currently ${currentPct}% (${present}/${total}), which is below the mandatory 75% rule! You cannot bunk any classes. You must attend the next ${needed} consecutive lecture(s) to restore your attendance to 75%.`
        })
      }
    } else {
      return c.json({ response: "As an administrator, you can view the complete campus attendance registry and student shortage lists in the Attendance tab." })
    }
  }

  // 3. ATTENDANCE INQUIRIES
  if (q.includes('attendance') || q.includes('present') || q.includes('absent') || q.includes('shortage')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT a.status, s.name as subject_name, s.code
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE a.student_id = ?
        ORDER BY a.date DESC
      `).bind(user.id).all()

      if (!results.length) {
        return c.json({ response: "No attendance records found yet for your account. Once your teachers mark attendance, your percentage will update automatically." })
      }

      // Check specific subject
      const subMatch = results.find((r: any) => q.includes(r.subject_name.toLowerCase()) || q.includes(r.code.toLowerCase()))
      if (subMatch) {
        const subList = results.filter((r: any) => r.code === subMatch.code)
        const subPresent = subList.filter((r: any) => r.status === 'Present').length
        const subPct = ((subPresent / subList.length) * 100).toFixed(1)
        const statusRemark = Number(subPct) >= 75 ? "You are in good standing." : "Warning: Below 75% minimum!"
        return c.json({ response: `Your attendance in ${subMatch.subject_name} (${subMatch.code}) is ${subPct}% (${subPresent} present out of ${subList.length} classes). ${statusRemark}` })
      }

      const total = results.length
      const present = results.filter((r: any) => r.status === 'Present').length
      const pct = Number(((present / total) * 100).toFixed(1))
      const statusText = pct >= 75 
        ? "You are safely above the mandatory 75% attendance threshold. Excellent work!" 
        : "Warning: Your attendance is below 75%. Please attend upcoming classes to avoid exam eligibility issues."

      return c.json({ response: `Your overall attendance is ${pct}% (${present} present out of ${total} total sessions). ${statusText}` })
    } else {
      const { results } = await db.prepare(`SELECT COUNT(*) as total FROM attendance`).all()
      return c.json({ response: `As an administrator, you have access to the complete campus attendance registry containing ${results[0]?.total || 0} recorded sessions.` })
    }
  }

  // 4. ASSIGNMENTS & HOMEWORK
  if (q.includes('assignment') || q.includes('pending') || q.includes('homework') || q.includes('submission') || q.includes('due') || q.includes('task')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT a.title, a.deadline, s.name as subject_name, sub.status, sub.marks_obtained, sub.feedback
        FROM assignments a
        JOIN enrollments e ON a.subject_id = e.subject_id
        JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
        WHERE e.student_id = ?
        ORDER BY a.deadline ASC
      `).bind(user.id, user.id).all()

      const pending = results.filter((r: any) => !r.status || r.status === 'Pending')
      const graded = results.filter((r: any) => r.status === 'Graded')

      if (pending.length === 0) {
        let reply = "Great news! You have no pending assignments right now."
        if (graded.length > 0) {
          reply += ` Your recent assignment "${graded[0].title}" was graded with ${graded[0].marks_obtained} marks.`
          if (graded[0].feedback) reply += ` Faculty remark: "${graded[0].feedback}".`
        }
        return c.json({ response: reply })
      }

      const list = pending.map((p: any) => `"${p.title}" for ${p.subject_name} (due ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'soon'})`).join('; ')
      return c.json({ response: `You have ${pending.length} pending assignment(s): ${list}. Open the Assignments page to submit your work.` })
    } else {
      const { results } = await db.prepare(`
        SELECT COUNT(*) as total, 
          (SELECT COUNT(*) FROM submissions WHERE status = 'Submitted') as unreviewed
        FROM assignments
      `).all()
      return c.json({ response: `There are ${results[0]?.total || 0} course assignments created, with ${results[0]?.unreviewed || 0} student submissions awaiting grading.` })
    }
  }

  // 5. MARKS, RESULTS & CGPA
  if (q.includes('mark') || q.includes('grade') || q.includes('result') || q.includes('cgpa') || q.includes('gpa') || q.includes('score') || q.includes('percentage')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT m.marks_obtained, m.grade, m.feedback, e.title as exam_title, e.max_marks, s.name as subject_name, s.code
        FROM marks m
        JOIN exams e ON m.exam_id = e.id
        JOIN subjects s ON e.subject_id = s.id
        WHERE m.student_id = ?
        ORDER BY e.exam_date DESC
      `).bind(user.id).all()

      if (!results.length) {
        return c.json({ response: "No exam marks have been posted for your account yet. They will appear here once published by faculty." })
      }

      const subMatch = results.find((r: any) => q.includes(r.subject_name.toLowerCase()) || q.includes(r.code.toLowerCase()))
      if (subMatch) {
        return c.json({ 
          response: `In ${subMatch.subject_name} (${subMatch.exam_title}): You scored ${subMatch.marks_obtained}/${subMatch.max_marks} (Grade: ${subMatch.grade || 'A'}). ${subMatch.feedback ? 'Remark: "' + subMatch.feedback + '"' : ''}` 
        })
      }

      const totalObtained = results.reduce((sum: number, r: any) => sum + Number(r.marks_obtained || 0), 0)
      const totalMax = results.reduce((sum: number, r: any) => sum + Number(r.max_marks || 100), 0)
      const pct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0'
      const cgpa = (Number(pct) / 9.5).toFixed(2)
      const summary = results.map((r: any) => `${r.subject_name}: ${r.marks_obtained}/${r.max_marks} [${r.grade || 'Pass'}]`).join(', ')

      return c.json({ response: `Your overall academic performance is ${pct}% with an estimated CGPA of ${cgpa}/10.0 across ${results.length} exams. Summary: ${summary}.` })
    } else {
      return c.json({ response: "You are logged in as Admin. You can enter, edit, and review student grades in the Marks & Results section." })
    }
  }

  // 6. COURSE MATERIALS & NOTES (checked before generic subjects)
  if (q.includes('material') || q.includes('notes') || q.includes('pdf') || q.includes('slide') || q.includes('download') || q.includes('document')) {
    const { results } = await db.prepare(`
      SELECT m.title, m.type, m.content_url, s.name as subject_name, s.code
      FROM course_materials m
      JOIN subjects s ON m.subject_id = s.id
      ORDER BY m.created_at DESC LIMIT 4
    `).all()

    if (!results.length) {
      return c.json({ response: "No course materials have been published yet. Faculty will upload lecture slides and notes soon." })
    }

    const items = results.map((m: any) => `"${m.title}" (${m.subject_name} - ${m.type})`).join(', ')
    return c.json({ response: `Here are the latest study materials: ${items}. You can access and download all files in the Subjects section!` })
  }

  // 7. ENROLLED SUBJECTS & FACULTY
  if (q.includes('subject') || q.includes('course') || q.includes('faculty') || q.includes('teacher') || q.includes('professor') || q.includes('syllabus')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT s.name, s.code, s.description, u.name as faculty_name
        FROM subjects s
        JOIN enrollments e ON s.id = e.subject_id
        LEFT JOIN users u ON s.faculty_id = u.id
        WHERE e.student_id = ?
        ORDER BY s.code ASC
      `).bind(user.id).all()

      if (!results.length) {
        return c.json({ response: "You are not currently enrolled in any active courses. Please contact the academic registrar." })
      }

      const list = results.map((s: any) => `${s.name} (${s.code}) taught by ${s.faculty_name || 'Faculty unassigned'}`).join('; ')
      return c.json({ response: `You are enrolled in ${results.length} subject(s): ${list}. You can open the Subjects tab to view lecture materials and notes.` })
    } else {
      const { results } = await db.prepare(`SELECT s.name, s.code, u.name as faculty_name FROM subjects s LEFT JOIN users u ON s.faculty_id = u.id`).all()
      return c.json({ response: `There are ${results.length} active subject offerings across the campus curriculum.` })
    }
  }

  // 8. CALENDAR, SCHEDULE & TIMETABLE
  if (q.includes('class') || q.includes('schedule') || q.includes('calendar') || q.includes('today') || q.includes('holiday') || q.includes('event') || q.includes('fest') || q.includes('timetable')) {
    const [events, exams] = await Promise.all([
      db.prepare(`SELECT title, event_date, venue FROM events ORDER BY event_date ASC LIMIT 3`).all(),
      db.prepare(`SELECT e.title, e.exam_date, s.name as subject_name FROM exams e JOIN subjects s ON e.subject_id = s.id ORDER BY e.exam_date ASC LIMIT 2`).all()
    ])

    let details: string[] = []
    if (exams.results?.length) {
      details.push(`Exams: ` + exams.results.map((e: any) => `${e.title} in ${e.subject_name} (${e.exam_date || 'TBA'})`).join(', '))
    }
    if (events.results?.length) {
      details.push(`Events: ` + events.results.map((ev: any) => `${ev.title} at ${ev.venue || 'Campus'} on ${ev.event_date || 'Soon'}`).join(', '))
    }

    if (details.length) {
      return c.json({ response: `Upcoming schedule preview: ${details.join('. ')}. Head over to the Calendar tab for the full timeline!` })
    }
    return c.json({ response: "You have 2 lecture blocks scheduled for today. Check your Academic Calendar for specific classroom locations and event times." })
  }

  // 9. CAMPUS LOCATIONS & NAVIGATION
  if (q.includes('where is') || q.includes('location') || q.includes('library') || q.includes('canteen') || q.includes('cafeteria') || q.includes('hostel') || q.includes('lab') || q.includes('auditorium') || q.includes('sports') || q.includes('gym') || q.includes('map')) {
    if (q.includes('library')) return c.json({ response: CAMPUS_INFO.library })
    if (q.includes('canteen') || q.includes('cafeteria') || q.includes('mess') || q.includes('food')) return c.json({ response: CAMPUS_INFO.canteen })
    if (q.includes('hostel')) return c.json({ response: CAMPUS_INFO.hostel })

    const { results } = await db.prepare(`SELECT name, category, building, floor FROM locations ORDER BY name ASC`).all()
    const match = results.find((l: any) => q.includes(l.name.toLowerCase()) || q.includes(l.category.toLowerCase()) || q.includes((l.building || '').toLowerCase()))
    if (match) {
      return c.json({ response: `${match.name} is located in ${match.building || 'Main Campus'}, ${match.floor || 'Ground Floor'}. You can view the interactive map in Campus Locator!` })
    }
    return c.json({ response: "You can find all lecture halls, laboratories, the Central Library, and cafeterias pinned on the interactive Campus Locator map." })
  }

  // 10. COMPLAINTS & MAINTENANCE
  if (q.includes('complaint') || q.includes('issue') || q.includes('broken') || q.includes('repair') || q.includes('wifi') || q.includes('wi-fi') || q.includes('internet') || q.includes('water') || q.includes('maintenance')) {
    if (q.includes('wifi') || q.includes('wi-fi') || q.includes('internet') || q.includes('network')) {
      return c.json({ response: CAMPUS_INFO.wifi })
    }

    if (user.role === 'student') {
      // Fixed: use user_id instead of student_id
      const { results } = await db.prepare(`SELECT title, status, category FROM complaints WHERE user_id = ? ORDER BY created_at DESC LIMIT 2`).bind(user.id).all()
      if (results.length > 0) {
        const compList = results.map((r: any) => `"${r.title}" (${r.status})`).join(', ')
        return c.json({ response: `Your recent complaints: ${compList}. To log a new maintenance ticket, open the Complaints section.` })
      }
    }
    return c.json({ response: "To report hostel, Wi-Fi, electrical, or plumbing issues, submit a ticket in the Complaints tab. Campus facility teams track tickets until resolved." })
  }

  // 11. NOTICES & CIRCULARS
  if (q.includes('notice') || q.includes('circular') || q.includes('announcement')) {
    const { results } = await db.prepare(`SELECT title, priority, created_at FROM notices ORDER BY created_at DESC LIMIT 3`).all()
    if (results.length > 0) {
      const list = results.map((n: any) => `"${n.title}" [${n.priority}]`).join(', ')
      return c.json({ response: `Latest campus notices: ${list}. Open the Events & Notices page to read full announcements.` })
    }
    return c.json({ response: "There are no new notices published today. Check back soon for official university updates." })
  }

  // 12. LOST & FOUND
  if (q.includes('lost') || q.includes('found') || q.includes('wallet') || q.includes('id card') || q.includes('keys')) {
    const { results: lost } = await db.prepare(`SELECT item_name, category, location FROM lost_items WHERE status != 'closed' ORDER BY created_at DESC LIMIT 2`).all()
    const { results: found } = await db.prepare(`SELECT item_name, category, location FROM found_items WHERE status != 'closed' ORDER BY created_at DESC LIMIT 2`).all()
    
    let summary = "If you lost or found an item (ID cards, wallets, keys, electronics), check the Lost & Found section to report or claim recovered items."
    if (found.length) {
      summary += ` Recent found items: ${found.map((f: any) => f.item_name + ' at ' + (f.location || 'campus')).join(', ')}.`
    }
    return c.json({ response: summary })
  }

  // 13. EMERGENCY SOS & SECURITY
  if (q.includes('sos') || q.includes('emergency') || q.includes('security') || q.includes('ambulance') || q.includes('police') || q.includes('doctor')) {
    return c.json({
      response: `🚨 EMERGENCY PROTOCOL:
• Instant SOS: Click the red SOS Alert button in the navigation bar to immediately broadcast your location to campus responders.
• Campus Security Gatehouse: 24/7 Hotline Ext. 911 (or visit Main Gate).
• Campus Health Center: Ext. 108 for immediate medical attention and on-campus ambulance dispatch.`
    })
  }

  // 14. EXAM RULES & PREPARATION
  if (q.includes('exam rule') || q.includes('hall ticket') || q.includes('admit card') || q.includes('exam timing') || q.includes('passing mark')) {
    return c.json({ response: CAMPUS_INFO.examRules })
  }

  // 15. CAREER, INTERNSHIP & PLACEMENTS
  if (q.includes('internship') || q.includes('placement') || q.includes('resume') || q.includes('job') || q.includes('interview') || q.includes('career')) {
    return c.json({ response: CAMPUS_INFO.career })
  }

  // 16. STUDY ADVICE & EXAM TIPS
  if (q.includes('feynman')) {
    return c.json({ response: FEYNMAN_TECHNIQUE })
  }
  if (q.includes('pomodoro')) {
    return c.json({ response: POMODORO_TECHNIQUE })
  }
  if (q.includes('study tip') || q.includes('how to study') || q.includes('prepare for exam') || q.includes('exam tips') || q.includes('how to get good marks') || q.includes('study strategy')) {
    return c.json({ response: STUDY_ADVICE })
  }

  // 17. TOPIC EXPLANATIONS ("Explain X", "What is X", "How does X work")
  for (const [key, explanation] of Object.entries(TOPIC_EXPLANATIONS)) {
    if (q.includes(key)) {
      return c.json({ response: explanation })
    }
  }

  if (q.includes('explain') || q.includes('what is') || q.includes('how does') || q.includes('define') || q.includes('tell me about')) {
    const topic = rawQ.replace(/^(can you )?(please )?(explain|what is|how does|define|tell me about)\s+/i, '').replace(/\?$/, '').trim()
    if (topic.length > 2) {
      return c.json({
        response: `"${topic}" is an essential academic subject:
• Overview: It represents a fundamental principle in computing and engineering designed to solve complex system problems.
• Core Mechanism: Always examine the trade-offs between efficiency, memory utilization, and architectural simplicity.
• Study Recommendation: Review the lecture notes in Course Materials and solve sample problem sets to master ${topic}!`
      })
    }
  }

  // 18. STUDY MATERIAL SUMMARIZATION
  if (q.includes('summarize') || q.includes('summary')) {
    return c.json({
      response: `Study Material Revision Summary:
1. Core Concepts: Master basic definitions and architectural constraints first.
2. Code & Algorithms: Memorize asymptotic complexities (O(1), O(log n), O(n), O(n log n)).
3. Edge Cases: Always test empty inputs, boundary values, and off-by-one errors.
4. Exam Technique: Write structured answers with labelled diagrams for maximum faculty credit.`
    })
  }

  // Default helpful smart conversational answer
  return c.json({
    response: `I'm happy to help with your question regarding "${rawQ}". As your campus assistant, I can check your real-time attendance & bunk limit, upcoming assignments, exam marks & CGPA, class calendar, enrolled subjects, campus locations, or explain computer science topics. What would you like to explore?`
  })
})

export default app
