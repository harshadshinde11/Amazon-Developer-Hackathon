import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Calendar,
  CheckCircle2,
  BookOpen,
  BarChart3,
  Sparkles,
  Settings,
  Flame,
  Award,
} from 'lucide-react';
import { Logo } from '../Logo.js';

interface SidebarProps {
  streakDays: number;
  studyHoursThisWeek: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  streakDays,
  studyHoursThisWeek,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chat', label: 'AI Study Chat', icon: MessageSquare, badge: 'GPT-4o/Gemini' },
    { to: '/voice', label: 'Voice Assistant', icon: Mic, pulse: true, badge: 'Alexa+' },
    { to: '/planner', label: 'Study Planner', icon: Calendar },
    { to: '/quiz', label: 'Quiz Center', icon: CheckCircle2 },
    { to: '/subjects', label: 'My Subjects', icon: BookOpen },
    { to: '/analytics', label: 'Progress Analytics', icon: BarChart3 },
    { to: '/alexa-plus', label: 'Alexa+ Tools Demo', icon: Sparkles, highlight: true },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-[#0a0f24] border-r border-slate-800/80 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80">
          <Logo />
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group text-left ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-white border border-purple-500/40 shadow-sm shadow-purple-500/10'
                      : item.highlight
                      ? 'text-purple-300 hover:bg-purple-950/40 hover:text-white border border-purple-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : item.pulse
                            ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        <Icon size={18} />
                      </div>
                      <span>{item.label}</span>
                    </div>

                    {item.pulse && !isActive && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                    )}

                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Quick Streak & Weekly Summary Box */}
        <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-slate-900/90 to-purple-950/40 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
              <Flame size={16} className="text-amber-400 fill-amber-400 animate-pulse" />
              <span>{streakDays} Day Streak!</span>
            </div>
            <Award size={15} className="text-purple-400" />
          </div>
          <div className="text-xs text-slate-400 mb-2">
            Study hours this week: <strong className="text-white">{studyHoursThisWeek} hrs</strong>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min((studyHoursThisWeek / 10) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center font-bold text-xs text-white shadow-inner">
              H
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Harshad</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                Alexa+ Connected
              </span>
            </div>
          </div>
          <NavLink
            to="/settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </NavLink>
        </div>
      </aside>
    </>
  );
};
