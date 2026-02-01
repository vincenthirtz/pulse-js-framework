#!/usr/bin/env node
/**
 * Copie le build Pulse vers les ressources iOS
 */
import { cpSync, rmSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, '..', 'dist');
const TARGET = join(__dirname, '..', '..', 'ios-webview', 'PulseApp', 'Resources', 'www');

console.log('📦 Copying Pulse build to iOS resources...');

// Vérifier que le build existe
if (!existsSync(SOURCE)) {
  console.error('❌ dist/ folder not found. Run "npm run build" first.');
  process.exit(1);
}

// Nettoyer le dossier www
if (existsSync(TARGET)) {
  rmSync(TARGET, { recursive: true });
}
mkdirSync(TARGET, { recursive: true });

// Copier les fichiers
cpSync(SOURCE, TARGET, { recursive: true });

console.log('✅ Build copied to ios-webview/PulseApp/Resources/www/');
console.log('   Now build the app in Xcode');
