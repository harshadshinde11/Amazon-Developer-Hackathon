import { randomUUID } from 'node:crypto';
import {
  getSubjects,
  getTopics,
  getStudyPlans,
  saveStudyPlan,
  getQuizAttempts,
  saveQuizAttempt,
  getUser,
} from './db.js';
import {
  computeTopicAnalytics,
  generateAdaptiveRecommendations,
} from '../src/utils/adaptiveEngine.js';
import {
  chatWithTutor,
  generateQuizWithAI,
  generateStudyPlanWithAI,
} from './geminiService.js';
import { AlexaToolManifest, QuizQuestion } from '../src/types.js';

interface ActiveQuizSession {
  topicId: string;
  subjectId: string;
  subjectName: string;
  topicName: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  questions: QuizQuestion[];
  createdAt: number;
}

const activeQuizSessions = new Map<string, ActiveQuizSession>();

export function registerQuizForEvaluation(session: Omit<ActiveQuizSession, 'createdAt'>): string {
  const now = Date.now();
  for (const [id, activeSession] of activeQuizSessions) {
    if (now - activeSession.createdAt > 2 * 60 * 60 * 1000) activeQuizSessions.delete(id);
  }
  while (activeQuizSessions.size >= 100) {
    const oldestId = activeQuizSessions.keys().next().value;
    if (!oldestId) break;
    activeQuizSessions.delete(oldestId);
  }

  const quizId = randomUUID();
  activeQuizSessions.set(quizId, { ...session, createdAt: now });
  return quizId;
}

export const ALEXA_PLUS_TOOLS_MANIFEST: AlexaToolManifest[] = [
  {
    name: 'create_study_plan',
    description: 'Generates and persists a structured, prioritized study schedule for an upcoming examination or subject.',
    parameters: {
      type: 'object',
      properties: {
        subject_name: { type: 'string', description: 'Name of the subject (e.g. "Algorithms & Data Structures")' },
        topics: { type: 'string', description: 'Comma-separated topic names to cover (optional)' },
        exam_date: { type: 'string', description: 'Target examination date in YYYY-MM-DD format (optional)' },
        hours_per_day: { type: 'number', description: 'Available study hours per day (default 2)' },
      },
      required: ['subject_name'],
    },
  },
  {
    name: 'explain_topic',
    description: 'Provides an educational explanation with analogies, step-by-step breakdown, and key examination points.',
    parameters: {
      type: 'object',
      properties: {
        topic_name: { type: 'string', description: 'Name of the topic or concept to explain' },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Student difficulty level' },
        mode: { type: 'string', enum: ['simple', 'exam', 'tutorial', 'revision', 'practice'], description: 'Pedagogical mode' },
      },
      required: ['topic_name'],
    },
  },
  {
    name: 'generate_quiz',
    description: 'Generates a targeted educational quiz on a topic with multiple-choice questions and explanations.',
    parameters: {
      type: 'object',
      properties: {
        topic_name: { type: 'string', description: 'Subject topic to test' },
        difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], description: 'Target difficulty' },
        num_questions: { type: 'number', description: 'Number of questions (default 3 to 5)' },
      },
      required: ['topic_name'],
    },
  },
  {
    name: 'get_student_progress',
    description: 'Retrieves current academic metrics: study streak, hours studied this week, quiz averages, and topic mastery status.',
    parameters: {
      type: 'object',
      properties: {
        subject_name: { type: 'string', description: 'Optional subject filter' },
      },
      required: [],
    },
  },
  {
    name: 'evaluate_quiz',
    description: 'Calculates a quiz score from submitted answers and saves the attempt to student progress.',
    parameters: {
      type: 'object',
      properties: {
        quiz_id: { type: 'string', description: 'Opaque ID returned when the backend generated this quiz' },
        selected_answers: { type: 'array', description: 'Selected option indexes in question order; use -1 for unanswered questions' },
        time_spent_seconds: { type: 'number', description: 'Time spent taking the quiz in seconds (optional)' },
      },
      required: ['quiz_id', 'selected_answers'],
    },
  },
  {
    name: 'get_upcoming_tasks',
    description: 'Lists pending study sessions from saved plans for the requested number of upcoming days.',
    parameters: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'Number of days to look ahead, from 1 to 90 (default 7)' },
      },
      required: [],
    },
  },
  {
    name: 'recommend_revision',
    description: 'Runs the adaptive learning engine over historical quiz scores to identify weak topics needing urgent revision and exam priorities.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

export interface ToolInvocationResult {
  success: boolean;
  tool: string;
  speechText: string;
  data: unknown;
  timestamp: string;
  error?: string;
}

const today = () => new Date().toISOString().slice(0, 10);

function findSubject(name: string) {
  return getSubjects().find((subject) => subject.name.toLowerCase() === name.trim().toLowerCase());
}

function findTopic(name: string, subjectId?: string) {
  const matches = getTopics(subjectId).filter((topic) => topic.name.toLowerCase() === name.trim().toLowerCase());
  return matches.length === 1 ? matches[0] : undefined;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function failure(tool: string, speechText: string, error: string, timestamp: string): ToolInvocationResult {
  return { success: false, tool, speechText, error, data: null, timestamp };
}

export async function executeAlexaTool(
  toolName: string,
  args: Record<string, any> = {}
): Promise<ToolInvocationResult> {
  const timestamp = new Date().toISOString();

  try {
    switch (toolName) {
      case 'create_study_plan': {
        const subjectName = typeof args.subject_name === 'string' ? args.subject_name.trim() : '';
        if (!subjectName) {
          return failure(toolName, 'Which of your subjects should I create the study plan for?', 'Missing required argument: subject_name', timestamp);
        }

        const subjects = getSubjects();
        const existingSubject = findSubject(subjectName);
        if (!existingSubject) {
          return failure(toolName, `I couldn't find ${subjectName} in your saved subjects. Choose one of: ${subjects.map((subject) => subject.name).join(', ') || 'no subjects are saved yet'}.`, 'Unknown subject_name', timestamp);
        }

        const allTopics = getTopics(existingSubject.id);
        const requestedTopicNames = args.topics === undefined
          ? allTopics.map((topic) => topic.name)
          : typeof args.topics === 'string'
            ? args.topics.split(',').map((topic: string) => topic.trim()).filter(Boolean)
            : [];
        if (args.topics !== undefined && (!requestedTopicNames.length || typeof args.topics !== 'string')) {
          return failure(toolName, 'List one or more saved topic names, separated by commas.', 'Invalid topics argument', timestamp);
        }
        const inputTopics = requestedTopicNames.map((name: string) => {
          const topic = findTopic(name, existingSubject.id);
          return topic && { name: topic.name, difficulty: topic.difficulty, confidenceLevel: topic.confidenceLevel };
        });
        if (inputTopics.some((topic: unknown) => !topic)) {
          const availableTopics = allTopics.map((topic) => topic.name).join(', ');
          return failure(toolName, `I couldn't match every requested topic to ${existingSubject.name}. Saved topics: ${availableTopics || 'none'}.`, 'Unknown topic in topics argument', timestamp);
        }
        const validatedTopics = inputTopics.filter((topic): topic is NonNullable<typeof topic> => Boolean(topic));
        if (!validatedTopics.length) {
          return failure(toolName, `${existingSubject.name} has no saved topics yet. Add topics before creating a targeted plan.`, 'No saved topics for subject', timestamp);
        }

        const examDate = args.exam_date ?? existingSubject.examinationDate;
        if (args.exam_date !== undefined && !validDate(args.exam_date)) {
          return failure(toolName, 'Give the examination date in YYYY-MM-DD format.', 'Invalid exam_date', timestamp);
        }
        if (!examDate || !validDate(examDate) || examDate < today()) {
          return failure(toolName, 'Please provide a valid examination date today or later.', 'Missing or past examination date', timestamp);
        }

        const hoursPerDay = args.hours_per_day === undefined
          ? getUser().preferredHoursPerDay
          : Number(args.hours_per_day);
        if (!Number.isFinite(hoursPerDay) || hoursPerDay < 0.25 || hoursPerDay > 12) {
          return failure(toolName, 'Available study time must be between 0.25 and 12 hours per day.', 'Invalid hours_per_day', timestamp);
        }

        // Find weak topics from quiz records
        const attempts = getQuizAttempts();
        const weakTopics = allTopics
          .filter((t) => {
            const topAttempts = attempts.filter((a) => a.topicId === t.id);
            if (topAttempts.length === 0) return false;
            const avg = topAttempts.reduce((acc, c) => acc + c.percentage, 0) / topAttempts.length;
            return avg < 60;
          })
          .map((t) => t.name);

        const generated = await generateStudyPlanWithAI({
          subjectName,
          topics: validatedTopics,
          examDate,
          hoursPerDay,
          weakTopics,
        });

        // Save plan to persistent DB
        const savedPlan = saveStudyPlan({
          userId: 'user_alexa_01',
          title: generated.title,
          subjectId: existingSubject.id,
          subjectName,
          examDate,
          totalHours: generated.totalHours,
          priorityRationale: generated.priorityRationale,
          sessions: generated.sessions.map((s, idx) => ({
            ...s,
            id: `sess_tool_${Date.now()}_${idx}`,
            studyPlanId: '',
          })),
        });

        return {
          success: true,
          tool: toolName,
          speechText: `I created and saved a ${generated.totalHours}-hour study plan for ${subjectName} with ${savedPlan.sessions.length} sessions.`,
          data: savedPlan,
          timestamp,
        };
      }

      case 'explain_topic': {
        const topicName = typeof args.topic_name === 'string' ? args.topic_name.trim() : '';
        if (!topicName) {
          return failure(toolName, 'What topic would you like me to explain?', 'Missing required argument: topic_name', timestamp);
        }

        const difficulty = args.difficulty || 'intermediate';
        const mode = args.mode || 'simple';
        if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
          return failure(toolName, 'Choose beginner, intermediate, or advanced difficulty.', 'Invalid difficulty', timestamp);
        }
        if (!['simple', 'exam', 'tutorial', 'revision', 'practice'].includes(mode)) {
          return failure(toolName, 'Choose a supported explanation mode.', 'Invalid mode', timestamp);
        }

        const explanation = await chatWithTutor({
          messages: [{ role: 'user', content: `Explain ${topicName}` }],
          mode,
          difficulty,
        });

        const firstSentence = explanation.split('\n').filter(l => l.trim() && !l.startsWith('#'))[0] || `Here is an explanation of ${topicName}.`;

        return {
          success: true,
          tool: toolName,
          speechText: firstSentence.length > 200 ? firstSentence.slice(0, 200) + '...' : firstSentence,
          data: {
            topicName,
            difficulty,
            mode,
            explanation,
          },
          timestamp,
        };
      }

      case 'generate_quiz': {
        const topicName = typeof args.topic_name === 'string' ? args.topic_name.trim() : '';
        if (!topicName) {
          return failure(toolName, 'Which saved topic should I make a quiz about?', 'Missing required argument: topic_name', timestamp);
        }

        const topic = findTopic(topicName);
        if (!topic) {
          return failure(toolName, `I couldn't match ${topicName} to a saved topic. Please use a topic from one of your subjects.`, 'Unknown topic_name', timestamp);
        }
        const subject = getSubjects().find((candidate) => candidate.id === topic.subjectId);
        const difficulty = args.difficulty || 'intermediate';
        if (!['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
          return failure(toolName, 'Choose beginner, intermediate, or advanced difficulty.', 'Invalid difficulty', timestamp);
        }
        const numQuestions = args.num_questions === undefined ? 3 : Number(args.num_questions);
        if (!Number.isInteger(numQuestions) || numQuestions < 1 || numQuestions > 10) {
          return failure(toolName, 'Choose between 1 and 10 quiz questions.', 'Invalid num_questions', timestamp);
        }

        const questions = await generateQuizWithAI({
          subjectName: subject?.name || 'General Studies',
          topicName: topic.name,
          difficulty,
          numQuestions,
        });
        const quizId = registerQuizForEvaluation({
          topicId: topic.id,
          subjectId: topic.subjectId,
          subjectName: subject?.name || 'General Studies',
          topicName: topic.name,
          difficulty,
          questions,
        });

        return {
          success: true,
          tool: toolName,
          speechText: `I have prepared a ${questions.length}-question ${difficulty} quiz on ${topicName}. Let's test your knowledge!`,
          data: {
            topicId: topic.id,
            subjectId: topic.subjectId,
            subjectName: subject?.name,
            topicName: topic.name,
            difficulty,
            quizId,
            totalQuestions: questions.length,
            questions,
          },
          timestamp,
        };
      }

      case 'get_student_progress': {
        const user = getUser();
        const subjects = getSubjects();
        const topics = getTopics();
        const attempts = getQuizAttempts();
        const plans = getStudyPlans();
        const allSessions = plans.flatMap((p) => p.sessions);

        const subjectName = typeof args.subject_name === 'string' ? args.subject_name.trim() : '';
        const subject = subjectName ? findSubject(subjectName) : undefined;
        if (subjectName && !subject) {
          return failure(toolName, `I couldn't find ${subjectName} in your saved subjects.`, 'Unknown subject_name', timestamp);
        }
        const scopedTopics = subject ? topics.filter((topic) => topic.subjectId === subject.id) : topics;
        const scopedAttempts = subject ? attempts.filter((attempt) => attempt.subjectId === subject.id) : attempts;
        const scopedSessions = subject ? allSessions.filter((session) => session.subjectName === subject.name) : allSessions;
        const analytics = computeTopicAnalytics(scopedTopics, subjects, scopedAttempts, scopedSessions);
        const strong = analytics.filter((a) => a.status === 'Strong').length;
        const developing = analytics.filter((a) => a.status === 'Developing').length;
        const weak = analytics.filter((a) => a.status === 'Needs revision').length;

        const speech = `You have studied ${user.studyHoursThisWeek} hours this week with a ${user.streakDays}-day streak. Your saved quiz data shows ${strong} strong, ${developing} developing, and ${weak} topics needing revision.`;

        return {
          success: true,
          tool: toolName,
          speechText: speech,
          data: {
            streakDays: user.streakDays,
            studyHoursThisWeek: user.studyHoursThisWeek,
            totalStudyHours: user.totalStudyHours,
            masterySummary: { strong, developing, needsRevision: weak },
            totalSubjects: subject ? 1 : subjects.length,
            totalQuizAttempts: scopedAttempts.length,
            studySessions: scopedSessions,
            quizAttempts: scopedAttempts,
            topicPerformance: analytics,
          },
          timestamp,
        };
      }

      case 'evaluate_quiz': {
        const quizId = typeof args.quiz_id === 'string' ? args.quiz_id : '';
        const quizSession = activeQuizSessions.get(quizId);
        if (!quizSession) {
          return failure(toolName, 'This quiz is no longer available for evaluation. Generate a new quiz and try again.', 'Unknown or expired quiz_id', timestamp);
        }
        const topic = getTopics().find((candidate) => candidate.id === quizSession.topicId);
        if (!topic || !Array.isArray(args.selected_answers)
          || args.selected_answers.length !== quizSession.questions.length) {
          return failure(toolName, 'The quiz answers do not match the generated question set.', 'Invalid selected_answers', timestamp);
        }

        const answers = [];
        for (const [index, question] of quizSession.questions.entries()) {
          const selectedAnswer = args.selected_answers[index];
          if (!question || typeof question.id !== 'string' || typeof question.question !== 'string'
            || !Array.isArray(question.options) || question.options.length < 2 || question.options.length > 6
            || !Number.isInteger(question.correctAnswer) || question.correctAnswer < 0
            || question.correctAnswer >= question.options.length || typeof question.explanation !== 'string'
            || !Number.isInteger(selectedAnswer) || (selectedAnswer as number) < -1
            || (selectedAnswer as number) >= question.options.length) {
            return failure(toolName, 'One or more answer records are invalid.', 'Invalid answer record', timestamp);
          }

          answers.push({
            questionId: question.id,
            question: question.question,
            options: question.options,
            selectedAnswer: selectedAnswer as number,
            correctAnswer: question.correctAnswer,
            isCorrect: selectedAnswer === question.correctAnswer,
            explanation: question.explanation,
            ...(question.commonMistakes ? { commonMistakes: question.commonMistakes } : {}),
          });
        }

        const timeSpentSeconds = args.time_spent_seconds === undefined ? 0 : Number(args.time_spent_seconds);
        if (!Number.isInteger(timeSpentSeconds) || timeSpentSeconds < 0 || timeSpentSeconds > 86400) {
          return failure(toolName, 'Time spent must be between 0 and 86,400 seconds.', 'Invalid time_spent_seconds', timestamp);
        }

        const score = answers.filter((answer) => answer.isCorrect).length;
        const percentage = Math.round((score / answers.length) * 100);
        const attempt = saveQuizAttempt({
          userId: getUser().id,
          subjectId: quizSession.subjectId,
          subjectName: quizSession.subjectName,
          topicId: topic.id,
          topicName: quizSession.topicName,
          difficulty: quizSession.difficulty,
          score,
          totalQuestions: answers.length,
          percentage,
          timeSpentSeconds,
          answers,
        });
        activeQuizSessions.delete(quizId);

        return {
          success: true,
          tool: toolName,
          speechText: `Quiz saved for ${quizSession.topicName}: ${score} of ${answers.length} correct, or ${percentage}%.`,
          data: attempt,
          timestamp,
        };
      }

      case 'get_upcoming_tasks': {
        const daysAhead = args.days_ahead === undefined ? 7 : Number(args.days_ahead);
        if (!Number.isInteger(daysAhead) || daysAhead < 1 || daysAhead > 90) {
          return failure(toolName, 'Choose a look-ahead period between 1 and 90 days.', 'Invalid days_ahead', timestamp);
        }

        const startDate = today();
        const end = new Date(`${startDate}T00:00:00.000Z`);
        end.setUTCDate(end.getUTCDate() + daysAhead);
        const endDate = end.toISOString().slice(0, 10);
        const tasks = getStudyPlans()
          .flatMap((plan) => plan.sessions
            .filter((session) => session.status === 'pending' && session.scheduledDate >= startDate && session.scheduledDate <= endDate)
            .map((session) => ({ ...session, planId: plan.id, planTitle: plan.title })))
          .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime));

        return {
          success: true,
          tool: toolName,
          speechText: tasks.length
            ? `You have ${tasks.length} saved study task${tasks.length === 1 ? '' : 's'} due in the next ${daysAhead} days.`
            : `You have no pending saved study tasks in the next ${daysAhead} days.`,
          data: { startDate, endDate, daysAhead, tasks },
          timestamp,
        };
      }

      case 'recommend_revision': {
        const subjects = getSubjects();
        const topics = getTopics();
        const attempts = getQuizAttempts();
        const plans = getStudyPlans();
        const allSessions = plans.flatMap((p) => p.sessions);

        const analytics = computeTopicAnalytics(topics, subjects, attempts, allSessions);
        const recommendations = generateAdaptiveRecommendations(analytics, subjects, allSessions);

        const weakTopics = analytics.filter((t) => t.status === 'Needs revision');
        let speech = '';
        if (weakTopics.length > 0) {
          const names = weakTopics.map((w) => `${w.topicName} (${w.averageScore}%)`).join(', ');
          speech = `Based on your quiz performance, you should prioritize revising: ${names}.`;
        } else if (attempts.length === 0) {
          const nextExam = subjects
            .filter((subject) => subject.examinationDate && subject.examinationDate >= today())
            .sort((a, b) => (a.examinationDate || '').localeCompare(b.examinationDate || ''))[0];
          speech = nextExam
            ? `I don't have saved quiz scores to assess weak topics yet. Your next examination is ${nextExam.name} on ${nextExam.examinationDate}; start with a diagnostic quiz or review its saved topics.`
            : 'I do not have saved quiz scores or an upcoming examination to prioritize. Take a quiz or add an examination date first.';
        } else {
          speech = 'Your saved quiz scores show no topics below 60%. Review the upcoming exam recommendations or keep up spaced practice.';
        }

        return {
          success: true,
          tool: toolName,
          speechText: speech,
          data: {
            recommendations,
            weakTopics,
            topicPerformance: analytics,
            quizAttempts: attempts,
          },
          timestamp,
        };
      }

      default:
        return {
          success: false,
          tool: toolName,
          speechText: `Unknown tool "${toolName}". Supported tools: ${ALEXA_PLUS_TOOLS_MANIFEST.map((t) => t.name).join(', ')}.`,
          error: `Tool ${toolName} not found`,
          data: null,
          timestamp,
        };
    }
  } catch (err: any) {
    console.error(`Error executing Alexa tool ${toolName}:`, err);
    return {
      success: false,
      tool: toolName,
      speechText: `An error occurred while executing ${toolName}.`,
      error: err.message || 'Internal execution error',
      data: null,
      timestamp,
    };
  }
}

export interface AssistantRouteResult {
  recognizedIntent: string;
  speech: string;
  action: string;
  data: unknown;
  success: boolean;
  pendingTool?: { name: string; arguments: Record<string, unknown> };
  toolCall?: { name: string; arguments: Record<string, unknown>; result: ToolInvocationResult };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9*]+/g, ' ').trim();
}

function parseRequestedDate(text: string): string | undefined {
  const explicit = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (explicit) return explicit[1];
  if (!/\b(exam|examination)\b/i.test(text)) return undefined;
  const base = new Date();
  const relative = text.match(/\bin\s+(\d+)\s+days?\b/);
  if (/\btomorrow\b/.test(text)) base.setDate(base.getDate() + 1);
  else if (relative) base.setDate(base.getDate() + Number(relative[1]));
  else if (!/\btoday\b/.test(text)) return undefined;
  return base.toISOString().slice(0, 10);
}

function mentionedSubject(text: string) {
  const normalized = normalizeText(text);
  return getSubjects().find((subject) => normalized.includes(normalizeText(subject.name)));
}

function mentionedTopic(text: string, subjectId?: string) {
  const normalized = normalizeText(text);
  return getTopics(subjectId).find((topic) => {
    const name = normalizeText(topic.name);
    if (normalized.includes(name)) return true;
    if (name.includes('breadth first search') && /\bbfs\b/.test(normalized)) return true;
    if (name.includes('depth first search') && /\bdfs\b/.test(normalized)) return true;
    return name.startsWith('a ') && (/\ba\s*\*/.test(normalized) || /\ba star\b/.test(normalized));
  });
}

export async function routeStudyAssistantRequest(
  requestText: string,
  context: {
    subjectName?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    mode?: 'simple' | 'exam' | 'tutorial' | 'revision' | 'practice';
    pendingTool?: { name: string; arguments: Record<string, unknown> };
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  } = {}
): Promise<AssistantRouteResult> {
  const text = requestText.trim();
  const normalized = normalizeText(text);
  const subjects = getSubjects();
  const pending = context.pendingTool;
  const subject = mentionedSubject(text)
    || subjects.find((item) => item.name === pending?.arguments.subject_name)
    || subjects.find((item) => item.name === context.subjectName);
  const topic = mentionedTopic(text, subject?.id)
    || (typeof pending?.arguments.topic_name === 'string' ? findTopic(pending.arguments.topic_name, subject?.id) : undefined);

  let tool = pending?.name || '';
  let args: Record<string, unknown> = { ...(pending?.arguments || {}) };
  let clarification = '';

  if (tool === 'create_study_plan' || /\b(study plan|plan for|make a plan|create a plan|schedule|study schedule)\b/.test(normalized)) {
    tool = 'create_study_plan';
    if (!subject) {
      clarification = `Which saved subject should I plan for? Your subjects are: ${subjects.map((item) => item.name).join(', ') || 'none yet'}.`;
    } else {
      const hoursMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*hours?\b/);
      const date = parseRequestedDate(text) || (typeof args.exam_date === 'string' ? args.exam_date : undefined);
      const requestedTopics = getTopics(subject.id).filter((item) => normalized.includes(normalizeText(item.name)));
      args = {
        ...args,
        subject_name: subject.name,
        ...(requestedTopics.length ? { topics: requestedTopics.map((item) => item.name).join(', ') } : {}),
        ...(date ? { exam_date: date } : {}),
        ...(hoursMatch ? { hours_per_day: Number(hoursMatch[1]) } : {}),
      };
      if (!date && !subject.examinationDate) clarification = `What is the examination date for ${subject.name}? Please use YYYY-MM-DD.`;
    }
  } else if (tool === 'generate_quiz' || /\b(quiz|test me|practice questions?)\b/.test(normalized)) {
    tool = 'generate_quiz';
    if (!topic) {
      const matchingSubject = subject;
      const topicNames = matchingSubject ? getTopics(matchingSubject.id).map((item) => item.name) : [];
      clarification = matchingSubject
        ? `Which ${matchingSubject.name} topic should I quiz you on? Saved topics: ${topicNames.join(', ') || 'none yet'}.`
        : 'Which saved topic would you like a quiz on?';
    } else {
      const countMatch = normalized.match(/\b(\d+)\s+questions?\b/);
      args = {
        ...args,
        topic_name: topic.name,
        difficulty: context.difficulty || getUser().difficultyPreference,
        ...(countMatch ? { num_questions: Number(countMatch[1]) } : {}),
      };
    }
  } else if (tool === 'explain_topic' || /\b(explain|teach me|what is|how does|help me understand)\b/.test(normalized)) {
    tool = 'explain_topic';
    const cleanedTopic = text.replace(/^(?:studypilot\s*[,;:]?\s*)?(?:please\s+)?(?:explain|teach me|what is|how does|help me understand)\s+/i, '').replace(/[?.!]+$/, '').trim();
    const topicName = cleanedTopic || (pending?.name === 'explain_topic' ? text.replace(/[?.!]+$/, '').trim() : '');
    if (!topicName) clarification = 'What topic would you like me to explain?';
    else args = { ...args, topic_name: topicName, difficulty: context.difficulty || getUser().difficultyPreference, mode: context.mode || 'simple' };
  } else if (tool === 'recommend_revision' || /\b(what should i study|what to study|study today|revise|revision|weak|weakest|recommend)\b/.test(normalized)) {
    tool = 'recommend_revision';
  } else if (tool === 'get_student_progress' || /\b(progress|how much did i study|study hours|quiz scores|performance|streak|study sessions)\b/.test(normalized)) {
    tool = 'get_student_progress';
    if (subject) args.subject_name = subject.name;
  } else if (tool === 'get_upcoming_tasks' || /\b(upcoming tasks?|what s due|what is due|deadlines?|sessions due)\b/.test(normalized)) {
    tool = 'get_upcoming_tasks';
  }

  if (clarification) {
    return {
      recognizedIntent: tool,
      speech: clarification,
      action: 'ASK_FOR_DETAILS',
      data: null,
      success: false,
      pendingTool: { name: tool, arguments: args },
    };
  }

  if (tool) {
    const result = await executeAlexaTool(tool, args);
    return {
      recognizedIntent: tool,
      speech: result.speechText,
      action: result.success ? tool : 'TOOL_ERROR',
      data: result.data,
      success: result.success,
      toolCall: { name: tool, arguments: args, result },
    };
  }

  const response = await chatWithTutor({
    messages: [
      ...(Array.isArray(context.history) ? context.history.slice(-12) : []),
      { role: 'user', content: text },
    ],
    subjectName: context.subjectName,
    mode: context.mode,
    difficulty: context.difficulty,
  });
  return { recognizedIntent: 'general_query', speech: response, action: 'GENERAL_REPLY', data: null, success: true };
}
