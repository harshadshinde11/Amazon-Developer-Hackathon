import { request } from './apiClient.js';
import { Conversation } from '../types.js';

export const chatApi = {
  getConversations(): Promise<Conversation[]> {
    return request<Conversation[]>('/api/conversations');
  },

  saveConversation(conv: Conversation): Promise<Conversation> {
    return request<Conversation>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify(conv),
    });
  },

  deleteConversation(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  sendMessage(params: {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    subjectName?: string;
    mode?: string;
    difficulty?: string;
  }): Promise<{ content: string }> {
    return request<{ content: string }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  executeVoiceCommand(command: string): Promise<{
    recognizedIntent: string;
    speech: string;
    action: string;
    data: any;
  }> {
    return request('/api/ai/voice-command', {
      method: 'POST',
      body: JSON.stringify({ command }),
    });
  },
};
