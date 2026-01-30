/**
 * Pulse Documentation - Mobile Page
 */

import { el } from '/runtime/index.js';

export function MobilePage() {
  const page = el('.page.mobile-page');

  page.innerHTML = `
    <h1>📱 Mobile Apps</h1>
    <p class="intro">Build native Android & iOS apps from your Pulse project with zero external dependencies.</p>

    <section class="doc-section">
      <h2>Overview</h2>
      <p>Pulse Mobile lets you package your web app as a native mobile app without using Capacitor, Cordova, or any external dependencies. It provides pure native templates (Java for Android, Swift for iOS) with a WebView container and JavaScript bridge for native features.</p>

      <div class="feature-grid">
        <div class="feature-item">
          <span class="feature-icon">🚀</span>
          <h4>Zero Dependencies</h4>
          <p>Pure native code, no npm packages needed</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📦</span>
          <h4>Single Codebase</h4>
          <p>Same Pulse app runs on web, Android, and iOS</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">⚡</span>
          <h4>Native Performance</h4>
          <p>WebView with hardware acceleration</p>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔧</span>
          <h4>Native APIs</h4>
          <p>Access storage, device info, clipboard, and more</p>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Quick Start</h2>

      <div class="code-block">
        <pre><code># Initialize mobile platforms in your Pulse project
pulse mobile init

# Build your web app
pulse build

# Build for Android (requires Android SDK)
pulse mobile build android

# Build for iOS (requires macOS + Xcode)
pulse mobile build ios

# Run on device/emulator
pulse mobile run android
pulse mobile run ios</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>CLI Commands</h2>

      <div class="api-item">
        <h3><code>pulse mobile init</code></h3>
        <p>Initializes mobile platforms in your project. Creates:</p>
        <ul>
          <li><code>mobile/android/</code> - Android project with WebView</li>
          <li><code>mobile/ios/</code> - iOS project with WKWebView</li>
          <li><code>pulse.mobile.json</code> - Configuration file</li>
        </ul>
      </div>

      <div class="api-item">
        <h3><code>pulse mobile build &lt;platform&gt;</code></h3>
        <p>Builds a native app for the specified platform.</p>
        <ul>
          <li><code>android</code> - Generates APK at <code>mobile/android/app/build/outputs/apk/</code></li>
          <li><code>ios</code> - Builds iOS app (macOS only)</li>
        </ul>
      </div>

      <div class="api-item">
        <h3><code>pulse mobile run &lt;platform&gt;</code></h3>
        <p>Builds and runs the app on a connected device or emulator.</p>
      </div>

      <div class="api-item">
        <h3><code>pulse mobile sync</code></h3>
        <p>Syncs web assets to native projects without rebuilding.</p>
      </div>
    </section>

    <section class="doc-section">
      <h2>Configuration</h2>
      <p>The <code>pulse.mobile.json</code> file configures your mobile app:</p>

      <div class="code-block">
        <pre><code>{
  "name": "MyApp",
  "displayName": "My App",
  "packageId": "com.example.myapp",
  "version": "1.0.0",
  "webDir": "dist",
  "android": {
    "minSdkVersion": 24,
    "targetSdkVersion": 34
  },
  "ios": {
    "deploymentTarget": "13.0"
  }
}</code></pre>
      </div>
    </section>

    <section class="doc-section">
      <h2>Native APIs</h2>

      <div class="api-item">
        <h3><code>onNativeReady(callback)</code></h3>
        <p>Called when the native bridge is ready. Use this to initialize your app.</p>
        <div class="code-block">
          <pre><code>import { onNativeReady } from 'pulse-framework/runtime/native';

onNativeReady(({ platform }) => {
  console.log(\`Running on \${platform}\`); // 'android', 'ios', or 'web'
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>createNativeStorage(prefix?)</code></h3>
        <p>Creates reactive native storage that persists across app restarts.</p>
        <div class="code-block">
          <pre><code>import { createNativeStorage } from 'pulse-framework/runtime/native';

const storage = createNativeStorage('myapp_');

// Get a reactive value (auto-loads from storage)
const count = storage.get('count', 0);

// Update it (auto-persists)
count.set(42);
count.update(n => n + 1);</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>createDeviceInfo()</code></h3>
        <p>Creates reactive device and network information.</p>
        <div class="code-block">
          <pre><code>import { createDeviceInfo } from 'pulse-framework/runtime/native';

const device = createDeviceInfo();

// Reactive device info
effect(() => {
  const info = device.info.get();
  console.log(info.platform, info.model);
});

// Reactive network status
effect(() => {
  const network = device.network.get();
  console.log(network.connected ? 'Online' : 'Offline');
});</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>NativeUI</code></h3>
        <p>Native UI helpers for toast notifications and haptic feedback.</p>
        <div class="code-block">
          <pre><code>import { NativeUI } from 'pulse-framework/runtime/native';

// Show a toast notification
NativeUI.toast('Hello!');
NativeUI.toast('Long message', true); // longer duration

// Haptic feedback / vibration
NativeUI.vibrate(100); // 100ms</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3><code>NativeClipboard</code></h3>
        <p>Read and write to the clipboard.</p>
        <div class="code-block">
          <pre><code>import { NativeClipboard } from 'pulse-framework/runtime/native';

// Copy text
await NativeClipboard.copy('Hello World');

// Read text
const text = await NativeClipboard.read();</code></pre>
        </div>
      </div>

      <div class="api-item">
        <h3>App Lifecycle</h3>
        <p>Handle app lifecycle events.</p>
        <div class="code-block">
          <pre><code>import { onAppPause, onAppResume, onBackButton } from 'pulse-framework/runtime/native';

onAppPause(() => {
  console.log('App paused');
});

onAppResume(() => {
  console.log('App resumed');
});

onBackButton(() => {
  // Handle Android back button
  router.back();
});</code></pre>
        </div>
      </div>
    </section>

    <section class="doc-section">
      <h2>Requirements</h2>

      <h3>Android</h3>
      <ul>
        <li>Android SDK with build-tools installed</li>
        <li>ANDROID_HOME environment variable set</li>
        <li>ADB for running on devices</li>
      </ul>

      <h3>iOS</h3>
      <ul>
        <li>macOS (iOS builds only work on Mac)</li>
        <li>Xcode installed with command line tools</li>
        <li>iOS Simulator or connected device</li>
      </ul>
    </section>

    <div class="next-section">
      <button class="btn btn-primary" onclick="window.docs.navigate('/examples')">
        Next: Examples →
      </button>
    </div>
  `;

  return page;
}
