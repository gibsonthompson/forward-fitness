// apiBase.js — makes /api/* calls work inside the native app.
//
// On the web, the app and the Vercel /api functions share the same origin, so
// relative paths like fetch('/api/coach') just work. Inside Capacitor the app
// loads from capacitor://localhost, so those same relative calls would 404.
// This rewrites them to the live domain when (and only when) running natively.
//
// Call installNativeApiBase() ONCE at startup, before the app renders.

import { Capacitor } from '@capacitor/core';

const API_ORIGIN = 'https://forwardfitness.app';

export function installNativeApiBase() {
  if (!Capacitor.isNativePlatform()) return; // web/PWA: leave fetch untouched
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (typeof input === 'string') {
      if (input.startsWith('/api/')) {
        input = API_ORIGIN + input;
      } else if (input.includes('://localhost/api/')) {
        input = API_ORIGIN + input.slice(input.indexOf('/api/'));
      }
    }
    return nativeFetch(input, init);
  };
}
