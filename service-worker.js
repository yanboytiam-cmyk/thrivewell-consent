/* ThriveWell - formulaire de consentement, coquille hors ligne.
 *
 * Deux regles, pas une de plus :
 *   1. la page elle-meme passe par le reseau d'abord, sinon un correctif
 *      publie reste invisible sur la tablette du cabinet, epinglee sur une
 *      copie en cache (voir le cas GitHub Pages du 2026-08) ;
 *   2. le reste de la coquille passe par le cache d'abord, pour que le
 *      formulaire s'ouvre meme quand le wifi du cabinet tombe.
 *
 * Les envois ne sont jamais touches ici : ce sont des POST, le navigateur ne
 * les met pas en cache, et la page garde sa propre copie du PDF.
 */
var VERSION = 'thrivewell-consent-v1';
var COQUILLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/thrivewell-logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/jspdf.umd.min.js'
];

self.addEventListener('install', function(ev){
  ev.waitUntil(
    caches.open(VERSION).then(function(c){
      // Une seule URL fautive ne doit pas faire echouer toute l'installation
      // et laisser l'application sans cache du tout.
      return Promise.all(COQUILLE.map(function(u){ return c.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(ev){
  ev.waitUntil(
    caches.keys().then(function(cles){
      return Promise.all(cles.map(function(k){
        return k === VERSION ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(ev){
  var req = ev.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  var estPage = req.mode === 'navigate'
             || (req.headers.get('accept') || '').indexOf('text/html') !== -1;

  if (estPage){
    ev.respondWith(
      fetch(req).then(function(rep){
        var copie = rep.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copie); });
        return rep;
      }).catch(function(){
        return caches.match(req).then(function(r){ return r || caches.match('./index.html'); });
      })
    );
    return;
  }

  ev.respondWith(
    caches.match(req).then(function(r){
      return r || fetch(req).then(function(rep){
        var copie = rep.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copie); });
        return rep;
      });
    })
  );
});
