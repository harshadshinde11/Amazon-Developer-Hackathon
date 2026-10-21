import fs from 'fs';
import path from 'path';
import {
  UserProfile,
  Subject,
  Topic,
  StudyPlan,
  StudySession,
  QuizAttempt,
  Conversation,
} from '../src/types.js';

interface DatabaseSchema {
  user: UserProfile;
  subjects: Subject[];
  topics: Topic[];
  studyPlans: StudyPlan[];
  quizAttempts: QuizAttempt[];
  conversations: Conversation[];
}

const DATA_DIR = path.resolve(process.env.STUDYPILOT_DATA_DIR || path.join(process.cwd(), 'data'));
const DB_FILE = path.join(DATA_DIR, 'studypilot_db.json');

const INITIAL_USER: UserProfile = {
  id: 'user_alexa_01',
  displayName: 'Harshad',
  email: 'harshad@example.com',
  createdAt: '2026-10-01T08:00:00.000Z',
  streakDays: 4,
  lastStudyDate: '2026-10-20',
  totalStudyHours: 18.5,
  studyHoursThisWeek: 6.5,
  targetExamDate: '2026-11-05',
  preferredHoursPerDay: 2,
  difficultyPreference: 'intermediate',
  soundEnabled: true,
  voiceGender: 'female',
};

// Demo dataset showcasing the prompt's exact scenario:
// BFS: 90%, DFS: 85%, A* Algorithm: 40% (Needs revision)
export const DEMO_DATA: DatabaseSchema = {
  user: {
    ...INITIAL_USER,
    streakDays: 5,
    studyHoursThisWeek: 8.5,
    totalStudyHours: 24,
  },
  subjects: [
    {
      id: 'sub-cs201',
      userId: 'user_alexa_01',
      name: 'Algorithms & Data Structures',
      code: 'CS201',
      color: '#8b5cf6', // purple
      icon: 'Cpu',
      examinationDate: '2026-10-29',
      createdAt: '2026-10-01T09:00:00.000Z',
    },
    {
      id: 'sub-cs305',
      userId: 'user_alexa_01',
      name: 'Computer Networks',
      code: 'CS305',
      color: '#3b82f6', // electric blue
      icon: 'Network',
      examinationDate: '2026-11-12',
      createdAt: '2026-10-05T10:00:00.000Z',
    },
    {
      id: 'sub-cs401',
      userId: 'user_alexa_01',
      name: 'Machine Learning',
      code: 'CS401',
      color: '#10b981', // emerald
      icon: 'Sparkles',
      examinationDate: '2026-11-20',
      createdAt: '2026-10-08T11:00:00.000Z',
    },
  ],
  topics: [
    {
      id: 'top-bfs',
      subjectId: 'sub-cs201',
      name: 'Breadth-First Search (BFS)',
      difficulty: 'intermediate',
      confidenceLevel: 4,
      completionStatus: 'completed',
      notes: 'Queue-based FIFO traversal. Finds shortest path in unweighted graphs. O(V + E) time.',
      createdAt: '2026-10-10T09:00:00.000Z',
    },
    {
      id: 'top-dfs',
      subjectId: 'sub-cs201',
      name: 'Depth-First Search (DFS)',
      difficulty: 'intermediate',
      confidenceLevel: 4,
      completionStatus: 'completed',
      notes: 'Stack/recursion-based traversal. Useful for cycle detection, topological sorting.',
      createdAt: '2026-10-10T09:30:00.000Z',
    },
    {
      id: 'top-astar',
      subjectId: 'sub-cs201',
      name: 'A* Search Algorithm',
      difficulty: 'advanced',
      confidenceLevel: 2,
      completionStatus: 'in_progress',
      notes: 'Heuristic evaluation f(n) = g(n) + h(n). Requires admissible and consistent heuristics.',
      createdAt: '2026-10-12T10:00:00.000Z',
    },
    {
      id: 'top-tcp',
      subjectId: 'sub-cs305',
      name: 'TCP 3-Way Handshake & Flow Control',
      difficulty: 'intermediate',
      confidenceLevel: 3,
      completionStatus: 'in_progress',
      notes: 'SYN, SYN-ACK, ACK. Sliding window protocol for flow control.',
      createdAt: '2026-10-14T11:00:00.000Z',
    },
    {
      id: 'top-ml-eval',
      subjectId: 'sub-cs401',
      name: 'Precision, Recall & ROC-AUC',
      difficulty: 'beginner',
      confidenceLevel: 4,
      completionStatus: 'completed',
      notes: 'Precision = TP / (TP + FP). Recall = TP / (TP + FN). Sensitivity vs specificity.',
      createdAt: '2026-10-15T14:00:00.000Z',
    },
  ],
  studyPlans: [
    {
      id: 'plan-algo-rev',
      userId: 'user_alexa_01',
      title: 'Sprint: Algorithms Exam Prep',
      subjectId: 'sub-cs201',
      subjectName: 'Algorithms & Data Structures',
      examDate: '2026-10-29',
      totalHours: 4.5,
      createdAt: '2026-10-18T10:00:00.000Z',
      priorityRationale: 'High priority because the exam is in 9 days and A* Search scored 40% on recent diagnostics.',
      sessions: [
        {
          id: 'sess-01',
          studyPlanId: 'plan-algo-rev',
          subjectName: 'Algorithms & Data Structures',
          topicName: 'Breadth-First Search (BFS)',
          scheduledDate: '2026-10-19',
          startTime: '09:00',
          durationMinutes: 45,
          status: 'completed',
          learningObjective: 'Review queue state transitions and shortest-path tree properties.',
          recommendedActivity: 'Solve 2 LeetCode Medium BFS matrix problems.',
          revisionTask: 'Compare memory usage between recursive DFS and queue BFS.',
          completedAt: '2026-10-19T09:50:00.000Z',
        },
        {
          id: 'sess-02',
          studyPlanId: 'plan-algo-rev',
          subjectName: 'Algorithms & Data Structures',
          topicName: 'A* Search Algorithm',
          scheduledDate: '2026-10-21',
          startTime: '10:00',
          durationMinutes: 60,
          status: 'pending',
          learningObjective: 'Master admissible heuristics f(n) = g(n) + h(n) and priority queue implementation.',
          recommendedActivity: 'Work through step-by-step 8-puzzle heuristic calculations.',
          revisionTask: 'Retake targeted 5-question A* quiz to push score from 40% to >80%.',
        },
        {
          id: 'sess-03',
          studyPlanId: 'plan-algo-rev',
          subjectName: 'Algorithms & Data Structures',
          topicName: 'Depth-First Search (DFS)',
          scheduledDate: '2026-10-22',
          startTime: '15:30',
          durationMinutes: 45,
          status: 'pending',
          learningObjective: 'Review cycle detection in directed graphs using 3-color marking.',
          recommendedActivity: 'Implement topological sort with Kahn algorithm and DFS.',
          revisionTask: 'Solve 1 graph coloring problem.',
        },
      ],
    },
  ],
  quizAttempts: [
    {
      id: 'attempt-bfs-01',
      userId: 'user_alexa_01',
      subjectId: 'sub-cs201',
      subjectName: 'Algorithms & Data Structures',
      topicId: 'top-bfs',
      topicName: 'Breadth-First Search (BFS)',
      difficulty: 'intermediate',
      score: 9,
      totalQuestions: 10,
      percentage: 90,
      attemptedAt: '2026-10-18T14:30:00.000Z',
      timeSpentSeconds: 240,
      answers: [
        {
          questionId: 'q-bfs-1',
          question: 'What data structure is standardly used to implement BFS?',
          options: ['Stack', 'Queue', 'Priority Queue', 'Binary Search Tree'],
          selectedAnswer: 1,
          correctAnswer: 1,
          isCorrect: true,
          explanation: 'BFS explores neighbor vertices level by level, requiring FIFO ordering provided by a queue.',
        },
      ],
    },
    {
      id: 'attempt-dfs-01',
      userId: 'user_alexa_01',
      subjectId: 'sub-cs201',
      subjectName: 'Algorithms & Data Structures',
      topicId: 'top-dfs',
      topicName: 'Depth-First Search (DFS)',
      difficulty: 'intermediate',
      score: 8.5,
      totalQuestions: 10,
      percentage: 85,
      attemptedAt: '2026-10-18T16:00:00.000Z',
      timeSpentSeconds: 210,
      answers: [],
    },
    {
      id: 'attempt-astar-01',
      userId: 'user_alexa_01',
      subjectId: 'sub-cs201',
      subjectName: 'Algorithms & Data Structures',
      topicId: 'top-astar',
      topicName: 'A* Search Algorithm',
      difficulty: 'advanced',
      score: 4,
      totalQuestions: 10,
      percentage: 40,
      attemptedAt: '2026-10-19T11:20:00.000Z',
      timeSpentSeconds: 310,
      answers: [
        {
          questionId: 'q-astar-1',
          question: 'In A* search, what condition guarantees that the algorithm finds the optimal path when using tree search?',
          options: [
            'Heuristic must be non-negative only',
            'Heuristic h(n) must be admissible (never overestimate true cost)',
            'Heuristic must strictly equal true remaining cost',
            'Heuristic must overestimate by at most 10%'
          ],
          selectedAnswer: 0,
          correctAnswer: 1,
          isCorrect: false,
          explanation: 'An admissible heuristic never overestimates the true cost to reach the goal. Admissibility guarantees optimality for tree search.',
          commonMistakes: 'Students often confuse non-negative heuristics with admissible heuristics.'
        },
      ],
    },
  ],
  conversations: [
    {
      id: 'conv-01',
      userId: 'user_alexa_01',
      title: 'A* Search & Heuristics Breakdown',
      subjectId: 'sub-cs201',
      subjectName: 'Algorithms & Data Structures',
      createdAt: '2026-10-19T11:30:00.000Z',
      updatedAt: '2026-10-19T11:35:00.000Z',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Explain why my quiz answer on A* admissibility was incorrect.',
          timestamp: '2026-10-19T11:30:00.000Z',
          mode: 'simple',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: `### Why Your Answer Was Incorrect\n\nYou selected that the heuristic only needs to be non-negative. While heuristics are typically non-negative ($h(n) \\ge 0$), this alone does **not** guarantee an optimal path.\n\n#### The Rule: Admissibility\n- A heuristic $h(n)$ is **admissible** if it **never overestimates** the actual cost from node $n$ to the goal:\n  $$h(n) \\le h^*(n)$$\n- If $h(n)$ overestimates the cost, A* might incorrectly abandon the true shortest path because it mistakenly thinks that route is more expensive than it really is!\n\n#### Key Formula\n$$f(n) = g(n) + h(n)$$\n- $g(n)$: Exact cost incurred so far from start to $n$.\n- $h(n)$: Estimated cost from $n$ to goal.\n\n*Study Tip:* Remember the analogy of GPS navigation—an admissible heuristic always estimates the straight-line bird's-eye distance, which can never exceed the actual road distance.`,
          timestamp: '2026-10-19T11:30:05.000Z',
          mode: 'simple',
        },
      ],
    },
  ],
};

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function readDb(): DatabaseSchema {
  ensureDirSync(DATA_DIR);
  if (!fs.existsSync(DB_FILE)) {
    // Write demo data by default so the app is immediately useful and demonstrative
    fs.writeFileSync(DB_FILE, JSON.stringify(DEMO_DATA, null, 2), 'utf-8');
    return DEMO_DATA;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database, restoring demo data:', err);
    fs.writeFileSync(DB_FILE, JSON.stringify(DEMO_DATA, null, 2), 'utf-8');
    return DEMO_DATA;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDirSync(DATA_DIR);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// User Helpers
export function getUser(): UserProfile {
  return readDb().user;
}

export function updateUser(partial: Partial<UserProfile>): UserProfile {
  const db = readDb();
  db.user = { ...db.user, ...partial };
  writeDb(db);
  return db.user;
}

// Subject Helpers
export function getSubjects(): Subject[] {
  return readDb().subjects;
}

export function createSubject(subject: Omit<Subject, 'id' | 'createdAt'>): Subject {
  const db = readDb();
  const newSub: Subject = {
    ...subject,
    id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  db.subjects.push(newSub);
  writeDb(db);
  return newSub;
}

export function deleteSubject(subjectId: string): boolean {
  const db = readDb();
  db.subjects = db.subjects.filter((s) => s.id !== subjectId);
  db.topics = db.topics.filter((t) => t.subjectId !== subjectId);
  writeDb(db);
  return true;
}

// Topic Helpers
export function getTopics(subjectId?: string): Topic[] {
  const db = readDb();
  if (subjectId) {
    return db.topics.filter((t) => t.subjectId === subjectId);
  }
  return db.topics;
}

export function createTopic(topic: Omit<Topic, 'id' | 'createdAt'>): Topic {
  const db = readDb();
  const newTopic: Topic = {
    ...topic,
    id: `top_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  db.topics.push(newTopic);
  writeDb(db);
  return newTopic;
}

export function updateTopic(topicId: string, partial: Partial<Topic>): Topic | null {
  const db = readDb();
  const idx = db.topics.findIndex((t) => t.id === topicId);
  if (idx === -1) return null;
  db.topics[idx] = { ...db.topics[idx], ...partial };
  writeDb(db);
  return db.topics[idx];
}

export function deleteTopic(topicId: string): boolean {
  const db = readDb();
  db.topics = db.topics.filter((t) => t.id !== topicId);
  writeDb(db);
  return true;
}

// Study Plan Helpers
export function getStudyPlans(): StudyPlan[] {
  return readDb().studyPlans;
}

export function saveStudyPlan(plan: Omit<StudyPlan, 'id' | 'createdAt'>): StudyPlan {
  const db = readDb();
  const newPlan: StudyPlan = {
    ...plan,
    id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  db.studyPlans.unshift(newPlan);
  writeDb(db);
  return newPlan;
}

export function updateSessionStatus(
  planId: string,
  sessionId: string,
  status: 'pending' | 'completed' | 'skipped'
): StudySession | null {
  const db = readDb();
  const plan = db.studyPlans.find((p) => p.id === planId);
  if (!plan) return null;
  const session = plan.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const wasCompleted = session.status === 'completed';
  session.status = status;
  if (status === 'completed' && !wasCompleted) {
    session.completedAt = new Date().toISOString();
    // Increment study time for user
    db.user.studyHoursThisWeek = Math.round((db.user.studyHoursThisWeek + session.durationMinutes / 60) * 10) / 10;
    db.user.totalStudyHours = Math.round((db.user.totalStudyHours + session.durationMinutes / 60) * 10) / 10;
  }
  writeDb(db);
  return session;
}

export function deleteStudyPlan(planId: string): boolean {
  const db = readDb();
  db.studyPlans = db.studyPlans.filter((p) => p.id !== planId);
  writeDb(db);
  return true;
}

// Quiz Attempts Helpers
export function getQuizAttempts(topicId?: string): QuizAttempt[] {
  const db = readDb();
  if (topicId) {
    return db.quizAttempts.filter((q) => q.topicId === topicId);
  }
  return db.quizAttempts;
}

export function saveQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'attemptedAt'>): QuizAttempt {
  const db = readDb();
  const newAttempt: QuizAttempt = {
    ...attempt,
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    attemptedAt: new Date().toISOString(),
  };
  db.quizAttempts.unshift(newAttempt);

  // If score is high (>=80%), mark topic in progress/completed if not already
  if (attempt.percentage >= 80) {
    const topic = db.topics.find((t) => t.id === attempt.topicId);
    if (topic && topic.completionStatus === 'not_started') {
      topic.completionStatus = 'in_progress';
    }
  }

  writeDb(db);
  return newAttempt;
}

// Conversation Helpers
export function getConversations(): Conversation[] {
  return readDb().conversations;
}

export function saveConversation(conv: Conversation): Conversation {
  const db = readDb();
  const idx = db.conversations.findIndex((c) => c.id === conv.id);
  if (idx >= 0) {
    db.conversations[idx] = conv;
  } else {
    db.conversations.unshift(conv);
  }
  writeDb(db);
  return conv;
}

export function deleteConversation(id: string): boolean {
  const db = readDb();
  db.conversations = db.conversations.filter((c) => c.id !== id);
  writeDb(db);
  return true;
}

// Database state resets
export function resetToEmpty(): void {
  const emptyDb: DatabaseSchema = {
    user: INITIAL_USER,
    subjects: [],
    topics: [],
    studyPlans: [],
    quizAttempts: [],
    conversations: [],
  };
  writeDb(emptyDb);
}

export function resetToDemo(): void {
  writeDb(DEMO_DATA);
}
