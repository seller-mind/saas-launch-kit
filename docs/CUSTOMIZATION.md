# Customization Guide

How to customize SaaS Launch Kit for your specific product.

## 🎯 Customization Checklist

- [ ] Rename extension and update manifest
- [ ] Configure API endpoint
- [ ] Set up Creem products
- [ ] Implement AI processing logic
- [ ] Customize selectors for your target site
- [ ] Update landing page content
- [ ] Configure legal pages
- [ ] Set up i18n messages

## 📦 Extension Customization

### 1. Update Manifest

Edit `extension/manifest.json`:

```json
{
  "name": "Your Product Name",
  "version": "1.0.0",
  "description": "Your product description",
  "host_permissions": [
    "https://target-site.com/*"
  ]
}
```

### 2. Configure Constants

Edit `extension/src/core/constants.ts`:

```typescript
export const EXTENSION_CONFIG = {
  name: 'Your Product Name',
  version: '1.0.0',
  apiEndpoint: 'https://api.yourdomain.com',
  
  pricing: {
    free: {
      dailyLimit: 3,  // Adjust for your product
    },
    pro: {
      monthly: 9.99,  // Your pricing
    },
  },
  
  checkoutUrl: 'https://yourdomain.com/#pricing',
};
```

### 3. Custom Selectors

Edit `extension/src/core/constants.ts` SITE_SELECTORS:

```typescript
export const SITE_SELECTORS = {
  content: {
    // CSS selectors for content extraction
    article: 'article, .content, main',
    transcript: '.transcript, #transcript',
    title: 'h1, .title',
  },
  buttons: {
    summarize: 'button.summarize',
    process: 'button[data-action="process"]',
  },
};
```

### 4. Update Content Script

Edit `extension/src/content/index.ts` to customize:

- Content extraction logic
- Source ID detection
- Language detection

```typescript
function extractSourceId(): { id: string; url: string } | null {
  const url = window.location.href;
  
  // Customize based on your target site
  const match = url.match(/\/content\/(\d+)/);
  if (match) {
    return { id: match[1], url };
  }
  
  return null;
}
```

### 5. Update Sidebar UI

Edit `extension/src/content/sidebar.ts` to customize:

- Result display format
- Action buttons
- Styling

## 🔧 Worker Customization

### 1. AI Processing Logic

The core of your product. Edit `worker/src/index.ts`:

```typescript
async function processWithAI(
  content: string,
  language: string,
  targetLanguage: string | undefined,
  env: Env
) {
  // YOUR AI LOGIC HERE
  // Return structured result:
  return {
    title: 'Generated Title',
    summary: 'One-line summary',
    key_points: [
      { timestamp: '0:00', point: 'Key point 1' },
      { timestamp: '1:30', point: 'Key point 2' },
    ],
    analysis: 'Detailed analysis...',
    takeaways: ['Takeaway 1', 'Takeaway 2'],
    metadata: {
      difficulty: 'intermediate',
      topics: ['Topic A', 'Topic B'],
    },
    source_url: '',
  };
}
```

### 2. Creem Product IDs

Update `worker/src/index.ts`:

```typescript
const CONFIG = {
  creem: {
    productIds: {
      pro: 'prod_your_pro_product_id',
      lifetime: 'prod_your_lifetime_id',
    },
  },
};
```

### 3. Rate Limits

Adjust rate limits for your use case:

```typescript
const CONFIG = {
  rateLimits: {
    process: {
      free: { daily: 5, hourly: 15 },  // More generous
      pro: { unlimited: true },
    },
  },
};
```

### 4. API Response Format

Customize the response structure in `handleProcess()`:

```typescript
return Response.json({ 
  data: result,
  cached: false,
  usage: {  // Optional: include usage info
    remaining: 2,
    limit: 3,
  }
}, { headers: CORS_HEADERS });
```

## 🎨 Landing Page Customization

### 1. Update Content

Edit `landing/index.html`:

- Title and description
- Hero section
- Features list
- Pricing tiers
- FAQ content
- Footer information

### 2. Update Branding

```css
:root {
  --primary: #your-brand-color;
  --secondary: #your-secondary-color;
  --bg: #your-background-color;
}
```

### 3. Add Screenshots

Replace placeholder areas with actual product screenshots:

```html
<div class="screenshot">
  <img src="/images/screenshot.png" alt="Product Screenshot">
</div>
```

## 📄 Legal Pages

### Privacy Policy Template

Create `privacy.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Privacy Policy - Your Product</title>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p>Last updated: 2024-01-01</p>
  
  <h2>Information We Collect</h2>
  <p>Describe what data you collect...</p>
  
  <h2>How We Use Information</h2>
  <p>Describe how you use data...</p>
  
  <h2>Contact Us</h2>
  <p>your@email.com</p>
</body>
</html>
```

Upload to Cloudflare KV:

```bash
wrangler kv:key put "webapp:privacy" --path=privacy.html --binding=DB
```

## 🌐 i18n Customization

### Add New Language

1. Create `extension/src/_locales/XX/messages.json`
2. Translate all message keys
3. Update `extension/src/core/constants.ts`:

```typescript
export const SUPPORTED_LANGUAGES = ['en', 'zh-CN', 'ja', 'es', 'fr'] as const;
```

### Update Language Detection

Edit `extension/src/content/index.ts`:

```typescript
function detectLanguage(text: string): string {
  // Add language detection logic
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
  if (/[\u00e0-\u00fc]/.test(text)) return 'es';  // Spanish
  return 'en';
}
```

## 🔌 Adding New API Endpoints

### 1. Define Route

In `worker/src/index.ts`:

```typescript
if (url.pathname === '/api/your-endpoint' && request.method === 'POST') {
  return handleYourEndpoint(request, env);
}
```

### 2. Implement Handler

```typescript
async function handleYourEndpoint(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json();
    const { param1, param2 } = body;
    
    // Validate input
    if (!param1) {
      return Response.json({ error: 'Missing param1' }, { status: 400 });
    }
    
    // Process
    const result = await yourLogic(param1, param2, env);
    
    return Response.json({ data: result }, { headers: CORS_HEADERS });
  } catch (error) {
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### 3. Add Client Method

In `extension/src/core/api-client.ts`:

```typescript
async yourEndpoint(param1: string, param2: string): Promise<APIResponse<YourType>> {
  const response = await fetch(`${this.endpoint}/api/your-endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ param1, param2 }),
  });
  
  const data = await response.json();
  return { success: response.ok, data: data.data, error: data.error };
}
```

## 📊 Adding Analytics

### Simple Event Tracking

```typescript
// In extension
async function trackEvent(event: string, data?: Record<string, unknown>) {
  // Send to your analytics endpoint
  await fetch(`${API_ENDPOINT}/api/track`, {
    method: 'POST',
    body: JSON.stringify({ event, data, timestamp: Date.now() }),
  }).catch(() => {});
}
```

### Usage

```typescript
// Track extension opens
trackEvent('extension_opened', { plan: 'free' });

// Track processing
trackEvent('content_processed', { 
  success: true, 
  cached: false 
});
```

## 🔄 Updating Extension Dynamically

### Version Management

In `extension/src/core/constants.ts`:

```typescript
export const UPDATE_CONFIG = {
  checkInterval: 1000 * 60 * 60, // Check every hour
  updateUrl: 'https://api.yourdomain.com/extension/version',
};
```

### Check for Updates

```typescript
async function checkForUpdates() {
  const response = await fetch(UPDATE_CONFIG.updateUrl);
  const data = await response.json();
  
  if (data.version > EXTENSION_CONFIG.version) {
    // Notify user of available update
    showUpdateNotification(data.downloadUrl);
  }
}
```

## 🚀 Advanced: Multiple Products

To use the template for multiple products:

1. Fork the template for each product
2. Use GitHub templates
3. Share common logic via npm packages
4. Use environment-specific configs

```typescript
// Environment-based config
const config = {
  production: { /* ... */ },
  staging: { /* ... */ },
  development: { /* ... */ },
};

const env = process.env.NODE_ENV || 'development';
export default config[env];
```
