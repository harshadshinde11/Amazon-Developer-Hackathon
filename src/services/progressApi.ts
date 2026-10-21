import { request } from './apiClient.js';
import { AnalyticsResponse } from '../api.js';
import { UserProfile, AlexaToolManifest } from '../types.js';

export const progressApi = {
  getUser(): Promise<UserProfile> {
    return request<UserProfile>('/api/user');
  },

  updateUser(data: Partial<UserProfile>): Promise<UserProfile> {
    return request<UserProfile>('/api/user', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  getAnalytics(): Promise<AnalyticsResponse> {
    return request<AnalyticsResponse>('/api/analytics');
  },

  getAlexaManifest(): Promise<{
    track: string;
    application: string;
    mcpVersion: string;
    description: string;
    tools: AlexaToolManifest[];
  }> {
    return request('/api/alexa-plus/manifest');
  },

  invokeAlexaTool(tool: string, args: Record<string, any>): Promise<any> {
    return request('/api/alexa-plus/invoke', {
      method: 'POST',
      body: JSON.stringify({ tool, arguments: args }),
    });
  },

  resetDemo(): Promise<{ success: boolean; message: string }> {
    return request('/api/db/reset-demo', { method: 'POST' });
  },

  resetEmpty(): Promise<{ success: boolean; message: string }> {
    return request('/api/db/reset-empty', { method: 'POST' });
  },
};
