/**
 * Pulse Context API Demo - Entry Point
 * Sets up reactive context providers and mounts the App component.
 */

import { pulse, effect } from 'pulse-js-framework/runtime';
import { provideMany } from 'pulse-js-framework/runtime/context';
import { ThemeContext, AuthContext, LocaleContext, themes } from './contexts.js';
import App from './App.pulse';

// Create reactive context values
const themePulse = pulse('light');
const userPulse = pulse(null);
const localePulse = pulse('en');

// Apply theme colors to body
effect(() => {
  const colors = themes[themePulse.get()] || themes.light;
  document.body.style.background = colors.bg;
  document.body.style.color = colors.text;
});

// Provide all three contexts and mount the app
provideMany([
  [ThemeContext, themePulse],
  [AuthContext, userPulse],
  [LocaleContext, localePulse]
], () => {
  App.mount('#app');
});

console.log('Pulse Context API Demo loaded');
