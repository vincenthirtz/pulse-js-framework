/**
 * Netlify Edge Function for Dynamic SEO Meta Tags
 * Injects page-specific meta tags for social sharing (LinkedIn, Twitter, Facebook)
 */

const BASE_URL = 'https://pulse-js.fr';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'Pulse Framework';

/**
 * SEO metadata for each page
 * Keys correspond to route paths (without locale prefix)
 * Images from Unsplash (free for commercial use, no attribution required)
 */
const pageSEO = {
  '/': {
    title: 'Pulse Framework - Zero Dependency Reactive JavaScript Framework',
    description: 'A lightweight (~4kb core) declarative DOM framework with CSS selector-based structure, signal-based reactivity, and zero dependencies. Build SPAs and mobile apps without a build step.',
    keywords: 'javascript framework, reactive, signals, zero dependencies, lightweight, SPA, mobile apps',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=630&fit=crop' // Code on screen - Florian Olivo
  },
  '/getting-started': {
    title: 'Getting Started - Pulse Framework',
    description: 'Learn how to install and set up Pulse Framework. Create your first reactive application in minutes with our step-by-step guide.',
    keywords: 'pulse tutorial, getting started, installation, setup, quick start',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&h=630&fit=crop' // Person starting laptop - John Schnobrich
  },
  '/core-concepts': {
    title: 'Core Concepts - Pulse Framework',
    description: 'Understand Pulse Framework core concepts: reactivity with signals, declarative DOM creation, routing, and state management.',
    keywords: 'reactivity, signals, effects, computed, DOM, pulse concepts',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200&h=630&fit=crop' // React/JS code - Lautaro Andreani
  },
  '/api-reference': {
    title: 'API Reference - Pulse Framework',
    description: 'Complete API documentation for Pulse Framework. Reference for pulse(), effect(), computed(), el(), router, store, and all modules.',
    keywords: 'API, reference, documentation, pulse, effect, computed, el, router, store',
    image: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1200&h=630&fit=crop' // Python/code - Chris Ried
  },
  '/http': {
    title: 'HTTP Client - Pulse Framework',
    description: 'Zero-dependency HTTP client with interceptors, retries, timeout handling, and reactive integration. Built-in support for REST APIs.',
    keywords: 'HTTP, fetch, REST API, interceptors, async, useHttp',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop' // Server room - Taylor Vick
  },
  '/websocket': {
    title: 'WebSocket Client - Pulse Framework',
    description: 'Real-time WebSocket client with auto-reconnect, heartbeat, message queuing, and reactive state. Build live features easily.',
    keywords: 'WebSocket, real-time, auto-reconnect, heartbeat, live updates',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=630&fit=crop' // Network connections globe - NASA
  },
  '/graphql': {
    title: 'GraphQL Client - Pulse Framework',
    description: 'GraphQL client with queries, mutations, subscriptions, caching, and optimistic updates. Full support for modern GraphQL APIs.',
    keywords: 'GraphQL, queries, mutations, subscriptions, cache, Apollo alternative',
    image: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&h=630&fit=crop' // Network graph - Alina Grubnyak
  },
  '/context': {
    title: 'Context API - Pulse Framework',
    description: 'Dependency injection and prop drilling prevention with Context API. Share state across components without explicit passing.',
    keywords: 'context, dependency injection, providers, useContext, shared state',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=630&fit=crop' // Connected nodes - JJ Ying
  },
  '/devtools': {
    title: 'DevTools - Pulse Framework',
    description: 'Debugging and profiling tools: time-travel debugging, dependency graphs, performance profiling, and accessibility auditing.',
    keywords: 'devtools, debugging, profiling, time-travel, dependency graph',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=630&fit=crop' // Code debugging - Ilya Pavlov
  },
  '/accessibility': {
    title: 'Accessibility Guide - Pulse Framework',
    description: 'Built-in accessibility features: auto-ARIA attributes, focus management, screen reader announcements, and WCAG compliance tools.',
    keywords: 'accessibility, a11y, ARIA, WCAG, screen reader, focus management',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&h=630&fit=crop' // Inclusive tech - Christina @ wocintechchat
  },
  '/debugging': {
    title: 'Debugging Guide - Pulse Framework',
    description: 'Debug Pulse applications effectively. Learn about trackedPulse, effect debugging, common issues, and troubleshooting techniques.',
    keywords: 'debugging, troubleshooting, trackedPulse, effects, errors',
    image: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=1200&h=630&fit=crop' // Bug/code - Kevin Ku
  },
  '/security': {
    title: 'Security Guide - Pulse Framework',
    description: 'Security best practices: XSS prevention, URL sanitization, safe attribute handling, and CSS injection protection.',
    keywords: 'security, XSS, sanitization, escapeHtml, safe patterns',
    image: 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=1200&h=630&fit=crop' // Security lock digital - FLY:D
  },
  '/performance': {
    title: 'Performance Guide - Pulse Framework',
    description: 'Optimize Pulse applications: batch updates, lazy computed, efficient list rendering, and bundle size optimization.',
    keywords: 'performance, optimization, batch, lazy, bundle size, speed',
    image: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1200&h=630&fit=crop' // Speedometer - Chris Liverani
  },
  '/error-handling': {
    title: 'Error Handling - Pulse Framework',
    description: 'Handle errors gracefully: effect error boundaries, async error handling, form validation errors, and structured error classes.',
    keywords: 'error handling, boundaries, validation, async errors, recovery',
    image: 'https://images.unsplash.com/photo-1525785967371-87ba44b3e6cf?w=1200&h=630&fit=crop' // Warning sign - Markus Spiske
  },
  '/mobile': {
    title: 'Mobile Development - Pulse Framework',
    description: 'Build native iOS and Android apps with Pulse. WebView integration, native storage, device APIs, and platform-specific features.',
    keywords: 'mobile, iOS, Android, native, WebView, hybrid apps',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=630&fit=crop' // Mobile apps - Rami Al-zayat
  },
  '/examples': {
    title: 'Examples - Pulse Framework',
    description: 'Real-world Pulse examples: todo app, chat application, e-commerce, and more. Learn by exploring complete implementations.',
    keywords: 'examples, todo, chat, e-commerce, sample apps, demos',
    image: 'https://images.unsplash.com/photo-1522542550221-31fd8575f3a2?w=1200&h=630&fit=crop' // Code examples - Pankaj Patel
  },
  '/playground': {
    title: 'Playground - Pulse Framework',
    description: 'Interactive Pulse playground. Write and run Pulse code directly in your browser. Experiment with reactive patterns.',
    keywords: 'playground, sandbox, interactive, live coding, experiment',
    image: 'https://images.unsplash.com/photo-1605379399642-870262d3d051?w=1200&h=630&fit=crop' // Colorful code - Fotis Fotopoulos
  },
  '/benchmarks': {
    title: 'Benchmarks - Pulse Framework',
    description: 'Performance benchmarks comparing Pulse to React, Vue, Angular, and Svelte. Interactive tests you can run yourself.',
    keywords: 'benchmarks, performance, comparison, React, Vue, Angular, speed',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop' // Analytics dashboard - Luke Chesser
  },
  '/migration-react': {
    title: 'Migrate from React - Pulse Framework',
    description: 'Migration guide for React developers. Learn how React concepts map to Pulse: hooks to signals, JSX to el(), and more.',
    keywords: 'React migration, useState, useEffect, hooks, JSX, conversion',
    image: 'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=1200&h=630&fit=crop' // React logo code - Lautaro Andreani
  },
  '/migration-angular': {
    title: 'Migrate from Angular - Pulse Framework',
    description: 'Migration guide for Angular developers. Learn how Angular concepts map to Pulse: services, pipes, directives, and more.',
    keywords: 'Angular migration, services, pipes, directives, RxJS, conversion',
    image: 'https://images.unsplash.com/photo-1618477247222-acbdb0e159b3?w=1200&h=630&fit=crop' // Angular code - Mohammad Rahmani
  },
  '/migration-vue': {
    title: 'Migrate from Vue - Pulse Framework',
    description: 'Migration guide for Vue developers. Learn how Vue concepts map to Pulse: ref/reactive, computed, watch, and templates.',
    keywords: 'Vue migration, ref, reactive, computed, watch, conversion',
    image: 'https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?w=1200&h=630&fit=crop' // Vue.js green code - Mohammad Rahmani
  },
  '/changelog': {
    title: 'Changelog - Pulse Framework',
    description: 'Pulse Framework release history. See all version updates, new features, bug fixes, and breaking changes.',
    keywords: 'changelog, releases, versions, updates, history',
    image: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=1200&h=630&fit=crop' // Notes/updates - Kelly Sikkema
  },
  '/ssr': {
    title: 'Server-Side Rendering (SSR) - Pulse Framework',
    description: 'Server-side rendering and hydration for Pulse applications. Render to string, hydrate on client, and serialize state for SEO and performance.',
    keywords: 'SSR, server-side rendering, hydration, SEO, renderToString, isomorphic, universal',
    image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&h=630&fit=crop' // Server room - Taylor Vick
  }
};

// Supported locales
const locales = ['en', 'fr', 'es', 'de', 'ja', 'pt', 'is', 'eo'];
const defaultLocale = 'en';

/**
 * Extract path without locale prefix
 */
function extractPath(fullPath) {
  const parts = fullPath.split('/').filter(Boolean);
  if (parts.length === 0) return '/';
  if (locales.includes(parts[0])) {
    return parts.length === 1 ? '/' : `/${parts.slice(1).join('/')}`;
  }
  return fullPath === '' ? '/' : fullPath;
}

/**
 * Extract locale from path
 */
function extractLocale(fullPath) {
  const parts = fullPath.split('/').filter(Boolean);
  if (parts.length > 0 && locales.includes(parts[0])) {
    return parts[0];
  }
  return defaultLocale;
}

/**
 * Get SEO metadata for a given path
 */
function getPageSEO(path) {
  const normalizedPath = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
  return pageSEO[normalizedPath] || pageSEO['/'];
}

/**
 * Escape HTML entities
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Edge function handler
 */
export default async function handler(request, context) {
  // Get the response from the origin
  const response = await context.next();

  // Only process HTML responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('text/html')) {
    return response;
  }

  // Get the path and locale
  const url = new URL(request.url);
  const path = extractPath(url.pathname);
  const locale = extractLocale(url.pathname);
  const seo = getPageSEO(path);

  // Build the full URL for this page
  const fullUrl = locale === defaultLocale
    ? `${BASE_URL}${path === '/' ? '' : path}`
    : `${BASE_URL}/${locale}${path === '/' ? '' : path}`;

  // Get the image URL (page-specific or default)
  const imageUrl = seo.image || DEFAULT_IMAGE;

  // Get the HTML content
  let html = await response.text();

  // Replace meta tags
  const replacements = [
    // Title
    [/<title>[^<]*<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`],
    // Meta title
    [/<meta\s+name="title"\s+content="[^"]*"/i, `<meta name="title" content="${escapeHtml(seo.title)}"`],
    // Meta description
    [/<meta\s+name="description"\s+content="[^"]*"/i, `<meta name="description" content="${escapeHtml(seo.description)}"`],
    // Meta keywords
    [/<meta\s+name="keywords"\s+content="[^"]*"/i, `<meta name="keywords" content="${escapeHtml(seo.keywords)}"`],
    // Canonical URL
    [/<link\s+rel="canonical"\s+href="[^"]*"/i, `<link rel="canonical" href="${escapeHtml(fullUrl)}"`],
    // Open Graph
    [/<meta\s+property="og:title"\s+content="[^"]*"/i, `<meta property="og:title" content="${escapeHtml(seo.title)}"`],
    [/<meta\s+property="og:description"\s+content="[^"]*"/i, `<meta property="og:description" content="${escapeHtml(seo.description)}"`],
    [/<meta\s+property="og:url"\s+content="[^"]*"/i, `<meta property="og:url" content="${escapeHtml(fullUrl)}"`],
    [/<meta\s+property="og:image"\s+content="[^"]*"/i, `<meta property="og:image" content="${escapeHtml(imageUrl)}"`],
    // Twitter
    [/<meta\s+name="twitter:title"\s+content="[^"]*"/i, `<meta name="twitter:title" content="${escapeHtml(seo.title)}"`],
    [/<meta\s+name="twitter:description"\s+content="[^"]*"/i, `<meta name="twitter:description" content="${escapeHtml(seo.description)}"`],
    [/<meta\s+name="twitter:url"\s+content="[^"]*"/i, `<meta name="twitter:url" content="${escapeHtml(fullUrl)}"`],
    [/<meta\s+name="twitter:image"\s+content="[^"]*"/i, `<meta name="twitter:image" content="${escapeHtml(imageUrl)}"`],
    // HTML lang attribute
    [/<html\s+lang="[^"]*"/i, `<html lang="${locale}"`]
  ];

  for (const [pattern, replacement] of replacements) {
    html = html.replace(pattern, replacement);
  }

  // Return modified response
  return new Response(html, {
    status: response.status,
    headers: response.headers
  });
}
