# SaaS Launch Kit

**Ship Your SaaS in Days, Not Months**

A complete starter kit for Chinese indie developers building global SaaS products. Includes Chrome Extension MV3, Cloudflare Worker API, Creem payment integration, SEO setup, and i18n support.

## 🎯 What's Included

### Chrome Extension Template
- **Manifest V3** architecture with modern best practices
- **Popup UI** with usage display, settings, and subscription management
- **Content Script** with sidebar UI for displaying results
- **Background Service Worker** for message routing
- **esbuild** bundler for fast builds

### Cloudflare Worker API
- **RESTful API** with CORS configuration
- **Rate limiting** (general + per-endpoint)
- **KV Storage** for subscriptions and cache
- **Webhook handling** with signature verification
- **SEO endpoints** (robots.txt, sitemap.xml, OG image)

### Creem Payment Integration
- **Checkout sessions** creation
- **Webhook verification** with timing-safe comparison
- **Subscription lifecycle** management
- **Refund cooldown** prevention (30 days)

### Additional Features
- **Free/Pro tier system** with daily limits
- **i18n support** (English, Chinese, Japanese)
- **Legal page templates** (Privacy, Terms, DMCA)
- **Professional landing page** template

## 📁 Project Structure

```
saas-launch-kit/
├── extension/           # Chrome Extension template
│   ├── src/
│   │   ├── popup/       # Popup UI
│   │   ├── content/      # Content scripts + sidebar
│   │   ├── background/   # Service worker
│   │   ├── core/         # API client, usage tracker
│   │   └── types/        # TypeScript definitions
│   ├── scripts/          # Build scripts
│   └── manifest.json
├── worker/              # Cloudflare Worker API
│   ├── src/
│   │   └── index.ts     # Main API handler
│   └── wrangler.toml
├── landing/             # Landing page template
│   └── index.html
└── docs/                # Documentation
    ├── README.md
    ├── DEPLOYMENT.md
    └── CUSTOMIZATION.md
```

## 🚀 Quick Start

### 1. Get the Template

```bash
# Clone or download the template
git clone https://github.com/your-repo/saas-launch-kit.git
cd saas-launch-kit
```

### 2. Configure Extension

```bash
cd extension
npm install

# Edit manifest.json placeholders:
# - __EXTENSION_NAME__
# - __EXTENSION_DESCRIPTION__
# - __HOST_PERMISSION__
# - __API_DOMAIN__

# Build the extension
npm run build
```

### 3. Configure Worker

```bash
cd worker
npm install

# Create .dev.vars file:
# CREEM_API_KEY=your_key
# CREEM_WEBHOOK_SECRET=your_secret
# CREEM_PRODUCT_ID=prod_xxx
# AI_API_KEY=your_ai_key
# CANONICAL_DOMAIN=yourdomain.com

# Test locally
npm run dev

# Deploy
npm run deploy
```

### 4. Customize

1. Update `extension/src/core/constants.ts` with your API endpoint
2. Implement your AI processing logic in `worker/src/index.ts`
3. Customize the landing page at `landing/index.html`
4. Update legal pages with your information

## 💡 Key Features

### Free/Pro Tier System

```typescript
// Check if user can process
const canProcess = await UsageTracker.canProcess();

// Get remaining quota
const remaining = await UsageTracker.getRemaining();

// Increment after successful call
await UsageTracker.increment();
```

### API Client Usage

```typescript
import { APIClient } from './core/api-client';

const api = new APIClient('https://your-api.workers.dev');

// Process content
const result = await api.process({
  source_id: 'video123',
  source_url: 'https://example.com/video123',
  language: 'en',
  email: 'user@example.com',
});

// Check subscription
const sub = await api.checkSubscription('user@example.com');
```

### Creem Webhook Events

The API handles these Creem webhook events:
- `subscription.active` / `subscription.paid` → Activate subscription
- `subscription.canceled` / `subscription.expired` → Deactivate subscription
- `checkout.completed` → Activate for lifetime or subscription purchases
- `subscription.scheduled_cancel` → Mark for cancellation at period end

## 🔒 Security Features

- **Constant-time comparison** for webhook signatures
- **Input validation** on all endpoints
- **Rate limiting** to prevent abuse
- **CORS configuration** for API routes
- **XSS prevention** in content script (escapeHtml)

## 🌐 i18n

The extension supports:
- English (`en`)
- Chinese Simplified (`zh-CN`)
- Japanese (`ja`)

Messages are defined in `extension/src/_locales/*/messages.json`.

## 📊 Rate Limits

| Endpoint | Free Users | Pro Users |
|----------|-----------|----------|
| General API | 100/hour | 100/hour |
| Process | 3/day, 10/hour | Unlimited |
| Checkout | 5/hour | 5/hour |

## 🔧 Configuration

### Environment Variables (Worker)

| Variable | Description |
|----------|-------------|
| `CREEM_API_KEY` | Your Creem API key |
| `CREEM_WEBHOOK_SECRET` | Webhook signature secret |
| `CREEM_PRODUCT_ID` | Your Pro product ID in Creem |
| `AI_API_KEY` | Your AI provider API key |
| `CANONICAL_DOMAIN` | Your production domain |

### Extension Constants

Edit `extension/src/core/constants.ts`:

```typescript
export const EXTENSION_CONFIG = {
  name: 'Your Extension Name',
  version: '1.0.0',
  apiEndpoint: 'https://your-api.workers.dev',
  pricing: {
    free: { dailyLimit: 3 },
    pro: { monthly: 9.99 },
  },
  checkoutUrl: 'https://yourdomain.com/#pricing',
};
```

## 📖 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Step-by-step deployment instructions
- [Customization Guide](./CUSTOMIZATION.md) - How to customize for your product

## 🤝 Support

- **Pro Users**: Priority email support
- **Starter Users**: GitHub Issues

## 📄 License

MIT License - Use freely for personal and commercial projects.

---

Built with ❤️ for Chinese indie developers going global.
