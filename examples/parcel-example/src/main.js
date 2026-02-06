/**
 * Pulse + Parcel Example
 * Zero-configuration bundler with HMR
 */

import { mount } from 'pulse-js-framework/runtime';
import { App } from './App.pulse';

// Mount the app
mount('#app', App());
