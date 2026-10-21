/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/Sidebar.js';
import { Navbar } from './components/Navbar.js';
import { RightPanel } from './components/RightPanel.js';
import { DashboardView } from './components/DashboardView.js';
import { ChatView } from './components/ChatView.js';
import { VoiceAssistantView } from './components/VoiceAssistantView.js';
import { PlannerView } from './components/PlannerView.js';
import { QuizView } from './components/QuizView.js';
import { SubjectsView } from './components/SubjectsView.js';
import { AnalyticsView } from './components/AnalyticsView.js';
import { AlexaPlusView } from './components/AlexaPlusView.js';
import { SettingsModal } from './components/SettingsModal.js';
import { api, AnalyticsResponse } from './api.js';
import {
  UserProfile,
  Subject,
  Topic,
  StudyPlan,
  QuizAttempt,
  Conversation,
} from './types.js';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Core Data States
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);

  // Selected topic for quiz transfer
  const [quizInitialTopic, setQuizInitialTopic] = useState<{ id?: string; name?: string }>({});

  const refreshAllData = async () => {
    try {
      const [
        userData,
        subjectsData,
        topicsData,
        plansData,
        attemptsData,
        convsData,
        analyticsData,
      ] = await Promise.all([
        api.getUser(),
        api.getSubjects(),
        api.getTopics(),
        api.getPlans(),
        api.getQuizAttempts(),
        api.getConversations(),
        api.getAnalytics(),
      ]);

      setUser(userData);
      setSubjects(subjectsData);
      setTopics(topicsData);
      setPlans(plansData);
      setQuizAttempts(attemptsData);
      setConversations(convsData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error fetching StudyPilot data:', err);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleCompleteSession = async (planId: string, sessionId: string) => {
    try {
      await api.updateSessionStatus(planId, sessionId, 'completed');
      refreshAllData();
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  };

  const handleResetDemo = async () => {
    setIsDemoLoading(true);
    try {
      await api.resetToDemo();
      await refreshAllData();
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleStartQuizWithTopic = (topicId?: string, topicName?: string) => {
    setQuizInitialTopic({ id: topicId, name: topicName });
    setCurrentView('quiz');
  };

  const allSessions = plans.flatMap((p) => p.sessions.map((s) => ({ ...s, planId: p.id })));

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      <div className="flex flex-1">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'settings') {
              setIsSettingsOpen(true);
            } else {
              setCurrentView(view);
            }
          }}
          streakDays={user?.streakDays || 0}
          studyHoursThisWeek={user?.studyHoursThisWeek || 0}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        {/* Center Application Stage */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            currentView={currentView}
            onOpenMobileMenu={() => setIsMobileOpen(true)}
            onOpenVoice={() => setCurrentView('voice')}
            onOpenAlexaTools={() => setCurrentView('alexa-plus')}
            streakDays={user?.streakDays || 0}
            studyHoursThisWeek={user?.studyHoursThisWeek || 0}
            onResetDemo={handleResetDemo}
            isDemoLoading={isDemoLoading}
          />

          <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
            {currentView === 'dashboard' && user && (
              <DashboardView
                user={user}
                subjects={subjects}
                plans={plans}
                quizAttempts={quizAttempts}
                topicAnalytics={analytics?.topicAnalytics || []}
                recommendations={analytics?.recommendations || []}
                onNavigate={setCurrentView}
                onStartQuiz={handleStartQuizWithTopic}
                onCompleteSession={handleCompleteSession}
                onResetDemo={handleResetDemo}
              />
            )}

            {currentView === 'chat' && (
              <ChatView
                subjects={subjects}
                conversations={conversations}
                onRefreshConversations={refreshAllData}
              />
            )}

            {currentView === 'voice' && (
              <VoiceAssistantView
                onNavigate={setCurrentView}
                onStartQuizWithTopic={handleStartQuizWithTopic}
                onRefreshData={refreshAllData}
              />
            )}

            {currentView === 'planner' && (
              <PlannerView
                plans={plans}
                subjects={subjects}
                topicAnalytics={analytics?.topicAnalytics || []}
                onRefreshPlans={refreshAllData}
                onCompleteSession={handleCompleteSession}
              />
            )}

            {currentView === 'quiz' && (
              <QuizView
                subjects={subjects}
                topics={topics}
                attempts={quizAttempts}
                initialTopicId={quizInitialTopic.id}
                initialTopicName={quizInitialTopic.name}
                onRefreshData={refreshAllData}
                onNavigateToChat={() => setCurrentView('chat')}
              />
            )}

            {currentView === 'subjects' && (
              <SubjectsView
                subjects={subjects}
                topics={topics}
                onRefreshData={refreshAllData}
                onStartQuizWithNotes={handleStartQuizWithTopic}
              />
            )}

            {currentView === 'analytics' && user && (
              <AnalyticsView
                user={user}
                topicAnalytics={analytics?.topicAnalytics || []}
                attempts={quizAttempts}
                plans={plans}
                onStartQuiz={handleStartQuizWithTopic}
              />
            )}

            {currentView === 'alexa-plus' && (
              <AlexaPlusView onRefreshData={refreshAllData} />
            )}
          </main>
        </div>

        {/* Right Contextual Panel (Hidden on small viewports and chat/voice focus) */}
        {currentView !== 'chat' && currentView !== 'voice' && (
          <RightPanel
            sessions={allSessions}
            subjects={subjects}
            topicAnalytics={analytics?.topicAnalytics || []}
            onCompleteSession={handleCompleteSession}
            onNavigate={setCurrentView}
            onStartQuiz={handleStartQuizWithTopic}
          />
        )}
      </div>

      {/* Settings Modal */}
      {user && (
        <SettingsModal
          user={user}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onRefreshData={refreshAllData}
        />
      )}
    </div>
  );
}
