import { request } from './apiClient.js';
import { Subject, Topic } from '../types.js';

export const subjectsApi = {
  getSubjects(): Promise<Subject[]> {
    return request<Subject[]>('/api/subjects');
  },

  createSubject(data: {
    name: string;
    code?: string;
    color?: string;
    icon?: string;
    examinationDate?: string;
    starterTopics?: string[];
  }): Promise<Subject> {
    return request<Subject>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  deleteSubject(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/subjects/${id}`, {
      method: 'DELETE',
    });
  },

  getTopics(subjectId?: string): Promise<Topic[]> {
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
    return request<Topic[]>(`/api/topics${query}`);
  },

  createTopic(data: {
    subjectId: string;
    name: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    confidenceLevel?: number;
    notes?: string;
  }): Promise<Topic> {
    return request<Topic>('/api/topics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    return request<Topic>(`/api/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteTopic(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/topics/${id}`, {
      method: 'DELETE',
    });
  },

  summarizeNotes(notesText: string, subjectName?: string): Promise<{
    summary: string;
    keyTakeaways: string[];
    suggestedQuestions: string[];
  }> {
    return request('/api/ai/summarize-notes', {
      method: 'POST',
      body: JSON.stringify({ notesText, subjectName }),
    });
  },
};
