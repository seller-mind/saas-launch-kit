// Popup Script - Main UI interaction handler

import { EXTENSION_CONFIG } from '../core/constants';
import { UsageTracker } from '../core/usage-tracker';
import { APIClient } from '../core/api-client';

// DOM Elements
const planBadge = document.getElementById('plan-badge') as HTMLSpanElement;
const usageFill = document.getElementById('usage-fill') as HTMLDivElement;
const usageText = document.getElementById('usage-text') as HTMLParagraphElement;
const currentPageText = document.getElementById('current-page-text') as HTMLParagraphElement;
const processBtn = document.getElementById('process-btn') as HTMLButtonElement;
const upgradeBtn = document.getElementById('upgrade-btn') as HTMLButtonElement;
const planText = document.getElementById('plan-text') as HTMLParagraphElement;
const verifyLink = document.getElementById('verify-link') as HTMLAnchorElement;
const verifyForm = document.getElementById('verify-form') as HTMLElement;
const verifyEmail = document.getElementById('verify-email') as HTMLInputElement;
const verifyError = document.getElementById('verify-error') as HTMLElement;
const verifyCancel = document.getElementById('verify-cancel') as HTMLButtonElement;
const verifySubmit = document.getElementById('verify-submit') as HTMLButtonElement;
const settingLanguage = document.getElementById('setting-language') as HTMLSelectElement;
const clearDataBtn = document.getElementById('clear-data-btn') as HTMLButtonElement;

const api = new APIClient();

/**
 * Initialize popup - load state and setup UI
 */
async function init(): Promise<void> {
  await loadUsage();
  await loadSubscription();
  await checkCurrentPage();
  loadSettings();
}

/**
 * Load and display usage data
 */
async function loadUsage(): Promise<void> {
  const usage = await UsageTracker.getUsage();
  const remaining = await UsageTracker.getRemaining();
  const limit = UsageTracker.getDailyLimit();
  const isPro = await UsageTracker.isPro();

  // Update usage bar
  if (isPro) {
    usageFill.style.width = '100%';
    usageFill.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    usageText.textContent = 'Unlimited processing';
  } else {
    const percentage = (usage.daily / limit) * 100;
    usageFill.style.width = `${Math.min(100, percentage)}%`;
    usageText.textContent = `${usage.daily}/${limit} used today · ${remaining} remaining`;
  }
}

/**
 * Load subscription status
 */
async function loadSubscription(): Promise<void> {
  const subscription = await UsageTracker.getSubscription();

  if (subscription.active && subscription.plan === 'pro') {
    planBadge.textContent = 'Pro';
    planBadge.classList.remove('free');
    planBadge.classList.add('pro');
    planText.textContent = 'You have unlimited access';
    upgradeBtn.style.display = 'none';
    verifyLink.style.display = 'none';
    verifyForm.style.display = 'none';
  } else {
    planBadge.textContent = 'Free';
    planBadge.classList.remove('pro');
    planBadge.classList.add('free');
  }
}

/**
 * Check if current page is supported
 */
async function checkCurrentPage(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab?.url) {
    // Customize this check based on your target website
    const isSupported = tab.url.includes('youtube.com/watch') || 
                         tab.url.includes('example.com/article');
    
    if (isSupported) {
      currentPageText.textContent = 'Page supported - ready to process';
      processBtn.disabled = false;
    } else {
      currentPageText.textContent = 'Navigate to a supported page';
      processBtn.disabled = true;
    }
  } else {
    currentPageText.textContent = 'Unable to detect page';
    processBtn.disabled = true;
  }
}

/**
 * Load user settings
 */
async function loadSettings(): Promise<void> {
  const result = await chrome.storage.local.get(EXTENSION_CONFIG.storage.settings);
  const settings = result[EXTENSION_CONFIG.storage.settings];
  
  if (settings?.language) {
    settingLanguage.value = settings.language;
  }
}

/**
 * Save user settings
 */
async function saveSettings(): Promise<void> {
  const result = await chrome.storage.local.get(EXTENSION_CONFIG.storage.settings);
  const settings = result[EXTENSION_CONFIG.storage.settings] || {};
  settings.language = settingLanguage.value;
  await chrome.storage.local.set({ [EXTENSION_CONFIG.storage.settings]: settings });
}

// ============================================================
// Event Listeners
// ============================================================

/** Process button - trigger content script */
processBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'PROCESS_CONTENT' });
    window.close();
  }
});

/** Upgrade button - open checkout */
upgradeBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: EXTENSION_CONFIG.checkoutUrl });
});

/** Verify link - show email form */
verifyLink.addEventListener('click', (e) => {
  e.preventDefault();
  verifyForm.style.display = 'block';
  verifyLink.style.display = 'none';
  verifyEmail.focus();
});

/** Cancel verification */
verifyCancel.addEventListener('click', () => {
  verifyForm.style.display = 'none';
  verifyLink.style.display = '';
  verifyError.textContent = '';
});

/** Submit verification */
verifySubmit.addEventListener('click', async () => {
  const email = verifyEmail.value.trim().toLowerCase();
  
  if (!isValidEmail(email)) {
    verifyError.textContent = 'Please enter a valid email';
    return;
  }

  verifyError.textContent = '';
  verifySubmit.textContent = 'Verifying...';
  verifySubmit.setAttribute('disabled', 'true');

  try {
    const result = await api.checkSubscription(email);
    
    if (result.success && result.data?.active) {
      await UsageTracker.updateSubscription({
        active: true,
        plan: 'pro',
        email,
      });
      
      planBadge.textContent = 'Pro';
      planBadge.classList.remove('free');
      planBadge.classList.add('pro');
      planText.textContent = 'You have unlimited access';
      upgradeBtn.style.display = 'none';
      verifyForm.style.display = 'none';
      
      await loadUsage();
    } else {
      verifyError.textContent = 'No active Pro subscription found';
    }
  } catch {
    verifyError.textContent = 'Verification failed. Try again.';
  }

  verifySubmit.textContent = 'Verify';
  verifySubmit.removeAttribute('disabled');
});

/** Enter key on email input */
verifyEmail.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    verifySubmit.click();
  }
});

/** Language setting change */
settingLanguage.addEventListener('change', saveSettings);

/** Clear all data */
clearDataBtn.addEventListener('click', async () => {
  const sub = await UsageTracker.getSubscription();
  const warning = sub.active && sub.plan === 'pro'
    ? 'Clear all extension data? Your Pro status will be lost.'
    : 'Clear all extension data? This cannot be undone.';
  
  if (confirm(warning)) {
    await chrome.storage.local.clear();
    await init();
  }
});

// ============================================================
// Utilities
// ============================================================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Initialize on load
init();
