import re

with open('app.js', 'r') as f:
    code = f.read()

# 1. Insert Zendb and window functions after workoutHistory
zendb_code = """let workoutHistory = [];

  // --- NATIVE INDEXEDDB WRAPPER ---
  const zendb = {
     db: null,
     init: function() {
         return new Promise((resolve, reject) => {
             let req = indexedDB.open("ZenWarriorDB", 1);
             req.onupgradeneeded = (e) => {
                 let tdb = e.target.result;
                 if(!tdb.objectStoreNames.contains("history")) {
                     tdb.createObjectStore("history", { autoIncrement: true });
                 }
             };
             req.onsuccess = (e) => {
                 this.db = e.target.result;
                 resolve(this.db);
             };
             req.onerror = (e) => reject(e);
         });
     },
     addHistory: function(routineObj, specificDate) {
         return new Promise((resolve, reject) => {
             if(!this.db) return resolve();
             let tx = this.db.transaction("history", "readwrite");
             let store = tx.objectStore("history");
             const dateStr = specificDate || new Date().toISOString();
             store.add({ date: dateStr, routine: routineObj });
             tx.oncomplete = () => resolve();
             tx.onerror = (e) => reject(e);
         });
     },
     getAllHistory: function() {
         return new Promise((resolve, reject) => {
             if(!this.db) return resolve([]);
             let tx = this.db.transaction("history", "readonly");
             let store = tx.objectStore("history");
             let req = store.getAll();
             req.onsuccess = () => resolve(req.result);
             req.onerror = (e) => reject(e);
         });
     },
     clearHistory: function() {
         return new Promise((resolve, reject) => {
             if(!this.db) return resolve();
             let tx = this.db.transaction("history", "readwrite");
             let store = tx.objectStore("history");
             let req = store.clear();
             req.onsuccess = () => resolve();
             req.onerror = (e) => reject(e);
         });
     }
  };

  window.exportSave = async function() {
    let dbHistory = [];
    try { dbHistory = await zendb.getAllHistory(); } catch(e) {}
    const saveData = { player: player, history: dbHistory, exportDate: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(saveData)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zen_ryu_sensei_save_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Respaldo exportado exitosamente.", "Sistema PWA");
  }

  window.importSave = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.player && typeof data.player === 'object') {
            localStorage.setItem("zenWarriorPwaSave", JSON.stringify(data.player));
            if (data.history && data.history.length > 0) {
               await zendb.init().catch(e=>{});
               await zendb.clearHistory();
               for (let r of data.history) { await zendb.addHistory(r.routine, r.date); }
            }
            alert("Perfil restituido de forma segura. La academia se reiniciará para cargar tus habilidades.");
            location.reload();
        } else { alert("Archivo no válido para Zen Ryu Sensei."); }
      } catch(err) { alert("Error leyendo el archivo."); }
    };
    reader.readAsText(file);
    event.target.value = "";
  }
"""
code = code.replace("let workoutHistory = [];", zendb_code)

# 2. Update saveHistory
old_saveHistory = """  function saveHistory(routine) {
    workoutHistory.push({ date: new Date().toISOString(), routine: routine });
    localStorage.setItem("zenWarriorHistory", JSON.stringify(workoutHistory));
  }"""
new_saveHistory = """  function saveHistory(routine) {
    workoutHistory.push({ date: new Date().toISOString(), routine: routine });
    if(zendb.db) zendb.addHistory(routine).catch(e=>{});
  }"""
code = code.replace(old_saveHistory, new_saveHistory)

# 3. Update loadPlayer
old_loadPlayer = """  function loadPlayer() {
    let saved = localStorage.getItem("zenWarriorPwaSave");
    let hx = localStorage.getItem("zenWarriorHistory");
    if (hx) {
      try { workoutHistory = JSON.parse(hx); } catch(e) {}
    }"""
new_loadPlayer = """  async function loadPlayer() {
    await zendb.init().catch(e => console.log("IDB skipped"));
    
    let oldHx = localStorage.getItem("zenWarriorHistory");
    if (oldHx) {
      try { 
        let parsedHx = JSON.parse(oldHx); 
        for (let h of parsedHx) { await zendb.addHistory(h.routine, h.date); }
        localStorage.removeItem("zenWarriorHistory");
      } catch(e) {}
    }
    try { workoutHistory = await zendb.getAllHistory(); } catch(e) {}

    let saved = localStorage.getItem("zenWarriorPwaSave");"""
code = code.replace(old_loadPlayer, new_loadPlayer)

with open('app.js', 'w') as f:
    f.write(code)

print("Patch app.js successful.")

with open('sw.js', 'r') as f:
    sw_code = f.read()

# 4. SW change to Stale-While-Revalidate/dynamic
new_sw = """const CACHE_NAME = 'zen-warrior-pwa-v2';
const STATIC_URLS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './database.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './audio/beep.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        let responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return networkResponse;
      }).catch(() => {
        // Fallback offline si falta red
      });
    })
  );
});
"""

with open('sw.js', 'w') as f:
    f.write(new_sw)

print("Patch sw.js successful.")

