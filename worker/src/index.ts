/**
 * SaaS Launch Kit - Cloudflare Worker API
 * 
 * A complete API server template featuring:
 * - CORS configuration
 * - Rate limiting
 * - Creem payment integration
 * - Subscription management
 * - SEO endpoints (robots.txt, sitemap.xml, OG images)
 * - Webhook handling
 * - Static page serving
 * 
 * Customize this file for your specific SaaS product.
 */

// ============================================================
// Types & Interfaces
// ============================================================

export interface Env {
  DB: KVNamespace;
  CREEM_API_KEY?: string;
  CREEM_WEBHOOK_SECRET?: string;
  CREEM_PRODUCT_ID?: string;
  AI_API_KEY?: string;
  CANONICAL_DOMAIN?: string;
  APP_NAME?: string;
  DEFAULT_LANGUAGE?: string;
}

interface RateLimitData {
  timestamps: number[];
}

interface SubscriptionData {
  active: boolean;
  plan: 'free' | 'pro';
  email?: string;
  type?: 'subscription' | 'lifetime';
  current_period_end?: number;
  subscription_id?: string;
}

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  // Rate limits
  rateLimits: {
    general: { requests: 100, windowMs: 3600000 },      // 100/hour general
    process: { free: { daily: 3, hourly: 10 }, pro: { unlimited: true } },
    checkout: { requests: 5, windowMs: 3600000 },        // 5 checkout/hour
  },
  
  // Creem API
  creem: {
    baseUrl: 'https://api.creem.io/v1',
    productIds: {
      pro: 'prod_your_pro_product_id',  // Replace with your Creem product ID
      lifetime: 'prod_your_lifetime_id',
    },
  },
  
  // AI API (customize for your AI provider)
  ai: {
    model: 'gpt-4o-mini',
    maxTokens: 1500,
  },
};

// ============================================================
// CORS Headers
// ============================================================

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const HTML_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=86400',
  ...CORS_HEADERS,
};

// ============================================================
// Validation Utilities
// ============================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function isValidSourceId(id: string): boolean {
  // Customize validation based on your source ID format
  // Example: alphanumeric + dash/underscore, 5-50 chars
  return /^[a-zA-Z0-9_-]{5,50}$/.test(id);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================
// Rate Limiting
// ============================================================

async function checkRateLimit(
  env: Env,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const rateKey = `rate:${key}`;
  const rateData: RateLimitData | null = await env.DB.get(rateKey, 'json').catch(() => null);
  
  const now = Date.now();
  const windowStart = now - windowMs;
  const requests = (rateData?.timestamps || []).filter(t => t > windowStart);
  
  if (requests.length >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  requests.push(now);
  await env.DB.put(rateKey, JSON.stringify({ timestamps: requests }), { expirationTtl: Math.ceil(windowMs / 1000) });
  
  return { allowed: true, remaining: maxRequests - requests.length };
}

// ============================================================
// Main Worker Handler
// ============================================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const canonicalDomain = env.CANONICAL_DOMAIN || 'yourdomain.com';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Redirect non-canonical hosts (SEO optimization)
    const incomingHost = request.headers.get('Host') || '';
    if (incomingHost && incomingHost !== canonicalDomain && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/webhook/')) {
      if (incomingHost.endsWith('.workers.dev')) {
        return Response.redirect(`https://${canonicalDomain}${url.pathname}${url.search}`, 301);
      }
    }

    // Apply general rate limiting to API routes
    if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
      const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { allowed } = await checkRateLimit(env, `general:${clientIP}`, CONFIG.rateLimits.general.requests, CONFIG.rateLimits.general.windowMs);
      if (!allowed) {
        return Response.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429, headers: CORS_HEADERS });
      }
    }

    // ============================================================
    // API Routes
    // ============================================================

    // Health check - no rate limiting
    if (url.pathname === '/api/health') {
      return new Response('OK', { headers: CORS_HEADERS });
    }

    // Process content endpoint
    if (url.pathname === '/api/process' && request.method === 'POST') {
      return handleProcess(request, env);
    }

    // Subscription check
    if (url.pathname === '/api/subscription' && request.method === 'GET') {
      return handleSubscriptionCheck(request, env);
    }

    // Create checkout session
    if (url.pathname === '/api/checkout' && request.method === 'POST') {
      return handleCreateCheckout(request, env);
    }

    // Cache lookup
    if (url.pathname === '/api/cache' && request.method === 'GET') {
      return handleCacheLookup(request, env);
    }

    // ============================================================
    // Webhook Routes
    // ============================================================

    if (url.pathname === '/webhook/creem' && request.method === 'POST') {
      return handleCreemWebhook(request, env);
    }

    // ============================================================
    // SEO Routes
    // ============================================================

    if (url.pathname === '/robots.txt') {
      return handleRobotsTxt(env);
    }

    if (url.pathname === '/sitemap.xml') {
      return handleSitemap(env);
    }

    if (url.pathname === '/og-image.svg') {
      return handleOgImage(env);
    }

    // ============================================================
    // Legal Pages
    // ============================================================

    if (url.pathname === '/privacy' || url.pathname === '/privacy-policy') {
      return handleStaticPage(env, 'privacy');
    }

    if (url.pathname === '/terms' || url.pathname === '/terms-of-service') {
      return handleStaticPage(env, 'terms');
    }

    if (url.pathname === '/dmca') {
      return handleStaticPage(env, 'dmca');
    }

    // ============================================================
    // Web App Routes
    // ============================================================

    if (url.pathname === '/' || url.pathname === '') {
      return handleWebApp(env);
    }

    // 404 for everything else
    return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS } });
  },
};

// ============================================================
// API Handlers
// ============================================================

/**
 * Process content through AI pipeline
 */
async function handleProcess(request: Request, env: Env): Promise<Response> {
  try {
    // Parse and validate body
    const body = await request.json() as {
      source_id?: string;
      source_url?: string;
      content?: string;
      language?: string;
      target_language?: string;
      email?: string;
    };

    const { source_id, source_url, content, language = 'en', target_language, email } = body;

    // Validate required fields
    if (!source_id || !isValidSourceId(source_id)) {
      return Response.json({ error: 'Invalid or missing source_id' }, { status: 400, headers: CORS_HEADERS });
    }

    // Validate language format
    if (!/^[a-zA-Z]{2,8}(-[a-zA-Z]{2,8})?$/.test(language)) {
      return Response.json({ error: 'Invalid language format' }, { status: 400, headers: CORS_HEADERS });
    }

    // Get client info
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const normalizedEmail = email && isValidEmail(email) ? email.toLowerCase() : '';

    // Parallel: check subscription, cache, rate limits
    const [subData, cacheData, dailyData, hourlyData] = await Promise.all([
      normalizedEmail ? env.DB.get(`sub:${normalizedEmail}`, 'json').catch(() => null) : Promise.resolve(null),
      env.DB.get(`cache:${source_id}:${language}`, 'json').catch(() => null),
      env.DB.get(`rate:process:${clientIP}`, 'json').catch(() => null),
      env.DB.get(`rate:process:h:${clientIP}`, 'json').catch(() => null),
    ]);

    const isPro = (subData as SubscriptionData)?.active === true;

    // Cache hit - return immediately
    if (cacheData) {
      return Response.json({ data: cacheData, cached: true }, { headers: CORS_HEADERS });
    }

    // Rate limit check for free users
    if (!isPro) {
      const now = Date.now();
      const dayAgo = now - 86400000;
      const hourAgo = now - 3600000;
      
      const dailyRequests = ((dailyData as RateLimitData)?.timestamps || []).filter(t => t > dayAgo);
      if (dailyRequests.length >= CONFIG.rateLimits.process.free.daily) {
        return Response.json({ error: 'Daily free limit reached. Upgrade to Pro for unlimited access.' }, { status: 429, headers: CORS_HEADERS });
      }

      const hourlyRequests = ((hourlyData as RateLimitData)?.timestamps || []).filter(t => t > hourAgo);
      if (hourlyRequests.length >= CONFIG.rateLimits.process.free.hourly) {
        return Response.json({ error: 'Hourly rate limit reached. Please wait or upgrade to Pro.' }, { status: 429, headers: CORS_HEADERS });
      }
    }

    // Process content with AI (implement your AI logic here)
    const result = await processWithAI(content || '', language, target_language, env);

    if (!result) {
      return Response.json({ error: 'Processing failed. Please try again.' }, { status: 503, headers: CORS_HEADERS });
    }

    // Update rate limits for free users
    if (!isPro) {
      const now = Date.now();
      const dayKey = `rate:process:${clientIP}`;
      const hourKey = `rate:process:h:${clientIP}`;

      const dayData: RateLimitData = { timestamps: [...((dailyData as RateLimitData)?.timestamps || []), now].filter(t => t > now - 86400000) };
      const hourData: RateLimitData = { timestamps: [...((hourlyData as RateLimitData)?.timestamps || []), now].filter(t => t > now - 3600000) };

      await Promise.all([
        env.DB.put(dayKey, JSON.stringify(dayData), { expirationTtl: 86400 }),
        env.DB.put(hourKey, JSON.stringify(hourData), { expirationTtl: 3600 }),
      ]);
    }

    // Cache result (7 days)
    result.source_url = source_url || '';
    const { source_url: _, ...cachePayload } = result;
    await env.DB.put(`cache:${source_id}:${language}`, JSON.stringify(cachePayload), { expirationTtl: 604800 }).catch(() => {});

    return Response.json({ data: result }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('[Process] Error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500, headers: CORS_HEADERS });
  }
}

/**
 * Process content with AI (placeholder - implement your logic)
 */
async function processWithAI(
  content: string,
  language: string,
  targetLanguage: string | undefined,
  env: Env
): Promise<{
  title: string;
  summary: string;
  key_points: Array<{ timestamp: string; point: string }>;
  analysis: string;
  takeaways: string[];
  metadata: { difficulty: string; topics: string[] };
  source_url: string;
} | null> {
  // ============================================================
  // TODO: Implement your AI processing logic here
  // ============================================================
  // This is a placeholder that returns a mock response
  // Replace with your actual AI integration (OpenAI, Claude, etc.)
  // ============================================================

  if (!env.AI_API_KEY) {
    // Return mock data for development
    return {
      title: 'Sample Processed Content',
      summary: 'This is a sample summary generated by the AI pipeline.',
      key_points: [
        { timestamp: '0:00', point: 'First key point extracted from the content' },
        { timestamp: '1:30', point: 'Second important point to note' },
        { timestamp: '3:00', point: 'Third key insight' },
      ],
      analysis: 'This is a detailed analysis of the processed content. It provides insights into the main themes and patterns detected.',
      takeaways: [
        'First actionable takeaway',
        'Second insight you can apply',
        'Third recommendation',
      ],
      metadata: {
        difficulty: 'intermediate',
        topics: ['SaaS', 'Development', 'AI'],
      },
      source_url: '',
    };
  }

  // Example: OpenAI API call (uncomment and customize)
  /*
  try {
    const messages = [
      {
        role: 'user',
        content: `Analyze the following content and provide a structured summary.
        
Content: ${content.substring(0, 10000)}
Language: ${language}
${targetLanguage ? `Translate to: ${targetLanguage}` : ''}

Return JSON with: title, summary, key_points (with timestamps), analysis, takeaways, metadata (difficulty, topics).`,
      },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.ai.model,
        messages,
        max_tokens: CONFIG.ai.maxTokens,
      }),
    });

    if (!response.ok) {
      console.error('[AI] API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content_text = data.choices?.[0]?.message?.content;
    
    if (content_text) {
      // Parse JSON from response
      const jsonMatch = content_text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('[AI] Error:', error);
  }
  */

  return null;
}

/**
 * Check subscription status
 */
async function handleSubscriptionCheck(request: Request, env: Env): Promise<Response> {
  try {
    const email = new URL(request.url).searchParams.get('email');
    
    if (!email) {
      return Response.json({ error: 'Missing email parameter' }, { status: 400, headers: CORS_HEADERS });
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: 'Invalid email format' }, { status: 400, headers: CORS_HEADERS });
    }

    const sub: SubscriptionData | null = await env.DB.get(`sub:${email.toLowerCase()}`, 'json').catch(() => null);

    if (sub?.active) {
      // Check expiration for subscriptions
      if (sub.current_period_end) {
        const periodEnd = new Date(sub.current_period_end);
        if (!isNaN(periodEnd.getTime()) && periodEnd < new Date()) {
          // Subscription expired
          await env.DB.put(`sub:${email.toLowerCase()}`, JSON.stringify({ ...sub, active: false }), { expirationTtl: 31536000 });
          return Response.json({ active: false, plan: 'free' }, { headers: CORS_HEADERS });
        }
      }
      return Response.json({ active: true, plan: sub.plan || 'pro' }, { headers: CORS_HEADERS });
    }

    return Response.json({ active: false, plan: 'free' }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('[Subscription] Error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS_HEADERS });
  }
}

/**
 * Create Creem checkout session
 */
async function handleCreateCheckout(request: Request, env: Env): Promise<Response> {
  try {
    if (!env.CREEM_API_KEY) {
      return Response.json({ error: 'Payment not configured' }, { status: 503, headers: CORS_HEADERS });
    }

    const body = await request.json() as { product_id?: string; email?: string };
    const { product_id, email } = body;

    if (!product_id) {
      return Response.json({ error: 'Missing product_id' }, { status: 400, headers: CORS_HEADERS });
    }

    // Validate product ID matches expected
    const expectedProductIds = [CONFIG.creem.productIds.pro, CONFIG.creem.productIds.lifetime];
    if (!expectedProductIds.includes(product_id)) {
      return Response.json({ error: 'Invalid product' }, { status: 400, headers: CORS_HEADERS });
    }

    // Check refund cooldown (30 days after cancellation)
    if (email) {
      const cooldown = await env.DB.get(`cooldown:${email.toLowerCase()}`, 'json').catch(() => null);
      if ((cooldown as { canceledAt?: number })?.canceledAt) {
        const daysSinceCancel = (Date.now() - cooldown.canceledAt) / 86400000;
        if (daysSinceCancel < 30) {
          return Response.json({
            error: `Please wait ${Math.ceil(30 - daysSinceCancel)} days before resubscribing.`,
          }, { status: 429, headers: CORS_HEADERS });
        }
      }
    }

    // Rate limit checkout attempts
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { allowed } = await checkRateLimit(env, `checkout:${clientIP}`, CONFIG.rateLimits.checkout.requests, CONFIG.rateLimits.checkout.windowMs);
    if (!allowed) {
      return Response.json({ error: 'Too many checkout attempts. Please try again later.' }, { status: 429, headers: CORS_HEADERS });
    }

    // Create Creem checkout
    const baseUrl = new URL(request.url).origin;
    const checkoutPayload: Record<string, unknown> = {
      product_id,
      success_url: `${baseUrl}/?checkout=success`,
    };
    
    if (email && isValidEmail(email)) {
      checkoutPayload.customer = { email: email.toLowerCase() };
    }

    const response = await fetch(`${CONFIG.creem.baseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'x-api-key': env.CREEM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutPayload),
    });

    if (!response.ok) {
      console.error('[Creem] Checkout error:', response.status, await response.text());
      return Response.json({ error: 'Failed to create checkout session' }, { status: 500, headers: CORS_HEADERS });
    }

    const data = await response.json();
    return Response.json({ checkout_url: data.checkout_url, checkout_id: data.id }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500, headers: CORS_HEADERS });
  }
}

/**
 * Cache lookup
 */
async function handleCacheLookup(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const sourceId = url.searchParams.get('source_id');
  const language = url.searchParams.get('language') || 'en';

  if (!sourceId) {
    return Response.json({ error: 'Missing source_id' }, { status: 400, headers: CORS_HEADERS });
  }

  const cacheKey = `cache:${sourceId}:${language}`;
  const cached = await env.DB.get(cacheKey, 'json').catch(() => null);

  if (cached) {
    return Response.json({ data: cached, cached: true }, { headers: CORS_HEADERS });
  }

  return Response.json({ data: null }, { headers: CORS_HEADERS });
}

// ============================================================
// Webhook Handler
// ============================================================

/**
 * Handle Creem webhooks
 */
async function handleCreemWebhook(request: Request, env: Env): Promise<Response> {
  const payload = await request.text();
  const signature = request.headers.get('creem-signature');

  // Verify webhook signature
  if (env.CREEM_WEBHOOK_SECRET && signature) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(env.CREEM_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const computed = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const computedHex = [...new Uint8Array(computed)].map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (!timingSafeEqual(computedHex, signature)) {
      return new Response('Invalid signature', { status: 401 });
    }
  }

  try {
    const event = JSON.parse(payload);
    const email = (event.object?.customer_email || event.object?.email || '').toLowerCase();

    if (!email) {
      return new Response('OK', { status: 200 });
    }

    // Prevent stale events from overwriting newer state
    const eventTime = event.object?.updated_at || event.object?.created_at || Date.now() / 1000;
    const eventTs = typeof eventTime === 'number' ? eventTime : new Date(eventTime).getTime() / 1000;
    const lastEventKey = `event-ts:${email}`;
    const lastTs = await env.DB.get(lastEventKey, 'text').catch(() => null);
    
    if (lastTs && parseFloat(lastTs) > eventTs) {
      console.log(`[Webhook] Stale event ${event.event_type} for ${email}, skipping`);
      return new Response('OK', { status: 200 });
    }
    await env.DB.put(lastEventKey, String(eventTs), { expirationTtl: 86400 });

    // Handle different event types
    switch (event.event_type) {
      case 'subscription.active':
      case 'subscription.paid':
        await env.DB.put(`sub:${email}`, JSON.stringify({
          active: true,
          plan: 'pro',
          type: 'subscription',
          subscription_id: event.object?.id,
          current_period_end: event.object?.current_period_end,
        }), { expirationTtl: 31536000 });
        break;

      case 'subscription.canceled':
      case 'subscription.expired':
        await env.DB.put(`sub:${email}`, JSON.stringify({
          active: false,
          plan: 'free',
          type: 'subscription',
        }), { expirationTtl: 31536000 });
        // Track for 30-day refund cooldown
        await env.DB.put(`cooldown:${email}`, JSON.stringify({ canceledAt: Date.now() }), { expirationTtl: 2592000 });
        break;

      case 'checkout.completed':
        const obj = event.object || {};
        if (obj.mode === 'payment' || !obj.subscription_id) {
          // Lifetime purchase
          await env.DB.put(`sub:${email}`, JSON.stringify({
            active: true,
            plan: 'pro',
            type: 'lifetime',
          }), { expirationTtl: 31536000 });
        } else {
          // Subscription via checkout
          await env.DB.put(`sub:${email}`, JSON.stringify({
            active: true,
            plan: 'pro',
            type: 'subscription',
            subscription_id: obj.subscription_id,
            current_period_end: obj.current_period_end,
          }), { expirationTtl: 31536000 });
        }
        break;

      case 'subscription.scheduled_cancel':
        await env.DB.put(`sub:${email}`, JSON.stringify({
          active: true,
          plan: 'pro',
          type: 'subscription',
          cancel_at_period_end: true,
          current_period_end: event.object?.current_period_end,
        }), { expirationTtl: 31536000 });
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.event_type}`);
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    console.error('[Webhook] Error:', error);
    return new Response('Bad request', { status: 400 });
  }
}

// ============================================================
// SEO Handlers
// ============================================================

/**
 * robots.txt
 */
function handleRobotsTxt(env: Env): Response {
  const domain = env.CANONICAL_DOMAIN || 'yourdomain.com';
  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /webhook/
Disallow: /checkout

Sitemap: https://${domain}/sitemap.xml`;

  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'public, max-age=86400' },
  });
}

/**
 * sitemap.xml
 */
function handleSitemap(env: Env): Response {
  const domain = env.CANONICAL_DOMAIN || 'yourdomain.com';
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${domain}/pricing</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://${domain}/features</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://${domain}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://${domain}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

  return new Response(sitemap, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=86400' },
  });
}

/**
 * OG Image (SVG)
 */
function handleOgImage(env: Env): Response {
  const appName = env.APP_NAME || 'SaaS Launch Kit';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#4f46e5"/>
        <stop offset="100%" style="stop-color:#7c3aed"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <text x="80" y="260" font-family="system-ui, sans-serif" font-size="72" font-weight="800" fill="white">${escapeXml(appName)}</text>
    <text x="80" y="340" font-family="system-ui, sans-serif" font-size="32" fill="rgba(255,255,255,0.85)">Ship Your SaaS in Days, Not Months</text>
    <text x="80" y="400" font-family="system-ui, sans-serif" font-size="24" fill="rgba(255,255,255,0.65)">For Chinese indie devs who want to go global</text>
  </svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' },
  });
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// Static Page Handlers
// ============================================================

/**
 * Serve web app from KV
 */
async function handleWebApp(env: Env): Promise<Response> {
  const html = await env.DB.get('webapp:index', 'text');
  
  if (html) {
    return new Response(html, { headers: HTML_HEADERS });
  }

  // Return default landing page if not in KV
  return new Response(getDefaultLandingPage(env), { headers: HTML_HEADERS });
}

/**
 * Serve static pages (privacy, terms, etc.)
 */
async function handleStaticPage(env: Env, page: string): Promise<Response> {
  const html = await env.DB.get(`webapp:${page}`, 'text');
  
  if (html) {
    return new Response(html, { headers: HTML_HEADERS });
  }

  // Return default content if not in KV
  return new Response(getDefaultLegalPage(page), { headers: HTML_HEADERS });
}

// ============================================================
// Default Page Content
// ============================================================

function getDefaultLandingPage(env: Env): string {
  const appName = env.APP_NAME || 'SaaS Launch Kit';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(appName)}</title>
  <meta name="description" content="Build your SaaS product in days, not months. A complete starter kit for Chinese indie developers.">
  <link rel="canonical" href="https://${env.CANONICAL_DOMAIN || 'yourdomain.com'}/">
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeXml(appName)}">
  <meta property="og:description" content="Build your SaaS product in days, not months">
  <meta property="og:type" content="website">
  <meta property="og:image" content="/og-image.svg">
  <!-- Schema.org -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "${escapeXml(appName)}",
    "description": "SaaS starter kit for developers",
    "applicationCategory": "BusinessApplication"
  }
  </script>
</head>
<body>
  <div id="app">
    <h1>Welcome to ${escapeXml(appName)}</h1>
    <p>Deploy your web app to Cloudflare KV to see your landing page here.</p>
  </div>
</body>
</html>`;
}

function getDefaultLegalPage(page: string): string {
  const titles: Record<string, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    dmca: 'DMCA Policy',
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titles[page] || 'Page'}</title>
</head>
<body>
  <h1>${titles[page] || 'Page'}</h1>
  <p>Deploy your legal pages to Cloudflare KV to see them here.</p>
</body>
</html>`;
}
