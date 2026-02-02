# Pulse Mobile Apps

Build native Android and iOS apps from your Pulse project with zero external dependencies.

## Overview

Pulse Mobile wraps your web app in a native WebView with a JavaScript bridge that provides access to native APIs. This approach offers:

- **Single Codebase** - One codebase for web, Android, and iOS
- **Native Performance** - Native navigation, storage, and UI elements
- **No Dependencies** - Pure native code, no Cordova/Capacitor needed
- **Full Control** - Direct access to native APIs when needed

## Getting Started

### Prerequisites

**Android:**
- Java JDK 11+
- Android SDK
- Android Studio (optional, for emulator)

**iOS:**
- macOS
- Xcode 14+
- CocoaPods (optional)

### Initialize Mobile Platforms

```bash
# Initialize both platforms
pulse mobile init

# This creates:
# - android/         Android project
# - ios/             iOS project (macOS only)
```

### Build Your Web App

```bash
# Build production web assets
pulse build
```

### Build Native App

```bash
# Android
pulse mobile build android
# Output: android/app/build/outputs/apk/release/app-release.apk

# iOS (requires macOS)
pulse mobile build ios
# Output: ios/build/Release/PulseApp.app
```

### Run on Device/Emulator

```bash
# Android
pulse mobile run android

# iOS
pulse mobile run ios
```

---

## Native APIs

### Platform Detection

```javascript
import { isNativeAvailable, getPlatform, isNative } from 'pulse-js-framework/runtime/native';

isNativeAvailable();  // true if running in native app
getPlatform();        // 'ios' | 'android' | 'web'
isNative();           // true if not web
```

### App Lifecycle

```javascript
import { onNativeReady, onAppPause, onAppResume, onBackButton } from 'pulse-js-framework/runtime/native';

// Called when native bridge is ready
onNativeReady(({ platform }) => {
  console.log(`Running on ${platform}`);
  initializeApp();
});

// Called when app goes to background
onAppPause(() => {
  saveState();
});

// Called when app returns to foreground
onAppResume(() => {
  refreshData();
});

// Android back button (return true to prevent default)
onBackButton(() => {
  if (canGoBack()) {
    goBack();
    return true;
  }
  return false; // Let system handle
});
```

### Native Storage

Persistent storage that works on both web and native:

```javascript
import { createNativeStorage } from 'pulse-js-framework/runtime/native';

// Create storage with optional prefix
const storage = createNativeStorage('app_');

// Get returns a Pulse (reactive)
const theme = storage.get('theme', 'light');
theme.get();        // 'light'
theme.set('dark');  // Auto-persists

// Other methods
storage.remove('theme');
storage.clear();
```

### Device Information

```javascript
import { createDeviceInfo } from 'pulse-js-framework/runtime/native';

const device = createDeviceInfo();

// Static properties
device.platform;      // 'ios' | 'android' | 'web'
device.isOnline;      // boolean

// Reactive properties
device.info.get();    // { platform, userAgent, language, screen, ... }
device.network.get(); // { connected: true, type: 'wifi' }

// Example: Network-aware data loading
effect(() => {
  const network = device.network.get();
  if (network.connected && network.type === 'wifi') {
    prefetchLargeAssets();
  }
});
```

### Native UI

```javascript
import { NativeUI } from 'pulse-js-framework/runtime/native';

// Toast notification
NativeUI.toast('Saved!');
NativeUI.toast('Processing...', true); // Long duration

// Haptic feedback
NativeUI.vibrate();      // Default 100ms
NativeUI.vibrate(200);   // Custom duration
```

### Clipboard

```javascript
import { NativeClipboard } from 'pulse-js-framework/runtime/native';

// Copy to clipboard
await NativeClipboard.copy('Text to copy');

// Read from clipboard
const text = await NativeClipboard.read();
```

### App Control

```javascript
import { exitApp, minimizeApp } from 'pulse-js-framework/runtime/native';

// Exit app (Android only)
exitApp();

// Minimize app
minimizeApp();
```

---

## Hot Reload Development

During development, use hot reload to see changes instantly:

### Setup

1. Start the dev server:
```bash
pulse dev --host 0.0.0.0
```

2. In your app's main file, enable dev mode:
```javascript
// main.js
if (import.meta.env?.DEV) {
  window.__PULSE_DEV_URL__ = 'http://YOUR_IP:3000';
}
```

3. Run the app:
```bash
pulse mobile run android
```

Changes to your code will hot-reload on the device.

### Production

For production builds, assets are bundled into the app:

```bash
pulse build
pulse mobile build android --release
```

---

## Android Configuration

### Permissions

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <!-- Internet access -->
    <uses-permission android:name="android.permission.INTERNET" />

    <!-- Storage (if using file APIs) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <!-- Vibration -->
    <uses-permission android:name="android.permission.VIBRATE" />
</manifest>
```

### App Icon

Replace the icons in:
- `android/app/src/main/res/mipmap-*/ic_launcher.png`

### Splash Screen

Edit `android/app/src/main/res/drawable/splash.xml`

### Signing for Release

Create `android/keystore.properties`:

```properties
storePassword=your_password
keyPassword=your_password
keyAlias=your_alias
storeFile=../your-keystore.jks
```

---

## iOS Configuration

### Info.plist

Edit `ios/PulseApp/Info.plist` for:
- App name
- Bundle identifier
- Permissions
- URL schemes

### App Icon

Add icons to `ios/PulseApp/Assets.xcassets/AppIcon.appiconset/`

### Entitlements

Edit `ios/PulseApp/PulseApp.entitlements` for:
- Push notifications
- App groups
- Associated domains

---

## Extending Native Code

### Android (Kotlin)

Add custom native functionality in `android/app/src/main/java/.../PulseBridge.kt`:

```kotlin
class PulseBridge(private val webView: WebView) {
    @JavascriptInterface
    fun customMethod(data: String): String {
        // Native code here
        return "result"
    }
}
```

Call from JavaScript:
```javascript
if (window.PulseMobile) {
  const result = window.PulseMobile.customMethod('data');
}
```

### iOS (Swift)

Add methods in `ios/PulseApp/PulseBridge.swift`:

```swift
class PulseBridge: NSObject {
    @objc func customMethod(_ data: String) -> String {
        // Native code here
        return "result"
    }
}
```

---

## Debugging

### Android

```bash
# View logs
adb logcat | grep -i pulse

# Chrome DevTools
# 1. Enable USB debugging on device
# 2. Open chrome://inspect
# 3. Click "inspect" on your app's WebView
```

### iOS

```bash
# Safari Web Inspector
# 1. Enable Web Inspector in iOS Settings > Safari > Advanced
# 2. Open Safari on Mac
# 3. Develop menu > Your Device > Your App
```

---

## Best Practices

### 1. Check Platform Before Native Calls

```javascript
import { isNativeAvailable } from 'pulse-js-framework/runtime/native';

function vibrate() {
  if (isNativeAvailable()) {
    NativeUI.vibrate();
  }
}
```

### 2. Handle Offline State

```javascript
const device = createDeviceInfo();

effect(() => {
  if (!device.network.get().connected) {
    showOfflineBanner();
  }
});
```

### 3. Use Native Storage for Persistence

```javascript
// Good - persists across app restarts
const storage = createNativeStorage();
const settings = storage.get('settings', {});

// Avoid - lost on app restart
const settings = pulse({});
```

### 4. Optimize for Mobile

```javascript
// Reduce bundle size
pulse build --minify

// Use lazy loading
const routes = {
  '/settings': lazy(() => import('./Settings.js'))
};

// Minimize re-renders
const visible = computed(() => items.get().filter(i => i.visible));
```
