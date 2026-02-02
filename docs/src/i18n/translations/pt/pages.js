/**
 * Portuguese translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'Um framework DOM declarativo com estrutura baseada em seletores CSS',
    features: {
      zeroDeps: '0️⃣ Zero Dependências',
      uniqueSyntax: '🎯 Sintaxe Única',
      reactive: '⚡ Reativo',
      smallBundle: '📦 ~4kb core',
      noBuild: '🔧 Sem Build Necessário',
      mobile: '📱 Apps Mobile'
    },
    getStarted: 'Começar →',
    viewExamples: 'Ver Exemplos',
    whatMakesUnique: 'O Que Torna o Pulse Único?',
    quickExample: 'Exemplo Rápido',
    pulseSyntax: 'sintaxe .pulse',
    jsEquivalent: 'equivalente JavaScript',
    comparison: {
      feature: 'Recurso',
      uiStructure: 'Estrutura UI',
      cssSelectors: 'Seletores CSS',
      reactivity: 'Reatividade',
      pulses: 'Pulsos',
      buildStep: 'Etapa de Build',
      bundleSize: 'Tamanho do Bundle',
      dependencies: 'Dependências',
      buildSpeed: 'Velocidade de Build',
      learningCurve: 'Curva de Aprendizado',
      fileExtension: 'Extensão de Arquivo',
      mobileApps: 'Apps Mobile',
      typescript: 'TypeScript',
      required: 'Obrigatório',
      optional: 'Opcional',
      many: 'Muitas',
      some: 'Algumas',
      few: 'Poucas',
      zero: 'Zero',
      slow: 'Lento',
      medium: 'Médio',
      fast: 'Rápido',
      instant: 'Instantâneo',
      steep: 'Íngreme',
      moderate: 'Moderada',
      easy: 'Fácil',
      minimal: 'Mínima',
      builtIn: 'Integrado'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 Primeiros Passos',
    installation: 'Instalação',
    installationDesc: 'Crie um novo projeto Pulse com um único comando:',
    manualSetup: 'Configuração Manual',
    manualSetupDesc: 'Ou configure manualmente em qualquer projeto:',
    thenImport: 'Depois importe no seu JavaScript:',
    firstComponent: 'Seu Primeiro Componente',
    firstComponentDesc: 'Crie um contador reativo simples:',
    usingPulseFiles: 'Usando Arquivos .pulse',
    usingPulseFilesDesc: 'Para uma sintaxe mais limpa, use arquivos <code>.pulse</code> com o plugin Vite:',
    projectStructure: 'Estrutura do Projeto',
    cliCommands: 'Comandos CLI',
    cliCommandsDesc: 'Pulse fornece uma CLI completa para fluxo de desenvolvimento:',
    development: 'Desenvolvimento',
    codeQuality: 'Qualidade de Código',
    lintChecks: '<strong>Verificações de lint:</strong> referências indefinidas, imports/estados não utilizados, convenções de nomenclatura, blocos vazios, ordem de imports.',
    formatRules: '<strong>Regras de formatação:</strong> indentação de 2 espaços, imports ordenados, chaves consistentes, espaçamento adequado.',
    analyzeOutput: '<strong>Saída de análise:</strong> contagem de arquivos, complexidade de componentes, grafo de imports, detecção de código morto.',
    faq: 'Perguntas Frequentes',
    faqBuildStep: {
      q: 'Preciso de uma etapa de build?',
      a: 'Não! Pulse funciona diretamente no navegador. No entanto, para arquivos <code>.pulse</code> e otimização de produção, recomendamos usar Vite com o plugin Pulse.'
    },
    faqComparison: {
      q: 'Como o Pulse se compara ao React/Vue?',
      a: 'Pulse é muito mais leve (~4kb core, ~12kb completo vs 35-45kb) e usa pulsos (primitivos reativos) em vez de DOM virtual. Tem zero dependências e etapa de build opcional. A sintaxe de seletores CSS é exclusiva do Pulse.'
    },
    faqTypeScript: {
      q: 'Posso usar TypeScript?',
      a: 'Sim! Pulse inclui definições TypeScript completas. Basta importar tipos de <code>pulse-js-framework/runtime</code> e sua IDE fornecerá autocomplete.'
    },
    faqForms: {
      q: 'Como lidar com formulários?',
      a: 'Use o helper <code>model()</code> para binding bidirecional:'
    },
    faqExisting: {
      q: 'Posso usar Pulse com projetos existentes?',
      a: 'Sim! Pulse pode ser montado em qualquer elemento DOM. Use <code>mount(\'#my-widget\', MyComponent())</code> para incorporar componentes Pulse em qualquer lugar.'
    },
    faqFetch: {
      q: 'Como buscar dados?',
      a: 'Use <code>fetch()</code> padrão com effects:'
    },
    faqSSR: {
      q: 'Pulse suporta SSR?',
      a: 'Ainda não, mas está no roadmap. Atualmente, Pulse é otimizado para SPAs client-side e apps mobile.'
    },
    faqDebug: {
      q: 'Como depurar meu app?',
      a: 'Pulse v1.4.9+ suporta source maps para arquivos <code>.pulse</code>. Use a API Logger para saída estruturada. Veja o Guia de Depuração para mais.'
    },
    faqMobile: {
      q: 'Posso criar apps mobile?',
      a: 'Sim! Use <code>pulse mobile init</code> para configurar projetos Android/iOS. Pulse inclui APIs nativas para storage, info do dispositivo e mais. Veja o Guia Mobile.'
    },
    faqHelp: {
      q: 'Onde posso obter ajuda?',
      a: 'Abra uma issue no GitHub ou confira os Exemplos para implementações de referência.'
    },
    nextCoreConcepts: 'Próximo: Conceitos Básicos →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 Conceitos Básicos',
    pulses: 'Pulsos (Estado Reativo)',
    pulsesDesc: 'Um pulso é um container reativo que notifica assinantes quando seu valor muda.',
    effects: 'Effects',
    effectsDesc: 'Effects são executados automaticamente quando suas dependências mudam.',
    cssSelectorSyntax: 'Sintaxe de Seletores CSS',
    cssSelectorSyntaxDesc: 'Crie elementos DOM usando a sintaxe familiar de seletores CSS.',
    pulseFileSyntax: 'Sintaxe de Arquivos .pulse',
    pulseFileSyntaxDesc: 'A DSL .pulse oferece uma forma limpa e declarativa de escrever componentes.',
    blocks: 'Blocos',
    imports: 'Imports',
    directives: 'Diretivas',
    slots: 'Slots (Projeção de Conteúdo)',
    slotsDesc: 'Use slots para compor componentes com conteúdo dinâmico.',
    cssScoping: 'Escopo CSS',
    cssScopingDesc: 'Estilos em arquivos .pulse são automaticamente escopados ao componente.',
    advancedRouting: 'Roteamento Avançado',
    advancedRoutingDesc: 'O router do Pulse suporta lazy loading, middleware e code splitting.',
    lazyLoading: 'Lazy Loading',
    lazyLoadingDesc: 'Carregue componentes de rota sob demanda para reduzir o tamanho inicial do bundle.',
    middleware: 'Middleware',
    middlewareDesc: 'Middleware estilo Koa para controle flexível de navegação.',
    nextApiReference: 'Próximo: Referência da API →'
  },

  // API Reference page
  apiReference: {
    title: '📖 Referência da API',
    searchPlaceholder: 'Pesquisar API...',
    filter: 'Filtrar:',
    typescriptSupport: 'Suporte TypeScript',
    typescriptSupportDesc: 'Pulse inclui definições TypeScript completas para autocompletar no IDE.',
    reactivity: 'Reatividade',
    reactivityDesc: 'Sistema de reatividade baseado em sinais.',
    domSection: 'DOM',
    domSectionDesc: 'Helpers para criar e manipular o DOM.',
    routerSection: 'Router',
    routerSectionDesc: 'Router SPA com rotas aninhadas e guards.',
    storeSection: 'Store',
    storeSectionDesc: 'Gerenciamento de estado global.',
    hmrSection: 'HMR',
    hmrSectionDesc: 'Hot Module Replacement.',
    resultsFound: 'resultado(s) encontrado(s)',
    noResults: 'Nenhum resultado encontrado',
    nextMobile: 'Próximo: Apps Móveis →',
    categories: {
      all: 'Todos',
      types: 'Tipos',
      reactivity: 'Reatividade',
      dom: 'DOM',
      router: 'Router',
      store: 'Store',
      hmr: 'HMR'
    }
  },

  // Examples page
  examples: {
    title: '✨ Exemplos',
    intro: 'Explore estas aplicações de exemplo para ver Pulse em ação.',
    viewDemo: 'Ver Demo →',
    viewSource: 'Ver Código',
    hmrDemo: {
      title: 'Demo HMR',
      desc: 'Hot Module Replacement com preservação de estado.',
      features: [
        'Estado preservado durante HMR',
        'Limpeza automática de effects',
        'Troca de tema',
        'Persistência de notas',
        'Contador de atualizações HMR'
      ]
    },
    blog: {
      title: '📰 Blog',
      desc: 'Aplicação de blog completa com CRUD, categorias e busca.',
      features: [
        'Operações CRUD',
        'Filtragem por categoria',
        'Funcionalidade de busca',
        'Modo claro/escuro',
        'Design responsivo'
      ]
    },
    todoApp: {
      title: '📝 App de Tarefas',
      desc: 'App de tarefas completo com modo escuro e persistência.',
      features: [
        'Adicionar, editar, excluir',
        'Filtrar por status',
        'Modo escuro',
        'Persistência LocalStorage',
        'Acompanhamento de progresso'
      ]
    },
    weatherApp: {
      title: '🌤️ App de Clima',
      desc: 'Aplicação de clima em tempo real com API Open-Meteo.',
      features: [
        'Busca de cidade',
        'Condições atuais',
        'Previsão de 7 dias',
        'Cidades favoritas',
        'Alternar °C/°F'
      ]
    },
    ecommerce: {
      title: '🛒 Loja E-Commerce',
      desc: 'Experiência de compra completa com carrinho e checkout.',
      features: [
        'Catálogo de produtos',
        'Busca e filtros',
        'Carrinho de compras',
        'Fluxo de checkout',
        'Persistência LocalStorage'
      ]
    },
    chatApp: {
      title: '💬 App de Chat',
      desc: 'Mensagens em tempo real com salas e usuários simulados.',
      features: [
        'Múltiplas salas',
        'Presença de usuário',
        'Respostas de bot simuladas',
        'Seletor de emoji',
        'Persistência de mensagens'
      ]
    },
    routerDemo: {
      title: '🧭 Demo Router',
      desc: 'Roteamento SPA com navegação, guards e rotas dinâmicas.',
      features: [
        'Parâmetros de rota',
        'Query strings',
        'Guards de rota',
        'Estilo de link ativo',
        'Rotas protegidas'
      ]
    },
    storeDemo: {
      title: '📝 Demo Store',
      desc: 'Gerenciamento de estado global com o sistema Store do Pulse.',
      features: [
        'createStore com persistência',
        'Actions e getters',
        'Desfazer/Refazer',
        'Stores modulares',
        'Plugin Logger'
      ]
    },
    dashboard: {
      title: '📊 Dashboard Admin',
      desc: 'Interface admin completa demonstrando todas as funcionalidades.',
      features: [
        'Auth e guards',
        'Gráficos, tabelas, modais',
        'Operações CRUD',
        'Temas e configurações',
        'Todas as funcionalidades reativas'
      ]
    },
    runLocally: 'Executar Exemplos Localmente',
    runLocallyDesc: 'Para executar os projetos de exemplo na sua máquina:',
    createYourOwn: 'Crie o Seu',
    createYourOwnDesc: 'Inicie um novo projeto Pulse:',
    mobileExamples: '📱 Exemplos Mobile',
    mobileExamplesDesc: 'Pulse também pode rodar em plataformas mobile via WebView.'
  },

  // Playground page
  playground: {
    title: '🎮 Playground',
    intro: 'Experimente Pulse no seu navegador. Edite o código e veja os resultados instantaneamente.',
    codeEditor: '📝 Editor de Código',
    preview: '👁️ Pré-visualização',
    run: '▶ Executar',
    reset: '↺ Resetar',
    share: 'Compartilhar',
    ready: 'Pronto',
    running: 'Executando...',
    success: '✓ Sucesso',
    errorPrefix: 'Erro:',
    templates: '📋 Templates Rápidos',
    templateCounter: 'Contador',
    templateTodo: 'Lista de Tarefas',
    templateTimer: 'Temporizador',
    templateForm: 'Formulário',
    templateCalculator: 'Calculadora',
    templateTabs: 'Abas',
    templateTheme: 'Tema',
    templateSearch: 'Busca',
    templateCart: 'Carrinho',
    templateAnimation: 'Animação'
  },

  // Debugging page
  debugging: {
    title: '🔍 Depuração',
    intro: 'Ferramentas e técnicas para depurar aplicações Pulse.',
    sourceMaps: 'Source Maps',
    sourceMapsDesc: 'Pulse v1.4.9+ gera source maps V3 para arquivos .pulse compilados.',
    enablingSourceMaps: 'Habilitando Source Maps',
    viteIntegration: 'Integração Vite',
    viteIntegrationDesc: 'O plugin Vite gera automaticamente source maps no modo de desenvolvimento.',
    usingSourceMaps: 'Usando Source Maps no DevTools',
    usingSourceMapsSteps: [
      'Abra o Chrome/Firefox DevTools (F12)',
      'Vá para a aba Sources',
      'Encontre seus arquivos .pulse na árvore',
      'Defina breakpoints nas linhas originais',
      'Stack traces mostrarão números de linha originais'
    ],
    loggerApi: 'API Logger',
    loggerApiDesc: 'Use o logger integrado para saída de depuração estruturada.',
    logLevels: 'Níveis de Log',
    reactivityDebugging: 'Depuração de Reatividade',
    reactivityDebuggingDesc: 'Técnicas para depurar estado reativo e effects.',
    trackingDependencies: 'Rastreando Dependências',
    debuggingComputed: 'Depurando Valores Computados',
    batchDebugging: 'Depuração de Batch',
    routerDebugging: 'Depuração do Router',
    routerDebuggingDesc: 'Depurar navegação e matching de rotas.',
    hmrDebugging: 'Depuração HMR',
    hmrDebuggingDesc: 'Depurar problemas de Hot Module Replacement.',
    commonErrors: 'Erros Comuns',
    performanceProfiling: 'Profiling de Performance',
    performanceProfilingDesc: 'Dicas para identificar gargalos.',
    nextApiReference: 'Próximo: Referência da API →'
  },

  // Security page
  security: {
    title: '🔒 Segurança',
    intro: 'Melhores práticas para construir aplicações Pulse seguras.',
    xssPrevention: 'Prevenção de XSS',
    xssPreventionDesc: 'Cross-Site Scripting (XSS) é uma das vulnerabilidades web mais comuns.',
    safeByDefault: 'Seguro por Padrão: Conteúdo de Texto',
    safeByDefaultDesc: 'A função el() com filhos string escapa HTML automaticamente.',
    dangerousInnerHtml: 'Perigoso: innerHTML',
    dangerousInnerHtmlDesc: 'Nunca use innerHTML com conteúdo não confiável.',
    safePatterns: 'Padrões Seguros para Conteúdo Dinâmico',
    urlSanitization: 'Sanitização de URLs',
    urlSanitizationDesc: 'Sempre sanitize URLs fornecidas pelo usuário.',
    formSecurity: 'Segurança de Formulários',
    formSecurityDesc: 'Manipulação segura de dados de formulário.',
    inputValidation: 'Validação de Entrada',
    sensitiveData: 'Dados Sensíveis',
    csp: 'Content Security Policy',
    cspDesc: 'Headers CSP recomendados para aplicações Pulse.',
    apiSecurity: 'Segurança de API',
    apiSecurityDesc: 'Padrões seguros para busca de dados.',
    checklist: 'Checklist de Segurança',
    nextPerformance: 'Próximo: Guia de Performance'
  },

  // Performance page
  performance: {
    title: '⚡ Desempenho',
    intro: 'Otimize suas aplicações Pulse para performance máxima.',
    lazyComputed: 'Valores Computados Lazy',
    lazyComputedDesc: 'Por padrão, valores computados avaliam imediatamente. Use avaliação lazy para cálculos custosos.',
    whenToUseLazy: 'Quando Usar Lazy',
    listKeying: 'Chaves de Lista',
    listKeyingDesc: 'Chaves adequadas são críticas para performance de listas.',
    goodVsBadKeys: 'Boas vs Más Chaves',
    performanceImpact: 'Impacto na Performance',
    batching: 'Agrupando Atualizações',
    batchingDesc: 'Agrupe múltiplas mudanças de estado para evitar re-renders intermediários.',
    automaticBatching: 'Batching Automático',
    memoization: 'Memoização',
    memoizationDesc: 'Cache cálculos custosos para evitar trabalho redundante.',
    lazyRoutes: 'Carregamento Lazy de Rotas',
    lazyRoutesDesc: 'Divida seu app em chunks carregados sob demanda.',
    avoidReactivity: 'Evite Reatividade Desnecessária',
    avoidReactivityDesc: 'Nem tudo precisa ser reativo.',
    effectOptimization: 'Otimização de Effects',
    effectOptimizationDesc: 'Mantenha effects rápidos e focados.',
    resourceCaching: 'Cache de Recursos',
    resourceCachingDesc: 'Use os recursos de cache do módulo async.',
    monitoring: 'Monitoramento de Performance',
    monitoringDesc: 'Use o módulo devtools para monitorar performance.',
    checklist: 'Checklist de Performance',
    nextErrorHandling: 'Próximo: Tratamento de Erros'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ Tratamento de Erros',
    intro: 'Estratégias robustas de tratamento de erros para aplicações Pulse.',
    effectErrors: 'Erros em Effects',
    asyncErrors: 'Erros Async',
    formErrors: 'Erros de Formulário',
    routerErrors: 'Erros do Router',
    boundaries: 'Error Boundaries',
    logging: 'Logging e Relatórios',
    gracefulDegradation: 'Degradação Graciosa',
    summary: 'Resumo',
    nextApiReference: 'Próximo: Referência API →'
  },

  // Mobile page
  mobile: {
    title: '📱 Desenvolvimento Mobile',
    intro: 'Construa apps mobile nativos com Pulse.',
    overview: 'Visão Geral',
    quickStart: 'Início Rápido',
    cliCommands: 'Comandos CLI',
    configuration: 'Configuração',
    configurationDesc: 'O arquivo pulse.mobile.json configura seu app mobile.',
    nativeApis: 'APIs Nativas',
    requirements: 'Requisitos',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: 'Próximo: Exemplos →'
  },

  // Changelog page
  changelog: {
    title: '📋 Changelog',
    intro: 'Atualizações e melhorias recentes do Pulse Framework.',
    version: 'Versão',
    releaseDate: 'Data de Lançamento',
    changes: 'Alterações',
    added: 'Adicionado',
    changed: 'Alterado',
    fixed: 'Corrigido',
    removed: 'Removido',
    deprecated: 'Descontinuado',
    security: 'Segurança',
    breaking: 'Mudança Importante',
    features: 'Funcionalidades',
    bugFixes: 'Correções de Bugs',
    improvements: 'Melhorias',
    documentation: 'Documentação',
    performance: 'Performance',
    tests: 'Testes'
  }
};
