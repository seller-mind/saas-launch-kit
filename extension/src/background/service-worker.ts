// Background Service Worker - Handles extension lifecycle and message routing
// MV3 service workers are event-driven and don't maintain persistent state

import { EXTENSION_CONFIG } from '../core/constants';
import { UsageTracker } from '../core/usage-tracker';

/**
 * Message listener - Routes messages between popup, content scripts, and background
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Keep channel open for async response
});

/**
 * Handle incoming messages
 */
async function handleMessage(message: { type: string; data?: unknown }): Promise<unknown> {
  switch (message.type) {
    case 'CHECK_SUBSCRIPTION': {
      const { email } = message.data as { email: string };
      const sub = await UsageTracker.getSubscription();
      return {
        success: true,
        data: {
          active: sub.active,
          plan: sub.plan,
        },
      };
    }

    case 'OPEN_UPGRADE': {
      chrome.tabs.create({ url: EXTENSION_CONFIG.checkoutUrl });
      return { success: true };
    }

    case 'GET_USAGE': {
      const usage = await UsageTracker.getUsage();
      const remaining = await UsageTracker.getRemaining();
      const isPro = await UsageTracker.isPro();
      return {
        success: true,
        data: {
          usage,
          remaining,
          isPro,
        },
      };
    }

    case 'CLEAR_DATA': {
      await chrome.storage.local.clear();
      return { success: true };
    }

    default:
      return { success: false, error: 'Unknown message type' };
  }
}

/**
 * Extension installed/updated handler
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[Service Worker] Extension installed');
    // Initialize default settings
    await chrome.storage.local.set({
      [EXTENSION_CONFIG.storage.settings]: {
        language: 'en',
        auto_open: true,
        theme: 'auto',
      },
      [EXTENSION_CONFIG.storage.usage]: {
        daily: 0,
        last_reset: new Date().toDateString(),
      },
      [EXTENSION_CONFIG.storage.subscription]: {
        active: false,
        plan: 'free',
      },
    });
  } else if (details.reason === 'update') {
    console.log('[Service Worker] Extension updated');
  }
});

/**
 * Tab updated handler - Detect navigation to supported pages
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // You can add logic here to show extension icon badge
    // when user navigates to a supported page
  }
});

console.log('[Service Worker] Background service worker initialized');
