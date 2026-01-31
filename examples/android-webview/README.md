# Pulse Android WebView Example

Application Android qui encapsule une app Pulse dans une WebView native.

## Fonctionnalités de la démo

L'application démontre les capacités de Pulse sur mobile :

- **Compteur réactif** - Démonstration de `pulse()`, `effect()` et valeurs dérivées
- **Liste de tâches** - CRUD complet avec `list()`, persistance localStorage
- **Profil utilisateur** - Édition en place, thème sombre

## Prérequis

- Android Studio (Arctic Fox ou plus récent)
- JDK 17
- Android SDK 34

## Installation

### Option 1 : Ouvrir directement dans Android Studio

1. Ouvrir Android Studio
2. **File** → **Open**
3. Sélectionner le dossier `examples/android-webview`
4. Attendre la synchronisation Gradle
5. Cliquer sur **Run** (▶️)

### Option 2 : Build en ligne de commande

```bash
cd examples/android-webview

# Build debug APK
./gradlew assembleDebug

# L'APK sera dans app/build/outputs/apk/debug/
```

## Structure du projet

```
android-webview/
├── app/
│   ├── src/main/
│   │   ├── assets/
│   │   │   └── index.html      # App Pulse complète
│   │   ├── java/.../
│   │   │   └── MainActivity.java
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   └── values/
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── build.gradle
├── settings.gradle
└── README.md
```

## Comment ça marche

1. `MainActivity` crée une WebView plein écran
2. La WebView charge `file:///android_asset/index.html`
3. L'app Pulse s'exécute entièrement dans la WebView
4. JavaScript est activé pour la réactivité Pulse
5. DOM Storage est activé pour localStorage

## Personnalisation

### Modifier l'app Pulse

Éditez `app/src/main/assets/index.html` pour modifier l'application web.

### Charger depuis un serveur

Pour le développement, vous pouvez charger depuis un serveur local :

```java
// Dans MainActivity.java
webView.loadUrl("http://10.0.2.2:3000"); // Émulateur
// ou
webView.loadUrl("http://192.168.x.x:3000"); // Appareil physique
```

### Ajouter une interface JavaScript

Pour communiquer entre Java et Pulse :

```java
// MainActivity.java
webView.addJavascriptInterface(new Object() {
    @JavascriptInterface
    public void showToast(String message) {
        Toast.makeText(MainActivity.this, message, Toast.LENGTH_SHORT).show();
    }
}, "Android");
```

```javascript
// Dans index.html
Android.showToast("Hello from Pulse!");
```

## Fonctionnalités Android supportées

- ✅ Navigation arrière dans l'app
- ✅ Mode sombre (thème)
- ✅ Persistance localStorage
- ✅ Touch events optimisés
- ✅ Safe area (status bar)

## Debug

Pour déboguer la WebView avec Chrome DevTools :

1. Activer le mode développeur sur l'appareil
2. Ajouter dans `MainActivity`:
   ```java
   WebView.setWebContentsDebuggingEnabled(true);
   ```
3. Ouvrir `chrome://inspect` dans Chrome desktop
4. Cliquer sur **inspect** sous votre appareil

## Alternatives

- **PWA** : Ajouter manifest.json et service worker pour une installation web
- **Capacitor** : Package avec accès aux APIs natives (caméra, GPS, etc.)
- **React Native** : Pour une expérience 100% native (nécessite réécriture)

## Licence

MIT - Voir le fichier LICENSE à la racine du projet Pulse.
