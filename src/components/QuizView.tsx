import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
  Clock,
  Award,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Subject, Topic, QuizAttempt, QuizQuestion, QuizAnswerRecord } from '../types.js';
import { api } from '../api.js';

interface QuizViewProps {
  subjects: Subject[];
  topics: Topic[];
  attempts: QuizAttempt[];
  initialTopicId?: string;
  initialTopicName?: string;
  initialQuizQuestions?: QuizQuestion[];
  onConsumeInitialQuiz: () => void;
  onRefreshData: () => void;
  onNavigateToChat: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  subjects,
  topics,
  attempts,
  initialTopicId,
  initialTopicName,
  initialQuizQuestions,
  onConsumeInitialQuiz,
  onRefreshData,
  onNavigateToChat,
}) => {
  // Setup state
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    subjects[0]?.id || ''
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    initialTopicId || topics[0]?.id || ''
  );
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false'>('mcq');
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);

  // Active quiz state
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Completed quiz summary state
  const [completedAttempt, setCompletedAttempt] = useState<QuizAttempt | null>(null);

  // Set topic if passed as prop
  useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
      const top = topics.find((t) => t.id === initialTopicId);
      if (top) setSelectedSubjectId(top.subjectId);
    }
  }, [initialTopicId, topics]);

  useEffect(() => {
    if (initialQuizQuestions?.length) {
      setActiveQuestions(initialQuizQuestions);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setTimerSeconds(0);
      setIsQuizActive(true);
      onConsumeInitialQuiz();
    }
  }, [initialQuizQuestions, onConsumeInitialQuiz]);

  // Quiz timer
  useEffect(() => {
    let interval: any = null;
    if (isQuizActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isQuizActive]);

  const currentSubjectTopics = topics.filter((t) => t.subjectId === selectedSubjectId);
  const selectedTopic = topics.find((t) => t.id === selectedTopicId) || currentSubjectTopics[0];
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  const handleStartQuiz = async () => {
    if (!selectedTopic) return;
    setIsGenerating(true);
    setCompletedAttempt(null);

    try {
      const response = await api.generateAIQuiz({
        subjectName: selectedSubject?.name || 'General',
        topicName: selectedTopic.name,
        difficulty,
        numQuestions,
        questionType,
      });

      if (response.questions && response.questions.length > 0) {
        setActiveQuestions(response.questions);
        setCurrentIndex(0);
        setSelectedAnswers({});
        setTimerSeconds(0);
        setIsQuizActive(true);
      }
    } catch (err: any) {
      alert(`Quiz generation error: ${err.message || 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!activeQuestions || !selectedTopic) return;
    setIsQuizActive(false);

    let correctCount = 0;
    const answerRecords: QuizAnswerRecord[] = activeQuestions.map((q, idx) => {
      const chosen = selectedAnswers[idx] ?? -1;
      const isCorrect = chosen === q.correctAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        question: q.question,
        options: q.options,
        selectedAnswer: chosen,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
        commonMistakes: q.commonMistakes,
      };
    });

    const percentage = Math.round((correctCount / activeQuestions.length) * 100);

    // Save to persistent database
    const attempt = await api.saveQuizAttempt({
      userId: 'user_alexa_01',
      subjectId: selectedTopic.subjectId,
      subjectName: selectedSubject?.name || 'General',
      topicId: selectedTopic.id,
      topicName: selectedTopic.name,
      difficulty,
      score: correctCount,
      totalQuestions: activeQuestions.length,
      percentage,
      timeSpentSeconds: timerSeconds,
      answers: answerRecords,
    });

    setCompletedAttempt(attempt);
    setActiveQuestions(null);
    onRefreshData();

    // Trigger celebration confetti if score >= 80%
    if (percentage >= 80) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Award size={20} className="text-blue-400" />
            <span>Quiz Center & Topic Mastery Assessment</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Diagnostic quizzes powered by Gemini. Real scores feed directly into your Adaptive Learning recommendations.
          </p>
        </div>

        {!isQuizActive && !completedAttempt && (
          <button
            onClick={handleStartQuiz}
            disabled={isGenerating || !selectedTopic}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles size={15} />
            <span>{isGenerating ? 'Generating Quiz...' : 'Start New Quiz'}</span>
          </button>
        )}
      </div>

      {/* VIEW 1: Active Quiz Taking Mode */}
      {isQuizActive && activeQuestions && (
        <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900/80 border border-slate-700 p-6 space-y-6 shadow-xl">
          {/* Quiz Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300">
                {selectedTopic?.name}
              </span>
              <span className="text-xs text-slate-400 ml-2 capitalize">
                • {difficulty} • Question {currentIndex + 1} of {activeQuestions.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                <Clock size={13} className="text-blue-400" />
                <span>
                  {Math.floor(timerSeconds / 60)}:
                  {(timerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / activeQuestions.length) * 100}%`,
              }}
            />
          </div>

          {/* Current Question */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white leading-relaxed">
              {activeQuestions[currentIndex].question}
            </h3>

            {/* Options list */}
            <div className="space-y-2.5">
              {activeQuestions[currentIndex].options.map((option, optIdx) => {
                const isSelected = selectedAnswers[currentIndex] === optIdx;
                const isPracticeRevealed = isPracticeMode && isSelected;
                const isCorrectOption = optIdx === activeQuestions[currentIndex].correctAnswer;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={`w-full p-4 rounded-xl border text-left text-xs md:text-sm font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-600/30 border-purple-500 text-white shadow-sm'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isPracticeRevealed && (
                      <span className="text-xs font-semibold">
                        {isCorrectOption ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={16} /> Correct!
                          </span>
                        ) : (
                          <span className="text-rose-400 flex items-center gap-1">
                            <XCircle size={16} /> Incorrect
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Practice Mode immediate explanation */}
            {isPracticeMode && selectedAnswers[currentIndex] !== undefined && (
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs space-y-1">
                <div className="font-semibold text-purple-300">Explanation:</div>
                <p className="text-slate-300">{activeQuestions[currentIndex].explanation}</p>
              </div>
            )}
          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30"
            >
              Previous
            </button>

            {currentIndex < activeQuestions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1"
              >
                <span>Next Question</span>
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmitQuiz}
                disabled={Object.keys(selectedAnswers).length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-1.5"
              >
                <CheckCircle2 size={16} />
                <span>Submit & View Results</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Completed Quiz Results & Detailed Review */}
      {completedAttempt && (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Result Card */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-purple-500/30 p-6 text-center space-y-4 shadow-xl">
            <div className="inline-flex p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Award size={36} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">Quiz Completed!</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Topic: <strong className="text-white">{completedAttempt.topicName}</strong>
              </p>
            </div>

            <div className="inline-block p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
              <div
                className={`text-4xl font-black font-mono ${
                  completedAttempt.percentage >= 80
                    ? 'text-emerald-400'
                    : completedAttempt.percentage >= 60
                    ? 'text-blue-400'
                    : 'text-rose-400'
                }`}
              >
                {completedAttempt.percentage}%
              </div>
              <div className="text-xs text-slate-400 font-semibold mt-1">
                {completedAttempt.score} of {completedAttempt.totalQuestions} questions correct
              </div>
            </div>

            {/* Adaptive Impact Banner */}
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-left max-w-lg mx-auto flex items-start gap-3">
              <TrendingUp size={18} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  Adaptive Engine Record Updated
                </span>
                <span className="text-slate-300 text-[11px]">
                  {completedAttempt.percentage >= 80
                    ? 'Congratulations! This topic has reached the "Strong" mastery category (>80%).'
                    : completedAttempt.percentage >= 60
                    ? 'Good progress! Retake one more practice quiz to achieve mastery status (>80%).'
                    : 'This topic remains classified as "Needs revision" (<60%). Check the detailed question breakdown below and ask the AI Tutor for clarification.'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={handleStartQuiz}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Retake Quiz</span>
              </button>
              <button
                onClick={onNavigateToChat}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-purple-400" />
                <span>Ask AI Tutor About Incorrect Answers</span>
              </button>
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
              <HelpCircle size={16} className="text-blue-400" />
              <span>Detailed Question Review & Explanations</span>
            </h4>

            <div className="space-y-4">
              {completedAttempt.answers.map((ans, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    ans.isCorrect
                      ? 'bg-emerald-950/10 border-emerald-500/20'
                      : 'bg-rose-950/10 border-rose-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-white text-sm">
                      {idx + 1}. {ans.question}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                        ans.isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {ans.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {ans.options.map((opt, optIdx) => {
                      const wasSelected = ans.selectedAnswer === optIdx;
                      const isTargetCorrect = ans.correctAnswer === optIdx;

                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-lg border text-[11px] font-medium flex items-center justify-between ${
                            isTargetCorrect
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-bold'
                              : wasSelected
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                              : 'bg-slate-800/40 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>
                            {String.fromCharCode(65 + optIdx)}. {opt}
                          </span>
                          {isTargetCorrect && <CheckCircle2 size={13} className="text-emerald-400" />}
                          {!isTargetCorrect && wasSelected && <XCircle size={13} className="text-rose-400" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="pt-2 border-t border-slate-800/80 text-slate-300 space-y-1">
                    <p>
                      <strong className="text-white">Explanation:</strong> {ans.explanation}
                    </p>
                    {ans.commonMistakes && (
                      <p className="text-amber-300/90 text-[11px] flex items-center gap-1">
                        <AlertTriangle size={12} className="shrink-0" />
                        <span>Common Pitfall: {ans.commonMistakes}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Quiz Builder Setup & Historical Attempts */}
      {!isQuizActive && !completedAttempt && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz Generator Configuration */}
          <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles size={16} className="text-purple-400" />
              <span>Configure Your Diagnostic Quiz</span>
            </h3>

            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    const matching = topics.filter((t) => t.subjectId === e.target.value);
                    if (matching[0]) setSelectedTopicId(matching[0].id);
                  }}
                  className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3.5 py-2.5 border border-slate-700"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Topic
                </label>
                <select
                  value={selectedTopicId}
                  onChange={(e) => setSelectedTopicId(e.target.value)}
                  className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3.5 py-2.5 border border-slate-700"
                >
                  {currentSubjectTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Difficulty & Count */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3.5 py-2.5 border border-slate-700"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Number of Questions
                  </label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full bg-slate-800/80 text-white text-xs rounded-xl px-3.5 py-2.5 border border-slate-700"
                  >
                    <option value={3}>3 Questions (Quick Check)</option>
                    <option value={5}>5 Questions (Standard Diagnostic)</option>
                    <option value={10}>10 Questions (Comprehensive Exam)</option>
                  </select>
                </div>
              </div>

              {/* Practice Mode Toggle */}
              <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                <div>
                  <span className="text-xs font-bold text-white block">Practice Mode</span>
                  <span className="text-[11px] text-slate-400">
                    Reveals answers and explanations immediately after each click.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isPracticeMode}
                  onChange={(e) => setIsPracticeMode(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 rounded"
                />
              </div>

              <button
                onClick={handleStartQuiz}
                disabled={isGenerating || !selectedTopic}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>{isGenerating ? 'Generating Quiz...' : 'Start Assessment Quiz'}</span>
              </button>
            </div>
          </div>

          {/* Past Attempts History */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock size={16} className="text-blue-400" />
              <span>Past Quiz Attempts</span>
            </h3>

            {attempts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No quiz history yet. Take your first quiz to generate adaptive progress data!
              </p>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {attempts.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate max-w-[140px]">
                        {att.topicName}
                      </span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          att.percentage >= 80
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : att.percentage >= 60
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {att.percentage}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{att.score}/{att.totalQuestions} correct</span>
                      <span>{new Date(att.attemptedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
