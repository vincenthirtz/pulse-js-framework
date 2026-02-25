# Mobile & Native - Native Android/iOS app development with Pulse via WebView bridge.

## CLI Commands

| Command | Description |
|---------|-------------|
| `pulse mobile init` | Create `android/` and `ios/` project directories |
| `pulse mobile build android` | Build APK → `android/app/build/outputs/apk/release/app-release.apk` |
| `pulse mobile build ios` | Build iOS app → `ios/build/Release/PulseApp.app` (macOS only) |
| `pulse mobile run android` | Run on Android device/emulator |
| `pulse mobile run ios` | Run on iOS simulator |

**Prerequisites:** Android: JDK 11+, Android SDK. iOS: macOS, Xcode 14+.

## Native APIs

All imports from `pulse-js-framework/runtime/native`.

### Platform Detection

```javascript
isNativeAvailable()  // true if running in native app
getPlatform()        // 'ios' | 'android' | 'web'
isNative()           // true if not web
```

### App Lifecycle

```javascript
onNativeReady(({ platform }) => { ... })  // Bridge ready
onAppPause(() => { ... })                  // App backgrounded
onAppResume(() => { ... })                 // App foregrounded
onBackButton(() => { return true; })       // Android back (return true to prevent default)
```

### Native Storage

```javascript
const storage = createNativeStorage('prefix_');
const theme = storage.get('theme', 'light');  // Returns reactive Pulse
theme.get();        // Read
theme.set('dark');  // Auto-persists
storage.remove('theme');
storage.clear();
```

### Device Info

```javascript
const device = createDeviceInfo();
device.platform;       // 'ios' | 'android' | 'web'
device.isOnline;       // boolean
device.info.get();     // { platform, userAgent, language, screen, ... }
device.network.get();  // { connected: true, type: 'wifi' }
```

### Native UI

```javascript
import { NativeUI, NativeClipboard, exitApp, minimizeApp } from 'pulse-js-framework/runtime/native';

NativeUI.toast('Saved!');          // Short toast
NativeUI.toast('Processing', true); // Long toast
NativeUI.vibrate();                // Default 100ms
NativeUI.vibrate(200);             // Custom duration

await NativeClipboard.copy('text');
const text = await NativeClipboard.read();

exitApp();      // Android only
minimizeApp();
```

## Hot Reload Development

```bash
pulse dev --host 0.0.0.0  # Start dev server
```

```javascript
// main.js - enable dev mode
if (import.meta.env?.DEV) {
  window.__PULSE_DEV_URL__ = 'http://YOUR_IP:3000';
}
```

## Platform Configuration

### Android

| Config | Path |
|--------|------|
| Permissions | `android/app/src/main/AndroidManifest.xml` |
| App icons | `android/app/src/main/res/mipmap-*/ic_launcher.png` |
| Splash screen | `android/app/src/main/res/drawable/splash.xml` |
| Signing | `android/keystore.properties` (storePassword, keyPassword, keyAlias, storeFile) |

### iOS

| Config | Path |
|--------|------|
| App config | `ios/PulseApp/Info.plist` (name, bundle ID, permissions, URL schemes) |
| App icons | `ios/PulseApp/Assets.xcassets/AppIcon.appiconset/` |
| Entitlements | `ios/PulseApp/PulseApp.entitlements` (push, app groups, domains) |

## Extending Native Code

### Android (Kotlin)

```kotlin
// android/app/src/main/java/.../PulseBridge.kt
class PulseBridge(private val webView: WebView) {
    @JavascriptInterface
    fun customMethod(data: String): String { return "result" }
}
```

```javascript
if (window.PulseMobile) { window.PulseMobile.customMethod('data'); }
```

### iOS (Swift)

```swift
// ios/PulseApp/PulseBridge.swift
class PulseBridge: NSObject {
    @objc func customMethod(_ data: String) -> String { return "result" }
}
```

## Debugging

- **Android:** `adb logcat | grep -i pulse` or Chrome DevTools via `chrome://inspect`
- **iOS:** Safari Web Inspector via Develop menu > Your Device > Your App

## Best Practices

1. Always check `isNativeAvailable()` before native API calls
2. Use `device.network.get()` for offline state handling
3. Use `createNativeStorage()` for persistence (survives app restarts)
4. Use `lazy()` routes and `pulse build --minify` for smaller bundles
