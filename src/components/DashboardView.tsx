import React from 'react';
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Brain,
  MessageSquare,
  Mic,
  Award,
} from 'lucide-react';
import { UserProfile, Subject, StudyPlan, QuizAttempt, TopicAnalytics, AdaptiveRecommendation } from '../types.js';
import { NavView } from './Sidebar.js';

interface DashboardViewProps {
  user: UserProfile;
  subjects: Subject[];
  plans: StudyPlan[];
  quizAttempts: QuizAttempt[];
  topicAnalytics: TopicAnalytics[];
  recommendations: AdaptiveRecommendation[];
  onNavigate: (view: NavView) => void;
  onStartAdaptiveCoach: () => void;
  onStartQuiz: (topicId?: string, topicName?: string) => void;
  onCompleteSession: (planId: string, sessionId: string) => void;
  onResetDemo: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  subjects,
  plans,
  quizAttempts,
  topicAnalytics,
  recommendations,
  onNavigate,
  onStartAdaptiveCoach,
  onStartQuiz,
  onCompleteSession,
  onResetDemo,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const allSessions = plans.flatMap((p) => p.sessions.map((s) => ({ ...s, planId: p.id })));
  const todaySessions = allSessions.filter((s) => s.scheduledDate === todayStr);
  const completedToday = todaySessions.filter((s) => s.status === 'completed');

  const weakTopics = topicAnalytics.filter((t) => t.status === 'Needs revision');
  const strongTopics = topicAnalytics.filter((t) => t.status === 'Strong');
  const nextRecommendedSession = allSessions
    .filter((session) => session.status === 'pending' && session.scheduledDate >= todayStr)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate) || a.startTime.localeCompare(b.startTime))[0];
  const nextExamSubject = subjects
    .filter((subject) => subject.examinationDate && subject.examinationDate >= todayStr)
    .sort((a, b) => (a.examinationDate || '').localeCompare(b.examinationDate || ''))[0];
  const examDaysLeft = nextExamSubject?.examinationDate
    ? Math.ceil((new Date(`${nextExamSubject.examinationDate}T00:00:00.000Z`).getTime() - new Date(`${todayStr}T00:00:00.000Z`).getTime()) / 86400000)
    : undefined;
  const totalPlannedSessions = allSessions.length;
  const completedPlannedSessions = allSessions.filter((session) => session.status === 'completed').length;
  const planCompletion = totalPlannedSessions ? Math.round(completedPlannedSessions / totalPlannedSessions * 100) : 0;

  // Empty state handling
  const isEmptyState = subjects.length === 0 && quizAttempts.length === 0 && plans.length === 0;

  if (isEmptyState) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto mb-4">
          <Brain size={32} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to StudyPilot AI!</h2>
        <p className="text-slate-400 max-w-md mx-auto text-sm mb-6">
          Your personal AI study partner is ready. Start by adding a subject, creating an intelligent study plan, or loading our demonstration scenario.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onResetDemo}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/25 transition-all"
          >
            Load Hackathon Demo Data
          </button>
          <button
            onClick={() => onNavigate('subjects')}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
          >
            Add Your First Subject
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-blue-900/40 border border-purple-500/20 p-6">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles size={13} className="text-purple-400" />
              <span>Hackathon demo workspace</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Good day, {user.displayName || 'Student'}! 👋
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              "Study smarter. Learn faster. Achieve more." You're currently on a{' '}
              <strong className="text-amber-400 font-semibold">{user.streakDays}-day study streak</strong>.
              Let's conquer your academic milestones today.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('voice')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20"
            >
              <Mic size={16} />
              <span>Voice Assistant</span>
            </button>
            <button
              onClick={() => onNavigate('planner')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/20"
            >
              <Calendar size={16} />
              <span>Study Planner</span>
            </button>
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <section className="rounded-xl border border-cyan-500/25 bg-slate-900/60 p-5" aria-labelledby="adaptive-coach-heading">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-cyan-200">
              <Brain size={17} />
              <h3 id="adaptive-coach-heading" className="text-sm font-bold">StudyPilot Adaptive Coach</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {topicAnalytics.some((topic) => topic.attemptsCount > 0)
                ? 'Recommendations are based on your saved quiz attempts and study sessions.'
                : 'No quiz history yet. Take a diagnostic quiz to establish a baseline; no weak areas are inferred.'}
            </p>
          </div>
          <button
            onClick={onStartAdaptiveCoach}
            className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            {topicAnalytics.some((topic) => topic.attemptsCount > 0) ? 'Ask Adaptive Coach' : 'Start diagnostic with Coach'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Weak topics</p>
            {weakTopics.length
              ? weakTopics.slice(0, 3).map((topic) => (
                <p key={topic.topicId} className="mt-1 text-xs text-amber-200">{topic.topicName} · {topic.averageScore}% ({topic.attemptsCount} attempts)</p>
              ))
              : <p className="mt-1 text-xs text-slate-300">{topicAnalytics.some((topic) => topic.attemptsCount > 0) ? 'No saved topics below 60%.' : 'Awaiting diagnostic results.'}</p>}
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Next recommended task</p>
            <p className="mt-1 text-xs font-semibold text-slate-200">{nextRecommendedSession?.topicName || (weakTopics[0] ? `Diagnostic review: ${weakTopics[0].topicName}` : 'No pending plan tasks')}</p>
            {nextRecommendedSession && <p className="mt-0.5 text-[11px] text-slate-400">{nextRecommendedSession.scheduledDate} · {nextRecommendedSession.durationMinutes} min</p>}
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-semibold uppercase text-slate-500">Exam and plan progress</p>
            <p className="mt-1 text-xs font-semibold text-slate-200">
              {nextExamSubject ? `${nextExamSubject.name} · ${examDaysLeft === 0 ? 'exam today' : `${examDaysLeft} days left`}` : 'No upcoming exam date saved'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{completedPlannedSessions}/{totalPlannedSessions} planned sessions complete · {planCompletion}%</p>
          </div>
        </div>
      </section>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Flame size={24} className="fill-amber-400/20 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{user.streakDays} Days</div>
            <div className="text-xs text-slate-400 font-medium">Study Streak</div>
          </div>
        </div>

        {/* Study Hours This Week */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">{user.studyHoursThisWeek} hrs</div>
            <div className="text-xs text-slate-400 font-medium">This Week</div>
          </div>
        </div>

        {/* Sessions Completed */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {completedToday.length}/{todaySessions.length || 0}
            </div>
            <div className="text-xs text-slate-400 font-medium">Today's Sessions</div>
          </div>
        </div>

        {/* Topic Mastery Ratio */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {strongTopics.length}/{topicAnalytics.length}
            </div>
            <div className="text-xs text-slate-400 font-medium">Topics Mastered</div>
          </div>
        </div>
      </div>

      {/* Adaptive Revision Alert Banner (Section 8 Core Feature) */}
      {weakTopics.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/60 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                <span>Adaptive Learning Engine Alert</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                  Priority Action
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {weakTopics[0].topicName} ({weakTopics[0].subjectName}) requires revision
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Your average quiz score on this topic is {weakTopics[0].averageScore}%.
                Targeted practice will bridge the concept gap.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-center">
            <button
              onClick={() => onStartQuiz(weakTopics[0].topicId, weakTopics[0].topicName)}
              className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Take Targeted Quiz</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Today's Schedule & Subject Mastery */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule (2 cols on lg) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white">Today's Study Schedule</h3>
            </div>
            <button
              onClick={() => onNavigate('planner')}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              <span>Open Planner</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div className="py-8 text-center bg-slate-800/20 rounded-xl border border-dashed border-slate-800">
              <Clock size={28} className="mx-auto text-slate-500 mb-2" />
              <p className="text-xs text-slate-300 font-medium">No sessions scheduled for today</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
                Generate an exam-aligned study plan or speak to the voice assistant.
              </p>
              <button
                onClick={() => onNavigate('planner')}
                className="mt-3 px-3.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold border border-purple-500/30"
              >
                + Create Plan
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    session.status === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {session.subjectName}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {session.startTime} ({session.durationMinutes} min)
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1.5">{session.topicName}</h4>
                      <p className="text-xs text-slate-400 mt-1">{session.learningObjective}</p>
                    </div>

                    <button
                      onClick={() => onCompleteSession(session.planId, session.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        session.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-700 hover:bg-purple-600 text-white'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      <span>{session.status === 'completed' ? 'Done' : 'Complete'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject-Wise Progress & Recent Quizzes */}
        <div className="space-y-6">
          {/* Subjects Progress */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Brain size={16} className="text-blue-400" />
                <span>Subject Progress</span>
              </h3>
              <button
                onClick={() => onNavigate('subjects')}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {subjects.slice(0, 3).map((sub) => {
                const subTopics = topicAnalytics.filter((t) => t.subjectId === sub.id);
                const strongInSub = subTopics.filter((t) => t.status === 'Strong').length;
                const ratio = subTopics.length > 0 ? Math.round((strongInSub / subTopics.length) * 100) : 0;

                return (
                  <div key={sub.id} className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-200">{sub.name}</span>
                      <span className="text-slate-400 font-mono">{ratio}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${ratio}%`,
                          backgroundColor: sub.color || '#8b5cf6',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5">
                      <span>{subTopics.length} topics tracked</span>
                      {sub.examinationDate && (
                        <span className="text-purple-300">Exam: {sub.examinationDate}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Quiz Attempts */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Award size={16} className="text-amber-400" />
                <span>Recent Quizzes</span>
              </h3>
              <button
                onClick={() => onNavigate('quiz')}
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                Quiz Center
              </button>
            </div>

            {quizAttempts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">
                No quiz attempts yet. Test your knowledge in the Quiz Center!
              </p>
            ) : (
              <div className="space-y-2">
                {quizAttempts.slice(0, 3).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 truncate max-w-[150px]">
                        {attempt.topicName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(attempt.attemptedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded font-bold font-mono text-xs ${
                        attempt.percentage >= 80
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : attempt.percentage >= 60
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {attempt.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Footer Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('chat')}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 flex items-center gap-3 transition-all text-left group"
        >
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <MessageSquare size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Ask AI Tutor</div>
            <div className="text-[11px] text-slate-400">Concept explanations & exam prep</div>
          </div>
        </button>

        <button
          onClick={() => onStartQuiz()}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/40 flex items-center gap-3 transition-all text-left group"
        >
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Take Practice Quiz</div>
            <div className="text-[11px] text-slate-400">Diagnostic questions & instant scoring</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('alexa-plus')}
          className="p-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 flex items-center gap-3 transition-all text-left group"
        >
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Alexa+ Tools Inspector</div>
            <div className="text-[11px] text-slate-400">Hackathon 2026 test harness</div>
          </div>
        </button>
      </div>
    </div>
  );
};
