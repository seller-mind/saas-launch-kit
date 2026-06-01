// API client for Cloudflare Worker backend

import { EXTENSION_CONFIG } from './constants';
import type { APIResponse, ProcessResult, ProcessRequest } from '../types';

export class APIClient {
  private endpoint: string;

  constructor(endpoint?: string) {
    this.endpoint = endpoint || EXTENSION_CONFIG.apiEndpoint;
  }

  /**
   * Process content through the AI pipeline
   */
  async process(request: ProcessRequest): Promise<APIResponse<ProcessResult>> {
    try {
      const response = await fetch(`${this.endpoint}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: request.source_id,
          source_url: request.source_url,
          content: request.content,
          language: request.language || 'en',
          target_language: request.target_language,
          email: request.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          return {
            success: false,
            error: 'DAILY_LIMIT_REACHED',
          };
        }
        
        return {
          success: false,
          error: errorData.error || `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        cached: data.cached,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Check subscription status for a user
   */
  async checkSubscription(email: string): Promise<APIResponse<{ active: boolean; plan: string }>> {
    try {
      const response = await fetch(
        `${this.endpoint}/api/subscription?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Get cached result if available
   */
  async getCache(sourceId: string, language?: string): Promise<APIResponse<ProcessResult | null>> {
    try {
      const params = new URLSearchParams({ source_id: sourceId });
      if (language) params.set('language', language);

      const response = await fetch(`${this.endpoint}/api/cache?${params}`);

      if (!response.ok) {
        return { success: false, error: `Cache check failed: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || null,
        cached: data.cached,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}
