import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.js';
import { Navbar } from './Navbar.js';
import { RightPanel } from './RightPanel.js';
import { useStudyData } from '../../hooks/useStudyData.js';
import { LoadingSpinner } from '../common/LoadingSpinner.js';

export const Layout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const {
    user,
    subjects,
    plans,
    analytics,
    isLoading,
    error,
    completeSession,
    resetToDemo,
  } = useStudyData();

  const allSessions = plans.flatMap((p) => p.sessions);
  const isFullWidthPage = location.pathname === '/chat' || location.pathname === '/voice';

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          streakDays={user?.streakDays || 0}
          studyHoursThisWeek={user?.studyHoursThisWeek || 0}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Center Main Stage */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            onOpenMobileMenu={() => setIsMobileOpen(true)}
            streakDays={user?.streakDays || 0}
            studyHoursThisWeek={user?.studyHoursThisWeek || 0}
            onResetDemo={resetToDemo}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span>{error}</span>
                <button
                  onClick={() => window.location.reload()}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoading && !user ? (
              <div className="py-24">
                <LoadingSpinner label="Connecting to StudyPilot AI backend..." size="lg" />
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>

        {/* Right Contextual Panel */}
        {!isFullWidthPage && (
          <RightPanel
            sessions={allSessions}
            subjects={subjects}
            topicAnalytics={analytics?.topicAnalytics || []}
            onCompleteSession={completeSession}
          />
        )}
      </div>
    </div>
  );
};
