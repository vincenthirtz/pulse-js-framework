/**
 * Japanese translations - Page content
 */

export default {
  // Home page
  home: {
    title: '⚡ Pulse Framework',
    tagline: 'CSSセレクター構文による宣言的DOMフレームワーク',
    features: {
      zeroDeps: '0️⃣ 依存関係ゼロ',
      uniqueSyntax: '🎯 独自の構文',
      reactive: '⚡ リアクティブ',
      smallBundle: '📦 コア約4kb',
      noBuild: '🔧 ビルド不要',
      mobile: '📱 モバイルアプリ'
    },
    getStarted: 'はじめる →',
    viewExamples: 'サンプルを見る',
    whatMakesUnique: 'Pulseの特徴は？',
    quickExample: 'クイックサンプル',
    pulseSyntax: '.pulse構文',
    jsEquivalent: 'JavaScript相当',
    comparison: {
      feature: '機能',
      uiStructure: 'UI構造',
      cssSelectors: 'CSSセレクター',
      reactivity: 'リアクティビティ',
      pulses: 'パルス',
      buildStep: 'ビルドステップ',
      bundleSize: 'バンドルサイズ',
      dependencies: '依存関係',
      buildSpeed: 'ビルド速度',
      learningCurve: '学習曲線',
      fileExtension: 'ファイル拡張子',
      mobileApps: 'モバイルアプリ',
      typescript: 'TypeScript',
      required: '必須',
      optional: 'オプション',
      many: '多い',
      some: 'いくつか',
      few: '少ない',
      zero: 'ゼロ',
      slow: '遅い',
      medium: '中程度',
      fast: '速い',
      instant: '即時',
      steep: '急',
      moderate: '緩やか',
      easy: '簡単',
      minimal: '最小限',
      builtIn: '組み込み'
    }
  },

  // Getting Started page
  gettingStarted: {
    title: '🚀 はじめに',
    installation: 'インストール',
    installationDesc: '1つのコマンドで新しいPulseプロジェクトを作成：',
    manualSetup: '手動セットアップ',
    manualSetupDesc: 'または任意のプロジェクトで手動でセットアップ：',
    thenImport: 'JavaScriptでインポート：',
    firstComponent: '最初のコンポーネント',
    firstComponentDesc: 'シンプルなリアクティブカウンターを作成：',
    usingPulseFiles: '.pulseファイルの使用',
    usingPulseFilesDesc: 'よりクリーンな構文には、Viteプラグインで<code>.pulse</code>ファイルを使用：',
    projectStructure: 'プロジェクト構造',
    cliCommands: 'CLIコマンド',
    cliCommandsDesc: 'Pulseは開発ワークフロー用の完全なCLIを提供：',
    development: '開発',
    codeQuality: 'コード品質',
    lintChecks: '<strong>Lintチェック：</strong>未定義の参照、未使用のインポート/状態、命名規則、空のブロック、インポート順序。',
    formatRules: '<strong>フォーマットルール：</strong>2スペースインデント、ソートされたインポート、一貫したブレース、適切なスペーシング。',
    analyzeOutput: '<strong>分析出力：</strong>ファイル数、コンポーネントの複雑さ、インポートグラフ、デッドコード検出。',
    faq: 'よくある質問',
    faqBuildStep: {
      q: 'ビルドステップは必要ですか？',
      a: 'いいえ！Pulseはブラウザで直接動作します。ただし、<code>.pulse</code>ファイルと本番最適化には、Pulseプラグイン付きのViteの使用をお勧めします。'
    },
    faqComparison: {
      q: 'PulseはReact/Vueとどう比較されますか？',
      a: 'Pulseははるかに軽量（コア約4kb、フル約12kb対35-45kb）で、仮想DOMの代わりにパルス（リアクティブプリミティブ）を使用します。依存関係はゼロで、ビルドステップはオプションです。CSSセレクター構文はPulse独自のものです。'
    },
    faqTypeScript: {
      q: 'TypeScriptは使えますか？',
      a: 'はい！Pulseには完全なTypeScript定義が含まれています。<code>pulse-js-framework/runtime</code>から型をインポートするだけで、IDEがオートコンプリートを提供します。'
    },
    faqForms: {
      q: 'フォームはどう処理しますか？',
      a: '双方向バインディングには<code>model()</code>ヘルパーを使用：'
    },
    faqExisting: {
      q: '既存のプロジェクトでPulseを使えますか？',
      a: 'はい！Pulseは任意のDOM要素にマウントできます。<code>mount(\'#my-widget\', MyComponent())</code>を使用して、どこにでもPulseコンポーネントを埋め込めます。'
    },
    faqFetch: {
      q: 'データの取得はどうしますか？',
      a: 'エフェクトで標準の<code>fetch()</code>を使用：'
    },
    faqSSR: {
      q: 'PulseはSSRをサポートしていますか？',
      a: 'まだですが、ロードマップにあります。現在、Pulseはクライアントサイドのシングルページアプリケーションとモバイルアプリに最適化されています。'
    },
    faqDebug: {
      q: 'アプリのデバッグはどうしますか？',
      a: 'Pulse v1.4.9以降は<code>.pulse</code>ファイルのソースマップをサポートしています。構造化された出力にはLogger APIを使用してください。詳しくはデバッグガイドをご覧ください。'
    },
    faqMobile: {
      q: 'モバイルアプリを作れますか？',
      a: 'はい！<code>pulse mobile init</code>を使用してAndroid/iOSプロジェクトをセットアップします。Pulseにはストレージ、デバイス情報などのネイティブAPIが含まれています。モバイルガイドをご覧ください。'
    },
    faqHelp: {
      q: 'ヘルプはどこで得られますか？',
      a: 'GitHubでissueを開くか、参考実装のサンプルをチェックしてください。'
    },
    nextCoreConcepts: '次へ：コアコンセプト →'
  },

  // Core Concepts page
  coreConcepts: {
    title: '💡 コアコンセプト',
    intro: 'Pulseは4つのコアコンセプトで構築されています：パルス（リアクティブ状態）、エフェクト（副作用）、DOMヘルパー、そしてオプションの.pulse DSL。',
    pulses: 'パルス（リアクティブ状態）',
    pulsesDesc: 'パルスは値が変更されたときにサブスクライバーに通知するリアクティブコンテナです。',
    effects: 'エフェクト',
    effectsDesc: 'エフェクトは依存関係が変更されると自動的に実行されます。',
    computed: '計算値',
    computedDesc: '自動的に更新される派生値。',
    domHelpers: 'DOMヘルパー',
    domHelpersDesc: 'CSSセレクター構文を使用してDOM要素を作成。',
    reactiveBindings: 'リアクティブバインディング',
    conditionalList: '条件付き＆リストレンダリング',
    pulseDsl: '.pulse DSL',
    pulseDslDesc: 'オプションのDSLは、コンポーネント用のよりクリーンな構文を提供します。'
  },

  // API Reference page
  apiReference: {
    title: '📖 APIリファレンス',
    searchPlaceholder: 'APIを検索...',
    filter: 'フィルター:',
    typescriptSupport: 'TypeScriptサポート',
    typescriptSupportDesc: 'PulseはIDE自動補完のための完全なTypeScript定義を含みます。',
    reactivity: 'リアクティビティ',
    reactivityDesc: 'シグナルベースのリアクティビティシステム。',
    domSection: 'DOM',
    domSectionDesc: 'DOM作成・操作のヘルパー。',
    routerSection: 'ルーター',
    routerSectionDesc: 'ネストルートとガード付きSPAルーター。',
    storeSection: 'ストア',
    storeSectionDesc: 'グローバル状態管理。',
    hmrSection: 'HMR',
    hmrSectionDesc: 'ホットモジュールリプレースメント。',
    resultsFound: '件見つかりました',
    noResults: '結果が見つかりません',
    nextMobile: '次: モバイルアプリ →',
    categories: {
      all: 'すべて',
      types: '型',
      reactivity: 'リアクティビティ',
      dom: 'DOM',
      router: 'ルーター',
      store: 'ストア',
      hmr: 'HMR'
    }
  },

  // Examples page
  examples: {
    title: '✨ サンプル',
    intro: 'Pulseの動作を確認するためのサンプルアプリケーションをご覧ください。',
    todoApp: 'Todoアプリ',
    todoDesc: 'ローカルストレージ永続化付きの定番Todoリスト。',
    chatApp: 'チャットアプリ',
    chatDesc: 'メッセージ履歴付きのリアルタイムチャットインターフェース。',
    ecommerce: 'Eコマース',
    ecommerceDesc: 'カートとチェックアウト付きの商品カタログ。',
    weather: '天気アプリ',
    weatherDesc: 'API統合付きの天気ダッシュボード。',
    viewDemo: 'デモを見る',
    viewSource: 'ソースを見る'
  },

  // Playground page
  playground: {
    title: '🎮 プレイグラウンド',
    intro: 'ブラウザでPulseを試してみましょう。コードを編集して結果を即座に確認できます。',
    run: '実行',
    reset: 'リセット',
    share: '共有'
  },

  // Debugging page
  debugging: {
    title: '🔍 デバッグ',
    intro: 'Pulseアプリケーションをデバッグするためのツールとテクニック。',
    sourceMaps: 'ソースマップ',
    sourceMapsDesc: 'Pulse v1.4.9以降は、コンパイルされた.pulseファイル用のV3ソースマップを生成します。',
    enablingSourceMaps: 'ソースマップの有効化',
    viteIntegration: 'Vite統合',
    viteIntegrationDesc: 'Viteプラグインは開発モードで自動的にソースマップを生成します。',
    usingSourceMaps: 'DevToolsでソースマップを使用',
    usingSourceMapsSteps: [
      'Chrome/Firefox DevToolsを開く（F12）',
      'Sourcesタブに移動',
      'ファイルツリーで.pulseファイルを見つける',
      '元のソース行にブレークポイントを設定',
      'エラースタックトレースは元の行番号を表示'
    ],
    loggerApi: 'Logger API',
    loggerApiDesc: '構造化されたデバッグ出力には組み込みロガーを使用。',
    logLevels: 'ログレベル',
    reactivityDebugging: 'リアクティビティデバッグ',
    reactivityDebuggingDesc: 'リアクティブ状態とエフェクトをデバッグするテクニック。',
    trackingDependencies: '依存関係の追跡',
    debuggingComputed: '計算値のデバッグ',
    batchDebugging: 'バッチデバッグ',
    routerDebugging: 'ルーターデバッグ',
    routerDebuggingDesc: 'ナビゲーションとルートマッチングのデバッグ。',
    hmrDebugging: 'HMRデバッグ',
    hmrDebuggingDesc: 'ホットモジュールリプレースメントの問題をデバッグ。',
    commonErrors: 'よくあるエラー',
    performanceProfiling: 'パフォーマンスプロファイリング',
    performanceProfilingDesc: 'ボトルネックを特定するためのヒント。',
    nextApiReference: '次へ: APIリファレンス →'
  },

  // Security page
  security: {
    title: '🔒 セキュリティ',
    intro: '安全なPulseアプリケーションを構築するためのベストプラクティス。',
    xssPrevention: 'XSS対策',
    xssPreventionDesc: 'クロスサイトスクリプティング（XSS）は最も一般的なWeb脆弱性の1つです。',
    safeByDefault: 'デフォルトで安全：テキストコンテンツ',
    safeByDefaultDesc: '文字列の子要素を持つel()関数は自動的にHTMLをエスケープします。',
    dangerousInnerHtml: '危険：innerHTML',
    dangerousInnerHtmlDesc: '信頼できないコンテンツにはinnerHTMLを使用しないでください。',
    safePatterns: '動的コンテンツの安全なパターン',
    urlSanitization: 'URLのサニタイズ',
    urlSanitizationDesc: 'ユーザー提供のURLは常にサニタイズしてください。',
    formSecurity: 'フォームセキュリティ',
    formSecurityDesc: 'フォームデータの安全な処理。',
    inputValidation: '入力検証',
    sensitiveData: '機密データ',
    csp: 'Content Security Policy',
    cspDesc: 'Pulseアプリケーション用の推奨CSPヘッダー。',
    apiSecurity: 'APIセキュリティ',
    apiSecurityDesc: 'データ取得の安全なパターン。',
    securityChecklist: 'セキュリティチェックリスト',
    nextPerformance: '次へ: パフォーマンスガイド'
  },

  // Performance page
  performance: {
    title: '⚡ パフォーマンス',
    intro: '最高のパフォーマンスのためにPulseアプリケーションを最適化。',
    lazyComputed: '遅延計算値',
    lazyComputedDesc: 'デフォルトでは計算値は即座に評価されます。高コストな計算には遅延評価を使用。',
    whenToUseLazy: '遅延を使用するタイミング',
    listKeying: 'リストキー',
    listKeyingDesc: '適切なキー設定はリストパフォーマンスに不可欠です。',
    goodVsBadKeys: '良いキー vs 悪いキー',
    performanceImpact: 'パフォーマンスへの影響',
    batchingUpdates: '更新のバッチ処理',
    batchingUpdatesDesc: '中間の再レンダリングを避けるために複数の状態変更をバッチ処理。',
    automaticBatching: '自動バッチ処理',
    memoization: 'メモ化',
    memoizationDesc: '冗長な作業を避けるために高コストな計算をキャッシュ。',
    lazyLoadingRoutes: 'ルートの遅延読み込み',
    lazyLoadingRoutesDesc: 'アプリをオンデマンドで読み込まれるチャンクに分割。',
    avoidUnnecessaryReactivity: '不要なリアクティビティを避ける',
    avoidUnnecessaryReactivityDesc: 'すべてがリアクティブである必要はありません。',
    effectOptimization: 'エフェクトの最適化',
    effectOptimizationDesc: 'エフェクトを高速で焦点を絞ったものに保つ。',
    resourceCaching: 'リソースキャッシング',
    resourceCachingDesc: 'asyncモジュールのキャッシング機能を使用。',
    performanceMonitoring: 'パフォーマンス監視',
    performanceMonitoringDesc: 'devtoolsモジュールを使用してパフォーマンスを監視。',
    performanceChecklist: 'パフォーマンスチェックリスト',
    nextErrorHandling: '次へ: エラー処理'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ エラー処理',
    intro: 'Pulseアプリケーション用の堅牢なエラー処理戦略。',
    effectErrorHandling: 'エフェクトのエラー処理',
    effectErrorHandlingDesc: 'エフェクトは失敗する可能性があります。エラーを適切に処理してください。',
    perEffectHandler: 'エフェクトごとのエラーハンドラー',
    globalEffectHandler: 'グローバルエフェクトエラーハンドラー',
    asyncErrorHandling: '非同期エラー処理',
    asyncErrorHandlingDesc: 'asyncモジュールは組み込みのエラー状態処理を提供。',
    formValidation: 'フォームバリデーションエラー',
    formValidationDesc: 'formモジュールでフォームバリデーションを処理。',
    routerErrorHandling: 'ルーターエラー処理',
    routerErrorHandlingDesc: 'ナビゲーションエラーと404ページを処理。',
    userFeedback: 'ユーザーフィードバック',
    userFeedbackDesc: 'ユーザーに適切にエラーを表示。',
    errorBoundaries: 'エラー境界',
    errorBoundariesDesc: 'アプリ全体のクラッシュを防ぐためにエラーを封じ込める。',
    loggingErrors: 'エラーログ',
    loggingErrorsDesc: 'デバッグと監視のためにエラーをログ。',
    errorChecklist: 'エラー処理チェックリスト',
    nextMobile: '次へ: モバイル開発'
  },

  // Mobile page
  mobile: {
    title: '📱 モバイル開発',
    intro: 'Pulseでネイティブモバイルアプリを構築。',
    gettingStarted: 'はじめに',
    gettingStartedDesc: 'モバイル開発環境をセットアップ。',
    platformDetection: 'プラットフォーム検出',
    platformDetectionDesc: '現在のプラットフォームを検出して動作を適応。',
    nativeStorage: 'ネイティブストレージ',
    nativeStorageDesc: 'Webとネイティブで動作する永続ストレージ。',
    deviceInfo: 'デバイス情報',
    deviceInfoDesc: 'デバイス情報とネットワーク状態にアクセス。',
    nativeUi: 'ネイティブUI',
    nativeUiDesc: 'トーストやバイブレーションなどのネイティブUI要素にアクセス。',
    appLifecycle: 'アプリライフサイクル',
    appLifecycleDesc: 'アプリの一時停止、再開、戻るボタンイベントを処理。',
    buildingApps: 'アプリのビルド',
    buildingAppsDesc: '配布用にアプリをビルドしてパッケージ化。',
    nextChangelog: '次へ: 変更履歴'
  },

  // Changelog page
  changelog: {
    title: '📋 変更履歴'
  }
};
