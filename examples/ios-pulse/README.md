# iOS Pulse

Application Pulse utilisant la syntaxe `.pulse` pour iOS WKWebView.

## Structure

```
ios-pulse/
├── src/
│   ├── main.js              # Point d'entrée
│   ├── App.pulse            # Composant principal
│   ├── pages/
│   │   ├── CounterPage.pulse
│   │   ├── TodoPage.pulse
│   │   └── ProfilePage.pulse
│   └── styles/
│       └── main.css
├── scripts/
│   └── copy-to-ios.js       # Copie le build vers ios-webview
└── package.json
```

## Développement avec Hot-Reload

1. **Lancer le serveur de dev :**
   ```bash
   cd examples/ios-pulse
   npm install
   npm run dev
   ```

2. **Lancer l'app iOS (simulateur ou appareil) :**
   - Ouvrir `examples/ios-webview/PulseApp.xcodeproj` dans Xcode
   - Run en mode Debug
   - L'app charge `http://localhost:3000` (simulateur)

3. **Modifier les fichiers `.pulse`** → Les changements apparaissent instantanément !

## Build pour Production

```bash
# Build et copie vers ios-webview/Resources/www
npm run build:ios
```

Ensuite, build l'IPA release dans Xcode.

## Appareil Physique

Pour tester sur un appareil physique, modifiez l'IP dans `ContentView.swift` :

```swift
private let devServerURL = "http://192.168.x.x:3000"
```

Où `192.168.x.x` est l'IP de votre machine sur le réseau local.
