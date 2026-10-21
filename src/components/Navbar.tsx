import React from 'react';
import { Menu, Mic, Flame, Clock, RefreshCw, Sparkles } from 'lucide-react';
import { NavView } from './Sidebar.js';

interface NavbarProps {
  currentView: NavView;
  onOpenMobileMenu: () => void;
  onOpenVoice: () => void;
  onOpenAlexaTools: () => void;
  streakDays: number;
  studyHoursThisWeek: number;
  onResetDemo: () => void;
  isDemoLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenMobileMenu,
  onOpenVoice,
  onOpenAlexaTools,
  streakDays,
  studyHoursThisWeek,
  onResetDemo,
  isDemoLoading = false,
}) => {
  const titles: Record<NavView, { title: string; subtitle: string }> = {
    dashboard: { title: 'Study Dashboard', subtitle: 'Welcome back! Today is a great day to learn.' },
    chat: { title: 'AI Study Chat', subtitle: 'Conversational tutor powered by Gemini 3.8 Flash' },
    voice: { title: 'Alexa-Inspired Voice Assistant', subtitle: 'Speak naturally to manage plans, quizzes, and topics' },
    planner: { title: 'AI Study Planner', subtitle: 'Targeted schedules aligned with your upcoming exams' },
    quiz: { title: 'Quiz Center & Assessment', subtitle: 'Adaptive diagnostic quizzes with detailed reviews' },
    subjects: { title: 'My Subjects & Notes', subtitle: 'Organize coursework, topics, and auto-summarize notes' },
    analytics: { title: 'Progress & Mastery Analytics', subtitle: 'Adaptive insights, streak metrics, and topic ratings' },
    'alexa-plus': { title: 'Amazon Developer Hackathon 2026', subtitle: 'Alexa+-inspired in-app tool simulation' },
    settings: { title: 'Settings & Preferences', subtitle: 'Configure study targets, voice, and test datasets' },
  };

  const currentInfo = titles[currentView] || { title: 'StudyPilot AI', subtitle: 'Your Personal AI Study Partner' };

  return (
    <header className="sticky top-0 z-30 w-full min-h-16 py-2.5 bg-[#070913]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none shrink-0"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0">
          <h1 className="text-base lg:text-lg font-bold text-white tracking-tight leading-snug flex items-center gap-2 truncate sm:overflow-visible sm:whitespace-normal">
            {currentInfo.title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block truncate">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {/* Streak Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Flame size={14} className="fill-amber-400 animate-pulse" />
          <span>{streakDays}d Streak</span>
        </div>

        {/* Weekly Hours */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
          <Clock size={14} />
          <span>{studyHoursThisWeek}h this week</span>
        </div>

        {/* Demo Data Reset Button */}
        <button
          onClick={onResetDemo}
          disabled={isDemoLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
          title="Reload Demo Dataset"
        >
          <RefreshCw size={13} className={isDemoLoading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Demo Data</span>
        </button>

        {/* Hackathon Alexa+ button */}
        <button
          onClick={onOpenAlexaTools}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 transition-all hover:scale-105"
        >
          <Sparkles size={14} className="text-purple-400" />
          <span className="hidden sm:inline">Alexa+ Tools</span>
        </button>

        {/* Voice Orb Launcher Button */}
        <button
          onClick={onOpenVoice}
          className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all duration-200 hover:scale-105"
        >
          <Mic size={14} className="animate-bounce" />
          <span>Voice</span>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
          </span>
        </button>
      </div>
    </header>
  );
};
