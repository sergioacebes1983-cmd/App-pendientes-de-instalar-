// Minimal service worker: makes the app installable and keeps the shell available offline.
// API calls (/api/*) always go to the network so every user sees live data.
const CACHE = "portero-shell-v3";

self.addEventListener("push", (e) => {
  let data = { title: "PorteroControl", body: "Hay novedades", url: "/" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {
    /* plain-text payload */
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const w = wins.find((c) => c.url.startsWith(self.location.origin));
      return w ? w.focus().then(() => w.navigate(url)) : self.clients.openWindow(url);
    }),
  );
});
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;
  // Network first, fall back to cache (offline).
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (req.mode === "navigate" || url.pathname.startsWith("/assets/"))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "/" : req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === "navigate" ? "/" : req).then((r) => r || Response.error())),
  );
});
