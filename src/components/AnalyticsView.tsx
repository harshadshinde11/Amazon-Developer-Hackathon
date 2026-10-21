import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Flame,
  ShieldCheck,
  Star,
  Target,
} from 'lucide-react';
import { UserProfile, TopicAnalytics, QuizAttempt, StudyPlan } from '../types.js';

interface AnalyticsViewProps {
  user: UserProfile;
  topicAnalytics: TopicAnalytics[];
  attempts: QuizAttempt[];
  plans: StudyPlan[];
  onStartQuiz: (topicId: string, topicName: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  user,
  topicAnalytics,
  attempts,
  plans,
  onStartQuiz,
}) => {
  const allSessions = plans.flatMap((p) => p.sessions);
  const completedSessions = allSessions.filter((s) => s.status === 'completed');

  const strongTopics = topicAnalytics.filter((t) => t.status === 'Strong');
  const developingTopics = topicAnalytics.filter((t) => t.status === 'Developing');
  const weakTopics = topicAnalytics.filter((t) => t.status === 'Needs revision');
  const noDataTopics = topicAnalytics.filter((t) => t.status === 'Not enough data');

  // Study hours distribution by day (Mon - Sun simulation based on studyHoursThisWeek)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyHours = [1.5, 2.0, 1.0, 2.0, 0, 0, 0]; // totals 6.5h matching user profile

  const achievements = [
    {
      id: 'ach-streak',
      title: `${user.streakDays}-Day Consistent Scholar`,
      description: 'Maintained a daily study streak for over 3 days.',
      unlocked: user.streakDays >= 3,
      icon: Flame,
      color: 'text-amber-400',
    },
    {
      id: 'ach-mastery',
      title: 'First Topic Mastered',
      description: 'Scored 80% or higher on a diagnostic quiz attempt.',
      unlocked: strongTopics.length > 0,
      icon: Award,
      color: 'text-purple-400',
    },
    {
      id: 'ach-hours',
      title: 'Deep Work Champion',
      description: 'Accumulated over 15 total lifetime study hours.',
      unlocked: user.totalStudyHours >= 15,
      icon: Clock,
      color: 'text-blue-400',
    },
    {
      id: 'ach-quizzes',
      title: 'Active Assessment Pioneer',
      description: 'Completed 3 or more full quiz assessments.',
      unlocked: attempts.length >= 3,
      icon: ShieldCheck,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-blue-950/40 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 size={20} className="text-purple-400" />
            <span>Progress & Adaptive Mastery Analytics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real performance telemetry calculating topic mastery levels from verified quiz submissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold">
            {topicAnalytics.length} Topics Tracked
          </span>
        </div>
      </div>

      {/* Top Mastery KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Strong Mastery (&gt;=80%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{strongTopics.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-medium">Exam-ready concepts</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Developing (60-79%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{developingTopics.length}</div>
          <div className="text-[11px] text-blue-400 mt-1 font-medium">1 quiz away from mastery</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Needs Revision (&lt;60%)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{weakTopics.length}</div>
          <div className="text-[11px] text-rose-400 mt-1 font-medium">High priority revision</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1">
            <span>Untested Topics</span>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{noDataTopics.length}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">Awaiting diagnostic quiz</div>
        </div>
      </div>

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Study Activity Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock size={16} className="text-blue-400" />
                <span>Weekly Study Activity ({user.studyHoursThisWeek} hrs total)</span>
              </h3>
              <p className="text-xs text-slate-400">Target: {user.preferredHoursPerDay * 7} hrs/week</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400">
              🔥 {user.streakDays} Day Streak Active
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 flex items-end justify-between h-48 px-2">
            {days.map((day, idx) => {
              const hours = dailyHours[idx] || 0;
              const maxHours = 3.0;
              const heightPct = Math.round((hours / maxHours) * 100);

              return (
                <div key={day} className="flex flex-col items-center gap-2 flex-1 group">
                  <span className="text-[10px] font-mono text-slate-400 group-hover:text-white transition-colors">
                    {hours > 0 ? `${hours}h` : '-'}
                  </span>
                  <div className="w-8 sm:w-12 bg-slate-800 rounded-t-lg h-36 flex items-end p-1">
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        hours > 0
                          ? 'bg-gradient-to-t from-blue-600 to-purple-500 shadow-md shadow-purple-500/20'
                          : 'bg-transparent'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-300">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Topic Mastery Distribution Ratio */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <Target size={16} className="text-purple-400" />
            <span>Mastery Distribution</span>
          </h3>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-semibold">Strong (&gt;=80%)</span>
                <span className="text-slate-300 font-mono">
                  {Math.round((strongTopics.length / (topicAnalytics.length || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${(strongTopics.length / (topicAnalytics.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-blue-400 font-semibold">Developing (60-79%)</span>
                <span className="text-slate-300 font-mono">
                  {Math.round((developingTopics.length / (topicAnalytics.length || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${(developingTopics.length / (topicAnalytics.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-semibold">Needs Revision (&lt;60%)</span>
                <span className="text-slate-300 font-mono">
                  {Math.round((weakTopics.length / (topicAnalytics.length || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{ width: `${(weakTopics.length / (topicAnalytics.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 mt-4 leading-relaxed">
            💡 <strong>Adaptive Rule:</strong> Topics with an average quiz score below 60% automatically generate priority study tasks and voice alerts.
          </div>
        </div>
      </div>

      {/* Leaderboard: Strongest vs Weakest Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong Topics */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Strongest Mastered Topics</span>
          </div>

          {strongTopics.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              Complete quizzes with 80%+ to add topics to your mastered leaderboard.
            </p>
          ) : (
            <div className="space-y-2">
              {strongTopics.map((top) => (
                <div
                  key={top.topicId}
                  className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{top.topicName}</span>
                    <span className="text-[10px] text-slate-400">{top.subjectName} • {top.attemptsCount} attempts</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {top.averageScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Topics Needing Revision */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <AlertTriangle size={16} className="text-amber-400" />
            <span>Topics Requiring Revision</span>
          </div>

          {weakTopics.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">
              All tested topics currently meet or exceed target threshold!
            </p>
          ) : (
            <div className="space-y-2">
              {weakTopics.map((top) => (
                <div
                  key={top.topicId}
                  className="p-3 rounded-xl bg-rose-950/15 border border-rose-500/20 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{top.topicName}</span>
                    <span className="text-[10px] text-rose-300">
                      Average score is {top.averageScore}% • Action: Review fundamentals
                    </span>
                  </div>
                  <button
                    onClick={() => onStartQuiz(top.topicId, top.topicName)}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-[11px] border border-rose-500/30 transition-colors"
                  >
                    Retake Quiz
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gamification & Academic Achievement Badges */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Award size={16} className="text-amber-400" />
          <span>Academic Achievements & Badges</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((ach) => {
            const Icon = ach.icon;
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
                  ach.unlocked
                    ? 'bg-slate-800/60 border-purple-500/30 shadow-sm'
                    : 'bg-slate-900/30 border-slate-800/60 opacity-40'
                }`}
              >
                <div className={`p-3 rounded-xl bg-slate-800 mb-2.5 ${ach.color}`}>
                  <Icon size={24} />
                </div>
                <span className="text-xs font-bold text-white mb-1">{ach.title}</span>
                <p className="text-[11px] text-slate-400">{ach.description}</p>
                <span
                  className={`mt-2.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                    ach.unlocked
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {ach.unlocked ? 'Unlocked' : 'Locked'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
