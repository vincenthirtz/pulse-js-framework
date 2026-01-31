# Pulse Android WebView

Application Android qui encapsule une app Pulse dans une WebView native.

## 🔥 Développement avec Hot-Reload

Utilisez le projet **android-pulse** pour le développement avec fichiers `.pulse` et hot-reload :

```bash
# Terminal 1 : Lancer le serveur Pulse
cd examples/android-pulse
npm install
npm run dev

# Terminal 2 : Lancer l'app Android (émulateur)
# Ouvrir examples/android-webview dans Android Studio → Run (Debug)
```

**En mode Debug**, l'app charge automatiquement `http://10.0.2.2:3000` et bénéficie du hot-reload !

## 📦 Build Production

```bash
# Build l'app Pulse et copie dans assets/
cd examples/android-pulse
npm run build:android

# Puis build l'APK release dans Android Studio
```

## Structure

```
examples/
├── android-pulse/           ← Projet Pulse avec .pulse files
│   ├── src/
│   │   ├── App.pulse
│   │   └── pages/*.pulse
│   └── package.json
│
└── android-webview/         ← Projet Android Studio
    └── app/src/main/
        ├── assets/          ← Build Pulse copié ici
        └── java/.../MainActivity.java
```

## Prérequis

- Android Studio (Arctic Fox ou plus récent)
- JDK 17+
- Android SDK 34
- Node.js 18+

## Configuration

### Mode Debug vs Release

Dans `MainActivity.java` :

```java
// Mode debug : charge depuis le serveur de dev (hot-reload)
// Mode release : charge depuis assets/
private static final boolean USE_DEV_SERVER = BuildConfig.DEBUG;
```

### Appareil Physique

Pour tester sur un appareil physique, modifiez l'IP dans `MainActivity.java` :

```java
private static final String DEV_SERVER_URL = "http://192.168.x.x:3000";
```

## Debug WebView

En mode Debug, le WebView debugging est activé automatiquement :

1. Connectez l'appareil/émulateur
2. Ouvrez `chrome://inspect` dans Chrome
3. Cliquez **inspect** sur votre app

## Fonctionnalités

- ✅ Hot-reload en développement
- ✅ Fichiers `.pulse` compilés
- ✅ Navigation arrière Android
- ✅ Mode sombre
- ✅ localStorage persistant
- ✅ Debug Chrome DevTools

## Licence

MIT - Voir LICENSE à la racine du projet Pulse.
