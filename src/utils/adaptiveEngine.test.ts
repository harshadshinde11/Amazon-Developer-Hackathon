import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTopicMastery,
  computeTopicAnalytics,
  generateAdaptiveRecommendations
} from './adaptiveEngine.js';
import { Subject, Topic, QuizAttempt, StudySession } from '../types.js';

test('classifyTopicMastery correctly categorizes performance levels', () => {
  // 0 attempts -> Not enough data
  assert.equal(classifyTopicMastery(0, 0), 'Not enough data');

  // >= 80% -> Strong
  assert.equal(classifyTopicMastery(1, 90), 'Strong');
  assert.equal(classifyTopicMastery(3, 80), 'Strong');

  // 60-79% -> Developing
  assert.equal(classifyTopicMastery(2, 75), 'Developing');
  assert.equal(classifyTopicMastery(1, 60), 'Developing');

  // < 60% -> Needs revision
  assert.equal(classifyTopicMastery(1, 40), 'Needs revision');
  assert.equal(classifyTopicMastery(4, 59.9), 'Needs revision');
});

test('computeTopicAnalytics calculates averages, counts, and identifies weak areas', () => {
  const subjects: Subject[] = [
    {
      id: 'sub-1',
      userId: 'user-1',
      name: 'Computer Science',
      code: 'CS101',
      color: '#6366f1',
      icon: 'Cpu',
      createdAt: '2026-01-01',
    },
  ];

  const topics: Topic[] = [
    {
      id: 'top-1',
      subjectId: 'sub-1',
      name: 'BFS Search',
      difficulty: 'intermediate',
      confidenceLevel: 4,
      completionStatus: 'completed',
      createdAt: '2026-01-01',
    },
    {
      id: 'top-2',
      subjectId: 'sub-1',
      name: 'A* Algorithm',
      difficulty: 'advanced',
      confidenceLevel: 2,
      completionStatus: 'in_progress',
      createdAt: '2026-01-01',
    },
  ];

  const attempts: QuizAttempt[] = [
    {
      id: 'att-1',
      userId: 'user-1',
      subjectId: 'sub-1',
      subjectName: 'Computer Science',
      topicId: 'top-1',
      topicName: 'BFS Search',
      difficulty: 'intermediate',
      score: 9,
      totalQuestions: 10,
      percentage: 90,
      attemptedAt: '2026-10-18T10:00:00Z',
      timeSpentSeconds: 120,
      answers: [],
    },
    {
      id: 'att-2',
      userId: 'user-1',
      subjectId: 'sub-1',
      subjectName: 'Computer Science',
      topicId: 'top-2',
      topicName: 'A* Algorithm',
      difficulty: 'advanced',
      score: 4,
      totalQuestions: 10,
      percentage: 40,
      attemptedAt: '2026-10-19T10:00:00Z',
      timeSpentSeconds: 180,
      answers: [],
    },
  ];

  const sessions: StudySession[] = [
    {
      id: 'sess-1',
      studyPlanId: 'plan-1',
      subjectName: 'Computer Science',
      topicName: 'BFS Search',
      scheduledDate: '2026-10-18',
      startTime: '10:00',
      durationMinutes: 45,
      status: 'completed',
      learningObjective: 'Understand queue-based graph traversal',
      recommendedActivity: 'Implement BFS in Python',
      revisionTask: 'Review time complexity',
      completedAt: '2026-10-18T11:00:00Z',
    },
  ];

  const analytics = computeTopicAnalytics(topics, subjects, attempts, sessions);

  assert.equal(analytics.length, 2);

  const bfs = analytics.find((a) => a.topicId === 'top-1');
  assert.ok(bfs);
  assert.equal(bfs.averageScore, 90);
  assert.equal(bfs.status, 'Strong');
  assert.equal(bfs.completedSessionsCount, 1);

  const astar = analytics.find((a) => a.topicId === 'top-2');
  assert.ok(astar);
  assert.equal(astar.averageScore, 40);
  assert.equal(astar.status, 'Needs revision');
});

test('generateAdaptiveRecommendations flags critical revision for weak topics and upcoming exams', () => {
  const subjects: Subject[] = [
    {
      id: 'sub-1',
      userId: 'user-1',
      name: 'Algorithms',
      code: 'CS201',
      color: '#6366f1',
      icon: 'BookOpen',
      examinationDate: '2026-10-25',
      createdAt: '2026-01-01',
    },
  ];

  const analytics = [
    {
      topicId: 'top-astar',
      topicName: 'A* Algorithm',
      subjectId: 'sub-1',
      subjectName: 'Algorithms',
      attemptsCount: 1,
      averageScore: 40,
      mostRecentScore: 40,
      lastPracticeDate: '2026-10-19T10:00:00Z',
      completedSessionsCount: 0,
      status: 'Needs revision' as const,
      recommendedAction: 'Review fundamentals and retake practice questions.',
    },
  ];

  const sessions: StudySession[] = [
    {
      id: 'sess-today',
      studyPlanId: 'plan-1',
      subjectName: 'Algorithms',
      topicName: 'Graph Heuristics',
      scheduledDate: '2026-10-20',
      startTime: '14:00',
      durationMinutes: 60,
      status: 'pending',
      learningObjective: 'Master admissible heuristics',
      recommendedActivity: 'Code Manhattan vs Euclidean distance',
      revisionTask: 'Practice quiz',
    },
  ];

  const recs = generateAdaptiveRecommendations(analytics, subjects, sessions, '2026-10-20');

  // Must include:
  // 1. Upcoming exam in 5 days
  // 2. Critical revision for A* Algorithm (weak topic at 40%)
  // 3. Pending session for today
  assert.ok(recs.some((r) => r.type === 'upcoming_exam'));
  assert.ok(recs.some((r) => r.type === 'urgent_revision' && r.topicName === 'A* Algorithm'));
  assert.ok(recs.some((r) => r.type === 'incomplete_session'));
});
