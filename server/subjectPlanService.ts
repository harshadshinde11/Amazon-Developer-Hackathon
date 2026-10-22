import { randomUUID } from 'node:crypto';
import {
  getQuizAttempts,
  getStudyPlans,
  getSubjects,
  getTopics,
  getUser,
  saveStudyPlan,
} from './db.js';
import { generateStudyPlanWithAI } from './geminiService.js';
import { StudySession, Subject, Topic } from '../src/types.js';

interface SubjectTask {
  subject: Subject;
  topic: Topic;
  examDate: string;
  durationMinutes: number;
  priority: number;
  learningObjective: string;
  recommendedActivity: string;
  revisionTask: string;
}

interface TimeSlot {
  start: number;
  end: number;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const toDateString = (date: Date) => date.toISOString().slice(0, 10);

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function toMinutes(time: string): number | undefined {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function formatTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function firstAvailableStart(slots: TimeSlot[], duration: number): number | undefined {
  const dayStart = 8 * 60;
  const dayEnd = 22 * 60;
  let cursor = dayStart;
  for (const slot of slots.sort((a, b) => a.start - b.start)) {
    if (slot.start - cursor >= duration) return cursor;
    cursor = Math.max(cursor, slot.end);
  }
  return dayEnd - cursor >= duration ? cursor : undefined;
}

function existingSlotsByDate(): Map<string, TimeSlot[]> {
  const slots = new Map<string, TimeSlot[]>();
  for (const plan of getStudyPlans()) {
    for (const session of plan.sessions) {
      if (session.status !== 'pending') continue;
      const start = toMinutes(session.startTime);
      if (start === undefined || !Number.isFinite(session.durationMinutes) || session.durationMinutes <= 0) {
        slots.set(session.scheduledDate, [{ start: 0, end: 24 * 60 }]);
        continue;
      }
      const dateSlots = slots.get(session.scheduledDate) || [];
      dateSlots.push({ start, end: start + session.durationMinutes });
      slots.set(session.scheduledDate, dateSlots);
    }
  }
  return slots;
}

export async function createSubjectStudyPlan(input: {
  subjectIds: unknown;
  examDate: unknown;
  hoursPerDay: unknown;
}) {
  if (!Array.isArray(input.subjectIds) || input.subjectIds.length < 1 || input.subjectIds.length > 20
    || !input.subjectIds.every((id) => typeof id === 'string') || new Set(input.subjectIds).size !== input.subjectIds.length) {
    throw new Error('Select one or more unique saved subject IDs.');
  }
  if (typeof input.examDate !== 'string' || !isValidDate(input.examDate) || input.examDate < toDateString(new Date())) {
    throw new Error('Choose a valid examination date today or later.');
  }
  const hoursPerDay = Number(input.hoursPerDay);
  if (!Number.isFinite(hoursPerDay) || hoursPerDay < 0.25 || hoursPerDay > 12) {
    throw new Error('Available study time must be between 0.25 and 12 hours per day.');
  }

  const selectedIds = input.subjectIds as string[];
  const subjects = getSubjects();
  const selectedSubjects = selectedIds.map((id) => subjects.find((subject) => subject.id === id && !subject.archivedAt));
  if (selectedSubjects.some((subject) => !subject)) {
    throw new Error('Every selected subject must be saved and active.');
  }
  const validSubjects = selectedSubjects as Subject[];
  const today = toDateString(new Date());
  const deadlines = new Map(validSubjects.map((subject) => {
    const date = validSubjects.length > 1
      && subject.examinationDate
      && isValidDate(subject.examinationDate)
      && subject.examinationDate > today
      ? subject.examinationDate
      : input.examDate as string;
    if (date <= today) throw new Error(`${subject.name} needs an examination date after today to schedule study sessions.`);
    return [subject.id, date] as const;
  }));

  const topicsBySubject = validSubjects.map((subject) => ({ subject, topics: getTopics(subject.id) }));
  const missingTopics = topicsBySubject.filter(({ topics }) => topics.length === 0).map(({ subject }) => subject.name);
  if (missingTopics.length) {
    throw new Error(`Add topics or course notes for ${missingTopics.join(', ')} before generating a targeted study plan.`);
  }

  const attempts = getQuizAttempts();
  const planContexts = await Promise.all(topicsBySubject.map(async ({ subject, topics }) => {
    const subjectAttempts = attempts.filter((attempt) => attempt.subjectId === subject.id);
    const weakTopics = topics.filter((topic) => {
      const results = subjectAttempts.filter((attempt) => attempt.topicId === topic.id);
      return results.length > 0 && results.reduce((sum, attempt) => sum + attempt.percentage, 0) / results.length < 60;
    }).map((topic) => topic.name);
    const generated = await generateStudyPlanWithAI({
      subjectName: subject.name,
      topics: topics.map((topic) => ({
        name: topic.name,
        difficulty: topic.difficulty,
        confidenceLevel: topic.confidenceLevel,
      })),
      examDate: deadlines.get(subject.id),
      hoursPerDay,
      weakTopics,
    });
    return { subject, topics, subjectAttempts, weakTopics, generated };
  }));

  const tasks: SubjectTask[] = [];
  for (const { subject, topics, subjectAttempts, weakTopics, generated } of planContexts) {
    for (const topic of topics) {
      const topicAttempts = subjectAttempts.filter((attempt) => attempt.topicId === topic.id);
      const averageScore = topicAttempts.length
        ? topicAttempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / topicAttempts.length
        : undefined;
      const isWeak = averageScore !== undefined && averageScore < 60;
      const generatedSession = Array.isArray(generated.sessions)
        ? generated.sessions.find((session) => typeof session?.topicName === 'string'
          && session.topicName.trim().toLowerCase() === topic.name.trim().toLowerCase())
        : undefined;
      const difficultyWeight = topic.difficulty === 'advanced' ? 2 : topic.difficulty === 'beginner' ? 0 : 1;
      tasks.push({
        subject,
        topic,
        examDate: deadlines.get(subject.id) as string,
        durationMinutes: Math.max(15, Math.min(120,
          (isWeak || weakTopics.includes(topic.name) ? 60 : difficultyWeight === 2 ? 60 : 45)
          + (topic.confidenceLevel <= 2 ? 15 : 0))),
        priority: (isWeak ? 100 : 0)
          + (averageScore === undefined ? 0 : 100 - averageScore)
          + (5 - topic.confidenceLevel) * 10
          + difficultyWeight,
        learningObjective: typeof generatedSession?.learningObjective === 'string'
          ? generatedSession.learningObjective
          : `Build understanding and practice ${topic.name}.`,
        recommendedActivity: typeof generatedSession?.recommendedActivity === 'string'
          ? generatedSession.recommendedActivity
          : `Review your notes and work through examples for ${topic.name}.`,
        revisionTask: typeof generatedSession?.revisionTask === 'string'
          ? generatedSession.revisionTask
          : `Check your understanding of ${topic.name} with practice questions.`,
      });
    }
  }

  tasks.sort((a, b) =>
    a.examDate.localeCompare(b.examDate)
    || b.priority - a.priority
    || a.topic.name.localeCompare(b.topic.name)
  );

  const dailyLimit = Math.floor(hoursPerDay * 60);
  const slotsByDate = existingSlotsByDate();
  const usedMinutes = new Map<string, number>();
  for (const [date, slots] of slotsByDate) {
    usedMinutes.set(date, slots.reduce((sum, slot) => sum + Math.max(0, slot.end - slot.start), 0));
  }
  const scheduledSessions: Array<Omit<StudySession, 'id' | 'studyPlanId'>> = [];

  for (const task of tasks) {
    let remaining = task.durationMinutes;
    let currentDate = new Date(`${today}T00:00:00.000Z`);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    let part = 1;
    while (remaining > 0) {
      const date = toDateString(currentDate);
      if (date > task.examDate) {
        throw new Error(`There is not enough available study time before ${task.subject.name}'s exam. Increase daily study time or move the exam date.`);
      }
      const existing = slotsByDate.get(date) || [];
      const currentMinutes = usedMinutes.get(date) || 0;
      const available = dailyLimit - currentMinutes;
      let duration = Math.min(remaining, available);
      let start = duration >= 15 ? firstAvailableStart(existing, duration) : undefined;
      while (start === undefined && duration >= 15) {
        duration -= 15;
        start = duration >= 15 ? firstAvailableStart(existing, duration) : undefined;
      }
      if (start !== undefined && duration >= 15) {
        scheduledSessions.push({
          subjectId: task.subject.id,
          subjectName: task.subject.name,
          topicName: task.topic.name,
          scheduledDate: date,
          startTime: formatTime(start),
          durationMinutes: duration,
          status: 'pending',
          learningObjective: remaining === duration ? task.learningObjective : `${task.learningObjective} (part ${part})`,
          recommendedActivity: task.recommendedActivity,
          revisionTask: task.revisionTask,
        });
        existing.push({ start, end: start + duration });
        slotsByDate.set(date, existing);
        usedMinutes.set(date, currentMinutes + duration);
        remaining -= duration;
        part += 1;
      }
      if (remaining > 0) currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  if (!scheduledSessions.length) {
    throw new Error('No future study sessions could be scheduled before the selected examination date.');
  }

  const subjectIds = validSubjects.map((subject) => subject.id);
  const subjectName = validSubjects.length === 1
    ? validSubjects[0].name
    : `Combined: ${validSubjects.map((subject) => subject.name).join(', ')}`;
  const totalMinutes = scheduledSessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  return saveStudyPlan({
    userId: getUser().id,
    title: validSubjects.length === 1 ? `${validSubjects[0].name} Mastery Sprint` : 'Combined Exam Preparation',
    ...(validSubjects.length === 1 ? { subjectId: validSubjects[0].id } : {}),
    subjectIds,
    subjectName,
    examDate: validSubjects.map((subject) => deadlines.get(subject.id) as string).sort()[0],
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    priorityRationale: `Scheduled using saved topic difficulty, confidence, and quiz performance. Sessions share a ${hoursPerDay}-hour daily limit and are fitted around existing pending study sessions.`,
    sessions: scheduledSessions.map((session) => ({ ...session, id: randomUUID(), studyPlanId: '' })),
  });
}
