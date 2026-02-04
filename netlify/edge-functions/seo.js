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
 */
const pageSEO = {
  '/': {
    title: 'Pulse Framework - Zero Dependency Reactive JavaScript Framework',
    description: 'A lightweight (~4kb core) declarative DOM framework with CSS selector-based structure, signal-based reactivity, and zero dependencies. Build SPAs and mobile apps without a build step.',
    keywords: 'javascript framework, reactive, signals, zero dependencies, lightweight, SPA, mobile apps'
  },
  '/getting-started': {
    title: 'Getting Started - Pulse Framework',
    description: 'Learn how to install and set up Pulse Framework. Create your first reactive application in minutes with our step-by-step guide.',
    keywords: 'pulse tutorial, getting started, installation, setup, quick start'
  },
  '/core-concepts': {
    title: 'Core Concepts - Pulse Framework',
    description: 'Understand Pulse Framework core concepts: reactivity with signals, declarative DOM creation, routing, and state management.',
    keywords: 'reactivity, signals, effects, computed, DOM, pulse concepts'
  },
  '/api-reference': {
    title: 'API Reference - Pulse Framework',
    description: 'Complete API documentation for Pulse Framework. Reference for pulse(), effect(), computed(), el(), router, store, and all modules.',
    keywords: 'API, reference, documentation, pulse, effect, computed, el, router, store'
  },
  '/http': {
    title: 'HTTP Client - Pulse Framework',
    description: 'Zero-dependency HTTP client with interceptors, retries, timeout handling, and reactive integration. Built-in support for REST APIs.',
    keywords: 'HTTP, fetch, REST API, interceptors, async, useHttp'
  },
  '/websocket': {
    title: 'WebSocket Client - Pulse Framework',
    description: 'Real-time WebSocket client with auto-reconnect, heartbeat, message queuing, and reactive state. Build live features easily.',
    keywords: 'WebSocket, real-time, auto-reconnect, heartbeat, live updates'
  },
  '/graphql': {
    title: 'GraphQL Client - Pulse Framework',
    description: 'GraphQL client with queries, mutations, subscriptions, caching, and optimistic updates. Full support for modern GraphQL APIs.',
    keywords: 'GraphQL, queries, mutations, subscriptions, cache, Apollo alternative'
  },
  '/context': {
    title: 'Context API - Pulse Framework',
    description: 'Dependency injection and prop drilling prevention with Context API. Share state across components without explicit passing.',
    keywords: 'context, dependency injection, providers, useContext, shared state'
  },
  '/devtools': {
    title: 'DevTools - Pulse Framework',
    description: 'Debugging and profiling tools: time-travel debugging, dependency graphs, performance profiling, and accessibility auditing.',
    keywords: 'devtools, debugging, profiling, time-travel, dependency graph'
  },
  '/accessibility': {
    title: 'Accessibility Guide - Pulse Framework',
    description: 'Built-in accessibility features: auto-ARIA attributes, focus management, screen reader announcements, and WCAG compliance tools.',
    keywords: 'accessibility, a11y, ARIA, WCAG, screen reader, focus management'
  },
  '/debugging': {
    title: 'Debugging Guide - Pulse Framework',
    description: 'Debug Pulse applications effectively. Learn about trackedPulse, effect debugging, common issues, and troubleshooting techniques.',
    keywords: 'debugging, troubleshooting, trackedPulse, effects, errors'
  },
  '/security': {
    title: 'Security Guide - Pulse Framework',
    description: 'Security best practices: XSS prevention, URL sanitization, safe attribute handling, and CSS injection protection.',
    keywords: 'security, XSS, sanitization, escapeHtml, safe patterns'
  },
  '/performance': {
    title: 'Performance Guide - Pulse Framework',
    description: 'Optimize Pulse applications: batch updates, lazy computed, efficient list rendering, and bundle size optimization.',
    keywords: 'performance, optimization, batch, lazy, bundle size, speed'
  },
  '/error-handling': {
    title: 'Error Handling - Pulse Framework',
    description: 'Handle errors gracefully: effect error boundaries, async error handling, form validation errors, and structured error classes.',
    keywords: 'error handling, boundaries, validation, async errors, recovery'
  },
  '/mobile': {
    title: 'Mobile Development - Pulse Framework',
    description: 'Build native iOS and Android apps with Pulse. WebView integration, native storage, device APIs, and platform-specific features.',
    keywords: 'mobile, iOS, Android, native, WebView, hybrid apps'
  },
  '/examples': {
    title: 'Examples - Pulse Framework',
    description: 'Real-world Pulse examples: todo app, chat application, e-commerce, and more. Learn by exploring complete implementations.',
    keywords: 'examples, todo, chat, e-commerce, sample apps, demos'
  },
  '/playground': {
    title: 'Playground - Pulse Framework',
    description: 'Interactive Pulse playground. Write and run Pulse code directly in your browser. Experiment with reactive patterns.',
    keywords: 'playground, sandbox, interactive, live coding, experiment'
  },
  '/benchmarks': {
    title: 'Benchmarks - Pulse Framework',
    description: 'Performance benchmarks comparing Pulse to React, Vue, Angular, and Svelte. Interactive tests you can run yourself.',
    keywords: 'benchmarks, performance, comparison, React, Vue, Angular, speed'
  },
  '/migration-react': {
    title: 'Migrate from React - Pulse Framework',
    description: 'Migration guide for React developers. Learn how React concepts map to Pulse: hooks to signals, JSX to el(), and more.',
    keywords: 'React migration, useState, useEffect, hooks, JSX, conversion'
  },
  '/migration-angular': {
    title: 'Migrate from Angular - Pulse Framework',
    description: 'Migration guide for Angular developers. Learn how Angular concepts map to Pulse: services, pipes, directives, and more.',
    keywords: 'Angular migration, services, pipes, directives, RxJS, conversion'
  },
  '/migration-vue': {
    title: 'Migrate from Vue - Pulse Framework',
    description: 'Migration guide for Vue developers. Learn how Vue concepts map to Pulse: ref/reactive, computed, watch, and templates.',
    keywords: 'Vue migration, ref, reactive, computed, watch, conversion'
  },
  '/changelog': {
    title: 'Changelog - Pulse Framework',
    description: 'Pulse Framework release history. See all version updates, new features, bug fixes, and breaking changes.',
    keywords: 'changelog, releases, versions, updates, history'
  },
  '/ssr': {
    title: 'Server-Side Rendering (SSR) - Pulse Framework',
    description: 'Server-side rendering and hydration for Pulse applications. Render to string, hydrate on client, and serialize state for SEO and performance.',
    keywords: 'SSR, server-side rendering, hydration, SEO, renderToString, isomorphic, universal'
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
    // Twitter
    [/<meta\s+name="twitter:title"\s+content="[^"]*"/i, `<meta name="twitter:title" content="${escapeHtml(seo.title)}"`],
    [/<meta\s+name="twitter:description"\s+content="[^"]*"/i, `<meta name="twitter:description" content="${escapeHtml(seo.description)}"`],
    [/<meta\s+name="twitter:url"\s+content="[^"]*"/i, `<meta name="twitter:url" content="${escapeHtml(fullUrl)}"`],
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

/**
 * Edge function config
 */
export const config = {
  path: "/*",
  excludedPath: ["/assets/*", "/runtime/*", "/examples/*", "/*.js", "/*.css", "/*.png", "/*.svg", "/*.ico", "/*.json", "/*.xml"]
};
