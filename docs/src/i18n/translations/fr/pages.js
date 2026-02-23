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
    // Stats section
    stats: {
      gzipped: 'Compressé',
      dependencies: 'Dépendances',
      buildTime: 'Temps de build',
      a11yBuiltIn: 'A11y intégré'
    },
    // Quick Start section
    quickStart: {
      title: 'Démarrage rapide',
      desc: 'Soyez opérationnel en quelques secondes avec une seule commande.',
      terminal: 'Terminal',
      copy: 'Copier',
      copied: 'Copié !',
      createProject: 'Créer un nouveau projet',
      navigate: 'S\'y rendre',
      startDev: 'Lancer le serveur de dev'
    },
    // Why Pulse section
    whyPulse: {
      title: 'Pourquoi choisir Pulse ?',
      performance: {
        title: 'Performance',
        desc: 'Réactivité fine avec un overhead minimal. Pas de diffing de DOM virtuel.'
      },
      simplicity: {
        title: 'Simplicité',
        desc: 'Syntaxe intuitive de sélecteurs CSS. Écrivez moins, accomplissez plus.'
      },
      accessibility: {
        title: 'Accessibilité',
        desc: 'Helpers a11y intégrés, attributs ARIA automatiques et outils d\'audit.'
      },
      mobile: {
        title: 'Prêt pour le mobile',
        desc: 'Bridge mobile natif inclus. Créez des apps iOS et Android directement.'
      },
      noBuild: {
        title: 'Pas de build requis',
        desc: 'Fonctionne directement dans le navigateur. Étape de build optionnelle.'
      },
      security: {
        title: 'Sécurité d\'abord',
        desc: 'Protection XSS, sanitization d\'URL et prévention de la pollution de prototype.'
      }
    },
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
      builtIn: 'Intégré',
      accessibility: 'Accessibilité',
      thirdParty: 'Tiers'
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
      a: 'Oui ! Depuis la v1.7.0, Pulse supporte le Server-Side Rendering avec <code>renderToString()</code> et <code>hydrate()</code>. Voir le <a href="/ssr">Guide SSR</a> pour plus de détails.'
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
    pulses: 'Pulses (État réactif)',
    pulsesDesc: 'Un pulse est un conteneur réactif qui notifie les abonnés lorsque sa valeur change.',
    effects: 'Effets',
    effectsDesc: 'Les effets s\'exécutent automatiquement lorsque leurs dépendances changent.',
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
    viewDemo: 'Voir la démo →',
    viewSource: 'Voir le code',
    hmrDemo: {
      title: 'Démo HMR',
      desc: 'Remplacement de module à chaud avec préservation d\'état.',
      features: [
        'Éditer le code sans rafraîchir',
        'État préservé entre les changements',
        'Retour visuel instantané',
        'Rechargement CSS à chaud',
        'Récupération d\'erreur'
      ]
    },
    blog: {
      title: 'Blog',
      desc: 'Blog complet avec articles et catégories.',
      features: [
        'Opérations CRUD',
        'Filtrage par catégorie',
        'Fonctionnalité de recherche',
        'Support Markdown',
        'Design responsive'
      ]
    },
    todoApp: {
      title: 'App Todo',
      desc: 'Liste de tâches classique avec persistance locale.',
      features: [
        'Ajouter/modifier/supprimer des tâches',
        'Filtrer par statut',
        'Synchronisation localStorage',
        'Glisser-déposer',
        'Raccourcis clavier'
      ]
    },
    weatherApp: {
      title: 'App Météo',
      desc: 'Tableau de bord météo avec intégration API.',
      features: [
        'Météo actuelle',
        'Prévisions multi-jours',
        'Recherche de lieu',
        'Unités de température',
        'Icônes météo'
      ]
    },
    ecommerce: {
      title: 'E-Commerce',
      desc: 'Catalogue de produits avec panier et paiement.',
      features: [
        'Liste de produits',
        'Panier d\'achat',
        'Flux de paiement',
        'Historique des commandes',
        'Design responsive'
      ]
    },
    chatApp: {
      title: 'App Chat',
      desc: 'Interface de chat en temps réel avec historique.',
      features: [
        'Messages en temps réel',
        'Présence utilisateur',
        'Historique des messages',
        'Indicateurs de frappe',
        'Support emoji'
      ]
    },
    routerDemo: {
      title: 'Démo Routeur',
      desc: 'Routage SPA avec routes imbriquées.',
      features: [
        'Modes hash et history',
        'Paramètres dynamiques',
        'Guards de route',
        'Chargement différé',
        'Routes imbriquées'
      ]
    },
    storeDemo: {
      title: 'Démo Store',
      desc: 'Gestion d\'état global avec persistance.',
      features: [
        'État centralisé',
        'Actions et getters',
        'Synchronisation localStorage',
        'Annuler/rétablir',
        'Support DevTools'
      ]
    },
    dashboard: {
      title: 'Tableau de bord',
      desc: 'Tableau de bord admin avec graphiques et tableaux.',
      features: [
        'Visualisation de données',
        'Tableaux triables',
        'Filtres et recherche',
        'Mise en page responsive',
        'Mode sombre'
      ]
    },
    sportsNews: {
      title: 'Actualités Sportives',
      desc: 'App de news avec client HTTP et récupération réactive.',
      features: [
        'Intégration client HTTP',
        'Filtrage par catégorie',
        'Recherche avec debounce',
        'Système de favoris',
        'Mode sombre'
      ]
    },
    lessDemo: {
      title: 'Démo LESS CSS',
      desc: 'Démontre le support du préprocesseur LESS avec variables, mixins, guards et fonctions de couleur.',
      features: [
        'Variables et opérations LESS',
        'Mixins paramétriques avec guards',
        'Fonctions de couleur (lighten, darken)',
        'Imbrication et sélecteur parent',
        'Changement de thème dynamique'
      ]
    },
    stylusDemo: {
      title: 'Démo Stylus CSS',
      desc: 'Présente le préprocesseur Stylus avec syntaxe flexible, mixins sans accolades et ponctuation minimale.',
      features: [
        'Variables sans $ ou @',
        'Syntaxe flexible (pas besoin d\'accolades)',
        'Mixins et imbrication',
        'Opérations mathématiques',
        'Dégradés et animations'
      ]
    },
    webpackDemo: {
      title: 'Intégration Webpack',
      desc: 'Démontre le loader Webpack de Pulse avec HMR, extraction CSS et prétraitement SASS.',
      features: [
        'Intégration loader Webpack 5',
        'Hot Module Replacement (HMR)',
        'Extraction CSS avec style-loader',
        'Support du prétraitement SASS',
        'Source maps pour le débogage'
      ]
    },
    rollupDemo: {
      title: 'Intégration Rollup',
      desc: 'Montre le plugin Rollup de Pulse avec tree-shaking, extraction CSS et builds optimisés.',
      features: [
        'Intégration plugin Rollup 4+',
        'Extraction CSS vers fichier séparé',
        'Tree-shaking des modules ES',
        'Support du prétraitement SASS',
        'Mode watch pour le développement'
      ]
    },
    esbuildDemo: {
      title: 'Intégration ESBuild',
      desc: 'Montre le plugin ESBuild de Pulse avec builds ultra-rapides, extraction CSS et mode watch.',
      features: [
        'Intégration plugin ESBuild',
        'Builds incrémentaux ultra-rapides',
        'Extraction CSS vers fichier séparé',
        'Support du prétraitement SASS',
        'Serveur de dev intégré'
      ]
    },
    parcelDemo: {
      title: 'Intégration Parcel',
      desc: 'Démontre le transformer Parcel avec bundling sans configuration, HMR, et prétraitement CSS.',
      features: [
        'Intégration transformer Parcel',
        'Bundling sans configuration',
        'Remplacement de module à chaud (HMR)',
        'Extraction CSS vers pipeline Parcel',
        'Support SASS/LESS/Stylus'
      ]
    },
    electronApp: {
      title: 'Application Electron',
      desc: 'Application de bureau de notes construite avec Electron et Pulse.',
      features: [
        'Application de bureau avec Electron',
        'Gestion de notes avec persistance',
        'Integration barre systeme',
        'Acces natif au systeme de fichiers',
        'Multiplateforme (Windows, macOS, Linux)'
      ]
    },
    serverActions: {
      title: 'Actions Serveur',
      desc: 'Actions Serveur avec limitation de debit par token bucket et protection CSRF.',
      features: [
        'Mecanisme RPC Actions Serveur',
        'Limitation de debit token bucket',
        'Validation de jeton CSRF',
        'Integration middleware Express',
        'Limites par action et par utilisateur'
      ]
    },
    sassDemo: {
      title: 'SASS/SCSS Demo',
      desc: 'SASS/SCSS preprocessor with variables, mixins, extend, and color functions.',
      features: [
        '$variables for colors and spacing',
        '@mixin / @include reusable styles',
        '@extend with placeholder selectors',
        'Color functions (lighten, darken)',
        '@each loop for theme generation'
      ]
    },
    formValidation: {
      title: 'Form Validation',
      desc: 'Form validation with sync/async validators, file upload, and draft persistence.',
      features: [
        'useForm() with validation schema',
        'Async username availability check',
        'File upload with drag-and-drop',
        'Draft auto-save to localStorage',
        'Password strength indicator'
      ]
    },
    a11yShowcase: {
      title: 'Vitrine Accessibilité',
      desc: 'Démo interactive des fonctionnalités a11y : widgets ARIA, gestion du focus, annonces et vérification du contraste.',
      features: [
        'Widgets ARIA (modal, onglets, accordéon, menu)',
        'Piège de focus et tabindex itinérant',
        'Annonces pour lecteurs d\'écran',
        'Détection des préférences utilisateur',
        'Vérificateur de contraste WCAG'
      ]
    },
    graphqlDemo: {
      title: 'Client GraphQL',
      desc: 'Application blog avec requêtes GraphQL, mutations, cache SWR et mises à jour optimistes.',
      features: [
        'useQuery() avec variables réactives',
        'useMutation() avec états de chargement',
        'Cache de requêtes style SWR',
        'Invalidation du cache et rafraîchissement',
        'Backend GraphQL simulé'
      ]
    },
    contextApi: {
      title: 'API Context',
      desc: 'Contextes thème, auth et locale avec fournisseurs imbriqués et injection de dépendances.',
      features: [
        'createContext() et useContext()',
        'Valeurs de contexte réactives avec pulses',
        'provideMany() pour contextes multiples',
        'Surcharge de fournisseurs imbriqués',
        'Patrons thème, auth et i18n'
      ]
    },
    ssrDemo: {
      title: 'Rendu Côté Serveur',
      desc: 'Démo SSR avec renderToString, hydratation, sérialisation d\'état et patrons SSR-safe.',
      features: [
        'Démo live de renderToStringSync()',
        'Sérialisation et transfert d\'état',
        'Rendu ClientOnly / ServerOnly',
        'Patrons de configuration Express',
        'Suivi du statut d\'hydratation'
      ]
    },
    asyncPatterns: {
      title: 'Patrons Asynchrones',
      desc: 'Primitives async : useAsync, cache SWR, polling en direct et gestion des conditions de course.',
      features: [
        'useAsync() avec chargement/erreur/annulation',
        'useResource() cache SWR',
        'usePolling() pour données en direct',
        'Prévention des conditions de course',
        'Réessai configurable avec backoff'
      ]
    },
    runLocally: 'Exécuter les exemples localement',
    runLocallyDesc: 'Clonez le dépôt et lancez n\'importe quel exemple avec le serveur de dev :',
    createYourOwn: 'Créez le vôtre',
    createYourOwnDesc: 'Démarrez un nouveau projet Pulse avec le CLI :',
    mobileExamples: 'Exemples mobiles',
    mobileExamplesDesc: 'Exemples démontrant les fonctionnalités mobiles natives :'
  },

  // Showroom page
  showroom: {
    title: '🖼️ Vitrine',
    intro: 'Parcourez et prévisualisez tous les exemples Pulse en un seul endroit. Sélectionnez un exemple pour le charger ci-dessous.',
    selectLabel: 'Choisir un exemple',
    openNewTab: 'Ouvrir dans un nouvel onglet',
    categoryApps: 'Applications',
    categoryCss: 'Préprocesseurs CSS',
    categoryTools: 'Outils de build',
    categoryAdvanced: 'Avancé'
  },

  // Playground page
  playground: {
    title: '🎮 Bac à sable',
    intro: 'Écrivez du code Pulse et voyez les résultats instantanément.',
    codeEditor: '📝 Éditeur de code',
    preview: '👁️ Aperçu',
    run: '▶ Exécuter',
    reset: '↺ Réinitialiser',
    share: 'Partager',
    templates: '📋 Modèles rapides',
    ready: 'Prêt',
    running: 'Exécution...',
    success: '✓ Succès',
    errorPrefix: 'Erreur :',

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
    checklist: 'Checklist de sécurité',
    nextPerformance: 'Suivant : Guide de performance'
  },

  // Internals page
  internals: {
    title: '⚙️ Fonctionnement interne',
    intro: 'Plongée dans les algorithmes et détails d\'implémentation de Pulse. Destiné aux contributeurs, utilisateurs avancés et curieux.',

    // LIS Algorithm section
    lisAlgorithm: 'Diffing de listes (Algorithme LIS)',
    lisDesc: 'Lors de la mise à jour d\'une liste réactive, Pulse utilise l\'algorithme de la Plus Longue Sous-séquence Croissante (LIS) pour minimiser les opérations DOM.',
    whyLis: 'Pourquoi LIS ?',
    whyLisDesc: 'L\'idée clé est que certains éléments sont déjà dans le bon ordre relatif. En identifiant ceux qui n\'ont pas besoin de bouger, on ne repositionne que les autres.',
    lisOverview: 'Aperçu de l\'algorithme (O(n log n))',
    lisOverviewDesc: 'L\'algorithme utilise la recherche binaire pour calculer efficacement quels items peuvent rester en place :',

    // Reconciliation phases
    reconciliationPhases: 'Phases de réconciliation',
    phasesCaption: 'Phases de mise à jour et leur complexité',
    phase: 'Phase',
    operation: 'Opération',
    complexity: 'Complexité',
    keyExtraction: 'Mapper les items vers des clés uniques',
    diffPhase: 'Identifier ajouts/suppressions/déplacements',
    removePhase: 'Supprimer les nœuds DOM',
    createPhase: 'Création en lot via DocumentFragment',
    lisPhase: 'Calculer les items stables',
    reorderPhase: 'Déplacer les items hors LIS',

    // Performance by case
    performanceByCase: 'Performance par scénario',
    scenarioCaption: 'Opérations DOM par type de mise à jour',
    scenario: 'Scénario',
    domOps: 'Opérations DOM',
    notes: 'Notes',
    appendItems: 'Ajouter des items',
    appendNote: 'Un seul insert de DocumentFragment',
    prependItems: 'Préfixer des items',
    prependNote: 'Items existants dans LIS',
    removeItems: 'Supprimer des items',
    removeNote: 'Aucun déplacement nécessaire',
    reverseList: 'Inverser la liste',
    reverseNote: 'LIS = 1, tout bouge',
    randomShuffle: 'Mélange aléatoire',
    shuffleNote: 'Typiquement 30-50% bougent',
    moveSingle: 'Déplacer un item',
    moveNote: 'LIS couvre n-1 items',

    // Selector Cache section
    selectorCache: 'Cache des sélecteurs (LRU)',
    selectorCacheDesc: 'La fonction parseSelector() met en cache les résultats parsés via un cache LRU (Least Recently Used) pour optimiser le parsing répété.',
    whyLru: 'Pourquoi LRU plutôt que Map ?',
    cacheComparisonCaption: 'Comparaison des stratégies de cache',
    approach: 'Approche',
    memory: 'Mémoire',
    longRunning: 'Apps longue durée',
    noCache: 'Pas de cache',
    minimal: 'Minimale',
    unboundedMap: 'Map non bornée',
    growsForever: 'Croît indéfiniment',
    memoryLeak: 'Risque de fuite mémoire',
    bounded: 'Bornée',
    hotCached: 'Sélecteurs fréquents en cache',
    cacheConfig: 'Configuration',
    cacheSafety: 'Sécurité du cache',
    cacheSafetyDesc: 'Le cache retourne des copies superficielles pour éviter la mutation des valeurs en cache :',
    lruEviction: 'Comportement d\'éviction LRU',

    // Conditional Lifecycle section
    conditionalLifecycle: 'Cycle de vie du rendu conditionnel',
    conditionalLifecycleDesc: 'Les fonctions when() et match() gèrent le cleanup des effets pour éviter les fuites mémoire et les souscriptions obsolètes.',
    cleanupGuarantees: 'Garanties de cleanup',
    nodesRemoved: 'Nœuds DOM supprimés',
    nodesRemovedDesc: 'Les nœuds de la branche précédente sont retirés du DOM',
    cleanupCalled: 'Fonctions de cleanup appelées',
    cleanupCalledDesc: 'Tout cleanup retourné par le rendu précédent s\'exécute',
    stateReset: 'État réinitialisé',
    stateResetDesc: 'Les tableaux de suivi internes sont vidés',
    lifecycleDiagram: 'Diagramme du cycle de vie',

    // when vs show
    whenVsShow: 'Comparaison when() vs show()',
    whenVsShowCaption: 'Choisir entre les méthodes de rendu conditionnel',
    feature: 'Fonctionnalité',
    domPresence: 'Présence DOM',
    addsRemoves: 'Ajoute/supprime les nœuds',
    alwaysInDom: 'Toujours dans le DOM (display: none)',
    effects: 'Effets',
    createdDisposed: 'Créés/supprimés par branche',
    alwaysActive: 'Toujours actifs',
    memoryUsage: 'Mémoire',
    lowerWhenHidden: 'Plus basse quand masqué',
    constant: 'Constante',
    transitions: 'Transitions',
    harder: 'Plus difficile (recréation)',
    easier: 'Plus facile (CSS)',
    formState: 'État du formulaire',
    lostOnHide: 'Perdu au masquage',
    preserved: 'Préservé',
    useCase: 'Cas d\'usage',
    complexConditional: 'UI conditionnelle complexe',
    simpleToggle: 'Simple bascule de visibilité',
    cleanupPattern: 'Pattern de cleanup',

    // Effect Scheduling section
    effectScheduling: 'Ordonnancement des effets',
    effectSchedulingDesc: 'Les effets dans Pulse sont ordonnancés de manière synchrone mais peuvent être regroupés pour éviter les exécutions redondantes.',
    executionModel: 'Modèle d\'exécution',
    circularProtection: 'Protection contre les dépendances circulaires',
    circularProtectionDesc: 'Les effets qui se déclenchent eux-mêmes sont détectés et limités à 100 itérations :',
    cleanupTiming: 'Timing du cleanup des effets',
    nestedEffects: 'Effets imbriqués',
    nestedEffectsDesc: 'Les effets peuvent être imbriqués. Les effets internes sont automatiquement supprimés quand l\'effet externe se réexécute.',

    // Navigation
    nextPerformance: 'Suivant : Guide de performance →'
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
    batching: 'Regroupement des mises à jour',
    batchingDesc: 'Regroupez plusieurs changements d\'état pour éviter les re-rendus intermédiaires.',
    automaticBatching: 'Regroupement automatique',
    memoization: 'Mémoïsation',
    memoizationDesc: 'Cachez les calculs coûteux pour éviter le travail redondant.',
    lazyRoutes: 'Chargement différé des routes',
    lazyRoutesDesc: 'Divisez votre app en chunks chargés à la demande.',
    avoidReactivity: 'Éviter la réactivité inutile',
    avoidReactivityDesc: 'Tout n\'a pas besoin d\'être réactif.',
    effectOptimization: 'Optimisation des effets',
    effectOptimizationDesc: 'Gardez les effets rapides et ciblés.',
    resourceCaching: 'Cache des ressources',
    resourceCachingDesc: 'Utilisez les fonctionnalités de cache du module async.',
    monitoring: 'Monitoring de performance',
    monitoringDesc: 'Utilisez le module devtools pour surveiller la performance.',
    checklist: 'Checklist de performance',
    nextErrorHandling: 'Suivant : Gestion des erreurs'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Gestion des erreurs',
    intro: 'Stratégies robustes de gestion des erreurs pour les applications Pulse.',
    effectErrors: 'Erreurs dans les effets',
    asyncErrors: 'Erreurs async',
    formErrors: 'Erreurs de formulaire',
    routerErrors: 'Erreurs du routeur',
    boundaries: 'Limites d\'erreur',
    logging: 'Logging et reporting',
    gracefulDegradation: 'Dégradation gracieuse',
    summary: 'Résumé',
    nextApiReference: 'Suivant : Référence API →'
  },

  // HTTP page
  http: {
    title: '🌐 Client HTTP',
    intro: 'Client HTTP sans dépendance pour vos requêtes API. Basé sur fetch natif avec intercepteurs, retry, timeout et intégration réactive.',
    quickStart: 'Démarrage rapide',
    quickStartDesc: 'Importez et utilisez le client HTTP :',
    configuration: 'Configuration',
    configurationDesc: 'Configurez les paramètres par défaut pour toutes les requêtes :',
    httpMethods: 'Méthodes HTTP',
    responseStructure: 'Structure de la réponse',
    interceptors: 'Intercepteurs',
    interceptorsDesc: 'Les intercepteurs permettent de transformer les requêtes et réponses globalement.',
    requestInterceptors: 'Intercepteurs de requête',
    responseInterceptors: 'Intercepteurs de réponse',
    manageInterceptors: 'Gestion des intercepteurs',
    errorHandling: 'Gestion des erreurs',
    errorHandlingDesc: 'Toutes les erreurs sont encapsulées dans HttpError avec des propriétés utiles :',
    errorCodes: 'Codes d\'erreur',
    description: 'Description',
    when: 'Quand',
    errorTimeout: 'Délai dépassé',
    errorTimeoutWhen: 'Le timeout a expiré avant la réponse',
    errorNetwork: 'Erreur réseau',
    errorNetworkWhen: 'Pas de connexion ou serveur inaccessible',
    errorAbort: 'Requête annulée',
    errorAbortWhen: 'AbortController.abort() appelé',
    errorHttp: 'Erreur HTTP',
    errorHttpWhen: 'Status de réponse hors de la plage 2xx',
    errorParse: 'Échec du parsing',
    errorParseWhen: 'Erreur de parsing JSON/blob',
    cancellation: 'Annulation de requête',
    cancellationDesc: 'Annulez les requêtes avec AbortController :',
    retry: 'Configuration du retry',
    retryDesc: 'Réessayez automatiquement les requêtes échouées :',
    reactiveIntegration: 'Intégration réactive',
    reactiveIntegrationDesc: 'Intégrez les requêtes HTTP avec la réactivité Pulse :',
    useHttpResourceDesc: 'Pour les ressources en cache avec le pattern SWR (stale-while-revalidate) :',
    childInstances: 'Instances enfants',
    childInstancesDesc: 'Créez des clients spécialisés qui héritent d\'un parent :',
    fileUpload: 'Upload de fichiers',
    urlParameters: 'Paramètres URL',
    fullExample: 'Exemple complet',
    advancedInterceptors: 'Patterns d\'intercepteurs avancés',
    advancedInterceptorsDesc: 'Patterns d\'intercepteurs pour les cas d\'usage courants :',
    tokenRefresh: 'Authentification avec rafraîchissement de token',
    requestLogging: 'Journalisation des requêtes/réponses',
    cachingRequests: 'Mise en cache des requêtes GET',
    rateLimiting: 'Limitation du débit',
    errorNormalization: 'Normalisation des erreurs'
  },

  // Accessibility page
  accessibility: {
    title: '♿ Accessibilité',
    intro: 'Pulse est conçu avec l\'accessibilité comme fonctionnalité principale, offrant plusieurs couches de support a11y.',
    nextSecurity: 'Suivant : Guide de Sécurité →'
  },

  // Mobile page
  mobile: {
    title: '📱 Développement mobile',
    intro: 'Construisez des apps Android et iOS natives depuis votre projet Pulse.',
    overview: 'Vue d\'ensemble',
    quickStart: 'Démarrage rapide',
    cliCommands: 'Commandes CLI',
    configuration: 'Configuration',
    configurationDesc: 'Le fichier pulse.mobile.json configure votre app mobile.',
    nativeApis: 'APIs natives',
    requirements: 'Prérequis',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Suivant : Exemples →'
  },

  // Migration from React page
  migrationReact: {
    title: '⚛️ Migration depuis React',
    intro: 'Vous venez de React ? Ce guide vous aidera à comprendre les différences clés et à migrer votre modèle mental vers Pulse.',
    quickComparison: 'Comparaison rapide',
    quickComparisonDesc: 'Voici comment React et Pulse se comparent en un coup d\'œil :',
    stateManagement: 'Gestion d\'état',
    stateManagementDesc: 'React utilise les hooks useState, tandis que Pulse utilise des signaux réactifs appelés "pulses".',
    effects: 'Effets et effets de bord',
    effectsDesc: 'Les deux frameworks utilisent des effets, mais Pulse suit automatiquement les dépendances.',
    computed: 'Valeurs calculées',
    computedDesc: 'Le useMemo de React devient computed() de Pulse avec suivi automatique des dépendances.',
    components: 'Composants',
    componentsDesc: 'React utilise des composants JSX, Pulse utilise des fonctions JavaScript simples qui retournent des éléments DOM.',
    conditionalRendering: 'Rendu conditionnel',
    conditionalRenderingDesc: 'React utilise les opérateurs ternaires et &&, Pulse fournit le helper when().',
    lists: 'Rendu de listes',
    listsDesc: 'React utilise map(), Pulse fournit list() avec keying automatique.',
    forms: 'Gestion des formulaires',
    formsDesc: 'Pulse fournit une validation de formulaire intégrée avec useForm().',
    globalState: 'État global',
    globalStateDesc: 'React utilise Context + useContext, Pulse utilise createStore() avec persistance intégrée.',
    routing: 'Routage',
    routingDesc: 'Les deux ont des APIs de routage similaires, mais celui de Pulse est intégré sans dépendances supplémentaires.',
    cheatSheet: 'Aide-mémoire',
    cheatSheetDesc: 'Référence rapide pour les patterns courants :',
    notes: 'Notes',
    cheatState: 'Créer un état réactif',
    cheatSet: 'Définir l\'état directement',
    cheatUpdate: 'Mise à jour fonctionnelle',
    cheatEffect: 'Suivi auto des dépendances',
    cheatComputed: 'Valeur dérivée mémoïsée',
    cheatElement: 'Syntaxe sélecteur CSS',
    cheatList: 'Avec fonction de clé',
    cheatWhen: 'Rendu conditionnel',
    cheatContext: 'Accès au store global',
    cheatRef: 'Référence DOM directe',
    stepByStep: 'Migration étape par étape',
    stepByStepDesc: 'Suivez ces étapes pour migrer votre application React vers Pulse :',
    step1Title: 'Installer Pulse',
    step1Desc: 'Ajoutez Pulse à votre projet à côté de React.',
    step2Title: 'Commencer par les composants feuilles',
    step2Desc: 'Commencez à migrer les petits composants autonomes en premier. Ils sont plus faciles à convertir et à tester.',
    step3Title: 'Convertir la gestion d\'état',
    step3Desc: 'Remplacez useState par pulse() et useEffect par effect(). N\'oubliez pas : pas de tableaux de dépendances nécessaires !',
    step4Title: 'Migrer les composants parents',
    step4Desc: 'Une fois les composants enfants convertis, remontez vers les composants parents.',
    step5Title: 'Supprimer React',
    step5Desc: 'Quand tous les composants sont migrés, supprimez les dépendances React et profitez de votre bundle plus léger !',
    gotchas: 'Pièges courants',
    gotcha1Title: 'N\'utilisez pas get() pour les mises à jour',
    gotcha1Desc: 'Utilisez update() pour les mises à jour fonctionnelles afin d\'éviter les conditions de course.',
    gotcha2Title: 'Utilisez get() dans les effets, pas peek()',
    gotcha2Desc: 'peek() lit sans suivre - utilisez get() pour créer des dépendances.',
    gotcha3Title: 'Ne mutez pas les tableaux/objets',
    gotcha3Desc: 'Créez toujours de nouvelles références lors de la mise à jour des collections.',
    needHelp: 'Besoin d\'aide ?',
    needHelpDesc: 'Des questions sur la migration ? Nous sommes là pour vous aider !',
    discussions: 'Discussions GitHub',
    issues: 'Signaler des problèmes',
    getStarted: 'Commencer avec Pulse',
    viewExamples: 'Voir les exemples',
    tip: 'Conseil',
    stateTip: 'Contrairement à useState, pulse() retourne un seul objet avec les méthodes get(), set() et update().',
    effectTip: 'Pas de tableaux de dépendances ! Pulse suit automatiquement quels pulses sont lus dans les effets.',
    storeTip: 'Les stores Pulse sont plus simples - pas de providers nécessaires, importez et utilisez n\'importe où.'
  },

  // Migration from Angular page
  migrationAngular: {
    title: '🅰️ Migration depuis Angular',
    intro: 'Vous venez d\'Angular ? Ce guide vous aidera à comprendre les différences clés et à adapter votre façon de penser à Pulse.',
    quickComparison: 'Comparaison rapide',
    quickComparisonDesc: 'Voici comment Angular et Pulse se comparent en un coup d\'œil :',
    componentStructure: 'Structure des composants',
    componentStructureDesc: 'Angular utilise des classes décorées avec des templates, tandis que Pulse utilise de simples fonctions JavaScript.',
    propertyBinding: 'Liaison de propriétés et événements',
    propertyBindingDesc: 'Angular utilise une syntaxe spéciale pour les liaisons, Pulse utilise la manipulation DOM directe avec des helpers réactifs.',
    observables: 'Observables vs Pulses',
    observablesDesc: 'Angular repose sur les observables RxJS. Pulse utilise des signaux réactifs plus simples avec suivi automatique des dépendances.',
    dependencyInjection: 'Injection de dépendances',
    dependencyInjectionDesc: 'Angular utilise un système DI complexe. Pulse utilise de simples imports ES modules.',
    directives: 'Directives',
    directivesDesc: 'Les directives structurelles d\'Angular (*ngIf, *ngFor) deviennent des helpers Pulse (when, list).',
    forms: 'Gestion des formulaires',
    formsDesc: 'Angular a les Reactive Forms et les Template-driven forms. Pulse fournit useForm() avec validation intégrée.',
    routing: 'Routage',
    routingDesc: 'Les deux ont des concepts de routage similaires, mais le routeur de Pulse est plus simple et intégré.',
    http: 'Client HTTP',
    httpDesc: 'Le HttpClient d\'Angular utilise des observables. L\'HTTP de Pulse utilise des promesses avec des wrappers réactifs optionnels.',
    pipes: 'Pipes vs Computed',
    pipesDesc: 'Les pipes Angular pour la transformation de données deviennent des valeurs computed dans Pulse.',
    cheatSheet: 'Aide-mémoire',
    cheatSheetDesc: 'Référence rapide pour les patterns courants :',
    notes: 'Notes',
    cheatComponent: 'Pas de décorateurs nécessaires',
    cheatSignal: 'Primitive réactive plus simple',
    cheatEmit: 'Mise à jour directe de la valeur',
    cheatSubscribe: 'Suivi auto, nettoyage auto',
    cheatDerived: 'Pas d\'opérateurs nécessaires',
    cheatIf: 'Rendu conditionnel',
    cheatFor: 'Liste avec keying auto',
    cheatModel: 'Liaison bidirectionnelle',
    cheatBind: 'Liaison de classe réactive',
    cheatService: 'Exportez simplement un store',
    cheatAsync: 'Souscription automatique',
    stepByStep: 'Migration étape par étape',
    stepByStepDesc: 'Suivez ces étapes pour migrer votre application Angular vers Pulse :',
    step1Title: 'Installer Pulse',
    step1Desc: 'Ajoutez Pulse à votre projet. Vous pouvez l\'exécuter en parallèle d\'Angular pendant la migration.',
    step2Title: 'Commencer par les composants feuilles',
    step2Desc: 'Commencez par les petits composants autonomes qui ne dépendent pas des services Angular.',
    step3Title: 'Remplacer les services par des stores',
    step3Desc: 'Convertissez les services Angular en stores Pulse. Remplacez BehaviorSubject par pulse() et les observables par des effects.',
    step4Title: 'Migrer les templates',
    step4Desc: 'Convertissez les templates Angular en fonction el() de Pulse. Remplacez *ngIf par when(), *ngFor par list().',
    step5Title: 'Supprimer Angular',
    step5Desc: 'Une fois tous les composants migrés, supprimez les dépendances Angular. Profitez de votre bundle 95%+ plus léger !',
    gotchas: 'Pièges courants',
    gotcha1Title: 'Pas de désabonnement manuel',
    gotcha1Desc: 'Contrairement à RxJS, les effects de Pulse se nettoient automatiquement. Pas besoin de patterns takeUntil ou unsubscribe.',
    gotcha2Title: 'Pas d\'injection de dépendances',
    gotcha2Desc: 'Utilisez simplement les imports ES. Pas de providers, pas de modules, pas de décorateurs.',
    gotcha3Title: 'Pas de détection de changements',
    gotcha3Desc: 'Oubliez OnPush, markForCheck ou detectChanges. Les mises à jour Pulse sont automatiques et précises.',
    gotcha4Title: 'Pas d\'opérateurs RxJS',
    gotcha4Desc: 'Remplacez les chaînes d\'opérateurs complexes par computed() et async/await. Beaucoup plus simple !',
    needHelp: 'Besoin d\'aide ?',
    needHelpDesc: 'Des questions sur la migration ? Nous sommes là pour vous aider !',
    discussions: 'Discussions GitHub',
    issues: 'Signaler des problèmes',
    getStarted: 'Commencer avec Pulse',
    viewExamples: 'Voir les exemples',
    tip: 'Conseil',
    componentTip: 'Pas de décorateurs, pas de modules, pas de boilerplate. Juste des fonctions qui retournent des éléments DOM.',
    observablesTip: 'Pas de subscribe/unsubscribe ! Les effects suivent automatiquement les dépendances et se nettoient.',
    diTip: 'Pas de providers ni de modules nécessaires. Importez simplement ce dont vous avez besoin, où vous en avez besoin.'
  },

  // Migration from Vue page
  migrationVue: {
    title: '💚 Migration depuis Vue',
    intro: 'Vous venez de Vue ? Ce guide vous aidera à comprendre les différences clés et à adapter votre façon de penser à Pulse.',
    quickComparison: 'Comparaison rapide',
    quickComparisonDesc: 'Voici comment Vue et Pulse se comparent en un coup d\'œil :',
    reactivity: 'Réactivité : ref vs pulse',
    reactivityDesc: 'Vue utilise ref() et reactive() pour la réactivité. Pulse utilise une seule primitive pulse() pour tout état réactif.',
    componentStructure: 'Structure des composants',
    componentStructureDesc: 'Vue utilise des Single File Components (SFCs) avec template, script et style. Pulse utilise de simples fonctions JavaScript.',
    watchers: 'Watchers vs Effects',
    watchersDesc: 'Vue a watch() et watchEffect(). Pulse simplifie cela à juste effect() avec suivi automatique des dépendances.',
    directives: 'Directives de template',
    directivesDesc: 'Les directives v-if, v-for, v-model de Vue deviennent des helpers Pulse : when(), list(), model().',
    propsEvents: 'Props et événements',
    propsEventsDesc: 'Vue utilise defineProps() et defineEmits(). Pulse passe tout comme arguments de fonction.',
    provideInject: 'Provide/Inject vs Stores',
    provideInjectDesc: 'Le provide/inject de Vue et les stores Pinia deviennent de simples exports ES modules dans Pulse.',
    lifecycle: 'Hooks de cycle de vie',
    lifecycleDesc: 'Vue a de nombreux hooks de cycle de vie. Pulse simplifie avec les fonctions de nettoyage des effects.',
    slots: 'Slots',
    slotsDesc: 'Les slots Vue deviennent des props children ou des fonctions de rendu dans Pulse.',
    routing: 'Routage',
    routingDesc: 'Les deux ont des concepts de routage similaires. Le routeur de Pulse est intégré sans dépendances supplémentaires.',
    forms: 'Gestion des formulaires',
    formsDesc: 'Vue utilise v-model pour les formulaires. Pulse fournit useForm() avec validation intégrée.',
    cheatSheet: 'Aide-mémoire',
    cheatSheetDesc: 'Référence rapide pour les patterns courants :',
    notes: 'Notes',
    cheatRef: 'Créer un état réactif',
    cheatRead: 'Lire la valeur',
    cheatWrite: 'Écrire la valeur',
    cheatReactive: 'Les objets utilisent la même API',
    cheatComputed: 'Même concept !',
    cheatWatch: 'API unifiée et plus simple',
    cheatIf: 'Rendu conditionnel',
    cheatFor: 'Liste avec fonction de clé',
    cheatModel: 'Liaison bidirectionnelle',
    cheatEvent: 'Gestion des événements',
    cheatBind: 'Attributs réactifs',
    cheatProvide: 'Exportez simplement des modules',
    stepByStep: 'Migration étape par étape',
    stepByStepDesc: 'Suivez ces étapes pour migrer votre application Vue vers Pulse :',
    step1Title: 'Installer Pulse',
    step1Desc: 'Ajoutez Pulse à votre projet à côté de Vue.',
    step2Title: 'Commencer par les composants feuilles',
    step2Desc: 'Commencez à migrer les petits composants autonomes en premier. Ils sont plus faciles à convertir et à tester.',
    step3Title: 'Convertir l\'état en Pulses',
    step3Desc: 'Remplacez ref() par pulse() et reactive() par pulse(). Remplacez watch/watchEffect par effect().',
    step4Title: 'Migrer les templates',
    step4Desc: 'Convertissez les templates Vue en fonction el() de Pulse. Remplacez v-if par when(), v-for par list().',
    step5Title: 'Supprimer Vue',
    step5Desc: 'Quand tous les composants sont migrés, supprimez les dépendances Vue et profitez de votre bundle 88% plus léger !',
    gotchas: 'Pièges courants',
    gotcha1Title: 'Pas de propriété .value',
    gotcha1Desc: 'Pulse utilise les méthodes get()/set() au lieu de la propriété .value de Vue.',
    gotcha2Title: 'Pas de mutation directe',
    gotcha2Desc: 'Contrairement à reactive() de Vue, Pulse nécessite de créer de nouvelles références pour les objets et tableaux.',
    gotcha3Title: 'Le nettoyage des effects est différent',
    gotcha3Desc: 'Retournez une fonction de nettoyage depuis effect() au lieu d\'utiliser onUnmounted().',
    gotcha4Title: 'Pas de syntaxe de template',
    gotcha4Desc: 'Pulse utilise la syntaxe des sélecteurs CSS avec el() au lieu des templates HTML.',
    needHelp: 'Besoin d\'aide ?',
    needHelpDesc: 'Des questions sur la migration ? Nous sommes là pour vous aider !',
    discussions: 'Discussions GitHub',
    issues: 'Signaler des problèmes',
    getStarted: 'Commencer avec Pulse',
    viewExamples: 'Voir les exemples',
    tip: 'Conseil',
    reactivityTip: 'Contrairement à la séparation ref/reactive de Vue, Pulse utilise un seul pulse() pour toutes les valeurs. Plus besoin de choisir lequel utiliser !',
    componentTip: 'Pas de compilateur SFC nécessaire. Les composants sont juste des fonctions qui retournent des éléments DOM.',
    watchersTip: 'Un seul effect() remplace watch(), watchEffect() et computed() pour les effets de bord. Les dépendances sont toujours automatiques.',
    propsEventsTip: 'Passez les callbacks directement comme props. Pas de cérémonie emit() nécessaire.',
    provideInjectTip: 'Pas de boilerplate provide/inject. Exportez simplement un pulse et importez-le n\'importe où.',
    lifecycleTip: 'Retournez une fonction de nettoyage depuis effect() pour gérer la logique de démontage. Beaucoup plus simple que plusieurs hooks de cycle de vie !'
  },

  // Testing page
  testing: {
    title: '🧪 Tests',
    intro: 'Guide complet pour tester les applications Pulse avec le test runner intégré de Node.js et les utilitaires de test de Pulse.',
    quickStart: 'Démarrage rapide',
    quickStartDesc: 'Pulse utilise le test runner intégré de Node.js sans dépendances supplémentaires.',
    runningTests: 'Exécuter les tests',
    writingTests: 'Écrire des tests',
    writingTestsDesc: 'Les tests peuvent être écrits avec le module de test de Node.js ou les utilitaires de test personnalisés de Pulse.',
    basicStructure: 'Structure de test de base',
    pulseTestUtils: 'Utilitaires de test Pulse',
    pulseTestUtilsDesc: 'Pulse fournit un test runner léger avec assertions, spies et support async.',
    isolatedContexts: 'Contextes réactifs isolés',
    isolatedContextsDesc: 'Utilisez createContext() et withContext() pour isoler l\'état réactif entre les tests.',
    testingReactivity: 'Tester la réactivité',
    testingReactivityDesc: 'Patterns pour tester les pulses, les valeurs calculées et les effets.',
    testingPulses: 'Tester les Pulses',
    testingComputed: 'Tester les valeurs calculées',
    testingEffects: 'Tester les effets',
    testingDom: 'Tester les composants DOM',
    testingDomDesc: 'Tester le rendu DOM sans navigateur avec les utilitaires mock DOM.',
    mockDomSetup: 'Configuration du Mock DOM',
    testingElements: 'Tester les éléments',
    testingLists: 'Tester les listes',
    testingConditionals: 'Tester les conditionnels',
    mockDomAdapter: 'MockDOMAdapter pour les tests',
    mockDomAdapterDesc: 'MockDOMAdapter fournit une abstraction DOM complète pour les tests sans navigateur.',
    testingAsync: 'Tester les opérations async',
    testingAsyncDesc: 'Patterns pour tester la récupération de données async avec useAsync et useResource.',
    testingForms: 'Tester les formulaires',
    testingFormsDesc: 'Tester la validation de formulaires, l\'état des champs et la soumission.',
    testingStore: 'Tester les Stores',
    testingStoreDesc: 'Tester la gestion d\'état global avec createStore, actions et getters.',
    testingRouter: 'Tester le Router',
    testingRouterDesc: 'Tester la correspondance des routes, la navigation et les guards avec l\'API History mockée.',
    testingHttp: 'Tester les requêtes HTTP',
    testingHttpDesc: 'Mocker l\'API fetch pour tester le comportement du client HTTP.',
    testHelpers: 'Référence des helpers de test',
    testHelpersDesc: 'Référence complète de tous les utilitaires de test et assertions.',
    assertions: 'Assertions',
    assertionsCaption: 'Fonctions d\'assertion disponibles',
    function: 'Fonction',
    description: 'Description',
    example: 'Exemple',
    assertDesc: 'Affirmer que la condition est vraie',
    assertEqualDesc: 'Affirmer l\'égalité stricte (===)',
    assertDeepEqualDesc: 'Affirmer l\'égalité profonde (comparaison JSON)',
    assertThrowsDesc: 'Affirmer que la fonction lance une erreur',
    assertThrowsAsyncDesc: 'Affirmer que la fonction async lance une erreur',
    assertTruthyDesc: 'Affirmer que la valeur est truthy',
    assertFalsyDesc: 'Affirmer que la valeur est falsy',
    assertInstanceOfDesc: 'Affirmer la vérification instanceof',
    assertTypeDesc: 'Affirmer la vérification typeof',
    spiesAndMocks: 'Spies et utilitaires de timing',
    coverageReporting: 'Rapports de couverture',
    coverageReportingDesc: 'Générer des rapports de couverture de code pour identifier le code non testé.',
    coverageTips: 'Conseils de couverture',
    coverageTip1: 'Viser une couverture élevée sur la logique métier et les utilitaires',
    coverageTip2: 'Ne pas chercher 100% de couverture - se concentrer sur des tests significatifs',
    coverageTip3: 'Tester les cas limites et les conditions d\'erreur',
    coverageTip4: 'Utiliser la couverture pour identifier le code mort',
    bestPractices: 'Meilleures pratiques',
    practice1Title: '1. Isoler l\'état de test',
    practice1Desc: 'Utiliser des contextes réactifs isolés pour éviter les fuites d\'état entre les tests.',
    practice2Title: '2. Tester le comportement, pas l\'implémentation',
    practice2Desc: 'Se concentrer sur ce que fait votre code, pas comment il le fait en interne.',
    practice3Title: '3. Utiliser des noms de test descriptifs',
    practice3Desc: 'Les noms de test doivent décrire clairement le comportement attendu.',
    practice4Title: '4. Suivre le pattern AAA',
    practice4Desc: 'Structurer les tests avec des sections Arrange, Act, Assert pour plus de clarté.',
    ciIntegration: 'Intégration CI/CD',
    ciIntegrationDesc: 'Exécuter les tests automatiquement dans votre pipeline CI/CD.',
    nextDebugging: 'Suivant : Débogage →'
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
  },

  // Benchmarks page
  benchmarks: {
    title: '📊 Benchmarks',
    intro: 'Tests de performance interactifs qui s\'exécutent directement dans votre navigateur. Cliquez sur "Tout lancer" pour mesurer les performances de Pulse sur votre machine.',
    runAll: 'Tout lancer',
    clear: 'Effacer',
    running: 'En cours',
    clickToRun: 'Cliquez sur "Lancer" pour tester',
    note: 'Note',
    noteText: 'Les résultats varient selon le navigateur, le matériel et la charge système. Exécutez plusieurs fois pour des mesures précises.',

    // Categories
    reactivity: 'Réactivité',
    computed: 'Valeurs calculées',
    effects: 'Effets',
    batching: 'Regroupement',
    dom: 'Opérations DOM',
    advanced: 'Patterns avancés',

    // Comparison table
    comparison: 'Comparaison des frameworks',
    comparisonIntro: 'Comment Pulse se compare-t-il aux autres frameworks ? Lancez les benchmarks ci-dessus pour voir vos résultats réels.',
    metric: 'Métrique',
    bundleSize: 'Taille du bundle (gzip)',
    signalCreate: 'Création de signal',
    signalUpdate: 'Mise à jour de signal',
    dependencies: 'Dépendances',
    buildRequired: 'Build requis',

    // Methodology
    methodology: 'Méthodologie',
    howItWorks: 'Comment fonctionnent les benchmarks',
    warmup: 'Préchauffage',
    warmupText: '10% des itérations sont exécutées d\'abord pour préchauffer la compilation JIT.',
    measurement: 'Mesure',
    measurementText: 'Les opérations s\'exécutent dans une boucle serrée avec chronométrage performance.now().',
    precision: 'Précision',
    precisionText: 'Les résultats montrent ops/sec, temps moyen et temps total.',
    factors: 'Facteurs affectant les résultats',
    factor1: 'Moteur du navigateur (V8 dans Chrome, SpiderMonkey dans Firefox, JSC dans Safari)',
    factor2: 'Charge système et mémoire disponible',
    factor3: 'Mise à l\'échelle de fréquence CPU et throttling thermique',
    factor4: 'Extensions du navigateur et état des DevTools',

    // Navigation
    nextPerformance: 'Suivant : Guide de performance →'
  },

  // WebSocket page
  websocket: {
    title: '🔌 Client WebSocket',
    intro: 'Client WebSocket avec reconnexion automatique, heartbeat, mise en file d\'attente des messages et intégration réactive.',
    quickStart: 'Démarrage rapide',
    quickStartDesc: 'Utilisez le hook réactif pour des connexions WebSocket simples :',
    lowLevelApi: 'API bas niveau',
    creatingWebSocket: 'Créer un WebSocket',
    reactiveState: 'État réactif',
    reactiveStateDesc: 'Tout l\'état est exposé sous forme de Pulses :',
    sendingMessages: 'Envoyer des messages',
    eventListeners: 'Écouteurs d\'événements',
    interceptors: 'Intercepteurs de messages',
    interceptorsDesc: 'Transformer les messages entrants et sortants :',
    control: 'Contrôle',
    reactiveHook: 'Hook réactif (recommandé)',
    reactiveHookDesc: 'Pour la plupart des cas d\'utilisation, le hook useWebSocket fournit une API plus simple :',
    usageWithEffects: 'Utilisation avec les effets',
    errorHandling: 'Gestion des erreurs',
    errorHandlingDesc: 'Toutes les erreurs sont encapsulées dans WebSocketError avec des propriétés utiles :',
    errorCodes: 'Codes d\'erreur',
    description: 'Description',
    when: 'Quand',
    errorConnectFailed: 'Échec de connexion',
    errorConnectFailedWhen: 'Impossible d\'établir la connexion',
    errorClose: 'Connexion fermée',
    errorCloseWhen: 'Le serveur ou le client a fermé la connexion',
    errorTimeout: 'Délai d\'attente dépassé',
    errorTimeoutWhen: 'La tentative de connexion a expiré',
    errorSendFailed: 'Échec d\'envoi',
    errorSendFailedWhen: 'Le message n\'a pas pu être envoyé',
    patterns: 'Patterns courants',
    chatApplication: 'Application de chat',
    realTimeUpdates: 'Mises à jour en temps réel',
    reconnectionWithAuth: 'Reconnexion avec authentification'
  },

  // GraphQL page
  graphql: {
    title: '🔮 Client GraphQL',
    intro: 'Client GraphQL avec mise en cache des requêtes, mutations, subscriptions et intégration réactive.',
    quickStart: 'Démarrage rapide',
    quickStartDesc: 'Créez un client et utilisez les hooks pour les requêtes :',
    creatingClient: 'Créer un client',
    queries: 'Requêtes',
    usingQueryData: 'Utiliser les données de requête',
    mutations: 'Mutations',
    optimisticUpdates: 'Mises à jour optimistes',
    optimisticUpdatesDesc: 'Mettre à jour l\'UI immédiatement pendant que le serveur traite la mutation :',
    subscriptions: 'Subscriptions',
    reactiveVariables: 'Variables réactives',
    errorHandling: 'Gestion des erreurs',
    errorHandlingDesc: 'Toutes les erreurs sont encapsulées dans GraphQLError avec des propriétés utiles :',
    errorCodes: 'Codes d\'erreur',
    description: 'Description',
    errorGraphql: 'Erreurs GraphQL dans la réponse',
    errorNetwork: 'Erreur réseau ou de connexion',
    errorTimeout: 'Délai d\'attente dépassé',
    errorParse: 'Échec de l\'analyse de la réponse',
    interceptors: 'Intercepteurs',
    cacheManagement: 'Gestion du cache',
    patterns: 'Patterns courants',
    pagination: 'Pagination',
    dependentQueries: 'Requêtes dépendantes',
    realTimeChat: 'Chat en temps réel'
  },

  // Context page
  context: {
    title: '🎯 API Context',
    intro: 'API Context pour l\'injection de dépendances et éviter le prop drilling, similaire à React Context.',
    quickStart: 'Démarrage rapide',
    quickStartDesc: 'Créez un context et fournissez des valeurs aux enfants :',
    creatingContexts: 'Créer des contexts',
    providingValues: 'Fournir des valeurs',
    basicProvider: 'Provider basique',
    reactiveValues: 'Fournir des valeurs réactives',
    reactiveValuesDesc: 'Passez un pulse pour rendre la valeur du context réactive :',
    shorthandSyntax: 'Syntaxe abrégée',
    nestedProviders: 'Providers imbriqués',
    nestedProvidersDesc: 'Les providers internes remplacent les externes :',
    consumingContext: 'Consommer le context',
    consumerComponent: 'Composant Consumer',
    multipleContexts: 'Contexts multiples',
    provideManyDesc: 'Fournir plusieurs contexts à la fois :',
    useContextSelectorDesc: 'Dériver de plusieurs contexts :',
    utilities: 'Utilitaires Context',
    patterns: 'Patterns courants',
    themeProvider: 'Provider de thème',
    authContext: 'Context d\'authentification',
    localizationContext: 'Context de localisation',
    compoundComponents: 'Composants composés',
    testing: 'Tests avec Context'
  },

  // DevTools page
  devtools: {
    title: '🛠️ DevTools',
    intro: 'Capacités de débogage, profilage et audit d\'accessibilité pour le développement.',
    enabling: 'Activer DevTools',
    enablingDesc: 'Activez DevTools pour accéder aux fonctionnalités de débogage :',
    trackedPulses: 'Pulses et effets suivis',
    trackedPulsesDesc: 'Suivez les pulses et les effets pour le débogage :',
    diagnostics: 'Diagnostics',
    getDiagnosticsDesc: 'Obtenir les statistiques d\'exécution :',
    getEffectStatsDesc: 'Obtenir les statistiques par effet :',
    getPulseListDesc: 'Obtenir tous les pulses suivis :',
    dependencyGraph: 'Graphe de dépendances',
    dependencyGraphDesc: 'Visualiser les dépendances réactives :',
    timeTravel: 'Débogage Time-Travel',
    timeTravelDesc: 'Naviguer dans l\'historique des états :',
    profiling: 'Profilage de performance',
    profileDesc: 'Profiler un bloc de code :',
    markDesc: 'Marquer des points de timing :',
    a11yAudit: 'Audit d\'accessibilité',
    a11yAuditDesc: 'Audit d\'accessibilité intégré pour trouver les problèmes a11y :',
    oneTimeAudit: 'Audit ponctuel',
    continuousAuditing: 'Audit continu',
    a11yStats: 'Statistiques A11y',
    visualHighlighting: 'Mise en surbrillance visuelle',
    exportReports: 'Exporter les rapports',
    browserConsole: 'Console navigateur',
    browserConsoleDesc: 'Une fois activé, DevTools expose window.__PULSE_DEVTOOLS__ :',
    bestPractices: 'Bonnes pratiques',
    developmentOnly: 'Développement uniquement',
    namingConventions: 'Conventions de nommage',
    performanceMonitoring: 'Surveillance des performances',
    a11yInDevelopment: 'A11y en développement'
  },

  // SSR page
  ssr: {
    title: '🖥️ Rendu côté serveur',
    intro: 'Rendez vos applications Pulse sur le serveur pour améliorer le SEO, accélérer le chargement initial et offrir de meilleures performances sur les appareils lents.',
    quickStart: 'Démarrage rapide',
    quickStartDesc: 'Importez et utilisez les utilitaires SSR :',
    serverSetup: 'Configuration du serveur',
    serverSetupDesc: 'Configurez un serveur Express avec SSR :',
    clientHydration: 'Hydratation côté client',
    clientHydrationDesc: 'Hydratez le HTML rendu côté serveur sur le client pour attacher les écouteurs d\'événements et activer l\'interactivité :',
    stateSerialization: 'Sérialisation de l\'état',
    stateSerializationDesc: 'Sérialisez et désérialisez l\'état pour le transfert entre serveur et client :',
    modeDetection: 'Détection du mode SSR',
    modeDetectionDesc: 'Détectez si le code s\'exécute sur le serveur ou le client :',
    ssrSafeEffects: 'Effets compatibles SSR',
    ssrSafeEffectsDesc: 'Écrivez des effets qui fonctionnent correctement en SSR et dans le navigateur :',
    asyncData: 'Données asynchrones avec SSR',
    asyncDataDesc: 'useAsync s\'intègre automatiquement avec SSR pour la récupération de données :',
    architecture: 'Architecture SSR',
    architectureDesc: 'Le système SSR est composé de plusieurs modules spécialisés :',
    module: 'Module',
    purpose: 'Fonction',
    moduleMain: 'Point d\'entrée principal (renderToString, hydrate)',
    moduleSerializer: 'Sérialisation HTML pour les arbres MockNode',
    moduleHydrator: 'Utilitaires d\'hydratation côté client',
    moduleAsync: 'Collecte des données asynchrones pendant le SSR',
    howItWorks: 'Comment fonctionne le SSR',
    howItWorksDesc: 'Comprendre le processus SSR :',
    step1Title: 'Rendu serveur :',
    step1Desc: 'renderToString() crée un contexte isolé avec MockDOMAdapter.',
    step2Title: 'Collecte async :',
    step2Desc: 'Le premier rendu collecte toutes les opérations useAsync.',
    step3Title: 'Récupération des données :',
    step3Desc: 'Attend que toutes les opérations async se terminent (avec timeout).',
    step4Title: 'Re-rendu :',
    step4Desc: 'Deuxième rendu avec les données résolues.',
    step5Title: 'Sérialisation :',
    step5Desc: 'L\'arbre MockNode est converti en chaîne HTML.',
    step6Title: 'Transfert d\'état :',
    step6Desc: 'L\'état est sérialisé pour le client.',
    step7Title: 'Hydratation :',
    step7Desc: 'Le client attache les écouteurs d\'événements au DOM existant.',
    apiReference: 'Référence API',
    renderToStringDesc: 'Rend un composant en chaîne HTML de manière asynchrone, en attendant les données async :',
    renderToStringSyncDesc: 'Rend un composant en chaîne HTML de manière synchrone (sans attente async) :',
    hydrateDesc: 'Attache les écouteurs d\'événements au HTML rendu côté serveur :',
    serializeDesc: 'Sérialise et désérialise l\'état de manière sécurisée :',
    fullExample: 'Exemple complet',
    fullExampleDesc: 'Une configuration SSR complète avec serveur, client et composant partagé :',
    sharedComponent: 'Composant partagé (App.js)',
    serverFile: 'Serveur (server.js)',
    clientFile: 'Client (client.js)',
    bestPractices: 'Bonnes pratiques',
    practice1Title: 'Utilisez les gardes isSSR() :',
    practice1Desc: 'Enveloppez les APIs navigateur uniquement (window, document, localStorage) dans des vérifications isSSR().',
    practice2Title: 'Définissez des timeouts appropriés :',
    practice2Desc: 'Configurez le timeout en fonction des temps de réponse de vos APIs.',
    practice3Title: 'Gérez les erreurs gracieusement :',
    practice3Desc: 'Fournissez une UI de secours quand le SSR échoue.',
    practice4Title: 'Minimisez les différences client-serveur :',
    practice4Desc: 'Assurez-vous que le même arbre de composants est rendu sur le serveur et le client.',
    practice5Title: 'Sérialisez uniquement l\'état nécessaire :',
    practice5Desc: 'Évitez de transférer des données volumineuses ou sensibles dans l\'état initial.',
    troubleshooting: 'Dépannage',
    hydrationMismatch: 'Discordance d\'hydratation',
    hydrationMismatchDesc: 'Le serveur et le client doivent rendre un HTML identique. Évitez les valeurs dépendantes du temps ou aléatoires :',
    browserApis: 'APIs navigateur sur le serveur',
    browserApisDesc: 'Window, document et autres APIs navigateur ne sont pas disponibles pendant le SSR :',
    asyncTimeout: 'Timeout async',
    asyncTimeoutDesc: 'Si les opérations async prennent trop de temps, augmentez le timeout :',
    prevHttp: '← Client HTTP',
    nextGraphQL: 'Client GraphQL →'
  },

  // SSE page
  // TODO: Translate to French
  sse: {
    title: '📡 Server-Sent Events',
    intro: 'Reactive SSE connections with auto-reconnect, exponential backoff, and JSON parsing. Perfect for live notifications, real-time feeds, and server push.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Use the reactive hook for simple SSE connections:',
    createSSE: 'Low-Level API: createSSE',
    createSSEDesc: 'For full control over the SSE connection:',
    useSSE: 'Reactive Hook: useSSE',
    useSSEDesc: 'Higher-level hook with automatic lifecycle management:',
    connectionState: 'Connection State',
    connectionStateDesc: 'All state is exposed as reactive Pulses:',
    customEvents: 'Custom Events',
    customEventsDesc: 'Listen for named SSE events beyond the default "message":',
    autoReconnect: 'Auto-Reconnect',
    autoReconnectDesc: 'Exponential backoff with jitter for reliable reconnection:',
    errorHandling: 'Error Handling',
    errorHandlingDesc: 'All errors are wrapped in SSEError with structured codes:',
    errorCodes: 'Error Codes',
    description: 'Description',
    when: 'When',
    errorConnectFailed: 'Connection failed',
    errorConnectFailedWhen: 'EventSource cannot connect to URL',
    errorTimeout: 'Connection timeout',
    errorTimeoutWhen: 'Connection attempt exceeded timeout',
    errorMaxRetries: 'Max retries exhausted',
    errorMaxRetriesWhen: 'All reconnection attempts failed',
    errorClosed: 'Connection closed',
    errorClosedWhen: 'Server closed the connection',
    jsonParsing: 'JSON Parsing',
    jsonParsingDesc: 'Messages are automatically parsed as JSON by default:',
    fullExample: 'Complete Example',
    fullExampleDesc: 'A live notification stream with reconnection handling:'
  },

  // Persistence page
  // TODO: Translate to French
  persistence: {
    title: '💾 Persistence',
    intro: 'Automatic state storage with pluggable adapters. Persist your store to localStorage, sessionStorage, IndexedDB, or custom backends with debouncing and selective serialization.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Add persistence to any Pulse store:',
    storageAdapters: 'Storage Adapters',
    storageAdaptersDesc: 'Choose the right storage backend for your use case:',
    withPersistence: 'withPersistence API',
    withPersistenceDesc: 'Connect a store to a storage adapter:',
    optionsReference: 'Options Reference',
    optionsReferenceDesc: 'All available options for withPersistence:',
    option: 'Option',
    defaultValue: 'Default',
    description: 'Description',
    selectivePersistence: 'Selective Persistence',
    selectivePersistenceDesc: 'Control which fields are persisted:',
    indexedDB: 'IndexedDB Adapter',
    indexedDBDesc: 'For large datasets that exceed localStorage limits:',
    errorHandling: 'Error Handling',
    errorHandlingDesc: 'All errors are wrapped in PersistenceError:',
    testing: 'Testing with Memory Adapter',
    testingDesc: 'Use the memory adapter for isolated tests:',
    fullExample: 'Complete Example',
    fullExampleDesc: 'Auto-saving store with restore on startup:'
  },

  // i18n page
  // TODO: Translate to French
  i18n: {
    title: '🌍 Internationalization (i18n)',
    intro: 'Reactive internationalization with locale switching, interpolation, pluralization, and missing key handling. Fully integrated with Pulse reactivity.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Create an i18n instance with messages:',
    translationFunction: 'Translation Function',
    translationFunctionDesc: 'Use t() to translate keys with optional interpolation:',
    pluralization: 'Pluralization',
    pluralizationDesc: 'Use tc() for count-based translations with pipe-separated values:',
    localeSwitching: 'Locale Switching',
    localeSwitchingDesc: 'The locale is a reactive Pulse that updates all translations automatically:',
    addingMessages: 'Adding Messages',
    addingMessagesDesc: 'Dynamically add translations at runtime:',
    fallbackLocale: 'Fallback Locale',
    fallbackLocaleDesc: 'Missing keys fall back to the fallback locale:',
    missingKeyHandler: 'Missing Key Handler',
    missingKeyHandlerDesc: 'Custom handling for missing translation keys:',
    modifiers: 'Modifiers',
    modifiersDesc: 'Transform translated text with custom modifiers:',
    fullExample: 'Complete Example',
    fullExampleDesc: 'A multi-language application with reactive locale switching:'
  },

  // Animation page
  // TODO: Translate to French
  animation: {
    title: '🎬 Animation',
    intro: 'Web Animations API wrapper with Pulse reactivity, preset animations, and automatic reduced motion support. SSR-safe with zero-overhead fallbacks.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Animate elements with a simple API:',
    configuration: 'Configuration',
    configurationDesc: 'Configure global animation settings:',
    presetAnimations: 'Preset Animations',
    presetAnimationsDesc: 'Built-in animation presets for common transitions:',
    customKeyframes: 'Custom Keyframes',
    customKeyframesDesc: 'Use Web Animations API keyframes for full control:',
    listAnimations: 'List Animations',
    listAnimationsDesc: 'Staggered animations for lists of elements:',
    transitions: 'Transitions',
    transitionsDesc: 'Animate between two states:',
    useAnimationHook: 'useAnimation Hook',
    useAnimationHookDesc: 'Reactive animation control with play/pause/reverse:',
    reducedMotion: 'Reduced Motion',
    reducedMotionDesc: 'Automatically respects prefers-reduced-motion for accessibility:',
    fullExample: 'Complete Example',
    fullExampleDesc: 'Animated card list with enter/leave transitions:'
  },

  // Portal page
  // TODO: Translate to French
  portal: {
    title: '🚪 Portal',
    intro: 'Render children into a different DOM location. Essential for modals, tooltips, toasts, and dropdowns that need to break out of parent overflow or z-index constraints.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Render content outside the parent hierarchy:',
    portalApi: 'portal() API',
    portalApiDesc: 'Full API reference for the portal function:',
    staticContent: 'Static Content',
    staticContentDesc: 'Portal with static children:',
    reactiveContent: 'Reactive Content',
    reactiveContentDesc: 'Portal with reactive function that updates automatically:',
    movingPortals: 'Moving Portals',
    movingPortalsDesc: 'Change the portal target dynamically:',
    multiplePortals: 'Multiple Portals',
    multiplePortalsDesc: 'Use keys to manage multiple portals to the same target:',
    modalPattern: 'Modal Pattern',
    modalPatternDesc: 'Complete accessible modal using portal:',
    toastNotifications: 'Toast Notifications',
    toastNotificationsDesc: 'A toast notification system using portals:',
    errorBoundary: 'Error Boundary',
    errorBoundaryDesc: 'Catch and handle render errors gracefully:',
    cleanup: 'Cleanup & Lifecycle',
    cleanupDesc: 'Portal lifecycle and proper cleanup:'
  },

  // Service Worker page
  // TODO: Translate to French
  sw: {
    title: '⚙️ Service Worker',
    intro: 'Register and manage service workers with reactive lifecycle state, update notifications, and caching strategies. Build offline-ready Progressive Web Apps.',
    quickStart: 'Quick Start',
    quickStartDesc: 'Register a service worker with lifecycle monitoring:',
    registrationOptions: 'Registration Options',
    registrationOptionsDesc: 'All available options for registerServiceWorker:',
    option: 'Option',
    defaultValue: 'Default',
    description: 'Description',
    reactiveState: 'Reactive State',
    reactiveStateDesc: 'All lifecycle state is exposed as reactive Pulses:',
    updateHandling: 'Update Handling',
    updateHandlingDesc: 'Detect and apply service worker updates:',
    cacheStrategies: 'Cache Strategies',
    cacheStrategiesDesc: 'Built-in caching strategies for different resource types:',
    precaching: 'Precaching',
    precachingDesc: 'Pre-cache critical assets during service worker installation:',
    offlineSupport: 'Offline Support',
    offlineSupportDesc: 'Complete offline-ready application pattern:',
    errorHandling: 'Error Handling',
    errorHandlingDesc: 'Handle service worker registration and update errors:',
    fullExample: 'Complete Example',
    fullExampleDesc: 'PWA with update notifications and offline support:'
  },

  // Server Components page
  serverComponents: {
    title: '🌐 Composants Serveur',
    intro: 'Architecture de composants serveur style React pour Pulse. Construisez des applications hybrides avec fractionnement au niveau des composants, Server Actions, et des fonctionnalités de sécurité complètes incluant la protection CSRF et la limitation de débit.'
  }
};

