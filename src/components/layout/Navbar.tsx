import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Mic,
  Flame,
  Clock,
  RefreshCw,
  Sparkles,
  Search,
  Bell,
  Check,
} from 'lucide-react';

interface NavbarProps {
  onOpenMobileMenu: () => void;
  streakDays: number;
  studyHoursThisWeek: number;
  onResetDemo: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenMobileMenu,
  streakDays,
  studyHoursThisWeek,
  onResetDemo,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  const titles: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Study Dashboard', subtitle: 'Welcome back! Today is a great day to learn.' },
    '/chat': { title: 'AI Study Chat', subtitle: 'Gemini when configured; otherwise clearly labeled demo responses' },
    '/voice': { title: 'Voice Assistant', subtitle: 'Speak naturally to manage plans, quizzes, and topics' },
    '/planner': { title: 'AI Study Planner', subtitle: 'Targeted schedules aligned with your upcoming exams' },
    '/quiz': { title: 'Quiz Center & Assessment', subtitle: 'Adaptive diagnostic quizzes with detailed reviews' },
    '/subjects': { title: 'My Subjects & Notes', subtitle: 'Organize coursework, topics, and auto-summarize notes' },
    '/analytics': { title: 'Progress Analytics', subtitle: 'Performance charts, streak metrics, and topic mastery ratings' },
    '/alexa-plus': { title: 'Study Assistant Tools', subtitle: 'Alexa+-inspired local web simulation; no runtime or MCP connection' },
    '/settings': { title: 'Settings & Preferences', subtitle: 'Configure study targets, speech synthesis, and datasets' },
  };

  const currentInfo = titles[location.pathname] || {
    title: 'StudyPilot AI',
    subtitle: 'Your Personal AI Study Partner',
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/chat?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleDemoClick = async () => {
    setIsDemoLoading(true);
    try {
      await onResetDemo();
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#070913]/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="truncate">
          <h1 className="text-base lg:text-lg font-bold text-white tracking-tight flex items-center gap-2 truncate">
            {currentInfo.title}
          </h1>
          <p className="text-xs text-slate-400 hidden sm:block truncate">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Center Search Input */}
      <form
        onSubmit={handleSearchSubmit}
        className="hidden md:flex items-center relative flex-1 max-w-xs"
      >
        <Search size={14} className="absolute left-3 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search topics or ask a question..."
          className="w-full bg-slate-900/80 text-white text-xs rounded-xl pl-9 pr-3 py-1.5 border border-slate-700/80 focus:outline-none focus:border-purple-500 placeholder-slate-500"
        />
      </form>

      <div className="flex items-center gap-2 lg:gap-3 shrink-0">
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

        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationToast(!showNotificationToast)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500" />
          </button>

          {showNotificationToast && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 p-3 shadow-2xl z-50 text-xs">
              <div className="font-bold text-white mb-1 flex items-center justify-between">
                <span>Study Notifications</span>
                <span className="text-[10px] text-purple-400 font-semibold">Active</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                🎯 Exam approaching: <strong>Algorithms & Data Structures</strong> is in 8 days.
              </p>
            </div>
          )}
        </div>

        {/* Demo Data Reset Button */}
        <button
          onClick={handleDemoClick}
          disabled={isDemoLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
          title="Reload Demo Dataset"
        >
          <RefreshCw size={13} className={isDemoLoading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Demo Data</span>
        </button>

        {/* Hackathon Alexa+ button */}
        <NavLink
          to="/alexa-plus"
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-300 bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/30 transition-all hover:scale-105"
        >
          <Sparkles size={14} className="text-purple-400" />
          <span className="hidden sm:inline">Alexa+ Tools</span>
        </NavLink>

        {/* Voice Assistant Launcher */}
        <NavLink
          to="/voice"
          className="relative flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/25 transition-all duration-200 hover:scale-105"
        >
          <Mic size={14} className="animate-bounce" />
          <span>Voice</span>
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400"></span>
          </span>
        </NavLink>
      </div>
    </header>
  );
};
