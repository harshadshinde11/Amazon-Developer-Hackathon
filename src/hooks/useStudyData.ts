import { useState, useEffect, useCallback } from 'react';
import { progressApi } from '../services/progressApi.js';
import { subjectsApi } from '../services/subjectsApi.js';
import { studyPlansApi } from '../services/studyPlansApi.js';
import { quizzesApi } from '../services/quizzesApi.js';
import { chatApi } from '../services/chatApi.js';
import {
  UserProfile,
  Subject,
  Topic,
  StudyPlan,
  QuizAttempt,
  Conversation,
} from '../types.js';
import { AnalyticsResponse } from '../api.js';

export function useStudyData() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
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
        progressApi.getUser(),
        subjectsApi.getSubjects(),
        subjectsApi.getTopics(),
        studyPlansApi.getStudyPlans(),
        quizzesApi.getQuizAttempts(),
        chatApi.getConversations(),
        progressApi.getAnalytics(),
      ]);

      setUser(userData);
      setSubjects(subjectsData);
      setTopics(topicsData);
      setPlans(plansData);
      setAttempts(attemptsData);
      setConversations(convsData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error('Failed to load study data:', err);
      setError(err.message || 'Unable to connect to backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const completeSession = useCallback(async (sessionId: string) => {
    try {
      await studyPlansApi.updateSessionStatus(sessionId, 'completed');
      await refreshData();
    } catch (err: any) {
      console.error('Error completing session:', err);
      throw err;
    }
  }, [refreshData]);

  const resetToDemo = useCallback(async () => {
    try {
      await progressApi.resetDemo();
      await refreshData();
    } catch (err: any) {
      console.error('Error loading demo data:', err);
      throw err;
    }
  }, [refreshData]);

  const resetToEmpty = useCallback(async () => {
    try {
      await progressApi.resetEmpty();
      await refreshData();
    } catch (err: any) {
      console.error('Error resetting empty data:', err);
      throw err;
    }
  }, [refreshData]);

  return {
    user,
    subjects,
    topics,
    plans,
    attempts,
    conversations,
    analytics,
    isLoading,
    error,
    refreshData,
    completeSession,
    resetToDemo,
    resetToEmpty,
  };
}
