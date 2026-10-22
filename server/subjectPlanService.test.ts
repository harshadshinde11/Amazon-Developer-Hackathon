import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'studypilot-subject-plan-test-'));
process.env.STUDYPILOT_DATA_DIR = dataDir;

const db = await import('./db.js');
const { createSubjectStudyPlan } = await import('./subjectPlanService.js');
const { executeAlexaTool } = await import('./alexaPlusTools.js');

after(() => rmSync(dataDir, { recursive: true, force: true }));

function dateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addSubject(name: string, topicName: string) {
  const subject = db.createSubject({
    userId: db.getUser().id,
    name,
    code: name.slice(0, 4).toUpperCase(),
    color: '#0ea5a4',
    icon: 'BookOpen',
  });
  const topic = db.createTopic({
    subjectId: subject.id,
    name: topicName,
    difficulty: 'intermediate',
    confidenceLevel: 2,
    completionStatus: 'not_started',
  });
  return { subject, topic };
}

test('combined subject plans preserve subject IDs and fit alongside pending sessions', async () => {
  db.resetToEmpty();
  const dsa = addSubject('Algorithms & Data Structures', 'Graph traversal');
  const dbms = addSubject('Database Management Systems', 'Transactions');
  const busyDate = dateOffset(1);
  db.saveStudyPlan({
    userId: db.getUser().id,
    title: 'Existing subject session',
    subjectId: dsa.subject.id,
    subjectName: dsa.subject.name,
    totalHours: 1,
    sessions: [{
      id: 'existing-session',
      studyPlanId: '',
      subjectId: dsa.subject.id,
      subjectName: dsa.subject.name,
      topicName: dsa.topic.name,
      scheduledDate: busyDate,
      startTime: '09:00',
      durationMinutes: 60,
      status: 'pending',
      learningObjective: 'Review saved DSA work',
      recommendedActivity: 'Study',
      revisionTask: 'Practice',
    }],
  });

  const plan = await createSubjectStudyPlan({
    subjectIds: [dsa.subject.id, dbms.subject.id],
    examDate: dateOffset(10),
    hoursPerDay: 1,
  });

  assert.deepEqual(plan.subjectIds, [dsa.subject.id, dbms.subject.id]);
  assert.equal(plan.subjectId, undefined);
  assert.deepEqual(new Set(plan.sessions.map((session) => session.subjectId)), new Set([dsa.subject.id, dbms.subject.id]));
  assert.ok(plan.sessions.every((session) => session.studyPlanId === plan.id));

  const scheduledMinutes = new Map<string, number>();
  const intervals = new Map<string, Array<{ start: number; end: number }>>();
  for (const session of [...db.getStudyPlans().flatMap((item) => item.sessions)]) {
    if (session.status !== 'pending') continue;
    const start = Number(session.startTime.slice(0, 2)) * 60 + Number(session.startTime.slice(3, 5));
    const key = `${session.scheduledDate}:${session.subjectId}`;
    const dateKey = session.scheduledDate;
    scheduledMinutes.set(dateKey, (scheduledMinutes.get(dateKey) || 0) + session.durationMinutes);
    const dateIntervals = intervals.get(dateKey) || [];
    dateIntervals.push({ start, end: start + session.durationMinutes });
    intervals.set(dateKey, dateIntervals);
    assert.ok(key.length > 0);
  }
  for (const [date, minutes] of scheduledMinutes) {
    assert.ok(minutes <= 60, `Daily study time exceeded on ${date}: ${minutes} minutes`);
  }
  for (const dateIntervals of intervals.values()) {
    const sorted = dateIntervals.sort((a, b) => a.start - b.start);
    for (let index = 1; index < sorted.length; index += 1) {
      assert.ok(sorted[index - 1].end <= sorted[index].start, 'Scheduled sessions must not overlap');
    }
  }

  db.updateSubject(dbms.subject.id, { name: 'Database Systems' });
  const renamedPlan = db.getStudyPlans().find((item) => item.id === plan.id);
  assert.match(renamedPlan?.subjectName || '', /Database Systems/);
  assert.ok(renamedPlan?.sessions.some((session) => session.subjectId === dbms.subject.id && session.subjectName === 'Database Systems'));
  assert.equal(db.deleteSubject(dbms.subject.id), false);
});

test('plan generation rejects invalid subject IDs and empty custom subjects', async () => {
  db.resetToEmpty();
  await assert.rejects(
    createSubjectStudyPlan({ subjectIds: ['not-saved'], examDate: dateOffset(4), hoursPerDay: 2 }),
    /saved and active/
  );
  const subject = db.createSubject({
    userId: db.getUser().id,
    name: 'Custom Learning',
    code: 'CUSTOM',
    color: '#8b5cf6',
    icon: 'BookOpen',
  });
  await assert.rejects(
    createSubjectStudyPlan({ subjectIds: [subject.id], examDate: dateOffset(4), hoursPerDay: 2 }),
    /Add topics or course notes/
  );
  assert.equal(db.getStudyPlans().length, 0);
});

test('create_subject_study_plan agent tool uses the validated subject scheduler', async () => {
  db.resetToEmpty();
  const subject = db.createSubject({
    userId: db.getUser().id,
    name: 'Operating Systems',
    code: 'OS',
    color: '#f97316',
    icon: 'MonitorCog',
    examinationDate: dateOffset(7),
  });
  const topic = db.createTopic({
    subjectId: subject.id,
    name: 'Memory management',
    difficulty: 'intermediate',
    confidenceLevel: 2,
    completionStatus: 'not_started',
  });

  const result = await executeAlexaTool('create_subject_study_plan', { subject_id: subject.id, hours_per_day: 1 });
  assert.equal(result.success, true);
  assert.equal((result.data as { subjectId: string }).subjectId, subject.id);
  assert.ok((result.data as { sessions: Array<{ subjectId?: string; topicName: string }> }).sessions
    .every((session) => session.subjectId === subject.id && session.topicName === topic.name));

  const invalid = await executeAlexaTool('create_subject_study_plan', { subject_id: 'unknown-subject' });
  assert.equal(invalid.success, false);
  assert.equal(db.getStudyPlans().length, 1);
});

test('legacy study history is migrated to its subject without losing the records', () => {
  db.resetToEmpty();
  const { subject, topic } = addSubject('Algorithms & Data Structures', 'Legacy graph topic');
  const plan = db.saveStudyPlan({
    userId: db.getUser().id,
    title: 'Legacy study plan',
    subjectId: subject.id,
    subjectName: subject.name,
    totalHours: 0.5,
    sessions: [{
      id: 'legacy-session',
      studyPlanId: '',
      subjectName: subject.name,
      topicName: topic.name,
      scheduledDate: dateOffset(1),
      startTime: '10:00',
      durationMinutes: 30,
      status: 'pending',
      learningObjective: 'Review',
      recommendedActivity: 'Study',
      revisionTask: 'Practice',
    }],
  });
  db.saveQuizAttempt({
    userId: db.getUser().id,
    subjectId: subject.id,
    subjectName: subject.name,
    topicId: topic.id,
    topicName: topic.name,
    difficulty: 'intermediate',
    score: 1,
    totalQuestions: 2,
    percentage: 50,
    timeSpentSeconds: 30,
    answers: [],
  });

  const filePath = path.join(dataDir, 'studypilot_db.json');
  const legacy = JSON.parse(readFileSync(filePath, 'utf-8'));
  delete legacy.user.activeSubjectId;
  delete legacy.studyPlans[0].subjectId;
  delete legacy.studyPlans[0].subjectIds;
  delete legacy.studyPlans[0].sessions[0].subjectId;
  delete legacy.quizAttempts[0].subjectId;
  writeFileSync(filePath, JSON.stringify(legacy, null, 2), 'utf-8');

  const migrated = db.readDb();
  assert.equal(migrated.user.activeSubjectId, subject.id);
  assert.equal(migrated.studyPlans[0].id, plan.id);
  assert.equal(migrated.studyPlans[0].subjectId, subject.id);
  assert.equal(migrated.studyPlans[0].sessions[0].subjectId, subject.id);
  assert.equal(migrated.quizAttempts[0].subjectId, subject.id);
  const persisted = JSON.parse(readFileSync(filePath, 'utf-8'));
  assert.equal(persisted.studyPlans.length, 1);
  assert.equal(persisted.quizAttempts.length, 1);
});
