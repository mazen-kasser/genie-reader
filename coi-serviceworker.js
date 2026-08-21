// Enables cross-origin isolation (crossOriginIsolated === true) on static
// hosts like GitHub Pages that have no way to set custom response headers.
// The vendored ONNX Runtime WASM build needs SharedArrayBuffer to
// instantiate at all — not just for actual multithreading — and browsers
// only expose SharedArrayBuffer when the page is served with
// Cross-Origin-Opener-Policy: same-origin and
// Cross-Origin-Embedder-Policy: require-corp. A Service Worker can inject
// those headers on every same-origin response even though the static host
// itself can't, which is the standard workaround for this exact situation.
// Adapted from the public-domain coi-serviceworker project.
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

  self.addEventListener('fetch', function (event) {
    const request = event.request;
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 0) return response;
          const newHeaders = new Headers(response.headers);
          newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
          newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newHeaders,
          });
        })
        .catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    if (window.crossOriginIsolated !== false) return; // already isolated, or unsupported — nothing to do

    const n = navigator;
    if (!n.serviceWorker) return;

    const register = () =>
      n.serviceWorker.register(window.document.currentScript.src).then((registration) => {
        registration.addEventListener('updatefound', () => window.location.reload());
        if (registration.active && !n.serviceWorker.controller) window.location.reload();
      });

    if (n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({ type: 'deregister' });
    }
    register();
  })();
}
