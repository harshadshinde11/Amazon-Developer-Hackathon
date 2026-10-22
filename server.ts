import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  getUser,
  updateUser,
  getSubjects,
  createSubject,
  updateSubject,
  archiveSubject,
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
  registerQuizForEvaluation,
  routeStudyAssistantRequest,
} from './server/alexaPlusTools.js';
import {
  computeTopicAnalytics,
  generateAdaptiveRecommendations,
} from './src/utils/adaptiveEngine.js';
import { createSubjectStudyPlan } from './server/subjectPlanService.js';

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
  if (req.body.activeSubjectId !== undefined) {
    const activeSubject = getSubjects().find((subject) => subject.id === req.body.activeSubjectId && !subject.archivedAt);
    if (!activeSubject) return res.status(400).json({ error: 'activeSubjectId must reference a saved, active subject' });
  }
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
  const { name, code, color, icon, examinationDate, starterTopics } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) {
    return res.status(400).json({ error: 'Subject name is required and must be 80 characters or fewer' });
  }
  if (examinationDate !== undefined && (typeof examinationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(examinationDate) || Number.isNaN(Date.parse(`${examinationDate}T00:00:00Z`)))) {
    return res.status(400).json({ error: 'Examination date must use YYYY-MM-DD format' });
  }
  if (starterTopics !== undefined && (!Array.isArray(starterTopics) || starterTopics.length > 20 || !starterTopics.every((topic) => typeof topic === 'string' && topic.trim().length > 0 && topic.trim().length <= 100))) {
    return res.status(400).json({ error: 'starterTopics must be up to 20 non-empty topic names of 100 characters or fewer' });
  }
  try {
    const created = createSubject({
      userId: getUser().id,
      name: name.trim(),
      code: typeof code === 'string' && code.trim() ? code.trim().slice(0, 20) : name.trim().slice(0, 4).toUpperCase(),
      color: typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#8b5cf6',
      icon: typeof icon === 'string' ? icon.slice(0, 40) : 'BookOpen',
      examinationDate,
    });
    for (const topicName of new Set<string>(((starterTopics as string[] | undefined) || []).map((topic) => topic.trim()))) {
      createTopic({
        subjectId: created.id,
        name: topicName,
        difficulty: 'intermediate',
        confidenceLevel: 3,
        completionStatus: 'not_started',
        notes: 'Starter topic suggestion; verify against your course materials.',
      });
    }
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) return res.status(409).json({ error: err.message });
    throw err;
  }
});

app.put('/api/subjects/:id', (req: Request, res: Response) => {
  const partial: Record<string, unknown> = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 80) {
      return res.status(400).json({ error: 'Subject name is required and must be 80 characters or fewer' });
    }
    partial.name = req.body.name.trim();
  }
  if (req.body.code !== undefined) {
    if (typeof req.body.code !== 'string' || req.body.code.trim().length > 20) return res.status(400).json({ error: 'Course code must be 20 characters or fewer' });
    partial.code = req.body.code.trim();
  }
  if (req.body.examinationDate !== undefined) {
    if (req.body.examinationDate !== '' && (typeof req.body.examinationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(req.body.examinationDate) || Number.isNaN(Date.parse(`${req.body.examinationDate}T00:00:00Z`)))) {
      return res.status(400).json({ error: 'Examination date must use YYYY-MM-DD format' });
    }
    partial.examinationDate = req.body.examinationDate || undefined;
  }
  try {
    const updated = updateSubject(req.params.id, partial);
    if (!updated) return res.status(404).json({ error: 'Subject not found' });
    res.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) return res.status(409).json({ error: err.message });
    throw err;
  }
});

app.patch('/api/subjects/:id/archive', (req: Request, res: Response) => {
  if (typeof req.body.archived !== 'boolean') return res.status(400).json({ error: 'archived must be a boolean' });
  const subject = archiveSubject(req.params.id, req.body.archived);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  res.json(subject);
});

app.delete('/api/subjects/:id', (req: Request, res: Response) => {
  const deleted = deleteSubject(req.params.id);
  if (!deleted) {
    const exists = getSubjects().some((subject) => subject.id === req.params.id);
    return exists
      ? res.status(409).json({ error: 'Subject has saved history. Archive it to preserve progress.' })
      : res.status(404).json({ error: 'Subject not found' });
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// 3. Topics API
// -------------------------------------------------------------
app.get('/api/topics', (req: Request, res: Response) => {
  const subjectId = req.query.subjectId as string | undefined;
  if (subjectId && !getSubjects().some((subject) => subject.id === subjectId)) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  res.json(getTopics(subjectId));
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { subjectId, name, difficulty, confidenceLevel, notes } = req.body;
  if (!name || !subjectId) {
    return res.status(400).json({ error: 'Name and subjectId are required' });
  }
  const subject = getSubjects().find((item) => item.id === subjectId && !item.archivedAt);
  if (!subject) return res.status(404).json({ error: 'Active subject not found' });
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ error: 'Topic name is required and must be 100 characters or fewer' });
  }
  if (getTopics(subjectId).some((topic) => topic.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    return res.status(409).json({ error: 'A topic with this name already exists in the subject' });
  }
  if (difficulty && !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    return res.status(400).json({ error: 'Invalid topic difficulty' });
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
  const existing = getTopics().find((topic) => topic.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Topic not found' });
  if (req.body.subjectId !== undefined && req.body.subjectId !== existing.subjectId) {
    return res.status(400).json({ error: 'Topics cannot be moved between subjects through this endpoint' });
  }
  if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim() || getTopics(existing.subjectId).some((topic) => topic.id !== existing.id && topic.name.trim().toLowerCase() === req.body.name.trim().toLowerCase()))) {
    return res.status(409).json({ error: 'Topic name is empty or already exists in this subject' });
  }
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
  const subjectId = _req.query.subjectId as string | undefined;
  if (subjectId && !getSubjects().some((subject) => subject.id === subjectId)) return res.status(404).json({ error: 'Subject not found' });
  res.json(getStudyPlans().filter((plan) => !subjectId || plan.subjectId === subjectId));
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
  const subject = typeof plan.subjectId === 'string' ? getSubjects().find((item) => item.id === plan.subjectId && !item.archivedAt) : undefined;
  if (!subject) return res.status(404).json({ error: 'A saved active subjectId is required for a study plan' });
  if (plan.subjectName !== subject.name) return res.status(400).json({ error: 'subjectName must match the saved subjectId' });
  if (!Array.isArray(plan.sessions) || plan.sessions.some((session: any) =>
    !session || typeof session.topicName !== 'string' || !getTopics(subject.id).some((topic) => topic.name === session.topicName)
  )) return res.status(400).json({ error: 'Every plan session must reference a topic saved under this subject' });
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

  app.post('/api/plans/generate', async (req: Request, res: Response) => {
    try {
      const plan = await createSubjectStudyPlan({
        subjectIds: req.body.subjectIds,
        examDate: req.body.examDate,
        hoursPerDay: req.body.hoursPerDay,
      });
      res.status(201).json(plan);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Could not generate a subject study plan.' });
    }
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
  const subjectId = req.query.subjectId as string | undefined;
  if (subjectId && !getSubjects().some((subject) => subject.id === subjectId)) return res.status(404).json({ error: 'Subject not found' });
  if (topicId && !getTopics(subjectId).some((topic) => topic.id === topicId)) return res.status(404).json({ error: 'Topic not found in the requested subject' });
  res.json(getQuizAttempts(topicId, subjectId));
});

app.post('/api/quizzes/attempts', (req: Request, res: Response) => {
  const attempt = req.body;
  if (!attempt.topicId || typeof attempt.subjectId !== 'string' || typeof attempt.score !== 'number') {
    return res.status(400).json({ error: 'Invalid quiz attempt data' });
  }
  const topic = getTopics(attempt.subjectId).find((item) => item.id === attempt.topicId);
  const subject = getSubjects().find((item) => item.id === attempt.subjectId && !item.archivedAt);
  if (!subject || !topic) return res.status(400).json({ error: 'Quiz topic and subject IDs do not match a saved active subject' });
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
  const subjectId = _req.query.subjectId as string | undefined;
  if (subjectId && !getSubjects().some((subject) => subject.id === subjectId)) return res.status(404).json({ error: 'Subject not found' });
  const subjects = getSubjects().filter((subject) => !subjectId || subject.id === subjectId);
  const topics = getTopics(subjectId);
  const attempts = getQuizAttempts(undefined, subjectId);
  const plans = getStudyPlans().filter((plan) => !subjectId || plan.subjectId === subjectId || plan.subjectIds?.includes(subjectId));
  const allSessions = plans.flatMap((plan) => plan.sessions)
    .filter((session) => !subjectId || session.subjectId === subjectId);

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
    const { messages, subjectId, subjectName, topicId, topicName, mode, difficulty } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    const subject = typeof subjectId === 'string'
      ? getSubjects().find((item) => item.id === subjectId && !item.archivedAt)
      : getSubjects().find((item) => item.name === subjectName && !item.archivedAt);
    if ((subjectId !== undefined || subjectName !== undefined) && !subject) {
      return res.status(400).json({ error: 'Selected subject is not saved and active' });
    }
    if (subject && subjectName !== undefined && subject.name !== subjectName) {
      return res.status(400).json({ error: 'Selected subject ID and name do not match' });
    }
    const topic = typeof topicId === 'string'
      ? getTopics(subject?.id).find((item) => item.id === topicId)
      : typeof topicName === 'string'
        ? getTopics(subject?.id).find((item) => item.name === topicName)
        : undefined;
    if ((topicId !== undefined || topicName !== undefined) && (!subject || !topic)) {
      return res.status(400).json({ error: 'Selected topic does not belong to the selected subject' });
    }
    if (topic && topicName !== undefined && topic.name !== topicName) {
      return res.status(400).json({ error: 'Selected topic ID and name do not match' });
    }
    const responseText = await chatWithTutor({
      messages,
      subjectName: subject?.name,
      topicName: topic?.name,
      mode,
      difficulty,
    });
    res.json({ content: responseText });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Chat service error' });
  }
});

app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  try {
    const { message, history, subjectId, subjectName, topicId, topicName, mode, difficulty, pendingTool } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty message is required' });
    }
    if (history !== undefined && (!Array.isArray(history) || history.length > 20 || history.some((entry) =>
      !entry || !['user', 'assistant'].includes(entry.role) || typeof entry.content !== 'string' || entry.content.length > 5000))) {
      return res.status(400).json({ error: 'History must contain at most 20 valid messages of up to 5,000 characters each' });
    }
    const selectedSubject = typeof subjectId === 'string'
      ? getSubjects().find((subject) => subject.id === subjectId && !subject.archivedAt)
      : typeof subjectName === 'string'
        ? getSubjects().find((subject) => subject.name === subjectName && !subject.archivedAt)
        : undefined;
    if ((subjectId !== undefined || subjectName !== undefined) && !selectedSubject) return res.status(400).json({ error: 'Selected subject is not saved and active' });
    if (selectedSubject && subjectName !== undefined && selectedSubject.name !== subjectName) {
      return res.status(400).json({ error: 'Selected subject ID and name do not match' });
    }
    const selectedTopic = typeof topicId === 'string'
      ? getTopics(selectedSubject?.id).find((topic) => topic.id === topicId)
      : typeof topicName === 'string'
        ? getTopics(selectedSubject?.id).find((topic) => topic.name === topicName)
        : undefined;
    if ((topicId !== undefined || topicName !== undefined) && (!selectedSubject || !selectedTopic)) {
      return res.status(400).json({ error: 'Selected topic does not belong to the selected subject' });
    }
    if (selectedTopic && topicName !== undefined && selectedTopic.name !== topicName) {
      return res.status(400).json({ error: 'Selected topic ID and name do not match' });
    }
    const result = await routeStudyAssistantRequest(message, {
      subjectName: selectedSubject?.name,
      topicName: selectedTopic?.name,
      mode,
      difficulty,
      pendingTool,
      history,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Assistant request failed' });
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
    const { subjectId, subjectName, topicId, topicName, difficulty, numQuestions, questionType } = req.body;
    if (typeof topicName !== 'string' || !topicName.trim()) {
      return res.status(400).json({ error: 'Topic name is required' });
    }
    const subject = typeof subjectId === 'string'
      ? getSubjects().find((candidate) => candidate.id === subjectId && !candidate.archivedAt)
      : getSubjects().find((candidate) => candidate.name.toLowerCase() === String(subjectName || '').trim().toLowerCase() && !candidate.archivedAt);
    if (!subject || (subjectName !== undefined && subject.name.toLowerCase() !== String(subjectName).trim().toLowerCase())) {
      return res.status(400).json({ error: 'Choose a saved active subject and provide its matching ID and name.' });
    }
    const topic = typeof topicId === 'string'
      ? getTopics(subject.id).find((candidate) => candidate.id === topicId)
      : getTopics(subject.id).find((candidate) => candidate.name.toLowerCase() === topicName.trim().toLowerCase());
    if (!topic || topic.name.toLowerCase() !== topicName.trim().toLowerCase()) {
      return res.status(400).json({ error: 'Choose a topic saved under the selected subject.' });
    }
    const savedSubject = subject;
    const questions = await generateQuizWithAI({
      subjectName: savedSubject?.name || 'General Studies',
      topicName: topic.name,
      difficulty,
      numQuestions,
      questionType,
    });
    const quizId = registerQuizForEvaluation({
      topicId: topic.id,
      subjectId: topic.subjectId,
      subjectName: savedSubject?.name || 'General Studies',
      topicName: topic.name,
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(difficulty) ? difficulty : 'intermediate',
      questions,
    });
    res.json({ questions, quizId });
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
    const { command, subjectName, mode, difficulty, pendingTool } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'Command string is required' });
    }
    if (subjectName !== undefined && !getSubjects().some((subject) => subject.name === subjectName && !subject.archivedAt)) {
      return res.status(400).json({ error: 'Selected subject is not saved and active' });
    }
    return res.json(await routeStudyAssistantRequest(command, { subjectName, mode, difficulty, pendingTool }));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Voice command error' });
  }
});

// -------------------------------------------------------------
// 9. Amazon Developer Hackathon 2026 (Alexa+ Track) Tool Endpoints
// -------------------------------------------------------------
app.get('/api/alexa-plus/manifest', (_req: Request, res: Response) => {
  res.json({
    track: 'Alexa+-inspired simulation for Amazon Developer Hackathon 2026',
    application: 'StudyPilot AI',
    mcpVersion: 'Not implemented',
    description: 'An in-app simulated conversational assistant with tools backed by StudyPilot persistent data. No Alexa+ runtime or device integration is configured.',
    tools: ALEXA_PLUS_TOOLS_MANIFEST,
  });
});

app.post('/api/alexa-plus/invoke', async (req: Request, res: Response) => {
  const { tool, arguments: args } = req.body;
  if (typeof tool !== 'string' || !tool.trim()) {
    return res.status(400).json({ error: 'Field "tool" must be a non-empty string' });
  }
  if (args !== undefined && (!args || typeof args !== 'object' || Array.isArray(args))) {
    return res.status(400).json({ error: 'Field "arguments" must be a JSON object' });
  }
  const result = await executeAlexaTool(tool, args || {});
  res.status(result.success ? 200 : 422).json(result);
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
