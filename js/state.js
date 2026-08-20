// js/state.js
// ─────────────────────────────────────────────────────────────────────────
// Módulo de ESTADO — Zen Ryu Sensei
//
// Contiene: el objeto `player`, la persistencia (localStorage + IndexedDB)
// y las migraciones de guardado. NO contiene lógica de UI/DOM: cualquier
// función aquí debe poder ejecutarse igual en un entorno sin `document`.
//
// Se expone como `window.ZenState` (sin bundler todavía — Fase 0 del plan
// de refactor). Cuando migremos a ES modules reales, este archivo se
// convierte directamente en `export`s sin tocar la lógica interna.
// ─────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';

  // ── Modelo por defecto del jugador ────────────────────────────────────
  function createDefaultPlayer() {
    return {
      name: "",
      rankIndex: 0,
      stats: {
        str: { lvl: 1, xp: 0 },
        spd: { lvl: 1, xp: 0 },
        flex: { lvl: 1, xp: 0 },
        end: { lvl: 1, xp: 0 }
      },
      workoutCount: 0,
      prestige: 0, // Veces que ha reforjado su camino desde el rango máximo — marca permanente, no se pierde al reforjar
      coins: 0,
      gems: 0, // Jade — moneda premium; por ahora solo se gana en hitos raros (ascensos de rango), sin compra real conectada todavía
      streak: 0,
      lastWorkoutDate: null,
      unlockedItems: [],
      activeAura: null,
      activeFrame: null, // Marco de avatar equipado (cosmético)
      equippedRelic: null,
      relicTiers: {}, // Nivel de mejora por reliquia poseída: { relic_oni: 1, ... } — solo existe la clave si ya se compró
      readingProgress: {},
      unlockedBadges: [],
      equippedBadges: [null, null, null],
      // 6.0 Extensions
      voiceEnabled: true,
      equipment: "none",
      injuries: [],
      lastWorkoutFeedback: '',
      savedVoiceURI: "",
      voicePitch: 1.0,
      voiceRate: 0.95
    };
  }

  let player = createDefaultPlayer();
  let workoutHistory = [];

  // ── Rangos (título, icono, lore) ──────────────────────────────────────
  const rankTitles = [
    { max: 4, title: "Letargo Mortal", icon: "🌑", color: "#8B7355",
      wisdom: "Todo gran viaje comienza con un cuerpo en reposo que decide despertar.",
      lore: "Estás en el umbral del despertar. Aún no has soltado tus cadenas, pero en tu interior duerme el código de la ascensión. El primer paso no es el más difícil — es reconocer el peso del letargo y decidir destruirlo. El dojo de sombras te espera." },
    { max: 9, title: "Iniciado del Camino", icon: "⛩️", color: "#4CAF50",
      wisdom: "El umbral se cruza una sola vez. No hay vuelta atrás.",
      lore: "Has roto la cáscara de la inercia. Eres un iniciado recién llegado a la forja. Tras cruzar la puerta oscura, tus semanas son de adaptación dolorosa. Cada fibra rasgada construye cimientos invisibles que sostendrán el templo viviente en el que te convertirás." },
    { max: 19, title: "Fuerza Latente", icon: "🩸", color: "#90A4AE",
      wisdom: "El equilibrio mecánico ya no es accidente. Es una elección consciente.",
      lore: "Has asimilado el sufrimiento entrenando en gravedad. Tu voluntad ahora dirige un cuerpo que resuena con la tensión estática. Estás descubriendo la diferencia brutal, cruda y profunda entre un esfuerzo desesperado y una potencia pura y calculada." },
    { max: 29, title: "Cazador de Sombras", icon: "🥷", color: "#FF8C00",
      wisdom: "La agresión descontrolada solo agota; la paciencia afila la cuchilla.",
      lore: "Has despertado una ferocidad letal y controlada. Las sombras no te asustan porque ya cazas en ellas. Cada repetición es perfecta, y el fracaso no se comete por falta de esfuerzo, sino al acercarte cada vez más a tus verdaderos límites insondables." },
    { max: 39, title: "Acero Vivo", icon: "⛓️", color: "#66BB6A",
      wisdom: "Un golpe perfecto, forjado en repetición, destruye mil movimientos ciegos.",
      lore: "Tus tendones resuenan con la densidad del metal irrompible. Has asimilado la economía absoluta: ningún músculo se acciona por error, ni siquiera una respiración se da por sentada. Tu cuerpo ya se desplaza como un instrumento implacable forjado en hierro y obsidiana." },
    { max: 49, title: "Guerrero Templado", icon: "⚔️", color: "#26A69A",
      wisdom: "Un verdadero filo no es el que nunca sufre, sino el que mantiene su borde en la masacre.",
      lore: "El sendero te ha puesto contra la pared innumerables veces. Has ganado el derecho a ser aclamado como un combatiente firme. Esta disciplina se arraigó hasta tu naturaleza, curtiéndote. Acostumbrado a los golpes, ya no te derrumbas; asimilas, analizas y aplastas." },
    { max: 59, title: "Sombra del Viento", icon: "🌪️", color: "#7E57C2",
      wisdom: "No colisiones inútilmente contra la fuerza invisible. Usa su furia.",
      lore: "Te desplazas con cinética letal, donde el comando físico ocurre en un instante microsegundos antes de la orden consciente. Eres una entidad biomecánica de reflejo letal; el mundo a tu alrededor entrena en una dimensión donde el ego desaparece por la rapidez letal." },
    { max: 69, title: "Voz del Vacío", icon: "🌌", color: "#78909C",
      wisdom: "La potencia definitiva grita menos pero rompe con gravedad cósmica.",
      lore: "Dejaste atrás las diletantes quejas. Entrenas inmerso en el éter abismal. La inmensa comprensión física se ha callado en tu interior porque ha depurado cualquier ego. Para cruzar este vacío se exige el desapego radical —entrenas no porque debas o temas, sino porque ahora eres eso." },
    { max: 79, title: "Alma de Titanio", icon: "🛡️", color: "#B0BEC5",
      wisdom: "La armadura del guerrero maduro es la inquebrantable mente que la habita.",
      lore: "La percepción de dolor se ha destilado en pura retroalimentación sensorial. Formaste armaduras nerviosas de pura resiliencia táctica. Sólido y absoluto ante las cargas, tu espíritu y materia se consolidan; el titanio es fuerte pero letal por la flexibilidad." },
    { max: 89, title: "Oráculo Marcial", icon: "👁️‍🗨️", color: "#5C6BC0",
      wisdom: "La lectura de las limitantes es la destreza final de la fuerza desatada.",
      lore: "Encuentras la iluminación prediciendo cómo fallará el cuerpo para anular dichos quiebres. La biomecánica no te oculta nada. Habitas y experimentas el poder predictivo para someter por instinto innegable cualquier obstáculo de progresión." },
    { max: 99, title: "Monarca del Abismo", icon: "👹", color: "#E53935",
      wisdom: "Aquel capaz de asomarse a las profundidades dominará la oscuridad del agotamiento.",
      lore: "Ya muy pocos habitan este escalafón místico de exigencia atroz en el borde humano. Eres considerado un monstruo disciplinario, que se eleva destruyendo complacencias del ego, un auténtico rey en la oscura planicie del condicionamiento solitario." },
    { max: 999, title: "Dragón Ascendido", icon: "🐉", color: "#FFD700",
      wisdom: "No existen cimas tras asimilar el absoluto. La entidad divina es el esfuerzo transmutado.",
      lore: "Frontera suprimida. Encarnas silenciosamente la brutal perfección abstracta. Alquimia lograda; la cúspide evolutiva ya no es medible porque trascendiste cada escalón por una brutal tenacidad constante. El dragón contempla sereno sin más contrincante que la inmensidad." }
  ];

  function getCurrentRank() {
    return rankTitles[player.rankIndex] || rankTitles[rankTitles.length - 1];
  }

  // Estado derivado puro: ¿las 4 stats ya alcanzaron el tope del rango
  // actual? Lo usan tanto la UI general (updateUI) como el motor de
  // rutinas (js/routine-engine.js) — vive aquí para no depender de cuál
  // de los dos se cargue primero.
  function checkExamPending() {
    const cap = getCurrentRank().max;
    return player.stats.str.lvl >= cap && player.stats.spd.lvl >= cap && player.stats.flex.lvl >= cap && player.stats.end.lvl >= cap;
  }

  // ── Wrapper nativo de IndexedDB (historial de entrenamientos) ─────────
  const zendb = {
    db: null,
    init: function () {
      return new Promise((resolve, reject) => {
        let req = indexedDB.open("ZenRyuDB", 1);
        req.onupgradeneeded = (e) => {
          let tdb = e.target.result;
          if (!tdb.objectStoreNames.contains("history")) {
            tdb.createObjectStore("history", { autoIncrement: true });
          }
        };
        req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
        req.onerror = (e) => reject(e);
      });
    },
    addHistory: function (entry, specificDate) {
      return new Promise((resolve, reject) => {
        if (!this.db) return resolve();
        let tx = this.db.transaction("history", "readwrite");
        let store = tx.objectStore("history");
        const record = (typeof entry === 'object' && entry.type)
          ? entry
          : { date: specificDate || new Date().toISOString(), type: entry || 'Entrenamiento' };
        store.add(record);
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e);
      });
    },
    getAllHistory: function () {
      return new Promise((resolve, reject) => {
        if (!this.db) return resolve([]);
        let tx = this.db.transaction("history", "readonly");
        let store = tx.objectStore("history");
        let req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
      });
    },
    clearHistory: function () {
      return new Promise((resolve, reject) => {
        if (!this.db) return resolve();
        let tx = this.db.transaction("history", "readwrite");
        let store = tx.objectStore("history");
        let req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = (e) => reject(e);
      });
    }
  };

  // ── Persistencia ────────────────────────────────────────────────────
  function savePlayer() {
    localStorage.setItem("zenWarriorPwaSave", JSON.stringify(player));
    // workoutHistory se persiste exclusivamente en IndexedDB (zendb), no en localStorage.
  }

  function normalizeDefensiveDefaults(p) {
    if (!p.stats) {
      p.stats = { str: { lvl: 1, xp: 0 }, spd: { lvl: 1, xp: 0 }, flex: { lvl: 1, xp: 0 }, end: { lvl: 1, xp: 0 } };
    } else {
      ['str', 'spd', 'flex', 'end'].forEach(s => {
        if (!p.stats[s]) p.stats[s] = { lvl: 1, xp: 0 };
        if (typeof p.stats[s].lvl === 'undefined' || p.stats[s].lvl === null) p.stats[s].lvl = 1;
        if (typeof p.stats[s].xp === 'undefined' || p.stats[s].xp === null) p.stats[s].xp = 0;
      });
    }
    if (typeof p.workoutCount === 'undefined') p.workoutCount = 0;
    if (typeof p.prestige === 'undefined') p.prestige = 0;
    if (typeof p.coins === 'undefined') p.coins = 0;
    if (typeof p.gems === 'undefined') p.gems = 0;
    if (typeof p.streak === 'undefined') p.streak = 0;
    if (typeof p.lastWorkoutDate === 'undefined') p.lastWorkoutDate = null;
    if (!p.unlockedItems) p.unlockedItems = [];
    if (!p.activeAura) p.activeAura = null;
    if (typeof p.activeFrame === 'undefined') p.activeFrame = null;
    if (!p.relicTiers || typeof p.relicTiers !== 'object') p.relicTiers = {};
    if (!p.unlockedBadges) p.unlockedBadges = [];
    if (!p.equippedBadges) p.equippedBadges = [null, null, null];
    if (typeof p.voiceEnabled === 'undefined') p.voiceEnabled = true;
    if (typeof p.equipment === 'undefined') p.equipment = "none";
    if (typeof p.injuries === 'undefined') p.injuries = [];
    if (typeof p.lastWorkoutFeedback === 'undefined') p.lastWorkoutFeedback = '';
    if (typeof p.savedVoiceURI === 'undefined') p.savedVoiceURI = "";
    if (typeof p.voicePitch === 'undefined') p.voicePitch = 1.0;
    if (typeof p.voiceRate === 'undefined') p.voiceRate = 0.95;
    return p;
  }

  // Carga PURA de datos: sin tocar el DOM. Devuelve el estado normalizado
  // para que la capa de UI decida qué pintar. Lanza migraciones de:
  //  - historial viejo en localStorage → IndexedDB
  //  - guardados con el modelo antiguo {level} → nuevo modelo {rankIndex, stats}
  async function loadPlayerData() {
    await zendb.init().catch(() => console.log("ZenState: IDB no disponible, se omite."));

    // Migración: historial legado en localStorage → IndexedDB
    let oldHx = localStorage.getItem("zenWarriorHistory");
    if (oldHx) {
      try {
        let parsedHx = JSON.parse(oldHx);
        for (let h of parsedHx) {
          await zendb.addHistory({ date: h.date, type: h.type || 'Entrenamiento' });
        }
        localStorage.removeItem("zenWarriorHistory");
      } catch (e) { /* guardado legado corrupto, se ignora */ }
    }

    try { workoutHistory = await zendb.getAllHistory(); } catch (e) { workoutHistory = []; }

    let saved = localStorage.getItem("zenWarriorPwaSave");
    if (!saved) {
      return { isNewPlayer: true, player, workoutHistory };
    }

    let savedPlayer = JSON.parse(saved);

    // Migración: modelo antiguo {level} → modelo nuevo {rankIndex, stats}
    if (savedPlayer.level !== undefined && savedPlayer.rankIndex === undefined) {
      player.name = savedPlayer.name;
      player.workoutCount = savedPlayer.workoutCount || 0;
      let rawLvl = savedPlayer.level;
      let rIdx = rankTitles.findIndex(r => rawLvl <= r.max);
      player.rankIndex = rIdx === -1 ? rankTitles.length - 1 : rIdx;
      player.stats = {
        str: { lvl: rawLvl, xp: 0 }, spd: { lvl: rawLvl, xp: 0 },
        flex: { lvl: rawLvl, xp: 0 }, end: { lvl: rawLvl, xp: 0 }
      };
    } else {
      Object.assign(player, savedPlayer);
    }

    normalizeDefensiveDefaults(player);

    return { isNewPlayer: false, player, workoutHistory };
  }

  function getPlayer() { return player; }
  function getWorkoutHistory() { return workoutHistory; }

  // ── Export / Import de respaldo ────────────────────────────────────
  async function buildExportPayload() {
    let dbHistory = [];
    try { dbHistory = await zendb.getAllHistory(); } catch (e) { }
    return { player: player, history: dbHistory, exportDate: new Date().toISOString() };
  }

  // Sanea un valor de historial importado: fuerza a string y acota la
  // longitud. La defensa real contra XSS es escapar al RENDERIZAR (ver
  // escapeHtml en app.js), pero limitar aquí evita además que un guardado
  // corrupto o malicioso infle IndexedDB con strings gigantes.
  function sanitizeHistoryField(val, fallback) {
    if (typeof val !== 'string' || val.length === 0) return fallback;
    return val.slice(0, 120);
  }

  // statVolume/funcVolume son mapas simples {clave: número} usados por el
  // motor de entrenamiento (ACWR, balance push/pull) — nunca se renderizan
  // como HTML, pero igual se valida la forma para no arrastrar basura.
  function sanitizeVolumeMap(obj) {
    if (!obj || typeof obj !== 'object') return {};
    const clean = {};
    Object.keys(obj).slice(0, 20).forEach(k => {
      if (typeof k === 'string' && k.length <= 30 && typeof obj[k] === 'number' && isFinite(obj[k])) {
        clean[k] = obj[k];
      }
    });
    return clean;
  }

  // Aplica un respaldo importado. Devuelve true/false según validez.
  // No hace `location.reload()` ni toca el DOM — eso queda en la capa de UI.
  async function applyImportedSave(data) {
    if (!data || !data.player || typeof data.player !== 'object') return false;
    localStorage.setItem("zenWarriorPwaSave", JSON.stringify(data.player));
    if (data.history && data.history.length > 0) {
      await zendb.init().catch(() => { });
      await zendb.clearHistory();
      for (let r of data.history) {
        if (!r || typeof r !== 'object') continue;
        const entry = {
          date: sanitizeHistoryField(r.date, ''),
          type: sanitizeHistoryField(r.type, 'Entrenamiento')
        };
        if (typeof r.timestamp === 'number' && isFinite(r.timestamp)) entry.timestamp = r.timestamp;
        if (r.statVolume) entry.statVolume = sanitizeVolumeMap(r.statVolume);
        if (r.funcVolume) entry.funcVolume = sanitizeVolumeMap(r.funcVolume);
        await zendb.addHistory(entry);
      }
    }
    return true;
  }

  window.ZenState = {
    // datos
    get player() { return player; },
    rankTitles,
    // funciones puras
    getCurrentRank,
    checkExamPending,
    savePlayer,
    loadPlayerData,
    getPlayer,
    getWorkoutHistory,
    buildExportPayload,
    applyImportedSave,
    zendb
  };
})();
