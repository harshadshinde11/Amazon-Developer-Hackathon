import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  AlertTriangle,
  BookOpen,
  Filter,
  Check,
} from 'lucide-react';
import { StudyPlan, Subject, TopicAnalytics } from '../types.js';
import { api } from '../api.js';

interface PlannerViewProps {
  plans: StudyPlan[];
  subjects: Subject[];
  activeSubjectId: string;
  onRefreshPlans: () => void;
  onCompleteSession: (planId: string, sessionId: string) => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  plans,
  subjects,
  activeSubjectId,
  onRefreshPlans,
  onCompleteSession,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filterView, setFilterView] = useState<'all' | 'today' | 'upcoming'>('all');

  // Form fields
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(() => {
    const initialSubject = activeSubjectId || subjects.find((subject) => !subject.archivedAt)?.id;
    return initialSubject ? [initialSubject] : [];
  });
  const [examDate, setExamDate] = useState<string>(
    new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
  );
  const [hoursPerDay, setHoursPerDay] = useState<number>(2);

  const selectedSubjects = subjects.filter((subject) => selectedSubjectIds.includes(subject.id) && !subject.archivedAt);

  React.useEffect(() => {
    if (activeSubjectId) setSelectedSubjectIds([activeSubjectId]);
  }, [activeSubjectId]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) return;

    setIsGenerating(true);
    try {
      await api.createSubjectStudyPlan({
        subjectIds: selectedSubjects.map((subject) => subject.id),
        examDate,
        hoursPerDay,
      });

      onRefreshPlans();
      setShowModal(false);
    } catch (err) {
      alert(`Plan generation error: ${err instanceof Error ? err.message : 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Are you sure you want to delete this study plan?')) {
      await api.deletePlan(id);
      onRefreshPlans();
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-500/20">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar size={20} className="text-purple-400" />
            <span>AI Study Planner & Adaptive Schedule</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Smart scheduling prioritizing weak topics and upcoming examinations without conflicts.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all"
        >
          <Sparkles size={15} />
          <span>+ Generate New Plan</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
          <Filter size={13} /> Filter:
        </span>
        {(['all', 'today', 'upcoming'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterView(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              filterView === tab
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'all' ? 'All Plans' : tab === 'today' ? "Today's Sessions" : 'Upcoming Days'}
          </button>
        ))}
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-800">
          <Calendar size={36} className="mx-auto text-slate-500 mb-3" />
          <h3 className="text-base font-bold text-white">No Study Plans Generated</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Click "Generate New Plan" to create an exam-ready schedule using your subjects and topic scores.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
          >
            Generate Study Plan
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => {
            let filteredSessions = plan.sessions;
            if (filterView === 'today') {
              filteredSessions = plan.sessions.filter((s) => s.scheduledDate === todayStr);
            } else if (filterView === 'upcoming') {
              filteredSessions = plan.sessions.filter((s) => s.scheduledDate >= todayStr);
            }

            const completedCount = plan.sessions.filter((s) => s.status === 'completed').length;
            const progressPct = Math.round((completedCount / (plan.sessions.length || 1)) * 100);

            return (
              <div
                key={plan.id}
                className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 space-y-4 shadow-sm"
              >
                {/* Plan Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {plan.subjectName}
                      </span>
                      {plan.examDate && (
                        <span className="text-xs text-slate-400 font-mono">
                          Target Exam: {plan.examDate}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{plan.title}</h3>
                    {plan.priorityRationale && (
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl flex items-start gap-1.5">
                        <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>{plan.priorityRationale}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">
                        {completedCount}/{plan.sessions.length} Completed ({progressPct}%)
                      </div>
                      <div className="text-[10px] text-slate-400">Total {plan.totalHours} hrs planned</div>
                    </div>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete Plan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Sessions Timeline Cards */}
                <div className="space-y-2.5">
                  {filteredSessions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 text-center">
                      No sessions match this filter for {plan.title}.
                    </p>
                  ) : (
                    filteredSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                          session.status === 'completed'
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-400'
                            : 'bg-slate-800/40 border-slate-700/60 hover:border-purple-500/30'
                        }`}
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-purple-300">
                              📅 {session.scheduledDate}
                            </span>
                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
                              {session.subjectName}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock size={12} /> {session.startTime} ({session.durationMinutes} min)
                            </span>
                            {session.scheduledDate === todayStr && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                DUE TODAY
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-white">{session.topicName}</h4>
                          <p className="text-xs text-slate-300">
                            <strong>Objective:</strong> {session.learningObjective}
                          </p>
                          <div className="flex flex-wrap gap-3 text-[11px] text-slate-400 pt-0.5">
                            <span>💡 Activity: {session.recommendedActivity}</span>
                            <span>📝 Revision: {session.revisionTask}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => onCompleteSession(plan.id, session.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              session.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
                            }`}
                          >
                            <CheckCircle2 size={14} />
                            <span>{session.status === 'completed' ? 'Completed' : 'Mark Done'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-purple-400" />
              <span>Generate AI Study Plan</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Choose one subject or combine several. Saved quiz performance and pending sessions inform the schedule.
            </p>

            <form onSubmit={handleCreatePlan} className="space-y-3.5">
              <div>
                <fieldset>
                  <legend className="block text-xs font-semibold text-slate-300 mb-1">Subjects to prepare</legend>
                  <div className="max-h-36 space-y-1 overflow-y-auto rounded-xl border border-slate-700 bg-slate-800 p-2">
                    {subjects.filter((subject) => !subject.archivedAt).map((subject) => (
                      <label key={subject.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-200 hover:bg-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.includes(subject.id)}
                          onChange={(event) => setSelectedSubjectIds((current) => event.target.checked
                            ? [...current, subject.id]
                            : current.filter((id) => id !== subject.id))}
                          className="accent-purple-500"
                        />
                        <span>{subject.name} ({subject.code})</span>
                      </label>
                    ))}
                    {subjects.every((subject) => subject.archivedAt) && (
                      <p className="px-2 py-1 text-xs text-slate-400">Add an active subject before planning.</p>
                    )}
                  </div>
                </fieldset>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Examination Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  min={todayStr}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Available Study Hours Per Day: <strong className="text-white">{hoursPerDay}h</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || selectedSubjects.length === 0}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isGenerating ? (
                    <>
                      <Sparkles size={14} className="animate-spin" />
                      <span>Optimizing Plan...</span>
                    </>
                  ) : (
                    <span>Create Plan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
