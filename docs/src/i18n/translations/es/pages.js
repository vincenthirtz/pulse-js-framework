/**
 * Spanish translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'Un framework DOM declarativo basado en selectores CSS',
    features: {
      zeroDeps: '0️⃣ Cero dependencias',
      uniqueSyntax: '🎯 Sintaxis única',
      reactive: '⚡ Reactivo',
      smallBundle: '📦 ~4kb core',
      noBuild: '🔧 Sin build requerido',
      mobile: '📱 Apps móviles'
    },
    getStarted: 'Comenzar →',
    viewExamples: 'Ver ejemplos',
    whatMakesUnique: '¿Qué hace único a Pulse?',
    quickExample: 'Ejemplo rápido',
    pulseSyntax: 'Sintaxis .pulse',
    jsEquivalent: 'Equivalente JavaScript',
    comparison: {
      feature: 'Característica',
      uiStructure: 'Estructura UI',
      reactivity: 'Reactividad',
      buildStep: 'Paso de build',
      bundleSize: 'Tamaño del bundle',
      dependencies: 'Dependencias',
      buildSpeed: 'Velocidad de build',
      learningCurve: 'Curva de aprendizaje',
      fileExtension: 'Extensión de archivo',
      mobileApps: 'Apps móviles',
      typescript: 'TypeScript',
      cssSelectors: 'Selectores CSS',
      pulses: 'Pulses',
      required: 'Requerido',
      optional: 'Opcional',
      many: 'Muchas',
      some: 'Algunas',
      few: 'Pocas',
      zero: 'Cero',
      slow: 'Lento',
      medium: 'Medio',
      fast: 'Rápido',
      instant: 'Instantáneo',
      steep: 'Empinada',
      moderate: 'Moderada',
      easy: 'Fácil',
      minimal: 'Mínima',
      builtIn: 'Integrado'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Comenzar',
    installation: 'Instalación',
    installationDesc: 'Crea un nuevo proyecto Pulse con un solo comando:',
    manualSetup: 'Configuración manual',
    manualSetupDesc: 'O configura manualmente en cualquier proyecto:',
    thenImport: 'Luego importa en tu JavaScript:',
    firstComponent: 'Tu primer componente',
    firstComponentDesc: 'Crea un simple contador reactivo:',
    usingPulseFiles: 'Usando archivos .pulse',
    usingPulseFilesDesc: 'Para una sintaxis más limpia, usa archivos <code>.pulse</code> con el plugin de Vite:',
    projectStructure: 'Estructura del proyecto',
    cliCommands: 'Comandos CLI',
    cliCommandsDesc: 'Pulse proporciona un CLI completo para el flujo de desarrollo:',
    development: 'Desarrollo',
    codeQuality: 'Calidad del código',
    lintChecks: '<strong>Verificaciones lint:</strong> referencias indefinidas, imports/estados no usados, convenciones de nombres, bloques vacíos, orden de imports.',
    formatRules: '<strong>Reglas de formato:</strong> indentación 2 espacios, imports ordenados, llaves consistentes, espaciado correcto.',
    analyzeOutput: '<strong>Salida analyze:</strong> conteo de archivos, complejidad de componentes, grafo de imports, detección de código muerto.',
    faq: 'FAQ',
    faqBuildStep: {
      q: '¿Necesito un paso de build?',
      a: '¡No! Pulse funciona directamente en el navegador. Sin embargo, para archivos <code>.pulse</code> y optimización en producción, recomendamos usar Vite con el plugin de Pulse.'
    },
    faqComparison: {
      q: '¿Cómo se compara Pulse con React/Vue?',
      a: 'Pulse es mucho más ligero (~4kb core, ~12kb completo vs 35-45kb) y usa pulses (primitivos reactivos) en lugar de DOM virtual. No tiene dependencias y el paso de build es opcional. La sintaxis de selectores CSS es única de Pulse.'
    },
    faqTypeScript: {
      q: '¿Puedo usar TypeScript?',
      a: '¡Sí! Pulse incluye definiciones TypeScript completas. Solo importa los tipos desde <code>pulse-js-framework/runtime</code> y tu IDE proporcionará autocompletado.'
    },
    faqForms: {
      q: '¿Cómo manejo formularios?',
      a: 'Usa el helper <code>model()</code> para binding bidireccional:'
    },
    faqExisting: {
      q: '¿Puedo usar Pulse con proyectos existentes?',
      a: '¡Sí! Pulse puede montarse en cualquier elemento DOM. Usa <code>mount(\'#mi-widget\', MiComponente())</code> para integrar componentes Pulse en cualquier lugar.'
    },
    faqFetch: {
      q: '¿Cómo obtengo datos?',
      a: 'Usa el estándar <code>fetch()</code> con efectos:'
    },
    faqSSR: {
      q: '¿Pulse soporta SSR?',
      a: 'Todavía no, pero está en la hoja de ruta. Actualmente Pulse está optimizado para SPAs del lado del cliente y apps móviles.'
    },
    faqDebug: {
      q: '¿Cómo depuro mi aplicación?',
      a: 'Pulse v1.4.9+ soporta source maps para archivos <code>.pulse</code>. Usa la API Logger para salida estructurada. Ver la Guía de Depuración para más detalles.'
    },
    faqMobile: {
      q: '¿Puedo crear apps móviles?',
      a: '¡Sí! Usa <code>pulse mobile init</code> para configurar proyectos Android/iOS. Pulse incluye APIs nativas para almacenamiento, info del dispositivo, y más. Ver la Guía Móvil.'
    },
    faqHelp: {
      q: '¿Dónde puedo obtener ayuda?',
      a: 'Abre un issue en GitHub o consulta los Ejemplos para implementaciones de referencia.'
    },
    nextCoreConcepts: 'Siguiente: Conceptos clave →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Conceptos clave',
    intro: 'Pulse está construido sobre cuatro conceptos fundamentales: Pulses (estado reactivo), Efectos (efectos secundarios), helpers DOM, y el DSL opcional .pulse.',
    pulses: 'Pulses (Estado reactivo)',
    pulsesDesc: 'Un pulse es un contenedor reactivo que notifica a los suscriptores cuando su valor cambia.',
    effects: 'Efectos',
    effectsDesc: 'Los efectos se ejecutan automáticamente cuando sus dependencias cambian.',
    computed: 'Valores computados',
    computedDesc: 'Valores derivados que se actualizan automáticamente.',
    domHelpers: 'Helpers DOM',
    domHelpersDesc: 'Crea elementos DOM usando sintaxis de selectores CSS.',
    reactiveBindings: 'Bindings reactivos',
    conditionalList: 'Renderizado condicional y listas',
    pulseDsl: 'DSL .pulse',
    pulseDslDesc: 'El DSL opcional proporciona una sintaxis más limpia para componentes.',
    cssSelectorSyntax: 'Sintaxis de selectores CSS',
    cssSelectorSyntaxDesc: 'Crea elementos DOM con una sintaxis familiar de selectores CSS.',
    pulseFileSyntax: 'Sintaxis de archivos .pulse',
    pulseFileSyntaxDesc: 'El DSL .pulse ofrece una forma limpia y declarativa de escribir componentes.',
    blocks: 'Bloques',
    imports: 'Imports',
    directives: 'Directivas',
    slots: 'Slots (Proyección de contenido)',
    slotsDesc: 'Usa slots para componer componentes con contenido dinámico.',
    cssScoping: 'Alcance CSS',
    cssScopingDesc: 'Los estilos en archivos .pulse se limitan automáticamente al componente.',
    advancedRouting: 'Enrutamiento avanzado',
    advancedRoutingDesc: 'El router de Pulse soporta lazy loading, middlewares y code splitting.',
    lazyLoading: 'Carga diferida',
    lazyLoadingDesc: 'Carga componentes de ruta bajo demanda para reducir el tamaño inicial.',
    middleware: 'Middleware',
    middlewareDesc: 'Middleware estilo Koa para control flexible de navegación.',
    nextApiReference: 'Siguiente: Referencia API →'
  },

  // API Reference page
  apiReference: {
    title: '📖 Referencia API',
    searchPlaceholder: 'Buscar en la API... (ej: pulse, effect, router)',
    filter: 'Filtrar:',
    categories: {
      all: 'Todo',
      types: 'Tipos',
      reactivity: 'Reactividad',
      dom: 'DOM',
      router: 'Router',
      store: 'Store',
      hmr: 'HMR'
    },
    typescriptSupport: 'Soporte TypeScript',
    typescriptSupportDesc: 'Pulse incluye definiciones TypeScript completas para autocompletado IDE.',
    reactivity: 'Reactividad',
    reactivityDesc: 'Sistema de reactividad basado en señales.',
    domSection: 'DOM',
    domSectionDesc: 'Helpers para crear y manipular el DOM.',
    routerSection: 'Router',
    routerSectionDesc: 'Router SPA con rutas anidadas y guards.',
    storeSection: 'Store',
    storeSectionDesc: 'Gestión de estado global.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Reemplazo de módulo en caliente.',
    resultsFound: 'resultado(s) encontrado(s)',
    noResults: 'No se encontraron resultados',
    nextMobile: 'Siguiente: Apps móviles →'
  },

  // Examples page
  examples: {
    title: '✨ Ejemplos',
    intro: 'Explora estas aplicaciones de ejemplo para ver Pulse en acción.',

    hmrDemo: {
      title: 'Demo HMR',
      desc: 'Reemplazo de módulo en caliente con preservación de estado.',
      features: ['Estado preservado durante HMR', 'Limpieza auto de efectos', 'Cambio de tema', 'Persistencia de notas', 'Contador de actualizaciones HMR']
    },
    blog: {
      title: '📰 Blog',
      desc: 'Aplicación de blog completa con CRUD, categorías y búsqueda.',
      features: ['Operaciones CRUD', 'Filtrado por categoría', 'Funcionalidad de búsqueda', 'Modo claro/oscuro', 'Diseño responsive']
    },
    todoApp: {
      title: '📝 App Todo',
      desc: 'Aplicación todo completa con modo oscuro y persistencia.',
      features: ['Agregar, editar, eliminar', 'Filtrar por estado', 'Modo oscuro', 'Persistencia LocalStorage', 'Seguimiento de progreso']
    },
    weatherApp: {
      title: '🌤️ App Clima',
      desc: 'Aplicación de clima en tiempo real con API Open-Meteo.',
      features: ['Búsqueda de ciudad', 'Condiciones actuales', 'Pronóstico 7 días', 'Ciudades favoritas', 'Alternar °C/°F']
    },
    ecommerce: {
      title: '🛒 Tienda E-commerce',
      desc: 'Experiencia de compra completa con carrito y checkout.',
      features: ['Catálogo de productos', 'Búsqueda y filtros', 'Carrito de compras', 'Flujo de pago', 'Persistencia LocalStorage']
    },
    chatApp: {
      title: '💬 App Chat',
      desc: 'Mensajería en tiempo real con salas y usuarios simulados.',
      features: ['Múltiples salas', 'Presencia de usuario', 'Respuestas bot simuladas', 'Selector de emoji', 'Persistencia de mensajes']
    },
    routerDemo: {
      title: '🧭 Demo Router',
      desc: 'Enrutamiento SPA con navegación, guards y rutas dinámicas.',
      features: ['Parámetros de ruta', 'Query strings', 'Guards de ruta', 'Estilo de enlace activo', 'Rutas protegidas']
    },
    storeDemo: {
      title: '📝 Demo Store',
      desc: 'Gestión de estado global con el sistema Store de Pulse.',
      features: ['createStore con persistencia', 'Acciones y getters', 'Deshacer/Rehacer', 'Stores modulares', 'Plugin Logger']
    },
    dashboard: {
      title: '📊 Dashboard Admin',
      desc: 'Interfaz admin completa demostrando todas las características.',
      features: ['Auth y guards', 'Gráficos, tablas, modales', 'Operaciones CRUD', 'Temas y configuración', 'Todas las características reactivas']
    },

    viewDemo: 'Ver demo →',
    viewSource: 'Ver código',
    runLocally: 'Ejecutar ejemplos localmente',
    runLocallyDesc: 'Para ejecutar los proyectos de ejemplo en tu máquina:',
    createYourOwn: 'Crea el tuyo',
    createYourOwnDesc: 'Inicia un nuevo proyecto Pulse:',
    mobileExamples: '📱 Ejemplos móviles',
    mobileExamplesDesc: 'Pulse también puede ejecutarse en plataformas móviles via WebView.'
  },

  // Playground page
  playground: {
    title: '🎮 Sandbox',
    intro: 'Escribe código Pulse y ve los resultados instantáneamente.',
    codeEditor: '📝 Editor de código',
    preview: '👁️ Vista previa',
    run: '▶ Ejecutar',
    reset: '↺ Reiniciar',
    templates: '📋 Plantillas rápidas',
    ready: 'Listo',
    running: 'Ejecutando...',
    success: '✓ Éxito',
    error: '✗ Error',

    templateCounter: 'Contador',
    templateTodo: 'Lista Todo',
    templateTimer: 'Temporizador',
    templateForm: 'Formulario',
    templateCalculator: 'Calculadora',
    templateTabs: 'Pestañas',
    templateTheme: 'Tema',
    templateSearch: 'Búsqueda',
    templateCart: 'Carrito',
    templateAnimation: 'Animación'
  },

  // Debugging page
  debugging: {
    title: '🔍 Depuración',
    intro: 'Herramientas y técnicas para depurar aplicaciones Pulse.',
    sourceMaps: 'Source Maps',
    sourceMapsDesc: 'Pulse v1.4.9+ genera source maps V3 para archivos .pulse compilados.',
    enablingSourceMaps: 'Habilitar Source Maps',
    viteIntegration: 'Integración Vite',
    viteIntegrationDesc: 'El plugin Vite genera automáticamente source maps en modo desarrollo.',
    usingSourceMaps: 'Usar Source Maps en DevTools',
    usingSourceMapsSteps: [
      'Abre Chrome/Firefox DevTools (F12)',
      'Ve a la pestaña Sources',
      'Encuentra tus archivos .pulse en el árbol',
      'Coloca breakpoints en las líneas originales',
      'Los stack traces mostrarán números de línea originales'
    ],
    loggerApi: 'API Logger',
    loggerApiDesc: 'Usa el logger integrado para salida de depuración estructurada.',
    logLevels: 'Niveles de log',
    reactivityDebugging: 'Depuración de reactividad',
    reactivityDebuggingDesc: 'Técnicas para depurar estado reactivo y efectos.',
    trackingDependencies: 'Rastreo de dependencias',
    debuggingComputed: 'Depurar valores computados',
    batchDebugging: 'Depurar batches',
    routerDebugging: 'Depurar router',
    routerDebuggingDesc: 'Depurar navegación y matching de rutas.',
    hmrDebugging: 'Depurar HMR',
    hmrDebuggingDesc: 'Depurar problemas de Hot Module Replacement.',
    commonErrors: 'Errores comunes',
    performanceProfiling: 'Perfilado de rendimiento',
    performanceProfilingDesc: 'Consejos para identificar cuellos de botella.',
    nextApiReference: 'Siguiente: Referencia API →'
  },

  // Security page
  security: {
    title: '🔒 Seguridad',
    intro: 'Mejores prácticas para construir aplicaciones Pulse seguras.',
    xssPrevention: 'Prevención XSS',
    xssPreventionDesc: 'El Cross-Site Scripting (XSS) es una de las vulnerabilidades web más comunes.',
    safeByDefault: 'Seguro por defecto: Contenido de texto',
    safeByDefaultDesc: 'La función el() con hijos string escapa automáticamente el HTML.',
    dangerousInnerHtml: 'Peligroso: innerHTML',
    dangerousInnerHtmlDesc: 'Nunca uses innerHTML con contenido no confiable.',
    safePatterns: 'Patrones seguros para contenido dinámico',
    urlSanitization: 'Sanitización de URLs',
    urlSanitizationDesc: 'Siempre sanitiza las URLs proporcionadas por el usuario.',
    formSecurity: 'Seguridad de formularios',
    formSecurityDesc: 'Manejo seguro de datos de formulario.',
    inputValidation: 'Validación de entrada',
    sensitiveData: 'Datos sensibles',
    csp: 'Content Security Policy',
    cspDesc: 'Headers CSP recomendados para aplicaciones Pulse.',
    apiSecurity: 'Seguridad de API',
    apiSecurityDesc: 'Patrones seguros para obtención de datos.',
    securityChecklist: 'Checklist de seguridad',
    nextPerformance: 'Siguiente: Guía de rendimiento'
  },

  // Performance page
  performance: {
    title: '⚡ Rendimiento',
    intro: 'Optimiza tus aplicaciones Pulse para máximo rendimiento.',
    lazyComputed: 'Valores computados diferidos',
    lazyComputedDesc: 'Por defecto, los valores computados se evalúan inmediatamente. Usa evaluación diferida para cálculos costosos.',
    whenToUseLazy: 'Cuándo usar diferido',
    listKeying: 'Claves de lista',
    listKeyingDesc: 'Un buen keying es crítico para el rendimiento de listas.',
    goodVsBadKeys: 'Buenas vs malas claves',
    performanceImpact: 'Impacto en rendimiento',
    batchingUpdates: 'Agrupación de actualizaciones',
    batchingUpdatesDesc: 'Agrupa múltiples cambios de estado para evitar re-renderizados intermedios.',
    automaticBatching: 'Agrupación automática',
    memoization: 'Memoización',
    memoizationDesc: 'Cachea cálculos costosos para evitar trabajo redundante.',
    lazyLoadingRoutes: 'Carga diferida de rutas',
    lazyLoadingRoutesDesc: 'Divide tu app en chunks cargados bajo demanda.',
    avoidUnnecessaryReactivity: 'Evitar reactividad innecesaria',
    avoidUnnecessaryReactivityDesc: 'No todo necesita ser reactivo.',
    effectOptimization: 'Optimización de efectos',
    effectOptimizationDesc: 'Mantén los efectos rápidos y enfocados.',
    resourceCaching: 'Caché de recursos',
    resourceCachingDesc: 'Usa las características de caché del módulo async.',
    performanceMonitoring: 'Monitoreo de rendimiento',
    performanceMonitoringDesc: 'Usa el módulo devtools para monitorear rendimiento.',
    performanceChecklist: 'Checklist de rendimiento',
    nextErrorHandling: 'Siguiente: Manejo de errores'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Manejo de errores',
    intro: 'Estrategias robustas de manejo de errores para aplicaciones Pulse.',
    effectErrorHandling: 'Manejo de errores en efectos',
    effectErrorHandlingDesc: 'Los efectos pueden fallar. Maneja errores graciosamente.',
    perEffectHandler: 'Handler de error por efecto',
    globalEffectHandler: 'Handler de error global para efectos',
    asyncErrorHandling: 'Manejo de errores async',
    asyncErrorHandlingDesc: 'El módulo async proporciona gestión de estado de error integrada.',
    formValidation: 'Errores de validación de formulario',
    formValidationDesc: 'Maneja validación de formulario con el módulo form.',
    routerErrorHandling: 'Manejo de errores del router',
    routerErrorHandlingDesc: 'Maneja errores de navegación y carga de rutas.',
    errorBoundaries: 'Límites de error',
    errorBoundariesDesc: 'Contén errores para evitar crashs de toda la app.',
    errorLogging: 'Logging y reporte de errores',
    errorLoggingDesc: 'Integra con servicios de seguimiento de errores.',
    gracefulDegradation: 'Degradación grácil',
    gracefulDegradationDesc: 'Patrones para mantener funcionalidad cuando partes fallan.',
    errorPatternsSummary: 'Resumen de patrones de manejo de errores',
    nextApiReference: 'Siguiente: Referencia API'
  },

  // Mobile page
  mobile: {
    title: '📱 Desarrollo móvil',
    intro: 'Construye apps Android e iOS nativas desde tu proyecto Pulse.',
    gettingStarted: 'Primeros pasos',
    gettingStartedDesc: 'Configura tu entorno de desarrollo móvil.',
    platformDetection: 'Detección de plataforma',
    platformDetectionDesc: 'Detecta la plataforma actual y adapta el comportamiento.',
    nativeStorage: 'Almacenamiento nativo',
    nativeStorageDesc: 'Almacenamiento persistente que funciona en web y nativo.',
    deviceInfo: 'Info del dispositivo',
    deviceInfoDesc: 'Accede a información del dispositivo y estado de red.',
    nativeUi: 'UI nativa',
    nativeUiDesc: 'Accede a elementos de UI nativos como toasts y vibración.',
    appLifecycle: 'Ciclo de vida de la app',
    appLifecycleDesc: 'Maneja eventos de pausa, reanudación y botón atrás.',
    buildingApps: 'Construcción de apps',
    buildingAppsDesc: 'Construye y empaqueta tu app para distribución.',
    overview: 'Visión general',
    overviewDesc: 'Pulse Mobile te permite empaquetar tu app web como app móvil nativa sin dependencias externas.',
    features: {
      zeroDeps: '🚀 Cero dependencias',
      zeroDepsDesc: 'Código nativo puro, sin paquetes npm necesarios',
      singleCodebase: '📦 Base de código única',
      singleCodebaseDesc: 'La misma app Pulse corre en web, Android e iOS',
      nativePerf: '⚡ Rendimiento nativo',
      nativePerfDesc: 'WebView con aceleración por hardware',
      nativeApis: '🔧 APIs nativas',
      nativeApisDesc: 'Acceso a almacenamiento, info del dispositivo, portapapeles, y más'
    },
    quickStart: 'Inicio rápido',
    cliCommands: 'Comandos CLI',
    configuration: 'Configuración',
    configurationDesc: 'El archivo pulse.mobile.json configura tu app móvil.',
    nativeApis: 'APIs nativas',
    requirements: 'Requisitos',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Siguiente: Ejemplos →',
    nextChangelog: 'Siguiente: Historial de versiones'
  },

  // Changelog page
  changelog: {
    title: '📋 Historial de versiones',
    intro: 'Actualizaciones y mejoras recientes de Pulse Framework.',
    version: 'Versión',
    releaseDate: 'Fecha de lanzamiento',
    changes: 'Cambios',
    added: 'Agregado',
    changed: 'Cambiado',
    fixed: 'Corregido',
    removed: 'Eliminado',
    deprecated: 'Obsoleto',
    security: 'Seguridad',
    breaking: 'Cambio importante',
    features: 'Características',
    bugFixes: 'Correcciones de bugs',
    improvements: 'Mejoras',
    documentation: 'Documentación',
    performance: 'Rendimiento',
    tests: 'Tests'
  }
};
