/**
 * Pulse Framework - Type Definitions
 * @module pulse-js-framework
 */

// Core Reactivity
export {
  Pulse,
  PulseOptions,
  ComputedOptions,
  MemoOptions,
  MemoComputedOptions,
  EqualsFn,
  ReactiveState,
  PromiseState,
  EffectFn,
  ReactiveContext,
  pulse,
  computed,
  effect,
  batch,
  watch,
  createState,
  memo,
  memoComputed,
  fromPromise,
  untrack,
  onCleanup,
  context,
  resetContext
} from './pulse';

// DOM Helpers
export {
  MaybeGetter,
  Reactive,
  Child,
  ParsedSelector,
  EventOptions,
  KeyFn,
  ListTemplate,
  ConditionTemplate,
  MatchCases,
  ComponentContext,
  ComponentSetup,
  ComponentFactory,
  ErrorFallback,
  TransitionOptions,
  TransitionElement,
  WhenTransitionOptions,
  parseSelector,
  el,
  text,
  bind,
  prop,
  cls,
  style,
  on,
  list,
  when,
  match,
  model,
  mount,
  component,
  onMount,
  onUnmount,
  show,
  portal,
  errorBoundary,
  transition,
  whenTransition,
  delegate,
  DelegatedListHandlers,
  DelegatedListOptions,
  delegatedList,
  VirtualListOptions,
  ScrollToIndexOptions,
  VirtualListElement,
  virtualList,
  ElementPoolOptions,
  PoolStats,
  ElementPool,
  createElementPool,
  getPool,
  resetPool
} from './dom';

// Router
export {
  RouteParams,
  QueryParams,
  RouteMeta,
  NavigationTarget,
  NavigationGuardReturn,
  NavigationGuard,
  AfterNavigationHook,
  ScrollPosition,
  ScrollBehaviorFn,
  RouteHandler,
  RouteDefinition,
  Routes,
  RouterOptions,
  NavigateOptions,
  LinkOptions,
  MatchedRoute,
  Router,
  MiddlewareContext,
  MiddlewareFn,
  LazyOptions,
  LazyRouteHandler,
  RouteContext,
  createRouter,
  simpleRouter,
  lazy,
  preload
} from './router';

// Store
export {
  StoreOptions,
  StoreState,
  StoreMethods,
  Store,
  ActionFn,
  ActionsDef,
  BoundActions,
  GetterFn,
  GettersDef,
  ComputedGetters,
  CombinedStores,
  ModuleDef,
  ModulesDef,
  ModuleStore,
  RootModuleStore,
  StorePlugin,
  HistoryStore,
  createStore,
  createActions,
  createGetters,
  combineStores,
  createModuleStore,
  usePlugin,
  loggerPlugin,
  historyPlugin
} from './store';

// Logger
export {
  LogLevel,
  LogLevelValue,
  LogFormatter,
  LoggerOptions,
  Logger,
  setLogLevel,
  getLogLevel,
  setFormatter,
  createLogger,
  logger,
  loggers
} from './logger';

// HMR (Hot Module Replacement)
export {
  HMRContext,
  createHMRContext
} from './hmr';

// Source Maps (Compiler)
export {
  Position,
  Mapping,
  SourceMapV3,
  OriginalPosition,
  SourceMapGenerator,
  SourceMapConsumer,
  encodeVLQ
} from './sourcemap';

// LRU Cache
export { LRUCache } from './lru-cache';

// Utilities (XSS Prevention, etc.)
export {
  escapeHtml,
  unescapeHtml,
  dangerouslySetInnerHTML,
  createSafeTextNode,
  escapeAttribute,
  safeSetAttribute,
  SanitizeUrlOptions,
  sanitizeUrl,
  deepClone,
  CancellableFunction,
  debounce,
  throttle
} from './utils';

// Async Primitives
export {
  VersionedContext,
  VersionedAsyncController,
  VersionedAsyncOptions,
  AsyncStatus,
  UseAsyncOptions,
  UseAsyncReturn,
  ResourceOptions,
  UseResourceReturn,
  PollingOptions,
  UsePollingReturn,
  ResourceCacheStats,
  createVersionedAsync,
  useAsync,
  useResource,
  usePolling,
  clearResourceCache,
  getResourceCacheStats
} from './async';

// Form Management
export {
  ValidationResult,
  AsyncValidationResult,
  ValidationRule,
  AsyncValidationRule,
  AnyValidationRule,
  AsyncValidatorOptions,
  Validators,
  validators,
  Field,
  ValidationSchema,
  FormOptions,
  FormFields,
  FormErrors,
  UseFormReturn,
  UseFieldOptions,
  UseFieldArrayReturn,
  useForm,
  useField,
  useFieldArray
} from './form';

// Context API
export {
  Context,
  ContextOptions,
  createContext,
  useContext,
  Provider,
  Consumer,
  isContext,
  getContextDepth,
  disposeContext,
  useContextSelector,
  provideMany
} from './context';
