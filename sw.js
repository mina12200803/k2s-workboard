// K2S ワークボード — オフライン対応（画面ファイルを端末に保存）
// アプリを更新したら VERSION の数字を上げてください。
const VERSION = "k2s-v3";
const SHELL = ["./", "index.html", "firebase-config.js", "manifest.webmanifest",
  "favicon-64.png", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // データ通信（Firestore / ログイン）はキャッシュしない
  if (/firestore\.googleapis\.com|identitytoolkit|securetoken|googleapis\.com\/(v1|identitytoolkit)/.test(url.href)) return;
  const sameOrigin = url.origin === location.origin;
  const isLib = /gstatic\.com\/firebasejs|fonts\.(googleapis|gstatic)\.com/.test(url.href);
  if (!sameOrigin && !isLib) return;
  if (sameOrigin && (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("firebase-config.js"))) {
    // 画面本体はネット優先（最新版を使う）、圏外のときは保存版
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  // ライブラリ・アイコン・フォントは保存版優先
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
