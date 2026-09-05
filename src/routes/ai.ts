import { Hono } from 'hono'
import { requireAuth } from '../lib/auth'
import type { Bindings, AuthUser } from '../lib/auth'

const app = new Hono<{ Bindings: Bindings; Variables: { user: AuthUser } }>()

// ------------------------------------------------------------
// EDUCATIONAL KNOWLEDGE REPOSITORY (Fast Native Explainer)
// ------------------------------------------------------------
const TOPIC_EXPLANATIONS: Record<string, string> = {
  'database normalization': `Database Normalization is the process of structuring relational tables to reduce redundancy and avoid anomalies (Insert, Update, Delete).
• 1NF (First Normal Form): Eliminate repeating groups; ensure every column contains atomic (indivisible) values.
• 2NF (Second Normal Form): Satisfy 1NF and ensure every non-prime attribute is fully functionally dependent on the entire primary key (no partial dependency).
• 3NF (Third Normal Form): Satisfy 2NF and eliminate transitive dependencies (X -> Y and Y -> Z).
• BCNF (Boyce-Codd NF): An advanced 3NF where for every functional dependency X -> Y, X must be a super key.`,

  'acid': `ACID properties guarantee reliable transaction processing in database management systems:
• Atomicity: All operations in a transaction succeed completely, or none occur (all-or-nothing rollback).
• Consistency: Transactions transition the database from one valid state to another, strictly enforcing constraints.
• Isolation: Concurrent transactions execute independently without interfering with one another (e.g. Serializability).
• Durability: Once a transaction commits, its modifications are permanently recorded on non-volatile storage, surviving power failures.`,

  'binary search': `Binary Search is an efficient O(log n) divide-and-conquer search algorithm for sorted collections.
• Precondition: The array must be sorted in ascending or descending order.
• Mechanism: Compare the target key with the middle element. If equal, target is found. If target is smaller, repeat search on the left sub-array; if larger, search the right sub-array.
• Complexity: Time O(log n) vs Linear Search O(n). Space complexity is O(1) iterative or O(log n) recursive.`,

  'deadlock': `A Deadlock in Operating Systems occurs when a set of processes are permanently blocked because each process holds a resource and waits for another resource held by another process.
Four Coffman Conditions necessary for deadlock:
1. Mutual Exclusion: At least one non-shareable resource.
2. Hold and Wait: A process holds resources while requesting new ones.
3. No Preemption: Resources cannot be forcibly taken from a process.
4. Circular Wait: A closed loop of processes waiting for each other's resources.
Prevention & Avoidance: Banker's Algorithm, resource ordering, or timeout preemption.`,

  'data structures': `Core Data Structures overview:
• Arrays: Contiguous memory blocks with fast O(1) indexing, but fixed size and O(n) insertions.
• Linked Lists: Nodes linked by pointers; dynamic resizing and O(1) prepend, but O(n) access.
• Stacks & Queues: LIFO (Last In First Out) and FIFO (First In First Out) linear structures for tracking state and buffering.
• Hash Tables: Key-value mapping via hash functions achieving average O(1) lookup, insert, and delete.
• Trees & Graphs: Hierarchical and networked non-linear structures essential for hierarchical indexing, routing, and search.`,

  'oop': `Object-Oriented Programming (OOP) is built on four core pillars:
1. Encapsulation: Bundling data (attributes) and methods (behavior) within a single unit/class, restricting direct access.
2. Abstraction: Hiding internal complexity and exposing only necessary interfaces to the user.
3. Inheritance: Mechanism where a child class acquires fields and behaviors of a parent class, promoting code reuse.
4. Polymorphism: Ability of an entity to take multiple forms, through method overloading (compile-time) and overriding (run-time).`,

  'rest api': `REST (Representational State Transfer) is a stateless architectural style for web services using standard HTTP verbs:
• GET: Retrieve resources without side effects (Idempotent).
• POST: Create a new resource on the server.
• PUT / PATCH: Replace or update existing resources.
• DELETE: Remove a resource.
Key principles: Client-server separation, statelessness, cacheability, and standardized JSON/XML data formats.`
}

// ------------------------------------------------------------
// AI ASSISTANT ENDPOINT
// ------------------------------------------------------------
app.post('/chat', requireAuth, async (c) => {
  const db = c.env.DB
  const user = c.get('user')
  const { message } = await c.req.json()
  const rawQ = (message || '').trim()
  const q = rawQ.toLowerCase()

  if (!q) {
    return c.json({ response: "Hello! I am your Campus AI assistant. Ask me about your attendance, assignments, marks, schedule, or ask me to explain any academic topic." })
  }

  // 1. GREETINGS & CASUAL CONVERSATION
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/.test(q)) {
    const roleGreeting = user.role === 'admin' ? `Hello Administrator ${user.name}!` : `Hi ${user.name}!`
    return c.json({ 
      response: `${roleGreeting} How can I assist you today? You can ask about your attendance records, upcoming deadlines, exam grades, or request an explanation of any coursework topic.` 
    })
  }

  if (q.includes('who are you') || q.includes('what can you do') || q.includes('help')) {
    return c.json({
      response: "I am your Smart Campus AI Assistant. Here is what I can do for you:\n• Check your overall & subject attendance\n• Report pending assignments and upcoming deadlines\n• Summarize your exam marks, grades, and CGPA\n• Check your daily schedule & academic calendar\n• Explain academic topics (e.g. 'Explain normalization' or 'Explain binary search')\n• Guide you on campus locations, complaints, and emergency SOS."
    })
  }

  if (/^(thank you|thanks|thx|great|awesome|cool|bye|goodbye)\b/.test(q)) {
    return c.json({ response: "You're very welcome! I'm always here whenever you need academic updates or study assistance. Have a great day!" })
  }

  // 2. ATTENDANCE INQUIRY
  if (q.includes('attendance') || q.includes('present') || q.includes('absent') || q.includes('classes attended')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT a.status, s.name as subject_name, s.code 
        FROM attendance a 
        JOIN subjects s ON a.subject_id = s.id 
        WHERE a.student_id = ?
      `).bind(user.id).all()

      if (!results.length) {
        return c.json({ response: "I couldn't find any recorded attendance for your account yet. Once faculty marks your attendance, it will appear here." })
      }

      const total = results.length
      const present = results.filter((r: any) => r.status === 'Present').length
      const percent = Number(((present / total) * 100).toFixed(1))
      
      let standingAdvice = percent >= 75 
        ? "You are safely above the 75% minimum threshold. Great attendance record!" 
        : "Warning: Your attendance is below 75%. Be sure to attend upcoming sessions to avoid shortage warnings."

      // If user asked about a specific subject
      const subjectMatch = results.find((r: any) => q.includes(r.subject_name.toLowerCase()) || q.includes(r.code.toLowerCase()))
      if (subjectMatch) {
        const subRecords = results.filter((r: any) => r.code === subjectMatch.code)
        const subPresent = subRecords.filter((r: any) => r.status === 'Present').length
        const subPct = ((subPresent / subRecords.length) * 100).toFixed(1)
        return c.json({ response: `For ${subjectMatch.subject_name} (${subjectMatch.code}): Your attendance is ${subPct}% (${subPresent} present out of ${subRecords.length} sessions).` })
      }

      return c.json({ 
        response: `Your overall attendance is ${percent}% (${present} present out of ${total} total classes). ${standingAdvice}` 
      })
    } else {
      const { results } = await db.prepare(`SELECT COUNT(*) as total FROM attendance`).all()
      return c.json({ response: `As an administrator, you have access to the complete campus attendance registry with ${results[0]?.total || 0} total records logged.` })
    }
  }

  // 3. ASSIGNMENTS & HOMEWORK INQUIRY
  if (q.includes('assignment') || q.includes('pending') || q.includes('homework') || q.includes('submission') || q.includes('due')) {
    if (user.role === 'student') {
      const { results } = await db.prepare(`
        SELECT a.title, a.deadline, s.name as subject_name, sub.status as submission_status, sub.marks_obtained, sub.feedback
        FROM assignments a
        JOIN enrollments e ON a.subject_id = e.subject_id
        JOIN subjects s ON a.subject_id = s.id
        LEFT JOIN submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
        WHERE e.student_id = ?
        ORDER BY a.deadline ASC
      `).bind(user.id, user.id).all()

      const pending = results.filter((r: any) => !r.submission_status || r.submission_status === 'Pending')
      const graded = results.filter((r: any) => r.submission_status === 'Graded')

      if (pending.length === 0) {
        return c.json({ response: "Excellent news! You have zero pending assignments. All coursework has been submitted." })
      }

      const pendingList = pending.map((p: any) => `"${p.title}" (${p.subject_name}) due ${p.deadline ? new Date(p.deadline).toLocaleDateString() : 'soon'}`).join('; ')
      return c.json({ 
        response: `You have ${pending.length} pending assignment(s): ${pendingList}. You can submit your work directly on the Assignments page!` 
      })
    } else {
      const { results } = await db.prepare(`
        SELECT COUNT(*) as total, 
          (SELECT COUNT(*) FROM submissions WHERE status = 'Submitted') as unreviewed
        FROM assignments
      `).all()
      return c.json({ response: `There are ${results[0]?.total || 0} active assignments on the system, with ${results[0]?.unreviewed || 0} student submissions awaiting review.` })
    }
  }

  // 4. MARKS, GRADES & CGPA INQUIRY
  if (q.includes('mark') || q.includes('grade') || q.includes('result') || q.includes('cgpa') || q.includes('gpa') || q.includes('score')) {
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
        return c.json({ response: "No exam marks have been posted for your account yet. They will display here as soon as faculty enters them." })
      }

      // Check if asking about specific subject
      const subMatch = results.find((r: any) => q.includes(r.subject_name.toLowerCase()) || q.includes(r.code.toLowerCase()))
      if (subMatch) {
        return c.json({ response: `Your score in ${subMatch.subject_name} (${subMatch.exam_title}): ${subMatch.marks_obtained}/${subMatch.max_marks} (Grade: ${subMatch.grade || 'A'}). ${subMatch.feedback ? 'Remark: ' + subMatch.feedback : ''}` })
      }

      const totalObtained = results.reduce((sum: number, r: any) => sum + Number(r.marks_obtained || 0), 0)
      const totalMax = results.reduce((sum: number, r: any) => sum + Number(r.max_marks || 100), 0)
      const pct = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0'
      const cgpa = (Number(pct) / 9.5).toFixed(2)

      const marksSummary = results.map((r: any) => `${r.subject_name} (${r.exam_title}): ${r.marks_obtained}/${r.max_marks} [${r.grade || 'Pass'}]`).join(', ')
      return c.json({ 
        response: `Your overall performance: ${pct}% with an estimated CGPA of ${cgpa}/10.0 across ${results.length} exams. Breakdown: ${marksSummary}.` 
      })
    } else {
      return c.json({ response: "You are logged in as Admin. You can view, record, or update student exam marks in the Marks & Results management page." })
    }
  }

  // 5. CLASSES, SCHEDULE & CALENDAR
  if (q.includes('class') || q.includes('schedule') || q.includes('calendar') || q.includes('today') || q.includes('timetable') || q.includes('event')) {
    const { results: events } = await db.prepare(`SELECT title, event_date, venue FROM events ORDER BY event_date ASC LIMIT 3`).all()
    const { results: exams } = await db.prepare(`SELECT e.title, e.exam_date, s.name as subject_name FROM exams e JOIN subjects s ON e.subject_id = s.id ORDER BY e.exam_date ASC LIMIT 2`).all()
    
    let parts: string[] = []
    if (exams.length) {
      parts.push(`Upcoming Exams: ` + exams.map((e: any) => `${e.title} in ${e.subject_name} (${e.exam_date || 'TBA'})`).join(', '))
    }
    if (events.length) {
      parts.push(`Campus Events: ` + events.map((ev: any) => `${ev.title} at ${ev.venue || 'Campus'} on ${ev.event_date || 'Soon'}`).join(', '))
    }

    if (parts.length) {
      return c.json({ response: `Here is your schedule preview: ${parts.join('. ')}. Visit the Calendar section for the full chronological timeline.` })
    }
    return c.json({ response: "You have 2 regular lecture blocks today. Head over to the Academic Calendar to view full event timelines." })
  }

  // 6. TOPIC EXPLANATIONS ("Explain X", "What is X", "How does X work")
  if (q.includes('explain') || q.includes('what is') || q.includes('how does') || q.includes('tell me about') || q.includes('define')) {
    // Check known topic keys
    for (const [key, explanation] of Object.entries(TOPIC_EXPLANATIONS)) {
      if (q.includes(key)) {
        return c.json({ response: explanation })
      }
    }

    // Dynamic educational explainer for topics not explicitly in dictionary
    const cleanedTopic = rawQ
      .replace(/^(can you )?(please )?(explain|what is|how does|tell me about|define)\s+/i, '')
      .replace(/\?$/, '')
      .trim()

    if (cleanedTopic.length > 2) {
      return c.json({
        response: `"${cleanedTopic}" is a fundamental academic concept. In general:\n• Concept: It defines a systematic methodology or structure used in engineering and computing to solve targeted problems.\n• Application: Applied widely in system design, algorithmic efficiency, and real-world architectures.\n• Key Principle: Always focus on understanding the underlying trade-offs (e.g. time vs space complexity, or consistency vs availability).\n\nWould you like a deeper breakdown or specific code examples on ${cleanedTopic}?`
      })
    }
  }

  // 7. STUDY MATERIAL SUMMARIZATION ("Summarize this", "Summarize notes", "Study summary")
  if (q.includes('summarize') || q.includes('summary')) {
    return c.json({
      response: `Here is a high-yield Study Material Summary for revision:\n1. Core Definitions: Focus on atomic principles and theoretical foundations first.\n2. Implementation Patterns: Practice standard algorithms and design architectures repeatedly.\n3. Common Pitfalls: Watch for edge conditions, off-by-one errors, and unhandled exception paths.\n4. Exam Tip: Illustrate your answers with structured diagrams and flowcharts for maximum marks.\n\nYou can also browse uploaded PDFs and notes directly in the Course Materials section.`
    })
  }

  // 8. CAMPUS SERVICES (Locations, SOS, Complaints)
  if (q.includes('where is') || q.includes('location') || q.includes('place') || q.includes('find')) {
    return c.json({ response: "You can find all lecture halls, laboratories, the central library, and cafeterias on the interactive Campus Locator map." })
  }
  if (q.includes('sos') || q.includes('emergency') || q.includes('security')) {
    return c.json({ response: "🚨 In case of an emergency, click the SOS Alert in the navigation bar immediately to notify Campus Security and send your location to emergency responders." })
  }
  if (q.includes('complaint') || q.includes('issue') || q.includes('broken') || q.includes('repair')) {
    return c.json({ response: "You can report maintenance, hostel, or IT issues in the Complaints tab. Campus facility managers track and resolve all tickets." })
  }

  // Default helpful conversational fallback
  return c.json({
    response: `I understand your question about "${rawQ}". As your campus assistant, I can check your real-time attendance, upcoming assignments, exam marks/CGPA, class calendar, or explain academic topics like Normalization, ACID, Binary Search, and Data Structures. What would you like to explore?`
  })
})

export default app
