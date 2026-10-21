import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getUser,
  updateUser,
  getSubjects,
  createSubject,
  deleteSubject,
  getTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  getStudyPlans,
  saveStudyPlan,
  updateSessionStatus,
  deleteStudyPlan,
  getQuizAttempts,
  saveQuizAttempt,
  getConversations,
  saveConversation,
  deleteConversation,
  resetToEmpty,
  resetToDemo,
} from './server/db.js';
import {
  chatWithTutor,
  generateStudyPlanWithAI,
  generateQuizWithAI,
  summarizeNotesWithAI,
} from './server/geminiService.js';
import {
  ALEXA_PLUS_TOOLS_MANIFEST,
  executeAlexaTool,
} from './server/alexaPlusTools.js';
import {
  computeTopicAnalytics,
  generateAdaptiveRecommendations,
} from './src/utils/adaptiveEngine.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// -------------------------------------------------------------
// 1. User & Settings API
// -------------------------------------------------------------
app.get('/api/user', (_req: Request, res: Response) => {
  res.json(getUser());
});

app.put('/api/user', (req: Request, res: Response) => {
  const updated = updateUser(req.body);
  res.json(updated);
});

// -------------------------------------------------------------
// 2. Subjects API
// -------------------------------------------------------------
app.get('/api/subjects', (_req: Request, res: Response) => {
  res.json(getSubjects());
});

app.post('/api/subjects', (req: Request, res: Response) => {
  const { name, code, color, icon, examinationDate } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Subject name is required' });
  }
  const created = createSubject({
    userId: 'user_alexa_01',
    name,
    code: code || name.slice(0, 4).toUpperCase(),
    color: color || '#8b5cf6',
    icon: icon || 'BookOpen',
    examinationDate,
  });
  res.status(201).json(created);
});

app.delete('/api/subjects/:id', (req: Request, res: Response) => {
  deleteSubject(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 3. Topics API
// -------------------------------------------------------------
app.get('/api/topics', (req: Request, res: Response) => {
  const subjectId = req.query.subjectId as string | undefined;
  res.json(getTopics(subjectId));
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { subjectId, name, difficulty, confidenceLevel, notes } = req.body;
  if (!name || !subjectId) {
    return res.status(400).json({ error: 'Name and subjectId are required' });
  }
  const created = createTopic({
    subjectId,
    name,
    difficulty: difficulty || 'intermediate',
    confidenceLevel: Number(confidenceLevel) || 3,
    completionStatus: 'not_started',
    notes: notes || '',
  });
  res.status(201).json(created);
});

app.put('/api/topics/:id', (req: Request, res: Response) => {
  const updated = updateTopic(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Topic not found' });
  }
  res.json(updated);
});

app.delete('/api/topics/:id', (req: Request, res: Response) => {
  deleteTopic(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 4. Study Plans API
// -------------------------------------------------------------
app.get(['/api/plans', '/api/study-plans'], (_req: Request, res: Response) => {
  res.json(getStudyPlans());
});

app.get(['/api/plans/:id', '/api/study-plans/:id'], (req: Request, res: Response) => {
  const plan = getStudyPlans().find((p) => p.id === req.params.id);
  if (!plan) return res.status(404).json({ error: 'Study plan not found' });
  res.json(plan);
});

app.post(['/api/plans', '/api/study-plans'], (req: Request, res: Response) => {
  const plan = req.body;
  if (!plan.title || !plan.subjectName || !plan.sessions) {
    return res.status(400).json({ error: 'Invalid study plan payload' });
  }
  const saved = saveStudyPlan({
    userId: 'user_alexa_01',
    title: plan.title,
    subjectId: plan.subjectId,
    subjectName: plan.subjectName,
    examDate: plan.examDate,
    totalHours: Number(plan.totalHours) || 2,
    priorityRationale: plan.priorityRationale,
    sessions: plan.sessions,
  });
  res.status(201).json(saved);
});

app.put('/api/plans/:planId/sessions/:sessionId', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['pending', 'completed', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const session = updateSessionStatus(req.params.planId, req.params.sessionId, status);
  if (!session) {
    return res.status(404).json({ error: 'Session or plan not found' });
  }
  res.json(session);
});

app.patch('/api/study-sessions/:sessionId', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['pending', 'completed', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  // Find plan that contains this session
  const plans = getStudyPlans();
  const plan = plans.find((p) => p.sessions.some((s) => s.id === req.params.sessionId));
  if (!plan) {
    return res.status(404).json({ error: 'Session not found in any study plan' });
  }
  const session = updateSessionStatus(plan.id, req.params.sessionId, status);
  res.json(session);
});

app.delete(['/api/plans/:id', '/api/study-plans/:id'], (req: Request, res: Response) => {
  deleteStudyPlan(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 5. Quiz & Attempts API
// -------------------------------------------------------------
app.get('/api/quizzes/attempts', (req: Request, res: Response) => {
  const topicId = req.query.topicId as string | undefined;
  res.json(getQuizAttempts(topicId));
});

app.post('/api/quizzes/attempts', (req: Request, res: Response) => {
  const attempt = req.body;
  if (!attempt.topicId || typeof attempt.score !== 'number') {
    return res.status(400).json({ error: 'Invalid quiz attempt data' });
  }
  const saved = saveQuizAttempt(attempt);
  res.status(201).json(saved);
});

// -------------------------------------------------------------
// 6. Conversations API
// -------------------------------------------------------------
app.get('/api/conversations', (_req: Request, res: Response) => {
  res.json(getConversations());
});

app.post('/api/conversations', (req: Request, res: Response) => {
  const conv = req.body;
  if (!conv.id || !conv.messages) {
    return res.status(400).json({ error: 'Invalid conversation payload' });
  }
  const saved = saveConversation(conv);
  res.json(saved);
});

app.delete('/api/conversations/:id', (req: Request, res: Response) => {
  deleteConversation(req.params.id);
  res.json({ success: true });
});

// -------------------------------------------------------------
// 7. Analytics & Adaptive Recommendations API
// -------------------------------------------------------------
app.get('/api/analytics', (_req: Request, res: Response) => {
  const user = getUser();
  const subjects = getSubjects();
  const topics = getTopics();
  const attempts = getQuizAttempts();
  const plans = getStudyPlans();
  const allSessions = plans.flatMap((p) => p.sessions);

  const topicAnalytics = computeTopicAnalytics(topics, subjects, attempts, allSessions);
  const recommendations = generateAdaptiveRecommendations(topicAnalytics, subjects, allSessions);

  const strongCount = topicAnalytics.filter((t) => t.status === 'Strong').length;
  const developingCount = topicAnalytics.filter((t) => t.status === 'Developing').length;
  const needsRevisionCount = topicAnalytics.filter((t) => t.status === 'Needs revision').length;
  const noDataCount = topicAnalytics.filter((t) => t.status === 'Not enough data').length;

  res.json({
    user,
    topicAnalytics,
    recommendations,
    summary: {
      totalSubjects: subjects.length,
      totalTopics: topics.length,
      totalQuizAttempts: attempts.length,
      totalPlans: plans.length,
      totalSessions: allSessions.length,
      completedSessions: allSessions.filter((s) => s.status === 'completed').length,
      strongCount,
      developingCount,
      needsRevisionCount,
      noDataCount,
    },
  });
});

// -------------------------------------------------------------
// 8. AI Service Endpoints
// -------------------------------------------------------------
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { messages, subjectName, mode, difficulty } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    const responseText = await chatWithTutor({
      messages,
      subjectName,
      mode,
      difficulty,
    });
    res.json({ content: responseText });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Chat service error' });
  }
});

app.post(['/api/ai/plan', '/api/ai/study-plan'], async (req: Request, res: Response) => {
  try {
    const { subjectName, topics, examDate, hoursPerDay, weakTopics } = req.body;
    if (!subjectName) {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    const plan = await generateStudyPlanWithAI({
      subjectName,
      topics: topics || [],
      examDate,
      hoursPerDay,
      weakTopics,
    });
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Plan generation error' });
  }
});

app.post('/api/ai/quiz', async (req: Request, res: Response) => {
  try {
    const { subjectName, topicName, difficulty, numQuestions, questionType } = req.body;
    if (!topicName) {
      return res.status(400).json({ error: 'Topic name is required' });
    }
    const questions = await generateQuizWithAI({
      subjectName: subjectName || 'General Studies',
      topicName,
      difficulty,
      numQuestions,
      questionType,
    });
    res.json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Quiz generation error' });
  }
});

app.post('/api/ai/summarize-notes', async (req: Request, res: Response) => {
  try {
    const { notesText, subjectName } = req.body;
    if (!notesText || notesText.trim().length === 0) {
      return res.status(400).json({ error: 'Notes text is required' });
    }
    const summary = await summarizeNotesWithAI({
      notesText,
      subjectName: subjectName || 'General Subject',
    });
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Note summarization error' });
  }
});

// Voice Command intent recognition & real tool execution
app.post('/api/ai/voice-command', async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command string is required' });
    }

    const lower = command.toLowerCase().trim();

    // 1. Weak topics query
    if (lower.includes('weak') || lower.includes('weakest') || lower.includes('what should i revise')) {
      const toolRes = await executeAlexaTool('recommend_revision');
      return res.json({
        recognizedIntent: 'recommend_revision',
        speech: toolRes.speechText,
        action: 'SHOW_WEAK_TOPICS',
        data: toolRes.data,
      });
    }

    // 2. Study progress query
    if (lower.includes('how much did i study') || lower.includes('progress') || lower.includes('streak') || lower.includes('hours')) {
      const toolRes = await executeAlexaTool('get_student_progress');
      return res.json({
        recognizedIntent: 'get_student_progress',
        speech: toolRes.speechText,
        action: 'SHOW_ANALYTICS',
        data: toolRes.data,
      });
    }

    // 3. Quiz request
    if (lower.includes('quiz') || lower.includes('test me')) {
      // Extract topic
      let topic = 'A* Search Algorithm';
      if (lower.includes('machine learning')) topic = 'Machine Learning';
      else if (lower.includes('binary search')) topic = 'Binary Search';
      else if (lower.includes('bfs') || lower.includes('breadth first')) topic = 'Breadth-First Search (BFS)';
      else if (lower.includes('dfs') || lower.includes('depth first')) topic = 'Depth-First Search (DFS)';

      const toolRes = await executeAlexaTool('generate_quiz', { topic_name: topic, num_questions: 3 });
      return res.json({
        recognizedIntent: 'generate_quiz',
        speech: toolRes.speechText,
        action: 'START_QUIZ',
        data: toolRes.data,
      });
    }

    // 4. Study plan request
    if (lower.includes('study plan') || lower.includes('plan for tomorrow') || lower.includes('schedule')) {
      let subject = 'Algorithms & Data Structures';
      if (lower.includes('networks') || lower.includes('computer network')) subject = 'Computer Networks';
      else if (lower.includes('machine learning')) subject = 'Machine Learning';

      const toolRes = await executeAlexaTool('create_study_plan', { subject_name: subject, hours_per_day: 2 });
      return res.json({
        recognizedIntent: 'create_study_plan',
        speech: toolRes.speechText,
        action: 'VIEW_PLAN',
        data: toolRes.data,
      });
    }

    // 5. Concept explanation request
    if (lower.includes('explain') || lower.includes('teach me') || lower.includes('what is')) {
      let topic = command.replace(/explain|teach me|what is|studypilot|alexa/gi, '').trim();
      if (!topic) topic = 'A* algorithm';
      const toolRes = await executeAlexaTool('explain_topic', { topic_name: topic });
      return res.json({
        recognizedIntent: 'explain_topic',
        speech: toolRes.speechText,
        action: 'SHOW_EXPLANATION',
        data: toolRes.data,
      });
    }

    // Default conversational reply
    const speech = `I heard: "${command}". You can ask me to create a study plan, explain any concept like binary search, start a quiz, or check your weakest topics.`;
    return res.json({
      recognizedIntent: 'general_query',
      speech,
      action: 'GENERAL_REPLY',
      data: null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Voice command error' });
  }
});

// -------------------------------------------------------------
// 9. Amazon Developer Hackathon 2026 (Alexa+ Track) Tool Endpoints
// -------------------------------------------------------------
app.get('/api/alexa-plus/manifest', (_req: Request, res: Response) => {
  res.json({
    track: 'Alexa+ Track - Amazon Developer Hackathon 2026',
    application: 'StudyPilot AI',
    mcpVersion: '1.0',
    description: 'Autonomous educational companion tools for student planning, adaptive tutoring, diagnostic quizzing, and performance telemetry.',
    tools: ALEXA_PLUS_TOOLS_MANIFEST,
  });
});

app.post('/api/alexa-plus/invoke', async (req: Request, res: Response) => {
  const { tool, arguments: args } = req.body;
  if (!tool) {
    return res.status(400).json({ error: 'Field "tool" is required' });
  }
  const result = await executeAlexaTool(tool, args || {});
  res.json(result);
});

// -------------------------------------------------------------
// 10. Database Reset Controls (for hackathon testing & demo)
// -------------------------------------------------------------
app.post('/api/db/reset-empty', (_req: Request, res: Response) => {
  resetToEmpty();
  res.json({ success: true, message: 'Database reset to empty state.' });
});

app.post('/api/db/reset-demo', (_req: Request, res: Response) => {
  resetToDemo();
  res.json({ success: true, message: 'Database restored to verified demo scenario.' });
});

// -------------------------------------------------------------
// 11. Vite Dev Server / Static Dist Mount
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyPilot AI fullstack server ready on http://0.0.0.0:${PORT}`);
  });
}

startServer();
