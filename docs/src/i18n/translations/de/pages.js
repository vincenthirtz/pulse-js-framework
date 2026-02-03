/**
 * German translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'Ein deklaratives DOM-Framework basierend auf CSS-Selektoren',
    features: {
      zeroDeps: '0️⃣ Keine Abhängigkeiten',
      uniqueSyntax: '🎯 Einzigartige Syntax',
      reactive: '⚡ Reaktiv',
      smallBundle: '📦 ~4kb Kern',
      noBuild: '🔧 Kein Build erforderlich',
      mobile: '📱 Mobile Apps'
    },
    getStarted: 'Loslegen →',
    viewExamples: 'Beispiele ansehen',
    whatMakesUnique: 'Was macht Pulse einzigartig?',
    quickExample: 'Schnelles Beispiel',
    pulseSyntax: '.pulse Syntax',
    jsEquivalent: 'JavaScript-Äquivalent',
    comparison: {
      feature: 'Funktion',
      uiStructure: 'UI-Struktur',
      reactivity: 'Reaktivität',
      buildStep: 'Build-Schritt',
      bundleSize: 'Bundle-Größe',
      dependencies: 'Abhängigkeiten',
      buildSpeed: 'Build-Geschwindigkeit',
      learningCurve: 'Lernkurve',
      fileExtension: 'Dateierweiterung',
      mobileApps: 'Mobile Apps',
      typescript: 'TypeScript',
      cssSelectors: 'CSS-Selektoren',
      pulses: 'Pulses',
      required: 'Erforderlich',
      optional: 'Optional',
      many: 'Viele',
      some: 'Einige',
      few: 'Wenige',
      zero: 'Keine',
      slow: 'Langsam',
      medium: 'Mittel',
      fast: 'Schnell',
      instant: 'Sofort',
      steep: 'Steil',
      moderate: 'Moderat',
      easy: 'Einfach',
      minimal: 'Minimal',
      builtIn: 'Integriert',
      accessibility: 'Barrierefreiheit',
      thirdParty: 'Drittanbieter'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Erste Schritte',
    installation: 'Installation',
    installationDesc: 'Erstellen Sie ein neues Pulse-Projekt mit einem einzigen Befehl:',
    manualSetup: 'Manuelle Einrichtung',
    manualSetupDesc: 'Oder richten Sie manuell in einem beliebigen Projekt ein:',
    thenImport: 'Dann importieren Sie in Ihrem JavaScript:',
    firstComponent: 'Ihre erste Komponente',
    firstComponentDesc: 'Erstellen Sie einen einfachen reaktiven Zähler:',
    usingPulseFiles: '.pulse-Dateien verwenden',
    usingPulseFilesDesc: 'Für eine sauberere Syntax verwenden Sie <code>.pulse</code>-Dateien mit dem Vite-Plugin:',
    projectStructure: 'Projektstruktur',
    cliCommands: 'CLI-Befehle',
    cliCommandsDesc: 'Pulse bietet ein vollständiges CLI für den Entwicklungsworkflow:',
    development: 'Entwicklung',
    codeQuality: 'Codequalität',
    lintChecks: '<strong>Lint-Prüfungen:</strong> undefinierte Referenzen, ungenutzte Imports/Zustände, Namenskonventionen, leere Blöcke, Import-Reihenfolge.',
    formatRules: '<strong>Format-Regeln:</strong> 2-Leerzeichen-Einrückung, sortierte Imports, konsistente Klammern, korrekter Abstand.',
    analyzeOutput: '<strong>Analyze-Ausgabe:</strong> Dateianzahl, Komponentenkomplexität, Import-Graph, Erkennung von totem Code.',
    faq: 'FAQ',
    faqBuildStep: {
      q: 'Brauche ich einen Build-Schritt?',
      a: 'Nein! Pulse funktioniert direkt im Browser. Für <code>.pulse</code>-Dateien und Produktionsoptimierung empfehlen wir jedoch Vite mit dem Pulse-Plugin.'
    },
    faqComparison: {
      q: 'Wie vergleicht sich Pulse mit React/Vue?',
      a: 'Pulse ist viel leichter (~4kb Kern, ~12kb komplett vs. 35-45kb) und verwendet Pulses (reaktive Primitiven) anstelle eines virtuellen DOMs. Es hat keine Abhängigkeiten und der Build-Schritt ist optional. Die CSS-Selektor-Syntax ist einzigartig für Pulse.'
    },
    faqTypeScript: {
      q: 'Kann ich TypeScript verwenden?',
      a: 'Ja! Pulse enthält vollständige TypeScript-Definitionen. Importieren Sie einfach Typen aus <code>pulse-js-framework/runtime</code> und Ihre IDE bietet Autovervollständigung.'
    },
    faqForms: {
      q: 'Wie behandle ich Formulare?',
      a: 'Verwenden Sie den <code>model()</code>-Helper für bidirektionales Binding:'
    },
    faqExisting: {
      q: 'Kann ich Pulse mit bestehenden Projekten verwenden?',
      a: 'Ja! Pulse kann an jedes DOM-Element gemountet werden. Verwenden Sie <code>mount(\'#mein-widget\', MeineKomponente())</code>, um Pulse-Komponenten überall einzubetten.'
    },
    faqFetch: {
      q: 'Wie hole ich Daten?',
      a: 'Verwenden Sie Standard-<code>fetch()</code> mit Effekten:'
    },
    faqSSR: {
      q: 'Unterstützt Pulse SSR?',
      a: 'Noch nicht, aber es ist auf der Roadmap. Derzeit ist Pulse für clientseitige SPAs und mobile Apps optimiert.'
    },
    faqDebug: {
      q: 'Wie debugge ich meine Anwendung?',
      a: 'Pulse v1.4.9+ unterstützt Source Maps für <code>.pulse</code>-Dateien. Verwenden Sie die Logger-API für strukturierte Ausgaben. Siehe den Debugging-Guide für weitere Details.'
    },
    faqMobile: {
      q: 'Kann ich mobile Apps erstellen?',
      a: 'Ja! Verwenden Sie <code>pulse mobile init</code>, um Android/iOS-Projekte einzurichten. Pulse enthält native APIs für Speicherung, Geräteinformationen und mehr. Siehe den Mobile-Guide.'
    },
    faqHelp: {
      q: 'Wo bekomme ich Hilfe?',
      a: 'Eröffnen Sie ein Issue auf GitHub oder schauen Sie sich die Beispiele für Referenzimplementierungen an.'
    },
    nextCoreConcepts: 'Weiter: Kernkonzepte →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Kernkonzepte',
    pulses: 'Pulses (Reaktiver Zustand)',
    pulsesDesc: 'Ein Pulse ist ein reaktiver Container, der Abonnenten benachrichtigt, wenn sich sein Wert ändert.',
    effects: 'Effekte',
    effectsDesc: 'Effekte werden automatisch ausgeführt, wenn sich ihre Abhängigkeiten ändern.',
    cssSelectorSyntax: 'CSS-Selektor-Syntax',
    cssSelectorSyntaxDesc: 'Erstellen Sie DOM-Elemente mit vertrauter CSS-Selektor-Syntax.',
    pulseFileSyntax: '.pulse-Dateisyntax',
    pulseFileSyntaxDesc: 'Die .pulse-DSL bietet eine saubere, deklarative Art, Komponenten zu schreiben.',
    blocks: 'Blöcke',
    imports: 'Imports',
    directives: 'Direktiven',
    slots: 'Slots (Inhaltsprojektion)',
    slotsDesc: 'Verwenden Sie Slots, um Komponenten mit dynamischem Inhalt zu komponieren.',
    cssScoping: 'CSS-Scoping',
    cssScopingDesc: 'Styles in .pulse-Dateien werden automatisch auf die Komponente beschränkt.',
    advancedRouting: 'Erweitertes Routing',
    advancedRoutingDesc: 'Der Pulse-Router unterstützt Lazy Loading, Middleware und Code-Splitting.',
    lazyLoading: 'Lazy Loading',
    lazyLoadingDesc: 'Laden Sie Routen-Komponenten bei Bedarf, um die initiale Größe zu reduzieren.',
    middleware: 'Middleware',
    middlewareDesc: 'Koa-Style Middleware für flexible Navigationssteuerung.',
    nextApiReference: 'Weiter: API-Referenz →'
  },

  // API Reference page
  apiReference: {
    title: '📖 API-Referenz',
    searchPlaceholder: 'API durchsuchen... (z.B. pulse, effect, router)',
    filter: 'Filtern:',
    categories: {
      all: 'Alle',
      types: 'Typen',
      reactivity: 'Reaktivität',
      dom: 'DOM',
      router: 'Router',
      store: 'Store',
      hmr: 'HMR'
    },
    typescriptSupport: 'TypeScript-Unterstützung',
    typescriptSupportDesc: 'Pulse enthält vollständige TypeScript-Definitionen für IDE-Autovervollständigung.',
    reactivity: 'Reaktivität',
    reactivityDesc: 'Signalbasiertes Reaktivitätssystem.',
    domSection: 'DOM',
    domSectionDesc: 'Helpers zum Erstellen und Manipulieren des DOM.',
    routerSection: 'Router',
    routerSectionDesc: 'SPA-Router mit verschachtelten Routen und Guards.',
    storeSection: 'Store',
    storeSectionDesc: 'Globales Zustandsmanagement.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Hot Module Replacement.',
    resultsFound: 'Ergebnis(se) gefunden',
    noResults: 'Keine Ergebnisse gefunden',
    nextMobile: 'Weiter: Mobile Apps →'
  },

  // Examples page
  examples: {
    title: '✨ Beispiele',
    intro: 'Entdecken Sie diese Beispielanwendungen, um Pulse in Aktion zu sehen.',

    // Example cards
    hmrDemo: {
      title: 'HMR-Demo',
      desc: 'Hot Module Replacement mit Zustandserhaltung.',
      features: ['Zustand während HMR erhalten', 'Automatische Effekt-Bereinigung', 'Theme-Wechsel', 'Notizen-Persistenz', 'HMR-Update-Zähler']
    },
    blog: {
      title: '📰 Blog',
      desc: 'Vollständige Blog-Anwendung mit CRUD, Kategorien und Suche.',
      features: ['CRUD-Operationen', 'Kategorie-Filterung', 'Suchfunktion', 'Hell-/Dunkelmodus', 'Responsives Design']
    },
    todoApp: {
      title: '📝 Todo-App',
      desc: 'Vollständige Todo-Anwendung mit Dunkelmodus und Persistenz.',
      features: ['Hinzufügen, Bearbeiten, Löschen', 'Nach Status filtern', 'Dunkelmodus', 'LocalStorage-Persistenz', 'Fortschrittsverfolgung']
    },
    weatherApp: {
      title: '🌤️ Wetter-App',
      desc: 'Echtzeit-Wetter-Anwendung mit Open-Meteo API.',
      features: ['Stadtsuche', 'Aktuelle Bedingungen', '7-Tage-Vorhersage', 'Favoritenstädte', '°C/°F-Umschaltung']
    },
    ecommerce: {
      title: '🛒 E-Commerce-Shop',
      desc: 'Vollständiges Einkaufserlebnis mit Warenkorb und Checkout.',
      features: ['Produktkatalog', 'Suche und Filter', 'Warenkorb', 'Checkout-Ablauf', 'LocalStorage-Persistenz']
    },
    chatApp: {
      title: '💬 Chat-App',
      desc: 'Echtzeit-Messaging mit Räumen und simulierten Benutzern.',
      features: ['Mehrere Räume', 'Benutzeranwesenheit', 'Simulierte Bot-Antworten', 'Emoji-Auswahl', 'Nachrichten-Persistenz']
    },
    routerDemo: {
      title: '🧭 Router-Demo',
      desc: 'SPA-Routing mit Navigation, Guards und dynamischen Routen.',
      features: ['Routen-Parameter', 'Query-Strings', 'Routen-Guards', 'Aktiver Link-Style', 'Geschützte Routen']
    },
    storeDemo: {
      title: '📝 Store-Demo',
      desc: 'Globales Zustandsmanagement mit dem Pulse Store-System.',
      features: ['createStore mit Persistenz', 'Actions und Getters', 'Rückgängig/Wiederherstellen', 'Modulare Stores', 'Logger-Plugin']
    },
    dashboard: {
      title: '📊 Admin-Dashboard',
      desc: 'Vollständige Admin-Oberfläche, die alle Funktionen demonstriert.',
      features: ['Auth und Guards', 'Diagramme, Tabellen, Modals', 'CRUD-Operationen', 'Themes und Einstellungen', 'Alle reaktiven Funktionen']
    },
    sportsNews: {
      title: '⚽ Sport-News',
      desc: 'News-App mit HTTP-Client und reaktivem Datenabruf.',
      features: ['HTTP-Client-Integration', 'Kategoriefilterung', 'Suche mit Debounce', 'Favoritensystem', 'Dunkelmodus']
    },

    viewDemo: 'Demo ansehen →',
    viewSource: 'Quellcode ansehen',
    runLocally: 'Beispiele lokal ausführen',
    runLocallyDesc: 'Um die Beispielprojekte auf Ihrem Computer auszuführen:',
    createYourOwn: 'Eigenes erstellen',
    createYourOwnDesc: 'Starten Sie ein neues Pulse-Projekt:',
    mobileExamples: '📱 Mobile Beispiele',
    mobileExamplesDesc: 'Pulse kann auch auf mobilen Plattformen über WebView laufen.'
  },

  // Playground page
  playground: {
    title: '🎮 Spielplatz',
    intro: 'Schreiben Sie Pulse-Code und sehen Sie die Ergebnisse sofort.',
    codeEditor: '📝 Code-Editor',
    preview: '👁️ Vorschau',
    run: '▶ Ausführen',
    reset: '↺ Zurücksetzen',
    share: 'Teilen',
    templates: '📋 Schnellvorlagen',
    ready: 'Bereit',
    running: 'Läuft...',
    success: '✓ Erfolg',
    errorPrefix: 'Fehler:',

    // Template names
    templateCounter: 'Zähler',
    templateTodo: 'Todo-Liste',
    templateTimer: 'Timer',
    templateForm: 'Formular',
    templateCalculator: 'Rechner',
    templateTabs: 'Tabs',
    templateTheme: 'Theme',
    templateSearch: 'Suche',
    templateCart: 'Warenkorb',
    templateAnimation: 'Animation'
  },

  // Debugging page
  debugging: {
    title: '🔍 Debugging',
    intro: 'Werkzeuge und Techniken zum Debuggen von Pulse-Anwendungen.',
    sourceMaps: 'Source Maps',
    sourceMapsDesc: 'Pulse v1.4.9+ generiert V3 Source Maps für kompilierte .pulse-Dateien.',
    enablingSourceMaps: 'Source Maps aktivieren',
    viteIntegration: 'Vite-Integration',
    viteIntegrationDesc: 'Das Vite-Plugin generiert automatisch Source Maps im Entwicklungsmodus.',
    usingSourceMaps: 'Source Maps in DevTools verwenden',
    usingSourceMapsSteps: [
      'Öffnen Sie Chrome/Firefox DevTools (F12)',
      'Gehen Sie zum Tab "Sources"',
      'Finden Sie Ihre .pulse-Dateien im Baum',
      'Setzen Sie Breakpoints auf den Originalzeilen',
      'Stack Traces zeigen die Originalzeilennummern'
    ],
    loggerApi: 'Logger-API',
    loggerApiDesc: 'Verwenden Sie den integrierten Logger für strukturierte Debug-Ausgabe.',
    logLevels: 'Log-Level',
    reactivityDebugging: 'Reaktivitäts-Debugging',
    reactivityDebuggingDesc: 'Techniken zum Debuggen von reaktivem Zustand und Effekten.',
    trackingDependencies: 'Abhängigkeiten verfolgen',
    debuggingComputed: 'Berechnete Werte debuggen',
    batchDebugging: 'Batches debuggen',
    routerDebugging: 'Router debuggen',
    routerDebuggingDesc: 'Navigation und Routen-Matching debuggen.',
    hmrDebugging: 'HMR debuggen',
    hmrDebuggingDesc: 'Hot Module Replacement-Probleme debuggen.',
    commonErrors: 'Häufige Fehler',
    performanceProfiling: 'Performance-Profiling',
    performanceProfilingDesc: 'Tipps zur Identifizierung von Engpässen.',
    nextApiReference: 'Weiter: API-Referenz →'
  },

  // Security page
  security: {
    title: '🔒 Sicherheit',
    intro: 'Best Practices für den Aufbau sicherer Pulse-Anwendungen.',
    xssPrevention: 'XSS-Prävention',
    xssPreventionDesc: 'Cross-Site Scripting (XSS) ist eine der häufigsten Web-Schwachstellen.',
    safeByDefault: 'Standardmäßig sicher: Textinhalt',
    safeByDefaultDesc: 'Die el()-Funktion mit String-Kindern escaped HTML automatisch.',
    dangerousInnerHtml: 'Gefährlich: innerHTML',
    dangerousInnerHtmlDesc: 'Verwenden Sie niemals innerHTML mit nicht vertrauenswürdigem Inhalt.',
    safePatterns: 'Sichere Muster für dynamischen Inhalt',
    urlSanitization: 'URL-Bereinigung',
    urlSanitizationDesc: 'Bereinigen Sie immer vom Benutzer bereitgestellte URLs.',
    formSecurity: 'Formular-Sicherheit',
    formSecurityDesc: 'Sichere Handhabung von Formulardaten.',
    inputValidation: 'Eingabevalidierung',
    sensitiveData: 'Sensible Daten',
    csp: 'Content Security Policy',
    cspDesc: 'Empfohlene CSP-Header für Pulse-Anwendungen.',
    apiSecurity: 'API-Sicherheit',
    apiSecurityDesc: 'Sichere Muster für Datenabruf.',
    checklist: 'Sicherheits-Checkliste',
    nextPerformance: 'Weiter: Performance-Guide'
  },

  // Performance page
  performance: {
    title: '⚡ Performance',
    intro: 'Optimieren Sie Ihre Pulse-Anwendungen für maximale Leistung.',
    lazyComputed: 'Verzögerte berechnete Werte',
    lazyComputedDesc: 'Standardmäßig werden berechnete Werte sofort ausgewertet. Verwenden Sie verzögerte Auswertung für aufwendige Berechnungen.',
    whenToUseLazy: 'Wann verzögert verwenden',
    listKeying: 'Listen-Keys',
    listKeyingDesc: 'Korrektes Keying ist entscheidend für die Listen-Performance.',
    goodVsBadKeys: 'Gute vs. schlechte Keys',
    performanceImpact: 'Performance-Auswirkung',
    batching: 'Updates bündeln',
    batchingDesc: 'Bündeln Sie mehrere Zustandsänderungen, um Zwischen-Rerenders zu vermeiden.',
    automaticBatching: 'Automatisches Bündeln',
    memoization: 'Memoization',
    memoizationDesc: 'Cachen Sie aufwendige Berechnungen, um redundante Arbeit zu vermeiden.',
    lazyRoutes: 'Lazy Loading von Routen',
    lazyRoutesDesc: 'Teilen Sie Ihre App in Chunks auf, die bei Bedarf geladen werden.',
    avoidReactivity: 'Unnötige Reaktivität vermeiden',
    avoidReactivityDesc: 'Nicht alles muss reaktiv sein.',
    effectOptimization: 'Effekt-Optimierung',
    effectOptimizationDesc: 'Halten Sie Effekte schnell und fokussiert.',
    resourceCaching: 'Ressourcen-Caching',
    resourceCachingDesc: 'Nutzen Sie die Cache-Funktionen des Async-Moduls.',
    monitoring: 'Performance-Monitoring',
    monitoringDesc: 'Verwenden Sie das DevTools-Modul zur Performance-Überwachung.',
    checklist: 'Performance-Checkliste',
    nextErrorHandling: 'Weiter: Fehlerbehandlung'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Fehlerbehandlung',
    intro: 'Robuste Strategien zur Fehlerbehandlung für Pulse-Anwendungen.',
    effectErrors: 'Effekt-Fehler',
    asyncErrors: 'Async-Fehler',
    formErrors: 'Formular-Fehler',
    routerErrors: 'Router-Fehler',
    boundaries: 'Error Boundaries',
    logging: 'Logging & Reporting',
    gracefulDegradation: 'Graceful Degradation',
    summary: 'Zusammenfassung',
    nextApiReference: 'Weiter: API-Referenz →'
  },

  // HTTP page
  http: {
    title: '🌐 HTTP-Client',
    intro: 'Abhängigkeitsfreier HTTP-Client für API-Anfragen. Basiert auf nativem Fetch mit Interceptoren, Retry, Timeout und reaktiver Integration.',
    quickStart: 'Schnellstart',
    quickStartDesc: 'Importieren und verwenden Sie den HTTP-Client:',
    configuration: 'Konfiguration',
    configurationDesc: 'Konfigurieren Sie Standardeinstellungen für alle Anfragen:',
    httpMethods: 'HTTP-Methoden',
    responseStructure: 'Antwortstruktur',
    interceptors: 'Interceptoren',
    interceptorsDesc: 'Interceptoren ermöglichen die globale Transformation von Anfragen und Antworten.',
    requestInterceptors: 'Request-Interceptoren',
    responseInterceptors: 'Response-Interceptoren',
    manageInterceptors: 'Interceptoren verwalten',
    errorHandling: 'Fehlerbehandlung',
    errorHandlingDesc: 'Alle Fehler werden in HttpError mit nützlichen Eigenschaften gekapselt:',
    errorCodes: 'Fehlercodes',
    description: 'Beschreibung',
    when: 'Wann',
    errorTimeout: 'Zeitüberschreitung',
    errorTimeoutWhen: 'Timeout vor Antwort abgelaufen',
    errorNetwork: 'Netzwerkfehler',
    errorNetworkWhen: 'Keine Verbindung oder Server nicht erreichbar',
    errorAbort: 'Anfrage abgebrochen',
    errorAbortWhen: 'AbortController.abort() aufgerufen',
    errorHttp: 'HTTP-Fehlerstatus',
    errorHttpWhen: 'Antwortstatus nicht im 2xx-Bereich',
    errorParse: 'Parsing fehlgeschlagen',
    errorParseWhen: 'JSON/Blob-Parsing-Fehler',
    cancellation: 'Anfrage abbrechen',
    cancellationDesc: 'Brechen Sie Anfragen mit AbortController ab:',
    retry: 'Retry-Konfiguration',
    retryDesc: 'Fehlgeschlagene Anfragen automatisch wiederholen:',
    reactiveIntegration: 'Reaktive Integration',
    reactiveIntegrationDesc: 'HTTP-Anfragen nahtlos mit Pulse-Reaktivität integrieren:',
    useHttpResourceDesc: 'Für gecachte Ressourcen mit SWR-Pattern:',
    childInstances: 'Kind-Instanzen',
    childInstancesDesc: 'Erstellen Sie spezialisierte Clients, die von einem Eltern erben:',
    fileUpload: 'Datei-Upload',
    urlParameters: 'URL-Parameter',
    fullExample: 'Vollständiges Beispiel'
  },

  // Accessibility page
  accessibility: {
    title: '♿ Barrierefreiheit',
    intro: 'Pulse wurde mit Barrierefreiheit als Kernfunktion entwickelt und bietet mehrere Ebenen der A11y-Unterstützung.',
    nextSecurity: 'Weiter: Sicherheitsleitfaden →'
  },

  // Mobile page
  mobile: {
    title: '📱 Mobile Entwicklung',
    intro: 'Erstellen Sie native Android- und iOS-Apps aus Ihrem Pulse-Projekt.',
    overview: 'Übersicht',
    quickStart: 'Schnellstart',
    cliCommands: 'CLI-Befehle',
    configuration: 'Konfiguration',
    configurationDesc: 'Die Datei pulse.mobile.json konfiguriert Ihre mobile App.',
    nativeApis: 'Native APIs',
    requirements: 'Voraussetzungen',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Weiter: Beispiele →'
  },

  // Changelog page
  changelog: {
    title: '📋 Änderungsprotokoll',
    intro: 'Aktuelle Updates und Verbesserungen am Pulse Framework.',
    version: 'Version',
    releaseDate: 'Veröffentlichungsdatum',
    changes: 'Änderungen',
    added: 'Hinzugefügt',
    changed: 'Geändert',
    fixed: 'Behoben',
    removed: 'Entfernt',
    deprecated: 'Veraltet',
    security: 'Sicherheit',
    breaking: 'Breaking Change',
    features: 'Funktionen',
    bugFixes: 'Fehlerbehebungen',
    improvements: 'Verbesserungen',
    documentation: 'Dokumentation',
    performance: 'Performance',
    tests: 'Tests'
  }
};
