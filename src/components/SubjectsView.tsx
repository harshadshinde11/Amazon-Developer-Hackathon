import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  Star,
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { Subject, Topic } from '../types.js';
import { api } from '../api.js';

interface SubjectsViewProps {
  subjects: Subject[];
  topics: Topic[];
  onRefreshData: () => void;
  onStartQuizWithNotes: (topicId: string, topicName: string) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  subjects,
  topics,
  onRefreshData,
  onStartQuizWithNotes,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );

  // New Subject Modal
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubColor, setNewSubColor] = useState('#8b5cf6');
  const [newSubExamDate, setNewSubExamDate] = useState('');

  // New Topic Modal
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [newTopName, setNewTopName] = useState('');
  const [newTopDifficulty, setNewTopDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [newTopConfidence, setNewTopConfidence] = useState(3);

  // Note analysis & summarization workspace
  const [notesText, setNotesText] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<{
    summary: string;
    keyTakeaways: string[];
    suggestedQuestions: string[];
  } | null>(null);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];
  const activeTopics = topics.filter((t) => t.subjectId === activeSubject?.id);

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    await api.createSubject({
      name: newSubName.trim(),
      code: newSubCode.trim() || newSubName.slice(0, 4).toUpperCase(),
      color: newSubColor,
      examinationDate: newSubExamDate || undefined,
    });

    setNewSubName('');
    setNewSubCode('');
    setShowSubjectModal(false);
    onRefreshData();
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('Are you sure you want to delete this subject and its topics?')) {
      await api.deleteSubject(id);
      onRefreshData();
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopName.trim() || !activeSubject) return;

    await api.createTopic({
      subjectId: activeSubject.id,
      name: newTopName.trim(),
      difficulty: newTopDifficulty,
      confidenceLevel: newTopConfidence,
    });

    setNewTopName('');
    setShowTopicModal(false);
    onRefreshData();
  };

  const handleUpdateTopicConfidence = async (topicId: string, level: number) => {
    await api.updateTopic(topicId, { confidenceLevel: level });
    onRefreshData();
  };

  const handleDeleteTopic = async (topicId: string) => {
    await api.deleteTopic(topicId);
    onRefreshData();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setNotesText(text);
    };
    reader.readAsText(file);
  };

  const handleSummarizeNotes = async () => {
    if (!notesText.trim()) return;
    setIsSummarizing(true);
    setSummaryResult(null);

    try {
      const result = await api.summarizeNotes({
        notesText,
        subjectName: activeSubject?.name || 'General',
      });
      setSummaryResult(result);
    } catch (err: any) {
      alert(`Note summarization error: ${err.message || 'Please try again.'}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 to-blue-950/40 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen size={20} className="text-purple-400" />
            <span>My Subjects, Topics & Notes Workspace</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your academic curricula, topic confidence ratings, and generate notes summaries.
          </p>
        </div>

        <button
          onClick={() => setShowSubjectModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-600/20 transition-all"
        >
          <Plus size={15} />
          <span>+ Add New Subject</span>
        </button>
      </div>

      {/* Subject Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {subjects.map((sub) => {
          const isSelected = activeSubject?.id === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`shrink-0 px-4 py-2.5 rounded-xl font-semibold text-xs whitespace-nowrap transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/25'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: sub.color || '#8b5cf6' }}
              />
              <span>{sub.name}</span>
              <span className="text-[10px] opacity-75">({sub.code})</span>
            </button>
          );
        })}
      </div>

      {activeSubject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Topics List Card */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-blue-400" />
                  <span>Topics in {activeSubject.name}</span>
                </h3>
                {activeSubject.examinationDate && (
                  <span className="text-[11px] text-purple-300 font-mono">
                    Target Examination: {activeSubject.examinationDate}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTopicModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add Topic</span>
                </button>
                <button
                  onClick={() => handleDeleteSubject(activeSubject.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete Subject"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {activeTopics.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No topics added to this subject yet. Click "+ Add Topic" to start tracking.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeTopics.map((top) => (
                  <div
                    key={top.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{top.name}</span>
                        <span className="capitalize text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          {top.difficulty}
                        </span>
                      </div>
                      {top.notes && <p className="text-slate-400 text-[11px]">{top.notes}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Confidence Star Rating */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 mr-1">Confidence:</span>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleUpdateTopicConfidence(top.id, star)}
                            className="text-amber-400 hover:scale-110 transition-transform"
                            title={`Set confidence to ${star}/5`}
                          >
                            <Star
                              size={14}
                              className={star <= top.confidenceLevel ? 'fill-amber-400' : 'text-slate-600'}
                            />
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={() => handleDeleteTopic(top.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400"
                        title="Delete Topic"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes Analysis Workspace */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText size={16} className="text-purple-400" />
              <span>AI Notes Analyzer & Quiz Maker</span>
            </h3>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Paste your lecture notes or upload a text file. StudyPilot will extract core definitions and generate an exam-ready synthesis.
              </p>

              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Paste your study notes here (e.g. key algorithm steps, formulas, lecture excerpts)..."
                rows={6}
                className="w-full bg-slate-800/80 text-white text-xs rounded-xl p-3 border border-slate-700 focus:outline-none focus:border-purple-500 placeholder-slate-500 resize-none font-mono"
              />

              <div className="flex items-center justify-between gap-2">
                <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700">
                  <Upload size={13} />
                  <span>Upload .txt/.md</span>
                  <input
                    type="file"
                    accept=".txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleSummarizeNotes}
                  disabled={!notesText.trim() || isSummarizing}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>{isSummarizing ? 'Analyzing...' : 'Generate AI Summary'}</span>
                </button>
              </div>

              {/* Summary Results */}
              {summaryResult && (
                <div className="mt-4 p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs space-y-3">
                  <div>
                    <span className="font-bold text-purple-300 block mb-1">Executive Summary:</span>
                    <p className="text-slate-200 leading-relaxed">{summaryResult.summary}</p>
                  </div>

                  <div>
                    <span className="font-bold text-purple-300 block mb-1">Key Examination Takeaways:</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-300">
                      {summaryResult.keyTakeaways.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-purple-300 block mb-1">Suggested Checkpoints:</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                      {summaryResult.suggestedQuestions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Add New Subject</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    value={newSubCode}
                    onChange={(e) => setNewSubCode(e.target.value)}
                    placeholder="e.g. CS301"
                    className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Exam Date</label>
                  <input
                    type="date"
                    value={newSubExamDate}
                    onChange={(e) => setNewSubExamDate(e.target.value)}
                    className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Topic Modal */}
      {showTopicModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-3">Add Topic to {activeSubject?.name}</h3>
            <form onSubmit={handleCreateTopic} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Topic Name</label>
                <input
                  type="text"
                  value={newTopName}
                  onChange={(e) => setNewTopName(e.target.value)}
                  placeholder="e.g. Virtual Memory & Page Replacement"
                  className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={newTopDifficulty}
                    onChange={(e) => setNewTopDifficulty(e.target.value as any)}
                    className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confidence (1-5)</label>
                  <select
                    value={newTopConfidence}
                    onChange={(e) => setNewTopConfidence(Number(e.target.value))}
                    className="w-full bg-slate-800 text-white text-xs rounded-xl px-3 py-2 border border-slate-700"
                  >
                    <option value={1}>1 - Novice</option>
                    <option value={2}>2 - Struggling</option>
                    <option value={3}>3 - Average</option>
                    <option value={4}>4 - Confident</option>
                    <option value={5}>5 - Mastered</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                >
                  Save Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
