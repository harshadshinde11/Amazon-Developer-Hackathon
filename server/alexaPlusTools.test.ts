import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'studypilot-agent-test-'));
process.env.STUDYPILOT_DATA_DIR = dataDir;

const db = await import('./db.js');
const { executeAlexaTool, registerQuizForEvaluation, routeStudyAssistantRequest } = await import('./alexaPlusTools.js');
const { generateQuizWithAI } = await import('./geminiService.js');

after(() => rmSync(dataDir, { recursive: true, force: true }));

function createSubjectAndTopic(examinationDate?: string) {
  const subject = db.createSubject({
    userId: db.getUser().id,
    name: 'Test Computer Science',
    code: 'TCS',
    color: '#008c8c',
    icon: 'BookOpen',
    examinationDate,
  });
  const topic = db.createTopic({
    subjectId: subject.id,
    name: 'Test Graph Search',
    difficulty: 'intermediate',
    confidenceLevel: 3,
    completionStatus: 'in_progress',
  });
  return { subject, topic };
}

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test('evaluate_quiz calculates and persists the result from answer records', async () => {
  db.resetToEmpty();
  const { subject, topic } = createSubjectAndTopic();
  const quizId = registerQuizForEvaluation({
    topicId: topic.id,
    subjectId: subject.id,
    subjectName: subject.name,
    topicName: topic.name,
    difficulty: 'intermediate',
    questions: [
      { id: 'q1', question: 'Question one?', type: 'mcq', options: ['A', 'B'], correctAnswer: 1, explanation: 'B is correct.' },
      { id: 'q2', question: 'Question two?', type: 'mcq', options: ['A', 'B'], correctAnswer: 1, explanation: 'B is correct.' },
    ],
  });
  const result = await executeAlexaTool('evaluate_quiz', {
    quiz_id: quizId,
    time_spent_seconds: 75,
    selected_answers: [1, 0],
  });

  assert.equal(result.success, true);
  assert.equal((result.data as { score: number }).score, 1);
  assert.equal((result.data as { percentage: number }).percentage, 50);
  assert.equal((result.data as { timeSpentSeconds: number }).timeSpentSeconds, 75);
  assert.equal(db.getQuizAttempts(topic.id).length, 1);

  const replay = await executeAlexaTool('evaluate_quiz', {
    quiz_id: quizId,
    selected_answers: [1, 0],
  });
  assert.equal(replay.success, false);
  assert.equal(db.getQuizAttempts(topic.id).length, 1);
});

test('get_upcoming_tasks returns only pending sessions within the saved date window', async () => {
  db.resetToEmpty();
  const { subject, topic } = createSubjectAndTopic();
  const sessions = [-1, 2, 12].map((offset, index) => ({
    id: `task-${index}`,
    studyPlanId: '',
    subjectName: subject.name,
    topicName: topic.name,
    scheduledDate: dateOffset(offset),
    startTime: '10:00',
    durationMinutes: 30,
    status: index === 1 ? 'pending' as const : index === 2 ? 'pending' as const : 'completed' as const,
    learningObjective: 'Review the topic',
    recommendedActivity: 'Solve practice questions',
    revisionTask: 'Summarize key ideas',
  }));
  db.saveStudyPlan({
    userId: db.getUser().id,
    title: 'Test plan',
    subjectId: subject.id,
    subjectName: subject.name,
    totalHours: 1.5,
    sessions,
  });

  const result = await executeAlexaTool('get_upcoming_tasks', { days_ahead: 7 });
  const data = result.data as { tasks: Array<{ id: string }> };
  assert.equal(result.success, true);
  assert.deepEqual(data.tasks.map((task) => task.id), ['task-1']);
});

test('repeating a completed-session update does not double-count study time', () => {
  db.resetToEmpty();
  const { subject, topic } = createSubjectAndTopic();
  const plan = db.saveStudyPlan({
    userId: db.getUser().id,
    title: 'Test plan',
    subjectId: subject.id,
    subjectName: subject.name,
    totalHours: 1,
    sessions: [{
      id: 'complete-once',
      studyPlanId: '',
      subjectName: subject.name,
      topicName: topic.name,
      scheduledDate: dateOffset(0),
      startTime: '10:00',
      durationMinutes: 60,
      status: 'pending',
      learningObjective: 'Review the topic',
      recommendedActivity: 'Solve practice questions',
      revisionTask: 'Summarize key ideas',
    }],
  });
  const initialHours = db.getUser().totalStudyHours;

  db.updateSessionStatus(plan.id, 'complete-once', 'completed');
  db.updateSessionStatus(plan.id, 'complete-once', 'completed');

  assert.equal(db.getUser().totalStudyHours, initialHours + 1);
});

test('demo quiz generation returns the requested question count and provenance', async () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = '';
  try {
    for (const numQuestions of [2, 8]) {
      const questions = await generateQuizWithAI({
        subjectName: 'Algorithms',
        topicName: 'A* Search Algorithm',
        numQuestions,
      });
      assert.equal(questions.length, numQuestions);
      assert.ok(questions.every((question) => question.generationMode === 'demo'));
    }
  } finally {
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
  }
});

test('adaptive coach requests a diagnostic and does not plan without saved quiz history', async () => {
  db.resetToEmpty();
  const { subject } = createSubjectAndTopic(dateOffset(10));
  const result = await routeStudyAssistantRequest(`Prepare me for my exam in ${subject.name}`);

  assert.equal(result.recognizedIntent, 'adaptive_study_coach');
  assert.equal(result.action, 'DIAGNOSTIC_REQUIRED');
  assert.equal((result.toolCall?.result.data as { totalQuestions: number }).totalQuestions, 5);
  assert.equal(db.getStudyPlans().length, 0);
  assert.deepEqual(result.actionHistory?.map((action) => action.tool), ['get_student_progress', 'generate_quiz']);
});

test('adaptive coach creates and logs a personalized plan from saved weak-topic results', async () => {
  db.resetToEmpty();
  const { subject, topic } = createSubjectAndTopic(dateOffset(10));
  db.saveQuizAttempt({
    userId: db.getUser().id,
    subjectId: subject.id,
    subjectName: subject.name,
    topicId: topic.id,
    topicName: topic.name,
    difficulty: 'intermediate',
    score: 2,
    totalQuestions: 5,
    percentage: 40,
    timeSpentSeconds: 60,
    answers: [],
  });

  const request = `Prepare me for my exam in ${subject.name}; I can study 1.5 hours a day`;
  const result = await routeStudyAssistantRequest(request);
  const plans = db.getStudyPlans();

  assert.equal(result.success, true);
  assert.equal(plans.length, 1);
  assert.equal(plans[0].examDate, subject.examinationDate);
  assert.equal((result.data as { id: string }).id, plans[0].id);
  assert.ok(plans[0].coachRequestKey);
  assert.ok(result.actionHistory?.some((action) => action.dataUsed.some((item) => item.includes(`${topic.name} (40%`))));
  assert.equal(result.actionHistory?.at(-1)?.savedRecordId, plans[0].id);

  const duplicate = await routeStudyAssistantRequest(request);
  assert.equal(db.getStudyPlans().length, 1);
  assert.equal(duplicate.actionHistory?.at(-1)?.status, 'reused');
});

test('adaptive coach asks for a missing exam date and resumes with the clarification', async () => {
  db.resetToEmpty();
  const { subject, topic } = createSubjectAndTopic();
  db.saveQuizAttempt({
    userId: db.getUser().id,
    subjectId: subject.id,
    subjectName: subject.name,
    topicId: topic.id,
    topicName: topic.name,
    difficulty: 'intermediate',
    score: 1,
    totalQuestions: 5,
    percentage: 20,
    timeSpentSeconds: 60,
    answers: [],
  });

  const initial = await routeStudyAssistantRequest(`Help me prepare for my exam in ${subject.name}`);
  assert.equal(initial.action, 'ASK_FOR_DETAILS');
  assert.equal(db.getStudyPlans().length, 0);

  const resumed = await routeStudyAssistantRequest(dateOffset(14), {
    pendingTool: initial.pendingTool,
  });
  assert.equal(resumed.success, true);
  assert.equal(db.getStudyPlans().length, 1);
  assert.equal(db.getStudyPlans()[0].examDate, dateOffset(14));
});