/**
 * Esperanto translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'Deklaracia DOM kadro kun CSS-elektilo-bazita strukturo',
    features: {
      zeroDeps: '0️⃣ Nul Dependecoj',
      uniqueSyntax: '🎯 Unika Sintakso',
      reactive: '⚡ Reaga',
      smallBundle: '📦 ~4kb kerno',
      noBuild: '🔧 Sen Kompilado',
      mobile: '📱 Poŝtelefonaj Aplikaĵoj'
    },
    getStarted: 'Komenci →',
    viewExamples: 'Vidi Ekzemplojn',
    whatMakesUnique: 'Kio Igas Pulse Unika?',
    quickExample: 'Rapida Ekzemplo',
    pulseSyntax: '.pulse sintakso',
    jsEquivalent: 'JavaScript ekvivalento',
    comparison: {
      feature: 'Trajto',
      uiStructure: 'UI Strukturo',
      cssSelectors: 'CSS Elektiloj',
      reactivity: 'Reageco',
      pulses: 'Pulsoj',
      buildStep: 'Kompila Paŝo',
      bundleSize: 'Pakaĵa Grando',
      dependencies: 'Dependecoj',
      buildSpeed: 'Kompila Rapido',
      learningCurve: 'Lernokurbo',
      fileExtension: 'Dosiera Finaĵo',
      mobileApps: 'Poŝtelefonaj Aplikaĵoj',
      typescript: 'TypeScript',
      required: 'Postulata',
      optional: 'Nedeviga',
      many: 'Multaj',
      some: 'Kelkaj',
      few: 'Malmultaj',
      zero: 'Nul',
      slow: 'Malrapida',
      medium: 'Meza',
      fast: 'Rapida',
      instant: 'Tuja',
      steep: 'Kruta',
      moderate: 'Modera',
      easy: 'Facila',
      minimal: 'Minimuma',
      builtIn: 'Enkonstruita'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Komenci',
    installation: 'Instalado',
    installationDesc: 'Kreu novan Pulse projekton per unu komando:',
    manualSetup: 'Mana Agordo',
    manualSetupDesc: 'Aŭ agordu mane en iu ajn projekto:',
    thenImport: 'Poste importu en via JavaScript:',
    firstComponent: 'Via Unua Komponanto',
    firstComponentDesc: 'Kreu simplan reagan kalkulilon:',
    usingPulseFiles: 'Uzante .pulse Dosierojn',
    usingPulseFilesDesc: 'Por pli pura sintakso, uzu <code>.pulse</code> dosierojn kun la Vite kromaĵo:',
    projectStructure: 'Projekta Strukturo',
    cliCommands: 'CLI Komandoj',
    cliCommandsDesc: 'Pulse provizas kompletan CLI por evolufluo:',
    development: 'Evoluo',
    codeQuality: 'Koda Kvalito',
    lintChecks: '<strong>Lint kontroloj:</strong> nedifinitaj referencoj, neuzataj importoj/statoj, nomkonvencioj, malplenaj blokoj, importordo.',
    formatRules: '<strong>Formataj reguloj:</strong> 2-spaca deŝovo, ordigitaj importoj, konsekvencaj krampoj, taŭga spacigo.',
    analyzeOutput: '<strong>Analiza eligo:</strong> dosierkalkulado, komponanta komplekseco, importgrafo, morta kodo-detekto.',
    faq: 'Oftaj Demandoj',
    faqBuildStep: {
      q: 'Ĉu mi bezonas kompilan paŝon?',
      a: 'Ne! Pulse funkcias rekte en la retumilo. Tamen, por <code>.pulse</code> dosieroj kaj produktada optimumigo, ni rekomendas uzi Vite kun la Pulse kromaĵo.'
    },
    faqComparison: {
      q: 'Kiel Pulse komparas al React/Vue?',
      a: 'Pulse estas multe pli malpeza (~4kb kerno, ~12kb plena vs 35-45kb) kaj uzas pulsojn (reagaj primitivoj) anstataŭ virtuala DOM. Ĝi havas nul dependecojn kaj nedevigan kompilan paŝon. La CSS elektilo-sintakso estas unika por Pulse.'
    },
    faqTypeScript: {
      q: 'Ĉu mi povas uzi TypeScript?',
      a: 'Jes! Pulse inkluzivas plenajn TypeScript difinojn. Nur importu tipojn el <code>pulse-js-framework/runtime</code> kaj via IDE provizos aŭtomatan kompletigon.'
    },
    faqForms: {
      q: 'Kiel mi traktas formularojn?',
      a: 'Uzu la <code>model()</code> helpanton por dudirekta ligado:'
    },
    faqExisting: {
      q: 'Ĉu mi povas uzi Pulse kun ekzistantaj projektoj?',
      a: 'Jes! Pulse povas esti surmetita al iu ajn DOM elemento. Uzu <code>mount(\'#my-widget\', MyComponent())</code> por enkorpigi Pulse komponentojn ie ajn.'
    },
    faqFetch: {
      q: 'Kiel mi prenas datumojn?',
      a: 'Uzu norman <code>fetch()</code> kun efikoj:'
    },
    faqSSR: {
      q: 'Ĉu Pulse subtenas SSR?',
      a: 'Ne ankoraŭ, sed ĝi estas en la vojmapo. Nuntempe Pulse estas optimumigita por klient-flankaj SPA-oj kaj poŝtelefonaj aplikaĵoj.'
    },
    faqDebug: {
      q: 'Kiel mi sencimigas mian aplikaĵon?',
      a: 'Pulse v1.4.9+ subtenas fontmapojn por <code>.pulse</code> dosieroj. Uzu la Logger API por strukturita eligo. Vidu la Sencimigan Gvidilon por pli.'
    },
    faqMobile: {
      q: 'Ĉu mi povas konstrui poŝtelefonajn aplikaĵojn?',
      a: 'Jes! Uzu <code>pulse mobile init</code> por agordi Android/iOS projektojn. Pulse inkluzivas indiĝenajn API-ojn por stokado, aparatinformoj, kaj pli. Vidu la Poŝtelefonan Gvidilon.'
    },
    faqHelp: {
      q: 'Kie mi povas akiri helpon?',
      a: 'Malfermu temon sur GitHub aŭ kontrolu la Ekzemplojn por referencaj efektivigoj.'
    },
    nextCoreConcepts: 'Sekva: Kernaj Konceptoj →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Kernaj Konceptoj',
    intro: 'Pulse estas konstruita sur kvar kernaj konceptoj: Pulsoj (reaga stato), Efikoj (kromefikoj), DOM helpantoj, kaj la nedeviga .pulse DSL.',
    pulses: 'Pulsoj (Reaga Stato)',
    pulsesDesc: 'Pulso estas reaga ujo kiu sciigas abonantojn kiam ĝia valoro ŝanĝiĝas.',
    effects: 'Efikoj',
    effectsDesc: 'Efikoj aŭtomate rulas kiam iliaj dependecoj ŝanĝiĝas.',
    computed: 'Kalkulitaj Valoroj',
    computedDesc: 'Derivitaj valoroj kiuj aŭtomate ĝisdatiĝas.',
    domHelpers: 'DOM Helpantoj',
    domHelpersDesc: 'Kreu DOM elementojn uzante CSS elektilo-sintakson.',
    reactiveBindings: 'Reagaj Ligadoj',
    conditionalList: 'Kondiĉa & Lista Bildigo',
    pulseDsl: '.pulse DSL',
    pulseDslDesc: 'La nedeviga DSL provizas pli puran sintakson por komponentoj.'
  },

  // API Reference page
  apiReference: {
    title: '📖 API Referenco',
    searchPlaceholder: 'Serĉi API...',
    categories: {
      all: 'Ĉiuj',
      types: 'Tipoj',
      reactivity: 'Reageco',
      dom: 'DOM',
      router: 'Vojigilo',
      store: 'Stokejo',
      hmr: 'HMR'
    }
  },

  // Examples page
  examples: {
    title: '✨ Ekzemploj',
    intro: 'Esploru ĉi tiujn ekzemplajn aplikaĵojn por vidi Pulse en ago.',
    todoApp: 'Tasklisto',
    todoDesc: 'Klasika tasklisto kun loka stokado-persisteco.',
    chatApp: 'Babila Aplikaĵo',
    chatDesc: 'Realtempo babila interfaco kun mesaĝhistorio.',
    ecommerce: 'Reta Komerco',
    ecommerceDesc: 'Produkta katalogo kun ĉareto kaj eligo.',
    weather: 'Vetera Aplikaĵo',
    weatherDesc: 'Vetera panelo kun API integriĝo.',
    viewDemo: 'Vidi Demonstron',
    viewSource: 'Vidi Fontkodon'
  },

  // Playground page
  playground: {
    title: '🎮 Ludejo',
    intro: 'Provu Pulse en via retumilo. Redaktu la kodon kaj vidu la rezultojn tuj.',
    run: 'Ruli',
    reset: 'Restarigi',
    share: 'Kunhavigi'
  },

  // Other pages
  debugging: {
    title: '🔍 Sencimigado'
  },
  security: {
    title: '🔒 Sekureco'
  },
  performance: {
    title: '⚡ Efikeco'
  },
  errorHandling: {
    title: '🛡️ Erartraktado'
  },
  mobile: {
    title: '📱 Poŝtelefona Evoluo'
  },
  changelog: {
    title: '📋 Ŝanĝoprotokolo'
  }
};
