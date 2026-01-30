/**
 * Pulse Mobile CLI - Mobile platform commands
 * Zero-dependency mobile platform for Pulse Framework
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MOBILE_DIR = 'mobile';
const CONFIG_FILE = 'pulse.mobile.json';

// ============================================================================
// Helper functions
// ============================================================================

/** Create directory if it doesn't exist */
const mkdirp = (path) => !existsSync(path) && mkdirSync(path, { recursive: true });

/** Create multiple directories at once */
const mkdirs = (base, dirs) => dirs.forEach(d => mkdirp(join(base, d)));

/** Write file (auto-creates parent directories) */
const writeFile = (path, content) => {
  mkdirp(dirname(path));
  writeFileSync(path, content.trim());
};

/** Apply template variables to content */
const applyTemplate = (content, config) => content
  .replace(/\{\{APP_NAME\}\}/g, config.name)
  .replace(/\{\{DISPLAY_NAME\}\}/g, config.displayName)
  .replace(/\{\{PACKAGE_ID\}\}/g, config.packageId)
  .replace(/\{\{VERSION\}\}/g, config.version)
  .replace(/\{\{MIN_SDK\}\}/g, String(config.android?.minSdkVersion || 24))
  .replace(/\{\{TARGET_SDK\}\}/g, String(config.android?.targetSdkVersion || 34))
  .replace(/\{\{COMPILE_SDK\}\}/g, String(config.android?.compileSdkVersion || 34))
  .replace(/\{\{IOS_TARGET\}\}/g, config.ios?.deploymentTarget || '13.0');

/** Convert string to PascalCase */
const toPascalCase = (str) => str
  .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
  .replace(/^(.)/, (_, c) => c.toUpperCase());

/**
 * Handle mobile subcommands
 */
export async function handleMobileCommand(args) {
  const subcommand = args[0];
  const subargs = args.slice(1);

  switch (subcommand) {
    case 'init':
      await initMobile(subargs);
      break;
    case 'build':
      await buildMobile(subargs);
      break;
    case 'run':
      await runMobile(subargs);
      break;
    case 'sync':
      await syncAssets(subargs);
      break;
    case 'help':
    default:
      showMobileHelp();
  }
}

/**
 * Initialize mobile platforms
 */
async function initMobile(args) {
  const root = process.cwd();
  const mobileDir = join(root, MOBILE_DIR);
  const configPath = join(root, CONFIG_FILE);

  console.log('Initializing Pulse Mobile...\n');

  // Check if dist exists
  if (!existsSync(join(root, 'dist'))) {
    console.warn('Warning: No dist/ folder found. Run "pulse build" first.\n');
  }

  // Create mobile directory
  if (!existsSync(mobileDir)) {
    mkdirSync(mobileDir, { recursive: true });
  }

  // Read project name from package.json
  let projectName = 'PulseApp';
  let packageId = 'com.pulse.app';

  const packageJsonPath = join(root, 'package.json');
  if (existsSync(packageJsonPath)) {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    projectName = toPascalCase(pkg.name || 'PulseApp');
    packageId = `com.pulse.${pkg.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'app'}`;
  }

  // Create default config
  const config = {
    name: projectName,
    displayName: projectName,
    packageId: packageId,
    version: '1.0.0',
    platforms: ['android', 'ios'],
    webDir: 'dist',
    android: {
      minSdkVersion: 24,
      targetSdkVersion: 34,
      compileSdkVersion: 34
    },
    ios: {
      deploymentTarget: '13.0'
    }
  };

  // Write config if not exists
  if (!existsSync(configPath)) {
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`Created ${CONFIG_FILE}`);
  } else {
    console.log(`${CONFIG_FILE} already exists, skipping...`);
  }

  // Copy Android template
  const androidTemplateDir = join(__dirname, '..', 'mobile', 'templates', 'android');
  const androidDir = join(mobileDir, 'android');

  if (!existsSync(androidDir)) {
    if (existsSync(androidTemplateDir)) {
      console.log('Initializing Android project...');
      copyAndProcessTemplate(androidTemplateDir, androidDir, config);
      console.log('Android project created.');
    } else {
      console.log('Creating Android project structure...');
      createAndroidProject(androidDir, config);
      console.log('Android project created.');
    }
  } else {
    console.log('Android directory exists, skipping...');
  }

  // Copy iOS template
  const iosTemplateDir = join(__dirname, '..', 'mobile', 'templates', 'ios');
  const iosDir = join(mobileDir, 'ios');

  if (!existsSync(iosDir)) {
    if (existsSync(iosTemplateDir)) {
      console.log('Initializing iOS project...');
      copyAndProcessTemplate(iosTemplateDir, iosDir, config);
      console.log('iOS project created.');
    } else {
      console.log('Creating iOS project structure...');
      createIOSProject(iosDir, config);
      console.log('iOS project created.');
    }
  } else {
    console.log('iOS directory exists, skipping...');
  }

  // Copy bridge script to dist if it exists
  const bridgeSource = join(__dirname, '..', 'mobile', 'bridge', 'pulse-native.js');
  if (existsSync(join(root, 'dist')) && existsSync(bridgeSource)) {
    cpSync(bridgeSource, join(root, 'dist', 'pulse-native.js'));
    console.log('Native bridge script copied to dist/');
  }

  console.log(`
Mobile platforms initialized!

Next steps:
  1. Run "pulse build" to build your web app
  2. Run "pulse mobile build android" or "pulse mobile build ios"
  3. Run "pulse mobile run android" to test on device/emulator

Requirements:
  - Android: Android SDK with build-tools installed
  - iOS: macOS with Xcode (iOS builds only work on Mac)
  `);
}

/**
 * Build for a mobile platform
 */
async function buildMobile(args) {
  const platform = args[0]?.toLowerCase();

  if (!platform || !['android', 'ios'].includes(platform)) {
    console.error('Please specify a platform: android or ios');
    console.log('Usage: pulse mobile build <platform>');
    process.exit(1);
  }

  const root = process.cwd();
  const config = loadConfig(root);

  // First, ensure web build exists
  if (!existsSync(join(root, config.webDir))) {
    console.log('Building web app first...');
    const { buildProject } = await import('./build.js');
    await buildProject([]);
  }

  // Sync web assets to native project
  await syncWebAssets(root, platform, config);

  // Build native app
  if (platform === 'android') {
    await buildAndroid(root, config);
  } else if (platform === 'ios') {
    await buildIOS(root, config);
  }
}

/**
 * Build and run on device/emulator
 */
async function runMobile(args) {
  const platform = args[0]?.toLowerCase();

  if (!platform || !['android', 'ios'].includes(platform)) {
    console.error('Please specify a platform: android or ios');
    console.log('Usage: pulse mobile run <platform>');
    process.exit(1);
  }

  // Build first
  await buildMobile([platform]);

  const root = process.cwd();
  const config = loadConfig(root);

  // Run on device/emulator
  if (platform === 'android') {
    await runAndroid(root, config);
  } else if (platform === 'ios') {
    await runIOS(root, config);
  }
}

/**
 * Sync assets only
 */
async function syncAssets(args) {
  const platform = args[0]?.toLowerCase();
  const root = process.cwd();
  const config = loadConfig(root);

  if (platform) {
    await syncWebAssets(root, platform, config);
  } else {
    await syncWebAssets(root, 'android', config);
    await syncWebAssets(root, 'ios', config);
  }
  console.log('Assets synced successfully!');
}

/**
 * Sync web assets to native project
 */
async function syncWebAssets(root, platform, config) {
  const webDir = join(root, config.webDir);

  if (!existsSync(webDir)) {
    console.error(`Web directory "${config.webDir}" not found. Run "pulse build" first.`);
    process.exit(1);
  }

  let assetsDir;
  if (platform === 'android') {
    assetsDir = join(root, MOBILE_DIR, 'android', 'app', 'src', 'main', 'assets', 'www');
  } else {
    assetsDir = join(root, MOBILE_DIR, 'ios', 'PulseApp', 'www');
  }

  // Create assets directory
  mkdirSync(assetsDir, { recursive: true });

  // Copy web files
  cpSync(webDir, assetsDir, { recursive: true });

  // Copy native bridge
  const bridgeSource = join(__dirname, '..', 'mobile', 'bridge', 'pulse-native.js');
  if (existsSync(bridgeSource)) {
    cpSync(bridgeSource, join(assetsDir, 'pulse-native.js'));
  }

  console.log(`Web assets synced to ${platform}`);
}

/**
 * Build Android APK
 */
async function buildAndroid(root, config) {
  const androidDir = join(root, MOBILE_DIR, 'android');

  if (!existsSync(androidDir)) {
    console.error('Android project not found. Run "pulse mobile init" first.');
    process.exit(1);
  }

  console.log('Building Android APK...\n');

  // Determine gradle executable
  const isWindows = process.platform === 'win32';
  const gradlew = isWindows ? 'gradlew.bat' : './gradlew';

  try {
    execSync(`${gradlew} assembleDebug`, {
      cwd: androidDir,
      stdio: 'inherit'
    });

    const apkPath = join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    console.log(`
Build successful!
APK location: ${apkPath}
    `);
  } catch (error) {
    console.error('Android build failed.');
    console.error('Make sure Android SDK is installed and ANDROID_HOME is set.');
    process.exit(1);
  }
}

/**
 * Build iOS app
 */
async function buildIOS(root, config) {
  if (process.platform !== 'darwin') {
    console.error('iOS builds are only supported on macOS');
    process.exit(1);
  }

  const iosDir = join(root, MOBILE_DIR, 'ios');

  if (!existsSync(iosDir)) {
    console.error('iOS project not found. Run "pulse mobile init" first.');
    process.exit(1);
  }

  console.log('Building iOS app...\n');

  try {
    execSync(`xcodebuild -project PulseApp.xcodeproj -scheme PulseApp -configuration Debug -destination 'generic/platform=iOS Simulator' build`, {
      cwd: iosDir,
      stdio: 'inherit'
    });

    console.log('\niOS build successful!');
  } catch (error) {
    console.error('iOS build failed.');
    console.error('Make sure Xcode is installed and command line tools are configured.');
    process.exit(1);
  }
}

/**
 * Run on Android device/emulator
 */
async function runAndroid(root, config) {
  const androidDir = join(root, MOBILE_DIR, 'android');
  const isWindows = process.platform === 'win32';
  const gradlew = isWindows ? 'gradlew.bat' : './gradlew';

  console.log('Installing and running on Android...\n');

  try {
    execSync(`${gradlew} installDebug`, {
      cwd: androidDir,
      stdio: 'inherit'
    });

    // Launch the app
    const packageId = config.packageId;
    execSync(`adb shell am start -n ${packageId}/${packageId}.MainActivity`, {
      stdio: 'inherit'
    });

    console.log('\nApp launched on Android device/emulator');
  } catch (error) {
    console.error('Failed to run on Android.');
    console.error('Make sure a device/emulator is connected (check with "adb devices").');
    process.exit(1);
  }
}

/**
 * Run on iOS simulator
 */
async function runIOS(root, config) {
  if (process.platform !== 'darwin') {
    console.error('iOS development is only supported on macOS');
    process.exit(1);
  }

  const iosDir = join(root, MOBILE_DIR, 'ios');

  console.log('Running on iOS Simulator...\n');

  try {
    // Build for simulator
    execSync(`xcodebuild -project PulseApp.xcodeproj -scheme PulseApp -destination 'platform=iOS Simulator,name=iPhone 15' -configuration Debug build`, {
      cwd: iosDir,
      stdio: 'inherit'
    });

    // Boot simulator if needed
    try {
      execSync('xcrun simctl boot "iPhone 15"', { stdio: 'pipe' });
    } catch (e) {
      // Simulator might already be booted
    }

    // Get app path and install
    const buildDir = join(iosDir, 'build', 'Debug-iphonesimulator');
    execSync(`xcrun simctl install booted "${join(buildDir, 'PulseApp.app')}"`, {
      stdio: 'inherit'
    });

    // Launch app
    execSync(`xcrun simctl launch booted ${config.packageId}`, {
      stdio: 'inherit'
    });

    console.log('\nApp launched on iOS Simulator');
  } catch (error) {
    console.error('Failed to run on iOS.');
    process.exit(1);
  }
}

/**
 * Load mobile config
 */
function loadConfig(root) {
  const configPath = join(root, CONFIG_FILE);

  if (!existsSync(configPath)) {
    console.error(`No ${CONFIG_FILE} found. Run "pulse mobile init" first.`);
    process.exit(1);
  }

  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

/** Copy and process template files */
function copyAndProcessTemplate(src, dest, config) {
  if (!existsSync(src)) return;
  mkdirp(dest);

  for (const file of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, file.name);
    const destPath = join(dest, file.name);

    if (file.isDirectory()) {
      copyAndProcessTemplate(srcPath, destPath, config);
    } else {
      writeFileSync(destPath, applyTemplate(readFileSync(srcPath, 'utf-8'), config));
    }
  }
}

/** Create Android project from scratch */
function createAndroidProject(androidDir, config) {
  const packagePath = config.packageId.replace(/\./g, '/');

  // Create directory structure
  mkdirs(androidDir, [
    'app/src/main/java/' + packagePath,
    'app/src/main/res/layout', 'app/src/main/res/values', 'app/src/main/res/drawable',
    'app/src/main/res/mipmap-hdpi', 'app/src/main/res/mipmap-mdpi',
    'app/src/main/res/mipmap-xhdpi', 'app/src/main/res/mipmap-xxhdpi', 'app/src/main/res/mipmap-xxxhdpi',
    'app/src/main/assets/www', 'gradle/wrapper'
  ]);

  // MainActivity.java
  writeFileSync(join(androidDir, 'app/src/main/java', packagePath, 'MainActivity.java'), `
package ${config.packageId};

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.util.Log;
import android.app.Activity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.graphics.Color;
import android.os.Build;

public class MainActivity extends Activity {
    private static final String TAG = "PulseApp";
    private WebView webView;
    private PulseBridge bridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Full screen
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        );

        // Create WebView
        webView = new WebView(this);
        setContentView(webView);

        // Configure WebView
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        if (BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // Set up native bridge
        bridge = new PulseBridge(this);
        webView.addJavascriptInterface(bridge, "PulseNative");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                injectBridgeInit();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                Log.d(TAG, consoleMessage.message());
                return true;
            }
        });

        webView.loadUrl("file:///android_asset/www/index.html");
    }

    private void injectBridgeInit() {
        String script = "if(typeof window.initPulseNative === 'function') { window.initPulseNative(); }";
        webView.evaluateJavascript(script, null);
    }

    public void executeJS(String script) {
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}
`.trim());

  // PulseBridge.java
  writeFileSync(join(androidDir, 'app/src/main/java', packagePath, 'PulseBridge.java'), `
package ${config.packageId};

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.webkit.JavascriptInterface;
import android.provider.Settings;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.widget.Toast;
import android.content.pm.PackageManager;
import android.content.pm.PackageInfo;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import org.json.JSONObject;
import org.json.JSONException;

public class PulseBridge {
    private static final String PREFS_NAME = "PulseStorage";
    private Context context;
    private MainActivity activity;

    public PulseBridge(MainActivity activity) {
        this.activity = activity;
        this.context = activity.getApplicationContext();
    }

    // Storage API
    @JavascriptInterface
    public void setItem(String key, String value) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(key, value).apply();
    }

    @JavascriptInterface
    public String getItem(String key) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getString(key, null);
    }

    @JavascriptInterface
    public void removeItem(String key) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(key).apply();
    }

    @JavascriptInterface
    public void clearStorage() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();
    }

    @JavascriptInterface
    public String getAllKeys() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return String.join(",", prefs.getAll().keySet());
    }

    // Device Info
    @JavascriptInterface
    public String getDeviceInfo() {
        try {
            JSONObject info = new JSONObject();
            info.put("platform", "android");
            info.put("model", Build.MODEL);
            info.put("manufacturer", Build.MANUFACTURER);
            info.put("version", Build.VERSION.RELEASE);
            info.put("sdkVersion", Build.VERSION.SDK_INT);
            info.put("appVersion", getAppVersion());
            return info.toString();
        } catch (JSONException e) {
            return "{}";
        }
    }

    private String getAppVersion() {
        try {
            PackageInfo pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return pInfo.versionName;
        } catch (PackageManager.NameNotFoundException e) {
            return "1.0.0";
        }
    }

    @JavascriptInterface
    public String getNetworkStatus() {
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            JSONObject status = new JSONObject();
            status.put("connected", activeNetwork != null && activeNetwork.isConnected());
            status.put("type", activeNetwork != null ? activeNetwork.getTypeName() : "none");
            return status.toString();
        } catch (JSONException e) {
            return "{\\"connected\\":false,\\"type\\":\\"none\\"}";
        }
    }

    // UI API
    @JavascriptInterface
    public void showToast(String message, boolean isLong) {
        int duration = isLong ? Toast.LENGTH_LONG : Toast.LENGTH_SHORT;
        activity.runOnUiThread(() -> Toast.makeText(context, message, duration).show());
    }

    @JavascriptInterface
    public void vibrate(int duration) {
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(duration);
            }
        }
    }

    // Clipboard
    @JavascriptInterface
    public void copyToClipboard(String text) {
        android.content.ClipboardManager clipboard =
            (android.content.ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        android.content.ClipData clip = android.content.ClipData.newPlainText("Pulse", text);
        clipboard.setPrimaryClip(clip);
    }

    @JavascriptInterface
    public String getClipboardText() {
        android.content.ClipboardManager clipboard =
            (android.content.ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        if (clipboard.hasPrimaryClip()) {
            android.content.ClipData.Item item = clipboard.getPrimaryClip().getItemAt(0);
            CharSequence text = item.getText();
            return text != null ? text.toString() : "";
        }
        return "";
    }

    // App Lifecycle
    @JavascriptInterface
    public void exitApp() {
        activity.runOnUiThread(() -> activity.finish());
    }

    @JavascriptInterface
    public void minimizeApp() {
        activity.runOnUiThread(() -> activity.moveTaskToBack(true));
    }
}
`.trim());

  // AndroidManifest.xml
  writeFileSync(join(androidDir, 'app/src/main/AndroidManifest.xml'), `
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.packageId}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.displayName}"
        android:supportsRtl="true"
        android:theme="@style/Theme.PulseApp"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize"
            android:launchMode="singleTask">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`.trim());

  // app/build.gradle
  writeFileSync(join(androidDir, 'app/build.gradle'), `
plugins {
    id 'com.android.application'
}

android {
    namespace '${config.packageId}'
    compileSdk ${config.android?.compileSdkVersion || 34}

    defaultConfig {
        applicationId "${config.packageId}"
        minSdk ${config.android?.minSdkVersion || 24}
        targetSdk ${config.android?.targetSdkVersion || 34}
        versionCode 1
        versionName "${config.version}"
    }

    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {}
`.trim());

  // build.gradle (project level)
  writeFileSync(join(androidDir, 'build.gradle'), `
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.0'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
`.trim());

  // settings.gradle
  writeFileSync(join(androidDir, 'settings.gradle'), `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

rootProject.name = "${config.name}"
include ':app'
`.trim());

  // gradle-wrapper.properties
  writeFileSync(join(androidDir, 'gradle/wrapper/gradle-wrapper.properties'), `
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.4-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`.trim());

  // gradlew (Unix)
  writeFileSync(join(androidDir, 'gradlew'), `#!/bin/sh
exec gradle "$@"
`.trim());

  // gradlew.bat (Windows)
  writeFileSync(join(androidDir, 'gradlew.bat'), `@echo off
gradle %*
`.trim());

  // styles.xml
  writeFileSync(join(androidDir, 'app/src/main/res/values/styles.xml'), `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.PulseApp" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:windowBackground">@android:color/white</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
    </style>
</resources>
`.trim());

  // strings.xml
  writeFileSync(join(androidDir, 'app/src/main/res/values/strings.xml'), `
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.displayName}</string>
</resources>
`.trim());

  // proguard-rules.pro
  writeFileSync(join(androidDir, 'app/proguard-rules.pro'), `
# Pulse WebView bridge
-keepclassmembers class ${config.packageId}.PulseBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
`.trim());
}

/** Create iOS project from scratch */
function createIOSProject(iosDir, config) {
  mkdirs(iosDir, ['PulseApp', 'PulseApp/www', 'PulseApp/Assets.xcassets', 'PulseApp.xcodeproj']);

  // AppDelegate.swift
  writeFileSync(join(iosDir, 'PulseApp/AppDelegate.swift'), `
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }
}
`.trim());

  // SceneDelegate.swift
  writeFileSync(join(iosDir, 'PulseApp/SceneDelegate.swift'), `
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene,
               willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ViewController()
        window?.makeKeyAndVisible()
    }
}
`.trim());

  // ViewController.swift
  writeFileSync(join(iosDir, 'PulseApp/ViewController.swift'), `
import UIKit
import WebKit

class ViewController: UIViewController, WKNavigationDelegate {
    private var webView: WKWebView!
    private var bridge: PulseBridge!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        loadApp()
    }

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        bridge = PulseBridge(viewController: self)
        config.userContentController.add(bridge, name: "PulseNative")

        webView = WKWebView(frame: view.bounds, configuration: config)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.scrollView.bounces = false

        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        view.addSubview(webView)
    }

    private func loadApp() {
        guard let indexPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "www") else {
            print("Error: Could not find www/index.html")
            return
        }

        let indexURL = URL(fileURLWithPath: indexPath)
        webView.loadFileURL(indexURL, allowingReadAccessTo: indexURL.deletingLastPathComponent())
    }

    func executeJS(_ script: String) {
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("if(typeof window.initPulseNative === 'function') { window.initPulseNative(); }", completionHandler: nil)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}
`.trim());

  // PulseBridge.swift
  writeFileSync(join(iosDir, 'PulseApp/PulseBridge.swift'), `
import UIKit
import WebKit

class PulseBridge: NSObject, WKScriptMessageHandler {
    private weak var viewController: ViewController?
    private let userDefaults = UserDefaults.standard
    private let prefix = "pulse_"

    init(viewController: ViewController) {
        self.viewController = viewController
        super.init()
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any],
              let action = body["action"] as? String,
              let callbackId = body["callbackId"] as? String else { return }

        let args = body["args"] as? [String: Any] ?? [:]

        switch action {
        case "setItem":
            if let key = args["key"] as? String, let value = args["value"] as? String {
                userDefaults.set(value, forKey: prefix + key)
            }
            sendSuccess(callbackId: callbackId, data: nil)

        case "getItem":
            if let key = args["key"] as? String {
                let value = userDefaults.string(forKey: prefix + key)
                sendSuccess(callbackId: callbackId, data: value)
            }

        case "removeItem":
            if let key = args["key"] as? String {
                userDefaults.removeObject(forKey: prefix + key)
            }
            sendSuccess(callbackId: callbackId, data: nil)

        case "clearStorage":
            let keys = userDefaults.dictionaryRepresentation().keys.filter { $0.hasPrefix(prefix) }
            for key in keys { userDefaults.removeObject(forKey: key) }
            sendSuccess(callbackId: callbackId, data: nil)

        case "getAllKeys":
            let keys = userDefaults.dictionaryRepresentation().keys
                .filter { $0.hasPrefix(prefix) }
                .map { String($0.dropFirst(prefix.count)) }
            sendSuccess(callbackId: callbackId, data: keys)

        case "getDeviceInfo":
            let device = UIDevice.current
            let info: [String: Any] = [
                "platform": "ios",
                "model": device.model,
                "systemVersion": device.systemVersion,
                "name": device.name,
                "appVersion": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
            ]
            sendSuccess(callbackId: callbackId, data: info)

        case "getNetworkStatus":
            let status: [String: Any] = ["connected": true, "type": "unknown"]
            sendSuccess(callbackId: callbackId, data: status)

        case "showToast":
            if let message = args["message"] as? String {
                DispatchQueue.main.async {
                    let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
                    self.viewController?.present(alert, animated: true) {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { alert.dismiss(animated: true) }
                    }
                }
            }
            sendSuccess(callbackId: callbackId, data: nil)

        case "vibrate":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            sendSuccess(callbackId: callbackId, data: nil)

        case "copyToClipboard":
            if let text = args["text"] as? String {
                UIPasteboard.general.string = text
            }
            sendSuccess(callbackId: callbackId, data: nil)

        case "getClipboardText":
            sendSuccess(callbackId: callbackId, data: UIPasteboard.general.string ?? "")

        default:
            sendError(callbackId: callbackId, message: "Unknown action")
        }
    }

    private func sendSuccess(callbackId: String, data: Any?) {
        var response: [String: Any] = ["success": true]
        if let data = data { response["data"] = data }
        sendResponse(callbackId: callbackId, response: response)
    }

    private func sendError(callbackId: String, message: String) {
        sendResponse(callbackId: callbackId, response: ["success": false, "error": message])
    }

    private func sendResponse(callbackId: String, response: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: response),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        DispatchQueue.main.async {
            self.viewController?.executeJS("window.__pulseNativeCallback('\\(callbackId)', \\(jsonString));")
        }
    }
}
`.trim());

  // Info.plist
  writeFileSync(join(iosDir, 'PulseApp/Info.plist'), `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>${config.displayName}</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>${config.packageId}</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>${config.version}</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSRequiresIPhoneOS</key>
    <true/>
    <key>UIApplicationSceneManifest</key>
    <dict>
        <key>UIApplicationSupportsMultipleScenes</key>
        <false/>
        <key>UISceneConfigurations</key>
        <dict>
            <key>UIWindowSceneSessionRoleApplication</key>
            <array>
                <dict>
                    <key>UISceneConfigurationName</key>
                    <string>Default Configuration</string>
                    <key>UISceneDelegateClassName</key>
                    <string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
                </dict>
            </array>
        </dict>
    </dict>
    <key>UILaunchStoryboardName</key>
    <string>LaunchScreen</string>
    <key>UISupportedInterfaceOrientations</key>
    <array>
        <string>UIInterfaceOrientationPortrait</string>
        <string>UIInterfaceOrientationLandscapeLeft</string>
        <string>UIInterfaceOrientationLandscapeRight</string>
    </array>
</dict>
</plist>
`.trim());

  // Minimal Xcode project file (project.pbxproj)
  writeFileSync(join(iosDir, 'PulseApp.xcodeproj/project.pbxproj'), generateXcodeProject(config));
}

/**
 * Generate minimal Xcode project file
 */
function generateXcodeProject(config) {
  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 56;
	objects = {

/* Begin PBXBuildFile section */
		1A0000000000000000000001 /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 1A0000000000000000000011; };
		1A0000000000000000000002 /* SceneDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = 1A0000000000000000000012; };
		1A0000000000000000000003 /* ViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = 1A0000000000000000000013; };
		1A0000000000000000000004 /* PulseBridge.swift in Sources */ = {isa = PBXBuildFile; fileRef = 1A0000000000000000000014; };
		1A0000000000000000000005 /* www in Resources */ = {isa = PBXBuildFile; fileRef = 1A0000000000000000000015; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		1A0000000000000000000010 /* PulseApp.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = PulseApp.app; sourceTree = BUILT_PRODUCTS_DIR; };
		1A0000000000000000000011 /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = AppDelegate.swift; sourceTree = "<group>"; };
		1A0000000000000000000012 /* SceneDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = SceneDelegate.swift; sourceTree = "<group>"; };
		1A0000000000000000000013 /* ViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ViewController.swift; sourceTree = "<group>"; };
		1A0000000000000000000014 /* PulseBridge.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = PulseBridge.swift; sourceTree = "<group>"; };
		1A0000000000000000000015 /* www */ = {isa = PBXFileReference; lastKnownFileType = folder; path = www; sourceTree = "<group>"; };
		1A0000000000000000000016 /* Info.plist */ = {isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXGroup section */
		1A0000000000000000000020 = {
			isa = PBXGroup;
			children = (
				1A0000000000000000000021 /* PulseApp */,
				1A0000000000000000000022 /* Products */,
			);
			sourceTree = "<group>";
		};
		1A0000000000000000000021 /* PulseApp */ = {
			isa = PBXGroup;
			children = (
				1A0000000000000000000011,
				1A0000000000000000000012,
				1A0000000000000000000013,
				1A0000000000000000000014,
				1A0000000000000000000015,
				1A0000000000000000000016,
			);
			path = PulseApp;
			sourceTree = "<group>";
		};
		1A0000000000000000000022 /* Products */ = {
			isa = PBXGroup;
			children = (
				1A0000000000000000000010,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		1A0000000000000000000030 /* PulseApp */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = 1A0000000000000000000050;
			buildPhases = (
				1A0000000000000000000031,
				1A0000000000000000000032,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = PulseApp;
			productName = PulseApp;
			productReference = 1A0000000000000000000010;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		1A0000000000000000000040 /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
				TargetAttributes = {
					1A0000000000000000000030 = {
						CreatedOnToolsVersion = 15.0;
					};
				};
			};
			buildConfigurationList = 1A0000000000000000000041;
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = 1A0000000000000000000020;
			productRefGroup = 1A0000000000000000000022;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				1A0000000000000000000030,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		1A0000000000000000000032 /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1A0000000000000000000005,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		1A0000000000000000000031 /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				1A0000000000000000000001,
				1A0000000000000000000002,
				1A0000000000000000000003,
				1A0000000000000000000004,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		1A0000000000000000000051 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = PulseApp/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = ${config.ios?.deploymentTarget || '13.0'};
				MARKETING_VERSION = ${config.version};
				PRODUCT_BUNDLE_IDENTIFIER = ${config.packageId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		1A0000000000000000000052 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = NO;
				INFOPLIST_FILE = PulseApp/Info.plist;
				IPHONEOS_DEPLOYMENT_TARGET = ${config.ios?.deploymentTarget || '13.0'};
				MARKETING_VERSION = ${config.version};
				PRODUCT_BUNDLE_IDENTIFIER = ${config.packageId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
		1A0000000000000000000061 /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				MTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
				ONLY_ACTIVE_ARCH = YES;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			};
			name = Debug;
		};
		1A0000000000000000000062 /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				ENABLE_NS_ASSERTIONS = NO;
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				MTL_ENABLE_DEBUG_INFO = NO;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
				VALIDATE_PRODUCT = YES;
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		1A0000000000000000000041 /* Build configuration list for PBXProject "PulseApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				1A0000000000000000000061,
				1A0000000000000000000062,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		1A0000000000000000000050 /* Build configuration list for PBXNativeTarget "PulseApp" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				1A0000000000000000000051,
				1A0000000000000000000052,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = 1A0000000000000000000040 /* Project object */;
}
`;
}

/** Show mobile help */
function showMobileHelp() {
  console.log(`
Pulse Mobile - Zero-Dependency Mobile Platform

Usage: pulse mobile <command> [options]

Commands:
  init                Initialize mobile platforms (Android & iOS)
  build <platform>    Build for android or ios
  run <platform>      Build and run on device/emulator
  sync [platform]     Sync web assets to native projects

Examples:
  pulse mobile init
  pulse mobile build android
  pulse mobile build ios
  pulse mobile run android
  pulse mobile run ios

Configuration:
  Edit pulse.mobile.json to customize your mobile app settings.

Requirements:
  Android: Android SDK with build-tools
  iOS: macOS with Xcode (builds only work on Mac)
  `);
}

export default { handleMobileCommand };
