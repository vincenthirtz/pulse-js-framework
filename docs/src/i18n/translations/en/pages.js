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

  // Other pages
  debugging: {
    title: '🔍 Debugging'
  },
  security: {
    title: '🔒 Security'
  },
  performance: {
    title: '⚡ Performance'
  },
  errorHandling: {
    title: '🛡️ Error Handling'
  },
  mobile: {
    title: '📱 Mobile Development'
  },
  changelog: {
    title: '📋 Changelog'
  }
};
