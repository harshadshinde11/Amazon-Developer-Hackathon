import {
  UserProfile,
  Subject,
  Topic,
  StudyPlan,
  StudySession,
  QuizAttempt,
  Conversation,
  TopicAnalytics,
  AdaptiveRecommendation,
  QuizQuestion,
  AlexaToolManifest,
  AgentActionRecord,
} from './types.js';

export interface AnalyticsResponse {
  user: UserProfile;
  topicAnalytics: TopicAnalytics[];
  recommendations: AdaptiveRecommendation[];
  summary: {
    totalSubjects: number;
    totalTopics: number;
    totalQuizAttempts: number;
    totalPlans: number;
    totalSessions: number;
    completedSessions: number;
    strongCount: number;
    developingCount: number;
    needsRevisionCount: number;
    noDataCount: number;
  };
}

export const api = {
  // User
  async getUser(): Promise<UserProfile> {
    const res = await fetch('/api/user');
    return res.json();
  },
  async updateUser(data: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Subjects
  async getSubjects(): Promise<Subject[]> {
    const res = await fetch('/api/subjects');
    return res.json();
  },
  async createSubject(data: {
    name: string;
    code?: string;
    color?: string;
    icon?: string;
    examinationDate?: string;
  }): Promise<Subject> {
    const res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteSubject(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Topics
  async getTopics(subjectId?: string): Promise<Topic[]> {
    const url = subjectId ? `/api/topics?subjectId=${subjectId}` : '/api/topics';
    const res = await fetch(url);
    return res.json();
  },
  async createTopic(data: {
    subjectId: string;
    name: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    confidenceLevel?: number;
    notes?: string;
  }): Promise<Topic> {
    const res = await fetch('/api/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    const res = await fetch(`/api/topics/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteTopic(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Study Plans
  async getPlans(): Promise<StudyPlan[]> {
    const res = await fetch('/api/plans');
    return res.json();
  },
  async createPlan(plan: Partial<StudyPlan>): Promise<StudyPlan> {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(plan),
    });
    return res.json();
  },
  async updateSessionStatus(
    planId: string,
    sessionId: string,
    status: 'pending' | 'completed' | 'skipped'
  ): Promise<StudySession> {
    const res = await fetch(`/api/plans/${planId}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },
  async deletePlan(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Quizzes & Attempts
  async getQuizAttempts(topicId?: string): Promise<QuizAttempt[]> {
    const url = topicId ? `/api/quizzes/attempts?topicId=${topicId}` : '/api/quizzes/attempts';
    const res = await fetch(url);
    return res.json();
  },
  async saveQuizAttempt(attempt: Partial<QuizAttempt>): Promise<QuizAttempt> {
    const res = await fetch('/api/quizzes/attempts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt),
    });
    return res.json();
  },

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch('/api/conversations');
    return res.json();
  },
  async saveConversation(conv: Conversation): Promise<Conversation> {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conv),
    });
    return res.json();
  },
  async deleteConversation(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Analytics
  async getAnalytics(): Promise<AnalyticsResponse> {
    const res = await fetch('/api/analytics');
    return res.json();
  },

  // AI Endpoints
  async chatWithAI(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    subjectName?: string;
    mode?: string;
    difficulty?: string;
  }): Promise<{ content: string }> {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  async runAssistant(params: {
    message: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    subjectName?: string;
    mode?: string;
    difficulty?: string;
    pendingTool?: { name: string; arguments: Record<string, unknown> };
  }): Promise<{
    recognizedIntent: string;
    speech: string;
    action: string;
    data: any;
    success: boolean;
    pendingTool?: { name: string; arguments: Record<string, unknown> };
    actionHistory?: AgentActionRecord[];
    toolCall?: { name: string; arguments: Record<string, unknown>; result: any };
  }> {
    const res = await fetch('/api/ai/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Assistant request failed');
    return body;
  },
  async generateAIPlan(params: {
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
    const res = await fetch('/api/ai/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  async generateAIQuiz(params: {
    subjectName?: string;
    topicName: string;
    difficulty?: string;
    numQuestions?: number;
    questionType?: string;
  }): Promise<{ questions: QuizQuestion[]; quizId: string }> {
    const res = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  async summarizeNotes(params: {
    notesText: string;
    subjectName?: string;
  }): Promise<{
    summary: string;
    keyTakeaways: string[];
    suggestedQuestions: string[];
  }> {
    const res = await fetch('/api/ai/summarize-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json();
  },
  async executeVoiceCommand(command: string, pendingTool?: { name: string; arguments: Record<string, unknown> }): Promise<{
    recognizedIntent: string;
    speech: string;
    action: string;
    data: any;
    success: boolean;
    pendingTool?: { name: string; arguments: Record<string, unknown> };
    actionHistory?: AgentActionRecord[];
    toolCall?: { name: string; arguments: Record<string, unknown>; result: any };
  }> {
    const res = await fetch('/api/ai/voice-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, pendingTool }),
    });
    return res.json();
  },

  // Alexa+ Tools & Hackathon Demo
  async getAlexaToolsManifest(): Promise<{
    track: string;
    application: string;
    mcpVersion: string;
    description: string;
    tools: AlexaToolManifest[];
  }> {
    const res = await fetch('/api/alexa-plus/manifest');
    return res.json();
  },
  async invokeAlexaTool(
    tool: string,
    args: Record<string, unknown>
  ): Promise<{
    success: boolean;
    tool: string;
    speechText: string;
    data: any;
    timestamp: string;
    error?: string;
  }> {
    const res = await fetch('/api/alexa-plus/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Agent tool request failed');
    return body;
  },

  // Reset controls
  async resetToEmpty(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/reset-empty', { method: 'POST' });
    return res.json();
  },
  async resetToDemo(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/db/reset-demo', { method: 'POST' });
    return res.json();
  },
};
