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
      a: 'Not yet, but it\'s on the roadmap. Currently Pulse is optimized for client-side SPAs and mobile apps.'
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
  }
};
