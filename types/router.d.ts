/**
 * Pulse Framework - Router Type Definitions
 * @module pulse-js-framework/runtime/router
 */

import { Pulse } from './pulse';

/** Route parameters object */
export type RouteParams = Record<string, string>;

/** Query parameters object */
export type QueryParams = Record<string, string | string[]>;

/** Route meta information */
export type RouteMeta = Record<string, unknown>;

/** Navigation target (to/from) */
export interface NavigationTarget {
  path: string;
  params: RouteParams;
  query: QueryParams;
  meta: RouteMeta;
  matched?: RouteDefinition[];
}

/** Navigation guard return type */
export type NavigationGuardReturn = boolean | string | void | Promise<boolean | string | void>;

/** Navigation guard function */
export type NavigationGuard = (
  to: NavigationTarget,
  from: NavigationTarget
) => NavigationGuardReturn;

/** After navigation hook */
export type AfterNavigationHook = (to: NavigationTarget) => void | Promise<void>;

/** Scroll position */
export interface ScrollPosition {
  x?: number;
  y?: number;
  selector?: string;
  behavior?: ScrollBehavior;
}

/** Scroll behavior function */
export type ScrollBehaviorFn = (
  to: NavigationTarget,
  from: NavigationTarget,
  savedPosition: ScrollPosition | null
) => ScrollPosition | null | void;

/** Route handler (component) */
export type RouteHandler =
  | (() => Node)
  | (() => Promise<{ default: () => Node }>)
  | { render: () => Node };

/** Route definition */
export interface RouteDefinition {
  handler?: RouteHandler;
  meta?: RouteMeta;
  beforeEnter?: NavigationGuard;
  children?: Routes;
}

/** Routes configuration object */
export interface Routes {
  [path: string]: RouteHandler | RouteDefinition;
}

// =============================================================================
// Middleware Types
// =============================================================================

/** Middleware context passed to each middleware function */
export interface MiddlewareContext {
  /** Target route */
  to: NavigationTarget;
  /** Source route */
  from: NavigationTarget;
  /** Shared metadata between middlewares */
  meta: Record<string, unknown>;
  /** Redirect to another path */
  redirect(path: string): void;
  /** Abort navigation */
  abort(): void;
}

/** Middleware function */
export type MiddlewareFn = (
  ctx: MiddlewareContext,
  next: () => Promise<void>
) => void | Promise<void>;

// =============================================================================
// Lazy Loading Types
// =============================================================================

/** Lazy loading options */
export interface LazyOptions {
  /** Loading component shown while loading */
  loading?: () => Node;
  /** Error component shown on failure */
  error?: (err: Error) => Node;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Delay before showing loading component (default: 200) */
  delay?: number;
}

/** Lazy route handler */
export type LazyRouteHandler = (ctx: RouteContext) => Node;

/** Router options */
export interface RouterOptions {
  routes?: Routes;
  mode?: 'history' | 'hash';
  base?: string;
  scrollBehavior?: ScrollBehaviorFn;
  /** Middleware functions */
  middleware?: MiddlewareFn[];
}

/** Navigation options */
export interface NavigateOptions {
  replace?: boolean;
  query?: Record<string, string | number>;
  state?: unknown;
}

/** Route context passed to route handlers */
export interface RouteContext {
  params: RouteParams;
  query: QueryParams;
  path: string;
  navigate: Router['navigate'];
  router: Router;
}

/** Link options */
export interface LinkOptions {
  exact?: boolean;
  activeClass?: string;
}

/** Matched route */
export interface MatchedRoute {
  route: RouteDefinition;
  params: RouteParams;
}

/** Router instance */
export interface Router {
  /** Current path (reactive) */
  path: Pulse<string>;

  /** Current route object (reactive) */
  route: Pulse<NavigationTarget | null>;

  /** Current route parameters (reactive) */
  params: Pulse<RouteParams>;

  /** Current query parameters (reactive) */
  query: Pulse<QueryParams>;

  /** Current route meta (reactive) */
  meta: Pulse<RouteMeta>;

  /** Loading state for async components (reactive) */
  loading: Pulse<boolean>;

  /**
   * Navigate to path
   * @returns Promise resolving to navigation success
   */
  navigate(path: string, options?: NavigateOptions): Promise<boolean>;

  /**
   * Create router link element
   */
  link(path: string, content: Node | string, options?: LinkOptions): HTMLAnchorElement;

  /**
   * Render current route component
   */
  outlet(container: string | HTMLElement): HTMLElement;

  /** Navigate back in history */
  back(): void;

  /** Navigate forward in history */
  forward(): void;

  /** Go to specific history entry */
  go(delta: number): void;

  /**
   * Add middleware dynamically
   * @returns Unregister function
   */
  use(middleware: MiddlewareFn): () => void;

  /**
   * Add global before-navigation guard
   * @returns Unregister function
   */
  beforeEach(hook: NavigationGuard): () => void;

  /**
   * Add before-resolve hook (after per-route guards)
   * @returns Unregister function
   */
  beforeResolve(hook: NavigationGuard): () => void;

  /**
   * Add after-navigation hook
   * @returns Unregister function
   */
  afterEach(hook: AfterNavigationHook): () => void;

  /**
   * Check if route matches
   */
  isActive(path: string, exact?: boolean): boolean;

  /**
   * Get all matched routes (for nested routes)
   */
  getMatchedRoutes(path: string): MatchedRoute[];

  /**
   * Start listening to navigation events
   * @returns Stop function
   */
  start(): () => void;

  /**
   * Match path against pattern
   */
  matchRoute(pattern: string, path: string): RouteParams | null;

  /**
   * Parse query string to object
   */
  parseQuery(search: string): QueryParams;
}

/**
 * Create router instance
 */
export declare function createRouter(options?: RouterOptions): Router;

/**
 * Quick router setup (creates, starts, and mounts)
 */
export declare function simpleRouter(routes: Routes, target?: string): Router;

/**
 * Create a lazy-loaded route handler
 * Wraps a dynamic import with loading states and error handling
 *
 * @example
 * const routes = {
 *   '/dashboard': lazy(() => import('./Dashboard.js')),
 *   '/settings': lazy(() => import('./Settings.js'), {
 *     loading: () => el('div.spinner', 'Loading...'),
 *     error: (err) => el('div.error', `Failed: ${err.message}`),
 *     timeout: 5000
 *   })
 * };
 */
export declare function lazy(
  importFn: () => Promise<{ default: RouteHandler | (() => Node) }>,
  options?: LazyOptions
): LazyRouteHandler;

/**
 * Preload a lazy component without rendering
 * Useful for prefetching on hover or when likely to navigate
 *
 * @example
 * const DashboardLazy = lazy(() => import('./Dashboard.js'));
 * link.addEventListener('mouseenter', () => preload(DashboardLazy));
 */
export declare function preload(lazyHandler: LazyRouteHandler): Promise<void>;
