// pwaUpdate.js: keeps an installed PWA on the latest deploy.
//
// iOS keeps a home-screen app alive in memory and resumes it without reloading,
// so a user can run an old build for days. This checks /train/version.json
// whenever the app comes back to the foreground (and every few minutes while
// open). If the server has a newer build:
//   - coming back to the app: reload right away (an in-progress workout is
//     saved in localStorage, so nothing is lost)
//   - while actively using it: show a small "Tap to Update" bar instead of
//     yanking the screen mid-set
// Does nothing inside the native Capacitor app or in local dev.

import { Capacitor } from '@capacitor/core';

const BASE = import.meta.env.BASE_URL || '/';
const CURRENT = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
const CHECK_EVERY_MS = 5 * 60 * 1000;
const RESUME_GRACE_MS = 30 * 1000;

let registration = null;
let reloading = false;
let bannerShown = false;
let hiddenAt = 0;

async function latestBuild() {
  try {
    const r = await fetch(BASE + 'version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.id ? String(j.id) : null;
  } catch (e) {
    return null;
  }
}

function reloadNow() {
  if (reloading) return;
  reloading = true;
  const waiting = registration && registration.waiting;
  if (waiting) {
    waiting.postMessage('SKIP_WAITING');
    setTimeout(() => window.location.reload(), 1500); // fallback if controllerchange never fires
  } else {
    window.location.reload();
  }
}

function showBanner() {
  if (bannerShown) return;
  bannerShown = true;
  const bar = document.createElement('button');
  bar.type = 'button';
  bar.setAttribute('aria-label', 'A new version is ready. Tap to update.');
  bar.style.cssText = [
    'position:fixed', 'left:50%', 'transform:translateX(-50%)', 'top:max(12px,env(safe-area-inset-top))',
    'z-index:1000', 'display:flex', 'align-items:center', 'gap:10px', 'border:none', 'border-radius:999px',
    'padding:11px 18px', 'background:#1a2332', 'color:#fff', 'font:600 14px Inter,-apple-system,sans-serif',
    'box-shadow:0 8px 24px rgba(16,24,40,.25)', 'cursor:pointer', 'white-space:nowrap',
  ].join(';');
  bar.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#4ade80;display:inline-block"></span>New Version Ready, Tap to Update';
  bar.addEventListener('click', reloadNow);
  document.body.appendChild(bar);
}

async function check(fromResume) {
  if (reloading) return;
  const latest = await latestBuild();
  if (!latest || latest === CURRENT) return;
  if (registration) { try { await registration.update(); } catch (e) {} }
  if (fromResume) reloadNow();
  else showBanner();
}

export function installPwaUpdater() {
  if (Capacitor.isNativePlatform()) return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  navigator.serviceWorker
    .register(BASE + 'sw.js', { scope: BASE, updateViaCache: 'none' })
    .then((reg) => { registration = reg; })
    .catch(() => {});

  // A new worker took over (each deploy ships a new one). Reload only if we asked to,
  // otherwise just offer the update so we never interrupt someone mid-set.
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; } // first install, not an update
    if (reloading) window.location.reload();
    else showBanner();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    const wasAway = hiddenAt && Date.now() - hiddenAt > RESUME_GRACE_MS;
    check(wasAway);
  });
  window.addEventListener('pageshow', (e) => { if (e.persisted) check(true); });
  setInterval(() => { if (document.visibilityState === 'visible') check(false); }, CHECK_EVERY_MS);
  setTimeout(() => check(false), 4000);
}
