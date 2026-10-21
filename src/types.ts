export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
  streakDays: number;
  lastStudyDate: string;
  totalStudyHours: number;
  studyHoursThisWeek: number;
  targetExamDate?: string;
  preferredHoursPerDay: number;
  difficultyPreference: 'beginner' | 'intermediate' | 'advanced';
  soundEnabled: boolean;
  voiceGender: 'female' | 'male';
}

export interface Subject {
  id: string;
  userId: string;
  name: string;
  code: string;
  color: string;
  icon: string;
  examinationDate?: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  confidenceLevel: number; // 1 to 5
  completionStatus: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
  createdAt: string;
}

export interface StudySession {
  id: string;
  studyPlanId: string;
  subjectName: string;
  topicName: string;
  scheduledDate: string; // YYYY-MM-DD
  startTime: string; // e.g. "09:00"
  durationMinutes: number;
  status: 'pending' | 'completed' | 'skipped';
  learningObjective: string;
  recommendedActivity: string;
  revisionTask: string;
  completedAt?: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  subjectId?: string;
  subjectName: string;
  examDate?: string;
  totalHours: number;
  createdAt: string;
  priorityRationale?: string;
  sessions: StudySession[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  options: string[];
  correctAnswer: number; // 0-indexed for mcq/true_false
  explanation: string;
  commonMistakes?: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  question: string;
  options: string[];
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  commonMistakes?: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  score: number;
  totalQuestions: number;
  percentage: number;
  attemptedAt: string;
  timeSpentSeconds: number;
  answers: QuizAnswerRecord[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  mode?: 'simple' | 'exam' | 'tutorial' | 'revision' | 'practice';
  subjectName?: string;
  toolCall?: {
    name: string;
    params?: Record<string, unknown>;
    result?: unknown;
  };
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export type TopicMasteryCategory = 'Strong' | 'Developing' | 'Needs revision' | 'Not enough data';

export interface TopicAnalytics {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  attemptsCount: number;
  averageScore: number;
  mostRecentScore?: number;
  lastPracticeDate?: string;
  completedSessionsCount: number;
  status: TopicMasteryCategory;
  recommendedAction: string;
}

export interface AdaptiveRecommendation {
  id: string;
  type: 'urgent_revision' | 'upcoming_exam' | 'incomplete_session' | 'practice_quiz' | 'milestone';
  title: string;
  description: string;
  subjectName: string;
  topicName: string;
  priority: 'high' | 'medium' | 'low';
  actionType: 'start_quiz' | 'view_plan' | 'ask_tutor' | 'mark_complete';
  targetTopicId?: string;
  targetSubjectId?: string;
}

export interface AlexaToolManifest {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}
