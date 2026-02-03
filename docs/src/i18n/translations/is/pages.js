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
    stats: {
      gzipped: 'Þjappað',
      dependencies: 'Ósjálfstæði',
      buildTime: 'Smíðatími',
      a11yBuiltIn: 'A11y innbyggt'
    },
    quickStart: {
      title: 'Fljótleg Byrjun',
      desc: 'Byrjaðu á sekúndum með einni skipun.',
      terminal: 'Skipanalína',
      copy: 'Afrita',
      copied: 'Afritað!',
      createProject: 'Búa til nýtt verkefni',
      navigate: 'Fara þangað',
      startDev: 'Ræsa þróunarþjón'
    },
    whyPulse: {
      title: 'Af hverju velja Pulse?',
      performance: {
        title: 'Afköst',
        desc: 'Fínkornuð viðbragðsgeta með lágmarks umfang. Enginn sýndar-DOM samanburður.'
      },
      simplicity: {
        title: 'Einfaldleiki',
        desc: 'Leiðandi CSS veljarasetningafræði. Skrifaðu minna kóða, náðu meira.'
      },
      accessibility: {
        title: 'Aðgengi',
        desc: 'Innbyggðir a11y hjálparar, sjálfvirk ARIA eigindi og úttektarverkfæri.'
      },
      mobile: {
        title: 'Tilbúið fyrir farsíma',
        desc: 'Innfæddur farsímabrú innifalin. Byggðu iOS og Android öpp beint.'
      },
      noBuild: {
        title: 'Enginn Smíði Nauðsynleg',
        desc: 'Virkar beint í vafranum. Valfrjálst smíðaskref fyrir hagræðingu.'
      },
      security: {
        title: 'Öryggi fyrst',
        desc: 'XSS vörn, URL hreinsun og vörn gegn prototype mengun innbyggð.'
      }
    },
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
      builtIn: 'Innbyggt',
      accessibility: 'Aðgengi',
      thirdParty: 'Þriðji aðili'
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
    pulses: 'Púlsar (Viðbragðsástand)',
    pulsesDesc: 'Púls er viðbragðsílát sem tilkynnir áskrifendum þegar gildi hans breytist.',
    effects: 'Áhrif',
    effectsDesc: 'Áhrif keyra sjálfkrafa þegar ósjálfstæði þeirra breytist.',
    cssSelectorSyntax: 'CSS Velja Setningafræði',
    cssSelectorSyntaxDesc: 'Búðu til DOM einingar með kunnuglegri CSS velja setningafræði.',
    pulseFileSyntax: '.pulse Skráasetningafræði',
    pulseFileSyntaxDesc: '.pulse DSL býður upp á hreint, yfirlýsandi leið til að skrifa íhluti.',
    blocks: 'Blokkir',
    imports: 'Innflutningur',
    directives: 'Tilskipanir',
    slots: 'Rifur (Efnisvarpa)',
    slotsDesc: 'Notaðu rifur til að setja saman íhluti með kviku efni.',
    cssScoping: 'CSS Umfang',
    cssScopingDesc: 'Stílar í .pulse skrám eru sjálfkrafa umfangsbundnir við íhlutinn.',
    advancedRouting: 'Ítarleg Leiðing',
    advancedRoutingDesc: 'Pulse leiðirinn styður lata hleðslu, milliliði og kóðaskiptingu.',
    lazyLoading: 'Lat Hleðsla',
    lazyLoadingDesc: 'Hlaðaðu leiðaríhlutum eftir þörfum til að minnka upphaflega bunka stærð.',
    middleware: 'Milliliðir',
    middlewareDesc: 'Koa-stíl milliliðir fyrir sveigjanlega siglinga stjórn.',
    nextApiReference: 'Næst: API Tilvísun →'
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
    viewDemo: 'Skoða Kynningu →',
    viewSource: 'Skoða Kóða',
    hmrDemo: {
      title: 'HMR Kynning',
      desc: 'Heit einingaskipti með ástandsvarðveislu.',
      features: [
        'Ástand varðveitt í HMR',
        'Sjálfvirk áhrifahreinsun',
        'Þemaskipti',
        'Minnisvarðveisla',
        'HMR uppfærsluteljarari'
      ]
    },
    blog: {
      title: '📰 Blogg',
      desc: 'Fullkomin bloggforrit með CRUD, flokkum og leit.',
      features: [
        'CRUD aðgerðir',
        'Flokkasíun',
        'Leitaraðgerð',
        'Ljós/dökkur hamur',
        'Móttækileg hönnun'
      ]
    },
    todoApp: {
      title: '📝 Verkefnaforrit',
      desc: 'Fullkomið verkefnaforrit með dökkum ham og varðveislu.',
      features: [
        'Bæta við, breyta, eyða',
        'Sía eftir stöðu',
        'Dökkur hamur',
        'LocalStorage varðveisla',
        'Framvindueftirlit'
      ]
    },
    weatherApp: {
      title: '🌤️ Veðurforrit',
      desc: 'Rauntíma veðurforrit með Open-Meteo API.',
      features: [
        'Borgarleit',
        'Núverandi aðstæður',
        '7 daga spá',
        'Uppáhaldsborgar',
        '°C/°F skipti'
      ]
    },
    ecommerce: {
      title: '🛒 Netverslun',
      desc: 'Full verslunarupplifun með körfu og útskráningu.',
      features: [
        'Vörulisti',
        'Leit og síur',
        'Innkaupakerra',
        'Útskráningarflæði',
        'LocalStorage varðveisla'
      ]
    },
    chatApp: {
      title: '💬 Spjallforrit',
      desc: 'Rauntíma skilaboð með herbergjum og eftirlíkingum notenda.',
      features: [
        'Mörg herbergi',
        'Notandanávist',
        'Eftirlíking vélmennasvara',
        'Emoji valinn',
        'Skilaboðavarðveisla'
      ]
    },
    routerDemo: {
      title: '🧭 Leiðarkynning',
      desc: 'SPA leiðing með siglingu, vörðum og kraftmiklum leiðum.',
      features: [
        'Leiðarfæribreytur',
        'Fyrirspurnarstrengir',
        'Leiðarverðir',
        'Virkur tengistíll',
        'Verndaðar leiðir'
      ]
    },
    storeDemo: {
      title: '📝 Geymslukynning',
      desc: 'Alhliða stöðustjórnun með Pulse geymslukerfi.',
      features: [
        'createStore með varðveislu',
        'Aðgerðir og getters',
        'Afturkalla/Endurgera',
        'Einingar geymslur',
        'Logger viðbót'
      ]
    },
    dashboard: {
      title: '📊 Stjórnborð',
      desc: 'Fullkomið stjórnviðmót sem sýnir allar aðgerðir.',
      features: [
        'Auðkenning og verðir',
        'Línurit, töflur, gluggar',
        'CRUD aðgerðir',
        'Þemu og stillingar',
        'Allar viðbragðsaðgerðir'
      ]
    },
    sportsNews: {
      title: '⚽ Íþróttafréttir',
      desc: 'Fréttaforrit með HTTP biðlara og viðbragðsgagnasókn.',
      features: [
        'HTTP biðlara samþætting',
        'Flokkunarsíun',
        'Leit með debounce',
        'Uppáhaldskerfi',
        'Dökkur hamur'
      ]
    },
    runLocally: 'Keyra Dæmi Staðbundið',
    runLocallyDesc: 'Til að keyra sýnishornaverkefni á vélinni þinni:',
    createYourOwn: 'Búðu Til Þitt Eigið',
    createYourOwnDesc: 'Byrjaðu nýtt Pulse verkefni:',
    mobileExamples: '📱 Farsímadæmi',
    mobileExamplesDesc: 'Pulse getur einnig keyrt á farsímapöllum gegnum WebView.'
  },

  // Playground page
  playground: {
    title: '🎮 Leikvöllur',
    intro: 'Prófaðu Pulse í vafranum þínum. Breyttu kóðanum og sjáðu niðurstöðurnar samstundis.',
    codeEditor: '📝 Kóðaritill',
    preview: '👁️ Forskoðun',
    run: '▶ Keyra',
    reset: '↺ Endurstilla',
    share: 'Deila',
    ready: 'Tilbúið',
    running: 'Keyrir...',
    success: '✓ Tókst',
    errorPrefix: 'Villa:',
    templates: '📋 Snögg Sniðmát',
    templateCounter: 'Teljari',
    templateTodo: 'Verkefnalisti',
    templateTimer: 'Tímamælir',
    templateForm: 'Eyðublað',
    templateCalculator: 'Reiknivél',
    templateTabs: 'Flipar',
    templateTheme: 'Þema',
    templateSearch: 'Leit',
    templateCart: 'Karfa',
    templateAnimation: 'Hreyfimynd'
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
    checklist: 'Öryggisgátlisti',
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
    batching: 'Runuuppfærslur',
    batchingDesc: 'Runaðu margar stöðubreytingar til að forðast millibilsendurteiknun.',
    automaticBatching: 'Sjálfvirk Runun',
    memoization: 'Minnislagning',
    memoizationDesc: 'Skyndiminndu dýra útreikninga til að forðast ofaukna vinnu.',
    lazyRoutes: 'Latur Hleðsla Leiða',
    lazyRoutesDesc: 'Skiptu forritinu þínu í hluta sem hlaðast eftir þörfum.',
    avoidReactivity: 'Forðist Óþarfa Viðbragð',
    avoidReactivityDesc: 'Ekki þarf allt að vera viðbragðsþolið.',
    effectOptimization: 'Áhrifabæting',
    effectOptimizationDesc: 'Haltu áhrifum hröðum og einbeittum.',
    resourceCaching: 'Auðlinda Skyndiminni',
    resourceCachingDesc: 'Notaðu skyndiminniseiginleika async einingarinnar.',
    monitoring: 'Afkastamælingar',
    monitoringDesc: 'Notaðu devtools eininguna til að fylgjast með afköstum.',
    checklist: 'Afkastagátlisti',
    nextErrorHandling: 'Næst: Villumeðferð'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Villumeðferð',
    intro: 'Traustir villumeðferðaraðferðir fyrir Pulse forrit.',
    effectErrors: 'Áhrifavillur',
    asyncErrors: 'Async Villur',
    formErrors: 'Eyðublaðsvillur',
    routerErrors: 'Leiðavillur',
    boundaries: 'Villumörk',
    logging: 'Skráning og Skýrslur',
    gracefulDegradation: 'Þokkafull Niðurfelling',
    summary: 'Samantekt',
    nextApiReference: 'Næst: API Tilvísun →'
  },

  // HTTP page
  http: {
    title: '🌐 HTTP Viðskiptavinur',
    intro: 'HTTP viðskiptavinur án háða fyrir API beiðnir. Byggður á innfæddu fetch með interceptorum, retry, timeout og reaktífri samþættingu.',
    quickStart: 'Skyndibyrjun',
    quickStartDesc: 'Flytja inn og nota HTTP viðskiptavininn:',
    configuration: 'Uppsetning',
    configurationDesc: 'Stilltu sjálfgefin gildi fyrir allar beiðnir:',
    httpMethods: 'HTTP Aðferðir',
    responseStructure: 'Svarsuppbygging',
    interceptors: 'Interceptorar',
    interceptorsDesc: 'Interceptorar leyfa þér að umbreyta beiðnum og svörum á alþjóðlegum vísu.',
    requestInterceptors: 'Beiðni Interceptorar',
    responseInterceptors: 'Svar Interceptorar',
    manageInterceptors: 'Stjórna Interceptorum',
    errorHandling: 'Villustjórnun',
    errorHandlingDesc: 'Allar villur eru vafðar í HttpError með gagnlegum eiginleikum:',
    errorCodes: 'Villukóðar',
    description: 'Lýsing',
    when: 'Hvenær',
    errorTimeout: 'Tímamörk liðin',
    errorTimeoutWhen: 'Tímamörk runnu út fyrir svar',
    errorNetwork: 'Netvilla',
    errorNetworkWhen: 'Engin tenging eða þjónn óaðgengilegur',
    errorAbort: 'Beiðni hætt',
    errorAbortWhen: 'AbortController.abort() kallað',
    errorHttp: 'HTTP Villa',
    errorHttpWhen: 'Svarsstaða ekki á 2xx bili',
    errorParse: 'Þáttun mistókst',
    errorParseWhen: 'JSON/blob þáttunarvilla',
    cancellation: 'Beiðni Afpöntun',
    cancellationDesc: 'Hætta við beiðnir með AbortController:',
    retry: 'Retry Uppsetning',
    retryDesc: 'Reyna aftur misheppnaðar beiðnir sjálfkrafa:',
    reactiveIntegration: 'Reaktíf Samþætting',
    reactiveIntegrationDesc: 'Samþættu HTTP beiðnir hnökralaust við Pulse reaktívitet:',
    useHttpResourceDesc: 'Fyrir skyndiminni auðlindir með SWR mynstri:',
    childInstances: 'Barnatilvik',
    childInstancesDesc: 'Búðu til sérhæfða viðskiptavini sem erfa frá foreldri:',
    fileUpload: 'Skráarinnlit',
    urlParameters: 'URL Færibreytur',
    fullExample: 'Heildaræmi'
  },

  // Accessibility page
  accessibility: {
    title: '♿ Aðgengi',
    intro: 'Pulse er hannað með aðgengi sem kjarnaeiginleika og veitir margar lög af a11y stuðningi.',
    nextSecurity: 'Næst: Öryggisleiðbeiningar →'
  },

  // Mobile page
  mobile: {
    title: '📱 Farsímaþróun',
    intro: 'Byggðu innfædd farsímaforrit með Pulse.',
    overview: 'Yfirlit',
    quickStart: 'Skyndibyrjun',
    cliCommands: 'CLI Skipanir',
    configuration: 'Uppsetning',
    configurationDesc: 'pulse.mobile.json skráin stillir farsímaforritið þitt.',
    nativeApis: 'Innfædd API',
    requirements: 'Kröfur',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Næst: Dæmi →'
  },

  // Migration from React page
  migrationReact: {
    title: '⚛️ Flutningur frá React',
    intro: 'Kemur þú frá React? Þessi leiðarvísir hjálpar þér að skilja lykilmuninn og flytja hugmyndalíkanið þitt yfir í Pulse.',
    quickComparison: 'Fljótlegur samanburður',
    quickComparisonDesc: 'Hér er hvernig React og Pulse bera saman í fljótu bragði:',
    stateManagement: 'Stöðustjórnun',
    stateManagementDesc: 'React notar useState króka, á meðan Pulse notar viðbragðsmerki kölluð "púlsar".',
    effects: 'Áhrif og hliðaráhrif',
    effectsDesc: 'Báðir rammar nota áhrif, en Pulse rekur ósjálfstæði sjálfkrafa.',
    computed: 'Reiknuð gildi',
    computedDesc: 'useMemo í React verður computed() í Pulse með sjálfvirkri ósjálfstæðisrakningu.',
    components: 'Íhlutir',
    componentsDesc: 'React notar JSX íhluti, Pulse notar einfaldar JavaScript aðgerðir sem skila DOM einingum.',
    conditionalRendering: 'Skilyrt teikning',
    conditionalRenderingDesc: 'React notar þrískiptan virka og &&, Pulse býður when() hjálpartólið.',
    lists: 'Listateikning',
    listsDesc: 'React notar map(), Pulse býður list() með sjálfvirkri lyklun.',
    forms: 'Eyðublaðsmeðferð',
    formsDesc: 'Pulse býður innbyggða eyðublaðsstaðfestingu með useForm().',
    globalState: 'Alhliða staða',
    globalStateDesc: 'React notar Context + useContext, Pulse notar createStore() með innbyggðri varðveislu.',
    routing: 'Leiðing',
    routingDesc: 'Báðir hafa svipuð leiðingar API, en Pulse hefur sitt innbyggt án viðbótarósjálfstæðis.',
    cheatSheet: 'Svindlblað',
    cheatSheetDesc: 'Flýtitilvísun fyrir algeng mynstur:',
    notes: 'Athugasemdir',
    cheatState: 'Búa til viðbragðsstöðu',
    cheatSet: 'Setja stöðu beint',
    cheatUpdate: 'Virkniuppfærsla',
    cheatEffect: 'Sjálfvirk ósjálfstæðisrakning',
    cheatComputed: 'Skyndiminnt afleidd gildi',
    cheatElement: 'CSS veljarasetningafræði',
    cheatList: 'Með lyklaðgerð',
    cheatWhen: 'Skilyrt teikning',
    cheatContext: 'Alhliða geymslaaðgangur',
    cheatRef: 'Bein DOM tilvísun',
    stepByStep: 'Skref-fyrir-skref flutningur',
    stepByStepDesc: 'Fylgdu þessum skrefum til að flytja React forritið þitt yfir í Pulse:',
    step1Title: 'Setja upp Pulse',
    step1Desc: 'Bættu Pulse við verkefnið þitt samhliða React.',
    step2Title: 'Byrja með laufíhluti',
    step2Desc: 'Byrjaðu að flytja litla, sjálfstæða íhluti fyrst. Þeir eru auðveldari að umbreyta og prófa.',
    step3Title: 'Umbreyta stöðustjórnun',
    step3Desc: 'Skiptu út useState fyrir pulse() og useEffect fyrir effect(). Mundu: engin ósjálfstæðisfylki nauðsynleg!',
    step4Title: 'Flytja foreldraíhluti',
    step4Desc: 'Þegar barnaíhlutir eru umbreyttir, vinndu þig upp að foreldraíhlutunum.',
    step5Title: 'Fjarlægja React',
    step5Desc: 'Þegar allir íhlutir eru fluttir, fjarlægðu React ósjálfstæði og njóttu minni bunkans þíns!',
    gotchas: 'Algeng mistök',
    gotcha1Title: 'Ekki nota get() fyrir uppfærslur',
    gotcha1Desc: 'Notaðu update() fyrir virknuppfærslur til að forðast keppnisaðstæður.',
    gotcha2Title: 'Notaðu get() í áhrifum, ekki peek()',
    gotcha2Desc: 'peek() les án rakningar - notaðu get() til að búa til ósjálfstæði.',
    gotcha3Title: 'Ekki breyta fylkjum/hlutum',
    gotcha3Desc: 'Búðu alltaf til nýjar tilvísanir þegar þú uppfærir söfn.',
    needHelp: 'Þarft hjálp?',
    needHelpDesc: 'Ertu með spurningar um flutninginn? Við erum hér til að hjálpa!',
    discussions: 'GitHub Discussions',
    issues: 'Tilkynna vandamál',
    getStarted: 'Byrja með Pulse',
    viewExamples: 'Skoða dæmi',
    tip: 'Ábending',
    stateTip: 'Ólíkt useState, skilar pulse() einum hlut með get(), set(), og update() aðferðum.',
    effectTip: 'Engin ósjálfstæðisfylki! Pulse rekur sjálfkrafa hvaða púlsar eru lesnir í áhrifum.',
    storeTip: 'Pulse geymslur eru einfaldari - engir veitendur nauðsynlegir, bara flytja inn og nota hvar sem er.'
  },

  // Changelog page
  changelog: {
    title: '📋 Breytingaskrá',
    intro: 'Nýlegar uppfærslur og endurbætur á Pulse Framework.',
    version: 'Útgáfa',
    releaseDate: 'Útgáfudagur',
    changes: 'Breytingar',
    added: 'Bætt við',
    changed: 'Breytt',
    fixed: 'Lagað',
    removed: 'Fjarlægt',
    deprecated: 'Úrelt',
    security: 'Öryggi',
    breaking: 'Mikilvæg breyting',
    features: 'Eiginleikar',
    bugFixes: 'Villuleiðréttingar',
    improvements: 'Endurbætur',
    documentation: 'Skjölun',
    performance: 'Afköst',
    tests: 'Prófanir'
  }
};
