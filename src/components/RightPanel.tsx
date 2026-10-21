import React from 'react';
import { Calendar, CheckCircle2, ChevronRight, Clock, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';
import { StudySession, Subject, TopicAnalytics } from '../types.js';

interface RightPanelProps {
  sessions: StudySession[];
  subjects: Subject[];
  topicAnalytics: TopicAnalytics[];
  onCompleteSession: (planId: string, sessionId: string) => void;
  onNavigate: (view: any) => void;
  onStartQuiz: (topicId: string, topicName: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  sessions,
  subjects,
  topicAnalytics,
  onCompleteSession,
  onNavigate,
  onStartQuiz,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter((s) => s.scheduledDate === todayStr);

  const upcomingExams = subjects
    .filter((s) => s.examinationDate)
    .map((s) => {
      const examDate = new Date(s.examinationDate!);
      const today = new Date();
      const diffDays = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...s, diffDays };
    })
    .filter((s) => s.diffDays >= 0)
    .sort((a, b) => a.diffDays - b.diffDays);

  const weakTopics = topicAnalytics.filter((t) => t.status === 'Needs revision');

  return (
    <aside className="w-80 border-l border-slate-800/80 bg-[#0a0f24]/50 backdrop-blur-sm p-4 hidden xl:flex flex-col gap-5 overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Weak Topics Revision Alert */}
      {weakTopics.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-400 mb-1">
            <AlertTriangle size={15} />
            <span>Targeted Revision Alert</span>
          </div>
          <p className="text-slate-300 text-[11px] mb-2 leading-relaxed">
            <strong>{weakTopics[0].topicName}</strong> scored {weakTopics[0].averageScore}%. Complete a 5-question targeted quiz to boost your topic mastery.
          </p>
          <button
            onClick={() => onStartQuiz(weakTopics[0].topicId, weakTopics[0].topicName)}
            className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold flex items-center justify-center gap-1 transition-colors"
          >
            <span>Take Recovery Quiz</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Today's Schedule Card */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Calendar size={15} className="text-purple-400" />
            <span>Today's Sessions</span>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
            {todaySessions.filter((s) => s.status === 'completed').length}/{todaySessions.length} done
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            No study sessions scheduled for today.
            <button
              onClick={() => onNavigate('planner')}
              className="mt-2 block w-full text-center text-purple-400 hover:text-purple-300 font-medium"
            >
              + Generate Study Plan
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className={`p-2.5 rounded-lg border text-xs transition-all ${
                  session.status === 'completed'
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-200 hover:border-purple-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <span className="font-semibold block truncate text-white">
                      {session.topicName}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> {session.startTime} ({session.durationMinutes}m)
                    </span>
                  </div>
                  <button
                    onClick={() => onCompleteSession(session.studyPlanId, session.id)}
                    className={`p-1 rounded transition-colors ${
                      session.status === 'completed'
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-500 hover:text-purple-400'
                    }`}
                    title={session.status === 'completed' ? 'Completed' : 'Mark Complete'}
                  >
                    <CheckCircle2 size={18} className={session.status === 'completed' ? 'fill-emerald-500/20' : ''} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Examinations */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <BookOpen size={15} className="text-blue-400" />
            <span>Upcoming Exams</span>
          </div>
          <button
            onClick={() => onNavigate('subjects')}
            className="text-[10px] text-blue-400 hover:underline"
          >
            Manage
          </button>
        </div>

        {upcomingExams.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">
            No exams scheduled. Add target dates in My Subjects.
          </p>
        ) : (
          <div className="space-y-2.5">
            {upcomingExams.slice(0, 3).map((exam) => (
              <div
                key={exam.id}
                className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-semibold text-slate-200 block truncate max-w-[140px]">
                    {exam.name}
                  </span>
                  <span className="text-[10px] text-slate-400">{exam.examinationDate}</span>
                </div>
                <div
                  className={`px-2 py-1 rounded text-[11px] font-bold ${
                    exam.diffDays <= 7
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {exam.diffDays === 0 ? 'Today' : `${exam.diffDays}d left`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Launch Cards */}
      <div className="mt-auto space-y-2">
        <button
          onClick={() => onNavigate('chat')}
          className="w-full p-2.5 rounded-xl bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/30 flex items-center justify-between text-xs font-semibold text-white transition-all"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-400" />
            <span>Ask AI Tutor a Question</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
        </button>
      </div>
    </aside>
  );
};
