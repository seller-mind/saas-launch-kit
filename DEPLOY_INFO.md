# SaaS Launch Kit - Deployment Info

## Creem Products
- **Starter ($99)**: `prod_6LpO4sd1iUR0VMLfZXZg4f`
  - Checkout: https://creem.io/checkout/prod_6LpO4sd1iUR0VMLfZXZg4f
  - Product page: https://creem.io/product/prod_6LpO4sd1iUR0VMLfZXZg4f
- **Pro ($199)**: `prod_5dISibto5tNwH6d95VGHrZ`
  - Checkout: https://creem.io/checkout/prod_5dISibto5tNwH6d95VGHrZ
  - Product page: https://creem.io/product/prod_5dISibto5tNwH6d95VGHrZ

## Cloudflare Worker
- **Worker name**: `saas-launch-kit`
- **URL**: https://saas-launch-kit.haimozhouqiu.workers.dev
- **KV Namespace**: `d7f07a5445ae44d9b21fa7fb8f241c21`
- **KV Key**: `landing:index` (landing page HTML)

## Webhook
- **Endpoint**: https://saas-launch-kit.haimozhouqiu.workers.dev/webhook/creem
- ⚠️ Needs to be configured in Creem Dashboard > Developers > Webhooks

## Still TODO
1. **Custom domain**: Buy saaslaunchkit.dev (or similar) → Point to Worker via Cloudflare
2. **Creem Webhook URL**: Set in Creem Dashboard
3. **Creem product settings**: Set success_url in Dashboard (API PATCH not working)
4. **Download delivery**: Set up GitHub repo or Creem file delivery for the zip
5. **OG image**: Create and upload og-image.svg
6. **Google Search Console**: Verify domain for SEO
7. **Community promotion**: V2EX, Twitter, indie hacker forums

## Pricing
- Starter: $99 (single project, 1 year updates)
- Pro: $199 (unlimited projects, lifetime updates, priority support)
