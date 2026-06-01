// Extension configuration constants - Customize these for your product

export const EXTENSION_CONFIG = {
  name: 'My SaaS Extension',
  version: '1.0.0',

  // API endpoint - your Cloudflare Worker domain
  apiEndpoint: 'https://api.yourdomain.com',

  // Pricing configuration
  pricing: {
    free: {
      dailyLimit: 3,
    },
    pro: {
      monthly: 9.99,
    },
  },

  // Feature flags for free vs pro tiers
  features: {
    free: {
      dailyProcesses: 3,
      keyPoints: true,
      detailedAnalysis: true,
      exportOptions: false,
      prioritySupport: false,
    },
    pro: {
      dailyProcesses: Infinity,
      keyPoints: true,
      detailedAnalysis: true,
      exportOptions: true,
      prioritySupport: true,
    },
  },

  // Creem checkout URL (or your payment page)
  checkoutUrl: 'https://yourdomain.com/#pricing',

  // Storage keys (use unique prefixes to avoid conflicts)
  storage: {
    usage: 'slk_usage',
    subscription: 'slk_subscription',
    settings: 'slk_settings',
    privacyConsent: 'slk_privacy',
  },
} as const;

// ============================================================
// Selectors Configuration
// ============================================================
// Customize these selectors based on the target website
// Examples are for a generic content site

export const SITE_SELECTORS = {
  // Content extraction selectors
  content: {
    article: 'article, [role="article"], .content, main',
    transcript: '.transcript, [data-transcript], #transcript',
    title: 'h1, .title, [itemprop="headline"]',
    transcriptContainer: '#segments-container, .segment-container',
    transcriptSegment: '.segment, .transcript-segment',
  },

  // UI interaction selectors
  buttons: {
    summarize: 'button[aria-label*="summarize" i], button.summarize-btn',
    process: 'button[data-action="process"], .process-button',
    transcript: 'button[aria-label*="transcript" i]',
  },
} as const;

// ============================================================
// i18n Configuration
// ============================================================

export const SUPPORTED_LANGUAGES = ['en', 'zh-CN', 'ja'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  'en': 'English',
  'zh-CN': '简体中文',
  'ja': '日本語',
} as const;
