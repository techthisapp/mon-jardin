/* Agent de service.

   Sans lui, chaque ouverture de l'application redemandait le script, la feuille
   de style et les neuf fichiers de caractères, que GitHub Pages ne déclare
   valides que dix minutes. Il met ces fichiers en cache une fois pour toutes et
   rend l'application utilisable sans réseau.

   Deux stratégies, et une seule règle pour choisir. Le document est demandé au
   réseau d'abord, pour qu'une nouvelle mise en ligne soit prise sans attendre,
   avec repli sur la copie en cache. Les actifs versionnés par leur empreinte
   sont servis depuis le cache d'abord, puisque leur adresse change à chaque
   modification. Les appels à la base et au service météorologique ne sont pas
   interceptés : leur fraîcheur est gérée par l'application elle-même.

   La version est réécrite par outils/verification.mjs à partir des empreintes
   des actifs. Un changement de version vide l'ancien cache à l'activation. */

const VERSION = "77866725f9";
const CACHE = "monjardin-" + VERSION;

const ACTIFS = [
  "./", "./index.html", "./styles.css", "./app.js", "./config.js",
  "./vendor/supabase.js", "./manifest.webmanifest", "./planches.json",
  "./icone.svg", "./favicon.ico", "./icone-192.png", "./icone-512.png",
  "./icone-maskable-512.png", "./apple-touch-icon.png",
  "./polices/plex-sans-400.woff2", "./polices/plex-sans-500.woff2",
  "./polices/plex-sans-600.woff2", "./polices/plex-sans-700.woff2",
  "./polices/plex-cond-500.woff2", "./polices/plex-cond-600.woff2",
  "./polices/plex-cond-700.woff2", "./polices/plex-mono-400.woff2",
  "./polices/plex-mono-500.woff2",
  "./motifs/1.svg",
  "./motifs/2.svg",
  "./motifs/3.svg",
  "./motifs/4.svg",
  "./motifs/5.svg",
  "./motifs/6.svg",
  "./motifs/7.svg",
  "./motifs/8.svg",
  "./motifs/9.svg",
  "./motifs/10.svg",
  "./motifs/11.svg",
  "./motifs/12.svg",
];

/* L'adresse porte une empreinte de version en paramètre. La clé de cache
   l'ignore, sans quoi le même fichier serait rangé deux fois. */
const cle = url => { const u = new URL(url); u.search = ""; return u.href; };

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE)
    // Un actif manquant ne doit pas faire échouer l'installation entière.
    .then(c => Promise.all(ACTIFS.map(a => c.add(a).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(noms => Promise.all(noms.filter(n => n !== CACHE && n.startsWith("monjardin-"))
      .map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(fetch(req)
      .then(rep => {
        if (rep && rep.ok) caches.open(CACHE).then(c => c.put(cle(req.url), rep.clone()));
        return rep;
      })
      .catch(() => caches.match(cle(req.url))
        .then(r => r || caches.match("./index.html"))));
    return;
  }

  e.respondWith(caches.match(cle(req.url)).then(cache => cache || fetch(req).then(rep => {
    if (rep && rep.ok && rep.type === "basic") {
      const copie = rep.clone();
      caches.open(CACHE).then(c => c.put(cle(req.url), copie));
    }
    return rep;
  })));
});
