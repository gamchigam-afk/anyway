const CACHE_NAME = "anyway-studio-v1";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./logo.png",
    "./icon-192.png",
    "./icon-512.png"
];


// 설치 및 기본 파일 저장
self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {

            await Promise.all(
                APP_FILES.map(async file => {

                    try {
                        await cache.add(file);
                    } catch (error) {
                        console.warn(
                            "캐시 제외:",
                            file
                        );
                    }

                })
            );

        })
    );

    self.skipWaiting();

});


// 이전 버전 캐시 정리
self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys().then(keys => {

            return Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );

        })
    );

    self.clients.claim();

});


// 네트워크 우선 + 오프라인 캐시
self.addEventListener("fetch", event => {

    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) return;


    // HTML 페이지
    if (request.mode === "navigate") {

        event.respondWith(

            fetch(request)
                .then(response => {

                    if (response.ok) {

                        const copy = response.clone();

                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, copy);
                        });

                    }

                    return response;

                })
                .catch(async () => {

                    return (
                        await caches.match(request)
                    ) || (
                        await caches.match("./index.html")
                    );

                })

        );

        return;

    }


    // 이미지 및 기타 파일
    event.respondWith(

        caches.match(request).then(async cached => {

            if (cached) return cached;

            try {

                const response = await fetch(request);

                if (response.ok) {

                    const copy = response.clone();

                    const cache = await caches.open(CACHE_NAME);

                    await cache.put(request, copy);

                }

                return response;

            } catch (error) {

                return new Response(
                    "Offline",
                    {
                        status: 503,
                        statusText: "Offline"
                    }
                );

            }

        })

    );

});