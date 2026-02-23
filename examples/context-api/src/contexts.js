/**
 * Context Definitions for the Context API Demo
 * Defines ThemeContext, AuthContext, LocaleContext along with
 * themes, translations, and mock user data.
 */

import { createContext } from '../../../runtime/context.js';

// Theme Context
export const ThemeContext = createContext('light', { displayName: 'ThemeContext' });

export const themes = {
  light: { bg: '#ffffff', text: '#1a1a2e', card: '#f8f8ff', accent: '#646cff', border: '#e0e0e0' },
  dark:  { bg: '#1a1a2e', text: '#e0e0e0', card: '#2a2a3e', accent: '#818cf8', border: '#3a3a4e' },
  ocean: { bg: '#0d1b2a', text: '#e0e8f0', card: '#1b2838', accent: '#48cae4', border: '#2a3a4a' }
};

// Auth Context
export const AuthContext = createContext(null, { displayName: 'AuthContext' });

export const mockUsers = [
  { id: 1, name: 'Alice', role: 'admin', avatar: 'A' },
  { id: 2, name: 'Bob', role: 'editor', avatar: 'B' },
  { id: 3, name: 'Charlie', role: 'viewer', avatar: 'C' }
];

// Locale Context
export const LocaleContext = createContext('en', { displayName: 'LocaleContext' });

export const translations = {
  en: { greeting: 'Hello', welcome: 'Welcome to Pulse', language: 'Language' },
  fr: { greeting: 'Bonjour', welcome: 'Bienvenue dans Pulse', language: 'Langue' },
  es: { greeting: 'Hola', welcome: 'Bienvenido a Pulse', language: 'Idioma' },
  ja: { greeting: '\u3053\u3093\u306b\u3061\u306f', welcome: 'Pulse\u3078\u3088\u3046\u3053\u305d', language: '\u8a00\u8a9e' }
};
