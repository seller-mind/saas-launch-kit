// Content Script - Injected into target website
// Handles UI interactions and communicates with background service worker

import { createSidebar, showLoading, showError, showResult, showUpgradePrompt, showAlreadyPro } from './sidebar';
import { APIClient } from '../core/api-client';
import { UsageTracker } from '../core/usage-tracker';
import { SITE_SELECTORS, EXTENSION_CONFIG } from '../core/constants';

// ============================================================
// Content Extraction
// ============================================================

/**
 * Extract source ID from the current page URL
 * Customize this based on your target website structure
 */
function extractSourceId(): { id: string; url: string } | null {
  const url = window.location.href;
  
  // Example: YouTube video ID
  // https://www.youtube.com/watch?v=VIDEO_ID
  const ytMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return { id: ytMatch[1], url };
  }
  
  // Example: Generic article ID from URL
  // https://example.com/article/12345
  const articleMatch = url.match(/\/article\/(\w+)/);
  if (articleMatch) {
    return { id: articleMatch[1], url };
  }
  
  // Add more patterns for your target website
  return null;
}

/**
 * Extract content from the page
 * Customize selectors based on your target website
 */
function extractContent(): { content: string; language: string } | null {
  // Example selectors - customize for your target website
  const transcriptEl = document.querySelector(SITE_SELECTORS.content.transcript);
  if (transcriptEl) {
    const text = Array.from(transcriptEl.querySelectorAll('p, span'))
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    return { content: text, language: detectLanguage(text) };
  }

  // Fallback: try to find any structured content
  const articleEl = document.querySelector(SITE_SELECTORS.content.article);
  if (articleEl) {
    return {
      content: articleEl.textContent?.trim() || '',
      language: detectLanguage(articleEl.textContent || ''),
    };
  }

  return null;
}

/**
 * Detect content language
 */
function detectLanguage(text: string): string {
  // Simple heuristic based on character ranges
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  return 'en';
}

/**
 * Get page title
 */
function getPageTitle(): string {
  return document.querySelector('h1')?.textContent?.trim() || 
         document.title.split('|')[0].trim() ||
         '';
}

// ============================================================
// Main Processing Logic
// ============================================================

const api = new APIClient();

/**
 * Handle content processing
 */
async function handleProcess(): Promise<void> {
  // Check if user can process
  const canProcess = await UsageTracker.canProcess();
  const isPro = await UsageTracker.isPro();
  
  if (!canProcess && !isPro) {
    const remaining = await UsageTracker.getRemaining();
    showUpgradePrompt(remaining);
    return;
  }

  // Show loading state
  showLoading();

  try {
    const sourceInfo = extractSourceId();
    if (!sourceInfo) {
      showError('Unable to detect content on this page');
      return;
    }

    const contentData = extractContent();
    const title = getPageTitle();

    // Get user email if available
    const sub = await UsageTracker.getSubscription();
    const email = sub.email;

    // Get language setting
    const settingsResult = await chrome.storage.local.get(EXTENSION_CONFIG.storage.settings);
    const settings = settingsResult[EXTENSION_CONFIG.storage.settings];
    const language = settings?.language || 'en';

    // Call API
    const result = await api.process({
      source_id: sourceInfo.id,
      source_url: sourceInfo.url,
      content: contentData?.content,
      language: contentData?.language || language,
      email,
    });

    if (!result.success) {
      if (result.error === 'DAILY_LIMIT_REACHED') {
        const remaining = await UsageTracker.getRemaining();
        showUpgradePrompt(remaining);
      } else {
        showError(result.error || 'Processing failed');
      }
      return;
    }

    // Increment usage (only for successful free tier requests)
    if (!isPro) {
      await UsageTracker.increment();
    }

    // Show result
    const remaining = await UsageTracker.getRemaining();
    showResult(result.data!, remaining, isPro, title);

  } catch (error) {
    console.error('[Content Script] Processing error:', error);
    showError('An error occurred. Please try again.');
  }
}

/**
 * Handle subscription verification from popup
 */
async function handleVerifySubscription(email: string): Promise<void> {
  const result = await api.checkSubscription(email);
  
  if (result.success && result.data?.active) {
    await UsageTracker.updateSubscription({
      active: true,
      plan: 'pro',
      email,
    });
    showAlreadyPro();
  }
  
  return result;
}

// ============================================================
// Message Listener
// ============================================================

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'PROCESS_CONTENT':
      handleProcess();
      break;
    case 'CHECK_SUBSCRIPTION':
      handleVerifySubscription(message.data?.email).then(sendResponse);
      return true; // Keep channel open for async response
  }
});

// ============================================================
// Initialize
// ============================================================

// Create sidebar UI when page loads
document.addEventListener('DOMContentLoaded', () => {
  createSidebar();
});

// Also run immediately if DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  createSidebar();
}
