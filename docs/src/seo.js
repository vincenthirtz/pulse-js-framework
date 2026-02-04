/**
 * Pulse Documentation - SEO Metadata Configuration
 * Page-specific titles, descriptions, and Open Graph data
 */

const BASE_URL = 'https://pulse-js.fr';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.png`;
const SITE_NAME = 'Pulse Framework';

/**
 * SEO metadata for each page
 * Keys correspond to route paths (without locale prefix)
 */
export const pageSEO = {
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
  }
};

/**
 * Get SEO metadata for a given path
 * @param {string} path - Route path (without locale prefix)
 * @returns {object} SEO metadata
 */
export function getPageSEO(path) {
  // Normalize path
  const normalizedPath = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
  return pageSEO[normalizedPath] || pageSEO['/'];
}

/**
 * Update document head with SEO metadata
 * @param {string} path - Current route path
 * @param {string} locale - Current locale
 */
export function updateSEO(path, locale = 'en') {
  const seo = getPageSEO(path);
  const fullUrl = locale === 'en'
    ? `${BASE_URL}${path === '/' ? '' : path}`
    : `${BASE_URL}/${locale}${path === '/' ? '' : path}`;

  // Update title
  document.title = seo.title;

  // Helper to update or create meta tag
  const setMeta = (selector, content) => {
    let meta = document.querySelector(selector);
    if (meta) {
      meta.setAttribute('content', content);
    }
  };

  // Update meta tags
  setMeta('meta[name="title"]', seo.title);
  setMeta('meta[name="description"]', seo.description);
  setMeta('meta[name="keywords"]', seo.keywords);

  // Update Open Graph
  setMeta('meta[property="og:title"]', seo.title);
  setMeta('meta[property="og:description"]', seo.description);
  setMeta('meta[property="og:url"]', fullUrl);

  // Update Twitter
  setMeta('meta[name="twitter:title"]', seo.title);
  setMeta('meta[name="twitter:description"]', seo.description);
  setMeta('meta[name="twitter:url"]', fullUrl);

  // Update canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', fullUrl);
  }

  // Update html lang attribute
  document.documentElement.setAttribute('lang', locale);
}

/**
 * Extract path without locale prefix
 * @param {string} fullPath - Full URL path
 * @param {string[]} locales - List of valid locale codes
 * @returns {string} Path without locale prefix
 */
export function extractPathForSEO(fullPath, locales = ['en', 'fr', 'es', 'de', 'ja', 'pt', 'is', 'eo']) {
  const parts = fullPath.split('/').filter(Boolean);

  if (parts.length === 0) return '/';

  // Check if first part is a locale
  if (locales.includes(parts[0])) {
    return parts.length === 1 ? '/' : `/${parts.slice(1).join('/')}`;
  }

  return fullPath;
}
