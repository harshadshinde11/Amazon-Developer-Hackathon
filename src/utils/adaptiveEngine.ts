import {
  Topic,
  Subject,
  QuizAttempt,
  StudySession,
  TopicAnalytics,
  TopicMasteryCategory,
  AdaptiveRecommendation
} from '../types.js';

/**
 * Classifies topic mastery based on real quiz attempts:
 * - 'Strong': Average score >= 80% (with at least 1 attempt)
 * - 'Developing': Average score >= 60% and < 80%
 * - 'Needs revision': Average score < 60% (with at least 1 attempt)
 * - 'Not enough data': 0 attempts
 */
export function classifyTopicMastery(
  attemptsCount: number,
  averageScore: number
): TopicMasteryCategory {
  if (attemptsCount === 0) {
    return 'Not enough data';
  }
  if (averageScore >= 80) {
    return 'Strong';
  }
  if (averageScore >= 60) {
    return 'Developing';
  }
  return 'Needs revision';
}

/**
 * Computes analytics for all topics from persisted data without fabricating scores.
 */
export function computeTopicAnalytics(
  topics: Topic[],
  subjects: Subject[],
  attempts: QuizAttempt[],
  sessions: StudySession[]
): TopicAnalytics[] {
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  return topics.map((topic) => {
    const topicAttempts = attempts.filter((a) => a.topicId === topic.id);
    const completedSessions = sessions.filter(
      (s) => s.topicName.toLowerCase() === topic.name.toLowerCase() && s.status === 'completed'
    );

    const attemptsCount = topicAttempts.length;
    let averageScore = 0;
    let mostRecentScore: number | undefined;
    let lastPracticeDate: string | undefined;

    if (attemptsCount > 0) {
      const sortedAttempts = [...topicAttempts].sort(
        (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime()
      );
      const totalScore = sortedAttempts.reduce((acc, curr) => acc + curr.percentage, 0);
      averageScore = Math.round((totalScore / attemptsCount) * 10) / 10;
      mostRecentScore = sortedAttempts[0].percentage;
      lastPracticeDate = sortedAttempts[0].attemptedAt;
    }

    const status = classifyTopicMastery(attemptsCount, averageScore);

    let recommendedAction = 'Take a diagnostic quiz to assess baseline mastery.';
    if (status === 'Needs revision') {
      recommendedAction = `Score is ${averageScore}%. Review fundamentals and retake practice questions.`;
    } else if (status === 'Developing') {
      recommendedAction = `Score is ${averageScore}%. Complete 1 practice quiz to reach mastery (>80%).`;
    } else if (status === 'Strong') {
      recommendedAction = `Mastery achieved (${averageScore}%). Schedule spaced repetition review before exams.`;
    }

    return {
      topicId: topic.id,
      topicName: topic.name,
      subjectId: topic.subjectId,
      subjectName: subjectMap.get(topic.subjectId) || 'General',
      attemptsCount,
      averageScore,
      mostRecentScore,
      lastPracticeDate,
      completedSessionsCount: completedSessions.length,
      status,
      recommendedAction,
    };
  });
}

/**
 * Generates personalized, transparent recommendations based on actual data:
 * - Upcoming exams within 14 days
 * - Weak topics ('Needs revision')
 * - Pending study sessions due today
 * - Developing topics requiring reinforcement
 */
export function generateAdaptiveRecommendations(
  topicsAnalytics: TopicAnalytics[],
  subjects: Subject[],
  sessions: StudySession[],
  currentDateStr: string = new Date().toISOString().split('T')[0]
): AdaptiveRecommendation[] {
  const recommendations: AdaptiveRecommendation[] = [];

  // 1. Check for upcoming exams
  const today = new Date(currentDateStr);
  for (const subject of subjects) {
    if (subject.examinationDate) {
      const examDate = new Date(subject.examinationDate);
      const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 14) {
        recommendations.push({
          id: `rec-exam-${subject.id}`,
          type: 'upcoming_exam',
          title: `Upcoming Exam: ${subject.name} in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
          description: `Focus your study plan on key topics before your examination on ${subject.examinationDate}.`,
          subjectName: subject.name,
          topicName: 'Comprehensive Review',
          priority: diffDays <= 5 ? 'high' : 'medium',
          actionType: 'view_plan',
          targetSubjectId: subject.id,
        });
      }
    }
  }

  // 2. Identify weak topics requiring urgent revision
  const weakTopics = topicsAnalytics.filter((t) => t.status === 'Needs revision');
  for (const weak of weakTopics) {
    recommendations.push({
      id: `rec-weak-${weak.topicId}`,
      type: 'urgent_revision',
      title: `Critical Revision: ${weak.topicName}`,
      description: `Your average quiz score is ${weak.averageScore}%. Review key explanations and retake a 5-question targeted quiz.`,
      subjectName: weak.subjectName,
      topicName: weak.topicName,
      priority: 'high',
      actionType: 'start_quiz',
      targetTopicId: weak.topicId,
      targetSubjectId: weak.subjectId,
    });
  }

  // 3. Incomplete study sessions due today
  const pendingSessionsToday = sessions.filter(
    (s) => s.scheduledDate === currentDateStr && s.status === 'pending'
  );
  for (const s of pendingSessionsToday) {
    recommendations.push({
      id: `rec-session-${s.id}`,
      type: 'incomplete_session',
      title: `Scheduled for Today: ${s.topicName}`,
      description: `${s.durationMinutes} min session: "${s.learningObjective}".`,
      subjectName: s.subjectName,
      topicName: s.topicName,
      priority: 'medium',
      actionType: 'mark_complete',
    });
  }

  // 4. Developing topics (60-79%) to push into mastery
  const developingTopics = topicsAnalytics.filter((t) => t.status === 'Developing');
  for (const dev of developingTopics) {
    recommendations.push({
      id: `rec-dev-${dev.topicId}`,
      type: 'practice_quiz',
      title: `Reinforce: ${dev.topicName} (${dev.averageScore}%)`,
      description: `You are close to mastery! Take a quick practice quiz to push past 80%.`,
      subjectName: dev.subjectName,
      topicName: dev.topicName,
      priority: 'medium',
      actionType: 'start_quiz',
      targetTopicId: dev.topicId,
      targetSubjectId: dev.subjectId,
    });
  }

  return recommendations;
}
