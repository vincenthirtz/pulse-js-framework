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
    intro: 'Pulse é construído sobre quatro conceitos básicos: Pulsos (estado reativo), Effects (efeitos colaterais), helpers DOM e a DSL .pulse opcional.',
    pulses: 'Pulsos (Estado Reativo)',
    pulsesDesc: 'Um pulso é um container reativo que notifica assinantes quando seu valor muda.',
    effects: 'Effects',
    effectsDesc: 'Effects são executados automaticamente quando suas dependências mudam.',
    computed: 'Valores Computados',
    computedDesc: 'Valores derivados que atualizam automaticamente.',
    domHelpers: 'Helpers DOM',
    domHelpersDesc: 'Crie elementos DOM usando sintaxe de seletores CSS.',
    reactiveBindings: 'Bindings Reativos',
    conditionalList: 'Renderização Condicional & Lista',
    pulseDsl: 'DSL .pulse',
    pulseDslDesc: 'A DSL opcional fornece uma sintaxe mais limpa para componentes.'
  },

  // API Reference page
  apiReference: {
    title: '📖 Referência da API',
    searchPlaceholder: 'Pesquisar API...',
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
    todoApp: 'App de Tarefas',
    todoDesc: 'Lista de tarefas clássica com persistência em local storage.',
    chatApp: 'App de Chat',
    chatDesc: 'Interface de chat em tempo real com histórico de mensagens.',
    ecommerce: 'E-Commerce',
    ecommerceDesc: 'Catálogo de produtos com carrinho e checkout.',
    weather: 'App de Clima',
    weatherDesc: 'Dashboard de clima com integração de API.',
    viewDemo: 'Ver Demo',
    viewSource: 'Ver Código'
  },

  // Playground page
  playground: {
    title: '🎮 Playground',
    intro: 'Experimente Pulse no seu navegador. Edite o código e veja os resultados instantaneamente.',
    run: 'Executar',
    reset: 'Resetar',
    share: 'Compartilhar'
  },

  // Other pages
  debugging: {
    title: '🔍 Depuração'
  },
  security: {
    title: '🔒 Segurança'
  },
  performance: {
    title: '⚡ Desempenho'
  },
  errorHandling: {
    title: '🛡️ Tratamento de Erros'
  },
  mobile: {
    title: '📱 Desenvolvimento Mobile'
  },
  changelog: {
    title: '📋 Changelog'
  }
};
