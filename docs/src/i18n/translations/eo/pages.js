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
    pulses: 'Pulsoj (Reaga Stato)',
    pulsesDesc: 'Pulso estas reaga ujo kiu sciigas abonantojn kiam ĝia valoro ŝanĝiĝas.',
    effects: 'Efikoj',
    effectsDesc: 'Efikoj aŭtomate rulas kiam iliaj dependecoj ŝanĝiĝas.',
    cssSelectorSyntax: 'CSS Elektilo-Sintakso',
    cssSelectorSyntaxDesc: 'Kreu DOM elementojn uzante familiaran CSS elektilo-sintakson.',
    pulseFileSyntax: '.pulse Dosiera Sintakso',
    pulseFileSyntaxDesc: 'La .pulse DSL ofertas puran, deklaran manieron skribi komponentojn.',
    blocks: 'Blokoj',
    imports: 'Importoj',
    directives: 'Direktivoj',
    slots: 'Enmetiloj (Enhavo-Projekcio)',
    slotsDesc: 'Uzu enmetilojn por komponi komponentojn kun dinamika enhavo.',
    cssScoping: 'CSS Amplekso',
    cssScopingDesc: 'Stiloj en .pulse dosieroj estas aŭtomate ampleksitaj al la komponento.',
    advancedRouting: 'Altnivela Vojigado',
    advancedRoutingDesc: 'La Pulse vojigilo subtenas maldiligenta ŝargado, interware, kaj koda dividado.',
    lazyLoading: 'Maldiligenta Ŝargado',
    lazyLoadingDesc: 'Ŝargu vojajn komponentojn laŭpostule por redukti komencan pakaĵgrandon.',
    middleware: 'Interware',
    middlewareDesc: 'Koa-stila interware por fleksebla navigada kontrolo.',
    nextApiReference: 'Sekva: API Referenco →'
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
    viewDemo: 'Vidi Demonstron →',
    viewSource: 'Vidi Fontkodon',
    hmrDemo: {
      title: 'HMR Demonstro',
      desc: 'Varma Modula Anstataŭigo kun stato-konservado.',
      features: [
        'Stato konservita dum HMR',
        'Aŭtomata efiko-purigado',
        'Tema ŝanĝo',
        'Notoj-persisteco',
        'HMR ĝisdatiga kalkulilo'
      ]
    },
    blog: {
      title: '📰 Blogo',
      desc: 'Plena bloga aplikaĵo kun CRUD, kategorioj kaj serĉo.',
      features: [
        'CRUD operacioj',
        'Kategoria filtrado',
        'Serĉfunkcio',
        'Hela/malhela reĝimo',
        'Responiva dezajno'
      ]
    },
    todoApp: {
      title: '📝 Tasklisto',
      desc: 'Plena taskoj-aplikaĵo kun malhela reĝimo kaj persisteco.',
      features: [
        'Aldoni, redakti, forigi',
        'Filtri laŭ statuso',
        'Malhela reĝimo',
        'LocalStorage persisteco',
        'Progreso-spurado'
      ]
    },
    weatherApp: {
      title: '🌤️ Vetera Aplikaĵo',
      desc: 'Realtempo vetera aplikaĵo kun Open-Meteo API.',
      features: [
        'Urba serĉo',
        'Nunaj kondiĉoj',
        '7-taga prognozo',
        'Favoritaj urboj',
        '°C/°F ŝanĝo'
      ]
    },
    ecommerce: {
      title: '🛒 Reta Komerco',
      desc: 'Plena aĉetsperto kun ĉareto kaj eligo.',
      features: [
        'Produkta katalogo',
        'Serĉo kaj filtroj',
        'Aĉetĉareto',
        'Eligfluo',
        'LocalStorage persisteco'
      ]
    },
    chatApp: {
      title: '💬 Babila Aplikaĵo',
      desc: 'Realtempo mesaĝado kun ĉambroj kaj simulitaj uzantoj.',
      features: [
        'Pluraj ĉambroj',
        'Uzanta ĉeesto',
        'Simulitaj robotaj respondoj',
        'Emoji-elektilo',
        'Mesaĝa persisteco'
      ]
    },
    routerDemo: {
      title: '🧭 Vojigilo Demonstro',
      desc: 'SPA vojigado kun navigado, gardistoj kaj dinamikaj vojoj.',
      features: [
        'Vojaj parametroj',
        'Demandostringoj',
        'Voja gardistoj',
        'Aktiva ligila stilo',
        'Protektitaj vojoj'
      ]
    },
    storeDemo: {
      title: '📝 Stokejo Demonstro',
      desc: 'Tutmonda stato-administrado kun Pulse Stokejo-sistemo.',
      features: [
        'createStore kun persisteco',
        'Agoj kaj getters',
        'Malfari/Refari',
        'Modulaj stokeoj',
        'Logger kromaĵo'
      ]
    },
    dashboard: {
      title: '📊 Admin Panelo',
      desc: 'Plena admin-interfaco demonstranta ĉiujn funkciojn.',
      features: [
        'Auth kaj gardistoj',
        'Diagramoj, tabeloj, modaloj',
        'CRUD operacioj',
        'Temoj kaj agordoj',
        'Ĉiuj reagaj funkcioj'
      ]
    },
    runLocally: 'Ruli Ekzemplojn Loke',
    runLocallyDesc: 'Por ruli la ekzemplajn projektojn sur via maŝino:',
    createYourOwn: 'Kreu Vian Propran',
    createYourOwnDesc: 'Komenci novan Pulse projekton:',
    mobileExamples: '📱 Poŝtelefonaj Ekzemploj',
    mobileExamplesDesc: 'Pulse ankaŭ povas ruli sur poŝtelefonaj platformoj per WebView.'
  },

  // Playground page
  playground: {
    title: '🎮 Ludejo',
    intro: 'Provu Pulse en via retumilo. Redaktu la kodon kaj vidu la rezultojn tuj.',
    codeEditor: '📝 Koda Redaktilo',
    preview: '👁️ Antaŭvido',
    run: '▶ Ruli',
    reset: '↺ Restarigi',
    share: 'Kunhavigi',
    ready: 'Preta',
    running: 'Rulante...',
    success: '✓ Sukceso',
    errorPrefix: 'Eraro:',
    templates: '📋 Rapidaj Ŝablonoj',
    templateCounter: 'Kalkulilo',
    templateTodo: 'Tasklisto',
    templateTimer: 'Tempigilo',
    templateForm: 'Formularo',
    templateCalculator: 'Kalkulilo',
    templateTabs: 'Langetoj',
    templateTheme: 'Temo',
    templateSearch: 'Serĉo',
    templateCart: 'Ĉareto',
    templateAnimation: 'Animacio'
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
    checklist: 'Sekureca Kontrollisto',
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
    batching: 'Ara Ĝisdatigo',
    batchingDesc: 'Aru plurajn stato-ŝanĝojn por eviti mez-redesegnojn.',
    automaticBatching: 'Aŭtomata Arado',
    memoization: 'Memorigado',
    memoizationDesc: 'Kaŝmemoru multekostajn kalkulojn por eviti reduncan laboron.',
    lazyRoutes: 'Maldiligenta Ŝargado de Vojoj',
    lazyRoutesDesc: 'Dividu vian aplikaĵon en eroj ŝargitaj laŭ postulo.',
    avoidReactivity: 'Evitu Malnecesajn Reagecon',
    avoidReactivityDesc: 'Ne ĉio bezonas esti reaga.',
    effectOptimization: 'Efiko-Optimumigo',
    effectOptimizationDesc: 'Tenu efikojn rapidaj kaj fokusitaj.',
    resourceCaching: 'Rimeda Kaŝmemoro',
    resourceCachingDesc: 'Uzu la kaŝmemorajn funkciojn de la async modulo.',
    monitoring: 'Efikeco-Monitorado',
    monitoringDesc: 'Uzu la devtools modulon por monitori efikecon.',
    checklist: 'Efikeco-Kontrollisto',
    nextErrorHandling: 'Sekva: Erartraktado'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Erartraktado',
    intro: 'Firmaj erartraktaj strategioj por Pulse aplikaĵoj.',
    effectErrors: 'Efikaj Eraroj',
    asyncErrors: 'Async Eraroj',
    formErrors: 'Formularaj Eraroj',
    routerErrors: 'Vojigilo-Eraroj',
    boundaries: 'Erarlimoj',
    logging: 'Protokolado kaj Raportado',
    gracefulDegradation: 'Gracia Degradado',
    summary: 'Resumo',
    nextApiReference: 'Sekva: API Referenco →'
  },

  // HTTP page
  http: {
    title: '🌐 HTTP Kliento',
    intro: 'HTTP kliento sen dependecoj por API petoj. Bazita sur indiĝena fetch kun interceptoroj, reprovo, tempolimo kaj reaktiva integriĝo.',
    quickStart: 'Rapida Komenco',
    quickStartDesc: 'Importu kaj uzu la HTTP klienton:',
    configuration: 'Agordo',
    configurationDesc: 'Agordu defaŭltajn valorojn por ĉiuj petoj:',
    httpMethods: 'HTTP Metodoj',
    responseStructure: 'Responda Strukturo',
    interceptors: 'Interceptoroj',
    interceptorsDesc: 'Interceptoroj permesas transformi petojn kaj respondojn tutmonde.',
    requestInterceptors: 'Peto Interceptoroj',
    responseInterceptors: 'Respondo Interceptoroj',
    manageInterceptors: 'Administri Interceptorojn',
    errorHandling: 'Erartraktado',
    errorHandlingDesc: 'Ĉiuj eraroj estas envolvitaj en HttpError kun utilaj propraĵoj:',
    errorCodes: 'Erarkodoj',
    description: 'Priskribo',
    when: 'Kiam',
    errorTimeout: 'Tempolimo preterpasis',
    errorTimeoutWhen: 'Tempolimo finiĝis antaŭ respondo',
    errorNetwork: 'Reta eraro',
    errorNetworkWhen: 'Sen konekto aŭ servilo neatingebla',
    errorAbort: 'Peto nuligita',
    errorAbortWhen: 'AbortController.abort() vokita',
    errorHttp: 'HTTP Eraro',
    errorHttpWhen: 'Responda statuso ekster 2xx intervalo',
    errorParse: 'Analizado malsukcesis',
    errorParseWhen: 'JSON/blob analizada eraro',
    cancellation: 'Peto Nuligo',
    cancellationDesc: 'Nuligu petojn per AbortController:',
    retry: 'Reprova Agordo',
    retryDesc: 'Aŭtomate reprovi malsukcesintajn petojn:',
    reactiveIntegration: 'Reaktiva Integriĝo',
    reactiveIntegrationDesc: 'Integru HTTP petojn senjonte kun Pulse reaktiveco:',
    useHttpResourceDesc: 'Por kaŝmemoritaj rimedoj kun SWR ŝablono:',
    childInstances: 'Infanaj Instancoj',
    childInstancesDesc: 'Kreu specialigitajn klientojn kiuj heredas de gepatro:',
    fileUpload: 'Dosiera Alŝuto',
    urlParameters: 'URL Parametroj',
    fullExample: 'Kompleta Ekzemplo'
  },

  // Mobile page
  mobile: {
    title: '📱 Poŝtelefona Evoluo',
    intro: 'Konstruu indiĝenajn poŝtelefonajn aplikaĵojn per Pulse.',
    overview: 'Superrigardo',
    quickStart: 'Rapida Komenco',
    cliCommands: 'CLI Komandoj',
    configuration: 'Agordo',
    configurationDesc: 'La pulse.mobile.json dosiero agordas vian poŝtelefonan aplikaĵon.',
    nativeApis: 'Indiĝenaj API-oj',
    requirements: 'Postuloj',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Sekva: Ekzemploj →'
  },

  // Changelog page
  changelog: {
    title: '📋 Ŝanĝoprotokolo',
    intro: 'Lastaj ĝisdatigoj kaj plibonigoj de Pulse Framework.',
    version: 'Versio',
    releaseDate: 'Eldondato',
    changes: 'Ŝanĝoj',
    added: 'Aldonita',
    changed: 'Ŝanĝita',
    fixed: 'Riparita',
    removed: 'Forigita',
    deprecated: 'Malrekomendita',
    security: 'Sekureco',
    breaking: 'Rompa ŝanĝo',
    features: 'Funkcioj',
    bugFixes: 'Cimoriparoj',
    improvements: 'Plibonigoj',
    documentation: 'Dokumentado',
    performance: 'Efikeco',
    tests: 'Testoj'
  }
};
