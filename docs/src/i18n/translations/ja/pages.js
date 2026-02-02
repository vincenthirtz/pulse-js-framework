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
    pulses: 'パルス（リアクティブ状態）',
    pulsesDesc: 'パルスは値が変更されたときにサブスクライバーに通知するリアクティブコンテナです。',
    effects: 'エフェクト',
    effectsDesc: 'エフェクトは依存関係が変更されると自動的に実行されます。',
    cssSelectorSyntax: 'CSSセレクター構文',
    cssSelectorSyntaxDesc: 'おなじみのCSSセレクター構文でDOM要素を作成。',
    pulseFileSyntax: '.pulseファイル構文',
    pulseFileSyntaxDesc: '.pulse DSLは、コンポーネントを書くためのクリーンで宣言的な方法を提供します。',
    blocks: 'ブロック',
    imports: 'インポート',
    directives: 'ディレクティブ',
    slots: 'スロット（コンテンツ投影）',
    slotsDesc: 'スロットを使用して動的コンテンツでコンポーネントを構成。',
    cssScoping: 'CSSスコープ',
    cssScopingDesc: '.pulseファイル内のスタイルは自動的にコンポーネントにスコープされます。',
    advancedRouting: '高度なルーティング',
    advancedRoutingDesc: 'Pulseルーターは遅延読み込み、ミドルウェア、コード分割をサポート。',
    lazyLoading: '遅延読み込み',
    lazyLoadingDesc: '初期バンドルサイズを削減するためにルートコンポーネントをオンデマンドで読み込み。',
    middleware: 'ミドルウェア',
    middlewareDesc: '柔軟なナビゲーション制御のためのKoaスタイルミドルウェア。',
    nextApiReference: '次へ: APIリファレンス →'
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
    viewDemo: 'デモを見る →',
    viewSource: 'ソースを見る',
    hmrDemo: {
      title: 'HMRデモ',
      desc: '状態保持付きホットモジュールリプレースメント。',
      features: [
        'HMR中の状態保持',
        'エフェクトの自動クリーンアップ',
        'テーマ切り替え',
        'メモの永続化',
        'HMR更新カウンター'
      ]
    },
    blog: {
      title: '📰 ブログ',
      desc: 'CRUD、カテゴリ、検索機能付きの完全なブログアプリ。',
      features: [
        'CRUD操作',
        'カテゴリフィルタリング',
        '検索機能',
        'ライト/ダークモード',
        'レスポンシブデザイン'
      ]
    },
    todoApp: {
      title: '📝 Todoアプリ',
      desc: 'ダークモードと永続化付きの完全なTodoアプリ。',
      features: [
        '追加、編集、削除',
        'ステータスフィルター',
        'ダークモード',
        'LocalStorage永続化',
        '進捗トラッキング'
      ]
    },
    weatherApp: {
      title: '🌤️ 天気アプリ',
      desc: 'Open-Meteo APIを使用したリアルタイム天気アプリ。',
      features: [
        '都市検索',
        '現在の状況',
        '7日間予報',
        'お気に入り都市',
        '°C/°F切り替え'
      ]
    },
    ecommerce: {
      title: '🛒 ECショップ',
      desc: 'カートとチェックアウト付きの完全なショッピング体験。',
      features: [
        '商品カタログ',
        '検索とフィルター',
        'ショッピングカート',
        'チェックアウトフロー',
        'LocalStorage永続化'
      ]
    },
    chatApp: {
      title: '💬 チャットアプリ',
      desc: 'ルームとシミュレートユーザー付きリアルタイムメッセージング。',
      features: [
        '複数ルーム',
        'ユーザープレゼンス',
        'シミュレートボット返信',
        '絵文字ピッカー',
        'メッセージ永続化'
      ]
    },
    routerDemo: {
      title: '🧭 ルーターデモ',
      desc: 'ナビゲーション、ガード、動的ルート付きSPAルーティング。',
      features: [
        'ルートパラメータ',
        'クエリストリング',
        'ルートガード',
        'アクティブリンクスタイル',
        '保護されたルート'
      ]
    },
    storeDemo: {
      title: '📝 ストアデモ',
      desc: 'Pulseストアシステムによるグローバル状態管理。',
      features: [
        '永続化付きcreateStore',
        'アクションとゲッター',
        '元に戻す/やり直し',
        'モジュラーストア',
        'ロガープラグイン'
      ]
    },
    dashboard: {
      title: '📊 管理ダッシュボード',
      desc: 'すべての機能を実演する完全な管理インターフェース。',
      features: [
        '認証とガード',
        'チャート、テーブル、モーダル',
        'CRUD操作',
        'テーマと設定',
        'すべてのリアクティブ機能'
      ]
    },
    sportsNews: {
      title: '⚽ スポーツニュース',
      desc: 'HTTPクライアントとリアクティブデータ取得を備えたニュースアプリ。',
      features: [
        'HTTPクライアント統合',
        'カテゴリーフィルタリング',
        'デバウンス検索',
        'お気に入りシステム',
        'ダークモード'
      ]
    },
    runLocally: 'ローカルで実行',
    runLocallyDesc: 'マシンでサンプルプロジェクトを実行するには：',
    createYourOwn: '自分で作成',
    createYourOwnDesc: '新しいPulseプロジェクトを開始：',
    mobileExamples: '📱 モバイルサンプル',
    mobileExamplesDesc: 'PulseはWebView経由でモバイルプラットフォームでも実行できます。'
  },

  // Playground page
  playground: {
    title: '🎮 プレイグラウンド',
    intro: 'ブラウザでPulseを試してみましょう。コードを編集して結果を即座に確認できます。',
    codeEditor: '📝 コードエディター',
    preview: '👁️ プレビュー',
    run: '▶ 実行',
    reset: '↺ リセット',
    share: '共有',
    ready: '準備完了',
    running: '実行中...',
    success: '✓ 成功',
    errorPrefix: 'エラー:',
    templates: '📋 クイックテンプレート',
    templateCounter: 'カウンター',
    templateTodo: 'Todoリスト',
    templateTimer: 'タイマー',
    templateForm: 'フォーム',
    templateCalculator: '電卓',
    templateTabs: 'タブ',
    templateTheme: 'テーマ',
    templateSearch: '検索',
    templateCart: 'カート',
    templateAnimation: 'アニメーション'
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
    checklist: 'セキュリティチェックリスト',
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
    batching: '更新のバッチ処理',
    batchingDesc: '中間の再レンダリングを避けるために複数の状態変更をバッチ処理。',
    automaticBatching: '自動バッチ処理',
    memoization: 'メモ化',
    memoizationDesc: '冗長な作業を避けるために高コストな計算をキャッシュ。',
    lazyRoutes: 'ルートの遅延読み込み',
    lazyRoutesDesc: 'アプリをオンデマンドで読み込まれるチャンクに分割。',
    avoidReactivity: '不要なリアクティビティを避ける',
    avoidReactivityDesc: 'すべてがリアクティブである必要はありません。',
    effectOptimization: 'エフェクトの最適化',
    effectOptimizationDesc: 'エフェクトを高速で焦点を絞ったものに保つ。',
    resourceCaching: 'リソースキャッシング',
    resourceCachingDesc: 'asyncモジュールのキャッシング機能を使用。',
    monitoring: 'パフォーマンス監視',
    monitoringDesc: 'devtoolsモジュールを使用してパフォーマンスを監視。',
    checklist: 'パフォーマンスチェックリスト',
    nextErrorHandling: '次へ: エラー処理'
  },

  // Error Handling page
  errorHandling: {
    title: '🛡️ エラー処理',
    intro: 'Pulseアプリケーション用の堅牢なエラー処理戦略。',
    effectErrors: 'エフェクトエラー',
    asyncErrors: '非同期エラー',
    formErrors: 'フォームエラー',
    routerErrors: 'ルーターエラー',
    boundaries: 'エラー境界',
    logging: 'ログとレポート',
    gracefulDegradation: 'グレースフルデグラデーション',
    summary: 'まとめ',
    nextApiReference: '次へ: APIリファレンス →'
  },

  // HTTP page
  http: {
    title: '🌐 HTTPクライアント',
    intro: 'APIリクエスト用の依存関係なしHTTPクライアント。ネイティブfetchベースでインターセプター、リトライ、タイムアウト、リアクティブ統合をサポート。',
    quickStart: 'クイックスタート',
    quickStartDesc: 'HTTPクライアントをインポートして使用:',
    configuration: '設定',
    configurationDesc: 'すべてのリクエストのデフォルト設定を構成:',
    httpMethods: 'HTTPメソッド',
    responseStructure: 'レスポンス構造',
    interceptors: 'インターセプター',
    interceptorsDesc: 'インターセプターでリクエストとレスポンスをグローバルに変換。',
    requestInterceptors: 'リクエストインターセプター',
    responseInterceptors: 'レスポンスインターセプター',
    manageInterceptors: 'インターセプター管理',
    errorHandling: 'エラー処理',
    errorHandlingDesc: 'すべてのエラーは便利なプロパティを持つHttpErrorにラップ:',
    errorCodes: 'エラーコード',
    description: '説明',
    when: '発生条件',
    errorTimeout: 'タイムアウト',
    errorTimeoutWhen: 'レスポンス前にタイムアウトが満了',
    errorNetwork: 'ネットワークエラー',
    errorNetworkWhen: '接続なしまたはサーバー到達不能',
    errorAbort: 'リクエスト中止',
    errorAbortWhen: 'AbortController.abort()が呼び出された',
    errorHttp: 'HTTPエラー',
    errorHttpWhen: 'レスポンスステータスが2xx範囲外',
    errorParse: 'パースエラー',
    errorParseWhen: 'JSON/blobパースエラー',
    cancellation: 'リクエストキャンセル',
    cancellationDesc: 'AbortControllerでリクエストをキャンセル:',
    retry: 'リトライ設定',
    retryDesc: '失敗したリクエストを自動リトライ:',
    reactiveIntegration: 'リアクティブ統合',
    reactiveIntegrationDesc: 'HTTPリクエストをPulseリアクティビティとシームレスに統合:',
    useHttpResourceDesc: 'SWRパターンでキャッシュされたリソース用:',
    childInstances: '子インスタンス',
    childInstancesDesc: '親から継承する特殊化されたクライアントを作成:',
    fileUpload: 'ファイルアップロード',
    urlParameters: 'URLパラメータ',
    fullExample: '完全な例'
  },

  // Mobile page
  mobile: {
    title: '📱 モバイル開発',
    intro: 'Pulseでネイティブモバイルアプリを構築。',
    overview: '概要',
    quickStart: 'クイックスタート',
    cliCommands: 'CLIコマンド',
    configuration: '設定',
    configurationDesc: 'pulse.mobile.jsonファイルでモバイルアプリを設定。',
    nativeApis: 'ネイティブAPI',
    requirements: '要件',
    requirementsAndroid: 'Android',
    requirementsIos: 'iOS',
    nextExamples: '次へ: 例 →'
  },

  // Changelog page
  changelog: {
    title: '📋 変更履歴',
    intro: 'Pulse Frameworkの最近の更新と改善。',
    version: 'バージョン',
    releaseDate: 'リリース日',
    changes: '変更点',
    added: '追加',
    changed: '変更',
    fixed: '修正',
    removed: '削除',
    deprecated: '非推奨',
    security: 'セキュリティ',
    breaking: '破壊的変更',
    features: '機能',
    bugFixes: 'バグ修正',
    improvements: '改善',
    documentation: 'ドキュメント',
    performance: 'パフォーマンス',
    tests: 'テスト'
  }
};
