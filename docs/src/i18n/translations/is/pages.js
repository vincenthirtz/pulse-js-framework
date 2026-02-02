/**
 * Icelandic translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'Yfirlýsandi DOM rammi með CSS velja-byggt skipulag',
    features: {
      zeroDeps: '0️⃣ Engin Ósjálfstæði',
      uniqueSyntax: '🎯 Einstök Setningafræði',
      reactive: '⚡ Viðbragðsgeta',
      smallBundle: '📦 ~4kb kjarni',
      noBuild: '🔧 Enginn Smíði Nauðsynleg',
      mobile: '📱 Farsímaöpp'
    },
    getStarted: 'Byrja →',
    viewExamples: 'Skoða Dæmi',
    whatMakesUnique: 'Hvað gerir Pulse einstakt?',
    quickExample: 'Fljótlegt Dæmi',
    pulseSyntax: '.pulse setningafræði',
    jsEquivalent: 'JavaScript samsvarandi',
    comparison: {
      feature: 'Eiginleiki',
      uiStructure: 'UI Skipulag',
      cssSelectors: 'CSS Veljarar',
      reactivity: 'Viðbragðsgeta',
      pulses: 'Púlsar',
      buildStep: 'Smíðaskref',
      bundleSize: 'Bunka Stærð',
      dependencies: 'Ósjálfstæði',
      buildSpeed: 'Smíðahraði',
      learningCurve: 'Námskúrfa',
      fileExtension: 'Skráarending',
      mobileApps: 'Farsímaöpp',
      typescript: 'TypeScript',
      required: 'Nauðsynlegt',
      optional: 'Valfrjálst',
      many: 'Mörg',
      some: 'Sum',
      few: 'Fá',
      zero: 'Engin',
      slow: 'Hægt',
      medium: 'Miðlungs',
      fast: 'Hratt',
      instant: 'Samstundis',
      steep: 'Brött',
      moderate: 'Hófleg',
      easy: 'Auðvelt',
      minimal: 'Lágmarks',
      builtIn: 'Innbyggt'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Byrjun',
    installation: 'Uppsetning',
    installationDesc: 'Búðu til nýtt Pulse verkefni með einni skipun:',
    manualSetup: 'Handvirk Uppsetning',
    manualSetupDesc: 'Eða settu upp handvirkt í hvaða verkefni sem er:',
    thenImport: 'Síðan flytjið inn í JavaScript:',
    firstComponent: 'Fyrsti Íhluturinn Þinn',
    firstComponentDesc: 'Búðu til einfaldan viðbragðsteljara:',
    usingPulseFiles: 'Notkun .pulse Skráa',
    usingPulseFilesDesc: 'Fyrir hreinni setningafræði, notaðu <code>.pulse</code> skrár með Vite viðbótinni:',
    projectStructure: 'Verkefnisbygging',
    cliCommands: 'CLI Skipanir',
    cliCommandsDesc: 'Pulse veitir fullan CLI fyrir þróunarflæði:',
    development: 'Þróun',
    codeQuality: 'Kóðagæði',
    lintChecks: '<strong>Lint athuganir:</strong> óskilgreindar tilvísanir, ónotaðir innflutningar/stöður, nafngiftareglur, tómir blokkir, innflutningsröð.',
    formatRules: '<strong>Sniðreglur:</strong> 2 bila inndrátt, flokkaðir innflutningar, samræmdar slaufusviga, rétt bil.',
    analyzeOutput: '<strong>Greiningarúttak:</strong> skráarfjöldi, íhlutaflækjustig, innflutningsgraf, dauður kóði uppgötvun.',
    faq: 'Algengar Spurningar',
    faqBuildStep: {
      q: 'Þarf ég smíðaskref?',
      a: 'Nei! Pulse virkar beint í vafranum. Hins vegar, fyrir <code>.pulse</code> skrár og framleiðsluhagræðingu, mælum við með Vite með Pulse viðbótinni.'
    },
    faqComparison: {
      q: 'Hvernig ber Pulse saman við React/Vue?',
      a: 'Pulse er mun léttari (~4kb kjarni, ~12kb fullt vs 35-45kb) og notar púlsa (viðbragðsfrumefni) í stað sýndar DOM. Það hefur engin ósjálfstæði og valfrjálst smíðaskref. CSS velja setningafræðin er einstök fyrir Pulse.'
    },
    faqTypeScript: {
      q: 'Get ég notað TypeScript?',
      a: 'Já! Pulse inniheldur fullar TypeScript skilgreiningar. Flytjið bara inn tegundir frá <code>pulse-js-framework/runtime</code> og IDE þitt mun veita sjálfvirka útfyllingu.'
    },
    faqForms: {
      q: 'Hvernig meðhöndla ég eyðublöð?',
      a: 'Notaðu <code>model()</code> hjálpartólið fyrir tvíhliða bindingu:'
    },
    faqExisting: {
      q: 'Get ég notað Pulse með núverandi verkefnum?',
      a: 'Já! Pulse er hægt að setja upp á hvaða DOM einingu sem er. Notaðu <code>mount(\'#my-widget\', MyComponent())</code> til að fella Pulse íhluti inn hvar sem er.'
    },
    faqFetch: {
      q: 'Hvernig sæki ég gögn?',
      a: 'Notaðu staðlað <code>fetch()</code> með áhrifum:'
    },
    faqSSR: {
      q: 'Styður Pulse SSR?',
      a: 'Ekki ennþá, en það er á vegakorti. Eins og er er Pulse hagrætt fyrir biðlarahliðar SPA og farsímaöpp.'
    },
    faqDebug: {
      q: 'Hvernig kembi ég forritið mitt?',
      a: 'Pulse v1.4.9+ styður upprunakort fyrir <code>.pulse</code> skrár. Notaðu Logger API fyrir skipulagt úttak. Sjá Villuleitarleiðbeiningarnar fyrir meira.'
    },
    faqMobile: {
      q: 'Get ég byggt farsímaöpp?',
      a: 'Já! Notaðu <code>pulse mobile init</code> til að setja upp Android/iOS verkefni. Pulse inniheldur innfædda API fyrir geymslu, tækjaupplýsingar og fleira. Sjá Farsímaleiðbeiningarnar.'
    },
    faqHelp: {
      q: 'Hvar get ég fengið hjálp?',
      a: 'Opnaðu vandamál á GitHub eða skoðaðu Dæmin fyrir viðmiðunarútfærslur.'
    },
    nextCoreConcepts: 'Næst: Grunnhugtök →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Grunnhugtök',
    intro: 'Pulse er byggt á fjórum grunnhugtökum: Púlsar (viðbragðsástand), Áhrif (aukaverkanir), DOM hjálpar, og valfrjálsa .pulse DSL.',
    pulses: 'Púlsar (Viðbragðsástand)',
    pulsesDesc: 'Púls er viðbragðsílát sem tilkynnir áskrifendum þegar gildi hans breytist.',
    effects: 'Áhrif',
    effectsDesc: 'Áhrif keyra sjálfkrafa þegar ósjálfstæði þeirra breytist.',
    computed: 'Reiknuð Gildi',
    computedDesc: 'Afleidd gildi sem uppfærast sjálfkrafa.',
    domHelpers: 'DOM Hjálpar',
    domHelpersDesc: 'Búðu til DOM einingar með CSS velja setningafræði.',
    reactiveBindings: 'Viðbragðsbindingar',
    conditionalList: 'Skilyrt & Lista Birting',
    pulseDsl: '.pulse DSL',
    pulseDslDesc: 'Valfrjálsa DSL veitir hreinni setningafræði fyrir íhluti.'
  },

  // API Reference page
  apiReference: {
    title: '📖 API Tilvísun',
    searchPlaceholder: 'Leita í API...',
    filter: 'Sía:',
    typescriptSupport: 'TypeScript Stuðningur',
    typescriptSupportDesc: 'Pulse inniheldur fullkomnar TypeScript skilgreiningar fyrir IDE sjálfvirka útfyllingu.',
    reactivity: 'Viðbragðsgeta',
    reactivityDesc: 'Merkjamiðað viðbragðskerfi.',
    domSection: 'DOM',
    domSectionDesc: 'Hjálpar til að búa til og vinna með DOM.',
    routerSection: 'Leiðir',
    routerSectionDesc: 'SPA leiðir með hreiðruðum leiðum og vörðum.',
    storeSection: 'Geymsla',
    storeSectionDesc: 'Alhliða stöðustjórnun.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Heit Einingaskipti.',
    resultsFound: 'niðurstaða/niðurstöður fundust',
    noResults: 'Engar niðurstöður fundust',
    nextMobile: 'Næst: Farsímaöpp →',
    categories: {
      all: 'Allt',
      types: 'Tegundir',
      reactivity: 'Viðbragðsgeta',
      dom: 'DOM',
      router: 'Leiðir',
      store: 'Geymsla',
      hmr: 'HMR'
    }
  },

  // Examples page
  examples: {
    title: '✨ Dæmi',
    intro: 'Kannaðu þessi sýnishorn til að sjá Pulse í verki.',
    todoApp: 'Verkefnalisti',
    todoDesc: 'Klassískur verkefnalisti með staðbundinni geymslu.',
    chatApp: 'Spjallforrit',
    chatDesc: 'Rauntíma spjallviðmót með skilaboðasögu.',
    ecommerce: 'Netverslun',
    ecommerceDesc: 'Vörulisti með körfu og útskráningu.',
    weather: 'Veðurforrit',
    weatherDesc: 'Veðurstjórnborð með API samþættingu.',
    viewDemo: 'Skoða Kynningu',
    viewSource: 'Skoða Kóða'
  },

  // Playground page
  playground: {
    title: '🎮 Leikvöllur',
    intro: 'Prófaðu Pulse í vafranum þínum. Breyttu kóðanum og sjáðu niðurstöðurnar samstundis.',
    run: 'Keyra',
    reset: 'Endurstilla',
    share: 'Deila'
  },

  // Debugging page
  debugging: {
    title: '🔍 Villuleit',
    intro: 'Verkfæri og tækni til að kemba Pulse forrit.',
    sourceMaps: 'Upprunakort',
    sourceMapsDesc: 'Pulse v1.4.9+ býr til V3 upprunakort fyrir þýddar .pulse skrár.',
    enablingSourceMaps: 'Virkja Upprunakort',
    viteIntegration: 'Vite Samþætting',
    viteIntegrationDesc: 'Vite viðbótin býr sjálfkrafa til upprunakort í þróunarham.',
    usingSourceMaps: 'Nota Upprunakort í DevTools',
    usingSourceMapsSteps: [
      'Opnaðu Chrome/Firefox DevTools (F12)',
      'Farðu í Sources flipann',
      'Finndu .pulse skrárnar þínar í trénu',
      'Settu brotpunkta á upprunalegu línurnar',
      'Villustaflur munu sýna upprunalegar línunúmer'
    ],
    loggerApi: 'Logger API',
    loggerApiDesc: 'Notaðu innbyggða loggerinn fyrir skipulegt kembingarúttak.',
    logLevels: 'Log Stig',
    reactivityDebugging: 'Viðbragðskembing',
    reactivityDebuggingDesc: 'Tækni til að kemba viðbragðsástand og áhrif.',
    trackingDependencies: 'Rekja Ósjálfstæði',
    debuggingComputed: 'Kemba Reiknuð Gildi',
    batchDebugging: 'Runu Kembing',
    routerDebugging: 'Leiðir Kembing',
    routerDebuggingDesc: 'Kemba siglingu og leiðarpörun.',
    hmrDebugging: 'HMR Kembing',
    hmrDebuggingDesc: 'Kemba Heit Einingaskipti vandamál.',
    commonErrors: 'Algengar Villur',
    performanceProfiling: 'Afkastasniðgreining',
    performanceProfilingDesc: 'Ábendingar til að greina flöskuhálsa.',
    nextApiReference: 'Næst: API Tilvísun →'
  },

  // Security page
  security: {
    title: '🔒 Öryggi',
    intro: 'Bestu venjur til að byggja örugg Pulse forrit.',
    xssPrevention: 'XSS Varnir',
    xssPreventionDesc: 'Cross-Site Scripting (XSS) er ein algengasta vef varnarleysið.',
    safeByDefault: 'Öruggt Sjálfgefið: Textainnihald',
    safeByDefaultDesc: 'el() fallið með strengjabörmum flýjar HTML sjálfkrafa.',
    dangerousInnerHtml: 'Hættulegt: innerHTML',
    dangerousInnerHtmlDesc: 'Notaðu aldrei innerHTML með ótraustu efni.',
    safePatterns: 'Örugg Mynstur fyrir Kvikt Efni',
    urlSanitization: 'URL Hreinsun',
    urlSanitizationDesc: 'Hreinsaðu alltaf URL sem notandi gefur upp.',
    formSecurity: 'Eyðublað Öryggi',
    formSecurityDesc: 'Örugg meðhöndlun eyðublaðsgagna.',
    inputValidation: 'Inntaks Staðfesting',
    sensitiveData: 'Viðkvæm Gögn',
    csp: 'Content Security Policy',
    cspDesc: 'Ráðlagðir CSP hausar fyrir Pulse forrit.',
    apiSecurity: 'API Öryggi',
    apiSecurityDesc: 'Örugg mynstur fyrir gagnasækni.',
    securityChecklist: 'Öryggisgátlisti',
    nextPerformance: 'Næst: Afkastaleiðbeiningar'
  },

  // Performance page
  performance: {
    title: '⚡ Afköst',
    intro: 'Hagræðið Pulse forritin þín fyrir hámarksafköst.',
    lazyComputed: 'Latur Reiknuð Gildi',
    lazyComputedDesc: 'Sjálfgefið er að reiknuð gildi eru metin strax. Notaðu lata mat fyrir dýra útreikninga.',
    whenToUseLazy: 'Hvenær Nota Latur',
    listKeying: 'Listalyklun',
    listKeyingDesc: 'Rétt lyklun er mikilvæg fyrir listaafköst.',
    goodVsBadKeys: 'Góðir vs Slæmir Lyklar',
    performanceImpact: 'Afkastaáhrif',
    batchingUpdates: 'Runuuppfærslur',
    batchingUpdatesDesc: 'Runaðu margar stöðubreytingar til að forðast millibilsendurteiknun.',
    automaticBatching: 'Sjálfvirk Runun',
    memoization: 'Minnislagning',
    memoizationDesc: 'Skyndiminndu dýra útreikninga til að forðast ofaukna vinnu.',
    lazyLoadingRoutes: 'Latur Hleðsla Leiða',
    lazyLoadingRoutesDesc: 'Skiptu forritinu þínu í hluta sem hlaðast eftir þörfum.',
    avoidUnnecessaryReactivity: 'Forðist Óþarfa Viðbragð',
    avoidUnnecessaryReactivityDesc: 'Ekki þarf allt að vera viðbragðsþolið.',
    effectOptimization: 'Áhrifabæting',
    effectOptimizationDesc: 'Haltu áhrifum hröðum og einbeittum.',
    resourceCaching: 'Auðlinda Skyndiminni',
    resourceCachingDesc: 'Notaðu skyndiminniseiginleika async einingarinnar.',
    performanceMonitoring: 'Afkastamælingar',
    performanceMonitoringDesc: 'Notaðu devtools eininguna til að fylgjast með afköstum.',
    performanceChecklist: 'Afkastagátlisti',
    nextErrorHandling: 'Næst: Villumeðferð'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Villumeðferð',
    intro: 'Traustir villumeðferðaraðferðir fyrir Pulse forrit.',
    effectErrorHandling: 'Áhrifa Villumeðferð',
    effectErrorHandlingDesc: 'Áhrif geta bilað. Meðhöndlaðu villur fallega.',
    perEffectHandler: 'Villumeðferðari Eftir Áhrifum',
    globalEffectHandler: 'Alhliða Áhrifavillumeðferðari',
    asyncErrorHandling: 'Async Villumeðferð',
    asyncErrorHandlingDesc: 'Async einingin veitir innbyggða villustöðumeðferð.',
    formValidation: 'Eyðublað Staðfestingarvillur',
    formValidationDesc: 'Meðhöndlaðu eyðublaðsstaðfestingu með form einingunni.',
    routerErrorHandling: 'Leiðarvillumeðferð',
    routerErrorHandlingDesc: 'Meðhöndlaðu siglingavillur og 404 síður.',
    userFeedback: 'Notendaviðbrögð',
    userFeedbackDesc: 'Sýndu notendum villur á viðeigandi hátt.',
    errorBoundaries: 'Villumörk',
    errorBoundariesDesc: 'Takmarkaðu villur til að koma í veg fyrir hrun alls forritsins.',
    loggingErrors: 'Villuskráning',
    loggingErrorsDesc: 'Skráðu villur fyrir kemb ingu og eftirlit.',
    errorChecklist: 'Villumeðferðargátlisti',
    nextMobile: 'Næst: Farsímaþróun'
  },

  // Mobile page
  mobile: {
    title: '📱 Farsímaþróun',
    intro: 'Byggðu innfædd farsímaforrit með Pulse.',
    gettingStarted: 'Byrjun',
    gettingStartedDesc: 'Settu upp farsímaþróunarumhverfið þitt.',
    platformDetection: 'Pallgreining',
    platformDetectionDesc: 'Greindu núverandi pall og aðlagaðu hegðun.',
    nativeStorage: 'Innfædd Geymsla',
    nativeStorageDesc: 'Varanleg geymsla sem virkar á vef og innfædd.',
    deviceInfo: 'Tækjaupplýsingar',
    deviceInfoDesc: 'Fáðu aðgang að tækjaupplýsingum og netstöðu.',
    nativeUi: 'Innfædd UI',
    nativeUiDesc: 'Fáðu aðgang að innfæddum UI einingum eins og skoppskilaboðum og titringi.',
    appLifecycle: 'App Líftími',
    appLifecycleDesc: 'Meðhöndlaðu hlé, endurupptöku og bakhnappa atburði.',
    buildingApps: 'Byggja Forrit',
    buildingAppsDesc: 'Byggðu og pakkaðu forritinu þínu til dreifingar.',
    nextChangelog: 'Næst: Breytingaskrá'
  },

  // Changelog page
  changelog: {
    title: '📋 Breytingaskrá'
  }
};
