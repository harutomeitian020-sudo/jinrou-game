// Service Worker — 人狼ゲームGM
// キャッシュバージョンを変えると古いキャッシュが削除されます
const CACHE_NAME = 'jinro-gm-v1';

// オフライン時にキャッシュするファイル
const PRECACHE = [
  './werewolf.html',
  './manifest.json',
  // PeerJSはCDNなのでオフライン時は使えないが、htmlはキャッシュしておく
];

// ===== インストール：事前キャッシュ =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE);
    })
  );
  // 古いSWを即座に置き換え
  self.skipWaiting();
});

// ===== アクティベート：古いキャッシュ削除 =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ===== フェッチ：Cache First（HTMLのみ）/ Network First（その他） =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // CDN（unpkg等）はネットワーク優先、失敗したらキャッシュ
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          // CDNレスポンスをキャッシュに保存
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 同一オリジンのリソース：Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      });
    })
  );
});
