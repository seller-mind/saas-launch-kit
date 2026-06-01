# Deployment Guide

Complete step-by-step instructions for deploying your SaaS product built with SaaS Launch Kit.

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free tier works)
- Creem account (for payment)
- GitHub account (optional, for hosting landing page)

## 🚀 Part 1: Deploy Cloudflare Worker

### Step 1.1: Create Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for free account
3. Verify your email

### Step 1.2: Create KV Namespace

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **Create application**
4. Select **Workers** → **Create Worker**
5. Name it `saas-api` (or your choice)
6. Click **Create**
7. On the Worker page, scroll to **Bindings** → **KV**
8. Click **Add binding**
9. Set **Variable name** to `DB`
10. Click **Create namespace**
11. Name it `saas-storage`
12. Select the namespace and click **Add binding**
13. Note your **Namespace ID** (you'll need it for wrangler.toml)

### Step 1.3: Configure Worker

Edit `worker/wrangler.toml`:

```toml
name = "saas-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
APP_NAME = "Your App Name"
DEFAULT_LANGUAGE = "en"

[[kv_namespaces]]
binding = "DB"
id = "your-kv-namespace-id-here"
```

### Step 1.4: Set Environment Variables

Create `worker/.dev.vars`:

```bash
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_PRODUCT_ID=prod_your_product_id
AI_API_KEY=your_ai_api_key
CANONICAL_DOMAIN=yourdomain.com
```

### Step 1.5: Deploy

```bash
cd worker
npm install
npm run deploy
```

Your Worker is now live at `https://saas-api.your-username.workers.dev`

## 💳 Part 2: Setup Creem

### Step 2.1: Create Creem Account

1. Go to [creem.io](https://creem.io)
2. Sign up (supports individual sellers)
3. Complete KYC if required

### Step 2.2: Create Products

1. Go to **Products** → **New Product**
2. Create your **Pro** subscription:
   - Name: "Pro Plan"
   - Price: $9.99/month (or your choice)
   - Type: Subscription
3. Copy the **Product ID** (starts with `prod_`)
4. Create your **Lifetime** option (optional):
   - Type: One-time payment
   - Name: "Pro Lifetime"
   - Price: $99 (or your choice)

### Step 2.3: Configure Webhooks

1. Go to **Settings** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-worker.workers.dev/webhook/creem`
4. Events to listen:
   - `subscription.active`
   - `subscription.paid`
   - `subscription.canceled`
   - `subscription.expired`
   - `checkout.completed`
   - `subscription.scheduled_cancel`
5. Copy the **Webhook secret**

### Step 2.4: Get API Key

1. Go to **Settings** → **API Keys**
2. Copy your **API key**

## 📱 Part 3: Deploy Chrome Extension

### Step 3.1: Build Extension

```bash
cd extension
npm install
npm run build
```

### Step 3.2: Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/dist` folder

### Step 3.3: Publish (Optional)

1. Create a ZIP of the `dist` folder
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. Pay $5 one-time fee
4. Upload your ZIP
5. Fill in store listing
6. Submit for review

## 🌐 Part 4: Deploy Landing Page

### Option A: Cloudflare Pages (Recommended)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **Create application**
3. Select **Pages** → **Upload direct**
4. Upload the contents of `landing/` folder
5. Custom domain: `yourdomain.com`
6. Enable **HTTPS**

### Option B: Vercel

```bash
cd landing
npx vercel --prod
```

### Option C: Netlify

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `landing/` folder
3. Connect custom domain

## 🔧 Part 5: Configure DNS

### Root Domain Redirect

To redirect `yourdomain.com` to `www.yourdomain.com`:

1. Go to your DNS provider
2. Add an **ALIAS** record:
   - Name: `@`
   - Target: `www.yourdomain.com`
3. Or add a **Page Rule** redirect

### Subdomain for API

1. Add a **CNAME** record:
   - Name: `api`
   - Target: `saas-api.your-username.workers.dev`
2. Or use Cloudflare **Routes** in wrangler.toml

## ✅ Part 6: Final Configuration

### Update Extension Constants

Edit `extension/src/core/constants.ts`:

```typescript
export const EXTENSION_CONFIG = {
  name: 'Your Product Name',
  apiEndpoint: 'https://api.yourdomain.com',  // Your API domain
  checkoutUrl: 'https://yourdomain.com/#pricing',
  // ...
};
```

### Upload Landing Page to KV (Optional)

For dynamic content serving:

```bash
wrangler kv:key put "webapp:index" --path=landing/index.html --binding=DB
```

### Verify Webhook

Test your webhook endpoint:

```bash
curl -X POST https://api.yourdomain.com/webhook/creem \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","object":{"email":"test@example.com"}}'
```

## 🔒 Security Checklist

- [ ] HTTPS enabled on all domains
- [ ] Webhook signature verification enabled
- [ ] Rate limiting configured
- [ ] CORS origins restricted (in production)
- [ ] API keys stored in environment variables
- [ ] No sensitive data in client-side code

## 📊 Monitoring

### Cloudflare Analytics

1. Go to **Workers & Pages**
2. Select your Worker
3. View **Metrics** tab

### KV Storage

```bash
# List all keys
wrangler kv:key list --binding=DB

# Get a specific value
wrangler kv:key get "sub:user@example.com" --binding=DB

# Delete a key
wrangler kv:key delete "sub:user@example.com" --binding=DB
```

## 🐛 Troubleshooting

### CORS Errors

Make sure you're sending correct CORS headers. Check `worker/src/index.ts` CORS_HEADERS configuration.

### Webhook Not Working

1. Verify webhook URL is correct and accessible
2. Check webhook is enabled for all events
3. Verify signature secret matches

### Extension Not Loading

1. Check manifest.json has correct placeholders replaced
2. Verify host_permissions match your target site
3. Check console for errors: `chrome://extensions` → Errors

### Rate Limit Hit

Wait for the rate limit window to reset:
- General API: 1 hour
- Process endpoint: varies by tier

## 🚢 Production Checklist

- [ ] All domains configured with HTTPS
- [ ] Privacy Policy and Terms of Service published
- [ ] Creem products created and tested
- [ ] Webhook endpoint verified
- [ ] Chrome Extension published (if applicable)
- [ ] DNS configured
- [ ] Monitoring setup
- [ ] Email support configured
