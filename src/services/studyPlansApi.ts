import { request } from './apiClient.js';
import { StudyPlan, StudySession } from '../types.js';

export const studyPlansApi = {
  getStudyPlans(): Promise<StudyPlan[]> {
    return request<StudyPlan[]>('/api/study-plans');
  },

  getStudyPlan(id: string): Promise<StudyPlan> {
    return request<StudyPlan>(`/api/study-plans/${id}`);
  },

  createStudyPlan(plan: Partial<StudyPlan>): Promise<StudyPlan> {
    return request<StudyPlan>('/api/study-plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },

  generateAIStudyPlan(params: {
    subjectName: string;
    topics: Array<{ name: string; difficulty?: string; confidenceLevel?: number }>;
    examDate?: string;
    hoursPerDay?: number;
    weakTopics?: string[];
  }): Promise<{
    title: string;
    priorityRationale: string;
    totalHours: number;
    sessions: Array<Omit<StudySession, 'id' | 'studyPlanId'>>;
  }> {
    return request('/api/ai/study-plan', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  updateSessionStatus(sessionId: string, status: 'pending' | 'completed' | 'skipped'): Promise<StudySession> {
    return request<StudySession>(`/api/study-sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  deleteStudyPlan(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/study-plans/${id}`, {
      method: 'DELETE',
    });
  },
};
