const CACHE_NAME = 'csquared-vacation-v2';
const urlsToCache = ['/'];

// 설치 시 캐시
self.addEventListener('install', e => {
  self.skipWaiting(); // 새 버전 즉시 활성화
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// 활성화 시 이전 캐시 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim()) // 즉시 모든 탭에 적용
  );
});

// 네트워크 우선, 실패 시 캐시 사용
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 새 응답을 캐시에 저장
        if(res && res.status === 200) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request)) // 오프라인 시 캐시 사용
  );
});
