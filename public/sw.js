const CACHE='privefinances-shell-v5';
const IMGS=['hero','lamal','receipts','budget','deadlines','p3a','conquest','debts','experts','tou','profile','empty'].map(k=>'/img/'+k+'.webp');
const SHELL=['/','/app.css','/app-main.mjs','/budget-engine.mjs','/manifest.webmanifest','/brand/logo.webp','/brand/owl-160.webp','/brand/icon-192.png',...IMGS];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&(k.startsWith('privefinances-')||k.startsWith('impotfacile-'))).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Só a casca do app vai para o cache. A API e os dados financeiros nunca ficam offline.
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET'||url.pathname.startsWith('/api/')||!SHELL.includes(url.pathname))return;event.respondWith(fetch(event.request).then(response=>{if(response.ok&&!response.redirected){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request)));});
