const CACHE = 'yoga-v6';
const SHELL = [
  './index.html',
  './manifest.json',
];
const CDN = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      // Cache app shell (must succeed)
      await c.addAll(SHELL);
      // Cache CDN scripts (best effort — don't fail install if CDN is slow)
      await Promise.allSettled(CDN.map(url =>
        fetch(url, {mode:'cors'}).then(r => {
          if(r.ok) c.put(url, r);
        }).catch(()=>{})
      ));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Always pass Firebase/Google auth to network — never cache auth calls
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('identitytoolkit') ||
    url.includes('securetoken')
  ) return;

  // Cache-first for CDN and fonts (already cached at install)
  if (
    url.includes('unpkg.com') ||
    url.includes('gstatic.com') ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com')
  ) {
    e.respondWith(
      caches.match(e.request).then(hit => {
        if (hit) return hit;
        return fetch(e.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => hit);
      })
    );
    return;
  }

  // Cache-first + background update for app shell
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.ok && e.request.method === 'GET') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached || new Response('Offline', {status: 503}));
      return cached || network;
    })
  );
});
