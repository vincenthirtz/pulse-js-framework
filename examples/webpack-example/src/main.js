import { mount } from 'pulse-js-framework/runtime';
import App from './App.pulse';

// Mount the app
mount('#app', App());

// Log Webpack HMR status
if (module.hot) {
  console.log('✅ Webpack HMR enabled');
}
