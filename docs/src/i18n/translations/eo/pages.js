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
    filter: 'Filtri:',
    typescriptSupport: 'TypeScript Subteno',
    typescriptSupportDesc: 'Pulse inkluzivas plenajn TypeScript difinaĵojn por IDE aŭtokompleto.',
    reactivity: 'Reageco',
    reactivityDesc: 'Signal-bazita reageco-sistemo.',
    domSection: 'DOM',
    domSectionDesc: 'Helpantoj por krei kaj manipuli DOM.',
    routerSection: 'Vojigilo',
    routerSectionDesc: 'SPA vojigilo kun nestitaj vojoj kaj gardistoj.',
    storeSection: 'Stokejo',
    storeSectionDesc: 'Tutmonda stato-administrado.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Varma Modula Anstataŭigo.',
    resultsFound: 'rezulto(j) trovita(j)',
    noResults: 'Neniuj rezultoj trovitaj',
    nextMobile: 'Sekva: Poŝtelefonaj Aplikaĵoj →',
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

  // Debugging page
  debugging: {
    title: '🔍 Sencimigado',
    intro: 'Iloj kaj teknikoj por sencimigi Pulse aplikaĵojn.',
    sourceMaps: 'Fontmapoj',
    sourceMapsDesc: 'Pulse v1.4.9+ generas V3 fontmapojn por kompilitaj .pulse dosieroj.',
    enablingSourceMaps: 'Ebligi Fontmapojn',
    viteIntegration: 'Vite Integriĝo',
    viteIntegrationDesc: 'La Vite kromaĵo aŭtomate generas fontmapojn en evolumoduso.',
    usingSourceMaps: 'Uzi Fontmapojn en DevTools',
    usingSourceMapsSteps: [
      'Malfermu Chrome/Firefox DevTools (F12)',
      'Iru al la Sources langeto',
      'Trovu viajn .pulse dosierojn en la arbo',
      'Metu haltokomunkojn sur originalaj linioj',
      'Erarstakoj montros originalajn linioumerojn'
    ],
    loggerApi: 'Logger API',
    loggerApiDesc: 'Uzu la enkonstruitan protokolilon por strukturita sencimiga eligo.',
    logLevels: 'Protokolo-Niveloj',
    reactivityDebugging: 'Reageco-Sencimigado',
    reactivityDebuggingDesc: 'Teknikoj por sencimigi reagan staton kaj efikojn.',
    trackingDependencies: 'Spuri Dependecojn',
    debuggingComputed: 'Sencimigi Kalkulitajn Valorojn',
    batchDebugging: 'Ara Sencimigado',
    routerDebugging: 'Vojigilo-Sencimigado',
    routerDebuggingDesc: 'Sencimigi navigadon kaj vojo-kongruon.',
    hmrDebugging: 'HMR Sencimigado',
    hmrDebuggingDesc: 'Sencimigi Varma Modula Anstataŭiga problemojn.',
    commonErrors: 'Oftaj Eraroj',
    performanceProfiling: 'Efikeco-Profilado',
    performanceProfilingDesc: 'Konsiloj por identigi botelneck-ojn.',
    nextApiReference: 'Sekva: API Referenco →'
  },

  // Security page
  security: {
    title: '🔒 Sekureco',
    intro: 'Plej bonaj praktikoj por konstrui sekurajn Pulse aplikaĵojn.',
    xssPrevention: 'XSS Prevento',
    xssPreventionDesc: 'Cross-Site Scripting (XSS) estas unu el la plej oftaj retaj vundeblecoj.',
    safeByDefault: 'Sekura Defaŭlte: Teksta Enhavo',
    safeByDefaultDesc: 'La el() funkcio kun ĉenoj-infanoj aŭtomate eskapas HTML.',
    dangerousInnerHtml: 'Danĝera: innerHTML',
    dangerousInnerHtmlDesc: 'Neniam uzu innerHTML kun nefidinda enhavo.',
    safePatterns: 'Sekuraj Ŝablonoj por Dinamika Enhavo',
    urlSanitization: 'URL Sanigado',
    urlSanitizationDesc: 'Ĉiam sanigu uzant-provizitajn URL-ojn.',
    formSecurity: 'Formulara Sekureco',
    formSecurityDesc: 'Sekura traktado de formularaj datumoj.',
    inputValidation: 'Eniga Validigo',
    sensitiveData: 'Sentemaj Datumoj',
    csp: 'Content Security Policy',
    cspDesc: 'Rekomenditaj CSP kapoj por Pulse aplikaĵoj.',
    apiSecurity: 'API Sekureco',
    apiSecurityDesc: 'Sekuraj ŝablonoj por datuma prenado.',
    securityChecklist: 'Sekureca Kontrollisto',
    nextPerformance: 'Sekva: Efikeco-Gvidilo'
  },

  // Performance page
  performance: {
    title: '⚡ Efikeco',
    intro: 'Optimumigu viajn Pulse aplikaĵojn por maksimuma efikeco.',
    lazyComputed: 'Maldiligentaj Kalkulitaj Valoroj',
    lazyComputedDesc: 'Defaŭlte, kalkulitaj valoroj taksas tuj. Uzu maldiligenta taksado por multekostaj kalkuloj.',
    whenToUseLazy: 'Kiam Uzi Maldiligenta',
    listKeying: 'Listoŝlosilado',
    listKeyingDesc: 'Ĝusta ŝlosilado estas kritika por listo-efikeco.',
    goodVsBadKeys: 'Bonaj vs Malbonaj Ŝlosiloj',
    performanceImpact: 'Efikeco-Efiko',
    batchingUpdates: 'Ara Ĝisdatigo',
    batchingUpdatesDesc: 'Aru plurajn stato-ŝanĝojn por eviti mez-redesegnojn.',
    automaticBatching: 'Aŭtomata Arado',
    memoization: 'Memorigado',
    memoizationDesc: 'Kaŝmemoru multekostajn kalkulojn por eviti reduncan laboron.',
    lazyLoadingRoutes: 'Maldiligenta Ŝargado de Vojoj',
    lazyLoadingRoutesDesc: 'Dividu vian aplikaĵon en eroj ŝargitaj laŭ postulo.',
    avoidUnnecessaryReactivity: 'Evitu Malnecesajn Reagecon',
    avoidUnnecessaryReactivityDesc: 'Ne ĉio bezonas esti reaga.',
    effectOptimization: 'Efiko-Optimumigo',
    effectOptimizationDesc: 'Tenu efikojn rapidaj kaj fokusitaj.',
    resourceCaching: 'Rimeda Kaŝmemoro',
    resourceCachingDesc: 'Uzu la kaŝmemorajn funkciojn de la async modulo.',
    performanceMonitoring: 'Efikeco-Monitorado',
    performanceMonitoringDesc: 'Uzu la devtools modulon por monitori efikecon.',
    performanceChecklist: 'Efikeco-Kontrollisto',
    nextErrorHandling: 'Sekva: Erartraktado'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Erartraktado',
    intro: 'Firmaj erartraktaj strategioj por Pulse aplikaĵoj.',
    effectErrorHandling: 'Efiko-Erartraktado',
    effectErrorHandlingDesc: 'Efikoj povas malsukcesi. Traktu erarojn gracie.',
    perEffectHandler: 'Per-Efika Erartraktilo',
    globalEffectHandler: 'Tutmonda Efiko-Erartraktilo',
    asyncErrorHandling: 'Async Erartraktado',
    asyncErrorHandlingDesc: 'La async modulo provizas enkonstruitan erarstato-traktadon.',
    formValidation: 'Formulara Validigo-Eraroj',
    formValidationDesc: 'Traktu formularan validigon per la form modulo.',
    routerErrorHandling: 'Vojigilo-Erartraktado',
    routerErrorHandlingDesc: 'Traktu navigado-erarojn kaj 404 paĝojn.',
    userFeedback: 'Uzanta Respondo',
    userFeedbackDesc: 'Montru erarojn al uzantoj taŭge.',
    errorBoundaries: 'Erarlimoj',
    errorBoundariesDesc: 'Enfermu erarojn por malhelpi tutajn aplikaĵo-kraŝojn.',
    loggingErrors: 'Erarprotokolo',
    loggingErrorsDesc: 'Protokolu erarojn por sencimigado kaj monitorado.',
    errorChecklist: 'Erartraktado-Kontrollisto',
    nextMobile: 'Sekva: Poŝtelefona Evoluo'
  },

  // Mobile page
  mobile: {
    title: '📱 Poŝtelefona Evoluo',
    intro: 'Konstruu indiĝenajn poŝtelefonajn aplikaĵojn per Pulse.',
    gettingStarted: 'Komenci',
    gettingStartedDesc: 'Agordu vian poŝtelefonan evolumedion.',
    platformDetection: 'Platforma Detekto',
    platformDetectionDesc: 'Detektu la nunan platformon kaj adaptu konduton.',
    nativeStorage: 'Indiĝena Stokado',
    nativeStorageDesc: 'Persistema stokado kiu funkcias rete kaj indiĝene.',
    deviceInfo: 'Aparatinformoj',
    deviceInfoDesc: 'Aliru aparatinformojn kaj retstaton.',
    nativeUi: 'Indiĝena UI',
    nativeUiDesc: 'Aliru indiĝenajn UI elementojn kiel toastoj kaj vibrado.',
    appLifecycle: 'Aplikaĵa Vivciklo',
    appLifecycleDesc: 'Traktu paŭzon, rekomencadon, kaj malantaŭ-butonan eventojn.',
    buildingApps: 'Konstrui Aplikaĵojn',
    buildingAppsDesc: 'Konstruu kaj pakumu vian aplikaĵon por distribuado.',
    nextChangelog: 'Sekva: Ŝanĝoprotokolo'
  },

  // Changelog page
  changelog: {
    title: '📋 Ŝanĝoprotokolo'
  }
};
