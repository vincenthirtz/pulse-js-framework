# Android Pulse

Application Pulse utilisant la syntaxe `.pulse` pour Android WebView.

## Structure

```
android-pulse/
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
│   └── copy-to-android.js   # Copie le build vers android-webview
└── package.json
```

## Développement avec Hot-Reload

1. **Lancer le serveur de dev :**
   ```bash
   cd examples/android-pulse
   npm install
   npm run dev
   ```

2. **Lancer l'app Android (émulateur ou appareil) :**
   - Ouvrir `examples/android-webview` dans Android Studio
   - Run en mode Debug
   - L'app charge `http://10.0.2.2:3000` (localhost depuis l'émulateur)

3. **Modifier les fichiers `.pulse`** → Les changements apparaissent instantanément !

## Build pour Production

```bash
# Build et copie vers android-webview/assets
npm run build:android
```

Ensuite, build l'APK release dans Android Studio.

## Appareil Physique

Pour tester sur un appareil physique, modifiez l'IP dans `MainActivity.java` :

```java
private static final String DEV_SERVER_URL = "http://192.168.x.x:3000";
```

Où `192.168.x.x` est l'IP de votre machine sur le réseau local.
