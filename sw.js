/**
 * 小日常 PWA - Service Worker 离线缓存
 */

const CACHE_NAME = 'everyday-cache-v5';

// 需要预缓存的资源列表 (使用相对路径以适配 GitHub Pages)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/storage.js',
  './js/app.js',
  './js/ui.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// 1. 安装事件 (Install Event) - 预缓存所有关键资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // 使用 allSettled 或 map-catch 防止单个不存在的资源 (例如还未生成的 PNG 图标) 导致整个 Service Worker 无法安装
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache: ${url}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. 激活事件 (Activate Event) - 清理旧版本的缓存资源
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 拦截请求 (Fetch Event) - 采用 Stale-While-Revalidate 策略
self.addEventListener('fetch', (event) => {
  // 只拦截 HTTP/HTTPS GET 请求
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 排除第三方扩展、以及其他非本站域名的请求
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. 如果命中缓存，先返回缓存
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // 2. 将网络获取的新响应存入缓存，供下一次使用
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.log('[Service Worker] Fetch failed, network offline', err);
        });

      return cachedResponse || fetchPromise;
    })
  );
});
