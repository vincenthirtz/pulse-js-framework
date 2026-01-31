#!/usr/bin/env node
/**
 * Copie le build Pulse vers les assets Android
 */
import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, '..', 'dist');
const TARGET = join(__dirname, '..', '..', 'android-webview', 'app', 'src', 'main', 'assets');

console.log('📦 Copying Pulse build to Android assets...');

// Vérifier que le build existe
if (!existsSync(SOURCE)) {
  console.error('❌ dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}

// Nettoyer le dossier assets
if (existsSync(TARGET)) {
  rmSync(TARGET, { recursive: true });
}
mkdirSync(TARGET, { recursive: true });

// Copier les fichiers
cpSync(SOURCE, TARGET, { recursive: true });

console.log('✅ Build copied to android-webview/app/src/main/assets/');
console.log('   Now build the APK in Android Studio');
