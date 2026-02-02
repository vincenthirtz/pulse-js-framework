/**
 * French translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'Un framework DOM déclaratif basé sur les sélecteurs CSS',
    features: {
      zeroDeps: '0️⃣ Zéro dépendance',
      uniqueSyntax: '🎯 Syntaxe unique',
      reactive: '⚡ Réactif',
      smallBundle: '📦 ~4kb core',
      noBuild: '🔧 Pas de build requis',
      mobile: '📱 Apps mobiles'
    },
    getStarted: 'Commencer →',
    viewExamples: 'Voir les exemples',
    whatMakesUnique: 'Qu\'est-ce qui rend Pulse unique ?',
    quickExample: 'Exemple rapide',
    pulseSyntax: 'Syntaxe .pulse',
    jsEquivalent: 'Équivalent JavaScript',
    comparison: {
      feature: 'Fonctionnalité',
      uiStructure: 'Structure UI',
      reactivity: 'Réactivité',
      buildStep: 'Étape de build',
      bundleSize: 'Taille du bundle',
      dependencies: 'Dépendances',
      buildSpeed: 'Vitesse de build',
      learningCurve: 'Courbe d\'apprentissage',
      fileExtension: 'Extension de fichier',
      mobileApps: 'Apps mobiles',
      typescript: 'TypeScript',
      cssSelectors: 'Sélecteurs CSS',
      pulses: 'Pulses',
      required: 'Requis',
      optional: 'Optionnel',
      many: 'Beaucoup',
      some: 'Quelques',
      few: 'Peu',
      zero: 'Zéro',
      slow: 'Lent',
      medium: 'Moyen',
      fast: 'Rapide',
      instant: 'Instantané',
      steep: 'Raide',
      moderate: 'Modérée',
      easy: 'Facile',
      minimal: 'Minimale',
      builtIn: 'Intégré'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Démarrage',
    installation: 'Installation',
    installationDesc: 'Créez un nouveau projet Pulse avec une seule commande :',
    manualSetup: 'Configuration manuelle',
    manualSetupDesc: 'Ou configurez manuellement dans n\'importe quel projet :',
    thenImport: 'Puis importez dans votre JavaScript :',
    firstComponent: 'Votre premier composant',
    firstComponentDesc: 'Créez un simple compteur réactif :',
    usingPulseFiles: 'Utiliser les fichiers .pulse',
    usingPulseFilesDesc: 'Pour une syntaxe plus claire, utilisez les fichiers <code>.pulse</code> avec le plugin Vite :',
    projectStructure: 'Structure du projet',
    cliCommands: 'Commandes CLI',
    cliCommandsDesc: 'Pulse fournit un CLI complet pour le workflow de développement :',
    development: 'Développement',
    codeQuality: 'Qualité du code',
    lintChecks: '<strong>Vérifications lint :</strong> références indéfinies, imports/états inutilisés, conventions de nommage, blocs vides, ordre des imports.',
    formatRules: '<strong>Règles de formatage :</strong> indentation 2 espaces, imports triés, accolades cohérentes, espacement correct.',
    analyzeOutput: '<strong>Sortie analyze :</strong> nombre de fichiers, complexité des composants, graphe d\'imports, détection de code mort.',
    faq: 'FAQ',
    faqBuildStep: {
      q: 'Ai-je besoin d\'une étape de build ?',
      a: 'Non ! Pulse fonctionne directement dans le navigateur. Cependant, pour les fichiers <code>.pulse</code> et l\'optimisation en production, nous recommandons d\'utiliser Vite avec le plugin Pulse.'
    },
    faqComparison: {
      q: 'Comment Pulse se compare-t-il à React/Vue ?',
      a: 'Pulse est beaucoup plus léger (~4kb core, ~12kb complet vs 35-45kb) et utilise des pulses (primitives réactives) au lieu d\'un DOM virtuel. Il n\'a aucune dépendance et une étape de build optionnelle. La syntaxe des sélecteurs CSS est unique à Pulse.'
    },
    faqTypeScript: {
      q: 'Puis-je utiliser TypeScript ?',
      a: 'Oui ! Pulse inclut des définitions TypeScript complètes. Importez simplement les types depuis <code>pulse-js-framework/runtime</code> et votre IDE fournira l\'autocomplétion.'
    },
    faqForms: {
      q: 'Comment gérer les formulaires ?',
      a: 'Utilisez le helper <code>model()</code> pour la liaison bidirectionnelle :'
    },
    faqExisting: {
      q: 'Puis-je utiliser Pulse avec des projets existants ?',
      a: 'Oui ! Pulse peut être monté sur n\'importe quel élément DOM. Utilisez <code>mount(\'#mon-widget\', MonComposant())</code> pour intégrer des composants Pulse n\'importe où.'
    },
    faqFetch: {
      q: 'Comment récupérer des données ?',
      a: 'Utilisez le standard <code>fetch()</code> avec les effets :'
    },
    faqSSR: {
      q: 'Pulse supporte-t-il le SSR ?',
      a: 'Pas encore, mais c\'est sur la feuille de route. Actuellement, Pulse est optimisé pour les SPAs côté client et les apps mobiles.'
    },
    faqDebug: {
      q: 'Comment déboguer mon application ?',
      a: 'Pulse v1.4.9+ supporte les source maps pour les fichiers <code>.pulse</code>. Utilisez l\'API Logger pour une sortie structurée. Voir le Guide de débogage pour plus de détails.'
    },
    faqMobile: {
      q: 'Puis-je créer des apps mobiles ?',
      a: 'Oui ! Utilisez <code>pulse mobile init</code> pour configurer des projets Android/iOS. Pulse inclut des APIs natives pour le stockage, les infos appareil, et plus encore. Voir le Guide Mobile.'
    },
    faqHelp: {
      q: 'Où puis-je obtenir de l\'aide ?',
      a: 'Ouvrez une issue sur GitHub ou consultez les Exemples pour des implémentations de référence.'
    },
    nextCoreConcepts: 'Suivant : Concepts clés →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Concepts clés',
    intro: 'Pulse est construit sur quatre concepts fondamentaux : les Pulses (état réactif), les Effets (effets de bord), les helpers DOM, et le DSL optionnel .pulse.',
    pulses: 'Pulses (État réactif)',
    pulsesDesc: 'Un pulse est un conteneur réactif qui notifie les abonnés lorsque sa valeur change.',
    effects: 'Effets',
    effectsDesc: 'Les effets s\'exécutent automatiquement lorsque leurs dépendances changent.',
    computed: 'Valeurs calculées',
    computedDesc: 'Valeurs dérivées qui se mettent à jour automatiquement.',
    domHelpers: 'Helpers DOM',
    domHelpersDesc: 'Créez des éléments DOM en utilisant la syntaxe des sélecteurs CSS.',
    reactiveBindings: 'Liaisons réactives',
    conditionalList: 'Rendu conditionnel et listes',
    pulseDsl: 'DSL .pulse',
    pulseDslDesc: 'Le DSL optionnel fournit une syntaxe plus claire pour les composants.',
    cssSelectorSyntax: 'Syntaxe des sélecteurs CSS',
    cssSelectorSyntaxDesc: 'Créez des éléments DOM avec une syntaxe familière de sélecteurs CSS.',
    pulseFileSyntax: 'Syntaxe des fichiers .pulse',
    pulseFileSyntaxDesc: 'Le DSL .pulse offre une façon propre et déclarative d\'écrire des composants.',
    blocks: 'Blocs',
    imports: 'Imports',
    directives: 'Directives',
    slots: 'Slots (Projection de contenu)',
    slotsDesc: 'Utilisez les slots pour composer des composants avec du contenu dynamique.',
    cssScoping: 'Portée CSS',
    cssScopingDesc: 'Les styles dans les fichiers .pulse sont automatiquement scopés au composant.',
    advancedRouting: 'Routage avancé',
    advancedRoutingDesc: 'Le routeur Pulse supporte le lazy loading, les middlewares et le code splitting.',
    lazyLoading: 'Chargement différé',
    lazyLoadingDesc: 'Chargez les composants de route à la demande pour réduire la taille initiale.',
    middleware: 'Middleware',
    middlewareDesc: 'Middleware style Koa pour un contrôle flexible de la navigation.',
    nextApiReference: 'Suivant : Référence API →'
  },

  // API Reference page
  apiReference: {
    title: '📖 Référence API',
    searchPlaceholder: 'Rechercher dans l\'API... (ex: pulse, effect, router)',
    filter: 'Filtrer :',
    categories: {
      all: 'Tout',
      types: 'Types',
      reactivity: 'Réactivité',
      dom: 'DOM',
      router: 'Routeur',
      store: 'Store',
      hmr: 'HMR'
    },
    typescriptSupport: 'Support TypeScript',
    typescriptSupportDesc: 'Pulse inclut des définitions TypeScript complètes pour l\'autocomplétion IDE.',
    reactivity: 'Réactivité',
    reactivityDesc: 'Système de réactivité basé sur les signaux.',
    domSection: 'DOM',
    domSectionDesc: 'Helpers pour créer et manipuler le DOM.',
    routerSection: 'Routeur',
    routerSectionDesc: 'Routeur SPA avec routes imbriquées et guards.',
    storeSection: 'Store',
    storeSectionDesc: 'Gestion d\'état global.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Remplacement de module à chaud.',
    resultsFound: 'résultat(s) trouvé(s)',
    noResults: 'Aucun résultat trouvé',
    nextMobile: 'Suivant : Apps mobiles →'
  },

  // Examples page
  examples: {
    title: '✨ Exemples',
    intro: 'Explorez ces applications exemples pour voir Pulse en action.',

    // Example cards
    hmrDemo: {
      title: 'Démo HMR',
      desc: 'Remplacement de module à chaud avec préservation d\'état.',
      features: ['État préservé pendant HMR', 'Nettoyage auto des effets', 'Changement de thème', 'Persistance des notes', 'Compteur de mises à jour HMR']
    },
    blog: {
      title: '📰 Blog',
      desc: 'Application blog complète avec CRUD, catégories et recherche.',
      features: ['Opérations CRUD', 'Filtrage par catégorie', 'Fonctionnalité de recherche', 'Mode clair/sombre', 'Design responsive']
    },
    todoApp: {
      title: '📝 App Todo',
      desc: 'Application todo complète avec mode sombre et persistance.',
      features: ['Ajouter, modifier, supprimer', 'Filtrer par statut', 'Mode sombre', 'Persistance LocalStorage', 'Suivi de progression']
    },
    weatherApp: {
      title: '🌤️ App Météo',
      desc: 'Application météo en temps réel avec l\'API Open-Meteo.',
      features: ['Recherche de ville', 'Conditions actuelles', 'Prévisions 7 jours', 'Villes favorites', 'Bascule °C/°F']
    },
    ecommerce: {
      title: '🛒 Boutique E-commerce',
      desc: 'Expérience shopping complète avec panier et checkout.',
      features: ['Catalogue produits', 'Recherche et filtres', 'Panier d\'achat', 'Flux de paiement', 'Persistance LocalStorage']
    },
    chatApp: {
      title: '💬 App Chat',
      desc: 'Messagerie en temps réel avec salons et utilisateurs simulés.',
      features: ['Plusieurs salons', 'Présence utilisateur', 'Réponses bot simulées', 'Sélecteur d\'emoji', 'Persistance des messages']
    },
    routerDemo: {
      title: '🧭 Démo Routeur',
      desc: 'Routage SPA avec navigation, guards et routes dynamiques.',
      features: ['Paramètres de route', 'Query strings', 'Guards de route', 'Style lien actif', 'Routes protégées']
    },
    storeDemo: {
      title: '📝 Démo Store',
      desc: 'Gestion d\'état global avec le système Store de Pulse.',
      features: ['createStore avec persistance', 'Actions et getters', 'Annuler/Rétablir', 'Stores modulaires', 'Plugin Logger']
    },
    dashboard: {
      title: '📊 Dashboard Admin',
      desc: 'Interface admin complète démontrant toutes les fonctionnalités.',
      features: ['Auth et guards', 'Graphiques, tableaux, modales', 'Opérations CRUD', 'Thèmes et paramètres', 'Toutes les fonctionnalités réactives']
    },

    viewDemo: 'Voir la démo →',
    viewSource: 'Voir le code',
    runLocally: 'Exécuter les exemples localement',
    runLocallyDesc: 'Pour exécuter les projets exemples sur votre machine :',
    createYourOwn: 'Créez le vôtre',
    createYourOwnDesc: 'Démarrez un nouveau projet Pulse :',
    mobileExamples: '📱 Exemples mobiles',
    mobileExamplesDesc: 'Pulse peut aussi tourner sur des plateformes mobiles via WebView.'
  },

  // Playground page
  playground: {
    title: '🎮 Bac à sable',
    intro: 'Écrivez du code Pulse et voyez les résultats instantanément.',
    codeEditor: '📝 Éditeur de code',
    preview: '👁️ Aperçu',
    run: '▶ Exécuter',
    reset: '↺ Réinitialiser',
    templates: '📋 Modèles rapides',
    ready: 'Prêt',
    running: 'Exécution...',
    success: '✓ Succès',
    error: '✗ Erreur',

    // Template names
    templateCounter: 'Compteur',
    templateTodo: 'Liste Todo',
    templateTimer: 'Minuteur',
    templateForm: 'Formulaire',
    templateCalculator: 'Calculatrice',
    templateTabs: 'Onglets',
    templateTheme: 'Thème',
    templateSearch: 'Recherche',
    templateCart: 'Panier',
    templateAnimation: 'Animation'
  },

  // Debugging page
  debugging: {
    title: '🔍 Débogage',
    intro: 'Outils et techniques pour déboguer les applications Pulse.',
    sourceMaps: 'Source Maps',
    sourceMapsDesc: 'Pulse v1.4.9+ génère des source maps V3 pour les fichiers .pulse compilés.',
    enablingSourceMaps: 'Activer les Source Maps',
    viteIntegration: 'Intégration Vite',
    viteIntegrationDesc: 'Le plugin Vite génère automatiquement les source maps en mode développement.',
    usingSourceMaps: 'Utiliser les Source Maps dans DevTools',
    usingSourceMapsSteps: [
      'Ouvrez Chrome/Firefox DevTools (F12)',
      'Allez dans l\'onglet Sources',
      'Trouvez vos fichiers .pulse dans l\'arbre',
      'Placez des points d\'arrêt sur les lignes originales',
      'Les stack traces montreront les numéros de ligne originaux'
    ],
    loggerApi: 'API Logger',
    loggerApiDesc: 'Utilisez le logger intégré pour une sortie de débogage structurée.',
    logLevels: 'Niveaux de log',
    reactivityDebugging: 'Débogage de la réactivité',
    reactivityDebuggingDesc: 'Techniques pour déboguer l\'état réactif et les effets.',
    trackingDependencies: 'Suivi des dépendances',
    debuggingComputed: 'Déboguer les valeurs calculées',
    batchDebugging: 'Déboguer les batches',
    routerDebugging: 'Déboguer le routeur',
    routerDebuggingDesc: 'Déboguer la navigation et le matching de routes.',
    hmrDebugging: 'Déboguer le HMR',
    hmrDebuggingDesc: 'Déboguer les problèmes de Hot Module Replacement.',
    commonErrors: 'Erreurs courantes',
    performanceProfiling: 'Profilage de performance',
    performanceProfilingDesc: 'Conseils pour identifier les goulots d\'étranglement.',
    nextApiReference: 'Suivant : Référence API →'
  },

  // Security page
  security: {
    title: '🔒 Sécurité',
    intro: 'Bonnes pratiques pour construire des applications Pulse sécurisées.',
    xssPrevention: 'Prévention XSS',
    xssPreventionDesc: 'Le Cross-Site Scripting (XSS) est l\'une des vulnérabilités web les plus courantes.',
    safeByDefault: 'Sécurisé par défaut : Contenu texte',
    safeByDefaultDesc: 'La fonction el() avec des enfants string échappe automatiquement le HTML.',
    dangerousInnerHtml: 'Dangereux : innerHTML',
    dangerousInnerHtmlDesc: 'N\'utilisez jamais innerHTML avec du contenu non fiable.',
    safePatterns: 'Patterns sécurisés pour le contenu dynamique',
    urlSanitization: 'Assainissement des URLs',
    urlSanitizationDesc: 'Assainissez toujours les URLs fournies par l\'utilisateur.',
    formSecurity: 'Sécurité des formulaires',
    formSecurityDesc: 'Gestion sécurisée des données de formulaire.',
    inputValidation: 'Validation des entrées',
    sensitiveData: 'Données sensibles',
    csp: 'Content Security Policy',
    cspDesc: 'En-têtes CSP recommandés pour les applications Pulse.',
    apiSecurity: 'Sécurité des API',
    apiSecurityDesc: 'Patterns sécurisés pour la récupération de données.',
    securityChecklist: 'Checklist de sécurité',
    nextPerformance: 'Suivant : Guide de performance'
  },

  // Performance page
  performance: {
    title: '⚡ Performance',
    intro: 'Optimisez vos applications Pulse pour une performance maximale.',
    lazyComputed: 'Valeurs calculées différées',
    lazyComputedDesc: 'Par défaut, les valeurs calculées s\'évaluent immédiatement. Utilisez l\'évaluation différée pour les calculs coûteux.',
    whenToUseLazy: 'Quand utiliser le différé',
    listKeying: 'Clés de liste',
    listKeyingDesc: 'Un bon keying est critique pour la performance des listes.',
    goodVsBadKeys: 'Bonnes vs mauvaises clés',
    performanceImpact: 'Impact sur la performance',
    batchingUpdates: 'Regroupement des mises à jour',
    batchingUpdatesDesc: 'Regroupez plusieurs changements d\'état pour éviter les re-rendus intermédiaires.',
    automaticBatching: 'Regroupement automatique',
    memoization: 'Mémoïsation',
    memoizationDesc: 'Cachez les calculs coûteux pour éviter le travail redondant.',
    lazyLoadingRoutes: 'Chargement différé des routes',
    lazyLoadingRoutesDesc: 'Divisez votre app en chunks chargés à la demande.',
    avoidUnnecessaryReactivity: 'Éviter la réactivité inutile',
    avoidUnnecessaryReactivityDesc: 'Tout n\'a pas besoin d\'être réactif.',
    effectOptimization: 'Optimisation des effets',
    effectOptimizationDesc: 'Gardez les effets rapides et ciblés.',
    resourceCaching: 'Cache des ressources',
    resourceCachingDesc: 'Utilisez les fonctionnalités de cache du module async.',
    performanceMonitoring: 'Monitoring de performance',
    performanceMonitoringDesc: 'Utilisez le module devtools pour surveiller la performance.',
    performanceChecklist: 'Checklist de performance',
    nextErrorHandling: 'Suivant : Gestion des erreurs'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Gestion des erreurs',
    intro: 'Stratégies robustes de gestion des erreurs pour les applications Pulse.',
    effectErrorHandling: 'Gestion des erreurs dans les effets',
    effectErrorHandlingDesc: 'Les effets peuvent échouer. Gérez les erreurs gracieusement.',
    perEffectHandler: 'Handler d\'erreur par effet',
    globalEffectHandler: 'Handler d\'erreur global pour les effets',
    asyncErrorHandling: 'Gestion des erreurs async',
    asyncErrorHandlingDesc: 'Le module async fournit une gestion d\'état d\'erreur intégrée.',
    formValidation: 'Erreurs de validation de formulaire',
    formValidationDesc: 'Gérez la validation de formulaire avec le module form.',
    routerErrorHandling: 'Gestion des erreurs du routeur',
    routerErrorHandlingDesc: 'Gérez les erreurs de navigation et de chargement de routes.',
    errorBoundaries: 'Limites d\'erreur',
    errorBoundariesDesc: 'Contenez les erreurs pour éviter les crashs de toute l\'app.',
    errorLogging: 'Logging et reporting d\'erreurs',
    errorLoggingDesc: 'Intégrez avec des services de suivi d\'erreurs.',
    gracefulDegradation: 'Dégradation gracieuse',
    gracefulDegradationDesc: 'Patterns pour maintenir la fonctionnalité quand des parties échouent.',
    errorPatternsSummary: 'Résumé des patterns de gestion d\'erreurs',
    nextApiReference: 'Suivant : Référence API'
  },

  // Mobile page
  mobile: {
    title: '📱 Développement mobile',
    intro: 'Construisez des apps Android et iOS natives depuis votre projet Pulse.',
    gettingStarted: 'Démarrage',
    gettingStartedDesc: 'Configurez votre environnement de développement mobile.',
    platformDetection: 'Détection de plateforme',
    platformDetectionDesc: 'Détectez la plateforme actuelle et adaptez le comportement.',
    nativeStorage: 'Stockage natif',
    nativeStorageDesc: 'Stockage persistant qui fonctionne sur web et natif.',
    deviceInfo: 'Info de l\'appareil',
    deviceInfoDesc: 'Accédez aux informations de l\'appareil et à l\'état du réseau.',
    nativeUi: 'UI native',
    nativeUiDesc: 'Accédez aux éléments d\'UI natifs comme les toasts et la vibration.',
    appLifecycle: 'Cycle de vie de l\'app',
    appLifecycleDesc: 'Gérez les événements de pause, reprise et bouton retour.',
    buildingApps: 'Construction d\'apps',
    buildingAppsDesc: 'Construisez et empaquetez votre app pour la distribution.',
    overview: 'Vue d\'ensemble',
    overviewDesc: 'Pulse Mobile vous permet de packager votre app web en app mobile native sans dépendances externes.',
    features: {
      zeroDeps: '🚀 Zéro dépendances',
      zeroDepsDesc: 'Code natif pur, pas de packages npm nécessaires',
      singleCodebase: '📦 Base de code unique',
      singleCodebaseDesc: 'La même app Pulse tourne sur web, Android et iOS',
      nativePerf: '⚡ Performance native',
      nativePerfDesc: 'WebView avec accélération matérielle',
      nativeApis: '🔧 APIs natives',
      nativeApisDesc: 'Accès au stockage, infos appareil, presse-papiers, et plus'
    },
    quickStart: 'Démarrage rapide',
    cliCommands: 'Commandes CLI',
    configuration: 'Configuration',
    configurationDesc: 'Le fichier pulse.mobile.json configure votre app mobile.',
    nativeApis: 'APIs natives',
    requirements: 'Prérequis',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Suivant : Exemples →',
    nextChangelog: 'Suivant : Historique des versions'
  },

  // Changelog page
  changelog: {
    title: '📋 Historique des versions',
    intro: 'Mises à jour et améliorations récentes de Pulse Framework.',
    version: 'Version',
    releaseDate: 'Date de sortie',
    changes: 'Changements',
    added: 'Ajouté',
    changed: 'Modifié',
    fixed: 'Corrigé',
    removed: 'Supprimé',
    deprecated: 'Déprécié',
    security: 'Sécurité',
    breaking: 'Changement majeur',
    features: 'Fonctionnalités',
    bugFixes: 'Corrections de bugs',
    improvements: 'Améliorations',
    documentation: 'Documentation',
    performance: 'Performance',
    tests: 'Tests'
  }
};
