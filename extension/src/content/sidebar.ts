// Sidebar UI - Rendered as overlay panel on the target website

import type { ProcessResult } from '../types';

/** Escape HTML to prevent XSS */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================
// Sidebar DOM Elements
// ============================================================

let sidebarElement: HTMLElement | null = null;
let isOpen = false;

/**
 * Create sidebar DOM structure
 */
export function createSidebar(): HTMLElement {
  if (sidebarElement) return sidebarElement;

  sidebarElement = document.createElement('div');
  sidebarElement.id = 'slk-sidebar';
  sidebarElement.innerHTML = `
    <div class="slk-header">
      <div class="slk-title">
        <span class="slk-icon">✨</span>
        <span>AI Processing</span>
      </div>
      <button class="slk-close" title="Close">&times;</button>
    </div>
    <div class="slk-body">
      <div class="slk-loading">
        <div class="slk-spinner"></div>
        <p>Processing content...</p>
        <p class="slk-sub">This usually takes 5-10 seconds</p>
      </div>
    </div>
    <div class="slk-footer">
      <span class="slk-badge">AI-powered</span>
      <span class="slk-usage"></span>
    </div>
  `;

  // Close button handler
  sidebarElement.querySelector('.slk-close')?.addEventListener('click', () => {
    closeSidebar();
  });

  document.body.appendChild(sidebarElement);
  return sidebarElement;
}

/** Open sidebar with animation */
export function openSidebar(): void {
  const sidebar = createSidebar();
  void sidebar.offsetHeight; // Force reflow for animation
  sidebar.classList.add('slk-open');
  isOpen = true;
}

/** Close sidebar */
export function closeSidebar(): void {
  if (sidebarElement) {
    sidebarElement.classList.remove('slk-open');
    isOpen = false;
  }
}

/** Toggle sidebar open/close */
export function toggleSidebar(): void {
  if (isOpen) closeSidebar();
  else openSidebar();
}

// ============================================================
// Content States
// ============================================================

/** Show loading spinner */
export function showLoading(): void {
  openSidebar();
  const body = sidebarElement?.querySelector('.slk-body');
  if (body) {
    body.innerHTML = `
      <div class="slk-loading">
        <div class="slk-spinner"></div>
        <p>Processing content...</p>
        <p class="slk-sub">This usually takes 5-10 seconds</p>
      </div>
    `;
  }
}

/** Show error message */
export function showError(message: string): void {
  openSidebar();
  const body = sidebarElement?.querySelector('.slk-body');
  if (body) {
    body.innerHTML = `
      <div class="slk-error">
        <div class="slk-error-icon">⚠️</div>
        <p>${escapeHtml(message)}</p>
        <button class="slk-retry-btn" onclick="window.location.reload()">Retry</button>
      </div>
    `;
  }
}

/** Show upgrade prompt for free users */
export function showUpgradePrompt(remaining: number): void {
  openSidebar();
  const body = sidebarElement?.querySelector('.slk-body');
  if (body) {
    body.innerHTML = `
      <div class="slk-upgrade">
        <div class="slk-upgrade-icon">📈</div>
        <h3>Daily Limit Reached</h3>
        <p>You've used all ${remaining === 0 ? '' : remaining} of your free processes today.</p>
        <button class="slk-upgrade-btn" id="slk-upgrade-btn">
          Upgrade to Pro — Unlimited Access
        </button>
        <p class="slk-sub">Cancel anytime · Secure payment</p>
        
        <div class="slk-verify-link">
          <a href="#" id="slk-verify-link">Already Pro? Verify</a>
        </div>
        <div id="slk-verify-form" class="slk-verify-form" style="display: none;">
          <input type="email" id="slk-verify-email" placeholder="your@email.com" class="slk-email-input">
          <p id="slk-verify-error" class="slk-error-text"></p>
          <div class="slk-verify-buttons">
            <button id="slk-verify-cancel" class="slk-secondary-btn">Cancel</button>
            <button id="slk-verify-submit" class="slk-primary-btn small">Verify</button>
          </div>
        </div>
      </div>
    `;
  }

  // Event handlers
  const upgradeBtn = body.querySelector('#slk-upgrade-btn');
  upgradeBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_UPGRADE' });
  });

  const verifyLink = body.querySelector('#slk-verify-link');
  const verifyForm = body.querySelector('#slk-verify-form') as HTMLElement;
  const verifyEmail = body.querySelector('#slk-verify-email') as HTMLInputElement;
  const verifyError = body.querySelector('#slk-verify-error') as HTMLElement;
  const verifyCancel = body.querySelector('#slk-verify-cancel');
  const verifySubmit = body.querySelector('#slk-verify-submit');

  verifyLink?.addEventListener('click', (e) => {
    e.preventDefault();
    verifyForm.style.display = 'block';
    (verifyLink as HTMLElement).style.display = 'none';
    verifyEmail?.focus();
  });

  verifyCancel?.addEventListener('click', () => {
    verifyForm.style.display = 'none';
    (verifyLink as HTMLElement).style.display = '';
    verifyError.textContent = '';
  });

  verifySubmit?.addEventListener('click', () => {
    const email = verifyEmail?.value.trim().toLowerCase() || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      verifyError.textContent = 'Please enter a valid email';
      return;
    }
    
    verifyError.textContent = '';
    (verifySubmit as HTMLElement).textContent = 'Verifying...';
    
    chrome.runtime.sendMessage(
      { type: 'CHECK_SUBSCRIPTION', data: { email } },
      (response) => {
        if (response?.success && response?.data?.active) {
          chrome.storage.local.set({
            subscription: { active: true, plan: 'pro', email },
          });
          showAlreadyPro();
        } else {
          verifyError.textContent = 'No active subscription found';
          (verifySubmit as HTMLElement).textContent = 'Verify';
        }
      }
    );
  });
}

/** Show success state after Pro verification */
export function showAlreadyPro(): void {
  const body = sidebarElement?.querySelector('.slk-body');
  if (body) {
    body.innerHTML = `
      <div class="slk-success">
        <div class="slk-success-icon">🎉</div>
        <h3>Pro Verified!</h3>
        <p>You have unlimited access. Refresh the page to process.</p>
      </div>
    `;
  }
}

/** Show processing result */
export function showResult(result: ProcessResult, remaining: number, isPro: boolean, title?: string): void {
  openSidebar();
  const body = sidebarElement?.querySelector('.slk-body');
  if (!body) return;

  const titleDisplay = title ? escapeHtml(title.substring(0, 80)) : '';

  body.innerHTML = `
    <div class="slk-result">
      ${titleDisplay ? `<div class="slk-title-display" title="${escapeHtml(title)}">${titleDisplay}</div>` : ''}
      
      <div class="slk-summary">
        <p>${escapeHtml(result.summary || '')}</p>
      </div>

      ${result.key_points?.length ? `
        <div class="slk-section">
          <h4>📍 Key Points</h4>
          <div class="slk-points">
            ${result.key_points.map(kp => `
              <div class="slk-point" data-timestamp="${escapeHtml(kp.timestamp)}">
                <span class="slk-time">${escapeHtml(kp.timestamp)}</span>
                <span class="slk-text">${escapeHtml(kp.point)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${result.analysis ? `
        <div class="slk-section">
          <h4>📝 Analysis</h4>
          <p class="slk-analysis">${escapeHtml(result.analysis)}</p>
        </div>
      ` : ''}

      ${result.takeaways?.length ? `
        <div class="slk-section">
          <h4>🎯 Takeaways</h4>
          <ul class="slk-takeaways">
            ${result.takeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${result.metadata?.topics?.length ? `
        <div class="slk-meta">
          ${result.metadata.topics.map(t => `<span class="slk-topic">#${escapeHtml(t)}</span>`).join('')}
        </div>
      ` : ''}

      <div class="slk-actions">
        <button class="slk-copy-btn" id="slk-copy">📋 Copy</button>
        <button class="slk-close-btn" id="slk-close">✕ Close</button>
      </div>
      
      <p class="slk-disclaimer">AI-generated. May contain inaccuracies.</p>
    </div>
  `;

  // Update footer usage
  const usageEl = sidebarElement?.querySelector('.slk-usage');
  if (usageEl) {
    usageEl.textContent = isPro ? 'Pro ∞' : `${remaining} left today`;
  }

  // Copy button
  const copyBtn = body.querySelector('#slk-copy');
  copyBtn?.addEventListener('click', () => {
    const text = buildCopyText(result, title);
    navigator.clipboard?.writeText(text).then(() => {
      (copyBtn as HTMLElement).textContent = '✅ Copied!';
      setTimeout(() => { (copyBtn as HTMLElement).textContent = '📋 Copy'; }, 2000);
    });
  });

  // Close button
  const closeBtn = body.querySelector('#slk-close');
  closeBtn?.addEventListener('click', closeSidebar);

  // Timestamp navigation (click to seek)
  body.querySelectorAll('.slk-point').forEach(el => {
    el.addEventListener('click', () => {
      const timestamp = el.getAttribute('data-timestamp');
      if (timestamp) {
        navigateToTimestamp(timestamp);
      }
    });
  });
}

// ============================================================
// Utilities
// ============================================================

/** Navigate video/audio to timestamp */
function navigateToTimestamp(timestamp: string): void {
  const parts = timestamp.split(':').map(Number);
  let seconds = 0;
  
  if (parts.length === 3) {
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    seconds = parts[0] * 60 + parts[1];
  }

  const video = document.querySelector('video') as HTMLVideoElement;
  if (video) {
    video.currentTime = seconds;
    video.play().catch(() => {});
  }
}

/** Build plain text for copying */
function buildCopyText(result: ProcessResult, title?: string): string {
  let text = `${title ? title + '\n' : ''}${result.title || 'Summary'}\n`;
  text += `${'═'.repeat(40)}\n\n`;
  text += `${result.summary || ''}\n\n`;
  
  if (result.key_points?.length) {
    text += `Key Points:\n`;
    result.key_points.forEach(kp => { text += `  [${kp.timestamp}] ${kp.point}\n`; });
    text += '\n';
  }
  
  if (result.analysis) {
    text += `Analysis:\n${result.analysis}\n\n`;
  }
  
  if (result.takeaways?.length) {
    text += `Takeaways:\n`;
    result.takeaways.forEach(t => { text += `  → ${t}\n`; });
  }
  
  return text;
}
