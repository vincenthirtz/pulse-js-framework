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
      builtIn: 'Built-in'
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
    intro: 'Pulse is built on four core concepts: Pulses (reactive state), Effects (side effects), DOM helpers, and the optional .pulse DSL.',
    pulses: 'Pulses (Reactive State)',
    pulsesDesc: 'A pulse is a reactive container that notifies subscribers when its value changes.',
    effects: 'Effects',
    effectsDesc: 'Effects automatically run when their dependencies change.',
    computed: 'Computed Values',
    computedDesc: 'Derived values that update automatically.',
    domHelpers: 'DOM Helpers',
    domHelpersDesc: 'Create DOM elements using CSS selector syntax.',
    reactiveBindings: 'Reactive Bindings',
    conditionalList: 'Conditional & List Rendering',
    pulseDsl: '.pulse DSL',
    pulseDslDesc: 'The optional DSL provides a cleaner syntax for components.'
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
    todoApp: 'Todo App',
    todoDesc: 'Classic todo list with local storage persistence.',
    chatApp: 'Chat App',
    chatDesc: 'Real-time chat interface with message history.',
    ecommerce: 'E-Commerce',
    ecommerceDesc: 'Product catalog with cart and checkout.',
    weather: 'Weather App',
    weatherDesc: 'Weather dashboard with API integration.',
    viewDemo: 'View Demo',
    viewSource: 'View Source'
  },

  // Playground page
  playground: {
    title: '🎮 Playground',
    intro: 'Try Pulse in your browser. Edit the code and see the results instantly.',
    run: 'Run',
    reset: 'Reset',
    share: 'Share'
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
    securityChecklist: 'Security Checklist',
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
    batchingUpdates: 'Batching Updates',
    batchingUpdatesDesc: 'Batch multiple state changes to avoid intermediate re-renders.',
    automaticBatching: 'Automatic Batching',
    memoization: 'Memoization',
    memoizationDesc: 'Cache expensive calculations to avoid redundant work.',
    lazyLoadingRoutes: 'Lazy Loading Routes',
    lazyLoadingRoutesDesc: 'Split your app into chunks loaded on demand.',
    avoidUnnecessaryReactivity: 'Avoid Unnecessary Reactivity',
    avoidUnnecessaryReactivityDesc: 'Not everything needs to be reactive.',
    effectOptimization: 'Effect Optimization',
    effectOptimizationDesc: 'Keep effects fast and focused.',
    resourceCaching: 'Resource Caching',
    resourceCachingDesc: 'Use the async module caching features.',
    performanceMonitoring: 'Performance Monitoring',
    performanceMonitoringDesc: 'Use the devtools module to monitor performance.',
    performanceChecklist: 'Performance Checklist',
    nextErrorHandling: 'Next: Error Handling'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Error Handling',
    intro: 'Robust error handling strategies for Pulse applications.',
    effectErrorHandling: 'Effect Error Handling',
    effectErrorHandlingDesc: 'Effects can fail. Handle errors gracefully.',
    perEffectHandler: 'Per-Effect Error Handler',
    globalEffectHandler: 'Global Effect Error Handler',
    asyncErrorHandling: 'Async Error Handling',
    asyncErrorHandlingDesc: 'The async module provides built-in error state handling.',
    formValidation: 'Form Validation Errors',
    formValidationDesc: 'Handle form validation with the form module.',
    routerErrorHandling: 'Router Error Handling',
    routerErrorHandlingDesc: 'Handle navigation errors and 404 pages.',
    userFeedback: 'User Feedback',
    userFeedbackDesc: 'Display errors to users appropriately.',
    errorBoundaries: 'Error Boundaries',
    errorBoundariesDesc: 'Contain errors to prevent full app crashes.',
    loggingErrors: 'Logging Errors',
    loggingErrorsDesc: 'Log errors for debugging and monitoring.',
    errorChecklist: 'Error Handling Checklist',
    nextMobile: 'Next: Mobile Development'
  },

  // Mobile page
  mobile: {
    title: '📱 Mobile Development',
    intro: 'Build native mobile apps with Pulse.',
    gettingStarted: 'Getting Started',
    gettingStartedDesc: 'Set up your mobile development environment.',
    platformDetection: 'Platform Detection',
    platformDetectionDesc: 'Detect the current platform and adapt behavior.',
    nativeStorage: 'Native Storage',
    nativeStorageDesc: 'Persistent storage that works on web and native.',
    deviceInfo: 'Device Info',
    deviceInfoDesc: 'Access device information and network status.',
    nativeUi: 'Native UI',
    nativeUiDesc: 'Access native UI elements like toasts and vibration.',
    appLifecycle: 'App Lifecycle',
    appLifecycleDesc: 'Handle app pause, resume, and back button events.',
    buildingApps: 'Building Apps',
    buildingAppsDesc: 'Build and package your app for distribution.',
    nextChangelog: 'Next: Changelog'
  },

  // Changelog page
  changelog: {
    title: '📋 Changelog'
  }
};
