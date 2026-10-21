import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'studypilot-agent-test-'));
process.env.STUDYPILOT_DATA_DIR = dataDir;

const db = await import('./db.js');
const { executeAlexaTool, registerQuizForEvaluation } = await import('./alexaPlusTools.js');
const { generateQuizWithAI } = await import('./geminiService.js');

after(() => rmSync(dataDir, { recursive: true, force: true }));

function createSubjectAndTopic() {
  const subject = db.createSubject({
    userId: db.getUser().id,
    name: 'Test Computer Science',
    code: 'TCS',
    color: '#008c8c',
    icon: 'BookOpen',
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