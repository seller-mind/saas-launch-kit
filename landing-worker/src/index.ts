/**
 * SaaS Launch Kit Landing Page Worker
 * Serves the landing page from KV cache with SEO and performance optimizations
 */

interface Env {
  DB: KVNamespace;
  LANDING_HTML?: string;
  ENVIRONMENT: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// SEO headers for the landing page
const SEO_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // robots.txt
    if (url.pathname === '/robots.txt') {
      return new Response(
        `User-agent: *\nAllow: /\n\nSitemap: https://saaslaunchkit.dev/sitemap.xml`,
        { headers: { 'Content-Type': 'text/plain' } }
      );
    }

    // sitemap.xml
    if (url.pathname === '/sitemap.xml') {
      const today = new Date().toISOString().split('T')[0];
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://saaslaunchkit.dev/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
        { headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Serve landing page for all other routes
    // Try KV first, then fallback to embedded HTML
    let html = await env.DB.get('landing:index', 'text').catch(() => null);

    if (!html) {
      // Fallback: redirect to Creem product page
      return Response.redirect('https://creem.io/product/prod_6LpO4sd1iUR0VMLfZXZg4f', 302);
    }

    // Inject canonical URL
    html = html.replace(
      '<head>',
      `<head>\n    <link rel="canonical" href="https://saaslaunchkit.dev/" />`
    );

    return new Response(html, {
      headers: { ...SEO_HEADERS, ...CORS_HEADERS },
    });
  },
};
