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
import { AlexaToolManifest } from '../src/types.js';

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

export async function executeAlexaTool(
  toolName: string,
  args: Record<string, any> = {}
): Promise<ToolInvocationResult> {
  const timestamp = new Date().toISOString();

  try {
    switch (toolName) {
      case 'create_study_plan': {
        const subjectName = args.subject_name?.trim();
        if (!subjectName) {
          return {
            success: false,
            tool: toolName,
            speechText: 'Please specify the subject name for your study plan.',
            error: 'Missing required argument: subject_name',
            data: null,
            timestamp,
          };
        }

        const subjects = getSubjects();
        let existingSubject = subjects.find(
          (s) => s.name.toLowerCase() === subjectName.toLowerCase()
        );

        const allTopics = getTopics(existingSubject?.id);
        const inputTopics = args.topics
          ? args.topics.split(',').map((t: string) => ({ name: t.trim() }))
          : allTopics.length > 0
          ? allTopics.map((t) => ({ name: t.name, difficulty: t.difficulty, confidenceLevel: t.confidenceLevel }))
          : [
              { name: `${subjectName} Fundamentals` },
              { name: `${subjectName} Core Problem Solving` },
              { name: `${subjectName} Practice & Revision` },
            ];

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

        const examDate = args.exam_date || existingSubject?.examinationDate || new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
        const hoursPerDay = Number(args.hours_per_day) || 2;

        const generated = await generateStudyPlanWithAI({
          subjectName,
          topics: inputTopics,
          examDate,
          hoursPerDay,
          weakTopics,
        });

        // Save plan to persistent DB
        const savedPlan = saveStudyPlan({
          userId: 'user_alexa_01',
          title: generated.title,
          subjectId: existingSubject?.id,
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
          speechText: `I have created and saved a ${generated.totalHours}-hour study plan for ${subjectName} with ${savedPlan.sessions.length} sessions, prioritizing ${weakTopics.length > 0 ? weakTopics.join(', ') : 'upcoming exam topics'}.`,
          data: savedPlan,
          timestamp,
        };
      }

      case 'explain_topic': {
        const topicName = args.topic_name?.trim();
        if (!topicName) {
          return {
            success: false,
            tool: toolName,
            speechText: 'Please provide the topic you would like me to explain.',
            error: 'Missing required argument: topic_name',
            data: null,
            timestamp,
          };
        }

        const difficulty = args.difficulty || 'intermediate';
        const mode = args.mode || 'simple';

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
        const topicName = args.topic_name?.trim();
        if (!topicName) {
          return {
            success: false,
            tool: toolName,
            speechText: 'Please tell me which topic you want to quiz on.',
            error: 'Missing required argument: topic_name',
            data: null,
            timestamp,
          };
        }

        const difficulty = args.difficulty || 'intermediate';
        const numQuestions = Math.min(Math.max(Number(args.num_questions) || 3, 1), 10);

        const questions = await generateQuizWithAI({
          subjectName: 'General Studies',
          topicName,
          difficulty,
          numQuestions,
        });

        return {
          success: true,
          tool: toolName,
          speechText: `I have prepared a ${questions.length}-question ${difficulty} quiz on ${topicName}. Let's test your knowledge!`,
          data: {
            topicName,
            difficulty,
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

        const analytics = computeTopicAnalytics(topics, subjects, attempts, allSessions);
        const strong = analytics.filter((a) => a.status === 'Strong').length;
        const developing = analytics.filter((a) => a.status === 'Developing').length;
        const weak = analytics.filter((a) => a.status === 'Needs revision').length;

        const speech = `You have studied ${user.studyHoursThisWeek} hours this week with a ${user.streakDays}-day streak. Across your tracked topics, ${strong} are strong, ${developing} are developing, and ${weak} need revision.`;

        return {
          success: true,
          tool: toolName,
          speechText: speech,
          data: {
            streakDays: user.streakDays,
            studyHoursThisWeek: user.studyHoursThisWeek,
            totalStudyHours: user.totalStudyHours,
            masterySummary: { strong, developing, needsRevision: weak },
            totalSubjects: subjects.length,
            totalQuizAttempts: attempts.length,
          },
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
        } else {
          speech = `Great job! You have no critical weak topics currently. I recommend reviewing your upcoming examination subjects.`;
        }

        return {
          success: true,
          tool: toolName,
          speechText: speech,
          data: {
            recommendations,
            weakTopics,
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
