import { request } from './apiClient.js';
import { QuizAttempt, QuizQuestion } from '../types.js';

export const quizzesApi = {
  getQuizAttempts(topicId?: string): Promise<QuizAttempt[]> {
    const query = topicId ? `?topicId=${encodeURIComponent(topicId)}` : '';
    return request<QuizAttempt[]>(`/api/quizzes/attempts${query}`);
  },

  saveQuizAttempt(attempt: Partial<QuizAttempt>): Promise<QuizAttempt> {
    return request<QuizAttempt>('/api/quizzes/attempts', {
      method: 'POST',
      body: JSON.stringify(attempt),
    });
  },

  generateQuiz(params: {
    subjectName?: string;
    topicName: string;
    difficulty?: string;
    numQuestions?: number;
    questionType?: string;
  }): Promise<{ questions: QuizQuestion[] }> {
    return request<{ questions: QuizQuestion[] }>('/api/ai/quiz', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};
