// TypeScript type definitions for SaaS Chrome Extension

// ============================================================
// API Types
// ============================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

export interface ProcessResult {
  /** Title generated or suggested by AI */
  title: string;
  /** One-line summary */
  summary: string;
  /** Key points with timestamps */
  key_points: KeyPoint[];
  /** Detailed analysis/breakdown */
  analysis: string;
  /** Actionable takeaways */
  takeaways: string[];
  /** Content metadata */
  metadata: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    topics?: string[];
    word_count?: number;
  };
  /** Original source URL (for reference) */
  source_url?: string;
}

export interface KeyPoint {
  timestamp: string;
  point: string;
}

export interface ProcessRequest {
  /** Content to process (transcript, article text, etc.) */
  content?: string;
  /** Source identifier (URL, ID, etc.) */
  source_id: string;
  /** Source URL for reference */
  source_url?: string;
  /** Content language (e.g., 'en', 'zh') */
  language?: string;
  /** Target language for translation */
  target_language?: string;
  /** User email for subscription check */
  email?: string;
}

// ============================================================
// Subscription & Usage Types
// ============================================================

export interface SubscriptionData {
  active: boolean;
  plan: 'free' | 'pro';
  expires_at?: string;
  email?: string;
}

export interface UsageData {
  daily: number;
  last_reset: string;
}

export interface ExtensionState {
  usage: UsageData;
  subscription: SubscriptionData;
  settings: Settings;
}

// ============================================================
// Settings Types
// ============================================================

export interface Settings {
  language: string;
  auto_open: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// ============================================================
// Message Types (Extension Communication)
// ============================================================

export type MessageType =
  | 'PROCESS_CONTENT'
  | 'PROCESS_RESULT'
  | 'CHECK_SUBSCRIPTION'
  | 'OPEN_UPGRADE'
  | 'GET_USAGE'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'CLEAR_DATA';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  data?: T;
}

// ============================================================
// Constants & Config Types
// ============================================================

export interface PricingConfig {
  free: {
    daily_limit: number;
  };
  pro: {
    monthly_price: number;
  };
}

export interface FeatureConfig {
  daily_processes: number;
  key_points: boolean;
  detailed_analysis: boolean;
  priority_support: boolean;
  export_options: boolean;
}

export interface ExtensionConfig {
  name: string;
  version: string;
  api_endpoint: string;
  checkout_url: string;
  pricing: PricingConfig;
  features: {
    free: FeatureConfig;
    pro: FeatureConfig;
  };
}
