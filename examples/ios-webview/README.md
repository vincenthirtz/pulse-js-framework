# Pulse iOS WebView

Application iOS qui encapsule une app Pulse dans une WKWebView native.

## Développement avec Hot-Reload

Utilisez le projet **ios-pulse** pour le développement avec fichiers `.pulse` et hot-reload :

```bash
# Terminal 1 : Lancer le serveur Pulse
cd examples/ios-pulse
npm install
npm run dev

# Terminal 2 : Lancer l'app iOS (simulateur)
# Ouvrir examples/ios-webview/PulseApp.xcodeproj dans Xcode → Run (Debug)
```

**En mode Debug**, l'app charge automatiquement `http://localhost:3000` et bénéficie du hot-reload !

## Build Production

```bash
# Build l'app Pulse et copie dans Resources/www/
cd examples/ios-pulse
npm run build:ios

# Puis build l'IPA release dans Xcode
```

## Structure

```
examples/
├── ios-pulse/               ← Projet Pulse avec .pulse files
│   ├── src/
│   │   ├── App.pulse
│   │   └── pages/*.pulse
│   └── package.json
│
└── ios-webview/             ← Projet Xcode
    └── PulseApp/
        ├── PulseApp.swift
        ├── ContentView.swift
        └── Resources/
            └── www/         ← Build Pulse copié ici
```

## Prérequis

- Xcode 14+ (compatible macOS 12 Monterey)
- iOS 15.0+ SDK
- Node.js 18+

## Configuration

### Mode Debug vs Release

Dans `ContentView.swift` :

```swift
// Mode debug : charge depuis le serveur de dev (hot-reload)
// Mode release : charge depuis les ressources locales
#if DEBUG
private let useDevServer = true
#else
private let useDevServer = false
#endif
```

### Appareil Physique

Pour tester sur un appareil physique, modifiez l'IP dans `ContentView.swift` :

```swift
private let devServerURL = "http://192.168.x.x:3000"
```

## Debug WebView

En mode Debug (iOS 16.4+), le Web Inspector est activé :

1. Connectez l'appareil/simulateur
2. Ouvrez Safari → Develop → [Appareil] → localhost
3. Inspectez votre app Pulse

## Fonctionnalités

- Hot-reload en développement
- Fichiers `.pulse` compilés
- Support safe area iOS
- Mode sombre
- localStorage persistant
- Debug Safari Web Inspector
- SwiftUI moderne

## Licence

MIT - Voir LICENSE à la racine du projet Pulse.
