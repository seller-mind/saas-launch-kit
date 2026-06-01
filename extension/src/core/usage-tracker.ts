// Usage tracking with daily limits for free tier

import { EXTENSION_CONFIG } from './constants';
import type { UsageData, SubscriptionData } from '../types';

/**
 * UsageTracker - Manages daily usage limits and subscription status
 * 
 * Usage pattern:
 * 1. Call canProcess() before making API calls
 * 2. Call increment() after successful API calls
 * 3. Call getRemaining() to display remaining quota
 */
export class UsageTracker {
  /**
   * Get current usage data
   */
  static async getUsage(): Promise<UsageData> {
    const result = await chrome.storage.local.get(EXTENSION_CONFIG.storage.usage);
    const usage: UsageData = result[EXTENSION_CONFIG.storage.usage] || {
      daily: 0,
      last_reset: new Date().toDateString(),
    };

    // Reset daily count if it's a new day
    const today = new Date().toDateString();
    if (usage.last_reset !== today) {
      usage.daily = 0;
      usage.last_reset = today;
      await chrome.storage.local.set({ [EXTENSION_CONFIG.storage.usage]: usage });
    }

    return usage;
  }

  /**
   * Check if user can process (has remaining quota or is Pro)
   */
  static async canProcess(): Promise<boolean> {
    const subscription = await this.getSubscription();
    if (subscription.active && subscription.plan === 'pro') {
      return true;
    }

    const usage = await this.getUsage();
    return usage.daily < EXTENSION_CONFIG.pricing.free.dailyLimit;
  }

  /**
   * Get remaining processes for today
   */
  static async getRemaining(): Promise<number> {
    const subscription = await this.getSubscription();
    if (subscription.active && subscription.plan === 'pro') {
      return Infinity;
    }

    const usage = await this.getUsage();
    return Math.max(0, EXTENSION_CONFIG.pricing.free.dailyLimit - usage.daily);
  }

  /**
   * Get the daily limit for free tier
   */
  static getDailyLimit(): number {
    return EXTENSION_CONFIG.pricing.free.dailyLimit;
  }

  /**
   * Increment usage counter (call after successful API call)
   */
  static async increment(): Promise<UsageData> {
    const usage = await this.getUsage();
    usage.daily += 1;
    await chrome.storage.local.set({ [EXTENSION_CONFIG.storage.usage]: usage });
    return usage;
  }

  /**
   * Get current subscription status
   */
  static async getSubscription(): Promise<SubscriptionData> {
    const result = await chrome.storage.local.get(EXTENSION_CONFIG.storage.subscription);
    const sub: SubscriptionData = result[EXTENSION_CONFIG.storage.subscription] || {
      active: false,
      plan: 'free',
    };

    // Check expiration if set
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      sub.active = false;
      sub.plan = 'free';
      await chrome.storage.local.set({ [EXTENSION_CONFIG.storage.subscription]: sub });
    }

    return sub;
  }

  /**
   * Update subscription status from API response
   */
  static async updateSubscription(data: { active: boolean; plan: string; email?: string }): Promise<void> {
    const sub: SubscriptionData = {
      active: data.active,
      plan: data.active ? (data.plan as 'pro') : 'free',
      email: data.email,
    };
    await chrome.storage.local.set({ [EXTENSION_CONFIG.storage.subscription]: sub });
  }

  /**
   * Check if user is Pro
   */
  static async isPro(): Promise<boolean> {
    const sub = await this.getSubscription();
    return sub.active && sub.plan === 'pro';
  }
}
