/**
 * English translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'A declarative DOM framework with CSS selector-based structure',
    features: {
      zeroDeps: '0️⃣ Zero Dependencies',
      uniqueSyntax: '🎯 Unique Syntax',
      reactive: '⚡ Reactive',
      smallBundle: '📦 ~4kb core',
      noBuild: '🔧 No Build Required',
      mobile: '📱 Mobile Apps'
    },
    getStarted: 'Get Started →',
    viewExamples: 'View Examples',
    whatMakesUnique: 'What Makes Pulse Unique?',
    quickExample: 'Quick Example',
    pulseSyntax: '.pulse syntax',
    jsEquivalent: 'JavaScript equivalent',
    // Stats section
    stats: {
      gzipped: 'Gzipped',
      dependencies: 'Dependencies',
      buildTime: 'Build Time',
      a11yBuiltIn: 'A11y Built-in'
    },
    // Quick Start section
    quickStart: {
      title: 'Quick Start',
      desc: 'Get up and running in seconds with a single command.',
      terminal: 'Terminal',
      copy: 'Copy',
      copied: 'Copied!',
      createProject: 'Create a new project',
      navigate: 'Navigate to it',
      startDev: 'Start development server'
    },
    // Why Pulse section
    whyPulse: {
      title: 'Why Choose Pulse?',
      performance: {
        title: 'Performance',
        desc: 'Fine-grained reactivity with minimal overhead. No virtual DOM diffing needed.'
      },
      simplicity: {
        title: 'Simplicity',
        desc: 'Intuitive CSS selector syntax. Write less code, achieve more.'
      },
      accessibility: {
        title: 'Accessibility',
        desc: 'Built-in a11y helpers, auto-ARIA attributes, and audit tools.'
      },
      mobile: {
        title: 'Mobile Ready',
        desc: 'Native mobile bridge included. Build iOS and Android apps directly.'
      },
      noBuild: {
        title: 'No Build Required',
        desc: 'Works directly in the browser. Optional build step for optimization.'
      },
      security: {
        title: 'Security First',
        desc: 'XSS protection, URL sanitization, and prototype pollution prevention built-in.'
      }
    },
    comparison: {
      feature: 'Feature',
      uiStructure: 'UI Structure',
      cssSelectors: 'CSS Selectors',
      reactivity: 'Reactivity',
      pulses: 'Pulses',
      buildStep: 'Build Step',
      bundleSize: 'Bundle Size',
      dependencies: 'Dependencies',
      buildSpeed: 'Build Speed',
      learningCurve: 'Learning Curve',
      fileExtension: 'File Extension',
      mobileApps: 'Mobile Apps',
      typescript: 'TypeScript',
      required: 'Required',
      optional: 'Optional',
      many: 'Many',
      some: 'Some',
      few: 'Few',
      zero: 'Zero',
      slow: 'Slow',
      medium: 'Medium',
      fast: 'Fast',
      instant: 'Instant',
      steep: 'Steep',
      moderate: 'Moderate',
      easy: 'Easy',
      minimal: 'Minimal',
      builtIn: 'Built-in',
      accessibility: 'Accessibility',
      thirdParty: '3rd Party'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Getting Started',
    installation: 'Installation',
    installationDesc: 'Create a new Pulse project with a single command:',
    manualSetup: 'Manual Setup',
    manualSetupDesc: 'Or set up manually in any project:',
    thenImport: 'Then import in your JavaScript:',
    firstComponent: 'Your First Component',
    firstComponentDesc: 'Create a simple reactive counter:',
    usingPulseFiles: 'Using .pulse Files',
    usingPulseFilesDesc: 'For a cleaner syntax, use <code>.pulse</code> files with the Vite plugin:',
    projectStructure: 'Project Structure',
    cliCommands: 'CLI Commands',
    cliCommandsDesc: 'Pulse provides a complete CLI for development workflow:',
    development: 'Development',
    codeQuality: 'Code Quality',
    lintChecks: '<strong>Lint checks:</strong> undefined references, unused imports/state, naming conventions, empty blocks, import order.',
    formatRules: '<strong>Format rules:</strong> 2-space indent, sorted imports, consistent braces, proper spacing.',
    analyzeOutput: '<strong>Analyze output:</strong> file count, component complexity, import graph, dead code detection.',
    faq: 'FAQ',
    faqBuildStep: {
      q: 'Do I need a build step?',
      a: 'No! Pulse works directly in the browser. However, for <code>.pulse</code> files and production optimization, we recommend using Vite with the Pulse plugin.'
    },
    faqComparison: {
      q: 'How does Pulse compare to React/Vue?',
      a: 'Pulse is much lighter (~4kb core, ~12kb full vs 35-45kb) and uses pulses (reactive primitives) instead of virtual DOM. It has zero dependencies and an optional build step. The CSS selector syntax is unique to Pulse.'
    },
    faqTypeScript: {
      q: 'Can I use TypeScript?',
      a: 'Yes! Pulse includes full TypeScript definitions. Just import types from <code>pulse-js-framework/runtime</code> and your IDE will provide autocomplete.'
    },
    faqForms: {
      q: 'How do I handle forms?',
      a: 'Use the <code>model()</code> helper for two-way binding:'
    },
    faqExisting: {
      q: 'Can I use Pulse with existing projects?',
      a: 'Yes! Pulse can be mounted to any DOM element. Use <code>mount(\'#my-widget\', MyComponent())</code> to embed Pulse components anywhere.'
    },
    faqFetch: {
      q: 'How do I fetch data?',
      a: 'Use standard <code>fetch()</code> with effects:'
    },
    faqSSR: {
      q: 'Does Pulse support SSR?',
      a: 'Yes! Since v1.7.0, Pulse supports Server-Side Rendering with <code>renderToString()</code> and <code>hydrate()</code>. See the <a href="/ssr">SSR Guide</a> for details.'
    },
    faqDebug: {
      q: 'How do I debug my app?',
      a: 'Pulse v1.4.9+ supports source maps for <code>.pulse</code> files. Use the Logger API for structured output. See the Debugging Guide for more.'
    },
    faqMobile: {
      q: 'Can I build mobile apps?',
      a: 'Yes! Use <code>pulse mobile init</code> to set up Android/iOS projects. Pulse includes native APIs for storage, device info, and more. See the Mobile Guide.'
    },
    faqHelp: {
      q: 'Where can I get help?',
      a: 'Open an issue on GitHub or check the Examples for reference implementations.'
    },
    nextCoreConcepts: 'Next: Core Concepts →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Core Concepts',
    pulses: 'Pulses (Reactive State)',
    pulsesDesc: 'A pulse is a reactive container that notifies subscribers when its value changes.',
    effects: 'Effects',
    effectsDesc: 'Effects automatically run when their dependencies change.',
    cssSelectorSyntax: 'CSS Selector Syntax',
    cssSelectorSyntaxDesc: 'Create DOM elements using familiar CSS selector syntax.',
    pulseFileSyntax: '.pulse File Syntax',
    pulseFileSyntaxDesc: 'The .pulse DSL offers a clean, declarative way to write components.',
    blocks: 'Blocks',
    imports: 'Imports',
    directives: 'Directives',
    slots: 'Slots (Content Projection)',
    slotsDesc: 'Use slots to compose components with dynamic content.',
    cssScoping: 'CSS Scoping',
    cssScopingDesc: 'Styles in .pulse files are automatically scoped to the component.',
    advancedRouting: 'Advanced Routing',
    advancedRoutingDesc: 'The Pulse router supports lazy loading, middleware, and code splitting.',
    lazyLoading: 'Lazy Loading',
    lazyLoadingDesc: 'Load route components on demand to reduce initial bundle size.',
    middleware: 'Middleware',
    middlewareDesc: 'Koa-style middleware for flexible navigation control.',
    nextApiReference: 'Next: API Reference →'
  },

  // API Reference page
  apiReference: {
    title: '📖 API Reference',
    searchPlaceholder: 'Search API...',
    filter: 'Filter:',
    typescriptSupport: 'TypeScript Support',
    typescriptSupportDesc: 'Pulse includes full TypeScript definitions for IDE autocomplete.',
    reactivity: 'Reactivity',
    reactivityDesc: 'Signal-based reactivity system.',
    domSection: 'DOM',
    domSectionDesc: 'Helpers for creating and manipulating DOM.',
    routerSection: 'Router',
    routerSectionDesc: 'SPA router with nested routes and guards.',
    storeSection: 'Store',
    storeSectionDesc: 'Global state management.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Hot Module Replacement.',
    resultsFound: 'result(s) found',
    noResults: 'No results found',
    nextMobile: 'Next: Mobile Apps →',
    categories: {
      all: 'All',
      types: 'Types',
      reactivity: 'Reactivity',
      dom: 'DOM',
      router: 'Router',
      store: 'Store',
      hmr: 'HMR'
    }
  },

  // Examples page
  examples: {
    title: '✨ Examples',
    intro: 'Explore these sample applications to see Pulse in action.',
    viewDemo: 'View Demo',
    viewSource: 'View Source',
    hmrDemo: {
      title: 'HMR Demo',
      desc: 'Hot Module Replacement with state preservation.',
      features: [
        'Edit code without refresh',
        'State preserved across changes',
        'Instant visual feedback',
        'CSS hot reload',
        'Error recovery'
      ]
    },
    blog: {
      title: 'Blog',
      desc: 'Full-featured blog with posts and categories.',
      features: [
        'CRUD operations',
        'Category filtering',
        'Search functionality',
        'Markdown support',
        'Responsive design'
      ]
    },
    todoApp: {
      title: 'Todo App',
      desc: 'Classic todo list with local storage persistence.',
      features: [
        'Add/edit/delete tasks',
        'Filter by status',
        'Local storage sync',
        'Drag and drop',
        'Keyboard shortcuts'
      ]
    },
    weatherApp: {
      title: 'Weather App',
      desc: 'Weather dashboard with API integration.',
      features: [
        'Current weather',
        'Multi-day forecast',
        'Location search',
        'Temperature units',
        'Weather icons'
      ]
    },
    ecommerce: {
      title: 'E-Commerce',
      desc: 'Product catalog with cart and checkout.',
      features: [
        'Product listing',
        'Shopping cart',
        'Checkout flow',
        'Order history',
        'Responsive design'
      ]
    },
    chatApp: {
      title: 'Chat App',
      desc: 'Real-time chat interface with message history.',
      features: [
        'Real-time messages',
        'User presence',
        'Message history',
        'Typing indicators',
        'Emoji support'
      ]
    },
    routerDemo: {
      title: 'Router Demo',
      desc: 'SPA routing with nested routes.',
      features: [
        'Hash and history modes',
        'Dynamic parameters',
        'Route guards',
        'Lazy loading',
        'Nested routes'
      ]
    },
    storeDemo: {
      title: 'Store Demo',
      desc: 'Global state management with persistence.',
      features: [
        'Centralized state',
        'Actions and getters',
        'Local storage sync',
        'Undo/redo',
        'DevTools support'
      ]
    },
    dashboard: {
      title: 'Dashboard',
      desc: 'Admin dashboard with charts and tables.',
      features: [
        'Data visualization',
        'Sortable tables',
        'Filters and search',
        'Responsive layout',
        'Dark mode'
      ]
    },
    sportsNews: {
      title: 'Sports News',
      desc: 'News app with HTTP client and reactive data fetching.',
      features: [
        'HTTP client integration',
        'Category filtering',
        'Search with debounce',
        'Favorites system',
        'Dark mode'
      ]
    },
    lessDemo: {
      title: 'LESS CSS Demo',
      desc: 'Demonstrates LESS preprocessor support with variables, mixins, guards, and color functions.',
      features: [
        'LESS variables and operations',
        'Parametric mixins with guards',
        'Color functions (lighten, darken)',
        'Nesting and parent selector',
        'Dynamic theme switching'
      ]
    },
    stylusDemo: {
      title: 'Stylus CSS Demo',
      desc: 'Showcases Stylus preprocessor with flexible syntax, mixins without braces, and minimal punctuation.',
      features: [
        'Variables without $ or @',
        'Flexible syntax (no braces needed)',
        'Mixins and nesting',
        'Mathematical operations',
        'Gradient and animations'
      ]
    },
    webpackDemo: {
      title: 'Webpack Integration',
      desc: 'Demonstrates Pulse Webpack loader with HMR, CSS extraction, and SASS preprocessing.',
      features: [
        'Webpack 5 loader integration',
        'Hot Module Replacement (HMR)',
        'CSS extraction with style-loader',
        'SASS preprocessing support',
        'Source maps for debugging'
      ]
    },
    rollupDemo: {
      title: 'Rollup Integration',
      desc: 'Shows Pulse Rollup plugin with tree-shaking, CSS extraction, and optimized builds.',
      features: [
        'Rollup 4+ plugin integration',
        'CSS extraction to separate file',
        'ES module tree-shaking',
        'SASS preprocessing support',
        'Watch mode for development'
      ]
    },
    esbuildDemo: {
      title: 'ESBuild Integration',
      desc: 'Shows Pulse ESBuild plugin with ultra-fast builds, CSS extraction, and watch mode.',
      features: [
        'ESBuild plugin integration',
        'Blazingly fast incremental builds',
        'CSS extraction to separate file',
        'SASS preprocessing support',
        'Built-in dev server'
      ]
    },
    parcelDemo: {
      title: 'Parcel Integration',
      desc: 'Demonstrates Pulse Parcel transformer with zero-config bundling, HMR, and CSS preprocessing.',
      features: [
        'Parcel transformer integration',
        'Zero-configuration bundling',
        'Hot Module Replacement (HMR)',
        'CSS extraction to Parcel pipeline',
        'SASS/LESS/Stylus support'
      ]
    },
    runLocally: 'Run Examples Locally',
    runLocallyDesc: 'Clone the repository and run any example with the dev server:',
    createYourOwn: 'Create Your Own',
    createYourOwnDesc: 'Start a new Pulse project with the CLI:',
    mobileExamples: 'Mobile Examples',
    mobileExamplesDesc: 'Examples demonstrating native mobile features:'
  },

  // Playground page
  playground: {
    title: '🎮 Playground',
    intro: 'Try Pulse in your browser. Edit the code and see the results instantly.',
    codeEditor: 'Code Editor',
    preview: 'Preview',
    run: 'Run',
    reset: 'Reset',
    share: 'Share',
    ready: 'Ready',
    running: 'Running...',
    success: 'Success',
    errorPrefix: 'Error:',
    templates: 'Templates',
    templateCounter: 'Counter',
    templateTodo: 'Todo List',
    templateTimer: 'Timer',
    templateForm: 'Form',
    templateCalculator: 'Calculator',
    templateTabs: 'Tabs',
    templateTheme: 'Theme Switcher',
    templateSearch: 'Search Filter',
    templateCart: 'Shopping Cart',
    templateAnimation: 'Animation'
  },

  // Debugging page
  debugging: {
    title: '🔍 Debugging',
    intro: 'Tools and techniques for debugging Pulse applications.',
    sourceMaps: 'Source Maps',
    sourceMapsDesc: 'Pulse v1.4.9+ generates V3 source maps for compiled .pulse files.',
    enablingSourceMaps: 'Enabling Source Maps',
    viteIntegration: 'Vite Integration',
    viteIntegrationDesc: 'The Vite plugin automatically generates source maps in development mode.',
    usingSourceMaps: 'Using Source Maps in DevTools',
    usingSourceMapsSteps: [
      'Open Chrome/Firefox DevTools (F12)',
      'Go to Sources tab',
      'Find your .pulse files in the file tree',
      'Set breakpoints on original source lines',
      'Error stack traces will show original line numbers'
    ],
    loggerApi: 'Logger API',
    loggerApiDesc: 'Use the built-in logger for structured debugging output.',
    logLevels: 'Log Levels',
    reactivityDebugging: 'Reactivity Debugging',
    reactivityDebuggingDesc: 'Techniques for debugging reactive state and effects.',
    trackingDependencies: 'Tracking Dependencies',
    debuggingComputed: 'Debugging Computed Values',
    batchDebugging: 'Batch Debugging',
    routerDebugging: 'Router Debugging',
    routerDebuggingDesc: 'Debug navigation and route matching.',
    hmrDebugging: 'HMR Debugging',
    hmrDebuggingDesc: 'Debug Hot Module Replacement issues.',
    commonErrors: 'Common Errors',
    performanceProfiling: 'Performance Profiling',
    performanceProfilingDesc: 'Tips for identifying performance bottlenecks.',
    nextApiReference: 'Next: API Reference →'
  },

  // Accessibility page
  accessibility: {
    title: '♿ Accessibility',
    intro: 'Pulse is designed with accessibility as a core feature, providing multiple layers of a11y support.',
    nextSecurity: 'Next: Security Guide →'
  },

  // Security page
  security: {
    title: '🔒 Security',
    intro: 'Best practices for building secure Pulse applications.',
    xssPrevention: 'XSS Prevention',
    xssPreventionDesc: 'Cross-Site Scripting (XSS) is one of the most common web vulnerabilities.',
    safeByDefault: 'Safe by Default: Text Content',
    safeByDefaultDesc: 'The el() function with string children automatically escapes HTML.',
    dangerousInnerHtml: 'Dangerous: innerHTML',
    dangerousInnerHtmlDesc: 'Never use innerHTML with untrusted content.',
    safePatterns: 'Safe Patterns for Dynamic Content',
    urlSanitization: 'URL Sanitization',
    urlSanitizationDesc: 'Always sanitize user-provided URLs.',
    formSecurity: 'Form Security',
    formSecurityDesc: 'Secure handling of form data.',
    inputValidation: 'Input Validation',
    sensitiveData: 'Sensitive Data',
    csp: 'Content Security Policy',
    cspDesc: 'Recommended CSP headers for Pulse applications.',
    apiSecurity: 'API Security',
    apiSecurityDesc: 'Secure patterns for data fetching.',
    checklist: 'Security Checklist',
    nextPerformance: 'Next: Performance Guide'
  },

  // Internals page
  internals: {
    title: '⚙️ Framework Internals',
    intro: 'Deep dive into the algorithms and implementation details that power Pulse. Intended for contributors, advanced users, and the curious.',

    // LIS Algorithm section
    lisAlgorithm: 'List Diffing (LIS Algorithm)',
    lisDesc: 'When a reactive list updates, Pulse uses the Longest Increasing Subsequence (LIS) algorithm to minimize DOM operations.',
    whyLis: 'Why LIS?',
    whyLisDesc: 'The key insight is that some elements are already in correct relative order. If we identify which elements don\'t need to move, we only reposition the others.',
    lisOverview: 'Algorithm Overview (O(n log n))',
    lisOverviewDesc: 'The algorithm uses binary search to efficiently compute which items can stay in place:',

    // Reconciliation phases
    reconciliationPhases: 'Reconciliation Phases',
    phasesCaption: 'List update phases and their complexity',
    phase: 'Phase',
    operation: 'Operation',
    complexity: 'Complexity',
    keyExtraction: 'Map items to unique keys',
    diffPhase: 'Identify added/removed/moved',
    removePhase: 'Delete DOM nodes',
    createPhase: 'Batch-create via DocumentFragment',
    lisPhase: 'Compute stable items',
    reorderPhase: 'Move non-LIS items',

    // Performance by case
    performanceByCase: 'Performance by Scenario',
    scenarioCaption: 'DOM operations by update type',
    scenario: 'Scenario',
    domOps: 'DOM Operations',
    notes: 'Notes',
    appendItems: 'Append items',
    appendNote: 'Single DocumentFragment insert',
    prependItems: 'Prepend items',
    prependNote: 'Existing items in LIS',
    removeItems: 'Remove items',
    removeNote: 'No moves needed',
    reverseList: 'Reverse list',
    reverseNote: 'LIS length = 1, all move',
    randomShuffle: 'Random shuffle',
    shuffleNote: 'Typically 30-50% move',
    moveSingle: 'Move single item',
    moveNote: 'LIS covers n-1 items',

    // Selector Cache section
    selectorCache: 'Selector Cache (LRU)',
    selectorCacheDesc: 'The parseSelector() function caches parsed results using an LRU (Least Recently Used) cache to optimize repeated selector parsing.',
    whyLru: 'Why LRU Instead of Map?',
    cacheComparisonCaption: 'Cache strategy comparison',
    approach: 'Approach',
    memory: 'Memory',
    longRunning: 'Long-running Apps',
    noCache: 'No cache',
    minimal: 'Minimal',
    unboundedMap: 'Unbounded Map',
    growsForever: 'Grows forever',
    memoryLeak: 'Memory leak risk',
    bounded: 'Bounded',
    hotCached: 'Hot selectors stay cached',
    cacheConfig: 'Configuration',
    cacheSafety: 'Cache Safety',
    cacheSafetyDesc: 'The cache returns shallow copies to prevent mutation of cached values:',
    lruEviction: 'LRU Eviction Behavior',

    // Conditional Lifecycle section
    conditionalLifecycle: 'Conditional Rendering Lifecycle',
    conditionalLifecycleDesc: 'The when() and match() functions manage effect cleanup to prevent memory leaks and stale subscriptions.',
    cleanupGuarantees: 'Cleanup Guarantees',
    nodesRemoved: 'DOM nodes removed',
    nodesRemovedDesc: 'Previous branch nodes are removed from DOM',
    cleanupCalled: 'Cleanup functions called',
    cleanupCalledDesc: 'Any cleanup returned by previous render runs',
    stateReset: 'State reset',
    stateResetDesc: 'Internal tracking arrays cleared',
    lifecycleDiagram: 'Lifecycle Diagram',

    // when vs show
    whenVsShow: 'when() vs show() Comparison',
    whenVsShowCaption: 'Choosing between conditional rendering methods',
    feature: 'Feature',
    domPresence: 'DOM presence',
    addsRemoves: 'Adds/removes nodes',
    alwaysInDom: 'Always in DOM (display: none)',
    effects: 'Effects',
    createdDisposed: 'Created/disposed per branch',
    alwaysActive: 'Always active',
    memoryUsage: 'Memory',
    lowerWhenHidden: 'Lower when hidden',
    constant: 'Constant',
    transitions: 'Transitions',
    harder: 'Harder (node recreation)',
    easier: 'Easier (CSS)',
    formState: 'Form state',
    lostOnHide: 'Lost on hide',
    preserved: 'Preserved',
    useCase: 'Use case',
    complexConditional: 'Complex conditional UI',
    simpleToggle: 'Simple visibility toggle',
    cleanupPattern: 'Cleanup Pattern',

    // Effect Scheduling section
    effectScheduling: 'Effect Scheduling',
    effectSchedulingDesc: 'Effects in Pulse are scheduled synchronously but can be batched to avoid redundant executions.',
    executionModel: 'Execution Model',
    circularProtection: 'Circular Dependency Protection',
    circularProtectionDesc: 'Effects that trigger themselves are detected and limited to 100 iterations:',
    cleanupTiming: 'Effect Cleanup Timing',
    nestedEffects: 'Nested Effects',
    nestedEffectsDesc: 'Effects can be nested. Inner effects are automatically disposed when the outer effect re-runs.',

    // Navigation
    nextPerformance: 'Next: Performance Guide →'
  },

  // Performance page
  performance: {
    title: '⚡ Performance',
    intro: 'Optimize your Pulse applications for maximum performance.',
    lazyComputed: 'Lazy Computed Values',
    lazyComputedDesc: 'By default, computed values evaluate immediately. Use lazy evaluation for expensive calculations.',
    whenToUseLazy: 'When to Use Lazy',
    listKeying: 'List Keying',
    listKeyingDesc: 'Proper keying is critical for list performance.',
    goodVsBadKeys: 'Good vs Bad Keys',
    performanceImpact: 'Performance Impact',
    batching: 'Batching Updates',
    batchingDesc: 'Batch multiple state changes to avoid intermediate re-renders.',
    automaticBatching: 'Automatic Batching',
    memoization: 'Memoization',
    memoizationDesc: 'Cache expensive calculations to avoid redundant work.',
    lazyRoutes: 'Lazy Loading Routes',
    lazyRoutesDesc: 'Split your app into chunks loaded on demand.',
    avoidReactivity: 'Avoid Unnecessary Reactivity',
    avoidReactivityDesc: 'Not everything needs to be reactive.',
    effectOptimization: 'Effect Optimization',
    effectOptimizationDesc: 'Keep effects fast and focused.',
    resourceCaching: 'Resource Caching',
    resourceCachingDesc: 'Use the async module caching features.',
    monitoring: 'Performance Monitoring',
    monitoringDesc: 'Use the devtools module to monitor performance.',
    checklist: 'Performance Checklist',
    nextErrorHandling: 'Next: Error Handling'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Error Handling',
    intro: 'Robust error handling strategies for Pulse applications.',
    effectErrors: 'Effect Errors',
    asyncErrors: 'Async Errors',
    formErrors: 'Form Errors',
    routerErrors: 'Router Errors',
    boundaries: 'Error Boundaries',
    logging: 'Logging & Reporting',
    gracefulDegradation: 'Graceful Degradation',
    summary: 'Summary',
    nextApiReference: 'Next: API Reference →'
  },

  // HTTP page
  http: {
    title: '🌐 HTTP Client',
    intro: 'Zero-dependency HTTP client for making API requests. Built on native fetch with interceptors, retry, timeout, and reactive integration.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Import and use the HTTP client:',
    configuration: 'Configuration',
    configurationDesc: 'Configure default settings for all requests:',
    httpMethods: 'HTTP Methods',
    responseStructure: 'Response Structure',
    interceptors: 'Interceptors',
    interceptorsDesc: 'Interceptors allow you to transform requests and responses globally.',
    requestInterceptors: 'Request Interceptors',
    responseInterceptors: 'Response Interceptors',
    manageInterceptors: 'Managing Interceptors',
    errorHandling: 'Error Handling',
    errorHandlingDesc: 'All errors are wrapped in HttpError with useful properties:',
    errorCodes: 'Error Codes',
    description: 'Description',
    when: 'When',
    errorTimeout: 'Request timed out',
    errorTimeoutWhen: 'Timeout elapsed before response',
    errorNetwork: 'Network failure',
    errorNetworkWhen: 'No connection or server unreachable',
    errorAbort: 'Request cancelled',
    errorAbortWhen: 'AbortController.abort() called',
    errorHttp: 'HTTP error status',
    errorHttpWhen: 'Response status not in 2xx range',
    errorParse: 'Response parsing failed',
    errorParseWhen: 'JSON/blob parsing error',
    cancellation: 'Request Cancellation',
    cancellationDesc: 'Cancel requests using AbortController:',
    retry: 'Retry Configuration',
    retryDesc: 'Automatically retry failed requests:',
    reactiveIntegration: 'Reactive Integration',
    reactiveIntegrationDesc: 'Seamlessly integrate HTTP requests with Pulse reactivity:',
    useHttpResourceDesc: 'For cached resources with SWR (stale-while-revalidate) pattern:',
    childInstances: 'Child Instances',
    childInstancesDesc: 'Create specialized clients that inherit from a parent:',
    fileUpload: 'File Upload',
    urlParameters: 'URL Parameters',
    fullExample: 'Complete Example'
  },

  // Mobile page
  mobile: {
    title: '📱 Mobile Development',
    intro: 'Build native mobile apps with Pulse.',
    overview: 'Overview',
    quickStart: 'Quick Start',
    cliCommands: 'CLI Commands',
    configuration: 'Configuration',
    configurationDesc: 'The pulse.mobile.json file configures your mobile app.',
    nativeApis: 'Native APIs',
    requirements: 'Requirements',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Next: Examples →'
  },

  // Migration from React page
  migrationReact: {
    title: '⚛️ Migration from React',
    intro: 'Coming from React? This guide will help you understand the key differences and migrate your mental model to Pulse.',
    quickComparison: 'Quick Comparison',
    quickComparisonDesc: 'Here\'s how React and Pulse compare at a glance:',
    stateManagement: 'State Management',
    stateManagementDesc: 'React uses useState hooks, while Pulse uses reactive signals called "pulses".',
    effects: 'Effects & Side Effects',
    effectsDesc: 'Both frameworks use effects, but Pulse automatically tracks dependencies.',
    computed: 'Computed Values',
    computedDesc: 'React\'s useMemo becomes Pulse\'s computed() with automatic dependency tracking.',
    components: 'Components',
    componentsDesc: 'React uses JSX components, Pulse uses plain JavaScript functions that return DOM elements.',
    conditionalRendering: 'Conditional Rendering',
    conditionalRenderingDesc: 'React uses ternary operators and &&, Pulse provides the when() helper.',
    lists: 'List Rendering',
    listsDesc: 'React uses map(), Pulse provides list() with automatic keying.',
    forms: 'Form Handling',
    formsDesc: 'Pulse provides built-in form validation with useForm().',
    globalState: 'Global State',
    globalStateDesc: 'React uses Context + useContext, Pulse uses createStore() with built-in persistence.',
    routing: 'Routing',
    routingDesc: 'Both have similar routing APIs, but Pulse\'s is built-in with no extra dependencies.',
    cheatSheet: 'Cheat Sheet',
    cheatSheetDesc: 'Quick reference for common patterns:',
    notes: 'Notes',
    cheatState: 'Create reactive state',
    cheatSet: 'Set state directly',
    cheatUpdate: 'Functional update',
    cheatEffect: 'Auto-tracks dependencies',
    cheatComputed: 'Memoized derived value',
    cheatElement: 'CSS selector syntax',
    cheatList: 'With key function',
    cheatWhen: 'Conditional render',
    cheatContext: 'Global store access',
    cheatRef: 'Direct DOM reference',
    stepByStep: 'Step-by-Step Migration',
    stepByStepDesc: 'Follow these steps to migrate your React app to Pulse:',
    step1Title: 'Install Pulse',
    step1Desc: 'Add Pulse to your project alongside React.',
    step2Title: 'Start with Leaf Components',
    step2Desc: 'Begin migrating small, self-contained components first. These are easier to convert and test.',
    step3Title: 'Convert State Management',
    step3Desc: 'Replace useState with pulse() and useEffect with effect(). Remember: no dependency arrays needed!',
    step4Title: 'Migrate Parent Components',
    step4Desc: 'Once child components are converted, work your way up to parent components.',
    step5Title: 'Remove React',
    step5Desc: 'When all components are migrated, remove React dependencies and enjoy your smaller bundle!',
    gotchas: 'Common Gotchas',
    gotcha1Title: 'Don\'t use get() for updates',
    gotcha1Desc: 'Use update() for functional updates to avoid race conditions.',
    gotcha2Title: 'Use get() in effects, not peek()',
    gotcha2Desc: 'peek() reads without tracking - use get() to create dependencies.',
    gotcha3Title: 'Don\'t mutate arrays/objects',
    gotcha3Desc: 'Always create new references when updating collections.',
    needHelp: 'Need Help?',
    needHelpDesc: 'Have questions about migrating? We\'re here to help!',
    discussions: 'GitHub Discussions',
    issues: 'Report Issues',
    getStarted: 'Get Started with Pulse',
    viewExamples: 'View Examples',
    tip: 'Tip',
    stateTip: 'Unlike useState, pulse() returns a single object with get(), set(), and update() methods.',
    effectTip: 'No dependency arrays! Pulse automatically tracks which pulses are read inside effects.',
    storeTip: 'Pulse stores are simpler - no providers needed, just import and use anywhere.'
  },

  // Migration from Angular page
  migrationAngular: {
    title: '🅰️ Migration from Angular',
    intro: 'Coming from Angular? This guide will help you understand the key differences and migrate your mental model to Pulse.',
    quickComparison: 'Quick Comparison',
    quickComparisonDesc: 'Here\'s how Angular and Pulse compare at a glance:',
    componentStructure: 'Component Structure',
    componentStructureDesc: 'Angular uses decorated classes with templates, while Pulse uses plain JavaScript functions.',
    propertyBinding: 'Property & Event Binding',
    propertyBindingDesc: 'Angular uses special syntax for bindings, Pulse uses direct DOM manipulation with reactive helpers.',
    observables: 'Observables vs Pulses',
    observablesDesc: 'Angular relies on RxJS observables. Pulse uses simpler reactive signals with automatic dependency tracking.',
    dependencyInjection: 'Dependency Injection',
    dependencyInjectionDesc: 'Angular uses a complex DI system. Pulse uses simple ES module imports.',
    directives: 'Directives',
    directivesDesc: 'Angular\'s structural directives (*ngIf, *ngFor) become Pulse helpers (when, list).',
    forms: 'Form Handling',
    formsDesc: 'Angular has Reactive Forms and Template-driven forms. Pulse provides useForm() with built-in validation.',
    routing: 'Routing',
    routingDesc: 'Both have similar routing concepts, but Pulse\'s router is simpler and built-in.',
    http: 'HTTP Client',
    httpDesc: 'Angular HttpClient uses observables. Pulse HTTP uses promises with optional reactive wrappers.',
    pipes: 'Pipes vs Computed',
    pipesDesc: 'Angular pipes for data transformation become computed values in Pulse.',
    cheatSheet: 'Cheat Sheet',
    cheatSheetDesc: 'Quick reference for common patterns:',
    notes: 'Notes',
    cheatComponent: 'No decorators needed',
    cheatSignal: 'Simpler reactive primitive',
    cheatEmit: 'Direct value update',
    cheatSubscribe: 'Auto-tracking, auto-cleanup',
    cheatDerived: 'No operators needed',
    cheatIf: 'Conditional rendering',
    cheatFor: 'List with auto-keying',
    cheatModel: 'Two-way binding',
    cheatBind: 'Reactive class binding',
    cheatService: 'Just export a store',
    cheatAsync: 'Automatic subscription',
    stepByStep: 'Step-by-Step Migration',
    stepByStepDesc: 'Follow these steps to migrate your Angular app to Pulse:',
    step1Title: 'Install Pulse',
    step1Desc: 'Add Pulse to your project. You can run it alongside Angular during migration.',
    step2Title: 'Start with Leaf Components',
    step2Desc: 'Begin with small, self-contained components that don\'t depend on Angular services.',
    step3Title: 'Replace Services with Stores',
    step3Desc: 'Convert Angular services to Pulse stores. Replace BehaviorSubject with pulse() and observables with effects.',
    step4Title: 'Migrate Templates',
    step4Desc: 'Convert Angular templates to Pulse\'s el() function. Replace *ngIf with when(), *ngFor with list().',
    step5Title: 'Remove Angular',
    step5Desc: 'Once all components are migrated, remove Angular dependencies. Enjoy your 95%+ smaller bundle!',
    gotchas: 'Common Gotchas',
    gotcha1Title: 'No Manual Unsubscribe',
    gotcha1Desc: 'Unlike RxJS, Pulse effects auto-cleanup. No need for takeUntil or unsubscribe patterns.',
    gotcha2Title: 'No Dependency Injection',
    gotcha2Desc: 'Just use ES imports. No providers, no modules, no decorators.',
    gotcha3Title: 'No Change Detection',
    gotcha3Desc: 'Forget about OnPush, markForCheck, or detectChanges. Pulse updates are automatic and precise.',
    gotcha4Title: 'No RxJS Operators',
    gotcha4Desc: 'Replace complex operator chains with computed() and async/await. Much simpler!',
    needHelp: 'Need Help?',
    needHelpDesc: 'Have questions about migrating? We\'re here to help!',
    discussions: 'GitHub Discussions',
    issues: 'Report Issues',
    getStarted: 'Get Started with Pulse',
    viewExamples: 'View Examples',
    tip: 'Tip',
    componentTip: 'No decorators, no modules, no boilerplate. Just functions that return DOM elements.',
    observablesTip: 'No subscribe/unsubscribe! Effects automatically track dependencies and clean up.',
    diTip: 'No providers or modules needed. Just import what you need, where you need it.'
  },

  // Migration from Vue page
  migrationVue: {
    title: '💚 Migration from Vue',
    intro: 'Coming from Vue? This guide will help you understand the key differences and migrate your mental model to Pulse.',
    quickComparison: 'Quick Comparison',
    quickComparisonDesc: 'Here\'s how Vue and Pulse compare at a glance:',
    reactivity: 'Reactivity: ref vs pulse',
    reactivityDesc: 'Vue uses ref() and reactive() for reactivity. Pulse uses a single pulse() primitive for all reactive state.',
    componentStructure: 'Component Structure',
    componentStructureDesc: 'Vue uses Single File Components (SFCs) with template, script, and style. Pulse uses plain JavaScript functions.',
    watchers: 'Watchers vs Effects',
    watchersDesc: 'Vue has watch() and watchEffect(). Pulse simplifies this to just effect() with automatic dependency tracking.',
    directives: 'Template Directives',
    directivesDesc: 'Vue\'s v-if, v-for, v-model directives become Pulse helpers: when(), list(), model().',
    propsEvents: 'Props & Events',
    propsEventsDesc: 'Vue uses defineProps() and defineEmits(). Pulse passes everything as function arguments.',
    provideInject: 'Provide/Inject vs Stores',
    provideInjectDesc: 'Vue\'s provide/inject and Pinia stores become simple ES module exports in Pulse.',
    lifecycle: 'Lifecycle Hooks',
    lifecycleDesc: 'Vue has many lifecycle hooks. Pulse simplifies to effect cleanup functions.',
    slots: 'Slots',
    slotsDesc: 'Vue slots become children props or render functions in Pulse.',
    routing: 'Routing',
    routingDesc: 'Both have similar routing concepts. Pulse\'s router is built-in with no extra dependencies.',
    forms: 'Form Handling',
    formsDesc: 'Vue uses v-model for forms. Pulse provides useForm() with built-in validation.',
    cheatSheet: 'Cheat Sheet',
    cheatSheetDesc: 'Quick reference for common patterns:',
    notes: 'Notes',
    cheatRef: 'Create reactive state',
    cheatRead: 'Read value',
    cheatWrite: 'Write value',
    cheatReactive: 'Objects use same API',
    cheatComputed: 'Same concept!',
    cheatWatch: 'Unified, simpler API',
    cheatIf: 'Conditional render',
    cheatFor: 'List with key function',
    cheatModel: 'Two-way binding',
    cheatEvent: 'Event handling',
    cheatBind: 'Reactive attributes',
    cheatProvide: 'Just export modules',
    stepByStep: 'Step-by-Step Migration',
    stepByStepDesc: 'Follow these steps to migrate your Vue app to Pulse:',
    step1Title: 'Install Pulse',
    step1Desc: 'Add Pulse to your project alongside Vue.',
    step2Title: 'Start with Leaf Components',
    step2Desc: 'Begin migrating small, self-contained components first. These are easier to convert and test.',
    step3Title: 'Convert State to Pulses',
    step3Desc: 'Replace ref() with pulse() and reactive() with pulse(). Replace watch/watchEffect with effect().',
    step4Title: 'Migrate Templates',
    step4Desc: 'Convert Vue templates to Pulse\'s el() function. Replace v-if with when(), v-for with list().',
    step5Title: 'Remove Vue',
    step5Desc: 'When all components are migrated, remove Vue dependencies and enjoy your 88% smaller bundle!',
    gotchas: 'Common Gotchas',
    gotcha1Title: 'No .value Property',
    gotcha1Desc: 'Pulse uses get()/set() methods instead of Vue\'s .value property.',
    gotcha2Title: 'No Direct Mutation',
    gotcha2Desc: 'Unlike Vue reactive(), Pulse requires creating new references for objects and arrays.',
    gotcha3Title: 'Effect Cleanup is Different',
    gotcha3Desc: 'Return a cleanup function from effect() instead of using onUnmounted().',
    gotcha4Title: 'No Template Syntax',
    gotcha4Desc: 'Pulse uses CSS selector syntax with el() instead of HTML templates.',
    needHelp: 'Need Help?',
    needHelpDesc: 'Have questions about migrating? We\'re here to help!',
    discussions: 'GitHub Discussions',
    issues: 'Report Issues',
    getStarted: 'Get Started with Pulse',
    viewExamples: 'View Examples',
    tip: 'Tip',
    reactivityTip: 'Unlike Vue\'s ref/reactive split, Pulse uses a single pulse() for all values. No more deciding which to use!',
    componentTip: 'No SFC compiler needed. Components are just functions that return DOM elements.',
    watchersTip: 'One effect() replaces watch(), watchEffect(), and computed() for side effects. Dependencies are always automatic.',
    propsEventsTip: 'Pass callbacks directly as props. No emit() ceremony needed.',
    provideInjectTip: 'No provide/inject boilerplate. Just export a pulse and import it anywhere.',
    lifecycleTip: 'Return a cleanup function from effect() to handle unmount logic. Much simpler than multiple lifecycle hooks!'
  },

  // Testing page
  testing: {
    title: '🧪 Testing',
    intro: 'Comprehensive guide to testing Pulse applications using Node.js built-in test runner and Pulse test utilities.',

    // Quick Start
    quickStart: 'Quick Start',
    quickStartDesc: 'Pulse uses Node.js built-in test runner with zero additional dependencies. Run tests with the CLI or directly with Node.',
    runningTests: 'Running Tests',

    // Writing Tests
    writingTests: 'Writing Tests',
    writingTestsDesc: 'Tests can be written using Node.js built-in test module or Pulse\'s custom test utilities.',
    basicStructure: 'Basic Test Structure',
    pulseTestUtils: 'Pulse Test Utilities',
    pulseTestUtilsDesc: 'Pulse provides a lightweight test runner with assertions, spies, and async support.',

    // Isolated Contexts
    isolatedContexts: 'Isolated Reactive Contexts',
    isolatedContextsDesc: 'Use createContext() and withContext() to isolate reactive state between tests, preventing test pollution.',

    // Testing Reactivity
    testingReactivity: 'Testing Reactivity',
    testingReactivityDesc: 'Patterns for testing pulses, computed values, and effects.',
    testingPulses: 'Testing Pulses',
    testingComputed: 'Testing Computed Values',
    testingEffects: 'Testing Effects',

    // Testing DOM
    testingDom: 'Testing DOM Components',
    testingDomDesc: 'Test DOM rendering without a browser using the mock DOM utilities.',
    mockDomSetup: 'Mock DOM Setup',
    testingElements: 'Testing Elements',
    testingLists: 'Testing Lists',
    testingConditionals: 'Testing Conditionals',

    // MockDOMAdapter
    mockDomAdapter: 'MockDOMAdapter for Testing',
    mockDomAdapterDesc: 'The MockDOMAdapter provides a complete DOM abstraction for testing without a browser environment.',

    // Testing Async
    testingAsync: 'Testing Async Operations',
    testingAsyncDesc: 'Patterns for testing async data fetching with useAsync and useResource.',

    // Testing Forms
    testingForms: 'Testing Forms',
    testingFormsDesc: 'Test form validation, field state, and form submission.',

    // Testing Store
    testingStore: 'Testing Stores',
    testingStoreDesc: 'Test global state management with createStore, actions, and getters.',

    // Testing Router
    testingRouter: 'Testing Router',
    testingRouterDesc: 'Test route matching, navigation, and guards with mocked history API.',

    // Testing HTTP
    testingHttp: 'Testing HTTP Requests',
    testingHttpDesc: 'Mock the fetch API to test HTTP client behavior.',

    // Test Helpers
    testHelpers: 'Test Helper Reference',
    testHelpersDesc: 'Complete reference for all test utilities and assertions.',
    assertions: 'Assertions',
    assertionsCaption: 'Available assertion functions',
    function: 'Function',
    description: 'Description',
    example: 'Example',
    assertDesc: 'Assert condition is truthy',
    assertEqualDesc: 'Assert strict equality (===)',
    assertDeepEqualDesc: 'Assert deep equality (JSON comparison)',
    assertThrowsDesc: 'Assert function throws',
    assertThrowsAsyncDesc: 'Assert async function throws',
    assertTruthyDesc: 'Assert value is truthy',
    assertFalsyDesc: 'Assert value is falsy',
    assertInstanceOfDesc: 'Assert instanceof check',
    assertTypeDesc: 'Assert typeof check',
    spiesAndMocks: 'Spies and Timing Utilities',

    // Coverage
    coverageReporting: 'Coverage Reporting',
    coverageReportingDesc: 'Generate code coverage reports to identify untested code paths.',
    coverageTips: 'Coverage Tips',
    coverageTip1: 'Aim for high coverage on business logic and utilities',
    coverageTip2: 'Don\'t chase 100% coverage - focus on meaningful tests',
    coverageTip3: 'Test edge cases and error conditions',
    coverageTip4: 'Use coverage to identify dead code',

    // Best Practices
    bestPractices: 'Best Practices',
    practice1Title: '1. Isolate Test State',
    practice1Desc: 'Use isolated reactive contexts to prevent state leaking between tests.',
    practice2Title: '2. Test Behavior, Not Implementation',
    practice2Desc: 'Focus on what your code does, not how it does it internally.',
    practice3Title: '3. Use Descriptive Test Names',
    practice3Desc: 'Test names should describe the expected behavior clearly.',
    practice4Title: '4. Follow AAA Pattern',
    practice4Desc: 'Structure tests with Arrange, Act, Assert sections for clarity.',

    // CI Integration
    ciIntegration: 'CI/CD Integration',
    ciIntegrationDesc: 'Run tests automatically in your CI/CD pipeline.',

    // Navigation
    nextDebugging: 'Next: Debugging →'
  },

  // Changelog page
  changelog: {
    title: '📋 Changelog',
    intro: 'Recent updates and improvements to the Pulse Framework.',
    version: 'Version',
    releaseDate: 'Release Date',
    changes: 'Changes',
    added: 'Added',
    changed: 'Changed',
    fixed: 'Fixed',
    removed: 'Removed',
    deprecated: 'Deprecated',
    security: 'Security',
    breaking: 'Breaking Change',
    features: 'Features',
    bugFixes: 'Bug Fixes',
    improvements: 'Improvements',
    documentation: 'Documentation',
    performance: 'Performance',
    tests: 'Tests'
  },

  // Benchmarks page
  benchmarks: {
    title: '📊 Benchmarks',
    intro: 'Interactive performance tests that run directly in your browser. Click "Run All" to measure Pulse performance on your machine.',
    runAll: 'Run All',
    clear: 'Clear Results',
    running: 'Running',
    clickToRun: 'Click "Run" to test',
    note: 'Note',
    noteText: 'Results vary based on browser, hardware, and system load. Run multiple times for accurate measurements.',

    // Categories
    reactivity: 'Reactivity',
    computed: 'Computed Values',
    effects: 'Effects',
    batching: 'Batching',
    dom: 'DOM Operations',
    advanced: 'Advanced Patterns',

    // Comparison table
    comparison: 'Framework Comparison',
    comparisonIntro: 'How does Pulse compare to other frameworks? Run the benchmarks above to see your actual results.',
    metric: 'Metric',
    bundleSize: 'Bundle Size (gzip)',
    signalCreate: 'Signal Creation',
    signalUpdate: 'Signal Update',
    dependencies: 'Dependencies',
    buildRequired: 'Build Required',

    // Methodology
    methodology: 'Methodology',
    howItWorks: 'How Benchmarks Work',
    warmup: 'Warmup',
    warmupText: '10% of iterations run first to warm up JIT compilation.',
    measurement: 'Measurement',
    measurementText: 'Operations run in a tight loop with performance.now() timing.',
    precision: 'Precision',
    precisionText: 'Results show ops/sec, average time, and total time.',
    factors: 'Factors Affecting Results',
    factor1: 'Browser engine (V8 in Chrome, SpiderMonkey in Firefox, JSC in Safari)',
    factor2: 'System load and available memory',
    factor3: 'CPU frequency scaling and thermal throttling',
    factor4: 'Browser extensions and DevTools state',

    // Navigation
    nextPerformance: 'Next: Performance Guide →'
  },

  // WebSocket page
  websocket: {
    title: '🔌 WebSocket Client',
    intro: 'WebSocket client with automatic reconnection, heartbeat, message queuing, and reactive integration.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Use the reactive hook for simple WebSocket connections:',
    lowLevelApi: 'Low-Level API',
    creatingWebSocket: 'Creating a WebSocket',
    reactiveState: 'Reactive State',
    reactiveStateDesc: 'All state is exposed as Pulses:',
    sendingMessages: 'Sending Messages',
    eventListeners: 'Event Listeners',
    interceptors: 'Message Interceptors',
    interceptorsDesc: 'Transform incoming and outgoing messages:',
    control: 'Control',
    reactiveHook: 'Reactive Hook (Recommended)',
    reactiveHookDesc: 'For most use cases, the useWebSocket hook provides a simpler API:',
    usageWithEffects: 'Usage with Effects',
    errorHandling: 'Error Handling',
    errorHandlingDesc: 'All errors are wrapped in WebSocketError with useful properties:',
    errorCodes: 'Error Codes',
    description: 'Description',
    when: 'When',
    errorConnectFailed: 'Connection failed',
    errorConnectFailedWhen: 'Unable to establish connection',
    errorClose: 'Connection closed',
    errorCloseWhen: 'Server or client closed connection',
    errorTimeout: 'Connection timeout',
    errorTimeoutWhen: 'Connection attempt timed out',
    errorSendFailed: 'Send failed',
    errorSendFailedWhen: 'Message could not be sent',
    patterns: 'Common Patterns',
    chatApplication: 'Chat Application',
    realTimeUpdates: 'Real-time Updates',
    reconnectionWithAuth: 'Reconnection with Authentication'
  },

  // GraphQL page
  graphql: {
    title: '🔮 GraphQL Client',
    intro: 'GraphQL client with query caching, mutations, subscriptions, and reactive integration.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Create a client and use hooks for queries:',
    creatingClient: 'Creating a Client',
    queries: 'Queries',
    usingQueryData: 'Using Query Data',
    mutations: 'Mutations',
    optimisticUpdates: 'Optimistic Updates',
    optimisticUpdatesDesc: 'Update the UI immediately while the server processes the mutation:',
    subscriptions: 'Subscriptions',
    reactiveVariables: 'Reactive Variables',
    errorHandling: 'Error Handling',
    errorHandlingDesc: 'All errors are wrapped in GraphQLError with useful properties:',
    errorCodes: 'Error Codes',
    description: 'Description',
    errorGraphql: 'GraphQL errors in response',
    errorNetwork: 'Network or connection error',
    errorTimeout: 'Request timed out',
    errorParse: 'Response parsing failed',
    interceptors: 'Interceptors',
    cacheManagement: 'Cache Management',
    patterns: 'Common Patterns',
    pagination: 'Pagination',
    dependentQueries: 'Dependent Queries',
    realTimeChat: 'Real-time Chat'
  },

  // Context page
  context: {
    title: '🎯 Context API',
    intro: 'Context API for dependency injection and avoiding prop drilling, similar to React Context.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Create a context and provide values to children:',
    creatingContexts: 'Creating Contexts',
    providingValues: 'Providing Values',
    basicProvider: 'Basic Provider',
    reactiveValues: 'Providing Reactive Values',
    reactiveValuesDesc: 'Pass a pulse to make the context value reactive:',
    shorthandSyntax: 'Shorthand Syntax',
    nestedProviders: 'Nested Providers',
    nestedProvidersDesc: 'Inner providers override outer ones:',
    consumingContext: 'Consuming Context',
    consumerComponent: 'Consumer Component',
    multipleContexts: 'Multiple Contexts',
    provideManyDesc: 'Provide multiple contexts at once:',
    useContextSelectorDesc: 'Derive from multiple contexts:',
    utilities: 'Context Utilities',
    patterns: 'Common Patterns',
    themeProvider: 'Theme Provider',
    authContext: 'Auth Context',
    localizationContext: 'Localization Context',
    compoundComponents: 'Compound Components',
    testing: 'Testing with Context'
  },

  // DevTools page
  devtools: {
    title: '🛠️ DevTools',
    intro: 'Debugging, profiling, and accessibility auditing capabilities for development.',
    enabling: 'Enabling DevTools',
    enablingDesc: 'Enable DevTools to access debugging features:',
    trackedPulses: 'Tracked Pulses & Effects',
    trackedPulsesDesc: 'Track pulses and effects for debugging:',
    diagnostics: 'Diagnostics',
    getDiagnosticsDesc: 'Get runtime statistics:',
    getEffectStatsDesc: 'Get per-effect statistics:',
    getPulseListDesc: 'Get all tracked pulses:',
    dependencyGraph: 'Dependency Graph',
    dependencyGraphDesc: 'Visualize reactive dependencies:',
    timeTravel: 'Time-Travel Debugging',
    timeTravelDesc: 'Navigate through state history:',
    profiling: 'Performance Profiling',
    profileDesc: 'Profile a code block:',
    markDesc: 'Mark timing points:',
    a11yAudit: 'Accessibility Audit',
    a11yAuditDesc: 'Built-in accessibility auditing for finding a11y issues:',
    oneTimeAudit: 'One-Time Audit',
    continuousAuditing: 'Continuous Auditing',
    a11yStats: 'A11y Statistics',
    visualHighlighting: 'Visual Highlighting',
    exportReports: 'Export Reports',
    browserConsole: 'Browser Console',
    browserConsoleDesc: 'When enabled, DevTools expose window.__PULSE_DEVTOOLS__:',
    bestPractices: 'Best Practices',
    developmentOnly: 'Development Only',
    namingConventions: 'Naming Conventions',
    performanceMonitoring: 'Performance Monitoring',
    a11yInDevelopment: 'A11y in Development'
  },

  // SSR page
  ssr: {
    title: '🖥️ Server-Side Rendering',
    intro: 'Render Pulse applications on the server for improved SEO, faster initial page loads, and better performance on slow devices.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Import and use the SSR utilities:',
    serverSetup: 'Server Setup',
    serverSetupDesc: 'Set up an Express server with SSR:',
    clientHydration: 'Client-Side Hydration',
    clientHydrationDesc: 'Hydrate the server-rendered HTML on the client to attach event listeners and enable interactivity:',
    stateSerialization: 'State Serialization',
    stateSerializationDesc: 'Serialize and deserialize state for transfer between server and client:',
    modeDetection: 'SSR Mode Detection',
    modeDetectionDesc: 'Detect whether code is running on the server or client:',
    ssrSafeEffects: 'SSR-Safe Effects',
    ssrSafeEffectsDesc: 'Write effects that work correctly in both SSR and browser environments:',
    asyncData: 'Async Data with SSR',
    asyncDataDesc: 'useAsync automatically integrates with SSR for data fetching:',
    architecture: 'SSR Architecture',
    architectureDesc: 'The SSR system is composed of several specialized modules:',
    module: 'Module',
    purpose: 'Purpose',
    moduleMain: 'Main entry point (renderToString, hydrate)',
    moduleSerializer: 'HTML serialization for MockNode trees',
    moduleHydrator: 'Client-side hydration utilities',
    moduleAsync: 'Async data collection during SSR',
    howItWorks: 'How SSR Works',
    howItWorksDesc: 'Understanding the SSR process:',
    step1Title: 'Server Render:',
    step1Desc: 'renderToString() creates an isolated context using MockDOMAdapter.',
    step2Title: 'Async Collection:',
    step2Desc: 'First render collects all useAsync operations.',
    step3Title: 'Data Fetching:',
    step3Desc: 'Waits for all async operations to complete (with timeout).',
    step4Title: 'Re-render:',
    step4Desc: 'Second render with resolved data.',
    step5Title: 'Serialization:',
    step5Desc: 'MockNode tree is converted to HTML string.',
    step6Title: 'State Transfer:',
    step6Desc: 'State is serialized for the client.',
    step7Title: 'Hydration:',
    step7Desc: 'Client attaches event listeners to existing DOM.',
    apiReference: 'API Reference',
    renderToStringDesc: 'Render a component to an HTML string asynchronously, waiting for async data:',
    renderToStringSyncDesc: 'Render a component to an HTML string synchronously (no async waiting):',
    hydrateDesc: 'Attach event listeners to server-rendered HTML:',
    serializeDesc: 'Serialize and deserialize state safely:',
    fullExample: 'Complete Example',
    fullExampleDesc: 'A full SSR setup with server, client, and shared component:',
    sharedComponent: 'Shared Component (App.js)',
    serverFile: 'Server (server.js)',
    clientFile: 'Client (client.js)',
    bestPractices: 'Best Practices',
    practice1Title: 'Use isSSR() guards:',
    practice1Desc: 'Wrap browser-only APIs (window, document, localStorage) in isSSR() checks.',
    practice2Title: 'Set appropriate timeouts:',
    practice2Desc: 'Configure timeout based on your API response times.',
    practice3Title: 'Handle errors gracefully:',
    practice3Desc: 'Provide fallback UI when SSR fails.',
    practice4Title: 'Minimize client-server differences:',
    practice4Desc: 'Ensure the same component tree renders on both server and client.',
    practice5Title: 'Serialize only necessary state:',
    practice5Desc: 'Avoid transferring large or sensitive data in the initial state.',
    troubleshooting: 'Troubleshooting',
    hydrationMismatch: 'Hydration Mismatch',
    hydrationMismatchDesc: 'Server and client must render identical HTML. Avoid time-dependent or random values:',
    browserApis: 'Browser APIs on Server',
    browserApisDesc: 'Window, document, and other browser APIs are not available during SSR:',
    asyncTimeout: 'Async Timeout',
    asyncTimeoutDesc: 'If async operations take too long, increase the timeout:',
    prevHttp: '← HTTP Client',
    nextGraphQL: 'GraphQL Client →'
  }
};
