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

  // Other pages
  debugging: {
    title: '🔍 Villuleit'
  },
  security: {
    title: '🔒 Öryggi'
  },
  performance: {
    title: '⚡ Afköst'
  },
  errorHandling: {
    title: '🛡️ Villumeðferð'
  },
  mobile: {
    title: '📱 Farsímaþróun'
  },
  changelog: {
    title: '📋 Breytingaskrá'
  }
};
